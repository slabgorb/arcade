// plugins/millipede/tests/highscore-wiring.test.ts
//
// Story ml10-2 — RED phase (Leeloo / TEA). WIRE the high-score persistence seam
// end-to-end through millipede's shell, INCLUDING the name-entry runtime it depends
// on. This is the millipede analogue of missile-command's mc7-2 (pure name-entry
// core) + mc7-3 (wire it end-to-end) — and core/highscore.ts explicitly says it is
// "the standalone shape of plugins/missile-command/src/core/highscore.ts", so this
// suite adopts that proven contract rather than inventing one.
//
// ─── WHAT ALREADY EXISTS (do NOT rebuild) ─────────────────────────────────────────
//  • src/shell/highscore.ts — makeMilliHighScoreStorage() + loadHighScores() over the
//    one-origin key highScoreKey('millipede'). Fully built + tested by
//    tests/high-score-persistence.test.ts (ml5-4). UNWIRED: imported by nothing in src/.
//  • src/core/highscore.ts — DEFAULT_HIGH_SCORES (8 rungs), qualifiesForHighScore,
//    insertHighScore, stepInitials, MILLI_INITIALS_LENGTH. Pure, tested (ml5-3).
//  • src/core/phase.ts — the 'entry' phase + advancePhase's game-over→entry route on
//    `scoreQualifies` (tested in phase.test.ts). src/core/sim.ts already FREEZES the
//    'entry' phase (`case 'entry': return {...state, frame+1, events:[]}`).
//
// ─── WHAT DEV (Korben) MUST BUILD — the remaining wiring ──────────────────────────
//  1. GameState carries the live ladder + the in-flight initials buffer:
//        highScores: readonly MilliHighScore[]   (createGame seeds DEFAULT_HIGH_SCORES)
//        initials:   string                       (createGame seeds '')
//     (the mc GameState.highScores/initials shape, game.ts:112-113/158.)
//  2. src/core/sim.ts routes a QUALIFYING game-over into 'entry' — stepGameOver must
//     feed `scoreQualifies: qualifiesForHighScore(state.highScores, state.score)` into
//     advancePhase (today it passes only `overExpired`, so 'entry' is unreachable —
//     sim.ts:433 "the qualifying-score route … is deferred"). A non-qualifying
//     game-over still lands back in attract.
//  3. src/core/sim.ts must PRESERVE the live ladder across the world rebuilds — the
//     attract→play rebuild (stepAttract's `createGame(seed,{phase:'play'})`) and the
//     game-over→attract rebuild (stepGameOver's `createGame(seed)`) both throw the
//     ladder away today, resetting a loaded/persisted board back to DEFAULT mid-session
//     (the mc `{...createPlayGame(seed), highScores: state.highScores}` fix, game.ts:211).
//  4. src/shell/input.ts exports `nameEntryFromKey(key, state)` — during 'entry' a
//     letter/Backspace feeds core stepInitials into GameState.initials, and Enter with a
//     FULL buffer commits (insertHighScore into highScores, buffer cleared, phase→attract);
//     every other phase returns the SAME state (the mc7-3 shell reducer, input.ts).
//  5. src/main.ts threads it all: `game = {...createGame(seed), highScores:
//     loadHighScores(makeMilliHighScoreStorage())}` on boot; the keydown handler runs
//     nameEntryFromKey; and it saves the moment a commit changes the ladder reference
//     (`if (game.highScores !== prev) storage.save(game.highScores)`, the asteroids/mc
//     new-array-reference signal); render reads the LOADED board, not DEFAULT_HIGH_SCORES.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────
// Groups A/B assert against the REAL, existing createGame + stepGame (no field, no
// route, no preservation yet) and redden at RUNTIME. Group C's `nameEntryFromKey` does
// not exist; it is reached through a VARIABLE-specifier dynamic import so `tsc --noEmit`
// (the lint gate) stays GREEN and the RED lands at runtime naming what Dev must add (the
// mc7-3 / RED-seam idiom). The new GameState fields are read through a local `EntryState`
// cast for the same reason — GameState has no highScores/initials member yet, so a bare
// `.highScores` would be a tsc error, not a clean runtime RED. Group D boots the REAL
// shell (boot-shell) over a SEEDED fake localStorage and proves main threaded the loaded
// board into the boot state. Group E is the comment-stripped source wiring FLOOR (a grep
// a comment can't satisfy); the RENDER of the loaded board is verified for real by the
// mandatory /millipede/ visual playtest (playbook §4, hud-render.test.ts:30-31), not by
// pixel-matching here.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import {
  DEFAULT_HIGH_SCORES,
  MILLI_INITIALS_LENGTH,
  type MilliHighScore,
} from '../src/core/highscore.js'
import { isHighScoreRow, highScoreKey } from '@shared/highscore'

