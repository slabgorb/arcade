---
story_id: "7-4"
jira_key: ""
epic: "7"
workflow: "trivial"
---
# Story 7-4: Tile selection and game launch

## Story Details
- **ID:** 7-4
- **Jira Key:** (none - local sprint tracking)
- **Workflow:** trivial
- **Stack Parent:** none
- **Points:** 2
- **Type:** feature
- **Branch Strategy:** gitflow (feat/7-4-tile-selection)

## Acceptance Criteria

**Selection & Navigation:**
- Cursor starts on the first tile (index 0)
- Arrow keys (UP, DOWN, LEFT, RIGHT) move cursor between tiles
- Cursor wraps at grid edges (wraps right → left at row end, etc.)
- Selected tile highlights distinctly (e.g., brighter glow, thicker outline)

**Launch:**
- ENTER / RETURN key launches the selected game (navigates to game.launchUrl)
- Window open behavior: same-tab navigation (window.location.href = launchUrl)

**Input Handling:**
- Input state machine tracks selected index (0 to GAMES.length-1)
- Keyboard listener on window captures arrow + ENTER
- Render loop draws selection highlight over the current tile
- No mouse input in this story (future work)

**Integration:**
- Builds on 7-3's registry, grid layout, and tile rendering
- Uses existing glow primitives (7-2) for selection highlight styling
- Tests verify cursor navigation at grid edges + launch dispatch

## Technical Approach

**Data Model:**
- Add input state module (`src/core/input.ts` or similar):
  - Track selected game index (0-based)
  - Cursor position derived from index + grid layout
  - Provide movement + launch dispatch functions

**Render Integration (src/main.ts):**
- Calculate which tile index the cursor should highlight (from grid layout)
- Pass selected index to `drawTiles` or a new `drawTilesWithSelection` variant
- Highlight draws an extra glow layer or brighter outline on the selected tile

**Input Binding (src/shell/ or main.ts):**
- Wire `keydown` listener to move cursor and handle ENTER
- Clamp / wrap index to [0, GAMES.length)
- On ENTER, dispatch window.location.href to getGame(index).launchUrl

**Testing:**
- Unit tests for grid index → cursor position mapping
- Integration tests for arrow key sequences, wrapping behavior
- Launch dispatch test (mock window.location.href)

## SM Assessment

Story 7-4 is a clean, well-scoped 2pt `trivial` story that builds directly on the
finished 7-3 foundation (game registry, grid layout, glow-based tile rendering).
The work is additive: a selection cursor over the existing tile grid plus a launch
dispatch to `game.launchUrl`. No backend, no new dependencies, no architectural risk.

**Routing decision:** Hand off to Dev (Julia) for the implement phase. Trivial
workflow is implement → review → finish; no separate red/test-author phase, Dev
writes implementation + tests together.

**Scope guardrails for Dev:**
- Keyboard-only selection (arrows + ENTER). Mouse input is explicitly out of scope
  (deferred to future work) per the derived ACs.
- Reuse existing 7-2 glow primitives for the selection highlight rather than
  inventing new render helpers — match the established lobby visual language.
- Launch is same-tab navigation (`window.location.href`), consistent with the
  registry's `launchUrl` (tempest → `/tempest/`).
- Tests must cover edge wrapping and launch dispatch (mock `window.location`).

