---
story_id: "df4-3"
jira_key: "df4-3"
epic: "df4"
workflow: "tdd"
---
# Story df4-3: Landers + humanoid abduction (the signature loop)

## Story Details
- **ID:** df4-3
- **Jira Key:** df4-3
- **Workflow:** tdd
- **Repos:** .
- **Branch:** feat/df4-3-landers-humanoid-abduction
- **PR:** 498
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T09:48:18Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T23:51:04Z | 2026-08-16T23:54:01Z | 2m 57s |
| red | 2026-08-16T23:54:01Z | 2026-08-17T00:13:43Z | 19m 42s |
| green | 2026-08-17T00:13:43Z | 2026-08-17T09:27:16Z | 9h 13m |
| review | 2026-08-17T09:27:16Z | 2026-08-17T09:48:18Z | 21m 2s |
| finish | 2026-08-17T09:48:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the enemy render blits at `world-x >> 8` with no camera-relative offset, so landers/humanoids do not scroll with the world as the camera moves. Affects `plugins/defender/src/core/scene.ts` (`composeFrame` enemy loops — needs a camera-relative column like the ship, likely in df4-6 the visual playtest or a dedicated render story).
- **Improvement** (non-blocking): the vertical speeds `DESCEND_STEP`/`CARRY_STEP` are df4-3 placeholders; df5's wave logic must supply the authentic `LNDYV` (PHR6.SRC:393) magnitude, and add the AFALL ground outcome (`ALAND`) that df4-3 stubs by clamping at `YMAX`. Affects `plugins/defender/src/core/landers.ts`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Dev (GREEN) — velocity/render MAGNITUDES are df4-3 placeholders; structure is ROM.**
- **What:** `landers.ts` uses fixed step constants (`DESCEND_STEP`/`CARRY_STEP`=2 rows/tick, `HUNT_X_STEP`=$40, `WALK_STEP`=$20) and a `vy>>3` display scale for the AFALL fall, rather than the authentic per-wave speeds.
- **Spec:** the authentic `LNDYV`/`LNDXV`/`LDSTIM` are wave-table RAM (`PHR6.SRC:392-394`), initialised by the df5 wave logic — there is no fixed ROM speed to port at df4-3. The `#8` accel and `$300` cap ARE cited (`DEFB6.SRC:928,930`) and used literally; only the mapping of those 16-bit units into row-space (`>>3`) is chosen.
- **Why:** the same call `laser.ts` makes for its `STEP` — reproduce travel DIRECTION and the grab/carry/fall STRUCTURE now, leave the exact speeds to df5's wave tables. Grab tolerances (`$80`/`12`) are the cited LANDG3 windows (`:766,781`).
- **Render:** enemies blit at `world-x >> 8` (the existing `laser.ts` column convention) with no camera-relative offset yet — a fully camera-relative enemy render is deferred (df4-6 visual / later), matching how the laser render already works.
- **Forward impact:** df4-4 consumes the latched `reachedTop`; df5 replaces the placeholder speeds with the real wave-table values and adds the AFALL ground outcome (`ALAND`) + P250/P500 scoring.

### Reviewer (audit)
- **Dev deviation (placeholder magnitudes + world-x>>8 render)** → ✓ ACCEPTED by Reviewer: sound and disclosed. NARROWED during review, though — two of the "placeholder" values were in fact guesses where the ROM gives exact numbers and were corrected to the authentic cited values (`WALK_TURN_THRESHOLD` 0x20→8 per `CMPA #8` :312; `HUNT_X_STEP` 0x40→0x20 per `LDB #$20` :759). Only `DESCEND_STEP`/`CARRY_STEP` remain genuine placeholders (LNDYV is wave RAM, PHR6.SRC:393, claim EN-15). The `world-x>>8`-without-camera render is accepted as the laser.ts precedent, deferred to df4-6/later — recorded as a delivery finding below.

## Sm Assessment

**Routing:** df4-3 → TEA (RED). Workflow `tdd` (phased): setup → red → green → review → finish.

**Pre-setup verification (all clean):**
- Sibling probes: `git branch -r | grep df4-3` empty before claim; no df4-3 session in any `a-*` checkout (only ml11-3 in a-1, mc12-3 in a-2). Story was free.
- Dependencies `done`: df4-1 (collision — box pre-test only, IC1 pixel stage deferred to when real sprite bitmaps exist) and df4-2 (materialize/explode). Both are consumed by this story.
- Merge gate clean: no open PRs on `slabgorb/arcade`.
- Story `acceptance_criteria` is null. sm-setup correctly DEFERRED ACs to TEA (RED phase) rather than deriving-then-editing — the ROM citations are preserved verbatim in the context Title. TEA defines the ACs as failing tests from the ROM. No AC-diff cleanup was needed.

