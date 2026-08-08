// plugins/missile-command/tests/starting-cities-docs.test.ts
//
// Story mc2-4 — RED phase (Han Solo / TEA). The doc-contract + const-contract +
// claim-contract for open question O-4: the ACTUAL starting-city count. This is
// how many cities you begin a game defending, and the count "all cities gone"
// counts down from — so mc3's damage/end-game logic is expressed against it, and
// it must be pinned to source before the damage loop.
//
// RED today because NOTHING is built yet:
//   1. docs/rom-study/starting-cities.md — the derivation note (absent)
//   2. a starting-count claim in docs/rom-study/claims/*.json pinning STCITY (absent)
//   3. a consumable starting-count constant in src/core/field.ts (absent — field.ts
//      today exports only NCITY=6, the MAX, cited to W3COMN:39)
//   4. docs/rom-study/brief.md still frames O-4 as OPEN ("pin the *actual*
//      starting-city count and where the option is read")
//   5. docs/rom-study/glossary.md still says "O-4 open" / "still open" / "unpinned"
// GREEN is Dev (Yoda) writing the note + the claim + the field.ts constant and
// flipping O-4 to resolved in brief.md and glossary.md.
//
// ─── THE FINDING THIS TEST BAKES IN (measured from source, not assumed) ───────
// O-4 resolves to SIX. In NEW GAME SETUP the starting count is a TABLE LOOKUP
// indexed by the option-2 DIP field, NOT a bare use of NCITY:
//
//   W3MAIN.MAC:3869  LDA OPTIO2          ; the option-2 DIP byte
//   W3MAIN.MAC:3871  AND I,SCITYM        ; SCITYM=03 → isolate the low 2 bits → Y
//   W3MAIN.MAC:3873  TAY
//   W3MAIN.MAC:3877  LDA AY,STCITY       ; # OF CITIES = STCITY[Y]
//   W3MAIN.MAC:3895  STCITY:  .BYTE 6,4,5,7
//   W3MAIN.MAC:3897  STCIMA:  .BYTE 0FC,0E8,0F8,0FC   ; matching alive-city bitmasks
//
// So the option field selects among STCITY = { 0:6, 1:4, 2:5, 3:7 }. With the
// option-2 bits CLEAR (Y=0) — the REV-01 / MAME-dip default — you start with
// STCITY[0] = **6** cities (agreeing with NCITY=6 the MAX and MAME's 6-city dip
// default). SCITYM's ";5 CITIES AT START" comment names the Y=2 OPTION
// (STCITY[2]=5), NOT the default: it is one selectable setting, not the count you
// get out of the box. That is the exact trap O-4 poses — "NCITY=6 (max) vs SCITYM
// '5 cities' vs MAME '6 cities'" — and the resolution is that the default is 6 and
// SCITYM merely picks a different entry of the STCITY table.
//
// The other `AND I,SCITYM` (W3INT.MAC:1291) sits under `.SBTTL DISPLAY OPTIONS`
// (the self-test options screen) and only READS STCITY to DISPLAY the setting — it
// is not a gameplay start path, so NEW GAME SETUP is the one authoritative site.
//
// ─── CITATION CONVENTION (mc2-1 / mc2-2 / mc2-3) ──────────────────────────────
// Anchors are cited by PHYSICAL line (the index readFileSync(..,'utf8').split('\n')
// yields, which `grep -an` matches). W3MAIN is DOUBLE-SPACED, so brief.md's older
// logical ordinals (:281 SETUP STATE, :1916 NEW GAME SETUP) land in the blank gaps;
// the physical `.SBTTL` lines are 561 / 3831. The byte-gated block below re-reads
// the vendored source and forces every cited anchor onto a NON-BLANK physical line,
// so a note that copies a logical ordinal reddens.
//
// ─── SOURCE HAZARD (mc1/mc2-1 measured) ──────────────────────────────────────
// The vendored `.MAC` carry stray non-UTF8/CR bytes: a plain `grep` false-empties
// (use `grep -a`); readFileSync(.., 'utf8') reads them fine. The tree is gitignored,
// so every byte-gated block SKIPS on CI (the jt1-3 degradation pattern) and the
// always-on file/claim/const contracts carry the RED signal there.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const romStudy = join(root, 'docs', 'rom-study')
const notePath = join(romStudy, 'starting-cities.md')
const briefPath = join(romStudy, 'brief.md')
const glossaryPath = join(romStudy, 'glossary.md')

const sourceDir = join(root, 'reference', 'source')
const W3MAIN = join(sourceDir, 'W3MAIN.MAC')
const W3COMN = join(sourceDir, 'W3COMN.MAC')
const sourceAvailable = existsSync(W3MAIN) && existsSync(W3COMN)

