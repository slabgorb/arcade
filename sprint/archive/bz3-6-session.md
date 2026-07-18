---
story_id: "bz3-6"
jira_key: "bz3-6"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-6: VOLCANO — the clone draws a static cone the ROM never had and omits the eruption it does have

## Story Details
- **ID:** bz3-6
- **Jira Key:** bz3-6
- **Workflow:** tdd
- **Stack Parent:** None (standalone; depends on bz3-5 epic-level, already merged)
- **Branch:** feat/bz3-6-volcano-eruption (off develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T07:10:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T07:10:43Z | - | - |

## Story Summary

**Type:** Bug  
**Points:** 3  
**Priority:** P3  
**Repos:** battlezone

### Description

Cluster C6. Subsumes H-006, H-008. Depends on bz3-5 (particle subsystem).

The clone draws a static volcano cone silhouette the ROM never had (H-008) while omitting the eruption the ROM does have: the VOLCNO rock ejecta (H-006), lifetime ~1.984 s, gravity ~-244 units/s^2 at the 15.625 Hz timebase, entirely unimplemented. Wire the ejecta onto the bz3-5 particle system and drop the invented cone.

### Acceptance Criteria

1. The static volcano cone silhouette is removed (the ROM has no such cone).
2. The VOLCNO rock ejecta erupts using the bz3-5 particle subsystem, with the ROM's ejecta lifetime (~1.984 s) and gravity.

### Architecture Notes

- **Reuse bz3-5's engine:** `src/core/debris.ts` (pure `DebrisConfig`/`spawnDebris`/`stepDebris`). Drive the SAME engine with a volcano `DebrisConfig` (its own launch velocities / gravity ~-244 u/s^2 / ~1.984 s lifetime) — do NOT fork the engine.
- **Dependency:** bz3-5 built `src/core/debris.ts` with the reusable particle subsystem. bz3-6 must consume it, not re-implement.
- **Carry-forward from bz3-5's reviewer:**
  - The debris engine currently does NO input/config/dt validation (a non-terminating config or non-finite dt could hang), and it omits the ROM `EXPLDE` terminal-velocity clamp (~-124, `BZONE.MAC:1795-1798`) which was immaterial at object-explosion velocities but MATTERS for larger volcano velocities.
  - bz3-6 should add config validation and consider the terminal-velocity clamp as part of consuming the engine for the volcano.
- **Primary source (citable):** ~/Projects/battlezone-source-text (CRLF sibling NOT citable)
  - Verify the VOLCNO ejecta params (lifetime ~1.984 s, gravity ~-244 u/s^2)
  - Confirm the ROM has NO static cone
- **Audit findings:** H-006/H-008 live in `battlezone/docs/audit/findings/` (likely pair-horizon.json). The RED phase must pull each finding's exact claim and keep the citation gate green.
- **Horizon const:** bz3-8 (mountains, just merged) deliberately KEPT the `VOLCANO` const in `horizon.ts` because H-008 (removing the invented cone) is THIS story's job. bz3-6 removes that `VOLCANO` const/silhouette.

### Related Stories

- **Depends On:** bz3-5 (EXPLOSION DEBRIS — already merged, provides the reusable particle subsystem)
- **Blocked By:** None

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking, carry-forward CORRECTION): bz3-5's reviewer flagged the omitted ROM `EXPLDE` terminal-velocity clamp (~-124, `BZONE.MAC:1795-1798`) as something that "MATTERS for larger volcano velocities" (citing a hypothetical `V0=200`). **Verified against source: it does NOT apply.** The real `VOLCNO` launch velocities are `YSPD=(PRAND&7)+5 = 5..12` (`BZONE.MAC:1405-1407`) — *smaller* than the object explosion's up-to-88 — and under gravity -1 over a ≤31-frame life the rocks bottom out near -26, nowhere near -124. `VOLCNO` itself has NO clamp. So bz3-6 needs **no** `terminalVelocity` field; a test pins `minVelocity > -124`. *Found by TEA verifying carry-forward (b) against `BZONE.MAC`.*
- **Gap** (non-blocking, for Dev/GREEN): the ROM `VOLCNO` is a **continuous emitter**, not a one-shot burst — up to `NOROCK=5` concurrent rocks, each spawned stochastically (1/8 per inactive rock per frame, `BZONE.MAC:1393-1395`), living ≤31 frames, respawning while the volcano is on-screen (`TANGLE` in `[0x39,0x88]`, `BZONE.MAC:1290-1294`). bz3-5's engine models a one-shot burst that ends at `done`. AC2's pinned physics (lifetime + gravity + heightScale + count) fit one burst; the staggered stochastic respawn and age-based DOT dimming (`(OBJTIM<<3)&0xE0`, `BZONE.MAC:1355-1360`) are shell/orchestration fidelity, deferred (mirrors bz3-5 deferring XY-drift/PRAND-spin to shell). Affects the new eruption sim/render wiring. *Found by TEA reading VOLCNO in full.*
- **Gap** (non-blocking, for Dev/GREEN): the reviewer's non-finite-`dt` hang (carry-forward a) is a **consumer** concern — `stepDebris(state)` takes no `dt`; the `dt→frames` conversion lives in the accumulator (`enemies.ts:804` floor-diff). RED pins the *config* validation in `debris.ts` (testable in pure core); the eruption's own frame-accumulator must guard/cap non-finite `dt` the way `enemies.ts` does. Affects the new eruption step wiring. *Found by TEA scoping the validation boundary.*
- **Question** (non-blocking, for GREEN citations): H-006 is `class: NO_COUNTERPART, ours: null`; H-008's `ours` cites `horizon.ts:129` (`[0.72, 0]` — the invented `VOLCANO` const's first point). GREEN deletes that const, moving/removing the cited line. Set `remediated_by: "bz3-6"` on BOTH (the citation tool freezes `ours`/`source` once `remediated_by` is set — `tools/audit/check-citations.mjs`), then re-run `npm test -- citations`. Do NOT touch other cited files' comments (line-shift trap). *Found by TEA against `pair-horizon.json`.*

