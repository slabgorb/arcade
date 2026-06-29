---
story_id: "10-14"
jira_key: null
epic: "10"
workflow: "tdd"
---
# Story 10-14: Superzapper empty-board behavior: restore Story-5-1/4-1 semantics (no activate event on empty press; weak shot with no target is wasted-but-not-spent) OR pin the new windowed behavior with tests + a deviation. Regression surfaced in 10-2 review (stepZap dropped the enemies.length===0 early-return).

## Story Details
- **ID:** 10-14
- **Jira Key:** null
- **Epic:** 10
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 2
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T22:25:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T22:01:55+00:00 | 2026-06-29T22:03:35Z | 1m 40s |
| red | 2026-06-29T22:03:35Z | 2026-06-29T22:12:42Z | 9m 7s |
| green | 2026-06-29T22:12:42Z | 2026-06-29T22:16:59Z | 4m 17s |
| review | 2026-06-29T22:16:59Z | 2026-06-29T22:25:43Z | 8m 44s |
| finish | 2026-06-29T22:25:43Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.**

- **Story:** 10-14, a 2-point regression bug in `tempest` (epic 10, ROM-accurate fidelity gaps). No Jira (`jira: null`); tracked locally.
- **Origin:** Regression surfaced in the 10-2 review — `stepZap` dropped the `enemies.length === 0` early-return, changing Superzapper empty-board behavior.
- **The decision TEA owns:** either (a) restore Story-5-1/4-1 semantics — no `activate` event on an empty-board press, and a weak shot with no target is *wasted-but-not-spent* — OR (b) deliberately pin the new windowed behavior with tests plus a logged design deviation. TEA defines the acceptance criteria during RED based on which path the implementation/spec supports.
- **Pre-flight verified:** merge gate clear (no open PRs in any repo), no other active session, branch `feat/10-14-superzapper-empty-board` cut from `origin/develop` in tempest, session + context files present.
- **Scope guard:** changes confined to the Superzapper empty-board path in tempest's core sim (`stepZap` and its tests). No render/audio/io changes expected for a 2-pt regression.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The empty-board fix is confined to core `stepZap` — the shell needs no change. `src/shell/audio-dispatch.ts:54` plays the zap sound on `superzapper-activate`, so suppressing that event on a target-less zap automatically silences the empty-zap cue; the deferred well-flash render (10-15) likewise keys off `superzapper-flash`, which the fix will no longer emit on an empty board. Affects `tempest/src/core/sim.ts` (`stepZap` only — no `src/shell/*` edits). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The fix landed exactly where TEA scoped it (`src/core/sim.ts` `stepZap`, two branches); the full 716-test suite and `npm run build` are green with no shell changes — confirming TEA's core-only scope finding.

### Reviewer (code review)
- **Question** (non-blocking): A *tanker-only* first press (board has tankers but no non-tankers) still emits `superzapper-activate` with `killCount: 0` and opens the full flash window — the empty-board guard is `enemies.length === 0`, which a tanker-only board does not satisfy. This is unchanged pre-existing 10-1/5-1 behavior (not introduced or altered by 10-14), but under the "no kill payload" rationale it is arguably inconsistent: the shell plays the zap cue for zero kills. Affects `tempest/src/core/sim.ts` (`stepZap` full-press branch — would change the guard to `s.enemies.every(e => e.kind === 'tanker')` if pursued) and the shell zap cue. *Found by Reviewer during code review.* Surfaced by reviewer-test-analyzer; out of scope for 10-14's `enemies.length === 0` restoration — file as a follow-up if the inconsistency is deemed worth fixing.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Empty FIRST press opens NO flash window (extends "no activate event" to the whole zap payload)**
  - Spec source: story-10-14 title (Option A parenthetical); sprint/archive/10-2-session.md:233 & :465 (regression description)
  - Spec text: "restore Story-5-1/4-1 semantics (no activate event on empty press; weak shot with no target is wasted-but-not-spent)"
  - Implementation: Tests also assert the empty first press opens NO flash window (`zapTimer` stays 0, zero `superzapper-flash` events), not only the absence of `superzapper-activate`.
  - Rationale: The story text literally names the activate event, but the 10-2 review records the regression as "emits `superzapper-activate` … + opens a flash window", and the pre-10-2 5-1/4-1 design had no window at all. A no-target zap has no visual payload; pinning only the activate event would leave the well flashing across ~13 frames for kills that never happen. Restoring the full "no payload on an empty zap" behavior is the faithful reading.
  - Severity: minor
  - Forward impact: 10-15 (well-flash render) correctly shows nothing on an empty zap, since no `superzapper-flash` is emitted to consume.

