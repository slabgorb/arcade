// plugins/defender/src/core/effects.ts
//
// Story df4-2 (GREEN) — the MATERIALIZE / EXPLODE effect lifecycle and the ADR-0005
// photosensitivity policy. A pure, clock-free port of SAMEXAP7's APPEAR/EXPLODE animation
// (reference/original-source/defender/SAMEXAP7.SRC) over the df2-4 INERT image tables,
// plus the effect-policy classifier and the render-side guard that ADR-0005
// (docs/adr/0005-photosensitivity-accessibility-exception.md) requires. The src/core purity
// sweep (tests/purity.test.ts) scans this file; it reads no clock, mints no entropy, reaches
// no browser surface, imports no shell code — the only import is a TYPE from a sibling core
// module.
//
// ─── THE ROM MODEL, LINE BY LINE (SAMEXAP7.SRC) ───────────────────────────────────
//   Effect vectors (:15-18)  `ORG APVCT` then `JMP APST 'APPEAR START'` (:16) /
//        `JMP EXST 'EXPLOSION START'` (:17) / `JMP EXPU 'EXPANDED UPDATE'` (:18). This
//        module ports the two lifecycles the vector table names, driven by the ROM's own
//        per-object size counter RSIZE.
//   APST — APPEAR START (:23-65)  seeds `LDD #$AF00 / STD RSIZE,Y` (:58). $AF00 has bit 15
//        SET — the ROM's tag for an APPEAR (EXPU tests `BMI` = negative → appear, :128,:134).
//   EXST — EXPLOSION START (:70-118)  seeds `LDD #$100 / STD RSIZE,Y` (:91), a POSITIVE
//        size — the ROM's tag for an EXPLOSION.
//   EXPU — the per-frame update (:123-179), one step of whichever animation RSIZE encodes:
//        • EXPLOSION UPDATE (:135-143)  `ADDD #$AA` (:136) grow, then `CMPA #$30 / BLS EXPU3`
//          (:138-139): while the HIGH byte ≤ $30 keep going; once it exceeds $30 the
//          explosion is finished (the ROM erases and zeroes RSIZE).
//        • APPEAR UPDATE (:162-165)  `SUBD #$100` (:163) shrink, then `BPL EXPU6` (:165):
//          the appear finishes the frame the value goes non-negative (the sign bit clears) —
//          $AF00 counts DOWN through $8000 to $7F00, at which point BPL fires.
//
//   Expressed as the ROM's own signed-16-bit RSIZE arithmetic (what `advance` implements):
//     APPEAR : size starts $AF00 (negative);  size -= $100 /frame; done when size goes
//              non-negative — i.e. size < $8000, the sign bit clearing (`BPL`).
//     EXPLODE: size starts $0100 (positive);  size += $AA  /frame; done when the high byte
//              exceeds $30 — i.e. (size >> 8) > $30 (`CMPA #$30 / BLS`).
//   The pictures animated are the df2-4 INERT tables (objects.ts, OBJECTS): an EffectState
//   REFERENCES the picture's ObjectImage; it re-transcribes no pixels (AC1).
//
// ─── THE ADR-0005 SUBSTITUTION (the ONE exception to ROM-always-wins) ──────────────
// Three ROM effects are full-screen white/inverse STROBES the owner (photosensitive
// epilepsy) cannot safely playtest: player death / terrain explosion (the `TERBLO`
// 'BLOW UP TERRAIN' process, DEFB6.SRC:434 `NEWP TERBLO` / :437 label), and — in df5 —
// smart bomb and hyperspace. ADR-0005 rules: the effect's TRIGGER and TIMING are ported and
// cited as usual (the constants below, enrolled in claims/14-effects.json and byte-verified
// by tests/audit/brief-dossier.test.ts); only the strobe PRESENTATION is substituted by a
// seizure-safe variant, and that substitution is NAMED in the session Design Deviation.
//   • an ordinary enemy explosion → LOCALIZED, rastered normally.
//   • player death               → a brief FREEZE + FADE of the existing frame.
//   • terrain explosion (TERBLO)  → a non-strobing PARTICLE burst, bounded in area/contrast.
// assertNoFullFrameStrobe() is the render-side guard ADR-0005 §Decision.4 requires: no effect
// path may write a whole-framebuffer inversion / white-fill in a single frame, so a later
// refactor cannot silently reintroduce the ROM behaviour.

