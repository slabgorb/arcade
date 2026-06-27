---
story_id: "6-5"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-5: Enemies fire energy bolts at the player

## Story Details
- **ID:** 6-5
- **Title:** Enemies fire energy bolts at the player
- **Jira Key:** (none — local sprint tracking)
- **Epic:** 6 (Wave 6 — Playtest feel & balance)
- **Workflow:** tdd
- **Points:** 2
- **Priority:** p1
- **Type:** feature
- **Repo:** tempest
- **Stack Parent:** none

## Problem Statement

Enemies currently do not fire — the basic enemy energy bolts are missing. This feature implements authentic enemy projectiles with proper ROM constants, fire gating, spawn behavior, collision detection, and rendering.

## Technical Approach

### Core Simulation (src/core/sim.ts)

**Enemy fire decision gate (per-frame, enm_shoot 9539-9592):**
- Gate by: player alive, enemy along >= 0x30, per-enemy can-shoot bit, shot_delay elapsed, not mid-flip
- RNG-gated via threshold table indexed by count of live bolts:
  - 0 bolts: ~100% fire chance
  - 1 bolt: ~12.5% fire chance
  - 2 bolts: ~6.25% fire chance
  - 3 bolts: ~2.3% fire chance
  - 4 bolts: ~0.4% fire chance (self-limiting cap)

**Refire holdoff (shot_holdoff, 7000-7003):**
- L1: 80 frames / 1.33s
- L20: 23 frames
- L21-64: 20 frames
- L65+: 10 frames

**Eligible shooters (per user decision, rev-3 authentic):**
- Flippers: fire when gates pass
- Tankers: fire when gates pass
- Spikers: fire when gates pass
- Pulsars: fire on L60+ (all levels on hard mode)
- Fuseball: never fire

**Bolt spawn (9562-9577):**
- Spawns at firing enemy's current along/seg
- Travels straight down its lane (no tracking)
- Max concurrent enemy bolts: 4 (n_enemy_bullets=4)
- Speed: flipper-relative +0xc0 → L1 ~-202/s (bolt outruns flippers)

**Bolt-to-player collision (La1e4 9427):**
- Kills player ONLY if player is in bolt's lane when bolt reaches rim (player_status=0x81)
- Player dodges by leaving the lane before bolt arrival
- Bolts are destroyable by player fire

### Shell / Rendering (src/shell/)

**Bolt rendering:**
- Shape: white 4-corner pinwheel + red central 4-dot cross
- 4 spin frames (deterministic rotation)
- Render via Canvas 2D with glow aesthetic

**Sound (6-6 dependency):**
- Emit enemy-fire SFX event on bolt spawn (sound_enemy_fire, POKEY2 voice4)
- Or expose hook if 6-6 ships later

## Acceptance Criteria

- [ ] Eligible enemy types fire energy bolts that travel up the lane toward the player
- [ ] An enemy bolt reaching the player's claw (in the bolt's lane, at the rim) kills the player and triggers death/respawn
- [ ] Concurrent enemy bolts are capped at 4 (arcade n_enemy_bullets=4)
- [ ] Authentic fire model: self-limiting per-live-bolt RNG (~100/12.5/6.25/2.3/0.4% for 0-4 live bolts) + shot_holdoff refire (L1 80fr → L65+ 10fr)
- [ ] Shooter set = Flippers + Tankers + Spikers (fire when gates pass) + Pulsars L60+; Fuseball never
- [ ] Bolt travels straight down its lane at ~-202/s (L1), is destroyable by player fire, and renders as white-pinwheel/red-cross glyph
- [ ] Deterministic: enemy fire driven by seeded RNG + dt; covered by seeded core unit tests
- [ ] Enemy-fire event emits the authentic enemy-fire SFX (sound_enemy_fire; produced by 6-6), or exposes a sound hook if 6-6 lands later

## Dependencies

- **Blocks:** 6-6 (Bake & wire authentic POKEY SFX — needs enemy-fire sound hook)
- **Pairs with:** 6-6 (sound production)

## SM Assessment