**Open question (non-blocking):** ACs were derived (not authored in the YAML), so
Dev should sanity-check the wrap-at-edges semantics against the actual grid layout
from 7-3 and adjust if the row/column math makes a different wrap behavior more
natural. Flag any deviation in Design Deviations.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `lobby/src/core/selection.ts` (new) — pure `moveSelection(index, count, columns, direction)`: row-major cursor navigation with row/column wrapping and partial-final-row awareness.
- `lobby/src/shell/input.ts` (new) — `keyToAction` (arrows→move, Enter→launch), `launchGame(game, navigate)` (injected navigation, testable), `bindLobbyInput` (thin `keydown` binding, `preventDefault` only for handled keys).
- `lobby/src/core/grid.ts` — extracted `defaultColumns(count)` as the shared column-count source of truth (used by both `tileGrid`'s default and the selection cursor so they can't disagree).
- `lobby/src/shell/tiles.ts` — `drawTile`/`drawTiles` take a selection flag/index; the selected tile gets a brighter, thicker glow (blur 24 / width 4 vs default 8 / 2).
- `lobby/src/main.ts` — holds `selectedIndex`, wires `bindLobbyInput(window, …)`, repaints on move, launches via `window.location.href`. Font strings switched to the Vector Battle chain; kicks off `loadVectorFont()` and repaints on load.
- `lobby/src/shell/render.ts` — `glowText` now uppercases + tracks letters ~0.1em (the shared arcade treatment).
- `lobby/src/shell/font.ts` (new) + `lobby/public/fonts/{VectorBattle-e9XO.ttf,Readme.txt}` — best-effort Vector Battle loader + the licensed font asset (user-requested font fix).
- `lobby/tsconfig.json` — added `vite/client` types for `import.meta.env`.
- Tests: `tests/selection.test.ts` (new), `tests/input.test.ts` (new), plus `tests/grid.test.ts`, `tests/tiles.test.ts`, `tests/render.test.ts` extended.

**Tests:** 78/78 passing (GREEN). `npm run build` (tsc --noEmit && vite build) clean.

**Manual verification:** Loaded the lobby in a browser against the running dev server — Vector Battle font loads and renders (confirmed via `document.fonts.check`), the title/tile render in the vector face with the glow+tracking treatment, and pressing Enter navigates to the selected game's `launchUrl` (`/tempest/`). Screenshot reviewed.

**Branch:** feat/7-4-tile-selection (lobby/develop) — pushed after this assessment.

**Handoff:** To review phase (The Thought Police).

### Dev Rework (round 2 — addressing review REJECT)

All three required fixes + all three recommended folds applied (commit `faf9540`). No implementation logic changed — the review confirmed `moveSelection` was correct; this round closes the test/typing gaps:

- **[TEST]** `tests/selection.test.ts` — added partial-row `up` (0→3, 1→4, 3→0, 4→1) and `left` (3→4, 4→3) wrap cases.
- **[TEST]** `tests/tiles.test.ts` — pinned exact `SELECTED_BLUR`=24 / `SELECTED_WIDTH`=4 (was a degenerate `>0`).
- **[TYPE]** `src/shell/input.ts` — `launchGame(game: Readonly<Game> | undefined, …)`.
- **[TEST]** `tests/input.test.ts` — added a non-zero `getIndex` move case (proves the live closure is read).
- **[DOC]** `src/shell/render.ts` — documented `glowText`'s intentional persistent `letterSpacing` treatment in the JSDoc; `tests/render.test.ts` now asserts the overwrite explicitly.
- **[SIMPLE]** `src/main.ts` — uses `UI_FONT_FAMILY` from `font.ts` (removed the dead export + hardcoded string; one source of truth for the family name).

**Tests:** 82/82 passing (GREEN, +4 from new cases). `npm run build` clean.
**Deferred (Reviewer-agreed, pre-existing, not 7-4 scope):** `main.ts:15 getContext('2d')!`, `tsconfig skipLibCheck`, the mock `as unknown as CanvasRenderingContext2D` casts in render/tiles tests.

**Handoff:** Back to review (The Thought Police) for re-review.

## Subagent Results

_Round 2 re-review of Dev's rework commit `faf9540`. Same three subagents enabled as round 1 (`preflight`, `test_analyzer`, `rule_checker`); six disabled via `workflow.reviewer_subagents`._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 smell (tests 82/82 green, build clean) | confirmed 1 (LOW), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (all round-2 additions verified arithmetically correct) | confirmed 3 (LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation (16 rule groups, 71 instances checked) | confirmed 1 (LOW), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents` pre-filled as Skipped)
**Total findings:** 4 confirmed (all LOW, non-blocking — the `as unknown as Event` cast nit is the same item flagged by both preflight and rule-checker), 0 dismissed, 0 deferred. **All three round-1 blockers resolved and independently verified.**

