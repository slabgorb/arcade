# Story jt8-6 Context

## Title
Egg-ladder counter outlives a life — DEGGS shares the DECISION BLOCK with DSCORE (JOUSTRV4.SRC:106/:111/:113), so it must survive a mount death; our eggHits rides the player PROCESS and resets to rung 1 on every respawn. REPRODUCED: a veteran with 3 prior hits scores 1000, then the identical staging after a respawn scores 250.

## Story Overview
**Epic:** jt8 (Joust — playability: enemies hunt and eggs can be caught)
**Type:** TDD
**Repos:** joust
**Story ID:** jt8-6
**Priority:** p2
**Points:** 3

## Problem Statement

The egg-ladder counter (eggHits) currently rides the player **process** and resets to rung 1 every time a player respawns. The ROM's `DEGGS` counter, declared in the DECISION BLOCK alongside `DSCORE` (the score that survives a death), persists across respawns.

**Reproduction:** A player with 3 prior egg catches scores 1000 on the next catch, then dies and respawns. On the identical staging, the reborn player scores 250 (rung 1) instead of continuing from rung 4.

**Root cause:** `respawnPlayerProcess` (demo.ts:333) builds a fresh player process via `playerProcess()`. The eggHits counter has only three sites in `src/` — declaration at demo.ts:167, read at :904, write at :905 — none of which carry the value across process replacement. game.ts:439 appends the fresh process after respawn.

**ROM evidence:** `DEGGS RMB 2` is declared at JOUSTRV4.SRC:113 inside the `* DECISION BLOCK *` (ORG $0, :101-113) alongside `DSCORE` and `DCRE` ("DECISION TO BE RECREATED BY WHOM"). A player's score survives their death; the block is the persistent per-player identity, so the counter does too.

## Acceptance Criteria

1. **eggHits counter homed on DemoSim per-player record:** The counter is moved from the player process (`DemoProcess.eggHits?`) to a new per-player record on `DemoSim` (following the jt8-1 `targets` precedent). The `targets` field at demo.ts:205 shows the pattern: a carried field on `DemoSim`, initialized by `createWaveDemo`, advanced/reconciled in `stepDemo`. The eggHits record must mirror this structure. Pinned by test.

2. **Counter survives player respawn:** A player with eggHits=3 dies and respawns; the counter persists at 3 (not reset to 0/undefined). The reproduction case is verified: f(N) same staging with 3 prior hits → 1000 score, then respawn → f(N+k) same staging → 1000 score (not 250). Cited (JOUSTRV4.SRC:113, DCRE field as evidence of persistent per-player identity). Seeded run, mutation-checked.

3. **Counter is initialized per player on demo creation:** `createWaveDemo` seeds the new per-player eggHits record for each player (or it remains zero/empty). On the first catch, the counter advances from 0 → 1 and pays the first rung. Verified by test across multiple waves.

4. **Event emission path unchanged:** The call site in `collisionPass` (demo.ts:904-905) reads the counter from the sim, bumps it, and writes it back. No changes to the signature or semantics of the read/write — the counter's HOME changes, not the usage. The five-catch ladder walk from jt8-4 tests remain green (ladder climbs per player, rungs peg at 1000, one player's rungs never advance the other's).

5. **Wave/game reset scope is OUT of scope:** The decision-block initialiser (where the ROM clears the counter) was not chased in the parent jt8-4 review. This story does NOT test or specify cross-wave or cross-life reset behaviour. A per-player record on `DemoSim` will be replaced when a new wave demo is created, which covers the practical wave boundary; the game-level boundary and the ROM's literal initialization remain unresolved and belong to a follow-up. Recorded as an open question (see Design Deviations).

6. **Determinism and purity:** A seeded run where a player catches an egg, dies, respawns, and catches again replays bit-for-bit the exact score events. The counter's read/write is deterministic (no clock, no entropy). The `collisionPass` function remains pure. `src/core` purity guard passes; citations suite green.

## Current Implementation State

**File anchors verified (as of 2026-07-29):**

| Location | Current state | Role |
|----------|---------------|------|
| `demo.ts:167` | `eggHits?: number` on DemoProcess | OLD: per-process counter (problem) |
| `demo.ts:204-206` | `DemoSim` interface | WHERE: add per-player record here |
| `demo.ts:333` | `respawnPlayerProcess()` | WHERE: fresh process loses old counter |
| `demo.ts:904` | `const hits = bumpEggHits(self.eggHits ?? 0)` | READ: current per-process read |
| `demo.ts:905` | `self = { ...self, eggHits: hits }` | WRITE: current per-process write |
| `game.ts:439` | `processes = [...processes, respawnPlayerProcess(id)]` | APPEND: fresh process with undefined eggHits |

