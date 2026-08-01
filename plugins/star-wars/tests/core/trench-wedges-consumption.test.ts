// tests/core/trench-wedges-consumption.test.ts
//
// Story uf1-4 — RED phase: every export of src/core/trench-wedges.ts must have
// an explicit DISPOSITION. The 2026-07-28 fleet sweep found 13 of the module's
// 19 exports referenced by tests and by nothing else (the panel-column
// vocabulary, the five wedge-type opcodes, and the pie/group layer). The story
// ends the third state where ROM data sits tested and unread: when it closes,
// every export is either
//   (a) WIRED     — referenced by production code (src/, excluding the dev-only
//                   src/tools/ contact sheets and this module itself), or
//   (b) REMOVED   — no longer an export at all, or
//   (c) CARRIED   — named in the module header under a marker containing the
//                   phrase "CARRIED WITHOUT A CONSUMER", with the why.
// This suite IS the sweep's export scan, made permanent (AC-5): a later story
// that adds a test-only export without dispositioning it reddens this file.
//
// SCAN SEMANTICS (deliberate, per lang-review check #15 — match the CLAIM, not
// a token):
//   • Comments are STRIPPED from production sources before matching, so a
//     comment that merely mentions a symbol name can never count as a consumer
//     (the decoy-comment class).
//   • References match on word boundaries against the remaining CODE. An import
//     statement alone could still satisfy this scan — `npm run lint` (noUnused
//     checks) and the behavioural suites are what force the import to be real.
//   • src/tools/ is excluded: the contact/scene sheets are dev pages; a wire
//     must land in the running game, not the dev sheet.
//   • The two guards below CROSS-CHECK each other: a broken carried-block
//     matcher that answered "documented" for everything would green the
//     disposition test but simultaneously redden the stale-doc test (known
//     production-consumed symbols would look "carried"), so the failure mode
//     is loud, not silent.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MODULE_PATH = join(root, 'src', 'core', 'trench-wedges.ts')

/** Every .ts file under dir, recursively. */
function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walkTs(p))
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

/** Block and line comments removed, so a name in a comment is not a reference.
 *  (A `//` inside a string literal would truncate that line too — acceptable
 *  here: it can only LOSE references, never invent one, so the scan errs red.) */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^(.*?)\/\/.*$/gm, '$1')
}

const moduleSrc = readFileSync(MODULE_PATH, 'utf8')

/** The module's leading docblock — everything above the first real import. */
const firstImport = moduleSrc.search(/^import /m)
const header = firstImport > 0 ? moduleSrc.slice(0, firstImport) : ''

/** Every export the module declares (const / function / interface / type). */
const exportNames = [...moduleSrc.matchAll(/^export (?:const|function|interface|type) ([A-Za-z_$][A-Za-z0-9_$]*)/gm)].map(
  (m) => m[1],
)

/** Production sources: src/ minus the dev-only tools pages, minus the module. */
const prodFiles = walkTs(join(root, 'src')).filter(
  (p) => p !== MODULE_PATH && !p.includes(`${sep}tools${sep}`),
)
const prodCode = prodFiles.map((p) => stripComments(readFileSync(p, 'utf8')))

function prodConsumed(name: string): boolean {
  const word = new RegExp(`\\b${name}\\b`)
  return prodCode.some((code) => word.test(code))
}

/** The carried-data section: header text AFTER the marker phrase. A symbol is
 *  documented as carried iff its name appears there on a word boundary. */
const carriedMarker = /CARRIED WITHOUT A CONSUMER/i.exec(header)
const carriedBlock = carriedMarker ? header.slice(carriedMarker.index) : ''
function carriedDocumented(name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(carriedBlock)
}

describe('uf1-4 — every trench-wedges export has an explicit disposition (the sweep scan, made permanent)', () => {
  it('the scan itself is sound: exports found, corpus non-trivial, a known consumer resolves', () => {
    // Count-first guards (check #15): if the export regex or the walk broke,
    // fail HERE with a diagnosis, not downstream with a universally-quantified
    // loop that compared nothing.
    expect(exportNames.length, 'export extraction found the module surface').toBeGreaterThanOrEqual(6)
    expect(prodFiles.length, 'production corpus is the real src tree').toBeGreaterThan(20)
    expect(prodConsumed('buildTrench'), 'the scan resolves a known production reference').toBe(true)
    expect(prodConsumed('PANEL_FORCEFIELD'), 'the sw7-22 graduate still reads as consumed').toBe(true)
  })

  it('no export is left referenced only by tests: wired, removed, or documented as carried (AC-1, AC-5)', () => {
    // RED today: 13 exports (PANEL_BLANK, PANEL_PANEL, PANEL_GUN, PanelColumn,
    // decodePanelColumn, WEDGE_SHORT/LONG/END/PORT/NEXT, PIES, WEDGE_GROUP_IDS,
    // wedgeGroup) have zero production references and no carried-block entry.
    const undispositioned = exportNames.filter((n) => !prodConsumed(n) && !carriedDocumented(n))
    expect(
      undispositioned,
      'each listed export needs a disposition: a production consumer, removal, or a header entry under "CARRIED WITHOUT A CONSUMER" saying why it stays',
    ).toEqual([])
  })

  it('the carried block never names a symbol production actually consumes (stale-doc guard)', () => {
    // Vacuously green until a carried block exists; once one does, a symbol
    // that graduates to production must LEAVE the block, or this reddens.
    const stale = exportNames.filter((n) => prodConsumed(n) && carriedDocumented(n))
    expect(stale, 'carried-block entries must be genuinely unconsumed').toEqual([])
  })

  it('the module header states which layers production consumes (AC-6)', () => {
    // The AC's own phrase, anchored in the header docblock — the next reader
    // must not have to re-derive the consumption map the sweep had to build.
    expect(header, 'header must carry a "production consumes" statement').toMatch(/production consumes/i)
  })
})
