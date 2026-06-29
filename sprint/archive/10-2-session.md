---
story_id: "10-2"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-2: Superzapper timing window (TIMAX 13/5 frames) + web color flash

## Story Details
- **ID:** 10-2
- **Jira Key:** (none — local sprint)
- **Workflow:** tdd
- **Points:** 3
- **Repo:** tempest
- **Branch:** feat/10-2-superzapper-timing-window
- **Stack Parent:** none (not a stacked story)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T15:05:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T13:49:10Z | 2026-06-29T13:50:44Z | 1m 34s |
| red | 2026-06-29T13:50:44Z | 2026-06-29T14:29:40Z | 38m 56s |
| green | 2026-06-29T14:29:40Z | 2026-06-29T14:47:41Z | 18m 1s |
| review | 2026-06-29T14:47:41Z | 2026-06-29T15:05:56Z | 18m 15s |
| finish | 2026-06-29T15:05:56Z | - | - |

## Story Context

**Overview:** Model the multi-frame Superzapper weapon timing in Tempest.
The ROM's TIMAX counter runs the first zap active for ~13 frames and the second
for ~5 frames, killing enemies on a per-frame cadence (KILENE). The well color
flashes (QFRAME AND 7) each active zap frame.

**Current State:** `stepZap()` in `tempest/src/core/sim.ts:444-475` resolves
instantly with no timer or flash behavior.

**Technical Approach:**
1. Add frame-based state machine to `stepZap()` to model TIMAX timing
2. Implement two-phase zap: first phase ~13 frames, second phase ~5 frames
3. Add per-frame kill logic (KILENE) that kills one enemy per frame during zap
4. Implement well color flash (QFRAME AND 7) for each active frame
5. Build test coverage in `tempest/tests/core/sim.superzapper.test.ts`

**Acceptance Criteria:**
- [ ] Zap first phase activates for 13 ± 1 frame(s)
- [ ] Zap second phase (if triggered) activates for 5 ± 1 frame(s)
- [ ] One enemy killed per active frame during zap phases
- [ ] Well color flashes on (QFRAME AND 7) each active frame
- [ ] Clear behavior matches ROM reference ("Tempest vs Tempest" book)
- [ ] All tests pass; no debug code in tree

**Dependencies:**
- Story 10-1 (Superzapper first-press correctness) must be complete
- ROM TIMAX counter reference: context-epic-10.md (Superzapper section)
- "Tempest vs Tempest" book chapter on superzap timing

## Sm Assessment

Setup complete and ready for RED. This is a well-scoped 3-point fidelity story in
`tempest/src/core/sim.ts` — the deterministic core, exactly where TDD earns its
keep. Builds directly on 10-1, which just landed first-press correctness in the
same `stepZap()` (sim.ts:444-475).

**The shape of it:** Today `stepZap()` resolves a zap *instantly* — full charge
kills every enemy in one frame, second press kills the rim-nearest enemy in one
frame, then `spent`. The ROM does NOT do this in one tick. Per TIMAX/KILENE, the
first activation stays "active" ~13 frames, the second ~5, killing on a per-frame
cadence and flashing the well color (QFRAME AND 7) each active frame.

**The one real design knot for TEA/Dev to resolve against the ROM (flag it):**
how does 10-1's "first press vaporises *all* enemies" reconcile with 10-2's
"one kill per active frame for ~13 frames"? These can read as contradictory.
Resolve against the authentic ROM, which is canonical here — do not re-tune the
canonical behavior to taste (see memory: tempest-rom-is-canonical). If the ROM
spreads kills across the window, the timing window IS the kill mechanism; if it
kills-all-then-idles-flashing, the flash is cosmetic over an already-cleared
board. TEA should pin this down from `docs/tempest-1981-source-findings.md`
before writing assertions, not guess.

