// tests/effects.test.ts
//
// Story df4-2 — RED phase (Han Solo / TEA). MATERIALIZE / EXPLODE EFFECTS + the ADR-0005
// photosensitivity exception — the ONE place "ROM-always-wins" is knowingly overridden,
// decided at the df4 epic kickoff (docs/adr/0005-photosensitivity-accessibility-exception.md).
// A pure, clock-free port of SAMEXAP7's APPEAR/EXPLODE lifecycle
// (reference/original-source/defender/SAMEXAP7.SRC) driving the df2-4 INERT image tables,
// PLUS the effect-policy classifier and the render-side guard ADR-0005 requires.
//
// ─── THE ROM MODEL, LINE BY LINE (SAMEXAP7.SRC) ───────────────────────────────────
//   Effect vectors (:15-18)   `ORG APVCT` then three `JMP`s: APST 'APPEAR START' (:16),
//        EXST 'EXPLOSION START' (:17), EXPU 'EXPANDED UPDATE' (:18). df4-2 ports the two
//        lifecycles the vector table names — appear and explode — over a per-object size
//        counter RSIZE.
//   APST — APPEAR START (:23-65)  materialises an object: seeds a RAM allocation and sets
//        the initial animation size `LDD #$AF00 / STD RSIZE,Y` (:58). $AF00 has bit 15 SET
//        — the ROM's tag for an APPEAR (EXPU tests `BMI` = negative → appear; :128,:134).
//   EXST — EXPLOSION START (:70-118)  blows an object up: `LDD #$100 / STD RSIZE,Y` (:91)
//        seeds a POSITIVE initial size — the ROM's tag for an EXPLOSION.
//   EXPU — the per-frame update (:123-179)  one step of whichever animation RSIZE encodes:
//        • EXPLOSION UPDATE (:135-143)  `ADDD #$AA` grow the size (:136), then
//          `CMPA #$30 / BLS EXPU3` (:138-139): while the HIGH byte ≤ $30 keep going; once
//          it exceeds $30 the explosion is finished (erase, `LDD #0` kill).
//        • APPEAR UPDATE (:162-165)  `SUBD #$100` shrink the size (:163), then `BPL EXPU6`
//          (:165): the appear is finished the frame the value goes non-negative (sign bit
//          clears) — $AF00 counts DOWN through $8000 to $7F00, at which point BPL fires.
//
//   So the two lifecycles, expressed as the ROM's own signed-16-bit RSIZE arithmetic:
//     APPEAR :  size starts $AF00 (negative);  each frame  size -= $100 ;  done when size
//               goes non-negative  (size < $8000 — the sign bit clears, `BPL`).
//     EXPLODE:  size starts $0100 (positive);  each frame  size += $AA  ;  done when the
//               high byte exceeds $30  ((size >> 8) > $30 — `CMPA #$30 / BLS`).
//   The pictures animated are the df2-4 INERT tables (plugins/defender/src/core/objects.ts,
//   OBJECTS) — the effect REFERENCES the table's ObjectImage; it re-transcribes no pixels
//   (AC1: "no re-transcription of the pictures").
//
// ─── THE ADR-0005 SUBSTITUTION (the ONE exception to ROM-always-wins) ──────────────
//   Three ROM effects are full-screen white/inverse STROBES the owner (photosensitive
//   epilepsy) cannot safely playtest: player death / terrain explosion (the `TERBLO`
//   'BLOW UP TERRAIN' process, DEFB6.SRC:434 `NEWP TERBLO` / :437 label), smart bomb and
//   hyperspace (df5). ADR-0005 rules: the effect's TRIGGER and TIMING are ported and cited
//   as usual; only the strobe PRESENTATION is replaced by a seizure-safe variant —
//     player death        → a brief FREEZE + FADE of the existing frame
//     terrain explosion    → a non-strobing PARTICLE burst (bounded in area/contrast)
//     an ordinary enemy explosion is LOCALIZED — it rasters normally.
//   A render-side guard pins the ABSENCE of the strobe: no effect path may write a
//   whole-framebuffer inversion / white-fill in a single frame, so a later refactor cannot
//   silently reintroduce the ROM behaviour (ADR-0005 §Decision.4).
//
// ─── RED / GREEN SPLIT ────────────────────────────────────────────────────────────
// TEA (this file) authors the failing suite and DEFINES the pure seam's contract (the
// local type shim below is the shape GREEN must satisfy). GREEN (Yoda / Dev) ships:
//   1. plugins/defender/src/core/effects.ts — the PURE module: the appear/explode
//      lifecycle (startAppear / startExplode / advance over a passed-in ObjectImage), the
//      classify() effect-policy, the assertNoFullFrameStrobe() render guard, and the cited
//      lifecycle constants. Held to src/core purity (tests/purity.test.ts sweeps it the
//      moment it lands — no clock, no entropy, no browser surface, no shell import).
//   2. plugins/defender/docs/rom-study/claims/14-effects.json — a claims/*.json entry per
//      lifecycle constant introduced (APST/EXST vectors :16-17, the $AF00/$0100 seeds
//      :58/:91, the $AA grow / $30 finish / $100 shrink :136/:138/:163) plus the TERBLO
//      trigger (DEFB6.SRC:434). tests/audit/brief-dossier.test.ts runs checkClaims() over
//      the WHOLE claims/ dir and byte-verifies each verbatim against
//      reference/original-source/defender/ — so the enrolment asserted here (AC4) is then
//      byte-gated for free.
//   3. The 6-field Design Deviation in .session/df4-2-session.md logging the strobe
//      substitution against ADR-0005 (the SM/Dev session-side obligation — not asserted by
//      this suite, which cannot read the private session file, but named in AC2).
//
// ─── WHY THIS IS RED, AND WHY THE GUARD HAS TEETH TODAY ────────────────────────────
// RED now: src/core/effects.js does not exist, so loadEffects() throws a self-describing
// "not built yet" per test — never a cryptic module-resolution stack trace (the harness-
// error trap: a RED failure must prove the FEATURE is absent). The AC4 enrolment test fails
// today because no claim yet cites the effects region: existing SAMEXAP7 claims sit at the
// header (lines 2, 7, 9) and existing DEFB6 claims at 2 / 1292 / the palette 1876-1891 —
// none inside SAMEXAP7:[15,180] (the lifecycle) or DEFB6:[420,460] (TERBLO), verified this
// session — so this cannot false-green off a pre-existing claim.

