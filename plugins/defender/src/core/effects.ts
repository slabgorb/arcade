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
// 'BLOW UP TERRAIN' process, triggered by `NEWP TERBLO` DEFB6.SRC:434; the TERBLO label is
// DEFB6.SRC:439, under the `*TERRAIN BLOW PROCESS` banner at :437), and — in df5 —
// smart bomb and hyperspace. ADR-0005 rules: the effect's TRIGGER and TIMING are ported and
// cited as usual (the constants below, enrolled in claims/14-effects.json and byte-verified
// by tests/audit/brief-dossier.test.ts); only the strobe PRESENTATION is substituted by a
// seizure-safe variant, and that substitution is NAMED in the session Design Deviation.
//   • an ordinary enemy explosion → LOCALIZED, rastered normally.
//   • player death               → a brief FADE of the existing frame (classify → 'fade').
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
  /** The df2-4 INERT ObjectImage this effect animates — the SAME object passed in. Absent on a
   *  SCREEN effect (pt1-25): a full-frame fade/freeze substitute animates no sprite. */
  readonly picture?: ObjectImage
  /** The ADR-0005 event this effect presents (pt1-25). A LOCALIZED materialize/explosion is
   *  `enemy-explode`; a SCREEN effect carries its own event so the composer `classify()`s it
   *  into the seizure-safe presentation instead of the sprite raster. */
  readonly event: EffectEvent
  /** True the frame the ROM's finish test fires (EXPLODE `CMPA #$30` / APPEAR `BPL`). */
  readonly done: boolean
}

// ─── Effect policy types (ADR-0005) ─────────────────────────────────────────────────

/** The effect events the policy classifies. `enemy-explode` rasters normally; the rest are
 *  the full-frame strobes ADR-0005 substitutes: `player-death` and `terrain-blow` (TERBLO,
 *  df4-2), plus the two df5-5 emergency powers — `smart-bomb` (the SBMBX0 COM PCRAM whole-page
 *  invert, DEFA7.SRC:3199) and `hyperspace` (the screen-clear). df5 CITES this same policy. */
export type EffectEvent = 'enemy-explode' | 'player-death' | 'terrain-blow' | 'smart-bomb' | 'hyperspace'

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
 *  size; the picture is held by reference (no pixel copy). `event` tags the ADR-0005 policy —
 *  a materialize is a LOCALIZED `enemy-explode`. */
export function startAppear(picture: ObjectImage, event: EffectEvent = 'enemy-explode'): EffectState {
  return { kind: 'appear', size: APPEAR_INIT_SIZE, picture, event, done: false }
}

/** EXST (SAMEXAP7.SRC:17,91): begin an explosion over `picture`. Seeds the positive EXPLODE
 *  size; the picture is held by reference (no pixel copy). `event` tags the ADR-0005 policy —
 *  an enemy death is a LOCALIZED `enemy-explode`. */
export function startExplode(picture: ObjectImage, event: EffectEvent = 'enemy-explode'): EffectState {
  return { kind: 'explode', size: EXPLODE_INIT_SIZE, picture, event, done: false }
}

/** pt1-25 → df8-2: begin a SCREEN effect for `event` (player death / smart bomb / hyperspace).
 *  It has NO sprite — the composer `classify()`s it as a SCREEN event and, since df8-2
 *  (owner not photosensitive, corrected 2026-08-21), paints no full-field substitute for it.
 *  It rides the EXPLODE decay so it retires itself. */
export function startScreen(event: EffectEvent): EffectState {
  return { kind: 'explode', size: EXPLODE_INIT_SIZE, event, done: false }
}

/**
 * EXPU (SAMEXAP7.SRC:135-165): advance one frame, returning a NEW state (pure — mutates
 * neither the input state nor its picture).
 *   EXPLODE: `size += EXPLODE_GROW` (ADDD #$AA); finished once `(size >> 8) > EXPLODE_DONE_HI`
 *            (CMPA #$30 / BLS — the high byte passing $30).
 *   APPEAR : `size -= APPEAR_STEP` (SUBD #$100); finished once `size < 0x8000` (BPL — the
 *            signed value going non-negative as $AF00 counts down through $8000 to $7F00).
 * A non-finite `size` (a corrupted, hand-built EffectState) throws rather than animating
 * forever — with NaN, `(size >> 8)` folds to 0 and `size < SIGN_BIT` is false, so `done`
 * would never fire and a per-frame `advance` loop would never retire the effect.
 */
