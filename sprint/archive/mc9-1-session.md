---
story_id: "mc9-1"
jira_key: "mc9-1"
epic: "mc9"
workflow: "tdd"
---
# Story mc9-1: Authentic city and base stamps (retire the fillRect blocks and triangles)

## Story Details
- **ID:** mc9-1
- **Jira Key:** mc9-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** .
- **PR:** https://github.com/slabgorb/arcade/pull/79
- **Branch:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T20:57:54Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T19:49:05Z | 2026-08-07T19:54:50Z | 5m 45s |
| red | 2026-08-07T19:54:50Z | 2026-08-07T20:04:12Z | 9m 22s |
| green | 2026-08-07T20:04:12Z | 2026-08-07T20:20:05Z | 15m 53s |
| review | 2026-08-07T20:20:05Z | 2026-08-07T20:35:18Z | 15m 13s |
| green | 2026-08-07T20:35:18Z | 2026-08-07T20:47:05Z | 11m 47s |
| review | 2026-08-07T20:47:05Z | 2026-08-07T20:57:54Z | 10m 49s |
| finish | 2026-08-07T20:57:54Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- Type: Question, Urgency: non-blocking — W3DSUP/W3-family .MAC cites use logical (non-blank) line numbering vs physical line numbers; grep `.SBTTL` headers and use `grep -a` to avoid binary-false-empty trap on .MAC files.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): The mc9-1 citation/wiring guards in `render-stamps.test.ts` do not enforce what their names claim (whole-`src/shell` scan, mutation-defeated; vacuous filename/relative-import checks). Affects `plugins/missile-command/tests/render-stamps.test.ts` (scope the citation to the stamp module; assert the real imported symbols). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `NC`/`NB` duplicate `field.ts`'s exported `NCITY`/`NMISBA`. Affects `plugins/missile-command/tests/render-stamps.test.ts:114-115` (import them). *Found by Reviewer during code review.*
- **Question** (non-blocking): a per-game shared render-test harness could retire the third `recordingCtx` duplicate (render-field/render-battle/render-stamps). Affects `plugins/missile-command/tests/` (extract on this third occurrence — the `src/shared` extraction bar). *Found by Reviewer during code review.*

### Dev (rework)
- No upstream findings during rework. The three render-test helpers still duplicate the recording-ctx shape (now distinctly named); a shared per-game render-test harness remains a viable follow-up but is out of this review-fix round's scope. *Found by Dev during rework.*

### Reviewer (code review — round-trip 1)
- **Improvement** (non-blocking): the new `stampModule()` import-resolver in `render-stamps.test.ts` recognises only a single-statement named `{ … }` `./…js` import; a future `import * as stamps from './stamps.js'` or a split-across-two-statements refactor of render.ts would make the wiring guard **false-RED** (wrongly fail) rather than false-GREEN. Affects `plugins/missile-command/tests/render-stamps.test.ts` (broaden the resolver, or keep the named-import convention). Fail-safe direction, non-blocking. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 1 Question, 2 Improvement)
**Blocking:** None

- **Improvement:** The mc9-1 citation/wiring guards in `render-stamps.test.ts` do not enforce what their names claim (whole-`src/shell` scan, mutation-defeated; vacuous filename/relative-import checks). Affects `plugins/missile-command/tests/render-stamps.test.ts`.
- **Improvement:** `NC`/`NB` duplicate `field.ts`'s exported `NCITY`/`NMISBA`. Affects `plugins/missile-command/tests/render-stamps.test.ts:114-115`.
- **Question:** a per-game shared render-test harness could retire the third `recordingCtx` duplicate (render-field/render-battle/render-stamps). Affects `plugins/missile-command/tests/`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`plugins/missile-command/tests`** — 2 findings
- **`plugins/missile-command`** — 1 finding

### Deviation Justifications

1 deviation

