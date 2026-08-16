// tests/collision.test.ts
//
// Story df4-1 — RED phase (Han Solo / TEA). THE SHARED COLLISION SEAM, ported FIRST,
// before any enemy exists. A pure, clock-free port of the ROM's OWN COLIDE routine
// (reference/original-source/defender/DEFA7.SRC:2904-3020, banner `*COLLISION DETECT`
// at :2904) — an object-pointer-list box hit test — NOT a re-derived quadtree/AABB.
// This is Decision A (RULED, ROM-always-wins) in the df4 design spec §2: a tidier
// structure would silently change WHICH overlaps count (routing != geometry, the df3
// lesson), so we port COLIDE's own representation and semantics, cited.
//
// ─── THE ROM MODEL, BYTE BY BYTE (DEFA7.SRC + PHR6.SRC struct offsets) ─────────────
//   COLIDE (:2907)  U = reference object's PICTURE descriptor (OBJW=width, OBJH=height,
//        PHR6.SRC:561-562); D = its UPPER-LEFT screen coord (A=X column byte, B=Y row).
//        X = the list head; COLIDE walks OLINK (offset 0) to the end.
//   LR corner (:2908-2910)  the reference's lower-right = UL + (OBJW,OBJH). Each CANDIDATE
//        gets its own LR the same way via `ADDD [OPICT,X]` (:2918) — the candidate's own
//        width/height matter, not just its UL point.
//   Off-screen skip (:2912-2913)  `LDD OBJX,X / BEQ COLLP` — a candidate whose UL coord
//        WORD is exactly 0 (x==0 AND y==0) is inactive/off-screen and is SKIPPED, even
//        if it would geometrically overlap. A degenerate-but-not-nullish 0 the ROM treats
//        specially (a tidier AABB would count it).
//   Box test (:2914-2922)  EXCLUSIVE on all four edges. Overlap requires ALL of:
//        cand.ULX < ref.LRX  (CMPA LRX / BHS skip)
//        cand.ULY < ref.LRY  (CMPB LRY / BHS skip)
//        cand.LRX > ref.ULX  (CMPA ULX / BLS skip)
//        cand.LRY > ref.ULY  (CMPB ULY / BHI proceed)
//        Edges EXACTLY TOUCHING do NOT collide (open intervals). This is the single
//        semantic a "cleaner" inclusive-boundary AABB would get wrong.
//   First hit wins (:2923-2925)  the walk returns on the FIRST overlapping object in
//        OLINK/list order (RTS NE = crash); exhausting the list returns EQ = no crash.
//   RET+2 = COLLISION PICT (:2553, GETSHL)  each object carries the picture COLIDE
//        dereferences for its box (stored into OPICT at GETSHL time) — so the hit
//        carries the collision picture, not a bare boolean.
//   CENTMP (:2998,3008)  `LDY OBJX,X` seeds the SCREEN TOP-LEFT address from the hit
//        object's UL coord word (column in the high byte, row in the low), the pixel
//        offset is added, and `STY CENTMP` stores the screen collision address. With
//        SYNTHETIC object lists (no bitmap pixels) the box-level CENTMP is that UL
//        coord-as-address: (x<<8)|y. The pixel-precise centre refinement needs real
//        bitmap data df4-1 does not carry (df4-2's effects / a later enemy will).
//
// The three cited CALL SITES are the three query shapes df4 must produce (design §2):
//   laser-vs-object  DEFA7.SRC:2775-2787 (JSR COLIDE @2787), U=#LASP1 (8x1) — a player
//        laser hits an enemy.
//   bomb-vs-player   DEFA7.SRC:2699 (BKIL) — an enemy/mine (BMBP1, 2x3) hits the player
//        box (PLAPIC, 8x6).
//   ship-vs-object   DEFA7.SRC:3130-3142 (COLCHK, JSR COLIDE @3142), U=#PLAPIC (8x6) —
//        the player ship touches an enemy.
//
// ─── RED / GREEN SPLIT (see .session/df4-1-session.md) ────────────────────────────
// TEA (this file) authors the failing suite + the synthetic-list fixtures that give it
// teeth, and DEFINES the pure seam's contract (the local type shim below is the shape
// GREEN must satisfy). GREEN (Yoda / Dev) ships:
//   1. plugins/defender/src/core/collision.ts — the pure reducer: `collide(query,
//      objects)` + the three cited query wrappers, returning a Hit (object +
//      collisionPicture + CENTMP screenAddr) or null. Held to src/core purity
//      (tests/purity.test.ts sweeps it automatically the moment it lands — no clock,
//      no entropy, no browser surface, no shell import).
//   2. plugins/defender/docs/rom-study/claims/13-collision.json — a claims/*.json
//      entry per constant introduced (the exclusive box test :2914-2922, the CENTMP
//      screen-address model :2998-3008). tests/audit/brief-dossier.test.ts runs
//      checkClaims() over the WHOLE claims/ dir and byte-verifies each verbatim against
//      reference/original-source/defender/ — so the enrollment asserted here is then
//      byte-gated for free.
//
// ─── WHY THIS IS RED, AND WHY THE AC3 GATE HAS TEETH TODAY ─────────────────────────
// RED now: src/core/collision.js does not exist, so loadCollision() throws a
// self-describing "not built yet" per test — never a cryptic module-resolution stack
// trace (the harness-error trap: a RED failure must prove the FEATURE is absent). The
// AC3 enrollment test fails today because no claim yet cites the box-test/CENTMP region
// (SB-4@2907 is the generic COLIDE banner, NOT the box-test or CENTMP constants; the
// nearest neighbours TB-5@3048 / TB-6@3070 are timebase, SHIP-*@3157+ are the player
// process — none touch [2908,2925] or [2993,3011], verified this session).

