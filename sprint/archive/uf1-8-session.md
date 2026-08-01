---
story_id: "uf1-8"
jira_key: "uf1-8"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-8: joust DYTBL flight-control rows — wire the long/short range seek and the PDIST distance-to-go (10 rows)

## Story Details
- **ID:** uf1-8
- **Jira Key:** uf1-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Assignee:** Keith Avery
- **Repos:** arcade
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T17:39:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T14:37:25+00:00 | 2026-08-01T14:40:23Z | 2m 58s |
| red | 2026-08-01T14:40:23Z | 2026-08-01T15:19:36Z | 39m 13s |
| green | 2026-08-01T15:19:36Z | 2026-08-01T17:27:22Z | 2h 7m |
| review | 2026-08-01T17:27:22Z | 2026-08-01T17:39:31Z | 12m 9s |
| finish | 2026-08-01T17:39:31Z | - | - |

## Story Context

### Description (VERBATIM from sprint/epic-uf1.yaml)
Ten DYTBL rows drive the ROM's long/short RANGE SEEK decision and the PDIST 'distance to go' budget, and joust/src/core/enemy.ts models NEITHER mechanic — smartDecision has no range gate and no PDIST at all, so the rows have nowhere to land. The rows and their single ROM consumers, recovered by grepping each label in JOUSTRV4.SRC: BODNRG :3801, BOUPRG :3844, HUDNRG :3984, HUUPRG :4028, SHDNRG :4243, SHUPRG :4257 (each 'CMPD/SUBD <row>  LONG OR SHORT RANGE SEEK' against the player Y-delta), and BODNDI :3803, BOUPDI :3851, HUDNDI :3988, HUUPDI :4035 ('SET DISTANCE TO GO DOWN/UP' into PDIST,U). NOTE THE NAMING TRAP that uf1-2 hit: RG is RanGe, NOT eneRGy — 'DYLEN EQU $14-6' = 14 and BODNRG's GA1-5 start is $000E = 14, i.e. the row replaced the hardcoded '#DYLEN' immediate, and the ROM comment says RANGE SEEK outright. Every row's GA1 column 1 reproduces exactly the pre-DYTBL immediate the ROM's trailing comments record, so the wave-1 value is a free correctness check on any port. Build the range gate and the PDIST model first; the wiring is then the uf1-2 seam (difficulty.waveValue) applied to new consumers. uf1-2 shipped the seam, the wave threading through stepEnemy/stepFrame/stepDemo, and the ROW_DISPOSITION inventory that lists these ten as owned here. TWO THINGS jt8-1 (the aggro subsystem, joust#39) HANDS THIS STORY. (1) THE BOLEV ROUTING IS YOURS. The ROM reaches BODNRG only after 'JSR SELPLY / BEQ BOLEVV  BR=NO PLAYERS HERE' (:3796-3797) and the down/up split at :3800, and the range gate you are building IS the very next branch, 'CMPD BODNRG / BLT BOLEVV  BR=SHORT RANGE SEEK' (:3801-3802) — so you cannot wire BODNRG without deciding what BOLEV, the level seek, does. That matters beyond the range gate: enemy.ts smartDecision currently FALLS THROUGH to the down-seek brake when the target is null, where the ROM routes a no-target bounder to BOLEV and never consults BODNVY at all. So the port still reads the wired dial in one state the 1982 machine does not. It predates uf1-2 and jt8-1 only made it visible; it is not filed separately because building BOLEV is unavoidable here. (2) STAGE YOUR END-TO-END PROBES. smartDecision tests seek-up BEFORE the brake, and the brake only fires at velY >= $0100 >= 0, so a quarry ABOVE the buzzard pre-empts every down-seek row unconditionally. A full-cabinet probe on the natural spawn geometry therefore cannot see a down-seek row at all — this broke uf1-2's two end-to-end tests on the merge. tests/difficulty-wiring.test.ts carries the fix to copy: knightsBelowTheBuzzards parks the knights on CLIF5 and brakeDecidingFrames guards that the run reached the region where the dial decides.

### Acceptance Criteria
**NOTE:** This story has NO acceptance_criteria field in sprint/epic-uf1.yaml. TEA must derive acceptance criteria from the description above rather than from a pre-written list.

### Key Files & Paths
The tree is now `plugins/joust/src/...` (the story description says `joust/src/...`, which was written pre-migration from the nine-repo setup).

Key files for this story:
- `plugins/joust/src/core/enemy.ts` — smartDecision function, needs range gate and PDIST model
- `plugins/joust/src/core/difficulty.ts` — uf1-2's difficulty.waveValue seam and ROW_DISPOSITION inventory
- `plugins/joust/tests/difficulty-wiring.test.ts` — reference probe pattern (knightsBelowTheBuzzards, brakeDecidingFrames)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The ROM's bounder/hunter lava escape (`BODIRL`/`B2DIRL` — "BELOW CLIF5? … GO UP FAST BEFORE THE LAVA GETS ME", the common exit of every seek state) is modeled only for the shadow lord in this port (`lavaEscape: false` for boundr/b2undr). Not one of this story's ten rows.
  Affects `plugins/joust/src/core/enemy.ts` (a future story adds the check at the brains' common exit).
  *Found by TEA during test design.*
- **Gap** (non-blocking): The up-seek "CLIFF IN THE WAY" test (`BCKXTB`/`BCKYTB`, JOUSTRV4.SRC:3846-3850 / :4030-4034) has no port model; a long-range up decide arms unconditionally here. Recorded so the next sweep reads it instead of rediscovering it.
  Affects `plugins/joust/src/core/enemy.ts` (needs the background collision tables before it can land).
  *Found by TEA during test design.*
- **Question** (non-blocking): The ROM's bounder/hunter LEVEL-flight line comparison is POLARITY-INVERTED versus the shadow's (`LDB PDIST+1,U / CMPB PPOSY+1,U / BLO` in BOLEV1/B2LEV1 flaps a falling buzzard AT-OR-ABOVE its line, while SHLEP1's `CMPB PDIST+1,U / BLS` rests it there) — the bounder's level flight stair-climbs. The per-wake collapse pinned this story follows each brain's own polarity; uf1-9 (the BOLETM episodes) should port the inversion as-is, not "fix" it to the shadow's shape.
  Affects `plugins/joust/src/core/enemy.ts` (uf1-9's level-flight episodes).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): The up-episode wing cadence (BOUPWD `#2` / BOUPWU `#8` reloads at :3849/:3893) is deliberately NOT pinned — those are uf1-9's rows; the tests pin the shipped flap-iff-not-rising approximation only where both models agree.
  Affects `plugins/joust/src/core/enemy.ts` (uf1-9 replaces the approximation with the timed cadence).
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): jt8-2's live-compare homing throttle goes INERT in ordinary play under uf1-8's per-wake level flight — a level buzzard flaps every falling wake and saturates its FLYX index before the TARTIM grace clears, so only a player actually flying the saturated rung ever ticks the counter (measured: 0 reversals over 2,400 frames, four seeds, wandering or idle).
  Affects `plugins/joust/src/core/enemy.ts` (uf1-9's PPVELX snapshot + BOLETM decision boundary restore it; `tests/homing-wiring.test.ts` carries an inverted known-divergence pin designed to fail when they land).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): a single `stepDemo` wake can never see a target — `reconcileTargets` registers players at step END with TARTIM grace armed — so any one-step probe staging that assumes a visible knight measures the null-target path instead; under uf1-8 that path is wave-invariant and such probes pass vacuously.
  Affects `plugins/joust/tests/difficulty-wiring.test.ts` (corrected here — committed-episode staging; the `demoAtCounter` docstring now documents the grace reality for the next probe author).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the jt5-4 kill-egg stall (seeds 0xbeef/0x2468/0x1a2b3c4d never clearing wave 1 under the fixed script) self-resolves under uf1-8 — committed dives drop the kill-eggs by the idle knight, and 0xbeef now clears wave 1 at frame 820. The kill-egg self-maturation gap itself (no `waveEgg` tag → the self-clear hatch never matures it) remains open, merely no longer exhibited by this script.
  Affects `plugins/joust/src/core/demo.ts` (the still-open jt4-4/jt4-5 maturation gap).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): game-jt4-5.test.ts's staging helpers (`enemyProc`, now `divingEnemyProc`) build their process literals through `as unknown as DemoProcess` double-casts — a lang-review #1 pattern repeated file-wide since jt4-5. A small follow-up typing the helper against the demo contract would retire the idiom and let tsc police the staged shapes.
  Affects `plugins/joust/tests/game-jt4-5.test.ts` (type the staging helpers; remove the double-casts).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): for uf1-9's intake — this review verified in source that the level/up-flight cadence family it owns is bigger than the row list reads: BOUPWD/BOUPWU + PJOYT (bounder), the HU twins, SHUPVY + the SHUP0/SHUP1 alternation, SHUPTM/SHLETM/BOLETM/HULETM decision timers, PPVELX snapshot, and the homing-wiring inverted pin + the level-flight polarity inversion (TEA's Question) all land together; landing them piecemeal will strand the same guards twice.
  Affects `plugins/joust/src/core/enemy.ts` (uf1-9 scope note).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Level flight is pinned PER-WAKE, not episodic.** The ROM times every level-flight episode with the BOLETM family ("TIME UNTIL NEXT DECISION"), and all five of those rows are uf1-9's. The contract therefore gives `SeekState.mode` no `'level'` value and pins that level wakes carry NO workspace — bounder/hunter collapse to "flap iff falling", the shadow to its live line-track. uf1-9 adds the episodes without unwinding anything pinned here.
- **The shadow's SHLEP tracks the player's LIVE line** (and SHLEV the live own line) rather than a line snapshotted at episode entry — the jt8-2 live-`velXIndex` precedent: without uf1-9's decision boundary there is no moment at which a snapshot could honestly be taken.
- **The up-episode flap cadence is not the ROM's wing timer.** BOUPWD/BOUPWU (and HU twins) are uf1-9's rows; the tests pin flap-iff-not-rising and stage no rising-arm case, so either model passes until uf1-9 lands the real cadence.
- **Test omission: the PSTATE ground-exit (BODN1 :3811-3812) is contract-documented but not unit-pinned.** Staging a grounded enemy requires arena-coupled ground fixtures; the law is stated in `enemy-contract.ts` for Dev and is observable end-to-end whenever a committed seeker lands.
- **uf1-2's brake probes were re-staged, not preserved.** `difficulty-wiring.test.ts` staged the BODNVY/HUDNVY mirrors on the null-target fall-through — the exact state this story's spec says the 1982 machine never read the dial in. They now stage a long-range quarry below (`FAR_BELOW` / parked knights + a homing-neutral `prdir $FF` probe), where the brake is legitimately the deciding branch under both the shipped code and the new spec — measured green on both sides of the change.

### Dev (implementation)
- **26 sibling pins across 7 suites re-seated — TEA's "nothing else in the 2050 moves" did not survive measurement.**
  - Spec source: uf1-8 session, TEA Assessment (Handoff)
  - Spec text: "GREEN means: `enemy.ts` grows the range-gated, episodic decide on the uf1-2 seam; `difficulty.ts` flips ten dispositions to wired; nothing else in the 2050 moves."
  - Implementation: enemy.ts/difficulty.ts changed exactly as specified, but 26 tests in 7 sibling suites (difficulty-wiring, homing-wiring, game-jt4-5, audio-thud, audio-events, audio-emission, audio-flap) pinned measured trajectories or stagings of the retired routing; each was re-seated by measurement on the post-uf1-8 tree with its CLAIM preserved (frozen digests re-frozen, staged frames re-found, stagings moved onto the regimes the new spec defines).
  - Rationale: the new routing legitimately re-flies every smart buzzard from its first promoted wake — the pins were measurements of the old flight, not laws; `rng` cursors and player entity rows are bit-identical throughout, which is what bounds the re-baseline (recorded in audio-thud's AC7 ruling).
  - Severity: minor
  - Forward impact: minor — audio-thud AC7 now carries the uf1-8 re-baseline line (player rows + rng moving is a regression under any story that doesn't touch player physics or the RNG schedule).
- **The homing liveness guard is INVERTED until uf1-9: an idle stick now yields ZERO reversals.**
  - Spec source: context-story-uf1-8.md (the BOLEV routing) vs tests/homing-wiring.test.ts AC-4 (jt8's standing liveness guard)
  - Spec text: AC-3 "a no-target bounder/hunter flies level (flap iff falling) and NEVER consults the BODNVY/HUDNVY dial" — vs the AC-4 pin "an untouched stick must still produce a reversal"
  - Implementation: per-wake level flight saturates a level buzzard's FLYX index (±MAXVX) before the TARTIM grace clears, so jt8-2's live-compare throttle never matches an idle or wandering player — measured 0 reversals over 2,400 frames on all four seeds. AC-4 re-staged onto a measured chase-then-drop script (main ≥1 reversal, cleared-counter control 0, on every seed) and the input-independence pin inverted into a known-divergence pin naming uf1-9 as its retirement.
  - Rationale: the AC-2/AC-3 pins force the per-wake level collapse (the BOUPWD/BOUPWU cadences and the PPVELX snapshot are uf1-9's rows); no implementation can satisfy them and keep the grace-expiry matched-wake mechanism.
  - Severity: major
  - Forward impact: major for uf1-9 — landing BOLETM/PPVELX should revive idle-stick reversals; the inverted pin is written to FAIL then and instructs its own rewrite rather than a "repair".
- **Single-step demo probes are NULL-TARGET probes — committed-episode staging replaces the parked-knight premise.**
  - Spec source: tests/difficulty-wiring.test.ts, TEA's re-staged `demoAtCounter` docstring
  - Spec text: "One `stepDemo` on this state reproduces `stepEnemy(probe, { player: FAR_BELOW, wave })` on the entity" (via parked knights)
  - Implementation: `reconcileTargets` registers players only at step END with TARTIM=90 grace, so a one-step probe reads `selectTarget` = null whatever is parked below; the R2-1 probes now ride a committed down episode (the wave's own DI budget, unspent), which runs the brake law target-or-none and restores the demo-side wave discrimination a null-target BOLEV wake had silently removed (it flaps at every wave — the R2-1 named probes would have passed vacuously). The knightless AC-1 run gained an armed-episode diver for the same reason.
  - Severity: minor
  - Forward impact: minor — the corrected docstring warns the next single-step-probe author.
- **game-jt4-5's killers staged as committed divers.**
  - Spec source: tests/game-jt4-5.test.ts (the played-deaths game-over probes)
  - Spec text: "each positioned just BELOW a materialised enemy (the higher entity wins the joust) — so the sim itself KILLS them"
  - Implementation: the staged killers promote on their first wake, and a promoted buzzard 12 px (< BODNRG 14) over a knight — or graced into null-target — flies LEVEL and flaps away upward; both probes now use `divingEnemyProc` (pchase 1, `seek: { mode: 'down', pdist: -3584 }`), reproducing the pre-uf1-8 no-flap fall onto the knight.
  - Severity: minor
  - Forward impact: none — the game-over logic under test is untouched.

### Reviewer (audit)
- **TEA: level flight pinned PER-WAKE, not episodic** → ✓ ACCEPTED by Reviewer: verified against the source — the BOLETM/PJOYT cadence machinery is real and entirely inside uf1-9's rows; the collapse is the only shape that doesn't invent an exit cadence.
- **TEA: SHLEP/SHLEV track the LIVE line** → ✓ ACCEPTED by Reviewer: without the BOLETM boundary there is no honest snapshot moment; consistent with the jt8-2 precedent.
- **TEA: up-episode flap cadence is not the ROM's wing timer** → ✓ ACCEPTED by Reviewer: confirmed in source — `BOUP1A` flaps unconditionally on the arm wake and `BOUP11/BOUP2` run the PJOYT cadence; TEA staged no rising-arm case, so either model passes until uf1-9. The deviation text is accurate.
- **TEA: PSTATE ground-exit contract-documented, not unit-pinned** → ✓ ACCEPTED by Reviewer: the law is implemented (`seekWake` drops a carried episode when `airborne` is false) and stated on the contract; arena-coupled staging is a fair reason to defer the unit pin.
- **TEA: uf1-2's brake probes re-staged, not preserved** → ✓ ACCEPTED by Reviewer: the null-target fall-through is precisely what this story retires; the FAR_BELOW/parked-knight framing was right in intent, and where its single-step premise failed (TARTIM grace) Dev's committed-episode staging completed it.
- **Dev: 26 sibling pins re-seated** → ✓ ACCEPTED by Reviewer: audited per suite; every re-seat preserves its original claim (misdecode discrimination re-traced, homing mechanism bracketed by chase + control, rng/player invariants value-checked); the re-baseline is bounded and recorded in audio-thud AC7.
- **Dev: homing liveness inverted until uf1-9** → ✓ ACCEPTED by Reviewer: forced by the AC-2/AC-3 pins; the inverted pin names its retirement story and fails on revival — the correct known-divergence form. Severity major is the right call and the uf1-9 handoff is recorded in Delivery Findings.
- **Dev: committed-episode staging for single-step probes** → ✓ ACCEPTED by Reviewer: independently verified that a bare probe's wake is null-target (reconcile registers at step END with TARTIM grace) and that the episode staging RESTORES the wave discrimination a BOLEV wake removes — this fix prevented two guards from going silently vacuous.
- **Dev: game-jt4-5 committed divers** → ✓ ACCEPTED by Reviewer: reproduces the pre-uf1-8 fall exactly (brake law holds wings under BODNVY at the staged velocities); the claim "real deaths booked by stepGame" is intact.
- **UNDOCUMENTED (added by Reviewer): the shadow's long-UP seek is a per-wake collapse of the ROM's SHUP0/SHUP1 alternation.** Spec (source) has the arm wake wings-up (`SHUP0 CLRB`, :4266) then ONE `SHUP1` wake that flaps unless rising faster than SHUPVY (:4269-4274) before re-entering the decide; the port collapses this to flap-iff-not-rising every wake. A slow-rising long-up shadow therefore holds wings here where the 1982 machine alternates. Not separately logged by TEA/Dev — it is implicitly bounded by ROW_DISPOSITION (SHUPVY/SHUPTM owned by uf1-9) and TEA staged only rising cases where the models agree. Severity: L. uf1-9 ports the alternation with its rows; no action this story.

## Sm Assessment

Setup is complete and verified on disk. Session file created with the story description copied verbatim from sprint/epic-uf1.yaml — all ten DYTBL row citations (BODNRG :3801, BOUPRG :3844, HUDNRG :3984, HUUPRG :4028, SHDNRG :4243, SHUPRG :4257, BODNDI :3803, BOUPDI :3851, HUDNDI :3988, HUUPDI :4035) confirmed intact. Story moved to in_progress in sprint/epic-uf1.yaml with started stamped. No Jira in this project — jira_key is the story id, claim explicitly skipped. Branch creation skipped by design: trunk-based repo, work lands on main.

The story carries NO acceptance_criteria in the YAML — TEA must derive them from the description, which is the spec (it names each row's single ROM consumer, the BOLEV routing obligation, and the end-to-end probe staging trap that broke uf1-2's merge). Key files are pre-noted with migration-corrected paths: plugins/joust/src/core/enemy.ts, plugins/joust/src/core/difficulty.ts, plugins/joust/tests/difficulty-wiring.test.ts.

Ready for handoff to TEA (red phase).

## Acceptance Criteria (derived by TEA)

Derived from the story description against JOUSTRV4.SRC; each is pinned by the
matching describe-block in `plugins/joust/tests/seek-wiring.test.ts`.

- **AC-1 — the ten-row anchors:** waveValue reads each row's wave-1 value at the
  shipped GA1 (the pre-DYTBL immediates for the bounder/hunter rows; 16/−32 for
  the retuned shadow gates), escalates by wave 3, and the BO/HU DI twins diverge
  on wave 5 (cadence nibbles 2 vs 15).
- **AC-2 — the range gate:** every smart brain routes LONG vs SHORT on the
  whole-pixel player Y-delta against ITS OWN wave-scaled RG row, strict-inclusive
  on the long side (delta ≥ row is long down; delta ≤ row is long up), and the
  routing mirrors the wave. The bounder/hunter RG twins (identical GA1-5 curves)
  and the flap-invisible SHDNRG are guarded by call-site source anchors.
- **AC-3 — the BOLEV routing:** a no-target bounder/hunter flies level (flap iff
  falling) and NEVER consults the BODNVY/HUDNVY dial; the no-target shadow lord
  keeps its shipped wings-up drop + lava escape.
- **AC-4 — the PDIST budget:** a long-range bounder/hunter decide arms
  `EnemyState.seek` with the wave's DI-row value unspent; the budget spends the
  wake's ENTRY velY only while moving with the episode; the episode COMMITS
  (a quarry moving above cannot pre-empt it) and outlives its target; a spend
  crossing zero exhausts and re-decides the SAME wake (possibly re-arming
  fresh); short-range, no-target, shadow and linet wakes carry no workspace.
- **AC-5 — the inventory:** all ten ROW_DISPOSITION entries flip to `wired`
  naming their consumer; the other eighteen dispositions stand untouched.
- **AC-6 — the running game:** a knights-below stepDemo run arms committed
  down-seeks whose deepest observed pdist IS the live wave's BODNDI value
  (−3584 at wave 1, −3520 at wave 5), guarded count-first so a cabinet that
  never arms cannot pass vacuously.
## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point tdd story wiring ten ROM rows through three brains — the exact class of change (routing ≠ geometry) this fleet's process exists to pin.

**Test Files:**
- `plugins/joust/tests/seek-wiring.test.ts` — NEW: the uf1-8 contract. 24 tests: 6 green anchors (the hand-derived ten-row spec verified against the engine; the shadow invariants that must NOT move), 18 red consumer laws (range gates, BOLEV routing, PDIST arm/spend/commit/exhaust, dispositions, two knights-below cabinet probes).
- `plugins/joust/tests/helpers/enemy-contract.ts` — EXTENDED: `SeekState` workspace (`mode: 'down' | 'up'`, `pdist`), `EnemyState.seek?`, brain signatures widened to `PlayerView | null` (+ `wave?` on the shadow), the episode laws documented on `stepEnemy` with their ROM line anchors.
- `plugins/joust/tests/difficulty-wiring.test.ts` — RE-STAGED: uf1-2's brake probes moved off the null-target fall-through (which this story retires) onto a long-range-below staging (`FAR_BELOW`, parked knights in `demoAtCounter`, homing-neutral `prdir $FF` probes). Measured green under the shipped code; stays green under the new spec. The five `null as never` casts are gone with it.

**Tests Written:** 24 covering 6 ACs (18 red / 6 green anchors)
**Status:** RED (failing — ready for Dev)
**Verified:** `npx vitest run --project joust` → 18 failed / 2032 passed, every failure in seek-wiring.test.ts; testing-runner run uf1-8-tea-red confirms the same counts; `npm run lint` (tsc) clean.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | five `null as never` casts REMOVED from difficulty-wiring; new suite uses `PlayerView \| null`, zero casts | green by construction |
| #2 readonly/immutability | `SeekState` fields readonly in the contract; `ROWS` spec `as const`; purity snapshot via `structuredClone` in the SPENDS test | failing (with its test) |
| #5 module declarations | every relative import in the new file carries `.js` | green by construction |
| #8 test quality | assertions all carry mutant-naming messages; mock-free; no dist imports | self-checked |
| #14 edges inside one branch | `EXHAUSTS and re-decides THE SAME WAKE` pins the episode transition at the step's common exit, whichever branch spent it | failing |
| #15 token vs claim | source anchors target the consuming `waveValue('<ROW>'` call, not the word; both cabinet probes assert the collected count FIRST with the `[].every` early-return trap closed | failing |

**Rules checked:** 6 of 6 applicable lang-review rules have coverage (no React/async/config surface in scope)
**Self-check:** 0 vacuous tests found — every `expect` asserts a value and names its mutant; the two extensionally-invisible routings (RG twins, SHDNRG) are documented in-test and anchored at their call sites rather than left silently uncovered.

**The three traps the spec called out, and where they landed:**
1. RG is RanGe, not eneRGy — the spec table's header carries the DYLEN derivation; the RG rows are pixel deltas, the DI rows the same lengths in posY subpixels.
2. The BOLEV routing is this story's — AC-3 pins SELPLY-null → level with the dial dark, per brain, wave-invariant.
3. The staging trap — both cabinet probes park the knights on CLIF5 and count the deciding regime first; the note that the spec's "every row's GA1 column 1 reproduces the immediate" claim is FALSE for the shadow rows (Williams retuned them: 16/−32) is in the spec table so Dev doesn't "correct" the committed table against the prose.

**Handoff:** To Dev (Korben) for implementation — GREEN means: `enemy.ts` grows the range-gated, episodic decide on the uf1-2 seam; `difficulty.ts` flips ten dispositions to wired; nothing else in the 2050 moves.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/enemy.ts` - `SeekState` + `EnemyState.seek`; the range-gated decide (`rangeRoute`/`pursue` with per-brain `boundrRows`/`b2undrRows` reading all ten rows by literal `waveValue` calls); BOLEV/B2LEV null-target level flight (dial dark); the shadow's SHDNRG/SHUPRG gates + SHLEP line-track; `seekWake` (ground-exit → spend-on-entry-velY → exhaust-and-re-decide-same-wake → arm-unspent) wired into `stepEnemyDetailed` between the homing wake and the brain
- `plugins/joust/src/core/difficulty.ts` - ten `ROW_DISPOSITION` entries flipped to `wired`, each naming its consumer and ROM line; stale counts refreshed
- `plugins/joust/src/core/frame.ts` - the retired disjunction comment rewritten to the uf1-8 routing (comment only)
- Seven sibling suites re-seated by measurement, claims preserved (26 pins — see Design Deviations): `tests/difficulty-wiring.test.ts` (inventory counts; committed-episode probes; knightless diver; docstring), `tests/homing-wiring.test.ts` (chase script; inverted idle-stick pin), `tests/game-jt4-5.test.ts` (`divingEnemyProc`), `tests/audio-thud.test.ts` (first-contact frames 119/611; AC7 uf1-8 ruling; four digests), `tests/audio-events.test.ts` (three fingerprints, rng bit-identical; egg 516; 0xface 1938/1939/1614), `tests/audio-emission.test.ts` (extra-man seed 0x2468 @ 19,990), `tests/audio-flap.test.ts` (digest re-frozen, players bit-identical)

**Tests:** 2050/2050 passing (GREEN — testing-runner run `uf1-8-dev-green`; was 18 failed / 2032 passed at RED). `npm run lint` (tsc) clean. Orchestrator suite 358/358.
**Branch:** main (trunk-based, pushed)

**Handoff:** To next phase (review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | error | none | spawn failed (tmux pane transport dead: "fork failed: Device not configured"); domain hand-assessed: joust 2103/2103 + tsc clean + orchestrator 359/359 run directly, plus testing-runner record `uf1-8-dev-green` (2050/2050 pre-rebase); tree clean; no debug tokens in changed files |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | error | none | spawn failed (same transport error, retried); domain hand-assessed: re-seat honesty traced per suite (misdecode → RED re-verified on the committed-episode probes; homing chase/control/idle-zero bracket the mechanism; count-first guards close `[].every`), and three mutations run serially — strict down gate (3 red), hunter arming BODNDI (1 red), exhaust without same-wake re-decide (2 red), restored 24/24 |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | error | none | spawn failed (same transport error); domain hand-assessed: no new I/O in core; test `readFileSync` reads repo-local files only; pdist arithmetic bounded (arm values from the committed table, spends monotone toward the exhaust sign, orphaned episodes exhaust, grounded episodes clear); no recursion, loops frame-bounded |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | No | error | confirmed 2 | spawn failed (same transport error, retried sync); domain hand-assessed: all 15 typescript lang-review checks enumerated over every changed file (see Rule Compliance) — confirmed 1 [RULE] LOW (double-cast idiom repeated) + 1 [DOC] LOW (stale anchors, fixed in place) |

**All received:** Yes (accounting — 4 spawn-errored with domains hand-assessed and evidence recorded per row; 5 disabled via settings)
**Total findings:** 3 confirmed (all LOW; 2 fixed in place, 1 downgraded with rationale), 0 dismissed, 0 deferred

### Rule Compliance

Lang-review typescript.md, all 15 checks enumerated over `enemy.ts`, `difficulty.ts`, `frame.ts`, and the eight changed test files:

| # | Check | Verdict |
|---|-------|---------|
| 1 | type-safety escapes | one instance: `divingEnemyProc` repeats game-jt4-5.test.ts's established `as unknown as DemoProcess` staging idiom (adjacent `enemyProc` uses it, jt4-5-approved) — [RULE] LOW, downgraded not dismissed; no `as any`/`@ts-ignore`/new `!` anywhere in the diff |
| 2 | generics/readonly | `SeekState`/`SeekRows` fields readonly; `ROWS` spec `as const`; compliant |
| 3 | enums | none in diff |
| 4 | null/undefined | `player == null` loose-equality intentionally catches null\|undefined (commented); `??` used for wave defaults (pre-existing uf1-2 shape); no `\|\|`-on-falsy hazards |
| 5 | modules/.js extensions | no new import lines in core; all test imports carry `.js`; compliant |
| 6 | react/jsx | N/A |
| 7 | async | N/A — all pure sync |
| 8 | test quality | zero casts in the new/re-staged assertions; mock-free; no dist imports |
| 9 | build config | untouched |
| 10 | input validation | N/A — no external input surface; `waveValue` throws on non-1-based wave (pre-existing guard, exercised by R2-3) |
| 11 | error handling | unchanged surfaces |
| 12 | perf | `seekWake` computes five O(wave) `waveValue` walks per bounder/hunter wake — same shape uf1-2 shipped per decision, measured trivial at cabinet scale; noted, no change required |
| 13 | fix-regressions | round-1 fix diff is comment-only (anchors/phrasing); re-scanned, clean |
| 14 | edges in one branch | the seek arm/spend/exhaust/clear transition is computed in ONE function (`seekWake`) on the step's single path; the exhaust re-decide falls through to the same decide code both entry ways; compliant |
| 15 | token-vs-claim | the AC-2 anchors target the consuming `waveValue\('<ROW>'` CALL; AC-6 and both difficulty-wiring instruments assert collected counts FIRST; mutation-tested live this review (3 mutants, all killed) |

Core purity: no clock/entropy/browser/fs tokens added to `plugins/joust/src/core/*` (purity scanner suites green). Radix-cited constants: every new ROM-derived literal carries its JOUSTRV4.SRC anchor, all anchors re-verified against the vendored source this review (two were off and are fixed — see findings). Immutability: dispositions frozen per-entry; frozen-table tests green.

### Devil's Advocate

Suppose this story is broken and the 2103 greens are lying. Where would it hide? (1) The episode could be armed from the WRONG wave — seekWake and pursue compute rows independently, so a skew between them would let the arm use wave N and the brake wave M. They call the same `boundrRows`/`b2undrRows` with the same resolved `wave`, and the R2-1 committed probes drive the pair through the BCD decode against engine references — a skew fails those. (2) The committed-episode re-stagings could have gutted the wave-decode guards: a null-target BOLEV wake flaps at every wave, so if the probes' brake law never actually decided, the R2-1 equalities would hold under ANY decode. Traced concretely: at velY $0130, a misdecoded tenth wave reads BODNVY(16)=$0140 and holds its wings — `not.toEqual(asWave16)` and the sweep's `at`-half both go red. The discrimination is alive; I did not take TEA's or Dev's word for it. (3) The homing inversion could be masking a genuine regression — the mechanism could be DEAD, not gated. The chase run answers: every seed reverses (191/91/93/261), and the cleared-counter control stays at zero, so the throttle still ticks, still flips on the mounted seed, and still refuses 129-wake accumulation. What died is only the idle-stick path, and the pin that documents it is designed to fail when uf1-9 revives it. (4) The audio re-freezes could have absorbed a player-physics regression — bounded: player rows and rng cursors are value-identical to the jt5-4 pins at every compared frame. (5) The arm-wake law could be wrong — the ROM verifies `BRA BODN10` skips the ADDD but runs the brake compare, exactly the port's arm-wake behavior, and `BOUP1B CLRB` proves the down-episode slow-fall exit is a plain wings-up, not a cadence flap. The one soft spot that remains is inherited, not introduced: level flight and the up-episode wings are per-wake collapses whose real cadences are uf1-9's rows, and every divergence I could derive from the source lands inside a TEA-logged deviation or an uf1-9-owned disposition.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `DemoState.wave` (BCD byte) → `decimalWaveFromBcd` (demo.ts, throws on non-BCD) → `stepFrame({wave})` → `stepEnemyDetailed` → `seekWake`/`pursue` → `waveValue(row, wave)` (throws below 1; plateau clamps above) → the ten DYTBL rows land in the gates, budgets and brakes; verified end-to-end by the AC-6 cabinet probes and the R2-1 counter-driven sweep, and safe at the rollover (R2-3 green, `boundrRows` runs even on null-target wakes so the no-crash property still exercises the decode).

**Pattern observed:** the arm-wake-runs-the-episode-law shape at plugins/joust/src/core/enemy.ts:594-618 (`seekWake` advances, then the brain reads the advanced state) mirrors the ROM's `BRA BODN10` fall-through at JOUSTRV4.SRC:3807 — good pattern, verbatim-verified against the vendored source this review.

**Error handling:** `waveValue` rejects non-1-based waves at the seam (difficulty.ts:273-278); the demo decode rejects non-BCD bytes; a grounded or orphaned episode cannot wedge — ground exits clear (enemy.ts seekWake), orphans spend to exhaustion and route to level (pinned by AC-4's orphan test).

**Observations (tags plain-text for the gate):**
- [EDGE] hand-assessed (specialist disabled): gate boundaries strict-inclusive both directions, pinned at delta = row exactly (AC-2 wave-1/wave-3 mirror pairs); pdist exactly 0 exhausts down (BPL semantics) and not up (BMI semantics) — matches :3816/:3859; wave rollover exercised.
- [SILENT] hand-assessed (specialist disabled): no swallowed errors — the seam throws loudly on bad waves; seekWake has no catch, no fallback.
- [TEST] mutation battery run live: strict-gate mutant 3 reds, twin-budget mutant 1 red, exhaust-without-re-decide mutant 2 reds; suite restored 24/24. Re-seat honesty traced per suite (see Devil's Advocate) — no claim was weakened to pass; the homing input-independence pin was INVERTED with an explicit uf1-9 retirement clause, which is the honest form.
- [DOC] two stale prose anchors found by full source re-verification and FIXED in place (commit 1e4bfc6): SHLEP compare is :4293-4294 (was :4290-4291), SHUP1 re-enter is :4269-4270 (was :4270-4271) — both in enemy-contract.ts and copied into enemy.ts; plus one overclaiming AC7 note in audio-thud.test.ts made precise. All other cited anchors verified correct against JOUSTRV4.SRC (:3796-3820, :3842-3860, :3979-3992, :4026-4038, :4238-4295 read line-by-line).
- [TYPE] hand-assessed (specialist disabled): `SeekState` readonly, optional-field precedent (`homing`) followed; no new escape hatches; contract and module shapes agree.
- [SEC] hand-assessed (specialist errored): no new I/O, bounded arithmetic, no injection surface; pure core preserved.
- [SIMPLE] hand-assessed (specialist disabled): the climb/level law collapse is one deliberate expression with the reason commented; no dead code added; `seekWake`'s per-wake row recompute noted as the uf1-2-established shape.
- [RULE] one confirmed LOW: `divingEnemyProc` repeats the file's `as unknown as DemoProcess` cast idiom (game-jt4-5.test.ts) — downgraded with rationale (established, jt4-5-approved staging idiom in the same file, field-for-field identical to the adjacent helper), not dismissed; a follow-up typing the staging helpers properly would retire the idiom file-wide.
- [VERIFIED] the ten-row wiring is transcription-faithful — every consumer call, gate polarity, arm/spend/exhaust sign and the same-wake re-decide verified against the vendored JOUSTRV4.SRC control flow, including `BOUP1B CLRB WINGS UP` proving the down-episode brake law and `BRA BODN10` proving the arm-wake law; every derivable divergence (up-wing cadence, SHUPVY, SHLEP/SHUP1 per-wake collapse, cliff test, bounder lava exit) maps to a TEA-logged deviation or an uf1-9/future-owned disposition — nothing undocumented ships.
- [VERIFIED] AC-5 inventory: exactly twelve `wired` dispositions (uf1-2's two + these ten), each naming a real consumer function and its ROM line; the eighteen others untouched — pinned by both seek-wiring AC-5 and the updated difficulty-wiring AC-6.

**Review round 1:** two stale anchors + one overclaiming note fixed in place (1e4bfc6), suite re-verified 2103/2103 after the fix.

**Handoff:** To SM for finish-story
## Impact Summary

> **SM note:** the finish compiler wrote NO Impact Summary at all for this story (the known
> multiline-findings bug — the section below was rebuilt by hand from the Delivery Findings and
> Design Deviations above before committing the archive, per the uf1-6 precedent). Nothing here
> contradicts the full sections; it is a faithful digest of them.

**Upstream Effects:** 9 findings, all non-blocking, dominated by the uf1-9 handoff. (1) jt8-2's
live-compare homing throttle is INERT in ordinary play until uf1-9's PPVELX snapshot + BOLETM
boundary land — `tests/homing-wiring.test.ts` carries an inverted known-divergence pin designed to
fail on revival; uf1-9 must rewrite it for snapshot semantics, not "repair" the zero. (2) A single
`stepDemo` wake can never see a target (TARTIM grace + end-of-step reconcile) — any one-step probe
that assumes a visible knight measures the null-target path; documented in `demoAtCounter` for the
next probe author. (3) The bounder/hunter lava escape (BODIRL/B2DIRL) and the up-seek
cliff-in-the-way test (BCKXTB/BCKYTB) remain unmodeled — future stories. (4) The bounder/hunter
level-flight line comparison is polarity-inverted vs the shadow's; uf1-9 must port the inversion
as-is. (5) The jt5-4 kill-egg stall self-resolved under the new trajectories (0xbeef clears wave 1
at frame 820) but the kill-egg self-maturation gap itself stays open. (6) game-jt4-5's staging
helpers carry a file-wide `as unknown as DemoProcess` idiom — small typed-helper follow-up filed.
(7) Reviewer scope note for uf1-9's intake: the level/up-flight cadence family (BOUPWD/BOUPWU +
PJOYT, HU twins, SHUPVY + the SHUP0/SHUP1 alternation, the four decision timers, PPVELX, the
inverted homing pin, the polarity inversion) lands together or strands the same guards twice.

**Blocking:** None. Trunk-based: RED `067058b`, GREEN `2346bed`, review round 1 `1e4bfc6`, all
pushed on `main`. Reviewer verdict **APPROVED** (round 1: two stale shadow line anchors and one
overclaiming re-baseline note fixed in place; three live mutations killed; the ten-row wiring
verified transcription-faithful against the vendored JOUSTRV4.SRC).

### Deviation Justifications

10 entries, all ACCEPTED by the Reviewer (the last added by the Reviewer's own audit):

- **Level flight pinned per-wake, not episodic** (TEA) — the BOLETM family is uf1-9's; an armed
  level episode would invent an exit cadence on uf1-9's seam. Severity: minor.
- **SHLEP/SHLEV track the LIVE line** (TEA) — without uf1-9's decision boundary there is no honest
  snapshot moment (the jt8-2 precedent). Severity: minor.
- **Up-episode flap cadence is the shipped approximation** (TEA) — BOUPWD/BOUPWU are uf1-9's rows;
  no rising-arm case staged, so either model passes until the real cadence lands. Severity: minor.
- **PSTATE ground-exit contract-documented, not unit-pinned** (TEA) — implemented in `seekWake`;
  staging a grounded enemy needs arena-coupled fixtures. Severity: minor.
- **uf1-2's brake probes re-staged, not preserved** (TEA) — they staged the exact null-target
  state this story retires. Severity: minor.
- **26 sibling pins across 7 suites re-seated** (Dev) — the pins were measurements of the retired
  routing, not laws; every claim preserved, re-baseline bounded by bit-identical rng cursors and
  player rows (recorded in audio-thud AC7). Severity: minor.
- **Homing liveness guard INVERTED until uf1-9** (Dev) — forced by the AC-2/AC-3 per-wake level
  pins; the idle-stick zero is pinned as a known divergence naming its retirement story.
  Severity: major.
- **Committed-episode staging replaces the parked-knight premise** (Dev) — a bare single-step
  probe is a null-target probe; the episode staging restored the wave discrimination a BOLEV wake
  silently removed. Severity: minor.
- **game-jt4-5 killers staged as committed divers** (Dev) — reproduces the pre-uf1-8 no-flap fall;
  the game-over logic under test is untouched. Severity: minor.
- **Shadow long-UP is a per-wake collapse of SHUP0/SHUP1** (Reviewer, undocumented-added) — the
  ROM alternates wings-up/flap for a slow-rising long-up shadow; bounded by uf1-9's
  SHUPVY/SHUPTM dispositions. Severity: L.