- **`recordingCtx` finding closed by local rename, not the offered cross-file extraction**
  - Rationale: rename is the reviewer's explicitly-offered alternative and closes the "divergent semantics under one name" trap at zero blast radius; a shared-harness extraction would edit two other passing test files — scope creep for a review-fix round, and the `src/shared` extraction bar is a game-level call, not a test-helper one.
  - Severity: minor
  - Forward impact: none — the three test files keep their own local ctx helpers, now distinctly named.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
Dev logged three design deviations in the Dev Assessment (no entries in this section). I audit them here:
- **Functional two-green colours (top `#9f9` / bottom `#6f6`), not the per-wave 8-colour palette** → ✓ ACCEPTED: the palette is explicitly mc9-2 (epic scope); the ROM's CSTCOL top/bottom two-tone is honoured, geometry is authentic. Verified against `W3DSUP.MAC:1213` (CSTCOL `.BYTE 1,0,1,0`).
- **Missile pyramid re-seated by `+7` (`MISSILE_SEAT` = −min(MISTBV))** → ✓ ACCEPTED: placement-only, shape unchanged; arithmetic verified (`min(MISTBV)=-7`, bottom row → dv 0, apex → dv 9).
- **Launch-platform line under a live base** → ✓ ACCEPTED: sound — keeps a spent (0-ammo) live base legible; drawn unconditionally on `alive` (`render.ts:99`), so it never masquerades as rubble.
- **UNDOCUMENTED (Reviewer):** none. The diff touches only `src/shell` + the test; no silent spec deviation found (core/shell boundary held — no `src/core` in the diff).

### Dev (implementation)
Rework round (review REJECT → green). Test-file-only fixes to `render-stamps.test.ts`; production code (`render.ts`, `stamps.ts`) unchanged per the reviewer's handoff.
- **`recordingCtx` finding closed by local rename, not the offered cross-file extraction**
  - Spec source: Reviewer Assessment table row 5 (LOW `[RULE]`, `render-stamps.test.ts:56`)
  - Spec text: "Extract a shared render-test harness, or rename to disambiguate (optional given the siblings already duplicate)"
  - Implementation: Renamed the local helper `recordingCtx` → `markCountingCtx` (in-file only); did NOT extract a shared harness across render-field/render-battle.
  - Rationale: rename is the reviewer's explicitly-offered alternative and closes the "divergent semantics under one name" trap at zero blast radius; a shared-harness extraction would edit two other passing test files — scope creep for a review-fix round, and the `src/shared` extraction bar is a game-level call, not a test-helper one.
  - Severity: minor
  - Forward impact: none — the three test files keep their own local ctx helpers, now distinctly named.
- No other deviations: the three MEDIUM guard/constant fixes and the LOW comment correction follow the reviewer's rework spec verbatim.

### Reviewer (audit — round-trip 1)
- **`recordingCtx` finding closed by local rename, not cross-file extraction** → ✓ ACCEPTED by Reviewer: sound. Rename to `markCountingCtx` is the alternative I explicitly offered in round 1; it closes the same-name/divergent-semantics trap (verified: siblings return `Mark[]`, this returns `string[]`) at zero blast radius. A cross-file harness extraction would edit two other passing test files — correctly out of scope for a review-fix round; the `src/shared`/shared-harness bar is a deliberate, separate call. No forward impact.
- **"No other deviations"** → ✓ ACCEPTED by Reviewer: confirmed — the three MEDIUM guard/constant fixes and the LOW comment fix match the round-1 rework spec exactly, and production code is byte-identical (no silent spec drift). No UNDOCUMENTED deviations found this round (diff is test-only).

## Sm Assessment

**Story:** mc9-1 — Authentic city and base stamps (retire the fillRect blocks and triangles). 5pt, p1, tdd, missile-command plugin. The phase pointer read `setup` on arrival; handing off to TEA for red.

