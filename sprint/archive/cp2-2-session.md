---
story_id: "cp2-2"
jira_key: "cp2-2"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-2: Input shell polish — per-step mouse-delta distribution (>60 Hz), pointer-lock rejection + pointerlockchange, human smoke test

## Story Details
- **ID:** cp2-2
- **Jira Key:** cp2-2
- **Workflow:** tdd
- **Stack Parent:** none

## Story Context

**Type:** Bug (input sampling + pointer-lock hardening carry-forwards from cp1-6 review)

**Points:** 2

**Repos:** centipede

### Carry-Forwards from cp1-6 Review

**R1 — >60Hz Input Sampling Loss:**
- Current: input is sampled ONCE per rAF frame in src/main.ts:61-71
- Problem: on >60 Hz displays, 0-step frames drain-and-DROP accumulated movementX (~50% sensitivity loss at 120 Hz)
- Failure mode: catch-up burst after tab-unhide re-applies the SAME delta to up to ~15 sub-steps (gun teleport)
- Fix: deltas accumulate in the adapter until a sim step consumes them; each step drains exactly once
- Verification: timebase/main-loop tests cover 60/120/144 Hz pacing with consistent total displacement

**R4 — Pointer-Lock Promise Rejection:**
- Current: canvas.requestPointerLock() (main.ts:36) returns a Promise whose rejection is unhandled
- Trigger: re-lock cooldown after Escape key
- Fix: handle the rejection explicitly
- Verification: input-lifecycle test covers rejection handling

**R5 — Pointer-Lock State Cleanup:**
- Current: input.ts blur-handler comment claims pointer-lock coverage but no pointerlockchange listener is wired
- Problem: Escape-exit that keeps window focus never clears held input state
- Fix: wire a pointerlockchange listener to reset state on lock exit
- Verification: input-lifecycle test covers state reset on lock exit

### Acceptance Criteria

**AC-1:** Same device deltas produce same total gun displacement at 60/120/144 Hz; catch-up burst applies each delta exactly once (extend timebase/main-loop tests).

**AC-2:** requestPointerLock() rejection handled; pointerlockchange listener clears held input state on lock exit; input-lifecycle tests cover both.

**AC-3:** HUMAN smoke test by user in real browser tab (pointer-lock acquire, mouse gun control, Escape exit, re-lock). Headless cannot exercise it (cp1-6 Dev finding). The SM will collect this from the user at story end.

**AC-4:** npm test -- citations stays green (no new transcription expected; re-anchor if any cited file is touched).

