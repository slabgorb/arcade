---
story_id: "SH2-10"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-10: Extract @arcade/shared/view (browser) — resizeToDisplay + pure letterbox — and fold asteroids margin.ts + battlezone viewport.ts

## Story Details
- **ID:** SH2-10
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T00:53:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T00:09:42Z | 2026-07-11T00:11:37Z | 1m 55s |
| red | 2026-07-11T00:11:37Z | 2026-07-11T00:27:52Z | 16m 15s |
| green | 2026-07-11T00:27:52Z | 2026-07-11T00:42:28Z | 14m 36s |
| review | 2026-07-11T00:42:28Z | 2026-07-11T00:53:36Z | 11m 8s |
| finish | 2026-07-11T00:53:36Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): the `scale` field on `letterbox()` is required by AC-1 but its NORMALIZATION is undefined by the spec (unit-height vs unit-width). I pinned height-normalized (`width === scale × aspect`, `height === scale`) in `tests/view.test.ts`. Affects `arcade-shared/src/view.ts` (`letterbox` return) — Dev/Reviewer should ratify the normalization and document it in the module header; if width-normalized is preferred, exactly two assertions in the scale block flip. *Found by TEA during test design.*
- **Improvement** (non-blocking): I designed `resizeToDisplay(canvas, cssW, cssH, dpr)` to OWN the `Math.min(MAX_DPR, dpr || 1)` resolution (MAX_DPR=2), folding the identical cap+guard currently hand-written in tempest/star-wars/asteroids `main.ts` AND battlezone's `computeLetterbox`. Affects `arcade-shared/src/view.ts` — this is the reconciliation that removes the real duplication, so the raw `devicePixelRatio` is passed straight in. If Dev/Architect prefer a caller-resolved dpr or a separate `resolveDpr()` helper, the cap+guard must move there, NOT be lost (else HiDPI regresses on 3× displays and collapses on a 0/NaN dpr). *Found by TEA during test design.*
- **Gap** (non-blocking): asteroids `main.ts` today writes ONLY the backing store (`canvas.width/height`) and never `canvas.style` — it relies on CSS to fill the window. `resizeToDisplay` also sets `canvas.style.width/height` (per the AC: "sets the CSS size"). After migration asteroids will begin writing `style` = `${innerW}px`/`${innerH}px`. Affects `asteroids/src/main.ts` + its `index.html`/CSS — Dev must confirm this does not double-apply with existing canvas CSS (it is behaviour-equivalent only if the canvas already filled the window). *Found by TEA during test design.*
- **Improvement** (non-blocking): the per-game behaviour guard is each game's EXISTING resize/letterbox suite — `battlezone/tests/shell/viewport.test.ts` (computeLetterbox goldens) and `asteroids/tests/margin.test.ts` (marginRects/fitScale goldens). When Dev folds `viewport.ts`/`margin.ts` into shared, those suites' imports break; Dev must keep them green (re-point at `@arcade/shared/view` via a thin local wrapper, or migrate the tests). Combined with the cross-repo pin coupling in Context Notes, this is the migration's critical path. Affects `asteroids/`, `battlezone/`. *Found by TEA during test design.*

### Dev (implementation)
- **Correction** (non-blocking): TEA's Gap re: asteroids not setting `canvas.style` is stale — it came from a truncated grep. asteroids `main.ts` DID set BOTH `canvas.style.width` and `canvas.style.height` = `${innerW/H}px`, byte-identical to tempest/star-wars. So `resizeToDisplay` setting the CSS box is behaviour-preserving for all three fill games; no double-apply. Affects nothing — the concern is retired. *Found by Dev during implementation.*
- **Question** (non-blocking): implemented `letterbox().scale` as height-normalized (`scale = box.height`, so `width === scale × aspect`), per TEA's proposed contract. Documented in `arcade-shared/src/view.ts` LetterboxRect JSDoc. Affects `arcade-shared/src/view.ts` — Reviewer to ratify the normalization (echoes TEA's Question). *Found by Dev during implementation.*
- **Improvement** (blocking for finish/release): five feature branches are pushed and interlocked — `arcade-shared#feat/SH2-10-shared-view` plus each game pinning `github:slabgorb/arcade-shared#feat/SH2-10-shared-view`. Per [[sh-epic-release-coupling]]: merge arcade-shared FIRST, do NOT delete its feature branch, cut the next tag (v0.11.0), then bump each game's pin to that tag (`npm install @arcade/shared@github:...#v0.11.0` to force lockfile re-resolve) before/with the game merges. A game merged to develop while pinning a deleted branch will fail install. Affects all five repos' merge ordering. *Found by Dev during implementation.*
- **Improvement** (non-blocking): AC-3's "manual run at multiple window sizes" is not automatable here (five browser games). The automated proxy is strong — the shared `letterbox`/`resizeToDisplay` reproduce every previously-shipped, playtested golden in asteroids' `margin.test.ts` and battlezone's `viewport.test.ts` exactly — but a visual playtest (wide/tall/square windows, HiDPI) is still recommended at review/finish. Affects all four games. *Found by Dev during implementation.*

