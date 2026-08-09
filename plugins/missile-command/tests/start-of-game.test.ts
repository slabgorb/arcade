// plugins/missile-command/tests/start-of-game.test.ts
//
// Story mc6-2 — RED phase (Tyr One-Handed / TEA). SETUP -> PLAY start-of-game:
// a start action advances `'attract'`/`'over'` -> (setup) -> `'play'`, reseeding a
// fresh, fully-defended field (6 live cities, 3 bases at full ammo, wave-1
// schedule). Builds on mc6-1's MAINLINE dispatch boundary (state.ts).
//
// ─── RULING AT RED (user, this session) ──────────────────────────────────────
// The mc6-1 O-6a precedent rules phase-model shape at RED. For mc6-2 the user
// chose the **minimal reseed edge**, not the full SETUP task machine:
//   • A pure `startGame(state): GameState` in src/core/game.ts. When `phase` is
//     `'attract'` or `'over'`, it returns a fresh game in `'play'` (the SETUP
//     NEWGAM task — `SETUP1: .WORD NEWGAM-1`, W3MAIN.MAC:583; `NEWGAM`, :3835).
//     `'setup'` is the transient logical step; NO SETUPC/SETUP1 dispatch machine
//     is built here (deferred).
//   • `createGame` KEEPS booting to `'play'` (boot-to-attract is mc6-4), so the
//     10+ combat/wave suites that call `createGame()` stay green untouched.
//   • The start TRIGGER is "press fire to start" (the Z/X/C fire keys), mirroring
//     the existing shell — no coin handling. A pure `fireOrStart(key, state)` in
//     src/shell/input.ts routes a fire key to `startGame` when the game is not
//     running, and otherwise delegates to today's `fireFromKey` (fire launches an
//     ABM in play; a start mid-game must NOT wipe the board).
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
// Cold start writes SETUP with ATRACT on: `LDA I,S.SETU` (W3MAIN.MAC:491) /
// `STA STATE` (:493); ATRACT flag `;ATTRACT (0)/GAME (-1) FLAG` (:135). The SETUP
// task list begins `SETUP1: .WORD NEWGAM-1  ;NEW GAME` (:583) -> NEWGAM (:3835),
// the task that seeds a new game on wave 1 (`LDA I,1 / STA WAVENO`, cf.
// src/core/wave.ts INITIAL_WAVE). mc6-2 files the two anchor claims this names.
//
// ─── WHAT IS REACHABLE TODAY ─────────────────────────────────────────────────
// `createGame` boots to `'play'`, so `'attract'` never occurs at runtime until
// mc6-4 wires the boot — the attract->play path below is pinned but future-facing.
// The `'over'`->fire->`'play'` path IS reachable now: a real game reaches
// `phase: 'over'` (all cities dead), stepGame freezes it, and "press fire to
// start" begins a fresh game. That is mc6-2's hand-verifiable deliverable.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Neither `startGame` (core/game.ts) nor `fireOrStart` (shell/input.ts) exists
// yet, and the MC-STATE-INIT / MC-SETUP-NEWGAM claims are unfiled. Both surfaces
// are reached through self-describing dynamic-import loaders (the fleet idiom), so
// each test reddens for the FEATURE's absence rather than a raw resolution stack.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game.js'
import { createCities, createBases, MAXMIS } from '../src/core/field.js'
import { NICBMS } from '../src/core/spawn.js'
import { INITIAL_WAVE, waveSchedule } from '../src/core/wave.js'
import { fireFromKey } from '../src/shell/input.js'
import { type Icbm } from '../src/core/icbm.js'
import { type Phase } from '../src/core/state.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

// ─── the contracts GREEN (Loki / Dev) implements ─────────────────────────────
// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// new surface is still absent (the state/field/icbm.test.ts idiom).
const GAME_SPECIFIER = '../src/core/game.js'
const INPUT_SPECIFIER = '../src/shell/input.js'

type StartGame = (state: GameState) => GameState
type FireOrStart = (key: string, state: GameState) => GameState

async function loadStartGame(): Promise<StartGame> {
  const mod = (await import(/* @vite-ignore */ GAME_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.startGame !== 'function') {
    throw new Error(
      'startGame not built yet — GREEN (Loki) adds a PURE `startGame(state): GameState` to ' +
        "src/core/game.ts: when state.phase is 'attract' or 'over', return a fresh, fully-defended " +
        "game in phase 'play' (reuse createGame's field — the SETUP NEWGAM task, W3MAIN.MAC:583/:3835); " +
        'for every other phase return state UNCHANGED. No clock, no Math.random — a pure transition.',
    )
  }
  return mod.startGame as StartGame
}

async function loadFireOrStart(): Promise<FireOrStart> {
  const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.fireOrStart !== 'function') {
    throw new Error(
      'fireOrStart not built yet — GREEN (Loki) adds `fireOrStart(key, state): GameState` to ' +
        "src/shell/input.ts: if `key` is a fire key (fireKeyToBase !== null) AND state.phase is " +
        "'attract'|'over', return startGame(state); otherwise return fireFromKey(key, state) so " +
        'firing in play still launches an ABM and a non-fire key changes nothing. "Press fire to start".',
    )
  }
  return mod.fireOrStart as FireOrStart
}