import type { ObjectImage } from './objects.js'

// ─── Lifecycle constants, ported and cited (AC4). Every value is enrolled in
//     docs/rom-study/claims/14-effects.json and byte-verified against the vendored source. ─

/** SAMEXAP7.SRC:58  `LDD #$AF00` — the negative APPEAR seed (RSIZE, bit 15 set). */
export const APPEAR_INIT_SIZE = 0xaf00
/** SAMEXAP7.SRC:91  `LDD #$100` — the positive EXPLODE seed (RSIZE). */
export const EXPLODE_INIT_SIZE = 0x0100
/** SAMEXAP7.SRC:136 `ADDD #$AA` — per-frame explosion growth. */
export const EXPLODE_GROW = 0xaa
/** SAMEXAP7.SRC:138 `CMPA #$30` — the explosion is finished once the high byte exceeds this. */
export const EXPLODE_DONE_HI = 0x30
/** SAMEXAP7.SRC:163 `SUBD #$100` — per-frame appear shrink. */
export const APPEAR_STEP = 0x100

/** The bit-15 boundary of the ROM's signed-16-bit RSIZE: a value ≥ this is negative (an
 *  APPEAR still running); the APPEAR is finished the frame it drops below (`BPL`). */
const SIGN_BIT = 0x8000

/** The largest 4-bit palette index — the framebuffer stores one nibble per cell (a
 *  whole-frame fill of this is the "white-fill" strobe the guard forbids). */
const INDEX_MAX = 0xf

// ─── Effect lifecycle types ─────────────────────────────────────────────────────────

/** APPEAR (APST, negative RSIZE) or EXPLODE (EXST, positive RSIZE). */
export type EffectKind = 'appear' | 'explode'

/** One frame of an in-flight effect: the ROM's RSIZE counter, the INERT picture it animates
 *  (referenced from OBJECTS — never re-transcribed), and whether the lifecycle finished this
 *  frame. Immutable — `advance` returns a NEW state (a pure reducer). */
export interface EffectState {
  readonly kind: EffectKind
  /** RSIZE: the ROM's signed-16-bit animation counter (SAMEXAP7.SRC:58,91,136,163). */
  readonly size: number
  /** The df2-4 INERT ObjectImage this effect animates — the SAME object passed in. */
  readonly picture: ObjectImage
  /** True the frame the ROM's finish test fires (EXPLODE `CMPA #$30` / APPEAR `BPL`). */
  readonly done: boolean
}

// ─── Effect policy types (ADR-0005) ─────────────────────────────────────────────────

/** The three effect events df4-2 classifies. `enemy-explode` rasters normally;
 *  `player-death` and `terrain-blow` (TERBLO) are the full-frame strobes ADR-0005
 *  substitutes. (Smart bomb / hyperspace are df5, consuming this same policy.) */
export type EffectEvent = 'enemy-explode' | 'player-death' | 'terrain-blow'

/** LOCALIZED effects raster normally; FULL-FRAME-STROBE effects render as a safe variant. */
export type EffectClass = 'localized' | 'full-frame-strobe'

/** How an effect is presented: the normal raster, or one of the ADR-0005 safe variants. */
export type SafePresentation = 'raster' | 'freeze' | 'fade' | 'particle'

/** The policy for one event: its class and the presentation it renders as. */
export interface EffectPolicy {
  readonly class: EffectClass
  readonly presentation: SafePresentation
}

// ─── The appear / explode lifecycle over a passed-in INERT picture (AC1) ─────────────

/** APST (SAMEXAP7.SRC:16,58): begin a materialize over `picture`. Seeds the negative APPEAR
 *  size; the picture is held by reference (no pixel copy). */
export function startAppear(picture: ObjectImage): EffectState {
  return { kind: 'appear', size: APPEAR_INIT_SIZE, picture, done: false }
}

