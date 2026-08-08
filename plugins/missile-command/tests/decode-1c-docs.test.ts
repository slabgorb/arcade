// plugins/missile-command/tests/decode-1c-docs.test.ts
//
// Story mc2-5 — RED phase (Han Solo / TEA). The decode-contract for open question
// O-1: what IS reference/source/A35820.1C.bin, and what is its role in the REV-01
// CPU link? This is the last unidentified object in the module inventory, so until
// it is decoded the inventory cannot be called "provably complete".
//
// RED today because the decode has not been RECORDED yet:
//   1. docs/rom-study/brief.md   — still frames O-1 as OPEN ("undecoded binary
//                                   object … Decode / identify before claiming the
//                                   module inventory complete"), and never names
//                                   what .1C actually is.                (TRACKED → CI RED)
//   2. reference/PROVENANCE.md    — the A35820.1C row still reads "Binary object —
//                                   **not yet decoded** (open Q)".        (gitignored → local RED)
// GREEN is Dev (Yoda) recording the decode + method in brief.md and PROVENANCE.md
// and flipping O-1 to resolved.
//
// ─── THE FINDING THIS TEST BAKES IN (MEASURED from the file, not assumed) ─────
// A35820.1C.bin is NOT a raw ROM image — it is ASCII assembler SOURCE, CRLF-lined
// and null-padded to 0x2400, that was mis-vendored as a `.bin` because its CR/LF +
// padding were never LF-normalized like its .MAC siblings. It self-identifies:
//
//   offset 0x0001  `.TITLE W3SOUN-(WAS T2SOUN)`     ← the module is W3SOUN
//   offset 0x002e  `.INCLUDE COND65`                ← its include fingerprint
//                  `*POKEY SOUND SYSTEM CONTROL`    ← its role: sound
//                  … AUDCTL / AUDF1 … `.END`
//
// So .1C decodes to **W3SOUN** — the WW3 (Missile Command) POKEY sound-system
// control module, REV-01 **ROM2** (part **035822-01**, load **$6000** per
// MISSIL.DOC.txt:21). Two independent lines of evidence pin it:
//   (a) the file's own `.TITLE W3SOUN` + POKEY content, and
//   (b) its include fingerprint EXACTLY matching the MISSIL.DOC ledger for .1C —
//       COND65's include list names .1A,.1C,.1D,.1E (so .1C DOES `.INCLUDE COND65`,
//       and the file does), while W3COMN's list names only .1A,.1D,.1E (so .1C does
//       NOT include W3COMN, and the file does not). That fingerprint could only be
//       the .1C slot.
// With .1C = W3SOUN, all five link objects resolve — .1A=W3DSUP, .1B=W3COIN,
// .1C=W3SOUN, .1D=W3MAIN, .1E=W3INT — and the inventory is provably complete.
//
// ─── WHY THE COMMITTED RED RIDES brief.md, NOT PROVENANCE.md ──────────────────
// `plugins/missile-command/.gitignore:9` ignores the whole `reference/` tree
// ("Reference material quarried locally … NEVER committed or pushed (copyright
// wall). The durable, cited extraction lives in docs/rom-study/."). So PROVENANCE.md
// AND the vendored source are absent on a fresh CI checkout. The always-on blocks
// below therefore assert on brief.md (TRACKED) so the RED signal survives on CI; the
// PROVENANCE + source re-derivation blocks are `skipIf(!referenceAvailable)` (the
// jt1-3 degradation pattern the sibling *-docs tests use) and provide the local
// teeth. AC-note: the AC names reference/PROVENANCE.md as an update target, but its
// update produces no committed artifact — the committed record of the decode is in
// brief.md. (Logged as a Delivery Finding.)

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const briefPath = join(root, 'docs', 'rom-study', 'brief.md')

