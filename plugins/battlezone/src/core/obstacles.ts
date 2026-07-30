// src/core/obstacles.ts
//
// Story bz1-2 — REWORK (Walter / DEV): byte-decoded from the real ROM image.
//
// The 21-obstacle ROM table (context-epic-bz1.md: "21 fixed obstacles
// (pyramids/blocks) at ROM-table positions and orientations; they block
// movement and shells, but do NOT appear on radar").
//
// ROM-VERIFIED — this table is now a byte-exact decode of the rev2 ROM image
// (local quarry: `~/Downloads/va-battlezone/Battlezone`, the 16KB ROM binary,
// cross-referenced against `Battlezone.dis65`'s labels). Citations:
//   * `obstacle_z_pos` — 21 x int16 LE — ROM address `$7681` (file offset
//     `$2681`; `Battlezone.dis65` label key "9857": Label "obstacle_z_pos",
//     Value 30337 = `$7681`). Comment at that table: "Obstacle coordinates.
//     There are 21 of them."
//   * `obstacle_x_pos` — 21 x int16 LE — ROM address `$76ab` (file offset
//     `$26ab`; label key "9899": Label "obstacle_x_pos", Value 30379 =
//     `$76ab`). Immediately follows `obstacle_z_pos` (21*2 = 42 bytes).
//   * `obstacle_t_f` ("type/facing") — 21 x 2 bytes — ROM address `$3fcc`
//     (identity-mapped region; label key "16332": Label "obstacle_t_f").
//     Comment: "Obstacle type and facing data. Each entry is two bytes. The
//     first is the object type, the second is the facing angle. (All
//     obstacles are symmetric, so every 90-degree turn effectively returns
//     to zero.)" Table terminates with a `$ff` sentinel byte immediately
//     after entry 21 (byte-verified: `rom[$3fcc + 21*2] === 0xff`).
//   * Facing byte → radians: the ROM uses an 8-bit angle wheel (0-255 = one
//     full turn) throughout — corroborated by an unrelated heading comment
//     in the disassembly expecting a ~180° turn to read "close to `$80`"
//     (`$80` = 128 = half of 256). `orientation = facing_byte * (2*PI/256)`.
//   * Type byte → `ObstacleType`: `$00` Narrow pyramid, `$0c` Wide pyramid,
//     `$01` Tall box, `$0f` Short box (`objects.html` object index,
//     unchanged from the original pull).
//   * Address→file-offset mapping used to read the raw ROM bytes, per
//     `Battlezone.dis65`'s `"AddressMap"`: file offset `0`→addr `$5000`
//     (12KB program ROM, `$5000-$7fff`) and file offset `$3000`→addr `$3000`
//     (identity — 4KB vector-generator ROM, `$3000-$3fff`), matching the
//     file header's own memory-map comment ("$5000-7fff: program ROM
//     (12KB)", "$3000-3fff: vector generator ROM (4KB)").
//
// All 21 (x, z) positions are pairwise distinct (asserted by
// `tests/core/obstacles.test.ts`). Distance from world origin ranges
// ~9441-46341 units, computed directly from the table below — this is NOT
// expected to sit inside the Math Box's near/far culling bounds
// ($03ff=1023 .. $7aff=31487, mathbox.html): that window clips by distance
// from the CAMERA at render time, not by an obstacle's fixed distance from
// world origin, and does not bound static placement. See the findings doc
// §3/§4 for the corrected framing (an earlier authored-era draft of this
// comment conflated the two before the byte decode).
//
// Decode verified against `VisBattlezone.cs` (the SourceGen visualizer
// plugin's `GenerateMap` routine): its 256x256 minimap reads only the HIGH
// byte of each 16-bit `obstacle_x_pos`/`obstacle_z_pos` word as a signed
// coarse position — every low byte in the ROM data is `0`, i.e. every
// decoded (x, z) value below is an exact multiple of 256, which matches
// `GenerateMap`'s assumption byte-for-byte (independent cross-check that the
// address/offset math above is correct, not just self-consistent).
//
// PURE data. No DOM, no time, no randomness — safe for the deterministic core.

