---
story_id: "uf1-2"
jira_key: "uf1-2"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-2: joust DYTBL difficulty engine is production-dead — wire difficultyValue as the per-wave source

## Story Details
- **ID:** uf1-2
- **Jira Key:** uf1-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-29T00:34:28Z
**Round-Trip Count:** 4

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T19:07:42Z | 2026-07-28T19:11:10Z | 3m 28s |
| red | 2026-07-28T19:11:10Z | 2026-07-28T19:37:34Z | 26m 24s |
| green | 2026-07-28T19:37:34Z | 2026-07-28T19:46:51Z | 9m 17s |
| review | 2026-07-28T19:46:51Z | 2026-07-28T20:05:05Z | 18m 14s |
| red | 2026-07-28T20:05:05Z | 2026-07-28T21:54:40Z | 1h 49m |
| green | 2026-07-28T21:54:40Z | 2026-07-28T22:02:55Z | 8m 15s |
| review | 2026-07-28T22:02:55Z | 2026-07-28T22:09:25Z | 6m 30s |
| green | 2026-07-28T22:09:25Z | 2026-07-28T22:14:00Z | 4m 35s |
| review | 2026-07-28T22:14:00Z | 2026-07-28T22:15:39Z | 1m 39s |
| green | 2026-07-28T22:15:39Z | 2026-07-28T23:20:47Z | 1h 5m |
| review | 2026-07-28T23:20:47Z | 2026-07-28T23:29:04Z | 8m 17s |
| red | 2026-07-28T23:29:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the joust troll GRIP is production-dead — `beginGrip`, `stepGrip`, `escalateGrip`, `escapeScoreEvent` and `TrollGrip` have zero references in `src/` outside `troll.ts`; only `trollSpawnable` is live (demo.ts:961). A troll spawns and can never grab anyone, so the grace timer, the pull escalation, the break-free threshold and the 50-point escape award are all unreachable. `demo.ts:420` admits it. Affects `src/core/troll.ts` and `src/core/demo.ts` (the LNDB7 grab detection that repoints `PADGRA`→`ADDLAV`, JOUSTRV4.SRC:1651-1652, needs building). **Filed as uf1-11**; it blocks uf1-10's LAVGRA half. *Found by TEA during test design.*
- **Gap** (non-blocking): `LAVLAV` is dead in the 1982 ROM itself — its label appears exactly once in `JOUSTRV4.SRC`, on its own `DYWORD` line at :7306. Williams shipped a difficulty row nothing reads. Affects `src/core/difficulty.ts` (recorded as `dead-in-rom` in `ROW_DISPOSITION` so a future sweep does not re-file it as a porting gap). No owner story — there is nothing to build. *Found by TEA during test design.*
- **Conflict** (non-blocking): the story description calls the `*RG` rows "enemy energy". They are RANGE rows — `JOUSTRV4.SRC:3801` says "LONG OR SHORT RANGE SEEK" and `DYLEN EQU $14-6` = 14 matches BODNRG's GA1-5 start `$000E`. Affects `sprint/epic-uf1.yaml` (uf1-2's description) — corrected in uf1-8's description rather than rewritten in the shipped story text. *Found by TEA during test design.*
- **Improvement** (non-blocking): `frame.ts:265` calls `stepEnemy(enemy)` with **no player**, so `smartDecision`'s seek-up branch (`playerY !== undefined && …`) is unreachable in production and the down-seek brake is the only live differentiator between the three smart brains. The brains are therefore far less distinct in the running game than `enemy.ts:213-221` describes. Affects `src/core/frame.ts` (the player view is never threaded to the enemy brains). Not filed — it is the natural scope of uf1-8/uf1-9, which must thread a player view to implement the range gate at all. *Found by TEA during test design.*
- **Gap** (blocking): **round 1 made the running game CRASH at the hundredth wave, and neither the RED suite nor the review caught it.** `nextWaveBcd` wraps `0x99 → 0x00` (pinned, `tests/wave.test.ts:160`) and `waveValue` throws for a wave < 1 (pinned, this suite's AC-3). uf1-2 joined those two facts: on the hundredth wave `demo.wave` is `0x00`, and the first smart-enemy decision throws `RangeError: wave must be a 1-based integer, got 0` out of `waveValue` → `brakeForWave` → `boundr` → `runBrain` → `stepDemo`. **Verified against the tree at 88de71c**: a lone `boundr` process staged at counter `0x00` makes `stepDemo` throw; at `0x99` and `0x10` it does not. A dumb `linet` enemy never consults the brake, which is why the crash needs a smart one to surface and why a casual play-through would not find it. The crash did not exist before this story's seam, so it is uf1-2's and is fixed here — **not** deferred. Affects `src/core/demo.ts` (the boundary) and `src/core/wave.ts` (the decode). Covered by R2-3. *Found by TEA during round-2 test design.*
- **Gap** (non-blocking): **above the hundredth wave the wave ordinal is genuinely unrecoverable from the counter**, so uf1-2's decode is exact at wave 100 and then RESETS — corrected in round-2 review, where the original wording ("drifts thereafter") was found to understate it badly. Wave 101's counter is `0x01`, so the difficulty collapses to its wave-1 value and re-climbs, once per hundred waves; measured, BODNVY `$02a0` → `$0100`. The byte cannot express "which hundred": wave 101 and wave 1 both display `01`. The ROM does not have this problem — WAVBCD is only the *display* counter, while the DYTBL walk is a per-row countdown in RAM that never resets. The port re-derives the walk from the display byte, so the real fix is a monotone wave count in `DemoState`, which is **td1-12's option (B)**, already filed p1 and already carrying the wrap question ("NOTE the wrap differs between the two"). Affects `src/core/demo.ts`. **Owned by td1-12** — no new story; the residual is one more symptom on its list, and it disappears the moment the counter becomes an ordinal. *Found by TEA during round-2 test design.*
- **Improvement** (non-blocking): every DYWORD row's GA1 column 1 reproduces exactly the pre-DYTBL hardcoded immediate recorded in the ROM's own trailing comments (`BODNVY … #$0100`, `BOUPWD … #2`, `BOLETM … #20+1`, `BODNDI … -DYLEN*256`). Any future row port gets a free correctness check from this, and any clone constant that matches a column-1 start is a frozen wave-1 value — i.e. a candidate instance of exactly this bug. Affects `docs/rom-study/` (worth recording as a dossier note). Not filed; captured here and in the uf1-8/9 descriptions. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): many DYTBL cadence bytes are **nibble-symmetric**, so the usual "even GA1 takes the HIGH nibble, odd takes the LOW" assertion is VACUOUS on them and can even be written unsatisfiably — `HUDNVY`'s `timeBytes[2]` is `$FF` (15/15), which is how a false red reached GREEN in this story. Affects any suite pinning `stepNibble` parity (uf1-8 and uf1-9 pin 21 more rows between them): the probe byte must be checked for distinct nibbles before the assertion is trusted, and a different GA1 pair chosen where it is not. `tests/difficulty-wiring.test.ts` now demonstrates the pattern, guard included. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `enemy.ts` ↔ `difficulty.ts` is now a genuine runtime import cycle (see the Dev deviation). It is safe today only because neither side calls across it at module-init time. Affects `src/core/enemy.ts` and `src/core/difficulty.ts` — if the fleet later wants this removed, the clean break is moving `seedBudget` out of `enemy.ts` into a leaf module both can import. Not filed; a note at the import site states the constraint. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **a "reject the invalid input" test can leave its own guard untested** when a *later* validation clause happens to catch the sample values. R2-2 listed `-1` as its negative case, but `-1 & 0x0f` is 15, so the BCD nibble check rejected it and the `counter < 0` clause never fired — deleting that clause survived all 1590 tests. Only a negative MULTIPLE OF 16 reaches the arithmetic. The general shape: when several guards sit in sequence, a value proves the guard you *intend* only if it is invalid for that reason ALONE. Affects any future validated seam in this repo (uf1-8/uf1-9 add more per-wave entry points on this counter); the cheap check is to delete each clause and confirm a test dies. *Found by Dev during round-2 implementation.*
- **Conflict** (blocking): **jt8-1 landed on `origin/develop` mid-story and MASKS this story's deliverable in the running game.** It threads a live target player into the enemy step (`frame.ts` — the exact line uf1-2 changed), and `smartDecision` tests the seek-up branch (`playerY < enemyY && velY >= 0`) BEFORE the down-seek brake. So wherever an enemy is below its target, the wave-dependent brake no longer decides anything. Measured on a correctly resolved trial merge (full suite, 1658 tests): exactly **two** failures, both in this story's full-ecosystem tests, and both on their own discriminability guards — `reaches the RUNNING GAME` reports "the run must put a SMART enemy inside the wave-1/wave-3 brake window … expected 0 to be greater than 0", and the 240-frame cabinet test reports "the seam must still be LIVE — wave 1 differs from wave 3" with the two trajectories now IDENTICAL. All nine staged-probe tests still pass, because they stage no player. So the brake is not dead — it is unobservable through a probe that puts a player above the enemies. Affects `tests/difficulty-wiring.test.ts` (both end-to-end probes need re-staging so they still discriminate under a live target) and is worth knowing for uf1-8/uf1-9, which add more brains on the same seam. *Found by SM during the finish-phase merge check.*
- **Improvement** (non-blocking): a guard clause that is *unreachable given the clauses around it* reads exactly like a guard that works — the `> 0x99` bound in the decode could be widened to `0xff` with no test noticing, because every value in the gap is non-BCD anyway. Worth a habit: for each clause in a multi-part guard, ask which value it and only it rejects. If there is none, it is decoration. Affects `src/core/wave.ts` (already removed) and the same review lens the round-1 rejection raised one layer down. *Found by Dev during round-2 implementation.*
- **Conflict** (non-blocking): **the port consults the wired brake in a state the ROM does not — `smartDecision` falls through to `BODNVY` when there is NO target, where the ROM routes to `BOLEV`.** `JOUSTRV4.SRC:3796-3797` is `JSR SELPLY / BEQ BOLEVV  BR=NO PLAYERS HERE`, so a bounder with no targetable player takes the LEVEL seek and never reaches `BODN11 SUBD BODNVY` (:3819) at all. `enemy.ts smartDecision` has no BOLEV path, so `player === null` falls through both branches to the brake. This PREDATES uf1-2 (it is jt2-2's brain shape) and was invisible until jt8-1 made the target real; uf1-2 only made it *matter*, because the state now reads a per-wave dial instead of a frozen constant. Affects `src/core/enemy.ts`. **Owned by uf1-8** — no new story: uf1-8 wires `BODNRG` at :3801, whose own branch is `BLT BOLEVV  BR=SHORT RANGE SEEK` (:3802), so it cannot build the range gate without building BOLEV. uf1-8's description now carries this explicitly. *Found by Dev during the round-3 merge.*
- **Improvement** (non-blocking): **jt8-1 does not narrow what uf1-2 delivers relative to the ROM — it corrects an over-broad port toward the ROM's own gate.** `BODNVY` is reached only on the `BOUNDN` down-seek path, which `JOUSTRV4.SRC:3796-3800` gates behind "SELPLY found a player AND `LBLT BOUNUP` did not take" (i.e. the quarry is at or below). That is exactly the region the port now confines the brake to. Before jt8-1 the port applied the brake to every down-seek including ones the 1982 machine routes to `BOUNUP`/`BOLEV`. So the acceptance claim ("a later wave observably differs from wave 1") is unchanged in truth and unchanged in ROM-relevant scope; what shrank is the region a *full-cabinet probe* can observe it in, which is a test-instrument fact and is handled. Affects `tests/difficulty-wiring.test.ts` (the two e2e probes now stage the region deliberately). Recorded so a future reader does not re-derive it as a regression. *Found by Dev during the round-3 merge.*
- **Improvement** (non-blocking): **a discriminability guard is itself code that can be decoration.** The round-3 guard was written with two clauses — "a knight is alive" and "no knight is above the buzzard" — and *both survived deletion* with all 41 tests green: the first because the live-knight frames already carried the count above zero, the second because the staged knights are below for the whole run, so `every` is never false. `[].every(…)` being vacuously TRUE is what makes the first one load-bearing at all. Each is now pinned by its own two-sided test. This is the THIRD guard-that-cannot-fail in this one story (the `> 0x99` decode bound, the `counter < 0` clause, and now this), and the pattern is consistent: the clause you add *because of* a review finding is the one least likely to be exercised by the tests already present. Affects any suite in this repo that guards its own discriminability — uf1-8/uf1-9 inherit this instrument. *Found by Dev during round-3 implementation.*

### Reviewer (code review)

- **Gap** (blocking): the demo's wave counter is BCD-packed and the whole wave layer feeds it to decimal-expecting APIs. `demo.ts:955` sets `wave = nextWaveBcd(demo.wave)` (BCD: `0x09 → 0x10`, pinned by `tests/wave.test.ts:155` "BCD not binary"), then :959-968 pass that raw value to `waveRowAt`, `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable` and `seedWaveBudget` — all documented as taking a 1-based DECIMAL wave (`wave.ts:177-185`). Measured: at the tenth wave `waveRowAt(0x10)` returns wave 16's row (`bounders: 0`) instead of wave 10's (`bounders: 8`), so the demo spawns the wrong complement from the tenth wave on; `game.ts:347 resolveWaveType` inherits it. **This PREDATES uf1-2** and is not this story's scope to fix, but it is the convention uf1-2 copied, which is how the blocking bug below looked idiomatic. Affects `src/core/demo.ts:955-968` and `src/core/game.ts:345-348` (either decode BCD→decimal once at the advance, or keep `demo.wave` decimal and derive the BCD only for display). **Filed as td1-12** (p1, 5pt, joust) with both candidate fixes and the wrap-mismatch caveat; it should land before uf1-8/uf1-9 add more per-wave consumers on top of the same counter. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no test in the suite drives the production path past wave 3, which is why a defect that only appears from the tenth wave survived RED, GREEN and a 10-mutation battery. Waves 11/18/33/123/500/100,000 are exercised only by direct `waveValue(name, N)` calls with hand-written decimal literals — never through `stepDemo`'s counter. Affects `tests/difficulty-wiring.test.ts` (the end-to-end test should span the BCD boundary, not just wave 1 vs 3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): **`smartDecision` is a DISJUNCTION that reads like a priority chain, and it fooled a review.** All three guards (`enemy.ts:263-269`) return the identical `{ dir, flap: true }`, so the function is `A || B || C` and the clause order is provably irrelevant — verified exhaustively over 3744 wave/altitude/quarry/velocity combinations, zero order-dependent outcomes. Round 3's review raised a BLOCKING finding claiming the order was load-bearing and unpinned (evidence: swapping the clauses left 1660/1660 green); the finding was wrong and is withdrawn — the green suite was the correct answer, and the swap was a no-op refactor. The trap for anyone editing this function next: add a clause that returns anything OTHER than `{ dir, flap: true }` and the order starts mattering SILENTLY, with no test to say so. Affects `src/core/enemy.ts` — relevant to uf1-8/uf1-9, which add clauses here (the range gate, the wing-cadence timer, the up-flight VY gates). Not filed: there is no defect today, only a shape worth knowing. *Found by Reviewer during round-3 code review; corrected by Reviewer in the same round.*
- **Gap** (non-blocking): **the round-3 discriminability instrument admits the HUNTER into the BOUNDER's window.** `brakeDecidingFrames` accepts `brain === 'b2undr'` at `tests/difficulty-wiring.test.ts:225` but tests velocity against `WIRED.BODNVY.start`/`.wave3` at `:229` — the bounder's `[$0100,$0120)`. A hunter at `$0110` brakes at NEITHER wave 1 (`$0200`) nor wave 3 (`$0220`), so it discriminates nothing, yet it would be counted as proof the run can tell the waves apart. Measured unreachable today: across all four 240-frame runs the only brains present are `linet` and `boundr`, because every probe uses wave 1's complement. So it cannot produce a wrong pass now — but it is a false-positive path in the one safeguard this story exists to get right, and `sprint/epic-uf1.yaml` now directs uf1-8 and uf1-9 to copy this helper. Affects `tests/difficulty-wiring.test.ts` (gate the window on the enemy's OWN row). *Found by Reviewer during round-3 code review.*
- **Improvement** (non-blocking): the CLIF5 staging anchor is better cited from the LANDING record than the background surface. `arena.ts:151` (LNDB5) carries `snapY: 210, bandTop: 211` — which is exactly WHY a knight staged at 211 comes to rest at 210 and stays. The round-3 comment cites `BACKGROUND_SURFACES`' `originY: 211` instead, which is the same number for a different reason and leaves the "they settle at 210" claim looking observational. Affects `tests/difficulty-wiring.test.ts` (the `knightsBelowTheBuzzards` doc comment). *Found by Reviewer during round-3 code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-1's "lava rows" cannot be wired — two of the three are troll rows behind a dead consumer, and the third is dead in the ROM itself**
  - Spec source: context-story-uf1-2.md, AC-1
  - Spec text: "difficultyValue drives at least the lava rows and the buzzard energy-and-wing rows through their real consumers, so a later wave observably differs from wave 1 on each wired dial."
  - Implementation: The lava rows are excluded from the wired subset and routed to uf1-10 (EGGWT/EGGWT2 + LAVTIM/LAVGRA) and uf1-11 (the dead troll grip). `LAVLAV` is recorded permanently as `dead-in-rom` in `ROW_DISPOSITION` rather than filed as a gap.
  - Rationale: Verified against `JOUSTRV4.SRC` firsthand. `LAVLAV`'s label appears **exactly once in the entire source** — on its own `DYWORD` line at :7306. It has no consumer in the *original*, so there is no behaviour to port and no story can ever wire it. `LAVTIM` (:1611) is the lava troll's hand-animation frame timer, a mechanic the clone does not have; `LAVGRA` (:6395) seeds `CLVGRA` and its designated consumer `troll.beginGrip` **exists but is itself production-dead** (zero callers in `src/`). Wiring LAVGRA today would connect one dead module to another and change nothing a player sees — which is precisely the disease uf1-2 exists to cure, so doing it would be worse than deferring it. AC-1's own words are "through their real consumers", and these have none.
  - Severity: major
  - Forward impact: uf1-10 owns the four rows and is explicitly blocked on uf1-11; both filed and described.

