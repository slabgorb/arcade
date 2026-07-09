---
story_id: "SH2-2"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-2: Stand up pure @arcade/shared/font (promote tempest's VGMSGA stroke font) + purity guard; re-point tempest to the shared module

## Story Details
- **ID:** SH2-2
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Repos:** arcade-shared, tempest
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** none
- **Branch:** feat/SH2-2-shared-font-purity-guard (both subrepos, off origin/develop)

## Acceptance Criteria

1. @arcade/shared/font exports the VGMSGA glyph table, layoutText(text, opts?) -> {strokes, width}, and CELL_W/CELL_H; it is pure (no DOM references) and added to the exports subpath map + prepare build.
2. tests/purity.test.ts fails if any pure subpath (math3d/rng/highscore/loop/font) references a DOM global; it passes for the current pure core.
3. tempest imports @arcade/shared/font at a pinned git-URL ref; its local src/shell/vecfont.ts is deleted and font.ts re-exports the shared module; tempest vitest + vite build are green with no visual change.
4. tempest's vestigial VectorBattle-e9XO.ttf and the contactSheet.ts 'Vector Battle' font-family reference are removed.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-09T09:56:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T09:13:04Z | 2026-07-09T09:16:18Z | 3m 14s |
| red | 2026-07-09T09:16:18Z | 2026-07-09T09:35:35Z | 19m 17s |
| green | 2026-07-09T09:35:35Z | 2026-07-09T09:48:37Z | 13m 2s |
| review | 2026-07-09T09:48:37Z | 2026-07-09T09:56:06Z | 7m 29s |
| finish | 2026-07-09T09:56:06Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA (O'Brien) for the RED phase.**

- **Story:** SH2-2 (5 pts, p2) — stand up the pure `@arcade/shared/font` subpath (promote tempest's VGMSGA stroke font verbatim), add the DOM-purity guard over the pure core, and re-point tempest at the pinned shared module. Behaviour-preserving for tempest.
- **Repos:** `arcade-shared` + `tempest`, both on gitflow. Feature branch `feat/SH2-2-shared-font-purity-guard` created off `origin/develop` in each (fetched fresh; local develop refs go stale). Code lands via PRs targeting `develop`; arcade-shared's feat branch must be **pushed before** tempest can resolve the pinned git-URL dep.
- **Workflow:** tdd (phased) → next agent **TEA** for RED. Session `.session/SH2-2-session.md` and context `sprint/context/context-story-SH2-2.md` (218 lines, substantive — not a stub) both in place.
- **Governance:** epic SH2 is governed by the design spec `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md` and ADR-0002 (font → ROM stroke VGMSGA, TTF retired) / ADR-0003 (purity-guard charter; font is PURE, joins the pure core).
- **Standing hazards flagged for TEA:** arcade-shared tests are **untyped** and run in a **node env** — AC-2's purity guard must assert over built `dist/` as **source text** (node:fs regex for `document|window|canvas|FontFace|requestAnimationFrame`), never a compile-only annotation. Do not run `pf sprint story` mutation commands (they round-trip and can corrupt epic YAML).

**Pre-handoff checklist:** session ✓ · fields set ✓ · context written with technical approach + all 4 ACs ✓ · branches created in both subrepos ✓ · Jira N/A (no Jira, explicitly skipped) · merge gate clear (0 open PRs in arcade-shared/tempest).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev/Julia)

**Test Files:**
- `arcade-shared/tests/font.test.ts` (new) — module shape + verbatim VGMSGA glyph geometry (ported from tempest's vecfont suite) + `layoutText` behaviour + design §4.1 `letterSpacing`. RED: `../src/font` does not exist.
- `arcade-shared/tests/purity.test.ts` (new) — DOM-purity guard over `dist/` (fail-set `document|window|canvas|FontFace`; rAF excluded — see deviation), detector self-tests, `dist/font.js` built check, `exports["./font"]` map check. RED: font not built + not in exports.
- `arcade-shared/tests/font-source-rules.test.ts` (new) — TS lang-review #1 (no `as any`/`@ts-ignore`) + pure-module discipline (no `Math.random`/`Date`/`performance.now`) over the shared source. RED: `src/font.ts` absent.
- `tempest/tests/shell/font.test.ts` (new) — AC-3 (font.ts re-exports the shared module; vecfont.ts deleted; render.ts repointed; behaviour-preserving geometry) + AC-4 (TTF + `'Vector Battle'` reference removed). RED on 6 of 8 (2 are green behaviour/regression anchors, by design).
- `tempest/tests/shell/vecfont.test.ts` — DELETED (superseded; contract migrated to arcade-shared).

**Tests Written:** 26 new tests across 4 files covering all 4 ACs. **RED verified** by testing-runner (RUN_ID `SH2-2-tea-red`):
- arcade-shared: `font.test.ts` import-errors on missing `../src/font`; `purity.test.ts` 3 fail (font not built / can't verify / no `exports["./font"]`), detector self-tests + current-core purity PASS; **115 pre-existing tests green**.
- tempest: `font.test.ts` 6 fail (AC-3 ×3, AC-4 ×3), 2 anchors green; **744 pre-existing tests green** (vecfont.test.ts deletion broke nothing).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| ADR-0003 purity fence (project rule) — pure subpaths DOM-free | `purity.test.ts` → "no pure subpath references a DOM global" over `dist/` | current core PASS; `font` RED until built |
| Purity guard is non-vacuous | `purity.test.ts` → detector self-tests (flags a planted `document`/`canvas`; clears pure math; no substring false-positive) | passing |
| TS lang-review #1 — type-safety escapes (`as any`/`@ts-ignore`/`as unknown as`) | `font-source-rules.test.ts` → "uses no `as any` … escapes" | failing (RED) |
| Pure-module discipline — no wall clock / no randomness | `font-source-rules.test.ts` → "reads no wall clock and no randomness" | failing (RED) |
| TS lang-review #8 — tests import `src/` not `dist/` | `font.test.ts` imports `../src/font` (purity guard's `dist/` read is the deliberate, documented exception) | compliant |
| TS lang-review #8 — no vacuous assertions | self-check of all 26 tests (every test asserts concrete values/shapes) | compliant |
| AC-3 behaviour-preservation (no visual change) | tempest `font.test.ts` → geometry anchor via the local barrel | passing anchor |

**Rules checked:** 4 of the TS lang-review checklist's 12 sections are applicable to a verbatim, pure font-geometry move (#1 type escapes, #5 module re-export shape, #8 test quality, plus the project-specific ADR-0003 purity rule); enums/React/async/input-validation (#3/#6/#7/#10) are N/A. All applicable checks have test coverage.
**Self-check:** 0 vacuous tests (all newly authored; the purity detector has an explicit non-vacuous proof).

**Handoff:** To Dev (Julia) for GREEN. Implementation order is dependency-critical (see context §Playbook + Delivery Findings): (1) build `arcade-shared/src/font.ts` verbatim from tempest's `vecfont.ts` + add `exports["./font"]` + `npm run build` so `dist/font.js` exists; (2) **push the arcade-shared feat branch** so tempest can resolve the pinned git-URL; (3) re-point tempest (`package.json` → feat ref, `npm install`, `font.ts` → `export * from '@arcade/shared/font'`, **repoint `render.ts`'s `./vecfont` import** [GAP-1], delete `vecfont.ts`, delete the TTF, clean `contactSheet.ts`).

## Delivery Findings

### TEA (test design)

- **Conflict** (non-blocking for SH2-2 GREEN; **needs Architect ratification**) [PURITY-1]: ADR-0003 (Amendment 1) and design spec §3 name `requestAnimationFrame` in the purity-guard fail-set with `loop` classified pure, but `dist/loop.js`'s `createLoop` calls `requestAnimationFrame`/`cancelAnimationFrame` — so the guard *as literally specified* fails on the current pure core, contradicting AC-2. Resolved in `tests/purity.test.ts` by excluding rAF from the fail-set (documented in Design Deviations). Affects `docs/adr/0003-render-surface-extraction.md`, `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md` §3, and `arcade-shared/tests/purity.test.ts` (either amend the ADR/spec to drop rAF, or split `loop`'s `createLoop` into a browser subpath in a later story so rAF can return to the fail-set). *Found by TEA during test design.*
- **Gap** (non-blocking; Dev action item enforced by the RED test) [GAP-1]: `tempest/src/shell/render.ts:15` imports `{ layoutText, CELL_H } from './vecfont'` **directly** (not via the `font.ts` barrel). When `vecfont.ts` is deleted (AC-3), this import dangles and the tempest build breaks. Affects `tempest/src/shell/render.ts` (repoint the import to `./font` or `@arcade/shared/font`). *Found by TEA during test design.*
- **Improvement** (non-blocking) [READ-1]: `tempest/public/fonts/Readme.txt` is the *non-commercial license readme* for the Vector Battle TTF (the exact license liability ADR-0002 cites) — it is vestigial once the `.ttf` is deleted (AC-4 names only the `.ttf`). Affects `tempest/public/fonts/Readme.txt` (recommend deleting it, and the then-empty `public/fonts/`, alongside the TTF). *Found by TEA during test design.*
- **Question** (non-blocking; CI correctness) [BUILD-1]: `arcade-shared`'s `test` script is `vitest run` with **no prebuild**, but `purity.test.ts` reads `dist/*.js`. Dev/Reviewer must run `npm run build` before `npm test`, or the guard reads a stale/absent `dist/font.js`. Affects `arcade-shared/package.json` (consider a `pretest: npm run build`, or document the build-then-test order for CI). *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking; must resolve at epic release) [PIN-1]: tempest now pins `@arcade/shared` at the moving feat branch `github:slabgorb/arcade-shared#feat/SH2-2-shared-font-purity-guard` (lock-resolved to `arcade-shared@038bec5`). Per the SH-epic playbook, a provisional feat pin must be re-pinned to a **release tag + version bump** when the SH2 render surface (or a shared release) is cut — otherwise tempest tracks a moving branch. Affects `tempest/package.json` + `tempest/package-lock.json`. *Found by Dev during implementation.*
- **Resolved** [GAP-1] (TEA): repointed `tempest/src/shell/render.ts` `import … from './vecfont'` → `'./font'` before deleting `vecfont.ts`; `tsc --noEmit` + `vite build` confirm no dangling import. Also fixed the stale `src/shell/vecfont.ts` reference in render.ts's comment (now points at `@arcade/shared/font` via `./font`).
- **Resolved** [BUILD-1] (TEA): added `pretest: tsc -p tsconfig.build.json` to `arcade-shared/package.json` so `npm test` always builds a fresh `dist/` before the purity guard reads it (`dist/` is gitignored).
- **Resolved** [READ-1] (TEA): deleted `tempest/public/fonts/Readme.txt` (the retired TTF's non-commercial license readme) alongside the `.ttf`; `public/fonts/` is now empty (untracked).
- **Note** [PURITY-1] (TEA, still open): honored TEA's rAF-exclusion — `loop` was left untouched, so the guard's fail-set stays `document|window|canvas|FontFace`. Still needs Architect ratification (amend ADR-0003/design, or split `createLoop` into a browser subpath later). No Dev action taken (out of SH2-2 scope).

### Reviewer (code review)

- **Question** (non-blocking; SM to track at finish) [PIN-1 confirmed]: tempest's `@arcade/shared` is pinned to the moving feat branch (lock-resolved to `arcade-shared@038bec5`, which I confirmed == arcade-shared HEAD, so tempest consumes exactly the reviewed code). At SH2 epic release this must be re-pinned to a version tag + bump. Affects `tempest/package.json` + `tempest/package-lock.json`. *Found by Reviewer during code review.*
- **Question** (non-blocking; Architect) [PURITY-1 reaffirmed]: I ACCEPT the rAF exclusion as the correct spec-authority resolution, but the guard is now marginally weaker — a future pure subpath could add `requestAnimationFrame` undetected. This is bounded (rAF is a timing, not DOM-render, primitive; `loop` already uses it) and loudly documented, but the Architect should ratify the permanent policy. Affects `docs/adr/0003-render-surface-extraction.md` + `arcade-shared/tests/purity.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking; nit) [DRY-1]: `arcade-shared/package.json` `pretest` repeats the literal `tsc -p tsconfig.build.json` already in `build`/`prepare`; `"pretest": "npm run build"` would be DRY. Harmless as-is. Affects `arcade-shared/package.json`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)

- **Purity-guard fail-set excludes `requestAnimationFrame`**
  - Spec source: ADR-0003 (Amendment 1) + design spec §3 (lines 94–97); story context-story-SH2-2.md §AC-2 (the sketched `DOM_GLOBALS` list)
  - Spec text: "any *pure* subpath (`math3d`, `rng`, `highscore`, `loop`, `font`) that references `document`, `window`, `canvas`, `FontFace`, or `requestAnimationFrame` fails the guard."
  - Implementation: `tests/purity.test.ts` uses the fail-set `document | window | canvas | FontFace` — **`requestAnimationFrame` omitted.**
  - Rationale: the already-shipped pure subpath `loop` (`dist/loop.js`, lifted byte-for-byte from asteroids in SH-5) calls `requestAnimationFrame`/`cancelAnimationFrame` inside `createLoop`. Including rAF makes the guard FAIL on the current pure core, which directly violates AC-2 ("it passes for the current pure core"). Per the spec-authority hierarchy (story scope AC > design > ADR), AC-2's binding "passes for the current core" clause wins. The four remaining globals are the DOM/render/async-load ones a pure *font* must never touch, so the guard keeps its teeth for `font`. Verified: `document|window|canvas|FontFace` = 0 whole-word hits across every current pure dist file **and** tempest's `vecfont.ts` (future `font.js`).
  - Severity: minor (guard is correct and AC-2-satisfying) — but see Delivery Finding [PURITY-1]: the rAF/loop classification needs Architect ratification.
  - Forward impact: if the Architect wants rAF back in the fail-set, `loop`'s `createLoop` must first be split into a browser subpath (out of SH2-2 scope); the guard's `DOM_GLOBALS` list is a one-line change at that point.

- **`layoutText` gains an optional `opts: { letterSpacing }` now (not a strictly-"verbatim" move)**
  - Spec source: story description ("Move … verbatim"); design spec §4.1 (the `layoutText(text, opts?: LayoutOptions)` signature)
  - Spec text: story says "Move tempest's `vecfont.ts` … verbatim"; design §4.1 shows `export interface LayoutOptions { letterSpacing?: number }  // absorbs per-game spacing (A2-2)` and `layoutText(text, opts?)`.
  - Implementation: `tests/font.test.ts` drives an OPTIONAL `opts.letterSpacing` into `layoutText` (omitted/0 == today's behaviour; positive value shifts glyph i by `i*spacing`, first glyph unmoved). tempest still calls `layoutText(text)` unchanged.
  - Rationale: the two higher-authority sources agree the shared module carries `letterSpacing` (design §4.1); it is additive and backward-compatible, so "verbatim" (behaviour-preserving for tempest) still holds. Adding it here — rather than in SH2-4 (asteroids, the first consumer) — matches the design and avoids a later breaking signature change to a pinned dep.
  - Severity: minor
  - Forward impact: SH2-4 (asteroids migration) consumes `letterSpacing` for the A2-2 concern; the contract is pinned here so that story needs no font-module change.

- **"VGMSGA glyph table" delivered as the verbatim accessor surface, not a new raw-object export**
  - Spec source: story AC-1 ("exports the VGMSGA glyph table")
  - Spec text: "@arcade/shared/font exports the VGMSGA glyph table, layoutText(text, opts?) -> {strokes, width}, and CELL_W/CELL_H"
  - Implementation: tests assert the glyph table is exported/enumerable via the verbatim `GLYPH_CHARS` + `charGlyph()` + `hasGlyph()` surface (what `vecfont.ts` actually exposes, and what design §4.1's API sketch lists) — NOT a new raw object literally named `VGMSGA`.
  - Rationale: `vecfont.ts` keeps its glyph data private (`ROM`/`GLYPHS`) and exposes it through accessors; a verbatim move preserves that. `GLYPH_CHARS` + `charGlyph` already give SH2-3's glyph audit full enumeration. Inventing a `VGMSGA` identifier would be non-verbatim and unspecified in shape.
  - Severity: minor
  - Forward impact: if SH2-3 wants a raw table object, adding a named export over the existing `GLYPHS` map is trivial and additive.

- **Tempest's verbatim glyph-geometry contract relocated to arcade-shared; `tempest/tests/shell/vecfont.test.ts` deleted**
  - Spec source: story AC-3 ("its local src/shell/vecfont.ts is deleted")
  - Spec text: "tempest imports @arcade/shared/font …; its local src/shell/vecfont.ts is deleted and font.ts re-exports the shared module."
  - Implementation: the ROM fidelity anchors (A/I/O/R/T shapes, cell containment, stroke semantics, layout) are ported verbatim into `arcade-shared/tests/font.test.ts` (the font's new home); tempest's old `vecfont.test.ts` — which imported the soon-deleted `vecfont.ts` as a module and via `?raw` — is deleted and replaced by `tempest/tests/shell/font.test.ts` (integration + asset-removal + a light behaviour anchor).
  - Rationale: leaving the old test would ERROR at GREEN on the deleted `vecfont.ts?raw` import; the geometry contract belongs where the code now lives. Net coverage is preserved (moved, not dropped).
  - Severity: minor
  - Forward impact: none — coverage is equal-or-better; tempest keeps a behaviour-preservation anchor proving no visual change.

### Dev (implementation)

- **Added a `pretest` build step to arcade-shared**
  - Spec source: story AC-1/AC-2; TEA Delivery Finding [BUILD-1]
  - Spec text: AC-1 "added to … prepare build"; AC-2 "tests/purity.test.ts … passes for the current pure core" (the guard reads `dist/`).
  - Implementation: added `"pretest": "tsc -p tsconfig.build.json"` to `arcade-shared/package.json` so `npm test` rebuilds `dist/` before vitest runs.
  - Rationale: `dist/` is gitignored, so a fresh checkout / CI has no built artifact for the purity guard to read; without a prebuild `npm test` would fail on a missing `dist/font.js`. The `prepare` script only runs on install, not on test.
  - Severity: minor
  - Forward impact: none — every `npm test` is now self-contained (build + test); marginally slower but deterministic.

- **Deleted `public/fonts/Readme.txt` (beyond AC-4's literal `.ttf`)**
  - Spec source: story AC-4; TEA Delivery Finding [READ-1]
  - Spec text: "tempest's vestigial VectorBattle-e9XO.ttf and the contactSheet.ts 'Vector Battle' font-family reference are removed." (names only the `.ttf`)
  - Implementation: also `git rm public/fonts/Readme.txt`, leaving `public/fonts/` empty (untracked).
  - Rationale: `Readme.txt` is the Vector Battle TTF's **non-commercial license file** (the liability ADR-0002 cites); it exists only to accompany the now-deleted font ("this readme file must be included with each font"). Leaving it would keep a dead license doc for an absent, prohibited-for-commercial-use asset.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

- **TEA: Purity-guard fail-set excludes `requestAnimationFrame`** → ✓ ACCEPTED by Reviewer: sound spec-authority call. AC-2's "passes for the current pure core" (story scope) outranks the design/ADR fail-list (lower authority); I independently confirmed `dist/loop.js` is the *only* pure subpath referencing rAF and that `document|window|canvas|FontFace` = 0 across all five built pure subpaths (incl. `font.js`). The divergence is exhaustively documented in the test and flagged as [PURITY-1] for Architect ratification — not silent. See my reaffirmation finding [PURITY-1].
- **TEA: `layoutText` gains optional `opts: { letterSpacing }`** → ✓ ACCEPTED by Reviewer: prescribed verbatim by design §4.1 (`LayoutOptions { letterSpacing? }`). I diffed the new `layoutText` against the original: the default path is `opts?.letterSpacing ?? 0` → `cursor += g.advance + 0`, byte-identical output for tempest's single-arg call. Additive and backward-compatible.
- **TEA: "VGMSGA glyph table" delivered as the verbatim accessor surface** → ✓ ACCEPTED by Reviewer: `GLYPH_CHARS` + `charGlyph()` + `hasGlyph()` are exactly what design §4.1's API sketch lists and what the verbatim source exposes; a raw `VGMSGA` object was never in the design. SH2-3's glyph audit is fully served by this surface.
- **TEA: vecfont geometry contract relocated to arcade-shared; tempest `vecfont.test.ts` deleted** → ✓ ACCEPTED by Reviewer: correct — the old test imported the now-deleted `vecfont.ts` (module + `?raw`) and would error at GREEN. Coverage moved to `arcade-shared/tests/font.test.ts`; I additionally byte-verified the ROM table + `build()`/accessors are identical to the original, which is stronger than any per-glyph test.
- **Dev: Added `pretest` build to arcade-shared** → ✓ ACCEPTED by Reviewer: necessary — `dist/` is gitignored and the purity guard reads `dist/*.js`; `prepare` only runs on install. Without it a fresh `npm test` would fail on a missing `dist/font.js`. (Minor DRY nit logged as [DRY-1], non-blocking.)
- **Dev: Deleted `public/fonts/Readme.txt` beyond AC-4's literal `.ttf`** → ✓ ACCEPTED by Reviewer: it is the deleted TTF's own non-commercial license readme — vestigial once the font is gone, and keeping it would preserve a dead license doc for the exact asset ADR-0002 retires.

**Undocumented deviations found:** none. I diffed the full `vecfont.ts` → `src/font.ts` change end-to-end — the only substantive divergence is the header comment + `LayoutOptions` + the `layoutText` signature/body; all glyph data and layout logic are byte-identical, so there is no hidden behavioural change for tempest.

## Dev Assessment

**Implementation Complete:** Yes — all 4 ACs met; both subrepos GREEN.

**Files Changed:**

*arcade-shared* (branch `feat/SH2-2-shared-font-purity-guard`, pushed → commit `9ea4bd7` tests + impl):
- `src/font.ts` (new) — VGMSGA glyph table + `layoutText(text, opts?)` + `CELL_W`/`CELL_H`, promoted verbatim from tempest's `vecfont.ts`; pure (no DOM/time/randomness). Adds the design-§4.1 optional `letterSpacing` (omitted/0 = identical to tempest's layout).
- `package.json` — `exports["./font"]` → `dist/font.{js,d.ts}`; `pretest` builds `dist/` before vitest.

*tempest* (branch `feat/SH2-2-shared-font-purity-guard`, pushed → commit `73b2370` tests, impl on top):
- `package.json` / `package-lock.json` — `@arcade/shared` → `#feat/SH2-2-shared-font-purity-guard` (resolved `038bec5`).
- `src/shell/font.ts` — `export * from '@arcade/shared/font'` (was `./vecfont`).
- `src/shell/render.ts` — imports `layoutText`/`CELL_H` from `./font` (was `./vecfont`); stale comment updated.
- `src/tools/contactSheet.ts` — `LABEL_FONT` drops `'Vector Battle'`.
- Deleted: `src/shell/vecfont.ts`, `public/fonts/VectorBattle-e9XO.ttf`, `public/fonts/Readme.txt`.

**Tests:**
- arcade-shared: **146/146 GREEN** (font 27, purity 6, source-rules 2, + 111 pre-existing). `dist/font.js` verified 0 hits for `document|window|canvas|FontFace`.
- tempest: **750/750 GREEN**; `tsc --noEmit` clean; `vite build` succeeds (proves the `export *` re-export + repointed imports resolve `@arcade/shared/font` at the type level and bundle).
- Verified by testing-runner (`SH2-2-dev-green-shared`, `SH2-2-dev-green-tempest`).

**AC status:** AC-1 ✓ (font exports + subpath map + prepare/pretest build) · AC-2 ✓ (purity guard passes current core, would fail on a DOM leak) · AC-3 ✓ (tempest re-points at the pinned ref, `vecfont.ts` deleted, `font.ts` re-exports, vitest + vite build green, geometry byte-identical) · AC-4 ✓ (TTF + `'Vector Battle'` reference removed).

**Not done (correctly out of scope):** afterglow port, glow/view/compositor extraction (later SH2 stories); the rAF/loop guard classification [PURITY-1] left for Architect.

**Branches:** both pushed; **no PR created** (SM creates PRs at finish). Note [PIN-1]: tempest's feat-branch pin is provisional — re-pin to a release tag at epic release.

**Handoff:** To review phase (The Thought Police).

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 — both trees clean; arcade-shared 146/146, tempest 750/750; both builds clean; dist purity 0 across all 5 pure subpaths; deletions verified; no lingering refs; no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter=false` — boundary domain assessed by Reviewer directly (layoutText empty-string/single-glyph/letterSpacing paths) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error paths in a pure geometry module; `charGlyph` blank-degrade is intentional + documented (assessed by Reviewer) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer (purity detector non-vacuous self-tests; geometry/letterSpacing assert concrete values; ROM independently byte-verified) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — doc accuracy assessed by Reviewer (render.ts:556 comment updated; no stale `vecfont` live refs; font.ts provenance is accurate history) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed by Reviewer (readonly LayoutOptions; `export *` re-export; `??` not `||`; tsc/vite clean) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no untrusted input/DOM/network/secrets; purity guard reads fixed dist/ paths (assessed by Reviewer) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer (one DRY nit [DRY-1] in pretest; guard self-tests justified, not over-engineering) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — TS lang-review checklist enumerated by Reviewer in Rule Compliance below |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via settings and pre-filled as Skipped)
**Total findings:** 0 confirmed blocking, 0 dismissed, 3 non-blocking Questions/Improvements ([PIN-1], [PURITY-1 reaffirmed], [DRY-1])

## Rule Compliance

TS lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) + the project rule from ADR-0003 (purity fence). No `.claude/rules/*.md`, no `SOUL.md`. Enumerated exhaustively over the changed `.ts`:

- **ADR-0003 purity fence (project rule) — pure subpaths must be DOM-free:** COMPLIANT. `arcade-shared/src/font.ts` has zero `document|window|canvas|FontFace` (and zero rAF); built `dist/font.js` independently grepped = 0 (preflight + my own scan). The guard `tests/purity.test.ts` enforces this over all five pure subpaths. Note the deliberate, ratified-pending rAF exclusion (deviation ACCEPTED; [PURITY-1]).
- **#1 Type-safety escapes:** COMPLIANT. No `as any` / `as unknown as` / `@ts-ignore` in `src/font.ts` (enforced by `tests/font-source-rules.test.ts`); none in the tempest changes.
- **#2 Generic/interface pitfalls:** COMPLIANT. `ROM: Readonly<Record<string, readonly Vec[]>>`, `Vec = readonly [number, number, 0|1]`, `VecStroke`/`VecGlyph`/`LayoutOptions` all readonly/typed. No `Record<string, any>`, no `object`/`Function` types.
- **#3 Enum anti-patterns:** N/A — no enums.
- **#4 Null/undefined handling:** COMPLIANT and exemplary — `const letterSpacing = opts?.letterSpacing ?? 0` uses `??` (not `||`), so `letterSpacing: 0` is preserved as a valid value (the exact check #4 warns about). `render.ts` `import { layoutText, CELL_H }` are guaranteed-present named exports.
- **#5 Module/declaration:** COMPLIANT. tempest `font.ts` `export * from '@arcade/shared/font'` re-exports both values and types (the shared module has runtime exports, so this is not a type-only re-export needing `export type`). No missing `.js` extensions (arcade-shared = bundler resolution; tempest = vite; the shared specifier resolves via the `exports` map). `exports["./font"]` lists `types` before `import` (correct order for TS).
- **#6 React/JSX:** N/A — no JSX.
- **#7 Async/Promise:** N/A — font module is fully synchronous/pure.
- **#8 Test quality:** COMPLIANT. Tests import `../src/font` (source), the purity guard reads `dist/` (the deliberate, documented exception — it tests the delivered artifact). No vacuous assertions; the purity detector has explicit non-vacuous self-tests; letterSpacing/geometry assert concrete values.
- **#9 Build/config:** COMPLIANT. `tsconfig.build.json` unchanged (`strict: true` retained). `pretest` build added (necessary; see deviation). `exports` map extended consistently.
- **#10 Security input validation:** N/A — no untrusted input; `layoutText(text)` produces geometry, no parse/eval/DOM/injection surface.
- **#11 Error handling:** N/A — no `catch`, no throws; unsupported chars degrade to a blank glyph by design.
- **#12 Performance/bundle:** COMPLIANT. `export *` from a single-purpose module tree-shakes fine; vite bundle built in 29ms, render chunk 27.88 kB (no bloat). Purity guard uses sync `fs` only in a test (not a request handler).

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (≥5, tagged by domain):**

- `[VERIFIED]` **Glyph data is byte-identical to the retired `vecfont.ts`** — evidence: `diff` of the `const ROM` block and the `build()`/`GLYPHS`/`hasGlyph`/`charGlyph` region between `origin/develop:src/shell/vecfont.ts` and `arcade-shared/src/font.ts` = empty (`>>> BYTE-IDENTICAL <<<`); `CELL_W`/`CELL_H`/`GLYPH_CHARS` match. This is the load-bearing proof of "no visual change" and covers every glyph the tests don't geometry-anchor (B, C, …, digits). Complies with the story's "verbatim" mandate.
- `[VERIFIED][TYPE]` **`layoutText` default path is behaviour-preserving** — evidence: the only body change is `cursor += g.advance + letterSpacing` with `letterSpacing = opts?.letterSpacing ?? 0`; tempest calls `layoutText(text.toUpperCase())` (one arg) at `render.ts:570`, so `letterSpacing=0` → identical output and identical `width`. Uses `??` correctly (TS #4).
- `[VERIFIED][SEC]` **No new attack surface** — evidence: `src/font.ts` is a pure function of a string → geometry; no DOM, network, secrets, or `JSON.parse`/eval. The purity guard reads fixed `dist/<name>.js` paths via `node:fs` (no traversal). Nothing to exploit.
- `[VERIFIED][DOC]` **No stale references survive** — evidence: preflight grep for `vecfont|Vector Battle|VectorBattle|FontFace` across `tempest/src` + `index.html` = "(no lingering refs)"; `render.ts:556` comment repointed to `@arcade/shared/font`; `index.html`/`models.html` reference no font asset, so deleting the TTF 404s nothing.
- `[VERIFIED][SIMPLE]` **Purity guard is honest, not over-built** — evidence: `tests/purity.test.ts` includes a `domGlobalsIn` detector with three self-tests (flags a planted `document.createElement('canvas')`, clears pure arithmetic, rejects the `windowStart` substring). The one nit is `pretest` duplicating the build command ([DRY-1], LOW, non-blocking).
- `[MEDIUM][SEC/RULE]` **Guard fail-set omits `requestAnimationFrame`** — the ADR-0003/design fail-list includes rAF, this guard does not. ACCEPTED as the correct spec-authority resolution (AC-2 "passes for the current core" is unsatisfiable with rAF included, because `loop.js` uses it), but it leaves a bounded coverage gap. Non-blocking; flagged [PURITY-1] for Architect ratification.
- `[LOW][SIMPLE]` **`contactSheet.ts` `LABEL_FONT` now names `'Orbitron'`** which isn't self-hosted — evidence: `src/tools/contactSheet.ts:35`. It's a canvas `ctx.font` string in a dev-only tool (`/models.html`) that falls back to `monospace`; cosmetic, out of SH2-2 scope (the lobby/webfont question is SH2-7). Not blocking.

**Subagent dispatch tags:** `[EDGE]` disabled — layoutText empty/single-glyph/letterSpacing paths checked by Reviewer, all sound · `[SILENT]` disabled — no error paths (pure module); blank-glyph degrade is intentional · `[TEST]` disabled — tests non-vacuous, ROM byte-verified independently · `[DOC]` disabled — no stale refs (verified) · `[TYPE]` disabled — readonly types, `export *`, `??`; tsc/vite clean · `[SEC]` disabled — no untrusted-input/DOM/secret surface · `[SIMPLE]` disabled — one DRY nit [DRY-1] · `[RULE]` disabled — TS checklist enumerated in Rule Compliance (all applicable checks compliant).

**Data flow traced:** a HUD string → `render.ts:570 layoutText(text.toUpperCase())` (imported from `./font` → `@arcade/shared/font`) → returns `{strokes, width}` in cell-local units → `render.ts` scales by `sizePx / CELL_H` and strokes through the glow path. Safe: pure, deterministic, no DOM in the pure module, geometry byte-identical to pre-migration.

**Pattern observed:** clean subpath extraction — verbatim data move + an additive, optional, backward-compatible API extension (`letterSpacing`), fenced by a source-text purity guard. Good pattern for the remaining SH2 subpaths.

**Error handling:** N/A for a pure geometry module; unsupported characters degrade to a blank glyph (`charGlyph` → `BLANK`) rather than throwing — intentional and unchanged from the original.

### Devil's Advocate

Argue this is broken. The most dangerous failure mode in a "verbatim move" is a **silent transcription error**: the tests geometry-anchor only A, I, O, R, T and `0=O` — a single wrong ROM vector in, say, `G`, `Q`, `5`, or `8` would sail through every test (they only check "≥1 stroke, positive advance, ink inside the cell") yet permanently corrupt a glyph in every game that adopts this font. This is exactly the kind of defect a rubber-stamp misses. I did not trust the tests here: I diffed the entire `const ROM` table and the `build()`/accessor logic against `origin/develop:src/shell/vecfont.ts` byte-for-byte — empty diff — so this specific catastrophe is provably absent. Next: the re-export chain. `export * from '@arcade/shared/font'` could silently drop a symbol tempest needs, or resolve a stale commit. Could `render.ts` import `undefined` for `CELL_H`? No — `export *` re-exports all named values, `CELL_H` is one, and `tsc --noEmit` + the passing behaviour anchor prove the resolution at type and runtime level; and I confirmed tempest's lock resolves to `038bec5`, the exact arcade-shared HEAD under review, not a stale ref. Next: does deleting the TTF break the running app? A `<link>`/`@font-face`/loader would 404 — but the grep across `src` and both HTML entry points finds nothing, and story 10-13 already removed the loader; the TTF was pure dead weight. Next: the purity guard could be theatre — passing because it tests nothing. But its detector has adversarial self-tests (a planted `document.createElement('canvas')` IS flagged; `windowStart` is NOT), so it has real teeth. The one genuine soft spot the devil finds is the **rAF omission**: a future pure module could smuggle in `requestAnimationFrame` and this guard would wave it through. That is real, but bounded (rAF is timing, not DOM rendering; `loop` already legitimately uses it), non-blocking for SH2-2, and explicitly escalated to the Architect as [PURITY-1] rather than hidden. A confused future maintainer is the likeliest casualty — mitigated by the extensive in-test comment explaining precisely why rAF is out. The devil finds no blocking wound: no behavioural change, no broken wiring, no dead-asset 404, no vacuous test. APPROVE stands.

**Handoff:** To SM (Winston Smith) for the finish ceremony.