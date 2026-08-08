// tests/font-source-all-glyphs.test.ts
//
// Story jt10-8 — RED (Tyr One-Handed / TEA). Extend the font source gate from
// the ~10 glyphs jt10-1 pinned (font35.test.ts + font57.test.ts, the PINS loops)
// to ALL ~102 — every glyph in each font's FDB `order`.
//
// jt10-1's Heimdall review filed this: "source double-entry + citation gates
// guard only 10/102 glyphs — filed as jt10-8." It names TWO gates, and the
// user's AC-4 ruling (2026-08-07) put BOTH in scope:
//
//   1. THE DOUBLE-ENTRY GATE (module-vs-source bitmap). The jt10-1 port is
//      faithful — Heimdall re-decoded all ~102 with 0 drift — so this gate is
//      GREEN on arrival for every glyph. It is not a bug hunt; it is the standing
//      regression guard that a LATER edit to font35.ts / font57.ts cannot corrupt
//      an unpinned glyph in silence. Its teeth are proven by the mutation blocks
//      below (a single corrupted glyph, previously outside PINS, is now caught).
//
//   2. THE CITATION GATE (docs/rom-study/claims/*.json + check-citations.mjs).
//      Only the 10 pinned glyph header lines carry a committed claim today, so
//      the all-glyph citation blocks below are the RED this story drives: GREEN
//      (Julia) adds the ~90 remaining byte-verified `verbatim` claims to
//      docs/rom-study/claims/font.json, one per distinct glyph header line.
//
// Measured inventory (pinned at RED time — a floor guard, not a drift):
//   FONT35: order 49 slots, 47 distinct glyph header lines (O→S0, S→S5 alias).
//   FONT57: order 53 slots, 53 distinct glyph header lines (no reuse).
//   100 distinct headers total; 10 cited at RED; 90 to add.
//
// Every vendored read lives inside an it() body (the tp1-8 collection trap): the
// source blocks are skipIf(!vendoredAvailable). The citation blocks read only
// committed JSON, so they run everywhere.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'
import {
  loadFont35,
  loadFont57,
  decodeGlyphFromSource,
  FONT_SOURCE_FILE,
  type Font,
} from './helpers/font-contract.js'

const FONTS: ReadonlyArray<{
  name: 'FONT35' | 'FONT57'
  load: () => Promise<Font>
  orderFloor: number
  distinctGlyphs: number
  cell: [number, number]
}> = [
  { name: 'FONT35', load: loadFont35, orderFloor: 49, distinctGlyphs: 47, cell: [4, 5] },
  { name: 'FONT57', load: loadFont57, orderFloor: 53, distinctGlyphs: 53, cell: [6, 7] },
]

