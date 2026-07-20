---
story_id: "jt2-2"
jira_key: "jt2-2"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-2: Enemies — the shared LINET brain, the NSMART/WSMART intelligence budget, promotion to BOUNDR/B2UNDR/SHADOW, EMYTIM divider

## Story Details
- **ID:** jt2-2
- **Jira Key:** jt2-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T12:32:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T11:32:26.708114+00:00 | 2026-07-20T11:34:09Z | 1m 42s |
| red | 2026-07-20T11:34:09Z | 2026-07-20T12:07:20Z | 33m 11s |
| green | 2026-07-20T12:07:20Z | 2026-07-20T12:17:29Z | 10m 9s |
| review | 2026-07-20T12:17:29Z | 2026-07-20T12:32:27Z | 14m 58s |
| finish | 2026-07-20T12:32:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The budget's INPUTS are stubbed as parameters, per the epic seam — the pursuit-nibble seed (`seedBudget(nibble)`) and the 15 s growth firing (`growWanted(budget, enemiesAlive)`) carry no cadence of their own. jt2-5's wave machine must wire them: `WPERSUE` low nibble (JOUSTRV4.SRC:2076-2077) → `seedBudget`, and the CIA 112×8-frame timer (JOUSTRV4.SRC:2094-2096, 2127-2129) → `growWanted` while enemies live. Affects `src/core/enemy.ts` + the future wave machine. *Found by TEA during test design.*
- **Gap** (non-blocking): In-scheduler promotion needs the budget threaded through the process loop (a dumb enemy promoting on wake reads NSMART/WSMART). jt2-2 tests promotion via pure functions (`shouldPromote`/`promote`/`creditDeath`) and wires the `kind: "enemy"` scheduler dispatch to run `stepEnemy` WITHOUT a budget (dumb enemies that never promote). Putting the budget on `GameState` and threading it through `stepFrame` is jt2-5 territory — the same budget/RNG seam the jt2-1 reviewer flagged (LOW: stepFrame does not thread rng through behaviours). Affects `src/core/frame.ts` + `src/core/enemy.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): The smart-brain down-brake magnitudes (BODNVY `$0100`, HUDNVY `$0200`) are DIFFICULTY-SCALED RAM values from the `DYWORD` table (JOUSTRV4.SRC:7311-7332), not fixed `EQU`s — the inline `#$0100`/`#$0200` are the NORMAL-difficulty column the code comments document. jt2-2 pins those normal values plus the robust ORDINAL (bounder brake < hunter brake < shadow drops), which holds across every difficulty column. Full difficulty scaling is a later story if a difficulty system lands. Affects `src/core/enemy.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): The MOUNRI second promotion path — a buzzard remounted by its thrown rider also `INC NSMART` (JOUSTRV4.SRC:3669, claim JT22-015) — is CITED but NOT behaviourally modeled in jt2-2; the rider/remount mechanic itself is jt2-4 (eggs → hatch → remount). When it lands it must debit the budget the same way LINET promotion does. Affects `src/core/enemy.ts` (remount path). *Found by TEA during test design.*
- **Improvement** (non-blocking): The jt2-1 per-frame RNG stir seam stays untouched — every brain jt2-2 models is a deterministic pure function of enemy+player state (no in-frame randomness), so seeded replay reproduces bit-for-bit. The first consumers of enemy-side randomness are SELPLY player-targeting and RADDR/baiter spawn jitter (jt3); the stir seam is theirs to spec. Affects `src/core/frame.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `stepEnemy`'s flight pipeline in `src/core/enemy.ts` is a VERBATIM duplicate of `frame.ts`'s private `stepPlayerEntity` (flap → stepFlight → tickTimeUp → ceiling → wrap → land / ground branch). Duplicated by necessity: `flight.ts` is generated (DO NOT HAND-EDIT) so the shared body can't live there, and importing `frame.ts` into `enemy.ts` would form a cycle (`frame.ts` already imports `stepEnemy`). A later refactor could extract the entity-step pipeline into a small non-generated core seam (e.g. `entity-step.ts`) consumed by both `frame.ts` and `enemy.ts`. Affects `src/core/enemy.ts` + `src/core/frame.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): The enemy's synthetic joystick maps `flapHeld = decision.flap` — a flapping buzzard's wings are down (weaker `GRAVITY_WINGS_DOWN`), a gliding one's are up (stronger `GRAVITY_WINGS_UP`). This is a modeled reading of `CURJOY`; the ROM tracks the flap bit as button state. It passes every jt2-2 test (the buzzard rises whichever gravity applies) but a later fidelity story that ports the exact `CURJOY`/wings-timing state machine should re-confirm it. Affects `src/core/enemy.ts` (`stepEnemy`). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The claim-coverage range labeled `bounder down-brake (BODNVY)` (`tests/enemy-source.test.ts:184`) points at `JOUSTRV4.SRC:3969` — which is `B2XLEN` (the hunter's horizontal look-ahead, claim JT22-025), NOT the `SUBD BODNVY #$0100` brake at `3819`. The brake VALUES ($0100/$0200) are pinned everywhere by `enemy.test.ts:317-319`, and the real brake lines `3819`/`4004` are byte-gated in the LAWS block, so nothing ships on a lie — but the runs-everywhere claim-coverage for the brake is mislabeled and never pins `3819`/`4004`. A later TEA pass should repoint that range (or add JT22 claims at 3819/4004). Affects `tests/enemy-source.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): The ROM distinction "bounder tracks its OWN remembered line (`PPOSY,U`, JT22-029) vs shadow tracks the live PLAYER line (`PPOSY+1,X`, JT22-028)" is cited but NOT behaviourally modeled — `smartDecision()` has all three brains seek toward the single passed `PlayerView`. Inside TEA's logged deviation #1 (distinguishing-behaviour scope; descent-style is the pinned axis). The later fidelity story (or jt2-5, when smart brains actually go live in the scheduler) must give the bounder/hunter their own-line target. Affects `src/core/enemy.ts` (`smartDecision`). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 9 findings (4 Gap, 0 Conflict, 2 Question, 3 Improvement)
**Blocking:** None

- **Gap (jt2-5 seam, TEA):** the budget's INPUTS are stubbed as parameters — jt2-5's wave machine must wire WPERSUE low nibble (JOUSTRV4.SRC:2076-2077) → `seedBudget`, and the CIA 112×8-frame timer (JOUSTRV4.SRC:2094-2096, 2127-2129) → `growWanted` while enemies live.
- **Gap (jt2-5 seam, TEA):** in-scheduler promotion needs the budget threaded through `stepFrame` (budget on GameState); jt2-2's scheduler-driven enemies are dumb-only. Reviewer adds: when smart brains go live there, pin per-brain `runBrain` dispatch assertions (b2undr/shadow arms are currently dispatch-untested) and give bounder/hunter their own-line target (JT22-028/029).
- **Question (TEA):** smart-brain brake magnitudes ($0100/$0200) are the NORMAL-difficulty column of the difficulty-scaled DYWORD table (JOUSTRV4.SRC:7311-7332); full difficulty scaling is a later story. The pinned ordinal (bounder < hunter < shadow drops) holds across all columns.
- **Improvement (TEA):** the jt2-1 RNG stir seam stays untouched — all jt2-2 brains are deterministic pure functions; first enemy-side randomness consumers (SELPLY targeting, baiter jitter) are jt3's to spec.
- **Improvement (Dev):** `stepEnemy`'s flight pipeline is a deliberate verbatim duplicate of `frame.ts`'s private `stepPlayerEntity` (generated flight.ts can't host it; importing frame.ts would cycle) — a later refactor can extract an `entity-step.ts` seam consumed by both.
- **Improvement (Reviewer):** the claim-coverage range labeled `bounder down-brake (BODNVY)` (tests/enemy-source.test.ts:184) points at JOUSTRV4.SRC:3969 (B2XLEN) instead of the brake at 3819/4004 — values still pinned elsewhere; a later TEA pass should repoint the range or add claims at 3819/4004.

- **Gap:** The MOUNRI second promotion path — a buzzard remounted by its thrown rider also `INC NSMART` (JOUSTRV4.SRC:3669, claim JT22-015) — is CITED but NOT behaviourally modeled in jt2-2; the rider/remount mechanic itself is jt2-4 (eggs → hatch → remount). When it lands it must debit the budget the same way LINET promotion does. Affects `src/core/enemy.ts`.
- **Question:** The enemy's synthetic joystick maps `flapHeld = decision.flap` — a flapping buzzard's wings are down (weaker `GRAVITY_WINGS_DOWN`), a gliding one's are up (stronger `GRAVITY_WINGS_UP`). This is a modeled reading of `CURJOY`; the ROM tracks the flap bit as button state. It passes every jt2-2 test (the buzzard rises whichever gravity applies) but a later fidelity story that ports the exact `CURJOY`/wings-timing state machine should re-confirm it. Affects `src/core/enemy.ts`.
- **Gap:** The ROM distinction "bounder tracks its OWN remembered line (`PPOSY,U`, JT22-029) vs shadow tracks the live PLAYER line (`PPOSY+1,X`, JT22-028)" is cited but NOT behaviourally modeled — `smartDecision()` has all three brains seek toward the single passed `PlayerView`. Inside TEA's logged deviation #1 (distinguishing-behaviour scope; descent-style is the pinned axis). The later fidelity story (or jt2-5, when smart brains actually go live in the scheduler) must give the bounder/hunter their own-line target. Affects `src/core/enemy.ts`.

### Downstream Effects

- **`src/core`** — 3 findings

### Deviation Justifications

2 deviations

- **Smart brains modeled at the distinguishing-behaviour level, not a full state-machine port**
  - Rationale: faithful to the epic's seam philosophy; three complete 6809 pursuit ports are disproportionate to a 5-pt story and would over-constrain GREEN. The cited descent-style triple is pairwise-distinguishable and deterministic, satisfying AC-4's letter; the constants for a deeper future port are already claimed.
  - Severity: minor
  - Forward impact: a later fidelity story can deepen each brain's flap-timer + cliff look-ahead; the constants are committed.
- **Growth cadence pinned at the ROM's exact 896 frames, not the story's rounded 900**
  - Rationale: the ROM value is the ground truth; 896 / 60.096 Hz ≈ 14.9 s, which is what the source comment "AFTER 15 SECONDS" documents.
  - Severity: minor
  - Forward impact: none (896 ≈ 900 ≈ 15 s).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Smart brains modeled at the distinguishing-behaviour level, not a full state-machine port**
  - Spec source: context-story-jt2-2.md, AC-4 ("All three smart brains produce distinct, cited behaviours per their JOUSTRV4.SRC blocks; deterministic under seeded replay").
  - Spec text: "bounder/hunter/shadow-lord pursuit differences per their JOUSTRV4.SRC blocks".
  - Implementation: Tests pin the three brains via their CITED distinguishing dimensions — the descent style (bounder brakes at BODNVY `$0100`, hunter tolerates HUDNVY `$0200`, shadow lord DROPS / only escapes lava, JOUSTRV4.SRC:3819/4004/4246-4254), the shared up-seek skeleton, shadow tracking the PLAYER line vs bounder its OWN (JOUSTRV4.SRC:4279 vs 3905), and determinism — NOT the full ~200-line-each flap-timer state machines or the horizontal cliff-avoidance projection (B2XLEN/SHXLEN pinned as provenance-only claims JT22-025/026).
  - Rationale: faithful to the epic's seam philosophy; three complete 6809 pursuit ports are disproportionate to a 5-pt story and would over-constrain GREEN. The cited descent-style triple is pairwise-distinguishable and deterministic, satisfying AC-4's letter; the constants for a deeper future port are already claimed.
  - Severity: minor
  - Forward impact: a later fidelity story can deepen each brain's flap-timer + cliff look-ahead; the constants are committed.
- **Growth cadence pinned at the ROM's exact 896 frames, not the story's rounded 900**
  - Spec source: context-story-jt2-2.md, AC-2 ("+1 every 15 s (900 frames)").
  - Spec text: "+1 every 15 s (900 frames) while enemies live".
  - Implementation: `INTEL_GROWTH_FRAMES` is pinned at 112 × 8 = 896 (PDELAY reload JOUSTRV4.SRC:2094 × PCNAP 8 JOUSTRV4.SRC:2096), the exact mechanism; the story's "900" rounds it.
  - Rationale: the ROM value is the ground truth; 896 / 60.096 Hz ≈ 14.9 s, which is what the source comment "AFTER 15 SECONDS" documents.
  - Severity: minor
  - Forward impact: none (896 ≈ 900 ≈ 15 s).

## Sm Assessment

Setup complete and verified on disk: session file with bare workflow field and setup phase, story context generated and validated, branch feat/jt2-2-enemies-linet-budget cut off develop at c866c96 (jt2-1's merge), story in_progress. Epic context untouched per override. Merge gate clear. Peloton-subagent mode continues (bz4 precedent), merges pre-authorized by the user. Next owner is TEA for red: pin the LINET lane-tracking law, the NSMART/WSMART budget laws with the IFN DEBUG oracles, the promotion rule, and the EMYTIM divider (integrate-every-Nth-frame, not a speed scale), riding jt2-1's scheduler.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing for the right reason — ready for Dev/GREEN)
**Branch:** `feat/jt2-2-enemies-linet-budget` · **Commit:** `42b990e`

**Test files (absolute):**
- `/Users/slabgorb/Projects/a-2/joust/tests/helpers/enemy-contract.ts` — the enemy module CONTRACT (TEA-authored, loadFlight/loadScheduler pattern): the `IntelBudget`, `EnemyState`, `Decision`, `PlayerView`, `EnemyProcessSpec` types; the cited constants; `linetTarget`/`linet`, `seedBudget`/`growWanted`/`shouldPromote`/`promote`/`creditDeath`, `boundr`/`b2undr`/`shadow`/`runBrain`, and `stepEnemy`. `loadEnemy()` dynamic-imports `src/core/enemy.js` and throws a self-describing "enemy core not built yet" until it exists.
- `/Users/slabgorb/Projects/a-2/joust/tests/enemy.test.ts` — 31 behavioural tests (30 RED via the clean throw, 1 green fixture-sanity).
- `/Users/slabgorb/Projects/a-2/joust/tests/enemy-source.test.ts` — provenance suite, all GREEN: every law re-derived from the vendored 1982 source (byte-gated) + pinned by a committed claim + the EMYTIM-divider ruling guarded.
- `/Users/slabgorb/Projects/a-2/joust/docs/rom-study/claims/enemy.json` — 29 new JT22-001..029 transcription claims (byte-verified against the vendored tree by the citations suite).

**What is pinned (the ACs):**
- **AC-1 LINET (dumb lane-tracking)** — the three cliff-tier lanes `$45/$81/$D0` and the `$20` band verbatim; `linetTarget` picks the NEAR lane with a strict `<` (the `BLO` edge: `$64`→`$45`, `$65`→`$81`, `$A0`→`$81`, `$A1`→`$D0`); flap iff BELOW the lane AND not already rising (`velY >= 0`); no flap at/above the lane or while rising; dir follows facing both ways; the dumb brain ignores the player. A promoted enemy runs its smart brain, a dumb one runs LINET.
- **AC-2 the budget** — seed WSMART from the pursuit NIBBLE (`ANDA #$0F`, high nibble masked off), NSMART 0; `growWanted` +1 while enemies live, no growth with none alive, saturates at 255; the 896-frame cadence (112 × 8) exposed as constants; promotion debits (`INC NSMART`, PCHASE 0→1, brain→decision) only while `NSMART < WSMART`, never re-promotes an already-smart enemy (the PCHASE-had-better-be-zero throw); death credits back by exactly the PCHASE flag; **the IFN DEBUG oracle** — promote three, kill all three smart (plus dumb deaths that change nothing) → `NSMART == 0` at wave end.
- **AC-3 the EMYTIM divider** — via the jt2-1 scheduler: an EMYTIM=2 enemy process (`period = 2`) wakes on exactly every 2nd frame (`[2,4,6,8]`) while EMYTIM=1 wakes every frame; over an 8-frame window it travels HALF as far (8px vs 16px) with the SAME +2px per-step move — a divider (fewer integration steps), not a halved velocity.
- **AC-4 three distinct smart brains** — the cited down-brake thresholds (BOUNDR `$0100` < B2UNDR `$0200`); all three seek up toward a player above (shared skeleton); they descend DIFFERENTLY (at fall `$0180`: bounder brakes, hunter tolerates, shadow drops → pairwise distinct; at `$0280`: hunter brakes, shadow still drops); the shadow lord flaps ONLY to escape the lava below `$D3`; deterministic (same input → same decision).
- **Buzzards flap on the shared flight core** — a dumb enemy below its lane FLAPS and rises (posY decreases) via the very `flap()`/`stepFlight()` a player uses; an `kind: "enemy"` process is a real member of the scheduler tagged union and integrates on wake.
- **Purity** — `stepEnemy`/`promote`/`creditDeath` never mutate their arguments.

