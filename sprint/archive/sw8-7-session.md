---
story_id: "sw8-7"
jira_key: "sw8-7"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-7: TIE spawn cadence + on-screen density

## Story Details
- **ID:** sw8-7
- **Jira Key:** sw8-7
- **Repos:** star-wars
- **Branch:** fix/sw8-7-tie-spawn-cadence
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T01:10:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T00:23:15Z | 2026-07-27T00:24:52Z | 1m 37s |
| red | 2026-07-27T00:24:52Z | 2026-07-27T00:51:51Z | 26m 59s |
| green | 2026-07-27T00:51:51Z | 2026-07-27T01:04:04Z | 12m 13s |
| review | 2026-07-27T01:04:04Z | 2026-07-27T01:10:04Z | 6m |
| finish | 2026-07-27T01:10:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the ROM's past-plan TIE supply loops the set's LAST group (TWV2Z, 18 entries incl. the ±2048 corners) — ADASHP clamps `WV.LVL` and RESTARTS the loop pointer (WSCPU.MAC:1058-1090) — while our fallback invents a single '1A1' mook. Latent under the 6-kill quota (wave-1 plan = 27 entries vs ≤9 spawns). Affects `star-wars/src/core/sim.ts` (`spawnTie` past-plan fallback should walk TWV2Z). **Filed as sw8-10.** *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM's space phase END is TIME-boxed — PHESP1 advances to PH$SP2 on the PH.TIM music schedule (WSMAIN.MAC:1420-1448), with an endless TIE supply; our `SPACE_WAVE_QUOTA = 6` kill gate is the "unrecovered number" its own comment anticipates (state.ts:875-882). Affects `star-wars/src/core/state.ts` (quota vs timed phase). **Filed as sw8-11.** *Found by TEA during test design.*
- **Conflict** (non-blocking): `SPAWN_INTERVAL_FLOOR = 0.3` (gameRules.ts:183) will clamp a zeroed re-arm back to 0.3 s if Dev routes the new cadence through `waveParams.spawnInterval` — the refill RED would stay red. The floor exists only for the invented ramp and should retire with it. Affects `star-wars/src/core/gameRules.ts` (drop the spawnInterval axis or bypass the floor). *Found by TEA during test design.*
- **Question** (non-blocking): the RED contract deploys the opening group over ≤3 ticks (~50 ms) rather than the ROM's literal frame-0 NWNSHP fill, to keep `initialState` a neutral fixture base (see Design Deviations). Visual QA vs `star-wars-longplay.mov` (epic §6, manual) should confirm the opening swirl reads right. Affects visual QA only. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the fix retro-improved two audit findings — **A-004** (CONFIRMED) reasoning re-spelled: its "refill trigger differs (ours: on a spawnInterval timer)" disclaimer is now false, both the 3-slot ceiling AND the immediate refill match the ROM; **A-013** (DIVERGENCE, accepted) claim re-spelled: the scalar ramp's spawnInterval axis is retired (enemySpeed went in sw7-23), leaving only the enemyFireInterval ramp as the accepted stand-in. 39 citations re-anchored across pair files (pure line shifts, 0 lost). Affects `star-wars/docs/audit/findings/*.json`. *Found by Dev during implementation.*
- **Gap** (non-blocking): two ram-collision fixtures (`space-combat.test.ts` "costs a life and is removed", `tie-flight.test.ts` "still costs a shield and is removed") staged an unparked spawner and their `toHaveLength(0)` misread the legitimate next-step replacement as "the rammer survived" — a fixture class TEA's park sweep missed because they set neither `spawnTimer` nor `SPAWN_INTERVAL`. Both now park (`spawnTimer: 1e9`); assertions untouched. Future cadence stories should grep for `enemies: [` fixtures asserting counts, not just timer keys. Affects `star-wars/tests/core/space-combat.test.ts`, `star-wars/tests/core/tie-flight.test.ts` (done in this story). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the walk-continuation guard pins the newcomer at plan entry 3 ('1B1'), whose lateral (0, +1024) is IDENTICAL to entry 0's ('1A1') — so a walk-reset mutation passes it and is caught only by `darth-vader-enemy-rom.test.ts` (fleet coverage mutation-verified this review). Staging `spawnCount: 9` (entry 9 = '1D1', lateral −2048, unique in the table) would make the guard self-sufficient. Natural home: **sw8-10** (the TSPWAV tail-loop story already touches this walk). Affects `star-wars/tests/core/tie-spawn-cadence.test.ts` (guard staging index). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Onset pinned as "full density within 3 ticks", with `initialState`/`enterPhase` staying enemy-empty**
  - Spec source: WSCPU.MAC:969 (NWNSHP) via the story title's "onset"
  - Spec text: PHISP1 → IPGEN → NWNSHP constructs all three aliens at phase INIT — frame-0 fill
  - Implementation: tests accept deployment through stepGame across the first 3 ticks (≤ 50 ms); the state at rest stays empty
  - Rationale: ~30 sibling suites stage scenes as `{ ...initialState(seed), enemies: [hero] }`; a pre-filled state would leak ghost mooks into any fixture that forgets to override. The ≤2-frame observable difference is imperceptible against the cabinet
  - Severity: minor
  - Forward impact: visual QA (epic §6) confirms the opening swirl; none on siblings
