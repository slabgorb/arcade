# Story sw8-8 Context

## Title
Incoming-fire reaction window (sw8-2 follow-up) — an idle ship died in <1s to a fireball during the sw8-4 investigation; verify a dodge/shoot window actually exists per sw8-2's acceptance and fix if homing still 'always arrives'

## Story Type
Bug (follow-up to sw8-2)

## Overview

**Narrative:** sw8-2 ("TIE feel and fire fairness") ruled that the ROM homing genuinely "always arrives" (AC6) and established "incoming fire stays shootable/fair" (AC9) by bounding `spaceEye` so an origin-anchored hit always had an aim-reachable on-screen source. During the sw8-4 investigation (2026-07-24), playtest observation surfaced a critical divergence: an **idle ship died in under 1 second** to a single fireball. sw8-2's acceptance criteria implied a visible reaction window (aim-reachable ⇒ answerable), so this <1s death suggests either:
- (a) A genuine defect in fireball speed / spawn distance / homing decay / cadence / shield accounting
- (b) A shield-damage or hit-sphere bug
- (c) ROM-authentic behaviour and the real fix is elsewhere (camera, tuning, or game-flow design)

**Central question:** does the "reaction window" sw8-2 asserted (aim-reachable ⇒ answerable) **actually exist in wall-clock play**, or is the <1s death a measurement artifact revealing a deeper mechanism failure?

**Measurement axis:** this story is fundamentally about **time** — empirical wall-clock duration from fireball spawn to cockpit hit under NO_INPUT, and whether the fireball stays inside the player's aim/answer arc long enough to be observable and actionable. The sw7-19 lesson (observe empirically, not by constant inspection) applies directly.

## Background

### sw8-2 Context (the parent story)
- **Story:** sw8-2 ("TIE feel and fire fairness", 5pt, APPROVED, finished 2026-07-21)
- **AC6 Ruling:** `homeShots` decays the shot 7/8 per tick toward the ORIGIN cockpit (`sub_A875`, §6) — the ROM homing genuinely always arrives; that is authentic, **NOT a decay bug**. The fairness remedy chosen was to **bound the eye** (`spaceEye` signed-wraps into `[−2048,+2048)`, `EYE_WRAP=4096`) so an origin-anchored hit always had an aim-reachable on-screen source.
- **AC9 Definition:** "incoming fire stays shootable/fair, NOT a new dodge mechanic" — the "shootable" half ALREADY exists (`beamHit` vs `enemyShots`, sim.ts:468-498, emitting `fireball-destroyed`), so incoming fireball stays **aim-reachable** over a long run. The player is on rails in space; the reaction is "can you answer it" not "can you dodge."
- **AC11/AC12 Reconciliation:** homing target AND cockpit hit-test BOTH STAY at the origin; the bounded eye (origin ≈ view) is the reconciliation, so a landed hit always had an aim-reachable on-screen source.

> **Where the homing citation actually lives (SM-verified 2026-07-29).** `sub_A875` is a *model-doc* reference, **not** a `WSCPU.MAC` line — do not go hunting for it there. It is documented at `star-wars/docs/tie-flight-ai-model.md:242` ("`sub_A849` dispatches per slot to `sub_A875` (type 1)"), restated in `star-wars/docs/superpowers/specs/2026-07-11-world-metric-threat-restoration-design.md:71`, and implemented in `src/core/sim.ts` — the 7/8-decay comment at `sim.ts:301` and the `homeShots` homing law at `sim.ts:1914`. The `§6` in sw8-2's ruling is a section of that model doc. **Any NEW ROM line number this story needs must be established by TEA/Dev against the vendored source and cited verbatim — do not derive one from a sed window** (see the SM sidecar gotcha on fabricated citations).

