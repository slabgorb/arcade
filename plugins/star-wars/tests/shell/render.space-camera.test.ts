// tests/shell/render.space-camera.test.ts
//
// sw8-8 — the space camera IS the cockpit; the lateral drift belongs to the STARFIELD.
//
// This file was RETIRED:`render.moving-eye.test.ts` (sw8-1) — a historical name, marked so the
// comment-citation guard does not re-open it — and it asserted the opposite: that the space
// view matrix drifts with the frame counter and carries the Death Star off screen centre. sw8-8
// retired that camera, so three of its four tests are INVERTED here rather than deleted — the
// inversion is what stops the mis-port being re-derived a third time.
//
// WHY THE ORIGINAL WAS WRONG. sw8-1's header read `VWSTAR` (WSSTAR.MAC:96-103) as loading the
// viewer translation "so the whole world slides past the eye". `VWSTAR` is the STAR GENERATOR: it
// loads ST.UX/UY/UZ into the Math Box translation registers and immediately emits star points, and
// it is the ONLY CONSUMER of those registers in the entire 1983 tree (`LDD ST.UX ;STARS RELATIVE
// MOVEMENT`, WSSTAR.MAC:98). The sibling registers say so outright — `ST.UY:: ;PLAYERS UNIVERSE Y
// FOR STARS`, `ST.UZ:: ;PLAYERS UNIVERSE Z FOR STARS` (WSGLOB.MAC:752-753) — and every writer sits
// under `.SBTTL MOVE STARS IN SOME DIRECTION`. Nothing in the ROM draws a TIE, the Death Star, a
// fireball or the gun through ST.UX. The full case is the tombstone in `src/core/gameRules.ts`.
//
// WHAT THE MIS-PORT COST. Sliding the camera off the cockpit put the pilot's view and gun somewhere
// his shield was not: incoming fire homed at the origin he was scored at while he looked from up to
// 2,048 units to one side, so every fireball left his reachable arc before impact and could not be
// shot down (sw8-8, `tests/core/incoming-fire-reaction-window.test.ts`).
//
// WHAT SURVIVES. sw8-1's actual observable — space reads as lateral motion, not a forward stream —
// is real and stays, ported where the ROM puts it: `core/starfield.ts STAR_LATERAL_SPEED`. AC5's
// determinism-AND-motion check is re-seated onto the field below, so the half of sw8-1 the source
// supports is still pinned.

