---
story_id: "cp4-5"
jira_key: "cp4-5"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-5: Game loop — start, game-over, restart; INIT/RESET reseed

## Story Details
- **ID:** cp4-5
- **Jira Key:** cp4-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T21:46:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T21:01:03+00:00 | 2026-07-20T21:02:19Z | 1m 16s |
| red | 2026-07-20T21:02:19Z | 2026-07-20T21:20:53Z | 18m 34s |
| green | 2026-07-20T21:20:53Z | 2026-07-20T21:34:12Z | 13m 19s |
| review | 2026-07-20T21:34:12Z | 2026-07-20T21:46:46Z | 12m 34s |
| finish | 2026-07-20T21:46:46Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The story/epic text names `createInitialState` as the seeded-init path, but the actual function is `createSim(seed)` — there is no `createInitialState`. Affects `sprint/context/context-story-cp4-5.md` / the AC wording (Dev must reuse `createSim`, and the reseed should call it). *Found by TEA during test design.*
- **Gap** (non-blocking): Making `phase` a REQUIRED SimState field reddens `tsc --noEmit` (lint) at two from-scratch SimState builders that omit it. Affects `tests/flea-live.test.ts` and `tests/orientation-flip.test.ts` (Dev adds `phase: 'playing'` to those literals for AC-4 "lint clean"; vitest is unaffected — neither reads `phase`). *Found by TEA during test design.*
- **Improvement** (non-blocking): `tests/render.test.ts:186` builds a 'game over' fixture as `{ ...createSim(4), gameOver: true, lives: 0 }`; once `phase` lands it will carry `phase:'playing'` + `gameOver:true` (internally inconsistent). Harmless today (`render.ts` reads neither), but affects `tests/render.test.ts` if cp4-6/cp4-7 teaches render to draw the game-over/attract screen from `phase` — that fixture should then set `phase:'gameover'`. *Found by TEA during test design.*

