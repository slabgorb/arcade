// tests/core/trench-far-end.test.ts
//
// Story sw8-4 (RE-SCOPED) — the trench "reads deep" by porting the ROM's dedicated
// FAR-END TERMINUS frame, not by raising the far cull. RED phase: these tests
// define the contract for a `trenchFarEnd` model that does NOT exist yet, so they
// are EXPECTED TO FAIL until Dev (GREEN) implements it.
//
// WHY THIS STORY EXISTS (see sprint/context/context-story-sw8-4.md, the RED-phase
// ruling): the original premise — "TRENCH_FAR=0x7000 is a clamp bug, raise it" —
// was REFUTED by the code + primary source. `$7000` is the cabinet's OWN far
// draw-cull (WSBASE.MAC BSVBOT/BSVFAR `CMPD #7000`; also the WSLAZR CLBLZ beam
// clip), cited in 3 audit pair files and already pinned by
// `swept-port-collision.test.ts:198` — `expect(TRENCH_FAR).toBe(0x7000)`. Raising
// it diverges from the cabinet AND reddens citations.
//
// The REAL defect: our `trenchChannel` builds rails + evenly-spaced RECYCLING ribs
// out to −TRENCH_FAR but draws NO far-end terminus — so at any scroll where the
// rib cage's last rung has slid forward, the −TRENCH_FAR plane is empty and the
// corridor just FADES instead of TERMINATING → it reads short. We ported the
// far-end NUMBER ($7000) and skipped the far-end MECHANISM.
//
// THE MECHANISM — WSBASE.MAC `BSVFAR` ("VIEW FAR END OF BASE TRENCH"): it walks the
// `TBSBF` table at ONE far depth (M.X0 = the clamped far reference), drawing a
// planar cross-section:
//
//     TBSBF:              ;FAR END LINE POINTS      (.RADIX 16 — HEX)
//       .WORD -400,0      ;TOP LEFT PANEL
//       .WORD -400,-1000  ;FAR LEFT BOTTOM
//       .WORD  400,-1000  ;FAR RIGHT BOTTOM
//       .WORD  400,0      ;TOP OF RIGHT PANEL
//
// i.e. (lateral, height) pairs in the trench's own ±$400 / $1000 frame — the same
// frame we carry as TRENCH_HALF_W (1024) and TRENCH_WALL_H (4096). As a polyline
// (4 points → 3 segments) it is a ∐: DOWN the left wall (top→floor), ACROSS the
// floor, UP the right wall (floor→top). OPEN at the top — the trench is an
// open-topped canyon; TBSBF has no closing top segment, so no bar is drawn across
// the sky. In our y=0-floor frame the ROM's top (height 0) becomes y=TRENCH_WALL_H
// and the ROM's bottom (−$1000) becomes y=0.
//
// SEAT DEPTH (BSVFAR): M.X0 = min(true-end-distance, #7000). With no true end in
// view (the faithful MID-RUN case) it is pinned #7000 ahead of the viewer — it does
// NOT recycle toward the camera like the ribs; it stays at the far reference,
// which is exactly what makes $7000 of depth READ as a tunnel with an end.
//
// THE CONTRACT this suite asks Dev to implement:
//   src/core/trench-detail.ts (mirrors trenchWallDetail — a SEPARATE pure Model3D):
//     export function trenchFarEnd(scroll: number): Model3D
//
// Constants are referenced BY NAME (never hard-coded), so the tests stay correct
// against the pinned ROM envelope. Per the repo's RED convention, `tsc`/vitest are
// red until `trenchFarEnd` exists.
//
// AC MAP:
//   AC1 (pin TRENCH_FAR===0x7000) — NOT re-asserted here; the canonical guard lives
//        at tests/core/swept-port-collision.test.ts:198. These tests DEPEND on
//        TRENCH_FAR by name, tying the terminus to that pin. Do NOT duplicate.
//   AC2 (port the TBSBF terminus) — this suite.
//   AC3/AC4 (reads-deep / side-gun legibility) — visual QA vs the longplay, not unit.
//   AC5 (existing trench suites stay green) — verified by the RED runner; this file
//        only ADDS a model, it does not touch trenchChannel/trenchWallDetail.

import { describe, it, expect } from 'vitest'
import { trenchFarEnd } from '../../src/core/trench-detail'
import {
  TRENCH_HALF_W,
  TRENCH_WALL_H,
  TRENCH_FAR,
  RIB_Z,
} from '../../src/core/trench-channel'
import type { Model3D } from '../../src/core/models'

const EPS = 1e-6

/** Distinct z values in the model. A planar cross-section shares exactly one. */
function zsOf(m: Model3D): number[] {
  return [...new Set(m.vertices.map((v) => v[2]))]
}

