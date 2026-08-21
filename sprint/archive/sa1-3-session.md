---
story_id: "sa1-3"
jira_key: "sa1-3"
epic: "sa1"
workflow: "tdd"
---
# Story sa1-3: Consistent mouse capture — all games capture on focus and release on ESC

## Story Details
- **ID:** sa1-3
- **Jira Key:** sa1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sa1-3-consistent-mouse-capture
- **PR:** #680 (feat/sa1-3-consistent-mouse-capture → develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-21T12:19:52Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-21T11:51:52Z | 2026-08-21T11:53:47Z | 1m 55s |
| red | 2026-08-21T11:53:47Z | 2026-08-21T12:00:14Z | 6m 27s |
| green | 2026-08-21T12:00:14Z | 2026-08-21T12:02:24Z | 2m 10s |
| review | 2026-08-21T12:02:24Z | 2026-08-21T12:09:41Z | 7m 17s |
| green | 2026-08-21T12:09:41Z | 2026-08-21T12:15:03Z | 5m 22s |
| review | 2026-08-21T12:15:03Z | 2026-08-21T12:19:52Z | 4m 49s |
| finish | 2026-08-21T12:19:52Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA/red] Resolved (Question→answer): the "consistency" target is decidable from precedent, no design ruling needed.** Only THREE games capture the pointer: centipede, millipede, missile-command (grep `requestPointerLock` across `plugins/*/src/`). centipede (cp7-6/AC5, documented) and missile-command (main.ts:105/116) already share one contract for the cursor's enter/exit visibility. **millipede is the sole outlier.** Non-blocking.
- **[TEA/red] Gap (non-blocking, OUT of scope): millipede has NO pause/esc-overlay at all** (not among the esc-overlay importers; no `installPauseToggle`). The SM-flagged "ESC releases pointer vs ESC opens pause" collision is already ruled for the pointer-lock games by centipede's cp7-6 AC5 comment ("pausing on the same Escape key is coherent and deliberate" — ESC exits lock AND toggles pause). That collision needs no ruling here. But millipede lacking a pause overlay entirely is a **separate pause-consistency gap** — file under a pause/display-chrome story, NOT sa1-3 (this story is mouse *capture*).
- **[TEA/red] Note (non-blocking): the acquire EVENT differs (millipede `pointerdown` vs centipede/mc `click`) but is deliberately entangled** — millipede's pointerdown handler also arms fire-on-press (main.ts:117-125). At the semantic level all three are already consistent ("a canvas gesture requests the lock"), so I did NOT spec an event-name unification; forcing pointerdown→click risks a fire-model regression with no user-visible payoff. Left as-is by design.

### Delivery Finding — RED handoff (TEA → Dev)

**RED test added:** `plugins/millipede/tests/cursor-visibility-lifecycle.test.ts` — behavioural boot-harness pin, 3 lifecycle states. Currently **2 failed / 1 passed** (verified): (1) attract-cursor-visible FAILS, (2) hidden-while-locked PASSES, (3) restore-on-ESC FAILS.

**GREEN scope (millipede `src/main.ts` ONLY):** bring millipede to centipede/mc parity —
- Remove the unconditional `canvas.style.cursor = 'none'` at boot (main.ts:65) so the cursor is visible in attract.
- Hide the cursor when capture is *requested* (in the `canvas.addEventListener('pointerdown', ...)` handler, main.ts:117) — mc idiom.
- Restore the cursor in the pointer-lock `onExit` callback (main.ts:66): change `() => mouse.reset()` to also do `canvas.style.cursor = ''` (mirror mc main.ts:105). Keep `mouse.reset()` — the existing `pointer-lock-reset-on-exit.test.ts` (ml10-5) still guards it.
- Do NOT delete the cursor line outright: that regresses state (2). The box-canyon in the test forces hide-on-capture + restore-on-exit.

