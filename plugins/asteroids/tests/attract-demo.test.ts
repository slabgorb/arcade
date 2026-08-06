// tests/attract-demo.test.ts
//
// Story ad1-3 — the asteroids self-play attract demo. The lobby showcase
// carousel (uf1-6) frames each game's LIVE attract mode, so a machine that
// shows a drifting rock field with NO ship contributes an empty screen instead
// of gameplay. Before ad1-3 asteroids' attract branch was exactly that: rocks
// drift, everything else inert (the A-16 contract, tests/modes.test.ts). This
// story puts a ship in that field and lets it PLAY itself — mirroring tempest's
// `demoActive` self-play (tempest story 10-3), which runs the normal play
// pipeline on a synthetic controller's input while the mode stays 'attract'.
//
// These tests pin the CONTRACT at the observable core-state level (through
// stepGame), not a specific controller module or heuristic, so Dev is free to
// shape the "brain" however the ROM/feel demands — the tests only require that
// (1) the ship self-plays (maneuvers AND fires) with no player input, (2) that
// self-play READS THE BOARD (a different rock field yields different play — the
// non-vacuity control per the "feature must be observed in play" rule), (3) the
// demo is autonomous (held player buttons do not drive it) and never auto-starts
// a real game, and (4) the whole thing is deterministic. AC4 (the manifest
// `showcase: true` opt-in) is pinned in src/host/registry.test.ts.

import { describe, it, expect } from 'vitest'
import { stepGame } from '../src/core/sim'
import { initialState, WORLD_W, WORLD_H, type GameState, type Rock } from '../src/core/state'
import { NO_INPUT, type Input } from '../src/core/input'

const DT = 1 / 60
const CX = WORLD_W / 2
const CY = WORLD_H / 2

// Every gameplay control held at once, start deliberately OFF — the demo owns
// the ship, so a masher at the attract screen must not hijack it.
const MASHED: Input = {
  left: true,
  right: true,
  thrust: true,
  fire: true,
  hyperspace: true,
  start: false,
}
const START: Input = { ...NO_INPUT, start: true }

function rock(x: number, y: number): Rock {
  return { pos: { x, y }, velocity: { x: 0, y: 0 }, size: 'large', shapeVariant: 0 }
}

/** An attract-mode state with four large rocks parked around the ship at a
 * moderate remove (no instant collision), so the self-play demo has obvious,
 * DETERMINISTIC targets to steer toward and shoot. */
function attractField(seed = 1979): GameState {
  return {
    ...initialState(seed),
    mode: 'attract',
    rocks: [rock(CX + 1500, CY), rock(CX - 1500, CY), rock(CX, CY + 1500), rock(CX, CY - 1500)],
  }
}

/** Attract with a single large rock parked `dx,dy` off the ship — the board the
 * control test varies to prove the demo reads the field rather than replaying a
 * fixed script. */
function attractOneRock(dx: number, dy: number, seed = 1979): GameState {
  return { ...initialState(seed), mode: 'attract', rocks: [rock(CX + dx, CY + dy)] }
}

/** Run `frames` steps of stepGame feeding `input` every frame, returning the
 * per-frame trajectory (a fingerprint of ship + bullets + mode) plus the final
 * state. Positions/velocities are rounded so float dust never forces a spurious
 * inequality in the board-reactivity control. */
function play(s0: GameState, frames: number, input: Input = NO_INPUT) {
  let s = s0
  const trace: string[] = []
  const modes: GameState['mode'][] = []
  let sawPlayerBullet = false
  let maneuvered = false
  const dir0 = s0.ship.dir
  for (let i = 0; i < frames; i++) {
    s = stepGame(s, input, DT)
    modes.push(s.mode)
    if (s.bullets.some((b) => b.owner === 'player')) sawPlayerBullet = true
    if (s.ship.dir !== dir0 || s.ship.vel.x !== 0 || s.ship.vel.y !== 0) maneuvered = true
    trace.push(
      [
        s.ship.dir,
        Math.round(s.ship.pos.x),
        Math.round(s.ship.pos.y),
        Math.round(s.ship.vel.x),
        Math.round(s.ship.vel.y),
        s.bullets.length,
      ].join(','),
    )
  }
  return { final: s, trace, modes, sawPlayerBullet, maneuvered }
}

