---
story_id: "bz4-2"
jira_key: "bz4-2"
epic: "bz4"
workflow: "tdd"
---
# Story bz4-2: Seeded-stochastic volcano emitter — per-rock independently-staggered respawn

## Story Details
- **ID:** bz4-2
- **Jira Key:** bz4-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-19T16:23:20Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T16:23:20Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### RED phase (TEA) — bz4-2

**Test file:** `battlezone/tests/core/volcano-emitter.test.ts` (new, 12 tests). RED confirmed: full suite **1031 passed → still 1031 passed, 12 new failed** (71 files). The bz3-6 `tests/core/volcano.test.ts` (physics preset) + `debris.test.ts` + `core-purity-sweep` + `citations` gate all stay green.

**PRNG finding (for Dev — reuse, do NOT invent a second):** the seeded PRNG already exists and is available. `@arcade/shared/rng` is pinned `v0.15.0` in `battlezone/package.json` (exports `createRng`/`nextFloat`/`nextInt`, `Rng = { seed }`, mulberry32). Two core modules already carry a `rng: number` seed word in their state and draw from it: `src/core/saucer.ts` (`initSaucer((seed ^ 0x5a0c3e))` → `createRng(state.rng)` → `rng.seed` back out) and `src/core/enemies.ts`. The volcano should get its own derived stream from the run seed the same way. There is NO local PRAND/LFSR in `src/core` to port — the extraction (`rng-extraction.test.ts`) already settled the shared mulberry32.

