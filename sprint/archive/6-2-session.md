---
story_id: "6-2"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-2: Consistent, faster auto-fire cadence for spin-and-hold

## Story Details
- **ID:** 6-2
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 1
- **Priority:** p2
- **Type:** bug
- **Repos:** tempest
- **Branch Strategy:** gitflow (feat/6-2-auto-fire-cadence)
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-27T18:51:09Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T17:37:39Z | 2026-06-27T17:41:46Z | 4m 7s |
| red | 2026-06-27T17:41:46Z | 2026-06-27T18:07:47Z | 26m 1s |
| green | 2026-06-27T18:07:47Z | 2026-06-27T18:12:54Z | 5m 7s |
| review | 2026-06-27T18:12:54Z | 2026-06-27T18:25:39Z | 12m 45s |
| red | 2026-06-27T18:25:39Z | 2026-06-27T18:35:48Z | 10m 9s |
| green | 2026-06-27T18:35:48Z | 2026-06-27T18:40:24Z | 4m 36s |
| review | 2026-06-27T18:40:24Z | 2026-06-27T18:51:09Z | 10m 45s |
| finish | 2026-06-27T18:51:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The core fire path (`src/core/sim.ts::stepFiring`) already has NO artificial cooldown and already gates on `MAX_BULLETS` (8) one-shot-per-tick — that half of the contract is already satisfied in core. The real artificial throttle is in the shell: `AUTOFIRE_MS = 120` in `src/shell/input.ts` gates a held button to ~1 shot / 7 frames. Affects `src/shell/input.ts` (remove the `AUTOFIRE_MS` throttle in `sample()` so a held mouse/space requests `fire` every frame; let the core 8-shot cap be the only gate). *Found by TEA during test design.*
- **Gap** (non-blocking): `BULLET_SPEED = 2.0` (`src/core/rules.ts`) yields a 0.5s shot lifetime (~30 frames); ROM rev-3 frees the slot at ~25 frames / ~0.42s, so the 8-shot pool recycles ~19% too slow. Affects `src/core/rules.ts` (raise `BULLET_SPEED` into the arcade band ~2.25–2.4). *Found by TEA during test design.*
- **Gap** (blocking): The Reviewer's held-fire regression is broader than the restart path — because the shell now holds `fire` every frame, a normal multi-frame tap during high-score entry confirms multiple letters, so ALL initials entry is broken, not just the restart carry-over. Fix: edge-trigger the confirm in `stepHighScore` (one `fire` rising edge = one letter). Affects `src/core/sim.ts` (`stepHighScore` at :50; needs a previous-fire bit in `GameState`). *Found by TEA during test design (rework 1).*

### Dev (implementation)
- No upstream findings during implementation. Both of TEA's findings were the implementation work itself (shell throttle + bullet speed) and are now resolved.
- No upstream findings during implementation *(rework 1)*. The Reviewer's blocking high-score finding is resolved by the edge-triggered confirm; the two non-blocking test-cleanup notes (vestigial `performance` stub; `import type GameState`) remain open as optional follow-ups — left untouched to keep the rework minimal and on-scope.

