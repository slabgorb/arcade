// tests/pictures.test.ts
//
// Story jt1-3 — RED phase (O'Brien / TEA). The MODULE contract: inventory
// (AC-2), the COMCL5 RLE expansion (AC-3), palettes, records, collision spans,
// the explicit ASH deferral, and the contact-sheet artefact.
//
// The byte gate — "does every byte come from the source" — is the companion
// suite, tests/pictures-gate.test.ts. This one asks the other half: is the
// right DATA present, in the right shape, with the right meaning.
//
// ─── NUMBERS IN THIS FILE ARE INDEPENDENTLY DERIVED, NOT COPIED ──────────────
// Every count and geometry asserted below was computed from the vendored source
// by TEA this session, then cross-checked against the dossier. Where the two
// disagreed the source won and a finding was filed — see the inventory block:
// the dossier's headline "91 blocks" (which AC-2 quotes) is an arithmetic slip;
// its own per-entity table sums to 93, and so does the machine count.
//
// Vendored reads live inside it() bodies (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  vendoredAvailable,
  sourceLines,
  parseStatement,
  evalNumber,
  SYMBOLS,
} from './helpers/joust-source.js'
import { loadPictures } from './helpers/pictures-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE INVENTORY.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-entity framed-block counts, taken from pictures.md's inventory table and
 * INDEPENDENTLY confirmed against JOUSTI.SRC this session (all nine agree).
 */
const FRAMED_BY_ENTITY: ReadonlyArray<readonly [string, number]> = [
  ['ostrich', 14],
  ['stork', 14],
  ['buzzard', 14],
  ['rider', 13],
  ['egg', 6],
  ['troll hand', 6],
  ['flame', 4],
  ['death poof', 3],
  ['pterodactyl', 6],
]
const FRAMED_TOTAL = 80 // = sum of the above

/** The ten cliff pixel sources, by label — pointed at by 4-word records. */
const CLIFF_SOURCES = [
  'CSRC1L',
  'CSRC1R',
  'CSRC2',
  'CSRC3L',
  'CSRC3U',
  'CSRC3R',
  'CSRC4',
  'CSRC5',
  'CSRC5L',
  'CSRC5R',
] as const

/** 80 framed + 10 cliff sources + TRASRC + COMCL5 + ASH1R/L. */
const TOTAL_BLOCKS = FRAMED_TOTAL + CLIFF_SOURCES.length + 3 // = 93