### Reviewer (code review)
- **Question** (non-blocking): `LetterboxRect.scale` is AC-mandated but `=== height` by construction, is UNCONSUMED by any game (asteroids uses `box.width/WORLD_W`, battlezone uses `box.width/height`), and its test is near-tautological. Affects `arcade-shared/src/view.ts` — Architect should ratify the height-vs-width normalization and either wire a consumer that recovers px-per-world-unit via `.scale` or accept it as reserved forward-looking API. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `resizeToDisplay` DPR guard is unit-tested only for `rawDpr === 0`, but its doc comment contracts `0 / NaN / undefined → 1×`; `letterbox`'s degenerate cases (`cssH === 0`, `letterbox(0,0)`, `letterbox(cw,0)`) are also untested despite the "exhaustive" header. Behaviour is verified correct (Reviewer probe: `NaN→1`, `letterbox(0,0)→zeros`, no NaN leak), so this is a test-hardening fast-follow, not a defect. Affects `arcade-shared/tests/view.test.ts` (add `NaN`/`undefined` dpr + zero-height/zero-container `letterbox` cases). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): tempest/star-wars `main.ts` `resize()` (now `resizeToDisplay(canvas, innerW, innerH, devicePixelRatio)`) has no unit guard — a positional arg swap would not be caught. This is a PRE-EXISTING gap (main.ts is not node-importable); asteroids/battlezone are guarded by their existing suites. Consider extracting a testable resize seam (mirroring battlezone's viewport.ts adapter) in a follow-up. Affects `tempest/`, `star-wars/`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, cleanup): the "PROPOSED — see finding" label in `arcade-shared/tests/view.test.ts` (the height-normalized scale test) is stale now that `view.ts`'s JSDoc states height-normalization as settled; a one-line test-description cleanup. Also, the pre-existing `Letterbox` (battlezone) and `Rect` (asteroids) interfaces lack `readonly` (unchanged context here) — candidates for a consistency pass now that the new sibling types are fully `readonly`. Affects `arcade-shared/tests/view.test.ts`, `battlezone/src/shell/viewport.ts`, `asteroids/src/shell/margin.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Per-game consumption tests deferred to shell/build verification**
  - Spec source: context-story-SH2-10.md, AC-2 ("all four games consume @arcade/shared/view at a pinned ref") + AC-3
  - Spec text: "asteroids' margin.ts and battlezone's viewport.ts are folded into the shared module … all four games consume @arcade/shared/view at a pinned ref" / "Each game's resize/letterbox behaviour is unchanged (manual run at multiple window sizes); vitest + vite build green."
  - Implementation: The authoritative failing tests live in `arcade-shared` (`tests/view.test.ts` + `tests/purity.test.ts`). I did NOT write per-game `main.ts` consumption greps in the four game repos. Behaviour-unchanged is instead pinned by the reconciliation oracles in `view.test.ts` (they reproduce asteroids' fitScale/marginX and battlezone's computeLetterbox goldens exactly), and per-game consumption is enforced by each game's existing resize/letterbox suite staying green + `vite build` green + the AC-3 manual run.
  - Rationale: AC-3 explicitly designates per-game behaviour as manual/shell-verified; the shared reconciliation oracles already math-guarantee no game regresses; brittle 4-repo source greps would couple to Dev's wiring structure and cannot even run until each game's `@arcade/shared` pin is re-pointed to a ref carrying `/view`.
  - Severity: minor
  - Forward impact: Dev + Reviewer verify consumption via `vite build` + each game's existing suite + the shell run; no automated "is main.ts wired" tripwire exists in the game repos.
