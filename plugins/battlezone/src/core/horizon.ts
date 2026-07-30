// src/core/horizon.ts
//
// Story bz1-3 — the background skyline: horizon line + mountains + crescent
// moon (bz3-6 / H-008 removed the invented volcano cone silhouette below).
//
// Story bz3-8 (findings H-002/H-003) CORRECTED the premise below: it was a
// disassembly-only sweep that missed BZMTNS.MAC, whose hand-authored MTN0-7
// vector data IS the mountain-scape ("the disassembly quarry holds no horizon
// picture data" was false). MTNS (BZMTNS.MAC:11-18) dispatches eight ridge
// segments MTN0..MTN7 (`models.ts`'s `MTN_SEGMENTS`), each a run of relative
// `VCTR dx,dy,brite` pen strokes, with the MOON embedded inside MTN0 (brite
// tiers 7/2/5). `deriveMtnPanorama()` below walks those strokes into this
// module's angular space, replacing the old procedural two-sine ridge and
// independently-authored crescent moon. VOLCANO was untouched by bz3-8
// (H-008, left for this story).
//
// PANORAMA lives in ANGULAR space — polylines of [azimuth, elevation] radians
// — because it sits at infinity: only direction matters, never distance.
// Azimuth shares the world heading convention (0 = +Z, increasing
// counter-clockwise toward +X).
//
// BACKDROP_FOV — pinned to H_FOV (the quarry-CONFIRMED 45° cone). The epic
// context also claims a 90° backdrop span, which the findings doc (§10) could
// neither confirm nor deny. bz2-3 widened the 3D SCENE to the ~90° DISPLAY_FOV
// (so obstacles/enemies read at the correct distance) but deliberately left the
// backdrop at 45° here: that scene/backdrop divergence is the authentic §7
// object/background parallax ("objects move out of sync with the background").
// Whether the backdrop should ALSO widen is deferred to bz1-12 / the
// epic-closing playtest — out of scope for bz2-3 (obstacles & enemies only).
//
// THE ANGLE WHEEL: azimuth−heading offsets are quantized onto an integer wheel
// of 2^20 steps per turn (the ROM itself ran a 256-step wheel — ours is finer
// for smooth scroll). Integer steps make the backdrop EXACTLY periodic:
// heading and heading + 2π land on identical wheel steps, so the rendered
// skyline is bit-identical — float drift from adding 2π cannot leak into
// output (the determinism/wrap ACs demand deep equality).
//
// bz3-6 / H-008: the invented static volcano cone silhouette is REMOVED — the
// ROM has no such cone (BZONE.MAC:1318 "MOVE BEAM TO TOP OF VOLCANO" is only a
// beam move to a MTNS ridge peak, not a drawn outline). `VOLCANO_PEAK` below
// names that peak's angular position for the H-006 eruption sim/render (the
// VOLCNO rock ejecta, driven by `debris.ts`'s engine) to plot its rocks at —
// eruption physics/animation is sim territory (core/sim.ts), not this
// backdrop module, which stays PURE authored/derived geometry.
//
// PURE and deterministic. No DOM, no time, no randomness.

import { H_FOV } from './camera'
import type { SceneSegment } from './scene'
import { MTN_SEGMENTS, type MtnStroke } from './models'

/** One backdrop polyline in angular space: points are [azimuth, elevation]. */
export interface PanoramaPolyline {
  readonly name: 'mountains' | 'volcano' | 'moon'
  readonly points: readonly (readonly [number, number])[]
}

/** Horizontal span of backdrop visible at once — see the header note. */
export const BACKDROP_FOV = H_FOV

const TAU = 2 * Math.PI

// --- Ridge & moon, derived from the ROM's MTN_SEGMENTS stroke data ---------
//
// Re-export the RED contract's names directly off `models.ts`, where the
// byte-exact ROM decode lives (this module's other authored geometry is
// small hand-picked polylines, not raw ROM strokes — see models.ts's own
// "Mountain-scape backdrop ridge" section for the citations).
export { MTN_SEGMENTS }
export type { MtnStroke }

/** `MTNS` JSRLs MTN0 first, and the moon (H-003) rides embedded inside IT,
 * strokes 17..48 (BZMTNS.MAC:36-67, brite tiers 7/2/5 — see models.ts). */
const MOON_SEGMENT = 0
const MOON_START = 17
const MOON_END = 49 // exclusive

