// citation-guard: ignore-file — this suite discusses citations in prose (`WSMAIN.MAC:1`,
// `git show 3580752:<file>`, the tempest reference path) as fixtures and documentation, not as
// live audit citations. Same convention as the other tests/audit/*.test.ts files (sw8-18,
// sw8-23, sw8-24, sw8-27) — without the pragma the tree-wide comment-citation sweep (sw8-24)
// reports this file's own prose and can never be green.
// td1-13 — THE CITATION GATE: freeze the audit's `ours` side to the audit commit.
//
// RED-phase tests (Leeloo / TEA). These pin the NEW behavior the story asks Dev to build:
// the star-wars citation checker must read each finding's `ours` side from the AUDIT COMMIT
// (`git show 3580752:<file>`) rather than from the working tree, so that a later fix story
// which legitimately changes a cited line no longer reddens the gate. This is a direct port
// of tempest's tp1-22 freeze (plugins/tempest/tests/audit/citation-gate-freeze.test.ts) —
// port the SHAPE, do not re-derive it. The ROM `source` side must STILL be byte-checked live
// against the 1983 Atari source — that is where the audit's authority lives and must not
// regress.
//
// This file is deliberately NOT named `*citations*` so `… --project star-wars citations`
// keeps running only the live gate. Run these with `… --project star-wars freeze`.
//
// PREREQUISITE (td1-13 step zero, DONE): the audit baseline is
// `358075282db3f7b2116ed5016ff61e99cf9f2acd` — the commit that RECORDED the findings
// (`chore(audit): land primary-source fidelity rig — 173 findings`, star-wars #90), the exact
// analog of tempest's 4232ed4. It is not on any branch of this monorepo (star-wars was
// squashed on import), so it is reachable only via the `audit/star-wars` tag pushed to origin.
// CI's `fetch-depth: 0` keeps that blob reachable, exactly as it does for `audit/tempest`.
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

// The audit baseline (star-wars #90, `chore(audit): land primary-source fidelity rig`). Every
// finding's `ours.verbatim` is the defect text as it stood HERE. td1-13 freezes the gate's
// `ours` read to this commit. This constant MUST match the one the checker adopts; if Dev
// pins a different SHA, update it here too (and flag it — see the Delivery Findings note).
const AUDIT_COMMIT = '3580752'

const trimEnd = (s: unknown) => String(s ?? '').replace(/\s+$/, '')

