---
story_id: "7-3"
jira_key: ""
epic: "7"
workflow: "tdd"
---
# Story 7-3: Game registry and tile grid

## Story Details
- **ID:** 7-3
- **Jira Key:** (not applicable — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none (independent story)
- **Repo:** lobby (subrepo with its own git history)
- **Branch Strategy:** gitflow (base: develop; feature branch: feat/7-3-game-registry-and-tile-grid)

## Story Context

**Epic:** 7 — Arcade lobby v1
**Type:** Feature (3 points, p1)
**Prerequisites:** 7-1 (Vite+TS+Canvas scaffold, ✓ done), 7-2 (glow rendering primitives in render.ts, ✓ done)

**Description from Epic:** The arcade's front door: a vector-style lobby on black that lists the games as glowing tiles, launches them, runs an attract-mode demo loop when idle, and shows per-game high scores.

**This story establishes:**
- A **game registry** data structure — the list of available games (with metadata: title, launch target, icon/tile color, high-score key)
- A **tile grid layout** renderer — positions tiles in a grid using Canvas 2D, renders each tile as a glowing rectangle using the 7-2 glow primitives (glowFill, glowText, glowLine)
- Basic **tile rendering** — one tile per registered game, centered on a black background

**Acceptance criteria to be defined by TEA in RED phase.** The scope should include:
- [ ] Game registry structure (array/map of games with {title, launchTarget, color, scoreKey})
- [ ] Grid layout algorithm (tiles × rows, padding, centering)
- [ ] Tile rendering using 7-2 glow primitives
- [ ] Integration with a mock games list (tempest + others as needed)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T09:57:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T09:35:37Z | 2026-06-28T09:36:51Z | 1m 14s |
| red | 2026-06-28T09:36:51Z | 2026-06-28T09:43:55Z | 7m 4s |
| green | 2026-06-28T09:43:55Z | 2026-06-28T09:48:00Z | 4m 5s |
| review | 2026-06-28T09:48:00Z | 2026-06-28T09:57:39Z | 9m 39s |
| finish | 2026-06-28T09:57:39Z | - | - |

## Delivery Findings

**Type:** Gap (non-blocking)
**Finding:** Story 7-3 has no acceptance criteria or detailed description in sprint YAML. TEA will define ACs in the RED phase. Initial scope guidance provided above.

### TEA (test design)
- **Gap** (non-blocking): Story 7-3 carried no acceptance criteria in the sprint YAML; TEA authored the contract as failing tests during RED. Affects `sprint/epic-7.yaml` (future epic-7 stories should carry ACs to reduce RED-phase guesswork). *Found by TEA during test design.*
- **Improvement** (non-blocking): `tileGrid` takes tile size as an input rather than deriving responsive sizing; the shell (`main.ts`) owns choosing tile dimensions from the canvas size. Affects `lobby/src/main.ts` (Dev wires canvas size → tile size at integration). *Found by TEA during test design.*
- **Question** (non-blocking): The tests require only `tempest` (`/tempest/`) in the registry; whether to also register `star-wars`/other games now or defer is a Dev/PM call. Affects `lobby/src/core/registry.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `GAMES` ships with only `tempest` — the lobby renders a single centred tile. This resolves TEA's open Question by listing only currently-servable games (star-wars has no pinned serve port yet, so a tile would 404). Affects `lobby/src/core/registry.ts` (add entries as games become servable). *Found by Dev during implementation.*
- **Gap** (non-blocking): The `main.ts` grid wiring (canvas-size → tile-size → `tileGrid` → `drawTiles`) has no automated coverage, consistent with the existing untested DOM bootstrap. Visual verification (`just serve` → http://localhost:5270/lobby/) recommended at review. Affects `lobby/src/main.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tiles.test.ts:65` asserts the label glow colour as `expect.any(String)` rather than pinning `game.color` (`'#00eaff'`), so a wrong/empty label colour would pass. Affects `lobby/tests/tiles.test.ts` (pin the colour, matching the glowRect assertion on line 53). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `drawTile`'s centring relies on `ctx.textAlign='center'` / `textBaseline='middle'` + save/restore, none of which any test asserts — removing them would silently un-centre the label yet pass. Affects `lobby/tests/tiles.test.ts` (assert the text-state and save/restore call counts). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `grid.test.ts:29,33` use bare `.toThrow()`; pin `.toThrow(RangeError)` (or the message) to prove the validation branch — not an incidental error — fires. Affects `lobby/tests/grid.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tileGrid` does not validate `width`/`height`/`tileWidth`/`tileHeight` or non-integer/`NaN` `count`; trusted internal inputs today (canvas dims + `GAMES.length`), but defensive guards or a doc note would harden it for reuse. Affects `lobby/src/core/grid.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 5 findings (1 Gap, 0 Conflict, 0 Question, 4 Improvement)
**Blocking:** None

- **Gap:** Story 7-3 carried no acceptance criteria in the sprint YAML; TEA authored the contract as failing tests during RED. Affects `sprint/epic-7.yaml`.
- **Improvement:** `tileGrid` takes tile size as an input rather than deriving responsive sizing; the shell (`main.ts`) owns choosing tile dimensions from the canvas size. Affects `lobby/src/main.ts`.
- **Improvement:** `GAMES` ships with only `tempest` — the lobby renders a single centred tile. This resolves TEA's open Question by listing only currently-servable games (star-wars has no pinned serve port yet, so a tile would 404). Affects `lobby/src/core/registry.ts`.
- **Improvement:** `tiles.test.ts:65` asserts the label glow colour as `expect.any(String)` rather than pinning `game.color` (`'#00eaff'`), so a wrong/empty label colour would pass. Affects `lobby/tests/tiles.test.ts`.
- **Improvement:** `drawTile`'s centring relies on `ctx.textAlign='center'` / `textBaseline='middle'` + save/restore, none of which any test asserts — removing them would silently un-centre the label yet pass. Affects `lobby/tests/tiles.test.ts`.

### Downstream Effects

Cross-module impact: 5 findings across 4 modules

- **`lobby/tests`** — 2 findings
- **`lobby/src`** — 1 finding
- **`lobby/src/core`** — 1 finding
- **`sprint`** — 1 finding

## Design Deviations

(None recorded in setup phase)

### TEA (test design)
- No deviations from spec. Story 7-3 carried no acceptance criteria in the sprint YAML, so TEA authored the contract during RED rather than deviating from an existing one. The design decisions behind that contract are recorded in the TEA Assessment and Delivery Findings.

### Dev (implementation)
- No deviations from spec. Implemented exactly the three modules pinned by TEA's tests plus the `main.ts` wiring named in the contract. Keeping the registry to `tempest` only is within the tests (which require only `tempest`) and resolves TEA's open Question rather than deviating from any spec.

### Reviewer (audit)
- **TEA — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the test contract faithfully encodes the (TEA-authored) ACs; no undocumented spec divergence in the tests.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the three modules + `main.ts` wiring match TEA's contract exactly; limiting the registry to `tempest` is within the tests and a sound call (no other game has a servable port yet).
- **UNDOCUMENTED (process note, not a code deviation):** TEA's "Rule Coverage" stated "no lang-review checklist in repo" — inaccurate. `.pennyfarthing/gates/lang-review/typescript.md` exists; the path is relative to the orchestrator root, not `lobby/`, which is why TEA's `ls` from inside `lobby/` missed it. The rule-checker ran the full 13-check list this phase → 0 violations, so there is no code impact. Severity: L.

## Sm Assessment

**Routing decision:** Hand off to TEA (O'Brien) for the RED phase.

**Rationale:**
- Story 7-3 is a 3-point feature with workflow `tdd` (phased: setup → red → green → review → finish). At 3 points it sits above the trivial threshold, so TDD is correct — tests first.
- Prerequisites are satisfied: 7-1 (Vite+TS+Canvas scaffold) and 7-2 (glow rendering primitives in `render.ts`) are both `done`. 7-3 builds directly on the 7-2 primitives (`glowFill`/`glowText`/`glowLine`) to render the tile grid.
- The sprint YAML carries no ACs/description for this story. That is expected for this project — TEA owns defining acceptance criteria during RED. Initial scope guidance is recorded in Story Context above to anchor that work.
- Setup is complete: session file present, feature branch `feat/7-3-game-registry-and-tile-grid` created in `lobby/` off `develop`, story + epic context written. No Jira (local YAML tracking).

**Scope guardrails for TEA:** Keep 7-3 to the registry data structure + grid layout + tile rendering. Tile *selection* and *game launch* are explicitly the next story (7-4) — do not pull them forward.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-point feature on the `tdd` workflow. Pure layout math, data invariants, and render composition all warrant coverage.

**Test Files:**
- `tests/registry.test.ts` — Game registry shape & invariants (unique ids, non-empty titles, root-relative `launchUrl`s, valid hex colours, `tempest` present at `/tempest/`) plus `getGame` lookup (hit / unknown / empty id).
- `tests/grid.test.ts` — Pure centred tile-grid layout math: count + empty + validation (throws on negative count and non-positive columns), uniform sizing, row-major placement, exact gap, left-aligned partial final row, default columns = `ceil(sqrt(count))`, and exact + symmetric centring.
- `tests/tiles.test.ts` — `drawTile` / `drawTiles` composing the story 7-2 glow primitives (`glowRect` outline in the game colour + centred `glowText` title). `render.ts` is mocked so the tests assert *composition* (which primitive, what args), not the bloom maths already covered by `render.test.ts`. Covers draw-min(games, rects) and the empty case.

**Tests Written:** 26 tests authored across the three files, covering the full 7-3 contract (registry data, grid math, tile-render composition).
**Status:** RED — verified by `testing-runner` (RUN_ID `7-3-tea-red`). The 3 new files fail to load on missing modules (`src/core/registry.ts`, `src/core/grid.ts`, `src/shell/tiles.ts`); the 18 pre-existing tests (`layout.test.ts`, `render.test.ts`) still pass. RED is for the correct reason — missing implementation, not a test bug.

### Contract for Dev (GREEN)

Implement exactly these three modules so the tests pass — no selection/launch (that is 7-4):

1. `src/core/registry.ts`
   - `export interface Game { id: string; title: string; launchUrl: string; color: string }`
   - `export const GAMES: readonly Game[]` — must include `{ id: 'tempest', title: 'TEMPEST', launchUrl: '/tempest/', color: '#…' }`; unique ids, non-empty titles, root-relative `launchUrl`s, hex colours.
   - `export function getGame(id: string): Game | undefined`
2. `src/core/grid.ts` (pure, DOM-free — lives in `core/` like `layout.ts`)
   - `export interface TileRect { x: number; y: number; w: number; h: number }`
   - `export interface GridSpec { count: number; width: number; height: number; tileWidth: number; tileHeight: number; columns?: number; gap?: number }`
   - `export function tileGrid(spec: GridSpec): TileRect[]` — centred block, row-major order, `columns` defaults to `ceil(sqrt(count))`, returns `[]` for count 0, throws on count < 0 or columns ≤ 0.
3. `src/shell/tiles.ts`
   - `export function drawTile(ctx, rect: TileRect, game: Game): void` — `glowRect` outline in `game.color` + centred `glowText` title (centre = rect centre).
   - `export function drawTiles(ctx, games: readonly Game[], rects: readonly TileRect[]): void` — draws `min(games.length, rects.length)` tiles.

Mirror `render.ts` conventions: `Readonly<>` on style/option params. Wiring the grid into `main.ts` (canvas size → tile size → `tileGrid` → `drawTiles`) is in scope as the visible deliverable.

### Rule Coverage

No `.pennyfarthing/gates/lang-review/*`, `.claude/rules/*`, or `SOUL.md` exists in this repo, so the rubric is project conventions:

| Convention | Test(s) | Status |
|------------|---------|--------|
| Pure `core/` math is DOM-free & unit-tested | `grid.test.ts`, `registry.test.ts` | failing (RED) |
| Validated inputs reject the impossible | `grid.test.ts` (throws on negative count / non-positive columns) | failing (RED) |
| Shell composes 7-2 primitives, no re-implementation | `tiles.test.ts` (`render.ts` mocked) | failing (RED) |
| Data invariants enforced (unique ids, valid colours) | `registry.test.ts` | failing (RED) |
| Meaningful assertions; no vacuous tests | self-check below | n/a |

**Rules checked:** N/A (no lang-review checklist in repo) — conventions covered as above.
**Self-check:** Reviewed all 26 tests — each asserts on a concrete value (no `let _ =`, `assert(true)`, or `is_none()`-on-always-None). The compile-time Game-shape test asserts the field-key set, not a tautology.

**Handoff:** To Dev (Julia) for GREEN.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/registry.ts` (new) — `Game` interface, `GAMES` registry (`tempest` → `/tempest/`), `getGame()` lookup. Pure data, no DOM.
- `src/core/grid.ts` (new) — `tileGrid()`: pure centred, row-major layout over fixed-size tiles; `columns` defaults to `ceil(sqrt(count))`; returns `[]` for count 0; throws `RangeError` on count < 0 or columns ≤ 0.
- `src/shell/tiles.ts` (new) — `drawTile` / `drawTiles` composing the 7-2 glow primitives (`glowRect` outline + centred `glowText` label), with save/restore around the label's text alignment.
- `src/main.ts` (modified) — the lobby now paints the ARCADE title near the top plus a centred grid of game tiles whose size is derived from the canvas.

**Tests:** 44/44 passing (GREEN) — verified by `testing-runner` (RUN_ID `7-3-dev-green`). `tsc --noEmit` clean.
**Branch:** `feat/7-3-game-registry-and-tile-grid` (pushed to `origin`).

**Self-review:**
- Wired to front end: yes — `main.ts` renders the registry through the grid.
- Follows project patterns: `core/` pure maths + `shell/` canvas split; `Readonly<>` params mirroring `render.ts`.
- ACs met: registry data + invariants, centred grid layout maths, tile rendering via the 7-2 primitives — all covered by the 26 RED tests, now green.
- Error handling: `tileGrid` validates count/columns (RangeError per tests); `drawTiles` bounds to `min(games, rects)`.
- Scope held: no tile selection or game launch — those stay in story 7-4.

**Handoff:** To Reviewer (The Thought Police) for code review.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (44/44 green, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (1 medium, 5 low — all non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (13 rules / 32 instances / 0 violations) | N/A |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (all non-blocking — 1 medium, 5 low), 0 dismissed, 0 deferred

> The 6 disabled subagents' domains were assessed by the Reviewer directly (see the tagged observations below) so no coverage area is silently skipped.

---
## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `GAMES` (static registry) → `main.ts draw()` derives `tileWidth/tileHeight/gap` from the canvas → `tileGrid()` returns centred row-major rects → `.map()` offsets them below the title → `drawTiles()` → `drawTile()` → `glowRect` + `glowText` (story 7-2 primitives) → Canvas 2D. Safe: no external/user input enters the path; the title text is a literal and game titles are static; text is drawn via `fillText`, not `innerHTML`, so there is no injection surface.

**Pattern observed:** Clean `core/` (pure, DOM-free maths: `registry.ts`, `grid.ts`) vs `shell/` (Canvas rendering: `tiles.ts`) split, matching `layout.ts`/`render.ts` — `lobby/src/core/grid.ts:42`, `lobby/src/shell/tiles.ts:15`. `Readonly<>` on data params mirrors `render.ts`.

**Error handling:** `tileGrid` validates with typed `RangeError` on count < 0 (`grid.ts:44`) and columns ≤ 0 (`grid.ts:48`); `drawTiles` bounds to `min(games, rects)` (`tiles.ts:34`) so neither array is over-read. No `try/catch`, no swallowed errors.

### Observations

- `[VERIFIED]` `grid.ts:47,49` use `??` (not `||`) for `columns`/`gap` defaults — an explicit `0` is preserved, so `columns:0` reaches the `RangeError` guard and `gap:0` stays a valid zero-gap. Complies with typescript.md check #4 (`||` on falsy-but-valid values). Evidence: `spec.columns ?? Math.ceil(...)`, `spec.gap ?? DEFAULT_GAP`.
- `[VERIFIED]` Centring maths is correct — `grid.ts:50-53` centres the block (`originX = (width - blockW) / 2`); unit-proved exactly (single tile → `{30,30,40,40}`) and by symmetry (`grid.test.ts`). Row-major order and gap spacing confirmed.
- `[VERIFIED]` No injection/secret/auth surface — `registry.ts` is static data; `tiles.ts`/`main.ts` render via `fillText`. No `innerHTML`/`dangerouslySetInnerHTML`, no network, no secrets.
- `[VERIFIED]` Types are sound — `Readonly<>`/`readonly` on every data param (`grid.ts:42`, `tiles.ts:16-18,35-36`), `import type` for type-only imports, `getGame(): Game | undefined`. No `as any`; the only cast (`tiles.test.ts` `as unknown as CanvasRenderingContext2D`) is the documented partial-Canvas-mock idiom from `render.test.ts`.
- `[RULE]` reviewer-rule-checker: **clean** — 13 TS checks, 32 instances, 0 violations. Extensionless imports are correct under `moduleResolution: "bundler"` (not flagged). `getContext('2d')!` and `skipLibCheck:true` noted as pre-existing (outside this diff).
- `[TEST]` reviewer-test-analyzer (MEDIUM): `tiles.test.ts:57-67` asserts `glowText` is called at the centre *coordinate* but never asserts `ctx.textAlign='center'`/`textBaseline='middle'`/save/restore — deleting the centring state would un-centre the label yet keep tests green. Confirmed, non-blocking; recommended tightening recorded in Delivery Findings.
- `[TEST]` reviewer-test-analyzer (LOW): `tiles.test.ts:65` label colour matcher is `expect.any(String)` instead of `'#00eaff'`; `grid.test.ts:29,33` use bare `.toThrow()`; `registry.test.ts:77` `Object.keys` check is tautological (real guard is the `: Game` annotation); `drawTiles` lacks the `rects > games` symmetric case; `registry.test.ts:54` `toBe(GAMES.find(...))` couples to impl (intentional ref-identity check — acceptable). All confirmed, non-blocking. Production behaviour is correct in every case.
- `[EDGE]` (self — subagent disabled): boundary cases are covered — count 0 → `[]`, count 1 centred, partial last row left-aligned, default `columns = ceil(sqrt(count))`. Untested/unvalidated: non-integer/`NaN` `count` and negative canvas dimensions would produce odd/off-canvas rects silently, but inputs are trusted internal values; LOW, recorded as a hardening Improvement.
- `[SILENT]` (self — subagent disabled): no swallowed errors — no empty catches, no silent fallbacks; the two failure modes (`count<0`, `columns<=0`) throw loudly.
- `[DOC]` (self — subagent disabled): comments/JSDoc are accurate and match behaviour (e.g. `grid.ts` "tile size is an input", `tiles.ts` "composes... never re-implementing the bloom"); the `main.ts` header was updated to reflect the new tile grid. No stale docs.
- `[TYPE]` (self + rule-checker): no stringly-typed escape hatches in `src/`; `Game` fields are plain `string` which is appropriate for static config (no branded types warranted at this scale).
- `[SEC]` (self — subagent disabled): N/A surface — no tenant data, auth, deserialization, or user input; static registry + canvas draw.
- `[SIMPLE]` (self — subagent disabled): minimal implementation, no dead code or over-engineering; tile-size-as-input keeps `grid.ts` a clean pure unit rather than entangling responsive sizing.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`, 13 checks)

| # | Check | Result |
|---|-------|--------|
| 1 | Type-safety escapes | ✓ — no `as any`/`@ts-ignore`/unsafe `!` in `src/`; one justified test-mock double-cast |
| 2 | Generic/interface pitfalls | ✓ — `Readonly<>`/`readonly` on all data params; no `Record<string,any>`/`Function` |
| 3 | Enum anti-patterns | n/a — no enums |
| 4 | Null/undefined handling | ✓ — `??` used correctly (preserves explicit 0); optional chaining only reads, never calls |
| 5 | Module/declaration | ✓ — `import type` for type-only imports; extensionless imports correct under `bundler` resolution |
| 6 | React/JSX | n/a — no `.tsx` |
| 7 | Async/Promise | n/a — all new code synchronous |
| 8 | Test quality | ✓ structurally (no `as any`, mock types match, imports from `src/`); 6 tightening recommendations logged |
| 9 | Build/config | ✓ — `strict:true`; `skipLibCheck`/`noUnusedParameters` are pre-existing config |
| 10 | Input validation | n/a — no user-input boundary (static registry) |
| 11 | Error handling | ✓ — typed `RangeError`; no `catch(e:any)` |
| 12 | Performance/bundle | ✓ — direct imports, no barrels, no sync fs/JSON.stringify in hot paths |
| 13 | Fix-introduced regressions | n/a — new feature, not a fix patch |

### Devil's Advocate

Assume this code is broken. The most credible failure is the **centring regression gap**: `drawTile` only visually centres the label because it sets `ctx.textAlign='center'`/`textBaseline='middle'` before calling `glowText`, yet the test suite asserts only the centre *coordinate* passed to `glowText`, never the alignment state. A future refactor that drops those two lines (or moves the `save`/`restore`) would render every game title anchored at its left edge — visibly broken — while all 44 tests stay green. That is a real, if non-blocking, coverage hole for a stated AC ("centred label"). Second, `tileGrid` trusts its numeric inputs completely: a `NaN` count returns `[]` silently (the `for` never iterates), a non-integer count over-counts the final row via the `i < count` loop, and negative canvas dimensions yield negative `originX`/`originY` so tiles march off-canvas with no error — none of which any caller hits today, but all of which would surprise a future reuser. Third, a confused user on a vanishingly small window gets `floor`-ed tile/font sizes that can hit small integers; still positive, so it degrades rather than crashes. Fourth, the lobby currently lists exactly one game, so the entire multi-tile/partial-row code path is exercised only by unit tests, never at runtime — an integration blind spot until a second game is registered. Fifth, the loose `expect.any(String)` colour matcher means a label accidentally drawn in the wrong colour would ship undetected. None of these are correctness defects in the *shipped* behaviour (verified by three independent passes), and all the realistic inputs are trusted internal values — so they are recorded as non-blocking test/hardening Improvements rather than blockers. The shipped lobby renders the registry correctly, type-checks cleanly, and passes every test.

### Verdict rationale

Zero production, logic, type, security, or rule defects across preflight, rule-checker, and my own analysis. All 6 confirmed findings are test-quality/hardening Improvements (1 medium, 5 low) — none are High/Critical, so none block per the severity rules. This matches the project's established handling of story 7-2 (approved with test-tightening recommendations recorded when there are no logic defects). The recommendations are captured in Delivery Findings for a follow-up.

**Handoff:** To SM (Winston Smith) for finish-story.