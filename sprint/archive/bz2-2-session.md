---
story_id: "bz2-2"
jira_key: null
epic: "bz2"
workflow: "tdd"
---
# Story bz2-2: Arcade vector font — swap sans-serif HUD/text for the shared vector font pattern

## Story Details
- **ID:** bz2-2
- **Type:** chore
- **Points:** 3
- **Workflow:** tdd
- **Epic:** bz2 (Battlezone — playtest followup)
- **Repo:** battlezone
- **Stack Parent:** none

## Story Context

### Technical Approach
Battlezone currently renders HUD/text (score, lives, status labels) using the browser's default sans-serif font. Tempest and Star Wars both use an established **arcade vector-font pattern**, where glyphs are drawn as stroked vector paths instead of bitmap/system fonts, creating the characteristic glowing green arcade aesthetic.

This story ports that pattern into Battlezone by:
1. Studying the shared vector-font implementation in `tempest/src/shell/font.ts` and `star-wars/src/shell/font.ts`
2. Implementing the same pattern in `battlezone/src/shell/` (likely `render/` or a new `font.ts` module)
3. Wiring Battlezone's HUD render pipeline to use vector glyphs instead of sans-serif
4. Ensuring the green stroke aesthetic matches the game's visual identity

### Acceptance Criteria
- [ ] Vector font implementation ported from the Tempest/Star Wars pattern and integrated into Battlezone's render pipeline
- [ ] All HUD/text rendering (score, lives, status labels, on-screen messages) uses vector strokes instead of browser sans-serif
- [ ] Visual aesthetic: glowing green vector lines on black canvas, matching Tempest/Star Wars style
- [ ] All acceptance criteria have test coverage (RED phase tests failing)
- [ ] All tests pass with implementation (GREEN phase)
- [ ] Code review approved with no blocking issues

## Sm Assessment

Clean, low-risk 3-pt chore. This is a **port, not an invention** — Tempest and Star Wars have already proven the stroked vector-glyph pattern; Battlezone just needs the same treatment applied to its HUD/text. The survivable path:

- **Reference first:** TEA/Dev must read `tempest/src/shell/**/font.ts` and `star-wars/src/shell/**/font.ts` before writing anything. Two prior implementations exist — mirror the more Battlezone-appropriate one rather than reinventing glyph paths.
- **Integration risk is the real work, not the glyphs.** The unknown is *where* Battlezone's HUD render pipeline draws text today (sans-serif `fillText`/`ctx.font` calls in `battlezone/src/shell/render/`). Find every call site so none get left on sans-serif. Missing a call site is the most likely defect.
- **Aesthetic is a hard AC:** glowing **green** vector strokes on black, matching Battlezone's existing green-vector identity (not Tempest's multicolor). Watch stroke width / glow so glyphs stay legible at HUD scale.
- **No shared-lib extraction.** Per CLAUDE.md, games don't share code yet — copy the pattern into `battlezone/`, do not try to hoist a shared font module. Duplication here is intended.
- **Test angle for TEA:** vector fonts are deterministic — assert on the glyph path/segment data a character maps to (pure, testable in `src/core`-style unit tests) rather than pixel output. That keeps RED meaningful without a canvas.

No blockers. Merge gate clear, no open Battlezone PRs. Handing off to Furiosa for RED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** The story has a deterministic, canvas-free surface (a font-module contract + render.ts font-string wiring) that unit tests can pin without a live canvas.

**Test Files:**
- `battlezone/tests/shell/font.test.ts` — the new `src/shell/font.ts` module contract: `UI_FONT_FAMILY === 'Vector Battle'` (the shared cabinet face), `loadVectorFont` is a function, and it degrades to `false` (never throws/rejects) in the no-DOM node env.
- `battlezone/tests/shell/hud-font.test.ts` — drives the real `render.ts` text functions (`drawScore`, `drawLives`, `drawScreenLines`, `drawMessage`) through a recording 2D-context mock and pins that each paints in the `Vector Battle` family, keeps a `monospace` fallback, and is no longer the bare `<n>px monospace` the playtest flagged.

