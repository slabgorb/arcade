---
story_id: "jt11-17"
jira_key: "jt11-17"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-17: Attract CTA PRESS 1 OR 2 TO START routes to a select screen that re-asks the player count -- carry the pressed count straight into startPlaying

## Story Details
- **ID:** jt11-17
- **Jira Key:** jt11-17
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Repos:** arcade
- **Branch:** fix/jt11-17-attract-cta-direct-start
- **PR:** https://github.com/slabgorb/arcade/pull/402 (code PR → develop; awaiting user merge)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T23:34:11Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T22:06:44Z | 2026-08-14T22:34:23Z | 27m 39s |
| red | 2026-08-14T22:34:23Z | 2026-08-14T23:09:06Z | 34m 43s |
| green | 2026-08-14T23:09:06Z | 2026-08-14T23:11:10Z | 2m 4s |
| review | 2026-08-14T23:11:10Z | 2026-08-14T23:23:43Z | 12m 33s |
| green | 2026-08-14T23:23:43Z | 2026-08-14T23:25:39Z | 1m 56s |
| review | 2026-08-14T23:25:39Z | 2026-08-14T23:34:11Z | 8m 32s |
| finish | 2026-08-14T23:34:11Z | - | - |

## Story Summary

**Player-reported bug:** The attract screen invites "PRESS 1 OR 2 TO START" but pressing 1 or 2 leads to a second screen that re-asks the player count. The fix carries the pressed count (1 or 2) straight into game start, skipping the redundant select screen.

**Root cause:** The attract start branch reads `want = readSelectInput(held)` (which maps Digit1→'one-player', Digit2→'two-player') but then discards the count and calls `toSelect(cabinet)`, which only changes the mode to 'select' without the count. The select screen then re-asks via its own 1P/2P prompt.

**Fix:** Thread the pressed count into a direct start by replacing the `toSelect` call with `const count = selectPlayerCount(want); if (count !== null) enterPlaying(count)`. This pattern already exists and works at the select door (`main.ts:587-593`). Both `selectPlayerCount` and `enterPlaying` are already imported in main.ts.

**Sequencing note:** Shares the `main.ts` start-input door with jt11-16 (the title screen boot fix). Sequence in separate checkouts; do not parallel.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): the cabinet now has an intentional asymmetry — an attract start-press direct-starts while a title start-press opens the two-press `select` coin-up (owner ruling v2). Affects `plugins/joust/src/main.ts` (a future story could unify the title start-press into a direct start too, or make attract route through select behind a distinct coin gesture — a design decision, not a bug). *Found by Reviewer during code review.*
- Note: the two REJECTED stale-doc findings (`main.ts:377-378`, `title-boot-jt11-16-wiring.test.ts:193-201`) are this story's own green-rework items (see Reviewer Assessment) — FIXED and re-verified in round 2, not deferred upstream.
- **Improvement** (non-blocking): the label `attract/title -> select` is now stale in THREE doc sites and deserves a coherent one-story sweep. Affects `plugins/joust/src/core/cabinet.ts` (`toSelect` doc, ~:88 — the source of truth), `plugins/joust/tests/helpers/cabinet-contract.ts` (~:95), and the design-rationale header of `plugins/joust/tests/title-boot-jt11-16-wiring.test.ts` (~:28, which quotes cabinet.ts). Fix the core doc first, then its two quoters. Out of jt11-17's scope (core files it fences per AC-5); a piecemeal edit would create a citation mismatch. *Found by Reviewer during round-2 re-review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-5 rescoped to attract-only — select mode and jt11-16's title→select coin-up preserved (the "toSelect loses its only caller" premise was falsified)**
  - Spec source: context-story-jt11-17.md, AC-5 + the SM "Open question" ruling (a)
  - Spec text: "The redundant `'select'` 1P/2P re-prompt is **removed** (or the whole `'select'` mode retired) ... attract 1/2 is the sole start path; `toSelect` has no production caller after this fix"
  - Implementation: RED pins ONLY the `attract` pump branch direct-starting via `selectPlayerCount` → `enterPlaying`; the `title` branch's `toSelect` coin-up (jt11-16, merged) and the `select` mode are preserved and fenced GREEN. No edits to `core/select.ts`, `shell/selectScreen.ts`, or `title-boot-jt11-16-wiring.test.ts`.
  - Rationale: jt11-16 merged after this story was written and added a SECOND `toSelect` caller (the title start-press → select), so the fix does not orphan select; the owner re-ruled "attract only; keep the title coin-up" (2026-08-14) once TEA surfaced the falsified premise against the current tree.
  - Severity: major
  - Forward impact: minor — a follow-up story may unify the title/select coin-up with attract's direct start; jt11-16's title→select coin-up is intentionally retained, and the leftover attract-direct-vs-title-coin-up asymmetry is accepted for this story.
  - → ✓ ACCEPTED by Reviewer: independently confirmed the premise was falsified — jt11-16 added the title→`toSelect` caller (main.ts title branch, still present at :585; core/cabinet.ts `toSelect`), so the attract fix does not orphan select. The owner's v2 ruling (attract-only) is correctly reflected in the code, the AC-5 green fence, and the context. Sound rescope.