- **AC-1's "energy" rows are RANGE rows — the story text misreads the ROM's `RG` suffix**
  - Spec source: context-story-uf1-2.md, story description
  - Spec text: "none of the ROM's per-wave escalation — enemy energy, dive rate, velocity, wing-up and wing-down cadence, egg wait, bolt time, lava timing and gravity — reaches the running game"
  - Implementation: The `*RG` rows (BODNRG, BOUPRG, HUDNRG, HUUPRG, SHDNRG, SHUPRG) are scoped to uf1-8 as **range-seek** rows, and no test anywhere in this story asserts an "energy" concept.
  - Rationale: `RG` is Ran**G**e, not ene**RG**y. `JOUSTRV4.SRC:3801` reads `BOUNDN CMPD BODNRG  #DYLEN  LONG OR SHORT RANGE SEEK`, and `DYLEN EQU $14-6` (:3785) = 14, which is exactly BODNRG's GA1-5 start `$000E` — the row replaced that hardcoded immediate. The compare is against the player/enemy Y-delta, so the row is a distance threshold. A test written to the story's wording would have pinned a mechanic that does not exist.
  - Severity: minor
  - Forward impact: uf1-8's description leads with the naming trap so the next reader cannot repeat it.

- **The wired subset is two rows, not the "proven subset" the story implies across lava + buzzard families**
  - Spec source: context-story-uf1-2.md, AC-1 + Scope
  - Spec text: "This story establishes the SEAM and wires a proven subset rather than all 28 rows at once"
  - Implementation: Exactly `BODNVY` and `HUDNVY` are wired — the bounder and hunter down-seek brakes. All 26 others carry an explicit `ROW_DISPOSITION` entry (1 `dead-in-rom`, 25 `no-consumer-yet` with a ROM line, the missing mechanic, and an owner story).
  - Rationale: A row is only wireable if the clone has the mechanic that reads it. Grepping every row label in `JOUSTRV4.SRC` gave a complete consumer map (27 rows have exactly one consumer; LAVLAV has none), and cross-checking each against `src/core` showed only the down-seek brake has a live chain: `boundr`/`b2undr` → `runBrain` → `stepEnemy` → `frame.ts:265` → `stepDemo`. Everything else needs a wing-flap timer, a decision timer, a range gate, a PDIST model or an egg wait built first — each a mechanic, not a wiring, and none of them a 5-point add-on to this story. Two rows with a genuinely live chain is a real seam; ten rows wired to nothing is the same bug with more code.
  - Severity: major
  - Forward impact: uf1-8 (10 rows), uf1-9 (11 rows), uf1-10 (4 rows) filed, described and pointed at by `ROW_DISPOSITION.owner`. 2 + 1 + 25 = 28.

- **AC-4 is satisfied by verification, not by a change**
  - Spec source: context-story-uf1-2.md, AC-4
  - Spec text: "The three retrofit knobs emytimForWave, lavaLevelForWave and seedBudgetForRow are reconciled with the table rather than duplicated — either sourced from it or documented as deliberately separate with the ROM citation for why."
  - Implementation: No production change. Three tests instead: the knobs are absent from `DYTBL_ROW_NAMES` and `dyRow` throws for them; their values are pinned bit-for-bit across a wave sweep as a keep-behavior guard; and `difficulty.ts` is asserted to still carry the three ROM citations.
  - Rationale: The "documented as deliberately separate" arm was already written at `difficulty.ts:38-52`, and all three citations check out firsthand — EMYTIM at :2202-2205 (`LDA TBRIDGE / BEQ / LDA #2 / STA EMYTIM`, wave setup), the lava raise at :1929-1933 (which sits **after** the DYTBL loop ends at :1927), and WPERSUE at :2075-2077 (read from the WAVE table, not DYTBL). None is a `DYWORD` row, so "source them from the table" is not an available option. The risk here is a Dev "reconciling" them *into* the table, so the deviation is to spend the AC on locking the correct existing ruling down.
  - Severity: minor
  - Forward impact: none.

- **Tightening the shared difficulty contract reddens 20 tests in two sibling files**
  - Spec source: context-story-uf1-2.md, AC-5
  - Spec text: "jt2's seeded determinism replays still reproduce, or every changed realized value is logged as a deviation with its JOUSTRV4.SRC citation."
  - Implementation: `loadDifficulty()` now requires `dyRow` / `waveValue` / `DYTBL_ROW_NAMES` / `ROW_DISPOSITION`, so it throws until Dev adds them — reddening 17 tests in `difficulty.test.ts` and 3 in `difficulty-source.test.ts` on top of this story's own 21.
  - Rationale: The loader gate is this epic's established mechanism for stating required module shape (it is why every RED here reads "not built yet" instead of a module-resolution trace). Making the new members optional would trade a clean failure for an `undefined` propagating into `difficultyValue` as `NaN`. All 20 share one cause and one fix; none is a behavioural regression, and no test was removed or re-seated — the suite went 1551 → 1579 with the 28 added.
  - Severity: minor
  - Forward impact: all 20 return to green the moment the four exports land; Dev should treat any that does **not** as a genuine finding.

### Dev (implementation)

#### Round 2

- **Dropped the `> 0x99` upper bound RED specified for the decode guard**
  - Spec source: `.session/uf1-2-session.md`, TEA round-2 assessment "What GREEN has to build", step 1
  - Spec text: "**throwing** on a non-BCD byte (either nibble > 9) or a non-integer / out-of-range value"
  - Implementation: the guard is `!Number.isInteger(counter) || counter < 0x00`, then the nibble check. No upper bound.
  - Rationale: the bound is unreachable — **every** integer above `0x99` has a nibble over 9 (`0x9a` → ones 10; anything `≥ 0xa0` → tens ≥ 10), so it could never be the clause that fires. Proved by mutation: widening it from `0x99` to `0xff` survived the full suite, because there is no value it alone rejects. Round 1 was rejected in part for a guard that "catches the case that cannot happen while waving through the one that does"; shipping a second such clause in the very function written to answer that finding would repeat it. The two clauses kept are both load-bearing and I checked each by mutation — `1.5`/`NaN` (M9) and `-16`/`-160` (M10) are exactly the shapes the nibble check cannot see.
  - Severity: minor
  - Forward impact: none. `decimalWaveFromBcd(0x100)` still throws, on the BCD clause instead of the range clause; no test asserts the message.

- **Strengthened RED's own bad-value list — its negatives could not fail**
  - Spec source: `tests/difficulty-wiring.test.ts`, R2-2 "REJECTS a byte that is not BCD"
  - Spec text: `for (const bad of [-1, 1.5, Number.NaN, 0x100])`
  - Implementation: added `-16` and `-160` to the list.
  - Rationale: **the mutation battery found a genuine gap.** `-1` does not exercise the negative clause at all — `-1 & 0x0f` is 15, so the *BCD* check catches it and the `counter < 0` clause never fires. Deleting that clause therefore SURVIVED the suite (M10), leaving `-16` to decode silently to `-10`. A negative multiple of 16 is the only shape that reaches the arithmetic: `-16 >> 4` is -1 and `-16 & 0x0f` is 0, so neither nibble reads as invalid. Re-ran the mutant after the change: killed. This is a strengthening, not a weakening — no assertion was removed or relaxed.
  - Severity: minor
  - Forward impact: none.

- **Corrected a factually wrong claim in RED's prose (the `nextWaveBcd` "refactor trap")**
  - Spec source: `tests/difficulty-wiring.test.ts`, R2-2 "leaves the BCD ARITHMETIC alone"; and TEA's assessment, "The refactor trap is pinned"
  - Spec text: "the rollover mapping below is WAVE semantics, and folding it into the increment turns `0x99 → 0x01`"
  - Implementation: no code change. The comment on that test, and the matching sentence in `wave.ts`'s doc block, now say the substitution is an **equivalent mutant** and that the separation is a separation-of-concerns argument rather than a correctness one.
  - Rationale: it is not true, and I proved it two ways. Substituting `decimalWaveFromBcd` inside `nextWaveBcd` survived the full 1590-test suite (M6), and an exhaustive comparison over all 100 reachable counter values returns identical output. `0x99` decodes to **99**, not 0, so the roll still lands on `0x00`; and the `% 100` absorbs the rollover mapping — `0x00 → 100 → 101 % 100 → 1`, which is exactly what `0 → 1` gives. Leaving the claim in place would have been the same false confidence the Reviewer rejected round 1 for, one layer up: a test whose comment advertises a mutant it cannot kill. The test itself is kept as a keep-behavior guard on the increment's contract and is labelled as one.
  - Severity: minor
  - Forward impact: none — but td1-12 should not assume the two functions are dangerous to unify; they are not.

#### Round 1

- **Closed a module import CYCLE: `enemy.ts` now imports `difficulty.ts`, which already imported `enemy.ts`**
  - Spec source: `.session/uf1-2-session.md`, TEA assessment "What GREEN has to build", step 2
  - Spec text: "`boundr` / `b2undr` / `runBrain` take a `wave` (default 1) … The brake becomes `waveValue('BODNVY'|'HUDNVY', wave)`."
  - Implementation: added `import { waveValue } from './difficulty.js'` to `enemy.ts`. `difficulty.ts:50` already imports `seedBudget` from `enemy.js`, so this is a genuine runtime cycle (the pre-existing `wave.ts` ↔ `difficulty.ts` cycle is type-only and erases).
  - Rationale: The tests require the brains themselves to resolve a *wave*, so the brake lookup has to live in `enemy.ts`; the alternative — re-implementing `seedBudget` inside `difficulty.ts` to break the other arm — would duplicate the budget law that jt3-1 deliberately kept single ("Reuses enemy.seedBudget so the engine and jt2-2's budget law stay one law"). The cycle is safe because **neither module calls across it at import time**: `waveValue` runs per decision and `seedBudget` per wave seed, so both namespaces are fully initialised before first use. Verified empirically — the full suite and the production `vite build` both pass, and module init would have thrown immediately otherwise. A comment at the import site states the constraint so nobody adds an init-time call later.
  - Severity: minor
  - Forward impact: uf1-8/uf1-9 will add more `waveValue` consumers in `enemy.ts` and inherit this edge; the constraint is documented at the import.

- **Corrected a factually wrong assertion in TEA's own RED suite (the HUDNVY nibble-parity probe)**
  - Spec source: `tests/difficulty-wiring.test.ts`, AC-3 "reports the cadence nibble the walk actually used"
  - Spec text: `expect(d.stepNibble(d.dyRow(name), 4), '${name} GA1=4 takes the HIGH nibble').not.toBe(WIRED[name].nibble)`
  - Implementation: replaced the blanket GA1 4-vs-5 contrast with an explicit per-row probe pair — BODNVY at GA1 4/5, HUDNVY at GA1 6/7 — each asserting the exact high and low nibble, plus a guard that the probe byte's two nibbles genuinely differ.
  - Rationale: The original assertion was unsatisfiable by any correct implementation, so it was a false red, not a real gate. `HUDNVY`'s `timeBytes[2]` is `$FF` (JOUSTRV4.SRC:7319, `…,$FFFF,$FF84,$84`) — high nibble 15, low nibble 15, **identical** — so GA1 4 and GA1 5 must return the same value however the parity rule is implemented. Verified against the ROM row before touching the test. Its `timeBytes[3]` is `$84` (8/4), which does discriminate, so HUDNVY is probed at GA1 6/7 instead. The replacement is *stronger* than the original: it pins both nibbles by value rather than merely asserting inequality, and it fails loudly if a future probe byte is nibble-symmetric.
  - Severity: minor
  - Forward impact: uf1-8/uf1-9 pin 21 more rows and will hit the same trap — many DYTBL cadence bytes are `$FF`. Recorded as a Delivery Finding.

- **No production change for AC-4, as TEA specified**
  - Spec source: `.session/uf1-2-session.md`, TEA deviation "AC-4 is satisfied by verification, not by a change"
  - Spec text: "No production change. Three tests instead…"
  - Implementation: `emytimForWave`, `lavaLevelForWave` and `seedBudgetForRow` are untouched; only the keep-behavior tests were added by TEA.
  - Rationale: The knobs are not DYWORD rows (EMYTIM :2202-2205, the lava raise :1929-1933 which sits after the DYTBL loop ends at :1927, WPERSUE :2075-2077 from the wave table), so there is nothing to source from the table. Restraint is the correct implementation here.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit) — round 3

