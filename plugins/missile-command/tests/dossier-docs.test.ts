// plugins/missile-command/tests/dossier-docs.test.ts
//
// Story mc2-2 — RED phase (Han Solo / TEA). The doc-contract for the two standing
// source-of-record dossiers this epic promises every later story and the
// rom-fidelity-audit skill: docs/rom-study/subsystems.md (the per-subsystem
// module + .SBTTL anchor index) and docs/rom-study/glossary.md (the per-symbol
// decoded dictionary). Both are the joust/centipede shape.
//
// RED today because NEITHER FILE EXISTS. Every always-on test below reads one of
// them and fails on the missing file; the claim-backing block reddens for the
// nine W3COMN constants mc2-1 never claimed. GREEN is Dev (Yoda) writing the two
// docs and extending docs/rom-study/claims/*.json so every mechanically-checkable
// glossary entry is pinned by a claim.
//
// ─── WHAT THIS FILE PROVES (mc2-2 ACs) ───────────────────────────────────────
//  AC1 — subsystems.md lists EVERY subsystem from brief.md's map, each with its
//        module (W3MAIN/W3DSUP/W3INT/W3COIN) and a .SBTTL line anchor, and every
//        anchor it cites is REALLY a .SBTTL in that module at that line.
//  AC2 — glossary.md defines EVERY W3COMN constant in brief.md's table (plus the
//        O-2/O-4 symbols), records the as-written value + radix note (not just the
//        decoded number), and every mechanically-checkable entry is backed by an
//        mc2-1 claim.
//
// ─── THE CROSS-CHECK IS PARAPHRASE-TOLERANT AND PHYSICAL-LINE, BY DESIGN ──────
// brief.md's anchor titles are loose paraphrases of the source (`CALC DELTA` is
// really `.SBTTL CALCULATE DELTA FROM OBJECT 1 TO 2`), so matching titles would
// be brittle. Instead the byte-gated test parses each `MODULE:LINE` anchor the doc
// writes and asserts the PHYSICAL line it names is a `.SBTTL` directive in that
// module. That is the mc2-1 citation convention (constants are cited by physical
// line, W3COMN.MAC:39) carried onto the .SBTTL index — and it catches the exact
// trap this codebase keeps hitting: brief.md's `:238 MAINLINE` is the LOGICAL
// (non-blank) ordinal; the physical `.SBTTL MAINLINE` sits at 475. A doc that
// copies brief.md's logical numbers instead of re-deriving from source reddens.
//
// ─── SOURCE HAZARD (mc1/mc2-1 measured) ──────────────────────────────────────
// The vendored `.MAC` carry stray non-UTF8/CR bytes: a plain `grep` false-empties
// (use `grep -a`); readFileSync(.., 'utf8') reads them fine. The tree is
// gitignored, so every byte-gated block SKIPS on CI (the jt1-3 degradation
// pattern) and the committed-structure tests stand alone there.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const romStudy = join(root, 'docs', 'rom-study')
const subsystemsPath = join(romStudy, 'subsystems.md')
const glossaryPath = join(romStudy, 'glossary.md')

const sourceDir = join(root, 'reference', 'source')
const W3COMN = join(sourceDir, 'W3COMN.MAC')
const sourceAvailable = existsSync(W3COMN)

/** Read a dossier, or throw a message that names the file Dev must create. */
const readDoc = (path: string, label: string): string => {
  if (!existsSync(path)) {
    throw new Error(`docs/rom-study/${label} does not exist yet — mc2-2 GREEN (Yoda) writes it`)
  }
  return readFileSync(path, 'utf8')
}

