---
story_id: "8-6"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-6: Wave 4 — framing: HUD, difficulty ramp, attract/title, local high scores

## Story Details
- **ID:** 8-6
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** 8-8 (wave/phase progression — completed; consumes this machinery for difficulty ramp)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T11:48:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T10:59:33.186885Z | 2026-06-28T11:01:01Z | 1m 27s |
| red | 2026-06-28T11:01:01Z | 2026-06-28T11:16:19Z | 15m 18s |
| green | 2026-06-28T11:16:19Z | 2026-06-28T11:30:45Z | 14m 26s |
| review | 2026-06-28T11:30:45Z | 2026-06-28T11:48:32Z | 17m 47s |
| finish | 2026-06-28T11:48:32Z | - | - |

## Sm Assessment

**Story:** Wave 4 — framing layer over the already-playable Star Wars waves. 3 pts, tdd workflow, star-wars repo (branch `feat/8-6-wave-4-framing` off `develop`).

**Foundation verified:** Dependencies 8-3 (Wave 1 playable) and 8-8 (wave/phase progression) are both `done`. There is a real, playable game to frame. The phase-transition machinery from 8-8 already exists in `src/core` — this story consumes it, it does not rebuild it.

**Scope (four framing concerns):**
1. **HUD** — shields/score/wave indicator overlay (`src/shell` render layer).
2. **Difficulty ramp** — escalation across waves; MUST drive off 8-8's existing phase/wave progression state, not a parallel counter.
3. **Attract/title screen** — title framing + idle/attract presentation.
4. **Local high scores** — localStorage-backed, mirroring tempest's `highscore.ts` + `storage.ts`.

**Reuse mandate (route to TEA/Dev):** tempest already solved high scores, storage, fx, and title framing. The deterministic, pure pieces (high-score table sort/insert, storage read/write, difficulty curve as a pure function of wave state) belong in `src/core` and are the natural RED targets. The render/title/HUD presentation lives in `src/shell` and is harder to unit-test — TEA should focus failing tests on the pure core logic (difficulty ramp function, high-score table, storage serialization) rather than canvas rendering.

**Acceptance criteria for this slice:**
- HUD shows shields, score, and current wave during play.
- Difficulty visibly ramps across waves, derived from 8-8's progression state (no duplicated wave-tracking).
- Attract/title screen presents before play and on idle.
- High scores persist to localStorage across reloads, mirroring tempest's pattern.

**Routing:** No code from me. Handing to TEA (Han Solo) for RED — write failing tests against the pure core logic first (difficulty ramp, high-score table, storage), per the reuse mandate above.

**Risks / watch-items:** Do NOT duplicate 8-8's phase machinery (explicit story constraint). Keep canvas-coupled HUD/title rendering out of the pure-core test surface — assert on state the renderer reads, not on draw calls.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Net-new pure-core logic (high-score table, difficulty ramp) + a run-lifecycle state machine — all unit-testable under the sacred core boundary.

**Test Files:**
- `star-wars/tests/core/highscore.table.test.ts` — pure high-score table (`qualifiesForHighScore`, `insertHighScore`, `MAX_HIGH_SCORES`); mirrors tempest.
- `star-wars/tests/shell/storage.test.ts` — localStorage seam (`loadHighScores`/`saveHighScores`), key `star-wars-high-scores`, graceful degradation + per-entry validation + readonly param; mirrors tempest.
- `star-wars/tests/core/difficulty.test.ts` — `waveParams(wave)` pure ramp (parity at wave 1, monotonic escalation, bound floors, purity); mirrors tempest's `levelParams`.
- `star-wars/tests/core/framing.test.ts` — run lifecycle (`mode`, `wave`, `Input.start`): attract→play→gameover→attract, plus the sim CONSUMING `waveParams(wave)`.