// ---- AC1: the ship self-plays ------------------------------------------------

describe('ad1-3 attract self-play — the ship plays itself', () => {
  it('fires AND maneuvers over a 10s attract window with no player input', () => {
    // The A-16 attract branch leaves the ship frozen at center and never fires;
    // this is the RED that the self-play demo turns green. 10s is generous slack
    // for any sane fire cadence — a self-play asteroids demo that neither moves
    // nor shoots in ten seconds is not demoing the game.
    const r = play(attractField(), 600)
    expect(r.sawPlayerBullet).toBe(true) // the demo shoots the rock field
    expect(r.maneuvered).toBe(true) // and it steers (rotate and/or thrust)
  })

  it('never auto-starts a real game — mode stays out of "playing" without a start press', () => {
    const r = play(attractField(), 600)
    expect(r.modes).not.toContain('playing')
  })
})

// ---- AC2: the self-play READS THE BOARD (non-vacuity control) -----------------

describe('ad1-3 attract self-play — board reactivity (not a fixed script)', () => {
  it('produces different play for a rock on the right vs a rock on the left', () => {
    // A demo that ignores the board (constant input, or a canned trajectory)
    // yields byte-identical play for both boards — this asserts it does NOT.
    // Before ad1-3 both traces are the frozen-ship trace and ARE identical, so
    // this fails RED; a board-reading brain aims opposite ways and diverges.
    const right = play(attractOneRock(2000, 0), 300)
    const left = play(attractOneRock(-2000, 0), 300)
    expect(right.trace).not.toEqual(left.trace)
    // Guard the guard: each board is genuinely a LIVE demo, not two dead ships
    // that happen to differ for some unrelated reason.
    expect(right.maneuvered).toBe(true)
    expect(left.maneuvered).toBe(true)
  })
})

// ---- AC3: autonomy + the opt-in is preserved ---------------------------------

describe('ad1-3 attract self-play — autonomy and the start opt-in', () => {
  it('ignores held player gameplay buttons: MASHED plays identically to NO_INPUT', () => {
    // The demo owns the ship; left/right/thrust/fire/hyperspace held at the
    // attract screen must not steer it. (start is excluded — that is the opt-in,
    // tested below.) Deep-equal on the full run pins autonomy without pinning
    // any particular trajectory.
    const auto = play(attractField(), 120, NO_INPUT)
    const mashed = play(attractField(), 120, MASHED)
    expect(mashed.final).toEqual(auto.final)
    expect(mashed.trace).toEqual(auto.trace)
  })

  it('a start press still hands the cabinet to the player mid-demo', () => {
    // Run the demo a while (so a naive impl that routes `start` through the demo
    // controller has every chance to swallow it), THEN press start: a clean,
    // fresh playing game must begin. This is the opt-in the epic requires.
    let s = attractField()
    for (let i = 0; i < 90; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.mode).toBe('attract') // still demoing
    const started = stepGame(s, START, DT)
    expect(started.mode).toBe('playing')
    expect(started.score).toBe(0)
    expect(started.lives).toBeGreaterThanOrEqual(1)
    expect(started.rocks).toEqual([]) // fresh field — the wave director owns respawn
    expect(started.bullets).toEqual([]) // the demo's shots do not carry into the player's game
    expect(started.gameOver).toBeNull()
  })
})

// ---- determinism (the demo is a pure function of state, dt) -------------------

describe('ad1-3 attract self-play — determinism', () => {
  it('is byte-identical across two independent runs from the same seed', () => {
    const a = play(attractField(2026), 300)
    const b = play(attractField(2026), 300)
    expect(a.trace).toEqual(b.trace)
    expect(a.final).toEqual(b.final)
    // Not vacuously deterministic because nothing happens — it genuinely played.
    expect(a.sawPlayerBullet).toBe(true)
  })
})
