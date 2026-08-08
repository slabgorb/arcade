---
story_id: "SH3-4"
jira_key: "SH3-4"
epic: "SH3"
workflow: "tdd"
---
# Story SH3-4: pac-man — adopt @shared/host-helpers + @shared/view for DPR/resize

## Story Details
- **ID:** SH3-4
- **Jira Key:** SH3-4
- **Workflow:** tdd
- **Stack Parent:** none

## Story Context

> ⚠ **CORRECTION (verified 2026-08-08):** The story title is materially stale in three ways, corrected below.

### Background

The pac-man plugin re-implements canvas-mount and DPR-aware resize handling that already exists in the shared library. This story retires that duplication by adopting `@shared/host-helpers` and `@shared/view`.

**File location correction:** The DPR/resize/mount lifecycle is NOT in `plugins/pac-man/src/shell/layout.ts` (which is a pure 40-line integer-scale calculator `fitIntegerScale` with no DOM, DPR, resize or canvas-mount code). The real work file is `plugins/pac-man/src/main.ts`:
- `main.ts:43-45` — manual `document.querySelector<HTMLCanvasElement>('#game')` + `getContext('2d')` boilerplate
- `main.ts:56-61` — hand-rolled `resize()` that sets `canvas.width = canvas.clientWidth` / `canvas.height = canvas.clientHeight` with NO devicePixelRatio handling (effectively always 1×), plus `window.addEventListener('resize', resize)`

**@shared/pause adoption is VOID (do NOT adopt):** The story's conditional ("fold player-pause onto @shared/pause ONLY IF core/mode.ts `paused` is player-pause and not ghost scatter/chase mode-state") self-resolves to FALSE. The string "paused" appears in `core/mode.ts` ONLY in comment prose describing ghost mode-state bookkeeping (scatter/chase clock frozen during frightened mode) — there is no player-pause field. This agrees with the epic SH3's own OUT OF SCOPE clause, which explicitly names pac-man `@shared/pause` adoption as out of scope.

**Letterbox handling:** Keep pac-man's own `fitIntegerScale` — do NOT swap it for `@shared/view.letterbox`. The `@shared/view.letterbox` function is aspect-ratio / fractional-scale based; pac-man is a RASTER cabinet requiring WHOLE-NUMBER integer scale + crisp pixels (AC-2, ported from centipede). The only `@shared/view` piece to adopt is `resizeToDisplay` (the DPR/resize sizing).

### Acceptance Criteria

**AC-1: adoptCanvas mount via @shared/host-helpers**
- Retire manual `document.querySelector<HTMLCanvasElement>('#game')` + `getContext('2d')` boilerplate at `main.ts:43-45`
- Replace with `@shared/host-helpers` `mountCanvas(root, '#game')` API, which does the querySelector, context acquisition, and null-throw
- Verify canvas is mounted and 2D context acquired correctly

**AC-2: adopt DPR-aware resize via @shared/view.resizeToDisplay**
- Retire hand-rolled `resize()` at `main.ts:56-61`
- Replace with `@shared/view` `resizeToDisplay(canvas, cssW, cssH, rawDpr)` for the DPR-aware resize lifecycle
- Gain the MAX_DPR=2 cap + falsy-guard (pac-man currently lacks DPR awareness — always 1×, but now gains up-to-2× backing store)
- Verify crisp integer pixels are preserved (integer-scale letterbox unchanged)
- Verify letterbox centering is unchanged

**AC-3: keep fitIntegerScale for letterbox**
- Do NOT swap `fitIntegerScale` for `@shared/view.letterbox`
- `fitIntegerScale` remains in `main.ts:213` calling site
- Integer scale letterbox logic is raster-cabinet specific; shared letterbox is aspect-ratio based and incompatible

**AC-4: no determinism regression**
- DPR change (1× → up-to-2× backing store) is intended but must not regress crisp integer scaling or letterbox centering
- This is a raster cabinet; no rng/loop determinism seed is touched
- Pin observable: compare a demo/replay render before and after; pixel-level centering and crisping must match or improve

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-08T23:46:20Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T23:07:47Z | 2026-08-08T23:11:43Z | 3m 56s |
| red | 2026-08-08T23:11:43Z | 2026-08-08T23:20:19Z | 8m 36s |
| green | 2026-08-08T23:20:19Z | 2026-08-08T23:28:28Z | 8m 9s |
| review | 2026-08-08T23:28:28Z | 2026-08-08T23:46:20Z | 17m 52s |
| finish | 2026-08-08T23:46:20Z | - | - |