### Dev (implementation)
- No deviations from spec.

### Reviewer (audit)
- **Stale flow docs left describing the retired "attract → select" behavior (undocumented by Dev):** Spec source: this diff's own scope (attract branch now direct-starts). Spec text: main.ts:377-378 "A start press in title (or attract) routes on to the 'select' coin-up (toSelect) ... as before"; title-boot-jt11-16-wiring.test.ts:193-201 "The title, like attract, must go to `select` first". Implementation: attract now calls `enterPlaying` directly, falsifying both, but neither comment was updated and no test catches it. Rationale: fix-introduced #17/#24 doc regression, not logged by Dev. Severity: minor (docs, misleading). Forward impact: minor — flagged as the two REJECTED findings; Dev to correct in green rework. → ✗ FLAGGED by Reviewer (the two blocking findings above). **→ ✓ RESOLVED in round 2:** both stale-comment sites reworded (commit `ddc90634`) and re-verified by the round-2 rule-checker. A third residual occurrence of the `attract/title -> select` label (cabinet.ts:88 + its two quoters) is deferred as a non-blocking Delivery Finding (out of jt11-17's core-fence scope).

## SM Assessment

**Derived ACs (epic YAML had null):** The provided context file and instructions cited the prescribed fix and determined these acceptance criteria:

1. Pressing **1** on the attract screen starts a **1-player** game directly; pressing **2** starts a **2-player** game — no intervening select re-prompt.
2. The attracted keypress routes directly to game start (attract → playing), not through the 'select' mode.
3. Rising-edge discipline is preserved (prevStartHeld) — a held button starts exactly one game, no repeat.
4. The pressed count is threaded end-to-end: `selectPlayerCount(want)` → `enterPlaying(count)` → game ledger count matches the pressed digit (1P game has one knight).
5. Core/shell purity is respected — the fix is shell wiring in `main.ts` using existing pure symbols (`selectPlayerCount`, `enterPlaying`). No sim/clock leakage.

**Context file:** Story context exists at `sprint/context/context-story-jt11-17.md` with detailed test design and rule coverage. Context file updated with live line anchors (verified 2026-08-14 against `plugins/joust/src` on develop).

**Branch ready:** `fix/jt11-17-attract-cta-direct-start` created from develop.

**⚠ OWNER RULING (2026-08-14, via SM) — the either/or in AC-5 is resolved:** After attract 1/2
direct-starts, `toSelect` loses its only production caller (classic jt11 present-but-unreachable
shape). The story fenced the select screen's fate as "a separate design decision"; the owner ruled
**option (a) — retire the re-prompt.** Attract 1/2 is the **sole** start path; the redundant
`'select'` 1P/2P re-prompt is **removed** (or the whole `'select'` mode retired). **No coin-up
gesture is added** (option (b) rejected). TEA writes RED to pin attract-1/2 as the only start path
and to prove the re-prompt is gone/unreachable, not merely bypassed. The context file's AC-5 and its
"Open question" section were annotated with this ruling (`context-story-jt11-17.md`).

**Premise & anchors verified at setup:** the epic description's line cites had DRIFTED (jt11-16
landed and shoved `main.ts` ~+20 lines). SM re-measured on develop 2026-08-14; the context uses the
LIVE anchors (bug site `main.ts:557-563`, model `main.ts:587-593`, `readSelectInput` :472,
`enterPlaying` :438, `prevStartHeld` :422). Sequencing sibling jt11-16 is **done** (no live branch),
so the shared `main.ts` door is clear. Sibling probes clean (no jt11-17 branch, no session files).

