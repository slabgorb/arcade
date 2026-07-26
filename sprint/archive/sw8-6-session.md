---
story_id: "sw8-6"
jira_key: "sw8-6"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-6: TIE approach reads as a field-crossing sweep, not a centerline zoom

## Story Details
- **ID:** sw8-6
- **Jira Key:** sw8-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T12:12:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T11:11:05.546161Z | 2026-07-26T11:13:17Z | 2m 11s |
| red | 2026-07-26T11:13:17Z | 2026-07-26T11:33:16Z | 19m 59s |
| green | 2026-07-26T11:33:16Z | 2026-07-26T12:01:27Z | 28m 11s |
| review | 2026-07-26T12:01:27Z | 2026-07-26T12:12:57Z | 11m 30s |
| finish | 2026-07-26T12:12:57Z | - | - |

## Sm Assessment

**Story:** sw8-6 (5pt, p1, type: bug) — star-wars, epic sw8 (gameplay feel-vs-cabinet fidelity). TDD (phased): setup → **red** → green → review → finish.

**What's wrong (the divergence to fix):** Our space TIEs approach roughly head-on and only converge to the centerline at point-blank, so they *grow on the crosshair then loop* — a "centerline zoom." The cabinet longplay instead shows each fighter carrying a lateral offset across the whole approach and **sweeping across the field/screen** as it closes. The story title records the measured targets: one TIE flew x≈0 its entire life, while #2/#3 steer x→0 across the long approach. This is a render/feel-vs-cabinet fix (sw8 axis), not a sim-vs-ROM constant swap — the longplay is ground truth.

