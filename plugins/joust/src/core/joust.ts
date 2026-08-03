// src/core/joust.ts
//
// Story jt2-3 (GREEN, Julia) — entity-vs-entity collision and the game's
// namesake resolution: broad-phase box, narrow-phase spans, THE JOUST, the
// bounce-apart laws, the PBUMPX/PBUMPY drain laws, facing + the reachable skid
// chain, and the kill-score events.
//
// CORE: pure functions over plain numbers and plain records — no clock, no
// ambient entropy, no browser surface, no shell import. Every function is a pure
// transform of the state handed in (the jt1-7 purity scanner sweeps this file;
// AC-4 determinism depends on it — no argument is ever mutated). The only import
// is the sibling flight core's ground-state machine.
//
// The behaviour is pinned by the joust behavioural suite; the ROM-law
// provenance by its companion vendored-source suite + the JT23-* claims in
// docs/rom-study/claims/joust.json (byte-verified against the vendored 1982
// Williams source).
//
// ─── THE JOUST RESOLVES ON WHOLE PIXELS + PLANTZ (fraction EXCLUDED) ──────────
// TEA's dossier correction (a Design Deviation from AC-1, raised as a blocking
// Conflict): the dossier (subsystems.md:137-139) and AC-1 say OSTBO compares
// `(PLANTZ + PPOSY)` "16-bit, FRACTION INCLUDED". The vendored source does the
// OPPOSITE — three ways:
//   1. `PPOSY RMB 3` (RAMDEF.SRC:174) is [super-high, PIXEL, fraction].
//   2. OSTBO reads `ADDD PPOSY,X` / `SUBD PPOSY,U` at offset +0
//      (JOUSTRV4.SRC:5008-5009) — the [super-high, pixel] WORD; the flight core
//      reads the 8.8 value at `PPOSY+1` ("FRACTIONAL DISTANCE", :6494). The +1
//      is the point.
//   3. `PLANTZ = 2` is "A LANTZ 2 PIXELS LOWER" (:6071) — whole pixels.
// So `plantHeight = plantZ + (posY >> 8)`, the fraction (`posY & 0xff`)
// EXCLUDED. Two entities on the SAME whole pixel but different fractions TIE
// (both bounce — the corrected false-tie trap); PLANTZ=2 (a skid) DOES decide.

import { GROUND_STATES, type PlayerInput } from './flight.js'

// ─── Types ────────────────────────────────────────────────────────────────

/** `PFACE` — facing: +1 right, −1 left (RAMDEF.SRC:186 — 0=right, <>0=left). */
export type Facing = -1 | 1

/** Which party an entity belongs to — enemies never kill each other. */
export type Party = 'player' | 'enemy'

/** The three ground enemies whose kills carry a transcribed DVALUE score. */
export type EnemyType = 'bounder' | 'hunter' | 'shadowLord'

