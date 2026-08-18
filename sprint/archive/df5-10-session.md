---
story_id: "df5-10"
jira_key: "df5-10"
epic: "df5"
workflow: "tdd"
---
# Story df5-10: Wire the humanoid ground population into the running sim so landers have prey

## Story Details
- **ID:** df5-10
- **Jira Key:** df5-10
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-10-wire-humanoid-ground-population
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T14:56:05Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T14:05:22Z | 2026-08-18T14:08:07Z | 2m 45s |
| red | 2026-08-18T14:08:07Z | 2026-08-18T14:15:01Z | 6m 54s |
| green | 2026-08-18T14:15:01Z | 2026-08-18T14:25:04Z | 10m 3s |
| review | 2026-08-18T14:25:04Z | 2026-08-18T14:36:51Z | 11m 47s |
| green | 2026-08-18T14:36:51Z | 2026-08-18T14:48:21Z | 11m 30s |
| review | 2026-08-18T14:48:21Z | 2026-08-18T14:56:05Z | 7m 44s |
| finish | 2026-08-18T14:56:05Z | - | - |

## Sm Assessment

Story set up and claimed. Premise verified CURRENT against the tree this session — it is
accurate, not stale, so no correction block was needed:

- The level-start wave callback in `plugins/defender/src/core/sim.ts:133-136`
  (inside `createWaveDirector`) calls ONLY `enemyBank.spawnLander(...)` in a loop; NO
  humanoid ground population happens anywhere at game/level start. Confirmed by grep +
  reading sim.ts:120-185.
- The seam df5-10 must consume already exists: `enemyBank.spawnHumanoid(x, y)`
  (landers.ts:191, exposed :308) and the sim-level wrapper `spawnHumanoid(state, x, y)`
  (sim.ts:182-185). This story wires that seam into level start.
- The df5-8 lander wiring (sim.ts:125-137) is the deterministic/pure precedent to mirror
  for placement — spread across the 16-bit world cylinder, no entropy, same-seed stability.

Backlog shape: df5-10 is standalone (user invoked `/pf-work df5-10`). It is the upstream
'populate the ground' seam that df5-4 (rescue/panic) assumes exists, so it sequences BEFORE
df5-4 — no fold-in. df5-9 (world scroll) already merged. No either/or ruling was required;
this story's deliverable is solely the level-start humanoid population wiring.

Board clean at claim time: no open PRs, no sibling branch on df5-10 (a-1 is on df5-3),
merge gate clear. Claim branch pushed; story stamped `in_progress`. Handing to TEA for RED.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking, Korben/Dev):** `scene.ts:207` blits humanoids at absolute
  `humanoid.x >> 8` with NO camera transform, unlike the ship (which is camera-relative). With
  the ground population now spread across the full 16-bit world, only humanoids whose absolute
  `x >> 8` lands in `[0, 292)` are ever drawn on screen; the rest render off-canvas regardless
  of where the camera is looking. This is a pre-existing df4-3 render seam, out of df5-10's core
  scope (the SIM wiring is correct and complete — landers hunt prey worldwide), but the ON-SCREEN
  visibility of the ground population needs a camera-relative humanoid blit. Likely belongs with
  df5-9 (world scroll) follow-up or a dedicated render story. Flagging for PM/Reviewer.

## Tea Assessment

RED phase complete. New suite: `plugins/defender/tests/df5-10-sim-humanoid-wiring.test.ts`
(6 tests, all failing; `test:` commit on the feature branch). Lint (repo-wide `tsc --noEmit`)
is green — the RED is purely behavioral, not a missing export.

**The bug, confirmed at source:** `createSim` (sim.ts:118-158) wires the df5-8 wave director
to spawn LANDERS but never calls `spawnHumanoid`, so `_enemyBank.humanoids` is empty forever.
With no prey, every lander's `nearestTarget(x)` returns null and it takes the
`approach(rec.y, YMAX)` "no target yet — keep descending" path (landers.ts:242-243), sinks to
the floor and idles — the field never clears. `spawnHumanoid` already exists as a seam
(landers.ts:191, exposed :308; sim wrapper sim.ts:182-185) and the abduction MECHANIC is
already proven in isolation (df4-3-landers.test.ts). df5-10's job is solely the game-start
WIRING.