const GAME_ID = 'millipede'

// ─── The GameState shape AFTER Dev adds the two name-entry fields (mc precedent). ──
// Read through this cast so tsc stays green while GameState itself has neither member;
// the assertions still redden at RUNTIME (the fields are absent / the value is wrong).
interface EntryState extends GameState {
  highScores: readonly MilliHighScore[]
  initials: string
}
const asEntry = (s: GameState): EntryState => s as EntryState

// The pure shell reducer Dev builds — reached through a variable specifier so tsc never
// resolves the not-yet-added export (lint gate green); the RED lands at runtime.
const INPUT_SHELL_SPEC = '../src/shell/input.js'
type NameEntryFromKey = (key: string, state: GameState) => GameState
let nameEntryFromKey: NameEntryFromKey

async function loadExport<T>(spec: string, name: string): Promise<T> {
  let mod: Record<string, unknown>
  try {
    mod = (await import(/* @vite-ignore */ spec)) as Record<string, unknown>
  } catch (err) {
    throw new Error(`ml10-2 RED — cannot import ${spec} (Dev must wire it): ${String(err)}`)
  }
  const exported = mod[name]
  if (exported === undefined) {
    throw new Error(`ml10-2 RED — ${spec} does not export ${name}() yet; Dev must add it.`)
  }
  return exported as T
}

const IDLE: GameInput = { dh: 0, dv: 0, fire: false, start: false }

// A qualifying score beats the seeded DEFAULT ladder's LOWEST rung (DFW 41,916), so it
// earns a place on the full eight-deep board; a non-qualifying score cannot.
const QUALIFY = 100_000
const NO_QUALIFY = 100

// A distinct in-memory board (NOT the DEFAULT ladder) to prove the loaded/live ladder
// is carried through the runtime instead of being reset to the seeded default.
const LIVE_BOARD: readonly MilliHighScore[] = [
  { name: 'ZAP', score: 246_800 },
  { name: 'KEV', score: 42_000 },
]

// A FULL eight-rung board distinct from DEFAULT (same scores, different names): the only
// shape against which a small score does NOT qualify (a partial board has open rungs, so
// any positive score qualifies). Used to exercise the NON-qualifying game-over→attract path.
const LIVE_FULL_BOARD: readonly MilliHighScore[] = DEFAULT_HIGH_SCORES.map((e) => ({
  name: 'ZZ',
  score: e.score,
}))

/** A GameState frozen in `game-over`, carrying the fields Dev will add. `delay` decides
 *  whether the attract-return timeout has expired this frame. */
function gameOverState(score: number, delay: number): GameState {
  return {
    ...createGame(0x1982, { phase: 'game-over' }),
    score,
    delay,
    highScores: DEFAULT_HIGH_SCORES,
    initials: '',
  } as EntryState
}

// ─── Group A: createGame starts with an EMPTY ladder + an empty initials buffer ───
describe('ml10-2 A — createGame carries an EMPTY ladder and an empty initials buffer', () => {
  it('starts highScores EMPTY (pt1-8: no built-in seed — real scores only)', () => {
    const g = asEntry(createGame(0x1982))
    expect(g.highScores, 'a fresh game must carry no built-in scores').toEqual([])
  })

  it('seeds an empty initials buffer', () => {
    expect(asEntry(createGame(0x1982)).initials).toBe('')
  })
})