// ─── fixtures ────────────────────────────────────────────────────────────────

/** A single in-flight ICBM, so a reseed can be shown to CLEAR live enemies (not
 *  merely flip the phase on an already-empty board). RNG-free literal. */
const anIcbm = (): Icbm => ({
  origin: { h: 100, v: 231 },
  target: { h: 100, v: 0 },
  pos: { h: 100, v: 120 },
  arrived: false,
})

/** A played-OUT game in `phase`: every city dead, both magazines spent, a live
 *  ICBM on screen, a high score, a late wave, a spent budget, a huge frame count.
 *  All fixtures derive from the SAME `createGame(1)`, so the rng word is identical
 *  across them — the reseed's determinism does not hinge on which phase we came
 *  from. Proving startGame turns THIS into a fresh field is the real test; a
 *  transition that merely set `phase = 'play'` would fail every assertion below. */
const dirty = (phase: Phase): GameState => ({
  ...createGame(1),
  phase,
  score: 5000,
  cities: createCities().map((c) => ({ ...c, alive: false })),
  bases: createBases().map((b) => ({ ...b, alive: false, ammo: 0 })),
  icbms: [anIcbm()],
  wave: 7,
  remaining: 0,
  frame: 9999,
})

/** Every observable of a fresh, fully-defended game at rest (mc3-4 AC1's shape),
 *  asserted against the cited constants — never bare magic numbers. */
function expectFreshPlayGame(g: GameState): void {
  expect(g.phase).toBe('play')
  expect(g.cities.length).toBe(6)
  expect(g.cities.every((c) => c.alive)).toBe(true)
  expect(g.bases.length).toBe(3)
  expect(g.bases.every((b) => b.alive && b.ammo === MAXMIS)).toBe(true)
  expect(g.icbms).toEqual([])
  expect(g.abms).toEqual([])
  expect(g.explosions).toEqual([])
  expect(g.sputniks).toEqual([])
  expect(g.score).toBe(0)
  expect(g.wave).toBe(INITIAL_WAVE)
  // mc5-9: a fresh game starts at wave 1, so `remaining` is the wave-1 ICBWAV
  // LAUNCH budget (waveSchedule(INITIAL_WAVE).count = 12), NOT the NICBMS(8)
  // on-screen cap. mc5-7 changed createGame's seed to the schedule budget and
  // updated game.test.ts; this sibling test had lagged (mirrors game.test.ts:75-77).
  expect(g.remaining).toBe(waveSchedule(INITIAL_WAVE).count)
  expect(g.remaining).not.toBe(NICBMS)
  expect(g.frame).toBe(0)
}

const FIRE_KEYS = ['z', 'x', 'c'] as const
/** Phases from which a start action must NOT begin a new game (the game is
 *  running, paused, transitioning between waves, or already setting up). */
