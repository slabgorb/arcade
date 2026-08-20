---
story_id: "pt1-19"
jira_key: "pt1-19"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-19: defender: landers spawn and fall in a synchronized Space-Invaders row instead of roaming independently

## Story Details
- **ID:** pt1-19
- **Jira Key:** pt1-19
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** fix/pt1-19-landers-roam-independently
- **PR:** (none yet — recorded when the PR is created)

## Story Context

**Type:** bug  
**Points:** 5  
**Priority:** p1  
**Repos:** arcade

### Background

All landers appear in a neat row at the same altitude and descend in lockstep. This is a ROM fidelity issue — the defender arcade has independently roaming landers with staggered spawn altitudes and individually varying descent velocities.

**Confirmed Root Cause:**

- **Synchronous spawn:** `plugins/defender/src/core/sim.ts:330` spawns the whole wave synchronously: `for (let i=0;i<n;i++) spawnEnemyAt(kind, ...)`
- **Uniform start row:** Every lander spawns at `LANDER_SPAWN_Y = YMIN + 2` (plugins/defender/src/core/landers.ts:46) — same row
- **Uniform descent:** Every lander descends at `DESCEND_STEP = 2` rows/tick (landers.ts:85), an explicit **df4-3 placeholder** for the authentic per-lander wave-table velocity LNDYV
- **ROM anchors** (already cited in landers.ts header):
  - LANDST (start landers) → DEFB6.SRC:649
  - LANDS0 (kidnap/roam-then-dive) → DEFB6.SRC:688
  - LNDYV (per-lander velocity table) → PHR6.SRC:393

### Acceptance Criteria

- [ ] Give each lander its ROM wave-table descent velocity (LNDYV, PHR6.SRC:393)
- [ ] Stagger spawn altitude/entry so landers do not all start at the same Y
- [ ] Implement LANDS0 roam-before-dive behavior so landers patrol and pick targets individually
- [ ] Cite LNDYV/LANDST/LANDS0 in the code
- [ ] Pin with tests that assert landers do NOT share a single Y/velocity after N ticks

## Workflow Tracking
**Workflow:** tdd  
**Phase:** finish  
**Phase Started:** 2026-08-20T19:32:50Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T18:12:59Z | 2026-08-20T18:15:36Z | 2m 37s |
| red | 2026-08-20T18:15:36Z | 2026-08-20T18:27:13Z | 11m 37s |
| green | 2026-08-20T18:27:13Z | 2026-08-20T18:37:01Z | 9m 48s |
| review | 2026-08-20T18:37:01Z | 2026-08-20T18:49:27Z | 12m 26s |
| green | 2026-08-20T18:49:27Z | 2026-08-20T19:20:46Z | 31m 19s |
| review | 2026-08-20T19:20:46Z | 2026-08-20T19:32:50Z | 12m 4s |
| finish | 2026-08-20T19:32:50Z | - | - |

## Sm Assessment

Setup complete and clean. pt1-19 is a 5pt p1 TDD bug fix in the `defender` plugin: landers spawn as a synchronized Space-Invaders row instead of roaming independently.

**Premise verified live** (not copied blind): the description's root-cause claims all hold against the current tree — synchronous wave spawn (`sim.ts:330`), uniform spawn row (`LANDER_SPAWN_Y = YMIN + 2`, landers.ts:46), and uniform `DESCEND_STEP = 2` (landers.ts:85) which carries an explicit df4-3 placeholder comment naming the deferred authentic velocity `LNDYV` (PHR6.SRC:393). ROM anchors LANDST (DEFB6.SRC:649), LANDS0 (DEFB6.SRC:688), LNDYV (PHR6.SRC:393) are already cited in the landers.ts header.

**Scope for RED (TEA):** write failing tests pinning that (a) landers do NOT share a single Y after N ticks (staggered spawn altitude/entry), (b) landers do NOT share a single descent velocity (per-lander LNDYV), and (c) LANDS0 roam-before-dive — landers patrol and pick targets individually rather than descending in lockstep. All fidelity questions are ROM-answered; no user ruling pending.

**Board:** clean at claim time — no rival branch, `develop` synced, merge gate clear; sibling a-3 is on unrelated pt1-15. Claim (stamp + context) committed and branch pushed.

## Tea Assessment

