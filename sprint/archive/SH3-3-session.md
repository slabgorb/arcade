---
story_id: "SH3-3"
jira_key: "SH3-3"
epic: "SH3"
workflow: "tdd"
---
# Story SH3-3: missile-command — replace the raw requestAnimationFrame loop (src/main.ts:71/74) with @shared/loop createLoop and route the canvas mount through @shared/host-helpers; the sim already uses @shared/rng, so no determinism-sequence change is expected — pin it anyway

## Story Details
- **ID:** SH3-3
- **Jira Key:** SH3-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-11T17:45:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T17:21:20Z | 2026-08-11T17:24:27Z | 3m 7s |
| red | 2026-08-11T17:24:27Z | 2026-08-11T17:32:25Z | 7m 58s |
| green | 2026-08-11T17:32:25Z | 2026-08-11T17:37:08Z | 4m 43s |
| review | 2026-08-11T17:37:08Z | 2026-08-11T17:45:33Z | 8m 25s |
| finish | 2026-08-11T17:45:33Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Deviation (setup):** Title line numbers are stale (src/main.ts:71/74). Actual loop is main.ts:109-131; canvas mount is main.ts:19-22. Corrected lines used throughout context + setup.

### Dev (implementation)
- **Split the single per-rAF frame body into createLoop's separate step + render thunks (cadence decoupling)**
  - Spec source: context-story-SH3-3.md, AC-1 + Technical Approach
  - Spec text: "drive the frame loop via createLoop … The step callback receives dt and the render callback receives alpha"
  - Implementation: The old `frame()` did `stepGame` + sound voicing + `drawFrame` strictly once per rAF. Adopting `createLoop`, I put the sim advance + sound voicing in the STEP thunk and `drawFrame` in the RENDER thunk. The fixed-timestep accumulator may now call step 0/1/2+ times between renders, so sound voicing is per-sim-step and drawing is per-render-frame instead of a strict 1:1. First rendered frame also paints the initial (un-stepped) state once, as createLoop establishes its time baseline before the first step.
  - Rationale: This is the asteroids precedent (`plugins/asteroids/src/main.ts:99-131`) and the intended effect of the story — it pins the sim to a steady 60Hz regardless of display refresh (the raw rAF ran the sim faster on high-refresh displays). Sound-per-step / draw-per-frame is the more correct coupling.
  - Severity: minor
  - Forward impact: none for determinism — the pure core is untouched and the AC-3 golden confirms the per-step @shared/rng sequence is byte-identical. Behavioural nuance only (60Hz pin + one baseline render frame), verified by the full MC suite staying 1354/1354. The dt/alpha args are unused (MC's stepGame takes no dt; drawFrame doesn't interpolate), so the callbacks are written zero-arg — the "ignore dt" option the context named, not a core signature change.
  - → ✓ **ACCEPTED by Reviewer:** sound. It is the asteroids precedent (`plugins/asteroids/src/main.ts:99-131`) and the story's intended effect; the zero-arg callbacks correctly discard `dt`/`alpha` (assignable to `StepFn`/`RenderFn`), the core is provably untouched (no `core/` hunk in the diff), and the AC-3 golden empirically confirms no sequence drift. The 60Hz-fixed pacing is a fidelity improvement over the old refresh-coupled loop, not a regression.

### Reviewer (audit)
- **No undocumented spec deviations.** The diff faithfully implements AC-1/AC-2 and leaves AC-3/AC-4/AC-6 guards green; only `plugins/missile-command/src/main.ts` (shell) changed — no core/shell-module drift. The single [DOC] observation (the pre-existing file-header line 4, now imprecise about cadence) is captured as a non-blocking finding below, not a spec deviation.

## SM Assessment

**Verdict:** Setup complete, premise verified against the current tree, routing to TEA for RED.

