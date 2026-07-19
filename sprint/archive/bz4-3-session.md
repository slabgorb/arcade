---
story_id: "bz4-3"
jira_key: "bz4-3"
epic: "bz4"
workflow: "tdd"
---
# Story bz4-3: Enemy tank animation fidelity — movement-tied tread counter and absolute antenna orientation

## Story Details
- **ID:** bz4-3
- **Jira Key:** bz4-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-19T17:01:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T17:01:06Z | - | - |

## Delivery Findings

### RED phase (TEA) — bz4-3

**Test files**
- `battlezone/tests/core/enemy-tread-counter.test.ts` (NEW) — AC-1, movement-tied tread counter via `stepEnemies`.
- `battlezone/tests/core/enemy-tank-detail.test.ts` (added a `bz4-3 AC-2` describe block) — AC-2, absolute/world-frame antenna via `enemyTankSegments`.

**AC-1 assertions (one per line)**
- ADVANCES (INC) while the tank drives forward — charging tank 20k out closes the gap; `treadOf(after) > seed`. *(BZONE.MAC:2669)*
- FREEZES while stationary — tank inside standoff (500 < ~1280), aligned; commands zero translation (guard: `after.x/z === start.x/z`); `treadOf(after) === seed` (defined, unchanged — the discriminator vs bz3-12's free-running `frameCount`). *(BZONE.MAC:2669 MTAB — pivot/M.STOP paths never touch TRDCTR)*
- RUNS BACKWARD (DEC) while reversing — `reversing: 3.0`, goal aligned to heading; guard: backs away from player; `treadOf(after) < seed`. *(BZONE.MAC:2673)*
- PER-HOSTILE — a mover and a holder stepped the SAME frame budget get DIFFERENT counters (a shared clock would tie them; ROM `ZX,TRDCTR` is object-indexed).

**AC-2 assertions (one per line)**
- Antenna sits at ABSOLUTE `radarSpin(FC)` even when the body is yawed 90° — `isSuperset(enemy(π/2), projectModel(RADAR_ANTENNA, {orientation: radarSpin(FC)}))`. RED: current code projects at `π/2 + radarSpin(FC)`. *(BZONE.MAC:1561-1562)*
- Rotating ONLY the body does not carry the antenna — isolated antenna (`full − hull`, hull = body+tread, both hull-relative) is IDENTICAL at body-heading 0 vs π/2. RED: current dish rotates with the hull.
- GREEN precondition: isolated antenna at heading 0 equals the absolute-angle projection (proves the isolation is the 10-edge dish, not a degenerate set).
- GREEN guard: at a yawed body, changing `frameCount` still moves the antenna (absolute ≠ frozen — blocks a "drop the spin" false fix).

**ROM citations verified** (against `/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC` — the only extant copy; `battlezone/reference/` and `~/Downloads/va-battlezone` have no BZONE.MAC):
- `BZONE.MAC:2669` = `INC ZX,TRDCTR` under `M.F: JSR M.FOR ;FORWARD` — INC on forward. `ZX,` = per-object index → per-hostile.
- `BZONE.MAC:2673` = `DEC ZX,TRDCTR` under `M.R: JSR M.REV ;REVERSE` — DEC on reverse. MTAB (`:2651`) routes M.FF/M.LTF/M.RTF→M.F (INC), M.FR/M.LTR/M.RTR→M.R (DEC); M.PL/M.PR (pivot) and M.STOP touch TRDCTR → stationary freezes.
- `BZONE.MAC:1561-1562` = `LDA RANGLE` / `STA AY,PTBLO2+1 ;ORIENTATION` — dish orientation = RANGLE ABSOLUTE (the following `LDA TANGLE / SBC TANGLE+2 / STA NTHETA` is a SEPARATE quantity, not applied to the dish). RANGLE spins +$0B/frame at `:2947-2949` (bz3-12-confirmed).

**Red-proof** (`npx vitest run`): 6 failed / 1049 passed / 72 files. AC-1 x4 fail on `expected undefined to be type of 'number'` (movement guards pass FIRST → the tank genuinely moved/held; failure is "no movement-tied counter"). AC-2 x2 fail on absolute-vs-body-relative (superset false; isolated 10-edge dish differs between headings). The 2 AC-2 green tests confirm the reference/isolation. `tsc --noEmit` clean. Baseline 1047 → 1049 passing (only the 2 intended green guards added; zero pre-existing regressions).

**Flipped tests:** NONE. Inspected every bz3-12 assertion — none pins the free-running / body-relative behavior: bz3-12 tested the PURE `treadFrame`/`radarSpin` functions with EXPLICIT counters (deliberately leaving the counter SOURCE unpinned — its own Design Deviation) and only ever used body-heading 0 for the antenna (where absolute ≡ body-relative). So bz4-3 is purely ADDITIVE; no in-place flip was required. `treadFrame(-1) === treadFrame(3)` already supports the reversing (negative) counter this story feeds it.

### RED phase (TEA) — bz4-3 cadence guard (Reviewer MEDIUM fast-follow)

**New test** (`battlezone/tests/core/enemy-tread-counter.test.ts`, new `describe` — `bz4-3 AC-1 cadence — moving tread is on the GAME-FRAME clock (Reviewer MEDIUM)`):
- `advances by the game-frame count (== frameCount delta), NOT the 60 Hz sub-step count` — drives a locked charging tank (20k out, aligned, `phaseAge: 0` so it stays UNDER `SPAWN_FIRE_GRACE` → never fires → no player-hit/respawn to reset the clock) forward through the PUBLIC sim entry (`initGame` → `stepGame`, mode `playing`) for `SUBSTEPS = 60` fixed 1/60 s sub-steps = **15 whole 15.625 Hz game frames**.

**The assertion (pins the cadence, not routing):** `expect(treadDelta).toBe(frameDelta)` — the moving `hostile.treadCounter` delta must equal the `game.frameCount` delta over the SAME interval, i.e. the tread rides the 15.625 Hz game-frame clock `frameCount` uses (bz3-12's tread source), not the 60 Hz sub-step. Guards prove it's a clean forward-only window before the pin: numeric counter, `phase === 'alive'` (never killed), `lives` unchanged (never fired → no respawn), distance strictly decreased (genuinely drove forward), and `frameDelta > 1` with `SUBSTEPS ≥ 3·frameDelta` (game-frame and sub-step are materially different clocks here, so the pin is a real discriminator).

**Red-proof** (`npx vitest run`): the new test FAILS `expected 60 to be 15 // Object.is equality` — **observed treadDelta 60 (per-sub-step, ~4×), expected 15 (per-game-frame)**. The failure lands on the final PIN (`enemy-tread-counter.test.ts:255`), NOT any guard — so all guards passed (forward-only, alive, no fire, 15 game frames elapsed): the failure reason is precisely the ~4× cadence drift, not a vacuous "no counter". Full suite `1 failed | 1055 passed (72 files)` — the 4 existing sign-only tests stay GREEN, zero pre-existing regressions (baseline 1055 → 1055 + 1 new RED). `tsc --noEmit` clean.

**Game-frame cadence pinned to:** the `state.frameCount` delta measured over the same interval (frameCount ticks once per 15.625 Hz / 64 ms game frame in `advanceRadar`, sim.ts:336-343 / C-001 warning :316-320) — a `frameCount`-delta match, not a hard-coded K, so the counter is provably on the game-frame clock rather than a chosen constant.

### GREEN phase (Dev) — bz4-3 cadence fix

**File:** `battlezone/src/core/enemies.ts`, `stepEnemies` alive-tank branch (~line 790).

**Fix:** replaced the per-`stepEnemies`-call ±1 step with a whole-game-frames floor-diff on `phaseAge` — the same fixed-rate-from-a-finer-clock idiom already used for debris (`enemies.ts:842-843`) and the volcano (`sim.ts:370-372`). `phaseAge` accumulates `+dt` per alive call and seeds 0 at spawn, so summed across the 60 Hz sub-steps the floor-diff telescopes to exactly the `frameCount` delta (both ride the 15.625 Hz clock). Taken from the PRE-increment `phaseAge` so it matches `frameCount` frame-for-frame. Sign is still gated on `netTread`; magnitude is now byte-exact game-frame cadence.

**Before (per sub-step ±1 → ~4× drift):**
```ts
const netTread = input.leftTread + input.rightTread
const prevTread = hostile.treadCounter ?? 0
const treadCounter =
  netTread > 1e-6 ? prevTread + 1 : netTread < -1e-6 ? prevTread - 1 : prevTread
```

**After (whole game frames this step):**
```ts
const wholeFrames =
  Math.floor((hostile.phaseAge + dt) * GAME_FRAME_HZ) -
  Math.floor(hostile.phaseAge * GAME_FRAME_HZ)
const netTread = input.leftTread + input.rightTread
const prevTread = hostile.treadCounter ?? 0
const treadCounter =
  netTread > 1e-6
    ? prevTread + wholeFrames
    : netTread < -1e-6
      ? prevTread - wholeFrames
      : prevTread
```

**Build:** `npm run build` (tsc --noEmit && vite build) — clean, 0 errors.

**Suite:** `npm test` → **1056 passed / 1056 (72 files)**, zero regressions (baseline 1055 + this cadence test now GREEN). All 5 tread tests pass: 4 sign-only (INC forward / freeze still / DEC reverse / per-hostile) stay green under the floor-diff, and the cadence pin `treadDelta === frameDelta` now holds (was `60 !== 15`). Audit citations clean (`tools/audit/check-citations.mjs` exit 0 — no anchor drift, no reanchor needed).

**Expected Dev (GREEN) fix — floor-diff gate:** in `stepEnemies`' alive-tank branch (`enemies.ts:790-793`), stop stepping `treadCounter` ±1 per call. Instead gate the ±1 on whole game frames via the running-total floor-diff idiom already used 50 lines away for debris (`enemies.ts:842-843`) and for the volcano (`sim.ts:370-372`): `whole = Math.floor((hostile.phaseAge + dt) * GAME_FRAME_HZ) - Math.floor(hostile.phaseAge * GAME_FRAME_HZ)`, then `treadCounter = netTread > eps ? prev + whole : netTread < -eps ? prev - whole : prev`. (`phaseAge` already accumulates `+dt` per alive call at :813 and starts 0 at spawn, so the floor-diff matches `frameCount` exactly.) The sign-only tests stay green — over 15 sub-steps at `phaseAge` 5 the floor-diff still yields +4/−4/0, preserving INC/freeze/DEC and per-hostile divergence.

### GREEN phase (Dev) — bz4-3

**Files changed**
- `battlezone/src/core/enemies.ts` — added `Hostile.treadCounter?: number` (optional, `?? 0` idiom); seed `0` in `spawnHostile`; step it once per `stepEnemies` call in the alive-tank branch off the commanded drive; thread it through every `Hostile` rebuild (section-1 kill→exploding, both `stepMissile` returns, alive-tank rebuild, both exploding-branch rebuilds). `initEnemies` inherits the seed via `spawnHostile`.
- `battlezone/src/core/scene.ts` — `enemyTankSegments`: dropped the `placement.orientation +` term so `antennaPlacement.orientation = radarSpin(anim.frameCount)` (world-absolute); updated the stale doc comment.
- `battlezone/src/main.ts` — wired `treadCounter: hostile.treadCounter ?? 0` in place of `game.frameCount`; refreshed the surrounding comment.
- `battlezone/docs/audit/findings/{pair-cadence,pair-combat,pair-enemy-ai,pair-missile-saucer}.json` — 12 `"line"` anchors re-anchored (line drift from the inserted lines; `tools/audit/reanchor-citations.mjs --write` reported 12 MOVED / 0 LOST — no cited text changed). Re-serialized the three 4-space files back to 4-space so the diff is exactly the 12 `"line"` values, nothing else.

**How each AC is satisfied**
- **AC-1 (movement-tied tread counter):** in the alive-tank branch, `netTread = input.leftTread + input.rightTread` (= 2·`forwardFraction`, since the yaw components cancel) is the ROM movement-dispatch sign: `> 1e-6` ⇒ commanded forward ⇒ INC (M.FOR → `INC ZX,TRDCTR`, BZONE.MAC:2669); `< -1e-6` ⇒ commanded reverse ⇒ DEC (M.REV → `DEC`, :2673); `≈ 0` (pivot / holding the standoff) ⇒ frozen. Stepped ±1 per `stepEnemies` call (sign pinned, magnitude out of scope). Derived from the COMMAND (`input`), not achieved displacement, so a blocked advance still rolls the tread this frame (ROM: the INC follows `JSR M.FOR` unconditionally) and HitSomething's reverse only affects the next frame. Threaded through every `Hostile` rebuild so it survives explode/missile/spawn. `main.ts` now feeds it to `scene.treadFrame`.
- **AC-2 (absolute antenna):** the dish placement orientation is `radarSpin(anim.frameCount)` alone — world-absolute (`LDA RANGLE / STA …ORIENTATION`, BZONE.MAC:1561-1562), decoupled from the hull heading. `radarSpin`/`RADAR_ANGLE_STEP` untouched, so the spin still animates (the GREEN guard test).

**Build + suite:** `npm run build` (tsc --noEmit + vite build) clean; `npm test` = **1055 passed / 0 failed / 72 files** (baseline 1049 + the 6 now-green target tests). Target files: `enemy-tread-counter.test.ts` + `enemy-tank-detail.test.ts` = 33/33. Core-purity sweep green (no `Math.random`/`Date.now`/`as any` added).

**Deviations from TEA's map:** none material. Movement sign taken from `input` (`netTread`, reusing the same quantity the existing `advancing` guard uses) rather than a separate `moved`-vs-prior comparison — cleaner and avoids a non-negative-distance sign ambiguity; both were offered by TEA. Missile rebuilds also carry `treadCounter` forward (per the map's "thread through every rebuild incl. missile") even though missiles render no treads — keeps the field from silently dropping.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Tread-counter home = `Hostile.treadCounter`, stepped in `stepEnemies`; tests read via cast.** Spec said "thread a per-hostile movement-derived counter through Hostile/EnemyState/sim". Tests pin the counter as a numeric field on the `Hostile` produced by `stepEnemies`, read through a `treadOf` cast (and seeded via a `withTread` cast) so RED typechecks before the field exists. Reason: `stepEnemies` already computes the tank's moved position + forward/reverse sign; this is the pure-core seam, and the cast keeps `tsc --noEmit` green without pre-committing the field name.
- **Pinned the SIGN of the counter delta + freeze, NOT the exact per-frame magnitude.** Spec/ROM INC/DEC by ±1 per game frame. Tests assert only INC (`> seed`), FREEZE (`=== seed`), DEC (`< seed`), and per-hostile divergence. Reason: the story states rate/period are already byte-exact and out of scope; pinning magnitude would over-constrain Dev's cadence choice (per-frame vs per-substep) and couple to the 60 Hz-vs-15.625 Hz seam bz3-12 flagged.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Two ROM-fidelity refinements to bz3-12's shipped animation, both with a clean behavioral discriminator: (AC-1) the tread counter must be movement-tied (INC fwd / freeze still / DEC rev, per-hostile) rather than the free-running `frameCount`; (AC-2) the antenna angle must be world-absolute rather than `body_heading + RANGLE`. Not a chore.

**Test Files:**
- `battlezone/tests/core/enemy-tread-counter.test.ts` (NEW) — AC-1, 4 tests via `stepEnemies`.
- `battlezone/tests/core/enemy-tank-detail.test.ts` (added `bz4-3 AC-2` describe block, +4 tests) — AC-2 via `enemyTankSegments`.

**Tests Written:** 8 tests across 2 ACs (6 RED + 2 green precondition/guard).
**Status:** RED — full suite 6 failed / 1049 passed / 72 files; `tsc --noEmit` clean; zero pre-existing regressions (baseline 1047 → 1049, only the 2 intended green guards added).

**Flipped tests:** None — bz3-12 left the tread-counter SOURCE unpinned and only tested the antenna at heading 0; bz4-3 is purely additive.

**Handoff:** To Dev (Julia) for GREEN.

### RED → GREEN guidance (for Dev)
- **AC-1 tread counter (core sim):** add `Hostile.treadCounter?: number` (state.ts/enemies.ts), seeded 0 at spawn (`spawnHostile`/`initEnemies`), stepped inside `stepEnemies`' alive-tank branch off the tank's own forward/reverse motion — INC when it advances (net-forward treads / position gained along heading), hold when stationary, DEC when reversing (`reversing > 0` / net-reverse). Thread it through EVERY `Hostile` rebuild (alive, exploding, spawn-replacement). Then rewire `main.ts:228` from `treadCounter: game.frameCount` to `treadCounter: hostile.treadCounter`. `aiDrive`'s `forwardFraction` sign (or `moved` vs prior position) is the ready-made forward/reverse discriminator. The pure `treadFrame(c) = TREAD_FRAMES[3-(c&3)]` already wraps negative (reversing) counters — do NOT touch it.
- **AC-2 absolute antenna (scene.ts):** in `enemyTankSegments`, drop the `placement.orientation +` term from `antennaPlacement.orientation` so it is `radarSpin(anim.frameCount)` alone (world-absolute, BZONE.MAC:1561-1562). One-line change; `radarSpin`/`RADAR_ANGLE_STEP` are unchanged.

## Reviewer Assessment

**Verdict:** APPROVED

Tags: [RULE] core-purity clean · [TEST] AC-1/AC-2 suites genuine & non-vacuous · [SEC] n/a (pure deterministic core, no I/O)

Both ACs are genuinely met and the ROM citations are verbatim-accurate against `/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC`. One MEDIUM fidelity finding (tread cadence regressed to the 60 Hz sub-step) is **non-blocking** because TEA explicitly descoped tread magnitude/cadence in the accepted test contract — routed to Delivery Findings for a fast-follow.

**Data flow traced:** player drive → `stepEnemies` `aiDrive` → `input.leftTread+input.rightTread` (`netTread` = 2·forwardFraction, yaw cancels) → sign gate INC/DEC/freeze → `hostile.treadCounter` → threaded through every `Hostile` rebuild → `main.ts:231` `hostile.treadCounter ?? 0` → `scene.treadFrame`. Safe: pure, deterministic, no null deref (`?? 0` at every read).

**Pattern observed:** movement SIGN taken from the COMMAND (`input`), not achieved displacement — faithful to ROM, where `INC ZX,TRDCTR` (BZONE.MAC:2669) follows `JSR M.FOR` BEFORE the `OBJOBJ`/`BAKOUT` collision check (:2674-2676), so a blocked advance still rolls the tread that frame.

**Error handling:** `treadCounter?` optional with `?? 0` at all 3 read sites (enemies.ts:791, main.ts:231, and the spread in sim.ts:254); every one of the 7 `Hostile` rebuild sites carries the field forward; no path can silently render 0.

### ROM fidelity — VERIFIED (primary source, BZONE.MAC)
| Claim | Cited | Source line (verbatim) | Verdict |
|-------|-------|------------------------|---------|
| Forward → INC | :2669 | `M.F: JSR M.FOR` (:2668) / `INC ZX,TRDCTR` (:2669) | ✅ |
| Reverse → DEC | :2673 | `M.R: JSR M.REV` (:2672) / `DEC ZX,TRDCTR` (:2673) | ✅ |
| Pivot/STOP freeze | :2651 MTAB | `M.PL`/`M.PR` → `JMP M.6$` (never touch TRDCTR); `M.STOP` = no-op; all fwd variants→M.F, all rev→M.R | ✅ |
| Per-object counter | `ZX,` index | `INC ZX,TRDCTR` is object-register-indexed | ✅ |
| Antenna absolute | :1561-1562 | `LDA RANGLE` / `STA AY,PTBLO2+1 ;ORIENTATION` | ✅ |
| RANGLE ≠ body angle | :1563-1566 | `LDA TANGLE / SEC / SBC TANGLE+2 / STA NTHETA` is a SEPARATE quantity (→ `JSR COS` for radar CENTER at :1567), not applied to orientation | ✅ |
| RANGLE spins +$0B/frame | :2947-2949 | `LDA RANGLE / ADC I,0B / STA RANGLE` | ✅ |

The `netTread` sign model is an exact behavioral match to the MTAB dispatch: forward-family → INC, reverse-family → DEC, pivot/stop → untouched.

### Findings

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM] | **Tread cadence regression — ~4× too fast while moving.** `treadCounter` steps ±1 per `stepEnemies` call, and `stepGame`→`stepEnemies` runs every 1/60 s sub-step (main.ts:17). bz3-12 drove treads off `game.frameCount`, which increments ONLY at 15.625 Hz inside `advanceRadar` (sim.ts:336-343). So the *moving* tread now cycles at 60/4=15 Hz vs the ROM/bz3-12 byte-exact 15.625/4≈3.9 Hz. This is the exact "C-001 trap" sim.ts:316-320 warns against, and the ÷N-cadence class from project memory (asteroids ÷4, red-baron ÷6). The story premise "Rate and period are already byte-exact" is now false for the moving case. | `enemies.ts:790-793` | **NON-BLOCKING:** TEA explicitly authorized "INC/DEC per game-frame OR per sub-step (cadence out of scope)" in the accepted contract, so Dev complied. Root cause is an over-loose TEA descope vs the "rate byte-exact" premise. Fast-follow: gate the ±1 on the same 15.625 Hz boundary `frameCount` uses (or floor-diff on `phaseAge`, the idiom already used 50 lines away for debris at enemies.ts:842-845). The FREEZE (stationary) behavior is a genuine, correct improvement regardless. |
| [LOW] | Missile rebuilds carry `treadCounter` though missiles render no treads (both `stepMissile` returns). | `enemies.ts:549,557` | Intentional (Dev deviation) — keeps the field from silently dropping; harmless. Verified, no action. |

