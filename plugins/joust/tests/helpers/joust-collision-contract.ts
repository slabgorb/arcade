// tests/helpers/joust-collision-contract.ts
//
// Story jt2-3 — the CONTRACT for the joust collision + resolution core,
// TEA-authored (O'Brien). Same double-entry split every jt story has used since
// jt1-2: TEA states the module shape and the laws that pin it; Dev (Julia)
// writes the module. The behaviour lives in tests/joust.test.ts; the ROM-law
// provenance in tests/joust-source.test.ts, and every newly-cited range carries
// a committed claim in docs/rom-study/claims/joust.json (byte-verified by the
// citations suite).
//
// ─── WHAT jt2-3 MODELS (all cited; see joust-source.test.ts) ─────────────────
// Entity-vs-entity collision and the game's namesake resolution:
//
//   • BROAD PHASE — an axis-aligned box test (`HITEM`, JOUSTRV4.SRC:4909-4923):
//     the X intersection of the two collision boxes, then the Y intersection.
//   • NARROW PHASE — the transcribed per-scanline collision spans
//     (`BPCOL`, JOUSTRV4.SRC:7043; pictures.md). Masks are COFF-biased
//     (`COFF EQU $0200`, JOUSTI.SRC:7); `$8000` = no collision on this scanline
//     (JOUSTI.SRC:837), `$8100` = end of table (JOUSTI.SRC:73). This story
//     CONSUMES `COLLISION_TABLES` — the count floors owed since the jt1-3 review
//     land here (joust-source.test.ts).
//
// ─── THE JOUST (OSTBO, JOUSTRV4.SRC:5002-5017) ───────────────────────────────
// THE WHOLE-PIXEL RESOLUTION — and a correction to the dossier.
//
//   The winner is whoever is HIGHER on screen (the smaller Y). OSTBO forms
//   `(PLANTZ,X + PPOSY,X) − (PLANTZ,U + PPOSY,U)` and: `BEQ` (equal) ⇒ both
//   bounce, `BMI` (X smaller) ⇒ X wins/U dies, else U wins/X dies —
//   "strictly lower wins, exact tie = both bounce".
//
//   ⚠️  THE COMPARISON IS ON WHOLE PIXELS — THE FRACTION IS EXCLUDED. The
//   dossier (subsystems.md:137-139) and this story's AC-1 say "16-bit, FRACTION
//   INCLUDED … a 1-fraction-unit height difference decides the winner". That is
//   jt1-10-class wrong prose on a green-but-unverified citation. The vendored
//   source is unambiguous, three ways:
//     1. `PPOSY RMB 3` (RAMDEF.SRC:174) — Y is three bytes: [super-high, PIXEL,
//        fraction], big-endian.
//     2. OSTBO reads `ADDD PPOSY,X` / `SUBD PPOSY,U` at offset +0
//        (JOUSTRV4.SRC:5008-5009) — the [super-high, PIXEL] word, i.e. the WHOLE
//        pixel. The flight core, by contrast, reads the 8.8 value at `PPOSY+1`
//        ("ADD IN FRACTIONAL DISTANCE", JOUSTRV4.SRC:6494). The +1 is the point.
//     3. `PLANTZ` is added as a sign-extended byte ($0002 when skidding), and
//        the ROM's own comment calls that "A LANTZ 2 PIXELS LOWER"
//        (JOUSTRV4.SRC:6071). Two PIXELS — only possible if the low byte of the
//        compared word is the pixel, i.e. a whole-pixel compare.
//
//   So this contract pins the ROM: `plantHeight(e) = plantZ + (posY >> 8)`,
//   fraction (posY & 0xff) NOT included. The corrected false-tie trap:
//   two entities on the SAME whole pixel but different FRACTIONS are a TIE (both
//   bounce) — an implementation that "includes the fraction" (per the dossier
//   prose) would wrongly break that tie and is caught. And PLANTZ=2 (a skid) DOES
//   decide, because it is two whole pixels. TEA logs this as a Design Deviation
//   from AC-1 and a blocking Conflict (Delivery Finding); the dossier + AC want
//   correcting.
//
// ─── SKID → PLANTZ (the jt1-6 FACING gap this story closes) ──────────────────
// The ground state machine's `onMinus` transitions are the reversal/skid chain,
// and flight.ts's generated `stepGround` cannot reach them: it has no facing to
// compare the joystick against ("onMinus is unreachable here", flight.ts). This
// story adds FACING (`PFACE`, RAMDEF.SRC:186 — 0=right, <>0=left) and a
// facing-aware ground transition: dir === facing ⇒ onPlus, dir === −facing ⇒
// onMinus, dir === 0 ⇒ onZero. A facing-vs-input REVERSAL then enters the SKIDR
// chain, and skidding sets `PLANTZ = 2` (`SKID_PLANT_Z`, JOUSTRV4.SRC:6071-6072)
// — which lowers the lance into a LOSING joust outcome per the resolution above.
//
// ─── BOUNCE-APART (JOUSTRV4.SRC:5114-5185) ───────────────────────────────────
//   • VERTICAL: the one on TOP gets `PBUMPY = −2` (OSTXUP), the one on the
//     BOTTOM `PBUMPY = +2` (OSTXDN); a "wrong-way" vertical velocity (the top
//     one moving down, the bottom one moving up) is INVERTED and HALVED
//     (`COMA/NEGB/SBCA #-1/ASRA/RORB` — a signed negate then >>1),
//     JOUSTRV4.SRC:5163-5185.
//   • HORIZONTAL: on a same-level (COLDX≠0) hit each entity's X velocity is
//     REVERSED and slowed by 2, and HALF of it is passed to the OTHER as a
//     `PBUMPX` shove; facing flips to point away (JOUSTRV4.SRC:5114-5157).
//
// ─── BUMP REGISTERS ARE ONE-SHOT SHOVES WITH DRAIN LAWS ──────────────────────
//   • PBUMPX drains at most 3 px/frame (`WRAPX`, JOUSTRV4.SRC:7270-7288): while
//     |bump| > 3 it spends ±3 and keeps the rest; otherwise it spends the whole
//     remainder and clears.
//   • PBUMPY is consumed WHOLE in one frame — added to the pixel and cleared
//     (`ADDA PBUMPY,U / CLR PBUMPY,U`, JOUSTRV4.SRC:6495-6496).
//
// ─── ENEMIES NEVER KILL EACH OTHER ───────────────────────────────────────────
// Enemy-vs-enemy contact always BOUNCES, never kills (`ANDA PID,X / BITA #$04 /
// BNE OSTHT2`, JOUSTRV4.SRC:4953-4961). Only a player-vs-enemy (or pvp) joust
// resolves by height.
//
// ─── KILL SCORES (the scoring SEAM — events only, no accumulation) ───────────
// A kill emits a score EVENT carrying the transcribed value; BCD accumulation +
// display + extra men are jt4 (epic scoring ruling). The value is DVALUE
// (JOUSTRV4.SRC:128) decoded by the enemy's DVALUR routine, which is NOT a plain
// ×100 of the byte:
//   • Bounder  P4DEC DVALUE $05 via SCRTEN → 0 tens + 5 hundreds = 500.
//   • Hunter   P5DEC DVALUE $57 via SCRTEN → 5 tens + 7 hundreds = 750  (the
//     TRAP: SCRTEN reads the byte "TENS & HUNDREDS BACKWARDS", JOUSTRV4.SRC:7353;
//     a naive ×100 of $57 would give 5700).
//   • Shadow lord P6DEC DVALUE $15 via SCRHUN → 1 thousand + 5 hundreds = 1500.
// (The 50-points-for-dying credit is DEFERRED — verify-in-emulation caveat.)