- **`scale` normalization fixed by test (height-normalized)**
  - Spec source: context-story-SH2-10.md, AC-1
  - Spec text: "a pure letterbox(canvasW, canvasH, aspect) -> {x,y,width,height,scale}"
  - Implementation: The AC names `scale` but leaves its normalization open; `tests/view.test.ts` pins it height-normalized (`width === scale × aspect`, `height === scale`) plus contract-independent invariants (positive, finite, linear in container size).
  - Rationale: a required field with no pinned meaning is a near-vacuous test; height-normalization is self-consistent with the geometry and lets a game recover px-per-world-unit via `box.width / WORLD_W`.
  - Severity: minor
  - Forward impact: Reviewer ratifies; if width-normalization is chosen instead, two assertions flip (also logged as a Delivery Finding Question).
- **`resizeToDisplay` owns the DPR cap+guard (beyond the bare AC signature)**
  - Spec source: context-story-SH2-10.md, AC-1
  - Spec text: "resizeToDisplay(canvas, cssW, cssH, dpr) … sizes the backing store to DPR, sets the CSS size, returns the resolved ViewportSize"
  - Implementation: Tests require `resizeToDisplay` to resolve `Math.min(MAX_DPR, dpr || 1)` internally (MAX_DPR=2) rather than assume a pre-resolved dpr — folding the cap+guard duplicated across all four `main.ts` + battlezone's `computeLetterbox`.
  - Rationale: this is the extraction's whole point (kill the duplicated `Math.min(2, devicePixelRatio||1)`); "sizes the backing store to DPR" and "returns the resolved ViewportSize" read naturally as resolve-then-apply.
  - Severity: minor
  - Forward impact: if Dev prefers caller-resolved dpr, the cap+guard must relocate to a shared helper (not vanish); tests would move accordingly.