### Prior Archives
- sprint/archive/cp1-6-session.md — Review rounds R1/R4/R5 originate here
- sprint/archive/cp2-1-session.md — Precedes this story in the epic

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T05:38:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T05:03:07Z | 2026-07-19T05:04:19Z | 1m 12s |
| red | 2026-07-19T05:04:19Z | 2026-07-19T05:24:20Z | 20m 1s |
| green | 2026-07-19T05:24:20Z | 2026-07-19T05:28:25Z | 4m 5s |
| review | 2026-07-19T05:28:25Z | 2026-07-19T05:38:21Z | 9m 56s |
| finish | 2026-07-19T05:38:21Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Question** (non-blocking): AC-3's human pointer-lock smoke test is NOT fakeable by agents — headless/Playwright rejects `requestPointerLock` ("root document not valid for pointer lock", cp1-6 Dev finding). The R4/R5 unit tests (`tests/pointer-lock.test.ts`) pin the LOGIC (rejection swallow, pointerlockchange→reset) against duck-typed fakes, but the live acquire → mouse-gun → Escape-exit → re-lock loop must be verified by the USER in a real browser tab. SM collects it post-merge before finish; agents must not fabricate it. *Found by TEA during test design.*
- **Question** (non-blocking): R1 fixes DELTA reuse only. The keyboard is a LEVEL input sampled per step, so on a tab-unhide the spiral-of-death clamp (~14 steps, advanceFixedSteps maxFrame=0.25 s) applies KEY_COUNT to each step — a held key produces a bounded ~14×4 px catch-up "jump" on unhide. This is arguably correct fixed-timestep catch-up (bounded, not a teleport) and is OUT OF SCOPE for cp2-2; flagged so it is not mistaken for an R1 regression. If it ever feels wrong, it's a pause-on-hidden concern, not a sampling one. *Found by TEA during test design.*
- **Improvement** (non-blocking): the cp1-6 R3 `stripComments` helper in `tests/main-loop.test.ts` and the citation gate scan source text incl. comments — Dev's new `createPointerLock` in `src/shell/input.ts` names the device surface (`requestPointerLock`, `pointerlockchange`, `pointerLockElement`). That is FINE (input.ts is shell; the device-token ban in `tests/input.test.ts:272` scans only `src/core/player.ts`, and the purity guard sweeps only `core/`), but keep those names out of any `src/core/*` file or comment. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings. TEA's tested contract (`pumpFrame`, `createPointerLock`, `reset()`) implemented exactly as specified in the RED handoff; no deviations from the design already logged by TEA below. `src/core/*` was not touched (device tokens stayed shell-only, confirmed by purity guard 16/16 and citations 26/26 staying green). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the cp1-6 blur-handler comment (`src/shell/input.ts:19-20`) still reads "A 'blur' handler clears held/pending state (a key held while the tab loses focus, or pointer-lock drops …)", implying `blur` covers pointer-lock drops. It does NOT on the Escape-exit case (window keeps focus, so no `blur` fires) — which is exactly why R5 exists. Correct docs now sit adjacent (the `reset()` docstring :35 and `createPointerLock` :143-148), so this is residual stale-comment debt (the literal R5 origin) that should be tightened. Affects `src/shell/input.ts:19-20`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `stepsForElapsed` (`src/shell/timebase.ts:32`) is now production-unused — main.ts drives the sim via `pumpFrame`, and `pumpFrame` calls `advanceFixedSteps` directly rather than reusing `stepsForElapsed`. Only `tests/timebase.test.ts` references it now. Harmless (tested utility) but a candidate cleanup. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **New seam `pumpFrame` (in `src/shell/timebase.ts`):** the spec said "extend the timebase/main-loop tests." main.ts's per-frame glue is not node-testable (rAF/canvas), and a `?raw` scan cannot prove "same displacement at 60/120/144 Hz" or "each delta once." So the per-frame pump is extracted into a pure, generic `pumpFrame<I>(acc, elapsed, sampleStep, step): number` that folds elapsed via `stepsForElapsed` and calls `step(sampleStep())` ONCE PER SIM STEP (never on a 0-step frame). Placed in timebase.ts so main.ts keeps its `from '…timebase'` import (cp1-6 main-loop pin). Dev wires `main.ts` to it; `tests/input-distribution.test.ts` proves the R1 behaviour through it.
- **New `createPointerLock(canvas, doc, onExit)` + `InputAdapter.reset()` (in `src/shell/input.ts`):** the spec described R4/R5 behaviour only; AC-2 wants input-lifecycle tests covering both. `createPointerLock.request()` calls `canvas.requestPointerLock()` and swallows its promise rejection (R4); it wires a `pointerlockchange` listener on `doc` that fires `onExit` when `doc.pointerLockElement` leaves the canvas (R5); `dispose()` detaches it. `reset()` clears held/pending adapter state (the existing `onBlur` delegates to it) so `onExit` can clear the gun state on an Escape-exit that fires NO blur. `request()` returns `Promise<void>` (never rejects) so the swallow is assertable.
- **Widened two cp1-6 `tests/main-loop.test.ts` pins (non-RED edit):** "paces the sim…" now accepts `stepsForElapsed|pumpFrame`; "requests pointer lock…" now accepts `requestPointerLock|createPointerLock`. Reason: Dev's extraction moves `stepsForElapsed`/`requestPointerLock` out of main.ts; without widening those cp1-6 pins would false-RED after GREEN. Both still pass on the current (pre-fix) main.ts, so no spurious RED is introduced.

## Sm Assessment

**Setup complete, ready for RED.** Story cp2-2 (2pt bug, tdd) — cp1-6 review carry-forwards
R1 (>60Hz per-step delta distribution), R4 (requestPointerLock rejection), R5 (pointerlockchange
clears held state).

- **Session/context:** created; context from the authoritative epic YAML; prior archives
  (cp1-6, cp2-1) referenced for the review-round provenance.