import type { EntityState, PlayerInput } from './flight-contract.js'

export type { EntityState, PlayerInput }

/** `PFACE` — facing: +1 right, −1 left (the ROM stores 0=right, <>0=left). */
export type Facing = -1 | 1

/** Which party an entity belongs to — enemies never kill each other. */
export type Party = 'player' | 'enemy'

/** The three ground enemies whose kills carry a transcribed DVALUE score. */
export type EnemyType = 'bounder' | 'hunter' | 'shadowLord'

/** An axis-aligned collision box in pixel space (`HITEM`'s PPOSX/PCOLX + PCOLY). */
export interface CollisionBox {
  /** Left edge, pixels. */
  x: number
  /** Top edge (smaller Y is higher on screen), pixels. */
  y: number
  /** Width, pixels. */
  w: number
  /** Height, pixels. */
  h: number
}

/** A per-scanline collision mask reference for the narrow phase. */
export interface MaskRef {
  /** The COLLISION_TABLES entry name (e.g. `CSTN1R`). */
  name: string
  /** The scanline (pixel Y) of this mask's FIRST span row on screen. */
  top: number
}

/**
 * A joust participant. `plantZ`/`facing`/`bumpX`/`bumpY`/`party` are the
 * jt2-3 additions to the flight/ground `EntityState`; the rest is the shared
 * flight state. `posY` is 8.8 fixed (high byte = pixel) — but the joust compares
 * only `posY >> 8`, the WHOLE pixel (see the header).
 */
