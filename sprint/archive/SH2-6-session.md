---
story_id: SH2-6
jira_key: SH2-6
epic: SH2
workflow: tdd
---
# Story SH2-6: battlezone — migrate HUD/framing text off the Vector Battle TTF onto @arcade/shared/font stroke-vectors (evolves bz2-2)

## Story Details
- **ID:** SH2-6
- **Jira Key:** SH2-6
- **Epic:** SH2
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p2
- **Stack Parent:** none

## Branch & Repository
- **Repository:** battlezone (gitflow — feat → origin/develop)
- **Branch Strategy:** gitflow (feat/SH2-6-battlezone-font-migration)
- **Branch:** feat/SH2-6-battlezone-font-migration (tracking origin/develop)
- **Note:** Branch was cut from origin/develop with origin/develop 4 commits ahead of local develop; branch is current with origin/develop. Push with explicit `-u` flag.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T12:37:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T11:45:56Z | 2026-07-10T11:49:03Z | 3m 7s |
| red | 2026-07-10T11:49:03Z | 2026-07-10T12:14:14Z | 25m 11s |
| green | 2026-07-10T12:14:14Z | 2026-07-10T12:31:31Z | 17m 17s |
| review | 2026-07-10T12:31:31Z | 2026-07-10T12:37:58Z | 6m 27s |
| finish | 2026-07-10T12:37:58Z | - | - |

## Sm Assessment

**Setup complete; story is ready for RED.** Rationale:

