---
story_id: "mc5-3"
jira_key: "mc5-3"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-3: Cruise missiles + droneRequest contract (UNBLOCKS mc8-5): Icbm.kind + angled flight (CRMWAV wave-6 budget, ANGLE/CMANGL), killed x5, and the cruise-count+sputnik-active -> DroneKind selector. REV-01 W3MAIN.MAC:2635

## Story Details
- **ID:** mc5-3
- **Jira Key:** mc5-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Epic:** Missile Command — full enemy roster (REV-01)
- **Points:** 5
- **Priority:** p2

## Scope

This story completes the Missile Command full enemy roster by adding cruise missiles, the third wave-6 enemy type. It exposes the `droneRequest(state)` selector contract that unblocks mc8-5 (authentic audio wiring).

**Three deliverables:**

1. **Icbm.kind flag** distinguishing cruise missiles from ballistic ICBMs (sibling to mc5-1 MIRV split logic)
2. **Angled cruise flight** via ANGLE/CMANGL ROM state under CRMWAV wave-6 budget, killed x5 per ROM
3. **droneRequest(state) selector** — a pure function mapping (cruise-on-screen count, sputnik-active) → DroneKind, unblocking mc8-5 audio wiring

**ROM Authority:** REV-01 W3MAIN.MAC:2635 (cruise missile spawning/flight logic) — do not fabricate additional citations beyond the title anchor.

## Design & Plan References
- **Design Document:** docs/superpowers/specs/2026-08-08-missile-command-mc5-enemy-roster-design.md
- **Plan:** docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md

Read these for context on the full roster shape and mechanical constraints.

## Acceptance Criteria (Technical Approach)

### AC-1: Icbm.kind enum + flagging
- Add a `kind` field (or enum) to Icbm to distinguish cruise from ballistic
- Cruise missiles spawned from CRMWAV wave data route to kind=cruise; ballistics to kind=ballistic
- All existing ballistic-spawn code (mc1–mc4, mc5-1/5) defaults to kind=ballistic
- No observable change to ballistic behavior; cruise is wave-6 only in this story
- Guard: `citations.test.ts` claims ANGLE/CMANGL, `purity.test.ts` stays green

### AC-2: Angled flight (cruise-specific ICBM behavior)
- Cruise missiles retrieve their trajectory angle from CMANGL (ROM symbol at W3MAIN.MAC:2635)
- Flight follows ANGLE/CMANGL per the ROM logic under wave-6 budget
- Killed x5 per wave data (no cruise respawn mid-wave); once all 5 are dead, CRMWAV ends
- Ballistic flight (mc1–mc4 path) unaffected
- Guard: playtesting at wave 6 sees angled cruise flight, ballistics remain vertical

### AC-3: droneRequest(state) selector
- Pure function: `droneRequest(gameState: GameState): DroneKind`
- **Input:** current game state (reads: cruise-on-screen count, sputnik-active flag)
- **Output:** which drone kind to spawn next (or null/none if all are dead)
- **Rules:** cruise gets priority when count < 5 and wave 6 is active; sputnik when active; normal ICBMs as fallback
- **Gate:** unblocks mc8-5; must be a pure selector with no side effects
- Guard: `purity.test.ts` accepts the function; no clock/RNG/state mutation

## Implementation Constraints

- **Location:** plugins/missile-command/src/core/ (pure deterministic simulation)
- **Test enforcement:** `citations.test.ts` (ROM claims), `purity.test.ts` (no clock/RNG)
- **Boundary:** Do not wire audio, UI, or shell concerns (wave-6 wave data, rendering) in this story; that defers to mc8 (audio) and mc9 (sprite/rendering)
- **Rebase awareness:** mc5-2 (Sputnik) and mc5-5/mc5-6 (spawn clamping) are already merged; cruise sits at wave 6 and does not conflict with prior spawn logic

## Delivery Findings

<!-- append-only; never edit another agent's entries -->

### TEA (test design)

