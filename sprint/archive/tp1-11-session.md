---
story_id: "tp1-11"
jira_key: "tp1-11"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-11: Restore SPIKE_MAX_DEPTH to the ROM's 0.929 — the PM ruling, sequenced behind the warp dive

## Story Details
- **ID:** tp1-11
- **Jira Key:** tp1-11
- **Workflow:** tdd
- **Stack Parent:** tp1-10 (THE WARP DIVE — already done)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T22:39:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T22:11:03Z | 2026-07-15T22:13:27Z | 2m 24s |
| red | 2026-07-15T22:13:27Z | 2026-07-15T22:27:51Z | 14m 24s |
| green | 2026-07-15T22:27:51Z | 2026-07-15T22:34:08Z | 6m 17s |
| review | 2026-07-15T22:34:08Z | 2026-07-15T22:39:59Z | 5m 51s |
| finish | 2026-07-15T22:39:59Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (blocking): finding **B-006** (`docs/audit/findings/pair-8-book-reconciliation.json`) cites `src/core/rules.ts:127` VERBATIM as `export const SPIKE_MAX_DEPTH = 0.75 …`. Changing `0.75` → `0.929` makes that `ours` quote false, so `npm test -- citations` goes RED unless Dev marks B-006 `"remediated_by": "tp1-11"`. This IS a genuinely-removed divergence, so remediated_by is correct here. *Found by TEA during test design.*
- **Improvement** (non-blocking): finding **W-039** (`docs/audit/findings/pair-1-alwelg-sim-enemies.json`) is the SAME ruling from the other side — its `ours` quote is `interpreter.ts:332` (`Math.min(SPIKE_MAX_DEPTH, …)`), whose text is unchanged, so the gate stays green without action; but the divergence it describes is now fixed, so mark W-039 `"remediated_by": "tp1-11"` too. B-006 + W-039 are the "merged pair" the audit said needs ONE PM ruling — the 2026-07-13 ruling enacted by this story. *Found by TEA during test design.*
- **Improvement** (non-blocking): after editing `rules.ts` (a cited file), run `node tools/audit/reanchor-citations.mjs --write` and commit the re-anchored JSON (tempest CLAUDE.md rule 2), or later stories' citation gate breaks with a confusing "does not match verbatim". *Found by TEA during test design.*
- **Improvement** (non-blocking): the AC-2 target comment is NOT at `rules.ts:110-115` (that's `RESPAWN_LANE`). The 0.75-deviation note actually lives inline on `rules.ts:127` and in the block comment at `rules.ts:411-415` ("Kept SEPARATE from SPIKE_MAX_DEPTH (0.75) … story 6-15 deviations"). BOTH must be rewritten to record the overturned ruling — the 411-415 rationale ("so raising the turnaround does not also grow spikes") becomes false once the two values reunite at $20. *Found by TEA during test design.*
- **Improvement** (non-blocking): stale test-file comments to refresh during verify — `sim.enemy-motion-fidelity.test.ts:49,89,105` and `sim.enemy-fire.test.ts:70` narrate 0.75 as the current cap. No assertions break (confirmed: full suite 1437 green apart from the 6 intended); reviewer-comment-analyzer will flag them. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the stale test-file comments TEA flagged are now confirmed still-open and slightly *more* stale (they narrate 0.75 as the live cap; it is now 0.929). I left them untouched — out of this story's scope, comment-only, zero assertion impact, full suite green. Recommend the verify/simplify pass (or Reviewer) refresh `sim.enemy-motion-fidelity.test.ts:49,89,105` and `sim.enemy-fire.test.ts:70`. *Found by Dev during implementation.*
- No blocking upstream findings during implementation. Both cited findings (W-039, B-006) were closed cleanly; reanchor reported 0 lost; citation gate 25/25 green. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): stale narrative comments in `sim.enemy-motion-fidelity.test.ts:49,89,105` and `sim.enemy-fire.test.ts:70` still call 0.75 the live cap (now 0.9286). Not in this diff; agreed follow-up for the verify/simplify pass — refresh or delete them. *Found by Reviewer during code review.*
- No blocking upstream findings during code review. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 6 findings (0 Gap, 1 Conflict, 0 Question, 5 Improvement)
**Blocking:** None