### Reviewer (code review)
- **Gap** (non-blocking): the volcano burst is stepped only in the `attract` and `playing` `stepGame` branches (`sim.ts:373`, `:400`), NOT in `gameover` (`:376`) or `entry` (`:388`), yet `main.ts`'s render block (`main.ts:196`) draws `game.volcano`'s airborne pieces unconditionally every frame. A burst caught mid-arc when the run ends freezes in place, visibly, for the whole GAME_OVER/ENTRY window until `initGame` reseeds. Affects `sim.ts` (call `advanceVolcano` on all mode branches, or gate the render on mode). Cosmetic, brief, non-gameplay screens only. *Found by Reviewer (edge-hunter) tracing mode branches.*
- **Improvement** (non-blocking): `drawVolcanoRocks` (`render.ts:113`) sets `ctx.shadowBlur = 8` and never resets it — it hand-rolls the glow envelope the `@arcade/shared/glow` header documents as the recurring footgun. It exactly mirrors the shipped `drawRadar`, which does the same, so it is masked today by the following `withGlow` draw; still worth routing both through `withGlow`/resetting shadowBlur. Affects `render.ts`. *Found by Reviewer (edge-hunter).*
- **Gap** (non-blocking): new sim/render/derive logic — `advanceVolcano` (relaunch loop + dt guard), `drawVolcanoRocks`, and `VOLCANO_PEAK`'s ridge-peak derivation (incl. its `[0,0]` fallback) — has no direct test coverage; only the pure debris engine + preset are tested. The AC2 physics ARE fully covered, so this is deferred-shell-fidelity coverage. Affects a future orchestration-test story. *Found by Reviewer (test-analyzer).*
- **Improvement** (non-blocking, hardening): `validateConfig` (`debris.ts:123`) guards non-termination only via `gravity >= 0`; a sub-normal negative gravity (underflow) or a non-positive `launchVelocity`/zero `heightScale` passes yet is degenerate. No live config (OBJECT_EXPLOSION, VOLCANO_ERUPTION) approaches these — purely hypothetical hardening. Affects `debris.ts`. *Found by Reviewer (edge-hunter).*
- **Improvement** (non-blocking, deferred fidelity): the emitter is a synchronized-volley relaunch-on-retire loop, not the ROM's per-rock independently-staggered 1/8-stochastic respawn (`BZONE.MAC:1393-1395`); velocities are a fixed `[5,7,9,11,12]` vs the ROM's per-rock random `(PRAND&7)+5`. Both are acceptable deterministic stand-ins (H-006 is NO_COUNTERPART; core purity forbids RNG) — flagged as a future seeded-stochastic-emitter story. Affects `sim.ts`/`debris.ts`. *Found by Reviewer confirming Dev's flagged judgment call against `BZONE.MAC`.*