**Red run (real vitest output):**
- New enemy suite alone: `Test Files 1 failed | 1 passed (2)` · `Tests 30 failed | 76 passed (106)` — every one of the 30 failures is the clean `loadEnemy` throw "enemy core not built yet — GREEN (Julia) creates joust/src/core/enemy.ts …" (audited: 0 TypeError/SyntaxError/AssertionError, no import/type traces mask any assertion). `tests/enemy-source.test.ts` fully green (byte-gated laws ran — vendored tree present — plus every CITED_RANGE covered by a committed claim).
- Full suite: `Test Files 1 failed | 17 passed (18)` · `Tests 30 failed | 530 passed (560)`. The pre-existing 454 stay green, including the citations gate ("every committed claim re-opens byte-for-byte") with the 29 new JT22 claims. `npx tsc --noEmit` exits 0.
- Representative failing tests: `AC-1 — LINET lane-tracking … picks the NEAREST lane through the ±$20 band`; `AC-2 — the intelligence budget … ORACLE: the ledger balances to zero once every promoted enemy has died`; `AC-3 — the EMYTIM divider … over any window travels HALF as far — with the SAME per-step move`; `AC-4 — three distinct smart brains … DESCEND differently at a moderate fall — the three are pairwise distinct`; `enemies fly the shared flight core (buzzards flap) … a dumb enemy below its lane FLAPS and rises when stepped`.

