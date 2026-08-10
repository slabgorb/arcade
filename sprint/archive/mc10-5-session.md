---
story_id: "mc10-5"
jira_key: "mc10-5"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-5: Preserve field aspect ratio: letterbox the logical 256x222 (~1.15:1) field centered with black bars instead of stretching to the ~2:1 window (index.html 100%x100%), removing the horizontal smear and empty middle

## Story Details
- **ID:** mc10-5
- **Jira Key:** mc10-5
- **Epic:** mc10 (Missile Command — authentic look & feel, round 2)
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/mc10-5-letterbox-field-aspect-ratio)
- **Branch:** feat/mc10-5-letterbox-field-aspect-ratio
- **PR:** https://github.com/slabgorb/arcade/pull/215 (MERGED into develop 2026-08-10)

## SM Finish — Impact Summary

**Merged:** PR #215 → `develop` (gitflow `--merge`), verified `state: MERGED`. TDD, 3 review rounds → APPROVED; all findings (F1–F4) closed.

**develop moved 12 commits during the story (mc7-3 high-score board).** Trial-merged before merging: two real conflicts, both UNION-resolved — `main.ts` (my `resize()`/`applyLetterbox` + mc7-3's high-score game init; imports reconciled to `keydownReducer`+`makeMcHighScoreStorage`/`loadHighScores`+`applyLetterbox`) and `render-hud.test.ts` (allowlist now carries BOTH `@shared/view` and mc7-3's `@shared/highscore`). Merged tree re-verified: **1269/1269 MC vitest, tsc clean, orchestrator 0 fail, build OK** — not just green-on-stale-branch.

**Shipped:** `plugins/missile-command/src/shell/viewport.ts` (new), `src/main.ts`, `index.html`, `tests/mc10-5-letterbox-aspect.test.ts` (new), `tests/render-hud.test.ts` (allowlist). Core untouched (AC5). Non-blocking accepted note: `computeLetterbox` unused in production (battlezone adapter parity).

**Human-verify artifact:** the visual centering + black bars at `/missile-command/` in a wide window (node cannot observe layout).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T20:30:12Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T19:44:39Z | 2026-08-10T19:46:46Z | 2m 7s |
| red | 2026-08-10T19:46:46Z | 2026-08-10T19:56:50Z | 10m 4s |
| green | 2026-08-10T19:56:50Z | 2026-08-10T20:01:56Z | 5m 6s |
| review | 2026-08-10T20:01:56Z | 2026-08-10T20:11:19Z | 9m 23s |
| green | 2026-08-10T20:11:19Z | 2026-08-10T20:15:47Z | 4m 28s |
| review | 2026-08-10T20:15:47Z | 2026-08-10T20:22:36Z | 6m 49s |
| green | 2026-08-10T20:22:36Z | 2026-08-10T20:24:30Z | 1m 54s |
| review | 2026-08-10T20:24:30Z | 2026-08-10T20:30:12Z | 5m 42s |
| finish | 2026-08-10T20:30:12Z | - | - |

## Acceptance Criteria

Derived from the story title (no description/ACs in sprint YAML):

1. The game field renders at the logical 256×222 aspect ratio (~1.15:1), centered within the viewport, without horizontal stretching
2. Black letterbox bars fill the sides when the viewport aspect ratio exceeds the logical field's aspect ratio
3. No horizontal smear or empty middle effect occurs when viewed in a ~2:1 window
4. Cursor/input mapping remains correct after letterboxing — aim coordinates map correctly from canvas position to logical field coordinates
5. The implementation lives in `src/shell/` (render.ts, input mapping, or index.html), not in `src/core/` — the core/shell boundary is preserved

## Delivery Findings

No upstream findings.