### Reviewer (code review)
- **Gap** (blocking): Held-fire (every-frame) now reaches `stepHighScore` as a repeated letter-confirm, auto-filling high-score initials to "AAA" on a mouse restart. Affects `src/core/sim.ts` (`stepHighScore` at :50 must confirm on a fire *rising edge*, not a held level; covers the `gameover→highscore` transition at :458-469) and needs a seeded core regression test. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/shell/input.test.ts` has a vestigial `performance.now` stub + `nowMs` clock unused after the throttle removal. Affects `tests/shell/input.test.ts` (drop the dead stub when the AAA fix lands). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/core/sim.autofire.test.ts:13` imports `GameState` as a value; use `import type` to match project convention. Affects `tests/core/sim.autofire.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, re-review round 2): The stale `performance` test scaffolding is now also a stale *comment* — `tests/shell/input.test.ts:10` says the controller "reads performance.now()", which is no longer true. Affects `tests/shell/input.test.ts` (drop the dead `performance`/`nowMs` stub and fix the header comment in a follow-up). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, re-review round 2): Fire takes priority over a simultaneous spin on the rising-edge confirm frame in `stepHighScore`, so a spin delivered in the same ~16ms frame as a confirm press is dropped. Pre-existing (the original level-triggered code had the same priority), extremely rare (two inputs in one frame). Affects `src/core/sim.ts:54-62` (apply spin before the fire check if ever deemed worth it). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Tested the cooldown removal in the shell, not the "core fire path"**
  - Spec source: 6-2-session.md → Sm Assessment (Technical approach); context-story-6-2.md (Problem)
  - Spec text: "Remove any artificial per-shot fire cooldown/timer in the core fire path."
  - Implementation: The core fire path already has no cooldown and already caps at 8 / one-per-tick. The only artificial throttle is `AUTOFIRE_MS` in `src/shell/input.ts`, so the RED tests target that shell throttle (held → fire every frame) and keep the core coverage as cap/recycle/determinism locks.
  - Rationale: A core-only test cannot catch this bug — the throttle lives in the shell. Testing where the defect actually is keeps the RED honest.
  - Severity: minor
  - Forward impact: Dev's primary change is in `src/shell/input.ts`, not the core fire gate.
- **Bullet-speed recycle asserted as a range, not an exact frame count**
  - Spec source: context-story-6-2.md, AC5 (Problem)
  - Spec text: "bullet speed verified so the 8-shot pool recycles at ~arcade rate" (ROM: ~25 frames / ~0.42s)
  - Implementation: The recycle test asserts a single shot's lifetime ∈ [0.39, 0.46]s rather than pinning an exact `BULLET_SPEED`, since the ROM source (0xf0 / +9 ≈ 26.7 frames, quoted "~25") is itself approximate.
  - Rationale: Avoids a brittle magic-number test; leaves Dev the faithful ~2.25–2.4 band while still failing the shipped 0.5s.
  - Severity: minor
  - Forward impact: Dev may choose any `BULLET_SPEED` in that band; existing collision tests are position-based and unaffected.
- **Updated the 4-3 high-score tests to model discrete taps (release between presses)** *(rework 1)*
  - Spec source: tests/core/sim.highscore.test.ts (4-3 suite header) + Reviewer finding (6-2)
  - Spec text: 4-3 header — "a fresh fire press is required per letter"
  - Implementation: Edge-triggered confirm makes a multi-frame held tap a single confirm. The 4-3 tests used consecutive `fire(s)` calls (no release) to mean "N presses," which only held under level-triggered confirm. Updated the `enter` helper to release before firing and replaced bare `fire;fire;fire` chains with discrete taps. These edits are no-ops under the current (level) code, so the suite stays green now and after the fix.
  - Rationale: Without this, the edge-trigger fix would break 5 existing tests; modeling genuine discrete taps aligns them with the stated 4-3 intent.
  - Severity: minor
  - Forward impact: none — same observable contract; the test inputs now include release frames.

### Dev (implementation)
- No deviations from spec. Implemented exactly the two levers TEA's tests and the Sm Assessment specify: removed the shell `AUTOFIRE_MS` throttle (held → fire every frame) and set `BULLET_SPEED = 2.4` (60/25 → ~25-frame / ~0.42s lifetime), squarely inside TEA's stated faithful ~2.25–2.4 band.
- No deviations from spec *(rework 1)*. Implemented edge-triggered high-score confirm exactly per TEA's guidance: added `GameState.prevFire`, confirm in `stepHighScore` only on a `false→true` transition, recorded `prevFire = input.fire` at the end of `stepGame`. Left `stepFiring` untouched. `prevFire` is a primitive carried by `cloneState`'s spread.

### Reviewer (audit)
- **TEA: "Tested the cooldown removal in the shell, not the core fire path"** → ✓ ACCEPTED by Reviewer: verified — the artificial throttle genuinely lived in `src/shell/input.ts`, and the core `stepFiring` already implemented no-cooldown/cap/one-per-tick. Testing where the defect actually was is correct.
- **TEA: "Bullet-speed recycle asserted as a range, not an exact frame count"** → ✓ ACCEPTED by Reviewer: the [0.39, 0.46]s range is a sound, non-brittle encoding of the ROM "~0.42s" target; Dev's 2.4 lands inside it. Reasonable.
- **Dev: "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the two edits match the contract exactly; nothing to flag in what was implemented.
- **UNDOCUMENTED (Reviewer-found): held-fire changes menu/highscore semantics, not just gameplay.** Spec/intent: removing the throttle was scoped to gameplay auto-fire cadence. Code: the throttle also gated `input.fire` reaching `stepHighScore` (and the `gameover→highscore` transition), so removing it regresses high-score initials entry (auto-"AAA" on mouse restart). Not logged by TEA or Dev. Severity: HIGH. This is the rejection blocker — see Reviewer Assessment.
  - **→ Re-review (round 2): RESOLVED.** Fixed by edge-triggered confirm (`GameState.prevFire`; `stepHighScore` confirms only on `false→true`). Verified by trace + the new regression tests.
- **TEA: "Updated the 4-3 high-score tests to model discrete taps" (rework 1)** → ✓ ACCEPTED by Reviewer: edge-triggered confirm genuinely requires modeling a multi-frame tap as one press; the `enter`-helper release and discrete-tap rewrites are no-ops under the old level code and align the tests with the stated 4-3 "fresh press per letter" intent. Verified the assertions were not weakened.
- **Dev rework: "No deviations from spec" (rework 1)** → ✓ ACCEPTED by Reviewer: the edge-trigger implementation matches TEA's contract exactly; nothing to flag.

## Sm Assessment

**Routing:** Phased TDD workflow. Setup complete → TEA (RED) → Dev (GREEN) → Reviewer → SM (finish). Local tracking — no Jira.

**Scope:** Bug fix in `tempest`. Make held auto-fire produce a consistent, arcade-rate cadence so spin-and-hold clears a contiguous sweep of lanes. Core fire logic in `src/core/sim.ts`; auto-fire input wiring in `src/shell`. Pure/deterministic core boundary applies.

**Root cause (resolved in the story — this is the contract, not an open question):** It is the CAP, not a cooldown. The arcade has **no fire cooldown**; firing is gated only by (a) the fire button held and (b) a free shot slot, with a **max of 8 concurrent player shots**. The fix is to remove any artificial cooldown and gate on the 8-shot concurrent cap, then verify bullet speed so the pool recycles at the arcade rate.

**Technical approach (for TEA/Dev — story title + ACs are the contract):**
- Remove any artificial per-shot fire cooldown/timer in the core fire path.
- Gate a new shot on: fire held AND a free slot, capped at **8 concurrent** player shots (`n_player_bullets = 8`).
- Spawn **one** new shot per sim tick while held (not throttled to every 2–3 frames).
- Verify bullet travel speed (ROM +9 along-units/frame, mapped to a per-second dt rate; shots free their slot at the far end ~25 frames / ~0.42s lifetime) so the 8-shot pool recycles at ~arcade rate.
- Deterministic and dt-driven; the cadence/cap must be frame-rate independent.

**Test focus (TEA):** Seeded core unit test proving (1) holding fire spawns one shot per tick until the 8-shot cap, with no artificial multi-frame gap; (2) the concurrent cap is exactly 8 and a freed slot is immediately reusable; (3) cadence is deterministic / dt-independent; (4) the documented lever is the cap (removing a cooldown), justified in the assessment. AC1/AC2's "consistent cadence" and "no skipped lanes on a sweep" are the observable outcomes to pin.

**Risks/notes:** Keep cap + recycle logic in `src/core` (pure, dt-driven); the held-button auto-fire input belongs in `src/shell`. Watch the per-frame→per-second conversion on bullet speed (60 Hz ROM source) — getting it wrong changes the recycle rate and the felt cadence. Confirm existing player-shot tests stay green.

**Decision:** Confirmed for handoff. ACs in `sprint/context/context-story-6-2.md` are complete and testable.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Behavioral bug fix with observable, deterministic acceptance criteria (cadence, cap, recycle rate).

**Test Files:**
- `tempest/tests/core/sim.autofire.test.ts` — seeded core cadence/cap/recycle/determinism suite (AC2, AC4, AC5 cap & bullet-speed)
- `tempest/tests/shell/input.test.ts` — held-button auto-fire cadence at the input layer (AC1, AC5 "no artificial cooldown")

**Tests Written:** 11 tests across 5 ACs. **Status:** RED — 4 failing (the new behavior), 7 passing (contract/regression locks).

**Failing (RED — the contract that does not yet hold):**
- `input.test.ts` › "requests fire on every frame while the mouse button is held" — shell `AUTOFIRE_MS=120` throttles a held button to ~1 shot / 7 frames.
- `input.test.ts` › "requests fire on every frame while space is held" — same throttle on keyboard auto-fire.
- `input.test.ts` › "stops firing the frame after the mouse button is released" — fails on the held-frame assertion now; goes green once held → fire every frame, while still proving release stops fire.
- `sim.autofire.test.ts` › "recycles the shot pool at the arcade rate (~0.42s lifetime, not 0.5s)" — `BULLET_SPEED=2.0` → 0.5s lifetime; arcade is ~0.42s.

**Passing (locks — already-correct behavior pinned so the GREEN change can't regress it):**
- one shot per tick while held up to the cap; cap is exactly `MAX_BULLETS` (8) and never exceeded; a freed slot is reused on the next tick (no multi-frame dead gap); a one-lane-per-tick sweep fires on every lane (no skips); deterministic for a fixed seed/inputs; dt-independent travel distance; no fire when nothing is held.

### Root Cause (AC3 — lever justified)
**It is the CAP + a shell throttle, not a core cooldown.** Two distinct defects:
1. **Primary (felt bug):** `src/shell/input.ts` `AUTOFIRE_MS = 120` artificially throttles held-fire to ~1 shot / 7 frames → irregular gaps, skipped lanes on spin-and-hold. **Lever: remove the shell throttle** so a held button requests `fire` every frame; the core's 8-shot concurrent cap is then the only gate.
2. **Secondary (feel/fidelity):** `src/core/rules.ts` `BULLET_SPEED = 2.0` → 0.5s shot lifetime vs ROM ~0.42s, so the 8-slot pool recycles ~19% too slow. **Lever: raise `BULLET_SPEED`** into the arcade band (~2.25–2.4).

The core fire gate (`stepFiring`) already implements "no cooldown, 8-shot cap, one-per-tick" correctly — no change needed there. See Delivery Findings.

### Rule Coverage (lang-review: typescript.md)
| Check | Applicable? | Coverage |
|-------|-------------|----------|
| #8 test quality | Yes | Self-checked; every test has a meaningful assertion. Caught & rewrote one flawed test (`dt-independence` measured a ±1-step quantized lifetime — replaced with quantization-free travel-distance). |
| #1–#7, #9–#13 | No | Pure behavioral bugfix: no new types/enums/constructors, no async/Promises, no IO, no user-input parsing, no JSX, no build-config change. Nothing to enforce. |

**Rules checked:** 1 of 13 applicable (test-quality). **Self-check:** 1 flawed test found and fixed; 0 vacuous tests remain.

**Handoff:** To Dev (Roy Batty) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/input.ts` — removed the `AUTOFIRE_MS = 120` held-fire throttle (and its `lastAutoFire`/`performance.now()` bookkeeping). A held mouse or space button now requests `fire` on every frame; a single click still fires once via `fireQueued`. The core's 8-shot concurrent cap is the only gate on cadence.
- `src/core/rules.ts` — `BULLET_SPEED` 2.0 → 2.4 so a shot's lifetime is ~25 frames / ~0.42s (the ROM recycle rate) instead of 0.5s; the 8-slot pool now recycles at the arcade rate.