/** The measured REV-01 default starting-city count — STCITY[0], OPTIO2 bits clear. */
const DEFAULT_START_CITIES = 6
/** The STCITY option table, in selection order (Y = OPTIO2 & SCITYM). */
const STCITY_TABLE = [6, 4, 5, 7] as const
/** The physical W3MAIN line of the STCITY table (grep -an == split('\n') index). */
const STCITY_LINE = 3895

/** Read a rom-study doc, or throw a message that names the file Dev must create. */
const readDoc = (path: string, label: string): string => {
  if (!existsSync(path)) {
    throw new Error(`docs/rom-study/${label} does not exist yet — mc2-4 GREEN (Yoda) writes it`)
  }
  return readFileSync(path, 'utf8')
}

// ── the claims loader, dynamic-imported so `tsc --noEmit` / collection stay green
// even while a fresh checkout has not built it (the citations.test.ts idiom). ──
interface Claim {
  id: string
  symbol: string
  value: number | string
  meaning: string
  source: { file: string; line: number; verbatim: string }
}
interface ClaimsModule {
  loadClaims(): Claim[]
  claimCovers(claims: readonly Claim[], file: string, start: number, end: number): boolean
}
const CLAIMS_SPECIFIER = './helpers/claims.js'
async function loadClaimsModule(): Promise<ClaimsModule> {
  const mod = (await import(/* @vite-ignore */ CLAIMS_SPECIFIER)) as Partial<ClaimsModule>
  if (typeof mod.loadClaims !== 'function' || typeof mod.claimCovers !== 'function') {
    throw new Error('citation apparatus missing loadClaims/claimCovers — mc2-1 built this')
  }
  return mod as ClaimsModule
}

