// plugins/defender/src/core/collision.ts
//
// Story df4-1 (GREEN) — the shared Defender collision seam, built FIRST, before any
// enemy exists. A pure, clock-free port of COLIDE's BOX PRE-TEST
// (reference/original-source/defender/DEFA7.SRC:2907-2925, banner `*COLLISION DETECT`
// at :2904) — the object-pointer-list bounding-box overlap the ROM uses to decide
// whether a pixel comparison is even worth doing. It IS an AABB box test (that is
// exactly what the ROM does here); Decision A (RULED, ROM-always-wins, df4 design spec
// §2) forbids swapping it for a SPATIAL INDEX (quadtree / grid / hash), which would
// silently change WHICH overlaps count and in what ORDER (routing != geometry, the df3
// lesson) — so it is faithfully the ROM's own box test over the ROM's own object LIST.
// The src/core purity sweep (tests/purity.test.ts) scans this file; it reads no clock,
// mints no entropy, reaches no browser surface, imports no shell code.
//
// ─── SCOPE: BOX PRE-TEST ONLY — THE PIXEL STAGE IS DEFERRED ────────────────────────
// Real COLIDE is TWO stages; this ports the FIRST. See the df4-1 session's Design
// Deviation for the full rationale.
//   1. box pre-test (:2907-2925) — the AABB overlap ported here; on overlap the ROM
//      branches into IC1 (`BHI IC1`, :2922).
//   2. IC1 pixel intersection (:2927-3020) — walks BOTH sprites' bitmap data and only
//      signals the crash (`LDA #1 / RTS HIT`, NE) at :3011 when a set pixel from each
//      coincides; a box overlap with NO pixel overlap is not a crash (`JMP COLLP`, :3020).
// df4-1 tests against SYNTHETIC object lists that carry NO bitmap, so stage 2 has nothing
// to compare and is intentionally UNPORTED (a later story with real sprite data adds it).
// Consequence a consumer must know: collide() reports a Hit on BOX overlap, a SUPERSET of
// the ROM's pixel-level crashes.
//
// ─── THE MODEL, LINE BY LINE (DEFA7.SRC + PHR6.SRC struct offsets) ─────────────────
//   COLIDE (:2907)  U = reference PICTURE descriptor (OBJW=width/OBJH=height,
//        PHR6.SRC:561-562); D = reference UPPER-LEFT coord (A=X column, B=Y row); X =
//        list head, walked via OLINK (offset 0) to the end.
//   Reference LR (:2909-2910)  LR = UL + (OBJW,OBJH) — `ADDD OBJW,U` then `STD LRX`
//        ("LR CORNER OF PLAYER").
//   Off-screen skip (:2912-2913)  `LDD OBJX,X / BEQ COLLP OFF SCREEN` — a candidate whose
//        UL coord WORD is exactly 0 (x==0 AND y==0) is inactive and is SKIPPED, even if it
//        would geometrically overlap.
//   Candidate LR (:2918)  `ADDD [OPICT,X] CALC LR` — each candidate's own LR = its UL +
//        its OWN (OBJW,OBJH), dereferenced through its OPICT picture pointer.
//   Box test (:2914-2922)  EXCLUSIVE on all four edges (`CMPA LRX/BHS`, `CMPB LRY/BHS`,
//        `CMPA ULX/BLS`, `CMPB ULY/BHI`). Overlap needs ALL of: cand.ULX < ref.LRX,
//        cand.ULY < ref.LRY, cand.LRX > ref.ULX, cand.LRY > ref.ULY. Edges exactly
//        touching do NOT collide (open intervals).
//   Box-overlap wins, in list order (:2923-2924)  the OLINK walk advances (`LDX OLINK,X`
//        / `BNE COL1`) and returns the FIRST box-overlapping object; an exhausted list
//        falls to `RTS RET EQ` (:2925) = no crash (null here). NOTE the ROM's actual crash
//        return (`LDA #1 / RTS HIT`, NE) is at :3011, inside the DEFERRED IC1 pixel stage —
//        not in this range; df4-1 treats box overlap itself as the hit.
//   RET+2 = COLLISION PICT (:2553)  the struck object carries the picture COLIDE
//        dereferences for its box — so the hit returns that picture, not a bare boolean.
//   CENTMP (:2998-3008)  `LDY OBJX,X SCREEN TOP LEFT` seeds the screen address from the
//        hit object's UL coord word — column in the HIGH byte, row in the LOW — then adds
//        the pixel offset (`LEAY $100,Y` per column) and `STY CENTMP`. In the ROM this runs
//        only AFTER IC1 has found a matching pixel, so it belongs to the DEFERRED pixel
//        stage, not a refinement on an already-decided hit. df4-1 has no bitmap, so it
//        approximates CENTMP as the box-level UL coord-as-address (x<<8)|y — the coarse
//        location of the box overlap, until the pixel stage lands.