**Board probes (all clean):** no `mc9` branch on origin before this claim; sibling sessions = only a-1 on jt10-6 (joust, no contention); no open PRs (merge gate clear).

**Premise verification (all falsifiable claims HOLD against the current tree — description copied forward as current fact, no correction block needed):**
- Depends on mc3 → mc3 is COMPLETE and archived (commit `996a4bda`); `render.ts` carries `mc3-5` markers. Dependency satisfied.
- `render.ts` draws cities as `fillRect` blocks (`plugins/missile-command/src/shell/render.ts:48-52`) and bases as triangles (`:56-72`). The "replace the fillRect/triangle placeholders" premise is true and current.
- ROM cites present IN-TREE at `plugins/missile-command/reference/source/W3DSUP.MAC`: `:587 .SBTTL WRITE A STAMP`, `:1067 .SBTTL DRAW ALL LIVING CITIES`. Citation byte-checks will run (source not gitignored), not skip.

**Setup deviation — orphaned epic shard:** `epic-mc9.yaml` was filed as an untracked shard but never added to `current-sprint.yaml`'s `epics:` list, so `pf` skipped it: `story show` read it, but `story update --status` errored "not found". Fixed with `pf sprint epic reindex mc9` (the sanctioned command — not a hand-edit), then stamped `in_progress`. NOTE: **mc4 and mc8 are still orphaned the same way** — reindex them before working any mc4-*/mc8-* story.

**Scope guardrails for the pipeline (from the epic + ACs):**
- This is SHELL render-data work. Stamp geometry lives in a `src/shell` data module. NO `src/core` touch. `purity.test.ts` must stay green.
- Live cities/bases render from authentic W3DSUP-derived stamp geometry, positioned by the existing `project()` cabinet→canvas mapping (mc3). A dead city/base still draws as rubble, never as a live stamp.
- The render source must cite `WRITE A STAMP (W3DSUP.MAC:587)` and `DRAW ALL LIVING CITIES (W3DSUP.MAC:1067)`.
- Citation methodology heads-up (recorded as a Delivery Finding): W3DSUP/W3-family `.MAC` cites use logical (non-blank) line numbering vs physical; grep `.SBTTL` and use `grep -a`.

**Claim pushed:** commit on `feat/mc9-1-authentic-city-base-stamps` (epic shard + index + epic/story context), branch pushed to origin — sibling-visible.

**Handoff:** TEA (Han Solo) writes the red render tests asserting live-vs-dead stamp geometry against the existing canvas-mock harness.

## Tea Assessment

**RED delivered.** New failing test file `plugins/missile-command/tests/render-stamps.test.ts`. Full missile-command project run: **6 failed | 506 passed** — every failure is in the new file; the other 26 test files stay green. Committed `cd82cd17`. Lint (`tsc --noEmit`) clean.

**Division of labour (the mc1-2 render-field.test.ts precedent, stated in that file):** whether the drawn glyph *looks* like the cabinet's city/base is an owner/reviewer screenshot check at `/missile-command/` — no node test makes it. These tests pin the checkable structural facts the placeholder fails; they deliberately do NOT assert exact glyph shape or sub-pixel placement.

**What is RED and why (maps to the three ACs):**
- **AC1/AC2 wiring (2 tests):** a NEW `src/shell` module (beyond render/input/timebase) holds the stamp geometry, and `render.ts` imports it shell-locally (`'./…'`). Today render.ts imports only `../core/*` → RED.
- **AC2 citations (2 tests):** the render source (render.ts + new shell modules) cites `W3DSUP.MAC:587` (WRITE A STAMP) and `W3DSUP.MAC:1067` (DRAW ALL LIVING CITIES). Absent today → RED.
- **AC1/AC3 behavioural — city (1 test):** via a recording-ctx harness (counts every coordinate primitive), a frame with one live city vs the all-dead baseline isolates that city's marks. Placeholder live city = 1 `fillRect`, its rubble = 1 `fillRect` → live−dead delta **0**; authentic multi-part stamp geometry makes it ≥2 → RED today.
- **AC1/AC3 behavioural — base (1 test):** placeholder live base = `moveTo`+2×`lineTo` = 3 marks over 1-mark rubble → delta **2** (a plain triangle, exactly); authentic stamp exceeds it (≥3) → RED today.

