---
story_id: "uf1-4"
jira_key: "uf1-4"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-4: star-wars trench wedge grid — 13 of 19 exports never reach production

## Story Details
- **ID:** uf1-4
- **Jira Key:** uf1-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T20:51:49Z
<!-- Phase pointer manually reset finish → green: review round 1 verdict was REJECTED (R1-1); complete-phase had taken the approval route. -->

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T19:47:39Z | 2026-08-01T19:49:09Z | 1m 30s |
| red | 2026-08-01T19:49:09Z | 2026-08-01T20:13:16Z | 24m 7s |
| green | 2026-08-01T20:13:16Z | 2026-08-01T20:32:50Z | 19m 34s |
| review | 2026-08-01T20:32:50Z | 2026-08-01T20:49:08Z | 16m 18s |
| finish | 2026-08-01T20:49:08Z | - | - |

## Branch Strategy
**Branch:** none
Trunk-based repository — work commits directly to main. No feature branch created.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): today's wave-1 trench fires ZERO gun shots — measured, not inferred: all 7 legacy stations despawn past the cockpit ~0.28s after entry, before the first TGPROB fire opening at game-frame 15 (~0.73s, mask 0x0f), so the B-017 wall-gun threat does not exist in the running game (the uf1-1 immortal-pilot class, and the epic's 95%-false-positive sweep still under-sold this one). Affects `plugins/star-wars/src/core/sim.ts` (the story's gun streaming fixes it; recorded so the finding survives even if scope shifts). *Found by TEA during test design.*
- **Improvement** (non-blocking): `trench-obstacles.ts` marks its station table PROVISIONAL "pending a full geometry-decode pass" — the wedge grid IS that decode; when Dev retires the turret stations the PROVISIONAL comments (lines 93-121) and the sw3-7 head/tail variation prose should be re-read against what remains, or they become check-#17 stale claims. Affects `plugins/star-wars/src/core/trench-obstacles.ts` (comment accuracy after wiring). *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking): PANEL_PANEL (TD$WPN, 72–114 decorative-panel slots per wave — corrected from 74 in review round 1) may BE the cabinet's shootable 50-point "green square" (`byte_9850`) — the findings doc hedges its naming, and if true the hand-authored square stations should retire in favour of a third streamed layer. That is a fidelity claim needing the longplay check (cabinet-fidelity rule: watch build-beside-longplay first), so it is carried as documented data this story and proposed as a follow-up story: stream PANEL_PANEL as squares, or record why not. Affects `plugins/star-wars/src/core/trench-obstacles.ts` (a `streamPanelSlots(…, PANEL_PANEL, 'square')` one-liner once ruled). *Found by Dev during implementation.*
- **Improvement** (non-blocking): with guns streamed over the full channel, the trench difficulty knobs worth a look are `TRENCH_GUN_FIRE_RANGE` (0x6000 — many streamed guns sit beyond it at any moment, so in-range population is what actually throttles fire) and the `WALL_SLOT_Y` height map, still PROVISIONAL vs the ROM's `M.Z0 ± $200/$400` band (sw7-22's open Delivery Finding, now load-bearing for GUN aim too). Affects `plugins/star-wars/src/core/trench-obstacles.ts` (pin the slot band when WSPANL.MAC:186-215 gets decoded). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): a hands-off wave-1 pilot never reaches the exhaust-port phase end — at 33 simulated seconds the run still holds in `trench` (the port scrolls past unfired-at and the channel holds; measured while checking survivability). Pre-existing behaviour, untouched by uf1-4, but now that guns fire the hold is a live gameplay state a player can sit in; worth a ruling on what the cabinet does after a missed port (loop? crash into the END wall per BS.ELC?). Affects `plugins/star-wars/src/core/sim.ts` (trench end-of-run semantics). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **sw3-7's per-run variation contract superseded** — `trench-variation.test.ts` pinned "different seeds ⇒ different wave-1 chains" via a seeded head/tail shuffle of the station table. Finding B-011 (cited in trench-wedges.ts) establishes the cabinet's authored waves (BS.WAV 0..10) are run-identical; the real GNBASE variation is the BS.WAV ≥ 11 random pie, which `buildTrench` implements. Removing the legacy turret stations removed the shuffle's subjects, so the suite was re-seated on the real mechanism: authored waves now asserted identical across seeds, variation asserted at wave 12+. The suite's own header records the supersession.
- **`spawnTrenchObstacles` lost its `Rng` parameter** — with the kind-pick gone, a seeded parameter would be a dead input every producer ignores (the dead-feature signature); the function is now explicitly deterministic square furniture.
- **`tie-fire-cadence.test.ts` concurrency probe bounded to the space phase** — its fixture's run always coasted into the trench at ~frame 390; the unbounded count only ever measured space because trench guns never fired (the uf1-4 defect). The probe now stops at phase exit, measuring exactly the §6 space cap its test names; the trench's own MAX_FIREBALL_SLOTS budget is covered by trench-gun-streaming.test.ts.