/** An axis-aligned collision box in pixel space (`HITEM`'s PPOSX/PCOLX + PCOLY). */
export interface CollisionBox {
  x: number
  y: number
  w: number
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
 * A joust participant. `plantZ`/`facing`/`bumpX`/`bumpY`/`party` are the jt2-3
 * additions to the flight/ground `EntityState`. `posY` is 8.8 fixed (high byte =
 * pixel) — but the joust compares only `posY >> 8`, the WHOLE pixel.
 */
export interface JoustEntity {
  posX: number
  posY: number
  velY: number
  velX: number
  plantZ: number
  facing: Facing
  bumpX: number
  bumpY: number
  party: Party
  enemyType?: EnemyType
  collision: string | null
  groundState: string | null
  /**
   * jt9-9 — `PEGG,U`, the eggs this enemy has left, carried onto the collision
   * entity so DEATH3 can TRANSFER it to the egg instead of inventing a fresh
   * four (`LDA PEGG,U  TRANSFER NBR OF EGG LEFT / STA PEGG,Y / DEC PEGG,Y`,
   * JOUSTRV4.SRC:2999-3001).
   *
   * OPTIONAL, and absent reads as a full `EGGS_PER_ENEMY`: a player carries no
   * egg count at all, and a fixture that does not care about the count should
   * not have to supply one. Only the enemy side is ever read.
   */
  eggsLeft?: number
}

/** The outcome of a resolved joust. */
export type JoustOutcome =
  | { kind: 'kill'; winner: 'a' | 'b'; loser: 'a' | 'b'; score: number; victimType?: EnemyType }
  | { kind: 'bounce' }

/** The bump drained this frame plus what remains in the register. */
export interface BumpDrain {
  applied: number
  remaining: number
}

// ─── Cited constants ────────────────────────────────────────────────────────

/** `COFF EQU $0200` (JOUSTI.SRC:7) — the collision-span bias. HEX. */
export const COFF = 0x0200

/** `$8000` — "NO COLISION ON THIS LINE" span sentinel (JOUSTI.SRC:837). HEX. */
export const NO_COLLISION_ROW = 0x8000

/** `$8100` — end-of-table span sentinel (JOUSTI.SRC:73). HEX. */
export const END_OF_TABLE = 0x8100

/** `PLANTZ = 2` while skidding — "2 PIXELS LOWER" (JOUSTRV4.SRC:6071-6072). DECIMAL. */
export const SKID_PLANT_Z = 2

/** `PBUMPX` drain cap — at most 3 px/frame (`CMPA #3`, JOUSTRV4.SRC:7273-7276). DECIMAL. */
export const BUMP_X_MAX_PER_FRAME = 3

/** Winner's vertical shove: `PBUMPY = −2` (`LDA #-2`, OSTXUP, JOUSTRV4.SRC:5163). DECIMAL. */
export const BUMP_Y_TOP = -2

/** Loser's vertical shove: `PBUMPY = +2` (`LDA #2`, OSTXDN, JOUSTRV4.SRC:5175). DECIMAL. */
export const BUMP_Y_BOTTOM = 2

// ─── Broad phase (box) ────────────────────────────────────────────────────

/**
 * The X-then-Y axis-aligned box intersection (`HITEM`, JOUSTRV4.SRC:4909-4923):
 * "X INTERSECTION" then "Y INTERSECTION". Overlap requires BOTH axes to overlap.
 * Pure.
 */
export function broadPhase(a: CollisionBox, b: CollisionBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

// ─── Narrow phase (transcribed spans) ─────────────────────────────────────

/** Subtract the COFF bias from a stored span word. Pure. */
export function unbias(word: number): number {
  return word - COFF
}

/** Do two inclusive pixel intervals [l,r] overlap? */
function intervalsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1]
}

/**
 * Resolve a stored span table into per-scanline entries up to the first `$8100`
 * end-of-table sentinel: a `$8000` no-collision row becomes `null`, every real
 * row becomes its COFF-unbiased `[left, right]` pair. Walking stops at `$8100`,
 * so any rows after it (a truncated / malformed table) are never reached.
 */
function resolveSpans(spans: Array<[number, number]>): Array<[number, number] | null> {
  const out: Array<[number, number] | null> = []
  for (const [lo, hi] of spans) {
    if (lo === END_OF_TABLE) break
    if (lo === NO_COLLISION_ROW) {
      out.push(null)
      continue
    }
    out.push([unbias(lo), unbias(hi)])
  }
  return out
}

/**
 * Walk two entities' collision-span masks aligned by their on-screen `top`
 * (`BPCOL`, JOUSTRV4.SRC:7043): for a scanline both masks cover, collide iff
 * their COFF-unbiased [l,r] spans overlap. A `$8000` row contributes no
 * collision; the walk stops at `$8100`. `masks` supplies the transcribed span
 * tables by name (pictures.ts COLLISION_TABLES). Pure.
 */