// ── src/core/field.ts, dynamic-imported (the field.test.ts idiom). It exists
// today (NCITY/NMISBA/CITIES/BASES), so this resolves — but the STARTING-count
// export mc2-4 asks for does not, so the AC2 block below reddens on its absence. ──
const FIELD_SPECIFIER = '../src/core/field.js'
async function loadField(): Promise<Record<string, unknown>> {
  try {
    return (await import(/* @vite-ignore */ FIELD_SPECIFIER)) as Record<string, unknown>
  } catch (e) {
    throw new Error(`src/core/field.ts failed to import: ${(e as Error).message}`)
  }
}
const fieldSrc = (): string => readFileSync(join(root, 'src', 'core', 'field.ts'), 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the note exists and pins the DEFAULT starting count as 6, keeping it
//   distinct from NCITY the MAX. A note that only said "6 cities" would pass on
//   the coincidence that default == max; requiring both symbols + the "starting"
//   framing forces the note to actually resolve the max-vs-start ambiguity O-4 is.
// ─────────────────────────────────────────────────────────────────────────────
describe('starting-cities.md pins the REV-01 default starting count (AC1)', () => {
  it('the file exists', () => {
    expect(existsSync(notePath), 'Dev writes docs/rom-study/starting-cities.md').toBe(true)
  })

  it('states the default starting count is 6 (not merely the NCITY max)', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    expect(doc.includes(String(DEFAULT_START_CITIES)), 'must record the count 6').toBe(true)
    expect(
      /start(ing)?/i.test(doc) && /default/i.test(doc),
      'must frame 6 as the DEFAULT STARTING count, not just a maximum',
    ).toBe(true)
  })

  it('names both symbols O-4 weighs — SCITYM and NCITY', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    expect(/\bSCITYM\b/.test(doc), 'must name SCITYM (the option-2 mask)').toBe(true)
    expect(/\bNCITY\b/.test(doc), 'must name NCITY (the max) and distinguish it from the start count').toBe(true)
  })

  it('distinguishes NCITY as the MAX from the starting default', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    // The crux of O-4: NCITY=6 is the maximum, the START count is a separate lookup.
    expect(/\bmax(imum)?\b/i.test(doc), 'must call NCITY the maximum, so start-vs-max is explicit').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the note documents WHERE the option is read and the option-2 "5 cities"
//   path. The STCITY option table {6,4,5,7} is the tooth: a note that recorded
//   only the default 6 would not have documented "where the option is read", which
//   the AC explicitly requires. The "5 cities" must be shown as the OPTION-2
//   selection (STCITY[2]=5), not as the default.
// ─────────────────────────────────────────────────────────────────────────────
describe('starting-cities.md documents where the option is read (AC1)', () => {
  it('names the NEW GAME SETUP consumption site (and the SETUP STATE that reaches it)', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    expect(/NEW GAME SETUP/i.test(doc), 'must name NEW GAME SETUP — where STCITY is read').toBe(true)
    expect(/SETUP STATE/i.test(doc), 'must name the SETUP STATE that dispatches into it').toBe(true)
  })

  it('names the STCITY table and OPTIO2 (the actual mechanism)', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    expect(/\bSTCITY\b/.test(doc), 'must name the STCITY table the count is read from').toBe(true)
    expect(/\bOPTIO2\b/.test(doc), 'must name OPTIO2 — the DIP field SCITYM masks').toBe(true)
  })

  it('records the full STCITY option table 6,4,5,7 (the option outcomes in order)', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    // Distinctive, order-bearing: proves the note captured the whole option lookup,
    // not just the default. Tolerant of surrounding spaces / decorations.
    const inOrder = STCITY_TABLE.join('\\s*,\\s*')
    expect(
      new RegExp(inOrder).test(doc),
      'must record the STCITY option table as 6,4,5,7 (default / opt1 / opt2 / opt3)',
    ).toBe(true)
  })

  it('documents the option-2 "5 cities" path as an OPTION, not the default', () => {
    const doc = readDoc(notePath, 'starting-cities.md')
    expect(/5 cities/i.test(doc), 'must document the "5 cities at start" SCITYM path').toBe(true)
    expect(/option/i.test(doc), 'and frame "5 cities" as a selectable option (SCITYM), not the default').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — every W3MAIN/W3COMN anchor the note cites is REAL, at the PHYSICAL line,
//   and a load-bearing W3MAIN anchor lands on the STCITY lookup. Byte-gated: this
//   is the guard with teeth — it also independently re-derives STCITY[0]==6 from
//   the vendored source, so the whole story rests on a source-checked fact.
// ─────────────────────────────────────────────────────────────────────────────
const ANCHOR_RE = /\b(W3MAIN|W3COMN)(?:\.MAC)?:(\d+)/gi

describe.skipIf(!sourceAvailable)('starting-cities.md source anchors cross-check against the vendored source (AC1)', () => {
  const lines = (module: string): string[] =>
    readFileSync(join(sourceDir, `${module}.MAC`), 'utf8').split('\n')
  const physLineOf = (module: string, line: number): string => lines(module)[line - 1] ?? ''

  const anchors = (): Array<{ module: string; line: number; raw: string }> => {
    const doc = readDoc(notePath, 'starting-cities.md')
    return [...doc.matchAll(ANCHOR_RE)].map((m) => ({
      module: m[1].toUpperCase(),
      line: Number(m[2]),
      raw: m[0],
    }))
  }
  const citedLines = (module: string): string[] =>
    anchors().filter((a) => a.module === module).map((a) => physLineOf(module, a.line))

  it('cites at least one W3MAIN anchor and at least one W3COMN anchor', () => {
    // The floor (check #15): a note that cited zero source lines could pass every
    // prose test above on vocabulary alone — this stops that.
    const byModule = (m: string) => anchors().filter((a) => a.module === m).length
    expect(byModule('W3MAIN'), 'must cite W3MAIN — where STCITY is read at NEW GAME SETUP').toBeGreaterThanOrEqual(1)
    expect(byModule('W3COMN'), 'must cite W3COMN — where SCITYM / NCITY are defined').toBeGreaterThanOrEqual(1)
  })

  it('every cited anchor lands on a NON-BLANK source line (not a double-space logical ordinal)', () => {
    const blank = anchors().filter((a) => physLineOf(a.module, a.line).trim() === '')
    expect(
      blank,
      `these anchors land on BLANK lines — W3MAIN is double-spaced, so brief.md's ` +
        `logical ordinals (:281, :1916) fall in the gaps. Cite the PHYSICAL line: ${blank
          .map((a) => a.raw)
          .join(', ')}`,
    ).toEqual([])
  })

  it('cites the physical STCITY lookup — the `AND I,SCITYM`, the `LDA AY,STCITY`, or the STCITY table itself', () => {
    expect(
      citedLines('W3MAIN').some((l) => /AND\s+I,SCITYM|AY,STCITY|^STCITY:/.test(l)),
      'a cited W3MAIN line must land on the NEW GAME SETUP STCITY lookup (W3MAIN:3871 / :3877 / :3895)',
    ).toBe(true)
  })

  it('cites a real W3COMN definition of SCITYM (:195) or NCITY (:39)', () => {
    expect(
      citedLines('W3COMN').some((l) => /^SCITYM\b|^NCITY\b/.test(l)),
      'a cited W3COMN line must land on the SCITYM or NCITY EQU',
    ).toBe(true)
  })

  it('independently re-derives STCITY[0] == 6 from the physical source line', () => {
    // Prove the baked-in default is real: read W3MAIN:3895, parse the .BYTE list,
    // assert the FIRST entry (Y=0, option bits clear) is 6, and the whole table is
    // 6,4,5,7. This makes the value a source-checked fact, not TEA's assertion.
    const line = physLineOf('W3MAIN', STCITY_LINE)
    expect(/^STCITY:/.test(line), `W3MAIN:${STCITY_LINE} must be the STCITY table label`).toBe(true)
    const bytes = (line.split('.BYTE')[1] ?? '').split(',').map((b) => Number(b.trim()))
    expect(bytes, 'STCITY table must decode to 6,4,5,7').toEqual([...STCITY_TABLE])
    expect(bytes[0], 'the DEFAULT (Y=0) starting count must be 6').toBe(DEFAULT_START_CITIES)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — field.ts (src/core) exposes the starting count as a CONSUMABLE constant
//   mc3 can import, DISTINCT from NCITY (the max). Read out of the module (a real
//   runtime check, not a text token). A `start`-keyed export must equal 6 and must
//   not simply be the existing NCITY re-export.
// ─────────────────────────────────────────────────────────────────────────────
describe('src/core/field.ts exposes the starting count as a consumable constant (AC2)', () => {
  it('exports a starting-count constant (a `start`-named export) equal to 6', async () => {
    const mod = await loadField()
    const startEntries = Object.entries(mod).filter(
      ([k, v]) => /start/i.test(k) && typeof v === 'number',
    )
    expect(
      startEntries.length,
      'no `start`-named numeric export in field.ts — add e.g. ' +
        '`export const START_CITIES = 6` so mc3 can consume the starting count. ' +
        `Numeric exports: [${Object.entries(mod)
          .filter(([, v]) => typeof v === 'number')
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}]`,
    ).toBeGreaterThanOrEqual(1)
    expect(
      startEntries.some(([, v]) => v === DEFAULT_START_CITIES),
      `the starting-count export must equal ${DEFAULT_START_CITIES}`,
    ).toBe(true)
  })

  it('carries a source citation for the starting count (STCITY / W3MAIN:3895 / the note), not a bare literal', () => {
    const src = fieldSrc()
    expect(
      /STCITY|W3MAIN\.MAC:3895|W3MAIN:3895|starting-cities\.md/.test(src),
      'the starting-count constant must cite STCITY / W3MAIN:3895 / starting-cities.md — ' +
        'a bare 6 is un-sourced and NCITY=6 (W3COMN:39) is the MAX, a different fact',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — the starting count is BACKED BY A COMMITTED CLAIM pinning the STCITY table
//   (the anti-drift tie, mc2-2 pattern). The claim must cover W3MAIN.MAC:3895 and
//   decode to 6, so field.ts cannot silently drift from the source table.
// ─────────────────────────────────────────────────────────────────────────────
describe('the starting count is backed by a committed claim (AC2)', () => {
  it('the committed claims set is non-empty (the guard must have teeth)', async () => {
    const { loadClaims } = await loadClaimsModule()
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it('a committed claim covers the STCITY table line W3MAIN.MAC:3895', async () => {
    const { loadClaims, claimCovers } = await loadClaimsModule()
    expect(
      claimCovers(loadClaims(), 'W3MAIN.MAC', STCITY_LINE, STCITY_LINE),
      `no committed claim pins W3MAIN.MAC:${STCITY_LINE} (STCITY) — mc2-4 requires a backing ` +
        `claim so the starting count cannot drift from the source .BYTE table`,
    ).toBe(true)
  })

  it('that STCITY claim decodes the default starting count to 6', async () => {
    const { loadClaims } = await loadClaimsModule()
    const claim = loadClaims().find(
      (c) => c.source.file.split('/').pop() === 'W3MAIN.MAC' && c.source.line === STCITY_LINE,
    )
    expect(claim, `a claim must cite W3MAIN.MAC:${STCITY_LINE}`).toBeDefined()
    expect(
      (claim as Claim).value,
      'the STCITY claim value must be the default starting count 6 (STCITY[0])',
    ).toBe(DEFAULT_START_CITIES)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — brief.md marks O-4 RESOLVED and retires the open-question framing (the
//   mc2-3 pattern: a positive `resolved` marker that a negated "not resolved" does
//   NOT satisfy, plus a targeted retirement of the exact stale imperative, plus a
//   record of the answer). Scoped to O-4 lines so it leaves O-1/O-3/O-5 alone.
// ─────────────────────────────────────────────────────────────────────────────
// Phrases that assert O-4 is STILL open. Deliberately specific so it does not fire
// on the "## Open questions" heading or a bare "resolved": it targets the framings
// this story retires ("O-4 open", "still open", "unpinned", "not resolved", the
// "pin the actual … count" imperative).
const STILL_OPEN =
  /\b(unresolved|unpinned|still\s+open|is\s+open|O-4\s+open|not\s+(?:yet\s+|fully\s+)?(?:resolved|pinned)|to\s+be\s+pinned)\b/i
const o4LinesOf = (doc: string): string[] => doc.split('\n').filter((l) => /\bO-4\b/.test(l))

describe('brief.md marks O-4 resolved (AC1)', () => {
  it('the brief still references O-4', () => {
    expect(o4LinesOf(readDoc(briefPath, 'brief.md')).length, 'brief.md must still reference O-4').toBeGreaterThan(0)
  })

  it('positively marks O-4 resolved — and a NEGATED "not resolved" does NOT satisfy the guard', () => {
    const lines = o4LinesOf(readDoc(briefPath, 'brief.md'))
    expect(
      lines.some((l) => /\bresolved\b/i.test(l) && !STILL_OPEN.test(l)),
      'an O-4 mention must positively state it is resolved (a "not resolved" line does not count)',
    ).toBe(true)
  })

  it('no O-4 mention still frames it as open / unpinned / unresolved', () => {
    const openish = o4LinesOf(readDoc(briefPath, 'brief.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, 'every O-4 mention must be updated to the resolved framing').toEqual([])
  })

  it('records the resolved answer: default 6, read at NEW GAME SETUP / STCITY', () => {
    // A resolution that dropped the actual number or the site would not have closed
    // O-4 ("pin the actual count AND where the option is read"). Search the O-4
    // bullet region (the O-4 line plus its wrapped continuation lines).
    const all = readDoc(briefPath, 'brief.md').split('\n')
    const idx = all.findIndex((l) => /\bO-4\b/.test(l))
    const region = all.slice(idx, idx + 3).join(' ')
    expect(/\b6\b/.test(region), 'the resolved O-4 must record the default count 6').toBe(true)
    expect(
      /NEW GAME SETUP|STCITY/i.test(region),
      'the resolved O-4 must record where it is read (NEW GAME SETUP / STCITY)',
    ).toBe(true)
  })

  it('retires the stale "pin the actual starting-city count" open imperative', () => {
    const doc = readDoc(briefPath, 'brief.md')
    expect(
      /pin the .{0,3}actual.{0,3} starting.city count/i.test(doc),
      'the O-4-is-open imperative must be retired now that the count is pinned',
    ).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 coherence (the mc2-3 review-#24 pattern) — a resolution applied only in
//   brief.md leaves the SIBLING source-of-record doc describing O-4 as open. After
//   O-4 is resolved, glossary.md must not still frame it as open/unpinned, and must
//   reference the resolution (STCITY / the note / the default 6). glossary.md must
//   still CONTAIN "O-4" (dossier-docs.test.ts asserts that), so this only forbids
//   the OPEN framing, it does not delete the tag. (O-2 lines untouched.)
// ─────────────────────────────────────────────────────────────────────────────
describe('the O-4 resolution is coherent across the rom-study source-of-record (review #24)', () => {
  it('glossary.md still tags O-4 (dossier-docs.test.ts requires the tag to remain)', () => {
    expect(/O-4/.test(readDoc(glossaryPath, 'glossary.md')), 'glossary.md must still reference O-4').toBe(true)
  })

  it('glossary.md no longer frames O-4 as open / unpinned / unresolved', () => {
    const openish = o4LinesOf(readDoc(glossaryPath, 'glossary.md')).filter((l) => STILL_OPEN.test(l))
    expect(
      openish,
      `glossary.md still calls O-4 open/unpinned — O-4 is resolved now: ${openish.join(' | ')}`,
    ).toEqual([])
  })

  it('glossary.md points at the resolution (the STCITY table or the note)', () => {
    // Deliberately NOT satisfied by the pre-existing NCITY row's "hardware default
    // 6" (that is the MAX, cited to W3COMN:39) — the glossary must name the STCITY
    // start-count resolution or link the note, so the tie is to O-4's actual answer.
    const gloss = readDoc(glossaryPath, 'glossary.md')
    expect(
      /\bSTCITY\b/.test(gloss) || /starting-cities\.md/.test(gloss),
      'glossary.md must reference the STCITY resolution or link starting-cities.md',
    ).toBe(true)
  })
})
