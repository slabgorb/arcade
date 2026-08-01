// tests/shell/render.death-star-station-wander.test.ts
//
// sw8-17 — the Death Star's off-centre wander belongs to the STATION, not the camera.
//
// THE EVIDENCE ANCHOR (epic §1, design spec `docs/superpowers/specs/
// 2026-07-20-cabinet-feel-render-fidelity-design.md`, §"Longplay observations"):
// "Longplay ~wave 4 (score 352,171): mid space-combat, the Death Star is entirely out
// of frame". Our port cannot reproduce it — `deathStarPlacement` seats the station at
// x = 0 and moves it only in depth, so the body is front-and-centre every frame of
// every space wave. sw8-1 explained the observation with a viewer slide off ST.UX;
// sw8-8 retired that camera. This suite pins the station's OWN ROM mechanism.
//
// THE ROM MECHANISM (WSMAIN.MAC — the story's WSBASE/WSSITE pointers were dead ends:
// WSSITE.MAC `.TITLE WSSITE ;I;HANDLE SITE` is the gun SIGHT + X-wing hood, and
// WSBASE.MAC's "starbase" sections are the trench pie/wedge framework):
//
//   1. The station is a fixed LANDMARK, not a positioned object. `VWDTHA` ("VIEW DETH
//      STAR, VERSION A (MINIATURE)", WSMAIN.MAC:3605) draws it at the MathBox
//      transform of the world +X far point — `LDD M$AX+M.U1 ;X POSITION AT
//      FAR(4000,0,0) DISTANCE` — i.e. at the ship-attitude matrix's A row. The space
//      display list calls it every tick (`JSR VWDTHA`, WSMAIN.MAC:3003).
//   2. The draw is GATED: in front (`IFGT ;?IN FRONT OF PLAYER?`, WSMAIN.MAC:3607)
//      and inside a ±45° square pyramid (`?Y WITHIN X FIELD OF VIEW?` :3613,
//      `?Z WITHIN X FIELD OF VIEW?` :3618). Outside the pyramid the ROM emits NO
//      picture at all — that is what "entirely out of frame" IS on the cabinet.
//   3. Every wave-set seeds the attitude facing DEAD AWAY from the station:
//      `LDA #0C0 ;FACE BACKWARDS` (PHISG2, WSMAIN.MAC:1331) at game start and
//      `LDA #0C0 ;TURN PLAYER AWAY FROM NEW DETH STAR` (PHINXT, WSMAIN.MAC:1940) on
//      every wrap — the station starts astern, out of frame.
//   4. Mid-combat nothing aims at the station: the per-tick twirl (`JSR STWSP1
//      ;TWIRL PLAYER`, WSMAIN.MAC:1410; STWSP1 ≡ S1TW, :2293) rotates the ship
//      toward the current ALIEN (`JSR AIM ;AIM AT ALIEN OR DETH STAR`, :2311;
//      `AIMDTH ;---WHEN NO ALIENS TO LOOK AT, USE DETH STAR`, :2447), and the yoke
//      itself never rotates the ship in space — the space movers write only the
//      starfield register (SMVSP1/SMVSP2 → S1MV, `STD ST.UX ;STARS RELATIVE
//      MOVEMENT`, WSMAIN.MAC:2522-2530). So the station's seat WANDERS with the
//      dogfight and is generically off-centre or not drawn.
//   5. The sweep-in is the wave-clear interlude: PHES0G keeps turning until
//      `CMPD #3F00` on `M$AX+M.S1` (WSMAIN.MAC:1529-1535) — cos θ ≥ $3F00/$4000 =
//      0.984375, θ ≤ ~10.1° — then PHES1G grows the station (and keeps calling S1TW,
//      :1568), so once the station enters the pyramid it converges to centre.
//
// THE PORT SHAPE. Our camera is pinned to the cockpit (sw8-8,
// `tests/shell/render.space-camera.test.ts` — camera-contributes-no-lateral-offset).
// Holding the camera fixed, the ROM's attitude-driven view-space direction of the
// landmark IS the station's own seat: `deathStarPlacement` must carry a lateral term
// that reproduces the wander, and the ROM's draw gate becomes a placement-level
// criterion — the station is "entirely out of frame" when its seat leaves the ±45°
// pyramid (|x| ≥ forward depth, or behind). MUST NOT be re-derived from ST.UX or a
// camera slide: the tombstone file fails loudly on that shortcut, and this suite
// re-guards it from the station's side.