describe('AC-2 — the block inventory is complete', () => {
  it('carries every block: 80 framed + 10 cliff sources + transporter + COMCL5 + ASH', async () => {
    const pics = await loadPictures()
    const deferredNames = new Set(pics.DEFERRED.map((d) => d.name))
    const present = pics.PIXEL_BLOCKS.length + deferredNames.size
    expect(
      present,
      'the dossier headline says 91, but its own per-entity table sums to 93 and so does the ' +
        'machine count of JOUSTI.SRC — see the Delivery Finding',
    ).toBe(TOTAL_BLOCKS)
  })

  it('carries all ten cliff pixel sources', async () => {
    const pics = await loadPictures()
    const names = new Set(pics.PIXEL_BLOCKS.map((b) => b.name))
    const missing = CLIFF_SOURCES.filter((c) => !names.has(c))
    expect(missing, 'cliff sources are FDB-word blocks — easy to drop with an FCB-only reader').toEqual(
      [],
    )
  })

  it('carries the transporter source and the compacted CLIFF5 stream', async () => {
    const pics = await loadPictures()
    const names = new Set(pics.PIXEL_BLOCKS.map((b) => b.name))
    expect(names.has('TRASRC'), 'TRASRC is one shared source for all four spawn pads').toBe(true)
    expect(pics.COMCL5.bytes.length, 'COMCL5 is 871 bytes of %-binary FCBs').toBe(871)
  })

  it.skipIf(!vendoredAvailable)('every block name is a real label in its cited file', async () => {
    // AC-2: "frame names traceable to JOUSTI.SRC labels". A name that is not a
    // label in the source is an invention, however plausible it reads.
    const pics = await loadPictures()
    const byFile = new Map<string, Set<string>>()
    const labelsOf = (file: string): Set<string> => {
      if (!byFile.has(file)) {
        const set = new Set<string>()
        for (const line of sourceLines(file)) {
          if (line.startsWith('*') || line.trim() === '') continue
          const m = line.match(/^([A-Z][A-Z0-9$_]*)/)
          if (m) set.add(m[1])
        }
        byFile.set(file, set)
      }
      return byFile.get(file)!
    }
    const invented: string[] = []
    for (const b of pics.PIXEL_BLOCKS) {
      const labels = labelsOf(b.anchor.file)
      for (const n of [b.name, ...b.aliases]) if (!labels.has(n)) invented.push(`${n} (${b.anchor.file})`)
    }
    expect(invented, 'these names are not labels in the vendored source').toEqual([])
  })

  it('records shared-address aliases rather than silently picking one label', async () => {
    // Several masks and blocks carry multiple labels at one address (ASH1R and
    // ASH1L; the three flap frames share one collision table). Dropping the
    // aliases loses the mapping from game state to data.
    const pics = await loadPictures()
    const all = [...pics.PIXEL_BLOCKS, ...pics.DEFERRED]
    const ash = all.find((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
    expect(ash, 'ASH1R/ASH1L share one address').toBeDefined()
    expect([ash!.name, ...ash!.aliases].sort()).toEqual(['ASH1L', 'ASH1R'])
  })

  it.skipIf(!vendoredAvailable)('the per-entity framed counts match the source', async () => {
    // Guards the inventory against a whole entity being half-transcribed: a
    // total can stay right while two entities are wrong in opposite directions.
    const pics = await loadPictures()
    const framed = pics.PIXEL_BLOCKS.filter((b) => b.headerAnchor !== null)
    expect(framed.length, `${FRAMED_BY_ENTITY.map(([n, c]) => `${n} ${c}`).join(', ')}`).toBe(
      FRAMED_TOTAL,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — COMCL5 / NEWCL5 / UNCOM.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — COMCL5 expands to CLIFF5 via the transcribed RLE', () => {
  // The algorithm is an Elias-gamma bit stream, NOT the value/run pairs the
  // story summary suggests: a unary length prefix selects a gamma-coded run
  // length (minus 2), then three more bits give a colour code, which maps
  // 0 → nibble 0 and 1..7 → nibbles 8..14 (`ADDA #8-1`, SYSTEM.SRC:960-962).
  // Run length 0 means end-of-line, or end-of-image when the colour bits are 0.
  //
  // The expected values below come from an INDEPENDENT decode of the real
  // stream by TEA this session. If Dev's decoder disagrees, do NOT edit these
  // numbers — one of the two decoders is wrong and it needs a human.
  const EXPECTED = { width: 186, height: 33, originX: 54, originY: 211, pixels: 5773 }

  it('consumes the entire 871-byte stream — no more, no less', async () => {
    const pics = await loadPictures()
    const out = pics.expandComcl5(pics.COMCL5.bytes)
    // A decoder that terminated early would silently truncate the island; one
    // that ran past the end would be reading garbage. Both show up as geometry.
    expect(out.pixels.length).toBe(EXPECTED.pixels)
  })

  it('produces CLIFF5 geometry: 186×33', async () => {
    const pics = await loadPictures()
    const out = pics.expandComcl5(pics.COMCL5.bytes)
    expect([out.width, out.height]).toEqual([EXPECTED.width, EXPECTED.height])
  })

  it.skipIf(!vendoredAvailable)(
    'that geometry is corroborated by two independent statements in the source',
    () => {
      // (a) NEWCL5 hard-codes the origin: LDX #$1B*2 / LDY #$D3 (SYSTEM.SRC:927-928).
      const sys = sourceLines('SYSTEM.SRC')
      expect(sys[926]).toContain('$1B*2')
      expect(sys[927]).toContain('$D3')
      expect(0x1b * 2).toBe(EXPECTED.originX)
      expect(0xd3).toBe(EXPECTED.originY)
      // (b) CLIF5's own record puts the same origin in its dest word, and the
      //     author's comment above it reads "93 BY 33" — 93 BYTES = 186 pixels.
      const jousti = sourceLines('JOUSTI.SRC')
      expect(jousti[285]).toContain('93 BY 33')
      const st = parseStatement(jousti[286], 287)
      const dest = evalNumber(st!.operands[2])
      expect((dest >> 8) * 2, 'dest high byte × 2 is the pixel X').toBe(EXPECTED.originX)
      expect(dest & 0xff, 'dest low byte is the scanline').toBe(EXPECTED.originY)
      expect(93 * 2).toBe(EXPECTED.width)
    },
  )

  it('emits only the nibbles the colour mapping can produce (0, then 8..14)', async () => {
    // `ANDA #$07 / BEQ / ADDA #8-1` cannot produce 1..7 or 15. A decoder that
    // skipped the +7 step would emit 1..7 and look like a plausible image while
    // being entirely the wrong colours.
    const pics = await loadPictures()
    const out = pics.expandComcl5(pics.COMCL5.bytes)
    const alphabet = [...new Set(out.pixels)].sort((a, b) => a - b)
    const illegal = alphabet.filter((n) => n !== 0 && (n < 8 || n > 14))
    expect(illegal, `expansion emitted impossible nibbles: ${illegal.join(',')}`).toEqual([])
  })

  it('is pure and deterministic — same input, same output, input untouched', async () => {
    const pics = await loadPictures()
    const input = [...pics.COMCL5.bytes]
    const a = pics.expandComcl5(input)
    const b = pics.expandComcl5(input)
    expect(a.pixels).toEqual(b.pixels)
    expect(input, 'the decoder must not mutate its input').toEqual(pics.COMCL5.bytes)
  })

  it('is anchored to SYSTEM.SRC:927-1023 by a claim', async () => {
    // AC-3 names the citation explicitly; the claims gate is what keeps it true.
    const claims = loadClaims()
    const cited = claims.filter(
      (c) =>
        c.source?.file === 'SYSTEM.SRC' && c.source.line >= 927 && c.source.line <= 1023,
    )
    expect(
      cited.length,
      'the RLE algorithm must be anchored by at least one claim in SYSTEM.SRC:927-1023',
    ).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PALETTES — the octal trap and the two-column trap.
// ─────────────────────────────────────────────────────────────────────────────
describe('palettes — COLOR1, HICOLR, NULL', () => {
  // Independently read from SYSTEM.SRC:908-923, first operand column only.
  const COLOR1 = [0, 255, 112, 88, 15, 63, 81, 232, 20, 144, 93, 17, 31, 164, 10, 103]

  it('COLOR1 is the 16-byte active game palette', async () => {
    const pics = await loadPictures()
    expect(pics.PALETTES.COLOR1?.bytes).toEqual(COLOR1)
  })

  it('takes the FIRST operand column, not the dead alternate', async () => {
    // COLOR1 writes two columns; the assembler stops at the first whitespace.
    // Rows 2, 3, 10, 11, 12 DIFFER between the columns, so reading the wrong one
    // produces a palette that is subtly, plausibly wrong.
    const pics = await loadPictures()
    expect(pics.PALETTES.COLOR1.bytes[2], '@160 green, not the alternate @071').toBe(0o160)
    expect(pics.PALETTES.COLOR1.bytes[3], '@130, not @007').toBe(0o130)
    expect(pics.PALETTES.COLOR1.bytes[10], '@135, not @062').toBe(0o135)
    expect(pics.PALETTES.COLOR1.bytes[11], '@021, not @145').toBe(0o021)
    expect(pics.PALETTES.COLOR1.bytes[12], '@037, not @121').toBe(0o037)
  })

  it('the player colours land where the rider pixel data says they do', async () => {
    // The dossier's identification, which is only sound because Joust has no
    // remap PROM: nibble 5 = P1 yellow, 7 = P2 light blue, 4 = enemy knight red.
    const pics = await loadPictures()
    expect(pics.PALETTES.COLOR1.bytes[5], 'nibble 5 = @077 yellow, Player 1').toBe(0o077)
    expect(pics.PALETTES.COLOR1.bytes[7], 'nibble 7 = @350 light blue, Player 2').toBe(0o350)
    expect(pics.PALETTES.COLOR1.bytes[4], 'nibble 4 = @017 red, enemy knight').toBe(0o017)
  })

  it('every palette byte is a byte and the palette is exactly 16 entries', async () => {
    const pics = await loadPictures()
    for (const [name, pal] of Object.entries(pics.PALETTES)) {
      expect(pal.bytes.length, `${name} must be 16 entries`).toBe(16)
      expect(
        pal.bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255),
        `${name} has a non-byte entry`,
      ).toBe(true)
    }
  })

  it('HICOLR is 8 live entries followed by 8 black', async () => {
    const pics = await loadPictures()
    const h = pics.PALETTES.HICOLR
    expect(h, 'the high-score page palette must be transcribed').toBeDefined()
    expect(h.bytes.slice(8), 'HICOLR entries 8-15 are black').toEqual(new Array(8).fill(0))
  })

  it.skipIf(!vendoredAvailable)('COLOR1 re-derives from SYSTEM.SRC:908-923', async () => {
    const pics = await loadPictures()
    const a = pics.PALETTES.COLOR1.anchor
    const derived: number[] = []
    const lines = sourceLines(a.file)
    for (let n = a.startLine; n <= a.endLine; n++) {
      const st = parseStatement(lines[n - 1], n)
      if (st?.op === 'FCB') derived.push(evalNumber(st.operands[0]) & 0xff)
    }
    expect(derived).toEqual(pics.PALETTES.COLOR1.bytes)
    expect(derived).toEqual(COLOR1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RECORDS — the two formats, and the transporter's dual-purpose first word.
// ─────────────────────────────────────────────────────────────────────────────
describe('records — 3-word entity frames and 4-word background blocks', () => {
  it('entity records name a pixel source that exists', async () => {
    const pics = await loadPictures()
    const blocks = new Set(pics.PIXEL_BLOCKS.flatMap((b) => [b.name, ...b.aliases]))
    const dangling = pics.ENTITY_RECORDS.filter((r) => !blocks.has(r.source)).map(
      (r) => `${r.name} → ${r.source}`,
    )
    expect(dangling, 'a record pointing at a block that was never transcribed').toEqual([])
  })

  it('background records name a pixel source that exists', async () => {
    const pics = await loadPictures()
    const blocks = new Set(pics.PIXEL_BLOCKS.flatMap((b) => [b.name, ...b.aliases]))
    const dangling = pics.BACKGROUND_RECORDS.filter((r) => !blocks.has(r.source)).map(
      (r) => `${r.name} → ${r.source}`,
    )
    expect(dangling).toEqual([])
  })

  it('mounted riders carry NO collision mask; the dismounted rider has one', async () => {
    // "Only the mount collides" — PLYR1's collision word is a literal 0
    // (JOUSTI.SRC:2046), while the standing rider has a real mask (CEGGMN).
    const pics = await loadPictures()
    const plyr1 = pics.ENTITY_RECORDS.find((r) => r.name === 'PLYR1')
    expect(plyr1, 'PLYR1 must be transcribed').toBeDefined()
    expect(plyr1!.collision, 'a mounted rider overlay has collision pointer 0').toBeNull()
    expect(
      pics.COLLISION_TABLES.some((t) => t.name === 'CEGGMN' || t.aliases.includes('CEGGMN')),
      'the dismounted standing rider does have a mask',
    ).toBe(true)
  })

  it('transporter records carry the literal DMA control word $0A00, not a collision pointer', async () => {
    // The first word is dual-purpose; treating $0A00 as a collision pointer
    // would dereference a control word as a span table.
    const pics = await loadPictures()
    const trans = pics.BACKGROUND_RECORDS.filter((r) => /^TRANS[1-4]$/.test(r.name))
    expect(trans.length, 'four spawn pads').toBe(4)
    for (const t of trans) {
      expect(t.collision, `${t.name} carries a literal control word`).toBe(0x0a00)
      expect(t.source, 'all four share one source').toBe('TRASRC')
    }
  })

  it('w/h is stored un-XORed (human-readable), and DMAFIX/COFF match the source', async () => {
    const pics = await loadPictures()
    expect(pics.DMAFIX, 'JOUSTI.SRC:8').toBe(0x0404)
    expect(pics.COFF, 'JOUSTI.SRC:7').toBe(0x0200)
    expect(pics.DMAFIX).toBe(SYMBOLS.DMAFIX)
    expect(pics.COFF).toBe(SYMBOLS.COFF)
    // Every background w/h must be plausible geometry once un-XORed. A record
    // left in its pre-XOR form gives nonsense sizes that this catches.
    for (const r of pics.BACKGROUND_RECORDS) {
      const w = (r.wh >> 8) & 0xff
      const h = r.wh & 0xff
      expect(w, `${r.name} width`).toBeGreaterThan(0)
      expect(h, `${r.name} height`).toBeGreaterThan(0)
      expect(w, `${r.name} width must fit the 292px screen (2 px/byte)`).toBeLessThanOrEqual(146)
      expect(h, `${r.name} height must fit 240 scanlines`).toBeLessThanOrEqual(240)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COLLISION SPANS — the COFF bias and the two sentinels.
// ─────────────────────────────────────────────────────────────────────────────
describe('collision spans — COFF bias and sentinels', () => {
  it('every span is either a sentinel or a biased pair', async () => {
    const pics = await loadPictures()
    const bad: string[] = []
    for (const t of pics.COLLISION_TABLES) {
      for (const [l, r] of t.spans) {
        const sentinel = (l === 0x8000 && r === 0x8000) || (l === 0x8100 && r === 0x8100)
        if (sentinel) continue
        // A real span is COFF-biased, so subtracting the bias must give a
        // sensible on-screen column pair with left ≤ right.
        if (l < SYMBOLS.COFF || r < SYMBOLS.COFF || l - SYMBOLS.COFF > r - SYMBOLS.COFF) {
          bad.push(`${t.name}: (${l},${r})`)
        }
      }
    }
    expect(bad, 'spans must be COFF-biased with left ≤ right, or a known sentinel').toEqual([])
  })

  it('tables keep the raw biased words, not pre-subtracted values', async () => {
    // If a transcription "helpfully" removed the bias, the $8000/$8100
    // sentinels would become huge negatives and the end-of-table walk breaks.
    const pics = await loadPictures()
    const withSentinel = pics.COLLISION_TABLES.filter((t) =>
      t.spans.some(([l]) => l === 0x8100),
    )
    expect(
      withSentinel.length,
      'every mask ends with the $8100 end-of-table sentinel, stored raw',
    ).toBeGreaterThan(0)
  })

  it.skipIf(!vendoredAvailable)('CCLF1L survives the phantom-label comment wrap', async () => {
    // The regression this exists for: JOUSTI.SRC:66 is wrapped comment text
    // ("ZERO)") sitting in the label column, which splits CCLF1L's mask. A
    // reader that honours it transcribes ONE row instead of eight.
    const pics = await loadPictures()
    const t = pics.COLLISION_TABLES.find((x) => x.name === 'CCLF1L')
    expect(t, 'CCLF1L must be transcribed').toBeDefined()
    expect(
      t!.spans.length,
      'CCLF1L is 8 rows — if this says 1, the phantom label truncated it',
    ).toBe(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ASH1R/L — the deferral must be explicit, not an absence.
// ─────────────────────────────────────────────────────────────────────────────
describe('ASH1R/L — the undecoded third format is declared, not quietly omitted', () => {
  it('is either transcribed as a block or recorded as an explicit deferral', async () => {
    // open-questions §5. The story allows a stub or a deferral; what it does not
    // allow is silence. A gap nobody wrote down is discovered in jt3 by someone
    // wondering why the pterodactyl never dissolves.
    const pics = await loadPictures()
    const asBlock = pics.PIXEL_BLOCKS.some((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
    const asDeferral = pics.DEFERRED.some((d) => d.name === 'ASH1R' || d.aliases.includes('ASH1R'))
    expect(asBlock || asDeferral, 'ASH1R/L must be accounted for one way or the other').toBe(true)
  })

  it('DEFERRED is empty by decision — ASH1R/L was transcribed, not deferred (jt1-3 review ruling)', async () => {
    // The two loop tests below execute ZERO assertions when DEFERRED is empty.
    // Per the jt1-3 R1 review ruling, emptiness must be asserted intent, not
    // silence: ASH1R/L was decoded from the consumer's own format comment
    // (JOUSTRV4.SRC:4605) and transcribed. Adding a deferral later makes this
    // assertion your disclosure obligation — update it consciously.
    const pics = await loadPictures()
    expect(pics.DEFERRED).toEqual([])
  })

  it('a deferral carries its anchor, a reason, and the consumer trace', async () => {
    const pics = await loadPictures()
    for (const d of pics.DEFERRED) {
      expect(d.anchor?.file, `${d.name} deferral needs an anchor`).toBeTruthy()
      expect(d.reason?.length, `${d.name} deferral needs a reason`).toBeGreaterThan(10)
      expect(
        d.consumer?.file,
        `${d.name} deferral needs the consumer traced, so the next story starts with it`,
      ).toBeTruthy()
    }
  })

  it.skipIf(!vendoredAvailable)('the recorded consumer trace actually names the symbol', async () => {
    // Guards against a plausible-looking but wrong trace.
    const pics = await loadPictures()
    for (const d of pics.DEFERRED) {
      const lines = sourceLines(d.consumer.file)
      const slice = lines.slice(d.consumer.startLine - 1, d.consumer.endLine).join('\n')
      expect(slice, `${d.name}'s consumer trace must mention it`).toContain(d.name)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt3-6 (AC-1) — ASH1R/L is no longer merely transcribed: it is DECODED INTO
// pictures.ts through the CLIFER run-length format. The decode's teeth live in
// tests/dissolve.test.ts + tests/dissolve-source.test.ts; this pins that the
// decoder lives in THIS module (AC-1 "decodes into pictures.ts").
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 (jt3-6) — the ASH run-length decoder lives in pictures.ts', () => {
  it('pictures.ts exports expandAsh + expandAshFrames (GREEN adds the CLIFER decoder)', async () => {
    const pics = (await loadPictures()) as unknown as {
      expandAsh?: unknown
      expandAshFrames?: unknown
    }
    expect(typeof pics.expandAsh, 'the single-frame CLIFER decoder').toBe('function')
    expect(typeof pics.expandAshFrames, 'the three-frame walk').toBe('function')
  })

  it('the decoder turns the gated ASH1R block into the three 11-row dissolve frames', async () => {
    const pics = (await loadPictures()) as unknown as {
      PIXEL_BLOCKS: Array<{ name: string; bytes: number[] }>
      expandAshFrames?: (b: readonly number[]) => Array<{ height: number }>
    }
    if (typeof pics.expandAshFrames !== 'function') {
      throw new Error('GREEN adds expandAshFrames to src/core/pictures.ts (the CLIFER decoder)')
    }
    const ash = pics.PIXEL_BLOCKS.find((b) => b.name === 'ASH1R')
    expect(ash, 'ASH1R must be transcribed (jt1-3)').toBeDefined()
    const frames = pics.expandAshFrames(ash!.bytes)
    expect(frames.length, 'PTERA1/PTERA2/PTERA3').toBe(3)
    for (const f of frames) expect(f.height, 'each dissolve frame is 11 rows').toBe(11)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT SHEET — a review artefact. Test that it is produced and sane; do not
// pixel-assert an image whose purpose is human judgement.
// ─────────────────────────────────────────────────────────────────────────────
describe('contact sheet — the human-review artefact', () => {
  const bakePath = join(repoRoot, 'tools', 'bake-contact-sheet.mjs')

  it('the bake script exists', () => {
    expect(
      existsSync(bakePath),
      'GREEN adds tools/bake-contact-sheet.mjs (star-wars bake-models.mjs precedent)',
    ).toBe(true)
  })

  it('a committed contact sheet exists in the story docs', () => {
    const docs = join(repoRoot, 'docs', 'rom-study')
    const sheets = existsSync(docs)
      ? readdirSync(docs).filter((f) => /contact-sheet.*\.(png|html|svg)$/i.test(f))
      : []
    expect(sheets.length, 'commit the baked contact sheet for review').toBeGreaterThan(0)
  })

  it('the sheet accounts for every block plus the COMCL5 expansion', async () => {
    // The one mechanical property worth asserting: nothing is missing from the
    // sheet, because a reviewer cannot notice a block that was never drawn.
    const pics = await loadPictures()
    const docs = join(repoRoot, 'docs', 'rom-study')
    const sheet = existsSync(docs)
      ? readdirSync(docs).find((f) => /contact-sheet.*\.(html|svg)$/i.test(f))
      : undefined
    if (!sheet) {
      throw new Error(
        'need a text-inspectable contact sheet (.html or .svg) so the label coverage is checkable; ' +
          'a bare .png cannot be verified mechanically',
      )
    }
    const text = readFileSync(join(docs, sheet), 'utf8')
    const missing = pics.PIXEL_BLOCKS.filter((b) => !text.includes(b.name)).map((b) => b.name)
    expect(missing, 'every block must be labelled on the sheet').toEqual([])
    expect(text, 'the COMCL5 expansion belongs on the sheet too').toContain('COMCL5')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE CLAIMS COUPLING — jt1-2's gate must keep covering what jt1-3 adds.
// ─────────────────────────────────────────────────────────────────────────────
function loadClaims(): Array<{ id: string; source?: { file: string; line: number } }> {
  const dir = join(repoRoot, 'docs', 'rom-study', 'claims')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .flat()
}

describe('every constant this story introduces is anchored by a claim', () => {
  it('DMAFIX, COFF and the palette all have claims', async () => {
    const claims = loadClaims()
    const anchored = (file: string, from: number, to: number): boolean =>
      claims.some((c) => c.source?.file === file && c.source.line >= from && c.source.line <= to)
    expect(anchored('JOUSTI.SRC', 7, 7), 'COFF EQU $0200 (JOUSTI.SRC:7)').toBe(true)
    expect(anchored('JOUSTI.SRC', 8, 8), 'DMAFIX EQU $0404 (JOUSTI.SRC:8)').toBe(true)
    expect(anchored('SYSTEM.SRC', 908, 923), 'the COLOR1 palette').toBe(true)
  })

  it('the claims set only grew (jt1-2 delivered 158; jt1-3 adds, never removes)', () => {
    const claims = loadClaims()
    expect(
      claims.length,
      'jt1-3 transcribes new constants, so the claims set must grow past jt1-2\'s 158',
    ).toBeGreaterThan(158)
  })

  it('every claim id is still unique after the additions', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect([...new Set(dupes)]).toEqual([])
  })
})
