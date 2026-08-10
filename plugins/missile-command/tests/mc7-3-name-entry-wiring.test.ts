// plugins/missile-command/tests/mc7-3-name-entry-wiring.test.ts
//
// Story mc7-3 — RED phase (Han Solo / TEA). WIRE mc7-2's pure name-entry core
// end-to-end with KEYBOARD input + one-origin localStorage persistence. mc7-2
// landed `'entry'`, `enterNameEntry`/`stepInitials`/`commitNameEntry`/
// `abortNameEntry`, `GameState.highScores`/`initials` and `MC_INITIALS_LEN` as
// PURE CORE — deliberately UNWIRED. This story makes the screen reachable and the
// ladder durable. Four groups, one per AC:
//
//   AC-A  stepGame FREEZES 'entry'   (the mc7-2 reviewer landmine — #1 must-fix)
//   AC-B  a qualifying game-over REACHES 'entry' (else straight to 'over')
//   AC-C  shell KEYBOARD input       (KeyboardEvent.key -> stepInitials; Enter -> commit)
//   AC-D  one-origin localStorage    (read on boot, write on commit)
//
// ─── AC-A: THE FREEZE LANDMINE (reviewer-confirmed forward finding, mc7-2) ────────
// `stepGame` (core/game.ts) has freeze branches for 'over'/'pause'/'setup'/
// 'between'/'attract' but NONE for 'entry'. It is unreachable TODAY (nothing calls
// enterNameEntry in the loop), so the gap is dormant. The MOMENT AC-B wires
// enterNameEntry in, a `stepGame` call during 'entry' falls through to `stepCombat`
// (runs the battle) and `nextPhase('entry', cities)` flips the phase to 'play' (or
// 'over' once cities are dead) — silently dropping the entry screen and the initials
// buffer. Dev MUST add, matching the 'over'/'pause' branches:
//     if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }
//
// ─── AC-B: REACH ENTRY FROM A QUALIFYING GAME-OVER ───────────────────────────────
// Today the play->over transition (core/game.ts stepGame's PLAY branch -> stepCombat
// -> nextPhase) lands in 'over' and stops. Dev wires enterNameEntry into that seam so
// a QUALIFYING final score routes to 'entry' (empty buffer) instead, and a
// non-qualifying one still lands in 'over'. `qualifiesForHighScore` is the decider.
//
// ─── AC-C: SHELL KEYBOARD INPUT (fleet-consistent — NOT the ROM trackball) ────────
// The user chose keyboard entry like the rest of the cabinet (joust jt10-7,
// asteroids, …). Dev adds a PURE shell reducer `nameEntryFromKey(key, state)` to
// src/shell/input.ts: during 'entry' a letter/Backspace feeds core `stepInitials`
// (which delegates to @shared/name-entry.stepNameEntry), and ENTER commits via
// core `commitNameEntry`; every other phase is returned unchanged. The ROM's
// trackball cursor + 30-sec/UCVTAB timeout + start-switch abort are DELIBERATELY
// out of scope (recorded as an intentional deviation). Because Z/X/C are both fire
// keys AND valid initials, `fireOrStart` MUST no-op during 'entry' — else typing an
// initial launches an ABM and sounds a klaxon under the entry screen.
//
// ─── AC-D: ONE-ORIGIN localStorage (read on boot, write on commit) ───────────────
// The whole cabinet shares one origin, so the ladder lives at
// highScoreKey('missile-command') === 'missile-command-high-scores' — the SAME key
// the lobby tile reads. Dev adds src/shell/highscore.ts (the battlezone base-shape
// precedent: makeHighScoreStorage(id, isHighScoreRow, '') — MC rows are { name,
// score }, no domain field): `makeMcHighScoreStorage()` and `loadHighScores(storage)`
// (persisted board if any, else the seeded ROM DEFAULT_HIGH_SCORES so a first boot
// still shows the W3DSUP ladder). main.ts threads loadHighScores into the boot state
// and saves on the commit's new-array reference (the asteroids pattern).
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────
// AC-A/AC-B redden at RUNTIME against the REAL, existing `stepGame` (it neither
// freezes nor routes 'entry' yet). AC-C's `nameEntryFromKey` and AC-D's
// src/shell/highscore.ts do not exist; they are reached through a variable-specifier
// dynamic loader so `tsc --noEmit` (the lint gate) stays GREEN and the RED lands at
// runtime with a message naming exactly what Dev must build (the mc7-2 / RED-seam
// idiom). AC-C's fire-guard reddens against the real `fireOrStart` (it fires today).
// AC-E (core purity + citation sweeps stay green) is owned by the existing
// tests/purity.test.ts + tests/citations*.test.ts: this story adds NO new core
// numeric constant (the freeze is `frame + 1` + `[]`, the wiring reuses cited fns),
// and all localStorage/keyboard code lives in src/shell, off the core sweep.

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import {
  createGame,
  createPlayGame,
  stepGame,
  commitNameEntry,
  MC_INITIALS_LEN,
  type GameState,
} from '../src/core/game.js'
import { launchIcbm } from '../src/core/icbm.js'
import { fireOrStart } from '../src/shell/input.js'
import {
  DEFAULT_HIGH_SCORES,
  type MissileCommandHighScore,
} from '../src/core/highscore.js'
import {
  makeHighScoreStorage,
  isHighScoreRow,
  highScoreKey,
  type HighScoreStorage,
} from '@shared/highscore'

