---
story_id: A-15
jira_key: A-15
epic: A
workflow: tdd
---
# Story A-15: Lives / safe-respawn (clear-center) / invulnerability

## Story Details
- **ID:** A-15
- **Jira Key:** A-15
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** asteroids
- **Branch:** feat/A-15-lives-respawn-invuln

## Sm Assessment

- **Jira:** skipped — this project tracks stories locally in `sprint/epic-A.yaml` (no Jira). Story status set to `in_progress`, started 2026-07-03.
- **Story context:** exists and is Architect-enriched at `sprint/context/context-story-A-15.md` (182 lines) — includes ROM research (6502disassembly + computerarcheology sources), technical approach, scope, and acceptance criteria. Verified not clobbered by setup tooling.
- **Branch:** `feat/A-15-lives-respawn-invuln` created off `develop` in the asteroids subrepo (gitflow; PRs target develop, squash-merge).
- **Prior-story context for TEA:** Read `sprint/archive/A-16-session.md` before writing tests — A-16's review flagged `[HIGH] sim.ts:194`: death with bonus-ship reserves never ends the run (terminal-death stub was the interim fix); A-15 is the story that gives death real consequences (lives decrement, clear-center safe respawn, invulnerability window). Prior TEA may have pre-extracted ROM quarry for this story in that archive.
- **Routing:** tdd is phased — next phase `red`, owner `tea`.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T04:46:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T03:54:49Z | 2026-07-04T03:57:11Z | 2m 22s |
| red | 2026-07-04T03:57:11Z | 2026-07-04T04:17:04Z | 19m 53s |
| green | 2026-07-04T04:17:04Z | 2026-07-04T04:35:06Z | 18m 2s |
| review | 2026-07-04T04:35:06Z | 2026-07-04T04:46:57Z | 11m 51s |
| finish | 2026-07-04T04:46:57Z | - | - |

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-point core-mechanics story: a new core module (`lives.ts`), replacement of A-16's terminal-death stub in the sim's death seam, and cross-cutting `stepGame` changes (dead-ship gating, respawn wiring, invulnerability-gated collision).