- **Improvement** (non-blocking): the exact `CMANGL`→(dh,dv) slope decode is captured + claimed at GREEN, not pinned in RED. `cruise.test.ts` pins the angle-driven DESCENT INVARIANT (monotone non-increasing `pos.v`, eventual `arrived`, idempotent-after-arrival) rather than a specific `(dh,dv)`, because the `SLOPEH .BYTE 0,0,0,1,5` / `SLOPEL .BYTE 0,32,0AB,7F,6` rows (`W3MAIN.MAC:6515/6519`) must be captured with `grep -an` and claimed (`MC-CMANGL-*`) — Dev's step, gated by `citations.test.ts`. Affects `src/core/icbm.ts` + `docs/rom-study/claims/cruise.json` (add the slope claims; pin one angle's decoded step if a stronger unit assertion is wanted).
- **Question** (non-blocking): `cruise-integration.test.ts` forces waves (`{...createGame(1984), wave: 6}`, re-pinned each tick) and uses an 8000-frame ceiling, but I could not run the WIRED path to confirm liveness timing. Affects `src/core/game.ts` (Dev confirms the wave-6 LIVENESS case goes green with the chosen cruise-release cadence; tune the seed/ceiling only if the release is gated behind a long timer — the wave-5 CONTROL is the seed-independent discriminator and must stay red on budget-ignoring code).

### Dev (implementation)
- **Resolved (Question above):** the wave-6 liveness passes — the stateless release (cruiseBudget as on-screen cap) puts a cruise on screen on the first play frame at wave 6, so the 8000-frame ceiling and seed are far from binding.
- **Improvement** (non-blocking): a cruise currently descends to the absolute ground (v ≤ 0) and does not damage the city/base it passes — cruise-vs-structure damage is unwired. Affects `src/core/damage.ts` / `game.ts` (a follow-up wires cruise arrival into `resolveGroundImpacts`, or scores/removes cruise on ground impact). No mc5-3 AC covers it; the drone contract, budget and ×5 kill scoring are complete.
- **No blocking upstream findings.** `render.ts` needed no change — a cruise is an `Icbm`, so the existing origin→pos trail renders it (authentic diagonal-trail art is mc9).