**What GREEN (Korben) must do:** inside `createSim`, seed a ground humanoid population via
`_enemyBank.spawnHumanoid(x, y)` — the humanoid analog of the df5-8 lander spread. It must be:
- **Present at game start** — `createSim(...).humanoids` non-empty, all `alive`, all `walking`.
- **On the ground below the hunters** — each `y` in `(LANDER_SPAWN_Y, YMAX]` (prey below the
  altitude landers descend from). I deliberately did NOT pin an exact ground row or an exact
  humanoid COUNT — the ROM docs/dossier pin neither, so inventing a magic number would be an
  uncited constant. The tests assert count > 0 and a spread of distinct columns; Korben/Vito
  pick the ROM-faithful count (classic Defender is 10 astronauts, but nothing in-tree cites it
  — cite it if you use it).
- **Spread across the 16-bit world cylinder** — distinct columns, not stacked (df5-8's
  `(i/n)*0x10000` analog).
- **Pure core** — deterministic, clock-free, entropy-free; two same-seed sims place
  byte-identical humanoids (the core-boundary guard, same as df5-8).

**Rule Coverage (lang-review/typescript.md + core-boundary):**
- Test quality (#8/#15/#18): every test has a meaningful, non-vacuous assertion; the
  determinism test explicitly guards against a vacuous `[] === []` match with a
  `toBeGreaterThan(0)` on the population size.
- Core-boundary purity (src/core no clock/entropy): the determinism test compares full
  x/y placement arrays across two same-seed runs.
- Integration (the reported live bug): two running-sim tests — (a) hunters + prey coexist
  after wave 1 spawns, the precondition the bug destroyed; (b) a bounded 8000-tick run must
  play out an actual abduction (grab/carry/fall), proof the field can clear. The 8000-tick
  budget is generous and deterministic; if a ROM-faithful placement makes it tight, that's a
  real signal for Dev/Reviewer, not flakiness.

Handing to Korben for GREEN.

## Dev Assessment

GREEN complete. All 6 df5-10 tests pass; full defender suite 648/648, full cross-app suite
17406 passed (0 fail), orchestrator 503/0, `tsc --noEmit` clean, `purity.test.ts` green.

**The change (one seam, minimal):** in `createSim` (sim.ts), after the df5-8 wave director,
a loop seeds `GROUND_HUMANOID_COUNT` (=10) humanoids via `enemyBank.spawnHumanoid`, spread
deterministically across the 16-bit world cylinder with the same `(i/n)*0x10000` even spread the
wave uses for landers, at the ROM's astronaut ground row `GROUND_HUMANOID_Y` (=$E0). Two new
named, cited constants; the loop mirrors the lander wiring directly above it.

**ROM fidelity:** count and row are cited, not invented — PTARG:=10 astronauts (DEFA7.SRC:1862-
1863), seeded at player-restore PLRES→ASTST (:1548), planted at OY16=$E0 (:1529-1530), the same
$E0 terrain-surface base offset `terrain.ts` already uses. The ROM places astronauts via RAND;
we substitute a deterministic even spread — the identical purity choice df5-8 made for landers,
so same-seed sims stay byte-identical (the determinism test proves it).

**Purity preserved:** `spawnHumanoid` reads no `rand` at spawn, so `initStars(rand)` sees the
same entropy — star seeding is unchanged and the core boundary is intact.

**Two df4-3 tests updated** (see Design Deviations) — legitimately invalidated by the feature,
their intent preserved. One render seam flagged as a non-blocking Delivery Finding (humanoids
blit at absolute x, no camera transform — pre-existing, out of core scope).

Handing to the verify/review phase.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Updated two pre-existing df4-3-sim-wiring.test.ts tests (Korben/Dev, GREEN).**
- **What changed:** (1) "a fresh sim exposes empty landers/humanoids view arrays" →
  now asserts `humanoids.length > 0` (ground population seeded) while `landers.length === 0`
  (landers still spawn on the wave director's first tick); renamed accordingly. (2) The
  spawn-entry test now asserts the DELTA a spawn adds (`before + 1`) instead of an absolute
  count of 1, since createSim pre-seeds 10. Header comment updated with a "df5-10 UPDATE" note.
- **What the old test said:** df4-3's GREEN kept createSim empty of enemies ("createSim STILL
  starts with no enemies") as a surgical choice so composeFrame tests were undisturbed.
- **Why:** df5-10's whole purpose is to seed the ground humanoid population AT game start, which
  directly overturns df4-3's "humanoids empty at createSim" premise. Leaving the old absolute
  assertions would have required NOT seeding at createSim (unfaithful — the ROM plants astronauts
  at player-restore/level-start, PLRES→ASTST). The updates preserve each test's real intent (view
  arrays well-formed; a spawn entry adds one enemy) under the new living-field reality. The df4-3
  RENDER tests (differ/palette/not-still) were robust to the added humanoids and are unchanged.

**Note on the surviving df3-6 "at rest the frame settles and then HOLDS" test:** it passed
today PRECISELY because of the bug (untargeted landers sank to YMAX and stopped, so a no-input
field went still). It remained green after the fix — verified, not assumed — so no change was
needed; the settled frame still holds for seed 5 at 300 ticks. Watched for it deliberately.
## Subagent Results

**Cycle: 0**

Enabled specialists (per `workflow.reviewer_subagents`): preflight, security, rule_checker.
Disabled (pre-filled Skipped): edge_hunter, silent_failure_hunter, test_analyzer,
comment_analyzer, type_design, simplifier. Because test_analyzer AND comment_analyzer are
BOTH off on this project, I personally audited test quality and every comment in the diff.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 648/648 green, tsc clean, no smells — confirmed 0 |
| 2 | reviewer-edge-hunter | No — disabled | Skipped | none | disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | Skipped | none | disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | Skipped | none | disabled; test quality assessed first-hand |
| 5 | reviewer-comment-analyzer | No — disabled | Skipped | none | disabled; comments assessed first-hand |
| 6 | reviewer-type-design | No — disabled | Skipped | none | disabled via settings |
| 7 | reviewer-security | Yes | clean | none | purity/determinism verified — confirmed 0 |
| 8 | reviewer-simplifier | No — disabled | Skipped | none | disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | rule #17 stale-comment (df5-10-R1) — confirmed 1 |

**All received:** Yes
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN — no left-behind mutations.
**Total findings:** 1 confirmed (must-fix), 0 dismissed, 3 non-blocking observations noted.

## Reviewer Assessment

**Verdict:** REJECTED

One MEDIUM must-fix finding (a test-integrity side effect of this change); the df5-10 core is otherwise clean.

The df5-10 core change itself is excellent: correct, pure, ROM-cited, thoroughly tested.
[SEC] `reviewer-security` CONFIRMED core-boundary purity (the seeding loop reads no clock/entropy;
`spawnHumanoid` consumes no `rand` at spawn, so `initStars(rand)` and same-seed determinism are
undisturbed) — clean, no findings. [RULE] `reviewer-rule-checker` CONFIRMED all 30 TS checklist
rules + both ROM-citation rules clean on the diff, and independently verified every citation
resolves to the exact line (`LDA #10 / STA PTARG` DEFA7.SRC:1862-1863; `LDA #$E0 / STA OY16`
:1529-1530; PLRES→ASTST :1548) — its ONE finding (df5-10-R1 below) is the rule #17 stale-comment
hit. [PRE] `reviewer-preflight` CONFIRMED 648/648 defender green, `tsc --noEmit` clean, no debug
code, no smells.

### FINDING df5-10-R1 [RULE] (MEDIUM, must-fix) — CONFIRMED by direct instrumentation, not inference
**File:** `plugins/defender/tests/df4-6-visual-playtest.test.ts:277-314` (comment :289-294).
**What:** df5-10's `createSim` ground-population seeding silently invalidates the STAGING of the
pre-existing "a spawned lander, crossing the firing ship, is killed" test. That test stages
`spawnHumanoid(s, 200<<8 = 51200, SHIP_ROW=120)` (far right, beam row) + `spawnLander(s, 50<<8 =
12800)`, and its comment asserts the lander descends to the beam row and "can never close the
X-gap" to the far humanoid, so it "lingers in the beam, hunting" and is shot there.
**Why it's now false:** createSim seeds humanoids at x = 0, 6553, **13107**, 19660, ... (row 224).
`nearestTarget()` picks by column distance, so the lander at x=12800 now targets the SEEDED
humanoid at x=13107 (distance 307), NOT the manual one at x=51200 (distance 27136 wrapped). The
lander closes X immediately and descends toward row 224, crossing the beam en route — it is shot
during a transient pass, not while "lingering." The test still passes (kill ~tick 129), but for a
DIFFERENT, accidental geometry than documented, and the manual `spawnHumanoid(..., 51200, ...)` is
now an INERT prop that is never targeted. Verified: baseline run of just this test = 1 passed.
**Required fix (Dev, GREEN round 2):**
1. Update the :289-294 staging comment to describe the ACTUAL mechanism (lander descends through
   the beam toward its nearest ground target and is killed there).
2. Remove or re-purpose the now-inert manual humanoid at x=51200 (either delete it, or re-stage so
   the lander's actually-hunted target is the intended one) — leave no dead prop.
3. Make the staging robust to the seeded population (its outcome must not depend on which seeded
   humanoid happens to be nearest), and confirm the test still MEANINGFULLY exercises COLIDE
   (lander killed + explosion), not by accident.
**Scope justification:** this is a direct side effect of df5-10 on a sibling test's semantics — in
scope for this change, not a fast-follow. `comment_analyzer` is disabled on this project, so a
false comment has no other net (cf. jt8-6). NOTE: the sibling abduction test at :319 is NOT
affected — its manual humanoid at x=1000 exactly matches the lander column (distance 0), so it
remains the nearest target.

### Non-blocking observations (do NOT require rework; recorded for the author's judgment)
- **N1 (simplify/DRY):** `GROUND_HUMANOID_COUNT = 10` (sim.ts) restates `waves.ts`'s
  `NEW_GUYS_COUNT = 10` — both are the same ROM `PTARG` (:1862). A locally-named, locally-cited
  domain constant is defensible (clarity over DRY), so this is optional; reusing the existing
  constant would remove the duplication if preferred.
- **N2 (test, df5-10 suite):** in the "sit on terrain" test, `expect(h.y >= YMIN)` is subsumed by
  the preceding `h.y > LANDER_SPAWN_Y` (LANDER_SPAWN_Y=44 > YMIN=42) — harmless redundancy.
- **N3 (test, df5-10 suite):** the "spread" test asserts only `new Set(xs).size > 1`; it would be
  stronger to assert the spread spans a large fraction of the 0x10000 cylinder (or all-distinct).
  Adequate for the story's "spread, not stacked" claim; optional hardening.

Rework is one comment + a small staging adjustment in one pre-existing test file. Handing back to Korben.
## Dev Assessment (round 2 — R1 fix)

Addressed the one must-fix finding **df5-10-R1** (Reviewer round 1). No change to the df5-10
core (sim.ts) or its own tests — the finding was a side effect on a sibling test's staging.

**Fix:** re-staged `df4-6-visual-playtest.test.ts:277-314` ("a spawned lander, crossing the
firing ship, is killed") so its outcome is deterministic and independent of the df5-10 seeded
population, and rewrote the now-false staging comment. Before: it relied on the lander targeting
a manually-placed humanoid at x=51200, but createSim's new seeding put a humanoid at x=13107
(nearer to the lander at x=12800), so the lander targeted the seeded one — the test passed by
accident and the x=51200 prop was inert. After: the lander spawns in a low-density GAP between
seeded columns (col 38 / world 9728) with the target planted ON THE BEAM ROW just to its right
(col 48 / world 12288). The target is ~2560 world-units away vs ~3175 to the nearest seeded
humanoid, so `nearestTarget` picks it regardless of the seeded spread; the lander descends to the
beam row and lingers hunting along it — killed ~tick 120 before it can close the grab gap.

**Empirically verified, not assumed** (throwaway probe, since deleted): the straight-descent
alternative fails (a same-column target is grabbed and carried up out of laser reach, never
killed); the chosen beam-row-far-target staging kills at tick 120 with `carry` never flipping —
a clean linger-and-shot, the original mechanism restored. Comment now describes exactly this,
including WHY the target is on the beam row (not below it) and why the lander sits in a seeded gap.

**Green:** df4-6 10/10, full defender 648/648, cross-app 17406 (0 fail), `tsc --noEmit` clean.
No new Delivery Findings; the non-blocking N1–N3 observations from round 1 remain the author's
option (not addressed — they were explicitly non-blocking). Handing back to the Reviewer.
## Subagent Results

**Cycle: 1**

_(Review round 2.)_ **Method: re-ran all three enabled specialists** on the round-2 state (only `df4-6-visual-playtest.test.ts`
changed since round 1). test_analyzer + comment_analyzer remain disabled; I re-audited the
re-staged test and its comment first-hand.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 648/648 green, tsc clean, no smells — confirmed 0 |
| 2 | reviewer-edge-hunter | No — disabled | Skipped | none | disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | Skipped | none | disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | Skipped | none | disabled; re-staged test assessed first-hand |
| 5 | reviewer-comment-analyzer | No — disabled | Skipped | none | disabled; comment assessed first-hand |
| 6 | reviewer-type-design | No — disabled | Skipped | none | disabled via settings |
| 7 | reviewer-security | Yes | clean | none | purity verified, web-sec N/A — confirmed 0 |
| 8 | reviewer-simplifier | No — disabled | Skipped | none | disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | R1 RESOLVED + all 30 rules clean — confirmed 0 |

**All received:** Yes
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN (after committing a legitimate
`in_progress → in_review` status stamp on `sprint/epic-df5.yaml` — the only dirty file; not a
source mutation, verified by inspection).
**Total findings:** 0 confirmed, 0 dismissed. The round-1 finding df5-10-R1 is verified RESOLVED.

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 re-review of the R1 rework. The one round-1 finding is fixed and independently verified;
nothing new surfaced.

[RULE] `reviewer-rule-checker` CONFIRMED **df5-10-R1 RESOLVED** — it re-derived and re-RAN the
new staging rather than trusting the prose: seeded columns `0,6553,13107,…`; lander at `38<<8`=9728,
target at `48<<8`=12288 on SHIP_ROW=120; Δ(lander→target)=2560 vs nearest seeded Δ3175, so
`nearestTarget()` deterministically picks the manual target regardless of the seeded spread; the
instrumented sim kills the lander at tick 121 with `carrying` never true (a clean linger-and-shot,
no grab), and the comment's "a below-beam target would be grabbed instead" parenthetical also
re-ran true. No inert prop remains, and every checkable claim in the touched comments (sim.ts
seeding, df4-3 header, GROUND_HUMANOID_Y=0xe0 within [42,240]) was re-verified. All 30 TS rules
clean, purity 42/42.
[SEC] `reviewer-security` CONFIRMED clean — the round-2 delta is test-only (no src/core surface);
core-boundary purity holds; web-security categories N/A for this offline deterministic core.
[PRE] `reviewer-preflight` CONFIRMED 648/648 defender green, `tsc --noEmit` clean, no debug/smells.

I independently verified the arithmetic (2560 < 3175 → manual target nearest), read the re-staged
block and its comment (accurate, honest about WHY the target is on the beam row and why the lander
sits in a seeded gap), and confirmed df4-6 10/10 + full defender 648/648 green myself.

**Round-1 non-blocking observations (N1–N3):** intentionally left to the author's judgment, as
stated when raised. N1 (GROUND_HUMANOID_COUNT vs waves.ts NEW_GUYS_COUNT) — a locally-cited domain
constant is defensible; not required. N2/N3 (a subsumed y-assertion, a weak spread check in the
df5-10 suite) — harmless. None blocks the approval.

df5-10 ships: the ground population is wired at game start, ROM-cited (PTARG=10 / OY16=$E0), pure,
deterministic, and thoroughly tested, with the one sibling-test side effect it caused now cleanly
resolved. APPROVED for merge.