import { describe, it, expect } from 'vitest'
import { cameraView, deathStarPlacement } from '../../src/shell/render'
import { initialState, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { transform, type Mat4 } from '@shared/math3d'

// A render-cadence step (1/60 s) sits below the ≈20.5 Hz game-frame tick, so no game
// frame is ever skipped and the accumulator never clamps (sim.ts MAX_CATCHUP_FRAMES).
const DT = 1 / 60

/** Step the real sim `steps` render frames on neutral input. With NO_INPUT the player
 *  never kills a TIE, so `phaseKills` stays 0 and the run stays in the space phase the
 *  whole time — only `frame` and the world (starfield) advance. */
function advance(s0: GameState, steps: number): GameState {
  let s = s0
  for (let i = 0; i < steps; i++) s = stepGame(s, NO_INPUT, DT)
  return s
}

/** The Death Star's lateral position in the camera's view space. */
function deathStarViewX(state: GameState): number {
  return transform(cameraView(state), deathStarPlacement(state).pos)[0]
}

/** Largest absolute element-wise difference between two 4×4 matrices. */
function matMaxDelta(a: Mat4, b: Mat4): number {
  let d = 0
  for (let i = 0; i < 16; i++) d = Math.max(d, Math.abs(a[i] - b[i]))
  return d
}

/** Mean lateral position of the star field — the quantity ST.UX actually translates. */
function starfieldMeanX(state: GameState): number {
  const stars = state.starfield
  return stars.reduce((acc, s) => acc + s.x, 0) / stars.length
}

describe('sw8-8 — the space camera is the cockpit', () => {
  it('the space view matrix is FRAME-INVARIANT — the camera never drifts off the cockpit', () => {
    // Inverts sw8-1's AC2. Twelve seconds of flight (≈246 game frames) is far more than enough
    // for any re-derived viewer drift to register; the camera must be bit-identical regardless.
    // This is the tripwire against ST.UX being wired back into the view a third time.
    const start = initialState(1983)
    const later = advance(start, 720)
    expect(matMaxDelta(cameraView(start), cameraView(later))).toBeLessThan(1e-9)
  })

  it('the CAMERA never moves the Death Star — its view-x is its world-x, always', () => {
    // Inverts sw8-1's AC3, and states only what the ROM evidence supports: the camera contributes
    // no lateral offset. It deliberately does NOT assert that the station sits on the axis.
    //
    // Round 1 of this story did assert exactly that (`|viewX| < 1e-6`), and it over-reached. The
    // ROM case retires the CAMERA drift; it says nothing about whether the STATION moves — and our
    // own primary evidence says it does. The epic's design spec records a direct cabinet
    // observation: "Longplay ~wave 4 (score 352,171): mid space-combat, the Death Star is entirely
    // out of frame" (`docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:47-48`).
    // That is established, not hypothetical. (The citation formerly read RETIRED:`:26-30`, which was
    // correct when written and was invalidated by sw8-8's own commit: the 31-line amendment it added
    // to that anchor in the SAME commit pushed the observation down the file, so the old span landed
    // a reader on the paragraph REINTERPRETING the observation instead of the observation itself.)
    // sw8-17 has since ported the station's own lateral motion, so `deathStarPlacement` now seats it
    // off-axis through `deathStarOffAxis` and the port DOES reproduce the observation.
    // Pinning "the station holds the axis" would have made sw8-17 start by deleting this test.
    //
    // What must NOT come back is the shortcut: re-deriving the wandering from `ST.UX` and sliding
    // the CAMERA to fake it. That is what put the pilot's eye and gun somewhere his shield was not
    // and broke fire fairness, and this assertion fails loudly on it — for any camera offset, at
    // any station position, including the off-axis ones sw8-17 now produces.
    let s = initialState(1983)
    for (let c = 0; c < 12; c++) {
      s = advance(s, 60) // ~one second of frames per checkpoint
      expect(
        deathStarViewX(s),
        'the camera displaced the Death Star laterally — the ST.UX camera slide is back',
      ).toBeCloseTo(deathStarPlacement(s).pos[0], 9)
    }
  })

  it('AC5 re-seated: the STARFIELD drifts laterally and is seed-deterministic', () => {
    // sw8-1's AC5 asked for a path that was deterministic AND non-constant. Both halves were
    // right about the OBSERVABLE (space must read as lateral motion, reproducibly) and wrong only
    // about the subject. Re-seated onto the field, which is what ST.UX actually translates.
    const pathOf = (seed: number): number[] => {
      let s = initialState(seed)
      const path: number[] = []
      for (let c = 0; c < 8; c++) {
        s = advance(s, 60)
        path.push(starfieldMeanX(s))
      }
      return path
    }
    const a = pathOf(1983)
    const b = pathOf(1983)

    // Determinism: identical seed → identical drift (the CLAUDE.md core rule).
    for (let c = 0; c < a.length; c++) expect(a[c]).toBeCloseTo(b[c], 9)

    // ...and it actually MOVES. A frozen "deterministic" field is not a drift, and a field that
    // only streamed forward would hold mean-x constant — this is the bite that keeps sw8-1's real
    // deliverable alive now that its camera is retired.
    expect(
      Math.abs(a[a.length - 1] - a[0]),
      'the starfield no longer drifts laterally',
    ).toBeGreaterThan(1)

    // Direction is monotone: `stepStarfield` applies ONE `dx` to every star, so the whole field
    // shifts the same way each step and this cannot be satisfied by jitter.
    for (let c = 1; c < a.length; c++) expect(a[c]).toBeLessThan(a[c - 1])
  })

  it('scope guard: the surface camera stays frame-invariant too', () => {
    // Kept from sw8-1's AC7. The surface camera reads the ship altitude, not the frame counter,
    // so two surface states differing only in `frame` must yield the SAME view.
    const base = initialState(1983)
    const surfEarly: GameState = { ...base, phase: 'surface', frame: 0 }
    const surfLate: GameState = { ...base, phase: 'surface', frame: 4096 }
    expect(matMaxDelta(cameraView(surfEarly), cameraView(surfLate))).toBeLessThan(1e-9)
  })
})
