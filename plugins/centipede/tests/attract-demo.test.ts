// tests/attract-demo.test.ts
//
// Story cp4-7 — RED phase (Han Solo / TEA). Attract mode: the self-playing
// ATTRT demo (CENTI4.MAC:158 "ATTRACT-MODE GAMEPLAY") plus the copyright message
// and the "BONUS LIFE EVERY XXXX" panel. This is the epic-closing story — it ties
// the outer loop shut so the cabinet plays itself until a coin drops.
//
// cp4-5 built the phase machine (attract | playing | gameover) and `createAttract`,
// but it left attract INERT on purpose: stepPhase's attract branch calls
// stepEntryTimeout, which is a no-op for a non-gameover phase, so today attract
// HOLDS — the frame never advances, the gun never moves, nothing ever fires
// (src/core/sim.ts:702-704). Every behavioural assertion below is therefore RED:
// the demo does not yet play.
//
// GROUND TRUTH (cite the dossier + claims, never re-derive):
//   • ATTRT is REAL gameplay, not a static screen — it steers PLAYH and reverses
//     its travel at the two extremes it compares against (:188-195
//     "CMP I,1C ... CMP I,0E4"), fires via RSHOT1, and reads a screen tile.
//   • In attract the life-exhaustion check is SKIPPED (:615 "BPL 55$ ;IF IN
//     ATTRACT DO NOT CHECK LIVES", claims LOOP-6) — the demo is immortal and
//     loops forever, never falling to game-over on its own.
//   • START1 drops attract into a fresh live game (:852 "INC MODE ;NOW IN PLAY
//     MODE", claims LOOP-5) — the existing createSim reseed.
//   • The copyright is the "1980 ATARI" line (CENTI4.MAC:12); the bonus panel is
//     "BONUS LIFE EVERY XXXX" (:225) showing the hardcoded-default increment
//     BONUSV[0] = 10000 (bonus.ts BONUS_INCREMENT).
//
// The demo driver MUST stay deterministic — seeded rng only, no Date.now /
// Math.random (the standing src/core purity sweep in tests/purity.test.ts is the
// guard; the determinism replay below is the behavioural proxy).

import { describe, it, expect } from 'vitest'
import { render } from '../src/shell/render'
import type { Atlas } from '../src/shell/atlas'
import { createAttract, createSim, stepSim, STARTING_LIVES, type SimState } from '../src/core/sim'
import { PLAYH_MIN, PLAYH_MAX, type InputCounts } from '../src/core/player'
import { BONUS_INCREMENT } from '../src/core/bonus'

// ── ROM constants under test ────────────────────────────────────────────────
// ATTRT reverses PLAYH at these two compare points (:188-195). They sit INSIDE
// the gun's full travel range (PLAYH_MIN 0x0b .. PLAYH_MAX 0xf4), so a faithful
// demo sweeps a NARROWER band — that gap is how an ATTRT trace is told apart
// from a gun that merely clamps to the play bounds.
const ATTRT_REVERSE_LOW = 0x1c // 28
const ATTRT_REVERSE_HIGH = 0xe4 // 228
// Per-frame steering step can overshoot its compare point by a few pixels before
// the reversal catches; this slack tolerates that while staying well clear of the
// play bounds (0xe4→0xf4 is 16 px, 0x1c→0x0b is 17 px, both > 8).
const STEP_SLACK = 8

const GUN_HOME_H = 0x80 // createPlayer() boots the gun at 0x80

const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

// ── helpers ─────────────────────────────────────────────────────────────────

/** Run the attract demo for `frames` frames from a fresh createAttract(seed),
 *  feeding it `input` every frame (default: no trackball, no coin). Returns the
 *  state AFTER each frame. */
function runAttract(seed: number, frames: number, input: InputCounts = IDLE): SimState[] {
  const out: SimState[] = []
  let s = createAttract(seed)
  for (let i = 0; i < frames; i++) {
    s = stepSim(s, input)
    out.push(s)
  }
  return out
}

/** The horizontal trajectory of the demo gun over `frames` frames. */
function sweepH(seed: number, frames: number, input: InputCounts = IDLE): number[] {
  return runAttract(seed, frames, input).map((s) => s.player.h)
}

/** True iff the trajectory both rose and fell — i.e. the gun reversed direction. */
function reversesBothWays(hs: number[]): boolean {
  let up = false
  let down = false
  for (let i = 1; i < hs.length; i++) {
    if (hs[i] > hs[i - 1]) up = true
    if (hs[i] < hs[i - 1]) down = true
  }
  return up && down
}