**Scope fence for TEA/Dev (from the description — encode in RED):**
- Deliver the abduction MECHANIC only: lander grab → carry-to-top → fall-on-carrier-death.
- SCORING (P250/P500, `defender/DEFB6.SRC:408,496-503`) is OUT OF SCOPE — that is df5.
- Enemies are df3 scheduler processes (NEWP, STYPE); no per-enemy tick.
- Colour by df2 palette index only (never an invented hex).
- Reducers live in `plugins/defender/src/core/` (pure sim) — the defender purity/core-boundary scan enforces this.

**Story's own first deliverable:** map the ROM labels to arcade enemy names in the dossier, CITED, before naming the reducer — LANDS0 lander process (`DEFB6.SRC:649,657`), LANDER KIDNAP grab (`:688`), ASTRONAUT humanoid process (`:290`), shot-carrier → AFALL falling-humanoid chain / KILL KIDNAPPING LANDER (`:903,911`).

**Claim landed:** context (story + epic) + epic-YAML `in_progress` stamp committed on `feat/df4-3-landers-humanoid-abduction` and pushed; the branch is the sibling-visible ownership signal.

**I anticipated this blocker — there was none.**

## Tea Assessment

RED authored for the signature Defender loop (lander → humanoid grab → carry-to-top → transform trigger → shot-carrier drop). All ROM lines re-opened by hand against `reference/original-source/defender/DEFB6.SRC` this session.

### The CITED enemy-identity mapping (the story's first deliverable, gated)
| ROM label | Banner @ line | Arcade name |
|---|---|---|
| `LANDS0` / `*START LANDERS` | `DEFB6.SRC:649,657` | **Lander** (base ground enemy) |
| `ASTRO` / `*ASTRONAUT PROCESS` | `DEFB6.SRC:290` | **Humanoid** (the abductee) |
| `*KILL KIDNAPPING LANDER` → `AFALL` | `DEFB6.SRC:903,911` | shot carrier → **falling** Humanoid |

The epic's loudest trap is "a wrong identity in prose ships GREEN," so the mapping is enforced, not decorative: `df4-3-enemy-identity.test.ts` requires a glossary.md row per label that (a) states the ARCADE name in prose, (b) cites the exact DEFB6 line, (c) is covered by a claim, (d) byte-verifies against the vendored source. Vacuity-guarded (`expectPopulated(rows>=1)` BEFORE the `.every`-based `rowCites`).

### Files authored
- `src/core/landers.ts` — empty `export {}` stub (the sanctioned brand-new-core-module RED seam; keeps `npm run lint` green while runtime is RED).
- `tests/helpers/df4-3-landers-contract.ts` — the module contract (types + `loadLanders()` self-describing "not built yet" loader + `stepUntil`).
- `tests/df4-3-enemy-identity.test.ts` — AC-1 the cited mapping.
- `tests/df4-3-landers.test.ts` — the mechanic: spawn-at-top/descend, humanoid walk, grab, carry-to-top+transform-trigger (one-shot), shot-carrier→AFALL fall, non-carrier drops no one, boundary guards.
- `tests/df4-3-sim-wiring.test.ts` — SimState `landers`/`humanoids` views + `spawnLander`/`spawnHumanoid` + `composeFrame` blit (DIFFER check, index-only colour).

### Design decisions TEA made (open to Dev/Reviewer challenge)
1. **Module `src/core/landers.ts`** (design §5 names it) covering lander + humanoid + the grab/carry/fall coupling as one mechanic. Bank pattern mirrors `laser.ts` (`createEnemyBank(sched, rand)`; entities are scheduler processes; `rand` injected — purity sweep bans `Math.random`).
2. **Transform trigger = a latched `reachedTop` boolean** on the Lander view. df4-3 FIRES it; df4-4's mutant (SCZ) CONSUMES it. The humanoid is consumed at the top (LNDFX1 kills the astro, `:823-827`).
3. **Sim seam kept surgical:** `createSim` still starts empty (df3-6 live-sim suite undisturbed); df4-3 adds explicit `spawnLander(state,x)` / `spawnHumanoid(state,x,y)` that return a new SimState (a df5 wave spawner / df4-6 calls them). If Dev prefers a different spawn seam, it's a small test edit, not a mechanic rewrite.
4. **Y in row units `[YMIN=42, YMAX=240]`** (consistent with `world.ts` `wrapObjectY`); `LANDER_SPAWN_Y=YMIN+2`, `LANDER_TOP_Y=YMIN+8`.
5. **"Eventually" bounds, not timing:** descent/carry speeds are GREEN's to derive from `LNDYV`; scenarios assert the loop REACHES each state within a generous 20k-tick cap, never how fast.

