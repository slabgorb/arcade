---
story_id: "jt13-11"
jira_key: "jt13-11"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-11: Lava cinematic for the troll grip-drown: route stepTrolls gs.inLava through the ADGFLR sink + SNPLAV/SNELAV cue

## Story Details
- **ID:** jt13-11
- **Jira Key:** jt13-11
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-11-lava-cinematic-troll-grip-drown
- **PR:** (none yet)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T21:39:23Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T21:00:09Z | 2026-08-18T21:02:42Z | 2m 33s |
| red | 2026-08-18T21:02:42Z | 2026-08-18T21:13:03Z | 10m 21s |
| green | 2026-08-18T21:13:03Z | 2026-08-18T21:16:23Z | 3m 20s |
| review | 2026-08-18T21:16:23Z | 2026-08-18T21:29:03Z | 12m 40s |
| green | 2026-08-18T21:29:03Z | 2026-08-18T21:35:17Z | 6m 14s |
| review | 2026-08-18T21:35:17Z | 2026-08-18T21:39:23Z | 4m 6s |
| finish | 2026-08-18T21:39:23Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM, setup, non-blocking, Improvement]** Premise verified against the tree before setup — the epic description is accurate and CURRENT (no stale claims, no correction block needed). Confirmed: (1) jt13-10's `stepLavaDeath` exists at `plugins/joust/src/core/sim.ts:387` and is wired for the non-gripped lava death via the path at `sim.ts:2549-2570`; (2) the grip-drown gap is real at `stepTrolls`'s `gs.inLava` branch, `sim.ts:1142` — `removed.add(troll.id); removed.add(victim.id)` same-frame, no sink, no cue; (3) the code comment at `sim.ts:2562-2564` already names this outstanding gap. ROM anchor: ADDLAV JMPs into the SAME ADGFLR cinematic (~:6643).
- **[SM, setup, non-blocking, Question→TEA]** Coverage seam for the RED test: non-gripped path is guarded by `plugins/joust/tests/lava-death-cinematic-jt13-10.test.ts`; troll grip lives in `plugins/joust/tests/troll.test.ts`. jt13-10 left the grip-drown path untested — that gap IS the story. The RED test drives a gripped victim under and asserts BOTH the sink (FLOOR+7 → FLOOR+20 descent, victim not removed same-frame) and the SNPLAV/SNELAV cue. Keep it core-side/deterministic (purity boundary on `src/core/`).
- **[TEA, red, non-blocking, Gap]** The ENEMY grip-drown is a separate, pre-existing gap and is OUT of jt13-11's scope. `stepTrolls`'s grip branch reads `victim.entity` directly (`sim.ts:1133`); an enemy's flight state is under `victim.enemy.entity`, so the `!victim.entity` LAVVFY check (`sim.ts:1123`) makes the troll give up on an enemy victim before `gs.inLava` is ever reached. A gripped enemy therefore cannot drown cinematically today regardless of jt13-11. Worth a follow-up story so gripped enemies match jt13-10's non-gripped enemy coverage (SNELAV / enemy-lava-death sink).

### Reviewer (code review)
- **Improvement** (non-blocking): the post-`stepTrolls` sink filter (`sim.ts:2575-2583`) sweeps EVERY process and calls `stepLavaDeath` on it, so any caller that also calls `stepLavaDeath` in the same frame double-processes the body — the root cause of finding #1. Affects `plugins/joust/src/core/sim.ts` (the fix should INITIATE the drown via state, not by calling the sink helper directly, letting the single downstream filter own it). *Found by Reviewer during code review.* — This is the pattern the rework must follow; no other story is affected.

## Sm Assessment

**Setup complete — routing to TEA (Tyr One-Handed) for the RED phase.**

- **Story:** jt13-11 (2pt, p3, tdd) — route the troll grip-drown lava death through jt13-10's `stepLavaDeath` so a gripped drown sinks (FLOOR+7 → FLOOR+20) and sounds SNPLAV/SNELAV identically to the non-gripped death.
- **Premise re-verified against the current tree** before setup: the epic description is accurate and current, so it was copied forward verbatim (no correction block). See Delivery Findings for the three confirmed anchors (`sim.ts:387`, `sim.ts:1142`, `sim.ts:2562-2564`) and the ROM ADDLAV→ADGFLR JMP.
- **Contention:** clean board — no sibling branch owns jt13-11 (`git branch -r` clear); a-3 is on an unrelated defender story. Claim published: status `in_progress`, branch `feat/jt13-11-lava-cinematic-troll-grip-drown` + context + stamp pushed to `origin` (commit `ccb55a70`).
- **TEA's target:** a failing behavioural test driving a gripped victim under, asserting the sink AND the cue — the path jt13-10 left untested. Core-side, deterministic (purity boundary on `plugins/joust/src/core/`). Test seams noted in Delivery Findings.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/sim.ts` — the `stepTrolls` `gs.inLava` branch (grip-drown) now routes the victim through `stepLavaDeath`'s ADGFLR onset instead of removing it: clears `grippedBy`, pushes the SNPLAV/SNELAV cue once, seeds the sink; the troll is still consumed. 10 insertions, 2 deletions.