// ── AC-1: the self-playing gun driver ───────────────────────────────────────
describe('cp4-7 AC-1 — attract runs the sim with a self-playing gun driver (ATTRT :158)', () => {
  it('self-plays: the gun MOVES and the sim ADVANCES under no player input (today attract holds)', () => {
    const states = runAttract(0x1234, 400)
    const hs = states.map((s) => s.player.h)
    expect(new Set(hs).size, 'the demo gun steers itself — its position changes across frames').toBeGreaterThan(1)
    expect(Math.max(...hs.map((h) => Math.abs(h - GUN_HOME_H))), 'it travels meaningfully off its 0x80 home').toBeGreaterThan(8)
    expect(states[states.length - 1].frame, 'attract actually steps the sim — the frame counter advances').toBeGreaterThan(0)
  })

  it('sweeps the gun and REVERSES at PLAYH 0x1C / 0xE4, not at the play bounds (:188-195)', () => {
    const hs = sweepH(0xc0ffee, 2500)
    const min = Math.min(...hs)
    const max = Math.max(...hs)

    // Approaches AND reverses at the ROM's high compare point — well short of PLAYH_MAX.
    expect(max, 'the sweep reaches up toward 0xE4').toBeGreaterThanOrEqual(ATTRT_REVERSE_HIGH - STEP_SLACK)
    expect(max, 'and reverses there — it never runs out to the play bound 0xf4').toBeLessThanOrEqual(ATTRT_REVERSE_HIGH + STEP_SLACK)
    expect(max, 'sanity: strictly inside the gun bound').toBeLessThan(PLAYH_MAX)

    // ...and at the low compare point — well above PLAYH_MIN.
    expect(min, 'the sweep reaches down toward 0x1C').toBeLessThanOrEqual(ATTRT_REVERSE_LOW + STEP_SLACK)
    expect(min, 'and reverses there — it never runs out to the play bound 0x0b').toBeGreaterThanOrEqual(ATTRT_REVERSE_LOW - STEP_SLACK)
    expect(min, 'sanity: strictly inside the gun bound').toBeGreaterThan(PLAYH_MIN)

    expect(reversesBothWays(hs), 'the gun genuinely reverses — travels both up and down').toBe(true)
  })

  it('fires the demo gun (RSHOT1) — a shot goes live at some point during the demo', () => {
    const fired = runAttract(0xbeef, 2000).some((s) => s.shot.live)
    expect(fired, 'ATTRT presses fire — the single shot becomes live').toBe(true)
  })

  it('is deterministic from its seed alone — two runs of the same seed replay identically', () => {
    const shape = (s: SimState) => [s.player.h, s.player.v, s.shot.live, s.shot.h, s.frame] as const
    const a = runAttract(0x0777, 800).map(shape)
    const b = runAttract(0x0777, 800).map(shape)
    expect(b, 'same seed ⇒ identical replay (seeded rng only, no wall clock)').toEqual(a)
    // Guard the above against a vacuous constant-equals-constant pass: the run
    // must actually play. RED today because attract holds and a[i][0] stays 0x80.
    expect(a.some(([h]) => h !== GUN_HOME_H), 'and the replay is non-trivial — the gun moved').toBe(true)
  })

  it('self-drives — the trackball is IGNORED in attract; the demo controls the gun', () => {
    const withIdle = sweepH(0x55, 800, IDLE)
    // A hard-over trackball push (no coin) must NOT steer the demo gun.
    const withInput = sweepH(0x55, 800, { dh: 100, dv: 100, fire: true })
    expect(withInput, 'attract self-drives regardless of trackball input').toEqual(withIdle)
    expect(withIdle.some((h) => h !== GUN_HOME_H), 'and it is genuinely playing (RED-now discriminator)').toBe(true)
  })
})

// ── AC-1: the demo is immortal and loops (LOOP-6, :615) ──────────────────────
describe('cp4-7 AC-1 — the demo never ends itself (attract skips the life check, :615)', () => {
  it('holds the ATTRACT phase across a long self-playing run — no game-over without a coin', () => {
    const states = runAttract(0x42, 2500)
    expect(states.every((s) => s.phase === 'attract'), 'the demo stays in attract forever — it never falls to game-over').toBe(true)
    expect(states.some((s) => s.player.h !== GUN_HOME_H), 'and it is genuinely self-playing (RED-now discriminator)').toBe(true)
  })

  it('survives its own death: a centipede on the demo gun respawns IN ATTRACT, never game-over', () => {
    // Plant a live head exactly on the demo gun (v=0x08 is the bottom row where
    // the gun lives). Once attract runs the sim this forces a collision on the
    // first frame; the death + RESTOR + respawn cycle then plays out. In attract
    // the ROM skips the life check (:615), so the machine must respawn and STAY
    // in attract — the death path's hardcoded `phase: 'playing'` (sim.ts:613)
    // must not leak the demo into a live game.
    const seeded = createAttract(0x2024)
    const attacker = { h: seeded.player.h, v: seeded.player.v, dh: 0, dv: 0, pic: 0x03 }
    let s: SimState = { ...seeded, segs: [attacker, ...seeded.segs.slice(1)] }

    const phases = new Set<string>()
    let exploded = false
    for (let i = 0; i < 600; i++) {
      s = stepSim(s, IDLE)
      phases.add(s.phase)
      if (s.playerExplode > 0) exploded = true
    }
    expect(exploded, 'the demo gun is actually hit — attract runs the sim (RED today: attract holds)').toBe(true)
    expect(phases.has('gameover'), 'attract never reaches game-over (:615 skips the life check)').toBe(false)
    expect(s.phase, 'and after the respawn it is still the attract demo').toBe('attract')
  })
})