const GAME_ID = 'missile-command'

// ─── the pure shell surface Dev (Yoda) implements ────────────────────────────────
// Reached through variable specifiers so tsc never resolves a not-yet-created module
// / not-yet-added export (keeping the lint gate green); the RED lands at runtime.
const INPUT_SHELL_SPEC = '../src/shell/input.js'
const HS_SHELL_SPEC = '../src/shell/highscore.js'

type NameEntryFromKey = (key: string, state: GameState) => GameState
type LoadHighScores = (
  storage: HighScoreStorage<MissileCommandHighScore>,
) => readonly MissileCommandHighScore[]
type MakeMcHighScoreStorage = () => HighScoreStorage<MissileCommandHighScore>

async function loadExport<T>(spec: string, name: string): Promise<T> {
  let mod: Record<string, unknown>
  try {
    mod = (await import(/* @vite-ignore */ spec)) as Record<string, unknown>
  } catch (err) {
    throw new Error(`mc7-3 RED — cannot import ${spec} (Dev must create it): ${String(err)}`)
  }
  const exported = mod[name]
  if (exported === undefined) {
    throw new Error(`mc7-3 RED — ${spec} does not export ${name}() yet; Dev must add it.`)
  }
  return exported as T
}

// Loaded per-group (AC-C, AC-D) so the not-yet-built shell surface reddens ONLY its
// own group — AC-A/AC-B assert against the real `stepGame` and must show their own RED,
// not be masked by a shared import failure.
let nameEntryFromKey: NameEntryFromKey
let loadHighScores: LoadHighScores
let makeMcHighScoreStorage: MakeMcHighScoreStorage

// ─── Fake Storage — the node test env has no localStorage (battlezone's harness) ──
function makeFakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get length(): number {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  } as Storage
}

function installStorage(storage: Storage | undefined): void {
  if (storage === undefined) {
    delete (globalThis as Record<string, unknown>).localStorage
  } else {
    ;(globalThis as Record<string, unknown>).localStorage = storage
  }
}

beforeEach(() => installStorage(makeFakeStorage()))
afterEach(() => installStorage(undefined))

// A faithful proxy for the lobby's read (lobby getTopScore filters through the SAME
// shared isHighScoreRow and takes the max) — proves MC's write is lobby-readable.
function lobbyTopScore(gameId: string): number | null {
  const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(gameId))
  if (raw === null) return null
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) return null
  const scores = parsed.filter(isHighScoreRow).map((row) => row.score)
  return scores.length === 0 ? null : Math.max(...scores)
}

