---
story_id: "tp1-21"
jira_key: "tp1-21"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-21: SCORING — the fuseball's score tier is a weighted random roll, not a depth band

## Story Details
- **ID:** tp1-21
- **Jira Key:** tp1-21
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** approved
**Phase Started:** 2026-07-18T10:05:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T10:05:11Z | - | - |

## Acceptance Criteria

1. The fuseball's score tier is a WEIGHTED RANDOM ROLL (from the seeded RNG in GameState), not a function of depth.
2. The roll's weights are transcribed from the ROM and cited.
3. SC-001 is NOT implemented. The 10-deep ladder from @arcade/shared stands.
4. npm test -- citations stays green.

## Technical Approach

### ROM Source Archaeology
- **Primary Source Location:** ~/Projects/tempest-source-text/ALWELG.MAC (ALSCOR area)
- **Key:** Fuseball scoring routine — identify the weighted random roll table and the weights for each tier
- **Constraints:** 
  - Do NOT implement SC-001 (high-score ladder depth) — PM ruling, WON'T-FIX
  - B-009 (DEMO_FIRE_LANES fix) already carved to tp1-3
  - All citations must pass npm test -- citations

### Implementation Strategy
1. Identify the ROM's fuseball score-tier weighting table in ALSCOR
2. Transcribe the weights verbatim from the ROM source
3. Implement the weighted random roll using GameState's seeded RNG
4. Replace any existing depth-based scoring logic with the random-roll mechanism
5. Cite the ROM addresses in code comments and accept-criteria documentation
6. Verify all citations with npm test -- citations

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design) — RED phase, tp1-21

**ROM citations (Theurer 1981, LF copy `~/Projects/tempest-source-text`):**

- **`ALWELG.MAC:2745-2771` — `INCFS2` ("PLAY-EXPLOSION OF FUSE INIT"), the fuseball kill path.** The tier is a weighted random roll off the ROM's RNG byte, NOT depth:
  - `ALWELG.MAC:2754` — `LDA RANDO2` (the ROM RNG byte)
  - `ALWELG.MAC:2755` — `AND I,7` → `r = RANDO2 & 7`, uniform over `0..7`
  - `ALWELG.MAC:2756` — `CMP I,3`
  - `ALWELG.MAC:2757-2758` — `IFCS / LDA I,0` → if `r >= 3`, tier = 0. Source comment: `;RANDOMLY CHOOSE 0(250),1(500), OR 2(750)`
  - `ALWELG.MAC:2767` — `ADC I,5` → score-table index = `tier + 5`
  - `ALWELG.MAC:2769` — `JSR UPSCOR`
- **`ALEXEC.MAC:598-600` — the point-value table `UPSCOR` indexes** (BCD; `score(i) = TUPSCM[i]*100 + TUPSCL[i]`):
  - `TUPSCL: .BYTE 00,50,0,0,50,50,0,50` (`ALEXEC.MAC:598`)
  - `TUPSCM: .BYTE 0,1,02,1,0,2,5,7` (`ALEXEC.MAC:600`)
  - idx 5 → `2,50` = **250** (tier 0); idx 6 → `5,0` = **500** (tier 1); idx 7 → `7,50` = **750** (tier 2)

**Exact weights (transcribed):** `tier = (r < 3) ? r : 0` with `r = RANDO2 & 7` uniform over 8 →
`P(250) = 6/8 = 0.750`, `P(500) = 1/8 = 0.125`, `P(750) = 1/8 = 0.125`. Depth is not an input anywhere in `INCFS2`.

**Current WRONG code:** `src/core/rules.ts:901-904` — `fuseballScore(depth: number)` computes `Math.min(2, Math.max(0, Math.floor(depth * 3)))` (a depth band). Called from `scoreFor(enemy)` at `rules.ts:912`, which the kill paths hit at `src/core/sim.ts:487` (bullet) and `src/core/sim.ts:700` (superzapper). `SCORE_FUSEBALL_BASE=250` / `SCORE_FUSEBALL_STEP=250` (rules.ts:130-131) already encode 250/500/750 — the VALUES are right, only the tier SELECTOR is wrong.

**Test file:** `tests/core/tp1-21.fuseball-score.test.ts` (6 tests, all RED). Unit tests pin `fuseballScore(rng)` (produces only {250,500,750}, advances the RNG cursor, deterministic under equal seeds, distribution 6:1:1 over N=20000 within ±0.05, with a liveness guard rejecting NaN/frozen impls). Integration tests through `stepGame` pin that killing a fuseball consumes `state.rng` and scores identically at depth 0.25 vs 0.8 under the same seed.