- **`spawnTimer` kept as state, with "positive parks" as a contracted seam (no ROM counterpart)**
  - Spec source: WSMAIN.MAC:1450-1454 (the ROM has no spawn timer at all)
  - Spec text: every PHESP1 frame tops the slots up — no countdown exists in the cabinet
  - Implementation: the RED contract requires `spawnTimer > 0` to keep parking the spawner; the ROM cadence is the degenerate countdown (seeded 0, re-armed 0)
  - Rationale: `spawnTimer: 1e9` is the fleet's quiet-sky fixture idiom (15 files); deleting the field would flood every parked fixture with mooks — the tp1-6 "silence the legacy mechanism" lesson in reverse
  - Severity: minor
  - Forward impact: Dev must express the cadence via seed/re-arm values, not by removing the countdown
- **Retired the invented spawnInterval ramp pins from four sibling suites (goalpost move, TEA-owned)**
  - Spec source: story title ("rule the ROM TSPWAV spawn schedule … vs ours")
  - Spec text: the ROM has no per-wave spawn interval — density is a constant three slots
  - Implementation: dropped `spawnInterval` assertions/mirror fields from difficulty.test.ts, tie-wave-ramp.test.ts, tie-flight-cleanup.test.ts; deleted framing.test.ts's two timed-rearm tests (contract moved to tie-spawn-cadence.test.ts)
  - Rationale: those pins were green-now-DOOMED — they'd redden in GREEN and Dev cannot move goalposts (tp1-7 lesson); the surviving fire-cadence axes stay pinned
  - Severity: minor
  - Forward impact: the wave-difficulty story is now fire-cadence + concurrency only
- **Decoupled `SPAWN_INTERVAL` dt-units in three suites to literal seconds**
  - Spec source: (test infrastructure; no ROM spec)
  - Spec text: n/a — step sizes like `SPAWN_INTERVAL / 4` were arbitrary time quanta
  - Implementation: space-combat/tie-orientation/tie-flight step with literals (0.375 etc.), byte-identical behavior today
  - Rationale: if Dev zeroes or retires the constant, `SPAWN_INTERVAL / 4` becomes dt = 0 and motion assertions die in GREEN as false collateral
  - Severity: minor
  - Forward impact: Dev may retire SPAWN_INTERVAL freely; no suite references it as a duration any more

### Dev (implementation)
- **Parked the spawner in two pre-existing ram-collision fixtures (test edit during GREEN)**
  - Spec source: session file, TEA contract ("a positive `spawnTimer` still PARKS the spawner — the fleet's fixture idiom")
  - Spec text: "the ROM cadence is the degenerate countdown: seeded 0, re-armed 0; positive values park"
  - Implementation: added `spawnTimer: 1e9` to the two fixtures whose `toHaveLength(0)` read the instant replacement as a surviving rammer; their assertions and intent (ram costs a shield, rammer removed) are byte-untouched
  - Rationale: the old 1.5 s seed masked the missing park; under the ROM cadence the replacement is CORRECT behavior — the staging, not the contract, was stale. Uses exactly the park lever the RED contract preserves
  - Severity: minor
  - Forward impact: none — the fixtures now state their quiet-sky assumption explicitly