### Dev (implementation)
- No deviations from spec. Implemented exactly the behavior TEA's tests pin: an empty-board (`enemies.length === 0`) first press consumes the charge + clears bolts then returns before emitting any event or opening a window; a `used-once` second press with no target (`nearestRimIndex` returns `-1`) returns early, preserving the charge. The TEA flash-window deviation above is satisfied by the same early-returns (no `runZapFrame`, so no `superzapper-flash`). Populated-board paths are byte-for-byte unchanged.

### Reviewer (audit)
- **TEA: "Empty FIRST press opens NO flash window (extends 'no activate event' to the whole zap payload)"** → ✓ ACCEPTED by Reviewer: well-sourced (10-2 review `:233`/`:465` describes the regression as activate *+ flash window*; pre-10-2 5-1/4-1 had no window). Suppressing both the activate event and the window is the coherent "no payload on an empty zap" restoration; the implementation realizes it via the same early-returns. Minor, forward-impact on 10-15 correctly noted.
- **Dev: "No deviations from spec"** → ✓ ACCEPTED by Reviewer: confirmed — the implementation matches TEA's pinned behavior exactly; the `enemies.length === 0` guard restores the dropped early-return without altering any populated-board path.
- No undocumented deviations found. The guard scope (`enemies.length === 0`, not "no non-tanker enemies") is the faithful restoration of the dropped early-return; the tanker-only-board question is pre-existing behavior, not a spec deviation introduced here (recorded as a non-blocking Delivery Finding).

## TEA Assessment

**Tests Required:** Yes

**Decision — Option A (restore), NOT Option B (pin the new behavior):** The story title delegated the choice to the RED phase. Epic 10's charter is *"a faithful port"*; the empty-board semantics lost in the 10-2 rewrite were the documented, reviewer-blessed 5-1/4-1 design (5-1 Dev deviation #2: *"No enemies destroyed = no audible/visual zap payload"*; 4-1 documented model: a target-less weak shot is *"wasted-but-not-spent"*). The 10-2 drift was untested and flagged MEDIUM in that review ("must not slip silently"). Restoring is the higher-authority, fidelity-correct path — so the tests pin the restored behavior, not the drift. The 10-1 panic-button (bolt-clear on a first press) is explicitly preserved — it is not a kill.

**Test File:**
- `tempest/tests/core/sim.superzapper.test.ts` — 9 new tests in three `describe` blocks tagged "superzapper 10-14".

**Tests Written:** 9 (covering 3 ACs + regression guards). Suite total: 43 tests — **5 failing (RED), 38 passing**.
**Status:** RED — confirmed by `testing-runner` (RUN_ID `10-14-tea-red`). File compiles cleanly. The 5 failures are exactly the new-behavior assertions (empty press currently emits activate, opens a 12-frame window, and spends the second charge); the 10-1/10-2 guards pass.

### Acceptance Criteria (TEA-defined for RED)
- **AC-1 — Empty FIRST press (full charge, no enemies):** emits NO `superzapper-activate`, opens NO flash window (`zapTimer` 0, no `superzapper-flash`), no `enemy-death` — but STILL consumes the charge (`full`→`used-once`) and clears in-flight bolts (10-1 panic-button preserved).
- **AC-2 — Empty SECOND press (weak shot, no target):** *wasted-but-not-spent* — charge stays `used-once` (never `spent`), no activate, no flash window, no kill; and the preserved charge is still usable — it spends correctly (`used-once`→`spent`, one nearest-rim kill) once a target appears.
- **AC-3 — Populated board UNCHANGED (regression guard):** a first press with enemies still opens the window + emits activate; a second press with a target still kills nearest-the-rim + spends. The 10-2 windowed model is untouched.