const referenceDir = join(root, 'reference')
const provenancePath = join(referenceDir, 'PROVENANCE.md')
const sourceDir = join(referenceDir, 'source')
const binPath = join(sourceDir, 'A35820.1C.bin')
const docLedgerPath = join(sourceDir, 'MISSIL.DOC.txt')
// The gitignored reference tree is present locally, absent on CI. When absent, the
// PROVENANCE + source blocks SKIP and the brief.md blocks carry the RED alone.
const referenceAvailable =
  existsSync(provenancePath) && existsSync(binPath) && existsSync(docLedgerPath)

// ─── The measured decode (baked in; re-derived from source in the last block) ──
const DECODE = {
  object: 'A35820.1C',
  module: 'W3SOUN',
  part: '035822-01', // MISSIL.DOC.txt:21
  rom: 'ROM2', //        MISSIL.DOC.txt:21
  load: '6000', //       MISSIL.DOC.txt:21 (hex)
  roleRe: /\b(sound|POKEY)\b/i,
}
/** The REV-01 CPU link set, from MISSIL.DOC.txt:57 `***A35820.1A,.1B,.1C,.1D,.1E`. */
const LINK_OBJECTS = ['1A', '1B', '1C', '1D', '1E'] as const

/** Read a doc, or throw a message that names the file. */
const readDoc = (path: string, label: string): string => {
  if (!existsSync(path)) throw new Error(`${label} does not exist`)
  return readFileSync(path, 'utf8')
}

// Phrases that assert O-1 is STILL open. Deliberately specific so it does not fire on
// the "## Open questions" heading or a bare "resolved": it targets the framings this
// story retires ("undecoded", "not yet decoded", "open question O-1", "unresolved").
const STILL_OPEN =
  /\b(undecoded|not\s+yet\s+decoded|not\s+decoded|to\s+be\s+decoded|yet\s+to\s+decode|open\s+question\s+O-1|unresolved|not\s+(?:yet\s+|fully\s+)?resolved)\b/i
const o1LinesOf = (doc: string): string[] => doc.split('\n').filter((l) => /\bO-1\b/.test(l))