import { describe, it, expect } from 'vitest'
import { loadClaims } from './audit/dossier-sweep.js'

// ─── The seam contract GREEN must satisfy (local shim; declared here so this suite
//     COMPILES against a not-yet-built module and vitest reports clean per-test
//     failures instead of a collect crash). collision.ts becomes canonical. ──────────

/** A picture descriptor's collision box — OBJW (width) / OBJH (height), the `FCB W,H`
 *  pair the ROM dereferences via U / OPICT. Passed IN; collision.ts mints no box dims. */
interface Box {
  readonly width: number
  readonly height: number
}

/** An object in the pointer list: its UPPER-LEFT screen coord (OBJX/OBJY) + its own
 *  picture (OPICT). `id` gives it identity so a Hit can name WHICH object it struck. */
interface CollObject {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly picture: Box
}

/** The reference (querying) object COLIDE tests the list against: its UL coord (D) and
 *  its box (U). It is NOT part of the scanned list — only list members get the
 *  off-screen (0,0) skip. */
interface Query {
  readonly x: number
  readonly y: number
  readonly picture: Box
}

/** COLIDE's return on a crash: the struck object, its collision picture (RET+2, :2553),
 *  and the CENTMP screen-collision address (:3008). `null` is EQ = no crash. */
interface Hit {
  readonly object: CollObject
  readonly collisionPicture: Box
  readonly screenAddr: number
}

interface CollisionModule {
  /** The ported COLIDE object-pointer-list scan: first overlapping object in list order,
   *  or null. Pure — reads no clock, mutates no input, owns no shell state. */
  collide(query: Query, objects: readonly CollObject[]): Hit | null
  /** laser-vs-object (DEFA7.SRC:2775-2787): a player laser box vs the enemy list. */
  laserVsObject(laser: Query, objects: readonly CollObject[]): Hit | null
  /** bomb-vs-player (DEFA7.SRC:2699): the player box vs the shell/bomb list. */
  bombVsPlayer(player: Query, shells: readonly CollObject[]): Hit | null
  /** ship-vs-object (DEFA7.SRC:3130-3142): the player ship box vs the enemy list. */
  shipVsObject(player: Query, objects: readonly CollObject[]): Hit | null
}

/**
 * Load the not-yet-built reducer with a self-describing failure. A runtime-assembled
 * specifier so neither tsc nor the bundler resolves it statically; a missing module
 * reads as "not built yet", never a collect crash (the objects-gate pattern).
 */
