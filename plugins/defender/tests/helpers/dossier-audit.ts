// tests/helpers/dossier-audit.ts
//
// Story df1-3 (rework round 1) — the dossier-audit helpers that grew a second
// byte-identical copy when glossary-subsystems-oq.test.ts arrived beside
// brief-dossier.test.ts (lang-review #18: one concept must not grow two helpers;
// the review's diff of the two copies showed 0 differing lines). Extracted here
// at the second consumer, exactly where the rule says to extract. dossier-sweep.ts
// stays the citation-sweep module; this file holds the vitest-facing apparatus.
// citations.test.ts keeps its OWN loadChecker on purpose — that one is a distinct
// concept (a RED-phase wrapper turning a missing module into a self-describing
// "not built yet" failure), deliberately not unified with this plain loader.

import { expect } from 'vitest'
import type { Claim } from '../../tools/audit/check-citations.mjs'

export type CheckClaims = (claims: readonly Claim[], opts: { vendoredRoot: string | null }) => string[]

/** Load the citation checker, typed. Both dossier suites byte-verify through this. */
export async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
  return mod.checkClaims
}

/**
 * lang-review #15: a universally-quantified sweep whose every iteration can
 * `continue` (or that runs over an empty list) asserts nothing and passes by
 * default. Every data-driven loop in the dossier suites first states the
 * population it must have visited.
 */
export function expectPopulated(n: number, floor: number, what: string): void {
  expect(
    n,
    `${what}: swept ${n} (floor ${floor}) — below that this passes without checking anything, ` +
      'the shape of a green gate that measures itself',
  ).toBeGreaterThanOrEqual(floor)
}
