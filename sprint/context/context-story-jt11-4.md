# Story jt11-4: Enemies materialize one-by-one on the pads: replace the one-frame batch insert with pending-arrival schedule + wire the transporter ServiceQueue

## Story Details
- **Story ID:** jt11-4
- **Epic:** jt11 (Joust — cabinet experience: start flow, HUD, landing physics, transporter cadence, lava shore, high-score UX)
- **Title:** Enemies materialize one-by-one on the pads
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Repos:** arcade (plugins/joust/src/core)
- **Workflow:** tdd

## Problem / Root Cause

Wave entry currently inserts all enemies in a single frame (**one-frame batch insert**) via:
- `spawnWaveEnemies` loop (demo.ts:1209-1219)
- Wave-1 construction (demo.ts:1238-1242)
- Wave advance `processes=[...processes,...arrivals]` mutation (demo.ts:2261-2271)

However, the **authentic ROM machinery is already implemented, tested, and completely unwired** in the codebase:
- **ServiceQueue take-a-number serving law** (transporter.ts:155-202; ROM: NPSERV/LESERV JOUSTRV4.SRC:5615-5676). Four counters: `npserv`/`lpserv` (players), `neserv`/`leserv` (enemies). Read the real signatures out of transporter.ts before writing a test — they are all pure and take the queue as the first argument:
  - `newServiceQueue(): ServiceQueue` — all four counters 0, so nobody waits and nobody is served
  - `takeEnemyNumber(q) → { ticket, queue }` — draws `neserv` and increments it (ROM :5664-5666)
  - `enemyTurn(q, ticket) → boolean` — `ticket === q.leserv` **AND** `q.npserv === q.lpserv`, i.e. no player still holds an unserved number. **Players are served ahead of enemies** (ROM :5672-5675)
  - `serveEnemy(q) → ServiceQueue` — advances `leserv` after an enemy materialises (INC LESERV, :5724). Takes the queue only — there is no ticket parameter
  - `nextServed(q) → 'player' | 'enemy' | 'idle'` — who the service hands the next transporter to; **not** a queue position
  - The player-side twins `takePlayerNumber`/`playerTurn`/`servePlayer` exist alongside them and are equally unwired; this story wires the enemy path only.
- **Deferral via `spawnProceeds`** (transporter.ts:149; ROM: JOUSTRV4.SRC:5641-5654) — `spawnProceeds(occ: AreaOccupancy, tier: Tier): boolean` returns `occ[tier] === 0`. This is the **empty-third-of-the-SCREEN** rule: the arena splits into `top`/`middle`/`bottom` thirds by y (`selectArea`, occupancy tallied over occupant ys, transporter.ts:140-142), and a spawn PROCEEDS into a tier only while that third is **empty of occupants** — a crowded third DEFERS it. It is a **spatial** gate, not a time window, and it measures nothing in seconds or frames.
- **Proven template:** `pendingPteros` countdown queue (demo.ts:2303-2334; ROM: PTERWV JOUSTRV4.SRC:2618-2624)

Today **zero production callers** exist for the ServiceQueue (demo.ts imports only `enterViaPads`/`beginMaterialise`/`stepMaterialise`/`PADS` demo.ts:91-101). This story wires it into wave entry.

## Technical Approach

**Core principle:** Replace the batch insert with a per-enemy schedule keyed to ROM-authentic stagger, using the proven `pendingPteros` countdown pattern. Two distinct laws gate each arrival and both must hold before an enemy is released:

1. **Whose turn** — the take-a-number ticket queue (`enemyTurn`), which also enforces players-ahead-of-enemies.
2. **Whether the destination is clear** — `spawnProceeds(occ, tier)`, the spatial empty-third rule. A crowded third defers the arrival to a later frame; it does not shorten or lengthen a timer.

⚠️ **Do not model `spawnProceeds` as a duration.** An earlier draft of this context described it as an "empty-third-of-a-second" deferral. That was wrong — it is `occ[tier] === 0` over the arena's top/middle/bottom thirds. A test written against a time window would be testing a law the ROM does not have.

### Wiring Details

1. **Initialize a ServiceQueue at wave-creation time** (demo.ts:1238-1242, wave-1 construction).
   - Before the current `spawnWaveEnemies` loop, call `newServiceQueue()` to allocate the serving law.
   - Assign each enemy a queue position via `takeEnemyNumber(queue)`.

2. **Defer each enemy's `beginMaterialise` insertion to its scheduled release frame.**
   - Instead of calling `beginMaterialise` immediately (one-frame batch), build a `pendingArrivals` queue (like `pendingPteros` demo.ts:2303-2334).
   - Each pending arrival carries its own countdown (the cadence, on the `pendingPteros` template) plus the enemy process and specs.
   - Tick the countdown each frame; when it reaches zero the arrival becomes *eligible*, then release it only if `enemyTurn(q, ticket)` says it is that enemy's turn **and** `spawnProceeds(occ, tier)` says its destination third is empty. Otherwise it stays pending and is retried on a later frame. On release, call `serveEnemy(q)` to advance `leserv` so the next ticket comes up.

3. **Wave advance mutation unchanged.**
   - Continue the `processes=[...processes,...arrivals]` mutation (demo.ts:2261-2271).
   - `arrivals` now contains the deferred ServiceQueue, not a one-frame batch.

4. **Template reference:** Replicate the `pendingPteros` structure (demo.ts:2303-2334).
   - Pteros use a countdown-keyed schedule for arrival.
   - The same pattern applies to enemies with the ServiceQueue managing the stagger.

### Key Invariants