**Gotchas for Dev (GREEN):**
- **Intended API:** change `fuseballScore(depth)` → `fuseballScore(rng: Rng)`; body is `const r = nextInt(rng, 8); const tier = r < 3 ? r : 0; return SCORE_FUSEBALL_BASE + tier * SCORE_FUSEBALL_STEP`. `nextInt(rng, 8)` (from `@arcade/shared/rng`) is the exact analogue of `RANDO2 AND 7`.
- **RNG mapping:** roll from `state.rng` (the GameState seeded PRNG), NOT `state.fireRng`. The roll happens at KILL time (INCFS2 is the kill routine), so thread `s.rng` into the scoring at `sim.ts:487` and `sim.ts:700`. Note `scoreFor(enemy)` currently takes no rng — you'll need `scoreFor(enemy, rng)` (or roll in the kill handler and pass the value).
- **RNG-cursor determinism:** the roll advances `state.rng`; make sure it draws exactly once per fuseball kill so the seeded stream stays predictable for downstream systems.
- **Consumer ripple (out of core):** `src/shell/fx.ts:179` does `FUSE_SCORE_TIERS.indexOf(fuseballScore(depth))` to colour the score pop-up by depth — that breaks once the score is random. `tests/shell/tp1-19.fx-fuse-score.test.ts` and `tests/core/sim.scoring.test.ts:18-22` (the `fuseballScore(depth)` cases) will need updating; they are EXPECTED to break and are Dev's to fix in GREEN. The pop-up must show the ACTUAL rolled score, not a depth-derived one.
- **Citations gate:** untouched by this RED commit (no cited file edited); stays green. If GREEN edits a cited file, run `node tools/audit/reanchor-citations.mjs --write` before committing.
- **AC-3 (SC-001):** do NOT touch the high-score ladder depth — `@arcade/shared` ships 10; leave it.

## Design Deviations

None recorded at setup.

### TEA (test design)
- **Roll modelled as an envelope, not a byte-trace:** the ROM reads `RANDO2 AND 7` (`ALWELG.MAC:2755`); tests pin the *distribution* (6:1:1 over {250,500,750}) and depth-independence via our seeded `nextInt(rng, 8)`, not the ROM's exact LFSR bytes. Reason: our GameState RNG is a different generator; fidelity is the weighting and the depth-independence, which the ROM defines, not the specific pseudo-random sequence.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity behaviour change (fuseball score tier) — must be pinned before implementation.

**Test Files:**
- `tempest/tests/core/tp1-21.fuseball-score.test.ts` — 6 tests: 4 unit on `fuseballScore(rng)` (tier set {250,500,750}, RNG cursor advance, determinism, 6:1:1 distribution with a NaN/frozen liveness guard) + 2 integration through `stepGame` (kill consumes `state.rng`; depth-independent scoring at 0.25 vs 0.8 under one seed).

**Tests Written:** 6 tests covering ACs 1 (weighted roll from seeded RNG, not depth) and 2 (ROM weights, cited). AC-3 (SC-001 untouched) and AC-4 (citations green) held by not touching the ladder or any cited file.
**Status:** RED (all 6 failing against current depth-band code — verified) ; `npm test -- citations` GREEN (25 passing).

**Commit:** `cde1577` on `fix/tp1-21-fuseball-score-tier` (tests only; no production code).

**Handoff:** To Dev for implementation (see Delivery Findings → TEA for the intended `fuseballScore(rng)` API, RNG threading, and consumer ripple in `shell/fx.ts` + existing `fuseballScore(depth)` tests).

### Dev (implementation) — GREEN phase, tp1-21

