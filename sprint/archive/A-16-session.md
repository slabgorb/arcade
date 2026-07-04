---
story_id: "A-16"
jira_key: "A-16"
epic: "A"
workflow: "tdd"
---
# Story A-16: Attract mode + start/game-over/high-score + lobby high-score wiring

## Story Details
- **ID:** A-16
- **Jira Key:** A-16
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T02:31:06Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T01:21:25Z | 2026-07-04T01:23:18Z | 1m 53s |
| red | 2026-07-04T01:23:18Z | 2026-07-04T01:45:37Z | 22m 19s |
| green | 2026-07-04T01:45:37Z | 2026-07-04T02:01:08Z | 15m 31s |
| review | 2026-07-04T02:01:08Z | 2026-07-04T02:18:46Z | 17m 38s |
| red | 2026-07-04T02:18:46Z | 2026-07-04T02:26:19Z | 7m 33s |
| green | 2026-07-04T02:26:19Z | 2026-07-04T02:29:23Z | 3m 4s |
| review | 2026-07-04T02:29:23Z | 2026-07-04T02:31:06Z | 1m 43s |
| finish | 2026-07-04T02:31:06Z | - | - |

## Story Context

**Reference:** `sprint/context/context-story-A-16.md`

### Technical Approach

**Attract Mode & Game Loop States:**
- Attract mode is the idle state: a looping demo of previous gameplay (or scripted sequence)
- Start button (SPACE) transitions from attract → playing
- Game-over occurs when ship is destroyed (lives reach 0) — see scoping note below
- Game-over flow shows high-score entry prompt (if score qualifies) then returns to attract

**Game States (Mode machine):**
- `'attract'` — lobby or idle loop demo
- `'playing'` — active game
- `'game-over'` — score-entry state or returning to attract after game ends

**High-Score Table Contract (mirrored from Tempest):**
- Type: `HighScoreEntry` with `{ name: string, score: number, level: number, date?: string }`
- Storage: `localStorage['asteroids-high-scores']` as JSON-serialized `HighScoreEntry[]`
- Persistence seam: shell-side reads/writes localStorage; core types live in core/
- Lobby wiring: `lobby/src/shell/storage.ts` reads `getTopScore('asteroids')` from the key `'asteroids-high-scores'`
- Entry qualification: `qualifiesForHighScore(table, score)` — non-positive scores never qualify; full board requires strict beat of lowest entry

**Scoping & Forward Compatibility:**
- **Lives/respawn (A-15) NOT YET IMPLEMENTED** — A-16 must not depend on lives/safe-respawn logic. Approach: either:
  - Stub `lives` as 0 (game-over on first ship destruction) to isolate attract/start/game-over flow, OR
  - Wait for A-15 to land and inherit the lives contract cleanly
  - **Chosen:** Stub lives as 1 (one play per attract cycle) so attract/start/game-over flow is testable; A-15 will extend respawn logic later
- **Small saucer / hyperspace (A-12, A-14) NOT YET IMPLEMENTED** — Attract mode demo may only use large-rock-only waves; on playtest, if the demo stalls, add a wave-skip counter

**Key Files:**
- `core/highscore.ts` (new) — types (`HighScoreEntry`, `HighScoreTable`) and helpers (`qualifiesForHighScore`, `insertHighScore`)
- `core/state.ts` — add `mode: 'attract' | 'playing' | 'game-over'` + `highScoreTable: HighScoreEntry[]` + `playerName: string` (3 chars)
- `shell/storage.ts` (new) — `saveHighScoreTable(table)` → localStorage; `loadHighScoreTable()` → table
- `shell/input.ts` — wire SPACE in attract mode to start game
- `shell/loop.ts` — advance game-over state machine (name entry, confirm, return to attract)
- Lobby registry: `'asteroids'` game ID already registered (`lobby/src/core/registry.ts`)

**Determinism Boundary:**
- Core game loop is deterministic (all randomness via `state.rng`); mode transitions are deterministic given input
- High-score table operations (qualify, insert, sort) are deterministic
- localStorage read/write is NOT deterministic — happens at shell boundary only, never in core test snapshot

### Acceptance Criteria

- Game starts in attract mode; SPACE starts a game
- Game-over triggered when ship is destroyed (lives go to 0 after respawn — currently stubbed, A-15 extends)
- Game-over UI shows score; if qualifying, prompts for 3-char initials
- High-score entry inserted into table (desc by score), truncated to MAX_HIGH_SCORES
- Table persisted to `localStorage['asteroids-high-scores']` as JSON array of `HighScoreEntry`
- Lobby reads top score via `getTopScore('asteroids')` and displays on tile (no changes to lobby code in A-16 — registry already wired)
- Determinism: identical seed + input script + dt → deeply-equal `GameState` (mode/table/name only differ in input-driven changes)
- Attract mode demo plays previous best game or a scripted sequence (deterministic, looped)
- Return to attract after game-over completes (high-score entry + return button)
- Build clean, tests green

## Sm Assessment

**Setup verdict: READY for red phase (TEA).**

- **Jira:** Explicitly skipped — this project has no Jira; tracking is local sprint YAML. `jira_key` mirrors the story id (`A-16`) for archive naming.
- **Story context:** Written with technical approach, key files, determinism boundary, and 10 acceptance criteria (above, plus `sprint/context/context-story-A-16.md`).
- **Branch:** `feat/A-16-attract-mode-highscore` created in `asteroids/` from `origin/develop` (gitflow; PR will target `develop`). The checkout was previously parked on `feat/A-render-gap-playfield-entities` — the story branch was deliberately cut from origin/develop, not that branch.
- **Merge gate:** No open PRs in asteroids; gate clear.
- **Sequencing judgment:** A-12–A-15 remain in backlog; A-16 taken ahead at user direction. Lives stubbed to 1 so the mode machine (attract → playing → game-over → attract) is testable without A-15's respawn contract. A-15 extends, does not rework.
- **Tooling anomaly (for the record):** `pf sprint story field a-16 repos` returned `pennyfarthing`; epic-A.yaml says `asteroids`. YAML treated as authoritative. The field lookup is misreporting `repos` and returning null for `title`/`points` — worth a pf bug ticket.
- **Routing:** Workflow `tdd` is phased → next agent **tea** (red phase).

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point feature story: new core mode machine, new core/shell modules, cross-repo persistence contract.

