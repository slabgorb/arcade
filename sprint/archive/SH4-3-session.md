---
story_id: "SH4-3"
jira_key: "SH4-3"
epic: "SH4"
workflow: "tdd"
---
# Story SH4-3: Extract the RASTER integer-scale letterbox fitIntegerScale into @shared/view

## Story Details
- **ID:** SH4-3
- **Jira Key:** SH4-3
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/SH4-3-shared-fitintegerscale-letterbox)
- **Branch:** feat/SH4-3-shared-fitintegerscale-letterbox
- **PR:** 146

## Background

**Context:** SH4-3 extracts the `fitIntegerScale` function + the `Fit` interface from duplicate implementations in centipede and pac-man, and potentially folds joust's viewport calculation. This extraction is distinct from the existing `letterbox()` function in `@shared/view` (which performs DPR-aware aspect-fit).

**Authoritative Measured Facts:**

1. **Extraction unit:** `fitIntegerScale(containerW, containerH): Fit` and the `Fit` interface are byte-identical between `plugins/centipede/src/shell/layout.ts:49` and `plugins/pac-man/src/shell/layout.ts:28`. The entire files differ (centipede's is 148 lines including helper functions; pac-man's is 39 lines, letterbox-only). Lift ONLY the function and interface, not the whole file.

2. **Design wrinkle—parameterization:** The function reads module-scoped `LOGICAL_W` and `LOGICAL_H`, which differ per game. Centipede hardcodes them; pac-man derives them from `MAZE.cols*8` / `MAZE.rows*8`. The shared function cannot read a shared module constant; it must be parameterized on logical dimensions (take `logicalW`, `logicalH` as arguments). This is the story's chief design decision.

3. **Distinct from existing @shared/view letterbox:** `src/shared/view.ts:55` already exports `letterbox(canvasW, canvasH, aspect): LetterboxRect` (pure fractional aspect-fit) and `resizeToDisplay` (DPR). `fitIntegerScale` is genuinely different (integer scale derived from logical W/H, not aspect-fit). Ship it as a NEW export in `src/shared/view.ts`; do NOT merge or overload `letterbox`.

4. **SH3-4 cross-link is stale/moot:** The title's "SUPERSEDES the @shared/view-letterbox clause of SH3-4" is resolved. SH3-4 was already merged (2026-08-08). It adopted `@shared/view`'s DPR `resizeToDisplay` for pac-man's resize path but deliberately left `fitIntegerScale` local in `pac-man/main.ts:220` (verified). Consequence: there is no conflict and no sequencing constraint. SH4-3 simply lifts the local `fitIntegerScale` that SH3-4 left in place.

5. **SH3-6 source-wiring test will likely redden:** SH3-6 (merged) hardened SH3-4's source-wiring assertions to call-anchor `fitIntegerScale` in pac-man's main.ts. Re-pointing pac-man's import from `./shell/layout` to `@shared/view` will likely redden that test. This is EXPECTED — TEA/Dev must UPDATE the anchor to the new import path, NOT restore the local import. Locate it by grepping pac-man's tests for `fitIntegerScale`.

6. **Joust fold is not a clean offsets-only match (design decision):** `plugins/joust/src/shell/render.ts:71` `viewport(vw, vh)` returns `{scale, offsetX, offsetY}` (no width/height) and CLAMPS offsets with `Math.max(0, ...)`, whereas centipede/pac-man allow negative dx/dy on sub-logical viewports. The scale math is equivalent. Folding joust requires reconciling (a) return SHAPE (offsetX/offsetY vs dx/dy/width/height) and (b) offset-CLAMP behavior (centipede/pac-man allow negative; joust clamps to ≥0). Changing joust's clamp would be a render regression per the epic's own bar. Either the shared fn accommodates both behaviors, or joust adapts at its call site. Flag joust folding as the story's chief open design question — descoping the joust fold if reconciliation is not clean is a reasonable option.

## Acceptance Criteria