### Dev (implementation)
- **Correction** (non-blocking): TEA's Delivery Finding #2 (from-scratch SimState builders in `tests/flea-live.test.ts` / `tests/orientation-flip.test.ts` would break `tsc` on a required `phase`) turned out MOOT — all their literals are spread-based (`{ ...wave2, playfield: {...} }`), so `phase` carries through the spread. No edit was needed and `npm run lint` is clean. Recording so the audit trail is accurate. *Found by Dev during implementation.*
- **Gap** (non-blocking): the cp1-5 input suite pinned the keyboard adapter's EXACT output shape via `toEqual({ dh, dv, fire })` (`tests/input.test.ts:138`). Widening the adapter with the START1 port (`start`) broke that one assertion — the classic "sibling suite welded to the old contract shape" ripple RED can't see (it ran against the pre-widening adapter). Migrated in place to `{ dh, dv, fire, start: false }` (the mouse adapter's `{ dh, dv, fire }` assertion is untouched — a trackball has no start button). Intent-preserving; done this phase. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `main.ts` now boots into a **frozen** attract board (the seeded mushrooms + train, held — `render` draws the attract SimState but attract does not step). This is the intended cp4-5 slice; the self-playing ATTRT demo that animates it is **cp4-7** (per the epic ruling and the SM note). No demo motion is a deferred gap, not a regression. Affects `src/main.ts` / `src/shell/render.ts` when cp4-7 lands. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): the reseed-seed derivation is unpinned. `stepSim` reseeds with `createSim(state.rng.seed)`, but mutation M1 (`createSim(0)`, a constant seed) leaves all 18 game-loop tests green — the determinism/freshness tests all pass with a constant seed too. A future "simplification" to a constant or the original seed would silently drop restart-from-gameover variety and ship green. Affects `tests/game-loop.test.ts` (add a test that pins the reseed seed is *derived from the carried rng* — e.g. two game-over states reached via different play produce different reseeded playfields, or assert the restart consumes `state.rng.seed`). Production code is correct; this is safety-net erosion, not a bug. *Found by Reviewer during code review (mutation-proven).*
- **Improvement** (non-blocking): `docs/rom-study/open-questions.md` entry 11 references "Claims GL-1..GL-10", but the claim IDs in `docs/rom-study/claims/12-game-loop.json` are `LOOP-1..LOOP-10`. A reader following "GL-*" finds nothing. Affects `docs/rom-study/open-questions.md` (rename the cross-reference to `LOOP-1..LOOP-10`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the inline INIT citation in `src/core/sim.ts` (comments at lines 174 and 506) anchors `INIT :1162`, but `:1162` is the `.SBTTL INIT-INITIALIZE EVERYTHING` assembler subtitle; the actual `;INIT-INITIALIZE EVERYTHING` comment (matching byte-verified claim LOOP-1) is at `:1163`, and the executable `INIT:` label is at `:1165`. Inconsistent by one line (both lines carry the phrase, so neither is "wrong"; inline source comments are ungated so no test catches it). Affects `src/core/sim.ts` (align to `:1163` or `:1165` to match the claim). *Found by Reviewer + independent ROM auditor.*
- **Improvement** (non-blocking): claims `LOOP-7`/`LOOP-9` describe the game-over test as reading a "non-zero total"; the ROM does a bitwise `ORA` of two independent per-player life bytes, not an arithmetic total. Behaviour described ("any lives left ⇒ not over") is correct; only the noun is imprecise. Affects `docs/rom-study/claims/12-game-loop.json` (optional: reword "total" → "either byte"). *Found by independent ROM auditor.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **`gameOver: boolean` kept as a mirror of the new `phase` field rather than replaced**
  - Spec source: context-story-cp4-5.md, AC-1 ("an explicit game-state machine")
  - Spec text: "An explicit game-state machine (start/attract → playing → game-over → restart)"
  - Implementation: SimState gains a 3-value `phase: 'attract' | 'playing' | 'gameover'` (the explicit machine), and the pre-existing `gameOver: boolean` is KEPT as a maintained mirror of `phase === 'gameover'` rather than removed. An invariant test pins `phase === 'gameover' ⟺ gameOver === true` so the two never drift.
  - Rationale: 8 existing assertions across death-restor / fragmented-train / centis-speed / render read `s.gameOver`. Removing it would red the baseline (violates AC-4 "full suite green from baseline"). The mirror is the minimal-blast-radius way to add the explicit machine while preserving the observable the suite already depends on. The ROM itself has both a persistent `MODE` (attract⇄play) and a transient game-over window (`:624-627` lives==0 → `DEC MODE`), so a single explicit phase enum is the faithful clone of that split.
  - Severity: minor
  - Forward impact: cp4-6 (save-on-game-over) and cp4-7 (attract) read `phase`; the `gameOver` mirror can be retired in a later cleanup if a story removes its last reader.
- **Start/restart signal delivered as an OPTIONAL `start?: boolean` on `InputCounts`, not a required field or a separate core function**
  - Spec source: context-story-cp4-5.md, AC-3
  - Spec text: "Input starts a game from the start/attract state and restarts from game-over (keyboard port of the ROM's start condition, transcribed)"
  - Implementation: `InputCounts` (src/core/player.ts) gains `start?: boolean`; `stepSim` reads it only in the attract/gameover phases. `movePlayer` ignores it.
  - Rationale: 61 `{ dh, dv, fire }` literals exist across 15 test files + shell. A REQUIRED new field would red the entire suite on compile (violates AC-4). Optional keeps every existing literal valid. Threading through `stepSim`'s input (rather than a separate `restartSim()` the shell calls) keeps the WHOLE state machine inside pure core, which AC-1 requires ("citations green" — the machine is transcribed in core, not split into the shell). The ROM's START1 is a distinct control from the trackball; carrying it in the per-frame input bundle is a documented convenience, not a claim that they share hardware.
  - Severity: minor
  - Forward impact: none — a future options/input story can promote `start` to required if every producer sets it.
- **"Bonus thresholds" in AC-2's reseed list reduces to the existing fresh-game reset — no BONUSL/BONUSM field is created here**
  - Spec source: context-story-cp4-5.md, AC-2
  - Spec text: "reseeds a fresh deterministic sim (fresh lives, bonus thresholds, playfield, wave-1 train)"
  - Implementation: the reseed reuses `createSim`, which resets lives/wave/score/playfield/train. Bonus-life thresholds (ROM BONUSL/BONUSM, `:855-859`) are NOT a modelled core field yet — cp4-4 (Bonus lives, still backlog) owns them. The reseed test asserts `score === 0` (the closest observable) and the fresh lives/wave/train/playfield, and does not assert a bonus-threshold field.
  - Rationale: inventing a bonus-threshold field here would pre-empt cp4-4 and add a phantom AC. The epic ruling (context-epic-cp4.md) explicitly assigns bonus lives to cp4-4 and DIP-default hardcoding to each story.
  - Severity: minor
  - Forward impact: cp4-4 adds the bonus-threshold field; its INIT reseed test extends this story's reseed coverage to that field.
- **Reseed seed is derived deterministically from `state.rng`, not taken as a new parameter or from wall-clock entropy**
  - Spec source: context-story-cp4-5.md, AC-2; context-epic-cp4.md ("Determinism", "no Date.now/Math.random")
  - Spec text: "The RESET/INIT reseed MUST produce a deterministic fresh sim from a fresh seed (no Date.now/Math.random) — reuse the existing seeded init path"
  - Implementation: on a start/restart transition `stepSim` derives the fresh seed from the current `state.rng` cursor and calls `createSim(derivedSeed)`. Tests pin the OBSERVABLE freshness + determinism (identical start-from-identical-state → deep-equal sims), not the exact derivation function, to avoid over-coupling to implementation.
  - Rationale: the ROM seeds mushrooms from RNGEN (hardware entropy) — non-deterministic in silicon, but the clone must be deterministic. Deriving from the carried seeded rng is the faithful-yet-deterministic choice and keeps core pure (the purity scanner enforces no Date.now/Math.random). In cp4-5 attract holds (rng frozen) so the fresh game is constant; cp4-7's live attract will vary it, replayably.
  - Severity: minor
  - Forward impact: cp4-7's attract advances the rng, so the started game's seed will vary with attract duration — replayable given the same input timeline.

### Dev (implementation)
- No deviations from spec. The implementation realizes TEA's contract exactly: the `phase` union + `gameOver` mirror, `createAttract`, the optional `InputCounts.start`, the `stepSim` attract/gameover start-gate, and the deterministic `createSim(state.rng.seed)` reseed. The four TEA deviations above were adopted as designed (they ARE the contract the tests pin). Naming: the reseed reuses the real `createSim` (there is no `createInitialState`, per TEA Delivery Finding #1). Claims + open-questions added per the epic's citation/DIP rulings, not as a divergence.

### Reviewer (audit)
- **TEA #1 — `gameOver: boolean` kept as a mirror of `phase`** → ✓ ACCEPTED by Reviewer: sound. I enumerated all 5 write sites (`createSim` 161/162, `createAttract` 179, last-life death 423/424, respawn 441/442, `cloneState` 534/535) and every one keeps `phase` and `gameOver` in lockstep; the invariant test (`game-loop.test.ts:134-143`) pins `gameOver ⟺ phase==='gameover'` across all three reachable states. Mutation M3 (flip the death phase) reddens 5 tests. No drift path through production code.
- **TEA #2 — start delivered as OPTIONAL `InputCounts.start`, read only by `stepSim`** → ✓ ACCEPTED by Reviewer: correct. `movePlayer` ignores it (grep-confirmed); the optional keeps the 61 existing `{ dh, dv, fire }` literals valid (build/lint clean); the whole machine stays in pure core. Mutation M6 (reseed on start during play) reddens the "start mid-game ignored" guard, proving the phase-scoping is real.
- **TEA #3 — "bonus thresholds" reduces to the fresh reset; no BONUSL/BONUSM field here** → ✓ ACCEPTED by Reviewer: correctly defers the bonus-threshold field to cp4-4 (per the epic ruling); the reseed asserts `score===0` and fresh lives/wave/train as the observable proxy. No phantom AC invented.
- **TEA #4 — reseed seed derived from `state.rng`, not a parameter or wall-clock** → ✓ ACCEPTED by Reviewer: the design is sound (deterministic + pure; `state.rng.seed` is a live cursor, so restart-from-gameover varies while start-from-attract is constant — both replayable). NOTE: the *derivation itself* is unpinned by any test (mutation M1: `createSim(0)` stays 18/18 green) — recorded as a non-blocking Delivery Finding. The deviation is accepted; only its test coverage is thin, and the variety it enables is explicitly deferred to cp4-7.
- **Dev — "No deviations"** → ✓ ACCEPTED by Reviewer: confirmed. The GREEN realizes TEA's contract exactly; no undocumented spec divergence found. One un-logged-but-known consequence (`render.test.ts:186`'s fixture now carries `phase:'playing' + gameOver:true`, internally inconsistent) was already captured as a non-blocking TEA Improvement finding — harmless (render reads neither for that path), not a new deviation.

## Acceptance Criteria

1. An explicit game-state machine (start/attract → playing → game-over → restart) transcribed from the ROM's INIT/life-exhaustion flow (:1162, :610-625) with radix-cited comments + claims entries; citations green.
2. A restart/INIT reseeds a fresh deterministic sim (fresh lives, bonus thresholds, playfield, wave-1 train) from a seed — a determinism test replays an identical fresh game; purity guard green (no Date.now/Math.random).
3. Input starts a game from the start/attract state and restarts from game-over (keyboard port of the ROM's start condition, transcribed); pinned by a test driving the transitions.
4. Game-over is a reachable, observable state (last-life death → game-over → awaits restart); full suite green from baseline; build + lint clean.

## Sm Assessment

**Setup complete — routing to TEA for the RED phase (tdd, phased).**

- **Story:** cp4-5, 3pt, centipede, TDD. Wires the outer game-loop state machine the sim only half-has: `gameOver` is set on last-life death and `step()` early-returns while gameOver, but nothing transitions BACK — no start gate, no restart. This story owns the state machine (start/attract → playing → game-over → restart) + INIT/RESET deterministic reseed.
- **Sequencing:** cp4-5 must land a real, reachable, testable game-over state FIRST — cp4-6 hooks high-score save onto game-over, cp4-7 hooks attract into it. Do not pre-build the save/attract hooks here; just make the states they depend on real.
- **ROM quarry for O'Brien (TEA):** INIT `:1162` "INITIALIZE EVERYTHING" (LIVES `:849-851`, BONUSL/BONUSM `:855-859`, playfield `:1220`, wave-1 train); life-exhaustion path `:610-625` (`:615 BPL 55$ ;IF IN ATTRACT DO NOT CHECK LIVES`, `:624-625 LDA LIVES / ORA LIVES+1` → game over when both zero). Transcribe with radix-cited comments + claims entries.
- **Prior work:** Read `sprint/archive/cp4-1-session.md` and `sprint/archive/cp4-2-session.md` Delivery Findings for centipede cadence/wave-train context before writing RED. Standing memory: wave cadence oscillates (CENTIS 2,1,2,1 below 40k); NEWHD fresh head is a hardcoded MOBJDV=2 — relevant only if the wave-1 reseed touches cadence.
- **Guards in force:** src/core purity (no Date.now/Math.random — comments scanned too), citation + claims gate. Reseed MUST reuse the seeded `createInitialState` path for a deterministic fresh game.
- **Merge gate:** clear — no open centipede PRs. Branch `feat/cp4-5-game-loop-state-machine` created off develop.
- **No blockers, no design deviations.** Fresh backlog story; context generated normally.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3pt feature story — a new game-loop state machine with transitions and a deterministic reseed. Full RED coverage of all four ACs.

**Test Files:**
- `centipede/tests/game-loop.test.ts` — the cp4-5 RED suite (18 tests: 16 RED for the feature, 2 always-green negative guards).

**Tests Written:** 18 tests covering 4 ACs. **Status: RED** (16 failing for the feature; baseline 41/42 files green, no regressions).

### The contract the tests pin (for Julia / Dev)

New surface in `src/core`:
1. `type GamePhase = 'attract' | 'playing' | 'gameover'` and `SimState.phase: GamePhase` — the explicit machine (ROM `MODE`: attract=-1 / play≥0, plus the game-over window).
2. `createSim(seed)` keeps `phase: 'playing'` (the started-game constructor the whole prior suite relies on). New `createAttract(seed)` returns the same seeded world in `phase: 'attract'`.
3. `gameOver` is KEPT as a maintained mirror of `phase === 'gameover'` (invariant-tested — deviation logged).
4. `InputCounts.start?: boolean` (`src/core/player.ts`) — OPTIONAL so the 61 existing `{ dh, dv, fire }` literals don't break. `stepSim` reads it: `attract + start → reseed`, `gameover + start → reseed`, `playing` ignores it, `attract/gameover` without start HOLD.
5. Reseed = `createSim(seedDerivedFrom state.rng)` — pure (no Date.now/Math.random), deterministic. The transition frame yields the fresh `phase:'playing'` sim at frame 0 (INIT reseeds, then the loop runs next frame).

Shell (`src/shell` / `src/main.ts`):
6. `createKeyboardAdapter` maps the **Enter** key to `start: true` (ports the ROM's START1 press); movement keys never raise it.
7. `main.ts` boots the loop into `createAttract(...)` (not straight-to-play) and threads `start` from the sampled input into `stepSim`.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 String union over enum; value-domain check | `phase is one of exactly the three machine states` | failing |
| #4 Nullish handling of an optional field | `Enter key raises/clears start`, `movement key does NOT raise start` | 1 failing / 1 passing (guard) |
| #8 Test quality — no `as any`, no vacuous asserts | self-check below | pass |
| (design) determinism / purity (no Date.now/Math.random) | `reseed is deterministic`, `restart is deterministic`, `scripted replay identical` | failing |

**Rules checked:** the applicable TS checks are Dev-implementation gates (#1–#2, #5–#7, #9–#13 don't apply to this diff — no async, no JSX, no JSON parsing, no enums-with-runtime-cost since `phase` is a union). The two that shape the tests (#3 union-value domain, #4 optional-field null handling) both have coverage. **Dev note:** if `stepSim` switches on `phase`, add a `default: assertNever(phase)` exhaustiveness arm (#3).

**Self-check:** 0 vacuous tests. Every test asserts a concrete value (`phase`, `lives`, `wave`, `score`, `frame`, `segs` liveness, `playfield.cells`, `start`). The only cast is a single documented cast to an optional-member shape (probing the not-yet-exported `createAttract` for a self-describing RED message) — no `as any`, no double-cast. The 2 always-green tests are deliberate negative guards ("a movement key does not start the game"), correct in both RED and GREEN.

**Handoff:** To Julia (Dev) for the GREEN phase — implement the phase machine, `createAttract`, the `start` input + transitions, the deterministic reseed, and the shell start-key wiring; add radix-cited comments + claims entries (citations green) and keep purity green; fix the two lint-only from-scratch builders flagged in Delivery Findings.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/sim.ts` — `GamePhase` union + `SimState.phase`; `createSim` → `phase:'playing'`; new `createAttract(seed)` (attract boot); `stepSim` start-gate (attract/gameover + `input.start===true` → `createSim(state.rng.seed)` reseed, else HOLD); last-life death → `phase:'gameover'` (`gameOver:true` mirror kept); respawn literal → `phase:'playing'`; `cloneState` copies `phase`.
- `src/core/player.ts` — optional `InputCounts.start` (the START1 port; `movePlayer` ignores it).
- `src/shell/input.ts` — `START_KEYS = {Enter}`; keyboard `sample()` emits `start`.
- `src/main.ts` — boots `createAttract(Date.now())`; threads `start` (keyboard) into `stepSim`.
- `tests/input.test.ts` — migrated the cp1-5 keyboard exact-shape assertion to include `start:false` (contract widened; see Delivery Findings).
- `docs/rom-study/claims/12-game-loop.json` — NEW. `LOOP-1..10`, byte-verified against vendored rev-4 `CENTI4.MAC` (INIT :1163, START1 :833/:836, LIVES :851, INC MODE :852, attract-skip :615, game-over test :624-626, DEC MODE :627).
- `docs/rom-study/open-questions.md` — entry 11: the MODE machine + the DIP-hardcoding and start-key UX-port rulings.

**Tests:** 736/736 passing (GREEN) — 42/42 files. `tests/game-loop.test.ts` 18/18; `tests/audit/citations.test.ts` green (new claims byte-verify); baseline intact.
**Build:** `npm run build` (tsc --noEmit && vite build) clean. **Lint:** `npm run lint` (tsc --noEmit) clean. **Purity:** `src/core` free of `Date.now`/`Math.random` (scanner green).
**Branch:** `feat/cp4-5-game-loop-state-machine` (pushed to origin, commit `1f0adc2`).

**AC status:**
- AC-1 ✓ explicit `phase` machine (attract/playing/gameover) from MODE + :624-627, radix-cited comments + `LOOP-*` claims, citations green.
- AC-2 ✓ deterministic reseed via `createSim(state.rng.seed)` (fresh lives/wave/playfield/train, score 0); determinism + purity tests green.
- AC-3 ✓ input-driven start (attract→play) + restart (gameover→play), Enter port; playing ignores start.
- AC-4 ✓ game-over reachable/observable; full suite + build + lint green.

**Self-review:** wired end-to-end (main.ts producer `start` → stepSim consumer, keyboard Enter → adapter); follows project patterns (string union, spread-based state rebuilds, radix-cited comments + claims); all ACs met; the machine handles `start===undefined` (holds) and only reseeds on an explicit press.

**Handoff:** To The Thought Police (Reviewer) for the review phase.

## Subagent Results

Toggles (`workflow.reviewer_subagents`): only `preflight` is **enabled**; the other 8 are **disabled**. Per the self-authored-relay playbook, the disabled domains were covered by the Reviewer directly (a serial mutation battery + rule enumeration) plus one **independent ROM re-derivation auditor** spawned for the fidelity/rule domain (read-only, primary source). No disabled row is claimed as subagent coverage.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (736/736 green; build/lint/purity clean; 0 smells) | N/A — baseline confirmed |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings — covered by Reviewer (gate boundary cases: hold/reseed on attract & gameover, start-during-play; mutations M2/M6) |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled — covered by Reviewer (pure reducer, no try/catch, no swallowed errors; the `else` branch returns `state` deliberately, which is the documented HOLD) |
| 4 | reviewer-test-analyzer | No | disabled | N/A | Disabled — covered by Reviewer mutation battery: M1 found 1 gap (unpinned reseed seed), M2/M3/M5/M6 confirmed the other guards bite |
| 5 | reviewer-comment-analyzer | No | disabled | N/A | Disabled — covered by Reviewer + ROM auditor: 3 doc nits (GL-* vs LOOP-*, INIT :1162/:1163, "total") |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled — covered by Reviewer (string union not runtime enum per rule #3; `start?` optional; `phase` required-field is tsc-enforced on every SimState builder) |
| 7 | reviewer-security | No | disabled | N/A | Disabled — N/A: pure deterministic core sim, no I/O, no auth, no untrusted parse, no secrets; the one shell input (`Enter`→start) is a bounded boolean |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled — covered by Reviewer (spread-based rebuilds are the module idiom; the gate is 2 lines; `gameOver` mirror is justified by 8 existing readers; no dead code) |
| 9 | reviewer-rule-checker | No | disabled | N/A | Disabled — covered by Reviewer Rule Compliance (below) + independent ROM re-derivation (10/10 claims byte-exact + semantically correct) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via settings, each covered by the Reviewer directly + 1 independent ROM auditor for the fidelity/rule domain)
**Total findings:** 1 MEDIUM (test-coverage gap) + 3 LOW (docs) — all confirmed, all non-blocking. 0 dismissed. 0 deferred beyond the routed follow-ups.

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is a faithful, well-cited port of Centipede's `MODE` game-loop machine, the state machine is sound, determinism and purity hold, and the `gameOver` mirror cannot drift. Every load-bearing guard mutation-bites except one (the reseed-seed derivation), which is a coverage gap on *correct* code, not a bug. No Critical/High issues.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + project rules)

- **#3 String union over runtime enum + value-domain:** `GamePhase = 'attract' | 'playing' | 'gameover'` is a string union (never crosses a module boundary as a value) — compliant. `stepSim` uses a boolean `if` (attract||gameover) with `playing` falling through, not a `switch`, so TEA's conditional `assertNever` note does not apply. Enumerated: the only union is `GamePhase`; `phase is one of exactly the three states` pins the domain (`game-loop.test.ts:126`). ✓
- **#4 Optional-field nullish handling:** `InputCounts.start?: boolean` is read as `input.start === true` (strict) — `undefined`/`false` both correctly HOLD; `main.ts` normalises to `keyboardCounts.start === true` (never undefined). Enumerated the sole reader (`sim.ts:510`) and the sole producer (`input.ts:145`). ✓
- **#8 Test quality (no vacuous/lying guards):** 18 tests; mutation-audited — M1 exposes one unpinned derivation (routed), all others bite. No `as any`; the single documented optional-shape cast in the RED scaffold is now dead (createAttract exists) but harmless. ✓ (with the M1 follow-up)
- **Required-field enforcement (type):** `SimState.phase` is `readonly` and required; every builder (`createSim`, `createAttract`, `stepDeathFrame` ×2, `cloneState`) sets it or tsc fails — enumerated all 5, all present. ✓
- **Purity (project rule — no `Date.now`/`Math.random` in `src/core`):** grep-clean; the reseed draws from the carried `state.rng` cursor. `Date.now()` appears only in `src/main.ts` (shell), consistent with the pre-cp4-5 pattern. ✓
- **Citation/claims gate (project rule):** `citations.test.ts` green; all 10 `LOOP-*` claims byte-verified by the gate AND independently re-derived from `CENTI4.MAC` (verbatim + semantics 10/10). ✓

### Observations

- `[VERIFIED]` gameover transition — mutation M3 (`phase:'gameover'→'playing'`) reddens 5 tests; evidence: `sim.ts:423-424` sets `phase:'gameover'+gameOver:true` on `lives<=0`, pinned at `game-loop.test.ts:150-155`.
- `[VERIFIED]` start-gate holds/reseeds correctly — `[EDGE]` boundary cases: M2 (ignore start) reddens attract-holds + gameover-waits; M6 (reseed during play) reddens the mid-game guard. Evidence: `sim.ts:505-511`, tests `184-188`/`157-162`/`202-213`.
- `[MEDIUM] [TEST]` reseed-seed derivation unpinned — M1 (`createSim(0)`) stays 18/18 green; `sim.ts:510`. Non-blocking Delivery Finding (production correct; variety deferred to cp4-7).
- `[VERIFIED]` `[TYPE]` mirror invariant — all 5 `phase`/`gameOver` write sites lockstep (enumerated above); `game-loop.test.ts:134-143`. No drift.
- `[VERIFIED]` `[RULE]` ROM fidelity — independent re-derivation: 10/10 claims byte-exact + semantically correct against `CENTI4.MAC`; MODE polarity (neg=attract) correct in claims + comments.
- `[LOW] [DOC]` three doc nits: open-questions `GL-*`→`LOOP-*`; INIT inline `:1162`→`:1163`; `LOOP-7/9` "total"→bitwise-OR. All routed, none blocking.
- `[SILENT]` no swallowed errors — pure reducer; the gate's `else` returns `state` as the documented HOLD, not a silent fallback. `[SEC]` N/A — pure core, no I/O/auth/untrusted-parse. `[SIMPLE]` no over-engineering — the 2-line gate + spread rebuilds are idiomatic; the `gameOver` mirror is justified by 8 existing readers.

### Devil's Advocate

Argue the code is broken. **Attack 1 — the reseed is a lie.** `createSim(state.rng.seed)` — what if `state.rng.seed` at game-over is a stale or aliased value, so every restart is identical and the "fresh game" is a mirage? Traced: `Rng.seed` is a live mulberry32 cursor (`nextInt` mutates it), advanced through play, and `cloneState` copies it into a *distinct* object (`sim.ts:525`), so no aliasing; restart-from-gameover genuinely varies. Start-from-attract IS constant (attract holds → cursor frozen) — but that is correct and deferred to cp4-7. The real weakness is not the code but that no test would catch a regression here (M1) — hence the routed finding, not a block. **Attack 2 — hold Enter to grief.** Holding Enter across the attract→play boundary: frame N reseeds (phase→playing), frame N+1's held start is *ignored* (playing falls through) — M6 proves the guard. No restart-loop. Holding Enter through a game-over instantly restarts — but that mirrors a held arcade START1 and is intended. **Attack 3 — a confused reader mis-restarts a live game.** `start` during play is ignored (`game-loop.test.ts:202-213`, M6) — a live game is never reset out from under the player. **Attack 4 — the mirror silently diverges** and a downstream reader (render) shows "game over" mid-play. Enumerated all 5 write sites; the invariant test pins all three reachable states; the only inconsistent literal is a test fixture already logged as a harmless TEA finding. **Attack 5 — a 4th phase slips in** and the `attract||gameover` `if` mis-treats it as playing. There is no 4th phase; adding one is a future story's problem, and `phase is one of exactly the three states` would red. Nothing here rises above the one MEDIUM coverage gap.

**Data flow traced:** keyboard `Enter` → `createKeyboardAdapter.sample().start` (`input.ts:145`) → `sampleStep` normalises to `start: keyboardCounts.start === true` (`main.ts:112`) → `stepSim` reads `input.start === true` in the attract/gameover gate (`sim.ts:510`) → `createSim(state.rng.seed)` reseeds a fresh `phase:'playing'` sim. Safe: strict `=== true`, bounded boolean, no untrusted parse, pure deterministic reseed.

**Pattern observed:** explicit string-union state machine with a maintained legacy mirror, spread-based immutable rebuilds, radix-cited ROM comments + machine-checked claims — the centipede/tempest house style, followed correctly at `sim.ts:78-179`.

**Error handling:** the reducer is total — no throw path; `start===undefined` HOLDS; a dead game awaits restart rather than freezing forever (the pre-cp4-5 `if (gameOver) return state` dead-end is now a real, exitable state).

**Handoff:** To Winston Smith (SM) for finish-story. One MEDIUM + three LOW findings routed as non-blocking Delivery Findings (reseed-seed coverage test; three doc corrections).