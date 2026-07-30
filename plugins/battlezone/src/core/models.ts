// src/core/models.ts
//
// Story bz1-2 — REWORK (Walter / DEV): byte-decoded from the real ROM image.
//
// 3D wireframe model registry — mirrors star-wars/src/core/models.ts in shape
// (`Model3D { name, vertices, edges }`) and convention (edges are index pairs
// into `vertices`).
//
// ROM-VERIFIED — every model below except `EXPLOSION_DEBRIS` (see its own
// note) is a byte-exact decode of the rev2 ROM image (local quarry:
// `~/Downloads/va-battlezone/Battlezone`, cross-referenced against
// `Battlezone.dis65` and the SourceGen visualizer plugin `VisBattlezone.cs`,
// whose `GenerateWireframe()` is the canonical decoding algorithm this port
// re-implements in TypeScript-adjacent pseudocode terms below).
//
// FORMAT (objects.html, ROM-confirmed by decode):
//   * A 44-entry VERTEX POINTER table at `$388e` (`P_VTAB_OFFSET` default in
//     `VisBattlezone.cs`) — one little-endian 16-bit ROM address per shape
//     index (0-43), pointing at that shape's vertex blob.
//   * A 44-entry COMMAND POINTER table at `$7472` (file offset `$2472`;
//     `P_CTAB_OFFSET` default) — one address per shape index, pointing at
//     that shape's draw-command byte stream. This is the SAME `$7472` table
//     cited in the epic/story context for "3D object/vertex specs" — it is
//     the shared shape-geometry table used for every drawable object,
//     including the four obstacle shapes (`$00`/`$0c`/`$01`/`$0f`), which is
//     why `src/core/obstacles.ts`'s placement table and this file's geometry
//     table cite different ROM addresses: placement ($7681/$76ab/$3fcc) and
//     shape geometry ($388e/$7472) are independent tables.
//   * Each vertex blob: a length byte, then N vertices of 6 bytes each — 16-
//     bit LE (Z, X, Y). Decode per `VisBattlezone.cs`: `xc = -rawX`,
//     `yc = rawY * 2` (compensates the Math Box's X/Z-halving so all three
//     axes share one scale), `zc = rawZ` — vertex stored as `[xc, yc, zc]`.
//   * Each command blob: bytes until `$ff`. `vindex = byte >> 3`,
//     `cmd = byte & 0x07`. `cmd 4` = draw edge (current beam position →
//     vindex, then beam moves to vindex); `cmd 0/2/3` move the beam without
//     drawing an edge (cmd 0 additionally plots a single point); `cmd 1`
//     sets intensity; `cmd 5` draws a hardware-canned scaled dot-burst
//     sprite at the given vertex (used only by `$0e`, see below); `cmd 6` is
//     a no-op. The beam starts at a synthetic center vertex `(0,0,0)`,
//     included in a model's `vertices` only if an edge actually touches it.
//
// Shape index → object identity (objects.html index + `Battlezone.dis65`
// inline comments, e.g. "missile is type $16, so Y pos is at index 6"):
//   `$00` narrow pyramid · `$01` tall box · `$02` Slow Tank · `$03`
//   Projectile · `$0c` wide pyramid · `$0e` projectile explosion · `$0f`
//   short box · `$16` Missile · `$20` Saucer · `$21` Super Tank · `$24`-`$2b`
//   "Spatter" debris drops (8 shapes).
//
// EXPLOSION_DEBRIS — the one model NOT ROM-exact in topology, and why: shape
// `$0e` ("projectile explosion") decodes to a SINGLE vertex with ZERO draw
// commands (it is drawn via `cmd 5`, a hardware-canned dot-burst sprite
// scaled/positioned at that one point — the burst's own dot pattern lives
// outside the vertex/command tables this story decodes). Shapes `$24`-`$2b`
// ("Spatter" debris) each decode to 8 vertices connected by ZERO edges — the
// ROM draws each one as 8 individual POINTS (`cmd 0`), never as connected
// line segments. `Model3D` (this file's own type, ported from star-wars) has
// no point primitive, only `edges: [number, number][]` — a real
// representational mismatch between the ROM's point-sprite debris and this
// project's wireframe-only schema, not a decode error. Resolution: the 8
// vertex POSITIONS below are the ROM-exact `$24` ("spatter0") points, plus
// the ROM-exact `$0e` origin point as vertex 8; the 8 EDGES (origin → each
// point) are an AUTHORED connectivity choice (radiating shrapnel) so the
// model satisfies `Model3D`'s wireframe contract and stays well-formed (no
// orphans) — flagged as a Delivery Finding, not silently ROM-exact.
//
// WELL-FORMEDNESS: every model here (decoded straight off the ROM, or the
// documented EXPLOSION_DEBRIS hybrid) is valid indices / no self-edges / no
// duplicate undirected edges / no orphan vertices — verified against
// `VisBattlezone.cs`'s own `VisWireframe.Validate()` gate before porting (see
// the session file's decode-verification note for the spot-match method).
//
// PURE data. No DOM, no time, no randomness — safe for the deterministic core.

