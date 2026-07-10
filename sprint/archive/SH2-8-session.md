---
story_id: "SH2-8"
jira_key: "SH2-8"
epic: "SH2"
workflow: "tdd"
---
# Story SH2-8: Extract @arcade/shared/glow (browser subpath) — withGlow + glowPolyline superset — and migrate the three flat games

## Story Details
- **ID:** SH2-8
- **Jira Key:** SH2-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/SH2-8-glow-browser-subpath)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T19:30:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T16:58:43Z | 2026-07-10T17:01:45Z | 3m 2s |
| red | 2026-07-10T17:01:45Z | 2026-07-10T18:53:43Z | 1h 51m |
| green | 2026-07-10T18:53:43Z | 2026-07-10T19:20:21Z | 26m 38s |
| review | 2026-07-10T19:20:21Z | 2026-07-10T19:30:53Z | 10m 32s |
| finish | 2026-07-10T19:30:53Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): star-wars' `glowLine` wraps its stroke in `ctx.save()/restore()` + `globalCompositeOperation = 'lighter'` (additive glow), but the shared `withGlow` is deliberately save/restore-free with no compositing. Affects `star-wars/src/shell/render.ts` (glowLine, ~L800) — Dev must decide whether star-wars keeps a 'lighter' envelope around the shared call or the glow superset grows a composite option; the adoption test does NOT pin this. *Found by TEA during test design.*
- **Improvement** (non-blocking): all three games' develop pins `@arcade/shared` at a BRANCH (`#feat/SH2-13-keyboard-highscore-entry`), not a version tag — the consumption model requires a version-pinned TAG. Affects `{asteroids,star-wars,battlezone}/package.json` — Dev's GREEN pin-bump should move each game to the glow-publishing TAG (e.g. `#vX.Y.Z`), not another branch. *Found by TEA during test design.*
- **Improvement** (non-blocking): battlezone's `drawSegments` strokes MANY disjoint segments in a single path (not one polyline), so it likely migrates to `withGlow` wrapping the segment loop rather than `glowPolyline`. Affects `battlezone/src/shell/render.ts` (drawSegments, ~L80). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (blocking for a clean release, non-blocking for this story): arcade-shared `develop` lags reality — BOTH `name-entry` (SH2-13) and `glow` (SH2-8) live only on feature branches, never merged to `develop`, and the runtime `SHARED_VERSION` (index.ts, `'0.8.0'`) lags `package.json` (`'0.9.0'`). Affects `arcade-shared` — a consolidation is needed: land both subpaths on `develop`, sync `SHARED_VERSION`, cut a release **tag**, then repin all games off the feature branches onto the tag. *Found by Dev during implementation.*
- **Gap** (non-blocking): star-wars' scattered inline HUD **text** glow (drawHudHeader / drawTrenchBanners / drawShieldMeter / drawHighScoreBoard) was NOT routed through the shared primitive — only the 3D wireframe polygons (drawWireframe) + the HUD frame lines (glowLine) were. Those text sites already reset shadowBlur correctly (no footgun) and there is no single text helper to migrate. Affects `star-wars/src/shell/render.ts`. asteroids + battlezone DID migrate their `drawText`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (blocking for a clean finish/merge, non-blocking for correctness): the arcade-shared `feat/SH2-8-glow-browser-subpath` branch carries SH2-13's name-entry commits (merge `17c7463`), so the eventual arcade-shared PR diff spans two stories, and all three games pin the *feature branch* rather than a released tag. SM must reconcile at finish — land name-entry + glow on arcade-shared `develop` (git dedups via the shared merge history), sync `SHARED_VERSION`, cut a release tag, and repin the games to the tag. Affects `arcade-shared` + `{asteroids,star-wars,battlezone}/package.json`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-2 tested at the cross-repo contract altitude, not via behavioural render tests**
  - Spec source: context-story-SH2-8.md, AC-2
  - Spec text: "asteroids, star-wars, and battlezone stroke their polygons (and stroke-text from SH2-4/5/6) via the shared primitive at a pinned ref; per-cabinet constants remain in each game."
  - Implementation: each game's `tests/glow-adoption.test.ts` asserts (a) a src module imports `@arcade/shared/glow`, (b) the pinned `@arcade/shared` resolves `./glow` exporting `withGlow` + `glowPolyline`, and (c) the per-cabinet constant remains — rather than driving each game's render loop and observing the shadowBlur reset.
  - Rationale: the three games have heterogeneous stroke internals (strokePoly / drawSegments / glowLine, one using 'lighter' compositing); a behavioural render assertion would couple to per-game mechanics and is heavy for the 3D cabinets. The games' existing render suites keep behaviour honest post-migration (AC-2's "vitest + vite build green"), mirroring the SH2-12 consumer-adoption precedent.
  - Severity: minor
  - Forward impact: AC-2's behavioural proof rests on each game's existing render tests staying green after Dev's migration; the three adoption files are collection-gated until the `./glow` subpath resolves at a bumped pin.