/** EXST (SAMEXAP7.SRC:17,91): begin an explosion over `picture`. Seeds the positive EXPLODE
 *  size; the picture is held by reference (no pixel copy). */
export function startExplode(picture: ObjectImage): EffectState {
  return { kind: 'explode', size: EXPLODE_INIT_SIZE, picture, done: false }
}

/**
 * EXPU (SAMEXAP7.SRC:135-165): advance one frame, returning a NEW state (pure — mutates
 * neither the input state nor its picture).
 *   EXPLODE: `size += EXPLODE_GROW` (ADDD #$AA); finished once `(size >> 8) > EXPLODE_DONE_HI`
 *            (CMPA #$30 / BLS — the high byte passing $30).
 *   APPEAR : `size -= APPEAR_STEP` (SUBD #$100); finished once `size < 0x8000` (BPL — the
 *            signed value going non-negative as $AF00 counts down through $8000 to $7F00).
 */
export function advance(effect: EffectState): EffectState {
  if (effect.kind === 'explode') {
    const size = effect.size + EXPLODE_GROW
    return { ...effect, size, done: (size >> 8) > EXPLODE_DONE_HI }
  }
  const size = effect.size - APPEAR_STEP
  return { ...effect, size, done: size < SIGN_BIT }
}

// ─── The ADR-0005 effect-policy classifier (AC2) ─────────────────────────────────────

/**
 * Classify an effect event: LOCALIZED (rastered normally) vs FULL-FRAME-STROBE (rendered as
 * an ADR-0005 safe variant). The player death becomes a freeze+fade of the existing frame;
 * the terrain explosion (TERBLO, DEFB6.SRC:434,437) becomes a non-strobing particle burst.
 */
export function classify(event: EffectEvent): EffectPolicy {
  switch (event) {
    case 'enemy-explode':
      return { class: 'localized', presentation: 'raster' }
    case 'player-death':
      return { class: 'full-frame-strobe', presentation: 'fade' }
    case 'terrain-blow':
      return { class: 'full-frame-strobe', presentation: 'particle' }
    default:
      return assertNever(event)
  }
}

/** Exhaustiveness guard: a new EffectEvent that reaches here is a compile error, not a
 *  silent fall-through (lang-review #3/#34 — no unhandled enum/union case). */
function assertNever(event: never): never {
  throw new Error(`unhandled effect event: ${String(event)}`)
}

// ─── The ADR-0005 render-side guard (AC3) ────────────────────────────────────────────

/**
 * The render guard ADR-0005 §Decision.4 requires. Throws if applying an effect turned
 * `before` into `after` as a WHOLE-FRAMEBUFFER strobe in a single frame — either
 *   • a WHITE-FILL: every cell is the max index ($F), and it was not already uniformly $F, or
 *   • an INVERSION: every cell is the 4-bit complement of the cell it replaced ($F ^ before).
 * A bounded/localized change, a freeze (no change), or a partial fade passes. Frame nibble
 * indices are compared cell-for-cell; mismatched lengths are treated as a change but never a
 * whole-frame strobe.
 */
export function assertNoFullFrameStrobe(
  before: Uint8Array | readonly number[],
  after: Uint8Array | readonly number[],
): void {
  const n = after.length
  if (n === 0) return

  let changed = false
  let allWhite = true
  let allInverted = true
  for (let i = 0; i < n; i++) {
    const b = before[i]
    const a = after[i]
    if (a !== b) changed = true
    if (a !== INDEX_MAX) allWhite = false
    // A cell outside `before`'s range (length mismatch) has no complement to match, so it
    // cannot be part of a whole-frame inversion.
    if (i >= before.length || a !== (INDEX_MAX ^ b)) allInverted = false
  }

  if (!changed) return // a freeze holds the frame — safe
  if (allWhite) {
    throw new Error('effect strobe blocked: whole-framebuffer white-fill in a single frame (ADR-0005)')
  }
  if (allInverted) {
    throw new Error('effect strobe blocked: whole-framebuffer inversion in a single frame (ADR-0005)')
  }
}