// Every MTN_SEGMENTS entry sums its deltas to exactly [dx, dy] = [512, 0] (a
// closed vertical loop) — 8 segments × 512 = 4096 vector-generator units per
// full 360° turn. One shared scale converts BOTH axes (dx → azimuth, dy →
// elevation) since the ROM authored both in the same coordinate system.
const VECTOR_UNITS_PER_TURN = 4096
const VECTOR_UNIT_RAD = TAU / VECTOR_UNITS_PER_TURN

/**
 * Walk the ROM's relative VCTR deltas into angular-space polylines. A brite-0
 * stroke is a pen-up MOVE: it repositions the cursor without drawing, which
 * breaks whatever polyline is in progress. Runs of consecutive draws of the
 * SAME family (the plain ridge vs. the MTN0-embedded moon) chain into one
 * polyline, exactly as the vector generator's beam traces them.
 */
function deriveMtnPanorama(): PanoramaPolyline[] {
  const out: PanoramaPolyline[] = []
  let cx = 0
  let cy = 0
  let current: { name: 'mountains' | 'moon'; points: Array<readonly [number, number]> } | null = null

  const flush = (): void => {
    if (current && current.points.length >= 2) out.push(current)
    current = null
  }

  MTN_SEGMENTS.forEach((segment, segIndex) => {
    segment.forEach((stroke: MtnStroke, strokeIndex) => {
      const [dx, dy, brite] = stroke
      const prev: readonly [number, number] = [cx * VECTOR_UNIT_RAD, cy * VECTOR_UNIT_RAD]
      cx += dx
      cy += dy
      if (brite === 0) {
        flush()
        return
      }
      const isMoon = segIndex === MOON_SEGMENT && strokeIndex >= MOON_START && strokeIndex < MOON_END
      const name = isMoon ? 'moon' : 'mountains'
      if (!current || current.name !== name) {
        flush()
        current = { name, points: [prev] }
      }
      current.points.push([cx * VECTOR_UNIT_RAD, cy * VECTOR_UNIT_RAD])
    })
  })
  flush()
  return out
}

/** The mountain ridge + embedded moon, both derived from `MTN_SEGMENTS`. */
const MTN_PANORAMA: readonly PanoramaPolyline[] = deriveMtnPanorama()

/** The full backdrop: mountains ring the plain, the moon accents it (bz3-6 /
 *  H-008 removed the invented free-standing volcano cone — see the header). */
export const PANORAMA: readonly PanoramaPolyline[] = [...MTN_PANORAMA]

/**
 * bz3-6 / H-006 + H-008: the angular [azimuth, elevation] of the volcano's
 * eruption point — a MTNS ridge peak, not a free-standing authored shape (the
 * ROM's `JSR VGCNTR ;C MOVE BEAM TO TOP OF VOLCANO`, BZONE.MAC:1318, targets
 * an un-decoded ROM angle rather than a coordinate this port can cite
 * directly). The ridge's own tallest vertex is the most plausible faithful
 * stand-in — any real peak reads as "the volcano" once it starts throwing
 * rocks — so this derives it from the same MTN_PANORAMA data the ridge itself
 * comes from, rather than inventing a fresh coordinate. Used by sim.ts's
 * eruption step and main.ts's render to place the VOLCNO ejecta dots.
 */
export const VOLCANO_PEAK: readonly [number, number] = (() => {
  let best: readonly [number, number] = [0, 0]
  for (const line of MTN_PANORAMA) {
    if (line.name !== 'mountains') continue
    for (const p of line.points) if (p[1] > best[1]) best = p
  }
  return best
})()

// --- Angular → NDC mapping -------------------------------------------------

/** Wheel resolution: steps per full turn. */
const WHEEL = 1 << 20

/** Half the visible span, in wheel steps (BACKDROP_FOV/2 · WHEEL/2π = 65536). */
const HALF_VIEW_STEPS = Math.round((BACKDROP_FOV / 2) * (WHEEL / TAU))

/** Signed shortest azimuth−heading offset on the integer wheel. */
function offsetSteps(azimuth: number, heading: number): number {
  const turns = (azimuth - heading) / TAU
  const frac = turns - Math.floor(turns) // [0, 1)
  const steps = Math.round(frac * WHEEL) % WHEEL
  return steps >= WHEEL / 2 ? steps - WHEEL : steps
}