async function loadCollision(): Promise<CollisionModule> {
  const spec = ['..', 'src', 'core', 'collision.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ spec)) as Partial<CollisionModule>
    for (const fn of ['collide', 'laserVsObject', 'bombVsPlayer', 'shipVsObject'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as CollisionModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(
      'src/core/collision.ts not built yet — GREEN (Dev) ports COLIDE ' +
        '(defender/DEFA7.SRC:2904-3020) as a PURE reducer: `collide(query, objects)` + the ' +
        'three cited query wrappers (laserVsObject :2775-2787, bombVsPlayer :2699, ' +
        'shipVsObject :3130-3142), each returning a Hit {object, collisionPicture (:2553), ' +
        `screenAddr (CENTMP :3008)} or null. (${why})`,
    )
  }
}

// ─── Fixture helpers. Distinct, non-mirrored coordinate values so a swapped-byte or
//     wrong-object mutant cannot pass by coincidence. Frozen so a mutating impl throws
//     (AC1 "owns no shell state" — a pure reducer never writes its inputs). ──────────
const box = (width: number, height: number): Box => Object.freeze({ width, height })
const obj = (id: string, x: number, y: number, picture: Box): CollObject =>
  Object.freeze({ id, x, y, picture })
const query = (x: number, y: number, picture: Box): Query => Object.freeze({ x, y, picture })
const list = (...os: CollObject[]): readonly CollObject[] => Object.freeze(os)

// Real ROM box dimensions (DEFB6.SRC — verified against the vendored tree this session):
const LASER = box(8, 1) //  LASP1  FCB 8,1  (DEFB6.SRC:1940)
const PLAYER = box(8, 6) // PLAPIC FCB 8,6  (DEFB6.SRC:1961)
const BOMB = box(2, 3) //   BMBP1  FCB 2,3  (DEFB6.SRC:1935)
const UFO = box(6, 4) //    UFOP1 is 6x4 (df2-4 objects-gate.test.ts pins it) — a synthetic
//                          enemy box; collision.ts takes box dims as INPUT and mints none.

// ══════════════════════════════════════════════════════════════════════════════════
// AC1 — collision.ts is a PURE reducer porting COLIDE as an object-pointer-list scan
// over a passed-in snapshot; it returns the HIT (which object + collision picture +
// CENTMP screen address), owning no shell state — NOT a bare boolean.
// ══════════════════════════════════════════════════════════════════════════════════
describe('AC1 — COLIDE as a pure object-list scan returning the hit (not a boolean)', () => {
  it('returns the struck OBJECT by identity, not merely true/false', async () => {
    const { collide } = await loadCollision()
    const objects = list(obj('ufo', 101, 100, UFO)) // overlaps the ref box below
    const hit = collide(query(100, 100, PLAYER), objects)
    expect(hit, 'an overlapping object must produce a Hit, not null').not.toBeNull()
    expect(hit!.object.id, 'the Hit must name WHICH object was struck').toBe('ufo')
  })

  it('carries the collision PICTURE of the struck object (RET+2, DEFA7.SRC:2553)', async () => {
    const { collide } = await loadCollision()
    // Two candidates with DIFFERENT pictures; only the bomb overlaps. The returned
    // collisionPicture must be the STRUCK object's (2x3), not the first in the list,
    // not a constant — that distinguishes a real port from an echo of objects[0].
    const objects = list(
      obj('ufo-clear', 200, 200, UFO), // far away, no overlap
      obj('bomb', 101, 101, BOMB), //     overlaps
    )
    const hit = collide(query(100, 100, PLAYER), objects)
    expect(hit!.object.id).toBe('bomb')
    expect(hit!.collisionPicture, 'the collision picture is the struck object’s box (2x3)').toEqual(
      { width: 2, height: 3 },
    )
  })

  it('computes the CENTMP screen-collision address from the hit’s UL coord (DEFA7.SRC:2998-3008)', async () => {
    const { collide } = await loadCollision()
    // CENTMP seeds `LDY OBJX,X` — the object's UL coord read as a screen address, column
    // in the HIGH byte, row in the LOW: (x<<8)|y. x=107, y=100 are distinct + non-mirrored
    // so a byte-swapped (y<<8)|x=25707 differs from (x<<8)|y=27492 and is caught.
    const objects = list(obj('bomb', 107, 100, BOMB))
    const hit = collide(query(100, 100, PLAYER), objects)
    expect(hit!.screenAddr, 'CENTMP = (col<<8)|row of the struck object’s UL').toBe((107 << 8) | 100)
  })

  it('returns null when the list is empty or nothing overlaps (EQ = no crash)', async () => {
    const { collide } = await loadCollision()
    expect(collide(query(100, 100, PLAYER), list()), 'empty list → no crash').toBeNull()
    expect(
      collide(query(100, 100, PLAYER), list(obj('far', 200, 200, UFO))),
      'a non-overlapping object → no crash',
    ).toBeNull()
  })

  it('owns no shell state — pure and deterministic, mutates none of its inputs', async () => {
    const { collide } = await loadCollision()
    // Inputs are Object.frozen; a reducer that wrote them would throw here. Two calls
    // with the same snapshot must return equal results (no hidden clock/entropy/state).
    const q = query(100, 100, PLAYER)
    const objects = list(obj('bomb', 101, 101, BOMB))
    const a = collide(q, objects)
    const b = collide(q, objects)
    expect(a).toEqual(b)
    expect(a!.object.id).toBe('bomb')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC2 — the THREE cited query shapes are distinct and tested against SYNTHETIC object
// lists, with box-boundary cases (just-touching vs just-clear) pinned by COORDINATES,
// not a bare boolean (routing != geometry, the df3 lesson).
//
// Each case names the exact edge and the arithmetic. `hit`/`clear` come from the MODULE
// (a module that always-hits fails the clear cases; always-null fails the hit cases),
// so the boundary itself has teeth.
// ══════════════════════════════════════════════════════════════════════════════════
describe('AC2 — laser-vs-object (DEFA7.SRC:2775-2787), U=#LASP1 8x1', () => {
  // laser box {8,1} at UL (100,50) → X∈(100,108), Y∈(50,51) open. Enemy UFO {6,4}.
  const laser = query(100, 50, LASER)
  const at = (x: number, y: number) => list(obj('ufo', x, y, UFO))

  it('CLEAR: enemy UL exactly on the laser’s right edge (ex=108=lx+8) does not collide', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(108, 50)), 'ex<lx+8 is strict; 108<108 is false').toBeNull()
  })
  it('HIT: enemy UL one column inside the right edge (ex=107) collides', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(107, 50))?.object.id, '107<108 and 107+6>100').toBe('ufo')
  })
  it('CLEAR: enemy right edge exactly on the laser’s left edge (ex+6=100=lx) does not collide', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(94, 50)), 'ex+6>lx is strict; 100>100 is false').toBeNull()
  })
  it('HIT: enemy right edge one column past the left edge (ex=95, ex+6=101) collides', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(95, 50))?.object.id, '95+6=101>100').toBe('ufo')
  })
  it('CLEAR: enemy UL exactly on the laser’s bottom edge (ey=51=ly+1) does not collide', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(103, 51)), 'ey<ly+1 is strict; 51<51 is false').toBeNull()
  })
  it('HIT: enemy straddling the 1-pixel-tall laser row (ey=47, ey+4=51>50) collides', async () => {
    const { laserVsObject } = await loadCollision()
    expect(laserVsObject(laser, at(103, 47))?.object.id, '47<51 and 47+4=51>50').toBe('ufo')
  })
})