**Approach:** Reused the existing `stepLavaDeath` helper rather than duplicating the cinematic — this makes the gripped and non-gripped lava deaths identical *by construction* (the AC's exact requirement) and keeps the change minimal. The onset guard passes because after the grip step the victim's `posY` is already ≥ FLOOR+7 (`gs.inLava` true) and the grip is cleared. The same-frame post-`stepTrolls` filter then advances the sink (no re-cue, since `lavaSink` is now set); `frame.ts` skips the sinking body via its existing `lavaSink` guard.

**Tests:** jt13-11 2/2 passing; full joust project **3872/3872 passing** (was 3870+2 red); repo-wide `tsc --noEmit` clean. No regressions.

**Branch:** feat/jt13-11-lava-cinematic-troll-grip-drown (pushed, commit `0bba4866`)

**Handoff:** To review (Heimdall).

### Delivery Findings Capture

- **Gap** (non-blocking): the ENEMY grip-drown still cannot reach the `gs.inLava` branch — `stepTrolls` reads `victim.entity`, undefined for enemies, so the troll gives up at LAVVFY (`sim.ts:1123`). Out of jt13-11's scope (player path only); worth a follow-up so gripped enemies also drown cinematically (SNELAV). Affects `plugins/joust/src/core/sim.ts` (the grip branch would need to resolve an enemy's `.enemy.entity`). *Found by Dev during implementation — confirms TEA's red-phase Gap finding.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA, red, scope-narrowing] Enemy grip-drown deferred — a SEPARATE gap, not jt13-11.** The story mentions jt13-10 covered "player and enemy" for the NON-gripped death. But the `stepTrolls` grip branch (`sim.ts:1133`) reads `victim.entity` directly, and an enemy's flight state lives under `victim.enemy.entity` — so `!victim.entity` (`sim.ts:1123`, LAVVFY) makes the troll GIVE UP on an enemy victim before the `gs.inLava` branch is ever reached. jt9-42 broadened `pickTrollVictim`/wake-order, not the grip integration. jt13-11's concrete scope is "route the `gs.inLava` branch through `stepLavaDeath`" — which is the PLAYER path the branch actually drives. RED covers the player grip-drown only; the enemy grip-drown is filed as a Delivery Finding for a follow-up.

