---
story_id: "sw8-11"
jira_key: "sw8-11"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-11: Space phase END is TIME-boxed in the ROM, not kill-quota'd

## Story Details
- **ID:** sw8-11
- **Jira Key:** sw8-11
- **Repos:** star-wars
- **Branch:** fix/sw8-11-space-phase-time-boxed-end
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T14:34:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T13:40:41Z | 2026-07-27T13:44:18Z | 3m 37s |
| red | 2026-07-27T13:44:18Z | 2026-07-27T14:12:19Z | 28m 1s |
| green | 2026-07-27T14:12:19Z | 2026-07-27T14:28:00Z | 15m 41s |
| review | 2026-07-27T14:28:00Z | 2026-07-27T14:34:17Z | 6m 17s |
| finish | 2026-07-27T14:34:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): sw8-10 (TWV2Z tail-loop) goes LIVE once the time-box lands — a 21s endless supply exhausts shorter wave plans and serves the clone's invented '1A1' fallback where the ROM loops the 18-entry TWV2Z group (its own title predicted "bites if … the phase becomes time-boxed").
  Affects `star-wars/src/core/sim.ts` (spawnTie past-plan fallback — owned by sw8-10; do NOT absorb into sw8-11).
  *Found by TEA during test design.* (This is AC-4's re-evaluation.)
- **Gap** (non-blocking): the interior PH.TIM music milestones diverge audibly — the ROM opens the space phase in ~2s of SILENCE, then theme at 2s / theme B at 10s / descent at 20s (1s BEFORE the warp); our clone cues the space track and the descent tune ON the phase edges.
  Affects `star-wars/src/core/sim.ts` (music/tune cue scheduling — filed as **sw8-12**, depends_on sw8-11's phaseTime clock).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `enterPhase` spreads unknown fields through untouched (the RED probe showed an injected phaseTime: 20 riding through a phase entry), so Dev must add an EXPLICIT phaseTime reset in `enterPhase` — the spread will not do it.
  Affects `star-wars/src/core/sim.ts` (`enterPhase` — sw8-11 GREEN scope).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the RED's hitchhiker sweep was by SYMBOL (`SPACE_WAVE_QUOTA`) and missed two fixtures that staged the crossing NUMERICALLY (`phaseKills: 9999` in surface-maze-field's `enterSurface` and surface-tower-quota's transition test) — future mechanism-swap sweeps should also grep the trigger FIELD (`phaseKills:`), not just the constant.
  Affects `star-wars/tests/` (re-seated this story; pattern note for future REDs).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the phase clock's accumulation OUTSIDE the space phase is unpinned — mutation M7 (removing the surface dispatch tick) survives the full suite because no test and no consumer reads `phaseTime` in surface/trench yet; sw8-12 (the first cross-phase consumer, if its cues span phases) or any future fade work should pin the accumulation where it starts relying on it.
  Affects `star-wars/tests/core/space-phase-timebox.test.ts` (one accumulation assert per non-space phase, when a consumer exists — owned by sw8-12).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `phaseCleared`'s `>=` vs `>` is behaviourally unobservable under float dt (mutation M6 equivalent-survives); the ROM IFHS at-or-past semantic is carried by the doc comment only. No action needed — recorded so a future "tighten the compare" refactor knows the prose is the pin.
  Affects `star-wars/src/core/sim.ts` (phaseCleared doc comment is load-bearing).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Ruled the dual-outcome story to PORT; the ratify path is not represented in RED**
  - Spec source: context-story-sw8-11.md, Acceptance Criteria framework
  - Spec text: "Must allow both outcomes (port or ratify)"
  - Implementation: the RED encodes the PORT outcome exclusively (tests/core/space-phase-timebox.test.ts)
  - Rationale: the quota's own comment conditions it on "until deeper reverse-engineering recovers the real numbers" — the numbers are now fully recovered (PH.TIM mechanism, WSMAIN.MAC:1379-1454); sprint 2628's mandate is ROM fidelity; sw8-7/sw7-4 precedent is to port a recovered mechanism
  - Severity: minor
  - Forward impact: Dev implements the port; sw8-10 becomes live (Delivery Finding)
  - → ✓ ACCEPTED by Reviewer: the ruling condition was set by the divergent code's own comment and is now met; I re-read WSMAIN.MAC:1379-1454 firsthand — the mechanism, arithmetic (left-to-right ⇒ 420 frames), 20 Hz corroboration, and SC.FWV head start all hold as claimed.

- **Quota-mechanism tests inverted/retired rather than preserved**
  - Spec source: phase-progression.test.ts ("defines positive per-phase wave quotas") and combat-kill-loop.test.ts (8-16 "the space wave clears by kills")
  - Spec text: `expect(SPACE_WAVE_QUOTA).toBeGreaterThan(0)`; "shooting the final TIE … clears the space phase"
  - Implementation: the value pin is retired; 8-16's describe re-scoped to fire-vs-ram (its surviving intent) on dual-mechanism staging; the new suite adds the inversion ("kills alone never end the phase")
  - Rationale: their premise IS the audited mechanism — an AC derived from an unaudited constant is not evidence (tp1-27 discipline)
  - Severity: minor
  - Forward impact: none — every surviving intent is re-pinned
  - → ✓ ACCEPTED by Reviewer: a test whose premise is the audited mechanism cannot outlive the audit; the fire-vs-ram and kill-scoring intents survive in the re-scoped 8-16 suite and the inversion is now pinned in the new contract.

- **12 sibling suites re-seated onto dual-mechanism staging**
  - Spec source: sibling fixtures' `phaseKills: SPACE_WAVE_QUOTA` end-of-space idiom (music-cue, speech-cues, speech-cues-r8, tune-cue, events, post-hit-shield-window, wave-one-no-surface, phase-progression, combat-kill-loop, death-star-body, render.death-star-picture, darth-vader-enemy-rom comment)
  - Spec text: staging "phaseKills: SPACE_WAVE_QUOTA" (+ `- 1` variants) as the phase edge
  - Implementation: tests/support/space-phase-end.ts exports SPACE_PHASE_OVER {phaseKills:6, phaseTime:21} / NOT_OVER / CLOSING_KILL literals — valid under BOTH mechanisms; verified green pre-fix (182/183 files, only the new suite red)
  - Rationale: TEA owns test maintenance (sw3-15 re-seat discipline); a correct re-seat is green under both the old and new mechanism
  - Severity: minor
  - Forward impact: the `as Partial<GameState>` casts become exact types once `phaseTime` lands; a later simplify pass may inline them
  - → ✓ ACCEPTED by Reviewer: dual-mechanism staging is the correct re-seat for a mechanism swap (green under both sides, proven by the pre-fix 182/183 run and the post-fix 183/183); the casts are now exact and carry justifying comments per lang-review #1.

- **Interior music milestone schedule descoped → FILED as sw8-12**
  - Spec source: story title parenthetical + context Scope section
  - Spec text: "advances to PH$SP2 on the PH.TIM music schedule (theme→theme B→descent→'GO AHEAD AND DESCEND')" / "In scope: the end-phase condition"
  - Implementation: RED pins only the END milestone (420 frames = 21s) + head start; the 2s/10s/20s music cues are untested here
  - Rationale: the schedule's interior is cue-scheduling work with its own edge contracts; the end condition is what this bug names
  - Severity: minor
  - Forward impact: owned by sw8-12 (filed this session, depends_on sw8-11)
  - → ✓ ACCEPTED by Reviewer: the descope line follows the story's own Scope section, and the filing rule is satisfied — sw8-12 exists in epic-sw8 with depends_on sw8-11 (verified in sprint/epic-sw8.yaml).

### Dev (implementation)

- **Two literal-staged surface fixtures re-seated in GREEN**
  - Spec source: tests/core/surface-maze-field.test.ts (`enterSurface`, "whatever mechanism GREEN builds") and tests/core/surface-tower-quota.test.ts ("does NOT award the tower bonus on the space→surface transition")
  - Spec text: `phaseKills: 9999, // ≥ the space-wave quota — forces the space→surface cross`
  - Implementation: both stagings swapped to `...SPACE_PHASE_OVER` (the RED's dual-mechanism helper); intent (cross into the surface, then test SURFACE behaviour) untouched
  - Rationale: their subject is the surface, not the space gate; the maze-field comment itself declares mechanism-agnostic intent — the staging just picked the wrong forcing field
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: intent-preserving re-seat of fixtures the RED's symbol sweep could not see; both suites' subjects (authored maze layout, tower-bonus non-award) are asserted unchanged and pass on the merged head.

## Sm Assessment

**Setup complete — routing to TEA (red phase).**

- **Race check:** `git fetch` + grep of origin/main logs shows sw8-11 only *filed* (by sw8-7's finish commit), never worked or completed by a sibling checkout. Clear to proceed.
- **Story:** 3pt p3 bug, star-wars, tdd (phased). A rule-the-divergence story: ROM ends the space phase on the PH.TIM music timetable (PHESP1 → PH$SP2, WSMAIN.MAC:1420-1448, endless TIE supply); clone gates on SPACE_WAVE_QUOTA=6 kills (state.ts:882, self-described placeholder). Outcome must be either a port of the time-boxed schedule or a formal ratification of the quota — ACs must permit both, each with primary-source evidence.
- **Jira:** No Jira integration in this project by design (jira_key is the story id) — claim skipped intentionally.
- **Context:** `sprint/context/context-story-sw8-11.md` written and enriched: ROM citations (WSMAIN.MAC 1420–1448), clone site (state.ts 875–884), predecessor quarry pointer (sprint/archive/sw8-7-session.md), dual-outcome AC framework. Validates clean.
- **Branch:** `fix/sw8-11-space-phase-time-boxed-end` cut from origin/develop in star-wars (gitflow; PR will target develop). Head at 5736511.
- **Note for TEA:** sw8-7's archive pre-extracted the PH.TIM/PHESP1 finding; read its Delivery Findings first. Related backlog story sw8-10 (TWV2Z tail-loop) becomes live if the schedule is ported — flag interactions rather than absorbing its scope.

## TEA Assessment

**Tests Required:** Yes
**Ruling (AC-1):** **PORT** the ROM time-box. Grounded in primary source, all firsthand-read this session:
- `WSMAIN.MAC:1379-1380` — PHISP1 stamps `PH.TIM = 0` on space entry
- `WSMAIN.MAC:1386-1390` — first-wave head start: `SC.FWV==0` → `PH.TIM = 2*20.-1 = 39` ("THEN START A BIT AHEAD"; `WSGLOB.MAC:760`: "0==>STILL ON FIRST WAVE"; set `0FF` at wave completion, WSMAIN.MAC:2023-2024 "NO MORE FIRST WAVES")
- `WSMAIN.MAC:1415-1417` — `PH.TIM` +1 every game frame
- `WSMAIN.MAC:1418-1448` — milestones 40 / 200 / 400 frames (music) and `IFHS` ≥ 420 → `PHASE = PH$SP2` ("GO AHEAD AND DESCEND"). **Arithmetic note:** these `.MAC` sources evaluate left-to-right, so `2+7+1*20.` = (2+7+1)×20 = 200 — corroborated by the `CMPD #2*20.  ;2 SECONDS` comments at :2064/2096/2128, which also re-ratify the 20 Hz game frame the repo already uses. 420 frames = **21 s**; head start = **1.95 s** (wave-1 box ≈ 19.05 s)
- `WSMAIN.MAC:1450-1454` — the supply refills unconditionally throughout (`WV.LIV < 3` → `ADASHP`, ported by sw8-7). **No kill count exists anywhere in the phase-end path.**

**Evidence for the ruling (AC-2):** the quota's own comment self-describes as a placeholder "until deeper reverse-engineering recovers the real numbers" — recovered above; sprint 2628 is the ROM-fidelity sprint; sw8-7 (spawn cadence) and sw7-4 (extra-life ladder) both ported once the mechanism was recovered.

**Final Acceptance Criteria:**
- AC-1: ruling grounded in primary source — DONE (above; encoded in the suite header).
- AC-2: outcome justified with evidence — DONE (above).
- AC-3 (port): `tests/core/space-phase-timebox.test.ts` passes — `SPACE_PHASE_END_S = 21`, `SPACE_PHASE_HEAD_START_S = 1.95`, a `phaseTime` clock on GameState (accumulated by stepGame, reset by `enterPhase`, seeded by `initialState`), space advances on the clock (surface for wave 2+, trench for wave 1), kills never advance it, `SPACE_WAVE_QUOTA` retired, `deathStarPlacement` re-derived from the clock. Full suite green, incl. the 12 re-seated files.
- AC-4: sw8-10 re-evaluated — Delivery Finding logged (goes live with the port; not absorbed).

**Test Files:**
- `tests/core/space-phase-timebox.test.ts` — NEW: the sw8-11 contract (11 tests, all failing)
- `tests/support/space-phase-end.ts` — NEW: dual-mechanism staging literals (SPACE_PHASE_OVER / NOT_OVER / CLOSING_KILL)
- Re-seated (green pre-fix, must stay green post-fix): music-cue, speech-cues, speech-cues-r8, tune-cue, events, post-hit-shield-window, wave-one-no-surface, phase-progression, combat-kill-loop, death-star-body, render.death-star-picture, darth-vader-enemy-rom (comment only)

**Tests Written:** 11 new tests covering 4 ACs (+ 12 files re-seated)
**Status:** RED (verified by testing-runner: `Test Files 1 failed | 182 passed (183)`, `Tests 11 failed | 1910 passed (1921)` — all 11 failures in the new suite, each for its intended reason; commit `fd792ba` on `fix/sw8-11-space-phase-time-boxed-end`)

### Rule Coverage

| Rule (lang-review/typescript) | Test(s) / self-check | Status |
|------|---------|--------|
| #1 type-safety escapes | no `as any`; transitional casts are single `as Partial<GameState>` with justifying comments (anchored on an overlapping real field); dynamic probes follow the repo's death-star-body `as unknown as Record` precedent with "safe: dynamic probe" comments | self-checked, tsc clean |
| #4 null/undefined | placement `apparent()` uses `?? 1` with an explicit `z > 0` guard (mirrors sibling's `?? 0` fail-closed idiom) | covered |
| #8 test quality | every test asserts concrete values (`toBe(21)`, phase names, deep-equal seats); no `let _ =`, no `assert(true)`; probes assert value equality, not mere presence | self-checked |
| project: literal pinning (tp1-27) | every premise pinned to literals (21, 1.95, 6, 39) — nothing re-derives from the constants under audit | covered |
| #2/#3/#5/#6/#7/#9-#13 | no enums, JSX, async, build/config, or API-boundary changes in this test-only diff | N/A |

**Rules checked:** 4 of 4 applicable checklist areas have coverage/self-checks (9 N/A for a test-only diff)
**Self-check:** 0 vacuous tests found

**Handoff (to Bicycle Repair Man / Dev) — implementation surface the RED implies:**
1. `state.ts`: add `SPACE_PHASE_END_S = 21`, `SPACE_PHASE_HEAD_START_S = 1.95` (with ROM derivations); add `phaseTime: number` to GameState; seed `1.95` in `initialState` (run start = first wave); DELETE `SPACE_WAVE_QUOTA`.
2. `sim.ts`: accumulate `phaseTime += dt` per playing step; `phaseCleared('space')` → `phaseTime >= SPACE_PHASE_END_S`; EXPLICIT `phaseTime: 0` in `enterPhase` (the spread will NOT reset it — see Delivery Finding); surface/trench conditions untouched.
3. `render.ts`: `deathStarPlacement` progress `p = clamp(phaseTime / SPACE_PHASE_END_S)` instead of `phaseKills / SPACE_WAVE_QUOTA`.
4. Do NOT touch the spawn fallback (sw8-10) or music cue timing (sw8-12).
## Dev Assessment

**Status:** GREEN — `Test Files 183 passed (183)`, `Tests 1921 passed (1921)` (testing-runner, full suite; total matches the RED run's 1921 — nothing narrowed or crashed). tsc clean. Branch `fix/sw8-11-space-phase-time-boxed-end` pushed (`258f0c2` on top of the RED `fd792ba`).

**Implementation (minimal, to TEA's handoff 1:1):**
1. `state.ts` — `SPACE_PHASE_END_S = 21` and `SPACE_PHASE_HEAD_START_S = 1.95` with full ROM derivations; `GameState.phaseTime` (seconds since phase entry); `initialState` seeds the head start (run start = the ROM's SC.FWV==0 first wave); `SPACE_WAVE_QUOTA` deleted (named once in a comment as the retired constant — not an export, so the retirement probe stays honest).
2. `sim.ts` — the clock ticks INTO each playing phase step (`{ ...state, phaseTime: state.phaseTime + dt }` at the three dispatch sites; ROM PHESP1 order: add, then compare, same frame), so `stepTrench`'s internal `clearRun` still restarts the entering phase at 0 AFTER the tick; `phaseCleared('space')` is `phaseTime >= SPACE_PHASE_END_S` (IFHS ⇒ `>=`); `enterPhase` resets `phaseTime: 0` explicitly (per TEA's finding — the spread would carry it).
3. `render.ts` — `deathStarPlacement` progress is `clamp(phaseTime / SPACE_PHASE_END_S)`; kill-insensitive.
4. NOT touched (scope guards): the spawn fallback (sw8-10), music/tune cue timing (sw8-12), surface/trench end conditions.

**Beyond the handoff (each logged):**
- Re-seated 2 surface fixtures staged on literal `phaseKills: 9999` (missed by the RED's symbol sweep) — deviation + finding logged.
- Citation gate: 37 citations re-anchored (`tools/audit/reanchor-citations.mjs --write` — it re-serializes all 10 findings files, so most of that diff is mechanical unicode-escape normalization, not content); the 1 LOST citation was A-019, the CONFIRMED quota-divergence finding itself — stamped `remediated_by: "sw8-11"` (this story genuinely removed the divergence; X-002/sw7-7 precedent). Re-run: 98 correct, 0 lost.

**Self-review:** wired end-to-end (core clock → phase advance → shell placement); no debug code; ROM comments follow the purity-guard phrasing rules (no DOM-global words before a dot in core files); all four ACs met on the port path.

**Handoff:** To the Argument Professional (Reviewer) — diff base `origin/develop`, branch pushed, no PR (SM owns that at finish).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 advisory (verify 10 audit-findings edits) | confirmed 1 — resolved: diff proven mechanical (re-anchors + re-serialization) + the one legitimate A-019 remediated_by stamp |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (mutation battery + boundary trace, see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered directly (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered directly (mutation battery, see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered directly (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered directly (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered directly (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered directly (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — covered directly (see [RULE] + Rule Compliance) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings, domains assessed directly)
**Total findings:** 3 confirmed (1 preflight-advisory resolved, 2 informational from the mutation battery), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `dt` (shell loop) → `stepGame` playing dispatch → `phaseTime += dt` ticked INTO the phase stepper (space literal sim.ts:600-605; surface/trench dispatch sim.ts:330-340) → `progress()` → `phaseCleared('space')` = `phaseTime >= 21` (sim.ts:1553) → `enterPhase` resets to 0 (sim.ts:1719) → shell `deathStarPlacement` derives clamp(phaseTime/21) (render.ts:292). Safe because: attract/select/gameover branches return before the tick (the clock runs only in play), `beginRun` re-seeds via `initialState` (head start 1.95 for the run's first wave — ANY selected starting wave, exactly the ROM's SC.FWV flag), and a stepper that warps internally (stepTrench→clearRun) resets AFTER the tick, so no spent clock leaks into a new phase.

**Pattern observed:** tick-then-compare-in-the-same-frame mirrors the ROM PHESP1 order (ADDD #1 before the milestone compares) — a faithful port of mechanism, not just of a number; at sim.ts:330-340 with the citing comment.

**Error handling:** no new failure paths; a NaN/negative dt would poison `phaseTime` exactly as it already poisons `t`/`trenchTimer` (pre-existing, uniform class — the sim's NaN guard is deliberately scoped to the yoke input, sim.ts stepSurface altitude). A single huge dt advances at most ONE phase per frame (progress advances once; enterPhase re-zeroes), so the core degrades gracefully without the shell's fixed-timestep clamp.

**Observations (mutation battery: 7 mutations, 5 killed, 2 documented survivors; tree verified clean after reverts):**
1. `[VERIFIED]` The ruling's arithmetic and rate — WSMAIN.MAC:1441-1444 read firsthand: left-to-right eval ⇒ (2+7+1+9+1+1)*20 = 420 frames; the `;2 SECONDS` comments on `#2*20.` (WSMAIN.MAC:2064/2096/2128) corroborate both the convention and 20 Hz. Complies with the fidelity mandate (sprint 2628) and the repo's established game-frame rate (state.ts POST_HIT_SHIELD_WINDOW).
2. `[VERIFIED]` First-wave head start = SC.FWV semantics — `beginRun` (sim.ts:733) builds from `initialState(seed)`, so phaseTime opens at 1.95 for ANY selected starting wave, matching "0==>STILL ON FIRST WAVE" (WSGLOB.MAC:760) rather than a naive wave===1 test.
3. `[VERIFIED]` Single-exit space branch — no early return skips the tick (the block's own "SPACE ONLY" comment + read of sim.ts:345-600); `stepTrench` spreads `...state` so the ticked clock rides into its internal clearRun, which then legitimately re-zeroes it.
4. `[EDGE]` M6 survivor (informational): `>=` mutated to `>` is behaviourally unobservable — under float dt accumulation, exact equality at the compare is measure-zero; the ROM's IFHS at-or-past semantic is pinned in the phaseCleared doc comment. Equivalent mutant, no action.
5. `[TEST]` M7 survivor (LOW): the clock's surface/trench accumulation has no test pin (and no consumer yet) — removing the surface dispatch tick passes the full suite. Logged as a Delivery Finding for sw8-12, which becomes the first cross-phase consumer.
6. `[DOC]` The 10 audit-findings diffs verified mechanical: filtered diff reduces to `"line"` re-anchors + unicode re-serialization + exactly one content change, A-019 `remediated_by: "sw8-11"` — the correct exit for a CONFIRMED divergence this story genuinely removed (X-002/sw7-7 precedent).
7. `[TYPE]` `phaseTime` is a REQUIRED GameState field, not optional — tsc forces every full constructor to seed it (initialState is the only one), so a fixture cannot silently omit the clock. Sound invariant choice.
8. `[SEC]` No new attack/input surface: pure sim state, no DOM, no external input crossing, purity guards green (comments respect the DOM-global text scan).
9. `[SILENT]` No swallowed errors or silent fallbacks introduced; the warp is announced (`level-clear` event asserted on the crossing step in the contract suite).
10. `[SIMPLE]` Minimal implementation: two cited constants, one field, three tick sites, one predicate line, one shell derivation. The old `SPACE_WAVE_QUOTA > 0 ?` guard was correctly deleted rather than ported (END_S is pinned 21 by test — the guard would be dead code).
11. `[RULE]` See Rule Compliance below — all applicable lang-review areas pass.

### Rule Compliance (lang-review/typescript.md mapped to this diff)

| # | Check | Result |
|---|-------|--------|
| 1 | type-safety escapes | PASS — 0 `as any`/`@ts-ignore` in diff (preflight grep); test casts are single `as Partial<GameState>` (anchored, commented, exact post-fix) and the repo's established `as unknown as Record` dynamic-probe idiom |
| 2 | generic/interface pitfalls | PASS — `Partial<GameState>` is the repo's fixture-override convention, not a lost constraint; no Record<string,any>/Function |
| 3 | enum patterns | PASS — Phase union stays exhaustively switched (`phaseCleared`/`NEXT_PHASE` total over Phase) |
| 4 | null/undefined | PASS — no new nullable paths in src; tests use the fail-closed `?? 0` / guarded `?? 1` idiom |
| 5 | module/declaration | PASS — typed const exports only; import style matches file conventions |
| 6 | react/jsx | N/A |
| 7 | async/promise | N/A — pure synchronous sim |
| 8 | test quality | PASS — mutation battery: M1 enterPhase-reset (4 kills), M2 space-tick (3), M3 head-start (2), M4 END_S value (4), M5 placement source (2); zero vacuous assertions found |
| 9 | build/config | N/A — untouched |
| 10 | input validation | N/A — no external boundary |
| 11 | error handling | PASS — no new catch/throw; NaN-dt class pre-existing and uniform |
| 12 | performance/bundle | PASS — one extra spread per surface/trench frame, O(1) placement math |
| 13 | fix-regressions | PASS — all mutation edits reverted, `git status` clean, final suite 1921/1921 |

### Devil's Advocate

Suppose this is broken. The scariest line is the dispatch tick: `{ ...state, phaseTime: state.phaseTime + dt }` allocates a fresh state object per surface/trench frame — if any stepper compared object IDENTITY against the passed state, behaviour would change. I hunted for identity comparisons in stepSurface/stepTrench and found none; every consumer is structural. Next: could the clock DOUBLE-tick? The space literal ticks once, and progress/enterPhase never add dt; surface's stepper receives an already-ticked state and never touches the field again — no path ticks twice. Could it NEVER tick in some playing mode? The gameover-hold branch returns early by design (a dead cockpit must not warp — pinned by test), attract/select don't play. Pause: the shell stops calling stepGame, so the box freezes with the game — correct, and unlike a wall-clock port it cannot drain in the background; TEA's clock-not-wall-clock design choice is what makes this safe. A malicious speedrunner: can they end the phase early? Only by making dt big — which the shell's fixed-timestep loop owns; even a forged 1e9 dt advances one phase, not three, because progress() advances once and the entering phase re-zeroes. What would a confused future dev do? Read `phaseKills` and assume it still gates something in space — the field's doc now says explicitly it is scoring/HUD only. The genuine residue I found is the M7 survivor: the surface/trench clock is unpinned, so a refactor could silently stop ticking it outside space and nothing fails until sw8-12 lands its first cross-phase consumer — captured as a non-blocking finding routed to sw8-12 rather than left implicit. The wave-1 feel change (19-21s of endless TIEs vs "six kills and dive") is a real gameplay shift, but it is the CABINET's shift, verified against the primary source — exactly what this sprint exists to do.

**Handoff:** To The Announcer (SM) for finish-story.
## Impact Summary

**Outcome:** SHIPPED — PR slabgorb/star-wars#130 **MERGED** (squash `e6e79ef`, 2026-07-27T14:35:35Z, base develop). Suite 1921/1921 (183 files), tsc clean. Review verdict: **APPROVED**, single round.

**Blocking:** 0 BLOCKING items.

**What shipped (ruling: PORT):** the invented `SPACE_WAVE_QUOTA = 6` kill gate retired; the space phase now ends on the ROM's PH.TIM time-box — `phaseTime` clock on GameState (ticked per playing frame in ROM add-then-compare order, explicit `enterPhase` reset, `initialState` seeds the 1.95 s SC.FWV first-wave head start), `SPACE_PHASE_END_S = 21` / `SPACE_PHASE_HEAD_START_S = 1.95` (WSMAIN.MAC:1379-1454, 420 & 39 frames @ 20 Hz), `deathStarPlacement` approach re-derived from the clock. 14 sibling suites re-seated onto dual-mechanism staging (`tests/support/space-phase-end.ts`). Audit finding A-019 (CONFIRMED quota divergence) stamped `remediated_by: "sw8-11"`; 37 citations re-anchored.

**Non-blocking residue, each with an owner:**
- sw8-10 (pre-existing backlog): TWV2Z endless-tail divergence is now LIVE under the 21 s box — the fallback serves '1A1' mooks where the ROM loops the TWV2Z group.
- sw8-12 (FILED this story, depends_on sw8-11): interior PH.TIM music milestones (2 s theme / 10 s theme B / 20 s descent; clone cues on phase edges) + the first cross-phase `phaseTime` consumer should pin non-space accumulation (Reviewer mutation M7).
- Informational, no owner needed: `phaseCleared`'s `>=` (ROM IFHS) is unobservable vs `>` under float dt — the doc comment is the pin (Reviewer mutation M6).