// A 'play' state whose cities are ALL dead — the frame that ends the game. Bases
// stay alive, the board is quiet (nothing spawns), so stepGame's PLAY branch resolves
// straight to the game-over transition with `score`.
function gameOverFrame(score: number): GameState {
  const g = createPlayGame(1)
  return {
    ...g,
    phase: 'play',
    cities: g.cities.map((c) => ({ ...c, alive: false })),
    icbms: [],
    abms: [],
    sputniks: [],
    explosions: [],
    remaining: 0,
    score,
  }
}

// A qualifying score beats the seeded DEFAULT ladder's best (DFT 7500); a
// non-qualifying score cannot make the full five-deep ladder (lowest rung 6950).
const QUALIFY = 100_000
const NO_QUALIFY = 100

// ─── AC-A: stepGame FREEZES the 'entry' phase ────────────────────────────────────
describe('mc7-3 AC-A — stepGame freezes the entry phase (no combat under the entry screen)', () => {
  it('holds phase, buffer and every warhead byte-identical, advancing only the clock', () => {
    // A descending warhead: if the battle runs, stepAnyIcbm moves it — the freeze
    // must keep it exactly where it was.
    const icbm = launchIcbm({ h: 120, v: 210 }, { h: 120, v: 10 }, 3)
    const entry: GameState = { ...createGame(), phase: 'entry', initials: 'AB', score: 99_999, icbms: [icbm] }

    const after = stepGame(entry)

    expect(after.phase, "stepGame must FREEZE 'entry' (add the missing freeze branch)").toBe('entry')
    expect(after.icbms, 'frozen — no warhead may fly during entry').toEqual([icbm])
    expect(after.frame, 'only the clock advances').toBe(entry.frame + 1)
    expect(after.soundEvents, 'the sound channel is quiet while frozen').toEqual([])
    expect(after.initials, 'the initials buffer survives the frame').toBe('AB')
    expect(after.score, 'no scoring while frozen').toBe(99_999)
  })

  it('never advances entry to over/play (nextPhase must not run during entry)', () => {
    const entry: GameState = { ...createGame(), phase: 'entry', initials: '' }
    expect(stepGame(entry).phase).toBe('entry')
  })
})

// ─── AC-B: a qualifying game-over REACHES 'entry' ────────────────────────────────
describe('mc7-3 AC-B — a qualifying game-over routes to entry, a non-qualifying one to over', () => {
  it('routes a qualifying final score into entry with an empty buffer', () => {
    const after = stepGame(gameOverFrame(QUALIFY))
    expect(after.phase, 'a qualifying game-over must reach entry, not stop at over').toBe('entry')
    expect(after.initials, 'entry starts with an empty buffer').toBe('')
    expect(after.score, 'the qualifying score is carried into entry for the commit').toBe(QUALIFY)
    expect(after.highScores, 'the ladder is untouched until commit').toEqual(DEFAULT_HIGH_SCORES)
  })

  it('leaves a non-qualifying game-over in over (never enters name entry)', () => {
    const after = stepGame(gameOverFrame(NO_QUALIFY))
    expect(after.phase, 'a non-qualifying game-over stays over').toBe('over')
    expect(after.initials).toBe('')
  })
})

