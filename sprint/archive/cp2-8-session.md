---
story_id: "cp2-8"
jira_key: "cp2-8"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-8: Pointer-lock takes two clicks to bind — first click does not acquire

## Story Details
- **ID:** cp2-8
- **Jira Key:** cp2-8
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T12:54:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T12:28:32Z | 2026-07-19T12:29:27Z | 55s |
| red | 2026-07-19T12:29:27Z | 2026-07-19T12:39:29Z | 10m 2s |
| green | 2026-07-19T12:39:29Z | 2026-07-19T12:42:53Z | 3m 24s |
| review | 2026-07-19T12:42:53Z | 2026-07-19T12:54:13Z | 11m 20s |
| finish | 2026-07-19T12:54:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): the "one click binds" behavior itself is a LIVE-BROWSER gate (Chrome's focus / re-lock cooldown on the first `requestPointerLock()`) and is NOT reproducible in jsdom — headless rejects RPL outright ("root document is not valid", cp1-6/cp2-2 finding). The unit pins cover the DIAGNOSTIC fix (surface the rejection) plus acquire-path guards; the actual one-click bind is AC-3's HUMAN re-test — the USER's, collected by SM post-merge. Agents must NOT fabricate it. *Found by TEA during test design.*
- **Improvement** (non-blocking): cp2-2's Reviewer MEDIUM finding is still live — the stale blur-handler comment at `src/shell/input.ts:19-20` still implies `blur` covers "pointer-lock drops" (the R5 origin; an Escape-exit keeps focus so `blur` never fires). cp2-8's GREEN edits land in that exact block (narrowing the swallow, adding `onReject`), so a one-line comment tighten while here would retire that debt. Affects `src/shell/input.ts:19-20` (comment only). *Found by TEA during test design.*
- **Question** (non-blocking, contract note): Dev must wire the diagnostic sink in `main.ts` (Design A) — pass `console.warn(...)` as `createPointerLock`'s 4th arg — NOT default it inside `input.ts` (Design B), or the new `tests/main-loop.test.ts` `?raw` `/console\.(warn|error|info)/` pin false-REDs. Intentional: the pin proves the un-node-testable boot glue actually surfaces the rejection. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings — TEA's contract (Root Cause Analysis + Tea Assessment notes for Dev) was implemented exactly as specified; no gaps, conflicts, or new questions surfaced during GREEN.

### Reviewer (code review)
- **Improvement** (non-blocking): `request()`'s documented R4 invariant "the returned promise never rejects" (`src/shell/input.ts:162`) is now *conditional on the injected `onReject` not throwing*. `.then(undefined, reason => onReject?.(reason))` re-rejects if the sink throws; `request()` awaits it, and `main.ts`'s click handler is fire-and-forget (`() => { lock.request() }`), so a throwing sink would surface as an unhandled rejection — the exact R4 noise cp2-2 removed. NOT live: the sole production sink is `console.warn` (never throws in practice) and no caller/test injects a throwing sink. A one-line `try { onReject?.(reason) } catch {}` inside `request()` would make the invariant structural again. Affects `src/shell/input.ts:186-188`. *Found by Reviewer (silent-failure-hunter) during code review.*
- **Gap** (non-blocking): the `main-loop.test.ts` `?raw` wiring pin (`tests/main-loop.test.ts:84`) checks that `/createPointerLock/` and `/console\.(warn|error|info)/` each appear somewhere in the comment-stripped source, but not that the `console.warn` is the 4th argument to `createPointerLock`. Mutation-proven vacuity: 3-arg `createPointerLock(...)` + an unrelated `console.warn(...)` elsewhere still passes. Today no other `console.*` exists in `main.ts`, so a bare 3-arg regression WOULD still redden — the gap only opens if an unrelated console call is later added. Tighten to a call-spanning regex (or a real wiring unit) when next in this file. Affects `tests/main-loop.test.ts:84`. *Found by Reviewer (test-analyzer) during code review.*
- **Improvement** (non-blocking): two acquire-path guards are weak — `tests/pointer-lock-acquire.test.ts:155` ("exactly one RPL per request()") is tautological (`request()` calls `requestPointerLock()` once, unconditionally, no loop/retry to regress) and `:119` ("still resolves after surfacing") passes against the old `.catch(() => {})` too, so it is a narrow re-throw guard, not a cp2-8 differentiator. The load-bearing pin (`:97`, rejection→sink) genuinely has teeth. Non-blocking; note if these guards are revisited. Affects `tests/pointer-lock-acquire.test.ts:119,155`. *Found by Reviewer (test-analyzer) during code review.*
- **Improvement** (non-blocking): `onReject` is optional, so any *future* second `createPointerLock` call site that forgets the 4th arg silently reverts to the pre-cp2-8 black hole with zero signal (the main-loop `?raw` pin only greps `main.ts`). Deliberate here — optionality keeps cp2-2's 3-arg tests green and there is exactly one production caller (`main.ts`, which passes the sink). Consider a required sink or an all-call-sites lint if a second caller appears. Affects `src/shell/input.ts:175`. *Found by Reviewer (silent-failure-hunter) during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **New optional `onReject?(reason)` param on `createPointerLock`:** AC-1 says "narrow the swallow so real first-attempt failures surface in diagnostics." The story spec named no signature. The tests add an injectable 4th param `onReject?: (reason: unknown) => void` so the caught rejection routes to an assertable diagnostic sink instead of the cp2-2 black-hole `.catch(() => {})`. It is OPTIONAL, so the 3-arg cp2-2 call sites and all 9 `tests/pointer-lock.test.ts` pins stay green. Chosen dependency-injection (Design A — `main.ts` supplies `console.warn`) over defaulting `console.warn` inside `input.ts` (Design B) so `input.ts` stays free of console wiring and the sink choice lives in `main.ts` beside the other DOM wiring; the new `main-loop` `?raw` block enforces `main.ts` does the wiring.

## Sm Assessment

**Setup complete, ready for RED.** cp2-8 (2pt bug, tdd) — pointer-lock takes two clicks to
bind; final story of the cp2 run. Suspects enumerated in context (rejection swallow,
first-click gesture ordering, pointerlockchange guard); first diagnostic is the d7d27c8
pre-cp2-2 comparison via a temp worktree. The closing one-click re-test is the USER's —
SM collects it post-merge; agents must not fabricate it.

- **Branch:** `fix/cp2-8-pointer-lock-one-click` off origin/develop at 2edd328 (cp2-5).
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Root Cause Analysis (cp2-8 — TEA / O'Brien)

**Symptom (user-reported, cp2-2 smoke test):** the first click on the canvas does
not acquire pointer lock; the second click does — "takes two clicks to bind the mouse."

### d7d27c8 (pre-cp2-2) comparison — VERDICT: NOT a cp2-2 regression

The AC's first-mandated diagnostic. I checked out d7d27c8 (cp2-1, pre-cp2-2) in a
temp worktree and compared the first-click path.

- **Pre-cp2-2 (d7d27c8) main.ts:** `canvas.addEventListener('click', () => { canvas.requestPointerLock() })`
- **Current (cp2-5) main.ts:** `canvas.addEventListener('click', () => { lock.request() })`
  where `lock = createPointerLock(...)` and `request()` → `canvas.requestPointerLock()` + `.catch(() => {})`.

The first-click **request** is identical in shape in BOTH versions: a single bare
`requestPointerLock()` issued from the first click's user-gesture handler — no
retry, no pre-focus step. Nothing cp2-2 added can stop the first request from
being *issued*: `createPointerLock.request()` calls `requestPointerLock()`
unconditionally (no `locked` flag, no overlay, no guard), and the
`pointerlockchange` listener only fires `onExit` on a real exit
(`pointerLockElement !== canvas`) — never on the click itself, and never on the
acquire (`=== canvas`). So the two-click behavior **predates cp2-2**; the
pointer-lock path was simply never live-verified before this smoke test (cp1-6
Dev finding).

### What cp2-2 DID change that is relevant

cp2-2 (R4) replaced the bare call with `request()`'s `.catch(() => {})` **black-hole
swallow**. Pre-cp2-2 a first-click rejection surfaced as an "Uncaught (in promise)"
console error that *named the reason* click 1 failed; cp2-2 silenced it. cp2-2 did
not CAUSE the double-click, but it removed the only signal that explained it.

### Actual cause of the first-click failure — browser-environment, NOT unit-reproducible

`requestPointerLock()` is gated by Chrome on conditions that **do not exist in
jsdom/node** and cannot be reached by headless automation (cp1-6/cp2-2 finding:
headless rejects RPL outright — "root document is not valid for pointer lock").
The first-click failure is one of Chrome's engagement gates — most plausibly the
**document-focus requirement** (a fresh tab that does not yet hold keyboard focus:
the first click delivers focus, and the RPL call in that same handler races the
focus transition and is rejected; the second click, focus now established,
succeeds), with the **Escape re-lock cooldown** as the secondary gate the swallow
was originally added for. *Which* gate fires is a property of the live browser,
not of this code, and can only be confirmed by the human re-test. This is exactly
why the fix is DIAGNOSTIC, not a rewrite of the (already-correct) acquire path.

### Remediation (Dev contract)

**Narrow the swallow.** Route the caught rejection to an injectable diagnostic
sink instead of a black hole, so the first-attempt failure reason SURFACES for a
human diagnosing the two-click bind — while still CATCHING it (the R4 "noise"
being avoided, the *unhandled* promise rejection, is NOT reintroduced). The
acquire path itself is unchanged and already correct (one request per click, no
exit-reset on acquire) and is pinned only as a regression guard. See Tea
Assessment below for the exact contract + test map.

## Tea Assessment

**Tests Required:** Yes — AC-1 (root cause + narrowed swallow) and AC-2 (acquire-path
pins) have a mechanically-checkable half. AC-3 (the live one-click HUMAN re-test) is
the exception — headless rejects `requestPointerLock` outright, so it belongs to the
USER; SM collects it post-merge. Do NOT fabricate.

**Status:** RED — 2 new tests fail; 394 pre-existing/guard tests green (396 total);
citations 26/26; `npm run build` clean. RED commit `ecd3aac` (centipede,
`fix/cp2-8-pointer-lock-one-click`).

### Root cause (d7d27c8 comparison verdict)
**NOT a cp2-2 regression.** Pre-cp2-2 (d7d27c8) main.ts wired
`canvas.addEventListener('click', () => canvas.requestPointerLock())`; current cp2-5
wires `() => lock.request()` → the same single bare `requestPointerLock()`. The first
request is *issued* on click #1 in BOTH versions — `createPointerLock` has no guard/
flag/overlay that could no-op the first click, and its `pointerlockchange` listener
only fires `onExit` on a real exit (`!== canvas`), never on the click or the acquire.
The two-click bind is a Chrome engagement gate (document-focus / re-lock cooldown) on
the live first `requestPointerLock()` — a browser property, not a code path, and not
unit-reproducible. cp2-2 did not CAUSE it, but its `.catch(() => {})` swallow silenced
the console rejection that used to explain WHY click #1 fails. (Full write-up above.)

### Test files
| File | Tests | Pins |
|------|-------|------|
| `tests/pointer-lock-acquire.test.ts` (new) | 5 (1 RED + 4 guard) | **AC-1/AC-2** — RED: a rejected `requestPointerLock()` routes to the injected `onReject` sink, not a black hole. Guards: `request()` still resolves (no unhandled-rejection noise reintroduced); a success/legacy-void stays quiet; exactly one RPL per `request()`; and the acquire sequence (`request()` → `pointerlockchange` with `pointerLockElement === canvas`) fires **no** `onExit`/reset (the AC's "no spurious exit-reset on acquire"), while a later real exit still fires once. |
| `tests/main-loop.test.ts` (edited) | 1 RED | **AC-1 wiring** — `?raw` pin: `main.ts` must surface the rejection (`console.(warn\|error\|info)`) instead of the cp2-2 silent swallow. |

### RED proof
`npm test` → **2 failed | 394 passed (396)**. Both failures are cp2-8 pins and redden
for feature-missing reasons — the behavioral test gets `[]` from the black-holed
`.catch(() => {})` (expected `[reason]`); the `?raw` pin finds no `console.*` in
main.ts — NOT arithmetic. De-risked: a throwaway stub (added `onReject` + routed the
rejection in `input.ts`; wired `console.warn` in `main.ts`) turned the full suite
**396/396** with a clean build, then was reverted — the working tree carries tests only.

### Notes for Dev (Julia) — the tested contract
1. `src/shell/input.ts` — add an OPTIONAL 4th param `onReject?: (reason: unknown) => void`
   to `createPointerLock`. In `request()`, replace `.catch(() => {})` with
   `.then(undefined, (reason) => { onReject?.(reason) })` — the rejection is still
   CAUGHT (request() never rejects — no unhandled-rejection noise), but the reason is
   now surfaced. Keep it optional so the 3-arg cp2-2 tests stay green.
2. `src/main.ts` — pass the diagnostic sink as the 4th arg:
   `createPointerLock(canvas, document, () => { mouse.reset(); keyboard.reset() }, (reason) => console.warn('[pointer-lock] request rejected — click again to bind:', reason))`.
   Must be wired HERE (Design A), not defaulted inside input.ts, or the main-loop pin false-REDs.
3. Do NOT touch `src/core/*` (purity guard scans core only, comments included) and do
   NOT touch any cited ROM `.MAC`/`.cpp` file (citations stay 26/26). While in
   `input.ts:19-20`, consider tightening the stale blur-handler comment (cp2-2 Reviewer
   MEDIUM debt; see Delivery Findings).

**AC-3 (human one-click re-test):** NOT TEA's and NOT fakeable — headless rejects RPL.
The USER re-tests one-click bind + Escape→one-click re-bind in a real browser tab from
THIS checkout; SM collects it post-merge before finish.

**Handoff:** To Dev (green).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `centipede/src/shell/input.ts` — `createPointerLock` gains an optional 4th param `onReject?: (reason: unknown) => void`; `request()` now routes a rejected `requestPointerLock()` through `.then(undefined, reason => onReject?.(reason))` instead of the cp2-2 `.catch(() => {})` black hole (still never rejects). Also tightened the stale cp1-6 blur-handler comment (lines ~18-22) that implied `blur` covers a pointer-lock exit — reworded to point at the `pointerlockchange` listener as the real cover (comment-only, cp2-2 Reviewer MEDIUM debt retired).
- `centipede/src/main.ts` — wired the diagnostic sink as `createPointerLock`'s 4th arg: `(reason) => console.warn('[pointer-lock] request rejected — click again to bind:', reason)`. Wired in main.ts per Design A, not defaulted in input.ts, so the `main-loop.test.ts` `?raw` pin proves the boot glue actually surfaces it.

**Tests:** 396/396 passing (GREEN); citations 26/26; `npm run build` clean (tsc --noEmit + vite build).
**Branch:** `fix/cp2-8-pointer-lock-one-click` (pushed, commit `e3db926`)

**Handoff:** To next phase (review). AC-3 (live one-click re-test) remains the user's human/browser check post-merge — not fakeable in this phase, per TEA's contract.

## Subagent Results

Specialists spawned in parallel (background) for this small, error-handling-centric diff.
Full adjudication under Delivery Findings / Reviewer Assessment.

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — `npm test` 396/396, `npm run build` clean, citations 26/26, lint (tsc --noEmit) clean, 0 code smells (the one `console.warn` is the intentional AC-1 sink) | N/A — mechanical gate clean; independently re-run by Reviewer with identical results. |
| 2 | reviewer-silent-failure-hunter | Yes | findings | 3 (throwing-sink → request() rejects [medium]; optional onReject reverts to black hole [low]; main.ts fire-and-forget click [low]) | CONFIRMED all 3, none live/blocking — sole prod sink is `console.warn` (never throws), one prod caller passes the sink, fire-and-forget is pre-existing. Recorded as non-blocking Delivery Findings. |
| 3 | reviewer-test-analyzer | Yes | findings | 3, mutation-tested (main-loop.test.ts:84 vacuous co-occurrence pin [high-confidence, MEDIUM sev]; pointer-lock-acquire:155 tautological [medium]; :119 non-differentiating [low]) | CONFIRMED all 3. Production wiring verifiably correct; tests loose, not wrong; load-bearing pin `:97` has teeth. Recorded as non-blocking (test-quality). |

**All received: Yes** (3 of 3 subagents returned).

No specialist surfaced a Critical or High. Root-cause audit, data-flow trace, scope/citation
checks, and build/test re-runs were performed by the Reviewer directly (see below).

## Reviewer Assessment

**Verdict:** APPROVED

**Root-cause audit (the adversarial core of this review):** I independently checked out
`d7d27c8` (pre-cp2-2) and compared the first-click path against current `origin/develop`.
Confirmed: pre-cp2-2 wired `canvas.addEventListener('click', () => canvas.requestPointerLock())`;
current wires `() => lock.request()`, where `request()` calls `canvas.requestPointerLock()`
**unconditionally** — no `locked` flag, no overlay, no guard, no early-return. The first
request IS issued on click #1 in **both** versions. I hunted the acquire path for any state
that could no-op click #1: (a) listener order — `createPointerLock` registers
`pointerlockchange` at construction, before the click listener, irrelevant to click #1;
(b) `onPointerLockChange` fires `onExit` only when `pointerLockElement !== canvas`, so it
never fires on the click itself nor on the acquire (`=== canvas`), and even if it did it only
resets input counters, it does not release the lock; (c) `dispose()` is never called, no
dispose race; (d) no `focus()` precondition in our code. **I found no code-path cause TEA
missed.** TEA's verdict holds: the two-click bind is a live Chrome engagement gate
(document-focus / re-lock cooldown) on the first `requestPointerLock()`, not a logic bug and
not a cp2-2 regression. cp2-2 did not cause it; its `.catch(() => {})` only silenced the
console rejection that used to explain it. This fix is correctly scoped as **diagnostic**.

**Data flow traced:** user click → `canvas` 'click' listener → `lock.request()` →
`canvas.requestPointerLock()` → (on rejection) `.then(undefined, reason => onReject?.(reason))`
→ `main.ts` sink `console.warn('[pointer-lock] request rejected — click again to bind:', reason)`.
Safe: the rejection is caught (`request()` resolves) AND surfaced — the R4 black hole is
narrowed, the R4 unhandled-rejection noise is not reintroduced (for the shipped `console.warn`
sink, which never throws).

**Pattern observed:** dependency-injected diagnostic sink (Design A) — `input.ts` stays free of
console wiring; the sink choice lives in `main.ts` beside the other DOM wiring
(`src/main.ts:41-49`), enforced un-node-testably by the `main-loop.test.ts` `?raw` pin. Sound,
consistent with the shell/core boundary.

**Error handling:** `request()` catches the RPL rejection at `src/shell/input.ts:186-188` and
routes the reason to the injectable sink; the legacy void-return path (`result` falsy / no
`.then`) correctly skips the await and resolves. One residual: the "never rejects" invariant is
now conditional on the sink not throwing (see Delivery Findings) — non-blocking, `console.warn`
never throws.

**Verification personally run (all green):**
- `git fetch origin`; branch tip `e3db926` == `origin/fix/cp2-8-pointer-lock-one-click`; base
  `origin/develop` = `2edd328`. No race — only cp2-8's two commits touch these files since cp2-5.
- `npm test` → **396/396 passed** (31 files). `npm run build` → clean (tsc --noEmit + vite build).
  Citations → **26/26 passed**. Working tree clean.
- Scope: only `src/main.ts`, `src/shell/input.ts` + 2 test files. `src/core/*` untouched; no cited
  ROM `.MAC`/`.cpp` file touched; purity guard scans core-only so the `input.ts` comment edit is
  out of its scope, and `input.ts` is never `?raw`-scanned — comment edit is safe, introduces no
  forbidden global names.

**AC-3 honesty check:** the session Root Cause + TEA + Dev assessments frame this as
diagnostic-surfaced with the live one-click bind **pending the user's browser re-test**, collected
by SM before finish. The record does NOT claim a one-click fix. Honest framing confirmed.

**Observations (7):**
1. Root-cause independently verified sound (d7d27c8 comparison) — VERIFIED GOOD.
2. `.then(undefined, handler)` catches the rejection; `request()` resolves for a non-throwing
   sink; legacy void path safe — VERIFIED GOOD.
3. Throwing-sink → `request()` rejects → unhandled (fire-and-forget click handler); NOT live
   (`console.warn` never throws, no such caller) — LOW/non-blocking, tracked.
4. Optional `onReject` can silently revert to black hole for a *future* omitting caller; only one
   production caller today, which passes the sink — non-blocking, tracked.
5. `main-loop.test.ts:84` co-occurrence pin is vacuous under mutation (3-arg + unrelated
   `console.warn` passes); production wiring is nonetheless correct and today's file has no other
   `console.*` — MEDIUM test-quality gap, non-blocking, tracked.
6. Two acquire-path guards weak (`:155` tautological, `:119` non-differentiating); load-bearing
   pin `:97` has teeth — non-blocking, tracked.
7. Comment edits (input.ts:18-23, main.ts:36-40) safe against every source-text scan; citations
   26/26 unmoved — VERIFIED GOOD.

**Blocking findings:** none (no Critical, no High). All findings are non-blocking hardening /
test-tightness items recorded under Delivery Findings.

### Deviation Audit
- **ACCEPTED** — *New optional `onReject?(reason)` 4th param on `createPointerLock` (TEA, Design A).*
  AC-1 named no signature; the optional param routes the caught rejection to an assertable sink
  while keeping the 3-arg cp2-2 call sites/tests green, and DI keeps `input.ts` free of console
  wiring with the sink choice pinned in `main.ts`. Well-justified, minimal, correctly implemented.
  No undocumented deviations found.

**Handoff:** To SM for finish-story. PR opened against `develop` (do not merge — human-authorized
merge + AC-3 user re-test collected by SM before finish).
## Human Re-Test (final AC) — recorded by SM

**Performed:** 2026-07-19 by the user (slabgorb), real browser tab, THIS checkout's merged
develop (cp2-8 squash) served at localhost:5288.

**Result: "works perfectly"** — one click binds the mouse. The original two-click bind did
not reproduce on the merged tree; no rejection diagnostic was needed. Whether the earlier
double-click was a transient Chrome engagement-gate state or an environmental difference,
the onReject → console.warn diagnostic shipped by this story remains in place to explain
any future first-click refusal. AC satisfied by direct user verification.