import type { Vec3 } from '@shared/math3d'

export interface Model3D {
  readonly name: string
  /** Vertices in object space. */
  readonly vertices: readonly Vec3[]
  /** Line segments as index pairs into `vertices` (wireframe). */
  readonly edges: readonly (readonly [number, number])[]
}

// --- Obstacle shapes (objects.html: $00, $0c, $01, $0f) -------------------

/** `$00` "Narrow pyramid" — ROM-decoded (vertex tbl $38e6, cmd tbl $74cb). */
export const NARROW_PYRAMID: Model3D = {
  name: 'narrow-pyramid (obstacle)',
  vertices: [
    [512, -640, -512],
    [-512, -640, -512],
    [-512, -640, 512],
    [512, -640, 512],
    [0, 640, 0],
  ],
  edges: [
    [0, 4], [4, 1], [1, 0], [0, 3], [3, 4], [4, 2], [2, 3], [2, 1],
  ],
}

/** `$0c` "Wide pyramid" — ROM-decoded (vertex tbl $3c3b, cmd tbl $74cb). */
export const WIDE_PYRAMID: Model3D = {
  name: 'wide-pyramid (obstacle)',
  vertices: [
    [800, -640, -800],
    [-800, -640, -800],
    [-800, -640, 800],
    [800, -640, 800],
    [0, 800, 0],
  ],
  edges: [
    [0, 4], [4, 1], [1, 0], [0, 3], [3, 4], [4, 2], [2, 3], [2, 1],
  ],
}

/** `$01` "Tall box" — ROM-decoded (vertex tbl $3905, cmd tbl $74d7). */
export const TALL_BOX: Model3D = {
  name: 'tall-box (obstacle)',
  vertices: [
    [512, -640, -512], [-512, -640, -512], [-512, -640, 512], [512, -640, 512],
    [512, 640, -512], [-512, 640, -512], [-512, 640, 512], [512, 640, 512],
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 7],
    [7, 4], [5, 1], [2, 6], [7, 3],
  ],
}

/** `$0f` "Short box" — ROM-decoded (vertex tbl $3c5a, cmd tbl $74d7). */
export const SHORT_BOX: Model3D = {
  name: 'short-box (obstacle)',
  vertices: [
    [640, -640, -640], [-640, -640, -640], [-640, -640, 640], [640, -640, 640],
    [640, -80, -640], [-640, -80, -640], [-640, -80, 640], [640, -80, 640],
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 7],
    [7, 4], [5, 1], [2, 6], [7, 3],
  ],
}

// --- Hostiles & bonus visitor (objects.html: $02, $21, $16/missile, $20) ---

/** `$02` "Slow Tank" (1000-pt hostile) — ROM-decoded (vertex tbl $3955, cmd tbl $74e9). */
export const SLOW_TANK: Model3D = {
  name: 'Slow Tank',
  vertices: [
    [512, -640, -736], [-512, -640, -736], [-512, -640, 968], [512, -640, 968],
    [568, -416, -1024], [-568, -416, -1024], [-568, -416, 1248], [568, -416, 1248],
    [344, -240, -680], [-344, -240, -680], [-344, -240, 680], [344, -240, 680],
    [168, 96, -512], [-168, 96, -512],
    [40, -16, -128], [-40, -16, -128], [-40, -96, 128], [40, -96, 128],
    [-40, -16, 1120], [-40, -96, 1120], [40, -16, 1120], [40, -96, 1120],
    [0, 96, -512], [0, 160, -512],
  ],
  edges: [
    [23, 22], [12, 13], [14, 20], [20, 18], [18, 15], [15, 14], [14, 17],
    [17, 16], [16, 19], [19, 21], [21, 17], [15, 16], [19, 18], [20, 21],
    [3, 0], [0, 4], [4, 7], [7, 6], [6, 2], [2, 3], [3, 7], [7, 11],
    [11, 10], [10, 6], [6, 5], [5, 9], [9, 10], [10, 13], [13, 9], [9, 8],
    [8, 11], [11, 12], [12, 8], [8, 4], [4, 5], [5, 1], [1, 2], [1, 0],
  ],
}