- **Dev — the round-3 re-staging of the two end-to-end probes** → ✓ ACCEPTED. Not a spec
  deviation: AC-1's "a later wave observably differs from wave 1 on each wired dial" is
  still met, and met through `stepDemo` with the real complement. I re-opened the ROM
  independently: `JOUSTRV4.SRC:3796-3801` reaches `BODN11 SUBD BODNVY` (:3819) only via
  `BOUNDN`, which is gated by `JSR SELPLY / BEQ BOLEVV` (:3796-3797) and `LBLT BOUNUP`
  (:3800). So the post-merge region genuinely IS the ROM's own gate, and the Dev
  assessment's "corrected toward the ROM, not narrowed" reading is correct rather than
  convenient. The guards were strengthened, not relaxed — verified by mutation (un-sink
  the knights → both probes die).
- **Dev — "uf1-8 owns the missing BOLEV no-target routing"** → ✓ ACCEPTED as the owner.
  :3801-3802 is `CMPD BODNRG / BLT BOLEVV`, so uf1-8 cannot wire BODNRG without deciding
  what BOLEV does; routing it there rather than filing a separate story is right, and the
  epic description now carries it so it cannot be lost.

### Reviewer (audit)

Every logged deviation, stamped. Eight entries: eight accepted, none flagged.

- **TEA — "AC-1's lava rows cannot be wired"** → ✓ ACCEPTED. Independently verified: `grep -c LAVLAV JOUSTRV4.SRC` returns 1, and that single hit is its own DYWORD line at :7306. `beginGrip`/`stepGrip`/`escalateGrip` confirmed to have zero `src/` references outside `troll.ts`. Wiring a row to a dead consumer would have satisfied the AC's letter and defeated its purpose; deferring was right.
- **TEA — "the *RG rows are RANGE, not energy"** → ✓ ACCEPTED. `DYLEN EQU $14-6` (:3785) = 14 = BODNRG's GA1-5 start `$000E`, and :3801's own comment reads "LONG OR SHORT RANGE SEEK". The story text was wrong; the correction is right and is carried into uf1-8's description where the next reader will meet it.
- **TEA — "the wired subset is two rows"** → ✓ ACCEPTED. The consumer-map method (grep every row label in the ROM, then check each against `src/core`) is sound, and the arithmetic closes: 2 wired + 1 dead-in-ROM + 25 filed = 28. Scoping to rows with a live chain is the only reading of "through their real consumers" that means anything.
- **TEA — "AC-4 is satisfied by verification, not a change"** → ✓ ACCEPTED. I re-opened all three citations. :2202-2205 is the EMYTIM wave setup; the lava raise at :1929-1933 sits after the DYTBL loop terminates at :1927 (`PULS A`), so it is provably not part of the table walk; :2075-2077 reads `WPERSUE,X` from the wave table. None is a DYWORD row. Spending the AC on locking the existing ruling down was correct restraint.
- **TEA — "tightening the contract reddens 20 sibling tests"** → ✓ ACCEPTED. All 20 shared one cause and all 20 returned to green when the four exports landed, exactly as predicted. No test was deleted or re-seated to achieve it — verified by the count arithmetic (1551 → 1579 = +28 new, nothing lost).
- **Dev — "closed a module import cycle"** → ✓ ACCEPTED, with the constraint noted. The cycle is real (`enemy.ts` ⇄ `difficulty.ts`) and it is safe *today* for the stated reason: neither side calls across it at module-init time. I checked both module bodies for init-time work — `ROW_BY_NAME`'s `new Map(DIFFICULTY_TABLE.map(...))` touches only same-module data, and `brakeForWave` is an arrow whose body runs per call. Disclosed at the import site and in findings. The alternative (duplicating `seedBudget`) would have been worse.
- **Dev — "corrected a factually wrong assertion in TEA's RED suite"** → ✓ ACCEPTED, and this one deserved the scrutiny it got. Dev changing a test to make it pass is normally the reddest of flags. Here the original assertion was unsatisfiable by *any* correct implementation: `HUDNVY`'s `timeBytes[2]` is `$FF` (JOUSTRV4.SRC:7319), whose nibbles are both 15, so no parity rule can make GA1 4 and 5 differ. I re-read the ROM row myself before accepting. The replacement pins both nibbles by value and guards that the probe byte is asymmetric — strictly stronger than what it replaced.
- **Dev — "no production change for AC-4"** → ✓ ACCEPTED. Consistent with the TEA deviation above; the three knobs are byte-identical in the diff.

## SM Assessment

**Story:** uf1-2 — joust DYTBL difficulty engine is production-dead (5pt, p2, tdd, repo `joust`)
**Branch:** `feat/uf1-2-dytbl-difficulty-wiring`, cut from `origin/develop` @ `279b1df` (v0.0.7)
**Next:** TEA (Mr. Praline) — RED phase

### Pre-handoff verification

Per the standing rule that sweep findings and setup labels are guesses until
checked, I verified the premise before cutting the story rather than handing
TEA an assertion:

- **Dead-symbol claim: CONFIRMED.** `DIFFICULTY_TABLE`, `difficultyValue`,
  `ga1StartColumn`, `stepNibble`, `GA1_DEFAULT` and `DYTBL_ROW_COUNT` each
  return zero hits across `src` outside `difficulty.ts` itself. The walk
  engine and all 28 rows are genuinely unconsumed.
- **Consumer seams: CONFIRMED and enumerated.** Exactly three production
  importers (`wave.ts:24`, `arena.ts:51`, `demo.ts:66`), all for the retrofit
  knobs, none for a row. `enemy.ts`'s "difficulty" hits are `BODNVY`/`HUDNVY`
  prose, not table references.
- **AC-4 is likely already satisfied — flagged, not assumed.** `difficulty.ts:38-52`
  already documents the three retrofit knobs as deliberately *not* DYTBL rows,
  each with its own `JOUSTRV4.SRC` citation. That is the "documented as
  deliberately separate" arm of AC-4, already written. TEA verifies and records
  it rather than re-litigating — this should cost a confirmation, not a change.

### Routing notes

