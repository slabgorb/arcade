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
- `spawnWaveEnemies` loop (sim.ts:1209-1219)
- Wave-1 construction (sim.ts:1238-1242)
- Wave advance `processes=[...processes,...arrivals]` mutation (sim.ts:2261-2271)

However, the **authentic ROM machinery is already implemented, tested, and completely unwired** in the codebase:
- **ServiceQueue take-a-number serving law** (transporter.ts:155-202; ROM: NPSERV/LESERV JOUSTRV4.SRC:5615-5676). Four counters: `npserv`/`lpserv` (players), `neserv`/`leserv` (enemies). Read the real signatures out of transporter.ts before writing a test — they are all pure and take the queue as the first argument:
  - `newServiceQueue(): ServiceQueue` — all four counters 0, so nobody waits and nobody is served
  - `takeEnemyNumber(q) → { ticket, queue }` — draws `neserv` and increments it (ROM :5664-5666)
  - `enemyTurn(q, ticket) → boolean` — `ticket === q.leserv` **AND** `q.npserv === q.lpserv`, i.e. no player still holds an unserved number. **Players are served ahead of enemies** (ROM :5672-5675)
  - `serveEnemy(q) → ServiceQueue` — advances `leserv` after an enemy materialises (INC LESERV, :5724). Takes the queue only — there is no ticket parameter
  - `nextServed(q) → 'player' | 'enemy' | 'idle'` — who the service hands the next transporter to; **not** a queue position
  - The player-side twins `takePlayerNumber`/`playerTurn`/`servePlayer` exist alongside them and are equally unwired; this story wires the enemy path only.
- **Deferral via `spawnProceeds`** (transporter.ts:149; ROM: JOUSTRV4.SRC:5641-5654) — `spawnProceeds(occ: AreaOccupancy, tier: Tier): boolean` returns `occ[tier] === 0`. This is the **empty-third-of-the-SCREEN** rule: the arena splits into `top`/`middle`/`bottom` thirds by y (`selectArea`, occupancy tallied over occupant ys, transporter.ts:140-142), and a spawn PROCEEDS into a tier only while that third is **empty of occupants** — a crowded third DEFERS it. It is a **spatial** gate, not a time window, and it measures nothing in seconds or frames.
- **Proven template:** `pendingPteros` countdown queue (sim.ts:2303-2334; ROM: PTERWV JOUSTRV4.SRC:2618-2624)

Today **zero production callers** exist for the ServiceQueue (sim.ts imports only `enterViaPads`/`beginMaterialise`/`stepMaterialise`/`PADS` sim.ts:91-101). This story wires it into wave entry.

## Technical Approach

**Core principle:** Replace the batch insert with a per-enemy schedule keyed to ROM-authentic stagger, using the proven `pendingPteros` countdown pattern. Two distinct laws gate each arrival and both must hold before an enemy is released:

1. **When it is created** — `WCREATE` naps `PCNAP 61` before each `SECCR CREEM` (JOUSTRV4.SRC:2187-2207), so enemy *i* is created `61*(i+1)` frames into the wave. This is the stagger a player sees.
2. **Whose turn** — the take-a-number ticket queue (`enemyTurn`), which also enforces players-ahead-of-enemies.

⚠️ **`spawnProceeds` is NOT one of these gates — corrected jt11-4 (Dev).** The struck AC-3 below explains why: its ROM lines are the PLAYER create path, and the enemy path has no AREA test. An earlier draft additionally mis-described it as an "empty-third-of-a-second" deferral; it is `occ[tier] === 0`, a spatial rule — but the relevant point for this story is that the enemy arrival path never consults it at all.

### Wiring Details

1. **Initialize a ServiceQueue at wave-creation time** (sim.ts:1238-1242, wave-1 construction).
   - Before the current `spawnWaveEnemies` loop, call `newServiceQueue()` to allocate the serving law.
   - Assign each enemy a queue position via `takeEnemyNumber(queue)`.

2. **Defer each enemy's `beginMaterialise` insertion to its scheduled release frame.**
   - Instead of calling `beginMaterialise` immediately (one-frame batch), build a `pendingArrivals` queue (like `pendingPteros` sim.ts:2303-2334).
   - Each pending arrival carries its own countdown (the cadence, on the `pendingPteros` template) plus the enemy process and specs. The countdown is `WCREATE`'s `PCNAP 61` per bird (see AC-3b), not the `CRELP` retry.
   - Tick the countdown each frame; when it reaches zero the arrival becomes *eligible*, then release it only if `enemyTurn(q, ticket)` says it is that enemy's turn. Otherwise it stays pending and is retried on the next frame (`CRELP PCNAP 1`). On release, call `serveEnemy(q)` to advance `leserv` so the next ticket comes up. **No `spawnProceeds` test** — see the struck AC-3.

