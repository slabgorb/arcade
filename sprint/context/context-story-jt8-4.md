# Story jt8-4 Context

## Title
Egg collection — the player-vs-egg catch pass (PLYEGG/EGGSCR), ladder plus 500 mid-air, cancel remount

## Story Overview
**Epic:** jt8 (Joust — playability: enemies hunt and eggs can be caught)
**Type:** TDD
**Repos:** joust
**Story ID:** jt8-4

The missing egg pickup — PLYEGG (:3009) / EGGSCR (:3030-3095). Add a player-vs-egg pass to collisionPass (demo.ts): on a player overlapping an egg, emit the egg score events via the EXISTING egg.ts core (eggScoreEvents = the EGGVAL ladder 250/500/750/1000 by hit count capped, :3097-3104, PLUS 500 if caught mid-air with PFEET==0, :3063-3069), attribute the score to the catching player (a score/reason:egg/player event the game.ts drain already credits to the right ledger), REMOVE the egg, and cancel any incoming remount bird (AUTOFF, :3078-3087).

## Critical Framing: REUSE-FIRST

**This story is REUSE-FIRST. Do not re-implement the ladder or air bonus.**

The entire EGGVAL scoring ladder (250/500/750/1000 by hit count, capped, :3097-3104) and the +500 mid-air bonus (PFEET==0, :3063-3069) **already exist and are already tested** in `egg.ts` (story jt2-4):
- `eggValue(hitCount)` — maps 1-based hit count to the ladder (capped at 1000)
- `airCatchBonus(pfeet)` — returns 500 iff egg not yet bounced (pfeet === 0), else 0
- `eggScoreEvents(egg)` — emits [ladder-value, air-bonus?] (the complete event list for this catch)

The game.ts drain (story jt4-1) **already handles reason:egg**:
- `creditScoreEvents(players, events)` processes events with `reason: 'egg'` and attributes them to the catching player (ledger at `ledgerIndex(player, 2)`), exactly like `reason: 'kill'` events from enemy deaths.

**The only new code is:**
1. The player-vs-egg collision pass (in `collisionPass`, `demo.ts`)
2. Egg removal from the process list
3. Cancellation of remount birds (AUTOFF, if any pending for that egg)

If you re-implement the ladder or air bonus, the story has failed its premise.

## Acceptance Criteria

1. **collisionPass gains a player-vs-egg pass:** a player overlapping an egg emits the egg score events (via egg.ts eggScoreEvents) attributed to the catching player and REMOVES the egg; pinned by test.

2. **Mid-air vs settled scoring:** A mid-air catch (PFEET==0, egg not yet bounced) emits ladder plus 500; a grounded/settled catch emits ladder only; the ladder value follows the hit count (250/500/750/1000 capped). Cited (:3063-3069, :3097-3104); mutation-checked.

3. **Ledger attribution and remount cancellation:** The catching player ledger advances (not the partner) via the existing game.ts drain; an incoming remount bird for that egg is cancelled (AUTOFF, :3078-3087).

4. **Determinism:** a seeded run where a knight catches a fallen egg replays the exact score events bit-for-bit; purity guard plus citations plus npm test green.

## Reuse Targets (Read-Only Context)

### egg.ts (jt2-4) — Scoring core already delivered and tested

File: `joust/src/core/egg.ts`

- **`eggScoreEvents(egg: EggState): number[]`** (lines 265-269) — emits the complete event list for a catch:
  - `[eggValue(bumpEggHits(egg.hitCount))]` — the ladder value (250/500/750/1000)
  - `+[AIR_CATCH_BONUS]` if `egg.pfeet === 0` (mid-air catch bonus of 500)
  - Returns: `number[]` array of point values to be drained by game.ts

- **`eggValue(hitCount): number`** (lines 249-252) — ladder lookup:
  - 1→250, 2→500, 3→750, 4+→1000 (capped)
  - Maps 1-based hit count to DVALUE (JOUSTRV4.SRC:3097-3104)