### Dev (implementation)
- **Gap** (non-blocking, informational): deleting `horizon.ts`'s `VOLCANO` const (11 lines) plus the header-comment edits shifted every line number below it, which drifted FIVE more citations beyond H-008: `H-001`/`H-004`/`H-005`/`H-007`/`H-009` (all `src/core/horizon.ts`, none previously flagged by TEA since RED touched no cited lines). Also, wiring the eruption into `sim.ts`/`state.ts`/`main.ts` drifted `C-002`/`C-003`/`C-006`/`C-010` (`pair-cadence.json`, `sim.ts`/`main.ts`) and `S-018`/`S-024` (`pair-score-hud.json`, `state.ts`). All nine re-anchored to their new line numbers (content/verbatim unchanged, only `line` updated) alongside the two `remediated_by` sets; `npm test -- citations` → 12/12. *Found by Dev running the citations gate after GREEN edits — any future story touching `horizon.ts`/`sim.ts`/`state.ts` above a cited line should expect the same and re-run the gate before commit.*
- **Improvement** (non-blocking): `VOLCANO_ERUPTION`'s launch-velocity set was left underspecified by RED (a band + count, not exact values) — picked `[5, 7, 9, 11, 12]` (5 rocks per NOROCK, includes 12 so one rock genuinely rides the lifetime ceiling per the RED guidance). Not ROM-exact (VOLCNO's are PRAND-random per rock) — flagged in case a future story wants to seed them from the carried RNG instead of a fixed authored set.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Lifetime modeled as a NEW `DebrisConfig` field, not emergent physics:** bz3-5 derived the object blast's ~2.88 s purely from launch velocity + gravity (physics landing). The volcano's ~1.984 s is the ROM `OBJTIM=0x1F=31`-frame **timer** (`BZONE.MAC:1396`), NOT a physics landing — with velocities 5..12 the pieces would ground far sooner. So tests pin a `lifetime?: number` (frames) added to `DebrisConfig` + honored by the engine (`done` when grounded OR `age >= lifetime`), gated on `!== undefined` so `OBJECT_EXPLOSION` is unaffected. Reason: faithfulness demands the timer; it also doubles as the non-termination guard.
- **Launch velocities pinned as a BAND [5,12] + count 5, not exact values:** ROM `YSPD=(PRAND&7)+5` is PRAND-random per rock, so there is no single canonical value. Tests pin `length === 5` (NOROCK) and every velocity integer-in-[5,12], leaving Dev to pick the representative set (include one ≥~11 so a rock rides the lifetime ceiling). Mirrors bz1-3/bz3-5's "structural, not exact authored coordinate" stance for RNG-derived data.
- **`heightScale === 1` for the volcano (contrast OBJECT_EXPLOSION's 4):** `VOLCNO` integrates `YPOS += YSPD` with NO `<<2` (`BZONE.MAC:1418-1435`), unlike `EXPLDE`'s `EXPOSZ += ZVELOC*4`. Pinned exact.
- **The two existing horizon volcano-presence tests were FLIPPED, not supplemented:** `horizon.test.ts`'s "contains … volcano" and "the volcano has a peak" asserted the invented cone EXISTS — directly contradicting AC1. Flipped both to assert the cone is ABSENT (RED now, GREEN when the `VOLCANO` const is deleted) rather than leaving stale green tests that would break in GREEN. Reason: RED must encode the NEW contract.
- **Height-integration ORDER note (no engine change):** `VOLCNO` applies gravity BEFORE the position update (`DEC X,YSPD` then `YPOS += YSPD`) — the OPPOSITE of `EXPLDE`/the bz3-5 engine (`height += velocity` then `velocity += gravity`). Shifts apex/landing by ≤1 frame; the lifetime (not the landing frame) governs the volcano's duration, so tests use bands and do NOT require re-ordering the engine (re-ordering would break OBJECT_EXPLOSION's apex test). Dev: keep the existing order.

