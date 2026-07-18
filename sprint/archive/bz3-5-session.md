---
story_id: "bz3-5"
jira_key: "bz3-5"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-5: EXPLOSION DEBRIS

## Story Details
- **ID:** bz3-5
- **Jira Key:** bz3-5
- **Workflow:** tdd
- **Stack Parent:** bz3-1 (completed)

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T03:08:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T03:08:42Z | - | - |

## Story Summary

**Type:** Bug  
**Points:** 5  
**Priority:** P2  
**Repos:** battlezone

### Description

Cluster C5. Subsumes F-008 (re-sized m→l by the coverage review AND the refuter: it is a whole new particle subsystem, not a constant swap). Depends on bz3-1 (timebase rebase).

The ROM object explosion is a 6-piece gravity-driven particle sim: launch velocities IZVEL = 55, 40, 70, 88, 40, 66 (BZMTNS.MAC:837–838, DECIMAL in that file's .RADIX 10 block — the refuter found a SIXTH byte .BYTE 66 at :838 that the auditor missed), GRAVTY = -4/frame (BZONE.MAC:380, decimal at 15.625 Hz), pieces expanding then falling over ~3 s until the tallest lands. The clone currently has a fixed 1.5 s timer with no debris physics.

### Acceptance Criteria

1. Object explosions spawn 6 gravity-driven debris pieces (IZVEL launch 55, 40, 70, 88, 40, 66; GRAVTY=-4 per frame at 15.625 Hz) with physics-driven termination, replacing the fixed 1.5 s timer.
2. The particle subsystem is factored so the volcano eruption (bz3-6) reuses it rather than re-implementing gravity particles.

### Architecture Notes

- **Reusable Subsystem:** Build as a parametrizable particle system that bz3-6 (volcano eruption) will consume; avoid duplicating gravity physics.
- **Location:** Keep in `src/core/` (deterministic/pure) — physics is sim state, not render.
- **Audit Citation:** F-008 in `battlezone/docs/audit/findings/` (likely pair-combat.json or pair-horizon.json).
- **Primary Source:** ~/Projects/battlezone-source-text (CRLF sibling not citable)
  - BZMTNS.MAC:837–838 (IZVEL velocities, .RADIX 10 block)
  - BZONE.MAC:380 (GRAVTY = -4, decimal)
  - BZONE.MAC:1085 (64 ms frame timing, context for the 15.625 Hz rebase)

### Related Stories

- **Blocks:** bz3-6 (Volcano eruption — consumes this particle subsystem)
- **Depends On:** bz3-1 (THE TIMEBASE REBASE — already done, 15.625 Hz frame rate)

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): The saucer death blast (`src/core/saucer.ts:233`) ALSO consumes `EXPLOSION_DURATION` (1.5 s). AC1 scopes only the OBJECT/tank explosion (F-008); the ROM saucer is a separate object and may not use the 6-piece IZVEL sim. Dev: keep the saucer on its own timer OR give it its own `DebrisConfig` — do NOT let a debris refactor silently change saucer blast timing. *Found by TEA during test design.*
- **Question** (non-blocking): F-008's `source.verbatim` still quotes only the 5-byte line `BZMTNS.MAC:837` (`IZVEL:\t.BYTE 55,40,70,88,40`). The citation gate passes (verbatim matches :837), but the confirmed 6th launch velocity is `.BYTE 66` at `:838`. When GREEN sets `remediated_by`, the finding should span :837-838 (or note the 6th byte) so the audit record reflects all six pieces. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking, resolved this story): `tests/core/enemies.test.ts`'s pre-existing "the battlefield is never empty..." test and `tests/core/events.test.ts`'s two hostile-spawn tests hard-coded the OLD ~1.5 s `EXPLOSION_DURATION` window (maxSteps derived from it, plus a tight `±3*DT` tolerance in the enemies.test.ts case) — exactly the assumption AC1 replaces. Left unmodified by RED (only `debris.test.ts` was added, per `git show --stat 547b90e`). Updated both to the new ~2.8-3.0 s physics band (matching `debris.test.ts`'s own 2.5-3.4 s band) with generous step-count margin; see Design Deviations below. *Found by Dev during GREEN wiring — the conflict surfaces the instant the object kill attaches a real `DebrisState` and the old assertions run against real physics instead of a hand-built fixture.*
- **Improvement** (non-blocking, for bz3-6): the reusable engine (`src/core/debris.ts`) is physics-only (height/velocity/grounded/done) — no XY drift (EXPTBX/EXPTBY) or PRAND orientation spin, per RED's explicit descope. If the volcano wants either, they're new `DebrisConfig`/`DebrisPiece` fields, not something to bolt onto battlezone's `OBJECT_EXPLOSION` preset.

