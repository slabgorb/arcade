---
story_id: "A2-3"
jira_key: "none"
epic: "A2"
workflow: "tdd"
---
# Story A2-3: Saucer siren keeps playing after game over — stop siren and any looping SFX on run end

## Story Details
- **ID:** A2-3
- **Jira Key:** none
- **Repos:** asteroids
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (fix/A2-3-stop-siren-on-game-over)

## Sm Assessment

**Story:** A2-3 — Saucer siren keeps playing after game over — stop siren and any looping SFX on run end (2 pts, p2, type: bug, epic A2 playtest followup).

**Setup performed:**
- Session file created at `.session/A2-3-session.md`; story context at `sprint/context/context-story-A2-3.md`.
- Branch `fix/A2-3-stop-siren-on-game-over` created from `develop` in the asteroids subrepo (gitflow; `fix/` prefix because story type is bug). Working tree clean.
- Jira explicitly skipped — this project tracks issues in local sprint YAML only; there is no Jira instance.
- Merge gate verified clear: no open PRs in asteroids.
- Sprint YAML integrity checked after setup: no unintended diffs to any epic YAML (known pf tooling risk).

**Routing decision:** Workflow `tdd` (from story YAML) is phased: setup → red → green → review → finish. Next phase is `red`, owned by TEA. Handoff to O'Brien (TEA) to write the failing test.