**Commit note for Dev:** this is a single-game `main.ts` change, so `shell-convergence.test.mjs` AC-3 (one game per main.ts commit) should be satisfied by a single commit — but a-2 is concurrently running sibling **sa1-2** in this epic; if sa1-2 lands a fleet-wide main.ts change first, re-check AC-3 after rebase (see memory `shell-convergence-ac3-one-game-per-commit`). Full millipede suite must stay green alongside the 3 now-green lifecycle assertions.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev/green] Updated a pre-existing ml10-4 assertion that pinned the exact bug sa1-3 fixes.** `plugins/millipede/tests/pointer-lock.test.ts` had `it('hides the cursor at boot ... === "none")`. sa1-3's corrected contract makes the cursor VISIBLE in attract and hidden only on capture, so that old pin directly contradicted the new behavior and could not coexist with the RED lifecycle test. Changed the assertion to `.not.toBe('none')` with an sa1-3 comment pointing at `cursor-visibility-lifecycle.test.ts` for the full lifecycle. This is reconciling a stale guard, not weakening coverage — the on-capture hide + on-exit restore are pinned by the new behavioural test. **Spec impact:** none beyond the story's own intent; the boot-hide was the defect.
- **[Dev/green] GREEN implementation (millipede `src/main.ts` only, per TEA scope):** (1) removed the boot-time `canvas.style.cursor = 'none'`; (2) hide the cursor inside the `pointerdown` capture handler; (3) `onExit` now `{ mouse.reset(); canvas.style.cursor = '' }` (mc parity). Full millipede suite 1516/1516, repo lint clean, orchestrator 507/507 (shell-convergence AC-3 green — single-game main.ts change).
- **[Dev/green R1-rework] Fixed reviewer F1/F2.** F1: the pointerdown hide was optimistic (synchronous, before `request()` resolved) — a rejected re-lock left the cursor stuck hidden with no lock. Moved the hide into `pointerLock.request().then(() => { if (document.pointerLockElement === canvas) canvas.style.cursor = 'none' })` — hides only once the lock is CONFIRMED held (mc `main.ts:113-117` parity); corrected the misleading "mirrors missile-command" comment. F2: extended `ShellHarness` with a one-shot `rejectNextLock()` (the mock previously always resolved, so a rejection was unobservable); reworked lifecycle state (2) to assert hidden only after a confirmed acquire (async + microtask flush); added state (4) pinning that a rejected re-lock leaves the cursor VISIBLE. **Mutation-verified:** reverting to the optimistic hide reddens state (4) (the guard is load-bearing). millipede **1517/1517**, lint clean, orchestrator 507/507.

## Reviewer Assessment

**Verdict:** REJECTED

Round 1 (Heimdall) — two blocking findings, detailed below.

**Sibling check:** only my own `feat/sa1-3-consistent-mouse-capture` on origin. No contention. Suite green locally (millipede 1516/1516, lint clean, orchestrator 507/507).

### BLOCKING — F1 [RULE][DOC] (correctness): optimistic cursor-hide is reject-unsafe; violates the story's own contract and diverges from the mc pattern it claims to mirror

**Where:** `plugins/millipede/src/main.ts` — the `pointerdown` handler sets `canvas.style.cursor = 'none'` *before* `pointerLock.request()` resolves, unconditionally.

**Why it's wrong:** millipede's `createPointerLock` swallows a rejected `requestPointerLock` (the R4 re-lock cooldown) — `request()` resolves either way, and on rejection **no lock is acquired, so `pointerlockchange`/`onExit` never fires.** The cursor is therefore left hidden with the pointer free. Repro: press ESC (onExit restores the cursor → visible), then click the canvas again within the browser's re-lock cooldown → `pointerdown` hides the cursor → the request is rejected → cursor stays hidden, unlocked, until the next *successful* lock+exit cycle. That is exactly the "cursor hidden while not captured" inconsistency sa1-3 exists to remove.

**Precedent contradicts it explicitly:** missile-command (`src/main.ts:112-118`) hides the cursor **only inside `request().then()` and only `if (document.pointerLockElement === canvas)`**, with the comment: *"Only hide the OS cursor once the lock is ACTUALLY held — request() resolves on a swallowed rejection too, so a rejected re-lock must not leave the cursor hidden with no lock."* The GREEN comment claims it "mirrors missile-command," but it does the opposite at the hide site. This is a rule-matching finding (the fleet contract this story is defined by), not a style preference — cannot be dismissed.

**Required fix:** hide the cursor only once the lock is confirmed held (mc parity):
```js
canvas.addEventListener('pointerdown', () => {
  startPlay()
  void pointerLock.request().then(() => {
    if (document.pointerLockElement === canvas) canvas.style.cursor = 'none'
  })
  fireHeld = true
  firePending = true
})
```
Remove the optimistic `canvas.style.cursor = 'none'`. Leave the `onExit` restore as-is.

### BLOCKING — F2 [TEST] (test pins the defect): `cursor-visibility-lifecycle.test.ts` state (2) forces the reject-unsafe shape

