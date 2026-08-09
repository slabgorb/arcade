---
story_id: "mc5-2"
jira_key: "mc5-2"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-2: Sputnik/bomber fly-across launcher (sputnik.ts): plane activates from wave 2 (SPUTWV), flies across firing ICBMs on WSPFIR/WSPLAU cadence, killed x4. REV-01 W3MAIN.MAC:2069/2433

## Story Details
- **ID:** mc5-2
- **Jira Key:** mc5-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/mc5-2-sputnik-flyacross-launcher

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T21:53:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T21:03:05Z | 2026-08-08T21:05:36Z | 2m 31s |
| red | 2026-08-08T21:05:36Z | 2026-08-08T21:17:18Z | 11m 42s |
| green | 2026-08-08T21:17:18Z | 2026-08-08T21:37:00Z | 19m 42s |
| review | 2026-08-08T21:37:00Z | 2026-08-08T21:53:35Z | 16m 35s |
| finish | 2026-08-08T21:53:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap / non-blocking (for mc5-2), blocking (for release CI): `test:orchestrator`
  has 3 pre-existing failures unrelated to this story.** All three come from
  `tests/jt9-55-joust-yaml-refs.test.mjs`, which reads `sprint/epic-jt9.yaml` — a file
  that no longer exists (the jt9 epic was archived). Confirmed independent of mc5-2:
  my diff touches only `plugins/missile-command/**` + `tests/citations-source.test.ts`,
  no joust/sprint files. mc5-2 introduces ZERO orchestrator regressions (missile-command
  902/902, lint clean). This stale gate will red every deploy's `test:orchestrator` step
  until fixed — a separate chore (delete/repoint the jt9-55 gate, or restore epic-jt9.yaml
  if wrongly removed). Flagged for SM/Reviewer; out of scope to fix inside mc5-2.