**Test Files:**
- `tests/lives.test.ts` (new) — 39 tests in 6 blocks: `STARTING_LIVES` ROM magnitude + start-press deal (2); `handleShipDeath` decrement/terminal/qualifies/purity (5); `isCenterClear` geometric clear-zone incl. saucer/saucer-bullet blockers, player-bullet exclusion, radius parameterization, the no-instant-death radius relationship, purity (9); `tryRespawnShip` revive-at-center/blocked-wait/no-reserves/live-ship-no-teleport/mode-gate/purity (6); invulnerability window — field location (`GameState.shipSpawnTimer`), decay-by-dt with clamp, shielded-not-inert, full-window duration (7); `stepGame` integration — decrement-keeps-playing, one-death-one-ship, dead-ship deaf-to-input, next-tick revive, indefinite wait, bonus-ship-in-the-killing-step (Reviewer's forward-carried A-16 case), preserved last-ship edge, legacy lives-0 niche, three-death ladder, determinism golden replay (10). RED via module-load failure until `src/core/lives.ts` exists.
- `tests/modes.test.ts` (edited) — the sanctioned removal of A-16's reserves-forfeit pin (superseded by lives.test.ts); header/section comments updated. All remaining tests green.
- `tests/framing.test.ts` (edited) — comment-only (STARTING_LIVES stub notes now point at lives.test.ts).

**Tests Written:** 39 covering all 6 context ACs (AC-6 build/test-green is a GREEN-phase outcome; AC-1 adapted per deviation #3)
**Status:** RED (verified by testing-runner, RUN_ID A-15-tea-red: 435 passed / 22 files, 1 file failed = tests/lives.test.ts module-load, **zero regressions**). Committed as `010b43e` on `feat/A-15-lives-respawn-invuln`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety (no casts) | zero `as` casts anywhere in the new suite; fixtures fully typed | done (self-check) |
| #2 readonly/mutation | purity `structuredClone` pins on `handleShipDeath`, `isCenterClear`, `tryRespawnShip` (repo's behavioral-purity precedent; compile-time `Readonly<T>` params remain A-5's forward item) | failing (RED) |
| #4 null/undefined | `saucer: null` path pinned (empty-field clear); `gameOver` stays `null` on non-terminal death | failing (RED) |
| #8 test quality | guard-the-guard asserts throughout (award actually landed, fixture mode verified, monotonic window close); 0 vacuous tests | done |
| core purity A1–A6 (repo) | `core-boundary.test.ts` auto-covers new `core/lives.ts`; determinism golden replay (ladder ×2 deep-equal incl. rng) | failing (RED) |

**Rules checked:** 4 of 13 lang-review checks applicable have coverage; #3 (no enums — Mode union untouched), #5 (tsc-enforced), #6 (no React), #7 (no async), #9 (no config), #10 (no boundary input — pure core), #11 (no error paths), #12 (no bundle change), #13 (GREEN-phase meta) not applicable to this diff.
**Self-check:** 0 vacuous tests found.

**Implementation worklist implied by the suites (for Julia):**
- `src/core/lives.ts` (new): `handleShipDeath`, `isCenterClear`, `tryRespawnShip`, `isInvulnerable`, `RESPAWN_CLEAR_RADIUS` + `RESPAWN_INVULNERABILITY_S` (both need `verify vs quarry (A-17)` markers)
- `src/core/state.ts`: `STARTING_LIVES` 1 → 3 (drop the `verify vs quarry (A-15)` stub marker; keep the 4-ship DIP alternative as a comment per context); `GameState.shipSpawnTimer: number` (seconds, 0 = mortal) + `initialState` default 0; refresh stale "until A-15" comments (e.g. `shipDestroyed` docstring)
- `src/core/sim.ts`: replace the terminal-death stub with `handleShipDeath` on the destruction edge; gate the ship-vs-rock check on `!isInvulnerable`; gate `stepShip`/`stepBullets` while `shipDestroyed` (dead ship must be input-deaf and gun-silent); call `tryRespawnShip` every `'playing'` tick; decay `shipSpawnTimer` by dt clamped at 0
- **Eyeball criterion (epic A-5 guardrail):** the death → clear-center wait → respawn cycle is visible behavior — verify in the browser at :5275 before done.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/lives.ts` (new) — the lives model: `handleShipDeath` (decrement with reserves / same-step gameover on the last ship, qualifying off the persisted board), `isCenterClear` (geometric clear-zone; rocks/saucer/saucer-shots block, player shots excluded; Euclidean is seam-safe from the center), `tryRespawnShip` (exact center, at rest, dir 64, window armed; unbounded wait otherwise), `isInvulnerable`; `RESPAWN_CLEAR_RADIUS = 264` and `RESPAWN_INVULNERABILITY_S = 129/60`, both carrying `verify vs quarry (A-17)` markers
- `src/core/state.ts` — `STARTING_LIVES` 1 → 3 (ROM $6ED8 default; 4-ship DIP documented as comment); `GameState.shipSpawnTimer` + initialState default 0; `GAME_OVER_DISPLAY_S` moved here (sim.ts re-exports); `shipDestroyed` docstring refreshed
- `src/core/sim.ts` — A-15 death seam: window decays BEFORE the collision check (final tick still shields; float residue can't stretch the window); ship-vs-rock gated on the decayed timer; dead ship frozen and disarmed (fire shift-register held high — in-flight shots keep flying; `firePrev` tracks the real button); `handleShipDeath` on the destruction edge consuming POST-award lives; `tryRespawnShip` on the pre-step latch (≥ 1 full tick dead); `lives > 0` guard preserves the legacy lives-0 niche
- `tests/ship.test.ts` — sanctioned infrastructure update only (two long flight-physics runs immortalized via `shipSpawnTimer: Infinity`; see deviations)

**Tests:** 474/474 passing (GREEN, testing-runner RUN_ID A-15-dev-green2; first run A-15-dev-green caught 3 failures — the decay-order float-residue bug and the two flight-run freezes — both fixed). `tsc --noEmit && vite build` clean, lint clean.
**Eyeball check (epic A-5 guardrail):** driven live at :5275 (the port was already owned by THIS checkout's vite, serving the working tree) via Playwright synthetic key events — a fresh game deals THREE life icons (was one); flying into a rock spends exactly one icon and the ship respawns at the exact screen center, nose-up, at rest, with the run continuing (saucer active); a thrust-held run walks the full 3-death ladder to gameover and returns to attract with the field carried over. Vector Battle font confirmed loaded (the "boxed" zeros are the font's glyph style). Screenshots reviewed and discarded.
**Branch:** `feat/A-15-lives-respawn-invuln` (pushed; commits `010b43e` tests, `d570baa` implementation)

**Handoff:** To The Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 474/474 tests, build/lint clean, tree clean and synced with origin, 0 smells, base verified c3571d1 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: enumerated death edges (reserves/last-ship/lives-0/invulnerable), simultaneous award+death, same-tick death+revive (pre-step-latch guard), held fire/start across transitions, float residue at window expiry, wave-spawn-into-zone waits; one finding: the Euclidean-vs-AABB metric mismatch (see assessment, [LOW]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: the diff adds zero catch blocks, zero fallbacks; `Math.max(0, …)` clamp is deliberate and pinned; every guard returns the input state unchanged (pinned by toEqual), nothing swallowed |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both low confidence) | confirmed 1 at LOW (saucer/saucer-bullet outside-radius negatives missing), dismissed 1 (exact-boundary operator deliberately unpinned — provisional-constant relationship-pin convention) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: ROM citations spot-checked ($6ED8 lives init, $02FA/$6980 spawn-timer, $2802 DIP); relocated GAME_OVER_DISPLAY_S kept its A-17 marker; stale "until A-15" comments refreshed in state.ts; one overstatement found: the radius-pin comment claims more than Euclidean guarantees (folded into the [LOW] metric finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: `shipSpawnTimer: number` with 0-sentinel matches every existing GameState timer (waveTransitionTimer, saucerSpawnTimer, displayTimer); no casts anywhere in the diff (rule-checker #1: 7 instances, 0 violations); Readonly<T> params remain A-5's repo-wide forward item, consistently absent |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: pure-core diff, no input/storage/network/DOM surface touched; no tenancy (client-only cabinet); initials/localStorage paths untouched |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain self-assessed: no dead code; the fire-register-forced-high trick avoids forking stepBullets; single consumption point (handleShipDeath) replaces inline stub — net simplification of the death seam |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations across 22 checks (13 lang-review + A1–A6 architecture + 3 story-specific), 52 constructs enumerated; GAME_OVER_DISPLAY_S re-export verified end-to-end |

**All received:** Yes (3 enabled returned — 2 clean, 1 with low-confidence findings; 6 disabled via settings and self-assessed)
**Total findings:** 2 confirmed (both LOW), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` #1–#13 + repo architecture rules A1–A6 + 3 story-specific expectations. Exhaustive enumeration by reviewer-rule-checker (52 constructs), spot-verified by Reviewer:

| Rule | Constructs checked | Verdict |
|------|--------------------|---------|
| #1 type-safety escapes | 7 files (0 `as any`/`as unknown`/`@ts-ignore`/non-null assertions — including the new test suite) | compliant |
| #2 generic/interface | 6 (all four lives.ts functions take full `GameState` per the stepGame convention; test `Partial<GameState>` overrides are the established fixture pattern) | compliant |
| #3 enums | 2 (Mode/RockSize stay unions, untouched) | N/A |
| #4 null/undefined | 2 (lives.ts:100 boolean guard correctly uses `\|\|`; `gameOver?.qualifies` reads are assertion-direct) | compliant |
| #5 modules | 2 (sim.ts:31 `export { GAME_OVER_DISPLAY_S }` is a runtime-value re-export — `export type` correctly not used; bundler resolution needs no `.js`) | compliant |
| #6–#7, #9–#11 React/async/config/input-validation/error-handling | 0 in scope (pure-core diff) | N/A |
| #8 test quality | 4 test files (no mocks, no casts, no vacuous assertions) | compliant |
| #12 perf/bundle | 3 (named relative imports only; no stringify/dynamic import) | compliant |
| #13 fix-regressions | 1 (the stub-replacement diff re-scanned against #1–#12) | compliant |
| A1 core purity (no clock/entropy) | 5 (all lives.ts functions + the dt-driven decay) | compliant |
| A2 no mutation, rng clone discipline | 5 (spread-only returns; purity pinned by structuredClone tests; lives.ts draws NO rng — respawn is deterministic in field state) | compliant |
| A3/A6 no shell imports in core / direction | 3 files (core-relative imports only) | compliant |
| A4 renderer read-only | render.ts untouched | N/A |
| A5 provisional markers | 4 — `RESPAWN_CLEAR_RADIUS` and `RESPAWN_INVULNERABILITY_S` carry `verify vs quarry (A-17)`; `GAME_OVER_DISPLAY_S` kept its marker across the move; `STARTING_LIVES` correctly cites $6ED8 with NO marker (ROM-corroborated) and documents the $2802 4-ship DIP | compliant |

### Observations

- [LOW] [EDGE] Metric mismatch between the clear-zone and the collision box: `isCenterClear` measures Euclidean distance (lives.ts:66) while `overlaps` is per-axis AABB (sim.ts:36) — a rock just outside the 264-unit circle on a diagonal (dx = dy ≈ 187 < 228 = SHIP_HITBOX + ROCK_HITBOX.large) can overlap the freshly-respawned ship. No zero-agency death exists: the 129-frame invulnerability window shields the spawn, rocks move ≥ 4 units/frame (ROCK_SPEED_MIN), and only a near-minimum-speed large rock tracing the longest chord of the overlap square (~645 units ≈ 161 frames at speed 4) could still be overlapping when the shield drops — and the player has 2.15s of full control to leave. The lives.test.ts pin comment ("can never hand the ship an instant death") claims more than the Euclidean relationship guarantees; the honest bound needs the √2 factor (radius ≥ ~323) or a metric-matched Chebyshev check. Both values are A-17-provisional — forward-carried as a Delivery Finding rather than a rework.
- [LOW] [TEST] `isCenterClear`'s saucer and saucer-bullet cases pin only the inside/blocking direction; the rock case alone pins both directions of the shared `within()` predicate (tests/lives.test.ts:216,221). Cheap symmetry adds for the next test touch — forward-carried.
- [VERIFIED] [EDGE] Held-fire across death → respawn cannot auto-fire: while dead the fire shift-register is forced high (sim.ts:143, `shipAlive ? state.firePrev : true`) so no rising edge exists, and `stepBullets` returns `firePrev: input.fire` unconditionally (bullet.ts:119) so the register keeps tracking the physical button — a press held across the whole death/revive cycle is consumed exactly once, the A-4/A-16 shift-register contract. Complies with the edge-trigger convention; pinned by the deaf-to-input test.
- [VERIFIED] [RULE] The death seam consumes POST-award lives: the bullet-vs-rock loop (applyScore, sim.ts:170-174) runs before the ship-vs-rock check and `handleShipDeath(stepped)` reads `stepped.lives` — a bonus ship earned by a shot in the killing step is a real reserve (pinned: score 9950 + small rock crossing 10000 → lives 1→2→1, mode stays 'playing'). This closes A-16's forward-carried Reviewer Question about the bonus-ship interaction. Complies with A2 (no mutation; fresh spreads).
- [VERIFIED] [SILENT] Every non-revive path of `tryRespawnShip` (blocked center, no reserves, wrong mode, ship alive — lives.ts:105-107) returns the INPUT state, not a mutated copy — pinned by four `toEqual(input)` tests; no state is silently half-updated. The `Math.max(0, …)` decay clamp (sim.ts:200) is deliberate, commented, and pinned (`s.shipSpawnTimer === 0` after expiry).
- [VERIFIED] [TYPE] `GameState.shipSpawnTimer` follows the established timer shape exactly (seconds, 0-sentinel, dt decay) — state.ts:129-133 documents the $02FA provenance and the A-14 reuse plan; `isInvulnerable` gives the 0-sentinel a named contract instead of scattering `> 0` checks. No new type escapes anywhere (rule-checker #1: 0/7).
- [VERIFIED] [DOC] ROM citations are accurate and the relocated `GAME_OVER_DISPLAY_S` kept its `verify vs quarry (A-17)` marker across the move (state.ts:86-91); the stale "until A-15 clears it" comment on `shipDestroyed` was refreshed rather than left to rot (state.ts:125-129). The lone comment overstatement (radius pin) is folded into the [LOW] metric finding above.
- [VERIFIED] [SEC] No attack surface change: the diff is pure core; localStorage/initials/registry paths untouched (verified by diffstat — no src/shell files). Nothing to sanitize, no tenancy in a client-only cabinet.
- [VERIFIED] [SIMPLE] The seam got simpler, not more complex: A-16's 20-line inline stub with its own qualifies construction is replaced by one edge-guarded call to a named, unit-tested consumption point (`handleShipDeath`), and `qualifiesForHighScore` dropped out of sim.ts's imports entirely. No dead code introduced; `let stepped` + two guarded reassignments read linearly.
- [VERIFIED] [TEST] Dev's ship.test.ts immortalization (shipSpawnTimer: Infinity on the 2400-tick drag run and 600-tick wrap run) restores the exact pre-A-15 code path for those physics measurements (`shipDestroyed` can never latch, so `stepShip` always runs) without weakening a single physics assertion — corroborated independently by reviewer-test-analyzer, which also swept rocks/waves/saucer/bullet suites and found no other long-run fixture exposed to the same interference.

**Data flow traced:** trigger input (fire held) → `stepBullets` rising-edge gate → bullet → `applyScore` (score + bonus lives) → ship-vs-rock overlap on post-move positions → destruction EDGE → `handleShipDeath` (post-award lives; decrement-and-play or terminal gameover with `qualifies` computed off the persisted board) → dead wait (`isCenterClear` over rocks/saucer/saucer-shots each tick, player shots excluded) → `tryRespawnShip` (center, rest, dir 64, window armed) → HUD lives icons + ship-draw gate (render.ts:368, unchanged) → eventual gameover feeds A-16's initials → `insertHighScore` → localStorage. Safe at every hop; no new I/O.
**Wiring:** sim consumed by the unchanged main loop; Dev eyeball-verified live at :5275 (3 icons dealt, one icon spent per death, center respawn observed, full ladder to gameover→attract).
**Error handling:** pure functions with total inputs; `saucer: null` handled (lives.ts:68); `gameOver` stays null on non-terminal deaths (pinned); no throw paths added.
**Pattern observed:** single-consumption-point death seam (lives.ts:79 `handleShipDeath`) with edge-guarded invocation (sim.ts:233) — the exact seam shape A-13 (saucer collisions) and A-14 (failed hyperspace) must route through; called out in Delivery Findings.

### Devil's Advocate

Assume this code is broken; argue it. **Attack 1 — the spawn camper.** Revive, hands off the controls. A large rock that sat in a corner sliver of the collision square (outside the Euclidean clear circle, inside the per-axis AABB) at revive time drifts at minimum speed along the longest chord; 161 frames later it is still overlapping when the 129-frame shield closes, and the idle ship dies without ever being touchable. This is real geometry — the metric mismatch is my [LOW] finding — but it demands a near-minimum-speed large rock, a corner-sliver entry, a chord-hugging heading, AND a player who ignores 2.15 seconds of full control after watching the ship deliberately wait for a clear center. Filed, forward-carried to A-17's radius verification; not a blocking defect. **Attack 2 — shoot from the grave.** Hold fire while dead, or mash it: the forced-high shift register kills every rising edge, and because `stepBullets` returns the real button state, releasing and pressing while dead still spawns nothing, yet a button held across the revive doesn't auto-fire either. Pinned both ways. **Attack 3 — farm lives while dead.** In-flight shots still score during the death wait; crossing 10,000 mid-wait adds a reserve — intended (your last volley scores in the ROM too), and in the unreachable lives-0 fixture niche such a bonus could even revive a free-play corpse; unreachable in real play since terminal death fires at zero. Noted below for A-13's seam discipline. **Attack 4 — leak the timer across modes.** Try to enter gameover or attract with a live shield: impossible — a hit requires the decayed timer ≤ 0, so gameover entry always carries 0, and the attract deal rebuilds from `initialState` (timer 0). **Attack 5 — break determinism.** `lives.ts` draws no rng at all; the ladder golden test replays the full death→wait→revive→expire cycle twice to deep equality including the seed. Attacks 2, 4, 5 survived; attack 1 and 3 produced the LOW finding and a forward-carry.

**Handoff:** To Winston Smith (SM) for finish (PR + merge + archive).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): `stepGame` runs `stepShip`/`stepBullets` unconditionally — before A-15, a destroyed ship in the legacy lives-0 niche could still steer and fire invisibly (nothing gates firing on the latch). lives.test.ts pins dead-ship input-independence; GREEN must add the gate. Affects `src/core/sim.ts` (gate ship integration + firing while `shipDestroyed`). *Found by TEA during test design.*
- **Question** (non-blocking): A-14 (hyperspace), when it lands, should reuse `GameState.shipSpawnTimer` (its own $30/48-frame reappearance value), share `isCenterClear`'s seam for its safety check (the context locates both in the same ROM routine range `$6EBB–$6EC4`), and add the hidden-window visibility handling A-15 deliberately did not introduce. Affects `src/core/lives.ts` / A-14 planning. *Found by TEA during test design.*
- **Improvement** (non-blocking): A-17's quarry swap-worklist grows three A-15 items: `RESPAWN_CLEAR_RADIUS` (the geometric clear-zone deliberately deviates from the ROM's apparent count-based heuristic — the quarry should settle geometric-vs-count), `RESPAWN_INVULNERABILITY_S` (129 frames rests on one source's routine-address citation), and `STARTING_LIVES`' 4-ship DIP alternative. Dev must carry `verify vs quarry (A-17)` markers on the first two in `core/lives.ts`. Affects `asteroids/src/core/lives.ts` (marker comments). *Found by TEA during test design.*
- **Conflict** (non-blocking, process): `context-story-A-15.md`'s Code Shape section was authored against a projected code shape (`Ship.alive` from A-8, `Ship.spawnTimer`/`visible`/`tickSpawnTimer` from A-14) that never landed — the epic's execution order inverted (A-15 taken ahead of A-12/13/14, as A-16 was). Field-level prescriptions were adapted (see Design Deviations); the behavioral contract is unchanged. Affects context authoring (Architect: mark cross-story field assumptions as conditional on landing order). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): The respawned ship has NO visual invulnerability indicator — the classic blink is explicitly out of A-15's scope, but the eyeball run showed a player cannot tell when the shield drops (a thrust-held run walks the whole 3-death ladder in ~10 seconds without any cue). Affects `src/shell/render.ts` (invulnerability blink — A-19 feel pass, or A-16-style HUD polish). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Long `stepGame`-driven physics tests are exposed to wave-director interference by design (any playing-mode run ≥ ~2s grows rocks); ship.test.ts's two long runs now use `shipSpawnTimer: Infinity` as the isolation idiom — worth reusing for any future long flight fixture instead of rediscovering the failure. Affects `asteroids/tests/` (fixture convention). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): Metric mismatch — `isCenterClear` is Euclidean while ship-vs-rock overlap is per-axis AABB: a rock just outside the 264-unit circle on a diagonal (dx = dy ≈ 187 < 228) can overlap the freshly-respawned ship. Harmless today (the 129-frame invulnerability window shields the spawn and rocks move ≥ 4 units/frame; only a chord-hugging minimum-speed large rock outlasts the shield, and the player has 2.15s of control), but A-17's clear-zone verification should either bump the radius past √2·(SHIP_HITBOX + ROCK_HITBOX.large) ≈ 323, switch to a metric-matched Chebyshev check, or adopt the ROM's count-based rule — and the lives.test.ts radius-pin comment should stop claiming "never an instant death" until one of those lands. Affects `asteroids/src/core/lives.ts` + `tests/lives.test.ts` (A-17 swap worklist). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `isCenterClear`'s saucer and saucer-bullet cases pin only the blocking direction; add outside-radius negative counterparts (mirroring the rock pair) on the next lives.test.ts touch. Affects `asteroids/tests/lives.test.ts` (two one-line tests). *Found by Reviewer during code review (via test-analyzer, confirmed at LOW).*
- **Question** (non-blocking): A-13 (saucer collisions) and A-14 (failed hyperspace) MUST route their new death signals through `handleShipDeath` on a destruction EDGE (never per-tick) and any saucer-kill scoring through `applyScore` BEFORE the death seam runs, so the post-award-lives ordering pinned here ("bonus ship earned in the killing step is honored") holds for every death cause. A-13 should also decide whether saucers/saucer-shots colliding with an INVULNERABLE ship are blocked by the same `isInvulnerable` gate (they should be). Affects `asteroids/src/core/sim.ts` (future death seams). *Found by Reviewer during code review.*
- **Note** (non-blocking): In-flight player shots keep scoring during the death wait (intended, ROM-plausible); in the fixture-only lives-0 niche a boundary-crossing shot can hand the corpse a reserve and revive it. Unreachable in real play (terminal death fires at lives 0). Documented so nobody "fixes" it into a real-play behavior change without a story. Affects nothing today. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 6 findings (1 Gap, 0 Conflict, 1 Question, 4 Improvement)
**Blocking:** None