**Spec authority note:** The enriched `context-story-A-16.md` and `context-epic-A.md` were found clobbered by sm-setup's auto-generation and were restored from git (`ed63ba2`) before test design. The restored Architect-enriched context is the spec of record; where the session's auto-generated Technical Approach conflicted with it (mode union spelling `'gameover'` not `'game-over'`; lobby registry work; `gameOver` nested field vs a `playerName` top-level field), the restored context + the actual code won.

**Test Files:**
- `tests/highscore.table.test.ts` (new) — pure table helpers port (star-wars mirror): MAX_HIGH_SCORES=10, strict qualify boundaries, tie-after-equals insert, truncation, purity. RED via module-load failure until `src/core/highscore.ts` exists.
- `tests/storage.test.ts` (new) — localStorage seam port, key pinned `'asteroids-high-scores'`; corrupt/missing/quota/throwing-storage degradation; per-entry validation guard; `readonly` save parameter (source-text + frozen-input); lobby `Math.max`-over-scores contract cross-check. RED via module-load failure until `src/shell/storage.ts` exists.
- `tests/modes.test.ts` (new) — the mode machine through existing imports (granular REDs): boot framing fields; attract rocks-drift == `updateRocks` reuse-pin; attract inert to all held gameplay inputs; start → fresh game from `initialState` defaults WITHOUT rng re-seed; start inert during play; gameover entry stub (destroyed + no lives → same-step `'gameover'`, `gameOver` phase initialized, qualifies semantics incl. full-board tie rejection); non-qualifying countdown → attract, phase cleared, initials/table untouched; purity off the happy path.
- `tests/framing.test.ts` (new) — `enterInitial(state, char)` capture rules (uppercase, A–Z only, cap 3, inert outside qualifying gameover, pure); confirm via `input.start` with exactly 3 initials → `insertHighScore` + return to attract; core-built entry carries NO `date` (core purity); edge-triggered start across the confirm transition; full-cycle determinism replay. RED via missing exports (`enterInitial`, `STARTING_LIVES`).
- `tests/render-hud.test.ts` (new) — HUD mechanisms via a Proxy ctx recorder: 6-digit score text (`formatScore`), high-score slot incl. live running max (beaten table top must vanish), lives-icon geometry delta, attract START prompt (cycle-sampled), GAME OVER / initials-prompt / typed-echo overlays, render never mutates framing state. Layout/glow remain eyeball criteria per the A-5 epic guardrail.
- `tests/font.test.ts` (new) — `UI_FONT_FAMILY === 'Vector Battle'`; `loadVectorFont()` resolves false gracefully in node; vendored `.ttf` + licence readme exist under `public/fonts/`. RED via module-load failure until `src/shell/font.ts` exists.
- `tests/input.test.ts` (edited) — `NO_INPUT`/field-set pins extended to six controls (`start` added; still all-boolean, all-false).

**Tests Written:** 39 failing across 7 files (plus a handful of already-green regression pins, e.g. saucer/wave directors already gate on `mode === 'playing'`). All 8 context ACs covered except: AC-7 lobby registry (pre-satisfied — see findings) and the build/test-green AC (a GREEN-phase outcome).
**Status:** RED (verified by testing-runner, RUN_ID A-16-tea-red: 39 failed / 342 passed, **zero regressions in the 15 pre-existing suites**). Committed as `562dc3f` on `feat/A-16-attract-mode-highscore`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety (no `as T` on parse; guards validate) | storage per-entry validation guard suite | failing (RED) |
| #2 readonly params | `saveHighScores — readonly parameter` (signature regex + frozen input) | failing (RED) |
| #4 null/undefined | `gameOver: null` handling pins (modes/framing); storage absent/undefined paths | failing (RED) |
| #8 test quality | self-check pass: no `as any`; casts confined to Storage/ctx stubs (star-wars precedent) + documented `Framed*` contract shims | done |
| #10 input validation | JSON.parse runtime-validation suite (corrupt/non-array/malformed rows) | failing (RED) |
| #11 error handling | storage never-throws suite (quota, throwing localStorage) | failing (RED) |
| core purity (repo rule, `core-boundary.test.ts`) | auto-covers new `core/highscore.ts`; plus the no-`date`-from-core pin | enforced |

**Rules checked:** 6 of 13 lang-review checks applicable have direct coverage; #3/#5/#6/#7/#9/#12 not applicable to this diff (no enums, no new module/re-export patterns, no React, `loadVectorFont`'s async seam covered, no config changes, no bundle-affecting imports).
**Self-check:** 0 vacuous tests; every "impossible" fixture carries a guard-the-guard assertion (advanced-rng ≠ boot-rng; rocks actually moved; scores array non-empty).

**Handoff:** To Julia (Dev) for GREEN. Implementation worklist implied by the suites: `core/highscore.ts` (port), `core/input.ts` (`start`), `core/state.ts` (`gameOver`, `highScoreTable`, `STARTING_LIVES`, a start-edge latch à la `firePrev`), `core/sim.ts` (mode dispatch + `enterInitial` export), `shell/storage.ts` (port, new key), `shell/font.ts` (port) + vendored `public/fonts/`, `shell/render.ts` HUD/overlays, `shell/input.ts` (start + initials keydown wiring), `src/main.ts` (REMOVE the provisional boot-into-play shim at line 42, load table at boot, persist on change).

### TEA Rework Assessment (review round 1)

**Trigger:** Reviewer REJECTED — [HIGH] terminal-death gap + 3 MEDIUM + 6 LOW (see Reviewer Assessment).