describe('AC2 — bomb-vs-player (DEFA7.SRC:2699), player 8x6 vs bomb 2x3', () => {
  // player box {8,6} at UL (100,100) → X∈(100,108), Y∈(100,106) open. Bomb {2,3}.
  const player = query(100, 100, PLAYER)
  const at = (x: number, y: number) => list(obj('bomb', x, y, BOMB))

  it('CLEAR: bomb UL exactly on the player’s right edge (bx=108) does not collide', async () => {
    const { bombVsPlayer } = await loadCollision()
    expect(bombVsPlayer(player, at(108, 100)), '108<108 is false').toBeNull()
  })
  it('HIT: bomb one column inside the right edge (bx=107) collides', async () => {
    const { bombVsPlayer } = await loadCollision()
    expect(bombVsPlayer(player, at(107, 100))?.object.id).toBe('bomb')
  })
  it('CLEAR: bomb bottom exactly on the player’s top edge (by+3=100, by=97) does not collide', async () => {
    const { bombVsPlayer } = await loadCollision()
    expect(bombVsPlayer(player, at(102, 97)), 'by+3>py is strict; 100>100 is false').toBeNull()
  })
  it('HIT: bomb bottom one row past the top edge (by=98, by+3=101) collides', async () => {
    const { bombVsPlayer } = await loadCollision()
    expect(bombVsPlayer(player, at(102, 98))?.object.id, '98+3=101>100').toBe('bomb')
  })
  it('reports the bomb’s 2x3 collision picture — the shape distinguishing it from the ship query', async () => {
    const { bombVsPlayer } = await loadCollision()
    expect(bombVsPlayer(player, at(101, 101))?.collisionPicture).toEqual({ width: 2, height: 3 })
  })
})

