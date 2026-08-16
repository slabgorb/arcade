---
story_id: "ml11-2"
jira_key: "ml11-2"
epic: "ml11"
workflow: "tdd"
---
# Story ml11-2: Attract enemy-showcase: draw the per-creature BLACK cell panels behind the sprites (attract-mame-reference.png shows solid black panels; renderShowcase currently blits sprites straight onto the blue background).

## Story Details
- **ID:** ml11-2
- **Jira Key:** ml11-2
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml11-2-attract-showcase-black-cell-panels
- **PR:** 488 (merged into develop via merge commit d983792f)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T23:02:08Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T22:13:54+00:00 | 2026-08-16T22:16:46Z | 2m 52s |
| red | 2026-08-16T22:16:46Z | 2026-08-16T22:28:40Z | 11m 54s |
| green | 2026-08-16T22:28:40Z | 2026-08-16T22:34:45Z | 6m 5s |
| review | 2026-08-16T22:34:45Z | 2026-08-16T22:46:30Z | 11m 45s |
| red | 2026-08-16T22:46:30Z | 2026-08-16T22:50:24Z | 3m 54s |
| green | 2026-08-16T22:50:24Z | 2026-08-16T22:51:33Z | 1m 9s |
| review | 2026-08-16T22:51:33Z | 2026-08-16T23:02:08Z | 10m 35s |
| finish | 2026-08-16T23:02:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (blocking): The AC1 panel guard uses `overlaps()` (intersection), so a 1×1px black fill at the sprite corner passes as a "panel behind the cell" — mutation-proven by test-analyzer (14/14 green with a 1px panel). Affects `plugins/millipede/tests/attract-showcase-panels.test.ts` (require the panel to CONTAIN the sprite footprint, not merely intersect; the 1px mutant must then redden). *Found by Reviewer during code review.*
- **Gap** (non-blocking): Three stale line-citations in test docstrings after Dev's 13-line insertion (lang-review #17). Affects `plugins/millipede/tests/attract-showcase-panels.test.ts` (`cellXY` cites `main.ts:209` → now :218-219; footprint note cites `208-210` → now :217-222; `parseRgb` cites `223,230` → the panel `#000` is now :220, defaults at :236,243 — re-anchor or drop brittle line numbers). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, ROUND 2, PRE-EXISTING — not a round-2 regression): AC1 asserts per-cell `contains()` but not panel DISTINCTNESS, and `isFullScreen` only excludes a whole-canvas fill, so a hypothetical single near-full-canvas black rect (e.g. `x=1,y=1,w=238,h=254`) could satisfy all eight cells at once. The shipped code draws eight distinct 36×26 panels (visually confirmed at `/millipede/`), so this is not a live defect — a test-hardening opportunity, not a blocker. Affects `plugins/millipede/tests/attract-showcase-panels.test.ts` (assert the eight panels are distinct rects, or bound each panel's max size). Approved without blocking; combine with the full-fidelity showcase-cell follow-up (Dev/TEA findings). *Found by Reviewer during code review (round 2, test-analyzer).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Panels are snug per-sprite boxes, not the reference's larger full-cell boxes**
  - Spec source: context-story-ml11-2.md, AC1
  - Spec text: "matching the black panels in attract-mame-reference.png; the panel geometry (which cells, size) is pinned to the reference or an explicit owner call, not eyeballed silently"
  - Implementation: each panel is DERIVED from the sprite cell by a documented rule — the 16px sprite footprint padded 10px each side, spanning from 8px above the sprite down to its name-label row (`main.ts` renderShowcase). Snug boxes around each single representative sprite.
  - Rationale: the ml9-1/ml9-3 showcase renders ONE representative sprite per creature, NOT the ROM's full mushroom-field mini-scene, and the creatures + centered HIGH SCORES column are laid out to coexist — reference-sized cells (which span ~14 cols) would collide with the HIGH SCORES text. A documented derived formula satisfies "explicit rule, not eyeballed." Visually confirmed at `/millipede/` (AC3): the eight creatures sit on black panels, no strobe, the ml9-3 white scores + red labels + footer intact.
  - Severity: minor
  - Forward impact: minor — a follow-up wanting full-fidelity ROM cells would enlarge the panels AND add each cell's mushroom-field content plus a re-layout; that is a larger change than this pure render addition, and would also cover GROWTH/DDT BOMB (no MOBJ sprite today — see the TEA Delivery Finding).