- **AC1:** `fitIntegerScale` (+ the `Fit` interface) exists as a new export in `src/shared/view.ts`, parameterized on logical dimensions (per Fact 2), distinct from the existing `letterbox` (per Fact 3).
- **AC2:** The lifted symbol is pinned by a NEW shared test in `src/shared/tests/` (epic rule: every lifted symbol must be pinned by a shared test).
- **AC3:** centipede and pac-man adopt the shared export (import from `@shared/view`), their local `fitIntegerScale` duplicate is removed, and BOTH games' existing vitest suites stay GREEN (including the SH3-6 wiring test, updated to the new import path — per Fact 5).
- **AC4:** joust fold is EITHER completed (viewport reconciled onto the shared fn with joust's clamp/return-shape behavior preserved — no render regression) OR explicitly descoped with a one-line rationale in the session.
- **AC5:** `npm run lint` (repo-wide tsc) clean, and the orchestrator suite green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T11:13:31Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T10:10:52.704744Z | 2026-08-09T10:15:14Z | 4m 21s |
| red | 2026-08-09T10:15:14Z | 2026-08-09T10:26:13Z | 10m 59s |
| green | 2026-08-09T10:26:13Z | 2026-08-09T10:36:02Z | 9m 49s |
| review | 2026-08-09T10:36:02Z | 2026-08-09T10:49:36Z | 13m 34s |
| red | 2026-08-09T10:49:36Z | 2026-08-09T10:58:00Z | 8m 24s |
| green | 2026-08-09T10:58:00Z | 2026-08-09T10:59:35Z | 1m 35s |
| review | 2026-08-09T10:59:35Z | 2026-08-09T11:13:31Z | 13m 56s |
| finish | 2026-08-09T11:13:31Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

- **CORRECTION to Fact 5 — SH3-6 is `status: backlog` (FILED, not merged/implemented).** Fact 5 said "SH3-6 (merged) hardened SH3-4's source-wiring assertions to call-anchor `fitIntegerScale`." Verified false: `pf sprint story show SH3-6` → `Status: backlog`, and `plugins/pac-man/tests/shell/main-host-adoption.test.ts` still carries the UN-hardened form — a bare token match `/\bfitIntegerScale\b/` (line 91) and the stale "Today main.ts:43" comment SH3-6 plans to fix. **Consequence for Dev:** re-pointing pac-man's `fitIntegerScale` import from `./shell/layout` to `@shared/view` will **NOT** redden that test — the token is still present, and `letterbox` is still absent. There is no hardened anchor to fight. (I confirmed pac-man's suite is green at baseline: 277/277.)
- **Cross-story note for SH3-6 (when it is eventually worked):** its planned "call-anchor the fitIntegerScale positives" must anchor to the `@shared/view` import path, NOT `./shell/layout`, if SH4-3 lands first. Otherwise SH3-6's hardening will encode the retired import location.
- **pac-man AC-3 test COMMENT goes stale (Reviewer comment-analyzer will flag).** `main-host-adoption.test.ts` lines 12 + 89 assert "KEEP pac-man's **own** fitIntegerScale; do NOT swap in `@shared/view.letterbox`." After SH4-3, pac-man imports `fitIntegerScale` FROM `@shared/view`, so "own" is false — though the token assertions still PASS (`fitIntegerScale` present; `letterbox` absent, since the shared export is named `fitIntegerScale`, not `letterbox`). Dev should update that comment's wording when re-pointing the import; the distinction it draws (integer-scale ≠ fractional `letterbox`) still holds and must be preserved.
- **Design note for Dev — keep centipede's existing 2-arg call sites green.** `plugins/centipede/tests/layout.test.ts` calls the current 2-arg `fitIntegerScale(240, 256)` and `plugins/centipede/src/main.ts:313` calls `fitIntegerScale(canvas.width, canvas.height)`. Because the shared fn is parameterized to 4 args (Fact 2), Dev must either (a) **keep a thin per-game 2-arg binding** in each game's `shell/layout.ts` that delegates to the shared fn with the game's own `LOGICAL_W/H` (recommended — this is literally "keep the NUMBERS local, share the VERB"), or (b) update the 2-arg call sites to pass logical dims. My tests pin the shared contract + reconciliation + de-dup, NOT the wiring shape — either approach passes them.
- **joust (AC-4) — scale reconciles, offsets do not.** joust's `Math.min(Math.floor(a), Math.floor(b))` equals `Math.floor(Math.min(a,b))` for positive reals, so the SCALE folds cleanly; the divergence is (1) return shape (`{scale,offsetX,offsetY}` vs `{scale,dx,dy,width,height}`) and (2) joust CLAMPS offsets to ≥0 (render.ts:78-79, jt1-6 addendum) where the shared fn allows negative. The `joust fold feasibility` test group makes both facts executable. Recommend Dev/Architect either preserve joust's clamp at its call site (fold) or descope the joust fold with a one-line rationale — AC-4 permits either.

### Dev (implementation)
- **Gap** (non-blocking): Two PRE-EXISTING joust test failures in `plugins/joust/tests/difficulty-wiring.test.ts` (jt9-39 AC-4 `liveSprintStoryIds`) are UNRELATED to SH4-3 — proven by a stash-baseline (they fail identically on the clean tree without any SH4-3 change). They are ALREADY FILED as **jt10-6** (`sprint/epic-jt10.yaml:106`): jt9-39 + jt9-11 are both archived, so the test's hardcoded "must be in the live sprint" control has rotted. No action for SH4-3; do not let the merge/dev gate attribute these to this story.
- **Gap** (non-blocking): Three PRE-EXISTING orchestrator failures in `tests/jt9-55-joust-yaml-refs.test.mjs` — also unrelated to SH4-3 (stash-baseline confirms). They `ENOENT` on `sprint/epic-jt9.yaml`, which no longer exists (jt9 archived; only `epic-jt10.yaml` remains). This appears NOT to be covered by an existing filed story (jt10-6 covers only the difficulty-wiring control, not this orchestrator ref-resolver). Suggest SM/Reviewer file a follow-up to retire or re-point `jt9-55-joust-yaml-refs.test.mjs` off the removed `epic-jt9.yaml`. Net orchestrator delta from SH4-3 is POSITIVE (clean tree 4 fail → 3 fail): my impl turned "tsc --noEmit exits 0 with the shared tests in the program" green by supplying the `fitIntegerScale` export the RED test imports.

