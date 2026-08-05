---
story_id: "bz5-2"
jira_key: "bz5-2"
epic: "bz5"
workflow: "tdd"
---
# Story bz5-2: Skeuomorphic periscope overlay framing the viewport + MAME color-geometry reconcile

## Story Details
- **ID:** bz5-2
- **Jira Key:** bz5-2
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** none (trunk-based — work on main)
- **PR:** none (trunk-based — direct to main)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T19:48:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T19:24:22+00:00 | 2026-08-05T19:26:36Z | 2m 14s |
| red | 2026-08-05T19:26:36Z | 2026-08-05T19:33:01Z | 6m 25s |
| green | 2026-08-05T19:33:01Z | 2026-08-05T19:39:05Z | 6m 4s |
| review | 2026-08-05T19:39:05Z | 2026-08-05T19:48:35Z | 9m 30s |
| finish | 2026-08-05T19:48:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Story:** bz5-2 — periscope bezel overlay (part A, design) + MAME color-geometry reconcile (part B, fidelity). 3pt, tdd/phased, repos `arcade`, battlezone game at `plugins/battlezone/`.

**Contention probes (clean):** no `bz5-2` branch on origin at setup; the only live sibling sessions were jt9-17 (a-1) and sw8-30 (a-3). Claim staked immediately: stamp+context on `main` (rebased over a sibling push), empty branch `feat/bz5-2-periscope-overlay-mame-color` pushed so the sibling `branch -r | grep` probe lights up.

