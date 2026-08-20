// tests/audit/pt1-9.citations.test.ts
//
// Story pt1-9, AC3 — the SC-011 remediation is RECORDED, and `npm test -- citations`
// stays green through it.
//
// SC-011 (docs/audit/findings/pair-6-alscor-scoring.json, class STRUCTURAL) reads:
// "Start-level chooser: ROM shows a scrolling 5-wide window of candidate levels,
// ours shows one." Its `recommendation: accept` reasons that a discrete-step
// chooser is a reasonable simplification PROVIDED it still conveys "current level,
// its bonus, its hole." Our drawSelect() drew only the level NUMBER — below that
// bar. pt1-9 brings the chooser UP to the accepted equivalence by drawing the
// selected level's well outline (the hole) and its bonus value — WITHOUT adopting
// the 5-wide analog-spinner scroll (the recommendation to accept the single-value
// collapse stands). That closes the gap SC-011 + the 2026-08-19 playtest named, so
// SC-011 is stamped `remediated_by: "pt1-9"`.
//
// Per plugins/tempest/CLAUDE.md's citation-gate rules the checker then FREEZES the
// historical `ours` quote and stops re-opening it against the working tree, keeping
// the main gate green as drawSelect grows.
//
// RED now: SC-011.remediated_by is null. Green once Dev lands the preview + bonus
// AND records the remediation.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const findingsDir = join(repoRoot, 'docs', 'audit', 'findings')

interface Finding {
  id: string
  class?: string
  remediated_by?: string
  source?: { verbatim?: string } | null
  ours?: { verbatim?: string } | null
}

const allFindings: Finding[] = existsSync(findingsDir)
  ? readdirSync(findingsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => JSON.parse(readFileSync(join(findingsDir, f), 'utf8')) as Finding[])
  : []

const byId = (id: string): Finding | undefined => allFindings.find((f) => f.id === id)

describe('pt1-9 — SC-011 is remediated so the citation gate survives the select-screen change (AC3)', () => {
  it('SC-011 exists and is the STRUCTURAL start-level-chooser finding (premise anchor)', () => {
    const f = byId('SC-011')
    expect(f, 'finding SC-011 not found in docs/audit/findings/').toBeDefined()
    expect(f?.class).toBe('STRUCTURAL')
    // The exact ROM line the finding cites — XPOTAB's 5 screen X-offsets. If this
    // drifts, the finding we are claiming to remediate has moved out from under us.
    expect(f?.source?.verbatim).toBe('XPOTAB:\t.BYTE 0BE,0E3,09,30,58')
  })

  it('SC-011 is marked remediated_by pt1-9 once the preview + bonus land', () => {
    expect(byId('SC-011')?.remediated_by, 'SC-011 must be remediated_by pt1-9').toBe('pt1-9')
  })

  it('the remediated finding keeps its historical `ours` quote (frozen, not nulled)', () => {
    // Nulling `ours` loses the audit record of what our code said when audited.
    // Remediation freezes it as history; guard against a lazy null-out.
    const f = byId('SC-011')
    expect(f?.ours, 'SC-011 must retain its historical `ours` citation').toBeTruthy()
    expect(f?.ours?.verbatim, 'the historical `ours` quote must be preserved').toBeTruthy()
  })
})