### Round-1 → Round-2 resolution

| Round-1 finding | Round-2 status |
|-----------------|----------------|
| [MEDIUM] `[TEST]` partial-row `up`/`left` wrap untested | ✅ FIXED — `selection.test.ts` adds left 4→3/3→4, up 3→0/4→1, up-wrap 0→3/1→4. Re-derived correct by me + test-analyzer. |
| [MEDIUM] `[TEST]` degenerate highlight assertion | ✅ FIXED — `tiles.test.ts` now pins `selected.blur===24`, `selected.width===4` (match `SELECTED_BLUR`/`SELECTED_WIDTH` in `tiles.ts:13-14`), keeps `toBeUndefined` on others. |
| [LOW] `[TYPE][RULE]` `launchGame` missing `Readonly<>` | ✅ FIXED — `input.ts:35` `game: Readonly<Game> \| undefined`. |
| [TEST] (rec) non-zero `getIndex` test | ✅ FOLDED — `input.test.ts` getIndex=()=>2, 2×2, ArrowRight → onMove(3). |
| [DOC] (rec) `glowText` letterSpacing contract | ✅ FOLDED — `render.ts` JSDoc now documents the intentional persistent treatment; `render.test.ts` asserts the overwrite. |
| [SIMPLE] (rec) dead `UI_FONT_FAMILY` export | ✅ FOLDED — `main.ts` now imports and uses `UI_FONT_FAMILY`; hardcoded string removed. |

### Rule Compliance (lang-review/typescript.md — 13 checks + 3 project conventions A1–A3)

Rule-checker enumerated 71 instances across 16 rule groups; cross-checked against the diff and my own reads of `selection.ts`/`input.ts`/`grid.ts`:

- **#1 Type-safety escapes:** One NEW finding — `tests/input.test.ts:57 ev as unknown as Event` double-cast on the keydown stub with **no justifying comment**, where `render.test.ts:88-94` established the convention of documenting this exact pattern. Test-only, functionally correct (only `.key`/`.preventDefault` are touched). LOW. `input.ts:66 (ev as KeyboardEvent).key` is a single cast forced by the `addEventListener` signature — compliant. `main.ts:15 getContext('2d')!` is **pre-existing** (unchanged this diff).
- **#2 Generic/interface pitfalls:** Clean now — `launchGame(game: Readonly<Game> | undefined …)` carries `Readonly<>`; every object/array param in the diff (`rect`, `game`, `games`, `rects`, `deps`, `style`, `spec`, `KEY_DIRECTIONS`) is `Readonly<>`/`readonly`. The round-1 violation is closed.
- **#3 Enums:** Clean — `Direction` and `LobbyAction` are unions (rule prefers unions); the `if/else` over `LobbyAction` structurally covers both members.
- **#4 Null/undefined:** Clean — `??` throughout (`grid.ts:57,59`, `render.ts`); `if (!game) return` / `if (!action) return` guards; regex result guarded by ternary; no `||` on 0-capable values; no `Map.get`.
- **#5 Module/declaration:** Clean — `moduleResolution: bundler` (so `.js` extension rule N/A); `import type` vs value imports correct; no `///` directives.
- **#6 React/JSX:** N/A (no .tsx).
- **#7 Async/Promise:** Clean — `loadVectorFont(): Promise<boolean>` returns meaningful data; `void …then()` intentional; catch doesn't rethrow.
- **#8 Test quality:** No `as any`; imports from `src/`; structural mock casts (`c[5] as {...}`) are precise narrowings, not widening. The `as unknown as Event` cast is the one nit (cross-listed under #1).
- **#9 Build/config:** `strict: true`. `vite/client` added to `types` is correct (needed for `import.meta.env.BASE_URL`). `skipLibCheck: true` is **pre-existing**, standard for Vite — deferred.
- **#10 Input validation:** Clean — `key` maps to `LobbyAction|null` via a fixed lookup; `launchUrl` is static registry data, not user input; no `JSON.parse`/`as T`.
- **#11 Error handling:** Clean — `catch (err)` is `unknown` under strict; logged via `console.warn`, not rethrown.
- **#12 Performance/bundle:** Clean — no barrel imports, no dynamic import, no sync fs; font load is one-shot at startup.
- **#13 Fix regressions:** Clean — the round-2 fix commit introduced no `as any`, no `||`-vs-`??`, no type/runtime mismatch. The new test cast is the only new escape and it is test-only.
- **A1 Core/shell purity:** ✅ I read `selection.ts` and `grid.ts` directly — zero imports, no DOM globals (`window`/`document`/`canvas`/`FontFace`), pure `Math`/arithmetic.
- **A2 No cross-repo imports:** ✅ no `tempest/`/`star-wars/` import anywhere; `shell/font.ts` is a lobby-owned mirror per CLAUDE.md.
- **A3 Asset resolution:** ✅ `font.ts:24` uses `import.meta.env.BASE_URL`, not a hardcoded `/lobby/`.

