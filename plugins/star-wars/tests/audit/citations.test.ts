import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkFindings } from '../../tools/audit/check-citations.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const findingsDir = join(repoRoot, 'docs', 'audit', 'findings')
const sourceDir = process.env.STARWARS_SOURCE_DIR ?? '/Users/slabgorb/Projects/star-wars-1983-source-text'
const sourceAvailable = existsSync(sourceDir)

// td1-13 — the checker now re-opens `ours` against the AUDIT COMMIT, not the working tree.
// A well-formed `ours` fixture therefore has to quote a line as it stood at 3580752, not a line
// read live off disk. `auditLine` reads exactly what the checker's own `AUDIT_COMMIT` read sees;
// a line that existed at the audit resolves fine. (Mirrors tempest's tp1-22 citations.test.ts.)
const AUDIT_COMMIT = '3580752'
const auditLine = (file: string, n: number): string =>
  execFileSync('git', ['show', `${AUDIT_COMMIT}:${file}`], { cwd: repoRoot, encoding: 'utf8' }).split('\n')[n - 1]

describe('checkFindings', () => {
  it('rejects a citation to a module that never shipped', () => {
    // SWVOC2 is the decoy vocabulary file: SWVOC3 is the one on SNDAUX.LNK, and
    // SWVOC2 sits right beside it in the tree looking equally plausible.
    const errors = checkFindings(
      [{
        id: 'X-001', class: 'DIVERGENCE', title: 't',
        source: { file: 'SWVOC2.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/gameRules.ts', line: 1, verbatim: 'x' },
        claim: 'c', reasoning: 'r', recommendation: 'accept',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/SWVOC2\.MAC.*never shipped/)
  })

  it('accepts a citation to a module that shipped only via .INCLUDE (WSVGAN)', () => {
    // WSVROM.MAC:1235 `.INCLUDE WSVGAN` — the glyph table shipped without ever
    // appearing on a link line. The decoy VGAN (no WS prefix) never did.
    const errors = checkFindings(
      [{
        id: 'X-007', class: 'NO_COUNTERPART', title: 't', ours: null,
        source: { file: 'WSVGAN.MAC', line: 1, verbatim: 'anything' },
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
        source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/gameRules.ts', line: 20, verbatim: 'export const FOV_Y = 999' },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/X-002.*does not match/)
  })

  it('accepts a finding whose `ours` verbatim matches the real line', () => {
    const line = auditLine('src/core/gameRules.ts', 20) // as it stood at the audit commit
    const errors = checkFindings(
      [{
        id: 'X-003', class: 'DIVERGENCE', title: 't',
        source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/gameRules.ts', line: 20, verbatim: line },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors).toEqual([])
  })

  // Ported from tempest tp1-3. An `ours` citation into node_modules is the BUILT
  // output of an installed dependency: its dist/ is gitignored and regenerated on
  // every install, so its line numbers move under the audit each time the dependency
  // is re-pinned or rebuilt. A citation the checker cannot trust is worthless — the
  // whole point of the ours-side check is that a cited line can be re-opened and
  // byte-compared. So the category error is made impossible: `ours` means OUR
  // source — a tracked file in this repo — and a dependency's build output is
  // rejected on sight.
  //
  // REWRITTEN at the monorepo migration (NOT weakened). The original fixture read
  // `node_modules/@arcade/shared/dist/highscore.js` off disk so its `verbatim` was
  // byte-exact, because a naive fixture (stale quote, "expect an error") is vacuous:
  // the checker's verbatim complaint contains the string "node_modules" merely
  // because the path is in it, so such a test passes whether or not the PATH rule
  // exists. star-wars no longer has a node_modules of its own — the shared library is
  // in-repo at src/shared — so that read is ENOENT. The anti-vacuity property is
  // preserved without the file: assert the error is the path rule's OWN message, and
  // assert it is NOT the verbatim/does-not-exist complaint either rival branch would
  // emit. That is strictly stronger than matching /node_modules/.
  it('rejects an `ours` citation into node_modules — a rebuilt artifact is not our source', () => {
    const nmFile = 'node_modules/some-dep/dist/highscore.js'
    const errors = checkFindings(
      [{
        id: 'X-020', class: 'DIVERGENCE', title: 't',
        source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
        ours: { file: nmFile, line: 46, verbatim: 'whatever this line happens to say today' },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    const joined = errors.join('\n')

    expect(joined, 'a citation into node_modules must be rejected').toMatch(/X-020/)
    // The PATH rule's own words — not just the substring "node_modules", which the
    // verbatim and does-not-exist complaints would also carry (they quote the path).
    expect(joined, 'the rejection must come from the node_modules PATH rule')
      .toMatch(/is inside node_modules .*not our source/s)
    expect(joined, 'the path rule must fire BEFORE any verbatim comparison')
      .not.toMatch(/does not match verbatim|does not exist/)
  })

  it('still accepts an `ours` citation to a tracked file in our own tree', () => {
    // Guard the guard: the node_modules rule must not become a blanket ban on
    // ours-side citations. A stable, tracked anchor in our own core, quoted as it stood at
    // the audit commit (src/core/gameRules.ts existed at 3580752), must still be accepted.
    const line = auditLine('src/core/gameRules.ts', 20) // as it stood at the audit commit
    const errors = checkFindings(
      [{
        id: 'X-021', class: 'DIVERGENCE', title: 't',
        source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
        ours: { file: 'src/core/gameRules.ts', line: 20, verbatim: line },
        claim: 'c', reasoning: 'r', recommendation: 'fix', size: 's',
      }],
      { repoRoot, sourceDir: null },
    )
    expect(errors).toEqual([])
  })

  it('requires `ours` to be null for NO_COUNTERPART and present otherwise', () => {
    const base = {
      class: 'NO_COUNTERPART', title: 't',
      source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
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
    // `ours` quote to freeze, and demanding one would make a fix story invent a
    // citation for a line that never diverged.
    const base = {
      title: 't', source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'fix', size: 'm',
    }
    expect(checkFindings(
      [{ ...base, id: 'X-030', class: 'NO_COUNTERPART', ours: null, remediated_by: 'sw1-5' }],
      { repoRoot, sourceDir: null },
    )).toEqual([])

    // The exemption is the CLASS's, not remediated_by's: a remediated DIVERGENCE still
    // owes the historical quote it was audited with, or the audit record is simply lost.
    expect(checkFindings(
      [{ ...base, id: 'X-031', class: 'DIVERGENCE', ours: null, remediated_by: 'sw1-5' }],
      { repoRoot, sourceDir: null },
    ).join('\n')).toMatch(/X-031.*historical citation/)

    // A remediated NO_COUNTERPART MAY instead point `ours` at the code that now
    // implements the rule — a record of the same fix. Both shapes are accepted, and
    // neither is re-opened against the working tree.
    expect(checkFindings(
      [{
        ...base, id: 'X-032', class: 'NO_COUNTERPART', remediated_by: 'sw1-5',
        ours: { file: 'src/core/gameRules.ts', line: 20, verbatim: 'a quote nothing will re-open' },
      }],
      { repoRoot, sourceDir: null },
    )).toEqual([])
  })

  it('a remediated NO_COUNTERPART may have `ours` null or a WELL-FORMED citation — not junk', () => {
    // Widening to allow the null case must not buy it at the cost of validating
    // NOTHING: once `remediated_by` and `class: NO_COUNTERPART` are both set, an `ours`
    // that is present but malformed — no file, no line, no verbatim — must NOT sail past
    // a gate whose entire job is to refuse citations that cannot be re-opened. "Null"
    // and "anything at all" are not the same permission.
    const base = {
      title: 't', source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
      claim: 'c', reasoning: 'r', recommendation: 'fix', size: 'm',
      class: 'NO_COUNTERPART', remediated_by: 'sw1-5',
    }

    // Present but shapeless: no `file` to open, no `line` to find, no quote to compare.
    expect(checkFindings(
      [{ ...base, id: 'X-033', ours: { line: 3 } }],
      { repoRoot, sourceDir: null },
    ).join('\n'), 'a malformed `ours` was accepted').toMatch(/X-033.*ours/)

    // Not even an object.
    expect(checkFindings(
      [{ ...base, id: 'X-034', ours: 'src/core/sim.ts:1' }],
      { repoRoot, sourceDir: null },
    ).join('\n'), 'a non-object `ours` was accepted').toMatch(/X-034.*ours/)

    // The two legitimate shapes still pass — this must not become "reject everything".
    expect(checkFindings([{ ...base, id: 'X-035', ours: null }], { repoRoot, sourceDir: null })).toEqual([])
    expect(checkFindings(
      [{
        ...base, id: 'X-036',
        ours: { file: 'src/core/gameRules.ts', line: 20, verbatim: 'a quote nothing will re-open' },
      }],
      { repoRoot, sourceDir: null },
    )).toEqual([])
  })

  it('rejects duplicate ids', () => {
    const f = {
      id: 'X-006', class: 'NO_COUNTERPART', title: 't', ours: null,
      source: { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
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