const asRows = (rows: ReadonlyArray<ReadonlyArray<number>>): number[][] => rows.map((r) => [...r])

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE DOUBLE-ENTRY GATE, ALL GLYPHS (AC-1 font35, AC-2 font57)
//    module bitmap == an INDEPENDENT re-reading of MESSAGE.SRC, for EVERY glyph
//    in `order` — not just the PINS subset. Green on arrival (faithful port); it
//    is the guard that keeps a future edit from drifting an unpinned glyph.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('font source double-entry — ALL glyphs re-derive from MESSAGE.SRC (jt10-8)', () => {
  for (const { name, load, orderFloor, distinctGlyphs } of FONTS) {
    it(`${name}: every glyph in order matches its MESSAGE.SRC re-derivation`, async () => {
      const f = await load()
      // Completeness floor: the FDB order cannot be silently gutted below what
      // jt10-1 shipped, or the loop below would "cover all glyphs" vacuously.
      expect(f.order.length, `${name} order shrank below its jt10-1 inventory`).toBeGreaterThanOrEqual(
        orderFloor,
      )

      const seen = new Set<number>()
      const mismatches: string[] = []
      for (const ch of f.order) {
        const g = f.glyphFor(ch)
        expect(g, `${name} order slot '${ch}' has no glyph`).toBeDefined()
        const src = decodeGlyphFromSource(g!.srcLine)
        if (JSON.stringify(asRows(g!.rows)) !== JSON.stringify(asRows(src.rows))) {
          mismatches.push(`'${ch}' @${FONT_SOURCE_FILE}:${g!.srcLine}`)
        }
        seen.add(g!.srcLine)
      }
      expect(mismatches, `${name} module glyphs drifted from MESSAGE.SRC`).toEqual([])
      // Every order slot was checked, and the distinct glyph count matches the
      // measured inventory (aliases fold; new glyphs must bump this number).
      expect(seen.size, `${name} distinct glyph count changed`).toBe(distinctGlyphs)
    })
  }

  // NON-VACUITY (AC-3): the all-glyph gate has teeth on a PREVIOUSLY-UNPINNED
  // glyph. Corrupt one glyph ('Z' — never in PINS) in a cloned font and prove the
  // same comparison flags exactly it. Without this, a green sweep proves nothing.
  for (const { name, load } of FONTS) {
    it(`${name}: the gate catches a single corrupted unpinned glyph ('Z')`, async () => {
      const real = await load()
      const realZ = real.glyphFor('Z')!
      const flipped = asRows(realZ.rows).map((row) => row.map((p) => (p ? 0 : 1)))
      expect(flipped, "flipped Z must differ from real Z").not.toEqual(asRows(realZ.rows))

      const mutant: Font = {
        ...real,
        glyphFor: (ch) => (ch === 'Z' ? { ...realZ, rows: flipped } : real.glyphFor(ch)),
      }

      const drifted: string[] = []
      for (const ch of mutant.order) {
        const g = mutant.glyphFor(ch)!
        const src = decodeGlyphFromSource(g.srcLine)
        if (JSON.stringify(asRows(g.rows)) !== JSON.stringify(asRows(src.rows))) drifted.push(ch)
      }
      expect(drifted, `${name} gate must flag the corrupted 'Z' and nothing else`).toEqual(['Z'])
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE CITATION GATE, ALL GLYPHS (AC-4) — THE RED THIS STORY DRIVES.
//    Every distinct glyph header line must carry a committed claim, so
//    check-citations.mjs re-opens MESSAGE.SRC at each. Only 10 are cited today
//    → RED. GREEN (Julia) adds the ~90 remaining claims to
//    docs/rom-study/claims/font.json.
// ─────────────────────────────────────────────────────────────────────────────
describe('font citation gate — ALL glyphs are cited under the joust citation guard (jt10-8)', () => {
  for (const { name, load } of FONTS) {
    it(`${name}: every distinct glyph header line has a committed claim`, async () => {
      const f = await load()
      const claims = loadClaims()

      // Distinct header lines (fold the O→S0 / S→S5 aliases), each tagged with a
      // representative character for a readable failure list.
      const byLine = new Map<number, string>()
      for (const ch of f.order) {
        const g = f.glyphFor(ch)!
        if (!byLine.has(g.srcLine)) byLine.set(g.srcLine, ch)
      }

      const uncited = [...byLine.entries()]
        .filter(([line]) => !claimCovers(claims, FONT_SOURCE_FILE, line, line))
        .map(([line, ch]) => `'${ch}' @${FONT_SOURCE_FILE}:${line}`)

      expect(
        uncited,
        `${name}: ${uncited.length}/${byLine.size} glyph header lines lack a byte-verified claim in ` +
          `docs/rom-study/claims/ — GREEN adds one committed claim per line (check-citations.mjs ` +
          `re-opens MESSAGE.SRC there)`,
      ).toEqual([])
    })
  }

  // NON-VACUITY (AC-3, citation side): claimCovers must actually discriminate —
  // a header line with no claim reports uncited. Otherwise the RED above could be
  // green for the wrong reason.
  it('claimCovers rejects a line no claim cites (the check is not vacuously true)', () => {
    const claims = loadClaims()
    expect(claimCovers(claims, FONT_SOURCE_FILE, 999_999, 999_999)).toBe(false)
  })
})