### Reviewer (code review)
- **Gap** (non-blocking, for bz3-6): `debris.ts` and the `enemies.ts` accumulator do NO input validation on the (deliberately reusable) `DebrisConfig`/`dt` surface. Three latent failure modes, all UNREACHABLE in bz3-5 but live traps for bz3-6's new config, converged on by edge-hunter + silent-failure-hunter + my own runtime probe: (1) **non-termination** — `gravity >= 0`, a `NaN` launch velocity, or all `launchVelocities <= 0` means `done` never flips (verified: `{launchVelocities:[10], gravity:0}` runs unbounded), freezing the hostile slot at `phase:'exploding'` forever with no error; (2) **empty `launchVelocities: []`** — `[].every(...)` is vacuously `true`, so `spawnDebris` returns `done:true` and the "explosion" retires in one tick; (3) **non-finite/huge `dt`** — `Math.floor(Infinity*HZ)=Infinity` makes the catch-up `for` loop hang (the old scalar branch was O(1)). All three are unreachable in bz3-5: the ONLY config is `OBJECT_EXPLOSION` (gravity=-4, 6 positive velocities → provably lands frame 45 = 2.88 s) and the ONLY `dt` is the shared fixed-timestep loop's clamped constant 1/60 s. Affects `src/core/debris.ts` (validate `gravity < 0` with finite positive velocities, non-empty array) and `src/core/enemies.ts` (guard non-finite dt / cap frames-per-call), OR a hard frame ceiling as a defensive `done`. *Found by Reviewer — bz3-6 must validate its own config before feeding this engine.*
- **Gap** (non-blocking, for bz3-6): the ROM `EXPLDE` clamps `ZVELOC` at terminal velocity (~-124; `BZONE.MAC:1795-1798`, `CMP I,80-GRAVTY+1 / BCC`), which `stepDebris` omits. IMMATERIAL for `OBJECT_EXPLOSION` — max V0=88 lands at ZVELOC=-92, never reaching the clamp — so bz3-5 is byte-faithful. But bz3-6's volcano at large launch speeds (TEA's `V0=200` reaches ~-204 by landing) would fall faster than the ROM. Affects `src/core/debris.ts` (consider a `terminalVelocity?` config field for the volcano). *Found by Reviewer against primary source `BZONE.MAC` EXPLDE.*
- **Improvement** (non-blocking): `Hostile.debris` is optional with no compile/runtime enforcement that the tank/super-tank kill site always populates it. Threaded correctly everywhere today (no `cloneState`/serialize path exists to drop it), but a future refactor of the kill literal that omits `debris:` typechecks clean and silently reverts that path to the 1.5 s timer — backstop is only the timing-band tests. Affects `src/core/enemies.ts`. *Found by Reviewer.*

## Design Deviations

### TEA (test design)
- **Grounded threshold modeled at height 0, not the ROM's "-256":** F-008 describes termination as "EXPOSZ high byte negative … past -256". Tests pin the grounded predicate as `velocity <= 0 && height <= groundHeight` with `groundHeight` defaulting to 0 (pieces start at the object centre = EXPOSZ 0). Reason: the tallest-piece landing frame is nearly identical (±1 frame) for a 0 vs −256 threshold, and the −256 is an artifact of the ROM's 16-bit sign check, not a distinct ground plane. Bands (40–52 frames) absorb either. `groundHeight` is exposed on `DebrisConfig` if bz3-6 wants a real floor offset.
- **`heightScale` (the ROM `<<2`) lives in the core config, not shell render:** Tests pin `OBJECT_EXPLOSION.heightScale === 4` (ROM `EXPOSZ += ZVELOC*4`). Reason: F-008 places the `<<2` in the deterministic-core `EXPLDE` loop, and it is a per-config parameter the volcano may retune. It affects absolute height only — the landing FRAME is scale-independent — so no test couples to absolute magnitude.