**Readiness:** Story is ready for the RED phase. Scope is well-bounded for 2 points — the ROM behavior is fully specified in the description (who fires, the per-frame fire gate, the self-limiting RNG threshold table, refire holdoff, spawn/speed, bolt→player collision, and bolt shape), so TEA has concrete numbers to write seeded tests against.

**Routing:** `tdd` (phased) → TEA (red) → Dev (green) → Reviewer → SM (finish). Next owner is TEA.

**Key decisions carried into the story:**
- Shooter set follows the literal rev-3 ROM (user decision 2026-06-27): Flippers + Tankers + Spikers fire when gates pass; Pulsars fire L60+; Fuseball never. TEA should lock this in tests so it isn't quietly broadened.
- Fire model is RNG + dt deterministic — tests MUST seed RNG; no wall-clock or `Math.random`.
- Concurrent enemy bolt cap = 4 (n_enemy_bullets) is a hard invariant worth a dedicated test.

**Boundary / handoff notes for downstream:**
- Bolt SFX depends on 6-6 (POKEY). For this story, emit/expose an enemy-fire sound event/hook; do not block on 6-6 audio production.
- Authentic bolt-shape rendering detail also touches 6-8; this story renders a functional white-pinwheel/red-cross glyph, leaving deeper shape fidelity to 6-8 if needed.
- Split work cleanly: fire decision + bolt motion + collision live in `src/core` (deterministic, seeded-tested); rendering + sound hook live in `src/shell`.

**Risks:** The probabilistic fire table is the trickiest part to test deterministically — TEA should pin the seed and assert against known live-bolt-count buckets rather than fuzzy frequency checks.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New deterministic game behaviour in the pure core — exactly the kind of work this repo TDDs.

**Test Files:**
- `tempest/tests/core/rules.enemy-fire.test.ts` — pure rule helpers (shooter set, fire-chance table, refire holdoff)
- `tempest/tests/core/sim.enemy-fire.test.ts` — behavioural firing through `stepGame` (who fires, SFX event, 4-bolt cap, determinism)
- `tempest/tests/core/sim.enemy-bolt.test.ts` — bolt motion + collision (travel, no-tracking, dt-independence, outruns flippers, kill/dodge, destroyable, respawn-clears)

**Tests Written:** 30 tests covering all 8 ACs.
**Status:** RED — 27 failing (feature missing), 3 passing (intentional negative guards: dodge-different-lane, below-rim-no-kill, no-tracking). Baseline 336 pre-existing tests still green (no regressions). Verified via `testing-runner` (RUN_ID 6-5-tea-red).

### Rule Coverage

| Rule / source | Test(s) | Status |
|---------------|---------|--------|
| AC5 shooter set = Flipper+Tanker+Spiker always, Pulsar L60+, Fuseball never (user decision, literal rev-3) | `enemyCanShoot` table + behavioural fuseball-never / pulsar-<L60-silent | failing |
| lang-review TS #3 enum exhaustiveness (every `EnemyKind` ruled) | `enemyCanShoot` "returns a boolean for every enemy kind" | failing |
| AC4 self-limiting fire odds (~100/12.5/6.25/2.3/0.4%) | `enemyFireChance` bucket + strictly-decreasing | failing |
| AC4 refire holdoff (L1 80 → L65+ 10) | `enemyFireHoldoffFrames` anchors + non-increasing | failing |
| AC1 eligible enemies fire | flipper/tanker/spiker "fires within ~2.5s" | failing |
| AC8 enemy-fire SFX hook | "emits an enemy-fire event carrying lane+depth" | failing |
| AC3 concurrent cap = 4 (self-limiting saturation) | "never exceeds 4 … saturates to the cap" | failing |
| AC7 determinism (seeded RNG + dt; core-purity rule) | "identical bolt set for a fixed seed" + dt-independence | failing |
| AC6 bolt travels toward rim / straight lane / outruns flippers | motion tests | failing (1 guard passing: no-tracking) |
| AC2 bolt kills at rim (cause 'bolt') + dodge + last-life gameover + respawn clears bolts | bolt-vs-player tests | failing (2 guards passing: dodge, below-rim) |

