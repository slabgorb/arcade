---
story_id: "sw3-15"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-15: Trench exhaust-port finish is unmissable (never fails in 20+ runs) — port always spawns dead-center (spawnPort → [0,0,-DIST], no lateral variation) and PORT_HIT_RADIUS=120 is ~2x the visible octagon (~64), so any centered bolt down the full trench lands. Restore a real hit challenge: tighten the hit sphere toward the octagon span, require aim alignment, and gate the hit/miss test to the ROM's narrow approach window (findings ## Exhaust port & run outcome, the $800 window)

## Story Details
- **ID:** sw3-15
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T23:22:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T22:26:27Z | 2026-07-11T22:28:52Z | 2m 25s |
| red | 2026-07-11T22:28:52Z | 2026-07-11T22:57:08Z | 28m 16s |
| green | 2026-07-11T22:57:08Z | 2026-07-11T23:15:12Z | 18m 4s |
| review | 2026-07-11T23:15:12Z | 2026-07-11T23:22:50Z | 7m 38s |
| finish | 2026-07-11T23:22:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): The ROM proton torpedo is a GUIDED weapon — it auto-glides
  (glide-slope) onto the fixed porthole (`WSGUNS.MAC` `MVPTGN`, lines 1225-1264; porthole
  location `BS.PLC` fixed at `WSBASE.MAC:1159`). The clone models straight, un-guided bolts.
  sw3-15 does **not** restore the guided torpedo — it only tightens/aligns/windows the existing
  straight-bolt hit. A future "authentic guided proton torpedo" story is possible.
  Affects `src/core/sim.ts` (fire/collision). *Found by TEA during test design.*