/** `<file>` as it stood at the audit commit, line-split. Throws if git cannot resolve it. */
function auditLines(file: string): string[] {
  return execFileSync('git', ['show', `${AUDIT_COMMIT}:${file}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).split('\n')
}

/** Working-tree copy of a tracked file, line-split. */
function workingLines(file: string): string[] {
  return readFileSync(join(repoRoot, file), 'utf8').split('\n')
}

/**
 * Find a tracked line that genuinely CHANGED between the audit commit and the working tree.
 * A citation built on such a line is the only honest way to distinguish "read `ours` from the
 * frozen commit" from "read it live from the working tree": the two answers differ.
 * `src/core/sim.ts` churned heavily since the audit (uf1-12 alone inserted five lines), so a
 * differing line is guaranteed; if the search ever fails, the fixture is invalid and the test
 * says so out loud rather than passing vacuously.
 */
function pickChangedLine(file = 'src/core/sim.ts') {
  const wt = workingLines(file)
  const audit = auditLines(file)
  const n = Math.min(wt.length, audit.length)
  for (let i = 0; i < n; i++) {
    if (trimEnd(audit[i]).length > 0 && trimEnd(audit[i]) !== trimEnd(wt[i])) {
      return { file, line: i + 1, auditText: audit[i], workingText: wt[i] }
    }
  }
  throw new Error(`fixture invalid: no changed line found in ${file} between ${AUDIT_COMMIT} and the working tree`)
}

/**
 * A minimal, valid finding wrapped around a given `ours`. The `source` defaults to a real
 * linked module (`WSMAIN.MAC`) so the source side is well-formed; its bytes are only compared
 * when a `sourceDir` is passed to `checkFindings`.
 */
function finding(
  id: string,
  ours: unknown,
  source: unknown = { file: 'WSMAIN.MAC', line: 1, verbatim: 'anything' },
) {
  return {
    id,
    class: 'DIVERGENCE',
    title: 't',
    source,
    ours,
    claim: 'c',
    reasoning: 'r',
    recommendation: 'accept',
  }
}

// ---------------------------------------------------------------------------------------
// AC-1 — THE HEADLINE. The gate must survive a simulated code fix.
// ---------------------------------------------------------------------------------------
describe('td1-13 AC-1 — the citation gate survives a simulated code fix', () => {
  it('GREEN: an `ours` line changed in the working tree does NOT redden — `ours` reads from the frozen audit commit', () => {
    const { file, line, auditText, workingText } = pickChangedLine()

    // The fixture only means something if the two trees really differ at this line.
    expect(trimEnd(auditText), 'fixture invalid: audit and working-tree lines are identical').not.toBe(
      trimEnd(workingText),
    )

    // `ours.verbatim` is the AUDIT-COMMIT text; the working tree at the same line was
    // "fixed" (it differs). A checker that reads `ours` from the frozen commit sees the quote
    // present and stays green. Today's checker reads the working tree, mismatches, and reddens
    // — so this assertion FAILS against the current tooling. That is the RED we are pinning.
    const frozen = checkFindings([finding('AC1-FROZEN', { file, line, verbatim: auditText })], {
      repoRoot,
      sourceDir: null,
    })
    expect(
      frozen,
      `\`ours\` must be read from ${AUDIT_COMMIT}, not the working tree (working line is now ${JSON.stringify(workingText)})`,
    ).toEqual([])

    // Non-gameable second half: with the SAME frozen `ours`, a mismatched ROM source line
    // must STILL redden — proving the checker did not simply start ignoring everything, and
    // that the source side stays live. (Runs only where the LF Atari source is present.)
    if (sourceAvailable) {
      const bothSides = checkFindings(
        [
          finding('AC1-BOTH', { file, line, verbatim: auditText }, {
            file: 'WSMAIN.MAC',
            line: 1,
            verbatim: 'DELIBERATELY WRONG — not the ROM line at WSMAIN.MAC:1',
          }),
        ],
        { repoRoot, sourceDir },
      )
      expect(bothSides.join('\n'), 'the ROM source side must stay live under the freeze').toMatch(
        /AC1-BOTH[\s\S]*source[\s\S]*does not match/,
      )
    }
  })

  it('ANTI-VACUOUS: a frozen `ours` quote that matches NEITHER tree still reddens', () => {
    // Guards against a checker that "passes everything": the frozen `ours` is still
    // byte-compared, so a quote present in no version of the file is an error. A trivial
    // implementation that skips the `ours` check entirely would wrongly pass here.
    const { file, line } = pickChangedLine()
    const errors = checkFindings(
      [finding('AC1-GHOST', { file, line, verbatim: 'zzz — this quote exists in no version of this file — zzz' })],
      { repoRoot, sourceDir: null },
    )
    expect(errors.join('\n')).toMatch(/AC1-GHOST[\s\S]*(does not match|absent)/)
  })

  it.skipIf(!sourceAvailable)(
    'SOURCE STAYS LIVE: a mismatched ROM source line reddens even when `ours` is fine',
    () => {
      // The other half of AC-1, on its own so it is confirmed independently: freezing `ours`
      // must not freeze `source`. A trivial "freeze both sides" implementation fails here.
      const { file, line, auditText } = pickChangedLine()
      const errors = checkFindings(
        [
          finding('AC1-SRC', { file, line, verbatim: auditText }, {
            file: 'WSMAIN.MAC',
            line: 1,
            verbatim: 'NOT THE ROM LINE',
          }),
        ],
        { repoRoot, sourceDir },
      )
      expect(errors.join('\n')).toMatch(/AC1-SRC[\s\S]*source[\s\S]*does not match/)
    },
  )
})