import { describe, it, expect } from 'vitest'
import { OBJECTS, type ObjectImage } from '../src/core/objects.js'
import { blitObject } from '../src/core/objects.js'
import { createFramebuffer, type Framebuffer } from '../src/core/framebuffer.js'
import { loadClaims } from './audit/dossier-sweep.js'

// ─── The seam contract GREEN must satisfy (local shim; declared here so this suite
//     COMPILES against a not-yet-built module and vitest reports clean per-test failures
//     instead of a collect crash). effects.ts becomes canonical. ───────────────────────

/** APPEAR (APST, negative RSIZE) or EXPLODE (EXST, positive RSIZE). */
type EffectKind = 'appear' | 'explode'

/** One frame of an in-flight effect: the ROM's RSIZE counter, the INERT picture being
 *  animated (referenced from OBJECTS — never re-transcribed), and whether the lifecycle
 *  has finished this frame. Immutable — `advance` returns a NEW state (pure reducer). */
interface EffectState {
  readonly kind: EffectKind
  /** RSIZE: the ROM's signed-16-bit animation counter (SAMEXAP7.SRC:58,91,136,163). */
  readonly size: number
  /** The df2-4 INERT ObjectImage this effect animates — the SAME object passed in. */
  readonly picture: ObjectImage
  /** True the frame the ROM's finish test fires (EXPLODE CMPA #$30 / APPEAR BPL). */
  readonly done: boolean
}

/** The three effect events df4-2 must classify. `enemy-explode` rasters normally;
 *  `player-death` and `terrain-blow` (TERBLO) are the full-frame strobes ADR-0005
 *  substitutes. (Smart bomb / hyperspace are df5, consuming this same policy.) */
type EffectEvent = 'enemy-explode' | 'player-death' | 'terrain-blow'

/** LOCALIZED effects raster normally; FULL-FRAME-STROBE effects render as a safe variant. */
type EffectClass = 'localized' | 'full-frame-strobe'

/** How the effect is presented: the normal raster, or one of the ADR-0005 safe variants. */
type SafePresentation = 'raster' | 'freeze' | 'fade' | 'particle'

/** The policy for one event: its class and the presentation it renders as. */
interface EffectPolicy {
  readonly class: EffectClass
  readonly presentation: SafePresentation
}