### Dev (implementation)
- **Height integrates the PRE-gravity-update velocity (ROM instruction order), not the post-update one:** `stepDebris` computes `height += velocity * heightScale` BEFORE `velocity += gravity` each frame — mirroring the ROM's own EXPLDE order (`EXPOSZ += ZVELOC*4` then `ZVELOC += GRAVTY`, per F-008's claim text). RED's contract pseudocode listed the velocity formula first and left the order genuinely ambiguous ("order-independent for velocity; the exact height integration order shifts an apex/landing by at most 1 frame — bands allow it"), but the apex-crossing test (`velocities[apex] <= 0`, `velocities[apex-1] > 0`) only holds under the ROM order for V0=88, GRAVTY=-4: the other order lands the apex one frame early with a still-positive crossing velocity. Verified by hand (closed-form `height_n = (4·v0+8)n - 8n²`) before implementing, not by trial-and-error against the test.
- **`EXPLOSION_DURATION` kept exported, unmigrated, and given a second job (fallback gate):** per the story's flag #1, decided to KEEP the saucer (`saucer.ts:233`) on its own scalar timer — the saucer is a different ROM object (bonus visitor, never the hostile) and F-008 only cites the tank/super-tank EXINIT/EXPLDE routine, so migrating it would be inventing un-cited behavior. Additionally extended `EXPLOSION_DURATION`'s role to a fallback gate for any `Hostile` that reaches the exploding branch of `stepEnemies` with no `debris` field attached: (1) the missile's own contact self-detonation (`stepMissile`, also not cited by F-008 — the finding's claim text is specifically about EXINIT's 6 tank-fragment pieces), and (2) the many pre-bz3-5 test fixtures across the suite (`enemies-aggression.test.ts`, `enemies-spawn-fairness.test.ts`, `enemies-roster.test.ts`) that hand-construct an `exploding` Hostile literal with a bare `phaseAge` and no `debris`, expecting the old immediate-retirement-past-1.5s behavior. Reason: only the actual tank/super-tank kill path (`stepEnemies` section 1, the `justKilled` branch) is what F-008 audits and what AC1 requires; widening the migration to the missile or to hand-built fixtures would be scope creep the story never asked for, and would force touching several other test files.
- **`enemies.test.ts` / `events.test.ts` explosion-duration assertions updated to the new physics band:** the one existing (non-RED) test that kills a tank via the real `playerShell` path and then measures how long it stays exploding hard-coded the OLD ~1.5 s assumption (`Math.abs(explodingSteps * DT - EXPLOSION_DURATION) <= 3*DT`, and a `maxSteps` sized off `EXPLOSION_DURATION`). Once the kill path attaches real debris physics this assertion is definitionally false (actual ~2.8-3.0 s) and the loop's step cap is too small for the physics to ever finish, so the "replacement spawns" assertion would fail on a timeout rather than a wrong duration. Updated the duration check to the new `>2.2 s, <=3.4 s` band (matching `debris.test.ts`'s own band) and widened `maxSteps`/`BLAST_MAX_SECONDS` to 3.6 s + slack in both files. This is not the saucer/missile scope decision above — it's the direct, unavoidable consequence of AC1 for the one path the story targets.
- **Frame conversion: floor-diff on the continuously-accumulated `phaseAge`, not a per-call round:** production calls `stepEnemies` at a fixed 1/60 s sub-step (`src/main.ts`'s `createLoop`, ADR-0001/SH-5), well finer than the ROM's 15.625 Hz game frame (~3.84 sub-steps/frame). `stepDebris` advances exactly one game frame per call, so each `stepEnemies` step computes `floor(phaseAge_before * GAME_FRAME_HZ)` vs `floor(phaseAge_after * GAME_FRAME_HZ)` and steps `stepDebris` that many times (usually 0, occasionally 1). This telescopes exactly (the sum of per-step diffs equals the single floor of the final accumulated age) regardless of float rounding noise on any individual call, so no frame is ever lost or double-counted across the whole burst — verified against both the frame-locked `debris.test.ts` wired-up test (`DT = 1/GAME_FRAME_HZ`, ~1 frame/call) and the 1/60 s-stepped `enemies.test.ts`/`events.test.ts` fixtures.

## TEA Assessment

**Tests Required:** Yes
**Reason:** F-008 is a whole new deterministic-core subsystem (refuter resized m→l), not a constant swap.

**Test Files:**
- `battlezone/tests/core/debris.test.ts` — 17 failing tests for the 6-piece gravity particle subsystem + its wiring into the enemy explosion.

**Tests Written:** 17 tests covering both ACs.
**Status:** RED (committed `547b90e` on `feat/bz3-5-explosion-debris`).

### Verified ROM citations (primary source: `~/Projects/battlezone-source-text`)
- **IZVEL = 55,40,70,88,40,66** — `BZMTNS.MAC:837` `IZVEL:\t.BYTE 55,40,70,88,40` + `:838` `.BYTE 66`. **Decimal**: `.RADIX 10` is active from `:501` through `:838` (next `.RADIX 16` at `:839`). Independent proof of decimal: `88` is not a valid octal digit-string. **Six** values confirmed — the auditor's 5-value quote at :837 missed the 6th byte at :838 (the refuter's catch); EXINIT seeds `IZVEL[0..5]`.
- **GRAVTY = -4/frame** — `BZONE.MAC:380` `GRAVTY\t=-4.` (the trailing `.` forces decimal, same convention as `CENTRY=316.`). Applied once per **game** frame at 15.625 Hz (bz3-1; `BZONE.MAC:1085/:422`).
- **Height integ `EXPOSZ += ZVELOC*4`** (sign-extended `<<2`) — from F-008's `EXPLDE` description; pinned as `heightScale=4`.
- **~3 s lifetime is physics-derived, NOT a constant** — tallest piece V0=88 apexes at ~88/4=22 frames and lands at ~44–46 frames; at 64 ms/frame ≈ 2.8–3.0 s. My simulation (grounded when `velocity<0 && height<=0`): object=43–45 frames, volcano(V0=200)=99–101, V0=88 @ GRAVTY=-8=21–23. Bands in tests absorb integration-order (±1 frame).

