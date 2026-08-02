// tests/audio-decision-block-families.test.ts
//
// Story jt5-23 — RED phase (Mr. Praline / TEA).
//
// "What ARE G1DEC/G2DEC? CUE_SOURCES now cites two decision-block families with
// no model of either."
//
// ─── WHAT THE ROM ACTUALLY DOES (the answer this story records) ──────────────
// JOUSTRV4.SRC:1025-1029, mirrored for the second knight at :1041-1045:
//
//     LDX     #G1DEC          ASSUME GAME SIMULATION
//     LDA     GOVER           GAME SIMULATION?
//     BGT     30$              BR=YES        <- keeps G1DEC
//     LDX     #P1DEC                         <- else swaps to P1DEC
// 30$ STX     PDECSN,Y        PLAYER 1'S JOYSTICK
//
// `GOVER > 0` selects the G-block. Corroborated from BOTH sides rather than
// from the ROM's own comment alone, because a comment is one witness:
//   • P1JOY (:7247) opens `LDA WCPIAB` — "SELECT HALF OF MUX", the real
//     hardware joystick. Only a human-driven block reads the panel.
//   • G1JOY/G2JOY (:601-616) sit in the attract region, immediately beside
//     `ATTRCT CLR GOVER  STATE OF GAME = OVER` (:712).
//
// So: G-blocks are the ATTRACT-MODE SELF-PLAYING DEMO; P-blocks are real play.
// That single fact explains BOTH differences the story enumerated at once —
// the joystick source, and why sound slot 8 (SNPTREF, "PLAYER ABORTED FADING
// IN") is a bare `0` in the G-blocks: nobody can abort a demo transporter.
//
// ─── THE NUANCE A NAIVE STATEMENT OF THAT GETS WRONG ─────────────────────────
// The ROM defines exactly TWO G-blocks against SEVEN P-blocks:
//
//     G1DEC :5542   G2DEC :5546                     <- knights, attract
//     P1DEC :5550   P2DEC :5554                     <- knights, real play
//     P3DEC :5558 … P7DEC :5574                     <- buzzards / pterodactyl
//
// The duality is KNIGHTS-ONLY. The `P` prefix on P3DEC-P7DEC therefore does NOT
// mean "real play" — a buzzard has no joystick and no attract variant. A record
// that says "P means real play" is wrong for five of the seven blocks, which is
// why AC2 exists as a separate criterion rather than a clause of AC1.
//
// ─── TWO CORRECTIONS THIS SUITE ENCODES (measured at setup, 2026-08-02) ──────
// 1. The story's premise "no recorded reason a reader could check" was
//    OVERSTATED: audio-manifest.ts already recorded a reason for the citation
//    SPLIT. So the obvious RED — "assert a rationale exists" — PASSES ON
//    ARRIVAL and proves nothing. What was genuinely unrecorded is what the
//    families MEAN, and that is what the tests below actually demand.
// 2. The story said "the four wing cues citing G1DEC :5544". It is TWO.
//    playerWingDown and playerWingUp cite :5544; enemyWingDown and enemyWingUp
//    cite :5560, which is P3DEC's row and has no G-variant to choose between.
//    The shipped comment at audio-manifest.ts carries the SAME error ("These
//    four cite the G-BLOCK row") — that false sentence is AC5's target.
//
// ─── WHY THE PROSE ASSERTIONS ANCHOR ON ROM SYMBOLS, NOT ON WORDING ──────────
// A guard that pins an author's sentence breaks on every legitimate reword and
// teaches the next reader to loosen it. Every prose assertion below therefore
// turns on either (a) a ROM SYMBOL the claim cannot be made without naming, or
// (b) a citation that must RE-OPEN to content supporting the claim. Dev may
// word the record however reads best; it must still cite the mechanism.
//
// ─── THE tp1-8 COLLECTION TRAP (inherited, and it is load-bearing) ───────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws on CI, where the gitignored
// reference/ tree is absent — killing the file before any test runs while local
// stays green. Every vendored read below happens INSIDE an `it()`. The only
// module-scope filesystem call is `existsSync`, which cannot throw.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

const SRC = 'JOUSTRV4.SRC'

/** Read the vendored file as lines. Only ever called inside an `it()`. */
function vendoredLines(file: string): string[] {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`the vendored tree has no ${file}`)
  // Measured 2026-08-02: JOUSTRV4.SRC is pure LF (0 CRLF pairs). The strip is
  // kept anyway because a re-vendoring run through a Windows checkout would
  // glue \r to the last token of every line and silently break operand parsing
  // rather than failing loudly.
  return readFileSync(p, 'latin1').split('\n').map((l) => l.replace(/\r$/, ''))
}