- **Improvement** (non-blocking): The clone's trench constants (`EXHAUST_PORT_DISTANCE=2400`,
  `TRENCH_SCROLL_SPEED=500`, `PORT_HIT_RADIUS`) are "authentic-FEEL," not ROM-exact
  (`state.ts:305-312` says so). The ROM `$800` window is one trench-wedge spacing near the end
  wall (`WSMAIN.MAC:1900` `SUBD #0800`; `WSBASE.MAC:1125` short wedge `#800`) — a *narrow* final
  segment. The clone's window magnitude is a Dev tuning choice; the RED suite pins only the
  behavioural extremes (entry shot excluded, near-cockpit shot included), leaving the constant to
  Dev. Affects `src/core/state.ts` (a new window constant). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): RED's sibling re-seat was incomplete — it moved `force-bonus` + one
  `exhaust-port-outcome` test in-window but missed FOUR more fixtures that stage a port kill as a
  trigger for OTHER events: `speech-cues.test.ts` (`portKill`), `music-cue.test.ts` (`portKill`),
  `trench-voice-timer.test.ts` (inline clearRun-path fixture), and `exhaust-port-outcome.test.ts`'s
  `-1500` same-seed determinism test. All 10 tests went RED the instant the `$800` window gate landed
  (TEA's RED run couldn't see this — it verified the new tests against pre-gate code). Dev re-seated
  all four to in-window `-300`, assertions preserved. Affects the four test files listed (fixture
  port position only). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `PORT_APPROACH_WINDOW` (800) and `PORT_HIT_RADIUS` (70) are the
  first hit-challenge constants; a future ROM-scale-recovery story could re-derive all four trench
  constants (`EXHAUST_PORT_DISTANCE`, `TRENCH_SCROLL_SPEED`, window, radius) together against a
  recovered ROM↔world-unit scale. Affects `src/core/state.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Tightening `PORT_HIT_RADIUS` to the octagon (70) makes the port
  more prone to real-speed *tunneling* — `collides` is a per-frame point test and a 5000 u/s bolt
  is inside the 70u sphere for only ~1.5 frames of relative closing travel. Canonical on-axis shots
  are pinned to hit (tests green), but a future swept-collision story would harden fast-bolt hits.
  Affects `src/core/gameRules.ts` (`collides`) / `src/core/sim.ts` (port hit-test).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `800` window is ~1/3 of the 2400-unit trench — it satisfies the
  behavioural ACs (entry excluded, near-cockpit included) but its "feel" (and whether continuous fire
  can still reliably land an in-window bolt) should be validated in the sw2-7 playtest alongside the
  r=70 aim tightening. Affects `src/core/state.ts` (`PORT_APPROACH_WINDOW`). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Port stays dead-centre — no lateral spawn randomisation**
  - Spec source: story title (sw3-15), "port always spawns dead-center … no lateral variation"
  - Spec text: lists "no lateral variation" as a *cause* of the unmissable finish, which could be
    read as "add lateral variation so the player must track it."
  - Implementation: the RED suite keeps the port dead-centre and restores challenge via the three
    named actions (tighten sphere + require aim alignment + narrow window) — it does NOT randomise
    the port position, and asserts determinism (no RNG in the port).
  - Rationale: the authentic ROM porthole is a FIXED location (`WSBASE.MAC:1159 BS.PLC`) and the
    torpedo is guided onto it (`WSGUNS.MAC MVPTGN`); a randomly-offset port is unauthentic and would
    inject RNG into the pure core. Story scope (highest authority) says "require aim alignment," which
    the tightened sphere already delivers without a moving target.
  - Severity: minor
  - Forward impact: Dev must NOT randomise `spawnPort()`; Reviewer should not expect a lateral port.
- **Re-seated two sibling port-kill tests inside the approach window**
  - Spec source: `tests/core/force-bonus.test.ts` (`portKill`) and `tests/core/exhaust-port-outcome.test.ts`
    ("a dead-centre torpedo fired at PROJECTILE_SPEED detonates the port at 60fps")
  - Spec text: both staged the port kill at the far trench-entry / mid-trench distance
    (`spawnPort` → `-EXHAUST_PORT_DISTANCE`, and `-1500`) and expected a HIT.
  - Implementation: moved both kills to an in-window distance (`-300`); the bonus semantics
    (clean vs prior-shots) and the no-tunnel real-speed coverage are unchanged.
  - Rationale: sw3-15's new `$800` window gate would otherwise turn these existing green tests RED,
    since a kill outside the window no longer registers. Port distance is orthogonal to what those
    tests actually assert. TEA owns test maintenance across the suite when a contract changes.
  - Severity: minor
  - Forward impact: none — both stay green on current code and after the fix (verified in RED run).

### Dev (implementation)
- **Window magnitude chosen: `PORT_APPROACH_WINDOW = 800`**
  - Spec source: sw3-15 AC3 + TEA note ("Window magnitude is Dev's to choose … excludes the ~-2182 entry-shot crossing and includes the near-cockpit region")
  - Spec text: pins only the extremes — entry shot excluded, near-cockpit (`-300`) included.
  - Implementation: gate `port[2] >= -PORT_APPROACH_WINDOW` with the constant at 800 world units.
  - Rationale: 800 clears both extremes with wide margin — the entry shot's real-speed crossing lands at port.z≈-2175 (2175 ≫ 800 → excluded) while every in-window `-300` fixture (incl. the real-speed detonation at port.z≈-267) sits deep inside it; echoes the ROM `$800` end-wall-window number (units differ, authentic-FEEL like the other trench constants).
  - Severity: minor
  - Forward impact: none — a future ROM-exact retune of the trench scale would revisit this alongside `EXHAUST_PORT_DISTANCE`/`TRENCH_SCROLL_SPEED`.
- **`PORT_HIT_RADIUS` set to the literal `70`, not a computed expression**
  - Spec source: sw3-15 AC1
  - Spec text: "tightened to no larger than the visible octagon's outer reach (~64-70, derived from the `EXHAUST_PORT` model)"
  - Implementation: literal `export const PORT_HIT_RADIUS = 70` with a comment noting it equals `ceil(max hypot(v[0],v[2]))` = `ceil(69.46)` over the `EXHAUST_PORT` vertices.
  - Rationale: matches the file's convention (every trench constant is a single-sourced literal, not an import-time computation); the RED suite already derives `OCTAGON_REACH` from the model and asserts `PORT_HIT_RADIUS <= ceil(OCTAGON_REACH)`, so the WYSIWYG bound is test-enforced without coupling `state.ts` to `models.ts`.
  - Severity: minor
  - Forward impact: if the octagon is re-authored larger, the guardrail test ("derived octagon reach ~64-70") fires first and this literal must be bumped — same as TEA intended.
- **Re-seated FOUR more sibling port-kill fixtures TEA's re-seat missed**
  - Spec source: `tests/core/speech-cues.test.ts` (`portKill`), `tests/core/music-cue.test.ts` (`portKill`), `tests/core/trench-voice-timer.test.ts` (inline clearRun-path fixture), `tests/core/exhaust-port-outcome.test.ts` (the `-1500` same-seed determinism test)
  - Spec text: each staged a port kill at the far spawn distance (`-EXHAUST_PORT_DISTANCE`) or mid-trench (`-1500`) and expected a HIT — obsolete under the `$800` window gate.
  - Implementation: relocated the port to in-window `-300` (matching TEA's own `force-bonus`/`exhaust-port-outcome` re-seats); every assertion about the feature under test (speech/music/voice cues, determinism, wave progression) is unchanged — only where the kill resolves moved into the window.
  - Rationale: the window gate is a genuine contract change; no production value can keep these green without re-widening the window and breaking AC3 (they park a bolt at `-2400`, the exact distance AC3 requires to be un-winnable). TEA's RED verification could not see this ripple (it ran the new tests against pre-gate code). See Delivery Findings.
  - Severity: minor
  - Forward impact: none — mechanical fixture relocation; Reviewer should confirm the re-seats preserve each suite's original intent.

### Reviewer (audit)
- **TEA: Port stays dead-centre — no lateral spawn randomisation** → ✓ ACCEPTED by Reviewer: sound. The ROM porthole is a FIXED location (`BS.PLC`, `WSBASE.MAC:1159`) reached by a guided torpedo; adding lateral RNG would be both unauthentic and a core-purity violation. The story's "require aim alignment" is delivered by the tightened sphere, not a moving target. `spawnPort()` confirmed unchanged (`sim.ts:847` still `[0,0,-EXHAUST_PORT_DISTANCE]`).
- **TEA: Re-seated two sibling port-kill tests inside the approach window** → ✓ ACCEPTED by Reviewer: port distance is orthogonal to what those tests assert (bonus semantics, real-speed no-tunnel); re-seating to `-300` is necessary and preserves every assertion. Verified in the test diff.
- **Dev: Window magnitude `PORT_APPROACH_WINDOW = 800`** → ✓ ACCEPTED by Reviewer: TEA explicitly delegated the magnitude; 800 clears both pinned extremes with wide margin (entry crossing z≈-2175 excluded, near-cockpit -300 & real-speed hit z≈-267 included). Authentic-FEEL naming matches the sibling trench constants. A playtest-tunable, not a correctness concern.
- **Dev: `PORT_HIT_RADIUS` literal `70`, not a computed expression** → ✓ ACCEPTED by Reviewer: 70 = ceil(hypot(64,27)) = ceil(69.46), matching the file's single-sourced-literal convention; the RED suite enforces the WYSIWYG bound against the model-derived `OCTAGON_REACH`, so no `state.ts`→`models.ts` coupling is needed. Comment is accurate.
- **Dev: Re-seated FOUR more sibling port-kill fixtures** → ✓ ACCEPTED by Reviewer: mechanical, assertion-preserving relocation extending TEA's own re-seat pattern to the spots the RED verification could not see (it ran the new tests against pre-gate code). Verified each re-seat in the diff preserves its suite's cue/determinism assertions; full suite is 773/773 green (preflight-confirmed), proving no fixture was missed.
- **No undocumented deviations.** The entire diff maps to either a story AC (radius tighten, window gate) or a logged deviation (the six test re-seats). Nothing diverged from spec without a log entry.

## SM Assessment

**Scope confirmed — this is a ROM-fidelity bug in the trench-run finish, core-only.** The exhaust-port hit is currently unmissable: the port spawns dead-center with no lateral variation, the hit sphere is ~2× the visible octagon, and there is no approach-window gate. The story asks to restore a real hit challenge along three axes (tighten hit sphere → octagon span, require aim alignment, gate to the ROM's narrow `$800` approach window).

**Routing:** → O'Brien (TEA) for the RED phase. TEA formalizes the pinning tests; Julia (Dev) implements to green. This lives entirely in `src/core` (deterministic sim) — the render/shell side is out of scope.

**Quarry for TEA (verify against ROM before pinning — do not trust these line numbers blindly):**
- **Findings doc:** `docs/star-wars-1983-source-findings.md` → section **"## Exhaust port & run outcome"** / the **`$800` window** — the ROM's narrow approach window is the authority for the hit/miss gate. This is the primary source; the AC must cite it by label.
- `src/core/state.ts:321` — `PORT_HIT_RADIUS = 120` (comment notes the octagon spans ~64), plus `EXHAUST_PORT_DISTANCE`, `exhaustPort`, `exhaustPortMissedAt` state.
- `src/core/sim.ts:626` — hit test `collides(port, b.pos, PORT_HIT_RADIUS)`; `:667` push `exhaust-port-missed`; `:848` `spawnPort → [0, 0, -EXHAUST_PORT_DISTANCE]` (the "dead-center, no lateral variation" spawn).
- Existing coverage: `tests/core/events.test.ts` (exhaust-port hit/miss events).

**Guardrails to watch (TEA/Dev):**
- Core stays deterministic — any lateral port spawn variation must use the seeded RNG cursor, not `Math.random()`/`Date.now()`.
- The bug's headline claim ("never fails in 20+ runs") implies a **statistical/regression pinning test** proving misses now occur under off-axis aim — avoid a vacuous assertion (prior traps: sw2-4 vacuous-assertion, sw3-9 whole-screen).
- The "$800 window" is a ROM number in the findings doc — transcribe/cite it, don't invent the gate bounds.

## Acceptance Criteria

Formalized by TEA (RED). Grounded in the original 1983 Atari source ("Warp Speed"):
`WSMAIN.MAC:1896-1917` (the `$800` end-wall window, "?ABOUT TO BASH OUR NOSE IN THE END WALL?"),
`WSBASE.MAC:1149/1159` (`BS.ELC` end wall, `BS.PLC` **fixed** porthole), `WSGUNS.MAC:1225-1264`
(guided torpedo — out of scope), and `docs/star-wars-1983-source-findings.md` "## Exhaust port & run outcome".

1. **Tighten the hit sphere toward the octagon span.** `PORT_HIT_RADIUS` (today 120, ~2× the
   octagon) is tightened to no larger than the visible octagon's outer reach (~64-70, derived from the
   `EXHAUST_PORT` model). WYSIWYG: you may only hit what you can see.
2. **Require aim alignment.** A bolt offset past the octagon (but within the old 120 sphere) no longer
   detonates the port; a dead-centre bolt still does. Verified through the real fire path too (a
   hard-over yoke shot veers off and misses).
3. **Gate the hit/miss decision to the narrow `$800` approach window.** A single centred torpedo fired
   at trench entry (`-EXHAUST_PORT_DISTANCE`, "down the full trench") no longer wins — it crosses the
   port outside the window, and the port slips through to a real MISS (`exhaust-port-missed`) that costs
   a shield. A torpedo that meets the port inside the near-cockpit window still wins cleanly.
4. **No regression / stays pure.** The port remains dead-centre and deterministic (no `Math.random`/
   `Date.now`/RNG in the port); the win path, the miss-costs-a-shield stakes, the Death-Star-destroyed
   /force-bonus cues, and the existing sw2-4 outcome contract all still hold.

**Window magnitude is Dev's to choose** (the clone's trench constants are authentic-FEEL, not
ROM-exact) — the suite pins only the extremes (entry excluded, near-cockpit `-300` included), so a
genuinely narrow window (the ROM's final-approach `$800`, ~one wedge) is free to land anywhere that
excludes the ~`-2182` entry-shot crossing and includes the near-cockpit region.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Core-contract bug fix with three distinct behavioural changes + cross-test conflicts.

**Test Files:**
- `tests/core/exhaust-port-challenge.test.ts` — NEW sw3-15 RED suite (9 tests).
- `tests/core/force-bonus.test.ts` — re-seated `portKill` in-window (deviation logged).
- `tests/core/exhaust-port-outcome.test.ts` — re-seated the real-speed detonation test in-window (deviation logged).

**Tests Written:** 9 (covering 4 ACs) + 2 sibling re-seats.
**Status:** RED (3 failing, ready for Dev) — verified via `testing-runner` (`sw3-15-tea-red`):
suite 770/773 pass, the 3 intended failures below, **zero regressions elsewhere**, no type errors.

| Failing test (RED) | AC | Current → target |
|---|---|---|
| hit sphere ≤ octagon reach | AC1 | `PORT_HIT_RADIUS` 120 → ≤ ~70 |
| offset-96 bolt no longer detonates | AC2 | forgiven at r=120 → misses at r≤70 |
| centred torpedo at trench entry no longer wins | AC3 | detonates full-trench → windowed miss |

**Guardrails GREEN (prove the RED tests aren't vacuous):** octagon-reach sanity; dead-centre
in-window bolt still detonates; hard-over real shot misses; in-window torpedo still wins; same-seed
determinism; input-purity. The two re-seated siblings stay green today and after the fix.

### Rule Coverage

| Rule (lang-review TS / repo convention) | Test(s) | Status |
|---|---|---|
| #8 Test quality — every test asserts a meaningful observable | all 9 (events/port/lives/phase) | enforced |
| #8 — no vacuous assertions (guardrail green ≠ vacuous) | dead-centre-hits / in-window-win guards | enforced |
| Pure core — determinism (seeded RNG only, no wall clock) | "same seed + inputs → identical run" | failing→green |
| Pure core — `stepGame` never mutates input | "never mutates the input state" | green |
| #1 type-safety — no `as any`, no `!` on nullable | new suite uses `?:` guards, not `!` | enforced |
| WYSIWYG (repo) — hit sphere ≤ visible model, derived not hardcoded | `OCTAGON_REACH` from `EXHAUST_PORT` | failing→green |

**Rules checked:** 6 of 6 applicable (this is a pure-core numeric/behavioural fix — no enums, async,
JSX, deserialization, or auth surface to cover). **Self-check:** 0 vacuous tests (each RED test has a
GREEN guardrail twin proving the assertion can both pass and fail).

**Dev quarry (implementation is Dev's call):** `src/core/state.ts:321` `PORT_HIT_RADIUS` (tighten);
`src/core/sim.ts:611-684` `stepTrench` port hit/miss (add the window gate around the
`collides(port, b.pos, PORT_HIT_RADIUS)` test at `:626`); keep `spawnPort()` `:847` dead-centre.
The window can key off `port.pos[2]` (distance to the cockpit at z=0). Do **not** touch `src/shell`.

**Handoff:** To Julia (Dev) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/state.ts` — `PORT_HIT_RADIUS` 120 → **70** (WYSIWYG: the octagon's outer vertex reach is `hypot(64,27)`≈69.5, so the sphere no longer forgives off-octagon bolts); added **`PORT_APPROACH_WINDOW = 800`** (the near-cockpit `$800`-style resolve window).
- `src/core/sim.ts` — `stepTrench` port hit-test gated on `port[2] >= -PORT_APPROACH_WINDOW`; a bolt only resolves the port once it has scrolled into the window. `spawnPort()` stays dead-centre (unchanged), miss/crash branch unchanged.
- `tests/core/speech-cues.test.ts`, `tests/core/music-cue.test.ts`, `tests/core/trench-voice-timer.test.ts`, `tests/core/exhaust-port-outcome.test.ts` — re-seated four sibling port-kill fixtures in-window (`-300`); assertions preserved (see Design Deviations → Dev, and Delivery Findings → Dev).

**How the three restore actions map to code:**
- *Tighten hit sphere* → `PORT_HIT_RADIUS` 120 → 70 (≤ ceil(octagon reach)).
- *Require aim alignment* → the tighter sphere: a 96-unit-offset bolt (off the visible octagon) no longer lands; dead-centre still does; a hard-over real torpedo veers off and misses.
- *Gate to the `$800` window* → `port[2] >= -PORT_APPROACH_WINDOW`: an entry-fired torpedo crosses the port at z≈-2175 (outside 800) → no hit → the port slips through to a real MISS costing a shield.

**Tests:** 773/773 passing (GREEN) — verified via `testing-runner` (`sw3-15-dev-green-2`), zero failures across 72 files. `npm run build` (`tsc --noEmit` + vite) passes — no type errors.
**Verification:** the challenge suite drives real 60fps torpedoes down the full trench (`fireAndFollowPort`) and observes hit/miss outcomes — that is the runtime flow for this pure-core change; no shell touched (`git diff` is `src/core` + tests only).
**Branch:** `fix/sw3-15-trench-exhaust-port-hit-challenge` (pushed, commit `18967ec`)

**Handoff:** To next phase (verify / review).

## Subagent Results

Only `reviewer-preflight` is enabled (`pf settings get workflow.reviewer_subagents` → all 8 diff-based
specialists are `false`). Per protocol, disabled rows are pre-filled Skipped/disabled and their domain
was reviewed inline by the Reviewer (see tagged observations in the assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 blocking (773/773 green, build clean, no smells; 3 pre-existing `!` in test fixtures) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Reviewed inline — see [EDGE] |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Reviewed inline — see [SILENT] |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Reviewed inline — see [TEST] |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Reviewed inline — see [DOC] |
| 6 | reviewer-type-design | No | Skipped | disabled | Reviewed inline — see [TYPE] |
| 7 | reviewer-security | No | Skipped | disabled | Reviewed inline — see [SEC] |
| 8 | reviewer-simplifier | No | Skipped | disabled | Reviewed inline — see [SIMPLE] |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Reviewed inline — see [RULE] |

**All received:** Yes (1 enabled specialist returned; 8 disabled via settings, reviewed inline)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 non-blocking Improvements deferred to Delivery Findings

## Reviewer Assessment

**Verdict:** APPROVED

A minimal, surgical, correct restoration of the trench-finish challenge. The diff is 8 files: 2 core
source (the radius tighten + window gate), 1 new RED suite, and 6 assertion-preserving sibling re-seats.
Preflight is GREEN (773/773, `tsc`+build clean, zero smells, core-purity boundary intact). No Critical
or High issues found across all reviewed dimensions.

**Data flow traced:** player fire → `stepGame` spawns bolt at cockpit `[0,0,0]` with `aimDirection`
velocity → `advance` flies it down −Z → `stepTrench` scrolls the port toward +Z and, **only when
`port[2] >= -PORT_APPROACH_WINDOW`**, tests `collides(port, bolt, PORT_HIT_RADIUS=70)`. In-window hit →
`clearRun` (bonus, cues, wave++). Out-of-window crossing → no hit → port scrolls on to the cockpit →
`exhaust-port-missed` + `terrain-crash` + life loss + respawn. Safe: pure arithmetic, deterministic,
seeded-RNG-only, no shell/DOM/clock.

**Pattern observed:** short-circuit gate `const inApproachWindow = port[2] >= -PORT_APPROACH_WINDOW;
const hitBolt = inApproachWindow ? findIndex(...) : -1` at `sim.ts:628-631` — the in-window path is
byte-identical to the prior behaviour; the gate only adds an exclusion. Clean and non-invasive.

**Error handling:** N/A for a pure sim step (no I/O, no throw). The "no hit" path (`hitBolt = -1`) is
intentional control flow, not a swallowed error. The miss/crash branch (`sim.ts:663-681`) is unchanged.

### Findings by dimension (specialists disabled → reviewed inline)

- **[EDGE]** Boundary analysis: (a) port past the cockpit (`port[2] > 0`) still satisfies `>= -800`
  (correctly in-window) and the pre-existing hit-before-miss ordering is preserved. (b) The `-800`
  boundary is inclusive; no test pins it, nothing magic there. (c) A pathological large `dt` could
  scroll the port through the whole window in one step — but the game uses a **fixed-timestep** loop
  (`shell/loop.ts`), so `dt` is bounded; this is pre-existing (the miss sphere had the same property)
  and not introduced by sw3-15. No blocking edge.
- **[SILENT]** No error handling, try/catch, or fallbacks added; the gate is pure arithmetic with no
  swallowed failures. Clean.
- **[TEST]** The 6 sibling re-seats relocate the kill from spawn distance to in-window `-300` and
  preserve **every** downstream assertion (bonus clean/dirty, speech/music/voice cues, determinism,
  `deathStarDestroyedAt`); the one-step-detonation mechanic still holds at the new Z. This is not
  "editing tests to pass" — the features under test are orthogonal to kill location. The new RED suite
  is non-vacuous: each of the 3 pins has a GREEN guardrail twin (octagon-reach sanity, dead-centre
  in-window hit, in-window win), and the headline test asserts a *positive* miss (`exhaust-port-missed`
  fires, a shield is lost, `frames===320` witnesses no early warp). No `.only/.skip`, no `as any` in
  tests. The deterministic-pinning approach (vs a flaky Monte-Carlo "20 runs") is the right call for a
  pure core.
- **[DOC]** New comments are accurate: `PORT_HIT_RADIUS` "reaches ~69.5 units (hypot(64,27))" matches
  the model; `PORT_APPROACH_WINDOW` cites `WSMAIN.MAC:1896-1917 SUBD #0800`, matching the ACs; the gate
  comment correctly describes the excluded entry-shot. The stale old comment ("octagon spans ~64") was
  replaced with the accurate reach. No misleading docs.
- **[TYPE]** No new types/enums/interfaces. `PORT_APPROACH_WINDOW: number` matches sibling constants.
  Test re-seats use `const port: typeof p = [...]` (clean re-narrow) and one `[...vec] as Vec3` (safe
  3-element re-narrow, TEA's code) — no `as any`, no stringly-typing. `tsc --noEmit` passes.
- **[SEC]** No security surface: client-only deterministic game core, no auth, no network, no secrets,
  no untrusted deserialization, no tenant data. N/A.
- **[SIMPLE]** The gate is the minimal expression of the requirement (boolean + ternary short-circuit);
  not over-engineered, no dead code, no premature abstraction. `PORT_HIT_RADIUS`/`PORT_APPROACH_WINDOW`
  as named literals match the file's convention. Nothing to simplify.
- **[RULE]** See Rule Compliance below — all applicable project rules pass.

### Rule Compliance

Project rules for this pure-core TS change: **star-wars/CLAUDE.md** "Hard Architectural Boundary"
(core purity/determinism), the repo **WYSIWYG** convention (hit sphere ≤ visible model), and the
**TypeScript lang-review checklist** (`.pennyfarthing/gates/lang-review/typescript.md`).

- **Core purity — no DOM/`window`/`document`/`canvas`:** `sim.ts` gate + `state.ts` const touch none. ✓
- **Core determinism — no `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame`; time only
  via `dt`; randomness only via seeded RNG:** the gate is `port[2] >= -800`, pure arithmetic on the
  scrolled port; the sole `Math.random` token in the diff is prose in a comment
  (`exhaust-port-challenge.test.ts:269`). Determinism test green. ✓
- **`stepGame` never mutates input:** `port` is a fresh array (`sim.ts:616-620`); the gate reads, never
  writes; the input-purity test passes. ✓
- **WYSIWYG (hit sphere ≤ visible model, derived not guessed):** `PORT_HIT_RADIUS = 70 = ceil(69.46)`,
  the octagon's farthest vertex; enforced by the RED suite against model-derived `OCTAGON_REACH`. ✓
- **TS #1 type-safety escapes (`as any`/`@ts-ignore`/`!` on nullable):** no `as any`/`@ts-ignore` in the
  diff. The 3 `state.exhaustPort!.pos` non-null assertions are **pre-existing** test-fixture idioms
  (present on the removed `-` lines too), on fixtures the tests themselves populate — not newly
  introduced, not in `src/core`. ✓ (compliant; noted, not a violation)
- **TS #4 null/undefined (`||` vs `??`):** none introduced. ✓
- **TS #8 test quality (vacuous asserts, `as any` in tests):** covered in [TEST]; none. ✓
- **TS #3/#7/#11 (enums/async/error-handling):** no enums, no async, no error handling in the diff — N/A.

### Devil's Advocate

*Argue the code is broken.* **Claim 1 — the port is now unwinnable in real play.** Refuted: at 60fps the
port scrolls 8.3 u/frame, so the 800-unit window is ~96 in-window frames (~1.6s); a bolt fired when the
port is in the last third meets it in-window (e.g. fired at port z≈-800, they meet at z≈-727, inside the
window) and wins — the in-window-win tests confirm the path is live. **Claim 2 — continuous fire still
guarantees a win, so the challenge isn't restored.** Partially true and the most interesting attack: a
player who holds fire will likely have *some* bolt cross the port in-window. But that bolt must **also**
be on the 70u octagon (`FIRE_INTERVAL` limits density; an off-axis hold-fire misses), and an entry-fired
spam no longer wins outright — strictly harder than the bug, and consistent with arcade "hold-fire +
aim" feel. Flagged for the playtest (Delivery Findings), not a correctness break. **Claim 3 — a large
`dt` skips the window entirely.** Refuted: fixed-timestep loop bounds `dt`; the miss sphere already had
this property pre-sw3-15. **Claim 4 — tightening to r=70 makes real-speed dead-on shots tunnel and
silently fail.** The canonical dead-centre 60fps torpedo is pinned green (hits at z≈-267, distance
≈16.7 < 70); tunneling is a marginal off-timing risk inherent to the per-frame `collides` and the
intended WYSIWYG tightening — logged as a non-blocking Improvement for a future swept-collision story.
**Claim 5 — a confused user reads a miss as "nothing happened."** Refuted: the miss emits a dedicated
`exhaust-port-missed` cue alongside `terrain-crash`, and costs a shield — visible, distinct feedback.
No claim survives as a blocking defect.

**Deviations:** all 5 logged deviations (2 TEA, 3 Dev) audited and ACCEPTED; no undocumented deviations
(see Design Deviations → Reviewer audit). The diff maps entirely to ACs + logged deviations.

**Handoff:** To Winston Smith (SM) for finish-story. **DO NOT merge** — SM owns PR creation/merge, and
the AI-authored+AI-reviewed self-approval gate requires human authorization at finish.

## Notes

- No Jira integration; story tracked locally via sprint YAML
- Branch strategy: gitflow (feat/fix branches off develop)