## Delivery Findings

No upstream findings at setup.

### Dev (implementation)
- **Gap** (non-blocking): The orchestrator suite (`npm run test:orchestrator`) is RED on `develop` for a reason unrelated to SH3-4 — `tests/jt9-55-joust-yaml-refs.test.mjs` reads `sprint/epic-jt9.yaml`, but that epic was archived to `sprint/archive/epic-jt9.yaml`, so 3 tests fail with ENOENT ("PREMISE: in-scope joust sprint files exist", "PREMISE: the ref pattern finds …", "every '.ts:<line>' ref in sprint/epic-jt9.yaml resolves").
  Affects `tests/jt9-55-joust-yaml-refs.test.mjs` (point it at the archived path, or retire it with the jt9 epic). SH3-4's own scope (pac-man vitest) is fully green — this predates my branch and is out of scope; **filing so it is tracked, not fixing it here** (would be scope creep). Suggest a small chore story under the jt10/joust epic.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): SH3-4's source-wiring assertions could be tightened against contrived mutants — CONFIRMED by reviewer-test-analyzer + reviewer-rule-checker (rules #15/#25), but DOWNGRADED to non-blocking after I verified the composite gate already holds (see Reviewer Assessment). Recommended hardening: call-anchor the AC-3/AC-4 positives (`fitIntegerScale(` / `pumpFrame(`), assert the mount destructure (`const { canvas, ctx } = mountCanvas(`) and the full `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` signature, and broaden the retirement guards beyond the single `querySelector('#game')` / `clientWidth` spellings; also fix the stale "Today main.ts:43" comment (past-tense, drop line number) and soften the tp1-39 citation.
  Affects `plugins/pac-man/tests/shell/main-host-adoption.test.ts` (test assertions + comments only — the implementation is correct and needs no change).
  **Owner: SM — file as SH3-6 test-hardening chore at finish** (or fold into the next SH3 test pass). Not blocking this story's approval.
  *Found by Reviewer during code review.*
- **Concur** with the Dev jt9 finding above (pre-existing orchestrator RED, unrelated to SH3-4) — verified by reviewer-preflight (only the 3 jt9 tests fail; zero pac-man/SH3 impact).

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-2/AC-4 pixel-fidelity is pinned by source-wiring + human screenshot, not an automated pixel diff**
  - Spec source: context-story-SH3-4.md, AC-2 and AC-4
  - Spec text: "compare a demo/replay render before and after; pixel-level centering and crisping must match or improve"
  - Implementation: RED tests are `?raw` source-wiring pins on `main.ts` (tp1-39/cp1-6 idiom) — they prove the SEAMS are adopted (mountCanvas, resizeToDisplay+devicePixelRatio) and the crisp-pixel wiring is retained (`fitIntegerScale`, `imageSmoothingEnabled=false`, no `@shared/view.letterbox`). No automated before/after pixel diff is written.
  - Rationale: `main.ts` is a side-effectful boot module (querySelector/rAF/canvas absent in node vitest), so a live pixel diff is not mechanically reachable in-suite; the pixel-level compare is the human screenshot half owned by Dev/review, exactly as centipede cp1-6 split its AC-4.
  - Severity: minor
  - Forward impact: none — SH3-4 is self-contained; SH3-5 (topology guard) is source-scan based and unaffected.
  - Reviewer audit: ACCEPTED — main.ts is genuinely un-testable behaviourally in node vitest (querySelector/rAF at import; confirmed by reviewer-test-analyzer against vitest.config.ts `environment: node`); the `?raw` idiom is the correct, precedented tool and the pixel-diff is legitimately the human-screenshot half.

### Dev (implementation)
- **resizeToDisplay is fed `window.innerWidth/innerHeight`, not the old `canvas.clientWidth/clientHeight`**
  - Spec source: context-story-SH3-4.md, AC-2 (Correction 1)
  - Spec text: "hand-rolled `resize()` setting `canvas.width = canvas.clientWidth` / `canvas.height = canvas.clientHeight` … → replaced by `@shared/view` `resizeToDisplay(canvas, cssW, cssH, rawDpr)`"
  - Implementation: `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` — the CSS box is the window, mirroring the asteroids/star-wars/tempest callers, rather than reading back `canvas.clientWidth`.
  - Rationale: `resizeToDisplay` also writes `canvas.style.width/height` in px; feeding `clientWidth` would pin an inline px style over the `width:100%` CSS rule and freeze the canvas at first-layout size on later viewport resizes. `innerWidth` reflects the viewport every resize and equals the canvas box (body is full-viewport, `#game` is 100%×100%). The TEA RED test independently bans the `clientWidth` form.
  - Severity: minor
  - Forward impact: none — observable output is identical to the intended DPR-aware sizing; no sibling story depends on the input source.
  - Reviewer audit: ACCEPTED — verified correct and superior to the literal spec: reviewer-comment-analyzer confirmed `innerWidth` matches the byte-identical asteroids/star-wars/tempest idiom and that `#game` is 100%×100% of a full-viewport body; the `clientWidth` alternative would indeed pin-freeze. No functional divergence.

## Sm Assessment

Setup by Baldur (SM), 2026-08-08. The phase pointer read `setup` on arrival; workflow `tdd` (phased), next agent tea (red).

**Pre-setup checks (all clean):**
- Sibling probes: `git branch -r | grep -i sh3-4` empty before push; `.session/` sweep showed a-2 on mc5-2, a-3 on sw10-1 — neither touches SH3/pac-man. Merge gate passed (board gave NEW_WORK_STATE).
- Premise measured against the tree BEFORE sm-setup. Story is title-only (no description/ACs), so the title is the derived spec — and it was materially stale in three ways, all recorded as a `⚠ CORRECTION` block in `sprint/context/context-story-SH3-4.md`:
  1. Work file is `plugins/pac-man/src/main.ts` (mount at :43-45, hand-rolled resize at :56-61), NOT `layout.ts` (a pure `fitIntegerScale` calc).
  2. The `@shared/pause` fold is VOID — `mode.ts` `paused` is comment-prose ghost mode-state, not player-pause; agrees with epic SH3's OUT OF SCOPE clause naming pac-man @shared/pause out of scope. No pause AC derived.
  3. `@shared/view.letterbox` is a false match (fractional/aspect, MAX_DPR=2) for a raster cabinet's integer crisp-pixel scale — keep `fitIntegerScale`; adopt `@shared/view.resizeToDisplay` only.

**Corrected deliverable (in main.ts):** adopt `@shared/host-helpers.mountCanvas` (replace :43-45) + `@shared/view.resizeToDisplay` (replace :56-61, gaining the MAX_DPR=2 cap pac-man lacks); keep `fitIntegerScale`; no `@shared/pause`. Determinism note for TEA: the 1×→up-to-2× DPR change is intended but must be pinned so crisp integer scaling and letterbox centering do not regress; no rng/loop seed is touched.

**No user ruling required.** The title's own "verify first — reuse-first, do not force a false match" language pre-authorizes exactly this narrowing; RED is specifiable against the corrected scope. SH3-4 is the first SH3 story (all siblings backlog; no prior session to reuse).

**Claim pushed:** branch `feat/SH3-4-pac-man-shared-mount-view-dpr-resize` + commit `fee0569d` (epic stamp `in_progress` + context) on origin. `**Repos:**` field was missing from the sm-setup session file and was hand-added.
## TEA Assessment

RED phase by Tyr One-Handed (TEA), 2026-08-08.

**Tests Required:** Yes
**Reason:** Adoption story with observable wiring contracts; source-wiring pins are the reviewer-blessed idiom for a boot module.

**Test Files:**
- `plugins/pac-man/tests/shell/main-host-adoption.test.ts` — `?raw` source-wiring pins on `src/main.ts` (comments stripped via the cp2-1 R3 helper), covering the SM-corrected scope.

**Tests Written:** 13 assertions across 4 AC groups (7 RED, 6 GREEN-guard).
**Status:** RED (failing — ready for Dev)

- RED now (unbuilt — Dev's GREEN target): AC-1 mount via `@shared/host-helpers.mountCanvas` (import + call + retire `querySelector('#game')`); AC-2 DPR resize via `@shared/view.resizeToDisplay` (import + call + `devicePixelRatio` + retire `canvas.width = canvas.clientWidth`).
- GREEN guards (must STAY green through GREEN): AC-3 keep `fitIntegerScale` + `imageSmoothingEnabled=false` and NO `@shared/view.letterbox` (the false-match ruling); AC-4 determinism seam untouched (`pumpFrame`, `createGameState`, `?seed=`).

**RED verified of record** (testing-runner, RUN_ID SH3-4-tea-red): pac-man project 7 failed | 270 passed (22 files: 1 failed, 21 passed). Every failure is inside `main-host-adoption.test.ts` — no collateral. `npm run lint` (tsc --noEmit) clean.

**Why source-wiring, not behavioural:** `main.ts` runs `document.querySelector('#game')` at import, throws without a real canvas, and starts a `requestAnimationFrame` loop — none of it exists in the node vitest env. The behavioural contracts of `mountCanvas`/`resizeToDisplay` are already tested in `src/shared/tests`; this story's job is to pin that pac-man ADOPTS them. The negative assertions (old boilerplate removed) are what make a half-adoption — importing the shared fn while leaving the hand-roll — fail.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #8 test quality (import from `src`, meaningful assertions, no `as any`) | whole file — imports `../../src/main.ts?raw`, every `it` has a token-specific `toMatch`/`not.toMatch` with a message | passing (self-check) |
| Reuse-first / false-match guard (epic SH3 verb-not-numbers) | AC-3 "does NOT adopt @shared/view.letterbox" | passing (guard) |
| Determinism preservation (epic SH3: primitive swaps must not drift the observable) | AC-4 pumpFrame/createGameState/?seed | passing (guard) |

**Rules checked:** 1 of 1 directly-applicable lang-review rule (TS #8) has coverage; the remaining TS checklist rules target runtime/impl code and do not apply to a source-wiring test file. Determinism + false-match are epic-level rules, both guarded.
**Self-check:** 0 vacuous tests. Every assertion targets a specific token with a failure message; no `let _ =`, no `assert(true)`, no always-true predicate. Negative assertions verified to currently match (they fail RED because the old code is present), so they are not vacuously green.

**Handoff:** To Dev (Loki Silvertongue) for GREEN — adopt `mountCanvas` + `resizeToDisplay` in `main.ts`, keep `fitIntegerScale`, no `@shared/pause`, no `@shared/view.letterbox`.
## Dev Assessment

GREEN phase by Loki Silvertongue (Dev), 2026-08-08.

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/main.ts` — adopt `@shared/host-helpers.mountCanvas` (replaces the `querySelector('#game')` + `getContext('2d')` + null-throws) and `@shared/view.resizeToDisplay` (replaces the always-1× `canvas.width = clientWidth` resize, gaining the `MAX_DPR=2` cap + falsy-guard). `fitIntegerScale` retained; no `@shared/view.letterbox`; no `@shared/pause`. Net +13/-6 lines.

**How each AC is met:**
- AC-1 — `const { canvas, ctx } = mountCanvas(document)`; the hand-rolled `#game` lookup is gone.
- AC-2 — `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)`; DPR is now real (was absent). Crisp pixels preserved: the render loop still calls `fitIntegerScale(canvas.width, …)` (now device-pixel backing store) + `imageSmoothingEnabled = false`, so the integer letterbox is unchanged, just at up-to-2× resolution. See Dev deviation re: `innerWidth` vs `clientWidth` (avoids an inline-px-pin resize freeze; the fleet idiom).
- AC-3 — `fitIntegerScale` untouched; `@shared/view.letterbox` never imported (the false-match guard stays green).
- AC-4 — no rng/loop/seed change; `pumpFrame`/`createGameState`/`?seed=` all intact. Raster cabinet, no determinism seam touched.

**Tests:** pac-man vitest 277/277 passing (GREEN; the 7 formerly-RED AC-1/AC-2 assertions now pass, 6 guards stayed green). `npm run lint` (tsc --noEmit) clean.
**Note:** `npm run test:orchestrator` has a PRE-EXISTING, out-of-scope RED (jt9 epic archived, `tests/jt9-55` reads the old path) — see Delivery Findings. Not caused by this branch.

**Pattern fidelity:** mirrors the existing `resizeToDisplay` callers (asteroids `main.ts:44`, star-wars, tempest) and `mountCanvas` (asteroids `main.ts:33`) — no new abstraction introduced.

**Branch:** feat/SH3-4-pac-man-shared-mount-view-dpr-resize
**PR:** 141

**Handoff:** To TEA for the verify phase (simplify + quality-pass), then Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (277/277 pac-man, tsc clean, 0 smells; jt9 orchestrator RED confirmed pre-existing) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered in Devil's Advocate |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered in Devil's Advocate |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, all NON-BLOCKING (downgraded — see below); 0 dismissed |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, non-blocking (1 fix-recommended stale comment, 1 low citation) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered in Devil's Advocate + Rule Compliance |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no input/injection surface (Devil's Advocate) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — change is net simplification (Devil's Advocate) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, DOWNGRADED to low (tsc `noUnusedLocals` backstop — verified) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 7 confirmed, 0 dismissed, all NON-BLOCKING (2 downgraded with verified tsc-backstop rationale; deferred to a filed follow-up)

## Reviewer Assessment

**Verdict:** APPROVED

Reviewed by Heimdall (Reviewer), 2026-08-08. The implementation is correct, minimal, and pattern-faithful; every finding is test-quality and non-blocking. I did not rubber-stamp — I ran my own mutation against the tree and refuted the two most-emphasized subagent claims.

**Data flow traced:** `window.devicePixelRatio` / `window.innerWidth,innerHeight` → `resizeToDisplay(canvas, …)` (main.ts) → writes `canvas.width/height` (device px, DPR-capped at 2 via `Math.min(MAX_DPR, rawDpr||1)`) → `fitIntegerScale(canvas.width, canvas.height)` (main.ts:220) → integer-scaled `drawImage` blit with `imageSmoothingEnabled=false`. Safe: DPR-blind input can't crash (falsy-guard degrades to 1×); pac-man input is keyboard-only so the DPR backing-store change never perturbs a pointer→canvas coordinate map (there is none).

**Pattern observed:** the `mountCanvas(document)` + `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` idiom is byte-identical to asteroids `main.ts:33,44`, star-wars, tempest — verified good, no new abstraction.

**Error handling:** `mountCanvas` (host-helpers.ts:51-65) throws with a specific message on missing element / non-canvas / null-context — strictly safer than the retired `querySelector<HTMLCanvasElement>` cast + generic throws. Null handling verified against the `CanvasMount` contract (non-optional fields, throw-not-return).

**Five+ observations:**
1. [VERIFIED GOOD] All 4 ACs met by the code: mount adopted, DPR resize adopted (devicePixelRatio genuinely new — absent before this diff), `fitIntegerScale` kept, `@shared/view.letterbox` never imported, determinism seam (`pumpFrame`/`createGameState`/`?seed`) untouched. Confirmed by rule-checker A1/A2/A3 (purity/verb-not-numbers/determinism all compliant) and my own grep.
2. [TEST] test-analyzer (high×2): the `mountCanvas(`/`resizeToDisplay(` positive assertions check token/call presence, not that the return is destructured or that the call sits in the registered resize closure — mutation-surviving. **Downgraded to non-blocking:** the surviving mutants are self-contradictory (keep a discarded `mountCanvas(document)` call *and* hand-roll a `getElementById` mount; keep a dead `resizeToDisplay` *and* a real DPR-blind resize) — not a realistic regression path. The realistic regression (drop the call) is caught (obs. 4).
3. [RULE] rule-checker (rules #15/#25, high×2): AC-3 `\bfitIntegerScale\b` and AC-4 `\bpumpFrame\b` are satisfied by the import alone. **Downgraded to LOW with verified rationale, NOT dismissed:** I mutated main.ts (replaced the `fitIntegerScale(...)` call with an inline object, import intact) and `npm run lint` returned `error TS6133: 'fitIntegerScale' is declared but its value is never read` — `noUnusedLocals: true` (tsconfig:7) turns the exact "drop the call, keep the import" regression into a red lint gate. `pumpFrame` is the same mechanism (single call site). So the composite gate (vitest + tsc, both in CI) does NOT let this regression ship — contrary to the subagent's "ships undetected" wording. Tightening (`fitIntegerScale(`/`pumpFrame(`) is still worthwhile and filed.
4. [VERIFIED] `noUnusedLocals` backstop proven by direct mutation (TS6133) — this is the load-bearing reason the AC-3/AC-4 findings are non-blocking.
5. [DOC] comment-analyzer (high): the test's "Today main.ts:43 does querySelector…" is now factually stale (post-GREEN, :43 is a brace; the querySelector is gone) in a file that stays GREEN in the tree permanently. Real but cosmetic — filed for the hardening follow-up.
6. [DOC] comment-analyzer (low): header cites tp1-39 as a main.ts `?raw` precedent; it is actually a render.ts function-body pin (cp1-6 is the true main.ts precedent). Filed to soften.
7. [VERIFIED GOOD] Negative retirement guards (`not.toMatch querySelector.*#game`, `canvas.width = canvas.clientWidth`) were confirmed by two subagents to match the ACTUAL retired code — not strawmen — so the core "hand-roll is gone" claim is genuinely pinned.

**Why APPROVED (not rework):** the shipped code is correct and every AC is verified against realistic regressions; the confirmed findings are test-robustness against contrived mutants (or tsc-backstopped) plus two cosmetic comment issues. Per the reviewer contract I downgraded the rule-matching findings with a *verified* rationale rather than dismissing them, and filed the hardening as an owned follow-up (SM → SH3-6) so nothing is forgotten. Bouncing a correct, clean adoption for these would be disproportionate.

### Devil's Advocate

Arguing this code is broken, and covering the five disabled specialist domains (edge, silent-failure, type-design, security, simplifier):

Could a malicious or confused user break it? The surface is a canvas mount and a resize handler. There is no user input parsed here — `window.innerWidth/innerHeight/devicePixelRatio` are trusted DOM globals, not attacker-controlled strings, so [SEC] there is no injection, no `JSON.parse`, no `as T` on external data, no secret handling. A hostile page could omit `<canvas id="game">`, but then `mountCanvas` throws a *clearer* error than the retired code — a strict improvement, not a regression.

[EDGE] Boundary conditions: `devicePixelRatio` could be `0`, `NaN`, or `undefined` on exotic/headless browsers — `resizeToDisplay` folds `rawDpr || 1`, degrading to 1× rather than collapsing the backing store to 0, so the falsy-guard is real (verified in view.ts:116). `window.innerWidth === 0` (a 0-height headless window) would make the backing store 0, but `fitIntegerScale` clamps `scale` to `Math.max(1, …)`, and `drawImage` into a 0×0 canvas is a harmless no-op frame, not a throw. On a genuine DPR-2 display the backing store doubles vs the old always-1×; does anything downstream assume 1×? pac-man's input is keyboard-only (no pointer-to-canvas coordinate mapping), and the render reads `canvas.width` directly, so the doubling is transparent to game logic — the one real behavioural change (sharper pixels) is the intended AC-2 outcome.

[SILENT] Swallowed errors: the diff adds none. `mountCanvas` throws loudly; `resizeToDisplay` returns a value the caller legitimately ignores (pac-man reads `canvas.width` in the loop instead). The pre-existing audio `try/catch` blocks are untouched.

[TYPE] The destructure `const { canvas, ctx } = mountCanvas(document)` binds to a `CanvasMount` whose fields are non-optional and guaranteed non-null by the function's throw-on-failure contract — strictly better-typed than the retired `querySelector<HTMLCanvasElement>` cast, which would have accepted a `<div id="game">` and died later on `.getContext`. No `as any`, `!`, or `@ts-ignore` introduced (rule-checker #1: 0 violations).

[SIMPLE] Over-engineering? The opposite: net −6/+comments of hand-rolled boilerplate replaced by two named shared calls — the epic's whole point. No dead code, no speculative abstraction.

What survives all this is nothing that blocks: the only substantive risk (a silent regression dropping the integer-scale or pump call) is caught by `noUnusedLocals` (proven), and the mount/resize adoption is pinned by negative guards that match the real retired code. Verdict stands: APPROVED.

### Rule Compliance

Applicable rules (TypeScript lang-review + arcade project rules), enumerated against the diff:
- **TS #1 type-safety escapes:** 0 introduced (no `as any`/`!`/`@ts-ignore`); retired code's boolean null-throws replaced by mountCanvas's own throws, not a cast. COMPLIANT.
- **TS #4 null/undefined:** `const { canvas, ctx } = mountCanvas(document)` — mountCanvas throws rather than returning null; destructure-without-default is correct. COMPLIANT.
- **TS #5 module/imports:** both new imports are value imports of a real `@shared` alias (declared in vite/vitest/tsconfig); extensionless is correct under `moduleResolution: bundler`. COMPLIANT.
- **TS #8 test quality:** imports from `src` via `?raw` (not `dist`), no `as any`, every `it` asserts. COMPLIANT (with the non-blocking anchoring nuance, #15/#25 below).
- **TS #15/#25 source-text token-vs-claim / whole-file scope:** 2 instances (fitIntegerScale, pumpFrame) matched — CONFIRMED, downgraded to LOW (tsc `noUnusedLocals` backstop verified). Filed.
- **arcade A1 core/shell purity:** change is in `main.ts` (shell); `grep window.\|document. src/core/` = 0 hits. COMPLIANT.
- **arcade A2 verb-not-numbers:** `fitIntegerScale` kept; `@shared/view.letterbox` not imported. COMPLIANT.
- **arcade A3 determinism:** no rng/loop primitive touched. COMPLIANT.

**Handoff:** To SM for finish-story.