- **Gap (non-blocking; explicit follow-up): the Sputnik does not launch ICBMs in normal
  play — its firing is wired + unit-tested but suppressed.** Measured across natural play
  (seeds 1/4/7/11, thousands of frames, planes aloft for hundreds of frames): ZERO plane
  ICBM launches (detected by `origin.v === SPUTNIK_V_MIN`, which top-edge normal spawns never
  use). ROOT CAUSE — not the fire-timer seed, but the spawner: `spawnIcbms`
  (`plugins/missile-command/src/core/spawn.ts:56`) does `launches = min(MXICON − current.length,
  remaining)`, i.e. it FILLS the screen to MXICON(7) every frame budget remains, so the
  sputnik's ROM-faithful headroom clamp `min(MXICON − 2·cruise − icbm − 1, 4, budget)` is
  always ≤ 0; and once budget is spent (screen clears) there is no budget left for the plane
  either. The mc3-era spawner has no inter-spawn cadence (the ROM's WICSPL/WICSPH), which is
  why the ROM leaves room for the bomber and this port does not. **Deferred** (accepted at
  review): the sputnik still flies, is killed for ×4, and drives the `sputnikActive` signal
  (the story's mc5-3 unblock) — all delivered. FOLLOW-UP: a focused story to give the normal
  spawner an inter-spawn cadence (reserving on-screen slots) so the bomber can fire, then add
  the in-play firing test. Affects `src/core/spawn.ts` (cadence) + `src/core/game.ts` (fire
  wiring, already present). *Found by Reviewer during code review; root-caused during rework.*

### Dev (firing rework)

- **Improvement → RESOLVED in round 2 (and the original entry UNDERSTATED the
  magnitude):** round 1 shipped the NICBMS(8) ceiling unenforced across the
  plane's salvo and the same-frame spawner — the salvo was not in the `current`
  roster `spawnIcbms` counted. The original wording ("transiently past 8") was
  wrong about scale: review/TEA measured 9 on screen in play, and the worst case
  (salvo of 4 on a part-filled screen the spawner then topped up) reaches ~11-12.
  Round 2 resolves it by folding the salvo into the spawner's roster
  (`spawnIcbms([...state.icbms, ...sputnikShots], …)`), so plane + swarm hold the
  joint ceiling; TEA's in-play guard now pins `maxConcurrent <= NICBMS`. *Found by
  Dev round 1; magnitude corrected and fixed after review round 2.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Functional plane cross-speed (fixed step) instead of a cited ROM velocity**
  - Spec source: plan Task 5 ("`stepSputnik` each plane"); design §mc5-2 (Sputnik/bomber)
  - Spec text: "the shell only paints functional shapes (pixel-authentic render is mc9)"
  - Implementation: `stepGame` flies each plane at a small fixed `SPUTNIK_SPEED = 2` cabinet units/tick (a trivial literal, uncited). No authentic horizontal-velocity constant was decoded.
  - Rationale: the plan pins the plane's cadence tables (WSPFIR/WSPLAU) but not a cross-velocity, and ROM-authentic plane motion is explicitly a mc9 concern; the tests constrain only that the plane advances by `dir·speed` and eventually exits.
  - Severity: minor
  - Forward impact: minor — mc9 (presentation) should decode/pin the authentic plane velocity; mc5-3/mc8-5 read only `sputniks.length`, not speed.

- **Activation cadence gated on the global frame counter, not a dedicated SPUTIM timer field**
  - Spec source: plan Task 5 ("activate when `state.wave >= SPUTNIK_WAVE` and the activation timer allows")
  - Spec text: "activate when `state.wave >= SPUTNIK_WAVE` and the activation timer allows"
  - Implementation: a plane activates when `wave ≥ SPUTNIK_WAVE`, no plane is aloft, and `state.frame > 0 && state.frame % sputnikActivationSep(wave) === 0` — the WSPLAU separation is measured against the existing `frame` counter rather than a new `GameState.sputnikTimer` field.
  - Rationale: avoids adding a required GameState field (which would ripple to every state constructor) while honouring "the activation timer allows"; the WSPLAU separation still governs the gap.
  - Severity: minor
  - Forward impact: none — the observable contract (no plane before wave 2; a plane appears on the WSPLAU cadence) is unchanged; a later story may swap to a SPUTIM field for exact ROM phase without affecting consumers.

- **(firing rework update) `SPUTNIK_SPEED` is now 1, not the 2 the first entry above
  describes:** the rework's crossing must outlast the deepest WSPFIR reload (128
  frames) so the plane becomes fire-ready in flight — at speed 1 the crossing is
  ~247 frames, and the per-tick `fireTimer − 1` decrement equals distance travelled
  (SPUTDS is a DISTANCE, W3MAIN.MAC:285). Still a functional, trivial-literal speed;
  mc9 pins the authentic ROM velocity. The first entry's rationale otherwise stands.

### Reviewer (audit)

- **Functional plane cross-speed (fixed step)** → ✓ ACCEPTED by Reviewer, WITH a
  consequence finding. The deferral of authentic velocity to mc9 is sound. BUT the
  chosen `SPUTNIK_SPEED = 2` interacts with the plan's `fireTimer = activationSep`
  seed to produce an emergent gap I measured in play (see finding F1): the plane
  crosses in 124 frames while `activationSep` is 240/160/128 at waves 2/3/4, so a
  sputnik NEVER fires an ICBM at waves 2–4 — even on an empty screen with budget.
  The deviation is accepted; the emergent non-firing is a finding to resolve.
- **Activation cadence gated on the global frame counter (not SPUTIM)** → ✓ ACCEPTED
  by Reviewer: the observable contract (no plane < wave 2; a plane on the WSPLAU
  cadence) holds, and a SPUTIM field can replace it later without touching consumers.
  No behavioural difference for mc5-3/mc8-5, which read only `sputniks.length`.

## Dev Assessment (GREEN)

**Verdict: GREEN — full missile-command project 902/902, `npm run lint` clean.** The
20 RED tests now pass; the previously-vacuous wave-1 negative gate is now a real guard
(a plane never spawns before SPUTNIK_WAVE).

**What landed (plan Tasks 3–5):**
- `src/core/sputnik.ts` — pure entity + spawn/step/offscreen (Task 3); WSPFIR/WSPLAU
  tables (parsed decimal strings, the OLDRAD idiom), launch-count clamp with the
  `max(0,…)` floor, `readyToFire`/`reload` (Task 4). Purity passes; MXICON imported
  from spawn.ts (no bare `7`).
- `docs/rom-study/claims/sputnik.json` — MC-VPLMIN(100), MC-SPUT-SCORE(4),
  MC-SPUT-FIREMAX(4), MC-WSPFIR/MC-WSPLAU. SPUTWV(2) reuses config.json's MC-SPUTWV
  (dropped my duplicate). Byte-checker exits 0.
- `src/core/damage.ts` — `killSputniksInBlasts` (generic `{pos:Vec}` point-in-blast).
- `src/core/game.ts` — `GameState.sputniks`; activate/fly/fire/kill/drop in `stepGame`;
  launches draw the shared wave budget; cleared at wave end; `sputniks.length>0` is the
  `sputnikActive` signal mc5-3 reads. ×4 kill reuses `scoreKills(score,
  planeKills·SPUTNIK_SCORE_MULT, wave)` — no `score.ts` change (plan allowed reuse).
- `src/shell/render.ts` — functional plane glyph (enemy hue, variant-shaped).

**Test-apparatus note (why a test file changed under Dev):** numeric non-EQU claims
MUST be registered in the `DERIVED` allow-list of `citations-source.test.ts` with a
consistency block pinning each value to its cited operand/.BYTE row — else the kind-tag
rule rejects them and the un-cited-literal guard would have a hole. Established pattern
(mc4-1/mc4-2/mc5-1; mc5-1's Dev added POTENT/EXPLCT). Strengthens coverage.

**Not done (conscious scope):** authentic plane velocity + pixel sprite (mc9);
cruise-on-screen is 0 in the launch clamp until mc5-3; no audio cue (mc8). See Design
Deviations for the two functional placeholders, and Delivery Findings for the
pre-existing jt9-55 orchestrator failure (unrelated to mc5-2).

**Handoff:** phased tdd → Reviewer (Jean-Baptiste Emanuel Zorg) for review.

## SM Assessment

**Story:** mc5-2 — Sputnik/bomber fly-across launcher (5pt, tdd, arcade). The second of the three REV-01 enemy implementations in mc5 (full enemy roster). This story covers Tasks 3–5 of the committed plan `docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md`; design at `docs/superpowers/specs/2026-08-08-missile-command-mc5-enemy-roster-design.md` §mc5-2 (Sputnik/bomber).

**Predecessor status:** mc5-1 (MIRV split) is DONE, merged, and archived; the design and plan are finalized and shared.

**Premise:** Sputnik is a distinct fly-across entity (not ICBM-family), spawned from wave 2 onward per `SPUTWV` (W3COMN.MAC:203), activates in a vertical band around `VPLMIN=100` (W3MAIN.MAC:5761), comes in bomber/satellite variants via `SOBJID = rand AND 1` (W3MAIN.MAC:5793), fires ICBMs on per-wave cadence `WSPFIR`/`WSPLAU` tables (W3MAIN.MAC:5725/5729), and is killed for 4× the ICBM value (W3MAIN.MAC:2071). Wiring into `stepGame` adds the `GameState.sputniks` array and the `sputnikActive` signal (used by mc8-5's drone trigger).

**Technical scope:** 
- Task 3: Pure `src/core/sputnik.ts` module — entity data structure (`Sputnik` with `pos/dir/variant/fireTimer`), spawn, flight step, kill.
- Task 4: Fire cadence + launch-count clamp (frozen `WSPFIR`/`WSPLAU` tables, per-wave indexing, clamped ICBM budget).
- Task 5: Wiring into `stepGame` — activate (wave-gated), fly, fire, remove offscreen/killed, score kills ×4; functional render.

**Fidelity contract (inherited from mc5):** REV-01 ground truth; every non-trivial numeric literal in `src/core` backed by a committed claim in `docs/rom-study/claims/sputnik.json`, gated by `citations.test.ts`; pure core (swept by `purity.test.ts` — no `Date`, no `Math.random`, no `window`/`document`), seeded RNG only.

**For TEA (RED):** The plan (§Tasks 3–5) supplies full RED test code, ROM capture recipes (`grep -an`, `sed` on `tr -d '\r'` copies), and commit steps. Tests are now in `tests/sputnik.test.ts`, `tests/sputnik-integration.test.ts`. Core suite must stay green at each task's final step; mutations will be checked at review.

**Handoff:** phased tdd → TEA (Tyr One-Handed) for RED.

## TEA Assessment (RED)

**Verdict: RED confirmed — 20 failed / 1 passed (21 total).** All failures are the
feature's absence, not test bugs. `npm run lint` (tsc --noEmit, the release gate) is
GREEN — the tests compile while `src/core/sputnik.ts` and `GameState.sputniks` are
still absent.

**Two suites written (plan Tasks 3–5):**
- `tests/sputnik.test.ts` (16 tests) — the pure entity + timing reducer. Uses the
  fleet dynamic-import RED loader (`/* @vite-ignore */` + variable specifier) so tsc
  stays green; every test reddens with the self-describing "not built yet".
  - AC1 constants: `SPUTNIK_WAVE=2`, `SPUTNIK_V_MIN=100`, `SPUTNIK_SCORE_MULT=4`.
  - AC2 spawn: edge/dir, `pos.v ≥ V_MIN`, `fireTimer = activationSep`, BOTH variants
    across seeds (kills a constant-variant mutant), determinism per seed.
  - AC3 flight: `pos.h += dir·speed`, altitude held, eventual `offscreen`; offscreen
    pinned at both edges (`<0`, `>HMAX`).
  - AC4 tables: WSPFIR/WSPLAU ramp from wave 2, clamp to the last row past wave 8.
  - AC5 launch clamp: caps at 4, −2/cruise, −1/icbm, **never negative** (the
    `max(0,…)` floor — lang-review #21), budget-clamped.
  - Fire gate: `readyToFire` at timer 0, `stepSputnik` decrements the timer, `reload`
    re-arms to `sputnikFireCadence(wave)`.
- `tests/sputnik-integration.test.ts` (5 tests) — WIRED into `stepGame`, via the
  `GameState & { sputniks }` forward-cast (bonus-city/mc4-playthrough idiom).
  - SPUTWV gate: fresh game roster empty (RED: `undefined ≠ []`); **no plane before
    wave 2**; **plane activates from wave 2** within the WSPLAU cadence window.
  - ×4 kill: a REAL peak-radius blast (startExplosion + 64× stepExplosion) over a
    plane drops it and adds exactly `4 × ICBM_KILL_POINTS` (imported, not re-spelled;
    wave 2 → per-wave multiplier 1, so the assertion is robust to whether Dev folds
    that in). A far in-flight ICBM keeps the wave live; the plane's fireTimer is high
    so its own launch never muddies the score delta.
  - Far-edge drop: an off-field plane is removed with no points and no penalty.

**Rule Coverage (lang-review/typescript.md + project rules):**
- **#21 degenerate-but-not-nullish numerics** → `sputnikFireCount(4,0,99)` pins the
  `max(0,…)` floor (over-saturated field must clamp to 0, not go negative); `(…,0)`
  budget pins the zero-budget arm.
- **#26 assertion terms all-local** → the kill delta derives from imported
  `ICBM_KILL_POINTS`, not a bare `100`; constants are pinned to their literals in the
  unit suite, not re-derived in the assertion.
- **#15/#25 source-text token guards** → deliberately AVOIDED. No `toMatch(/keyword/)`
  over source. The one presentation deliverable (functional shell render of the plane)
  is NOT pinned by a brittle source-grep; it is left to the verify pass + Reviewer +
  manual playtest (render output needs a ctx mock and is mc9-adjacent). Flagged so the
  omission is a conscious scope call, not a gap.
- **citations.test.ts §4 (un-cited numeric literal sweep)** → a GREEN obligation on
  Dev: sputnik.ts must claim its constants in `docs/rom-study/claims/sputnik.json`
  (2 is trivial, but 100/4/table values are not) OR carry the WSPFIR/WSPLAU tables as
  a parsed STRING (the explosion.ts OLDRAD idiom) so the values sit inside a stripped
  literal. Not enforced by a RED test — it is the existing gate that will bite Dev.
- **purity.test.ts** → auto-sweeps the whole `src/core` dir, so sputnik.ts is covered
  the moment it lands: seeded `@shared/rng` only, no clock/entropy/shell import.

**Vacuous-pass note (honest):** the 1 passing test is the wave-1 negative gate — it
passes vacuously at RED (nothing spawns because nothing is wired) and becomes a real
guard at GREEN (a plane spawned before wave 2 would fail it). The paired POSITIVE test
(plane activates at wave 2) is RED now, so the gate has teeth once implemented.

**For Dev (GREEN — Korben Dallas):** Implement plan Tasks 3→4→5 in order, each its own
RED→GREEN→commit. Keep every non-trivial literal claimed (citations §4) and the module
pure (purity). Target: `npx vitest run --project missile-command` fully green + `npm run
lint`. The activation test allows 800 frames at wave 2 — WSPLAU[0]=240 gives head-room.

**Handoff:** phased tdd → Dev (Korben Dallas) for GREEN.

## Reviewer Assessment

**Verdict:** APPROVED (after rework — REJECTED on the first pass, findings now resolved)

**Reviewer:** Jean-Baptiste Emanuel Zorg. Nobody is perfect… but committed ROM
citations must be. The first pass was REJECTED for three ROM-verified citation errors
plus a measured in-play behaviour gap; all are now addressed (see Rework Resolution),
so this is APPROVED. Every gate is green (missile-command 902/902, lint clean, 193
claims byte-verified, purity + core/shell boundary intact).

### Rework Resolution (commit ff0030f0)

- **F2 (RULE #17) — RESOLVED.** The three SPUTKI citations now read `W3MAIN.MAC:2081`
  (with a "SPUTKI label at 2071" note), matching the byte-verified claim. Re-checked:
  no stale `2071` remains outside that note.
- **F3 (DOC) — RESOLVED.** The `peakBlastAt` doc dropped the false "≤1-unit drift"
  figure for a qualitative statement.
- **F4 (TEST) — RESOLVED.** The wave-1 gate re-pins `wave: 1` each tick, so it observes
  the case it names rather than passing by pacing luck.
- **F5 (SIMPLE/TYPE) — RESOLVED.** The redundant `GameState & { sputniks }` cast is gone;
  the test imports the real `Sputnik` type and reads `GameState.sputniks` directly.
- **F1 (EDGE/TEST) — DEFERRED, root-caused.** During rework I proved (natural play,
  seeds 1/4/7/11) the plane launches ZERO ICBMs, and traced it NOT to the fire-timer
  seed but to `spawnIcbms` (`spawn.ts:56`) filling the screen to MXICON every frame
  budget remains — so the sputnik's ROM-faithful headroom clamp is always ≤0. Fixing it
  means giving the normal spawner an inter-spawn cadence (WICSPL/WICSPH), which is a
  spawn-wide change out of scope for this story and risky to bolt on in review. The
  bomber still flies, is killed for ×4, and drives `sputnikActive` (the story's mc5-3
  unblock — fully delivered); firing stays wired + unit-tested. Accepted as an explicit
  Delivery Finding + follow-up story. A speculative fix (slower speed + fire-cadence
  seed) was tried and REVERTED when it failed to make the plane fire — the diff is back
  to the reviewed code plus test-only nits.

### Findings (ranked)

- **[EDGE][TEST] F1 (Medium) — the Sputnik never fires an ICBM in play at waves 2–4,
  its introduction waves.** MEASURED, not argued: I forced a wave-2 plane onto an
  EMPTY screen with ample budget and stepped it to exit — aloft 124 frames, `fireTimer`
  fell only 240→117, `everFired=false`. Root cause: `spawnSputnik` seeds
  `fireTimer = activationSep` (WSPLAU = 240/160/128 at waves 2/3/4), which exceeds the
  ~124-frame crossing at `SPUTNIK_SPEED = 2`, so the first-fire timer never elapses.
  The firing WIRING is correct — with headroom at wave 3 a ready plane does fire
  (0→3 ICBMs, timer reloads to 96) — and the MXICON-headroom suppression is the
  faithful ROM clamp. But the story's headline ("flies across FIRING ICBMs on
  WSPFIR/WSPLAU cadence") is not observable at the waves the enemy debuts. This is the
  "feature not observed in play" trap: the unit tests certify `sputnikFireCount`/
  `readyToFire`/`reload`, and BOTH integration fixtures set `fireTimer: 999` to avoid
  firing, so nothing exercised firing end-to-end. **Decision required:** either (a) make
  the plane fire at its debut waves (e.g. seed the first `fireTimer` from the fire
  cadence, or from a value below the crossing time; or slow the plane so it lingers past
  `activationSep`), or (b) accept it as a consequence of the mc9-deferred functional
  velocity and log an EXPLICIT deferral Delivery Finding + an in-play test that pins the
  intended behaviour. Silent non-firing is not acceptable. `src/core/sputnik.ts:110-112`
  (seed), `src/core/game.ts:229` (`SPUTNIK_SPEED`).

- **[RULE] F2 (Low, ×3) — three test comments cite SPUTKI's `LDX I,3` (the ×4 kill) at
  `W3MAIN.MAC:2071`/`2071-2079`; the instruction is at line 2081.** ROM-verified myself:
  2071 is the `SPUTKI:` label, 2079 is `STA SPUTIM`, and `\tLDX I,3\t…;(4X ICBM)` sits
  at 2081 — outside the cited range. The committed, byte-verified claim
  (`docs/rom-study/claims/sputnik.json:20`) and `src/core/sputnik.ts:20` correctly say
  2081, so the SAME diff contains a correct citation and three wrong ones (rule #17:
  two claims that cannot both be true). Fix the three test comments to 2081.
  `tests/sputnik.test.ts:17`, `tests/sputnik.test.ts:99`, `tests/sputnik-integration.test.ts:11`.

- **[RULE][DOC] F3 (Low) — `peakBlastAt` doc comment claims the fixture tolerates "a
  ≤1-unit-per-tick drift", but `SPUTNIK_SPEED = 2`.** The real per-tick drift is 2. The
  test still passes (radius 13 covers it), but the quantitative claim is false in the
  same diff that defines the speed. Reword to ≤2, or to "the peak-radius blast covers
  the plane's per-tick drift". `tests/sputnik-integration.test.ts:56`.

- **[TEST] F4 (Low) — the "never activates a plane before wave 2" test does not hold the
  wave locked.** It loops `stepGame` 500× from `wave: 1` and asserts `sawPlane === false`.
  It passes only because, for seed 4, the wave never completes within 500 frames so
  `s.wave` stays 1 — if pacing ever lets the wave advance to 2 inside that window, the
  test reddens on correct code. Gate `sawPlane` on `s.wave === 1`, or re-pin
  `wave: 1` each iteration. `tests/sputnik-integration.test.ts:41-49`.

- **[SIMPLE][TYPE] F5 (trivial) — `SputnikState = GameState & { readonly sputniks }` is a
  redundant self-intersection now that `GameState` declares `sputniks`.** A harmless
  RED-phase vestige; collapse to plain `GameState` in the integration test.
  `tests/sputnik-integration.test.ts:33`.

### VERIFIED (evidence-backed)

- **[VERIFIED] src/core purity holds** — `sputnik.ts` imports only `./icbm.js`,
  `./cursor.js`, `./spawn.js`, `@shared/rng`; no clock/entropy/DOM/shell import.
  `purity.test.ts` sweeps the whole `src/core` dir, and the full suite is green.
  Complies with the purity rule.
- **[VERIFIED] No un-cited numeric literal in the new core** — every non-trivial literal
  is claimed (100/4 in `sputnik.json`), imported (`MXICON` from spawn.ts), or inside the
  OLDRAD-idiom parsed string (WSPFIR/WSPLAU); byte-checker exits 0 over 193 claims.
  Digit-free multi-line JSDoc confirmed (`sputnik.ts:34-46`). Complies with citations §4.
- **[VERIFIED] Derived-claim honesty (rule #29)** — SPUTKI/SPUTFIRE_MAX/WSPFIR/WSPLAU are
  registered in `DERIVED` and pinned by the mc5-2 consistency block
  (`citations-source.test.ts:382-410`), which re-derives each value from its cited
  operand/.BYTE row — mutation-honest, not a hole.
- **[VERIFIED] Bounded growth (rule #21)** — a new plane spawns only when
  `planes.length === 0` (≤1 plane), and `sputnikFireCount` floors at 0 and caps at 4;
  a saturated field yields 0, never negative. `sputnik.ts:93-96`, `game.ts` activation.
- **[VERIFIED] Transition written on every exit path (rule #14)** — `sputniks` is set on
  both `stepGame` play exits and reset in the single `between` branch; `over` freezes via
  `...state`, matching `icbms`' own freeze. No leaked edge.
- **[SILENT] No swallowed errors or silent fallbacks introduced** — `sputnikLaunch`
  returns `[]` only on `liveTargets.length === 0 || count <= 0` (an intended empty result,
  not a hidden failure), and the new `game.ts` wiring has no empty catch or discarded
  error path. Verified clean (`sputnik.ts:130-142`).
- **[PRE] Preflight is clean** — missile-command 902/902, `npm run lint` clean, 193
  citation claims byte-verified (exit 0). The only `test:orchestrator` reds are the
  pre-existing `jt9-55` failures (missing `sprint/epic-jt9.yaml`), which this diff does
  not touch — confirmed independently.
- **[SEC] Security review clean** — reviewer-security found no purity/determinism escape
  in the new `src/core` (sputnik.ts/game.ts/damage.ts import only pure core + seeded
  `@shared/rng`), no fabricated/uncited constant, and no unbounded loop or array growth
  (plane count ≤1; `sputnikFireCount` floors at 0, caps at 4, and draws down a bounded
  wave budget). Confirmed against the diff.

### Rule Compliance (lang-review/typescript.md + project rules)

Enumerated against the diff (backstop rule-checker cross-referenced, findings verified
independently against the ROM source):
- **#1–#13, #16, #18–#26 (except #17):** compliant across all changed files (no `as any`,
  proper unions not enums, `??` not `||`, `.js` extensions, no vacuous/self-referential
  assertions, `sputnikFireCount` degenerate arm pinned per #21).
- **#17 (comments assert an un-rerun mechanism):** **VIOLATED** — F2 (×3) + F3. Confirmed,
  ROM-verified, cannot be dismissed (rule-matching).
- **#14 (derived edges):** compliant (see VERIFIED).
- **#15/#25 (source-text token guards):** compliant — the mc5-2 consistency block anchors
  via a structured claims Map, not a whole-file regex.
- **#22 (reject-style NaN safety):** `offscreen` is a fresh REJECT-style predicate; on a
  NaN `pos.h` it would fail OPEN (plane never removed), but unreachable today
  (`spawnSputnik` seeds finite h, speed finite). Noted, not scored.
- **Project rules — purity, literal-claim coverage, DERIVED registration, core/shell
  boundary:** all compliant (see VERIFIED).

### Devil's Advocate

Assume this Sputnik is broken. The most damning case is the one I proved: the enemy the
story is named for — a plane that "flies across FIRING ICBMs" — does not fire at waves 2,
3, or 4, which are precisely the waves a player first meets it. A reviewer trusting the
green suite would never know, because the suite is a monument to the feature working in
the abstract: `sputnikFireCount` is exhaustively tested, `readyToFire`/`reload` are
tested, and then BOTH integration fixtures quietly set `fireTimer: 999` so no plane ever
pulls the trigger inside `stepGame`. That is coverage theatre — every assertion honest,
the mechanism unexercised. A confused player experiences a harmless decorative flyby and
wonders why the "bomber" never bombs; a designer tuning difficulty sees the sputnik add
no pressure and over-compensates elsewhere. Push harder: is the plane even reliably
present? Activation is `frame % activationSep === 0`, so if a future wave's pacing makes
a wave complete on a frame that is also an activation multiple, the `between` reset and
the activation both touch `sputniks` in one step — I checked; the reset is in a separate
early-return branch, so no clobber, but the coupling to a global counter is a latent
fragility, and F4 shows a test already leaning on a pacing coincidence. What about the
NaN path in `offscreen`? Unreachable now, but it fails OPEN — a future caller feeding a
computed position could strand an immortal plane. And the citations: three comments point
at a ROM line that does not contain the instruction they name, in a project whose entire
identity is byte-exact fidelity — the exact rot the citation gates exist to stop, slipped
past because the gates check the JSON claim (correct) and not the prose (wrong). None of
these is a crash. All of them are the quiet kind of wrong that ships when a suite is green
and nobody drives the car. That is why this is a REJECT, not an approve-with-nits: the
feature must be observed in play, and the citations must be exact.

**Handoff:** To SM for finish-story. First pass handed back to Dev (F2–F5 fixed, F1
deferred with a root-caused Delivery Finding); rework verified green and re-approved.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (902/902, lint clean, 193 claims verified, orchestrator failures isolated to pre-existing jt9-55) | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — hand-covered (found F1 firing gap, offscreen NaN note) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — hand-covered (sputnikLaunch []-return is intended, no swallowed errors) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — hand-covered (F4 fragile wave gate; firing untested in play → F1) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — hand-covered (corroborates F2/F3 citation/doc errors) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — hand-covered (Sputnik readonly + unions good; F5 redundant cast) |
| 7 | reviewer-security | Yes | clean | none (purity/constants/bounds all clean) | N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — hand-covered (F5; `.map` side-effect noted, correct) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (rule #17 ×4) | confirmed 4 (F2 ×3, F3), independently ROM-verified |

**All received:** Yes

## Dev Assessment (firing rework GREEN)

**Implementation Complete:** Yes — the F1 held finding (bomber fires zero ICBMs in
play) is resolved; TEA's 4 RED tests pass.

**Files Changed:**
- `plugins/missile-command/src/core/sputnik.ts` — `sputnikFireCount` headroom is now
  `NICBMS − 2·cruise − icbm` (floored 0, capped SPUTNIK_FIRE_MAX=4): the −1 self-term
  is gone because the plane fires INTO the 8th NICBMS slot the mc5-6 planeActive swarm
  cap reserves (SPUTFIR W3MAIN.MAC:2703, JMP SPUTFIR :2543 — both grep-verified against
  the vendored source). Imports NICBMS, drops MXICON; header + JSDoc formulas updated;
  `spawnSputnik` param renamed `fireCadence` (it now seeds from WSPFIR).
- `plugins/missile-command/src/core/game.ts` — stepGame reordered: planes step +
  activate BEFORE `spawnIcbms` (planeActive accurate this frame); a ready plane fires
  from the wave budget FIRST against the pre-spawn on-screen count (budget priority);
  `spawnIcbms` gets the reduced budget + `{ planeActive: planes.length > 0 }` as the
  6th arg; fireTimer seeds from `sputnikFireCadence(wave)` (WSPFIR = SPUTDS,
  W3MAIN.MAC:285/:4133) while the activation GATE stays on `sputnikActivationSep`
  (WSPLAU); `SPUTNIK_SPEED = 1` so the ~247-frame crossing outlasts WSPFIR=128;
  `remaining` threads through `spawned.remaining`.
- `docs/rom-study/claims/sputnik.json` — NOT edited: the MC-SPUT-FIREMAX narrative
  describes only the "MAX AT 4" saturation, never the MXICON/−1 formula, so there was
  nothing to correct (VALUE/CITATION/verbatim untouched; byte-checker exit 0).

**Tests:** 929/929 passing (GREEN; was 925 + 4 RED). In-play matrix measured
**14/15 firing cells, 19 distinct shots** — identical to SM's reference spike
(thresholds ≥8 / ≥12 cleared with the calibrated margin; fire ORDER matches the
reference, no deviation). Gates: `npm run lint` clean; byte-checker 194/194 exit 0;
purity sweep green. No test file touched; spawn.ts/ICNORM_CAP/LAUHGT/NICBMS untouched.

**Branch:** feat/mc5-2-sputnik-flyacross-launcher (pushed, `3e6460ea`)

**Handoff:** To review (re-review of the firing rework).
**Total findings:** 7 confirmed (F1 Medium; F2 ×3 Low; F3 Low; F4 Low; F5 trivial), 0 dismissed, 0 deferred (F1 deferral is Dev's decision to make explicit)
## Dev Assessment (round-2 faithful rework GREEN)

**Implementation Complete:** Yes — both round-2 review findings (F1 over-generous
salvo, F2 NICBMS breach) resolved; TEA's 6 round-2 RED tests (`0ee5834f`) pass.

**Files Changed** (committed as `1d513192` — content is my working tree verbatim;
the commit itself was made by SM while my matrix probe was still running):
- `plugins/missile-command/src/core/sputnik.ts` — F1: `sputnikFireCount` headroom is
  `MXICON − 2·cruise − icbm` (the −1 below NICBMS is the aloft plane's OWN PLCPV
  reservation — ICNORM's `SEC / LDA A,PLCPV / IFNE / CLC`, W3MAIN.MAC:2447-2453);
  `SPUTNIK_FIRE_MAX` 4→3 (SPUTFIR :2703 falls into MIRVER :2705, `CMP I,2` /
  `STA POTENT` "NO MORE THAN 3 SHOTS FROM A MIRV" :2709-2717). MXICON re-imported,
  NICBMS import dropped; header/JSDoc rationale rewritten to the faithful reading.
- `plugins/missile-command/src/core/game.ts` — F2: chose SM's PREFERRED ceiling-safe
  shape — planes still step/activate BEFORE the spawner and the ready salvo fires
  against the pre-spawn count, but the salvo is FOLDED into the spawner's roster
  (`spawnIcbms([...state.icbms, ...sputnikShots], …, sputBudget, …, { planeActive })`)
  and the downstream re-add is removed, so plane + swarm hold the joint NICBMS(8)
  ceiling. Priority-order comments corrected to match.
- `docs/rom-study/claims/sputnik.json` — MC-SPUT-FIREMAX value 4→3, re-cited from
  ICNORM's `CPX I,4` (:2475) to MIRVER's `\tCMP I,2` at W3MAIN.MAC:2709 (od -c
  byte-verified: tab + `CMP I,2`); meaning rewritten with the operand+1 derivation.
- `tests/citations-source.test.ts` — DERIVED consistency block updated: SPUTFIRE_MAX
  now decodes immediate(`CMP I,2`)+1 = 3 (apparatus edit, the sanctioned mc5-5
  pattern; TEA's behavior tests untouched).

**Tests:** 929/929 GREEN (6 RED at `0ee5834f` → 0). In-play matrix measured on the
exact committed tree: **18/20 firing cells, 43 distinct shots, maxConcurrent 8**
(bars ≥12 / ≥25 / ≤8 — all cleared with margin; TEA's spike was 17/20, 38, maxC 8).
Gates: `npm run lint` clean; byte-checker 194/194 exit 0; purity sweep green.
Orchestrator suite: only the pre-existing jt9-55 failures (already a Delivery
Finding; unrelated). spawn.ts / ICNORM_CAP / LAUHGT / mc5-6 ceiling / WSPFIR seed /
speed-1 all untouched, per instruction.

**Branch:** feat/mc5-2-sputnik-flyacross-launcher (pushed; tip `afc0e2c4` includes
SM's mc5-8 filing)

**Handoff:** To review (round-3 verification of the faithful rework).
