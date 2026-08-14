---
story_id: "ml7-5"
jira_key: "ml7-5"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-5: Fixed-timestep at the millipede LOGIC frame rate

## Story Details
- **ID:** ml7-5
- **Jira Key:** ml7-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Repos:** arcade
- **Branch:** feat/ml7-5-fixed-timestep-logic-frame-rate
- **PR:** none

## Acceptance Criteria

1. Fixed-timestep accumulator wired into the frame loop
   - Accumulates real elapsed time
   - Steps the sim at the fixed ROM logic rate **60 Hz** (16.667 ms/step) — see Delivery Finding (TEA corrected the story's "~10.4 Hz" premise; the ROM MAIN loop is VBLANK-synced 60 Hz)
   - Decouples sim steps from render frames (so a 120/144 Hz or uncapped-rAF display no longer runs the sim faster than the ROM rate)
   - Guards against the spiral-of-death: a long stall (backgrounded tab) clamps catch-up steps, never runs hundreds of steps at once
2. Core/shell boundary respected
   - Fixed-timestep loop lives in shell (`plugins/millipede/src/shell/` or main.ts)
   - Core sim remains clock-free and deterministic
3. Visual playtest confirms corrected feel
   - Game no longer animates ~6x too fast
   - All entities (march, fliers, explosions) move at ROM-authentic speed
   - Verified via Playwright MCP headless playtest (claude-in-chrome unavailable)

## Technical Context

**Corrected during RED — see Delivery Finding.** The millipede ROM `MAIN` loop is
VBLANK-synced and runs **once per frame at 60 Hz** (`MILLI.MAC:11-48`: `1$: LSR SYNC /
BCC 1$ ;WAIT FOR IRQ TO GET TO VBLANK`; `MLDEF.MAC:31 ;INTERRUPT REQUIREMENTS:IRQ 4 PER
FRAME (1 IN VBLANK)`; `MLSUB.MAC:1908 ... ;1 MINUTE AT 60HZ`). `MOTION` (the march) runs
**every frame**, moving `CENTIS` px/step, and the port's `CENTIS_FAST=0x02 / CENTIS_SLOW=0x01`
(`millipede.ts:92-93`) match the ROM byte-for-byte (`MILLI.MAC:514,518`). So the ROM logic
rate is **60 Hz**, NOT ~10.4 Hz — the story's headline figure was a misdiagnosis.

The port already models a 60 Hz frame: `stepGame` (`core/sim.ts`) increments `state.frame`
per call and the subsystems throttle off it (leg anim `frame & 1`, mushrooms "every four
frames", `frame & 7`). **Measured in-browser (Playwright headless, `window.__sim.frame`
delta over 2 s): `stepGame` runs at 60.2/s — rAF is capped at 60 Hz here.** So the port is
already ROM-faithful on a 60 Hz display.

The real defect the fixed-timestep fixes: `main.ts` steps `stepGame` **once per rAF**, so on
a 120/144 Hz display (or an uncapped-rAF environment — the likely source of the ml6-2 AC3
"6x too fast" impression) the sim runs 2–2.4× (or more) faster than the ROM's 60 Hz. A
`10.4 Hz` "fix" would instead run the whole game **6× too slow** vs the arcade.

The fix uses a fixed-timestep accumulator pinned to 60 Hz:
- Accumulate real elapsed time across rAF callbacks.
- Step the deterministic core **exactly** `floor(accumulator / 16.667 ms)` times, carrying the remainder.
- Render once per rAF at the monitor refresh rate (independent of sim steps).
- Clamp catch-up steps so a long stall can't trigger a spiral of hundreds of steps.

Net effect: identical behavior on a 60 Hz display; ROM-authentic (capped to 60 Hz) on
high-refresh/uncapped displays; deterministic and unit-testable via an injected time delta.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T08:37:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T00:50:14Z | 2026-08-14T00:52:15Z | 2m 1s |
| red | 2026-08-14T00:52:15Z | 2026-08-14T01:08:51Z | 16m 36s |
| green | 2026-08-14T01:08:51Z | 2026-08-14T08:23:14Z | 7h 14m |
| review | 2026-08-14T08:23:14Z | 2026-08-14T08:37:15Z | 14m 1s |
| finish | 2026-08-14T08:37:15Z | - | - |

## Delivery Findings

- **[Conflict / non-blocking — RESOLVED by ROM ruling] (TEA, red) — the story's "~10.4 Hz logic rate" is wrong; the ROM rate is 60 Hz.** The story title asserts the fix should "step at the ROM logic rate (calc-frame ~10.4 Hz, NOT 62.5 Hz)". Reading the vendored ROM refutes this: the `MAIN` loop (`MILLI.MAC:11-48`) is VBLANK-synced and runs **once per 60 Hz frame** (`1$: LSR SYNC / BCC 1$ ;WAIT FOR IRQ TO GET TO VBLANK`; `MLDEF.MAC:31 IRQ 4 PER FRAME (1 IN VBLANK)`; `MLSUB.MAC:1908 ;1 MINUTE AT 60HZ`), and `MOTION` (the march) runs **every frame** at `CENTIS` px/step. The port's `CENTIS_FAST=0x02`/`CENTIS_SLOW=0x01` (`plugins/millipede/src/core/millipede.ts:92-93`) match the ROM (`MILLI.MAC:514,518`) exactly, so at 60 Hz the march crosses the ~240 px field in ~2 s — ROM-authentic, not 6× fast. **Measured in a real browser** (Playwright headless on `:5296`, `window.__sim.frame` delta = 121 over 2.01 s → **60.2 stepGame/s**; rAF is 60 Hz-capped in this env). Per [[rom-always-wins-dont-ask]] the ROM rules: the fixed-timestep target is **60 Hz (16.667 ms/step)**, and the "~10.4 Hz" figure is retired. The genuine defect the story is fixing is that `main.ts` steps once per rAF, so a 120/144 Hz or uncapped-rAF display over-steps the sim (the probable source of the ml6-2 AC3 "6× too fast" impression); a 60 Hz fixed-timestep caps that to the ROM rate and is a no-op on 60 Hz displays. Implementing 10.4 Hz would have shipped the game **6× too slow**. No "millipede cadence memory" naming 10.4 Hz exists — the story's reference to one is aspirational. Downstream (Dev/Reviewer): pin 60 Hz, not 10.4 Hz.

- **[Investigation / non-blocking] (TEA, red) — no separate march/animation-speed bug exists; the port is ROM-exact at 60 Hz.** After the user reported the too-fast was seen on a "60 Hz display," I checked whether the sim itself moves too fast per frame (which a fixed-timestep would NOT fix). It does not: `MOBJH` (segment X) is a **single whole byte** in the ROM (`MLDEF.MAC:247 MOBJH: .BLKB 16.` = 1 byte/object; only the *player* has a fractional LSB `PLAYHL`, `MLDEF.MAC:272`), and `MOTION` advances it by `MOBJDH = ±CENTIS = ±2` whole px every 60 Hz frame. **Measured in the running port:** a live segment moves exactly **2 units per `stepGame` call** — so at 60 Hz the march is 120 px/s, byte-for-byte ROM-authentic. Also observed: a **backgrounded** tab throttled `stepGame` to **1/s** (vs 60.2/s foreground), proving the sim rate blindly tracks rAF. Conclusion: given the port is ROM-exact per frame, the only mechanism that yields a uniform "6× too fast" is `stepGame` running >60/s — i.e. rAF exceeding 60 Hz on the observing machine (uncapped/high-refresh). **The user states their display is NOT ProMotion and will re-verify the actual refresh/feel after the fix lands** — so the ProMotion guess is retracted; the effective-rAF-rate on the user's box is still to be confirmed. **User decision (recorded): proceed with the 60 Hz fixed-timestep** as the fix (it hard-caps the sim to 60 Hz regardless of display, and is the correct ROM-faithful architecture either way); the AC3 playtest on the user's real display is the arbiter. **Open watch-item:** if the game is still too fast after the sim is provably hard-capped to 60 Hz, that empirically proves a distinct speed bug beyond the march (my audit covered the march + loop only) → file a follow-up with a concrete repro. Do NOT close AC3 on a headless-only playtest, which is 60 Hz-capped and cannot exhibit the symptom.

## Design Deviations

No design deviations.

### Reviewer (audit)
- No spec deviations logged by TEA/Dev, and I found none in audit. The one design choice
  Dev flagged (input drained **once** into the first catch-up sub-step) is sound and now
  behaviorally pinned (`isFirst === [true,false,false]`) → ✓ ACCEPTED by Reviewer.

### AC3 verification (user playtest)
- **AC3 VERIFIED by the user on their real display (2026-08-14).** With this build served from the
  dev server, the user confirmed the march/fliers/explosions now move at a sane arcade pace ("1" =
  feels right). This empirically closes the RED watch-item: the 60 Hz cap DID fix the too-fast,
  which means the user's effective rAF was running >60 Hz (the display's nominal 60 Hz
  notwithstanding) — no separate animation-speed bug. The remaining red-triangle mushrooms /
  blue-square player are the pre-existing ml6-2 sprite-decode TODOs, out of ml7-5 scope.

