---
story_id: "6-13"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-13: Decide & reconcile authentic ROM spawn schedule vs the playtest-tuned curve (6-9 follow-up)

## Story Details
- **ID:** 6-13
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Type:** chore

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T13:09:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T12:41:18Z | 2026-06-28T12:44:15Z | 2m 57s |
| red | 2026-06-28T12:44:15Z | 2026-06-28T12:55:09Z | 10m 54s |
| green | 2026-06-28T12:55:09Z | 2026-06-28T12:59:25Z | 4m 16s |
| review | 2026-06-28T12:59:25Z | 2026-06-28T13:09:27Z | 10m 2s |
| finish | 2026-06-28T13:09:27Z | - | - |

## Branch Information
**Branch Strategy:** gitflow (develop → feat/6-13-reconcile-spawn-schedule)
**Active Branch:** feat/6-13-reconcile-spawn-schedule
**Repo:** tempest

## Sm Assessment

**Setup complete; story is unblocked and the central decision is already made.**

- **Workflow:** tdd (phased) → TEA (red) → Dev (green) → Reviewer (review) → SM (finish).
- **Repo/branch:** tempest @ `feat/6-13-reconcile-spawn-schedule` (off `develop`). Lane clear — no blocking PRs.
- **Decision resolved by stakeholder:** spawn schedule follows the **authentic ROM**; do not re-tune the canonical game. This collapses the "decide" half of the story to a documentation + reconciliation task. See `sprint/context/context-story-6-13.md` and the Delivery Finding below.
- **ACs:** None existed in the YAML; I authored four in the context file (document ROM schedule, record decision+rationale, reconcile `rollSpawnKind`/spawn logic, update spawn+difficulty tests). TEA should treat these as the working spec and confirm the exact per-level ROM thresholds against the rev-3 source during RED.
- **Risk to flag for TEA:** the working thresholds (flippers-only ≤L4, tankers/spikers L5+, fuseballs L11+, pulsars L17+) come from 6-9's investigation, not yet re-verified against the disassembly. Confirm before pinning.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Roster-by-level spawn schedule is pure-core logic — exactly what TDD pins.

**Test Files:**
- `tempest/tests/core/sim.spawn.test.ts` — rewritten: direct `rollSpawnKind` gate tests for the authentic introduction schedule + sim-driven flippers-only checks at L1/L4.
- `tempest/tests/core/sim.difficulty.test.ts` — updated AC#4 early-introduction test (L4 flippers-only; intro at L5) + corrected stale cycle-escalation comment.

**Tests Written:** 6 failing (RED), covering the introduction schedule.
**Status:** RED — confirmed by testing-runner (6 fail, 445 pass, no collateral damage).

### Authentic schedule pinned (source: docs/ux/2026-06-27-enemy-roster-rom-extract.md §H)
| Enemy | Authentic gate | Old (playtest) gate | Pinned by |
|-------|----------------|---------------------|-----------|
| Flipper | L1+ | L1+ | flippers-only L1-4 test |
| Tanker | **L5+** | L3+ | "introduces tankers/spikers at L5, not before" |
| Spiker | **L5+** (monotonic; see finding) | L3+ | same |
| Fuseball | **L11+** | L5+ | "keeps fuseballs out until L11" |
| Pulsar | **L17+** | L5+ | "keeps pulsars out until L17" |

### Rule Coverage
TypeScript/Vitest — no `.pennyfarthing/gates/lang-review/typescript.md` checklist applies to a pure-logic reconciliation. Core-purity rule (CLAUDE.md hard boundary) is honored: all new tests drive `rollSpawnKind`/`stepGame` with a seeded RNG, no DOM/time/`Math.random`.
**Self-check:** No vacuous assertions — every test asserts an exact set/boolean/count; absence checks rely on weight-0 being deterministically unreachable in `weightedPick`.

