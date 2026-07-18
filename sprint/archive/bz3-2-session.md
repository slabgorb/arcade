---
story_id: "bz3-2"
jira_key: "bz3-2"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-2: ENEMY AI AGGRESSION — the ROM tank is attack-dominant; the clone pursues 30% of the time

## Story Details
- **ID:** bz3-2
- **Jira Key:** bz3-2
- **Workflow:** tdd
- **Stack Parent:** bz3-1 (satisfied — merged on origin/develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-17T23:53:13+00:00

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T23:53:13+00:00 | - | - |

## Story Context
**Cluster:** C2  
**Subsumes Findings:** E-002, E-004, E-009, E-011, E-013  
**Branch:** feat/bz3-2-enemy-ai-aggression  
**Branch Strategy:** gitflow (feat/bz3-2-enemy-ai-aggression)

### Problem Summary
The ROM tank is attack-dominant (fair coin routes at least 50% to attack), but the clone makes pursuit a deliberate 0.3 minority. The clone compensates with a 2.5-5x wider fire cone and ~1.5x faster turn rate — these must be retuned TOGETHER with the disposition change, not independently. Additionally:
- Spawn arc is fixed +/-90° in clone but score-scaled in ROM (0x0F→0x7F = mild to full aggression)
- No long-range fire restraint where ROM withholds fire at TDIST >= 0x24 until aggressive

### Key ROM References
- **E-002:** Disposition tree is attack-dominant (fair coin LDA PRAND / LSR / BCC R.ATCK)
- **E-004:** ROM fire cone ~2.8° vs clone 6.9° (2.5-5x wider)
- **E-009:** ROM spawn arc score-scaled (+/-21° early, +/-178° full aggression)
- **E-011:** ROM turn rate 22/44 deg/s vs clone 34/59 deg/s (~1.5x faster)
- **E-013:** ROM long-range fire restraint (TDIST >= 0x24) until aggressive

### Primary Source
- Citable: ~/Projects/battlezone-source-text (CRLF-free)
- NOT citable: ~/Projects/battlezone-source
- Audit findings JSON: battlezone/docs/audit/findings/E-*.json

### Acceptance Criteria
1. Enemy disposition restored to attack-dominant: fair-coin route to attack means at least 50% of decisions attack; charge probability retuned from 0.3
2. Fire cone and turn rate retuned TOGETHER with disposition (compensations for passivity)
3. Spawn arc becomes score-scaled (+/-21° early → +/-178° full aggression, centered on player heading)
4. Long-range fire restraint added (no fire while TDIST >= 0x24 until aggressive)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (O'Brien) — RED delivery, 2026-07-17

**Finding-label audit (critical method #1): all 5 CONFIRMED, no flips.**
Read `battlezone/docs/audit/findings/pair-enemy-ai.json` in full. E-002, E-004,
E-009, E-011, E-013 are each `class: DIVERGENCE`, `verdict: CONFIRMED`,
`recommendation: fix`. **No `[REFUTATION]`/`[CORRECTION]` tags and no
`remediated_by` on any of the five** (grep count 0) — none are flipped or closed
by bz3-1. The cluster labels in the epic are accurate. One nuance to carry:
- **E-011's divergence DIRECTION flipped after bz3-1.** The finding was written
  pre-timebase-rebase ("clone ~34°/s, ~1.5× TOO FAST"). Post-bz3-1 the enemy
  derives its rate from the corrected `MAX_TURN_RATE` (21.97°/s), so it now runs
  `0.4 × 21.97 ≈ 8.8°/s` — ~2.5× TOO SLOW vs the ROM 22°/s. Tests pin the ROM
  22/44°/s target, not the sign of the old gap.

**ROM citations verified against the CITABLE source** (`~/Projects/battlezone-source-text/BZONE.MAC`;
CRLF-free). All findings' line numbers match the citable tree exactly:
- E-002 disposition coin — BZONE.MAC:3069-3082 (`R.50$: LDA FTIMER/CMP I,0FF/BEQ R.ATCK`,
  `LDA PRAND/LSR/BCC R.ATCK`, score-sign `BEQ R.EVAD/BCC R.RAND/BCS R.ATCK`). Fair
  coin bit-0 → attack is a ≥50% floor before any score logic. ✔
- E-004 fire cone — BZONE.MAC:3137-3146 (`...SBC TANGLE+2`, abs, `10$: CMP I,2/BCS 50$`).
  Fire needs |err| < 2 units = <2.81°; integer compare ⇒ effective ≤1.41°. ✔
- E-011 turn — BZONE.MAC:2826 `ITANGL: LDA I,80` adds $0080 = 0.5 unit/call; ROBOT
  pivots with 2 calls/frame (regular) and 4 (TR7 super) at :2988-2997 = 1 & 2
  units/frame → 21.97 / 43.95°/s @ 15.625 Hz. ✔
- E-009 spawn arc — BZONE.MAC:3752-3772 build mask $0F→$1F→$3F→$7F from the
  clamped score diff (≤7), applied `PRAND AND mask` + `ADC TANGLE` at :3789-3795.
  $0F=15u=±21°, $7F=127u=±178°, centered on player facing. ✔
- E-013 range restraint — BZONE.MAC:3120-3136 (`LDA TDIST/CMP I,24/BCS 50$`),
  whole restraint ladder bypassed at `CMP I,0FF/BEQ 5$` (:3124, full aggression). ✔

**Tests written — `tests/core/enemies-aggression.test.ts` (new, 10 RED + 4 guards).**
All drive only the exported `stepEnemies` surface; every ROM magnitude carries a
BZONE.MAC citation comment. RED assertions + observed current values:
- E-002 (2 RED): from a non-charge goal only **26.7%** of decisions attack (assert
  ≥45%); from an aligned charge **0.0%** re-attack (the `canCharge = goal !==
  'charge'` gate, enemies.ts:634) — assert ≥45%.
- E-004 (1 RED + 1 guard): a tank aimed **5.16°** off FIRES today (clone cone
  6.88°); assert it holds (ROM <2.81°). Guard: dead-on (0.57°) still fires.
- E-011 (3 RED + 1 guard): regular sweeps **8.8°/s**, super **15.4°/s**, ratio
  **1.75** (assert 22 / 44°/s, ratio ≥1.9). Guard: `MAX_TURN_RATE ≈ 21.97°/s`
  (the ROM regular rate coincides with it → fix the enemy's OWN cap, not the
  shared constant).
- E-009 (3 RED): mild (score 0) spawns reach **89°** off (assert ≤30° / ROM $0F
  ±21°); full-aggro (score 50k) spawns never exceed **89.9°** (assert ≥135° /
  ROM $7F ±178° into the rear); arc widens by only **~0.7°** between the two
  (assert >60°). **aggro is pinned at 1 in BOTH cases so the arc MUST key on
  `score`, not the aggro ratchet** (see guidance).
- E-013 (1 RED + 2 guards): a mild (aggro 0.5), aimed, settled tank FIRES at
  30 000 units today (assert holds — the missing TDIST≥$24 gate). Guards: same
  tank fires at 3 000 units (in range); a fully-aggressive (aggro 1) tank fires
  at 30 000 (restraint lifts at FTIMER==$FF).

**Proof RED** (`npx vitest run`): **11 failed | 832 passed** — the 10 above plus
the 1 retargeted maneuver assertion below. `npm test -- citations` GREEN (12/12).
Sample failing assertions:
```
E-002: only 26.7% of decisions attacked ... expected 0.2667 to be >= 0.45
E-002: 0.0% attacked after an aligned charge ... expected 0 to be >= 0.45
E-004: fired at 5.16° off ... expected true to be false
E-011: regular tank turned 8.8°/s — ROM target 22.0°/s ... expected 8.79 to be > 19.5
E-011: super/regular turn ratio 1.75 — ROM is 2.0 ... expected 1.75 to be > 1.9
E-009: mild spawns reached 89.25° ... expected 1.558 to be <= 0.524
E-009: full-aggression spawns never exceeded 89.94° ... expected 1.570 to be >= 2.356
E-013: a mild tank fired at 30000 units ... expected true to be false
```

**⚠ BLOCKING — stale test retargeted (do not revert):** `enemies-maneuver.test.ts`
had a bz2-10 assertion `expect(observedTurnRate('tank')).toBeLessThan(MAX_TURN_RATE
* 0.5)` — written when `MAX_TURN_RATE` was a mistaken ~84°/s, so it PINNED the
clone's 0.4× (~8.8°/s) bug and would BLOCK the E-011 fix. Post-bz3-1 the ROM enemy
regular rate = `MAX_TURN_RATE`. I retargeted it to `toBeGreaterThan(MAX_TURN_RATE
* 0.8)` (now RED; GREEN once E-011 lands). This is the mandate's "pin ROM targets,
not the 0.4× value." It is the 11th RED.

**Design Deviations / Design Notes for Dev**

- **Non-blocking tension to WATCH (bz2-10 ↔ bz3-2):** the bz2-10 "not a turret"
  aim-fraction assertions (`enemies-maneuver.test.ts`: `meanAimed < 0.7`,
  `maxAimed < 0.85`, `meanPeak > 0.9`) currently pass. An attack-dominant
  disposition (charge re-locks on the player) will raise the aimed fraction. The
  ROM tank is BOTH attack-dominant AND maneuvering (the flank/wander half + the
  standoff-circling keep it off-barrel), so both should hold — but if these go
  red under your tuning, retune the flank/wander share (or standoff) rather than
  softening the attack floor, and flag it.

## GREEN-phase guidance for Dev — which constants/functions

All targets are in `src/core/enemies.ts` unless noted.
1. **E-002 disposition** (`stepEnemies` goal-repick block, ~L611-648):
   `CHARGE_CHANCE = 0.3` → retune so attack (charge) is ≥50% (ROM fair coin).
   Reconsider `const canCharge = goal !== 'charge'` (L634) — the ROM `BCC R.ATCK`
   allows back-to-back attacks. If you keep some anti-weld, do it via the
   break-off/flank half, not by forbidding a repeat attack outright. The ≥50%
   floor is score-INDEPENDENT (tests run at neutral score); ROM adds MORE attack
   when the player leads — optional to plumb, not pinned.
2. **E-004 fire cone** (`FIRE_CONE = 0.12`, L252): tighten to the ROM ~2.81°
   (≈0.049 rad) / effective ≤1.41°. Tests run at aggro=1 (mild widening off).
3. **E-011 turn rate** (`TANK_TURN_RATE = MAX_TURN_RATE * 0.4`,
   `SUPER_TANK_TURN_RATE = MAX_TURN_RATE * 0.7`, L202-203): retune to the ROM
   22 / 44°/s. The corrected `MAX_TURN_RATE` IS 21.97°/s, so
   `TANK_TURN_RATE = MAX_TURN_RATE` and `SUPER_TANK_TURN_RATE = MAX_TURN_RATE * 2`
   hit the target — but do NOT touch the shared `MAX_TURN_RATE` (the player's cap;
   guard test enforces this).
4. **E-009 spawn arc** (`SPAWN_FORWARD_ARC = Math.PI` fixed, L318; applied in
   `spawnHostile` L355): make the arc score-scaled — narrow ±21° when the score
   differential is ≤0, widening to ±178° at the 7000 cap (ROM $0F→$7F). **Key it
   on the `score` signal, NOT the `aggro` param** — `aggro` defaults to 1 and the
   existing `enemies-spawn-fairness.test.ts` (score 0, aggro 1) must stay green at
   ±≤90°; the new tests hold aggro=1 in both mild and full cases specifically to
   force score-keying. You'll need to thread a spread param from `stepEnemies`
   (which has `score`) into `spawnHostile`. NOTE: this intentionally RELAXES the
   bz2-9 "forward hemisphere only" rule AT HIGH SCORE — rear spawns are ROM-correct
   when the player is dominating; the fairness test stays green because it runs at
   score 0.
5. **E-013 range restraint** (fire gate, L662-668): add a range clause — a
   not-fully-aggressive tank holds fire beyond a distance threshold, the gate
   lifts as aggro→1 (ROM TDIST≥$24 dropped at FTIMER==$FF). The $24 byte scale is
   UNDECODED (playtest true-up); the clone's existing 256-units-per-ROM-distance
   convention (`STANDOFF=1280`=$05×256) suggests ~$24×256 ≈ 9 200 world units.
   Tests only require the mild threshold sit between 3 000 and 30 000 units and
   the gate lift at aggro=1.

### Dev (Julia) — GREEN delivery, 2026-07-17

**All 5 findings landed in `src/core/enemies.ts`, following O'Brien's map with
one behavioral addition (the range gate needed a distance term the map didn't
spell out) and one numeric deviation (CHARGE_CHANCE/FLANK_CHANCE split).**

- **E-002 disposition** (~L216-260 region): `CHARGE_CHANCE` 0.3→**0.55**,
  `FLANK_CHANCE` 0.5→**0.3** (wander implicit ≈0.15). Removed the
  `canCharge = goal !== 'charge'` anti-weld gate entirely — the ROM fair coin
  (`BCC R.ATCK`) never consults the previous goal, so charge is now eligible
  from any prior goal. Kept rule (a) (charge persists un-aligned until it
  lines up a shot) — O'Brien didn't flag that one and it's the lethality
  follow-through, not the attack-floor bug.
- **E-004 fire cone**: `FIRE_CONE` 0.12→**0.049** rad (< 2 angle units ≈2.81°).
- **E-011 turn rate**: `TANK_TURN_RATE` `MAX_TURN_RATE*0.4`→**`MAX_TURN_RATE`**,
  `SUPER_TANK_TURN_RATE` `MAX_TURN_RATE*0.7`→**`MAX_TURN_RATE*2`** — exactly
  O'Brien's map (the corrected MAX_TURN_RATE already equals the ROM regular
  rate).
- **E-009 spawn arc**: replaced the fixed `SPAWN_FORWARD_ARC` constant with
  `spawnArcWidth(score)` — linear interp between `SPAWN_ARC_HALF_MIN` (21°)
  and `SPAWN_ARC_HALF_MAX` (178°) over `[0, FULL_AGGRESSION_DIFFERENTIAL]`
  (imported from difficulty.ts, reusing the existing 7000-pt cap rather than
  inventing a new one). `spawnHostile` now takes a `spread` param; both call
  sites (`initEnemies` → `spawnArcWidth(0)`, `spawnReplacement` →
  `spawnArcWidth(score)`) pass it explicitly. Confirmed this keys on `score`
  as instructed — `enemies-spawn-fairness.test.ts` (score 0 default) stays
  green since `spawnArcWidth(0)` = ±21°, well inside its ±90° bound.
- **E-013 range restraint**: added `RANGE_RESTRAINT = 0x24 * 256` (9216 units,
  O'Brien's suggested scale) and a `distToPlayer` term computed alongside
  `bearing`. Fire condition gained `&& (aggro >= 1 || distToPlayer <
  RANGE_RESTRAINT)` — the map named the constant and the ROM citation but not
  the exact boolean form; this is the minimal clause that satisfies the 3
  E-013 test cases (mild+far holds, mild+near fires, full+far fires).

**Deviation — pre-existing test fixtures adjusted, not just the 11 RED tests.**
Two ALREADY-GREEN tests broke on contact with the new E-013 range gate
because their fixtures put the hostile at a distance (20,000-40,000 units)
that predates any range-restraint concept and was never load-bearing for what
those tests actually assert:
- `tests/core/enemies-aggro.test.ts` — "mild tanks take bad shots" describes
  the FIRE_CONE widening (angle), not range. Moved the fixture's z-offset
  from 240,000→206,000 (distance 40k→6k, inside RANGE_RESTRAINT) for both
  tests in that `describe` block; the angle-based assertions are unchanged.
- `tests/core/enemies-respawn-fairness.test.ts` — "the respawn grace LIFTS"
  (AC-4 lethality-intact guard) had the surviving hostile at z=20,000 with a
  LOW ratchet (score-differential ~0.5 base × a partial spawn-age ramp at
  phaseAge=5, well under AGGRESSION_RAMP_SECONDS=17) — never reaches aggro=1,
  so the new gate held fire forever at that range. Moved the fixture to
  z=5,000 (inside RANGE_RESTRAINT); the test's actual subject (the temporal
  respawn grace, not range) is unaffected.

Both are documented ROM-motivated retunes of incidental test-fixture
constants, not weakenings of any assertion. **Reviewer: please double-check
these two — I own the judgment call that the fixture distance was incidental
to each test's stated intent, not itself part of the contract.**

**Tuning note for the Reviewer — CHARGE_CHANCE=0.55 / FLANK_CHANCE=0.3 was
picked empirically, not derived.** The ROM only pins a ≥50% floor; I started
at 0.5/0.35 and nudged CHARGE_CHANCE up slightly for margin against the
240-seed RNG spread in `attackFraction` (needs ≥45% with headroom) without
tripping the bz2-10 anti-turret guards (`meanAimed<0.7`, `maxAimed<0.85` in
enemies-maneuver.test.ts) — those stayed green with NO changes to standoff or
the flank/wander split beyond the E-002 retune itself, so I didn't need
O'Brien's fallback (retune flank share/standoff). Worth a playtest true-up
per the file's existing PROVISIONAL convention.

**Citations**: marked E-002/E-004/E-009/E-011/E-013 `remediated_by: "bz3-2"`
in `docs/audit/findings/pair-enemy-ai.json` (the bz3-1 precedent in
pair-tank-motion.json) — their `ours` citations are now frozen historical
quotes of the pre-fix code, per check-citations.mjs's remediated-finding rule
(line/verbatim no longer checked against the working tree). Re-anchored line
numbers (verbatim unchanged — same code, just shifted) for every OTHER
citation into `src/core/enemies.ts` across all 4 findings files (C-007,
F-005, F-008, E-001, E-003, E-005, E-010, E-012, R-006/007/008/009/010/011) —
the `FULL_AGGRESSION_DIFFERENTIAL` import shifted the whole file down by one
line, on top of the net-larger AI-tuning section. C-007 (pair-cadence.json)
needed its verbatim updated too, not just the line — it illustrates
`nextFloat` usage at the exact line that used to read `SPAWN_FORWARD_ARC` and
now reads `spread`; re-pointed to the equivalent new text.

**Verification**: `npx vitest run` → **843 passed | 0 failed** (61 files).
`npm test -- citations` → 12/12 GREEN. `tsc --noEmit` / `npm run lint` → clean.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev (Julia), GREEN, 2026-07-17**: Adjusted two pre-existing test fixtures
  (`enemies-aggro.test.ts`, `enemies-respawn-fairness.test.ts`) to bring the
  hostile within the new E-013 `RANGE_RESTRAINT` — see the Delivery Findings
  entry above for the full rationale. Spec said "keep the whole suite green";
  it didn't anticipate the new range gate colliding with two incidental
  long-distance fixtures. Flagged for Reviewer double-check rather than
  treated as self-evidently correct.
- **Dev (Julia), GREEN, 2026-07-17**: `CHARGE_CHANCE`/`FLANK_CHANCE` set to
  0.55/0.3 by empirical tuning against the test suite, not derived from a ROM
  byte (the ROM only pins a ≥50% floor, not an exact split). See the Delivery
  Findings tuning note above.

## Delivery Findings

### Reviewer (code review) — Thought Police, 2026-07-17
- **Improvement** (non-blocking): The score-scaled spawn arc keys on the RAW
  player score (`spawnArcWidth(s.score)`, wired at `sim.ts:128`), but E-009's
  own `reasoning` prescribes driving it from *"the aggression differential that
  difficulty.ts already computes"* (player − enemy), which the co-located
  `aggression(s.score - s.enemyScore, …)` at `sim.ts:124` already uses. Affects
  `src/core/enemies.ts` `spawnArcWidth` + the `sim.ts:128` call site — one-line
  fix: pass `s.score - s.enemyScore` (and, for exactness, rename the param to
  `differential`). Left as-is, E-009 is closed (`remediated_by`) on a headline
  fix while the finding's exact signal prescription is unmet. *Found by Reviewer
  during code review.*

## Reviewer Assessment

**Verdict:** APPROVED — no Critical/High findings. One MEDIUM + three LOW, all
non-blocking. All three of the SM's flagged judgment calls verified sound.

**Independent verification (my own runs, not the reported tallies):**
- `npx vitest run` → **843 passed | 0 failed** (61 files). "0 failed" confirmed.
- `npm test -- citations` → **12 passed | 0 failed**.
- `npx tsc --noEmit` (== `npm run lint`) → **exit 0**, clean.
- Citation byte-exactness (independent script): **133/133 live citations match
  verbatim, 0 mismatches**; `remediated_by` present on exactly the 5 bz3-2
  findings (E-002/004/009/011/013) + prior bz3-1 ones — no phantom fixes.

**Data flow traced:** player input → `sim.step` → `aggression(s.score −
s.enemyScore, phaseAge)` → `stepEnemies(…, s.score, ratchet)` → fire gate
`|errPlayer| ≤ FIRE_CONE + (1−aggro)·MILD_FIRE_EXTRA && (aggro ≥ 1 ||
distToPlayer < RANGE_RESTRAINT)`. `aggro` proven ∈ [0,1] (returns literal `1` at
the 7000 cap) so `aggro ≥ 1` is an exact, float-safe restraint-lift. Safe.

**SM's three judgment calls — all verified:**
1. **Empirical tuning + `canCharge` removal — SOUND.** Flat `CHARGE_CHANCE=0.55`
   clears the ROM ≥50% floor; the score-conditional *rise* (R.ATCK-when-ahead)
   is unmodeled, but TEA's RED guidance declared that "optional to plumb, not
   pinned" and it joins the pre-existing morale-rubber-band ($6548) simplification
   — documented deferral, not a gap. Observed attackFraction ≈ 0.52 (≥0.45 gate,
   fails at old 0.3). Removing `canCharge` is ROM-faithful (`BCC R.ATCK` never
   consults the prior goal — TEA citation verified) and does NOT reintroduce a
   turret: the anti-weld invariants `meanAimed<0.7` / `maxAimed<0.85` /
   `meanPeak>0.9` (enemies-maneuver.test.ts, UNCHANGED by the diff) stay green.
2. **Two moved fixtures — LEGITIMATE, not regression-hiding.** Verified
   empirically: at the *old* distances both tests genuinely fail under the new
   E-013 gate (mild tank at 40k → `shell` null; respawn survivor at 20k with a
   sub-1.0 ratchet → never fires within 4s), so the moves were mechanically
   necessary. They are the honest kind because the relocated coverage is asserted
   directly and more precisely in enemies-aggression.test.ts:388-412 (mild holds
   past RANGE_RESTRAINT, fires in range, full-aggro bypasses). The aggro=1 aggro
   test move is inert (range clause short-circuits). Turn-rate flip
   `<0.5×`→`>0.8×` is a correct re-target (old value pinned the 0.4× bug); its
   one-directional weakness is fully covered by the tight [19.5,25]°/s band in
   the new file.
3. **Citation honesty — HONEST.** `remediated_by` sits only on findings this diff
   truly removes (all 5 fixes confirmed present in code); C-007 correctly got a
   verbatim re-anchor but NO `remediated_by` (it's an `accept` citation, not a
   removed defect). Gate semantics confirmed by reading check-citations.mjs: a
   remediated DIVERGENCE freezes its `ours` verbatim as history (no working-tree
   recheck) while the ROM `source` side is always checked — so the only abuse
   vector is marking a still-broken finding remediated, which did not happen.

**Non-blocking findings:**
| Severity | Finding | Location |
|----------|---------|----------|
| MEDIUM | Spawn arc uses raw `s.score`, not the E-009-prescribed score differential (`s.score − s.enemyScore`); diverges from ROM + the co-located `aggression()` after the player accumulates deaths. Early-game correct, AC met, TEA directed "score." One-line fix. | `enemies.ts` spawnArcWidth / `sim.ts:128` |
| LOW | Reroll alignment check (`goal==='charge' && \|err\|>FIRE_CONE`) uses the bare cone while the fire gate uses the aggro-widened cone. Empirically does NOT cause an aggro-specific weld (verified: the charge follow-through is aggro-independent, fires=0 → chasing, not a turret). Cosmetic inconsistency only. | `enemies.ts:646` |
| LOW | Exported `stepEnemies` never clamps `aggro` to its documented [0,1]. `aggro>~1.089` would lock the fire gate permanently closed; negative widens the cone. Unreachable today (sim.ts clamps via `aggression()`), but the pure export has no guard. | `enemies.ts:691` |
| LOW | Test comment (enemies-aggression.test.ts:274) cites removed `SPAWN_FORWARD_ARC` at stale lines 318/355; aggro-block comment (63-64) overstates relevance to the aggro=1 case. Descriptive history, harmless. | test comments |

**Deviation audit:**
- *Two test-fixture moves* → **ACCEPTED** (legitimate, coverage relocated not lost — see call #2).
- *CHARGE_CHANCE/FLANK_CHANCE empirical* → **ACCEPTED** (clears ROM floor; score-conditional rise deferred per TEA — see call #1).

**Recommendation:** Ship. Optionally apply the MEDIUM one-liner
(`s.score - s.enemyScore`) before finish — it's low-risk and genuinely closes
E-009 to its own spec; otherwise record the residual so the audit isn't
overclaiming the close.

**Handoff:** To SM for finish-story.

### Dev (Julia) — MEDIUM fix delivery, 2026-07-17

**Applied the Reviewer's MEDIUM: spawn arc now keys on the player-minus-enemy
score DIFFERENTIAL, not raw `s.score`.** Not a one-line drop-in — `score` is
ALSO chooseKind's input for the missile-introduction DIP threshold
(`score >= MISSILE_INTRO_THRESHOLD`, findings §9), an absolute-score
mechanism unrelated to E-009's differential. Overwriting `score` at the
`sim.ts` call site would have silently switched that check from absolute
score to differential too — so instead:
- Added a new `differential = score` parameter to `stepEnemies` (defaults to
  `score` so every existing caller without enemy-score context — nearly all
  unit tests — keeps today's behavior unchanged). `spawnArcWidth` now takes
  `differential`, not `score`.
- `sim.ts`: hoisted `const differential = s.score - s.enemyScore` (was
  inlined only into the `aggression()` call) and pass it as `stepEnemies`'s
  7th arg; `score` (5th arg, unchanged) still carries the raw player score
  for chooseKind.
- `tests/core/enemies-aggression.test.ts` AC-3/E-009: `replacementOffsets`
  now drives the differential explicitly through the new 7th parameter
  (`stepEnemies(state, player, null, DT, 0, 1, differential)`) instead of
  relying on the score-position default-alias — so the suite actually
  exercises the wired differential path, not a coincidence of the default.
  Reworded describe/it titles and messages from "score" to "differential"
  for accuracy; no expected magnitudes changed (0 and 50,000 are still valid
  differential values).
- Deleted the stale `SPAWN_FORWARD_ARC` comment reference (LOW #4) in the
  same test file's header, replacing it with the differential framing above.
- Left LOW #2 (reroll-cone cosmetic) and LOW #3 (aggro-clamp defensive nit)
  untouched, as instructed — accepted non-blocking, not gold-plated.

**Citations re-anchored** (content unchanged, only line numbers — the new
`differential` const/param and the `FULL_AGGRESSION_DIFFERENTIAL` import
shift lines below them): C-007 and C-010 (`pair-cadence.json`), F-005
(`pair-combat.json`), E-001/E-010/E-012 (`pair-enemy-ai.json`),
R-006/R-010/R-011 (`pair-missile-saucer.json`). C-010 additionally needed its
`ours.verbatim` updated (the cited `stepEnemies(...)` call now carries the
extra `differential` argument) — same call, same illustrative point, just
one more token.

**Verification**: `npx vitest run` → **843 passed | 0 failed** (61 files,
unchanged from before the fix — no behavioral regressions, only the citation
line/verbatim churn from the diff). `npm test -- citations` → **12/12
GREEN**. `tsc --noEmit` / `npm run lint` → clean.

**Committed and pushed** to `feat/bz3-2-enemy-ai-aggression` — see commit SHA
in the SM handoff message.
