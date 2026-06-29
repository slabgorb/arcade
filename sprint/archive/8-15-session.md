---
story_id: "8-15"
jira_key: ""
epic: "8"
workflow: "trivial"
---
# Story 8-15: TIE fighters should render green, not red (match cabinet color) — Wave 1

## Story Details
- **ID:** 8-15
- **Jira Key:** (none — local sprint)
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-29T00:10:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T23:57:23Z | 2026-06-28T23:59:41Z | 2m 18s |
| implement | 2026-06-28T23:59:41Z | 2026-06-29T00:05:49Z | 6m 8s |
| review | 2026-06-29T00:05:49Z | 2026-06-29T00:10:33Z | 4m 44s |
| finish | 2026-06-29T00:10:33Z | - | - |

## Sm Assessment

**Story:** 8-15 — TIE fighters should render green, not red (match cabinet color) — Wave 1
**Workflow:** trivial (phased) → next phase `implement`, owner **dev** (Julia)

Trivial 1-pt render-fidelity bug in the `star-wars` subrepo. Root cause and fix
site are already localized: the TIE fighter glow color lives in the shared
`GLOW_FOR` record in `src/shell/wireframe.ts` (currently `'TIE Fighter': '#ff3b30'`,
enemy red). Fix is a color value change to cabinet green; no core/sim changes.

**Routing decision:** Hand to Dev. This is a single-constant render change — no
test-first ceremony required (trivial workflow). Dev should:
- Update the `'TIE Fighter'` (and the matching `'Darth Vader TIE'`) entries in
  `GLOW_FOR` to the cabinet green; confirm the exact green against existing
  palette conventions rather than guessing.
- Guard against regressions to other entries (Surface Tower, Exhaust Port).
- Run `npm run build` + `npm test` in `star-wars/`, then visual-verify via
  `npm run dev` that TIEs render green in Wave 1.

**Open question for Dev (non-blocking):** confirm whether the Darth Vader TIE
should also flip to green or retain a distinct hue — context recommends matching,
but defer to cabinet fidelity if a reference says otherwise.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/shell/wireframe.ts` — `GLOW_FOR['TIE Fighter']` and `GLOW_FOR['Darth Vader TIE']` changed from `#ff3b30` (red) to `#30d158` (cabinet green). This is the single source of truth consumed by both the in-game renderer and the contact sheet.
- `star-wars/src/shell/render.ts` — updated the now-stale `// enemy red (shared)` comment on the derived `TIE_GLOW` constant to `// enemy green (shared)`.

**Tests:** 285/285 passing (GREEN), 21 test files. `npm run build` clean (tsc + vite).
**Visual verification:** Loaded the model contact sheet (`models.html`) served from this checkout — TIE Fighter and Darth Vader TIE both render green; Surface Tower correctly remains red (out of scope); Death Star Surface/Trench steel and Exhaust Port amber unchanged. No regressions.
**Branch:** fix/8-15-tie-fighters-green (star-wars, base develop) — pushed.

**Acceptance criteria:** All met — TIEs render green not red, Darth Vader TIE matches, no other colours regressed, build + tests pass, visual confirmed.

**Handoff:** To review phase (Reviewer / The Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 285/285 tests pass, build clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 2 (non-blocking, pre-existing test) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | N/A — Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 14 rules checked, 0 violations |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed-blocking, 0 dismissed, 2 deferred (non-blocking, concern pre-existing test scaffolding)

### Rule Compliance

Language: TypeScript. Rules source: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) plus star-wars CLAUDE.md core/shell boundary rule. No `.claude/rules/*.md` or `SOUL.md` present. The diff is 3 changed lines (2 hex string-literal values + 1 comment) across two `src/shell/` files; no new types, functions, enums, imports, async, tests, or config.

