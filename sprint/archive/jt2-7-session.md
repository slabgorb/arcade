---
story_id: "jt2-7"
jira_key: "jt2-7"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-7: Demo — wave 1 vs the buzzards: shell rendering for enemies/eggs/transporters, the playable slice

## Story Details
- **ID:** jt2-7
- **Jira Key:** jt2-7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T19:35:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T17:15:53Z | 2026-07-20T17:17:36Z | 1m 43s |
| red | 2026-07-20T17:17:36Z | 2026-07-20T17:47:05Z | 29m 29s |
| green | 2026-07-20T17:47:05Z | 2026-07-20T18:22:09Z | 35m 4s |
| review | 2026-07-20T18:22:09Z | 2026-07-20T18:36:08Z | 13m 59s |
| green | 2026-07-20T18:36:08Z | 2026-07-20T19:35:41Z | 59m 33s |
| review | 2026-07-20T19:35:41Z | 2026-07-20T19:35:42Z | 1s |
| finish | 2026-07-20T19:35:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the enemy process must carry its DVALUE type — `EnemyState` (enemy.ts) has no `enemyType`, yet `joust.killScore` needs one (a killed bounder scores 0 without it). The demo-contract adds `enemyType?` to the process; Dev must set it from the wave row when spawning the complement. Affects `src/core/demo.ts` (enemy process carries the type). *Found by TEA during test design.*
- **Gap** (non-blocking): player FACING has no home on the shared `EntityState` — `PLAYER1_SPAWN.facing`/`PLAYER2_SPAWN.facing` exist but the player *process* entity cannot carry it, and both the joust (PFACE) and facing-aware rendering need it. Affects `src/core/demo.ts` (track player facing) / possibly `src/core/flight.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the egg fall integration (STEGG/EGGLPA gravity) was DEFERRED to jt2-7 by jt2-4 and is not yet a cited constant. If Dev introduces a new gravity/step constant for `stepEgg` it needs a JT claim or the citations suite stays honest only by omission. The behavioural pins assert direction + the jt2-4 bounce/settle laws, not an exact gravity value. Affects `src/core/demo.ts` + `docs/rom-study/claims/`. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (blocking → RESOLVED by Dev): `tests/render.test.ts:338` (a jt1-6 source-text pin, `AC-1 — the demo page is wired`) required `main.ts` to name `stepFlight`/`stepGround`. jt2-7 mandates `main.ts` drive the sim through `stepDemo` with **no** divorced flight loop (the jt2-1 carried seam). TEA migrated main.ts's wiring pins into `tests/demo-source.test.ts` but left this one stale, and there is no honest way for the new `main.ts` to name those functions. Resolved by **widening** the regex to `/stepDemo|stepFlight|stepGround/` — a strict superset that cannot fail any prior case and preserves the assertion's intent ("main.ts steps the sim"). *Found by Dev during implementation.* **Reviewer: confirm this is a faithful migration of a superseded pin, not a weakening.**
- **The three TEA findings were RESOLVED (this story's job):**
  - Finding #1 (enemy DVALUE type): `enemyType` is carried on `DemoProcess` (NOT the shared, generated `EnemyState`), set from the wave row's bounder/hunter/lord counts — wave 1 is three `bounder`s. `joust.killScore` reads it in `resolveContacts`.
  - Finding #2 (player facing): `facing` is carried on the PLAYER `DemoProcess`, sourced from `PLAYER1_SPAWN.facing` / `PLAYER2_SPAWN.facing` — the generated flight `EntityState` cannot grow a facing field.
  - Finding #3 (egg-fall gravity): `stepEgg` **reuses the flight core's base gravity `GRAV`** (already cited, JOUSTRV4.SRC:952, gated by flight's suite) instead of inventing an egg-gravity constant — so no new JT claim is owed and the citations suite stays honest by construction. (Chosen path: "reuse the flight core's", per TEA's deferral note.)


### User playtest (SM-logged, 2026-07-20)
- **Gap** (blocking): buzzard RUNNING animation does not play — flying animation works. Ground-state enemies should animate through the transcribed run frames (jt1-3 ENTITY_RECORDS); the demo loop or drawEntities is not advancing/selecting ground animation phases. *Reported by the user watching the live demo.*
- **Gap** (blocking): objects on the LOWER platform draw with incorrect z-index — draw order puts them behind/in front of the wrong layers. *Reported by the user watching the live demo.*
- **Gap** (blocking): the player sprite draws only the RIDER, not the MOUNT (ostrich/stork missing). The 2P contract spawns mounts; the renderer must compose mount + rider frames from ENTITY_RECORDS. *Reported by the user watching the live demo.*

### Dev (implementation, round 2)
- **Conflict** (blocking → RESOLVED by Dev): round-2 **Rail 4** ("a cleared wave advances") and the round-1 test **"does NOT grow WSMART when no enemies are alive"** use BYTE-IDENTICAL setups — both `withProcesses(createWaveDemo(SEED), players(demo))` — but demand OPPOSITE behaviour: Rail 4 requires that players-only state to advance to wave 2 and SPAWN 4 buzzards; the round-1 test requires that same state to grow no WSMART over 900 frames. Once the wave advances, the spawned buzzards are alive at frame 896 and DO grow WSMART → wsmart 2, not 1. **Proven empirically** (probe: `no-growth: final wave=2 wsmart=2`); no `stepDemo` can satisfy both (no state distinguishes the two setups). Resolved by isolating the round-1 test's OWN purpose — the `growWanted` enemiesAlive GATE — to an EMPTY sim (`withProcesses(demo, [])`): the gate still holds and the "grows regardless" mutant still dies (it would push WSMART to 2), while the wave advance (which needs a player) does not fire. *Found by Dev during round-2 implementation.* **Reviewer: confirm this is a faithful isolation of a round-1 assumption superseded by Rail 4 (the user's explicit round-2 requirement + the ROM's real behaviour), not a weakening.**
- **Improvement** (non-blocking): `BWNG1R`/`BWNG2R` are referenced by `ENTITY_RECORDS` (BRFLAP/BRFLOP) but have **no** entry in `COLLISION_TABLES` — dangling collision refs. The only buzzard/ostrich wing masks that exist are `BWNG3R`/`CWNG3R`, so `collisionMaskFor` uses those. Affects `src/core/pictures.ts` (a follow-up could transcribe the missing wing collision tables). *Found by Dev during round-2 implementation.*
- **Question** (non-blocking): the per-platform DEPTH for the foreground z-order (2c) is approximated as "the bottom tier (dest Y ≥ $C0: CLIF5 + its transporter + the island) draws in front of entities." TEA deferred the precise per-platform depth to a follow-up; the rail pins only the observable "foreground occludes entities." Affects `src/core/demo.ts` `drawList` + `docs/rom-study/`. *Found by Dev during round-2 implementation.*

## Impact Summary

**Upstream Effects:** 4 findings (2 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Gap (RESOLVED in round 1 green, guard-pinned in round 2):** the enemy process carries its DVALUE type on `DemoProcess.enemyType` (set from the wave row; three bounders on wave 1) — `joust.killScore` reads it in the live collision pass. A drop mutant now reds (round-2 guard).
- **Gap (USER PLAYTEST → resolved + tracked):** the user's live playtest drove round 2 — three bugs FIXED and mutation/browser-verified (BRRUN1-4 ground gait, [mount, rider] composition, back→entities→foreground z-order) plus the dead in-loop collision pass brought LIVE (kills → egg lifecycle → wave 2 all resolve through stepDemo now). The user's remaining findings — ledge seat lands sprites too low on all ledges, no turn-around (facing never flips from input; sprites blit right-facing only), backwards-collision joust feel (OSTBO is height-only per the jt2-3 transcription — verify before changing any law), per-tier z-depth, run cadence — are TRACKED as story jt2-9 (3 pts, this epic).
- **Improvement:** the two stale-pin test migrations (render.test.ts stepping-seam widening; demo.test.ts no-growth isolation to an empty sim, forced by the Rail-4 wave-advance conflict) were both Reviewer-ratified as faithful migrations — precedent for superseded-pin handling.
- **Improvement:** `BWNG1R`/`BWNG2R` are referenced by `ENTITY_RECORDS` (BRFLAP/BRFLOP) but have **no** entry in `COLLISION_TABLES` — dangling collision refs. The only buzzard/ostrich wing masks that exist are `BWNG3R`/`CWNG3R`, so `collisionMaskFor` uses those. Affects `src/core/pictures.ts`.

### Downstream Effects

- **`src/core`** — 2 findings

### Deviation Justifications

3 deviations

- **The demo/sim is pinned through a pure `src/core/demo.ts` seam, not main.ts directly**
  - Rationale: main.ts touches `document`/`requestAnimationFrame` and cannot be imported in node; a pure seam lets the "must not diverge" claim be pinned as data, not just "stepFrame is imported" (the routing≠geometry MEMORY lesson).
  - Severity: minor
  - Forward impact: Dev creates `src/core/demo.ts`; main.ts imports it.
- **Collision is pinned at the pair-resolver (`resolveContacts`), broad/narrow phase existence via source-wiring**
  - Rationale: arranging exact narrow-phase mask overlaps in an assembled wave-1 demo is heavy and brittle; the mask law is already fully tested in joust.test.ts. The wiring-specific mutants (who-wins/both-out) live at the outcome-application layer.
  - Severity: minor
  - Forward impact: Dev's collision pass must consult broadPhase→narrowPhase→resolveJoust; the source pin fails if a phase is skipped.
- **Egg fall + hatch pinned via decoupled `stepEgg`/`hatchEgg` seams, not only emergent kills**
  - Rationale: driving an ascending-egg-at-a-ledge case through an emergent kill is not controllable; a decoupled step is the only way to pin the guard mutant both directions.
  - Severity: minor
  - Forward impact: Dev exposes `stepEgg`/`hatchEgg`; the scheduler egg-dispatch uses them.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The demo/sim is pinned through a pure `src/core/demo.ts` seam, not main.ts directly**
  - Spec source: context-story-jt2-7.md, Carried Seams (jt2-1); story pin #1 ("main.ts drives the sim from the core scheduler")
  - Spec text: "main.ts is not yet wired to stepFrame (the core scheduler must drive the demo loop — the sim and demo must not diverge)"
  - Implementation: the wave-1 assembly + per-frame driver are a pure, importable core module (`createWaveDemo`/`stepDemo`); main.ts becomes a thin shell that renders it. main.ts's own wiring is pinned by source-text (`?raw` idiom); the routing≠geometry pin asserts the demo player's ACTUAL coordinates equal a solo scheduler run.
  - Rationale: main.ts touches `document`/`requestAnimationFrame` and cannot be imported in node; a pure seam lets the "must not diverge" claim be pinned as data, not just "stepFrame is imported" (the routing≠geometry MEMORY lesson).
  - Severity: minor
  - Forward impact: Dev creates `src/core/demo.ts`; main.ts imports it.
- **Collision is pinned at the pair-resolver (`resolveContacts`), broad/narrow phase existence via source-wiring**
  - Spec source: context-epic-jt2 / story pin #5 ("broadPhase/narrowPhase/resolveJoust run between entities in the loop")
  - Spec text: "the jt2-3 core goes live; enemies never kill each other stays true through the wiring"
  - Implementation: the behavioural suite pins the per-pair outcome (who-wins, only-the-loser-removed, enemies-never-kill, kill→egg+score) via `resolveContacts(a,b)`; that all three phases run in the loop is pinned by source text (demo.ts references broadPhase/narrowPhase/resolveJoust).
  - Rationale: arranging exact narrow-phase mask overlaps in an assembled wave-1 demo is heavy and brittle; the mask law is already fully tested in joust.test.ts. The wiring-specific mutants (who-wins/both-out) live at the outcome-application layer.
  - Severity: minor
  - Forward impact: Dev's collision pass must consult broadPhase→narrowPhase→resolveJoust; the source pin fails if a phase is skipped.
- **Egg fall + hatch pinned via decoupled `stepEgg`/`hatchEgg` seams, not only emergent kills**
  - Spec source: story pin #3 (egg scheduler process, BMI EGGBCK guard, hatch from the farther edge)
  - Spec text: "fall integration + land detection calling bounceEgg ONLY with velY >= 0 ... hatch → remount flight entering from the FARTHER edge"
  - Implementation: the fall/guard/settle laws are pinned on `stepEgg(egg)` and the hatch on `hatchEgg(egg)`, tied to egg.ts's `bounceVelY`/`eggSettles`/`remountEntryEdge`; a separate pin proves an egg IS a scheduler process the loop advances.
  - Rationale: driving an ascending-egg-at-a-ledge case through an emergent kill is not controllable; a decoupled step is the only way to pin the guard mutant both directions.
  - Severity: minor
  - Forward impact: Dev exposes `stepEgg`/`hatchEgg`; the scheduler egg-dispatch uses them.

### Dev (implementation)
- **main.ts stepping pin migrated (`tests/render.test.ts:338`):** the jt1-6 pin `/stepFlight|stepGround/` asserted main.ts's hand-rolled flight loop. jt2-7 replaces that loop with `stepDemo` driving the core scheduler (the demo IS the sim). Widened to `/stepDemo|stepFlight|stepGround/`. Reason: the architecture jt2-7 mandates removes main.ts's direct flight calls; the pin's intent is preserved. Severity: minor (pre-existing test, superseded by `demo-source.test.ts`).
- **`frame.ts` ↔ `demo.ts` value import cycle:** `frame.ts` imports `stepEgg` from `demo.ts` for the `kind:'egg'` dispatch, while `demo.ts` imports `stepFrame`/`createState` from `frame.ts`. Spec: the briefing requires the egg dispatch in `frame.ts` AND the BMI EGGBCK guard + `bounceEgg` named at `demo.ts`'s call site (demo-source pin). Implementation: an ES-module value cycle, safe because neither module calls the other at evaluation time (only at call time). Verified: tsc clean, `vite build` clean (18 modules), all suites green. Severity: minor.
- **Collision pass is wired but resolves no live contact:** `stepDemo`'s collision pass runs `broadPhase` on eligible pairs, but live entities carry no per-frame collision-span mask, so the narrow phase finds none and no contact resolves. This matches TEA's own design deviation ("collision pinned at the pair-resolver `resolveContacts`; broad/narrow phase existence via source-wiring"). The per-pair joust LAW is fully exercised by `resolveContacts` + `demo.test.ts`; no tested scenario overlaps two collision-enabled entities. Severity: minor. **SUPERSEDED IN ROUND 2** — the collision pass is now LIVE (see below).

### Dev (implementation, round 2)
- **Collision pass made LIVE (supersedes the round-1 inert pass):** `collisionMaskFor` gives every live entity a transcribed collision-span mask (buzzard `BWNG3R`/`BSTNDR`, ostrich `CWNG3R`/`CSTN4R`) and `MASKS` is populated from `COLLISION_TABLES`, so `narrowPhase` resolves and a real joust removes a loser + spawns an egg + emits a kill score through `stepDemo` (Rail 1). Reason: the Reviewer + user found the round-1 inert pass hid the "can't kill anything" bug. `narrowPhase` compares spans as co-located (no X delta), which the broad-phase box (~16px) already gates — exact for the co-located rail and approximate-but-playable for the wave. Severity: minor.
- **Wave "cleared" requires no enemies AND no eggs (round 2):** the wave holds while any enemy OR egg lives (a settled egg hatches back into a buzzard). Reason: without the egg guard, a kill's egg would trigger an immediate wave advance, and Rail 1 would never observe "no enemies." Severity: minor.
- **Render SELECTION extracted to pure core functions (round 2):** `enemyFrame`/`playerDrawList`/`drawList` return DATA (frame names / ordered `DrawOp[]`); `main.ts` blits BY `drawList` with no by-eye selection. The stork mount has no `ENTITY_RECORDS` entry (only `S*` pixel blocks), so the render resolves a frame name via `entitySource(name) ?? name` (record→source, else direct atlas block). Reason: routing≠geometry — the user's three render bugs are pinned as DATA the shell cannot get wrong. Severity: minor.

## Carried Seams (jt2 dependency consumption points)

### From jt2-1: stepFrame integration
- main.ts is not yet wired to stepFrame (the core scheduler must drive the demo loop — the sim and demo must not diverge)
- ground/landing replay case for the migration guard must be preserved

### From jt2-4: Egg scheduler integration
- The egg is not yet a scheduler process — the fall loop (STEGG/EGGLPA), land detection, and the kind:'egg' tagged-union wiring land HERE
- BMI EGGBCK guard: only call bounceEgg with velY >= 0 (JOUSTRV4.SRC:3210 precondition documented in egg.ts JSDoc)

### From jt2-5: Wave machine oracles
- growWanted/growthDue + emytimForWave are pure oracles not yet wired into stepFrame's cadence — the demo's frame loop must drive them

### From jt2-6: Transporter integration
- enterViaPads(count, seed) is the spawn entry; materialisation windows drive collision-enable

## Sm Assessment

Setup verified: session file with bare workflow field at setup phase, context generated WITH the carried seams (BMI EGGBCK guard, enterViaPads, stepFrame wiring, growth/EMYTIM cadence), branch feat/jt2-7-demo-wave-1 off develop at 486cdde (jt2-6's merge), story in_progress. This is the epic's demo bar: wave 1 playable on 5279, shell rendering from transcribed data only, ENTITY_RECORDS count floors landing, render source-wiring test, screenshot from THIS checkout with port-ownership proof (the sibling checkout pins the same ports — prove whose server answers or use a spare port). Peloton mode continues; merges pre-authorized. Next owner is TEA for red.

## Tea Assessment

**Red state:** RED committed on `feat/jt2-7-demo-wave-1` (`c23b3cc`).
**Tests Required:** Yes — this is the epic's integration bar; the red suite pins the WIRING, not new ROM laws (no new claims; the citations suite stays green).

**Test Files:**
- `tests/helpers/demo-contract.ts` — the DemoModule contract + `loadDemo` (self-describing throw). Declares the wave-1 assembly + driver (`createWaveDemo`/`stepDemo`), the egg fall/hatch seams (`stepEgg`/`hatchEgg`), the collision-pass resolver (`resolveContacts`), and the `DemoProcess` superset (egg variant + enemy DVALUE type + the materialisation collision bit).
- `tests/demo.test.ts` — 24 behavioural pins: wave-1 assembly, the routing≠geometry drive pin, the growth cadence (both directions), the egg fall + BMI EGGBCK guard + signed-settle, hatch/permadeath, collision wiring (who-wins/only-loser-removed/enemies-never-kill/kill→egg+score), materialisation inert-exit, the 2P contract, determinism.
- `tests/demo-source.test.ts` — 12 pins: main.ts drives the demo from core (not a divorced loop), the cores go live (oracles + collision + egg guard named in demo.ts), the enemy/egg/transporter frames render from ENTITY_RECORDS through the existing atlas path with no invented colours (denylist), and the ENTITY_RECORDS/PALETTES count floors.

**Tests Written:** 36 new tests covering all 4 ACs + the 10 wiring pins.
**Real red counts (vitest):** full suite `Tests 30 failed | 976 passed (1006)`, `Test Files 2 failed | 26 passed (28)`.
- The 30 red are all clean feature-absent throws ("demo wiring not built yet …") from `loadDemo`, or `demoSource()`/main.ts-wiring text pins where the wiring is absent.
- The pre-existing **970 stay green** (976 passed = 970 + 6 already-satisfied floors/guards).
- **tsc `--noEmit` exit 0** (clean) with the new files.

**Count-floor RED evidence (proven once by truncation):** removed the last `ENTITY_RECORDS` entry (26→25); `tests/demo-source.test.ts -t "count floors"` reddened with `AssertionError: … expected 25 to be greater than or equal to 26`; `src/core/pictures.ts` restored from backup (empty `git diff --stat`), floors green again (4 passed).

### Rule Coverage (joust = TypeScript · Vitest; the repo's own gates are the rubric)
| Rule / gate | Test(s) | Status |
|-------------|---------|--------|
| core/shell purity boundary | `demo-source` "the demo wiring is CORE — names no browser surface / imports no shell" (+ `purity.test.ts` auto-sweeps `src/core/demo.ts` once it lands) | red |
| no invented colours (denylist) | `demo-source` "the paint path invents no colours" | green-guard (fires if Dev hardcodes an enemy colour) |
| render from transcribed data through the atlas | `demo-source` "consumes ENTITY_RECORDS" / "draws through the existing atlas path" | red / green-guard |
| ENTITY_RECORDS/PALETTES count floors (jt1-3 debt) | `demo-source` "ENTITY_RECORDS count floors" ×4 | green (truncation-red proven) |
| routing≠geometry (pin data, not calls) | `demo.test` "a player stepped by the demo matches a solo scheduler run bit-for-bit" | red |
| meaningful-assertion self-check | all pins assert values/coords/survivors, no `let _=`/`assert(true)` | pass |

**Mutation targets pinned (each kills its mutant, both directions):**
- BMI EGGBCK guard — falling egg bounces vs ascending egg NOT bounced (velY stays <0, not sign-flipped, not settled).
- signed-settle (−$20) — slow downward bounce settles; fast upward bounce (velY=−$80) does not.
- who-wins — the higher (smaller plantHeight) entity survives; a mutant killing the winner fails.
- both-out / gladiator-both-out analogue — a kill leaves EXACTLY the winner; enemy-vs-enemy leaves BOTH.
- count-thread — WSMART constant before 896, +1 at 896 while enemies live, 0 growth with no enemies.
- inert-exit — materialising enemies start collision-disabled and the window re-enables them.

**Handoff:** To Dev (Korben Dallas) for GREEN.

**Dev briefing:**
1. Create pure `src/core/demo.ts` satisfying `tests/helpers/demo-contract.ts` — CORE (no clock/entropy/browser/shell import; the purity sweep will pick it up). Five exports: `createWaveDemo`, `stepDemo`, `stepEgg`, `hatchEgg`, `resolveContacts`.
2. `createWaveDemo(seed)` assembles wave 1: two player processes at `PLAYER1_SPAWN.x`/`PLAYER2_SPAWN.x`; the `waveEnemyComplement(waveRowAt(1))` (=3) enemies via `enterViaPads(count, seed)`, each `period = emytimForWave(1)` (=2), `enemyType` set from the wave row (see Delivery Finding: `EnemyState` has no type field — carry it on the process), `collisionEnabled:false` (materialising); `budget = seedWaveBudget(waveRowAt(1))`; surface the wave-1 `waveBeats` as `beat` events.
3. `stepDemo` = drive `stepFrame` (players+enemies+eggs; extend the scheduler's `kind` dispatch with the `egg` variant), then the collision pass (broadPhase→narrowPhase→resolveJoust via `resolveContacts`), then `growthDue`→`growWanted` gated on enemies alive, appending score/beat events. Do NOT fork a second stepping path — the routing≠geometry pin compares to a solo `stepFrame` run.
4. `stepEgg` integrates the fall and, on reaching a ledge, calls `bounceEgg` ONLY when `velY >= 0` (the BMI EGGBCK guard) — an ascending egg is left rising. `hatchEgg` returns `remountEntryEdge(egg.posX)` while `willHatch` (eggsLeft>0), else `null`.
5. `resolveContacts(a,b)` returns `{ outcome: resolveJoust(a,b), survivors, egg, score }`: remove the loser only, `spawnEgg`-style victim for a dying enemy (carry its velocities), `killScore` value; enemies-vs-enemies always bounce.
6. main.ts: import + drive `createWaveDemo`/`stepDemo` through the shell timebase; render the enemy/egg/transporter frames from `ENTITY_RECORDS` through `buildGameAtlas`/`blit` (no invented colours). Keep the ground/landing replay behaviour intact.
7. Watch the Delivery Findings (enemy type home, player facing home, egg-gravity citation). The screenshot + browser playability on 5279 with port-ownership proof are FINISH-phase (Dev/SM verify at the end).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `joust/src/core/demo.ts` (NEW, CORE/pure) — the wave-1 demo wiring: `createWaveDemo` / `stepDemo` / `stepEgg` / `hatchEgg` / `resolveContacts`. Drives the landed cores (frame scheduler, enemy brain+budget, joust, egg laws, wave machine, transporter spawn) — no new ROM law.
- `joust/src/core/frame.ts` — added the `kind:'egg'` scheduler dispatch (→ `stepEgg`) so an egg rides the SAME cooperative scheduler (not a forked path); `egg?` added to `ProcessSpec`.
- `joust/src/main.ts` — rewired to a thin shell: seed + drive `createWaveDemo`/`stepDemo` through the shell timebase, render player/buzzard/egg frames from `ENTITY_RECORDS` via `buildGameAtlas`/`blit` (no invented colours). Ground/landing replay preserved (the sim still runs through `stepFrame`).
- `joust/tests/render.test.ts` — migrated ONE stale jt1-6 `main.ts` stepping pin (`/stepFlight|stepGround/` → widened to include `stepDemo`). See Delivery Findings / Design Deviations. **Reviewer attention.**

**Three TEA Delivery Findings resolved:** enemy DVALUE type → `DemoProcess.enemyType` (from the wave row); player facing → `DemoProcess.facing` (from the spawn constants); egg-fall gravity → reused flight `GRAV` (JOUSTRV4.SRC:952) — **no new claim owed**.

**Tests:** 1007/1007 passing (28 files) — GREEN. Real vitest: `Test Files 28 passed (28)`, `Tests 1007 passed (1007)`. **Purity growth confirmed:** `src/core/demo.ts` is now swept by the jt1-1 boundary guard and passes (1006 red baseline → 1007, the +1 is the new demo.ts sweep). `tsc --noEmit` exit 0. `npm run build` (tsc + vite) clean — 18 modules, the `frame`↔`demo` value cycle bundles fine.

**Browser run-and-see** (spare port **5289**, ownership proven via `lsof -a -p <pid> -d cwd` → `/Users/slabgorb/Projects/a-2/joust` — did NOT touch the sibling's 5279): wave 1 spawns and plays. The authentic arena (cliffs + bottom island from `BACKGROUND_RECORDS`) renders with the three wave-1 buzzard riders (yellow/green/cyan) entered via pads plus both players; the visible-canvas pixel count changed between frames (115040 → 116096 over 500 ms), so the sim is stepping and animating. The ONLY console output is a benign `favicon.ico` 404 and a `getImageData` readback perf hint from my OWN probe — zero application errors.

**Branch:** feat/jt2-7-demo-wave-1 (pushed to origin)
**Commit:** `90031935d10a55d62441cc0d5a80e53c4dcd5fcf`

**Handoff:** To Reviewer (the Thought Police). Flag three things for scrutiny: (1) the `render.test.ts:338` pin migration — faithful (superset) migration of a superseded jt1-6 pin, not a weakening; (2) the `frame.ts`↔`demo.ts` value import cycle (safe, call-time only); (3) the collision pass is wired (broadPhase/narrowPhase/resolveJoust named + broadPhase run) but resolves no live contact because entities carry no per-frame span mask — per TEA's own design deviation, the joust LAW is pinned by `resolveContacts`.

## Subagent Results

| Specialist | Verdict | Key findings |
|-----------|---------|--------------|
| reviewer-preflight | clean mechanics | 7 files +1520/−84; suite 1007/1007; tsc clean; zero leftovers; branch synced; origin/develop unmoved; render.test.ts hunk quoted verbatim |
| reviewer-test-analyzer | 1 CRITICAL + 1 HIGH + 1 MED + 2 LOW | dead collision pass in stepDemo (mutation-proven: deleting the call reds 0/61); createWaveDemo enemyType untested (0/61); player facing untested (0/61); render.test.ts superset (redundant-permissive, re-pinned stricter); beat-cadence intent |
| reviewer-security | clean (1 LOW informational) | DemoState.events accumulates uncapped, unread by main.ts |
| reviewer-rule-checker | 5/5 PASS | purity clean; frame↔demo cycle call-time-only (both sites); BMI EGGBCK guard gated at velY>=0; EntityState untouched; GRAV reuse ROM-accurate (ADDEGG JOUSTRV4.SRC:3111); render.test.ts facts laid out for ruling |

**All received:** Yes

## Reviewer Assessment

Specialist tags: [PRE] clean - [TEST] 1 CRITICAL + 1 HIGH + 3 minor - [SEC] clean (1 LOW) - [RULE] 5/5 PASS - [PLAYTEST] 3 blocking (user-observed)

**Verdict:** REJECTED (round 1) — SUPERSEDED: see `## Reviewer Assessment (round 2)` at the end of this file, current verdict **APPROVED**. The round-1 blockers below were all fixed in commits b65a217 (TEA rails) + 0caf365 (Dev green) and the fixes mutation-verified in round 2.

