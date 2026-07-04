---
story_id: "bz2-5"
jira_key: ""
epic: "bz2"
workflow: "tdd"
---
# Story bz2-5: Pause overlay + control indicator — Escape pauses and shows keybinds

## Story Details
- **ID:** bz2-5
- **Jira Key:** (none — local YAML tracking only)
- **Workflow:** tdd
- **Stack Parent:** none (independent, no depends_on)
- **Points:** 3
- **Priority:** p2
- **Repo:** battlezone

## Acceptance Criteria
1. Escape key pauses the game (freezes simulation tick, halts input processing)
2. When paused, an overlay appears showing current keybinds (e.g., WASD = move, space/ctrl = fire, Escape = resume)
3. Resume (unpause) on subsequent Escape press
4. Control indicator visible on-screen at all times during play (not just when paused) — shows current control scheme (e.g., "Dual-stick" or "Keyboard")
5. Pause state does not mutate core simulation — only halts tick advancement; resume continues deterministically
6. Overlay does not break existing game rendering or test suite

## Technical Approach

### Architecture Notes
The battlezone repo maintains core/shell separation:
- **Core** (`src/core`): Deterministic planar sim + Math Box (math3d) — stays pure, no imports from shell
- **Shell** (`src/shell`): Render, input handling, main loop, audio

**Pause design respects this boundary:**
- **Input layer** (shell): Detect Escape key in input handler
- **Loop layer** (shell): Add `paused` state flag; when paused, skip `core.tick()` call
- **Render layer** (shell): Render existing scene normally, then overlay pause menu + keybinds list on top
- **Core sim** (no changes): State remains immutable during pause; resume continues from exact same state

### Implementation Plan
1. **Input**: Trap Escape key in `src/shell/input.ts` or the main event handler; emit a pause toggle signal
2. **Loop state**: Add `paused: boolean` to the shell's main loop/state manager
3. **Render layer**: Create `src/shell/ui/pause-overlay.ts` (or similar) to draw:
   - Semi-transparent dark overlay
   - "PAUSED" title
   - List of current keybinds (format TBD, e.g., "WASD = Move", "SPACE = Fire", "Escape = Resume")
4. **Control indicator**: Add a small persistent HUD element (e.g., top-right corner) showing the active control scheme (e.g., "Keyboard" or "Gamepad")
5. **Tests**: 
   - Pause/resume toggles the flag correctly (input handler test)
   - Core sim does not tick when paused (loop integration test)
   - Overlay renders without crashing (smoke test, no pixel-perfect assertion)

### Key Constraints
- Keep core deterministic and stateless w.r.t. pause
- Do not add pause state to the core sim — it lives in shell only
- Pause overlay is shell-layer rendering concern, independent of core logic
- Control indicator is always visible (not paused-only)
- No mutations to core state during pause or resume

## Sm Assessment

**Verdict:** Setup complete — routing to TEA (Furiosa) for RED.

**Diagnosis (what will survive):**
- Story is a clean pickup: `battlezone`, tdd/phased, 3pts, **no `depends_on`**, backlog → in_progress. Independent of the held siblings.
- **Merge gate: clear.** No open PRs anywhere in battlezone. The approved-but-held bz2-1 and bz2-9 finishes are pushed branches with no PR, so they do not block this new work.
- Branch `feat/bz2-5-pause-overlay-control-indicator` cut off battlezone's `develop`; session + context written and validated.

**Routing note for TEA:** This feature is shell-only. Trap Escape in input, add a `paused` flag in the loop that skips `core.tick()`, and draw the overlay + always-on control indicator in the render layer. **Do not add pause state to `src/core`** — the sim must stay pure and deterministic; pause halts tick advancement, it does not mutate state. Resume must continue from the exact same core state. RED tests should pin: (1) Escape toggles pause, (2) core does not tick while paused, (3) overlay renders without throwing. Keybind copy is TBD — assert structure, not pixels.