/** The four ROM-named obstacle shapes (objects.html: $00, $0c, $01, $0f). */
export type ObstacleType = 'narrow-pyramid' | 'wide-pyramid' | 'tall-box' | 'short-box'

/** Declared taxonomy — every `Obstacle.type` must be a member of this set. */
export const OBSTACLE_TYPES: readonly ObstacleType[] = [
  'narrow-pyramid',
  'wide-pyramid',
  'tall-box',
  'short-box',
]

export interface Obstacle {
  /** Planar world X (planar-sim ruling: the world is flat, no y coordinate). */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  /** Heading, radians (matches `math3d.ts`'s `rotationY(theta)` convention). */
  readonly orientation: number
  readonly type: ObstacleType
}

/**
 * The 21-entry obstacle field. EXACTLY 21 — the single most load-bearing
 * number in this story (see `tests/core/obstacles.test.ts`).
 *
 * Byte-decoded from `obstacle_z_pos` ($7681) / `obstacle_x_pos` ($76ab) /
 * `obstacle_t_f` ($3fcc) — see the module header for the full citation.
 * Each entry's trailing comment cites its raw type/facing bytes.
 */
export const OBSTACLES: readonly Obstacle[] = [
  { x: 8192, z: 8192, orientation: 0.0, type: 'wide-pyramid' }, // #0: type=$0c facing=$00
  { x: 16384, z: 0, orientation: 0.392699, type: 'short-box' }, // #1: type=$0f facing=$10
  { x: -32768, z: 0, orientation: 0.785398, type: 'wide-pyramid' }, // #2: type=$0c facing=$20
  { x: -32768, z: 16384, orientation: 1.570796, type: 'short-box' }, // #3: type=$0f facing=$40
  { x: -32768, z: -32768, orientation: 0.589049, type: 'wide-pyramid' }, // #4: type=$0c facing=$18
  { x: 16384, z: -32768, orientation: 0.981748, type: 'narrow-pyramid' }, // #5: type=$00 facing=$28
  { x: 0, z: -32768, orientation: 1.178097, type: 'tall-box' }, // #6: type=$01 facing=$30
  { x: 0, z: 16384, orientation: 1.374447, type: 'narrow-pyramid' }, // #7: type=$00 facing=$38
  { x: 20480, z: 12288, orientation: 1.570796, type: 'tall-box' }, // #8: type=$01 facing=$40
  { x: 6144, z: -16384, orientation: 1.767146, type: 'short-box' }, // #9: type=$0f facing=$48
  { x: 17408, z: -2304, orientation: 1.963495, type: 'wide-pyramid' }, // #10: type=$0c facing=$50
  { x: 16384, z: -14336, orientation: 2.159845, type: 'narrow-pyramid' }, // #11: type=$00 facing=$58
  { x: -29696, z: -10240, orientation: 2.356194, type: 'tall-box' }, // #12: type=$01 facing=$60
  { x: 3072, z: -27648, orientation: 2.552544, type: 'short-box' }, // #13: type=$0f facing=$68
  { x: -6144, z: -26624, orientation: 2.748894, type: 'wide-pyramid' }, // #14: type=$0c facing=$70
  { x: -7168, z: -6144, orientation: 2.945243, type: 'narrow-pyramid' }, // #15: type=$00 facing=$78
  { x: -25600, z: 28672, orientation: 3.141593, type: 'tall-box' }, // #16: type=$01 facing=$80
  { x: -13312, z: 30720, orientation: 3.337942, type: 'short-box' }, // #17: type=$0f facing=$88
  { x: -19456, z: 16384, orientation: 3.534292, type: 'wide-pyramid' }, // #18: type=$0c facing=$90
  { x: -17408, z: 9216, orientation: 3.730641, type: 'narrow-pyramid' }, // #19: type=$00 facing=$98
  { x: -3072, z: 11264, orientation: 3.926991, type: 'tall-box' }, // #20: type=$01 facing=$a0
]
