// plugins/missile-command/tests/sputnik-integration.test.ts
//
// Story mc5-2 — RED phase (Leeloo / TEA). Task 5: the Sputnik WIRED into stepGame.
// A fresh game carries no planes; from wave 2 (SPUTWV) a plane activates, flies,
// fires ICBMs into the ICBM array, is dropped when it leaves the field, and — when
// a blast overlaps it — is killed for 4× the ICBM value. This keeps the sneaky Dev
// honest: the pure reducer (sputnik.test.ts) can be perfect and still be unwired.
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
//   SPUTWV = 2 (W3COMN.MAC:203): no plane before wave 2, planes from wave 2 on.
//   SPUTKI LDX I,3 → ×4 (W3MAIN.MAC:2071): a killed plane is worth 4× an ICBM.
//   ×4 = SPUTNIK_SCORE_MULT, pinned to 4 in sputnik.test.ts; the per-ICBM value is
//   ICBM_KILL_POINTS (imported, not re-spelled). At wave 2 the per-wave multiplier
//   scoreMultiplier(2) = (2+1)>>1 = 1, so the kill is 4·ICBM_KILL_POINTS whether or
//   not Dev also folds in the wave multiplier — the assertion is robust to that.
//
// ─── WHY RED ─────────────────────────────────────────────────────────────────
// GameState has no `sputniks` array yet and stepGame never activates/flies/kills a
// plane. `SputnikState` casts the state to the shape Task 5 adds so `tsc --noEmit`
// (the release gate) stays green — the fleet forward-field idiom (bonus-city.test.ts,
// mc4-playthrough.test.ts). At RED `createGame().sputniks` is undefined, and an
// injected plane rides through `...state` unchanged (never killed/dropped), so every
// positive assertion reddens.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { launchIcbm } from '../src/core/icbm.js'
import { startExplosion, stepExplosion, type Explosion } from '../src/core/explosion.js'
import { ICBM_KILL_POINTS } from '../src/core/score.js'
import { HMAX } from '../src/core/cursor.js'

interface Vec {
  readonly h: number
  readonly v: number
}
type SputnikVariant = 'bomber' | 'satellite'
interface Sputnik {
  readonly pos: Vec
  readonly dir: 1 | -1
  readonly variant: SputnikVariant
  readonly fireTimer: number
}
// The GameState shape Task 5 introduces. Casting keeps the lint gate green while the
// field is still absent; at runtime the field is undefined until GREEN adds it.
type SputnikState = GameState & { readonly sputniks: readonly Sputnik[] }

/** The plane roster on a state — undefined until GREEN seeds `sputniks: []`. */
const planesOf = (s: GameState): readonly Sputnik[] | undefined => (s as SputnikState).sputniks

/** A far, in-flight ballistic ICBM: keeps the wave from ending (so stepGame stays on
 *  its play path) and is itself never caught by a blast nor MIRV-eligible (v ∉ [128,160]). */
const farIcbm = () => launchIcbm({ h: 20, v: 210 }, { h: 20, v: 16 })

/** A REAL blast (startExplosion, aged by stepExplosion) parked at (h, 100) with a
 *  peak OLDRAD radius, so after stepGame ages it one more tick it still covers a
 *  plane there despite a ≤1-unit-per-tick drift. Not a fabricated record. */
function peakBlastAt(h: number): Explosion {
  let e = startExplosion(h, 100)
  for (let i = 0; i < 64; i++) e = stepExplosion(e) // t=64 → stepGame ages to 65 → OLDRAD idx 13 → radius 13
  return e
}

describe('mc5-2 Task 5 — sputniks activate in stepGame (the SPUTWV gate)', () => {
  it('a fresh game starts with an empty plane roster', () => {
    // RED: createGame does not seed `sputniks` yet, so this is undefined, not [].
    expect(planesOf(createGame(4))).toEqual([])
  })

  it('never activates a plane before wave 2 (the SPUTWV gate)', () => {
    let s: GameState = { ...createGame(4), wave: 1 }
    let sawPlane = false
    for (let i = 0; i < 500; i++) {
      s = stepGame(s)
      if ((planesOf(s) ?? []).length > 0) sawPlane = true
    }
    expect(sawPlane).toBe(false) // wave 1 is below SPUTWV — no plane may appear
  })

  it('activates a plane from wave 2 onward', () => {
    let s: GameState = { ...createGame(4), wave: 2 }
    let sawPlane = false
    for (let i = 0; i < 800; i++) {
      s = stepGame(s)
      if ((planesOf(s) ?? []).length > 0) sawPlane = true
    }
    expect(sawPlane).toBe(true) // RED: no activation wired yet
  })
})

describe('mc5-2 Task 5 — a killed plane scores ×4 and is removed', () => {
  it('a blast overlapping a plane raises the score by 4× the ICBM value and drops the plane', () => {
    const KILL_H = 120
    const plane: Sputnik = { pos: { h: KILL_H, v: 100 }, dir: 1, variant: 'bomber', fireTimer: 999 }
    // fireTimer far from 0 so the plane does NOT launch an ICBM this frame — the only
    // scoring event is its own death, so the delta is exactly the ×4 kill value.
    const fixture: SputnikState = {
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
    const fixture: SputnikState = {
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