// ── the claims loader, dynamic-imported so `tsc --noEmit` / collection stay green
// even while a fresh checkout has not built it (the citations.test.ts idiom). ──
interface Claim {
  id?: string
  symbol?: string
  value?: number | string
  source?: { file: string; line: number; verbatim?: string }
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

// ─────────────────────────────────────────────────────────────────────────────
// AC1a — subsystems.md exists and NAMES every subsystem in brief.md's map.
//   Each row is matched by a distinct, stable keyword drawn from the AC's own
//   enumeration, so a doc that silently drops a subsystem reddens on exactly that
//   row. Keywords are source vocabulary (ABM, ICBM, MIRV, STAMP, LADDER…), not
//   brief.md prose, so paraphrasing the behaviour line does not defeat them.
// ─────────────────────────────────────────────────────────────────────────────
const SUBSYSTEMS: ReadonlyArray<{ subsystem: string; keyword: RegExp }> = [
  { subsystem: 'mainline loop + state machine', keyword: /MAINLINE|state machine/i },
  { subsystem: 'cursor / trackball → crosshair', keyword: /CURSOR/i },
  { subsystem: 'player ABM launch', keyword: /\bABM/i },
  { subsystem: 'enemy ICBM', keyword: /ICBM/i },
  { subsystem: 'cruise missile', keyword: /CRUISE|\bCM\b/i },
  { subsystem: 'MIRV', keyword: /MIRV/i },
  { subsystem: 'explosions', keyword: /EXPLOSION/i },
  { subsystem: 'damage detection', keyword: /DAMAGE/i },
  { subsystem: 'missile geometry (velocity/aim)', keyword: /VELOCITY|DELTA/i },
  { subsystem: 'wave setup', keyword: /\bWAVE/i },
  { subsystem: 'scoring + bonus', keyword: /BONUS|SCOR/i },
  { subsystem: 'circle / explosion picture', keyword: /CIRCLE/i },
  { subsystem: 'attract mode', keyword: /ATTRACT/i },
  { subsystem: 'drawing (stamps)', keyword: /STAMP/i },
  { subsystem: 'high-score ladder + name entry', keyword: /LADDER|INITIALS/i },
  { subsystem: 'coin door', keyword: /COIN/i },
  { subsystem: 'interrupt / video timebase', keyword: /INTERRUPT|W3INT|TIMEBASE/i },
]

const MODULES = ['W3MAIN', 'W3DSUP', 'W3INT', 'W3COIN'] as const

describe('subsystems.md is the per-subsystem index (AC1)', () => {
  it('the file exists', () => {
    expect(existsSync(subsystemsPath), 'Dev writes docs/rom-study/subsystems.md').toBe(true)
  })

  it.each(MODULES)('names its four source modules — %s', (mod) => {
    expect(readDoc(subsystemsPath, 'subsystems.md')).toContain(mod)
  })

  it.each(SUBSYSTEMS)('lists the "$subsystem" subsystem', ({ keyword }) => {
    expect(
      keyword.test(readDoc(subsystemsPath, 'subsystems.md')),
      `subsystems.md must document the ${keyword} subsystem from brief.md's map`,
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1b — every .SBTTL anchor the doc cites is REAL. Byte-gated: re-reads the
//   vendored source and requires each `MODULE:LINE` anchor to land on a `.SBTTL`
//   directive at that physical line. Convention (mc2-1): anchors are cited by
//   PHYSICAL line as `W3MAIN:475` (or `W3MAIN.MAC:475`). W3COIN carries no .SBTTL
//   and W3INT is O-2 (unread), so those two rows are anchor-optional — the doc is
//   free to leave them un-anchored, but any anchor it DOES write must be true.
// ─────────────────────────────────────────────────────────────────────────────
const ANCHOR_RE = /\b(W3MAIN|W3DSUP|W3INT)(?:\.MAC)?:(\d+)/gi

describe.skipIf(!sourceAvailable)('subsystems.md .SBTTL anchors cross-check against the vendored source (AC1)', () => {
  const anchors = (): Array<{ module: string; line: number; raw: string }> => {
    const doc = readDoc(subsystemsPath, 'subsystems.md')
    return [...doc.matchAll(ANCHOR_RE)].map((m) => ({
      module: m[1].toUpperCase(),
      line: Number(m[2]),
      raw: m[0],
    }))
  }

  const isSbttl = (module: string, line: number): boolean => {
    const src = readFileSync(join(sourceDir, `${module}.MAC`), 'utf8').split('\n')
    return /^\s*\.SBTTL\b/.test(src[line - 1] ?? '')
  }

  it('cites at least the eleven anchored gameplay/drawing subsystems', () => {
    // Nine W3MAIN gameplay rows + two W3DSUP rows carry a real .SBTTL; coin and
    // interrupt do not. A doc that cited zero anchors would pass AC1a on keywords
    // alone — this floor stops that.
    expect(anchors().length, 'subsystems.md must carry MODULE:LINE .SBTTL anchors').toBeGreaterThanOrEqual(11)
  })

  it('every cited anchor lands on a real .SBTTL line (physical, not brief.md\'s logical ordinal)', () => {
    const wrong = anchors().filter((a) => !isSbttl(a.module, a.line))
    expect(
      wrong,
      `these anchors do not point at a .SBTTL directive in the vendored source — ` +
        `brief.md's :238/:606 are LOGICAL ordinals, the physical .SBTTL sits ~2× lower ` +
        `(MAINLINE is W3MAIN:475): ${wrong.map((a) => a.raw).join(', ')}`,
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2a — glossary.md defines every W3COMN constant in brief.md's table. Each
//   symbol name must appear; the claim-backing block below proves each is pinned.
// ─────────────────────────────────────────────────────────────────────────────
const CONSTANTS: ReadonlyArray<{ symbol: string; line: number }> = [
  { symbol: 'MAXMIS', line: 29 }, { symbol: 'NABMS', line: 33 }, { symbol: 'NICBMS', line: 35 },
  { symbol: 'NCITY', line: 39 }, { symbol: 'NMISBA', line: 41 }, { symbol: 'TOPSCR', line: 107 },
  { symbol: 'LAUHGT', line: 171 }, { symbol: 'MXICON', line: 193 }, { symbol: 'SCITYM', line: 195 },
  { symbol: 'MAXMUL', line: 201 }, { symbol: 'SPUTWV', line: 203 }, { symbol: 'MIRVWV', line: 205 },
  { symbol: 'STUPID', line: 231 },
  { symbol: 'CITY1H', line: 123 }, { symbol: 'CITY1V', line: 125 }, { symbol: 'CITY2H', line: 127 },
  { symbol: 'CITY2V', line: 129 }, { symbol: 'CITY3H', line: 131 }, { symbol: 'CITY3V', line: 133 },
  { symbol: 'CITY4H', line: 135 }, { symbol: 'CITY4V', line: 137 }, { symbol: 'CITY5H', line: 139 },
  { symbol: 'CITY5V', line: 141 }, { symbol: 'CITY6H', line: 143 }, { symbol: 'CITY6V', line: 145 },
]

describe('glossary.md is the per-symbol decoded dictionary (AC2)', () => {
  it('the file exists', () => {
    expect(existsSync(glossaryPath), 'Dev writes docs/rom-study/glossary.md').toBe(true)
  })

  it.each(CONSTANTS)('defines $symbol', ({ symbol }) => {
    const doc = readDoc(glossaryPath, 'glossary.md')
    expect(new RegExp(`\\b${symbol}\\b`).test(doc), `glossary.md must define ${symbol}`).toBe(true)
  })

  // "surfaced by O-2/O-4": O-2 is the sim-tick open question (FRAME counter,
  // brief §3); O-4 is the starting-city-count question (SCITYM). The glossary must
  // carry both symbols and tag the open questions they descend from.
  it('carries the O-2 / O-4 symbols (FRAME and the open-question tags)', () => {
    const doc = readDoc(glossaryPath, 'glossary.md')
    expect(/\bFRAME\b/.test(doc), 'glossary must define FRAME (O-2 sim-tick counter)').toBe(true)
    expect(/O-2/.test(doc) && /O-4/.test(doc), 'glossary must tag the O-2 / O-4 open questions').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2b — the glossary records the AS-WRITTEN value + a radix note, not just the
//   decoded number. The two decimal-override constants are the trap: MAXMIS=10.
//   and TOPSCR=222. A doc that wrote only "10" / "222" would have silently dropped
//   the trailing period that MAKES them decimal, so requiring the as-written
//   token proves the radix discipline is actually recorded.
// ─────────────────────────────────────────────────────────────────────────────
describe('glossary.md records as-written values under the radix discipline (AC2)', () => {
  it('carries the radix note citing where .RADIX 16 is set', () => {
    const doc = readDoc(glossaryPath, 'glossary.md')
    expect(/\.RADIX 16/.test(doc), 'glossary must state .RADIX 16').toBe(true)
    expect(/W3COMN(?:\.MAC)?:1\b/.test(doc), 'and cite W3COMN.MAC:1 where it is set').toBe(true)
    expect(
      /trailing period|trailing '\.'|trailing "\."|decimal override/i.test(doc),
      'and explain the trailing-period = decimal override',
    ).toBe(true)
  })

  it('records the decimal-override constants AS WRITTEN (10. and 222., not bare 10/222)', () => {
    const doc = readDoc(glossaryPath, 'glossary.md')
    expect(doc.includes('10.'), 'MAXMIS as-written value is 10. (decimal override)').toBe(true)
    expect(doc.includes('222.'), 'TOPSCR as-written value is 222. (decimal override)').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2c — every mechanically-checkable glossary entry is BACKED BY A CLAIM. This
//   is the anti-drift tie: a constant whose value the docs decode must be pinned
//   by a committed mc2-1 claim so the doc cannot silently disagree with source.
//   RED: mc2-1 shipped claims for only MAXMIS/NCITY/NMISBA/TOPSCR/the city coords;
//   NABMS, NICBMS, MXICON, MAXMUL, SPUTWV, MIRVWV, STUPID, SCITYM and LAUHGT are
//   NOT yet claimed — Dev adds one claim each (a plain W3COMN EQU line).
// ─────────────────────────────────────────────────────────────────────────────
describe('every mechanically-checkable glossary constant is backed by an mc2-1 claim (AC2)', () => {
  it('the committed claims set is non-empty (the guard must have teeth)', async () => {
    const { loadClaims } = await loadClaimsModule()
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it.each(CONSTANTS)('$symbol (W3COMN.MAC:$line) has a covering claim', async ({ symbol, line }) => {
    const { loadClaims, claimCovers } = await loadClaimsModule()
    expect(
      claimCovers(loadClaims(), 'W3COMN.MAC', line, line),
      `no committed claim pins W3COMN.MAC:${line} (${symbol}) — the glossary decodes it, so mc2-2 ` +
        `requires a backing claim so the doc cannot drift from source`,
    ).toBe(true)
  })
})