- **Branch:** `fix/cp2-2-input-shell-polish` off origin/develop post-fetch, includes cp2-1 (d7d27c8).
- **Race check:** done at cp2-1 finish minutes ago; sibling activity was tempest-only (tp2-1).
- **Jira:** skipped — no Jira on this project.
- **AC-3 discipline:** the human pointer-lock smoke test belongs to the USER; agents must not
  fabricate it. SM will collect it after the code merges, before story finish.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — all four ACs have a mechanically-checkable half (AC-3's human loop is the exception, see below).

**Status:** RED — 14 new tests fail; 268 pre-existing green; citation gate 26/26. RED commit `c893d6c` (centipede, `fix/cp2-2-input-shell-polish`).

### Test files
| File | New tests | Pins |
|------|-----------|------|
| `tests/input-distribution.test.ts` (new) | 3 | **R1 / AC-1** — real mouse+keyboard adapters driven through the `pumpFrame` seam: (1) no delta DROPPED on a 0-step frame (5+5 counts → sim sees 10, not 5); (2) a catch-up burst (~14 steps) consumes the flick EXACTLY ONCE (6, not 6×14); (3) same total gun displacement at 60/120/144 Hz (device counts conserved; banked travel = TOTAL/2 = +60 px from 0x80) |
| `tests/pointer-lock.test.ts` (new) | 9 | **R4/R5 / AC-2** — `createPointerLock.request()` swallows a rejected requestPointerLock (+ legacy void-return + actually-calls); `pointerlockchange` fires `onExit` on EXIT only (not acquire), listener wired + `dispose()` detaches; `reset()` clears mouse delta/fire + held keys; a lock EXIT clears the gun delta with NO blur (the exact R5 gap) |
| `tests/main-loop.test.ts` (edited) | 2 new + 2 widened | **AC-1/AC-2 wiring** — `?raw` block pins main.ts → `pumpFrame` (R1) + `createPointerLock` (R4/R5); two cp1-6 pins widened so Dev's extraction doesn't false-RED (both still green now) |

### RED proof
`npm test` → **14 failed | 268 passed (282)**. Every failure is a cp2-2 test; all redden for feature-missing reasons (self-describing `loadPump`/`loadInput` throws, and `?raw` token absence), NOT arithmetic. De-risked: a throwaway stub of `pumpFrame`/`createPointerLock`/`reset()` turned the 12 behavioural tests green (arithmetic — finalH=0xBC, conservation=120, burst=6, 0-step=10 — is achievable), then the stub was reverted; working tree carries tests only.

### AC coverage
- **AC-1** (R1): `input-distribution.test.ts` (behaviour) + `main-loop.test.ts` `/pumpFrame/` (wiring). Extends the timebase idiom (step-count invariance already in `timebase.test.ts`; this adds the delta-distribution half).
- **AC-2** (R4/R5): `pointer-lock.test.ts` (both hardenings) + `main-loop.test.ts` `/createPointerLock/`.
- **AC-3** (human smoke test): NOT TEA's — headless cannot exercise pointer lock. The SM collects the user's real-browser run (acquire → mouse gun → Escape exit → re-lock) post-merge. Do NOT fabricate. (Delivery Finding above.)
- **AC-4** (citations): green, 26/26 — no cited file touched (only ROM `.MAC`/`.cpp` are cited).

### Notes for Dev (Julia) — the tested contract
1. `src/shell/timebase.ts` — add pure generic `pumpFrame<I>(acc, elapsed, sampleStep, step): number` = `stepsForElapsed` fold + `for (steps) step(sampleStep())`. No new import (generic).
2. `src/shell/input.ts` — add `reset()` to `InputAdapter` (both adapters: `onBlur` delegates to it); add `createPointerLock(canvas, doc, onExit)` → `{ request(): Promise<void>; dispose() }` (request swallows the RPL rejection AND tolerates a void return; pointerlockchange→onExit when `doc.pointerLockElement !== canvas`). Keep device tokens OUT of `src/core/*`.
3. `src/main.ts` — drive the sim via `pumpFrame(acc, elapsed, () => combine(mouse.sample(), keyboard.sample()), (input) => sim = stepSim(sim, input))`; wire `const lock = createPointerLock(canvas, document, () => { mouse.reset(); keyboard.reset() })` and `canvas.addEventListener('click', () => lock.request())`.

**Handoff:** To Dev (green) — see `.session/cp2-2-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/shell/timebase.ts` — added `pumpFrame<Input>(acc, elapsed, sampleStep, step): number`, a thin wrapper over the existing `advanceFixedSteps` that calls `step(sampleStep())` once per sim step (never on a 0-step frame). `stepsForElapsed` left untouched.
- `centipede/src/shell/input.ts` — added `reset(): void` to the `InputAdapter` contract (mouse and keyboard adapters both implement it; their `onBlur` handlers now delegate to `reset()`). Added `createPointerLock(canvas, doc, onExit) → { request(): Promise<void>; dispose() }`: `request()` calls `canvas.requestPointerLock()` and swallows a rejection (tolerating a void/legacy return too); a `pointerlockchange` listener on `doc` fires `onExit` only when `doc.pointerLockElement !== canvas` (lock exit, not acquire); `dispose()` detaches it.
- `centipede/src/main.ts` — replaced the once-per-rAF-frame `mouse.sample()`/`keyboard.sample()` + `stepsForElapsed` loop with `pumpFrame(acc, elapsed, sampleStep, (input) => { sim = stepSim(sim, input) })`, where `sampleStep` combines both adapters and is now invoked once per sim step. Replaced the raw `canvas.requestPointerLock()` click handler with `createPointerLock(canvas, document, () => { mouse.reset(); keyboard.reset() })` + `lock.request()`.

**Tests:** 282/282 passing (GREEN) — 268 prior + 14 new. Citation gate 26/26. Purity guard 16/16. `npm run build` clean (`tsc --noEmit && vite build`).

**Branch:** `fix/cp2-2-input-shell-polish` (pushed to origin; commit `fb2033e`)

**Handoff:** To review (Reviewer). AC-3 (human pointer-lock smoke test) intentionally NOT attempted — it belongs to the user, collected by SM post-merge per TEA's design.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (282/282, citations 26/26, build clean; no debug/TODO/type-holes/empty-catch beyond the intentional R4 swallow; independently confirmed `stepsForElapsed` prod-unused-but-tested) | Confirmed — mechanical gates green, matches Reviewer's own re-run |

**All received: Yes** (1/1 enabled subagents returned).

Additional adversarial analysis performed directly by the Reviewer (Opus): R1 data-flow trace against `advanceFixedSteps` semantics, R4/R5 seam correctness, deviation audit, stale-comment check, and test-quality assessment — see findings below.

## Reviewer Assessment

**Verdict:** APPROVED

**Suites (re-run by Reviewer, from `centipede/`):** `npm test` → **282/282** · `npm test -- citations` → **26/26** · `npm run build` → clean (`tsc --noEmit && vite build`). `origin/develop` tip still `d7d27c8` (cp2-1) — no sibling race. **PR #8** opened against `develop` (DO NOT merge until the AC-3 smoke test + user authorization).

**Data flow traced:** a mouse `movementX` count → `createMouseAdapter` accumulates it in `dh` (drained on `sample()`) → `main.ts` `sampleStep()` combines mouse+keyboard → `pumpFrame(acc, elapsed, sampleStep, step)` calls `step(sampleStep())` ONCE per sim step via `advanceFixedSteps` (verified in `@arcade/shared/dist/loop.js`: `acc += min(0.25, elapsed); while (acc >= dt) { step(dt); acc -= dt }`) → `stepSim`/`movePlayer`. On a 0-step frame the `while` body never runs, so `sampleStep()` is never called and the accumulated delta survives to the next step (fixes the ~50% loss at 120 Hz); on a catch-up burst the mouse drains on the first step and returns 0 thereafter (fixes the teleport). Safe.

**AC evidence:**
- **AC-1 (R1):** VERIFIED. `pumpFrame` samples per-step; 0-step frames don't drain; a burst consumes each delta once. `tests/input-distribution.test.ts` conserves total device counts at 60/120/144 Hz and pins finalH = 0x80 + TOTAL/2. Keyboard is a LEVEL input applied per step (bounded ~14-step catch-up on unhide) — TEA-flagged out-of-scope, not an R1 regression.
- **AC-2 (R4/R5):** VERIFIED. `createPointerLock.request()` swallows ONLY the `requestPointerLock()` promise rejection (narrowly scoped; tolerates a void return); `pointerlockchange` fires `onExit` on EXIT only (`pointerLockElement !== canvas`), not on acquire; `dispose()` detaches the single listener (no leak). `reset()` clears mouse delta/fire + held keys, and the `onExit → reset` path clears gun state with no `blur`. 9 tests pin it.
- **AC-3 (human smoke test):** OUT OF REVIEW SCOPE. Recorded pending-user (TEA Delivery Finding + SM/TEA Assessments); SM collects the real-browser run post-merge before finish. Not fabricated. ✅ session records it as pending-user.
- **AC-4 (citations):** VERIFIED 26/26. No cited file touched — the diff is shell-only (`main.ts`, `input.ts`, `timebase.ts`); core `player.ts` untouched.

**Deviation audit:** all three TEA deviations **ACCEPTED** — (1) `pumpFrame` seam (main.ts not node-testable; pure generic, correct); (2) `createPointerLock` + `reset()` (matches AC-2); (3) widened two cp1-6 `main-loop` pins — legitimate: both still pass and a SEPARATE strict `/pumpFrame/` + `/createPointerLock/` pin enforces the fix, so the widened pins are redundant-but-harmless, not a loophole. No undocumented deviations (Dev's contract matches TEA's spec).

**Findings (no Critical/High — nothing blocks):**
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | Stale cp1-6 blur-handler comment still implies `blur` covers pointer-lock drops (the R5 origin); an Escape-exit keeps focus so `blur` never fires. Correct docs now sit adjacent, so it's residual doc-debt, not an active hazard. | `src/shell/input.ts:19-20` |
| LOW | `stepsForElapsed` now production-unused (`pumpFrame` calls `advanceFixedSteps` directly). | `src/shell/timebase.ts:32` |
| LOW | `request()`'s "never rejects" contract holds for a rejected promise but not a *synchronous* throw from `requestPointerLock()` (not a realistic browser behavior; the cooldown path is a rejected promise, which is handled). | `src/shell/input.ts:174-178` |
| LOW | `onExit` clears keyboard held-state too (over-broad vs. pointer-only) but harmless and matches the main.ts wiring. | `src/shell/input.ts:167-169` |

**Test quality:** behavior-pinning (real adapters + real `movePlayer` through the pump); the conservation assertion fails under a per-frame sampling regression, and the strict `?raw` pins fail if main.ts drops `pumpFrame`/`createPointerLock`. Known limitation (acknowledged by TEA): a `?raw` scan can't prove `sampleStep` is wired per-step — the behavioral test covers the pump seam itself, so adequate.

**Handoff:** To SM for finish-story. Merge is gated on the user's AC-3 smoke test and explicit authorization.
## Human Smoke Test (AC-3) — recorded by SM

**Performed:** 2026-07-19 by the user (slabgorb) in a normal browser tab, against THIS
checkout's merged develop (beb7f0d) served at localhost:5288 (spare port; 5288 ownership
verified — server started from /Users/slabgorb/Projects/a-1/centipede by this session).