### Observations (independent + subagent-tagged)

- `[VERIFIED]` Core/shell boundary intact — read `src/core/selection.ts` and `src/core/grid.ts`: import sections empty, bodies pure arithmetic, no DOM references. Complies with CLAUDE.md hard-boundary rule (A1). Evidence: `selection.ts:1-47`, `grid.ts:1-79`.
- `[VERIFIED]` Round-2 `moveSelection` test math is correct — re-derived independently: `moveSelection(1,5,3,'up')` → colHeight `floor((5-1-1)/3)+1=2`, newRow `(0-1+2)%2=1` → `1*3+1=4` (matches test); `moveSelection(3,5,3,'left')` → rowLen `min(3,5-3)=2` → `3+((0-1+2)%2)=4` (matches test). All six new partial-row assertions land on populated cells. Evidence: `selection.ts:33-46`, `tests/selection.test.ts:76-93`.
- `[VERIFIED]` `[TYPE]` `launchGame` now takes `Readonly<Game> | undefined` — `input.ts:35`. Round-1 type finding closed; complies with checklist #2 and the diff's uniform `Readonly<>` convention.
- `[VERIFIED]` `[TEST]` Highlight assertion now pins exact constants — `tiles.test.ts` asserts `selected.blur===24`/`selected.width===4`, which match `SELECTED_BLUR=24`/`SELECTED_WIDTH=4` at `tiles.ts:13-14`; unselected tiles assert `toBeUndefined()`. A regression to a weak/zero highlight is now caught.
- `[VERIFIED]` `[TEST]` Live-index binding proven — `input.test.ts` getIndex=()=>2 on a 2×2 grid, ArrowRight expects `onMove(3)`; `bindLobbyInput` reads `deps.getIndex()` at event time (`input.ts:70,72`), so a bind-time-capture bug would yield 1 and fail. Genuine discriminator.
- `[TEST][LOW]` `tests/tiles.test.ts` — `drawTile` is never called directly with `selected=true`; the selected branch is exercised only via the `drawTiles` suite (which does pin 24/4). Behaviour is covered, but a direct unit test would localise a `drawTile`-level regression. Non-blocking. [test-analyzer, medium confidence]
- `[TEST][LOW]` `tests/input.test.ts` — move test doesn't assert `onLaunch` was NOT called (and the launch test doesn't assert `onMove` not called); the live-index test fires once, so it proves event-time read but not per-press re-read (name slightly overclaims). One-line assertions would close both. Non-blocking. [test-analyzer, low confidence]
- `[TYPE][RULE][LOW]` `tests/input.test.ts:57` — `ev as unknown as Event` double-cast lacks the justifying comment the project established at `render.test.ts:88-94`. Test stub, functionally correct. Non-blocking convention nit. [rule-checker high confidence / preflight smell — same item]
- `[EDGE]` (subagent disabled) — manually re-checked boundaries: `count=0` → `moveSelection` returns 0, `tileGrid` returns `[]`, `drawTiles` no-ops, `launchGame(undefined)` no-ops; out-of-range index clamps (`selection.ts:28`); non-positive columns → 1. No crash.
- `[SILENT]` (subagent disabled) — manually re-checked: the only swallowed error is `font.ts` catch → `console.warn` + `return false`, the documented best-effort font fallback. Appropriate.
- `[SEC]` (subagent disabled) — manually re-checked: navigation target is static registry data, no injection surface, no secrets. Clean.

