---
story_id: "cp6-6"
jira_key: "cp6-6"
epic: "cp6"
workflow: "trivial"
---
# Story cp6-6: two loose pins in centipede's audit suite: a citation floor of 20 against a population of 86, and bake-sfx.test.mjs's stale ':25-28' span for the @shared/audio import

## Story Details
- **ID:** cp6-6
- **Jira Key:** cp6-6
- **Workflow:** trivial
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-05T17:31:56Z
**Round-Trip Count:** 1

<!-- Phase repair (Reviewer, 2026-08-05T17:22:52Z): review returned REJECTED (green
rework). complete-phase treated an invalid 'green' target — trivial's Dev phase is
'implement', not 'green' — as the default forward step and overshot to 'finish'
(the forward-only landmine). Rewound to 'implement' so Dev fixes bake-sfx.test.mjs:198.
Round-Trip Count already reflects the bounce. -->

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T14:29:38Z | 2026-08-05T14:31:07Z | 1m 29s |
| implement | 2026-08-05T14:31:07Z | 2026-08-05T17:15:48Z | 2h 44m |
| review | 2026-08-05T17:15:48Z | 2026-08-05T17:21:12Z | 5m 24s |
| finish (reverted — rework misroute) | 2026-08-05T17:21:12Z | 2026-08-05T17:22:52Z | 1m 40s |
| implement | 2026-08-05T17:22:52Z | 2026-08-05T17:29:28Z | 6m 36s |
| review | 2026-08-05T17:29:28Z | 2026-08-05T17:31:56Z | 2m 28s |
| finish | 2026-08-05T17:31:56Z | - | - |

## Delivery Findings

Two independent audit suite maintenance tasks found and ready to implement:

1. **Citation floor is far too low** (Non-blocking, Improvement)
   - Location: `plugins/centipede/tests/audit/citations.test.ts:434`
   - Current: `.toBeGreaterThan(20)` — floor against entire dossier population
   - Issue: The sweep extracts ~86 total citations from brief.md, glossary.md, and sound.md, but the floor only asserts that more than 20 are found. This floor is so low that silencing most of the dossier would still pass green
   - Impact: A dossier rewrite could rot most citations unwatched behind a green gate
   - Fix: Tighten the floor to a realistic minimum that would catch if a whole file's citations go unwatched

2. **Stale line-span citation in test** (Non-blocking, Maintenance)
   - Location: `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:61`
   - Current: `:25-28` pointing to the `@shared/audio` import in error message prose
   - Actual span: Lines 28-31 in `plugins/centipede/src/shell/audio.ts`
   - Issue: The citation in the test error message no longer matches the actual source location after code edits
   - Fix: Update the citation span to `:28-31` to match the current import location

## Design Deviations

None — the fixes are straightforward maintenance updates to audit/test suite assertions and citations.

### Reviewer (audit)
- No design deviations were logged and none were introduced. The one confirmed defect is an
  incomplete-scope Gap (a second occurrence of the very span the story fixed), not a deviation
  from the intended design. Captured under Delivery Findings.

### Reviewer (code review)
- **Gap** (blocking): the story's stated goal — eliminate `bake-sfx.test.mjs`'s stale `:25-28`
  span for the `@shared/audio` import — is only half done. Line 61 was corrected to `:28-31`
  but an identical stale `:25-28` at line 198 (a comment describing the same import) was left
  untouched, so the file now cites two different spans for one import. Affects
  `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:198` (change `:25-28` → `:28-31`).
  *Found by Reviewer during code review; independently confirmed by reviewer-comment-analyzer
  and reviewer-rule-checker.*

## Technical Approach