- **Conflict (resolved):** Finding **B-006** (`pair-8-book-reconciliation.json`) cites the exact line being changed (`rules.ts:127` = `0.75`), so changing it to `0.929` falsifies the citation's `ours` quote. DEV ACTION TAKEN: marked B-006 `remediated_by: tp1-11` (genuine divergence removal, not fix-cover-up). The 2026-07-13 PM ruling overturns B-006's prior "accept the 0.75" stance. Affects `docs/audit/findings/pair-8-book-reconciliation.json`.

- **Improvement:** Finding **W-039** (`pair-1-alwelg-sim-enemies.json`) describes the same ruling from the other side; its `ours` quote (`interpreter.ts:332`) is unchanged (reference to `SPIKE_MAX_DEPTH`, not the value itself), so the citation gate stays green without action, but the divergence is now fixed. DEV ACTION TAKEN: marked W-039 `remediated_by: tp1-11` to close the audit record cleanly. B-006 + W-039 are the "merged pair" the audit said requires ONE PM ruling — this story enacts it. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`.

- **Improvement:** Citation re-anchoring rule (tempest CLAUDE.md): editing `rules.ts` (a cited file) shifts line numbers in other findings. DEV ACTION TAKEN: ran `node tools/audit/reanchor-citations.mjs --write` (19 moved, 0 lost); citation gate 25/25 green. Affects `docs/audit/findings/pair-6, pair-9, pair-11 *.json` (line re-anchors only, no content changes).

- **Improvement:** Stale narrative comments in test files (`sim.enemy-motion-fidelity.test.ts:49,89,105` and `sim.enemy-fire.test.ts:70`) call 0.75 the live cap (now 0.9286). Not in this diff (pre-existing, comment-only, no assertion impact). Noted as a non-blocking follow-up for a verify/simplify pass. Affects `tests/core/sim.*.test.ts`.

### Downstream Effects

Cross-module impact: 2 files across 2 modules

- **`docs/audit/findings`** — 5 findings affected (B-006 + W-039 remediation + 3 line re-anchors across pair files)
- **`tests/core`** — 1 finding noted (stale comment; no code change)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations recorded.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec.

### Dev (implementation)
- **Closed a second finding (B-006) outside the story's named set (W-039)**
  - Spec source: context-story-tp1-11.md, Problem/AC-1 (names "Finding W-039")
  - Spec text: "Finding W-039 … the ROM's spikes reach 0.929 … SPIKE_MAX_DEPTH is 0.929, cited to the ROM."
  - Implementation: also marked B-006 (`pair-8-book-reconciliation.json`) `remediated_by: tp1-11`, not only W-039.
  - Rationale: B-006 is the "accept the deviation" half of the same merged pair the audit said needs ONE PM ruling, and it cites the exact line I changed (`rules.ts:127` = `0.75`). Leaving it unmarked would break the citation gate (verbatim no longer matches). The 2026-07-13 ruling overturns B-006's "accept", so remediated_by is the honest exit.
  - Severity: minor
  - Forward impact: none — both findings now frozen as history; no other finding cites the changed line (checked via grep across all pair files).

### Reviewer (audit)
- **Dev deviation — closed B-006 alongside the named W-039** → ✓ ACCEPTED by Reviewer: mandatory, not scope creep. B-006 cites the exact changed line (`rules.ts:127` `= 0.75`), so leaving it unmarked would red the citation gate; and the audit itself states B-006 + W-039 are one merged pair needing a single PM ruling — which 2026-07-13 supplied. `remediated_by` is the honest exit for a genuinely-removed divergence.
- **TEA "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the RED suite maps cleanly to the three ACs; file-scope documentation checks are a robustness choice, not a scope reduction.
- No undocumented deviations found: the constant change, both comment rewrites, and the two `remediated_by` closures all match the story ACs and the logged deviations.

## Sm Assessment

**Story:** Restore `SPIKE_MAX_DEPTH` in tempest `rules.ts` from the current 0.75 to the ROM's 0.929 (Finding W-039). This is a **PM ruling** (2026-07-13), not a bug fix: the 0.75 value was a *conscious* playability deviation made in story 6-15, and fidelity has now been chosen to overturn it.

**Dependency — SATISFIED:** Must land only after tp1-10 (THE WARP DIVE), which is `done`. tp1-10 delivered the wave-replay-on-spike-crash behavior that makes 0.929 fair (a spike crash now replays the wave instead of costing a life outright).

**Scope for TEA (RED):**
- Restore `SPIKE_MAX_DEPTH` (or equivalently-named constant) to `0.929`.
- Update the `rules.ts` comment (~lines 110-115) that documents 0.75 as a conscious deviation — it is no longer a deviation; reflect the overturned ruling with a ROM citation.
- Existing tests that pin `0.75` must be re-pinned to `0.929` (RED will surface these).
- **Hard gate:** confirm the tp1-10 spike-crash-replays-wave behavior still holds with the deeper 0.929 spikes — do not land without verifying the replay works.

**Watch-outs:**
- tempest is **gitflow** (feat/chore → develop, squash PR). Branch `chore/tp1-11-restore-spike-max-depth` is off `develop`.
- tempest has a **citation gate** — any edit to a cited file shifts pinned lines; re-anchor citations after editing and run `npm test -- citations`. Use `remediated_by` only for a defect actually removed, not for this ruling.

**Routing:** phased tdd → next agent **tea** (O'Brien) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A ROM-fidelity constant change with real behavioural (spike height) and documentation consequences — not a doc/config chore.

**Test File:**
- `tests/core/tp1-11.spike-max-depth.test.ts` — 7 tests across AC-1 / AC-2 / AC-3.

**Tests Written:** 7 covering 3 ACs. **Status:** RED (6 failing, ready for Dev; 1 green — the AC-3 hard-gate guard, satisfied by tp1-10).

Full tempest suite after adding the file: **1437 passed, 6 failed** (all in this file, all intended). Citation gate: **25/25 green** — the baseline Dev must preserve.

### AC Coverage

| AC | Test | Status |
|----|------|--------|
| AC-1 value: `SPIKE_MAX_DEPTH` ≈ 0.929, past 0.75 | `is the ROM depth ≈ 0.929…` | failing (0.75) |
| AC-1 fidelity: cap === spiker `$20` turnaround | `caps the spike exactly where the spiker turns around` | failing (0.75 ≠ 0.9286) |
| AC-1 behaviour: laid spike reaches ~0.929 | `grows the spike PAST the retired 0.75 cap` | failing (peak 0.75) |
| AC-1 guard: a raised cap is not NO cap | `does not grow the spike PAST the spiker turnaround` | failing (peak 0.75) |
| AC-2 docs: no `= 0.75`, overturn note present | 2 source-text tests | failing (still 0.75, no note) |
| AC-3 hard gate: 0.929 crash replays the wave | `crashes, spends one life, REPLAYS level 1` | **passing** (gate holds) |

### Rule Coverage (project rules / house style)

| Rule | Test | Status |
|------|------|--------|
| ROM constants DERIVED, never rounded literals (ROM_FPS lesson, rules.ts:422-425) | `caps the spike exactly where the spiker turns around` pins `=== SPIKER_TURNAROUND_DEPTH`, forcing the `(0xf0-0x20)/WARP_ALONG_SPAN` derivation over a bare `0.929` | failing |
| No tautological pins (tp1-27 lesson) | value pinned to an INDEPENDENT raw-literal `(0xf0-0x20)/224` AND to the sibling constant | failing |
| core/ purity — no DOM/time/Math.random | whole suite runs on the pure sim + seeded RNG (determinism implicit) | n/a |

**Self-check:** No vacuous assertions. Every behavioural test carries a liveness guard (spike peak > 0.1) proving the spiker actually lays a spike — verified at runtime: RED shows peak = 0.75, not 0.

**Handoff → Dev (Julia) for GREEN.** Two load-bearing notes (see Delivery Findings):
1. **Citation gate:** mark **B-006** (blocking — line 127's `= 0.75` text changes) AND **W-039** `remediated_by: tp1-11`, then run `node tools/audit/reanchor-citations.mjs --write`. Confirm `npm test -- citations` stays green.
2. **Recommended impl:** `export const SPIKE_MAX_DEPTH = (0xf0 - 0x20) / WARP_ALONG_SPAN` — identical value to `SPIKER_TURNAROUND_DEPTH`, one shared `$20`, which is exactly what the fidelity test pins. Do NOT write `= SPIKER_TURNAROUND_DEPTH` (it is declared LATER at line 416 → `const` temporal-dead-zone crash), and do NOT drop a bare literal `0.929` (fails the derivation + unification pins). Also rewrite the deviation comments at line 127 and 411-415 to record the 2026-07-13 overturn (AC-2, "not silently deleted").

## Dev Assessment

**Implementation Complete:** Yes — followed TEA's recommended approach exactly.

**Files Changed:**
- `src/core/rules.ts` — `SPIKE_MAX_DEPTH` now derives `(0xf0 - 0x20) / WARP_ALONG_SPAN` (≈ 0.9286, the ROM `$20`), identical to `SPIKER_TURNAROUND_DEPTH`. Both the inline comment (line 127) and the `SPIKER_TURNAROUND_DEPTH` block comment rewritten to record the 2026-07-13 overturned ruling (AC-2).
- `docs/audit/findings/pair-8-book-reconciliation.json` — **B-006** `remediated_by: tp1-11` (+ line re-anchors).
- `docs/audit/findings/pair-1-alwelg-sim-enemies.json` — **W-039** `remediated_by: tp1-11` (+ line re-anchors).
- `docs/audit/findings/pair-6, pair-9, pair-11 *.json` — line-number re-anchors only (rules.ts lines shifted +8 by the new comment). `reanchor-citations.mjs --write`: **19 moved, 0 lost**.

**Tests:** 7/7 tp1-11 GREEN; full tempest suite **1443/1443** (no ripple from taller spikes); citation gate **25/25**; `tsc --noEmit` + `vite build` clean.

**Branch:** `chore/tp1-11-restore-spike-max-depth` (pushed, tracking origin).

**Verification highlights:**
- The `interpreter.ts:332` cap `Math.min(SPIKE_MAX_DEPTH, …)` now trims nothing below the `$20` turnaround, so a full spike reaches the ROM's 0.929 — behavioural tests confirm peak climbs 0.75 → 0.929.
- The AC-3 hard gate holds: a 0.929 warp-dive crash still replays the wave (tp1-10), so the deeper spikes are fair.
- No `ours` line other than the two named findings pointed at the changed constant (grepped all pair files).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

Only `reviewer-preflight` is enabled in `workflow.reviewer_subagents`; the other 8
specialists are disabled via settings, so I assessed each of their domains myself
(diff is small: one constant + two comments + a test file + JSON re-anchors).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1443 tests, 25 citations, tsc+vite all PASS, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | reviewer assessed | confirmed 1 (LOW, non-blocking) — see [DOC] |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | reviewer assessed | N/A — assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | Skipped (disabled) | reviewer assessed | N/A — TS lang-review checklist passed (see [RULE]) |

**All received:** Yes (1 ran clean, 8 disabled and assessed by Reviewer)
**Total findings:** 1 confirmed (LOW, non-blocking [DOC]), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A minimal, ROM-faithful change: `SPIKE_MAX_DEPTH` restored from the story-6-15
playability deviation (0.75) to the ROM's single `$20` cap, derived as
`(0xf0 - 0x20) / WARP_ALONG_SPAN` (≈ 0.9286) — identical to `SPIKER_TURNAROUND_DEPTH`,
exactly as findings W-039 and B-006 (the audit's merged pair) prescribe. No
Critical/High issues.

**Observations (7):**

1. **[VERIFIED]** Constant derivation is correct and safe — `rules.ts:127` reads `(0xf0 - 0x20) / WARP_ALONG_SPAN`; `WARP_ALONG_SPAN` is exported at `rules.ts:60`, well before line 127, so there is **no `const` temporal-dead-zone**. Runtime value = 0.9285714… Pure hex arithmetic → complies with the core-purity boundary (no DOM/time/`Math.random`). Derived, not a rounded literal → complies with the ROM_FPS house-style lesson (`rules.ts` comment block near 422).
2. **[VERIFIED][RULE]** TypeScript lang-review checklist (13 checks) passes across the diff: no `as any`/`@ts-ignore`/non-null assertions; no enums/async/JSX; the test's relative imports omit `.js` **consistent with every existing test file** and `tsc --noEmit` is green (bundler resolution, not Node16). No stringly-typed input, no unvalidated `JSON.parse`.
3. **[VERIFIED][SIMPLE]** No dead code introduced. The only consumer, `interpreter.ts:332` `Math.min(SPIKE_MAX_DEPTH, Math.max(spikes, e.depth))`, is **not** rendered redundant: the spike is laid on the raw pre-clamp `e.depth` (before the turnaround clamp at :335), which can momentarily exceed `$20`, so the `Math.min` still trims that one-frame overshoot to the cap. Confirmed by the test `does not grow the spike PAST the spiker turnaround`.
4. **[VERIFIED][EDGE]** Boundary safety — the new cap 0.9286 < 1.0 (`PLAYER_RIM_DEPTH`), so spikes never reach or cross the rim; `SPIKE_SHORTEN = 0.08` trimming still works on a 0.9286 spike. Blast radius is minimal: `SPIKE_MAX_DEPTH`'s only consumer is `interpreter.ts:332`, and it is **not** consumed during `initialState`, so no seeded-RNG cursor shift — corroborated by the full suite staying 1443 green (no ripple, unlike a per-wave count change).
5. **[VERIFIED]** Citation-gate integrity — the findings diff is **pure line re-anchors** (+8 above the second rewritten comment, +9 below it) plus exactly two `remediated_by: "tp1-11"` additions (B-006, W-039). **No `verbatim` string changed** anywhere; `reanchor-citations.mjs` reported 0 lost; the gate is 25/25 green. B-006's frozen `= 0.75` verbatim is correctly retained as history. Both `remediated_by` are honest (a genuinely-removed divergence), not a fix-cover-up — the ruling overturns B-006's prior "accept".
6. **[VERIFIED][TEST]** Test quality is sound — behavioural tests carry a liveness guard (`peak > 0.1`, verified at RED as 0.75 not 0); the value is pinned to an **independent literal** (0.929) AND raw ROM arithmetic `(0xf0-0x20)/224` AND the sibling constant, so it is not tautological (tp1-27 lesson honoured); the AC-3 hard-gate guard asserts real state (mode/level/lives/spikes/steps), not a vacuous truth. The `toBe(SPIKER_TURNAROUND_DEPTH)` pin is intentional coupling — the ROM says the two ARE the same `$20` — and is anchored by the independent literals, so it cannot pass tautologically.
7. **[LOW][DOC][SILENT][TYPE][SEC]** [DOC] Stale narrative comments in `sim.enemy-motion-fidelity.test.ts:49,89,105` and `sim.enemy-fire.test.ts:70` call 0.75 the live cap (now 0.9286) — **not in this diff**, pre-existing, already logged by TEA/Dev as a verify-phase Delivery Finding; non-blocking, does not affect any assertion. [SILENT] No swallowed errors / silent fallbacks (no `try/catch`, no `||`-defaults). [TYPE] The constant is a plain `number`; no type-invariant surface. [SEC] No security surface — a pure sim constant; the test's `readFileSync` reads a local repo source path, not user input.

**Data flow traced:** a climbing spiker's `e.depth` → `jstrai` (`interpreter.ts:332`) writes `Math.min(SPIKE_MAX_DEPTH, max(spikes, e.depth))` into `ctx.spikes[lane]` → rendered/collided as the tube spike → during a warp dive a spike on the player's lane crashes the cursor → tp1-10 replays the wave. Safe: the cap 0.9286 is below the rim, and the replay (not instant life-loss) makes the deeper spike fair — the exact reason the PM sequenced this behind tp1-10.

**Pattern observed:** ROM-derived constant expressed through named hardware constants (`(0xf0 - 0x20) / WARP_ALONG_SPAN`) rather than a magic literal — the same pattern as `SPIKER_TURNAROUND_DEPTH`/`PLAYER_RIM_DEPTH`/`PULSAR_CLIMB_SPEED`. Good and consistent.

**Error handling:** N/A — no failure paths in a pure constant + arithmetic change; the sim remains total.

### Rule Compliance

Rules sources: `tempest/CLAUDE.md` (core-purity boundary; citation-gate rules 1 & 2) and `.pennyfarthing/gates/lang-review/typescript.md`. No `SOUL.md` in tempest.

| Rule | Governed instances in diff | Verdict |
|------|----------------------------|---------|
| **core/ purity** — no DOM/time/`Math.random`, deterministic | `SPIKE_MAX_DEPTH` derivation (`rules.ts:127`) is pure hex arithmetic | ✅ compliant |
| **Citation gate rule 1** — fixed a finding → `remediated_by` | B-006 (changed `ours` line) + W-039 (removed divergence) both stamped `remediated_by: tp1-11` | ✅ compliant |
| **Citation gate rule 2** — touched a cited file → re-anchor | `reanchor-citations.mjs --write` run; 19 moved, 0 lost; gate 25/25 green | ✅ compliant |
| **`remediated_by` not `fixed_in`; no third name** | used `remediated_by` | ✅ compliant |
| **ROM constants derived, not rounded literals** | `(0xf0 - 0x20) / WARP_ALONG_SPAN`, not `0.929` | ✅ compliant |
| **TS #1–#13 (type escapes, null-handling, tests, build…)** | `rules.ts`, `tp1-11.spike-max-depth.test.ts` | ✅ all pass (see obs. 2) |

### Devil's Advocate

Let me argue this change is broken. **First attack — it makes the game unfair.** Raising the spike cap to 0.929 means spikes now reach nearly the rim; a player warping into a spiked lane dies where before they survived. Rebuttal: that is precisely the ROM's behaviour (the audit's whole point), and the PM deliberately sequenced this behind tp1-10 so a spike crash *replays* the wave rather than costing a life outright — the AC-3 test proves the crash replays level 1 and spends exactly one life, and re-inits the board so it can't re-crash-loop. Fair by construction. **Second attack — the `Math.min` at interpreter.ts:332 is now dead code, so a reviewer should have flagged a simplification.** Rebuttal: it is not dead — the spike is laid on the raw `e.depth` one line before the turnaround clamp, so on the crossing frame `e.depth` can exceed `$20` and the `min` genuinely trims it; the "never past the turnaround" test would fail if the min were removed. **Third attack — the strict `toBe(SPIKER_TURNAROUND_DEPTH)` test is brittle and will break a future refactor.** Rebuttal: the two constants encode the *same* ROM quantity (one `$20` clamp), so coupling them is a faithful invariant, not incidental; and it is anchored by two independent literal derivations so it can never pass by tautology. If a future story legitimately separates them again, that would itself be a spec change requiring a new ruling — the test correctly forces that conversation. **Fourth attack — the JSON edits could have corrupted a citation.** Rebuttal: the diff shows only `"line": N` shifts and two `remediated_by` additions; no `verbatim` changed; reanchor reported 0 lost and the 25-test citation gate is green — the strongest possible evidence the audit stayed intact. **Fifth attack — a confused future dev sees two constants with the identical expression and "dedupes" them into one, hitting the TDZ.** This is a real ergonomic risk, but both carry comments explaining they are the same `$20`, and merging them safely (define once, reference after) is trivial; it is a latent readability nit, not a defect in this diff. **Conclusion:** no attack survives. The change is minimal, faithful, tested, and gate-clean.

**Handoff:** To SM (Winston Smith) for finish-story.