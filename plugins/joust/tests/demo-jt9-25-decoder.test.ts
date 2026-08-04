// tests/demo-jt9-25-decoder.test.ts
//
// Story jt9-25 — RED phase (TEA). COMMIT 1: the signed-POSOFF decoder (jt9-13
// folded in). This is the render-only fix that MUST land as its own commit AHEAD
// of the EGGTBL cutscene — it moves NO simulation state (posOffset is read only by
// drawList/entityOp, never by the sim), so it is NOT a fingerprint mover and must
// not share a commit with the cutscene, which is.
//
// ─── THE BUG ─────────────────────────────────────────────────────────────────
// posOffset (demo.ts, sole call site inside entityOp) decodes a transcribed POSOFF
// word as `{ xoff: rec.position >> 8, yoff: 256 - (rec.position & 0xff) }`. The ROM
// POSOFF macro packs `XOFF*256 + 256-YOFF` (JOUSTI.SRC:12-13) and XOFF is SIGNED —
// a sprite whose art hangs LEFT of its hot spot carries a negative XOFF. `>> 8` on
// the stored unsigned word returns the raw high byte, so a negative XOFF comes back
// as its unsigned complement. The Y half is correct; only the X, and only for a
// word with the high bit set.
//
// MEASURED at RED against the two records jt8-7 added (pictures.ts:1718-1719):
//   EGGB2  position $FFF6  ->  today xoff = 255   | correct signed XOFF = -1
//   EGGB3  position $FEF5  ->  today xoff = 254   | correct signed XOFF = -2
// Every OTHER ENTITY_RECORD holds a position word whose high byte is in [0, 2]
// (measured: 48 of 50 records lie in [237, 751]), so the sign-extension leaves them
// byte-identical — that is the positive control below.
//
// FIX (Dev): sign-extend the high byte IN THE DECODER — `const hi = rec.position >>
// 8; xoff = hi > 127 ? hi - 256 : hi` — and EXPORT posOffset so this guard can call
// the real decoder rather than a test-local copy of it (a copy would inherit the
// bug and pass). Keep the raw 16-bit word in the record; the sign belongs in the
// decoder, not the data (jt8-7's reviewed decision).
//
// Node env on purpose (dynamic import of demo.js off disk). This header never spells
// the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { loadPictures } from './helpers/pictures-contract.js'

/**
 * Load jt9-25's new demo.ts exports with a self-describing RED failure — the
 * loadDemoRender idiom, kept LOCAL so the shared render contract is not coupled to
 * this story's additions. The specifier is assembled at runtime so the bundler
 * cannot resolve it statically and red the whole file at collection.
 */
interface EggAnimModule {
  posOffset(name: string): { xoff: number; yoff: number }
}
async function loadPosOffset(): Promise<EggAnimModule> {
  const specifier = ['..', '..', 'src', 'core', 'demo.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>
  if (typeof mod.posOffset !== 'function') {
    throw new Error(
      'jt9-25 commit 1 not built — demo.ts must EXPORT posOffset (today it is a ' +
        'private function). GREEN sign-extends its high byte so a negative XOFF ' +
        'decodes signed, and exports it so this decode-range guard exercises the ' +
        'real decoder instead of a copy.',
    )
  }
  return mod as unknown as EggAnimModule
}

/** The correct signed decode, computed independently of the module under test. */
const signedXoff = (position: number): number => {
  const hi = position >> 8
  return hi > 127 ? hi - 256 : hi
}

describe('jt9-25 AC-1 — posOffset sign-extends a high-bit POSOFF word (jt9-13)', () => {
  it('EGGB2 ($FFF6) decodes to xoff -1 (not +255); its Y half (10) is untouched', async () => {
    const { posOffset } = await loadPosOffset()
    const off = posOffset('EGGB2')
    // The whole point: -1, the LEFT-hanging hatch sprite. Today this is 255.
    expect(off.xoff, 'EGGB2 XOFF is signed -1, not the unsigned complement 255').toBe(-1)
    expect(off.yoff, 'the Y half was always correct: 256 - 0xF6 = 10').toBe(10)
  })

  it('EGGB3 ($FEF5) decodes to xoff -2 (not +254); its Y half (11) is untouched', async () => {
    const { posOffset } = await loadPosOffset()
    const off = posOffset('EGGB3')
    expect(off.xoff, 'EGGB3 XOFF is signed -2, not 254').toBe(-2)
    expect(off.yoff, '256 - 0xF5 = 11').toBe(11)
  })

  it('EVERY ENTITY_RECORD decodes to a valid signed byte offset (-128..127)', async () => {
    const { posOffset } = await loadPosOffset()
    const pics = await loadPictures()
    // The story's named guard: a decode over the whole table. Reds TODAY for exactly
    // EGGB2 (255) and EGGB3 (254); stays meaningful as more high-bit words arrive.
    const outOfRange = pics.ENTITY_RECORDS.map((r) => ({ name: r.name, xoff: posOffset(r.name).xoff }))
      .filter((d) => d.xoff < -128 || d.xoff > 127)
    expect(outOfRange, 'records whose XOFF decoded outside a signed byte').toEqual([])
  })

  it('the decode MATCHES the independent signed formula for every record — value, not just range', async () => {
    const { posOffset } = await loadPosOffset()
    const pics = await loadPictures()
    // Range alone is vacuous for the 48 clean records (their high byte is already
    // <= 127). This pins the exact value against a formula computed here, so the
    // high-bit pair is checked as -1/-2 AND the clean records are proven UNMOVED by
    // the fix (the positive control: sign-extension must not perturb them).
    for (const r of pics.ENTITY_RECORDS) {
      expect(posOffset(r.name).xoff, `${r.name} (position ${r.position}) XOFF`).toBe(
        signedXoff(r.position),
      )
    }
  })

  it('exactly two records carry the high bit — the fix has a real, non-empty subject', async () => {
    const pics = await loadPictures()
    // Non-vacuity floor: if a refactor ever drops EGGB2/EGGB3, the range guard above
    // silently becomes an assertion about nothing. This fails loudly if the only two
    // records the decoder fix exists for disappear.
    const highBit = pics.ENTITY_RECORDS.filter((r) => r.position >> 8 > 127).map((r) => r.name)
    expect(highBit.sort(), 'the high-bit records the sign-extension is for').toEqual(['EGGB2', 'EGGB3'])
  })
})