export function advance(effect: EffectState): EffectState {
  if (!Number.isFinite(effect.size)) {
    throw new Error(
      `advance: non-finite effect size (${String(effect.size)}) — an EffectState must be seeded ` +
        'by startAppear/startExplode, not hand-built; a corrupted size never reaches `done`.',
    )
  }
  switch (effect.kind) {
    case 'explode': {
      const size = effect.size + EXPLODE_GROW
      return { ...effect, size, done: (size >> 8) > EXPLODE_DONE_HI }
    }
    case 'appear': {
      const size = effect.size - APPEAR_STEP
      return { ...effect, size, done: size < SIGN_BIT }
    }
    default:
      return assertNever(effect.kind)
  }
}

// ─── The ADR-0005 effect-policy classifier (AC2) ─────────────────────────────────────

/**
 * Classify an effect event: LOCALIZED (rastered normally) vs FULL-FRAME-STROBE (rendered as
 * an ADR-0005 safe variant). The player death becomes a freeze+fade of the existing frame;
 * the terrain explosion (TERBLO — trigger `NEWP TERBLO` DEFB6.SRC:434, label at :439) becomes
 * a non-strobing particle burst.
 */
export function classify(event: EffectEvent): EffectPolicy {
  switch (event) {
    case 'enemy-explode':
      return { class: 'localized', presentation: 'raster' }
    case 'player-death':
      return { class: 'full-frame-strobe', presentation: 'fade' }
    case 'terrain-blow':
      return { class: 'full-frame-strobe', presentation: 'particle' }
    case 'smart-bomb':
      // df5-5: the SBMBX0 COM PCRAM whole-page invert (DEFA7.SRC:3199) → a bounded fade.
      return { class: 'full-frame-strobe', presentation: 'fade' }
    case 'hyperspace':
      // df5-5: the HYPER screen-clear (DEFA7.SRC:3218) → a held freeze across the jump.
      return { class: 'full-frame-strobe', presentation: 'freeze' }
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
 * The render guard ADR-0005 §Decision.4 requires. This is a MEDICAL-SAFETY guard, so it
 * FAILS CLOSED: a frame pair it cannot compare is refused, not waved through.
 *
 * It throws when:
 *   • the frames are un-comparable — `after` is empty, or the two lengths differ, or any cell
 *     is non-finite (a corrupted frame it cannot certify safe), OR
 *   • applying an effect turned `before` into `after` as a WHOLE-FRAMEBUFFER strobe in a
 *     single frame — either a WHITE-FILL (every cell the max index $F, not already uniform $F)
 *     or an INVERSION (every cell the 4-bit complement, $F ^ before).
 * A bounded/localized change, a freeze (no change), or a partial fade of an equal-length,
 * finite frame passes.
 *
 * SCOPE (df4-2): it catches the ROM's two literal strobe forms — the COM-inversion (df5's
 * smart bomb inverts colour RAM) and the white-fill — which is AC3's "whole-framebuffer
 * inversion/white-fill". A near-total strobe that spares a cell, or a uniform fill to a
 * bright index other than $F, is NOT caught here; generalising to a tolerance-based
 * "no near-full-screen flash" is df7's job (the "no strobe anywhere" assertion). See the
 * df4-2 review follow-up.
 */
export function assertNoFullFrameStrobe(
  before: Uint8Array | readonly number[],
  after: Uint8Array | readonly number[],
): void {
  // Fail CLOSED: a guard that cannot line the two frames up must refuse to certify the frame
  // safe rather than vacuously pass it (the repo's own "zero-canvas no-NaN guard vacuous" trap).
  const n = after.length
  if (n === 0 || before.length !== n) {
    throw new Error(
      `assertNoFullFrameStrobe: cannot certify a malformed frame pair safe — before.length=` +
        `${before.length}, after.length=${n} (both must be equal and non-zero) — ADR-0005 fails closed.`,
    )
  }

  let changed = false
  let allWhite = true
  let allInverted = true
  for (let i = 0; i < n; i++) {
    const b = before[i]
    const a = after[i]
    // A non-finite cell (NaN/±Infinity, reachable on the `number[]` overload) makes every
    // `!==` below true, which would silently clear allWhite/allInverted and PASS a corrupted
    // frame. Refuse it instead — a corrupted frame cannot be certified safe.
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(
        `assertNoFullFrameStrobe: non-finite cell at index ${i} (before=${String(b)}, after=${String(a)}) — ` +
          'a corrupted frame cannot be certified safe — ADR-0005 fails closed.',
      )
    }
    if (a !== b) changed = true
    if (a !== INDEX_MAX) allWhite = false
    if (a !== (INDEX_MAX ^ b)) allInverted = false
  }

  if (!changed) return // a freeze holds the frame — safe
  if (allWhite) {
    throw new Error('effect strobe blocked: whole-framebuffer white-fill in a single frame (ADR-0005)')
  }
  if (allInverted) {
    throw new Error('effect strobe blocked: whole-framebuffer inversion in a single frame (ADR-0005)')
  }
}