- **Story selection:** SH2-6 chosen explicitly by the user (`/pf-work SH2-6`). It is the natural next step in the SH2 font-convergence epic — the fourth and last per-game migration (tempest SH2-2 → asteroids SH2-4 → star-wars SH2-5 → **battlezone SH2-6**). Unblocked: the glyph-audit foundation (SH2-3) and all three prior game migrations are archived and approved.
- **Workflow:** `tdd` per the story YAML (3 pts) — phased: setup → **red** → green → review → finish. Next phase is **red**, owner **tea** (O'Brien).
- **Branch:** `feat/SH2-6-battlezone-font-migration`, cut from a freshly-fetched `origin/develop` in the `battlezone/` subrepo (verified 0/0 in sync). battlezone's local `develop` was 4 commits behind origin — a stale-ref trap I avoided by branching off `origin/develop` directly rather than the checked-out local develop. Push with an explicit `-u` (branch tracks origin/develop, so a bare `git push` would target develop and be hook-blocked).
- **Context quality:** Story context (context-story-SH2-6.md) seeded with the full accumulated playbook: SH2-3/4/5 archive pointers, the `#v0.5.0 → #v0.7.0` dependency re-pin (v0.5.0 has no `/font` subpath; Dev's GREEN step), the three-game `./font` re-export seam precedent (= the vi.mock text seam), the comment-inclusive AC scan rule, and the exact migration sites already located this session (font.ts loader; main.ts:40/77; render.ts fillText at 113/196/218/305/370).
- **Two carried-forward blocking specifics routed to TEA/Dev, not solved by me:**
  1. **▲ lives icon (AC-2):** `drawLives` at `render.ts:218` draws U+25B2 via `ctx.fillText('▲'.repeat(lives))`. The SH2-3 audit deliberately omits ▲ as an *icon, not typography* — it must become a **bespoke stroked triangle**, NOT a layoutText call, or the lives row goes blank when the TTF is deleted.
  2. **Re-measure every TTF-tuned pixel gap:** SH2-5 shipped a [HIGH] defect (wave numeral drawn inside its label) by trusting an inherited TTF-tuned constant; the ROM stroke face has fixed 24-cell advance and full-nominal cap height. The SH2-5 Reviewer explicitly flagged battlezone's render.ts for this. Every gap/offset must be derived from `layoutText(...).width`, not inherited numbers.
- **Risks routed, not solved:** dep-pin move, render-test stroke-count breakage, and the pixel re-measure all belong to TEA/Dev; the SH2-4/5 archives document the playbook. No blocking findings carried into setup.
- **Jira:** disabled for this project (local YAML tracking) — claim explicitly skipped.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-pt tdd story; the migration DELETES the text-as-string canvas signal, so the contracts must be pinned at the only surviving seams (the layoutText boundary, a recording ctx, fs/source scans, the dep-pin probe) before Dev touches render.ts. AC-2 also introduces a battlezone-only contract (the ▲ lives icon becomes a bespoke stroked triangle) with a real blank-row failure mode.

**Test Files:**
- `battlezone/tests/shell/font-migration.test.ts` — mechanism (every HUD draw — drawScore/drawScreenLines/drawLives/drawMessage/drawControlIndicator/drawPauseOverlay — never touches ctx.fillText or ctx.font; drawScreenLines strokes its non-blank lines as geometry) + comment-inclusive src-wide scans (no .ttf, no FontFace/document.fonts, no loadVectorFont, no UI_FONT_FAMILY, no 'Vector Battle') + render.ts imports layoutText through the local `./font` seam (not the package) + font.ts is the shared re-export + main.ts no longer boots a font load. **(22 tests)**
- `battlezone/tests/shell/font-text-seam.test.ts` — `vi.mock('../../src/shell/font')` seam: pins WHICH strings each surface hands to layoutText (score value, the ENEMY IN RANGE alert, GAME OVER/PRESS START screen lines, the `NAME  SCORE` high-score row), plus per-run POSITIVE letterSpacing and a caps-only handover (mixed-case input — a tampered high-score name — is upper-cased before the caps-only face). **(8 tests)**
- `battlezone/tests/shell/font-shared-resolution.test.ts` — dynamic-import probe (via `@vite-ignore` variable specifier): `@arcade/shared/font` must resolve AND cover battlezone's audited set (A–Z, 0–9, space, `-`, `/` — NO comma; battlezone renders un-grouped digits), with `GLYPH_CHARS` carrying `-`/`/` and real layout of `DUAL-TREAD   ESC PAUSE` + `E / D`. This is the re-pin forcing test. **(1 test)**
- `battlezone/tests/shell/lives-triangle.test.ts` — AC-2: `drawLives` draws no fillText, strokes a bespoke triangle whose geometry SCALES with the tank count (0→none, 3→more than 1), strokes rather than fills, and NEVER routes the ▲ through layoutText. **(4 tests)**

**Test Surgery** (retired-seam suites):
- **Deleted** `tests/shell/font.test.ts` (bz2-2: `UI_FONT_FAMILY==='Vector Battle'` + loadVectorFont degradation) and `tests/shell/hud-font.test.ts` (bz2-2: `ctx.font` contains 'Vector Battle'+monospace) — both encode the exact TTF contract this story REVERSES and import symbols the migration deletes; not repointable.
- **Repointed** `tests/shell/hud-palette.test.ts` — the bz1-12 bichromatic contract (red score/alert, green world) SURVIVES; its observation seam moved from the fill seam (fillText→fillStyle) to the stroke seam (stroke()→strokeStyle). World-green tests were already at the stroke seam. **(5 tests: 3 RED, 2 green invariants)**
- **Repointed** `tests/shell/pause-overlay.test.ts` — the bz2-5 pause/resume/backdrop contracts SURVIVE; text observation moved to the mocked layoutText seam (names ESC/resume, non-empty hint), the dimming-backdrop fillRect check is unchanged, and the retired 'Vector Battle' font-family assertions were dropped. **(4 tests: 3 RED, 1 green invariant)**

**Tests Written:** 35 new tests + 9 repointed across 6 files, covering 4 ACs.
**Status:** RED (failing — ready for Dev). Verified via testing-runner twice (RUN_ID `SH2-6-tea-red`, `SH2-6-tea-red-2`): **41 failing / 716 green / 0 regressions** outside the six target files. After the first run I added a `UI_FONT_FAMILY` link-compat shim to the three `./font`-mock suites (vitest errors at collection if a mocked module omits a name the pre-migration graph imports); they now fail on ASSERTIONS, not module load. The dep-pin probe is deliberately isolated in its own single-test file so the v0.5.0 unresolvable-subpath failure cannot silence siblings (SH2-5 precedent). No RED-vacuous passes — every caps/tracking loop is guarded by `calls.length>0` (fails pre-migration), and the lives "never via layoutText" guard is paired with `segments>0`.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | recording ctx uses the house `as unknown as CanvasRenderingContext2D` narrowing; resolution probe types the module via a `SharedFontModule` interface — no `as any` | enforced in test code |
| #4 null/undefined | seam mock reads `opts?.letterSpacing ?? 0` (nullish, not `\|\|`) | enforced in test code |
| #5 module/declarations | `render.ts imports layoutText through './font'` — forbids a direct `@arcade/shared/font` import (keeps the vi.mock seam sound); font.ts must be the shared re-export | failing |
| #8 test quality | self-check: no vacuous assertions; caps/tracking loops guarded by `calls.length>0`; mock shape matches the real export surface (layoutText/CELL_W/CELL_H/hasGlyph/charGlyph/GLYPH_CHARS verified against `arcade-shared/src/font.ts`) | enforced |
| #10 input validation | caps-only handover: a tampered mixed-case localStorage high-score name must be upper-cased before layoutText or glyphs drop (SH2-4/5 hardening note) | failing |
| Project: core purity | migration is shell-only; no SH2-6 test touches `src/core` (the pure text/screens suites are untouched) | enforced |
| Project: AC-3 comment-inclusive scan | all four src-wide scans read raw file text (comments included) | failing |

**Rules checked:** 7 applicable of 13 lang-review rules have coverage; the rest (enums #3, React #6, async #7, build-config #9, error-handling #11, perf #12, generic #2) have no surface in this shell-only diff — the only async path (loadVectorFont) is being DELETED, and the sole dynamic import (the probe) is awaited.
**Self-check:** 0 vacuous tests (the lives "never via layoutText" forward-guard is paired with a `segments>0` guard, so it fails RED and bites a lazy GREEN).

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/package.json` + `package-lock.json` — @arcade/shared re-pinned `#v0.5.0` → `#v0.7.0` (the first tag carrying the `/font` subpath + the full SH2-3 glyph set incl `-`/`/`). Pinned the TAG directly — no provisional-commit debt; forced the stale lock to re-resolve with `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.7.0"` (TEA's blocking dep-pin finding resolved).
- `battlezone/src/shell/font.ts` — TTF FontFace loader deleted (`UI_FONT_FAMILY`, `FONT_URL`, `loadVectorFont`); now `export * from '@arcade/shared/font'` — the `./font` vi.mock seam, mirroring tempest/asteroids/star-wars.
- `battlezone/src/shell/render.ts` — new private `drawText(ctx, text, x, baseY, sizePx, align, color)` helper strokes `layoutText` glyph geometry through battlezone's single-pass glow: upper-cases at the boundary (caps-only face), constant cell-space tracking `GLYPH_TRACKING = 0.1 × CELL_H`, scale `px/CELL_H`, baseline y-flip, horizontal align via the returned `width`. All five `ctx.font`/`ctx.fillText` sites (drawScore/drawScreenLines/drawMessage/drawControlIndicator + the old drawLives text) replaced. **drawLives** now strokes a bespoke up-triangle per tank (apex + two base corners + `closePath`), NOT `layoutText` (AC-2). Bichromatic preserved: score/alert default `HUD_RED` (stroked), screens/lives/control `GLOW_GREEN`. All 'Vector Battle' comments scrubbed.
- `battlezone/src/main.ts` — `loadVectorFont` import + `void loadVectorFont()` boot + its 'Vector Battle' comment removed (no async font asset remains).
- `battlezone/public/fonts/` — deleted (VectorBattle-e9XO.ttf + Readme.txt).
- `battlezone/tests/arcade-shared-pipe.test.ts` — version-pin assertion `0.5.0` → `0.6.0` (the runtime `SHARED_VERSION` constant reads 0.6.0 at tag v0.7.0; the version still changed, so the re-resolution proof holds), with an explanatory comment.

**Tests:** 757/757 passing (GREEN) — all SH2-6 suites + pre-existing, 0 regressions (testing-runner RUN_ID `SH2-6-dev-green-2`). `npm run build` (tsc + vite) green.

**Manual run (AC-4):** dev server at `http://localhost:5276/` (battlezone's pinned port, base `/`), verified headless via Playwright screenshots + clean console (0 errors / 0 warnings):
- **Attract:** BATTLEZONE marquee + PRESS START as glowing green stroke-vectors; score `0` in red top-right.
- **Playing HUD:** lives render as bespoke green STROKED up-triangles (AC-2 — not blank, not a font glyph); score red top-right (not clipped); `DUAL-TREAD   ESC PAUSE` control indicator (with the `-` glyph + multi-space gap); radar/gunsight/horizon green.
- **Pause:** PAUSED header + the two-column keybind card (ESC→RESUME, E / D→LEFT TREAD, …) with the `/` glyph rendering, over a dimming backdrop.
- **Pixel gaps re-measured (SH2-5 lesson):** right/center/left alignment all derive from `layoutText(...).width`; nothing clipped or overlapping at 1200×800.

**Branch:** feat/SH2-6-battlezone-font-migration (pushed; now tracks origin/feat/SH2-6-battlezone-font-migration).

**Handoff:** To The Thought Police (Reviewer) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (757/757 tests, tsc+vite build clean, tree clean, HEAD==origin, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [EDGE] items) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [SILENT] item) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [TEST] item) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [DOC] item) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [TYPE] item) |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [SEC] item) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — domain covered personally (see [SIMPLE] item) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings — 13-check TS lang-review walked personally (see Rule Compliance) |