State (2) does `shell.emit('canvas', 'pointerdown')` then asserts `cursorStyle() === 'none'` **without ever acquiring the lock** (`setLockAcquired(true)` + acquire `pointerlockchange`). So it pins "hidden the instant pointerdown fires," which is precisely the reject-unsafe behavior in F1 — the mc-parity fix would (correctly) fail it. Rework state (2) to acquire the lock first, then assert hidden:
```
shell.emit('canvas', 'pointerdown')
shell.setLockAcquired(true); shell.emit('document', 'pointerlockchange') // lock CONFIRMED
// → assert cursorStyle() === 'none'
```
And **add a reject/no-acquire case** (the coverage gap that let F1 through): emit `pointerdown` where the lock is never acquired (no `setLockAcquired(true)`), and assert the cursor stays VISIBLE (`!== 'none'`) — a hidden-with-no-lock state must redden. Note the `.then()` restore is a microtask, so `await` a tick (or `await shell...`) before the post-acquire assertion.

### Non-blocking, verified-good
- The `onExit` restore (`mouse.reset()` + `cursor = ''`) is correct and mc-parity. Keep it.
- Stale ml10-4 boot-hide assertion update: correct and well-documented — the old pin encoded the defect. No objection.
- Attract-visible (state 1) and restore-on-exit (state 3) assertions are sound and mutation-killing. Keep.
- Repo-wide: lint clean, orchestrator AC-3 green (single-game main.ts). No topology issue.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-test-analyzer [TEST] | Yes | findings | CONFIRMED F2 — state (2) asserts hidden with no lock acquired; sync body can't flush a promise-gated hide → forces the optimistic shape; no reject-path test; harness can't simulate a rejection (`boot-shell.ts:216-219` always `Promise.resolve()`) — needs a `rejectNextLock()` control | Confirmed → rework |
| 3 | reviewer-rule-checker [RULE] | Yes | findings | CONFIRMED F1 — hide is synchronous in `pointerdown` before `request()` is called; `createPointerLock.request` (`shell/input.ts:142-156`) swallows rejection so `onExit` never fires on an R4 reject → cursor stuck hidden, no lock. Core/shell boundary clean, purity not implicated, AC-3 not violated, centipede zero cursor refs; "mirrors mc" refuted | Confirmed → rework |
| 4 | reviewer-comment-analyzer [DOC] | Yes | findings | CONFIRMED F1 comment defect — `main.ts:67` "mirrors missile-command" is a lying-docstring for the hide half (mc hides post-resolution, guarded by `pointerLockElement===canvas`, `mc main.ts:116`); `main.ts:127` inline likewise; onExit/restore half accurate | Confirmed → rework |
| 5 | reviewer-silent-failure-hunter | Skipped / disabled (`workflow.reviewer_subagents`) | — | — | N/A |
| 6 | reviewer-type-design | Skipped / disabled | — | — | N/A |
| 7 | reviewer-security | Skipped / disabled | — | — | N/A |
| 8 | reviewer-simplifier | Skipped / disabled | — | — | N/A |
| 9 | reviewer-edge-hunter | Skipped / disabled | — | — | N/A |

**All received:** Yes (4 enabled: preflight clean, test/rule/comment all returned and confirmed F1/F2; 5 others disabled via `workflow.reviewer_subagents`). No new independent findings beyond F1/F2.

### Deviation Audit
- Dev deviation 1 (updated stale ml10-4 boot-hide assertion `=== 'none'` → `.not.toBe('none')`): **ACCEPTED** — the old pin encoded the exact defect sa1-3 removes; the rewrite is correct and documented.
- Dev deviation 2 (GREEN implementation): **FLAGGED** — the `onExit` restore half is correct, but the "hide the cursor in the `pointerdown` handler" half is F1 (reject-unsafe, diverges from the mc guard it claims to mirror). Must change in rework.

**Rework plan (testable):** extend `ShellHarness` to simulate a rejected lock, fix state (2) to assert hidden only after a confirmed acquire (async/await the microtask), add a reject-path case (cursor stays visible when the lock is never acquired) — then move the hide into `request().then(() => { if (document.pointerLockElement === canvas) ... })` and drop the optimistic hide. Re-review after.

## Reviewer Assessment

**Verdict:** APPROVED

Round 2 (Heimdall) — re-review of the F1/F2 rework. Both round-1 blocking findings resolved; approving.