### Devil's Advocate

Assume this is still broken after the rework. Where could it bite? The round-1 worry — that the cursor's hardest paths (partial-row `up`/`left` wrap) shipped untested — is now closed: the six new cases pin exactly the `colHeight`/`rowLen` clamps a future refactor would break, and I re-derived each by hand rather than trusting the green bar. The highlight tautology is gone too: pinning `blur===24`/`width===4` means a "tone down the glow to 0" edit now fails loudly instead of silently shipping an invisible cursor. So the load-bearing logic finally has a safety net with no holes over it. What's left to attack? First, this is still dark code — the registry lists one game, so none of the wrap logic runs in production until 7-5+ add tiles; a latent bug would surface far from this PR. But that's exactly why pinning the math now (rather than "it's only one tile, who cares") was the right call, and it's done. Second, the `as unknown as Event` cast in the new test could mask a real interface drift: if `bindLobbyInput` later reads a field beyond `.key`/`.preventDefault`, the stub wouldn't provide it and the cast would hide the gap — but that's a future-coupling risk on a LOW test nit, not a defect today, and the fix is a one-line comment plus discipline. Third, a confused user on a single-tile lobby presses an arrow, sees nothing move, and assumes the screen is frozen — but there's no on-screen control hint. That's a genuine UX gap, already logged by Dev as a non-blocking delivery finding deferred to a polish story (7-6), and it is not a correctness defect. Fourth, the `glowText` `letterSpacing` leak: the function still mutates caller state outside save/restore — but round 2 made the JSDoc tell the truth about it, every current caller wraps in save/restore, and the behaviour mirrors tempest/star-wars. The contract is now honest, so the trap is documented rather than hidden. Fifth, the pre-existing `getContext('2d')!` can still throw on a context-refusing browser — but it predates 7-4, is unchanged, and is captured as a deferred delivery finding. None of these rise to High: the correctness core is now tested and verified, and every residual is either a LOW test-polish item or a pre-existing/deferred concern with a paper trail. The bar for a 2-point navigation story is "the navigation maths is correct and pinned" — that bar is now met.

## Reviewer Assessment

**Verdict:** APPROVED

_Round 2. Round 1 REJECTED on two MEDIUM `[TEST]` gaps (untested partial-row wrap; degenerate highlight assertion) + one LOW `[TYPE][RULE]` nit (`launchGame` missing `Readonly<>`). Dev's commit `faf9540` closed all three plus the three recommended folds, with **no implementation logic changed** — confirmed by re-reading the source and re-deriving the test math. Preflight green (82/82, build clean). The four residual findings are all LOW and non-blocking._

**Data flow traced:** `window` keydown → `bindLobbyInput` listener (`input.ts:65`) → `keyToAction(ev.key)` → on move: `onMove(moveSelection(getIndex(), getCount(), getColumns(), dir))` (live closure read, `input.ts:70`); on Enter: `onLaunch(getIndex())` → `main.ts` → `launchGame(GAMES[index], navigate)` → `navigate` sets `window.location.href = launchUrl`. **Safe:** launch target is static `GAMES` registry data (not user input), `undefined` game is a no-op (`input.ts:36`), `preventDefault` is scoped to handled keys only (`input.ts:67-68`).

**Pattern observed:** Clean core/shell split — pure grid maths in `core/selection.ts` (DOM-free, fully unit-tested), keyboard/launch in `shell/input.ts` with navigation injected for testability. Single source of truth for column count via `grid.ts:defaultColumns` shared by render and cursor (`grid.ts:42-44`). Matches the lobby/games convention.

**Error handling:** `font.ts` catch → `console.warn` + `return false` is the documented best-effort font fallback (not a silent failure); `moveSelection` clamps out-of-range index and non-positive columns; `count<=0` returns 0; `launchGame(undefined)` no-ops. Evidence: `selection.ts:26-28`, `input.ts:36`.