**Fix 1: Tighten citation floor**
- Research the exact citation counts per dossier file to determine a realistic minimum
- Current breakdown: brief.md (~32 citations) + glossary.md (~24 citations) + sound.md (cp6-1's POKEY doc, enrolled but exact count TBD from running the sweep)
- The floor must be per-file (each file must clear the floor on its own) OR set high enough that losing a whole file's citations would redden
- Update line 434 in `citations.test.ts` from `.toBeGreaterThan(20)` to a tighter assertion

**Fix 2: Update stale citation span**
- Update line 61 in `bake-sfx.test.mjs` from `:25-28` to `:28-31`
- The error message prose currently reads: `"audio.ts imports @shared/audio at :25-28 and the justfile's 'node' cannot resolve that alias."`
- After update: `"audio.ts imports @shared/audio at :28-31 and the justfile's 'node' cannot resolve that alias."`

## Acceptance Criteria

1. The citation floor in `citations.test.ts:434` is tightened to a realistic value that would catch if a whole dossier file's citations go unwatched (research the actual citation counts to set this)
2. The bake-sfx.test.mjs error message citation is corrected from `:25-28` to `:28-31` to match the actual import lines in audio.ts
3. All tests pass: `npm test -- --project centipede` runs green
4. The changes are straightforward single-line edits with no refactoring

## Dev Assessment

Both fixes implemented and verified GREEN.

**Re-derived population (against the vendored tree, via the test's own `allProseCitations()`):**
total = **175** — brief.md 32, glossary.md 25, sound.md 118. The story's "86" and the
comment's "glossary 24" were both stale (sound.md grew to 118 under cp6-1).

**Fix 1 — `plugins/centipede/tests/audit/citations.test.ts:434`**
- Floor `.toBeGreaterThan(20)` → `.toBeGreaterThan(100)`.
- Rationale: 20 against 175 was two-thirds vacuous — sound.md's whole 118 could vanish
  and still clear 20. 100 has real teeth: losing sound.md drops the total to 57 and
  reddens. The two smaller files (32, 25) are individually guarded by the per-file floor
  at :437, which already reddens on any file → 0, so the aggregate need only catch the
  largest-file collapse. Mirrors joust's `>100` "sweep has teeth" convention.
- Also reconciled the stale prose in the same block (glossary 24→25; added the
  32/25/118 breakdown and the 175 total to the comment).

**Fix 2 — `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:61`**
- Error-message citation `:25-28` → `:28-31` for the `@shared/audio` import. Verified in
  `audio.ts`: `import {` on line 28, `} from '@shared/audio'` on line 31.

**Verification:**
- `npx vitest run --project centipede` → 70 files / 1270 tests pass.
- `bake-sfx.test.mjs` runs under vitest (imports vitest `beforeAll`) → 30 tests pass.
- `npm run lint` (tsc --noEmit) clean.

## Dev Assessment (rework round 1)

Addressed the Reviewer's single confirmed finding.

**Fix — `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:198`**
- Comment span `:25-28` → `:28-31`, matching the identical fix at line 61 and the real
  `@shared/audio` import at `audio.ts:28-31`. The first round missed this second occurrence
  of the same span in the same file.

**Verification:**
- `grep -rn "25-28\|@shared/audio at :" plugins/centipede/` → both occurrences (:61, :198)
  now read `:28-31`; no stale `:25-28` remains anywhere.
- `npx vitest run --project centipede` → 70 files / 1270 tests pass.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 1270 pass, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (line-198 stale span) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — test/audit files only, no attack surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (line-198, rule #2 span-accuracy) |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (round 2, after rework)

**Round 1 finding — RESOLVED.** The blocking Gap below was fixed in the rework: Dev changed
`bake-sfx.test.mjs:198` from `:25-28` to `:28-31`. Re-verified: `grep` across
`plugins/centipede/` shows both occurrences (lines 61 and 198) now read `:28-31` and **no
stale `:25-28` remains anywhere**; the real `@shared/audio` import still spans
`audio.ts:28-31`. Suite re-run green (70 files / 1270 tests), lint clean. The file is now
internally consistent and the story's second deliverable is complete.

| Severity | Issue (round 1) | Location | Status |
|----------|-------|----------|--------------|
| [MEDIUM] (blocking-for-scope) | Second occurrence of the stale span left untouched; file cited two different spans for the same `@shared/audio` import | `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:198` | ✓ FIXED in rework (`:25-28` → `:28-31`) |

**Data flow / wiring:** N/A — the two edits are a numeric vitest assertion bound and
explanatory prose (an `Error` string that no longer throws now `audio-manifest.ts` exists,
and a comment). No runtime code, control flow, or wiring touched.

**Independently verified facts (I re-derived, not trusted):**
- [VERIFIED] Citation population — evidence: ran the test's own `allProseCitations()`/`extractProseCitations()` from `plugins/centipede/tests/audit/dossier-sweep.ts`: total **175**, brief.md 32, glossary.md 25, sound.md 118. The comment at `citations.test.ts:434-438` states exactly these; corroborated by [DOC] and [RULE].
- [VERIFIED] New floor `>100` is non-vacuous — evidence: losing sound.md (118) drops the total to 57 < 100 → reddens; the per-file floor at `citations.test.ts:437` independently guards brief.md (32) and glossary.md (25) via the `n === 0` starved-filter, so the aggregate need only catch the largest-file collapse. Choice mirrors joust's `>100` (`plugins/joust/tests/audit/citations.test.ts:660`). Confirmed by [RULE] rule #1.
- [VERIFIED] `@shared/audio` import span — evidence: `plugins/centipede/src/shell/audio.ts` — `import {` at line 28, `} from '@shared/audio'` at line 31. So `:28-31` (line 61) is correct and `:25-28` (line 198) is wrong by 3 lines. Confirmed by [DOC] and [RULE].
- [VERIFIED] Stale-sibling reconciliation in citations.test.ts — evidence: the sibling comment's glossary count was corrected 24→25 and "clear 20" reworded to "clear the aggregate floor" so it won't re-stale on the next bump. Good practice. Confirmed by [RULE] rule #3.
- [VERIFIED] Scope discipline — evidence: both hunks touch only a numeric assertion literal and comment/string prose; no logic, imports, or signatures. Trivial-chore compliant.

**Dispatch tags:** [EDGE] n/a — disabled, no branching logic in a comment/assertion diff. [SILENT] n/a — disabled, no error handling changed. [TEST] n/a — disabled; preflight (round 1) and my round-2 re-run confirm the suite green and the tightened assertion has margin. [DOC] confirmed round 1 (`bake-sfx.test.mjs:198` stale span) → now RESOLVED in rework; both spans read `:28-31`. [TYPE] n/a — disabled, no type surface touched. [SEC] clean — test/audit files only, no attack surface. [SIMPLE] n/a — disabled; diff is minimal, no over-engineering. [RULE] confirmed round 1 (`:198` span-accuracy #2 + whole-block reconciliation #3) → now RESOLVED; the whole block is reconciled.

**Devil's Advocate:** The one substantive risk left is the `>100` floor's brittleness: a legitimate future shrink of sound.md below ~43 citations (total < 100 while every file stays > 0) would falsely redden. But that is the intended, documented cost of an aggregate that catches largest-file loss, it matches joust's `>100` convention, and it is exactly what AC-1 asked for — not a defect. Could the floor be *too loose*? If sound.md alone doubled, wholesale silencing of brief.md+glossary.md (57 lost → 118 remain) would still clear 100 — but the per-file floor at `:437` catches any file → 0, so the combination holds. Is the line-198 comment now genuinely correct and not merely grep-clean? Yes — re-read in context (lines 196–200), it describes the same import as line 61 and the real span is 28-31. No residual finding.

**Handoff:** To SM for finish-story

## Branch Strategy

**trunk-based** (branching skipped — work happens on the default branch)

## Sm Assessment

Setup complete. Story context and session file are ready. Two independent, well-scoped single-line audit-suite fixes in centipede — a citation floor tightening and a stale line-span citation correction. Both locations are identified in Delivery Findings; Dev should re-derive the actual citation counts before picking the new floor rather than trusting the ~86 estimate. Trivial workflow → routing to Dev for the implement phase.

**Handoff:** dev (implement phase)