### Finding corrections (confirmed against source)
- Refuter's **6th byte `.BYTE 66`**: CONFIRMED at `BZMTNS.MAC:838`. Max is still 88, so the ~3 s estimate is unchanged.
- Refuter's **m→l resize**: correct — this is a full subsystem (6 pieces × {height, velocity, grounded}, per-frame gravity integration, physics termination, plus state threading + shell render), not a table decode.

### Tests + assertions (17, all RED)
1. `OBJECT_EXPLOSION` has exactly 6 launch velocities incl. the 6th `.BYTE 66` → `[55,40,70,88,40,66]`.
2. `OBJECT_EXPLOSION.gravity === -4` and `.heightScale === 4`.
3. `spawnDebris` seeds one airborne piece per velocity: `height 0`, `velocity === IZVEL[i]`, `grounded false`, `done false`.
4. Every airborne piece loses exactly 4 velocity/frame after 1 and 2 steps (GRAVTY, order-independent).
5. Tallest piece (V0=88) arc: strictly rises to an apex at frame 20–24 (velocity zero-crossing), then non-increasing to ≤0 (rise-then-fall).
6. Burst is NOT `done` while some-but-not-all pieces grounded (short pieces land first; the tallest governs); `done` only when all grounded.
7. Lifetime = 40–52 frames → 2.5–3.4 s, `>2.2 s`, and NOT in [1.4,1.6] s (kills the 1.5 s timer).
8. **Wired-up integration:** after a `stepEnemies` kill, the hostile stays `exploding` for `>2.2 s` (≤3.4) before the replacement spawns — currently fails at **1.472 s** (the live 1.5 s constant), the RED proof it is not yet consuming the burst.
9. **Reuse:** arbitrary config `[10,20,30]` → 3 pieces (count is a parameter, not hard-coded 6).
10. **Reuse:** volcano-like `[200]` outlives the object explosion (90–112 frames) — lifetime is emergent physics, not a battlezone constant.
11. **Reuse:** steeper gravity (-8) lands the same V0=88 sooner than -4 (gravity is a real parameter).
12. Determinism: two independent runs deep-equal.
13. `stepDebris` is a non-mutating reducer (input untouched, new object returned).
14–17. Purity: module exists; no DOM/time/randomness tokens; no `as any`/`@ts-ignore`/`as unknown as`; imports only `./` siblings or `@arcade/shared/`.