export interface JoustEntity {
  /** Whole-pixel X (PPOSX pixel). */
  posX: number
  /** 8.8 fixed Y — high byte the pixel, low byte the fraction (PPOSY+1). */
  posY: number
  /** Signed vertical velocity (PVELY). */
  velY: number
  /** Signed horizontal velocity used by the horizontal bounce (PVELX). */
  velX: number
  /** `PLANTZ` — 0 normally, 2 while skidding; added to the WHOLE-pixel Y. */
  plantZ: number
  /** `PFACE` — +1 right, −1 left. */
  facing: Facing
  /** `PBUMPX` — one-shot horizontal shove, drains ≤3 px/frame. */
  bumpX: number
  /** `PBUMPY` — one-shot vertical shove, consumed whole in one frame. */
  bumpY: number
  /** Which party (enemies never kill each other). */
  party: Party
  /** For an enemy, its type — selects the kill score. */
  enemyType?: EnemyType
  /** The current frame's collision-mask name (narrow phase), or null. */
  collision: string | null
  /** The ground state id (for the skid chain), or null when airborne. */
  groundState: string | null
}

/** The outcome of a resolved joust. */
export type JoustOutcome =
  | { kind: 'kill'; winner: 'a' | 'b'; loser: 'a' | 'b'; score: number; victimType?: EnemyType }
  | { kind: 'bounce' }

/** The bump drained this frame plus what remains in the register. */
export interface BumpDrain {
  /** Pixels applied to the position this frame. */
  applied: number
  /** What stays in the register for next frame. */
  remaining: number
}

export interface JoustModule {
  // ─── Cited constants ──────────────────────────────────────────────────────
  /** `COFF EQU $0200` (JOUSTI.SRC:7) — the collision-span bias. */
  COFF: number
  /** `$8000` — "NO COLISION ON THIS LINE" span sentinel (JOUSTI.SRC:837). */
  NO_COLLISION_ROW: number
  /** `$8100` — end-of-table span sentinel (JOUSTI.SRC:73). */
  END_OF_TABLE: number
  /** `PLANTZ = 2` while skidding — "2 PIXELS LOWER" (JOUSTRV4.SRC:6071-6072). */
  SKID_PLANT_Z: number
  /** `PBUMPX` drain cap — at most 3 px/frame (JOUSTRV4.SRC:7273-7276). */
  BUMP_X_MAX_PER_FRAME: number
  /** Winner's vertical shove: `PBUMPY = −2` (OSTXUP, JOUSTRV4.SRC:5163). */
  BUMP_Y_TOP: number
  /** Loser's vertical shove: `PBUMPY = +2` (OSTXDN, JOUSTRV4.SRC:5175). */
  BUMP_Y_BOTTOM: number

  // ─── Broad phase (box) ────────────────────────────────────────────────────
  /** The X-then-Y box intersection test (`HITEM`, JOUSTRV4.SRC:4909-4923). */
  broadPhase(a: CollisionBox, b: CollisionBox): boolean

  // ─── Narrow phase (transcribed spans) ─────────────────────────────────────
  /** Subtract the COFF bias from a stored span word. */
  unbias(word: number): number

  /**
   * Walk two entities' collision-span masks (from COLLISION_TABLES), aligned by
   * their on-screen `top`, and report whether ANY shared scanline has
   * overlapping (COFF-unbiased) spans. A `$8000` row contributes no collision;
   * the walk stops at `$8100`. `masks` supplies the transcribed span tables by
   * name (pictures.ts COLLISION_TABLES). Pure.
   */
  narrowPhase(a: MaskRef, b: MaskRef, masks: Record<string, Array<[number, number]>>): boolean

  // ─── The joust ────────────────────────────────────────────────────────────
  /**
   * The joust height metric: `plantZ + (posY >> 8)` — PLANTZ in WHOLE pixels
   * plus the WHOLE-pixel Y. The fraction (`posY & 0xff`) is NOT included (see
   * the header; JOUSTRV4.SRC:5008-5009 read PPOSY at offset +0). Smaller = higher
   * on screen = the winner. Pure.
   */
  plantHeight(e: JoustEntity): number

  /**
   * Resolve a contact (`OSTBO`, JOUSTRV4.SRC:5002-5017). Enemies never kill each
   * other → always `bounce`. Otherwise: strictly-smaller `plantHeight` WINS and
   * kills the other; an EXACT tie (equal height) → `bounce`. A `kill` carries the
   * victim's `killScore`. Pure — neither argument is mutated.
   */
  resolveJoust(a: JoustEntity, b: JoustEntity): JoustOutcome