/** `$21` "Super Tank" (3000-pt hostile) — ROM-decoded (vertex tbl $3f17, cmd tbl $75ff). */
export const SUPER_TANK: Model3D = {
  name: 'Super Tank',
  vertices: [
    [-368, -640, 1456], [-552, -640, -456], [552, -640, -456], [368, -640, 1456],
    [-456, -184, -456], [456, -184, -456], [0, -552, 1096],
    [-272, -232, -272], [-272, -184, -456], [272, -184, -456], [272, -232, -272],
    [-184, 88, -272], [-184, 88, -456], [184, 88, -456], [184, 88, -272],
    [-88, -88, 1280], [-88, -88, 88], [88, -88, 88], [88, -88, 1280],
    [-88, 0, 1280], [-88, 0, -88], [88, 0, -88], [88, 0, 1280],
    [0, 88, -456], [0, 552, -456],
  ],
  edges: [
    [0, 1], [1, 4], [4, 0], [0, 3], [3, 2], [2, 5], [5, 3], [2, 1], [4, 5],
    [9, 10], [10, 6], [6, 14], [14, 13], [13, 9], [9, 8], [8, 7], [7, 6],
    [6, 11], [11, 12], [12, 8], [12, 13], [14, 11],
    [19, 22], [22, 21], [21, 20], [20, 16], [16, 15], [15, 18], [18, 17],
    [17, 16], [15, 19], [22, 18], [17, 21],
    [23, 24],
  ],
}

/** `$16` "Missile" (2000-pt upgraded hostile) — ROM-decoded (vertex tbl $3c8b, cmd tbl $757c). */
export const MISSILE: Model3D = {
  name: 'Missile',
  vertices: [
    [-144, 0, -384], [-72, 96, -384], [72, 96, -384], [144, 0, -384], [72, -96, -384], [-72, -96, -384],
    [-288, 0, -96], [-192, 192, -96], [192, 192, -96], [288, 0, -96], [192, -192, -96], [-192, -192, -96],
    [0, 0, 1152], [0, 0, 1392],
    [144, -336, -144], [-144, -336, -144], [-144, -336, 144], [144, -336, 144],
    [48, -184, -48], [-48, -184, -48], [-48, -168, 48], [48, -168, 48],
    [0, 192, -96], [-72, 96, 528], [72, 96, 528], [0, 288, 48],
  ],
  edges: [
    [13, 12], [12, 6], [6, 0], [0, 1], [1, 7], [7, 8], [8, 9], [9, 10],
    [10, 11], [11, 6], [6, 7], [7, 12], [12, 8], [8, 2], [2, 3], [3, 9],
    [9, 12], [12, 10], [10, 4], [4, 5], [5, 11], [11, 12],
    [24, 23], [23, 22], [22, 24], [24, 25], [25, 23], [25, 22],
    [1, 2], [3, 4], [5, 0],
    [18, 19], [19, 20], [20, 21], [21, 18], [18, 14], [14, 15], [15, 16],
    [16, 17], [17, 14], [15, 19], [20, 16], [17, 21],
  ],
}

/** `$20` "Saucer" (5000-pt bonus visitor) — ROM-decoded (vertex tbl $3eb0, cmd tbl $75b5). */
export const SAUCER: Model3D = {
  name: 'Saucer',
  vertices: [
    [0, -80, -240], [-160, -80, -160], [-240, -80, 0], [-160, -80, 160],
    [0, -80, 240], [160, -80, 160], [240, -80, 0], [160, -80, -160],
    [0, 160, -960], [-680, 160, -680], [-960, 160, 0], [-680, 160, 680],
    [0, 160, 960], [680, 160, 680], [960, 160, 0], [680, 160, -680],
    [0, 560, 0],
  ],
  edges: [
    [16, 8], [8, 9], [9, 16], [16, 10], [10, 11], [11, 16], [16, 12],
    [12, 13], [13, 16], [16, 14], [14, 15], [15, 16],
    [0, 7], [7, 15], [15, 8], [8, 0], [0, 1], [1, 9], [9, 10], [10, 2],
    [2, 3], [3, 11], [11, 12], [12, 4], [4, 5], [5, 13], [13, 14], [14, 6],
    [6, 7], [6, 5], [4, 3], [2, 1],
  ],
}