// ---------------------------------------------------------------------------------------
// AC-2 — THE RECONCILIATION. Every `ours` pin must resolve at the audit commit (or be
// carried by `remediated_by`). The findings were re-anchored to HEAD over 46 later commits,
// so a subset no longer resolves at the baseline and must be re-baselined to the audited text.
// This test drives that work directly, independent of the checker's internal change: it does
// the frozen text-search itself (`git show 3580752:<file>`, mirroring tempest's freeze
// checker), so it is RED the moment any non-remediated `ours` quote is absent from the audit
// commit — exactly the LOST-pin reconciliation the story calls "the bulk of the work".
// ---------------------------------------------------------------------------------------
describe('td1-13 AC-2 — every `ours` pin resolves at the audit commit', () => {
  it('all committed non-remediated `ours` quotes are present in their file at the audit commit', () => {
    if (!existsSync(findingsDir)) throw new Error('findings dir missing — fixture invalid')
    const files = readdirSync(findingsDir).filter((f) => f.endsWith('.json'))
    const all = files.flatMap((f) => JSON.parse(readFileSync(join(findingsDir, f), 'utf8')))

    // Cache each frozen file's line set once.
    const frozenCache = new Map<string, Set<string> | null>()
    const frozenSet = (file: string): Set<string> | null => {
      if (!frozenCache.has(file)) {
        try {
          const text = execFileSync('git', ['show', `${AUDIT_COMMIT}:${file}`], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          })
          frozenCache.set(file, new Set(text.split('\n').map((l) => trimEnd(l))))
        } catch {
          frozenCache.set(file, null) // path absent from the audit commit
        }
      }
      return frozenCache.get(file) ?? null
    }

    const unresolved: string[] = []
    for (const f of all) {
      if (f.remediated_by) continue // frozen history — not re-opened, by design
      const o = f.ours
      if (!o || typeof o !== 'object' || typeof o.file !== 'string') continue
      if (/\.MAC$/i.test(o.file)) continue // source side, checked elsewhere
      if (typeof o.verbatim !== 'string') continue
      const set = frozenSet(o.file)
      if (set === null) {
        unresolved.push(`${f.id}: ${o.file} absent from ${AUDIT_COMMIT}`)
      } else if (!set.has(trimEnd(o.verbatim))) {
        unresolved.push(`${f.id}: ${o.file} quote absent at ${AUDIT_COMMIT}`)
      }
    }

    expect(
      unresolved,
      `these \`ours\` quotes were re-anchored to HEAD and no longer resolve at ${AUDIT_COMMIT}; ` +
        `re-baseline each to the audited text, or mark it remediated_by:\n${unresolved.join('\n')}`,
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------
// AC-4-adjacent guards — a remediated finding and an unresolvable path are handled cleanly.
// (Ported from tempest tp1-22 AC-4. These are non-gameable guards, green before and after.)
// ---------------------------------------------------------------------------------------
describe('td1-13 — remediated and unresolvable citations are handled cleanly under the freeze', () => {
  it('a remediated finding keeps its frozen `ours` — the checker must not re-open it against any tree', () => {
    // A remediated finding's `ours` is HISTORY: its quote matches neither the audit commit nor
    // the working tree at that line, and it must be left alone (not re-read). A naive freeze
    // that byte-reads EVERY `ours` from the audit commit would wrongly redden it.
    const { file, line } = pickChangedLine()
    const remediated = {
      ...finding('AC4-REMEDIATED', {
        file,
        line,
        verbatim: 'a frozen historical quote nothing will re-open — present in no tree',
      }),
      remediated_by: 'sw-earlier',
    }
    const errors = checkFindings([remediated], { repoRoot, sourceDir: null })
    expect(errors, 'a remediated finding must stay green under the freeze').toEqual([])
  })

  it('an unresolvable frozen `ours` yields a clear returned error, never a raw git/exception hard-error', () => {
    // AC-4's real hazard: reading `ours` from the audit commit means `git show 3580752:<file>`,
    // which THROWS for a path absent from that commit. That must surface as a clear checker
    // error string (the same shape a missing-file working-tree read gives today), not an
    // uncaught exception that takes the whole gate down with a confusing git message.
    const bogus = finding('AC4-ABSENT', {
      file: 'src/core/__file_absent_from_audit_commit__.ts',
      line: 1,
      verbatim: 'x',
    })
    let errors: string[] = []
    expect(
      () => {
        errors = checkFindings([bogus], { repoRoot, sourceDir: null })
      },
      'the checker must not throw when a frozen `ours` cannot be resolved',
    ).not.toThrow()
    expect(errors.join('\n')).toMatch(/AC4-ABSENT/)
  })
})