**Rework pins (commit `87bc67f`, RUN_ID A-16-tea-red-rework1 — 432 passed / 4 failed, targeted RED verified, zero collateral):**
- RED (Dev must fix): `modes.test.ts` "ends the run even with bonus ships in reserve" → terminal-death stub in `sim.ts` (any destruction edge in play → gameover, lives forfeited to 0; the `lives > 0` guard's decrement-and-stay branch goes); `highscore.table.test.ts` readonly source-signature pin → widen `qualifiesForHighScore`/`insertHighScore` params to `readonly HighScoreEntry[]`; `storage.test.ts` ×2 non-finite pins → add `Number.isFinite` for `score` and `wave` in `isHighScoreEntry`.
- Passing pins (regression guards): qualifying game-over holds phase unchanged across idle ticks (wait-forever contract); attract page-cycle discriminated with a non-empty board (START page tick<240, HIGH SCORES page tick≥240 with entries listed, prompt absent); exact `'AC_'` echo; `enterInitial('ab')` no-op.
- Cleanup applied (review [LOW]): local `GameOverPhase`/`Entry`/`FramedState`/`FramedInput` shims replaced with real `core/state` + `core/highscore` type imports across modes/framing/render-hud suites.
- Left to Dev (non-test): `LIFE_ICON_H/W/GAP` provisional marker comment in `render.ts` (review [LOW] — comment-only).

**Status:** RED (4 targeted failures). **Handoff:** Julia (Dev) for rework GREEN.

## Dev Rework Assessment (review round 1)

**Implementation Complete:** Yes — all four review fixes applied (commit `e03f200`, pushed):
- `src/core/sim.ts` — terminal-death stub: any destruction edge during play ends the run (mode → 'gameover', reserves forfeit to 0); the decrement-and-continue branch is gone. Legacy lives-0 fixtures still latch without a mode change.
- `src/core/highscore.ts` — `qualifiesForHighScore`/`insertHighScore` now take `readonly HighScoreEntry[]` (lang-review #2, matching `saveHighScores`' enforced convention).
- `src/shell/storage.ts` — `isHighScoreEntry` requires `Number.isFinite` on `score` and `wave` (a `1e999` poisoned row is dropped; same standard as the lobby's `scoreOf`).
- `src/shell/render.ts` — `LIFE_ICON_H/W/GAP` carry their `verify vs quarry (A-17)` marker.

**Tests:** 436/436 passing (testing-runner RUN_ID A-16-dev-green-rework1); all four former-RED pins green; zero regressions; `tsc --noEmit && vite build` clean.
**Process note:** one commit was accidentally made at the orchestrator root (wrong repo — its `git add -A` swept only pf-runtime noise + the sprint YAML verdict line); push was rejected by the remote and the commit was reset, restoring both files as ordinary unstaged working state. Asteroids fixes were then committed in the correct repo. No orchestrator history was published.
**Branch:** `feat/A-16-attract-mode-highscore` (pushed through `e03f200`).

**Handoff:** To The Thought Police (Reviewer) for re-review.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/highscore.ts` (new) — table types + `qualifiesForHighScore`/`insertHighScore`, ported near-verbatim from star-wars (asteroids already uses `wave`)
- `src/core/input.ts` — `start: boolean` added to `Input`/`NO_INPUT` (the story's one new input field)
- `src/core/state.ts` — `STARTING_LIVES` (stub 1, `verify vs quarry (A-15)`), `GameOverPhase`, and three GameState fields: `startPrev` (edge latch), `gameOver`, `highScoreTable`; initialState defaults
- `src/core/sim.ts` — mode dispatch: `stepAttract` (rocks drift via the same `updateRocks`, everything else inert; fresh game from `initialState()` defaults on a start edge, rng stream continued), `stepGameOver` (qualifying hold-for-initials + confirm-insert; non-qualifying `GAME_OVER_DISPLAY_S` countdown), death seam stub on the destruction edge guarded by `lives > 0` (legacy lives-0 fixtures keep the old sticky-latch behaviour), `enterInitial` pure event function
- `src/shell/storage.ts` (new) — localStorage seam under `'asteroids-high-scores'` (the lobby's derived key), ported from star-wars
- `src/shell/font.ts` (new) + `public/fonts/` — Vector Battle vendored with its licence readme, per the licence's redistribution term
- `src/shell/render.ts` — first HUD (6-digit score, running high = max(board top, live score), mini-ship life icons), attract overlay (ASTEROIDS / PUSH START paged with the high-score board every 240 ticks), GAME OVER + initials-entry overlays (`AC_`-style echo); ship not drawn in attract
- `src/main.ts` — provisional force-play boot shim REMOVED; board loaded at boot into core state, persisted on reference change (insert returns a new array); letters wired to `enterInitial`; `loadVectorFont()` kicked off
- `src/shell/input.ts` — `start: ['Enter', 'Space']` (Space safely doubles as fire — each is mode-gated in the sim)
- `tests/render.test.ts` / `tests/render-wiring.test.ts` — sanctioned infrastructure updates only (see deviations)

**Tests:** 428/428 passing (GREEN, testing-runner RUN_ID A-16-dev-green) — all 7 A-16 suites green, zero regressions in the 15 pre-existing suites. `npm run build` (tsc --noEmit && vite build) clean.
**Cross-repo AC:** lobby untouched (registry entry pre-existed); lobby `npm test` 21/21 + build clean, re-verified after implementation.
**Eyeball check (epic A-5 guardrail):** dev server on the pinned :5275 (this checkout owns it) driven via Playwright — attract screen shows the glowing ASTEROIDS banner in the loaded Vector Battle face, PUSH START, HUD zeros, no ship; a start press deals a fresh game: ship centred nose-up, one life icon, wave-1 rocks spawning after the 2s delay. Screenshots reviewed and discarded.
**Branch:** `feat/A-16-attract-mode-highscore` (pushed; commits `562dc3f` tests, `5801097` lint fix, `0cc130b` implementation)

**Handoff:** To next phase per workflow (verify/review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all mechanical gates pass (428/428 + lobby 21/21, builds clean, tree clean/synced, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own analysis (death-with-reserves dead-end, qualifying-freeze, NaN/Infinity guard hole; see assessment) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: the 4 `catch {}` in storage.ts and font.ts's catch are deliberate, documented degradation paths (each logs or returns a safe value); no swallowed errors found |
| 4 | reviewer-test-analyzer | Yes | findings | 9 | confirmed 7, dismissed 1, deferred 1 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: comments dense and accurate; one gap folded into findings (LIFE_ICON_* missing provisional callout) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker #1/#2 (readonly params, double-casts) and own review of the GameOverPhase/Mode design |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: no network/auth/tenancy surface; canvas fillText only (no innerHTML/XSS); initials constrained to ≤3 A–Z chars; JSON.parse validated per row (one looseness → LOW finding: Infinity/NaN scores pass the guard) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: no dead code added; one leftover-scaffolding note folded into findings (post-GREEN type shims) |
| 9 | reviewer-rule-checker | Yes | findings | 12 | confirmed 6 (merged to 4 items), dismissed 4 (out-of-scope: render-gap PR #9 code, 0 added lines vs origin/develop), deferred 2 (merged duplicates of #1 into #8) |

**All received:** Yes (3 enabled returned — 1 clean, 2 with findings; 6 disabled via settings and self-assessed)
**Total findings:** 13 confirmed (after merging duplicates), 5 dismissed (with rationale), 3 deferred

**Scope correction applied to subagent inputs:** local `develop` was stale (tip A-11 `7f445d4`); the branch base is `origin/develop` at `95475e5` (render-gap PR #9, already merged upstream). Subagents therefore saw render-gap's already-reviewed code in their diff. All findings were re-checked against `git diff origin/develop...HEAD` (1880 insertions): the rule-checker's A5 flags on `ROCK_OUTLINE_SCALE`/`ROCK_VARIANTS`/`BULLET_RADIUS`/`SAUCER_*` add zero lines in A-16's true diff and are dismissed as out-of-scope (forward-carried as a Delivery Finding); `LIFE_ICON_*` is genuinely A-16's. Local develop has been fast-forwarded to `95475e5`.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` #1–#13 + repo architecture rules (core purity A1–A6). Exhaustive enumeration by reviewer-rule-checker (61 constructs), spot-verified by Reviewer:

| Rule | Constructs checked | Verdict |
|------|--------------------|---------|
| #1 type-safety escapes | 8 (isHighScoreEntry predicate, `as Record<string,unknown>` narrowing, 2 new test double-casts, 0 `as any`/`@ts-ignore`) | 2 violations — `as unknown as Storage` (tests/storage.test.ts:74), `as unknown as CanvasRenderingContext2D` (tests/render-hud.test.ts:69). CONFIRMED at LOW: lib.dom `Storage`/ctx interfaces cannot be structurally satisfied by literals (index signature / 60+ members); identical casts are the established repo + star-wars/tempest test-stub precedent (render.test.ts:76 pre-existing); confined to test harnesses, behaviour fully validated. Rule-matching → not dismissed, downgraded with this rationale. |
| #2 generic/interface | 6 array-param sites | 2 violations — `qualifiesForHighScore`/`insertHighScore` take mutable `HighScoreTable` yet never mutate (insert copies via `.slice()`, highscore.ts:41). The SAME diff's `saveHighScores(table: readonly HighScoreEntry[])` (storage.ts) proves the project convention, with a test enforcing the keyword. CONFIRMED MEDIUM — fix in rework. |
| #3 enums | 0 (Mode stays a string union) | N/A |
| #4 null/undefined | 3 (`highScoreTable[0]?.score ?? 0` render.ts — correct `??`) | compliant |
| #5 modules | 7 files' imports (`import type` correct throughout) | compliant |
| #6 React/JSX | 0 | N/A |
| #7 async | 3 (`loadVectorFont(): Promise<boolean>`, `void` fire-and-forget, degradation catch) | compliant |
| #8 test quality | 5 | 2 violations = the same double-casts as #1 (merged) |
| #9 build/config | 0 changed | N/A |
| #10 input validation | 2 (`JSON.parse` → `unknown` + per-row guard; `enterInitial` regex-validated) | compliant — with one looseness found by Reviewer: `isHighScoreEntry` accepts `Infinity`/`NaN` scores (`typeof === 'number'`), where the lobby's `scoreOf` requires `Number.isFinite`. LOW finding. |
| #11 error handling | 5 catches | compliant (documented degradation paths) |
| #12 perf/bundle | 1 (`JSON.stringify` behind reference-identity guard, main.ts) | compliant |
| #13 fix-regressions | 1 (commit 5801097) | compliant |
| A1–A4, A6 core purity/boundary/direction | all core+shell files | compliant — rng cloned `{seed}` (sim.ts:46,77,131), no mutation (structuredClone pins), no shell imports in core, renderer read-only, shell→core only |
| A5 provisional markers | 3 in-scope constants/groups | 1 violation — `LIFE_ICON_H/W/GAP` (render.ts:51-54) carry no provisional callout/marker; `GAME_OVER_DISPLAY_S` + `ATTRACT_CYCLE_TICKS` + `STARTING_LIVES` all correctly marked. (Four further A5 flags dismissed as out-of-scope render-gap code.) |

### Devil's Advocate

Assume this code is broken; argue it. The strongest attack: **the best players never reach the high-score board this story exists to ship.** Cross 10,000 points — wave four or five of routine play, one bonus ship earned — then die. `sim.ts:194`'s `lives > 0` guard decrements 2→1, no gameover fires, and A-15's respawn doesn't exist: the ship is now invisible (render gates on `shipDestroyed`), immortal (collision gates on `!shipDestroyed`), and still steering an empty HUD forever. The run can never end, so `qualifiesForHighScore` is never consulted; the initials screen — the marquee feature — is unreachable for precisely the runs good enough to chart. Empirically confirmed: 600 idle ticks, state frozen in `playing`. A weaker player (sub-10k, one life) sees the feature work; a strong one files a bug.

Second attack: park the cabinet. Earn a qualifying score, walk away. The qualifying branch never ticks `displayTimer` (`sim.ts:83-99` returns before the countdown), so the machine displays ENTER YOUR INITIALS until the heat-death of the browser tab; the real ROM times out and banks a default. Nothing pins this frozen-timer contract either — a future refactor could regress it invisibly.

Third: poison the storage. `localStorage['asteroids-high-scores'] = '[{"name":"XXX","score":1e999,"wave":1}]'` — `1e999` parses to `Infinity`, `typeof Infinity === 'number'`, the row passes `isHighScoreEntry`, the HUD prints `Infinity` via `formatScore`, and no legitimate score ever qualifies again (nothing beats `Infinity`); the lobby, stricter (`Number.isFinite`), quietly disagrees about the same bytes. An unsorted tampered table likewise breaks the qualify boundary's lowest-is-last precondition. Cosmetic-to-annoying, same-origin only — but the guard is demonstrably looser than its sibling.

Also probed and survived: held-Enter from boot (edge latch consumes it once); typing WASD letters during initials (gameplay inputs inert in gameover); double-tab writes (last-write-wins, validated on read); quota-full, private browsing, throwing storage (degradation suite); dt spikes (fixed-timestep loop). The first two attacks yielded the review's blocking and near-blocking findings.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [EDGE] | Death with a bonus ship in reserve never ends the run: `lives > 0` guard decrements but A-15's respawn doesn't exist → invisible, immortal ship; game-over and high-score capture unreachable for any run ≥ 10,000 points (routine for a competent player). Empirically confirmed (600-tick freeze). | `src/core/sim.ts:194` | Terminal-death stub: while respawn is unbuilt, ANY destruction edge in `playing` enters `'gameover'` (reserves forfeit; A-15 replaces this branch with decrement + safe-respawn). TEA pins the lives>1 death contract; Dev applies. |
| [MEDIUM] [TEST] | Attract-overlay cycle test short-circuits through the empty-table guard — the page-cycling arithmetic and the HIGH SCORES page are entirely unpinned. | `tests/render-hud.test.ts:134` | Non-empty-table fixture asserting START page at tick < 240 and HIGH SCORES page at tick ≥ 240. |
| [MEDIUM] [EDGE] [TEST] | Qualifying game-over waits forever with no timeout (ROM times out) and the frozen-`displayTimer` contract is unpinned — a regression could silently break either way. | `src/core/sim.ts:83-99`, `tests/framing.test.ts` | Pin the deliberate wait-forever contract (idle ticks → phase unchanged); ROM timeout forward-carried to A-17/A-18 polish (Delivery Finding). |
| [MEDIUM] [RULE] [TYPE] | `qualifiesForHighScore`/`insertHighScore` take mutable `HighScoreTable` yet never mutate — violates lang-review #2; the same diff's `saveHighScores` shows the convention (`readonly HighScoreEntry[]` + enforcing test). | `src/core/highscore.ts:33,43` | Widen both params to `readonly HighScoreEntry[]`; mirror the source-signature test if desired. |
| [LOW] [SEC] | `isHighScoreEntry` accepts `Infinity`/`NaN` scores (`typeof === 'number'`); lobby's `scoreOf` requires `Number.isFinite` for the same rows — a poisoned table renders "Infinity" and locks out all future qualifiers. | `src/shell/storage.ts:27` | Add `Number.isFinite(entry.score)` (and `wave`) to the guard + one poisoned-row test. |
| [LOW] [TEST] | Initials-echo assertion is a bare `'AC'` substring over all frame text — passes for the right reason today, fragile to any future text containing "AC". | `tests/render-hud.test.ts:179` | Assert the exact echo `'AC_'` (pins the underscore padding too). |
| [LOW] [TEST] [SIMPLE] | Post-GREEN leftovers: triplicated `GameOverPhase`/`Entry` shims (real types now exported) and the no-op `FramedInput` alias. | `tests/modes.test.ts:46`, `tests/framing.test.ts`, `tests/render-hud.test.ts` | Import `GameOverPhase` from `core/state` and `HighScoreEntry` from `core/highscore`; drop `FramedInput`. |
| [LOW] [RULE] [DOC] | `LIFE_ICON_H/W/GAP` carry no provisional callout — A-17's marker-grep swap worklist would miss them. | `src/shell/render.ts:51-54` | Add `verify vs quarry (A-17)` (glyph = ROM ship shape; size/feel → A-19). |
| [LOW] [TEST] | `enterInitial` multi-char input (silent no-op via the `/^[a-zA-Z]$/` guard) unpinned. | `tests/framing.test.ts:90` | One-line pin: `enterInitial(s, 'ab')` → unchanged. |
| [LOW] [RULE] | Test-stub double-casts (`as unknown as Storage`/`ctx`) match lang-review #1's flagged pattern. | `tests/storage.test.ts:74`, `tests/render-hud.test.ts:69` | Confirmed at LOW with rationale (DOM interfaces unsatisfiable by literals; repo-wide precedent; test-confined). No change required; noted for the record. |

**Observations (verified good, with evidence):**
- [VERIFIED] Core purity holds across the new mode machine — `sim.ts:46,77,131` clone rng as `{seed}`; `structuredClone` purity pins in modes/framing suites; `core-boundary.test.ts` green over the new `highscore.ts`. Complies with rules A1–A3.
- [VERIFIED] Lobby contract intact end-to-end — `storage.ts:14` key `'asteroids-high-scores'` ≡ lobby `highScoreKey('asteroids')` (lobby/src/shell/storage.ts:18-20); registry entry pre-existing at lobby/src/core/registry.ts:27; lobby 21/21 + build green post-change. Complies with the cross-repo AC.
- [VERIFIED] Edge-triggered start — `sim.ts:123` + `startPrev` threading (sim.ts:55,63,78,219); held-press-across-confirm pinned in framing.test.ts. One Enter press cannot double-fire.
- [VERIFIED] Renderer stays read-only — no `state.*` writes in render.ts; snapshot pin in render-hud.test.ts; complies with rule A4. Good pattern: sim.ts:125-126 mode dispatch mirrors star-wars' framing structure.
- [VERIFIED] Storage degradation — quota/absent/throwing localStorage, corrupt/non-array JSON, per-row filtering all behaviourally pinned (tests/storage.test.ts); JSON.parse typed `unknown`, never `as T` (rule #10) — subject to the Infinity/NaN LOW above.
- [SILENT] (subagent disabled — own audit) All four `catch {}` blocks in storage.ts and font.ts's `catch (err)` are deliberate degradation paths that log or return safe defaults — no swallowed errors.
- [DOC] (subagent disabled — own audit) Comments dense and accurate throughout; the one documentation gap (LIFE_ICON marker) is in the severity table.

**Data flow traced:** keydown letter → `main.ts:50` (layout-aware `e.key`, regex-guarded) → `enterInitial` (mode/qualify/cap guards, sim.ts:111-118) → `gameOver.initials` → start press → confirm insert (sim.ts:84-96, new array) → main loop reference-identity persist (main.ts) → `localStorage['asteroids-high-scores']` → lobby `getTopScore('asteroids')` (Math.max over finite scores). Safe at every hop; no injection surface (name ≤ 3 chars A–Z, JSON.stringify escapes).
**Error handling:** verified above; failure modes degrade to `[]`/`false`/no-op, never throw (storage.test.ts suite).
**Security:** no network/auth/tenancy surface (tenant isolation N/A — client-only cabinet); no `innerHTML`; same-origin storage validated on read.
**Rework routing:** findings are testable (logic bug + missing pins) → review → red (O'Brien pins, Julia fixes).

**Handoff:** Back to TEA (red, rework) — pin the terminal-death stub, the qualifying-freeze contract, and the attract-cycle pages; then Dev applies the sim/guard/signature/marker fixes and the test cleanups.

### Re-review (round 2)

**Verdict:** APPROVED

Rework delta (`0cc130b..e03f200`, 9 files, +237/−147) inspected line-by-line; it contains exactly the prescribed fixes and test pins, nothing else. Finding-by-finding:

| Round-1 finding | Resolution | Evidence |
|---|---|---|
| [HIGH] death-with-reserves dead-end | RESOLVED — terminal-death stub: any destruction edge in play → `'gameover'`, reserves forfeit (`lives = 0`) | sim.ts:196-205; new modes pin "ends the run even with bonus ships in reserve" green |
| [MEDIUM] attract-cycle test short-circuit | RESOLVED — discriminating non-empty-board test pins both pages + the flip (START absent on board page) | render-hud.test.ts "cycles between the prompt page and the high-score board page" green |
| [MEDIUM] qualifying-freeze unpinned | RESOLVED — wait-forever contract pinned (300 idle ticks, phase deep-equal); ROM timeout forward-carried | framing.test.ts "holds the phase unchanged across idle ticks" green |
| [MEDIUM] readonly params (#2) | RESOLVED — both signatures `readonly HighScoreEntry[]`; frozen-input + source-regex enforcement | highscore.ts:33,43-46; both pins green |
| [LOW] Infinity/NaN guard | RESOLVED — `Number.isFinite` on score+wave, matching lobby's `scoreOf` | storage.ts:27-35; two poisoned-row pins green |
| [LOW] echo substring | RESOLVED — exact `'AC_'` pin | render-hud.test.ts |
| [LOW] post-GREEN shims | RESOLVED — real `core/state`/`core/highscore` type imports; `FramedState`/`FramedInput` gone | modes/framing/render-hud suites, tsc clean |
| [LOW] LIFE_ICON marker | RESOLVED — `verify vs quarry (A-17)` present | render.ts:49-51 |
| [LOW] `enterInitial` multi-char | RESOLVED — no-op pin added | framing.test.ts |
| [LOW] test double-casts | ACCEPTED AS-IS per round-1 rationale (no change required) | — |

**Verification:** testing-runner RUN_ID A-16-dev-green-rework1 — 436/436 across 22 files, all four former-RED pins now green, zero regressions; `tsc --noEmit && vite build` clean. No new findings in the delta (multiline-signature regex behaviour confirmed against the passing test; sorted-descending precondition comment still accurate; legacy lives-0 latch preserved — waves/score/collision suites green). Dev's wrong-repo commit incident was reset before any push landed (remote rejected it); no orchestrator history published — process note accepted.

**Data flow re-check:** unchanged from round 1 (letter → board → lobby) — the delta touches qualify/insert signatures and the guard, both re-verified at their hops.
**Deviation audit:** round-1 FLAGGED entry (death-seam guard) now resolved by the terminal-death deviation TEA logged in rework — stamped below.
**Handoff:** To Winston Smith (SM) for finish (PR + merge + archive).

## Delivery Findings

**Upstream findings from A-11 (saucer — finalized rework):**
- **Note** (non-blocking): Bullet cap and fire-cadence tests depend on the constant ratio `SAUCER_BULLET_LIFETIME (18) > SAUCER_FIRE_INTERVAL·frames (10)` for natural concurrency ≈ 2. If A-17 changes those constants, revisit both tests. *Found by Reviewer.*
- **Note** (non-blocking): All four REJECT findings from A-11's first review resolved in commit 109a66d; production code unchanged. *Found by Reviewer.*

**Upstream findings from A-10 (wave spawner — finalized):**
- **Improvement** (non-blocking): The `saucer === null` half of `updateWaveDirector`'s spawn gate is now pinned by a test. Dev MUST ensure the gate is implemented in GREEN. A-16's simulate-demo path (if it spawns waves) inherits this as a contract. Affects `core/waves.ts`. *Found by TEA.*
- **Improvement** (non-blocking): The 27-object guard covers rocks + ship only today. When saucer and any future entity joins the budget, extend the guard + test. Affects `core/waves.ts`. *Found by TEA.*

**Sequencing Context (user-directed story ahead of backlog):**
- A-12 through A-15 (small saucer, saucer scoring, hyperspace, lives/respawn) are in backlog; A-16 is taken ahead at user direction.
- A-16 attract/start/game-over must be scoped to **not depend on** unimplemented lives/respawn (A-15), OR **stub cleanly**.
- **Decision:** Stub lives as 1 (one play per session) so attract/start/game-over flow is isolated and testable; A-15 adds the respawn cycle later without reworking A-16's mode machine.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (blocking): `src/main.ts:42` boots straight into `'playing'` via a PROVISIONAL shim whose own comment says "A-16 replaces this". GREEN must remove it and boot plain `initialState()` (attract), or the attract ACs pass in unit tests while the shipped game never shows attract. Affects `src/main.ts` (delete shim; wire `loadHighScores()` into `state.highScoreTable` at boot, persist on table change, call `loadVectorFont()`). *Found by TEA during test design.*
- **Improvement** (non-blocking): The lobby registry ALREADY contains the asteroids entry (`lobby/src/core/registry.ts:27`, `#ff6a00`, landed with battlezone) — context AC-7's "one registry addition" is pre-satisfied; no lobby code change remains in A-16. Only the verification half survives: confirm lobby `npm run build`/`npm test` stay green. Affects `lobby/src/core/registry.ts` (nothing to change). *Found by TEA during test design.*
- **Gap** (non-blocking): At first boot the attract field is EMPTY — no rock-spawn source exists in attract (the wave director gates on `'playing'`, and the context explicitly scopes the demo to drifting *existing* rocks). The rocks backdrop only materializes after the first game ends and carries its field back to attract. If a populated boot-attract is wanted, that is a future scope call, not an A-16 test. Affects `core/waves.ts` (potential future attract seeding). *Found by TEA during test design.*
- **Question** (non-blocking): A-15 (lives/respawn), when it lands AFTER A-16, must replace the stub trigger — decrement + safe-respawn while `lives > 0`, keeping A-16's pinned edge (destroyed with no lives remaining → `'gameover'` same step, `gameOver` initialized). Tests deliberately pin only that edge so A-15 extends rather than reworks. Affects `core/sim.ts` (death seam). *Found by TEA during test design.*
- **Improvement** (non-blocking, process): sm-setup's `pf context create` OVERWROTE the Architect-enriched `context-story-A-16.md` (14KB → 800B stub) and `context-epic-A.md` (7KB → 540B); restored from `ed63ba2`. Separately `pf sprint story field a-16 repos` returns `pennyfarthing` and nulls for title/points. Affects `pf` toolchain (context create should refuse to clobber enriched files; story-field lookup misreports). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): The held-key sampling input model can drop a key tap shorter than one 60Hz frame — a synthetic Playwright `press` (down+up within ~5ms) missed the start button entirely; a 150ms human-scale hold works. All cabinets share this model; a latching controller (record keydown edges until the next `sample()`) would harden it. Affects `src/shell/input.ts` (latch press edges). *Found by Dev during implementation.*
- No other upstream findings during implementation.

### Reviewer (code review)

- **Question** (non-blocking): A-15 (lives/respawn) inherits the terminal-death stub this rework installs — it must replace "any death ends the run" with decrement + safe-respawn while reserves remain, keeping the lives-0 → gameover edge. The bonus-ship interaction (applyScore can raise lives mid-run) is the case its ACs must cover explicitly. Affects `src/core/sim.ts` (death seam). *Found by Reviewer during code review.*
- **Gap** (non-blocking): The qualifying game-over has no initials-entry timeout; the ROM banks a default after a fixed wait. Deliberate wait-forever is pinned in this rework; the ROM-faithful timeout belongs to A-17 (quarry timings) or A-18/A-19 polish. Affects `src/core/sim.ts` (gameover branch). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): render-gap PR #9's provisional constants (`ROCK_OUTLINE_SCALE`, `ROCK_VARIANTS`, `BULLET_RADIUS`, `SAUCER_*`) name A-17 in prose but omit the literal `verify vs quarry (A-17)` marker the swap-worklist greps for — out of A-16's diff scope, one-line comment fixes for whoever next touches `src/shell/render.ts`. A-17's "no marker remains" AC should also grep for orphaned prose-only "Provisional" mentions. Affects `asteroids/src/shell/render.ts` (marker comments). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `loadHighScores` trusts persisted row ORDER — `qualifiesForHighScore` assumes descending-sorted (lowest last), so a tampered/unsorted table mis-drives the full-board boundary. Shared, port-faithful trait of tempest, star-wars, AND asteroids; a defensive sort-on-load in all three would close it. Affects `{tempest,star-wars,asteroids}/src/shell/storage.ts` (sort after validation). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, process): Local `develop` in the asteroids checkout was stale (A-11), making `git diff develop...HEAD` include already-merged render-gap code — review subagents saw out-of-scope diff until re-based against `origin/develop`. Now fast-forwarded; review tooling should always diff against `origin/develop`. Affects review process (diff base discipline). *Found by Reviewer during code review.*
- **Gap** (non-blocking): No shell-level test exercises `createInputController()`'s key-to-field mapping anywhere in the repo (pre-existing gap; the new `start: ['Enter','Space']` wiring inherits it). Deferred — matches the repo-wide shell-coverage convention (eyeball-verified), but worth a story if input regressions bite. Affects `asteroids/tests/` (shell input coverage). *Found by Reviewer during code review (via test-analyzer, deferred).*

## Design Deviations

No deviations at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Initials enter the core via a pure event function, not via Input fields**
  - Spec source: context-story-A-16.md, Technical Approach ("gameover" dispatch)
  - Spec text: "`'gameover'`: if `gameOver.qualifies` and not yet `confirmed`, accept letter input to build `gameOver.initials`"
  - Implementation: Tests pin `enterInitial(state, char): GameState` exported from core/sim.ts, called by the shell per keydown; `Input` gains only `start: boolean`
  - Rationale: `Input`'s documented contract is per-frame *held* plain booleans (pinned by input.test.ts); typed characters are edge events — carrying them on Input would need a per-char debounce and would break the all-boolean invariant. This also keeps the context's own "input.ts gets one new field" literally true.
  - Severity: minor
  - Forward impact: shell keydown handler calls `enterInitial`; determinism replay scripts interleave stepGame + enterInitial calls (see framing.test.ts)
  - → ✓ ACCEPTED by Reviewer: edge-event semantics are right for typed characters; preserves Input's pinned all-boolean contract and keeps the context's "one new field" literally true

- **A-16 owns a stubbed playing→gameover trigger (A-15 not yet landed)**
  - Spec source: context-story-A-16.md, Technical Approach ("Mode flow")
  - Spec text: "`playing → gameover` already happens inside A-15's `handleShipDeath` when `lives` hits `0` — this story doesn't touch that transition"
  - Implementation: A-15 is still in backlog (story taken ahead at user direction), so tests pin a minimal trigger: ship destroyed during play with no lives remaining → `'gameover'` in the same step, with `STARTING_LIVES` stubbed (pinned only as a positive integer, not a magnitude)
  - Rationale: Without a trigger, gameover is unreachable in the shipped game; the context itself allows "or by this story if that's cleaner to land here". SM's session decision (stub lives, A-15 extends) is the higher authority.
  - Severity: minor
  - Forward impact: A-15 replaces the stub with decrement/respawn/invulnerability while `lives > 0`, keeping the pinned no-lives edge
  - → ✓ ACCEPTED by Reviewer: the decision to own the trigger is sound and context-sanctioned; the specific guard implementing it is FLAGGED under Dev's entry below

- **Core-built high-score entries omit `date`**
  - Spec source: context-story-A-16.md, AC-4
  - Spec text: "a confirm input inserts a `HighScoreEntry { name: initials, score, wave, date }`"
  - Implementation: Tests pin `entry.date === undefined` on the core-inserted entry
  - Rationale: The core purity rule (core-boundary.test.ts; no wall-clock in core/) forbids `new Date()`; `date?` is declared optional precisely for this. star-wars stamps dates only because its insert lives in the shell (main.ts).
  - Severity: minor
  - Forward impact: none required; the shell MAY stamp dates at persistence time in a later polish story without breaking these tests
  - → ✓ ACCEPTED by Reviewer: core purity (rule A2, core-boundary guard) outranks an optional field; star-wars precedent confirms the shell-side alternative exists if wanted

- **Confirm requires exactly 3 initials; held start is edge-triggered**
  - Spec source: context-story-A-16.md, "Initials entry" (spec silent on partial confirm and on held-button semantics)
  - Spec text: "capture 3 characters via keyboard letter keys directly (typed, uppercased, capped at 3), `Enter` to confirm"
  - Implementation: Tests pin (a) confirm ignored while fewer than 3 initials are typed; (b) a start press held across the confirm's gameover→attract transition does NOT start a new game — a release and fresh press is required (A-4 `firePrev` precedent)
  - Rationale: (a) matches the ROM's genuine 3-letter capture; (b) without edge-triggering, one Enter press confirms AND instantly restarts, skipping the high-score board the player just earned a place on
  - Severity: minor
  - Forward impact: Dev needs a start-edge latch on GameState (à la `firePrev`); nothing downstream reads it
  - → ✓ ACCEPTED by Reviewer: the double-fire bug the edge trigger prevents is real (verified via framing.test.ts's held-press pin); 3-char confirm matches the ROM capture

- **HUD lives icons pinned as geometry delta, not glyph shape**
  - Spec source: context-story-A-16.md, "HUD" ("a row of small ship-glyph icons, one per remaining life")
  - Spec text: "reusing whatever ship vector shape A-5/A-17 already defines rather than a new glyph"
  - Implementation: render-hud.test.ts pins only that lives=3 strokes strictly more segments than lives=0; the glyph's shape/position/scale are not asserted
  - Rationale: The epic guardrail makes visual layout an eyeball criterion (vitest runs in node); pinning vertices would re-break at A-17's ROM-exact shape swap
  - Severity: minor
  - Forward impact: A-17/A-19 can swap shape/glow data without touching these tests; eyeball-verify the HUD at http://localhost:5275/asteroids/ before done
  - → ✓ ACCEPTED by Reviewer: consistent with the epic's A-5 eyeball guardrail; Dev's Playwright screenshots verified the visual half

- **Terminal-death stub replaces the lives-decrement death seam (review rework round 1)**
  - Spec source: Reviewer Assessment [HIGH] + context-story-A-16.md Mode flow + A-15 sequencing
  - Spec text: "playing → gameover already happens inside A-15's handleShipDeath when lives hits 0" (A-15 unbuilt; the first stub decremented and only ended the run at exactly 0)
  - Implementation: Rework tests pin: ANY ship destruction edge during play enters 'gameover' in the same step, lives forfeited to 0 (bonus-ship reserves included), qualifies computed as before
  - Rationale: With no respawn until A-15, a death holding reserves stranded an invisible immortal ship and made the high-score capture unreachable for runs ≥ 10000 (the review's [HIGH]); forfeiting reserves keeps every run endable and the HUD honest, at the cost of bonus ships being display-only until A-15
  - Severity: minor
  - Forward impact: A-15 replaces the terminal branch with decrement + safe-respawn + invulnerability while reserves remain, keeping the pinned "destroyed with none left → gameover" edge; its ACs must cover the bonus-ship interaction explicitly (see Delivery Findings)
  - → ✓ ACCEPTED by Reviewer (round 2): this deviation supersedes and resolves the round-1 ✗ FLAG on Dev's "Death seam guarded by lives > 0" entry — the dead-end is closed, verified by the passing reserves-forfeit pin and the round-2 delta inspection

### Dev (implementation)

- **A-5 test-infrastructure updates (sanctioned)**
  - Spec source: tests/render-wiring.test.ts:101 (the provisional contract's own comment) + tests/render.test.ts ctx stub
  - Spec text: "A-16's TEA REPLACES this contract with the attract→start→playing flow"
  - Implementation: The provisional "boots into 'playing'" source-text test was replaced by its inverse (main.ts must NOT force `mode: 'playing'`) plus a framing-wiring test (loadHighScores/saveHighScores/enterInitial/loadVectorFont present); the A-5 makeCtx stub gained a recorded-nowhere `fillText() {}` no-op so geometry suites survive the HUD text calls
  - Rationale: The old test self-documents its replacement by A-16; the stub extension changes no pinned geometry assertion — text behaviour is owned by tests/render-hud.test.ts
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: the replaced test self-documents its A-16 replacement; the `fillText` no-op changes no pinned geometry (text ownership correctly moved to render-hud.test.ts)
- **Provisional feel constants pending A-17's quarry timings**
  - Spec source: context-story-A-16.md, Technical Approach + Non-goals ("quarry-exact attract-mode page-cycling timings (A-17)")
  - Spec text: "transition to 'attract' … after a fixed display delay" (value unspecified)
  - Implementation: `GAME_OVER_DISPLAY_S = 3` (sim.ts) and `ATTRACT_CYCLE_TICKS = 240` (render.ts), both carrying `verify vs quarry (A-17)` markers
  - Rationale: The spec names no values; tests pin relationships (timer > 0, counts down by dt), not magnitudes, so A-17's swap is data-only
  - Severity: minor
  - Forward impact: A-17's "no marker remains" AC picks both up
  - → ✓ ACCEPTED by Reviewer: both named constants correctly marked — but the SAME convention was missed on `LIFE_ICON_H/W/GAP` (render.ts:51-54), filed as a [LOW] finding in the rework
- **Death seam guarded by `lives > 0`**
  - Spec source: .session/A-16-session.md scoping decision + context-story-A-16.md Mode flow
  - Spec text: "Stub lives as 1 … A-15 will extend respawn logic later"
  - Implementation: The playing→gameover stub decrements a ship and enters 'gameover' ONLY on the destruction edge with `lives > 0`; a lives-0 state (every pre-A-16 fixture, effectively free-play) latches the old sticky `shipDestroyed` with no mode change
  - Rationale: Preserves all 342 pre-existing test behaviours (waves/score/collision suites run long lives-0 simulations that must not mode-flip mid-assertion) while every real game (start deals `STARTING_LIVES` ≥ 1) reaches gameover correctly
  - Severity: minor
  - Forward impact: A-15 replaces the no-respawn branch; the lives-0 free-play niche disappears once respawn exists
  - → ✗ FLAGGED by Reviewer: the guard has an unconsidered interaction with A-9's bonus ships — `applyScore` can raise `lives` above 1 mid-run (10,000 points, routine play), after which a death decrements to ≥1, fires no gameover, and with no respawn strands an invisible immortal ship; the run can never end and the high-score capture is unreachable for exactly the runs that qualify. Empirically confirmed (600-tick freeze). This is the review's [HIGH] finding: replace with a terminal-death stub (any destruction edge in play → gameover; reserves forfeit until A-15). The legacy-fixture preservation argument survives — lives-0 states still latch without a mode flip.
- **Start key mapping: Enter primary, Space doubles**
  - Spec source: .session/A-16-session.md AC ("SPACE starts a game") + context-story-A-16.md ("Enter to confirm")
  - Spec text: both of the above
  - Implementation: `start: ['Enter', 'Space']` in the shell key map — Space is simultaneously fire, safely, because the sim gates fire to playing and start to attract/gameover
  - Rationale: Satisfies both spec sentences with one mapping; no mode logic leaks into the shell
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: mode-gating in the sim makes the double-duty safe (verified sim.ts:125-126 dispatch + fire gate); satisfies both spec sentences

### Reviewer (audit)

- **Qualifying game-over has no initials timeout (undocumented):** The ROM's pre-game routine banks a default entry after a fixed wait; this implementation waits indefinitely (sim.ts:83-99 never ticks `displayTimer` on the qualifying branch) and neither TEA nor Dev logged the simplification. Severity: M. Resolution: the rework pins wait-forever as the deliberate contract; the ROM-faithful timeout is forward-carried to A-17/A-18 (see Delivery Findings).