// --- Enemy tank sub-objects (story bz3-12, findings W-017/W-018) ----------
//
// Every ROM enemy tank draws two sub-objects on top of the SLOW_TANK/
// SUPER_TANK body, each its OWN wireframe (own OBJPNT/OBJTBL entry), placed
// in the SAME object-local coordinate frame as the body (no extra offset —
// see scene.ts's enemyTankSegments, which projects them through the body's
// own placement/orientation, adding only the antenna's own spin).
//
// RADIX CORRECTION: unlike the mountain VCTR data (bz3-8, `.RADIX 16`), these
// tables sit under BZMTNS.MAC:501's `.RADIX 10` — DECIMAL `.NWORD`s, same
// decode pipeline as every other model above (`.NWORD a,b,c` -> ROM words
// (4a,4b,4c) -> object-space vertex `[-4b, 8c, 4a]`).

/**
 * `$0D` "Radar Antenna" (RDRTBL) — the rotating dish every enemy tank carries
 * on its turret. ROM-decoded (vertex tbl RDRTBL, BZMTNS.MAC:606-614; draw
 * list RDROBJ, BZONE.MAC:4517-4530). Emitted by ROTATE with its own spin
 * angle RANGLE (BZONE.MAC:1559-1562) — see scene.ts's `radarSpin`.
 */
export const RADAR_ANTENNA: Model3D = {
  name: 'Radar Antenna',
  vertices: [
    [80, 160, 0],
    [160, 200, 80],
    [160, 240, 80],
    [80, 280, 0],
    [-80, 160, 0],
    [-160, 200, 80],
    [-160, 240, 80],
    [-80, 280, 0],
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [0, 4],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [7, 3],
  ],
}

/**
 * TREAD4..TREADB — the 8 tread-animation frames every enemy tank cycles
 * through (ROM-decoded, BZMTNS.MAC:549-604; drawn by the TREADS command
 * list, BZONE.MAC:4509-4516). Source order: index 0 = TREAD4 ... index 7 =
 * TREADB. Frames 0-3 sit on the front (-Z) run, 4-7 on the rear (+Z) run —
 * see scene.ts's `treadFrame`, which selects only the front set (OBJPNT's
 * reversed $4-$7 dispatch, BZMTNS.MAC:486).
 */