### Reviewer (audit)

- **sw3-7's per-run variation contract superseded** → ✓ ACCEPTED by Reviewer: B-011 is frozen audit evidence quoted in the module itself; the rewrite moves the contract onto the mechanism the ROM actually has, and determinism/purity/seed-0 guards all survive in the new suite.
- **`spawnTrenchObstacles` lost its `Rng` parameter** → ✓ ACCEPTED by Reviewer: with the pick gone the parameter would be the dead-feature signature (an input every producer ignores); removal is the honest shape.
- **`tie-fire-cadence.test.ts` concurrency probe bounded to the space phase** → ✓ ACCEPTED by Reviewer: independently instrumented — the fixture leaves space at ~iteration 390 of 500, so the bounded probe still measures ~390 real space frames; the unbounded version was measuring a phase its contract never named.

## Sm Assessment

Setup complete for uf1-4 (5 pts, p2, tdd). Trunk-based: no feature branch; commits go straight to main. No competing checkout holds this story (no remote branch, no sibling `.session/` entry).

Routing notes for TEA (red phase):

- Target module: `plugins/star-wars/src/core/trench-wedges.ts` (story text predates the monorepo collapse; every `star-wars/src/...` path in the story is now `plugins/star-wars/src/...`).
- The story is a per-symbol disposition audit: 13 test-only exports must each end WIRED, REMOVED, or documented in the module header as deliberately-carried ROM data. No symbol may remain referenced only by tests (AC-5), and the header must state what production consumes (AC-6).
- Reference implementation for any WIRE disposition: `streamForceFields` (`plugins/star-wars/src/core/trench-obstacles.ts:207`, consumed at `sim.ts:1763`, shipped by sw7-22). sw7-22 behaviour must not change as collateral (AC-3).
- If PANEL_GUN is wired, the proof is a test that moves a gun by changing grid data alone — guns streamed from decoded columns, not legacy TrenchObstacle placement via `TRENCH_GUN_FIRE_MASK` (AC-2).
- Perf guard: sw7-19's dense grid was blocked by the port-clamp run-duration ceiling (~327k vs ~28k objects); any newly streamed layer must be measured empirically (AC-4).
- `plugins/star-wars/CLAUDE.md` applies. Star-wars review dispatch typically requires only the `[RULE]` tag.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/star-wars/tests/core/trench-wedges-consumption.test.ts` — the sweep's export scan made permanent (AC-1, AC-5, AC-6): every export of trench-wedges.ts must be production-consumed, removed, or named in a header block under the marker phrase `CARRIED WITHOUT A CONSUMER`; plus a stale-doc guard (carried block may not name consumed symbols) and the AC-6 `production consumes` header statement. Scan strips comments before matching (decoy-comment class) and asserts corpus/extraction soundness before any quantified loop (check #15).
- `plugins/star-wars/tests/core/trench-gun-streaming.test.ts` — wall guns streamed from the grid's PANEL_GUN columns (AC-2), pinned as observables off `enterPhase(...).trenchObstacles` kind `'turret'` exactly as the sw7-22 force-field suite did, so Dev owns the streaming function's name/shape. Covers: exact count (80 at wave 1), multiset (wall, −Z) provenance both ways, per-wall independence (TWDG54), stacked-slot distinct heights, A1..A4 slot height ordering (structural, heights stay Dev's), AC-3 co-existence with sw7-22 fields, AC-4 measured object ceilings (≤512 entry / ≤128 guns vs measured max <470), and an end-to-end fire test.

**Tests Written:** 12 tests (4 + 8) covering 6 ACs. 9 RED / 3 green (two anchors + one vacuous-until-GREEN guard).
**Status:** RED (verified by testing-runner, RUN_ID uf1-4-tea-red: exactly the 9 intended failures; 2091 other star-wars tests green at baseline; repo lint clean). Committed as 1db456d.

**Scope rulings embodied in the tests (the story says "pick one per symbol"):**
- PANEL_GUN → **WIRE**. Grounds: sw7-22's own suite names PIE1's guns "B-017, the NEXT story"; the legacy station table is marked PROVISIONAL pending the geometry decode the grid already is; AC-2 spells out the proof. The suite outlaws legacy turret stations (multiset test) — squares are deliberately unconstrained.
- The other 12 symbols → Dev picks per symbol (wire / remove / carried-block), enforced by the disposition scan whichever way each goes. The scan was mutation-proven in both directions: carried-block satisfies it, a consumed symbol in the carried block reddens the stale-doc guard, a comment mention never counts as a consumer.

**Measured ground truth** (probes 2026-08-01, quoted in test headers): gun slots per wave 1–13 span 52–96 (wave 1: 80, first at exactly 0x6000 = TRENCH_GUN_FIRE_RANGE); fields 0–256; decorative panels 74–114; port constant 327,680 (already pinned by trench-port-bs-plc.test.ts).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 token-vs-claim source assertions | consumption scan: comment-stripping, count-first guards, cross-checking guard pair, mutation-proven | 2 failing / 2 green by design |
| #15 pin the number | gun counts pinned exact (80, `gridGuns().length`), ceilings close over measurement (512 vs <470) | failing (RED body) |
| #17 comments assert an un-run mechanism | fire test comment initially claimed "green today via legacy stations" — ran it, found false, rewrote with the measured truth | fixed in-file |
| #2 readonly params | grid helpers type chain as `readonly Wedge[]`, `GridGun` readonly-shaped | n/a (test code) |
| #14 edges in one branch | not applicable in RED — streaming is spawn-time, no transition edges; flagged for Dev if enterPhase wiring grows branches | noted |

**Rules checked:** 3 of 17 applicable to test-authoring (rest target implementation diffs — Dev/Reviewer scope).
**Self-check:** 0 vacuous assertions; the one vacuous-until-GREEN guard (stale-doc) is deliberate, cross-guarded, and documented in-file.

**Notes for Dev:**
- `sim.ts` and `trench-obstacles.ts` are cited files — after editing, run `npx vitest run --project star-wars citations` and reanchor with `tools/audit/reanchor-citations.mjs` if line drift reddens the gate.
- Blast radius to expect: `trench-variation.test.ts` (sw3-7 head/tail picks) and `trench-furniture-anchoring.test.ts` / aim-wysiwyg pins reference the legacy turret stations; superseding them is deliberate — log the deviation rather than keeping dual gun sources.
- The tail pool (`TRENCH_TAIL_POOL`) picks `'turret'` randomly — any surviving legacy turret pick violates the multiset test; the station table must lose its gun role entirely, whatever happens to squares.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/star-wars/src/core/trench-obstacles.ts` — turret rows retired from the station table (3 squares remain); `spawnTrenchObstacles()` now deterministic and seedless; the force-field walk generalised to `streamPanelSlots(baseWave, rng, slotType, kind)` (typed on `PanelColumn` — its production wire); `streamWallGuns` streams every PANEL_GUN slot as kind `'turret'`; `FORCE_FIELD_SLOT_Y` renamed `WALL_SLOT_Y` (one slot→height map for every slot type, values unchanged so sw7-22 output is byte-identical).
- `plugins/star-wars/src/core/sim.ts` — trench entry composes squares + streamed fields + streamed guns; entry comment rewritten to the B-011 truth.
- `plugins/star-wars/src/core/trench-wedges.ts` — header gained WHAT PRODUCTION CONSUMES (AC-6) and the CARRIED WITHOUT A CONSUMER inventory (11 symbols, per-symbol why); the stale "wall guns … NOT built here" sentence updated.
- `plugins/star-wars/src/core/scenePresets.ts` — TURRET-ALLEY preset pulls its turrets from the streamed guns (was about to become a turret-free stale label).
- `plugins/star-wars/tests/core/trench-variation.test.ts` — re-seated on the real mechanism (see Design Deviations).
- `plugins/star-wars/tests/core/trench-obstacles.test.ts` — entry-composition and table-sanity tests updated to squares + two streamed layers.
- `plugins/star-wars/tests/core/tie-fire-cadence.test.ts` — concurrency probe bounded to the space phase (see Design Deviations).
- `plugins/star-wars/docs/audit/findings/*.json` — citations reanchored (line drift only; 22 moved, 0 lost).