## Reuse / Citation Pattern (Precedents)

### jt8-1 targets record (the pattern to follow)

File: `joust/src/core/demo.ts`

- **DemoSim carries the record:** Line 205, `readonly targets: TargetState` — a carried field on the sim
- **Initialization:** `demo.ts:632`, `targets: seedTargets()` — seeded in `createWaveDemo`
- **Step advancement:** `demo.ts:1018`, `const tickedTargets = tickTargetTimers(demo.sim.targets)` — ticked in `stepFrame`
- **Reconciliation:** `demo.ts:1120`, `const targets = reconcileTargets(tickedTargets, processes)` — reconciled in `stepDemo` to handle process changes

**Pattern:** A carried field on DemoSim that persists across process rebuilds and is updated in lockstep with the sim's step.

### egg.ts primitive functions (reuse from jt8-4)

File: `joust/src/core/egg.ts`

- **`bumpEggHits(n: number): number`** (lines 260-262) — increments and caps the hit count (identical to jt8-4's usage)
- **`eggValue(hitCount: number): number`** (lines 249-252) — ladder lookup (1→250, 2→500, 3→750, 4+→1000)
- **`airCatchBonus(pfeet: number): number`** (lines 254-257) — mid-air bonus gate (returns 500 iff pfeet === 0)

## ROM Citations

### DEGGS (JOUSTRV4.SRC:113) — The per-player egg-hit counter

**Source:** JOUSTRV4.SRC:101-116 (the DECISION BLOCK)

```
    DECISION BLOCK
    ORG    $0
DSCORE  RMB 2   SCORE RAM LOCATION           <- line 106
DCRE    RMB 2   DECISION TO BE RECREATED BY WHOM  <- line 111
DEGGS   RMB 2   EGG KILLED COUNTER           <- line 113
```

**Evidence of persistence:**
- DSCORE (line 106) is the player's score pointer, which plainly survives a death (no player loses score for losing a life).
- DCRE at line 111: "DECISION TO BE RECREATED BY WHOM" — the block carries its own re-creation wiring, making it the persistent per-player identity.
- DEGGS at line 113 shares the same block with DSCORE, so it has the same lifetime.

**Never reset in EGGSCR:**
- EGGSCR (JOUSTRV4.SRC:3030-3095) reads DEGGS and writes the bumped count back (:3033-3053), but never clears or resets it. The counter climbs across successive catches for a player.
- The only write to the counter is `STB ,Y` (:3053), which stores the capped-bumped value.
- **Wave/game reset:** The decision-block initialiser (where DEGGS is cleared per wave or per game) was not chased in jt8-4 review and is OUT OF SCOPE for this story.

### EGGSCR (JOUSTRV4.SRC:3033-3053) — The counter read/write path

**Source:** Lines 3033-3053

- :3033 `LDY PDECSN,U` — load the catching player's decision-block pointer (U = player's workspace, X = egg's)
- :3037 `LDY DEGGS,Y` — load the counter from DEGGS
- :3053 `STB ,Y` — write the bumped (and capped) count back to the counter

**Key fact:** The counter is read FROM and written TO the **player's decision block** (via U → PDECSN), never from the egg's (X is the egg's workspace).

## Verification & Testing Notes

**Test baseline (pre-story):** 1828 tests passing (73 test files), per jt8-4's delivery.

**New tests for this story must cover:**
1. Counter persists across a respawn: `eggHits === 3` before respawn, `eggHits === 3` after
2. Reproduction: ladder value at each rung before and after respawn (1000 stays 1000, not drops to 250)
3. Per-player independence: P1's counter climbs, P2's counter is independent (one player catching eggs does not advance another's rung)
4. Initialization: on wave creation, both players start at eggHits 0 (or undefined, which reads as 0)
5. Seeded run: a deterministic sequence with player death and respawn replays bit-for-bit

**Determinism anchor:** Use a seed that spawns eggs, has player 1 catch N, then die and respawn, then catch again. The event sequence must replay identically (same player, same score values, same order).

---

_Generated by `sm-setup` for story jt8-6. Do not edit after agents claim the story._
