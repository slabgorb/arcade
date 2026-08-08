// plugins/missile-command/tests/palette-docs.test.ts
//
// Story mc9-2 — RED phase (Han Solo / TEA). AC2: open question O-5 is RESOLVED in
// writing. O-5 (brief.md:135-138) is the palette / 3rd-colour-bit / hardware address
// scramble that mc3 render explicitly did not reproduce. The resolution must record
// HOW REV-01 maps palette indices to the 8 hardware colours — and it is the ONLY
// remaining "## Open questions" bullet (besides O-3) with no `*(RESOLVED — see …)*`.
//
// ─── THE MEASURED RESOLUTION (from reference/source this session) ─────────────────
// The colour SOURCE the open bullet asks to "Confirm" is the eight colour REGISTERS
// COL000..COL111 (W3INT.MAC:93-107), each named for its 3-bit pixel index. SETCOL
// (W3DSUP.MAC:1593) fills them each wave from the per-wave DBLCOL row (W3DSUP.MAC:
// 1684-1702), selected by ((wave-1)>>1) mod 10. So a pixel's 3 bits index COL000..
// COL111 → a colour CODE (CWHITE..CBLACK, W3COMN.MAC:491-505) → a hue. We reproduce
// that palette; we still do NOT reproduce the hardware ADDRESS SCRAMBLE (get_bit3_addr)
// — that half of O-5 stays a deliberate non-goal.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// brief.md:135-138 today carries NO `*(RESOLVED — see …)*` marker, still ends with the
// open imperative "Confirm colour source.", and names neither the colour registers nor
// SETCOL. GREEN (Yoda) flips O-5 to resolved and records the mapping. (The claims that
// CITE the palette source are pinned separately in palette-source.test.ts.)

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const romStudy = join(root, 'docs', 'rom-study')
const briefPath = join(romStudy, 'brief.md')

const readDoc = (path: string, label: string): string => {
  if (!existsSync(path)) throw new Error(`docs/rom-study/${label} does not exist — that should not happen`)
  return readFileSync(path, 'utf8')
}

// Framings that assert O-5 is STILL open (targeted so a bare "resolved" or the
// "## Open questions" heading does not trip it).
const STILL_OPEN = /\b(unresolved|still\s+open|is\s+open|O-5\s+open|not\s+(?:yet\s+|fully\s+)?(?:resolved|pinned|confirmed)|to\s+be\s+(?:pinned|confirmed))\b/i

/** The O-5 bullet region: its line through the line before the next `- **O-` bullet
 *  or `## ` heading (or EOF). O-5 is the last open-questions bullet today. */
function o5Region(doc: string): string {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => /^-\s+\*\*O-5\*\*/.test(l))
  if (start < 0) return ''
  let end = start + 1
  while (end < lines.length && !/^(-\s+\*\*O-|##\s)/.test(lines[end])) end++
  return lines.slice(start, end).join('\n')
}
const o5LinesOf = (doc: string): string[] => doc.split('\n').filter((l) => /\bO-5\b/.test(l))

describe('mc9-2 AC2 — brief.md marks O-5 resolved', () => {
  it('the brief still references O-5 (the tag is kept, not deleted)', () => {
    expect(o5LinesOf(readDoc(briefPath, 'brief.md')).length, 'brief.md must still reference O-5').toBeGreaterThan(0)
  })

  it('positively marks O-5 RESOLVED — and a NEGATED "not resolved" does NOT satisfy the guard', () => {
    const region = o5Region(readDoc(briefPath, 'brief.md'))
    expect(region.length, 'the O-5 bullet region must be found').toBeGreaterThan(0)
    expect(
      /\bRESOLVED\b/i.test(region) && !STILL_OPEN.test(region),
      'the O-5 bullet must positively state it is resolved (the `*(RESOLVED — see …)*` marker its siblings carry)',
    ).toBe(true)
  })

  it('no O-5 mention still frames it as open / unresolved / unconfirmed', () => {
    const openish = o5LinesOf(readDoc(briefPath, 'brief.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, `every O-5 mention must be updated to the resolved framing: ${openish.join(' | ')}`).toEqual([])
  })

  it('retires the stale "Confirm colour source." open imperative', () => {
    expect(
      /Confirm colour source\./i.test(readDoc(briefPath, 'brief.md')),
      'the O-5-is-open imperative "Confirm colour source." must be retired now the source is confirmed',
    ).toBe(false)
  })
})

describe('mc9-2 AC2 — the O-5 resolution records HOW palette indices map to the 8 hardware colours', () => {
  const region = (): string => o5Region(readDoc(briefPath, 'brief.md'))

  it('names the colour-register source: SETCOL / COL000..COL111 (the pixel-index → colour mechanism)', () => {
    // The open bullet named the palette + W3DSUP but NOT the register mechanism, so this
    // is the substance of the resolution ("Confirm colour source" → the 8 registers).
    expect(
      /\bSETCOL\b|\bCOL000\b|\bCOL111\b/.test(region()),
      'the resolved O-5 must record the colour registers COL000..COL111 (filled by SETCOL) as the colour source',
    ).toBe(true)
  })

  it('keeps the per-wave palette source citation (SET UP COLORS / W3DSUP.MAC:1583)', () => {
    expect(
      /SET UP COLORS|W3DSUP\.MAC:1583/i.test(region()),
      'the resolution must still cite the per-wave palette routine',
    ).toBe(true)
  })

  it('still records the deliberate non-goal: the hardware address scramble is NOT reproduced', () => {
    // The other half of O-5 stays a non-goal; the resolution must not silently drop it.
    expect(
      /scramble|3rd[- ]?colou?r|bit3|get_bit3/i.test(region()),
      'the resolution must keep the "we do not reproduce the address scramble" decision',
    ).toBe(true)
  })
})

// If GREEN records the answer in a dedicated resolution doc it links from the RESOLVED
// marker (the O-1/O-2/O-4 precedent), that linked doc must actually exist. This does
// NOT require a separate doc — an inline resolution in the brief bullet is allowed —
// it only forbids a DANGLING link.
describe('mc9-2 AC2 — a linked resolution doc, if any, exists (no dangling reference)', () => {
  it('every rom-study doc the O-5 bullet links resolves to a real file', () => {
    const region = o5Region(readDoc(briefPath, 'brief.md'))
    const links = [...region.matchAll(/\]\(\.\/([A-Za-z0-9._-]+\.md)\)/g)].map((m) => m[1])
    for (const rel of links) {
      expect(existsSync(join(romStudy, rel)), `O-5 links ./${rel} but docs/rom-study/${rel} does not exist`).toBe(true)
    }
  })
})