**Workflow gate:** tdd is a phased workflow. Setup phase complete; next agent is tea (red phase).

## TEA Assessment

**RED state confirmed** (`jt11-17-tea-red`, cross-checked directly + via testing-runner): joust project
**4 failed / 3661 passed / 193 files**. All 4 failures are in the new
`plugins/joust/tests/attract-direct-start-jt11-17.test.ts`; nothing else in joust reddened. `tsc
--noEmit` is clean.

**Scope correction made during RED (see Design Deviations → TEA):** the owner's v1 ruling ("retire the
select mode; attract the sole start path") rested on a premise I falsified against the current tree —
jt11-16 (merged) added a SECOND `toSelect` caller (title start-press → select), so the fix does not
orphan select. Owner re-ruled **"attract only; keep the title coin-up"** (v2). Context AC-5 and its
ruling banner were corrected; jt11-16 and its test are untouched.

**What GREEN (Dev / Korben) must do — the minimal, single-branch fix:**
- In the `attract` pump branch of `plugins/joust/src/main.ts` (the block that owns `stepAttract(` and
  currently does `if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)`), replace the
  `toSelect(cabinet)` transition with a direct start that threads the pressed count — mirror the
  select door's proven shape: `const count = selectPlayerCount(want); if (count !== null)
  enterPlaying(count)`, kept inside the `startHeld && !prevStartHeld` rising-edge guard, with
  `prevStartHeld = startHeld` still written every frame.
- Both `selectPlayerCount` (imported from `core/select`) and `enterPlaying` (local `main.ts` function)
  already exist — no new symbols, no new imports, no core changes.
- **Do NOT touch** the `title` branch's `toSelect` (jt11-16 coin-up), `core/select.ts`,
  `shell/selectScreen.ts`, or `title-boot-jt11-16-wiring.test.ts`. The AC-5 fence guards this.

**Rule Coverage**

| Rule / guard | Test enforcing it |
|---|---|
| lang-review **#14** (derived EDGE gated in-branch, not just present) | AC-3 — the `!prevStartHeld` guard must be a compound condition AND textually precede `enterPlaying`, so a held digit starts exactly one game (defeats the trailing-`prevStartHeld = startHeld`-bookkeeping false-green) |
| lang-review **#15** (source grep matches CODE, not comment/string) | all assertions run over `mainCode()` (line comments stripped) |
| core/shell boundary | fix is shell-only (`main.ts`); AC-4 pins `selectPlayerCount` imported FROM `core/select`; AC-5 pins `enterPlaying` defined in `main.ts`; `core/select.ts`/`core/cabinet.ts` untouched |
| non-vacuity (count not hardcoded) | AC-4 — `enterPlaying(1)`/`enterPlaying(2)` literal is rejected; the pressed count must flow through `selectPlayerCount` |
| jt11-16 preserved (owner ruling v2) | AC-5 regression fence — title branch still routes to `toSelect`, `toSelect` retains a caller, select door's `enterPlaying` survives (green on arrival, must stay green) |
| pure count map already covered | select.test.ts (`one-player→1`, `two-player→2`, `null→null`, and the attract→select→playing composition) — NOT re-litigated here |
| test-file census (jt5-7 AC5) | README derived count bumped 192 → 193 for the new test file |

**Not pinned here (main.ts is a shell file — no node frame loop):** the actual on-screen behaviour
(attract + Digit1 → a 1-player game with one knight, no select screen). Source-scan proves the wiring;
a human/Playwright smoke test at `/joust/` during verify/review should OBSERVE attract-1 direct-starting
a 1-player game and attract-2 a 2-player game (the "routing ≠ geometry" caveat).
## Dev Assessment

**GREEN confirmed:** joust project **193 files / 3665 tests all pass** (`jt11-17-dev-green`); the new
`attract-direct-start-jt11-17.test.ts` is 10/10; `tsc --noEmit` clean.

**Change — one branch, one file** (`plugins/joust/src/main.ts`, the `attract` pump branch): replaced
`if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)` with the select door's proven shape —
```
if (startHeld && !prevStartHeld) {
  const count = selectPlayerCount(want)
  if (count !== null) enterPlaying(count)
}
```
so a pressed digit threads its 1-vs-2 count straight into a direct start. `prevStartHeld = startHeld`
bookkeeping and the rising-edge guard are unchanged. The branch comment was updated to describe the
direct start. No new imports (`selectPlayerCount` was already imported; `enterPlaying` is local); no
core changes; `toSelect` remains imported and used by the `title` branch (jt11-16), so no unused-symbol
lint error.

**Scope honored (owner ruling v2 / TEA fences):** the `title`→`select` coin-up, `core/select.ts`,
`shell/selectScreen.ts`, and `title-boot-jt11-16-wiring.test.ts` are untouched. AC-5's green fence
stayed green.

**For verify/review — observe it in play (TEA's "routing ≠ geometry" caveat):** source-scan proves the
wiring but not the pixels. Recommend a smoke test at `http://127.0.0.1:5270/joust/` (`just serve`):
from attract, press **1** → a 1-player game starts immediately (one knight), no select screen; press
**2** → a 2-player game. Confirm a HELD digit starts exactly one game. Also confirm the title
start-press still opens the select coin-up (jt11-16 unchanged).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (green) | none | N/A — joust 3665/3665, lint clean, orchestrator 498/498, zero smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; rule-checker caught the doc regressions |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — input narrowed 1\|2\|null, rising-edge gated, shell-only |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (at 2 sites) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled and hand-covered)
**Total findings:** 2 confirmed (both [MEDIUM] stale-doc regressions), 0 dismissed, 0 deferred