// ─── Group B: sim routes / preserves the ladder (the runtime gap) ─────────────────
describe('ml10-2 B — a qualifying game-over reaches name entry; the ladder survives every rebuild', () => {
  it('routes a QUALIFYING game-over into the entry phase with an empty buffer', () => {
    // Today stepGameOver passes only { overExpired } — 'entry' is unreachable.
    const after = asEntry(stepGame(gameOverState(QUALIFY, 5), IDLE))
    expect(after.phase, 'a qualifying game-over must reach entry, not stay in game-over/attract').toBe(
      'entry',
    )
    expect(after.initials, 'entry starts with an empty buffer').toBe('')
    expect(after.score, 'the qualifying score is carried into entry for the commit').toBe(QUALIFY)
    expect(after.highScores, 'the ladder is untouched until the commit').toEqual(DEFAULT_HIGH_SCORES)
  })

  it('a NON-qualifying game-over never enters name entry', () => {
    // delay still ticking (5): the only non-entry outcome that keeps it observable here.
    expect(stepGame(gameOverState(NO_QUALIFY, 5), IDLE).phase).not.toBe('entry')
  })

  it('FREEZES the entry phase — only the clock advances (buffer/ladder/score held)', () => {
    const entry = {
      ...createGame(0x1982, { phase: 'entry' }),
      score: 99_999,
      highScores: LIVE_BOARD,
      initials: 'AB',
    } as EntryState
    const after = asEntry(stepGame(entry, IDLE))
    expect(after.phase, 'entry must freeze — no play/game-over under the entry screen').toBe('entry')
    expect(after.initials, 'the initials buffer survives the frame').toBe('AB')
    expect(after.highScores, 'the ladder survives the frame').toEqual(LIVE_BOARD)
    expect(after.score, 'no scoring while frozen').toBe(99_999)
    expect(after.frame, 'only the clock advances').toBe(entry.frame + 1)
  })

  it('carries the live ladder into a NEW game (attract→play rebuild does not reset it)', () => {
    const attract = { ...createGame(0x1982, { phase: 'attract' }), highScores: LIVE_BOARD, initials: '' } as EntryState
    const after = asEntry(stepGame(attract, { ...IDLE, start: true }))
    expect(after.phase, 'start drops attract into play').toBe('play')
    expect(after.highScores, 'the loaded board must survive the fresh-world rebuild, not reset to DEFAULT').toEqual(
      LIVE_BOARD,
    )
  })

  it('carries the live ladder back into attract (game-over→attract rebuild does not reset it)', () => {
    // A FULL distinct board + a small score that can't beat its lowest rung: the only
    // way to reach the attract-timeout path (a partial board would qualify any score).
    const over = { ...gameOverState(NO_QUALIFY, 0), highScores: LIVE_FULL_BOARD } as EntryState
    const after = asEntry(stepGame(over, IDLE))
    expect(after.phase, 'the timeout returns a non-qualifying game-over to attract').toBe('attract')
    expect(after.highScores, 'the live board must survive the attract rebuild, not reset to DEFAULT').toEqual(
      LIVE_FULL_BOARD,
    )
    expect(after.highScores, 'proves it is the LIVE board carried through, not the seeded default').not.toEqual(
      DEFAULT_HIGH_SCORES,
    )
  })
})

// ─── Group C: the shell name-entry reducer (RED until Dev adds it) ────────────────
describe('ml10-2 C — nameEntryFromKey drives the buffer and commits on Enter', () => {
  beforeAll(async () => {
    nameEntryFromKey = await loadExport<NameEntryFromKey>(INPUT_SHELL_SPEC, 'nameEntryFromKey')
  })

  const entry = (initials = '', score = QUALIFY, highScores: readonly MilliHighScore[] = DEFAULT_HIGH_SCORES): GameState =>
    ({ ...createGame(0x1982, { phase: 'entry' }), initials, score, highScores }) as EntryState

  it('appends an UPPERCASED letter to the buffer', () => {
    expect(asEntry(nameEntryFromKey('a', entry(''))).initials).toBe('A')
    expect(asEntry(nameEntryFromKey('k', entry('AB'))).initials).toBe('ABK')
  })

  it('caps the buffer at MILLI_INITIALS_LENGTH (a fourth letter is inert)', () => {
    expect(MILLI_INITIALS_LENGTH).toBe(3)
    expect(asEntry(nameEntryFromKey('d', entry('ABC'))).initials).toBe('ABC')
  })

  it('deletes the last character on Backspace (never past empty)', () => {
    expect(asEntry(nameEntryFromKey('Backspace', entry('AB'))).initials).toBe('A')
    expect(asEntry(nameEntryFromKey('Backspace', entry(''))).initials).toBe('')
  })

  it('commits on Enter with a FULL buffer: inserts the row, clears the buffer, returns to attract', () => {
    const after = asEntry(nameEntryFromKey('Enter', entry('ZZZ', QUALIFY)))
    expect(after.phase, 'a committed entry returns to attract').toBe('attract')
    expect(after.initials, 'the buffer clears on commit').toBe('')
    expect(after.highScores[0], 'the committed row tops the ladder').toEqual({ name: 'ZZZ', score: QUALIFY })
  })

  it('Enter with an INCOMPLETE buffer is inert (no partial commit)', () => {
    const before = entry('AB', QUALIFY)
    const after = asEntry(nameEntryFromKey('Enter', before))
    expect(after.phase).toBe('entry')
    expect(after.initials).toBe('AB')
    expect(after.highScores).toEqual(DEFAULT_HIGH_SCORES)
  })

  it('is a no-op outside the entry phase (returns the SAME state)', () => {
    const playing = createGame(0x1982, { phase: 'play' })
    expect(nameEntryFromKey('a', playing)).toBe(playing)
  })

  // ─── Reviewer [EDGE] HIGH (rework r1): commit → FRESH attract, not a stale world ──
  it('commits to a FRESH attract demo — the ended game score does not leak into the attract screen', () => {
    // MEASURED bug: one attract frame after a commit, score was still 100000 (the ended
    // game's), because nameEntryFromKey returned {...state, phase:'attract'} without a
    // world rebuild, while the non-qualifying game-over→attract path rebuilds via
    // createGame. AC3 ("no regression to the self-playing attract demo") — the commit and
    // the timeout exits must converge on a fresh demo. Fix-agnostic: only the observable
    // (fresh score/lives + the committed row on the ladder) is pinned.
    const committed = nameEntryFromKey('Enter', entry('ZZZ', QUALIFY))
    const after = asEntry(stepGame(committed as GameState, IDLE))
    expect(after.phase, 'a commit returns to attract').toBe('attract')
    expect(after.score, 'the attract demo must be a FRESH world (score 0), not the ended game (was 100000)').toBe(0)
    expect(after.lives, 'fresh lives').toBe(3)
    expect(after.highScores[0], 'the committed row is on the ladder after the rebuild').toEqual({
      name: 'ZZZ',
      score: QUALIFY,
    })
  })
})

