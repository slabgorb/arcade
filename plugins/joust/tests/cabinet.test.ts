// tests/cabinet.test.ts
//
// Story jt10-2 — RED (O'Brien / TEA). The BEHAVIOUR suite for the new THIRD core
// tier: plugins/joust/src/core/cabinet.ts, a pure CabinetState { mode, game } mode
// machine that WRAPS the jt4 session (createGame / stepGame), hinged on the GOVER
// tri-state. This story pins the MACHINE only — the six modes, the GOVER-driven
// transitions, and the game-over → high-score VALUE gate. No screens, no render,
// no main.ts wiring (jt10-3..jt10-7, all depends_on jt10-2).
//
// The module surface is stated in tests/helpers/cabinet-contract.ts and loaded
// lazily per-test via loadCabinet (the tp1-8 collection trap): RED reddens with a
// clean "cabinet module not built yet" per test until Julia ships src/core/
// cabinet.ts. Each test NAMES the mutant it kills.
//
// Purity (AC-1) is proven twice: tests/purity.test.ts already sweeps EVERY
// src/core module via it.each — so cabinet.ts is caught the moment it lands — and
// the FOCUSED per-module assertions below pin the criterion by name.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCabinet } from './helpers/cabinet-contract.js'
import type { CabinetMode, CabinetState, HighScoreEntryBase } from './helpers/cabinet-contract.js'
import { createGame, stepGame, GOVER_OVER, GOVER_RUNNING, GOVER_ATTRACT } from '../src/core/game.js'
import type { GameState } from '../src/core/game.js'
import type { PlayerInput } from '../src/core/flight.js'
import { violations } from './helpers/purity-scanner.js'

const SEED = 0x1234
const flap = (dir: -1 | 0 | 1): PlayerInput => ({ dir, flap: true, flapHeld: true })

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

/** Read the not-yet-built cabinet source for the purity assertions (RED: absent → throws). */
function readCabinetSource(): string {
  const p = join(coreDir, 'cabinet.ts')
  if (!existsSync(p)) {
    throw new Error('GREEN (Julia) must create src/core/cabinet.ts — the pure cabinet mode machine (jt10-2)')
  }
  return readFileSync(p, 'utf8')
}

/** A constructed ALL-DEAD playing game: both ledgers at 0 lives, sim processes cleared,
 *  so stepGame re-settles to GOVER_OVER (the game-loop.test.ts all-out idiom). */
function deadGame(base: GameState): GameState {
  return {
    ...base,
    players: base.players.map((p) => ({ ...p, lives: 0, out: false })),
    sim: { ...base.sim, sim: { ...base.sim.sim, processes: [] }, events: [] },
  }
}

/** A gameover cabinet whose per-player scores are set to `scores` (index = ledger). */
function gameoverWithScores(base: GameState, scores: readonly number[]): CabinetState {
  const players = base.players.map((p, i) => ({ ...p, score: scores[i] ?? 0 }))
  return { mode: 'gameover', game: { ...base, players } }
}