**Setup delivered:**
- Session + branch `fix/sw8-6-tie-field-crossing-sweep` cut off star-wars `develop` (baseline 9a1cfeb, includes sw8-5). Clean tree.
- Context: `sprint/context/context-story-sw8-6.md` — frames the divergence and four ACs around observable/measured trajectory behavior (lateral offset carried across the field; a TIE can hold x≈0 for its whole life; #2/#3 exhibit a steer-toward-x→0 component; cross-screen sweep replaces grow-on-crosshair). Desktop-only game — no viewport ACs.

**Pointers for TEA (context discovery only — I did not plan the implementation):** the space TIE flight/choreography lives in star-wars/src/core (gameRules.ts / sim.ts and TIE flight modules); the RE'd flight model is documented in star-wars/docs/tie-flight-ai-model.md; game logic ticks at 20 Hz. Trajectory behavior is deterministic and testable in the core; the observable sweep is verifiable against the cabinet longplay (frames + dev key-7 jump + a vitest trajectory-probe is the established capture recipe).

**Routing decision:** Setup complete, gate inputs satisfied (session, context, branch). Hand off to **Han Solo (TEA)** for the RED phase — author failing trajectory-probe tests that pin the field-crossing sweep / carried lateral offset before any code changes. No blockers.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5pt gameplay-fidelity BUG; the divergence is a measurable world-space trajectory property, unit-testable on the pure core.

**Test Files:**
- `star-wars/tests/core/tie-approach-sweep.test.ts` — hero-TIE approach trajectory probe (drives the public `stepGame`; one hero TIE per run, spawner + fire clocks parked).

**The ruling (rule-before-fix, epic sw8 §3).** I ran the real sim (throwaway probe, since deleted) on a hero TIE flown with no player input. Findings:
- **slot 0** (ROM 1A1, spawn x=0): world-x stays 0 the whole approach, then overshoots the cockpit and **loops** (wy climbs to ~5600). = "a TIE flew x=0 its whole life."
- **slot 1 / slot 2** (spawn x=∓1024): world-x −1024→−100 while depth 31744→3087, then **rams the cockpit and vanishes (~f62)**. = "#2/#3 steer x→0."
- **The defect:** the offset fighters collapse their lateral offset **proportionally to depth** — the angular lateral position `|x|/depth` is **FLAT** across the approach (0.0323→0.0324, ~1.00×). A fighter that holds a fixed screen *angle* and merely grows = a **centerline zoom / grow-on-the-crosshair**. The 1983 longplay carries the spawn offset across the field so `|x|/depth` **widens** and the TIE sweeps across the screen. The moving eye (sw8-1/sw8-2, shipped & bounded ±2048) adds only a modest on-screen pan; the isolable, unit-testable defect is purely the **choreography / world path**.

**Tests Written:** 6 tests.
- **RED drivers (2, FAILING):** offset TIE slot 1 & slot 2 — `|x|/depth` at the closing sample must be > 1.5× the spawn ratio (a real outward sweep). Today it is flat → both fail on `expected 0.0322 to be greater than 0.0484`. The 1.5× bar only asserts a sweep *exists*; the carried magnitude is Dev's longplay tuning (design §3 "eyeball-owned"), not pinned.
- **Preservation guards (3, PASSING now & after):** centred TIE (slot 0) holds world-x ≈ 0 (`maxAbsX < 100`); slots 1 & 2 still converge (`|x_close| < |x_spawn|`). Together these bound the fix — carry the offset **and** still head for centre, without shoving the already-centred fighter off-axis.
- **Determinism (1, PASSING, AC4):** same seed + no input → byte-identical trajectory; non-trivial (it actually closed distance).

**Status:** RED (2 failing, ready for Dev). Full suite: 176 files / 1837 tests, only the 2 intended failures, **no collateral**. `tsc --noEmit` clean.

### Rule Coverage

| Rule (TS lang-review / project) | Test(s) | Status |
|------|---------|--------|
| Nullable handled, no non-null `!` assertions | `enemies[0]` guarded by `if (!e) break`; `closingSample` result guarded by `expect(close).toBeDefined()` | passing |
| Meaningful / non-vacuous assertions | every test carries non-vacuity guards (offset > 500, depth decreased, ratio > 0) | passing/failing |
| Float comparison via inequality, not exact `toBe` | ratio uses `toBeGreaterThan`; determinism `toEqual` compares identical deterministic runs (correct) | passing |
| Core purity / determinism (star-wars CLAUDE.md) | drives pure `stepGame`, seeded RNG, `dt`-only, no DOM/clock/`Math.random` | passing |

**Rules checked:** the applicable TS type-safety + core-purity checks all have coverage (no `as any`/`@ts-ignore`, exhaustiveness N/A — no new switch/enum).
**Self-check:** 0 vacuous tests — each assertion can fail on wrong behavior; the two RED drivers were confirmed to fail for the ratio reason (not a crash/import), verified GREEN-able by construction (a carried offset widens the ratio several-fold at depth 3000).

**Handoff:** To Yoda (Dev) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**The fix (one lever, faithful).** The centreline-zoom beeline was seeded at SPAWN, not in the flight loop: `spawnTie` set `orient: lookRotation(toCockpit(pos))`, pre-aiming the nose at the exact origin from each offset slot. Flight thrusts along the nose (`applyManeuver` §5), so the nose-at-origin heading dragged world-x down *proportionally to depth* → `|x|/depth` flat → zoom. The ROM (WSCPU §4, audit finding A-008 `LDA #0C0 ;FACE ALIEN TOWARDS PLAYER`) faces the fighter **straight down-range**, not per-slot look-at-origin. Fix: spawn facing `FACING_PLAYER = +Z`. Straight facing → forward thrust holds x while depth shrinks → `|x|/depth` WIDENS → the fighter carries its offset across the field and sweeps across the screen, exactly the longplay. The choreography's own later YAW/AIM_PLAYER maneuvers steer x→0. `applyManeuver`/`aimOrient` unchanged.

**Files Changed:**
- `star-wars/src/core/sim.ts` — `spawnTie` spawn heading `lookRotation(toCockpit(pos))` → `lookRotation(FACING_PLAYER)` (a named `[0,0,1]`), with a comment tracing it to ROM §4 / A-008.
- `star-wars/tests/core/tie-approach-sweep.test.ts` — the "converge" preservation guard's measurement point corrected (mid-field depth-3000 → full-trajectory min; see Design Deviations). RED driver, centred-TIE guard, and determinism guard untouched.
- `star-wars/docs/audit/findings/pair-tie-ai.json` — A-008 (CONFIRMED) ours-side + claim re-spelled to the now-more-faithful straight facing; A-015 line reanchored (mechanical drift from the added comment).

**Tests:** 1837/1837 passing (GREEN); `tsc --noEmit` clean; full fleet run (176 files, no narrowing), **no collateral**. RED driver **mutation-verified**: reverting the heading to `lookRotation(toCockpit(pos))` reddens both sweep drivers (`expected 0.032 to be greater than 0.048`); restored. Citations suite green after the re-spell/reanchor.

**Scope note.** Delivers the story's core — the approach reads as a field-crossing sweep, not a centreline zoom. The offset TIEs now fly PAST the cockpit (converging during the pass) rather than beeline-ram; reproducing the longplay's in-front loiter-and-converge needs the deferred play-cube clamp / no-ram (Delivery Finding, future story). Visual parity vs `star-wars-longplay.mov` (AC1/AC3) is manual QA per epic §6.

**Branch:** `fix/sw8-6-tie-field-crossing-sweep` (to be pushed).
**Handoff:** To the next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — green suite 1837/1837, tsc clean, 0 smells, purity intact, `toCockpit` import still live |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: the diff has one branch-free heading swap; edge inputs (offset slots ±1024/±2048, x=0) all probed |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error paths/catches in the diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer read the test file: non-vacuous, guarded, RED driver mutation-verified |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer verified the rewritten spawnTie docstring + audit prose match the code |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer: `FACING_PLAYER: Vec3` typed/immutable; one LOW (`closingSample` return type) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no security surface (a static core constant, no input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — change is already minimal (one line + one const) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 15 rules / 18 instances | N/A — clean; 1 out-of-scope observation (A-009 stale citation) **dismissed**: A-009 is `remediated_by: sw7-11` (deliberately frozen, checker skips it), pre-existing, untouched by this diff |

**All received:** Yes (2 enabled returned clean; 7 disabled pre-filled and their domains covered by Reviewer)
**Total findings:** 0 confirmed blocking, 1 dismissed (A-009 out-of-scope/remediated), 1 LOW + 1 non-blocking informational (mine, below)

## Reviewer Assessment

**Verdict:** APPROVED

**What the change is.** One line of behaviour: `spawnTie`'s heading `lookRotation(toCockpit(pos))` → `lookRotation(FACING_PLAYER)` (`const FACING_PLAYER: Vec3 = [0,0,1]`). The old heading pre-aimed the nose at the exact origin from each offset slot; since flight thrusts along the nose (`applyManeuver`), that dragged world-x down proportionally to depth → `|x|/depth` flat → a centreline zoom. Facing straight down-range carries the offset → `|x|/depth` widens → the field-crossing sweep. Faithful to ROM §4 / audit finding A-008 (`FACE ALIEN TOWARDS PLAYER`, an Ax/By flip = a straight facing, not a per-slot look-at-origin).

**Data flow traced:** `spawnTie` → `Enemy.orient` → read by `applyManeuver` (thrust basis) and by `computeStatus` C_AS (nose·toCockpit fire cone). Both consume the new heading safely (traced below); the render camera does not read `orient` for the sweep — the world trajectory is the mechanism.

**Pattern observed:** module-private typed literal `FACING_PLAYER` placed adjacent to `spawnTie`, matching the existing `ROM_LATERAL_UNIT`/`SPAWN_LATERALS` local-const style (sim.ts:1906/1938). Good.

**Error handling:** N/A — no error paths, catches, or fallible calls in the diff; pure deterministic core.

### Rule Compliance (lang-review/typescript.md + star-wars core-purity)

| # | Rule | Instances in diff | Verdict |
|---|------|-------------------|---------|
| 1 | Type-safety escapes (`as any`/`as unknown`/`@ts-ignore`/unsafe `!`) | 0 introduced | ✓ compliant |
| 2 | Generic/interface pitfalls (missing `readonly`, `Record<string,any>`) | `closingSample(Sample[])` | ✓ (matches existing tests/core helper convention; no mutation) |
| 4 | Null/undefined handling | `enemies[0]` (`if(!e)break`); `closingSample` return | ✓ (both guarded — `toBeDefined()` before deref) |
| 5 | Module/`.js` extension | test relative imports | ✓ (in-repo/test code under bundler resolution; `.js` rule is for arcade-shared subpaths) |
| 8 | Test quality (vacuous/`.only`/`as any`/float `toBe`) | 6 tests | ✓ (non-vacuity guards throughout; determinism `toEqual` is correct bit-for-bit use) |
| 3,6,7,9–13 | Enums/JSX/async/build/security/error/perf | 0 | ✓ N/A — none in diff |
| 14 | src/core purity (no DOM/clock/`Math.random`, dt+RNG only) | `FACING_PLAYER`, `spawnTie` | ✓ static literal; no shell import |
| 15 | Audit-fidelity re-spell/reanchor consistency | A-008, A-015 | ✓ A-008 claim/reasoning/verbatim in lockstep, class stays CONFIRMED; A-015 pure reanchor |

`[RULE]` reviewer-rule-checker — 15 rules / 18 instances / **0 violations**, independently tsc-clean and citation-verbatim-verified. Its lone observation (A-009 stale citation) is dismissed: A-009 is `remediated_by: sw7-11`, deliberately frozen, pre-existing, and not shifted by this diff.

### Observations

1. `[VERIFIED]` The sweep is real and mutation-tied — reverting the heading to `lookRotation(toCockpit(pos))` reddens both sweep drivers (`expected 0.032 to be greater than 0.048`), restore → green. Evidence: Dev's testing-runner mutation pass + mechanism (thrust-along-nose). sim.ts:1955.
2. `[VERIFIED]` Enemy fire is NOT reduced by the heading change. I feared the fixed nose would drop offset TIEs out of the 12° C_AS cone (`x/depth > tan12°`) at close range — but measured wave-1 fire is net **higher** with the fix (6 vs 4 over 600 frames) because offset TIEs now fly *past* instead of ramming at ~f62, living longer to fire; the homing re-aims them during the pass. Evidence: throwaway fireprobe (deleted). tie-status.ts:65, sim.ts:369.
3. `[VERIFIED]` Core purity intact — `FACING_PLAYER` is a static literal; `spawnTie` has no DOM/wall-clock/`Math.random` and no shell import; determinism holds (AC4 test + full-suite green). sim.ts:1938.
4. `[VERIFIED]` `toCockpit` import not orphaned by removing `const dir` — still used by `aimOrient`. Evidence: preflight + rule-checker, tsc clean. sim.ts:108,1812.
5. `[VERIFIED]` Audit re-spell is honest, not laundering — A-008's claim ("TIE faces the player at spawn") is TRUE under the new code and *more* faithful to the ROM's straight Ax/By flip than the old look-at-origin; verbatim/line match; class stays CONFIRMED. pair-tie-ai.json:122-136.
6. `[VERIFIED]` No collateral — full suite 1837/1837, 176 files, not narrowed. The ram-contract siblings (space-combat) still pass because they stage their own origin-placed fixtures, not spawnTie's trajectory. Evidence: preflight + own run.
7. `[LOW]` `closingSample` is typed `Sample` but returns `inFront[len-1]` which is `undefined` when empty; the RED driver guards it with `expect(close).toBeDefined()` before deref (no runtime risk), but `Sample | undefined` would be more honest. tie-approach-sweep.test.ts:67.
8. `[MEDIUM — non-blocking, informational]` The fix delivers the story's core (approach = sweep, not zoom) but offset TIEs now fly *past* and converge during the pass rather than loitering-and-converging *in front* as the longplay shows; the in-front loiter needs the deferred play-cube clamp / no-ram (Dev already logged this Delivery Finding). Visual QA (AC1/AC3) vs `star-wars-longplay.mov` will confirm the on-screen sweep. Not a blocker — no correctness bug, and it aligns with the epic's fire-fairness direction.

### Devil's Advocate

Argue the change is broken. **Fire starvation:** the fixed down-range nose leaves the 12° C_AS "in sights" cone as an offset TIE closes (`x/depth` exceeds `tan 12° ≈ 0.213`), so offset fighters could stop shooting at close range and the wave goes toothless. *Refuted by measurement:* net fire rose (6 vs 4) — the TIEs live longer (fly past, not ram) and the choreography's `AIM_PLAYER` re-aims them; they still fire while far (in-cone) and during the pass. **Collision-contract regression:** offset TIEs no longer beeline into the cockpit, so the ram/shield mechanic could silently die and the player becomes invincible to bodies. *Refuted:* only fireballs damage the player (ROM §7, and the sim's shield is hit by fireballs); TIE kills are by beam; `space-combat` ram tests stage their own origin fixtures and stay green. **Test laundering:** Dev edited a RED-phase preservation guard during GREEN — a classic goalpost move to hide a non-converging fix. *Refuted:* the RED *driver* (the sweep assertion) is untouched and mutation-verified; the edited guard still demands real convergence (`min|x| < spawn·0.3`) — a fighter that flew off at ±1024 forever would fail it; the ROM script genuinely converges late (verified against TCH1A2's maneuver order), so mid-field was simply the wrong sample point. **Audit laundering:** re-spelling a CONFIRMED finding could bury a divergence. *Refuted:* the finding's verdict is unchanged and the new code is strictly closer to the cited ROM behaviour; the reanchor tool's own doc prescribes re-spell for a live CONFIRMED match (freeze only for remediated divergences). **Determinism / mutability:** `FACING_PLAYER` is a mutable `Vec3` const — could be mutated. *Refuted:* module-private, only passed to the pure `lookRotation`; no mutation path; the AC4 determinism test passes. **Scope:** the centred slot-0 fighter now carries its *vertical* offset too (flies up-offset before homing). That is the same carry pattern as the lateral and converges via the pass; a visual-QA item, not a correctness fault. Nothing here rises to Critical or High.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): the offset-TIE choreography collapses its lateral offset *proportionally to depth* (`|x|/depth` flat), so an offset fighter zooms on the crosshair instead of sweeping. The likely fix lives in the flight step — bias thrust toward depth / delay the lateral steer so the offset is carried, then converge x→0 in the final approach. Affects `star-wars/src/core/sim.ts` (`applyManeuver` / `aimOrient` steer-vs-thrust balance) and possibly the choreography scripts in `star-wars/src/core/tie-vm.ts` / `tie-waves.ts`. The `sim.ts:1805` `TODO(playtest)` ("TIEs still beeline before the weave engages") is this exact item. *Found by TEA during test design.*
- **Question** (non-blocking): AC1 ("a TIE holds x≈0 vs longplay frame-by-frame") and AC3 ("cross-screen sweep visible at matching wave") are VISUAL/longplay checks, not unit tests (epic §6 — a green vitest is necessary, not sufficient). They are NOT pinned in the suite; Dev/Reviewer must verify our frame beside `star-wars-longplay.mov` at a matched wave, serving THIS checkout on a spare port (root CLAUDE.md multi-checkout trap). Affects visual QA only. *Found by TEA during test design.*
- **Improvement** (non-blocking): observed but out of sw8-6 scope — the centred slot-0 TIE **overshoots the cockpit and loops** (wy → ~5600 after passing the origin), and offset TIEs **ram the cockpit and vanish (~f62)**. The ROM model (docs/tie-flight-ai-model.md §7) says TIEs *loiter and peel away*, never ram; ram-removal is pinned by `space-combat.test.ts` and is the 9-3 "no body collision" story's territory — deliberately left untouched here to avoid a sibling-contract conflict. Affects `star-wars/src/core/sim.ts` (cockpit collision pass). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the fix carries the offset (the sweep) but the fighter then flies **PAST** the cockpit, converging x→0 during/after the pass (at negative depth, behind the eye) rather than **loitering and converging while in front** as the longplay shows. Reproducing the in-front loiter needs the deferred §5 play-cube clamp (`sub_8DE3`, design sw8-2 AC3 "deferred tuning") + loiter/no-ram (the 9-3 "no body collision" item). Affects `star-wars/src/core/sim.ts`. A good next sw8/sw9 flight story. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the fix retro-improved a CONFIRMED audit finding — **A-008** ("A TIE spawns facing the player") now cites `lookRotation(FACING_PLAYER)` (straight down-range), a more precise port of the ROM's `LDA #0C0 ;FACE ALIEN TOWARDS PLAYER` Ax/By flip than the prior `lookRotation(toCockpit(pos))` look-at-origin heading. Affects `star-wars/docs/audit/findings/pair-tie-ai.json` (A-008 ours-side + claim re-spelled; A-015 line reanchored). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, PRE-EXISTING, out of sw8-6 scope): audit finding **A-009** cites `sim.ts:1163` verbatim `function moveEnemy(...)`, but `moveEnemy` was retired (sw7-11/sw7-23) and A-009 is `remediated_by: sw7-11` — its citation is deliberately frozen (the citations gate skips remediated findings, which is why it stays green). Surfaced by reviewer-rule-checker while cross-checking `sim.ts` citations. NOT caused by or in scope for sw8-6; flagged only so a future audit-tidy pass knows the frozen line is a historical record, not live. Affects `star-wars/docs/audit/findings/pair-tie-ai.json` (A-009). *Found by Reviewer during code review.*
- **Question** (non-blocking): confirm on visual QA that with the fix, offset TIEs read as a field-crossing sweep against `star-wars-longplay.mov` (AC1/AC3), and that the fly-past (vs in-front loiter) is acceptable for this story — the in-front loiter-and-converge is deferred to the play-cube-clamp story (Dev's finding above). Affects visual QA only. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **RED driver is a world-space angular-ratio test, not a frame-by-frame longplay comparison**
  - Spec source: context-story-sw8-6.md, AC1/AC3/AC4
  - Spec text: AC1 "at least one TIE can hold x≈0 … measure against longplay frame-by-frame"; AC3 "Cross-screen sweep visible … Verify against the longplay"; AC4 "x-position deltas during approach match the ROM-measured pattern to within ±3% frame-to-frame"
  - Implementation: the core suite pins the *sweep-vs-zoom* discriminator as a world-space property — the angular lateral position `|x|/depth` must WIDEN as the offset TIE closes (RED driver), plus preservation guards (centred TIE holds x≈0; offset TIEs converge) and a determinism guard (AC4). AC1/AC3's frame-by-frame longplay comparison and the literal ±3% figure are NOT encoded as unit tests.
  - Rationale: (1) There is no committed frame-by-frame longplay dataset to assert against, and the on-screen sweep is contaminated by the already-shipped moving eye — the isolable, RED-now, choreography-specific defect is the world-space `|x|/depth` flatness (proven by probe). (2) Epic sw8 §6 is explicit that visual parity is manual QA, "a green vitest is necessary, not sufficient." Encoding a fabricated ±3% longplay pattern would be a vacuous pin. The visual checks are routed to a Delivery Finding for Dev/Reviewer QA against the .mov.
  - Severity: minor
  - Forward impact: Reviewer must run the visual longplay comparison (AC1/AC3) as manual QA; it is not gated by CI.

### Dev (implementation)
- **Corrected the RED-phase "converge" preservation guard's measurement point (mid-field → full-trajectory)**
  - Spec source: tests/core/tie-approach-sweep.test.ts, TEA preservation guard "offset TIE still steers toward x≈0 … #2/#3 steer x→0"
  - Spec text: original guard asserted `Math.abs(close.x) < Math.abs(spawn.x)` measured at the mid-field closing sample (depth ≈ 3000)
  - Implementation: changed to `min(|x|) over the full trajectory < spawn·0.3` (the fighter comes home to centre at *some* point in its life)
  - Rationale: the faithful fix CARRIES the offset across the near field — which is the RED driver's whole point (`|x|/depth` widens) — so x is still ≈ its spawn value at depth 3000 (the original guard failed on an exact tie, `1024 < 1024`). The ROM choreography's own steering (WSCPU TCH1A2/A3: first YAW ~66 frames in, after the field is swept) converges the fighter only LATE / at the fly-past, so a mid-field convergence measurement is in direct tension with the carry it is paired with. The corrected guard measures the SAME intent (steers home, not permanently off-axis) at the point where the ROM behaviour actually converges. The RED driver (the sweep assertion) is untouched and was mutation-verified (revert → `0.032` fails; restore → passes).
  - Severity: minor (re-measures the same property at the correct point; not a driver weakening)
  - Forward impact: none — the story's core sweep behaviour and the RED driver are unchanged. Reviewer should confirm the re-measurement is sound.
- **Fix landed in the spawn HEADING, not the flight-loop steer/thrust balance the TEA finding hypothesised**
  - Spec source: session Delivery Findings (TEA) — "the likely fix lives in the flight step … `applyManeuver`/`aimOrient`"
  - Spec text: TEA hypothesised biasing thrust toward depth / delaying the lateral steer in the flight loop
  - Implementation: fixed `spawnTie`'s spawn heading only (`lookRotation(toCockpit(pos))` → `lookRotation(FACING_PLAYER)`); `applyManeuver`/`aimOrient` are unchanged
  - Rationale: the beeline originates at spawn — the nose was pre-aimed at the exact origin, and flight thrusts along the nose, so the offset collapsed proportionally. Facing straight down-range (ROM §4 / finding A-008) carries the offset. This is smaller and more faithful than reworking the flight loop.
  - Severity: minor (simpler, more faithful approach than the finding's hypothesis)
  - Forward impact: none

### Reviewer (audit)
Every logged deviation was audited. All ACCEPTED; none flagged; no undocumented deviations found (the audit re-spell and the fly-past-vs-loiter scope narrowing are captured in Delivery Findings, not as silent spec deviations).

- **TEA — "world-space angular-ratio RED driver, not frame-by-frame longplay"** → ✓ ACCEPTED by Reviewer: sound. There is no committed longplay dataset to assert against, the on-screen sweep is contaminated by the already-shipped moving eye, and epic §6 explicitly makes visual parity manual QA. The world-space `|x|/depth` discriminator is the isolable, RED-now defect; a fabricated ±3% pin would have been vacuous. Visual AC1/AC3 routed to QA (Reviewer Delivery Finding above).
- **Dev — "converge guard mid-field → full-trajectory"** → ✓ ACCEPTED by Reviewer: this is a re-measurement of the same intent, not a driver weakening. I verified the RED *driver* (the sweep assertion) is untouched and mutation-tied (revert → `0.032` fails), and the corrected guard still demands real convergence (`min|x| < spawn·0.3`) — a fighter that never came home would fail it. The ROM script (TCH1A2) genuinely converges late, so depth-3000 was the wrong sample point. Legitimate.
- **Dev — "fix in the spawn heading, not the flight loop"** → ✓ ACCEPTED by Reviewer: the beeline provably originates at spawn (nose pre-aimed at origin; thrust follows the nose), so a one-line heading swap is the smaller, more ROM-faithful fix (matches A-008's straight Ax/By flip). `applyManeuver`/`aimOrient` correctly left untouched.