// ─── Group D: main.ts threads the loaded board into the boot state (behavioural) ──
describe('ml10-2 D — booting the real shell loads the persisted ladder into the game', () => {
  let shell: ShellHarness
  const KEY = highScoreKey(GAME_ID)

  // A minimal fake Storage on globalThis, SEEDED with LIVE_BOARD, installed BEFORE the
  // boot import so main's module-scope load reads it (the ml5-4 fake-Storage harness).
  function makeFakeStorage(initial: Record<string, string>): Storage {
    const map = new Map<string, string>(Object.entries(initial))
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      removeItem: (k: string) => void map.delete(k),
      setItem: (k: string, v: string) => void map.set(k, v),
    } as Storage
  }

  beforeAll(async () => {
    ;(globalThis as Record<string, unknown>).localStorage = makeFakeStorage({
      [KEY]: JSON.stringify(LIVE_BOARD),
    })
    shell = await bootMillipedeShell()
    // Advance enough real-time frames that the fixed-step accumulator runs a step and
    // writes window.__sim. No start gesture is emitted, so the game stays in attract and
    // the loaded ladder is preserved (never reset by an attract→play rebuild).
    for (let i = 0; i < 20; i++) shell.frame(i * 4)
  })

  afterAll(() => {
    delete (globalThis as Record<string, unknown>).localStorage
  })

  it('the booted game exposes the PERSISTED ladder, not the seeded DEFAULT', () => {
    const live = asEntry(shell.sim()).highScores
    expect(live, 'main must boot with loadHighScores(makeMilliHighScoreStorage()) threaded in').toEqual(
      LIVE_BOARD,
    )
    // A sharper failure if Dev seeds DEFAULT and forgets the load entirely.
    expect(live, 'the boot ladder must come from storage, not DEFAULT_HIGH_SCORES').not.toEqual(
      DEFAULT_HIGH_SCORES,
    )
  })

  it('the persisted rows the shell loaded are lobby-readable under the one-origin key', () => {
    // Proves the seeded store is the SAME key/shape the lobby tile reads (one origin).
    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(KEY)
    expect(raw).not.toBeNull()
    const rows = JSON.parse(raw as string) as unknown[]
    for (const row of rows) expect(isHighScoreRow(row)).toBe(true)
    expect(rows.filter(isHighScoreRow).map((r) => r.score)).toContain(246_800)
  })
})

// ─── Group E: the main.ts wiring FLOOR (comment-stripped source) ──────────────────
describe('ml10-2 E — main.ts wires load-on-boot, save-on-commit and the entry reducer', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))

  it('boots the ladder from storage (loadHighScores over makeMilliHighScoreStorage)', () => {
    expect(src).toMatch(/makeMilliHighScoreStorage\s*\(/)
    expect(src).toMatch(/loadHighScores\s*\(/)
  })

  it('drives the entry reducer from the keydown handler', () => {
    expect(src).toMatch(/nameEntryFromKey\s*\(/)
  })

  it('persists on the commit — a save gated on the new-array ladder reference', () => {
    // The asteroids/mc signal: a commit returns a NEW highScores array, so a changed
    // reference is the save trigger. Identifier + call-paren so an import line alone
    // cannot satisfy it.
    expect(src).toMatch(/highScores\s*!==/)
    // Anchored to the storage handle, not a bare `.save(` — a `ctx.save()` canvas call
    // (common in this 2D renderer) must NOT satisfy the persistence guard (ml10-2 rework).
    expect(src).toMatch(/highScoreStorage\.save\s*\(/)
  })
})