Enumeration of every diff instance against each applicable rule:
- **Rule 1 (type-safety escapes):** 0 instances — no `as any`/`@ts-ignore`/non-null assertions. Changed tokens are string literals + comments. Compliant.
- **Rule 2 (generic/interface):** 1 instance — `GLOW_FOR: Record<string, string>` (wireframe.ts:19, declaration unchanged). It is `Record<string, string>`, NOT `Record<string, any>`. Compliant.
- **Rule 4 (null/undefined):** 0 instances — no `||`/`??`/optional-chaining/`Map.get` introduced. Compliant.
- **Rule 5 (module/declaration):** 0 instances — no import/export lines touched. Compliant.
- **Rule 8 (test quality):** 0 instances in diff — no test files modified (see test-analyzer for pre-existing test observation). Compliant within diff.
- **Rule 10 (security input validation):** 0 instances — values are compile-time constant hex strings, no user input. Compliant.
- **Rule 13 (fix-introduced regressions):** 1 instance — `render.ts:23` still derives `TIE_GLOW` from `GLOW_FOR['TIE Fighter']` (no inlined literal bypassing the source of truth); comment corrected. Compliant.
- **Additional — core/shell boundary (CLAUDE.md):** 2 instances — both edits are in `src/shell/`, which is allowed to touch render/canvas; no reverse `core/ → shell/` import introduced; `GLOW_FOR` single-source-of-truth preserved. Compliant.
- Rules 3, 6, 7, 9, 11, 12: 0 applicable instances in diff (no enums, no JSX, no async, no config, no error handling, no perf-sensitive code). N/A.

Rule-checker subagent independently confirmed: 14 rules checked, 4 instances, **0 violations**.

## Reviewer Assessment

**Verdict:** APPROVED

This is a 3-line render-fidelity fix: `GLOW_FOR['TIE Fighter']` and `GLOW_FOR['Darth Vader TIE']` move from `#ff3b30` (red) to `#30d158` (green) in `src/shell/wireframe.ts`, plus a corrected `// enemy green (shared)` comment on the derived `TIE_GLOW` in `src/shell/render.ts`.

**Data flow traced:** `GLOW_FOR['TIE Fighter']` (wireframe.ts:20, source of truth) → `TIE_GLOW` (render.ts:23, derived) → stroke color passed to `drawWireframe()` for each TIE, AND → the model contact sheet (`models.html`) which strokes geometry through the same `GLOW_FOR` path. Both consumers read the single constant, so the one-value edit propagates consistently — verified by the contact-sheet screenshot showing both TIE Fighter and Darth Vader TIE rendering green. Safe because no consumer inlines its own red literal.

**Observations (≥5):**
- `[VERIFIED]` Color is genuinely green — `#30d158` = rgb(48,209,88), green-dominant; visually confirmed on the contact sheet. Evidence: wireframe.ts:20-21.
- `[VERIFIED]` Scope is correct — `Surface Tower` retains `#ff3b30` (wireframe.ts:23); only the two TIE-class entries changed. No collateral color regression. Evidence: full `GLOW_FOR` re-read; grep shows the only remaining `#ff3b30` in src is Surface Tower.
- `[VERIFIED]` No orphan red TIE literal — `render.ts:23` derives from `GLOW_FOR`, does not hardcode a color, so nothing bypasses the change. Evidence: render.ts:23.
- `[DOC]` Stale-comment risk handled — Dev proactively updated the `// enemy red (shared)` comment in render.ts to `// enemy green`. comment-analyzer was disabled, but I checked the diff manually: no remaining stale "red" comment references a TIE. Evidence: render.ts:23, wireframe.ts:20-21.
- `[TEST]` (deferred, non-blocking) test-analyzer flagged `tests/shell/wireframe.test.ts:53` `expect(GLOW_FOR['TIE Fighter']).toMatch(/^#/)` as a vacuous assertion that cannot catch a color regression, and that `Darth Vader TIE` is uncovered (line 51). Both are about a PRE-EXISTING test not introduced by this diff; project convention (star-wars CLAUDE.md) is that shell render code is verified visually, not unit-tested. Severity Low — does not block. Recorded as a non-blocking Improvement delivery finding for the team to decide (pin to `toBe('#30d158')` or drop the block).
- `[RULE]` rule-checker: 14 rules, 0 violations — confirmed clean.
- `[SEC]` (disabled) No security surface — constant hex strings, no user input, no injection vector. Manually confirmed.
- `[TYPE]` (disabled) No type changes — `GLOW_FOR` remains `Record<string, string>`; value edits only. Manually confirmed.
- `[EDGE]` (disabled) No new branches/boundaries — straight constant reassignment. Manually confirmed.
- `[SILENT]` (disabled) No error handling or swallowed failures introduced. Manually confirmed.
- `[SIMPLE]` (disabled) Change is already minimal (single source-of-truth edit); no simpler form exists. Manually confirmed.

**Error handling:** N/A — no control flow, I/O, or failure paths in a color-constant change (render.ts:23, wireframe.ts:20-21).

**Pattern observed:** Good — single-source-of-truth constant (`GLOW_FOR`) means the fix is one place and both renderer + contact sheet stay in sync (wireframe.ts:19).

### Devil's Advocate