/** A picture descriptor's collision box — OBJW (width) / OBJH (height), the `FCB W,H`
 *  pair the ROM dereferences via U / OPICT. Passed IN; this module mints no box dims. */
export interface Box {
  readonly width: number
  readonly height: number
}

/** An object in the pointer list: its UPPER-LEFT screen coord (OBJX/OBJY) + its own
 *  picture (OPICT). `id` gives it identity so a Hit can name WHICH object it struck. */
export interface CollObject {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly picture: Box
}

/** The reference (querying) object COLIDE tests the list against: its UL coord (D) and
 *  its box (U). NOT part of the scanned list — only list members get the (0,0) skip. */
export interface Query {
  readonly x: number
  readonly y: number
  readonly picture: Box
}

/** COLIDE's return on a crash: the struck object, its collision picture (RET+2, :2553),
 *  and the CENTMP screen-collision address (:3008). `null` is EQ = no crash. */
export interface Hit {
  readonly object: CollObject
  readonly collisionPicture: Box
  readonly screenAddr: number
}

/**
 * The ported COLIDE object-pointer-list scan (DEFA7.SRC:2907-2925). Returns the FIRST
 * object in list order whose box overlaps the query box, as a Hit; or `null` when none
 * do. Pure: reads no clock, mutates no input, owns no shell state.
 */
export function collide(query: Query, objects: readonly CollObject[]): Hit | null {
  // Reference LR corner = UL + (OBJW,OBJH)  (:2909-2910).
  const refLRX = query.x + query.picture.width
  const refLRY = query.y + query.picture.height

  for (const object of objects) {
    // Off-screen skip: a UL coord WORD of exactly 0 is inactive  (:2912-2913).
    if (object.x === 0 && object.y === 0) continue

    // Candidate LR corner = its UL + its OWN (OBJW,OBJH)  (:2918).
    const candLRX = object.x + object.picture.width
    const candLRY = object.y + object.picture.height

    // Box test, EXCLUSIVE on all four edges  (:2914-2922).
    if (object.x < refLRX && object.y < refLRY && candLRX > query.x && candLRY > query.y) {
      return {
        object,
        collisionPicture: object.picture, // RET+2 = COLLISION PICT  (:2553)
        screenAddr: (object.x << 8) | object.y, // CENTMP: col<<8 | row  (:2998-3008)
      }
    }
  }
  return null // list exhausted → EQ = no crash  (:2925).
}

/** laser-vs-object (DEFA7.SRC:2775-2787, `JSR COLIDE` @2787): a player laser box
 *  (U=#LASP1, 8x1) vs the enemy list — a player laser hits an enemy. */
export function laserVsObject(laser: Query, objects: readonly CollObject[]): Hit | null {
  return collide(laser, objects)
}

/** bomb-vs-player (DEFA7.SRC:2699, `BKIL`): the player box (PLAPIC, 8x6) vs the
 *  shell/bomb list (BMBP1, 2x3) — an enemy/mine hits the player. */
export function bombVsPlayer(player: Query, shells: readonly CollObject[]): Hit | null {
  return collide(player, shells)
}

/** ship-vs-object (DEFA7.SRC:3130-3142, `COLCHK`, `JSR COLIDE` @3142): the player ship
 *  box (U=#PLAPIC, 8x6) vs the enemy list — the player ship touches an enemy. */
export function shipVsObject(player: Query, objects: readonly CollObject[]): Hit | null {
  return collide(player, objects)
}
