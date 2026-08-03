---
story_id: "jt9-9"
jira_key: "jt9-9"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-9: The egg lifecycle in ONE re-baseline: an EGGWT wait, a hatching uncollected KILL egg, and EGGSCR scored to the victor on the kill

## Story Details
- **ID:** jt9-9
- **Jira Key:** jt9-9
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T20:01:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T19:07:48Z | - | - |

## Story Acceptance Criteria

**DERIVED CRITERIA — FROM MERGED STORIES (jt9-10, jt9-12 egg half) PLUS jt5-4 FIDELITY GAP CLOSURE**

1. **EGGWT/EGGWT2 timer wired:** `EggState` carries `waitTimer?: number`, initialized by `settledWaveEgg` from the wave-spawn EGGWT2 read. `stepDemo`'s egg-process frame driver decrements the timer by 1 per frame when the egg is settled and timer > 0. `willHatch(egg)` returns true when timer reaches zero AND `eggsLeft > 0`. A settled egg with timer > 0 does NOT hatch. Late-wave eggs hatch sooner: ROM reads EGGWT `:3224` at settlement, walking it downward per wave.

2. **Kill-eggs now self-mature:** Remove the `waveEgg === true` gate from `stepDemo:1288`. All eggs (wave and kill alike) now mature when `settled && willHatch(egg)`. Kill-eggs will hatch into remounting enemies, clearing the wave if no other entities remain. A settled kill-egg with `waitTimer === 0 && eggsLeft > 0` matures into a remount enemy.

3. **Last egg scores to the victor:** On `eggsLeft → 0` during any collision, emit a score event ONLY IF U (victor workspace) exists — the BEQ guard (JOUSTRV4.SRC:3005). The score routed is `eggValue(bumpEggHits(eggsLeft))` where `eggsLeft` is NOW 0. A lava death (U = null / zero) skips scoring.

4. **The victor guard holds:** Stage an enemy with `eggsLeft === 1` and kill it; assert a score event is emitted. Stage a lava-troll death with `eggsLeft === 1`; verify NO score event is emitted (victor guard).

5. **Separate commits with explicit re-baseline messages:** Commit 1: EGGWT/EGGWT2 timer. Commit 2: Kill-egg hatch. Commit 3: EGGSCR kill-scoring. Commit 4 (last): Re-baseline commit carrying its own message.

6. **The determinism digests re-baselined deliberately:** `fingerprint(0xbeef, 2400)` (audio-events.test.ts:654), `fingerprint(0x2468, 900)` (:676), the third jt5-4 re-baseline — **candidate** `fingerprint(0x1a2b_3c4d, 240)` (:615), `entityDigest(0xbeef, 160)` (audio-thud.test.ts:1098), and `entityDigest(0x2468, 755)` (:1130). RE-BASELINES, not regressions. **The story says the fifth is `entityDigest(0x2468, 200)`; SM re-measured at setup and NO SUCH CALL SITE EXISTS** — see the correction block in the context file, verify SM's reading before adopting it, and re-count how many actually move (it may be four).