export function narrowPhase(
  a: MaskRef,
  b: MaskRef,
  masks: Record<string, Array<[number, number]>>,
): boolean {
  const rowsA = resolveSpans(masks[a.name] ?? [])
  const rowsB = resolveSpans(masks[b.name] ?? [])
  for (let i = 0; i < rowsA.length; i++) {
    const spanA = rowsA[i]
    if (spanA === null) continue
    const j = a.top + i - b.top
    if (j < 0 || j >= rowsB.length) continue
    const spanB = rowsB[j]
    if (spanB === null) continue
    if (intervalsOverlap(spanA, spanB)) return true
  }
  return false
}

// ─── The joust ────────────────────────────────────────────────────────────

/**
 * The joust height metric: `plantZ + (posY >> 8)` — PLANTZ in WHOLE pixels plus
 * the WHOLE-pixel Y (`ADDD PPOSY,X` at offset +0, JOUSTRV4.SRC:5008-5009). The
 * fraction (`posY & 0xff`) is NOT included. Smaller = higher on screen = the
 * winner. Pure.
 */
export function plantHeight(e: JoustEntity): number {
  return e.plantZ + (e.posY >> 8)
}

/**
 * Resolve a contact (`OSTBO`, JOUSTRV4.SRC:5002-5017). Enemies never kill each
 * other (`ANDA PID,X / BITA #$04 / BNE`, :4953-4961) → always `bounce`.
 * Otherwise: strictly-smaller `plantHeight` WINS and kills the other (`BMI`,
 * :5011); an EXACT tie (`BEQ` "SAME LEVEL", :5010) → `bounce`. A `kill` carries
 * the victim's `killScore`. Pure — neither argument is mutated.
 */
export function resolveJoust(a: JoustEntity, b: JoustEntity): JoustOutcome {
  if (a.party === 'enemy' && b.party === 'enemy') return { kind: 'bounce' }

  const ha = plantHeight(a)
  const hb = plantHeight(b)
  if (ha === hb) return { kind: 'bounce' }

  const [winner, loser]: ['a' | 'b', 'a' | 'b'] = ha < hb ? ['a', 'b'] : ['b', 'a']
  const victim = ha < hb ? b : a
  return {
    kind: 'kill',
    winner,
    loser,
    score: victim.enemyType ? killScore(victim.enemyType) : 0,
    victimType: victim.enemyType,
  }
}

// ─── Bounce-apart ─────────────────────────────────────────────────────────

/**
 * The one on TOP goes up (`OSTXUP`, JOUSTRV4.SRC:5163-5173): `bumpY = −2`, and a
 * downward ("wrong-way") velocity is inverted and halved (`NEG…/ASR` → a signed
 * negate then >>1). An already-rising velocity is left alone. Pure.
 */
export function bounceTop(e: JoustEntity): JoustEntity {
  return {
    ...e,
    bumpY: BUMP_Y_TOP,
    velY: e.velY > 0 ? -e.velY >> 1 : e.velY,
  }
}

/**
 * The one on the BOTTOM goes down (`OSTXDN`, JOUSTRV4.SRC:5175-5185):
 * `bumpY = +2`, and an upward ("wrong-way") velocity is inverted and halved. An
 * already-falling velocity is left alone. Pure.
 */
export function bounceBottom(e: JoustEntity): JoustEntity {
  return {
    ...e,
    bumpY: BUMP_Y_BOTTOM,
    velY: e.velY < 0 ? -e.velY >> 1 : e.velY,
  }
}

/**
 * The horizontal reverse for the entity moving TOWARD the other on a same-level
 * hit (`OSTXLF`, JOUSTRV4.SRC:5114-5157): its own X velocity is reversed and
 * "SLOW DOWN A BIT" by 2, and HALF of the original (`ASRA`, :5121) is returned
 * as the `PBUMPX` shove to hand the other. Pure.
 */
export function bounceHorizontal(velX: number): { selfVelX: number; otherBumpX: number } {
  return { selfVelX: -velX + 2, otherBumpX: velX >> 1 }
}

// ─── Bump drain laws ──────────────────────────────────────────────────────