**Independently verified (not trusting Dev's claims):**
- Read the rework diff: the hide is now `pointerLock.request().then(() => { if (document.pointerLockElement === canvas) canvas.style.cursor = 'none' })` — structurally identical to missile-command `main.ts:113-117`. The optimistic `pointerdown` hide is gone; `onExit` restore retained.
- Ran the three pointer-lock test files myself: 36/36 green.
- **F1 resolved** [RULE]: hide gated on confirmed lock; the only two cursor writes are the guarded `'none'` and the `onExit` `''`; a rejected re-lock never sets `pointerLockElement` so the guard keeps the cursor visible. Core/shell boundary clean, AC-3 clean (both main.ts commits touch only millipede).
- **F1 comment defect resolved** [DOC]: the "mirrors missile-command" comment now accurately describes the guarded, lock-confirmed hide; all `main.ts:113-117` citations verified against mc; `rejectNextLock` doc accurate.
- **F2 resolved** [TEST]: `rejectNextLock()` added; state (2) asserts hidden only after a confirmed acquire; state (4) pins the rejected-re-lock-stays-visible contract. test_analyzer's mutation battery (isolated worktree) proved states (2)/(4) non-vacuous: the round-1 optimistic-hide mutant AND an unguarded-`.then()` mutant each fail **only** state (4); deleting the hide is caught by state (2) — the tests distinguish guarded from unguarded on the rejection path, not by leftover state.

No new findings. millipede 1517/1517, lint clean, orchestrator 507/507.

## Subagent Results

**Cycle: 1**

Method: re-ran all three enabled specialists (test/rule/comment) fresh on the round-2 diff — not just targeted re-verification.

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-test-analyzer [TEST] | Yes | clean | F2 CONFIRMED-fixed; mutation battery (worktree): mutants A/B fail only state (4), mutant C caught by state (2) → non-vacuous, precisely targeted | Approve |
| 3 | reviewer-rule-checker [RULE] | Yes | clean | F1 CONFIRMED-fixed; mc-parity guard, no unguarded hide path, boundary + AC-3 clean | Approve |
| 4 | reviewer-comment-analyzer [DOC] | Yes | clean | F1 comment CONFIRMED-fixed; all citations verified; no misleading comments remain | Approve |
| 5 | reviewer-silent-failure-hunter | Skipped / disabled (`workflow.reviewer_subagents`) | — | — | N/A |
| 6 | reviewer-type-design | Skipped / disabled | — | — | N/A |
| 7 | reviewer-security | Skipped / disabled | — | — | N/A |
| 8 | reviewer-simplifier | Skipped / disabled | — | — | N/A |
| 9 | reviewer-edge-hunter | Skipped / disabled | — | — | N/A |

**All received:** Yes (4 enabled: preflight clean, test/rule/comment all returned CLEAN and confirmed both round-1 findings resolved; 5 others disabled via `workflow.reviewer_subagents`). No new findings.

### Deviation Audit (round 2)
- Dev deviation 1 (updated stale ml10-4 boot-hide assertion): **ACCEPTED** — correct, encoded the defect.
- Dev deviation 2 (GREEN implementation): **ACCEPTED** — round-1 FLAG cleared; the reject-unsafe hide was reworked to the guarded mc-parity shape.
- Dev deviation 3 (R1-rework): **ACCEPTED** — resolves F1/F2, mutation-verified.

## Sm Assessment

**Story:** Consistent mouse capture — every game captures the pointer on focus/play-start and releases it on **ESC**, with uniform enter/exit semantics fleet-wide. (Epic title/description were corrected pre-setup from "release on X" → "release on ESC" per the owner; the fix is committed in the claim commit.)

**Contention probes (clean):** no remote branch for sa1-3, no sibling `.session/sa1-3` anywhere. a-2 is running the sibling story **sa1-2** (same sa1 epic), so expect the shell-convergence AC-3 rule to bite at commit time — a fleet-wide `main.ts` change must be split one game per commit (+ an infra commit with no `main.ts`) or `shell-convergence.test.mjs` reddens (see memory `shell-convergence-ac3-one-game-per-commit`). Rule out sa1-2's file neighbourhood when possible. develop in sync with origin/develop at setup.

**Claim pushed:** `feat/sa1-3-consistent-mouse-capture` (epic-YAML `in_progress` stamp + context file committed), branch live for sibling probes.

**Open design question surfaced for TEA (RED phase) — do NOT let it be assumed away:**
- The browser's Pointer Lock API **auto-exits on Escape natively** — the browser intercepts ESC before JS and `preventDefault()` cannot block it. So "release on ESC" is partly the platform default; the real deliverable is **consistency**: (a) uniform capture-request on focus/play-start across all games, (b) uniform `pointerlockchange` / ESC-exit handling.
- **ESC collision:** the shared `esc-overlay` (pause overlay) also binds ESC. There is a direct conflict between "ESC releases the pointer" and "ESC opens the pause overlay" — TEA/Architect must rule how a single ESC press resolves both (e.g. release-then-pause in one keystroke, or pointer-release IS the pause trigger). Flag this in RED findings before writing the fixture.

**Which games even capture the pointer** is itself a premise to measure in RED — the raster games (centipede/millipede/missile-command) are the likely mouse users; vector games are keyboard/spinner. A vacuous "all games" fixture that includes non-mouse games would pass trivially. Assert against the games that actually request pointer lock.

**Routing:** phased tdd → next agent **tea** (RED).