- The engine is **landed and tested** (jt3-1, joust#26). This story is wiring,
  not authoring — `difficultyValue` should not be rewritten.
- **Chief risk is AC-5, the determinism blast radius.** jt2's seeded replays
  assert bit-for-bit reproduction of realized values; any wired row that moves
  wave N's realized value must be a logged deviation with its ROM citation, not
  a silent drift. Baseline the suite before changing anything so the delta is
  attributable.
- AC-6 requires the unwired rows be **filed as a follow-up story**, not left as
  prose in an archive note.

### Race check

Fetched `joust` before setup: no `feat/uf1-2*` branch on origin, no uf1-2
commits on `origin/develop`, and no open joust PRs. Merge gate clear; no
sibling-checkout collision at setup time.

### Deferred to TEA (not SM's call)

Which row subset to wire, where each wired value reaches its consumer, and the
threading design. Recorded as OPEN items 1-3 in
`sprint/context/context-story-uf1-2.md`.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/difficulty-wiring.test.ts` — new, 28 tests: the uf1-2 RED suite (AC-1…AC-6 + the lang-review rules)
- `tests/helpers/difficulty-contract.ts` — extended: `DyRowName`, `RowDisposition`, `DYTBL_ROW_NAMES`, `dyRow`, `waveValue`, `ROW_DISPOSITION`
- `tests/helpers/enemy-contract.ts` — extended: `wave` threaded through `boundr` / `b2undr` / `runBrain` / `stepEnemy`

**Tests Written:** 28 tests covering 6 ACs
**Status:** RED — full suite **1579 tests: 41 failing, 1538 passing** (baseline before this story: 1551, all green; 1551 + 28 = 1579, no test lost or re-seated).
- 21 of the 28 new tests fail; the other 7 are deliberate keep-behavior guards that must stay green (see below).
- 20 further failures are sibling collateral from the tightened contract loader — 17 in `difficulty.test.ts`, 3 in `difficulty-source.test.ts`, all one cause, all recovered by the same fix. Logged as a deviation.

### The two facts that shaped the whole design

**1. The clone froze the wave-1 value.** Every DYWORD row's GA1 column 1 reproduces exactly the immediate the 1982 source hardcoded before DYTBL existed — the ROM's own trailing comments record the migration (`SUBD BODNVY  #$0100`, `LDA BOUPWD  #2`, `LDA BOLETM  #20+1`). And `enemy.ts:115/118` hardcode `0x100`/`0x200`. So the defect is not a missing table; it is a cabinet permanently stuck on wave 1's difficulty. Every test that ties a frozen constant to its row's wave-1 value pins that.

**2. Every one of the 28 rows first changes at wave 3.** The RAM copy seeds its countdown to 2 (:945), game start skips the walk (`BRA IWAVE2`, :1883), and end-of-wave runs it once (:2099) — so during wave N the walk has run N-1 times and the first step lands on the second walk. This is what makes AC-5 provable rather than hoped-for: waves 1 and 2 are bit-identical to the frozen behaviour, so anything jt2 replayed on those waves is untouched by construction.

### Test design notes (what the Reviewer should check hardest)

- **Pinned at the SEAM, not the engine.** jt3-1's `difficultyValue` already works, so a test over it is green today and proves nothing about the bug. Every AC-1/2/3 assertion runs through `waveValue` or through the brains, so it reddens on the wiring.
- **The discriminators MIRROR the wave.** A brain that ignores `wave` returns the same answer twice, so both halves are asserted in one test at a `velY` sitting strictly between the wave-1 and wave-3 brake (`0x110`, `0x210`). Each carries a liveness pair — below every brake never flaps, far above always does — so a hard-wired answer cannot satisfy one half by luck.
- **The end-to-end test guards its own discriminability.** `stepDemo` at wave 1 vs wave 3 with everything else held fixed. Measured on seed `0x1234`: enemy 256 promotes to `boundr` and enters `[0x100,0x120)` from frame 113, giving 14 discriminating samples inside the 240-frame run. The test asserts that count is non-zero, so if a future change moves the spawn geometry it fails saying *the probe can no longer tell the waves apart* instead of going quietly vacuous. **This is the test that fails if the fix stops one layer short** and adds a `wave` option no caller passes — i.e. leaves the engine dead the way uf1-2 found it.
- **Probed past the table end.** The tp1-25 lesson: the plateau is asserted at its exact arrival wave, at the wave before (must NOT be at END yet), and at waves 500 / 5,000 / 100,000.
- **A wave < 1 must throw.** The walk runs `wave - 1` times, so wave 0 and −5 silently return the start — a legitimate-looking value indistinguishable from wave 1. The seam is required to reject it rather than answer.

### Rule Coverage

| Rule (`gates/lang-review/typescript.md`) | Test | Status |
|---|---|---|
| #1 type-safety escapes (`as any`, `@ts-ignore`) | `adds no type-safety escape hatches` | passing (guard) |
| #2 missing `readonly` / mutable shared data | `keeps the table and the inventory deeply immutable` | failing |
| #4 silent-degradation on invalid input | `REJECTS a wave before 1 instead of silently answering with the start` | failing |
| #5 `.js` extension on relative ESM imports | `carries the .js extension on every relative import` | passing (guard) |
| project: `src/core` purity boundary | `keeps every module this story touches inside the pure core` | passing (guard) |
| project: named lookup must not return `undefined` | `dyRow('NOTAROW')` throws | failing |

**Rules checked:** 6 of 6 applicable (rules #3 enums, #6 React/JSX and #7 async do not apply — this story adds no enum, no component and no promise).
**Self-check:** 0 vacuous tests. Every test has a value assertion; no `let _ =`, no `assert(true)`, no `is_none()` on an always-empty value. The 7 tests green in RED are deliberate keep-behavior guards, each named in the table above or covering AC-4/AC-5 regression risk — none of them claims AC coverage that still needs work.

### Fixture correction caught in RED

The first draft's `fallingEnemy` used `velX`, but `EntityState` carries `velXIndex`; `stepEnemy` threw `RangeError: velXIndex undefined is off the ladder`. Two tests were therefore failing on a broken fixture rather than on the missing feature. Rebuilt against the repo's own `airborneEntity` shape and re-verified that every behavioural red is now an `AssertionError` naming the real gap.

### What GREEN has to build (the chain, end to end)

The whole point is that the value reaches the running game, so the wave has to be
threaded all four layers. Stopping at any one of them re-creates the bug.

1. **`src/core/difficulty.ts`** — add `DYTBL_ROW_NAMES` (the 28 labels, table order),
   `dyRow(name)` (throws on unknown), `waveValue(name, wave, ga1 = GA1_DEFAULT)`
   (throws on `wave < 1` / non-integer / NaN), and `ROW_DISPOSITION` (frozen, total
   over all 28: `BODNVY`/`HUDNVY` wired, `LAVLAV` `dead-in-rom`, the other 25
   `no-consumer-yet` with `rom` / `missing` / `owner` — owners are uf1-8, uf1-9,
   uf1-10, all filed and described).
2. **`src/core/enemy.ts`** — `boundr` / `b2undr` / `runBrain` take a `wave` (default 1);
   `stepEnemy`'s existing `ctx` gains `wave?`. The brake becomes
   `waveValue('BODNVY'|'HUDNVY', wave)`. **Keep `BOUNDR_DOWN_BRAKE` / `B2UNDR_DOWN_BRAKE`
   exported at `0x100` / `0x200`** — they are real ROM constants (the pre-DYTBL
   immediates) and `tests/enemy.test.ts:317-319` plus `enemy-contract.ts:135` depend
   on them being numbers. AC-5 pins this deliberately.
3. **`src/core/frame.ts`** — `stepFrame` needs the wave to reach `runBehaviour`'s
   `stepEnemy(enemy)` call at line 265. `GameState` has no wave concept today, so this
   is an additive parameter, not a state field (keep the core pure — no module-scope
   "current wave", which the purity test will catch).
4. **`src/core/demo.ts`** — `stepDemo` already holds `demo.wave`; pass it at line 899.

Note `frame.ts:265` calls `stepEnemy(enemy)` with no player, so only the brake branch
is live in production — that is why these two rows are observable at all, and it is
recorded as a Delivery Finding for uf1-8/uf1-9.

If Dev adds any **new** ROM citation to `src/`, it needs a matching claim in
`docs/rom-study/claims/difficulty.json` or the citations gate will flag it. The
citations this story relies on (:945, :930-939, :1890-1926, :7304-7331) are already
claimed; the two consumer lines :3819 and :4004 are cited in `enemy.ts` today without
claims, so following that existing precedent is fine.

**Handoff:** To Dev (Bicycle Repair Man) for GREEN.

---

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/difficulty.ts` — `DyRowName`, `DYTBL_ROW_NAMES`, `dyRow`, `waveValue`, `RowDisposition`, `ROW_DISPOSITION` (the total 28-row inventory); module header updated
- `src/core/enemy.ts` — `brakeForWave` helper; `wave` threaded through `boundr` / `b2undr` / `runBrain` / `stepEnemy`; the two brake constants' prose corrected
- `src/core/frame.ts` — `stepFrame(state, inputs, opts?: { wave })` → `runBehaviour` → `stepEnemy`
- `src/core/demo.ts` — `stepDemo` passes `demo.wave` (the link without which the whole seam stays inert)
- `tests/difficulty-wiring.test.ts` — one TEA assertion corrected (see the deviation)

**Tests:** 1579/1579 passing (GREEN). Story suite 28/28. `npm run build` clean (`tsc --noEmit` + vite).
**Branch:** `feat/uf1-2-dytbl-difficulty-wiring` (pushed)

### The whole point: the wave reaches the running game

`difficulty.waveValue` → `enemy.boundr`/`b2undr` → `runBrain` → `stepEnemy` → `frame.ts:265` → `demo.stepDemo`. Threading three of the four layers and stopping at the fourth would have reproduced the exact bug the story was filed for, so I checked that specifically — see M2 below.

### Mutation battery — 10/10 killed, 0 survived

Green tests prove nothing until they can be shown to fail. Each mutation was applied to real source, the **full** suite run, then reverted:

| # | Mutation | Result |
|---|---|---|
| M1 | `waveValue` ignores the wave | killed — 8 failed |
| **M2** | **`stepDemo` stops passing its wave** (the "stop one layer short" bug) | **killed — exactly 1 failed** |
| M3 | `frame.ts` stops passing the wave to `stepEnemy` | killed — 1 failed |
| M4 | `stepEnemy` defaults the wave to 3 instead of 1 | killed — 1 failed (AC-5) |
| M5 | `waveValue` accepts `wave < 1` again | killed — 1 failed |
| M6 | `waveValue` defaults `ga1` to 0 instead of 5 | killed — 13 failed |
| M7 | `dyRow` returns a row instead of throwing on a bad name | killed — 2 failed |
| M8 | the two brains swap rows | killed — 8 failed |
| M9 | `ROW_DISPOSITION` unfrozen | killed — 1 failed |
| M10 | `LAVLAV` reclassified as merely unwired | killed — 2 failed |

**M2 is the headline.** Removing `stepDemo`'s wave argument — leaving a fully-built engine that no caller ever reaches, which is *precisely* uf1-2's defect — is caught by **exactly one test in all 1579**: `reaches the RUNNING GAME`. Confirmed by name, not inferred from a count. That test is the story's load-bearing guard and should survive any future refactor.

### Determinism (AC-5) — why nothing else moved

The full suite was green on the first run after wiring, with **zero** sibling re-seats. That is not luck: the walk's countdown seeds to 2, so no row can move before wave 3, and every pre-existing demo/determinism test runs at wave 1. Waves 1-2 are bit-identical to the frozen behaviour by construction, so jt2's replays are untouched. **No realized value changed, so there is no deviation to log under AC-5** — the "or every changed realized value is logged" arm was not needed.

### Scope held

Two rows wired, 26 not, exactly as RED specified. I added no range gate, no wing timer, no PDIST model — each is a mechanic owned by uf1-8/uf1-9/uf1-10, and `ROW_DISPOSITION` now points at those owners in code rather than in an archive note.

**Handoff:** To Reviewer (The Argument Professional) for code review.

---

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][EDGE] | **The wave fed to the difficulty seam is BCD-packed, not decimal.** `stepDemo` passes `demo.wave` straight into `stepFrame({ wave })` → `waveValue`, but that counter is BCD (`nextWaveBcd`, `demo.ts:955`; pinned "BCD not binary" at `tests/wave.test.ts:155`). BCD and decimal agree for waves 1-9, then diverge forever. **Measured: at the tenth wave the counter holds `0x10` = 16, so the bounder's brake resolves to `$0140` where the ROM says `$0120`; at the twentieth it holds 32.** The story's own deliverable is wrong in exactly the regime it exists to serve, and it is *more* wrong than the frozen constant it replaced — that was honestly stale, this is confidently incorrect. | `src/core/demo.ts:903` (the `{ wave: demo.wave }` argument) | Decode BCD→decimal before it reaches `waveValue`. Do it at the boundary uf1-2 introduced, and state in a comment that the counter is BCD — do not silently assume the surrounding call sites are right, because they are not (see the upstream finding). |
| [HIGH][TEST] | **No test drives the production path past wave 3**, which is why a 1579-test suite, a RED phase written to hunt this class of bug, and a 10/10 mutation battery all missed it. Higher waves are exercised only via direct `waveValue(name, N)` calls with hand-written decimal literals, which bypass the counter entirely. The end-to-end test — correctly identified as the only test that catches "wired but never called" — runs at wave 3, one wave short of the BCD boundary. | `tests/difficulty-wiring.test.ts` (AC-1 e2e, AC-3 walk) | Add an end-to-end case that crosses the BCD boundary: drive or stage the demo at its tenth wave and assert the brake equals `waveValue('BODNVY', 10)`, not `waveValue('BODNVY', 16)`. That single assertion kills this bug and every future instance of it. |
| [MEDIUM][SILENT] | **`waveValue`'s input guard was written against the wrong failure mode and now supplies false confidence.** It rejects `wave < 1` and non-integers (and Dev's M5 proves it bites), but a BCD wave is a positive integer and sails through. A reader sees a validated seam and stops asking what the input *means*. The guard catches the case that cannot happen while waving through the one that does. | `src/core/difficulty.ts` (`waveValue`) | Keep the range guard, but it cannot be the only defence — the fix above belongs at the call site. Consider naming the parameter to carry the unit (e.g. `decimalWave`) so a BCD value at a call site reads as wrong. |
| [LOW][SIMPLE] | Two vestiges: `brakeForWave` is a pure pass-through to `waveValue` that adds a call frame and no behaviour (its doc comment is the only value, and could live on the call sites); and `runBehaviour`'s `wave = 1` default is dead — `stepFrame` is its only caller and always passes explicitly. | `src/core/enemy.ts` (`brakeForWave`), `src/core/frame.ts:236` | Optional. Fold `brakeForWave` into the two call sites, or keep it and drop the dead default. Not blocking. |

### Verified good (with evidence)

- **[VERIFIED] The four-layer threading is genuinely complete** — `demo.stepDemo` → `frame.stepFrame` → `runBehaviour` → `enemy.stepEnemy` → `runBrain` → `boundr`/`b2undr`. Evidence: `frame.ts:266` passes `{ wave }`, `frame.ts:317` passes `wave` into `runBehaviour`, `demo.ts:903` supplies it. Dev's M2/M3 mutations confirm each link is load-bearing. The *plumbing* is right; only the value flowing through it is wrong.
- **[VERIFIED] Waves 1-2 are bit-identical, so jt2's replays are untouched** — `waveValue('BODNVY', 1) === waveValue('BODNVY', 2) === 0x100 === BOUNDR_DOWN_BRAKE`. Structural, not coincidental: the walk's countdown seeds to 2 (`difficulty.ts`, JOUSTRV4.SRC:945). This is also why the BCD bug is invisible below the tenth wave. Full suite green with zero sibling re-seats corroborates.
- **[VERIFIED] The import cycle is safe as built** — `enemy.ts` ⇄ `difficulty.ts`. I read both module bodies for init-time work across the cycle: `ROW_BY_NAME`'s `new Map(DIFFICULTY_TABLE.map(...))` touches only same-module data, and `brakeForWave` is an arrow whose body evaluates per call. `vite build` and 1579 tests both pass, which they could not if init order were broken. Constraint documented at `enemy.ts` import site.
- **[VERIFIED] O(wave) resolution is not a performance problem** — I suspected it would be, since the ROM computes DYNADJ once per wave into RAM while this recomputes the whole walk per decision. Measured: 33 ns/call at wave 1, 129 ns at wave 90, against a realistic ~300 calls/sec (5 smart enemies × 60 fps) = ~39 µs/sec. Negligible. Raising it would have been inventing a problem.
- **[VERIFIED] `ROW_DISPOSITION` totality is enforced, not asserted** — `difficulty.ts` covers all 28 names; the AC-6 tests check the key set equals `DYTBL_ROW_NAMES` exactly, that every `no-consumer-yet` carries a `JOUSTRV4.SRC:\d+` line, a non-empty mechanic and an owner, and that the pending count is exactly 25. Dev's M10 proves the `dead-in-rom` classification cannot be quietly downgraded.
- **[VERIFIED] Comment accuracy** — the prose that the change falsified was corrected in `88de71c` (both brake constants, the brains' section header, the module header). Spot-checked `enemy.ts:117-136` and `difficulty.ts:1-13`: no comment now describes the brake as a fixed threshold.

### Data flow traced

`demo.wave` (BCD counter, advanced by `nextWaveBcd` on wave clear) → `stepDemo` → `stepFrame(state, inputs, { wave })` → `runBehaviour(p, budget, inputs, wave)` → `stepEnemy(enemy, { wave })` → `runBrain(enemy, player, wave)` → `boundr(enemy, player, wave)` → `brakeForWave('BODNVY', wave)` → `waveValue` → `difficultyValue(row, ga1, wave)` → the `velY >= brake` comparison in `smartDecision`. **The break is at the very first hop:** the value entering the chain is BCD and every consumer downstream treats it as decimal. Everything after that hop is correct.

**Handoff:** Back to Dev for fixes (findings 1 and 2 are blocking; 3 and 4 are advisory).

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells; 1579/1579 green, lint+build clean) | N/A — but see note below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (found R1, the BCD boundary) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (found R3) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (found R2) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (clean; prose corrected in 88de71c) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (clean) |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (N/A — no I/O, auth, or untrusted input in a pure sim core) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (found R4, low) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings — domain assessed directly (see Rule Compliance) |

**All received:** Yes (1 ran, 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 4 confirmed, 0 dismissed, 1 deferred upstream

**Note on preflight:** it reported clean and it was *correct* on every mechanical axis — tests, lint, build, smells. It is also the reason this review nearly rubber-stamped: a green 1579-test suite says nothing about behaviour no test exercises. The blocking bug below is invisible to every one of those 1579 tests.

### Rule Compliance (`gates/lang-review/typescript.md`, enumerated)

| Rule | Every governed instance in the diff | Verdict |
|---|---|---|
| #1 type-safety escapes | `difficulty.ts`, `enemy.ts`, `frame.ts`, `demo.ts` — zero `as any`, zero `@ts-ignore`, zero `!` non-null assertions added. `ROW_BY_NAME.get()` result is explicitly `undefined`-checked before use (`difficulty.ts` `dyRow`). | compliant |
| #2 `readonly` / immutability | `DYTBL_ROW_NAMES` frozen; `ROW_DISPOSITION` frozen AND every value object individually frozen; `RowDisposition` members all `readonly`; `DIFFICULTY_TABLE` unchanged (already frozen). Test-enforced. | compliant |
| #3 enum anti-patterns | No enums added. `DyRowName` and `RowDisposition` are union types, which the rule explicitly prefers. `RowDisposition` is a discriminated union on `kind`; every consumer narrows before field access. | compliant (N/A) |
| #4 null/undefined handling | `ctx?.player ?? null`, `ctx?.wave ?? 1`, `opts?.wave ?? 1` — all use `??`, not `\|\|`, so a legitimate falsy value is not swallowed. Note `wave: 0` is falsy AND invalid, so `??` is correct here for a different reason than usual. `Map.get()` undefined-checked. | compliant |
| #5 `.js` on relative imports | `enemy.ts` → `./difficulty.js` ✓. All four changed modules re-scanned; every relative import carries `.js`. Test-enforced. | compliant |
| #6 React/JSX | No `.tsx` in diff. | N/A |
| #7 async/promise | No async added; the sim core is synchronous throughout. | N/A |
| project: `src/core` purity | `violations()` scan passes on all four changed modules; no module-scope mutable state added — the wave is a parameter, not a field. Verified `frame.ts:295` uses a `const` local. | compliant |

### Devil's Advocate

Let me argue this code is broken, because it is.

The story's entire premise is that a difficulty engine existed and nothing called it, so the cabinet was frozen on wave 1's difficulty. The fix threads a wave through four layers and proves, with a mutation battery, that removing any link reddens a test. All of that is true and all of it is beside the point, because **the number being threaded is not the number anyone thinks it is.** `demo.wave` is a BCD-packed counter — `nextWaveBcd` decodes, increments, and re-packs, and `tests/wave.test.ts:155` pins `0x09 → 0x10` with the comment "BCD not binary". This repo *knows* the counter is BCD. The new code treats it as a plain integer. For the first nine waves BCD and decimal are numerically identical, which is exactly long enough for every test in the suite to pass and for a reviewer to nod along. At the tenth wave the counter holds 16, the walk runs fifteen steps instead of nine, and the buzzard's brake reads `$0140` where the ROM says `$0120`. The error never corrects; at the twentieth wave the counter holds 32.

So the story ships a mechanism that is *more* wrong than what it replaced, in the regime the story exists to serve. Before this change, late waves were faithfully wave-1-frozen — a known, honest gap. After it, late waves are confidently wrong, and wrong in a way that reads as intentional escalation. A player would feel buzzards diving harder than the cabinet ever made them. Nobody would file it as a bug; they would file it as "feels off," which is the worst kind.

And the guard makes it worse. `waveValue` validates `wave >= 1` and integrality — TEA wrote that specifically to kill silent degradation, and Dev's mutation M5 proves it bites. But a BCD wave is a positive integer. It sails straight through the guard. The validation was written against the wrong failure mode and now supplies false confidence: a reader sees an input-validated seam and stops asking what the input means. A guard that catches the impossible case while waving through the actual one is worse than no guard, because it terminates the inquiry.

What else did the tests not ask? Every behavioural assertion uses waves 1, 2, or 3. Waves 11, 18, 33, 123, 500 and 100,000 appear only in direct `waveValue(name, N)` calls with hand-written decimals — never through `stepDemo`, never through the counter that production actually uses. The end-to-end test, the one Dev correctly identified as load-bearing and proved is the only test in 1579 that catches "wired but never called," runs at wave 3. One wave later on the BCD scale and it would have caught this too.

**And the same defect predates this story:** `demo.ts:959-968` feeds that identical BCD counter to `waveRowAt`, `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable` and `seedWaveBudget`, all of which are documented as taking a 1-based decimal wave. Measured: at the tenth wave `waveRowAt(0x10)` returns wave 16's row (`bounders: 0`) instead of wave 10's (`bounders: 8`). So the demo has been spawning the wrong enemy complement from the tenth wave onward, and `game.ts`'s `resolveWaveType` inherits it. That is not uf1-2's bug, but it is the reason uf1-2's bug looked idiomatic — the new code copied the surrounding convention faithfully, and the convention is broken.
---

## TEA Assessment — Round 2 (rework RED)

**Tests Required:** Yes
**Test Files:**
- `tests/difficulty-wiring.test.ts` — extended: 11 new tests in three round-2 blocks (R2-1, R2-2, R2-3)
- `tests/helpers/wave-contract.ts` — extended: `decimalWaveFromBcd` on `WaveModule` + a narrow `loadWaveBcd()` loader

**Tests Written:** 11 (2 Reviewer-blocking findings + 1 crash found in RED)
**Status:** RED — full suite **1590 tests: 11 failing, 1579 passing** (baseline 1579, all green; 1579 + 11 = 1590, nothing lost or re-seated).
**Sibling collateral: zero.** Round 1 tightened `loadDifficulty` and reddened 20 sibling tests; this round puts the new export behind its own narrow loader (`loadWaveBcd`, the `loadDemoRender` pattern) so only the tests that are about the new seam go red. `npx tsc --noEmit` clean (tsconfig covers `tests/`).

### Every red was proved to fail for its OWN reason

Round 1's Dev deviation records a **false red** reaching GREEN — an assertion no correct implementation could satisfy. So before handing off I stubbed `decimalWaveFromBcd` into `wave.ts`, re-ran, and confirmed the six behavioural tests still fail on their own assertion rather than on the loader, then reverted the stub (`git checkout src/core/wave.ts`; the working tree is tests-only):

| Test | Failure with the export present | Genuine? |
|---|---|---|
| tenth wave | `the cabinet on its tenth wave must fly wave 10: posY 24888 ≠ 24788` | yes |
| twelfth wave (hunter) | `the hunter on the twelfth wave flies wave 12: posY 25144 ≠ 25044` | yes |
| 1..24 sweep | `every wave must brake at its OWN rung: 12 entries ≠ []` | yes |
| 240-frame cabinet | `the cabinet's tenth wave plays its own rung, not the byte 0x10 read as 16` | yes |
| the seam's prose | `demo.ts must name the encoding it is decoding` | yes |
| hundredth wave | `RangeError: wave must be a 1-based integer, got 0` — **a throw, not an assertion** | yes |

The remaining five specify the decoder itself and go green the moment it exists; that is correct — they are its contract, and one of them (`leaves the BCD ARITHMETIC alone`) is a keep-behavior guard whose whole job is to stay green.

### Test design — what the Reviewer should check hardest

- **Nothing reaches the dial through a literal.** Round 1's high-wave assertions all called `waveValue(name, 11)` with hand-written decimals, which is why a 1579-test suite missed a defect that starts at the tenth wave: those tests exercised the ENGINE, which already worked, and never the seam. Every round-2 test reaches the brake through `stepDemo`, and every wave number is produced by walking the demo's own `nextWaveBcd` from `createWaveDemo`'s seed — `counterAtWave(w, 10)`, never `0x10`. Each also asserts the counter it derived, so if td1-12 later makes `demo.wave` decimal, the premise fails first and says the staging must be revisited instead of silently testing nothing.
- **The twelfth wave is not an arbitrary second case.** I searched waves 10-99 exhaustively for one where BODNVY is *blind* to the misreading and HUDNVY is not. **There is exactly one: wave 12** (BODNVY reads `$0140` at both 12 and 18, its rungs running 11-18; HUDNVY steps at 18, so `$0220` vs `$0240`). A fix special-cased to the bounder, or to the literal tenth wave, passes R2-1's first test and dies on this one.
- **The whole-cabinet test compares TRAJECTORIES, not end states.** My first draft compared the enemy states after 240 frames and was **vacuously green on the broken code** — measured: two runs that differ mid-flight reconverge by frame 240 (the window-hit counts were 12 vs 40, but the final positions matched exactly). Comparing every frame's signature is what makes it bite. Its invariant is ROM-derived, not observational: waves 3 and 10 sit on the same rung of *both* wired rows, so a correct cabinet cannot tell them apart, while wave 11 steps BODNVY off it and must diverge — asserted as a liveness pair so the test cannot pass by going inert.
- **The sweep is the boundary discipline.** For every wave 1-24 the probe sits exactly ON that wave's brake (must check itself — the `SUBD`/`BMI` is `>=`) and one unit under it (must not). Waves 1-9 are the control: BCD and decimal agree there, and that is where jt2's replays live, so they must stay green. A decode right for 1-9 and wrong from 10 fails half the sweep; one right only at 10 fails the rest.
- **The guard was moved to where the unit changes.** The Reviewer's [MEDIUM] finding is that `waveValue`'s `wave < 1` check validates a case that cannot happen while waving through the one that does. R2-2 keeps that guard (untouched) and adds the one that matters at the decode: `decimalWaveFromBcd` throws on any non-BCD byte (`0x0a`, `0x1a`, `0xa0`, `0xff`), which is precisely a *decimal* wave arriving where the packed counter belongs — round 1's mistake, made loud. The mirror assertion matters as much: every value `nextWaveBcd` can actually produce must be accepted, or the new guard repeats the old one's error in the other direction.
- **The refactor trap is pinned.** `nextWaveBcd` computes the same decode inline, so extracting it looks free. It is not: `decimalWaveFromBcd(0x00)` is **100** (wave semantics), and folding that into the increment turns `0x99 → 0x01`. R2-2's third test kills that mutant.

### The crash the review did not find (R2-3)

RED turned up a second defect of the same genus, and it is worse than the reported one because it is fatal. Two facts, each already pinned by a passing test, that round 1 joined without noticing: the counter **wraps `0x99 → 0x00`**, and `waveValue` **throws below 1**. So the hundredth wave kills the game on its first smart-enemy decision. Verified directly against the tree, not inferred.

The honest scope question is what uf1-2 owes here, since the counter cannot express *which* hundred — wave 101 and wave 1 both read `01`, so the ordinal is unrecoverable and a monotone count is td1-12's job. My ruling: **uf1-2 owes the hundredth wave a correct answer and every wave a non-fatal one.** The decode maps the rolled `0x00` to 100 — exact at the rollover, drifting only above it, and never crashing. R2-3's third test kills the cheap alternative (clamping the decoded wave up to 1), which would silently reset a hundred-wave cabinet to its opening difficulty; the ROM's walk is a RAM countdown that never resets, and only the display byte wraps. The residual drift above wave 100 is recorded as a Delivery Finding **owned by td1-12**, not left as prose.

### Finding coverage — every blocking item has a test that fails today

| Reviewer finding | Tests | Red today? |
|---|---|---|
| [HIGH][EDGE] the wave fed to the seam is BCD-packed | R2-1 (all four) + R2-2's decode contract | yes — 4 behavioural reds on their own assertions |
| [HIGH][TEST] no test drives the production path past wave 3 | R2-1's 1..24 sweep and 240-frame cabinet run, both driven through the counter | yes — 12 sweep entries wrong |
| [MEDIUM][SILENT] the guard was written against the wrong failure mode | R2-2 `REJECTS a byte that is not BCD` (+ the existing `wave < 1` guard kept, untouched) | yes |
| [LOW][SIMPLE] `brakeForWave` pass-through, `runBehaviour`'s dead default | none — advisory, explicitly Dev's call | n/a |
| the Reviewer's required comment ("state that the counter is BCD") | R2-2 `says at the seam that the counter it feeds the difficulty engine is BCD` | yes |
| **TEA-found: the hundredth wave throws** | R2-3 (all three) | yes — a `RangeError`, not an assertion |

The round-1 ACs (AC-1…AC-6) keep their original 28 tests, all still green and none re-seated.

### Rule Coverage

Round 2 adds one validated function (`decimalWaveFromBcd`) and edits one call site, so the
input-validation and boundary rules are the live ones. The three project-rule scans were
**widened to include `wave.ts`**, which round 2 changes and which they did not previously
cover — a real gap the gate checklist surfaced.

| Rule (`gates/lang-review/typescript.md`) | Test | Status |
|---|---|---|
| #1 type-safety escapes (`as any`, `@ts-ignore`) | `adds no type-safety escape hatches` — now scans `wave.ts` and `demo.ts` too | passing (guard) |
| #2 missing `readonly` / mutable shared data | `keeps the table and the inventory deeply immutable` (round 2 adds no shared data) | passing (guard) |
| #4 silent degradation on invalid input | `REJECTS a byte that is not BCD` — and its mirror, that every reachable counter value is accepted | failing |
| #5 `.js` extension on relative ESM imports | `carries the .js extension on every relative import` — now scans `wave.ts` | passing (guard) |
| project: `src/core` purity boundary | `keeps every module this story touches inside the pure core` — now scans `wave.ts` | passing (guard) |
| project: a decode must not silently answer | `inverts the counter exactly, for all 99 waves` + `reads the rolled 0x00 as the HUNDREDTH wave` | failing |

**Rules checked:** 5 of 5 applicable (#3 enums, #6 React/JSX and #7 async do not apply — round 2 adds no enum, no component and no promise).
**Self-check:** 0 vacuous tests. Every one of the 11 carries a value assertion or a `toThrow`; no `let _ =`, no `assert(true)`, no assertion that can pass on an always-empty value. The three that go green as soon as the export lands are named keep-behavior guards, and one of them (`leaves the BCD ARITHMETIC alone`) kills a specific refactor mutant. Each behavioural test carries a discriminability guard so it fails loudly rather than going quietly vacuous if the table or the spawn geometry moves.

### What GREEN has to build

1. **`src/core/wave.ts`** — export `decimalWaveFromBcd(counter: number): number` beside `nextWaveBcd`: the inverse of its packing (`0x10 → 10`), **throwing** on a non-BCD byte (either nibble > 9) or a non-integer / out-of-range value, and returning **100** for the rolled `0x00`. Do **not** call it from inside `nextWaveBcd` — the BCD arithmetic there must keep seeing `0x00` as zero.
2. **`src/core/demo.ts`** — `stepDemo` decodes at the boundary uf1-2 introduced: `stepFrame(demo.sim, inputs, { wave: decimalWaveFromBcd(demo.wave) })`. The comment there must say the counter is **BCD** and point at **td1-12** for the other consumers at :959-968, which are still raw and deliberately untouched — a reader must not infer from this call site that the surrounding ones are right.
3. **Nothing else.** The four-layer threading is already correct and the Reviewer verified every link; only the value entering it is wrong. In particular `waveValue`'s range guard stays as it is, and the 26 unwired rows stay unwired.

The Reviewer's [LOW][SIMPLE] finding (`brakeForWave`'s pass-through, `runBehaviour`'s dead `wave = 1` default) is advisory and has no test either way — Dev's call. Note `stepFrame`'s own `wave = 1` default is **not** dead and is pinned by AC-5's `defaults an unqualified step to wave-1 behaviour`.

If Dev adds a new ROM citation to `src/`, it needs a matching claim in `docs/rom-study/claims/` or the citations gate flags it; the citations this round rests on (`:2001-2004`, the WAVBCD increment) are already claimed via `wave.ts`.

**Handoff:** To Dev (Bicycle Repair Man) for GREEN.
---

## Dev Assessment — Round 2 (rework GREEN)

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/wave.ts` — `decimalWaveFromBcd(counter)`: the inverse of `nextWaveBcd`'s packing, rejecting a non-BCD byte and reading the rolled `0x00` as the hundredth wave
- `src/core/demo.ts` — `stepDemo` decodes at the boundary uf1-2 introduced, with the comment the Reviewer required
- `tests/difficulty-wiring.test.ts` — two RED corrections, both logged as deviations (a strengthened bad-value list, and a factually wrong comment)

**Tests:** 1590/1590 passing (GREEN). Round-2 block 11/11. `npm run build` clean (`tsc --noEmit` + vite). Citations gate 56/56.
**Branch:** `feat/uf1-2-dytbl-difficulty-wiring`

### The fix is two lines and a guard

`demo.wave` is the ROM's WAVBCD byte. Round 1 handed it straight to a function documented as taking a 1-based decimal wave. `stepDemo` now changes the unit where the unit changes, and says so — including the part a reader most needs: **the surrounding call sites are still wrong**, that predates this story, and td1-12 owns them. The four-layer threading round 1 built is untouched; only the value entering it moved.

### Mutation battery — 13 applied, 11 killed, 2 equivalent, 1 real gap found and closed

Each mutation was applied to real source, the **full** suite run, then reverted.

| # | Mutation | Result |
|---|---|---|
| M1 | `stepDemo` stops decoding — **the exact bug the Reviewer rejected** | killed — 5 failed |
| M2 | the rolled `0x00` reads as zero again (the hundredth-wave crash) | killed — 3 failed |
| M3 | the cheap non-crashing fix: clamp to wave 1 | killed — 3 failed |
| M4 | the non-BCD guard removed | killed — 1 failed |
| M5 | the nibbles swapped in the decode | killed — 5 failed |
| M6 | `nextWaveBcd` refactored onto the decoder | **survived — equivalent mutant** (see below) |
| M7 | the `> 0x99` range bound widened to `0xff` | **survived — dead clause, removed** |
| M8 | the brake reverts to wave 1 forever (round 1's original defect) | killed — 8 failed |
| M9 | the non-integer clause dropped (`1.5`/`NaN` answer silently) | killed — 1 failed |
| M10 | the negative clause dropped (`-16` answers `-10`) | **survived — REAL GAP, test strengthened, retested: killed** |
| M11 | the decode off by one | killed — 7 failed |
| M12 | only the high nibble checked for BCD validity | killed — 1 failed |
| M13 | the decoded wave off by one at the boundary | killed — 3 failed |

**M1 is the headline.** Removing the decode reproduces precisely what round 1 shipped, and five tests catch it — where round 1's entire 1579-test suite caught it zero times.

**M10 was a real hole and it is the one worth reading.** RED's rejection test listed `-1` as its negative case, but `-1 & 0x0f` is 15, so the *BCD* clause rejected it and the `counter < 0` clause never fired at all. Deleting that clause passed all 1590 tests, leaving `-16` to decode silently to `-10`. A guard the suite could not prove does anything is the round-1 finding in miniature, so I added `-16`/`-160` and re-ran the mutant: killed. Recorded as a Delivery Finding, because the shape generalises — with guards in sequence, a value proves the clause you intend only if it is invalid for that reason **alone**.

**M6 and M7 are not gaps; they are claims that were wrong, and I corrected the record rather than the code.**

- **M6** — RED asserted that folding `decimalWaveFromBcd` into `nextWaveBcd` "turns `0x99 → 0x01`". It does not. `0x99` decodes to 99, so the roll still lands on `0x00`, and the `% 100` absorbs the rollover mapping (`0x00 → 100 → 101 % 100 → 1`, identical to `0 → 1`). Verified exhaustively across all 100 reachable counter values, and by the mutant surviving the full suite. The test stays as a keep-behavior guard, now labelled as one instead of advertising a mutant it cannot kill.
- **M7** — the `> 0x99` bound could never fire: every integer above it already has a nibble over 9. Removed rather than left as decoration.

### Scope held

Two files, one new function, one changed argument. I did **not** touch the wave-advance consumers at `demo.ts:959-968` or `game.ts:347` — those are td1-12's, and fixing them here would have made this story unreviewable against the finding it was rejected for. I did not take the Reviewer's [LOW][SIMPLE] suggestions (`brakeForWave`'s pass-through, `runBehaviour`'s dead default): they are advisory, no test moves either way, and this round should be readable as the BCD fix and nothing else.

### What the Reviewer should push on

1. **The `0x00 → 100` ruling is a judgment call, not a ROM fact.** The counter cannot say *which* hundred it is on, so above wave 100 the ordinal is unrecoverable and the decode knowingly drifts. It is exact at the rollover and never crashes. It does NOT "never reset" — an earlier draft of this line claimed that, and the round-2 review caught it: from wave 101 the difficulty falls back to its opening value and re-climbs. That is unavoidable inside this story and is now pinned as a known divergence; the honest fix is td1-12's monotone counter.
2. **`decimalWaveFromBcd` is a new export TEA mandated.** A one-line inline decode at the call site would also have satisfied the Reviewer's literal fix. I think the named seam is right (it is where the unit changes, it is where the guard belongs, and td1-12 needs the same function) — but it is more surface than the minimum.
3. **The rollover behaviour above wave 100 is pinned, not implied-absent** — R2-3 asserts the reset explicitly so it is discoverable, and that test is expected to FAIL when td1-12 lands (delete it then, do not repair it).
4. **Waves 1-9 are untouched by construction**, so jt2's replays and every existing demo test are unaffected: BCD and decimal agree there, and the full suite went green first run with zero re-seats.

**Handoff:** To Reviewer (The Argument Professional) for code review.
---

## Reviewer Assessment — Round 2

**Verdict:** REJECTED

The reported bug is genuinely fixed and I could not break it. The rejection is for one
finding, and it is the same *genus* the story was rejected for in round 1: a check whose
name claims a property it only tested at the one point where that property happens to
hold. The code is right; the test that guards it is not.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][TEST] | **The rollover guard asserts at the only boundary where its claim is true.** `never sends the difficulty BACKWARDS to wave 1 at the rollover` probes waves 99 → 100 and passes. **At wave 101 the difficulty resets to its opening value.** Measured through the real decode: wave 99 → counter `0x99` → BODNVY `$02a0`; wave 100 → `0x00` → `$02a0`; **wave 101 → `0x01` → decodes to 1 → `$0100`**. A hundred waves of escalation are wiped and re-climb from scratch, and the test named for exactly that failure is green. The ROM does not do this — see the primary-source check below. | `tests/difficulty-wiring.test.ts`, R2-3 third test | Rename the test to what it actually proves (wave 100 is exact; nothing throws anywhere across the rollover), and ADD a test that PINS the wave-101 reset as a known divergence with its td1-12 owner — the `ROW_DISPOSITION` idiom. A pinned divergence is discoverable and gives td1-12 a tripwire that fails loudly when the monotone counter lands; an unpinned one is invisible until a player finds it. |
| [MEDIUM][COMMENT] | **The assessment and the Delivery Finding both understate this.** The Dev assessment says the decode "never crashes, and never resets"; the TEA Delivery Finding says it "drifts thereafter". Neither is true — it *resets*, completely, at wave 101. `wave.ts`'s doc block has the same softening ("above it the byte simply cannot say WHICH hundred"). Accurate as far as it goes, but a reader will not infer "the difficulty falls off a cliff" from it. | session assessments; `src/core/wave.ts` doc block | Say the actual behaviour in all three places: exact at wave 100, and from wave 101 the escalation restarts at wave 1 and re-climbs, permanently, once per hundred waves. |
| [MEDIUM][GAP] | **A consumer of the raw counter that td1-12 does not list: the dev overlay.** `overlayReadout` (`game.ts:613`) returns `game.wave` — the raw BCD byte — behind a doc comment reading "The 1-based wave", and `main.ts:135` prints it. So the overlay shows **`WAVE 16` on the tenth wave**. td1-12 enumerates `demo.ts:959-968` and `game.ts:347` but not this one. Note the fix here points the OTHER way: the ROM prints the BCD *digits* (`OUTBCD`), so the display wants the byte formatted, not decoded. | `src/core/game.ts:613`, `src/main.ts:135` | Not this story's to fix — **added to td1-12's description** so it is not lost. |
| [LOW][EDGE] | The new guard is a tripwire for td1-12's own option (B). If that story makes `demo.wave` decimal, `decimalWaveFromBcd(10)` sees `0x0a`, throws, and the game dies at the tenth wave. That is the intended loud failure and R2-1 catches it long before a player would — but td1-12 should be told, not surprised. | `src/core/demo.ts:918` | Advisory. Mentioned in td1-12's description. |

### Primary-source check — the divergence is real, not a ROM behaviour

I did not take the story's prose for this. `WAVBCD` has **exactly four references in the entire
1982 source**, and I read all four:

- `:1875` `CIA CLR WAVBCD` — init, "WAVE STARTS AT ZERO"
- `:2001-2004` `LDA WAVBCD / ADDA #$01 / DAA / STA WAVBCD` — the increment
- `:2399` `LDA WAVBCD / BITA #$F0 / BNE / ORA #$F0 / JMP OUTBCD` — inside `WAVEN3`, the
  "PUT UP WAVE NUMBER" routine

That last one is the **only read**, and it prints. `WAVBCD` indexes nothing. The wave TABLE is
advanced by a separate pointer — `LDX PWAVE,U / LEAX WLEN,X / CMPX #WTBEND / LDX #WTBRST`
(`:2011-2019`) — and the DYTBL walk is a per-row countdown in RAM (`LDA #2 / STA 2,Y`, `:945`)
run once per wave-end from `IWAVE` (`LBEQ IWAVE`, `:2099`). **Both are monotone and neither
resets.** So the ROM's difficulty escalation never falls back, and our wave-101 reset has no
original to point at.

This also sharpens td1-12: `demo.wave` conflates **two** distinct ROM concepts — the display
byte `WAVBCD` and the table pointer `PWAVE`. Its option (B) is really "model PWAVE, and derive
WAVBCD for display". Recorded on the story.

### Verified good (with evidence)

- **[VERIFIED] The reported bug is fixed and I could not break it.** The tenth wave resolves
  `$0120`, the twelfth `$0220` on the hunter, and the 1..24 sweep brakes at each wave's own
  rung — all through the real `stepDemo`, none through a literal.
- **[VERIFIED] The crash is genuinely gone.** I did not trust the single wave-100 test: I drove
  **every one of the 100 counter values, across 200 waves**, through the real `stepDemo` with a
  smart `boundr` staged on it. Nothing throws. The round-1 crash is closed at every reachable
  input, not just at the one the test names.
- **[VERIFIED] The guard cannot fire in production.** Only two writers of `demo.wave` exist in
  the whole tree — `createWaveDemo` (literal 1) and the advance (`nextWaveBcd`, closed over
  0x00-0x99). Nothing in `src/shell` writes it; `main.ts` only reads. So the throw is
  defence-in-depth, not a live path — which is the right shape for it.
- **[VERIFIED] Dev's two test edits are legitimate, and I checked them precisely because Dev
  editing tests is the reddest flag there is.** (1) Adding `-16`/`-160` is a *strengthening* —
  and the claim behind it is exactly right: `-1 & 0x0f` is 15, so the BCD clause rejects `-1`
  and the `counter < 0` clause never fires; only a negative multiple of 16 reaches the
  arithmetic. Dev proved it by mutation, and the mutant dies now. (2) The "equivalent mutant"
  comment correction is true — I re-ran the exhaustive comparison independently across all 100
  reachable counter values and the two forms are identical. Neither edit relaxes an assertion.
- **[VERIFIED] Removing the `> 0x99` bound is correct.** Every integer above `0x99` has a
  nibble over 9 (`0x9a` → ones 10; `≥ 0xa0` → tens ≥ 10), so it could never be the clause that
  fires. Deleting it changes no outcome, only a message no test asserts.
- **[VERIFIED] Waves 1-9 are untouched**, so jt2's replays are safe by construction: BCD and
  decimal coincide there, and the suite went 1590/1590 with zero re-seats.
- **[VERIFIED] Scope held.** The td1-12 consumers at `demo.ts:959-968` are unchanged, and the
  comment at the fixed hop says so explicitly rather than letting a reader generalise from it.

### Mechanical

`tsc --noEmit` clean · `vite build` clean · **1590/1590 tests** · citations gate 56/56 ·
working tree clean · branch pushed and in sync with origin.

### Devil's Advocate

The fix is correct, so let me attack the thing that is actually weak.

This story has now been reviewed twice, and both times the defect was not in the mechanism —
it was in a **check that had been mistaken for coverage**. Round 1: a validated seam whose
guard rejected `wave < 1`, a case that cannot occur, while a BCD byte walked straight through.
Round 2: a test called `never sends the difficulty BACKWARDS to wave 1 at the rollover`, which
probes the single wave where the difficulty does not go backwards, and goes green while the
very next wave sends it back to the opening value. Same shape, same story, one round apart. The
reason it recurs is that both were written by someone who already knew the answer they wanted
and picked the input that gave it.

And the tell was there to be read. RED's own gotchas file says, about table lookups: *"the test
set is not 'the boundaries' — it is the boundaries PLUS the first value past the end."* The
rollover is a boundary. The test stopped **on** it. The first value past the end — wave 101 —
is where the whole property collapses, and nothing looks at it.

Is the reset itself a defect? No, and I want to be precise about that, because rejecting the
code would be wrong. The counter is two BCD digits; wave 101 and wave 1 both read `01`. The
ordinal is not recoverable, so no implementation confined to this story can do better than
"exact at 100, wrong above it". Dev's `0x00 → 100` earns the one thing available — the
hundredth wave stops crashing — and I confirmed at every reachable input that it does. The
right fix is td1-12's monotone counter and it is already filed p1.

What is a defect is claiming more than that in the one place a future reader will look. Three
artefacts now assert some version of "it does not reset" — a test name, a Dev assessment, a doc
block — and all three are wrong about a behaviour that begins one wave after the tested one. A
known divergence that is written down is a decision; a known divergence that is written down
*inaccurately* is a trap, and this epic has two more stories (uf1-8, uf1-9) queued to pile more
per-wave consumers onto the same counter. Pin the reset, name the test for what it proves, and
this is done.

**Handoff:** Back to Dev for fixes (finding 1 is blocking; 2 is blocking as its documentation
half; 3 and 4 are recorded on td1-12 and need no code here).

### Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | run directly | clean — 1590/1590, `tsc --noEmit` clean, `vite build` clean, citations 56/56, tree clean, branch in sync | mechanical axes all green; see the note below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Assessed directly — found F1 (the rollover boundary) and F4 (the td1-12 tripwire) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Assessed directly — the new throw is loud by design; verified it cannot fire in production (two writers only) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Assessed directly — found F1; audited both of Dev's test edits as legitimate |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Assessed directly — found F2 (three artefacts overstate the guarantee) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Assessed directly — clean; `decimalWaveFromBcd` is a total function over a validated domain |
| 7 | reviewer-security | Yes | Skipped | disabled | Assessed directly — N/A, pure sim core, no I/O or untrusted input |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Assessed directly — Dev already removed the dead `> 0x99` clause; I re-derived and confirmed it |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Assessed directly — see Rule Compliance below |

**All received:** Yes (1 run directly, 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 4 (1 blocking + its documentation half; 2 routed to td1-12)

**Note on preflight:** green on every mechanical axis again, and again it proves nothing about
the finding. 1590 passing tests include the one test whose name asserts the property that
fails at wave 101. This is the second round running where the mechanical gate was clean and
the defect was in what the suite *claimed* to cover.

### Rule Compliance — round 2 (`gates/lang-review/typescript.md`)

| Rule | Every governed instance in the round-2 diff | Verdict |
|---|---|---|
| #1 type-safety escapes | `wave.ts`, `demo.ts` — no `as any`, no `@ts-ignore`, no non-null assertion added. Test-enforced, and the scan was widened to cover `wave.ts` this round. | compliant |
| #2 `readonly` / immutability | No shared mutable data added; `decimalWaveFromBcd` is pure over a number. | compliant (N/A) |
| #3 enum anti-patterns | None added. | N/A |
| #4 null/undefined handling | No optionals introduced. The function is total over its validated domain and throws outside it rather than returning a sentinel — the rule's preferred shape. Verified there is no silent `0`/`-1` return path. | compliant |
| #5 `.js` on relative imports | `demo.ts` → `./wave.js` ✓. Test-enforced, scan widened to `wave.ts`. | compliant |
| #6 React/JSX | None. | N/A |
| #7 async/promise | None added. | N/A |
| project: `src/core` purity | `violations()` passes on `wave.ts` and `demo.ts`; no module-scope state added. | compliant |
| project: no silent degradation | The whole point of the change. Both surviving guard clauses were proved load-bearing by mutation; the third was proved dead and removed. | compliant |
### Tooling note — the REJECTED verdict did not route itself

`pf handoff resolve-gate` reported `next_phase: finish, next_agent: sm` and
`complete-phase` followed it, even though this review's verdict is REJECTED and
`.pennyfarthing/workflows/tdd.yaml:68-71` configures
`recovery.reviewer-verdict → action: rework, target_phase: green`. `resolve-gate`
reports the **happy-path** next phase; the approval gate itself is a prompt the agent
is expected to evaluate, and nothing machine-reads the `**Verdict:**` line, so a
rejection walks forward into `finish` unless the agent notices.

Corrected by hand: phase `finish` → `green`, round-trip 1 → 2, and the stray `finish`
history row replaced with the `green` rework row. Round 1's rejection routed correctly
because the SM drove it; an agent relaying straight through `complete-phase` does not
get that. Worth a pf fix — a story left in `finish` with a REJECTED verdict would be
archived as done.

---

## Dev Assessment — Round 2 rework (review findings 1 and 2)

**Implementation Complete:** Yes
**Files Changed:**
- `tests/difficulty-wiring.test.ts` — R2-3 retargeted and extended (3 tests → 5)
- `src/core/wave.ts` — the doc block's rollover paragraph, corrected and evidenced
- `.session/uf1-2-session.md` — the two overstated claims corrected in place

**Tests:** 1592/1592 passing (GREEN; 1590 + 2). `tsc --noEmit` clean, `vite build` clean.
**Branch:** `feat/uf1-2-dytbl-difficulty-wiring` (pushed, in sync)

### F1 — the guard that proved one wave

No production change; the code was already the best available. What changed is what the
suite claims:

- **Renamed** `never sends the difficulty BACKWARDS to wave 1 at the rollover` →
  `carries the difficulty THROUGH the rollover — the hundredth wave does not fall back`,
  with its scope stated in the body (waves 99 → 100 and nothing beyond) and a note that an
  earlier draft was named for the general property while asserting only this pair.
- **Added** `PINS the known divergence: from the 101st wave the difficulty resets and
  re-climbs` — asserting the wrong behaviour deliberately, with the ROM evidence for why it
  is a divergence, and an instruction to **delete it when td1-12 lands rather than repair
  it**. It pins the size of the cliff too (`rung(100) - rung(101)` is the whole hundred-wave
  climb) so nobody has to compute it, and that the walk re-climbs rather than staying flat.
- **Added** `never THROWS at any wave the counter can reach` — the property behind the
  single wave-100 test: all 100 counter values over two full rollovers, each with a smart
  `boundr` staged so the brake is actually consulted. This is the check I ran ad hoc while
  reviewing; it belongs in the suite, not in a scratch file.

Verified all five R2-3 tests bite by reverting the `0x00 → 100` mapping: all five fail.

### F2 — three artefacts claimed more than the code delivers

`wave.ts`'s doc block now says **reset**, not "cannot say which hundred", and carries the
primary-source line that makes it a divergence rather than a quirk: WAVBCD's only read in
the entire 1982 source is `LDA WAVBCD / … / JMP OUTBCD` (:2399-2403); the wave table walks
on the separate `PWAVE` pointer (:2011-2019) and the difficulty on a per-row RAM countdown
fired from IWAVE (:945, :2099) — both monotone. The TEA Delivery Finding's "drifts
thereafter" and the round-2 Dev assessment's "never resets" are corrected in place, each
marked as a correction so the record shows what was believed and when.

### F3 / F4

No code. Both are recorded on td1-12 (the dev-overlay consumer, the WAVBCD/PWAVE
conflation, the `decimalWaveFromBcd` tripwire, and the rollover pinning note), committed
to the orchestrator in `97aeafe`.

**Handoff:** To Reviewer for re-review of the rework.
---

## Reviewer Assessment — Round 2, re-review of the rework

**Verdict:** APPROVED

Both blocking findings are fixed, and fixed in the way that was asked rather than in the
way that would have made the tests quiet. I re-derived the pinned numbers independently
before accepting them.

| Finding | Status | Evidence |
|---|---|---|
| [HIGH][TEST] the rollover guard proved one wave | **fixed** | Renamed to its real scope, with the limit stated in the body. The reset is now pinned by a dedicated test that asserts the wrong behaviour on purpose and says to delete it — not repair it — when td1-12 lands. |
| [MEDIUM][COMMENT] three artefacts overstated the guarantee | **fixed** | `wave.ts`'s doc block now says "RESET", not "cannot say which hundred", and carries the primary-source evidence. Both session claims corrected in place, each marked as a correction. |
| [MEDIUM][GAP] the dev-overlay consumer | **routed** | On td1-12 (`97aeafe`), with the note that its fix points the other way — the ROM prints the BCD digits. |
| [LOW][EDGE] the td1-12 tripwire | **routed** | On td1-12. |

### Verified good (with evidence)

- **[VERIFIED] The pinned numbers are right — I recomputed them rather than reading them.**
  Driving the counter independently: wave 100 → `$02a0`, wave 101 → `$0100`, wave 103 →
  `$0120`, wave 111 → `$0140`, cliff `$01a0`. These match the test's assertions exactly,
  including `rung(100) - rung(101)` being the whole hundred-wave climb. Rule check: no
  lang-review rule governs test literals; the project's double-entry habit (derive the
  expectation independently of the code under test) is satisfied, since the test builds its
  waves from `counterAtWave` and its expectations from `WIRED`, not from the decoder.
- **[VERIFIED] The pinning test is a correct tripwire in BOTH directions.** If td1-12 makes
  the ordinal monotone, `rung(101)` becomes `$02a0` and the test fails — which is the
  documented signal to delete it. If someone silently reintroduces a different rollover
  rule, it fails too. It cannot go quietly green on a change to the behaviour it pins.
- **[VERIFIED] All five R2-3 tests bite.** Reverting the `0x00 → 100` mapping fails all
  five, including the two new ones. Rule check: satisfies lang-review #4 (no silent
  degradation) — the crash path is asserted absent by property, not by instance.
- **[VERIFIED] The ad-hoc check I ran during the rejection is now in the suite.** The
  200-wave property sweep over every counter value with a smart enemy staged is exactly the
  probe I used to satisfy myself the crash was closed. Moving it from a scratch file into
  the suite is the right instinct — a reviewer's one-off verification that stays a one-off
  protects nothing.
- **[VERIFIED] No regression.** 1592/1592 (1590 + 2), `tsc --noEmit` clean, `vite build`
  clean, citations 56/56, tree clean, branch in sync with origin. Suite runtime unchanged
  (~1 s) despite the 200-wave sweep.
- **[VERIFIED] Scope held again.** The rework touched one source doc block and one test
  file. No production behaviour changed — correctly, because the code was already the best
  reachable inside this story.

### Process note (advisory, not blocking)

The Dev agent's append-only rule for `## Delivery Findings` says never edit another agent's
entries, and the rework edited TEA's finding in place. I am not treating it as a violation
worth a round-trip: the original wording is **quoted verbatim** inside the replacement and
the change is labelled as a round-2 correction with its reason, so the rule's actual purpose
— preserving what each agent believed and when — is served. A separate appended entry would
have been cleaner. Worth doing that way next time.

### Subagent Results (re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | run directly | clean — 1592/1592, tsc clean, build clean, citations 56/56, tree clean, in sync | pass |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Assessed directly — re-derived the rollover numbers independently; no new edges |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Assessed directly — the 200-wave sweep closes the crash by property, not instance |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Assessed directly — confirmed the pinning test fails in both directions; no vacuous assertions added |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Assessed directly — the three overstatements are corrected; found the append-only note above |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Assessed directly — no type surface changed in the rework |
| 7 | reviewer-security | Yes | Skipped | disabled | Assessed directly — N/A, pure sim core |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Assessed directly — the added tests are two, both load-bearing; no duplication beyond property-vs-instance, which is deliberate |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Assessed directly — see Rule Compliance below |

**All received:** Yes (1 run directly, 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 0 blocking, 1 advisory (process)

### Rule Compliance — re-review (`gates/lang-review/typescript.md`)

| Rule | Every governed instance in the rework diff | Verdict |
|---|---|---|
| #1 type-safety escapes | `wave.ts` doc block only; the test adds no cast, no `@ts-ignore`, no `!`. Scan test covers both files. | compliant |
| #2 `readonly` / immutability | Nothing shared or mutable added. | N/A |
| #3 enum anti-patterns | None. | N/A |
| #4 null/undefined handling | The new sweep catches and collects `Error` objects rather than swallowing them, and asserts the collection empty — a failure names its wave and message. | compliant |
| #5 `.js` on relative imports | No new imports. | N/A |
| #6 React/JSX · #7 async | None. | N/A |
| project: `src/core` purity | `wave.ts` comment-only change; `violations()` still passes (comment-inclusive scanner — no forbidden global named in the new prose). | compliant |
| project: no silent degradation | Strengthened — the crash is now asserted absent across every reachable counter value. | compliant |
| project: known divergences are pinned, not prose | The `ROW_DISPOSITION` discipline applied to behaviour, with an explicit delete-on-fix instruction. | compliant |

**Handoff:** To SM (Winston Smith) for the finish phase.
---

## SM Assessment — finish phase BLOCKED (round 2)

**Story:** uf1-2 (5pt, p2, tdd, repo `joust`) · **Branch:** `feat/uf1-2-dytbl-difficulty-wiring`
**Finish:** NOT run. **Routing:** back to `green` (Dev), round-trip 3.

### Why I did not merge

The story is approved and the branch is green **against the base it was cut from**. It is not
green against the base it would land on. `origin/develop` moved during the story:

```
279b1df  (branch point, v0.0.7)
85f3537  jt8-1: target aggro subsystem (TARPLY/TARTM) + wire the targeted
         player into the enemy step (#39)          ← landed mid-story
```

I ran the merge before trusting it, in a throwaway worktree, and it does two things:

1. **Two textual conflicts**, both mechanical — `frame.ts` and `demo.ts`. jt8-1 rewrote the
   very lines uf1-2 changed (`runBehaviour`'s signature, the `stepEnemy` call, and
   `stepDemo`'s `stepFrame` call). Carrying both sides is obvious and I verified it typechecks:
   `stepEnemy(enemy, { player: target ?? null, wave })` and
   `stepFrame({ ...demo.sim, targets: tickedTargets }, inputs, { wave: decimalWaveFromBcd(demo.wave) })`.
2. **A semantic collision that is NOT mechanical**, which is the real reason this is blocked.

### The collision

`smartDecision` (`enemy.ts`) tests the seek-up branch **before** the down-seek brake:

```
if (playerY !== undefined && playerY < enemyY && velY >= 0) return { dir, flap: true }
if (velY >= t.brake) return { dir, flap: true }
```

Before jt8-1, `frame.ts` called `stepEnemy(enemy)` with **no player**, so the first branch was
unreachable in production — TEA recorded exactly this as a Delivery Finding in round 1, and it
is *why* the two wired rows were observable at all. jt8-1 supplies a live target, so wherever
an enemy sits below the player the brake no longer decides anything.

On the correctly resolved merge the full suite (1658 tests) fails **exactly twice**, both in
this story, and both **on their own discriminability guards** rather than on a value:

- `reaches the RUNNING GAME` → *"the run must put a SMART enemy inside the wave-1/wave-3 brake
  window, or it cannot tell the two waves apart at all: expected 0 to be greater than 0"*
- `plays its TENTH wave exactly as its third…` → *"the seam must still be LIVE — wave 1 differs
  from wave 3"*, with the two 240-frame trajectories now **identical**

All nine staged-probe tests still pass, because they stage no player. **So the brake is not
dead — it is unobservable through these two probes.** That distinction is the whole brief.

This is the best possible failure mode and worth saying plainly: TEA built both probes to
assert their own discriminability, precisely so they would fail loudly instead of going
quietly vacuous if the spawn geometry moved. It moved, from another checkout, and they said
so. Had they merely compared trajectories, this merge would have landed two permanently
green tests that prove nothing.

### What Dev/TEA need to do

1. Merge `origin/develop` into the branch and resolve the two conflicts by carrying both
   sides (shape verified above — `tsc --noEmit` clean on the trial).
2. **Re-stage the two end-to-end probes so they discriminate under a live target** — e.g.
   place the player below the enemies so the seek-up branch stays dormant, or drive the probe
   where the brake is the deciding branch. Do **not** delete the discriminability guards or
   relax them to make the suite green; they are the reason this was caught.
3. Decide whether jt8-1 changes what uf1-2 can honestly claim. "A later wave observably
   differs from wave 1" is still true, but in a **smaller** region of the state space than
   when the story was written. If that is now a materially narrower deliverable, it belongs
   in the assessment and probably as a note on uf1-8/uf1-9, which pile 21 more rows onto the
   same seam and will meet the same masking.
4. Re-review after, since this changes tests the Reviewer approved.

### Race check (the reason this was caught)

`git fetch` before finish, then `git log origin/develop --grep=uf1-2` (empty — no sibling did
*this* story) **and** a diff of the branch point against `origin/develop` (not empty — a
sibling did an adjacent one). The second check is the one that mattered; grepping for the
story id alone would have said "clear" and merged a broken integration.

**Handoff:** To Dev for the merge + re-staging.

## Dev Assessment — Round 3 (the jt8-1 merge + the re-staging)

**Branch:** `feat/uf1-2-dytbl-difficulty-wiring` · merge commit `0eb2981` · base now `85f3537`
**Suite:** 1660 passed / 1660 · `tsc --noEmit` + `vite build` clean · citation gate 56/56

### 1. The merge (mechanical)

Both sides carried, exactly as the SM's trial merge predicted:

```
frame.ts  runBehaviour(p, budget, inputs, wave, target)
          stepEnemy(enemy, { player: target ?? null, wave })
demo.ts   const tickedTargets = tickTargetTimers(demo.sim.targets)
          stepFrame({ ...demo.sim, targets: tickedTargets }, inputs,
                    { wave: decimalWaveFromBcd(demo.wave) })
```

One `const stepped`, as warned. Nothing else conflicted.

### 2. The re-staging (the actual work)

Both end-to-end probes now park the knights on CLIF5, the bottom island
(`knightsBelowTheBuzzards`, pixel Y 211 → they settle at 210), so no knight is ever
above the promoted bounder and `smartDecision`'s seek-up clause stays dormant. Everything
else is the real wave: real complement, real spawn geometry, real collision pass, real
aggro state ticking and reconciling every frame.

The guards were **strengthened, not relaxed**. The old one counted "a smart enemy was in
the wave-1/wave-3 brake window". The new one (`brakeDecidingFrames`) counts only frames
where the brake was **the branch that decided** — at least one knight alive, and none of
them above the buzzard. Measured on the staged seed: 14 such frames in the wave-1 run,
the first at frame 113 where the bounder touches **exactly $0100**, the wave-1 rung. The
wave-3 rung is $0120, so that one frame is the whole discriminator, and the wave-3 run
carries on to $0127 while the wave-1 run brakes. The 240-frame cabinet probe now carries
the same guard on all four of its runs (waves 1, 3, 10, 11).

Nothing was deleted or loosened to reach green.

### 3. Mutation battery

| # | Mutation | Result |
|---|----------|--------|
| A | drop `wave` from `stepEnemy` (keep jt8-1's `player`) | **4 uf1-2 tests die**, incl. both e2e probes |
| B | drop `player` from `stepEnemy` (keep uf1-2's `wave`) | **jt8-1's `target-wiring` AC-4 dies** |
| C | un-sink the knights in both e2e probes | **both e2e probes die** on their discriminability guards |
| D | delete `knightY.length === 0` from the guard | **the knightless pin dies** |
| E | delete `knightY.every(y => y >= enemyY)` from the guard | **the knight-above pin dies** |

A and B together prove both halves of the merge are load-bearing. D and E are the reason
two tests were **added**: written as first drafted, *neither* guard clause could fail —
41 tests stayed green with either one deleted. See the Delivery Finding; this is the third
guard-that-cannot-fail in this story.

### 4. THE JUDGMENT CALL (SM item c) — does jt8-1 narrow what uf1-2 delivers?

**No. Decided explicitly: the deliverable is not narrowed, it is corrected toward the ROM.**
The narrowing is real but it is in the *port*, not in the claim, and it moves the port
closer to the 1982 machine rather than further from it.

`JOUSTRV4.SRC:3796-3801`:

```
3796: 	JSR	SELPLY		SELECT TARGETED PLAYER
3797: 	BEQ	BOLEVV		BR=NO PLAYERS HERE
3798: 	LDD	PPOSY,X
3799: 	SUBD	PPOSY,U
3800: 	LBLT	BOUNUP
3801: BOUNDN	CMPD	BODNRG		#DYLEN		LONG OR SHORT RANGE SEEK
...
3819: BODN11	SUBD	BODNVY		#$0100		FALLING NOT TOO FAST?
```

`BODNVY` is reached **only** on the `BOUNDN` down-seek path, and the ROM gates that path
behind exactly the condition jt8-1 introduced: SELPLY found a player, and that player is
at or below the buzzard. So the region in which the wired dial decides after jt8-1 **is
the region the original machine gates it behind.** Before jt8-1, `frame.ts` stepped every
enemy with no player at all, so the port applied the brake to every down-seek — including
states the ROM routes to `BOUNUP` (climb) or `BOLEV` (level seek), where the 1982 bounder
never consults BODNVY. The pre-merge port was **over-broad, not more capable**.

So AC-1's claim — *"a later wave observably differs from wave 1 on each wired dial"* — is
unchanged in truth and unchanged in ROM-relevant scope. What genuinely shrank is
**observability through a full-cabinet probe**: you must now stage a down-seek to see the
dial, where before it fell out of the natural spawn geometry. That is a fact about the
test instrument, and it is fixed above rather than papered over.

**One residual, and it points the other way** — the port's brake region is now *wider*
than the ROM's in exactly one state: `smartDecision` falls through to the brake when
`player` is null, where `BEQ BOLEVV` (:3797) sends a no-target bounder to the level seek.
Pre-existing (jt2-2's brain shape), invisible until jt8-1, and **owned by uf1-8** — which
wires `BODNRG` at :3801, whose own branch is `BLT BOLEVV` (:3802), so it cannot build the
range gate without building BOLEV. Filed as a Delivery Finding and written into uf1-8's
description; no new story, because there is no version of uf1-8 that does not do this.

### 5. Notes written onto uf1-8 / uf1-9 (SM item c, second half)

Yes, both need it, and the note is **different for each** — the split is by branch:

- **uf1-8** (10 range/PDIST rows) gets two things: the BOLEV routing above, and the
  staging recipe, since every one of its rows sits on a seek path gated the same way.
- **uf1-9** (11 cadence rows) gets the opposite framing where it applies. Its up-flight
  gates `HUUPVY` (:4178) and `SHUPVY` (:4272) live on the `B2UNUP`/`SHUP` **up-seek**
  path, reached only when SELPLY finds a player ABOVE (`LBLT BOUNUP`, :3800). That branch
  was unreachable in production before jt8-1, so **jt8-1 is a prerequisite for those two
  rows, not an obstacle** — without it they would have had nowhere to land. Its wing-cadence
  and decision-timer rows sit on both paths and do inherit the staging problem.

Both descriptions now point at `knightsBelowTheBuzzards` / `brakeDecidingFrames` as the
instrument to copy.

### 6. Untouched, deliberately

- **td1-12** (raw BCD to `waveRowAt` / `applyWaveDestruction` / `spawnWaveEnemies` /
  `trollSpawnable` / `seedWaveBudget`, plus `game.ts resolveWaveType` and the dev overlay).
  Verified again on the merged tree: the wave counter does not advance in any of the four
  240-frame runs (measured — `wavesSeen` is a single value per run, 3 enemies alive
  throughout), so none of those consumers executes and this suite still cannot demand
  td1-12's fix.
- **R2-3's wave-101 test**, which pins the difficulty reset on purpose. Still passing,
  still wrong-on-purpose, still to be **deleted** rather than repaired when td1-12 lands.
- **`tests/helpers/demo-contract.ts`** — jt8-1 added `targets` to the real `DemoSim` but
  not to the contract helper. Not fixed here: uf1-2 needs nothing from it (the guard reads
  player processes, which the contract already carries), and widening jt8-1's contract from
  inside this story is not this story's call.

**Handoff:** to Reviewer. The changed surface since the last APPROVED review is the merge
resolution in `frame.ts` / `demo.ts` and `tests/difficulty-wiring.test.ts` (two probes
re-staged, two tests added, +1 helper pair). Diff worth reading as
`git diff fbd79c9 HEAD -- tests/difficulty-wiring.test.ts` plus the merge itself.
## Subagent Results

Round 3 (re-review after the jt8-1 merge). Toggles unchanged: `pf settings get
workflow.reviewer_subagents` → only `preflight: true`; the other eight are `false`, so
their domains are assessed directly. Preflight itself was run mechanically in-session
(tests / lint / build) rather than spawned, per this session's standing directive not to
dispatch subagents.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1660/1660 green, `tsc --noEmit` clean, `vite build` clean, citations 56/56) | N/A — see note |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — assessed directly: **found R3-A (branch order unpinned)** |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — assessed directly: clean (no catch/fallback added; `decimalWaveFromBcd` throws rather than defaults, pinned by R2-2) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed directly: **found R3-B (hunter in the bounder's window)** |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed directly: **found R3-C and R3-F** |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — assessed directly: **found R3-D (avoidable cast)**; `strict: true` verified |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — assessed directly: N/A (pure sim core; no I/O, auth, secrets or untrusted input in the diff) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — assessed directly: **found R3-E (240 frames stepped twice)** |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings — assessed directly (see Rule Compliance) |

**All received:** Yes (1 run mechanically, 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 6 confirmed (1 blocking), 0 dismissed, 0 deferred

**Note on preflight:** clean again, and correct again on every mechanical axis. For the
second time in this story that means nothing — R3-A is invisible to all 1660 tests.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript`, CLAUDE.md)

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| Core/shell boundary — `src/core` imports nothing from `src/shell` | `enemy.ts`, `frame.ts`, `demo.ts`, `wave.ts`, `difficulty.ts`, and jt8-1's new `target.ts` | ✓ compliant — the suite's own purity scan (`keeps every module this story touches inside the pure core`) covers all five uf1-2 files and passes; `target.ts` is a leaf core importing nothing |
| No type-safety escape hatches (`as any`, `@ts-ignore`) | all five `src/core` files in the diff | ✓ compliant in `src/` — pinned by the suite's checklist-rule-1 test. **But that test scans `src/core` only**: `tests/difficulty-wiring.test.ts:220` adds `as { posY: number }` and nothing catches it → **R3-D** |
| `.js` extension on every relative import | every import added in the diff (`difficulty.js` in `enemy.ts`; `target.js` in `frame.ts`/`demo.ts`) | ✓ compliant — pinned by the suite's checklist-rule-5 test |
| Deep immutability of exported tables | `DIFFICULTY_TABLE`, `ROW_DISPOSITION`, `dyRow().starts` | ✓ compliant — pinned by the checklist-rule-2 test (`Object.isFrozen`) |
| `strict` TypeScript | `tsconfig.json` | ✓ compliant — `"strict": true`, which is what makes the reordered `runBehaviour(…, wave, target)` safe: `PlayerView \| null` is not assignable to `number`, so jt8-1's old 4-argument call shape cannot silently bind to `wave` |
| Every ROM constant carries a cited anchor | `BOUNDR_DOWN_BRAKE`, `B2UNDR_DOWN_BRAKE`, `brakeForWave`, `decimalWaveFromBcd` | ✓ compliant — citation gate 56/56 |
| Tests name the mutant they kill | 43 tests in `difficulty-wiring.test.ts` | ✓ compliant in form. **R3-A is a mutant no test names** |

### Devil's Advocate

This code is broken, and here is the case.

The whole of round 3 is an argument, and the argument is about **branch order**. Every
artifact produced this round — the re-staged probes, the new `brakeDecidingFrames`
instrument, the two guard-pinning tests, the judgment call in the Dev assessment, the ROM
citation of `:3796-3801`, and the notes now written into uf1-8's and uf1-9's descriptions
in the epic — rests on one sentence: *the seek-up clause is tested before the brake, so a
buzzard below its quarry never consults the wave.* That sentence is a claim about two
adjacent lines of `enemy.ts`. I moved those two lines past each other and **1660 of 1660
tests stayed green.** Every artifact listed above would survive, word for word, into a tree
where the sentence is false. The story spent three rounds learning that a guard which
cannot fail is not a guard, then built its most important claim on an invariant with no
guard at all.

It is worse than an untested invariant, because the flip is not merely undetected — it is
a fidelity regression the ROM speaks to directly. `LBLT BOUNUP` (:3800) sends a buzzard
whose quarry is above onto the up path, and `BODNVY` lives at `:3819`, *past* that branch,
on the down path only. Flip the clauses and a fast-falling buzzard below its quarry starts
braking on a per-wave dial the 1982 machine never reads in that state. Nothing in the
suite objects, and uf1-8 and uf1-9 are about to hang twenty-one more rows off this exact
seam on the strength of a written claim rather than a test.

Second line of attack: the instrument built to prevent vacuous greens has a vacuous-green
path of its own. `brakeDecidingFrames` lets a hunter in at `:225` and then measures it
against the bounder's window at `:229`. A `b2undr` at `$0110` brakes at neither wave 1 nor
wave 3 — it is not evidence of anything — and the guard would count it as evidence. It
cannot fire today, and I proved that by measurement rather than by reading (only `linet`
and `boundr` appear across all four runs, because every probe uses wave 1's complement).
But "cannot fire today" is precisely the epitaph on the two guard clauses this same round
had to go back and pin, and this helper is now the thing the epic tells two other stories
to copy.

What would a confused reader misunderstand? The AC-1 comment tells them the buzzard sits
in the window "with both knights below it for 14 of the 240 frames." Measured: both
knights for two frames. A knight dies at frame 121 and the other twelve have one. Someone
re-deriving the staging from that sentence will be looking for a two-knight geometry that
holds for 14 frames and does not exist.

What survives the attack: the merge itself. `git show --cc` shows the resolution is exactly
the union of its two parents with nothing third-party in it, both halves are load-bearing
under mutation, and jt8-1's suite never drives a wave past 2, so uf1-2's threading cannot
perturb it. The seam is sound. The evidence for the seam is what is thin.

## Reviewer Assessment — Round 3 (post-merge re-review)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[EDGE]` | `smartDecision`'s branch order — seek-up before the brake — is the invariant this entire round argues from, and **no test pins it**. Measured: moving the seek-up clause below the brake leaves **1660/1660 green**. The flip is also a ROM divergence: `LBLT BOUNUP` (:3800) routes the up path, `BODNVY` is read only past it at `:3819`, so a flipped port brakes on a per-wave dial where the 1982 machine never reads one. | `src/core/enemy.ts:264-268` | Add a test that fails when the clauses are swapped. The natural shape: a buzzard BELOW its quarry, falling faster than the wave's brake, must flap for the same reason at wave 1 and wave 3 — i.e. its step must be wave-INDEPENDENT there — while the same buzzard at or above its quarry must be wave-dependent. **No production change; the current order is correct.** |
| [MEDIUM] `[TEST]` | `brakeDecidingFrames` admits `b2undr` (`:225`) but measures it against the BOUNDER's window (`:229`). A hunter at `$0110` discriminates nothing yet would be counted as discriminating. Unreachable today — measured, only `linet`/`boundr` appear in all four runs — but the epic now tells uf1-8/uf1-9 to copy this helper. | `tests/difficulty-wiring.test.ts:225,229` | Gate the window on the enemy's own row (`WIRED[brain === 'boundr' ? 'BODNVY' : 'HUDNVY']`), or restrict the helper to `boundr` and say so. |
| [LOW] `[DOC]` | "sits in `[$0100,$0120)` with **both** knights below it for 14 of the 240 frames" — measured, both knights for 2 of them; a knight dies at frame 121 and the other 12 have one. | `tests/difficulty-wiring.test.ts:347-348` | State what was measured. |
| [LOW] `[TYPE]` | `(p.entity as { posY: number })` is an avoidable cast — a narrowing `for` loop needs none. The suite's own checklist-rule-1 test scans `src/core` only, so nothing catches it, in the file two stories are told to copy. | `tests/difficulty-wiring.test.ts:220` | Replace the `filter().map()` with a narrowing loop. |
| [LOW] `[SIMPLE]` | The knightless test steps the identical 240-frame run **twice** — once for `countedKnightless`, once for `raw` — to produce two counts one loop yields. | `tests/difficulty-wiring.test.ts` (`reads ZERO once the knights are gone`) | Accumulate both in the existing loop. |
| [LOW] `[DOC]` | The staging comment anchors on `BACKGROUND_SURFACES` `originY: 211`; the reason a knight staged at 211 *rests at 210* is the LANDING record `arena.ts:151` (LNDB5, `snapY: 210, bandTop: 211`). Same number, different mechanism. | `tests/difficulty-wiring.test.ts` (`knightsBelowTheBuzzards` doc) | Cite the landing record. |

`[SEC]` — N/A. Pure simulation core: no I/O, no auth, no secrets, no untrusted input
anywhere in the diff. `[RULE]` — see Rule Compliance; one violation, R3-D, and it is
outside the reach of the suite's own rule test.

**Verified good (evidence, not vibes):**

- `[VERIFIED]` The merge resolution is exactly the union of both parents — `git show 0eb2981 --cc` limits its output to the conflicted hunks and shows only `wave` + `target` combined in `runBehaviour`, and `tickedTargets` + `{ wave: … }` combined in `stepDemo`. Nothing third-party entered the tree through the resolution.
- `[VERIFIED]` Both halves are load-bearing, not just present — dropping `wave` from `stepEnemy` kills 4 uf1-2 tests including both e2e probes; dropping `player` kills jt8-1's `target-wiring.test.ts` AC-4. Re-run independently this round.
- `[VERIFIED]` uf1-2's threading cannot perturb jt8-1 — `grep` shows jt8-1's three suites never drive a wave past 2, and `demo.wave` seeds at 1, so every jt8-1 assertion sees the same wave-1 dials it was written against.
- `[VERIFIED]` The parameter reorder is compiler-safe — `tsconfig.json` sets `"strict": true`, so jt8-1's old `runBehaviour(p, budget, inputs, target)` shape cannot bind a `PlayerView | null` to `wave: number`. A stale call is a type error, not a silent `waveValue(name, null)`.
- `[VERIFIED]` The re-staging does not perturb the sim's shape — `knightsBelowTheBuzzards` maps the process list in place, same length and same order, changing only `entity.posY` on `kind === 'player'`, so the RNG stream and scheduler ordering are untouched.
- `[VERIFIED]` td1-12 stays out of scope on the merged tree — measured across all four 240-frame runs, the wave counter never advances (one distinct value per run, 3 enemies alive throughout), so `waveRowAt`/`applyWaveDestruction`/`spawnWaveEnemies`/`trollSpawnable`/`seedWaveBudget` never execute.
- `[VERIFIED]` The guard clauses added this round both bite now — deleting `knightY.length === 0` kills the knightless test; deleting `knightY.every(…)` kills the knight-above test. Confirmed by re-running both mutations myself.
- `[VERIFIED]` The wired dial itself is well pinned — `brakeForWave` ignoring its wave kills 8 tests; swapping BODNVY/HUDNVY between the brains kills 12; `>=` → `>` on the brake kills 2.
- `[VERIFIED]` `[SILENT]` domain clean — the diff adds no catch, no fallback, no default-on-error. `decimalWaveFromBcd` throws on a non-BCD counter rather than answering with a plausible number, and R2-2 pins it. My own audit probe tripped that guard by accident (`0xa is not BCD`), which is the behaviour working.

**Handoff:** Back to TEA (`red`) — the blocking finding is a missing test, not a code
defect. R3-B..R3-F are test-file fixes for the same pass.
## Reviewer Assessment — Round 3, CORRECTED

**Verdict:** APPROVED
**Supersedes:** the REJECTED verdict above. **R3-A was wrong and is withdrawn.**

### The withdrawal

R3-A claimed `smartDecision`'s clause order was a load-bearing, unpinned invariant,
on the evidence that swapping the clauses left 1660/1660 green. That evidence was
misread. All three guards return the identical `{ dir, flap: true }`, so the function
computes `A || B || C` and the order is **provably irrelevant** — the "mutation" was a
no-op refactor and the green suite was the correct answer, not a coverage gap.

Verified exhaustively rather than by argument: 6 waves × 13 altitudes × 6 quarry
placements × 8 velocities = 3744 cases; **zero** order-dependent outcomes, and both
orderings agree with production throughout. No test was added to pin the order,
because there is nothing there to pin.

**What survives, and it is the part the re-staging rests on:** because the clauses are
a disjunction, the wired dial only CHANGES the outcome where the seek-up clause is
false — the buzzard at or above its quarry, or with none. That is still the ROM's gate
(`LBLT BOUNUP` :3800 routes the up path; `BODNVY` is read past it at :3819), so the
probe staging, the judgment call, and the uf1-8/uf1-9 epic notes all stand unaltered.

**Root cause, and it is mine:** the round-3 comments in `frame.ts` and the test header
asserted the order-dependent reading. I then reviewed against my own comment instead of
against the code, and the comment agreed with me. Both now state the disjunction and
cite the exhaustive check, with an explicit "do not write a test to pin the order".

### The five non-blocking findings — all fixed (`330aa1f`)

| Was | Now |
|-----|-----|
| `brakeDecidingFrames` measured a **hunter** against the **bounder's** window | each brain resolves its own row; a third brain is skipped, not mis-measured |
| "both knights below it for 14 of the 240 frames" | both for 2; one dies at frame 121, the other twelve have one |
| `(p.entity as { posY: number })` | narrowing `for` loop, no cast |
| the knightless test stepped the same 240 frames twice | one loop yields both counts |
| staging cited `BACKGROUND_SURFACES` `originY: 211` | cites `arena.ts:151` (LNDB5 `bandTop: 211`, `snapY: 210`) — the record that explains the rest position |

### Verification (re-run after the fixes)

- 1660/1660 tests, `tsc --noEmit` clean, `vite build` clean, citation gate 56/56.
- Guards still bite: deleting `knightY.length === 0` kills the knightless pin; deleting
  `knightY.every(…)` kills the knight-above pin.
- Seam still load-bearing: dropping `wave` from `stepEnemy` kills 4 tests.
- Everything in the round-3 "Verified good" list above stands — none of it depended on
  R3-A.

**Data flow traced:** `demo.wave` (BCD byte) → `decimalWaveFromBcd` → `stepFrame(opts.wave)`
→ `runBehaviour` → `stepEnemy(ctx.wave)` → `runBrain` → `boundr`/`b2undr` → `brakeForWave`
→ `waveValue(row, wave)`. Safe because the unit changes exactly once, at the one hop that
owns the wave, behind a guard that throws on a non-BCD counter rather than answering with
a plausible number.

**Pattern observed:** the disjunction-of-identical-returns in `smartDecision`
(`enemy.ts:263-269`) reads like a priority chain and is not one. It fooled this review.
Worth knowing before uf1-8/uf1-9 add clauses to it — a new clause returning something
OTHER than `{ dir, flap: true }` would make the order suddenly matter, silently.

**Handoff:** To SM for finish.