### Reviewer (code review)
- **Improvement** (non-blocking, RESOLVED in-session): the built-but-not-wired guard matched
  the import symbol, not the call site (rules #15/#25), and was mutation-proven false-green.
  Affects `plugins/millipede/tests/frame-clock.test.ts` + `plugins/millipede/src/shell/frame-clock.ts`
  (extracted `runFixedSteps` seam + behavioral tests + call-site guard). Fixed in `f3e5245d`,
  the original mutant re-verified as now-reddening. *Found by Reviewer during code review.*
- **Watch-item** (Question, non-blocking): AC3 corrected-feel is unverifiable in headless
  (60 Hz-capped); the user re-verifies on their real display. If still too fast after the
  sim is provably capped to 60 Hz, a distinct animation-speed bug exists → follow-up.
  *Carried from the RED Delivery Finding; re-affirmed by Reviewer.*

## Dev Assessment

**GREEN complete — ready for Reviewer.** Commit `d24e0347`.

**Implemented exactly the tested seam:**
- `plugins/millipede/src/shell/frame-clock.ts` (new, pure): `LOGIC_HZ=60`,
  `STEP_MS=1000/60`, `MAX_CATCHUP_STEPS=5`, and `advanceFixedSteps(accumulatorMs,
  elapsedMs) → { steps, remainderMs }`. Non-positive elapsed contributes no time;
  a backlog over the clamp drops the excess (steps clamped, remainder 0). The time
  delta is an **argument** — no wall-clock read — so core stays clock-free and
  `tests/purity.test.ts` (which scans `src/core/` only) is untouched.
- `plugins/millipede/src/main.ts`: the rAF loop now takes the timestamp arg,
  accumulates `elapsed = ts - lastTs`, calls `advanceFixedSteps`, runs `stepGame`
  `steps` times, and renders once per rAF regardless of step count.

**One design choice for the Reviewer to weigh:** input is drained **once** into the
first sub-step of a catch-up burst; later sub-steps get empty input. This prevents a
single `fire`/`start` (or one rAF's mouse travel) being replayed N times when the
accumulator runs multiple steps. Catch-up bursts only happen after a stall (a
foreground 60/120 Hz display yields 0–1 steps/rAF), so this path is rare in practice.

**Verification:** 14/14 `frame-clock` tests (incl. the 60/144/240 Hz → ~60 steps/s
display-independence pins and the clamp), full millipede suite **1055/1055**, and
`tsc --noEmit` clean. In-browser smoke: the game still boots to attract, steps, and
marches at the ROM-authentic 2 px/step; the wiring test (main.ts imports
`advanceFixedSteps`) is green.

**AC3 caveat carried forward (do NOT close on it here):** the corrected-feel playtest
must run on the **user's real display** — a headless/60 Hz-capped tab cannot exhibit
the >60 Hz symptom the fix targets, so a green headless playtest neither proves nor
disproves the feel fix. The user will re-verify their display/feel after this lands
(they stated it is NOT ProMotion). If still too fast after the sim is provably capped
to 60 Hz, that's the open watch-item in the RED Delivery Finding → a distinct
speed-bug follow-up, not a defect in this change.

## Sm Assessment

**Setup complete — ready for TEA (RED phase).**

**Story shape:** ml7-5 is a 3pt TDD follow-up spun out of the ml6-2 AC3 playtest finding. ml6-2 shipped and was playtest-verified (done, merged via PR #355), but its frame loop calls `stepGame` on every `requestAnimationFrame` (~60 Hz) with no fixed-timestep accumulator, so the whole game (march, fliers, explosions) runs ~6x too fast. This story adds a real-time accumulator that steps the sim at the ROM logic rate.

**Cadence is the crux — and it is a known trap.** The millipede sim runs at a calc-frame rate of **~10.4 Hz, NOT 62.5 Hz** (documented in the millipede-cadence memory; the 62.5 Hz reading is a ~6x trap). TEA should pin the step rate to the ~10.4 Hz logic cadence, not the render rate. Do not re-derive the Hz from a raw sed window of the ROM — cite the established cadence memory / prior ml work.

**Boundary (load-bearing):** the fixed-timestep loop is a **shell** concern — it lives in `plugins/millipede/src/shell/` (or the `main.ts` frame loop). The pure sim in `plugins/millipede/src/core/` MUST stay clock-free and deterministic; millipede enforces this mechanically with its own core-purity scan. A RED test that reaches into core with wall-clock time would violate the boundary — pin the accumulator/step-count behavior at the shell seam.

**Two verification traps flagged for the whole pipeline:**
1. **Feel is not unit-testable alone (AC3).** A green vitest that asserts "N steps for T ms" is necessary but not sufficient — AC3 requires a real-browser playtest confirming the corrected feel. **claude-in-chrome is NOT connected here** — playtest via the Playwright MCP (headless) on its own port. Downstream agents should not burn time rediscovering this.
2. **Deterministic seam.** Because core is clock-free, the accumulator must be driven by an injected/observable time source so the RED test can assert step-count as a pure function of elapsed time (no `Date.now()`/`performance.now()` reached directly inside the stepped unit).

**Scope guard:** OUT OF SCOPE — new game mechanics, audio, attract/HUD. This is purely the frame-loop cadence fix + its playtest confirmation.

**Probes clean at setup:** no open PRs (merge gate clear), no sibling session held ml7-5. The stale `ml6-2-session.md` (orphaned RED session, superseded by the real ml6-2 completion) was archived to `sprint/archive/` during setup to clear a false IN_PROGRESS state. Claim branch `feat/ml7-5-fixed-timestep-logic-frame-rate` created from `develop` (gitflow).

> ⚠ **Superseded by the TEA Assessment below:** the "~10.4 Hz" cadence claim in this SM
> assessment was refuted during RED by reading the vendored ROM and measuring the running
> game — the ROM logic rate is **60 Hz**. See the RED Delivery Finding and the corrected
> Technical Context / AC1. The rest of the SM assessment (boundary, traps, scope) stands.

## Tea Assessment

**RED complete — ready for Dev (GREEN). Failing tests committed (`5f21b8d2`).**

**Premise corrected (the headline).** The story says "step at the ROM logic rate (~10.4 Hz)."
That is wrong. I read the vendored ROM (`reference/original-source/millipede`) and measured the
running game:
- The `MAIN` loop (`MILLI.MAC:11-48`) is **VBLANK-synced 60 Hz** (`1$: LSR SYNC / BCC 1$ ;WAIT
  FOR IRQ TO GET TO VBLANK`; `MLDEF.MAC:31 ;IRQ 4 PER FRAME (1 IN VBLANK)`; `MLSUB.MAC:1908 ;1
  MINUTE AT 60HZ`). `MOTION` (the march) runs **every frame** at `CENTIS` px, and the port's
  `CENTIS_FAST=0x02`/`CENTIS_SLOW=0x01` (`millipede.ts:92-93`) match the ROM (`MILLI.MAC:514,518`)
  byte-for-byte — so at 60 Hz the march speed is ROM-authentic.
- **Measured** (Playwright headless `:5296`, `window.__sim.frame` delta = 121 over 2.01 s):
  `stepGame` runs at **60.2/s** — rAF is 60 Hz-capped in that env, and the port already steps at
  the ROM rate there.
Per [[rom-always-wins-dont-ask]] I ruled it (no ROM-vs-story question to the user): **the
fixed-timestep target is 60 Hz (16.667 ms/step)**. Implementing 10.4 Hz would ship the game **6x
too slow**. The "millipede cadence memory" the story cites does not exist (checked the memory dir).

**What the fix actually is.** `main.ts` steps `stepGame` **once per rAF**, so on a 120/144 Hz or
uncapped-rAF display the sim over-steps (the probable source of the ml6-2 AC3 "6x too fast"
impression — that playtest likely ran a higher-than-60 rAF). The fix is a fixed-timestep
accumulator pinned to 60 Hz: a no-op on a 60 Hz display, ROM-capped on faster ones.

**Tests written** (`plugins/millipede/tests/frame-clock.test.ts`, 14 tests, RED verified — the
`shell/frame-clock.ts` module is absent so the suite fails to import; I then stubbed a *wrong*
(10.4 Hz, unclamped, unwired) implementation and confirmed 10 of 14 tests fail on the correct
assertions, proving they discriminate and aren't vacuous — then deleted the stub):
1. `LOGIC_HZ === 60`; `STEP_MS ≈ 16.667` and explicitly NOT the ~96 ms / 10.4 Hz step.
2. Accumulator: 0 steps under one step (carry remainder); exactly 1 at `STEP_MS`; 2 at ~33 ms
   (30 fps) with leftover; sub-step remainder banks across calls; integer & non-negative steps;
   zero/negative elapsed → 0 steps (defensive).
3. **Display-independence** (the real bug): driven at 60/144/240 Hz for one wall-clock second, the
   step count is ~60 every time — NOT 144 — proving the sim tracks real time, not refresh.
4. Spiral-of-death: `MAX_CATCHUP_STEPS` is a small sane clamp (1–10); a 100-step stall clamps to it.
5. **Built-but-not-wired guard:** `main.ts` source must import `advanceFixedSteps` from
   `./shell/frame-clock` (cheap structural backstop; AC3 playtest is the real liveness proof).

**Wished-for API for Dev (GREEN):** create `plugins/millipede/src/shell/frame-clock.ts` exporting
`LOGIC_HZ = 60`, `STEP_MS = 1000/LOGIC_HZ`, `MAX_CATCHUP_STEPS` (a small clamp, e.g. 5), and
`advanceFixedSteps(accumulatorMs, elapsedMs): { steps, remainderMs }` — pure, no wall clock. Then
wire `main.ts`'s rAF loop: accumulate `elapsedMs` from the rAF timestamp arg, call
`advanceFixedSteps`, run `stepGame` `steps` times (draining input on the first step), carry the
remainder, render once. **Keep the accumulator in the shell — core stays clock-free** (purity.test.ts
fences it). Minimal code to pass; don't gold-plate.

**Boundary check:** the new module lives in `src/shell/`, reads no browser global and no wall clock
(the time delta is a plain arg) — so `tests/purity.test.ts` (which only scans `src/core/`) is
unaffected and the core stays pure.

**AC3 (playtest) is Dev/verify, not unit-testable.** After wiring, confirm in a real browser
(Playwright headless — claude-in-chrome is NOT connected) that the sim holds ~60 steps/s
independent of rAF cadence, and the game feel matches the ROM. A green unit suite alone is NOT
acceptance (silent-feature trap). Dev server: `npx vite --port 5296 --strictPort` (I left one
running on 5296 — re-check whose tree answers before trusting it).

### Rule Coverage (TypeScript lang-review checklist)

| Applicable check | How the tests / design cover it |
|---|---|
| Number handling — divide-by-zero, `NaN`, integer expectations | `STEP_MS` derives from a compile-time `LOGIC_HZ=60` (never 0); tests assert `Number.isInteger(steps)`, `steps >= 0`, and `remainderMs >= 0`. |
| Defensive input validation | Zero and **negative** `elapsedMs` are tested to yield 0 steps (the wrong-stub returned `-1`, caught). |
| Unbounded loop / resource guard | Spiral-of-death clamp: a 100-step stall must clamp to `MAX_CATCHUP_STEPS` (asserted small, 1–10). |
| Test quality — no vacuous assertions (JS #8) | Every test was run against a deliberately-wrong stub; 10/14 failed on their real assertions, proving they discriminate. The 4 that held are rate-agnostic accumulator mechanics (correct in any impl), not vacuous. |
| Exhaustiveness / optional-chaining / Map.get / async | N/A — the module is a pure synchronous numeric function with no enums, optionals, maps, or async. |

**Not covered by unit tests (by design):** the corrected-feel liveness (AC3) — that is the
real-browser playtest, the arbiter per the story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (1060/1060 millipede, purity 49 green, tsc clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (see [EDGE] notes) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no swallowed errors; module has no try/catch, no fallbacks) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (test quality assessed; false-green found by rule-checker, fixed) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (header comment updated + accurate; no stale comments) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (FixedStepResult numeric; no stringly-typed API) |
| 7 | reviewer-security | Yes | clean | none | N/A (clamp bounds the loop vs negative/NaN/Infinity/large; no other trust boundary) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (runFixedSteps is a minimal seam; no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rules #15 + #25, same instance) | confirmed 1, **resolved in-session** |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled and hand-covered)
**Total findings:** 1 confirmed (rule-checker, mutation-proven), 0 dismissed, 0 deferred — the confirmed finding was **fixed and re-verified during review** (commit `f3e5245d`).

**Note on hand-coverage:** only `preflight`, `security`, `rule_checker` are enabled in
`workflow.reviewer_subagents`; the other six are disabled. I covered their domains myself
(edge/silent-failure/test/comment/type/simplifier) — the rule_checker is the backstop and it
caught the one real issue.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A tightly-scoped, ROM-faithful fix. One real defect surfaced — a false-green
wiring guard, mutation-proven by the rule-checker — and was **fixed in-session and
re-verified** (the original mutant now reddens the strengthened guard). Production logic is
correct and, after the fix, behaviorally tested end-to-end. No Critical/High issues remain.

**Observations (tagged):**

1. **[RULE] [MEDIUM] — false-green built-but-not-wired guard, RESOLVED.** `frame-clock.test.ts`
   originally asserted `mainSrc.toMatch(/advanceFixedSteps/)`, which the import line alone
   satisfies (rules #15/#25: token, not claim). The rule-checker mutation-proved it — a mutant
   keeping the import but discarding `steps` and running one `stepGame` per rAF (reverting the
   exact over-speed fix) passed 14/14. **Fix (`f3e5245d`):** extracted the step-driving loop into
   `runFixedSteps(accMs, elapsed, step)` in `frame-clock.ts`, pinned its behaviour (step-count per
   due frame, `isFirst`-once input drain, 144 Hz→~60 calls, clamp) in 5 new **behavioral** tests,
   and re-anchored the source-text guard on the `runFixedSteps(` **call site**. **Re-verified:**
   I re-applied the rule-checker's exact mutant → the guard now reddens; suite 1060/1060, tsc clean.
2. **[PRE] [VERIFIED] mechanical checks green** — 1060/1060 millipede (62 files), core-purity guard
   49 green, `tsc --noEmit` clean, zero debug smells. Evidence: preflight run + my own re-run post-fix.
3. **[SEC] [VERIFIED] loop is bounded against hostile time deltas** — `advanceFixedSteps`
   (`frame-clock.ts`) clamps `due > MAX_CATCHUP_STEPS(5)` and resets the remainder, and
   `elapsedMs > 0 ? elapsedMs : 0` filters negative/NaN; Infinity satisfies the clamp. No
   unbounded `for` loop / frame-hang path. Only local rAF/mouse inputs — no network/auth/secrets.
4. **[VERIFIED] core/shell boundary intact** — `frame-clock.ts` contains no `Date.now`,
   `performance.now`, `window`, or `document` (the elapsed delta is an **argument**); no
   `src/core/` file imports it; `tests/purity.test.ts` (49) green. This is the load-bearing
   millipede rule and it holds. Evidence: `frame-clock.ts:1-70`, purity suite.
5. **[VERIFIED] epilepsy/no-flash accessibility preserved** — the change touches only step
   cadence, not rendering; `render()` (`main.ts:97-100`) still repaints a `#000` background every
   rAF and the core emits no strobe cue. `tests/accessibility.test.ts` is green in the 1060. This
   is the one project rule ([[pacman-epilepsy-no-flash]], applied to millipede) that a frame-loop
   change could disturb — it does not.
6. **[VERIFIED] input integrity across a catch-up burst** — `runFixedSteps` drains one-shot input
   (fire/start + accumulated mouse) into the first sub-step only; the behavioral test pins
   `isFirst === [true, false, false]`, so a stall-driven multi-step frame cannot replay a click.
   Evidence: `main.ts:145-163`, `frame-clock.test.ts` runFixedSteps suite.
7. **[EDGE] [LOW] catch-up event burst (accepted, non-blocking)** — after a long stall, up to 5
   steps' `playEventSounds` fire within one rAF (a brief sound burst on tab-return). Only after a
   throttled stall (rare), events are transient, and the alternative (dropping events on skipped
   sub-steps) is worse. Acceptable; noted, not a blocker.
8. **[VERIFIED] no scope bleed in the branch diff** — `sprint/epic-ml7.yaml` changed only ml7-5's
   own status; ml7-1/ml7-4 lines are cosmetic ruamel reordering. No sibling story swept in.

### Rule Compliance (TypeScript lang-review, 30 checks)

The rule-checker applied all 30 exhaustively. Compliant on 1,2,4,5,8,13,14,19,21,26,29 (several —
#21 defensive numeric input, #29 magnitude-not-ordering — match the checklist's own recommended
patterns). Not-applicable: 3,6,7,9,10,11,12,16,18,20,22,23,27,28,30 (no enums/JSX/async/error-
handling/serialization/etc. in a pure numeric module). **Violations: #15 + #25** (one instance,
the false-green guard) — **now fixed** (obs. 1). #24 (retirement-where-named) flagged the surviving
`~10.4Hz` string in `epic-ml7.yaml`, which is the story's original *premise* (YAML, out of the
gate's `.ts` scope) — left as the historical record; the code and session correct it. No project
rule-matching finding was dismissed.

### Devil's Advocate

Suppose this is broken. **The clamp drops time**, so a browser that consistently delivers ~150 ms
rAF deltas (a heavily loaded machine, not just a backgrounded tab) would run the sim *slower than
real time* — the millipede would crawl. Is that a bug? No: a foreground display never throttles rAF
below ~30 Hz (delta ≤ ~33 ms → ≤ 2 due steps, far under the 5-step clamp), and dropping time under a
genuine multi-hundred-ms stall is the correct choice (the alternative — fast-forwarding on return —
is worse). **Float drift**: could `stepsOverOneSecond(60)` yield 59 and jitter the feel? At exactly
60 Hz each delta equals `STEP_MS`, so `total/STEP_MS === 1.0` and the remainder is a clean 0 — no
drift; the test's 59–60 band absorbs the 144/240 Hz rounding. **The confused user**: clicks during a
0-step high-refresh rAF — is the click lost? No: `firePending` persists until a step consumes it
(drained only inside `runFixedSteps`), so no input is dropped. **The malicious/pathological input**:
`ts` going backwards, `NaN`, `Infinity` — all filtered to 0 or clamped (security-verified). **The
real residual risk** is the one the story itself defers: if the user's *true 60 Hz* display still
feels too fast after this cap, the fix is a no-op and a distinct animation-speed bug exists — but my
ROM+measurement audit found the march byte-exact at 60 Hz, so that path is an explicit open
watch-item (RED Delivery Finding), not a defect in this change. The devil finds no blocking hole.

**Data flow traced:** rAF `ts` → `elapsed = ts - lastTs` → `runFixedSteps(accMs, elapsed, step)` →
`advanceFixedSteps` (folds to whole 60 Hz steps, clamps) → `step()` × N drives `stepGame` (input
drained once) → `render()` every rAF. Safe: the only external value (`elapsed`) is validated and the
loop is bounded.

**Handoff:** To SM for finish-story.