### Reviewer (audit)
- **Dev deviation (snug per-sprite panels, not reference full-cell boxes)** → ✓ ACCEPTED by Reviewer: sound. The comment-analyzer independently confirmed the panel bottom edge lands exactly on `labelY = spriteY+18` (via `render.ts` label placement + `CAST` sharing the row), and the visual playtest confirmed the picture. Reference-sized cells would collide with the centered HIGH SCORES column given the ml9 one-sprite-per-creature layout; the derived formula satisfies "explicit rule, not eyeballed." The full-fidelity follow-up is already captured as a Delivery Finding.
- No UNDOCUMENTED deviations found — the diff matches the logged scope (a black `#000` panel per showcase creature, drawn before the sprite blit).

## SM Assessment (Baldur, setup)

**Story shape:** 2pt, tdd, single-file surface (`plugins/millipede/src/main.ts` `renderShowcase`). Deferred from ml9-3; the black-boxes decision is ALREADY PINNED in ml9-3's Design Deviations — this is **implement-only, no re-decision**. Not an either/or AC.

**GROUND TRUTH re-verified (confirmed accurate, no corrections).** The description's dated ground-truth block was measured against the tree at develop=734ecf3f, not trusted: `renderShowcase` (`main.ts:195`) fills the canvas with `SHOWCASE_BACKGROUND` (blue, :196-198), draws the text stamps (white high-scores + red labels, ml9-3, :203-205), then blits each sprite via `drawSpritePx` (:208-210) with **no black rect behind any cell**. The defect is real and current; the fix is a per-creature black rect drawn inside the `showcaseSprites()` loop before `drawSpritePx`.

**Sibling probes clean:** no `ml11-2` branch or session anywhere (only the finished ml11-1 branches). Story unclaimed. Claim now pushed empty+context on `feat/ml11-2-attract-showcase-black-cell-panels` so siblings see it.

**Dev port:** 5270 is held by THIS checkout (a-1) — `just serve` for the AC3 visual playtest is safe here; no sibling contention.

**sm-setup residue I repaired:** it omitted the `**Repos:**` field (added `arcade` + `**Branch:**`), left status at `backlog` (stamped `in_progress`), left the branch local-only (pushed), and left the context Scope as filler (`In scope: the behavior described by the story title`) — rewritten with measured in/out scope; do-not-regenerate line added. Technical Approach and ACs came back genuinely measured.

**For TEA:** RED targets `renderShowcase`. It renders to a canvas — the RED test will need a canvas surface/mock able to observe a black fillRect landing behind each cell before the sprite blit. Panel geometry is pinned to `sprint/planning/ml9-playthrough-refs/attract-mame-reference.png`; if the reference is ambiguous on exact cell extents, raise it as a Delivery Finding rather than eyeballing. Must not regress ml9-3 text stamps or the self-playing attract demo (existing showcase/attract tests stay green).

## TEA Assessment (Tyr One-Handed, red)

**RED test:** `plugins/millipede/tests/attract-showcase-panels.test.ts` — 14 tests, **9 failing** (the RED), 5 passing (preconditions + regression guards). Committed `d7090df9`. Full millipede suite: `9 failed | 1430 passed` — no collateral. `npm run lint` clean.