**Guards that pass today (ride-along, RED only on regression):** dead field still emits ≥9 rubble marks (dead ≠ blank); full-live field richer than full-dead; **no `src/core` module carries stamp geometry** (AC2 boundary — reddens only if Dev wrongly puts stamps in core).

**Rule Coverage:**
- **Core/shell boundary (the project's #1 rule):** enforced twice — the existing `purity.test.ts` src/core sweep (stays green; this is shell-only work) plus my explicit "no stamp geometry in src/core" guard. Dev must add the stamp module under `src/shell`, import it from render.ts, and touch no `src/core` file.
- **Meaningful assertions (no vacuous tests):** every test asserts a concrete delta (`≥2`, `≥3`, `>`) or a source regex match; none use `let _ =`, `assert(true)`, or always-None checks. The recording ctx counts real emitted primitives, not a stubbed constant.
- **Citation discipline:** the two W3DSUP routine cites are required in the render source. NOTE the mc `.MAC` methodology (Delivery Finding above): logical vs physical line numbering, `grep -a`. The shell citation is free-form prose — the claims/dossier apparatus guards `src/core` literals and `docs/rom-study`, not `src/shell`, so no `claims/*.json` entry is required for these two cites (the anchors already live in `subsystems.md`).

**GREEN spec for Dev (Yoda):**
1. Add a `src/shell` stamp-geometry data module (e.g. `stamps.ts`) porting the W3DSUP city (3-stamp `DACITY`) and base shapes as render data — cite `W3DSUP.MAC:587` and `W3DSUP.MAC:1067` in it.
2. In `render.ts`, replace the live-city `fillRect` block and the live-base triangle with geometry drawn from that module via the existing `project()` mapping. A live structure must emit multi-part marks; a dead one still draws as the grey rubble line.
3. Keep `purity.test.ts` green (no `src/core` change) and keep `render-field.test.ts` green (≥9 bottom-band marks — authentic stamps only add marks).
4. Thresholds (city delta ≥2, base delta ≥3) are ROM-grounded (a city is 3 stamps; a stamp is an 8-row glyph), not arbitrary — porting real geometry clears them comfortably.

**Sprint bookkeeping (per Jedi, mid-RED):** mc4 and mc8 — the other orphaned Missile Command epic shards flagged in the Sm Assessment above — were adopted into the sprint index via `pf sprint epic reindex` and committed (`810d81fa`, pushed). All three mc epics (mc4/mc8/mc9) are now visible to `pf`; that Sm-Assessment "still orphaned" note is now resolved.

**Handoff:** Dev (Yoda) implements GREEN per the spec above.

## Dev Assessment

**GREEN delivered.** Two files: new `plugins/missile-command/src/shell/stamps.ts` (cited stamp-geometry data module) + `render.ts` (wired to it). All 6 RED tests pass; **missile-command 512/512**; full repo **vitest 13241 passed / 0 failed** (869 files, 1 todo) and **orchestrator 408 / 0 failed**; `tsc --noEmit` clean.

**Authentic geometry — ported from the ROM, not approximated:**
- **City = the real 4-stamp DACITY grid.** The four quadrant bitmaps are the `;CITY` LETTER-table bytes *verbatim* (`W3DSUP.MAC:3632-3638`, stamp ids 0x1D–0x20), composed 2×2 by the `CSTNUM/CSTCOL/CSTHOF` table (`W3DSUP.MAC:1213-1217`) that `DRAW ALL LIVING CITIES` drives (`:1067`); each 8-row glyph is a `WRITE A STAMP` stamp (`:587`). Left column H−4, right H+4; top rows one hue, bottom another.
- **Base = the ABM stockpile pyramid.** `MISTBH/MISTBV` (`W3DSUP.MAC:1329-1331`, `DRAW MISSILE` `:1221`) place up to MAXMIS=10 ready missiles in a 1-2-3-4 triangle; the base draws its first `ammo` missiles, so the pile shrinks with ammo exactly as the cabinet's does. Far more faithful than the retired plain triangle.

**Design deviations (recorded for the Reviewer):**
- **Colours are functional two-green** (top `#9f9` / bottom `#6f6`), honouring the ROM's top/bottom two-tone (CSTCOL) but NOT the per-wave 8-colour palette — that is explicitly **mc9-2**, out of scope here. The stamp *geometry* is authentic; the palette is deferred by design.
- **Missile pyramid re-seated by +7** (`MISSILE_SEAT` = −min(MISTBV)) so the widest row rests on the base ground line and the pyramid rises above it (bottom-origin cabinet V that render.ts flips). This is a placement convenience, not a shape change.
- A short **launch-platform line** is drawn under each live base so a spent-but-alive (0-ammo) base still reads as a base rather than vanishing.

**Boundary held:** shell-only. `src/core` untouched (`git diff` touches only `src/shell/`); `purity.test.ts` green; the mc9-1 "no stamp geometry in core" guard green.

**Visual verification (the video is the game):** served this tree at `/missile-command/` and screenshotted — green city stamp-clusters and the blue ABM missile pyramid render correctly via `project()`; struck structures show grey rubble. Both live-stamp and dead-rubble paths confirmed on-screen. (One unrelated console error: `favicon.ico` 404.)

**Reviewer note:** node tests pin structure (mark deltas, wiring, citations); the *look* is the screenshot above — the mc1-2 render-field.test.ts division of labour. The city bitmaps are small (8×8, unmagnified as the ROM ships them); if the owner wants them larger, that is a magnification tweak (ROM `MGNFH/V`), not a re-port.

**Handoff:** Reviewer (Obi-Wan Kenobi).

## Dev Assessment (rework — round-trip 1)

**Rework delivered.** Review REJECT was a cluster of 5 test-quality findings, all in the RED file `render-stamps.test.ts`; production code (`render.ts`, `stamps.ts`) confirmed correct and left **untouched** (`git status src/` clean). I verified every finding against the tree before touching it (they were real, not unrun claims) and **mutation-proved** the two guard fixes actually bite.

**Files Changed:** `plugins/missile-command/tests/render-stamps.test.ts` only (+71 −42).

**The five findings, addressed:**
- **[MED] Citation guard scope (161-173):** replaced the whole-`src/shell` `renderSourceText()` scan with `stampModuleText()` — scoped to the one module render.ts imports the stamp geometry from (resolved structurally from render.ts's `./…` import of `CITY_STAMPS`+`MISSILE_STACK`). **Mutation-proven:** stripping `:587` from `stamps.ts` alone (render.ts keeping its copy) now reddens the `:587` test — the old guard stayed green.
- **[MED] Vacuous wiring (136-153):** replaced the filename-count + any-`./`-import checks with `stampModule()`, which asserts render.ts imports the real symbols `CITY_STAMPS`/`MISSILE_STACK` from a NEW (non-preexisting) shell module, plus a cross-check that the module actually `export`s them. **Mutation-proven:** baking those symbols into render.ts (leaving an unrelated `./stamps.js` import that defeated the old guard) reddens both wiring tests.
- **[MED] NC/NB hardcode (114-115):** now `const NC = NCITY` / `const NB = NMISBA`, imported from `../src/core/field.js` — no duplicated literals.
- **[LOW] False comment (:9):** "3 stamps/city" → "4 stamps/city" (DACITY draws 4; `CITY_STAMPS` ships 4).
- **[LOW] `recordingCtx` divergence (:56):** renamed local helper → `markCountingCtx` (the reviewer's offered disambiguation), closing the same-name/different-semantics trap without editing the two sibling test files. See Design Deviations → Dev.

**Tests:** missile-command **512/512**; repo-wide vitest **13241 passed / 0 failed** (869 files, 1 todo); orchestrator **408 / 0**; `tsc --noEmit` clean.

**Handoff:** Reviewer (Obi-Wan Kenobi) — re-review the tightened guards. Production code is byte-identical to the approved-on-substance version.

## Subagent Results

_(Round-trip 1 re-review. The round-1 REJECTED verdict + its 5 findings are preserved in the committed `sprint/epic-mc9.yaml` (`review_findings`/`review_verdict`) and in Delivery Findings → Reviewer above.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (512/512 green, tsc clean; production src byte-identical to prior-reviewed HEAD 7d8ca97f) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — test-file change; boundary paths checked by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error surface in a test/pure-render diff (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by rule-checker + Reviewer's own mutation battery (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — confirmed the "3→4 stamps/city" fix, stampModule comment accuracy, and the sibling `Mark[]` claim |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types checked by Reviewer + rule-checker (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no ReDoS in the import regex, no path-traversal in fs reads (all static repo paths) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity checked by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 26 rules / 31 instances / 0 violations; all 5 prior findings verified resolved, no new violations |

**All received:** Yes (3 enabled returned clean; 5 disabled pre-filled; preflight green)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (all 5 round-1 findings resolved)

## Reviewer Assessment

**Verdict:** APPROVED

_Round-trip 1 re-review. Supersedes the round-1 REJECTED verdict, which stands on the committed epic shard as the historical record._

**Scope of this round.** The rework touched **one file** — the RED-phase `render-stamps.test.ts`. Production code is **byte-identical** to the round-1-reviewed HEAD (`git diff 7d8ca97f...HEAD -- plugins/missile-command/src/` is empty), so the round-1 verification of the geometry (verbatim `;CITY` bitmaps, exact `CSTNUM` order, `MISSILE_SEAT` arithmetic, on-screen render, core/shell boundary) **carries forward unchanged and I do not relitigate it**. The only question this round: do the tightened guards now enforce what their names claim? I proved they do — by mutation, not by reading the diff's claims.

**Data flow re-traced (test side):** render.ts `import { CITY_STAMPS, …, MISSILE_STACK } from './stamps.js'` → `stampModule()` resolves that sibling module by the named-symbol import → `stampModuleText()` reads *that module's* source → the citation/`export`-declaration guards police it. The scope is now bounded by code (the import on one side, the module's own declarations on the other), not by `readdirSync(shellDir)`.

**All five round-1 findings resolved (each independently re-verified):**

| # | Round-1 finding | Resolution | Reviewer verification |
|---|-----------------|------------|-----------------------|
| 1 | [MED] citation guard scanned whole `src/shell`, mutation-defeated | `renderSourceText()` removed; `stampModuleText()` scopes to the one module render.ts imports | **Mutation-proven:** stripping `:587` (then `:1067`) from `stamps.ts` **only** (render.ts keeps its own copy) reddens exactly the matching citation test — the old scan stayed green here |
| 2 | [MED] wiring tests vacuous (filename count + any-`./`-import) | `stampModule()` asserts render.ts imports the real `CITY_STAMPS`+`MISSILE_STACK` from a NEW (non-preexisting) module that `export`s them | **Mutation-proven:** baking those symbols into render.ts (leaving an unrelated `./stamps.js` import — the shape that defeated the old guard) reddens both wiring tests; dropping `export` on `CITY_STAMPS` reddens the export cross-check |
| 3 | [MED] `NC=6`/`NB=3` hardcoded | `const NC = NCITY` / `const NB = NMISBA`, imported from `../src/core/field.js` | [VERIFIED] `field.ts:27,39` export `NCITY=6`/`NMISBA=3`; drift would now fail the loop bounds. `[RULE]` rule-checker concurs (#26 resolved) |
| 4 | [LOW] comment "3 stamps/city" false | → "4 stamps/city" | [VERIFIED] `[DOC]` comment-analyzer + `[RULE]` rule-checker: matches the shipped 4-entry `CITY_STAMPS` (`stamps.ts:56-65`); no residual "3 stamps" anywhere in the file |
| 5 | [LOW] `recordingCtx` third divergent copy | renamed local helper → `markCountingCtx` + disambiguating comment | [VERIFIED] siblings genuinely return `Mark[]` (render-field/render-battle:44,52) vs this file's op-name `string[]`; same-name collision gone. Cross-file extraction correctly deferred (see Deviation audit) |

### Rule Compliance (lang-review/typescript.md — applicable checks, re-run for the reworked file)
- **#1 type-safety escapes** — [VERIFIED] only the established `as unknown as CanvasRenderingContext2D` mock idiom (`render-stamps.test.ts:95`), unchanged, matches the sibling harnesses. Compliant.
- **#2 generics/readonly** — [VERIFIED] `STAMP_SYMBOLS … as const`; `stampModule()` returns `{ file: string; imported: readonly string[] }`; `fieldState` params `readonly boolean[]`; helper mock is `Record<string, unknown>` (not `any`). Compliant.
- **#5 modules/ESM** — [VERIFIED] new import `from '../src/core/field.js'` carries `.js`; type-only `type GameState` correctly marked. Compliant.
- **#15 / #25 source-text guards** — **RESOLVED** (was VIOLATION). Citation scope narrowed to the resolved stamp module; mutation-tested to redden. Rule-checker independently mutation-tested and concurs.
- **#17 comment asserts a mechanism** — **RESOLVED** ("3 stamps/city" → "4", verified against `CITY_STAMPS`).
- **#18 test apparatus / one-concept-two-helpers** — **RESOLVED** (`markCountingCtx` rename; genuinely distinct data shape).
- **#26 assertion terms all local** — **RESOLVED** (`NC`/`NB` now import `NCITY`/`NMISBA`). Note: `STAMP_SYMBOLS` holds identifier *names* scanned for in source text, not data values duplicating a constant — not a #26 case (rule-checker agrees).
- **ADDITIONAL — core/shell boundary** — [VERIFIED] diff is test-only; `purity.test.ts` + group-F guard green; no `src/core` touched.

### Observations (≥5)
1. [VERIFIED] The decisive round-1 defect is fixed and *proven* fixed — evidence: my own mutation battery (`:587`/`:1067` strip from stamps.ts-only → matching test RED; restore → green; tree `git status` clean after each). Not argued from the diff.
2. [VERIFIED] Wiring guard is fail-closed — evidence: baking symbols into render.ts reddens; the resolver requires a single named-`{…}` `./…js` import containing both symbols, and correctly ignores the `../core/*` imports (regex requires `\./`, parent paths use `../`).
3. [VERIFIED] Production untouched — evidence: `git diff 7d8ca97f...HEAD -- plugins/missile-command/src/` empty; round-1 geometry verification carries forward.
4. [LOW] `stampModule()` is forward-brittle, not currently defective: an `import * as stamps` or split-across-two-statements refactor would make the wiring guard **false-RED** (wrongly fail), never false-GREEN — it errs toward rejecting, and arguably pins the intended named-import style. Rule-checker flagged the same as informational. Not a blocker; noted as a Delivery Finding for a future refactor.
5. [VERIFIED] `stampModuleText()`'s embedded `expect(file).not.toBe('')` is not a hidden-pass anti-pattern — evidence: under MUT-D vitest attributes the failure to each calling `it()` with the message "render.ts imports no shell module exporting CITY_STAMPS + MISSILE_STACK"; fail-fast, clear, per-callsite.
6. [VERIFIED] Behavioural delta tests (groups C/D/E) and the boundary guard (F) are unchanged and still green — the feature's real proof was never the loose guards; tightening them adds honest provenance enforcement on top.

### Dispatch-tag coverage
- `[RULE]` — rule-checker: **clean**, 26 rules / 31 instances / 0 violations; independently mutation-tested the citation + wiring guards and confirmed all 5 findings resolved, no new violations.
- `[DOC]` — comment-analyzer: **clean**; confirmed the "4 stamps/city" fix, the `stampModule`/`markCountingCtx` comments' factual accuracy against `stamps.ts` and the sibling test files.
- `[SEC]` — security: **clean**; no ReDoS shape in the import regex (simple negated classes, static input), no path-traversal (all fs paths are repo-relative constants from `import.meta.url`).
- `[TEST]` — test-analyzer **disabled**; per the reviewer gotchas I ran the mutation battery **myself** on every enforcement guard (citations, export cross-check, wiring) — all redden on the real regression and restore clean. This is the coverage, not a claimed row.
- `[EDGE]` — edge-hunter **disabled**; I checked the new resolver's edges: no matching import → `''` → fail-closed RED with a clear message; aliased/`import *` → false-RED (safe direction); multiple `./` imports → first containing both symbols wins (only `./stamps.js` qualifies today).
- `[SILENT]` — silent-failure-hunter **disabled**; the test swallows nothing — no try/catch, no fallback; the one guard clause throws loudly via `expect`.
- `[TYPE]` — type-design **disabled**; I checked: `as const` tuple, `readonly` return, `unknown`-not-`any` mock, no stringly-typed production API introduced. Sound.
- `[SIMPLE]` — simplifier **disabled**; the rework net-simplifies (removes the whole-dir `renderSourceText()` scan); the added resolver is ~12 lines and load-bearing. No dead code.

### Devil's Advocate
Argue the reworked tests are still broken. First attack: the new citation guard could *itself* be vacuous — if `stampModule()` silently returned `''` on the real tree, `stampModuleText()` would throw and the citation tests would error, not falsely pass. But I ran the mutation both ways: on the real tree all 9 tests pass (so `stampModule()` resolves `stamps.ts`), and on the mutated tree the exact target test reddens — a guard that passes on truth and fails on the lie is doing its job. Second: maybe the wiring guard only *looks* stricter. Could a dev satisfy it without really wiring the module? To pass, render.ts must import both `CITY_STAMPS` and `MISSILE_STACK` by name from a non-preexisting `./…js` module that actually `export`s them — I mutation-checked that baking them inline, or dropping the `export`, both redden; the cheapest green is to actually wire the module. Third, the strongest: the resolver regex is brittle — `import * as stamps` breaks it. True, and I confirmed it — but the failure direction is a *false RED* (the suite wrongly fails), which stops the line and gets noticed, never a false GREEN that lets a regression through. For a fidelity guard, failing safe is the correct bias; I filed it as a non-blocking Delivery Finding rather than a defect. Fourth: does scoping citations to the imported module *lose* coverage that the whole-shell scan had? No — render.ts keeps its own citations independently, and the AC wants the stamp module to carry provenance; the narrower scope is strictly more faithful to the AC, not less. Fifth: the rename could have missed a call site — but the suite is green (both def and the one call updated) and tsc is clean. Sixth: is approving my own session's rework a rubber-stamp? That risk is real, which is exactly why I dispatched an independent rule-checker (clean, 0/26) and re-ran the mutation battery from scratch rather than trusting the Dev Assessment's claims. None of these attacks lands. The tests are now honest and the product was already correct.

**Handoff:** To SM for finish-story. Production code (`render.ts`, `stamps.ts`) is byte-identical to the version approved-on-substance in round 1; the tests now enforce the ROM provenance their names promise.