// ─── df4-6: the placed-effect BANK — the lifecycle above, given a SCREEN POSITION ────
// df4-2 built the pure APST/EXST lifecycle over a passed-in picture; df4-6 wires it into
// the live sim (like laser.ts's createLaserBank). An in-flight effect is a lifecycle PLUS
// where it plays and which INERT picture it animates (SAMEXAP7 animates the object's own
// picture — no pixel is re-transcribed). The bank spawns, advances, and retires them; the
// shell composer (scene.ts) reads the `effects` view and blits each by palette INDEX only.

/** One in-flight effect: its lifecycle (`size`/`done`, the ROM's RSIZE), where it plays
 *  (world-x `x` — camera-offset to its on-screen column at render, scene.ts — and display row `y`), and the INERT picture it
 *  animates (referenced from OBJECTS, never copied). The read-only face the sim exposes. */
export interface PlacedEffect {
  readonly kind: EffectKind
  readonly x: number
  readonly y: number
  readonly done: boolean
  /** RSIZE (SAMEXAP7): the animation counter, so the composer can size the burst. */
  readonly size: number
  /** pt1-25: the event tag, so the composer `classify()`s a SCREEN effect apart from the
   *  localized sprite raster (since df8-2 a SCREEN effect paints nothing full-field). */
  readonly event: EffectEvent
  /** The df2-4 INERT ObjectImage this effect animates — the SAME object, by reference. Absent
   *  on a SCREEN effect (which animates no sprite). */
  readonly picture?: ObjectImage
}

/** The effect bank: the live effects + spawn/step, carried by reference across ticks. */
export interface EffectBank {
  readonly effects: readonly PlacedEffect[]
  /** APST: begin a MATERIALIZE at (x, y) over `picture` (played when an enemy appears). */
  spawnAppear: (x: number, y: number, picture: ObjectImage) => void
  /** EXST: begin an EXPLOSION at (x, y) over `picture` (played when an enemy is killed). */
  spawnExplode: (x: number, y: number, picture: ObjectImage) => void
  /** pt1-25 → df8-2: begin a SCREEN effect for `event` (player death / smart bomb / hyperspace)
   *  — it carries no position or picture, and since df8-2 the composer paints nothing
   *  full-field for it (the pt1-25 wash was removed; owner not photosensitive, 2026-08-21). */
  spawnScreen: (event: EffectEvent) => void
  /** Advance every effect one frame; retire the ones the ROM's finish test has fired. */
  step: () => void
}

/** The internal mutable record — `PlacedEffect` is its read-only face. */
interface EffectRecord {
  effect: EffectState
  x: number
  y: number
}

/**
 * Create an effect bank. Pure and clock-free (the purity sweep scans this file): it reads
 * no clock and mints no entropy — the same discipline as createLaserBank. `step()` retires
 * a finished effect the frame AFTER its `done` fires, so the composer paints the last frame
 * of the animation before it disappears.
 */
export function createEffectBank(): EffectBank {
  const records: EffectRecord[] = []

  const view = (r: EffectRecord): PlacedEffect => ({
    kind: r.effect.kind,
    x: r.x,
    y: r.y,
    done: r.effect.done,
    size: r.effect.size,
    event: r.effect.event,
    picture: r.effect.picture,
  })

  return {
    get effects(): readonly PlacedEffect[] {
      return records.map(view)
    },
    spawnAppear(x, y, picture): void {
      records.push({ effect: startAppear(picture), x, y })
    },
    spawnExplode(x, y, picture): void {
      records.push({ effect: startExplode(picture), x, y })
    },
    spawnScreen(event): void {
      // A screen effect has no position — 0,0 is unused; the composer classifies by `event`.
      records.push({ effect: startScreen(event), x: 0, y: 0 })
    },
    step(): void {
      // Drop the effects that finished LAST frame, then advance the survivors — so a `done`
      // effect is shown once (this frame) and removed next, never animating forever.
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].effect.done) records.splice(i, 1)
      }
      for (const r of records) r.effect = advance(r.effect)
    },
  }
}
