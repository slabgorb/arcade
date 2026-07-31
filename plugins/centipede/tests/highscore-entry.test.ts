// tests/highscore-entry.test.ts
//
// Story cp4-6 — RED phase (O'Brien / TEA). The high score is wired at ONE end:
// main.ts:58-59 LOADS a board through @shared/highscore and render.ts:244
// draws its top score, but nothing ever WRITES. The displayed high score can
// therefore never change — the same "wired at one end only" class as cp3-2's
// invisible flea. This suite pins the write path and the initials entry that
// feeds it.
//
// ─── GROUND TRUTH — rev-4 CENTI4.MAC (the VENDORED tree's numbering) ─────────
// The ROM runs two routines in sequence when a game ends:
//
//   UPDATE (:2534 ".SBTTL UPDATE-UPDATE HIGH SCORE TABLE") walks the board
//     three bytes at a time (:2567-2579) comparing the finished score against
//     each entry — ":2574 BCC 30$ ;NEW HIGH SCORE" — and, on a qualifying
//     score, clears UPDINT (":2592 STA UPDINT ;STARTING WITH FIRST INITIAL")
//     so GETINT runs. The board is NSCORE deep (CENDE4.MAC:120
//     "NSCORE =8 ;NUMBER OF HIGH SCORE ENTRIES"; :2578 "CPY I,3*NSCORE").
//
//   GETINT (:1001 ".SBTTL GETINT-GET PLAYERS INITIALS FOR HIGH CORE" — the
//     ROM's own typo; the body comment at :1002 spells it SCORE) collects
//     exactly THREE initials: three INITAL calls (:1052, :1055, :1059) and the
//     done test ":1074 CMP I,03 / :1075 BCC 55$ ;IF WE ARE NOT DONE". Each new
//     slot opens on the letter A (":1103-1104 LDA I,1 / STA X,INITL ;SET
//     INITIAL TO A"). It prints "GREAT SCORE" (:1036) and "ENTER YOUR
//     INITIALS" (:1038), and on completion runs COPYHS (":1117 JSR COPYHS
//     ;COPY HIGH SCORES TO EAROM BUFFER") — the cabinet's persist step, whose
//     clone equivalent is the @shared/highscore save.
//
// RADIX: CENTI4.MAC inherits .RADIX 16 from CENDE4, so bare literals are HEX.
// It does not bite "CMP I,03" (3 either way) or NSCORE=8.
//
// CORRECTION (rework round 1): an earlier version of this header called
// ":1101 LDA I,0F4 ;ABOUT 50 SECONDS" a count of 244 FRAMES. It is not — it is a
// SEED for the high byte of the frame counter, and reading it as a frame count
// makes the timeout twelve times too short. The derivation is in the timeout
// describe block at the bottom of this file.
//
// ─── THE ONE LEGIT DIVERGENCE (logged in the session Design Deviations) ──────
// GETINT is a TRACKBALL picker in silicon: it scrolls ONE letter with the
// horizontal trackball every 8th frame (:1130-1138) and commits it with the
// FIRE button through a 5-frame debounce (:1060-1071 "2 FRAMES OFF 3 FRAMES
// ON"). A keyboard clone types the letter directly, so this is a UX PORT, not
// a transcription. The buffer arithmetic itself is NOT bespoke: it is the
// cabinet-wide shared verb `stepNameEntry` from @shared/name-entry,
// already used by tempest, asteroids, star-wars and battlezone. Only the
// on-screen presentation is centipede's own.
//
// ─── BOUNDARY (user ruling 2026-07-21, overriding the epic description) ──────
// The epic text said "keep it a shell concern, sim untouched". Superseded: all
// four games that already ship this put the board, the qualifies flag, the
// initials buffer and the insert in CORE — every one of those shared functions
// is pure — and leave ONLY makeHighScoreStorage (which touches localStorage,
// a purity-guard forbidden global) and the save trigger in the shell. cp4-6
// follows the fleet. Reference: asteroids/src/core/sim.ts enterInitial,
// asteroids/src/core/lives.ts (qualifies on game-over entry),
// asteroids/src/main.ts (save on reference identity).
//
// ─── WHY THIS IS RED ────────────────────────────────────────────────────────
// `SimState.highScoreTable`, `SimState.entry` and the exported `enterInitial`
// do not exist yet. The probe below turns the missing export into a
// self-describing failure instead of a bare TypeError, and the local
// SimWithBoard type keeps this file typechecking under `npm run lint`
// (tsconfig includes tests/) before the fields land — the cp4-5 idiom.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  makeHighScoreStorage,
  makeHighScoreRowGuard,
  highScoreKey,
  MAX_HIGH_SCORES,
  type HighScoreEntry,
  type HighScoreTable,
} from '@shared/highscore'
import { createSim, createAttract, stepSim, cloneState, type SimState } from '../src/core/sim'
import * as simModule from '../src/core/sim'
import type { Segment } from '../src/core/centipede'
import type { InputCounts } from '../src/core/player'
import { render } from '../src/shell/render'
import type { Atlas } from '../src/shell/atlas'
import mainSrc from '../src/main.ts?raw'
import simSrc from '../src/core/sim.ts?raw'

const GAME_ID = 'centipede'

// ─── the new cp4-6 surface, typed locally so RED typechecks ──────────────────

/** The game-over initials sub-state. Non-null ONLY in the gameover phase — the
 *  ROM's UPDFLG/UPDINT pair (:2537-2540, :2592) collapsed to one object. */
