---
story_id: "sa1-1"
jira_key: "sa1-1"
epic: "sa1"
workflow: "tdd"
---
# Story sa1-1: Consistent display chrome — shared overlay framing the non-game screen area, all games route through it

## Story Details
- **ID:** sa1-1
- **Jira Key:** sa1-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sa1-1-consistent-display-chrome
- **PR:** (none yet — recorded when the PR is created)

## Sm Assessment

Fresh feature in the shared layer, not a game-specific fix. sa1-1 is the foundation
story of epic sa1: a single display component that frames every game with consistent
chrome marking the non-game parts of the screen, which all games render through.

Scope for TEA (RED): pin the shared component's contract, not any one game's render.
- Where it lives: `src/shared/` (imported `@shared/<module>` by lobby + every plugin).
  There is already a `view` module in shared — decide whether this extends it or is a
  new module. Do not put game-specific chrome in a game's `plugins/<id>/src/`.
- Respect the core/shell boundary: chrome is presentation (shell/render), never core sim.
- Consistency is the acceptance target: the same frame across all eleven games, driven
  by one definition (mirror the "one definition feeds dev + build" discipline).
- This is the first of five sa1 stories (sa1-2 pause overlay, sa1-3 mouse capture,
  sa1-4 volume, sa1-5 rebinding) — establish a seam the siblings can hang off, but
  YAGNI: don't build their features here.

No ROM/fidelity axis — this is UI polish, not a simulation-accuracy story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-21T11:24:14Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-21T10:37:11Z | 2026-08-21T10:39:02Z | 1m 51s |
| red | 2026-08-21T10:39:02Z | 2026-08-21T10:44:49Z | 5m 47s |
| green | 2026-08-21T10:44:49Z | 2026-08-21T11:03:33Z | 18m 44s |
| review | 2026-08-21T11:03:33Z | 2026-08-21T11:13:36Z | 10m 3s |
| green | 2026-08-21T11:13:36Z | 2026-08-21T11:22:34Z | 8m 58s |
| review | 2026-08-21T11:22:34Z | 2026-08-21T11:24:14Z | 1m 40s |
| finish | 2026-08-21T11:24:14Z | - | - |

## TEA Assessment

Story arrived with **no acceptance criteria** — I defined them in RED. This is a
new shared subsystem, so I anchored the contract to existing precedent rather than
inventing a shape.

### Acceptance Criteria (defined by TEA)
- **AC-1 — the non-game surround is computed, not guessed.** A pure
  `chromeRegions(container, game)` returns the set of non-overlapping rectangles
  that EXACTLY tile the complement of the fitted game rect inside its container
  (area accounts for every dead pixel; empty when the game fills the container).
- **AC-2 — the surround is painted uniformly.** `drawCabinetChrome(ctx, container,
  game, {color})` fills every region from AC-1 with ONE consistent style and paints
  nothing inside the game rect. (The uniformity IS the "consistency" the story asks
  for.)
- **AC-3 — ALL games route through it.** Every one of the eleven games imports
  `@shared/cabinet`; adoption is recorded in `docs/ops/chrome-adoption-matrix.md`
  and refuted against the tree by `tests/chrome-convergence.test.mjs`.

### Contract Dev implements to turn this GREEN
- New BROWSER-subpath module `src/shared/cabinet.ts` exporting `Size`, `Rect`,
  `chromeRegions` (pure) and `drawCabinetChrome` (canvas). Register it as
  browser-exempt in `src/shared/tests/purity.test.ts` exactly like `view` /
  `esc-overlay` (it writes to a ctx).
- Adopt it in each game's shell/render where the margins are drawn — the region
  math pairs with `@shared/view`'s `letterbox` / `fitIntegerScale`, which already
  produce the fitted game rect. Follow the compositional-helper pattern
  (`host-helpers.ts` §4.3): opt-in per game, tracked by the matrix — NOT a monolith.
- Create `docs/ops/chrome-adoption-matrix.md` with a `chrome-adoption-matrix:start`
  /`:end` block, one row per game, cell `adopted`.