### Reviewer (audit)
- TEA "Onset pinned as full density within 3 ticks / initialState stays empty" → ✓ ACCEPTED by Reviewer: the fixture-base argument is load-bearing (~30 suites spread initialState); the ≤2-frame gap from a literal frame-0 fill is unobservable, and the visual-QA question is filed.
- TEA "`spawnTimer` kept with positive-parks contract" → ✓ ACCEPTED by Reviewer: the degenerate-countdown reading is honest (seed 0 / re-arm 0 IS the ROM cadence observably), and mutation m4 (park condition removed) proves the park guard bites.
- TEA "Retired the invented spawnInterval ramp pins from four suites" → ✓ ACCEPTED by Reviewer: the ROM has no spawn interval to ramp (verified firsthand — the supply path has no timer between WSMAIN.MAC:1450-1454 and ADASHP); the fire-cadence and concurrency pins survive untouched in the same files, so difficulty coverage did not thin.
- TEA "Decoupled SPAWN_INTERVAL dt-units to literal seconds" → ✓ ACCEPTED by Reviewer: byte-identical step sizes today; exactly what let Dev retire the constant with zero collateral.
- Dev "Parked the spawner in two ram-collision fixtures" → ✓ ACCEPTED by Reviewer: verified via `git show 7227846` that ONLY `spawnTimer: 1e9` + a comment were added — assertions byte-identical; the replacement those fixtures were misreading is correct post-fix behavior.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 report inaccuracy, see note) | N/A — clean; its "findings JSON: re-anchors only, no content changes" line is WRONG (A-004/A-013 were re-spelled) — challenged and re-verified myself, re-spells are honest and verdict-preserving |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the 7-mutation battery (park/batch/cap/walk boundary mutations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — diff has no error paths, catches, or fallbacks; the one silent-degradation risk (floor clamping 0 → 0.3) was pre-flagged by TEA and the floor is deleted |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer assessed: mutation battery 6/7 in-file + 1 fleet-covered; one degenerate discriminator found (LOW, observation 7) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer verified every new comment's ROM citation against the quarry read during RED (WSMAIN.MAC:1450-1454/:1376-1377/:502, WSCPU.MAC:969, WSGLOB.MAC:589) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — diff removes a field/constant; no casts, no `as any`, mirrors updated by deletion (tsc + build clean) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no input handling, no secrets, pure-core constants; spawner consumes no user input (data-flow trace below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — the change is a net DELETION (constant, floor, ramp axis); nothing left to simplify |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — Reviewer enumerated lang-review/typescript.md #1-#13 over the diff (Rule Compliance below): 0 violations |

**All received:** Yes (1 enabled returned clean; 8 disabled pre-filled and their domains covered by Reviewer)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Sm Assessment

**Story:** sw8-7 — 3pt p2 bug, star-wars, TDD workflow. ROM-fidelity: our TIE dogfight
puts up only 3 fighters (capped) with first spawn ~1.6s in; the cabinet is a swirl. Scope
is to rule the ROM TSPWAV spawn schedule/count/onset against ours and match on-screen density.

**Setup outcome:**
- Session file created; story context at `sprint/context/context-story-sw8-7.md`, epic
  context at `sprint/context/context-epic-sw8.md` (both validated by sm-setup).
- Feature branch `fix/sw8-7-tie-spawn-cadence` created from star-wars `origin/develop`
  (gitflow; PR will target develop).
- Race check clean: no sw8-7 commits or branches on star-wars origin from sibling checkouts.
- No Jira in this project — jira_key is the story id; claim skipped by design.

**Routing:** Phased tdd → RED phase, owner **tea** (O'Brien). TEA should ground the spawn
schedule in the 1983 source (`/Users/slabgorb/Projects/star-wars-1983-source-text`, grep
TSPWAV — human-named WS*.MAC symbols beat the disassembly) and check `sprint/archive/` for
prior sw8-* sessions whose Delivery Findings may pre-extract the quarry. Radix trap: several
ROM sources are `.RADIX 16` — verify before reading constants as decimal.

**Risks/notes for downstream:** The "3 fighters / ~1.6s" numbers in the title are the
reporter's observation, not verified ground truth — TEA should re-derive both sides
(ROM table and our sim constants) before pinning tests to them.

## TEA Assessment

**Tests Required:** Yes

**The ruling (epic sw8 §3 — rule before fix): BUG, a timing-mechanism fidelity divergence.**
Both sides re-derived from primary source:
- **ROM:** THREE alien slots exactly (`A$EQ ==3`, WSGLOB.MAC:589-590 — so the title's "capped
  at 3" is AUTHENTIC, not the bug). Onset is frame zero: space init `PHISP1 → JSR IPGEN`
  (WSMAIN.MAC:1376-1377) reaches `JSR NWNSHP` (WSMAIN.MAC:502), and NWNSHP (WSCPU.MAC:969)
  constructs a ship into EVERY slot before the first flight frame. Refill is next-frame:
  every PHESP1 frame runs `LDA WV.LIV / CMPA #03 / IFLO / JSR ADASHP` (WSMAIN.MAC:1450-1454);
  a death runs `CPUGON:: DEC WV.LIV` (WSCPU.MAC:813-818), so ADASHP (WSCPU.MAC:1058)
  constructs the next TSPWAV plan entry into the freed slot ONE frame later — no timer
  anywhere in the supply path.
- **Ours:** an invented `SPAWN_INTERVAL = 1.5` countdown (state.ts:267), seeded at phase entry
  (sim.ts enterPhase :1769) and re-armed per spawn via a ramped `waveParams.spawnInterval`
  (gameRules.ts:220) — empty sky to ~1.5 s (title said ~1.6 s: confirmed, it is the seed),
  full density only at ~4.5 s, refills that idle out the countdown. The TSPWAV composition
  itself was already faithfully ported (sw7-12, tie-waves.ts) — only the TIMING is divergent.

**Acceptance criteria (TEA-defined; the context stub had none):**
- AC1 — a fresh space wave reaches full density (WAVE_SIZE = 3) within the first 3 ticks,
  all fighters entering at the far spawn horizon.
- AC2 — a wave-transition space entry (`enterPhase`) opens the same way (no re-seeded delay).
- AC3 — a loss is refilled on the very NEXT step, continuing the spawnCount/TSPWAV walk.
- AC4 — a double loss refills ONE per step (the ADASHP once-per-frame cadence), never a batch.
- AC5 (seams, green-both guards) — the refill never restarts the plan walk; density never
  exceeds the three ROM slots; a positive `spawnTimer` still PARKS the spawner (the fleet's
  `1e9` fixture idiom, 15 files).

**Test Files:**
- `star-wars/tests/core/tie-spawn-cadence.test.ts` — NEW: 4 RED drivers + 3 seam guards,
  full ROM citation header.
- Re-seats (all green today, deviations logged): `framing.test.ts` (2 timed-rearm tests
  retired), `difficulty.test.ts` + `tie-wave-ramp.test.ts` + `tie-flight-cleanup.test.ts`
  (invented spawnInterval-ramp pins dropped; fire axes kept), `space-combat.test.ts` +
  `tie-orientation.test.ts` + `tie-flight.test.ts` (SPAWN_INTERVAL dt-units → literals;
  empty-sky test re-scoped to the state-at-rest contract).

**Tests Written:** 7 tests covering 5 ACs (plus 8 files touched total)
**Status:** RED (4 failing for the right reasons — verified by testing-runner: 181 files /
1901 tests, 4 failed all in tie-spawn-cadence.test.ts, NO collateral, `tsc --noEmit` clean;
totals cross-checked against the known suite size, not narrowed). Commit `dc3ce78` on
`fix/sw8-7-tie-spawn-cadence`.

**GREEN-ability verified by construction:** the minimal faithful fix — seed the space arm of
`spawnTimer` to 0 and re-arm to 0 (dropping the ramp/floor for spawn) — satisfies all 7;
a literal NWNSHP-style frame-0 fill also passes everything except it must keep
`initialState` empty at rest (the contracted fixture seam). Dev traps flagged as findings:
`SPAWN_INTERVAL_FLOOR` would clamp a zeroed re-arm back to 0.3 s.

### Rule Coverage

| Rule | Test(s) / evidence | Status |
|------|--------------------|--------|
| core-purity (dt-only time, seeded RNG) | all 7 tests drive the public `stepGame` with fixed seeds + literal dt; spawn path stays RNG-free (`spawnTie` draws none) | enforced |
| ts #1 type-safety escapes | new suite uses NO `as any`/`as unknown as` mirrors (every referenced export exists today) | clean |
| ts #2 readonly params | fixture helper takes a `readonly` tuple; no mutation of staged state (spread-only) | clean |
| ts #4 `??` vs `\|\|` | n/a in diff (no defaulting logic added) | n/a |
| test-quality (no vacuous asserts) | every negative (park test) is paired with a positive staging bound (`deployed()` asserts full density loudly); self-check done — no `let _`, no always-true asserts | clean |

**Rules checked:** 5 of 5 applicable lang-review/project rules have coverage or a clean-scan verdict
**Self-check:** 0 vacuous tests found; all 4 REDs audited for right-reason failure messages

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**The fix (minimal, the shape TEA's contract anticipated):** the ROM cadence is the degenerate
countdown — seeded 0, re-armed 0 — so the whole invented timer mechanism dissolves while the
countdown survives as the fixtures' park lever:
- `src/core/state.ts` — `SPAWN_INTERVAL` RETIRED (comment records the ROM ruling);
  `initialState` seeds `spawnTimer: 0`.
- `src/core/sim.ts` — the spawn block re-arms at 0 (comment cites WSMAIN.MAC:1450-1454);
  `enterPhase`'s space arm seeds 0 (comment cites PHISP1 → IPGEN → NWNSHP); `SPAWN_INTERVAL`
  import dropped. The `spawnTimer <= 0 && length < WAVE_SIZE` gate and one-construct-per-step
  shape are UNCHANGED — that is what makes park (positive timer) and the ADASHP cadence hold.
- `src/core/gameRules.ts` — `WaveParams.spawnInterval`, `SPAWN_INTERVAL_FLOOR` and the ramp's
  spawn entry removed (TEA's floor-trap finding confirmed: routing 0 through the floor would
  have clamped it to 0.3 and kept the refill RED); header comment updated.
- `tests/core/space-combat.test.ts`, `tests/core/tie-flight.test.ts` — two ram-collision
  fixtures now park the spawner (deviation logged; assertions untouched).
- `docs/audit/findings/*.json` — 39 citations re-anchored (0 lost); A-004/A-013 re-spelled
  honestly (see Delivery Findings).

**Tests:** 1901/1901 passing (GREEN), 181 files, full run (not narrowed); `tsc --noEmit` clean;
`npm run build` clean. **Mutation-verified:** restoring the 1.5 s seed/re-arm reddens exactly
the 4 RED drivers (guards stay green); restored to 7/7.

**Branch:** `fix/sw8-7-tie-spawn-cadence` (pushed; commits `dc3ce78` RED, `7227846` GREEN)

**Handoff:** To the Thought Police (Reviewer) for code review — this tdd workflow routes green → review directly (no verify phase).

## Reviewer Assessment

**Verdict:** APPROVED

**What shipped:** the invented `SPAWN_INTERVAL = 1.5` countdown is retired; the space spawner
seeds and re-arms `spawnTimer` at 0 (initialState, enterPhase's space arm, the spawn block),
one construct per step, with positive values still parking — plus the `waveParams.spawnInterval`
ramp axis and its floor deleted. Net −: three core files touched, all with ROM citations.

**Data flow traced:** `Input` never reaches the spawner — `stepGame(state, input, dt)`'s spawn
block reads only `state.spawnTimer − dt`, `movedEnemies.length` vs `WAVE_SIZE`, and
`state.spawnCount` → `spawnTie(rng, spawnCount, wave−1)` → `SPAWN_LATERALS[i % 12]` +
`waveSpawnPlan` → `Enemy` pushed → collision/render consume. No RNG draw (`_rng` unused in
`spawnTie`), no clock, no input — determinism preserved (space-combat determinism suite green,
and the whole path is seed-pure). Safe because nothing user-controlled or wall-clock-derived
enters the cadence.

**Pattern observed:** good — "retire the mechanism, keep the seam": the countdown survives
solely as the fixtures' park lever (sim.ts spawn block comment), exactly the tp1-6-family
discipline of not stranding sibling fixtures; and every constant deletion carries the ROM
citation at the deletion site (state.ts SPAWN_INTERVAL tombstone comment).

**Error handling:** N/A in diff — no fallible calls, no catches; the one silent-degradation
hazard (the 0.3 s floor clamping the new 0 back up) was pre-flagged by TEA and is DELETED, not
bypassed (gameRules.ts — `SPAWN_INTERVAL_FLOOR` gone with the axis).

### Rule Compliance (lang-review/typescript.md #1-#13 + star-wars core-purity)

| # | Rule | Instances in diff | Verdict |
|---|------|-------------------|---------|
| 1 | Type-safety escapes (`as any`, `as unknown as`, `!`, ts-ignore) | new test file + 3 core files | ✓ none added; new suite needed no module mirror (all exports exist) |
| 2 | Generic/interface pitfalls (readonly, Partial, Record) | `WaveParams` field removal; `tie()` helper | ✓ removal-only; helper takes a `readonly` tuple |
| 3 | Enum anti-patterns | — | ✓ no enums in diff |
| 4 | `??` vs `\|\|` / null handling | `entry?.shape ?? 'TIE'` (pre-existing, untouched) | ✓ no new defaulting |
| 5 | Module/declaration issues | 3 import-list deletions | ✓ tsc + isolatedModules-mode build clean |
| 6 | React/JSX | — | ✓ n/a |
| 7 | Async/Promise | — | ✓ none in diff |
| 8 | Test quality (`as any` in asserts, mock drift, dist imports) | tie-spawn-cadence.test.ts + 7 re-seated suites | ✓ clean; mirror-interface fields DELETED (less drift surface, not more) |
| 9 | Build/config | — | ✓ untouched |
| 10 | Type-level input validation | — | ✓ no user input in diff |
| 11 | Error handling types | — | ✓ no catches in diff |
| 12 | Performance/bundle | — | ✓ constant deletions only |
| 13 | Fix-introduced regressions (meta) | the whole GREEN diff re-scanned | ✓ no `as any`/`\|\|`-defaults introduced |
| 14 | core-purity (dt-only time, seeded RNG, no DOM) | state.ts/sim.ts/gameRules.ts edits | ✓ constants + comments only; core-purity.test.ts green |

### Observations

1. `[VERIFIED]` The ROM citations on every new comment are real and support the semantics —
   I read the quarry lines firsthand this session: `LDA WV.LIV / CMPA #03 ;3 ALIENS ALIVE? /
   IFLO / JSR ADASHP` (WSMAIN.MAC:1450-1454, inside PHESP1), `PHISP1: JSR IPGEN`
   (WSMAIN.MAC:1376-1377) reaching `JSR NWNSHP` (:502), `NWNSHP::` (WSCPU.MAC:969),
   `A$EQ ==3 ;# OF ALIEN RECORDS IN SEQUENCE` (WSGLOB.MAC:589). Complies with the repo's
   cite-the-mechanism convention.
2. `[VERIFIED]` Mutation battery — all seven load-bearing behaviors bite a test: seed→1.5
   (1 red), enterPhase arm→1.5 (1 red), re-arm→1.5 (4 red), park-gate removed (1 red),
   batch-refill while-loop (2 red), cap+1 (1 red), walk-reset→0 (0 red IN-FILE but 1 red in
   `darth-vader-enemy-rom.test.ts` — fleet coverage confirmed by running it). Restored clean
   after each; final tree green 1901/1901.
3. `[VERIFIED]` The GREEN commit never touched the RED drivers — `git show 7227846 --stat`
   lists no `tie-spawn-cadence.test.ts`; the two sibling test edits add ONLY `spawnTimer: 1e9`
   + comment (assertions byte-identical, diff inspected line-by-line).
4. `[VERIFIED]` Audit findings edit is honest, not laundering — A-004 stays CONFIRMED and its
   re-spelled reasoning ("refill now immediate") is TRUE under the new code (mutation m3 proves
   the refill is timer-free); A-013 stays DIVERGENCE/accept with the surviving fire-ramp
   correctly described; 39 re-anchors, 0 lost; citations suite green. (Preflight's "no content
   changes" line was wrong — challenged, re-read the JSON diff myself.)
5. `[VERIFIED]` The surface phase is untouched in behavior: `TURRET_SPAWN_INTERVAL` arm intact
   in enterPhase (sim.ts), and `initialState`'s new 0 seed only affects states used as-built
   (space); `surface.test.ts` green, and surface fixtures reach the phase via enterPhase which
   re-seeds. The old initialState seed (1.5) equalled TURRET_SPAWN_INTERVAL only by coincidence.
6. `[MEDIUM — accepted behavior note, not a defect]` Refill cadence is per-stepGame-CALL, not
   per fixed sim tick: calling `stepGame(s, i, 2×dt)` once vs `dt` twice yields one vs two
   spawns. This granularity dependence PRE-EXISTS (the old timer had the same single-spawn-
   per-call shape near expiry) and the shell drives a fixed-timestep loop, so it is unobservable
   in production; noted for anyone driving the sim with irregular dts.
7. `[LOW] [TEST]` The walk-continuation guard's discriminator is degenerate: plan entries 0
   ('1A1') and 3 ('1B1') share the lateral (0, +1024), so mutation m7 (walk reset to entry 0)
   passes that guard; the Darth-schedule suite catches it instead. A future edit could stage
   `spawnCount: 9` (entry 9 = 1D1, lateral −2048 — unique) to make the guard self-sufficient.
   Non-blocking: fleet coverage exists and was mutation-verified.

### Devil's Advocate

Argue this is broken. **"The empty first frame is a lie":** the cabinet shows three fighters on
frame zero; ours shows zero enemies for up to two rAF frames (~33 ms). Could a player see the
difference? No — at 60 fps the third fighter exists by ~50 ms, under one perceptible frame of
the 24 fps longplay reference; and TEA filed the visual-QA question rather than burying it.
**"The park lever is an invented mechanic wearing ROM clothes":** true — the ROM has no
countdown at all, and we kept one. But its live range is exactly {0} in production (both seeds
and the re-arm), so the shipped cadence is byte-equivalent to timer-free; the positive range is
reachable only by test fixture injection. The alternative (deleting the field) breaks 15 suites
for zero fidelity gain. **"Dev relaxed sibling tests to sneak the fix through":** the dropped
assertions are precisely the ones pinning the INVENTED ramp (each logged as a deviation and
each refuted by the primary source I read myself), the fire-cadence and concurrency pins in the
same files survive, and the two fixture edits changed staging only — verified byte-level.
**"Instant refill makes the game unwinnably hard":** the kill quota is 6 and refills were
already guaranteed — the timer only added dead air between engagements; fire pressure is
governed by the untouched TGPROB gate (mask/threshold/concurrency), so incoming-fire volume per
second is unchanged at wave 1 (cap 1 fireball). **"The wave now never thins, so SPACE_WAVE_QUOTA
runs faster and shortens the phase below the music schedule":** real, but that is the
pre-existing quota-vs-time-box divergence, now honestly filed as sw8-11 rather than hidden
behind an invented spawn drought. Nothing here rises to Critical or High.

**Severity table:**

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [LOW] | Walk-continuation guard's lateral discriminator degenerate (entries 0/3 collide) | tests/core/tie-spawn-cadence.test.ts (seam-guard describe) | Non-blocking; fleet-covered by darth-vader-enemy-rom.test.ts (mutation-verified); improvement noted in Delivery Findings |

**Handoff:** To Winston Smith (SM) for finish-story.

## Impact Summary

**Story sw8-7 (3pt, p2, bug, star-wars) — DELIVERED.** PR **#128** squash-merged to develop
(`03de7e0`, verified `state: MERGED` via `gh pr view`); full suite re-run GREEN on the merged
base (1901/1901, 181 files). Reviewer verdict: **APPROVED**, no Critical/High; one LOW
(test-guard discriminator) routed below.

**What changed:** the invented `SPAWN_INTERVAL = 1.5` spawn countdown is retired for the ROM's
real cadence — the wave opens at full 3-TIE density within the first ticks and every loss is
refilled on the next step (WSMAIN.MAC:1450-1454 `WV.LIV < 3 → ADASHP`; NWNSHP init fill,
WSCPU.MAC:969). The 3-slot cap was ruled AUTHENTIC (`A$EQ==3`) and kept. The per-wave
spawnInterval difficulty ramp + floor are deleted; positive `spawnTimer` still parks the
spawner (fixture seam, mutation-verified).

**Blocking:** 0 blocking items. TEA's one Conflict finding (the 0.3 s floor would clamp the
zeroed re-arm) was RESOLVED IN-STORY — the floor is deleted (gameRules.ts), confirmed by the
refill tests going green.

**Non-blocking findings, all routed:**
- TWV2Z tail-loop supply divergence — **filed as sw8-10** (TEA).
- ROM time-boxed space-phase end vs our kill quota — **filed as sw8-11** (TEA).
- Opening-swirl visual check vs the longplay — **owned by epic sw8 §6 manual visual QA**
  (TEA question; the ≤3-tick onset deviation is Reviewer-ACCEPTED).
- Walk-guard's degenerate lateral discriminator — **routed to sw8-10** (Reviewer; that story
  already reworks the plan-walk tail, fleet coverage exists today via darth-vader-enemy-rom).
- Audit re-spells (A-004/A-013) + 39 re-anchors — **landed in this PR** (Dev).
- Two ram-fixture parks — **landed in this PR** (Dev).

**Deviations:** 5 logged (4 TEA, 1 Dev), ALL ✓ ACCEPTED by Reviewer — none outstanding.