/** The nearest label at or above `line` — which decision block an `FDB` row
 *  belongs to. Same helper as audio-transporter-split.test.ts:226; :5544 and
 *  :5552 both name SNPCR1 and belong to DIFFERENT blocks, and that difference
 *  is the whole subject of this file. */
function owningLabel(lines: string[], line: number): string {
  for (let n = line; n > 0; n--) {
    const label = (lines[n - 1] ?? '').split('\t')[0] ?? ''
    if (/^[A-Z][A-Z0-9]*$/.test(label)) return label
  }
  throw new Error(`no label at or above ${SRC}:${line}`)
}

/** The manifest's SOURCE TEXT. The record this story asks for is prose, so the
 *  subject under test is the file's text — not its exports. Read from disk
 *  rather than imported: a comment has no runtime representation. */
function manifestText(): string {
  return readFileSync(join(root, 'src', 'shell', 'audio-manifest.ts'), 'utf8')
}

/**
 * The manifest's COMMENT text only — every `//` line, stripped of its marker.
 *
 * This distinction is not fastidiousness; it was forced by a mutation that
 * SURVIVED. An earlier draft of the AC6 test asserted `SNPLWU,SNPLWD` appeared
 * in `manifestText()`, and deleting the entire explanatory sentence did not
 * redden it — because that exact string also sits inside the `verbatim:` field
 * of four call-site citations. The assertion was reading the DATA and scoring
 * it as the PROSE, so it could never fail.
 *
 * Every claim about what the record SAYS therefore runs against this, and only
 * structural claims run against `CUE_SOURCES`. The two surfaces are checked
 * separately on purpose: AC6 needs :5544 discussed in prose while AC4 needs it
 * absent from the data, and a whole-file scan cannot express that at all.
 */
function manifestComments(): string {
  return manifestText()
    .split('\n')
    .map((l) => {
      const m = /^\s*(?:\/\/|\*)\s?(.*)$/.exec(l)
      return m ? m[1] : ''
    })
    .join('\n')
}

// The manifest must stay import-free (the sample bake reads it under plain
// node), so the suite MIRRORS its types rather than importing them — the same
// arrangement audio-transporter-split.test.ts uses.
interface Citation {
  file: string
  line: number
  verbatim: string
}
type RomCueSource = {
  kind: 'rom'
  table: string
  priority: number
  romComment: string
  source: Citation
  callSite: Citation
}
type CueSource = RomCueSource | { kind: 'invention'; note: string }

/** Narrow to a ROM citation. A predicate with a real runtime check rather than
 *  an `as` cast at each use site — the lang-review checklist forbids casts that
 *  exist only to make an assertion typecheck, and every `.filter()` below needs
 *  the same narrowing. */
function isRom(s: CueSource): s is RomCueSource {
  return s.kind === 'rom'
}

/** ROM entries as `[name, source]` pairs, narrowed once. */
function romEntries(sources: Readonly<Record<string, CueSource>>): [string, RomCueSource][] {
  return Object.entries(sources).filter((e): e is [string, RomCueSource] => isRom(e[1]))
}

const load = async <T>(parts: string[]): Promise<Partial<T>> => {
  try {
    return (await import(/* @vite-ignore */ parts.join('/'))) as Partial<T>
  } catch {
    return {}
  }
}

async function cueSources(): Promise<Readonly<Record<string, CueSource>>> {
  const value = (
    await load<{ CUE_SOURCES: Readonly<Record<string, CueSource>> }>([
      '..', 'src', 'shell', 'audio-manifest',
    ])
  ).CUE_SOURCES
  if (value === undefined) throw new Error('audio-manifest.ts must export `CUE_SOURCES`')
  return value
}

/** The two knight wing cues — the ONLY cues this story re-anchors. Named
 *  explicitly rather than pattern-matched on "Wing", because the enemy wing
 *  cues are also wing cues and must NOT move (see AC5). */
const KNIGHT_WING_CUES = ['playerWingDown', 'playerWingUp'] as const

/** Every G-block row in the ROM. A knight cue citing any of these is citing the
 *  attract demo's binding. */
