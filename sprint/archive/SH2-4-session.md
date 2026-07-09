---
story_id: "SH2-4"
jira_key: "SH2-4"
epic: "SH2"
workflow: "tdd"
---
# Story SH2-4: asteroids — migrate HUD/framing text off the Vector Battle TTF onto @arcade/shared/font stroke-vectors

## Story Details
- **ID:** SH2-4
- **Jira Key:** SH2-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/SH2-4-asteroids-font-migration
- **Repo:** asteroids (gitflow — branch off origin/develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-09T16:02:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T14:58:45Z | 2026-07-09T15:02:06Z | 3m 21s |
| red | 2026-07-09T15:02:06Z | 2026-07-09T15:27:16Z | 25m 10s |
| green | 2026-07-09T15:27:16Z | 2026-07-09T15:55:39Z | 28m 23s |
| review | 2026-07-09T15:55:39Z | 2026-07-09T16:02:46Z | 7m 7s |
| finish | 2026-07-09T16:02:46Z | - | - |

## SM Assessment

**Setup complete — SH2-4 ready for RED (TEA / O'Brien).**

- **Story:** asteroids migrates HUD/framing text off the Vector Battle TTF onto
  `@arcade/shared/font` stroke-vectors (3pts, tdd/phased, repo: asteroids). Third of
  the per-game migrations (SH2-4/5/6) gated by the now-done SH2-3 glyph audit.
- **Workflow routing:** tdd → phased → first agent is **TEA (red)**.
- **Branch:** `feat/SH2-4-asteroids-font-migration` cut off **origin/develop** in the
  asteroids subrepo (gitflow; PR targets develop). `git fetch` run first so the base
  is not a stale local develop ref.
- **Merge gate:** clear — no open asteroids PRs.
- **Discovery gate satisfied by SH2-3:** asteroids renders only A–Z, 0–9, space, `_`;
  all covered by the shared font. No `▲`/`©` concerns (those are battlezone / DOM-only).
  So `layoutText` covers 100% of asteroids' rendered text — see quarry in Delivery
  Findings and the enriched `sprint/context/context-story-SH2-4.md` Technical Approach.
- **Field/context note:** `pf sprint story field` misreported (repos=pennyfarthing,
  null title/points) and `pf context create` generated a stub context — authoritative
  values were taken from `sprint/epic-SH2.yaml` and the SH2-3 quarry re-folded into
  both the session and the context.
- **Scope guard for TEA/Dev:** consume the shared font at a pinned ref (no arcade-shared
  edits); keep asteroids' LOCAL glow/stroke code (shared glow is SH2-8); express
  letter-spacing via `layoutText` opts (the A2-2 concern); do not fix the high-score
  name-validation hardening note here.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED — 24 failing / 773 passing / 0 collection errors (RUN_ID `SH2-4-tea-red`, verified via testing-runner). `tsc --noEmit` clean, so every RED failure is behavioral (an unimplemented assertion), not a compile/collection error.

**Test Files:**
- `tests/font-migration.test.ts` (NEW) — the mechanism + removal core. Fake recording-ctx proves render() calls no `ctx.fillText`, sets no `ctx.font`, sets no `ctx.letterSpacing` in any mode, and strokes the extra initials-entry text (qualifying game-over adds stroked segments over non-qualifying). fs + source-text scans prove the `.ttf` is gone, and `FontFace`/`document.fonts`/`loadVectorFont`/`'Vector Battle'` are absent from `src/`, `main.ts` no longer boots the loader, and `render.ts` imports+calls `layoutText`. No module mock, no dependency on `@arcade/shared/font` resolving.
- `tests/font-layout.test.ts` (NEW) — the A2-2 contract. Mocks the local `./font` seam to capture the `(text, opts)` handed to `layoutText`: the score string and the `'AC_'` initials echo flow through `layoutText`; every laid-out run carries a **positive `letterSpacing` opt**; render sets no `ctx.letterSpacing`.
- `tests/render-hud.test.ts` (REPOINTED) — the string-content contract (score, running-max high score, attract cycle, board rows, GAME OVER, final score, initials echo) now observed at the `layoutText` seam instead of `fillText`. Lives-row segment-count test and the render-is-read-only test are unchanged and stay green.
- `tests/margin-mask.render.test.ts` (REPOINTED) — the "mask drawn before HUD text" ordering test now timestamps `layoutText` calls against `fillRect` on one shared counter. Other margin-mask assertions unchanged/green.
- `tests/render-wiring.test.ts` (TRIMMED) — dropped the now-false `main.ts must call loadVectorFont` assertion (its inverse is pinned in font-migration.test.ts).
- `tests/font.test.ts` (RETIRED/DELETED) — it pinned the deleted TTF loader (`UI_FONT_FAMILY==='Vector Battle'`, `loadVectorFont`, a shipped `.ttf`) and imported the doomed module; inverse contract now lives in font-migration.test.ts.

**AC coverage:**
- AC-1 (all HUD/framing text via layoutText + a canvas stroke; loadVectorFont + every fillText/ctx.font path removed) → font-migration `no fillText / no ctx.font / imports+calls layoutText` + all repointed string tests.
- AC-2 (public/fonts/*.ttf + TTF loader deleted; no 'Vector Battle'/FontFace) → font-migration fs + source scans.
- AC-3 (letter spacing preserved via layoutText opts; build green; manual HUD run) → font-layout `positive letterSpacing per run` + `never sets ctx.letterSpacing`. The **manual-run** half of AC-3 (HUD reads correctly, glyph shape/scale/alignment) is intentionally left to Dev's dev-server check + Reviewer — arcade has no render surface in node (see deviations).

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | font-migration source scans (`render.ts` no fillText/ctx.font/letterSpacing; no FontFace/loadVectorFont/'Vector Battle' in src) | failing (RED) |
| #5 module/import wiring | font-migration `imports and calls layoutText` (import from `./font` or `@arcade/shared/font`) | failing (RED) |
| #8 test quality (self-check) | all suites: assertions non-vacuous; mock `layoutText(text, opts?) -> {strokes,width}` matches the real signature; tests import `src/` not `dist/`; no `as any` in assertions | pass |

**Rules checked:** 3 of 3 applicable TS lang-review rules have coverage. N/A: #3 enums (none), #4 null (no new nullable production surface — Dev's GREEN), #6 React/JSX (none), #7/#11 async/error (the async loader is being DELETED, not added), #10 input-validation (the high-score name hardening is out of scope, flagged non-blocking), #12 perf/bundle (no barrel over-import; sync `fs` is test-only).

**Self-check:** No vacuous tests. Ctx stubs use `as unknown as CanvasRenderingContext2D` — the established house idiom in every existing render suite (a full CanvasRenderingContext2D is 200+ members); it is a test-only cast at the ctx boundary, not production code. Rule #1 lists `as unknown as` but this matches precedent and is confined to test doubles.

**Handoff:** To Dev (Julia) for GREEN. Implementation order is dependency-critical — see the blocking Delivery Finding: (1) **re-pin `@arcade/shared`** to a ref ≥ SH2-3 (the `_ , /` glyphs; v0.6.0 is insufficient — cut/pin `v0.7.0`, or pin `#develop`/`#f9676be`) and `npm install "@arcade/shared@github:...#ref"` to refresh the stale lock; (2) mirror tempest — make `src/shell/font.ts` re-export `@arcade/shared/font` and import `layoutText`/`CELL_H` from `./font` in `render.ts` (keeps the mock seam valid); (3) rewrite `drawText` to `layoutText(text, { letterSpacing })` → stroke the returned glyph geometry with asteroids' LOCAL glow/stroke code (scale glyphs by `px/CELL_H`; a **constant** cell-space letterSpacing reproduces the old `0.1em × px` screen tracking — the RED run captured the exact old values: `2.20/1.60/4.80px` for the 22/16/48px runs), handle right/center alignment via the returned `width`; (4) delete `public/fonts/*.ttf`, remove the TTF loader from `src/shell/font.ts`, drop `loadVectorFont` from `main.ts`, and clear the `'Vector Battle'` font strings from `render.ts`. Do NOT touch the high-score name-validation hardening (flagged, out of scope).

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 797/797 passing (GREEN) — verified via testing-runner (RUN_ID `SH2-4-dev-green-2`) and a final `vitest run`. `tsc --noEmit` + `vite build` both green. HUD **visually verified** in the dev server (Playwright screenshot at http://localhost:5299/asteroids/): ASTEROIDS banner, PUSH START, and both score readouts render as legible glowing stroke-vectors with A2-2 tracking; no blank/placeholder glyphs.
**Branch:** feat/SH2-4-asteroids-font-migration (pushed to origin).

**Files Changed:**
- `package.json` / `package-lock.json` — re-pinned `@arcade/shared` to `github:...#f9676be` (the SH2-3 commit: first ref with BOTH the `/font` subpath and the `_ , /` glyphs; v0.6.0 was SH2-2-only). `npm install` refreshed the stale lock.
- `src/shell/font.ts` — replaced the TTF/FontFace loader with `export * from '@arcade/shared/font'` (mirrors tempest).
- `src/shell/render.ts` — `drawText` now lays out via `layoutText(text, { letterSpacing: GLYPH_TRACKING })` and strokes the returned glyph geometry with asteroids' LOCAL single-pass glow (SHIP_COLOR + GLOW_BLUR + LINE_WIDTH); font constants became cap-height sizes scaled by `px/CELL_H`; the `ctx.font`/`ctx.fillText`/`ctx.letterSpacing` path is gone. `GLYPH_TRACKING = HUD_TRACKING_EM * CELL_H` (constant cell-space spacing reproduces the old 0.1em×px screen tracking at every size).
- `src/main.ts` — removed the `loadVectorFont` import + boot call.
- `public/fonts/VectorBattle-e9XO.ttf` + `Readme.txt` — deleted.
- `tests/render.test.ts` — isolated the HUD (now stroked) from the ship/debris stroke-count assertions (delta / sub-1.0 fade-alpha / symmetric-difference); see deviations.
- `tests/font-migration.test.ts` — narrowed the `letterSpacing` source scan to `ctx.letterSpacing` (see deviations).

**AC status:** AC-1 ✓ (all HUD/framing text via layoutText + canvas stroke; loadVectorFont + every fillText/ctx.font path removed) · AC-2 ✓ (TTF + loader deleted; no 'Vector Battle'/FontFace in src) · AC-3 ✓ (letter spacing via layoutText opts; vitest + vite build green; HUD manually verified legible).

**Self-review:** wired to the render path (drawHud/attract/game-over all flow through the migrated drawText); follows the tempest convergence pattern; no debug code; on the correct feat branch. The async loader is deleted, so no new error-handling surface.

**Handoff:** To TEA (O'Brien) for the verify phase (simplify + quality-pass), then Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; tests 797/0 GREEN; tsc + vite build GREEN; tree clean, pushed | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges assessed manually |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no new error paths (async loader deleted) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed manually |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments checked manually |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types checked manually |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no auth/input/secret surface (client render) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity checked manually |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — lang-review checklist checked manually |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, assessed manually)
**Total findings:** 0 confirmed blocking, 4 LOW observations (non-blocking), 7 VERIFIED-good

## Reviewer Assessment

**Verdict:** APPROVED

Note (self-authored review): this session authored the code (Dev/Julia) and reviews it (Reviewer/The Thought Police). The review below is a genuine adversarial pass; the AI-self-approval merge guardrail is enforced downstream at SM finish (human authorization required before merge).

### Observations

- `[VERIFIED]` **Migration mechanism correct** — `drawText` (render.ts:326-359) lays out `layoutText(text, { letterSpacing: GLYPH_TRACKING })` and strokes the returned cell-local geometry with `scale = sizePx/CELL_H`, y-flip `sy = y - p.y*scale` (baseline at y, glyphs above — matches the old alphabetic baseline), alignment via `ox` from `width*scale`. No NaN (CELL_H=24 constant divisor). Mirrors tempest's proven `vecText`. Uses asteroids' LOCAL single-pass glow (SHIP_COLOR/GLOW_BLUR/LINE_WIDTH), not the shared primitive — correct per scope (shared glow is SH2-8).
- `[VERIFIED]` **A2-2 tracking preserved** — `GLYPH_TRACKING = HUD_TRACKING_EM * CELL_H = 2.4` (render.ts:67-68). Screen spacing = 2.4 × (px/24) = 0.1×px = the old `0.1em × px`. Reproduces the RED-captured old values (2.20/1.60/4.80px for 22/16/48px). Every `drawText` call passes it, so every run is tracked (satisfies font-layout's per-run>0 pin).
- `[VERIFIED]` **TTF + loader fully retired** — `public/fonts/{VectorBattle-e9XO.ttf,Readme.txt}` deleted; `loadVectorFont` import+call gone from main.ts; `src/shell/font.ts` is now `export * from '@arcade/shared/font'`; no `FontFace`/`'Vector Battle'` remain in `src/` (comments scrubbed of the literal — the AC-2 source scan is comment-inclusive). font-migration fs/source scans all green.
- `[VERIFIED]` **No dangling references** — grep confirms `UI_FONT_FAMILY`/`loadVectorFont` appear only in test assertions/comments, not real imports. render.ts imports `{ layoutText, CELL_H }` — both real exports. The `./font` re-export forwards the full real surface (`CELL_H, CELL_W, GLYPH_CHARS, charGlyph, hasGlyph, layoutText`).
- `[VERIFIED]` **Dependency pin resolves + carries the `_` glyph** — `@arcade/shared@github:...#f9676be` builds `dist/` via `prepare`, exports `/font`; `layoutText('AC_')` → 5 strokes, `GLYPH_CHARS` includes `_`. The initials-entry echo (`over.initials + '_'.repeat(...)`, render.ts) renders the `_` as a baseline bar. Provisional pin (flagged for epic-close re-tag).
- `[VERIFIED]` **Visual** — dev-server screenshot (Playwright) shows ASTEROIDS, PUSH START, and both score readouts as legible glowing stroke-vectors with visible tracking, white phosphor on black, margin letterbox intact, no blank/placeholder glyphs. Satisfies AC-3's manual-run intent.
- `[VERIFIED][TEST]` **render.test.ts HUD-isolation is sound** — the migration makes HUD text stroke real geometry; the fixes cancel it correctly: debris counts via delta against the identical-HUD debris-free frame; "draws nothing" via absence of sub-1.0-alpha strokes (debris strokes at fade alpha `life/1.5 < 1`, HUD at globalAlpha 1); fade via min-alpha (robust to the stub's no-op save/restore); silhouette via segment symmetric-difference (HUD + seeded geometry cancel). Original A2-5/A-21/A-5 intent preserved.
- `[LOW]` **Centering counts the trailing letterSpacing** — layoutText's `width` includes one letterSpacing per glyph (incl. the last), so centered/right text shifts left by ≤ `letterSpacing*scale` (~2–5px). This MATCHES the old `ctx.letterSpacing`+`textAlign` behavior (browsers also fold trailing letter-spacing into the measured width), so it is behavior-preserving, not a regression. Non-blocking; render.ts:333.
- `[LOW][TEST]` **Absolute empty-debris guard softened** — the old "empty debris → 0 total strokes" became "no sub-1.0-alpha stroke". A phantom debris line drawn at full alpha (≥1) would now slip past, but real `drawShipDebris` always strokes at its fade alpha (`life/1.5 < 1`), so a realistic phantom is still caught. Documented in Dev deviation. Non-blocking.
- `[LOW][TYPE]` **Test ctx stubs use `as unknown as CanvasRenderingContext2D`** — TS lang-review #1 flags double-casts, but these are confined to test doubles and match every pre-existing render suite (a full `CanvasRenderingContext2D` is 200+ members, impractical to satisfy structurally). Not production code. Acceptable.
- `[LOW]` **Provisional commit pin** — `#f9676be` is not a release tag (v0.6.0 lacks `_`; SH2-3 is untagged). Must re-pin at SH2 epic close; recommend cutting arcade-shared v0.7.0 then. Flagged as a Delivery Finding.

### Rule Compliance (TS lang-review checklist)

- **#1 type-safety escapes** — Compliant in production (render.ts/font.ts/main.ts: no `as any`, `@ts-ignore`, non-null assertions). Test doubles use `as unknown as CanvasRenderingContext2D` (house idiom, test-only) — noted LOW, not a production violation.
- **#4 null/undefined** — Compliant. Mocks use `opts?.letterSpacing ?? 0` (correct `??`); render's `highScoreTable[0]?.score ?? 0` unchanged.
- **#5 module/declaration** — Compliant. `export * from '@arcade/shared/font'` (tempest precedent, tsc green under this config); `import { layoutText, CELL_H }` are value imports used at runtime. No missing `.js` (bundler resolution; consistent with the whole repo).
- **#8 test quality** — Compliant. New/edited tests assert meaningfully (no vacuous `assert(true)`/`let _=`); the `./font` mock's `layoutText(text, opts?) -> {strokes,width}` matches the real signature; tests import `src/` (not `dist/`).
- **#12 perf/bundle** — Compliant. `drawText` loops glyph strokes per frame (same shape as tempest, an acceptable per-frame render cost); no barrel over-import; the source-scan `fs` calls are test-only.
- **#2/#3/#6/#7/#10/#11/#13** — N/A (no broad generics/`object`; no enums; no JSX; no async/Promise added — the async loader was DELETED; no user-input validation surface; no error-handling surface; no fix-diff regressions).

### Devil's Advocate

Assume this is broken. The sharpest risk is a **blank or garbled HUD after removing the TTF** — the whole point of the migration is that text stops being `fillText` and becomes stroked glyphs, and the unit tests MOCK the font, so they cannot prove real glyphs render. If the `_` glyph were missing from the pinned ref, the initials-entry echo would render blank slots and a player entering a high score would see nothing — a real, user-facing regression. I checked this directly: the pin is `#f9676be` (SH2-3), `GLYPH_CHARS` includes `_`, `layoutText('AC_')` returns 5 strokes, and the dev-server screenshot renders legible text. So the catastrophic case is ruled out empirically, not just by green mocked tests. Next: a **confused player during initials entry** sees "A__" — the underscore is a baseline bar, which reads as an empty slot; correct and matched to intent. Next: **stressed input** — the attract board row `layoutText("  1  AAA  009000")` is O(n), pure, no allocation surprise; a huge score still formats to 6 digits (`formatScore`), bounded. Next: **a hostile localStorage high-score name** with characters the font lacks would degrade to a blank glyph (charGlyph→BLANK) — but that is a pre-existing, TEA-flagged, explicitly-out-of-scope hardening item, not introduced here. Next: **centering drift** — I confirmed the trailing-letterSpacing width matches the old browser behavior, so no visible regression. Next: **the modified TEA tests** — could I have weakened coverage to make my own code pass? The letterSpacing regex narrowing is forced (the bare-word scan contradicted AC-3 and TEA's own font-layout test); the render.test.ts isolation preserves the debris/silhouette intent with the identical-HUD delta and the fade-alpha filter, verified above. The one genuine softening (absolute empty-debris count) is documented and low-risk. Nothing here rises to Critical or High.

**Data flow traced:** game HUD string (score/prompt/board row/initials echo) → `drawText` → `layoutText(text, {letterSpacing})` → cell-local stroke geometry → scaled/flipped/aligned → `ctx.stroke()` on canvas. Pure, deterministic, no DOM font dependency, no user-input trust boundary.
**Pattern observed:** local `font.ts` re-export + `render.ts` strokes `layoutText` — the exact tempest convergence pattern (render.ts:40, font.ts:11). Good, consistent cabinet-wide.
**Error handling:** the only removed error surface was the async `loadVectorFont` try/catch; nothing replaces it because there is no async font to fail. Unsupported chars degrade to a blank glyph (pre-existing, in the shared lib).
**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Prior-story quarry folded in (from SH2-3 audit, session-archive): -->
- Asteroids' rendered text set = A–Z, 0–9, space, `_`. The `_` is the initials-entry echo. All covered by @arcade/shared/font VGMSGA table (SH2-3 added missing glyphs). No glyph gap.
- Asteroids has no triangle (▲) concern (battlezone-only, SH2-6) and no copyright concern. layoutText covers 100% of asteroids' rendered characters.
- @arcade/shared/font exports layoutText(text, opts?) -> {strokes, width}, charGlyph/hasGlyph, GLYPH_CHARS, CELL_W/CELL_H. It is PURE (no DOM).
- Letter-spacing is expressed via layoutText's opts (A2-2 concern).
- Non-blocking hardening note: high-score name fields validated only as typeof name === 'string', so tampered localStorage could contain font-missing chars; in-code names are always A–Z. Flag but do not fix.
- arcade-shared consumed at pinned git-URL. SH2-3 font work complete on origin/develop. Use `npm install "@arcade/shared@github:...#ref"` if lock stale.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): asteroids pins `@arcade/shared@github:slabgorb/arcade-shared#v0.5.0`, whose exports map has NO `/font` subpath — and the only tag that adds `/font` (`v0.6.0`) is SH2-2 ONLY: its `GLYPH_CHARS` is `' 0123456789A–Z-'` with **no `_ , /`**. Asteroids' initials echo renders `_` (`render.ts:405`), so v0.6.0 is insufficient. The `_ , /` glyphs (SH2-3, commit `f9676be`) are on arcade-shared `origin/develop` but **untagged**. Affects `asteroids/package.json` + `package-lock.json` (Dev GREEN must re-pin `@arcade/shared` to a ref ≥ SH2-3 — cut/pin a new tag e.g. `v0.7.0`, or pin `#develop`/`#f9676be` — then `npm install "@arcade/shared@github:...#ref"` to refresh the stale lock, per the arcade-shared extraction playbook). *Found by TEA during test design.*
- **Improvement** (non-blocking): the shared font already carries the A2-2 letter-spacing contract — SH2-2's Dev added `LayoutOptions { letterSpacing?: number }` to `layoutText` specifically for this story (SH2-2 deviation log: "SH2-4 consumes `letterSpacing` … so that story needs no font-module change"). So GREEN needs NO arcade-shared change: pass asteroids' A2-2 tracking as `layoutText(text, { letterSpacing }).` A constant CELL-space letterSpacing reproduces the old `0.1em × px` screen tracking at every size once the glyph geometry is scaled by `px/CELL_H` (do not assume spacing must scale with the run). *Found by TEA during test design.*
- **Improvement** (non-blocking): the migration removes text-as-string from the canvas API (`fillText` → stroked `layoutText` geometry), so four existing suites that observe text via `ctx.fillText` needed TEA surgery in RED: `tests/font.test.ts` **retired** (it pins the deleted TTF loader + imports the doomed module), `tests/render-hud.test.ts` + `tests/margin-mask.render.test.ts` **repointed** to the `layoutText` seam, `tests/render-wiring.test.ts` loader-wiring assertion **inverted**. Dev/Reviewer: the string-content contract now lives at the `layoutText` boundary, not `fillText`. Recommend mirroring tempest's structure (local `src/shell/font.ts` → `export * from '@arcade/shared/font'`; `render.ts` imports `layoutText`/`CELL_H` from `./font`) so the mock seam holds. *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): the `@arcade/shared` pin is a **provisional commit ref** (`#f9676be`, the SH2-3 HEAD), not a version tag — chosen because the only tag with `/font` (`v0.6.0`) is SH2-2-only and lacks the `_` glyph asteroids' initials echo needs, and SH2-3 is merged to arcade-shared `develop` but untagged. Affects `asteroids/package.json` (+lock). At SH2 epic close this must be re-pinned to a release tag + version bump (mirrors tempest's PIN-1). Recommend cutting arcade-shared **v0.7.0** at SH2-3 so the whole cabinet (tempest v0.6.0, asteroids f9676be) can converge on one tag. *Found by Dev during implementation.*
- **Improvement** (non-blocking): confirmed TEA's read — the shared font needed **no change**: `layoutText(text, { letterSpacing })` already exists (SH2-2), and a constant cell-space `letterSpacing = HUD_TRACKING_EM * CELL_H` reproduces asteroids' old `0.1em × px` screen tracking at all three sizes once glyphs scale by `px/CELL_H`. The old per-run `ctx.letterSpacing` values captured in RED (`2.20/1.60/4.80px`) confirm the mapping. No forward action. *Found by Dev during implementation.*

### Reviewer (code review)
- **Question** (non-blocking): the `@arcade/shared` pin is a provisional commit ref (`#f9676be`) — re-confirming Dev's finding. At SH2 epic close, re-pin to a release tag + bump; the clean fix is to cut arcade-shared **v0.7.0** at SH2-3 so tempest (v0.6.0) and asteroids converge on a tag, closing the cabinet's mixed-pin state. Affects `asteroids/package.json` (+lock) and the SH2 epic-release checklist. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the high-score `name` field remains validated only as `typeof name === 'string'` (shared `isHighScoreRow`), so a tampered localStorage row could feed `layoutText` characters the font lacks → silent blank glyphs. In-code names are always uppercase A–Z, so no live bug, but now that FOUR cabinets stroke from the shared font this is worth a dedicated hardening story. Affects `arcade-shared/src/highscore.ts`. Out of scope for SH2-4 (TEA-flagged). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Retired `tests/font.test.ts` + repointed the text-observation seam of render-hud / margin-mask (and trimmed render-wiring) from `fillText` to a `layoutText` module-mock**
  - Spec source: session ACs, AC-1
  - Spec text: "asteroids renders all HUD/framing text via @arcade/shared/font layoutText + a canvas stroke; loadVectorFont and every ctx.fillText/ctx.font text path are removed."
  - Implementation: deleted font.test.ts (it pinned the deleted loader); render-hud.test.ts + margin-mask.render.test.ts now observe text at the layoutText seam via `vi.mock('../src/shell/font')`; render-wiring's `loadVectorFont` assertion dropped.
  - Rationale: the migration removes text-as-string from the canvas API, so a fillText recorder can no longer see which text was drawn — the only post-migration seam where text is identifiable as text is the layoutText boundary. `vi.mock` is new to this suite but is standard vitest.
  - Severity: minor
  - Forward impact: the string-content contract now lives at the layoutText seam, not fillText. The mocks assume render imports `layoutText` from `./font` (tempest precedent); if Dev imports the package directly the mocks won't intercept and would false-fail — mirror tempest (local `font.ts` re-exports `@arcade/shared/font`).
- **Visual/coordinate fidelity (glyph shape, scale, alignment, glow) not unit-tested — deferred to Dev's manual run + Reviewer**
  - Spec source: session AC-3 + epic render guardrail
  - Spec text: "…a manual run confirms the HUD reads correctly."
  - Implementation: tests pin MECHANISM (layoutText used, tracking via opts, no fillText/ctx.font) and string content; they assert no glyph coordinates, font scale, alignment offsets, or glow.
  - Rationale: arcade has no render surface in a node env (house convention: the shell is verified by running the game); position/size/glow are eyeball criteria at the dev server, per the epic guardrail. Pixel-geometry unit tests would over-couple and can't run headless.
  - Severity: minor
  - Forward impact: Dev must confirm the HUD/attract/game-over text reads correctly at http://localhost:5275/asteroids/ (the AC-3 manual half); Reviewer verifies the intended TTF-face → glowing-stroke-vector visual change landed.
- **`font-layout.test.ts` requires a positive `letterSpacing` on EVERY laid-out run — stricter than AC-3's literal wording**
  - Spec source: session AC-3 (the A2-2 concern)
  - Spec text: "asteroids' letter spacing is preserved via layoutText opts."
  - Implementation: the suite asserts every `layoutText` call in a frame carries `opts.letterSpacing > 0`, not merely that spacing exists on some run.
  - Rationale: the old `drawText` applied `0.1em × px` tracking to every run and the caps-only face reads cramped at zero; requiring positive, consistent spacing per run also guards against a measure-with-0 / draw-with-N mismatch that would misalign centred/right text.
  - Severity: minor
  - Forward impact: Dev must pass the same positive letterSpacing for a run's measurement and its draw. If some run ever legitimately needs zero tracking, this per-run predicate must be relaxed.
- **RED runs without the dependency re-pin; resolving `@arcade/shared/font` is Dev's GREEN step**
  - Spec source: context Technical Approach / Playbook
  - Spec text: "Consume, don't change, the shared font: pin @arcade/shared at a git-URL ref… No edits to arcade-shared in this story."
  - Implementation: TEA did not touch package.json / package-lock; the RED tests avoid importing `@arcade/shared/font` (they mock the local `./font` seam), so they collect and run against the current v0.5.0 pin without ENOENT.
  - Rationale: re-pinning is Dev's GREEN work (AC-1 "imports @arcade/shared/font at a pinned ref"); keeping RED independent of an install step keeps the signal purely behavioral.
  - Severity: minor
  - Forward impact: Dev must re-pin to a ref ≥ SH2-3 and reinstall (see the blocking Delivery Finding) before the migrated render.ts can import layoutText; only then do the mocked seams exercise the real module in GREEN.

### Dev (implementation)
- **Narrowed TEA's `font-migration.test.ts` letterSpacing source-scan from `/\bletterSpacing\b/` to `/ctx\.letterSpacing/`**
  - Spec source: `tests/font-migration.test.ts` (TEA), AC-3
  - Spec text: the assertion forbade the bare word `letterSpacing` anywhere in render.ts ("render.ts still sets ctx.letterSpacing")
  - Implementation: changed the regex to match the ctx property only. The `layoutText(text, { letterSpacing })` opt key legitimately contains the word "letterSpacing", so the bare-word scan was **unsatisfiable** — it contradicted AC-3 ("letter spacing preserved via layoutText opts") and TEA's own `font-layout.test.ts` (which requires `layoutText` to be called with `letterSpacing`). The runtime `letterSpacingSets` assertions (font-migration group 1 + font-layout) remain the real guard that `ctx.letterSpacing` is never set.
  - Rationale: a test that no correct implementation can pass is a defect; per spec-authority, the AC outranks the test. Narrowing to `ctx.letterSpacing` preserves the intent (no canvas text-API usage) and matches the sibling `/\bctx\.font\b/` check.
  - Severity: minor
  - Forward impact: none — coverage is unchanged in substance (runtime assertions still prove no ctx.letterSpacing); Reviewer should confirm the narrowing wasn't a weakening.
- **Isolated the HUD (now stroked) from `tests/render.test.ts` ship/debris stroke-count assertions (7 tests TEA did not repoint)**
  - Spec source: `tests/render.test.ts` (pre-existing A-5/A2-5/A-21 coverage) vs AC-1
  - Spec text: these tests count `segments`/`strokeAlphas` from a full `render()` to isolate ship silhouette and ship/saucer debris, relying on HUD text being an invisible `fillText` no-op.
  - Implementation: the migration makes HUD text stroke real geometry, contaminating those counts. Fixes: silhouette test isolates the ship via segment symmetric-difference (HUD + identical seeded geometry cancels); debris count tests take the delta against the debris-free frame (identical HUD cancels); the "draws nothing" tests now assert no stroke commits below full alpha (debris strokes at a fade alpha `<1`, the HUD at `globalAlpha 1`); fade tests compare the min recorded alpha. All preserve the original intent.
  - Rationale: TEA repointed render-hud/margin-mask but missed render.test.ts, which also drives full `render()`; the GREEN gate requires the whole suite green. AC (story scope) outranks the pre-existing test assumptions.
  - Severity: minor
  - Forward impact: one residual — the absolute "empty debris → 0 total strokes" guard became "no sub-1.0-alpha stroke" (still catches a phantom debris line drawn at a fade alpha). Reviewer should confirm the debris coverage is not weakened.
- **Pinned `@arcade/shared` to a commit (`#f9676be`) rather than cutting an arcade-shared version tag**
  - Spec source: context Technical Approach / Playbook ("consume at a pinned ref; no arcade-shared edits")
  - Spec text: "Consume, don't change, the shared font… No edits to arcade-shared in this story."
  - Implementation: pinned the immutable reviewed SH2-3 commit; did NOT bump/tag arcade-shared (that would be an out-of-scope cross-repo change).
  - Rationale: SH2-4's repo is asteroids only; the `_`-bearing font exists solely on arcade-shared `develop` (untagged). A commit pin keeps the change within asteroids' scope while guaranteeing the reviewed code.
  - Severity: minor
  - Forward impact: provisional — re-pin to a release tag at SH2 epic close (see Delivery Finding); recommend cutting arcade-shared v0.7.0 then.
- **Deleted `public/fonts/Readme.txt` beyond AC-2's literal `.ttf`**
  - Spec source: session AC-2
  - Spec text: "public/fonts/*.ttf and the TTF loader in src/shell/font.ts are deleted"
  - Implementation: also removed the TTF's license `Readme.txt` (and the now-empty `public/fonts/` dir).
  - Rationale: it is the retired TTF's own non-commercial license doc — vestigial once the font is gone; keeping it would preserve a dead license file for a removed asset. Matches the SH2-2 precedent (Reviewer accepted the identical deletion in tempest).
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA: repointed the text-observation seam (font.test.ts retired; render-hud/margin-mask repointed; render-wiring trimmed)** → ✓ ACCEPTED by Reviewer: sound. The migration removes text-as-string from the canvas API, so `fillText` can no longer observe "which text was drawn"; the layoutText boundary is the only post-migration seam. The mocks assume `render.ts` imports `layoutText` from `./font` — which Dev implemented (render.ts:40), so the seam holds.
- **TEA: visual/coordinate fidelity deferred to manual run + Reviewer** → ✓ ACCEPTED by Reviewer: sound and correct — arcade has no headless render surface; I verified the visual via a dev-server screenshot (legible ASTEROIDS/PUSH START/scores).
- **TEA: `font-layout.test.ts` requires a positive letterSpacing on EVERY run (stricter than AC-3)** → ✓ ACCEPTED by Reviewer: sound. Dev passes a constant `GLYPH_TRACKING` (2.4) to every `drawText`→`layoutText` call, so every run is tracked; the per-run predicate also guards against a measure/draw spacing mismatch. Faithful to the caps-only face's cramped-at-zero reality.
- **TEA: RED runs without the dependency re-pin** → ✓ ACCEPTED by Reviewer: sound sequencing — the RED tests mock `./font` and avoid importing the package, so they collect against v0.5.0; Dev did the re-pin in GREEN as designed.
- **Dev: narrowed the letterSpacing source scan to `/ctx\.letterSpacing/`** → ✓ ACCEPTED by Reviewer: correct — the original `/\bletterSpacing\b/` was unsatisfiable because AC-3 mandates `layoutText(text, { letterSpacing })` (the opt key contains the word), and it contradicted TEA's own font-layout test. The runtime `letterSpacingSets` assertions remain the real guard that `ctx.letterSpacing` is never set; verified NOT a weakening.
- **Dev: isolated the HUD from render.test.ts ship/debris assertions (7 tests)** → ✓ ACCEPTED by Reviewer: sound and necessary (the GREEN gate requires the whole suite green; TEA missed this suite). Delta cancels the identical HUD; the sub-1.0-alpha filter and min-alpha are robust to the stub's no-op save/restore; symmetric-difference isolates the ship. One residual (absolute empty-debris count → sub-1.0-alpha absence) is documented and low-risk (real debris always strokes at fade alpha `<1`). Not a material weakening.
- **Dev: pinned a commit (`#f9676be`) rather than cutting a version tag** → ✓ ACCEPTED by Reviewer: correct scope call — tagging/bumping arcade-shared is out of asteroids' declared repo scope, and the `_`-bearing font exists only on untagged `develop`. Provisional; re-anchored as a Delivery Finding for epic close.
- **Dev: deleted `public/fonts/Readme.txt` beyond AC-2's literal `.ttf`** → ✓ ACCEPTED by Reviewer: correct — it is the retired TTF's own license readme, vestigial once the asset is gone. Matches the SH2-2 precedent.
- No undocumented deviations found: the diff matches the logged intent (dep re-pin, font.ts re-export, drawText stroke migration, TTF/loader removal, and the two test-suite corrections — all logged).