**Rules checked:** All 8 ACs + 1 applicable lang-review rule (TS #3 exhaustiveness) have test coverage. Other lang-review checks (async, React/JSX, input validation, error handling) are N/A for a pure deterministic sim with no I/O.
**Self-check:** No vacuous tests. The two dt/cap tests that could pass on "no motion" were strengthened with explicit movement/saturation assertions (`d60 > 0.2`, `peak === 4`). No `as any`, no `assert(true)`, no `is_none`-on-always-none. The 3 RED-passing tests are deliberate boundary guards, not vacuous (each pins a real negative behaviour the GREEN code must preserve).

### Contract for Dev (Julia) — what the tests require you to build

1. **State** (`src/core/state.ts`): add `enemyBullets: EnemyBullet[]` to `GameState`, where `interface EnemyBullet { lane: number; depth: number }` (depth 0=far → 1=near rim; travels toward the rim, opposite to player `bullets`). Initialise to `[]` in `initialState`. **`cloneState` in `sim.ts` must deep-copy it** (mirror the `bullets` mapping), and `startLevel`/respawn must clear it (no chain-death).
2. **Rules** (`src/core/rules.ts`): export `enemyCanShoot(kind: EnemyKind, level: number): boolean`, `enemyFireChance(liveBolts: number): number`, `enemyFireHoldoffFrames(level: number): number`.
3. **Events** (`src/core/events.ts`): add `EnemyFireEvent { type: 'enemy-fire'; lane: number; depth: number }` to the `GameEvent` union (emit on bolt spawn — this is the 6-6 SFX hook). Extend `PlayerDeathEvent.cause` with `'bolt'`.
4. **Sim** (`src/core/sim.ts`): per-frame enemy fire decision (gates: player alive, enemy depth past the along threshold ~0x30, `enemyCanShoot`, per-enemy holdoff elapsed, not mid-flip, RNG vs `enemyFireChance(liveBolts)` threaded through `s.rng`), bolt motion toward the rim (faster than `flipperSpeed`), bolt→player kill at the rim on the player's lane, and bolt-destroyable-by-player-fire. Enforce the **hard cap of 4** concurrent bolts.

**Handoff:** To Dev (Julia) for the GREEN phase. Rendering the bolt glyph + wiring the SFX live in `src/shell` (don't block on 6-6 audio — the `enemy-fire` event is the hook). See **Design Deviations → TEA** for the along-gate test omission Reviewer should verify by reading code.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 366/366 passing (GREEN) — all 30 new 6-5 tests + 336 pre-existing, no regressions. `npm run build` (tsc --noEmit + vite build) clean. Verified via `testing-runner` (RUN_ID 6-5-dev-green-final).
**Branch:** feat/6-5-enemy-energy-bolts (pushed to origin; off `develop`, tempest gitflow)

**Files Changed (tempest):**
- `src/core/state.ts` — `EnemyBullet` type; `GameState.enemyBullets` + separate `fireRng`; optional per-enemy `fireCooldown`; initialise both in `initialState`.
- `src/core/events.ts` — `EnemyFireEvent` ('enemy-fire') in the union; `player-death` cause extended with `'bolt'`.
- `src/core/rules.ts` — `enemyCanShoot`, `enemyFireChance`, `enemyFireHoldoffFrames`; constants `MAX_ENEMY_BULLETS`, `ENEMY_FIRE_MIN_DEPTH`, `ENEMY_FIRE_MAX_DEPTH`, `ENEMY_BOLT_SPEED_OFFSET`.
- `src/core/sim.ts` — `stepEnemyFire` (gated fire decision via `fireRng`, 4-bolt cap, refire cooldown), `stepEnemyBullets` (motion toward rim, outruns flippers), `resolveEnemyBulletHits` (destroyable), `resolveEnemyBoltHits` (rim kill, cause 'bolt'), `cullEnemyBullets`; `cloneState` clones `enemyBullets`; `startLevel` clears them; all wired into the `playing` branch.
- `src/shell/render.ts` — `drawEnemyBullets` (white-pinwheel/red-cross glyph) + call in the render loop.
- `src/shell/audio.ts` — `enemyFire` manifest entry (SFX hook).
- `src/main.ts` — `enemy-fire` event → `audio.play('enemyFire')`.
- `tests/core/events.test.ts` — extended the Story 5-1 event-union exhaustiveness guard to admit the new `enemy-fire` variant and `bolt` cause (the guard correctly forced this; it's not a behavioural test change).

**AC status:** All 8 ACs implemented and green. Feature is wired end-to-end (core → render glyph → audio hook). SFX asset itself is 6-6's deliverable (hook is live and silent until then — see Delivery Findings).

**Self-review:** Code follows existing patterns (resolve* pipeline, seeded RNG threading, event channel). Core stays pure (no Date/random/DOM — boundary guard green). Two design choices logged as deviations (upper-bound fire gate; separate fireRng).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (366 green, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Yes | findings | 6 | confirmed 3, dismissed 2, deferred 1 |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 2 | confirmed 1 (downgraded), deferred 1 |
| 4 | reviewer-test-analyzer | Yes | findings | 11 | confirmed 9, dismissed 0, deferred 2 |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 |
| 6 | reviewer-type-design | Yes | findings | 4 | confirmed 2, deferred 2 |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Yes | findings | 2 | deferred 2 (optional style) |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 2 (low), downgraded 1 |

**All received:** Yes (9 returned, 7 with findings)
**Total findings:** 18 confirmed (all Medium/Low, non-blocking), 4 dismissed (with rationale), 7 deferred

## Rule Compliance

Project rules checked: CLAUDE.md (the hard pure-core boundary), `.pennyfarthing/gates/lang-review/typescript.md` (13 rules). No `.claude/rules/*.md` or `SOUL.md` in tempest.

- **Pure-core boundary (CLAUDE.md):** COMPLIANT. New `core/` code (state/rules/events/sim) imports no shell, touches no DOM/window, and uses `rngNext(s.fireRng)` + `dt` only — no `Math.random`/`Date.now`/`performance.now`. The events.test.ts boundary-token scan is green. Verified `src/core/sim.ts` stepEnemyFire:184 draws from the seeded stream; no I/O.
- **lang-review TS #3 (enum exhaustiveness):** `enemyCanShoot` (rules.ts:70) has no explicit `default: assertNever`, BUT I empirically verified its explicit `: boolean` return provides equivalent protection — a non-exhaustive switch over the union raises `TS2366` at compile time (reproduced in a scratch file). So the rule's underlying concern (silent `undefined`) does NOT materialize → downgraded to **LOW**. The `main.ts` event switch (main.ts:71) is the real (minor) gap: it sits in a for-loop body with no return constraint, so a future 10th GameEvent variant would compile silently with no audio case → **LOW/MED**, audio-only. Recommend `default: { const _: never = event }`.
- **lang-review TS #1/#2/#4/#5/#12 (type escapes, generics, null-handling, modules, perf):** COMPLIANT across 67 instances (rule-checker). Notably `e.fireCooldown ?? 0` (sim.ts) correctly uses `??` (0 means "ready", `||` would be a bug); `ENEMY_FIRE_CHANCE` is `readonly`.
- **lang-review TS #8 (test quality):** one confirmed nit — `max`/`peak` in the cap test (sim.enemy-fire.test.ts:134) are duplicate running-maxima (dead variable). **LOW.**
- **lang-review TS #6/#7/#10/#11/#13 (React, async, input-validation, error-handling, fix-regressions):** N/A — no JSX, no async, no untrusted input/JSON.parse, no try/catch added, not a fix.

## Devil's Advocate

Assume this is broken. **Tunneling:** opposite-moving player shots and bolts use a 0.06 point-overlap; the edge-hunter said large `dt` lets them pass through. I traced `loop.ts` — the fixed-timestep accumulator only ever calls `stepGame(..., 1/60)` (STEP); `MAX_FRAME` caps sub-step COUNT, not `dt`. At the real dt the closing speed only exceeds 2×HIT_DEPTH above level ~145. Rebutted. **Point-blank death:** a tanker split child spawns at depth 0.85 (just under the 0.9 fire ceiling) with `fireCooldown` undefined (=ready), so it can fire its first frame; the bolt has only 0.07 depth (~5 frames) to the rim — technically dodgeable but harsh. Real, minor. **Lost grab cue:** if a bolt and a grabber both reach the rim on the player's lane the same frame, `resolveEnemyBoltHits` (runs first) kills by 'bolt' and `resolvePlayerHits` early-returns on `!alive`, so the `player-grab` event/SFX is dropped. The player still dies (correct); only the cue/cause differs. Real, minor. **Determinism / RNG aliasing:** could `fireRng` ever equal `rng`? They start at `seed` vs `seed ^ 0x9e3779b9` and advance via independent mulberry32 chains — no practical aliasing; determinism holds for a fixed seed (proven by the determinism test). **Silent regressions:** the refire holdoff and the lower along-gate are implemented and correct but have NO behavioral test — a future edit that drops `fireCooldown` or the `< ENEMY_FIRE_MIN_DEPTH` check would stay green. Real coverage gap (Medium). **Confused user:** `enemyFireChance(4)` returns 0.004 but is unreachable in the fire loop (cap `break` at length 4) — a future caller could be misled; doc-only. None of these are data-corruption, security, or crash class. No Critical/High.

## Reviewer Assessment

**Verdict:** APPROVED

**Reviewed:** Yes

**Data flow traced:** seeded `fireRng` → `stepEnemyFire` gate (alive, depth∈[0.1875,0.9), `enemyCanShoot`, cooldown, `enemyFireChance(liveBolts)`) → `enemyBullets.push` + `enemy-fire` event → `stepEnemyBullets` (depth→rim) → `resolveEnemyBoltHits` (lane==player & depth≥0.92 → death cause 'bolt') / `resolveEnemyBulletHits` (player shot destroys bolt) → `cullEnemyBullets`. Safe: pure, seeded, capped at 4; verified no Math.random/Date/DOM in core.

**Pattern observed:** new logic faithfully mirrors the existing `resolve*` pipeline and seeded-RNG-threading style (sim.ts); enemy bolts correctly modelled as a separate channel from player `bullets` (opposite travel direction, separate cap).

**Error handling:** out-of-range inputs handled — `enemyFireChance` clamps `[0,4]`; `enemyCanShoot` exhaustiveness enforced by `: boolean` return (TS2366, verified). Audio asset miss is an intentional, documented silent no-op (load `.catch` + play guard).

**Why APPROVED:** All 8 ACs implemented and verified; 366/366 tests green; build clean; security clean; the authentic ROM numbers (shooter set, fire-chance table, holdoff frames, 4-cap) are exactly pinned by pure-function tests. No Critical/High findings (the one high-profile "tunneling bug" was dismissed on verification). The confirmed findings are all Medium/Low test-coverage and style improvements, captured below as non-blocking fast-follows.

**Confirmed findings (tagged by source, all Medium/Low — non-blocking):**
- `[TEST]` [MED] Refire holdoff (AC4) has no behavioral test — only pure values pinned; a regression dropping `fireCooldown` use would stay green. `tests/core/sim.enemy-fire.test.ts`.
- `[TEST]` [MED] Lower along-gate (`ENEMY_FIRE_MIN_DEPTH`, AC1) untested — enemy below ~0.188 should stay silent; now deterministically testable. `tests/core/sim.enemy-fire.test.ts`.
- `[TEST]` [LOW] `enemyFireChance(3)/(4)` use loose `toBeCloseTo(..,2)` (±0.005 ≈ 2×) — use exact `toBe`. `tests/core/rules.enemy-fire.test.ts:82-83`.
- `[TEST]` [LOW] Dead duplicate `max`/`peak` variable; `typeof ev.depth` weak (passes for NaN); player-bullet-consumption + `cullEnemyBullets` + pulsar-L60 behavioral paths untested. `tests/core/sim.enemy-fire.test.ts`, `sim.enemy-bolt.test.ts`.
- `[RULE]` [LOW/MED] `main.ts:71` event switch lacks `default: { const _: never = event }` (lang-review TS #3) — a future GameEvent variant compiles with no audio. `src/main.ts`.
- `[RULE]` [LOW] `enemyCanShoot` (rules.ts:70) has no explicit `assertNever` — downgraded: empirically verified the `: boolean` return raises TS2366 on a non-exhaustive switch, so no silent `undefined`.
- `[EDGE]` [LOW] Split-tanker children fire on their first eligible frame (no initial holdoff); a same-frame bolt+grab co-arrival drops the `player-grab` cue (`resolveEnemyBoltHits` precedes `resolvePlayerHits`); `checkLevelClear` doesn't clear `enemyBullets` (cleared later by `startLevel`, no consequence). `src/core/sim.ts`.
- `[SILENT]` [LOW] `audio.ts:82` empty `.catch` swallows all sample-load failures (intentional/pre-existing); `ready()` can't distinguish partial load. Observability nit.
- `[TYPE]` [LOW] `EnemyBullet`/`Bullet` are structurally identical despite opposite depth semantics (consider a brand/`readonly`); `fireCooldown?` optional relies on undefined=ready (`??` guard). `src/core/state.ts`.
- `[DOC]` [LOW] `rules.ts:62` `ENEMY_FIRE_MAX_DEPTH = 0.9 // == TANKER_SPLIT_DEPTH` — duplicated literal can silently drift. `src/core/rules.ts`.
- `[SIMPLE]` [LOW] `enemyBoltSpeed` one-liner is inlineable; cooldown-tick guard `!== undefined && > 0` could be a bare truthy check. Optional. `src/core/sim.ts`.

**Dismissed (with rationale):**
- `[EDGE]` Bolt↔shot tunneling at large `dt` — DISMISSED: `loop.ts` fixed-timestep only ever passes `dt = 1/60`; tunneling needs level >145. Verified.
- `[EDGE]` Frozen bolts rendered during `dying` — DISMISSED: consistent with existing enemy/bullet rendering during the death animation (the frozen board is intentional).

**Handoff:** To SM (Winston Smith) for finish-story.

## Workflow Tracking

**Workflow:** tdd  
**Phase:** finish  
**Phase Started:** 2026-06-27T23:27:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T22:22:43Z | 2026-06-27T22:25:50Z | 3m 7s |
| red | 2026-06-27T22:25:50Z | 2026-06-27T22:43:55Z | 18m 5s |
| green | 2026-06-27T22:43:55Z | 2026-06-27T23:03:11Z | 19m 16s |
| review | 2026-06-27T23:03:11Z | 2026-06-27T23:27:46Z | 24m 35s |
| finish | 2026-06-27T23:27:46Z | - | - |

## Delivery Findings

### TEA (test design)
- **Question** (non-blocking): The refire-holdoff table gives `L1=80, L20=23, L21-64=20, L65+=10` but does not specify the interpolation for L2-L19. Affects `tempest/src/core/rules.ts` (the `enemyFireHoldoffFrames` ramp). Tests assert only the explicit anchor points plus a monotonic-non-increasing property, leaving L2-19 to Dev's ROM reading. *Found by TEA during test design.*
- **Improvement** (non-blocking): Enemy bolts are a distinct concept from player bullets (separate cap of 4, opposite travel direction, separate collision channel). I modelled them as a new `GameState.enemyBullets` array rather than overloading `bullets`. Affects `tempest/src/core/state.ts` and `sim.ts` (`cloneState` must deep-copy the new array; `startLevel`/respawn must clear it). *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): The SFX hook is wired in the shell to `audio.play('enemyFire')` with a manifest entry `enemyFire: 'enemyfire.wav'`. The asset does not exist yet (play is a silent no-op until it loads). Affects `tempest/src/shell/audio.ts` and `6-6` — **6-6 must bake its enemy-fire POKEY sound to the filename `enemyfire.wav`** (or update the manifest entry). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The bolt glyph in `tempest/src/shell/render.ts` (`drawEnemyBullets`) is a functional white-pinwheel/red-cross with depth-driven spin, not a pixel-faithful port of the ROM `vg_sub_image_enemy_shot_1..4` frames. Affects `6-8` (authentic bolt-shape rendering) if higher fidelity is wanted. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): The refire holdoff (AC4) is implemented and correct but has NO behavioral test — only the pure `enemyFireHoldoffFrames` values are pinned. Affects `tempest/tests/core/sim.enemy-fire.test.ts` (add: an enemy fires once, then is silent for ~holdoff frames, then fires again). A regression dropping `fireCooldown` use would stay green. *Found by Reviewer during code review.*
- **Gap** (non-blocking): The lower along-gate (`ENEMY_FIRE_MIN_DEPTH`, AC1) has no test; an enemy below ~0.188 should stay silent. Now deterministically testable (no initial cooldown confound). Affects `tempest/tests/core/sim.enemy-fire.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Tighten `enemyFireChance(3)`/`(4)` assertions from `toBeCloseTo(..,2)` (±0.005, ~2× the value) to exact `toBe(0.023)`/`toBe(0.004)` — they are literal table entries. Affects `tempest/tests/core/rules.enemy-fire.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `main.ts` event switch lacks `default: { const _: never = event }` (lang-review TS #3) — a future GameEvent variant would get no audio with no compile error. Affects `tempest/src/main.ts`. (`enemyCanShoot` is already protected by its `: boolean` return.) *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Minor cleanups — dead duplicate `max`/`peak` var in the cap test (`sim.enemy-fire.test.ts`); `EnemyBullet`/`Bullet` are structurally identical (consider a brand or `readonly` to prevent accidental cross-assignment despite opposite depth semantics); split-tanker children fire on their first eligible frame (no initial holdoff — document or seed `fireCooldown`); a same-frame bolt+grab co-arrival drops the `player-grab` cue (`resolveEnemyBoltHits` runs before `resolvePlayerHits`). Affects `tempest/src/core/{state,sim}.ts`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **Along-gate (enemy depth ≥ 0x30) is not isolated in a dedicated test**
  - Spec source: context-story-6-5.md, fire-decision gate ("enemy along >= 0x30")
  - Spec text: "per-frame, gated by player-alive, enemy along >= 0x30, can-shoot bit, per-enemy shot_delay elapsed, not mid-flip"
  - Implementation: No standalone test for the depth/along gate. It cannot be isolated deterministically from the per-enemy `shot_delay` gate without controlling internal enemy fire-timer state, which I deliberately did not pin (it would over-specify Dev's enemy-state shape). The gate is exercised indirectly: firing tests place enemies well past the gate (depth ≥ 0.3) and the "below the rim" bolt cases confirm shallow positions don't kill.
  - Rationale: A standalone behavioural along-gate test would be vacuous or flaky (it could pass for the wrong reason — `shot_delay` not yet elapsed). Avoiding a non-meaningful assertion (lang-review TS #8 / test-paranoia) is preferable to a false-confidence test.
  - Severity: minor
  - Forward impact: Dev should still implement the `along >= 0x30` gate; Reviewer may want to confirm it by reading the implementation rather than relying on a test.
- **Fire probability asserted as a pure table, not via frequency sampling**
  - Spec source: context-story-6-5.md, AC "self-limiting per-live-bolt RNG (~100/12.5/6.25/2.3/0.4%)"
  - Spec text: "RNG ... vs a threshold table indexed by the number of LIVE bolts -> P(fire) approx: 0 bolts ~100%, 1 -> 12.5%, ..."
  - Implementation: `enemyFireChance(liveBolts)` is asserted as an exact pure function (toBeCloseTo per bucket + strictly-decreasing), instead of statistically sampling fire frequencies through stepGame.
  - Rationale: Matches the SM assessment's explicit guidance ("pin the seed/values, don't fuzzy-frequency-check"). Pure-function assertions are deterministic and non-flaky; the self-limiting *behaviour* is still proven end-to-end by the 4-bolt cap test.
  - Severity: minor
  - Forward impact: Dev must expose `enemyFireChance` as a pure export so the probability model is unit-testable.

### Dev (implementation)
- **Added an upper-bound depth gate (`ENEMY_FIRE_MAX_DEPTH`) to the fire decision**
  - Spec source: context-story-6-5.md, fire-decision gate list ("along >= 0x30 ...")
  - Spec text: "per-frame, gated by player-alive, enemy along >= 0x30, can-shoot bit, per-enemy shot_delay elapsed, not mid-flip"
  - Implementation: Enemies also stop firing once `depth >= ENEMY_FIRE_MAX_DEPTH` (0.9, the arrival/grab-split zone). The story lists only a *lower* along bound; I added an upper one.
  - Rationale: Without it, an enemy placed at the rim (depth ≥ 0.92) fired a point-blank bolt that killed the player the same frame, which (a) broke two established tests — `sim.events` flipper-grab and `tanker` split-at-rim — by stealing the kill from the grab/split path, and (b) contradicts AC2's dodge mechanic (a rim-spawned bolt is un-dodgeable). An enemy at the rim grabs/splits; it does not shoot. No new test asserts firing above 0.9, and every 6-5 firing test uses enemies below it, so the gate is safe.
  - Severity: minor
  - Forward impact: none for siblings. Reviewer note: this is the reconciliation of "enemy fire" with the pre-existing rim grab/split behaviour.
- **Enemy-fire RNG uses a separate stream (`GameState.fireRng`), not the movement RNG**
  - Spec source: context-story-6-5.md, AC7 ("deterministic ... seeded RNG + dt") and the ROM note (pokey1_rand)
  - Spec text: "RNG (pokey1_rand) vs a threshold table ..."
  - Implementation: Fire rolls draw from a second seeded stream (`fireRng = makeRng(seed ^ 0x9e3779b9)`) instead of the shared movement `rng`.
  - Rationale: Threading fire rolls through the shared `rng` would shift the movement RNG sequence and desync every existing flip/spawn test. A separate stream keeps fire deterministic (AC7) AND leaves all prior seeds reproducible. Mirrors the ROM, which fires off its own pokey1_rand.
  - Severity: minor
  - Forward impact: none — additive `fireRng` field; existing seeds unchanged.

### Reviewer (audit)
- **TEA — Along-gate not isolated in a dedicated test** → ✗ FLAGGED by Reviewer (non-blocking): reasonable at RED time, BUT now closeable. The implementation has no initial per-enemy `shot_delay` (undefined cooldown = ready), so the lower along-gate CAN be tested deterministically (enemy below 0.1875 stays silent). Logged as a non-blocking follow-up finding.
- **TEA — Fire probability asserted as a pure table, not frequency sampling** → ✓ ACCEPTED by Reviewer: correct approach (deterministic, matches SM guidance). Minor: the (3)/(4) buckets use a loose `toBeCloseTo(..,2)` (±0.005 ≈ 2× the value) — should be exact `toBe`; logged as a follow-up.
- **Dev — Upper-bound fire gate `ENEMY_FIRE_MAX_DEPTH`** → ✓ ACCEPTED by Reviewer: sound and necessary. Verified it reconciles enemy fire with the pre-existing rim grab/split tests AND keeps bolts dodgeable (AC2). Indirectly covered by the `sim.events` grab and `tanker` split tests. Suggest an explicit ≥0.9 negative test (non-blocking).
- **Dev — Separate `fireRng` stream** → ✓ ACCEPTED by Reviewer: correct; prevents desyncing movement-RNG seeds and mirrors the ROM's pokey1_rand. No aliasing risk (distinct seed, independent mulberry32 chains). Endorsed by the simplifier as justified.

## Reference Documents

- **Design Reference:** docs/ux/2026-06-27-tempest-arcade-feel-reference.md (Enemy roster section)
- **ROM Source:** tempest.a65 (rev-3), enemy-recon documentation
- **Related:** 6-6 (POKEY SFX), 6-8 (authentic bolt shape rendering), 6-9 (enemy behavior constants)