const G_BLOCK_SOUND_ROWS = [5544, 5548]

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — these PASS ON ARRIVAL and are declared as such.
//
// They are not padding: every RED assertion below is stated in terms of "a
// P-block", "the selection site", "the census", and each of those is a claim
// about the frozen 1982 source that could be wrong. If the oracle is wrong the
// story records a falsehood and every RED test below is measuring the wrong
// thing. JOUSTRV4.SRC is vendored, immutable history — pinning line numbers
// against it is safe in a way that pinning them against a live file is not.
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-23 ORACLE — the ROM selection site says what the record will claim', () => {
  it('the vendored tree really is here (so the skips are not silent)', () => {
    expect(existsSync(join(vendoredRoot, SRC))).toBe(true)
  })

  it('player 1: GOVER selects G1DEC over P1DEC, and the result becomes PDECSN', () => {
    const l = vendoredLines(SRC)
    expect(l[1024]).toBe('\tLDX\t#G1DEC\t\tASSUME GAME SIMULATION')
    expect(l[1025]).toBe('\tLDA\tGOVER\t\tGAME SIMULATION?')
    expect(l[1026]).toBe('\tBGT\t30$\t\t BR=YES')
    expect(l[1027]).toBe('\tLDX\t#P1DEC')
    expect(l[1028]).toBe("30$\tSTX\tPDECSN,Y\tPLAYER 1'S JOYSTICK")
  })

  it('player 2: the identical shape, so the rule is a rule and not a one-off', () => {
    const l = vendoredLines(SRC)
    expect(l[1040]).toBe('\tLDX\t#G2DEC\t\tASSUME GAME SIMULATION')
    expect(l[1041]).toBe('\tLDA\tGOVER\t\tGAME SIMULATION?')
    expect(l[1043]).toBe('\tLDX\t#P2DEC')
    expect(l[1044]).toBe("40$\tSTX\tPDECSN,Y\tPLAYER 2'S JOYSTICK")
  })

  it('the corroboration: P-blocks read the PANEL, G-blocks live in the attract region', () => {
    // The ROM's own "ASSUME GAME SIMULATION" comment is one witness. These are
    // the other two, and they are independent of it.
    const l = vendoredLines(SRC)
    expect(l[7246], 'P1JOY reads the hardware joystick MUX').toBe(
      'P1JOY\tLDA\tWCPIAB\t\tSELECT HALF OF MUX',
    )
    expect(l[7252], 'P2JOY likewise').toContain('WCPIAB')
    expect(l[615], 'G1JOY is a computed joystick — no PIA read').toBe('G1JOY\tTFR\tU,X')
    expect(l[711], 'and it sits in the attract routine').toBe(
      'ATTRCT\tCLR\tGOVER\t\tSTATE OF GAME = OVER',
    )
  })

  it('the census: exactly TWO G-blocks against SEVEN P-blocks', () => {
    // AC2's substrate. If a third G-block existed the knights-only claim would
    // be false, and "G means attract" might not be the distinction at all.
    const text = vendoredLines(SRC).join('\n')
    const g = [...text.matchAll(/^(G[0-9]DEC)\tFDB\t/gm)].map((m) => m[1])
    const p = [...text.matchAll(/^(P[0-9]DEC)\tFDB\t/gm)].map((m) => m[1])
    expect(g).toEqual(['G1DEC', 'G2DEC'])
    expect(p).toEqual(['P1DEC', 'P2DEC', 'P3DEC', 'P4DEC', 'P5DEC', 'P6DEC', 'P7DEC'])
  })

  it('the four knight sound rows open IDENTICALLY — which is why :5544 was never a false citation', () => {
    // AC6's substrate, and the reason the re-anchor is a precision gain rather
    // than a bug fix. Also pins the ONE place the families differ.
    const l = vendoredLines(SRC)
    for (const n of [5544, 5548, 5552, 5556]) {
      expect(l[n - 1], `${SRC}:${n} must open with the two wing tables`).toContain(
        '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,',
      )
    }
    expect(l[5543], 'G1DEC slot 8 is a bare 0').toContain('SNPFAL,0,SNPCR1')
    expect(l[5547], 'G2DEC slot 8 is a bare 0').toContain('SNPFAL,0,SNPCR2')
    expect(l[5551], 'P1DEC slot 8 is SNPTREF').toContain('SNPFAL,SNPTREF,SNPCR1')
    expect(l[5555], 'P2DEC slot 8 is SNPTREF').toContain('SNPFAL,SNPTREF,SNPCR2')
  })

  it('the owning labels really are what this suite assumes', () => {
    const l = vendoredLines(SRC)
    expect(owningLabel(l, 5544)).toBe('G1DEC')
    expect(owningLabel(l, 5548)).toBe('G2DEC')
    expect(owningLabel(l, 5552)).toBe('P1DEC')
    expect(owningLabel(l, 5556)).toBe('P2DEC')
    expect(owningLabel(l, 5560)).toBe('P3DEC')
    // Discriminating: without this the four above could pass on a helper that
    // returned whatever it was compared against.
    expect(owningLabel(l, 5544)).not.toBe(owningLabel(l, 5552))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — RED. The two knight wing cues must cite the P-family.
//
// Asserted by RESOLUTION (open the cited line, ask which block owns it) rather
// than by comparing the number to 5552. A test that pins the number IS the
// stale citation one layer up — sw8-18's lesson.
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-23 AC4 — every knight cue cites a REAL-PLAY block', () => {
  it('the two knight wing cues resolve to a P-block, not the attract demo', async () => {
    const sources = await cueSources()
    const l = vendoredLines(SRC)
    const offenders: string[] = []
    for (const name of KNIGHT_WING_CUES) {
      const s = sources[name]
      expect(s, `precondition: ${name} is in CUE_SOURCES`).toBeDefined()
      if (s.kind !== 'rom') throw new Error(`${name} must be a ROM citation`)
      const label = owningLabel(l, s.callSite.line)
      if (!/^P[0-9]DEC$/.test(label)) {
        offenders.push(`${name}: cites ${SRC}:${s.callSite.line}, owned by ${label}`)
      }
    }
    expect(
      offenders.join('\n'),
      'a cue fired by a HUMAN must not cite the attract demo’s binding',
    ).toBe('')
  })

  it('NO cue in the whole manifest cites a G-block row', async () => {
    // The general form of AC4. The story is about the manifest citing two
    // families; the deliverable is that it cites one. This catches a future cue
    // that re-introduces the split, which the per-cue test above cannot.
    const sources = await cueSources()
    const offenders = romEntries(sources)
      .filter(([, s]) => G_BLOCK_SOUND_ROWS.includes(s.callSite.line))
      .map(([name, s]) => `${name} -> :${s.callSite.line}`)
    expect(offenders.join('\n'), 'CUE_SOURCES must cite ONE decision-block family').toBe('')
  })

  it('the re-anchored citation still RE-OPENS and still names its table', async () => {
    // Guards the failure mode where the line moves but the verbatim does not —
    // which would leave a byte-perfect quote of the wrong row. The existing
    // gate in audio-rom-citations.test.ts checks this for every cue; repeated
    // here scoped to the two that move, so a break points at this story.
    const sources = await cueSources()
    const l = vendoredLines(SRC)
    for (const name of KNIGHT_WING_CUES) {
      const s = sources[name]
      if (s.kind !== 'rom') throw new Error(`${name} must be a ROM citation`)
      expect(l[s.callSite.line - 1], `${name}: verbatim must match the cited line`).toBe(
        s.callSite.verbatim,
      )
      expect(s.callSite.verbatim, `${name}: the row must bind ${s.table}`).toContain(s.table)
    }
  })

  it('the ENEMY wing cues do NOT move — they cite P3DEC, which has no G-variant', async () => {
    // The correction to the story's "four". If Dev reads "the wing cues" as all
    // four and re-anchors the enemy pair too, this reddens. There is nowhere
    // for them to go: P3DEC's row is the only binding of SNELWU/SNELWD.
    const sources = await cueSources()
    const l = vendoredLines(SRC)
    for (const name of ['enemyWingDown', 'enemyWingUp']) {
      const s = sources[name]
      expect(s, `precondition: ${name} is in CUE_SOURCES`).toBeDefined()
      if (s.kind !== 'rom') throw new Error(`${name} must be a ROM citation`)
      expect(owningLabel(l, s.callSite.line), `${name} belongs to the buzzard block`).toBe('P3DEC')
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 / AC2 / AC3 — RED. The record, and the citation it rests on.
//
// These run WITHOUT the vendored tree (so CI enforces them) except where a
// claim is checked by re-opening, which is necessarily tree-dependent.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-23 AC1 — the manifest records WHAT the two families are', () => {
  it('the record names the symbols the mechanism turns on', () => {
    // GOVER is the flag and PDECSN is the field it writes. The claim "G is the
    // attract demo" cannot be made from evidence without naming both — an
    // author who has not read the selection site will not mention PDECSN.
    const t = manifestComments()
    expect(t, 'the record must name the flag that selects the family').toContain('GOVER')
    expect(t, 'and the field the chosen block is stored into').toContain('PDECSN')
  })

  it('the record cites the selection site, not merely the two block rows', () => {
    // Before this story the manifest cited :5544/:5548/:5552/:5556 — the DATA.
    // The mechanism lives ~4500 lines away at :1025-1029, and citing the data
    // is exactly what left the families unexplained.
    const t = manifestComments()
    const cited = [...t.matchAll(/:(\d{3,4})\b/g)].map((m) => Number(m[1]))
    const inSelectionWindow = cited.filter((n) => (n >= 1025 && n <= 1029) || (n >= 1041 && n <= 1045))
    expect(
      inSelectionWindow.length,
      'the record must cite JOUSTRV4.SRC:1025-1029 (or the player-2 mirror :1041-1045)',
    ).toBeGreaterThan(0)
  })

  it('the record distinguishes attract from real play in ROM terms', () => {
    // Anchored on the symbol, not the phrasing: whatever words Dev chooses, a
    // record that explains WHY the P-blocks are the human ones has to point at
    // the hardware read. WCPIAB is the tell that the author checked P1JOY.
    const t = manifestComments()
    expect(t, 'name the joystick sources the two families differ in').toMatch(/G1JOY|G2JOY/)
    expect(t, 'and the hardware read that proves P is the human one').toContain('WCPIAB')
  })
})

describe.skipIf(!vendoredAvailable)('jt5-23 AC3 — every line the record cites RE-OPENS to the thing it is cited for', () => {
  it('the cited selection lines really carry the selection', () => {
    // The guard that makes AC1's citation test more than a number-match: pull
    // the cited numbers back out of the record and open them. A record citing
    // :1027 alone would satisfy "in the window" while pointing at a bare
    // branch; this demands the load and the test be among what was cited.
    const t = manifestComments()
    const l = vendoredLines(SRC)
    const cited = [...t.matchAll(/:(\d{3,4})\b/g)]
      .map((m) => Number(m[1]))
      .filter((n) => (n >= 1025 && n <= 1029) || (n >= 1041 && n <= 1045))
    expect(cited.length, 'precondition: AC1 established the record cites the window').toBeGreaterThan(0)

    // Citing a RANGE start is the normal idiom (":1025-1029"), so the span the
    // reader would open is the cited line through the end of its block.
    const spans = cited.map((n) => l.slice(n - 1, n <= 1029 ? 1029 : 1045).join('\n'))
    expect(
      spans.some((s) => /LDX\t#G[12]DEC/.test(s) && /LDA\tGOVER/.test(s)),
      'a cited span must contain BOTH the G-block load and the GOVER test',
    ).toBe(true)
    expect(
      spans.some((s) => /LDX\t#P[12]DEC/.test(s) && /STX\tPDECSN/.test(s)),
      'and the P-block fallback with the store that makes it the joystick',
    ).toBe(true)
  })
})

describe('jt5-23 AC2 — the record states that the pairing is KNIGHTS-ONLY', () => {
  it('the creature blocks are named as a RANGE, not mentioned in passing', () => {
    // Without this, "G is attract and P is real play" reads as a statement
    // about all seven P-blocks, and is then wrong for five of them.
    //
    // Requiring TWO DISTINCT creature symbols rather than one is deliberate,
    // and a survived mutation is why. Deleting "P3DEC-P7DEC" from the
    // knights-only sentence left the test green, because a DIFFERENT sentence
    // — the one citing :5560 for the enemy wings — also says "P3DEC". One
    // symbol proves only that a buzzard was mentioned somewhere; stating the
    // exclusion requires naming the span it covers.
    const t = manifestComments()
    const named = new Set([...t.matchAll(/\bP([3-7])DEC\b/g)].map((m) => m[0]))
    expect(
      [...named].sort().join(','),
      'the record must name the creature-block RANGE it is excluding (e.g. P3DEC-P7DEC)',
    ).not.toBe('')
    expect(
      named.size,
      'naming a single creature block can be satisfied by an unrelated citation sentence',
    ).toBeGreaterThanOrEqual(2)
  })

  it('the record does not claim a G-block that does not exist', () => {
    // The failure mode of writing the census from memory. The ROM has exactly
    // G1DEC and G2DEC; a record mentioning G3DEC has invented a symbol, and an
    // invented symbol in a citation is worse than no citation at all.
    const t = manifestComments()
    const invented = [...t.matchAll(/\bG([0-9])(?:DEC|JOY)\b/g)]
      .map((m) => m[0])
      .filter((sym) => !/^G[12](DEC|JOY)$/.test(sym))
    expect([...new Set(invented)].join(', '), 'no such symbol exists in JOUSTRV4.SRC').toBe('')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 / AC6 — RED. The false sentence goes; the true one stays.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-23 AC5 — the shipped "these four" miscount is corrected', () => {
  it('the manifest no longer claims four cues cite the G-block row', () => {
    // The exact defect, quoted from the shipped file. This is a negated test on
    // a KNOWN-FALSE string rather than on an author's phrasing, so it cannot
    // break on a legitimate reword — only on the falsehood surviving.
    const t = manifestComments()
    expect(
      t.includes('These four cite the G-BLOCK row'),
      'audio-manifest.ts asserts four cues cite :5544; only playerWingDown and ' +
        'playerWingUp ever did. enemyWingDown/enemyWingUp cite :5560 (P3DEC).',
    ).toBe(false)
  })

  it('the count in the record matches the count in the data', async () => {
    // The durable form of the same finding: whatever the record says, exactly
    // two cues are knight wing cues and they are the two that moved. A future
    // edit reintroducing "four" as a claim about knight cues is caught by the
    // data disagreeing, not by a string.
    const sources = await cueSources()
    const wingCues = Object.entries(sources).filter(([n]) => /Wing(Up|Down)$/.test(n))
    expect(wingCues.length, 'four wing cues exist in total').toBe(4)
    expect(
      wingCues.filter(([n]) => (KNIGHT_WING_CUES as readonly string[]).includes(n)).length,
      'but only TWO of them are knight cues, and only those two were ever G-cited',
    ).toBe(2)
  })
})

describe('jt5-23 AC6 — the record keeps WHY the old citation was also true', () => {
  it('the identical-rows fact survives, so the re-anchor is not read as a bug fix', () => {
    // If the record simply moved the citation and said nothing, the next reader
    // concludes :5544 was WRONG and re-litigates a correct decision — or worse,
    // "fixes" audio-flap.test.ts:244, which legitimately quotes :5544 as a ROM
    // fact. The record must keep the wing tables' identity across the families.
    // Asserted by PROXIMITY, and two survived mutations drove it there.
    //
    // First draft scanned the whole file for `SNPLWU,SNPLWD` — vacuous, since
    // that string opens the `verbatim:` of four call-site citations. Scoping to
    // comments was still not enough: a SECOND sentence (jt5-3's, explaining why
    // GOFLIP/GOFLAP cannot be cited) names `SNPLWU/SNPLWD` too, so deleting the
    // identical-rows explanation STILL left it green.
    //
    // What AC6 actually claims is that the wing tables are identical ACROSS THE
    // TWO FAMILIES. That claim cannot be stated without discussing the tables
    // and both families' rows together — so the test demands they appear inside
    // one window. Neither pre-existing sentence can satisfy it: jt5-3's names
    // the tables but cites only a G row, and jt5-6's cites all four rows but
    // never names the wing tables.
    const lines = manifestComments().split('\n')
    const WINDOW = 12
    let found = false
    for (let i = 0; i + WINDOW <= lines.length + WINDOW; i++) {
      const w = lines.slice(i, i + WINDOW).join('\n')
      if (
        /SNPLWU\s*[,/]\s*SNPLWD/.test(w) &&
        /:554[48]\b/.test(w) && // a G-block row
        /:555[26]\b/.test(w) // and a P-block row
      ) {
        found = true
        break
      }
    }
    expect(
      found,
      'the record must explain, in one place, that SNPLWU/SNPLWD open the G rows ' +
        '(:5544/:5548) and the P rows (:5552/:5556) identically — which is why the ' +
        'pre-jt5-23 citation was true and the re-anchor is a precision gain, not a bug fix',
    ).toBe(true)
  })

  it('mentioning :5544 in PROSE is not the same as CITING it as a call site', async () => {
    // Guards the reading of AC6 that would undo AC4. These are two different
    // surfaces and the suite must not let one satisfy the other: the comment
    // text may discuss :5544 freely; no callSite may point at it.
    const sources = await cueSources()
    const t = manifestComments()
    expect(t.includes('5544'), 'precondition: the record still discusses the G row').toBe(true)
    const citing = romEntries(sources)
      .filter(([, s]) => s.callSite.line === 5544)
      .map(([n]) => n)
    expect(citing, 'discussing the row is fine; citing it as a call site is not').toEqual([])
  })
})