**Premise verification (done BEFORE sm-setup, per doctrine — the epic YAML carried no ACs/description, so the title is the only spec and it had drifted):**
- ✅ Raw RAF loop confirmed — `frame()` closure at `main.ts:109-131`; `requestAnimationFrame` at 128 & 131. Title's "71/74" is stale (line 71 is a crosshair comment). Correction recorded above and threaded through the context.
- ✅ Both shared targets exist: `createLoop` (`src/shared/loop.ts:55`), `mountCanvas` (`src/shared/host-helpers.ts:51`). Precedent to copy: asteroids (`plugins/asteroids/src/main.ts:13,33,99,132`), plus 7 other host-helper adopters incl. pac-man (SH3-4 sibling).
- ✅ MC core already imports `@shared/rng` (game.ts/spawn.ts/mirv.ts/sputnik.ts) — the "pin it anyway" clause is the instruction for a sim-sequence regression guard.
- ✅ No shell-adoption-matrix conflict: missile-command is a post-collapse plugin, absent from `docs/ops/shell-adoption-matrix.md`/`tests/shell-convergence.test.mjs` (the 7-game set). Unlike SH3-2/joust, no rom-cadence deferral to overturn, no cell flip owed.

**Key risk handed to TEA/Dev (documented in context):** MC's sim is FRAME-COUNTED — `stepGame(game)` takes no `dt`, one step per video frame — whereas `createLoop` is a FIXED-TIMESTEP accumulator calling `step(dt)` a variable number of times/frame at 60Hz. Adoption changes the cadence model, not just the call site. Asteroids resolved this exact shape; read its adoption before writing RED.

**Scope fence:** createLoop + mountCanvas ONLY. `installAudioUnlock` is explicitly OUT of scope — leave MC's audio-unlock (main.ts:48-51) untouched (input-path-fusion hazard the SH3 epic warns of).

**No user ruling needed:** no either/or AC, no refuted premise, no matrix ruling. Clean 3pt TDD story.

**Board hygiene:** sibling probes clean at setup (no SH3-3 branch/session anywhere); claim branch `feat/SH3-3-mc-shared-loop-host-helpers` pushed empty off `origin/develop` (4fb57d11) to light the sibling probe; status stamped `in_progress`; claim commit `d9010245` (epic stamp + context) pushed.

## TEA Assessment

**Verdict:** RED established and verified. One test file added, committed `f6a620d7`. Handing to Dev.

**Test file:** `plugins/missile-command/tests/sh3-3-loop-host-adoption.test.ts` (16 tests). Built on the pac-man SH3-4 `main-host-adoption.test.ts` precedent — the `?raw` source-scan idiom with a `stripComments()` guard (arcade source scanners read comments; a token surviving only in a doc comment must not satisfy a positive scan nor trip a negative one).