7. **The joust suite passes green:** `npx vitest run --project joust`. **No hard test count is asserted** — the "1979" first drafted here was transcribed, not measured, and this story adds tests; re-measure and report what you saw. Lint clean, build clean, no debug code. Verify the absolute SNPTHD role assertions at audio-thud.test.ts:709/:712/:749 still survive once re-baselined — and that they BITE, by mutating the role assignment.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/demo-jt9-9.test.ts` — behaviour, 16 tests (12 red / 4 green controls)
- `plugins/joust/tests/demo-jt9-9-source.test.ts` — provenance, 11 tests (1 red / 10 green)

**Tests Written:** 27 covering 4 ACs
**Status:** RED — 13 failing, ready for Dev

### The RED set, and what each one is waiting for

| # | Test | Why it is red |
|---|------|---------------|
| 1 | `EGG_WAIT_NAP_FRAMES` is 12 | the constant does not exist |
| 2 | a settled wave egg does not hatch on frame 1 | `stepDemo:1288` matures it immediately, no wait at all |
| 3 | wave egg hatches after `EGGWT2 × 12` frames | no timer |
| 4 | kill egg hatches after `EGGWT × 12` frames | no timer, and no kill-egg hatch |
| 5 | `ROW_DISPOSITION` marks both rows wired | still `no-consumer-yet, owner: uf1-10` |
| 6 | uncollected kill-egg matures | the `waveEgg === true` gate |
| 7 | that bird enters from the farther edge | no bird at all |
| 8 | the egg stops holding the wave permanently | as 6 |
| 9 | kill-egg count comes from the victim | `resolveContacts:1165` hard-codes `EGGS_PER_ENEMY` |
| 10 | the bird MAINTAINS the count (`:3251`) | `remountEnemyProcess` carries nothing |
| 11 | last egg scores on the kill | `ContactResult` has no event channel |
| 12 | the victor guard is a named law | `lastEggAward` does not exist |
| 13 | claims cover the 5 new cited ranges | Dev commits the `JT99-*` entries |

The 5 uncovered claim ranges: `:3224-3225`, `:3226-3227`, `:3236-3237`, `:2761`, `:3004-3006`.

### The four GREEN controls — these must STAY green

1. **the DYTBL oracle** (`waveValue('EGGWT', 1) === 0x40`, `end === 0x10`, wave 40 < wave 1) — the ROM-cited anchors, asserted against the row so a re-implementation inside the egg code cannot pass by agreeing with a literal I typed.
2. **before expiry the egg is still there, still holding wave 1** — the positive control for #8. An implementation that DELETED the egg on frame 1 satisfies #8 and fails this.
3. **an enemy with eggs still to come scores nothing** (`BNE`, `:3002`) — the permissive-mutant control for #11. Scoring every kill satisfies #11 and fails this.
4. **a permadeath egg (`eggsLeft 0`) never hatches** — kills the obvious way to write AC-2, which is to drop the `willHatch` term along with the `waveEgg` term. That resurrects dead enemies forever.

Controls 2–4 pass today for reasons unrelated to what they assert (nothing hatches, nothing scores). They become load-bearing the moment Dev lands the feature; that is what they are for.

### Three corrections to the spec, all measured

1. **The wait is counted in PCNAP-12 naps, not frames.** AC-1 as written says per-frame; `PCNAP 12` at `:3227` is the cost of one `DEC PJOYT,U` at `:3236`, and the `BNE EGGLN2` at `:3237` closes back above the nap. A per-frame reading hatches every egg 12× too fast. Pinned from both sides in the source suite.
2. **EGGWT and EGGWT2 are different waits** (RAMDEF.SRC:393 / :395). EGGWT is the landing wait, EGGWT2 the egg-wave initial. They differ at wave 1 (64 vs 56), so the pins discriminate.
3. **AC-3's trigger is unreachable** — see the blocking finding below.

### Latitude Dev has

- **Where the PEGG count lives** is Dev's call — on `EnemyState` (the `homing`/`seek`/`plavt` optional-field precedent) or beside `budget` on `DemoSim` (jt8-1's). `eggsLeftOf` reads either. What is forbidden is a per-egg field that resets each cycle, which is the defect jt8-4 hit with `hitCount`.
- **The egg-score channel**: test #11 specifies `ContactResult.events` because that is where the kill `score` already lives. Dev may home it elsewhere provided the `stepDemo`-level observable is identical.
- `EGG_WAIT_NAP_FRAMES` and `lastEggAward` are named by the tests; rename freely and update the two call sites.

### Rule Coverage

| Rule | Test | Status |
|------|------|--------|
| core boundary (no clock/entropy) on both edited files | `keeps egg.ts and demo.ts inside the pure core` | green |
| no `as any` / `@ts-ignore` | same test | green |
| `.js` on every relative import (rule 5) | `carries the .js extension…` | green |
| derived counts, not transcribed | `audio-seam-scope` file count | **red — expected** |

**Self-check:** no vacuous assertions. Every `toBe`/`toEqual` names a value the current tree cannot produce; the three known-vacuous-today controls are labelled as such above. Mutation direction is restrictive throughout — #9 asserts `0`, a value the hard-coded producer cannot emit, rather than merely asserting difference.

**Handoff:** To Dev for implementation

## Dev Assessment

**Status:** GREEN — joust 108 files / 2575 tests, orchestrator 390, lint clean, citations 949 verified.

### The four commits, in the story's mandated order

| # | Commit | What |
|---|--------|------|
| 1 | `fe03655` | the EGGWT/EGGWT2 wait, counted in PCNAP-12 naps; ROW_DISPOSITION 4 → 2 pending |
| 2 | `bb781c4` | the `waveEgg === true` gate goes; kill-eggs mature |
| 3 | `78fd53b` | PEGG carries around the cycle; the last egg scores on the kill; the victor guard |
| 4 | `b8bda34` | the determinism re-baseline, its own message |

Commit 1 deliberately left kill-eggs unmatured and commit 3 was red on the determinism pins — both move the seeded replays, and the epic's rule is one such change per commit.

### The blast radius was wrong in both directions

The story named five pins that would "legitimately go red". **Zero of them moved.**

| pin | predicted | measured |
|---|---|---|
| `fingerprint(0xbeef, 2400)` | red | **unmoved** |
| `fingerprint(0x2468, 900)` | red | **unmoved** |
| `fingerprint(0x1a2b_3c4d, 240)` | red | **unmoved** |
| `entityDigest(0xbeef, 160)` | red | **unmoved** |
| `entityDigest(0x2468, 755)` | red | **unmoved** |

`audio-thud.test.ts` is untouched. The reason is structural, not luck: the EGGWT wait is 768 frames at wave 1, and **every digest anchor in that file is earlier than one wait** (118, 160, 188, 755). The wait DELAYS the hatch, so early windows are unaffected. The story reasoned from jt5-4's stalled-run framing, where the egg's effect was immediate.

What actually moved is **seed 0xface**, which the story never mentions — six numbers across four files, all re-found by sweeping each test's own precondition:

- `audio-events`: death 2062 → 2578, re-entry 2063 → 2579 (still death + 1), wave advance 1900 → 2246
- `audio-transporter-split`: the knight-TWO fixture 2063 → 2579
- `dumb-wingbeat`: 0xface `playerDown` 154 → 153, `playerUp` 153 → 152

0xbeef's re-entry list is **identical**, so both its transporter fixtures are untouched.

### The guard-loss warning was moot — and checked anyway

No digest in `audio-thud.test.ts` was re-baselined, so no SNPTHD guard was removed. I verified the guards bite regardless, by mutation: inverting the player-path role assignment in `collisionPass` (`bounceBottom`/`bounceTop` swapped) reddens the absolute assertions at `:709` and `:749` **by name**. Mutant reverted; file byte-identical.

### One claim narrowed rather than re-numbered

`dumb-wingbeat` asserted the knight cue counts "must not move". As written that does not survive this story — a knight only sounds its wings while alive, so anything changing when knights die changes the count in a fixed window. jt9-1 could claim it because its mechanism only changed how *birds* fly. The comment now says that, instead of asserting an invariant its own numbers contradict.

### Design choices worth a reviewer's attention

- **The wait is seeded lazily in `stepDemo`'s hatch block, not at spawn.** `spawnWaveEggs` is reached with the raw WAVBCD counter (the td1-12 unit confusion), and `waveValue` mis-resolves a BCD byte from wave 10 and *throws* at wave 100 where the counter rolls to `0x00`. The hatch block is the one hop in demo.ts that already converts properly.
- **`caught` moved up beside the other accumulators.** The last-egg award gave DEGGS a second writer in the joust pass; both passes must see each other's bumps or a knight who takes a last egg and then catches one pays the same rung twice.
- **Attribution lives in `collisionPass`, not `resolveContacts`.** The latter is pure over entities and cannot see processes, so it reports the award at the opening rung and `collisionPass` re-issues it at the winner's real ladder position.
- **`JOUST_VICTOR = -1`** is a named stand-in, not a player id — `resolveContacts` holds no ids and only needs "not null" there.

### Pre-existing, not mine

`plugins/star-wars/tests/audit/sw8-27-remediation.test.ts` fails 5 tests in the full-cabinet run. Verified against `693a82b` (the commit before this story started) — it fails identically there. That is sw8-27's active RED phase.

## Reviewer Assessment

**Verdict:** APPROVED (with three defects found and fixed in review — see below)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |

**All received: Yes**

Enabled specialists: 1 of 9. The other eight are set `false` in `workflow.reviewer_subagents` (`edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`, `security`, `simplifier`, `rule_checker`) and were therefore not spawned.

Eight of nine specialists are disabled in `workflow.reviewer_subagents`, so preflight is the only one that ran. A **mutation battery** was run in their place — which is what found everything below. Preflight itself found nothing: 108 files / 2575 tests, lint clean, orchestrator 390, 949 claims, build 140.51 kB, zero smells, and it independently confirmed sw8-27's 5 failures are pre-existing and unchanged.

### The mutation battery — 11 mutants, 3 survived

| # | Mutant | Verdict |
|---|--------|---------|
| M1 | `EGG_WAIT_NAP_FRAMES` 12 → 1 (the per-frame reading) | killed (7) |
| M2 | EGGWT2 wired to both paths | killed (9) |
| M3 | drop `willHatch` from the hatch conjunction | **SURVIVED** |
| M4 | `remaining > 0` → `>= 0` | killed (12) |
| M5 | remount drops the PEGG carry | killed (1) |
| M6 | undo the PEGG transfer | killed (2) |
| M7 | remove the victor guard | killed (1) |
| M8 | score every kill, not just the last egg | killed (7) |
| M9 | hard-wire the hatch to wave 1 | **SURVIVED** |
| M10 | joust-pass DEGGS ignores prior state | equivalent — see below |
| M11 | award always pays the opening rung | **SURVIVED** |

### The three findings, all fixed in `95a630f`

**F1 — `willHatch` was unguarded, and AC-2's own control test was VACUOUS.** Dropping the permadeath term resurrects dead enemies forever and left all 2575 green. The control ran `frames * 2` and counted eggs; under the mutant the permadeath egg *does* hatch at frame 767, the bird is killed, and it leaves a **new** egg — so by frame 1536 the count was 1 again and the assertion passed **on a different egg than the one it named**. Probed frame-by-frame, not guessed. Now asserts identity (that process id, still `eggsLeft 0`) and stops at the hatch frame.

**F2 — the per-wave EGGWT walk was unguarded at the hatch.** AC-1's headline claim is that late-wave eggs hatch four times sooner. The suite proved `waveValue` walks — but that is the difficulty engine, which already worked. Nothing asserted the *egg code* consults it, so hard-wiring wave 1 was invisible. This is the uf1-2 defect one layer down: the dial resolves correctly and nobody reads it. New guard stages at wave `0x20` where EGGWT has walked 64 → 58.

**F3 — the DEGGS ladder climb was unguarded.** AC-3 says the award "bumps the DEGGS ladder"; paying the opening rung unconditionally left all 2575 green. New guard stages a knight already on `eggHits: 2` and pins the third rung, with an explicit `.not.toBe` against the opening rung so it cannot pass by coincidence.

Each survivor now dies to exactly one new guard, re-run verbatim after the fix. `demo.ts` is byte-identical to `78fd53b` — no production behaviour changed in review.

**M10 was equivalent, not a gap.** `caught.get(winner.id) ?? winner` in the joust pass reads a map the catch pass has not written yet, so on a single kill the fallback always fires. It remains load-bearing for a knight who wins two jousts in one frame, so it stays.

### What I checked and did not fault

- **The four commits are genuinely separate and in the mandated order**, with the re-baseline last and carrying its own message. Commit 1 verified to leave kill-eggs unmatured; commit 3 verified red on determinism only.
- **The re-baselines are re-found, not nudged.** I re-ran the 0xface sweep independently: deaths 621/949/1195/2488/2578, re-entries +1 each, one wave advance at 2246. Matches what Dev recorded. 0xbeef's list is unchanged, so leaving its two fixtures alone is correct.
- **The blast-radius claim.** Independently confirmed all five named pins are unmoved and `audio-thud.test.ts` is untouched. Dev's structural explanation holds: every anchor in that file (118, 160, 188, 755) is earlier than one 768-frame wait.
- **The SNPTHD guards bite** — re-verified by mutation, reddening `:709` and `:749` by name.
- **The `dumb-wingbeat` claim narrowing is correct and necessary**, not a convenience: the sentence as written would have been false above its own re-baselined numbers.
- **Core purity** holds on both edited modules; no `as any`, no `@ts-ignore`, `.js` on every relative import.
- **The lazy wave-seeding** is the right call and correctly reasoned — seeding at spawn would have thrown at wave 100 on the BCD rollover.

### Filed, with story ids

Both out-of-scope findings are filed, not left as archive prose:

- **`jt9-38` (3pts)** — the ROM's `NENEMY`/`WENEMY` population gate on the hatch (`:3239-3242`) is unmodelled. After the wait expires EGGLND checks whether the wave already holds its quota and goes back round the loop if so, incrementing `NENEMY` only on the pass that actually hatches. This port matures every settled egg the instant its timer runs out. Not a regression — before this story kill-eggs never matured at all, so the gap arrives *with* the feature.
- **`jt9-39` (3pts)** — `ROW_DISPOSITION` can lie in the direction that matters. Both existing guards check only the table's self-consistency, so wiring a row in code and leaving it `no-consumer-yet` ships green. This story pins EGGWT/EGGWT2 specifically, which does not generalise. Also folds in the `owner`-string drift: both lava rows read `uf1-10`, an id the epic renumbering had already invalidated, until this story corrected them.

### One TEA question resolved, not filed

TEA asked whether the **permadeath egg's own award** is also dropped. It is not — Dev's `resolveContacts` fires the award on `egg.eggsLeft === 0`, which *is* the permadeath egg, matching `:3002`'s zero case (score EGGSCR, and leave an egg that can only be collected). Verified by reading the shipped code; no story needed.

### One comment defect found by reading, not by mutation

Inserting `lastEggAward` between `resolveContacts` and its docblock **orphaned that docblock** — it sat directly above `lastEggAward`, so `resolveContacts` was documented by nothing and `lastEggAward` carried a description of a different function. No test can see this and the battery could not have found it. Fixed: the docblock is back on its function and now also mentions the transferred egg count and the DEATH3 award it surfaces.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (RED)

- **Gap, blocking for AC-3 — `eggsLeft` can never reach zero, so the last-egg award has no trigger.** Both producers hard-code the count (`resolveContacts` passes `EGGS_PER_ENEMY`, demo.ts:1165; `settledWaveEgg` the same, demo.ts:602); `EnemyState` has no PEGG field, `JoustEntity` has no `eggsLeft`, and `remountEnemyProcess` (demo.ts:637) builds a bird that remembers nothing. Every kill-egg in the running game is born with 3 and dies with 3 — permadeath and the DEATH3 award are both dead paths. The ROM carries the count around the whole cycle (`:2999-3001` death→egg, `:3251-3252` egg→bird). **The PEGG carry is a prerequisite for AC-3, not a detail of it**, and it widens the story's surface to `JoustEntity` + `EnemyState`. Flagged rather than descoped: tests #9 and #10 pin it.
- **Conflict, non-blocking — the story's fifth pinned number does not exist, and the reason is on the record.** `entityDigest(0x2468, 200)` has no call site. `audio-thud.test.ts:1108` states that jt5-4 froze that seed *at frame 200* and that uf1-8 then jt5-8 walked the anchor 200 → 620 → 755. The story inherited the dead anchor from jt5-4's filing text. The live pin is `entityDigest(0x2468, 755)` at :1130. SM's setup reading is confirmed by the file's own comment history, not just by pairing.
- **Gap, non-blocking — `ROW_DISPOSITION` accuracy is unguarded in both directions.** `difficulty-wiring.test.ts:781` pins the wired set by exact equality and `:847` pins the pending count at 4, so *flipping* the dispositions reddens. But nothing asserts that a `no-consumer-yet` row genuinely has no consumer, so **wiring EGGWT/EGGWT2 and forgetting the table ships green**. Test #5 covers it for these two rows only; the general guard is unfiled. Also both rows still read `owner: 'uf1-10'`, an id the epic renumbered to jt9-12 — and LAVTIM/LAVGRA will carry the same stale id after this story, for jt9-11 to fix.
- **Gap, non-blocking — the ROM gates the hatch on the enemy population and this port does not model it.** After the wait expires, EGGLND checks `LDA NENEMY / CMPA WENEMY / BHS EGGLN2` (`:3239-3241`, "ENOUGH ENEMIES IN THIS WAVE?") and goes back to waiting if the wave is already full, incrementing `NENEMY` only when it does hatch (`:3242`). Nothing in `stepDemo`'s hatch consults a population count, so under this story every settled egg matures the instant its timer expires regardless of how crowded the wave is. Out of scope here — filing it is the right disposition, not fencing it.
- **Question, non-blocking — is a permadeath egg's award being dropped too?** `DEATH3` at `:3002` branches on the decrement: zero does not mean "no egg", it means score EGGSCR now and leave an egg that can only ever be collected. The port creates such an egg (via `spawnEgg`'s decrement) but scores nothing, which is the same drop AC-3 fixes. Test #13's control pins that this egg must not hatch; whether its award is in AC-3's scope or a follow-up is Dev's call to state.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **The story's five-pin blast radius did not happen**
  - Spec source: context-story-jt9-9.md, AC-5 and the BLAST RADIUS block
  - Spec text: "closing this turns FIVE pinned numbers red at once, all of them legitimate re-baselines"
  - Implementation: none of the five moved; six different numbers on seed 0xface did
  - Rationale: the EGGWT wait is 768 frames at wave 1 and every anchor in `audio-thud.test.ts` is earlier than one wait, so the digests were taken before any kill-egg finished waiting. The story reasoned from jt5-4's framing, where the egg's effect was immediate and there was no wait to serve. Not a defect in the story's intent — a consequence of AC-1's own mechanism that the estimate predates.
  - Severity: minor
  - Forward impact: the re-baseline commit's message names what actually moved, so the next fingerprint-mover reads measured history rather than a prediction. Anyone auditing this story against its own AC-5 will find the pin list unchanged and should not read that as work skipped.

- **The wait is seeded at the hatch, not at spawn as AC-1 describes**
  - Spec source: context-story-jt9-9.md, AC-1
  - Spec text: "`EggState` carries `waitTimer?: number`, initialized by `settledWaveEgg` from the wave-spawn EGGWT2 read"
  - Implementation: `settledWaveEgg` keeps its old signature and seeds nothing; the wait is seeded lazily in `stepDemo`'s hatch block, from EGGWT2 for a `waveEgg` and EGGWT otherwise
  - Rationale: `spawnWaveEggs` is reached with the raw WAVBCD counter — the unit confusion demo.ts's own stepFrame comment documents and td1-12 owns. `waveValue` mis-resolves a BCD byte from the tenth wave on and THROWS at the hundredth, where the counter rolls to `0x00`. Seeding there would have introduced a mid-frame crash on wave 100. The hatch block is the one hop in this file that already converts the counter to a decimal ordinal.
  - Severity: minor
  - Forward impact: when td1-12 settles the wave unit, this seeding can move to spawn with no behavioural change. Nothing else depends on the lazy shape.

- **`dumb-wingbeat`'s "knight counts must not move" claim was narrowed, not just re-numbered**
  - Spec source: `plugins/joust/tests/dumb-wingbeat.test.ts` AC6 (jt9-1's shipped assertion)
  - Spec text: "The knight's wing cues come from the scripted input, not from any bird, and this story must not move them."
  - Implementation: the comment now scopes the invariant to changes in how BIRDS fly, and records why a change to when knights DIE moves it legitimately
  - Rationale: re-baselining the two numbers while leaving the sentence would have left a false claim sitting directly above the data refuting it — the prose-defect shape this epic has been bitten by repeatedly. A knight only sounds its wings while alive.
  - Severity: minor
  - Forward impact: none; the enemy-side assertions (`toBeGreaterThan`) are untouched and still carry jt9-1's actual mechanism claim.

### TEA (test design)

- **The wait is tested in PCNAP-12 naps, not frames**
  - Spec source: context-story-jt9-9.md, AC-1
  - Spec text: "`stepDemo`'s egg-process frame driver decrements the timer by 1 per frame when the egg is settled and timer > 0" (and again: "decrements by 1 per frame, matching the ROM's per-frame decrement (`:3267-3269`)")
  - Implementation: the pins assert one decrement per `EGG_WAIT_NAP_FRAMES` = 12 display frames, so the wave-1 kill-egg wait is 64 × 12 = 768 frames rather than 64
  - Rationale: `PCNAP 12` (`:3227`) sits between EGGLND's load (`:3224`) and its `DEC PJOYT,U` (`:3236`), and `BNE EGGLN2` (`:3237`) closes the loop back above the nap — so the nap is the loop body's cost, paid once per decrement. The spec's cited `:3267-3269` is not a decrement site at all — it is inside the EGGMAN remount block, seeding the hatched bird's brain (`STD PDECSN,Y` / `LDD #SEEKE  TELL THE DOGIE TO FETCH THE LITTLE MAN` / `STD PJOY,Y`). A per-frame reading makes every egg in the game hatch 12× too fast — the same class of error bz3 found in battlezone's timebase.
  - Severity: major
  - Forward impact: the determinism re-baseline moves further than the story predicts, because the hatch it introduces is 12× later than AC-1 describes. Dev should re-measure the moved pins rather than reason from the story's estimate.