// ═════════════════════════════════════════════════════════════════════════════
// AC (committed, CI-visible) — brief.md marks O-1 resolved and RECORDS the answer.
//   brief.md is the only committed home for the decode (reference/ is gitignored),
//   so it must both retire the open framing AND name what .1C is. mc2-3/mc2-4
//   pattern: a positive `resolved` marker a negated "not resolved" does not satisfy,
//   the retirement of the exact stale imperative, and the recorded answer.
// ═════════════════════════════════════════════════════════════════════════════
describe('brief.md marks O-1 resolved and records the decode (AC)', () => {
  it('the brief still references O-1', () => {
    expect(o1LinesOf(readDoc(briefPath, 'brief.md')).length, 'brief.md must still reference O-1').toBeGreaterThan(0)
  })

  it('positively marks O-1 resolved — and a NEGATED "not resolved"/"undecoded" does NOT satisfy the guard', () => {
    const lines = o1LinesOf(readDoc(briefPath, 'brief.md'))
    // Teeth: the marker must be a resolved statement that is NOT negated. "O-1 not
    // resolved" / "undecoded" carry `resolved`/`decoded` substrings but assert the
    // opposite, so STILL_OPEN excludes them — reddening a fake flip.
    expect(
      lines.some((l) => /\bresolved\b/i.test(l) && !STILL_OPEN.test(l)),
      'an O-1 mention must positively state it is resolved (a "not resolved"/"undecoded" line does not count)',
    ).toBe(true)
  })

  it('no O-1 mention still frames it as open / undecoded / not-yet-decoded', () => {
    const openish = o1LinesOf(readDoc(briefPath, 'brief.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, `every O-1 mention must be updated to the resolved framing: ${openish.join(' | ')}`).toEqual([])
  })

  it('records the answer: names the W3SOUN module and its sound role in the O-1 region', () => {
    // A resolution that dropped the identity would not have closed O-1 ("identify
    // what data/ROM it is"). Search the O-1 bullet region (its line + continuations).
    const all = readDoc(briefPath, 'brief.md').split('\n')
    const idx = all.findIndex((l) => /\bO-1\b/.test(l) && /A35820\.1C/.test(l))
    expect(idx, 'brief.md must carry the O-1 A35820.1C bullet').toBeGreaterThanOrEqual(0)
    const region = all.slice(idx, idx + 4).join(' ')
    expect(new RegExp(`\\b${DECODE.module}\\b`).test(region), 'the resolved O-1 must name the module W3SOUN').toBe(true)
    expect(DECODE.roleRe.test(region), 'the resolved O-1 must record its sound/POKEY role').toBe(true)
  })

  it('names W3SOUN somewhere in the committed brief (the decode has a committed home, not only gitignored PROVENANCE.md)', () => {
    expect(
      new RegExp(`\\b${DECODE.module}\\b`).test(readDoc(briefPath, 'brief.md')),
      'brief.md must name W3SOUN — reference/PROVENANCE.md is gitignored, so brief.md is the only committed record of the decode',
    ).toBe(true)
  })

  it('records the decode METHOD (assembler source / .TITLE self-id — not a raw ROM image)', () => {
    const doc = readDoc(briefPath, 'brief.md')
    expect(
      /assembler source|ASCII|\.TITLE|LF[- ]?normaliz|null[- ]?padded|mis-?vendored/i.test(doc),
      'the AC requires the decode METHOD recorded — brief.md must say how .1C was identified ' +
        '(ASCII assembler source, identified by its .TITLE / include fingerprint, not a raw ROM image)',
    ).toBe(true)
  })

  it('retires the stale "before claiming the module inventory complete" open imperative', () => {
    expect(
      /before claiming the module inventory complete/i.test(readDoc(briefPath, 'brief.md')),
      'the O-1-is-open imperative must be retired now that .1C is decoded',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC (local teeth) — reference/PROVENANCE.md identifies A35820.1C and the whole
//   REV-01 link inventory is provably complete. Gitignored, so skipIf on CI.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!referenceAvailable)('PROVENANCE.md identifies A35820.1C and completes the inventory (AC)', () => {
  const provRowFor = (obj: string): string =>
    readDoc(provenancePath, 'PROVENANCE.md')
      .split('\n')
      .find((l) => l.includes(obj) && l.trimStart().startsWith('|')) ?? ''

  it('the A35820.1C row no longer says "not yet decoded" / "open Q"', () => {
    const row = provRowFor(DECODE.object)
    expect(row, 'PROVENANCE.md must carry an A35820.1C table row').not.toBe('')
    expect(
      /not\s+yet\s+decoded|open\s+q/i.test(row),
      `the A35820.1C row still marks it undecoded: ${row.trim()}`,
    ).toBe(false)
  })

  it('the A35820.1C row identifies it as the W3SOUN sound module', () => {
    const row = provRowFor(DECODE.object)
    expect(new RegExp(`\\b${DECODE.module}\\b`).test(row), `the A35820.1C row must name W3SOUN: ${row.trim()}`).toBe(true)
    expect(DECODE.roleRe.test(row), `the A35820.1C row must record its sound/POKEY role: ${row.trim()}`).toBe(true)
  })

  it('PROVENANCE.md records the ledger identity of .1C (ROM2 / 035822-01)', () => {
    // MISSIL.DOC.txt:21 places .1C as ROM2 / 035822-01 / $6000. A real decode records
    // that, not just a bare module name — so the doc ties to the Atari part ledger.
    const doc = readDoc(provenancePath, 'PROVENANCE.md')
    expect(
      doc.includes(DECODE.part) || new RegExp(`\\b${DECODE.rom}\\b`).test(doc),
      `PROVENANCE.md must record .1C's ledger identity (${DECODE.rom} / ${DECODE.part})`,
    ).toBe(true)
  })

  it('no object in the REV-01 link set is left undecoded — inventory provably complete', () => {
    const doc = readDoc(provenancePath, 'PROVENANCE.md')
    const undecoded = LINK_OBJECTS.filter((suffix) => {
      const row = doc.split('\n').find((l) => l.includes(`A35820.${suffix}`) && l.trimStart().startsWith('|')) ?? ''
      return row === '' || /not\s+yet\s+decoded|open\s+q/i.test(row)
    })
    expect(
      undecoded,
      `every REV-01 link object (A35820.1A–.1E) must have a decoded PROVENANCE row; still open: ${undecoded
        .map((s) => `A35820.${s}`)
        .join(', ')}`,
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC (local teeth) — the decode is RE-DERIVABLE from the vendored source, so the
//   baked-in answer above is a source-checked fact, not TEA's assertion. This block
//   passes on arrival (it guards ground truth) — its job is to make W3SOUN/.1C
//   un-fakeable: PROVENANCE.md/brief.md cannot claim a different identity than the
//   file and the MISSIL.DOC ledger jointly prove. Gitignored, so skipIf on CI.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!referenceAvailable)('the A35820.1C decode is re-derivable from the vendored source (AC)', () => {
  const bin = (): string => readFileSync(binPath, 'utf8')
  const ledger = (): string => readFileSync(docLedgerPath, 'utf8')

  it('A35820.1C.bin is ASCII assembler source that self-identifies as W3SOUN (not a raw ROM image)', () => {
    const text = bin()
    expect(text.includes('.TITLE W3SOUN'), 'the .bin must open with `.TITLE W3SOUN` — it is assembler source').toBe(true)
    expect(/\.END\b/.test(text), 'assembler source is terminated by `.END`').toBe(true)
  })

  it('its POKEY sound content confirms the sound role', () => {
    const text = bin()
    expect(/POKEY SOUND SYSTEM CONTROL/.test(text), 'the .bin must carry the POKEY sound header').toBe(true)
    expect(/\bAUDCTL\b/.test(text), 'the .bin must reference POKEY audio registers (AUDCTL)').toBe(true)
  })

  it('its include fingerprint matches the MISSIL.DOC ledger position for .1C (COND65 yes, W3COMN no)', () => {
    const text = bin()
    const doc = ledger()
    // The file's own includes:
    expect(/\.?INCLUDE COND65/.test(text), '.1C must `.INCLUDE COND65`').toBe(true)
    expect(text.includes('W3COMN'), '.1C must NOT include W3COMN').toBe(false)
    // The ledger's per-object include lists — the fingerprint that pins the SLOT:
    const cond65List = doc.split('\n').find((l) => /INCLUDE COND65\.MAC/.test(l)) ?? ''
    const w3comnList = doc.split('\n').find((l) => /INCLUDE W3COMN\.MAC/.test(l)) ?? ''
    expect(/\.1C\b/.test(cond65List), `MISSIL.DOC COND65 list must include .1C: ${cond65List.trim()}`).toBe(true)
    expect(/\.1C\b/.test(w3comnList), `MISSIL.DOC W3COMN list must EXCLUDE .1C: ${w3comnList.trim()}`).toBe(false)
  })

  it('the MISSIL.DOC ledger places A35820.1C as ROM2 / 035822-01 / $6000', () => {
    const row = readFileSync(docLedgerPath, 'utf8')
      .split('\n')
      .find((l) => l.includes('A35820.1C')) ?? ''
    expect(row, 'MISSIL.DOC must carry an A35820.1C ledger row').not.toBe('')
    for (const tok of [DECODE.part, DECODE.rom, DECODE.load]) {
      expect(row.includes(tok), `the ledger row must record ${tok}: ${row.trim()}`).toBe(true)
    }
  })

  it('the REV-01 link set names exactly .1A–.1E and includes .1C', () => {
    const doc = ledger()
    expect(doc.includes('***A35820.1A,.1B,.1C,.1D,.1E'), 'MISSIL.DOC must carry the REV-01 link set line').toBe(true)
    for (const suffix of LINK_OBJECTS) {
      expect(doc.includes(`.${suffix}`), `link set must name .${suffix}`).toBe(true)
    }
  })
})