interface InitialsEntry {
  qualifies: boolean
  initials: string
  confirmed: boolean
  /** Frames left before the entry gives up and returns to attract (rework
   *  round 1 — GETINT's timeout; see the derivation at the foot of this file). */
  timeout: number
}
type Row = HighScoreEntry<'wave'>
type SimWithBoard = SimState & {
  highScoreTable: HighScoreTable<'wave'>
  entry: InitialsEntry | null
}
const ext = (s: SimState): SimWithBoard => s as SimWithBoard

/** Patch a state with cp4-6 fields that do not exist on SimState yet. */
function seedState(state: SimState, patch: Partial<SimWithBoard>): SimWithBoard {
  return { ...ext(state), ...patch } as SimWithBoard
}

// `enterInitial` is added by cp4-6 GREEN. Probing the module (rather than a
// named import) keeps the failure legible per-test instead of collapsing the
// whole file into a load error — the cp4-5 createAttract idiom.
function enterInitial(state: SimState, key: string): SimWithBoard {
  const fn = (simModule as { enterInitial?: (s: SimState, k: string) => SimState }).enterInitial
  if (typeof fn !== 'function') {
    throw new Error(
      'cp4-6 not implemented yet: src/core/sim.ts must export enterInitial(state, key): SimState ' +
        '(pure; wraps stepNameEntry from @shared/name-entry)',
    )
  }
  return ext(fn(state, key))
}

// The two ROM-derived timeout constants cp4-6 GREEN must export. Probed like
// enterInitial so a missing export reds with a message instead of `undefined`.
function timeoutConst(name: 'ENTRY_TIMEOUT_OPEN_FRAMES' | 'ENTRY_TIMEOUT_LETTER_FRAMES'): number {
  const v = (simModule as Record<string, unknown>)[name]
  if (typeof v !== 'number') {
    throw new Error(`cp4-6 rework not implemented yet: src/core/sim.ts must export ${name}`)
  }
  return v
}

type Input = InputCounts & { start?: boolean }
const IDLE: Input = { dh: 0, dv: 0, fire: false }
const START: Input = { dh: 0, dv: 0, fire: false, start: true }

/** A live head sitting exactly on the gun — forces a death next frame
 *  (the death-restor.test.ts / game-loop.test.ts idiom). */
function segOnGun(s: SimState): Segment {
  return { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }
}

/** Drive a ONE-life sim carrying `score` into the real, latched game-over
 *  state — never a hand-built one, so the entry this returns was opened by the
 *  sim's own transition (the clone's UPDATE :2534 moment).
 *
 *  `bonusLevel` is pushed out of reach on purpose. createSim seeds the first
 *  bonus-life threshold at 10,000 (cp4-4), so a seeded score above it would
 *  award a spare life the moment the sim stepped — the run would survive its
 *  one death and never reach game-over. Parking the threshold above the score
 *  isolates this suite from cp4-4's mechanism instead of silently depending
 *  on it. */
function driveToGameOver(seed: number, score: number, board: HighScoreTable<'wave'> = []): SimWithBoard {
  return driveFrom(ext(createSim(seed)), score, board)
}

/** The same drive, but from an EXISTING playing state — so a test can reach
 *  game-over along the real attract → START → play route instead of from a
 *  constructed `createSim`. That distinction is the whole point of the rework
 *  block at the foot of this file. */
function driveFrom(start: SimWithBoard, score: number, board?: HighScoreTable<'wave'>): SimWithBoard {
  let s = seedState(start, {
    lives: 1,
    score,
    bonusLevel: score + 1_000_000,
    ...(board === undefined ? {} : { highScoreTable: board }),
  })
  for (let i = 0; i < 4000; i++) {
    // Re-plant the head ON the gun every ordinary frame. Planting it once is
    // seed-dependent: for some seeds the lone segment marches clear of the gun
    // and the run never ends (0x2222 and 0x6666 both survived 4000 frames that
    // way). Re-planting makes the kill a property of the harness, not of the
    // mushroom field a given seed happens to draw.
    if (s.playerExplode === 0 && s.delay === 0) s = seedState(s, { segs: [segOnGun(s)] })
    s = ext(stepSim(s, IDLE))
    if (s.phase === 'gameover') return s
  }
  throw new Error('test setup failed: never reached game over within the frame budget')
}

/** Type the three initials in, one keydown at a time. */
function type3(s: SimWithBoard, initials: string): SimWithBoard {
  let out = s
  for (const ch of initials) out = enterInitial(out, ch)
  return out
}

/** A full board of ten rows, lowest score last (the shared table's ordering). */
function fullBoard(lowest: number): HighScoreTable<'wave'> {
  return Array.from({ length: MAX_HIGH_SCORES }, (_, i) => ({
    name: 'AAA',
    score: lowest + (MAX_HIGH_SCORES - 1 - i) * 1000,
    wave: 1,
  }))
}

// ─── fake localStorage (the vitest env is `node`) ────────────────────────────
// The battlezone highscore-shared-contract.test.ts harness.
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