### Reviewer (code review)
- **Gap** (blocking, round 1): AC-4 (joust fold) has no test on joust's REAL `viewport()` code path — the joust-fold test block re-derives the clamp inline and is justified by a FALSE comment ("render.ts is a DOM shell module, NOT imported"; the rule-checker imported it live and it runs). Affects `src/shared/tests/view-integer-scale.test.ts:236-262` + `plugins/joust/tests/render.test.ts:91-94` (import the real `viewport` and pin `viewport(100,100)` → `offsetX===0 && offsetY===0`; fix the comment). *Found by Reviewer during code review.*
- **Gap** (blocking, round 1): the AC-3 de-dup guard is mutation-unsound (evadable by a 2-statement rewrite) and lacks a positive delegation anchor. Affects `src/shared/tests/view-integer-scale.test.ts:209-224` (add positive `from '@shared/view'` + `fitIntegerScale(` call-site assertions; bound the whole-file positive anchors at :223-224). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the pac-man adoption test comment (`plugins/pac-man/tests/shell/main-host-adoption.test.ts:12,90`) still says "pac-man's OWN fitIntegerScale" — now a shared binding. **SH3-6 already owns reworking this exact file** (call-anchoring `fitIntegerScale`); its scope should absorb this own-vs-shared reword AND anchor to `@shared/view` not `./shell/layout` (see the TEA cross-story note above). If SH3-6 is not taken up soon, file a standalone follow-up. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the pre-existing orchestrator failures in `tests/jt9-55-joust-yaml-refs.test.mjs` (ENOENT on the removed `sprint/epic-jt9.yaml`) appear UNFILED — recommend SM file a follow-up to retire/re-point that test. Independent of SH4-3 (stash-baseline confirmed). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, round 2): RESIDUAL de-dup guard evasion — `IMPORTS_SHARED_VIEW` in `src/shared/tests/view-integer-scale.test.ts` matches a type-only `import { type Fit } from '@shared/view'`, so a game keeping only the type import while re-implementing the raster math in a 2-statement form (evading `NESTED_SCALE`) passes all three de-dup guards (reproduced: 21/21 green under the mutant). Cheap fix: slice each game's `fitIntegerScale` function BODY (the bounded-slice technique already used for `view.ts`) and assert it contains a CALL to the shared binding (`fitIntegerScaleShared(` / the aliased local name), so a non-delegating body reddens. Narrow/adversarial (the realistic re-duplication is already caught); fold into a future de-dup-guard hardening or SH3-6's test rework. *Found by Reviewer during round-2 code review.*
- **Process** (non-blocking, round 2): parallel reviewer mutation-testing subagents (`test-analyzer`, `rule-checker`) mutated `src/shared/view.ts` + game `layout.ts` in the SHARED main working tree simultaneously, causing `reviewer-preflight` to sample a mutated `view.ts` and report a FALSE `CRITICAL` (phantom helpers `_leftoverScaleHelper`/`computeScaleElsewhere`) and a `/tmp/*.bak` collision. Committed code verified correct (582/582 on the quiescent tree). Future reviews should run mutation subagents in isolated git worktrees. *Found by Reviewer during round-2 code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **AC-4 joust fold: COMPLETED (not descoped)**
  - Spec source: .session/SH4-3-session.md, AC-4
  - Spec text: "joust fold is EITHER completed (viewport reconciled onto the shared fn with joust's clamp/return-shape behavior preserved — no render regression) OR explicitly descoped"
  - Implementation: `plugins/joust/src/shell/render.ts` `viewport()` now calls `fitIntegerScale(vw, vh, LOGICAL_WIDTH, LOGICAL_HEIGHT)` and returns `{scale: fit.scale, offsetX: Math.max(0, fit.dx), offsetY: Math.max(0, fit.dy)}` — joust's own return shape and its ≥0 offset clamp are reapplied at the call site
  - Rationale: chose the AC's preferred "completed" branch because the fold is behaviour-preserving — `Math.min(floor,floor) === floor(min)` for positive reals (scale unchanged), and joust's only divergence (the offset clamp) is reapplied locally. joust's viewport tests (render.test.ts:70-93) only assert offsets at a super-logical viewport where the clamp is a no-op, and all pass; the third duplicate of the integer-scale math is removed, delivering the epic's value
  - Severity: none (behaviour identical)
  - Forward impact: joust's `viewport` now depends on `@shared/view`; the return shape `{scale, offsetX, offsetY}` is unchanged for its callers
- **Adoption shape: thin 2-arg per-game bindings (not call-site rewrites)**
  - Spec source: .session/SH4-3-session.md, AC-3 + Delivery Finding "keep centipede's existing 2-arg call sites green"
  - Spec text: "centipede and pac-man adopt the shared export ... their local fitIntegerScale duplicate is removed, and BOTH games' existing vitest suites stay GREEN"
  - Implementation: each game's `shell/layout.ts` keeps `export function fitIntegerScale(cw, ch)` as a one-line delegate to `@shared/view.fitIntegerScale(cw, ch, LOGICAL_W, LOGICAL_H)`, and re-exports `type Fit` from `@shared/view`. The byte-identical `Math.max(1, Math.floor(Math.min(...)))` body is gone from both.
  - Rationale: preserves every existing 2-arg call site (main.ts + centipede layout.test.ts) with zero churn — "keep the NUMBERS local, share the VERB"; touched no game test
  - Severity: minor
  - Forward impact: none — the shared 4-arg fn is the single home; games bind their own logical dims

### TEA (test design)
- **AC-4 (joust fold) pinned as ADVISORY feasibility, not a mandatory RED test**
  - Spec source: .session/SH4-3-session.md, AC-4
  - Spec text: "joust fold is EITHER completed ... OR explicitly descoped with a one-line rationale"
  - Implementation: the `joust fold feasibility` group proves the shared fn CAN reproduce joust's scale and documents the offset-clamp divergence; it does NOT assert joust adopts the shared fn or that joust's local `viewport` is removed
  - Rationale: AC-4 is explicitly optional, so a hard RED "joust must adopt" test would over-constrain a design decision the AC leaves to Dev/Architect; the advisory tests give them measured numbers to decide from
  - Severity: minor
  - Forward impact: if Dev folds joust, add a joust-side adoption/reconciliation test in GREEN; if Dev descopes, record the one-line rationale in the session