**Tests Written:** 16 tests (font.test.ts: 4 · hud-font.test.ts: 12) covering the 4 authored ACs below.
**Status:** RED — confirmed by testing-runner (`bz2-2-tea-red`): font.test.ts fails on module resolution (`font.ts` absent); hud-font.test.ts 8/12 assertions fail (render still bare monospace). All 670 pre-existing battlezone tests still pass — no regressions.

**Acceptance Criteria (authored during RED — the sprint YAML carried none):**
1. A shell-only `battlezone/src/shell/font.ts` exists mirroring the tempest/star-wars pattern: exports `UI_FONT_FAMILY = 'Vector Battle'` and a best-effort `async loadVectorFont(): Promise<boolean>` that returns `false` (no throw) when the font APIs are absent.
2. Every HUD/text draw in `render.ts` (`drawScore`, `drawLives`, `drawScreenLines`, `drawMessage`) paints in the `Vector Battle` family with a generic `monospace` fallback preserved — no bare-`monospace` call site left behind.
3. The `VectorBattle-e9XO.ttf` asset ships at `battlezone/public/fonts/` so the face actually loads in the browser (verified by playtest, not unit test — see Delivery Findings Gap).
4. `loadVectorFont()` is invoked at boot in the shell entry (`main.ts`) so the face is registered before the HUD draws (wiring verified by playtest).

### Rule Coverage

| Rule (lang-review TS) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined guard (`typeof FontFace === 'undefined'` path) | `loadVectorFont resolves to false in a non-DOM environment` | failing (module absent) |
| #7 async never rejects (best-effort loader) | `never rejects — the promise settles even with no font APIs present` | failing (module absent) |
| #8 test quality (meaningful, non-vacuous assertions) | self-check below | pass |

**Rules checked:** 3 of the applicable TS lang-review rules have coverage. The dominant project rule — the core/shell purity boundary — is satisfied by construction (font.ts is `shell/`, never imported by `core/`; the existing `core-purity-sweep` guards it) so no new purity test is needed.
**Self-check:** 0 vacuous tests. Every test has a concrete assertion; the "monospace fallback" guards pass today by design (they catch a future Dev dropping the fallback), while the family/`not bare monospace` assertions are the RED drivers.