- **`airCatchBonus(pfeet): number`** (lines 254-257) — mid-air bonus gate:
  - Returns 500 iff `pfeet === 0` (egg still in air, hasn't bounced)
  - Otherwise 0 (settled egg gets no bonus)
  - Gate cited: `:3063-3069`

- **`EggState` interface** (lines 37-58) — carries:
  - `pfeet: number` — 0 = in air (bonus live), nonzero = landed
  - `hitCount: number` — per-decision hit count (pegged at 4)
  - Other fields: posX, posY, velX, velY, bumpX, bumpY, eggsLeft, settled

### game.ts (jt4-1) — Score drain already credits reason:egg

File: `joust/src/core/game.ts`

- **`creditScoreEvents(players, events): PlayerLedger[]`** (lines 274-281) — the drain:
  - Processes events with `{ kind: 'score', value, reason: 'kill' | 'egg', player }`
  - Each event's value is added to `scores[ledgerIndex(player, playerCount)]`
  - Already handles `reason: 'egg'` events identically to `reason: 'kill'`

- **`GameScoreEvent` type** (lines 140-145) — event shape:
  - `kind: 'score'` — required for draining
  - `value: number` — points to credit (the event value from eggScoreEvents)
  - `reason: 'egg' | 'kill'` — tag (already supports 'egg')
  - `player: number` — process id (1 = P1 / ledger 0, 2 = P2 / ledger 1)

### demo.ts — collisionPass structure and remount tracking

File: `joust/src/core/demo.ts`

- **`collisionPass(processes)` signature** (lines 757-852):
  - Input: `processes: readonly DemoProcess[]` (all entities: players, enemies, eggs, pteros, etc.)
  - Output: `{ processes: DemoProcess[], events: DemoEvent[] }`
  - Current passes: player-vs-enemy (kills, egg spawns), player-vs-ptero (lance-height)
  - **Missing:** player-vs-egg catch pass

- **`DemoProcess` type** (carry this identity):
  - `kind: 'egg'` — eggs are processes
  - `egg?: EggState` — the egg's state (when `kind === 'egg'`)
  - `id: number` — unique id (eggs: `0x1_0000 + loser.id` for kill-eggs)

- **Remount tracking** (relevant context):
  - When an enemy dies → `spawnEgg(victim)` (jt2-4) → `eggProcess(id, egg)` added to processes
  - Hatched buzzard created by `remountEnemyProcess(egg)` in demo.ts (separate seam)
  - **AUTOFF cancellation** (`:3078-3087`): when an egg is caught, any pending remount for that egg must be cancelled
  - Remount identification: look for processes with `remountFor === egg.id` (or equivalent tracking)

## Previous Stories in Epic (for seam context)

### jt8-1 (DONE) — Target aggro subsystem
- Delivered: `target.ts` aggro module with TARPLY/TARTM grace timers, wired to enemy step
- Seam: `frame.ts` `runBehaviour` passes computed target into `stepEnemy`
- Affects collisionPass: none directly (jt8-4 independent of enemy chain)

### jt8-2 (DONE) — Enemy horizontal homing
- Delivered: `enemy.ts` horizontal facing nudge (PFACE velocity-matched reversal)
- Seam: `frame.ts` carries updated facing back onto enemy process
- Affects collisionPass: none directly (jt8-4 independent of enemy chain)

### jt8-3 (backlog) — Cliff look-ahead + shadow player-line tracking
- Not yet started
- Affects collisionPass: none (independent chain)

### jt8-4 (THIS STORY) — Egg collection (INDEPENDENT of enemy chain)
- Seam: collisionPass player-vs-egg pass
- No dependency on jt8-1, jt8-2, or jt8-3
- Quickest standalone playability win

## ROM Citations

### PLYEGG (:3009) — The player-vs-egg catch routine entry
**Source:** JOUSTRV4.SRC:3009
**Role:** Entry point for player catching an egg
**Mechanism:** Tests player-vs-egg collision, computes score events, removes egg, cancels remount
**Cited constants:**
- PFEET (:2985, :3196) — egg in-air flag (0 = air, nonzero = landed)
- EGGVAL ladder (:3097-3104) — the 4-entry value table
- Air bonus (:3063-3069) — +500 mid-air credit

### EGGSCR (:3030-3095) — The egg scoring routine (full range)
**Source:** JOUSTRV4.SRC:3030-3095
**Includes:**
- :3030-3062 — Setup (entry via PLYEGG)
- :3063-3069 — Mid-air bonus gate (PFEET==0 check, +500)
- :3070-3087 — Ladder fetch + remount cancellation (AUTOFF)
- :3088-3095 — Exit (score registered, egg dead)

**Key sub-ranges:**
- :3063-3069 — **Air catch bonus condition** (PFEET==0, add 500 if true)
- :3078-3087 — **Remount cancellation** (AUTOFF — zero the incoming remount process for this egg)
- :3097-3104 — **EGGVAL ladder** (4 entries: 250, 500, 750, 1000)

## Current Test Baseline
- **joust suite total:** 1787 passed, 0 failed, 0 skipped
- **Affected suites on story completion:**
  - `tests/egg.test.ts` — existing (green, untouched)
  - `tests/game.test.ts` — existing (will gain jt8-4 scoring integration tests)
  - `tests/demo.test.ts` — existing (will gain jt8-4 collision pass tests)
  - New test file(s) TBD by TEA (collision fixtures, seeded traces, etc.)

## Independence Marker
**This story is INDEPENDENT of jt8-1 → jt8-2 → jt8-3 enemy chain.**

It does not:
- Depend on target.ts (aggro system)
- Depend on enemy.ts (pursuit AI)
- Touch frame.ts enemy step wiring

It is the quickest standalone playability win in the epic.

---

_Generated by `sm-setup` for story jt8-4. Do not edit after agents claim the story._