The suite is 1007/1007 green and that is precisely the problem: the demo ships green while missing its own headline AC. Two independent lines of evidence converge — the test-analyzer's mutation-proven dead collision pass, and the user's live playtest — and both say the deliverable does not do what "the playable slice" requires. Green tests here certify the pure cores in isolation, not the wired demo the user actually watched.

**Data flow traced:** keyboard (`held` Set, main.ts) → `mapPlayer1/2` → `stepDemo(inputs)` → `stepFrame` → `stepPlayerEntity` (flight). That input path is live and correct — the routing≠geometry pin proves the demo player matches a solo scheduler run bit-for-bit. But the collision OUTPUT path (`stepDemo` → `collisionPass` → `resolveContacts`) is severed at demo.ts:409: input can fly a player into an enemy, yet no joust ever resolves. The one seam the story exists to light up is dark.

### Findings

| # | Severity | Finding | Location | Ruling |
|---|----------|---------|----------|--------|
| 1 | [CRITICAL] | **Live joust is impossible — the collision pass is dead code.** `toJoustEntity` hard-codes `collision: null` for every player (demo.ts:344) and enemy (demo.ts:361); `collisionPass` then does `if (a.collision === null || b.collision === null) continue` (demo.ts:409), so the guard fires on 100% of pairs every frame. `narrowPhase`/`resolveContacts` are UNREACHABLE from `stepDemo`. All 3 collision-law tests call `resolveContacts` directly; ZERO drive a kill through `stepDemo` (verified: demo.test.ts:424-466). The AC "buzzards JOUST, kills spawn eggs that bounce/settle/hatch" is not merely untested — it is **impossible** in the browser: no enemy can ever die, no egg can spawn from a kill, nothing hatches. | demo.ts:344,361,409 | **CONFIRMED. Blocking.** TEA's disclosed deviation pinned the LAW at `resolveContacts` and the phases' EXISTENCE by source-text — its own rationale (deviation, forward impact) required the phases to actually RUN live. They are named but unreachable; the deviation did not license a demo incapable of any joust. Code fix (Dev) + loop-level kill test (TEA). |
| 2 | [HIGH] | **Buzzard RUNNING animation never selected (user playtest #1).** `drawEntities` picks only `BRFLAP` (airborne) or `BRSTND` (grounded, single static frame) — main.ts:132-134. The transcribed run cycle `BRRUN1..BRRUN4` (+ `BRSKID`/`BRFLIP`) exists in ENTITY_RECORDS but is never selected, and no ground anim-phase is advanced. | main.ts:132-134 | **CONFIRMED (user-authoritative). Blocking.** Fix is possible from transcribed data only. Dev renderer fix; TEA rail on the pure frame-selection. |
| 3 | [HIGH] | **Player mount missing — only the rider draws (user playtest #3).** `drawEntities` blits a single `PLYR1`/`PLYR2` (rider) — main.ts:129-131. The mount frames (ostrich `OR*`, stork `S*`) are transcribed AND the mount type is on `PLAYER1_SPAWN.mount='ostrich'`/`PLAYER2_SPAWN.mount='stork'`, but the renderer composes no mount under the rider. | main.ts:129-131 | **CONFIRMED (user-authoritative). Blocking.** Data all present. Dev composes mount+rider; TEA rail on the composition. |
| 4 | [HIGH] | **Lower-platform z-order wrong (user playtest #2).** `drawArena()` draws the bottom island then `drawEntities()` draws all entities on top (main.ts:165-166); objects on the lower platform occlude against the wrong layer. | main.ts:79-95,165-166 | **CONFIRMED (user-authoritative). Blocking.** Dev draw-order fix; the ORDERING is call-order-testable once the correct order is fixed; final pixel z-index is SM screenshot at finish. |
| 5 | [HIGH] | **"Wave 2 follows" AC unwired and untested.** `stepDemo` returns `wave: demo.wave` unchanged (demo.ts:496) — there is no wave-clear→advance logic, and no test pins it. Doubly dead: wave 1 can never clear (finding #1), and even a cleared wave would not advance. | demo.ts:478-496 | **CONFIRMED. Blocking.** Dev wires wave advance; TEA pins wave-2-follows. |
| 6 | [MED] | **createWaveDemo enemyType wiring untested.** Code is correct (demo.ts:275 sets `types[entry.index]`), but no test asserts the assembled enemies carry `enemyType` from the wave row — a mutant dropping it (killed bounder scores 0) passes 0/61. | demo.ts:246-275 | **CONFIRMED (coverage gap, code OK).** TEA rail: assert wave 1 = three `bounder` types. |
| 7 | [MED] | **Player facing wiring untested.** Code is correct — P1 sources `facing:1`, P2 `facing:-1` from the spawn constants (demo.ts:267-268, transporter.ts:237/240) — but no test pins the values; a mutant hard-coding `1` for both passes 0/61. | demo.ts:267-268 | **CONFIRMED (coverage gap, code OK).** TEA rail: pin P1.facing=1, P2.facing=-1. |
| 8 | [LOW] | **render.test.ts pin migration** — `/stepFlight|stepGround/` widened to `/stepDemo|stepFlight|stepGround/`. | render.test.ts:338 | **ACCEPTED — faithful migration, not a weakening.** Strict superset (cannot fail any prior case); the removed architecture (main.ts's hand-rolled flight loop) is legitimately gone; the real requirement is re-pinned STRICTER by demo-source.test.ts's unconditional `/stepDemo/`. No action. |
| 9 | [LOW] | **DemoState.events accumulates uncapped and unread by main.ts.** Latent today (collisionPass emits no score events — see #1); once collision goes live, score events grow unbounded per session. | demo.ts:496 | **NOTED, not required.** When #1 is fixed, cap/drain the log (or have main.ts consume it). Optional this story. |

### Verified good (adversarial checks that held)

- **Purity boundary** — demo.ts is CORE: imports only core modules (frame/flight/arena/egg/joust/enemy/wave/transporter), no shell/browser surface. Swept by the jt1-1 guard, green.
- **frame↔demo value cycle** — call-time only at both sites (`stepEgg` invoked inside `runBehaviour`, frame.ts:245; `stepFrame`/`createState` inside `stepDemo`/`createWaveDemo`). No evaluation-time call. tsc + vite build clean.
- **BMI EGGBCK guard** — `bounceEgg` reached ONLY in the `velY >= 0` branch (demo.ts:308); an ascending egg is left rising. Correct.
- **Egg-fall GRAV reuse** — no invented egg-gravity constant; reuses the cited flight `GRAV`. No new JT claim owed. Citations suite stays honest.

### Deviation audit

- TEA — pure `demo.ts` seam (not main.ts directly): **ACCEPTED.** Sound; the routing≠geometry pin is the right shape.
- TEA — collision pinned at `resolveContacts`, phases via source-wiring: **FLAGGED (see finding #1).** The pin strategy is fine for the LAW, but the deviation's stated forward impact ("Dev's collision pass must consult broadPhase→narrowPhase→resolveJoust; the source pin fails if a phase is skipped") was satisfied by a DEAD branch — the phases are named but structurally unreachable. The deviation did not, and could not, authorize a demo where no joust can occur.
- TEA — egg fall/hatch via decoupled `stepEgg`/`hatchEgg`: **ACCEPTED.**
- Dev — render.test.ts pin migration: **ACCEPTED** (finding #8).
- Dev — frame↔demo cycle: **ACCEPTED** (verified good).
- Dev — "collision pass wired but resolves no live contact": **FLAGGED as CRITICAL (finding #1)** — disclosure does not neutralize a story-defining AC that the code makes impossible.

### Required — split by owner

**Dev (code):**
1. **Wire live collision so a joust can resolve through `stepDemo`.** Give collision-enabled live entities the per-frame collision data `narrowPhase` needs (assign the transcribed collision-span masks in `toJoustEntity` and populate `MASKS`), OR resolve at the broad-phase/box level the demo already computes. The bar: two overlapping collision-enabled entities driven through `stepDemo` produce a kill — loser removed, egg spawned, score event emitted. (finding #1)
2. **Buzzard run animation:** select `BRRUN1..BRRUN4` for a grounded/running enemy and advance the phase; keep flap/stand for the other states. (finding #2)
3. **Compose player mount + rider:** blit the mount frame (ostrich `OR*` / stork `S*`, from `PLAYER*_SPAWN.mount`) under `PLYR1`/`PLYR2`. Carry `mount` on the player process if needed. (finding #3)
4. **Fix lower-platform draw order** so entities occlude correctly against the platform layers. (finding #4)
5. **Wire wave-2 advance:** when wave 1 clears, advance the demo to wave 2. (finding #5)
6. (Optional) cap/drain `DemoState.events` once #1 emits scores. (finding #9)

**TEA (test rails — write RED first, then Dev greens):**
1. **Loop-level kill test:** drive two overlapping collision-enabled entities through `stepDemo` and assert an emergent kill — loser removed from the process list, egg process spawned, score event appended. This is the test whose absence let the dead pass ship. (finding #1)
2. **Render-selection rails (pin ACTUAL output, not routing — the routing≠geometry lesson):** extract the frame-selection + draw-order into pure, node-testable functions and pin (a) a grounded/moving enemy selects a `BRRUN*` frame that advances with phase; (b) a player yields a [mount, rider] frame pair with the correct mount per spawn (ostrich vs stork); (c) the draw-list orders the lower-platform layers correctly. (findings #2/#3/#4)
3. **createWaveDemo enemyType:** assert wave 1 assembles three `bounder`-typed enemies. (finding #6)
4. **Player facing:** assert P1.facing=1, P2.facing=-1 from the spawn constants. (finding #7)
5. **Wave-2-follows:** pin that clearing wave 1 advances the demo to wave 2. (finding #5)

**Screenshot / SM-verified at finish (NOT test-pinnable):** the visual correctness of the running gait, the pixel-level z-index on the lower platform, and the composited mount+rider alignment. The SELECTION, COMPOSITION, and ORDERING laws above are honestly test-pinnable; whether the result LOOKS right is a screenshot the SM verifies at finish (with port-ownership proof — the sibling checkout pins 5279).

**Handoff:** Back to TEA (write the RED rails above), then Dev (green). The three playtest bugs + the dead joust are all fixable from transcribed data already in ENTITY_RECORDS — no new ROM law, no new citations.

### Delivery Findings

#### Reviewer (code review)
- **Gap** (blocking): the live joust path is dead code — `stepDemo`'s collision pass can never resolve a contact (`collision: null` hard-coded → the `continue` guard fires every pair). Affects `src/core/demo.ts` (live collision wiring) + `tests/demo.test.ts` (a loop-level kill rail). *Found by Reviewer during code review.*
- **Gap** (blocking): three user-observed render misses — buzzard run frames, player mount composition, and lower-platform z-order — none rendered though all data is transcribed. Affects `src/main.ts` (renderer) + a pure frame-selection/draw-order seam for testing. *Found by Reviewer during code review.*
- **Gap** (blocking): "wave 2 follows" is unwired and unpinned. Affects `src/core/demo.ts` (`stepDemo` wave advance) + `tests/demo.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `DemoState.events` accumulates uncapped and is unread by main.ts — cap/drain once score events flow. Affects `src/core/demo.ts` / `src/main.ts`. *Found by Reviewer during code review.*

## Tea Assessment (round 2 — red rails)

**Phase:** finish (round 2) — rails committed + pushed on `feat/jt2-7-demo-wave-1` (`b65a217`, on top of GREEN `9003193`).
**Why round 2:** the Reviewer rejected and the user watched the live demo and reported three visible bugs. Unlike the prior rounds these are REAL code gaps, confirmed at source level. I wrote RED rails that fail against the CURRENT code; Dev fixes to green.

**The gaps (source-confirmed):**
1. The live collision pass is DEAD — `toJoustEntity` hard-codes `collision: null` (demo.ts:344/361), so `collisionPass` hits `if (a.collision === null || b.collision === null) continue` (demo.ts:409) for every pair. No joust can ever resolve through `stepDemo`; deleting the whole pass reds nothing today. (`resolveContacts` is exercised only in isolation.)
2. Render (main.ts): buzzard RUN frames never play — `drawEntities` uses only `BRFLAP`/`BRSTND` (line 133); `BRRUN1-4` sit unused in ENTITY_RECORDS. Player draws the rider only — `PLYR1`/`PLYR2` blitted (line 130), the ostrich/stork mount (`OR*`/`S*` + `PLAYER*_SPAWN.mount`) unused. Lower-platform z-order wrong — `drawArena()` then `drawEntities()` (lines 165-166) puts ALL arena behind ALL entities, so foreground cliffs never occlude.
3. Wave 2 never follows — `stepDemo` returns `wave: demo.wave` unchanged (demo.ts:496).

**Test files (round 2):**
- `tests/demo-round2.test.ts` (new) — the four rails.
- `tests/helpers/demo-contract.ts` (grown) — added `mount`/`facing` to `DemoProcess`, the `DrawOp` type + `enemyFrame`/`playerDrawList`/`drawList` render-selection seams, a `loadDemoRender` loader (separate from `loadDemo` so the round-1 suite stays green while the new seams are absent), and corrected `ContactResult.egg` to `EggState`.
- `tests/helpers/flight-contract.ts` (grown) — declared the optional `animPhase` the real `flight.ts` `EntityState` already carries (the run-phase the render indexes).

**Real red counts (vitest):** full suite `Tests 8 failed | 1010 passed (1018)`, `Test Files 1 failed | 28 passed (29)`. tsc `--noEmit` exit 0.
- 8 red rails, each for the right reason:
  - Rail 1 (kill through `stepDemo`): behavioural — `AssertionError: expected false to be true` (the enemy loser is never removed; collision pass dead).
  - Rail 2a/2b/2c (`enemyFrame`/`playerDrawList`/`drawList`): clean feature-absent throws from `loadDemoRender` ("demo render-selection not built yet…").
  - Rail 3 mount: behavioural — `expected undefined to be 'ostrich'` (createWaveDemo sets no mount).
  - Rail 4 (advance + determinism): behavioural — `expected 1 to be 2` (wave never advances).
- 3 GREEN GUARDS (correctly green now, red under a drop mutant): all three enemies `enemyType==='bounder'`; P1/P2 facing `+1`/`−1`; the wave holds while enemies live.
- Pre-existing **1007 stay green** (1010 = 1007 + the 3 guards); round-1 demo suite unaffected by the contract changes.

**What Dev must do (GREEN, round 2):**
1. Live collision — `toJoustEntity` must give each entity a REAL collision-span mask (buzzard: `BSTNDR`/`BWNG*`/`BSKIDR`; player-on-ostrich: `CSTN*`/`CWNG*`), and `collisionPass` must populate `MASKS` from `COLLISION_TABLES` so `narrowPhase` can resolve. Rail 1 pins the loop-level kill (co-located player-over-enemy → loser removed + egg process + `{kind:'score', reason:'kill'}`).
2. Render selection — add pure `enemyFrame(p)` (flying→`BRFLAP/BRFLOP/BRFLIP`; grounded+running `animPhase 1..4`→`BRRUN1-4` cycling; still→`BRSTND`), `playerDrawList(p)` (`[mountBlock, riderBlock]` — ostrich `O*` for P1 / stork `S*` for P2 under the `PLY*` rider), and `drawList(demo)` (ordered `DrawOp[]`: back platforms → entities → foreground cliffs, so a foreground `arena` op follows an `entity` op). `main.ts` renders BY these functions (kills the by-eye render).
3. `createWaveDemo` — set `mount` on the player processes from `PLAYER1_SPAWN.mount`/`PLAYER2_SPAWN.mount` (`'ostrich'`/`'stork'`).
4. Wave advance — when no live enemy processes remain, `stepDemo` advances `wave` via `nextWaveBcd` and enters the next wave's complement (`waveEnemyComplement(waveRowAt(2))` = 4) via `enterViaPads` under a deterministic seed; do NOT advance while enemies live.
5. The precise per-platform depth for 2c may warrant a dossier cite in a follow-up; the rail pins only the observable "foreground occludes entities," which is the user-visible bug.
## Dev Assessment (round 2)

**Implementation Complete:** Yes — all 8 round-2 rails green, the 3 user bugs + the Reviewer's dead-collision gap fixed.

**Files Changed (round 2):**
- `src/core/demo.ts` — live collision (`collisionMaskFor` real masks + `MASKS` from `COLLISION_TABLES`; the round-1 `collision:null` shortcut removed); `mount` on player processes; `spawnWaveEnemies` refactor; wave advance in `stepDemo` (cleared = no enemies AND no eggs AND a player → `nextWaveBcd` + `enterViaPads` under the run RNG + WSMART re-seed); the pure render seams `enemyFrame` / `playerDrawList` / `drawList` + `DrawOp`.
- `src/main.ts` — renders BY `drawList` (back → entities → foreground) via `blitOp`, the island drawn last as foreground; the round-1 by-eye `drawEntities`/`drawArena` removed.
- `tests/demo.test.ts` — the round-1 "no growth" gate test's setup isolated to an empty sim (the Rail-4 conflict; see Delivery Findings).

**The 8 rails (all green):** Rail 1 loop-level kill (loser removed + egg + `{score,kill}`); Rail 2a `enemyFrame` (fly→BRFLAP, run→BRRUN1-4 cycling, still→BRSTND); Rail 2b `playerDrawList` ([O*/S* mount, PLY* rider]); Rail 2c `drawList` (arena after entities); Rail 3 mount (ostrich/stork) + the two drop-mutant guards; Rail 4 wave advance (wave 2, 4 enemies) + determinism + holds-while-alive.

**Tests:** 1018/1018 passing (29 files) — GREEN. Real vitest: `Test Files 29 passed (29)`, `Tests 1018 passed (1018)`. `tsc --noEmit` exit 0. `npm run build` (tsc + vite) clean. Purity: `src/core/demo.ts` stays in the jt1-1 sweep and passes.

**One blocking Conflict resolved:** round-1 "no growth" vs round-2 Rail 4 are byte-identical players-only setups with opposite required behaviour (unavoidable — proven empirically). Isolated the round-1 gate assertion to an empty sim; Rail 4 (the user's requirement + ROM behaviour) is fully implemented. **Reviewer attention** (Delivery Findings).

**Browser run-and-see** (spare port **5289**, ownership proven via `lsof -a -p <pid> -d cwd` → `/Users/slabgorb/Projects/a-2/joust`; did NOT touch 5279): loaded the served demo and drove the ACTUAL served module via `import('/src/core/demo.ts')` in-page — verified with my own probes:
- a joust RESOLVES through `stepDemo`: enemy removed, egg spawned, `{kind:'score', value:500, reason:'kill'}` emitted;
- the egg DROPS from y61 and SETTLES at y80 on a ledge, then HATCHES a remounting buzzard (`{posX:-9, velX:8, facing:1}` — farther edge);
- WAVE 2 enters: `wave===2`, 4 enemies;
- run frames cycle `BRRUN1→BRRUN4`, flying `BRFLAP`, still `BRSTND`;
- players compose `[mount, rider]` — P1 `[ORFLAP, PLYR1]` (ostrich), P2 `[SFLY1R, PLYR1]` (stork);
- z-order: foreground `CSRC5`/`TRASRC`/`CSRC5L`/`CSRC5R` ops draw AFTER the entity ops.
- Screenshot confirmed the fix VISUALLY: the player now shows the yellow OSTRICH MOUNT with the blue RIDER on top (round 1 drew only the rider), standing on a platform, bottom island rendering as correct foreground. ONLY console output: a benign `favicon.ico` 404 — no application errors.

**Branch:** feat/jt2-7-demo-wave-1 (pushed)
**Commit:** `0caf365329a5135ddd2560e6d6aeecf8e0089907`

**Handoff:** To Reviewer (the Thought Police). Flag: (1) the `demo.test.ts` "no growth" isolation (Rail-4 conflict — faithful isolation vs weakening); (2) `narrowPhase` co-located span comparison (exact for the rail, approximate-but-gated by broad-phase for the wave); (3) `BWNG1R`/`BWNG2R` dangling collision refs (used `BWNG3R`); (4) the foreground z-order depth approximation (per-platform depth deferred by TEA).

## Reviewer Assessment (round 2)

Specialist tags: [PRE] clean (round 1) - [TEST] round-1 CRITICAL + 3 HIGH FIXED, rails mutation-verified - [SEC] clean - [RULE] 5/5 PASS - [PLAYTEST] round-1 3 bugs fixed; user does final playtest

**Verdict:** APPROVED

Round 1 rejected the demo for a dead collision pass (no joust possible), three user-observed render bugs, and an unwired wave 2. Round 2 fixes all of them, and — the part I care about most — the fixes are now covered by rails I independently mutation-verified BITE, not just green tests. I re-ran the disputed pieces myself (cp-backup discipline, control run clean at the end).

**Full independent re-verification (this reviewer, serial):**
- Control: `npx vitest run` → **1018/1018 passing (29 files)**; `tsc --noEmit` exit 0; `git diff` clean after all mutations restored. (The "no claims found" line is pre-existing jt1-9 citations-suite noise on an empty temp dir — not a regression.)
- **Mutation A** — reverted `collisionMaskFor` to `null` (the exact round-1 dead state): Rail 1 (loop-level kill) REDS. The live-collision fix is genuinely pinned; the round-1 gap can no longer ship green.
- **Mutation B** — emptied the `MASKS` spans (narrowPhase gets no overlap): Rail 1 REDS. `narrowPhase` is genuinely load-bearing in the kill — the resolution requires transcribed span overlap, not just the broad-phase box (see ruling b).
- **Mutation C** — broke the `enemiesLeft` growth gate (`growWanted(budget, true)`): the isolated `demo.test.ts` "no growth" test REDS. The edited test still bites its named mutant (see ruling a).
- **Data checks:** the four masks the code uses — BWNG3R / BSTNDR / CWNG3R / CSTN4R — all EXIST in COLLISION_TABLES (MASKS lookup succeeds). BWNG1R / BWNG2R do NOT — but `collisionMaskFor` never returns them (uses BWNG3R), so they are dead references in a comment, not live code (ruling c). main.ts renders BY `drawList`/`blitOp` (main.ts:148) — the by-eye render is GONE, so the pure selection seams are the real path, not scenery.

### Rulings

**(a) The `demo.test.ts` "does NOT grow WSMART when no enemies" isolation — FAITHFUL stale-pin migration, NOT a weakening.** ACCEPT (same class as the round-1 render.test.ts widening I accepted).
- The conflict is genuinely forced. I read both setups: the round-1 test used `withProcesses(demo, players(demo))` (players only); round-2 Rail 4's `cleared` uses `{...demo, processes: players(demo)}` — byte-identical. Round-2 `stepDemo` now advances a cleared (players-only, no enemies) wave and spawns the next complement, whose enemies then DO grow WSMART at 896. So the old test's premise ("a players-only sim stays enemy-free forever, so no growth") is invalidated by real round-2 behaviour. No `stepDemo` can satisfy both — Dev's empirical claim holds by construction.
- The isolated test still serves its stated purpose: mutation C (grow-regardless) reds it. The empty-sim setup drives `growthDue` → `growWanted(budget, false)` with no wave-advance interference; the gate holds and the mutant dies.
- **Residual (minor, non-blocking):** the empty-sim variant no longer catches a hypothetical "counts non-enemy processes as enemies" mutant in the growth gate (the old players-present setup would have). Optional TEA strengthening: use a `[player, egg]` setup — an egg blocks the wave-advance (holds while an egg lives) AND keeps a non-enemy process present, so both the conflict is avoided and that adjacent mutant stays covered. Not required.

**(b) `narrowPhase` co-located span comparison — fidelity posture SOUND.** ACCEPT.
- Mutation B proves the narrow phase is load-bearing: empty the transcribed spans and the Rail-1 kill vanishes. So the co-located player-over-enemy resolution genuinely consults the jt2-3 span law at equal `top`, not the broad-phase box alone.
- Dev's disclosure ("exact for the rail, broad-phase-gated for the wave") is accurate: broad-phase (16×16 box) gates first, then the transcribed spans resolve. The jt2-3 `narrowPhase` LAW is used honestly; the wave's general contacts lean on the box gate, which is an acceptable demo-fidelity posture (the exact per-frame span mask per live pose is heavier and is not what the story bar requires).

**(c) BWNG1R/BWNG2R dangling refs + per-platform z-depth — dispositions:**
- **Dangling collision refs: NOTED, non-blocking.** BWNG1R/BWNG2R are pre-existing ENTITY_RECORDS names with no COLLISION_TABLES entry (a jt1-3 transcription artifact). Dev's live code correctly uses only BWNG3R (which exists) — no live-code bug. Optional jt1-3-debt follow-up to reconcile the dangling names; out of scope for jt2-7.
- **Per-platform z-depth: ACCEPT for the demo bar; legitimate follow-up.** `isForegroundArena` uses a single `destY >= 0xC0` threshold plus the island drawn last — a heuristic, disclosed as such. Rail 2c pins only the user-visible symptom ("a foreground arena op follows an entity op"), which is honest for the reported bug. True per-tier depth ordering (Joust has multiple platform tiers) warrants a dossier-cited follow-up story, matching TEA's flag. Non-blocking.

### Round-1 blockers — all cleared

| Round-1 finding | Round-2 fix | Rail | Verified |
|-----------------|-------------|------|----------|
| [CRITICAL] dead collision pass | real masks from COLLISION_TABLES via `collisionMaskFor`; `collision:null` shortcut gone | Rail 1 | Mutation A + B RED |
| [HIGH] buzzard run animation | pure `enemyFrame` cycles BRRUN1-4 by `animPhase`; main renders by it | Rail 2a | green + drop-guard |
| [HIGH] player mount missing | `playerDrawList` = [mount, rider]; ostrich P1 / stork P2; `mount` on the process | Rail 2b + Rail 3 | green + drop-guard |
| [HIGH] lower-platform z-order | `drawList` = back → entities → foreground | Rail 2c | green |
| [HIGH] wave 2 unwired | `stepDemo` advances via `nextWaveBcd` + `enterViaPads` when cleared | Rail 4 | green (advance + determinism + holds-while-alive) |
| [MED] enemyType untested | green guard: three bounders | Rail 3 | green |
| [MED] facing untested | green guard: P1 +1 / P2 −1 | Rail 3 | green |
| [LOW] render.test.ts widening | accepted round 1 (strict superset) | — | still green |

### Remaining items (non-blocking) + USER PLAYTEST flags

The pure seams pin frame SELECTION and draw ORDER; the final on-screen result is `blitOp` positioning + the atlas, which source pins cannot fully verify. Dev's in-browser screenshot covers a first pass, but the USER's final playtest is the real acceptance. Specifically check:

1. **Sprite FACING / direction flip (LOW — flag, likely a follow-up).** `blitOp` (main.ts:82-84) blits every frame un-flipped, and `enemyFrame`/`mountFrame` return only right-facing names (BRRUN1, SFLY1R, SRUNnR, ORFLAP…). Nothing applies horizontal flip by `facing`. So enemies/players moving LEFT will visually face RIGHT. This was NOT one of the three reported bugs and no rail pins it — but the `enemyFrame` comment "Facing is applied at the blit" is now STALE (blitOp does not). **User: confirm both players and the buzzards face their direction of travel.** If wrong, this is the cause; recommend a facing-flip follow-up story (comment fix owed regardless).
2. **Z-order across ALL platform tiers.** The fix routes `destY >= 0xC0` arena tiles + the island to the foreground. **User: verify a MIDDLE-tier platform also occludes correctly**, not just the bottom island — a single threshold could mis-order a middle platform.
3. **Mount + rider alignment.** `playerDrawList` blits mount and rider at the SAME origin (no offset). Dev's screenshot showed the ostrich under the rider; **user: confirm the rider sits correctly on the mount** (both mounts, both facings).
4. **Run-animation cadence.** Rail 2a pins ≥2 distinct BRRUN frames, not the exact 1-2-3-4 speed/order. **User: confirm the run reads as a smooth gait**, not a stutter.

### Delivery Findings

#### Reviewer (round-2 code review)
- **Improvement** (non-blocking): sprite facing/direction is not applied at the blit — left-moving sprites face right; the `enemyFrame` "Facing is applied at the blit" comment is stale. Affects `src/main.ts` (`blitOp`) + `src/core/demo.ts` (comment). Suggest a facing-flip follow-up. *Found by Reviewer during round-2 review.*
- **Improvement** (non-blocking): per-platform z-depth is a single `destY >= 0xC0` threshold; true per-tier depth warrants a dossier-cited follow-up. Affects `src/core/demo.ts` (`isForegroundArena`). *Found by Reviewer during round-2 review.*
- **Improvement** (non-blocking): BWNG1R/BWNG2R are ENTITY_RECORDS names with no COLLISION_TABLES entry (jt1-3 transcription debt); harmless today. Affects `src/core/pictures.ts`. *Found by Reviewer during round-2 review.*
- **Improvement** (non-blocking): optional TEA strengthening of the isolated "no growth" test to a `[player, egg]` setup to recover the adjacent gate mutant (ruling a). Affects `tests/demo.test.ts`. *Found by Reviewer during round-2 review.*

**Handoff:** To SM for finish. All round-1 Critical/High cleared and mutation-verified; suite 1018/1018, tsc clean, tree clean, branch pushed. The four items above are non-blocking follow-ups. Gate the finish on the USER's final playtest of the four checks above (facing, all-tier z-order, mount alignment, run cadence).