- **Gap:** `stepGame` runs `stepShip`/`stepBullets` unconditionally — before A-15, a destroyed ship in the legacy lives-0 niche could still steer and fire invisibly (nothing gates firing on the latch). lives.test.ts pins dead-ship input-independence; GREEN must add the gate. Affects `src/core/sim.ts`.
- **Improvement:** A-17's quarry swap-worklist grows three A-15 items: `RESPAWN_CLEAR_RADIUS` (the geometric clear-zone deliberately deviates from the ROM's apparent count-based heuristic — the quarry should settle geometric-vs-count), `RESPAWN_INVULNERABILITY_S` (129 frames rests on one source's routine-address citation), and `STARTING_LIVES`' 4-ship DIP alternative. Dev must carry `verify vs quarry (A-17)` markers on the first two in `core/lives.ts`. Affects `asteroids/src/core/lives.ts`.
- **Improvement:** The respawned ship has NO visual invulnerability indicator — the classic blink is explicitly out of A-15's scope, but the eyeball run showed a player cannot tell when the shield drops (a thrust-held run walks the whole 3-death ladder in ~10 seconds without any cue). Affects `src/shell/render.ts`.
- **Improvement:** Long `stepGame`-driven physics tests are exposed to wave-director interference by design (any playing-mode run ≥ ~2s grows rocks); ship.test.ts's two long runs now use `shipSpawnTimer: Infinity` as the isolation idiom — worth reusing for any future long flight fixture instead of rediscovering the failure. Affects `asteroids/tests/`.
- **Improvement:** `isCenterClear`'s saucer and saucer-bullet cases pin only the blocking direction; add outside-radius negative counterparts (mirroring the rock pair) on the next lives.test.ts touch. Affects `asteroids/tests/lives.test.ts`.
- **Question:** A-13 (saucer collisions) and A-14 (failed hyperspace) MUST route their new death signals through `handleShipDeath` on a destruction EDGE (never per-tick) and any saucer-kill scoring through `applyScore` BEFORE the death seam runs, so the post-award-lives ordering pinned here ("bonus ship earned in the killing step is honored") holds for every death cause. A-13 should also decide whether saucers/saucer-shots colliding with an INVULNERABLE ship are blocked by the same `isInvulnerable` gate (they should be). Affects `asteroids/src/core/sim.ts`.

### Downstream Effects

Cross-module impact: 6 findings across 5 modules

- **`asteroids/src/core`** — 2 findings
- **`asteroids`** — 1 finding
- **`asteroids/tests`** — 1 finding
- **`src/core`** — 1 finding
- **`src/shell`** — 1 finding

### Deviation Justifications

9 deviations

- **Dead flag stays `GameState.shipDestroyed` — no `Ship.alive` (or `Ship.visible`) field**
  - Rationale: The context predates A-8's landing ("A-8 will detect…") and assumed a Ship-level flag; A-8 shipped the latch as `GameState.shipDestroyed` with every consumer already wired (sim edge detection, render.ts:368 draw gate, saucer.ts:118 spawn gate). A duplicate boolean invites divergence; `visible` is unneeded because the renderer already gates the ship on the latch
  - Severity: minor
  - Forward impact: A-14 adds visibility only for its hidden hyperspace window; everything else keeps reading the latch
- **Invulnerability timer is `GameState.shipSpawnTimer`, INTRODUCED by A-15 (not reused from A-14)**
  - Rationale: The epic's execution order inverted (A-15 taken ahead of A-14). `GameState` is where every sim timer already lives (`waveTransitionTimer`, `saucerSpawnTimer`, `displayTimer`); a new REQUIRED `Ship` field would break dozens of existing ship fixture literals across pre-A-15 suites for zero behavioral gain
  - Severity: minor
  - Forward impact: A-14 reuses `GameState.shipSpawnTimer` with its own $30 (48-frame) value; `isInvulnerable` stays the single collision-shield predicate
- **AC-1 adapted: boot stays lives 0; STARTING_LIVES (3) is dealt on the start press**
  - Rationale: A-16 landed (review-approved) the attract-boot model where `initialState` is the idle cabinet and lives are dealt on the start edge; booting attract with 3 lives would draw phantom life icons on the A-16 HUD. The AC's intent — a run begins with 3 ships — is pinned at the seam where a run begins
  - Severity: minor
  - Forward impact: none — the deal already flows through `STARTING_LIVES`
- **A-16's reserves-forfeit pin removed (sanctioned replacement)**
  - Rationale: The two contracts are mutually exclusive by design; the A-16 archive explicitly scheduled this replacement for A-15
  - Severity: minor
- **Lives-0 free-play niche preserved (spec is silent)**
  - Rationale: Every pre-A-16 suite (collision/score/waves) runs long lives-0 simulations that must not mode-flip mid-assertion; A-16 deliberately preserved the niche and A-15 keeps it — a real game can never reach it (gameover fires at 0)
  - Severity: minor
  - Forward impact: the niche disappears naturally if play mode ever becomes reachable only through the start deal
- **`GAME_OVER_DISPLAY_S` relocated from sim.ts to state.ts (re-exported from sim.ts)**
  - Rationale: `handleShipDeath` (core/lives.ts) initialises the gameover phase and needs the value; sim.ts imports lives.ts, so importing sim from lives would create an import cycle. state.ts already hosts game-rule constants (STARTING_LIVES precedent)
  - Severity: minor
  - Forward impact: none — both import paths resolve to the same constant
- **Respawn attempt gated on the PRE-step latch (≥ 1 full tick dead)**
  - Rationale: Without the guard, a ship dying away from an already-clear center would die and teleport to center in one tick — never visibly dead, which reads as a glitch and skips the death beat entirely
  - Severity: minor
  - Forward impact: none — tests pin next-tick revival, which this satisfies
- **Dead ship's ghost state is frozen, not integrated**
  - Rationale: The corpse is invisible and `tryRespawnShip` overwrites pos/vel/dir on revival, so integrating ghost physics is dead computation; freezing is the minimal implementation of "no ship to steer"
  - Severity: minor
  - Forward impact: none — lives.test.ts pins input-independence, which freezing satisfies
- **Sanctioned test-infrastructure update: two ship.test.ts flight runs immortalized**
  - Rationale: Pre-A-15 an incidental mid-run rock collision was cosmetic (the latch didn't stop flight); A-15 deliberately freezes a dead ship, so an incidental death froze the trajectory mid-measurement and failed both tests. These tests isolate flight physics — collision behavior belongs to collision.test.ts / lives.test.ts. Immortality removes the cross-suite interference without weakening any physics pin
  - Severity: minor
  - Forward impact: none — flag for Reviewer's attention as a Dev-touched test file

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Dead flag stays `GameState.shipDestroyed` — no `Ship.alive` (or `Ship.visible`) field**
  - Spec source: context-story-A-15.md, Technical Approach ("Code shape")
  - Spec text: "Extend Ship with alive: boolean (default true), alongside A-14's visible/spawnTimer. Dead ship: alive = false, visible = false"
  - Implementation: Tests pin aliveness on the existing `GameState.shipDestroyed` latch (A-8); no `Ship.alive`/`Ship.visible` is introduced
  - Rationale: The context predates A-8's landing ("A-8 will detect…") and assumed a Ship-level flag; A-8 shipped the latch as `GameState.shipDestroyed` with every consumer already wired (sim edge detection, render.ts:368 draw gate, saucer.ts:118 spawn gate). A duplicate boolean invites divergence; `visible` is unneeded because the renderer already gates the ship on the latch
  - Severity: minor
  - Forward impact: A-14 adds visibility only for its hidden hyperspace window; everything else keeps reading the latch
  - → ✓ ACCEPTED by Reviewer: A-8's landed latch is the single source of truth with every consumer wired (sim edge, render.ts:368, saucer.ts:118); a duplicate `Ship.alive` is a divergence bug waiting to happen. The context's field plan predates A-8's landing.

- **Invulnerability timer is `GameState.shipSpawnTimer`, INTRODUCED by A-15 (not reused from A-14)**
  - Spec source: context-story-A-15.md, Technical Approach (invulnerability discovery)
  - Spec text: "This reuses A-14's Ship.spawnTimer field exactly — same field, same 'nonzero ⇒ invulnerable' meaning, different trigger value"
  - Implementation: A-14 is still in backlog (no such field exists anywhere); tests pin a NEW `GameState.shipSpawnTimer` (seconds, 0 = mortal, decays by dt, clamped at 0) with `isInvulnerable(state)` in `core/lives.ts`
  - Rationale: The epic's execution order inverted (A-15 taken ahead of A-14). `GameState` is where every sim timer already lives (`waveTransitionTimer`, `saucerSpawnTimer`, `displayTimer`); a new REQUIRED `Ship` field would break dozens of existing ship fixture literals across pre-A-15 suites for zero behavioral gain
  - Severity: minor
  - Forward impact: A-14 reuses `GameState.shipSpawnTimer` with its own $30 (48-frame) value; `isInvulnerable` stays the single collision-shield predicate
  - → ✓ ACCEPTED by Reviewer: GameState is demonstrably where every sim timer lives (waveTransitionTimer, saucerSpawnTimer, displayTimer); a required Ship field would have broken dozens of fixture literals for zero behavioral gain. Verified the field follows the timer shape exactly (state.ts:129-133).

- **AC-1 adapted: boot stays lives 0; STARTING_LIVES (3) is dealt on the start press**
  - Spec source: context-story-A-15.md, AC-1
  - Spec text: "initialState() yields lives === STARTING_LIVES (3)"
  - Implementation: state.test.ts's A-16 pin (`initialState().lives === 0`, attract boot) is preserved; lives.test.ts pins `STARTING_LIVES === 3` and that a start press deals exactly 3 (stepAttract's existing deal seam)
  - Rationale: A-16 landed (review-approved) the attract-boot model where `initialState` is the idle cabinet and lives are dealt on the start edge; booting attract with 3 lives would draw phantom life icons on the A-16 HUD. The AC's intent — a run begins with 3 ships — is pinned at the seam where a run begins
  - Severity: minor
  - Forward impact: none — the deal already flows through `STARTING_LIVES`
  - → ✓ ACCEPTED by Reviewer: A-16's review-approved attract-boot model outranks the projected AC wording; the AC's intent (a run begins with 3 ships) is pinned at the deal seam where a run actually begins, and phantom attract-mode life icons are avoided.

- **A-16's reserves-forfeit pin removed (sanctioned replacement)**
  - Spec source: sprint/archive/A-16-session.md (Reviewer round 2 + Delivery Findings) + context-story-A-15.md Problem
  - Spec text: "A-15 replaces the terminal branch with decrement + safe-respawn + invulnerability while reserves remain, keeping the pinned 'destroyed with none left → gameover' edge"
  - Implementation: modes.test.ts's 'ends the run even with bonus ships in reserve' test deleted; the decrement-and-keep-playing contract, the preserved last-ship edge, and the bonus-ship-in-the-killing-step case are pinned in lives.test.ts
  - Rationale: The two contracts are mutually exclusive by design; the A-16 archive explicitly scheduled this replacement for A-15
  - Severity: minor
  - → ✓ ACCEPTED by Reviewer: the A-16 archive explicitly scheduled this replacement; the superseding lives.test.ts pins cover the same fixture shape with the corrected expectation plus the sharper bonus-boundary case (corroborated by reviewer-test-analyzer: no orphaned contract).

- **Lives-0 free-play niche preserved (spec is silent)**
  - Spec source: context-story-A-15.md, Acceptance Criteria (no case for a lives-0 destruction during play)
  - Spec text: (none — the spec only covers deaths at lives ≥ 1)
  - Implementation: lives.test.ts pins that a destruction edge at lives 0 latches `shipDestroyed` sticky with no decrement, no gameover, and no later respawn
  - Rationale: Every pre-A-16 suite (collision/score/waves) runs long lives-0 simulations that must not mode-flip mid-assertion; A-16 deliberately preserved the niche and A-15 keeps it — a real game can never reach it (gameover fires at 0)
  - Severity: minor
  - Forward impact: the niche disappears naturally if play mode ever becomes reachable only through the start deal
  - → ✓ ACCEPTED by Reviewer: unreachable in real play (terminal death fires at zero) and it protects 15 pre-existing suites' long-run fixtures; 474/474 green confirms the guard works. One quirk noted in my findings: in-flight scoring can hand the niche corpse a reserve and revive it — fixture-only, harmless.

### Dev (implementation)

- **`GAME_OVER_DISPLAY_S` relocated from sim.ts to state.ts (re-exported from sim.ts)**
  - Spec source: A-16's landed code (sim.ts owned the constant); context-story-A-15.md is silent on placement
  - Spec text: n/a (placement was an A-16 implementation fact, not a spec clause)
  - Implementation: The constant now lives in state.ts beside STARTING_LIVES; sim.ts re-exports it so every existing import path (`from '../src/core/sim'`) still works
  - Rationale: `handleShipDeath` (core/lives.ts) initialises the gameover phase and needs the value; sim.ts imports lives.ts, so importing sim from lives would create an import cycle. state.ts already hosts game-rule constants (STARTING_LIVES precedent)
  - Severity: minor
  - Forward impact: none — both import paths resolve to the same constant
  - → ✓ ACCEPTED by Reviewer: cycle avoidance is the right call and the precedent (STARTING_LIVES in state.ts) already existed; re-export verified end-to-end by rule-checker (tsc + 474 tests through the '../src/core/sim' import path).

- **Respawn attempt gated on the PRE-step latch (≥ 1 full tick dead)**
  - Spec source: context-story-A-15.md, Technical Approach ("Code shape")
  - Spec text: "core/sim.ts's stepGame calls tryRespawnShip every 'playing' tick (cheap no-op when the ship is already alive)"
  - Implementation: `tryRespawnShip` runs every playing tick but only when `state.shipDestroyed` was already true at step entry — a ship destroyed this very step cannot revive in the same step
  - Rationale: Without the guard, a ship dying away from an already-clear center would die and teleport to center in one tick — never visibly dead, which reads as a glitch and skips the death beat entirely
  - Severity: minor
  - Forward impact: none — tests pin next-tick revival, which this satisfies
  - → ✓ ACCEPTED by Reviewer: the same-tick death+teleport it prevents would read as a glitch and skip the death beat; one full dead tick is the minimum honest implementation of "the ship visibly waits".

- **Dead ship's ghost state is frozen, not integrated**
  - Spec source: context-story-A-15.md, Technical Approach ("Dead ship: … excluded from rotate/thrust/input handling and from being a collision target")
  - Spec text: as quoted — silent on whether the corpse keeps drifting under inertia
  - Implementation: While `shipDestroyed`, `stepShip` is skipped entirely (pos/vel/dir frozen where it fell); the fire shift-register is held high so no shot can spawn, while shots already in flight keep flying and aging; `firePrev` keeps tracking the physical button so a press held across death → respawn is consumed once
  - Rationale: The corpse is invisible and `tryRespawnShip` overwrites pos/vel/dir on revival, so integrating ghost physics is dead computation; freezing is the minimal implementation of "no ship to steer"
  - Severity: minor
  - Forward impact: none — lives.test.ts pins input-independence, which freezing satisfies
  - → ✓ ACCEPTED by Reviewer: the corpse is invisible and respawn overwrites pos/vel/dir, so ghost integration is dead computation; the frozen ghost also keeps the deaf-to-input pin trivially stable.

- **Sanctioned test-infrastructure update: two ship.test.ts flight runs immortalized**
  - Spec source: tests/ship.test.ts (A-3 physics suite) vs A-15's dead-ship semantics
  - Spec text: the drag run ("never reverses direction and brings the ship to rest", 2400 ticks) and the wrap run ("provably wraps both axes at speed", 600 ticks) drive stepGame long enough that the A-10 wave director spawns rocks into the flight path
  - Implementation: Both fixtures now set `shipSpawnTimer: Infinity` (permanent invulnerability) with an explanatory comment; every physics assertion is untouched
  - Rationale: Pre-A-15 an incidental mid-run rock collision was cosmetic (the latch didn't stop flight); A-15 deliberately freezes a dead ship, so an incidental death froze the trajectory mid-measurement and failed both tests. These tests isolate flight physics — collision behavior belongs to collision.test.ts / lives.test.ts. Immortality removes the cross-suite interference without weakening any physics pin
  - Severity: minor
  - Forward impact: none — flag for Reviewer's attention as a Dev-touched test file
  - → ✓ ACCEPTED by Reviewer: scrutinized as a Dev-touched test file and independently corroborated by reviewer-test-analyzer — Infinity restores the exact pre-A-15 code path for the physics measurements, no physics assertion weakened, and the sweep of other suites found no similar exposure elsewhere.

### Reviewer (audit)

- All nine logged deviations (5 TEA, 4 Dev) audited and stamped ACCEPTED above. **No undocumented deviations found:** the implementation matches the context's behavioral spec everywhere it wasn't explicitly adapted-and-logged; the one thing the spec prescribed that the code implements imperfectly (the geometric clear-zone's Euclidean metric vs the AABB collision metric) is a finding against the provisional constant, not an unlogged spec divergence — the context itself flags the whole clear-zone shape as `verify vs quarry (A-17)`.