  // ─── Bounce-apart ─────────────────────────────────────────────────────────
  /**
   * The one on TOP goes up (`OSTXUP`, JOUSTRV4.SRC:5163-5173): `bumpY = −2`, and
   * a downward ("wrong-way") velocity is inverted and halved. Pure.
   */
  bounceTop(e: JoustEntity): JoustEntity

  /**
   * The one on the BOTTOM goes down (`OSTXDN`, JOUSTRV4.SRC:5175-5185):
   * `bumpY = +2`, and an upward ("wrong-way") velocity is inverted and halved.
   * Pure.
   */
  bounceBottom(e: JoustEntity): JoustEntity

  /**
   * The horizontal reverse for the entity MOVING TOWARD the other on a
   * same-level hit (`OSTXLF`/`OSTURT`, JOUSTRV4.SRC:5114-5157): its own X
   * velocity is reversed and slowed by 2, and HALF of the original is returned as
   * the shove to hand the other entity as a `PBUMPX`. Pure.
   */
  bounceHorizontal(velX: number): { selfVelX: number; otherBumpX: number }

  // ─── Bump drain laws ──────────────────────────────────────────────────────
  /**
   * Drain PBUMPX by at most 3 px this frame (`WRAPX`, JOUSTRV4.SRC:7270-7288):
   * |bump| > 3 spends ±3 and keeps the rest; otherwise spends the whole remainder
   * and clears. Pure.
   */
  drainBumpX(bumpX: number): BumpDrain

  /**
   * Consume PBUMPY WHOLE in one frame (`ADDA PBUMPY / CLR PBUMPY`,
   * JOUSTRV4.SRC:6495-6496): shift the WHOLE-pixel Y by the bump and clear the
   * register. Returns the entity with `posY` moved and `bumpY = 0`. Pure.
   */
  consumeBumpY(e: JoustEntity): JoustEntity

  // ─── Kill scores (event values only) ──────────────────────────────────────
  /** The transcribed kill score: bounder 500, hunter 750, shadow lord 1500. */
  killScore(type: EnemyType): number

  // ─── Facing + the skid chain ──────────────────────────────────────────────
  /**
   * The facing-aware ground transition the generated `stepGround` could not do:
   * `dir === facing` ⇒ `onPlus`, `dir === −facing` ⇒ `onMinus` (the reversal /
   * skid chain), `dir === 0` ⇒ `onZero`. Pure.
   */
  groundTransition(groundStateId: string, facing: Facing, dir: -1 | 0 | 1): string

  /**
   * One ground frame that CAN reach the skid chain: transition by
   * `groundTransition(entity.facing)`, and set `plantZ = SKID_PLANT_Z` when the
   * new state is a SKIDR state (else preserve `plantZ`). Pure.
   */
  groundStep(entity: JoustEntity, input: PlayerInput): JoustEntity
}

/**
 * Load the not-yet-built joust core with a self-describing failure — the
 * loadEnemy/loadFlight pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/joust.ts` does not exist, so this throws "joust core not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace or a type error.
 */
export async function loadJoust(): Promise<JoustModule> {
  const specifier = ['..', '..', 'src', 'core', 'joust.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<JoustModule>
    for (const fn of [
      'broadPhase',
      'unbias',
      'narrowPhase',
      'plantHeight',
      'resolveJoust',
      'bounceTop',
      'bounceBottom',
      'bounceHorizontal',
      'drainBumpX',
      'consumeBumpY',
      'killScore',
      'groundTransition',
      'groundStep',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['COFF', 'NO_COLLISION_ROW', 'END_OF_TABLE', 'SKID_PLANT_Z'] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as JoustModule
  } catch (e) {
    throw new Error(
      'joust core not built yet — GREEN (Julia) creates joust/src/core/joust.ts to ' +
        'satisfy tests/helpers/joust-collision-contract.ts: broad-phase box + ' +
        'narrow-phase spans (COFF/$8000/$8100), the WHOLE-PIXEL OSTBO resolution ' +
        '(plantZ + posY>>8, fraction EXCLUDED; strict-lower wins, tie bounces), ' +
        'bounce-apart (PBUMPY ∓2 + wrong-way invert/halve + horizontal reverse-2), ' +
        'the PBUMPX (≤3 px/frame) and PBUMPY (whole) drain laws, ' +
        'enemies-never-kill, killScore 500/750/1500, and the facing-aware ' +
        'ground transition that reaches the SKIDR chain (plantZ=2). ' +
        `(${(e as Error).message})`,
    )
  }
}
