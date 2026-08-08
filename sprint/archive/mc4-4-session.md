---
story_id: "mc4-4"
jira_key: "mc4-4"
epic: "mc4"
workflow: "tdd"
repos: "arcade"
---
# Story mc4-4: Compose waves into stepGame, HUD wave/multiplier readout, and a seeded multi-wave playthrough

## Story Details
- **ID:** mc4-4
- **Jira Key:** mc4-4
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 3
- **Priority:** p2
- **Stack Parent:** none (no dependencies beyond mc4-1/2/3, all done)
- **Branch:** feat/mc4-4-compose-waves-stepgame-hud
- **PR:** 108

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T13:39:21Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T12:45:50Z | 2026-08-08T12:48:02Z | 2m 12s |
| red | 2026-08-08T12:48:02Z | 2026-08-08T13:05:49Z | 17m 47s |
| green | 2026-08-08T13:05:49Z | 2026-08-08T13:23:49Z | 18m |
| review | 2026-08-08T13:23:49Z | 2026-08-08T13:30:58Z | 7m 9s |
| red | 2026-08-08T13:30:58Z | 2026-08-08T13:34:53Z | 3m 55s |
| green | 2026-08-08T13:34:53Z | 2026-08-08T13:36:18Z | 1m 25s |
| review | 2026-08-08T13:36:18Z | 2026-08-08T13:39:21Z | 3m 3s |
| finish | 2026-08-08T13:39:21Z | - | - |

## Sm Assessment

**Story:** mc4-4 — compose the missile-command wave model into the composition root (`stepGame`/`createGame`), surface wave + multiplier in the HUD, and add a seeded multi-wave playthrough test. 3pt, tdd, p2. Game: `plugins/missile-command/`.

**Readiness verified at setup:**
- Dependencies mc4-1, mc4-2, mc4-3 are all `status: done`.
- The wave-end resolution + per-wave multiplier model already live in `src/core/` (`score.ts`: SMULTI/MAXMUL/scoreMultiplier; a wave module holds the wave-end reducers). `src/core/game.ts` `createGame`/`stepGame` reference wave in comments only — the model is NOT yet composed into the per-frame reducer. The story premise is accurate and unstarted; no stale-description correction was needed.
- Cited files exist: `src/core/game.ts`, `src/shell/render.ts`. The new test `tests/mc4-playthrough.test.ts` should follow the existing `tests/mc3-playthrough.test.ts` shape.
- No sibling contention: `git branch -r | grep mc4-4` was empty; a-3's only live session is jt9-54 (joust).
- All 4 ACs copied verbatim into the context (diffed against epic YAML).

**Claim pushed:** epic stamp (`in_progress`) + context committed as `4c84b3eb` on `feat/mc4-4-compose-waves-stepgame-hud`, branch pushed to `origin` (lights the sibling probe).