**ROM citations pinned (verified line-by-line against `/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC`):**
- `:1390` `LDX I,NOROCK-1 ;5 ROCKS` — NOROCK=5 (per-rock loop, DEX). *(Verified.)*
- `:1391-1395` `LDA X,OBJTIM / BNE 30$ / LDA PRAND / AND I,7 / BNE 50$` — each inactive rock rolls its OWN 1-in-8 (relaunch only when `(PRAND&7)==0`), off the shared LFSR that advances per read → staggered independent respawn. *(Verified — this is the exact anti-volley source.)*
- `:1396` `LDA I,1F` — OBJTIM = 0x1F = 31-frame life. *(Verified.)*
- `:1405-1407` `LDA PRAND / AND I,7 / ADC I,5` — YSPD = (PRAND&7)+5 ∈ [5,12], per-rock random. *(Verified.)*
- `:1417` `DEC X,YSPD ;GRAVITY TAMES HOLD` — gravity −1/frame (physics owned by bz3-6's `VOLCANO_ERUPTION`; not re-tested here). *(Verified.)*

**Assertions (one line each):**
- AC-1 anti-volley: a frame exists where SOME-but-not-ALL idle rocks launch (`launchers>0 && launchers<inactiveBefore`).
- AC-1 decoupling: the 5 rocks do not all share one identical launch-frame schedule (`Set(schedules).size > 1`).
- AC-1 cadence: mean idle-wait before relaunch ∈ [4,14] frames (ROM ~1/8, E≈8), excludes volley (~0) and rarer rolls.
- AC-2 band: every launch velocity is an integer in [5,12].
- AC-2 per-slot variance: at least one rock slot relaunches at ≥2 distinct velocities (kills bz3-6's fixed-per-slot).
- AC-2 spread: launch velocities cover ≥5 of the 8 band values over a long run.
- AC-2 replay: same seed → byte-identical `{vel, active}` sequences; different seed → `vel` sequences diverge.
- Purity: `initVolcano(seed).rng` is a number and `rocks.length===5`; `stepVolcano(s0)` twice ⇒ deep-equal (pure fn, no ambient RNG).
- WIRING (through `initGame`+`stepGame`): a live rock slot relaunches at ≥2 distinct velocities; same run seed replays identically, a DIFFERENT run seed diverges (proves the volcano consumes the run seed).

**Red-proof failure messages:**
- 10 direct-emitter tests → `CONTRACT (bz4-2): src/core/volcano.ts must export initVolcano(seed): VolcanoState and stepVolcano(state): VolcanoState …` (missing module, not a typo — defensive variable-specifier import).
- WIRING variance → `the live volcano relaunches every slot at a fixed velocity — the stochastic emitter is not wired into the sim: expected false to be true`.
- WIRING seed → `a different run seed produced the identical volcano … expected [[4,6,8,10,11],…] to not deeply equal [[4,6,8,10,11],…]` (today's volcano ignores the run seed).

**Gap** (non-blocking, for Dev/GREEN): reshaping `GameState.volcano` from `DebrisState` to the new `VolcanoState` has a small blast radius — `src/main.ts` reads `game.volcano.age` + `game.volcano.pieces` (shell render) and `src/core/state.ts`/`sim.ts` carry `volcanoAge`. NO existing **test** reads `state.volcano`/`volcanoAge`, so the reshape breaks no baseline test; only `main.ts` render + the `initGame`/`advanceVolcano` wiring need updating. *Found by TEA grepping all `.volcano` consumers.*

### GREEN phase (Dev) — bz4-2

**GREEN confirmed:** `tests/core/volcano-emitter.test.ts` **12/12 pass**; full suite **1047 passed / 0 failed** (71 files); `npm run build` (tsc --noEmit + vite build) clean. The +4 over the RED total (1043) is the two directory-globbing core purity suites picking up the new module: `core-purity-sweep` (2 `it`/file) + `core-audio-free` (2 `it.each`/file) = +4, all green. The `citations` audit gate scans findings JSON (not `src/core`), so it is unchanged. bz3-6's `volcano.test.ts` (VOLCANO_ERUPTION physics preset) + `debris.test.ts` stay green — `debris.ts` was NOT touched.

**Files changed:**
- `src/core/volcano.ts` (NEW) — the seeded-stochastic emitter: `initVolcano(seed)` (5 idle rocks) + `stepVolcano(state)` (one 15.625 Hz frame). Per-rock 1-in-8 respawn gate `nextInt(rng,8)===0` and launch draw `nextInt(rng,8)+5` ∈ [5,12], both off the shared `@arcade/shared/rng` (mulberry32) carried in `state.rng`. Exports `NOROCK`, `VOLCANO_LIFETIME`, `VOLCANO_SEED_SALT`.
- `src/core/state.ts` — `GameState.volcano` reshaped `DebrisState → VolcanoState`; `initGame` seeds `initVolcano((seed ^ VOLCANO_SEED_SALT) >>> 0)` (its own stream, saucer precedent). Debris import dropped.
- `src/core/sim.ts` — `advanceVolcano` drives `stepVolcano` off the same dt→frames floor-diff accumulator; the old synchronised relaunch-on-retire volley loop (`if (burst.done) spawnDebris(...)`) is gone. Fallback `?? initVolcano((state.seed ^ VOLCANO_SEED_SALT) >>> 0)` keeps volcano-less fixtures deterministic.
- `src/main.ts` (shell render) — reads `game.volcano.rocks` (skip `!active`), per-rock brightness `objtim / VOLCANO_LIFETIME`, height `rock.height`; import swapped `VOLCANO_ERUPTION` → `VOLCANO_LIFETIME`.

**AC satisfaction:**
- **AC-1 (independent staggered respawn):** each idle rock rolls its OWN `nextInt(rng,8)===0` gate off the shared LFSR (advances per read) → anti-volley (a frame launches a subset of idle rocks), decoupled per-rock schedules, and mean idle-wait ∈ [4,14] (geometric p=1/8, E≈8). ROM `BZONE.MAC:1391-1395`.
- **AC-2 (seeded random velocity + replay + purity):** launch velocity `nextInt(rng,8)+5` ∈ [5,12], raw draw visible ON the launch frame (gravity begins next frame); per-slot variance + band spread; same seed ⇒ byte-identical, different seed ⇒ diverges (seed threaded through `state.rng` and derived from the run seed); `stepVolcano` is a pure fn of `state` (no ambient randomness). ROM `BZONE.MAC:1405-1407`.
- **WIRING:** proven through `initGame`+`stepGame` — a live rock slot relaunches at ≥2 velocities and a different RUN seed diverges (the volcano consumes the run seed via `VOLCANO_SEED_SALT`).

**Deviation from TEA's map:** TEA suggested "reuse debris.ts's per-rock physics." I reimplemented the 2-line physics inline in `volcano.ts` (gravity −1, heightScale 1, OBJTIM lifetime 31) rather than driving `spawnDebris`/`stepDebris`. The debris engine is a whole-burst reducer (shared config/age, `done`, grounded-by-physics) — it does not model per-rock independent OBJTIM timers or per-rock relaunch without 5 separate single-piece `DebrisState`s plus external scheduling, which is more code and more indirection than the two inline lines. `debris.ts` and its `VOLCANO_ERUPTION` preset are left untouched (bz3-6's `volcano.test.ts` still depends on them). Logged below.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)

- **"Concrete velocity sequence" pinned by same-seed byte-identical replay + seed-sensitivity + band + per-slot-variance, NOT a hardcoded golden RNG array:** the story asked to "pin the concrete velocity sequence for one known seed so a broken/non-deterministic PRNG fails." A literal hardcoded golden would require me to replicate Dev's exact draw protocol (which of the 5 rocks rolls first, how many PRAND reads per frame, whether the 1/8 gate and the YSPD draw share one stream and in what order) — none of which is fixed before GREEN, so a golden derived from my assumed order would fail a *correct* impl for the wrong reason. Instead: two same-seed runs must be byte-identical (a `Math.random`/`Date.now` impl diverges → caught), a different seed must diverge (a fixed/unseeded impl → caught), every launch ∈ [5,12] (wrong formula → caught), and a slot must vary across its launches (bz3-6's fixed-per-slot → caught). This is the repo's established stance for RNG-derived data (`saucer.ts` "different seeds wander different paths"; bz3-6 "structural, not exact"). Reason: honours the intent (a broken/non-deterministic PRNG fails) without over-coupling RED to Dev's un-chosen draw order. Dev/Reviewer may capture an absolute golden post-GREEN once the draw protocol is frozen.

### Dev (implementation)

- **Per-rock physics reimplemented inline, not via `debris.ts`:** TEA's map said reuse `spawnDebris`/`stepDebris`. Implemented the per-rock gravity −1 / heightScale 1 / OBJTIM-31 physics as two lines inside `stepVolcano` instead. Reason: the debris reducer is whole-burst (shared config + `age` + `done`, grounded-by-physics), which does not fit per-rock independent OBJTIM timers or per-rock stochastic relaunch without 5 separate single-piece bursts and external scheduling — more indirection than the inline math. `debris.ts` untouched (bz3-6's `volcano.test.ts` still needs `VOLCANO_ERUPTION`).
- **Draw protocol (now frozen, for any post-GREEN golden):** per game frame, rocks are processed in descending index (4→0, matching VOLCNO's `LDX I,NOROCK-1 … DEX`); an ACTIVE rock reads 0 PRNG values; an IDLE rock reads 1 (`nextInt(rng,8)` respawn gate), plus 1 more (`nextInt(rng,8)` velocity draw) only on a relaunch hit. Launch velocity = draw + 5; gravity is NOT applied on the launch frame (raw draw visible), only from the next active frame.
- **Seed derivation:** `VOLCANO_SEED_SALT = 0x1caf0e`, distinct from the enemy stream (raw seed) and saucer stream (`seed ^ 0x5a0c3e`), so all three replay from `initGame(seed)` yet erupt/wander independently.

## Delivery Findings

### Reviewer (code review) — bz4-2
- **Gap** (non-blocking): the ROM VOLCNO draws a per-rock horizontal XSPD each launch (`LDA PRAND / AND I,3 / ADC I,1`, +sign via `BIT PRAND`, BZONE.MAC:1398-1404), so rocks scatter horizontally; the port models only vertical YSPD, and `main.ts` renders all rocks at the single `peakAzimuth`, so the eruption is a vertical column with no horizontal spread. Explicitly scoped OUT of bz4-2 (context: "XSPD draw — shell/orientation, not this story") and NOT an AC — recording as a candidate successor story for full VOLCNO fidelity. Affects `src/core/volcano.ts` / `src/main.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `VOLCANO_ERUPTION` (the bz3-6 debris preset) is now referenced only by `tests/core/volcano.test.ts` — no `src/` code consumes it after this story rerouted the emitter to `volcano.ts`. `debris.ts` itself stays live (`enemies.ts` object-explosion). The preset is a production-orphan kept alive by its own test; a future cleanup could retire it, but removing it now is out of bz4-2 scope. Affects `src/core/debris.ts`. *Found by Reviewer during code review.*

## Reviewer Assessment

**Verdict:** APPROVED

Adversarial review of `feat/bz4-2-volcano-emitter` against BZONE.MAC (`/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC:1385-1420`, NOROCK def :319) and the two ACs. No Critical or High findings. All mandatory checks complete; 135/135 in the touched suites re-run green independently, GREEN commit `cf2fda1` touched **zero** test files (RED `6d674fe` added only the test). Approved for finish.

**ROM fidelity (primary source, independently diffed):** VERIFIED.
- NOROCK=5 — `BZONE.MAC:319 NOROCK =5`, loop `LDX I,NOROCK-1` :1390. Port `NOROCK = 5`. ✓
- 1-in-8 gate — `LDA PRAND / AND I,7 / BNE 50$` :1393-1395, relaunch iff `(PRAND&7)==0`. Port `nextInt(rng,8) !== 0 ⇒ continue`. ✓
- OBJTIM=0x1F=31 — `LDA I,1F / STA X,OBJTIM` :1396. Port `VOLCANO_LIFETIME = 0x1f`. ✓
- YSPD=(PRAND&7)+5 ∈ [5,12] — `LDA PRAND / AND I,7 / ADC I,5` :1405-1407. Independently traced the `ADC` carry-in: the preceding XSPD `ADC I,1` on `(PRAND&3)+1` ∈ [1,5] cannot overflow a byte (carry-out 0), and `BIT`/`EOR` don't touch C, so carry into the YSPD add is 0 → range is exactly [5,12]. Port `nextInt(rng,8)+5`. ✓
- Gravity −1/frame — `DEC X,YSPD` :1417. Port `velocity - VOLCANO_GRAVITY (=1)`. ✓
- Stagger mechanism — the ROM's `LDX I,NOROCK-1 … DEX` rolls each rock off the SAME PRAND LFSR that advances per read; the port threads all 5 rocks through one `createRng(state.rng)` per frame (each `nextInt` mutates `rng.seed`), then writes `rng.seed` back — the same single advancing stream produces the decorrelation. ✓ (This is a *structural* port on mulberry32, not byte-parity with the hardware LFSR — the correct, established stance since the port omits the out-of-scope XSPD reads.)

**Determinism / replayability:** VERIFIED. `initGame(seed)` seeds `initVolcano((seed ^ VOLCANO_SEED_SALT) >>> 0)`; `VOLCANO_SEED_SALT = 0x1caf0e` is a single exported constant used **identically** in `state.ts:initGame` (`state.ts:184`) and the `sim.ts:advanceVolcano` fallback (`sim.ts` `?? initVolcano((state.seed ^ VOLCANO_SEED_SALT) >>> 0)`). Distinct from enemy (raw `seed`, `state.ts:176`) and saucer (`seed ^ 0x5a0c3e`, `state.ts:178`) → three uncorrelated streams, each replayable from the run seed. `GameState.seed` exists (`state.ts:111`), so the fallback's `state.seed` is well-defined. Snapshot = `{rocks, rng}` with the seed word carried, so a given run seed is byte-identical and a different seed diverges (proven behaviourally + in the WIRING suite).

**Core purity:** VERIFIED. `src/core/volcano.ts` contains no `Math.random`/`Date.now`/`performance.now`/DOM and no `as any`/`as unknown as`/`@ts-ignore` (grep clean). `core-purity-sweep.test.ts` does `readdirSync(coreDir).filter(f => f.endsWith('.ts'))` — a live directory glob, so `volcano.ts` is genuinely covered (not bypassed); its banned-token + escape lists are non-vacuous and pass.

**Deviation (inline physics vs debris reuse):** JUSTIFIED. `debris.ts` is a whole-burst reducer (shared `age`/`done`, grounded-by-physics); modelling 5 rocks with independent OBJTIM timers + per-rock stochastic relaunch through it would need 5 single-piece `DebrisState`s plus external scheduling — strictly more code/indirection than the two inline lines (`velocity - 1`, `height + velocity`). Not meaningful duplication. `debris.ts` stays needed (`enemies.ts` object-explosion + bz3-6's `debris.test.ts`/`volcano.test.ts`) and is untouched by this branch (verified via `git diff --name-only`). See orphan note in Delivery Findings.

**Reshape blast radius:** CLEAN. No leftover `.pieces`/`.age`/`.grounded` volcano reads in `src/` (grep clean); `state.ts`/`main.ts`/`sim.ts` carry no dangling debris symbol for the volcano path; `npm run build` clean. `main.ts:200-208` render is correct: active-only (`if (!rock.active) continue`), brightness `clamp(rock.objtim / VOLCANO_LIFETIME)` (launch frame objtim=31 ⇒ brightness 1, dimming to retire), elevation from `rock.height`.

**Launch-frame handling:** VERIFIED single-pass. `stepVolcano` visits each rock exactly once per frame; a rock that relaunches this frame is written with the **raw** draw and no gravity (`{velocity, active:true, height:0, objtim:31}`), matching the ROM's `BEQ 50$ ;ALWAYS` that skips the `30$` DEC block on the launch frame. This is load-bearing: the AC-2 band asserts the launch-frame velocity ∈ [5,12]; had gravity been applied on the launch frame a `(rng&7)==0` draw would read 4 and fail the `>= 5` bound. (Minor, invisible: on the *retire* frame the port applies gravity+move before flipping `active` false, whereas the ROM zeroes position and skips gravity — the value is discarded, never rendered/tested. Low, non-blocking.)

**Test quality (verify gate):** GENUINE, non-vacuous, robust.
- Anti-volley discriminator (`launchers>0 && launchers<inactiveBefore`) — a synchronized volley makes `launchers===inactiveBefore` every frame, so it truly separates staggered rolls from a shared clock.
- Mean idle-wait band [4,14]: geometric p=1/8, E≈8; over 4000 frames × 5 rocks the run yields ~500 wait samples (SD≈7.5 ⇒ SE≈0.33), so the band sits ~±9 SE from the mean — not flaky, and it excludes both the volley (~0) and much-rarer rolls (≫14). Pinned to fixed SEED.
- Replay (same-seed byte-identical) + seed-sensitivity (different-seed diverges) + per-slot ≥2 distinct + band-spread ≥5/8 kill Math.random/Date.now, unseeded/fixed presets, and bz3-6's fixed-per-slot respectively. No hardcoded golden coupled to draw order (TEA's deliberate choice). WIRING proves it end-to-end through `initGame`+`stepGame`.

**Data flow traced:** run seed → `initGame(seed)` → `initVolcano((seed ^ 0x1caf0e)>>>0)` → carried `state.volcano.rng` → each `stepGame` dt→frames → `advanceVolcano` → `stepVolcano` (per-rock 1-in-8 gate + `(rng&7)+5` draw, single advancing mulberry32) → `game.volcano.rocks` → `main.ts` active-only, objtim-dimmed render. Safe: pure, seeded, replayable, bounded [5,12].

**Deviation audit:**
- TEA "no hardcoded golden, pin by replay+sensitivity+band+variance" — **ACCEPTED**: matches repo RNG stance (saucer/bz3-6), honours intent (a broken/non-deterministic PRNG fails) without over-coupling to Dev's then-unchosen draw order.
- Dev "inline per-rock physics, not debris reuse" — **ACCEPTED**: rationale holds (see Deviation above); debris left intact.

**Findings (all Low / non-blocking):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] | Horizontal XSPD scatter not modelled — rocks render as a vertical column at one azimuth | `src/core/volcano.ts`, `src/main.ts:202` | Explicitly out of bz4-2 scope; successor-story Gap (see Delivery Findings) |
| [LOW] | `VOLCANO_ERUPTION` preset now referenced only by tests (production-orphan) | `src/core/debris.ts` | Cleanup candidate; removing it is out of scope here |
| [LOW] | Retire frame applies gravity+move before going inactive (ROM zeroes+skips) | `src/core/volcano.ts` (`stepVolcano` active branch) | Value discarded, never rendered or asserted — cosmetically invisible |

**Handoff:** To SM for finish-story.