**Subagent dispatch:** `[EDGE]` (disabled — manually checked: boundaries safe), `[SILENT]` (disabled — manually checked: only fallback warn), `[TEST]` (3 LOW residuals, all round-1 blockers verified fixed), `[DOC]` (disabled — round-1 `glowText` contract fold confirmed in JSDoc), `[TYPE]` (disabled — `Readonly<Game>` fix confirmed), `[SEC]` (disabled — manually checked: clean), `[SIMPLE]` (disabled — `UI_FONT_FAMILY` fold confirmed), `[RULE]` (1 LOW: undocumented test-stub cast).

**Residual findings (all LOW, non-blocking — captured as delivery findings, not gating):**

| Severity | Issue | Location |
|----------|-------|----------|
| [LOW] `[TEST][RULE]` | `as unknown as Event` test-stub cast lacks the justifying comment the project convention requires | `tests/input.test.ts:57` |
| [LOW] `[TEST]` | `drawTile` not unit-tested directly with `selected=true` (covered via `drawTiles`) | `tests/tiles.test.ts` |
| [LOW] `[TEST]` | No negative cross-branch assertions (`onLaunch` not-called on move / `onMove` not-called on Enter); live-index test fires once | `tests/input.test.ts` |

**Handoff:** To SM (Winston Smith) for finish-story.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-28T11:42:03Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T10:47:31Z | 2026-06-28T10:49:44Z | 2m 13s |
| implement | 2026-06-28T10:49:44Z | 2026-06-28T11:05:45Z | 16m 1s |
| review | 2026-06-28T11:05:45Z | 2026-06-28T11:23:51Z | 18m 6s |
| implement | 2026-06-28T11:23:51Z | 2026-06-28T11:27:53Z | 4m 2s |
| review | 2026-06-28T11:27:53Z | 2026-06-28T11:42:03Z | 14m 10s |
| finish | 2026-06-28T11:42:03Z | - | - |

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Improvement** (non-blocking): The lobby shows no on-screen hint that arrows move the cursor and Enter launches. Affects `lobby/src/main.ts` (a small "↕↔ SELECT · ENTER PLAY" prompt, in the games' marquee style, would help discoverability). Defer to a polish/attract story (7-6). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The selection highlight is only visually meaningful with 2+ tiles; the registry currently lists one game (tempest), so the cursor always sits on it. Affects `lobby/src/core/registry.ts` (nothing to change now) — the wrapping/highlight is proven by unit tests and will differentiate once 7-5+ register more games. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): Pre-existing `canvas.getContext('2d')!` non-null assertion can throw an unguarded TypeError if a 2D context is refused. Affects `lobby/src/main.ts:15` (guard with an explicit `if (!ctx) throw new Error(...)`). Predates 7-4; out of scope for this story. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tsconfig.json skipLibCheck:true` is flagged by the TS checklist but is standard for Vite; revisit only if dependency type errors are suspected. Affects `lobby/tsconfig.json:10`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test stub cast `ev as unknown as Event` lacks the justifying comment the project established at `render.test.ts:88-94` for the same double-cast pattern. Affects `lobby/tests/input.test.ts:57` (add a one-line comment noting the stub provides only `.key`/`.preventDefault`, the fields the handler reads). *Found by Reviewer during round-2 code review.*
- **Improvement** (non-blocking): `drawTile` is not unit-tested directly with `selected=true` (the selected branch is covered only transitively via the `drawTiles` suite). Affects `lobby/tests/tiles.test.ts` (a direct `drawTile(ctx, rect, game, true)` test mirroring the `blur===24`/`width===4` pin would localise regressions). *Found by Reviewer during round-2 code review.*
- **Improvement** (non-blocking): `bindLobbyInput` tests lack negative cross-branch assertions (`onLaunch` not-called on a move, `onMove` not-called on Enter); the live-index test fires once so it proves event-time read but not per-press re-read. Affects `lobby/tests/input.test.ts` (one-line `.not.toHaveBeenCalled()` assertions). *Found by Reviewer during round-2 code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Split the input module into a pure core unit + a shell unit**
  - Spec source: .session/7-4-session.md, Technical Approach → "Add input state module (`src/core/input.ts` or similar)"
  - Spec text: "Add input state module (src/core/input.ts or similar): Track selected game index ... Provide movement + launch dispatch functions"
  - Implementation: Pure grid-navigation maths went in `src/core/selection.ts` (`moveSelection`, DOM-free, fully unit-tested); the keyboard mapping, launch dispatch, and `keydown` binding went in `src/shell/input.ts`. Kept the core/shell boundary the rest of the lobby (and the games) follow — keyboard/`window` is a shell concern, grid maths is a core concern.
  - Rationale: The approach said "or similar". Putting `window`/keyboard code in `core/` would break the lobby's pure-core convention; splitting keeps the navigation maths unit-testable without a DOM.
  - Severity: trivial
  - Forward impact: none — both are new modules; no sibling story depends on a specific filename.

- **Grid-aware wrap with partial-row awareness (resolves SM's open question)**
  - Spec source: .session/7-4-session.md, Acceptance Criteria → "Cursor wraps at grid edges"; SM Assessment open question on wrap semantics
  - Spec text: "Cursor wraps at grid edges (wraps right → left at row end, etc.)"
  - Implementation: Left/right wrap within the current row; up/down wrap within the current column. A column with no cell in a short final row has a shorter wrap cycle, so the cursor never lands on an empty cell. Selection uses the SAME column count as the render via the new shared `defaultColumns()`.
  - Rationale: This is the natural arcade-grid behaviour and matches the row-major layout `tileGrid` already produces. The current registry has one game, so this is forward-looking but proven by `tests/selection.test.ts` (2×2 and partial 5-in-3 grids).
  - Severity: minor
  - Forward impact: minor — later stories that add games (7-5+) inherit correct wrapping for free.

- **Added the shared "Vector Battle" font treatment to the lobby (user-directed, beyond 7-4 scope)**
  - Spec source: User request in chat ("we should be using the font and treatment from the games — look at tempest and star wars")
  - Spec text: "quick fix while we are here, we should be using the font and treatment from the games"
  - Implementation: Shipped `public/fonts/VectorBattle-e9XO.ttf` + `Readme.txt` (freeware license, copied unmodified from tempest); added `src/shell/font.ts` (`loadVectorFont`, lobby-owned copy of the games' loader — visual language shared, not code, per CLAUDE.md); switched `main.ts` font strings to `'Vector Battle', 'Orbitron', monospace`; added caps + ~0.1em letter-spacing tracking to `render.ts` `glowText` (matching tempest/star-wars); `main.ts` repaints once the font loads. Added `vite/client` to `tsconfig.json` types for `import.meta.env` (matching tempest).
  - Rationale: User explicitly requested it this session; user instructions are the highest authority. Folded into this branch as it's small and touches the same lobby render path.
  - Severity: minor
  - Forward impact: minor — establishes the lobby's typography; future lobby text inherits the treatment. Reviewer should expect font assets + render.ts changes in a story titled "tile selection and launch" for this reason.

### Reviewer (audit)

- **Split the input module into a pure core unit + a shell unit** → ✓ ACCEPTED by Reviewer: correct call — keeps `core/` pure (verified zero DOM imports in selection.ts), respects the project's hard core/shell boundary. Agrees with author reasoning.
- **Grid-aware wrap with partial-row awareness** → ✓ ACCEPTED by Reviewer: the design is sound and the maths is correct (I re-derived all six untested partial-row cases — every result lands on a populated cell). The *implementation* is accepted; the REJECT is purely about pinning these branches in tests, not about the approach.
- **Added the shared "Vector Battle" font treatment (user-directed)** → ✓ ACCEPTED by Reviewer: user-directed (highest authority), faithfully mirrors tempest/star-wars (caps + ~0.1em tracking, lobby-owned loader, no cross-repo import, license shipped). Two non-blocking nits surfaced (dead `UI_FONT_FAMILY` export, `glowText` letterSpacing contract) are folded into the rework, not a rejection of the deviation.