/**
 * Drain PBUMPX by at most 3 px this frame (`WRAPX`, JOUSTRV4.SRC:7270-7288):
 * `|bump| > 3` spends ±3 (`SUBA #3` / the `CMPA #-3` branch) and keeps the rest;
 * otherwise it spends the whole remainder and clears. Pure.
 */
export function drainBumpX(bumpX: number): BumpDrain {
  if (bumpX > BUMP_X_MAX_PER_FRAME) {
    return { applied: BUMP_X_MAX_PER_FRAME, remaining: bumpX - BUMP_X_MAX_PER_FRAME }
  }
  if (bumpX < -BUMP_X_MAX_PER_FRAME) {
    return { applied: -BUMP_X_MAX_PER_FRAME, remaining: bumpX + BUMP_X_MAX_PER_FRAME }
  }
  return { applied: bumpX, remaining: 0 }
}

/**
 * Consume PBUMPY WHOLE in one frame (`ADDA PBUMPY,U / CLR PBUMPY,U`,
 * JOUSTRV4.SRC:6495-6496): shift the WHOLE-pixel Y by the bump — the fraction is
 * kept — and clear the register. Pure.
 */
export function consumeBumpY(e: JoustEntity): JoustEntity {
  const pixel = (e.posY >> 8) + e.bumpY
  return { ...e, posY: (pixel << 8) | (e.posY & 0xff), bumpY: 0 }
}

// ─── Kill scores (event values only) ──────────────────────────────────────

/**
 * The transcribed kill score, DVALUE decoded through the enemy's DVALUR routine
 * (JOUSTRV4.SRC:128, :5562-5573, :7346-7361) — NOT a raw ×100 of the byte:
 *   • bounder    P4DEC $05 via SCRTEN → 0 tens + 5 hundreds = 500.
 *   • hunter     P5DEC $57 via SCRTEN → 5 tens + 7 hundreds = 750 (the trap: a
 *     naive ×100 of $57 would give 5700).
 *   • shadowLord P6DEC $15 via SCRHUN → 1 thousand + 5 hundreds = 1500.
 */
export function killScore(type: EnemyType): number {
  switch (type) {
    case 'bounder':
      return 500
    case 'hunter':
      return 750
    case 'shadowLord':
      return 1500
  }
}

// ─── Facing + the skid chain (the jt1-6 gap this story closes) ─────────────

/**
 * The facing-aware ground transition the generated `stepGround` could not do
 * (it has no facing to compare the joystick against). The ROM's transitions are
 * facing-relative: `dir === facing` ⇒ `onPlus`, `dir === −facing` ⇒ `onMinus`
 * (the reversal / skid chain), `dir === 0` ⇒ `onZero`. Pure.
 */
export function groundTransition(groundStateId: string, facing: Facing, dir: -1 | 0 | 1): string {
  const state = GROUND_STATES[groundStateId]
  if (!state) throw new RangeError(`unknown ground state ${groundStateId}`)
  if (dir === 0) return state.onZero
  if (dir === facing) return state.onPlus
  return state.onMinus
}

/**
 * One ground frame that CAN reach the skid chain: transition by
 * `groundTransition(entity.facing)`, and set `plantZ = SKID_PLANT_Z` when the
 * new state is a SKIDR state (else preserve `plantZ`). A facing-vs-input
 * reversal enters `onMinus` (a SKIDR state) → `plantZ = 2`, which lowers the
 * lance into a LOSING joust. Pure — the input is untouched.
 */
export function groundStep(entity: JoustEntity, input: PlayerInput): JoustEntity {
  if (entity.groundState === null || !GROUND_STATES[entity.groundState]) return entity
  const nextId = groundTransition(entity.groundState, entity.facing, input.dir)
  const next = GROUND_STATES[nextId]
  return {
    ...entity,
    groundState: next.id,
    plantZ: next.call === 'SKIDR' ? SKID_PLANT_Z : entity.plantZ,
  }
}
