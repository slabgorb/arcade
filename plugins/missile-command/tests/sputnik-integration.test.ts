// plugins/missile-command/tests/sputnik-integration.test.ts
//
// Story mc5-2 — Task 5: the Sputnik WIRED into stepGame. A fresh game carries no
// planes; from wave 2 (SPUTWV) a plane activates, flies, is dropped when it leaves
// the field, and — when a blast overlaps it — is killed for 4× the ICBM value.
// Authored RED (Leeloo/TEA); now GREEN. Keeps the sneaky Dev honest: the pure
// reducer (sputnik.test.ts) can be perfect and still be unwired.
//
// FIRING REWORK (mc5-2, round 2): the plane shipped firing ZERO ICBMs in play —
// the WSPLAU-seeded fire timer (activation separation, 240/160/128) outlasted the
// crossing; the fix seeds fireTimer from WSPFIR = SPUTDS, "DISTANCE BETWEEN
// SPUTNIK FIRES" (W3MAIN.MAC:285 decl, :4133 use). The round-1 rework then
// OVER-corrected the clamp: it read ICNORM's aloft-plane borrow as an 8th-slot
// GRANT (headroom 8 − icbm, cap 4, budget-priority fire) — rejected on review.
// The faithful reading: with the plane aloft (PLCPV ≠ 0), ICNORM's
// `SEC / LDA PLCPV / IFNE / CLC` (W3MAIN.MAC:2447-2453) borrows an extra 1 in
// the first SBC, so the salvo headroom is 7 − 2·cruise − icbm — the −1 IS the
// plane's own reservation, and the plane fires only when the swarm has dipped
// below MXICON(7). The on-screen ceiling holds at NICBMS(8) for everyone. And
// SPUTFIR (:2703) falls into MIRVER (:2705), whose `CMP I,2 / STA POTENT
// ;NO MORE THAN 3 SHOTS` (:2709-2717) caps the salvo at 3, not ICNORM's 4.
// The in-play suite below pins firing AND the restored ceiling; the fixture
// tests in this file keep `fireTimer: 999` deliberately — 999 is far from 0, so
// those planes never fire and kill/drop/score stay isolated.
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
import { NICBMS } from '../src/core/spawn.js'
import { waveSchedule } from '../src/core/wave.js'
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
// proof), and the NICBMS on-screen ceiling holds while it does. Play is a
// createGame(seed) → stepGame loop — no hand-injected enemies, no input — with
// ONE survivability concession: a headless run has no defending player, so the
// wave is PINNED and a spent budget REFILLED each frame (see playCell). A
// plane's shot is detected by its launch altitude — `origin.v ===
// SPUTNIK_V_MIN` (100): a normal spawn launches from the top edge (TOPSCR =
// 222, spawn.ts) and a MIRV child splits inside the v ∈ [128, 160] band
// (mirv.ts), so v = 100 is unreachable by anything but the plane, which spawns
// at SPUTNIK_V_MIN and holds altitude in level flight. The fire cadence the fix
// seeds is WSPFIR = SPUTDS, "DISTANCE BETWEEN SPUTNIK FIRES" (W3MAIN.MAC:285
// decl, :4133 use) — NOT the WSPLAU activation separation. Distinct shots are
// counted by `origin.h|target` because a launched ICBM persists in state.icbms
// across many frames (dedupe undercounts a same-pos same-target salvo, which
// only makes the threshold harder — conservative).
//
// WAVE CHOICE: the faithful clamp fires SPARSELY at the debut wave — WSPFIR
// ramps 128, 96, 64, 48, 32, 32, 16 across waves 2-8, and at wave 2 the
// 128-frame cadence ≈ half the 247-tick crossing, ~1 opportunity per plane —
// and increasingly at higher waves where the bomber is a real threat. The
// matrix therefore covers waves [3, 4, 6, 8]; wave-2 sparseness is by design,
// not asserted.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 rework — the bomber launches ICBMs in natural play', () => {
  const SEEDS = [1, 4, 7, 11, 13]
  const WAVES = [3, 4, 6, 8]
  const FRAMES_PER_CELL = 4000 // bounded: each cell is a finite, deterministic run

  interface CellResult {
    readonly shots: number // distinct plane-origin ICBMs observed
    readonly maxConcurrent: number // peak simultaneous on-screen ICBM count
  }

  /** One seeded, unattended run at a pinned wave. The pin + budget refill model
   *  "a defending player survives this wave": without them the headless sim's
   *  cities fall and the wave/budget end long before the fly-across's WSPFIR
   *  cadence can be observed. Deterministic — no entropy is added, and every
   *  enemy is spawned by stepGame itself. */
  function playCell(seed: number, wave: number, frames: number): CellResult {
    let s: GameState = { ...createGame(seed), wave }
    const shots = new Set<string>()
    let maxConcurrent = 0
    for (let i = 0; i < frames && s.phase !== 'over'; i++) {
      s = stepGame(s)
      s = { ...s, wave, remaining: s.remaining > 0 ? s.remaining : waveSchedule(wave).count }
      maxConcurrent = Math.max(maxConcurrent, s.icbms.length)
      for (const m of s.icbms) {
        if (m.origin.v === SPUTNIK_V_MIN) shots.add(`${m.origin.h}|${m.target.h}|${m.target.v}`)
      }
    }
    return { shots: shots.size, maxConcurrent }
  }

  it('CONTROL — the v=100 discriminator never false-positives below SPUTWV (wave 1)', () => {
    // Wave 1 is below SPUTWV: no plane can exist, so any v=100 origin here would
    // mean a normal spawn or MIRV child leaked into the detection band. Same
    // harness as the matrix, green before AND after the fix — this pins the
    // detector, not the feature.
    expect(playCell(1, 1, 2000).shots).toBe(0)
  })

  it('fires across a seed × wave matrix (>= 12 of 20 cells, >= 25 shots) under the NICBMS ceiling', () => {
    let total = 0
    let firingCells = 0
    let maxConcurrent = 0
    for (const seed of SEEDS) {
      for (const wave of WAVES) {
        const r = playCell(seed, wave, FRAMES_PER_CELL)
        total += r.shots
        if (r.shots > 0) firingCells++
        maxConcurrent = Math.max(maxConcurrent, r.maxConcurrent)
      }
    }
    // Thresholds calibrated ONCE (escalating-guard rule) by a TEA spike of the
    // faithful fix (7 − icbm clamp, cap 3, post-spawn count): it measured 17/20
    // firing cells, 38 distinct shots, maxConcurrent 8 in every cell — so
    // >= 12 cells and >= 25 shots pass with margin for RNG-stream drift from
    // Dev's exact ordering, while a fluky fix that fires on a lucky seed fails.
    expect(firingCells).toBeGreaterThanOrEqual(12) // a solid majority of the 20 cells
    expect(total).toBeGreaterThanOrEqual(25) // and a clearly-nonzero aggregate
    // The ceiling the faithful clamp restores: plane salvo + swarm never exceed
    // the NICBMS(8) slot table (W3COMN.MAC:35). The rejected budget-priority
    // pre-spawn fire could stack plane shots ON TOP of a swarm the spawner then
    // topped up — piercing 8 — so this guard is load-bearing, not decorative.
    expect(maxConcurrent).toBeLessThanOrEqual(NICBMS)
  })
})