### Scope fence encoded in the tests (design §4/§6)
- **IN:** lander descent+targeting, humanoid walk, grab, carry-to-top, transform TRIGGER, shot-carrier→AFALL fall motion.
- **OUT → df4-4:** the MUTANT (SCZ) behaviour a triggered lander becomes.
- **OUT → df5:** AFALL GROUND outcome `ALAND` (rescue / fall-to-planet); P250/P500 SCORING (`:408`).
- **OUT → df4-5:** lander SHOOTING (`LSHOT`) — the projectile mechanic. Not asserted here.

### Rule Coverage (lang-review/typescript.md)
- **#21 module-boundary guard** — `df4-3-landers.test.ts` "non-finite spawn coordinate is rejected and leaks no process" (mirrors `laser.ts`'s `Number.isFinite` fire guard).
- **#4 `??` vs `||` on a valid 0** — the falling humanoid starts from REST (v=0); the test asserts its Y increases on the FIRST fall tick, so a `vel || default` bug on 0 is caught.
- **#14 derived transition edge** — `reachedTop` is asserted to be a latched ONE-SHOT (stepping further neither un-triggers nor re-grabs the consumed humanoid).
- **#17 cited numbers re-verified** — every core constant lands behind a byte-verified `claims/*.json` entry (the df1-1 gate); the identity suite re-opens `*START LANDERS`/`*ASTRONAUT PROCESS`/`*KILL KIDNAPPING LANDER` against the vendored tree.
- **#15/#18 vacuity** — every data-driven loop is `expectPopulated`-floored; `rowCites` (`.every`) is preceded by a row-presence floor so zero rows cannot pass vacuously.
- **Purity (df1-1)** — `landers.ts` is swept by `purity.test.ts` automatically; entropy is injected, colour is index-only.

### RED evidence
`npx vitest run --project defender <the 3 files>` → **18 failed | 3 passed**. The 3 passes are armed gates/meta-guards (identity-table population + the coverage/byte-verify sweeps, which currently have no df4-3 rows to catch — they bite GREEN if it adds an uncovered/mis-cited row). All 18 failures are self-describing ABSENT-FEATURE messages ("landers.ts not built yet", "sim.ts missing export", "glossary row swept 0"). `npm run lint` GREEN (repo-wide tsc). Full-project RED verification via testing-runner.

### What GREEN (Yoda) must ship
1. `src/core/landers.ts` — `createEnemyBank(sched, rand)` + the four cited constants; the lander/humanoid/grab/carry/trigger/fall reducers as scheduler processes.
2. `docs/rom-study/glossary.md` — the three enemy rows (Lander/Humanoid/falling), cited; + `docs/rom-study/claims/15-*.json` byte-verified.
3. `src/core/sim.ts` — `landers`/`humanoids` views + `spawnLander`/`spawnHumanoid`.
4. `src/core/scene.ts` — `composeFrame` blits `LNDP1` (lander) + `ASTP1` (humanoid), index-only.

## Dev Assessment

GREEN shipped all four deliverables; every TEA design decision was implemented as specified (no seam renegotiation needed).

**Implementation:**
- `src/core/landers.ts` — `createEnemyBank(sched, rand)` returning the `EnemyBank`. Landers/humanoids are self-rescheduling scheduler processes (laser.ts pattern): the lander runs a `descend → carry → done` state machine (`approach()` snaps toward the target column/altitude, grabs within the cited `$80`/`12` LANDG3 windows, rises at `CARRY_STEP`, fires the latched `reachedTop` at `LANDER_TOP_Y` and consumes the humanoid); the humanoid walks `±$20` on `NAP 2`, turning on the injected `rand` (SEED); `killLander` drops a carried humanoid into an `AFALL` process (`+8` accel from rest, capped `$300`) and no-ops the passenger of a non-carrier. Purity-clean (entropy injected, no colour literal).
- `src/core/sim.ts` — `landers`/`humanoids` snapshot views refreshed each `stepSim` (like `lasers`); `_enemyBank` carried by reference; `spawnLander(state,x)` / `spawnHumanoid(state,x,y)` returning a new state. `createSim` consumes no enemy entropy → star determinism and the df3-6 suite are untouched.
- `src/core/scene.ts` — `composeFrame` blits `LNDP1`/`ASTP1` at `world-x >> 8` (laser column convention), index-only, guarded `?? []`.
- `docs/rom-study/glossary.md` — the three cited enemy rows; `claims/15-enemies.json` — 9 byte-verified claims (identity banners + the `LANDER_SPAWN_Y`/`LANDER_TOP_Y`/`AFALL_ACCEL`/`AFALL_MAX_FALL` constants).