### Dev (implementation)
- **Merged the SH2-13 (name-entry) arcade-shared branch into the SH2-8 glow branch**
  - Spec source: session scope (SH2-8 = glow only) + arcade-shared consumption model
  - Spec text: "Extract @arcade/shared/glow … and migrate the three flat games"
  - Implementation: merged `origin/feat/SH2-13-keyboard-highscore-entry` into `feat/SH2-8-glow-browser-subpath` so a single arcade-shared ref carries BOTH `/glow` and `/name-entry`
  - Rationale: SH2-13's `name-entry` subpath was never merged to arcade-shared `develop`; the games consume it via the SH2-13 branch pin. Repinning to the glow branch (cut from develop) would have dropped `/name-entry` and regressed each game's name-entry-resolution tests. Merging is the minimal way to give the games one ref with both subpaths.
  - Severity: minor (branch entanglement, fully reversible — feature branch only)
  - Forward impact: SH2-8's branch/PR carries SH2-13's name-entry commits; the proper fix (see Delivery Findings) is landing both on arcade-shared develop + a release tag, then repin.
- **Pinned the games to the arcade-shared FEATURE BRANCH, not a version tag**
  - Spec source: arcade-shared consumption model (version-pinned git-URL TAG)
  - Spec text: "consumed … as a version-pinned git-URL dependency"
  - Implementation: pinned each game's `@arcade/shared` to `#feat/SH2-8-glow-browser-subpath`
  - Rationale: matches the established in-flight pattern (the games were already pinned to `#feat/SH2-13-…`); cutting a real tag requires the outward-facing `just release` (main merge → R2 deploy), which is out of GREEN scope and needs explicit sign-off.
  - Severity: minor
  - Forward impact: a follow-up release must retag arcade-shared and repin the games onto the tag (AC-2's "pinned ref" is satisfied by the branch pin for now).
- **star-wars text strokes not migrated (asymmetry with asteroids/battlezone)**
  - Spec source: context-story-SH2-8.md, AC-2
  - Spec text: "stroke their polygons (and stroke-text from SH2-4/5/6) via the shared primitive"
  - Implementation: star-wars migrated the 3D polygon stroker (drawWireframe) + HUD frame lines (glowLine) only; its inline HUD text glow stayed hand-written. asteroids + battlezone migrated both polygons and text.
  - Rationale: star-wars has no single text helper (text is stroked inline across several HUD functions) and those sites already reset shadowBlur (no footgun); migrating them is a larger, riskier sweep beyond the "polygons" core.
  - Severity: minor
  - Forward impact: full star-wars HUD-text convergence is a follow-up.

### Reviewer (audit)
- **TEA: AC-2 tested at the cross-repo contract altitude, not via behavioural render tests** → ✓ ACCEPTED by Reviewer: the src-import + subpath-resolution + constant-retention trio is the right altitude for a shared-primitive adoption; the games' existing render suites (all green: 815/784/609) exercise the migrated draw paths and keep behaviour honest. Sound.
- **Dev: Merged the SH2-13 (name-entry) arcade-shared branch into the SH2-8 glow branch** → ✓ ACCEPTED by Reviewer: given SH2-13's name-entry was never landed on arcade-shared develop and the games consume it via branch pin, merging is the minimal way to give the games one ref carrying both subpaths without regressing name-entry. The entanglement is real but reversible; reconciliation is captured as a Reviewer Delivery Finding for SM's finish.
- **Dev: Pinned the games to the arcade-shared FEATURE BRANCH, not a version tag** → ✓ ACCEPTED by Reviewer: matches the established in-flight pattern (games were already on `#feat/SH2-13-…`); AC-2's "pinned ref" is satisfied. A release/retag is the correct follow-up (flagged for finish), and a real `just release` (main→R2 deploy) rightly stayed out of GREEN scope.
- **Dev: star-wars text strokes not migrated (asymmetry with asteroids/battlezone)** → ✓ ACCEPTED by Reviewer: AC-2's "polygons" are fully covered (drawWireframe routes every 3D model through the primitive); star-wars' inline HUD-text sites already reset shadowBlur (no footgun), so leaving them is not a defect — convergence is a reasonable follow-up.
- No undocumented deviations found: I diffed every migrated function against its original and confirmed the ctx-state and path-op semantics are preserved (star-wars glowLine keeps its 'lighter'+save/restore+post-restore-reset; drawWireframe/drawSegments fold the trailing reset into withGlow; asteroids debris keeps globalAlpha isolated).

## Sm Assessment

**Story:** Extract `@arcade/shared/glow` — the first BROWSER subpath — and migrate the three flat games (asteroids, star-wars, battlezone) onto it. 5 points, TDD, phased workflow.

**Scope (three acceptance criteria):**
1. `@arcade/shared/glow` exports `GlowStyle`, `withGlow(ctx, style, draw)`, and `glowPolyline(ctx, pts, style, close?)`. A fake-ctx test must assert the state-set sequence AND that `shadowBlur` is reset to 0 after each call (the footgun every game hand-writes).
2. asteroids, star-wars, battlezone stroke their polygons + stroke-text (from SH2-4/5/6) via the shared primitive at a **pinned ref**; per-cabinet blur/width constants stay in each game.
3. The purity guard recognises `glow` as a browser subpath (exempt) while the pure core stays DOM-free; each game's vitest + vite build are green.

**Routing:** Phased TDD → hand off to TEA (Han Solo) for the RED phase. TEA writes the failing fake-ctx test for the glow primitive first; per the tempo, the glow-state-sequence + shadowBlur-reset assertion is the heart of AC-1 and the natural first red test.

**Technical hazards the downstream agents MUST heed (documented in context-story-SH2-8.md):**
- **ESM `.js` extension rule (Rule #5, critical):** any browser subpath file importing a sibling must write the explicit `.js` extension (e.g. `from './style.js'`). tsc bundler-resolution compiles without it; the shipped ESM artifact then fails native Node ESM (Vite hides the failure). This bit SH2-12 and will bite here.
- **Consumption model:** games pin `@arcade/shared` as a version-pinned git-URL TAG in node_modules, not a local working copy. Adopting the new `/glow` subpath needs publish → bump the tag in each game's package.json → reinstall. AC-2's "pinned ref" is not optional.
- **Purity guard** must be extended to exempt `glow` as a browser subpath before the games' builds go green.

**Design constraints:** deliberately NO `ctx.save/restore` (mirrors existing per-frame code); `GlowStyle.stroke` accepts `string | CanvasGradient`.

**Risk:** four-repo blast radius. The library change gates the three game migrations. Sequence: build+test the primitive in arcade-shared, publish/bump, then migrate each game. Verdict: proceed to RED.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev / Yoda)

**Test Files (5 artifacts across 4 repos):**
- `arcade-shared/tests/glow.test.ts` (NEW) — the AC-1 fake-ctx contract. `withGlow`: sets strokeStyle/lineWidth/shadowColor/shadowBlur from the style; runs the draw exactly once; glow is ACTIVE during the draw (shadowBlur === blur at draw time) then RESET to 0 after (ordered: blur-on before draw, blur-off after); shadowColor defaults to `stroke` when `color` omitted; a `CanvasGradient` stroke keeps shadowColor a plain colour; NO save/restore. `glowPolyline`: moveTo first point + lineTo the rest in order; applies the style + resets shadowBlur to 0; strokes WITH the glow radius; no closePath by default, closePath before stroke when `close=true`; single-point and empty-list edge cases don't throw. Observed with a recording-Proxy ctx (esc-overlay / bz2-5 precedent).
- `arcade-shared/tests/glow-source-rules.test.ts` (NEW) — TS lang-review #1 (no `as any`/`as unknown as`/`@ts-ignore`), #5 (every relative import carries an explicit `.js` extension — the native-ESM footgun that bit SH2-12), #2 (withGlow's draw is `() => void`, not a bare `Function`).
- `arcade-shared/tests/purity.test.ts` (EXTENDED) — `glow` registered as a BROWSER subpath (canvas-exempt, never pure); the existing "every browser subpath is built" check now also polices glow; `exports["./glow"]` → `./dist/glow.js` + `.d.ts`; dist/glow.js built.
- `asteroids` / `star-wars` / `battlezone` `tests/glow-adoption.test.ts` (NEW ×3) — AC-2: a src module imports `@arcade/shared/glow`; the pinned `@arcade/shared` resolves `./glow` exporting `withGlow` + `glowPolyline` (collection-gated — the current pin predates the subpath); the per-cabinet constant stays local (asteroids `GLOW_BLUR=8`/`LINE_WIDTH=2`, battlezone `GLOW_GREEN`, star-wars cockpit-cyan `GLOW`).

**Tests Written:** 21 failing in arcade-shared (glow 15, source-rules 3, purity 3) + 3 collection-gated adoption files (one per game).
**RED verification (via testing-runner ×2):**
- arcade-shared: 21 fail for missing `src/glow.ts` / missing `exports["./glow"]` / unbuilt `dist/glow.js`; the other 10 files (192 tests) pass; tsc pretest clean.
- games: each repo fails ONLY its `glow-adoption.test.ts` (collection-gated on `"./glow" is not exported … from @arcade/shared`); 2198 pre-existing tests pass across the three — **zero regressions**, and the freshly-reinstalled SH2-13 name-entry suites are green.

### Repo hygiene fixed (per Jedi's request)
The three game repos were stranded on the stale `feat/SH2-12-shared-esc-overlay` branch, 2 commits behind `origin/develop`, with a `v0.7.0` install. Fixed: fast-forwarded each to `origin/develop` (`v0.0.3`), deleted the stale branch (no unique commits), cut fresh `feat/SH2-8-glow-browser-subpath`, and `npm install`ed so `node_modules` matches the develop pin. All four repos are now on `feat/SH2-8-glow-browser-subpath`.

### Rule Coverage (typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | glow-source-rules: no `as any`/`as unknown as`/`@ts-ignore` | failing (RED) |
| #2 specific signatures / `readonly` | glow-source-rules: no bare `Function` draw; glow.test pins `pts` as `readonly [number,number][]` + the `GlowStyle` shape | failing (RED) |
| #5 `.js` extension on ESM imports | glow-source-rules: every relative import ends in `.js` | failing (RED) |
| #8 test quality (meaningful assertions) | self-checked all 24 tests: concrete expected values, no `let _ =`, no `assert(true)`, no is-Some-on-always-None | pass (self-check) |
| ADR-0003 purity (project rule) | purity: glow browser-exempt, never in the pure set | failing (RED) |

**Rules checked:** 4 applicable lang-review rules + ADR-0003 have coverage (React #6, async #7, security #10 N/A — no JSX, canvas-only, no user-input boundary).
**Self-check:** 0 vacuous tests. The `as unknown as CanvasRenderingContext2D` cast on the recording Proxy is the sanctioned test-only ctx pattern (esc-overlay / bz2-5 precedent), not a production type escape — the source-rules guard forbids it in `src/glow.ts`, not in tests.

### GREEN sequencing for Dev (Yoda) — order matters (four-repo blast radius)
1. `arcade-shared`: create `src/glow.ts` (`GlowStyle`, `withGlow`, `glowPolyline`) — **any sibling import must use an explicit `.js` extension**; no `save/restore`; `GlowStyle.stroke: string | CanvasGradient`, separate `color?` for shadowColor. Add `exports["./glow"]` → dist. `npm run build` → turns the 21 arcade-shared RED green.
2. Publish/release a new `@arcade/shared` **tag** carrying `/glow`.
3. Per game: bump the `@arcade/shared` pin to that TAG (off the SH2-13 branch — see Delivery Findings), `npm install`, then migrate the stroker (`strokePoly`/`drawSegments`/`glowLine`) onto the shared primitive keeping per-cabinet constants, and add the src import → turns each game's adoption file green.
4. Each game: `vitest` + `vite build` green (AC-2's behavioural proof).

**Handoff:** To Dev (Yoda) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** all GREEN across 4 repos — arcade-shared 213/213, asteroids 815/815, battlezone 784/784, star-wars 609/609. Every repo's `vite build` (tsc + vite) is clean.
**Branches (all pushed):** `feat/SH2-8-glow-browser-subpath` in arcade-shared, asteroids, battlezone, star-wars.

**Files Changed:**
- `arcade-shared/src/glow.ts` (NEW) — the primitive: `GlowStyle { stroke: string | CanvasGradient; width; blur; color? }`, `withGlow(ctx, style, draw)` (set strokeStyle/lineWidth/shadowColor/shadowBlur → run draw → reset shadowBlur to 0; shadowColor defaults to `stroke` for a string, uses `color` for a gradient; no save/restore), `glowPolyline(ctx, pts, style, close?)` (moveTo/lineTo/optional-closePath/stroke inside withGlow; empty-list no-op).
- `arcade-shared/package.json` — `exports["./glow"]` → dist. (Merge also added `exports["./name-entry"]`.)
- `arcade-shared` — merged the SH2-13 branch (name-entry) so one ref carries both subpaths (see deviation).
- `asteroids/src/shell/glow.ts` (NEW shim `export * from '@arcade/shared/glow'`); `render.ts` — strokePoly, drawText, drawLifeIcon, ship/saucer debris now stroke via glowPolyline/withGlow; `package.json`/lock repinned.
- `battlezone/src/shell/glow.ts` (NEW shim); `render.ts` — drawSegments (wireframe) + drawText via withGlow; `tests/arcade-shared-pipe.test.ts` version canary updated to the re-resolved SHARED_VERSION `0.8.0`; `package.json`/lock repinned.
- `star-wars/src/shell/glow.ts` (NEW shim); `wireframe.ts` — drawWireframe (every 3D model) via withGlow; `render.ts` — glowLine via glowPolyline inside its per-cabinet 'lighter' envelope; `package.json`/lock repinned.

**Per-cabinet constants kept local (AC-2):** asteroids `GLOW_BLUR=8`/`LINE_WIDTH=2`; battlezone `GLOW_GREEN` + inline 8/1.5; star-wars cockpit-cyan `GLOW` palette + inline 10/1.5. No numbers moved into `@arcade/shared`.

**AC status:**
- AC-1 (glow primitive + fake-ctx state-set-sequence + shadowBlur-reset): ✅ GREEN (arcade-shared 213/213).
- AC-2 (three games stroke via the shared primitive at a pinned ref; per-cabinet constants stay): ✅ GREEN — all three adoption suites pass; polygons migrated in all three, text in asteroids+battlezone (star-wars text is a logged follow-up).
- AC-3 (purity guard exempts glow as a browser subpath; pure core stays DOM-free; each game vitest+build green): ✅ GREEN.

**Reviewer, note before merge (see Deviations + Delivery Findings):** the games pin the arcade-shared **feature branch** (not a tag), and that branch carries a **merge of SH2-13's name-entry**. The clean end-state is: land glow + name-entry on arcade-shared `develop`, cut a release tag (sync `SHARED_VERSION`), and repin the games onto the tag. No `just release` was run (outward-facing / R2 deploy — out of GREEN scope).

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 2 observations (SH2-13 merge, branch-ref pin) | confirmed 0 new, both are already-logged deviations |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain covered manually (empty/single-point/gradient edges traced below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no try/catch/fallback in diff; covered manually |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality covered by rule-checker #8 + manual |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments verified accurate manually |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type invariants covered by rule-checker #1/#2 + manual |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no input/auth/secrets surface (canvas primitive); rule-checker #10 N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered manually (one LOW allocation note) |
| 9 | reviewer-rule-checker | Yes | clean | 15 rules / 47 instances / 0 violations | confirmed 0 violations |

**All received:** Yes (2 enabled returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed defects, 0 dismissed, 2 known-deviation observations carried to the audit + delivery findings

### Rule Compliance (typescript.md + ADR-0003)

reviewer-rule-checker enumerated every changed type/function/field against all 13 lang-review checks + 2 project rules — **0 violations across 47 instances**. Key confirmations (cross-checked against my own read):
- **#1 type-safety escapes** — `src/glow.ts` and all three shims + migrated render functions have no `as any`/`as unknown as`/`@ts-ignore`. The lone `as unknown as CanvasRenderingContext2D` is in `glow.test.ts:273` on the recording Proxy — the sanctioned test-only ctx pattern (esc-overlay/bz2-5 precedent), NOT in any `src/`.
- **#2 generics** — `GlowStyle` fields all `readonly`; `glowPolyline` pts is `ReadonlyArray<readonly [number,number]>`; `withGlow` draw is `() => void` (not bare `Function`).
- **#4 nullish** — `style.color ?? (…)` correctly uses `??` (not `||`) to honour an explicit empty-string color.
- **#5 `.js` extension (the SH2-12 landmine)** — `src/glow.ts` has ZERO relative imports (self-contained), so the published-ESM risk cannot occur. The shims import the bare `@arcade/shared/glow` specifier (not relative). The games' `./glow` imports are extensionless but consistent with their pre-existing convention and consumed via Vite bundler resolution (never shipped as raw Node ESM) — a different consumption path from arcade-shared's published dist. Compliant.
- **#8 test quality** — every glow test asserts concrete values / call order; no vacuous assertions; recording-Proxy surface matches real ctx usage.
- **ADR-0003 purity** — `glow` in `BROWSER_SUBPATHS`, absent from `PURE_SUBPATHS`; DOM types allowed for a browser subpath.
- **Per-cabinet constants** — `src/glow.ts` carries zero blur/width/colour literals; every number stayed local (asteroids GLOW_BLUR/LINE_WIDTH; battlezone GLOW_GREEN + inline 8/1.5; star-wars GLOW + inline 10/1.5).

### Observations (≥5)

- [VERIFIED] withGlow resets ONLY shadowBlur (the leaky field), leaving strokeStyle/lineWidth/shadowColor set — evidence: `arcade-shared/src/glow.ts:83-90`. Matches the "next draw overwrites them" contract; no state leak that matters.
- [VERIFIED] star-wars `glowLine` behaviour preserved exactly — evidence: `star-wars/src/shell/render.ts:806-816` keeps `save()`→`'lighter'`→`glowPolyline`→`restore()`→`shadowBlur=0`; glowPolyline sets the same strokeStyle/shadowColor/lineWidth/shadowBlur(8) inside the save scope as the original, and the post-restore reset reproduces the original no-leak. No visual change.
- [VERIFIED] `drawWireframe`/`drawSegments` fold the original trailing `shadowBlur=0` into withGlow — evidence: `star-wars/src/shell/wireframe.ts:79-97`, `battlezone/src/shell/render.ts:88-99`. Identical end-state (drawSegments additionally gains the footgun-fix reset it lacked before — an improvement, not a regression; suites green).
- [VERIFIED] asteroids debris keeps its per-segment `globalAlpha` fade isolated in `save/restore`, with the glow line through the shared primitive — evidence: `asteroids/src/shell/render.ts:202-207`. Behaviour preserved.
- [RULE] rule-checker: 15/15 rules clean across 47 instances (see Rule Compliance). Confirmed.
- [EDGE] (manual — edge-hunter disabled) glowPolyline edge cases traced: empty list → early return no-op (tested); single point → moveTo, no lineTo, still strokes (tested); gradient stroke without `color` → shadowColor `''` (documented contract; no game hits this — all pass string colors). No unhandled path.
- [SILENT] (manual — silent-failure-hunter disabled) No try/catch, no swallowed errors, no silent fallbacks in the diff. The `??` fallback is intentional and documented.
- [TEST] (manual + rule-checker #8) 24 arcade-shared glow tests + 3×3 adoption tests assert concrete values/ordering; the adoption "some src imports glow" assertion is corroborated by the resolution test + green render suites — no vacuous coverage.
- [DOC] (manual — comment-analyzer disabled) Comments verified accurate: shim headers, the "no save/restore" rationale, the glowLine 'lighter'-preservation note, and the battlezone version-canary comment all match the code.
- [TYPE] (manual + rule-checker #1/#2) `GlowStyle` is a clean value type; `string | CanvasGradient` with a separate `color?` for shadowColor is the right shape (a gradient can't be a shadowColor).
- [SEC] (manual — security disabled) No input/auth/secret/injection surface — pure canvas-drawing primitive. N/A.
- [SIMPLE] (manual — simplifier disabled) [LOW] asteroids `strokePoly` now allocates an intermediate `screen` array via `pts.map` each call (was inline forEach). Negligible for the modest per-frame polygon count; not worth changing.

### Devil's Advocate

Argue this is broken. First attack: the footgun "fix" changes behaviour — every migrated stroke now forces `shadowBlur = 0` afterwards, where several sites (asteroids strokePoly, battlezone drawSegments) previously left the blur lingering. If ANY downstream draw silently depended on inheriting that blur, the migration would dim it. But I traced the frame order in each game: subsequent draws either set their own shadowBlur (star-wars HUD effects, battlezone gunsight/radar) or explicitly zero it (asteroids drawMarginMask), and all three full render suites stay green (815/784/609) — so nothing relied on the leak; the reset is strictly safer. Second attack: star-wars `glowLine` — does dropping the hand-written `beginPath/moveTo/lineTo/stroke` for `glowPolyline` inside the `'lighter'` envelope change compositing or leave shadowBlur set? No: glowPolyline runs the identical path ops with the same width/blur/color, the `'lighter'` composite is still applied by the surrounding `save`, and `restore()` + the explicit `shadowBlur = 0` reproduce the original exit state byte-for-byte. Third attack: the gradient path — `withGlow` with a `CanvasGradient` stroke and no `color` sets `shadowColor = ''`, which disables the glow shadow. A confused caller could get an unglowing gradient stroke. But the contract documents that a gradient needs an explicit `color`, no game passes a gradient today, and the test pins the gradient+color case. Fourth: could `export *` on the shims leak a type-only symbol into a value position under `verbatimModuleSyntax`? No — the games import only the runtime functions `withGlow`/`glowPolyline` as values; `GlowStyle` is never imported as a value; tsc passed in every repo. Fifth: the branch entanglement (SH2-13 name-entry merged in) is a process/finish risk, not a runtime defect, and is flagged for SM. I could not turn any of these into a correctness failure. The code holds.

## Reviewer Assessment

**Verdict:** APPROVED

**Dispatch coverage:** `[RULE]` rule-checker 15/15 clean (47 instances); `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` subagents disabled via `workflow.reviewer_subagents` — each domain covered manually above with no defects (one `[SIMPLE]` LOW allocation note, non-blocking).

**Data flow traced:** a per-cabinet colour/blur/width → `GlowStyle` value → `withGlow`/`glowPolyline` → `ctx.strokeStyle/lineWidth/shadowColor/shadowBlur` → path ops → `shadowBlur=0`. Safe: no numbers cross into `@arcade/shared`; the shared code is a pure VERB over caller-supplied values.

**Pattern observed:** `./glow` re-export shim mirroring the established `./font` shim (`asteroids/src/shell/glow.ts:9` etc.) — consistent, single-seam adoption.

**Error handling:** N/A surface (canvas primitive, no I/O); nullish `??` fallback correct at `glow.ts:87`.

**Tests:** 2466 GREEN across 4 repos; every migrated draw path exercised by existing render suites; builds clean.

**No Critical/High findings.** Deviations all audited ACCEPTED. One non-blocking Reviewer delivery finding for SM's finish: the arcade-shared branch carries SH2-13 name-entry and the games pin a feature branch — reconcile onto develop + a release tag at finish.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.