### Rule Coverage
- No ROM/fidelity axis (UI polish, not simulation accuracy) — the RED census
  focuses on geometric invariants (no overlap, exact-complement area, in-bounds)
  and the anti-vacuity draw checks (fill-per-region, single style, nothing inside
  the game rect, nothing when full-bleed). Each assertion is meaningful and would
  redden on a wrong decomposition.
- core/shell boundary respected: `chromeRegions` is pure (node-tested); only the
  draw seam touches the ctx and is quarantined as a BROWSER subpath.

### RED verification
- `npx vitest run --project shared src/shared/tests/cabinet.test.ts` → FAILS
  (`Cannot find module '../cabinet'`).
- `node --test tests/chrome-convergence.test.mjs` → FAILS (matrix not recorded).

## Dev Assessment (GREEN)

Built `src/shared/cabinet.ts` to the TEA contract: pure `chromeRegions` + uniform
`drawCabinetChrome` + `CABINET_CHROME` (one shared surround colour `#0a0a12`). It
references no DOM global (ctx is injected via a structural `ChromeCtx`), so the
purity guard scans it clean — no BROWSER_SUBPATHS edit was needed.

Adopted fleet-wide (AC-3) via one parallel agent per game, each keeping its own
vitest project green:
- **Real margins framed** (raster fit leaves in-canvas dead area): asteroids,
  centipede, joust, pac-man, millipede, defender — margin fill now the shared colour.
- **Element-letterboxed** (canvas sized to the fit; visible bars are the page body):
  battlezone, star-wars, missile-command — `drawCabinetChrome` is a no-op in-canvas,
  so `main.ts` also sets `document.body.style.background = CABINET_CHROME.color` at
  boot (one runtime source of truth). I added the body-background line to star-wars
  and missile-command myself to match battlezone, and modelled `document.body` in
  missile-command's boot-shell harness (ES modules are deferred, so body is real in
  the browser).
- **Window-filling** (no bars): tempest, red-baron — seam wired as an honest no-op.

`docs/ops/chrome-adoption-matrix.md` records all eleven as `adopted`;
`tests/chrome-convergence.test.mjs` refutes it against the tree.

Faithful test-only changes, no assertions weakened: asteroids margin colour predicate
(now exact `CABINET_CHROME`, stricter), centipede `main.ts:N` citation re-anchors
(line-only, verbatim unchanged), mc9-4 `@shared` allowlist widened, mc boot-shell
`document.body` stub, battlezone audit line-pin (verbatim unchanged). No `src/core`
touched anywhere.

### GREEN verification
- `npx vitest run` → **1252 files, 18372 tests pass** (1 todo).
- `npm run test:orchestrator` → **507 pass** (includes chrome-convergence, 4 tests).
- `node --test tests/chrome-convergence.test.mjs` → 4 pass.
- `npm run lint` (tsc --noEmit, repo-wide) → clean.

### Note for review
For the three element-letterboxed games the shared chrome is delivered at the DOM/body
layer, not in-canvas — the visible bars live outside the canvas there. The consistency
is real (same `#0a0a12` everywhere), but it is achieved two ways by construction. This
is inherent to those games sizing the canvas element to the fit; flagged so it is a
conscious review point, not a surprise.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Defined ACs and chose the module seam absent any spec**
- **Scoped adoption to all ELEVEN games, and to the letterbox margins specifically**

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Defined ACs and chose the module seam absent any spec**
  - Spec source: sprint/context/context-story-sa1-1.md, "Acceptance Criteria"
  - Spec text: "No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase."
  - What I did: authored AC-1..AC-3 above and pinned a concrete API
    (`@shared/cabinet`: pure `chromeRegions` + canvas `drawCabinetChrome`).
  - Why: brainstorming/design was deliberately skipped by the owner. I anchored the
    shape to established precedent — `@shared/view`'s pure-math + DOM-seam split, and
    the compositional-helper + adoption-matrix convergence idiom from `host-helpers.ts`
    §4.3 / `shell-convergence.test.mjs` — rather than invent a novel structure.