- **AC-5 (lint + orchestrator suite) not covered by a unit test**
  - Spec source: .session/SH4-3-session.md, AC-5
  - Spec text: "`npm run lint` (repo-wide tsc) clean, and the orchestrator suite green"
  - Implementation: no vitest test added for this; it is a build/CI gate verified by `pf check` / `npm run lint` / `npm run test:orchestrator` at the GREEN and quality-pass gates
  - Rationale: these are toolchain gates, not unit-testable behaviours; the pipeline already runs them
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **TEA: "AC-4 pinned as ADVISORY feasibility, not a mandatory RED test"** → ✗ FLAGGED by Reviewer: the advisory approach is defensible in principle, but it was built on a FALSE premise — the block's own comment claims joust's `render.ts` "is a DOM shell module (NOT imported)", which the rule-checker disproved by importing it live. Because no other test exercises joust's real `viewport()` clamp, AC-4's behaviour-preservation ends up verified against a hand-copied formula, never the shipped code. The advisory framing is acceptable ONLY if the real path is pinned elsewhere; it is not. This is the round-1 HIGH (see severity table).
- **TEA: "AC-5 (lint + orchestrator suite) not covered by a unit test"** → ✓ ACCEPTED by Reviewer: correct — these are toolchain gates, run by the pipeline; a unit test would be inappropriate.
- **Dev: "AC-4 joust fold: COMPLETED (not descoped)"** → ✓ ACCEPTED by Reviewer (for the CODE): the fold is behaviour-identical to the old `viewport` across 52,061 verified points; choosing the "completed" branch honours the story intent. The defect is not the fold — it is that its verification does not touch the shipped path (flagged above).
- **Dev: "Adoption shape: thin 2-arg per-game bindings"** → ✓ ACCEPTED by Reviewer: preserves every existing call site with zero churn, keeps per-game logical constants local (share-the-VERB), and the delegation is mutation-confirmed. Sound.

**Round-2 audit update:** the round-1 FLAG above (TEA AC-4 advisory built on a false premise) is now **RESOLVED** — round-2 red imported joust's real `viewport()` and pinned its clamp on the shipped path (mutation-verified), so AC-4 is verified against real code, not a re-derivation. The TEA and Dev round-2 changes introduced no new deviations. No open flags remain.

## SM Assessment

**Story shape:** title-only, 3pt, tdd/phased. The title IS the spec, so I measured
every falsifiable clause against the tree before setup (2026-08-09). Five of six clauses
held; one — the SH3-4 supersede/sequence clause — had gone stale and is recorded as
moot in Background (Fact 4) and behind a ⚠ banner in the context file.

**Decisions:**
- **Proceed without a user ruling.** No backlog-shape / either-or question exists here —
  the scope (extract → adopt in centipede + pac-man → evaluate joust fold) is
  unambiguous once the stale clause is set aside. No refuted premise, unlike jt8-6/mg1-2.
- **Joust fold left as an in-story design question (AC4), not a separate story.** Its
  `viewport()` differs in return shape and offset-clamp behavior; reconcile without a
  render regression or descope with a one-line rationale. Architect/TEA/Dev call.
- **Parameterization (Fact 2) is the one real design decision** — the shared export must
  take logicalW/logicalH as args because the two games' logical dims differ.

**Handed to TEA (RED):** authoritative Background (6 measured facts) + ACs live in this
session file; the context file points here and carries the stale-clause banner. Two
things TEA must not misread as regressions: the SH3-6 pac-man source-wiring test will
redden on the import re-point (update the anchor — Fact 5), and a determinism/render
change to any adopting game is a real regression per the epic bar, not a refactor.

**Board hygiene:** sibling probes clean at setup (a-2 on mc5, a-3 on sw10 — none touch
sh4). Story stamped `in_progress` (started 2026-08-09). Claim branch pushed empty →
enriched, so `git branch -r | grep SH4-3` lights up for siblings. The phase pointer read
`setup` on arrival; exit protocol advances it to `red` (owner: TEA).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Behavioural extraction into shared code — the epic mandates every lifted symbol be pinned by a shared test, and the games' behaviour must be provably unchanged.

**Test Files:**
- `src/shared/tests/view-integer-scale.test.ts` — the shared pin for the lifted `fitIntegerScale`: parameterized geometry, an independent oracle sweep, reconciliation with centipede (240×256) + pac-man (224×288) goldens, de-duplication guards over both games' `layout.ts`, a degenerate-viewport no-NaN check, the negative-offset contract, and advisory joust-fold feasibility.

**Tests Written:** 17 tests covering AC-1, AC-2, AC-3 (behaviour + adoption), and AC-4 (advisory). AC-5 is a toolchain gate (see Design Deviations).
**Status:** RED (17 failing — 12 on the missing `@shared/view` export, 3 de-dup guards on the byte-identical body still present in the games / absent from view.ts, 2 joust-feasibility on the missing export). Verified honest: the de-dup guards fail with `AssertionError`, proving their game-file reads resolve and find the current duplication — not path errors.

**Baselines (pre-Dev):** shared 561 other tests green · centipede 1270/1270 · pac-man 277/277.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | existing `view.test.ts` scans view.ts for `as any`/`@ts-ignore` (covers the new export in the same file) | n/a (green guard) |
| #15 source-text guard anchors the DECLARATION, not a token | de-dup guards anchor to the nested `Math.max(1, Math.floor(Math.min(` scale expression + `export function fitIntegerScale`, comment-stripped first | failing |
| #21 degenerate-but-not-nullish numeric input | `a zero-width container yields scale 1 and finite fields (no NaN)` | failing |
| #25 positive source anchor over a whole file | de-dup uses a NEGATIVE guard (absence is absence) over each game file; the one positive anchor (`export function fitIntegerScale` in view.ts) is the symbol the module declares, by design | failing |
| #26 assertion terms all local to the test | avoided — goldens are hand-computed and independently cross-checked against the oracle (15/15) via a throwaway node run; the parameterization test drives the fn with two logical sizes so no assertion is an identity | failing |