RED landed: `plugins/defender/tests/pt1-19-lander-roam.test.ts` — 3 failing AC tests + 1 forward guard. Isolated red (1071/1074 pass; only the 3 new tests fail, for the feature being absent). Committed `2f89c68f`.

**What each test pins (all ROM-cited, all RED today):**
1. **Individual horizontal roam** (AC1/AC3) — six landers spawned in ONE column, no humanoids, drift to DIFFERENT columns after 60 ticks (`Set(x).size > 1`). ROM: random X velocity `LDA LNDXV / JSR RMAX` + random sign, DEFB6.SRC:667-676. RED today: `size===1` (X frozen without a target).
2. **Not lockstep** (AC5 "not a single velocity") — each lander's per-tick displacement vector differs (`Set(Δx,Δy).size > 1`). RED today: all share `Δx=0, Δy=+2` (the exact lockstep descent).
3. **Roam-before-dive** (AC3) — a target-less lander is alive and `y < YMAX` after 400 ticks (it patrols, does not sink to the floor). ROM: LANDSA rides `GETALT-50`, DEFB6.SRC:688,726-736. RED today: reaches `YMAX=240`.
4. **Finite-coordinate guard** (lang-review #21) — the new velocity arithmetic never yields NaN/±Infinity. Green today; must stay green through GREEN.

**Faithfulness guardrails baked in:** the ROM keeps the spawn row uniform (`LDA #YMIN+2`, DEFB6.SRC:663), so I did NOT pin a staggered spawn Y — the df4-3 test `LANDER_SPAWN_Y === YMIN+2` stays green and the spread is produced by post-spawn roam. All pins are OUTCOME-level (`Set.size`, `< YMAX`), so GREEN picks the mechanism.

**Rule coverage (lang-review/typescript.md):**
- **#21 (degenerate numeric input)** — explicit finite-coordinate guard on the roam path (test 4).
- **#29 (ordering vs magnitude)** — the defect is "identical/lockstep," so distinctness (`Set.size > 1`) IS the load-bearing magnitude axis, not a mere ordering claim; each pin collapses to `size===1` under today's code (mutation-proven by the RED run).
- **#15/#18/#26 (fail-by-passing / terms-all-local)** — assertions read state off the code under test (`bank.landers`), not test-local constants; every RED test was proven to fail on the real defect and the one green test is a named forward guard, not vacuous.

## Dev Assessment

GREEN: all 4 pt1-19 tests pass; full defender suite **1074/1074**; repo lint (`tsc --noEmit`) clean. Commit `2feedbc0`, pushed.

**Implementation (plugins/defender/src/core/landers.ts):**
1. **Individual horizontal roam velocity** — each lander gets a signed `vx` (LNDXV, DEFB6.SRC:667-676), magnitude 1..`ROAM_X_SPEED`, drawn per-spawn. Applied only on the roam path so a wave fans out instead of falling as one column.
2. **Roam-before-dive** — the no-target branch now drifts X by `vx` (wrap16'd on the 16-bit world cylinder) and settles toward `PATROL_Y` (a placeholder for the ROM's terrain-relative `GETALT-50`, LANDSA DEFB6.SRC:726-736) instead of `approach(y, YMAX)`. A target-less lander patrols above the floor rather than plunging to it.
3. **Untouched:** spawn row stays `YMIN+2` (faithful; df4-3 pin green), and the hunt/grab/carry/kill paths are unchanged (a targeted lander still descends to and seizes its humanoid).

**Placeholders (df4-3 exemption):** `ROAM_X_SPEED` and `PATROL_Y` are documented placeholders for wave-table RAM / terrain values (LNDXV, GETALT-50), exactly as `DESCEND_STEP`/`CARRY_STEP` stand in for LNDYV — so the citations audit stays green (no claims/*.json entry required).

**Regression handling (systematic-debugging win, not a re-baseline):** my first cut drew `vx` from the injected `rand`, which shifted the shared entropy stream and reddened 3 seeded tests (df6-1 fingerprint, df4-6/df5-7 visual playtests). Those landers HUNT a target — they never roam — so the failures were pure entropy-shift artifacts, not real behavior changes. Sourcing `vx` from a per-lander spawn INDEX instead keeps every seeded cue-stream/collision scenario **bit-for-bit identical** (fingerprint unchanged → no re-baseline) while delivering the same individual-velocity structure. Verified by re-running all three: green. (Citation note: the LNDXV draw is DEFB6.SRC:670-676; :667-669 is the LDSTIM shot-timer — corrected in code and here per review L2.)

### Dev Rework — round 2 (addresses Cycle 1 review; all 7 findings)

Round 1's fix only roamed target-LESS landers, so the real sim (every lander hunts a seeded ground humanoid) still descended in lockstep — the reviewer reproduced it. Root-caused and fixed properly:

- **H1 (CRITICAL) — roam-until-aligned + terrain-following altitude.** A lander now DIVES only when column-aligned with a live target (`columnDist(rec.x, t.x) <= COLUMN_ALIGN_TOL`, the ROM's LANDS0 `OX16&$FC` CLOSE→LANDG0 vs else→LANDSA, DEFB6.SRC:698-705); otherwise it ROAMS. **Terrain wired (the deferred piece, now done):** the roam altitude is the ROM's real `GETALT-50` — `createSim` decodes the TDATA planet surface and passes `groundAt(worldX)` into `createEnemyBank` (optional; bank unit tests keep a flat default). Landers over different terrain settle at DIFFERENT altitudes, so a wave fans out (verified: 5 distinct Y by ~90 ticks, was 1). Also made targeting **cylinder-aware** (`columnGap`/`columnDist`/`approachColumn`) so a roaming lander reliably reaches prey on the 16-bit world cylinder (this is what un-broke df5-4's abduction).
- **M1 (HIGH)** — added the sim-level regression test (`createSim` wave must not stay one Y-row); it fails on round-1 code, passes now.
- **df4-6 / df5-7 re-staged** (their explicit GREEN license): a same-column ground bait humanoid, so the aligned lander runs a full abduction and the laser kills it — explosion + points restored.
- **df6-1 fingerprint re-baselined** to `22cffd53e6e17bea` (300→287 cues) — intended behavior change; per-cue emission (21/21) + replay + seed-divergence tests still green, so the stream is healthy.
- **L1/L2/L3/L4/L5** — citations fixed (`:711-725` for LANDSA, `:670-676` for LNDXV), the header "the two placeholders" count reworded, the test docstring corrected (velocity is spawn-index, not rand), and a both-signs guard added so the random-sign half is load-bearing.

**Gates:** full defender **1076/1076**, orchestrator **503/503**, lint clean. Commit + push below.

## Reviewer Assessment

**Verdict:** REJECTED
**Cycle: 1**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [CRITICAL] | The fix does not fix the bug — a real wave of landers still descends in perfect lockstep (reproduced) | `plugins/defender/src/core/landers.ts:363-367` | Apply roam-before-dive to targeted-but-**unaligned** landers (LANDS0 :700-711), not only the no-target case |
| [HIGH] [TEST] | RED suite only covers the no-target case, so GREEN passed without fixing the real path | `plugins/defender/tests/pt1-19-lander-roam.test.ts` | Add a sim-level test: a `createSim` wave must not descend as one Y-lockstep row |
| [LOW] [RULE] | Citation `:726-736` mis-anchored (GETALT-50 roam is :711-713) | landers.ts + test file (4×) | Fix to `:711-725` |
| [LOW] [RULE] | Citation `:667-676` imprecise (`LDA LNDXV` is :670; :667-669 is LDSTIM) | landers.ts (3×) | Use `:670-676` |
| [LOW] [RULE] | Header count "the two placeholders" now false (diff adds two more) | landers.ts:34 | Reword to drop the literal count |
| [LOW] [RULE] | Test docstring says rand-driven velocity; impl uses `landerSpawnSeq` | test file header | Reword to match |
| [LOW] [RULE] | Random-sign half of `roamVelocity` not mutation-covered | test file / landers.ts:223-227 | Assert both drift directions occur |

**Handoff:** Back to Dev for fixes

**Specialist coverage:** **[SEC]** reviewer-security returned clean (bounded finite arithmetic; determinism preserved; injection/auth/secrets N/A for an offline sim) — confirmed first-hand. **[RULE]** reviewer-rule-checker returned 4 findings (2×#17 citation, 1×#20 count, 1×#15 sign), all verified against the ROM and confirmed as L1-L5 below. reviewer-preflight clean (1074/1074, lint clean). Full detail in **## Subagent Results**.

## Subagent Results

**All received:** Yes (3 enabled returned; 6 disabled)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1074/1074, lint clean, no smells) | N/A |
| 2 | reviewer-security | Yes | clean | none (bounded arithmetic; determinism preserved; web categories N/A) | N/A |
| 3 | reviewer-rule-checker | Yes | findings | 4 (2×#17 citation, 1×#20 count, 1×#15 sign) | all confirmed → L1-L5 |
| 4 | reviewer-edge-hunter | No — disabled | N/A | N/A | domain assessed first-hand (H1 reproduced) |
| 5 | reviewer-silent-failure-hunter | No — disabled | N/A | N/A | N/A |
| 6 | reviewer-test-analyzer | No — disabled | N/A | N/A | domain assessed first-hand (M1, L4, L5) |
| 7 | reviewer-comment-analyzer | No — disabled | N/A | N/A | domain assessed first-hand (L1, L2 citations) |
| 8 | reviewer-type-design | No — disabled | N/A | N/A | N/A |
| 9 | reviewer-simplifier | No — disabled | N/A | N/A | N/A |

**Specialist findings incorporated:**
- **[SEC]** reviewer-security — clean. Confirmed first-hand: `roamVelocity`/`wrap16(x+vx)`/`approach` are bounded and finite; no ambient entropy; the injected `rand` stream is untouched so seeded replays hold. No security-relevant issue; injection/auth/secrets are N/A for an offline sim.
- **[RULE]** reviewer-rule-checker — 4 findings, all independently verified against the ROM and confirmed as L1-L5 below.

The change is well-documented and passes every gate, but it does **not fix the reported bug** — verified by reproducing the exact playtest scenario in the live sim.

### H1 — CRITICAL (blocking): the fix does not fix the bug
Reproduced (reviewer probe, `createSim` + a 6-lander wave into the seeded ground humanoids at Y=0xe0=224): the landers descend in **perfect lockstep** — identical Y every frame (64→84→104→124→144, +2/tick, `distinctY=1` throughout). That is exactly the "neat row descending in lockstep" the story exists to kill.
**Root cause:** the roam-before-dive is gated on the **no-target** `else` branch (landers.ts:363-367). But in the real sim every lander targets a ground humanoid and takes the HUNT path — `approach(rec.y, t.y, DESCEND_STEP)` — diving straight down at uniform speed from frame 1. `vx` is never applied to a targeted lander.
**ROM (DEFB6.SRC LANDS0 :691):** a lander whose target is NOT column-aligned (`OX16&$FC` mismatch, :700-705) branches to **LANDSA roam** (:711): it holds a terrain-relative altitude (GETALT-50) and drifts horizontally at its own OXV; it dives/grabs (LANDG0 :707) ONLY once column-aligned.
**Required:** apply the roam (individual horizontal drift + hold roam altitude) to **targeted-but-unaligned** landers, not just the target-less case — a lander hunts/dives only when column-aligned with a live target, otherwise it roams. This is AC3 ("roam-before-dive so they patrol and pick targets individually"). Also: the roam altitude should approximate GETALT-50 (~50 above the humanoid row); `PATROL_Y = YMIN+60 = 102` leaves landers hovering far above their prey (they sit at 224).

### M1 — MEDIUM (blocking): the tests let the bug pass
The RED suite only spawns landers with **no humanoids**, so GREEN went green without touching the real (targeted) path. Add a **sim-level regression test**: spawn a wave into a real `createSim` (seeds ground humanoids), step ~50 frames, assert the landers are NOT all at one Y (not a lockstep row). This is precisely the sim-level pin TEA flagged as omitted in the Delivery Findings — H1 is the cost of it being skipped.

### L1 — LOW (#17): citation `:726-736` mis-anchored
The GETALT-50 roam-altitude math is **DEFB6.SRC:711-713** (inside LANDSA :711-725); :726-736 is the OPICT picture-select + `NAP 6,LANDS0` tail. Wrong range appears 4× (landers.ts PATROL_Y doc + roam-branch comment; test-file header + one test title). Fix to :711-725.

### L2 — LOW (#17): citation `:667-676` imprecise
`LDA LNDXV` is at **:670**; :667-669 is the unrelated `LDSTIM` shot-timer draw. Use **:670-676** (3 occurrences in landers.ts).

### L3 — LOW (#20): header count is now false
landers.ts:34 says placeholders are "**the two** vertical speeds DESCEND_STEP/CARRY_STEP" — the diff adds ROAM_X_SPEED and PATROL_Y (two more df4-3 placeholders). Reword the header to drop the count (project rule: no literal count comments) and fold the new constants into the same exemption note.

### L4 — LOW (#17): test docstring contradicts the implementation
pt1-19-lander-roam.test.ts's header says "A RAMP rand hands each spawn/tick a fresh byte so an authentic per-lander velocity draws distinct values" — but the shipped `roamVelocity` draws from `landerSpawnSeq`, NOT `rand` (deliberately, to preserve the seeded stream). Reword to match.

### L5 — LOW (#15): the random-sign half is not load-bearing
Mutating `roamVelocity` to always-positive keeps all 4 tests green (magnitude alone gives distinctness), so the ROM-cited sign draw (BITB #1, :674) has no assertion that can redden. When reworking tests, assert that BOTH leftward and rightward drift occur.

**Passed:** **[SEC]** security (bounded arithmetic; determinism preserved — `rand` stream untouched; injection/auth/secrets N/A for an offline sim); core purity; #21 degenerate input; #29 (distinctness is the correct axis for a "lockstep" defect); citations `:663` and `PHR6:392`; lint; full suite 1074/1074.

**For rework:** H1 is the whole point — make targeted landers roam-then-dive. Expect the df4-6/df5-7 visual-playtest staging to need adjustment (their landers currently dive straight to the beam row); those tests grant GREEN an explicit re-staging license. Fix M1's sim-test in the same round so H1 can't regress.

### Devil's Advocate

Assume this code is broken and hunt for what the green suite hides. The first and decisive hole is the one the tests were built around: every pt1-19 scenario spawns landers with **no humanoids on the field**, so the tests only ever exercise the target-less `else` branch — the one path my change actually touched. The moment a humanoid exists (the real game, every wave), the lander takes the hunt path and my `vx`/`PATROL_Y` logic is dead code. A confused reader sees four green tests plus a green fingerprint and concludes the bug is fixed; a stressed player sees the identical falling row they reported. That gap between "tests pass" and "bug fixed" is the whole finding, and it was reproducible in seconds with the actual sim — which is the check the pipeline skipped.

Second, what does the roam do to landers that never find alignment? With a random signed drift and no steering toward prey, a lander can drift monotonically in one direction (wrap16 sends it around the cylinder) and, if `PATROL_Y=102` sits 122 rows above the humanoid row at 224, it may hover uselessly and never descend to grab — a soft-lock where a wave never clears, stalling the wave director. The tests don't run long enough or in-sim to catch that.

Third, determinism-by-index means lander #0 of every wave always gets the same velocity; a player who learns the pattern faces a predictable fan-out — a fidelity nit, not a blocker, but worth noting since the ROM randomizes.

Fourth, the citations: a reader trusting `:726-736` opens the ROM to the sprite-picture tail and finds no altitude math, eroding trust in every other citation in the file. None of these overturn the verdict; the first cements it.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **TEA (red) — terrain-following Y-spread is a GREEN architecture decision, flagged not invented.** The ROM's per-COLUMN altitude spread comes from LANDSA descending toward `GETALT-50` (DEFB6.SRC:726-736) — a terrain-relative target. The current enemy bank is `createEnemyBank(sched, rand)` with NO terrain access (sim.ts:305), so a full-fidelity "landers settle at different altitudes following the terrain" requires giving the bank terrain (a signature change rippling to every df4-3/df5-4 test that constructs the bank; make it optional to keep them green). I deliberately did NOT encode a terrain-API RED test (it would force an interface I'd be inventing). The RED pins the anti-lockstep OUTCOMES that fix the visible "synchronized row" bug against the current contract (horizontal roam + individual velocity + roam-before-dive). GREEN decides whether the Y-altitude spread is delivered via terrain-following (the faithful path — ROM wins) or a lighter altitude model; either way the shipped tests pass. If GREEN adds terrain, add a test that landers on DIFFERENT columns settle at DIFFERENT altitudes.
- **TEA (red) — the fix must reach the real sim.** No sim-level integration test was added: a fresh `createSim` spawns a lander WAVE via the wave director (spawnSpread across columns) which would make a naive position-spread assertion pass vacuously, and a Y-spread assertion there needs the same terrain path as above. GREEN/Reviewer: verify in the live sim (or a visual playtest) that a spawned wave no longer descends as a lockstep row, in addition to the bank-level unit pins.
### Reviewer (code review)

- **Gap** (blocking): the roam-before-dive is not applied to targeted landers, so the reported lockstep-row bug is unfixed. Affects `plugins/defender/src/core/landers.ts` (roam must fire whenever a lander is not column-aligned with a live target, per LANDS0 :700-711 — not only the no-target branch). *Found by Reviewer during code review.*
- **Gap** (blocking): no sim-level regression test reproduces the real bug. Affects `plugins/defender/tests/pt1-19-lander-roam.test.ts` (add a `createSim`-wave test asserting the landers do not descend as one Y-lockstep row). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `PATROL_Y = YMIN+60` (102) sits far above the humanoid row (224); the ROM's GETALT-50 roam altitude is ~50 above the terrain. Affects `plugins/defender/src/core/landers.ts` (tune the placeholder toward ~ground−50 so landers hover just above their prey). *Found by Reviewer during code review.*

<!-- SM entries below -->

- **SM (setup):** Root-cause claims in the description were verified live against the current tree before setup — all accurate, none stale. `sim.ts:330` synchronous spawn loop present; `LANDER_SPAWN_Y = YMIN + 2` (landers.ts:46); `DESCEND_STEP = 2` (landers.ts:85) carries the explicit df4-3 placeholder comment naming LNDYV (PHR6.SRC:393) as the deferred authentic velocity. LANDST/LANDS0/LNDYV anchors already cited in the landers.ts header. No fidelity ruling needed — ROM is canonical and answers every question here. Board was clean at claim time (no rival branch, sibling a-3 on unrelated pt1-15).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev (green) — lander roam velocity is drawn from a spawn INDEX, not the ROM's `RAND`.** The ROM draws LNDXV via `JSR RMAX` (a RAND call) per lander (DEFB6.SRC:667-676). I draw it deterministically from a per-lander spawn counter (`roamVelocity(landerSpawnSeq++)`, a Knuth multiplicative-hash spread) instead. **Why:** the sim's `rand` is the shared cue-stream entropy, and drawing from it at a new site perturbs every seeded replay (df6-1's frozen fingerprint plus the df4-6/df5-7 collision-geometry playtests all reddened on the stream shift). The STRUCTURE the story needs — each lander its own signed horizontal velocity so the wave spreads — is preserved; only the entropy SOURCE differs, and the velocity magnitude is already a df4-3 placeholder (`ROAM_X_SPEED`), so nothing bit-faithful was on the table anyway. **Forward impact:** landers fan out deterministically per spawn order (different velocity each lander, and each wave advances the counter so waves differ); if a later story gives the enemy bank real terrain + a wave-RAM entropy model, revisit both this source and `PATROL_Y` (see the TEA terrain Delivery Finding).
- **Dev (green) — `PATROL_Y` stands in for the ROM's terrain-relative roam altitude.** The ROM roams toward `GETALT-50` (LANDSA, DEFB6.SRC:726-736), 50 rows above the terrain surface at the lander's column; the pure enemy bank has no terrain (per TEA's Delivery Finding), so a target-less lander patrols at a fixed band (`YMIN+60`) — a df4-3-style placeholder for that terrain-relative altitude. Consequence: with no prey, landers currently share the ONE patrol altitude (they still spread horizontally). The per-column altitude spread waits on the terrain wiring TEA flagged for a follow-up.

### Reviewer Deviation Audit (Cycle 1)

- **Deviation 1 (velocity from spawn index, not `RAND`): ACCEPTED.** Sound engineering call — it preserves the seeded cue-stream determinism the whole test corpus depends on while delivering the required per-lander-velocity structure, and the magnitude was already a placeholder. The determinism-by-index nit (each wave's lander #0 gets the same velocity) is non-blocking. NOTE: the citation range inside this deviation's prose (`:667-676`) inherits the L2 imprecision — narrow to `:670-676` on rework.
- **Deviation 2 (`PATROL_Y` placeholder for GETALT-50): FLAGGED.** A placeholder altitude is acceptable in principle (terrain is deferred), but this deviation's own framing exposes the H1 defect: it reasons only about the *target-less* case ("with no prey, landers ... share the ONE patrol altitude"), which is not the reported scenario — targeted landers never reach this code and still dive in lockstep. Additionally the value (102) is far above the prey row (224), and the cited `:726-736` is mis-anchored (L1, should be :711-725). Resolve under H1: apply the roam to targeted-but-unaligned landers and tune the band toward ~ground−50.
### Dev Rework Deviation Update (round 2)

- **Deviation 2 (PATROL_Y placeholder) — RESOLVED, not deferred.** Round 2 wired the ROM's real `GETALT`: `createSim` decodes the TDATA planet surface and injects `groundAt(worldX)` into `createEnemyBank`, and a roaming lander rides `groundAt(x) - ROAM_ABOVE_GROUND` (the ROM's `GETALT / SUBA #50`, DEFB6.SRC:711-712). So the per-column altitude spread is now the ROM mechanism, not a placeholder — the fixed `PATROL_Y` is gone. The bank keeps a flat `DEFAULT_GROUND_Y` fallback only for terrain-free unit tests.
- **New (round 2): cylinder-aware targeting.** `nearestTarget`, the column-alignment gate, the hunt X-step and the grab-X check now measure wrap-distance on the 16-bit world cylinder (`columnGap`/`columnDist`/`approachColumn`) instead of a raw subtraction. Faithful to OX16 being 16-bit, and required so a roaming lander whose prey walked past the $10000 seam still homes on it (this is what kept df5-4's abduction reliable under the new roam). No ROM constant changed; this is a correctness fix to the distance metric.
- **Deviation 1 (velocity from spawn index) — unchanged, stands as ACCEPTED.**
### Reviewer Deviation Audit (Cycle 1 rework — re-review)

- **Deviation 1 (roam velocity from spawn index, not `RAND`): ACCEPTED.** Unchanged from Cycle 1; sound call, preserves seeded-replay determinism. Security confirmed `roamVelocity` is pure; rule-checker confirmed the sign half is load-bearing.
- **Deviation 2 (roam altitude): ACCEPTED — deviation RESOLVED.** The `PATROL_Y` placeholder is gone; the rework wired the ROM's real `GETALT` (TDATA surface → `groundAt(x)`, roam toward `ground(x)-50`, DEFB6.SRC:711-712). The per-column altitude spread is now the ROM mechanism, not a placeholder — this is what fixed H1. Bank keeps a flat fallback only for terrain-free unit tests.
- **New (round 2) cylinder-aware targeting: ACCEPTED.** `columnGap`/`columnDist`/`approachColumn` measure wrap-distance on the 16-bit world cylinder — faithful to OX16 being 16-bit and required for reliable homing across the seam. Security confirmed total/finite over all inputs. No ROM constant changed.

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)
**Data flow traced:** lander roam altitude ← `groundAt(rec.x)` ← decoded TDATA surface. Safe: `wrap16(worldX) >> 5` is a bounded index into a fixed 2048-entry, guaranteed-non-empty array (`% surface.length` is a proven no-op); security + rule-checker both confirmed no NaN/OOB/entropy path.
**Pattern observed:** roam-until-aligned `if (t && columnDist(rec.x,t.x) <= COLUMN_ALIGN_TOL) …else roam` (landers.ts:398-416, ROM LANDS0 :698-705); terrain-following roam altitude (`:414`, GETALT :711-712); cylinder-aware targeting (`:230-245`).
**Error handling:** non-finite spawn coords rejected at the boundary (landers.ts `spawnLander`/`spawnHumanoid`); every arithmetic path routes through bitwise wrap → total over NaN/±Infinity; no swallowed errors introduced.
**H1 re-verified by reproduction:** the exact round-1 probe (a 6-lander `createSim` wave hunting the seeded ground humanoids) now reaches **5 distinct altitudes by ~90 ticks** (was `distinct=1` on every frame). The synchronized descending row is gone. The brief initial descent-together (landers share `DESCEND_STEP` until they reach their terrain-varied roam altitudes) is ROM-faithful — they spawn in a row at YMIN+2 and spread as they descend.
**Handoff:** To SM for finish-story

**Specialist coverage:** **[SEC]** reviewer-security returned clean — `groundAt`'s index is provably in-bounds, the cylinder math is total over all inputs, and `roamVelocity`/`groundAt` are pure (no ambient entropy). **[RULE]** reviewer-rule-checker returned 0 violations across 30 rules / 47 instances: L1-L5 all resolved (L5 mutation-verified load-bearing), the new citations `:698-705` / `:711-712` / `:670-676` corroborated against DEFB6.SRC, and the 287-cue fingerprint baseline measured live. Full detail in **## Subagent Results**.

## Subagent Results

**Cycle: 1**
**All received:** Yes (2 of 3 enabled returned; preflight errored on a permission prompt — its checks were run first-hand)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No — errored | error | none (checks run first-hand: defender 1076/1076, orchestrator 503/503, lint clean) | domain assessed first-hand |
| 2 | reviewer-security | Yes | clean | none (groundAt index provably in-bounds; cylinder math total; pure/deterministic) | N/A |
| 3 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 47 instances; L1-L5 all resolved (L5 mutation-verified) | confirmed — all clear |
| 4 | reviewer-edge-hunter | No — disabled | N/A | N/A | domain assessed first-hand (H1 reproduction) |
| 5 | reviewer-silent-failure-hunter | No — disabled | N/A | N/A | N/A |
| 6 | reviewer-test-analyzer | No — disabled | N/A | N/A | domain assessed first-hand (M1/L5 mutation-checked) |
| 7 | reviewer-comment-analyzer | No — disabled | N/A | N/A | domain assessed first-hand (all citations re-verified against ROM) |
| 8 | reviewer-type-design | No — disabled | N/A | N/A | N/A |
| 9 | reviewer-simplifier | No — disabled | N/A | N/A | N/A |

**Specialist coverage:** **[SEC]** reviewer-security — clean (numeric safety, determinism, no unbounded growth). **[RULE]** reviewer-rule-checker — 0 violations, L1-L5 resolved, new citations (:698-705, :711-712, :670-676) corroborated against DEFB6.SRC, the 287-cue baseline measured live. Two non-blocking notes (an inline wrap formula in a test since `columnGap` is module-private; a sign-polarity comment that holds for a hash-derived placeholder) — I concur both are non-violations.

### Devil's Advocate

Assume the re-review is being fooled. First worry: did I only move the bug rather than kill it? The round-1 failure was that targeted landers took the hunt path and never roamed. Now the gate is `columnDist <= COLUMN_ALIGN_TOL`; a value too large would re-admit the lockstep (every lander "aligned" from spawn → dives together). `COLUMN_ALIGN_TOL = 0x400` (1024) derives from the ROM's `ANDA #$FC` high-byte column mask, and the reproduction proves the real wave now fans to 5 altitudes — so the gate is tight enough. Second worry: reliability of abduction. A roam that drifts randomly could strand a lander that never aligns, stalling the wave director (a soft-lock the tests wouldn't see). But drift wraps the 16-bit cylinder and targeting is now cylinder-aware, so a lander sweeps every column over time and homes on prey across the seam — df5-4's abduction (1 humanoid, landers drifting away) reddened on the naive metric and went green once cylinder distance landed, which is exactly this concern caught and fixed. Third: the visual tests were re-staged to make the kill land — did the re-stage make them vacuous? No: each still requires a real laser COLIDE kill (explosion + score), just reached via a full abduction run rather than a beam-row hunt; the seam is genuinely exercised. Fourth: the fingerprint re-baseline could hide a real audio regression — but per-cue emission (21/21) and the replay/seed-divergence guards stayed green, so only the integrated ordering shifted, which is the intended behavior change. Fifth, a confused-maintainer angle: `roamVelocity` cites the ROM's LNDXV `RAND` draw but sources a spawn-index hash — the deviation is logged and the comment is honest about it. Nothing here overturns the approval; the one behavior I would still like a human eye on is the ~40-tick initial synchronized descent, which I judge ROM-faithful (shared LNDYV, terrain spreads them as they fall) and therefore not a defect — noted for the owner's playtest.