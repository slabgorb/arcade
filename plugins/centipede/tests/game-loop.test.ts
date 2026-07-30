// tests/game-loop.test.ts
//
// Story cp4-5 — RED phase (O'Brien / TEA). The outer game loop the sim only
// half-has: today `createSim` boots STRAIGHT into play, `gameOver` latches on
// the last-life death, and `stepSim` freezes forever after it — there is no
// start gate, no attract state, and no way back. This suite pins the explicit
// state machine transcribed from the ROM's MODE flag + life-exhaustion flow:
//
//   ┌──────────┐  start   ┌─────────┐  last-life death   ┌──────────┐
//   │ attract  │ ───────▶ │ playing │ ─────────────────▶ │ gameover │
//   └──────────┘          └─────────┘                    └──────────┘
//        ▲                                                     │
//        └──────────────────  (start = restart)  ◀────────────┘
//
// GROUND TRUTH — rev-4 CENTI4.MAC (vendored tree; the citation gate's numbering):
//   • MODE is the attract/play flag. INIT (:1162 "INITIALIZE EVERYTHING") seeds a
//     fresh world; power-on leaves MODE=-1 (attract), and the START button does
//     ":852 INC MODE ;NOW IN PLAY MODE" after ":849-851 LDX NLIVES / DEX / STX
//     LIVES". The 1-player start read is ":833 LDA START1 / :835 LSR / :836 BCS
//     ;IF 1 PLAYER GAME NOT STARTED" — an active START1 begins the game.
//   • Game over is ":624 LDA LIVES / :625 ORA LIVES+1 / :626 BNE ;IF GAME NOT
//     OVER" → both zero → ":627 DEC MODE" (back to attract) + UPDATE high score.
//
// ─── WHAT THIS SUITE PROVES (and what it deliberately does NOT) ──────────────
// The clone models the machine with an explicit `SimState.phase`
// ('attract' | 'playing' | 'gameover'). `createSim(seed)` KEEPS phase 'playing'
// (every prior suite depends on it); a new `createAttract(seed)` enters attract;
// the pre-existing `gameOver` boolean is KEPT as a maintained mirror of
// `phase === 'gameover'` (8 prior assertions read it — see the session Design
// Deviations). The start/restart signal rides an OPTIONAL `InputCounts.start`
// so none of the 61 existing `{ dh, dv, fire }` literals break.
//
// The attract auto-demo (ATTRT), high-score save + initials (GETINT), and the
// bonus-life thresholds (BONUSL/BONUSM) are OUT of scope — cp4-7, cp4-6, cp4-4.
// cp4-5 only makes the STATES those stories hook into real and reachable.
//
// ─── WHY THIS IS RED ────────────────────────────────────────────────────────
// `createAttract`, the `phase` field, and `InputCounts.start` do not exist yet.
// The new-surface helpers below throw a self-describing "not implemented" so the
// file reddens for the FEATURE, not a bare `undefined is not a function`.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSim, stepSim, cloneState, STARTING_LIVES, type SimState } from '../src/core/sim'
import type { Segment } from '../src/core/centipede'
import type { InputCounts } from '../src/core/player'
import { createKeyboardAdapter } from '../src/shell/input'

const DEAD_BIT = 0x80 // CT-71 — bit 7 marks an exploding/vacant slot (death-restor idiom)

// ─── the new cp4-5 surface, read defensively so RED is self-describing ───────
type GamePhase = 'attract' | 'playing' | 'gameover'
type SimWithPhase = SimState & {
  phase: GamePhase
  gameOver: boolean
  lives: number
  wave: number
  score: number
  frame: number
  segs: Segment[]
}
const ext = (s: SimState): SimWithPhase => s as SimWithPhase

// `createAttract` is added by cp4-5 GREEN. Until then the named import is
// undefined; this guard turns that into a clear failure message rather than a
// cryptic TypeError, and keeps every test in the file honest about *why* it reds.
// A single cast to a shape whose only member is OPTIONAL — the module type is
// assignable to it (createAttract simply absent until GREEN), so this needs no
// `any`/`unknown` double-cast. Once cp4-5 adds the export this can become a
// plain `import { createAttract }`; the throw-branch then goes dead.
import * as simModule from '../src/core/sim'
function createAttract(seed: number): SimState {
  const fn = (simModule as { createAttract?: (s: number) => SimState }).createAttract
  if (typeof fn !== 'function') {
    throw new Error('cp4-5 not implemented yet: src/core/sim.ts must export createAttract(seed): SimState (phase "attract")')
  }
  return fn(seed)
}