**All received:** Yes (1 spawned + 8 disabled; preflight clean)
**Total findings:** 0 confirmed blocking, 1 confirmed non-blocking (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The fourth and final per-game font migration. It mirrors the tempest/asteroids/star-wars pattern faithfully, and — critically — it AVOIDS the class of defect that produced SH2-5's [HIGH]: every text anchor is re-derived from `layoutText(...).width` rather than inheriting a TTF-tuned constant, and the result was eyeball-verified at :5276.

**Observations (9; all eight specialist domains covered personally since disabled):**

- [VERIFIED][EDGE] Alignment origins are re-measured, not inherited — the SH2-5 [HIGH] class is avoided. `drawText` computes `boxW = layoutText(text).width × (sizePx/CELL_H)` and anchors right at `x - boxW`, centre at `x - boxW/2` (`render.ts` drawText). drawScore right-aligns at `w - size` (`render.ts:143`) — the manual run confirmed the red score sits comfortably inside the top-right edge, not clipped. The lives-row origin (`size`) and control-indicator baseline (`h - size`) were likewise re-derived from the old textBaseline anchors + one cap height. Evidence: `render.ts` drawScore/drawLives/drawControlIndicator + the AC-4 screenshots.
- [VERIFIED][SILENT] No swallowed errors introduced — the deleted `loadVectorFont` took its `try/catch (console.warn + return false)` with it; `layoutText`/`charGlyph` cannot throw on unknown input (an unknown char returns `{strokes: [], advance: 24}`), so `drawText` never needs a catch. No new catch sites (lang-review #11 clean). Evidence: `font.ts` (loader deleted), `render.ts` drawText.
- [VERIFIED][TEST] The 35 new + 9 repointed tests pin mechanism, strings, caps, tracking, the dep-pin, and the bespoke-triangle scaling; no vacuous assertions — every caps/tracking loop is guarded by `calls.length>0` (fails RED) and the lives "never via layoutText" guard is paired with `segments>0`. The `arcade-shared-pipe` assertion (`0.5.0 → 0.6.0`) is still a real re-resolution proof (the version *changed*). Preflight re-ran all 757 green. Evidence: `tests/shell/*`, `tests/arcade-shared-pipe.test.ts`.
- [VERIFIED][DOC] Every reworded comment is accurate against the code: `font.ts`'s re-export header, `render.ts`'s drawText/GLYPH_TRACKING/drawLives (▲-is-an-icon) blocks, `main.ts`'s removed-boot. No stale `'Vector Battle'`/FontFace/loadVectorFont/UI_FONT_FAMILY reference survives anywhere in `src/` (comment-inclusive scans in font-migration.test.ts enforce it, and I re-grepped). Evidence: `render.ts`, `font.ts`, `main.ts`.
- [VERIFIED][TYPE] No type escapes added: `drawText`'s `align` is a closed `'left'|'center'|'right'` union, `color: string`, and the `layoutText` return is destructured with no cast; `export * from '@arcade/shared/font'` re-exports types+values legally under isolatedModules (layoutText IS a runtime value). No `as any`/`@ts-ignore`/non-null in the source diff. Evidence: `render.ts` drawText, `font.ts`.
- [VERIFIED][SEC] The attack surface shrinks — the runtime FontFace fetch of a static asset is gone; no new external input path. The high-score name path (`attractLines` `${name}  ${score}` → drawScreenLines → drawText) is `toUpperCase()`-normalised, and an unknown/tampered character yields a blank-advance glyph (gappy, never a crash or injection). No secrets. Evidence: `render.ts` drawText `toUpperCase`, `core/screens.ts` row.
- [VERIFIED][SIMPLE] No dead code left behind — `hudFont`/`UI_FONT_FAMILY`/`FONT_URL`/`loadVectorFont` are all deleted with no dangling importers (src-wide scans + preflight prove it). One shared `drawText` replaces four near-identical layoutText→stroke loops (matches asteroids' precedent) rather than copy-pasting. Evidence: `font.ts`, `render.ts`, `main.ts`.
- [VERIFIED][RULE] The 13-check TS lang-review was walked file-by-file over the diff — all applicable checks compliant. See `### Rule Compliance`.
- [LOW][EDGE] The populated high-score board and the game-over screen were NOT visually confirmed in Dev's AC-4 manual run (attract-with-empty-board, playing HUD, and pause WERE). Both reuse the exact `drawScreenLines` centred path that rendered BATTLEZONE/PRESS START correctly, so the risk is low; the one unconfirmed detail is the `${name}  ${score}` two-space column gap, which is already TEA's flagged eyeball item. **Non-blocking** — logged as a Delivery Finding for the epic-close eyeball sweep. Location: `render.ts` drawScreenLines / `core/screens.ts`.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + the repo core-purity rule (battlezone/CLAUDE.md). No `.claude/rules/` or `SOUL.md` exist.

| Check | Instances examined | Result |
|-------|-------------------|--------|
| #1 type-safety escapes | every changed src file + the test proxies: no `as any`, no `@ts-ignore`, no new `!`; tests use the house `as unknown as CanvasRenderingContext2D` / `Record<string\|symbol, unknown>` proxy narrowing | compliant |
| #2 generic/interface | `drawText` `align` closed union; `readonly SceneSegment[]` consumed read-only; no `Record<string,any>`/`Function` | compliant |
| #3 enums | none in diff | n/a |
| #4 null/undefined | `opts?.letterSpacing ?? 0` (nullish, tests); `Math.max(0, lives)` guards negative; no `\|\|`-on-nullable | compliant |
| #5 module/declarations | `export * from '@arcade/shared/font'` ships the value module (intended — layoutText is runtime); render.ts imports through `./font` (mock seam preserved); bundler resolution, no `.js` issue | compliant |
| #6 React/JSX | no .tsx | n/a |
| #7 async/promises | only the DELETION of an async path (loadVectorFont); no new async | compliant |
| #8 test quality | no `as any` in assertions; mock shape matches the real export surface (layoutText/CELL_W/CELL_H/hasGlyph/charGlyph/GLYPH_CHARS); no `.only`/`.skip` (preflight) | compliant |
| #9 build/config | tsconfig untouched; strict stays on (`tsc --noEmit` passes) | compliant |
| #10 input validation | high-score rows still guarded by `isHighScoreRow` at the storage boundary (main.ts unchanged); drawText `toUpperCase` + blank-glyph fallback for unknown chars | compliant |
| #11 error handling | no new catch sites; the deleted catch went with its whole code path | compliant |
| #12 performance/bundle | text stroking adds a few glyphs/frame of `lineTo` (noise next to the wireframe workload); shared font is one small module (dist 31 KB, gzip 11 KB per preflight); no barrel bloat | compliant |
| #13 fix-regressions | n/a — first review, no rework diff yet | n/a |
| core purity (CLAUDE.md) | `src/core` untouched; the migration is shell-only; no DOM/time/random enters core | compliant |

### Devil's Advocate

Assume this diff is broken and argue it. The migration swaps a metrics system, and SH2-5 proved exactly that class of break is real: a gap "tuned by eyeball" outlived the face it was tuned against and drowned the wave numeral inside its label. So where was battlezone tuned that way? The answer, this time, is nowhere fatal — every text anchor is re-derived from `layoutText(...).width` at draw time, not a frozen constant, and the score's right edge (`w - size`) plus the manual-run screenshot confirm no clipping. But push harder. The score baseline is now `2·size` (caps fill the full nominal size, vs the TTF's ~0.7), so a future "make the HUD bigger" tweak has less headroom before the score crowds the radar band — currently clear, but the margin shrank. The lives triangles are hand-rolled geometry with magic ratios (`0.72·size` wide, `0.36·size` gap) eyeballed at a single 1200×800 viewport; because every dimension scales with `min(w,h)` they stay proportional, but the *look* at an extreme aspect ratio is unverified. The populated high-score board and the game-over screen were never shown — a very long entrant name centred via `drawScreenLines` would run off a narrow viewport with no wrapping, though the retired TTF path had the identical no-wrap behaviour, so it is not a regression. A tampered `localStorage` high-score name with lowercase or symbols: `toUpperCase()` handles case, unknown symbols become blank-advance glyphs — a gappy name, never an error (the tracked SH2-4 hardening note, unchanged). `drawText` also leaks canvas state (shadowBlur/lineWidth/strokeStyle) without save/restore — but every sibling draw function sets its own state before drawing, matching the pre-existing convention, so nothing depends on the leaked state. The `closePath`-inside-a-loop triangle looked suspicious, but it is correct: each `moveTo` starts a fresh subpath and `closePath` seals only the current triangle. And `SHARED_VERSION` reading `0.6.0` at tag `v0.7.0` is a genuine upstream lag — correctly captured as a finding, not hidden. None of these draw blood at the blocking level; the one class that felled SH2-5 is precisely the one this diff engineered around.

**Data flow traced:** GameState numbers → pure formatters (`core/hud`/`core/screens`, unchanged) → drawScore/drawScreenLines/drawMessage → `drawText` → `layoutText(text.toUpperCase(), {letterSpacing: 2.4})` (pure, from `./font` = @arcade/shared/font v0.7.0) → scaled/aligned stroke tracing on ctx. Tampered high-score name: `isHighScoreRow` shape-checks at the storage boundary (main.ts), drawText uppercases, unknown chars return an empty-stroke blank advance — silent gap, no crash. Safe.

**Pattern observed:** the `./font` re-export seam + a shared `drawText` stroke helper matches asteroids/star-wars exactly (`src/shell/font.ts:13` `export * from '@arcade/shared/font'`; `render.ts` imports layoutText from `./font`, never the package) — the cabinet's fourth identical seam.

**Error handling:** the only error path in the file (loadVectorFont's FontFace catch) was deleted with its whole code path; `layoutText`/`charGlyph` are total functions on any string input.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (blocking): battlezone pins `@arcade/shared@github:slabgorb/arcade-shared#v0.5.0`, whose exports map has NO `/font` subpath — nothing font-related resolves until the pin moves, and `font-shared-resolution.test.ts` fails until it does. Tag **v0.7.0** already exists (asteroids + star-wars pin it) and carries the full SH2-3 glyph set, including the `/` glyph added specifically for battlezone's pause card. Dev GREEN should pin `#v0.7.0` directly (no provisional-commit debt); if the npm lock goes stale, force with `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.7.0"`. Affects `battlezone/package.json` + `package-lock.json`. *Found by TEA during test design.*
- **Gap** (blocking): the lives ▲ icon is confirmed at `battlezone/src/shell/render.ts:218` (`ctx.fillText('▲'.repeat(Math.max(0, lives)), size, size)`). U+25B2 is NOT a shared-font glyph (SH2-3 icon ruling) — it must be redrawn as a bespoke STROKED triangle, one per tank, NOT routed through layoutText, or the lives row renders blank once the TTF is gone. Pinned by `lives-triangle.test.ts`. Affects `battlezone/src/shell/render.ts` (drawLives). *Found by TEA during test design.*
- **Improvement** (non-blocking): RE-MEASURE the pixel gaps (SH2-5 [HIGH] lesson). battlezone's text draws scale off a per-call `size` (`Math.round(min(w,h)*0.045)` etc.) rather than fixed TTF constants, so the risk is lower than star-wars' fixed `waveLabelGap` — BUT stroke caps fill the FULL nominal size (the TTF's caps were ~0.7), so the tight spots to eyeball/re-measure at `:5273` are: the score's right-alignment origin (`w - size`), the lives-row left origin (`size, size`) vs the new triangle width, `drawScreenLines` `lineHeight = size*1.6` at now-full-height caps, and `drawControlIndicator`'s bottom anchor. Derive any text-relative gap from `layoutText(...).width × (px/CELL_H)`. Affects `battlezone/src/shell/render.ts` (eyeball + re-measure at migration). *Found by TEA during test design.*
- **Improvement** (non-blocking): reproduce the bz2-2 HUD tracking with a constant cell-space `letterSpacing = 0.1 × CELL_H` on every layoutText run, scaling glyph geometry by `px/CELL_H` (SH2-4/SH2-5 confirmed). `font-text-seam.test.ts` pins a positive per-run letterSpacing; the exact value is a feel constant. Affects `battlezone/src/shell/render.ts` only. *Found by TEA during test design.*
- **Question** (non-blocking): the pause card and high-score row use runs of spaces for column alignment (`'ESC        RESUME'`, `` `${name}  ${score}` ``). layoutText advances the space glyph (24 cells) per space, so multi-space alignment survives structurally, but the column widths were eyeballed against the TTF's space advance. Dev should eyeball the pause card + high-score row alignment at `:5273`. Affects `battlezone/src/shell/render.ts` (PAUSE_LINES) / `core/screens.ts` (row format) — eyeball only; copy/columns are playtest-tunable. *Found by TEA during test design.*
- **Improvement** (non-blocking): SH2-6 is the LAST per-game migration — after it, all four canvas games render HUD text via `@arcade/shared/font`. tempest still pins v0.6.0 (per SH2-5 Dev finding); converging tempest → v0.7.0 remains the epic-SH2-close cleanup. Affects `tempest/package.json` (+lock) at epic close, not this story. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the shared lib's runtime `SHARED_VERSION` constant reads `'0.6.0'` at tag **v0.7.0** — the exported version string lags its `package.json`/git tag. Not a battlezone bug (I updated the pipe test to the real value), but arcade-shared should bump the `SHARED_VERSION` constant in lockstep with its tag at the next release so it stays a reliable pin marker. Affects `arcade-shared/src/index.ts` (the `SHARED_VERSION` constant) — a shared-lib/epic-close maintenance item, not this story. *Found by Dev during implementation.*
- **Improvement** (non-blocking): with battlezone migrated, all four canvas games now stroke HUD text from `@arcade/shared/font`; the shared single-pass stroke-glow now lives in four `drawText` helpers (asteroids/star-wars/battlezone) — SH2-8 (`@arcade/shared/glow`) is the natural home to absorb them. Affects the SH2-8 glow-extraction scope, not this story. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the populated high-score board and the game-over screen were not visually confirmed in Dev's AC-4 manual run (attract-with-empty-board, playing HUD, and pause were). Both reuse the exact `drawScreenLines` centred path that rendered BATTLEZONE/PRESS START correctly, so the risk is low — the one unconfirmed detail is the `${name}  ${score}` two-space column gap, which is already TEA's flagged eyeball item. Recommend a quick eyeball with a populated board + at game-over during the SH2-8/epic-close pass. Affects `battlezone/src/shell/render.ts` (drawScreenLines) / `battlezone/src/core/screens.ts` (row format) — non-blocking. *Found by Reviewer during code review.*

## Impact Summary

**Completion Status:** APPROVED for finish. All acceptance criteria met; both blocking findings resolved at implementation; non-blocking carry-forwards routed to epic-close.

### Resolved Blockers

**AC-1 (dep-pin):** `@arcade/shared` re-pinned from `#v0.5.0` → `#v0.7.0` (the first tag carrying the `/font` subpath + the full SH2-3 glyph set including `/` for battlezone's pause card). Dev forced-resolved the stale npm lock; no provisional-commit debt. ✓

**AC-2 (▲ lives icon):** `drawLives` at `render.ts:218` implemented as a bespoke STROKED up-triangle (one per tank, apex + base corners + closePath), NOT routed through layoutText. With the TTF deleted, the icon renders correctly as geometry (AC-2 test `lives-triangle.test.ts` 4 tests green). ✓

### Non-Blocking Carry-Forwards

**SHARED_VERSION lag:** `@arcade/shared/src/index.ts` runtime constant reads `'0.6.0'` at tag v0.7.0 (version string should bump in lockstep at next release). Logged as an upstream maintenance item for epic-close; Dev's `arcade-shared-pipe.test.ts` assertion updated to track the real value. 

**tempest v0.7.0 convergence:** tempest still pins v0.6.0 (per SH2-5 Dev finding). Converging all four games to v0.7.0 is deferred to epic-SH2-close cleanup (not SH2-6's scope). `tempest/package.json` upgrade is the next consolidation task.

**Eyeball items (low risk):** 
- **Populated high-score board + game-over screen:** AC-4 manual run verified attract, playing HUD, and pause; high-score board and game-over not visually confirmed. Both reuse the exact `drawScreenLines` centred layout that rendered BATTLEZONE/PRESS START correctly. One unconfirmed detail: the `${name}  ${score}` two-space column gap (already flagged by TEA). Recommend eyeball during SH2-8/epic-close pass (same routine as the glow absorption).
- **Extreme aspect ratios:** lives triangles (0.72·size width, 0.36·size gap) are hand-rolled with magic ratios eyeballed at 1200×800. Scales proportionally at other aspect ratios, but unverified at extremes (e.g. very narrow portrait). Risk deferred to playtest.

**SH2-8 glow absorption:** With battlezone migrated, all four canvas games now stroke HUD text via @arcade/shared/font with identical single-pass glow. Four `drawText` helpers (asteroids/star-wars/battlezone, mirrors battlezone's new private helper) are candidates for extraction to `@arcade/shared/glow`. Logged for SH2-8 scope.

### Key Metrics

| Metric | Result | Evidence |
|--------|--------|----------|
| Test suite | 757/757 passing (0 regressions) | vitest RUN_ID `SH2-6-dev-green-2`; 53 files passed |
| Build | tsc + vite green | `npm run build` ✓ dist/index.html + assets |
| Pixel gaps (SH2-5 lesson) | re-measured from layoutText().width | `drawText` helper computes anchors dynamically; score/lives/control-indicator/message baselines re-derived |
| Manual run (AC-4) | Verified attract, playing HUD, pause | dev server :5276 headless Playwright; clean console (0 errors/warnings) |
| Per-run tracking | letterSpacing > 0 applied; caps-only handover | font-text-seam.test.ts 8 tests pin strings + letterSpacing; drawText `toUpperCase()` before layoutText |
| Comment-inclusive scans | No TTF, FontFace, loadVectorFont, UI_FONT_FAMILY, 'Vector Battle' in src/ | font-migration.test.ts 22 tests enforce via raw-text regex |
| Dep-pin probe | v0.7.0 resolves @arcade/shared/font + GLYPH_CHARS coverage | font-shared-resolution.test.ts 1 test via @vite-ignore dynamic import |

### Branch Readiness

✓ Clean working tree  
✓ HEAD == origin/feat/SH2-6-battlezone-font-migration (6963928...)  
✓ Tracking origin/feat/SH2-6-battlezone-font-migration  
✓ Ready for PR to origin/develop (gitflow)  


## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Retired two bz2-2 test files instead of repointing them**
  - Spec source: context-story-SH2-6.md → "Test surgery expectation"
  - Spec text: "Existing battlezone render/HUD suites that observe text via ctx.fillText or count strokes will need TEA surgery (SH2-4 precedent: retire the TTF-loader test, repoint text-observation suites to the layoutText seam)"
  - Implementation: DELETED `tests/shell/font.test.ts` (`UI_FONT_FAMILY==='Vector Battle'` + loadVectorFont degradation) and `tests/shell/hud-font.test.ts` (`ctx.font` contains 'Vector Battle'+monospace).
  - Rationale: both encode the exact TTF contract the migration REVERSES and import symbols the migration deletes (UI_FONT_FAMILY, loadVectorFont) — they are not repointable; their replacement contracts (layoutText routing, caps, tracking) live in the new font-*.test.ts files.
  - Severity: minor
  - Forward impact: Dev deletes src/shell/font.ts's loader + UI_FONT_FAMILY and the main.ts boot; no test references them.
- **Visual / coordinate fidelity (glyph shape, scale, alignment, glow, exact placement) not unit-tested — deferred to Dev's manual run + Reviewer**
  - Spec source: session ACs, AC-4
  - Spec text: "vitest + vite build green; a manual run confirms the green-vector HUD reads correctly."
  - Implementation: tests pin MECHANISM (layoutText used, no text API, caps, tracking, dep-pin, bespoke-triangle scaling) + string content + the red/green palette split; NO glyph coordinates, font scale, alignment offsets, or glow assertions.
  - Rationale: house convention — the shell is verified by running the game (no render surface in the node env); pixel-geometry tests over-couple and cannot run headless. Mirrors SH2-2/4/5.
  - Severity: minor
  - Forward impact: the SH2-5 [HIGH] lived exactly in this deferred zone — Dev MUST eyeball HUD/attract/gameover/pause/message text at http://localhost:5273/ (AC-4's manual half) AND re-measure the pixel gaps (the score/lives/screen-line/control-indicator spots in the Delivery Finding); Reviewer verifies the TTF→stroke-vector change landed and re-measures (SH2-5 flagged battlezone's render.ts by name).
- **Bichromatic palette re-pinned to the STROKE seam (hud-palette.test.ts repointed fills→strokes)**
  - Spec source: context-story-SH2-6.md → "Test surgery expectation"; bz1-12 AC (carried by hud-palette.test.ts)
  - Spec text: "repoint text-observation suites to the layoutText seam"
  - Implementation: hud-palette.test.ts read the score/alert colour at fillStyle (fillText); post-migration text is stroked, so the red-score / green-world contract is now observed at strokeStyle (stroke()). The world-green tests were already at the stroke seam.
  - Rationale: the bz1-12 contract must SURVIVE the migration; only the observation seam moves. Repointing keeps the guard live (it fails RED until Dev strokes the score/alert in HUD_RED).
  - Severity: minor
  - Forward impact: Dev must stroke score/alert glyphs in HUD_RED (not green); the palette split is preserved through the migration.
- **Per-run positive letterSpacing + caps-only handover required — stricter than the AC's literal wording**
  - Spec source: sprint/epic-SH2.yaml SH2-6 description ("Behaviour-preserving except the intended TTF -> stroke-vector visual change")
  - Spec text: no explicit tracking/caps clause for battlezone
  - Implementation: font-text-seam requires `opts.letterSpacing > 0` on EVERY run, and every string `=== toUpperCase()` before layoutText.
  - Rationale: the bz2-2 HUD read with tracking; the caps-only VGMSGA face has no lowercase glyph, so mixed-case input (a tampered localStorage high-score name flowing through attractLines' row) silently drops glyphs. Carries the SH2-4/5 contract forward.
  - Severity: minor
  - Forward impact: Dev applies a constant cell-space letterSpacing and a toUpperCase() at the draw-helper boundary.
- **RED runs without the dependency re-pin; resolving @arcade/shared/font is Dev's GREEN step**
  - Spec source: session ACs AC-1 / AC-4
  - Spec text: "vitest + vite build green" (AC-4)
  - Implementation: font-shared-resolution imports via a `@vite-ignore` variable specifier so the v0.5.0 unresolvable subpath fails as ONE isolated test rather than a module-graph crash that would silence siblings (SH2-5 precedent); the three ./font-mock suites carry a `UI_FONT_FAMILY` link-compat shim so pre-migration render.ts links at collection.
  - Rationale: TEA cannot re-pin dependencies (an implementation change); the probe makes the missing pin a first-class failing contract rather than an incidental crash.
  - Severity: minor
  - Forward impact: Dev re-pins to `#v0.7.0`, then the probe asserts glyph coverage; the `UI_FONT_FAMILY` mock shims become dead (removable) once the source drops the symbol.

### Dev (implementation)
- **A shared `drawText` helper strokes all typographic HUD text (not five inline layoutText loops)**
  - Spec source: context-story-SH2-6.md → "Structure precedent (tempest + asteroids + star-wars)"
  - Spec text: "render.ts imports layoutText/CELL_H from './font' … stroke glyph geometry with the game's LOCAL glow"
  - Implementation: introduced one private `drawText(ctx, text, x, baseY, sizePx, align, color)` shared by drawScore/drawScreenLines/drawMessage/drawControlIndicator (mirrors asteroids' `drawText`); it upper-cases the text and applies the constant `GLYPH_TRACKING`.
  - Rationale: battlezone has no monolithic render() — the four typographic draws needed identical layoutText→stroke tracing; one helper avoids four copies and centralises the caps + tracking contracts. Matches asteroids (the closest structural sibling).
  - Severity: minor
  - Forward impact: SH2-8 (`@arcade/shared/glow`) can absorb this single-pass stroke-glow as one of the glow superset's looks (same note asteroids/star-wars logged).
- **The per-call `size` is treated as the glyph CAP HEIGHT (scale = size / CELL_H), so stroke caps are taller than the retired TTF caps**
  - Spec source: session AC-4 + context "RE-MEASURE every TTF-tuned pixel gap"
  - Spec text: "a manual run confirms the green-vector HUD reads correctly"; the ROM stroke caps fill the full nominal size (the TTF's caps were ~0.7×).
  - Implementation: the old TTF `size` was the em (caps ~0.7×size); I treat `size` as the cap height, so the stroke caps are ~43% taller. Baselines re-derived from the old `textBaseline` anchors (top → +cap height; middle → +cap height/2; bottom → baseline at the anchor). The lives triangle is `size` tall × `0.72·size` wide with a `0.36·size` gap.
  - Rationale: the intended TTF→stroke visual change (SH2-5 precedent); the larger, cleaner caps read better as vectors. Verified legible + unclipped in the manual run at :5276.
  - Severity: minor
  - Forward impact: none — sizes/positions are playtest-tunable (eyeballed per the epic's shell-by-eyeball convention); Reviewer may eyeball at other viewport widths.
- **Updated a test outside the SH2-6 font suites (`arcade-shared-pipe.test.ts` version assertion)**
  - Spec source: session AC-1 (the re-pin) + the pre-existing SH-1 pipe test
  - Spec text: AC-1 requires re-pinning `@arcade/shared`; the pipe test hardcodes `SHARED_VERSION === '0.5.0'`
  - Implementation: bumped the assertion to `'0.6.0'` (the actual runtime value at tag v0.7.0) with an explanatory comment; logged the SHARED_VERSION-vs-tag lag as a Delivery Finding.
  - Rationale: the AC-1 re-pin changed the runtime version, breaking a test whose whole purpose is to prove the pin re-resolved; the assertion must track the pin, and the `0.5.0 → 0.6.0` change is itself the re-resolution proof.
  - Severity: minor
  - Forward impact: none; the pipe test now tracks v0.7.0's runtime version. If arcade-shared bumps `SHARED_VERSION` to 0.7.0 (the Delivery Finding), this assertion moves with it.

### Reviewer (audit)
- **TEA: retired two bz2-2 test files instead of repointing them** → ✓ ACCEPTED by Reviewer: sound — both import symbols the migration deletes (UI_FONT_FAMILY/loadVectorFont) and encode the reversed TTF contract; not repointable. Their replacement contracts live in the new font-*.test.ts suites (verified present + green).
- **TEA: visual/coordinate fidelity not unit-tested, deferred to manual run + Reviewer** → ✓ ACCEPTED by Reviewer: house convention (mirrors SH2-2/4/5). Noting for the record that the SH2-5 [HIGH] lived exactly in this deferred zone; here the deferred pixel work WAS done — Dev re-derived every anchor from layoutText width and eyeballed at :5276, and I confirmed the score/lives/control-indicator against the screenshots.
- **TEA: bichromatic palette re-pinned to the STROKE seam** → ✓ ACCEPTED by Reviewer: correct — the bz1-12 red/green contract survives, and the repointed guard fails RED until the score/alert stroke in HUD_RED (which the manual run confirms they do).
- **TEA: per-run positive letterSpacing + caps-only handover stricter than AC wording** → ✓ ACCEPTED by Reviewer: agrees — the caps-only face drops glyphs on mixed-case input; drawText's `toUpperCase()` + constant `GLYPH_TRACKING` satisfy both.
- **TEA: RED runs without the re-pin; probe isolated via @vite-ignore + UI_FONT_FAMILY link-compat shim** → ✓ ACCEPTED by Reviewer: correct division of labour; the file-isolation and the collection-crash shim were the right calls (the shims are now dead post-migration, removable — harmless).
- **Dev: a shared `drawText` helper (not five inline layoutText loops)** → ✓ ACCEPTED by Reviewer: right call — one helper matches asteroids' precedent, centralises the caps+tracking contract, and avoids four copies. Seven positional params is at the edge of readability but consistent with the file's other draw signatures; not worth an options object for a private helper.
- **Dev: the per-call `size` is the glyph CAP HEIGHT (stroke caps taller than the TTF's ~0.7×)** → ✓ ACCEPTED by Reviewer: this IS the intended TTF→stroke visual change (SH2-5 precedent); verified legible + unclipped at :5276. The reduced headroom above the score (baseline now 2·size) is noted in Devil's Advocate as a future-tweak caution, not a current defect.
- **Dev: updated `arcade-shared-pipe.test.ts` (a test outside the SH2-6 font suites)** → ✓ ACCEPTED by Reviewer: necessary and correct — the AC-1 re-pin changed the runtime version the test pins; `0.5.0 → 0.6.0` is itself the re-resolution proof, and the SHARED_VERSION-vs-tag lag was correctly logged as an upstream finding.
- **No undocumented deviations found.** The 7-param drawText signature and the (pre-existing-convention) canvas-state non-reset are consistent with the codebase and are not spec deviations. *Found by Reviewer during audit.*