**Deviations:** logged above (placeholder velocity magnitudes — the authentic `LNDYV`/`LNDXV` are df5 wave-table RAM; `vy>>3` fall display-scale; render is world-x>>8 without camera-relative offset, matching laser.ts).

**GREEN evidence (direct runs):** df4-3 suite **21/21**; full defender project **527/527** (was 509+18); orchestrator **505/505**; `npm run lint` (repo-wide tsc) green. No regressions — the citation byte-gate accepts the new claims; df3-6 determinism intact. Canonical GREEN re-verified via testing-runner.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (green; 3 casts noted "intentional") | N/A — later simplified 2 casts per rule-checker |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (boundary/kill/consume paths, all VERIFIED) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no swallowed errors; loud throw) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered by rule-checker #18/#29 (magnitude gap CONFIRMED+FIXED) |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | confirmed 5 (fixed), dismissed 1 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker #1/#2/#3 (cast findings CONFIRMED+FIXED) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer (one `?? []` dead-guard, [LOW] kept) |
| 9 | reviewer-rule-checker | Yes | findings | 7 | confirmed 7 (fixed), dismissed 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per settings)
**Total findings:** 12 confirmed (all fixed in-session), 1 dismissed (with rationale), 0 deferred

### Rule Compliance (lang-review/typescript.md)
- **#1 type escapes:** was 3 `as unknown as` double-casts (landers.ts killLander; contract helper ×2) → FIXED: killLander needs no cast (`LanderRecord` structurally satisfies `Lander`); helper uses single `as`. Verified by tsc.
- **#2 readonly params:** compliant — all view arrays/`SimState` fields `readonly`; `HumanoidRecord`/`LanderRecord` intentionally mutable internals.
- **#3 enum/union:** `HumanoidState`/`LanderPhase` are string unions (correct); if-chains, no switch. Note: a future 4th phase would fall through silently — acceptable at this size, watch on growth.
- **#4 `??` vs `||`:** compliant — every `||` is a boolean guard; the falling-humanoid v=0 case is explicitly test-guarded.
- **#5 `.js` extension:** was 1 missing (landers test → contract helper) → FIXED.
- **#14 transition edge:** `reachedTop` is a one-shot computed in the only branch that can raise a lander's y (carry); test-guarded. Compliant.
- **#17 cited numbers:** all EN-1..EN-9 + inline citations re-verified byte-exact; the 2 that contradicted their cite (`WALK_TURN_THRESHOLD`, the SCOPE banner) → FIXED.
- **#18/#29 test apparatus:** vacuity-guarded; the AFALL magnitude gap → FIXED (equality assertions added).
- **#21 boundary guards:** compliant — `Number.isFinite` on both spawn entries, test-covered.
- **additional (purity/scheduler-process/index-colour/claims-coverage):** all compliant; every `landers.ts` constant now claim-pinned (EN-1..EN-15).

### Devil's Advocate
Argue this is broken. First and loudest: **one session wrote the test, the code, and this review** — the exact configuration where an author rubber-stamps their own blind spots. That risk was real and is why the enabled rule-checker earned its keep: it found seven genuine violations the author-as-Dev did not, including two *guessed constants sitting next to citations that named the true value* (`WALK_TURN_THRESHOLD=0x20` beside `CMPA #8`; `HUNT_X_STEP=0x40` beside an available `LDB #$20`). In a fidelity clone that is the cardinal sin — a green citation next to a wrong number — and it would have shipped without the backstop. Second: the loop only *looks* faithful. The vertical speeds are invented; a player who knows Defender would see landers descend and carry at the wrong cadence until df5 wires `LNDYV`. Third: the render is a lie about space — enemies blit at `world-x>>8` with no camera term, so a lander pinned at world x=1000 stays welded to screen column 3 while the terrain scrolls beneath it; nothing parallaxes. A confused viewer sees enemies floating on the glass. Fourth: the AFALL "fall" has no ground — the humanoid accelerates down and freezes at `YMAX`, neither rescued nor killed, a placeholder that reads as a hang if you don't know df5 owns the outcome. Fifth, a genuine edge: a humanoid spawned above `LANDER_TOP_Y` would trip `reachedTop` on the first carry tick — harmless here, but it shows the trigger is a bare threshold with no "did we actually carry it up" invariant. Sixth: grab convergence silently assumes `HUNT_X_STEP >= humanoid speed`; if df5 speeds up humanoids past the lander's hunt step, landers never catch them and the signature loop quietly stops happening with no test to notice. Each of these is either disclosed as a df4-4/df5 seam or is a deliberate df4-3 scope boundary — but they are real limitations, not imagined, and a reader must not mistake "green" for "complete Defender."