// Inputs carry an OPTIONAL start signal (cp4-5 widens InputCounts). Typed here so
// the file is internally consistent before the widening lands.
type Input = InputCounts & { start?: boolean }
const IDLE: Input = { dh: 0, dv: 0, fire: false }
const START: Input = { dh: 0, dv: 0, fire: false, start: true }

/** A live head sitting exactly on the gun — forces a death next frame
 *  (the death-restor.test.ts idiom). */
function segOnGun(s: SimState): Segment {
  return { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }
}

/** Drive a one-life sim into the real, latched game-over state (not a
 *  hand-built one): put a head on the gun and step until the machine reports
 *  game over. Returns the game-over state. */
function driveToGameOver(seed: number): SimWithPhase {
  let s = ext({ ...createSim(seed), lives: 1 } as SimState)
  s = ext({ ...s, segs: [segOnGun(s)] } as SimState)
  for (let i = 0; i < 4000; i++) {
    s = ext(stepSim(s, IDLE))
    if (s.gameOver) return s
  }
  throw new Error('test setup failed: never reached game over within the frame budget')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — an explicit game-state machine (attract / playing / gameover)
// ─────────────────────────────────────────────────────────────────────────────
describe('cp4-5 AC-1 — explicit phase state machine (CENTI4.MAC MODE, :852/:627)', () => {
  it('createSim boots in the PLAYING phase (a started game — the prior contract holds)', () => {
    const s = ext(createSim(0x1234))
    expect(s.phase, 'createSim is the started-game constructor: phase "playing"').toBe('playing')
    expect(s.gameOver, 'a freshly started game is not over').toBe(false)
  })

  it('createAttract boots in the ATTRACT phase with a fresh, un-started world', () => {
    const s = ext(createAttract(0x1234))
    expect(s.phase, 'createAttract enters attract (ROM power-on MODE=-1)').toBe('attract')
    expect(s.gameOver, 'attract is not game over').toBe(false)
    expect(s.lives, 'attract carries a full life count, ready to start').toBe(STARTING_LIVES)
    expect(s.wave, 'attract is poised on wave 1').toBe(1)
    expect(s.segs.length, 'attract seeds the wave-1 train (INIT :1194 CENTPC)').toBe(12)
  })

  it('phase is one of exactly the three machine states — never undefined', () => {
    for (const s of [createSim(0x22), createAttract(0x22), driveToGameOver(0x99)]) {
      expect(['attract', 'playing', 'gameover'], `phase "${ext(s).phase}" is a real machine state`).toContain(
        ext(s).phase,
      )
    }
  })

  it('INVARIANT: gameOver mirrors phase exactly — the two observables never drift', () => {
    // The kept `gameOver` boolean is a maintained mirror of phase==='gameover'
    // (session Design Deviation). Prove it holds in every reachable state.
    const attract = ext(createAttract(0x31))
    const playing = ext(createSim(0x31))
    const over = driveToGameOver(0x31)
    for (const s of [attract, playing, over]) {
      expect(s.gameOver, `gameOver mirrors (phase==='gameover') for phase "${s.phase}"`).toBe(s.phase === 'gameover')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — game-over is a reachable, observable state
// ─────────────────────────────────────────────────────────────────────────────
describe('cp4-5 AC-4 — game-over is reachable and observable (:624-627)', () => {
  it('losing the last life lands in the gameover phase (LIVES==0 → DEC MODE)', () => {
    const over = driveToGameOver(0x4444)
    expect(over.phase, 'last-life death → phase "gameover"').toBe('gameover')
    expect(over.gameOver, 'and the mirror agrees').toBe(true)
    expect(over.lives, 'no lives remain').toBeLessThanOrEqual(0)
  })

  it('game-over WAITS for a restart — an idle step does not spontaneously leave it', () => {
    const over = driveToGameOver(0x4545)
    const next = ext(stepSim(over, IDLE))
    expect(next.phase, 'no start input → stays in gameover (awaits restart)').toBe('gameover')
    expect(next.gameOver, 'still over without a restart').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — input drives the start and restart transitions
// ─────────────────────────────────────────────────────────────────────────────
describe('cp4-5 AC-3 — input starts and restarts the game (START1 :833-852)', () => {
  it('attract + start → playing (the ROM INC MODE :852)', () => {
    const started = ext(stepSim(createAttract(0x7000), START))
    expect(started.phase, 'pressing start leaves attract for play').toBe('playing')
    expect(started.gameOver, 'a just-started game is live').toBe(false)
    expect(started.lives, 'start deals a full life count').toBe(STARTING_LIVES)
    expect(started.wave, 'start begins on wave 1').toBe(1)
    expect(started.score, 'a fresh game scores from 0').toBe(0)
    expect(started.frame, 'the started game begins at frame 0 (INIT reseeds, THEN the loop runs)').toBe(0)
    expect(started.segs.length, 'start lays the full wave-1 train').toBe(12)
    expect(
      started.segs.every((seg) => (seg.pic & DEAD_BIT) === 0),
      'the started train is all live — not a leftover exploding one',
    ).toBe(true)
  })

  it('attract WITHOUT start holds — no accidental start', () => {
    const held = ext(stepSim(createAttract(0x7001), IDLE))
    expect(held.phase, 'no start input → stays in attract').toBe('attract')
    expect(held.gameOver, 'still not a game').toBe(false)
  })

  it('gameover + start → a fresh playing game (restart)', () => {
    const over = driveToGameOver(0x7002)
    const restarted = ext(stepSim(over, START))
    expect(restarted.phase, 'start from game-over restarts into play').toBe('playing')
    expect(restarted.gameOver, 'the restarted game is live again').toBe(false)
    expect(restarted.lives, 'restart restores full lives').toBe(STARTING_LIVES)
    expect(restarted.wave, 'restart re-enters wave 1').toBe(1)
    expect(restarted.score, 'restart zeroes the score').toBe(0)
    expect(restarted.segs.length, 'restart lays the full wave-1 train').toBe(12)
    expect(restarted.segs.every((seg) => (seg.pic & DEAD_BIT) === 0), 'the restarted train is all live').toBe(true)
  })

  it('start during PLAY is ignored — a live game is never reset out from under the player', () => {
    // Advance a live game a few frames so its frame counter is clearly non-zero,
    // then jam start: a correct machine ignores it (start only gates attract /
    // gameover), so the same game keeps stepping — it does NOT snap back to frame 0.
    let s = ext(createSim(0x7003))
    for (let i = 0; i < 25; i++) s = ext(stepSim(s, IDLE))
    const frameBefore = s.frame
    expect(frameBefore, 'the game actually advanced before we test the guard').toBeGreaterThan(0)
    const after = ext(stepSim(s, START))
    expect(after.phase, 'still playing').toBe('playing')
    expect(after.frame, 'start mid-game did NOT reseed — the frame counter kept climbing').toBe(frameBefore + 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the reseed is a fresh, deterministic sim (no Date.now/Math.random)
// ─────────────────────────────────────────────────────────────────────────────
describe('cp4-5 AC-2 — INIT/RESET reseeds a fresh deterministic sim (INIT :1162)', () => {
  it('restart REBUILDS the world — it does not carry the dead game forward', () => {
    // Mangle the game-over state into something a seeded fresh game could never
    // be (an all-0xFF playfield, a fat score, zero lives). A real INIT reseed
    // throws all of it away; a lazy "just flip the flag" restart would not.
    const over = driveToGameOver(0x8000)
    const mangled = ext({
      ...over,
      playfield: { cells: new Uint8Array(over.playfield.cells).fill(0xff), mush: over.playfield.mush },
      score: 12345,
      lives: 0,
    } as SimState)

    const restarted = ext(stepSim(mangled, START))
    expect(restarted.score, 'the fat score is wiped').toBe(0)
    expect(restarted.lives, 'lives are dealt fresh').toBe(STARTING_LIVES)
    expect(
      restarted.playfield.cells.every((c) => c === 0xff),
      'the playfield was RESEEDED, not carried over (not the mangled all-0xFF field)',
    ).toBe(false)
  })

  it('the reseed is deterministic — identical states + start → deep-equal games (no wall clock)', () => {
    // Two independent attract states from the same seed, each started, must be
    // byte-for-byte identical. If the reseed reached for Date.now/Math.random
    // this would flake; determinism IS the behavioural proof of purity
    // (the source-text guard lives in tests/purity.test.ts).
    const a = stepSim(createAttract(0x8181), START)
    const b = stepSim(createAttract(0x8181), START)
    expect(a, 'same seed + start → identical fresh game').toEqual(b)
  })

  it('a restart is deterministic too — same game-over state → identical restarts', () => {
    const over = driveToGameOver(0x8282)
    const a = stepSim(cloneState(over), START)
    const b = stepSim(cloneState(over), START)
    expect(a, 'restarting the same game-over state twice yields identical games').toEqual(b)
  })

  it('a started game replays identically through a scripted run (end-to-end determinism)', () => {
    const script: Input[] = [
      { dh: 5, dv: 2, fire: true },
      { dh: -3, dv: 0, fire: false },
      { dh: 8, dv: -8, fire: true },
      { dh: 0, dv: 0, fire: true },
    ]
    const playFromAttract = (): SimState => {
      let s = stepSim(createAttract(0x8383), START) // attract → playing
      for (const inp of script) s = stepSim(s, inp)
      return s
    }
    expect(playFromAttract(), 'the whole attract→start→play path is deterministic').toEqual(playFromAttract())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 (shell) — the keyboard port of the ROM's START1 condition
// ─────────────────────────────────────────────────────────────────────────────
type Handler = (e: Record<string, unknown>) => void
interface Bus {
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
  emit(type: string, event?: Record<string, unknown>): void
}
function makeBus(): Bus {
  const handlers: Record<string, Handler[]> = {}
  return {
    addEventListener(type, cb) {
      ;(handlers[type] ||= []).push(cb)
    },
    removeEventListener(type, cb) {
      const list = handlers[type]
      if (!list) return
      const i = list.indexOf(cb)
      if (i !== -1) list.splice(i, 1)
    },
    emit(type, event = {}) {
      const e = { preventDefault() {}, ...event }
      ;(handlers[type] || []).forEach((cb) => cb(e))
    },
  }
}

describe('cp4-5 AC-3 (shell) — the keyboard start key ports START1', () => {
  it('the Enter key raises InputCounts.start; releasing it lowers it', () => {
    const bus = makeBus()
    const kbd = createKeyboardAdapter(bus)

    expect((kbd.sample() as Input).start ?? false, 'no key held → not starting').toBe(false)

    bus.emit('keydown', { key: 'Enter' })
    expect((kbd.sample() as Input).start, 'Enter held → start signal (ports the START1 press)').toBe(true)

    bus.emit('keyup', { key: 'Enter' })
    expect((kbd.sample() as Input).start ?? false, 'Enter released → start clears').toBe(false)
  })

  it('a plain movement key does NOT raise start (the gun does not begin the game)', () => {
    const bus = makeBus()
    const kbd = createKeyboardAdapter(bus)
    bus.emit('keydown', { key: 'ArrowLeft' })
    expect((kbd.sample() as Input).start ?? false, 'moving the gun is not a start').toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 (shell wiring) — main.ts boots attract and threads the start signal.
// A `?raw` source-read: main.ts touches canvas/rAF/window, none of which exist
// in the node env — the reviewer-blessed cp1-6/tp1-39 idiom.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp4-5 AC-3 (shell wiring) — main.ts boots attract + threads start (source-read)', () => {
  const mainSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'main.ts'), 'utf8')
  const code = mainSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  it('the initial sim is an ATTRACT state, not a straight-into-play createSim', () => {
    expect(code, 'main.ts must boot the loop into attract (createAttract), so the game waits for a start').toMatch(
      /createAttract\s*\(/,
    )
  })

  it('the per-step input threads the keyboard start signal into stepSim', () => {
    expect(code, 'main.ts must forward `start` from the sampled input into the sim step').toMatch(/\bstart\b/)
  })
})