**Dispositions (AC-1), final:** WIRE = PANEL_GUN, PanelColumn. CARRY (header-documented) = PANEL_BLANK, PANEL_PANEL, decodePanelColumn, WEDGE_SHORT/LONG/END/PORT/NEXT, PIES, WEDGE_GROUP_IDS, wedgeGroup. REMOVED = none. The consumption scan enforces the partition both ways.

**Tests:** 2095/2095 star-wars tests passing (196 files), repo lint clean; citation gate green after reanchor. Mutation bar re-proven post-GREEN: deleting the `streamWallGuns` entry line reddens 7 of 8 gun-streaming tests including the fire test.
**Branch:** none — trunk-based; commits `a7cdb10` (RED) + `1e4111d` (GREEN) rebased onto jt5-2 and pushed to origin/main.

**Handoff:** To Reviewer for code review.

**Round 1 fix (d96fbf2):** R1-1 applied exactly as specified — panel floor corrected 74→72, the force-field range scoped to its seed (0..256 @ seed 1983; ≤272 across the 20,000-seed sweep), swept ceiling margins recorded (343/106 vs 512/128). Comment-only, proven by diff (zero non-comment lines); the two uf1-4 suites re-ran green (12/12). The session's Dev delivery-finding phrasing of the same figure was corrected too (wrong-prose rule: every phrasing). Pushed after rebase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — star-wars 2095/2095, orchestrator 359/359, lint clean, zero smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (check #17, high confidence) + 5 story-ask PASSes + 5 passes-of-note | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