**Epic context (do not lose):** bz2 is the playtest-followup epic. bz2-2/bz2-3 are done; bz2-1 and bz2-9 are approved+green with finish HELD pending the epic-close live playtest (**bz2-6**). bz2-5 accumulates onto that batch — it is verified together with the others at bz2-6, not merged in isolation now.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New feature — deterministic pause logic plus two new HUD surfaces, both with clean testable seams (a pure shell module and `render.ts` draw functions driven by a recording mock ctx). Not a chore-bypass case.

**Test Files:**
- `battlezone/tests/shell/pause-gate.test.ts` — the pure pause logic Dev must implement in **`src/shell/pause.ts`**: `INITIAL_PAUSED` (boots into play), `isPauseKey` (only the lowercased Escape key pauses — movement/fire/start keys must not), `togglePaused` (pause ↔ resume), `stepUnlessPaused` (paused frame is reference-identical to its input; active frame delegates to `stepGame`; pause is fully **transparent** to the deterministic core).
- `battlezone/tests/shell/pause-overlay.test.ts` — two new `render.ts` draws: `drawPauseOverlay` (paints keybind text, **names the Escape resume key**, shared vector font + monospace fallback, dims behind a backdrop panel) and `drawControlIndicator` (always-on hint, vector font).

**Tests Written:** 13 tests (7 in pause-gate, 6 in pause-overlay) covering all 6 ACs.
**Status:** RED — confirmed by testing-runner (`bz2-5-tea-red`): `pause-gate` fails to resolve `src/shell/pause`; `pause-overlay`'s 6 tests fail on missing exports; **693/693 pre-existing tests green — zero regressions.**

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core-purity (epic non-negotiable) | pause logic placed in `src/shell/pause.ts` (not core); `stepUnlessPaused` transparency test proves the core never learns it was paused → `core-purity-sweep` stays green, no pause field leaks into `GameState` | RED |
| #2 readonly not mutated | `stepUnlessPaused` frozen-frame `toBe(started)` + `modeAge` unchanged — a mutated/advanced result can't be reference-identical | RED |
| #4 null/undefined (`??` not `||`) | boolean toggle pinned false→true→false; a falsy-coalescing default (`paused \|\| false`) would break the resume direction and fail | RED |
| bz2-2 HUD-font law (prior-story regression) | `Vector Battle` + `monospace` fallback + not-bare-monospace asserted on **both** new draws (miss-one-call-site guard) | RED |
| AC-edge: mis-keyed pause | `isPauseKey` rejects `e`/`d`/`i`/`k`/arrows/space/`f`/`enter`/`1`/`esc`/`''` — the movement key `e` and the non-DOM name `esc` must not freeze the game | RED |
| #8 test quality (self-check) | every `it` has a meaningful, messaged assertion; no `as any` in assertions beyond the sanctioned `as unknown as CanvasRenderingContext2D` ctx cast (mirrors existing hud tests); imports from `src/`, not `dist/` | pass (self-audit) |