### Verification note for Dev (GREEN)
- The fix is in `src/core/rules.ts` `rollSpawnKind` gates only: tanker/spiker `level >= 5`, fuseball `level >= 11`, pulsar `level >= 17`. Keep flipper always; leave `SPAWN_CYCLE_HARD_SCALE` cycle scaling intact (out of scope to remove — see findings).
- Update the `rollSpawnKind` comment to cite the ROM source doc (satisfies AC#1/AC#2 durably in-source).
- Do NOT touch `rollTankerCargo` (separate split-cargo mechanism; flagged as a later-alignment finding).
- Re-run `npm test` in tempest; all 451 should pass with the gate change alone.

**Handoff:** To Dev (Walter Sobchak) for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/core/rules.ts` — `rollSpawnKind` introduction gates reconciled to the authentic ROM schedule (tanker/spiker `level >= 5`, fuseball `level >= 11`, pulsar `level >= 17`; flipper always). Added a source-cited doc comment documenting the schedule + the spiker-gate decision (satisfies AC#1/AC#2 in-source). `SPAWN_CYCLE_HARD_SCALE` cycle ramp left intact; `rollTankerCargo` untouched, per TEA's verification note.

**Tests:** 451/451 passing (GREEN) — confirmed by testing-runner. The 6 RED tests now pass; no other test changed status. `npx tsc --noEmit` clean.
**Branch:** `feat/6-13-reconcile-spawn-schedule` (pushed to origin).

**AC status:** AC#1 (schedule documented in-source + docs) ✓ · AC#2 (decision + rationale recorded) ✓ · AC#3 (`rollSpawnKind` reconciled) ✓ · AC#4 (spawn + difficulty tests assert ROM schedule, none pin the old curve) ✓.

**Handoff:** To Reviewer (The Big Lebowski) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM] Conflict — RESOLVED (non-blocking):** The 6-9 spawn-schedule conflict (authentic ROM vs playtest-tuned curve) is decided by stakeholder: **follow the authentic ROM schedule; do NOT re-tune the canonical game.** Reconcile `rollSpawnKind`, spawn logic, and the spawn/difficulty tests to the ROM schedule. Full rationale + working per-level thresholds in `sprint/context/context-story-6-13.md`. TEA: pin the ROM schedule in RED, not a blend.

### TEA (test design)

- **Gap / verified the schedule (non-blocking):** The authentic per-level introduction schedule is **already documented in-repo** (no need to re-derive from the raw ROM binary): `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md` §H line 426 and `tempest/docs/ux/2026-06-27-tempest-arcade-feel-reference.md` line 242 — both cite rev-3 ROM line numbers and agree: **flippers L1–4 only · tankers L5+ · spikers L5-16 · fuseballs L11+ · pulsars L17+ · L33+ steady-state weights 5 flipper / 3 pulsar / 3 tanker / 1 spiker / 3 fuseball.** The SM's "tankers/spikers L5+" working value is confirmed. Dev: these docs are the source of truth (AC#1 already satisfied) — cite them in the `rollSpawnKind` comment.
- **Question — spiker upper bound (non-blocking, for Dev/Reviewer):** The ROM mix says *spikers L5-16* (a window), yet the L33+ steady state still has 1 spiker — i.e. spikers would vanish L17–32 then return. The roster doc also flags a *suspected `$35` bug* in that very spiker weight table (l.7066–7072). I deliberately pinned spikers as a **monotonic L5+ gate** rather than encode the non-monotonic window built on a suspected ROM bug. If faithful reproduction of the L5-16 window + L33 reappearance is wanted, that's a follow-up; flag to user. Affects `src/core/rules.ts` `rollSpawnKind`.
- **Question — ROM steady-state weights vs playtest cycle escalation (non-blocking):** This story reconciles the **introduction gates** (which kinds unlock when). The separate **per-cycle hard-enemy escalation** (`SPAWN_CYCLE_HARD_SCALE`, story 3-4) is a playtest invention — the ROM uses fixed level-based weights reaching a steady state at L33+, with no geometry-cycle escalation. I left 3-4's cycle-escalation axis and its tests intact (out of scope: removing a shipped behavior). If "follow ROM" should also replace the cycle curve with the ROM's steady-state weight tables, that's a larger follow-up decision. Affects `src/core/rules.ts` `rollSpawnKind` + `tests/core/sim.difficulty.test.ts`.
- **Improvement — tanker split cargo gate (non-blocking):** `rollTankerCargo` gates pulsar/fuseball cargo at L5+, but pulsars don't spawn until L17 and fuseballs until L11 under the reconciled schedule — a L5 tanker can therefore split into a pulsar 12 levels before pulsars otherwise appear. Out of scope for this story (split cargo ≠ spawn roster) but worth aligning later. Affects `src/core/rules.ts` `rollTankerCargo`.

### Dev (implementation)
- No upstream findings during implementation. The fix matched TEA's spec exactly (gate-only change); TEA's four findings (spiker window, cycle-escalation-vs-ROM-weights, tanker split cargo) remain the open follow-ups and are unchanged by this implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): The "escalates the enemy mix on later cycles" suite no longer isolates `SPAWN_CYCLE_HARD_SCALE` — under the reconciled gates the rising hard-fraction is driven by the roster opening (L21/L37 gain pulsar+fuseball, L5 does not), so both assertions pass even if cycle scaling were deleted. Affects `tests/core/sim.difficulty.test.ts` (add a companion test comparing two full-roster levels that differ only by cycle, e.g. `hardFraction(17) < hardFraction(33)`; and tighten line 143 `>=` → `>` to recover the L21-vs-L37 cycle guard). Corroborated by reviewer-test-analyzer (high/medium confidence).
- **Gap** (non-blocking): `rollTankerCargo` still gates pulsar/fuseball cargo at `level >= 5`, but moving the roster gates to L17/L11 makes a L5 tanker able to split into a pulsar 12 levels (fuseball 6 levels) before those kinds otherwise appear — an inconsistency this change newly surfaces. Affects `src/core/rules.ts` `rollTankerCargo` (align cargo gates to the roster schedule, or document the early cargo introduction as intentional). Out of scope per the stakeholder decision; matches TEA's existing finding. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): I concur with TEA's open finding that the ROM steady-state weight tables (5F/3P/3T/1S/3Fz @ L33+) are not pinned — the "full roster"/"steady state" tests assert presence only, not the weight mix. A future story should pin weights if exact ROM fidelity past introduction is wanted. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Spiker gated monotonically (L5+) instead of the ROM's L5-16 window**
  - Rationale: The L5-16 window contradicts the L33+ steady-state (which has spikers) and sits on a doc-flagged *suspected `$35` ROM bug*; encoding it would pin uncertain/buggy behavior. Surfaced as a delivery finding instead.
  - Severity: minor
  - Forward impact: If the user wants faithful L5-16-then-reappear behavior, a follow-up story is needed; `rollSpawnKind` and a spiker-window test would change.
- **Steady-state weight curve / cycle escalation NOT pinned to ROM tables**
  - Rationale: Story scope is the roster-by-level introduction schedule; exact weight tuning + removing a shipped difficulty axis is a larger decision (logged as a delivery finding for the user).
  - Severity: minor
  - Forward impact: A future story may replace the cycle-escalation curve with the ROM's fixed steady-state weights.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Spiker gated monotonically (L5+) instead of the ROM's L5-16 window**
  - Spec source: context-story-6-13.md, AC#3/AC#4; docs/ux/2026-06-27-enemy-roster-rom-extract.md §H
  - Spec text: "spikers L5-16 ... steady L33+ = ... 1 spiker"
  - Implementation: Tests pin spikers as appearing from L5 onward (no upper-bound dropout); I did not write a test for the L17–32 spiker absence.
  - Rationale: The L5-16 window contradicts the L33+ steady-state (which has spikers) and sits on a doc-flagged *suspected `$35` ROM bug*; encoding it would pin uncertain/buggy behavior. Surfaced as a delivery finding instead.
  - Severity: minor
  - Forward impact: If the user wants faithful L5-16-then-reappear behavior, a follow-up story is needed; `rollSpawnKind` and a spiker-window test would change.
- **Steady-state weight curve / cycle escalation NOT pinned to ROM tables**
  - Spec source: context-story-6-13.md Scope; docs/ux/2026-06-27-enemy-roster-rom-extract.md §H
  - Spec text: "steady L33+ = 5 flippers / 3 pulsars / 3 tankers / 1 spiker / 3 fuseballs"
  - Implementation: RED pins only the introduction GATES (L5/L11/L17), not the exact per-level/steady-state weights; story 3-4's `SPAWN_CYCLE_HARD_SCALE` escalation and its tests are left intact.
  - Rationale: Story scope is the roster-by-level introduction schedule; exact weight tuning + removing a shipped difficulty axis is a larger decision (logged as a delivery finding for the user).
  - Severity: minor
  - Forward impact: A future story may replace the cycle-escalation curve with the ROM's fixed steady-state weights.

### Dev (implementation)
- No deviations from spec. Implemented exactly the gate change TEA's tests pinned (tanker/spiker L5+, fuseball L11+, pulsar L17+); kept `SPAWN_CYCLE_HARD_SCALE` and `rollTankerCargo` as instructed.

### Reviewer (audit)
- **TEA — "Spiker gated monotonically (L5+) instead of the ROM's L5-16 window"** → ✓ ACCEPTED by Reviewer: the L5-16 window sits on a doc-flagged *suspected `$35` table bug* (`enemy-roster-rom-extract.md` l.7066-7072, ⚠️) and contradicts the L33+ steady state (which restores 1 spiker). A monotonic L5+ gate is the defensible, non-buggy reading; the decision is documented in-source and surfaced as a delivery finding. Sound deviation.
- **TEA — "Steady-state weight curve / cycle escalation NOT pinned to ROM tables"** → ✓ ACCEPTED by Reviewer: story scope is the roster-by-level *introduction gates*, not the per-level weight mix; removing story 3-4's shipped `SPAWN_CYCLE_HARD_SCALE` axis is a larger decision properly deferred to a follow-up. Note: a side effect is that the cycle-escalation regression guard is now weakened (see my Delivery Finding) — accepted as deviation, follow-up captured.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: confirmed against the diff — the implementation is exactly the four gate-threshold lines TEA's RED tests pinned; `rollTankerCargo` and `SPAWN_CYCLE_HARD_SCALE` untouched, as instructed.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN 451/451, `tsc` clean, no lint script, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter`; boundaries assessed manually (see `[EDGE]`) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; domain assessed manually (see `[SILENT]`) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (1 high, 1 medium, 1 low) | confirmed 3, dismissed 0, deferred 1 (cargo) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; docs assessed manually (see `[DOC]`) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; types assessed manually + corroborated by rule-checker (see `[TYPE]`) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; complexity assessed manually (see `[SIMPLE]`) |
| 9 | reviewer-rule-checker | Yes | clean | none (16 rules / 52 instances, 0 violations) | N/A |

**All received:** Yes (4 enabled subagents returned; 5 disabled subagents pre-filled as Skipped per `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (all non-blocking), 0 dismissed, 1 deferred (out-of-scope follow-up)

## Reviewer Assessment

**Verdict:** APPROVED

A surgical, correct reconciliation. The four gate thresholds in `rollSpawnKind` (`tanker/spiker L5+`, `fuseball L11+`, `pulsar L17+`; flipper always) match the canonical Atari rev-3 ROM introduction schedule, which I verified against **both** cited sources: `docs/ux/2026-06-27-enemy-roster-rom-extract.md` §H line 426 and `docs/ux/2026-06-27-tempest-arcade-feel-reference.md` line 242 — both read `flippers-only L1-4 · tankers L5+ · spikers L5-16 · fuseballs L11+ · pulsars L17+`. The suspected `$35` spiker-table bug the comment cites is real (flagged ⚠️ at l.7066-7072). No Critical or High issues; all findings are non-blocking test-quality or explicitly-deferred scope items.

**Data flow traced:** `level` (integer, from `GameState`, advanced by level progression) → `rollSpawnKind(level, rng)` computes `cycle = floor((level-1)/16)` and `hard = 1 + cycle*0.5`, builds a 5-entry weight table gated by `level`, → `weightedPick(table, rng)` → `{ kind, rng }` carried back immutably into the spawn loop. Safe: pure arithmetic, no shared mutation, RNG threaded by value.

**Pattern observed:** weight-0 gating + `weightedPick`'s `if (w <= 0) continue` guard (`src/core/rules.ts:169`) makes absence *exact* — a gated kind is unreachable, not merely improbable. This is the load-bearing invariant the new tests rely on, and it holds.

### Observations (tagged by source)

- `[VERIFIED]` Gate thresholds match the canonical ROM — `src/core/rules.ts:199-202` (`L5/L5/L11/L17`) equals roster-extract §H line 426 and feel-reference line 242. Complies with the "ROM is canonical" project direction.
- `[VERIFIED]` All three gate boundaries tested both sides — L4/L5 (tanker/spiker), L10/L11 (fuseball), L16/L17 (pulsar) — `tests/core/sim.spawn.test.ts:54-77`. Off-by-one regressions would be caught.
- `[VERIFIED]` AC#4 — no surviving old-curve assertions: grep of `tests/` shows only the two changed files reference `rollSpawnKind`/spawn; no L3/L5 playtest gate is still pinned anywhere.
- `[SEC]` reviewer-security clean — no `Math.random`/`Date`/`performance.now`/DOM introduced into `core/`; determinism preserved; negative/NaN/`Infinity` `level` all degrade safely to flipper-only via the `w <= 0` guard. No exploitable path (client-only game, no I/O).
- `[RULE]` reviewer-rule-checker clean — 16 rules / 52 instances, 0 violations. Core-purity hard boundary honored; `??` (not `||`) used on every `Map.get()`; `import type { EnemyKind }` correct; `ReadonlyArray<readonly [EnemyKind, number]>` table typing intact.
- `[TEST]` reviewer-test-analyzer — **MEDIUM, non-blocking:** the "escalates on later cycles" suite (`tests/core/sim.difficulty.test.ts:120-144`) no longer isolates `SPAWN_CYCLE_HARD_SCALE`; both assertions pass even if cycle scaling were removed (the rise is roster-driven). I independently reproduced this. **LOW:** line 143 `>=` should be `>` (≈10σ margin at N=6000) to recover the L21-vs-L37 cycle guard. Confirmed → captured as a Delivery Finding (follow-up).
- `[TEST]` **LOW, non-blocking:** "full five-enemy roster at the L33+ steady state" / "by level 18" assert *presence*, not the ROM steady-state *weight mix* (5F/3P/3T/1S/3Fz). Honest — the deviation log says so — but the names over-promise. Captured as a Delivery Finding.
- `[EDGE]` (subagent disabled) — manual boundary check: just-below/just-above covered for every gate; `Infinity`/`NaN`/negative `level` degrade to flipper-only (security confirmed); `weightedPick` fallback returns flipper when `total > 0`, which always holds (flipper weight is a constant 10). No unhandled boundary.
- `[SILENT]` (subagent disabled) — manual check: `rollSpawnKind` is a pure function with no `try/catch`, no I/O, no fallback that masks an error. Nothing is swallowed; there is no error path to swallow.
- `[DOC]` (subagent disabled) — manual check: the new 11-line doc comment is accurate; both source citations (line 426, line 242) and the `$35` bug reference verified against the actual docs. Only nit: test names imply weight-mix coverage that isn't there (captured above).
- `[TYPE]` (subagent disabled) — manual check + rule-checker corroboration: no `as any`/`as unknown`/`@ts-ignore`/non-null `!`; `EnemyKind` string-union used directly; helpers return `Set<EnemyKind>`/`Map<EnemyKind, number>` (not `string`). Type design clean.
- `[SIMPLE]` (subagent disabled) — manual check: minimal four-line gate change; no dead code, no over-engineering. The `rolledKinds` test helper is justified (bypasses sim to avoid tanker-split cargo contamination) and documented.
- **DEFERRED (Improvement, non-blocking):** `rollTankerCargo` (`src/core/rules.ts:208-216`) gates pulsar/fuseball cargo at `L5+`, so a L5 tanker can split into a pulsar/fuseball before their L17/L11 roster gates — an inconsistency this change newly surfaces. Out of scope per the stakeholder decision; matches TEA's finding. Captured as a Delivery Finding for a later alignment story.

### Rule Compliance

Project rules that govern this diff (TypeScript files in `tempest/`):

- **CLAUDE.md hard boundary — `core/` is pure & deterministic:** the only `core/` function changed is `rollSpawnKind`. It imports only `./rng` + `./state`, uses `Math.floor` (deterministic) and the seeded `rng` via `weightedPick`/`rngNext`; no `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`/DOM. **COMPLIANT** (`rules.ts:193-206`). Tests drive everything through `makeRng(seed)` — deterministic; the determinism test at `sim.difficulty.test.ts:147-155` proves it.
- **TS #1 type-safety escapes:** no `as any`/`as unknown as T`/`@ts-ignore`/non-null `!` anywhere in the diff. **COMPLIANT** (12 instances checked by rule-checker).
- **TS #4 `??` vs `||`:** every `Map.get()` uses `?? 0` (correct — count can legitimately be `0`). **COMPLIANT** (`sim.difficulty.test.ts:28,113-116`).
- **TS #5 modules:** new `import type { EnemyKind }` correctly type-only; runtime imports not marked `type`; no-extension imports correct for the Vite/TS build. **COMPLIANT** (`sim.spawn.test.ts:1-7`).
- **TS #8 test quality:** no `as any` in tests; assertions are exact (`toEqual` Sets/Maps) or statistically reliable (presence at ≥15% weight over n=2000-4000); the one weakened isolation is captured as a finding, not a vacuous assertion. **COMPLIANT with noted finding.**
- **TDD:** RED tests authored to the ROM-sourced contract, then GREEN; no evidence of tests retrofitted to existing code. **COMPLIANT** (process consistent with diff).

No project rule is violated. No rule-matching subagent finding was dismissed.

### Devil's Advocate

Suppose I am wrong to approve. Where would this break? A malicious or curious player cannot reach `rollSpawnKind` with hostile input — `level` is an internal integer the sim controls, never user-supplied, and security already proved every degenerate value (`negative`, `NaN`, `Infinity`) collapses to a flipper-only table rather than crashing or producing a `NaN` weight. So the runtime is robust. The real risk is *fidelity drift hiding behind green tests.* Three angles: (1) The cycle-escalation tests are now green for the wrong reason — if a future dev "simplifies" by deleting `SPAWN_CYCLE_HARD_SCALE`, the suite stays green and a shipped difficulty axis silently dies. That is a genuine latent regression hole, which is exactly why I am recording it as a blocking-the-*next*-decision finding rather than waving it through invisibly. (2) `rollTankerCargo` now contradicts the roster schedule: a player at L5 can witness a pulsar (via tanker split) twelve levels before pulsars are "supposed" to exist — a confused player would reasonably call that a bug, and it partially undercuts AC#3's "roster-by-level matches the ROM." I weighed rejecting on this. I do not, because the stakeholder decision explicitly scoped split-cargo out, the authentic cargo-by-level schedule isn't established, and `rollTankerCargo` is untouched by this diff — but I refuse to let it pass *undocumented*, so it is a logged finding. (3) The "steady state" test names promise weight-mix fidelity they don't deliver; a future reader could over-trust them. Again: documented, not dismissed. None of these three is a correctness defect in the shipped gate change — which is provably ROM-accurate — so the verdict is APPROVE with findings, not REJECT. If any one of them were an unhandled crash or an undocumented spec contradiction, I would have bounced it back to Walter.

**Handoff:** To SM (The Dude) for finish-story.