**What Dev (GREEN) must implement:**
1. **Create `joust/src/core/enemy.ts`** satisfying `tests/helpers/enemy-contract.ts` — a pure `src/core` module (no clock, no `Math.random`; the jt1-7 purity scanner sweeps it):
   - Constants: `AOFF_LINES = [0x45,0x81,0xD0]`, `AOFF_BAND = 0x20`, `EMYTIM_NORMAL = 1`, `EMYTIM_SLOW = 2`, `INTEL_GROWTH_NAPS = 112`, `INTEL_GROWTH_NAP_FRAMES = 8`, `INTEL_GROWTH_FRAMES = 896`, `WSMART_MAX = 255`, `BOUNDR_DOWN_BRAKE = 0x100`, `B2UNDR_DOWN_BRAKE = 0x200`, `LAVA_ESCAPE_Y = 0xD3`.
   - `linetTarget(pixelY)` (strict `<` band) and `linet(enemy)` (flap when `pixelY > linetTarget && velY >= 0`; dir = facing).
   - Budget: `seedBudget(nibble)` (`wsmart = nibble & 0x0F`, `nsmart = 0`), `growWanted(budget, alive)` (+1 saturating at 255 iff alive), `shouldPromote` (`nsmart < wsmart`), `promote` (INC nsmart, pchase 0→1, brain→decision; THROW if already smart), `creditDeath` (`nsmart -= pchase`).
   - Brains `boundr`/`b2undr`/`shadow` (Decision) + `runBrain` dispatch: seek up when player above & not rising; down-seek brakes at the brand's threshold (shadow never brakes, only lava-escape below `$D3`); dir = facing. Deterministic.
   - `stepEnemy(enemy, ctx?)`: run the brain, then apply the decision through the SAME flight pipeline (`flap` + `stepFlight` + ceiling/wrap/land) that `frame.ts`'s `stepPlayerEntity` uses (buzzards flap).
