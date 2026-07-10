---
story_id: "rb2-7"
jira_key: ""
epic: "rb2"
workflow: "tdd"
---
# Story rb2-7: Multi-plane waves + drones + level ramp — score-scaled spawn counts (300 to 2, 1000 to 3 planes), drone formation offsets, MODECT plane-wave alternation + MCOUNT inter-wave counts, PLNLVL level-gated firing (level under 4 never / 4 = 50pct / 5 = always) gated /2

## Story Details
- **ID:** rb2-7
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** rb2-6 (kills-driven level ramp landed; seam gap: Enemy/Hit carry no kind discriminant yet)

## Technical Approach

### Load-Bearing Seam Gap (BLOCKING)

rb2-6 landed the level-ramp infrastructure (`gmlevlForKills(OBJKLD)`, `GMLEVL` indexing enemy weave window limits), but the seam gap remains: the `Hit{shell,target}` shape (guns.ts) and `Enemy` (enemy.ts) carry NO lead/drone/blimp discriminant. rb2-6's lone-plane main.ts hardcodes `kind = 'lead'`.

**rb2-7 MUST add a `kind` field to Enemy** (or equivalent wiring) so that:
1. `scoreKill(kind, depth)` in src/core/scoring.ts can pick the right score (drone flat 300, blimp flat 200, lead depth-scaled)
2. The `PLNXCG` drone→lead promotion can identify which entity got promoted
3. The `Hit` seam carries the kind all the way from guns.ts through main.ts

This is not optional — rb2-7 tests and wiring will fail without it.

### Frame Cadence (Load-Bearing)
- Sim ticks one step per **calc-frame** (~10.42 Hz / 96 ms), **NOT** display frame
- This is the Red Baron analogue of the Asteroids ÷4 trap
- red-baron/src/core/timing.ts (`SIM_HZ`, `SIM_TIMESTEP_S`) encodes it
- Every rb2-7 motion/fire/spawn/wave routine runs at calc-frame cadence, not display refresh

### ROM Spec & Quarry

Canonical spec: `red-baron/docs/red-baron-1980-source-findings.md` (authoritative in-repo; ROM source `historicalsource/red-baron` gitignored, may be absent). ROM is canonical over playtest curves — full-diff TS against the fidelity doc, don't pin single golden values.

**ROM tokens to implement (from story title + epic context §4):**

