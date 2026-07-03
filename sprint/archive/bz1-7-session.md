---
story_id: "bz1-7"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-7: Enemy tanks — spawn (always one hostile), approach/aim/fire AI, hit + explosion, 1000 pts

## Story Details
- **ID:** bz1-7
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T22:46:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T22:05:39Z | 2026-07-03T22:07:10Z | 1m 31s |
| red | 2026-07-03T22:07:10Z | 2026-07-03T22:25:01Z | 17m 51s |
| green | 2026-07-03T22:25:01Z | 2026-07-03T22:34:42Z | 9m 41s |
| review | 2026-07-03T22:34:42Z | 2026-07-03T22:46:57Z | 12m 15s |
| finish | 2026-07-03T22:46:57Z | - | - |

## Sm Assessment

**Diagnosis:** Story bz1-7 is fit for the table. 5-point tdd story in the `battlezone` subrepo — enemy tank lifecycle: spawn (invariant: always exactly one hostile on the field), approach/aim/fire AI, hit detection + explosion, 1000-point score award.

**Setup performed:**
- Session file created; feature branch `feat/bz1-7-enemy-tanks` cut from `develop` in `battlezone/`
- Story context written to `sprint/context/context-story-bz1-7.md` (validated, 828 bytes)
- Jira: explicitly skipped — this project uses local sprint YAML tracking only, no Jira key exists for bz1 stories

**Routing:** Workflow `tdd` is phased; setup → red. Next agent is TEA (Imperator Furiosa), who defines acceptance criteria and writes failing tests during the RED phase. Prior epic work (bz1-1 through bz1-6: canvas, render foundation, tank movement, gunsight/firing) is merged on `develop` and available as substrate.

**Verdict:** Survives. Hand it to Furiosa.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point feature story creating two new pure-core modules (enemies.ts, rng.ts) — the heart of the game's combat loop.

**Test Files:**
- `battlezone/tests/core/rng.test.ts` — the seeded PRNG (star-wars mulberry32 port, epic-mandated pattern): seed coercion, deterministic replay, [0,1) floats, [0,n) ints, seed variation (7 tests)
- `battlezone/tests/core/enemies.test.ts` — the bz1-7 contract: "always one hostile" spawn rule (obstacle-clear, player-clear, in-sight, seeded), hit + explosion + SCORES.slowTank (1000) awarded exactly once, no-gap replacement spawn, approach/aim/fire AI baseline, enemy shell physics (SHELL_SPEED, max-range expiry, swept obstacle block), swept player-hit signal, radar wiring via `radarContacts`, full-script determinism replay, extreme-dt robustness (27 tests)
- `battlezone/tests/core/enemies-purity.test.ts` — rule enforcement for both new modules: existence, no DOM/time/`Math.random` tokens, no type escapes, sibling-only imports, frozen-input non-mutating reducers (10 tests)

**Tests Written:** 44 tests covering the four story clauses (spawn rule / AI / hit + explosion / 1000 pts) plus standing epic ACs (determinism, purity)
**Status:** RED (failing — ready for Dev). Verified by testing-runner: 44 failed (all clean CONTRACT misses in the 3 new files), 275 pre-existing tests still pass, no collection-time crashes.