### Rule Coverage (typescript lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 enum/union exhaustiveness (`Superzapper` state machine; `GameEvent` union) | first/second-press blocks assert all three states (`full`→`used-once`→`spent`) and event presence/absence by discriminant type | failing (new) / passing (guards) |
| #4 null/undefined (no-target = `nearestRimIndex` returns `-1`, not null) | "does NOT spend … stays used-once", "no activate event and opens no flash window on a target-less weak shot" | failing |
| #8 test quality (meaningful assertions, no `as any`, no vacuous) | self-check below | n/a |

**Rules checked:** 3 of 13 lang-review checks are behaviorally applicable to this pure-core regression. The rest (React/JSX #6, async/Promise #7 & #11, build-config #9, input-validation #10 / generics #2, perf-bundle #12) are N/A — `stepZap` is a synchronous pure function: no I/O, no async, no user-input parsing, no React.
**Self-check:** 0 vacuous tests. Every test asserts a concrete state/event/count; the "still usable" test anchors against a real subsequent kill (asserts the surviving lane + `spent`), not a tautology. No `as any`, no `let _ =`.

**Handoff:** To Dev (Julia) for GREEN — re-introduce the empty-board (target-less) guard in `stepZap`: a first press consumes the charge + clears bolts but emits no `superzapper-activate` and opens no window; a second press with no target is a no-op preserving `used-once`. Confine changes to `tempest/src/core/sim.ts`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/sim.ts` — `stepZap`: restored the empty-board / target-less guard in both activation branches.
  - **First press (`full`):** still clears in-flight bolts and consumes the charge (`full`→`used-once`) up front — the 10-1 panic-button fires regardless — then early-returns when `s.enemies.length === 0`, so a target-less zap emits no `superzapper-activate` and opens no window.
  - **Second press (`used-once`):** computes `nearestRimIndex` first and early-returns when it is `-1` (no target), preserving the charge as `used-once` (*wasted-but-not-spent*). Only with a real target does it transition to `spent`, kill one, emit activate, and open the short window. The `killCount: idx >= 0 ? 1 : 0` ternary is gone — the activate event now only fires when a kill actually lands (always `1`).

**Approach:** Minimal — two guard clauses, no new helpers, no signature changes. The populated-board (10-2) code paths are untouched.

**Tests:** Full tempest suite **716/716 passing (GREEN)** — verified by `testing-runner` (RUN_ID `10-14-dev-green`). The 5 previously-RED 10-14 tests all pass; the 10-1/10-2 regression guards remain green. `npm run build` (`tsc --noEmit && vite build`) succeeds with no type errors.

**Self-review:**
- Wired in: the fix is in the live `stepZap` already called from the `playing` branch — no wiring needed; the shell consumes the (now absent) events automatically.
- Project patterns: pure-core boundary respected (no DOM/time/RNG); guards mirror the existing comment-dense style.
- ACs met: AC-1, AC-2, AC-3 all green.
- Error handling: N/A — pure deterministic branch logic; the `-1` sentinel from `nearestRimIndex` is the handled edge.

**Branch:** `feat/10-14-superzapper-empty-board` (pushed to origin). Commits: `52c2d1b` (tests, RED) + `<fix>` (impl, GREEN).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (716/716 green, build pass, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (2 medium, 2 low) | 0 confirmed-blocking, 1 deferred, 3 confirmed-Low (non-blocking) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — Reviewer self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rules, 32 instances, 0 violations) | N/A |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` and self-assessed)
**Total findings:** 0 confirmed-blocking, 3 confirmed-Low (non-blocking), 1 deferred (out-of-scope, documented as Delivery Finding)

## Reviewer Assessment

**Verdict:** APPROVED

The change restores the `enemies.length === 0` early-return that the 10-2 windowed rewrite dropped, exactly as TEA's tests pin and the story's Option A requires. It is minimal (two guard clauses), fully tested (716/716 green), rule-clean (32 instances checked, 0 violations), and respects the pure-core architectural boundary. No Critical or High findings.

### Rule Compliance (typescript lang-review + pure-core)