**Round 2 (re-review of the doc rework):** re-ran reviewer-preflight (Yes — green: joust 3665/3665, lint clean) and reviewer-rule-checker (Yes — both round-1 findings RESOLVED; 1 residual `attract/title -> select` phrase deferred as a non-blocking Delivery Finding). reviewer-security carried from round 1 (Yes — clean; rework was comment-only, zero security-relevant code). 6 disabled subagents remain hand-covered. **All received (round 2): Yes.** Total round-2 findings: 0 blocking, 1 deferred (non-blocking).

## Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (applicable checks enumerated over the diff):

- **#1 type-safety escapes** — compliant: `const count = selectPlayerCount(want); if (count !== null)` explicitly narrows `1|2|null`, no cast/`!`.
- **#4 null handling** — compliant: strict `!== null`, not `||`/`??`.
- **#5 module/import** — compliant: `selectPlayerCount` from `./core/select.js` (value), `type SelectInput` separated.
- **#8/#12 test quality/perf** — compliant: test-time `readFileSync` on a static fixture, reads `src/` not `dist/`.
- **#13 fix-introduced regressions** — logic clean; the doc half surfaced #17/#24 below.
- **#14 derived edges / #33 rising-edge** — compliant: edge read fresh this frame, gates `enterPlaying` in the same check; no new missed-transition structure (branch count touching `prevStartHeld` unchanged 3→3).
- **#15 / #25 source-text token-not-claim & scope** — compliant: `mainCode()` strips comments; `pumpBranch` slices by owned marker + same-indent close.
- **#17 comments asserting a mechanism nobody re-ran** — **2 VIOLATIONS** (main.ts:377-378; title-boot-jt11-16-wiring.test.ts:193-201). The NEW attract-branch comment is compliant (verified true).
- **#24 retirement applied where the AC named it and nowhere else** — **2 VIOLATIONS** (same sites): retired "attract → select" prose survives outside the touched branch.
- **#31 core/shell purity** — compliant: shell-only (`main.ts`); no `core/` file in the diff.
- **#32 no `file.ts:line` in test comments** — compliant.

## Reviewer Assessment

**Verdict:** APPROVED (Round 2). Round 1 was REJECTED on two stale-doc findings (table below); Dev fixed both in a doc-only rework (commit `ddc90634`) and Round 2 re-verified them RESOLVED. Final verdict: **APPROVED**. See the **Round 2 Addendum** at the end of this section.

