// plugins/missile-command/tests/sputnik-integration.test.ts
//
// Story mc5-2 — Task 5: the Sputnik WIRED into stepGame. A fresh game carries no
// planes; from wave 2 (SPUTWV) a plane activates, flies, is dropped when it leaves
// the field, and — when a blast overlaps it — is killed for 4× the ICBM value.
// Authored RED (Leeloo/TEA); now GREEN. Keeps the sneaky Dev honest: the pure
// reducer (sputnik.test.ts) can be perfect and still be unwired.
//
// FIRING REWORK (mc5-2, RED): the plane's firing was wired and unit-tested yet
// launched ZERO ICBMs in natural play — the "feature not observed in play" finding.
// Two measured root causes: (a) spawnSputnik seeded fireTimer from WSPLAU (the
// ACTIVATION separation, 240/160/128) instead of WSPFIR = SPUTDS, "DISTANCE BETWEEN
// SPUTNIK FIRES" (W3MAIN.MAC:285 decl, :4133 use), so at the cross speed the plane
// exited before ever becoming fire-ready; (b) the fire-count clamp kept a −1
// self-term on MXICON(7) while the spawner filled the screen, where the ROM fires
// the plane INTO the 8th (NICBMS) slot the swarm reserves. The in-play suite below
// pins the fix; the fixture tests in this file keep `fireTimer: 999` deliberately —
// 999 is far from 0, so those planes never fire and kill/drop/score stay isolated.
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
//   SPUTWV = 2 (W3COMN.MAC:203): no plane before wave 2, planes from wave 2 on.
//   SPUTKI LDX I,3 → ×4 (W3MAIN.MAC:2081): a killed plane is worth 4× an ICBM.
//   ×4 = SPUTNIK_SCORE_MULT, pinned to 4 in sputnik.test.ts; the per-ICBM value is
//   ICBM_KILL_POINTS (imported, not re-spelled). At wave 2 the per-wave multiplier
//   scoreMultiplier(2) = (2+1)>>1 = 1, so the kill is 4·ICBM_KILL_POINTS whether or
//   not Dev also folds in the wave multiplier — the assertion is robust to that.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { launchIcbm } from '../src/core/icbm.js'
import { startExplosion, stepExplosion, type Explosion } from '../src/core/explosion.js'
import { ICBM_KILL_POINTS } from '../src/core/score.js'
import { SPUTNIK_V_MIN, type Sputnik } from '../src/core/sputnik.js'
import { HMAX } from '../src/core/cursor.js'

/** The plane roster on a state — `GameState.sputniks` is a first-class field now. */
const planesOf = (s: GameState): readonly Sputnik[] => s.sputniks

/** A far, in-flight ballistic ICBM: keeps the wave from ending (so stepGame stays on
 *  its play path) and is itself never caught by a blast nor MIRV-eligible (v ∉ [128,160]). */
const farIcbm = () => launchIcbm({ h: 20, v: 210 }, { h: 20, v: 16 })

/** A REAL blast (startExplosion, aged by stepExplosion) parked at (h, 100) with a
 *  peak OLDRAD radius, so after stepGame ages it one more tick it still covers a
 *  plane there comfortably despite the plane's small per-tick drift. Not a fabricated record. */
function peakBlastAt(h: number): Explosion {
  let e = startExplosion(h, 100)
  for (let i = 0; i < 64; i++) e = stepExplosion(e) // t=64 → stepGame ages to 65 → OLDRAD idx 13 → radius 13
  return e
}

describe('mc5-2 Task 5 — sputniks activate in stepGame (the SPUTWV gate)', () => {
  it('a fresh game starts with an empty plane roster', () => {
    expect(planesOf(createGame(4))).toEqual([])
  })

  it('never activates a plane before wave 2 (the SPUTWV gate)', () => {
    let s: GameState = { ...createGame(4), wave: 1 }
    let sawPlane = false
    for (let i = 0; i < 500; i++) {
      // Re-pin wave 1 each tick: a wave-end transition would otherwise advance the
      // wave inside the loop and let a plane appear on fully-correct code (the guard
      // must observe the case it names, not pass by pacing luck).
      s = { ...stepGame(s), wave: 1 }
      if (planesOf(s).length > 0) sawPlane = true
    }
    expect(sawPlane).toBe(false) // wave 1 is below SPUTWV — no plane may appear
  })

  it('activates a plane from wave 2 onward', () => {
    let s: GameState = { ...createGame(4), wave: 2 }
    let sawPlane = false
    for (let i = 0; i < 800; i++) {
      s = stepGame(s)
      if (planesOf(s).length > 0) sawPlane = true
    }
    expect(sawPlane).toBe(true)
  })
})