3. **Wave advance mutation unchanged.**
   - Continue the `processes=[...processes,...arrivals]` mutation (sim.ts:2261-2271).
   - `arrivals` now contains the deferred ServiceQueue, not a one-frame batch.

4. **Template reference:** Replicate the `pendingPteros` structure (sim.ts:2303-2334).
   - Pteros use a countdown-keyed schedule for arrival.
   - The same pattern applies to enemies with the ServiceQueue managing the stagger.

### Key Invariants

- **Insertion sites**: the `enemyProcess` factory and the `materialise` effect remain **unchanged**. ~~`spawnWaveEnemies` loop structure~~ — **struck (jt11-4, Dev)**: this contradicted AC-5, which is higher authority and says `spawnWaveEnemies` necessarily changes from *inserting* to *enqueueing*. What must not change is the enemy specs it builds, not the shape of the loop.
- **Only timing changes**: immediate batch (one frame) → deferred stagger (per-enemy release frame).
- **Core-only**: sim.ts, transporter.ts — no shell clock/DOM/render dependencies.
- **Purity guard**: All code is pure; core-boundary test scans for violations.

## Acceptance Criteria

1. **ServiceQueue wired into wave entry:** Wave-creation (sim.ts:1238-1242) initializes a `ServiceQueue` via `newServiceQueue()`. Each enemy is assigned a queue position via `takeEnemyNumber(queue)` before spawn.

2. **Per-enemy arrival schedule:** A `pendingArrivals` queue (mirroring `pendingPteros` sim.ts:2303-2334) holds each enemy's deferred insertion, keyed by countdown tick. Countdown decrements in `stepMaterialise` (or equivalent step function). Spawn occurs when countdown reaches zero for that enemy.

3. ~~**`spawnProceeds` empty-third deferral wired:**~~ **STRUCK (jt11-4, Dev — misattributed to the wrong ROM path).** This AC required the enemy arrival path to defer on `spawnProceeds(occ, tier)` citing JOUSTRV4.SRC:5641-5654. Those lines are inside **`CREPLY`, the PLAYER create path**, reached only via `CMPA #PLYID / BEQ CREPLY` (:5670-5671). The enemy path — `CREEM` (:5663-5666) then the `CRELP` loop (:5667-5677) — contains **no AREA test at all**: it naps `PCNAP 1`, waits behind any unserved player (:5672-5674), waits its own ticket (:5675-5676), then picks a transporter that is not in use (VRAND + the STTR1..STTR4 fall-through, :5678-5709). Implementing this AC as written would have pinned a law the machine does not have, and a green suite would then certify wrong behaviour permanently. **Do not wire `spawnProceeds` into enemy arrivals.** The genuine enemy-side deferral is pad occupancy (`GOTTR INC [TCURUSE,X]` :5710, `BNE CRELP` :5709), which this port does not model — filed as a follow-up, not absorbed here. Superseded by AC-3a, which is the real enemy-side gate.

3b. **Arrival cadence — WCREATE's `PCNAP 61`:** the visible stagger is not the CRELP retry. `WCREATE` naps **before** each create — `10$ PCNAP 61 / SECCR CREEM,EMYID / … / 20$ DEC PDELAY,U / BNE 10$` (JOUSTRV4.SRC:2187-2207), decimal frames, exactly as `PTERWV`'s `PCNAP 65` is — so enemy *i* is created `61*(i+1)` frames into the wave. `CRELP`'s `PCNAP 1` (:5667) is only the per-frame retry interval for a bird already created. Serving on the ticket queue alone puts the complement ~1 frame apart (~50 ms): serialized, but invisible on screen and therefore not a fix for the reported defect.

3a. **Ticket order and player priority:** Enemies are released in ticket order (`enemyTurn` requires `ticket === leserv`), one served at a time, and no enemy is served while a player holds an unserved number (`npserv !== lpserv`) — JOUSTRV4.SRC:5672-5675. `serveEnemy(q)` advances the counter on each release.