- **Insertion sites**: `spawnWaveEnemies` loop structure, `enemyProcess` factory, `materialise` effect all remain **unchanged**.
- **Only timing changes**: immediate batch (one frame) → deferred stagger (per-enemy release frame).
- **Core-only**: demo.ts, transporter.ts — no shell clock/DOM/render dependencies.
- **Purity guard**: All code is pure; core-boundary test scans for violations.

## Acceptance Criteria

1. **ServiceQueue wired into wave entry:** Wave-creation (demo.ts:1238-1242) initializes a `ServiceQueue` via `newServiceQueue()`. Each enemy is assigned a queue position via `takeEnemyNumber(queue)` before spawn.

2. **Per-enemy arrival schedule:** A `pendingArrivals` queue (mirroring `pendingPteros` demo.ts:2303-2334) holds each enemy's deferred insertion, keyed by countdown tick. Countdown decrements in `stepMaterialise` (or equivalent step function). Spawn occurs when countdown reaches zero for that enemy.

3. **`spawnProceeds` empty-third deferral wired:** An arrival whose destination third is occupied is **held** and retried on a later frame; one whose third is empty proceeds (`spawnProceeds(occ, tier)`, transporter.ts:149, JOUSTRV4.SRC:5641-5654). The occupancy is measured over the arena's top/middle/bottom thirds — a **spatial** gate, never a timer. Test it by crowding a tier and asserting the arrival is deferred while a sibling bound for an empty tier is not.

3a. **Ticket order and player priority:** Enemies are released in ticket order (`enemyTurn` requires `ticket === leserv`), one served at a time, and no enemy is served while a player holds an unserved number (`npserv !== lpserv`) — JOUSTRV4.SRC:5672-5675. `serveEnemy(q)` advances the counter on each release.

4. **Ptero-stagger template reused:** The `pendingArrivals` mechanism mirrors `pendingPteros` countdown structure (demo.ts:2303-2334, PTERWV JOUSTRV4.SRC:2618-2624). TEA/Dev to apply this proven pattern.

5. **Enemy factory and materialise effect unchanged:** the `enemyProcess` factory and the materialise effect are untouched — **only insertion timing moves** (batch → deferred stagger), which is the story's own wording. `spawnWaveEnemies` necessarily changes from *inserting* to *enqueueing*; what must not change is what it builds.

6. **Each enemy's beginMaterialise window is its own release frame:** The `MATERIALISE_WINDOW` (demo.ts:406; birth demo.ts:598-599) defines the window during which `beginMaterialise` is called for that enemy. Enemy departs the pads during that window, implementing JOUSTRV4.SRC:2618-2624 (PTERWV) and JOUSTRV4.SRC:5615-5676 (NPSERV/LESERV) authentic ROM cadence.

7. **Core-boundary intact:** All code is pure (demo.ts, transporter.ts, related core modules). No clock, DOM, shell dependencies. Purity guard passes.

8. **Tests green, replay determinism preserved:** Pre-existing tests stay green. Seeded-replay fixtures verify enemy arrival timing is deterministic and matches the new schedule (not one-frame batch).

9. **Production callers wired:** ServiceQueue (`newServiceQueue`, `takeEnemyNumber`, `enemyTurn`, `serveEnemy`) and `spawnProceeds` transition from **zero production callers** to wave-entry usage. A grep for each name must show a caller under `plugins/joust/src/core/` that is not a test — the whole point of the story is that they are implemented and tested but dead (see [dead-feature signature: an unpopulated input field / an uncalled correct function]).

10. **No new runtime dependencies:** Build clean, no new npm modules, no changes to the sim contract or `stepGame` signature.

## ROM Citations (Authoritative References)

- **JOUSTRV4.SRC:2618-2624 (PTERWV):** Ptero arrival/stagger countdown template — the proven pattern to replicate.
- **JOUSTRV4.SRC:5615-5676 (NPSERV/LESERV):** ServiceQueue take-a-number serving law, including players-ahead-of-enemies at :5672-5675 and the counter increments at :5722/:5724.
- **JOUSTRV4.SRC:5641-5654 (spawnProceeds):** the empty-third rule — a spawn proceeds into a third only while that third is empty of occupants. Spatial, not temporal.

## Source Code Citations (In-Tree Implementation)

- **transporter.ts:149** — `spawnProceeds` function (deferral window)
- **transporter.ts:155-202** — ServiceQueue implementation (`newServiceQueue`, `takeEnemyNumber`, `enemyTurn`, `serveEnemy`, `nextServed`)
- **demo.ts:1209-1219** — `spawnWaveEnemies` loop (current one-frame batch)
- **demo.ts:1238-1242** — wave-1 construction (where to initialize ServiceQueue)
- **demo.ts:2261-2271** — wave advance `processes=[...processes,...arrivals]` mutation (feeds arrivals queue)
- **demo.ts:2303-2334** — `pendingPteros` countdown pattern (template to replicate)
- **demo.ts:406** — `MATERIALISE_WINDOW` constant (release-frame definition)
- **demo.ts:598-599** — `birth` frame assignment per enemy (where each enemy begins materialization window)
- **demo.ts:91-101** — Current imports (demo.ts pulls only `enterViaPads`, `beginMaterialise`, `stepMaterialise`, `PADS`)

## Sequencing Constraint

⚠️ **jt11-4 and jt11-5 both edit demo.ts in disjoint regions — do not run in parallel across checkouts.** jt11-5 (lava shore + burn-off) is still backlog, so no conflict now. Plan accordingly when jt11-5 enters dev.

## Out of Scope

- Animation phase sequencing within `beginMaterialise` (unchanged).
- Changes to `enemyProcess` factory or `materialise` effect.
- Changes to core sim contract or `stepGame(state, input, dt)` signature.

---
_Generated by sm-setup for story jt11-4 from the epic-jt11.yaml story definition. All ROM citations and in-tree line references are authoritative._