**Tests Written:** 4 files. **RED verified** (run `8-6-tea-red`): Test Files 4 failed | 6 passed; Tests 16 failed | 106 passed.
- `highscore.table.test.ts` + `storage.test.ts`: fail to LOAD (net-new modules `src/core/highscore.ts`, `src/shell/storage.ts` don't exist yet) — the intended net-new-module RED.
- `difficulty.test.ts`: 8 fail on `waveParams is not a function`.
- `framing.test.ts`: 8 fail on assertions (missing `mode`/`wave`, wave-2 not faster: "expected 120 to be greater than 120"); 4 RED-and-GREEN guards pass.
- **All 6 pre-existing suites still pass** — no regressions.

### Rule Coverage (gates/lang-review/typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #1/#10 input-validation (validate `JSON.parse` output; no `as T`) | storage `per-entry validation guard` (drops `[{}]`, wrong-typed, non-object rows) | failing (module not found) |
| #2 generic/interface (`readonly` on non-mutated array param) | storage `readonly parameter` block + highscore `is pure: does not mutate` | failing |
| #4 null/undefined (graceful, `??` not `||`) | storage graceful-degradation (undefined / throwing localStorage → `[]`, no throw) | failing |
| #11 error-handling (no throw on corrupt JSON / quota) | storage `not.toThrow` on corrupt/quota/absent storage | failing |
| #8 test-quality (meaningful assertions; casts only for not-yet-existing fields) | self-check (below) | n/a |

**Rules checked:** 5 of 13 applicable. The rest don't apply to these pure-data/IO modules: #3 enum (string unions, no enums), #6 React/JSX, #7 async, #9 build-config, #12 perf/bundle.
**Self-check:** 0 vacuous tests found. Cast-view (`as unknown as …`) is used ONLY to read not-yet-existing fields during RED so failures land on assertions, not module-load — it is removed naturally once GREEN adds the real types.

**Handoff:** To Dev (Yoda) for GREEN.

**GREEN guidance (route, don't prescribe):**
- Create `src/core/highscore.ts` (`HighScoreEntry { name, score, wave, date? }`, `HighScoreTable`, `MAX_HIGH_SCORES = 10`, `qualifiesForHighScore`, `insertHighScore`) and `src/shell/storage.ts` (key `star-wars-high-scores`, `loadHighScores`/`saveHighScores`, `isHighScoreEntry` guard, `readonly` save param) — mirror tempest's modules closely.
- Add `waveParams(wave): { spawnInterval, enemySpeed, enemyFireInterval }` to `src/core/gameRules.ts` — wave 1 MUST equal `SPAWN_INTERVAL`/`ENEMY_SPEED`/`ENEMY_FIRE_INTERVAL`; higher waves tighten cadence & speed up enemies with positive floors.
- Add `mode: 'attract' | 'playing' | 'gameover'` + `wave: number` to `GameState`, `start` to `Input`, and have the space spawner read `waveParams(state.wave)` instead of the bare constants. Keep wave 1 byte-identical so the 8-3 suite stays green.
- HUD wave indicator, attract/title screen, and high-score board RENDER in the shell — verify by running the dev server (not unit-tested; see deviations).

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 163/163 passing (GREEN) — all 4 new suites + 6 pre-existing suites. `tsc --noEmit` + `vite build` clean.
**Branch:** `feat/8-6-wave-4-framing` (pushed to origin)

**Files Changed:**
- `src/core/highscore.ts` (new) — `HighScoreEntry {name, score, wave, date?}`, `HighScoreTable`, `MAX_HIGH_SCORES = 10`, `qualifiesForHighScore`, `insertHighScore`. Pure; mirrors tempest.
- `src/shell/storage.ts` (new) — `loadHighScores`/`saveHighScores` on key `star-wars-high-scores`; `isHighScoreEntry` per-entry guard; `readonly` save param; graceful degradation (absent/corrupt/unavailable/quota).
- `src/core/gameRules.ts` — `WaveParams` + `waveParams(wave)`: `ramp = 1 + (wave-1)*0.15`; `spawnInterval`/`enemyFireInterval` floored at 0.3/0.25; `enemySpeed = ENEMY_SPEED*ramp`. Wave 1 == today's constants exactly.
- `src/core/state.ts` — `Mode = 'attract'|'playing'|'gameover'`; `mode` + `wave` on `GameState`; `initialState` boots `mode 'playing'`, `wave 1`.
- `src/core/input.ts` — optional `start` trigger.
- `src/core/sim.ts` — lifecycle dispatch (attract idles & `start`→fresh run via `startRun`; gameover/`gameOver`→frozen, `start`→attract); space spawner consumes `waveParams(state.wave)`; `spawnTie(rng, speed)`; sets `mode 'gameover'` on shield-out. Phase machinery (8-8) untouched.
- `src/shell/input.ts` — `start` as a one-shot edge (Enter / 1).
- `src/main.ts` — boots attract; loads high scores; banks a qualifying score on the playing→gameover edge; passes `highScores` to render.
- `src/shell/render.ts` — HUD wave indicator; attract/title screen + game-over screen, each with the high-score board.

**Acceptance criteria:**
- HUD shows shields, score, and wave during play. ✓ (wave indicator added; shell — verify by running)
- Difficulty ramps across waves off `waveParams(state.wave)`, consuming 8-8's state (no duplicated phase logic). ✓ (unit-tested)
- Attract/title presents before play; game-over returns to it. ✓ (lifecycle unit-tested; screens — verify by running)
- High scores persist to localStorage across reloads, mirroring tempest. ✓ (unit-tested)

**Visual verification PENDING (shell, per architecture):** the HUD wave indicator, attract/title screen, game-over board, and start-to-play loop render via `src/shell` and must be eyeballed in the dev server (`just serve` → star-wars). Recommended for the verify/review phase.

**Handoff:** To next phase (verify/review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 blocking (3 console.warn = intentional shell-IO degradation) | N/A — confirmed GREEN 163/0, build ok |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 15 (all LOW) | confirmed 14 (LOW), deferred 1 (pre-existing), dismissed 0 |

**All received:** Yes (2 enabled specialists returned; 7 disabled via `workflow.reviewer_subagents`, assessed by Reviewer directly)
**Total findings:** 14 confirmed (all LOW, non-blocking), 1 deferred (pre-existing), 0 dismissed, + 2 Reviewer-found (LOW)

## Rule Compliance (gates/lang-review/typescript.md + star-wars core-purity boundary)

Exhaustive per-rule enumeration over the 9 changed source files (rule-checker corroborated):

- **#1 Type-safety escapes:** VIOLATIONS (all LOW): 6 stale RED-phase `as unknown as` double-casts in `tests/core/framing.test.ts:44,45,48,52,58` + `tests/core/difficulty.test.ts:42` — the cast targets (`mode`, `wave`, `Input.start`, `waveParams`) now exist post-GREEN, so the casts are redundant and should be replaced with direct typed access (TEA's own assessment said these "are removed naturally once GREEN adds the real types"). `tests/shell/storage.test.ts:67` `as unknown as Storage` — established test idiom (mirrors tempest), wants a clarifying comment. COMPLIANT: `isHighScoreEntry` is a validated predicate (storage.ts:18-26); `parsed as unknown` not `as T` (storage.ts:55).
- **#2 Missing `readonly` on non-mutated array params:** VIOLATIONS (all LOW): `highscore.ts:27,37` (`qualifiesForHighScore`/`insertHighScore` table param), `render.ts` (`render`/`drawAttract`/`drawGameOver`/`drawHighScoreBoard` highScores param) — none mutate the array; `saveHighScores` correctly uses `readonly`, so the pair is inconsistent. Mitigation: these faithfully mirror tempest's signatures; purity is test-enforced.
- **#3 Enums:** COMPLIANT — `Mode`/`Phase` are string unions, no enums.
- **#4 Null/undefined:** COMPLIANT — `getStorage` uses `ls ?? null` (storage.ts:33); no `||`-on-falsy-valid bugs introduced.
- **#5 Module/declaration:** COMPLIANT — `export type`/`import type` used correctly; `.js`-extension rule N/A (Vite bundler).
- **#6 React/JSX:** N/A (no .tsx).
- **#7 Async:** N/A (no new async).
- **#8 Test quality:** VIOLATION (LOW): `difficulty.test.ts:34` local `interface WaveParams` duplicates the now-exported one (drift risk) — import it instead. COMPLIANT: all assertions meaningful, no vacuous tests, imports from `src/` not `dist/`.
- **#9 Build config:** N/A (no config changes).
- **#10 Input validation:** COMPLIANT — `JSON.parse` output validated at runtime (storage.ts:54-60).
- **#11 Error handling:** COMPLIANT — bare `catch {}` (no `e: any`) for documented graceful degradation.
- **#12 Perf/bundle:** COMPLIANT — `JSON.stringify` only on the gameover edge (not the loop); no barrel imports.
- **#13 Fix regressions:** COMPLIANT — `gameOver`/`mode` set together; cannot diverge.
- **Core-purity boundary (CLAUDE.md):** COMPLIANT — `highscore.ts`/`gameRules.ts`/`state.ts`/`input.ts`/`sim.ts` import only core modules; no DOM/`Date.now`/`Math.random`/`rAF`; randomness via `state.rng` (sim.ts:71). `storage.ts` (localStorage) is correctly in `shell/`.

## Observations (≥5, tagged)

- **[RULE] [LOW]** Stale RED-phase double-casts (7 sites) — `tests/core/framing.test.ts:44,45,48,52,58`, `tests/core/difficulty.test.ts:42`, `tests/shell/storage.test.ts:67`. Fields/exports now exist; replace with direct typed access. Confirmed (rule #1 match).
- **[RULE][TEST] [LOW]** `tests/core/difficulty.test.ts:34` duplicate local `WaveParams` interface — import `WaveParams` from `gameRules.ts` to avoid silent drift. Confirmed (rule #8 match).
- **[RULE][TYPE] [LOW]** Missing `readonly` on non-mutated array params — `highscore.ts:27,37`, `render.ts:70,220,243,268`. Confirmed (rule #2 match); mirrors tempest, purity test-enforced.
- **[SELF] [LOW]** `sim.ts:66` — the gameover→attract transition returns `{ ...state, mode: 'attract', … }`, carrying the ended run's frozen `enemies`/`projectiles`/`enemyShots` into the attract screen, so leftover TIEs/bolts show behind the title until the next run starts. Entering attract should clear the battlefield (or run an attract demo).
- **[DOC] [LOW]** `render.ts:104` — comment "an empty starfield on the framing screens" is accurate on boot but not after a game over (battlefield not cleared — see above). comment-analyzer disabled; caught by Reviewer.
- **[SEC] [LOW]** Hand-edited `localStorage` with `score: 1e999` parses to `Infinity` (a `number`, so `isHighScoreEntry` passes) and would pin an unbeatable #1. Troll-only (requires editing storage); matches tempest's known non-blocking finding. Self-assessed (security specialist disabled).
- **[EDGE]** Boundary conditions self-assessed (edge-hunter disabled): lives→0 flips to gameover once (sim.ts:152-153); empty high-score board renders "NO SCORES YET" (render.ts); deep-wave cadence floors bind (waveParams); one-shot `start` latch fires exactly one transition per keypress (input.ts). No unhandled boundary found.
- **[SILENT]** Self-assessed (silent-failure-hunter disabled): storage.ts empty catches are documented graceful degradation returning `[]`/no-op, not swallowed bugs; no other error paths suppressed.
- **[SIMPLE]** Self-assessed (simplifier disabled): code mirrors tempest patterns; lifecycle dispatch is minimal; only redundancy is the duplicate test interface (above). No over-engineering.
- **[VERIFIED] Wave-1 balance unchanged** — `waveParams(1)` returns `SPAWN_INTERVAL`/`ENEMY_SPEED`/`ENEMY_FIRE_INTERVAL` exactly (ramp=1); the 8-3 space-combat suite (25 tests) still passes. Evidence: `gameRules.ts` waveParams + preflight 163/0.
- **[VERIFIED] Core purity preserved** — no DOM/time/random in core; `stepGame` clones `state.rng` (sim.ts:71) and reads no wall-clock. Complies with CLAUDE.md hard boundary. Evidence: rule-checker rule #14 all compliant.
- **[VERIFIED] High-score capture fires once** — main.ts records only on the `prev.mode==='playing' && state.mode==='gameover'` edge; the transition occurs on a single step. Evidence: main.ts loop + sim lifecycle.

## Data Flow Traced

- **Load:** `localStorage[star-wars-high-scores]` → `loadHighScores()` (JSON.parse → `Array.isArray` → per-row `isHighScoreEntry`) → shell `highScores` → `render` board. Safe: malformed/corrupt/absent all degrade to `[]` without throwing.
- **Save:** run ends → `prev.mode→state.mode` edge → `qualifiesForHighScore` → `insertHighScore` (pure, truncates to 10) → `saveHighScores` (swallows quota/unavailable). Safe: a failed write never crashes the game.
- **Input wiring:** Enter/1 keydown → `pendingStart` latch → `sample().start` → sim lifecycle → `mode` transitions → render screens. HUD reads `state.wave`. All wired.

### Devil's Advocate

Argue the code is broken. The loudest concern: **the difficulty ramp is dormant in real play.** `waveParams(wave)` is fully wired and tested, but the wave counter never increments — wave-advance is explicitly deferred to 8-9 (trench gameplay), so today the HUD always reads "WAVE 1" and every run uses wave-1 parameters. A skeptic says the headline AC "difficulty visibly ramps across waves" is not *observable* yet. Counter: this is the operative, logged scope (TEA + Dev deviations; 8-6 depends on 8-8, not 8-9) — the machinery is delivered and unit-proven, ready for 8-9 to flip the switch. Accepted, not a defect.

A confused user: presses Enter at the game-over screen and lands on attract, not back in play — two presses to restart (gameover→attract→playing). Slightly surprising, but it matches the cabinet idiom (game over → attract → press start) and the tested lifecycle. Worse: after that game over, the attract screen shows the previous run's frozen TIEs behind the title (sim.ts:66 keeps the battlefield) — a real cosmetic blemish (flagged LOW). A malicious user: edits `localStorage` to inject `score: 1e999` → `Infinity` survives the type guard and pins an unbeatable top score; troll-only, requires console access, matches tempest's known gap (LOW). A stressed environment: private-browsing/quota/corrupt JSON — all exercised by the storage suite and degrade to `[]`/no-op without throwing. A reordering hazard: the high-score board uses no React keys (not React) and `insertHighScore` is pure (snapshot-tested). Deep waves: `enemySpeed = ENEMY_SPEED*ramp` is unbounded, but reaching such waves is impossible until 8-9 and is irrelevant now. Nothing here rises above LOW; the core logic is sound and fully covered.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. Tests 163/163 GREEN; `tsc --noEmit` + `vite build` clean; core-purity boundary intact; security/error-handling/input-validation all compliant. The implementation faithfully mirrors tempest's high-score + storage patterns and consumes 8-8's phase machinery without duplicating it. All 18 findings ([RULE], [TEST], [TYPE], [DOC], [SEC], [SELF], [EDGE], [SILENT], [SIMPLE]) are LOW/non-blocking — stale RED-phase test casts, missing `readonly` annotations, a duplicate test interface, an attract-screen battlefield-clear, a stale comment, an Infinity-score localStorage edge, and one pre-existing `getContext('2d')!` (deferred — not introduced by this story). None affect correctness, and the scope boundaries (wave-advance → 8-9; rendering → run-verified) are documented and sound.

**Data flow traced:** localStorage ↔ validated high-score table ↔ render board; run score → qualify/insert/save (safe on every failure path).
**Pattern observed:** faithful tempest mirror (`highscore.ts`/`storage.ts`) + minimal lifecycle state machine at `sim.ts:61-68`.
**Error handling:** graceful localStorage degradation (storage.ts catches), single-fire score capture (main.ts edge).
**Recommended fast-follow (non-blocking):** remove the stale RED-phase casts + import `WaveParams` + add `readonly` (cheap, matches project rules #1/#2/#8); clear the battlefield on entering attract.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the wave-advance trigger (loop space→surface→trench→space at wave+1, escalating difficulty) belongs to 8-9 (trench run gameplay), not this story. Affects `star-wars/src/core/sim.ts` (8-8's `progress`/`enterPhase` machinery — 8-9 must increment `GameState.wave` and re-open the space phase when the trench is cleared). *Found by TEA during test design.*
- **Improvement** (non-blocking): the difficulty ramp scales only SPACE-phase knobs (`spawnInterval`, `enemySpeed`, `enemyFireInterval`). The surface phase (turret spawn cadence / scroll speed) does not yet ramp with wave. Affects `star-wars/src/core/gameRules.ts` + `star-wars/src/core/sim.ts` — a follow-up can extend `waveParams` to the surface knobs. *Found by TEA during test design.*
- **Question** (non-blocking): `GameState` will carry both `gameOver: boolean` (8-3) and the new `mode: 'gameover'`. The RED suite asserts they flip together and does NOT force removing `gameOver`; Dev may keep both (mode derived) or unify. Affects `star-wars/src/core/state.ts` + `star-wars/src/core/sim.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): high-score initials entry is not implemented — runs record under a fixed `'ACE'` tag. Affects `star-wars/src/main.ts` (and a new `GameState` mode) — a follow-up can add a 3-initials entry screen before recording. *Found by Dev during implementation.*
- **Resolved (Question from TEA):** kept BOTH `gameOver: boolean` and `mode: 'gameover'` rather than unifying — the lifecycle dispatch treats either signal as "run ended" (`mode === 'gameover' || gameOver`), so the constructed `gameOver:true` test states (8-8) and real play both freeze/restart correctly. `gameOver` stays the per-frame shield-lost flag; `mode` frames the run. *Noted by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): stale RED-phase double-casts survive into GREEN — `tests/core/framing.test.ts` (`modeOf`/`waveOf`/`withMode`/`withWave`/`START`) and `tests/core/difficulty.test.ts:42` cast to read fields/exports that now exist. Affects those test files (replace `as unknown as` with direct typed access; import `WaveParams`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): add `readonly` to non-mutated array params (`highscore.ts` `qualifiesForHighScore`/`insertHighScore`; `render.ts` `render`/`drawAttract`/`drawGameOver`/`drawHighScoreBoard`) to match `saveHighScores` and project rule #2. Affects `star-wars/src/core/highscore.ts` + `star-wars/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the attract screen entered from game-over retains the previous run's frozen `enemies`/`projectiles` behind the title. Affects `star-wars/src/core/sim.ts:66` (clear the battlefield on entering attract) and the now-stale comment at `star-wars/src/shell/render.ts:104`. *Found by Reviewer during code review.*
- **Question** (non-blocking): hand-edited `localStorage` `score: 1e999` parses to `Infinity` and passes `isHighScoreEntry` (it's a `number`), pinning an unbeatable top score. Affects `star-wars/src/shell/storage.ts` (add a finite-score guard) — matches tempest's known non-blocking finding. *Found by Reviewer during code review.*
- **Gap** (non-blocking, pre-existing): `star-wars/src/main.ts:21` `canvas.getContext('2d')!` non-null-asserts a value that can be null. Not introduced by this story (unchanged line) — harden in a follow-up. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (1 Gap, 0 Conflict, 0 Question, 0 Improvement)
**Blocking:** None

- **Gap:** the wave-advance trigger (loop space→surface→trench→space at wave+1, escalating difficulty) belongs to 8-9 (trench run gameplay), not this story. Affects `star-wars/src/core/sim.ts`.

### Downstream Effects

- **`star-wars/src/core`** — 1 finding

### Deviation Justifications

6 deviations

- **High-score entry records `wave`, not tempest's `level`; key is `star-wars-high-scores`**
  - Rationale: star-wars escalates by wave, not tube level — mirroring the pattern while using the game's own progression term keeps the HUD/board labels correct.
  - Severity: minor
  - Forward impact: render/board code reads `entry.wave`; a future shared high-score lib (none yet) would need to parameterize the progression-field name.
- **initialState() keeps booting a PLAYING wave-1 run; attract is the shell's boot state**
  - Rationale: every existing star-wars core suite (8-3/8-4/8-8) calls `initialState()` and expects immediate gameplay; flipping it to 'attract' + gating the sim would break all of them and balloon a 3-pt framing story. The full lifecycle (attract→play→gameover→attract) is tested regardless of the boot default.
  - Severity: minor
  - Forward impact: shell `main.ts` must explicitly start in attract rather than relying on `initialState`.
- **Wave-advance TRIGGER is out of scope; only the ramp machinery + wave-1 baseline ship**
  - Rationale: 8-6 depends on 8-8 (done) + 8-3 (done), NOT on 8-9 (trench gameplay, still backlog). A run cannot loop back to space at wave+1 until the trench can be cleared; pinning that trigger now would pre-empt 8-9 or test dark code. Delivered: the full ramp machinery wired at wave 1, ready for 8-9 to call the increment.
  - Severity: minor
  - Forward impact: 8-9 must increment `GameState.wave` and re-open the space phase when the trench clears, reusing 8-8's `enterPhase` machinery (see Delivery Finding).
- **HUD / attract / title RENDERING is not unit-tested (shell, run-verified)**
  - Rationale: the repo's hard boundary makes canvas rendering a shell concern verified by running the game; unit-testing draw calls would couple tests to render internals. Per the SM assessment: assert on the state the renderer reads, not on draw calls.
  - Severity: minor
  - Forward impact: Dev/Reviewer must visually verify the HUD wave indicator, attract/title, and high-score board by running the dev server (`just serve`).
- **High scores record under a fixed 'ACE' tag — no initials-entry screen**
  - Rationale: initials entry is a whole input/mode flow (tempest has a dedicated `'highscore'` mode); persistence + display is the actual requirement and is fully delivered. Keeps the 3-pt story focused.
  - Severity: minor
  - Forward impact: a follow-up can add an initials-entry mode (a new `GameState` mode) before the score is recorded; the table/storage already accept any name.
- **Difficulty ramp wired into the SPACE phase only; surface keeps its constants**
  - Rationale: matches TEA's scoping of the ramp to the space knobs; the surface ramp is already filed as a non-blocking follow-up. Wave 1 stays byte-identical so the 8-3 suite is unaffected.
  - Severity: minor
  - Forward impact: extending the ramp to the surface means adding turret knobs to `waveParams` and reading them in `stepSurface`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **High-score entry records `wave`, not tempest's `level`; key is `star-wars-high-scores`**
  - Spec source: context-story-8-6.md, "Reuses tempest's patterns (highscore.ts, storage.ts, …)"
  - Spec text: "Reuses tempest's patterns (highscore.ts, storage.ts, fx.ts, render/title framing)."
  - Implementation: `HighScoreEntry` uses `wave: number` where tempest's entry uses `level: number`; the storage key is `star-wars-high-scores` (tempest: `tempest-high-scores`). The STRUCTURE/behaviour is mirrored faithfully.
  - Rationale: star-wars escalates by wave, not tube level — mirroring the pattern while using the game's own progression term keeps the HUD/board labels correct.
  - Severity: minor
  - Forward impact: render/board code reads `entry.wave`; a future shared high-score lib (none yet) would need to parameterize the progression-field name.
- **initialState() keeps booting a PLAYING wave-1 run; attract is the shell's boot state**
  - Spec source: context-story-8-6.md, "attract/title screen"; tempest precedent (sim.framing.test.ts)
  - Spec text: tempest's framing boots "initialState() … in 'attract'"; 8-6 wants an "attract/title screen".
  - Implementation: star-wars `initialState()` still returns a fresh PLAYING run (mode 'playing', wave 1); the attract BEHAVIOUR is driven from a constructed attract state, and the shell boots into attract.
  - Rationale: every existing star-wars core suite (8-3/8-4/8-8) calls `initialState()` and expects immediate gameplay; flipping it to 'attract' + gating the sim would break all of them and balloon a 3-pt framing story. The full lifecycle (attract→play→gameover→attract) is tested regardless of the boot default.
  - Severity: minor
  - Forward impact: shell `main.ts` must explicitly start in attract rather than relying on `initialState`.
- **Wave-advance TRIGGER is out of scope; only the ramp machinery + wave-1 baseline ship**
  - Spec source: context-story-8-6.md, "difficulty ramp across waves … consumes the phase-transition machinery built in 8-8; do not duplicate it here."
  - Spec text: "The difficulty-ramp / wave-structure logic consumes the phase-transition machinery built in 8-8; do not duplicate it here."
  - Implementation: tests pin `waveParams(wave)` (pure ramp), the `GameState.wave` field, and the sim CONSUMING `waveParams` at the current wave. They do NOT pin the wave INCREMENT on run-loop.
  - Rationale: 8-6 depends on 8-8 (done) + 8-3 (done), NOT on 8-9 (trench gameplay, still backlog). A run cannot loop back to space at wave+1 until the trench can be cleared; pinning that trigger now would pre-empt 8-9 or test dark code. Delivered: the full ramp machinery wired at wave 1, ready for 8-9 to call the increment.
  - Severity: minor
  - Forward impact: 8-9 must increment `GameState.wave` and re-open the space phase when the trench clears, reusing 8-8's `enterPhase` machinery (see Delivery Finding).
- **HUD / attract / title RENDERING is not unit-tested (shell, run-verified)**
  - Spec source: star-wars CLAUDE.md (architecture) + context-story-8-6.md, "HUD … attract/title screen"
  - Spec text: "The shell (render/input/audio/loop) is verified by running the game."
  - Implementation: RED covers the pure-core DATA the renderer reads (mode, wave, score, lives, high-score table) but asserts nothing about canvas draw calls for the HUD/title/attract screens.
  - Rationale: the repo's hard boundary makes canvas rendering a shell concern verified by running the game; unit-testing draw calls would couple tests to render internals. Per the SM assessment: assert on the state the renderer reads, not on draw calls.
  - Severity: minor
  - Forward impact: Dev/Reviewer must visually verify the HUD wave indicator, attract/title, and high-score board by running the dev server (`just serve`).

### Dev (implementation)
- **High scores record under a fixed 'ACE' tag — no initials-entry screen**
  - Spec source: context-story-8-6.md, "local high scores (localStorage)"
  - Spec text: "local high scores (localStorage)"
  - Implementation: on the playing→gameover edge, a qualifying score is banked under the fixed name `'ACE'` and persisted; there is no 3-initials entry mode.
  - Rationale: initials entry is a whole input/mode flow (tempest has a dedicated `'highscore'` mode); persistence + display is the actual requirement and is fully delivered. Keeps the 3-pt story focused.
  - Severity: minor
  - Forward impact: a follow-up can add an initials-entry mode (a new `GameState` mode) before the score is recorded; the table/storage already accept any name.
- **Difficulty ramp wired into the SPACE phase only; surface keeps its constants**
  - Spec source: context-story-8-6.md, "difficulty ramp across waves" (+ TEA scope deviation above)
  - Spec text: "difficulty ramp across waves"
  - Implementation: `stepGame` reads `waveParams(state.wave)` for TIE spawn cadence, approach speed, and fireball cadence; `stepSurface` (turret cadence / scroll) still uses its module constants.
  - Rationale: matches TEA's scoping of the ramp to the space knobs; the surface ramp is already filed as a non-blocking follow-up. Wave 1 stays byte-identical so the 8-3 suite is unaffected.
  - Severity: minor
  - Forward impact: extending the ramp to the surface means adding turret knobs to `waveParams` and reading them in `stepSurface`.
- No other deviations from spec.

### Reviewer (audit)
Every logged deviation reviewed:
- **TEA: high-score entry records `wave` not `level`; key `star-wars-high-scores`** → ✓ ACCEPTED — faithful structural mirror of tempest with star-wars's own progression term; labels stay correct.
- **TEA: initialState() boots 'playing'; attract is the shell's boot state** → ✓ ACCEPTED — preserves the existing 8-3/8-4/8-8 core suites; the full lifecycle is still unit-tested. Verified main.ts:38 boots `mode: 'attract'`.
- **TEA: wave-advance trigger out of scope (8-9 owns it); only ramp machinery + wave-1 baseline ship** → ✓ ACCEPTED — sound dependency reasoning (8-6 depends on 8-8/8-3, not 8-9); a run cannot loop until trench gameplay exists. Noted in Devil's Advocate that the ramp is therefore not yet observable in play; acceptable given the scope.
- **TEA: HUD/attract/title rendering not unit-tested (shell, run-verified)** → ✓ ACCEPTED — matches the repo's hard core/shell boundary; the testable state the renderer reads is covered.
- **Dev: high scores record under fixed 'ACE' tag (no initials-entry screen)** → ✓ ACCEPTED — persistence + display delivered and tested; initials entry is a reasonable follow-up (also filed as a Delivery Finding).
- **Dev: difficulty ramp wired into SPACE phase only** → ✓ ACCEPTED — consistent with TEA's scoping; wave-1 parity keeps the space-combat suite green. Surface ramp filed as a follow-up.

No undocumented deviations found — every divergence the diff makes from the story text is captured above by TEA or Dev.