import { describe, it, expect } from 'vitest'
import { cameraView, deathStarPlacement } from '../../src/shell/render'
import { initialState, SPACE_PHASE_END_S, type GameState } from '../../src/core/state'
import { transform, type Mat4 } from '@shared/math3d'

/** A space-phase state at phase-clock time `t` (the sw8-11 timebox drives the seat). */
const spaceAt = (t: number): GameState => ({ ...initialState(1983), phaseTime: t })

/** The station's seat in the camera's view space (the quantity the ROM gates on). */
function stationInView(s: GameState): { x: number; y: number; z: number } {
  const v = transform(cameraView(s), deathStarPlacement(s).pos)
  return { x: v[0], y: v[1], z: v[2] }
}

/**
 * The ROM's own draw gate, ported verbatim from `VWDTHA` (WSMAIN.MAC:3605-3620):
 * drawn only when in FRONT of the player and inside the ±45° square pyramid.
 * Our view space looks down −z, so "in front" is −z > 0 and the pyramid is
 * |x| < −z and |y| < −z. Outside ⇒ the cabinet draws nothing — entirely out of frame.
 */
function drawnByRomGate(v: { x: number; y: number; z: number }): boolean {
  const fwd = -v.z
  return fwd > 0 && Math.abs(v.x) < fwd && Math.abs(v.y) < fwd
}

/** Total off-axis angle of the seat against the view axis (radians). */
function offAxisAngle(v: { x: number; y: number; z: number }): number {
  return Math.atan2(Math.hypot(v.x, v.y), -v.z)
}

/** Largest absolute element-wise difference between two 4×4 matrices. */
function matMaxDelta(a: Mat4, b: Mat4): number {
  let d = 0
  for (let i = 0; i < 16; i++) d = Math.max(d, Math.abs(a[i] - b[i]))
  return d
}

/** PHES0G's stop threshold: `CMPD #3F00` against the $4000 = 1.0 unit A row. */
const ROM_TURN_STOP_COS = 0x3f00 / 0x4000 // = 0.984375 ⇒ θ ≤ ~10.14°

/** Sample grid across the whole box (0 … 21 s inclusive, 0.25 s steps). */
const SAMPLE_TIMES: readonly number[] = Array.from(
  { length: SPACE_PHASE_END_S * 4 + 1 },
  (_, i) => i / 4,
)

/** The combat portion of the box: everything before the sweep-in tail. The ROM has
 *  no fixed combat duration (kills end the wave), so the split is Dev's to place —
 *  this window stops 5 s short of the box to leave the S0G/S1G-equivalent tail free. */
const COMBAT_WINDOW: readonly number[] = SAMPLE_TIMES.filter((t) => t <= 16)

