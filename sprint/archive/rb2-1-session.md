---
story_id: "rb2-1"
jira_key: null
epic: "rb2"
workflow: "tdd"
---
# Story rb2-1: Flight model — pot-yoke turn-rate (PLDELX) with inertia + hysteresis, 11-step pitch table (PLDELY, dive faster than climb), PFROTN = PLDELX x8 bank coupling clamped, I4YPOS altitude clamp, DISCHK distance-scaled feel; input map drives the rb1 flightView camera

## Story Details
- **ID:** rb2-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Repos:** red-baron
- **Branch:** feat/rb2-1-flight-model-turn-pitch
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-09T16:16:39Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T14:53:35Z | - | - |
| red | 2026-07-09T14:53:35Z | 2026-07-09T15:14:45Z | 21m 10s |
| green | 2026-07-09T15:14:45Z | 2026-07-09T15:28:35Z | 13m 50s |
| review | 2026-07-09T15:28:35Z | 2026-07-09T15:42:54Z | 14m 19s |
| green | 2026-07-09T15:42:54Z | 2026-07-09T15:51:46Z | 8m 52s |
| review | 2026-07-09T15:51:46Z | 2026-07-09T16:04:49Z | 13m 3s |
| green | 2026-07-09T16:04:49Z | 2026-07-09T16:09:30Z | 4m 41s |
| review | 2026-07-09T16:09:30Z | 2026-07-09T16:16:39Z | 7m 9s |
| finish | 2026-07-09T16:16:39Z | - | - |

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the story context recorded NO acceptance criteria and only stub technical-approach text. Affects `sprint/context/context-story-rb2-1.md` (its AC section should be back-filled) — TEA derived the ACs from epic §3 / findings §2 and encoded them as the `red-baron/tests/core/flight.test.ts` contract. *Found by TEA during test design.*
- **Question** (non-blocking): the ROM→radian scale (roll/pitch/yaw) and the PLDELX max / per-frame accel-step are NOT pinned by the fidelity doc. Affects `red-baron/src/core/flight.ts` — Dev must choose values so a full-deflection *settled* turn saturates the `0x100` bank clamp (a `flight.test.ts` invariant) and the ramp is not instant; exact feel is Dev tuning within the tested bounds. *Found by TEA during test design.*
- **Improvement** (non-blocking): the PFROTN bit-format angle (`XXX XQQA AAAA AA.FF`, findings §2) is currently only used qualitatively. Affects `red-baron/src/core/flight.ts` — when rb2-3 render / rb3 ground need exact projection, consider an explicit ROM-angle→radian converter rather than a scalar. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the `src/main.ts` yoke glue (keyboard → `FlightInput`, fixed-timestep sim at `SIM_TIMESTEP_S`) has no *executable* test — only the structural cockpit-boot guard + `tsc`. Affects `red-baron/src/main.ts` — a jsdom integration test or the rb2-12 live playtest should confirm the horizon banks on keypress and the sim ticks at ~10.42 Hz (not per rAF frame). *Found by Dev during implementation.*
- **Question** (non-blocking): the empty cockpit hard-codes DISCHK `'far'` (nothing near yet). Affects `red-baron/src/main.ts` — confirm `'far'` (authentic slow-air feel) is preferred over `'mid'` for the pre-combat demonstrator; live proximity arrives with enemies (rb2-4+). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the 2-count turn hysteresis — a story-*title* AC — is asserted by name only; mutation testing proves deleting `easeTurnRate`'s deadband keeps all 39 tests green. Affects `red-baron/tests/core/flight.test.ts` (add a mid-deadband test: `step(withState({turnRate:39}), IN(1,0)).turnRate === 39` stays, `turnRate:37` moves). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the `main.ts` fixed-timestep accumulator — the guard against the ÷6 sim/display-rate fidelity trap (findings §1, the project's highest-risk regression class) — has no test. Affects `red-baron/tests/cockpit-boot.test.ts` (add a structural check that `main.ts` imports `SIM_TIMESTEP_S` and gates `step()` inside an accumulator loop). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `step()` does not clamp `turn` to [-1,1] (unlike `pitchDelta`, which clamps the pot), and `clamp(NaN)` propagates NaN — a single non-finite input would permanently poison state. Unreachable from the current shell (`axis()` yields only -1/0/1), so defensive. Affects `red-baron/src/core/flight.ts` (clamp `turn` and/or document+test the finite-input contract). *Found by Reviewer during code review.* → **Addressed RT1** (`clamp(input.turn,-1,1)`).