### Proof RED
- `npx vitest run tests/core/debris.test.ts` → **17 failed / 17**. 16 fail on the clean CONTRACT miss (module `src/core/debris.ts` absent); the wired-up test fails at `explosion lasted 1.472 s: expected 1.472 to be greater than 2.2`.
- Full suite: `17 failed | 875 passed` — no collateral breakage.
- `npx vitest run tests/audit/citations.test.ts` → **12 passed** (gate GREEN).
- `npx tsc --noEmit` → exit 0, clean. (Loader uses a variable import specifier + `/* @vite-ignore */` so tsc defers the missing-module resolution to GREEN.)

### GREEN guidance for Dev — proposed reusable API (`src/core/debris.ts`, pure core)
```ts
export interface DebrisConfig {
  readonly launchVelocities: readonly number[] // one per piece (IZVEL); count === length
  readonly gravity: number                     // per-frame velocity delta (GRAVTY = -4)
  readonly heightScale: number                 // height += velocity*heightScale/frame (EXPOSZ += ZVELOC*4)
  readonly groundHeight?: number               // grounded threshold; default 0
}
export interface DebrisPiece  { readonly height: number; readonly velocity: number; readonly grounded: boolean }
export interface DebrisState  { readonly pieces: readonly DebrisPiece[]; readonly config: DebrisConfig; readonly done: boolean }
export const OBJECT_EXPLOSION: DebrisConfig = // { [55,40,70,88,40,66], gravity:-4, heightScale:4 }
export function spawnDebris(config: DebrisConfig): DebrisState  // height 0, velocity = launchVelocities[i], done false
export function stepDebris(state: DebrisState): DebrisState     // advance ONE game frame; pure reducer
```
Per-frame semantics (velocity is order-independent; height order shifts apex/landing ≤1 frame — bands allow it):
`velocity += gravity` (so `velocity === v0 - 4n` while airborne); `height += velocity * heightScale`.
Grounded predicate: `velocity <= 0 && height <= (groundHeight ?? 0)` (a fresh piece with v0>0 is airborne). `done` = all grounded.