const NON_START_PHASES: readonly Phase[] = ['play', 'pause', 'between', 'setup']

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — `'over'` -> start reseeds a fresh PLAY game (the reachable-today path:
//        press fire to restart after game over). This is the story's core edge.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC1 — startGame from a game-over state reseeds a fresh field', () => {
  it("turns a played-out 'over' state into a fresh, fully-defended 'play' game", async () => {
    const startGame = await loadStartGame()
    expectFreshPlayGame(startGame(dirty('over')))
  })

  it('clears the live ICBM that was on screen at game over (a real reseed, not a phase flip)', async () => {
    const startGame = await loadStartGame()
    const before = dirty('over')
    expect(before.icbms.length).toBe(1) // fixture really is dirty
    expect(startGame(before).icbms).toEqual([])
  })

  it('resets the wave, score and ICBM budget to their start-of-game values', async () => {
    const startGame = await loadStartGame()
    const g = startGame(dirty('over'))
    expect(g.wave).toBe(INITIAL_WAVE)
    expect(g.score).toBe(0)
    // mc5-9: the wave-1 launch budget (waveSchedule(INITIAL_WAVE).count = 12), not NICBMS(8).
    expect(g.remaining).toBe(waveSchedule(INITIAL_WAVE).count)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — `'attract'` -> start reseeds a fresh PLAY game (future-facing: mc6-4 wires
//        the boot, but the edge is pinned now so mc6-4 inherits it working).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC2 — startGame from attract reseeds a fresh field', () => {
  it("turns an 'attract' state into a fresh, fully-defended 'play' game", async () => {
    const startGame = await loadStartGame()
    expectFreshPlayGame(startGame(dirty('attract')))
  })

  it('the fresh game is identical whether the start came from attract or from over', async () => {
    const startGame = await loadStartGame()
    // Both fixtures share createGame(1)'s rng word, so a pure reseed yields byte-
    // identical states — the start disposition must not leak the prior phase.
    expect(startGame(dirty('attract'))).toEqual(startGame(dirty('over')))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — a start action mid-game is a NO-OP. Only attract/over begin a new game;
//        a stray start in play/pause/between/setup must NOT wipe the board. This
//        is the destructive-reseed guard.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC3 — startGame changes nothing outside attract/over', () => {
  it.each(NON_START_PHASES)("startGame(%s) returns the state UNCHANGED", async (phase) => {
    const startGame = await loadStartGame()
    // A dirty mid-game state: if startGame reseeded here it would erase progress.
    const mid = dirty(phase)
    expect(startGame(mid)).toEqual(mid)
  })

  it('does not reset a LIVE, healthy play game (the common accidental-fire case)', async () => {
    const startGame = await loadStartGame()
    const live = createGame(1) // phase 'play', full board, wave 1
    const advanced: GameState = { ...live, score: 1234, wave: 3, frame: 500 }
    expect(startGame(advanced)).toEqual(advanced)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — startGame is a PURE transition: same input -> same output, no clock, no
//        entropy. (purity.test.ts scans src/core text; this pins the behaviour.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC4 — startGame is pure and deterministic', () => {
  it('returns an equal result on repeated calls with the same input', async () => {
    const startGame = await loadStartGame()
    expect(startGame(dirty('over'))).toEqual(startGame(dirty('over')))
  })

  it('does not mutate the input state in place', async () => {
    const startGame = await loadStartGame()
    const before = dirty('over')
    const snapshot = structuredClone(before)
    startGame(before)
    expect(before).toEqual(snapshot)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — "press fire to start": the shell `fireOrStart` routes a fire key to
//        startGame when not running, and delegates to fireFromKey otherwise.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC5 — fireOrStart wires "press fire to start"', () => {
  it.each(FIRE_KEYS)("a fire key ('%s') at game over starts a new game", async (key) => {
    const [fireOrStart, startGame] = await Promise.all([loadFireOrStart(), loadStartGame()])
    const over = dirty('over')
    // routes EXACTLY to startGame — not some other reseed.
    expect(fireOrStart(key, over)).toEqual(startGame(over))
    expectFreshPlayGame(fireOrStart(key, over))
  })

  it("a fire key in attract starts a new game", async () => {
    const [fireOrStart, startGame] = await Promise.all([loadFireOrStart(), loadStartGame()])
    const attract = dirty('attract')
    expect(fireOrStart('z', attract)).toEqual(startGame(attract))
  })

  it('a fire key during PLAY launches an ABM — it delegates to fireFromKey and does NOT reset the board', async () => {
    const fireOrStart = await loadFireOrStart()
    const play = createGame(1) // full magazines, phase 'play'
    // Same result as firing today: an ABM launches, ammo drops — the board is not wiped.
    expect(fireOrStart('z', play)).toEqual(fireFromKey('z', play))
    expect(fireOrStart('z', play).abms.length).toBe(1)
  })

  it('a NON-fire key at game over does nothing (only fire starts)', async () => {
    const fireOrStart = await loadFireOrStart()
    const over = dirty('over')
    // 'q' is not a fire key: delegate to fireFromKey, which is a no-op for it.
    expect(fireOrStart('q', over)).toEqual(fireFromKey('q', over))
    expect(fireOrStart('q', over).phase).toBe('over')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — CITATION DISCIPLINE: the two anchor claims this story names are committed.
//        MC-STATE-INIT (boot to SETUP/attract, W3MAIN.MAC:491) was deferred to
//        mc6-2 by mc6-1; MC-SETUP-NEWGAM (the new-game SETUP task, :583) is this
//        story's own. Byte-verification of each verbatim against the vendored
//        source is enforced by citations-source.test.ts / check-citations.mjs.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-2 AC6 — MC-STATE-INIT and MC-SETUP-NEWGAM claims are committed', () => {
  const ANCHORS = [
    { id: 'MC-STATE-INIT', file: 'W3MAIN.MAC', line: 491 }, // LDA I,S.SETU (cold start)
    { id: 'MC-SETUP-NEWGAM', file: 'W3MAIN.MAC', line: 583 }, // SETUP1: .WORD NEWGAM-1
  ] as const

  it.each(ANCHORS)('$id pins $file:$line with a committed claim', ({ file, line }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, line, line),
      `no committed claim pins ${file}:${line} — mc6-2 must file this anchor claim`,
    ).toBe(true)
  })

  it.each(ANCHORS)('$id carries the mc {id,symbol,value,meaning,source} claim shape', ({ id }) => {
    const claims = loadClaims()
    const c = claims.find((x) => x.id === id)
    expect(c, `claim ${id} is not committed`).toBeDefined()
    expect(typeof c!.symbol).toBe('string')
    expect(c!.symbol.length).toBeGreaterThan(0)
    expect(c!.meaning.length).toBeGreaterThan(0)
    expect(c!.source.file).toContain('W3MAIN.MAC')
    expect(typeof c!.source.line).toBe('number')
    expect(c!.source.verbatim.length).toBeGreaterThan(0)
  })
})