## Reviewer Assessment

**Verdict:** APPROVED

The mechanic is correct and the pipeline discipline held. This story ran setup→RED→GREEN→review in a single session, so I leaned on the enabled rule-checker (the backstop for exactly that case); it plus the comment-analyzer surfaced 12 real LOW/MEDIUM findings (no Critical/High), all confirmed against the ROM and **corrected in-session before approval**, then re-verified: defender **527/527**, orchestrator **505/505**, `npm run lint` green.

**Data flow traced:** `spawnLander(state, x)` → `_enemyBank.spawnLander` (finite-guarded, `null` on NaN/∞) → `sched.makeProcess` process advances descend→carry→done → view refreshed onto `SimState.landers` each `stepSim` → `composeFrame` blits `LNDP1` at `x>>8`. Safe: no unguarded numeric can enter the state machine (NaN rejected at the boundary; `sched.processes` unchanged on rejection — test-proven).

Confirmed findings, tagged by source:
- **[RULE]** guessed constants where the ROM gives exact ones — `WALK_TURN_THRESHOLD` 0x20→**8** (`CMPA #8`, DEFB6.SRC:312), `HUNT_X_STEP` 0x40→**0x20** (`LDB #$20`, :759). FIXED + claim-pinned (EN-14/EN-10).
- **[RULE]** every `landers.ts` constant now has a byte-verified claim (EN-1..EN-15); the SCOPE banner's "every constant is claim-pinned" is now true, not self-contradicting. FIXED.
- **[TYPE]** 3 unjustified `as unknown as` double-casts → single `as` / none. FIXED (tsc-verified). *(type_design subagent disabled; caught by rule-checker #1 + my read.)*
- **[TEST]** `AFALL_ACCEL`/`AFALL_MAX_FALL` were ordering-only (a mutant to accel=1 passed) → pinned by equality. FIXED. *(test_analyzer disabled; caught by rule-checker #29.)*
- **[DOC]** placeholder banner over-grouped 3 exact ROM values; `LANDER_TOP_Y` :798→:798-799; `spawnLander` cite :657→:649; per-method `EnemyBank` JSDoc added. FIXED. *(comment-analyzer.)*
- **[SEC]** core purity boundary, finite-input guards, and determinism VERIFIED clean — evidence: `landers.ts` imports only `./scheduler.js`/`./world.js`, entropy solely via injected `rand` (`landers.ts` walk-turn), no clock/DOM/network. *(security subagent + independent grep.)*
- **[EDGE]** boundary rejection (no process leak), double-`killLander` idempotence (record spliced, second call no-ops), and consume-vs-fall ordering (dying lander returns before touching the victim; AFALL owns it) — VERIFIED. *(edge_hunter disabled; my own path enumeration.)*
- **[SILENT]** no swallowed errors — `loadLanders` throws a loud self-describing error; kill/consume idempotence is intended, not a silent fallback. VERIFIED. *(silent_failure_hunter disabled.)*
- **[SIMPLE]** `scene.ts` `state.landers ?? []` / `humanoids ?? []` are dead guards on non-nullable fields — **[LOW]**, kept as cheap defense against a future partial-state caller; noted, non-blocking.

Dismissed (1): comment-analyzer's `spawnHumanoid` "ASTRO cite :290 vs label :294" — the banner line :290 (`*ASTRONAUT PROCESS`) is the story's byte-verified identity convention (claim EN-4 pins :290; the glossary cites the banner), so citing the process by its banner is consistent, not an error.

**Pattern observed:** clean reuse of the `laser.ts` bank/scheduler-process precedent (`createEnemyBank(sched, rand)`, self-rescheduling continuations, read-only snapshot views) at `plugins/defender/src/core/landers.ts:136`.
**Error handling:** finite-guarded spawns return `null`; AFALL self-terminates at `YMAX` (no unbounded reschedule); killed landers SUICIDE on next wake — `plugins/defender/src/core/landers.ts:216,272`.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.