**RED proof (`npx vitest run --project missile-command`): 8 failed / 1346 passed** — exactly the two adoption groups fail, for the right reason (assertion miss, not a crash: the failure dump shows the raw `requestAnimationFrame(frame)` still present). Orchestrator suite `npm run test:orchestrator`: 463/463 (adding an MC test file trips no cabinet-wide count/topology guard — MC is not in joust's file-count guard).

**AC → test mapping:**
| AC | Group | State on arrival | Proves |
|----|-------|------------------|--------|
| AC-1 createLoop adoption | 4 tests | **RED** | imports `createLoop` from `@shared/loop`, calls it, calls `.start()`, and NO bare `requestAnimationFrame` remains in main.ts |
| AC-2 mountCanvas adoption | 4 tests | **RED** | imports `mountCanvas` from `@shared/host-helpers`, calls it, and NO `querySelector('#game')` / `getContext('2d')` remains |
| AC-3 determinism pin | 3 tests | GREEN guard | a captured golden of the `@shared/rng` sim sequence (seed 7, 15 samples/600 frames) + reproducibility + non-vacuity; reddens if GREEN drifts the core |
| AC-4 scope fence | 2 tests | GREEN guard | `audio.resume()` preserved; `installAudioUnlock` NOT adopted |
| AC-6 seams | 3 tests | GREEN guard | `createGame` / `stepGame` / `drawFrame` survive |
| AC-5 full suite green | — | (Dev/verify) | the RED tests flip green + whole project stays green |

**Rule Coverage:** `.pennyfarthing/gates/lang-review/typescript.md` checks are largely N/A here — this is a wiring-adoption refactor, not new types/constructors/enums, so the classic rules (validated constructors return errors, non-exhaustive enums, deserialize bypass) have no surface. The rules that DO apply are covered: (a) **meaningful assertions / no vacuity** — the determinism pin carries an explicit non-vacuity test asserting the rng seed actually advances and ICBMs actually spawn, refuting an all-constant golden; (b) **no ambient entropy** — the reproducibility test asserts two same-seed runs are byte-identical; (c) **scope fence** — a negative scan forbids `installAudioUnlock` so GREEN can't over-adopt. No `let _ =`, no `assert(true)`, no always-None assertions in the file.

**Guidance to Dev (Yoda):**
- The blueprint is `plugins/asteroids/src/main.ts:33,99-132` — `const { canvas, ctx } = mountCanvas(document)` and `const loop = createLoop((dt)=>{…}, ()=>{…}); loop.start()`. Read it in full.
- **The cadence-model decision (the story's real risk):** MC's `stepGame(game)` takes no `dt`. Inside createLoop's step callback, call `stepGame` and IGNORE the `dt` arg (asteroids passes dt into its `stepGame`, but MC's doesn't accept one — do NOT add a `dt` param to the core; AC-6 + the determinism golden forbid touching the core). The render callback ignores `alpha` (MC's drawFrame doesn't interpolate).
- **Move, don't duplicate:** the between-frames `drain()` + the keydown/pointer wiring stay; only the `frame()` closure body moves into the createLoop step/render callbacks and the two `requestAnimationFrame` calls disappear.
- **Do NOT touch** `installAudioUnlock` (leave main.ts:48-51's resume() wiring exactly as-is), game.ts, or any core/shell module. Only `plugins/missile-command/src/main.ts` should change.
- Verify with `npx vitest run --project missile-command` (all 16 flip/stay green) + `npm run lint`.

**Delivery Findings:** No upstream findings — clean 3pt refactor, premise verified by SM against the current tree.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/main.ts` — adopt `@shared/loop.createLoop` for the frame loop (retiring the raw `requestAnimationFrame` at old :128/:131) and `@shared/host-helpers.mountCanvas` for the canvas+ctx (retiring `querySelector('#game')`+`getContext('2d')` at old :19-22). +39 / -30, one file. Stale narrowing comment corrected (no more null-check to reference).

**Tests:** 16/16 SH3-3 green; `npx vitest run --project missile-command` 1354/1354; `npm run lint` (tsc --noEmit) clean; `npm run test:orchestrator` 463/463.
**Branch:** feat/SH3-3-mc-shared-loop-host-helpers (pushed — commit `d954c431`)

**How each RED flipped:**
- AC-1: `import { createLoop } from '@shared/loop'`; `const loop = createLoop(step, render)`; `loop.start()`; both bare `requestAnimationFrame` calls deleted (createLoop owns the rAF pump).
- AC-2: `import { mountCanvas } from '@shared/host-helpers'`; `const { canvas, ctx: context } = mountCanvas(document)`; hand-rolled `querySelector('#game')` + `getContext('2d')` + the two null-throws all gone.

**Guards held green (proof of no scope creep / no drift):**
- AC-3 determinism golden unchanged → the @shared/rng sim sequence is byte-identical; the cadence change did not touch the core.
- AC-4 `audio.resume()` wiring left exactly as-is; `installAudioUnlock` NOT adopted (out of scope).
- AC-6 `createGame`/`stepGame`/`drawFrame` seams all still driven (now from inside the loop thunks).

**Scope discipline:** only `plugins/missile-command/src/main.ts` changed — no core, no shell module, no other game, no matrix, no orchestrator file.

**Render note:** the visible-render half (the cabinet actually paints under the new loop) is the human screenshot in review, per the test file's own header — the mechanical half (source wiring + determinism) is fully green here.

**Handoff:** To review phase (Reviewer / Obi-Wan Kenobi).

## Delivery Findings (Dev)
- No upstream findings during implementation. Clean 3pt refactor; premise verified by SM, RED authored by TEA, both accurate against the tree.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates green (vitest 1354/1354, lint clean, orchestrator 463/463), no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths self-assessed below ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — error paths self-assessed below ([SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality self-assessed below ([TEST]) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (downgraded to LOW, non-blocking), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design self-assessed below ([TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — security-inert refactor (no new input/DOM-sink/eval/URL surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — simplicity self-assessed below ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 26 TS checklist rules + 4 CLAUDE.md rules, 0 violations, empirically verified |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** player input (pointermove → `placeCursor`; keydown → `keydownReducer`; pointerdown → `beginSetupOnInput`/`unlock`) mutates the module-level `game: GameState`; the `createLoop` STEP thunk advances it via the pure `stepGame` and voices sound; the RENDER thunk paints `game` through `drawFrame`. Safe: every input handler is byte-unchanged by this diff (main.ts:52-110), and the loop drives the same pure core it always did — the only structural change is *who* calls `requestAnimationFrame` (now `@shared/loop`, not `main.ts`).

**Observations (12 — VERIFIEDs cite evidence + rule-compat; findings tagged by source):**
1. `[VERIFIED]` createLoop adoption correct — `main.ts:118` builds the loop, `:140` starts it; no bare `requestAnimationFrame` remains in `main.ts` (grep: 0 code hits; the pump lives in `src/shared/loop.ts:76`). Complies with CLAUDE.md core/shell boundary: the only clock/rAF read stays in shared-lib + shell entry, never in core.
2. `[VERIFIED]` mountCanvas adoption correct — `main.ts:25` `const { canvas, ctx: context } = mountCanvas(document)`; the hand-rolled `querySelector('#game')` + `getContext('2d')` + two null-throws are gone. `mountCanvas` (`src/shared/host-helpers.ts:51-64`) throws with clearer messages and returns a non-null `{canvas, ctx}`, so no `!` assertion is needed (complies with TS rule 1/4).
3. `[VERIFIED]` `[SEC]` Security-inert (security subagent: clean) — no `eval`/`Function`/`innerHTML`/dynamic-import/URL-param handling introduced; the sole object spread `{...game, soundEvents:[]}` (main.ts:129) is over the game's own trusted `GameState`, not untrusted input.
4. `[VERIFIED]` `[RULE]` Rule compliance (rule-checker: 0 violations across 26 TS-checklist rules + 4 CLAUDE.md rules, empirically verified by running tests/lint/purity and executing the test's `stripComments` against live source). No `Date.now`/`Math.random` (determinism preserved); `@shared/*` alias import form correct and matches fleet convention (no `.js` on the alias, `.js` kept on relative core imports).
5. `[VERIFIED]` Determinism guard is real and non-vacuous — AC-3 imports `createPlayGame`/`stepGame` directly from core and asserts 15 concrete digest samples via `toEqual(GOLDEN_SEQ)`, plus an explicit non-vacuity check (seed advances `1767624623→3535249239`, ICBM count grows 4→8) and a reproducibility check. The diff touches no `core/` file, so the golden is a valid before/after drift guard; ran it 3× — stable, not flaky.
6. `[VERIFIED]` Audio-unlock scope fence held — `main.ts:52-54` `const unlock = () => audio.resume()` wired to pointerdown+keydown is byte-unchanged; `installAudioUnlock` absent (grep: 0 hits). The input-path-fusion hazard the SH3 epic warns of is avoided — this story stayed to mountCanvas+createLoop only.
7. `[VERIFIED]` `[TEST]` Test quality (test_analyzer disabled — self-assessed) — source-scans run against comment-stripped code (`stripComments`), so a token surviving only in a comment can't satisfy a positive scan nor trip a negative one (the mount comment literally contains `querySelector('#game')`/`getContext('2d')` and is correctly excluded). No vacuous assertions, no `let _ =`, no `assert(true)`. Golden floats rounded to 2 decimals for cross-platform stability.
8. `[DOC]` `[LOW]` (comment-analyzer, downgraded from medium) File-header `main.ts:4` "steps the deterministic game once per video frame" is now imprecise — after the fixed-timestep accumulator, `stepGame` runs a variable number of times per rendered frame on non-60Hz displays. **Non-blocking:** pre-existing line untouched by the diff, a fair plain-language summary at MC's 60Hz design target, and the precise mechanism is accurately documented in the adjacent new block (`main.ts:112-117`). Captured as a Delivery Finding (Improvement) with the suggested reword.
9. `[VERIFIED]` `[EDGE]` Boundary (edge_hunter disabled — self-assessed) — the first rendered frame paints the initial un-stepped attract state once (createLoop establishes its time baseline before the first step); harmless, attract is a valid renderable state and `drawFrame` handles it. Backgrounded-tab spiral-of-death is bounded by createLoop's `maxFrame=0.25` clamp — strictly better than the old raw rAF.
10. `[VERIFIED]` `[SILENT]` Silent-failure (disabled — self-assessed) — no swallowed errors or empty catches introduced; `mountCanvas` throws loudly on a missing/wrong `#game` (the old code threw too). No silent fallback added.
11. `[VERIFIED]` `[TYPE]` Type-design (disabled — self-assessed) — `ctx: context` is a non-null `CanvasRenderingContext2D` from `CanvasMount`; no `as any`/double-casts; the zero-arg step/render callbacks are legally assignable to `StepFn`/`RenderFn` (fewer params OK). `npm run lint` clean.
12. `[SIMPLE]` Simplifier (disabled — self-assessed) — the step/render thunk split is the minimal asteroids-idiomatic form; no over-engineering, no dead code (preflight: no smells, no orphaned `frame` symbol, `drain` still wired at :109).

### Rule Compliance (TypeScript lang-review checklist + CLAUDE.md)
The rule-checker performed the exhaustive pass: **26 checklist rules, 41 instances, 0 violations; 4 CLAUDE.md rules, 0 violations.** Key applicable rules confirmed by me independently: **#1 type escapes** — none (grep clean); **#5 module imports** — `@shared/loop`/`@shared/host-helpers` correct alias form; **#15/#25 source-text-assertion-vs-token** — all positive anchors land on live code, negatives verified against comment-stripped source; **#17 comments assert re-run mechanism** — the new cadence/mount comments verified true against `loop.ts`/`host-helpers.ts`; **#18/#20/#26 test apparatus non-vacuity** — golden measures an unchanged artifact (`core/game.ts`, not in diff) and carries genuine non-vacuity checks. **CLAUDE.md core/shell boundary** — no `core/` or `shell/` file in the diff; the clock/rAF read stays shell+shared. **Determinism** — no ambient entropy; AC-3 golden green.

### Devil's Advocate
Argue this is broken. First: the cadence change is a *behavioral* change, not a no-op. On a 144Hz display the old raw-rAF loop stepped the sim 144×/s (≈2.4× too fast); createLoop now pins it to 60Hz. A player accustomed to the too-fast game will perceive the fix as the game "slowing down" — could a user file that as a regression? Subjectively yes, but objectively the refresh-coupled speed was the *defect*, and 60Hz matches MC's frame-counted design and the original cabinet — so this is a fidelity gain, not a break. Second: fixed-timestep catch-up. After a frame hitch the accumulator can run several steps in one render frame (bounded to ≤15 by `maxFrame=0.25`), and because sound is voiced *per step*, a burst of steps voices a burst of sounds — a momentary audio pile-up (e.g. stacked detonations) is possible after a stall. The old loop instead *dropped* those sim steps (ran slow), which is arguably worse for fidelity; the pile-up is bounded and self-clearing, but it is the one thing worth a human ear-check in review. Third: the first rendered frame shows the un-stepped attract state — if `createGame()`'s initial state had any unrenderable precondition this would crash on boot; verified it does not (attract is a normal drawable state, and the full suite boots it). Fourth: golden brittleness — hardcoded float sums could differ across machines if the sim used platform-sensitive trig; it doesn't (integer-seeded rng + linear descent, 2-decimal rounding), and three runs were byte-identical. Fifth: closure capture — both thunks close over the same `let game`; JS is single-threaded so there is no interleaving race. Sixth: `mountCanvas(document)` throws at import if `#game` is missing — identical to the old behavior, no new failure mode. Conclusion: no defect survives scrutiny; the only real-world nuance (post-hitch audio catch-up) is bounded and belongs to the fidelity-improving loop model the story deliberately adopted — flagged for the human render/audio check, not a code defect.

**Challenge of VERIFIEDs vs subagent findings:** the only finding (line-4 [DOC]) is orthogonal to every VERIFIED above — no subagent contradicts any VERIFIED conclusion. Security and rule-checker both returned clean, corroborating VERIFIEDs 3 and 4.

**Handoff:** To SM for finish-story.

## Delivery Findings

<!-- Reviewer appends below -->

### Reviewer (code review)
- **Improvement** (non-blocking): the `main.ts` file-header comment (line 4) still says the shell "steps the deterministic game once per video frame", which the createLoop accumulator makes imprecise on non-60Hz displays. Affects `plugins/missile-command/src/main.ts:4` (reword to e.g. "steps the deterministic game at a fixed 60Hz via @shared/loop's accumulator, decoupled from display refresh"). Not blocking — a pre-existing header line, accurate as a plain-language summary at the 60Hz design target, with the precise mechanism already documented at main.ts:112-117. *Found by Reviewer during code review.*