- **Scoped adoption to all ELEVEN games, and to the letterbox margins specifically**
  - Spec source: story title + owner's story text
  - Spec text: "consistent display, with overlay indicating the 'non-game' parts of the
    users' screen. All games go through this for consistency."
  - What I did: interpreted "non-game parts" as the fitted-viewport margin complement
    (which `@shared/view` already computes), and "all games" as the full cabinet floor
    of 11 (not the pre-collapse 7). Lobby is out of scope (it is the front door, not a
    game — consistent with `shell-convergence` listing games only).
  - Why: the literal wording + the existing `letterbox`/`fitIntegerScale` primitives
    make the margin-complement reading the load-bearing one; a decorative bezel would
    be a different, unrequested feature (YAGNI).
## Subagent Results

**Cycle: 0**

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (blocking RED) | confirmed 1, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings (geometry edge-cases assessed by reviewer) |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 actionable (+3 informational clean) | confirmed 2, dismissed 0, deferred 1 (reason-code path forward-looking) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings (type findings covered by rule-checker) |
| 7 | reviewer-security | No | disabled | N/A | Disabled via settings (no auth/input/injection surface) |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (rules #1, #2) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via config.local.yaml)
**Total findings:** 7 confirmed, 0 dismissed, 1 deferred

**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (test-analyzer used isolated git worktrees; rule-checker/comment-analyzer read-only).

## Reviewer Assessment

**Round 0 — VERDICT: REWORK (blocking).**

The feature is architecturally sound and the pure-geometry heart is genuinely
mutation-resistant (test-analyzer verified the `chromeRegions` invariant battery
catches a dropped strip, and the draw-seam tests catch a missing fillStyle). All 11
games route through `@shared/cabinet`, no `src/core` was touched, lint is clean, and
the full vitest suite (1252 files / 18372 tests) passes. But one blocking test
failure and six real quality findings must be fixed before finish.

### Confirmed findings

1. **[PREFLIGHT] BLOCKING — sc1-1 AC-3 RED.** `tests/shell-convergence.test.mjs:310`
   inspects git commits `088bc3d..HEAD` and requires each commit touching any
   `plugins/*/src/main.ts` to touch **≤1** game's. My batched GREEN commit
   `8e97f6cb` touched 8 games' main.ts → RED (`touched.size == 8`). It passed the
   mid-GREEN orchestrator run only because the edits were then uncommitted. The rule
   is legitimate (per-game adoption isolates a timing-regression suspect), so honor
   it: **split the adoption into one-game-per-main.ts commits** (shared infra +
   render.ts-only adoptions can share a commit; each of the 8 main.ts adoptions gets
   its own).
2. **[RULE] [RULE #2] HIGH — `CABINET_CHROME` is a shared MUTABLE singleton.**
   `src/shared/cabinet.ts:61` — `readonly` is compile-time only; runtime
   `CABINET_CHROME.color = 'x'` succeeds and every one of the 11 games' frames sees
   it (ESM live binding). Repo idiom for cross-consumer const objects is
   `Object.freeze` (joust arena.ts PLATFORMS). Fix: `Object.freeze({ color: '#0a0a12' })`.
3. **[TEST] HIGH — convergence proves import-presence, not a real call.**
   `tests/chrome-convergence.test.mjs:75-77` greps only for the import; test-analyzer
   showed a permanently-vacuous call (`container===game` hardcoded on joust) still
   passes 4/4. Fix: require an actual `drawCabinetChrome(` call site per adopted game
   (strengthen `routesThroughChrome`). Per-game paint-geometry assertions for the 9
   games without one remain a known coverage gap (asteroids has a real one) — record
   it, don't necessarily build 9 render tests this round.
4. **[RULE] [TYPE] HIGH — gratuitous casts (rule #1).**
   `src/shared/tests/cabinet.test.ts:141,154,161,170` — `ctx as unknown as
   CanvasRenderingContext2D` is unwarranted; the stub is structurally assignable to
   `ChromeCtx` (confirmed: removing the cast compiles clean). The double-cast defeats
   the type check it should get. Fix: drop the casts.
5. **[TEST] MEDIUM — dead + wrong fixture field.** `src/shared/tests/cabinet.test.ts`
   `CASES[].expectedBars` is never asserted and is factually wrong (declares 3 for the
   full-surround case; `chromeRegions` returns 4). Fix: delete the field (the invariants
   already pin the tiling) — or assert `regions.length` against a corrected value.
6. **[DOC] MEDIUM — stale comment + now-dead code (asteroids).**
   `plugins/asteroids/src/shell/margin.ts:11` still says "render() consumes
   `marginRects` to paint the mask"; render.ts now imports only `fitScale` and paints
   via `drawCabinetChrome`. `marginRects` is dead in production (consumed only by its
   own test). Fix: update the header and remove the dead `marginRects` (+ its orphaned
   test) — `fitScale` stays.
7. **[DOC] MEDIUM — stale doc + dead export (defender).**
   `plugins/defender/src/shell/render.ts:31-35` — `BACKGROUND_INDEX`'s doc claims
   active pixel-level use, but its only call site (the old full-canvas ground fill)
   was removed and it is now entirely unused. Fix: remove the dead export + doc.

### Verified good (not rubber-stamped)
- `chromeRegions` geometry battery is mutation-resistant (dropped-strip mutation reddens exact-area). [TEST]
- Draw-seam tests catch missing-fillStyle and full-fill mutations. [TEST]
- asteroids colour predicate change is a *strengthening* (exact `CABINET_CHROME`, imported live), no coverage dropped. [TEST]
- centipede citation re-anchors are line-only; every `must` regex byte-unchanged (live suite re-run). [TEST][DOC]
- Each raster game's `gameRect` exactly matches its blitted `drawImage`/`putImageData` box — reviewer-verified for defender/centipede/joust/pac-man/millipede. [reviewer]
- `cabinet.ts` is correctly DOM-global-free (code + comments), so it needs no BROWSER_SUBPATHS entry; `@shared` alias already directory-level in all three configs. [RULE #33/#31]
- No `src/core` touched; core/shell boundary intact. [RULE #32]
- Per-game "why" adoption comments each match the game's real fit mechanism. [DOC]

### Rule Compliance
rule-checker ran the full 34-item TS checklist over 61 instances: 2 violations
(#1 casts, #2 unfrozen shared const), both above. Rules #5/#9/#31 (module/alias),
#17 (no-op-draw comments), #18 (no fail-by-passing fixture), #21 (degenerate-input
guard), #32/#33 (core-boundary/purity) all pass.
## Dev Assessment — Rework Round 1

Addressed all 7 review findings:
1. **[BLOCKING sc1-1 AC-3]** — split the batched GREEN commit into per-game slices:
   one infra/adoption commit touching NO main.ts, then 8 commits each touching
   exactly one game's main.ts (battlezone, centipede, joust, millipede,
   missile-command, pac-man, red-baron, star-wars). Verified: every post-baseline
   main.ts commit touches exactly 1; `npm run test:orchestrator` → 507/507 (AC-3 green).
2. **[RULE #2]** — `CABINET_CHROME` is now `Object.freeze({ color: '#0a0a12' })`.
3. **[TEST]** — `chrome-convergence.test.mjs` now requires a real `drawCabinetChrome(`
   call site per adopted game (not just the import); the negative test uses
   `importsChrome` so a non-adopted game must not import at all.
4. **[TYPE/RULE #1]** — dropped the four `as unknown as CanvasRenderingContext2D`
   casts in `cabinet.test.ts`; the stub is structurally assignable to `ChromeCtx`.
5. **[TEST]** — removed the dead+wrong `expectedBars` fixture field.
6. **[DOC]** — asteroids: removed now-dead `marginRects` (+ `Rect`/`MARGIN_EPS`),
   fixed `margin.ts` header, refocused `margin.test.ts` on the surviving `fitScale`
   export (independent-oracle checks) + the type-safety scan.
7. **[DOC]** — defender: removed the dead `BACKGROUND_INDEX` export and its doc.

Residual (recorded, not fixed this round): per-game paint-geometry assertions exist
only for asteroids; the other 10 games rely on the convergence call-site check + the
shared draw-seam unit tests + reviewer-verified gameRect. Building 10 render tests was
judged out of proportion for this story.

### Rework verification
- `npm run test:orchestrator` → 507 pass (AC-3 + chrome-convergence green).
- `npx vitest run` → 1252 files, 18361 tests pass (−11 = removed dead marginRects tests; geometry now covered by shared cabinet.test.ts).
- `npm run lint` → clean. Working tree clean.
## Subagent Results

**Cycle: 1**

Re-verification method: **targeted probes against each characterized finding** (the
gate-sanctioned alternative to a fresh sweep, and stronger evidence for known findings).
Each probe is a concrete command whose result is recorded below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | re-verified clean | 1 prior (AC-3 RED) | confirmed fixed — orchestrator 507/507, AC-3 green |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings (geometry edge-cases assessed by reviewer) |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | re-verified clean | 2 prior | confirmed fixed — expectedBars removed (grep 0); convergence now requires a real call (mutation probe: dropping joust's call while keeping the import REDDENS the suite) |
| 5 | reviewer-comment-analyzer | Yes | re-verified clean | 2 prior | confirmed fixed — asteroids marginRects removed (grep 0) + header corrected; defender BACKGROUND_INDEX removed (grep 0) |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | disabled | N/A | Disabled via settings (no auth/input/injection surface) |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | re-verified clean | 2 prior | confirmed fixed — CABINET_CHROME Object.frozen; 4 gratuitous casts removed (grep 0), lint clean |

**All received:** Yes (4 enabled re-verified; 5 disabled via config.local.yaml)
**Total findings:** 7 prior, all confirmed FIXED; 0 new

**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (after restoring the pf-written
`sprint/epic-sa1.yaml` status stamp, a known tracking-only false-DIRTY).

## Reviewer Assessment

**Round 1 — VERDICT: APPROVE.**

All seven Round-0 findings are fixed and independently re-verified by targeted probe:

- **[TEST] convergence hardened** — `chrome-convergence.test.mjs` now requires a real
  `drawCabinetChrome(` call, not just the import. Mutation probe: removing joust's call
  while keeping its import turns the suite RED (was the Round-0 vacuity gap). Restored.
- **[RULE] `CABINET_CHROME` frozen** — `Object.freeze(...)` at `src/shared/cabinet.ts:61`;
  the shared singleton can no longer be mutated across the 11 importers.
- **[RULE][TYPE] casts removed** — the four `as unknown as CanvasRenderingContext2D`
  double-casts are gone; the stub is structurally typed as `ChromeCtx`; lint clean.
- **[TEST] dead fixture removed** — `expectedBars` deleted (was unused and declared 3
  where `chromeRegions` returns 4).
- **[DOC] asteroids** — dead `marginRects` removed, header corrected, `margin.test.ts`
  refocused on the surviving `fitScale` (independent-oracle checks) + type-safety scan.
- **[DOC] defender** — dead `BACKGROUND_INDEX` export + misleading doc removed.
- **[PREFLIGHT] sc1-1 AC-3** — the batched commit was split into one infra commit
  (0 main.ts) + 8 one-game-per-commit main.ts adoptions; orchestrator 507/507 green.

**Full re-verification:** `npx vitest run` → 1252 files / 18361 tests pass;
`npm run test:orchestrator` → 507 pass; `npm run lint` → clean; working tree clean.

Remaining acknowledged (non-blocking, recorded not fixed): the 9 non-asteroids games
have no per-game paint-geometry assertion — coverage rests on the convergence call-site
check, the shared draw-seam unit tests, and reviewer-verified gameRects. Proportionate
for this story; a future story can add per-game render identity tests if desired.

Approving to finish.