**Contract pinned for Dev** (full detail in the enemies.test.ts header):
- `src/core/rng.ts` — star-wars API copied: `Rng {seed}`, `createRng`, `nextFloat`, `nextInt` (mulberry32)
- `src/core/enemies.ts` — `Hostile` (planar pose, `kind: 'tank'`, `phase: 'alive'|'exploding'`, `phaseAge`), `EnemyState` (hostile never null, enemy `shell: Shell|null` = ROM slot #1, carried `rng: number` seed word), `initEnemies(seed, player)`, `stepEnemies(state, player, playerShell, dt) → {state, scoreAward, playerShellConsumed, playerHit}`, `radarContacts(state)`, `TANK_HIT_RADIUS`, `EXPLOSION_DURATION`
- Enemy shell shares the ROM's one projectile system: SHELL_SPEED, SHELL_MAX_RANGE, swept obstacle blocking
- `playerHit` is a signal only — consequences are a later story (see Delivery Findings)
- Render/lobby wiring (SLOW_TANK + EXPLOSION_DEBRIS via projectModel, shell main-loop) is shell-side — verified by running the game, per the epic's testing ruling

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Epic core purity (no DOM/time/randomness) | purity token scans × 2 modules | failing (RED) |
| Epic determinism (seeded RNG, fixed dt) | rng replay suite; `replays a full kill → explosion → respawn script` | failing (RED) |
| TS #1 type-safety escapes | `contains no type-safety escapes` × 2 modules | failing (RED) |
| TS #2 readonly / non-mutating reducers | frozen-input tests (`stepEnemies`, `initEnemies`) | failing (RED) |
| TS #4 null/undefined discipline | `Shell \| null` lifecycle pinned in both directions (spawn/expiry/block/consume) | failing (RED) |
| Core import boundary (no shell/, no node) | `imports only sibling core modules` × 2 | failing (RED) |
| TS #8 test quality (self-check) | manual pass over all 44 tests | 0 vacuous assertions found |

**Rules checked:** 6 of 6 applicable lang-review/epic rule families have test coverage (React/async/build rules N/A — pure synchronous core modules)
**Self-check:** 0 vacuous tests; every test asserts observable behavior or a cited constant

**Handoff:** To Dev (The Word Burgers) for GREEN — make the 44 fail-tests pass, minimal implementation, no gold-plating past the pinned contract.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/rng.ts` — NEW: seeded mulberry32 PRNG, ported verbatim from star-wars (epic port-don't-share ruling); carried-seed-word usage convention documented in header
- `battlezone/src/core/enemies.ts` — NEW: the whole enemy side. Hostile lifecycle (alive → exploding → no-gap replacement via seeded spawn ring, rejecting blocked ground), baseline AI synthesized as dual-tread `Input` fed through `movement.stepTank` (enemy obeys player physics for free — kinematics bounds, obstacle hard-stop), aimed fire along the barrel, enemy shell on the shared ROM projectile physics (swept sub-step walk vs range wall / obstacles / player), point-sample kill test at `TANK_HIT_RADIUS`, `SCORES.slowTank` award exactly once, `radarContacts` wiring
- `battlezone/src/main.ts` — wired `stepEnemies` into the frame loop (shell consumption, score accumulation, playerHit signal currently unconsumed by design); draws hostile (SLOW_TANK alive / EXPLOSION_DEBRIS exploding), enemy shell, score; radar now paints live contacts; **fixed pre-existing duplicated radar block that broke `tsc` on develop** (see Delivery Findings)
- `battlezone/src/shell/render.ts` — added `drawScore` (glowing top-right text; bz1-12 trues up the HUD)
- `battlezone/tests/core/enemies.test.ts` — type-only fix: `radarContacts` declared with the real `RadarContact` type instead of a local stringly shape (the local shape failed `tsc` against `deriveRadar`); no assertion changed

**Tests:** 319/319 passing (GREEN) — 44 new bz1-7 tests + 275 pre-existing, zero regressions (testing-runner RUN_ID bz1-7-dev-green). `npm run build` (tsc + vite) clean.
**Branch:** `feat/bz1-7-enemy-tanks` (pushed to origin)

**Design notes for the Reviewer (Immortan Joe):**
- AI reuses `stepTank` rather than bespoke kinematics — one physics, enforced by TEA's teleport/snap-turn bounds
- Enemy shell duplicates firing.ts's swept walk instead of calling `stepFiring` (the player version reads `input.fire` and has no player-hit test); the shared-projectile-system extraction is a sim.ts-era refactor, deliberately not forced now
- `justKilled` guard keeps the kill step from double-advancing the blast timer
- Fire decision happens at the pre-move pose so the shell leaves the barrel the tests measure

**Handoff:** To Reviewer (Immortan Joe) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 319/319 tests, tsc clean, build clean, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by my own pass (see [EDGE] observations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by my own pass (see [SILENT] observation) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 3 (dt=0/negative-dt gap, mutual-kill frame untested, kind:string test-double fidelity), dismissed 3 (EXPLOSION_DURATION band — deliberate provisional pin per logged deviation; π/4 fire band — deliberate slack for bz1-10 curve, documented in test comment; alive-assertion "dead weight" — cheap invariant guard, harmless), deferred 1 (tank-vs-tank body collision — descope, escalated to Delivery Finding) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by my own pass (see [DOC] observation) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker #2/#3 sweep + my own pass (see [TYPE] observation) |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (unbounded spawn rejection loop — LOW, defense-in-depth; not exploitable in a client-only game) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by my own pass (see [SIMPLE] observation) |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5 at LOW (3× `as unknown as` in test loaders — severity downgraded with rationale, NOT dismissed: established, runtime-gated house pattern from bz1-2..bz1-5; 2× test-local `Hostile.kind: string` wider than the real `'tank'` literal) — 18 rules, 113 instances enumerated, everything else compliant |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 9 confirmed (all LOW/MEDIUM, none blocking), 3 dismissed (with rationale), 1 deferred (escalated to Delivery Finding)

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` #1–#13 + 5 epic rules (context-epic-bz1.md). Rule-checker enumerated 18 rules across 113 governed instances; I spot-verified its critical claims against the diff myself.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 5 | 3 VIOLATIONS (LOW): `as unknown as Partial<T>` in the three test-file contract loaders (rng.test.ts:42, enemies.test.ts:131, enemies-purity.test.ts:86). Downgraded, not dismissed: each is immediately gated by runtime `typeof` CONTRACT checks and matches the reviewed house pattern shipped in bz1-2..bz1-5. Zero escapes in production code. |
| #2 generics/interfaces | 7 | Compliant — all new interfaces fully `readonly`; `Rng.seed` deliberately mutable as a documented local cursor (ported star-wars design; carried state is a primitive) |
| #3 enums | 1 | Compliant — `HostilePhase` is a string-literal union, no runtime enum, no non-exhaustive switch |
| #4 null/undefined | 4 | Compliant — `Shell \| null` transitions explicit in both directions; no `\|\|`-on-falsy, no unchecked `Map.get` |
| #5 modules/declarations | 20 | Compliant — `import type` discipline correct; bundler resolution needs no `.js` extensions |
| #6 React/JSX | 0 | N/A — no .tsx |
| #7 async/promises | 3 | Compliant — test loaders only |
| #8 test quality | 6 | 2 VIOLATIONS (LOW): test-local `Hostile.kind: string` wider than the real `'tank'` literal (enemies.test.ts:93, enemies-purity.test.ts:52). Runtime assertions still check the exact value; type-fidelity follow-up. |
| #9 build/config | 0 | N/A — no config changes; strict mode confirmed on |
| #10 input validation | 0 | N/A — no external input, no JSON.parse, no URLs |
| #11 error handling | 3 | Compliant — bare catches re-signal as specific CONTRACT errors (house pattern) |
| #12 perf/bundle | 4 | Compliant — dynamic imports and readFileSync are test-only |
| #13 fix regressions | 0 | N/A — original implementation, not a fix pass |
| Epic: core import boundary | 8 | Compliant — enemies.ts imports 7 siblings only; rng.ts imports nothing |
| Epic: core purity tokens | 3 | Compliant — zero banned tokens in both new core modules (grep-verified twice: by security agent and rule-checker); `Date.now()` is shell-side only (main.ts seed, passed as plain number) |
| Epic: non-mutating reducers | 8 | Compliant — fresh-object returns throughout; frozen-input tests prove it |
| Epic: ROM citation / provisional labeling | 7 | Compliant — every ROM constant cites its source; every provisional magnitude labeled with bz1-12 true-up |
| Epic: determinism | 6 | Compliant — replay tests pin initEnemies, stepEnemies (791-step trail), and all three rng functions |

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (tagged by domain — disabled subagents' domains covered personally):**

1. `[RULE]` (LOW ×3) `as unknown as Partial<T>` in test contract loaders — rng.test.ts:42, enemies.test.ts:131, enemies-purity.test.ts:86. Matches lang-review #1; severity downgraded (runtime-gated, established bz1-2..bz1-5 precedent), NOT dismissed. Follow-up: formalize the pattern or add a lint-suppression convention.
2. `[RULE]`/`[TEST]` (LOW ×2) Test-local `Hostile.kind: string` is wider than the real `'tank'` literal (enemies.test.ts:93, enemies-purity.test.ts:52) — runtime value still asserted exactly; tighten next touch.
3. `[TEST]` (MEDIUM) Missing edge tests: `dt = 0` no-op (pinned for movement at movement.test.ts:166 but not for stepEnemies) and the mutual-kill frame (player shell kills hostile while enemy shell hits player in one step — implementation handles it via independent branches, my code-read confirms, but no test witnesses it). Non-blocking; queue for bz1-8's roster rework which touches this module anyway.
4. `[SEC]` (LOW) `spawnHostile`'s `for(;;)` rejection loop is unbounded (enemies.ts:~137). Not exploitable (client-only, no attacker-controlled input; worst-case blocked fraction of the 16k–30k annulus ≈ 17%, so P(100 consecutive rejects) ≈ 0.17^100 ≈ 10⁻⁷⁷). Defense-in-depth: bound it when sim.ts arrives.
5. `[EDGE]` (personal pass — subagent disabled) Boundary sweep: kill exactly AT `TANK_HIT_RADIUS` uses strict `<` (miss at the boundary — consistent with movement/firing's strict tests); replacement spawn step is unkillable for exactly one frame (kill test runs before replacement exists) — accepted, matches the "no delay" ROM framing; `bearingTo` at coincident poses returns atan2(0,0)=0, no NaN; dt=0 can still FIRE (spawn at zero advance) — same semantics as stepFiring's fire-on-dt-0, consistent house behavior.
6. `[SILENT]` (personal pass — subagent disabled) No swallowed errors possible in the new core paths — pure math, no exceptions, no fallbacks; the only silent behavior is the deliberate `playerHit` signal-without-consequence, which is a logged scope decision, not a swallow.
7. `[DOC]` (personal pass — subagent disabled) Comments verified against behavior: enemies.ts header's ROM citations match the findings doc (§1/§2/§5 quotes, dis65 offsets 2674/6636); "provisional" labels present on all five tuned constants; no stale claims found. drawScore's bz1-12 pointer accurate.
8. `[TYPE]` (personal pass — subagent disabled) Type design sound: `HostilePhase` union + literal `kind: 'tank'` ready for bz1-8 widening; `EnemyState.rng` as primitive seed word is the right immutability boundary; `EnemyStepResult` cleanly separates state from events (award/consumed/hit) — a good pattern for the future sim.ts composition, noted at enemies.ts:72.
9. `[SIMPLE]` (personal pass — subagent disabled) `wrapAngle` now exists in radar.ts (normalizeAngle) and enemies.ts — third copy will justify a math util extraction; enemy shell's swept walk duplicates firing.ts's loop shape (Dev logged the sim.ts-era extraction rationale — accepted). No dead code, no over-engineering found.
10. `[VERIFIED]` Core purity — zero banned tokens in src/core/enemies.ts and src/core/rng.ts; grep-verified independently by security agent, rule-checker, AND the shipped purity tests (enemies-purity.test.ts:120–130 scans both files). Complies with the epic's core-purity rule.
11. `[VERIFIED]` develop was build-broken before this branch: `git show develop:src/main.ts | grep -c "const contacts"` → 2 (block-scope redeclaration, TS2451); HEAD → 0. The fix is real and this PR carries it. Complies with (restores) the epic's toolchain rule that `build` must pass.
12. `[VERIFIED]` Determinism — 791-step kill→explosion→respawn replay trail deep-equals itself (enemies.test.ts:585–611); rng replay ×100 draws (rng.test.ts:69–76). Complies with the epic's standing determinism AC.

**Data flow traced:** keyboard → `KeyboardTreads.read()` → `Input` → `stepTank`/`stepFiring` (player pose + shell) → `stepEnemies(state, pose, shell, dt)` → `{state, scoreAward, playerShellConsumed, playerHit}` → main.ts consumes (nulls consumed shell, accumulates score) → `projectModel`/`drawSegments`/`drawScore`/`drawRadar`. Safe because: every core stage is a pure reducer over readonly inputs; the only wall-clock and DOM touches live in main.ts/render.ts (shell); no external input enters anywhere.

**Wiring:** hostile renders via SLOW_TANK (alive) / EXPLOSION_DEBRIS (exploding), enemy shell via SHELL model, score via drawScore, radar blip via radarContacts→deriveRadar — all reachable from the running game loop (main.ts frame()). Build + 319 tests green.

**Pattern observed:** AI-as-Input synthesis at enemies.ts:aiInput — the enemy emits dual-tread `Input` and moves through the SAME `stepTank` physics as the player. One physics, no bespoke kinematics, obstacle hard-stop inherited for free. This is the pattern bz1-8's missile/super-tank AI should copy.

**Error handling:** Pure-math core — no throw paths; NaN-in→NaN-out matches the sibling modules' garbage-in contract; rAF dt is clamped shell-side (main.ts:48, `Math.min(0.05, …)`); extreme-dt test pins finite output.

**Tenant isolation audit:** N/A as a domain — client-only single-player game, no backend, no tenancy, no cross-user state. Enumerated anyway: no trait-like handler methods take identity parameters because none exist; no security-critical fields exist; `localStorage` untouched this story.

**Hard questions:** Coincident poses → atan2(0,0)=0, defined. Huge dt → finite (tested at 1e4). dt=0 → no motion, fire-only (house semantics). Race conditions → none possible (synchronous single-threaded reducer). Player camps 100k away → hostile crawls toward at 2880 u/s, no despawn — acceptable until bz1-10's aggression. Long-range shots miss (sin(0.3)·30000 ≈ 8900 units off) → aim converges as it closes; bz1-10 curve will tune shot quality.

### Devil's Advocate

Let me argue this code is broken. First: the enemy is a coward that can be farmed. It spawns 16–30k out, crawls at half speed, and fires only within 0.3 rad — a player who strafes perpendicular keeps the bearing error saturated and the tank never shoots; you can kill it forever for 1000 points a pop with zero risk. Is that broken? It is *mild* — and the findings doc says mild is exactly what the ROM serves at score-differential zero; the ratchet that punishes farming is bz1-10's explicitly sequenced work. Second: the tank has no obstacle avoidance — drive behind a pyramid and it will grind its nose against the far face until the sun burns out. True. The stepTank hard-stop guarantees it never clips inside, and the ROM's own tanks were dumb enough to be famous for it. Still, a stuck-forever hostile is a playtest smell — I am routing it to the Delivery Findings so bz1-10/bz1-12 own it, not silence. Third: the mutual-kill frame. My code-read says the two branches are independent — kill resolves, THEN the in-flight enemy shell sweeps — so both events land in one result; but no test witnesses it, and untested truths decay. Flagged MEDIUM. Fourth: seeding from `Date.now()` means two page loads never replay — but determinism is a CORE property (seed-in, state-out), and the shell owning the wall clock is the epic's own ruling. Fifth: what if `EXPLOSION_DURATION` drifts to 9 seconds — the sanity band accepts it and the game feels dead between kills. The value is a logged provisional; the band is honest about what we don't know. None of this rises to blocking. The wasteland-worthy defects (farmability, wall-grinding) are sequenced work with owners, not silent rot.

**Handoff:** To The Organic Mechanic (SM) for finish-story — PR creation, merge, ceremony. I do not merge; I judge.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): Player-death consequences are unowned. bz1-7 pins `playerHit` as a returned SIGNAL only — no story owns lives, the death/respawn sequence, or the ROM's "+1000 to enemy score when the player is killed" (findings §5, code ref `$69fd`).
  Affects `sprint/current-sprint.yaml` (scope the consequence into bz1-10 or a dedicated story) and the future sim composition that consumes the signal.
  *Found by TEA during test design.*
- **Question** (non-blocking): The slow tank's own speed/turn-rate ROM constants are not yet decoded from the quarry — tests bound enemy kinematics only by the player's MAX_SPEED/MAX_TURN_RATE ceilings.
  Affects `battlezone/src/core/enemies.ts` (Dev picks provisional magnitudes; bz1-12 playtest trues up).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): The player-shell-vs-hostile hit test is point-sampled by contract (safe at 60 Hz because TANK_HIT_RADIUS ≥ 256, one shell frame-step). The ROM swept ALL unit collisions in its 4-sub-step projectile walk; a future `sim.ts` composition could share one swept walk for shells-vs-everything.
  Affects `battlezone/src/core/enemies.ts` (hit-test placement when sim.ts arrives).
  *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (non-blocking, FIXED in this branch): `develop` was shipped broken by the bz1-6 merge — `src/main.ts` carried a duplicated radar-contacts block (two `const contacts` declarations in one scope), so `tsc`/`npm run build` fails on develop. The duplicate sat exactly where bz1-7's wiring goes; removed here.
  Affects `battlezone/src/main.ts` (fixed by this story's wiring commit; develop stays build-red until this merges — reviewer take note).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): The explosion renders as the static `EXPLOSION_DEBRIS` model for the blast duration — no expansion/scatter animation. The ROM animates debris (point sprites scattering); a debris-motion pass would sell the kill better.
  Affects `battlezone/src/main.ts` / `battlezone/src/core/enemies.ts` (bz1-12 HUD/fidelity capstone, or fold into bz1-8's roster work).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): Tank-vs-tank body collision (hostile ramming the player, or the player driving through the hostile) is neither implemented nor tested nor logged as a descope — currently the two tanks pass through each other.
  Affects `battlezone/src/core/enemies.ts` (add the collision or the documented descope; check the quarry for the ROM's own behavior — bz1-8/bz1-10).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): A hostile that reaches an obstacle grinds against it forever (hard-stop, no reverse/steer-around); the ROM's tanks reverse when blocked. Farmable-coward baseline AI (strafe keeps bearing error saturated → it never fires) is likewise a mild-regime artifact until bz1-10's ratchet.
  Affects `battlezone/src/core/enemies.ts` (blocked-reverse behavior + aggression curve — bz1-10, playtest-verified in bz1-12).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Missing edge tests queued for the next touch of this module: `dt = 0` no-op pin (movement has one, enemies doesn't) and the mutual-kill frame (kill + playerHit in one step — code paths are independent and correct by read, but unwitnessed).
  Affects `battlezone/tests/core/enemies.test.ts` (bz1-8 touches this module and should add both).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Bound `spawnHostile`'s rejection loop (e.g. 100 attempts + fallback) as defense-in-depth against a future obstacle-data or spawn-ring change hanging the single-threaded loop; not currently reachable.
  Affects `battlezone/src/core/enemies.ts` (fold into the sim.ts composition story).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

6 deviations

- **Spawn-in-obstacle ROM bug deliberately not replicated**
  - Rationale: Epic-mandated descope; the epic explicitly instructs this story to log it rather than ship it silently
  - Severity: minor
  - Forward impact: bz1-8 (missiles/super tanks) and bz1-9 (saucer) spawners inherit the same drivable-ground pin
- **Hit radii approximated — ROM projectile collision-diameter table ($6139) still a deferred decode**
  - Rationale: Consistent with the house deferral; a behavioral band keeps the test honest without inventing a fake ROM number
  - Severity: minor
  - Forward impact: When $6139 is decoded (fidelity follow-up / bz1-12), constants tighten; tests need only the band revisited
- **AI aggression curve deferred to bz1-10 — baseline approach/aim/fire only**
  - Rationale: The epic sequences the difficulty ratchet into bz1-10; findings §5 records the constants for that story to port
  - Severity: minor
  - Forward impact: bz1-10 ports the curve and may relax the π/4 fire-alignment pin for the ROM's mild-regime "bad shots"
- **EXPLOSION_DURATION has no ROM citation — pinned behaviorally only**
  - Rationale: No quarry citation exists yet for blast length; behavior (occupied slot, no-gap replacement) is the ROM fact, the number is not
  - Severity: minor
  - Forward impact: bz1-12 playtest (or a deeper quarry pull) trues up the value
- **Provisional AI/lifecycle magnitudes chosen without ROM citations**
  - Rationale: Tests pin behavior, not magnitudes (TEA's own deviation notes the same deferral); values chosen to read plausibly against footage — "slow" tank crawls, blast is visible, spawns enter within the far plane
  - Severity: minor
  - Forward impact: bz1-12 playtest true-up; bz1-10's curve port will modulate aim/fire quality with score differential
- **Exploding hostile paints no radar blip**
  - Rationale: TEA pinned only the alive case; the quarry doesn't answer it; a blipless corpse reads cleanest and matches the "units paint" framing
  - Severity: minor
  - Forward impact: none known; trivially revisable if bz1-12 footage shows otherwise

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Spawn-in-obstacle ROM bug deliberately not replicated**
  - Spec source: context-epic-bz1.md ("Known ROM facts" bullet + descopes list); findings doc §2
  - Spec text: "The ROM's missing spawn-collision check (enemies can spawn inside obstacles) is a known defect we deliberately do not replicate — log as a deviation in bz1-7, not silently."
  - Implementation: `tests/core/enemies.test.ts` REQUIRES spawn on drivable ground (`movement.isBlocked === false` across 100 seeds with the player parked inside the obstacle field) — the real ROM would sometimes place a tank inside a footprint
  - Rationale: Epic-mandated descope; the epic explicitly instructs this story to log it rather than ship it silently
  - Severity: minor
  - Forward impact: bz1-8 (missiles/super tanks) and bz1-9 (saucer) spawners inherit the same drivable-ground pin
- **Hit radii approximated — ROM projectile collision-diameter table ($6139) still a deferred decode**
  - Spec source: findings doc §4/§6; firing.ts + movement.ts headers (the standing bz1-4/bz1-5 deferral)
  - Spec text: "The exact projectile collision-diameter table at $6139 is a deferred byte-decode"
  - Implementation: Tests pin `TANK_HIT_RADIUS` behaviorally (≥ 256 = one 60 Hz shell frame-step so point sampling cannot tunnel; ≤ 4096) and pin player-hit via a swept-crossing scenario rather than a ROM diameter value
  - Rationale: Consistent with the house deferral; a behavioral band keeps the test honest without inventing a fake ROM number
  - Severity: minor
  - Forward impact: When $6139 is decoded (fidelity follow-up / bz1-12), constants tighten; tests need only the band revisited
- **AI aggression curve deferred to bz1-10 — baseline approach/aim/fire only**
  - Spec source: findings doc §5; context-epic-bz1.md story map ("bz1-10 depends on the full roster for its ratchet")
  - Spec text: "aggression is based on the difference between the player's score and the enemy's score... full aggression [at] 7000 points... more aggressive ~17 seconds after it has spawned"
  - Implementation: Tests pin only baseline behaviors (turns onto the player, closes distance, fires within π/4 of the bearing) plus `phaseAge` accumulating dt as the hook the ~17s ramp will read; no score-differential modulation is tested
  - Rationale: The epic sequences the difficulty ratchet into bz1-10; findings §5 records the constants for that story to port
  - Severity: minor
  - Forward impact: bz1-10 ports the curve and may relax the π/4 fire-alignment pin for the ROM's mild-regime "bad shots"
- **EXPLOSION_DURATION has no ROM citation — pinned behaviorally only**
  - Spec source: findings doc §2 (the "alive or exploding" spawn rule implies a nonzero blast window; no duration constant surfaced)
  - Spec text: "There will always be one hostile unit on the battlefield, either alive or exploding... no delay between one leaving and the next appearing"
  - Implementation: Tests pin 0 < EXPLOSION_DURATION ≤ 10 s and that the replacement spawns the same step the blast retires — the duration VALUE is Dev's provisional choice
  - Rationale: No quarry citation exists yet for blast length; behavior (occupied slot, no-gap replacement) is the ROM fact, the number is not
  - Severity: minor
  - Forward impact: bz1-12 playtest (or a deeper quarry pull) trues up the value

### Dev (implementation)

- **Provisional AI/lifecycle magnitudes chosen without ROM citations**
  - Spec source: docs/battlezone-1980-source-findings.md §5; context-story-bz1-7.md (technical approach left to Dev)
  - Spec text: "aggression is based on the difference between the player's score and the enemy's score" — the quarry quantifies the CURVE (bz1-10's port) but gives no slow-tank speed, aim tolerance, spawn distances, or blast duration
  - Implementation: `SLOW_TANK_THROTTLE = 0.5` (half player speed), `AIM_TOLERANCE = 0.3` rad, `SPAWN_MIN/MAX = 16000/30000`, `EXPLOSION_DURATION = 1.5` s, `TANK_HIT_RADIUS = PLAYER_RADIUS` (1152) — all within TEA's pinned behavioral bands
  - Rationale: Tests pin behavior, not magnitudes (TEA's own deviation notes the same deferral); values chosen to read plausibly against footage — "slow" tank crawls, blast is visible, spawns enter within the far plane
  - Severity: minor
  - Forward impact: bz1-12 playtest true-up; bz1-10's curve port will modulate aim/fire quality with score differential
- **Exploding hostile paints no radar blip**
  - Spec source: docs/battlezone-1980-source-findings.md §7
  - Spec text: "Enemy tanks and missiles appear on radar, obstacles and saucers do not" — silent on the exploding state
  - Implementation: `radarContacts` returns [] while phase is 'exploding' (debris is not a tank)
  - Rationale: TEA pinned only the alive case; the quarry doesn't answer it; a blipless corpse reads cleanest and matches the "units paint" framing
  - Severity: minor
  - Forward impact: none known; trivially revisable if bz1-12 footage shows otherwise

### Reviewer (audit)

Every logged deviation examined against spec sources; verdicts:

- **TEA: Spawn-in-obstacle ROM bug deliberately not replicated** → ✓ ACCEPTED by Reviewer: the epic text explicitly mandates both the descope and this log entry; tests enforce it across 100 seeds.
- **TEA: Hit radii approximated ($6139 deferred)** → ✓ ACCEPTED by Reviewer: consistent with the standing bz1-4/bz1-5 deferral; behavioral band beats a fabricated ROM number.
- **TEA: AI aggression curve deferred to bz1-10** → ✓ ACCEPTED by Reviewer: matches the epic's story sequencing ("bz1-10 depends on the full roster for its ratchet"); phaseAge hook is in place.
- **TEA: EXPLOSION_DURATION behaviorally pinned only** → ✓ ACCEPTED by Reviewer: no quarry citation exists; the no-gap replacement behavior (the actual ROM fact) is pinned tight.
- **Dev: Provisional AI/lifecycle magnitudes** → ✓ ACCEPTED by Reviewer: all five constants labeled provisional in source with bz1-12 named; values sit inside TEA's pinned bands (verified: TANK_HIT_RADIUS 1152 ∈ [256, 4096], EXPLOSION_DURATION 1.5 ∈ (0, 10]).
- **Dev: Exploding hostile paints no radar blip** → ✓ ACCEPTED by Reviewer: quarry is silent; "units paint, debris doesn't" is the defensible reading; trivially revisable.

No undocumented deviations found: I checked the diff against story scope, epic guardrails, and sibling-story assumptions — the one candidate (tank-vs-tank body collision absent) is a scope gap, not a spec divergence, and is escalated as a Delivery Finding instead.