**Premise measured before setup — two cited references are NOT in this checkout (folded into Background, not rendered as present-in-tree fact):**
- `HUD_RED` (`#ff3b30`, render.ts:72) and `GLOW_GREEN` (`#33ff66`, render.ts:64) both exist; `drawCrackedGlass` (render.ts:353) is the layering precedent — over world, under score/radar HUD.
- Findings doc `plugins/battlezone/docs/battlezone-1980-source-findings.md` exists (AC2's deviation record).
- `references/footage` (part-A eyeball reference) is absent locally — part A is judgment/reference-driven design, footage is not a checked-in asset.
- `layout/bzone.lay` (RED top..0.2 / GREEN 0.2..1.0 multiply) is NOT vendored — the 0.2 split is an external MAME constant TEA must cite from MAME source, not read from a local file.

**Setup verified on disk:** session carries Workflow/Repos/Branch/PR fields; exactly one phase pointer; status stamped `in_progress`; all three ACs reproduced verbatim (distinctive-phrase grep = 1 each).

**Scope note for TEA/Dev:** part A (bezel placement) is genuinely visual/subjective — AC1's testable core is "does not obscure the gunsight or a center-screen target." Part B is a hard boundary test on the 0.2 split. Overlay is shell-only — AC3 requires the core-purity sweep stays green (no `core/sim` change).

**Handing off to Leeloo (TEA) for the RED phase.**
## Tea Assessment

**RED delivered — `plugins/battlezone/tests/shell/periscope-overlay.test.ts`, commit `e4a5afe6`.** 6 failing / 1 green-on-arrival guard; full battlezone project 74/75 files green, so the only red is this new file (clean isolation, `npx vitest run --project battlezone`).

**Test strategy (idioms borrowed from `hud-palette.test.ts` + `windshield-crack-gate.test.ts`):**
- **AC1 — periscope bezel (design, part A).** Pixel-exact placement is playtest-verified (epic convention), so I pin only what's cheap and deterministic: (a) `drawPeriscope` is an exported render fn; (b) it keeps a **central aperture** — a recording ctx records `fillRect`/`clearRect` rects + their fill alpha, and no *opaque solid* fill may cover screen centre (`GUNSIGHT_NDC = [0,0]` → W/2,H/2) unless re-cleared. A transparent-centre vignette (gradient fillStyle → alpha 0) and a border-rects frame BOTH pass; a solid full-screen cover fails; (c) it must paint *something* (anti-no-op); (d) source-order guard in `main.ts`: `drawPeriscope(` after the world `drawSegments(`, before `drawRadar(`/`drawScore(` — "over world, under HUD", the `drawCrackedGlass` slot (main.ts:279).
- **AC2 — MAME colour split (fidelity, part B).** `MAME_COLOR_SPLIT === 0.2` (bzone.lay red top..0.2 / green 0.2..1.0, multiply) — the boundary is an external MAME constant, **not readable in this tree**, so it's pinned as an exported number. Plus `0 < split < 0.5` (red is a top band, not the majority) and HUD_RED red-dominant / GLOW_GREEN green-dominant so "red band / green field" is meaningful, not a bare number.
- **AC3 — shell-only (core purity).** Green-on-arrival guard: no `src/core/*.ts` references `drawPeriscope`/`MAME_COLOR_SPLIT`/`periscope`. Reddens if the feature leaks into core; `tests/core/core-purity-sweep.test.ts` also stays green so long as Dev only edits `src/shell`.

**Rule Coverage (TypeScript):** every test carries a meaningful assertion (no `let _ =`, no bare `assert(true)`); boundary values pinned (centre point, 0.2, the 0/0.5 band bounds); the anti-no-op test blocks a vacuous empty-overlay implementation; the shell-only guard enumerates real core files rather than asserting a constant.

**For Korben (Dev) — GREEN scope, minimal:**
1. Export `MAME_COLOR_SPLIT = 0.2` from `src/shell/render.ts` (alongside HUD_RED/GLOW_GREEN). **Per "MAME/ROM always wins"** the value is 0.2 unless there is a hard reason; ANY deviation must be recorded in `docs/battlezone-1980-source-findings.md` (AC2) *and* the test pin retuned.
2. Add `export function drawPeriscope(ctx, w, h)` in `src/shell/render.ts` — a static bezel mask (normalized 0..1 → *w,*h, like `drawCrackedGlass`) that frames the edges and **leaves the centre clear** (border rects, or a transparent-centre vignette). Reference-driven look; `references/footage` is NOT in this checkout, so lean on the cabinet-periscope description, not a checked-in asset.
3. Wire it into `main.ts` render path in the `drawCrackedGlass` slot (after the world, before `drawRadar`/`drawScore`).
4. Shell only — do not touch `src/core`.

**Design deviations:** none. **Delivery findings:** the story's two cited references (`references/footage`, `layout/bzone.lay`) are absent from this checkout — folded into Background by SM; part A is judgment-driven, the 0.2 split is the documented MAME constant.

**Handing off to Korben Dallas (Dev) for GREEN.**
## Dev Assessment

**GREEN — commit `7d26afca` on `feat/bz5-2-periscope-overlay-mame-color`.** All 7 periscope tests pass; full battlezone project **1056/1056**, orchestrator **392/0**, `npm run lint` (tsc) clean.

**What I built (minimal, shell-only — `core/` untouched, AC3):**
- `src/shell/render.ts`: `export const MAME_COLOR_SPLIT = 0.2` (bzone.lay red top..0.2 / green 0.2..1.0), with a doc comment pointing at the MAME layout provenance and the deviation record.
- `src/shell/render.ts`: `export function drawPeriscope(ctx, w, h)` — a dark opaque bezel (`rgba(6,10,8,0.92)`) as four border bands framing a **central aperture that is never filled**, plus a phosphor-green (`GLOW_GREEN`) rim on the aperture. Normalized thickness (`w*0.08`, `h*0.10`), static like `drawCrackedGlass`. Centre stays clear → gunsight/target visible (AC1).
- `src/main.ts`: imported + called `drawPeriscope(ctx, w, h)` in the `drawCrackedGlass` slot (line ~279) — after the world `drawSegments`, before `drawRadar`/`drawScore`/`drawGunsight` (over world, under HUD).
- `docs/battlezone-1980-source-findings.md` §11.1 + changelog row: MAME's `layout/bzone.lay` colour geometry, and our **deliberate deviation** — we honour the 0.2 split *location* (red HUD band top, green field below) but colour the HUD *elements* red (`HUD_RED`) rather than laying MAME's full-width red multiply gel, to keep the green vectors legible. Boundary fidelity exact; method deviates (AC2).

**Gotcha hit & resolved — citation line-shift blast radius.** Inserting the periscope wiring shifted `main.ts` lines, breaking finding **C-002**'s `ours` citation (`main.ts:325` verbatim `const loop = createLoop(...)`). Caught by `tests/audit/citations.test.ts` (green→2 red). Fixed with the sanctioned `tools/audit/reanchor-citations.mjs --write` (case-1 "line moved, text unchanged"): C-002 325→333, **0 lost, 114 already correct** — no other finding affected. Re-verified: citations audit 12/12 green. My own naive grep over-reported drift on untouched `core/` files; the reanchor tool is the authority — trust it, not a hand-rolled substring match.

**For Zorg (Reviewer) — worth a hard look:**
- AC1's pixel-exact bezel placement is **playtest-verified** per epic convention — the tests pin only the aperture (centre clear) + layer order, not aesthetics. **A visual playtest at `/battlezone/` is the honest confirmation** of the framing look; I did not run the dev server (port-5270 contention warnings in CLAUDE.md). Thickness/opacity are tunable.
- AC2 is a genuine method deviation from MAME (documented). Confirm the findings-doc note is the right call vs. an actual multiply-gel implementation — I judged gel would muddy vector legibility for no gameplay gain.

**Handing off to Jean-Baptiste Emanuel Zorg (Reviewer).**
## Reviewer Assessment

**Verdict: APPROVED** (approve-with-remediations — all applied in commit `99d31b47`). No Critical or High. Production code (`render.ts` MAME_COLOR_SPLIT + drawPeriscope, `main.ts` wiring) was clean against all 26 lang-review checks; every finding was in the new test file or the findings doc, and each is now fixed or adjudicated.

**Enabled-specialist summary (tags):**
- [SEC] reviewer-security — clean. No input surface (render overlay from game state only); test regexes linear (no ReDoS), run only on hardcoded constants. Zero findings.
- [RULE] reviewer-rule-checker — 4 findings, all in the test file. 2 CONFIRMED+FIXED (#5 stray require→ESM import; #25 unguarded indexOf layer markers). 2 DOWNGRADED (#1 as-unknown-as ×2 — the sanctioned recording-ctx idiom, verbatim from hud-palette.test.ts). Production code clean vs all 26 checks.
- [PRE] reviewer-preflight — GREEN: vitest 1056/1056, orchestrator 392/0, lint clean, reanchor 0-lost. Zero smells.

## Subagent Results
| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: vitest 1056/1056, orchestrator 392/0, lint clean, reanchor 0-lost |
| 2 | reviewer-security | Yes | clean | none | N/A — no input surface; test regexes linear (no ReDoS) |
| 3 | reviewer-rule-checker | Yes | findings | 4 | 2 CONFIRMED+FIXED (#5 require, #25 indexOf guard), 2 DOWNGRADED (#1 casts — sanctioned hud-palette idiom) |
| 4 | reviewer-edge-hunter | N/A | disabled | none | N/A — disabled via settings |
| 5 | reviewer-silent-failure-hunter | N/A | disabled | none | N/A — disabled via settings |
| 6 | reviewer-test-analyzer | N/A | disabled | none | N/A — disabled; test quality covered by Reviewer directly |
| 7 | reviewer-comment-analyzer | N/A | disabled | none | N/A — disabled; citations/comments verified by Reviewer directly |
| 8 | reviewer-type-design | N/A | disabled | none | N/A — disabled via settings |
| 9 | reviewer-simplifier | N/A | disabled | none | N/A — disabled; drawPeriscope ~20 lines, minimal, no dead code |

**All received: Yes** — all 3 enabled subagents returned (preflight, security, rule_checker); the other 6 are disabled via `workflow.reviewer_subagents` and their turf (test quality, comments/citations, simplification) was covered by the Reviewer directly.

### Findings adjudication
- CONFIRMED → FIXED — rule #5: stray `require('node:fs')` in an ESM test alongside the top-of-file ESM import → moved `readdirSync` into the import.
- CONFIRMED → FIXED — rule #25: layer-order `indexOf` markers compared without a `>-1` presence check; `firstWorld` going missing would make the "drawn after the world" guard vacuously pass → now asserts all four markers found first.
- CONFIRMED → FIXED (my own finding, comment_analyzer territory) — citation path: findings-doc changelog cited `src/mame/atari/layout/bzone.lay`; the `.lay` actually lives at `src/mame/layout/bzone.lay`. Corrected, geometry recorded inline, bzone.cpp path made explicit.
- DOWNGRADED (won't-fix, consistent) — rule #1 ×2: the two `as unknown as` casts building the recording-ctx Proxy are the **verbatim sanctioned idiom** in the sibling `tests/shell/hud-palette.test.ts:63,78`. Not dismissed on the rule — kept for cross-test consistency; rewriting one recording stub out of pattern would be a net loss.

### Independent Reviewer verification (the fidelity claim — comment_analyzer is disabled, so I did this by hand)
- MAME geometry VERIFIED against `~/Projects/mame/src/mame/layout/bzone.lay`: RED bounds top=0 bottom=0.2 rgb 1.0,0.125,0.125; GREEN top=0.2 bottom=1.0 rgb 0.125,1.0,0.125; blend "multiply". `MAME_COLOR_SPLIT = 0.2` is exact.
- `bzone.cpp:855` VERIFIED: the "blue overlay instead of the usual green" comment is the Desert Wars (`dsrtwars`) variant — correctly scoped OUT.
- AC1 aperture logic sound: drawPeriscope draws four border `fillRect`s + an aperture-edge `strokeRect`; screen centre (gunsight at GUNSIGHT_NDC [0,0]) is never filled. Layering verified in main.ts: drawSegments(world) < drawPeriscope < drawRadar/drawScore.
- AC2 deviation genuine and documented (§11.1): we honour the 0.2 split *location* via HUD-element colouring, not MAME's full-width multiply gel — a defensible legibility call for a vector render. `MAME_COLOR_SPLIT` is an exported test-anchor/documentation constant, not a render driver; consistent with the documented deviation.
- AC3: shell-only confirmed — core-purity sweep green, no `core/` reference to the new symbols.

### Rule Compliance
26/26 lang-review checks assessed. All production-code checks pass. Test-file violations (#1, #5, #25) resolved or adjudicated as above. No security (#10), no error-handling (#11), no derived-edge (#14) concerns — none apply to a static render overlay.

### Playtest note (carry to finish/owner)
AC1's pixel-exact bezel *look* is playtest-verified per epic convention; the tests pin the aperture + layer order, not aesthetics. A visual pass at `/battlezone/` is the honest confirmation of the framing; not run here (port-5270 contention warnings). Thickness/opacity are tunable without touching the pinned contract.

### Specialist tag summary
- [SEC] reviewer-security — clean. No input surface (render overlay from game state only); test-file regexes are linear (no ReDoS), exercised only on hardcoded constants. Zero findings.
- [RULE] reviewer-rule-checker — 4 findings, all in the test file. 2 CONFIRMED and FIXED (#5 stray require→ESM import; #25 unguarded indexOf layer markers). 2 DOWNGRADED (#1 as-unknown-as ×2 — the sanctioned recording-ctx idiom, verbatim from hud-palette.test.ts). Production code clean vs all 26 checks.
- [PRE] reviewer-preflight — GREEN across vitest 1056/1056, orchestrator 392/0, lint, and reanchor (0 lost). Zero smells.

**Handing back to Winston (SM) for the finish ceremony.**
## Impact Summary

**Story bz5-2** delivered a skeuomorphic periscope bezel overlay and MAME color-geometry reconciliation for Battlezone. Single review round, APPROVED (approve-with-remediations); all findings resolved inline before the verdict — blocking_count: 0.

**What shipped:**
- `MAME_COLOR_SPLIT = 0.2` in `src/shell/render.ts` — the MAME `bzone.lay` red-top/green-bottom split boundary (verified against `~/Projects/mame/src/mame/layout/bzone.lay`).
- `drawPeriscope(ctx, w, h)` in `src/shell/render.ts` — dark bezel (four border bands + phosphor-green rim) with a central aperture that is never filled, keeping the gunsight/centre target visible (AC1). Static, normalized, like `drawCrackedGlass`.
- `src/main.ts` wiring: in the `drawCrackedGlass` slot — after `drawSegments` (world), before `drawRadar`/`drawScore` (HUD). Layering verified (over world, under HUD).
- `docs/battlezone-1980-source-findings.md` §11.1: the deliberate AC2 deviation — the 0.2 split *location* is honoured via HUD-element colouring (`HUD_RED`) rather than MAME's full-width multiply gel, preserving green-vector legibility with no gameplay cost. Boundary fidelity exact.
- Citation re-anchor: finding C-002 `main.ts:325 → 333` (periscope wiring shift), 0 lost, 114 verified.

**Verification:** 7 periscope tests green; battlezone 1056/1056, orchestrator 392/0, lint (tsc) clean.

**Findings adjudication (all resolved):** RULE #5 (require→ESM) FIXED · RULE #25 (indexOf `>-1` guards) FIXED · citation path FIXED · RULE #1 (as-unknown-as ×2) DOWNGRADED (sanctioned hud-palette recording-ctx idiom). Security clean.

**Carry to RELEASE (not a finish gate):** AC1's pixel-exact bezel *look* is playtest-verified per epic convention — the tests pin the aperture + layer order, not aesthetics. A visual pass at `/battlezone/` should precede cutting a `battlezone-vX.Y.Z` release tag. Thickness/opacity are tunable without touching the pinned contract. Finish here lands the code on `main`; it does NOT deploy (deploy is tag-triggered).