4. **Ptero-stagger template reused:** The `pendingArrivals` mechanism mirrors `pendingPteros` countdown structure (sim.ts:2303-2334, PTERWV JOUSTRV4.SRC:2618-2624). TEA/Dev to apply this proven pattern.

5. **Enemy factory and materialise effect unchanged:** the `enemyProcess` factory and the materialise effect are untouched — **only insertion timing moves** (batch → deferred stagger), which is the story's own wording. `spawnWaveEnemies` necessarily changes from *inserting* to *enqueueing*; what must not change is what it builds.

6. **Each enemy's beginMaterialise window is its own release frame:** The `MATERIALISE_WINDOW` (sim.ts:406; birth sim.ts:598-599) defines the window during which `beginMaterialise` is called for that enemy. Enemy departs the pads during that window, implementing JOUSTRV4.SRC:2618-2624 (PTERWV) and JOUSTRV4.SRC:5615-5676 (NPSERV/LESERV) authentic ROM cadence.

7. **Core-boundary intact:** All code is pure (sim.ts, transporter.ts, related core modules). No clock, DOM, shell dependencies. Purity guard passes.

8. **Tests green, replay determinism preserved:** Pre-existing tests stay green. Seeded-replay fixtures verify enemy arrival timing is deterministic and matches the new schedule (not one-frame batch).

9. **Production callers wired:** ServiceQueue (`newServiceQueue`, `takeEnemyNumber`, `enemyTurn`, `serveEnemy`) transitions from **zero production callers** to wave-entry usage. A grep for each name must show a caller under `plugins/joust/src/core/` that is not a test — the whole point of the story is that they are implemented and tested but dead (see [dead-feature signature: an unpopulated input field / an uncalled correct function]). **`spawnProceeds` is excluded** (amended jt11-4, Dev): it belongs to the player create path (see struck AC-3), so wiring it here would be wrong. It — with `takePlayerNumber`, `playerTurn`, `servePlayer`, `nextServed` — remains dead for the **player** half of the serving law, which is a real dead-code condition this epic should still close, in a story scoped to the player path.

10. **No new runtime dependencies:** Build clean, no new npm modules, no changes to the sim contract or `stepGame` signature.

## ROM Citations (Authoritative References)

- **JOUSTRV4.SRC:2618-2624 (PTERWV):** Ptero arrival/stagger countdown template — the proven pattern to replicate.
- **JOUSTRV4.SRC:5615-5676 (NPSERV/LESERV):** ServiceQueue take-a-number serving law, including players-ahead-of-enemies at :5672-5675 and the counter increments at :5722/:5724.
- **JOUSTRV4.SRC:5641-5654 (spawnProceeds):** the empty-third rule — a spawn proceeds into a third only while that third is empty of occupants. Spatial, not temporal.

## Source Code Citations (In-Tree Implementation)

- **transporter.ts:149** — `spawnProceeds` function (deferral window)
- **transporter.ts:155-202** — ServiceQueue implementation (`newServiceQueue`, `takeEnemyNumber`, `enemyTurn`, `serveEnemy`, `nextServed`)
- **sim.ts:1209-1219** — `spawnWaveEnemies` loop (current one-frame batch)
- **sim.ts:1238-1242** — wave-1 construction (where to initialize ServiceQueue)
- **sim.ts:2261-2271** — wave advance `processes=[...processes,...arrivals]` mutation (feeds arrivals queue)
- **sim.ts:2303-2334** — `pendingPteros` countdown pattern (template to replicate)
- **sim.ts:406** — `MATERIALISE_WINDOW` constant (release-frame definition)
- **sim.ts:598-599** — `birth` frame assignment per enemy (where each enemy begins materialization window)
- **sim.ts:91-101** — Current imports (sim.ts pulls only `enterViaPads`, `beginMaterialise`, `stepMaterialise`, `PADS`)

## Sequencing Constraint

⚠️ **jt11-4 and jt11-5 both edit sim.ts in disjoint regions — do not run in parallel across checkouts.** jt11-5 (lava shore + burn-off) is still backlog, so no conflict now. Plan accordingly when jt11-5 enters dev.

## Out of Scope

- Animation phase sequencing within `beginMaterialise` (unchanged).
- Changes to `enemyProcess` factory or `materialise` effect.
- Changes to core sim contract or `stepGame(state, input, dt)` signature.

---
_Generated by sm-setup for story jt11-4 from the epic-jt11.yaml story definition. All ROM citations and in-tree line references are authoritative._