### Dev (implementation)
- **Retained `margin.ts` / `viewport.ts` as thin cabinet adapters (not deleted)**
  - Spec source: context-story-SH2-10.md, AC-2
  - Spec text: "asteroids' margin.ts and battlezone's viewport.ts are folded into the shared module (reconciled to one letterbox contract, or documented distinct modes)"
  - Implementation: The FIT MATH (the duplicated `Math.min(w/WORLD_W,h/WORLD_H)` / `computeLetterbox` aspect+DPR arithmetic) moved into `@arcade/shared/view`. `asteroids/src/shell/margin.ts` now derives `fitScale`/`marginRects` from the shared `letterbox`; `battlezone/src/shell/viewport.ts` is a thin adapter whose `computeLetterbox`/`applyLetterbox` delegate to shared `letterbox`+`resizeToDisplay`. Both local files remain (bar-geometry presentation for asteroids; `TARGET_ASPECT` + `Letterbox` bufferWidth/cssWidth vocabulary for battlezone).
  - Rationale: reconciles both games onto the ONE shared letterbox contract (the AC's primary option) while keeping each cabinet's own numbers/vocabulary and leaving `main.ts` + the per-frame projection + the bz2-1/A2-1 unit suites unchanged — the byte-exact behaviour-unchanged proof (AC-3). Matches epic SH2's "share the mechanism, keep the numbers" rule.
  - Severity: minor
  - Forward impact: asteroids/battlezone each keep a small local shim over `@arcade/shared/view`; a later story could delete them and inline shared calls at the few call sites if the shims are judged redundant.

### Reviewer (audit)
- **TEA: Per-game consumption tests deferred to shell/build** → ✓ ACCEPTED by Reviewer: sound layering. reviewer-test-analyzer independently verified asteroids `margin.test.ts` (18 tests) and battlezone `viewport.test.ts` (21 tests) pass unmodified against the refactored source using independent (non-`letterbox`-importing) oracles — they ARE real, non-circular regression guards. tempest/star-wars have no resize() unit guard, but that is a PRE-EXISTING gap (main.ts is not node-importable), not introduced here; AC-3 designates per-game behaviour as manual/shell-verified. See non-blocking finding below.
- **TEA: `scale` normalization fixed by test (height-normalized)** → ✓ ACCEPTED by Reviewer (with a flagged Question): the AC mandates a `scale` field and only `aspect` is available, so any value is single-axis-redundant; height-normalization is the conventional letterbox scale and is documented in the JSDoc. BUT reviewer-test-analyzer + reviewer-preflight both confirm `scale` is currently UNCONSUMED (asteroids uses `box.width/WORLD_W`, battlezone uses `box.width/height`) and its test is near-tautological (`scale := height` by construction). Not a defect — logged as a Question for the Architect. See finding below.
- **TEA: `resizeToDisplay` owns the DPR cap+guard** → ✓ ACCEPTED by Reviewer: this is the correct reconciliation — it removes the `Math.min(2, devicePixelRatio||1)` duplication from all four `main.ts` + battlezone's `computeLetterbox`. reviewer-rule-checker confirmed the `rawDpr || 1` is the sanctioned exception (not the #4 ||-vs-?? bug); reviewer-security confirmed MAX_DPR=2 bounds the backing store.
- **Dev: Retained `margin.ts` / `viewport.ts` as thin cabinet adapters** → ✓ ACCEPTED by Reviewer: the duplicated FIT MATH genuinely moved into `@arcade/shared/view`; the local files are now presentation (asteroids bars) / vocabulary adapter (battlezone Letterbox naming), leaving `main.ts` + the per-frame projection + the bz2-1/A2-1 suites unchanged — which IS the behaviour-unchanged proof (AC-3). Aligns with epic SH2's "share the mechanism, keep the numbers" rule.
- **Undocumented deviations:** none found. The `let dpr = 1` placeholder init in the three fill games is an implementation detail (immediately overwritten by `resize()`), not a spec deviation.

## Context Notes

This story extracts the DPR-resize + letterbox concern all four canvas games hand-roll. Key technical points:

- **Scope:** Extract @arcade/shared/view with two exports:
  1. `resizeToDisplay(canvas, cssW, cssH, dpr) -> ViewportSize` — sizes backing store to DPR, sets CSS size, returns resolved ViewportSize (DOM/browser path).
  2. `letterbox(canvasW, canvasH, aspect) -> {x,y,width,height,scale}` — pure math (node-testable), returns aspect-preserving rect + scale.

- **Reconciliation gate:** FIRST examine asteroids' margin.ts (~55 lines) and battlezone's viewport.ts (~97 lines) to confirm they reduce to ONE letterbox contract (or document distinct modes). This reconciliation unblocks the extraction.

- **Migration scope:** All four canvas games (tempest, asteroids, star-wars, battlezone) consume @arcade/shared/view at a pinned ref.

- **Testing:** pure letterbox gets node unit tests; resizeToDisplay is shell-verified (manual run at multiple window sizes).

- **Cross-repo coupling (SH epic release coupling):** This is a publish->consume @arcade/shared story. Consumers pin the arcade-shared FEATURE branch during dev inner-loop. When adding the new /view subpath, the arcade-shared pin each consumer game uses MUST be re-pointed to a ref that carries EVERY subpath that game already imports (font/highscore/loop/rng/glow/name-entry as applicable) PLUS the new /view — otherwise tsc goes red before the story starts. Changing a github:#ref pin then running plain `npm install` keeps the OLD commit — must run `npm install @arcade/shared@github:...#<ref>` to force re-resolve the lockfile. Do NOT delete the arcade-shared feature branch on merge (use --no-delete-branch); consumers pin it until a vX.Y.Z tag is cut and pins are bumped. v0.10.0 was the last complete tag (carried glow).

## Acceptance Criteria

- @arcade/shared/view exports resizeToDisplay(canvas, cssW, cssH, dpr) -> ViewportSize and a pure letterbox(canvasW, canvasH, aspect) -> {x,y,width,height,scale}; letterbox has node unit tests for the aspect math.
- asteroids' margin.ts and battlezone's viewport.ts are folded into the shared module (reconciled to one letterbox contract, or documented distinct modes); all four games consume @arcade/shared/view at a pinned ref.
- Each game's resize/letterbox behaviour is unchanged (manual run at multiple window sizes); vitest + vite build green.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New shared-library surface (@arcade/shared/view) with pure aspect-fit math + a DOM-seam contract; AC-1 explicitly mandates node unit tests for the letterbox math.

**Test Files:**
- `arcade-shared/tests/view.test.ts` (new) — the full contract + reconciliation:
  - **AC-1 letterbox aspect math** — pillarbox / letterbox / exact-fit goldens, an independent `fitBox` oracle across a size×aspect sweep, aspect-preservation, maximal-fit + centering invariants, purity (fresh object each call).
  - **`scale` field** — positive/finite, linear-in-container, and the proposed height-normalized relation (`width === scale × aspect`).
  - **`resizeToDisplay` DOM seam** — DPR-scaled backing store, CSS box = css size given, MAX_DPR=2 cap, `rawDpr || 1` guard, fractional-dpr, floor-to-whole-pixels, ViewportSize return consistency, zero-container NaN guard (fake-canvas duck type, node env).
  - **Reconciliation (AC-2/AC-3)** — oracles that reproduce asteroids' `fitScale`/`marginX` (world 8192×6144) and battlezone's `computeLetterbox` cssWidth/cssHeight + bufferWidth/Height goldens exactly, proving one letterbox contract serves both and the fold changes no game's numbers.
  - **src/view.ts hygiene** — exists + no `as any`/`@ts-ignore`.
- `arcade-shared/tests/purity.test.ts` (edited) — `view` added to `BROWSER_SUBPATHS`; new SH2-10 block asserts browser classification (never policed as pure), `exports["./view"]` → `dist/view.js` + `.d.ts`, and `dist/view.js` is built.

**Tests Written:** 28 failing tests (25 in view.test.ts, 3 in purity.test.ts) covering 3 ACs.
**Status:** RED (verified via testing-runner: 28 failed / 259 passed; all failures are `Cannot find module '../src/view'` / missing dist / missing export — no pre-existing test regressed).

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `src/view.ts … uses no \`as any\` and no @ts-ignore` | failing (RED) |
| #4 `x \|\| default` with valid-falsy | `resizeToDisplay … falls back to dpr 1 when rawDpr is 0 or falsy` (sanctioned `rawDpr\|\|1`) | failing (RED) |
| #5 module/declaration emit | purity `exports["./view"]` → dist ESM + `.d.ts` | failing (RED) |
| #8 test quality | self-check below (no vacuous assertions in new files) | pass |
| degenerate-input robustness | `resizeToDisplay … does not leak NaN when the container collapses to zero` | failing (RED) |

**Rules checked:** 4 of the directly-applicable TS lang-review rules (#1, #4, #5, #8) have coverage; #2/#3/#6/#7/#10/#11/#12 are N/A for a pure-geometry + canvas-sizing leaf module (no enums, JSX, async, user-input, or error-handling surface).
**Self-check:** 0 vacuous tests found in the new files. Every assertion checks a concrete value or invariant. The one classification assertion (`view ∈ BROWSER_SUBPATHS`) is an intentional design-guard mirroring the shipped glow/pause pattern — it fails if `view` is ever reclassified as pure, so it is not vacuous.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement `arcade-shared/src/view.ts` + the `./view` export, build, then fold `margin.ts`/`viewport.ts` and migrate the four games (mind the cross-repo pin coupling in Context Notes and the four Delivery Findings).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `arcade-shared/src/view.ts` (new) — `letterbox` (pure aspect-fit rect + scale), `resizeToDisplay` (DOM seam owning the `Math.min(2, dpr||1)` cap+guard + whole-pixel backing store), `MAX_DPR`, and the `LetterboxRect`/`ViewportSize`/`CanvasLike` types.
- `arcade-shared/package.json` — added the `./view` browser subpath export.
- `tempest/src/main.ts`, `star-wars/src/main.ts` — resize() now calls `resizeToDisplay` (fill model); pin → `#feat/SH2-10-shared-view`.
- `asteroids/src/main.ts` — resize() → `resizeToDisplay`; `asteroids/src/shell/margin.ts` — `fitScale`/`marginRects` derive from the shared `letterbox`; pin bumped.
- `battlezone/src/shell/viewport.ts` — thin adapter delegating `computeLetterbox`/`applyLetterbox` to shared `letterbox`+`resizeToDisplay` (main.ts unchanged); pin bumped.

**Reconciliation:** one shared `letterbox` contract serves both consumers — asteroids draws its margin bars as container − rect; battlezone sizes its canvas element to the rect. The fill games (tempest/star-wars/asteroids) share `resizeToDisplay`. No "distinct modes" were needed.

**Tests:** GREEN everywhere —
- arcade-shared: 287 passed / 0 failed (the 28 RED view/purity tests now pass; `tsc` build clean; `dist/view.{js,d.ts}` emitted).
- tempest 769 / star-wars 609 / asteroids 816 / battlezone 784 — all passed, 0 failed. asteroids `margin.test.ts` + battlezone `viewport.test.ts` reproduce every golden unchanged.
- `npm run build` (tsc --noEmit && vite build) green in all four games.

**Branches (pushed, NOT merged):**
- `arcade-shared` @ `feat/SH2-10-shared-view` (66d4f0a)
- `tempest` (61b1831), `star-wars` (0eeda52), `asteroids` (75a0858), `battlezone` (661c937) — each @ `feat/SH2-10-shared-view`, pinning the arcade-shared feature branch.

**Release coupling (read before finish):** merge arcade-shared first; keep its feature branch; cut the next tag; bump each game's pin to the tag before merging the games. See the blocking Dev Delivery Finding + Context Notes.

**Handoff:** To Reviewer (Immortan Joe) for code review across the 5 repos.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | success (all 5 repos build+test GREEN, 3265 tests, 0 fail) | 3 observations | confirmed 3 (all non-blocking), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped — disabled | N/A | Disabled via settings — boundary analysis performed by Reviewer directly |
| 3 | reviewer-silent-failure-hunter | No | Skipped — disabled | N/A | Disabled via settings — no error/catch surface (pure math + duck-typed writes); assessed by Reviewer |
| 4 | reviewer-test-analyzer | Yes | findings | 8 | confirmed 8 (all non-blocking test-quality), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped — disabled | N/A | Disabled via settings — comment accuracy assessed by Reviewer (one stale label found) |
| 6 | reviewer-type-design | No | Skipped — disabled | N/A | Disabled via settings — type invariants covered by reviewer-rule-checker (#2/#23) + Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped — disabled | N/A | Disabled via settings — complexity/dead-code assessed by Reviewer (scale-field redundancy noted) |
| 9 | reviewer-rule-checker | Yes | clean (25 rules / 61 instances / 0 violations) | none | N/A |

**All received:** Yes (4 enabled subagents returned; 5 disabled via `workflow.reviewer_subagents` settings)
**Total findings:** 11 confirmed (all non-blocking Low/Medium), 0 dismissed, 0 deferred, 0 Critical/High

## Rule Compliance

Exhaustively verified by reviewer-rule-checker (25 rules, 61 instances, **0 violations**) and independently spot-checked by Reviewer. Mapping to the TS lang-review checklist:

- **#1 type-safety escapes** — COMPLIANT. No `as any`/`@ts-ignore`/non-null-`!`/type-predicate in `view.ts`, `viewport.ts`, `margin.ts`, or the three `main.ts` changes. (The pre-existing `as HTMLCanvasElement`/`getContext('2d')!` in main.ts are untouched context.) view.test.ts even mechanically asserts view.ts is escape-free.
- **#2 generic/interface + readonly** — COMPLIANT. `LetterboxRect` and `ViewportSize` are fully `readonly`; `CanvasLike` is intentionally NOT readonly (it is the mutated seam). No `Record<string,any>`/`object`/`Function` types.
- **#4 null/undefined (`||` vs `??`)** — COMPLIANT. The only `||`-on-falsy is `rawDpr || 1` (view.ts:140 + battlezone computeLetterbox) — the sanctioned exception (0/NaN/undefined dpr is invalid, not valid-falsy), documented in the JSDoc. Not the #4 bug.
- **#5 module/declaration (verbatimModuleSyntax)** — COMPLIANT. battlezone viewport.ts uses inline `type CanvasLike as SharedCanvasLike` import and `export type CanvasLike` re-export; value imports (`letterbox`/`resizeToDisplay`/`MAX_DPR`) are un-prefixed. view.ts has zero relative imports (`.js`-extension rule vacuous).
- **#8 test quality** — COMPLIANT (no vacuous matchers, no `.only`/`.skip`, imports from `src/` not `dist/`). See [TEST] findings for tautology/coverage refinements (non-blocking).
- **#9 build/config** — COMPLIANT. `strict`/`verbatimModuleSyntax` intact; `exports["./view"]` mirrors every sibling subpath; dist/view.{js,d.ts} emitted.
- **#10/#11 security/error-handling** — N/A (browser-provided numerics, no user input, no catch/Result surface).
- **ADR-0003 purity charter** — COMPLIANT. `view` correctly classified BROWSER (never in PURE_SUBPATHS); view.ts + dist/view.js reference no live DOM global (`canvas` is a duck-typed parameter name). reviewer-security independently grepped and confirmed.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A clean, well-scoped extraction. The DPR-resize + letterbox concern that four cabinets hand-rolled is now single-sourced in `@arcade/shared/view`; the duplicated `Math.min(2, devicePixelRatio||1)` cap+guard is folded into `resizeToDisplay`. One `letterbox` contract serves both geometry consumers (asteroids draws bars as container − rect; battlezone sizes its element to the rect) with no "distinct modes" needed. 3265 tests pass across five repos, all builds green, rules clean, security clean. No Critical or High findings survived scrutiny.

**Data flow traced:** `window.innerWidth`/`innerHeight`/`devicePixelRatio` → `resizeToDisplay(canvas, cssW, cssH, rawDpr)` → `dpr = min(2, rawDpr||1)` → `canvas.width/height = floor(css*dpr)` (whole pixels) + `canvas.style = ${css}px`. Safe: inputs are browser-provided numerics (not user-injectable), `dpr` is bounded by MAX_DPR=2, template literals interpolate `number`s only (no CSS-injection surface — [SEC] confirmed).

**Pattern observed:** epic SH2's "share the mechanism, keep the numbers" — the shared verb (fit math + resize) lives in arcade-shared; per-cabinet numbers/vocabulary (battlezone `TARGET_ASPECT`+`Letterbox`, asteroids margin bars) stay local as thin adapters. `arcade-shared/src/view.ts:79` (`letterbox`) and `battlezone/src/shell/viewport.ts:56` (`computeLetterbox` adapter).

**Error handling / boundaries:** degenerate inputs return safe values, not NaN — `resizeToDisplay(c,0,800,1)→width 0`; `NaN/undefined/0 dpr → 1×` (Reviewer probe confirmed); `letterbox(0,0,4/3)→zeros`. Negative dpr / NaN aspect produce garbage but are unreachable (devicePixelRatio ≥ 0; aspect is a positive constant).

**Findings (all NON-BLOCKING — Medium/Low; none block the PR):**
- `[SEC]` reviewer-security: clean — no DOM misuse, no prototype pollution, MAX_DPR bounds resource use, no DOM-global leak, `rawDpr||1` sanctioned. Verified good.
- `[RULE]` reviewer-rule-checker: clean — 25 rules / 61 instances / 0 violations (readonly, verbatimModuleSyntax, sanctioned `||`, purity all compliant). Verified good.
- `[TEST]` `LetterboxRect.scale` is `=== height` by construction, UNCONSUMED by any game, and its test is near-tautological — AC-mandated field; logged as a Question for the Architect at `arcade-shared/src/view.ts:68,97`.
- `[TEST]` DPR guard tested only for `0`, not `NaN`/`undefined` (behaviour verified correct); degenerate `letterbox` (`cssH=0`, `letterbox(0,0)/(cw,0)`) untested despite "exhaustive" header — test-hardening fast-follow at `arcade-shared/tests/view.test.ts:244,282`.
- `[TEST]` the sweep-oracle `fitBox` (view.test.ts:57) echoes the impl's branch structure — mitigated by independent literal goldens + the genuinely-independent reconciliation oracles (test-analyzer verified asteroids/battlezone suites are real, non-circular guards).
- `[TEST]` tempest/star-wars `resize()` has no unit guard — PRE-EXISTING gap (main.ts not node-importable); asteroids/battlezone are guarded; AC-3 makes per-game behaviour manual/shell-verified.
- `[EDGE]` (edge-hunter disabled — covered by Reviewer): negative `rawDpr` (`-1||1=-1`) and NaN `aspect` produce garbage but cannot occur (browser `devicePixelRatio` ≥ 0; `aspect` = `4/3` or `WORLD_W/WORLD_H`, positive consts). Reachable invalids (0/NaN/undefined dpr) are guarded. No worse than pre-extraction code.
- `[SILENT]` (silent-failure-hunter disabled — covered by Reviewer): no error-swallowing surface — pure arithmetic + duck-typed property writes, no catch/try/`.catch()`. Verified good.
- `[DOC]` (comment-analyzer disabled — covered by Reviewer): comments are accurate and generous EXCEPT one stale "PROPOSED — see finding" test label (view.test.ts, height-normalized scale test) now that the JSDoc states height-normalization as settled — 1-line cleanup.
- `[TYPE]` (type-design disabled — covered by Reviewer + rule-checker): types are sound — full `readonly` on returns, `CanvasLike` correctly mutable, verbatimModuleSyntax-conformant. Pre-existing `Letterbox`/`Rect` interfaces lack `readonly` (unchanged context) — consistency-cleanup candidate. The `scale` field type is the one open Question (above).
- `[SIMPLE]` (simplifier disabled — covered by Reviewer): no dead code (view.ts fully consumed except the AC-mandated `scale`); the purity.test view block + classification test mirror the shipped esc-overlay/glow tautological/copy-paste pattern (`it.each(BROWSER_SUBPATHS)` could parameterize) — consistent with codebase, low value.

### Devil's Advocate

Argue this is broken. First attack: the whole story claims "behaviour unchanged," but I only have arcade-shared unit tests and two games' pre-existing suites — no browser ran. Could a wide-monitor user see a smeared canvas? For asteroids/battlezone, no: their existing `margin.test.ts`/`viewport.test.ts` pin the exact pre-migration goldens and pass unmodified against the refactored source — the fit math is algebraically identical (rule-checker + test-analyzer both traced it). For tempest/star-wars the change is a mechanical 1:1 swap of an inline block for `resizeToDisplay` with the same arguments in the same order — but here is the real soft spot: nothing unit-tests that wiring, so a transposed `innerWidth`/`innerHeight` would ship silently. I read the diff line-by-line (combined.diff:670-673, 746-749) and confirmed the argument order is `(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` in both — correct — but it rests on my eyes, not a test. That is why AC-3 mandates a manual multi-window playtest, and why I logged the missing-guard follow-up. Second attack: `scale === height` — is this a lie that will bite a future consumer? It is documented as height-normalized and no one consumes it today, so it cannot currently mislead; the risk is deferred, and I flagged it to the Architect. Third attack: the feature-branch dependency pin — could a fresh install break? The lockfiles pin an immutable SHA (`66d4f0a`), so installs are reproducible; the real hazard is merge-ordering (a game merged before arcade-shared cuts a tag, or after the branch is deleted), which Dev flagged blocking-for-finish. Fourth: resource exhaustion via a giant window — MAX_DPR caps the multiplier and the browser caps canvas size; no new DoS. Fifth: a stressed/headless env where `devicePixelRatio` is `undefined` — the `|| 1` guard degrades to 1×, verified. Nothing here corrupts data or crashes; the residue is test-completeness and one speculative field, all non-blocking.

**Observations (≥5):**
1. `[VERIFIED]` duplication genuinely removed — the `Math.min(2, devicePixelRatio||1)` cap+guard is deleted from all four `main.ts` + battlezone `computeLetterbox` and single-sourced in `resizeToDisplay` (view.ts:140). Rule #4 compliant.
2. `[VERIFIED]` purity classification is load-bearing and correct — `view` ∈ BROWSER_SUBPATHS (purity.test.ts:161); view.ts's `canvas` param name would trip the `\bcanvas\b` guard if it were pure, so browser-classification is required, not cosmetic. [SEC] grep-confirmed no live DOM global.
3. `[VERIFIED]` reconciliation is real, not illusory — asteroids `margin.test.ts` (18) + battlezone `viewport.test.ts` (21) pass unmodified against refactored source using independent oracles ([TEST]-confirmed non-circular). This is the AC-3 behaviour-unchanged proof at the math level.
4. `[MEDIUM]` `scale` field is AC-mandated but redundant/unconsumed/tautologically-tested — Question for Architect (view.ts:68).
5. `[MEDIUM]` guard-coverage gaps (NaN/undefined dpr, degenerate letterbox, tempest/star-wars resize) — behaviour verified correct; test-hardening fast-follows.
6. `[LOW]` stale "PROPOSED" test label + pre-existing non-`readonly` `Letterbox`/`Rect` interfaces — cleanup candidates.
7. `[INFO]` feature-branch pin (immutable SHA in lockfiles) → must bump to a `vX.Y.Z` tag with correct merge ordering at finish (Dev's blocking-for-release finding).

**Handoff:** To SM (The Organic Mechanic) for finish-story. Heed the blocking-for-release ordering: merge arcade-shared first, keep its feature branch, cut the tag, bump each game's pin to the tag, then merge the games.

## SM Assessment

(To be completed at story finish.)