**Round 1 (REJECTED) — now resolved.** No Critical/High. Round 1 rejected on two CONFIRMED, rule-matching (#17/#24) documentation regressions the diff introduced — cheap to fix, in-blast-radius, untested (they ship silently false). Per project-rules discipline these could not be dismissed. Both are now fixed (verified in Round 2).

| Severity | Issue (Round 1) | Location | Fix | Status |
|----------|-------|----------|-----|--------|
| [MEDIUM] | Header comment says a start press "in title (or attract)" routes to the `select` coin-up "as before" — false for attract post-fix. | plugins/joust/src/main.ts:377-378 | Reword to title-only routing; attract direct-starts. | ✓ FIXED (round 2, verified) |
| [MEDIUM] | AC-C prose/test-title assert "The title, like attract, must go to `select` first" and "attract/title -> select" — false for attract; test stays green while prose ships false. | plugins/joust/tests/title-boot-jt11-16-wiring.test.ts:193-201 | Correct comment + `it(...)` title to title-only; assertion unchanged. | ✓ FIXED (round 2, verified) |

**Observations (all specialist domains covered; disabled ones hand-covered):**
- **[RULE][MEDIUM]** main.ts:377-378 stale flow comment — confirmed by rule-checker (#17/#24) and re-read by me. Finding 1.
- **[RULE][MEDIUM]** title-boot-jt11-16-wiring.test.ts:193-201 stale AC-C prose — confirmed and re-read. Finding 2.
- **[DOC]** the NEW attract-branch comment (in-diff) is accurate — "select coin-up survives for the title start-press (jt11-16)" verified against the title branch (still calls `toSelect`). Only the OLD out-of-branch docs are stale.
- **[SEC]** clean — no auth/tenant/secret/injection surface; keypress narrowed to `1|2|null`; `prevStartHeld` gates a single rising edge.
- **[EDGE]** [VERIFIED] after `enterPlaying(count)`, `cabinet.mode==='playing'` (startPlaying returns `{mode:'playing',...}` — core/cabinet.ts:100), so the trailing demo-page block is skipped — no double-step. Mirrors the old `toSelect`→`'select'` skip. Evidence: main.ts:438-439, cabinet.ts:100.
- **[SILENT]** [VERIFIED] no silent no-op on the reachable path: `want` non-null inside the guard ⇒ `selectPlayerCount(want)∈{1,2}` ⇒ `count!==null` always true ⇒ `enterPlaying` fires. `count!==null` is type-narrowing, mirroring the select door. Evidence: core/select.ts, main.ts:566-567.
- **[TYPE]** [VERIFIED] `selectPlayerCount(want: SelectInput incl null): 1|2|null`; `count!==null` narrows to `enterPlaying(count: 1|2)`. Type-safe, `tsc --noEmit` clean.
- **[TEST][LOW]** AC-3 proves the rising-edge guard textually PRECEDES `enterPlaying` but not that the call sits INSIDE the guarded block; a pathological empty-guard + ungated call would pass. Real code correct and the `&& !prevStartHeld`-strip mutation IS caught; non-blocking. Could tighten.
- **[SIMPLE][LOW]** the start-press→direct-start logic is now duplicated between the attract branch and the select-door. Extraction is scope creep for a 2pt fix (CLAUDE.md: extract only when a second case proves it); correctly left. Not required.
- **[PRE]** preflight green: joust 3665/3665, lint clean, orchestrator 498/498, zero smells.

**Data flow traced:** Digit1/Digit2 keypress → `held` → `readSelectInput` → `'one-player'`/`'two-player'` → `selectPlayerCount` → `1`/`2` → `enterPlaying` → `startPlaying(cabinet, SEED, count)` → `createGame(SEED, count)`, `cabinet.mode='playing'`. Safe: rising-edge gated, count narrowed to `1|2`.

**Pattern observed:** the fix reuses the select-door's exact shape at main.ts:565-568 — reuse-first, minimal, correct.

### Devil's Advocate

Assume this is broken. First attack: the trailing demo-page pump. In the old code the start press flipped the mode to `'select'`, so `if (cabinet.mode === 'attract' && attract.page === 'demo')` was skipped. The new code flips to `'playing'` via `enterPlaying`; if `startPlaying` had NOT set the mode synchronously we would step a fresh game once in the same frame we started it, double-seeding. Checked: cabinet.ts:100 returns `{mode:'playing', game:createGame(...)}`, so the guard is false and the block is skipped — safe, but exactly the fall-through a careless port breaks. Second: a held digit. A player holding `1` must not machine-gun `startPlaying` every frame — the `!prevStartHeld` edge blocks it, and `prevStartHeld = startHeld` still runs each frame. Third: a confused player. At the TITLE a start press still opens the two-press select coin-up while at ATTRACT it now direct-starts — an inconsistency, but the owner's explicit ruling v2 (keep the title coin-up), documented and out of scope. Fourth: non-digit keys — `readSelectInput` returns non-null only for Digit1/Digit2, so nothing else starts a game. Fifth, the one that landed: the comments. A future jt11 dev reads main.ts:377-378 and the jt11-16 test's "the title, like attract, must go to select first" and builds a wrong model of the cabinet flow — the silent-rot failure #17/#24 exist to stop; no test throws, the false claim just ships. That is why this is a REJECT. Sixth: races — single-threaded rAF loop, none. Net: logic correct and well-verified; the defect is the stale prose, and it is real.

**Handoff (Round 1):** Back to Dev for a doc-only green rework.

### Round 2 Addendum (re-review of the doc rework) — APPROVED

**Both Round-1 findings RESOLVED and re-verified** (rule-checker round 2 + own read): main.ts header now says TITLE routes to `select` / ATTRACT direct-starts; the AC-C comment + `it(...)` title in title-boot-jt11-16-wiring.test.ts are title-only, assertion (`toMatch(/toSelect\(/)`) unchanged. **Preflight round 2 green:** joust 3665/3665, lint clean, zero smells.

**One residual, ruled NON-BLOCKING (captured as a Delivery Finding):** the phrase `attract/title -> select` survives in THREE places — `title-boot-jt11-16-wiring.test.ts:28` (jt11-16's "THE APPROACH THIS SUITE PINS" design-rationale header, which *quotes* cabinet.ts's label and adds "edge-debounced like the attract branch"), and its source `plugins/joust/src/core/cabinet.ts:88` (the `toSelect` doc) plus `plugins/joust/tests/helpers/cabinet-contract.ts:95`. Ruling: [LOW/MEDIUM], non-blocking. Rationale — (1) the two clearest live-false-wiring claims are already fixed; (2) test:28 is a rationale-header that *accurately quotes* cabinet.ts's label and its load-bearing clause ("a start press during the title goes to select") is true, and "edge-debounced like the attract branch" is still true (attract remains rising-edge debounced); (3) the phrase's source of truth is `cabinet.ts:88`, a CORE file jt11-17 deliberately fences out (AC-5) — editing only test:28 would make it *misquote* cabinet.ts, so the coherent fix is a 3-site sweep in a dedicated follow-up, not a piecemeal in-scope edit; (4) a third reject round reaching into unmodified core docs for a correct, well-tested 2pt fix is disproportionate. Filed as a Delivery Finding (Improvement, non-blocking).

**Specialist coverage (round 2), all 8 domains:** **[RULE]** rule-checker — round-1 findings resolved; 1 residual deferred (above). **[PRE]** preflight green. **[SEC]** carried from round 1 (clean; the rework touched zero security-relevant code — comment-only). **[EDGE]/[SILENT]/[TYPE]/[SIMPLE]** unchanged from round 1 (logic untouched this round — verified via the round-2 diff being comment-only). **[DOC]/[TEST]** the rework itself is doc/test-comment quality — re-read and correct; the AC-3 test-tightening [TEST][LOW] note from round 1 still stands as a non-blocking nicety.

**Data flow (unchanged, re-affirmed):** Digit1/Digit2 → readSelectInput → selectPlayerCount → 1/2 → enterPlaying → startPlaying → mode `'playing'`. Safe, rising-edge gated.

**Handoff:** To SM (Ruby Rhod) for finish-story.
## Dev Rework (round 1 — doc-only)

Addressed the two REJECTED [MEDIUM] stale-doc findings (#17/#24):
- `plugins/joust/src/main.ts:377-378` — reworded: a start press in TITLE routes to the `select` coin-up; a start press in ATTRACT now direct-starts with the pressed count (jt11-17), bypassing select.
- `plugins/joust/tests/title-boot-jt11-16-wiring.test.ts:193-201` — corrected the AC-C comment + `it(...)` title to title-only routing; the `toMatch(/toSelect\(/)` assertion is UNCHANGED (title→toSelect still holds), no `file.ts:line` refs added.

No logic changed. Verified: `tsc --noEmit` clean; joust 3665/3665 (comment-line-refs guard green). Commit `ddc90634`, pushed. Ready for re-review.