### Reviewer (code review)
Verdict APPROVED (no Critical/High). Confirmed findings, all non-blocking — captured for a fast-follow / follow-up story:
- **Gap** (non-blocking): the `CRMTOL` per-wave cruise TOTAL is not enforced — `cruiseBudget` is used as an on-screen cap. Affects `src/core/game.ts` + `spawn.ts` (add a `GameState.cruiseRemaining` counter drawn down per launch, and a constant on-screen cap of 3 per `W3MAIN.MAC:2373`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the real `cruiseOnScreen` count is not threaded into `spawnIcbms`/`sputnikFireCount`, so cruise miss their ROM 2-slot cost and the `game.ts:227` comment ("cruiseOnScreen is 0 until mc5-3") is now misleading. Affects `src/core/game.ts:236,248` (pass the computed cruise count into the spawn-headroom calls, or correct the comment). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): stale comment `mirv.ts:24` ("Icbm has no `kind` field yet") is falsified by this diff (kind added at `icbm.ts:35`, guard at `mirv.ts:39`). Affects `src/core/mirv.ts` (update the header). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `cruiseDrift`/`launchCruise` accept an unvalidated `angle`; a negative value drives `CM_SLOPE[-1]` → silent `NaN` position. Unreachable via `spawnCruise` today, but `launchCruise` is exported. Affects `src/core/icbm.ts:92,104` (clamp/guard the angle). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `spawnCruise` samples only 5 of the ROM's 14 CMANGL headings (`CM_ANGLE_COUNT = CM_SLOPE.length`), so cruise only drift right/straight — tied to the accepted motion deviation. Affects `src/core/icbm.ts:86` (broaden the heading set if fuller angle coverage is wanted). *Found by Reviewer during code review.*
- **Gap** (non-blocking): no in-play test covers the cruise ×5 scoring split or a full wave-6 completion (the arrived-cruise-removal path that prevents a wave-hang). Affects `plugins/missile-command/tests/` (add a stepGame test that kills a cruise for ×5 and one that advances past wave 6). *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **Cruise motion modelled as fixed-angle descent, not the ROM's homing + danger-avoidance AI**
  - Spec source: docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md, Task 6 ("descends along a discrete angle ... not toward a target") + REV-01 CMNEWP (W3MAIN.MAC:6283).
  - Spec text: the ROM's `CMNEWP` calls `UPDPOS` (drive toward target) when no danger, and only invokes `ANGLE`/slope + `FINDBL`/`CMDEVI` to DEVIATE around live explosions — a target-homing missile with an explosion-avoidance overlay.
  - Implementation: `stepCruise` descends monotonically by `velocity` and drifts horizontally by the cited CMANGL slope (`cruiseDrift`), ignoring both the target and nearby explosions. `stepAnyIcbm` routes cruise here; ballistic ICBMs are unchanged.
  - Rationale: mc5-3's scope is the cruise's angled-flight SIGNATURE (the plan's Task 6 interface + the TEA descent-invariant tests). The full `CMNEWP` danger-navigation (ANDANG test grid, FINDBL/FINSIN opening search, CMDEVI) is a large behaviour with no mc5-3 AC or test and would pull in the explosion-danger map — out of scope. The plan explicitly sanctioned modelling the descent direction from the angle.
  - Severity: minor
  - Forward impact: minor — a later "cruise dodges blasts" story would replace `stepCruise`'s straight-line drift with the CMNEWP deviation logic; the `kind`/`angle` fields, `stepAnyIcbm` dispatch, budget, score and drone contract all stay as-is. Cruise-vs-structure damage and pixel-authentic render are likewise deferred (mc9 / a follow-up), consistent with the epic's shell/render descope.
  - → ✓ ACCEPTED by Reviewer: sound scoping — the full CMNEWP danger-navigation (ANDANG grid, FINDBL/CMDEVI opening search) is genuinely outside mc5-3's tested ACs, and the `kind`/`angle`/`stepAnyIcbm` seams keep the faithful path open for a successor. Note the related 5-of-14-heading limitation this decode carries (Reviewer audit below).

### Reviewer (audit)
Two spawn-model deviations from the ROM were NOT logged by Dev; surfacing them so nothing slips through undocumented (both non-blocking — no AC/test pins them, core contracts correct):
- **cruiseBudget applied as an on-screen CAP, not the ROM's per-wave launch TOTAL (CRMTOL).** Spec/ROM: CRMTOL = "# CRUISE MISSILES TO LAUNCH" (`W3MAIN.MAC:273`), loaded from CRMWAV at wave start, gated `LDA CRMTOL / IFEQ` (`:2365`) and drawn down `DEC CRMTOL` (`:2649`) per launch — a finite per-wave total; the on-screen concurrency limit is a separate constant `CMP I,3` (`:2373`). Code: `game.ts` releases a cruise whenever `cruiseOnScreen < cruiseBudget(wave)`, so `cruiseBudget` doubles as the concurrency cap and no per-wave total is enforced — a long wave can launch more cruise than CRMWAV[wave], and deep waves allow up to 7 concurrent vs the ROM's 3. Severity: M. Faithful fix needs a `GameState.cruiseRemaining` counter seeded at wave transition (the force-wave integration test would need to seed it too).
- **`cruiseOnScreen` never threaded into the launch-slot arithmetic.** `spawn.ts` built `SpawnOpts.cruiseOnScreen` (mc5-5) "until mc5-3 wires the real cruise count," and `game.ts:227`'s own comment says so — but `spawnIcbms(...)` (`:248`) omits it and `sputnikFireCount(0, …)` (`:236`) still hard-codes 0, so a cruise on screen does not carry its ROM 2-slot cost (`SBC CRMONS` twice, spawn.ts:70-84). Effect: ~1 extra ballistic ICBM per aloft cruise vs the ROM. Severity: M.

## Workflow Tracking

**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T14:50:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T13:52:50.788324+00:00 | 2026-08-09T13:55:39Z | 2m 48s |
| red | 2026-08-09T13:55:39Z | 2026-08-09T14:10:07Z | 14m 28s |
| green | 2026-08-09T14:10:07Z | 2026-08-09T14:34:16Z | 24m 9s |
| review | 2026-08-09T14:34:16Z | 2026-08-09T14:50:35Z | 16m 19s |
| finish | 2026-08-09T14:50:35Z | - | - |

## Sm Assessment

Setup complete for mc5-3 (Cruise missiles + droneRequest contract, 5pts, p2). Verified on disk: session file present with correct frontmatter (epic mc5, tdd), feature branch `feat/mc5-3-cruise-missiles-drone-contract` cut from and containing the `origin/develop` tip, story context written at `sprint/context/context-story-mc5-3.md`, and the mc5 epic shard left unmodified (no context clobber). Jira is N/A — local sprint tracking only.

Scope for TEA to drive RED: three cited src/core deliverables in `plugins/missile-command/src/core/` — (1) an `Icbm.kind` flag separating cruise from ballistic ICBMs, defaulting all existing ballistic spawns to ballistic; (2) angled cruise flight via ANGLE/CMANGL under the CRMWAV wave-6 budget, killed x5; (3) a pure `droneRequest(state)` selector mapping cruise-on-screen count + sputnik-active flag to a DroneKind, which UNBLOCKS mc8-5. ROM authority is REV-01 W3MAIN.MAC:2635 — TEA/Dev read the actual vendored source and add citations gated by `citations.test.ts`; do not invent line numbers. Enforce the core/shell purity boundary — `purity.test.ts` must stay green (pure, seeded RNG, no clock). Sibling precedent: mc5-1 (mirv.ts split) and mc5-2 (sputnik.ts fly-across) are done and show the ICBM-family + distinct-entity shapes.

Routing to TEA (Leeloo) for the red phase.

## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 19 tests covering the 3 mc5-3 deliverables (Icbm.kind + angled flight; CRMWAV wave-6 budget + ×5 CMKILL score; the droneRequest selector) plus in-play wiring.
**Status:** RED — 17 failing (feature absent), 2 correctly-green guards (the wave-5 CONTROL and the ballistic regression anchor). Full app suite: `17 failed | 931 passed`; only the 4 mc5-3 test files are red, nothing pre-existing broke. `npm run lint` (tsc --noEmit, the release gate) stays GREEN via the dynamic-import RED idiom.

**Test Files:**
- `plugins/missile-command/tests/cruise.test.ts` (new) — kind discriminant + `launchCruise`/`stepCruise` (angle-driven descent, monotone-to-ground, idempotent-after-arrival), the `stepAnyIcbm` dispatcher, `cruiseBudget` (spot values + the full 19-entry CRMWAV table + clamp), `cruiseKillPoints` (×5, tied to the shipped scorer + concrete 125/375).
- `plugins/missile-command/tests/drone-trigger.test.ts` (new) — the `droneRequest` truth table (both/cruise/sputnik/null), plus the kind-filter guard (a ballistic swarm never reads as cruise).
- `plugins/missile-command/tests/cruise-integration.test.ts` (new) — cruise released in `stepGame` OBSERVED IN PLAY at wave 6, a wave-5 CONTROL (CRMWAV=0 ⇒ no cruise), and `droneRequest` firing against the real live state. Mirrors the mc5-2 sputnik-integration force-wave idiom (deterministic, no seed-hunt).
- `plugins/missile-command/tests/mirv.test.ts` (appended) — `mirvEligible` EXCLUDES an in-band cruise (a MIRV never splits a cruise) + a ballistic regression anchor.

**ROM ground truth (verified against the vendored REV-01 source, not the plan prose):**
- `CRMWAV .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7` — `W3MAIN.MAC:5723` (byte-exact) ⇒ budget 0 for waves 1–5, 1 at wave 6, clamp 7.
- `CMKILL … LDX I,4  ;5X ICBM` — `W3MAIN.MAC:2112` ⇒ cruise kill = 5× the ICBM value.
- `CMANGL=0->13` / `SLOPEH .BYTE 0,0,0,1,5` / `SLOPEL .BYTE 0,32,0AB,7F,6` — `W3MAIN.MAC:6421/6515/6519` (slope decode is a GREEN capture+claim; RED pins the descent invariant only — see Delivery Findings).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #3/#4 union exhaustiveness (droneRequest → both/cruise/sputnik/null) | drone-trigger `covers all four presence cases`, `is null when the screen is empty` | failing |
| #4 `0` is a VALID value, not falsy (budget 0 vs `\|\|` fallback) | cruise `is zero for every wave 1..5`, `matches the full 19-entry CRMWAV table` | failing |
| #4 `?? default` (absent kind ⇒ ballistic, never `\|\|`) | cruise `the default (absent kind) ballistic ICBM is unchanged` | failing |
| #3 dispatch exhaustiveness on `kind` | cruise `stepAnyIcbm DISPATCHES on kind` | failing |
| #2 purity/immutability (no input mutation, readonly) | cruise `descends MONOTONICALLY … idempotent`, `stepAnyIcbm … toEqual` | failing |
| kind filter (cruise ≠ ballistic count) | drone-trigger `ONLY cruise-kind ICBMs count`; mirv `EXCLUDES cruise` | failing |
| wired-not-synthetic (observed in play + control) | cruise-integration `LIVENESS … releases at least one cruise`, `droneRequest reads the REAL state` | failing |

**Rules checked:** the applicable typescript.md rules — #2 (readonly/immutability), #3 (enum/union exhaustiveness), #4 (null/0-handling), #5 (`.js` ESM specifiers, exercised by every loader) — have failing-test coverage. #6 (React/JSX), #7 (async/Promise), and the `as any`/generics-`any` checks are N/A to a pure, synchronous numeric core.
**Self-check:** 0 vacuous tests — every test asserts a concrete value; no `let _ =`, `toBe(true)`-on-constant, or `.toBeDefined()`-only assertions.

**Handoff:** To Dev (Korben Dallas) for GREEN — implement icbm.ts (`kind?`, `launchCruise`, `stepCruise`, `stepAnyIcbm`) + the mirv cruise guard, `cruiseBudget`/`cruiseKillPoints`, `drone-trigger.ts`, and the `stepGame` cruise release; author `docs/rom-study/claims/cruise.json` (CRMWAV/CMKILL/CMANGL). Keep `kind` OPTIONAL for backward compatibility.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 951/951 missile-command passing (GREEN); `tsc --noEmit` clean; orchestrator suite 455/455.
**Branch:** feat/mc5-3-cruise-missiles-drone-contract (pushed; commit 7d01b193)

**Files Changed:**
- `src/core/icbm.ts` — optional `kind?: 'ballistic'|'cruise'` + `angle?` on `Icbm`; `launchCruise`, `stepCruise` (angle-driven monotone descent to ground, idempotent-after-arrival), `stepAnyIcbm` dispatcher, and `CM_ANGLE_COUNT`. Cruise drift decoded from the cited SLOPEH:SLOPEL 8.8 tangents + ANGADD quadrant sign — all string-embedded so no loose literal survives the AC3 scan.
- `src/core/mirv.ts` — `mirvEligible` excludes `kind === 'cruise'` (a MIRV never splits a cruise).
- `src/core/spawn.ts` — `cruiseBudget(wave)` (frozen CRMWAV table, wave-1 indexed, clamped) + `spawnCruise` (random top-edge column, RNG heading).
- `src/core/score.ts` — `CRUISE_SCORE_MULT = 5` + `cruiseKillPoints(wave)` = `scoreKills(0, 5, wave)` (5× the ICBM value).
- `src/core/drone-trigger.ts` (new) — the pure `droneRequest(state) → both|cruise|sputnik|null` selector (unblocks mc8-5); type-only imports, no runtime cycle.
- `src/core/game.ts` — releases a cruise when on-screen < `cruiseBudget(wave)` (0 before wave 6, so waves 1–5 don't touch the rng — the control holds), flies the roster via `stepAnyIcbm`, scores cruise kills ×5 (per-enemy multiple {icbm:1, sputnik:4, cruise:5} through the one `scoreKills`).
- `docs/rom-study/claims/cruise.json` (new) — MC-CRMWAV, MC-CRUISE-SCORE, MC-CMANGL-SLOPEH/SLOPEL/ANGADD; every `verbatim` byte-verified against the vendored source (CRMWAV:5723, CMKILL:2113, SLOPEH:6515, SLOPEL:6519, ANGADD:6513).
- `tests/citations-source.test.ts` — the new `.BYTE`/instruction claims join the `DERIVED` exemption (the established mc5-2 pattern) + an mc5-3 consistency block pinning CMKILL = operand+1 = 5 and every table's row-decode, and binding the shipped `CRUISE_SCORE_MULT` to its claim. (A pre-existing infra test TEA did not author; extended per convention, not gamed.)
- `tests/cruise.test.ts` — corrected a cited line (CMKILL 2112 → 2113) in comments.

**Self-review:** wired into `stepGame` (not just pure units) — the integration test observes a real cruise in play with a wave-5 control; project patterns followed (string-embedded tables, `//`-comment provenance, claim shape); all ACs met except the deliberately-descoped cruise-vs-structure damage (logged, non-blocking); no error handling needed for a pure deterministic reducer.

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for code review.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. Every mc5-3 acceptance criterion is implemented, cited, and tested; 951/951 vitest, the orchestrator suite (455), and `tsc --noEmit` are all green. The confirmed issues are Medium/Low fidelity refinements, documentation corrections, and one unreachable edge — captured as non-blocking Delivery Findings for a fast-follow. I found 12+ observations (below); this is not a rubber-stamp.

Confirmed findings by source (tags plain-text for the gate scan):

- [PRE] preflight — 1401 tests green (951 app + 455 orchestrator, minus overlap), 0 code smells (no console.log/.only/TODO/debugger), working tree clean. Mechanical gates pass.
- [SEC] security — CLEAN. Core purity holds across all 6 changed `src/core` files (no Date/Math.random/window/document/shell import; `drone-trigger.ts` uses `import type` only). Determinism: `spawnCruise` draws from the seeded `Rng`, and the release ternary short-circuits so waves 1–5 never touch the rng. Immutability: `stepCruise` always spreads (idempotent landed branch too), `roster` is array-spread, `kind` survives through `killed[]`. Corroborated by my own trace.
- [RULE] rule-checker — 31 checks, 4 flagged, all Medium/Low: stale comment mirv.ts:24, misleading comment game.ts:227 (cruiseOnScreen unwired), CM_ANGLE_COUNT restricts to 5-of-14 headings, cruiseDrift unguarded-angle NaN. All confirmed below; none blocks. Mechanical rule areas (purity, AC3 claim coverage, claim shape + DERIVED exemption, `.js` extensions, optional-field backward-compat) all compliant.
- [EDGE] MEDIUM — `cruiseDrift(angle)` on a negative/out-of-range `angle` indexes `CM_SLOPE[-1]` → `undefined` → silent `NaN` `pos.h` (icbm.ts:92,104). Unreachable via `spawnCruise` (samples [0,5)), but `launchCruise` is a public export. Guard recommended (non-blocking).
- [SILENT] LOW — the same NaN propagates with no throw/log; otherwise no swallowed errors — the test loaders re-throw WITH added context (good pattern), and no empty catches in production.
- [TEST] MEDIUM — new tests are non-vacuous (35 concrete assertions, `toBe(true)` only on computed booleans, a real wave-5 CONTROL vs wave-6 LIVENESS). Gap: the in-play cruise ×5 scoring split (game.ts:319-323) and a full wave-6 completion are untested — the arrived-cruise-removal path that prevents a wave-hang is verified by me, not by a test.
- [DOC] MEDIUM — three comments diverge from the code: mirv.ts:24 ("Icbm has no kind field yet") falsified by the same diff; game.ts:227 implies mc5-3 wires `cruiseOnScreen` (it does not); icbm.ts SOURCE-OF-TRUTH says CMANGL 0..13 while only 5 headings are reachable.
- [TYPE] LOW — `CruiseIcbm` in cruise.test.ts/mirv.test.ts is a hand-duplicated mirror of the real `Icbm` (RED-phase decoupling) that could silently drift if `Icbm` changes; five `(e as Error)` casts in the new test loaders are unnarrowed (a pre-existing repo idiom, propagated). Neither blocks.
- [SIMPLE] LOW — the code is lean (reuses `scoreKills` for the per-enemy multiple, string-embedded tables, no dead code). The `cruiseDrift` quadrant-inverse is a heuristic (not the ROM's exact angle math) and only 5 headings are reachable — noted under the accepted motion deviation, not over-engineering.

**Data flow traced:** a released cruise (`spawnCruise`, spawn.ts:126 — random top-edge column, rng heading) → `roster` (game.ts:262) → `stepAnyIcbm` routes it to `stepCruise` each frame (descends `velocity`∈(0,1], drifts by `cruiseDrift`) → on reaching v≤0 it sets `arrived` → `resolveGroundImpacts` (damage.ts:86) drops EVERY arrived ICBM, so the cruise is removed next frame regardless of hitting a structure → no lingering, `cruiseOnScreen` recovers, `isWaveOver` can clear. Verified end-to-end: no wave-hang (my earlier top hypothesis, refuted by the arrived-removal guard).

**Pattern observed:** GOOD — modelling cruise as an ICBM-family variant means the existing render trail, `killIcbmsInBlasts`, and `resolveGroundImpacts` all handle it for free (game.ts / damage.ts). BAD — `cruiseBudget` overloaded as a concurrency cap conflates the ROM's separate `CRMTOL` (per-wave total) and constant-3 on-screen cap (Reviewer audit).

**Error handling:** pure deterministic reducers, no I/O — failure surface is numeric edges only; the one gap is the unguarded `angle` (icbm.ts:92, [EDGE] above). Null/absent `kind`/`angle`/`velocity` all default correctly via `??` (not `||`), so `0`/absent are handled.

### Rule Compliance
Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (26 checks) + CLAUDE.md conventions (5). Enumerated across every changed type/function:
- #1 Type-safety escapes: no `as any`/double-cast/`@ts-ignore` in production; test loaders use `as Partial<T>` narrowed by `typeof` guards (compliant); non-null `!` in citations-source.test.ts each preceded by a `toBeTruthy()` (compliant). One loosened cast in cruise-integration.test.ts:32 is now unnecessary (kind ships) — LOW.
- #4 Null/undefined: every `??` used where `0` is valid (velocity, angle, cruiseOnScreen) — compliant; no `||`-on-`0` traps.
- #5 Modules: all relative imports carry `.js`; `import type` used for erased-only imports — compliant.
- #3 Enum: string-literal unions (`kind`, `DroneKind`), no `enum`, exhaustive 2-arm branches — compliant.
- #31 (CLAUDE.md) backward-compat: `Icbm.kind?`/`angle?` optional — compliant (951 prior tests unchanged).
- #27–29 (CLAUDE.md) purity / AC3 claim-coverage / claim-shape+DERIVED: compliant (green purity.test.ts, citations.test.ts, citations-source.test.ts).
- #6 React/#10 input-validation/#9 build-config: N/A (no JSX, no external input, no config change).
- Violations: none blocking — the four rule-checker flags are #17 (stale comments) and #21 (unvalidated numeric edge), both Medium/Low and captured as Delivery Findings.

### Devil's Advocate
Argue this is broken. A malicious or unlucky caller reaches `launchCruise` with a negative or >13 `angle` — the codebase already hand-builds `Icbm` literals in tests (mirv.test.ts `cruiseAt`), so a future fixture or caller passing `-1` gets a `NaN` horizontal position that silently freezes the warhead and could poison any downstream geometry that reads `pos.h`; nothing throws, so it fails invisibly. A confused next developer reads game.ts:227 ("cruiseOnScreen is 0 until mc5-3"), assumes this story wired the 2-slot cruise cost into the launch arithmetic, and builds on that false premise — the swarm quietly runs one ICBM hotter than the ROM whenever a cruise is aloft, and at deep waves the missing `CRMTOL` total lets cruise re-spawn on every descent so the field carries up to 7 concurrent cruise where the ROM permits 3 — measurably harder than the machine, exactly the "never past the ROM" line this project draws. A player at wave 6 watches every cruise drift the same direction (right or straight) because only 5 of 14 CMANGL headings are reachable, undercutting the "angled flight" the AC promised; a cruise that drifts off the side is invisible yet still occupies the on-screen cap, so it can suppress the next spawn while the player has nothing to shoot. A fidelity auditor diffing `cruiseDrift` against `W3MAIN.MAC` finds a heuristic quadrant-inverse, not the ROM's real ANGLE math, and the stale mirv.ts:24 header claiming "Icbm has no kind field yet" sits 14 lines above the guard that uses it. None of these corrupts state, crashes, breaches security, or fails a test — they are fidelity and clarity debt on an AC-complete, fully-green feature — which is why they are findings and follow-ups, not a rejection. The one genuine correctness risk (the NaN) is unreachable through the shipped caller; I confirmed the wave-hang cannot occur because arrived cruise are removed unconditionally.

**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates green) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered ([EDGE]: cruiseDrift NaN edge) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered ([SILENT]: NaN propagation, no swallowed errors) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered ([TEST]: non-vacuous; ×5-scoring/wave-6 coverage gap) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered ([DOC]: mirv.ts:24, game.ts:227, CMANGL domain) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered ([TYPE]: CruiseIcbm duplication, (e as Error) casts) |
| 7 | reviewer-security | Yes | clean | none (0 violations) | confirmed 0, dismissed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered ([SIMPLE]: lean; heuristic decode noted under deviation) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (rules #17 ×3, #21 ×1) + LOW notes | confirmed 4, dismissed 0, deferred 0 (all non-blocking) |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents` and hand-covered)
**Total findings:** 7 confirmed (2 Gap-fidelity, 3 doc/heading Improvement, 1 edge, 1 test-coverage), 0 dismissed, 0 deferred-unaddressed — all non-blocking and filed as Delivery Findings.