2. **Wire a `kind: "enemy"` process into `joust/src/core/frame.ts`**: add an optional `enemy?: EnemyState` payload to the process spec and dispatch `kind === 'enemy'` in `runBehaviour` to run `stepEnemy(p.enemy)`, storing the result back. The EMYTIM divider is the process `period` (2 on waves 1-2) — nothing time-scaling inside `stepEnemy`. No budget threading yet (deferred to jt2-5; dumb enemies don't promote in-scheduler).
3. Keep the whole suite green (454 pre-existing + the enemy suite going GREEN) and `tsc --noEmit` clean. The provenance suite + 29 claims are already committed and green — do not weaken them.

**Design Deviations:** 2 logged under `## Design Deviations > ### TEA (test design)` (smart-brain distinguishing-behaviour scope vs a full state-machine port; growth cadence pinned at the ROM's exact 896 frames vs the story's rounded 900). Both minor.

**Delivery Findings:** 5 logged under `## Delivery Findings > ### TEA (test design)` (budget INPUTS stubbed for jt2-5; in-scheduler promotion needs the budget threaded through `stepFrame`; smart-brain brake magnitudes are difficulty-scaled RAM, normal values + ordinal pinned; MOUNRI remount promotion cited but modeled with jt2-4; the RNG stir seam stays untouched — brains are deterministic). None blocking.

**Handoff:** To Dev (Korben Dallas) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes (GREEN reached — full suite passing)

**Files Changed:**
- `joust/src/core/enemy.ts` (NEW) — the enemy intelligence core: cited constants (`AOFF_LINES`/`AOFF_BAND`, `EMYTIM_NORMAL`/`SLOW`, `INTEL_GROWTH_NAPS`/`NAP_FRAMES`/`FRAMES` = 112×8=896, `WSMART_MAX`, `BOUNDR_DOWN_BRAKE` $0100, `B2UNDR_DOWN_BRAKE` $0200, `LAVA_ESCAPE_Y` $D3); `linetTarget` (strict-< BLO band) + `linet` (flap iff below lane & not rising, dir = facing, player ignored); the budget `seedBudget`/`growWanted`/`shouldPromote`/`promote`/`creditDeath`; the three smart brains `boundr`/`b2undr`/`shadow` + shared `smartDecision` skeleton + `runBrain` dispatch; `stepEnemy` (brain → the shared flight pipeline).
- `joust/src/core/frame.ts` (MODIFIED, +12/-1) — added optional `enemy?: EnemyState` to `ProcessSpec`, imported `stepEnemy`/`EnemyState` from `./enemy.js`, and dispatched `kind === 'enemy'` in `runBehaviour` to `stepEnemy(p.enemy)` on wake. EMYTIM divider = process `period`; no budget threaded through `stepFrame` (jt2-5's seam).

**Key Decisions:**
- **Shared skeleton, cited-distinguishing brains** (honoring TEA's scope deviation): the three smart brains share one `smartDecision(enemy, player, {brake, lavaEscape})` — up-seek when the player's line is above & not rising; down-seek brakes once `velY >= brake` (bounder $0100 < hunter $0200; shadow `brake: Infinity` so it never brakes, `lavaEscape: true` so it flaps only below $D3). No full 6809 flap-timer / cliff-look-ahead port (B2XLEN/SHXLEN stay provenance-only, JT22-025/026).
- **`stepEntity` duplicates `stepPlayerEntity`** verbatim (see Delivery Finding) — flight.ts is generated and importing frame.ts would form a cycle; the duplicate uses the identical flight.ts/arena.ts pure functions, so enemies fly the SAME core.
- **`flapHeld = decision.flap`** — the flapping buzzard's wings-down gravity (Delivery Finding logs the CURJOY caveat).
- Purity preserved: `src/core/enemy.ts` imports only `./flight.js` + `./arena.js` (core-only, no clock/entropy) — the jt1-7 purity scanner now sweeps it and it passes.

**Tests:** 561/561 passing (GREEN). `npx vitest run` → `Test Files 18 passed (18) · Tests 561 passed (561)`. `npx tsc --noEmit` exits 0.
- Reconciliation of the projected 560 vs actual 561: the 30 RED enemy behavioural tests flipped to green (→ 560), and the jt1-7 purity sweep's `it.each` over `src/core/*` gained ONE new passing case for the new `enemy.ts` (`src/core/enemy.ts stays inside the boundary`) → 561. No test/claim/contract file was edited; the provenance suite + 29 JT22 claims stay green untouched.

**Branch:** `feat/jt2-2-enemies-linet-budget` (pushed to origin)
**Commit:** `e30e67f` — `feat(jt2-2): enemy LINET brain, NSMART/WSMART budget, smart brains, EMYTIM divider`

**Delivery Findings:** 2 logged under `## Delivery Findings > ### Dev (implementation)` (stepEntity duplication of stepPlayerEntity — extract a shared entity-step seam later; the `flapHeld = flap` CURJOY modeling caveat). Neither blocking.

**Handoff:** To Reviewer (Thought Police) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Clean | 6 files +1558/−1; suite 561/561; tsc clean; zero TODO/console/debugger; conventional commits; branch synced with origin; origin/develop unmoved since base c866c96; no PR yet. ("3 citation errors" = pre-existing jt1-9 error-path fixture inside a passing test.) | ACCEPTED — independently re-ran the enemy suites (106/106) and confirmed the diffstat + clean tree. |
| 2 | reviewer-test-analyzer | Yes | 7 findings | 4×[HIGH] mutation-proven test gaps (runBrain b2undr/shadow dispatch; smart seek-up `velY>=0` guard; down-brake `velY===brake` boundary; lava `enemyY===$D3` boundary) + 3×[MED] (promote() unguarded vs shouldPromote; creditDeath below-zero unpinned; scheduler passes no player ctx). Reverted cleanly, tree verified. | 4×HIGH → CHALLENGED/DOWNGRADED to MED: shipped code is correct at each site; the gaps are regression-robustness only, and the smart-brain paths are UNREACHABLE at jt2-2 runtime (no budget threading — deferred to jt2-5). 3×MED → ACCEPTED as by-design / deferred (see rulings). None blocking. |
| 3 | reviewer-security | Yes | Clean | 0 findings — pure computation; `growWanted` saturates; no pollution surfaces; `promote()` throw is an internal invariant guard (no leakage). | ACCEPTED — confirmed on my own read: no entropy, no clock, no shell/browser surface, no unhandled runtime throw path in jt2-2. |
| 4 | reviewer-rule-checker | Yes | Clean (5/5, 0 violations) | 22/29 JT22 claims spot-checked byte-exact (incl. BLO/BPL/BMI branch semantics); purity green; EMYTIM confirmed divider-shaped (period-based, constants never referenced inside the step); Dev commit src-only; flight.ts untouched. | ACCEPTED — consistent with the committed claim verbatims I spot-checked (JT22-016/017/027/028/029) and with `stepEntity` being a byte-for-byte match of frame.ts `stepPlayerEntity` (no physics divergence). |

**All received: Yes**

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** scheduler `stepFrame` → `runBehaviour` → (`kind === 'enemy' && p.enemy`) → `stepEnemy(p.enemy)` [no player ctx] → `runBrain(enemy, null)` → at jt2-2 runtime `brain` is always `'linet'` (nothing promotes in-scheduler) → `linet(enemy)` → `Decision` → `stepEntity` → the shared `flight.ts` pipeline → new `entity`. Safe: pure functions throughout; `player?.pixelY` and `ctx?.player ?? null` guard the null path; the `promote()` invariant throw is never reached from the scheduler this story.

**Pattern observed:** `stepEntity` (`src/core/enemy.ts:297-322`) is a byte-for-byte duplicate of `stepPlayerEntity` (`src/core/frame.ts`) — verified line-by-line. Enemies fly the identical physics; the duplication is DRY-only (Dev logged the extract-a-seam follow-up), not a divergence. Dispatch pattern in `frame.ts:203-205` mirrors the existing `kind === 'player' && p.entity` tagged-union guard.

**Error handling:** `promote()` throws the PCHASE-better-be-zero invariant on double-promote (`enemy.ts:192-197`) — an internal guard, unreachable from the jt2-2 scheduler. `growWanted` saturates at 255 (`enemy.ts:173`). `creditDeath` is an unclamped `SUBA` (faithful to ROM). No swallowed errors; the `return p` fall-through for a payload-less enemy process matches the existing player-branch idiom.

**Observations (5+):**
1. Transcription is faithful — `linetTarget` strict `<` bands (BLO), `linet` flap-iff-below-and-`velY>=0`, `seedBudget` low-nibble mask, brake ordinal $0100 < $0200, lava-escape strict `> $D3` — all match cited comments + committed claim verbatims.
2. `stepEntity` == `stepPlayerEntity` verbatim (physics parity confirmed, no bug).
3. The four [HIGH] test gaps are all sites where the CODE is correct; only exact boundaries / dead dispatch arms lack pinning.
4. The smart brains are never run through the scheduler in jt2-2 (budget threading deferred to jt2-5) — so the entire smart-brain surface (incl. the untested dispatch arms) is unreachable at runtime this story.
5. Provenance nit: the `bounder down-brake (BODNVY)` claim-coverage range points at line 3969 (B2XLEN), not 3819 — brake VALUES still pinned by `enemy.test.ts:317-319`; logged as a non-blocking Delivery Finding.
6. Cited-but-unmodeled: bounder-own-line vs shadow-player-line (JT22-028/029) — inside TEA deviation #1; logged as a non-blocking Delivery Finding.

**Findings by severity (with rulings on each specialist finding):**

*No Critical or High findings survive review.*

[TEST][MED] runBrain `b2undr`/`shadow` dispatch untested (`enemy.ts:280-283`) — DOWNGRADED from HIGH. See the explicit AC-4 ruling below. Non-blocking; recommended (not required) fix.

[TEST][MED] Smart seek-up `velY >= 0` guard untested (`enemy.ts:238`); down-brake `velY === brake` boundary untested (`enemy.ts:240`, `>=`→`>`); lava `enemyY === $D3` boundary untested (`enemy.ts:235`, `>`→`>=`) — DOWNGRADED from HIGH. All three sites are correct as shipped (match cited ROM comments + rule-checker byte-exact); the gap is exact-equality regression protection only, and these functions are unreachable via the jt2-2 runtime path. Recommended: TEA pin the three boundaries when the smart brains go live in jt2-5. Non-blocking.

[TEST][MED] `promote()` unguarded when `nsmart >= wsmart` (`enemy.ts:188-202`) — ACCEPTED as by-design, DISMISSED as a defect. `promote()` is the debit primitive; `shouldPromote()` is the separate gate the caller (jt2-5) composes. Adding a throw would over-constrain and diverge from the ROM's `BLO`-then-`INC` split. No change required.

[TEST][MED] `creditDeath` below-zero unpinned (`enemy.ts:209-211`) — ACCEPTED, DISMISSED as a defect. ROM is an unclamped `LDA NSMART / SUBA PCHASE,U`; the shipped unclamped form is the FAITHFUL one and the ledger-to-zero oracle (`enemy.test.ts:228-249`) proves it balances. A clamp would DIVERGE. No change required.

[TEST][MED] Scheduler passes no player ctx to `stepEnemy` (`frame.ts:204`) — ACCEPTED as in-scope-by-design. The code comment defers budget/player threading to jt2-5; jt2-2's ACs pin `stepEnemy` behaviour via direct calls, and only dumb (linet, player-ignoring) enemies run in-scheduler this story. Non-blocking; the seam is already logged by TEA + Dev as a jt2-5 Delivery Finding.

[SEC] Clean — no findings (concur).

[RULE] Clean — 5/5, 0 violations (concur; consistent with committed verbatims + purity sweep picking up `src/core/enemy.ts`).

[PREFLIGHT] Clean — concur (independently re-verified 106/106 on the enemy suites, tsc 0, tree clean).

**KEY RULING — AC-4 and the runBrain dispatch gap:**

AC-4 ("all three smart brains produce distinct, cited behaviours; deterministic under seeded replay") is **SATISFIED**. AC-4 is a claim about the three brain FUNCTIONS, and those are directly tested and proven pairwise-distinct on their cited descent styles (`enemy.test.ts:331-354`: bounder brakes @384, hunter tolerates @384/brakes @640, shadow drops) and deterministic (`enemy.test.ts:364-371`). The `runBrain` dispatch is plumbing that selects a brain by `enemy.brain`; its mechanism is already pinned by the `boundr` case (`enemy.test.ts:169`) and the `linet`/default case (`enemy.test.ts:132-133`). The unpinned `b2undr`/`shadow` arms are a real test-robustness gap, but they do NOT make AC-4 unmet, because: (1) the dispatch is 6 lines of trivial switch whose mechanism is already proven by two of its arms; (2) at jt2-2 runtime NO enemy is promoted in-scheduler (budget threading is TEA/Dev-logged as deferred to jt2-5), so `runBrain` only ever hits `default: linet` in production this story — the smart arms are unreachable dead paths until jt2-5; (3) jt2-5 threads the budget and jt2-7 renders, both exercising real promotion → dispatch → behaviour end-to-end. Therefore: **NOT blocking**, and I downgrade the specialist's [HIGH] to [MED]. RECOMMENDED (non-blocking): TEA add a 3-line per-brain dispatch assertion — `expect(runBrain(promotedTo('b2undr'), player)).toEqual(e.b2undr(enemy, player))` and likewise for `shadow` — ideally as the first thing jt2-5's TEA does when the smart brains go live in the scheduler.

**Deviation audit:**
- TEA deviation #1 (smart brains at distinguishing-behaviour level, not a full state-machine port) — **ACCEPTED**. Faithful to the epic's seam philosophy; the descent-style triple is pairwise-distinguishable and deterministic (AC-4's letter); the deeper constants (own-line vs player-line, B2XLEN/SHXLEN cliff look-ahead) are committed as provenance claims for the later fidelity story. Proportionate to a 5-pt story.
- TEA deviation #2 (growth pinned at the ROM-exact 896 frames vs the story's rounded 900) — **ACCEPTED**. 112 × 8 = 896 is the exact PDELAY×PCNAP mechanism; 896 / 60.096 Hz ≈ 14.9 s matches the source comment "AFTER 15 SECONDS". More faithful than the AC text; the round 900 was never ground truth.

**AC coverage:** AC-1 (LINET targets/band/promotion, cited + claims, citations green) ✓ · AC-2 (budget seed/+1-while-alive/debit/credit + zero-at-wave-end oracle) ✓ · AC-3 (EMYTIM=2 integrates every 2nd frame, half displacement, divider-not-scale, proven on the scheduler) ✓ · AC-4 (three distinct cited brains, deterministic) ✓ (see ruling).

**Required before merge:** None. Two non-blocking Delivery Findings recorded for a later pass (repoint the BODNVY claim-coverage range; model bounder-own-line when smart brains go live). Recommended-not-required: per-brain dispatch assertions in jt2-5.

**Handoff:** To SM for finish-story.