**Notes for TEA:** Prior related archives worth reading before RED: `sprint/archive/` entries for A2-1 and A2-2 (Delivery Findings), plus `sprint/context/context-epic-A2.md`. Story context is intentionally minimal; TEA defines acceptance criteria during RED. The bug is in the asteroids shell audio layer (looping SFX lifecycle on run end) — reproduction is: die on last life while a saucer is on screen, siren loop continues over game-over screen.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T12:18:54Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T11:39:49Z | 2026-07-05T11:42:43Z | 2m 54s |
| red | 2026-07-05T11:42:43Z | 2026-07-05T11:49:36Z | 6m 53s |
| green | 2026-07-05T11:49:36Z | 2026-07-05T11:52:25Z | 2m 49s |
| review | 2026-07-05T11:52:25Z | 2026-07-05T12:02:42Z | 10m 17s |
| red | 2026-07-05T12:02:42Z | 2026-07-05T12:07:39Z | 4m 57s |
| green | 2026-07-05T12:07:39Z | 2026-07-05T12:10:06Z | 2m 27s |
| review | 2026-07-05T12:10:06Z | 2026-07-05T12:18:54Z | 8m 48s |
| finish | 2026-07-05T12:18:54Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the run-end bug has a VISUAL twin — `render.ts:398` draws `state.saucer` whenever non-null, mode-blind, and nothing clears the saucer on run end, so a frozen saucer stays painted under the GAME OVER card and on into attract. Affects `asteroids/src/core/sim.ts` / `asteroids/src/core/lives.ts` (clearing `saucer` at run end would fix both the siren — `withSirenEdge` then emits the stop naturally — and the frozen sprite; the tests deliberately pin only the event, so Dev is free to choose this route). *Found by TEA during test design.*
- **Conflict** (non-blocking): `context-epic-A2.md` says "No new game mechanics or simulation changes in A2 … core sim (`src/core/`) remains untouched", but A2-3's fix requires a core change (the missing `saucer-siren-stop` emission lives in `src/core/sim.ts`'s run-end seam — the shell audio layer is event-driven and already correct). The epic context predates stories A2-3..A2-9 being added to the epic; story scope outranks epic context per the spec-authority hierarchy. Affects `sprint/context/context-epic-A2.md` (stale guardrail — worth refreshing when the epic context is next touched). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (TEA's frozen-saucer visual finding is resolved by this fix — clearing the saucer at run end removes both the loop and the sprite.)

### Reviewer (code review)
- **Gap** (blocking): a failed-hyperspace death on the last life with a live saucer still emits no `saucer-siren-stop` — the rebind at sim.ts:238 means `withSirenEdge`'s incoming side (sim.ts:447) reads the already-nulled saucer. Affects `asteroids/src/core/sim.ts` (capture `incomingSaucer` pre-jump, mirroring `wasDeadBefore` at sim.ts:237) and `asteroids/tests/events.test.ts` (failing test needed: seeded failed jump, last life, live saucer → exactly one stop; plus the reserve-lives negative). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the frozen-saucer visual twin also persists on the hyperspace run-end path until H-1's fix lands (same root cause — but note the hyperspace path DOES null the saucer via handleShipDeath, so only the EVENT is missing there, not the visual fix). Affects nothing beyond H-1's fix. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): branch is 2 commits behind origin/develop (unrelated feat(A-17) reference tables); merge-tree is clean, rebase optional before PR. Affects `asteroids` branch `fix/A2-3-stop-siren-on-game-over` (optional rebase). *Found by Reviewer during code review.*

### TEA (test design, rework round)
- No upstream findings during rework. (Confirmed by direct trace of sim.ts that Reviewer's M-1 concern (mutual ship-saucer ram) is ALREADY correct under the existing fix — `withSirenEdge`'s incoming side reads `state.saucer` captured before the collision loop runs, so a same-frame ram-then-redundant-null still yields exactly one edge. Added as a passing regression pin per Reviewer's request, not a second bug. Only H-1 — the hyperspace rebind — is an actual gap.)

### Dev (implementation, rework round)
- No upstream findings during rework implementation.

### Reviewer (code review, rework round 2)
- **Improvement** (non-blocking): subagents ran exploratory git operations (stash/checkout) directly against the shared working tree during background analysis; harmless here (independently verified clean) but worth tightening subagent instructions to work in a scratch clone/worktree when mutation-testing a fix, rather than the live review target. Affects reviewer subagent tooling/instructions (process, not this story's code). *Found by Reviewer during code review.*
- No other upstream findings during rework review.

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 1 Conflict, 0 Question, 0 Improvement)
**Blocking:** None

- **Conflict:** `context-epic-A2.md` says "No new game mechanics or simulation changes in A2 … core sim (`src/core/`) remains untouched", but A2-3's fix requires a core change (the missing `saucer-siren-stop` emission lives in `src/core/sim.ts`'s run-end seam — the shell audio layer is event-driven and already correct). The epic context predates stories A2-3..A2-9 being added to the epic; story scope outranks epic context per the spec-authority hierarchy. Affects `sprint/context/context-epic-A2.md`.

### Downstream Effects

- **`sprint/context`** — 1 finding

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. (The story context explicitly delegated AC definition to TEA during RED — the ACs below in the TEA Assessment ARE the spec for this bug, derived from the story title's two clauses: stop the siren, and stop any looping SFX, on run end.)

### Dev (implementation)
- No deviations from spec. (Implemented via the route TEA's assessment explicitly sanctioned — clearing `state.saucer` in `handleShipDeath`'s run-end branch so `withSirenEdge` emits the stop naturally; all 5 ACs pass as pinned, guards intact.)

### Reviewer (audit)
- **TEA "No deviations from spec"** → ✓ ACCEPTED by Reviewer: AC definition was legitimately delegated to TEA; the ACs are sound as written. (The hyperspace gap is a coverage miss against AC-1's own wording, filed as finding H-1 — not an undocumented deviation by TEA from a prior spec.)
- **Dev "No deviations from spec"** → ✓ ACCEPTED by Reviewer: implementation followed TEA's sanctioned route faithfully and minimally.
- **AC-1 unmet on the hyperspace path (undocumented):** Spec (AC-1) says "The step that ends the run (last-life death, mode → 'gameover') with a live saucer emits exactly one `saucer-siren-stop` event" — with no carve-out for the death cause. Code satisfies this only for collision-seam deaths; a failed-hyperspace last-life death emits nothing (sim.ts:447 reads the post-rebind, already-nulled saucer). Not documented by TEA/Dev. Severity: H. Filed as finding H-1 in the Reviewer Assessment; routed to rework.

### TEA (test design, rework round)
- No deviations from spec. (New tests target AC-1 exactly as originally worded — no carve-out for death cause — closing the gap Reviewer identified. M-1's mutual-ram pin and the hyperspace reserve-lives guard are both regression pins for already-correct behavior, not new ACs.)

### Dev (implementation, rework round)
- No deviations from spec. (Implemented exactly the fix Reviewer specified and TEA's root-cause note confirmed: capture `incomingSaucer` before the hyperspace rebind, mirroring the existing `wasDeadBefore` pattern, and feed it into `withSirenEdge` instead of the post-jump `state.saucer`.)

### Reviewer (audit, rework round 2)
- **TEA "No deviations from spec" (rework round)** → ✓ ACCEPTED by Reviewer: new tests target AC-1 exactly as originally worded, closing the H-1 gap without introducing scope beyond what was requested.
- **Dev "No deviations from spec" (rework round)** → ✓ ACCEPTED by Reviewer: fix matches the exact route specified in the round-1 Reviewer Assessment and independently confirmed by TEA's root-cause trace; verified by hand-trace and by mutation testing (see Subagent Results, rework round 2).
- No new undocumented deviations found this round.

## TEA Assessment (rework round)

**Tests Required:** Yes
**Reason:** n/a (REJECTED verdict routed back to red per SM's rework protocol)

**Rework scope:** Reviewer finding H-1 (blocking [HIGH]) — a failed hyperspace jump on the last life with a live saucer emits no `saucer-siren-stop`, because `triggerHyperspace` calls `handleShipDeath` and rebinds `state` BEFORE `withSirenEdge` reads `state.saucer` as its incoming side (sim.ts:447), so the comparison sees an already-nulled saucer on both sides.

**Test Files:**
- `asteroids/tests/events.test.ts` — 3 new tests appended to the existing "saucer siren on run end (A2-3)" describe block, committed as d1acc57 on `fix/A2-3-stop-siren-on-game-over`:
  1. `'emits saucer-siren-stop when a failed hyperspace jump ends the run (Reviewer H-1)'` — the failing pin (uses a computed seed whose first RNG draw fails the hyperspace survival roll, mirroring tests/hyperspace.test.ts's `findSeed` idiom).
  2. `'does not stop the siren when a failed hyperspace jump leaves ships in reserve'` — regression guard (passes today).
  3. `'stops the siren exactly once when a mutual ship-saucer ram ends the run (Reviewer M-1)'` — regression pin for Reviewer's M-1 concern; traced by hand and confirmed ALREADY correct under the existing fix (passes today), pinned so a future refactor can't silently break it.

**Tests Written:** 3 tests covering 1 blocking AC gap (H-1) + 1 non-blocking regression pin (M-1)
**Status:** RED (1 failing — H-1, verified by testing-runner, run cached at `.session/test-runs/A2-3-tea-red-rework.md`; both guards pass; all 628 prior tests still pass; typecheck clean)

**Root cause confirmed for Dev (Julia):** `stepGame` (sim.ts:236-238) captures `wasDeadBefore` (pre-jump) but NOT the pre-jump saucer before calling `triggerHyperspace`, which may itself invoke `handleShipDeath` and null `state.saucer` as a side effect. The later `withSirenEdge(state.saucer, …)` at sim.ts:447 then reads the POST-jump `state.saucer` as its "incoming" value — already null on a hyperspace death, so no edge is ever observed. Suggested fix (as Reviewer specified): capture `const incomingSaucer = state.saucer` immediately alongside `wasDeadBefore` (sim.ts:237), before the `triggerHyperspace` call, and pass `incomingSaucer` (not `state.saucer`) into `withSirenEdge` at sim.ts:447.

**M-1 disposition:** Investigated Reviewer's medium-severity mutual-ram concern by tracing sim.ts directly — `withSirenEdge`'s incoming argument (`state.saucer`) is captured from the ORIGINAL pre-collision-loop state, unaffected by the same-frame `rammedSaucer` branch nulling the local `saucer` variable later in the same step. Confirmed via a live test run: the M-1 pin PASSES today. No fix needed for M-1; it is now a permanent regression guard.

**Not addressed (Reviewer's LOW findings, non-blocking, deferred):** the lives-0 legacy free-play niche with a live saucer, and a saucer-shot (not ram/rock) kill on the last life. Both converge on the same `handleShipDeath` seam the H-1 fix touches, so risk is low; left as optional future coverage per Reviewer's own "optional" framing.

### Rule Coverage

TypeScript lang-review checklist — rework adds tests only:

| Rule | Application in this phase | Status |
|------|---------------------------|--------|
| #1 type safety escapes | No `as any`/`@ts-ignore`/non-null assertions in new code | clean |
| #8 test quality | Concrete assertions (`toHaveLength`, `toBe`) on event arrays and mode/saucer state; no vacuous assertions; `findHyperspaceSeed` mirrors an established, already-reviewed pattern from tests/hyperspace.test.ts rather than inventing a new one | clean |
| #4 null/undefined | New tests exercise `saucer` transitioning null↔non-null across the hyperspace and mutual-ram seams explicitly | covered |

**Rules checked:** 3 of 3 applicable
**Self-check:** 0 vacuous tests found

**Handoff:** To Dev (Julia) for GREEN — extend the fix per the root cause above so the 1 failing test passes without breaking the 2 new guards, the 2 prior guards, or the 628 previously-passing tests.

## Dev Assessment (rework round)

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/sim.ts` — `stepGame` now captures `const incomingSaucer = state.saucer` immediately alongside the existing `wasDeadBefore` latch, BEFORE calling `triggerHyperspace` (which can null `state.saucer` as a side effect via `handleShipDeath` on a failed jump). `withSirenEdge`'s call site now passes `incomingSaucer` instead of the post-jump `state.saucer`. 8 lines changed (1 code line + 7 comment lines).

**Fix exactly as specified:** Reviewer's H-1 finding named the precise line and the precise fix (mirror `wasDeadBefore`'s capture-before-rebind pattern); TEA's rework-round root-cause note confirmed the same read of sim.ts independently. No alternative approach considered — this is the minimal, structurally-obvious fix once the bug is understood, and it changes behavior ONLY on the failed-hyperspace death edge (every no-op and every successful-jump path leaves `state.saucer` untouched by `triggerHyperspace`, so `incomingSaucer` is identical to the old `state.saucer` read there — confirmed by the full 631-test regression pass, including tests/hyperspace.test.ts and tests/saucer*.test.ts).

**Tests:** 631/631 passing (GREEN — verified by testing-runner, run cached at `.session/test-runs/A2-3-dev-green-rework.md`; the H-1 test now passes, both new rework guards (reserve-lives hyperspace, M-1 mutual-ram) still pass, all 628 prior tests still pass, typecheck clean)
**Branch:** `fix/A2-3-stop-siren-on-game-over` (pushed; commits 4916baa test, 7a6649b fix, d1acc57 rework test, da784c9 rework fix)

**Self-review:** wired end-to-end (same event → dispatch → engine chain as round 1, no shell changes); follows the codebase's existing "capture pre-rebind" pattern (`wasDeadBefore`) rather than inventing a new one; H-1 fully resolved; no error handling required (pure state transition); no debug code; working tree clean.

**Handoff:** To review phase (rework round 2).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/lives.ts` — `handleShipDeath`'s run-end branch now clears `saucer: null` (one field + rationale comment). Once mode leaves 'playing' the saucer subsystem's mode gates can never remove the live saucer, so the run-end transition itself takes it out; `withSirenEdge` in sim.ts then sees the saucer leave on the final frame and emits `saucer-siren-stop`, which the (already-correct, already-pinned) shell dispatch maps to `stopLoop('saucerSiren')`. Side benefit per TEA's finding: the renderer no longer paints a frozen saucer under the GAME OVER card.

**Approach note:** Chose the state-clearing route over emitting the event directly at the seam — it is the smaller change, reuses the existing single emission point for every "saucer leaves" path (bullet kill, ram, rock collision, far-edge despawn, and now run end), and fixes the visual twin for free. Thrust needed no change (death-edge stop already emitted, sim.ts).

**Tests:** 628/628 passing (GREEN — verified by testing-runner, run cached at `.session/test-runs/A2-3-dev-green.md`; the 4 RED tests now pass, both guards still pass, typecheck clean, no regressions)
**Branch:** `fix/A2-3-stop-siren-on-game-over` (pushed; commits 4916baa test, 7a6649b fix)

**Self-review:** wired end-to-end (core event → existing dispatch → existing engine channel stop — no shell changes needed); follows the codebase's event-edge pattern; all 5 ACs met; no error handling required (pure state transition); no debug code; working tree clean.

**Handoff:** To review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all mechanical gates green: 628/628 tests, tsc clean, lint clean, tree clean, 0 smells; branch 2 behind origin/develop but merge-tree clean) | N/A (noted non-blocking rebase option) |
| 2 | reviewer-edge-hunter | No — disabled | disabled | N/A | Disabled via settings — domain covered by lead reviewer (see [EDGE] finding H-1 below, found by lead) |
| 3 | reviewer-silent-failure-hunter | No — disabled | disabled | N/A | Disabled via settings — lead checked: no catches, no swallowed errors in diff (pure state transition) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (1 medium, 2 low) + verified tests non-vacuous empirically | confirmed 3 (M-1 medium, L-1/L-2 low), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No — disabled | disabled | N/A | Disabled via settings — lead checked: the new lives.ts comment is accurate but overbroad (see H-1: "the run end takes any live saucer with it" is not yet true for the hyperspace path) |
| 6 | reviewer-type-design | No — disabled | disabled | N/A | Disabled via settings — lead checked: no new types; `NonNullable<GameState['saucer']>` and `Partial<GameState>` match file conventions |
| 7 | reviewer-security | No — disabled | disabled | N/A | Disabled via settings — lead checked: no input surface, no injection/auth/secrets exposure (pure in-memory sim, no tenant model in this project) |
| 8 | reviewer-simplifier | No — disabled | disabled | N/A | Disabled via settings — lead checked: fix is one field on an existing branch; nothing to simplify |
| 9 | reviewer-rule-checker | Yes | clean | none (16 rules — 13 TS checklist + 3 house conventions — 17 instances, 0 violations; GATE_RESULT: pass) | N/A |

**All received:** Yes (3 enabled returned: preflight clean, rule-checker clean, test-analyzer 3 findings; 6 disabled per settings, domains covered by lead)
**Total findings:** 4 confirmed (1 high from lead, 1 medium + 2 low from test-analyzer), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [EDGE] | Run end via FAILED HYPERSPACE with a live saucer still never emits `saucer-siren-stop` — the story's headline bug survives on one of the two run-end paths. `triggerHyperspace` routes a failed last-life jump through `handleShipDeath` (hyperspace.ts:79) BEFORE the siren-edge comparison, and `stepGame` rebinds `state` to the post-jump result (sim.ts:238); `withSirenEdge(state.saucer, …)` (sim.ts:447) therefore reads the ALREADY-NULLED saucer as its "incoming" side → null→null, no edge, no stop event, siren rings through gameover into attract. The codebase anticipated this exact trap for thrust — `wasDeadBefore` is captured PRE-jump (sim.ts:237) precisely so a hyperspace death cues explosion/thrust-stop — but the siren edge got no pre-jump capture. | asteroids/src/core/sim.ts:447 (with hyperspace.ts:79, sim.ts:237-238) | Capture the incoming saucer before the hyperspace rebind, mirroring `wasDeadBefore`: `const incomingSaucer = state.saucer` at sim.ts:~237, then `withSirenEdge(incomingSaucer, …)` at sim.ts:447. TEA first pins it with a failing test: last-life failed hyperspace (seeded rng so the roll fails — e.g. find a seed where the first `nextFloat` < 0.25) with a live saucer → exactly one `saucer-siren-stop`; and the reserve-lives variant (failed jump, lives>1, saucer alive) → zero stop events. |
| [MEDIUM] [TEST] | "Exactly once" is not pinned for the overlap case where the run-ending death ALSO removes the saucer by another mechanism in the same frame (mutual ship↔saucer ram, sim.ts:361; or a player bullet killing the saucer the same frame the ship dies). Currently correct (one before/after diff → one event), but a refactor of the collision block or withSirenEdge could double-emit or miss undetected. | asteroids/tests/events.test.ts:335 | Add a test: last-life ship↔saucer mutual ram → mode 'gameover', exactly one `saucer-siren-stop`. |
| [LOW] [TEST] | Lives-0 legacy free-play niche (sim.ts:429 `lives > 0` guard) with a live saucer is unasserted — a future guard change could silently start stopping sirens there. | asteroids/tests/events.test.ts:335 | Optional: lives:0 + saucer alive + fatal ram → mode stays 'playing', zero stop events. |
| [LOW] [TEST] | Run end via saucer-SHOT death (`shipHitBySaucerShot`, sim.ts:340-343) never exercised on the last life; converges on the same seam so risk is low. | asteroids/tests/events.test.ts:356 | Optional: saucer bullet kills ship on last life → same one-stop contract. |

**Observations (verified-good and confirmed findings):**
1. [HIGH][EDGE] — the hyperspace run-end leak, above (found by lead; edge-hunter disabled).
2. [VERIFIED][RULE] Rule-checker GATE_RESULT: pass — 13 TS checklist rules + 3 house conventions (core purity, exhaustiveness guards, edge-triggered semantics) across all 17 constructs in the diff, 0 violations; core-boundary.test.ts still passes, lives.ts gained no imports (evidence: rule-checker run + `src/core/lives.ts` imports unchanged at lines 26-28).
3. [VERIFIED][TEST] The 6 new tests are empirically non-vacuous — test-analyzer reverted the fix line and watched 4 of 6 fail, restored it and watched all pass; the 300-frame loop genuinely reaches 'attract' (score 0 never qualifies — highscore.ts:31 — so the non-qualifying 3 s card path runs).
4. [VERIFIED][SILENT] No swallowed errors introduced: the diff contains no try/catch, no fallback branches; `saucer: null` is an explicit literal on a `Saucer | null` field (lives.ts:87) — nothing degrades silently (silent-failure-hunter disabled; lead-checked).
5. [VERIFIED][TYPE] No new types, no casts, no `as any`; test helpers use `NonNullable<GameState['saucer']>` (events.test.ts:339) and `Partial<GameState>` override params matching the file's existing `playing()` convention at line 45 (type-design disabled; lead-checked).
6. [VERIFIED][SEC] No security surface: pure in-memory deterministic sim, no user input parsing, no storage/network in diff (security disabled; lead-checked).
7. [VERIFIED][SIMPLE] Minimal-diff fix: one field on an existing terminal branch, reusing the single existing emission point (withSirenEdge) rather than adding a parallel mechanism (simplifier disabled; lead-checked).
8. [DOC] The new lives.ts comment claims "the run end takes any live saucer with it" — true for collision-seam run-ends but NOT yet for the hyperspace path (H-1); when the fix lands, the comment becomes fully true, so no separate change needed beyond H-1 (comment-analyzer disabled; lead-checked).

**Data flow traced:** player input (hyperspace press) → `triggerHyperspace` (sim.ts:238) → failed roll → `handleShipDeath` (hyperspace.ts:79) → mode 'gameover' + `saucer: null` → … → `withSirenEdge(state.saucer /* post-rebind, already null */, after)` (sim.ts:447) → **no event** → shell `playEventSounds` never calls `stopLoop('saucerSiren')` → WebAudio loop keeps sounding. That trace IS the H-1 finding. The happy path (rock ram, sim.ts:430 seam) traces correctly: frame-start `state.saucer` non-null → `handleShipDeath` nulls → edge → one stop → dispatch (audio-dispatch.ts:51-53) → `stopLoop` → `stopChannel('saucerSiren')` (audio.ts:236) tears down the looping source.
**Wiring:** core event → shell dispatch → engine channel all pre-existing and pinned (audio-dispatch.test.ts:76,139-146); no UI changes needed.
**Error handling:** n/a in diff (pure state transition); engine-side stop is try/catch-guarded against already-ended sources (audio.ts:159-164, pre-existing).
**Pattern observed:** good — the fix reuses the established "single consumption point" pattern (`handleShipDeath`, lives.ts:68-73) and the single siren emission point (`withSirenEdge`), rather than adding a second mechanism. The miss is that the pattern's OTHER caller (hyperspace) sits before the edge comparison.
**Hard questions:** null/empty — saucer:null exercised both ways (guard tests); huge inputs/timeouts/races — n/a, deterministic frame-stepped sim; determinism — `saucer: null` consumes no rng, replay-safe (rule-checker #14 confirms no wall-clock/entropy added).

**Challenged VERIFIEDs vs subagent findings:** test-analyzer's M-1/L-1/L-2 target the same area as my VERIFIED #3 (tests non-vacuous) — no contradiction: the existing tests are sound; the gaps are additional paths. No subagent contradicts any VERIFIED. **Challenged VERIFIEDs vs project rules:** no rule conflicts — rule-checker pass corroborates.

### Rule Compliance

Per lang-review/typescript.md, mapped by the rule-checker across every construct in the diff (2 helpers, 5 tests, 1 field addition): #1 escapes ✓, #2 generics ✓, #3 enums n/a, #4 null handling ✓, #5 modules ✓ (no import changes), #6 JSX n/a, #7 async n/a, #8 test quality ✓ (concrete assertions, no mocks, no .only/.skip), #9 build config n/a (strict mode still on), #10 input validation n/a, #11 error handling n/a, #12 perf ✓ (300-frame loop test-only), #13 fix-regressions ✓ (fix line re-scanned, clean). House rules: core purity ✓ (no new imports in lives.ts; core-boundary test passes), exhaustiveness ✓ (no new event variant; dispatch guard untouched), edge-triggered semantics ✓ for the covered paths / ✗ for the hyperspace path (that is H-1 — a behavior gap, not a style violation).

### Devil's Advocate

Assume this fix is a lie the tests were built to believe. The tests all kill the ship the same way — a rock parked on its nose — so they prove exactly one of the ways a run ends and anoint the fix as complete. What does a real player do on their last ship with a saucer wailing across the field? They panic. They mash hyperspace — the panic button the game gives them for exactly this moment. One jump in four self-destructs, and that death does not go through the tested seam at all: it happens at the top of the frame, inside `triggerHyperspace`, which quietly rebinds `state` before the siren-edge comparison ever looks at it. The comparison then sees "no saucer before, no saucer after" and concludes nothing happened. The siren — the thing this story exists to silence — keeps ringing over the GAME OVER card, in precisely the scenario most likely to produce the bug report a second time. Worse, the shiny new comment in lives.ts now asserts "the run end takes any live saucer with it," which will read as settled truth to the next maintainer, and the 628-test green wall will back the lie. The suite's guards are good guards, but they guard the wrong door: nothing pins the mutual-ram overlap (one event, not two?), nothing pins the legacy lives-0 niche, nothing pins the saucer-shot kill. A refactor of the collision block could double-fire the stop tomorrow and every test would stay green. The devil found the body: H-1 is real, line-traceable, and player-reachable. Reject.

**Handoff:** Back through the red phase — O'Brien (TEA) pins the hyperspace run-end with failing tests (and the M-1 overlap pin while there), then Julia (Dev) extends the fix (pre-jump `incomingSaucer` capture mirroring `wasDeadBefore`).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a (bug story; TDD workflow)

**Acceptance criteria defined by TEA** (story YAML had none; story context delegated this to RED):
1. The step that ends the run (last-life death, mode → 'gameover') with a live saucer emits exactly one `saucer-siren-stop` event — for either saucer size.
2. Across the whole death → gameover card → attract arc, the siren stops exactly once (no zero-stop bug, no per-frame stop spam).
3. "Any looping SFX": a run ending with thrust held emits BOTH `thrust-stop` and `saucer-siren-stop` on the run-end frame.
4. Guard: run end with no live saucer emits no `saucer-siren-stop` (the event's documented meaning is "the live saucer is gone").
5. Guard: a non-final death (ships in reserve) does NOT stop the siren — the saucer is still alive while the pilot waits out the respawn.

**Test Files:**
- `asteroids/tests/events.test.ts` — new describe block "saucer siren on run end (A2-3)" (6 tests: 4 failing, 2 passing guards), committed as 4916baa on `fix/A2-3-stop-siren-on-game-over`.

**Tests Written:** 6 tests covering 5 ACs
**Status:** RED (4 failing — verified by testing-runner, run cached at `.session/test-runs/A2-3-tea-red.md`; 624 pre-existing tests pass, typecheck clean)

**Root cause for Dev (Julia):** In `stepGame` (asteroids/src/core/sim.ts), the death seam `handleShipDeath` flips mode to 'gameover' BEFORE the saucer subsystem runs; `stepSaucer`/`updateSpawnDirector` then early-return on their mode gates, so the saucer is never removed and `withSirenEdge` (sim.ts:68) sees no edge — no stop event. Every later `stepGameOver`/`stepAttract` frame resets `events: []`. The shell is NOT at fault: `audio-dispatch.test.ts` already pins `saucer-siren-stop` → `stopLoop('saucerSiren')` (both sirens share one channel). Thrust is already handled (sim.ts:391 death-edge stop, pinned by the H-1 block). Suggested minimal fix: clear `state.saucer` on the run-end transition (e.g. in `handleShipDeath`'s gameover branch or at the seam in stepGame) — `withSirenEdge` then emits the stop naturally AND the frozen-saucer visual (see Delivery Findings) disappears; emitting the event directly at the seam also satisfies the tests. Do NOT stop the siren on non-final deaths (guard test).

### Rule Coverage

TypeScript lang-review checklist (.pennyfarthing/gates/lang-review/typescript.md) — this phase adds tests only, no source changes, so implementation-facing rules apply to the new test code itself:

| Rule | Application in this phase | Status |
|------|---------------------------|--------|
| #1 type safety escapes | New tests use no `as any` / `@ts-ignore` / non-null assertions; saucer size typed as `'large' \| 'small'`, null-safety via `NonNullable<GameState['saucer']>` | clean |
| #8 test quality | Every test asserts concrete event counts + mode; no vacuous `let _ =` / `assert(true)`; `it.each` variants assert per-size; guards assert the negative case | clean |
| #4 null/undefined | Tests exercise both `saucer: null` and live-saucer states at the run-end seam | covered |
| #3 exhaustiveness | Not applicable to test code; the dispatch exhaustiveness guard (existing `_exhaustive: never`) already compile-pins new event types | n/a |
| Others (#2,5,6,7,9–13) | No source/config/React/async changes in RED | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage in the new tests
**Self-check:** 0 vacuous tests found (every assertion pins an event count, a mode, or a latch; one over-clever conditional-type helper signature was simplified before commit)

**Handoff:** To Dev (Julia) for GREEN — make the 4 failing tests pass without breaking the 2 guards or the 624 passing tests.

## Subagent Results (rework round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (631/631 tests, tsc clean, lint clean, tree clean, 0 smells; branch state noted informational-only) | N/A (one process observation noted below, not a code finding) |
| 2 | reviewer-edge-hunter | No — disabled | disabled | N/A | Disabled via settings — domain covered by lead reviewer (H-1's fix traced by hand: `incomingSaucer` capture site, every other read of `state.saucer` in sim.ts checked for interference — none found) |
| 3 | reviewer-silent-failure-hunter | No — disabled | disabled | N/A | Disabled via settings — lead checked: no new catches/fallbacks in the rework diff |
| 4 | reviewer-test-analyzer | Yes | clean | none (mutation-tested the H-1 fix, the reserve-lives guards, and M-1 — all load-bearing and non-redundant; confirmed `findHyperspaceSeed` resolves in single-digit iterations, no flakiness risk; confirmed both round-1 LOW gaps remain legitimately absent, not silently broken) | N/A |
| 5 | reviewer-comment-analyzer | No — disabled | disabled | N/A | Disabled via settings — lead checked: the new sim.ts comment accurately describes the fix and cites "Reviewer H-1" for traceability |
| 6 | reviewer-type-design | No — disabled | disabled | N/A | Disabled via settings — lead checked: `incomingSaucer: Saucer | null` matches `withSirenEdge`'s existing parameter type exactly, no narrowing lost |
| 7 | reviewer-security | No — disabled | disabled | N/A | Disabled via settings — no input surface changed |
| 8 | reviewer-simplifier | No — disabled | disabled | N/A | Disabled via settings — lead checked: minimal 8-line diff, mirrors the existing `wasDeadBefore` pattern rather than inventing a new mechanism |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rules — 13 TS checklist + 4 house conventions — 34 instances across the FULL branch diff, 0 violations; GATE_RESULT: pass; explicitly re-verified the fix doesn't silently widen `incomingSaucer`'s type or drop the null check) | N/A |

**All received:** Yes (3 enabled returned: preflight clean, test-analyzer clean, rule-checker clean; 6 disabled per settings, domains covered by lead)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (round 1's 2 LOW findings remain on record as explicitly-deferred optional coverage, not re-litigated here)

**Process note (non-blocking, for the record):** mid-review, the test-analyzer and rule-checker subagents independently ran exploratory git operations against the shared working tree (`git stash -u`, `git checkout <commit> -- .`, temporary source mutation to test assertion strength) to verify test discriminating power. Both cleaned up after themselves — I independently verified post-hoc: `git status` clean, no stash entries, HEAD at the correct commit (da784c9), `git diff HEAD` empty, and re-ran the full suite (631/631) and typecheck (clean) myself rather than trusting the subagent transcripts alone. No lasting corruption. Flagging as a process risk worth future attention (subagents doing destructive git exploration on a live shared working tree), not a code defect in this diff.

## Reviewer Assessment (rework round 2)

**Verdict:** APPROVED

**Scope of this round:** re-review after REJECTED verdict (round 1, finding H-1 blocking). This round's diff adds 2 commits: `d1acc57` (failing tests: H-1 pin + 2 regression guards) and `da784c9` (fix: capture `incomingSaucer` before the hyperspace rebind in `stepGame`, sim.ts).

**H-1 resolution verified:** Traced the fix by hand — `state.saucer` at sim.ts:284 (`let saucer = state.saucer`, feeding the collision loop) is correctly LEFT reading the post-jump value, since collision detection must operate on the current frame's post-hyperspace ship/saucer state; only the siren-edge comparison at sim.ts:454 was redirected to `incomingSaucer` (the pre-jump capture). This is the narrowest possible fix — it does not touch collision detection, scoring, or respawn logic. Independently re-ran the full suite (631/631) and typecheck (clean) myself after the subagents' background exploration touched the working tree, confirming no residual corruption (see process note above) and that the fix is real, not an artifact of a stale read.

**Verification depth this round:** test-analyzer mutation-tested three things and got the expected signal each time: (1) reverting the `incomingSaucer` call-site back to `state.saucer` fails exactly the H-1 pin and nothing else; (2) moving `saucer: null` out of `handleShipDeath`'s terminal branch into the fallback (an over-eager, wrong fix) fails both reserve-lives guards (round 1's and round 2's); (3) checking the M-1 test against develop's pre-fix baseline shows it was already green there (mutual ram never routed through the H-1 bug path, since `triggerHyperspace` no-ops on non-hyperspace input) — confirming M-1 is a genuine forward-regression pin, not a test masking a live bug. This is exactly the kind of evidence a `[VERIFIED]` claim needs, and it came from the subagent, not just my own read — corroborating rather than contradicting my hand-trace.

**Round 1's carry-forward items:** the two LOW-severity gaps (lives-0 legacy niche with a live saucer; saucer-shot last-life death) remain explicitly deferred as optional, non-blocking coverage — test-analyzer confirmed both are still genuinely absent (not silently broken) and mechanically converge on the same `handleShipDeath` seam already covered. Not re-raised as blockers; noted here so they aren't lost if a future story touches this area.

**Devil's Advocate (round 2):** Is there a THIRD run-end path this fix still misses? I enumerated every route to `handleShipDeath`: (1) collision-seam death (sim.ts:437, rock ram / mutual saucer ram / saucer-shot kill — all converge on one call site, all covered or explicitly-deferred-as-low-risk) and (2) failed hyperspace (hyperspace.ts:79, now fixed). There is no third caller (`grep -rn "handleShipDeath"` confirms exactly these two call sites in src/). Could `incomingSaucer` be stale in some OTHER way — e.g., if `triggerHyperspace` were ever changed to run twice, or if a future story added a second early-return branch before the capture? The capture sits at the very top of `stepGame`, immediately after the mode-branch early-returns and immediately before the ONLY call to `triggerHyperspace` — there is no code path between capture and use that could re-null `state.saucer` out from under it undetected, and the mirror to `wasDeadBefore` (identical scope, identical lifetime) means any future refactor that breaks one almost certainly breaks the other visibly. I looked for a double-emit risk (edge fires twice in one frame): `withSirenEdge` is called exactly once per `stepGame` invocation, non-recursively, so this is structurally impossible. No new finding survives this pass.

**Data flow traced (hyperspace path):** panic-button press → `triggerHyperspace` (sim.ts:238, now reading `incomingSaucer` captured one line earlier) → failed roll → `handleShipDeath` nulls `state.saucer` on the last life → `withSirenEdge(incomingSaucer /* pre-jump, non-null */, after /* post-step, null */)` → edge detected → `saucer-siren-stop` emitted → shell dispatch (already pinned, unchanged) → `stopLoop('saucerSiren')`. Matches the collision-seam path's contract exactly, now for both run-end doors.

**Pattern observed:** exemplary minimal-fix discipline — Dev implemented precisely what Reviewer specified and TEA's root-cause note confirmed, with zero scope creep, reusing an established codebase pattern (`wasDeadBefore`) rather than inventing a parallel one.

**Handoff:** To SM for finish-story.