### Dev (implementation)
- No deviations from spec. Implemented exactly the routing TEA specced: the `gs.inLava` branch now hands the victim to the same `stepLavaDeath` onset the non-gripped death uses (`sim.ts:1142`), clearing `grippedBy` so the post-`stepTrolls` filter + `frame.ts` own the descent, sounding the cue once, and still consuming the troll. Enemy grip-drown remains out of scope (TEA's Gap finding above stands, unchanged).

### Dev (rework round 1 — addressing Reviewer's REJECTED verdict)
- **Finding #1 (cadence) — FIXED & verified.** The round-1 approach (calling `stepLavaDeath` inside `stepTrolls`) WAS the cadence bug — the Reviewer/subagents were right, and the round-1 "identical by construction" claim was wrong: the same-frame downstream filter re-processed the body, spending one `LAVA_SINK_NAP` tick early (2 frames at FLOOR+7 vs 3). The branch is now `victim.grippedBy = undefined; removed.add(troll.id)` — the single downstream `stepLavaDeath` pass owns the entire drown, so the cadence is genuinely identical. Simpler too (2 statements, no `byId.set`, no in-branch cue push). `sim.ts:1142`.
- **Finding #2 (stale comment) — FIXED.** Rewrote `sim.ts:2568-2574` to describe the shipped behaviour (grip released → the drowning body flows through this one filter as an ordinary sinking bird); dropped the "NOT yet / follow-up" framing.
- **Finding #3 (test) — FIXED & non-vacuity proven.** AC1 now pins the exact cadence (`ys[0]===ys[2]===DEATH_Y`, LAVA_SINK_NAP=3, bracketed mid-sink at `ys[20]`) mirroring the jt13-10 companion, and a same-frame LT2DIE troll-consumption check (`i===0` → `trollsIn===0`) replaces the false "non-vacuity" claim. **Verified the new pin is not vacuous:** re-applied the double-processing branch and confirmed AC1 RED-fails with `ys[2]===231` (a frame early); restored the fix → green.
- **Verification:** joust 3872/3872, `tsc --noEmit` clean, orchestrator 503/0. Branch pushed, commit `e029c1b5`.

### Reviewer (audit)
- **TEA's enemy-scope narrowing → ✓ ACCEPTED by Reviewer:** verified independently — `stepTrolls`'s grip branch reads `victim.entity` (`sim.ts:1133`), undefined for enemies, so the troll gives up at LAVVFY (`sim.ts:1123`) before `gs.inLava`. The enemy grip-drown is a genuinely separate pre-existing gap, correctly deferred.
- **UNDOCUMENTED deviation (Dev logged "no deviations"):** the fix's own comment and the story AC claim the gripped drown is "identical" to the non-gripped ADGFLR cinematic, but it is **not** — calling `stepLavaDeath` inside `stepTrolls` means the onset process is re-processed by the SAME frame's downstream sink filter (`sim.ts:2577`), spending one `LAVA_SINK_NAP` tick early. Measured (rule-checker, by execution): gripped holds the first pixel 2 frames vs. the non-gripped 3. Spec said "identical"; code diverges by one nap-tick. Severity: **High** (ROM-fidelity codebase; ADDLAV JMPs into the SAME ADGFLR routine, so cadence must match). Filed as finding #1 below.

## TEA Assessment

**RED complete — handing to Dev (Loki Silvertongue) for GREEN.**

### What RED pins (2 failing tests, both live)
`plugins/joust/tests/lava-troll-grip-drown-cinematic-jt13-11.test.ts` — drives a real gripped player through `stepSim` and asserts the grip-drown becomes the ADGFLR cinematic:

- **AC1** — a gripped victim pulled under is NOT removed the same frame; the body stays present and sinks gradually FLOOR+7 → FLOOR+20 (asserts a mid-descent sighting `DEATH_Y < y < SINK_FLOOR`, `deepestY >= SINK_FLOOR`, and a monotone descent). Kills both same-frame removal AND a teleport-to-floor mutant.
- **AC2** — the gripped drown emits `player-lava-death` (SNPLAV) exactly once for the whole sink.

**Non-vacuity (proven, both tests):** the fixture stages a real committed grip (`grippedBy === trollId`, checked before the loop), and each test asserts the troll is consumed (`trollsIn === 0`) — with NO flap input the grip cannot break free, so the troll's removal proves the lava-death branch actually executed. So the failures are the *absent* sink/cue, not a dead scenario.

**Verified RED:** `2 failed | 3870 passed` across the joust project — the RED is isolated (the test file is purely additive; no source touched). AC1 fails on `sawMidSink=false` (removed at the surface, never sinks); AC2 fails on cues not containing `player-lava-death` (silent drown). Both are exactly the pre-jt13-5 behaviour the story names.

### Dev's target (GREEN)
Route the `stepTrolls` `gs.inLava` branch (`sim.ts:1142-1145`) through the ADGFLR cinematic instead of `removed.add(victim.id)`, so a gripped drown is identical to the non-gripped `stepLavaDeath` death jt13-10 shipped. Watch the two seams:
- **`stepLavaDeath` exempts gripped birds** (`sim.ts:388`: `if (p.grippedBy !== undefined) return {process:p}`). To let the post-`stepTrolls` filter own the sink, Dev must clear `grippedBy` on the drowning victim (as the escape branch already does at `sim.ts:1140`) OR emit the onset from `stepTrolls` directly.
- **The cue channel:** the cue must land in `sim.cues` (that is what reaches `GameState.events` → the shell). If Dev sets `lavaSink` in `stepTrolls`, the same-frame `stepLavaDeath` pass sees `sinking=true` and skips the onset (no cue) — so the SNPLAV cue must be emitted where the sink is initiated, exactly once. AC2's exactly-once assertion guards a per-frame re-emit.
- Keep it core-side and deterministic (the `plugins/joust/src/core/` purity boundary).

### Rule Coverage
- **Purity/core-boundary:** no test imports shell/render/audio-runtime; the RED drives the pure `stepSim` and reads `sim.cues`/process state only. The purity scanner is unaffected (additive test file).
- **Meaningful assertions / non-vacuity:** every test asserts concrete state (posY depth, cue kind + count, troll consumption) with a live-scenario precondition — no `assert(true)`, no always-None checks. The mid-sink + monotone + exactly-once assertions are mutation-resistant (kill teleport, never-sink, and per-frame re-emit mutants).
- **ROM-cited constants:** `FLOOR`/`DEATH_Y`/`SINK_FLOOR`/`PULL_CAP` carry their JOUSTRV4.SRC provenance in-file, matching the jt13-10 companion.
- **No count guards / no vendored-file coupling:** none introduced.

### Delivery Finding (for the follow-up backlog)
The enemy grip-drown never reaches the `gs.inLava` branch today (`victim.entity` is undefined for enemies; the troll gives up at LAVVFY). This is a distinct fix from jt13-11 and is out of its scope — worth a follow-up story so gripped enemies also drown cinematically, matching jt13-10's non-gripped enemy coverage.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 (GREEN: 3872 passed, tsc clean, no smells) |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 (2 High + 1 Low, mutation-verified) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 (High: stale sim.ts:2568-2574) |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 (34 rules checked; #17 cadence + #24 stale comment, both High, execution-verified) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 3 confirmed High, 1 confirmed Low, 0 dismissed, 0 deferred (after cross-correlation: the cadence defect was found independently by BOTH test-analyzer and rule-checker; the stale comment by BOTH comment-analyzer and rule-checker)
**Working-tree audit:** ran `pf reviewer audit-tree` — initially DIRTY on a benign `sprint/epic-jt13.yaml` status stamp (in_progress→in_review, NOT a source mutation; `sim.ts`/tests clean); restored the stamp, re-ran → CLEAN. Verdict is uncorrupted.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[RULE][TEST]` | **Sink cadence is NOT identical to the non-gripped ADGFLR cinematic.** Calling `stepLavaDeath` inside `stepTrolls` seeds `lavaSink.nap=3` at onset, then the SAME frame's unchanged downstream sink filter (`sim.ts:2577`) runs `stepLavaDeath` on that already-sunk process again, decrementing `nap` 3→2 before the frame ends. Measured by execution (rule-checker) and mutation (test-analyzer): the gripped body holds its first pixel for **2** frames vs. the non-gripped **3** (`LAVA_SINK_NAP=3`). The ROM's ADDLAV JMPs into the SAME ADGFLR routine, so the cadences must match — this is a fidelity divergence, and the fix's own comment claims "identically to `stepLavaDeath`," which is false. | `plugins/joust/src/core/sim.ts:1150-1153` (and the double-run via `:2577`) | Do NOT call `stepLavaDeath` inside `stepTrolls`. Instead clear the victim's grip and let the downstream filter own the ENTIRE drown (onset + cue + sink) exactly once — e.g. the branch becomes `victim.grippedBy = undefined; removed.add(troll.id)`. The victim's post-grip `posY` is already ≥ FLOOR+7 (`gs.inLava`), so the filter's `stepLavaDeath` fires the onset (cue + sink) that same frame, single-processed → cadence identical to the non-gripped death. This is also **simpler** (drops the `stepLavaDeath` call, the `byId.set`, and the in-branch cue push). |
| [HIGH] `[DOC][RULE]` | **Stale comment contradicts the shipped fix.** The block at `sim.ts:2568-2574` still asserts as current fact that "this port does NOT yet route the grip-drown through it ... removes the gripped victim same-frame with no sink and no SNPLAV/SNELAV cue" and files it as "a follow-up (jt13-11)." jt13-11 IS this diff. A maintainer reading top-to-bottom is told two opposite things about the same path. (Confirmed by comment-analyzer AND rule-checker #24.) | `plugins/joust/src/core/sim.ts:2568-2574` | Rewrite to describe current behavior: the grip-drown is now driven by `stepTrolls`'s `gs.inLava` branch (jt13-11), which clears `grippedBy` so the drowning body re-enters THIS filter as an ordinary sinking bird; a bird still gripped is exempt via `stepLavaDeath`'s own guard. Remove the "not yet / follow-up" framing. |
| [HIGH] `[TEST]` | **AC1 does not pin the sink cadence, so it let the #1 defect ship green; and its "non-vacuity" claim is false.** (a) AC1 only checks monotonicity + eventual `deepestY≥SINK_FLOOR` — no per-pixel frame pin like the companion `lava-death-cinematic-jt13-10.test.ts` (`ys[2]===DEATH_Y`, bracketed `ys[20]`), so a rate-doubling/one-tick-early regression passes. (b) The comment on `expect(trollsIn(d).length).toBe(0)` claims it proves LT2DIE consumption "actually ran," but mutation shows deleting `removed.add(troll.id)` still passes (an unrelated LAVVFY orphan-cleanup removes the troll a frame later). | `plugins/joust/tests/lava-troll-grip-drown-cinematic-jt13-11.test.ts:149,174` | Add a cadence pin mirroring jt13-10 (e.g. assert the body is still at `DEATH_Y` at loop frame 2 and strictly between `DEATH_Y` and `SINK_FLOOR` at a mid-sink frame) so the cadence defect is caught. Add a same-frame troll-consumption assertion (troll gone on the onset frame, not "eventually after 200 frames"), and drop/repair the false "non-vacuity" comment. |
| [LOW] `[TEST]` | No assertion that the gripped drown books a life-loss / respawn like the non-gripped path. Lower risk (shared `stepLavaDeath` life-booking is proven by jt13-10), but a future refactor rerouting the grip-drown off `stepLavaDeath` would go uncaught. | same test file | Optional: add a life-loss assertion mirroring jt13-10, or note explicitly in the header why it's covered by jt13-10's proof. |

**Observations (≥5, all 8 specialist tags represented):**
- `[RULE][TEST]` **[HIGH]** cadence divergence — `sim.ts:1150` double-processed via `:2577` (finding #1); found by rule-checker (execution) AND test-analyzer (mutation).
- `[DOC]` **[HIGH]** stale comment — `sim.ts:2570-2573` (finding #2); found by comment-analyzer AND rule-checker.
- `[TEST]` **[HIGH]** missing cadence pin + false non-vaciuty claim — test `:149,:174` (finding #3).
- `[SIMPLE]` **[MEDIUM]** the fix is *more* complex than the correct solution: the `stepLavaDeath(...)` call + `byId.set` + in-branch cue push (3 statements) is the root of the cadence bug and can be replaced by `victim.grippedBy = undefined` (1 statement), letting the single downstream filter own the drown. reviewer-simplifier was disabled via settings; I assessed the diff myself — the simpler form is also the correct-cadence form (folds into finding #1's fix).
- `[EDGE]` reviewer-edge-hunter disabled via settings; I enumerated the branch's paths myself: onset `posY` is guaranteed ≥ FLOOR+7 by `gs.inLava`, so `stepLavaDeath` always takes the onset path here (never returns null); the `if (sunk.process)` guard (`sim.ts:1152`) is therefore a **dead branch** today — harmless, but see `[SILENT]`.
- `[SILENT]` reviewer-silent-failure-hunter disabled via settings; assessed myself: no swallowed errors. One latent silent-failure shape worth noting — if a future refactor let this branch be reached with `lavaSink` already set, `stepLavaDeath` could return `null` and the dead `if (sunk.process)` guard would silently drop the victim (removed-troll + un-set-victim = a leaked, still-gripped body). Not reachable today; non-blocking, folded into finding #1's simplification which removes the guard entirely.
- `[TYPE]` reviewer-type-design disabled via settings; assessed via rule-checker #1/#2/#4: no `as any`/`as unknown`/`@ts-ignore`/non-null-assertion; the `{ ...victim, grippedBy: undefined }` spread and `SimProcess | null` guard are type-sound. No applicable newtype/invariant rule violated.
- `[SEC]` reviewer-security disabled via settings; assessed myself: **no security surface** — pure deterministic simulation, no I/O, no user/network input, no secrets, no auth. No applicable security rule (rule-checker #10 concurs).
- `[VERIFIED]` the NEW branch comment (`sim.ts:1143-1149`) is accurate re: cue-once, grip-clear, troll-consumed — comment-analyzer verified line-by-line. Checked against the comment-accuracy rule (lang-review #17): compliant for the *behavioural* claims; the ONLY inaccuracy in it is the "identically" cadence claim, already filed as finding #1.
- `[VERIFIED]` core purity intact — `sim.ts:1150-1152` adds no Math.random/Date/DOM/audio/render; `stepLavaDeath` is a pure function of the process. Checked against CLAUDE.md core/shell purity rule (rule-checker #31): compliant.
- `[VERIFIED]` determinism holds bit-for-bit for a given seed; cue fires exactly once (`lavaSink===undefined` transition) — AC2 correct. Checked against CLAUDE.md determinism rule (rule-checker #32, preflight GREEN): compliant (the cadence defect is a fidelity bug, not a determinism violation).
- `[VERIFIED]` ROM-cited constants carry provenance (`FLOOR`/`DEATH_Y`/`SINK_FLOOR`/`PULL_CAP`). Checked against the ROM-provenance convention (rule-checker #34): compliant.
- `[VERIFIED]` no type-safety escapes, correct `.js` import extensions, `import type` inline, loads from `src/` not `dist/`. Checked against lang-review #1/#5/#8: compliant.

### Rule Compliance
Checked the TypeScript lang-review checklist (34 checks, rule-checker) + CLAUDE.md conventions against every changed symbol:
- **Core/shell purity (CLAUDE.md):** `sim.ts:1150-1152` — COMPLIANT. Pure; no shell/render/audio/DOM/wall-clock/RNG introduced.
- **Determinism (CLAUDE.md):** COMPLIANT bit-for-bit; but the cadence *differs from the non-gripped path* — that is a correctness/fidelity defect (#1), not a determinism violation.
- **ROM-cited constants carry provenance:** COMPLIANT (test constants all cited).
- **No count guards / no manifest-size comments:** COMPLIANT (the `.toBe(1)` cue count is a behavioral AC assertion, not a static inventory guard).
- **Stale-mechanism comments (lang-review #17, #24):** VIOLATION ×2 — findings #1 (new comment overclaims "identical") and #2 (sibling comment not swept).
- **Type-safety / modules / async / test-apparatus (lang-review #1,#5,#7,#8,#18,#26,#29):** COMPLIANT across all instances in the diff.

### Devil's Advocate
Argue this code is broken. Start with the strongest case, which the subagents already proved: the change advertises itself — in its own comment and in the story AC — as making the gripped lava death *identical* to the non-gripped one, and it is not. The mechanism is subtle enough that it slipped past the author (me, as TEA and Dev both): `stepLavaDeath` is invoked twice on the victim within a single frame — once explicitly in `stepTrolls`, then again implicitly by the unchanged post-`stepTrolls` filter that sweeps *every* process — so the sink clock starts one tick behind. A player watching closely, or a fidelity audit comparing the gripped and swim deaths frame-by-frame against JOUSTRV4.SRC (which this project does, routinely), would see the gripped corpse begin its descent one frame sooner. Because the ROM literally JMPs both entry points into the same ADGFLR loop, there is no ROM basis for any difference — the divergence is a pure port artifact. Worse, the test suite is complicit: AC1 was written (by me) to assert only "it eventually reaches the floor, monotonically," which is exactly the assertion that cannot see a cadence bug — and the neighbouring jt13-10 test already demonstrated the stricter pin that would have caught it, so the gap is not an oversight of the unknown but a failure to match established local rigor. What would a confused maintainer do? Read `sim.ts:2568-2574`, conclude the grip-drown is still unimplemented, and either "re-fix" it (double-routing it) or file a duplicate story. What about the defensive `if (sunk.process)` guard on line 1152? On the onset path `sunk.process` is never null, so the guard is dead — harmless, but it hints the author wasn't certain of the contract, and under a future refactor where the branch is reached with `lavaSink` already set, the null path would silently drop the victim into a leaked, un-removed, still-gripped limbo. None of these is a crash or a security hole, but the story's single job was "make the two deaths identical," and by its own measure it did not. That is a High, and it is a reject.

**Handoff:** Back to Dev for fixes.
## Review Correlation

**Round 1 rework — all findings internal (caught by the Reviewer pipeline before merge). Language: TypeScript.**

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer | Sink cadence not identical to non-gripped ADGFLR (same-frame double-processing of `stepLavaDeath`) | EXISTING_CHECK | #17 "Comments/docs that assert a MECHANISM nobody re-ran" (the "identically" claim was never measured) | Dev missed measuring the cadence before claiming it; fixed by routing through one pass |
| 2 | reviewer | Stale sibling comment (`sim.ts:2568-2574`) still said grip-drown "NOT yet" routed | EXISTING_CHECK | #24 "A RETIREMENT applied where the AC named it, and nowhere else" | Dev missed sweeping the sibling comment; rewritten |
| 3 | reviewer | AC1 asserted monotonic + eventual-floor, not the exact cadence, so the #1 bug shipped green | EXISTING_CHECK | #29 "An ORDERING assertion standing in for a MAGNITUDE the story is about" | Dev/TEA missed pinning the magnitude; added exact-frame cadence pins mirroring jt13-10 |

### Signal Summary
- **External findings: 0**
- **CI findings: 0**
- **Internal findings: 3** (all caught in-process by the Reviewer's subagent pipeline before merge — the loop worked)
- **New checks added: 0** (all three map to existing lang-review checks #17/#24/#29 — process misses, not knowledge gaps; no checklist update required)
## Subagent Results

**Cycle: 1**

**Method: targeted re-verification of each round-1 finding** (the framework's stronger route for characterized findings) + a fresh read of the full rework diff (`0bba4866..HEAD`) for newly-introduced issues. Each round-1 specialist finding was re-probed against the current tree rather than re-swept generically.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-verified) | clean | none | N/A — re-ran suites: joust 3872/3872, tsc clean, orchestrator 503/0 |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes (re-verified) | findings | 2 (round-1) | confirmed FIXED 2 — cadence pin RED-fails at `ys[2]===231` against the buggy branch; same-frame LT2DIE check RED-fails ("expected false to be true") against a dropped `removed.add(troll.id)`. Both mutation-proven non-vacuous. |
| 5 | reviewer-comment-analyzer | Yes (re-verified) | findings | 1 (round-1) | confirmed FIXED — `sim.ts:2568-2576` rewritten to the shipped behaviour; re-read, accurate, no longer contradicts the code. |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (re-verified) | findings | 2 (round-1) | confirmed FIXED 2 — #17 cadence: the branch no longer double-processes (`victim.grippedBy = undefined; removed.add(troll.id)`), single downstream pass → cadence identical; #24 stale comment swept. |

**All received:** Yes (4 enabled re-verified by targeted probe; 5 disabled via settings)
**Total findings:** all 5 round-1 findings (3 confirmed defects) re-verified FIXED; 0 new findings from the rework-diff scan; 0 dismissed, 0 deferred
**Working-tree audit:** ran `pf reviewer audit-tree` after the mutation probes — DIRTY only on the benign `sprint/epic-jt13.yaml` status stamp (in_progress→in_review, not a source change; `sim.ts`/tests restored clean via `git checkout`); restored → CLEAN. Verdict uncorrupted.

## Reviewer Assessment

**Verdict:** APPROVED (re-review, cycle 1 — supersedes the round-1 REJECTED verdict; all three High findings verified fixed)

**What changed since round 1:** the `gs.inLava` grip-drown branch no longer runs `stepLavaDeath` itself (which the same-frame downstream filter re-processed, spending a `LAVA_SINK_NAP` tick early). It now just releases the grip (`victim.grippedBy = undefined`) and lets the single downstream ADGFLR pass own the entire drown — so the gripped and non-gripped cadences are byte-identical, as the ROM (ADDLAV → same ADGFLR JMP) requires. The stale sibling comment was swept, and AC1 gained exact cadence + same-frame-consumption pins.

| Severity | Round-1 Issue | Status |
|----------|---------------|--------|
| [HIGH] `[RULE][TEST]` cadence divergence | `sim.ts:1142` | **FIXED** — single-pass drown; cadence identical (`ys[0]===ys[2]===FLOOR+7`, LAVA_SINK_NAP=3). Verified: buggy branch RED-fails `ys[2]===231`. |
| [HIGH] `[DOC]` stale comment | `sim.ts:2568-2576` | **FIXED** — rewritten to the shipped behaviour; re-read accurate. |
| [HIGH] `[TEST]` missing cadence pin + false non-vacuity | test `:174` | **FIXED** — exact cadence pins + same-frame LT2DIE check; both mutation-proven non-vacuous. |
| [LOW] `[TEST]` no life-loss assertion | test | Not addressed (accepted): shared `stepLavaDeath` life-booking is proven by jt13-10; deferred, non-blocking. |

**Observations (≥5, all 8 specialist tags represented):**
- `[RULE][TEST]` cadence divergence — FIXED & mutation-verified (buggy branch RED-fails `ys[2]===231`).
- `[DOC]` stale comment — FIXED; `sim.ts:2568-2576` re-read, accurate.
- `[TEST]` cadence pin + same-frame check — FIXED; both mutation-proven non-vacuous this cycle.
- `[SIMPLE]` the fix is now the *simpler* form (2 statements, no `byId.set`, no in-branch cue push) — the round-1 [SIMPLE] concern is resolved. reviewer-simplifier disabled; assessed myself against the rework diff.
- `[EDGE]` reviewer-edge-hunter disabled; assessed myself: the simplified branch has no dead guard anymore (the round-1 dead `if (sunk.process)` is gone); `victim.grippedBy = undefined` mutates the `byId` copy, and nothing between `stepTrolls` and the downstream filter (lines 2557-2574 are comments) touches the victim, so the onset fires the same frame with `posY ≥ FLOOR+7` guaranteed by `gs.inLava`.
- `[SILENT]` reviewer-silent-failure-hunter disabled; assessed myself: no swallowed errors; the round-1 latent silent-drop shape (dead `if (sunk.process)`) is eliminated by the simplification.
- `[TYPE]` reviewer-type-design disabled; assessed myself: no type escapes; `victim.grippedBy = undefined` is a sound optional clear on the surfaced field.
- `[SEC]` reviewer-security disabled; assessed myself: no security surface — pure deterministic sim, no I/O.
- `[VERIFIED]` cadence now identical to the non-gripped path — `ys[0]===ys[2]===DEATH_Y` holds (test green) and the jt13-10 companion asserts the same for the non-gripped death. Checked against ROM-fidelity (ADDLAV→ADGFLR) and lang-review #17 (mechanism now measured, not merely asserted): compliant.
- `[VERIFIED]` core purity intact — `sim.ts:1152` adds no Math.random/Date/DOM/audio/render. Checked against CLAUDE.md purity rule: compliant.
- `[VERIFIED]` determinism holds; cue fires exactly once (AC2 green). Checked against CLAUDE.md determinism rule: compliant.
- `[VERIFIED]` no unused import from removing the in-branch `stepLavaDeath` call — `stepLavaDeath` is still used by the downstream filter; `tsc --noEmit` clean. Checked against lang-review #5 (module hygiene): compliant.

### Rule Compliance
Re-checked the changed symbols against the TypeScript lang-review checklist + CLAUDE.md conventions:
- **Core/shell purity (CLAUDE.md):** `sim.ts:1152` — COMPLIANT (pure grip clear).
- **Determinism (CLAUDE.md):** COMPLIANT — and now cadence-faithful (the round-1 fidelity defect is gone).
- **lang-review #17 (mechanism nobody re-ran):** COMPLIANT — the "identical cadence" claim is now both true and pinned by a test.
- **lang-review #24 (retirement swept everywhere):** COMPLIANT — the sibling comment was swept.
- **lang-review #29 (ordering vs magnitude):** COMPLIANT — AC1 now pins the magnitude (exact frames), not just monotonicity.
- **ROM-cited constants carry provenance:** COMPLIANT.
- **Type-safety / modules / test-apparatus (#1,#5,#8,#18,#26):** COMPLIANT.

### Devil's Advocate
Argue the rework is still broken. First attack: "identical cadence" is a strong claim — is it *really* byte-identical, or just close? The test pins `ys[0]` and `ys[2]` at FLOOR+7 and brackets `ys[20]`, but not every intermediate frame, so could the gripped path diverge somewhere in the middle of the descent? No — after the onset both paths are literally the same code: the one downstream `stepLavaDeath` filter drives every sinking body identically, with no branch on how it started sinking, so once `lavaSink` is seeded with `nap=3` the trajectories are the same function of frame count; the three pinned points plus the jt13-10 companion's identical pins are sufficient because there is no code path by which they could agree at those points and disagree between them. Second attack: does clearing `grippedBy` without setting `lavaSink` in `stepTrolls` open a one-frame window where `frame.ts` applies normal gravity to the victim? No — `frame.ts` ran *earlier* this frame (before `stepTrolls`), when the victim still had `grippedBy` set and was skipped; by next frame the downstream filter has set `lavaSink`, so `frame.ts` skips it again. There is no frame in which both guards are absent. Third attack: the victim carries a large post-grip downward `velY` when the grip is released — does that leak into the sink? No — the onset reseats `velY=0` and freezes `posX`, discarding it, exactly as the non-gripped death does. Fourth: could a future maintainer re-introduce the double-processing? Now the cadence pin (`ys[2]===DEATH_Y`) RED-fails on that exact regression, and I re-proved it this cycle. Fifth, the honest residual: the enemy grip-drown is still unhandled — but that was explicitly scoped out and filed, and no assertion here claims otherwise. The one un-fixed item (LOW: no life-loss assertion) is covered by jt13-10's proof of the shared helper. I cannot construct a failing case. Approve.

### Reviewer (audit, cycle 1)
- **The round-1 UNDOCUMENTED deviation ("identical" claim not met) → ✓ RESOLVED.** The rework makes the cadence genuinely identical (single downstream pass) and adds the pin that proves it. No open deviations remain; the enemy-scope narrowing stays correctly ACCEPTED.

**Handoff:** To SM for finish-story.