/** VERTICAL edges — the wall runs: both endpoints share x AND z, differ in y. */
function verticalEdges(m: Model3D): { x: number; z: number; yLo: number; yHi: number }[] {
  const out: { x: number; z: number; yLo: number; yHi: number }[] = []
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (Math.abs(va[0] - vb[0]) < EPS && Math.abs(va[2] - vb[2]) < EPS && Math.abs(va[1] - vb[1]) > EPS) {
      out.push({ x: va[0], z: va[2], yLo: Math.min(va[1], vb[1]), yHi: Math.max(va[1], vb[1]) })
    }
  }
  return out
}

/** LATERAL edges — runs across X at a constant height: share y AND z, differ in x. */
function lateralEdges(m: Model3D): { y: number; z: number; xLo: number; xHi: number }[] {
  const out: { y: number; z: number; xLo: number; xHi: number }[] = []
  for (const [a, b] of m.edges) {
    const va = m.vertices[a]
    const vb = m.vertices[b]
    if (Math.abs(va[1] - vb[1]) < EPS && Math.abs(va[2] - vb[2]) < EPS && Math.abs(va[0] - vb[0]) > EPS) {
      out.push({ y: va[1], z: va[2], xLo: Math.min(va[0], vb[0]), xHi: Math.max(va[0], vb[0]) })
    }
  }
  return out
}

// --- AC2: well-formed, pure Model3D (the sacred core/shell boundary) ----------