**New state required:** `s.player.superzapper` is currently a 3-value enum
(`full`/`used-once`/`spent`). Modeling an active-frame countdown needs a timer
field in `GameState` (state.ts). All timing must flow through frame steps — no
`Date.now()`/`performance.now()` (hard core boundary). The well-color *flash* is
a visual concern: core should emit a per-active-frame signal/event (testable),
shell does the actual canvas color (verified by running the game, not unit tests).

**Test target:** `tempest/tests/core/sim.superzapper.test.ts` (exists from 10-1).
Cover: first phase active ~13 frames, second ~5, per-frame kill cadence, flash
signal emitted each active frame, and — critically — that 10-1's first-press
correctness (spare tankers, clear in-flight enemy bolts, second-press one-kill,
declaw) does NOT regress.

**Guardrails:** Ratchet fidelity *up to* the ROM, not past it (memory:
tempest-difficulty-ratchet). No coin-op urgency mechanics. Keep determinism intact.

Routing to The Jesus (TEA) for RED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Pure-core simulation change in `stepZap()` — the deterministic heart of
the game, exactly where TDD pays. The story rewrites the superzapper from an instant
resolve to a multi-frame TIMAX/KILENE window.

**Test Files:**
- `tempest/tests/core/sim.superzapper.test.ts` — rewritten from the 10-1 single-step
  contract to the 10-2 windowed contract; all 10-1/4-1 net-outcome intent preserved.

**Tests Written:** 34 tests total (was 17). 14 NEW 10-2-delta tests fail (RED); 20
unchanged-contract / net-outcome invariants pass (proving 10-1's behavior is preserved,
not faked). Verified via `testing-runner` (RUN_ID 10-2-tea-red): file compiles, loads,
and runs — failures are assertion-level, not syntax.
**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule / property | Test(s) | Status |
|-----------------|---------|--------|
| Determinism (core boundary: no Date.now/random) | `identical board + identical input give an identical per-frame trace and final state` | failing (window not built) |
| dt-independence (time enters as dt; window frame-counted) | `is dt-INDEPENDENT — doubling dt does not shorten the window` | failing |
| Purity (no input mutation) | `the press frame does not mutate its input state (pure step)` | failing |
| Per-frame cadence, not instant (AC-2) | `does NOT clear the board in a single step`, `removes exactly one enemy per active frame` | failing |
| Active-window timer on player state (AC-1) | `the first press opens an active window`, `the window counts DOWN by one per frame` | failing |
| Window lengths 13±1 / 5±1 (AC-1) | `first window is LONGER than the second`, `runs a shorter flash window` | failing |
| Per-frame flash signal 0..7 (AC-3) | `emits exactly one flash event on every active frame`, `flash color is a QFRAME-AND-7 index in 0..7`, `flash color actually CHANGES`, `flash STOPS once the window closes` | failing |
| Net kills preserved (AC-5) | `NET outcome equals 10-1`, `NET score equals 10-1`, weak-shot `destroys exactly ONE` | passing (invariant) |
| 10-1 bolt-clear / declaw not regressed | `clears every in-flight enemy bolt`, `a zap kill never releases tanker cargo` | passing (invariant) |
| Self-running window (no held button) | `the window self-runs on NEUTRAL input`, `HOLDING zap through the first window does not start the second early` | failing |

**Rules checked:** Core hard-boundary rules (determinism, purity, dt-independence)
plus all 5 story ACs have test coverage. TS lang-review #1/#8 (casts) flagged as a
GREEN-phase cleanup, not a test defect.
**Self-check:** 2 tests were strengthened to remove vacuous-in-RED passes
(dt-independence and hold-zap now assert a real window opens, so they fail now instead
of passing on `0 === 0`). No `assert(true)` / dead assertions remain.