// ─── AC-C: shell KEYBOARD input (nameEntryFromKey) ───────────────────────────────
describe('mc7-3 AC-C — nameEntryFromKey drives the buffer and commits on Enter', () => {
  beforeAll(async () => {
    nameEntryFromKey = await loadExport<NameEntryFromKey>(INPUT_SHELL_SPEC, 'nameEntryFromKey')
  })

  const entry = (initials = '', score = QUALIFY): GameState => ({
    ...createGame(),
    phase: 'entry',
    initials,
    score,
    highScores: DEFAULT_HIGH_SCORES,
  })

  it('appends an uppercased letter to the buffer', () => {
    expect(nameEntryFromKey('a', entry('')).initials).toBe('A')
    expect(nameEntryFromKey('k', entry('AB')).initials).toBe('ABK')
  })

  it('caps the buffer at MC_INITIALS_LEN (a fourth letter is inert)', () => {
    expect(MC_INITIALS_LEN).toBe(3)
    expect(nameEntryFromKey('d', entry('ABC')).initials).toBe('ABC')
  })

  it('deletes the last character on Backspace (never past empty)', () => {
    expect(nameEntryFromKey('Backspace', entry('AB')).initials).toBe('A')
    expect(nameEntryFromKey('Backspace', entry('')).initials).toBe('')
  })

  it('commits on Enter with a full buffer: inserts the row and returns to attract', () => {
    const after = nameEntryFromKey('Enter', entry('ZZZ', QUALIFY))
    expect(after.phase, 'a committed entry returns to attract').toBe('attract')
    expect(after.initials, 'the buffer clears on commit').toBe('')
    expect(after.highScores[0]).toEqual({ name: 'ZZZ', score: QUALIFY })
  })

  it('Enter with an incomplete buffer is inert (no partial commit)', () => {
    const before = entry('AB', QUALIFY)
    const after = nameEntryFromKey('Enter', before)
    expect(after.phase).toBe('entry')
    expect(after.initials).toBe('AB')
    expect(after.highScores).toEqual(DEFAULT_HIGH_SCORES)
  })

  it('is a no-op outside the entry phase', () => {
    const playing = { ...createPlayGame(1), phase: 'play' as const }
    expect(nameEntryFromKey('a', playing)).toBe(playing)
  })

  it('a fire key (Z/X/C) must not launch an ABM while entering initials', () => {
    // Z/X/C are fire keys AND valid initials; during entry the fire path must be
    // inert or typing an initial fires a missile + sounds a klaxon under the screen.
    const before: GameState = { ...createGame(), phase: 'entry', initials: '' }
    const after = fireOrStart('z', before)
    expect(after.abms, 'no ABM may launch during entry').toEqual(before.abms)
    expect(after.bases, 'no round may be spent during entry').toEqual(before.bases)
    expect(after.soundEvents, 'no launch/klaxon cue during entry').toEqual(before.soundEvents)
    expect(after.phase).toBe('entry')
  })
})

// ─── AC-C (composed) — the REAL keydown seam main.ts drives ───────────────────────
// Reviewer regression (mc7-3): the AC-C tests above exercise `nameEntryFromKey` in
// ISOLATION, but main.ts composes `pauseFromKey → nameEntryFromKey → fireOrStart` on
// EVERY keystroke. A full-buffer Enter commits (`'entry'`→`'attract'`); an UNGUARDED
// `fireOrStart` then reads that `'attract'` and runs `beginSetupOnInput` → `'setup'`,
// dumping the player who just signed the board into an unrequested fresh game. The
// per-reducer `phase === 'entry'` guard can't catch this — the phase already left
// `'entry'` by the time `fireOrStart` runs. `keydownReducer` is the pure composition
// main.ts drives; it MUST gate `fireOrStart` on the PRE-keystroke phase.
describe('mc7-3 AC-C (composed) — the keydown seam commits an entry to attract, never setup', () => {
  let keydownReducer: NameEntryFromKey
  beforeAll(async () => {
    keydownReducer = await loadExport<NameEntryFromKey>(INPUT_SHELL_SPEC, 'keydownReducer')
  })

  const fullEntry = (): GameState => ({
    ...createGame(),
    phase: 'entry',
    initials: 'ZZZ',
    score: QUALIFY,
    highScores: DEFAULT_HIGH_SCORES,
  })

  it('a full-buffer Enter lands on attract (never setup / an unrequested new game)', () => {
    const after = keydownReducer('Enter', fullEntry())
    expect(after.phase, "the committing Enter must land on 'attract', not 'setup'").toBe('attract')
    expect(after.initials, 'the buffer clears on commit').toBe('')
    expect(after.highScores[0]).toEqual({ name: 'ZZZ', score: QUALIFY })
  })

  it('typing a fire-key initial (z) during entry never launches an ABM (composed path)', () => {
    const before: GameState = { ...createGame(), phase: 'entry', initials: '' }
    const after = keydownReducer('z', before)
    expect(after.phase, 'stays in entry').toBe('entry')
    expect(after.initials, 'the fire key types its initial').toBe('Z')
    expect(after.abms, 'no ABM launches under the entry screen').toEqual(before.abms)
    expect(after.bases, 'no round is spent').toEqual(before.bases)
    expect(after.soundEvents, 'no launch/klaxon cue').toEqual(before.soundEvents)
  })

  it('still leaves the attract demo for setup on a keystroke (composition preserved)', () => {
    const attract: GameState = { ...createGame(), phase: 'attract' }
    expect(keydownReducer('z', attract).phase, 'a keystroke in attract still begins setup').toBe(
      'setup',
    )
  })
})