**Rules checked:** 6 applicable rules have active test coverage; remaining lang-review checks (#3 enums, #5 modules, #6 React, #7/#11 async/errors, #10 input-validation, #12 perf) are n/a to this synchronous, DOM-free shell logic.
**Self-check:** 0 vacuous tests found (no `let _ =`, no `assert(true)`, no always-None assertions).

**Handoff:** To Dev (The Word Burgers) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/shell/pause.ts` (new) — the pure pause gate: `INITIAL_PAUSED`, `isPauseKey` (Escape only), `togglePaused`, `stepUnlessPaused` (frozen frame returns the SAME reference; active frame is `stepGame`).
- `battlezone/src/shell/render.ts` — `drawPauseOverlay` (translucent backdrop + keybind card via the existing `drawScreenLines` stroker, so the shared vector font is inherited, not re-implemented) and `drawControlIndicator` (bottom-left dual-tread + pause hint).
- `battlezone/src/main.ts` — wired: `let paused`, an `e.repeat`-guarded Escape-edge keydown listener, the sim gated through `stepUnlessPaused`, shell side-effects skipped on frozen frames, `drawControlIndicator` during play, `drawPauseOverlay` on top when paused. Removed the now-unused `stepGame` import.

**Approach:** Minimal — the freeze is the tested `stepUnlessPaused` one-liner; the overlay reuses `drawScreenLines` rather than re-implementing centered vector text (no new abstraction). **`src/core` has zero changes** — the sim never learns it was paused.

**Tests:** 707/707 passing (GREEN) — my 13 (pause-gate 7, pause-overlay 6) + 694 pre-existing. `npm run lint` (`tsc --noEmit`) clean, exit 0.
**Branch:** feat/bz2-5-pause-overlay-control-indicator (pushed, commit `b49e0dc`). No PR (SM opens it at finish).

**Self-review:**
- [x] Wired to the front end (main.ts frame loop + keydown edge)
- [x] Follows project patterns (pure-shell module + recording-testable render fns; edge-latch like `pendingStart`; `drawScreenLines` reuse)
- [x] All 6 ACs met (pause / overlay / resume / always-on indicator / deterministic freeze / no-regression)
- [x] Core purity preserved (no `src/core` edits; `core-purity-sweep` green)

**Handoff:** To the next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 707 green, lint exit 0, 0 smells | N/A (clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 7 (all non-blocking test-hardening/coverage), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (clean) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (19 rules / 31 instances) | N/A (clean) |

**All received:** Yes (4 enabled returned; 5 disabled via settings, self-covered below)
**Total findings:** 7 confirmed (all non-blocking test-hardening/coverage), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The code is correct, minimal, pure, and green. The only specialist with findings (test-analyzer) surfaced **test-robustness and coverage gaps on verified-correct code** — not a single shipped defect. Security and rule-checker came back clean; preflight is green with zero smells. Core purity is untouched (no `src/core` edits). No Critical/High shipped issues → APPROVE, with the hardening items captured as non-blocking Delivery Findings, mirroring the bz2-1 precedent.

**Observations (≥5, tagged):**
1. [VERIFIED] The freeze is correct and pure — `stepUnlessPaused` (`src/shell/pause.ts:47`) returns the input `game` reference when paused, else `stepGame`. Because every `stepGame` return path builds a fresh object (`src/core/sim.ts` — `stepBattle`/`startRun`/`returnToAttract`/gameover-hold all spread or `initGame`), the returned reference identity is a *sound* proof of "no advance, no mutation." Pinned by `pause-gate.test.ts` `toBe(started)`.
2. [VERIFIED] Core purity preserved — the diff touches only `main.ts` + `shell/{pause,render}.ts`; **zero `src/core` changes**. `pause.ts` imports FROM core (shell→core, the allowed direction) and is DOM-free (no `addEventListener`/`window`/`Date.now`/`Math.random`). The one `window.addEventListener` lives in `main.ts` as designed. Complies with the epic's core-purity non-negotiable.
3. [VERIFIED] Side-effect gating is robust — `if (game !== prev)` (`src/main.ts:115`) fires the audio pump + attract-boundary save only on advanced frames. Since `stepGame` never returns its input reference, this reference check *exactly* distinguishes active from frozen frames — preventing the paused-frame one-shot-SFX replay Dev flagged. Verified `main.ts:110-117` against `sim.ts` return paths.
4. [SEC] security subagent: clean — client-only Canvas game; static overlay string literals (no HTML/DOM sink, no XSS/injection); the second `keydown` listener registered once at load (no leak, `e.repeat`-guarded); no type escapes in shipped code; no core-purity violation. Corroborated by my read of `main.ts:96-99`.
5. [RULE] rule-checker: clean — 19 rules / 31 instances, 0 violations. HUD-font law (bz2-2) satisfied on **both** draws (`drawPauseOverlay` via `drawScreenLines`→`hudFont`; `drawControlIndicator` `hudFont` at `render.ts:367`); `INITIAL_PAUSED`/`PAUSE_LINES` SCREAMING_SNAKE with rationale; `PAUSE_LINES` `readonly`; `import type` for interfaces, value import for `stepGame`.
6. [TEST] test-analyzer: 7 findings — **all test-robustness/coverage notes on correct code, none a shipped defect.** Sharpest (high-conf): the backdrop test asserts only `fillRects.length > 0`, not full-viewport coverage — a corner-only dim would pass. But the shipped code is `fillRect(0, 0, w, h)` (`render.ts`, full viewport), so this is **Medium test-hardening, non-blocking**, playtest-guarded (bz2-6). Severity downgrade rationale below. Captured as Delivery Findings.
7. [MEDIUM→LOW] My own edge (self-found): while paused, the `'playing'` branch still computes `inGameAlert(input, prevPose, game)` — a held drive key against the frozen pose could surface a "MOTION BLOCKED" alert, drawn *before* and thus dimmed behind the 0.72-alpha overlay. Cosmetic, mostly hidden, playtest-tunable → LOW, non-blocking. Logged as a Delivery Finding.
8. [EDGE] (disabled — self-covered): boundary audit. `isPauseKey` uses strict `===` (no prefix bug: `e`/`esc`/`''` → false, pinned). `togglePaused` is a clean involution. `e.repeat` guards held-key machine-gun. Degenerate: pausing at the gameover→attract boundary — the transition lives inside `stepGame` (skipped while frozen), so on resume the save fires correctly with the preserved `wasAttract`; no missed save.
9. [SILENT] (disabled — self-covered): no swallowed errors — pure functions, no try/catch, no silent fallback. The `game !== prev` gate is an explicit, commented control-flow choice, not a swallowed error.
10. [TYPE] (disabled — self-covered): types sound — `stepUnlessPaused(game: GameState, input: Input, dt: number, paused: boolean): GameState`; `readonly` `PAUSE_LINES`; no casts in shipped code (the sole double-cast is the test-mock ctx, established sibling-test precedent). Corroborated by rule-checker.
11. [SIMPLE] (disabled — self-covered): minimal — the freeze is a one-line ternary; the overlay reuses `drawScreenLines` instead of re-implementing centered vector text; no new abstraction, no dead code. The one duplication (font-assertion block across the two overlay tests) is TEST code — [TEST] finding, low, non-blocking.
12. [DOC] (disabled — self-covered): comments accurate — `pause.ts` header truthfully states the core-purity boundary; the `main.ts` `game !== prev` comment accurately explains the frozen-frame side-effect skip; the `PAUSE_LINES`/`drawPauseOverlay`/`drawControlIndicator` doc comments match behavior. No stale/misleading text.

### Rule Compliance (typescript.md lang-review + epic rules)
- **#1 type-safety escapes** — none in shipped code; the sole `as unknown as CanvasRenderingContext2D` is the established test-mock convention (hud-font/hud-palette). Compliant.
- **#2 generics/readonly** — `PAUSE_LINES` is `readonly string[]`; `GameState`/`Input` are readonly-field interfaces. Compliant.
- **#3 enums** — n/a (none; `Mode` is a string union, untouched).
- **#4 null/undefined (`??` vs `||`)** — no `||`/`??` added; default params (`color = GLOW_GREEN`) fire on `undefined` only, matching sibling draw-fns. Compliant.
- **#5 module/declaration** — `import type` for `GameState`/`Input`, value import for `stepGame`; `.js` omitted per `moduleResolution: bundler`. Compliant.
- **#6 React/JSX** — n/a (.ts only).
- **#7 async** — n/a (synchronous).
- **#8 test quality** — meaningful, messaged assertions; no `as any` in assertions; imports from `src/`. The robustness gaps are Improvements, not rule violations. Compliant.
- **#9 build/config** — no config touched. Compliant.
- **#10 input validation** — `isPauseKey` strict `===` on a keystroke (a controller input, not an API/JSON boundary). Compliant.
- **#11 error handling** — n/a (pure, no failure modes).
- **#12 perf/bundle** — O(1) pause per frame; frozen frame returns the same ref (no alloc); no barrel imports. Compliant.
- **#13 fix-introduced regressions** — n/a (new feature, initial pass).
- **Core-purity (epic)** — no core edits; `pause.ts` DOM-free shell→core. Compliant. [RULE] corroborated (#14, 0 violations).
- **bz2-2 HUD-font law** — both new draws paint via `hudFont`. Compliant.

**Data flow traced:** physical `keydown` → `e.key.toLowerCase()` → `isPauseKey` (`=== 'escape'`) → `togglePaused` flips the shell-held `paused` boolean → `stepUnlessPaused(game, input, dt, paused)` freezes (same ref) or steps → render reads `paused` to overlay `drawPauseOverlay` on top. Safe: the only input is a trusted keyboard key compared against a literal; no external/untrusted data, no injection sink; the frozen path allocates nothing.

**Pattern observed:** pure-testable-shell-logic (`pause.ts`) + recording-mock-testable render fns + thin DOM wiring in `main.ts` — mirrors the codebase's core/shell split and the bz2-1/bz2-2 idiom. `drawScreenLines` reuse for the keybind card is exactly the Scrounger's reuse-first rule. Good pattern at `src/shell/pause.ts` and `src/shell/render.ts:333`.

**Error handling:** N/A — pure deterministic functions, inputs required by type, no failure path. A frozen frame collapses to a no-op reference return rather than throwing.

### Severity rationale — test-analyzer findings (downgraded to non-blocking)

The test-analyzer's 7 findings are **real** (I confirm them, do not dismiss) but every one is test-robustness/coverage on **verified-correct code**, so I score them Medium/Low, non-blocking:
1. **No current defect.** The shipped `drawPauseOverlay` dims the full viewport (`fillRect(0,0,w,h)`), the overlay lists all keybinds (`PAUSE_LINES`), and `stepUnlessPaused` threads `dt` straight into `stepGame`. All 6 ACs pass; 707/707 green; lint clean.
2. **Loose tests, correct behavior.** The backdrop/keybind/`dt` findings describe tests that *could* pass a hypothetical future regression — not a break today. That is a future-regression risk on correct code, exactly the class the bz2-1 review downgraded High→Medium and approved.
3. **Playtest-guarded.** bz2 closes with a live playtest (bz2-6) that verifies the overlay/indicator visually — a corner-only dim or missing keybinds would be glaringly visible there. The uncovered `main.ts` wiring is the documented, accepted shell-IO convention.
4. Nonetheless real and cheap → captured as non-blocking Delivery Findings for a future hardening pass (cf. bz2-8 hardening bz1-12 tests).

### Devil's Advocate

Assume it's broken. **Held-Escape machine-guns pause:** guarded — `!e.repeat` means one physical press = one toggle (the `pendingStart` discipline). **Case mismatch ('Escape' vs 'escape'):** `main.ts` lowercases via `e.key.toLowerCase()` before `isPauseKey`; verified at the call site. **You pause and can't get out:** the overlay explicitly paints `ESC        RESUME` (`PAUSE_LINES`), and a test pins `/esc/i` in the overlay text — the resume affordance can't silently vanish. **Pause wedges the loop / leaks memory:** the listener is registered once at module load (never in `frame()`); a frozen frame returns the same object reference (zero allocation) and `requestAnimationFrame` is tail-scheduled — rapid toggling is an O(1) boolean flip. **Pause during attract/gameover misbehaves:** `stepUnlessPaused` is mode-agnostic (returns `game` regardless of mode), so the attract demo and the gameover auto-cycle both simply halt and resume cleanly — the documented all-modes deviation, harmless. **A paused frame replays sound:** the `if (game !== prev)` gate skips the audio pump on frozen frames — and because `stepGame` never returns its input reference, that gate can never false-negative on an active frame (side-effects fire exactly as before). **The backdrop only dims a corner:** the *test* would allow it, but the shipped code fills the whole viewport; the visual is a bz2-6 playtest check. **A held drive key during pause:** may compute a "MOTION BLOCKED" alert behind the dim overlay — cosmetic, dimmed to ~28%, logged as a LOW finding. **Malicious input:** none — no network, no DOM sink, static strings, a single literal-compared keystroke. **Confused constant:** `INITIAL_PAUSED = false` (boots into play) and `PAUSE_LINES` both read clearly with rationale. Conclusion: no Critical/High. The deliverable is correct, pure, minimal, and green; the residual is test-hardening on verified-correct code, playtest-guarded at bz2-6.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T16:06:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T15:32:24Z | 2026-07-04T15:34:53Z | 2m 29s |
| red | 2026-07-04T15:34:53Z | 2026-07-04T15:47:57Z | 13m 4s |
| green | 2026-07-04T15:47:57Z | 2026-07-04T15:56:31Z | 8m 34s |
| review | 2026-07-04T15:56:31Z | 2026-07-04T16:06:06Z | 9m 35s |
| finish | 2026-07-04T16:06:06Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): The pure seams are covered, but nothing wires them into the frame loop yet — Dev must bind the Escape keydown edge to `togglePaused`, gate the sim via `stepUnlessPaused`, and call `drawPauseOverlay` (when paused) + `drawControlIndicator` (always, during play). Affects `battlezone/src/main.ts` (add a `paused` local + a keydown edge listener + the two draw calls in `frame()`). This wiring is playtest-verified at bz2-6, not unit-tested (epic shell-IO convention). *Found by TEA during test design.*
- **Question** (non-blocking): AC4's "current control scheme" is ambiguous — the arcade (E/D/I/K) and friendly (arrow) mappings are **both always live** in `input.ts`, so there is no single scheme to name. Affects `battlezone/src/shell/render.ts` + `src/main.ts` (Dev/UX decide the indicator's content: a compact keybind legend vs a fixed label). *Found by TEA during test design.*
- **Question** (non-blocking): Should Escape be inert outside `playing` mode? Pausing the attract demo or the game-over hold is harmless but pointless. Affects `battlezone/src/main.ts` (optionally gate the toggle to `mode === 'playing'`). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): while paused, continuous audio (engine hum / tread rattle) holds its last level rather than actively silencing — `frame()` skips `updateContinuousSounds` on frozen frames. A brief drone may persist during pause. Affects `battlezone/src/main.ts` / `src/shell/audio-dispatch.ts` (optionally ramp continuous channels to silence on pause). *Found by Dev during implementation.*
- **Note** (non-blocking): TEA's wiring Gap is RESOLVED — `main.ts` now binds Escape→`togglePaused`, gates the sim via `stepUnlessPaused`, and draws the overlay + indicator (confirmed by lint + tests). In-game feel (overlay legibility, indicator placement, pause responsiveness) remains a bz2-6 live-playtest check per the epic convention. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the pause-overlay backdrop test asserts only `fillRects.length > 0` — tighten to assert full-viewport coverage (the mock already captures `w`/`h`), so a corner-only-dim regression is caught. The shipped code is correct (`fillRect(0,0,w,h)`); this is test-hardening. Affects `battlezone/tests/shell/pause-overlay.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the overlay-keybinds test checks only for SOME text + `/esc/`; add an assertion that the drive/fire keybind lines also appear, so deleting them would fail (AC2 "keybinds", plural). Affects `battlezone/tests/shell/pause-overlay.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `stepUnlessPaused` active-branch test reuses the implementation's `DT = 1/60`; re-run the assertion with a second distinct `dt` to prove the parameter is genuinely threaded through, not incidentally matched. Affects `battlezone/tests/shell/pause-gate.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): while paused, `main.ts` still computes `inGameAlert` in the `'playing'` branch — a held drive key could surface a "MOTION BLOCKED" alert dimmed behind the overlay. Consider skipping the in-game alert (or the playing-HUD alert) when paused. Cosmetic; a bz2-6 playtest check. Affects `battlezone/src/main.ts`. *Found by Reviewer during code review.*
- **Note** (non-blocking): bz2-6 playtest checklist should explicitly cover held-Escape (no re-toggle), `Escape`/`escape` case handling, and pause-during-attract/gameover — all currently unverifiable by any automated test (accepted shell-IO convention). *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **Shell IO wiring (Escape keydown + per-frame draws) is playtest-verified, not unit-tested**
  - Spec source: .session/bz2-5-session.md, AC-1 / AC-4
  - Spec text: "Escape key pauses the game" / "Control indicator visible on-screen at all times during play"
  - Implementation: the pure toggle/freeze logic (`pause.ts`) and the draw functions (`render.ts`) are unit-tested; the `main.ts` wiring that binds the Escape keydown to `togglePaused` and calls the draws every playing frame is not unit-tested.
  - Rationale: `main.ts` is the DOM/rAF bootstrap; this repo family verifies shell IO by running the game (see `input.ts` header; bz2-1's resize wiring was handled the same way). The epic closes with a live playtest (bz2-6) that exercises exactly this wiring.
  - Severity: minor
  - Forward impact: adds a bz2-6 playtest-checklist item (Escape pauses/resumes in-game; overlay + indicator render correctly).
- **Control-indicator "scheme" copy not pinned — structure + font only**
  - Spec source: .session/bz2-5-session.md, AC-4
  - Spec text: "shows current control scheme (e.g., 'Dual-stick' or 'Keyboard')"
  - Implementation: `drawControlIndicator` tests assert it paints non-empty text in the shared vector font; they do not assert a specific scheme label or copy.
  - Rationale: both keyboard mappings (arcade E/D/I/K and friendly arrows) are always simultaneously active in `input.ts` — there is no single "current scheme" state to select or name, and exact copy was flagged TBD at setup. Pinning example copy would be a brittle, near-vacuous assertion.
  - Severity: minor
  - Forward impact: Dev/UX choose the indicator's content; confirmed at bz2-6.

### Dev (implementation)
- **Pause is allowed in every mode, not gated to `playing`**
  - Spec source: .session/bz2-5-session.md, AC-1; TEA delivery finding (Question)
  - Spec text: "Escape key pauses the game (freezes simulation tick, halts input processing)"
  - Implementation: the Escape toggle fires in any mode; `stepUnlessPaused` freezes whatever mode is current (attract demo, playing, or the game-over hold).
  - Rationale: AC1 places no mode restriction; unconditional is the simplest correct behaviour and pausing the attract demo is harmless. Gating to `playing` would add state no test or AC demands.
  - Severity: minor
  - Forward impact: bz2-6 playtest may choose to restrict pause to `playing` — a one-line guard on the keydown handler.
- **Frozen-frame shell side-effects (audio pump + attract-boundary save) are skipped, keyed on `game !== prev`**
  - Spec source: .session/bz2-5-session.md, AC-5; tests/shell/pause-gate.test.ts (freeze contract)
  - Spec text: "Pause state does not mutate core simulation — only halts tick advancement; resume continues deterministically"
  - Implementation: `frame()` pumps `playEventSounds`/`updateContinuousSounds` and the attract-boundary `saveHighScores` only when the sim advanced; a frozen frame runs none of them.
  - Rationale: a frozen frame holds the prior state, so its stale `events` would replay one-shot SFX every frame while paused — a glitch no test covers but the freeze contract implies. Gating on the reference-equality the freeze already yields is the minimal fix.
  - Severity: minor
  - Forward impact: none (shell audio wiring; verified at bz2-6).

### Reviewer (audit)
- **TEA — Shell IO wiring is playtest-verified, not unit-tested** → ✓ ACCEPTED by Reviewer: consistent with the epic's shell-by-eyeball convention (`input.ts` header; bz2-1 resize wiring); test-analyzer independently corroborated the wiring is uncovered-by-design; bz2-6 closes it.
- **TEA — Control-indicator "scheme" copy not pinned (structure + font only)** → ✓ ACCEPTED by Reviewer: both keyboard mappings are simultaneously active, so there is no single scheme state to name; pinning example copy would be brittle. Dev shipped a reasonable concrete label ("DUAL-TREAD   ESC PAUSE"); playtest-tunable at bz2-6.
- **Dev — Pause is allowed in every mode, not gated to `playing`** → ✓ ACCEPTED by Reviewer: AC1 places no mode restriction; `stepUnlessPaused` is mode-agnostic and the freeze is harmless in attract/gameover; a one-line guard remains available if bz2-6 prefers to restrict it.
- **Dev — Frozen-frame shell side-effects skipped, keyed on `game !== prev`** → ✓ ACCEPTED by Reviewer: sound — `stepGame` never returns its input reference (verified across all `sim.ts` paths), so the gate exactly distinguishes active from frozen frames and prevents the paused-frame SFX-replay glitch; verified `main.ts:110-117`.
- No UNDOCUMENTED spec deviations found — the one cosmetic edge I surfaced (paused "MOTION BLOCKED" alert behind the overlay) is a rendering nicety, not a spec divergence, and is logged as a non-blocking Delivery Finding.