**Handoff:** To Walter (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/core/sim.ts` — rewrote `stepZap()` as a multi-frame window state
  machine (TIMAX/KILENE). A press opens a SELF-RUNNING active window (input ignored
  while live): first press clears in-flight bolts + consumes the charge + vaporises
  one non-tanker per active frame across ~13 frames; second press kills one (nearest
  the rim) on the press frame then flashes out over ~5 frames. New helpers
  `nearestRimIndex`, `zapKillAt`, `runZapFrame`. Reset `zapTimer` on rearm/respawn.
- `tempest/src/core/state.ts` — added `Player.zapTimer` (active-window frames left),
  initialised to 0.
- `tempest/src/core/events.ts` — added `SuperzapperFlashEvent { color }` to the
  `GameEvent` union.
- `tempest/src/core/rules.ts` — `ZAP_WINDOW_FIRST = 13`, `ZAP_WINDOW_SECOND = 5`.
- `tempest/src/shell/audio-dispatch.ts` — explicit visual-only no-op case for
  `superzapper-flash` (keeps the exhaustiveness guard green; the zap's sound already
  fires on `superzapper-activate`).
- Tests: removed RED-phase casts in `sim.superzapper.test.ts`; adapted
  `sim.events.test.ts` + `events.test.ts` for the windowed contract and the new
  event variant; parked `mixedBoard` survivors (see Design Deviations → Dev).

**Tests:** 597/597 passing (GREEN) across 59 files. `tsc --noEmit` clean; vite build OK.
Verified via `testing-runner` (RUN_ID 10-2-dev-green-2).
**Branch:** feat/10-2-superzapper-timing-window (pushed)

**Self-review:**
- ACs met: active-timer on player state ✓; first window ~13 / second ~5 ✓; one kill
  per active frame ✓; deterministic per-frame flash signal 0..7 that reverts after ✓;
  net kills (first = all non-tankers, second = exactly 1) ✓; dt-independent &
  deterministic ✓. **Caveat:** the VISIBLE well-flash RENDER is deferred — the core
  signal is delivered & tested, the canvas tint is a tracked follow-up (deviations +
  Delivery Findings).
- Determinism/purity intact: no Date.now/random/DOM in core; `cloneState` carries
  `zapTimer`; pure-step tests pass; no debug code.

**Handoff:** To The Big Lebowski (Reviewer) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (597/597 green, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges assessed manually (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed manually (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (3 medium, 2 low) | confirmed 5 (all non-blocking), dismissed 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments assessed manually (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types covered by rule-checker (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed manually (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rules / 41 instances / 0 violations) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (1 Reviewer-MEDIUM, 2 test-MEDIUM, 3 LOW — all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. The headline mechanic — the multi-frame TIMAX/KILENE
window — is implemented correctly, is thoroughly covered (597/597 green), keeps the
hard core-purity boundary intact, and preserves every 10-1 net-outcome invariant.
The findings below are one MEDIUM behavior-drift (undocumented, rare edge) and
test-hardening nits; none meet the blocking bar.

### Rule Compliance (enumerated against the changed symbols)

Governing rules: tempest **hard core-purity boundary** (CLAUDE.md) + TS lang-review
checklist. No `.claude/rules/*.md` or `SOUL.md` exist. Tenant isolation: **N/A** —
browser game, no backend, no auth, no network, no tenants; input is keyboard/spinner
only; no trait method handles external data.

| Symbol (diff) | Rule | Verdict |
|---|---|---|
| `SuperzapperFlashEvent` (events.ts) added to `GameEvent` union | #3 exhaustiveness | ✓ BOTH switch sites updated — `audio-dispatch.ts:50` + `events.test.ts:57` discriminant; grep confirms NO other `switch(e.type)` exists. `never` guards intact. |
| `Player.zapTimer: number` (state.ts) | #1 type-safety, #13 init | ✓ typed `number` (not optional/any); initialised at all 3 sites — `initialState`, `startGameAtLevel`, `startLevel`. |
| `ZAP_WINDOW_FIRST/SECOND` (rules.ts) | #2 generics | ✓ plain numeric consts. |
| `nearestRimIndex`/`zapKillAt`/`runZapFrame`/`stepZap` (sim.ts) | purity boundary; #1 escapes; #4 `??`/`||` | ✓ no DOM/`window`/`Date`/`Math.random`/rAF/shell-import; no `as any`/`as unknown as`/`!`; `||` uses are boolean/sentinel guards, not nullish defaults; `zapTimer & 7` is deterministic. |
| test files | #8 test quality | ✓ RED-phase `as unknown as` casts CONFIRMED REMOVED (rule-checker grep = 0); `flashesOf` uses a runtime-validated `is` predicate; assertions are concrete. |

Verified clean by the AC6 purity-scan test in `events.test.ts`, which greps
`sim.ts`/`state.ts`/`events.ts` for the forbidden tokens in CI.

### Observations

- `[VERIFIED]` **Purity/determinism intact** — `runZapFrame` color = `s.player.zapTimer & 7` (sim.ts), no RNG/time/DOM; corroborated by [SEC] + [RULE]. Complies with the CLAUDE.md hard boundary.
- `[VERIFIED]` **Window terminates, never underflows** — `zapTimer` set to 13/5 then decremented only inside the `> 0`-guarded branch or immediately after a positive set; reaches exactly 0 and stops (sim.ts:488-492). [SEC] traced the same.
- `[VERIFIED]` **No stale window across a death** — a mid-window death flips `mode` out of `'playing'` (stepZap won't dispatch); `respawn → startLevel` zeros `zapTimer` (sim.ts:363), and warp-crash deaths route through `advanceLevel → startLevel`. Independently confirmed by [SEC].
- `[VERIFIED]` **killCount change is inert downstream** — `superzapper-activate.killCount` now counts non-tankers and is emitted once on the press frame; grep shows the ONLY consumer is `audio-dispatch.ts` which ignores the value (plays a sound). No HUD/render reads it. (Raised by [preflight]; verified safe.)
- `[EDGE] [MEDIUM]` **Undocumented empty-board behavior drift** at `sim.ts` stepZap — the rewrite dropped the old `enemies.length === 0` early-return, which encoded two deliberate prior decisions (per the removed comment: *"a weak shot with no target is wasted-but-not-spent … No enemies means … (by design, Story 5-1) no activation event"*). Now a zap press on a truly empty board (a) emits `superzapper-activate` (plays the zap SOUND) + opens a flash window, and (b) a SECOND press CONSUMES the charge (`used-once → spent`) instead of preserving it. Untested and unlogged as a deviation. Non-blocking (rare in play; new behavior is defensible) but must not slip silently — see audit + Delivery Finding.
- `[TEST] [MEDIUM]` **Flash-color "changes" assertion is weak** at `sim.superzapper.test.ts` — `new Set(seen).size > 1` would pass a buggy `% 6` cycle; the correct `& 7` over a 13-frame window visits all 8 values, so `.toBe(8)` (or `>= 7`) would be a tighter guard. Impl is correct; this is test sensitivity.
- `[TEST] [MEDIUM]` **Window-length ±1 tolerance is loose** at `sim.superzapper.test.ts` — ranges [12,14]/[4,6] would pass an off-by-one `ZAP_WINDOW_FIRST=12`. The ROM bytes are exact (13/5); recommend asserting exact counts (import the constants) since TEA's ±1 was a hedge, not a real ROM range.
- `[TEST] [LOW]` **Termination not co-verified in outcome tests** — `runZap` cap=40 means a stuck-timer regression would still pass the NET-outcome tests (kills finish by frame 3); it IS caught by the dedicated "counts down… → 0" and "flash STOPS" tests, so coverage exists, but a `zapTimer(final) === 0` postcondition in `runZap` would harden every caller.
- `[TEST] [LOW]` **Determinism test compares counts, not colors** — the trace is `{flashes,deaths,enemies}` counts; exact color-sequence equality across runs isn't asserted here (it is asserted per-frame elsewhere). Belt-and-suspenders only; determinism is architecturally guaranteed.
- `[TEST] [LOW]` **`sim.events.test.ts` weak-shot test doesn't show the flash window** — only press-frame events asserted; the 5-frame flash window is covered in `sim.superzapper.test.ts`, so no coverage gap, just file-local self-documentation.
- `[SILENT]` **Clean** — no try/catch, no swallowed errors; the `if (idx >= 0)` guards are explicit (empty board → no kill), not silent fallbacks.
- `[DOC]` **Clean** — new comments are accurate; the removed/added comments correctly describe the windowed model; the only stale-comment risk (old "vaporises every enemy") was fully replaced.
- `[TYPE]` **Clean** — covered exhaustively by [RULE]: proper string-literal union member, typed helpers, no escapes.
- `[SIMPLE]` **Clean** — `stepZap` decomposed into 3 small single-purpose helpers; no dead code, no over-engineering; the active-window-first branch is the minimal control structure.

### Data flow traced

`input.zap` (keyboard/spinner) → `stepGame` 'playing' → `stepZap`: if a window is
live (`zapTimer > 0`) it self-runs (`runZapFrame`) ignoring input; else a fresh press
opens a window, mutating only the cloned state (`cloneState` deep-copies `player` +
`enemies`). Outputs are `enemy-death`, `superzapper-activate`, and `superzapper-flash`
events on `s.events`. Consumers: `audio-dispatch.playEventSounds` (sound on activate,
no-op on flash). The flash's `color` reaches no renderer yet (deferred — documented).
Safe: no external input, no I/O, no mutation of the caller's state (purity tests pass).

### Devil's Advocate

Assume this is broken. First attack: the window self-runs while `input` is ignored —
what if the player dies mid-window? I chased this: a death changes `mode`, so `stepZap`
stops dispatching, and `respawn`/`advanceLevel` both funnel through `startLevel` which
zeros `zapTimer`. Confirmed safe in code AND by the security agent — but note the ONLY
reason it's safe is that `startLevel` resets the timer; if a future refactor adds a
respawn path that bypasses `startLevel`, the window WOULD resume on the new life,
granting free kills. That's a latent fragility worth a comment, though not a current
bug. Second attack: the empty-board press. Here the code genuinely changed behavior —
it now plays the zap sound and burns the second charge on an empty tube, reversing two
documented Story-5-1/4-1 decisions. A confused player who taps the second zap a frame
after the last enemy dies loses their once-per-level shot AND hears the big sound for
nothing. That's a real, if minor, regression and it's untested — exactly the silent
drift review exists to catch; I've flagged it. Third attack: the flash color. Could it
be a meaningless constant? No — `& 7` over 13 frames provably cycles all eight values,
and the tests assert range + variation (though too loosely — a `% 6` impostor would
survive, which is why I confirmed the real impl by hand). Fourth: could `zapTimer`
desync the RNG or skip frames under variable `dt`? No — it's frame-counted, decremented
once per `stepGame`, independent of `dt`, and consumes no RNG; the dt-independence test
pins this. Fifth: integer underflow or infinite loop? Bounded to [0,13], strictly
decreasing, guarded — terminates. Conclusion: the code is sound; the only substantive
crack is the undocumented empty-board edge, which is MEDIUM, not a blocker.

### Challenge of VERIFIEDs

Each `[VERIFIED]` was cross-checked against subagent output: my purity/termination/
respawn verifieds are directly corroborated by [SEC]; the exhaustiveness/type verifieds
by [RULE]; the killCount-inert verified by my own grep (no shell consumer). No subagent
contradicts a VERIFIED. The test-analyzer findings do not contradict any VERIFIED — they
target test *sensitivity*, not implementation correctness, and I have confirmed the impl
is correct where the tests are loose.

**Handoff:** To The Dude (SM) for finish-story.

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): Dev must REMOVE the `as unknown as` casts in the
  test helpers `zapTimer()` and `flashesOf()` once `player.zapTimer` (number) and a
  `SuperzapperFlashEvent` (`{ type: 'superzapper-flash'; color: number }`, color
  0..7) are added to the real types, so the suite references the true types and the
  TS lang-review #1/#8 stays clean. Affects
  `tempest/tests/core/sim.superzapper.test.ts`, `tempest/src/core/state.ts`,
  `tempest/src/core/events.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): The `superzapper-flash` event must be added to the
  `GameEvent` union in `tempest/src/core/events.ts` so consumers' `switch (e.type)`
  stay exhaustive; the shell render layer (out of this story's core scope) will map
  color 0..7 to the actual well palette. Affects `tempest/src/core/events.ts` and the
  shell renderer (follow-up). *Found by TEA during test design.*
- **Conflict** (blocking → RESOLVED): Story 10-2 depends on 10-1's first-press
  behavior ("first clears non-tankers"), but at RED start 10-1 was NOT in this
  branch's base — tempest PR #61 (`feat/10-1-superzapper-first-press`) was still
  OPEN while sprint tracking marked 10-1 "complete", so the current `stepZap` was
  the PRE-10-1 baseline (first press killed tankers too, left bolts in flight).
  **Resolution (user-approved):** squash-merged PR #61 into develop
  (develop@032ff5f) and rebased this branch onto it; `stepZap` now spares tankers
  and clears bolts (verified). RED tests were written on this truthful baseline.
  Affects `tempest/src/core/sim.ts`, `tempest/tests/core/sim.superzapper.test.ts`.
  *Found by TEA during test design; resolved before writing tests.*
- **Question** (non-blocking): The merge gate (`gates/merge-ready`) cleared 10-2
  because it inspects the orchestrator repo's PRs, not the tempest subrepo's —
  so an open subrepo PR for a "completed" story slipped the gate. Affects the
  merge-gate scope (consider checking subrepo PRs). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The VISIBLE well-color flash render is a follow-up.
  The pure core emits `superzapper-flash` (color 0..7) deterministically each active
  frame and reverts after, but no shell renderer consumes it yet (audio-dispatch
  treats it as a visual-only no-op). Affects `tempest/src/shell/render.ts` — map the
  color index 0..7 to the well palette and tint the tube each active zap frame to
  make the flash visible in-game. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Empty-board zap behavior silently reversed two
  documented Story-5-1/4-1 decisions — a press on a board with NO enemies now emits
  `superzapper-activate` (plays the sound) + opens a flash window, and a SECOND press
  CONSUMES the charge instead of "wasted-but-not-spent". Affects
  `tempest/src/core/sim.ts` (`stepZap`) — either restore the `enemies.length === 0`
  early-return (no activate, preserve weak-shot charge) OR keep the new behavior and
  add tests pinning it + a deviation log. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test sensitivity — the flash-color "changes"
  assertion (`Set size > 1`) and the window-length ±1 ranges ([12,14]/[4,6]) would
  pass an off-by-one or a `% 6` color cycle. Affects
  `tempest/tests/core/sim.superzapper.test.ts` — tighten to `.toBe(8)` colors and
  exact `ZAP_WINDOW_FIRST/SECOND` frame counts (the ROM bytes are exact).
  *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **First-press timing contract shifts instant → windowed**
  - Spec source: context-story-10-2.md, AC-2 ("removed on a per-frame cadence
    across the window, not all in one frame") and AC-5 ("first clears non-tankers")
  - Spec text: "Enemies are removed on a per-frame cadence across the window"
  - Implementation: The just-merged 10-1 single-step first-press tests
    (`vaporises EVERY enemy on screen` / `first press kills every non-tanker` in
    one `stepGame` call) are ADAPTED to drive the window to completion and assert
    the same NET outcome (all non-tankers cleared, tankers spared, bolts cleared).
    Coverage intent is preserved; the one-step timing assertion is superseded by
    the AC-mandated windowed cadence.
  - Rationale: 10-2's AC-2 directly contradicts the instant-clear assertion; both
    cannot pass. The contract change is the story, not a regression.
  - Severity: minor
  - Forward impact: Dev's `stepZap` becomes a self-running frame state machine;
    GREEN cannot satisfy both instant and windowed, so the old assertions had to move.
- **Per-frame victim order asserted as cadence + determinism, not a fixed order**
  - Spec source: context-story-10-2.md, AC-2/AC-4; problem statement (KILENE)
  - Spec text: "killing on a per-frame cadence (KILENE)" / "deterministic"
  - Implementation: Tests assert ≤1 death per active frame, net deaths = non-tanker
    count, and identical runs produce identical per-frame traces — but do NOT pin
    WHICH enemy dies on each specific frame (the in-repo ROM extract
    `docs/tempest-1981-source-findings.md` referenced by the epic does not exist,
    so KILENE's exact selection order is unsourced).
  - Rationale: Avoids coupling tests to an unsourced implementation detail while
    still enforcing cadence + determinism. Dev picks a deterministic order.
  - Severity: minor
  - Forward impact: none — net outcome is order-independent (all non-tankers die).
- **RED-phase casts bridge not-yet-existing types**
  - Spec source: tempest TS lang-review checklist #1 (`as unknown as T`) / #8 (test casts)
  - Spec text: "`as unknown as T` — double-cast bypass, almost always wrong"
  - Implementation: The test helpers `zapTimer()` and `flashesOf()` reach for
    `player.zapTimer` and the `superzapper-flash` event via `as unknown as` casts,
    because those types do not exist yet (RED).
  - Rationale: A RED suite must compile and run before the implementation adds the
    types; the casts are the bridge.
  - Severity: minor
  - Forward impact: Dev MUST remove these casts at GREEN once `player.zapTimer` and
    `SuperzapperFlashEvent` are real, so the tests reference the true types (see
    Delivery Findings).
- **Window length asserted within the AC's ±1 tolerance; flash modeled as an event**
  - Spec source: context-story-10-2.md, AC-1/AC-3; SM assessment guidance
  - Spec text: "first activation runs the longer window, second the shorter";
    "Well/web color flashes per-frame deterministically while a zap is active"
  - Implementation: First window asserted 12–14 frames, second 4–6 (honoring the
    YAML "13 ± 1" / "5 ± 1"); flash is a new core `superzapper-flash` event
    carrying a `color` index in 0..7 (QFRAME AND 7), per SM's "core emits a signal,
    shell paints the canvas" split — color range + determinism asserted, exact
    QFRAME phase not pinned.
  - Rationale: Honors the AC's stated tolerance; keeps the visual concern testable
    in the pure core without coupling to a render color table.
  - Severity: minor
  - Forward impact: Dev adds `SuperzapperFlashEvent` to events.ts and a
    player-state active-timer field (`zapTimer`).

### Dev (implementation)
- **Flash color derived from the zap timer, not a global QFRAME counter**
  - Spec source: context-story-10-2.md, AC-3; problem statement "(QFRAME AND 7)"
  - Spec text: "flashes the well color (QFRAME AND 7) each active frame"
  - Implementation: `superzapper-flash.color = s.player.zapTimer & 7`. The sim has
    no global frame counter (QFRAME); the active-window timer is the available
    deterministic per-frame value.
  - Rationale: Adding a global frame counter to `GameState` is scope creep; the
    timer-derived index is deterministic, cycles 0..7, and changes every active
    frame — satisfying the tested contract (range + determinism + variation).
  - Severity: minor
  - Forward impact: If a later story needs the exact ROM QFRAME phase, a global
    frame counter would have to be threaded through the sim.
- **Visible well-flash RENDER deferred to a follow-up (core signal only)**
  - Spec source: context-story-10-2.md, AC-3 / story title "+ web color flash"
  - Spec text: "Well/web color flashes per-frame deterministically while a zap is
    active, reverting after"
  - Implementation: The pure core emits a per-active-frame `superzapper-flash`
    event (color 0..7), fully unit-tested, and reverts (stops) when the window
    closes. The shell renderer does NOT yet paint the well from it (audio-dispatch
    consumes it as an explicit visual-only no-op).
  - Rationale: TEA scoped the render layer out of core scope; the palette mapping
    and brightness are un-spec'd visual choices that need eyes-on-canvas and have
    no unit coverage. Delivered the tested, deterministic core mechanic; left the
    canvas tint as a tracked follow-up (see Delivery Findings).
  - Severity: minor (headline mechanic — windowed kills + deterministic flash
    signal — is delivered and tested; the visible tint is the remaining piece)
  - Forward impact: A follow-up render story must consume `superzapper-flash` and
    tint the well palette; until then the flash is not visible in-game.
- **Extended the instant→windowed contract shift to sibling test files**
  - Spec source: TEA deviation "First-press timing contract shifts instant →
    windowed"; context-story-10-2.md AC-2
  - Spec text: "removed on a per-frame cadence across the window, not all in one frame"
  - Implementation: Adapted `tests/core/sim.events.test.ts` (the instant
    full-blast event test) to drive the window and assert the net stream (1
    activate w/ killCount 3, 3 deaths, board cleared). Registered the new
    `SuperzapperFlashEvent` in `tests/core/events.test.ts` (union fixture +
    exhaustive `discriminant()` switch + count 10→11). Parked `mixedBoard`
    non-tankers at `fireCooldown: 999` to isolate the bolt-clear assertion from
    same-frame enemy fire (the windowed cadence leaves more survivors than 10-1).
  - Rationale: TEA's contract shift legitimately reaches these files (TEA updated
    only sim.superzapper.test.ts); adding a union variant forces registry +
    exhaustiveness updates. No assertion was weakened — intents preserved.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
Every logged deviation stamped:
- **TEA-1 (instant → windowed first press)** → ✓ ACCEPTED: correct reading of AC-2;
  net outcome preserved and verified by the passing invariant tests.
- **TEA-2 (cadence asserted, not victim order)** → ✓ ACCEPTED: avoids coupling to an
  unsourced KILENE order; determinism still pinned.
- **TEA-3 (RED-phase casts bridge)** → ✓ ACCEPTED: casts confirmed REMOVED at GREEN
  (rule-checker grep = 0 instances).
- **TEA-4 (window ±1 tolerance; flash-as-event)** → ✓ ACCEPTED with note: flash-as-event
  is sound; the ±1 tolerance is loose given exact ROM bytes — captured as a non-blocking
  test-tightening finding, not a reversal.
- **Dev-1 (flash color from `zapTimer & 7`, not global QFRAME)** → ✓ ACCEPTED: deterministic
  and provably cycles all 8 values over a 13-frame window; a global frame counter would be
  scope creep.
- **Dev-2 (visible flash render deferred)** → ✓ ACCEPTED: matches TEA's core/shell scoping;
  the core signal is delivered + tested; tracked as a Delivery Finding for the renderer.
- **Dev-3 (extended contract shift to sibling test files + parked fixtures)** → ✓ ACCEPTED:
  necessary registry/exhaustiveness updates; no coverage weakened ([RULE] + manual confirm).

UNDOCUMENTED deviation found by Reviewer:
- **Empty-board zap behavior reversed:** Spec/prior design (Story 5-1/4-1, per the removed
  `stepZap` comment) said a zap with no enemies emits NO activation event, and a weak shot
  with no target is "wasted-but-not-spent" (charge preserved). The code now emits
  `superzapper-activate` + a flash window on an empty press, and the second press consumes
  the charge. Not logged by TEA/Dev, not tested. Severity: MEDIUM (non-blocking — rare in
  play, new behavior defensible). Disposition: APPROVED to merge with a tracked Delivery
  Finding to either restore the prior behavior or pin the new one with a test + deviation.