interface EffectsModule {
  // ── Lifecycle constants, ported and cited (AC4) ──
  /** SAMEXAP7.SRC:58  `LDD #$AF00` — the negative APPEAR seed. */
  readonly APPEAR_INIT_SIZE: number
  /** SAMEXAP7.SRC:91  `LDD #$100` — the positive EXPLODE seed. */
  readonly EXPLODE_INIT_SIZE: number
  /** SAMEXAP7.SRC:136 `ADDD #$AA` — per-frame explosion growth. */
  readonly EXPLODE_GROW: number
  /** SAMEXAP7.SRC:138 `CMPA #$30` — explosion finished once the high byte exceeds this. */
  readonly EXPLODE_DONE_HI: number
  /** SAMEXAP7.SRC:163 `SUBD #$100` — per-frame appear shrink. */
  readonly APPEAR_STEP: number

  // ── The appear/explode lifecycle over a passed-in INERT picture (AC1) ──
  /** APST: begin a materialize over `picture`. size = APPEAR_INIT_SIZE, done = false. */
  startAppear(picture: ObjectImage): EffectState
  /** EXST: begin an explosion over `picture`. size = EXPLODE_INIT_SIZE, done = false. */
  startExplode(picture: ObjectImage): EffectState
  /** EXPU: one frame. EXPLODE size += EXPLODE_GROW (done when (size>>8) > EXPLODE_DONE_HI);
   *  APPEAR size -= APPEAR_STEP (done when size < 0x8000, the sign bit clearing). Pure —
   *  returns a NEW state, mutates neither the state nor its picture. */
  advance(effect: EffectState): EffectState

  // ── The ADR-0005 effect-policy classifier (AC2) ──
  /** Classify an effect event: LOCALIZED (rastered) vs FULL-FRAME-STROBE (safe variant). */
  classify(event: EffectEvent): EffectPolicy

  // ── The ADR-0005 render-side guard (AC3) ──
  /** Throws if `after` is a whole-framebuffer INVERSION (every cell → 0xF ^ before) or
   *  WHITE-FILL (every cell → 0xF) of `before` — the single-frame strobe ADR-0005 forbids.
   *  A bounded/localized change, a freeze (no change), or a partial fade passes. */
  assertNoFullFrameStrobe(
    before: Uint8Array | readonly number[],
    after: Uint8Array | readonly number[],
  ): void
}

/**
 * Load the not-yet-built module with a self-describing failure. A runtime-assembled
 * specifier so neither tsc nor the bundler resolves it statically; a missing module reads
 * as "not built yet", never a collect crash (the objects-gate / collision.ts pattern).
 */