Let me argue this change is broken. First, friend/foe confusion: the player's own laser bolt is `#9dff00` (chartreuse, render.ts:26) and TIE fighters are now `#30d158` (green). A stressed or colorblind (deuteranopia) player could conflate their own outgoing fire with an enemy ship, degrading readability — the very thing a vector arcade leans on. Counter: in the authentic 1983 cabinet, TIEs and player shots were both green-family on the color XY monitor; enemies are distinguished by motion and wireframe geometry, not hue, and the incoming enemy fireball is amber (`#ffd60a`, render.ts:27), preserving the threat cue. The two greens are also distinguishable (yellow-green vs. true green). This is a pre-existing design stance (the player bolt was already green), not a regression introduced here — non-blocking.

Second, boss distinguishability: Darth Vader's TIE now shares the exact green of a rank-and-file TIE. A player might fail to recognize the boss. Counter: the contact sheet confirms the Darth Vader TIE is a geometrically distinct, larger wireframe (V:56 E:104 vs the standard TIE) — it reads as different by shape, and the story explicitly asks both TIE-class craft to match cabinet green. Acceptable, and arguably more authentic.

Third, could a snapshot or downstream test pin the old red and now break? I checked: the only test touching `GLOW_FOR` is the lenient `/^#/` regex, which passes for any hex; no snapshot tests, no pinned-red assertion exists, and all 285 tests pass. Fourth, could `#30d158` be too dim to glow on black? With `shadowBlur 10` and a bright value channel, the contact sheet shows it strokes clearly. Fifth, did the edit miss a second place that hardcodes TIE red? grep of `src/` shows the only remaining `#ff3b30` is `Surface Tower` (intended). Nothing slips through. The devil's advocate surfaces only pre-existing, non-blocking design considerations — no new defect.

**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No upstream findings. The shared `GLOW_FOR` single-source-of-truth made this a clean
  one-line colour change that propagated to `render.ts`'s `TIE_GLOW` automatically.

### Reviewer (code review)
- **Improvement** (non-blocking): The pre-existing `GLOW_FOR` test asserts only `toMatch(/^#/)`, which cannot catch a colour regression and does not cover `Darth Vader TIE`. Affects `star-wars/tests/shell/wireframe.test.ts:51-53` (either pin to `toBe('#30d158')` for both TIE entries, or drop the block since project convention verifies shell colour visually). Out of scope for this 1-pt story. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Chose `#30d158` (Apple systemGreen) for the TIE green, not the context's `#00ff41` estimate**
  - Spec source: context-story-8-15.md, Technical Approach
  - Spec text: "the authentic cabinet green (estimate: `'#00ff41'` or similar bright phosphor green)"
  - Implementation: Used `#30d158` for both `'TIE Fighter'` and `'Darth Vader TIE'`
  - Rationale: The context value was explicitly an estimate ("or similar"). The existing
    palette is Apple-system style (`#ff3b30` red, `#ff9f0a` orange, `#ffd60a` yellow,
    `#00e5ff` cyan); `#30d158` is the coherent green sibling. It is unambiguously green
    per the AC and stays distinct from the chartreuse player-bolt `#9dff00`, preserving
    friend/foe readability. No authentic reference disassembly was present locally to pin
    an exact cabinet hex.
  - Severity: minor
  - Forward impact: minor — purely a render colour value; trivially adjustable if a
    cabinet reference later dictates a specific green.
- **Also updated a stale comment in `src/shell/render.ts`**
  - Spec source: context-story-8-15.md, Scope ("Out of scope: Unrelated rendering changes")
  - Spec text: named `src/shell/wireframe.ts` as the only file to change
  - Implementation: Edited `render.ts:23` comment `// enemy red (shared)` → `// enemy green (shared)`
  - Rationale: `render.ts` derives `TIE_GLOW` from the shared `GLOW_FOR` entry; the comment
    described the colour and was now factually wrong. Comment-only change, no behaviour.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **Chose `#30d158` over the context's `#00ff41` estimate** → ✓ ACCEPTED by Reviewer: the context value was explicitly an estimate ("or similar"); `#30d158` is unambiguously green per the AC, coheres with the Apple-system palette, and stays distinct from the chartreuse player-bolt. No authentic reference hex was available to pin. Sound.
- **Updated the stale `// enemy red (shared)` comment in `render.ts`** → ✓ ACCEPTED by Reviewer: a comment-only correction that keeps documentation truthful with the new colour; no behaviour change. Correct call, not scope creep.
- No undocumented deviations found: the diff matches exactly what the two logged entries describe (two `GLOW_FOR` value edits + one comment edit); nothing slipped through unlogged.