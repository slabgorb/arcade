// tests/audit/count-assertions.test.ts
//
// Story cp6-5 — RED phase (Han Solo / TEA). The COUNT gate.
//
// ─── THE DEFECT THIS DRIVES ─────────────────────────────────────────────────────
// The citation gate (citations.test.ts) re-opens a claim's verbatim/line PAIR
// byte-for-byte, but it cannot see the TALLIES embedded in claim prose. SND-114
// says the `52$` label "is DEFINED four more times in this revision (CENTI4.MAC:622,
// :1076, :2065 and CENIR4.MAC:388), and 20 times across the whole vendored tree;
// counted with grep -rn '^52[$]:' over reference/atari-source/centipede." Both
// numbers are correct TODAY and guarded by NOTHING — a future edit to the vendored
// source rots "four"/"20" behind a green suite. "The claim ledger cannot re-run a
// COUNT" (cp6-5). This suite makes it re-run one.
//
// ─── WHAT IS TEA-AUTHORED vs DEV-AUTHORED ───────────────────────────────────────
// TEA authors this suite AND the `CountAssertion` type on check-citations.d.mts
// (the contract). GREEN (Julia) implements the runtime in
// tools/audit/check-citations.mjs — teaching `checkClaims` to re-derive each
// `counts[]` entry against the tree — and adds the `counts` to the real SND-114 in
// docs/rom-study/claims/16-sound.json.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
//   • checkClaims currently IGNORES `counts` entirely: a wrong tally returns no
//     error (the AC-2 drift teeth below fail), and a malformed count is not a
//     schema error (the AC-1 schema teeth fail).
//   • SND-114 in the committed ledger carries no `counts` field yet (the AC-3
//     coverage teeth fail).
// GREEN turns all three. On CI (which lacks the orchestrator's reference/ tree)
// every re-derivation block SKIPS and the suite is green — exactly the byte gate's
// contract (citations.test.ts AC-3).
//
// ─── A DESIGN NOTE ON "four more times" (read before touching count #2) ──────────
// The prose asserts TWO figures. "20 across the whole tree" is a genuine
// RECIPE-count: `grep -rn '^52[$]:'` over the tree = 20, re-derivable directly.
// "four MORE times in this revision" is NOT a clean recipe-count: revision.v4
// actually holds FIVE `52$` defs (CENTI4.MAC:622,:1076,:2065,:2418 + CENIR4.MAC:388);
// the "four more" EXCLUDES the one at CENTI4.MAC:2418 that the SOUNDS routine owns.
// Guarding "CENTI4.MAC = 4" would be right-number-WRONG-SET (that 4 is 622/1076/2065/
// 2418 — it drops CENIR4.MAC:388 and keeps the SOUNDS one). So the faithful,
// drift-catching substrate for "four more" is `revision.v4 = 5`, carried with a
// note that "four more" = 5 minus the SOUNDS-owned def. See the TEA deviation in the
// session file.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Claim, CountAssertion } from '../../tools/audit/check-citations.mjs'
import { loadClaims } from './dossier-sweep'

type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

// The vendored 1981 source lives at the MONOREPO root — two levels above this
// plugin — identical resolution to citations.test.ts. Absent on CI ⇒ SKIP.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vendoredRoot =
  process.env.CENTIPEDE_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')
const vendoredAvailable = existsSync(vendoredRoot)

// Load the checker with a self-describing failure, so a RED here reads "count
// support missing", never a module-resolution stack trace.
async function loadChecker(): Promise<CheckClaims> {
  try {
    const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
    if (typeof mod.checkClaims !== 'function') throw new Error('module has no `checkClaims` export')
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built yet — GREEN (Julia) implements ' +
        'centipede/tools/audit/check-citations.mjs and adds COUNT re-derivation ' +
        `for claim.counts[]. (${(e as Error).message})`,
    )
  }
}

// A SOURCE citation that byte-verifies against the real tree, so the tree-gated
// tests below fail ONLY on the count, never on a stale verbatim. CENDEF.MAC lives
// at the tree root (citations.test.ts AC-4); we quote whatever line 2 actually is.
function realSource(): Claim['source'] {
  if (!vendoredAvailable) return { file: 'CENDEF.MAC', line: 2, verbatim: 'x' }
  const line2 = readFileSync(join(vendoredRoot, 'CENDEF.MAC'), 'utf8').split('\n')[1]
  return { file: 'CENDEF.MAC', line: 2, verbatim: line2 }
}

// Independent ground truth — walks the tree and counts matching LINES WITHOUT the
// checker, so the fixtures' 20/5 are proven, not asserted on faith. A count test
// whose expected number is itself wrong catches nothing.
function countMatchingLines(root: string, re: RegExp): number {
  let n = 0
  for (const e of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, e.name)
    if (e.isDirectory()) n += countMatchingLines(full, re)
    else for (const line of readFileSync(full, 'utf8').split('\n')) if (re.test(line)) n++
  }
  return n
}