// ── AC-2: START drops the demo into a fresh live game ────────────────────────
describe('cp4-7 AC-2 — a coin/start transitions attract → playing (:852, LOOP-5)', () => {
  it('after the demo has been playing, START begins a clean, fresh game', () => {
    const START: InputCounts = { dh: 0, dv: 0, fire: false, start: true }
    // Let the demo actually run first, so we prove its mutations do not leak.
    let s = createAttract(0x9001)
    for (let i = 0; i < 300; i++) s = stepSim(s, IDLE)
    expect(s.player.h !== GUN_HOME_H || s.frame > 0, 'precondition: the demo has been playing (RED-now discriminator)').toBe(true)

    s = stepSim(s, START)
    expect(s.phase, 'START drops attract into a live game').toBe('playing')
    expect(s.gameOver, 'a fresh game is not over').toBe(false)
    expect(s.score, 'the started game begins at zero — no demo score carried in').toBe(0)
    expect(s.lives, 'with a full life count').toBe(STARTING_LIVES)
    expect(s.wave, 'on wave 1').toBe(1)
  })
})

// ── AC-2: the copyright + bonus-panel overlays (attract only) ────────────────
// A recording atlas/ctx that reconstructs each drawn text ROW. blit() calls
// atlas.rect(name) immediately before ctx.drawImage(img, sx,sy,sw,sh, dx,dy,...),
// so we pair the two: rect() latches the pending glyph char, the drawImage that
// follows stamps its (dx, dy). Non-text sprites (GUN, MUSHROOM_*) latch nothing.
interface Rec {
  ctx: CanvasRenderingContext2D
  atlas: Atlas
  rows: () => string[]
}
function makeRecorder(): Rec {
  const glyphs: Array<{ ch: string; x: number; y: number }> = []
  let pending: string | null = null
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name.startsWith('CHAR_') ? name.slice(5) : name.startsWith('DIGIT_') ? name.slice(6) : null
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect() {},
    drawImage(_img: unknown, _sx: number, _sy: number, _sw: number, _sh: number, dx: number, dy: number) {
      if (pending !== null) glyphs.push({ ch: pending, x: dx, y: dy })
      pending = null
    },
    clearRect() {},
    save() {},
    restore() {},
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    atlas: atlas as unknown as Atlas,
    // group glyphs into rows by y, left-to-right by x; spaces vanish (no stamp).
    rows() {
      const byY = new Map<number, Array<{ ch: string; x: number }>>()
      for (const g of glyphs) {
        const row = byY.get(g.y) ?? []
        row.push({ ch: g.ch, x: g.x })
        byY.set(g.y, row)
      }
      return [...byY.values()].map((r) => r.sort((a, b) => a.x - b.x).map((g) => g.ch).join(''))
    },
  }
}

describe('cp4-7 AC-2 — attract overlays the copyright + BONUS panel (CPYRHT :166-176, BONUS :225)', () => {
  it('draws the "1980 ATARI" copyright in attract, and NOT during a live game', () => {
    const a = makeRecorder()
    render(a.ctx, a.atlas, createAttract(1))
    const rows = a.rows()
    expect(rows.some((r) => r.includes('ATARI')), 'attract shows the ATARI copyright (CENTI4.MAC:12)').toBe(true)
    expect(rows.some((r) => r.includes('1980')), 'with the ROM copyright year drawn verbatim — 1980, not 1981').toBe(true)

    const p = makeRecorder()
    render(p.ctx, p.atlas, createSim(1))
    expect(p.rows().some((r) => r.includes('ATARI')), 'the copyright is gone once play begins').toBe(false)
  })

  it('draws the "BONUS LIFE EVERY 10000" panel in attract with the hardcoded default, and NOT in play', () => {
    const a = makeRecorder()
    render(a.ctx, a.atlas, createAttract(1))
    const panel = a.rows().find((r) => r.includes('BONUS') && r.includes('EVERY'))
    expect(panel, 'attract shows the "BONUS LIFE EVERY" panel (BONUS :225)').toBeTruthy()
    expect(panel, 'showing the hardcoded-default increment BONUSV[0] = 10000').toContain(String(BONUS_INCREMENT))

    const p = makeRecorder()
    render(p.ctx, p.atlas, createSim(1))
    expect(p.rows().some((r) => r.includes('BONUS')), 'no bonus panel during live play').toBe(false)
  })
})
