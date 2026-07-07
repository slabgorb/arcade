---
story_id: "bz2-4"
jira_key: ""
epic: "bz2"
workflow: "tdd"
---
# Story bz2-4: Finer control sensitivity — improve turret/aim granularity for precise targeting

## Story Details
- **ID:** bz2-4
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Branch Strategy:** gitflow (feat/bz2-4-control-sensitivity)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T20:19:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T19:51:28Z | 2026-07-07T19:53:59Z | 2m 31s |
| red | 2026-07-07T19:53:59Z | 2026-07-07T20:05:01Z | 11m 2s |
| green | 2026-07-07T20:05:01Z | 2026-07-07T20:09:21Z | 4m 20s |
| review | 2026-07-07T20:09:21Z | 2026-07-07T20:19:05Z | 9m 44s |
| finish | 2026-07-07T20:19:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): the bz2-4 sprint YAML entry carried no `description` or `acceptance_criteria` — ACs were formalized during RED from the epic scope ("turret/aim granularity too coarse"). Affects `sprint/epic-bz2.yaml` (backfill ACs on the story if desired). *Found by TEA during test design.*
- **Improvement** (non-blocking): `src/shell/input.ts` emits only ±1/0 tread values, so keyboard turning is inherently binary — the fine-aim modifier fixes precise aiming, but a fuller future fix is an analog/ramped tread axis. Affects `battlezone/src/shell/input.ts` (future: ramped input). *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): the shell binds fine-aim to a held Shift but does not `preventDefault` it — a browser-level Shift interaction (e.g. Shift+arrow text selection) could in theory interfere; verify clean during the bz2-6 live playtest. Affects `battlezone/src/shell/input.ts` (add `preventDefault` only if the playtest shows interference). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `fineAim` is bound to Shift — an OS/browser-overloaded modifier (5× Shift triggers Windows Sticky Keys; Shift is not `preventDefault`'d). Verify no Sticky-Keys/focus interference during the bz2-6 playtest; consider a dedicated key if it misbehaves. Affects `battlezone/src/shell/input.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): the single-tread-arc case (nonzero drive AND yaw, e.g. `{leftTread:1,rightTread:0}`) is not tested under `fineAim:true`; the code is correct by construction (`turnScale` multiplies only the yaw term, never `v`), but the coverage gap should be closed by a follow-up test. Affects `battlezone/tests/core/aim-sensitivity.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): fine-aim scales yaw only, so holding Shift while driving a forward arc turns wider without slowing — a deliberate design choice; the bz2-6 playtest should confirm it feels right (many precision-aim modes also reduce forward speed). Affects `battlezone/src/core/movement.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 1 Question, 1 Improvement)
**Blocking:** None

- **Gap:** the bz2-4 sprint YAML entry carried no `description` or `acceptance_criteria` — ACs were formalized during RED from the epic scope ("turret/aim granularity too coarse"). Affects `sprint/epic-bz2.yaml`.
- **Improvement:** `src/shell/input.ts` emits only ±1/0 tread values, so keyboard turning is inherently binary — the fine-aim modifier fixes precise aiming, but a fuller future fix is an analog/ramped tread axis. Affects `battlezone/src/shell/input.ts`.
- **Question:** the shell binds fine-aim to a held Shift but does not `preventDefault` it — a browser-level Shift interaction (e.g. Shift+arrow text selection) could in theory interfere; verify clean during the bz2-6 live playtest. Affects `battlezone/src/shell/input.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`battlezone/src/shell`** — 2 findings
- **`sprint`** — 1 finding

### Deviation Justifications

3 deviations

- **Fine-aim implemented as a core `fineAim` modifier, not a shell tread rescale**
  - Rationale: core already yaws proportionally to the treads; the shell only emits ±1 treads, so the minimal deterministic, core-testable fix is a sensitivity modifier. It keeps the dual-tread scheme intact (same treads) — granularity layered on top — but it does add one modifier input, a judgment call flagged for Reviewer.
  - Severity: minor
  - Forward impact: Dev adds `fineAim?: boolean` to core Input + a shell key binding; Reviewer should confirm the chosen modifier key; bz2-6 playtest tunes `FINE_AIM_TURN_SCALE`.
- **Shell modifier-key binding is not unit-tested**
  - Rationale: repo house convention leaves `shell/input.ts` uncovered (its header: "Not unit-tested … verifies IO by running the game"); the deterministic behavior is fully pinned in core. End-to-end keyboard feel is a bz2-6 live-playtest AC.
  - Severity: minor
  - Forward impact: the actual key binding is verified only by the bz2-6 playtest + eyeball; Reviewer should sanity-check it by inspection.
- **Tests bound the tuning knob at `FINE_AIM_TURN_SCALE ≤ 0.5`**
  - Rationale: "finely enough" needs a floor to be a non-vacuous test — a 0.99× reduction is technically "less" but not usable; ≤ 0.5 guarantees a genuine fine control while leaving Dev/playtest room in (0, 0.5].
  - Severity: minor
  - Forward impact: if the bz2-6 playtest wants a factor > 0.5, relax this bound; otherwise none.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Fine-aim implemented as a core `fineAim` modifier, not a shell tread rescale**
  - Spec source: context-story-bz2-4.md — Technical Approach / Scope
  - Spec text: "this is about the granularity/sensitivity of the turn-rate mapping, not adding a new control scheme"
  - Implementation: RED pins a new optional `fineAim` Input flag + `FINE_AIM_TURN_SCALE` yaw multiplier in `stepTank` — a fine-aim MODIFIER layered on the existing dual-tread scheme (shell binds it to a modifier key).
  - Rationale: core already yaws proportionally to the treads; the shell only emits ±1 treads, so the minimal deterministic, core-testable fix is a sensitivity modifier. It keeps the dual-tread scheme intact (same treads) — granularity layered on top — but it does add one modifier input, a judgment call flagged for Reviewer.
  - Severity: minor
  - Forward impact: Dev adds `fineAim?: boolean` to core Input + a shell key binding; Reviewer should confirm the chosen modifier key; bz2-6 playtest tunes `FINE_AIM_TURN_SCALE`.
- **Shell modifier-key binding is not unit-tested**
  - Spec source: context-story-bz2-4.md — Acceptance Criteria (keyboard aiming)
  - Spec text: "a player can resolve aim finely enough to reliably line up a shot on a distant enemy"
  - Implementation: RED covers the core `stepTank` fine-aim behavior only; the `src/shell/input.ts` binding that SETS `input.fineAim` is not unit-tested.
  - Rationale: repo house convention leaves `shell/input.ts` uncovered (its header: "Not unit-tested … verifies IO by running the game"); the deterministic behavior is fully pinned in core. End-to-end keyboard feel is a bz2-6 live-playtest AC.
  - Severity: minor
  - Forward impact: the actual key binding is verified only by the bz2-6 playtest + eyeball; Reviewer should sanity-check it by inspection.
- **Tests bound the tuning knob at `FINE_AIM_TURN_SCALE ≤ 0.5`**
  - Spec source: context-story-bz2-4.md — Acceptance Criteria
  - Spec text: "a player can resolve aim finely enough … while coarse/fast traversal is not degraded"
  - Implementation: tests assert `0 < FINE_AIM_TURN_SCALE ≤ 0.5` rather than leaving the factor fully open.
  - Rationale: "finely enough" needs a floor to be a non-vacuous test — a 0.99× reduction is technically "less" but not usable; ≤ 0.5 guarantees a genuine fine control while leaving Dev/playtest room in (0, 0.5].
  - Severity: minor
  - Forward impact: if the bz2-6 playtest wants a factor > 0.5, relax this bound; otherwise none.

### Dev (implementation)
- No deviations from spec. Implemented TEA's contract exactly: optional `fineAim` on core `Input`, `FINE_AIM_TURN_SCALE = 0.25` (within the pinned (0, 0.5]), `stepTank` scales only the yaw, shell binds held Shift. `NO_INPUT` sets `fineAim: false` explicitly, matching the existing neutral-frame idiom (which already lists `start: false`).

### Reviewer (audit)
- **TEA-1 (core `fineAim` modifier, not shell tread rescale)** → ✓ ACCEPTED by Reviewer: sound — core-testable, deterministic, matches the optional-Input idiom; rule-checker confirmed purity and the core/shell boundary are intact.
- **TEA-2 (shell binding not unit-tested)** → ✓ ACCEPTED by Reviewer: house shell convention; the deterministic behavior is fully pinned in core; end-to-end feel is the bz2-6 playtest's job. The Shift-key choice is functional but OS-overloaded — see the non-blocking Improvement finding.
- **TEA-3 (tests bound `FINE_AIM_TURN_SCALE ≤ 0.5`)** → ✓ ACCEPTED by Reviewer: a sound floor for a non-vacuous "genuinely fine" assertion; Dev's 0.25 sits well within it.
- **Dev (no deviations from spec)** → ✓ ACCEPTED by Reviewer: verified — implemented exactly to TEA's contract (0.25 within bound, yaw-only scaling, Shift binding, `readonly` optional field). No undocumented deviations found in the diff.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioral core change (fine-aim yaw scaling) — deterministic and unit-testable in `src/core`.

**Test Files:**
- `battlezone/tests/core/aim-sensitivity.test.ts` — fine-aim modifier: turn-scale constant, yaw scaling on pure pivot, drive-untouched, determinism, non-breaking optional field.

**Tests Written:** 12 tests covering the formalized ACs (11 RED drivers + 1 backward-compat guard).
**Status:** RED — 11 failing on the missing `FINE_AIM_TURN_SCALE` contract; 1 passing (the `NO_INPUT` opt-in guard, correct-to-pass proving the optional extension is non-breaking). 755 pre-existing tests green, zero regressions.

### Acceptance Criteria (TEA-defined — YAML had none)

- **AC-1** Fine-aim engaged turns strictly LESS per input than coarse (finer resolution).
- **AC-2** Fine-aim step is meaningfully finer: `FINE_AIM_TURN_SCALE ≤ 0.5` (not a token reduction).
- **AC-3** Coarse turning is UNCHANGED — a pivot step still equals the full ROM `MAX_TURN_RATE·dt`; `fineAim:false` ≡ `fineAim` omitted (traversal not degraded).
- **AC-4** Fine-aim preserves turn DIRECTION (sign) and handedness — a precision modifier, not an inversion.
- **AC-5** Fine-aim scales AIM only — forward drive distance is identical with/without it (not a speed brake).
- **AC-6** Fine-aim stays pure + deterministic — a fixed input script replays identically.
- **AC-7** `fineAim` is an OPT-IN optional field — `NO_INPUT` does not engage it; existing Input literals are unaffected (non-breaking).
- **AC-8** `FINE_AIM_TURN_SCALE` is exported and `0 < s < 1`.

### Rule Coverage

| Rule (lang-review/typescript) | Test(s) | Status |
|---|---|---|
| #4 null/undefined — optional field, `??` not `\|\|` | `fineAim off (absent) and fineAim:false both give the coarse rate` | failing (RED) |
| #4 null/undefined — neutral-frame default | `NO_INPUT does not engage fine-aim` | passing (guard) |
| #8 test quality — meaningful, non-vacuous | drive test asserts `disp>0` before equality; every test asserts a value | self-checked |
| #2 readonly params | local `Input` mirrors core's `readonly` tread axes | passive |

**Rules checked:** 2 of 13 lang-review checks are applicable to a pure numeric core function (#4 null/undefined, #8 test quality; #2 readonly passively). React/async/security/enum/build checks are N/A.
**Self-check:** 0 vacuous tests — the drive-intact test guards against a hidden speed brake; all assertions check concrete values.

**Contract for Dev (GREEN):**
- `src/core/input.ts`: add optional `fineAim?: boolean` to `Input` (bz1-5 `fire` / bz1-10 `start` optional-extension idiom).
- `src/core/movement.ts`: `export const FINE_AIM_TURN_SCALE` (0 < s ≤ 0.5); scale the yaw rate by it in `stepTank` when `input.fineAim` is true. Forward speed + coarse turning untouched.
- `src/shell/input.ts`: bind a modifier key (e.g. Shift) to set `fineAim` (untested per shell convention — see deviation).

**Handoff:** To The Word Burgers (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/movement.ts` — export `FINE_AIM_TURN_SCALE = 0.25`; `stepTank` scales the yaw rate by it when `input.fineAim` is set (yaw ONLY — forward drive and coarse turning untouched).
- `battlezone/src/core/input.ts` — add optional `fineAim?: boolean` to `Input`; `NO_INPUT` sets it `false`.
- `battlezone/src/shell/input.ts` — hold Shift → `fineAim` (level read, like the treads).

**Tests:** 766/766 passing (GREEN), including the 12 in `tests/core/aim-sensitivity.test.ts`. `tsc --noEmit` clean.
**Branch:** feat/bz2-4-control-sensitivity (pushed to origin).

**AC coverage:** AC-1..8 all green — fine-aim turns strictly less (0.25×), coarse rate unchanged (full ROM `MAX_TURN_RATE`), direction/handedness preserved, drive unaffected, deterministic, opt-in optional field, `FINE_AIM_TURN_SCALE` exported in (0, 0.5].

**Wiring:** core → sim (`stepGame` threads `Input` to `stepTank` unchanged) → shell (`KeyboardTreads.read()` sets `fineAim` from Shift). End-to-end keyboard feel is verified by the bz2-6 live playtest (shell IO untested per house convention — see TEA + Dev findings).

**Handoff:** To Immortan Joe (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (766 pass, tsc clean, 0 smells) | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — manual edge pass done |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — manual pass done |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (all Low/Medium, non-blocking) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — manual doc pass done |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — manual type pass done |
| 7 | reviewer-security | Yes | clean (security-neutral) | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — manual simplify pass done |
| 9 | reviewer-rule-checker | Yes | clean (15 rules, 0 violations) | none | N/A |

**All received:** Yes (4 ran, 5 disabled via settings)
**Total findings:** 3 confirmed (all Low/Medium, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A tight, correct change: an optional `fineAim` modifier that scales the tank's yaw to a quarter rate while leaving coarse turning and forward drive at the full ROM feel. 766/766 tests green, tsc clean, purity sweep green, security-neutral, zero rule violations. All findings are Low/Medium and non-blocking. No Critical/High.

### Observations (dispatch tags)

- **[VERIFIED]** Optional-extension idiom followed — `readonly fineAim?: boolean` (`src/core/input.ts:41`) mirrors `readonly start?: boolean`; rule-checker #2 confirms `readonly`. Complies with the non-breaking-Input convention (bz1-5 `fire`, bz1-10 `start`).
- **[VERIFIED]** Purity preserved — `stepTank` (`src/core/movement.ts:105-108`) reads `input.fineAim` as data only; `tests/core/core-purity-sweep.test.ts` passes (bans DOM/clock/random in `src/core`). Complies with CLAUDE.md core-purity rule.
- **[VERIFIED]** core/shell boundary intact — the Shift binding lives only in `src/shell/input.ts:79`; `grep 'shift'` in `src/core` returns zero (rule-checker #15). Complies with CLAUDE.md device-bindings-in-shell rule.
- **[VERIFIED]** Fine-aim scales yaw ONLY — `v` (`movement.ts:105`) has no `turnScale`; `turnScale` multiplies the yaw term alone (`:108`). Matches AC-5 (not a speed brake).
- **[VERIFIED]** Wiring end-to-end — Shift → `KeyboardTreads.read()` sets `fineAim` → `main.ts:118` `stepUnlessPaused` → `stepGame` → `stepBattle` → `stepTank`; the `input` object carries `fineAim` untouched the whole way.
- **[EDGE]** (disabled — manual) Enumerated: `undefined`/`false` → coarse (tested), `true` → 0.25× (tested), extreme treads finite (movement.test.ts), scale-constant bounds (tested). Single-tread arc under `fineAim` is the one unexercised path — see [TEST] below; correct by construction.
- **[SILENT]** (disabled — manual) No swallowed errors: the test loader's empty `catch` blocks are immediately superseded by explicit `CONTRACT` throws (rule-checker #7/#11); no silent fallbacks in source.
- **[TEST]** test-analyzer: 3 findings — (1) single-tread-arc untested under `fineAim` [Medium, non-blocking, code correct by construction]; (2) local `Input` types `fire?` optional vs real required [downgraded to Low — rule-checker verified this as the sanctioned reduced-contract idiom, tsc-clean, `fire` unused]; (3) weak `NO_INPUT` assertion [Low, intentional per opt-in AC, not vacuous]. All confirmed as non-blocking.
- **[DOC]** (disabled — manual) Header changelogs in `input.ts`/`movement.ts`/`shell/input.ts` updated accurately; `FINE_AIM_TURN_SCALE` doc-comment matches behavior. No stale comments.
- **[TYPE]** (disabled — manual) `fineAim?: boolean` `readonly` optional; `FINE_AIM_TURN_SCALE: number`; no stringly-typed APIs or unsafe casts in source (rule-checker #1/#2).
- **[SEC]** security: clean — security-neutral (offline canvas game, no network/auth/tenant/secret boundary).
- **[SIMPLE]** (disabled — manual) Minimal implementation: one ternary + one multiplier. No over-engineering, no dead source code (the only unused symbol is the `fire?` field in the test's local type — noted under [TEST]).
- **[RULE]** rule-checker: 15 rules / 30 instances / 0 violations, including the `??`-vs-`||` and `as unknown as` scrutiny points.

### Rule Compliance (lang-review/typescript + CLAUDE.md core/shell)

| Rule | Instances in diff | Verdict |
|------|-------------------|---------|
| #1 type-safety escapes | `as unknown as Partial<>` (test loader ×2) | Compliant — house idiom, purity-sweep-exempt in tests; none in source |
| #2 readonly / generics | `readonly fineAim?: boolean`; local test `Input` fields | Compliant — all `readonly`; no `Record<string,any>`/`Function` |
| #4 null/undefined (`??` vs `\|\|`) | `input.fineAim ? SCALE : 1`; `noInput.fineAim ?? false` | Compliant — boolean truthy check; `undefined`≡`false`≡coarse |
| #5 module/import | `import type { Input }` (movement, shell) | Compliant — type-only; `bundler` resolution, no `.js` needed |
| #8 test quality | 12 new tests; local `Input` reduced contract | Compliant — non-vacuous, src imports, reduced-contract idiom |
| CLAUDE.md core-purity | `FINE_AIM_TURN_SCALE`, `stepTank` | Compliant — pure; purity sweep green |
| CLAUDE.md shell-owns-IO | `held('shift')` in shell only | Compliant — zero device awareness in core |

### Devil's Advocate

Argue it's broken. First, the modifier key: `fineAim: this.held('shift')` binds precision-aim to Shift — the single most OS-overloaded key on the keyboard. On Windows, tapping Shift five times pops the Sticky Keys accessibility dialog, which steals focus; a player toggling fine-aim rapidly could trip it, and since the shell never `preventDefault`s, the `keyup` for a held Shift can be lost on focus theft — leaving `fineAim` stuck true so *all* subsequent turning silently drops to quarter-rate. The player wouldn't see an error; the tank would just feel mysteriously sluggish to aim, the exact opposite of the story's intent. That's a real confusion vector, though it's the same stuck-key class the shell already tolerates for the treads, and it's a live-feel issue the bz2-6 playtest owns, not a logic defect. Second, the untested single-tread arc: holding Shift while driving a forward-and-turning arc (friendly Up+Left) scales the yaw to 0.25× but leaves forward speed at full — the tank barrels forward while barely turning, which a stressed player yanking the stick could read as "steering broke." No test pins this path, so a future refactor that accidentally coupled `turnScale` into `v` would not be caught here. I read `movement.ts:105-108` to confirm the current code cannot have that coupling — `v` is computed before `turnScale` exists and never references it — so today it is correct, but the coverage hole is real. Third, could a malicious or confused user break it? There is no attack surface: offline, no network, no persistence, no free-form input — `held('shift')` is a bounded Set membership test. Numerically, `0.25` is a constant with no NaN/overflow path (finiteness under extreme treads is already pinned in movement.test.ts). Nothing here rises to Critical/High; the sharpest edges are all UX questions the playtest is designed to answer. Verdict stands: APPROVED, with three non-blocking findings routed to bz2-6.

**Data flow traced:** Shift keydown → `KeyboardTreads.read()` `fineAim=held('shift')` → `main.ts:118` `stepUnlessPaused` → `stepGame` → `stepBattle` → `stepTank` `turnScale=0.25` scales yaw. Safe: bounded boolean, no external boundary, pure sim.
**Pattern observed:** non-breaking optional-`Input`-extension + core-scaled modifier — `src/core/input.ts:41`, `src/core/movement.ts:108`. Followed correctly, consistent with bz1-5/bz1-10.
**Error handling:** no throw paths in source; `undefined` `fineAim` degrades gracefully to coarse (`movement.ts:108`). Test loaders convert missing exports to explicit CONTRACT errors, never silent.
**Handoff:** To The Organic Mechanic (SM) for finish-story. Three non-blocking findings recorded for the bz2-6 playtest.

## Sm Assessment

**Story:** bz2-4 — Finer control sensitivity — improve turret/aim granularity for precise targeting
**Repo:** battlezone · **Branch:** feat/bz2-4-control-sensitivity (base: develop, gitflow) · **Workflow:** tdd (phased) · **Points:** 3 · **Priority:** p2

**Scope (from bz2 playtest-followup epic, verbatim):** "tank turret/aim control granularity is too coarse to aim precisely." A live playtester couldn't resolve aim finely enough to line a shot on a distant enemy — each input steps the turret/heading too far, so the crosshair skips past the target. This is a **control-feel / input-granularity** bug in the tank steering, NOT enemy AI or spawn geometry (those were bz2-9 / bz2-10, both done).

**Likely surface area (discovery, not a design):** tank turn/aim input handling — deterministic steering in `battlezone/src/core`, and/or the input mapping in `src/shell`. The dual-tread steering model already exists; this is about the granularity of the turn-rate mapping, not a new control scheme. Keep the sim change in `core` so it's testable.

**For TEA (RED phase):** Formalize ACs anchored to epic intent — a player can resolve aim finely enough to reliably line up a shot on a distant enemy that previously couldn't be targeted, while coarse/fast traversal is NOT degraded (fine control must not make normal turning sluggish). Context enriched at `sprint/context/context-story-bz2-4.md`.

**No blockers.** Table is clean — no open PRs, nothing else in progress. Handing to Furiosa for RED.