describe('mc5-2 Task 5 — a killed plane scores ×4 and is removed', () => {
  it('a blast overlapping a plane raises the score by 4× the ICBM value and drops the plane', () => {
    const KILL_H = 120
    const plane: Sputnik = { pos: { h: KILL_H, v: 100 }, dir: 1, variant: 'bomber', fireTimer: 999 }
    // fireTimer far from 0 so the plane does NOT launch an ICBM this frame — the only
    // scoring event is its own death, so the delta is exactly the ×4 kill value.
    const fixture: GameState = {
      ...createGame(2),
      wave: 2, // scoreMultiplier(2) === 1, so the ×4 kill is a clean 4·ICBM_KILL_POINTS
      remaining: 0, // no spawns — the roster is exactly what we injected
      icbms: [farIcbm()], // keeps the wave from ending; never caught by the blast
      explosions: [peakBlastAt(KILL_H)],
      sputniks: [plane],
    }
    const before = fixture.score
    const s = stepGame(fixture)
    expect(planesOf(s)).toEqual([]) // the plane was caught and removed
    expect(s.score - before).toBe(4 * ICBM_KILL_POINTS) // SPUTNIK_SCORE_MULT(4) × the ICBM value
  })

  it('a plane that flies off the far edge is dropped with no penalty and no points', () => {
    const offscreenPlane: Sputnik = { pos: { h: HMAX + 5, v: 100 }, dir: 1, variant: 'satellite', fireTimer: 999 }
    const fixture: GameState = {
      ...createGame(2),
      wave: 2,
      remaining: 0,
      icbms: [farIcbm()], // wave stays live; nothing to score
      sputniks: [offscreenPlane],
    }
    const before = fixture.score
    const s = stepGame(fixture)
    expect(planesOf(s)).toEqual([]) // an off-field plane is dropped
    expect(s.score).toBe(before) // leaving the screen is not a kill — no points, no penalty
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mc5-2 FIRING REWORK — the plane fires IN PLAY (the missing "observed in play"
// proof). NATURAL play only: createGame(seed) → stepGame loop, no hand-injected
// fixtures, no input. A plane's shot is detected by its launch altitude —
// `origin.v === SPUTNIK_V_MIN` (100): a normal spawn launches from the top edge
// (TOPSCR = 222, spawn.ts) and a MIRV child splits inside the v ∈ [128, 160]
// band (mirv.ts), so v = 100 is unreachable by anything but the plane, which
// spawns at SPUTNIK_V_MIN and holds altitude in level flight. The fire cadence
// the fix seeds is WSPFIR = SPUTDS, "DISTANCE BETWEEN SPUTNIK FIRES"
// (W3MAIN.MAC:285 decl, :4133 use) — NOT the WSPLAU activation separation.
// Distinct shots are counted by `origin.h|target` because a launched ICBM
// persists in state.icbms across many frames (dedupe undercounts a same-pos
// same-target salvo, which only makes the threshold harder — conservative).
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 rework — the bomber launches ICBMs in natural play', () => {
  const SEEDS = [1, 4, 7, 11, 13]
  const WAVES = [2, 3, 4]
  const FRAMES_PER_CELL = 4000 // bounded: each cell is a finite, deterministic run

  /** Distinct plane-origin shots observed over one seeded, unattended run. */
  function distinctPlaneShots(seed: number, startWave: number, frames: number): number {
    let s: GameState = { ...createGame(seed), wave: startWave }
    const shots = new Set<string>()
    for (let i = 0; i < frames && s.phase !== 'over'; i++) {
      s = stepGame(s)
      for (const m of s.icbms) {
        if (m.origin.v === SPUTNIK_V_MIN) shots.add(`${m.origin.h}|${m.target.h}|${m.target.v}`)
      }
    }
    return shots.size
  }

  it('CONTROL — the v=100 discriminator never false-positives below SPUTWV (wave 1)', () => {
    // Wave 1 is below SPUTWV: no plane can exist, so any v=100 origin here would
    // mean a normal spawn or MIRV child leaked into the detection band. Green
    // before AND after the fix — this pins the detector, not the feature.
    expect(distinctPlaneShots(1, 1, 2000)).toBe(0)
  })

  it('fires across a seed × wave matrix: >= 8 of 15 cells fire, >= 12 distinct shots total', () => {
    // RED now: the WSPLAU-seeded fire timer + the MXICON−1 clamp yield 0 shots in
    // EVERY cell. A robust fix (WSPFIR seed, NICBMS headroom, plane-before-spawn
    // ordering) clears both bars with margin; a fluky fix that fires only on a
    // lucky seed does not.
    let total = 0
    let firingCells = 0
    for (const seed of SEEDS) {
      for (const wave of WAVES) {
        const n = distinctPlaneShots(seed, wave, FRAMES_PER_CELL)
        total += n
        if (n > 0) firingCells++
      }
    }
    // Thresholds calibrated by a TEA spike of the fix shape (planes-before-spawn,
    // planeActive reservation, WSPFIR seed, speed 1, priority fire): it measured
    // 14/15 firing cells and 19 distinct shots, so >= 8 cells and >= 12 total pass
    // with margin for RNG-stream drift from Dev's exact ordering, while the current
    // code's 0/0 stays deeply RED.
    expect(firingCells).toBeGreaterThanOrEqual(8) // a solid majority of the 15 cells
    expect(total).toBeGreaterThanOrEqual(12) // and a clearly-nonzero aggregate
  })
})