### Dev (implementation)
- **Continuous emitter modeled as a relaunch-on-retire LOOP, not the ROM's staggered per-rock respawn:** TEA's Gap finding notes VOLCNO is a continuous 5-rock emitter with independent stochastic (1/8-per-frame) respawn per rock, while AC2's tests only pin per-rock physics (lifetime/gravity/heightScale/count) on ONE burst. Spec said (TEA guidance C) "a simpler looping emitter is acceptable... stochastic staggering can be deferred." Implemented: `sim.ts`'s `advanceVolcano` steps the SAME 5-rock burst every game frame and, the instant it's `done` (all grounded or the 31-frame lifetime hit), immediately `spawnDebris(VOLCANO_ERUPTION)`s a fresh one — so the volcano visibly erupts continuously (never idle), but as synchronized 5-rock volleys rather than independently-staggered individual rocks. Reason: satisfies AC2's "erupts" behavior and the tested physics without inventing an un-tested per-rock stochastic scheduler; flagged for the Reviewer as the single biggest judgment call in this story.
- **`VOLCANO_HEIGHT_SCALE` (main.ts) and the debris-height→elevation mapping are authored, not ROM-cited:** the ROM renders VOLCNO's rocks via a hardware DOT sprite at its own native coordinate space — there is no decoded conversion into this port's angular backdrop space. Picked `0.002` rad/height-unit (arc tops out around the same order of magnitude as the old invented cone's elevations, ~0.1-0.15 rad) so the eruption reads as rising off the peak without overshooting the mountain-scape. Playtest-tunable, like `RADAR_RANGE`.
- **`VOLCANO_PEAK` (horizon.ts) derives the eruption azimuth from the ridge's own tallest vertex, not a fresh authored coordinate:** the ROM's `JSR VGCNTR` target angle isn't decoded into this port's angular space, and H-008 explicitly removed the old free-standing coordinate (`[0.72, 0]`) as invented. Rather than author a new one the same way, `VOLCANO_PEAK` is derived at module-load from `MTN_PANORAMA`'s highest-elevation `'mountains'` point — ties the eruption to real ridge geometry instead of a second invented number.
- **`volcano`/`volcanoAge` added to `GameState` as OPTIONAL fields (`?`), not required:** ~18 test fixtures across the suite construct `GameState` object literals directly; making the new fields required would force every one of them to typecheck a `volcano` field they don't care about. Followed the existing `missilesLaunched`/`reload ?? 0` idiom (optional field, `?? spawnDebris(VOLCANO_ERUPTION)` / `?? 0` fallback at every read site) instead — zero fixture edits needed, matches project convention.

## TEA Assessment

**Tests Required:** Yes
**Reason:** AC1 removes invented render geometry (falsifiable — flip the two horizon presence tests) and AC2 is a new ROM-faithful subsystem consuming bz3-5's engine (lifetime field + validation are new engine behavior + a new preset). Not a chore bypass.

**Test Files:**
- `battlezone/tests/core/volcano.test.ts` (new) — 16 tests for AC2 + both bz3-5 carry-forwards (VOLCANO_ERUPTION preset, lifetime engine feature, ballistic arc, config validation, terminal-velocity non-issue, OBJECT_EXPLOSION regression + reuse).
- `battlezone/tests/core/horizon.test.ts` (modified) — 2 volcano-presence tests FLIPPED to pin AC1 (invented cone removed).

**Tests Written:** 18 tests bearing on the ACs (16 new + 2 flipped) covering AC1 + AC2.
**Status:** RED — committed `b4bad9d` on `feat/bz3-6-volcano-eruption`.

### Verified ROM citations (primary source: `~/Projects/battlezone-source-text/BZONE.MAC`, LF/citable)
- **VOLCNO routine** — `BZONE.MAC:1390-1449` (`.SBTTL VOLCAO ROCK MOVEMENT`), "CALLED ONCE A FRAME. WILL MOVE UP TO 5 ROCKS."
- **NOROCK = 5** — `:319` `NOROCK =5` (`OBJTIM: .BLKB NOROCK` at :320).
- **lifetime OBJTIM = 0x1F = 31 frames** — `:1396` `LDA I,1F` → `STA X,OBJTIM`; decremented at `:1415` `DEC X,OBJTIM / BEQ 12$` (dies at 0). Radix-16 region ⇒ 0x1F = **31** decimal frames = 31 / 15.625 Hz = **1.984 s**. This is the AC2 ejecta lifetime (a CEILING/timer, not a physics landing).
- **gravity = -1 / frame** — `:1417` `DEC X,YSPD ;GRAVITY TAMES HOLD` (velocity -= 1 each frame) = -1 · 15.625² ≈ **-244 units/s²**. (Object explosion's GRAVTY is -4 by contrast.)
- **heightScale = 1** — `:1418-1435` integrate `YPOS += YSPD` (a plain signed 16-bit add, NO `<<2`). Contrast `EXPLDE`'s `EXPOSZ += ZVELOC*4`.
- **launch YSPD = (PRAND&7)+5 = 5..12** — `:1405-1407` `LDA PRAND / AND I,7 / ADC I,5`. (Horizontal `XSPD=(PRAND&3)+1` with 50% sign flip, `:1398-1404`, is shell/orientation — not AC2 physics.)
- **ground floor ~-95, BELOW the launch origin** — `:1425-1432` dies when `YPOSH<0 && YPOSL<0xA2` (0xA2 threshold ⇒ YPOS ≲ -95). With velocities 5..12 this is reached at ~frames 19-30, so ground death typically PRE-EMPTS the 31-frame timer — the timer is the max-life ceiling.
- **age-dimmed DOT render** — `:1355-1360` brightness `(OBJTIM<<3)&0xE0` (shell fidelity, deferred).
- **on-screen gate** — `:1290-1294` volcano plotted only when `TANGLE` in `[0x39,0x88]`; `:1318` `JSR VGCNTR ;C MOVE BEAM TO TOP OF VOLCANO` (H-008: this is the ONLY volcano geometry — a beam move to a MTNS ridge peak, no cone).
- **EXPLDE terminal-velocity clamp ~-124** — `:1795-1798` `CMP I,80-GRAVTY+1 / BCC` (0x80-(-4)+1=0x85 ⇒ ≈ -123). Confirmed immaterial for the volcano (see Delivery Findings).

### Finding corrections (confirmed against source)
- **H-006** (`NO_COUNTERPART`, `ours:null`): CONFIRMED — every constant verified above at the correct 15.625 Hz timebase. Nuance: the finding lists both the 31-frame timer AND ground-contact death; the ~1.984 s the AC pins is the OBJTIM **ceiling**, which ground death usually beats. Once GREEN wires the eruption, H-006 gains a counterpart → set `remediated_by: "bz3-6"`.
- **H-008** (`DIVERGENCE`, verdict CONFIRMED): CONFIRMED — the ROM draws NO cone; `ours` (`horizon.ts:129` `[0.72, 0]`) is the first vertex of the invented `VOLCANO` const. GREEN deletes it → `remediated_by: "bz3-6"`.
- **Carry-forward (b) REFUTED for the volcano:** the EXPLDE clamp does NOT matter here — actual velocities 5..12 bottom out ~-26, and VOLCNO has no clamp. No `terminalVelocity` field needed. (Detail in Delivery Findings.)

### Tests + assertions (18, RED where they must be)
AC1 — `horizon.test.ts` (both FLIPPED → RED, cone still present):
1. Backdrop has mountains + moon but NO `volcano` polyline (H-008).
2. Every PANORAMA polyline is `mountains`|`moon` only — no stray invented cone.

AC2 — `volcano.test.ts` (contract-miss / behavior RED):
3. `VOLCANO_ERUPTION.gravity === -1` (`:1417`).
4. `.heightScale === 1` and `!== OBJECT_EXPLOSION.heightScale` (`:1418-1435`).
5. `.lifetime === 0x1F === 31`; `31/GAME_FRAME_HZ ≈ 1.984 s` (`:1396`).
6. `.launchVelocities` length 5 (NOROCK) and every value integer-in-[5,12] (`:319`, `:1405-1407`).
7. Engine HONORS lifetime: a gravity-0 config (never grounds) + `lifetime:31` retires at ~31 frames, NOT the 5000 cap — RED proof the field is unwired **and** the reviewer's non-termination hang is guarded.
8. That lifetime = ~1.984 s, and is NOT the object ~2.88 s nor the old 1.5 s.
9. A VOLCANO_ERUPTION rock rises→apex (velocity zero-crossing)→falls — arc tied to gravity -1.
10. The whole eruption completes within the ~31-frame OBJTIM ceiling and is shorter than the object blast.
11-15. `spawnDebris` THROWS on: empty velocities; non-finite velocity (NaN/Inf); non-finite gravity/heightScale; non-terminating config (gravity≥0 & no lifetime — but a lifetime rescues it); non-positive/non-finite lifetime.
16. No VOLCANO_ERUPTION rock ever falls faster than the EXPLDE clamp (`minVelocity > -124`, actually > -40) — no clamp needed (`:1795-1798`).
17. **REGRESSION (stays GREEN):** OBJECT_EXPLOSION (no lifetime) still ends by physics at ~40-52 frames — the lifetime addition must not clamp it.
18. Both presets flow through the SAME `spawnDebris`/`stepDebris` (reuse, no fork).

### Proof RED
- `npx vitest run tests/core/volcano.test.ts tests/core/horizon.test.ts` → **17 failed | 19 passed (36)**. The 17 failures = 2 flipped horizon AC1 tests (cone still present) + 15 volcano tests (VOLCANO_ERUPTION missing / lifetime unwired / validation absent). Test #17 (OBJECT_EXPLOSION regression) PASSES by design.
- Full suite: **17 failed | 968 passed (985)** — baseline was 969 passed; the ONLY deltas are the 17 intended RED failures (no collateral: 969 − 2 flipped + 1 new regression-guard = 968 passing).
- `npm test -- citations` → **12 passed** (gate GREEN; no cited source file touched in RED).
- `npx tsc --noEmit` → exit 0 (dynamic variable-specifier import defers the missing `VOLCANO_ERUPTION` export to GREEN).

### GREEN guidance for Dev

**A. `src/core/debris.ts` — EXTEND, do not fork (the reuse tests fail on a fork):**
1. Add `readonly lifetime?: number` to `DebrisConfig` (max age in game frames = ROM OBJTIM). `undefined` = physics-only (OBJECT_EXPLOSION unchanged).
2. Add `readonly age: number` to `DebrisState` — `spawnDebris` sets 0, `stepDebris` increments. `done = allGrounded || (lifetime !== undefined && age >= lifetime)`. **Gate on `!== undefined`** — test #17 fails if OBJECT_EXPLOSION gets clamped.
3. `spawnDebris` VALIDATES the config and **throws** on: empty `launchVelocities`; any non-finite velocity; non-finite `gravity`/`heightScale`/`groundHeight`; non-positive/non-finite `lifetime`; **non-terminating** (`lifetime === undefined && gravity >= 0`). OBJECT_EXPLOSION passes (gravity -4 < 0, 6 positive velocities); the volcano is doubly safe (gravity -1 AND lifetime 31).
4. Export `VOLCANO_ERUPTION: DebrisConfig = { launchVelocities: [5 integers in [5,12], include one ≥~11], gravity: -1, heightScale: 1, lifetime: 31 }`. Cite each line (gravity `:1417`, heightScale `:1418-1435`, lifetime `:1396`, NOROCK `:319`, YSPD `:1405-1407`). OPTIONAL ROM fidelity: `groundHeight ≈ -95` (0xA2 floor, `:1428`, BELOW the origin) — tests don't require it; if added, keep a fast rock riding the lifetime ceiling.
5. Do NOT re-order the height integration (keep `height += velocity` then `velocity += gravity`) — see the Design Deviation; re-ordering breaks OBJECT_EXPLOSION's apex test.

**B. AC1 — remove the invented cone in `src/core/horizon.ts`:**
- Delete the `VOLCANO` const (`horizon.ts:126-135`) and drop it from `PANORAMA` (`:138` → `[...MTN_PANORAMA]`). Update the header comment (`:3`, `:14-15`, `:38-40`) that describes a volcano silhouette. Optionally drop `'volcano'` from the `PanoramaPolyline.name` union (harmless to keep).

**C. Eruption wiring (AC2 render/sim — new, not horizon backdrop):**
- A new volcano-eruption sim state (up to 5 rocks) drives `spawnDebris`/`stepDebris(VOLCANO_ERUPTION)`, stepped once per 15.625 Hz frame via the same `GAME_FRAME_HZ` floor-diff accumulator `enemies.ts:804` uses. **GUARD non-finite `dt`** in that accumulator (cap frames-per-call) — carry-forward (a).
- Render each rock as a DOT at the top-of-volcano azimuth (a MTNS ridge peak, on-screen when `TANGLE∈[0x39,0x88]`, `:1290-1294`), reusing `panoramaToNdc`. Brightness dims with age (`(OBJTIM<<3)&0xE0`, `:1355-1360`) — shell fidelity. The continuous-emitter orchestration (stochastic 1/8 respawn, staggered rocks) wraps the per-burst engine; AC2 only pins per-rock lifetime + gravity, so a simpler looping emitter is acceptable and the stochastic staggering can be deferred/seeded.

**D. Citations:** set `remediated_by: "bz3-6"` on H-006 AND H-008 in `docs/audit/findings/pair-horizon.json` (freezes their `ours`/`source`), then `npm test -- citations`. Don't edit other cited files' comments.

**E. Regression:** the existing `debris.test.ts` (17) + volcano test #17 pin the OBJECT_EXPLOSION path — keep it green.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/debris.ts` — extended (not forked): optional `DebrisConfig.lifetime` + `DebrisState.age`, gated `done` (`!== undefined`, so `OBJECT_EXPLOSION` is untouched); `validateConfig` throws on empty/non-finite velocities, non-finite gravity/heightScale/groundHeight, a bad lifetime, or a non-terminating config; new `VOLCANO_ERUPTION` preset (5 rocks `[5,7,9,11,12]`, gravity -1, heightScale 1, lifetime 31).
- `src/core/horizon.ts` — deleted the invented `VOLCANO` const + dropped it from `PANORAMA` (AC1/H-008); added derived `VOLCANO_PEAK` (ridge's tallest vertex); updated header comments.
- `src/core/state.ts` — added optional `GameState.volcano`/`volcanoAge`; `initGame` seeds a fresh burst.
- `src/core/sim.ts` — added `advanceVolcano` (enemies.ts:804-style floor-diff accumulator, dt-guarded, continuous relaunch-on-retire loop); wired into both `stepGame` battle paths (attract + playing) alongside `advanceRadar`.
- `src/main.ts` — renders `game.volcano`'s airborne pieces as dots at `VOLCANO_PEAK`, dimmed by burst age; new `VOLCANO_HEIGHT_SCALE` authored constant.
- `src/shell/render.ts` — new `drawVolcanoRocks` (same alpha-dimmed-dot idiom as `drawRadar`'s blips).
- `docs/audit/findings/pair-horizon.json` — `remediated_by: "bz3-6"` on H-006 and H-008 (ours frozen per checker rules); re-anchored H-001/H-004/H-005/H-007/H-009 line drift.
- `docs/audit/findings/pair-cadence.json` — re-anchored C-002/C-003/C-006/C-010 line drift (sim.ts/main.ts edits shifted them).
- `docs/audit/findings/pair-score-hud.json` — re-anchored S-018/S-024 line drift (state.ts edits shifted them).

**Tests:** 985/985 passing (GREEN) — was 968/985 in RED, all 17 intended RED failures now pass, zero collateral breakage.
**Citations:** 12/12 passing (`npm test -- citations`).
**Typecheck/Build:** `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` clean.
**Branch:** feat/bz3-6-volcano-eruption (pushed, commit `fbb6c9a`)

**Judgment calls for the Reviewer:**
1. **Single-burst continuous-relaunch loop**, not the ROM's staggered per-rock stochastic respawn (see Design Deviations) — biggest scope call in this story.
2. **`VOLCANO_HEIGHT_SCALE` (0.002) and `VOLCANO_PEAK`'s derivation** are both authored (no ROM-cited conversion exists for either) — playtest-tunable, flagged as such.
3. **`OBJECT_EXPLOSION` regression:** confirm it is genuinely untouched — the `lifetime !== undefined` gate is the only new thing that could reach it, and `debris.test.ts`'s original 17 tests + volcano test #17 (physics-only termination ~40-52 frames) all still pass unmodified.
4. **Citation re-anchoring:** 11 findings across 3 files had only their `line` field updated (content/verbatim identical) to follow line drift from edits above them — worth a spot-check that none of those diffs snuck in an unintended verbatim change.

**Handoff:** To Reviewer.

## Reviewer Assessment

**Verdict:** APPROVED

**Independent verification (ran myself, not trusting the handoff):**
- `npx vitest run` → **985 passed (985), 68 files** — 0 failed.
- `npm test -- citations` → **12 passed (12)** — gate GREEN.
- `npx tsc --noEmit` → **exit 0**.

**Data flow traced:** player death/eruption tick → `initGame` seeds `volcano: spawnDebris(VOLCANO_ERUPTION)` + `volcanoAge: 0` (`state.ts:159`) → `stepGame` calls `advanceVolcano` on the attract (`sim.ts:373`) and playing (`:400`) branches, floor-diff stepping the burst at `GAME_FRAME_HZ` and relaunching on retire → `renderFrame` (`main.ts:196`) projects each airborne piece through `panoramaToNdc` (null-culled off-screen) → `drawVolcanoRocks`. Deterministic and pure end-to-end (no DOM/time/random in the core path). Wiring is complete and reachable.

**Pattern observed:** `advanceVolcano` (`sim.ts:342`) faithfully reuses the established `enemies.ts:804` floor-diff accumulator idiom, adding the continuous relaunch. `drawVolcanoRocks` (`render.ts:113`) mirrors `drawRadar`'s alpha-dimmed-dot idiom (including, for better or worse, its shadowBlur non-reset).

**Error handling:** `advanceVolcano` bails on non-finite/`<=0` dt (`sim.ts:344`) — carry-forward (a) consumer guard; `validateConfig` (`debris.ts:123`) throws loudly on empty/non-finite/non-terminating configs — carry-forward (a) config guard. Both live presets pass validation (traced constructors: OBJECT_EXPLOSION gravity −4<0; VOLCANO_ERUPTION gravity −1 + lifetime 31) — **no false-positive rejection**.

**The crux — OBJECT_EXPLOSION genuinely untouched:** `done` is gated on `lifetime !== undefined` in both `spawnDebris` (`debris.ts:159`) and `stepDebris` (`:171`); for the lifetime-less object explosion it reduces to `pieces.every(grounded)` — behaviorally identical to bz3-5. `debris.test.ts` is UNMODIFIED (not in the diff) and passes — including its deep-equality determinism (`:356`) and immutability (`:365`) tests, which survive the new `age` field; volcano test #17 (physics-only ~40–52 frames) passes. Confirmed intact.

**Source fidelity (verified against `~/Projects/battlezone-source-text/BZONE.MAC`):** VOLCANO_ERUPTION matches the ROM — gravity −1 (`:1417 DEC X,YSPD`), heightScale 1 (`:1418-1435`, 16-bit add, no `<<2`), lifetime `0x1F`=31 (`:1396 LDA I,1F`), NOROCK=5 (`:319`), YSPD∈[5,12] (`:1405-1407 AND I,7/ADC I,5`). Clamp refutation CONFIRMED: the terminal-velocity clamp lives only in EXPLDE (`:1795-1798 CMP I,80-GRAVTY+1`), NOT in VOLCNO; volcano velocities bottom out ~−19..−26 (test proves >−40) — no clamp field correctly omitted. H-008 CONFIRMED: `grep -i cone BZONE.MAC` returns nothing; the only volcano geometry is the beam-move at `:1318` — the invented cone genuinely does not exist.

**Judgment calls — all acceptable, all documented:** (1) continuous relaunch-on-retire loop vs ROM staggered stochastic respawn — H-006 is NO_COUNTERPART, TEA explicitly scoped AC2 to per-rock physics, core purity forbids the RNG; (2) fixed velocities `[5,7,9,11,12]` — fair representative of the random `[5,12]` band (5 rocks, includes the 12 ceiling), deterministic stand-in; (3) authored `VOLCANO_HEIGHT_SCALE`/`VOLCANO_PEAK` — no ROM-cited angular conversion exists, playtest-tunable like RADAR_RANGE. Deviation audit: every TEA + Dev deviation is documented and **ACCEPTED**; none undocumented.

**Citation honesty:** `remediated_by: bz3-6` set on H-006 + H-008 ONLY — both genuinely remediated (eruption wired, cone deleted); the 9 re-anchors (H-001/H-004/H-005/H-007/H-009, C-002/C-003/C-006/C-010, S-018/S-024) are line-field-only, verbatim byte-identical (verified in diff); citations 12/12.

**Findings (0 Critical, 0 High, 0 Medium-blocking; all non-blocking):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] | Volcano frozen + still rendered during gameover/entry (advanceVolcano not called on those branches) | `sim.ts:376,388` / `main.ts:196` | Cosmetic; brief; non-gameplay screens only |
| [LOW] | `shadowBlur=8` not reset in `drawVolcanoRocks` | `render.ts:122` | Mirrors shipped `drawRadar`; masked by next `withGlow` draw |
| [LOW] | No test coverage for `advanceVolcano`/`drawVolcanoRocks`/`VOLCANO_PEAK` | `sim.ts`/`render.ts`/`horizon.ts` | AC2 physics fully covered; orchestration is deferred shell fidelity |
| [LOW] | `validateConfig` hardening gaps (sub-normal gravity, ≤0 velocity, 0 heightScale) | `debris.ts:127,131,140` | Purely hypothetical; no live config reaches them |
| [LOW] | Emitter/velocity fidelity simplification | `sim.ts`/`debris.ts` | Acceptable NO_COUNTERPART stand-in; documented; future seeded-stochastic story |

Dismissed as non-issues: EH-3 (volcanoAge/age transient disagreement on dt≤0 bail — self-heals via the `?? 0` fallback on the next dt>0 call); EH-1/EH-2 unbounded-dt loop (matches the codebase-wide `enemies.ts:804`/`advanceRadar` accumulator pattern; production dt is clamped by `createLoop`).

**Handoff:** To SM for finish-story.
