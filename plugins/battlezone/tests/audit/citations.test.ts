import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkFindings } from '../../tools/audit/check-citations.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const findingsDir = join(repoRoot, 'docs', 'audit', 'findings')
const sourceDir = process.env.BATTLEZONE_SOURCE_DIR ?? '/Users/slabgorb/Projects/battlezone-source-text'
const sourceAvailable = existsSync(sourceDir)

describe('checkFindings', () => {
  it('rejects a citation to a module that never shipped', () => {
    // BZSADG.MAC is the stand-alone VG diagnostic sitting beside the game source.
    // It is absent from the BZONE.MAP link string and never assembled into the cabinet.
    const errors = checkFindings(
      [{
        id: 'X-001', class: 'DIVERGENCE', title: 't',
        source: { file: 'BZSADG.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/scoring.ts', line: 1, verbatim: 'x' },
        claim: 'c', reasoning: 'r', recommendation: 'accept',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/BZSADG\.MAC.*never shipped/)
  })

  it('rejects COIN65 — present in the quarry but never included by the game', () => {
    // The game includes TC65 (BZONE.MAC:1238), which is absent from the quarry.
    // COIN65.MAC is its successor coin routine, on disk and perfectly plausible —
    // and code the cabinet never ran.
    const errors = checkFindings(
      [{
        id: 'X-008', class: 'DIVERGENCE', title: 't',
        source: { file: 'COIN65.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/scoring.ts', line: 1, verbatim: 'x' },
        claim: 'c', reasoning: 'r', recommendation: 'accept',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/COIN65\.MAC.*never shipped/)
  })

  it('accepts a citation to a module that shipped only via .INCLUDE (VGMC)', () => {
    // BZMTNS.MAC:7 `.INCLUDE VGMC` — the VG macro set shipped without ever
    // appearing on the link line.
    const errors = checkFindings(
      [{
        id: 'X-007', class: 'NO_COUNTERPART', title: 't', ours: null,
        source: { file: 'VGMC.MAC', line: 1, verbatim: 'anything' },
        claim: 'c', reasoning: 'r', recommendation: 'accept',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors).toEqual([])
  })

  it('rejects a finding whose `ours` verbatim does not match the real line', () => {
    const errors = checkFindings(
      [{
        id: 'X-002', class: 'DIVERGENCE', title: 't',
        source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/scoring.ts', line: 5, verbatim: 'export const SCORE_SAUCER = 999999' },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/X-002.*does not match/)
  })

  it('accepts a finding whose `ours` verbatim matches the real line', () => {
    const line = readFileSync(join(repoRoot, 'src/core/scoring.ts'), 'utf8').split('\n')[4]
    const errors = checkFindings(
      [{
        id: 'X-003', class: 'DIVERGENCE', title: 't',
        source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/scoring.ts', line: 5, verbatim: line },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors).toEqual([])
  })

  // Ported from tempest tp1-3 / star-wars. An `ours` citation into node_modules is the
  // BUILT output of a version-pinned git dependency (@arcade/shared): its dist/ was
  // gitignored and regenerated on every install, so its line numbers moved under the
  // audit each time the library was re-pinned or rebuilt.
  //
  // MONOREPO MIGRATION — fixture rebased, rule unchanged. The original fixture cited
  // `node_modules/@arcade/shared/dist/font.js` and READ that file off disk so its
  // verbatim was byte-exact. battlezone no longer has a node_modules of its own (the
  // root owns the toolchain) and the shared library is now in-repo at src/shared, so
  // that file does not exist to read. The fixture below cites a node_modules path
  // WITHOUT reading anything, and the assertions replace the old byte-exactness trick
  // with a stronger, file-free guarantee of the same non-vacuity: the error must be
  // the PATH rule's own message, and must NOT be a verbatim/existence complaint. A
  // checker that merely failed to open the file would emit "does not exist" or "does
  // not match verbatim" and is rejected here; only a rule that refuses the PATH passes.
  it('rejects an `ours` citation into node_modules — a rebuilt artifact is not our source', () => {
    const nmFile = 'node_modules/@arcade/shared/dist/font.js'

    const errors = checkFindings(
      [{
        id: 'X-020', class: 'DIVERGENCE', title: 't',
        source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
        ours: { file: nmFile, line: 1, verbatim: '// @arcade/shared — vector font.' },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )

    const joined = errors.join('\n')
    expect(joined, 'a citation into node_modules must be rejected').toMatch(/X-020/)
    expect(joined, 'it must be rejected BY THE PATH RULE, not as a side effect of an unreadable file')
      .toMatch(/is inside node_modules — a dependency's build output is not our source/)
    expect(joined, 'the path rule must fire ahead of any re-open of the cited line')
      .not.toMatch(/does not match verbatim|does not exist/)
  })

  it('requires `ours` to be null for NO_COUNTERPART and present otherwise', () => {
    const base = {
      class: 'NO_COUNTERPART', title: 't',
      source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'fix', size: 'm',
    }
    expect(checkFindings([{ ...base, id: 'X-004', ours: null }], { repoRoot, sourceDir: null })).toEqual([])
    expect(
      checkFindings([{ ...base, id: 'X-005', class: 'DIVERGENCE', ours: null }], { repoRoot, sourceDir: null })
        .join('\n'),
    ).toMatch(/X-005.*requires `ours`/)
  })

  it('lets a remediated NO_COUNTERPART keep its null `ours` — but nothing else may', () => {
    // A NO_COUNTERPART finding is one where our code had NO counterpart line: the rule
    // was missing outright. Fixing it means ADDING code, so there is no historical
    // `ours` quote to freeze.
    const base = {
      title: 't', source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'fix', size: 'm',
    }
    expect(checkFindings(
      [{ ...base, id: 'X-030', class: 'NO_COUNTERPART', ours: null, remediated_by: 'bz3-1' }],
      { repoRoot, sourceDir: null },
    )).toEqual([])

    // The exemption is the CLASS's, not remediated_by's: a remediated DIVERGENCE still
    // owes the historical quote it was audited with, or the audit record is simply lost.
    expect(checkFindings(
      [{ ...base, id: 'X-031', class: 'DIVERGENCE', ours: null, remediated_by: 'bz3-1' }],
      { repoRoot, sourceDir: null },
    ).join('\n')).toMatch(/X-031.*historical citation/)

    // A remediated NO_COUNTERPART MAY instead point `ours` at the code that now
    // implements the rule. Both shapes are accepted; neither is re-opened.
    expect(checkFindings(
      [{
        ...base, id: 'X-032', class: 'NO_COUNTERPART', remediated_by: 'bz3-1',
        ours: { file: 'src/core/scoring.ts', line: 5, verbatim: 'a quote nothing will re-open' },
      }],
      { repoRoot, sourceDir: null },
    )).toEqual([])
  })

  it('a remediated NO_COUNTERPART may have `ours` null or a WELL-FORMED citation — not junk', () => {
    // Once `remediated_by` and `class: NO_COUNTERPART` are both set, an `ours` that is
    // present but malformed — no file, no line, no verbatim — must NOT sail past the
    // gate. "Null" and "anything at all" are not the same permission.
    const base = {
      title: 't', source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'fix', size: 'm',
      class: 'NO_COUNTERPART', remediated_by: 'bz3-1',
    }

    expect(checkFindings(
      [{ ...base, id: 'X-033', ours: { line: 3 } }],
      { repoRoot, sourceDir: null },
    ).join('\n'), 'a malformed `ours` was accepted').toMatch(/X-033.*ours/)

    expect(checkFindings(
      [{ ...base, id: 'X-034', ours: 'src/core/sim.ts:1' }],
      { repoRoot, sourceDir: null },
    ).join('\n'), 'a non-object `ours` was accepted').toMatch(/X-034.*ours/)

    expect(checkFindings([{ ...base, id: 'X-035', ours: null }], { repoRoot, sourceDir: null })).toEqual([])
    expect(checkFindings(
      [{
        ...base, id: 'X-036',
        ours: { file: 'src/core/scoring.ts', line: 5, verbatim: 'a quote nothing will re-open' },
      }],
      { repoRoot, sourceDir: null },
    )).toEqual([])
  })

  it('rejects duplicate ids', () => {
    const f = {
      id: 'X-006', class: 'NO_COUNTERPART', title: 't', ours: null,
      source: { file: 'BZONE.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'accept',
    }
    expect(checkFindings([f, { ...f }], { repoRoot, sourceDir: null }).join('\n')).toMatch(/duplicate id.*X-006/i)
  })

  it('every committed findings file passes', () => {
    if (!existsSync(findingsDir)) return
    const files = readdirSync(findingsDir).filter((f) => f.endsWith('.json'))
    const all = files.flatMap((f) => JSON.parse(readFileSync(join(findingsDir, f), 'utf8')))
    const errors = checkFindings(all, { repoRoot, sourceDir: sourceAvailable ? sourceDir : null })
    expect(errors).toEqual([])
  })
})

describe.skipIf(!sourceAvailable)('source-side citations', () => {
  it('every committed findings file cites real source lines', () => {
    if (!existsSync(findingsDir)) return
    const files = readdirSync(findingsDir).filter((f) => f.endsWith('.json'))
    const all = files.flatMap((f) => JSON.parse(readFileSync(join(findingsDir, f), 'utf8')))
    expect(checkFindings(all, { repoRoot, sourceDir })).toEqual([])
  })
})