### Reviewer (code review) — round 1 (REJECTED)
- **F2 (High):** AC4 (cursor mapping survives letterbox) has no behavioral test — the buffer-aspect assertion is a corollary that passes even if `placeCursor`/`project` were broken. Add a real cursor-round-trip test. → TEA.
- **F1 (Medium):** `main.ts:71` pointermove comment is confirmed-false post-diff (claims `canvas.width == clientWidth`, the deleted per-frame sync) — latent regression vector. Rewrite to the dpr-invariant CSS-space reason. → Dev.
- **F3 (Low):** asteroids `margin.ts` "letterbox + resizeToDisplay" attribution is imprecise (margin.ts imports only `letterbox`). → Dev.
- Non-blocking note: `computeLetterbox` is exported+tested but unused in production; accepted (mirrors battlezone adapter, required by TEA's suite).

### Reviewer (code review) — round 2 (REJECTED)
- Round-1 findings F1/F2/F3 all verified **CLOSED** (F2 by test-analyzer, F1 by comment-analyzer + rule-checker, F3 by both + manual).
- **F4 (Low):** `void top` dead local in the AC4 test (`#26` linter-appeasement smell, rule-checker) — make `top` genuinely used (`H/2 - top` in the black-bar test's y) or delete it. → Dev.

### Reviewer (code review) — round 3 (APPROVED)
- F4 verified **CLOSED** (test-analyzer + rule-checker): dead local removed, replaced by a genuinely-used portrait-window vertical-bar test. Full 26-rule re-scan → zero violations. All four subagents clean.
- No open findings remain. Non-blocking accepted note: `computeLetterbox` unused in production (battlezone-parity).

## Design Deviations

No design deviations recorded.

## Sm Assessment

**Story shape:** Title-only (description and acceptance_criteria are both `null` in `sprint/epic-mc10.yaml`). Per the title-is-the-spec rule, the five ACs above were DERIVED from the title, not copied. There is no epic-YAML AC text to diff against; nothing was edited "verbatim."

**Premise re-measured before setup (all current on the tree):**
- `plugins/missile-command/index.html:9` → `canvas { display: block; width: 100%; height: 100%; }` — the field is stretched to fill the full 100%×100% viewport. The title's "(index.html 100%x100%)" claim is TRUE today.
- `plugins/missile-command/src/core/cursor.ts:61` `LOGICAL_WIDTH = 0x100 // 256`, `:63` `LOGICAL_HEIGHT = 222`; `render.ts` mirrors `LOGICAL_HEIGHT`. 256/222 ≈ 1.153:1 — the title's "256x222 (~1.15:1)" is EXACT.

**Sibling contention:** clean. `git fetch --prune` + `git branch -r | grep mc10-5` → no branch existed before I pushed. `.session` sweep of a-* → only a-3 on mc7-3 (different epic). No open PRs (merge gate clear).

**Boundary note for TEA/Dev:** aspect/letterbox scaling is a SHELL concern (canvas sizing / render transform / `index.html`), enforced by the `src/core/` purity scanner. Keep the change out of `src/core/`. AC4 is the trap: the cursor→logical-field coordinate mapping must survive the letterbox transform — a fit that only fixes rendering but leaves aim pointing at the pre-letterbox canvas rect would pass a visual check and fail play.

**Verdict:** Ready for RED. Handing to TEA.

## Tea Assessment

**RED committed:** `19692459` — `plugins/missile-command/tests/mc10-5-letterbox-aspect.test.ts` (22 assertions across 5 groups). Fails cleanly on `Cannot find module '../src/shell/viewport.js'` (feature absent), verified by testing-runner. NOT a typo/parse error (an earlier literal comment-delimiter inside a docblock was fixed before commit).

**This story is a FLEET-PATTERN PORT, not new math.** `@shared/view` already ships the pure `letterbox(w,h,aspect)` + `resizeToDisplay(canvas,...)` verbs, and the sibling cabinets already consume them:
- **battlezone** `plugins/battlezone/src/shell/viewport.ts` — the exact template. Its own suite is `plugins/battlezone/tests/shell/viewport.test.ts`; my RED mirrors it 1:1 with MC's number.
- **asteroids** `plugins/asteroids/src/shell/margin.ts` — same `letterbox` verb for its margin bars.
- **missile-command imports NONE of it today** (`grep @shared/view plugins/missile-command/src` → nothing).

**The GREEN Dev must write (minimal, copy battlezone):**
1. New `plugins/missile-command/src/shell/viewport.ts` — a thin adapter over `@shared/view` exporting `TARGET_ASPECT` (= `256/222`; prefer deriving it from the exported `LOGICAL_WIDTH`/`LOGICAL_HEIGHT` in `core/cursor.ts` so it is single-sourced), `MAX_DPR`, `computeLetterbox(windowW, windowH, rawDpr, aspect?)` and `applyLetterbox(canvas, windowW, windowH, rawDpr, aspect?)`. Return shape `{ cssWidth, cssHeight, bufferWidth, bufferHeight }`. This is battlezone's file with `4/3` → `256/222`.
2. Rewire `src/main.ts`: replace the per-frame `canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight` (lines 92-93) with a `resize()` that calls `applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` on the `resize` event and once at boot — exactly battlezone's `resize()`. The per-frame reset MUST go (my wiring guard reddens if `canvas.clientWidth`/`clientHeight` survive in code) — left in, it would clobber the letterboxed backing store back to a full-window stretch every frame.
3. `index.html`: stop forcing `canvas { width:100%; height:100% }` and instead CENTER the (now JS-sized) canvas so the black `body` background shows as the bars. **This centering is the one thing node cannot observe — it is the reviewer's screenshot artifact.**

**Verified numbers (checked against the real shared formula, not just asserted):** wide 2000×1000 → 1153.15×1000 (bars L/R); tall 600×1000 → 600×520.3125 (bars T/B); exact 2560×2220 fills; dpr cap 3→2; falsy dpr 0→1; fractional fit floors to integer buffer. GREEN will pass on a faithful battlezone-style adapter.

**AC4 (cursor mapping) is covered TRANSITIVELY, by design.** `render.project()` reads the buffer (`canvas.width/height`) and `placeCursor()` maps against the CSS box (`getBoundingClientRect`); both are scale-invariant fractions, so equal ASPECT on both surfaces is what keeps the crosshair on the mouse. The `keeps the backing store at 256:222` test pins `bufferAspect ≈ fieldAspect`, which is the AC4-relevant invariant. Neither `project` nor `placeCursor` needs to change — do not touch `core/cursor.ts`.

### Rule Coverage (TS lang-review)
- **Falsy-but-valid guard** (`rawDpr || 1`; checklist "x ?? default where x can be 0"): `falls back to dpr 1 when devicePixelRatio is 0 or falsy` pins the `0 → 1×` degrade, not a collapse to 0.
- **NaN safety** (checklist #18/#22, non-finite inputs into arithmetic): the two degenerate-window tests assert `Number.isNaN(...) === false` AND `=== 0` for zero-height/zero-width windows (`w/0 = Infinity` must not leak NaN into canvas dims).
- **Integer backing store**: `produces an integer backing store even when the fit is fractional` asserts `Number.isInteger(bufferW/H)` — a canvas backing store silently truncates otherwise.
- **No vacuous assertions**: every `.not.toBe(...)` is paired with a positive `.toBe`/`toBeCloseTo` on the same value; no `let _ =`, no `assert(true)`.

**Handing to Dev (Loki Silvertongue) for GREEN.**

## Dev Assessment

**GREEN committed:** `6420dc46`. All gates green:
- `npx vitest run --project missile-command` → **1244/1244** (incl. the new `mc10-5-letterbox-aspect.test.ts` 20/20, purity.test.ts, and the mc9-4 sanctioned-shared guard).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.
- `npm run test:orchestrator` → **457/457**.
- `node scripts/build-app.mjs missile-command` → built OK.

**What I changed (minimal port of the battlezone pattern, exactly as TEA specced):**
1. **NEW `src/shell/viewport.ts`** — battlezone's adapter with MC's number. Exports `TARGET_ASPECT = LOGICAL_WIDTH / LOGICAL_HEIGHT` (256/222, imported from `core/cursor.js` so it is single-sourced and can never drift from what `project`/`placeCursor` map against), `MAX_DPR`, `computeLetterbox`, `applyLetterbox` — all delegating the arithmetic to `@shared/view`'s `letterbox` + `resizeToDisplay`.
2. **`src/main.ts`** — added a `resize()` (a **const arrow**, not a `function` decl — see below) that calls `applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` on the `resize` event and once at boot; **deleted the per-frame `canvas.width = canvas.clientWidth` / `clientHeight` reset** from `frame()` (it would otherwise clobber the letterbox every frame — TEA's wiring guard enforces its removal).
3. **`index.html`** — replaced `canvas { width:100%; height:100% }` with battlezone's centering (`body { display:flex; align-items/justify-content:center }` + `canvas { display:block }`) so the black `body` background shows through as the bars.

**Two GREEN-phase shakeouts, both fixed at the right layer:**
- **`tsc` narrowed `canvas` back to `| null` inside `resize()`** because a hoisted `function` declaration sits above the `if (!canvas) throw` guard. Converted `resize` to a `const` arrow (created *after* the guard) — matches the file's existing `drain`/`frame` closures, which is why they never had the problem. No `as`/`!` assertion needed.
- **mc9-4's sanctioned-`@shared` guard (`render-hud.test.ts`) reddened on `@shared/view`.** That guard bans *minting a NEW `src/shared` library*; `@shared/view` is a **pre-existing** shared module already consumed by battlezone (`shell/viewport.ts`) and asteroids (`shell/margin.ts`). Reusing it is precisely mc10-5's intent and this epic's theme. Added `@shared/view` to the `ALLOWED` set with a citing comment — the same maintenance mc6-3 did when it added `pause`/`esc-overlay`. This EXTENDS the allowlist for a legitimate reuse; it does not weaken the guard's teeth against fresh extractions.

**AC4 verified by construction (not touched: `core/cursor.ts`).** After the fix `canvas.style` box (CSS px) and `canvas.width/height` backing store (CSS×dpr) share the 256:222 aspect. A mouse at CSS `(cx,cy)` → `placeCursor(cx,cy,cssW,cssH)` → `h=(cx/cssW)·256` → `project(...,bufferW)` → `x=cx·dpr`, which the browser downscales by dpr for display → back to `cx`. The crosshair tracks the mouse through the letterbox. `project`/`placeCursor` are unchanged.

**Human-verify artifact (node cannot observe):** the reviewer screenshot at `/missile-command/` in a wide window — field centered at 256:222 with black side bars, no horizontal smear, crosshair on the mouse.

**Handing to Reviewer (Heimdall).**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1244 vitest, 457 orch, tsc clean, build OK, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Yes (disabled) | covered by Reviewer | none — I traced the degenerate-window (0×0/0×w/w×0 → 0, not NaN) and dpr edge paths myself | N/A |
| 3 | reviewer-silent-failure-hunter | Yes (disabled) | covered by Reviewer | none — no try/catch, no swallowed errors, no silent fallbacks in the diff | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | F2 (AC4 not behaviorally tested), F1-adjacent (stale main.ts:71 comment), source-scan brittleness | F2 CONFIRMED High; brittleness accepted-with-rationale |
| 5 | reviewer-comment-analyzer | Yes | findings | F3 (asteroids margin.ts "letterbox + resizeToDisplay" imprecision ×2); verified all NEW comments accurate | F3 CONFIRMED Low |
| 6 | reviewer-type-design | Yes (disabled) | covered by Reviewer | none — no `as`/`!`/`any`, CanvasLike duck-type clean, TARGET_ASPECT single-sourced (corroborated by rule-checker rule #1/#2) | N/A |
| 7 | reviewer-security | Yes (disabled) | covered by Reviewer | none — inputs are trusted DOM API numbers (innerWidth/innerHeight/devicePixelRatio), no user-string/JSON parse (corroborated by rule-checker rule #10) | N/A |
| 8 | reviewer-simplifier | Yes (disabled) | covered by Reviewer | noted: `computeLetterbox` is exported+tested but unused in production — but this MIRRORS battlezone's viewport.ts exactly (same fleet adapter shape) and TEA's suite requires it; accepted | N/A |
| 9 | reviewer-rule-checker | Yes | findings | F1 (main.ts:71 stale comment, rules #17 + #24, high confidence); 27 other rules PASS | F1 CONFIRMED Medium |

All received: Yes

### Rule Compliance (TS lang-review, 28 checks)
Rule-checker enumerated all 28 checks across the 39 instances in the diff: **27 pass, 1 violation**.
- **PASS:** #1 type-escapes (no `as`/`!`/`any` — only import renames), #2 generics/readonly, #4 `||` vs `??` (dpr `|| 1` is correct — 0/NaN dpr is genuinely invalid), #5 `.js` extensions + `export type`, #8 test quality (src not dist, structural fakeCanvas), #15/#25 source-text guards (narrow wiring tripwire over comment-stripped single-purpose file — the accepted safe case), #18 test-apparatus (distinct fixtures, independently-computed expectations), #21/#22 degenerate/NaN safety (letterbox multiplies on the zero side → 0 not Inf/NaN), #26 assertion terms not all test-local, #27 core-boundary (empty core diff), #28 `@shared/view` is pre-existing reuse (predates branch, consumed by battlezone+asteroids).
- **VIOLATION:** #17 + #24 → the stale `main.ts:71` comment (F1 below).

### Devil's Advocate
Assume this ships broken. First attack: **the crosshair drifts on HiDPI displays.** After this change `canvas.width`/`height` is the backing store (`cssW × dpr`, up to 2×) while the `pointermove` handler feeds `placeCursor` the `getBoundingClientRect()` size (CSS px) — two different magnitudes. If `project()` and `placeCursor()` were not both pure scale-invariant fractions this would put the drawn crosshair a factor of `dpr` away from the mouse. I traced it: `placeCursor(cx, cy, rect.w, rect.h)` computes `h = cx/rect.w · 256` (CSS space), `project` draws it at `h/256 · canvas.width = cx/rect.w · bufferW` (buffer space), the browser downscales the buffer by `dpr` for display → back to `cx`. It round-trips. Not broken — but note the ONLY thing keeping it correct is that both maps are fractional and `placeCursor`/`project` were left untouched; **there is no test that would catch it if a later edit broke that** (F2). Second attack: **a maximized-then-restored or zero-size window.** `resize()` runs at boot before layout; it reads `window.innerWidth/innerHeight` (not `clientWidth`), so it doesn't depend on layout — good. A 0×0 window yields a 0×0 canvas (traced: NaN-free), and the next real resize fixes it. Third attack: **the stale comment causes a future regression.** `main.ts:71` still tells the reader the aim is exact *because the frame loop keeps `canvas.width == clientWidth`* — the exact per-frame line THIS diff deleted. A maintainer who trusts it could "restore" that line to "fix" a perceived inconsistency, reintroducing the smear this story removes (F1 — a genuine latent regression vector, not cosmetics). Fourth attack: **`computeLetterbox` is dead production code** — true, but it is fully unit-tested, mirrors the battlezone adapter one-for-one, and removing it would redden TEA's suite; harmless. Fifth: **the allowlist widening neuters a guard** — no: `@shared/view` is a pre-existing SH2-10 module already consumed by two sibling games; the guard's teeth (block NEW ad-hoc MC→shared extractions) are intact. Net: no correctness defect survives, but AC4 — a NAMED acceptance criterion — rests on a "covered transitively" claim the test-analyzer refuted, and one load-bearing comment is confirmed-false by two specialists.

## Round 1 Reviewer Verdict (REJECTED, superseded by the final APPROVED verdict below)

**Verdict:** REJECTED

The letterbox feature is functionally correct and a faithful port of the battlezone pattern — core untouched, types clean, NaN-safe, build + 1244 tests green. But two verified findings block approval: a named acceptance criterion (AC4) has **no** behavioral test, and a load-bearing comment is confirmed-false by two independent specialists and risks reintroducing the fixed bug. Both fixes are small and well-scoped; one rework round.

| # | Severity | File:Line | Finding | Confirmed by |
|---|----------|-----------|---------|--------------|
| F2 | **High** | tests/mc10-5-letterbox-aspect.test.ts:192 | **AC4 ("cursor mapping survives letterbox") has no behavioral test.** The `keeps the backing store at 256:222` test is a corollary (`bufferW/bufferH` shares the css ratio automatically since both scale by the same dpr) that would PASS even if `placeCursor`/`project` were broken. The Dev Assessment's "covered transitively" claim is refuted. No test composes the letterbox fit with `placeCursor` to prove a known screen click maps to the expected logical cursor after letterboxing. | test-analyzer (high confidence) |
| F1 | Medium | src/main.ts:71 | **Stale/false load-bearing comment.** The `pointermove` comment still states the aim is exact "because the frame loop keeps canvas.width/height equal to canvas.clientWidth/clientHeight (below)" — the `(below)` pointed at the exact `frame()` lines THIS diff deletes. Post-diff `canvas.width/height` is the HiDPI buffer (`css × dpr`), no longer equal to `clientWidth/clientHeight` when `dpr ≠ 1`. Functionally harmless (the real math uses `rect`/`clientX`, both CSS-space) but a latent regression vector: a maintainer trusting it could restore the deleted per-frame stretch. | test-analyzer + rule-checker rules #17/#24 (high confidence) |
| F3 | Low | tests/mc10-5-letterbox-aspect.test.ts:14; tests/render-hud.test.ts (allowlist comment) | Imprecise attribution: comments say asteroids' `shell/margin.ts` "delegate[s] the fit to @shared/view's `letterbox` + `resizeToDisplay`", but `margin.ts` imports only `letterbox`; `resizeToDisplay` is consumed by asteroids' `main.ts`. | comment-analyzer (medium/low) |

**Required rework:**
1. **(F2, TEA/red)** Add a behavioral AC4 test that composes the letterbox output with the pure cursor mapping — e.g. a click at the center of a wide (2000×1000) letterboxed window maps to logical field center (`h≈128, v≈111`), an off-center click yields the letterbox answer and NOT the full-window-stretch answer, and a click in the black-bar region clamps to a field edge (HMIN/HMAX). This proves AC4 rather than asserting a corollary.
2. **(F1, Dev/green)** Rewrite the `main.ts:71` comment to state the ACTUAL reason the aim is exact post-letterbox: `placeCursor` and `event.clientX/Y` both operate in CSS-pixel space via `getBoundingClientRect`, so the mapping is dpr-invariant and no longer relies on any `canvas.width == clientWidth` equality (which this story removed).
3. **(F3, Dev/green)** Tighten the two `margin.ts` attributions — drop `resizeToDisplay` or cite asteroids' `main.ts` as its consumer.

**Not required (recorded, non-blocking):** `computeLetterbox` is exported+tested but unused in production — accepted, it mirrors the battlezone adapter and TEA's suite requires it.

**Routing to TEA (red) for the AC4 test; the comment fixes (F1, F3) land in the following green.**

## Dev Assessment — Round 1 Rework

**Rework committed:** `cc89c22f`. All three round-1 findings addressed; MC **1248/1248** (was 1244 — +4 AC4 tests), `tsc --noEmit` clean.

- **F2 (High) — CLOSED.** Added `describe('mc10-5 AC4 — the cursor maps through the LETTERBOX box, not the stretched window')` to the test suite: it composes the real production seam `computeLetterbox` → `placeCursor(box dims)`. Four assertions: (a) canvas center → field center `{h:128, v:111}`; (b) an off-center click follows the letterbox box (`h=192`) and is asserted to **DIFFER** from the full-window-stretch reading (`h≈110.7`) — this is the discriminating test the corollary lacked, and it would redden if `placeCursor` were fed window dims instead of the box; (c) field corners clamp to `HMAX/VMIN` and `HMIN/VMAX`; (d) a click in the black-bar region (negative canvas-relative x) clamps to `HMIN` (does not wrap into the field). The node-unobservable DOM step (`getBoundingClientRect` returning the centered rect) remains the reviewer screenshot, as before.
- **F1 (Medium) — CLOSED.** Rewrote the `main.ts` pointermove comment. It now states the aim is **dpr-invariant** — `event.clientX/Y` and `rect.width/height` are both CSS pixels, so the fraction is correct regardless of the HiDPI backing store — and explicitly notes mc10-5 removed the per-frame `canvas.width = canvas.clientWidth`, so `canvas.width/height` is now the device buffer and is deliberately NOT relied on by the cursor path. No false "equal to clientWidth" premise remains. (The literal `canvas.clientWidth` appears only inside this `//` comment; the wiring guard strips comments before its `not.toContain` scan, so it stays green — verified: 1248 pass.)
- **F3 (Low) — CLOSED.** Tightened both attributions: battlezone `shell/viewport.ts` uses `letterbox` + `resizeToDisplay`; asteroids `shell/margin.ts` uses `letterbox` only (its `resizeToDisplay` is in `main.ts`). Fixed in both the test-file header and the render-hud allowlist comment.

**Handing back to Reviewer (Heimdall) for round 2.**

## Subagent Results — Round 2 (focused on rework diff 6420dc46..HEAD)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — 1248 vitest (+4 AC4), tsc clean, build OK | N/A |
| 2 | reviewer-edge-hunter | Yes (disabled) | covered by Reviewer | test-analyzer noted no portrait-window vertical-bar case (Low, non-blocking, pre-existing testing-strategy limit) | recorded |
| 3 | reviewer-silent-failure-hunter | Yes (disabled) | covered by Reviewer | none — rework is a test + comments, no error paths | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | **F2 CLOSED** — AC4 block genuinely discriminating (`toBeCloseTo(192,5)` fails if fed window dims; constants imported not re-declared) | F2 CLOSED |
| 5 | reviewer-comment-analyzer | Yes | clean | **F1 + F3 CLOSED**, new AC4 comment arithmetic verified accurate, no new issue | F1/F3 CLOSED |
| 6 | reviewer-type-design | Yes (disabled) | covered by Reviewer | none — no `as`/`!`/`any` in rework (corroborated by rule-checker #1) | N/A |
| 7 | reviewer-security | Yes (disabled) | covered by Reviewer | none — no new input surface | N/A |
| 8 | reviewer-simplifier | Yes (disabled) | covered by Reviewer | subsumed by rule-checker's #26 `void top` finding below | see F4 |
| 9 | reviewer-rule-checker | Yes | findings | **#17/#24 RESOLVED** (F1 comment now true, traced through viewport/render/cursor); production logic byte-identical (round-1 PASS stands); **NEW: #26 `void top` (F4, Low)** | F1 CLOSED; F4 NEW |

All received: Yes

### Rule Compliance — Round 2
- **#17 / #24 (F1) — RESOLVED.** The rewritten `main.ts` pointermove comment is traced true against `viewport.ts` (buffer = css×dpr), `render.ts` `project()` (reads the same fraction from the buffer), and `cursor.ts` `placeCursor` (divides by the CSS rect only). No stale re-anchor, no new false claim.
- **#5 / #1 / #8 (new AC4 test) — PASS.** `.js` extension present; no `as`/`!`/`any`; real assertions against the imported production `placeCursor`/`HMIN`/`HMAX`/`VMIN`/`VMAX` (not re-declared), ran 4/4.
- **#26 (F4) — VIOLATION (Low).** `const top` (test:277) is dead; its only reference is `void top` (test:316), a `noUnusedLocals` appeasement — the exact smell #26 names.
- Production code: `main.ts` diff is comment-only, so round-1's #1–#28 PASS verdicts stand.

### Devil's Advocate — Round 2
Assume the rework only *looks* fixed. Attack 1: **the AC4 test is circular** — does it merely re-derive `placeCursor`'s own formula and assert the tautology? No: the load-bearing assertion is `expect(correct.h).toBeCloseTo(192, 5)`, a literal derived from the geometry (`0.75 × 256`), not from calling `placeCursor` with the same args; the test-analyzer confirmed that feeding window dims instead of box dims makes it evaluate to ≈110.7 and fail. The companion `stretchBug.h` sub-assertion IS self-referential (it restates the fraction formula) and carries only documentation weight — but the `192` literal and the `not.toBeCloseTo` comparison carry the real discrimination, so the test is honest. Attack 2: **the F1 comment swapped one false claim for another** — three independent reads (comment-analyzer, rule-checker, mine) traced every clause to the actual code; the dpr-invariance and "project reads the same fraction from the buffer" claims both hold. Attack 3: **the rework broke something elsewhere** — `main.ts` is comment-only (verified: no non-comment line changed), 1248 tests pass, build green; nothing behavioral moved. Attack 4: **coverage regressed** — no; it grew by 4 real tests. The one thing that survives scrutiny is the `void top` dead local (F4): it is a genuine, if tiny, named-checklist violation freshly introduced by the rework, and it would read as an unowned smell if shipped. Net: the feature and all round-1 blockers are solid; one Low test-cosmetic remains.

## Round 2 Reviewer Verdict (REJECTED, superseded by the final APPROVED verdict below)

**Verdict:** REJECTED

All three round-1 findings are independently verified **CLOSED** — F2 (AC4 now has a genuinely discriminating behavioral test), F1 (the pointermove comment is now true and dpr-invariant), F3 (asteroids attribution corrected). The feature is correct and thoroughly covered. The rework introduced exactly one new, minor issue:

| # | Severity | File:Line | Finding |
|---|----------|-----------|---------|
| F4 | Low | tests/mc10-5-letterbox-aspect.test.ts:277,316 | **`#26` linter-appeasement dead local.** `const top` is never used in any assertion; its sole reference is `void top`, present only to satisfy `noUnusedLocals`. Honest fix: delete `const top` + `void top` (fold the "top === 0 here" note into prose), OR make `top` genuinely participate — subtract it in the black-bar test's y-coordinate (`H / 2 - top`), which also models the vertical centering offset correctly. |

**Why reject on a single Low:** approving would either ship an unowned named-checklist smell in the permanent test record or require filing a follow-up story for a two-line test cleanup. It is cheaper to fix than to track. This is the *only* remaining item — round 3 is a glance.

**Required rework:**
1. **(F4, Dev/green)** Resolve the `void top` dead local — prefer making `top` genuinely used (`H / 2 - top` in the black-bar test's y, modelling the vertical bar offset) over deletion, so the vertical-centering intent is documented by use, not by a comment.

**Routing to green.**

## Dev Assessment — Round 2 Rework

**Rework committed:** `22bfc6eb`. MC **1249/1249** (was 1248 — the black-bar test split into two), `tsc --noEmit` clean.

- **F4 (Low) — CLOSED, the recommended way.** Deleted the dead module-level `const top` and the `void top` appeasement. Split the black-bar test into two: (a) LEFT/RIGHT bar on the wide 2000×1000 window (uses `left`) → click left of canvas clamps to `HMIN`; (b) a new TOP/BOTTOM bar case on a **portrait 600×1000** window where the vertical centering offset is genuinely nonzero (`topOffset ≈ 239.84 > 0`, asserted) → a click above the canvas has negative canvas-relative y, which the V-flip maps to the field top, clamped to `VMAX`. The offset is now *used*, not `void`-ed. This also closes the round-2 test-analyzer's non-blocking note that no portrait window exercised the vertical-bar clamp — the mirror axis is now covered.

**Handing back to Reviewer (Heimdall) for round 3.**

## Subagent Results — Round 3 (focused on test-only delta cc89c22f..HEAD)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — 1249 vitest, tsc clean, build OK | N/A |
| 2 | reviewer-edge-hunter | Yes (disabled) | covered by Reviewer | none — the round-2 portrait/vertical-bar coverage note is now CLOSED by the new test | N/A |
| 3 | reviewer-silent-failure-hunter | Yes (disabled) | covered by Reviewer | none — test-only delta | N/A |
| 4 | reviewer-test-analyzer | Yes | clean | **F4 CLOSED, fix honest** — `top` genuinely used (portrait window), new vertical-bar test non-vacuous (fails under a V-clamp mutant), no regression | F4 CLOSED |
| 5 | reviewer-comment-analyzer | Yes | clean | none — new test comments verified accurate | N/A |
| 6 | reviewer-type-design | Yes (disabled) | covered by Reviewer | none — no `as`/`!`/`any` (corroborated by rule-checker #1) | N/A |
| 7 | reviewer-security | Yes (disabled) | covered by Reviewer | none — test-only | N/A |
| 8 | reviewer-simplifier | Yes (disabled) | covered by Reviewer | none — the dead local is gone; no new complexity | N/A |
| 9 | reviewer-rule-checker | Yes | clean | **#26 RESOLVED**; full 26-rule re-scan → zero violations; production verdicts stand (test-only delta) | F4 CLOSED |

All received: Yes

### Rule Compliance — Round 3
Rule-checker re-scanned all 26 checks against the test-only delta: **zero violations**. #26 (F4) RESOLVED — the dead `const top` + `void top` are deleted and the replacement `topOffset` is load-bearing across three statements that all trace to production (`computeLetterbox`, `placeCursor`, `VMAX`), not another appeasement. `main.ts`/`viewport.ts`/`index.html` are byte-identical since round 2, so their round-1/round-2 PASS verdicts stand.

### Devil's Advocate — Round 3
Assume the "fix" only relocated the smell. Attack 1: **did `top` become a new appeasement in disguise?** No — three independent reads (test-analyzer, rule-checker, mine) confirm `topOffset` is asserted (`toBeGreaterThan(0)`), then feeds `canvasRelY` (asserted `< 0`), which feeds a real `placeCursor` call whose output is asserted against the production `VMAX`. It is load-bearing, not `void`-ed. Attack 2: **is the new vertical-bar test vacuous or circular?** It computes the portrait fit from production `computeLetterbox(600,1000,1)` and asserts `placeCursor`'s V-flip clamps a negative canvas-relative y to `VMAX=206` — a mutant that dropped or inverted the V-clamp would redden it, so it pins real behaviour, and it covers an axis (top/bottom bar) no prior test touched. Attack 3: **did splitting the horizontal/vertical cases regress the old assertion?** No — the horizontal case is byte-identical in logic, still uses `left`, and the suite grew from 24 to 25 (nothing removed net); 1249 pass. Attack 4: **did anything in production move?** The delta touches one test file only; `main.ts`/`viewport.ts`/`index.html` are unchanged since the round-2 approval-quality state. Attack 5: **is there any remaining open finding across all three rounds?** F1, F2, F3 closed in round 2 (verified); F4 closed here (verified). The only standing non-blocking note — `computeLetterbox` unused in production — was accepted round 1 as a deliberate fleet-adapter parity with battlezone. Nothing survives. The feature is a faithful, fully-tested port; the sole human-verifiable gap (the visual centering / bar rendering at `/missile-command/`) is the reviewer screenshot, consistent with every sibling cabinet's testing boundary.

## Reviewer Assessment

**Verdict:** APPROVED  _(Round 3 — final; Rounds 1–2 above are superseded)_

Every finding across all three rounds is closed and independently verified:
- **F2 (High)** — AC4 now has a genuinely discriminating behavioral test (round 2). ✅
- **F1 (Medium)** — the pointermove comment is now true and dpr-invariant (round 2). ✅
- **F3 (Low)** — asteroids attribution corrected (round 2). ✅
- **F4 (Low)** — the `void top` dead local is gone, replaced by a real portrait-window vertical-bar test that also closes the earlier vertical-clamp coverage gap (round 3). ✅

The implementation is a faithful port of the battlezone letterbox adapter over `@shared/view` (aspect `256/222`, single-sourced from the core `LOGICAL_*`): core untouched, types clean, NaN-safe, `@shared/view` reuse legitimate. Gates green — **1249 vitest, tsc --noEmit clean, orchestrator 457, build OK**. The only non-node-observable artifact is the visual centering/bars at `/missile-command/`, which is the owner/reviewer screenshot per fleet convention.

**Remaining non-blocking note (accepted, not a follow-up):** `computeLetterbox` is exported+tested but unused in production — deliberate parity with battlezone's adapter shape.

**Specialist sign-off:**
- **[TEST]** reviewer-test-analyzer — clean: F4 CLOSED, the portrait vertical-bar test is genuinely used and non-vacuous (fails under a V-clamp mutant), no regression; 1249 pass.
- **[DOC]** reviewer-comment-analyzer — clean: no findings; the new test comments were verified accurate against `computeLetterbox`/`placeCursor`.
- **[RULE]** reviewer-rule-checker — clean: #26 RESOLVED, full 26-rule re-scan → zero violations, production verdicts stand (test-only delta).

**Approving. Routing to SM (Baldur) for finish.**