**Files changed:**
- `src/core/rules.ts:901-916` — `fuseballScore(rng: Rng)` replaces `fuseballScore(depth)`: `const r = nextInt(rng, 8); const tier = r < 3 ? r : 0; return SCORE_FUSEBALL_BASE + tier * SCORE_FUSEBALL_STEP`, cited to `ALWELG.MAC:2754-2758` (INCFS2's `RANDO2 AND 7` roll) and `ALEXEC.MAC:598-600` (UPSCOR table). `scoreFor(enemy, rng)` gained the `rng` param, threading it into the `fuseball` case only.
- `src/core/sim.ts:472-491` (`resolveBulletHits`) — computes `const points = scoreFor(e, s.rng)` once, passes it to `awardScore` and attaches it to the `enemy-death` event as `score: points`.
- `src/core/sim.ts:698-705` (`zapKillAt`) — same pattern for the superzapper kill path.
- `src/core/events.ts:18-28` — `EnemyDeathEvent` gained an optional `score?: number` field (the points actually awarded for the kill). Optional so the ~8 unrelated test files that hand-build `enemy-death` fixtures for other enemy kinds (flipper/tanker/pulsar) didn't need touching.
- `src/shell/fx.ts:178-188,241` — `spawnFuseScore` now takes the awarded `score` directly (`FUSE_SCORE_TIERS.indexOf(score)`) instead of recomputing a tier from `depth`; the call site reads `e.score` off the event and skips drawing if it's `undefined` (a hand-built fixture with no score, same behavior as an unrecognised tier).
- `tests/core/sim.scoring.test.ts` — the 4 `scoreFor(...)` calls in `'returns the authentic per-kind value'` now pass a throwaway `createRng(1)` (signature requires it, unused by non-fuseball kinds). Replaced `'escalates the fuseball value with depth'` (asserted `fuseballScore(0.1)===250` etc., which no longer typechecks — `fuseballScore` takes an `Rng`, not a `number`) with a roll-from-rng assertion pointing at tp1-21's own file for the full distribution/determinism suite.
- `tests/shell/tp1-19.fx-fuse-score.test.ts` — `death()` helper gained a `score` param (default 250) so events carry it; the two tests that swept `depth` to exercise all three tiers (`'shows the tier the SIM actually awarded'`, `'reaches all three ROM tiers'`) now sweep `score` directly (`ROM_TIERS = [250,500,750]`) at a fixed depth, since depth is no longer an input to the tier at all. Dropped the now-unused `fuseballScore` import.

**Roll call sites (exactly once per kill):** `sim.ts` `resolveBulletHits` and `zapKillAt` each call `scoreFor(enemy, s.rng)` exactly once per dead enemy, immediately before filtering it out of `s.enemies` — so a fuseball kill draws exactly one `nextInt(s.rng, 8)` this frame, and non-fuseball kills draw nothing (the switch's other arms don't touch `rng`).

**RNG-cursor / determinism:** the roll comes from `state.rng` (not `state.fireRng`), matching TEA's mapping. Because `resolveBulletHits` iterates `s.bullets`/`s.enemies` in fixed array order and only fuseball kills draw, the cursor's advancement is fully deterministic for a given input/seed stream — verified by the tp1-21 suite's determinism test (equal seeds → equal tier sequences) and the two integration tests (`stepGame` kill consumes `state.rng`; same seed at depth 0.25 vs 0.8 scores identically).

**Citations:** `pair-8-book-reconciliation.json` finding `B-015` ("Fuseball score-tier selection: depth-based (ours) vs random (ROM)") was the audit's own record of this exact bug — its `ours` quote (`rules.ts:902`, the `Math.min(2, Math.max(0, Math.floor(depth * 3)))` line) is the code just removed. Marked it `"remediated_by": "tp1-21"` per CLAUDE.md's convention (the `source` ROM citation stays checked; the `ours` quote is now frozen history). Ran `node tools/audit/reanchor-citations.mjs --write` for the incidental line-number drift in `sim.ts`/`fx.ts` from the edits above — 9 citations re-anchored (`W-010`, `DA-008`, `DA-011`, `B-007`, `B-008`, `WD-004`, `WD-006`, `WD-007`, `WD-016`, across `pair-1-alwelg-sim-enemies.json`, `pair-3-aldisp-a-objects.json`, `pair-9-warp-drop-mode.json`), 0 lost. `npm test -- citations` green (25/25) after.

**Full suite:** `npm test` → 1654/1654 passing (139 files). `npm run build` → `tsc --noEmit && vite build` clean.

**Commit:** `2ad6a06` on `fix/tp1-21-fuseball-score-tier`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/rules.ts` - `fuseballScore(rng)` weighted roll (ALWELG.MAC:2754-2758), `scoreFor(enemy, rng)`
- `src/core/sim.ts` - both kill paths (`resolveBulletHits`, `zapKillAt`) roll once off `s.rng` and attach the awarded score to the `enemy-death` event
- `src/core/events.ts` - `EnemyDeathEvent.score?: number`
- `src/shell/fx.ts` - score pop-up reads the event's actual `score` instead of re-deriving a tier from depth
- `tests/core/sim.scoring.test.ts` - re-pointed off the old `fuseballScore(depth)` signature
- `tests/shell/tp1-19.fx-fuse-score.test.ts` - re-pointed to sweep `score` instead of `depth`
- `docs/audit/findings/pair-8-book-reconciliation.json` - `B-015` marked `remediated_by: tp1-21`
- `docs/audit/findings/pair-1-alwelg-sim-enemies.json`, `pair-3-aldisp-a-objects.json`, `pair-9-warp-drop-mode.json` - citation line numbers re-anchored (mechanical, no content change)

**Tests:** 1654/1654 passing (GREEN), `npm test -- citations` 25/25 green
**Branch:** fix/tp1-21-fuseball-score-tier (not pushed — SM handles merge)

**Handoff:** To Reviewer

## Delivery Findings → Reviewer (code review) — tp1-21

**Verdict: APPROVED.** No Critical/High/Medium issues. Gates personally observed:
`npm test` 1654/1654 (139 files), `npm run build` clean, `npm test -- citations` 25/25,
`reanchor-citations.mjs` → 104 correct / 0 re-anchored / 0 lost, working tree clean.

**ROM re-read independently (LF copy `~/Projects/tempest-source-text`):**
- `ALWELG.MAC:2754-2758` transcription is BYTE-EXACT. `LDA RANDO2 / AND I,7` → r∈0..7;
  `CMP I,3 / IFCS / LDA I,0` → 6502 carry set when r>=3, so tier = `r < 3 ? r : 0`. Code
  matches (`rules.ts:911-914`). Source comment `;RANDOMLY CHOOSE 0(250_,1(500), OR 2(750)`.
- `ALEXEC.MAC:598-600` TUPSCL/TUPSCM at idx 5/6/7 = 250/500/750 (tier 0/1/2). Confirmed.
- Weights 6/8 : 1/8 : 1/8 confirmed (r∈{0,3,4,5,6,7}→tier0, r=1→tier1, r=2→tier2).

**AC verification:**
- AC-1 (weighted roll, not depth): PASS. `fuseballScore(rng)` no longer takes depth; no
  residual depth in the scoring path; integration test proves same-seed @0.25 vs @0.8 →
  identical score (a depth-band impl would give 250 vs 750). Depth-independence real.
- AC-2 (ROM weights cited): PASS. Citation comment at `rules.ts:900-910` points at the
  correct lines and matches the ROM I re-read.
- AC-3 (SC-001 untouched): PASS. Diff touches only 4 source files + 3 audit JSONs + 3
  test files; no `@arcade/shared` high-score ladder change.
- AC-4 (citations green): PASS (25/25 observed).

**Determinism / purity (the hard boundary):**
- Roll draws from `state.rng` (seeded), exactly ONCE per fuseball kill; non-fuseball kills
  draw nothing (switch arms return constants). No `Math.random`/`Date`.
- No double-draw: `resolveBulletHits` sets `deadEnemies`/`break` so each enemy scores once;
  a bullet-killed enemy is filtered out of `s.enemies` before the zap loop, so bullet+zap
  can't both score it. `zapKillAt` scores once per idx.
- `splitTanker(t, tube, params)` takes no rng → a same-tick tanker split is not disturbed
  by the roll's cursor advance. Only `scoreFor` touches rng in the kill path.
- Enemy-fire is on a SEPARATE `fireRng` stream (`state.ts:235`), so the roll's advance of
  `s.rng` cannot desync fire cadence. (See Low-1 below re the residual `s.rng` shift.)

**B-015 remediated_by audit — GENUINE, not a phantom fix:** B-015's `ours.verbatim` is
`"  const tier = Math.min(2, Math.max(0, Math.floor(depth * 3))) // 0,1,2"` (rules.ts:902) —
exactly the depth-band line this story removed. Its `source` (ALWELG.MAC:2757) stays
checked and unchanged; `reanchor` reports 0 lost. Correct per CLAUDE.md convention.

**Test quality:** mutation-resistant and non-vacuous — distribution test is deterministic
(fixed seed 13579, N=20000, ±0.05 ≈ 16σ, no flake) with a real-tier liveness guard on every
draw; determinism test guards against all-NaN vacuous equality; depth-independence test is
the direct mutation-killer for the old impl. The two re-pointed tests (`sim.scoring.test.ts`,
`tp1-19.fx-fuse-score.test.ts`) were genuinely updated to the new reality (sweep `score`, not
`depth`), not weakened. `fx.ts` pop-up reads the ACTUAL awarded `e.score`; only-fuseball and
all-three-tiers wiring still covered.

**Non-blocking observations:**
- **Low-1 (accepted design consequence):** killing a fuseball now advances `s.rng`, shifting
  every later `s.rng` draw (spawns/cargo/demo) in that and future ticks. Intended and
  deterministic; TEA documented the envelope deviation; `fireRng` is insulated; full suite
  green proves no pinned behavior regressed. Recorded here so the record shows it was checked.
- **Low-2 (`EnemyDeathEvent.score?` optional):** correct in practice — both production
  emitters (`sim.ts:492`, `sim.ts:707`) always set it, and the only consumer (`fx.ts:245`)
  guards `!== undefined`; `audio-dispatch`/`render` don't read it. Optional trades a
  compile-time guarantee (a future 3rd emitter could forget `score` and silently drop a
  fuseball's pop-up) for fixture convenience. No action required for this story.

**Deviation audit:** TEA's "envelope not byte-trace" deviation (session `## Design
Deviations`) — ACCEPTED. Modelling the ROM's `RANDO2 AND 7` as `nextInt(rng, 8)` on our
seeded PRNG is the correct fidelity target (weighting + depth-independence), our generator
differs from the ROM LFSR by design. No undocumented deviations found.

**Handoff:** To SM for finish-story.