**Approach:** Minimal — the core fire gate (`stepFiring`) already implemented "no cooldown, 8-shot cap, one-per-tick" correctly, so no core-logic change was needed. The two edits target exactly the defects TEA's RED tests pinned.

**Tests:** 324/324 passing (GREEN). The 4 RED tests now pass; the 7 contract locks stay green; no regression in `sim.bullets`/`sim.collisions`. `tsc --noEmit` clean (no unused-variable fallout from the deletions).

**Branch:** `feat/6-2-auto-fire-cadence` (pushed). No PR created (SM handles PR at finish).

**ACs:** AC1 (consistent cadence, no irregular gaps) ✓ shell fires every frame; AC2 (sweep clears contiguous lanes) ✓ one shot per lane; AC3 (root cause documented) ✓ shell throttle + cap lever, see TEA Assessment; AC4 (deterministic, dt-driven, seeded core test) ✓; AC5 (no artificial cooldown, 8-shot cap + free slot, one/tick, bullet speed recycle) ✓.

**Handoff:** To Reviewer (J.F. Sebastian) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 cosmetic) | confirmed 0, deferred 1 (vestigial test stub, Low) |
| 2 | reviewer-edge-hunter | Yes | findings | 1 | confirmed 1 (HIGH — highscore AAA), dismissed 0 |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (2 nits) | confirmed 0, deferred 2 (Low: vestigial stub, import type) |