### Verified good (observations)
1. **Rebuild survival — ALL 7 sites carry `treadCounter`** (the relocated-field trap): `spawnHostile`:448 (=0), section-1 kill→exploding:629, alive-tank rebuild:818 (computed), exploding+debris:856, exploding no-debris:870, both `stepMissile`:549/557. Plus the out-of-enemies.ts respawn-grace rebuild `sim.ts:254` carries it via `...survivor.hostile` spread. No path drops it.
2. **AC-1 tests genuine & non-vacuous:** FREEZE seeds `SEED_COUNT=5` and asserts `c===5` (not `===0`) with an exact `after.x===start.x` no-op guard — the real bz3-12 discriminator; ADVANCES/REVERSE guard actual distance change before the sign check; PER-HOSTILE pins divergence vs a shared clock. No implementation coupling (reads via cast).
3. **AC-2 tests pin the real world-angle, not routing:** isolated antenna (`full − hull`) identical across body headings 0 vs π/2, superset-match to the absolute `radarSpin(FC)` projection, plus a precondition proving the isolation is the true 10-edge dish and a guard that the spin still animates at a yawed body. Exactly the coordinate-pinning the renderer-migration memory prescribes.
4. **Audit reanchor is pure line-drift:** git diff shows ONLY 12 `"line":` field changes (zero cited-text change); `reanchor-citations.mjs` dry-run = "115 already correct, 0 re-anchored, 0 lost" — no citation laundering.
5. **Core purity clean** (no `Math.random`/`Date.now`/`as any`/`as unknown` in enemies.ts/scene.ts); antenna decouple dropped ONLY the body-heading term (`radarSpin(frameCount)` and `main.ts` `frameCount` feed preserved → still spins).

**Deviation audit:** TEA's two Design Deviations (counter home = `Hostile.treadCounter` read via cast; SIGN-only pinning) — both ACCEPTED. Dev's deviation (sign from `input`/`netTread` vs a prior-position `moved` compare) — ACCEPTED, cleaner and faithful. TEA's cadence descope — FLAGGED (see MEDIUM above); it is the root cause of the tread-speed regression, not a Dev error.

**Handoff:** To SM for finish-story. Append the MEDIUM as a Delivery Finding so the tread-cadence fast-follow is tracked.

### Reviewer (code review) — Delivery Findings
- **Gap** (non-blocking): the movement-tied tread counter steps once per 60 Hz `stepEnemies` sub-step, so the *moving* tread animates ~4× the ROM's 15.625 Hz `INC ZX,TRDCTR` cadence (the "rate is byte-exact" premise now holds only for the frozen case). Affects `battlezone/src/core/enemies.ts:790-793` (gate the ±1 on the game-frame boundary `frameCount` uses, or floor-diff `phaseAge` like the debris loop at :842-845). Root cause: TEA's cadence descope was looser than the story premise. *Found by Reviewer during code review.*