**Rules checked:** 5 of the lang-review checks are applicable to a pure-arithmetic extraction (the React/async/error/input-validation/enum families do not apply); each applicable one has coverage.
**Self-check:** 0 vacuous tests. Every test asserts a concrete value or a genuine absence; the goldens were validated against an independent oracle before commit (a Dev bug in either would be caught, not masked).

**Handoff:** To Dev (Loki Silvertongue) for GREEN. Start points: implement `fitIntegerScale(containerW, containerH, logicalW, logicalH): Fit` in `src/shared/view.ts` (keep `Fit` shape `{scale,dx,dy,width,height}`); adopt in centipede + pac-man, removing the duplicated body (a thin 2-arg per-game binding keeps existing call sites green — see Delivery Findings); decide the joust fold (fold with clamp preserved, or descope with a one-line rationale). No hardened SH3-6 anchor to fight — Fact 5 was corrected (see Delivery Findings).

### Red Phase — Round 2 (rework after review REJECT)

**Trigger:** Reviewer round-1 REJECT — the shipped code was proven correct, but the tests had integrity gaps. Addressed the confirmed findings (test-only changes; NO production logic changed this round).

**Changes to `src/shared/tests/view-integer-scale.test.ts`:**
- **[HIGH → fixed]** The joust-fold block re-derived joust's clamp and claimed "render.ts is a DOM shell module (NOT imported)" — that comment was FALSE (render.ts references `CanvasRenderingContext2D` only as an erased type; it imports and runs in node). Now the test IMPORTS joust's real `viewport` from `plugins/joust/src/shell/render.ts` (probe-verified) and pins its `Math.max(0,…)` clamp on the shipped code path (`viewport(100,100)` → `{scale:1, offsetX:0, offsetY:0}`). **Mutation-verified:** dropping joust's clamp (`Math.max(0, fit.dx)` → `fit.dx`) reddens this test.
- **[MEDIUM → fixed]** Added a POSITIVE delegation anchor to the AC-3 de-dup block: each game's `layout.ts` must import from `@shared/view` AND re-export `fitIntegerScale`. Closes the 2-statement-rewrite evasion the negative shape-regex alone allowed. **Mutation-verified:** removing centipede's `@shared/view` import reddens the delegation anchor (while the negative guard alone would have passed).
- **[MEDIUM → fixed]** Bounded the `view.ts` positive source anchor to the `fitIntegerScale` declaration slice (code on both sides) instead of matching the whole file (lang-review #25).
- **[LOW → fixed]** Added trusted-constant contract tests: non-positive logical dims are unguarded by design (0/0 → NaN; negative dim → negative width), pinning current behaviour so a future guard is a deliberate, visible change.

**Left for Dev (green, this round):**
- **[LOW DOC]** `src/shared/view.ts:10-18` module header says it "owns both halves" and lists TWO primitives — now three (`fitIntegerScale`). Update the header. (Production comment — Dev's edit, not TEA's.)
- **[LOW DOC → routed to SH3-6, NOT this story]** `plugins/pac-man/tests/shell/main-host-adoption.test.ts:12,90` "pac-man's OWN fitIntegerScale" is now a shared binding; SH3-6 already reworks that file and should absorb the reword.

**Status:** hardened guards GREEN against correct code (shared 582/582, lint clean); both new guards mutation-verified non-vacuous. These are regression guards on already-correct behaviour (the reject was test-integrity, not a code bug), so this rework round produces no RED against HEAD — the RED is against the mutations (proven above).

**Handoff:** To Dev (Loki Silvertongue) for GREEN — one LOW doc-header edit + re-run the gates.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shared/view.ts` — new `fitIntegerScale(containerW, containerH, logicalW, logicalH): Fit` + the `Fit` interface, parameterized on logical dims (Fact 2), distinct from the fractional `letterbox` (Fact 3)
- `plugins/centipede/src/shell/layout.ts` — byte-identical body removed; `fitIntegerScale(cw, ch)` is now a one-line delegate to the shared fn with centipede's 240×256; re-exports `type Fit`
- `plugins/pac-man/src/shell/layout.ts` — same: delegate to the shared fn with pac-man's 224×288 (derived from MAZE); re-exports `type Fit`
- `plugins/joust/src/shell/render.ts` — AC-4 fold: `viewport()` delegates to the shared fn and reapplies joust's `Math.max(0, …)` offset clamp (behaviour-preserving)

**AC coverage:** AC1 ✓ (parameterized shared export) · AC2 ✓ (pinned by `src/shared/tests/view-integer-scale.test.ts`) · AC3 ✓ (centipede + pac-man adopt; duplicate bodies gone; suites green) · AC4 ✓ **completed** (joust folded, no regression) · AC5 ✓ (`npm run lint` clean; orchestrator delta is +1, see Delivery Findings)

**Tests:** shared 578/578 (incl. 17 new) · centipede 1270/1270 · pac-man 277/277 · joust: fold green (the 2 remaining joust reds are pre-existing jt10-6, proven by stash-baseline) · lint (tsc --noEmit) clean · orchestrator 453 pass / 3 pre-existing fail (all `epic-jt9.yaml`-removed staleness; my change fixed 1 net).
**Branch:** feat/SH4-3-shared-fitintegerscale-letterbox (pushed)

**Handoff:** To Reviewer (Heimdall) for code review.

### Green Phase — Round 2 (rework after review REJECT)

**Only change this round:** the LOW DOC finding — `src/shared/view.ts:10-18` module header said it "owns both halves" and listed two primitives; updated to "three primitives" with a `fitIntegerScale` summary. Comment-only, no behaviour change. (The HIGH/MEDIUM findings were all test-integrity, fixed by TEA in round-2 red — see the Round-2 TEA note.)

**Deviations:** none new this round (`### Dev (implementation)` in Design Deviations stands).

**Tests after round-2:** shared 582/582 · centipede+pac-man 1547/1547 · lint clean. The joust fold + centipede/pac-man delegation remain behaviour-identical (unchanged code); the 2 pre-existing joust `difficulty-wiring` reds and 3 orchestrator `epic-jt9.yaml` reds persist (unrelated, filed/flagged).

**Handoff:** To Reviewer (Heimdall) for round-2 review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 SH4-3-caused (5 pre-existing, unrelated) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (105k-point behaviour-identity sweeps of joust + centipede/pac-man; degenerate-input analysis) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — N/A (pure arithmetic, no error paths to swallow) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 3 (joust real-path clamp, de-dup positive anchor, zero-dim contract), 1 dismissed (joust re-derive = by-design, but folded into RULE#18), 2 noted LOW (oracle relabel, fractional/tie) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (both LOW/med DOC — pac-man test comment, view.ts header) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer + rule-checker #2/#5 (readonly Fit; `export type { Fit }` type-only re-exports correct) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure numeric geometry; no input/secret/auth/tenant surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (one-line delegating wrappers; minimal) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4 (RULE#17 false comment, #18 re-derive vs import, #25 ×2 whole-file positive anchors); independently mutation-tested the de-dup + arithmetic guards live |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 9 confirmed (1 High, 3 Medium, 5 Low), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

The shipped production code is correct — I proved `fitIntegerScale` and the joust fold are behaviour-identical to the retired per-game implementations across ~105,000 input points (joust old-vs-new `viewport`: 52,052 grid + 9 named boundaries, 0 mismatches; centipede+pac-man delegation: 52,540 points, 0 mismatches), and the rule-checker independently mutation-tested the guards (floor→ceil reddens 6 tests; reinstating a game's nested body reddens the de-dup guard). Lint is clean; the 5 tree failures are pre-existing and unrelated (jt10-6 + removed epic-jt9.yaml), confirmed by stash-baseline.

**But the tests for the story's own headline deliverable rest on a FALSE claim.** The AC-4 joust-fold test block re-derives joust's offset-clamp inline (`joustOffset`) instead of importing the real `viewport()`, and justifies it with a comment asserting "render.ts is a DOM shell module (NOT imported)". The rule-checker disproved that by *importing render.ts live in node* — `viewport()` runs with no DOM. So AC-4's behaviour-preservation is verified only against a hand-copied formula, never against joust's shipped code path, and joust's own suite asserts offsets only at a super-logical viewport where the clamp is a no-op. A future edit that drops or inverts joust's `Math.max(0, …)` clamp passes the entire suite. That is a real coverage hole on the deliverable, produced by a false mechanism claim (lang-review #17, a stated rule I may not dismiss).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[TEST][RULE]` AC-4 joust fold is NOT verified on joust's real code path; the `joustOffset` re-derivation + the "render.ts can't be imported (DOM shell module)" comment are FALSE — render.ts imports and runs in node (rule-checker proved it live). Joust's own suite (`render.test.ts:92`) asserts only `.scale` at the sub-logical viewport, so the clamp is unpinned. | `src/shared/tests/view-integer-scale.test.ts:236-262` (esp. :239 comment, :241 `joustOffset`); gap also in `plugins/joust/tests/render.test.ts:91-94` | Import the real `viewport` from `plugins/joust/src/shell/render.ts` (it IS importable) and assert its output, OR add to joust's own `render.test.ts` a `viewport(100,100)` case asserting `offsetX===0 && offsetY===0`. Pin the clamp on shipped code, not a re-derived copy. Fix the false comment. |
| [MEDIUM] | `[TEST]` The AC-3 de-dup guard (`NESTED_SCALE` negative match) is mutation-unsound and has no POSITIVE delegation anchor: a 2-statement rewrite (`const raw = Math.floor(Math.min(…)); const scale = Math.max(1, raw)`) re-duplicates the math while passing, and nothing asserts the games actually import/call `@shared/view`. | `src/shared/tests/view-integer-scale.test.ts:209,214,218` | Add a positive anchor: assert each game's stripped `layout.ts` contains `from '@shared/view'` AND a `fitIntegerScale(` call site — prove delegation, not just absence of one old shape. |
| [MEDIUM] | `[RULE]` Two POSITIVE source anchors match against the WHOLE `view.ts` (lang-review #25) — they verify the file compiles/exports a name, not that the impl is correct. | `src/shared/tests/view-integer-scale.test.ts:223-224` | Bound the slice to the `fitIntegerScale` declaration, or drop them (the behaviour tests already prove correctness). |
| [LOW] | `[TEST][EDGE]` The "degenerate viewport does not leak NaN" test covers only a zero-width CONTAINER; a zero/negative LOGICAL dim (`fitIntegerScale(0,800,0,256)` → all-NaN) is untested. Unreachable today (logical dims are per-game constants), but the shared fn's contract is now broader. | `src/shared/tests/view-integer-scale.test.ts:172-183` | Add a zero/negative logical-dim case and DECIDE the contract: guard non-positive dims, or explicitly assert the current NaN behaviour so a future fix is deliberate. |
| [LOW] | `[DOC]` `view.ts` module header says it "owns both halves once" and lists two primitives, but this diff adds a third (`fitIntegerScale`) — the header undercounts its own surface. | `src/shared/view.ts:10-18` | Update to "three primitives" and add a one-line summary of `fitIntegerScale`. |
| [LOW] | `[DOC]` pac-man's untouched adoption test still says "KEEP pac-man's OWN fitIntegerScale" — after SH4-3 it delegates to `@shared/view`. Assertions still pass, but the own-vs-shared framing is now false. | `plugins/pac-man/tests/shell/main-host-adoption.test.ts:12,90` | Reword to "per-game binding (delegates to @shared/view.fitIntegerScale)", or fold into SH3-6 (already reworks this file) — see Delivery Findings. |

### Observations (tagged; all 8 domains covered — 5 subagents disabled, covered by Reviewer)

- `[RULE]` CONFIRMED false comment + weak positive anchors at `view-integer-scale.test.ts:239,223,224` (rule-checker, mutation-verified). See severity table.
- `[TEST]` CONFIRMED joust real-path clamp gap + de-dup positive-anchor gap (test-analyzer, corroborated by rule-checker #18). See severity table.
- `[DOC]` CONFIRMED two stale comments (comment-analyzer): `view.ts:10` header; pac-man adoption test framing.
- `[EDGE]` [VERIFIED] joust fold behaviour-identical to old `viewport` across 52,052 grid + 9 boundary points (0 mismatches); centipede/pac-man delegation identical across 52,540 points — evidence: my sweeps re-deriving the OLD formulas. Zero-container degenerate pinned (`test:172-183`); zero-logical-dim unreachable (per-game constants) but unpinned → LOW finding above.
- `[TYPE]` [VERIFIED] `Fit` fields are `readonly` (`view.ts:82-93`), matching `LetterboxRect`; `export type { Fit }` (`centipede layout.ts:38`, `pac-man layout.ts:17`) are type-only re-exports (no runtime code); no consumer mutates a `Fit` (grep clean). Complies with lang-review #2/#5.
- `[SEC]` [VERIFIED] `fitIntegerScale`/`viewport` take four plain `number` geometry args, return a plain object — no user/API input, no secrets, no auth/tenant surface. N/A by domain.
- `[SIMPLE]` [VERIFIED] each game binding is a one-line delegate; the joust fold is a net −17 lines; no dead code (`export type { Fit }` preserves each module's existing public API). Minimal.
- `[SILENT]` [VERIFIED] no try/catch, no fallbacks, no swallowed errors introduced — pure arithmetic. N/A by domain.

### Rule Compliance (lang-review typescript.md — exhaustive, via rule-checker + Reviewer)

29 rules checked over 71 instances across 5 changed `.ts` files. Compliant: #1 (no type escapes), #2 (readonly Fit), #5 (type-only re-exports; `.js`-extension split is a real repo convention under `moduleResolution: bundler` — NOT a violation), #7/#8 (test async + quality), #12 (named imports, not barrels), #15 (de-dup regex anchors the compound expression, comment-stripped, mutation-tested), #21 (reachable zero-container pinned), #24 (old bodies retired; no live stale citations — archived-session hits are historical), #26 (assertions include production output). Additional rules A1 (purity — `fitIntegerScale` pure; view.ts already a BROWSER subpath), A2 (share-the-VERB-keep-the-NUMBERS — all per-game logical constants stay local), A3 (lifted symbol pinned by shared test; adopting suites green) — all satisfied, verified live. **VIOLATIONS:** #17 (false mechanism comment, test:239), #18 (test-local reimplementation of importable joust logic, test:241), #25 ×2 (whole-file positive anchors, test:223-224).

### Devil's Advocate

Assume this is broken. The most dangerous property here is a *green suite that protects nothing on the exact code the story exists to change.* Joust's `viewport()` is the AC-4 deliverable, and NOTHING executes it against its clamp: `render.test.ts:92` reads only `.scale` at `(100,100)`, and its one offset test sits at `(1000,800)` where `Math.max(0, dx)` is a no-op. So a maintainer who "simplifies" joust by deleting the `Math.max(0, …)` clamp — plausible, since the shared fn's name implies it already centres — ships a game whose raster jumps off-screen on a shrunk window, and every test stays green. The new shared test *looks* like it covers this, but it compares the shared fn to a hand-retyped copy of joust's formula, and the comment swears the real function "can't be imported" — a claim that is simply false and was never run. That is the classic apparatus-fails-by-passing trap: the reason given for the weaker test is fiction. Next, the de-dup guard — the entire epic's safety net against re-duplication — matches one specific nesting shape; a contributor who writes the same arithmetic across two statements re-introduces the exact duplication SH4 is retiring, and the guard cheers. Finally the broadened contract: `fitIntegerScale` is now a public shared utility, and a future caller feeding it a zero logical dimension (a maze that failed to load, a config default of 0) gets `{scale: NaN, width: NaN, …}` with no guard and no test — silent geometry corruption. The code is correct today; the *tests* are one false comment and two weak anchors away from being decorative. Reject and pin the real paths.

**Handoff:** Back to TEA (red — test hardening; code is correct, no production logic change required).
---

## Subagent Results

_(Round 2 — re-review after rework)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (FALSE) | dismissed 1 — the "CRITICAL view.ts delegates to _leftoverScaleHelper/computeScaleElsewhere" failure was a TRANSIENT concurrent-mutation artifact: another mutation-testing subagent had view.ts mutated in the shared main tree when preflight sampled it. Verified on the quiescent tree: no such helpers exist, 582/582 green. |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — covered by Reviewer (round-1 105k-point sweeps still hold; no production logic changed round 2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — N/A (pure arithmetic) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | 3 of 4 round-1 findings VERIFIED RESOLVED by mutation (joust real-path clamp, view.ts bounded slice, zero-dim contract); 1 residual MEDIUM confirmed (de-dup positive anchor still matches a type-only `import { type Fit } from '@shared/view'`) — documented non-blocking |
| 5 | reviewer-comment-analyzer | Yes | clean | 0 | both round-1 DOC findings verified RESOLVED (view.ts "three primitives" header; false "DOM shell module" comment gone); all new comments accurate; pac-man test staleness confirmed untouched (routed to SH3-6) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — covered by Reviewer + rule-checker |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A (pure geometry) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — covered by Reviewer (test-only + comment change) |
| 9 | reviewer-rule-checker | Yes | clean | 0 | ALL round-1 violations (#17, #18, #25×2) RESOLVED and mutation-verified; cross-project import typechecks + violates no boundary rule; new de-dup anchors mutation-sound vs dropped-import/full-reimpl; 26 rules / 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed non-blocking (MEDIUM residual), 1 dismissed (preflight false alarm), 3 round-1 findings verified fixed

## Reviewer Assessment

_(Round 2 — APPROVED)_

**Verdict:** APPROVED

Round-2 rework fixed every blocking round-1 finding, and two independent mutation-testing subagents verified the fixes on the live tree:
- `[TEST]`/`[RULE]` **round-1 HIGH resolved** — the joust AC-4 fold now imports joust's REAL `viewport()` from `plugins/joust/src/shell/render.ts` (node-importable; the false "DOM shell module" comment is gone) and pins its `Math.max(0,…)` clamp on the shipped path. Mutation-verified by me AND both subagents: dropping joust's clamp reddens `joust's real viewport() CLAMPS sub-logical offsets to 0`.
- `[RULE]` **lang-review #25 resolved** — the `view.ts` positive anchor is now bounded to the `fitIntegerScale` declaration slice (decl→next-export, `-1` guarded); mutation-verified (relocating the math to a helper reddens). rule-checker: 0 violations across 26 rules.
- `[DOC]` **both resolved** — `view.ts` header now lists three primitives incl. `fitIntegerScale`; comment-analyzer clean.
- `[TEST]` **one residual MEDIUM, non-blocking (documented)** — the AC-3 de-dup positive anchor `IMPORTS_SHARED_VIEW` matches a *type-only* `import { type Fit } from '@shared/view'`, so a deliberate type-only-import + 2-statement reimplementation evades all three guards. I reproduced it (21/21 still pass under the mutant). NARROW/adversarial: the guard DOES catch the realistic re-duplication (obvious contiguous inline math via `NESTED_SCALE`; a dropped import; a deleted export). See Delivery Findings for the cheap fix.
- `[EDGE]` [VERIFIED] no production logic changed in round 2; the round-1 behaviour-identity proofs (joust 52,061 pts, centipede/pac-man 52,540 pts, 0 mismatches) still hold; zero-dim contract now pinned.
- `[TYPE]` [VERIFIED] `Fit` readonly + `export type { Fit }` unchanged and correct (rule-checker #2/#5 clean).
- `[SEC]` [VERIFIED] pure numeric geometry — no input/secret/auth surface. N/A.
- `[SIMPLE]` [VERIFIED] round-2 changes are test-hardening + a one-block comment; no complexity added.
- `[SILENT]` [VERIFIED] no error paths introduced. N/A.

**Process note (not a code finding):** the two mutation-testing subagents (test-analyzer, rule-checker) mutated `src/shared/view.ts` and game `layout.ts` IN THE SHARED MAIN WORKING TREE in parallel, which (a) made preflight sample a mutated `view.ts` and report a false CRITICAL, and (b) caused a `/tmp/*.bak` collision the rule-checker had to recover from. The committed code is correct (verified: `git checkout --` no-op on source; 582/582 on the quiescent tree). Future reviews with parallel mutation subagents should isolate each in a git worktree.

### Rule Compliance (round 2)

rule-checker re-ran the full typescript.md checklist over the 2 changed files: **0 violations** (26 rules). The round-1 violations #17 (false comment), #18 (test-local reimplementation), #25×2 (whole-file positive anchors) are all resolved and mutation-verified. Additional rules (purity, share-the-VERB-keep-the-NUMBERS, lifted-symbol-pinned + suites-green) satisfied. `npm run lint` clean; shared 582/582; centipede+pac-man 1547/1547; the only fleet reds are the pre-existing jt10-6 (joust) + removed-epic-jt9.yaml (orchestrator), unrelated.

### Devil's Advocate (round 2)

The one place this could still bite: the de-dup guard is the epic's safety net, and I proved it still has a hole — a contributor who re-implements the raster math across two statements while keeping only `import { type Fit }` from `@shared/view` re-duplicates the exact logic SH4 exists to retire, and every guard stays green. Is that grounds to block? The realistic regression is a maintainer copy-pasting the obvious `Math.max(1, Math.floor(Math.min(...)))` back in (caught by `NESTED_SCALE`) or deleting the delegation (caught by `IMPORTS_SHARED_VIEW`/`EXPORTS_FIT`). The surviving mutant requires deliberately writing the math in a non-idiomatic split form AND curating the import to type-only — a contortion no accidental regression takes. So the guard protects against the failure mode that actually occurs; the residual is a refinement, not an open door. The stronger risk was the round-1 joust coverage gap resting on a false comment — that is now closed against the real code. I am satisfied the material risks are pinned; the residual is filed, not ignored.

**Handoff:** To SM (Baldur the Bright) for finish-story.