### Recent Ground Shift
- **sw8-9** (finished 2026-07-28, merged as PR #134/#135): play-cube clamp, no TIE-body collision, and the ROM fire gate. May have repositioned combat dynamics.
- **sw8-11/sw8-12** (finished 2026-07-27): space-phase time-boxed clock and music-milestone wiring. May have changed phase duration and enemy spawn cadence.
- **Baseline measurement:** must be taken against **current develop** (9c6f19c, "correct the stale speech deferred count…"), not the sw8-2-era tree. `npm ci` is warranted before measuring, since develop moved 5 commits since sw8-2 shipped (2026-07-21).

### Existing Test Suites
These suites are known and carry live assertions about incoming fire and homing. Read/extend them, do NOT duplicate:
- `tests/core/bounded-eye-combat.test.ts` — AC11 (combat stays aim-reachable over a long continuous space run), AC9 (incoming fire stays shootable/fair). Uses real `eyeOf`/`aimAt` camera + crosshair projection.
- `tests/core/homing-fireball.test.ts` — homing decay, origin convergence. Core mechanism testing.
- `tests/core/tie-fire-cadence.test.ts` — fire interval (AC7 from sw8-2). Late-wave escalation.

## Acceptance Criteria

### Phase 1: TEA (test design) — Establish the baseline measurement

**AC1 (RULING — the first deliverable):** Measure empirically and RULE the <1s death divergence.
- **Observable:** Under NO_INPUT (player idle, no yoke), step a freshly-spawned fireball to cockpit hit. Measure:
  - **Duration (SECONDS, not raw frames):** accumulated simulated time from fireball spawn to cockpit hit. **Report seconds, not a step count** — see the timebase warning below; a step count is meaningless without its `dt`.
  - **Window (frames inside arc):** how many of those frames the fireball sits inside the player's answerable arc (the aim-reachable cone / beamHit zone).
  - **ROM reference:** the cabinet's authentic fireball threat under NO_INPUT (qualitative, from longplay video or source reading).
- **Acceptance:** a documented RULING (knowledge deliverable, like sw8-1's AC1 and sw8-2's AC6) that answers: is the <1s bleed (a) a unit defect in fireball speed/decay/shield or (b) ROM-authentic and the real fix is elsewhere? Document the measured duration, the window-inside-arc frame count, and the conclusion. **No test is required for the ruling itself** — it is a diagnostic finding.
- **Note:** the "dodge/shoot window actually exists" phrasing is answerable via measurement: if the window-inside-arc is >0, the window exists; if it is 0, or the total duration is under roughly half a second of *simulated time*, the window is so tight it may be perceptually non-existent, and the RULING must say so. The playtest complaint is literally a wall-clock one ("died in <1s"), so the ruling must be stated in **seconds**.

> ⛔ **TIMEBASE TRAP — SM-verified 2026-07-29, read before writing any threshold.** The star-wars sim's game frame is **20.508 Hz, NOT 60 Hz** (`src/core/state.ts:317-322` — 12.096 MHz / 4096 / 12 = 246.094 Hz IRQ ÷ 12 = 20.508 Hz, "audit T-007, pinned three ways"; established by sw7-1). Every ROM per-game-frame quantity in this codebase is expressed over that rate. So "30 frames" is **≈1.46 s**, not 0.5 s — a threshold written against 60 Hz is wrong by ~3×, in the direction that would make an unfair window look fair. Compounding it: `stepGame` is **dt-driven and rate-independent** (`sim.ts:1918` — "the per-tick 7/8 is raised to `dt × TICK_HZ`, so 30/60/144 Hz stepping" agrees), so a raw count of `stepGame` calls is *not* a unit of time at all — it depends entirely on the `dt` the test chose. **Accumulate `dt` and assert in seconds.** Do not convert frames→seconds at 60 Hz anywhere in this story.

**AC2 (EMPIRICAL TEST — wall-clock observable):** A repeatable test that pins fireball spawn-to-hit duration and the answerable-arc window under controlled conditions.
- **Test file:** extend or add to `tests/core/homing-fireball.test.ts` (the natural home for homing span tests). OR create a new `tests/core/incoming-fire-reaction-window.test.ts` if the suite becomes large.
- **Test case:** seeds a fresh-spawn fireball at a known enemy pos (e.g., wave-1 first TIE, ~depth 15000, x≈0 centered), idle player (NO_INPUT), steps until cockpit hit. Asserts:
  - **Duration threshold:** spawn-to-hit ≥ N **seconds** of accumulated `dt` (N from the AC1 measurement). This is the empirical "reachable reaction time" floor. **The exact threshold is the RULING's deliverable — do not pick a number before AC1 measures one, and do not derive it at 60 Hz (see the timebase trap above).**
  - **Window inside arc:** simulated seconds during which `beamHit(fireball, crosshair)` ≈ true (the fireball is aim-reachable) ÷ total duration ≥ some fraction. Asserts the reaction window is non-trivial. **The exact fraction is the RULING's deliverable.**
- **Variants:** (optional, if time permits) test across multiple spawn distances (depth 10k, 15k, 20k) and measure how distance affects window width. Establishes whether the window shrinks as the fireball approaches.
- **Acceptance:** the test is red today (because the duration is <1s, the window is trivial, or both). Dev will rule/fix based on the measurement.

**AC3 (CONTEXT for Dev/Reviewer):** Identify the ground-truth mechanism.
- **Read the suites** `bounded-eye-combat.test.ts`, `homing-fireball.test.ts` (existing green). Verify they still pass under current develop (9c6f19c).
- **Note:** if any of those suites redden after sw8-9/sw8-11/sw8-12, that is the blocker. sw8-8 assumes sw8-2's invariants hold.
- **Question for Dev:** if the <1s death is ROM-authentic (the ruling), is there a gameplay design choice (e.g. spawn-distance, shield accounting, or cosmetic speed) that should change to give the player more time? OR is this the correct threat level and sw8-2's "shootable" window is sufficient as-is (player CAN answer if they watch closely)?

### Phase 2: Dev (implementation) — Fix the divergence (contingent on AC1 ruling)

**AC4 (CONDITIONAL):** If AC1 rules the <1s death is a defect, fix it.
- Defects to investigate:
  1. **Fireball spawn distance / speed:** is our spawn too close, or the shot too fast? ⚠️ **No ROM table name is supplied here on purpose** — an earlier draft of this context named two tables (`WSFLAY`, `TGFDBK`) that SM verified on 2026-07-29 do **not** appear anywhere in `star-wars/src`, `docs`, or `tests`. They were fabricated. Find the real symbol in the vendored source yourself and cite it verbatim, or state the claim without a citation.
  2. **Homing decay rate:** does `homeShots` decay too fast? The ruling said "always arrives" is ROM-authentic, but the speed could be wrong.
  3. **Fire cadence:** are TIEs firing too often? (See `tie-fire-cadence.test.ts` from sw8-2.)
  4. **Shield accounting:** is a hit doing too much damage? (Less likely; sw8-2 did not flag this.)
  5. **Hit sphere:** is the cockpit hit-test radius too large?
- **Approach:** the AC1 ruling will point to which mechanism is the culprit; implement the ROM-authentic value (or tuning choice if deemed necessary by design).
- **Verification:** AC2 test must pass (duration ≥ threshold, window ≥ fraction).

**AC5 (DEPENDENT):** Keep existing suites green.
- `bounded-eye-combat.test.ts` (AC11/AC9 from sw8-2) — must remain green; proves combat stays aim-reachable.
- `homing-fireball.test.ts` — must remain green; proves homing mechanism is intact.
- `tie-fire-cadence.test.ts` (AC7 from sw8-2) — must remain green; fire thresholds unchanged.
- Full suite must stay green. **The baseline count is UNKNOWN — establish it, do not assume one.** (sw8-2's session recorded 1793/1793 and sw8-9's review recorded 1437/1437; those are different scopes and neither is current. Run `npm ci && npm test` at 9c6f19c and record what you actually get.)

### Phase 3: Reviewer (code review) — Verify the ruling and fix

**AC6 (VISUAL QA):** If a fix ships, confirm the reaction window feel vs the longplay.
- With the fix in place, serve the build on a spare port, watch dev key `7` (space phase), and measure-by-eye whether a fireball "gives time to react." Compare to `star-wars-longplay.mov`.
- This is the design-§6 manual acceptance (the "beside the cabinet" standard). No unit test can assert feel.

## Related Stories

**Do NOT absorb these — they are separate:**
- **sw8-16:** TIE fire-gate coverage (C$T9 aim-ahead + A$GLW glow lockouts unpinned). Depends on AC1 ruling.
- **sw8-10:** past-plan TIE supply (TWV2Z loop, latent today). Independent.

## Notes for TEA

1. **Measurement, not constant inspection:** follow the sw7-19 lesson. Use a seeded demo with known spawn (e.g., seed 0x1234, wave-1 first TIE, idle input) and step until hit. Record the frame count. Repeat with a few spawn distances.
2. **"Shootable" is already defined:** `beamHit` is the test — the fireball is aim-reachable if `beamHit(fireball, crosshair)` is true. Use that primitive in your test.
3. **The ruling is the key deliverable:** even if the test fails to identify the exact defect, document what you measured and what you conclude (e.g., "spawn distance X produces Y frames, ROM reference suggests Z, therefore the divergence is in [mechanism]"). Dev fixes based on the ruling, not on the test's failure reason.
4. **Existing suite assumptions:** sw8-2's `bounded-eye-combat.test.ts` already proves incoming fire is aim-reachable (AC9/AC11); if that test suddenly reddens, that's the blocker, not the <1s death itself. Cross-check it still passes at 9c6f19c.

---

_Generated by `pf context create story sw8-8` from the sprint YAML and epic sw8 context, enriched with the sw8-2 parent session and sw8-4/sw8-9/sw8-11/sw8-12 follow-up context._