describe('sw8-4 — trenchFarEnd: a well-formed, pure Model3D', () => {
  it('returns a Model3D with vertices and edges', () => {
    const m = trenchFarEnd(0)
    expect(typeof m.name).toBe('string')
    expect(Array.isArray(m.vertices)).toBe(true)
    expect(Array.isArray(m.edges)).toBe(true)
    expect(m.vertices.length).toBeGreaterThan(0)
    expect(m.edges.length).toBeGreaterThan(0)
  })

  it('every vertex is a finite 3D point', () => {
    for (const v of trenchFarEnd(0).vertices) {
      expect(v).toHaveLength(3)
      expect(Number.isFinite(v[0])).toBe(true)
      expect(Number.isFinite(v[1])).toBe(true)
      expect(Number.isFinite(v[2])).toBe(true)
    }
  })

  it('every edge indexes two distinct, in-range vertices (no degenerate edges)', () => {
    const m = trenchFarEnd(0)
    for (const [a, b] of m.edges) {
      expect(Number.isInteger(a)).toBe(true)
      expect(Number.isInteger(b)).toBe(true)
      expect(a).not.toBe(b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(m.vertices.length)
      expect(b).toBeLessThan(m.vertices.length)
    }
  })

  it('is pure & deterministic — identical geometry for identical scroll (no DOM/time/random leak)', () => {
    expect(trenchFarEnd(0)).toEqual(trenchFarEnd(0))
    expect(trenchFarEnd(137.5)).toEqual(trenchFarEnd(137.5))
  })
})

// --- AC2: the TBSBF ∐ — down left wall, across floor, up right wall -----------

describe('sw8-4 — trenchFarEnd draws the TBSBF ∐ (down left wall · across floor · up right wall)', () => {
  it('runs a full-height vertical wall edge on EACH wall (floor 0 → top TRENCH_WALL_H)', () => {
    const m = trenchFarEnd(0)
    const walls = verticalEdges(m)
    const left = walls.find((e) => Math.abs(e.x - -TRENCH_HALF_W) < EPS)
    const right = walls.find((e) => Math.abs(e.x - TRENCH_HALF_W) < EPS)
    expect(left, 'left wall run present at x=−TRENCH_HALF_W').toBeDefined()
    expect(right, 'right wall run present at x=+TRENCH_HALF_W').toBeDefined()
    // TBSBF: TOP LEFT PANEL → FAR LEFT BOTTOM and FAR RIGHT BOTTOM → TOP OF RIGHT PANEL.
    expect(left!.yLo).toBeCloseTo(0)
    expect(left!.yHi).toBeCloseTo(TRENCH_WALL_H)
    expect(right!.yLo).toBeCloseTo(0)
    expect(right!.yHi).toBeCloseTo(TRENCH_WALL_H)
  })

  it('runs a floor edge across the FULL channel width at y=0 (FAR LEFT BOTTOM → FAR RIGHT BOTTOM)', () => {
    const m = trenchFarEnd(0)
    const floor = lateralEdges(m).find((e) => Math.abs(e.y) < EPS)
    expect(floor, 'floor edge present at y=0').toBeDefined()
    expect(floor!.xLo).toBeCloseTo(-TRENCH_HALF_W)
    expect(floor!.xHi).toBeCloseTo(TRENCH_HALF_W)
  })

  it('is OPEN at the top — NO lateral "lid" edge across the far end', () => {
    // TBSBF is 4 points → 3 segments; it never connects TOP LEFT PANEL to TOP OF
    // RIGHT PANEL. The trench is an open-topped canyon (trenchChannel likewise has
    // no top lateral rib). A bar across the two top corners would draw a lid across
    // the sky the cabinet never draws — the ∐ must stay open.
    const topBars = lateralEdges(trenchFarEnd(0)).filter((e) => Math.abs(e.y - TRENCH_WALL_H) < EPS)
    expect(topBars, 'the ∐ is open at the top — no top lateral bar').toHaveLength(0)
  })

  it('spans the full envelope: x = ±TRENCH_HALF_W, y = 0 → TRENCH_WALL_H, both walls cornered', () => {
    const m = trenchFarEnd(0)
    const xs = m.vertices.map((v) => v[0])
    const ys = m.vertices.map((v) => v[1])
    expect(Math.min(...xs)).toBeCloseTo(-TRENCH_HALF_W)
    expect(Math.max(...xs)).toBeCloseTo(TRENCH_HALF_W)
    expect(Math.min(...ys)).toBeCloseTo(0) // floor
    expect(Math.max(...ys)).toBeCloseTo(TRENCH_WALL_H) // wall top
    // Both walls carry BOTH corners (floor + top) — the four TBSBF points.
    for (const x of [-TRENCH_HALF_W, TRENCH_HALF_W]) {
      const floorCorner = m.vertices.some((v) => Math.abs(v[0] - x) < EPS && Math.abs(v[1]) < EPS)
      const topCorner = m.vertices.some((v) => Math.abs(v[0] - x) < EPS && Math.abs(v[1] - TRENCH_WALL_H) < EPS)
      expect(floorCorner, `floor corner present at x=${x}`).toBe(true)
      expect(topCorner, `top corner present at x=${x}`).toBe(true)
    }
  })

  it('is mirror-symmetric across x=0 (for every (x,y,z) there is a (−x,y,z))', () => {
    const m = trenchFarEnd(0)
    const key = (v: readonly number[]) => `${v[0].toFixed(6)}|${v[1].toFixed(6)}|${v[2].toFixed(6)}`
    const present = new Set(m.vertices.map(key))
    for (const v of m.vertices) {
      expect(present.has(key([-v[0], v[1], v[2]]))).toBe(true)
    }
  })
})

// --- AC2: seated at the ROM far reference (−TRENCH_FAR), planar ---------------

describe('sw8-4 — trenchFarEnd seats at the far reference depth −TRENCH_FAR', () => {
  it('is PLANAR — the whole cross-section sits at ONE depth (BSVFAR draws all points at M.X0)', () => {
    expect(zsOf(trenchFarEnd(0))).toHaveLength(1)
  })

  it('seats at the far reference: within one RIB_Z of −TRENCH_FAR, and never BEYOND the $7000 cull', () => {
    // BSVFAR clamps the far reference to a MAX of #7000 (LDD #7000 when no end in
    // view) — the terminus is never drawn past −TRENCH_FAR. Context grants a ±RIB_Z
    // seat latitude (Dev may snap it to the farthest rib station); per BSVFAR's
    // clamp + AC1/AC5 that latitude is one-sided toward the cockpit — see the TEA
    // deviation. So the faithful window is [−TRENCH_FAR, −TRENCH_FAR + RIB_Z].
    const z = zsOf(trenchFarEnd(0))[0]
    expect(z, 'never drawn beyond the ROM $7000 far cull').toBeGreaterThanOrEqual(-TRENCH_FAR - EPS)
    expect(z, 'seated at the far end, within one rib of the cull').toBeLessThanOrEqual(-TRENCH_FAR + RIB_Z + EPS)
  })

  it('MID-RUN it stays pinned at the far reference (±RIB_Z) as the channel scrolls — it does NOT recycle toward the camera', () => {
    // The rib cage recycles every RIB_Z, leaving the −TRENCH_FAR plane empty most
    // of the time (why the corridor "fades"). The terminus must NOT do that: BSVFAR
    // keeps it #7000 ahead of the viewer while no true end is in view, so it stays
    // at the far end for every scroll. (Static-at-−TRENCH_FAR is the strict reading;
    // snap-to-station is the ±RIB_Z latitude the context grants — both pass.)
    for (const s of [0, RIB_Z / 3, RIB_Z * 2.25, 1.0, -RIB_Z * 1.5]) {
      const zs = zsOf(trenchFarEnd(s))
      expect(zs, `planar at scroll=${s}`).toHaveLength(1)
      expect(zs[0], `at scroll=${s}: not beyond the $7000 cull`).toBeGreaterThanOrEqual(-TRENCH_FAR - EPS)
      expect(zs[0], `at scroll=${s}: still pinned at the far end`).toBeLessThanOrEqual(-TRENCH_FAR + RIB_Z + EPS)
    }
  })
})
