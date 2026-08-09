// src/core/basis.ts
//
// Story sw10-1 (AC #2) — the ROM-NATIVE world basis, and the single camera remap
// that replaces every per-model `*_ORIENT` axis hack.
//
// Source of truth: plugins/star-wars/docs/adr/native-basis-migration.md and the
// 1983 MACRO-11 source (WSGLOB/WSCPU/WSGRND). The cabinet authors every model,
// distance and spawn in its OWN basis:
//
//     X = depth   forward / away from the cockpit (the cockpit is the origin,
//                 enemies approach as X decreases, TIE spawn depth X = $7C00)
//     Y = right   screen +x
//     Z = up      screen +y
//
// The world now runs in that basis, so ROM data drops in UNROTATED. The only
// conversion is at the camera: one fixed remap carries native world space into the
// eye convention the SHARED `perspective`/`viewMatrix` expect (eye at the origin,
// looking down −Z, right = +x, up = +y). `math3d.ts` is shared with six other
// games and must not change, so that remap lives HERE, not there.
//
// PURE src/core: no DOM, no time, no randomness. This is projection/view MATH
// (which the core owns — the shell only consumes projected coordinates), not
// render orientation.

import { cross, normalize, dot, IDENTITY, type Vec3, type Mat4 } from '@shared/math3d'

/**
 * The geometry-preserving permutation from the OLD OpenGL world basis
 * (`[right(+x), up(+y), -depth(-z)]`) to the native basis (`[depth, right, up]`):
 *
 *     native = [ -current.z , current.x , current.y ]
 *
 * It is an orthogonal map, so it preserves every distance, angle, in-view and hit
 * relationship — which is why the migration permutes coordinate LITERALS while test
 * ASSERTIONS stay unchanged. Use it to bake old world-space data (model vertices,
 * fixture positions) into the native basis: `native = toNative(old)`.
 */
export function toNative(v: Vec3): Vec3 {
  return [-v[2], v[0], v[1]]
}

/**
 * `toNative` as a Mat4 (row-major), for baking model tables and orient matrices.
 * A native orient is the OLD orient conjugated by this: `M_native = P · M_old · Pᵀ`,
 * and a baked vertex is `P · M_old_orient · vertOld` (see the model re-bake, sw10-1).
 */
export const NATIVE_FROM_OPENGL: Mat4 = [
  0, 0, -1, 0,
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
]

/**
 * The camera's orientation for the native world (sw10-1). Passing it to the shared
 * `viewMatrix(camPosNative, CAMERA_ORIENT)` yields `WORLD_TO_EYE ∘ translation(−cam)`
 * — because `viewMatrix` inverts the orientation by transpose, and this matrix's
 * transpose IS the native→eye remap:
 *
 *     eye = [ native.right , native.up , −native.depth ]  =  [ Y , Z , −X ]
 *
 * so a native point projects through the UNCHANGED shared `perspective` exactly
 * where its OpenGL twin used to. This one matrix is the whole bridge that retires
 * `SURFACE_ORIENT` / `PORT_ORIENT` / `TOWER_ORIENT` / `TIE_ORIENT`.
 */
export const CAMERA_ORIENT: Mat4 = NATIVE_FROM_OPENGL

/**
 * Native-basis look rotation: a pure rotation whose local forward axis (+X, the
 * native depth axis — the ROM's nose) maps onto `forward`, with local +Y → right
 * and local +Z → up. This is the native twin of the shared `lookRotation` (which
 * maps local +Z → forward, the OpenGL convention we no longer author models in).
 *
 * Columns are `[forward, right, up]` in row-major storage: the passed `forward`
 * is planted on column 0, `[m[0], m[4], m[8]]`. NOTE this is THIS helper's own
 * convention, not the TIE's live-orient convention — the flight orient in `sim`
 * (`applyManeuver`/`aimOrient`) and `tie-status` (`computeStatus`) is the CONJUGATE
 * `P·M_old·Pᵀ`, whose nose reads back as −column 0, `[-m[0], -m[4], -m[8]]`; a
 * caller building a heading with THIS function passes the direction accordingly.
 * A zero `forward` yields IDENTITY; `up` defaults to native world-up (+Z) and
 * falls back when the heading is (near-)parallel to it (gimbal lock).
 */
export function lookRotationNative(forward: Vec3, up: Vec3 = [0, 0, 1]): Mat4 {
  const f = normalize(forward)
  if (f[0] === 0 && f[1] === 0 && f[2] === 0) return IDENTITY
  const ref: Vec3 = Math.abs(dot(f, up)) > 0.999 ? [1, 0, 0] : up
  const r = normalize(cross(ref, f)) // local +Y (right)
  const u = cross(f, r) // local +Z (up); unit, since f and r are orthonormal
  // Columns [f, r, u]: local x→f (nose), y→r (right), z→u (up).
  return [
    f[0], r[0], u[0], 0,
    f[1], r[1], u[1], 0,
    f[2], r[2], u[2], 0,
    0, 0, 0, 1,
  ]
}