- **Where it plugs in:** replace the scalar `EXPLOSION_DURATION` gate in `enemies.ts` (currently `enemies.ts:751`, `age >= EXPLOSION_DURATION → spawnReplacement()`). Carry a `DebrisState | null` (or the burst on the `Hostile`) that is spawned at the kill, `stepDebris`'d each game frame, and the replacement spawns when `burst.done`. Convert elapsed `dt` → whole game frames via `GAME_FRAME_HZ` (bz3-1) so the ROM's integer per-frame arithmetic stays exact rather than float-scaling by dt. The exploding-phase branch already freezes x/z — good.
- **State threading:** thread the debris state through `EnemyState` (and `cloneState`/`sim.ts`) the way `shell`/`phaseAge` are. Keep it a primitive-or-frozen shape so the existing purity/readonly suites stay green. NB: `enemies.test.ts` still asserts `EXPLOSION_DURATION` is exported (CONTRACT + the "≤10s" behavioral test) and `saucer.ts` imports it — see the two Delivery Findings above; decide keep-vs-migrate deliberately, don't let either break silently.
- **Core/shell split:** `debris.ts` owns ONLY the pure physics (height/velocity/grounded). The flying/spinning/falling fragment is drawn in `shell/` from each piece's `height`/`velocity`, reusing the `models.ts` "Explosion Debris" ($0e) shape. XY drift (`EXPTBX`/`EXPTBY`, `BZMTNS.MAC:833/835`) and per-piece orientation spin (PRAND) are ROM-faithful extras NOT pinned by these tests — add them in core (deterministic, seed-driven) or defer to a render pass; either keeps RED green.
- **bz3-6 handshake:** the volcano defines its own `DebrisConfig` (its own launch velocities / gravity / count) and drives the SAME `spawnDebris`/`stepDebris`. Do not special-case battlezone constants inside the engine — the reuse tests (#9–11) fail if count/gravity/velocities are hard-coded.
- **Citations:** when you set `remediated_by` on F-008, re-anchor its `ours` (the `EXPLOSION_DURATION` line will move) and extend `source` to :837-838; then re-run `npm test -- citations`. Do NOT edit any other cited file's comments or you shift pinned lines (known trap).

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/debris.ts` (new) — the reusable pure particle engine: `DebrisConfig`/`DebrisPiece`/`DebrisState`, `OBJECT_EXPLOSION` preset (IZVEL `[55,40,70,88,40,66]`, `gravity: -4`, `heightScale: 4`), `spawnDebris(config)`, `stepDebris(state)`. Height integrates the ROM's own instruction order (pre-gravity-update velocity first, then gravity) — see Design Deviations.
- `battlezone/src/core/enemies.ts` — imports `debris.ts`; `Hostile.debris?: DebrisState` (optional — absent means "no physics, use the scalar fallback"); the tank/super-tank kill (section 1 of `stepEnemies`) now attaches `spawnDebris(OBJECT_EXPLOSION)`; the exploding-retirement branch (section 3) steps the burst forward by whole game frames (floor-diff accumulator on `phaseAge`, converting the shell's fixed 1/60 s sub-step to the ROM's 15.625 Hz frame) and spawns the replacement on `burst.done` instead of `age >= EXPLOSION_DURATION`; `EXPLOSION_DURATION` stays exported with an expanded doc comment covering its two remaining consumers (saucer, missile/legacy-fixture fallback).
- `battlezone/tests/core/enemies.test.ts` — updated the one pre-existing (non-RED) test that kills a tank via the real `playerShell` path and measures explosion length: new ~2.8-3.0 s physics band (`>2.2s, <=3.4s`) and a wider `maxSteps`, replacing the old `EXPLOSION_DURATION`-derived ~1.5 s assertion it's no longer possible to satisfy.
- `battlezone/tests/core/events.test.ts` — same fix for its two `hostile-spawn` tests: replaced the `EXPLOSION_DURATION`-derived `maxSteps` (too small for the new ~2.9 s physics duration — the loop would time out before the replacement ever spawned) with a `BLAST_MAX_SECONDS = 3.6` constant; dropped the now-unused `EXPLOSION_DURATION` import (`noUnusedLocals`).
- `battlezone/docs/audit/findings/pair-cadence.json`, `pair-combat.json`, `pair-enemy-ai.json`, `pair-missile-saucer.json` — re-anchored every non-remediated `ours` citation into `enemies.ts` whose line number shifted under the new code (C-007, F-005, E-001, E-003, E-005, E-012, R-006, R-007, R-009, R-010, R-011 — verbatim text unchanged, only `line` updated). Set `remediated_by: "bz3-5"` on F-008 only, keeping its historical `ours.line`/`verbatim` re-anchored-but-unchanged-text and `source.*` completely untouched, per the citation tool's own "frozen historical citation" design (`tools/audit/check-citations.mjs` skips the `lineAt` verification entirely once `remediated_by` is set). Left E-010 (already `remediated_by: "bz3-3"`) untouched — its citation is intentionally frozen from a prior story and not this story's to re-anchor.

**EXPLOSION_DURATION keep-vs-migrate decision:** KEPT, not migrated. `saucer.ts`'s own visitor blast stays on the scalar timer (different ROM object, not audited by F-008). Additionally used as a fallback for any `Hostile` that reaches the exploding branch with no `debris` — the missile's own contact self-detonation (`stepMissile`) and the many pre-bz3-5 test fixtures across the suite that hand-construct an `exploding` Hostile literal directly. Only the actual tank/super-tank kill path gets real debris physics.

**Tests:** 896/896 passing (GREEN). Citations: 12/12. `tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: clean.

**Branch:** `feat/bz3-5-explosion-debris` (pushed). Commit `212ac2d`.

**For the Reviewer to scrutinize:**
- The reusable API surface bz3-6 depends on (`DebrisConfig`/`DebrisPiece`/`DebrisState`/`spawnDebris`/`stepDebris` in `debris.ts`) — confirm no battlezone-specific constant leaked in beyond the `OBJECT_EXPLOSION` preset.
- The height-integration order choice (pre-gravity velocity, ROM instruction order) — see the Design Deviation with the closed-form derivation; worth an independent check against the apex-crossing test if in doubt.
- The floor-diff frame accumulator in `enemies.ts`'s exploding branch — telescoping correctness across the shell's fixed 1/60 s sub-step vs the ROM's 15.625 Hz frame.
- The `EXPLOSION_DURATION` fallback path (undocumented behavior fork inside `enemies.ts` — legacy hand-built `Hostile` fixtures behave differently from the real kill path) — this is a Dev judgment call, not something the tests forced verbatim.
- The three pre-existing test files edited outside `debris.test.ts` (`enemies.test.ts`, `events.test.ts`) — confirm the updated bands/margins are honest widenings of the physics-driven duration, not loosened to paper over a bug.

**Handoff:** To Reviewer.

## Reviewer Assessment

**Verdict:** APPROVED

**Verified independently (my own runs, not trusting the handoff):**
- Full suite `npx vitest run` → **896 passed / 896**, 0 failed.
- `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0; `npm run build` → clean.
- `npm test -- citations` → **12 passed / 12**.

**ROM fidelity (primary source `~/Projects/battlezone-source-text`, cited files):**
- **IZVEL = [55,40,70,88,40,66]** — `BZMTNS.MAC:837` `IZVEL:\t.BYTE 55,40,70,88,40` + `:838` `.BYTE 66`. Confirmed the `.RADIX 10` block bounds: radix flips to `.RADIX 16` at `:839`, so all six bytes are DECIMAL. The 6th byte (`.BYTE 66` at :838) is present. Matches `OBJECT_EXPLOSION.launchVelocities` byte-for-byte.
- **GRAVTY = -4** — `BZONE.MAC:380` `GRAVTY\t=-4.` (trailing `.` forces decimal in the file's `.RADIX 16`, same as `CENTRY=316.` above it). Matches `gravity: -4`.
- **heightScale = 4 / integration order** — checked the actual `EXPLDE` routine (`BZONE.MAC:1756-1800`): `EXPOSZ += ZVELOC*4` (`:1788-1794`) executes BEFORE `ZVELOC += GRAVTY` (`:1795-1800`). Julia's `stepDebris` uses exactly this order (`height += velocity*heightScale` THEN `velocity += gravity`) — ROM-faithful. The apex test genuinely discriminates it: under the reversed order the height-apex lands at frame 21 where velocity is still +4, failing `velocities[apex] <= 0`; the ROM order puts apex at frame 22 with velocity 0. Design Deviation is correct.
- **~3 s lifetime is physics-derived, not re-hardcoded** — closed-form `height_N = 8N(45-N)` for V0=88; grounded (`v<=0 && h<=0`) at exactly N=45. Independently ran the engine: lands at **frame 45 = 2.8800 s**. Within all test bands (40-52 frames, 2.5-3.4 s), not near 1.5 s.

**Frame accumulator determinism:** independently simulated the floor-diff accumulator at the production `dt=1/60`: total `stepDebris` calls telescope to **exactly `floor(doneAt*HZ)=45`**, retirement at 2.8833 s — no frame lost or double-counted (per-call float noise self-corrects because `priorFrames` of the next call is this call's `nowFrames`). `dt=0` never advances or retires (frozen-blast invariant preserved). `stepDebris` is a pure, non-mutating, deterministic reducer (two runs deep-equal).

**Reusable API — bz3-6 UNBLOCKED:** `debris.ts` is genuinely parameterized; the ONLY battlezone constant is the `OBJECT_EXPLOSION` preset (a passed-in config), nothing is baked into `spawnDebris`/`stepDebris`. Reuse tests prove count, gravity, and velocities are real parameters (arbitrary `[10,20,30]`→3 pieces; volcano `[200]`→90-112 frames; gravity `-8` lands sooner than `-4`). The volcano can drive the SAME reducer with its own `DebrisConfig` without touching the engine. Two caveats handed to bz3-6 (Delivery Findings): validate its config (the engine has no non-termination/empty-array/non-finite-dt guard — all unreachable here) and decide whether it needs the ROM `EXPLDE` terminal-velocity clamp (~-124, `BZONE.MAC:1795-1798`) that this engine omits (immaterial for V0=88, matters for large volcano velocities). Both are clean config-extensions, NOT forks.

**Partial-migration verdict (EXPLOSION_DURATION):** FAITHFUL to F-008's scope. F-008 audits only the tank/super-tank `EXINIT`/`EXPLDE` object-explosion routine, and only that kill path gets debris physics. The saucer (`saucer.ts:233`) is a different ROM object (bonus visitor, never the hostile) — leaving it on its own scalar timer invents no un-cited behavior; the ROM has no reason to share the tank's IZVEL sim with the saucer. The missile self-detonation and hand-built test fixtures likewise fall back to the scalar gate. The fallback is NOT a silent-failure risk in this story: every real object kill (the only alive→exploding transition, `enemies.ts:600-613`) always attaches `debris`, and I traced every `Hostile` construction site + `sim.ts` — no `cloneState`/serialize path exists to drop the field. (Latent robustness note L3 filed for a future refactor.)

**Re-baselined tests (enemies.test.ts, events.test.ts):** both genuinely pinned the OLD ~1.5 s timer and are honestly widened, mutation-confirmed. `enemies.test.ts`'s deleted `expect(Math.abs(explodingSteps*DT - EXPLOSION_DURATION)) <= 3*DT` was a tight ±0.05 s pin on the old constant; reverting the impl to the no-debris path yields 1.517 s, which FAILS the new `>2.2 s` floor — the band still catches the exact regression it guards. Its real invariants (never-empty slot, no-gap replacement, kill never re-awarded, fresh legal replacement) are untouched. `events.test.ts` only used `EXPLOSION_DURATION` as a loop cap (never an assertion), so bumping it to `BLAST_MAX_SECONDS=3.6` neuters nothing — "hostile-spawn emitted exactly once" is intact. No assertion deleted, no coverage lost.

**Citation honesty:** `remediated_by: "bz3-5"` set on F-008 ONLY; its historical `ours`/`source`/`verbatim` frozen per the tool's frozen-citation design. Re-anchors are line-number-only — I verified each shifted `ours.line` (11 citations across 4 finding files) resolves to its exact verbatim text in the new `enemies.ts`. Gate is genuinely 12/12. Note (L2): F-008's `source` was NOT extended to `:837-838` as TEA's Question suggested — it stays frozen at `:837`'s 5 bytes — but the 6th byte is fully documented in the finding's `refuter_correction` and the shipped code carries all six, so the audit record is accurate; non-defect.

**Deviation audit:** all six Design Deviations (TEA: height-0 grounded threshold, heightScale-in-core; Dev: ROM integration order, EXPLOSION_DURATION kept+fallback, test re-baselining, floor-diff accumulator) — **ACCEPTED** with rationale above. The EXPLOSION_DURATION fallback and the terminal-velocity omission are FLAGGED FORWARD to bz3-6 as Delivery Findings, not blocking bz3-5.

**Findings by severity:**
| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| — | No Critical/High findings | — | — |
| [MEDIUM] | Reusable engine has no config/dt validation (non-termination, empty array, non-finite dt) | `debris.ts`, `enemies.ts:804` | Non-blocking — unreachable in bz3-5; handed to bz3-6 (Delivery Findings) |
| [LOW] | ROM `EXPLDE` terminal-velocity clamp (~-124) omitted | `debris.ts` | Non-blocking — immaterial for V0=88; heads-up for bz3-6 large velocities |
| [LOW] | F-008 `source` not extended to `:838` | `pair-combat.json` | Non-blocking — 6th byte documented in `refuter_correction`; record accurate |
| [LOW] | `Hostile.debris` optional, no guard the kill site sets it | `enemies.ts:128` | Non-blocking — threaded correctly today; future-refactor note |
| [LOW] | redundant `existsSync` test | `debris.test.ts:369` | Non-blocking — harmless redundancy |

**Data flow traced:** player shell → `stepEnemies` kill (`enemies.ts:596-613`) attaches `spawnDebris(OBJECT_EXPLOSION)` → carried on `Hostile.debris` while exploding → `sim.ts` passes `enemyStep.state` through unchanged (respawn-reset gated on `phase==='alive'`) → exploding branch steps the burst by whole game frames and retires on `burst.done`. Safe: every real kill populates debris; no path drops it.

**Handoff:** To SM for finish-story. No rework required.