Exhaustive enumeration over the diff (corroborated by reviewer-rule-checker's 32-instance pass):

- **#1 Type-safety escapes:** COMPLIANT — no `as any`, `as unknown as T`, `@ts-ignore`, or non-null assertions anywhere in the diff (`sim.ts:502-533`, test block).
- **#2 Generic/interface pitfalls:** COMPLIANT — `nearestRimIndex(s, () => true)` matches the existing `pick: (e: Enemy) => boolean` signature (not the broad `Function`); `activatesOf(s): GameEvent[]` uses concrete types, consistent with the file's `zapTimer`/`flashesOf`/`deathsOf` helpers.
- **#3 Enum anti-patterns:** COMPLIANT — `superzapper` states (`'full'|'used-once'|'spent'`) are a string union compared via `===`; no enum, and the if/else-if chain needs no `assertNever`.
- **#4 Null/undefined handling:** COMPLIANT and notable — `nearestRimIndex` returns `number` with `-1` sentinel (`sim.ts:449`); the guard is `if (idx < 0)`, NOT `if (!idx)`. This is exactly the falsy-trap the checklist warns about (`idx === 0` is a valid lane-0 target) and Dev avoided it. `if (s.enemies.length === 0)` is a plain length guard — no `||`/`??` concern.
- **#5 Module/declaration:** COMPLIANT — the diff adds no imports/exports; no `.js`-extension or `export type` surface touched.
- **#8 Test quality:** COMPLIANT — every new test has concrete assertions (`toHaveLength`, `toBe` on literal states); no `as any`, no `let _ =`, no `.only`/`.skip`; imports from `src/`, not `dist/`. (Two low-value tests noted under [TEST] — weak but not wrong.)
- **#13 Fix-introduced regressions:** COMPLIANT — re-scanned the fix against #1-#12; the reorder of `superzapper = 'spent'` after the `idx < 0` guard and the `killCount: 1` literal (replacing `idx >= 0 ? 1 : 0`, whose `: 0` branch is now unreachable) introduce no new violation.
- **Pure-core boundary (tempest/CLAUDE.md, hard rule):** COMPLIANT — no new imports; no `shell/`, DOM, `window`, `Date.now`, `performance.now`, or `Math.random`; `nearestRimIndex` is deterministic. `core/` purity intact.
- Checks **#6 (React/JSX), #7 & #11 (async/Promise/error-handling), #9 (build-config), #10 (security input-validation), #12 (perf-bundle)** are N/A — `stepZap` is a synchronous pure function with no JSX, async, I/O, user-input parsing, or hot-path allocation.

### Observations (≥5, with dispatch tags)

- `[RULE]` **VERIFIED** clean — reviewer-rule-checker enumerated 14 rules / 32 instances with 0 violations; cross-checked above. The `idx < 0` sentinel and `killCount: 1` literal are both confirmed correct.
- `[TEST]` **DEFERRED (out of scope)** — test-analyzer: no test pins a *tanker-only* first press. True, but the new guard is `enemies.length === 0`; a tanker-only board (`length > 0`) does not hit it and behaves **identically to before this diff** (`sim.ts:511-515` is byte-unchanged for that path). Whether a no-non-tanker-kill zap should also be silent is a *new* design question, not the `enemies.length === 0` semantics this story restores. Captured as a non-blocking Delivery Finding for a possible follow-up.
- `[TEST]` **CONFIRMED Low (non-blocking)** — test-analyzer: the new empty-board early-return paths have no dedicated purity test. Purity is structurally guaranteed by `cloneState` at the top of `stepGame` and already proven by the existing purity test (`sim.test:520`) which asserts the input `s` is unchanged after a press mutating the *same* fields (`player.superzapper`, `enemyBullets`). Redundant coverage, not a hole — optional follow-up.
- `[TEST]` **CONFIRMED Low (non-blocking)** — test-analyzer: `deathsOf(playing([]))` (`sim.test:583`) is low-discriminating-power (an empty board can't produce kills under any impl). Harmless — it documents the empty-board no-payload contract alongside the activate/flash assertions. No rework required.
- `[TEST]` **CONFIRMED Low (non-blocking)** — test-analyzer: the populated-board second-press guard (`sim.test:637-647`) duplicates the 10-2 test at `:378-388`. Intentional, cheap regression guard inside the 10-14 block; mild redundancy, acceptable.
- `[EDGE]` **VERIFIED** (edge-hunter disabled — self-assessed) — enumerated the boundary set: empty first press, empty second press, lane-0 target (`idx===0`, correctly killed since guard is `< 0`), the documented first-vs-second asymmetry (first consumes on empty, second preserves — 4-1 model), and the empty-board→`checkLevelClear`→warp interaction (the "still usable" test holds `spawn.remaining=1` to avoid it). All handled — `sim.ts:505-531`.
- `[SILENT]` **VERIFIED** (disabled — self-assessed) — no try/catch, no swallowed errors; both early returns are explicit, comment-documented guards (`sim.ts:511`, `:525`), not silent fallbacks.
- `[TYPE]` **VERIFIED** (disabled — self-assessed) — no casts or escapes; `idx` is a typed `number` sentinel; union state machine compared correctly. Corroborated by rule-checker #1-#4.
- `[DOC]` **VERIFIED** (disabled — self-assessed) — the new comments (`sim.ts:503-510`, `:521-527`) accurately describe the behavior and cite Stories 5-1/4-1/10-1/10-14; the stale "open the longer kill window…" first-press comment was correctly updated. No misleading docs.
- `[SIMPLE]` **VERIFIED** (disabled — self-assessed) — minimal: two guard clauses, no new helpers, no signature change. The `killCount: 1` literal *removes* a now-dead ternary branch — a simplification, not over-engineering.
- `[SEC]` **VERIFIED** (disabled — self-assessed) — no security surface: pure deterministic sim, no input parsing, auth, secrets, injection, or tenant data. N/A by construction.

**Data flow traced:** player input `input.zap` → `stepZap` (`sim.ts:493`, called from the `playing` branch at `:645`) → on an empty board, mutates only the cloned `s.player.superzapper`/`s.enemyBullets` then returns; emits no `superzapper-activate`/`superzapper-flash` → shell's `audio-dispatch.ts:54` (zap sound) and the 10-15 well-flash render therefore stay silent on an empty zap. Safe: every mutation is on the `cloneState` copy; the input frame is untouched.

**Pattern observed:** early-return guards with explanatory comments citing the originating stories — consistent with the surrounding `stepZap` style (`sim.ts:494-500`).

**Error handling:** N/A by design — pure branch logic; the `-1` sentinel from `nearestRimIndex` is the explicitly-handled no-target edge (`sim.ts:525`).

### Devil's Advocate

Assume this fix is broken. Where would it bite? First attack: the asymmetry. A first press on an empty board consumes the charge (`full→used-once`) while a second press on an empty board preserves it — a player could "feel" the weapon behaving inconsistently. But this is the documented 4-1 model (Reviewer-blessed there), faithfully restored, and the story explicitly asks for exactly this; it is intentional, not a defect. Second attack: the `idx < 0` rewrite. If a future refactor of `nearestRimIndex` returned `0` for "no target" instead of `-1`, `if (idx < 0)` would silently treat a real no-target as a kill at lane index 0 and crash in `zapKillAt` (`s.enemies[0]` on an empty array → `undefined`, then `scoreFor(undefined)`). Today that cannot happen — `nearestRimIndex` is `-1`-sentinel and only reached when at least one enemy could match — but the contract is implicit. Mitigated by the rule-checker's confirmation and the existing tie-break tests; worth a one-line comment on the sentinel contract, not a blocker. Third attack: purity. The empty first press writes `s.enemyBullets`/`s.player.superzapper` before returning — if `stepGame` ever stopped deep-cloning, the input frame would be aliased and replay determinism would break. But `cloneState` runs unconditionally at `stepGame`'s top and is proven by the line-520 purity test on the same fields; the structural guarantee holds. Fourth attack: the tanker-only board. A confused player zapping a board of only tankers still hears the zap and sees the flash for zero kills — arguably surprising. This is unchanged pre-existing 10-1 behavior, out of this story's `enemies.length === 0` scope, and I have logged it as a follow-up question rather than silently approving it away. Fifth attack: scope creep into the warp transition — none; the fix never touches `checkLevelClear`/`stepWarp`, and the "still usable" test guards the warp interaction explicitly. The implementation withstands the assault; nothing rises to High.

**Handoff:** To SM (Winston Smith) for finish-story.