// ─── AC-D: one-origin localStorage persistence ───────────────────────────────────
describe('mc7-3 AC-D — the ladder persists under the one-origin cabinet key', () => {
  beforeAll(async () => {
    loadHighScores = await loadExport<LoadHighScores>(HS_SHELL_SPEC, 'loadHighScores')
    makeMcHighScoreStorage = await loadExport<MakeMcHighScoreStorage>(
      HS_SHELL_SPEC,
      'makeMcHighScoreStorage',
    )
  })

  const board: readonly MissileCommandHighScore[] = [
    { name: 'AAA', score: 90_000 },
    { name: 'BOB', score: 30_000 },
  ]

  it('writes under the exact key the lobby reads', () => {
    expect(highScoreKey(GAME_ID)).toBe('missile-command-high-scores')
  })

  it("MC's { name, score } rows round-trip through the shared base-shape storage", () => {
    const seam = makeHighScoreStorage<MissileCommandHighScore>(GAME_ID, isHighScoreRow, '')
    seam.save(board)
    expect(seam.load(), 'the persisted rows must survive their own validator').toEqual(board)

    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(GAME_ID))
    expect(raw, 'nothing landed under the cabinet key').not.toBeNull()
    for (const row of JSON.parse(raw as string) as unknown[]) {
      expect(isHighScoreRow(row)).toBe(true)
    }
  })

  it('makeMcHighScoreStorage() persists under the cabinet key', () => {
    makeMcHighScoreStorage().save(board)
    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(GAME_ID))
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(board)
  })

  it('loadHighScores falls back to the seeded ROM ladder when storage is empty', () => {
    // First boot / unreachable storage: the attract ladder must still show the
    // W3DSUP defaults, never an empty board (which would make any score qualify).
    expect(loadHighScores(makeMcHighScoreStorage())).toEqual(DEFAULT_HIGH_SCORES)
  })

  it('loadHighScores returns the persisted board on a returning boot', () => {
    const storage = makeMcHighScoreStorage()
    storage.save(board)
    expect(loadHighScores(makeMcHighScoreStorage())).toEqual(board)
  })

  it('a committed high score survives a save→reload and is lobby-readable', () => {
    // The real commit path: a qualifying entry commits a new ladder (a NEW array),
    // the shell saves it, and a fresh boot reads it back — one origin, one key.
    const committed = commitNameEntry({
      ...createGame(),
      phase: 'entry',
      initials: 'ZZZ',
      score: QUALIFY,
      highScores: DEFAULT_HIGH_SCORES,
    })
    expect(committed.highScores[0]).toEqual({ name: 'ZZZ', score: QUALIFY })

    const storage = makeMcHighScoreStorage()
    storage.save(committed.highScores)

    expect(loadHighScores(makeMcHighScoreStorage())).toEqual(committed.highScores)
    expect(lobbyTopScore(GAME_ID)).toBe(QUALIFY)
  })
})