/** A FULL (MAX_HIGH_SCORES = 10) board, descending, whose LOWEST entry is `lowest`. */
function fullTable(lowest: number): HighScoreEntryBase[] {
  return Array.from({ length: 10 }, (_, i) => ({ name: 'AAA', score: lowest + (9 - i) * 1000 }))
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 / rule — the mode SET is exactly the six lifecycle modes (compile + runtime).
// The typed record is a COMPILE-TIME exhaustiveness guard: adding or removing a
// CabinetMode member (drift) fails to typecheck here. (lang-review: prefer a union
// over a string enum; this pins the union's membership.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 the mode set — exactly six lifecycle modes, no drift', () => {
  const ALL_MODES: Record<CabinetMode, true> = {
    attract: true,
    title: true,
    select: true,
    playing: true,
    gameover: true,
    highscore: true,
  }

  it('CabinetMode has exactly the six named members (compile-time record + runtime count)', () => {
    // Kills "a mode was dropped" / "an extra mode crept in": a drift breaks the
    // typed record's compile, and the count catches a runtime-only mismatch.
    expect(Object.keys(ALL_MODES).sort()).toEqual(
      ['attract', 'gameover', 'highscore', 'playing', 'select', 'title'].sort(),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the GOVER hinge as a pure map. Restrictive mutation coverage: the three
// rungs map to THREE DISTINCT modes, and GOVER_OVER is NOT 'playing'/'attract'.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 modeForGover — the GOVER hinge (attract / playing / gameover)', () => {
  it('maps each of the three GOVER rungs to its cabinet mode', async () => {
    const c = await loadCabinet()
    // Kills "the hinge collapses two rungs" / "wrong rung→mode wiring".
    expect(c.modeForGover(c.GOVER_ATTRACT), '$7F → attract').toBe('attract')
    expect(c.modeForGover(c.GOVER_RUNNING), '-1 → playing').toBe('playing')
    expect(c.modeForGover(c.GOVER_OVER), '0 → gameover').toBe('gameover')
  })

  it('re-exports game.ts’s own GOVER_* constants (not a private re-definition)', async () => {
    const c = await loadCabinet()
    // Kills "cabinet invents its own GOVER values that drift from game.ts".
    expect(c.GOVER_OVER, 'over = 0').toBe(GOVER_OVER)
    expect(c.GOVER_RUNNING, 'running = -1').toBe(GOVER_RUNNING)
    expect(c.GOVER_ATTRACT, 'attract = $7F').toBe(GOVER_ATTRACT)
  })

  it('the three rungs produce three DISTINCT modes (kills a permissive all-to-one mutant)', async () => {
    const c = await loadCabinet()
    const modes = [c.modeForGover(c.GOVER_ATTRACT), c.modeForGover(c.GOVER_RUNNING), c.modeForGover(c.GOVER_OVER)]
    expect(new Set(modes).size, 'attract/playing/gameover are three different modes').toBe(3)
    // Restrictive (mutation-direction): GOVER_OVER must be gameover, never the others.
    expect(c.modeForGover(c.GOVER_OVER), 'all-out is NOT still playing').not.toBe('playing')
    expect(c.modeForGover(c.GOVER_OVER), 'all-out is NOT attract').not.toBe('attract')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — CabinetState wraps the session; `mode` is the only new field.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 CabinetState wraps the session', () => {
  it('createCabinet boots mode attract wrapping a fresh session game', async () => {
    const c = await loadCabinet()
    const cab = c.createCabinet(SEED)
    // Kills "boots into playing/title" and "does not wrap a real GameState".
    expect(cab.mode, 'a cabinet boots into attract').toBe('attract')
    expect(cab.game.players.length, 'wraps a real 2-player session').toBe(2)
    expect(typeof cab.game.gover, 'the wrapped game carries the session gover').toBe('number')
    expect(cab.game.sim, 'the wrapped game carries the sim').toBeDefined()
  })

  it('the state has EXACTLY { mode, game } — mode is the only new field (AC-2)', async () => {
    const c = await loadCabinet()
    const cab = c.createCabinet(SEED)
    // Kills "the cabinet duplicates score/lives up at the top tier" — every session
    // fact must live in the wrapped `game`, not beside it.
    expect(Object.keys(cab).sort(), 'CabinetState is { game, mode } only').toEqual(['game', 'mode'])
  })

  it('createCabinet is deterministic — same seed, identical CabinetState', async () => {
    const c = await loadCabinet()
    expect(c.createCabinet(SEED)).toEqual(c.createCabinet(SEED))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — the session wrapping is REUSE, not a rebuild: the wrapped game is
// bit-identical to a raw createGame / stepGame (the one-sim seam, one tier up).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 the wrapped session is untouched — cabinet delegates, never rebuilds', () => {
  it('createCabinet(seed).game equals createGame(seed) (no re-derivation)', async () => {
    const c = await loadCabinet()
    // Kills "the cabinet re-implements or mutates the session on boot".
    expect(c.createCabinet(SEED).game).toEqual(createGame(SEED))
  })

  it('startPlaying wraps a FRESH createGame at GOVER_RUNNING', async () => {
    const c = await loadCabinet()
    const cab = c.startPlaying(c.createCabinet(SEED), 0xbeef, 2)
    expect(cab.mode, 'select → playing').toBe('playing')
    expect(cab.game.gover, 'a started game is RUNNING').toBe(GOVER_RUNNING)
    expect(cab.game, 'the started game is a fresh createGame(seed)').toEqual(createGame(0xbeef, 2))
  })

  it('stepPlaying delegates ALL stepping to stepGame — the wrapped game stays bit-identical', async () => {
    const c = await loadCabinet()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    let cab = c.startPlaying(c.createCabinet(SEED), SEED, 2)
    let raw = createGame(SEED, 2)
    for (let i = 0; i < 30; i++) {
      cab = c.stepPlaying(cab, input)
      raw = stepGame(raw, input)
      // A divergent second stepping path in the cabinet would drift from raw stepGame.
      expect(cab.game, `frame ${i}: cabinet wraps stepGame, no second path`).toEqual(raw)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4/AC-6 — stepPlaying re-derives the mode from the settled GOVER each frame.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-6 stepPlaying re-derives mode from the stepped GOVER', () => {
  it('a running game keeps mode playing; mode always equals modeForGover(game.gover)', async () => {
    const c = await loadCabinet()
    const cab0 = c.startPlaying(c.createCabinet(SEED), SEED, 2)
    const cab1 = c.stepPlaying(cab0, { 1: flap(-1), 2: flap(1) })
    // Kills "mode is cached and never re-derived" — a lone running frame stays playing.
    expect(cab1.game.gover, 'the game is still running').toBe(GOVER_RUNNING)
    expect(cab1.mode, 'still playing while running').toBe('playing')
    expect(cab1.mode, 'mode is the pure image of the settled gover').toBe(c.modeForGover(cab1.game.gover))
  })

  it('when EVERY player is out the stepped cabinet lands in gameover', async () => {
    const c = await loadCabinet()
    const playingDead: CabinetState = { mode: 'playing', game: deadGame(createGame(SEED, 2)) }
    const stepped = c.stepPlaying(playingDead)
    // Kills "stepPlaying stays playing forever" / "mode carried forward, never recomputed".
    expect(stepped.game.gover, 'all out → the wrapped game is OVER').toBe(GOVER_OVER)
    expect(stepped.mode, 'all out → the cabinet is in gameover').toBe('gameover')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the game-over → high-score gate is a VALUE check (qualifiesForHighScore),
// on the BEST player score. Synthetic tables + asymmetric co-op scores catch a
// lexical/first-player/min mis-derivation (derived-vs-transcribed synthetic input).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 afterGameOver — highscore iff the score qualifies, else attract', () => {
  it('a score that STRICTLY beats a full board’s lowest → highscore', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [6000, 0])
    // full board lowest = 5000; 6000 > 5000 qualifies.
    expect(c.afterGameOver(cab, fullTable(5000)).mode, '6000 beats 5000 → enter initials').toBe('highscore')
  })

  it('a score BELOW a full board’s lowest → attract (no entry)', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [4000, 0])
    expect(c.afterGameOver(cab, fullTable(5000)).mode, '4000 < 5000 → back to attract').toBe('attract')
  })

  it('a TIE with the lowest does NOT qualify (strict beat) → attract', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [5000, 0])
    // Pins the VALUE semantics: qualifiesForHighScore needs score > lowest, not >=.
    expect(c.afterGameOver(cab, fullTable(5000)).mode, 'a tie is not a beat → attract').toBe('attract')
  })

  it('any positive score qualifies while the board has open slots (empty table)', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [100, 0])
    expect(c.afterGameOver(cab, []).mode, 'open board takes any positive → highscore').toBe('highscore')
  })

  it('a zero score never qualifies, even on an empty board → attract', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [0, 0])
    // Kills "qualifies ignores the non-positive rule" — a game that scored nothing
    // must not open initials entry.
    expect(c.afterGameOver(cab, []).mode, 'score 0 → attract').toBe('attract')
  })

  it('co-op: the BEST player’s score is what qualifies (not P1-only, not the min)', async () => {
    const c = await loadCabinet()
    // P1 below, P2 above the full board's lowest. A P1-only or min derivation → attract (wrong).
    const cab = gameoverWithScores(createGame(SEED, 2), [4000, 6000])
    expect(c.afterGameOver(cab, fullTable(5000)).mode, 'P2’s 6000 qualifies the team → highscore').toBe(
      'highscore',
    )
  })

  it('afterGameOver mutates neither the state nor the table (pure)', async () => {
    const c = await loadCabinet()
    const cab = gameoverWithScores(createGame(SEED, 2), [6000, 0])
    const table = fullTable(5000)
    const cabBefore = JSON.stringify(cab)
    const tableBefore = JSON.stringify(table)
    c.afterGameOver(cab, table)
    expect(JSON.stringify(cab), 'the cabinet state is not mutated').toBe(cabBefore)
    expect(JSON.stringify(table), 'the score table is not mutated').toBe(tableBefore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — every one of the six modes is reachable via at least one transition path.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 reachability — all six modes reached by transitions', () => {
  it('attract → title → select → playing → gameover → highscore → attract', async () => {
    const c = await loadCabinet()
    const reached = new Set<CabinetMode>()

    const attract = c.createCabinet(SEED)
    reached.add(attract.mode) // attract

    const title = c.toTitle(attract)
    reached.add(title.mode) // title
    expect(title.mode, 'attract → title').toBe('title')

    const select = c.toSelect(title)
    reached.add(select.mode) // select
    expect(select.mode, 'title → select').toBe('select')

    const playing = c.startPlaying(select, SEED, 2)
    reached.add(playing.mode) // playing
    expect(playing.mode, 'select → playing').toBe('playing')

    const gameover = c.stepPlaying({ mode: 'playing', game: deadGame(createGame(SEED, 2)) })
    reached.add(gameover.mode) // gameover
    expect(gameover.mode, 'all-out playing → gameover').toBe('gameover')

    const highscore = c.afterGameOver(gameoverWithScores(createGame(SEED, 2), [6000, 0]), fullTable(5000))
    reached.add(highscore.mode) // highscore
    expect(highscore.mode, 'qualifying gameover → highscore').toBe('highscore')

    const backToAttract = c.toAttract(highscore, SEED, 2)
    reached.add(backToAttract.mode) // attract (return edge)
    expect(backToAttract.mode, 'highscore → attract (return edge)').toBe('attract')

    expect(reached, 'all six lifecycle modes are reachable').toEqual(
      new Set<CabinetMode>(['attract', 'title', 'select', 'playing', 'gameover', 'highscore']),
    )
  })

  it('toAttract starts a FRESH attract cycle (a new createGame), not the old over-game', async () => {
    const c = await loadCabinet()
    const over: CabinetState = { mode: 'gameover', game: deadGame(createGame(SEED, 2)) }
    const attract = c.toAttract(over, SEED, 2)
    // Kills "toAttract just relabels the dead game" — a new attract cycle wraps a fresh game.
    expect(attract.mode).toBe('attract')
    expect(attract.game, 'a fresh createGame, not the all-dead one').toEqual(createGame(SEED, 2))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — cabinet.ts is pure core (the jt1-7 boundary scanner), imports no shell.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 cabinet.ts is pure core', () => {
  it('passes the jt1-7 boundary scanner (no clock, entropy, browser surface, shell import)', () => {
    const hits = violations(readCabinetSource(), 'cabinet.ts')
    expect(hits, `cabinet.ts tripped the purity scanner: ${hits.join(', ')}`).toEqual([])
  })

  it('names neither "window." nor "document." anywhere (the scanner reads comments)', () => {
    const src = readCabinetSource()
    expect(src.includes('window.'), 'cabinet.ts must not name window.').toBe(false)
    expect(src.includes('document.'), 'cabinet.ts must not name document.').toBe(false)
  })

  it('imports no shell module (but MAY reuse @shared — highscore/qualifies is pure)', () => {
    const src = readCabinetSource()
    expect(src, 'cabinet.ts must not import from shell/').not.toMatch(/\bfrom\s+['"][^'"]*shell/i)
    expect(src, 'cabinet.ts must not require()').not.toMatch(/\brequire\s*\(/)
  })

  it('the scanner is not vacuous — a live Date.now() is still caught', () => {
    // The control the purity suite itself uses: guard against a harness reporting [] for all.
    expect(violations('export const x = Date.now()', 'probe.ts').length).toBeGreaterThan(0)
  })
})