// ─── a name+position blit recorder (the cp2-12 render.test.ts harness) ───────
interface Blit {
  name: string
  x: number
  y: number
}
function makeRecorder() {
  const blits: Blit[] = []
  let pending: string | null = null
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '' as string,
    fillRect() {},
    drawImage(_i: unknown, _sx: number, _sy: number, _sw: number, _sh: number, x: number, y: number) {
      blits.push({ name: pending ?? '<none>', x, y })
      pending = null
    },
    clearRect() {},
    save() {},
    restore() {},
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, atlas: atlas as unknown as Atlas, blits }
}
/** Every CHAR_ glyph the frame drew, in draw order, as a plain string. */
function lettersDrawn(blits: readonly Blit[]): string {
  return blits
    .map((b) => /^CHAR_(.)$/.exec(b.name)?.[1])
    .filter((c): c is string => c !== undefined)
    .join('')
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the board is CORE state that outlives a single run
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-1 — the high-score board lives on SimState and survives a restart', () => {
  it('createSim seeds an empty board (the shell injects the loaded one)', () => {
    const s = ext(createSim(0x1234))
    expect(Array.isArray(s.highScoreTable), 'SimState carries a highScoreTable array').toBe(true)
    expect(s.highScoreTable, 'a fresh core state starts with no board of its own').toEqual([])
  })

  it('cloneState deep-copies the board — a clone can never write through to the original', () => {
    const board: HighScoreTable<'wave'> = [{ name: 'ABC', score: 9000, wave: 2 }]
    const s = seedState(createSim(1), { highScoreTable: board })
    const c = ext(cloneState(s))
    expect(c.highScoreTable, 'the clone carries the same rows by value').toEqual(board)
    expect(c.highScoreTable, 'but NOT the same array instance').not.toBe(s.highScoreTable)
    c.highScoreTable.push({ name: 'ZZZ', score: 1, wave: 1 })
    expect(s.highScoreTable.length, 'mutating the clone leaves the original board alone').toBe(1)
  })

  it('a restart from game-over CARRIES the board forward (the board outlives every run)', () => {
    // The restart path is `createSim(state.rng.seed)`, which builds a brand-new
    // state — so the board must be threaded through explicitly or every restart
    // silently wipes the boards earned this session and the HUD reverts to the
    // value loaded at boot.
    const board: HighScoreTable<'wave'> = [{ name: 'ABC', score: 9000, wave: 2 }]
    const over = seedState(driveToGameOver(0x2222, 500), {
      highScoreTable: board,
      entry: { qualifies: false, initials: '', confirmed: false, timeout: 0 },
    })
    const restarted = ext(stepSim(over, START))
    expect(restarted.phase, 'START restarts from game-over').toBe('playing')
    expect(restarted.highScoreTable, 'the board is not reset by a new game').toEqual(board)
  })

  it('a start out of ATTRACT also carries the board forward', () => {
    const board: HighScoreTable<'wave'> = [{ name: 'ABC', score: 9000, wave: 2 }]
    const attract = seedState(createAttract(7), { highScoreTable: board })
    const started = ext(stepSim(attract, START))
    expect(started.phase, 'START leaves attract').toBe('playing')
    expect(started.highScoreTable, 'the board survives attract → playing').toEqual(board)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — game-over opens the entry, exactly as UPDATE (:2534) decides
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-1 — game-over opens an initials entry when the score qualifies (UPDATE :2574)', () => {
  it('a qualifying score opens an empty, unconfirmed entry', () => {
    const s = driveToGameOver(0x1111, 12_345)
    expect(s.phase, 'the run ended').toBe('gameover')
    expect(s.entry, 'game-over opens an entry').not.toBeNull()
    expect(s.entry!.qualifies, 'an empty board accepts any positive score').toBe(true)
    expect(s.entry!.initials, 'UPDINT starts at the first initial (:2592)').toBe('')
    expect(s.entry!.confirmed, 'nothing is committed yet').toBe(false)
  })

  it('a ZERO score does NOT qualify (the shared contract rejects score <= 0)', () => {
    const s = driveToGameOver(0x1111, 0)
    expect(s.phase).toBe('gameover')
    expect(s.entry, 'game-over still opens an entry object to report the verdict').not.toBeNull()
    expect(s.entry!.qualifies, 'a scoreless run earns no place on the board').toBe(false)
  })

  it('a score below the last row of a FULL board does not qualify', () => {
    const board = fullBoard(10_000) // lowest row is 10,000
    const s = driveToGameOver(0x1111, 9_999, board)
    expect(s.entry!.qualifies, '9,999 does not beat the 10,000 floor of a full board').toBe(false)
  })

  it('a score that beats the last row of a FULL board DOES qualify', () => {
    const board = fullBoard(10_000)
    const s = driveToGameOver(0x1111, 10_001, board)
    expect(s.entry!.qualifies, '10,001 beats the 10,000 floor').toBe(true)
  })

  it('the qualify verdict is settled ONCE, at the transition — a later board change cannot flip it', () => {
    // qualifiesForHighScore is evaluated against the board as it stood when the
    // run ended; recomputing it per-frame would let a save that happens during
    // the entry screen retroactively disqualify the very score being entered.
    const s = driveToGameOver(0x1111, 12_345)
    expect(s.entry!.qualifies).toBe(true)
    const crowded = seedState(s, { highScoreTable: fullBoard(999_999) })
    const later = ext(stepSim(crowded, IDLE))
    expect(later.entry!.qualifies, 'the verdict taken at game-over stands').toBe(true)
  })

  it('there is NO entry while playing or in attract', () => {
    expect(ext(createSim(3)).entry, 'a live game has no initials entry').toBeNull()
    expect(ext(createAttract(3)).entry, 'attract has no initials entry').toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — enterInitial: the shared cabinet verb, the ROM's three slots
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-2 — enterInitial is the shared stepNameEntry verb over three slots (:1074 CMP I,03)', () => {
  const qualifying = () => driveToGameOver(0x3333, 50_000)

  it('appends a typed letter to the buffer', () => {
    const s = enterInitial(qualifying(), 'K')
    expect(s.entry!.initials).toBe('K')
  })

  it('UPPERCASES a lowercase key (the ROM has one glyph set — CHAR_A..CHAR_Z)', () => {
    const s = type3(qualifying(), 'abc')
    expect(s.entry!.initials, 'the ROM tile atlas has no lowercase glyph to draw').toBe('ABC')
  })

  it('caps the buffer at THREE initials (:1074 "CMP I,03" — three INITAL slots)', () => {
    const s = type3(qualifying(), 'ABCD')
    expect(s.entry!.initials, 'the fourth keystroke is refused, not wrapped').toBe('ABC')
  })

  it('Backspace deletes the last letter', () => {
    const s = enterInitial(type3(qualifying(), 'ABC'), 'Backspace')
    expect(s.entry!.initials).toBe('AB')
  })

  it('Backspace on an EMPTY buffer is inert — it never runs past the start', () => {
    const start = qualifying()
    const s = enterInitial(start, 'Backspace')
    expect(s.entry!.initials).toBe('')
    expect(s, 'an inert keystroke returns the SAME state object').toBe(start)
  })

  it.each(['1', '!', 'Enter', 'ArrowLeft', 'Shift', ' '])('ignores the non-letter key %s', (key) => {
    const start = qualifying()
    const s = enterInitial(start, key)
    expect(s.entry!.initials, `"${key}" is not an initial`).toBe('')
    expect(s, 'an inert keystroke returns the SAME state object').toBe(start)
  })

  it('is inert when the score did NOT qualify', () => {
    const start = driveToGameOver(0x3333, 0)
    expect(start.entry!.qualifies).toBe(false)
    expect(enterInitial(start, 'A'), 'no entry screen, no buffer').toBe(start)
  })

  it('is inert while PLAYING and in ATTRACT', () => {
    const playing = ext(createSim(9))
    expect(enterInitial(playing, 'A'), 'typing during play must not touch the sim').toBe(playing)
    const attract = ext(createAttract(9))
    expect(enterInitial(attract, 'A')).toBe(attract)
  })

  it('is inert outside game-over even when an entry object is somehow present', () => {
    // REWORK (Reviewer round 1): the test above cannot fail on the phase guard,
    // because `entry` is null in every non-game-over state and the NULL check
    // already returns. Mutating `state.phase !== 'gameover'` to `false` killed
    // no test. Give the phase guard something only IT can catch — a live entry
    // carried on a non-game-over state, which is exactly what cp4-7 will create
    // if attract ever holds the last run's entry.
    const playingWithEntry = seedState(createSim(9), {
      entry: { qualifies: true, initials: 'AB', confirmed: false, timeout: 0 },
    })
    expect(enterInitial(playingWithEntry, 'C'), 'the PHASE is what forbids typing here').toBe(playingWithEntry)
    const attractWithEntry = seedState(createAttract(9), {
      entry: { qualifies: true, initials: 'AB', confirmed: false, timeout: 0 },
    })
    expect(enterInitial(attractWithEntry, 'C')).toBe(attractWithEntry)
  })

  it('is inert once the entry is CONFIRMED (no editing a committed row)', () => {
    const confirmed = seedState(qualifying(), {
      entry: { qualifies: true, initials: 'ABC', confirmed: true, timeout: 0 },
    })
    expect(enterInitial(confirmed, 'Z')).toBe(confirmed)
  })

  it('never mutates the state it is given', () => {
    const before = qualifying()
    const snapshot = before.entry!.initials
    enterInitial(before, 'X')
    expect(before.entry!.initials, 'enterInitial is pure — the input state is untouched').toBe(snapshot)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — confirming writes the row through insertHighScore
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-1 — confirming the initials inserts the row (COPYHS :1117)', () => {
  it('a START press with three initials inserts a row carrying name, score AND wave', () => {
    const typed = seedState(type3(driveToGameOver(0x4444, 7_777), 'KEA'), { wave: 5 })
    const after = ext(stepSim(typed, START))
    const row = after.highScoreTable.find((r) => r.name === 'KEA')
    expect(row, 'the confirmed initials land on the board').toBeTruthy()
    expect(row!.score, 'the finished score').toBe(7_777)
    // main.ts:58 binds makeHighScoreRowGuard('wave'); a row without `wave` is
    // dropped by the guard on the next load and the save silently evaporates.
    expect(row!.wave, "the row carries the guard's domain field").toBe(5)
  })

  it('the inserted row carries NO date — the pure core never reads a wall clock', () => {
    const typed = type3(driveToGameOver(0x4444, 7_777), 'KEA')
    const after = ext(stepSim(typed, START))
    const row = after.highScoreTable.find((r) => r.name === 'KEA') as Row & { date?: string }
    expect(row, 'row present').toBeTruthy()
    expect(row.date, 'Date.now() in core would trip the purity guard; `date` is optional by design').toBeUndefined()
  })

  it('marks the entry confirmed so a second press cannot double-insert', () => {
    const typed = type3(driveToGameOver(0x4444, 7_777), 'KEA')
    const after = ext(stepSim(typed, START))
    const inserted = after.highScoreTable.filter((r) => r.name === 'KEA').length
    expect(inserted, 'exactly one row for one run').toBe(1)
  })

  it('refuses to confirm a SHORT buffer — all three slots must be filled', () => {
    const typed = type3(driveToGameOver(0x4444, 7_777), 'KE')
    const after = ext(stepSim(typed, START))
    expect(after.highScoreTable, 'two letters is not a complete set of initials').toEqual([])
    expect(after.phase, 'and the entry screen holds rather than restarting').toBe('gameover')
  })

  it('a NON-qualifying run never inserts, however long START is pressed', () => {
    const seeded: HighScoreTable<'wave'> = [{ name: 'OLD', score: 100, wave: 1 }]
    let s = driveToGameOver(0x4444, 0, seeded)
    // Assert the board is REAL before comparing it to itself — without this the
    // whole test passes vacuously while highScoreTable is undefined (undefined
    // toEqual undefined), which is exactly the RED state it must fail in.
    expect(Array.isArray(s.highScoreTable), 'the board is a live array, not an absent field').toBe(true)
    s = ext(stepSim(s, START))
    expect(s.highScoreTable, 'a scoreless run writes nothing').toEqual(seeded)
  })

  it('keeps the board ordered and capped at the shared depth', () => {
    const board = fullBoard(1_000)
    const typed = type3(driveToGameOver(0x4444, 500_000, board), 'TOP')
    const after = ext(stepSim(typed, START))
    expect(after.highScoreTable.length, 'the shared table truncates to MAX_HIGH_SCORES').toBe(MAX_HIGH_SCORES)
    expect(after.highScoreTable[0].name, 'a 500,000 run tops the board').toBe('TOP')
    const scores = after.highScoreTable.map((r) => r.score)
    expect(scores, 'the board stays sorted descending').toEqual([...scores].sort((a, b) => b - a))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The held-START defect — confirm and restart must not fire on one gesture
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 — a HELD start must not confirm the initials AND restart the game', () => {
  // InputCounts.start is LEVEL-triggered: createKeyboardAdapter reports
  // `any(START_KEYS)` for as long as Enter is DOWN (src/shell/input.ts:144), and
  // the core keeps no previous-press state. So a single human press spans many
  // frames at ~60Hz. Without edge-triggering, frame N confirms the initials and
  // frame N+1 restarts — the player never sees the entry commit, and the board
  // screen is gone before it is drawn. The ROM guards the same button with an
  // explicit debounce: :1067-1071 "ROL SDBNCE / LDA SDBNCE / AND I,1F / CMP
  // I,18 / BNE 60$ ;2 FRAMES OFF 3 FRAMES ON".
  it('holding START across consecutive frames confirms WITHOUT restarting', () => {
    const typed = type3(driveToGameOver(0x5555, 7_777), 'KEA')
    const confirmed = ext(stepSim(typed, START))
    expect(confirmed.highScoreTable.some((r) => r.name === 'KEA'), 'the press commits the row').toBe(true)

    const stillHeld = ext(stepSim(confirmed, START))
    expect(stillHeld.phase, 'the SAME held press must not also restart the game').toBe('gameover')
  })

  it('a RELEASE and a fresh press then restarts', () => {
    const typed = type3(driveToGameOver(0x5555, 7_777), 'KEA')
    let s = ext(stepSim(typed, START)) // press: confirm
    s = ext(stepSim(s, IDLE)) // release
    s = ext(stepSim(s, START)) // fresh press: restart
    expect(s.phase, 'a deliberate second press starts the next game').toBe('playing')
  })

  it('a held START on a NON-qualifying game-over restarts exactly once, not every frame', () => {
    // The pre-cp4-6 behaviour must survive: with nothing to enter, the first
    // press restarts. What must NOT happen is a fresh reseed on every frame the
    // key stays down — that would restart the game continuously while held.
    const over = driveToGameOver(0x5555, 0)
    const first = ext(stepSim(over, START))
    expect(first.phase, 'the press starts a new game').toBe('playing')
    const second = ext(stepSim(first, START))
    expect(second.frame, 'the still-held key must not reseed a second fresh game').toBeGreaterThan(first.frame)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — determinism and the core/shell boundary
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-3 — the save path is deterministic and core stays pure', () => {
  it('the same seed, score and keystrokes produce a byte-identical board', () => {
    const run = () => {
      const typed = type3(driveToGameOver(0x6666, 33_333), 'ABC')
      return ext(stepSim(typed, START)).highScoreTable
    }
    expect(run(), 'a replayed run writes the identical row').toEqual(run())
  })

  it('src/core/sim.ts does not import the storage module (localStorage is shell-only)', () => {
    // The purity sweep (tests/purity.test.ts) already forbids `localStorage` in
    // src/core; this pins the seam one level up — the core must not even reach
    // for makeHighScoreStorage, whose job is to touch it.
    const code = stripComments(simSrc)
    expect(code, 'the storage constructor belongs to the shell').not.toMatch(/makeHighScoreStorage/)
    expect(code, 'core never names the browser store').not.toMatch(/localStorage/)
  })

  it('core builds the row with the PURE shared helpers only', () => {
    const code = stripComments(simSrc)
    expect(code, 'the initials buffer is the shared cabinet verb, not hand-rolled').toMatch(/stepNameEntry/)
    expect(code, 'the qualify test comes from the shared contract').toMatch(/qualifiesForHighScore/)
    expect(code, 'the insert comes from the shared contract').toMatch(/insertHighScore/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the shared storage contract: a beaten score survives a reload
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-1 — the board round-trips through @shared/highscore', () => {
  beforeEach(() => installStorage(makeFakeStorage()))
  afterEach(() => installStorage(undefined))

  const storage = () => makeHighScoreStorage<Row>(GAME_ID, makeHighScoreRowGuard('wave'), 'wave')

  it('a board written at game-over is read back by a FRESH storage handle (a page reload)', () => {
    const typed = seedState(type3(driveToGameOver(0x7777, 42_000), 'KEA'), { wave: 3 })
    const played = ext(stepSim(typed, START))
    storage().save(played.highScoreTable)

    // A reload constructs a brand-new storage over the same origin.
    const reloaded = storage().load()
    expect(reloaded[0]?.score, 'the beaten high score is what the next boot loads').toBe(42_000)
    expect(reloaded[0]?.name, 'with the initials the player typed').toBe('KEA')
  })

  it('the row survives the shared ROW GUARD — a wave-less row would be dropped on load', () => {
    const typed = seedState(type3(driveToGameOver(0x7777, 42_000), 'KEA'), { wave: 3 })
    const played = ext(stepSim(typed, START))
    storage().save(played.highScoreTable)
    const raw = globalThis.localStorage.getItem(highScoreKey(GAME_ID))
    expect(raw, 'the table is persisted under the shared per-game key').toBeTruthy()
    const guard = makeHighScoreRowGuard('wave')
    const parsed: unknown = JSON.parse(raw as string)
    expect(Array.isArray(parsed)).toBe(true)
    const rows = parsed as unknown[]
    expect(rows.every((r) => guard(r)), 'every persisted row passes the guard main.ts binds').toBe(true)
  })

  it('the HUD number a reload shows is the score just earned', () => {
    // The whole point of the story: before it, load() fed a value nothing could
    // ever change. main.ts renders `load()[0]?.score ?? 0`.
    expect(storage().load()[0]?.score ?? 0, 'nothing on the board yet').toBe(0)
    const typed = type3(driveToGameOver(0x7777, 8_888), 'KEA')
    storage().save(ext(stepSim(typed, START)).highScoreTable)
    expect(storage().load()[0]?.score ?? 0, 'the next boot draws the beaten score').toBe(8_888)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the HUD high score is LIVE, not a boot-time scalar
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-3 — main.ts feeds render a LIVE high score and saves when the board changes', () => {
  const code = stripComments(mainSrc)

  it('does not freeze the high score in a module-scope constant read once at boot', () => {
    // The pre-cp4-6 line is `const highScore = highScoreStorage.load()[0]?.score ?? 0`,
    // evaluated ONCE. Every frame then renders that stale number, so a score
    // beaten this session does not appear until the page is reloaded — and AC-4's
    // "survives a reload" smoke test would pass straight over it.
    expect(code, 'the drawn high score must be recomputed, not captured at boot').not.toMatch(
      /const\s+highScore\s*=\s*highScoreStorage\.load\(\)/,
    )
  })

  it('derives the drawn high score from the live sim board', () => {
    // REWORK (Reviewer round 1): this assertion used to scan the WHOLE file for
    // `sim.highScoreTable`, which also appears on the save-trigger lines — so
    // gutting the render call to `render(logicalCtx, atlas, sim, 0)` left it
    // green and the story's headline defect could have been reintroduced
    // verbatim. Anchor to the render CALL, not the file.
    expect(code, 'the board must be read inside the render() call itself').toMatch(
      /render\s*\([^)]*highScoreTable/,
    )
  })

  it('seeds the core board from the loaded table at boot', () => {
    expect(code, 'the loaded board is injected into the sim state').toMatch(/highScoreStorage\.load\(\)/)
    expect(code, 'and lands on highScoreTable').toMatch(/highScoreTable/)
  })

  it('SAVES when the core replaces the board', () => {
    expect(code, 'the shell owns the write; the core only produces a new array').toMatch(/highScoreStorage\.save\(/)
  })

  it('routes letter keydowns into the core enterInitial', () => {
    expect(code, 'the keyboard initials port is wired in the shell').toMatch(/enterInitial/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the initials UI actually draws
// ═════════════════════════════════════════════════════════════════════════════
describe('cp4-6 AC-2 — the entry screen renders the buffer the player is typing', () => {
  it('draws the typed initials during a qualifying game-over', () => {
    const typed = type3(driveToGameOver(0x8888, 55_000), 'KEA')
    const r = makeRecorder()
    render(r.ctx, r.atlas, typed, 0)
    expect(lettersDrawn(r.blits), 'the buffer is on screen as ROM CHAR_ tiles').toContain('KEA')
  })

  it('shows the entry prompt the ROM shows (:1038 DISPLAY "ENTER YOUR INITIALS")', () => {
    const s = driveToGameOver(0x8888, 55_000)
    const r = makeRecorder()
    render(r.ctx, r.atlas, s, 0)
    expect(lettersDrawn(r.blits), 'the player is told what to do').toMatch(/ENTER/)
  })

  it('draws NO entry screen during ordinary play', () => {
    const r = makeRecorder()
    render(r.ctx, r.atlas, createSim(0x8888), 0)
    expect(lettersDrawn(r.blits), 'a live game shows no initials prompt').not.toMatch(/ENTER/)
  })

  it('draws NO entry screen when the run did not qualify', () => {
    const s = driveToGameOver(0x8888, 0)
    const r = makeRecorder()
    render(r.ctx, r.atlas, s, 0)
    expect(lettersDrawn(r.blits), 'no board place, no prompt').not.toMatch(/ENTER/)
  })

  it('stops prompting once the initials are CONFIRMED', () => {
    // REWORK (Reviewer round 1). The draw guard tested `qualifies` but not
    // `confirmed`, so "GREAT SCORE / ENTER YOUR INITIALS" kept drawing after the
    // row had landed — telling the player to do something already done. The ROM
    // does the opposite the moment entry completes: :1109-1112 "LDA I,88 / JSR
    // MESS ;REMOVE \"GREAT SCORE\" / LDA I,85 / JSR MESS ;REMOVE \"ENTER
    // INITIALS\"", then :1113-1116 clears the three initial cells.
    const typed = type3(driveToGameOver(0x8888, 55_000), 'KEA')
    const confirmed = ext(stepSim(typed, START))
    expect(confirmed.entry!.confirmed, 'precondition: the row is committed').toBe(true)
    const r = makeRecorder()
    render(r.ctx, r.atlas, confirmed, 0)
    expect(lettersDrawn(r.blits), 'the prompt is withdrawn once there is nothing left to enter').not.toMatch(/ENTER/)
  })

  it('renders only glyphs the ROM tile atlas actually has', () => {
    // layoutText THROWS on an unknown character (src/shell/layout.ts:128), so an
    // initials screen that tries to draw a lowercase letter or a cursor glyph
    // takes the whole frame down rather than degrading.
    const typed = type3(driveToGameOver(0x8888, 55_000), 'KEA')
    const r = makeRecorder()
    expect(() => render(r.ctx, r.atlas, typed, 0), 'every drawn character has a stamp').not.toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// REWORK — Reviewer round 1, finding #1 (HIGH): START must edge-trigger on the
// REAL path, not just on states a test constructed
// ═════════════════════════════════════════════════════════════════════════════
//
// `startPrev` was added so one press could not both confirm and restart. But it
// was maintained ONLY inside stepSim's attract/game-over branch — `stepPlayingFrame`
// never touched it and `stepDeathFrame` does not even receive `input` — so after
// the START press that begins a game stored `startPrev: true`, it stayed true for
// the whole game. The next game-over then computed `pressed = held && !startPrev`
// = false and SWALLOWED the player's first press.
//
// Every test above missed it because they all build their game-over from
// `createSim`, which seeds `startPrev: false`. None of them travels the path a
// human always travels. These do.
describe('cp4-6 REWORK — START edge-triggers along the real attract → play → game-over path', () => {
  /** Boot and start a game exactly as the shell does: attract, press START,
   *  release it, then play on. */
  function realStart(seed: number): SimWithBoard {
    let s = ext(stepSim(ext(createAttract(seed)), START))
    expect(s.phase, 'precondition: START leaves attract').toBe('playing')
    for (let i = 0; i < 5; i++) s = ext(stepSim(s, IDLE)) // the player lets go
    return s
  }

  it('tracks the ACTUAL input level while playing — a released key is noticed', () => {
    const s = realStart(0x9001)
    expect(s.startPrev, 'START was released five frames ago; the sim must know').toBe(false)
  })

  it('ONE press commits the initials after a real start (the swallowed-press bug)', () => {
    let s = driveFrom(realStart(0x9002), 50_000)
    expect(s.entry!.qualifies).toBe(true)
    s = type3(s, 'KEA')
    const after = ext(stepSim(s, START))
    expect(after.highScoreTable.map((r) => r.name), 'a single deliberate press must commit').toEqual(['KEA'])
  })

  it('ONE press restarts a NON-qualifying game-over after a real start', () => {
    const s = driveFrom(realStart(0x9003), 0)
    expect(s.entry!.qualifies).toBe(false)
    expect(ext(stepSim(s, START)).phase, 'a single deliberate press must restart').toBe('playing')
  })

  it('still refuses to confirm AND restart on one held press (the original guard holds)', () => {
    let s = type3(driveFrom(realStart(0x9004), 7_777), 'KEA')
    const confirmed = ext(stepSim(s, START))
    expect(confirmed.highScoreTable.length, 'the press commits').toBe(1)
    expect(ext(stepSim(confirmed, START)).phase, 'the SAME held press must not also restart').toBe('gameover')
  })

  it('survives a SECOND full game — the flag never latches across runs', () => {
    // The regression is cumulative: if any branch forgets to refresh startPrev,
    // the second game-over is where it shows. Every press below is a single,
    // deliberate press with a release before it — exactly what a human does.
    let s = type3(driveFrom(realStart(0x9005), 1_000), 'ABC')
    s = ext(stepSim(s, START)) // game 1: confirm
    expect(s.highScoreTable.length, 'game one commits on one press').toBe(1)
    s = ext(stepSim(s, IDLE)) // release
    s = ext(stepSim(s, START)) // game 1: restart
    expect(s.phase, 'a second game begins').toBe('playing')
    for (let i = 0; i < 5; i++) s = ext(stepSim(s, IDLE)) // release, play on

    const second = driveFrom(s, 90_000)
    const after = ext(stepSim(type3(second, 'ZZZ'), START))
    expect(after.highScoreTable.some((r) => r.name === 'ZZZ'), 'one press still commits in game two').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// REWORK — Reviewer round 1, finding #2 (MEDIUM): the entry screen must have an
// EXIT. Port GETINT's timeout (user ruling 2026-07-22).
// ═════════════════════════════════════════════════════════════════════════════
//
// Before this, a qualifying player who did not type exactly three letters was
// stuck forever: START is swallowed while the buffer is short, and the ROM's only
// escape had been deferred. 50 press/release cycles left the sim in `gameover`
// with an empty buffer.
//
// ─── DERIVING THE TIMEOUT (do NOT transcribe 0xF4 as a frame count) ──────────
// FRAME is a 16-bit UP-counter incremented once per frame, and FRAME+1 is its
// HIGH byte — CENIR4.MAC:269-271 "INC FRAME ;UPDATE FRAME COUNTER / BNE 8$ ;IF
// NO OVERFLOW / INC FRAME+1". So FRAME+1 ticks once per 256 frames. The entry
// seeds FRAME+1 and waits for it to reach ZERO (:1105-1106 "LDA FRAME+1 / BEQ
// 52$ ;TIME OUT - BACK TO ATTRACT"), so the wait is (0x100 - seed) * 256 frames:
//
//   UPDATE :2625-2626  "LDA I,0F0 ;1 MINUTE AT 60HZ / STA FRAME+1 ;PREPARE TO
//                       TIMEOUT GETTING INITIALS"   → (256-240)*256 = 4096 frames
//   GETINT :1101-1102  "LDA I,0F4 ;ABOUT 50 SECONDS / STA FRAME+1 ;RESET
//                       TIMEOUT"                    → (256-244)*256 = 3072 frames
//
// At the clone's 15750/263 Hz that is 68.4 s and 51.3 s — matching BOTH of the
// ROM's own comments independently, which is the corroboration that the 256-frame
// tick is right. Reading 0xF4 as 244 FRAMES would give 4.1 s: twelve times too
// fast, and the player could never finish typing.
//
// ─── WHAT A TIMEOUT COSTS (the ROM is explicit) ─────────────────────────────
// It costs the NAME, never the PLACE. UPDATE writes the score into the board
// BEFORE any initial is collected — :2619-2624 "LDA X,SCORE2 / STA Y,HSCORE+2 /
// … ;MOVE HIGH SCORES IN" — and only then arms the timeout. So the clone must
// commit the row on expiry with whatever was typed, not discard the run.
describe('cp4-6 REWORK — the initials entry times out (GETINT :1101, UPDATE :2625)', () => {
  it('opens with the ROM-derived countdown seeded from UPDATE :2625 (0xF0 → 4096 frames)', () => {
    const s = driveToGameOver(0xa001, 50_000)
    expect(timeoutConst('ENTRY_TIMEOUT_OPEN_FRAMES'), '(0x100 - 0xF0) * 256').toBe(4096)
    expect(s.entry!.timeout, 'the entry arms its own timeout as it opens').toBe(timeoutConst('ENTRY_TIMEOUT_OPEN_FRAMES'))
  })

  it('counts down one frame per step while the player hesitates', () => {
    const s = driveToGameOver(0xa002, 50_000)
    const after = ext(stepSim(s, IDLE))
    expect(after.entry!.timeout, 'one frame elapsed').toBe(s.entry!.timeout - 1)
  })

  it('an ACCEPTED letter reloads the countdown to GETINT\'s value (0xF4 → 3072 frames)', () => {
    let s = driveToGameOver(0xa003, 50_000)
    for (let i = 0; i < 100; i++) s = ext(stepSim(s, IDLE)) // burn some clock
    expect(s.entry!.timeout, 'clock genuinely advanced').toBeLessThan(timeoutConst('ENTRY_TIMEOUT_OPEN_FRAMES'))
    const typed = enterInitial(s, 'K')
    expect(timeoutConst('ENTRY_TIMEOUT_LETTER_FRAMES'), '(0x100 - 0xF4) * 256').toBe(3072)
    expect(typed.entry!.timeout, 'each accepted letter buys the player more time').toBe(timeoutConst('ENTRY_TIMEOUT_LETTER_FRAMES'))
  })

  it('an INERT keystroke does not reload the countdown', () => {
    let s = driveToGameOver(0xa004, 50_000)
    for (let i = 0; i < 100; i++) s = ext(stepSim(s, IDLE))
    const before = s.entry!.timeout
    // Guard against a vacuous pass: with no timeout field this would compare
    // undefined to undefined and go green in exactly the RED state it must fail in.
    expect(typeof before, 'the countdown is a live number, not an absent field').toBe('number')
    expect(enterInitial(s, '1').entry!.timeout, 'a digit is not an initial and buys nothing').toBe(before)
  })

  it('on expiry the row is COMMITTED with whatever was typed, and the game returns to attract', () => {
    // The ROM's guarantee: the score is already on the board (:2619-2624), so a
    // timeout costs the name, not the place.
    let s = type3(driveToGameOver(0xa005, 33_000), 'KE') // an incomplete pair
    for (let i = 0; i < timeoutConst('ENTRY_TIMEOUT_LETTER_FRAMES') + 2 && s.phase === 'gameover'; i++) {
      s = ext(stepSim(s, IDLE))
    }
    expect(s.phase, ':1106 ";TIME OUT - BACK TO ATTRACT"').toBe('attract')
    expect(s.highScoreTable.length, 'the run keeps its place on the board').toBe(1)
    expect(s.highScoreTable[0].score, 'with the score it earned').toBe(33_000)
  })

  it('THE SOFTLOCK: a qualifying player who types nothing still escapes', () => {
    let s = driveToGameOver(0xa006, 50_000)
    expect(s.entry!.qualifies).toBe(true)
    for (let i = 0; i < timeoutConst('ENTRY_TIMEOUT_OPEN_FRAMES') + 2 && s.phase === 'gameover'; i++) {
      s = ext(stepSim(s, IDLE))
    }
    expect(s.phase, 'the entry screen can never trap the player forever').toBe('attract')
  })

  it('the countdown stops once the initials are CONFIRMED', () => {
    const confirmed = ext(stepSim(type3(driveToGameOver(0xa007, 50_000), 'KEA'), START))
    expect(confirmed.entry!.confirmed).toBe(true)
    let s = confirmed
    for (let i = 0; i < timeoutConst('ENTRY_TIMEOUT_OPEN_FRAMES') + 2; i++) s = ext(stepSim(s, IDLE))
    expect(s.highScoreTable.filter((r) => r.name === 'KEA').length, 'no second insert from a running clock').toBe(1)
  })

  it('the board still survives the timeout path into attract, then into the next game', () => {
    let s = type3(driveToGameOver(0xa008, 33_000), 'ABC')
    s = ext(stepSim(s, START)) // confirm
    for (let i = 0; i < 3; i++) s = ext(stepSim(s, IDLE))
    const board = s.highScoreTable
    expect(board.length).toBe(1)
    s = ext(stepSim(ext(stepSim(s, IDLE)), START)) // restart
    expect(s.phase).toBe('playing')
    expect(s.highScoreTable, 'the board outlives the timeout route too').toEqual(board)
  })
})