- **EGGWT and EGGWT2 are wired to different paths**
  - Spec source: context-story-jt9-9.md, AC-1
  - Spec text: "`EggState` carries `waitTimer?: number`, initialized by `settledWaveEgg` from the wave-spawn EGGWT2 read" — one row, one seeding site
  - Implementation: EGGWT2 seeds the WAVE egg's initial wait; EGGWT is the wait any egg takes on landing, including a kill-egg. Two pins, deliberately using a wave where the rows differ (64 vs 56).
  - Rationale: RAMDEF.SRC:393/:395 names the split ("EGG HATCHIN SEQUENCE" vs "EGG HATCHIN (EGG WAVES)"), and EGGWT is loaded at EGGLND (`:3224`), which every landing egg reaches. Seeding only from EGGWT2 would leave EGGWT — the row the story's own title names — with no consumer, and `ROW_DISPOSITION` would still be lying about it.
  - Severity: minor
  - Forward impact: none; both rows leave `no-consumer-yet` together, which is what `difficulty-wiring.test.ts:847` expects.

- **The victor guard is pinned as a pure law, not driven through a lava death**
  - Spec source: context-story-jt9-9.md, AC-4
  - Spec text: "Stage a lava-troll death with `eggsLeft === 1`; verify NO score event is emitted (victor guard)"
  - Implementation: `lastEggAward(victor, hits)` is asserted directly — nonzero with a victor, zero without
  - Rationale: this port has no lava death to stage. `troll.beginGrip` has zero production callers, which `ROW_DISPOSITION.LAVGRA` records in difficulty.ts and jt9-11 owns. A test driving one would assert "no egg score" over an unreachable branch and pass for a reason unrelated to the guard — the vacuous-guard shape this epic has been bitten by repeatedly.
  - Severity: minor
  - Forward impact: the integration-level victor-guard test belongs to jt9-11, when a live grip exists. Worth a line in jt9-11's context.

- **AC-2's gate removal is partial — `willHatch` stays**
  - Spec source: context-story-jt9-9.md, AC-2
  - Spec text: "Remove the `waveEgg === true` gate from `stepDemo:1288`. All eggs (wave and kill alike) now mature when `settled && willHatch(egg)`"
  - Implementation: as specified — but an explicit control pins that a permadeath egg (`eggsLeft 0`) must NOT hatch
  - Rationale: the spec text is correct and already keeps `willHatch`; the control exists because the obvious way to write the change is to delete the whole conjunction, which would resurrect permanently-dead enemies forever. Recording it so the control is not read later as scope creep.
  - Severity: minor
  - Forward impact: none.