**Handoff:** To Dev (The Word Burgers) for GREEN — create `src/shell/font.ts`, copy the .ttf into `public/fonts/`, swap the four render font strings, and wire `loadVectorFont()` at boot. See Delivery Findings for the asset copy + wiring that unit tests cannot cover.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/shell/font.ts` (new) — mirrors the sibling pattern: `UI_FONT_FAMILY = 'Vector Battle'` and a best-effort `loadVectorFont(): Promise<boolean>` that registers the `.ttf` via `FontFace` and degrades to `false` (no throw) when the font APIs are absent, with a `[battlezone]` warn tag.
- `battlezone/public/fonts/VectorBattle-e9XO.ttf` (new) + `Readme.txt` (new) — the shared face + its license readme, copied from `tempest/public/fonts/`.
- `battlezone/src/shell/render.ts` — new `hudFont(size)` helper builds the `${size}px 'Vector Battle', monospace` stack from the imported `UI_FONT_FAMILY`; the four text draws (`drawScore`, `drawScreenLines`, `drawLives`, `drawMessage`) now use it instead of bare `${size}px monospace`. Monospace fallback preserved.
- `battlezone/src/main.ts` — imports `loadVectorFont` and calls `void loadVectorFont()` at boot so the face is registered before the HUD draws (sibling fire-and-forget convention).

**Tests:** 683/683 battlezone passing (GREEN) — bz2-2's own suites fully green (`font.test.ts` 4/4, `hud-font.test.ts` 12/12); no pre-existing test regressed. `tsc --noEmit` + `vite build` both clean (build bundles the font asset, proving the URL resolves).

**AC status:**
- AC-1 (font.ts module) ✅ · AC-2 (all four render text sites use the vector family + fallback) ✅ · AC-3 (`.ttf` ships in `public/fonts/`) ✅ built · AC-4 (`loadVectorFont()` wired at boot) ✅
- **Owed to playtest (bz2-6):** the *visual* confirmation that the glyphs actually render as Vector Battle in-browser (not the monospace fallback). Unit tests run in the no-DOM node env and cannot see the real font paint — this is by design per the epic ("the shell is verified by running the game"). Structurally the wiring is a verbatim port of the live tempest/star-wars module, and the asset bundles, so the risk is low.

**Branch:** `feat/bz2-2-arcade-vector-font` (pushed to origin)

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 blocking (1 intentional console.warn noted) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 5 (all non-blocking), dismissed 1 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rules / 18 instances / 0 violations) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as skipped)
**Total findings:** 5 confirmed (all Low/Medium, non-blocking), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A small, disciplined port of the proven tempest/star-wars `font.ts` pattern. Preflight green (683/683, `tsc`+`vite build` clean), security clean, rule-checker clean (0 violations across 14 TS rules + the core/shell purity boundary). Test-analyzer's findings are all quality nits on a suite that already exceeds sibling coverage (the sibling `font.ts` modules ship with **zero** tests). No Critical or High. The one genuine residual risk — the face silently 404ing to the monospace fallback in a live browser — is inherent to DOM/FontFace glue that the epic explicitly assigns to the bz2-6 playtest, is already flagged by TEA/Dev, and the asset is committed + bundled by `vite build`.

**Data flow traced:** viewport `size` (number) → `hudFont(size)` → `ctx.font = "${size}px 'Vector Battle', monospace"` → `fillText`. `size` is numeric (no string-injection surface); `text`/`lines` are ROM-derived deterministic strings from `core`, drawn as canvas glyphs (no HTML/XSS surface). Font URL is a build-time `BASE_URL` constant + static literal — safe.

**Observations (tagged by source):**
- `[TEST]` **(Medium, non-blocking)** — `src/shell/font.ts:32-43`: `loadVectorFont()`'s try/catch (the `FontFace` success `return true` and the catch `console.warn; return false` paths) has no unit coverage; the node test env only exercises the guard-clause early return. **Confirmed** — but acceptable: the epic rules "the shell is verified by running the game," the siblings ship this identical module with no tests at all, and forcing a jsdom/fake-FontFace harness for a best-effort degradation path would gold-plate infra the project has deliberately kept lean. Recorded as a non-blocking Improvement for optional future hardening.
- `[TEST]` **(Low)** — `tests/shell/hud-font.test.ts:86`: the "keeps a monospace fallback" assertion also passes on the pre-diff bare `monospace`, so it is a forward regression-guard, not a RED-driver. **Confirmed** as intentional (TEA documented exactly this) — optional strengthen to `/,\s*monospace\s*$/` to fail if the stack ever collapses to just the vector family.
- `[TEST]` **(Low)** — `tests/shell/font.test.ts:49`: `.resolves.toBeDefined()` is a loose matcher (would pass for any non-undefined value); the preceding test already pins `toBe(false)`. **Confirmed**, cosmetic.
- `[TEST]` **(Low)** — `tests/shell/font.test.ts`: the guard-clause branch depends on the ambient `environment: node` rather than an explicit stub. **Confirmed**, minor; `vi.stubGlobal('FontFace', undefined)` would make it env-independent.
- `[TEST]` **(Dismissed)** — analyzer flagged `VECTOR_FAMILY` literal duplication (hud-font.test.ts:28) as coupling. **Dismissed:** it is a deliberate, documented design choice (keeps the render test free of a hard import dependency on the new module) and the analyzer itself confirmed it is *not* a false-negative risk — a rename fails loudly. `font.test.ts` pins `UI_FONT_FAMILY === 'Vector Battle'`, so the contract is enforced.
- `[SEC]` **(Verified clean)** — `src/shell/font.ts:24`: `FONT_URL` is `${import.meta.env.BASE_URL}fonts/…` (build-time constant + literal), no untrusted input reaches `FontFace`/`ctx.font`; `console.warn` logs only a local `DOMException`. No injection/XSS/leak. Evidence: security specialist walked all four surfaces and returned `status: clean`.
- `[RULE]` **(Verified)** — core/shell purity boundary intact: `grep` of `src/core/*.ts` for `FontFace|document|window|shell` = 0 hits; `font.ts` is imported only by `render.ts` and `main.ts` (both shell). 14 TS lang-review rules / 18 instances / 0 violations.
- `[TYPE]` **(self-assessed — specialist disabled)** — `loadVectorFont(): Promise<boolean>` and `hudFont(size: number): string` are precisely typed; no `any`/`object`/`Function`; the test mock's `as unknown as CanvasRenderingContext2D` mirrors the pre-existing `hud-palette.test.ts:90` convention. Corroborated by rule-checker rule #2. No issues.
- `[SIMPLE]` **(self-assessed — specialist disabled)** — the `hudFont` one-line arrow is the minimal DRY factoring of four identical font strings; no dead code, no over-engineering. No issues.
- `[DOC]` **(self-assessed — specialist disabled)** — module/`hudFont` doc comments are accurate and match behavior (verified line-by-line); the license `Readme.txt` referenced by `font.ts` is actually shipped. No stale/misleading docs.
- `[EDGE]` **(self-assessed — specialist disabled)** — boundary inputs handled: `drawLives` guards `'▲'.repeat(Math.max(0, lives))` against negatives; `drawScreenLines` skips empty lines; `size` is floored to a positive min in every caller. FOUT (fallback shown for the first frames until the async face resolves) is intentional and covered by the monospace fallback.
- `[SILENT]` **(self-assessed — specialist disabled)** — no swallowed errors: the only catch (`font.ts:103`) logs via `console.warn` and returns `false` (documented degradation), not a silent empty catch.
- `[VERIFIED]` all four `fillText` call sites are covered by `hud-font.test.ts` — evidence: `render.ts` `drawGunsight`/`drawRadar`/`drawSegments`/`drawCrackedGlass`/`drawHorizonBand` set no `ctx.font` and draw no text; the four text fns (`drawScore:114`, `drawScreenLines:196`, `drawLives:219`, `drawMessage:306`) all route through `hudFont`.
- `[VERIFIED]` **(pre-existing, not this diff)** — `main.ts:49-50` `getContext('2d')!` / `as HTMLCanvasElement` are non-null-assertion/cast patterns rule-checker flagged as literally matching TS #1, but both are unchanged context lines predating bz2-2. Not new debt; out of scope for this review.

**Rule Compliance:**
- **TS lang-review checklist (14 applicable rules, exhaustive via rule-checker):** #1 type-safety escapes — the test-double double-cast is the sanctioned repo pattern ✓; #2 generics/interfaces — all params/returns specifically typed ✓; #4 null/undefined — the `!document.fonts` guard correctly checks object presence before access ✓; #5 modules — value imports correctly avoid `import type`, `.js` extensions correctly omitted (bundler resolution) ✓; #7 async — `loadVectorFont` returns meaningful `Promise<boolean>`, never re-throws, `void`-marked at the call site ✓; #8 test quality — imports from `src/`, no `as any`, mock surface matches consumers ✓; #11 error handling — untyped catch is `unknown`, logged not swallowed ✓. #3/#6/#9/#13 not applicable (no enums/JSX/config/fix-round). **0 violations.**
- **Core/shell purity (battlezone CLAUDE.md, hard boundary):** all font/DOM/FontFace code lives in `shell/`; `core/` never imports it — verified by grep. ✓

### Devil's Advocate

Argue this is broken. The strongest case: **the story's own bug survives the fix.** `loadVectorFont()` is best-effort — if the browser fetches `/battlezone/fonts/VectorBattle-e9XO.ttf` and gets a 404 (wrong deploy base, missing asset in the served checkout, MIME rejection), `FontFace.load()` rejects, the catch swallows it into a `console.warn`, returns `false`, and the HUD renders **monospace forever** — exactly the playtest defect bz2-2 exists to kill. Every unit test is green because they run under `environment: node`, hit the guard clause, and never touch the fetch. So a fully "GREEN, approved" story could ship the identical visual bug. Mitigants: the `.ttf` is committed to `public/fonts/` and `vite build` bundled it (preflight confirmed a built `dist/`), and `BASE_URL` is pinned to `/battlezone/` matching the tunnel route — but none of that proves the *glyphs* actually paint as Vector Battle in a real browser. That proof is owed to bz2-6, and TEA/Dev both flagged it. Second angle — **FOUT/timing:** `void loadVectorFont()` races the first render; the HUD paints monospace for a few frames then pops to Vector Battle. For an arcade attract loop this is invisible-to-acceptable, and the fallback is deliberate, so not a defect. Third — **glyph coverage:** Vector Battle is CAPS-ONLY with "some dingbats"; `drawLives` paints `'▲'` (U+25B2) and `drawScore` paints digits. If the face lacks a glyph, canvas does per-glyph fallback to monospace for that character — cosmetically fine, no crash. Any lowercase text would map oddly, but every caller draws uppercase ROM strings. Fourth — **`import.meta.env.BASE_URL` undefined** in some exotic context would yield a malformed URL, but the node path returns before constructing it and Vite always defines it in-browser. Conclusion: the devil's advocate surfaces exactly one real risk (asset-404 → silent fallback), and it is already the explicit AC-3/bz2-6 playtest item — not a new finding, not a code defect. Nothing here rises to blocking.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T11:14:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T10:49:27+00:00 | 2026-07-04T10:52:06Z | 2m 39s |
| red | 2026-07-04T10:52:06Z | 2026-07-04T10:59:25Z | 7m 19s |
| green | 2026-07-04T10:59:25Z | 2026-07-04T11:04:34Z | 5m 9s |
| review | 2026-07-04T11:04:34Z | 2026-07-04T11:14:27Z | 9m 53s |
| finish | 2026-07-04T11:14:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): the "Vector Battle" .ttf asset is not present in battlezone.
  Affects `battlezone/public/fonts/VectorBattle-e9XO.ttf` (copy it from
  `tempest/public/fonts/VectorBattle-e9XO.ttf` — the siblings ship it there and
  `font.ts` loads `${import.meta.env.BASE_URL}fonts/VectorBattle-e9XO.ttf`). Without
  the file the FontFace load rejects at runtime and the HUD silently stays on the
  monospace fallback forever — GREEN unit tests would still pass (they run in the
  no-DOM node env), so this must be verified by actually running the game. *Found by TEA during test design.*
- **Improvement** (non-blocking): the shared `font.ts` pattern is a TTF web-font loaded
  via the `FontFace` API with a baked-in fallback chain in the render `ctx.font` strings,
  NOT stroked glyph-path geometry. Affects `battlezone/src/shell/font.ts` (new, mirror
  `tempest/src/shell/font.ts`/`star-wars/src/shell/font.ts` verbatim except the `[tempest]`
  log tag) and `battlezone/src/shell/render.ts` (swap the four `${size}px monospace` strings
  to `${size}px 'Vector Battle', monospace`; the siblings interpose `'Orbitron'` but battlezone
  ships no Orbitron face, so a two-step `'Vector Battle', monospace` chain is the correct minimum).
  Also call `loadVectorFont()` once at boot in `battlezone/src/main.ts` (or the shell entry) —
  the unit tests do not and cannot cover that wiring. *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** (non-blocking): TEA's asset Gap is closed — `VectorBattle-e9XO.ttf` (and the
  license `Readme.txt`) copied from `tempest/public/fonts/` into `battlezone/public/fonts/`;
  `vite build` bundles it, confirming the `${import.meta.env.BASE_URL}fonts/…` URL resolves.
  Affects nothing further; the definitive check is the visual smoke — still owed by the bz2-6 live playtest. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the four text draws are the COMPLETE set of `fillText` call
  sites in `render.ts` (verified — `drawGunsight`/`drawRadar`/`drawSegments`/`drawCrackedGlass`/`drawHorizonBand`
  draw no text), so bz2-7's reserved ROM strings (HIGH SCORE / GREAT SCORE / BONUS TANK / direction
  callouts) will inherit the Vector Battle face for free once they route through `drawMessage`/`drawScreenLines`.
  Affects `battlezone/src/shell/render.ts` (no change needed now — informational for bz2-7). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `loadVectorFont()`'s `FontFace` success/catch branches are unit-uncovered — the
  node test env only hits the guard clause. Affects `battlezone/src/shell/font.ts` (optional future hardening: a
  jsdom-scoped test or a fake `FontFace` whose `.load()` rejects, to exercise the `return true` / `console.warn; return false`
  degrade-gracefully contract). Not required now — the epic assigns shell/DOM verification to the bz2-6 playtest and the
  sibling `font.ts` modules ship with no tests at all. *Found by Reviewer during code review.*
- **No blocking upstream findings.** The single residual risk (asset 404 → silent monospace fallback) is already AC-3 / the bz2-6 playtest item. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Test angle: module + render-wiring assertions, not glyph-path data**
  - Rationale: the tempest/star-wars "font.ts pattern" the story names is a TTF face loaded via `FontFace`, not stroked glyph geometry — there are no per-character path tables in the repo to assert against, so the SM's suggested angle does not apply. The chosen angle pins the same deterministic, canvas-free surface the siblings expose.
  - Severity: minor
  - Forward impact: none — tests match the real, referenced pattern; Dev implements the actual sibling module.
- **Added a `hudFont(size)` helper instead of inlining the font string at all four call sites**
  - Rationale: DRY — one source for the shared family + fallback chain so a future call site cannot silently drift to a different fallback; matches the sibling convention of naming font strings (tempest's `NUM_FONT`/`LABEL_FONT`). Behaviourally identical to inlining — all 16 bz2-2 tests pass.
  - Severity: minor

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Test angle: module + render-wiring assertions, not glyph-path data**
  - Spec source: .session/bz2-2-session.md, ## Sm Assessment ("Test angle for TEA")
  - Spec text: "vector fonts are deterministic — assert on the glyph path/segment data a character maps to (pure, testable in src/core-style unit tests) rather than pixel output"
  - Implementation: Tests assert (a) `font.ts` exports `UI_FONT_FAMILY === 'Vector Battle'` and a `loadVectorFont()` that resolves `false` in the no-DOM env, and (b) each `render.ts` text function paints a `ctx.font` containing the family + a monospace fallback via a recording mock context.
  - Rationale: the tempest/star-wars "font.ts pattern" the story names is a TTF face loaded via `FontFace`, not stroked glyph geometry — there are no per-character path tables in the repo to assert against, so the SM's suggested angle does not apply. The chosen angle pins the same deterministic, canvas-free surface the siblings expose.
  - Severity: minor
  - Forward impact: none — tests match the real, referenced pattern; Dev implements the actual sibling module.

### Dev (implementation)
- **Added a `hudFont(size)` helper instead of inlining the font string at all four call sites**
  - Spec source: .session/bz2-2-session.md, ## TEA Assessment AC-2 (and `hud-font.test.ts`)
  - Spec text: "swap the four `${size}px monospace` strings to `${size}px 'Vector Battle', monospace`"
  - Implementation: A single module-level `const hudFont = (size) => \`${size}px '${UI_FONT_FAMILY}', monospace\`` is called by `drawScore`/`drawScreenLines`/`drawLives`/`drawMessage`, rather than repeating the literal four times.
  - Rationale: DRY — one source for the shared family + fallback chain so a future call site cannot silently drift to a different fallback; matches the sibling convention of naming font strings (tempest's `NUM_FONT`/`LABEL_FONT`). Behaviourally identical to inlining — all 16 bz2-2 tests pass.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **TEA — "Test angle: module + render-wiring assertions, not glyph-path data"** → ✓ ACCEPTED by Reviewer: correct — the named tempest/star-wars `font.ts` pattern is a `FontFace`-loaded TTF, not stroked glyph geometry, so the SM's glyph-path angle had no data to assert against. The chosen module-contract + render-wiring surface is the right deterministic, canvas-free target.
- **Dev — "Added a `hudFont(size)` helper instead of inlining the font string at all four call sites"** → ✓ ACCEPTED by Reviewer: a one-line DRY factoring that gives the shared family+fallback a single source of truth; behaviourally identical to inlining, all 16 tests pass, and rule-checker cleared it (#2/#12). No scope creep.
- No undocumented deviations found. The diff matches the logged TEA/Dev decisions; every spec divergence is accounted for.