const P = '^52[$]:' // lines that begin `52$:` — the SND-114 recipe

// ───────────────────────────────────────────────────────────────────────────────
// SCHEMA TEETH — AC-1. Run everywhere (no tree needed). A malformed count is a
// schema error even schema-only; a well-formed one is accepted and NOT re-run.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp6-5 count assertions — schema validation (schema-only, no tree)', () => {
  const base = (id: string, counts: unknown): Claim =>
    ({ id, claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' }, counts } as unknown as Claim)

  it('accepts a well-formed counts[] and does NOT re-derive it without a tree', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims([base('CT-1', [{ pattern: P, expected: 20 } satisfies CountAssertion])], {
      vendoredRoot: null,
    })
    expect(errors, 'a well-formed count is schema-valid and is not re-run when the tree is absent').toEqual([])
  })

  it('rejects a count whose `expected` is not a non-negative integer — even schema-only', async () => {
    const checkClaims = await loadChecker()
    const nonNumeric = checkClaims([base('CT-2', [{ pattern: P, expected: 'twenty' }])], { vendoredRoot: null })
    expect(nonNumeric.join('\n'), 'a non-numeric expected is a schema error naming the claim').toMatch(/CT-2/)
    expect(nonNumeric.join('\n')).toMatch(/count|expected/i)

    const negative = checkClaims([base('CT-3', [{ pattern: P, expected: -1 }])], { vendoredRoot: null })
    expect(negative.join('\n')).toMatch(/CT-3/)
    expect(negative.join('\n')).toMatch(/count|expected/i)
  })

  it('rejects a count with a missing / empty `pattern` — even schema-only', async () => {
    const checkClaims = await loadChecker()
    const noPattern = checkClaims([base('CT-4', [{ expected: 20 }])], { vendoredRoot: null })
    expect(noPattern.join('\n')).toMatch(/CT-4/)
    expect(noPattern.join('\n')).toMatch(/count|pattern/i)

    const emptyPattern = checkClaims([base('CT-5', [{ pattern: '', expected: 20 }])], { vendoredRoot: null })
    expect(emptyPattern.join('\n')).toMatch(/CT-5/)
  })

  it('ACCEPTS expected: 0 — zero is a valid tally, not a falsy blank (guards `||` vs `??`)', async () => {
    // lang-review typescript.md: `x || default` where x can be 0 is a BUG. A count
    // of zero (a pattern that legitimately matches nothing) must be schema-valid,
    // never coerced into "unset". Re-derivation of a 0 is exercised against the
    // tree below (CT-ZERO); this pins the schema half everywhere.
    const checkClaims = await loadChecker()
    const zero = checkClaims([base('CT-6', [{ pattern: '^__NO_SUCH_LABEL__:', expected: 0 }])], {
      vendoredRoot: null,
    })
    expect(zero, 'expected: 0 is a well-formed count assertion').toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// RE-DERIVATION TEETH — AC-1/AC-2. Needs the vendored tree, so SKIPPED on CI.
// This is the core RED driver: a wrong tally MUST redden.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('cp6-5 count assertions — re-derived against the vendored tree (AC-1/AC-2)', () => {
  it('ground truth: the machine really has 20 whole-tree and 5 in revision.v4 (fixtures are not lying)', () => {
    expect(countMatchingLines(vendoredRoot, new RegExp(P)), 'whole-tree 52$ defs').toBe(20)
    expect(countMatchingLines(join(vendoredRoot, 'revision.v4'), new RegExp(P)), 'revision.v4 52$ defs').toBe(5)
  })

  it('a CORRECT whole-tree count (expected 20) produces no error', async () => {
    const checkClaims = await loadChecker()
    const c: Claim = { id: 'CT-OK', claim: 'c', source: realSource(), counts: [{ pattern: P, expected: 20 }] }
    expect(checkClaims([c], { vendoredRoot }), 'the re-derived tally matches, so no error').toEqual([])
  })

  it('a WRONG whole-tree count (expected 19) reddens — the AC-2 drift teeth', async () => {
    const checkClaims = await loadChecker()
    const c: Claim = { id: 'CT-WRONG', claim: 'c', source: realSource(), counts: [{ pattern: P, expected: 19 }] }
    const errors = checkClaims([c], { vendoredRoot })
    expect(
      errors.join('\n'),
      'a mismatched tally MUST be reported — the checker ignores counts today, so this is the RED',
    ).toMatch(/CT-WRONG/)
    expect(errors.join('\n'), 'the error should surface the mismatch (expected vs actual)').toMatch(/19|20|count|expected|actual/i)
  })

  it('a SCOPED count re-derives over a subtree (revision.v4 → 5) and a wrong scoped expected reddens', async () => {
    const checkClaims = await loadChecker()
    const ok: Claim = {
      id: 'CT-SCOPE-OK',
      claim: 'c',
      source: realSource(),
      counts: [{ pattern: P, scope: 'revision.v4', expected: 5, note: 'revision.v4 total; "four more" = 5 − SOUNDS-owned CENTI4.MAC:2418' }],
    }
    expect(checkClaims([ok], { vendoredRoot }), 'revision.v4 really holds 5 defs').toEqual([])

    // The right-number-WRONG-SET trap made concrete: 4 is what CENTI4.MAC alone
    // holds, NOT what revision.v4 holds. Scoped to revision.v4, expected 4 is a
    // genuine miss and must redden.
    const wrong: Claim = {
      id: 'CT-SCOPE-BAD',
      claim: 'c',
      source: realSource(),
      counts: [{ pattern: P, scope: 'revision.v4', expected: 4 }],
    }
    expect(checkClaims([wrong], { vendoredRoot }).join('\n')).toMatch(/CT-SCOPE-BAD/)
  })

  it('re-derives a genuine ZERO (a pattern matching nothing) and accepts expected: 0', async () => {
    const checkClaims = await loadChecker()
    const c: Claim = {
      id: 'CT-ZERO',
      claim: 'c',
      source: realSource(),
      counts: [{ pattern: '^__NO_SUCH_LABEL__:', expected: 0 }],
    }
    expect(checkClaims([c], { vendoredRoot }), 'a real tally of 0 must match expected 0, not be read as "unset"').toEqual([])

    // …and a nonzero expected against that empty pattern still reddens (0 ≠ 1).
    const wrong: Claim = { ...c, id: 'CT-ZERO-BAD', counts: [{ pattern: '^__NO_SUCH_LABEL__:', expected: 1 }] }
    expect(checkClaims([wrong], { vendoredRoot }).join('\n')).toMatch(/CT-ZERO-BAD/)
  })

  it('a scope that escapes the vendored tree is refused (containment, like source.file)', async () => {
    const checkClaims = await loadChecker()
    const escape: Claim = {
      id: 'CT-ESCAPE',
      claim: 'c',
      source: realSource(),
      counts: [{ pattern: P, scope: '../../../etc', expected: 0 }],
    }
    expect(checkClaims([escape], { vendoredRoot }).join('\n'), 'a scope escaping the tree is an error, not a silent 0').toMatch(/CT-ESCAPE/)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 — the REAL SND-114 carries the count guards. Schema-side runs everywhere
// (the ledger is committed); the re-derivation side is tree-gated.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp6-5 AC-3 — the committed SND-114 carries re-derived count guards', () => {
  const snd114 = () => loadClaims().find((c) => c.id === 'SND-114') as (Claim & { counts?: CountAssertion[] }) | undefined

  it('SND-114 exists and carries a non-empty counts[] (GREEN adds it — RED until then)', () => {
    const c = snd114()
    expect(c, 'SND-114 must be in the committed ledger').toBeTruthy()
    expect(
      c?.counts?.length ?? 0,
      'SND-114 must carry count guards for its "four"/"20" prose so the tallies re-derive',
    ).toBeGreaterThanOrEqual(2)
  })

  it('SND-114 guards BOTH prose figures: whole-tree 20 and the revision.v4 substrate 5', () => {
    const expecteds = (snd114()?.counts ?? []).map((c) => c.expected)
    expect(expecteds, 'the recipe-count the prose names: "20 across the whole vendored tree"').toContain(20)
    expect(expecteds, 'the revision.v4 substrate of "four more" (5 defs; four besides the SOUNDS-owned one)').toContain(5)
  })

  it.skipIf(!vendoredAvailable)("SND-114's counts re-derive cleanly against the vendored tree", async () => {
    const checkClaims = await loadChecker()
    const c = snd114()
    expect(c).toBeTruthy()
    expect(checkClaims([c as Claim], { vendoredRoot }), 'SND-114 count guards must match the machine exactly').toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-5 — the mechanism GENERALIZES: every claim's counts are checked independently.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('cp6-5 AC-5 — the count mechanism generalizes across claims', () => {
  it('checks each claim independently — one right, one wrong → exactly the wrong one reddens', async () => {
    const checkClaims = await loadChecker()
    const good: Claim = { id: 'GEN-OK', claim: 'c', source: realSource(), counts: [{ pattern: P, expected: 20 }] }
    const bad: Claim = { id: 'GEN-BAD', claim: 'c', source: realSource(), counts: [{ pattern: P, expected: 999 }] }
    const errors = checkClaims([good, bad], { vendoredRoot })
    expect(errors.join('\n'), 'the wrong tally reddens').toMatch(/GEN-BAD/)
    expect(errors.join('\n'), 'the correct tally does NOT redden').not.toMatch(/GEN-OK/)
  })
})