**Approach — BEHAVIOURAL, not a source grep (lang-review #15/#25).** `main.ts` already calls `fillRect` (the blue background) and sets `fillStyle`, so a grep for `fillRect`/`#000` is satisfied by pre-existing code and cannot tell a per-cell panel from the full-screen fill, nor prove Z-order. The tests **boot the real shell** (`helpers/boot-shell.ts`), drive attract into the showcase sub-window (`frame % 720 >= 420`), and read the ACTUAL draws the renderer emitted onto the **logical** backbuffer (`draws('logical')` — the display's own `#000` full-screen fill is on the *display* surface and never pollutes). Colours and ordering asserted are what landed, never re-derived through the implementation.

**Seam mechanics Dev/Reviewer should know:**
- `main.ts` is a **singleton module** with module-scope side effects → `bootMillipedeShell()` works ONCE per test file (a 2nd boot gets the cached module + dead rAF loop, "no frame scheduled"). The file boots once in `beforeAll` and captures the two consecutive showcase frames every group needs.
- Each `shell.frame(ts)` folds ≤5 fixed 60 Hz steps (`frame-clock` `MAX_CATCHUP_STEPS`); the first frame sets no delta (lastTs null), so `driveToShowcase` primes once before reading `sim()`. Deterministic (seed `0x1982`, no `Math.random`) → not flaky.
- Sprites blit at `y ≡ 6 (mod 8)` (the `-18` offset); text stamps at `y ≡ 0 (mod 8)` — that parity cleanly separates the two in the regression guard.

**What GREEN (Dev) must ship — single-file, `main.ts` `renderShowcase` (:195-211):** inside the `for (const s of showcaseSprites())` loop, **before** `drawSpritePx`, draw a solid black rect covering that cell. The tests require, per creature: a fill whose `fillStyle` parses to black (`rgb(0,0,0)` / `#000` / `#000000` / `black` all accepted), **not** full-screen (not the `(0,0,240,256)` background), **overlapping** the sprite footprint (16×8 at `s.col*8, (0x1f-s.row)*8-18`), at an **earlier draw index** than the sprite blit. Panels must be **static** across frames (AC3, no strobe). The blue background and the ml9-3 text stamps must stay (green regression guards). Exact panel SIZE/placement to match the reference is the **VISUAL PLAYTEST at `/millipede/`** (AC3) — the unit only pins black + behind + overlap, leaving extents to Dev's eye against `attract-mame-reference.png`. Port 5270 is owned by THIS checkout (a-1), so `just serve` is safe.

**Rule coverage (lang-review):** #15/#25 behavioural not source-grep; #18/#26 no fixture-echoes — the "black" is read from the real renderer's `fillStyle`, footprints derive from the real `showcaseSprites()`; #19 population floor (`showcaseSprites().length === 8`) so the per-cell loop can't silently shrink; #14 Z-order asserted (panel before sprite) so a panel drawn AFTER the sprite reddens. No `as any`, no vacuous assertions, no `let _ =`.

## Delivery Findings (TEA)

- **[Question, non-blocking]** GROWTH and DDT BOMB are filtered OUT of `showcaseSprites()` (no MOBJ pic — they're field/mushroom graphics), so the sprite-loop panel approach gives them no black panel. If `attract-mame-reference.png` shows black panels behind those two labels as well, that is a separate cell (not on the sprite loop) and is **out of this story's scope** as written (AC1 says "behind each creature cell/**sprite**"). Dev/Reviewer: confirm at the visual playtest whether the reference wants panels there too; if so, file a follow-up rather than widening this loop.
- **[Question, non-blocking]** The reference may show each panel covering the whole cell (sprite **and** its name label), which is wider/taller than the 16×8 sprite footprint. The unit deliberately asserts only overlap+black+before-sprite, so a cell-sized panel and a sprite-sized panel both pass — the exact extent is settled by eye at `/millipede/` (AC3), not by the unit.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/main.ts` — `renderShowcase`: inside the `showcaseSprites()` loop, draw a solid `#000` panel (geometry derived from the sprite cell) BEFORE `drawSpritePx`. ~9 lines.

**Tests:** 14/14 ml11-2 passing (GREEN). Full millipede project 1439/1439. `npm run lint` clean.

**Minimalism:** one loop-body addition, no new module/helper/abstraction. Geometry is a documented derived formula (not eyeballed), no re-decision of black-vs-blue (PINNED in ml9-3).

**AC3 visual playtest — DONE (not just unit-green).** Served `/millipede/` from this checkout (5270 owned by a-1), waited into the showcase window, screenshotted: the eight MOBJ creatures (DRAGONFLY, MOSQUITO, BEE, EARWIG, BEETLE, INCHWORM, MILLIPEDE, SPIDER) each sit on a solid black panel instead of the blue background; the white HIGH SCORES + red labels + footer (ml9-3) render intact; panels steady (no strobe). GROWTH and DDT BOMB have no panel (no MOBJ sprite — TEA finding #1, out of scope).

**Deviation logged:** panels are snug per-sprite boxes, not the reference's larger full-cell boxes — see `## Design Deviations → Dev`. Minor; driven by the ml9 one-sprite-per-creature simplification and the HIGH SCORES column layout.

**Branch:** feat/ml11-2-attract-showcase-black-cell-panels (pushed, `5273ee04`)

**Handoff:** To review (Heimdall).

## Delivery Findings (Dev)

- **Improvement** (non-blocking): Full ROM-cell fidelity for the showcase (larger black cells each holding a mushroom-field mini-scene, plus panels behind GROWTH/DDT BOMB) is a natural follow-up — it needs panel enlargement + per-cell field content + a re-layout so cells don't collide with the centered HIGH SCORES column. Bigger than this render addition; worth a filed story if the owner wants the exact reference cells. Combine with TEA finding #1 (GROWTH/DDT BOMB panels).

## Round 1 — Subagent Results (superseded by Round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 1439/1439 GREEN, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (negative panel coords for col0/top-row creatures are valid canvas clips, no crash) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (no error paths; fillRect/fillStyle do not throw) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (high) | confirmed 1 — overlaps-not-contains, mutation-proven 1px panel passes |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — independently verified every geometry claim in the new comment |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (no `as any`/casts; `s.pic`/`s.color` are `Required` on ShowcaseSprite) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (pure render, no user input / injection surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (one loop-body addition, 2 local consts, no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 1 rule (#17, 3 instances) | confirmed 1 — stale line-citations in test docstrings |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled; 2 with findings)
**Total findings:** 2 confirmed (1 high [TEST], 1 low [RULE]), 0 dismissed, 0 deferred

**Reviewer's own mutation battery (covering the 5 disabled specialists):** 5 mutants over `renderShowcase`, all CAUGHT — M1 remove-panel (9 red), M2 panel-after-sprite/Z-order (8 red), M3 non-black-fill (9 red), M4 full-screen-fill (9 red), M5 only-first-creature (8 red). Tree restored and re-verified clean. The battery did NOT probe the panel-SIZE dimension — which is exactly the gap test-analyzer's live 1px mutation exposed. That complementarity is why the finding stands.

## Rule Compliance (TS lang-review, 30 checks + core/shell boundary)

Enumerated by the rule-checker and cross-checked by me against the diff:
- **#1 type-safety:** compliant — 2 `r is DrawFill` predicates both validate `r.kind === 'fillRect'` at runtime; no `as any`/`@ts-ignore`/`!` in the diff.
- **#2 generics/readonly:** compliant — `readonly DrawRecord[]` on the array params/returns.
- **#4/#21 null/degenerate numeric:** compliant/N-A — `PANEL_PAD_X/TOP` are literals; `s.col/s.row` from `CAST` literals; no external measured input, no `??` defaulting.
- **#14 derived edge in one branch:** compliant — the panel fill runs unconditionally for every `showcaseSprites()` member in one loop; no transition logic.
- **#15/#25 source-text guards:** compliant — the test is fully behavioural (boots the real shell), not a source grep.
- **#17 comments/citations:** **VIOLATION (3 stale line-cites)** — see Reviewer findings; non-blocking, routed to TEA.
- **#18 test apparatus fails-by-passing:** **VIOLATION (1)** — the `overlaps` predicate accepts a 1px fill; the AC1 guard is vacuous along size. Blocking, routed to TEA.
- **#19 population filter:** compliant — 8-element floor pinned `toBe(8)`, mirrors the production loop's filter.
- **#20 same-diff quantity:** compliant — the comment's 16px/18px are literal restatements of the diff's own constants.
- **#26 all-test-local terms:** compliant — assertions compare REAL booted-shell values against literals.
- **#29 ordering-for-magnitude:** compliant — AC3 no-strobe uses exact `toEqual` identity.
- **core/shell purity (CLAUDE.md):** compliant — the change is entirely in `main.ts` (shell) + tests; only calls the unchanged `showcaseSprites()` core export; `src/core/` untouched, `purity.test.ts` unaffected.

## Devil's Advocate

Assume this code is broken. Where does it fail? The panel geometry is unvalidated arithmetic over `CAST` positions, and three of the eight creatures live at `col 0` while two live at `row 29` — so `spriteX - PANEL_PAD_X = -10` and `spriteY - PANEL_PAD_TOP = -10` for DRAGONFLY. A malicious or careless future edit to `CAST` (say, a creature at a col near 30 or a row near 0) would push a panel far off-screen or, worse, over the centered HIGH SCORES text, silently blacking out scores — and NOTHING in the suite would catch it, because the tests locate panels *relative to* the sprite cell and never assert a panel stays clear of the text region. That is the real fragility: the tests co-move with the data. The most damning line of attack, though, is the one test-analyzer already landed: the guard says "panel behind the cell" but accepts a 1-pixel speck, so a confused Dev who "optimizes" the fill to a hairline, or an autoformatter that mangles the width expression to something tiny, ships green while the attract screen visibly regresses to creatures floating on blue — the exact defect this story exists to kill. A stressed renderer offers another angle: `fillRect` with negative or fractional coordinates is defined behavior on a real 2D context (it clips), but the boot-shell stub records raw numbers, so the test's notion of "overlap" trusts geometry the browser might clip differently at the canvas edge — the unit cannot see a panel that the real canvas trims to nothing at `x=-10`. A confused USER angle: the panels are `#000` pure black, but the display canvas is *also* cleared to `#000` and letterboxed — if the logical→display blit math ever regressed, black panels on a black letterbox would be invisible and the tests, which read the LOGICAL surface, would still pass. None of these are shipped bugs today (the visual playtest confirmed the current picture), but they show the suite's blind spots cluster around size and absolute position — precisely the dimension the blocking finding names. That convergence raises, not lowers, my confidence that the containment fix is the right gate to demand before this ships.

## Round 1 — Reviewer Verdict: REJECTED (superseded by Round 2 below; both findings fixed & mutation-confirmed)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[TEST]` | AC1 panel guard uses `overlaps()` (intersection), so a 1×1px black fill passes as a "panel behind the cell" — mutation-proven (14/14 green with a 1px panel). The story's central automated proof is vacuous along the size dimension. | `plugins/millipede/tests/attract-showcase-panels.test.ts:95,194` | Require the qualifying panel to CONTAIN the sprite footprint: `r.x <= x && r.y <= y && r.x + r.w >= x + SPRITE_W && r.y + r.h >= y + SPRITE_H` (add alongside or replace the `overlaps` call). Verify the 1px mutant now reddens. |
| [LOW] `[RULE]` | Three stale line-citations in test docstrings after Dev's 13-line insertion (lang-review #17): `cellXY`→`main.ts:209`, footprint→`208-210`, `parseRgb`→`223,230`. | `plugins/millipede/tests/attract-showcase-panels.test.ts:52,56,63` | Re-anchor to current lines (blit `:218-219`, loop `:217-222`, panel `#000` `:220`, defaults `:236,243`) or drop brittle line numbers for symbol-based references. Fix in the same rework. |

**Dispatch tags:** `[TEST]` overlaps-not-contains (CONFIRMED, blocking) · `[RULE]` stale citations (CONFIRMED, non-blocking) · `[DOC]` comment-analyzer CLEAN (all geometry claims verified) · `[EDGE]` (disabled) Reviewer-covered: negative panel coords are valid canvas clips · `[SILENT]` (disabled) Reviewer-covered: no error paths · `[TYPE]` (disabled) Reviewer-covered: no casts, `Required` fields · `[SEC]` (disabled) Reviewer-covered: pure render, no input · `[SIMPLE]` (disabled) Reviewer-covered: minimal, no over-engineering.

**Data flow traced:** `showcaseSprites()` (core, pure, 8 items) → per-creature `spriteX/spriteY` render geometry → black `fillRect` panel → `drawSpritePx`. No user input, no external data, deterministic. The SHIPPED behavior is correct and visually confirmed at `/millipede/`; the rejection is about the TEST guard, not the render.

**Pattern observed:** behavioural testing via `boot-shell.ts` reading `draws('logical')` — a strong pattern (mutation-caught Z-order, colour, full-screen, presence). Its one blind spot is panel SIZE, which the fix closes.

**Error handling:** N/A — pure render; `driveToShowcase` throws loudly with a bounded guard if the showcase window is never reached (`test:107`).

**Handoff:** Back to TEA (RED rework) — both findings are test-file changes.

## TEA Assessment (Tyr One-Handed, red — rework round 1)

Both reviewer findings addressed in `plugins/millipede/tests/attract-showcase-panels.test.ts` (test-only; `main.ts` untouched). Committed `c574fa21`, pushed. 14/14 ml11-2 green; full millipede 1439/1439; lint clean.

- **[HIGH][TEST] overlaps→contains (FIXED, mutation-proven).** Replaced the `overlaps` (intersection) helper with `contains` — a qualifying panel must now COVER the whole 16×8 sprite footprint (`f.x <= x0 && f.y <= y0 && f.x+f.w >= x0+w0 && f.y+f.h >= y0+h0`). Re-ran the mutation battery with the reviewer's exact 1px mutant added: **M6 shrink-to-1px is now CAUGHT (8 red)** where it survived before; the real 36×26 panel still contains the footprint so AC1 stays green; all of M1-M5 still caught. The AC1-loop comment was updated from "overlaps" to "fully COVERS … containment not intersection" to match.
- **[LOW][RULE #17] stale citations (FIXED).** Re-anchored the three docstrings to SYMBOL/behaviour references instead of brittle line numbers, so a future line-shift cannot stale them again: `cellXY` and the footprint note now cite `renderShowcase`'s `showcaseSprites()` loop / `drawSpritePx` by name; `parseRgb` cites "the ml11-2 per-cell panel fill and the entry/default black fills in render()" rather than `main.ts:223,230`.

**Handoff:** To review (Heimdall) — round 2.

## Dev Assessment (Loki — green, rework round 1)

**Implementation Complete:** Yes — NO code change this round. The round-1 `main.ts` panel (36×26, `spriteX-10, spriteY-8`) already CONTAINS the 16×8 sprite footprint, so TEA's strengthened `contains()` guard passes on the shipped implementation unchanged. `git diff HEAD -- main.ts` is empty.

**Tests:** 14/14 ml11-2 green; full millipede 1439/1439; lint clean.
**Files Changed:** none (the test-guard fix was TEA's commit `c574fa21`).
**Branch:** feat/ml11-2-attract-showcase-black-cell-panels (pushed).
**Handoff:** To review (Heimdall) — round 2.

## Subagent Results

Round 2 re-review — same 4 enabled specialists re-spawned on the round-2 (test-only) diff to confirm both round-1 findings are closed and nothing new was introduced.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1439/1439 GREEN, lint clean, 0 smells; `main.ts` byte-identical to r1) | N/A — its "transient flake" was the shared-tree race with test-analyzer's live 1px mutation, not real contention (clean rerun confirmed by me) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer-covered |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer-covered |
| 4 | reviewer-test-analyzer | Yes | clean | round-1 [TEST] CONFIRMED CLOSED (re-mutated 1px → 8 AC1 red, real panel green, restored) | confirmed closed; 1 pre-existing dormant note (distinctness) routed non-blocking |
| 5 | reviewer-comment-analyzer | Yes | clean | round-1 [RULE #17] citations CONFIRMED fixed & verified true | confirmed closed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer-covered |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — Reviewer-covered |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer-covered (`overlaps` fully retired, no dead code) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 checks; #17 CLOSED; `overlaps` retired; corner-clip mutant caught | confirmed closed |

**All received:** Yes (4 enabled returned clean, 5 disabled pre-filled)
**Total findings:** 0 new; both round-1 blocking/non-blocking findings CONFIRMED CLOSED (mutation-verified by two independent specialists); 1 pre-existing dormant observation routed non-blocking.

**Reviewer's own tree re-verification (post-mutation):** two specialists mutated `main.ts` concurrently; I confirmed `git diff HEAD -- main.ts` and the test file are both empty (restored), no `.bak`, no `ml11-2` stash, and a CLEAN full suite with no concurrent mutators is 90/90 files, 1439/1439 tests GREEN.

## Devil's Advocate (Round 2)

Assume the fix is theatre. Could `contains()` be weaker than it looks? Trace every term: it reads `f.x/f.y/f.w/f.h` from a REAL recorded `DrawFill` off the booted shell and compares against `x0=spriteX, y0=spriteY, w0=16, h0=8` — the sprite footprint derived from the real `showcaseSprites()`. No test-local echo, no shared derivation with the implementation's own panel formula. Two independent specialists re-ran the exact defect (1px and 2×2 corner-clip) and both reddened all 8 AC1 cases while AC2/AC3 stayed green — the guard kills the mutant it was written to kill. The strongest remaining attack is the distinctness gap test-analyzer named: `contains()` is per-cell but nothing forbids ONE near-full-canvas black rect (`x=1,y=1,w=238,h=254`) from satisfying all eight cells at once while blacking out the whole screen. That would be a genuine regression the suite could miss — but it is pre-existing (the `isFullScreen` bound predates round 2 and is unchanged by this diff), it is not something a sane implementation produces, the shipped code draws eight distinct 36×26 panels confirmed by eye at `/millipede/`, and forcing it now would be gold-plating a passing guard on a 2-point story. It is the right kind of thing to FILE, not to block on. Everything the round rejected for is now closed and independently mutation-verified; nothing new was introduced (rule-checker: 0/30 violations); the tree is clean and green. There is no honest basis left to withhold approval.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1's two findings are both CLOSED and independently mutation-confirmed in round 2:
- `[TEST]` (was HIGH, blocking) — the AC1 guard now uses `contains()` (full coverage); test-analyzer AND rule-checker each re-applied the panel-shrink mutant and saw the 8 AC1 tests redden, real panel green, tree restored. Gap closed.
- `[RULE]` (was LOW) — the three stale citations are re-anchored to symbol references and were verified TRUE against current source by both comment-analyzer and rule-checker.

**Dispatch tags:** `[TEST]` round-1 finding confirmed closed (mutation-verified) · `[RULE]` round-1 citations confirmed fixed & true · `[DOC]` comment-analyzer CLEAN (AC1 comment now says "COVERS/containment") · `[EDGE]` (disabled) Reviewer-covered: negative panel coords are valid canvas clips · `[SILENT]` (disabled) Reviewer-covered: no error paths · `[TYPE]` (disabled) Reviewer-covered: no casts, `Required` fields · `[SEC]` (disabled) Reviewer-covered: pure render, no input · `[SIMPLE]` (disabled) Reviewer-covered: `overlaps` fully retired, no dead code.

**Data flow traced:** unchanged from round 1 — `showcaseSprites()` (pure core, 8) → per-cell render geometry → black `fillRect` panel → `drawSpritePx`. No user input; deterministic. Shipped render is correct and visually confirmed at `/millipede/`.

**Pattern observed:** behavioural testing via `boot-shell.ts` reading `draws('logical')`, now hardened along the size dimension by `contains()`. `plugins/millipede/tests/attract-showcase-panels.test.ts:95`.

**Error handling:** N/A — pure render; `driveToShowcase` throws loudly with a bounded guard if the showcase window is never reached.

**Handoff:** To SM (Baldur) for finish-story.

## Impact Summary (SM finish, compiled from Delivery Findings — FINAL state)

**Blocking findings: 0. Ready to finish.** Tests 1439/1439; lint clean; rule-checker 0/30 violations.

- **Round 1 [HIGH][TEST] panel guard (overlaps→intersection):** CLOSED & mutation-verified in round 2. Fixed in `c574fa21` (`overlaps`→`contains`, full 16×8 coverage). test-analyzer AND rule-checker each re-applied the panel-shrink mutant → 8 AC1 tests redden, real 36×26 panel green, tree restored.
- **Round 1 [LOW][RULE #17] stale docstring citations:** CLOSED & verified. Re-anchored to symbol references (`renderShowcase`/`showcaseSprites()` loop/`drawSpritePx`/panel fill); comment-analyzer + rule-checker confirmed each now matches source.
- **Round 2 [IMPROVEMENT] panel distinctness (non-blocking, PRE-EXISTING):** AC1 asserts per-cell containment but not distinctness; a hypothetical single near-full-canvas rect could satisfy all cells. Shipped code draws 8 distinct 36×26 panels (visually confirmed). Not a live defect — FILED as a delivery finding, routed to the full-fidelity showcase-cell follow-up.

Shipped behaviour: `renderShowcase` draws a solid black panel behind each of the 8 showcase creatures before its sprite blit — creatures on black cells, not floating on blue (attract-mame-reference.png). Static fill (no strobe, ml7-4). ml9-3 text stamps and the self-playing attract demo unregressed. AC3 visually confirmed at `/millipede/`.