async function loadEffects(): Promise<EffectsModule> {
  const spec = ['..', 'src', 'core', 'effects.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ spec)) as Partial<EffectsModule>
    for (const fn of ['startAppear', 'startExplode', 'advance', 'classify', 'assertNoFullFrameStrobe'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const k of ['APPEAR_INIT_SIZE', 'EXPLODE_INIT_SIZE', 'EXPLODE_GROW', 'EXPLODE_DONE_HI', 'APPEAR_STEP'] as const) {
      if (typeof mod[k] !== 'number') throw new Error(`module has no \`${k}\` constant`)
    }
    return mod as EffectsModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(
      'src/core/effects.ts not built yet — GREEN (Dev) ports SAMEXAP7’s appear/explode ' +
        'lifecycle as a PURE module: startAppear (APST, size=$AF00 SAMEXAP7.SRC:58) / ' +
        'startExplode (EXST, size=$0100 :91) / advance (EXPLODE +$AA :136 done (size>>8)>$30 ' +
        ':138; APPEAR -$100 :163 done size<$8000) over a passed-in df2-4 ObjectImage; ' +
        'classify() (localized vs full-frame-strobe per ADR-0005; player-death/terrain-blow ' +
        'TERBLO DEFB6.SRC:434 render safe); assertNoFullFrameStrobe() (the render guard); and ' +
        `the cited lifecycle constants. (${why})`,
    )
  }
}

// ─── Fixtures. Real df2-4 INERT tables (OBJECTS) so the lifecycle animates a picture it
//     did not mint; a varied framebuffer so a strobe (every-cell inversion/white-fill) is
//     distinguishable from a bounded blit. ──────────────────────────────────────────────
const pic = (name: string): ObjectImage => {
  const o = OBJECTS.find((r) => r.name === name && r.encoding === 'raster')
  if (!o) throw new Error(`fixture picture ${name} not found in OBJECTS`)
  return o
}
const UFOP1 = pic('UFOP1') // a 6×4 enemy — the thing that explodes when a laser hits it
const TEREX = pic('TEREX') // TERrain EXplosion picture (DEFB6.SRC:453 `LDD #TEREX`)

/** A varied 8×8 index surface: cell i = i mod 16, so no two adjacent cells collide and an
 *  every-cell inversion (0xF ^ cell) differs from the original in every position. */
const variedFrame = (): Uint8Array => Uint8Array.from({ length: 64 }, (_, i) => i % 16)

// ══════════════════════════════════════════════════════════════════════════════════════
// AC1 — effects.ts is a PURE module modelling SAMEXAP7's APPEAR (APST) and EXPLODE (EXST)
// lifecycle over the df2-4 INERT image tables. The effect REFERENCES the passed-in
// ObjectImage — it re-transcribes no pixel data — and `advance` is a pure reducer.
// ══════════════════════════════════════════════════════════════════════════════════════
describe('AC1 — the APST/EXST lifecycle over an INERT picture, as a pure reducer', () => {
  it('startExplode seeds the ROM’s positive EXPLODE size ($0100) and holds the passed picture', async () => {
    const { startExplode, EXPLODE_INIT_SIZE } = await loadEffects()
    const e = startExplode(UFOP1)
    expect(e.kind).toBe('explode')
    expect(e.size, 'EXST seeds RSIZE=$0100 (SAMEXAP7.SRC:91)').toBe(EXPLODE_INIT_SIZE)
    expect(e.done, 'a fresh explosion is not finished').toBe(false)
    // No re-transcription: the effect holds the SAME ObjectImage object from OBJECTS, not a
    // pixel copy of it (AC1 "no re-transcription of the pictures").
    expect(e.picture, 'the effect references the INERT table, it does not mint one').toBe(UFOP1)
  })

  it('startAppear seeds the ROM’s negative APPEAR size ($AF00) and holds the passed picture', async () => {
    const { startAppear, APPEAR_INIT_SIZE } = await loadEffects()
    const a = startAppear(TEREX)
    expect(a.kind).toBe('appear')
    expect(a.size, 'APST seeds RSIZE=$AF00 (SAMEXAP7.SRC:58)').toBe(APPEAR_INIT_SIZE)
    expect(a.done).toBe(false)
    expect(a.picture).toBe(TEREX)
  })

  it('advance grows an EXPLODE by $AA/frame and finishes once the high byte exceeds $30 (SAMEXAP7.SRC:136,138)', async () => {
    const { startExplode, advance, EXPLODE_INIT_SIZE, EXPLODE_GROW, EXPLODE_DONE_HI } = await loadEffects()
    const e1 = startExplode(UFOP1)
    const e2 = advance(e1)
    expect(e2.size, 'one frame adds $AA').toBe(EXPLODE_INIT_SIZE + EXPLODE_GROW)
    expect(e2.done, 'still growing, well under the $30 high-byte finish').toBe(false)
    // Run to completion. The finish condition is the ROM's own CMPA #$30 / BLS: done the
    // first frame the HIGH byte exceeds $30 — pinned to the constant, not a magic count.
    let cur = e1
    let steps = 0
    while (!cur.done && steps < 1000) {
      cur = advance(cur)
      steps++
    }
    expect(cur.done, 'the explosion terminates').toBe(true)
    expect(cur.size >> 8, 'it finished because the high byte passed $30 (CMPA #$30)').toBeGreaterThan(
      EXPLODE_DONE_HI,
    )
  })

  it('advance shrinks an APPEAR by $100/frame and finishes when the sign bit clears (SAMEXAP7.SRC:163, BPL)', async () => {
    const { startAppear, advance, APPEAR_INIT_SIZE, APPEAR_STEP } = await loadEffects()
    const a1 = startAppear(UFOP1)
    const a2 = advance(a1)
    expect(a2.size, 'one frame subtracts $100').toBe(APPEAR_INIT_SIZE - APPEAR_STEP)
    expect(a2.done, '$AE00 is still negative — the appear is not finished').toBe(false)
    // $AF00 counts DOWN through $8000 to $7F00; the appear finishes the frame the value
    // goes non-negative (sign bit clears — the ROM's BPL). Pin BOTH sides of that edge.
    let cur = a1
    let prev = a1
    let steps = 0
    while (!cur.done && steps < 1000) {
      prev = cur
      cur = advance(cur)
      steps++
    }
    expect(cur.done, 'the appear terminates').toBe(true)
    expect(cur.size, 'it finished because the size went non-negative (BPL): < $8000').toBeLessThan(0x8000)
    expect(prev.size, 'the frame before, the size was still negative (≥ $8000)').toBeGreaterThanOrEqual(0x8000)
  })

  it('advance is a pure reducer — it returns a new state and mutates neither input nor picture', async () => {
    const { startExplode, advance } = await loadEffects()
    const e = startExplode(UFOP1)
    const sizeBefore = e.size
    const bytesBefore = [...UFOP1.bytes]
    const once = advance(e)
    const again = advance(e)
    expect(e.size, 'the original state is untouched by advance (immutability)').toBe(sizeBefore)
    expect([...UFOP1.bytes], 'the INERT picture is never written').toEqual(bytesBefore)
    expect(once, 'advance is deterministic — same input, same output (no clock/entropy)').toEqual(again)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC2 — the effect-policy classifier distinguishes LOCALIZED effects (rastered normally)
// from FULL-FRAME-STROBE effects (rendered as an ADR-0005 safe variant). The ordinary enemy
// explosion rasters; the player death renders as freeze/fade; the terrain explosion
// (TERBLO, DEFB6.SRC:434,437) renders as a non-strobing particle burst. Mutation-lethal: a
// classifier that returns one class for everything fails half these, in either direction.
// ══════════════════════════════════════════════════════════════════════════════════════
describe('AC2 — the ADR-0005 effect-policy classifier', () => {
  it('an ordinary enemy explosion is LOCALIZED and rasters normally', async () => {
    const { classify } = await loadEffects()
    expect(classify('enemy-explode')).toEqual({ class: 'localized', presentation: 'raster' })
  })

  it('the player death is a FULL-FRAME-STROBE rendered as freeze/fade (never a raster strobe)', async () => {
    const { classify } = await loadEffects()
    const death = classify('player-death')
    expect(death.class, 'death is the ROM full-screen strobe ADR-0005 substitutes').toBe('full-frame-strobe')
    expect(
      ['freeze', 'fade'],
      'the safe death presentation is a freeze or a fade of the existing frame, not a raster/particle',
    ).toContain(death.presentation)
  })

  it('the terrain explosion (TERBLO, DEFB6.SRC:434,437) is a FULL-FRAME-STROBE rendered as a particle burst', async () => {
    const { classify } = await loadEffects()
    expect(classify('terrain-blow')).toEqual({ class: 'full-frame-strobe', presentation: 'particle' })
  })

  it('the classes are DISTINCT — the classifier is not a constant in either direction', async () => {
    const { classify } = await loadEffects()
    expect(classify('enemy-explode').class).toBe('localized')
    expect(classify('player-death').class).toBe('full-frame-strobe')
    expect(classify('terrain-blow').class).toBe('full-frame-strobe')
    // A localized effect never renders a safe strobe variant; a strobe never rasters raw.
    expect(classify('enemy-explode').presentation).toBe('raster')
    expect(classify('player-death').presentation).not.toBe('raster')
    expect(classify('terrain-blow').presentation).not.toBe('raster')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC3 — the render-side guard ADR-0005 §Decision.4 requires: NO effect path may write a
// whole-framebuffer inversion / white-fill in a single frame. Mutation-proven — a planted
// full-frame inversion (and a planted white-fill) MUST redden the guard, while a bounded
// blit, a freeze (no change), and a real localized object blit MUST pass. A guard that
// never throws fails the strobe cases; a guard that always throws fails the safe cases.
// ══════════════════════════════════════════════════════════════════════════════════════
describe('AC3 — assertNoFullFrameStrobe: the no-single-frame-inversion guard', () => {
  it('THROWS on a planted whole-framebuffer INVERSION (every cell → 0xF ^ cell)', async () => {
    const { assertNoFullFrameStrobe } = await loadEffects()
    const before = variedFrame()
    const inverted = Uint8Array.from(before, (v) => 0xf ^ v) // the ROM strobe, planted
    expect(() => assertNoFullFrameStrobe(before, inverted)).toThrow()
  })

  it('THROWS on a planted whole-framebuffer WHITE-FILL (every cell → 0xF)', async () => {
    const { assertNoFullFrameStrobe } = await loadEffects()
    const before = variedFrame()
    const white = Uint8Array.from(before, () => 0xf)
    expect(() => assertNoFullFrameStrobe(before, white)).toThrow()
  })

  it('PASSES a bounded/localized change — a single cell differs, not the whole frame', async () => {
    const { assertNoFullFrameStrobe } = await loadEffects()
    const before = variedFrame()
    const after = Uint8Array.from(before)
    after[5] = (after[5] + 1) & 0xf // one cell changed
    expect(() => assertNoFullFrameStrobe(before, after)).not.toThrow()
  })

  it('PASSES a freeze — an identical frame (the safe death variant holds the frame)', async () => {
    const { assertNoFullFrameStrobe } = await loadEffects()
    const before = variedFrame()
    expect(() => assertNoFullFrameStrobe(before, Uint8Array.from(before))).not.toThrow()
  })

  it('PASSES a real localized object blit — the LOCALIZED effect path the guard must allow', async () => {
    const { assertNoFullFrameStrobe } = await loadEffects()
    // A real df2-4 blit changes only the object's bounded footprint, never the whole frame.
    const fb: Framebuffer = createFramebuffer(64, 32)
    fb.data.set(Uint8Array.from({ length: fb.data.length }, (_, i) => i % 16)) // varied ground
    const before = Uint8Array.from(fb.data)
    blitObject(fb, UFOP1, 10, 8)
    const after = Uint8Array.from(fb.data)
    expect(after, 'the blit must actually change something (else the test is vacuous)').not.toEqual(before)
    expect(() => assertNoFullFrameStrobe(before, after)).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC4 — the ROM trigger and TIMING of each effect are ported and cited; only the strobe
// PRESENTATION is exempt (and the exemption is NAMED, ADR-0005). The exported lifecycle
// constants equal the ROM's values, and a claims/*.json entry enrols the effects region so
// tests/audit/brief-dossier.test.ts byte-verifies each verbatim against the vendored source.
// ══════════════════════════════════════════════════════════════════════════════════════
describe('AC4 — the lifecycle constants are the ROM’s, and are enrolled in claims/*.json', () => {
  it('the exported constants equal the SAMEXAP7 lifecycle values, byte-for-byte with the source', async () => {
    const { APPEAR_INIT_SIZE, EXPLODE_INIT_SIZE, EXPLODE_GROW, EXPLODE_DONE_HI, APPEAR_STEP } = await loadEffects()
    expect(APPEAR_INIT_SIZE, 'SAMEXAP7.SRC:58  LDD #$AF00').toBe(0xaf00)
    expect(EXPLODE_INIT_SIZE, 'SAMEXAP7.SRC:91  LDD #$100').toBe(0x0100)
    expect(EXPLODE_GROW, 'SAMEXAP7.SRC:136 ADDD #$AA').toBe(0xaa)
    expect(EXPLODE_DONE_HI, 'SAMEXAP7.SRC:138 CMPA #$30').toBe(0x30)
    expect(APPEAR_STEP, 'SAMEXAP7.SRC:163 SUBD #$100').toBe(0x100)
  })

  it('GREEN enrols a claim citing the effects region — the SAMEXAP7 lifecycle or the TERBLO trigger', () => {
    const claims = loadClaims()
    // Match on the citation LOCATION, in the effects-SPECIFIC regions no existing claim
    // touches: the SAMEXAP7 lifecycle (vectors :16-17 through the EXPU update :179) and the
    // TERBLO terrain-blow trigger (DEFB6.SRC:420-460). Existing SAMEXAP7 claims sit at the
    // header (lines 2, 7, 9) and existing DEFB6 claims at 2 / 1292 / palette 1876-1891 — all
    // OUTSIDE both windows (verified this session) — so this cannot false-green.
    const effectsClaim = claims.find((c) => {
      const s = c.source
      if (!('line' in s) || typeof s.line !== 'number') return false // byte-only citations carry no line
      return (
        (s.file === 'SAMEXAP7.SRC' && s.line >= 15 && s.line <= 180) ||
        (s.file === 'DEFB6.SRC' && s.line >= 420 && s.line <= 460)
      )
    })
    expect(
      effectsClaim,
      'no effects claim yet — GREEN adds docs/rom-study/claims/14-effects.json enrolling the ' +
        'APST/EXST vectors (SAMEXAP7.SRC:16-17), the $AF00/$0100 seeds (:58/:91), the $AA/$30/$100 ' +
        'lifecycle constants (:136/:138/:163) and the TERBLO trigger (DEFB6.SRC:434); ' +
        'brief-dossier.test.ts then byte-verifies each verbatim against the vendored source',
    ).toBeDefined()
  })
})