**All received:** Yes (3 active returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (HIGH), 0 dismissed, 3 deferred (Low/cosmetic)

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Held-fire auto-confirms high-score initials as "AAA" on a mouse restart. At game over a mouse click sets both `startQueued` and `mouseHeld`; the click transitions `gameover→highscore`, then the still-held mouse makes `fire` true every frame, and `stepHighScore` consumes each `fire` as a letter-confirm — inserting "AAA" in ~3 frames before the player can choose initials. On `develop` the `AUTOFIRE_MS=120` throttle masked this (a normal click released <120ms produced 0 auto-confirms); removing the throttle exposes it on every mouse high-score entry. | `src/shell/input.ts:80` (held fire every frame) → `src/core/sim.ts:50` (`stepHighScore` treats `input.fire` as a level, not an edge); transition at `src/core/sim.ts:458-469` | Make letter-confirm edge-triggered in the core (confirm only on a fire *rising edge*), so a held button doesn't repeat-confirm. Equivalent fix would also protect the `gameover→highscore` first frame. Add a seeded core regression test: holding `fire` across `gameover→highscore` must NOT auto-advance initials. |

### Observations
- `[HIGH] [EDGE]` Held-fire nukes high-score initials to "AAA" on mouse restart — `src/core/sim.ts:50` consumes `input.fire` as a level; see severity table. Independently confirmed by my own trace of the old vs new `sample()` behavior.
- `[VERIFIED]` No collision tunneling from `BULLET_SPEED 2.0→2.4` — per-tick travel `2.4/60 = 0.04` depth < hit window `0.12` (`HIT_DEPTH = 0.06`, `src/core/sim.ts:167,186`); `stepBullets` runs before `resolveBulletHits` (`sim.ts:439,441`) so positions settle first. Safe to ~level 117 (unreachable). Rule check: `rules.ts` is core and the change is a pure numeric const — no impurity.
- `[VERIFIED]` `const fire = fireQueued || mouseHeld || spaceHeld` (`src/shell/input.ts:80`) uses `||` correctly — all three are booleans (`input.ts:12,17,18`), so this is boolean OR, not the falsy-`0`/`""` `??` trap (typescript.md #4). `??` here would be wrong.
- `[VERIFIED] [RULE]` Hard core/shell purity boundary intact — `src/core/rules.ts` (core) has no DOM/time/random; `src/shell/input.ts` (shell) actually *removed* its three `performance.now()` calls. Complies with the CLAUDE.md architectural boundary rule.
- `[VERIFIED]` Held-fire blast radius is contained to highscore — `input.fire` is read only in `stepFiring` (playing, correct as a level), `stepHighScore` (broken), and nowhere else (`select`/`gameover`/`attract` read only `start`/`spin`; `warp`/`dying` ignore fire). So the AAA bug is the single regression.
- `[LOW] [SIMPLE]` Vestigial test setup — `tests/shell/input.test.ts:45` stubs `performance.now` and increments `nowMs`, but the refactored controller no longer calls `performance.now()`. Harmless (closure-captured, `noUnusedLocals` won't flag), cosmetic only. Flagged by preflight + rule-checker.
- `[LOW] [DOC]` `tests/core/sim.autofire.test.ts:13` imports `GameState` as a value where it's used only as a type annotation — `import type` would match project convention. Not a compile issue (no `isolatedModules`, `noEmit`).

### Subagent tag coverage
`[EDGE]` active — 1 HIGH finding (confirmed). `[RULE]` active — clean (14 rules, 0 violations). `[SILENT]`, `[TEST]`, `[DOC]`, `[TYPE]`, `[SEC]`, `[SIMPLE]` — disabled via `workflow.reviewer_subagents`; I assessed those domains myself from the diff (no silent-failure/error-handling code added; test quality reviewed inline and judged solid with 1 cosmetic stub; comments accurate; no new types/casts beyond accepted test scaffolding; no security surface — DOM event props only; simplification covered by the vestigial-stub note).

### Rule Compliance (typescript.md + CLAUDE.md boundary)
- **#1 type-safety escapes:** Compliant. Only escape is `target as unknown as HTMLElement` (`input.test.ts:53`) — legitimate test scaffolding (the fake bus implements the only method `createInputController` calls; no real `HTMLElement` in node env). No `as any`/`@ts-ignore`/non-null on nullable.
- **#4 null/undefined:** Compliant. `fire = ... || ...` is boolean OR (correct); `(handlers[type] || [])` defaults an absent array (correct); `.find()` result guarded before `.lane` access.
- **#8 test quality:** Compliant. All 11 tests have meaningful, non-vacuous assertions; the recycle-rate test would have failed at the old `BULLET_SPEED`; TEA self-caught and rewrote one flawed dt test.
- **CLAUDE.md hard boundary:** Compliant — core stays pure; shell change removes impurity. See VERIFIED above.
- **#2,#3,#5,#6,#7,#9–#13:** No applicable instances in the diff (no generics-of-concern, enums, async, JSX, runtime-validation surface, or error handling added). Rule-checker confirmed 0 violations across all 14 checks.

### Devil's Advocate
*Arguing this code is broken:* The strongest case — and it holds — is the high-score entry. The diff converts `fire` from a throttled pulse into a per-frame level signal, but `stepHighScore` was written against the *old* contract where a held button only pulsed every 120ms. Now any place that reads `input.fire` as a discrete action mis-fires under a held button. I enumerated every `input.fire` reader in `stepGame`: only `stepFiring` (gameplay, where level semantics are exactly what we want) and `stepHighScore` (menu confirm, where they are exactly wrong). So the bug is real and singular, not hypothetical: a player good enough to earn a high score — the reward moment — clicks to proceed and is robbed of the initials entry, every time, because a human click is held far longer than one 16.7ms frame. A confused user would conclude "AAA" is forced and the feature is broken. What about adjacent abuse? Holding both space and mouse: `fire` stays a clean boolean `true` — no crash, same AAA path. Rapid-restart spam at game over: `startQueued` is set only on the `mousedown`/`Enter` edge (not on `mouseHeld`), so the game does not rapid-restart — good. Blur mid-hold: the `blur` handler clears `mouseHeld`/`spaceHeld`, so a focus loss safely stops fire — good. Removing the `performance` global usage: nothing else in the file depended on it — safe. Faster bullets tunneling enemies: math says no within any reachable level. So the devil finds exactly one mortal flaw, and it is severe enough to block: a working feature regressed for the primary input device.

### Data flow traced
Held mouse → `input.ts sample()` returns `fire:true` every frame → `core stepGame`. In `playing`: `stepFiring` spawns one shot/tick gated by `MAX_BULLETS`, recycled at `BULLET_SPEED` — **correct and safe** (this is the story's goal). In `highscore`: the *same* `fire:true` reaches `stepHighScore` and auto-confirms initials — **the defect**. Same input, two consumers, one correct and one broken.

**Handoff:** Back to TEA (Rick Deckard) for a failing regression test, then Dev for the fix.

## TEA Assessment — Rework Round 1 (review → red)

**Reviewer verdict:** REJECTED (HIGH) — held-fire auto-confirms high-score initials to "AAA" on a mouse restart.

**Root cause (confirmed and broadened):** Removing the shell throttle makes `fire` a per-frame *held* signal, but `stepHighScore` (`src/core/sim.ts:50`) confirms on `fire` as a LEVEL. A real button tap spans several frames, so every tap overshoots — high-score initials entry is broken in general; the restart-click "AAA" is just the worst case (the click is held across the `gameover→highscore` transition). The fix is edge-triggered confirm: one `fire` rising edge = one letter.

**Tests added (RED)** — `tests/core/sim.highscore.test.ts`, new describe block "fire is edge-triggered, not level-triggered (Story 6-2 regression)":
- `confirms exactly one letter for a single multi-frame tap (held fire)` — **failing**
- `does not auto-fill initials when the restart click is held into highscore` — **failing**
- `confirms one letter per tap when the button is released between taps` — passing guard (ensures entry still completes after the fix)

**Existing 4-3 tests updated** to model discrete taps (release between presses) — see Design Deviations. No-ops under current code, so green now and after the fix.

**Status:** RED — full suite 325/327 passing; only the 2 new regression tests fail (assertion failures, verified). No other regression.

**Dev guidance:**
- Edge-trigger fire-confirm in the **core**: carry a previous-fire bit in `GameState`, and in `stepHighScore` confirm only on a `false→true` transition. This also covers the restart-click carry-over for free (fire was already down at the transition frame, so the first highscore frame is not a rising edge).
- **Do NOT change `stepFiring`** — gameplay auto-fire is correctly a per-tick level signal (that is the whole point of 6-2). Only the menu/highscore confirm needs edge semantics.
- Keep the core pure and deterministic; thread the new state through `cloneState`.

**Handoff:** To Dev (Roy Batty) for GREEN.

## Dev Assessment — Rework Round 1 (green)

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — added `prevFire: boolean` to `GameState` (default `false` in `initialState`). Carried automatically by `cloneState`'s spread.
- `src/core/sim.ts` — `stepHighScore` now confirms a letter only on a fire **rising edge** (`input.fire && !s.prevFire`); `stepGame` records `s.prevFire = input.fire` at the end of every tick.

**Approach:** Exactly TEA's contract — edge-triggered confirm, minimal surface. `stepFiring` is untouched (gameplay auto-fire stays a per-tick level signal). The same edge check fixes the restart-click carry-over for free: on the `gameover→highscore` transition the click's `fire` is already down, so `prevFire` is `true` on the first entry frame and no spurious confirm occurs.

**Tests:** 327/327 passing (GREEN). The 2 RED regression tests now pass; the release-between-taps guard passes; all 21 existing 4-3 highscore tests pass; no regression in `sim.autofire`/`sim.bullets`/`input`. `tsc --noEmit` clean (the new required `GameState.prevFire` field broke no manual construction — all states flow through `initialState`).

**Branch:** `feat/6-2-auto-fire-cadence` (pushed, `8da348a`). No PR (SM handles at finish).

**Reviewer finding status:** HIGH (held-fire auto-fills "AAA") — RESOLVED. Two non-blocking test-cleanup notes left as optional follow-ups (out of scope for this fix).

**Handoff:** To Reviewer (J.F. Sebastian) for re-review.

## Subagent Results
_(Re-review, Round 2 — on the edge-trigger fix)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0 (tsc clean, 327/327) |
| 2 | reviewer-edge-hunter | Yes | findings | 1 (LOW) | confirmed 1 (LOW, pre-existing, non-blocking) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (LOW) | confirmed 1 (dead stub/stale comment), dismissed 1 (accepted test scaffolding) |

**All received:** Yes (3 active returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 blocking; 3 LOW non-blocking (2 test cleanup, 1 pre-existing rare edge)

## Reviewer Assessment
_(Re-review, Round 2)_

**Verdict:** APPROVED

The HIGH regression from round 1 (held-fire auto-fills high-score initials to "AAA") is **RESOLVED** by edge-triggered confirm. No Critical/High issues remain; the surviving findings are all LOW and non-blocking.

### Observations
- `[VERIFIED]` HIGH regression resolved — `stepHighScore` now confirms only on a fire rising edge (`src/core/sim.ts:54`, `input.fire && !s.prevFire`). The `gameover→highscore` restart-click no longer auto-confirms: the click's fire is already down at the transition, so `s.prevFire` is `true` on the first entry frame (edge-hunter trace + passing regression tests `confirms exactly one letter…` and `does not auto-fill initials…`).
- `[VERIFIED] [RULE]` Core purity preserved — `prevFire` is a plain boolean in `GameState`; `s.prevFire = input.fire` (`src/core/sim.ts:476`) is deterministic, consumes no RNG, touches no DOM/Date. Complies with the CLAUDE.md hard boundary.
- `[VERIFIED]` `prevFire` threading correct — `initialState` sets `false` (`state.ts:126`); `cloneState`'s `...s` spread carries the primitive; it is written at the END of `stepGame` (after `stepHighScore` reads it), on every mode path — no init gap, correct frame ordering.
- `[VERIFIED]` `prevFire` cannot get stuck — the shell clears `mouseHeld`/`spaceHeld` on `mouseup`/`keyup`/`blur` and resets `fireQueued` each `sample()`, so a release always drives `fire=false` → `prevFire=false` next tick (edge-hunter #4). The player can always confirm.
- `[VERIFIED] [TEST]` Regression tests genuinely pin the contract — held 6-frame tap → `charIndex` 1 (not 6); restart-click-held → no "AAA"; release-between-taps guard → entry still completes. Updated 4-3 tests model real discrete taps without weakening assertions.
- `[LOW] [EDGE]` On a rising-edge confirm frame, a spin delivered in the same ~16ms frame is consumed without cycling (the `else if (spin)` is unreachable that frame). **Pre-existing** — the original level-triggered code prioritized fire over spin identically; not a rework regression. Non-blocking (`src/core/sim.ts:54-62`).
- `[LOW] [RULE]` `tests/shell/input.test.ts` — dead `performance`/`nowMs` stub after the throttle removal, and a now-false header comment ("reads performance.now()", line 10). Non-blocking test cleanup; filed as a delivery finding.
- `[LOW] [RULE]` `tests/shell/input.test.ts:53` `target as unknown as HTMLElement` — **dismissed**: legitimate test scaffolding; the fake bus implements the only method `createInputController` calls (`addEventListener`) and no real `HTMLElement` exists in the node env. typescript.md #1 ("almost always wrong") permits this exception.

### Subagent tag coverage
`[EDGE]` active — 1 LOW (pre-existing). `[RULE]` active — 2 LOW (1 confirmed cleanup, 1 dismissed). `[SILENT]`, `[TEST]`, `[DOC]`, `[TYPE]`, `[SEC]`, `[SIMPLE]` — disabled via settings; assessed inline: no error-handling/silent-failure code added; test quality reviewed (solid, non-vacuous); the one stale comment was caught via the rule-checker; no new types/casts beyond the accepted scaffolding; no security surface (boolean derived from a typed Input); the only simplification item is the dead stub above.

### Rule Compliance (typescript.md + CLAUDE.md boundary)
- **#1 type-safety escapes:** Compliant — only escape is the accepted `as unknown as HTMLElement` test scaffolding.
- **#4 null/undefined:** Compliant — `input.fire && !s.prevFire` is boolean AND; no nullish concern.
- **#8 test quality:** Compliant — new regression tests are non-vacuous and fail against the pre-fix code; updated 4-3 tests retain their assertions.
- **CLAUDE.md hard boundary:** Compliant — `prevFire` keeps the core pure and deterministic; `stepFiring` (gameplay) untouched.
- **#2,#3,#5,#6,#7,#9–#13:** No applicable instances introduced by the fix; rule-checker confirmed.

### Devil's Advocate
*Arguing the fix is broken or insufficient:* The fear is that edge-triggering trades one bug for another — that a player could now be unable to confirm, or that `prevFire` desyncs from the shell's held-state. Both fail under scrutiny. A release is always reachable (`mouseup`/`keyup`/`blur` clear held flags; `fireQueued` resets each sample), so `prevFire` always falls back to `false` and the next press is a fresh edge — no lockout. The restart-click carry-over, the actual round-1 blocker, is closed at the root: the confirm gate reads the previous frame's fire, and that previous frame (the gameover click) had fire down, so the first entry frame is not an edge. Could two confirms still leak? Traced frame-by-frame: the transition frame runs only the `gameover` case (no `stepHighScore`), sets `prevFire=true`, and the held next frame is not an edge — exactly one or zero confirms, never three. Could the global `s.prevFire = input.fire` write harm other modes? It is read only inside `stepHighScore`; `stepFiring` checks `input.fire` directly and is untouched, so gameplay cadence (the whole point of 6-2) is unaffected. The one genuine wart is cosmetic: a spin in the same frame as a confirm press is dropped — but that priority is pre-existing and requires two inputs inside 16ms. Nothing here rises to blocking. The fix is correct, minimal, pure, and tested.

### Data flow traced
Held button → shell `fire:true` every frame → `stepGame`. In `highscore`: `stepHighScore` confirms only on `!prevFire → fire`, i.e. once per physical press, regardless of hold duration. In `playing`: `stepFiring` still treats `fire` as a per-tick level (unchanged). Same input, correct per-context semantics — the round-1 defect is closed without touching gameplay.

**Handoff:** To SM (Captain Bryant) for finish-story.