describe('AC2 — ship-vs-object (DEFA7.SRC:3130-3142), player 8x6 vs enemy 6x4', () => {
  // player ship box {8,6} at UL (60,60) → X∈(60,68), Y∈(60,66) open. Enemy UFO {6,4}.
  const ship = query(60, 60, PLAYER)
  const at = (x: number, y: number) => list(obj('ufo', x, y, UFO))

  it('CLEAR: enemy UL exactly on the ship’s right edge (ex=68) does not collide', async () => {
    const { shipVsObject } = await loadCollision()
    expect(shipVsObject(ship, at(68, 60)), '68<68 is false').toBeNull()
  })
  it('HIT: enemy one column inside the right edge (ex=67) collides', async () => {
    const { shipVsObject } = await loadCollision()
    expect(shipVsObject(ship, at(67, 60))?.object.id).toBe('ufo')
  })
  it('CLEAR: enemy UL exactly on the ship’s bottom edge (ey=66) does not collide', async () => {
    const { shipVsObject } = await loadCollision()
    expect(shipVsObject(ship, at(63, 66)), '66<66 is false').toBeNull()
  })
  it('HIT: enemy one row inside the bottom edge (ey=65) collides', async () => {
    const { shipVsObject } = await loadCollision()
    expect(shipVsObject(ship, at(63, 65))?.object.id).toBe('ufo')
  })

  it('the three query shapes are DISTINCT — same geometry, different reference boxes select differently', async () => {
    const { laserVsObject, bombVsPlayer, shipVsObject } = await loadCollision()
    // One enemy at (67,60). The 8x6 player boxes (ship & bomb queries) at (60,60) reach
    // it (67<68); the 8x1 laser box at (60,60) does NOT (its row span is Y∈(60,61) and
    // the enemy top is at 60, so ey<ly+1 → 60<61 holds, but pin the shape difference via
    // a row the laser cannot reach): enemy at (67,62) clears the 1px laser row yet still
    // hits the 6-tall player box.
    const enemy = list(obj('ufo', 67, 62, UFO))
    expect(shipVsObject(query(60, 60, PLAYER), enemy)?.object.id, 'player box reaches row 62').toBe('ufo')
    expect(bombVsPlayer(query(60, 60, PLAYER), enemy)?.object.id, 'player box reaches row 62').toBe('ufo')
    expect(
      laserVsObject(query(60, 60, LASER), enemy),
      'the 1px-tall laser row Y∈(60,61) cannot reach an enemy whose top is row 62',
    ).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC4 — the model is the ROM object-LIST scan with the ROM's OWN box semantics, NOT a
// re-derived quadtree/AABB. Each test below names a semantic a "tidier" structure would
// change — the mechanical pin of Decision A. Every one is mutation-lethal: flip the
// boundary to inclusive, drop the (0,0) skip, ignore list order, or drop the candidate's
// own dimensions, and exactly these reden.
// ══════════════════════════════════════════════════════════════════════════════════
describe('AC4 — Decision A: the ROM object-list scan, not a tidier structure', () => {
  it('the box test is EXCLUSIVE on all four edges — a touching pair does not count', async () => {
    const { collide } = await loadCollision()
    // ref box {4,4} at (10,10) → X∈(10,14), Y∈(10,14) open. Candidate {4,4} touching each
    // edge in turn must CLEAR; one pixel inside must HIT. An inclusive-boundary AABB (the
    // typical library) would report all four touches as overlaps — this is exactly the
    // "which overlaps count" Decision A forbids changing.
    const ref = query(10, 10, box(4, 4))
    const cand = (x: number, y: number) => list(obj('c', x, y, box(4, 4)))
    expect(collide(ref, cand(14, 10)), 'right edge touch (cx=14=LRX)').toBeNull()
    expect(collide(ref, cand(6, 10)), 'left edge touch (cx+4=10=ULX)').toBeNull()
    expect(collide(ref, cand(10, 14)), 'bottom edge touch (cy=14=LRY)').toBeNull()
    expect(collide(ref, cand(10, 6)), 'top edge touch (cy+4=10=ULY)').toBeNull()
    expect(collide(ref, cand(13, 13))?.object.id, 'one pixel inside the LR corner').toBe('c')
  })

  it('skips an off-screen object at UL (0,0) even when it would overlap (DEFA7.SRC:2912-2913)', async () => {
    const { collide } = await loadCollision()
    // ref box {8,6} at (0,0) covers the origin. A candidate AT (0,0) geometrically overlaps
    // (0<8,0<6,2>0,3>0) — but `LDD OBJX,X / BEQ COLLP` treats a (0,0) UL word as inactive
    // and SKIPS it. A generic AABB, blind to this ROM quirk, would return it. This is also
    // the degenerate-but-not-nullish 0 (lang-review #21): 0 is present and meaningful.
    const ref = query(0, 0, PLAYER)
    expect(collide(ref, list(obj('offscreen', 0, 0, BOMB))), 'lone (0,0) object is skipped').toBeNull()
    // …and a real overlapper elsewhere is still found while (0,0) is passed over.
    const hit = collide(ref, list(obj('offscreen', 0, 0, BOMB), obj('real', 1, 1, BOMB)))
    expect(hit?.object.id, 'the (0,0) object is skipped, the real one is the hit').toBe('real')
  })

  it('returns the FIRST overlapping object in LIST order (OLINK walk, DEFA7.SRC:2923)', async () => {
    const { collide } = await loadCollision()
    // TWO objects overlap the ref; the ROM walk returns the FIRST in list order and stops
    // (RTS NE). A spatial structure (hash/quadtree) has no list order and could return
    // either — so list-order determinism is itself a Decision-A pin. Distinct pictures let
    // us confirm the SELECTED object's picture came back, not the other's.
    const ref = query(100, 100, PLAYER)
    const both = list(obj('first', 101, 101, BOMB), obj('second', 102, 102, UFO))
    const hit = collide(ref, both)
    expect(hit?.object.id, 'first in list order wins').toBe('first')
    expect(hit?.collisionPicture, 'and its picture, not the second’s, is returned').toEqual({
      width: 2,
      height: 3,
    })
  })

  it('uses the candidate’s OWN width/height for its LR corner (ADDD [OPICT,X], DEFA7.SRC:2918)', async () => {
    const { collide } = await loadCollision()
    // The candidate's UL (95,100) is LEFT of the ref's left edge (100). A point-in-box test
    // that only checks the candidate's UL would MISS it. But the candidate is {6,4}, so its
    // LR X = 101 > 100 → it overlaps. Dropping the candidate-dimension term (`ADDD
    // [OPICT,X]`) reddens exactly here.
    const ref = query(100, 100, PLAYER)
    const hit = collide(ref, list(obj('reach', 95, 100, box(6, 4))))
    expect(hit?.object.id, 'candidate LRX=95+6=101>100 overlaps despite UL outside').toBe('reach')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC3 — every collision constant introduced (the exclusive box test, the CENTMP
// screen-address model) has a claims/*.json entry that verifies byte-for-byte against
// reference/original-source/defender/ under the df1-1 gate. brief-dossier.test.ts runs
// checkClaims() over the WHOLE claims/ dir and byte-checks each verbatim; this test
// asserts the ENROLLMENT exists (so the *presence* of the claim, not only its bytes,
// reddens df4-1 until GREEN files docs/rom-study/claims/13-collision.json).
// ══════════════════════════════════════════════════════════════════════════════════
describe('AC3 — a collision constant is enrolled in claims/*.json (byte-verified by the citation gate)', () => {
  it('GREEN files at least one claim citing the box test (:2914-2922) or CENTMP (:2993-3011)', () => {
    const claims = loadClaims()
    // Match on the citation LOCATION, in the collision-SPECIFIC regions no existing claim
    // touches: the box-test comparisons (DEFA7.SRC:2908-2925) and the CENTMP screen-address
    // computation (:2993-3011). SB-4@2907 (the generic COLIDE banner), TB-5@3048 / TB-6@3070
    // (timebase) and SHIP-*@3157+ (the player process) all sit OUTSIDE both windows —
    // verified this session — so this cannot false-green off a pre-existing claim.
    const collisionClaim = claims.find((c) => {
      const s = c.source
      if (!('line' in s) || typeof s.line !== 'number') return false // byte-only citations carry no line
      return s.file === 'DEFA7.SRC' && ((s.line >= 2908 && s.line <= 2925) || (s.line >= 2993 && s.line <= 3011))
    })
    expect(
      collisionClaim,
      'no collision claim yet — GREEN adds docs/rom-study/claims/13-collision.json enrolling the ' +
        'exclusive box test (DEFA7.SRC:2914-2922) and the CENTMP screen-address model (:2998-3008); ' +
        'brief-dossier.test.ts then byte-verifies each verbatim against the vendored source',
    ).toBeDefined()
  })
})