## Review Notes (round 1)

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` #1–#17 + the star-wars core-purity boundary. Checks #6/#7/#9/#10/#11/#12/#16 have zero applicable instances in this diff (no .tsx, no async, no config, no I/O boundary, no try/catch, no barrel imports, no DOM).

- **#1 non-null assertions** — compliant: every `!` in the new tests (`cell!`, `g!`, `t!`, `stacked!`) is immediately preceded by `expect(...).toBeDefined()` on the same value (vitest doesn't narrow, so the pattern is the accepted guarded form).
- **#2 readonly** — compliant: `chain: readonly Wedge[]`, `PanelColumn` readonly tuple, `WALL_SLOT_Y: readonly number[]`, `TRENCH_OBSTACLE_STATIONS: readonly TrenchObstacle[]`.
- **#5 type-only imports** — compliant: `type PanelColumn, type Wedge` inline modifiers at trench-obstacles.ts:13.
- **#14 derived edges in one branch** — n/a-verified: the streaming is spawn-time composition in `enterPhase`; no transition edge is computed anywhere in the diff.
- **#15 token-vs-claim source assertions** — compliant and mutation-proven both directions (rule-checker re-ran TEA's mutations independently: carried-entry deletion reddens the disposition test; a production import of a carried symbol reddens the stale-doc guard; comment mentions are stripped before matching; the slot-order loop asserts its collected count first).
- **#17 comments asserting an un-run mechanism** — **ONE VIOLATION**, confirmed [RULE], see finding R1-1 below.
- **Core purity** — compliant: core-purity scanner green over all four changed core files; all three `createRng(s.rng.seed)` cursors in `enterPhase` are fresh local objects, `s.rng` never mutated (verified down to @shared/rng.ts's mutation semantics by the rule-checker; pinned behaviorally by trench-variation.test.ts at the random wave).

### Observations

- [VERIFIED] AC-3 byte-identical force fields — rule-checker A/B'd pre-diff `streamForceFields` (git show aa88865) against the `streamPanelSlots`-routed version across 15 waves × 6 seeds (90 cases): `toEqual` held for every case; emission order confirmed identical by reading both walks; `WALL_SLOT_Y` values are the untouched literals. Complies with AC-3's no-collateral rule.
- [VERIFIED] carried-block partition exhaustive and accurate — 8 production-consumed + 11 carried = 19 = all exports; zero production references for any carried name; all 8 consumed names resolve to real imports (state.ts / sim.ts / trench-obstacles.ts). Complies with AC-1/AC-5/AC-6.
- [VERIFIED] both streamed layers read the SAME chain — `streamForceFields` and `streamWallGuns` each take a fresh cursor from the same `s.rng.seed`, so at the random pie both walk one identical trench; fields and guns can never describe two different channels (sim.ts trench entry). Complies with the seeded-determinism convention.
- [VERIFIED] cadence probe non-vacuous after the space-bound — instrumented through the real step path: the fixture leaves space at iteration ~390 of 500, so the bounded loop still measures ~390 space frames (tie-fire-cadence.test.ts:105-121).
- [VERIFIED] turret-alley arithmetic — wave-1's first four gun slots all sit at −0x6000; shifted by +0x6000−2000 they land at exactly z=−2000, inside TRENCH_FAR, both walls, mid slots (scenePresets.ts).
- [VERIFIED] the entry-composition test is a genuine wiring pin, not vacuous circularity — its `wave0 = s0.wave − 1` is hand-derived (catches a wave-offset bug) and a dropped/reordered stream layer fails it; CONTENT correctness is independently derived from the grid by trench-gun-streaming.test.ts's own `buildTrench` walk, so the suites are non-circular in combination.
- [VERIFIED] gameplay threat measured, not assumed — hands-off pilot, 33 simulated seconds: 30–36 shots fired, one shield lost (waves 1/3/5); the restored B-017 threat is real and matches the wave-1 TGPROB row's intended mildness.
- [MEDIUM] finding R1-1 below (comment misstates measured ranges).

### Devil's Advocate

Suppose this diff is broken. The strongest attack: the "byte-identical" AC-3 claim could hide an order or height change that the existing force-field suite is too loose to catch — but the A/B probe compared the OLD function's literal output against the new one with `toEqual` across 90 cases, which forecloses order, height, wall and count drift at once. Second attack: the consumption scan could be theater — a regex that greens everything. It cannot: the two guards cross-check (an always-true carried matcher reddens the stale-doc guard on the eight consumed names), and both mutation directions were re-run independently in this review, not just taken from TEA's notes. Third: streaming 80 guns into `trenchObstacles` could break the beam's one-object-per-frame contest or flood `enemyShots` — the fire loop still caps at MAX_FIREBALL_SLOTS (measured peak 6), the S-016 shield window rate-limits damage (one shield per 33 hands-off seconds), and the beam loop's nearest-wins tie rule is untouched. Fourth: the variation-suite rewrite could be laundering a behavior regression as "fidelity" — but B-011 is a frozen audit finding quoted in the module itself, and the old suite's premise (seed-varying wave-1 trenches) is variation the cabinet demonstrably lacks; the new suite still guards determinism, purity, seed-0 validity and genuine variation where the ROM has it (wave ≥ 12). Fifth: wave > 13 or huge seeds — the ceilings were swept across 3000 seeds × 13 waves (max 343 objects / 106 guns vs 512/128 ceilings) and 20,000 seeds for the field count; margins hold. What survives this section is exactly one thing: the ground-truth comment's two wrong numerals — which is finding R1-1, and it blocks nothing at runtime but must not ship as citable "measurement."

### Round-1 Findings

| # | Severity | Tag | Issue | Location | Fix Required |
|---|----------|-----|-------|----------|--------------|
| R1-1 | [MEDIUM] | [RULE #17] | The "MEASURED GROUND TRUTH" header claims "decorative panels 74..114" (true floor is **72**, at wave 8 — the TEA probe itself printed 72; 74 is the same line's GUN count transcribed into the wrong clause) and states "force fields 0..256" as unqualified truth (true only under seed 1983; ≥**272** exists across the random-pie seed space, per a 20,000-seed sweep). The assertion ceilings (≤512 / ≤128) are unaffected — max observed 343 / 106 across 3000 seeds × 13 waves. | `plugins/star-wars/tests/core/trench-gun-streaming.test.ts:16-21` | Correct the panel floor to 72; scope the field range to its seed or restate from the seed sweep (0..272); optionally note the swept ceilings so the next reader inherits real margins. Comment-only; no assertion changes. |

**Round-1 verdict rationale:** MEDIUM does not force rejection, but this class does not ship from THIS epic: uf1's charter (uf1-5, sw8-15) is precisely wrong-count prose presented as ground truth, and a "measured" comment whose numbers a re-run contradicts is the seed of the next sweep. The fix is two numerals and a scope clause; one round is proportionate (single finding, fully specified, no design change).

## Reviewer Assessment

**Verdict:** REJECTED
**Data flow traced:** wedge tables (WSBASE.MAC transcription) → `buildTrench` chain → `streamPanelSlots` walk → `enterPhase` trenchObstacles → BSGUN fire loop → `enemyShots` → S-016 shield window (safe: seeded local cursors only, caps at MAX_FIREBALL_SLOTS, measured one shield lost per 33 hands-off seconds).
**Pattern observed:** good — the sw7-22 observable-pinning discipline reused verbatim for the gun layer (`trench-gun-streaming.test.ts` derives placements from the grid, never from the streamer), and the consumption scan institutionalises the sweep at `tests/core/trench-wedges-consumption.test.ts`.
**Error handling:** n/a-verified — pure data walk, no I/O, no failure paths added; `wedgeGroup` throw path unchanged and covered.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [RULE] | check #17 — "MEASURED GROUND TRUTH" comment misstates two measurements: panel floor is 72 (comment says 74; wave 8, the probe's own output), and "force fields 0..256" is seed-1983-only (≥272 across the random-pie seed space, 20,000-seed sweep). Assertion ceilings (≤512/≤128) verified safe at 343/106 max across 3000 seeds × 13 waves. | `plugins/star-wars/tests/core/trench-gun-streaming.test.ts:16-21` | Correct 74→72; scope or restate the field range (0..272 across seeds); optionally record the swept ceilings. Comment-only — no assertion change. |

Subagent dispatch: [RULE] finding confirmed from reviewer-rule-checker; reviewer-preflight clean (2095/2095 + 359/359 + lint). All five story-specific asks PASS (AC-3 byte-identical A/B over 90 cases; carried-block partition exhaustive; cadence probe non-vacuous; preset arithmetic exact; entry pin non-circular in combination).

**Handoff:** Back to Dev for the R1-1 comment fix.

---

### Round 2

**Verdict:** APPROVED

R1-1 verified closed: commit d96fbf2 is comment-only (diff shows zero non-comment lines changed), the corrected floor 72 matches the TEA probe's own recorded output for wave 8, the force-field range now carries its seed scope with the 20,000-seed sweep figure (≤272), and the ceilings quote the swept margins (343/106 observed vs 512/128 asserted — sourced from the round-1 [RULE] rule-checker's executed sweeps, cited with provenance). The two uf1-4 suites re-ran green (12/12); no other file changed, so the round-1 verification (preflight 2095/2095 + 359/359 + lint; all five story asks PASS) stands. The wrong-prose rule was honoured: the same figure's other phrasing in this session's Dev delivery finding was corrected in the same round. No Critical/High at any round; the single MEDIUM is fixed.

**Handoff:** To SM for finish-story.