**For TEA (RED):** Write the three ACs' failing tests. AC3's playthrough is the load-bearing one — a single seeded run across ≥2 waves asserting (a) wave-1 ICBM descent measurably slower than a later wave, (b) end-of-wave bonus applied, (c) cities regenerated + ammo refilled between waves, (d) multiplier increasing, (e) identical seeds → identical states. HUD-figure rule: render draws the CORE's score/ammo verbatim, not re-derived copies (AC2). Keep the sim-clock-free / core-boundary purity rule intact — wave/multiplier logic stays in `src/core`, render only reads it.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking, for Dev):** the story's prose file list names only `game.ts` + `render.ts`, but the change set MUST also include `src/core/spawn.ts`. `icbm.ts:20` explicitly defers to this story: "wiring the spawner to launch each wave's ICBMs at `waveSchedule(wave).velocity` is mc4-4." Today `spawnIcbms` calls `launchIcbm(origin, target)` at the default unit velocity (1); to make AC3's descent ramp real, the spawner must receive the wave (or its velocity) and thread `waveSchedule(state.wave).velocity` into each launch. The descent tests fail until this lands. This is faithful to the story ("compose the wave model into stepGame"), just under-listed in the prose.
- **Question (non-blocking, for Dev/Reviewer) — regen entitlement at mc4-4:** `regenerateCities(cities, reserve, cap)` takes a `reserve` that wave-transition.test.ts documents as "the mc4-3 bonus-city award feeds `reserve`" — but the bonus-city AWARD is **mc4-5** (CHEKBO/BONINL), not yet shipped. The mc4-4 AC nonetheless requires "cities regenerated between waves." The faithful reading of REGEN (`X = min(PLIVES, NCITY)`) at a fresh game's first wave, with no bonus cities earned, is `PLIVES = START_CITIES`, so the board heals up to `min(START_CITIES, NCITY)` = 6. The test asserts exactly that (`aliveCities(w2) === Math.min(START_CITIES, NCITY)` and strictly `> survivingCities`). If the epic intends regen to be a no-op until mc4-5 feeds a real reserve, that CONTRADICTS the mc4-4 AC and should be raised with the user before GREEN — do not silently make regen inert.
- **Note (non-blocking):** `createGame` seeds `remaining: NICBMS` (8, the mc3 placeholder), which differs from `waveSchedule(INITIAL_WAVE).count` (12). The tests do NOT pin the opening budget (either value lets wave-1 ICBMs launch, which is all AC3's descent check needs), leaving Dev free to re-seed it from the schedule for consistency or leave it. Flagged so the choice is deliberate, not accidental.

### Dev (implementation)
- **Gap** (non-blocking): the OPENING wave's ICBM budget stays `NICBMS` (8) while every ADVANCED wave re-seeds from the mc4-1 schedule (`nextWaveBudget` → `ICBWAV`), so wave 1 launches 8 ICBMs but wave 2 launches 15. Faithful REV-01 has wave 1 = `ICBWAV[0]` = 12. Affects `plugins/missile-command/src/core/game.ts` (`createGame` would seed `remaining: waveSchedule(INITIAL_WAVE).count`) — but that reddens three mc3-cited assertions (`game.test.ts:69,87,88` pin `remaining === NICBMS`) and touches the NICBMS budget model, so it is beyond mc4-4's compose scope. **Needs a filed follow-up** (an mc4-1 revisit or new story) to align the opening budget with `ICBWAV[0]` and reconcile NICBMS's role (screen/budget ceiling vs per-wave count). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `mc3-playthrough.test.ts:89` asserts `phase ∈ {play, over}` for every frame of a seeded run — but the phase set now includes `'between'` (mc4-4). It passes today only because its seeds/frame-budgets never reach a wave-end (wave-1 descent is slow). Affects `plugins/missile-command/tests/mc3-playthrough.test.ts` (widen the allowed set to `{play, between, over}` before a longer/faster run trips it). *Found by Dev during implementation.*

## Tea Assessment

**RED delivered.** One new file `plugins/missile-command/tests/mc4-playthrough.test.ts` (the single test file the story authorises). 27 tests: **18 fail (the wiring mc4-4 must add), 9 pass (preserved-behaviour guards).** `npm run lint` (tsc --noEmit) stays GREEN; the rest of the missile-command project is untouched (773/773 other tests pass, 41 other files).

**Scope discipline:** mc4-4 is pure COMPOSITION. The pure reducers are already exhaustively pinned — `wave-transition.test.ts` (bonus/regen/refill/nextWaveBudget/phase beat, incl. the round-1 mutant-hardened regen teeth), `score-multiplier.test.ts` (SMULTI), `wave.test.ts` (schedule). This file does NOT re-test them; it proves `createGame`/`stepGame`/`spawnIcbms`/`drawFrame` WIRE them. Every expected value is derived from the cited core constants/functions (INITIAL_WAVE, waveSchedule, waveEndBonus, nextWaveBudget, scoreMultiplier, START_CITIES, NCITY, MAXMIS, MXICON) — no fresh literal (the mc4-1 relative-only lesson).

**What each block pins (→ AC):**
- **AC1** — createGame seeds `wave`/`multiplier`; a WINNABLE wave-end advances the wave + banks the exact `waveEndBonus` + regenerates + refills + re-seeds the budget; a LOST wave-end (all cities dead) flips to `over`, does NOT advance, banks no bonus, and stays frozen.
- **AC2** — the HUD draws the wave number and multiplier (wave 7 / ×4 chosen so the digits `7` and `4` appear nowhere else in score/ammo, making each match attributable) while still drawing `state.score` (90210, unreachable by re-derivation) and base ammo verbatim — the HUD-figure rule.
- **AC3** — descent measurably slower on wave 1 than wave 2 (observed ICBM velocity === `waveSchedule(wave).velocity`, strictly increasing); the multiplier climbs (×1 at wave 1 → ×2 by wave 3); the whole composed run and the wave-end resolution are deterministic in the seed.
- **AC4** — the pipeline gate (vitest / lint / orchestrator) is Dev's GREEN target; no test asserts it here (citation/purity gates auto-scan any new `src/core` constants Dev adds).

**RED-import strategy:** every module/function this file touches already exports, so no dynamic-import dance — the only absent surface is two GameState fields, read through a widened `Partial<WaveState>` cast that keeps tsc green and reads `undefined` (→ a `.toBe(number)` RED) until Dev adds them.

**Two things Dev must not miss (see Delivery Findings):** (1) `spawn.ts` IS in scope (icbm.ts:20 deferral) though the prose file list omits it; (2) the regen-entitlement question — the AC demands visible regeneration, and the faithful mc4-4 value is `min(START_CITIES, NCITY)`; if the epic meant regen to stay inert until mc4-5, raise it before GREEN.

### Rule Coverage (project rules → tests)
- **Core purity boundary** (`src/core` must be clock-free/entropy-free/shell-free; scanned by `purity.test.ts`): honoured by keeping all wave/multiplier logic in core and asserting the composed run is deterministic in the seed (no wall clock). The purity sweep auto-guards Dev's src/core edits.
- **HUD-figure rule** (shell renders the core's verbatim figures, never a re-derived copy): pinned by the AC2 block — score `90210` is unreachable by recomputation, and ammo/wave/multiplier are read from state.
- **No un-cited numeric literal in `src/core`** (`citations.test.ts`): a TEST-file concern only insofar as Dev's GREEN adds constants; this file introduces none (all values derived from imported core symbols). Any new constant Dev cites is auto-scanned.
- **Determinism / seeded RNG**: pinned directly (identical-seed replay, seed-divergence, deterministic wave-end resolution).
- **Meaningful-assertion self-check**: every test asserts a concrete value; the 9 green tests are preserved-behaviour guards (determinism, MXICON cap, game-over phase flip, HUD score/ammo), not vacuous — each compares real values, none relies on an `undefined === undefined` pass.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/game.ts` — `GameState` gains `wave` + `multiplier`; `createGame` seeds `INITIAL_WAVE` + `scoreMultiplier(INITIAL_WAVE)`; `stepGame` launches at `waveSchedule(wave).velocity`, scores at `scoreKills(..., wave)`, and runs the two-phase END OF WAVE resolution (enter `'between'` on wave-clear → resolve bonus/regen/refill/advance next frame; game-over still wins).
- `plugins/missile-command/src/core/spawn.ts` — `spawnIcbms` takes a `velocity` (default 1, back-compatible) and launches each ICBM at it (the icbm.ts:20 deferral).
- `plugins/missile-command/src/shell/render.ts` — HUD draws `WAVE <n>  x<mult>` from `state.wave`/`state.multiplier`; SCORE/AMMO unchanged (HUD-figure rule).
- `plugins/missile-command/tests/game.test.ts`, `plugins/missile-command/tests/sound-events.test.ts` — two sibling setups held mid-wave so their within-wave invariants survive mc4-4 regeneration (see Design Deviations; subjects unchanged).

**Tests:** GREEN across the full AC4 gate —
- `npx vitest run --project missile-command`: **791/791** (mc4-playthrough 27/27).
- `npm run lint` (tsc --noEmit): clean.
- `npm run test:orchestrator`: **408/408**.
- full-fleet `npx vitest run`: **13624 passed, 1 todo** (no other game regressed).

**Design note:** chose the two-phase `'between'` beat over a same-frame collapse for fidelity (destruction visible before REGEN) and to actually use mc4-2's `nextWavePhase`/`resumePlay`. Regen entitlement is `START_CITIES` pending mc4-5's bonus-city award. Two Delivery Findings filed (opening-wave budget still NICBMS not ICBWAV[0]; mc3-playthrough phase-set should include `'between'`) — neither blocks mc4-4.

**Branch:** feat/mc4-4-compose-waves-stepgame-hud (pushed)

**Handoff:** To verify (TEA).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Two-phase end-of-wave resolution (a 'between' beat), not a same-frame collapse**
  - Spec source: context-story-mc4-4.md, AC1 ("stepGame runs the wave-end resolution ... and advances the wave")
  - Spec text: the AC does not prescribe whether the bonus/regen/advance happen on the same frame as the wave's final damage or a frame later
  - Implementation: `stepGame` enters `'between'` on the frame the budget is spent and the screen clears (showing that frame's final destruction), then resolves bonus → regen → refill → advance → `resumePlay` on the NEXT frame (the `'between'` branch). Uses mc4-2's `nextWavePhase`/`resumePlay` as designed.
  - Rationale: the ROM's END OF WAVE is a distinct phase entered after the screen clears — a city destroyed by the wave's last ICBM is visibly dead before REGEN revives it. A same-frame collapse would revive it instantly (never observable) and would leave mc4-2's `'between'`/`resumePlay` as dead code. Two-phase is more faithful and the reason mc4-2 shipped those reducers.
  - Severity: minor
  - Forward impact: the between beat is exactly one frame here; mc6's attract/pause machine may lengthen it (bonus-tally animation). `GameState.phase` can now be `'between'` during normal play.
- **Regeneration entitlement wired as START_CITIES, not an mc4-3-fed bonus-city reserve**
  - Spec source: wave-transition.test.ts (mc4-2) — `regenerateCities(cities, reserve, cap)` doc: "the mc4-3 bonus-city award feeds `reserve`"
  - Spec text: reserve is the bonus-city entitlement fed by mc4-3's CHEKBO award
  - Implementation: `stepGame` passes `reserve = START_CITIES` (the fresh-game PLIVES), so the board heals up to `min(START_CITIES, NCITY)` = 6 each wave.
  - Rationale: the bonus-city AWARD that grows the entitlement is **mc4-5** (CHEKBO/BONINL), not yet shipped — mc4-3 was rescoped to `scoreKills` only. The faithful interim REGEN entitlement (`X = min(PLIVES, NCITY)`, PLIVES = START_CITIES at a fresh game with no bonus cities) is START_CITIES. TEA's test pins exactly this value.
  - Severity: minor
  - Forward impact: mc4-5 must replace the `START_CITIES` constant with the running earned-city count (PLIVES) so bonus cities actually raise the regen ceiling.
- **Two sibling tests' staging adjusted (setup only, subject preserved)**
  - Spec source: tests/game.test.ts (mc3-4 AC3, "the dead never resurrect"), tests/sound-events.test.ts (mc8-2, "already-dead structure does not re-emit")
  - Spec text: both isolated a single frame with `remaining: 0` and a clearing screen
  - Implementation: added one still-descending ICBM to each setup so the frame stays mid-wave (screen not clear); adjusted game.test.ts's warhead-consumed assertion from `icbms.length === 0` to `no icbm is arrived` + explicit `phase === 'play'`
  - Rationale: mc4-4's end-of-wave regeneration fires precisely when `remaining === 0` and the screen clears — the incidental state those mc3/mc8 setups created — so regen revived the just-killed city / the phase entered `'between'`. The tests' true subjects (within-wave monotonic death; structureDestroyed is a rising edge, not a census) are unchanged and still fully asserted; only the staging that held the wave open was corrected.
  - Severity: minor
  - Forward impact: none — the sibling tests now honestly guard within-wave invariants; wave-boundary regeneration is covered by mc4-playthrough.test.ts.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN — mc 791/791, lint pass, orchestrator 408/408, 0 smells (no console.log/TODO/skips) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundaries covered by my own analysis + mutation battery (M3/M8/game-over-at-wave-end) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed the domain myself (no try/catch, no silent fallbacks in pure reducers) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — replaced by a 7-mutant battery; one survivor found (M2) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — audited the two-phase comments myself (lang-review #17) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — assessed types myself (readonly fields, no `as any`, Partial<WaveState> RED idiom) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A: pure game sim, no auth/input/secrets/tenant surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — two-phase branch justified for fidelity (deviation accepted) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — enumerated lang-review #14/#15/#18/#26 against the diff myself |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, pre-filled)
**Total findings:** 1 confirmed ([TEST] M2 survived mutant), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED (one required test-teeth fix; the CODE is correct)

Subagents are disabled on this project (8 of 9), so the primary evidence is a mutation battery run against `plugins/missile-command/src/core/game.ts`, `spawn.ts`, `render.ts` (apply → `npx vitest run --project missile-command` → revert). Baseline 791/791.

### Observations (mutation battery + analysis)
- **[TEST] MEDIUM — the score multiplier's ACTUAL EFFECT (scaling kill scoring) is unguarded.** Mutation M2: `scoreKills(state.score, killed.length, state.wave)` → `scoreKills(state.score, killed.length)` (kills always scored at ×1) → **791/791 STILL PASS**, mutant SURVIVES. The multiplier is proven to DISPLAY (HUD) and CLIMB (`state.multiplier`), but no test proves an ICBM kill is actually scored at the current wave's multiplier in the composed loop. `score.test.ts`/`score-multiplier.test.ts` pin the `scoreKills` FUNCTION, but nothing pins the `stepGame` WIRING that threads `state.wave` into it. A future refactor could drop the arg and ship a cosmetic multiplier. Location: `plugins/missile-command/src/core/game.ts:161`. Fix required: a mc4-playthrough guard that runs the composed loop at a wave with multiplier > 1, kills an ICBM, and asserts the score gained `ICBM_KILL_POINTS × scoreMultiplier(wave)` (not the base). Per lang-review #15 ("every guard must be mutation-tested: delete the mechanism and require red") and the mc4-2 round-1 precedent (survived mutants closed by test-teeth before merge).
- **[VERIFIED] the descent-velocity wiring is guarded — evidence:** M1 (`waveSchedule(state.wave).velocity` → `waveSchedule(1).velocity`) reddens 2 tests; M6 (spawn drops the velocity arg, tested in RED) reddened the descent block. `game.ts:139`, `spawn.ts:60`.
- **[VERIFIED] the wave-advance / bonus / regen / refill / budget-reseed are guarded — evidence:** M3 (no advance) → 6 red; M5 (zero bonus) → 1 red; M8 (enter-between → 'play', never resolve) → 9 red; M9 (freeze multiplier on advance) → 2 red; M7 (delete HUD line) → 3 red. All killed.
- **[EDGE] game-over WINS at wave-end — verified:** an all-cities-dead wave-end (`isWaveOver` true, `phase === 'over'`) does NOT enter the between beat, does NOT advance, banks no bonus, and stays frozen (mc4-playthrough block C + `nextPhase`/`nextWavePhase` guard). Boundary `isWaveOver(remaining, icbms)` reuses the mc4-2 predicate (pinned in wave-transition.test.ts).
- **[RULE] lang-review #14 (derived EDGE computed in one branch of a state machine) — VERIFIED not leaked:** `soundEvents`/`destroyed` is computed once on the common path and reused by BOTH the normal return and the enter-`between` return; the `'between'` resolve branch (a damage-free beat) returns `soundEvents: []`. So a `structureDestroyed` edge caused by a wave's FINAL ICBM still fires (sound-events.test.ts:126 asserts exactly this on a wave-ending frame, and passes under the two-phase split). No transition is missed across the branch split. `game.ts:168-175`.
- **[RULE] lang-review #18/#26 (identity assertions) — VERIFIED clean:** mc4-playthrough expected values come from the composed loop on one side and imported core functions (`waveSchedule`, `scoreMultiplier`, `waveEndBonus`, `nextWaveBudget`) on the other — not test-local identities. Each was proven to fail on its mutant (except M2, above).
- **[TYPE] VERIFIED — evidence:** new `GameState.wave`/`multiplier` are `readonly number` (`game.ts:63-70`); no `as any`; the test's `Partial<WaveState>` cast (`mc4-playthrough.test.ts:57`) is the sanctioned RED idiom (reads `undefined` until the fields exist, keeping tsc green). `.js` import extensions present.
- **[SILENT] VERIFIED — no swallowed errors:** pure reducers, no try/catch, no `||`-on-falsy fallbacks. The `icbm.velocity ?? 1` default (stepIcbm) is the documented mc3 unit-speed default, not an error swallow; `??` (not `||`) is correct (0 is not a valid velocity but never produced by `waveSchedule`).
- **[DOC] VERIFIED (lang-review #17):** the two-phase comments (`game.ts:111-118, 128-131, 177-183`) describe the enter-`between` → resolve flow accurately; the "dead never resurrect ... within a wave" note matches the sibling-test change and the actual regen timing.
- **[SEC] N/A** — pure deterministic game simulation; no auth, no external input, no secrets, no tenant surface.
- **[SIMPLE] VERIFIED** — the two-phase branch is the minimum needed to make destruction visible before REGEN and to use mc4-2's `nextWavePhase`/`resumePlay` (else they are dead code); accepted (deviation audit below).

### Rule Compliance (lang-review typescript)
- #1 type-safety escapes: PASS (no `as any`/`@ts-ignore`; one `as WaveState`/`Partial<WaveState>` in TEST only, the RED idiom).
- #4/#21 null/degenerate numerics: PASS (`??` used correctly; `state.wave`/`multiplier` always ≥1, never reach geometry from outside).
- #5 module/declaration: PASS (`.js` extensions on all new relative imports in game.ts).
- #14 edges-in-one-branch: PASS (verified above — the destruction edge is on the common path).
- #15 mutation-tested guards: **FAIL for the kill-scoring mechanism (M2 survives)** — all other mechanisms PASS.
- #18/#26 vacuous/identity assertions: PASS.
- #8 test quality: PASS except the M2 coverage gap.
- #3 enums: N/A (Phase is a string union, not an enum — idiomatic here).

### Devil's Advocate
Argue this is broken. First: the multiplier is a lie. The story's headline is "per-wave score multiplier," yet I proved by mutation that the number on the HUD can climb to ×6 while every kill still scores 25 — the suite would not notice. A player grinding wave 11 would see ×6 and score as if on wave 1; the one test that could catch it (a kill at multiplier>1) does not exist. That is the single real hole and it is why I reject. Second: could the two-phase beat drop a frame of input or double-count a bonus? I checked — the `'between'` frame ignores input and spawns nothing, and the bonus is banked exactly once (on the resolve frame, from the pre-regen counts); M5 confirms the amount is pinned, and re-entrancy is impossible because the resolve frame flips `phase` to `'play'` and `isWaveOver` is false on the next frame (remaining re-seeded to 15). Third: what if a wave ends with the last ICBM killing the last city AND surviving cities elsewhere — does regen mask a loss? No: `nextPhase` computes `over` from `impact.cities` (all-dead ⇒ over) before the between branch is even considered; game-over strictly wins (M8/block C). Fourth: determinism — the two-phase split adds a frame; could two seeds diverge only at the beat? The determinism block deep-equals full trajectories and the wave-end resolution twice; both green, and no `Date.now`/`Math.random` in core. Fifth: the opening-wave budget is 8 not 12 (filed) — a fidelity gap, not a correctness bug, and out of mc4-4's tested scope. Conclusion: one testable hole (M2), code otherwise sound.

**Handoff:** Back to TEA (rework/red) to add the kill-scoring-at-multiplier guard.

### Reviewer (audit)
- **Two-phase end-of-wave resolution** → ✓ ACCEPTED: faithful to the ROM's END OF WAVE being a distinct phase; makes destruction visible before REGEN and gives mc4-2's `nextWavePhase`/`resumePlay` real work. Verified re-entrancy-safe (M8) and bonus banked once (M5).
- **Regeneration entitlement = START_CITIES (pending mc4-5)** → ✓ ACCEPTED: matches REGEN's `min(PLIVES, NCITY)` with PLIVES = START_CITIES at a fresh game; forward-impact on mc4-5 correctly noted. Guarded by mc4-playthrough block B (M-regen killed).
- **Two sibling tests' staging held mid-wave** → ✓ ACCEPTED: honest setup-only change; the incidental `remaining:0`+clear-screen states were genuine wave-ends under mc4-4, and the tests' true subjects (within-wave monotonic death; rising-edge structureDestroyed) are preserved and still asserted. sound-events:126 now passes on the wave-ending frame, confirming the destruction edge survives.

### Reviewer (code review)
- **Gap** (blocking, this story): the per-wave multiplier's scoring EFFECT is unguarded — `scoreKills(state.score, killed.length, state.wave)` survives dropping its `state.wave` arg (mutation M2, 791/791 still green). Affects `plugins/missile-command/tests/mc4-playthrough.test.ts` (add a composed-loop guard: at a wave with multiplier > 1, a kill scores `ICBM_KILL_POINTS × scoreMultiplier(wave)`, not the base). *Found by Reviewer during code review.*
### TEA (rework round 2)
- Added the mc4-playthrough guard the Reviewer required: a pre-existing blast kills one ICBM at wave 3 (×2) and must score `ICBM_KILL_POINTS × scoreMultiplier(3)` = double the wave-1 kill. Verified it KILLS mutation M2 (dropping `state.wave` from `scoreKills` reddens the wave-3 case) and passes on the correct code. This guard is green-on-arrival by design — the Reviewer confirmed the CODE was correct; the gap was test-teeth only. mc 793/793, tsc clean.
### Dev (rework round 2)
- No implementation change — the Reviewer confirmed the code was correct; the round-1 gap was a missing test. TEA's kill-scoring guard is green on the existing code. Verified: mc 793/793, `npm run lint` clean, `npm run test:orchestrator` 408/408 (unchanged). No new design deviations. Working tree clean.
## Subagent Results (round 2 — re-review of the scoped rework)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN — 793 mc + 408 orchestrator + tsc, 0 smells; diff is the test guard + tracking YAML only |
| 2-9 | (edge/silent/test/comment/type/security/simplifier/rule) | No | Skipped | disabled | Disabled via settings — re-verified by mutation battery myself |

**All received:** Yes (1 enabled returned; 8 disabled)
**Total findings:** 0 confirmed (round-1 M2 finding CLOSED), 0 dismissed, 0 deferred

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

The rework is scoped exactly to what round 1 required — `git diff f303a17d...HEAD` touches only `tests/mc4-playthrough.test.ts` (+63, the kill-scoring guard) and `sprint/epic-mc4.yaml` (tracking). No production code changed, confirming the round-1 code was correct.

**Round-1 finding CLOSED [TEST]:** the survived mutant M2 (`scoreKills(state.score, killed.length, state.wave)` → drop the arg) now **reddens exactly the new guard** — re-verified by re-applying M2 (1 failed) and reverting. The guard is non-vacuous: it contrasts a wave-3 (×2) kill against a wave-1 (×1) kill through the composed `stepGame` loop, deriving the expectation from imported `ICBM_KILL_POINTS × scoreMultiplier(wave)` (not a test-local identity — lang-review #26 clean), and stages exactly one kill with a surviving bystander so the frame is not a wave-end.

**Additional round-2 mutation coverage (adversarial re-check):**
- [RULE] #14 destruction edge across the two-phase split — `soundEvents: []` on the enter-`between` frame reddens 3 tests (the wave-ending destruction cue is guarded). CAUGHT.
- [EDGE] `resumePlay(state.phase)` → `state.phase` (game stuck in `'between'`, wave runs away) reddens 2 tests. CAUGHT.
- [TEST] all round-1 mutants (M1/M3/M5/M7/M8/M9) remain killed; baseline 793/793.

**[SEC] N/A · [SILENT] none · [DOC] the new guard's comment accurately cites the M2 origin · [TYPE] `type Icbm`/`type Explosion` imports are type-only, `.js` extensions present · [SIMPLE] the guard reuses the established `peakBlast` fixture.**

### Devil's Advocate (round 2)
Could the new guard pass vacuously? Traced: `scoreForOneKillAtWave` returns `next.score` from the real `stepGame`; the expectation is `ICBM_KILL_POINTS × scoreMultiplier(wave)` from core — the M2 red proves the two are independent. Could the staging fail to produce a kill (making the score 0 either way)? The `expect(next.icbms.length).toBe(1)` staging assertion would fail first if the victim were not killed, so a no-kill frame cannot masquerade as a passing scaled-score. Could a spawn perturb the score? `remaining: 0` suppresses spawns and the bystander is far from the blast, so exactly one kill scores. Nothing left to reject.

**Handoff:** To SM for finish-story.