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
import { extractProseCitations } from '../audit/dossier-sweep'

export type CheckClaims = (claims: readonly Claim[], opts: { vendoredRoot: string | null }) => string[]

/** Load the citation checker, typed. Both dossier suites byte-verify through this. */
export async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as unknown as { checkClaims: CheckClaims }
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

/**
 * Blank every line inside a fenced code block (``` or ~~~, the fence lines
 * included) so fenced content is never mistaken for document structure.
 *
 * Story df1-4, closing the df1-3 round-3 LOW-latent finding: rowWindows treated
 * ANY line starting with a pipe as a markdown table row, so a fenced code sample
 * containing `| SYMBOL | ... citation |` could smuggle a fake row past the
 * row-scoped association checks the moment a dossier doc gained a code fence.
 * Lines are BLANKED, not removed, so nothing downstream ever sees a shifted
 * line — fences are content, not structure, everywhere in the dossier suites.
 */
export function stripFencedBlocks(md: string): string {
  let fence: string | null = null
  return md
    .split('\n')
    .map((l) => {
      const open = /^\s{0,3}(`{3,}|~{3,})/.exec(l)
      if (fence === null) {
        if (open) {
          fence = open[1][0] === '`' ? '`' : '~'
          return ''
        }
        return l
      }
      // Inside a fence: only a matching-character fence line closes it.
      if (open && open[1][0] === fence) fence = null
      return ''
    })
    .join('\n')
}

/**
 * ROW SCOPING (df1-3 review rounds 1-3, extracted at the second consumer for
 * df1-4's board-facts suite). Every cited dossier entry lives on a MARKDOWN
 * TABLE ROW — one physical line starting with `|` — and its window is exactly
 * that line: no prose window, no wrap slack (round 2 proved a two-line window
 * reads the next sibling row). Callers assert the returned count EXACTLY
 * against each entry's declared uniqueness census (`rows`, default 1) — scope
 * widening is the sibling-row evasion's precondition. Fenced code blocks are
 * stripped first (df1-4): a pipe-prefixed line inside a fence is not a row.
 */
export function rowWindows(md: string, symbol: RegExp): string[] {
  return stripFencedBlocks(md)
    .split('\n')
    .filter((l) => l.startsWith('|') && symbol.test(l))
}

/** Does EVERY symbol-anchored table row carry a citation covering one of `lines`?
 * (.every, not .some — df1-3 Reviewer round-4 chore: with rows > 1, one correct
 * row must not mask a wrong-but-claim-backed citation on the other.) */
export function rowCites(md: string, symbol: RegExp, from: string, file: string, lines: readonly number[]): boolean {
  return rowWindows(md, symbol).every((w) =>
    lines.some((l) => extractProseCitations(w, from).some((c) => c.file === file && c.start <= l && l <= c.end)),
  )
}

/**
 * The text of ONE open question's `## OQ-n` (or `### OQ-n`) section — heading
 * line through the line before the next OQ heading. Section-scoped for the same
 * reason brief-dossier.test.ts's answers are (df1-2 review, document-global
 * bypass): a fact that migrates to the wrong question, or a keyword planted
 * elsewhere, must not satisfy the question that has to state it. Pins the
 * heading format: open-questions.md is a numbered `## OQ-n` sequence. Fenced
 * blocks are stripped first (df1-4) — a fenced heading is not a heading.
 */
export function oqSection(md: string, n: number): string {
  const clean = stripFencedBlocks(md)
  const head = new RegExp(`^#{2,3} OQ-${n}\\b.*\\n`, 'm').exec(clean)
  if (!head) return ''
  const body = clean.slice(head.index + head[0].length)
  const next = body.search(/^#{2,3} OQ-\d/m)
  return head[0] + (next === -1 ? body : body.slice(0, next))
}

/** Citations inside one OQ section only. */
export function oqCites(md: string, n: number, file: string, lines: readonly number[], from = 'open-questions.md'): boolean {
  const section = oqSection(md, n)
  return lines.some((l) => extractProseCitations(section, from).some((c) => c.file === file && c.start <= l && l <= c.end))
}