describe('sw8-17 — the Death Star wander belongs to the STATION', () => {
  it('wave start: the ROM seeds the attitude facing AWAY — the station begins out of frame', () => {
    // PHISG2 `LDA #0C0 ;FACE BACKWARDS` (WSMAIN.MAC:1331) and PHINXT `;TURN PLAYER
    // AWAY FROM NEW DETH STAR` (:1940) put the landmark dead astern at every wave
    // start: VWDTHA's in-front gate (:3607) fails and nothing is drawn.
    for (const t of [0, 0.25]) {
      expect(
        drawnByRomGate(stationInView(spaceAt(t))),
        `at t=${t}s the station is front-and-centre — the wave-start astern seed is not ported`,
      ).toBe(false)
    }
  })

  it('the §1 anchor reproduces: MID space-combat the station is entirely out of frame', () => {
    // The longplay observation this story exists for (design spec §"Longplay
    // observations": ~wave 4, score 352,171). Sampled as a neighbourhood around the
    // middle of the box so a knife-edge crossing cannot fake the pass.
    for (const t of [10.25, 10.5, 10.75]) {
      expect(
        drawnByRomGate(stationInView(spaceAt(t))),
        `at t=${t}s the station is inside the ROM draw pyramid — the anchor observation cannot reproduce`,
      ).toBe(false)
    }
  })

  it('the wander spans the combat window — out of frame for at least half of it', () => {
    // Astern seed (WSMAIN.MAC:1331/:1940) + aim that tracks ALIENS, never the
    // station, while any are alive (:2311, :2447) ⇒ on the cabinet the station is
    // generically not drawn during combat. ≥ half keeps the anchor representative
    // of the wave rather than a single tuned instant, while leaving Dev room for
    // the wander to cross the pyramid briefly.
    const out = COMBAT_WINDOW.filter((t) => !drawnByRomGate(stationInView(spaceAt(t))))
    expect(
      out.length,
      `station out of frame for only ${out.length}/${COMBAT_WINDOW.length} combat samples — the wander is cosmetic`,
    ).toBeGreaterThanOrEqual(Math.ceil(COMBAT_WINDOW.length / 2))
  })

  it("the wander is the STATION's own: the camera stays cockpit-pinned at every sampled time", () => {
    // The sw8-8 tombstone from the station's side: whatever lateral term the seat
    // gains, the view matrix must stay bit-identical across the whole box, and the
    // station's view-x must be exactly its world-x (no hidden camera contribution).
    const view0 = cameraView(spaceAt(0))
    for (const t of SAMPLE_TIMES) {
      const s = spaceAt(t)
      expect(
        matMaxDelta(cameraView(s), view0),
        `the space camera moved at t=${t}s — the ST.UX camera slide is back`,
      ).toBeLessThan(1e-9)
      expect(stationInView(s).x).toBeCloseTo(deathStarPlacement(s).pos[0], 9)
    }
  })

  it('the sweep-in mirrors S1TW: once the station enters the pyramid it never leaves', () => {
    // PHES0G turns toward the station and PHES1G KEEPS calling S1TW while the
    // station grows (WSMAIN.MAC:1529-1535, :1568) — convergence, not flicker. The
    // drawn samples must therefore form one un-broken suffix of the box.
    const drawn = SAMPLE_TIMES.map((t) => drawnByRomGate(stationInView(spaceAt(t))))
    const firstDrawn = drawn.indexOf(true)
    expect(firstDrawn, 'the station never becomes visible — there is no sweep-in at all').not.toBe(-1)
    for (let i = firstDrawn; i < drawn.length; i++) {
      expect(
        drawn[i],
        `station left the pyramid again at t=${SAMPLE_TIMES[i]}s after entering at t=${SAMPLE_TIMES[firstDrawn]}s`,
      ).toBe(true)
    }
  })

  it('by the transition the turn has converged inside the ROM stop cone ($3F00 ⇒ ~10.1°)', () => {
    // PHES0G stops turning at `CMPD #3F00` on the unit A row (WSMAIN.MAC:1533):
    // cos θ ≥ 0.984375. By the end of the box the station must be drawn and inside
    // that cone, so the dive that follows is aimed at the thing it flies into.
    for (const t of [SPACE_PHASE_END_S - 0.25, SPACE_PHASE_END_S]) {
      const v = stationInView(spaceAt(t))
      expect(drawnByRomGate(v), `at t=${t}s the station is not drawn — the sweep-in never finished`).toBe(true)
      expect(
        offAxisAngle(v),
        `at t=${t}s the station sits outside the ROM's $3F00 stop cone`,
      ).toBeLessThanOrEqual(Math.acos(ROM_TURN_STOP_COS) + 1e-9)
    }
  })

  it('the wander clamps with the box — the seat never resumes past the transition', () => {
    // Matches the existing quota-clamp guard (tests/core/death-star-body.test.ts):
    // beyond SPACE_PHASE_END_S the whole seat — lateral term included — saturates.
    expect(deathStarPlacement(spaceAt(SPACE_PHASE_END_S + 9))).toEqual(
      deathStarPlacement(spaceAt(SPACE_PHASE_END_S)),
    )
  })

  it('deterministic and pure — same state, same seat; the read mutates nothing', () => {
    const s = spaceAt(7.25)
    const before = JSON.parse(JSON.stringify({ ...s, rng: undefined }))
    const a = deathStarPlacement(s)
    const b = deathStarPlacement(s)
    expect(b).toEqual(a)
    const after = JSON.parse(JSON.stringify({ ...s, rng: undefined }))
    expect(after).toEqual(before)
  })

  it('tripwire: the lateral term is not re-derived from ST.UX/frame', () => {
    // The forbidden shortcut in source form: ST.UX is `FRAME<<7` in the ROM, so a
    // `state.frame`-derived lateral term IS the sw8-1 mis-port wearing a new seam.
    // The attitude mechanism is phase-driven (seeded per wave, aim-integrated),
    // which our timebox expresses through `phaseTime`.
    const src = deathStarPlacement.toString()
    expect(src, 'deathStarPlacement reads the frame counter — ST.UX by another name').not.toMatch(
      /\.frame\b|ST\.?UX/,
    )
  })
})