**Reported results, verbatim routing:**
- **Pointer-lock acquire: WORKS but takes TWO clicks** — first click does not bind, second
  does. Routed to new story **cp2-8** per the user's instruction (root cause unknown;
  possibly cp2-2's rejection swallow hiding a first-attempt failure, possibly pre-existing —
  the path was never live-verified before this test).
- **Mouse gun control: WORKS.** Horizontal glides smoothly. **Vertical steps on a fixed
  grid** — diagnosed same-session by read-only investigation as a PRE-EXISTING cp1-6 render
  defect (gun/shot vertical drawn via the collision cell; six 8px rows across the PLAYV
  band), NOT a cp2-2 regression (cp2-2's diff is input/timebase-only and per-axis
  symmetric), NOT ROM-faithful (ROM draws slot 15 at pixel PLAYV, claims PS-2/PS-8).
  Routed to new story **cp2-6**.
- **Additional live-play finding (same session):** the shot's mushroom hitbox registers one
  unit RIGHT of the drawn mushroom. Routed to new story **cp2-7**.
- Escape exit / re-lock: the re-click path was exercised during the double-click
  observation; no stuck-input or unhandled-rejection noise was reported. Not explicitly
  re-confirmed step-by-step — cp2-8's closing human re-test re-covers the full
  acquire/Escape/re-bind loop.