export const TREAD_FRAMES: readonly Model3D[] = [
  {
    name: 'Tread Frame 0 (TREAD4)',
    vertices: [
      [568, -416, -1024], [-568, -416, -1024],
      [548, -496, -920], [-548, -496, -920],
      [532, -576, -816], [-532, -576, -816],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 1 (TREAD5)',
    vertices: [
      [564, -432, -1000], [-564, -432, -1000],
      [544, -512, -896], [-544, -512, -896],
      [528, -592, -792], [-528, -592, -792],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 2 (TREAD6)',
    vertices: [
      [556, -456, -972], [-556, -456, -972],
      [540, -536, -868], [-540, -536, -868],
      [520, -616, -764], [-520, -616, -764],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 3 (TREAD7)',
    vertices: [
      [552, -472, -948], [-552, -472, -948],
      [536, -552, -844], [-536, -552, -844],
      [516, -632, -736], [-516, -632, -736],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 4 (TREAD8)',
    vertices: [
      [568, -416, 1248], [-568, -416, 1248],
      [548, -496, 1152], [-548, -496, 1152],
      [532, -576, 1056], [-532, -576, 1056],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 5 (TREAD9)',
    vertices: [
      [564, -432, 1224], [-564, -432, 1224],
      [544, -512, 1128], [-544, -512, 1128],
      [528, -592, 1032], [-528, -592, 1032],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 6 (TREADA)',
    vertices: [
      [556, -456, 1200], [-556, -456, 1200],
      [540, -536, 1104], [-540, -536, 1104],
      [520, -616, 1008], [-520, -616, 1008],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
  {
    name: 'Tread Frame 7 (TREADB)',
    vertices: [
      [552, -472, 1176], [-552, -472, 1176],
      [536, -552, 1080], [-536, -552, 1080],
      [516, -632, 984], [-516, -632, 984],
    ],
    edges: [[0, 1], [2, 3], [4, 5]],
  },
]

// --- Projectile & explosion debris (objects.html: $03, $0e/$24-$2b) -------

/** `$03` "Projectile" — ROM-decoded (vertex tbl $3936, cmd tbl $7519). */
export const SHELL: Model3D = {
  name: 'Shell (projectile)',
  vertices: [
    [40, -96, -40],
    [40, -16, -40],
    [-40, -16, -40],
    [-40, -96, -40],
    [0, -56, 80],
  ],
  edges: [
    [0, 4], [4, 1], [1, 0], [0, 3], [3, 4], [4, 2], [2, 3], [2, 1],
  ],
}

/**
 * `$0e`/`$24`-`$2b` explosion debris — HYBRID, see the module header's
 * "EXPLOSION_DEBRIS" note. Vertices 0-7 are the ROM-exact `$24` ("spatter0")
 * point-burst positions (vertex tbl $3d28, cmd tbl $75f4 — 8 points, 0
 * edges, in the raw ROM); vertex 8 is the ROM-exact `$0e` origin point
 * (vertex tbl $3b3f). The 8 origin→point edges are AUTHORED (the ROM draws
 * these as unconnected points, not lines — `Model3D` has no point
 * primitive) — see Design Deviations in the session file.
 */
export const EXPLOSION_DEBRIS: Model3D = {
  name: 'Explosion Debris',
  vertices: [
    [-52, -360, 0], [-36, -360, 36], [0, -360, 52], [36, -360, 36],
    [52, -360, 0], [36, -360, -36], [0, -360, -52], [-36, -360, -36],
    [0, 0, 0],
  ],
  edges: [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7],
  ],
}

/** The full wireframe registry — every model the findings doc distills. */
export const MODELS: readonly Model3D[] = [
  NARROW_PYRAMID,
  WIDE_PYRAMID,
  TALL_BOX,
  SHORT_BOX,
  SLOW_TANK,
  SUPER_TANK,
  MISSILE,
  SAUCER,
  SHELL,
  EXPLOSION_DEBRIS,
  RADAR_ANTENNA,
  ...TREAD_FRAMES,
]

// --- Mountain-scape backdrop ridge (story bz3-8, findings H-002/H-003) -----
//
// MTN0..MTN7 are NOT `Model3D`s — the ROM authors the horizon silhouette as a
// flat run of relative 2D pen strokes (`VCTR dx,dy,brite`), not an indexed
// vertex/edge wireframe, so they get their own shape here rather than being
// forced into `Model3D`. `src/core/horizon.ts` imports and walks them into
// the angular backdrop it renders.

/** One hex-decoded VCTR stroke from BZMTNS.MAC: `[dx, dy, brite]`. Relative
 *  deltas in vector-generator units; brite 0 = pen-up MOVE (reposition, no
 *  line), brite > 0 = visible DRAW at that intensity tier. */
export type MtnStroke = readonly [number, number, number]

/**
 * MTN0..MTN7 — the ROM's hand-authored mountain-scape ridge, a byte-exact
 * hex decode of `BZMTNS.MAC:19-183` (`.RADIX 16`). `MTNS` (BZMTNS.MAC:11-18)
 * `JSRL`s these eight segments in sequence; each segment's strokes sum to
 * exactly `[dx, dy] = [512, 0]` — a closed loop, so all 8 (4096 units) tile
 * one full 360° turn with no net vertical drift. 157 strokes total.
 *
 * The MOON (H-003) rides embedded inside MTN0, strokes 17..48 (BZMTNS.MAC:
 * 36-67): PART A is the bright disc outline (14 strokes, brite 7), PART B is
 * the terminator (6 strokes, brite 2), then an inner-detail run (brite 5,
 * with brite-0 positioning moves) closing at brite 2. Those three tiers
 * (7/2/5) appear ONLY within MTN0 — everywhere else the ridge is brite {0,3}.
 */
export const MTN_SEGMENTS: readonly (readonly MtnStroke[])[] = [
  // MTN0 — BZMTNS.MAC:19-68 (50 strokes), moon embedded at strokes 17-48.
  [
    [0, 64, 0], [32, -32, 3], [-16, -8, 0], [80, 40, 3], [32, 0, 3], [32, -32, 3],
    [-64, 32, 3], [0, -64, 0], [128, 64, 3], [64, -64, 3], [32, 0, 0], [-64, 32, 3],
    [-32, 32, 0], [64, -32, 3], [64, -16, 3], [96, -16, 3], [48, 160, 0],
    // MOON PART A — bright disc outline, brite 7 (BZMTNS.MAC:36-49, ;MOON):
    [5, -12, 7], [0, -12, 7], [-8, -12, 7], [-12, -12, 7], [-12, -3, 7], [-12, 3, 7],
    [12, -9, 7], [12, -3, 7], [12, 3, 7], [12, 9, 7], [6, 12, 7], [0, 12, 7],
    [-4, 12, 7], [-11, 12, 7],
    // MOON PART B — terminator, brite 2 (BZMTNS.MAC:50-55):
    [-13, 3, 2], [-15, -4, 2], [-10, -8, 2], [-5, -11, 2], [-2, -13, 2], [6, -15, 2],
    // MOON inner detail — brite 5, with brite-0 positioning moves, closes
    // brite 2 (BZMTNS.MAC:56-67, ;END OF MOON):
    [27, 3, 0], [0, -4, 5], [6, -1, 5], [6, 11, 5], [-4, -1, 5], [-1, 2, 5],
    [18, 20, 0], [-3, -3, 5], [1, 3, 5], [-3, 1, 5], [0, 6, 5], [1, 1, 2],
    [7, -150, 0], // BZMTNS.MAC:68 — move back off the moon
  ],
  // MTN1 — BZMTNS.MAC:70-83 (14 strokes).
  [
    [32, 0, 0], [64, 48, 3], [32, -48, 3], [-32, 48, 0], [32, -16, 3], [64, 32, 3],
    [160, -64, 3], [-128, 32, 3], [-32, 32, 3], [-64, -32, 0], [96, -32, 3],
    [128, 0, 0], [160, 32, 3], [0, -32, 0],
  ],
  // MTN2 — BZMTNS.MAC:85-115 (31 strokes).
  [
    [0, 32, 0], [64, 0, 3], [0, -32, 0], [-64, 32, 3], [64, 0, 0], [64, 32, 3],
    [-64, -32, 0], [96, -32, 3], [32, 32, 3], [-64, 32, 3], [32, 0, 3], [32, -32, 3],
    [32, 16, 3], [32, -16, 3], [-96, -32, 3], [96, 32, 0], [64, 32, 3], [64, -32, 3],
    [-96, 16, 0], [32, -16, 3], [32, 16, 3], [0, -48, 0], [96, 8, 3], [-64, 24, 3],
    [32, 16, 3], [64, -16, 3], [-32, -24, 3], [-32, 40, 3], [64, -16, 0], [32, 0, 3],
    [0, -32, 0],
  ],
  // MTN3 — BZMTNS.MAC:117-132 (16 strokes).
  [
    [0, 32, 0], [64, -32, 3], [-64, 32, 0], [128, -32, 3], [160, 0, 0], [96, 32, 3],
    [32, -32, 3], [-32, 32, 0], [32, 32, 3], [32, -64, 3], [32, 0, 0], [-64, 64, 3],
    [32, -32, 0], [32, 32, 3], [32, -32, 3], [0, -32, 0],
  ],
  // MTN4 — BZMTNS.MAC:134-144 (11 strokes).
  [
    [0, 32, 0], [64, 32, 3], [32, -64, 3], [32, 0, 0], [-64, 64, 3], [32, -32, 0],
    [32, 16, 3], [96, -48, 3], [128, 0, 0], [160, 32, 3], [0, -32, 0],
  ],
  // MTN5 — BZMTNS.MAC:146-160 (15 strokes).
  [
    [0, 32, 0], [64, 0, 3], [224, -32, 3], [-32, 48, 3], [-64, -32, 3], [96, -16, 0],
    [96, 64, 3], [64, -40, 3], [-16, -24, 0], [64, 96, 3], [3, -7, 3], [5, 5, 3],
    [3, -6, 3], [5, 8, 3], [0, -96, 0],
  ],
  // MTN6 — BZMTNS.MAC:162-175 (14 strokes).
  [
    [0, 96, 0], [64, -96, 3], [96, 64, 3], [64, -64, 3], [64, 0, 0], [-128, 64, 3],
    [64, -32, 0], [64, 32, 3], [128, -64, 3], [-64, 32, 0], [64, 16, 3], [32, -48, 3],
    [-32, 48, 0], [96, -48, 3],
  ],
  // MTN7 — BZMTNS.MAC:177-182 (6 strokes).
  [
    [192, 0, 0], [224, 32, 3], [64, -32, 3], [-32, 16, 0], [64, 48, 3], [0, -64, 0],
  ],
]