1. **MODECT plane-wave alternation:** ROM controls which slot spawns lead vs. drone (probably via even/odd plane counter modulo types). The object budget is 3 slots max (1 lead + 2 drones), and waves alternate lead→drones→lead→…
2. **MCOUNT inter-wave counts:** spawn count between waves (0-count delay before next wave starts spawning)
3. **PLNLVL level-gated firing:** `PLNLVL[GMLEVL]` table gates enemy fire:
   - Level < 4: never fire (0%)
   - Level 4: 50% fire chance
   - Level 5: always fire (100%)
   - Fire rate is then gated /2 (half cadence from rb2-5's gun overheat firing cadence, or half the base enemy fire rate)
4. **Score-scaled spawn counts:**
   - Score 0–299 (kills 0–1): spawn 1 plane per wave
   - Score 300–999 (kills 1–2): spawn 2 planes per wave
   - Score 1000+: spawn 3 planes per wave
5. **Drone formation offsets:** drones spawn at fixed XY offsets from the lead's spawn point (e.g., ±some-delta in world space)

### Dependencies & Seams
- **Builds on:** rb2-6 (level ramp landed via gmlevlForKills, scoring.ts covers drone/blimp flats already), rb2-4/rb2-5 (dogfight AI, guns, hit seam)
- **Blocks:** rb2-8 (the returning ace uses drone/lead kind to decide evade checks)
- **Consume:** `context-epic-rb2.md` §4 (object budget, level ramp, scoring), `docs/red-baron-1980-source-findings.md` (MODECT, MCOUNT, PLNLVL, formation tables)
- **Prior art:** read `sprint/archive/rb2-6-session.md` (Delivery Findings, esp. the seam gap, deviation log) and `sprint/archive/rb2-5-session.md` (gun overheat + Hit seam) before test design

## SM Assessment

**Setup complete — routing to TEA (O'Brien) for RED.**

- **Merge gate:** clear. No open PRs on red-baron; no blocking work in flight.
- **Dependency (`depends_on`):** none declared; rb2-6 (its precursor) is merged (HEAD `05da765`). No stack gate.
- **Session / context / branch:** all present. Branch `feat/rb2-7-multi-plane-waves-drones-level-ramp` off `origin/develop`.
- **Jira:** local YAML tracking only (no real Jira) — claim step intentionally skipped, consistent with the whole rb2 epic.
- **Scope confirmed:** 5-pt TDD story. Technical Approach captures the one load-bearing risk TEA must resolve first — the **BLOCKING seam gap** (Enemy/Hit carry no `kind` discriminant; rb2-6 hardcoded `'lead'`). `scoreKill` already handles `'drone'`/`'blimp'` flats, so the missing piece is the wiring, not the scoring math. TEA should design the RED contract so adding `Enemy.kind` is forced by a failing test, not bolted on later.
- **Cadence reminder surfaced:** all wave/spawn/formation/fire routines tick on calc-frame (`SIM_HZ`), not display frame — the Red Baron analogue of the Asteroids ÷4 trap. Flagged so RED tests assert on sim steps, not rAF ticks.
- **Prior art pointer set:** rb2-6 + rb2-5 archives pre-extract this story's quarry (seam gap, Hit seam, gun overheat cadence). Epic context `context-epic-rb2.md` §4 for object budget / level ramp / scoring tables.

No open questions block RED. Handing off.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T21:19:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T20:39:47Z | 2026-07-10T20:42:51Z | 3m 4s |
| red | 2026-07-10T20:42:51Z | 2026-07-10T21:00:07Z | 17m 16s |
| green | 2026-07-10T21:00:07Z | 2026-07-10T21:13:42Z | 13m 35s |
| review | 2026-07-10T21:13:42Z | 2026-07-10T21:19:08Z | 5m 26s |
| finish | 2026-07-10T21:19:08Z | - | - |

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev). Verified by Room 101 (testing-runner): **43 new tests fail, all on missing exports / missing wiring** (not syntax, collection, or type errors); **279 pre-existing tests still pass** (no regression).

**Test Files:**
- `tests/core/waves.test.ts` (29 tests) — the squadron layer: the **Enemy.kind seam** (AC-0, the rb2-6 blocking gap), score-scaled counts (300→2, 1000→3), byte-pinned PLANE1/PLANE2 drone offsets, the 25 % lone-plane roll, PLNXCG lead promotion, MODECT alternation, MCOUNT inter-wave counts, and the calc-frame `stepWaveClock` scheduler.
- `tests/core/enemy-fire.test.ts` (11 tests) — PLNLVL level-gated firing (`planeFireChance`: <4 never / 4 = 50 % / ≥5 always) over the ÷2 FRAME cadence (`planeFires`, tested as a *property*: half the frames, never two in a row).
- `tests/multiplane-wiring.test.ts` (4 tests, 1 baseline + 3 gating) — source-text guard (node env can't import DOM-coupled `main.ts`) that main.ts wires `spawnWave` and scores by the hit target's `.kind` (no hardcoded `scoreKill('lead')`), and drives the wave schedule.

**Tests Written:** 44 tests covering the 8 ACs (plus the AC-0 seam).

**GREEN contract (for Julia / Dev):**
- **NEW** `src/core/waves.ts` — exports listed in the `waves.test.ts` header block.
- **MODIFY** `src/core/enemy.ts` — add `export type EnemyKind = 'lead' | 'drone'` + `readonly kind: EnemyKind` on `Enemy`; `spawn()` sets `kind: 'lead'`; add `planeFireChance` + `planeFires`. Adding `kind` is **migration-free** — every existing Enemy builder spreads `spawn()`, so it inherits `kind` automatically (verified: guns.test/explosion.test `enemyAt` both spread spawn).
- **MODIFY** `src/main.ts` — spawn waves via `spawnWave`, pass the whole wave to `stepGuns`, score each hit by `wave[hit.target].kind`, and space waves with the `stepWaveClock` schedule.
- **Circular-import trap (see Delivery Findings):** `EnemyKind` must live in `enemy.ts`; do NOT import it into `scoring.ts` — `scoreKill(kind: KillKind)` already accepts an `EnemyKind` value structurally (subset), and `scoring.ts` already imports `P_INDP` from `enemy.ts` (one-directional).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #2 generic/interface — `readonly`, no mutation | `promoteLead` "does not mutate its input"; contract types are `readonly Enemy[]` / `readonly [number,number][]` | failing |
| #3 enum/exhaustiveness on the kind union | AC-0 routes BOTH `'lead'` and `'drone'` through `scoreKill` (exercises the `assertNever` switch) | failing |
| #4 null/undefined totality — 0/"" falsy traps, `??` not `\|\|` | `planeCountForScore(0)→1` & `(NaN)→1`; `planeFireChance(0)→0`; `planeFires` frame **0** eligibility; `interWaveDelay(-1)` non-NaN | failing |
| #8 test quality — meaningful assertions, no `as any`, no vacuous | Phase-C self-check below; targeted casts only (`as { kind?: string }`, `as 'drone'`), never `as any` | n/a |

**Rules checked:** 4 of 4 applicable lang-review rules have coverage. Not applicable to this pure deterministic core module: #1 (no `as any` in src), #5 (module/ESM — Dev), #6 (React), #7 (async), #9 (build-config), #10 (input-validation — no external input), #11 (error-handling — no try/catch beyond the RED import guard), #12 (perf/bundle), #13 (fix-regressions — Dev).
**Self-check:** 1 vacuous construct found and removed pre-commit (a dead `for` loop in the `stepWaveClock` test) + 1 quote-collision syntax bug fixed in the wiring-test title. No `let _ =`, no `assert(true)`, no always-None asserts remain.

**Handoff:** To Julia (Dev) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/waves.ts` (**new**) — the squadron/schedule layer: `spawnWave` (score-scaled count + PLANE1/PLANE2 drone formation + 25 % lone roll), `planeCountForScore`, `DRONE_OFFSETS`, `promoteLead` (PLNXCG), `MCOUNT`, `isPlaneWave`, `interWaveDelay`, and the calc-frame `stepWaveClock` reducer.
- `src/core/enemy.ts` — added `EnemyKind = 'lead' | 'drone'` + `readonly kind` on `Enemy` (spawn sets `'lead'`), and the PLNLVL firing decision `planeFireChance` / `planeFires` (÷2 FRAME cadence). `EnemyKind` stays local — scoring is NOT made to import it (no circular dep).
- `src/main.ts` — rewired the lone plane into a live WAVE: `enemies: Enemy[]` + `wrecks: Wreck[]`, DISCHK band from the nearest plane, each hit scored by `plane.kind` (drone flat / close lead more), PLNXCG promotion when the lead falls, and the `stepWaveClock` schedule spacing waves. Removed the hardcoded `scoreKill('lead', …)`.
- `tests/core/waves.test.ts` — corrected the AC-6 `stepWaveClock` decision-detection helper (off-by-one; see Design Deviations). Assertions unchanged.
- `tests/core/enemy.test.ts` — synced the local `Enemy` type mirror with the new `kind` field (see Design Deviations).

**Tests:** 322/322 passing (GREEN). `npx tsc --noEmit` clean (strict + noUnusedLocals). `npm run build` (tsc + vite) succeeds — the production bundle builds.

**Self-review:**
- [x] Wired to front end — `main.ts` spawns waves, scores by kind, animates multiple wrecks, and drives the MODECT/MCOUNT schedule.
- [x] Follows project patterns — pure deterministic core modules, ROM citations, `readonly` + `Object.freeze`, seeded-Rng-only randomness, one-directional module deps.
- [x] All ACs met — kind seam, score-scaled counts, drone offsets, PLNXCG, MODECT alternation, MCOUNT counts, PLNLVL firing decision. (Enemy-fire DAMAGE channel deferred to rb2-8/9 per TEA scope split — see Delivery Findings.)
- [x] Error handling — the new pure functions are total on degenerate input (NaN/negative/Infinity score & level, negative wave index).
- [x] No debug code; correct branch (`feat/rb2-7-multi-plane-waves-drones-level-ramp`).

**Handoff:** To next phase (verify / review).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking-for-design): `EnemyKind` (`'lead'|'drone'`, new in `enemy.ts`) and `KillKind` (`'lead'|'drone'|'blimp'`, existing in `scoring.ts`) are two overlapping unions. `scoring.ts` already imports `P_INDP` from `enemy.ts`, so `enemy.ts` is the LOWER module — `EnemyKind` must be defined there and `scoring.ts` must NOT import it (that would be a circular import). `scoreKill(kind: KillKind, …)` accepts an `EnemyKind` value structurally (subset), so `scoreKill(enemy.kind, depth)` type-checks with no new import. Affects `src/core/enemy.ts` / `src/core/scoring.ts` (Dev: keep the dependency one-directional). *Found by TEA during test design.*
- **Question** (non-blocking): rb2-7 pins the enemy FIRE DECISION (`planeFireChance`/`planeFires`) but DEFERS the enemy-shell/player-damage channel — the returning-ace EVADE check is rb2-8 and lives/respawn is rb2-9 (findings §5, "two death channels"). So enemy planes decide-to-fire but don't yet hit the player. Reviewer/PM: confirm this scope split (mirrors rb2-6's HUD-glyph deferral). Affects `src/main.ts` / a future enemy-shell module. *Found by TEA during test design.*
- **Improvement** (non-blocking): the MODECT ground-wave branch is a no-op WAIT in rb2 (ground combat is rb3, epic scope). `stepWaveClock` returns `spawnPlaneWave=false` on ground-parity MODECT slots — those slots are exactly the `INITGR` hook rb3 will populate. Affects `src/core/waves.ts` / a future rb3 ground module. *Found by TEA during test design.*
- **Conflict** (non-blocking): the ROM pins "LSB selects plane vs ground" and "FRAME LSB gates ÷2" but not WHICH parity value is the plane / the firing frame. Tests pin a convention (`isPlaneWave(0)=true`, even=plane) and pin the ÷2 as a PROPERTY (half the frames, never two adjacent) rather than a fixed phase — so a phase flip in Dev's impl still passes. If a later MAME trace fixes the phase, tighten these. Affects `red-baron/docs/red-baron-1980-source-findings.md` §3/§4 (record the phase if verified). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the AC-6 `stepWaveClock` RED tests detected "decision frames" via a MODECT-change heuristic that lands one frame LATE (the decision advances MODECT on the same step, so the change is only visible on the FOLLOWING frame) — making the gap/parity assertions unsatisfiable by any state-advancing scheduler. Corrected the `run()` helper to record `countdownBefore` and detect decisions via `countdownBefore === 0`; the assertions (MODECT +1/decision, gaps = MCOUNT, spawn = plane-parity) are unchanged and now correctly evaluated. Reviewer: confirm the corrected tests still gate the intent (they do). Affects `tests/core/waves.test.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): enemy firing (`planeFires`) is NOT wired into `main.ts` — per TEA's scope split it is pure-logic-only in rb2-7, so enemy planes currently never shoot the player in the runnable build (the damage channel is rb2-8 evade / rb2-9 lives). Reviewer/PM: confirm this is the intended rb2-7 scope. Affects `src/main.ts` (a future story wires `planeFires` → enemy shells). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `main.ts` now carries a `wrecks: Wreck[]` array so several downed planes can explode at once while survivors weave on — a natural generalisation of rb2-6's single `Wreck`. No shared abstraction extracted (single consumer, per minimalist discipline). Affects `src/main.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `interWaveDelay` (`src/core/waves.ts:112`) is total on negatives and non-integers but returns `undefined` for a NaN modect (`MCOUNT[NaN]`). Unreachable today — `modect` is always a finite integer produced by `stepWaveClock` from 0 upward — so it is a latent totality gap, not a live bug. Affects `src/core/waves.ts` (a `Number.isFinite` guard would harden it if a future caller can pass NaN). *Found by Reviewer during code review.*
- **Question** (non-blocking): confirming the rb2-7 scope split — enemy planes decide-to-fire (`planeFires`, unit-tested) but the runnable build never makes them shoot the player (no damage channel until rb2-8 evade / rb2-9 lives). This is intentional and well-documented; flagging so PM/rb2-8 pick up the wiring. Affects `src/main.ts` / a future enemy-shell module. *Found by Reviewer during code review.*

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **PLNLVL firing scoped to the DECISION only; enemy-shell/damage channel deferred**
  - Spec source: session story title ("PLNLVL level-gated firing … gated /2"); epic context §5 ("two death channels" — evade = rb2-8, lives/respawn = rb2-9)
  - Spec text: "PLNLVL level-gated firing (level under 4 never / 4 = 50pct / 5 = always) gated /2"
  - Implementation: tests pin the pure decision (`planeFireChance`, `planeFires`) — level grant × ÷2 cadence × the level-4 coin flip — but NOT an enemy shell that damages the player, and the wiring test does NOT gate `main.ts` on calling `planeFires`
  - Rationale: the ROM's enemy-plane damage is a distinct death channel owned by rb2-8 (EVADE) / rb2-9 (lives); wiring an enemy shell with no damage target is either dead code or gold-plating a half-feature. Pinning the mechanism now (consistent with this project's mechanism-first pattern, e.g. rb2-6's deferred HUD glyphs) keeps the RED contract honest
  - Severity: minor
  - Forward impact: rb2-8/rb2-9 consume `planeFires` to launch enemy shells / run the evade check and apply player damage
- **MODECT alternation pinned as MECHANISM; the ground branch is a no-op wait**
  - Spec source: session story title ("MODECT plane-wave alternation"); epic sequencing ("Ground combat … OUT of scope — rb3")
  - Spec text: "MODECT plane-wave alternation + MCOUNT inter-wave counts"
  - Implementation: `isPlaneWave`/`stepWaveClock` alternate plane vs ground slots and space them by MCOUNT, but ground-parity slots spawn nothing (`spawnPlaneWave=false`); only plane waves field planes in rb2
  - Rationale: ground waves (INITGR) are rb3; pinning the full alternation mechanism now (with a silent ground slot) is ROM-faithful without building out-of-scope ground combat
  - Severity: minor
  - Forward impact: rb3 populates the ground-parity slots with INITGR; the alternation cadence is already test-gated
- **`isPlaneWave`/`planeFires` PARITY PHASE is inferred; pinned as a convention + property**
  - Spec source: findings §3 (PLNSHL "FRAME LSB gates ÷2") and §4 (MODECT "LSB selects")
  - Spec text: the ROM pins that the LSB selects and the ÷2 gates, not which parity VALUE is plane / is the firing frame
  - Implementation: `isPlaneWave(0)=true` + even=plane is pinned as a convention; the ÷2 cadence is pinned as a PROPERTY (exactly half of consecutive frames eligible, never two adjacent), so a phase flip in Dev's impl still passes
  - Rationale: the exact parity byte isn't transcribed in the findings doc; pinning behaviour (alternation exists, ÷2 holds) over a fabricated phase avoids inventing ROM data (same discipline as rb2-6's debris-kinematics deviation)
  - Severity: minor
  - Forward impact: a MAME trace can fix the phase later; tighten the tests then
- **`stepWaveClock` reducer shape + `planeFires(roll)` signature are TEA-chosen**
  - Spec source: findings §4 (NEWCT/MODECT/MCOUNT primitives); enemy.ts module contract ("the only randomness is the seeded Rng handed to spawn")
  - Spec text: the ROM has NEWCT/MODECT/MCOUNT and a per-plane FRAME-gated fire, but no `{modect,countdown}` struct and no `roll` parameter
  - Implementation: `stepWaveClock` composes the ROM primitives into one pure `{modect,countdown}` reducer; `planeFires(level,frame,roll)` takes a plain `roll` in [0,1) (caller draws `nextFloat(rng)`) rather than an `Rng`, keeping the decision pure/deterministic and trivially testable at the 0.5 boundary
  - Severity: minor (trivial for the `roll` signature)
  - Forward impact: none — internal shapes; the caller supplies the roll from the seeded Rng
- **Drone flight state (deltaX/bank/side/active) is unpinned — drones inherit the lead's**
  - Spec source: findings §3 ("Drones fly formation offsets PLANE1 -100,+100 / PLANE2 -100,-100")
  - Spec text: the ROM pins the (x,y) formation OFFSETS, not each drone's turn-rate/bank at spawn
  - Implementation: tests pin drone `kind`, `x`, `y` (= lead + offset), and shared `depth`; they do NOT pin drone `deltaX`/`bank`/`side`/`active` — drones spread the lead's flight state (they fly formation)
  - Rationale: the ROM gives offsets, not per-drone kinematics; over-pinning fabricated drone velocities would violate "don't invent ROM data"
  - Severity: minor
  - Forward impact: drone weave/bank is Dev tuning within the formation invariant; ratify by playtest

### Dev (implementation)
- **Corrected an unsatisfiable RED test (AC-6 `stepWaveClock` decision detection)**
  - Spec source: `tests/core/waves.test.ts` AC-6 (the RED contract)
  - Spec text: "spawns ONLY when the countdown has elapsed"; "each decision spawns iff its MODECT is a plane wave"; "non-decision frames just tick the countdown down"
  - Implementation: the `run()` helper detected decisions by a MODECT-change between frames, which is off-by-one (a decision advances MODECT on its own step, so the change shows up only NEXT frame) — no correct scheduler can satisfy it. Rewrote `run()` to record `countdownBefore` and detect decisions via `countdownBefore === 0`; every assertion is preserved verbatim in intent
  - Rationale: the original detection was structurally unsatisfiable, not merely strict; the fix makes the (unchanged) assertions correctly evaluable — it sharpens rigor rather than weakening it
  - Severity: minor
  - Forward impact: none — the `stepWaveClock` contract is unchanged; the corrected tests gate the same behaviour
- **Synced `enemy.test.ts`'s local `Enemy` type mirror with the new `kind` field**
  - Spec source: TEA GREEN contract ("adding `kind` is migration-free — builders spread `spawn()`")
  - Spec text: value construction is migration-free, but `enemy.test.ts` also keeps a TYPE-level local `interface Enemy` (for its `as EnemyModule` structural cast) that lacked `kind`
  - Implementation: added `readonly kind: 'lead' | 'drone'` to that local interface so the cast type-checks under strict tsc; no rb2-4 assertion changed
  - Rationale: the local mirror must match the real `Enemy` shape for the module-shape cast; migration-free applied to VALUES, not the type mirror
  - Severity: trivial
  - Forward impact: none
- **Multi-plane wiring preserved rb2-6's `stepWreck()`-call guard via an explicit call**
  - Spec source: `tests/cockpit-boot.test.ts` (rb2-6 wiring guard `/\bstepWreck\s*\(/`)
  - Spec text: "main.ts must CALL stepWreck() so the wreck actually falls + bursts"
  - Implementation: the wreck array steps via `wrecks.map((w) => stepWreck(w))` (an explicit call site) rather than `wrecks.map(stepWreck)` (a bare reference the guard's regex wouldn't match)
  - Rationale: honour the existing wiring guard; the explicit call is behaviourally identical and arguably clearer
  - Severity: trivial
  - Forward impact: none

### Reviewer (audit)
- **TEA: PLNLVL firing scoped to the DECISION only; damage channel deferred** → ✓ ACCEPTED by Reviewer: consistent with epic §5 (two death channels are rb2-8 evade / rb2-9 lives) and rb2-6's HUD-glyph deferral precedent. The decision logic is fully unit-tested (`enemy-fire.test.ts`); wiring an enemy shell with no damage target would be dead/decorative code. Sound scope split.
- **TEA: MODECT alternation pinned as MECHANISM; ground branch is a no-op wait** → ✓ ACCEPTED by Reviewer: ground combat is rb3 (epic sequencing); `stepWaveClock` correctly returns `spawnPlaneWave=false` on odd MODECT and `main.ts` skips the spawn — I traced a full plane→ground→plane cycle and the ground slot silently consumes its MCOUNT gap. Faithful without building out-of-scope ground waves.
- **TEA: `isPlaneWave`/`planeFires` PARITY PHASE inferred; pinned as convention + property** → ✓ ACCEPTED by Reviewer: the findings doc pins "LSB selects" / "÷2 gates" but not the phase byte; pinning `isPlaneWave(0)=true` + the ÷2 property (half the frames, never two adjacent) over a fabricated phase is the correct "don't invent ROM data" discipline. Tests survive a phase flip.
- **TEA: `stepWaveClock` reducer shape + `planeFires(roll)` signature TEA-chosen** → ✓ ACCEPTED by Reviewer: internal shapes composed from ROM primitives (MCOUNT/LSB); the plain `roll` keeps `planeFires` pure and boundary-testable. No ROM data invented.
- **TEA: drone flight state unpinned — drones inherit the lead's** → ✓ ACCEPTED by Reviewer: the ROM gives (x,y) offsets, not per-drone kinematics; `spawnWave` spreads the lead and overrides x/y/kind — a reasonable formation entry. Confirmed drones share `depth` (test-gated) and the weave will clamp any offset that lands outside the window on the first step.
- **Dev: corrected an unsatisfiable RED test (AC-6 decision detection)** → ✓ ACCEPTED by Reviewer: I verified the original `modectBefore`-change heuristic is off-by-one and provably unsatisfiable (frame-0 and frame-1 are forced adjacent decisions with gap 0, but `interWaveDelay(1)=2`, so `0≠2` always fails). The fix keys off `countdownBefore===0` and leaves EVERY assertion intact — the tests still fail against a broken scheduler (I confirmed they gate MODECT+1/decision, gaps=MCOUNT, spawn=parity). A necessary test-correctness fix, not gaming.
- **Dev: enemy firing not wired into `main.ts`** → ✓ ACCEPTED by Reviewer: same scope split as TEA's firing deviation, above.
- **Dev: `main.ts` `wrecks: Wreck[]` array (multiple simultaneous explosions)** → ✓ ACCEPTED by Reviewer: a natural generalisation of rb2-6's single wreck; the array is freshly rebuilt each frame (`.map().filter()`) then `.push()`-mutated locally with no aliasing. No shared abstraction warranted (single consumer).
- **Dev: synced `enemy.test.ts` local `Enemy` type mirror with `kind`** → ✓ ACCEPTED by Reviewer: the local structural mirror MUST match the real `Enemy` for the `as EnemyModule` cast to typecheck under strict tsc; +1 line, no rb2-4 assertion touched.
- **Dev: preserved the `stepWreck()`-call guard via an explicit call** → ✓ ACCEPTED by Reviewer: honours the rb2-6 wiring guard; `wrecks.map((w) => stepWreck(w))` is behaviourally identical to a bare reference.
- No UNDOCUMENTED deviations found — I diffed the implementation against the story ACs, epic §3/§4, and the findings doc; every divergence in the diff was logged by TEA or Dev.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 2 soft nits | confirmed 0, dismissed 0, deferred 0 (both nits noted, non-blocking) |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — edge/boundary analysis performed by Reviewer directly |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — silent-failure analysis performed by Reviewer directly |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — test-quality analysis performed by Reviewer directly |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — comment/doc analysis performed by Reviewer directly |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | N/A | Disabled via settings — type-design analysis performed by Reviewer directly |
| 7 | reviewer-security | Yes | Skipped (disabled) | N/A | Disabled via settings — security analysis performed by Reviewer directly |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | N/A | Disabled via settings — simplification analysis performed by Reviewer directly |
| 9 | reviewer-rule-checker | Yes | Skipped (disabled) | N/A | Disabled via settings — full lang-review rule sweep performed by Reviewer directly |

**All received:** Yes (1 preflight returned GREEN; 8 specialist subagents disabled via `workflow.reviewer_subagents` — their domains were covered directly by the Reviewer, see below)

**Total findings:** 0 confirmed blocking, 2 non-blocking nits (interWaveDelay NaN totality gap; firing-unwired scope confirm), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

The rb2-7 diff is a clean, ROM-faithful multi-plane wave layer. Preflight is GREEN across the board (322/322 tests, `tsc --noEmit` clean under strict + noUnusedLocals, production `vite build` succeeds). Because 8 of 9 review subagents are disabled via settings, I covered each of their domains directly (tagged below).

### Rule Compliance (typescript.md lang-review checklist)

| # | Rule | Instances checked | Verdict |
|---|------|-------------------|---------|
| 1 | type-safety escapes | `waves.ts` DRONE_OFFSETS uses `Object.freeze([...]) as readonly [number,number]` (a widening cast on a frozen literal, NOT `as any`); tests use targeted `as {kind?}` / `as 'drone'` casts. No `as any`, no `@ts-ignore`, no non-null assertions in src. | ✅ compliant |
| 2 | generic/interface — readonly | `Enemy.kind` readonly; `DRONE_OFFSETS`/`MCOUNT` readonly + frozen; `spawnWave`/`promoteLead` return `readonly Enemy[]`; `WaveClock` readonly fields. (`wrecks: Wreck[]` is intentionally mutable — it is `.push()`-ed each frame, see [SIMPLE].) No `Record<string,any>`/`Function`/`object`. | ✅ compliant |
| 3 | enum/exhaustiveness | `EnemyKind` string union is consumed by `scoreKill`, whose `switch` already has `default: assertNever` (scoring.ts, unchanged). No new switch on the union lacking a default; `planeFires`/`planeFireChance` branch on numeric level. | ✅ compliant |
| 4 | null/undefined (`??` not `\|\|`, 0/"" traps) | `planeCountForScore` NaN-guards then uses `>=` (0-safe); `planeFireChance` `Number.isFinite`-guards; `interWaveDelay` modulo; `nearestDepth` Infinity default; no `\|\|` on a possibly-0/"" value anywhere in the diff. | ✅ compliant |
| 5 | module/declaration | extensionless relative imports match the whole codebase + bundler resolution (tsc passes); `export type EnemyKind` is type-only. | ✅ compliant |
| 6 | React/JSX | N/A — no JSX. | ✅ N/A |
| 7 | async/Promise | N/A — no async in the diff. | ✅ N/A |
| 8 | test quality | No `as any` in tests; every new test asserts a concrete value; the AC-6 correction preserved all assertions (audited). No vacuous `let _=`/`assert(true)`/always-None. | ✅ compliant |
| 9 | build-config | No config changes; strict + noUnusedLocals stay on (build GREEN). | ✅ compliant |
| 10 | input-validation | N/A — pure sim + keyboard; no external/user/JSON input. | ✅ N/A |
| 11 | error-handling | Total pure functions; no `try/catch` beyond the tests' RED import guard. | ✅ compliant |
| 12 | perf/bundle | `.map().filter()` per calc-frame over ≤3 enemies / few wrecks — trivial; no barrel over-imports, no sync fs. | ✅ compliant |
| 13 | fix-regressions | The `stepWreck` call-site fix + `enemy.test` mirror sync introduce no `as any` / `\|\|` / silenced errors. | ✅ compliant |

**Rules checked:** 13/13. Zero violations.

### Observations (≥5)

- `[VERIFIED]` **[EDGE]** hit-index handling is sound — `main.ts:261-268` builds a `Set<number>` from `shotResult.hits.map(h => h.target)`, reads `enemies[idx]` against the SAME array passed to `stepGuns` (line 258), and only then filters it — indices stay in sync, no off-by-one/stale-index. Multi-hit (two shells, same or different planes) scores/explodes each downed plane exactly once (Set dedup). Corroborated by preflight.
- `[VERIFIED]` **[EDGE]** the wave schedule terminates/advances correctly — I traced `stepWaveClock` from `INITIAL_WAVE_CLOCK {0,0}` through a plane→ground→plane cycle: opening plane wave fires on frame 1, the odd (ground) MODECT decision returns `spawnPlaneWave=false` and `main.ts:277` skips the spawn, and MODECT increments monotonically. No stall, no wasted wave (the clock only ticks when `enemies.length===0 && wrecks.length===0`).
- `[VERIFIED]` **[TYPE]** the rb2-6 seam gap is closed without a circular import — `EnemyKind` lives in `enemy.ts` (the lower module); `scoring.ts` still imports only `P_INDP` from `enemy.ts` and `scoreKill(plane.kind, …)` at `main.ts:264` typechecks because `EnemyKind ⊂ KillKind` structurally. Verified `enemy.ts` does NOT import from `scoring.ts`.
- `[VERIFIED]` **[TYPE]** adding a REQUIRED `Enemy.kind` is migration-safe — every Enemy builder (`spawn`, and the test `enemyAt` helpers in guns/explosion/waves) spreads `spawn()`, which now sets `kind:'lead'`; tsc is clean, so no un-migrated construction site remains.
- `[VERIFIED]` **[TEST]** the AC-6 test correction is legitimate, not gaming — the original `modectBefore`-change detector was provably unsatisfiable (frame-0/frame-1 forced adjacent with gap 0 vs `interWaveDelay(1)=2`); the fix keys off `countdownBefore===0` and leaves the gap/parity/increment assertions intact. The corrected tests still fail a broken scheduler.
- `[MEDIUM→LOW]` **[SILENT]** `interWaveDelay(NaN)` returns `undefined` (`MCOUNT[NaN]`) — a silent totality gap, but unreachable (`modect` is always a finite integer from the clock). Downgraded to LOW/non-blocking; logged as a Delivery Finding for a future guard.
- `[LOW]` **[SIMPLE]** `main.ts:231` `wrecks: Wreck[]` is mutable while sibling `enemies` is `readonly` — but this is JUSTIFIED, not inconsistent: `wrecks` is rebuilt each frame (`.map().filter()`) then `.push()`-ed (line 266), so `readonly` would not typecheck. A functional `wrecks = [...surviving, ...new]` would restore symmetry but the push is clear and alias-free. Cosmetic; no change required.
- `[VERIFIED]` **[DOC]** comments are accurate and ROM-cited — every magic number carries a findings §/ROM line citation (SCORE thresholds §3, DRONE_OFFSETS PLANE1/PLANE2 §3, MCOUNT §4:1296-1297, PLNLVL §3 NWPLNE:2345-2355, ÷2 §3 PLNSHL:4798-4807); the `main.ts` header was updated to the multi-plane reality (no stale single-enemy prose).
- `[VERIFIED]` **[SEC]** no security surface — pure deterministic sim, no network/storage/user-string/DOM-injection; the only randomness is the seeded Rng and the shell's `Date.now()` seed (non-security). `[RULE]` full 13-rule sweep above: zero violations.

### Devil's Advocate

Let me argue this code is broken. **First attack — the wave never spawns, or spawns forever.** If `stepWaveClock` mis-gated, the opening frame could stall with an empty sky. I traced it: `enemies` starts `[]`, `wrecks` `[]`, so frame 1 enters the else branch, `wrecks.length===0` holds, `stepWaveClock({0,0})` returns `spawnPlaneWave=true`, and `spawnWave` populates the sky. Conversely, could a wave spawn while planes are still alive, duplicating enemies? No — the schedule only ticks inside `enemies.length===0`. Safe. **Second attack — the hit loop corrupts indices.** If `enemies` were mutated before `enemies[idx]` was read, `idx` would be stale. But the filter happens AFTER the scoring loop, and `stepGuns` received the exact array being indexed. What if two shells report the same target? The `Set` dedups, so the plane is scored once — not double-counted. What if a shell's `target` index is out of range? `stepGuns.firstHit` only returns indices `< targets.length`, so `enemies[idx]` is always defined. **Third attack — a confused player or a stalled tab.** The `accumulator` is capped at 0.25s, so a backgrounded tab can't spiral the fixed-step loop; a wave in progress simply pauses. **Fourth attack — degenerate score/level.** `planeCountForScore(NaN)→1`, `(-Infinity)→1`, `(+Infinity)→3`; `planeFireChance(NaN)→0`, `(-3)→0`. All total. The one genuine soft spot the devil found is `interWaveDelay(NaN)→undefined` — but `modect` is never NaN in the live schedule (integer from 0 up), so it can't fire; I logged it anyway. **Fifth attack — the deferred firing is actually a missing AC.** The story lists "PLNLVL level-gated firing"; if that meant "enemy shells hit the player," this is incomplete. But epic §5 explicitly assigns the two death channels to rb2-8 (evade) and rb2-9 (lives); rb2-7 owns the DECISION, which is fully tested. Not a gap — a scope boundary, documented three times (TEA deviation, Dev deviation, wiring-test scope note). The devil finds nits, not defects.

**Data flow traced:** keyboard `Space` → `guns.fire` → `stepGuns(guns, enemies)` → `Hit{target}` → `enemies[target].kind` → `scoreKill(kind, depth)` → `score` (drawn to canvas). Safe: `target` is an in-range index into the same-frame `enemies` array; `kind` is a validated `'lead'|'drone'`; `scoreKill` is total.
**Pattern observed:** pure deterministic core module (`waves.ts`) + shell wiring (`main.ts`), matching guns.ts/scoring.ts/explosion.ts — `src/core/waves.ts:76` (`spawnWave` seeded-Rng-only) and `src/main.ts:275` (schedule reducer wired at calc-frame cadence).
**Error handling:** every new pure function is total on degenerate input (NaN/±Infinity/negative), verified by the AC-1/AC-5/AC-7 boundary tests.

**[EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]** — all dimensions covered (preflight + direct Reviewer analysis; 8 specialist subagents disabled via settings).

**Handoff:** To SM (Winston Smith) for finish-story.