---
story_id: "mc11-1"
jira_key: "mc11-1"
epic: ""
workflow: "tdd"
---
# Story mc11-1: Wire the sputnik cruise-borrow: pass the live on-screen cruise count to sputnikFireCount at game.ts:493 (e.g. state.icbms.filter(i => i.kind === 'cruise').length) instead of the hardcoded 0, and delete the stale 'cruiseOnScreen is 0 until mc5-3' comment (game.ts:482). Assert a wave with cruise missiles on screen clamps the plane salvo (the 2*cruiseOnScreen branch fires in play). REV-01 plane-salvo clamp

## Story Details
- **ID:** mc11-1
- **Jira Key:** mc11-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc11-1-wire-sputnik-cruise-borrow
- **PR:** https://github.com/slabgorb/arcade/pull/461 (merged)
- **Branch Strategy:** gitflow (feat/mc11-1-wire-sputnik-cruise-borrow)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T15:01:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T14:32:26+00:00 | 2026-08-16T14:34:28Z | 2m 2s |
| red | 2026-08-16T14:34:28Z | 2026-08-16T14:39:31Z | 5m 3s |
| green | 2026-08-16T14:39:31Z | 2026-08-16T14:46:10Z | 6m 39s |
| review | 2026-08-16T14:46:10Z | 2026-08-16T15:01:25Z | 15m 15s |
| finish | 2026-08-16T15:01:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap, non-blocking] The SPAWNER has the same unwired cruise-borrow that mc11-1 just fixed for the plane.** While wiring the plane caller I checked the sibling `spawnIcbms` call (`game.ts:511-517`): it passes only `{ planeActive: planes.length > 0 }` — no `cruiseOnScreen`. `spawn.ts` defaults `cruiseOnScreen = opts?.cruiseOnScreen ?? 0`, and its own comment says the ROM subtracts CRMONS **twice** ("a cruise missile costs two slots", citing W3MAIN.MAC:2459-2463). So the spawner's intended `−2·cruise` term is dead exactly as the plane's was: a cruise currently reduces spawn headroom only once (via `current.length`), not the faithful twice. This is out of scope for mc11-1 (the story names only the plane seam) but is the same class of post-mc5 stale-wiring the mc11 epic targets. Suggest SM/Architect consider filing an mc11 follow-up (e.g. mc11-5) to thread the pre-spawn cruise count into the spawner's opts and re-baseline the swarm-density tests.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Re-baselined a sibling test threshold — `sputnik-integration.test.ts` firingCells floor 12 → 8.**
  - **What changed:** the aggregate matrix `expect(firingCells).toBeGreaterThanOrEqual(12)` → `>= 8`; `total >= 15` left unchanged (still passes at 19). Comment block rewritten with the instrumented per-wave breakdown.
  - **What the spec said:** the story is a wiring fix; it did not ask for a test change. But correctly wiring the cruise-borrow legitimately changes in-play firing, which this aggregate measured against the previously-unwired (cruiseOnScreen=0) behaviour.
  - **Why / instrumented mechanism:** per-wave probe (deterministic, the test's exact seeds) — wave 3 = 5/5 cells·8 shots (no cruise), wave 4 = 5/5·11 (no cruise), wave 6 = 0/5·0 (cruiseBudget 1), wave 8 = 0/5·0 (cruiseBudget 2). The pre-cruise waves are PROVABLY unchanged by mc11-1 (`cruiseOnScreenPreSpawn = 0` there → byte-identical call), so no firing regression is masked. Waves 6/8 hold fire because, under this budget-pinned harness (swarm never dips), `7 − 2·cruise − icbm ≤ 0` whenever the plane is ready — the faithful ICNORM "fires only when the swarm has dipped". The firing-regression guard still bites: a broken clamp/timer drives `total → 0` across ALL waves incl. the pre-cruise ones, failing `total >= 15`. `maxConcurrent <= NICBMS` unchanged.

## Sm Assessment

**Setup complete — routing to TEA (red phase).**

- **Story scope:** A one-line wiring fix in `plugins/missile-command/src/core/game.ts`. `sputnikFireCount` (`core/sputnik.ts:107`) clamps a plane's salvo by `2*cruiseOnScreen` (the PLCPV cruise-borrow), but its sole caller at `game.ts:493` passes a hardcoded `0` behind a stale comment at `game.ts:482` (`cruiseOnScreen is 0 until mc5-3`). mc5-3 shipped, so the clamp has never fired in play. Fix: pass the live on-screen cruise count (e.g. `state.icbms.filter(i => i.kind === 'cruise').length`) and delete the stale comment.
- **Verification target (TEA):** a RED test asserting that a wave with cruise missiles on screen clamps the plane salvo — the `2*cruiseOnScreen` branch fires in play — mutation-meaningful, not vacuous (the old hardcoded-0 path must fail it).
- **Guardrails:** `purity.test.ts` stays green (this is a `src/core` edit); any new `src/core` constant carries a citation-gated claim, though this story is expected to introduce none (it wires an existing tested seam). Ground truth REV-01 (W3DSUP.MAC / W3SOUN).
- **Availability confirmed:** no remote `mc11-1` branch, no sibling `.session` claim — clean setup on `feat/mc11-1-wire-sputnik-cruise-borrow` off `develop` (gitflow).
- **Note for downstream agents:** unrelated untracked df4 artifacts (`docs/adr/0005-*`, `docs/superpowers/specs/2026-08-16-defender-df4-*`, `sprint/epic-df4.yaml`) are floating in the working tree — leave them untouched; they are not part of this story.

**Decision:** Proceed to red (TEA).

## Tea Assessment

**RED landed — `plugins/missile-command/tests/mc11-1-sputnik-cruise-borrow.test.ts`.**

A differential wiring test (3 assertions). Two fields identical down to the seed, differing ONLY in whether the two on-screen missiles are `cruise` or ballistic; the plane's salvo must shrink when they are cruise (the `2·cruiseOnScreen` borrow). Plane shots are isolated by launch altitude (`origin.v === SPUTNIK_V_MIN` = 100), unreachable by top-edge spawns (222) or MIRV splits ([128,160]).

**Why a reducer test could not go RED:** `sputnikFireCount` already models the borrow correctly (`min(MXICON − 2·cruiseOnScreen − icbmsOnScreen, 3, budget)`). The bug is in the SOLE caller — `game.ts:493` passes a hardcoded `0` for `cruiseOnScreen`. So the test drives the wiring through `stepGame`, not the pure function.

**RED evidence (current, buggy code):**
- CONTROL — ballistic on screen → salvo `3` ✅ passes (proves the plane fires; anchors the baseline).
- cruise on screen → expected `1`, got `3` ❌ (caller feeds 0).
- cruise `<` ballistic → `3 < 3` ❌ (equal under the bug).
- Full missile-command suite: **1355 passed, only these 2 intended assertions fail.** No collateral.

**Arithmetic (REV-01 ICNORM PLCPV borrow):** field = 2 on-screen missiles, ready in-bounds plane, budget 8. ballistic `min(7−0−2,3,8)=3`; cruise (faithful) `min(7−2·2−2,3,8)=1`; cruise (bug) `min(7−0−2,3)=3`.

### Handoff to Dev (GREEN — the one-line wiring fix)

- **File:** `plugins/missile-command/src/core/game.ts`.
- **Line ~493:** change `sputnikFireCount(0, state.icbms.length + sputnikShots.length, sputBudget)` → pass the live on-screen cruise count as the first arg, e.g. `state.icbms.filter((i) => i.kind === 'cruise').length`. Use the PRE-spawn count (`state.icbms`), matching the `state.icbms.length` already used for `icbmsOnScreen` in the same call — the comment at :482 says "against the PRE-spawn on-screen count".
- **Line ~482:** delete the now-false parenthetical `(cruiseOnScreen is 0 until mc5-3)` from the comment (mc5-3 shipped). Leave the surrounding SPUTFIR/PLCPV explanation intact.
- **Guardrails:** pure `src/core` edit — `purity.test.ts` stays green; no new constant, so no new claim needed. Do not touch the pure `sputnikFireCount` (it is correct) and do not change the `icbmsOnScreen`/budget args.

### Delivery Findings
No upstream findings — the seam is exactly as the story and epic describe (built-and-tested reducer, sole caller hardcodes 0 behind a stale comment).
## Dev Assessment

**GREEN — the cruise-borrow is wired; suite fully green.**

- **Source fix (`plugins/missile-command/src/core/game.ts`):** hoisted `const cruiseOnScreenPreSpawn = state.icbms.filter((i) => i.kind === 'cruise').length` and passed it to `sputnikFireCount` in place of the hardcoded `0`. Distinct name from the later `cruiseOnScreen` (:525, post-spawn) to avoid a block-scope redeclare. Uses the PRE-spawn count, matching `state.icbms.length` already used for `icbmsOnScreen` in the same call. Deleted the stale `(cruiseOnScreen is 0 until mc5-3)` parenthetical; the surrounding SPUTFIR/PLCPV explanation is intact. Did NOT touch the pure `sputnikFireCount` (already correct) or the icbmsOnScreen/budget args.
- **Fidelity check:** the wiring matches the sibling `spawn.ts`, which applies the SAME ROM arithmetic with `icbmsOnScreen = current.length` (cruise included). Consistent; the story fixed the arg-1 semantics, and I executed exactly that.
- **Test results:** mc11-1 test 3/3 green; full missile-command suite **1357/1357**; `npm run lint` (tsc --noEmit, repo-wide) clean; `purity.test.ts` green (pure `.filter`, no fetch/canvas/Date/Math.random). No new src/core constant → no new claim.
- **One sibling test re-baselined** (see Design Deviations) — instrumented, no firing regression masked.
- **One non-blocking Delivery Finding filed** — the spawner has the same unwired cruise-borrow (suggested mc11 follow-up).
- **ACs:** the story's single AC ("a wave with cruise missiles on screen clamps the plane salvo — the 2·cruiseOnScreen branch fires in play") is met and pinned by the differential test.

**Decision:** Proceed to review.
## Subagent Results

| # | Subagent | Status | Findings | Received | Decision |
|---|----------|--------|----------|----------|----------|
| 1 | reviewer-preflight | clean | none (1357 pass, lint clean, purity clear) | Yes | N/A |
| 2 | reviewer-test-analyzer | findings | firingCells floor too loose (8 vs measured 10) | Yes | FIXED — tightened to 9/17 |
| 3 | reviewer-comment-analyzer | findings | game.ts "live since mc5-3" misleading; stale it() title | Yes | FIXED — both reworded |
| 4 | reviewer-rule-checker | findings | fix absent on disk (wiped); comment overclaim; vacuous aggregate | Yes | FIXED — fix re-applied+committed; comment scoped honestly; differential is the guard |
| 5 | edge_hunter | Skipped | disabled | N/A | Disabled via settings |
| 6 | silent_failure_hunter | Skipped | disabled | N/A | Disabled via settings |
| 7 | type_design | Skipped | disabled | N/A | Disabled via settings |
| 8 | security | Skipped | disabled | N/A | Disabled via settings |
| 9 | simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received: Yes**

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** The wiring fix is correct and mutation-proven. All three substantive findings from the specialists were addressed and re-verified, and the operational hazard that wiped the fix mid-review is resolved by committing.

### Findings and resolutions
1. **[RULE] [rule-checker, BLOCKER] The fix was absent on disk** — read-only review subagents ran `git checkout`/`stash` on the shared working tree, reverting the uncommitted `game.ts` fix to develop's hardcoded-0 (the documented "parallel subagents race the shared tree" hazard). RESOLVED: re-applied and **committed** (`eed03f1e`); `git show eed03f1e:...game.ts` carries `cruiseOnScreenPreSpawn`. mc11-1 test 3/3.
2. **[DOC] [comment-analyzer, high] Stale `it()` title** in sputnik-integration.test.ts (">= 12 cells, >= 25 shots" vs actual assertions) — RESOLVED: title now reads ">= 9 of 20 cells, >= 17 shots; cruise waves clamp".
3. **[DOC] [comment-analyzer, medium] Misleading `game.ts` comment** ("cruise-borrow live since mc5-3") — RESOLVED: reworded to state the borrow goes live in mc11-1; mc5-3 only shipped the cruise missiles.
4. **[TEST] [RULE] [test-analyzer + rule-checker, medium/high] The aggregate re-baseline was too loose / overclaimed causation** — the floor 8 was 2 below the measured 10, and the aggregate cannot distinguish wired-from-unwired (cruise waves fire ~0 under the harness either way). RESOLVED: tightened floor to 9/17, and rewrote the comment to state honestly that the DIFFERENTIAL test (mc11-1-sputnik-cruise-borrow.test.ts, RED on the unfixed caller) is the wiring guard, while this aggregate is only a "planes still fire" floor.

### Verification
- `npx vitest run --project missile-command` → **1357/1357**.
- `npm run lint` (tsc --noEmit) → clean.
- `purity.test.ts` green; no new src/core constant → no new citation claim needed (rule-checker PROJECT-2 confirmed).
- The one non-blocking Delivery Finding (the spawner has the same unwired cruise-borrow) stands as a suggested mc11 follow-up.

**No Critical/High issues remain. Approved.**