### Reviewer (re-review)
- **Improvement** (non-blocking): the `main.ts` sim-cadence is guarded structurally (grep-based, the house pattern — `main.ts` can't run under `environment:'node'`); a text-scan can't distinguish a `step(` in a comment from live code. Affects `red-baron/tests/` — the already-filed jsdom/live-playtest integration finding (Dev, above; rb2-12) is the durable fix. Not blocking — the guard is mutation-verified against the real file shape. *Found by Reviewer during re-review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Behavioural (not exact-constant) pinning of the ROM→radian scale and the accel-step**
  - Spec source: context-epic-rb2.md §3 (item 3); docs/red-baron-1980-source-findings.md §2
  - Spec text: "PLDELX turn-rate with inertia + hysteresis … PFROTN = PLDELX × 8 … clamp ≤ 0x100"
  - Implementation: roll/pitch/yaw radian scale and the PLDELX max / ramp step are asserted BEHAVIOURALLY (sign, monotonicity, bounds, convergence, clamp saturation), not as magic constants. The ROM DATA that IS specified — the pitch table, ×8 coupling, `0x100` clamp, DISCHK fractions, `0x210` spawn altitude, `PLYMIN`/`PLYMAX` — is pinned to the byte.
  - Rationale: asserting an unspecified constant would fabricate a spec and couple the suite to an arbitrary Dev choice; behaviour is the honest contract.
  - Severity: minor
  - Forward impact: Dev picks the scale within these bounds; a later story can tighten to exact radians if a reference frame is captured.
- **Climb/dive drives a transient camera PITCH + an accumulating ALTITUDE (the ROM has only PFROTN roll + I4YPOS translation, no pitch rotation)**
  - Spec source: docs/red-baron-1980-source-findings.md §2 (PFMOTN / POSITP); red-baron/src/core/camera.ts + horizon.ts (rb1 attitude model)
  - Spec text: "PLDELY (×DISCHK) adds to I4YPOS … projector translates by −UNIV4X,−I4YPOS, rotates via the Math Box" (roll only)
  - Implementation: the pitch pot drives BOTH `toAttitude.pitch` (transient — reflects the current climb/dive step, level when centred) AND `toEye.y` (accumulating I4YPOS altitude). rb1's `horizonSegments` depends only on attitude (eye at origin), so climb/dive feedback on the horizon MUST come through pitch; altitude still drives finite ground/enemy parallax.
  - Rationale: reconciles the ROM's translate-the-world scheme with rb1's rotate-the-camera camera; the horizon can only slide vertically via pitch.
  - Severity: minor
  - Forward impact: rb2-3 render / rb3 ground consume `toEye` altitude for parallax; if a later story wants ROM-exact "nose-down held at the altitude floor", revisit whether pitch reads the command or the altitude delta.
- **DISCHK proximity is a caller-supplied INPUT, not computed here**
  - Spec source: context-epic-rb2.md §3; findings §2 (DISCHK); epic sequencing note
  - Spec text: "DISCHK … player deltas scale by proximity of the nearest object"
  - Implementation: `FlightInput.proximity: ProximityBand` is supplied by the caller; rb2-1 does not compute nearest-object distance (there are no enemies until rb2-4+). The near>mid>far scaling is fully tested.
  - Rationale: the live distance→band computation belongs with enemy state; forcing it into rb2-1 would gold-plate.
  - Severity: minor
  - Forward impact: a later story wires enemy/ground distance → ProximityBand and forces ground mode to the slow band (§2).

### Dev (implementation)
- **Concrete flight-feel tuning constants (realizing TEA's behavioural freedoms)**
  - Spec source: red-baron/tests/core/flight.test.ts (RED contract); TEA deviation "Behavioural pinning of the ROM→radian scale and the accel-step"
  - Spec text: "Dev picks the scale within these bounds; a full-deflection *settled* turn saturates the `0x100` bank clamp … and the ramp is not instant"
  - Implementation: `MAX_TURN`=40 (full-yoke PLDELX; ×8=320→clamps `0x100`, and ≥`0x1C` hard-turn), `TURN_ACCEL`=8/frame (≈5-frame inertia ramp), `ROLL_SCALE`=π/1024 (a quadrant is `0x200`, so `0x100` = 45° max bank), `PITCH_SCALE`=π/512, `YAW_SCALE`=π/1024, `ALT_TO_Y`=1/4 (I4YPOS is eye-Y ×4 → world eye height).
  - Rationale: these satisfy every `flight.test.ts` invariant; the ROM does not pin them to a byte, so they are the smallest sensible concrete choice.
  - Severity: minor
  - Forward impact: rb2-3 (render) / later shell tuning may adjust the scales for feel; `ALT_TO_Y` and the roll/pitch/yaw scales are the numbers sibling stories inherit from `toAttitude`/`toEye`.
- **Shell wiring of `src/main.ts` (input map → flight model → camera), beyond the core test contract**
  - Spec source: story title (session file); Dev self-review "code is wired to front end"
  - Spec text: "…; input map drives the rb1 flightView camera"
  - Implementation: replaced the rb1-3 sinusoid demonstrator with a keyboard yoke → `FlightInput` → `step` (ticked at `SIM_TIMESTEP_S`, not per rAF) → `toAttitude` → tilting horizon. Shell glue with no unit test; guarded structurally by `tests/cockpit-boot.test.ts` (imports ./core/camera + ./core/horizon, `getContext('2d')`, stroke, no biplane) and typechecked by `tsc` under strict + `noUnusedLocals`.
  - Rationale: the story title requires the input map to drive the camera; a core model nothing consumes fails the "wired to front end" check. Executable tests for DOM event glue are impractical under `environment:'node'` (the house pattern tests `main.ts` structurally).
  - Severity: minor
  - Forward impact: rb2-4+ will vary DISCHK proximity from live enemy distance (currently fixed `'far'`); a later story may add a jsdom/browser integration test or extract an input module.

### Reviewer (audit)
- **TEA-A (behavioural pinning of scale/accel)** → ✓ ACCEPTED: the behavioural approach is sound. NOTE: the *hysteresis* behaviour slipped the net entirely — mutation testing proves the deadband is never exercised (see [TEST] F1 / blocking Gap). The deviation is accepted; the coverage hole it left is FLAGGED for rework.
- **TEA-B (climb/dive → transient pitch + accumulating altitude)** → ✓ ACCEPTED: correct reconciliation of the ROM's translate-scheme with rb1's rotate-camera; the "horizon slides only via pitch" reasoning checks out against `horizon.ts` (eye-at-origin).
- **TEA-C (DISCHK proximity as caller input)** → ✓ ACCEPTED: sound scope decision; enemies (rb2-4+) own the live distance→band mapping.
- **Dev-A (concrete tuning constants)** → ✓ ACCEPTED: values satisfy every invariant. NOTE: `MAX_TURN=40` being an exact multiple of `TURN_ACCEL=8` is the DIRECT cause of the hysteresis-test vacuity ([TEST] F1) — every ramp lands exactly on target, so the deadband branch never fires mid-window. Constants are fine; the test must seed a mid-deadband state.
- **Dev-B (shell wiring of `main.ts`)** → ✓ ACCEPTED: correct to fly the cockpit with the model (the story title demands it) and the fixed-timestep tick is the right ÷N-trap defence. FLAG: that accumulator has NO test (see [TEST] F6) — accepted, with a required structural-test follow-up.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** rb2-1 is the flight-model core (5 pts, tdd) — pure deterministic dynamics with exact ROM data and behavioural invariants. Prime TDD territory.

**Test Files:**
- `red-baron/tests/core/flight.test.ts` — the pot-yoke → attitude flight model (contract for `src/core/flight.ts`).

**Tests Written:** 39 tests across 9 acceptance criteria + a project-rule pass.
**Status:** RED — 38 fail cleanly via the `need()` RED-contract guard; 1 (the no-throttle *negative* guard) passes trivially on the empty module by construction (it asserts the ABSENCE of a throttle export). No import/syntax/collection crash. **0 pre-existing regressions** (64 rb1 tests still green).

**Acceptance Criteria (authored by TEA from epic §3 / findings §2 — none were in the YAML):**
- **AC-1 — PLDELY pitch table:** `PITCH_TABLE` === the 11 POTDLY bytes `[-32,-23,-17,-10,-5,0,4,8,13,18,25]`; centre = 0; asymmetric (dive −32 faster than climb +25); `pitchDelta` is discrete, monotone, and clamps out-of-range pots to the ends.
- **AC-2 — PFROTN bank coupling:** `pfrotn(r)` = `r×8`, sign-preserving, hard-clamped to `±0x100`.
- **AC-3 — PLDELX inertia + hysteresis:** a full turn does not snap in one frame; turnRate ramps monotonically, converges, is jitter-free at rest, mirror-symmetric L/R, and saturates the bank clamp under full deflection; `TURN_HYSTERESIS` === 2.
- **AC-4 — I4YPOS altitude clamp:** bounds `ALT_MIN`=8*4, `ALT_MAX`=180*4; `INITIAL_FLIGHT.altitude` === `0x210` (528); a held dive/climb never breaches the floor/ceiling and settles on it.
- **AC-5 — DISCHK feel:** bands exactly near 1.0 / mid 0.625 / far 0.375; pan and altitude deltas scale near>mid>far.
- **AC-6 — turn pans the world:** heading accumulates (+right/−left), keeps accumulating while held, untouched wings-level.
- **AC-7 — drives the rb1 flightView camera:** neutral → LEVEL; roll tilts the REAL `horizonSegments` (opposite L/R, clamp-bounded); pitch slides it vertically (climb/dive opposite); pure yaw stays flat; `toEye` = `[0, alt→y, 0]` and higher altitude drops a ground point through the real `flightView`; a full attitude yields a valid finite Mat4.
- **AC-8 — no throttle:** centred yoke drifts nothing; no throttle/speed/velocity export exists.
- **AC-9 — pure & deterministic:** `step` is deterministic, does not mutate its input, and never mutates `INITIAL_FLIGHT`.

### Rule Coverage (typescript lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 readonly / no param mutation | "step does not mutate its input state"; "INITIAL_FLIGHT is a stable constant" | failing (RED) |
| #3 string union over enum + exhaustiveness | "DISCHK covers exactly the three ProximityBand values" | failing (RED) |
| #4 `\|\|` vs `??` on falsy-valid 0 | "center pot maps to step 0 — a real value, not a default"; "wings level leaves heading untouched" | failing (RED) |
| #8 test quality (meaningful asserts, no `as any`) | self-audit across all 39 tests | pass (self-check) |
| #1 type-safety escapes (`as any`) | reviewer/static check — test file uses no `as any` | static |

**Rules checked:** 5 of 13 lang-review checks are APPLICABLE to a pure, synchronous, I/O-free deterministic math module; #2/#3/#4 have failing coverage, #8 is self-audited, #1 is a static/reviewer concern. **N/A here:** #5 modules, #6 React/JSX, #7 async/Promise, #9 build-config, #10 input-validation (no external/user input — `proximity` is a typed union), #11 error-handling (no throws/async), #12 perf/bundle, #13 fix-regressions (no fixes yet).
**Self-check:** no vacuous assertions, no `let _ =`, no `assert(true)`; every test asserts a concrete value/relationship. The single RED-passing test is a deliberate negative guard (absence of a throttle export), documented above — not a vacuous positive.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement `red-baron/src/core/flight.ts` to satisfy the 39-test contract. Contract exports: `PITCH_TABLE`, `BANK_LIMIT`, `ALT_MIN`, `ALT_MAX`, `TURN_HYSTERESIS`, `DISCHK`, `ProximityBand`, `INITIAL_FLIGHT`, `pitchDelta`, `pfrotn`, `step`, `toAttitude`, `toEye`, plus the `FlightInput`/`FlightState` interfaces.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/flight.ts` (new) — the pot-yoke flight model: `PITCH_TABLE`/`pitchDelta` (POTSCL/POTDLY), `pfrotn` (PLDELX×8 clamp `0x100`), `easeTurnRate` (step-limited inertia + 2-count hysteresis), `step` (calc-frame sim; DISCHK-scaled pan + altitude clamp), and the `toAttitude`/`toEye` camera bridge. Pure, deterministic, frozen constants.
- `red-baron/src/main.ts` (wired) — replaced the rb1-3 sinusoid demonstrator with a keyboard yoke → `FlightInput` → `step` (ticked at `SIM_TIMESTEP_S`, findings §1) → `toAttitude` → tilting horizon; fixed-timestep loop with a catch-up cap.

**Tests:** 102/102 passing (GREEN) — `flight.test.ts` 39/39, all rb1 suites intact (cockpit-boot 6/6 preserved). `tsc --noEmit` clean; `vite build` succeeds.

**Branch:** `feat/rb2-1-flight-model-turn-pitch` — committed locally (RED `f099407`, model `10a0e7e`, wiring `6cb06f3`). **Not pushed / no PR** — red-baron has no remote (epic guardrail: stories land via local merge to `develop`).

**Self-review:** ROM data pinned to the byte; no `as any`, no `||`-on-falsy (0 is a valid command everywhere), `??`-safe; `readonly` interfaces + frozen constants; `step` is pure (verified by the no-mutation tests); the sim ticks at the calc-frame rate, dodging the ÷N fidelity trap; core is wired to the runnable cockpit.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 real smells (102/102 green, build pass) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge cases assessed by Reviewer ([EDGE] below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SILENT] below) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (1 high, 5 medium) | confirmed 6, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments assessed by Reviewer ([DOC] below) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types covered by rule-checker ([TYPE] below) |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — simplicity assessed by Reviewer ([SIMPLE] below) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (all pre-existing rb1, 0 new) | confirmed 0 new, noted 3 pre-existing |

**All received:** Yes (4 ran, 2 with findings; 5 disabled and assessed by the Reviewer)
**Total findings:** 1 confirmed blocking (high), 5 confirmed non-blocking (medium), 3 noted pre-existing (not rb2-1 regressions), 0 dismissed

## Reviewer Assessment

**Verdict:** REJECTED

The rb2-1 CODE is exceptionally clean — but the TEST NET has a proven hole on a story-title feature (2-count turn hysteresis), and the sim's ÷6 fidelity-trap guard is untested. A foundational story that 11 siblings build on does not ride eternal on an unverified headline AC.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | 2-count turn hysteresis (a story-*title* AC) is provably unverified — mutation testing shows deleting `easeTurnRate`'s deadband keeps all 39 tests green (matches lang-review #8 "assertion passes even if behaviour is wrong"; cannot be dismissed) | `tests/core/flight.test.ts:283` | Seed a mid-deadband state: `step(withState({turnRate:39}), IN(1,0)).turnRate === 39` (stays) and `turnRate:37` (moves) |
| [MEDIUM] | ÷6 fidelity-trap guard (`main.ts` fixed-timestep accumulator) has zero test coverage | `tests/cockpit-boot.test.ts` | Structural check: `main.ts` imports `SIM_TIMESTEP_S` and gates `step()` in an accumulator loop |
| [MEDIUM] | PITCH_TABLE boundary thresholds not pinned (only monotonicity + membership) | `tests/core/flight.test.ts:192` | Pin a boundary: `pitchDelta(-0.9)===-32`, `pitchDelta(-0.89)===-23` |
| [MEDIUM] | "no throttle" guard checks export names, not the returned state shape | `tests/core/flight.test.ts:505` | `expect(Object.keys(step(...)).sort()).toEqual(['altitude','heading','pitchRate','turnRate'])` |
| [MEDIUM] | "valid Math-Box view" test is finiteness-only (wouldn't catch a wrong compose order/sign) | `tests/core/flight.test.ts:485` | Transform a known point / compare to a reference matrix (as the eye-position test already does) |
| [MEDIUM] | `step()` doesn't clamp `turn` (unlike `pitchDelta`'s pot clamp); `clamp(NaN)` poisons state (defensive — unreachable from the shell) | `src/core/flight.ts:152` | Clamp `turn` to [-1,1] and/or document+test the finite-input contract |

**Blocking:** the [HIGH] hysteresis-coverage gap. The five [MEDIUM]s are non-blocking individually but must ride along in the same rework — we are already going back, and the net should be whole.

### Rule Compliance (typescript lang-review #1–#13 + 2 house rules)

Exhaustively enumerated by [RULE] reviewer-rule-checker across 61 instances; independently spot-checked by me.
- **#1 type-safety escapes** — new code: clean (no `as any`, no `!`, no `@ts-ignore`). Pre-existing rb1 `main.ts:21` `as HTMLCanvasElement` noted (unchanged, `#game` exists in index.html, `ctx` null-guarded).
- **#2 generics/interface** — PASS: `FlightInput`/`FlightState` all `readonly`; `PITCH_TABLE`/`DISCHK`/`INITIAL_FLIGHT` frozen; `DISCHK` is `Readonly<Record<ProximityBand,number>>` (not `Record<string,any>`).
- **#3 enums** — PASS: `ProximityBand` is a string union (preferred); `DISCHK`'s `Record<ProximityBand,…>` enforces exhaustiveness at compile time. Zero `enum` keywords.
- **#4 `||` vs `??`** — the load-bearing check here: `flight.ts` has ZERO `||`/`??` — every 0-valid quantity (turn/pitch/heading/altitude) is safe. Pre-existing rb1 `main.ts:25-26` `clientWidth || innerWidth` noted (unchanged).
- **#5 modules** — PASS: `import type` used correctly; no `.js` needed under `moduleResolution:bundler` (matches camera.ts/horizon.ts).
- **#6 React/JSX** — N/A (Canvas 2D, no JSX).
- **#7 async** — PASS: only the test's `beforeAll` dynamic import; production code is pure sync.
- **#8 test quality** — VIOLATION: the hysteresis assertion is vacuous (see [TEST] F1). Also the [MEDIUM] existence-only checks (F4/F5). No `as any` in tests; mock mirror matches the real exports.
- **#9 build/config** — N/A (tsconfig unchanged); strict + noUnusedLocals on; build green.
- **#10 input-validation** — PASS/N/A: no external string input; keyboard collapses through `axis()` to {-1,0,1}; `proximity` is a typed union.
- **#11 error-handling** — PASS: no throws/async in production; the test `catch {}` is documented/intentional and `need()` re-raises specifics.
- **#12 perf/bundle** — PASS: subpath import (not the barrel); no hot-path stringify/fs.
- **#13 fix-regressions** — N/A (first-pass review).
- **house: src/core purity** — PASS: no Date/random/DOM in flight.ts (grep-verified).
- **house: frozen/readonly** — PASS: matches camera.ts/timing.ts precedent.

### Observations (tagged, ≥5)

- [TEST] **BLOCKING** — hysteresis deadband never exercised; mutation-proven vacuous on a story-title AC. `tests/core/flight.test.ts:283`. I independently confirmed: ramp deltas are {40,32,24,16,8,0}, so the `|delta|<=2` branch only fires at delta=0 (where no-hysteresis is identical). No test seeds a turnRate in the (0,2] window.
- [TEST] — the ÷6-trap guard (main.ts accumulator) and three existence-only/boundary weaknesses (F2/F4/F5) confirmed as medium hardening.
- [RULE] — zero new violations across 61 instances; the 3 matches are pre-existing rb1 lines (`main.ts:21`, `:25`, `:26`), confirmed unchanged via `git show develop:src/main.ts`. New code is model-clean.
- [SEC] — clean: no backend/network/persistence; the only external input (KeyboardEvent.key) is bounded to a Set of literal key-names and never reaches a DOM sink; rAF accumulator caps catch-up (no spiral). High confidence.
- [EDGE] (edge-hunter disabled — Reviewer-assessed) — clamps hold at exact bounds (verified by tests at ALT_MIN/ALT_MAX, pfrotn at ±0x100). Gap: NaN/out-of-range `turn` unguarded (see [MEDIUM] #6) — defensive only; `axis()` never emits NaN.
- [SILENT] (silent-failure-hunter disabled — Reviewer-assessed) — no swallowed errors in production code; the test's `catch { f = {} }` is the documented RED-safe pattern and re-raises named errors via `need()`. No silent fallbacks in `step`/`toAttitude`/`toEye`.
- [DOC] (comment-analyzer disabled — Reviewer-assessed) — VERIFIED good: doc comments cite findings §2/§5 with ROM labels (POTDLY, PFROTN, I4YPOS) and match the code; the `XXX XQQA` string is the ROM bit-format, not a TODO. No stale/misleading comments.
- [TYPE] (type-design disabled — Reviewer-assessed, covered by rule-checker) — VERIFIED good: string-union `ProximityBand`, readonly interfaces, `Vec3`/`Attitude` type-imports, no stringly-typed API, no unsafe casts in new code.
- [SIMPLE] (simplifier disabled — Reviewer-assessed) — VERIFIED good: minimal, no dead code, no over-engineering; `easeTurnRate`/`axis`/`clamp` are tight helpers; redundant `bank` state was (correctly) NOT stored — `toAttitude` derives it via `pfrotn`.
- [VERIFIED] data flow: keydown → `held` Set → `readInput()` → `FlightInput` → `step()` @ `SIM_TIMESTEP_S` → `FlightState` → `toAttitude()` → `horizonSegments()` → canvas stroke. Pure, no I/O, no injection surface — evidence: `main.ts:70-116`, `flight.ts:152-185`.
- [VERIFIED] wiring: core `flight.ts` is consumed by the runnable cockpit (`main.ts`) AND the 39 tests — no orphan module. Evidence: `main.ts:18` imports `step`/`toAttitude`/`INITIAL_FLIGHT`.
- [LOW] `held` Set stuck-key on focus loss (alt-tab mid-hold → key never released → plane keeps turning). Non-blocking demonstrator UX; suggest `window.addEventListener('blur', () => held.clear())`. Deferred to the rb2-12 playtest.

### Devil's Advocate

Argue the code is broken. A confused user mashes every key at once: turn and pitch both saturate — the plane banks to the 45° clamp and climbs; altitude pins at 720, bank at 0x100; nothing crashes, the horizon just tilts and slides to its limits. Fine. Now the malicious/edge angle: a caller (not the shell) invokes `step` with `turn = NaN`. `input.turn * MAX_TURN = NaN`; `easeTurnRate(0, NaN)`: `delta = NaN`, `Math.abs(NaN) <= 2` is `false`, so it takes the else branch → `0 + Math.sign(NaN) * Math.min(8, NaN)` = `0 + NaN * NaN = NaN`. turnRate is now NaN forever — every subsequent heading is NaN, and `toAttitude` yields NaN yaw. The sim is permanently poisoned with no self-heal. The shell never produces NaN (`axis()` returns -1/0/1), so this is unreachable today, but the public `step` contract doesn't defend it — hence [MEDIUM] #6. Next, the stressed environment: the tab is backgrounded for ten minutes, then foregrounded — `nowMs - lastMs` is enormous, but `Math.min(..., 0.25)` caps the accumulator, so at most ~3 sim steps fire; no spiral, no freeze. Good. The confused user alt-tabs while holding Right: `keyup` never arrives, the key stays in `held`, and the plane turns forever until they press and release Right again — a real UX papercut ([LOW], deferred to playtest). What about a stressed filesystem or config with unexpected fields? There is no filesystem, no config, no network, no persistence — the entire surface is a canvas and a keyboard. What would a future maintainer misunderstand? They might "simplify" the loop to `step()` once per rAF frame — running the sim ~6× too fast (the exact ÷N trap findings §1 warns of, and the Asteroids ÷4 regression in project memory) — and NO test would catch it, because the accumulator is unverified ([MEDIUM], and the reason this bundles into the rework). Finally, the headline risk: someone deletes the hysteresis line during a refactor; the plane's turn-rate now snaps within 2 counts instead of easing — and the suite stays green. That is the single most important thing this review found, and it is why this rides back.

### Handoff

Back to Furiosa (TEA) for **red rework** — strengthen the coverage net (the [HIGH] hysteresis test is required; the five [MEDIUM]s ride along). The production code is sound and needs no change for the blocker; the [MEDIUM] `turn`-clamp is an optional defensive hardening. You will ride eternal, shiny and chrome — once the net is whole.

## Dev Rework (round-trip 1)

**Round-trip:** 1 (routed to green per the approval gate's `reviewer-verdict` recovery config)
**All 6 reviewer findings closed** — commit `51bdc22`:

| Finding | Resolution | Test |
|---------|-----------|------|
| [HIGH] hysteresis deadband vacuous | added a state-seeded deadband test tied to `TURN_HYSTERESIS`: Δ≤hyst held, Δ>hyst eased — mutation-kills the deleted-deadband case | `flight.test.ts` AC-3 "holds turnRate inside the TURN_HYSTERESIS deadband…" |
| [MED] ÷N-trap guard untested | structural guard: `main.ts` must gate `step()` inside a `while (… SIM_TIMESTEP_S)` accumulator (not per rAF) | `cockpit-boot.test.ts` "steps the sim inside a SIM_TIMESTEP_S accumulator…" |
| [MED] pitch-table boundary not pinned | pin round-to-nearest across a step midpoint (catches floor/ceil) | `flight.test.ts` AC-1 "rounds the pot to the NEAREST step…" |
| [MED] no-throttle checks export names only | lock the returned `FlightState` shape to exactly the 4 axes | `flight.test.ts` AC-8 "…exactly the four documented axes…" |
| [MED] "valid view" existence-only | assert the eye maps to the origin (real camera translation), not just finiteness | `flight.test.ts` AC-7 "…the pilot eye maps to the origin…" |
| [MED] `step()` turn unclamped | clamped `turn` to [-1,1] in `step()` (mirrors `pitchDelta`'s pot clamp) + test | `flight.ts:step`; `flight.test.ts` AC-3 "clamps an out-of-range turn command…" |

**Code change:** one line in `src/core/flight.ts` (`clamp(input.turn, -1, 1)`); the rest is test hardening — the production dynamics were already correct.
**Tests:** 109/109 passing (was 102; +5 flight, +2 cockpit-boot). `tsc --noEmit` clean; `vite build` succeeds.
**Handoff:** Back to Reviewer (Immortan Joe) for re-review.

## Subagent Results — Re-Review (round-trip 1)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (109/109 green, build clean, no delta smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled — delta edge cases (clamp, boundary) assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled — no error paths in delta |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (mutation-proven: ÷N-guard + eye-origin) | confirmed 2, dismissed 0; verified 4 prior fixes RESOLVED |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled — delta comments assessed by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled — covered by rule-checker |
| 7 | reviewer-security | Yes (carried fwd) | clean | 0 | Round-0 clean; delta = a clamp + grep-tests → zero new attack surface (self-verified) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled — delta assessed by Reviewer (minimal) |
| 9 | reviewer-rule-checker | Yes | clean | 0 (delta: clamp #4-compliant, no `as any`) | N/A |

**All received:** Yes (3 re-run on the delta, 1 carried forward; 5 disabled)
**Total findings:** 0 blocking-by-code, 2 confirmed test-quality (both mutation-proven, both lang-review #8), 0 dismissed

## Reviewer Assessment — Re-Review (round-trip 1)

**Verdict:** REJECTED

The blocker IS fixed and the code is correct — but two of the fixes I required are mutation-proven not to catch the bug they name. A guard that gives false confidence on the project's #1 regression risk (the ÷N trap) is worse than no guard. One more short pass.

**Confirmed RESOLVED (mutation-verified by [TEST]):**
- [HIGH → cleared] hysteresis deadband — deleting `easeTurnRate`'s deadband now fails the new AC-3 test (`expected 40 to be 38`). Genuine.
- [MED → cleared] pitch-table boundary — `floor`/`ceil` mutations each fail the new AC-1 test.
- [MED → cleared] no-throttle shape — a stray `speed` field on the returned state fails the new AC-8 test.
- [MED → cleared] `turn` clamp — removing the clamp fails the new AC-3 test (`expected 200 to be 40`).

**Still open (this round's blockers):**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | ÷N-trap guard is mutation-proven ineffective — the regex only proves a `while(…SIM_TIMESTEP_S…)` exists *somewhere*, not that `step()` runs *inside* it. Moving `step()` outside a vestigial loop (the exact ÷6 regression, findings §1) passes all 8 cockpit-boot tests. Severity derives from the risk it fails to guard (the project's #1 regression class), not a code bug. Matches #8 | `tests/cockpit-boot.test.ts` (the SIM_TIMESTEP_S accumulator test) | Require `step(` inside the matched while-block body, e.g. `/while\s*\([^)]*SIM_TIMESTEP_S[^)]*\)\s*\{[^}]*\bstep\s*\(/` (verified: matches current main.ts, fails the step-outside-loop mutation) |
| [MEDIUM] | eye-maps-to-origin test is tautological — `transform(view, eye)→origin` for ANY `rotate∘translate(−eye)` matrix; wrong `ALT_TO_Y` scale and negated `roll` both pass. Cannot catch the mis-wired `toEye`/`toAttitude` its comment claims. Matches #8 | `tests/core/flight.test.ts` AC-7 ("…the pilot eye maps to the origin") | Remove it (redundant — `flightView` eye-translation is covered in camera.test; `toEye`/`toAttitude` are covered directionally in the other AC-7 tests), OR replace with a discriminating check (e.g. `toEye`'s altitude→y is linear/proportional). Do NOT keep the false "catches a mis-wired toEye" claim. |

### Observations (tagged)

- [TEST] BLOCKING (÷N-guard) and [TEST] MEDIUM (eye-origin) — both mutation-proven ineffective; see table. The other 4 prior findings verified genuinely RESOLVED by mutation testing.
- [RULE] — delta PASS, 0 violations: `clamp(input.turn,-1,1)` is #4-compliant (`clamp(0)=0`), no `as any` in the 7 new tests, `tsc` clean.
- [SEC] — carried forward (round-0 clean); the delta adds only a numeric clamp and grep-style structural tests — zero new attack surface. Self-verified.
- [EDGE] (disabled — Reviewer-assessed) — the new `turn` clamp handles out-of-range (tested); `clamp(NaN)` still propagates NaN (documented defensive residual, unreachable from `axis()`), not blocking.
- [SILENT] (disabled — Reviewer-assessed) — no swallowed errors in the delta.
- [DOC] (disabled — Reviewer-assessed) — the two weak tests' COMMENTS overclaim (they name bug classes they can't catch); fixing the tests must also fix/remove those claims.
- [TYPE] (disabled — covered by [RULE]) — no new types; clamp signature clean.
- [SIMPLE] (disabled — Reviewer-assessed) — delta is minimal; no over-engineering.

### Devil's Advocate

The strongest case for approving now: the code is correct, the blocker is genuinely dead, four of six fixes are mutation-verified, and the two survivors are test-guard tightness on behavior that is *actually right* and *covered elsewhere* — `toEye`/`toAttitude` by the directional AC-7 tests, the calc-frame tick by a correct `main.ts`. Ship it, file two nits. The counter — and why I reject: I explicitly *required* the ÷N guard in round 0, and it is mutation-proven to miss the realistic regression (step outside a surviving loop). Merged "follow-up nits" on a green story evaporate; what remains is a guard that reads as protection against the exact trap this project has been bitten by before (Asteroids ÷4) while providing none. That is false confidence on the highest-risk class — the single thing a reviewer exists to prevent. The eye-origin test compounds it: a test that *looks* numeric and claims to catch a mis-wired camera, but passes under a 28× wrong altitude scale. Both are ~5-minute fixes with the exact regex/removal given above. The cost of one more green pass is small; the cost of shipping a guard that doesn't guard is paid later, silently, by whoever "simplifies" the loop.

### Handoff

Back to The Word Burgers (Dev) for **green rework** (round-trip 2) — strengthen the ÷N-guard regex to require `step(` inside the accumulator block, and remove/replace the tautological eye-origin test (drop its false claim). No production-code change needed; the dynamics and `main.ts` are correct. Ride eternal once the guards actually guard.

## Dev Rework (round-trip 2)

**Round-trip:** 2 (green rework). Both re-review findings closed — commit `7781de7`, **tests only, no production change**:

| Finding | Resolution | Verification |
|---------|-----------|--------------|
| [HIGH] ÷N-trap guard ineffective | strengthened the regex to `/while\s*\([^)]*SIM_TIMESTEP_S[^)]*\)\s*\{[^}]*\bstep\s*\(/` — requires `step(` INSIDE the accumulator block | mutation-verified in a node harness: **matches** the real `main.ts` (step in loop) → true; **rejects** the step-outside-vestigial-loop mutant → false |
| [MEDIUM] eye-origin test tautological | removed it (its compose sign/order concern is already pinned by the AC-7 horizon tilt/slide/pure-yaw tests, which drive the real camera); kept the finite-view smoke check with an honest, unclaimed comment | n/a — removal |

**Tests:** 108/108 passing (was 109; −1 removed tautological test, cockpit-boot guard strengthened in place). `tsc --noEmit` clean; `vite build` succeeds.
**Handoff:** Back to Reviewer (Immortan Joe) for re-review (round-trip 2).

## Subagent Results — Re-Review (round-trip 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (108/108 green, build clean, test-only delta) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled — no code delta this round |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled — no error paths |
| 4 | reviewer-test-analyzer | Yes | clean | 0 (both RT1 findings verified RESOLVED, mutation-tested) | confirmed 0, both prior fixes genuine |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled — delta comments assessed by Reviewer (honest, unclaimed) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled — no types changed |
| 7 | reviewer-security | Yes (carried fwd) | clean | 0 | Test-only delta (regex + a deletion) → zero attack surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled — delta reduces test surface (a removal) |
| 9 | reviewer-rule-checker | Yes (carried fwd) | clean | 0 | Test-only delta: no new code constructs/types; `tsc` clean, no `as any` |

**All received:** Yes (2 re-run on the delta, 2 carried forward; 5 disabled)
**Total findings:** 0 — both RT1 findings mutation-verified RESOLVED; no new issues

## Reviewer Assessment — Re-Review (round-trip 2)

**Verdict:** APPROVED

Every finding across three review rounds is closed and mutation-verified. The code was correct throughout; the two reject cycles hardened the test net around the story's headline AC (hysteresis) and the project's #1 regression risk (the ÷N trap). The net now catches what it claims.

**Journey:** RT0 review → 1 HIGH (vacuous hysteresis) + 5 MED → RT1 fixed 4 genuinely, 2 fixes mutation-proven ineffective → RT2 fixed both (÷N-guard now requires `step(` inside the accumulator; tautological camera test removed). Independently mutation-verified by me (regex kills step-outside-loop AND step-per-rAF) and by [TEST].

**Data flow traced:** keyboard `keydown` → `held` Set → `readInput()` → `FlightInput{turn,pitch,proximity}` → `step()` ticked at `SIM_TIMESTEP_S` (the 96 ms calc frame, findings §1) → `FlightState` → `toAttitude()`/`toEye()` → `horizonSegments()`/`flightView()` → canvas stroke. Safe: pure deterministic core, no I/O, no injection surface; `turn` now clamped to the yoke range.

**Pattern observed:** ROM-faithful pure sim (`src/core/flight.ts`) driving the rb1 shared-Math-Box camera; frozen constants + readonly interfaces matching the camera.ts/timing.ts house style; the calc-frame accumulator (`src/main.ts:107-116`) correctly decoupling the sim tick from the display rate — the load-bearing fidelity constraint.

**Error handling:** no throws/async in the pure core; the shell guards the 2D context (`if (!ctx) return`, `main.ts`); out-of-range `turn` clamped (`flight.ts:156`); altitude/bank hard-clamped to ROM bounds. `clamp(NaN)` residual is unreachable from `axis()` and documented.

**Tags:** [TEST] clean (RT1 findings resolved, mutation-tested) · [SEC] clean (carried fwd — no new surface) · [RULE] clean (carried fwd — test-only, `tsc` green) · [EDGE] clamps/boundaries covered; NaN documented-defensive · [SILENT] no swallowed errors · [DOC] the weak tests' overclaiming comments removed/corrected · [TYPE] no type changes · [SIMPLE] delta net-reduces test surface, no over-engineering.

**Rule Compliance:** all lang-review checks PASS across the story (exhaustively verified RT0 across 61 instances; RT1/RT2 deltas re-checked clean). #4 (`||` vs `??`) — the load-bearing check for this numeric sim — is spotless; the only pre-existing matches (`main.ts` DOM cast + `clientWidth||`) are unchanged rb1 lines.

**Deviation audit:** all 5 logged deviations (TEA ×3, Dev ×2) stamped ACCEPTED in the RT0 audit; RT1/RT2 reworks added no new deviations. Audit stands.

**Handoff:** To The Organic Mechanic (SM) for finish-story. **Do not merge here** — SM owns the finish ceremony; red-baron lands via a local merge to `develop` (no remote, no PR). Note the user's rb2-12 live-playtest is the venue for the deferred jsdom/browser check and the DISCHK `'far'`-vs-`'mid'` feel question. You ride eternal, shiny and chrome.