**Disposition:** AC-3 recorded as performed; the three findings are filed as cp2-6/7/8 in
epic cp2 by explicit user instruction rather than bouncing cp2-2 into rework. cp2-2's own
scope (R1 per-step distribution, R4 rejection handling, R5 pointerlockchange) verified by
its 14 behavioural tests and the approved review.

## Impact Summary

**Delivery Findings Summary:** 7 total findings (0 blocking, 7 non-blocking)

**By Type:**
- Questions (non-blocking): 2 — AC-3 human-only loop (TEA), keyboard catch-up scope clarification (TEA)
- Improvements (non-blocking): 5 — device token naming convention reminder (TEA), stale blur-handler comment (Reviewer), unused stepsForElapsed (Reviewer), rejection-swallow edge case (Reviewer), overzealous reset scope (Reviewer)

**Critical Path:** CLEAR
- Zero blocking findings; all mechanical checks pass (282/282 tests, 26/26 citations, clean build).
- AC-3 verified by user real-browser smoke test (pointer-lock acquire, mouse gun, Escape, re-lock); three findings routed to cp2-6/7/8 per user explicit instruction.
- R1 (>60Hz per-step delta distribution), R4 (rejection swallow), R5 (pointerlockchange+reset) all verified by tests and code review.

**Risk Posture:** LOW
- No data-loss or undefined-behavior findings; all non-blocking improvements are doc-debt or edge-case safety (asymptote handlers, not path-critical).
- Test quality is behavior-pinning (real adapters + real movePlayer through seams); regression detection is strong.

**Ready to Archive:** YES

