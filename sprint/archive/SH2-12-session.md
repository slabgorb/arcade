---
story_id: "SH2-12"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-12: Extract @arcade/shared esc-overlay (pure pause gate + browser keybind card) from battlezone and adopt across all five canvas games

## Story Details
- **ID:** SH2-12
- **Jira Key:** (local YAML tracking only)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T15:55:50Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T14:19:00.786569+00:00 | 2026-07-10T14:21:18Z | 2m 17s |
| red | 2026-07-10T14:21:18Z | 2026-07-10T14:41:29Z | 20m 11s |
| green | 2026-07-10T14:41:29Z | 2026-07-10T15:35:13Z | 53m 44s |
| review | 2026-07-10T15:35:13Z | 2026-07-10T15:49:10Z | 13m 57s |
| green | 2026-07-10T15:49:10Z | 2026-07-10T15:52:46Z | 3m 36s |
| review | 2026-07-10T15:52:46Z | 2026-07-10T15:55:50Z | 3m 4s |
| finish | 2026-07-10T15:55:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (blocking): GREEN requires PUBLISHING a new `@arcade/shared` version (carrying the new `/pause` + `/esc-overlay` subpaths) and BUMPING every game's pin, because the games consume `@arcade/shared` via a pinned git-URL tag installed into `node_modules`, NOT the local working copy. Affects each game's `package.json` `@arcade/shared` pin + `arcade-shared` publish/tag. The per-game adoption tests (dep-pin resolution `import('@arcade/shared/pause')`) stay RED until arcade-shared is implemented → published at a new tag → each game re-pins + reinstalls. *Found by TEA during test design.*
- **Gap** (blocking): `red-baron` pins the pre-font `@arcade/shared#v0.5.0`, which lacks `/font`, `/pause`, AND `/esc-overlay`. Affects `red-baron/package.json` (bump the pin to the new published version). Because the shared `drawEscOverlay` strokes its card through `@arcade/shared/font` internally, adopting it renders red-baron's card in the shared face WITHOUT a separate red-baron HUD-font migration — this is the clean AC-4 resolution; Dev must document the choice in the story context. *Found by TEA during test design.*
- **Improvement** (non-blocking): In THIS checkout (a-3), `@arcade/shared` was not installed in tempest/asteroids/star-wars/battlezone `node_modules` (their whole `@arcade/shared` import surface — math3d/rng/loop/font — failed at baseline, swamping the RED signal). TEA ran `npm install` per game to restore the v0.7.0 install so the RED signal is clean (only SH2-12 tests fail). A fresh checkout needs `just install-all` (or per-repo `npm install`) before work; note `just install-all`'s subrepo list also omits `arcade-shared` itself (see SM finding). *Found by TEA during test design.*
- **Question** (non-blocking): The shared frozen-frame gate is specified as `stepUnlessPaused(step: () => S, prev, paused)` (thunk form) so it imports no game sim. battlezone's existing 4-arg `stepUnlessPaused(game,input,dt,paused)` (pinned by the surviving bz2-5 `pause-gate.test.ts`) should become a thin delegate to the shared thunk gate, preserving its signature + behaviour. Confirm Architect/Dev keep that local signature rather than rewriting bz2-5 callers. Affects `battlezone/src/shell/pause.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (blocking for SH2-13): SH2-12's FINISH must RELEASE arcade-shared v0.8.0 so `github:slabgorb/arcade-shared#v0.8.0` exists — from the arcade-shared repo on `develop` after this branch merges, run `just release arcade-shared minor` (bumps 0.7.0→0.8.0... already bumped in package.json, so verify the release script's `npm version` step lands on 0.8.0 / adjust level; a library release has no R2 deploy). SH2-13 (game adoption) is blocked until the tag exists. Affects the SH2-12 finish flow + `arcade-shared` release. *Found by Dev during implementation.*
- **Gap** (non-blocking): SH2-12 was re-scoped and SH2-13 created — both are UNCOMMITTED edits in the orchestrator working tree (`sprint/epic-SH2.yaml`: SH2-12 repos→arcade-shared / points 5→3 / narrowed ACs; new SH2-13 5pts depends_on SH2-12). Commit these with the SH2-12 sprint tracking at finish. Affects `sprint/epic-SH2.yaml`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The five game repos' `feat/SH2-12-shared-esc-overlay` branches were reset to origin/develop (now 0 commits ahead, never pushed) — safe to delete; SH2-13 creates fresh branches. Affects the game repos' local branches only. *Found by Dev during implementation.*
- No new upstream findings during rework round 1. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the shipped ESM artifact `dist/esc-overlay.js` has an extensionless relative import (`from './font'`) that fails native Node ESM resolution — empirically confirmed by the rule-checker (`node -e "import('./dist/esc-overlay.js')"` → `Cannot find module '.../dist/font'`; adding `.js` fixes it). Affects `arcade-shared/src/esc-overlay.ts:13` (change to `from './font.js'`). First intra-package relative import in the package, so it becomes the template for SH2-8/10/11 browser subpaths. *Found by Reviewer during code review.*
- **Gap** (non-blocking): no test verifies the per-glyph tracking is forwarded to the font layer — the `vi.hoisted` mock at `tests/esc-overlay.test.ts:33` drops `layoutText`'s `opts` param, so `drawEscOverlay`'s `{ letterSpacing: GLYPH_TRACKING }` call is unobserved. Affects `arcade-shared/tests/esc-overlay.test.ts` (mock should capture `opts` and assert forwarding). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `src/index.ts:28 SHARED_VERSION = '0.6.0'` is stale against `package.json` `0.8.0` — the marker's own comment says it is "kept in sync with package.json's version." Pre-existing, but this diff's version bump widens the gap. Affects `arcade-shared/src/index.ts`. *Found by Reviewer during code review.*
- Round-2 re-review: no new upstream findings. All three round-1 findings independently re-verified as resolved (`dist/esc-overlay.js` + `dist/pause.js` both resolve under native Node ESM; tracking-forwarding test present; SHARED_VERSION synced). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Per-game pause BEHAVIOUR verified by manual run, not automated tests**
  - Spec source: context-story-SH2-12.md, AC-3 + AC-5
  - Spec text: "All five canvas games ... pause on Escape via the shared module: the keydown EDGE ... toggles pause, the frozen frame returns the same state reference ... the shared esc-overlay draws over the held world" / "a manual run of each of the five games confirms Escape pauses, dims, and resumes"
  - Implementation: Per game, tests assert (a) the WIRING is present (src imports `@arcade/shared/pause` + `/esc-overlay`) and (b) the dep-pin resolves the subpaths; the shared MECHANISM itself (isPauseKey/togglePaused/frozen-frame gate + drawEscOverlay dim+card) is unit-tested exhaustively in `arcade-shared`. The end-to-end keydown-edge → freeze → overlay in each game's `main.ts` rAF loop is NOT unit-driven.
  - Rationale: the keydown edge + rAF frame gate are DOM/loop wiring with no unit seam; the epic's standing convention is "shell IO is verified by running the game" (see bz2-5, which likewise left main.ts wiring to the live playtest). AC-5 explicitly makes the per-game confirmation a manual run.
  - Severity: minor
  - Forward impact: Reviewer + the finish gate must include a manual run of all five games (Escape pauses/dims/resumes, card reads in each cabinet's style) — automated suites alone do not cover AC-5.
- **Per-game adoption uses source-text + dep-pin resolution, mirroring the SH2-6 font pattern**
  - Spec source: AC-3 ("via the shared module") + battlezone/tests/shell/font-shared-resolution.test.ts (established precedent)
  - Spec text: "pause on Escape via the shared module"
  - Implementation: guarded runtime `import(/* @vite-ignore */ specifier)` + a recursive src-text scan, rather than a jsdom keydown harness.
  - Rationale: identical to the sanctioned SH2-4/5/6 dependency-pin contract; a variable specifier keeps an unresolved subpath from crashing the module graph so it surfaces as one failing test.
  - Severity: minor
  - Forward impact: none — same pattern already merged for /font.

### Dev (implementation)
- **Story SPLIT — SH2-12 narrowed to the arcade-shared extraction; per-game adoption moved to new story SH2-13**
  - Spec source: session scope (SH2-12 title/ACs) + context-story-SH2-12.md, AC-3/AC-4/AC-5
  - Spec text: "adopt across all five canvas games ... All five canvas games pause on Escape via the shared module ... a manual run of each of the five games confirms..."
  - Implementation: Delivered ONLY the PURE `@arcade/shared/pause` + BROWSER `@arcade/shared/esc-overlay` subpaths (bumped to v0.8.0). The five game repos' RED adoption/re-point tests were removed from their SH2-12 branches (branches soft-reset to origin/develop, files preserved) and re-homed to SH2-13 (created, `depends_on: SH2-12`). SH2-12's epic entry re-scoped: repos → arcade-shared, points 5→3, ACs narrowed to the extraction (adoption ACs moved to SH2-13).
  - Rationale: user-approved decision ("Split per precedent"). A game cannot `import('@arcade/shared/<newsub>')` until v0.8.0 is PUBLISHED as a git-URL tag, and publishing is a release action done at finish — so per-game adoption cannot go green in the same pre-merge dev pass that CREATES the subpath. Mirrors the cabinet's established publish→consume ordering (SH2-2 created /font; SH2-4/5/6 consumed it in separate stories).
  - Severity: major
  - Forward impact: SH2-13 is BLOCKED until SH2-12's finish/release cuts v0.8.0. Its RED tests are preserved (each game's dangling RED commit — battlezone 4d00ad6, tempest 445381f, asteroids 96f13af, star-wars 0a741a9, red-baron 51e5747 — plus scratchpad copies). SM must reconcile sprint points (SH2-12 5→3, +SH2-13 5).
- Rework round 1: no new deviations — Reviewer's findings (.js extension, tracking test, SHARED_VERSION) were fixed exactly as specified, no divergence from spec.

### Reviewer (audit)
- **TEA — Per-game pause BEHAVIOUR verified by manual run, not automated tests** → ✓ ACCEPTED by Reviewer: sound; the keydown+rAF wiring has no unit seam and AC-5 is explicitly a manual run. Now moot for SH2-12 (per-game work moved to SH2-13) but carries forward correctly.
- **TEA — Per-game adoption uses source-text + dep-pin resolution (SH2-6 pattern)** → ✓ ACCEPTED by Reviewer: matches the merged SH2-4/5/6 `font-shared-resolution` precedent exactly.
- **Dev — Story SPLIT (SH2-12 = extraction; SH2-13 = adoption)** → ✓ ACCEPTED by Reviewer: forced by the real publish→consume ordering (a game cannot import an unpublished subpath) and consistent with how /font shipped (SH2-2 created, SH2-4/5/6 consumed). Well-documented, tests preserved, follow-up story created with correct `depends_on`.
- **UNDOCUMENTED (Reviewer audit): shipped artifact resolution** — no deviation was logged for the extensionless `./font` import, which produces an ESM artifact that only resolves under bundler (Vite) resolution, not native Node ESM. Spec/convention (lang-review rule #5) says relative imports carry `.js`. Code omits it. Severity: HIGH (see Reviewer Assessment). Not a design choice — an oversight; the first intra-package import in the package. → **RESOLVED (round 2, commit f7a0b6a):** `./font.js`; native Node ESM import of the built artifact now succeeds.

## Sm Assessment

**Routing:** Phased TDD story → hand off to TEA (Han Solo) for the RED phase. Story context is written and validated (`sprint/context/context-story-SH2-12.md`, 5 ACs). Merge gate clear (no blocking open PRs). No Jira — local YAML tracking, claim step intentionally skipped.

**What this story is:** An SH2 render-surface EXTRACTION. Guiding rule — share the VERB (identical mechanism), keep the NUMBERS per-cabinet. Extract battlezone's Escape-to-pause into two arcade-shared subpaths and adopt across all five canvas games (lobby out of scope).

**Extract FROM (battlezone, the only cabinet that pauses today):**
- Pure gate: `battlezone/src/shell/pause.ts` — `INITIAL_PAUSED`, `isPauseKey`, `togglePaused`, `stepUnlessPaused` (returns the SAME state ref when paused → deterministic resume).
- Browser overlay: `drawPauseOverlay` in `battlezone/src/shell/render.ts` — `rgba(0,0,0,0.72)` fill + `drawScreenLines(PAUSE_LINES)`.
- Wiring: Escape keydown EDGE (`!e.repeat && isPauseKey`) in `battlezone/src/main.ts` + gate in the frame loop + overlay drawn only when paused.

**Extract INTO (arcade-shared @0.7.0, develop):**
1. PURE `@arcade/shared/pause` — frozen-frame gate takes the game's OWN step fn as an arg (imports no game sim); must pass the existing purity guard (no DOM refs).
2. BROWSER `@arcade/shared/esc-overlay` — `drawEscOverlay(ctx,w,h,opts)` dims + strokes a centered keybind card via `@arcade/shared/font` layoutText; card lines/colour/opacity are per-cabinet params. Purity guard must recognise esc-overlay as a browser subpath (exempt), mirroring how glow will be handled in SH2-8.

**Risks handed to TEA (both captured in ACs):**
- **red-baron is NOT yet on `@arcade/shared/font`** (SH2-4/5/6 covered asteroids/star-wars/battlezone; tempest via SH2-2). Its keybind card must either ride a font migration or stroke via red-baron's local text path — implementing agent decides and documents. This is the highest-uncertainty seam.
- Four cabinets (tempest, asteroids, star-wars, red-baron) GAIN pause — new behaviour, not pure refactor. battlezone must stay behaviour-identical (its dual-tread card + green preserved verbatim).
- No hard dependency on the still-backlog SH2-8 glow: overlay strokes card text via each game's existing shared-font path; `glowPolyline` can replace the hand-stroke once SH2-8 lands.

**Workspace note (impediment I resolved before handoff):** This checkout (a-3) was missing `arcade-shared` and `red-baron` — the two repos most central to this story. I cloned both on `develop`, installed deps, and built arcade-shared's `dist/` (font.js present). All six repos are now present and the RED phase can begin against real code. Branches `feat/SH2-12-shared-esc-overlay` exist in all six.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev / Yoda)

**Test Files (8 artifacts across 6 repos):**
- `arcade-shared/tests/pause.test.ts` (NEW) — the PURE gate: `INITIAL_PAUSED`, `isPauseKey` (paranoid non-Escape set incl. `'e'`/`'esc'`/`''`), `togglePaused` (both directions), and the game-agnostic `stepUnlessPaused(step, prev, paused)` thunk gate (same-ref when paused + step never called; step() called exactly once when active; generic over state type → imports no game sim).
- `arcade-shared/tests/esc-overlay.test.ts` (NEW) — the BROWSER `drawEscOverlay(ctx,w,h,opts)`: full-viewport dim, `shadowBlur` reset to 0, per-cabinet OPACITY reflected in the fill, per-cabinet LINES routed verbatim through `layoutText` (blank lines are spacing), per-cabinet COLOUR on the stroke (no green leak), no baked-in battlezone default lines, runs end-to-end on a proxy ctx.
- `arcade-shared/tests/purity.test.ts` (EXTENDED) — `pause` joins the DOM-free pure set; `esc-overlay` registered as a browser subpath (built + exported + NOT policed pure); `exports["./pause"]` + `["./esc-overlay"]` map to built ESM + `.d.ts`.
- `battlezone/tests/shell/pause-esc-overlay-repoint.test.ts` (NEW) — re-point contract: `shell/pause.ts` consumes `@arcade/shared/pause`; overlay drawn via shared `drawEscOverlay`; dual-tread card (`E / D`, `I / K`) + `#33ff66` preserved verbatim; new subpaths resolve at battlezone's (bumped) pin.
- `tempest`, `asteroids`, `star-wars`, `red-baron` `…/pause-adoption.test.ts` (NEW ×4) — each game wires `@arcade/shared/pause` + `/esc-overlay` (src-text) and resolves both subpaths (dep-pin). red-baron additionally asserts it drops the pre-font `v0.5.0` pin (AC-4).

**Tests Written:** 42 tests + 1 collection-gated file (pause.test.ts), covering all 5 ACs.
**RED verification (via testing-runner + re-run after workspace fix):** every repo fails ONLY its SH2-12 file(s) — arcade-shared 13, battlezone 4, tempest 4, asteroids 4, star-wars 4, red-baron 5 — all for the right reason (missing `src/pause`/`src/esc-overlay`, missing exports, unbuilt dist, unwired src, unresolved subpath at the current pin). No regressions: battlezone's bz2-5 `pause-gate`/`pause-overlay` tests (which were collecting 0 tests at baseline due to an uninstalled `@arcade/shared`) now run and PASS.

### Rule Coverage (typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 specific signatures / `readonly` params (no `Function`/loose types) | `stepUnlessPaused` pinned as `(step: () => S)` thunk; `drawEscOverlay` `opts.lines` a `readonly string[]` | failing (RED) |
| #4 nullish handling (blank vs missing) | esc-overlay "blank spacer lines" (`''` is spacing, not skipped-as-falsy) + "empty card routes no text" | failing (RED) |
| #5 module/declaration + exports | purity: `exports["./pause"]`/`["./esc-overlay"]` → built `.js` + `.d.ts` | failing (RED) |
| #8 test quality (meaningful assertions) | self-checked all 42 tests: concrete expected values, no `let _ =`, no `assert(true)`, no is-Some-on-always-None | pass (self-check) |
| ADR-0003 purity (project rule) | purity guard extended: `pause` DOM-free, `esc-overlay` browser-exempt, mutually exclusive sets | failing (RED) |

**Rules checked:** 5 of 5 applicable lang-review rules have test coverage (React/async/security-input rules N/A — no JSX, no async, no user-input boundary in this pure+canvas surface).
**Self-check:** 0 vacuous tests. The `as unknown as {…}` on runtime `import()` results is the sanctioned dep-pin pattern (SH2-6 `font-shared-resolution.test.ts` precedent), not a production type escape; fake proxy ctx typed `as unknown as CanvasRenderingContext2D` mirrors bz2-5 `pause-overlay.test.ts`.

**Handoff:** To Dev (Yoda) for GREEN. Sequencing that GREEN must respect (see Delivery Findings): implement in `arcade-shared` → publish a new tag → bump each game's `@arcade/shared` pin (red-baron off `v0.5.0`) → wire each game's main.ts. AC-5 (live pause/dim/resume per game) is a MANUAL run, not an automated test.

## Dev Assessment

**Implementation Complete:** Yes — for SH2-12's (re-scoped) deliverable: the arcade-shared extraction.

**Scope decision:** Mid-GREEN, the publish→consume ordering surfaced (a game can't `import('@arcade/shared/<newsub>')` until v0.8.0 is a published tag; publishing is a finish/release action). User chose **Split per precedent**: SH2-12 = arcade-shared extraction (this); SH2-13 = per-game adoption (created, blocked on v0.8.0). See the major deviation logged above.

**Files Changed (arcade-shared only):**
- `src/pause.ts` (NEW) — PURE gate: `INITIAL_PAUSED`, `isPauseKey`, `togglePaused`, generic `stepUnlessPaused<S>(step, prev, paused)` thunk gate (no game-sim import).
- `src/esc-overlay.ts` (NEW) — BROWSER `drawEscOverlay(ctx,w,h,{lines,color,opacity})`: full-viewport dim (shadowBlur 0), centered keybind card via `@arcade/shared/font` `layoutText`, per-cabinet params, no baked-in battlezone constants.
- `package.json` — added `./pause` + `./esc-overlay` exports; version `0.7.0 → 0.8.0`.

**Tests:** arcade-shared **191/191 passing (GREEN)** — includes the 22 new tests (pause 9, esc-overlay 8, purity extensions 5). Game repos reset to origin/develop (their adoption tests moved to SH2-13); no game repo is modified by this story.

**Branch:** `feat/SH2-12-shared-esc-overlay` (arcade-shared) — committed (`e7d8d02`) and pushed. Working tree clean.

**AC status (re-scoped SH2-12):** AC1 (pause pure) ✓, AC2 (esc-overlay browser) ✓, AC3 (exports + version + suite green) ✓, AC4 (per-game out of scope → SH2-13) ✓.

**Handoff:** To Reviewer (Obi-Wan) — review the arcade-shared diff only (pure `/pause` + browser `/esc-overlay` + exports + purity-guard extension). Per-game adoption is SH2-13.

### Rework Round 1 (addressing Reviewer findings)

All three actionable Reviewer findings resolved (commit `f7a0b6a`):
- **[HIGH] rule#5 fixed** — `src/esc-overlay.ts:13` now `import … from './font.js'`. Empirically verified: `node --input-type=module -e "import('./dist/esc-overlay.js')"` → **RESOLVED ✓** (exports `drawEscOverlay`), where it previously threw `Cannot find module '.../dist/font'`.
- **[MEDIUM] rule#8 fixed** — `tests/esc-overlay.test.ts` mock now mirrors `layoutText(text, opts?)` and a new test asserts `GLYPH_TRACKING` (`0.1 * CELL_H` = 2.4) is forwarded. Suite is now **192/192** (+1).
- **[LOW] doc fixed** — `src/index.ts:28 SHARED_VERSION` bumped `0.6.0 → 0.8.0`.
- **[LOW] rule#1** — no action (Reviewer downgraded; accepted Proxy-mock idiom).

Tree clean, branch pushed (`e7d8d02..f7a0b6a`). Back to Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (191/191 green, build ok, tree clean, no smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test quality assessed by rule-checker #8 + Reviewer) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (rule-checker #10 covered security: clean) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (rule#5 ×1, rule#8 ×1, rule#1 ×2) | confirmed 2, downgraded 2 |

**All received:** Yes (2 enabled returned; 7 disabled via settings, pre-filled)
**Total findings:** 2 confirmed (1 HIGH rule#5, 1 MEDIUM rule#8), 2 downgraded to LOW (rule#1 test double-casts), + 1 Reviewer-audit LOW (stale SHARED_VERSION)

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The extraction is clean, pure, and well-tested — but the shipped browser artifact does not resolve under standard ESM, a confirmed project-rule (#5) violation that will become the template for every future browser subpath in this epic. Fix is trivial; the bar for a *published library* is that its artifact imports correctly.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[RULE]` #5 — extensionless relative import ships in ESM artifact; `node import('./dist/esc-overlay.js')` fails (`Cannot find module '.../dist/font'`), empirically reproduced by the rule-checker. First intra-package import → precedent for SH2-8/10/11 browser subpaths. | `src/esc-overlay.ts:13` | Change `from './font'` → `from './font.js'`, rebuild; TEA adds a test pinning the `.js` specifier / Node-ESM resolvability of the built artifact. |
| [MEDIUM] | `[RULE]`/`[TEST]` #8 — the `layoutText` mock drops `opts`, so no test verifies `GLYPH_TRACKING` (`{letterSpacing}`) is forwarded to the font layer. | `tests/esc-overlay.test.ts:33` | Mock `layoutText(text, opts)` capturing `opts`; assert letterSpacing is forwarded from `drawEscOverlay`. |
| [LOW] | `[DOC]` — `SHARED_VERSION='0.6.0'` stale vs `package.json` `0.8.0`; comment claims "kept in sync". Pre-existing, widened by this diff. | `src/index.ts:28` | Bump `SHARED_VERSION` or correct the comment (optional; out of this diff). |
| [LOW] | `[RULE]` #1 — `as unknown as` double-casts in the mock ctx (downgraded). | `tests/esc-overlay.test.ts:57,74` | None required — accepted mock-ctx idiom, test-only, matches bz2-5 `pause-overlay.test.ts:72`. |

### Observations

- `[RULE][HIGH]` extensionless `./font` import at `src/esc-overlay.ts:13` — see severity table. **Confirmed** (empirical Node-ESM repro).
- `[RULE][MEDIUM]` letterSpacing forwarding untested — `tests/esc-overlay.test.ts:33`. **Confirmed.**
- `[RULE][LOW]` test double-casts `as unknown as CanvasRenderingContext2D` — **downgraded**: this is the established Proxy-mock idiom (battlezone `pause-overlay.test.ts:72` does the same), test-only, mocking the ~100-member canvas surface. Not a production escape.
- `[DOC][LOW]` `SHARED_VERSION` stale — Reviewer audit finding (comment-analyzer disabled).
- `[VERIFIED]` `dist/pause.js` is DOM-free — evidence: grep for `document|window|canvas|FontFace` returns zero; complies with the purity guard (`pause` ∈ `PURE_SUBPATHS`, `tests/purity.test.ts:36`).
- `[VERIFIED]` `esc-overlay` touches only the passed `ctx` — evidence: `dist/esc-overlay.js` has zero bare DOM globals (the lone `canvas` token is in a comment); correctly `BROWSER_SUBPATHS`-classified (`tests/purity.test.ts:41`), exempt from the pure guard.
- `[VERIFIED]` "share the VERB, keep the NUMBERS" — no baked-in battlezone constants; `EscOverlayOptions` carries `lines/color/opacity` as per-call params, and the suite proves no default green/lines leak (`esc-overlay.test.ts` "carries NO battlezone default lines", "no battlezone green may leak"). Complies with epic rule #16.
- `[SEC]` rule-checker #10 clean — `isPauseKey(key)` reads a trusted browser `KeyboardEvent.key`; `color` writes to canvas style props, not an HTML/DOM injection sink. No untrusted boundary in the diff.
- `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]` — subagents disabled via settings; I assessed these domains directly: no unhandled boundary (empty `lines: []` handled — `esc-overlay.test.ts` "empty card"; huge/negative w/h floor via `Math.max(16,…)`), no swallowed errors (no try/catch, pure functions), types are precise (`readonly string[]`, `step: () => S` generic — no `Function`/`any`), and the module is minimal (no dead code / over-abstraction).

### Data flow traced

`opts.lines[i]` (per-cabinet keybind string) → `strokeCardLine` → `layoutText(text, {letterSpacing})` → glyph strokes → `ctx.moveTo/lineTo/stroke`. Safe: `line` is always a `string` (element of `readonly string[]`), `.trim()` never throws; blank lines are skipped (spacing) before reaching the font. `opts.opacity` flows into `rgba(0,0,0,${opacity})` — a caller-trusted number; no external/untrusted input anywhere.

### Pattern observed

Good: `drawEscOverlay` faithfully mirrors battlezone's `drawScreenLines`/`drawText` layout while parameterizing the per-cabinet numbers — the exact "share the verb" intent (`src/esc-overlay.ts:66`). Bad: the extensionless sibling import (`:13`) breaks the shipped-artifact contract a published ESM library must hold.

### Devil's Advocate

Argue this code is broken. Start with the confirmed defect: this is a *published library* whose entire reason to exist is being imported by other packages. Its browser entry point ships an import specifier (`./font`) that a standards-compliant ESM loader rejects. The only reason CI is green is that every current consumer happens to run through Vite, whose non-standard bundler resolution papers over the missing extension. That is luck, not correctness — the day someone runs a plain `node` script, a Bun loader, a Deno import, or a vitest config with `deps.moduleDirectories`/native resolution, `@arcade/shared/esc-overlay` throws at import time and every game that adopted it (SH2-13) goes dark simultaneously. Worse, this is the *first* relative import in the whole package: whatever ships here is the copy-paste template for SH2-8 (glow), SH2-10 (view), and SH2-11 (compositor), each of which will import siblings. One missing `.js` becomes four. Next, the testing: the suite asserts the card text is *routed* to `layoutText`, but the mock silently discards the layout options, so the ~0.1em tracking — the one thing that makes the caps legible instead of cramped — could be dropped in a future refactor and every test would stay green. A confused maintainer reading `SHARED_VERSION='0.6.0'` next to `"version":"0.8.0"` cannot trust either. What would a malicious user do? Little here — inputs are first-party. But a *stressed* consumer (strict loader) and a *confused* maintainer (stale version marker, untested tracking) are both left worse off. The extraction's logic is sound; its packaging is not. Fix the artifact before it becomes canon.

**Handoff:** Back to TEA (Han Solo) for rework — both blocking/primary findings are testable: (1) a test pinning the `.js`-extensioned specifier / Node-ESM resolvability of `dist/esc-overlay.js` (RED until Dev adds `.js`), and (2) a mock that captures `layoutText`'s `opts` and asserts `letterSpacing` forwarding. Then Dev makes them green.

## Reviewer Assessment

**Verdict:** APPROVED (Round 2 re-review — Round 1 REJECTED, all findings resolved)

Round 1 rejected on a HIGH `[RULE]` #5 finding (extensionless sibling import → shipped ESM artifact failed native Node ESM resolution). Dev fixed all three actionable findings in commit `f7a0b6a`; I independently re-verified each rather than trusting the claim:

| Round-1 Finding | Fix | Reviewer re-verification |
|-----------------|-----|--------------------------|
| `[HIGH][RULE#5]` extensionless `./font` import | `src/esc-overlay.ts:13` → `from './font.js'` | `node --input-type=module -e "import('./dist/esc-overlay.js')"` → **RESOLVED ✓** (exports `drawEscOverlay`); `dist/pause.js` also resolves — was `Cannot find module` before. |
| `[MEDIUM][RULE#8]` tracking forwarding untested | mock mirrors `layoutText(text, opts?)`; new test asserts `letterSpacing === 0.1*CELL_H` (2.4) | Test present (`tests/esc-overlay.test.ts:130-143`); suite **192/192** (+1); the passing tracking test also proves `vi.mock` still intercepts the now-`.js` specifier (no mock regression). |
| `[LOW][DOC]` stale `SHARED_VERSION` | `src/index.ts:28` `0.6.0 → 0.8.0` | Confirmed synced with `package.json`. |
| `[LOW][RULE#1]` test double-casts | (downgraded — no action) | Accepted: established Proxy-mock idiom (bz2-5 `pause-overlay.test.ts:72`). |

**Re-verification (independent):** `npm run build` clean; `dist/esc-overlay.js` + `dist/pause.js` both import-resolve under native Node ESM; `npx vitest run` → 192/192 green; no new issues introduced by the 3-file fix diff (esc-overlay import line, index version line, test mock+case — all inspected).

**Data flow / pattern / error handling:** unchanged from Round 1 and re-confirmed — `opts.lines[i]` → `layoutText(text, {letterSpacing})` → `ctx` strokes; pure `pause.ts` DOM-free; `esc-overlay` ctx-only, browser-exempt; no baked-in cabinet constants; blank/empty/huge-input paths handled.

**Deviations:** all audited in Round 1 (TEA ×2 ACCEPTED, Dev split ACCEPTED, the undocumented `.js` oversight now RESOLVED).

**Note carried to SM (not blocking this approval — SH2-12 ships the arcade-shared extraction only):** at finish, RELEASE `arcade-shared` v0.8.0 (tag the merge commit `v0.8.0`, matching how `v0.6.0` was tagged at its feat commit — do NOT let `just release … minor` double-bump past 0.8.0), and commit the orchestrator's `sprint/epic-SH2.yaml` re-scope (SH2-12 → arcade-shared / SH2-13 created). SH2-13 (per-game adoption) is blocked until `#v0.8.0` is published.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.