/**
 * Map a backdrop direction to NDC, or null when outside the horizontal view.
 * x is linear in the wheel offset (−offset/half-view: azimuth = heading is
 * dead centre; +BACKDROP_FOV/2 is the LEFT edge, since world +X is screen
 * left). y rises with elevation through the backdrop's own 45° vertical scale
 * (tan(H_FOV/2)/aspect). The backdrop is a UNIFORM 45° projection — azimuth via
 * BACKDROP_FOV, elevation here — and is INDEPENDENT of the 3D scene's wider
 * DISPLAY_FOV (bz2-3 widened the scene, not the backdrop; the §7 object/
 * background parallax applies vertically too). y is heading-independent — the
 * camera never pitches.
 *
 * `bounce` (bz3-9 / H-007, default 0): MOUNTS (BZONE.MAC:1265-1270, `LDA
 * BOUNCE` + four LSRs) shifts the beam's Y-offset register by BOUNCE>>4
 * vector-generator units before drawing the ridge — the SAME beam-position
 * coordinate space `VECTOR_UNIT_RAD` above already converts (the MTN_SEGMENTS
 * stroke deltas). Modeled as a pre-projection elevation shift so it rides this
 * function's existing tan() mapping; subtracting moves the backdrop DOWN
 * (BZONE.MAC:1271-1277 `SBC`), matching the ROM's downward bob on collision.
 */
export function panoramaToNdc(
  azimuth: number,
  elevation: number,
  heading: number,
  aspect: number,
  bounce = 0,
): readonly [number, number] | null {
  const steps = offsetSteps(azimuth, heading)
  if (Math.abs(steps) > HALF_VIEW_STEPS) return null
  const x = -steps / HALF_VIEW_STEPS
  const bobbedElevation = elevation - (bounce >> 4) * VECTOR_UNIT_RAD
  // H_FOV (45°), NOT the scene's DISPLAY_FOV — the backdrop stays at its own 45°
  // scale on purpose (see the header + JSDoc). Do not "sync" this to DISPLAY_FOV.
  const y = Math.tan(bobbedElevation) / (Math.tan(H_FOV / 2) / aspect)
  return [x, y]
}

/**
 * The assembled backdrop for one frame: the full-width horizon line (level, at
 * NDC y = 0 at rest — the eye is level on a flat plain, ground and sky meet on
 * the eye axis), plus every panorama edge whose endpoints are both in view.
 *
 * `bounce` (bz3-9 / H-007, default 0): forwarded to every `panoramaToNdc` call
 * so the mountain ridge + moon bob together, in sync with the Z view jolt
 * (camera.ts's `tankView`) — both driven from the SAME core `bounce` value.
 *
 * bz4-1 (H-007 residual, AC-2): the horizon line rides that SAME bounced beam
 * origin as the ridge. MOUNTS positions the beam at the bounced `XCOMP+2`
 * (BZONE.MAC:1273-1275 `SBC BOUNCE>>4`) and draws BOTH the ridge and the
 * horizon line from it (:1279-1282 `JSR VGVTR2 ;POSITION BEAM` → `JSR VGJSRL
 * ;ADD HORIZON LINE`), so the line is no longer exempt at y = 0 (bz3-9 left it
 * so). Its y is the elevation-0 point's bobbed NDC y under the same `bounce` —
 * a level, full-width line lowered together with the ridge, and still pinned at
 * y = 0 below the shared `BOUNCE>>4 == 0` floor (the ridge's own threshold).
 */
export function skylineSegments(
  heading: number,
  aspect: number,
  bounce = 0,
): readonly SceneSegment[] {
  // The shared bounced beam origin: a zero-elevation point's bobbed y (azimuth
  // is irrelevant to y, so any in-view direction works — heading is dead-centre
  // and always in view). Reuses `panoramaToNdc`'s BOUNCE>>4 scale so the line
  // and the ridge move in exact lockstep.
  const horizonY = panoramaToNdc(heading, 0, heading, aspect, bounce)![1]
  const segments: SceneSegment[] = [{ x1: -1, y1: horizonY, x2: 1, y2: horizonY }]
  for (const line of PANORAMA) {
    for (let i = 1; i < line.points.length; i++) {
      const a = panoramaToNdc(line.points[i - 1][0], line.points[i - 1][1], heading, aspect, bounce)
      const b = panoramaToNdc(line.points[i][0], line.points[i][1], heading, aspect, bounce)
      if (a !== null && b !== null) {
        segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
      }
    }
  }
  return segments
}
