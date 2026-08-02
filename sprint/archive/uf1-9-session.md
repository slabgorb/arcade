# Session: uf1-9

## Story Details

- **Story:** uf1-9 — joust DYTBL cadence rows — wire the wing-flap timer, the decision timer and the up-flight VY gates (11 rows)
- **Jira:** uf1-9
- **Epic:** uf1 — Unwired features (2026-07-28 fleet sweep)
- **Points:** 5 · **Priority:** p3
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** none
- **Branch Strategy:** trunk-based — work lands on `main`. `feat/uf1-9-dytbl-cadence-rows` is a
  zero-commit visibility beacon for sibling checkouts, never a merge target.
- **Context:** `sprint/context/context-story-uf1-9.md`
- **Started:** 2026-08-02

## Workflow Tracking

- **Workflow:** tdd
- **Phase:** finish
- **Phase Owner:** sm

---

## SM Assessment (setup)

### Board probes — clear

- `git fetch --prune` then a remote-branch grep for `uf1-9`: **no branch existed**. All remote
  branches at claim time: `feat/cp5-2-wire-audio-seam-into-main`, `feat/extract-audio`,
  `fix/sprint-sh2-18-archive`, `main`.
- Live-session sweep across `a-1`/`a-2`/`a-3`: the only live session anywhere is **`uf1-15` in
  `a-3`** (star-wars). Same epic as this story, different game, no shared files — no contention.
  Note the glob emitted `no matches found` for the two empty checkouts; that is the glob failing,
  read as such rather than as a clean board.
- Local `main` was 6 behind at start; fast-forwarded to `ec78d0d` before claiming.
- Claim beacon pushed from `main` **without checking out** (`git push origin
  main:refs/heads/feat/…`), so this session never leaves `main` and the mg1-5 stale-ref push trap
  cannot fire. Verified 0 commits ahead of `origin/main`.

### The description was measured, and five claims are wrong

The story arrived with `acceptance_criteria: null`, so ACs would have been **derived from this
description**. That made measuring it a precondition, not a nicety. Corrections in full sit in the
context file; in brief:

1. **`smartDecision` does not exist.** Named four times as the function to change. `uf1-8` (commit
   `2346bed`) removed it, splitting it into `boundr`/`b2undr`/`shadow` behind `runBrain`
   (`enemy.ts:478/:488/:514/:722`). A repo-wide grep of `plugins/joust/src/` returns nothing; the
   name survives only in test comments and other stories' prose. The description's end-to-end
   staging advice is written around that dead function and must be re-verified against `pursue()`.
2. **SHCLTM is not a decision timer.** Four of the five named rows carry the ROM comment `TIME
   UNTIL NEXT DECISION`; SHCLTM `:4375` carries a bare `#8` and sits under `SHDICL … SLOW DOWN!!!
   GOING INTO A CLIFF` (`:4373-4377`) — a cliff-avoidance brake dwell. The misgrouping already
   propagated into the shipped `ROW_DISPOSITION` (`difficulty.ts:340`, `missing: DECISION`).
   AC4 corrects both.
3. **The promised "free check" fails on 2 of 11 rows.** SHLETM `starts[1]` = `$0015` (21) against a
   comment of `8+1` (9); SHUPTM `starts[1]` = `$000A` (10) against `8+1` (9). Confirmed twice —
   from `JOUSTRV4.SRC:7330`/`:7329` and from the already-decoded table at `difficulty.ts:123`/`:122`,
   which agree. A blanket eleven-row sweep would redden on two correctly-ported rows, so AC6
   requires the exclusion be named and asserted rather than quietly skipped.
4. **HUUPVY and SHUPVY are not a matched pair.** HUUPVY `:4178` is reached only at timer expiry and
   **re-arms** via `INC PJOYT,U` (`:4176`) when the comparison fails; SHUPVY `:4272` is evaluated on
   every entry to `SHUP1` (`:4269-4275`) with no timer guard. Dropping the INC costs the hunter a
   full cadence per failed test. AC5 pins the difference.
5. **Stale path** — `joust/src/core/…` → `plugins/joust/src/core/…` (epic-wide, already noted there).

**The epic YAML still carries the original description**, deliberately: it is shared with the other
sweep stories and correcting it in place would disguise a decision as the story having always said
so. The corrections live in the story's ACs, this assessment and the context file, with the
original reproduced unedited at the bottom of the context so a reader can see what was filed.

### What verified — recorded so nobody re-runs the sweep

All 12 cited ROM line numbers are byte-exact. "Single ROM consumers" holds for **all 11** rows —
each label appears exactly twice in the 8139-line source, its `DYWORD` definition and one consumer,
so the continuation-row trap does not apply here. All four wing rows genuinely are `LDA <row>` /
`STA PJOYT,U` on consecutive lines, and all five decision rows store to `PJOYT` too.
`ROW_DISPOSITION` lists all 11 with `owner: 'uf1-9'` and every ROM line in it matches source. The
column semantics check out end to end: the `DYWORD` macro at `:210`, GA1 bucketing at `:930-939`
with default 5 → column 1, and wave 1 reading the start unwalked — so "GA1 column 1" is `starts[1]`
is the wave-1 value. `knightsBelowTheBuzzards` and `brakeDecidingFrames` really are in
`tests/difficulty-wiring.test.ts` (`:202`, `:237`). Prerequisites `jt8-1`, `uf1-2`, `uf1-8` are all
`done`. The description's two worked examples (BOUPWD start 2, BOUPWU start 8) are both correct.

### User ruling — uf1-9 owns the PJOYT latch (blocking, settled before RED)

`jt5-8` ("The enemy's wing-down LATCH", jt5, 5pt, p3, tdd, `backlog`) proposes the same build,
citing `BOUPWD :3864-3865`, `BOUPWU :3894` and `DYTBL :7314-7315` by line and naming the same
determinism risk. This is not a theme collision — it is the same mechanism and the same rows.

It could not be resolved by descoping, because **all nine of this story's timer rows write
`PJOYT`** — the four wing rows and all five decision timers (`:3910`, `:4061`, `:4284`, `:4317`,
`:4376`). uf1-9 needs the latch whoever nominally owns it. That census was taken before asking, so
the question went to the user as a one-click ruling rather than a survey.

**Ruled:** uf1-9 builds `PJOYT` and wires all 11 rows; at **finish**, SM re-scopes jt5-8 to what
remains — the dumb brain's wingbeat (`LNTUP :3746-3748` / `LNTOFP :3759-3762`, not a DYTBL row) and
the `flapHeld: decision.flap` edge-vs-level fix at `enemy.ts:540`. jt5-8 is **not** to be edited by
the phase agents; that is a finish-phase SM deliverable and this story should not close without it.

### Handed forward as a QUESTION, not a fact

The bounder's wing latch (`:3855-3899`) has no VY gate; the hunter's (`:4174-4185`) gates the same
flap on HUUPVY. SM did not determine whether that asymmetry is deliberate. It only matters if the
two latches get unified behind one helper — if deliberate, unifying would hand the bounder a gate
the machine never had. Identify which before sharing code. SM asserts nothing.

### Environment

Dev port 5270 is held by the **a-2** checkout (`node` pid 11580, cwd `/Users/slabgorb/Projects/a-2`).
This story is pure-core sim work with no visual AC, so it should not bite; if serving is needed use
`npx vite --port 5290 --strictPort` and do not kill a-2's server.

### Setup checks

- ACs authored from the measurements (7), written to the epic YAML via `pf sprint story update
  --add-ac`, and confirmed **byte-verbatim** in both the YAML and the context by a `python3` `in`
  test against `yaml.safe_load` — not by grep.
- Context file authored by SM rather than generated, because `pf context create` renders the raw
  description verbatim and that description is the thing being corrected. It carries no
  approach/scope filler.
- Story stamped `in_progress` with `started: '2026-08-02'`, verified by parsing the epic YAML.
- Labelled tokens counted after writing this assessment: the phase pointer, the repos field and the
  branch field each appear exactly once. Named rather than spelled here, since a spelled token in
  prose is what the ceremony's pattern-scrapers pick up.

---

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/cadence-source.test.ts` — ROM provenance, independent instruction reader (21 tests)
- `plugins/joust/tests/cadence-wiring.test.ts` — behaviour through the brains and the demo (13 tests)
- `plugins/joust/tests/helpers/enemy-contract.ts` — declares two members the contract was missing

**Tests Written:** 34 covering 7 ACs
**Status:** RED — 15 failing, 19 passing by design

Counts, measured: baseline before this phase was **2826 passing / 122 files**. After:
**2845 passing, 15 failing, 124 files**. 2845 − 2826 = 19, so **no sibling test changed
state** — every new failure is in the two new files. `tsc --noEmit` clean;
`npm run test:orchestrator` 372/372.

### The ORACLE / RED split (why 19 tests are green at RED)

Stated in each group's own header, per the jt5-10 rule. **18 ORACLE tests** re-derive facts
from `JOUSTRV4.SRC` — the 1982 source already says what it says, so they pass on arrival.
They are the evidence base that makes AC4/AC5/AC6 measurements rather than opinions, and the
regression guard the day someone re-files a row into the wrong family. **One more** green test
pins the determinism INVARIANT (same seed replays identically) which must survive the
re-baseline AC7 expects. The other **15 are RED**: 12 behavioural, 3 demanding the port record
the findings.

### What the census found that the story does not say

The ACs were sound; running them turned up three ROM facts that change what GREEN has to do.
All three are pinned by ORACLE tests, so they cannot be re-lost.

1. **Six sites carry `TIME UNTIL NEXT DECISION`, not four.** `B2UP3` (:4199) and `SHUP3`
   (:4415) — the "LEVEL FLIGHT, READY TO GO UP" states — carry a hardcoded `#20+1` the 1982
   authors never migrated to DYTBL. Found because the census test asserts over the whole file
   rather than over the four rows I had been handed; it reddened, and the redness was the find.
2. **`PJOYT` is armed at FOURTEEN sites in the enemy brains; only NINE are rows.** The other
   five are frozen immediates: `LDA #2` (:4009), `LDA #8` (:4145, the hunter's cliff dwell —
   the shadow's same-shaped dwell IS a row, SHCLTM), `LDA #20+1` (:4200, :4416), plus the
   bounder's down-seek `LDA #2` at :3823 which branches into `BOUP12`'s shared store. A port
   that treats "the decision timer" or "the wing timer" as one wave-scaled quantity everywhere
   will scale five sites the machine holds constant.
3. **`BOUPWD`/`HUUPWD` are the UP-SEEK hold ONLY** — `BOUP1`/`B2UP1` are the climb states. The
   DOWN-seek arms its own frozen `#2`, and has **no wing-up reload at all**: `BODN2`'s expiry
   returns to `BODN1` with `CLRB` and arms nothing, so its wings-up side is decided by the
   `BODNVY`/`HUDNVY` brake every wake — which the port **already does correctly** and must not
   lose. Both paths are 2 at wave 1, so wiring the row to both looks right until wave 3.

### Measured coverage limit — recorded, not hidden

`BOUPWD` and `HUUPWD` are **equal at every wave 1-16**, and `BOLETM`/`HULETM` likewise. A
bounder↔hunter swap of those rows is therefore **invisible to any value-based test**. The wing-UP
pair first diverges at **wave 7** (`BOUPWU` 6, `HUUPWU` 7), which is why the discriminating test
runs there rather than at wave 1. `SHUPTM`/`SHCLTM` and `HUUPVY`/`SHUPVY` differ at wave 1. The
undiscriminable pairs are covered structurally instead, by the disposition consumer strings in
the source suite — a complementary guard, not a redundant one (jt5-10).

### Where the re-baseline pressure actually comes from

Measured on seed `0x51ce`, 240 frames: a natural run enters the **down-seek on 128 frames and
the up-seek on ZERO**. Buzzards climb only toward a quarry above them and knights do not stay
above them. So the four wing rows and `HUUPVY` land on a path production play does not currently
reach; the digests will move because of the **decision timers and the down-seek's frozen 2-wake
hold**, both on paths that do fire. Re-parking the knights high every frame yields 149 up-seek
frames, and that staged fixture is what the full-cabinet test uses.

### Rule Coverage

| Rule / discipline | Test(s) | Status |
|---|---|---|
| Independent double-entry reader (jt1-3) — nothing under `src/` imports it | own `parseInsn` in cadence-source | passing |
| Vendored-tree degradation (`skipIf(!vendoredAvailable)`), reads inside `it()` | all 4 ORACLE groups | passing |
| Pure core: no clock/entropy/browser surface introduced | tests only; no `src/` edits | n/a |
| Every test asserts something meaningful | self-check below | 1 vacuous test found and fixed |
| Negative/complement case for every positive | AC3 "DOES re-decide", AC4 "keeps the four", AC5 both sides of the gate | failing (RED) |
| Fixture premises asserted, not assumed | AC1 asserts `[2,8]`; AC5 asserts each gate value; e2e asserts up-seek liveness | mixed |
| Re-apply staging every frame (jt5-10) | `heldLevels`, `park` in the e2e test | failing (RED) |

**Self-check:** one vacuous test found and fixed. The first full-cabinet probe called
`createWaveDemo(seed, wave)` (it takes one argument) and read `state.enemies` (enemies live in
`sim.processes`), so it compared `'[]'` against `'[]'`. With the assertion's sign reversed it
would have passed and proven nothing. It now asserts up-seek liveness on both waves before
comparing, and fails on a real non-empty trace.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN.

---

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — `PjoyState`; `wingWake` (the UP two-phase latch, the DOWN frozen hold, the HUUPVY gate + INC re-arm); `withWingCadence` / `withCliffDwell` / `shadowDwellWake`; `currentRoute`; the SHUPVY gate in `shadow()`; `flapHeld` = held level and `flap` = its rising edge
- `plugins/joust/src/core/difficulty.ts` — the eleven `ROW_DISPOSITION` entries flipped to `wired` with real consumers
- `plugins/joust/tests/helpers/enemy-contract.ts` — declared `pjoy`
- Six sibling test files re-baselined or re-staged (below)

**Tests:** 2860/2860 joust+shared · 11150/11151 cabinet-wide (1 pre-existing todo) · orchestrator 372/372
**Typecheck:** clean on this story's whole surface. It was clean repo-wide at commit time; after the
push rebase over a sibling's `sw8-18` RED commit (`8e32c2f`), `tsc --noEmit` reports 3 errors, all in
`plugins/star-wars/tests/audit/comment-citations.test.ts`, which imports
`tools/audit/check-comment-citations.mjs` — a module that sibling's Dev has not built yet. Attributed
rather than assumed: the file's only commit is theirs, my GREEN commit touches **zero** star-wars
files, and the failing-file list and my changed-file list have no intersection. This is the expected
steady state mid-sibling-story on a trunk-based repo, not a regression in this story.
**Landed on:** `main` (trunk-based)

### The bug the new tests could not see

TEA's suite deliberately pins the cadence's PERIOD and not its PHASE, which is the right call — but
it meant the arm wake was uncovered, and I got it wrong. I seeded both brains' up-seek latch the
same way; the ROM does not. The bounder's decide ends `BRA BOUP1A` (:3853) straight into the flap
branch, so it enters wings DOWN and flaps on the arm wake; the hunter's ends `BRA B2UP2D` (:4037)
into `CLRB`, so it glides a full HUUPWU hold first. Giving the bounder the hunter's entry cost it
its first flap and it stopped climbing toward a quarry above it.

**It was caught by `homing.test.ts` and `target-wiring.test.ts` reddening — not by anything new.**
Both went green again on the fix, which is the signature that separates a real bug from a guard that
merely needs re-baselining, and it is why I sorted every failure into those two piles before
touching a single expectation.

This also settles the question SM handed forward. The bounder/hunter asymmetry is deliberate and it
is in TWO places at once: the hunter enters gliding AND gates its first flap on HUUPVY; the bounder
enters flapping and has no gate. So the two latches must not be unified behind one helper.

### The re-baseline (AC7), and how it was bounded

21 sibling assertions moved. None was nudged: every frame pin was re-found by sweeping for its own
PRECONDITION (the jt8-7 method), and every digest re-measured.

Two pins needed more than a new frame — their precondition has an **empty solution set** on the old
seed, which a frame-only sweep would have reported as "not found":
- `audio-events`' egg pin asserts player 2's score rises; across 2500 frames of `0xbeef` every
  `egg-collected` now scores player ONE → moved to `0x2468` frame 230.
- `audio-thud`'s person thud needs a buzzard to bump a knight; across 1200 frames neither `0x2468`
  nor `0xbeef` produces one any more → moved to `0xface` frame 260, which reproduces the exact
  asserted stream (`player-wing-down` + the thud, with a silent frame before).

**What did NOT move bounds the change honestly:** `rng` is bit-identical in every fingerprint, and
every PLAYER row in every entity digest is unchanged. The cadence moves the birds, not the sim's
draw order or the player-shared flight seam. One prose claim had to be narrowed rather than
re-valued — `audio-flap`'s comment said "player#1, player#2 **and the egg** are bit-identical", and
the egg is now gone (its enemy survives to frame 200), so the sentence was corrected in the same
edit rather than left asserting something false.

### Scope held

The level-flight one-wake flap alternation (`BOFAST` → `BOLEV2` → `BOLEVA`, :3931-3938) is real and
unmodelled; it is a distinct mechanic from the eleven rows, no AC names it, and building it would
have widened the determinism blast radius for nothing. Filed as a Delivery Finding. Likewise the
four frozen `B2UP3`/`SHUP3` arming sites need states the port does not have.

**Handoff:** To The Argument Professional (Reviewer).

---

## Design Deviations

### TEA (test design)

- **Declared two missing members on the TEA-owned enemy contract**
  - Spec source: context-story-uf1-9.md, AC1 ("the held LEVEL … reaches the flight pipeline")
  - Spec text: "The held LEVEL (not the press edge) reaches the flight pipeline, so a wing-down hold selects its gravity for the whole duration."
  - Implementation: added `EnemyState.prevFlapHeld` and `EnemyModule.stepEnemyDetailed` to `tests/helpers/enemy-contract.ts`
  - Rationale: jt5-3 added both to `src/core/enemy.ts` and neither to the contract. The held wing level is the only observable of a cadence latch, so without these declarations AC1 is untestable through the contract and `tsc` rejects the access. Declaring existing exports is not a spec change; the contract was simply behind.
  - Severity: minor
  - Forward impact: none for Dev — both members already exist and behave as declared. A Reviewer seeing a helper edit in a RED commit should read it as contract catch-up, not as scope creep.

- **Pinned the cadence PERIOD and complete run-lengths, not the starting phase**
  - Spec source: context-story-uf1-9.md, AC1
  - Spec text: "wings stay DOWN for the wing-down hold and UP for the wing-up hold, alternating via the PJOY state pointer"
  - Implementation: the latch tests drop the first and last (partial) runs and assert the complete runs and the alternation
  - Rationale: where the cycle starts depends on how the up-seek episode is entered, which is Dev's design. Pinning the phase would make the suite an implementation transcript and would redden on a faithful port that enters the cycle on the other foot. The AC's content is the hold LENGTHS, and those are pinned exactly.
  - Severity: minor
  - Forward impact: a port that got the phase backwards would pass. If the entry phase is later shown to be observable in play, it needs its own test.

- **AC7's determinism half is pinned as an invariant, not as a recorded digest**
  - Spec source: context-story-uf1-9.md, AC7
  - Spec text: "the jt2 seeded-replay determinism digests are DELIBERATELY re-baselined with the re-baseline recorded as intended"
  - Implementation: a test asserting same-seed-same-run, plus a full-cabinet divergence test; no new digest constant is recorded by TEA
  - Rationale: the re-baselined values cannot be known before the implementation exists, and inventing them now would either be wrong or force Dev to make the code match a guess. The re-baseline itself is Dev's, on the existing jt2 pins; what TEA can pin ahead of it is the property that must survive.
  - Severity: minor
  - Forward impact: Dev must re-baseline the existing jt2 digests and say so; no test here will catch a re-baseline done badly, so the Reviewer should check the digests moved for the stated reason.

---

### Dev (implementation)

- **Declared `pjoy` on the TEA-owned enemy contract**
  - Spec source: context-story-uf1-9.md, AC1 and AC3
  - Spec text: "The bounder and hunter hold a WING-CADENCE LATCH on a PJOYT-equivalent countdown"
  - Implementation: added `EnemyState.pjoy` to `tests/helpers/enemy-contract.ts` alongside the module's new field
  - Rationale: the contract declares the module's shape, and `wave.test.ts` needs to clear the field on a fixture. Declaring a field the implementation introduced is contract upkeep, not a spec change — the same catch-up TEA did for `prevFlapHeld`/`stepEnemyDetailed` in the RED commit.
  - Severity: minor
  - Forward impact: none.

- **Re-staged four sibling FIXTURES rather than re-expecting them**
  - Spec source: context-story-uf1-9.md, AC5 and AC3
  - Spec text: "SHUPVY :4272 is consulted on every entry to SHUP1 … with no timer guard at all"
  - Implementation: `seek-wiring.test.ts`'s `rising` moved from `velY: -0x50` to `-0x600`; `wave.test.ts`'s `downSeek` now clears `pjoy`; `difficulty-wiring.test.ts`'s R2-1 compares wave 10 against wave 9 (its same-rung partner) and adds an explicit wave-10 ≠ wave-16 assertion
  - Rationale: each fixture encoded a pre-uf1-9 approximation that this story corrects, and leaving them would have made the tests assert falsehoods OR lose their discriminator entirely. In every case the ASSERTIONS and their stated meanings are unchanged — only the staging moved, and each edit says at the line why. Re-expecting them instead would have recorded the correction as if the test had always meant it.
  - Severity: minor
  - Forward impact: R2-1's same-rung partner is now wave 9; a future story that makes more rows live must re-check that 9 and 10 still share a rung.

- **AC7's determinism re-baseline: 21 pins moved, none by nudging**
  - Spec source: context-story-uf1-9.md, AC7
  - Spec text: "the jt2 seeded-replay determinism digests are DELIBERATELY re-baselined with the re-baseline recorded as intended"
  - Implementation: every frame pin re-found by sweeping for its own precondition (the jt8-7 method); two pins changed SEED because their precondition has an empty solution set on the old seed; every digest re-measured
  - Rationale: the wing hold changes which gravity applies for a run of wakes, so flight shape and therefore kill timing move. Nudging a number until green would have been indistinguishable in a diff from fixing a broken pin.
  - Severity: major (21 sibling assertions changed)
  - Forward impact: the re-baselined coordinates are recorded per test with their measurement; a reviewer can re-run the sweep. `rng` is bit-identical in every fingerprint and every PLAYER row in every entity digest is unchanged, which bounds what actually moved.

- **Did NOT model the level-flight one-wake flap alternation**
  - Spec source: JOUSTRV4.SRC:3931-3938 (`BOFAST` → `BOLEV2` → `BOLEVA`)
  - Spec text: the ROM's level flap sets `PJOY = BOLEV2`, and BOLEV2 immediately returns to BOLEV1 falling through `BOLEVA CLRB` — so the wake AFTER a level flap is forced wings-up
  - Implementation: left the level route's per-wake law (`flap: velY >= 0`) exactly as uf1-8 shipped it
  - Rationale: no AC names it, no test demands it, and it is a distinct mechanic (a forced-glide wake) from the eleven cadence rows this story owns. Building it would have widened the determinism blast radius for no AC.
  - Severity: minor
  - Forward impact: filed as a Delivery Finding below; joust's level flight still flaps on consecutive wakes where the ROM alternates.

---

### Dev (round 2)

- **Made `PjoyState` a discriminated union rather than patching the dwell in place**
  - Spec source: Reviewer round 1, R1-2 and the Devil's Advocate section
  - Spec text: "a discriminated union (`kind: 'wing'|'interval'|'dwell'`) would have made that unrepresentable"
  - Implementation: `PjoyState` is now a three-arm union; every read site discriminates on `kind`
  - Rationale: the Reviewer marked the refactor non-blocking and the bug blocking, but the bug IS the representation — two states sharing `{timer, wings:'up'}` is why the wrong law ran. Patching the symptom would have left the next state to make the same mistake.
  - Severity: minor
  - Forward impact: `EnemyState.pjoy` changes shape; the TEA contract is updated to match, and no other module reads the field.

- **Made the shadow's decision interval GATE its branch (beyond the literal finding)**
  - Spec source: context-story-uf1-9.md, AC3
  - Spec text: "The four level-flight DECISION timers reload the same countdown at their decide points and force a re-decide on expiry"
  - Implementation: `shadow()` holds the level branch while an interval runs, instead of re-deciding from the delta every wake
  - Rationale: R1-3 only asked for a test. Writing it exposed that SHUPTM/SHLETM were armed, ticked and inert — the row was read and gated nothing, which is exactly what round 1 rejected for SHCLTM. AC3's "force a re-decide on expiry" is vacuous if the brain re-decides every wake anyway.
  - Severity: minor
  - Forward impact: changes the shadow lord's branch selection. No determinism re-baseline was needed — the suite stayed green — which independently corroborates R1-7's measurement that the shadow brain never appears in reachable play.

- **Declared `steerWake`, `DOWN_SEEK_WING_HOLD` and `HUNTER_CLIFF_DWELL` on the TEA contract**
  - Spec source: Reviewer round 1, R1-1's prescribed fix
  - Spec text: "a test that steps a shadow lord into a cliff turn"
  - Implementation: added the three members to `tests/helpers/enemy-contract.ts`
  - Rationale: a cliff turn is the only way to arm a dwell, and `steerWake` had existed in the module since jt8-3 without ever being declared — the same one-directional drift TEA flagged in RED. Contract upkeep.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

Every TEA and Dev deviation reviewed and stamped in the Reviewer Assessment below — all seven
ACCEPTED, none flagged. One UNDOCUMENTED deviation found:

- **The hunter's cliff dwell was introduced without a ROM-faithful expiry law.** Spec said `B2DICL`
  (:4142-4145) arms `B2AV`, whose expiry is `JMP B2UNDR` — a re-decide, never a flap (:4190-4193).
  Code arms the dwell for the hunter with the same `{timer, wings: 'up'}` shape the wing cadence
  uses, so `wingWake` runs it as a wing-UP phase and flaps on expiry; on the down route the dwell is
  ignored entirely. Not logged by Dev. Severity: MEDIUM → finding R1-2.


## Delivery Findings

### TEA (test design)

- **Gap** (non-blocking): the wing-cadence mechanic has FIVE frozen `PJOYT` arming sites that no
  DYTBL row covers, and wiring the eleven rows leaves them unmodelled or — worse — wave-scaled.
  Affects `plugins/joust/src/core/enemy.ts` (the down-seek wing hold must be a frozen 2, the
  hunter's cliff dwell a frozen 8, and `B2UP3`/`SHUP3`'s decision interval a frozen 21; only the
  nine row-backed sites may consult `waveValue`). Pinned by the FROZEN group in
  `tests/cadence-source.test.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `BOUPWD`/`HUUPWD` govern only the UP-seek hold, and the DOWN-seek has no
  wing-up reload at all — its wings-up side is the `BODNVY`/`HUDNVY` brake, which the port already
  implements correctly and must retain. Affects `plugins/joust/src/core/enemy.ts` (`pursue`'s down
  route). Both paths read 2 at wave 1, so an incorrect wiring is invisible until wave 3.
  *Found by TEA during test design.*
- **Question** (non-blocking): production play never enters the up-seek — measured 0 up-seek frames
  against 128 down-seek frames over 240 frames on seed `0x51ce`, at waves 1 and 7 alike, because
  knights do not stay above the buzzards. Four wing rows and `HUUPVY` therefore wire onto a path the
  running game does not currently reach. Affects `plugins/joust/src/core/demo.ts` /
  `plugins/joust/src/core/target.ts` (whether SELPLY's altitude selection is faithful, or whether
  the clone's knights simply never fly high enough). Not a blocker and not this story's to fix —
  but it means AC7's re-baseline will be driven by the decision timers and the frozen down-seek
  hold, not by the wing rows, and a reviewer expecting the wing cadence to move the digests will be
  looking in the wrong place. *Found by TEA during test design.*
- **Gap** (non-blocking): the TEA enemy contract had drifted behind the module since jt5-3 —
  `stepEnemyDetailed` and `EnemyState.prevFlapHeld` existed in `src/core/enemy.ts` and in no
  contract. Affects `plugins/joust/tests/helpers/enemy-contract.ts` (fixed in this RED commit; the
  general risk is that a double-entry contract only ever drifts in one direction, because nothing
  fails when it is merely incomplete). *Found by TEA during test design.*
- **Improvement** (non-blocking): `plugins/joust/tests/difficulty-wiring.test.ts:18` asserts in
  prose that "Every DYWORD row's GA1 column 1 … reproduces EXACTLY the immediate the 1982 source
  hardcoded" — the same blanket claim AC6 exists to correct, and false for `SHLETM` and `SHUPTM`.
  No test asserts it, so it ships green; it is exactly the unguarded-prose class. Affects
  `plugins/joust/tests/difficulty-wiring.test.ts` (the header comment should carry the two
  exceptions, or cite `cadence-source.test.ts` for the measured version). *Found by TEA during test
  design.*
- **Question** (non-blocking): jt8-2 deferred `PPVELX` explicitly to this story —
  `plugins/joust/src/core/enemy.ts`'s `HomingState` doc says "the decision timers belong to a later
  story (uf1-9 owns the …rows), so there is no moment here at which a snapshot could honestly be
  taken", and `homingWake` therefore compares the target's LIVE velocity index. Landing AC3 creates
  that moment (the three `PPVELX` writes at :3907-3908, :4058-4059, :4281-4282 sit immediately
  before their decision-timer loads). No AC asks for `PPVELX` and no test here requires it, but once
  the timers exist the live-index read becomes a divergence rather than a documented approximation.
  Affects `plugins/joust/src/core/enemy.ts` (`homingWake`, and the `HomingState` comment which will
  be stale either way). Needs a scope ruling — fold in, or file a follow-up. *Found by TEA during
  test design.*

### Dev (implementation)

- **Gap** (non-blocking): the ROM's LEVEL flight cannot flap on consecutive wakes — `BOFAST` sets
  `PJOY = BOLEV2` and `BOLEV2` immediately returns to `BOLEV1` through `BOLEVA CLRB`
  (JOUSTRV4.SRC:3931-3938), so the wake after a level flap is a forced glide. The port's level law is
  a plain per-wake `flap: velY >= 0` and will flap every falling wake. Affects
  `plugins/joust/src/core/enemy.ts` (`pursue`'s level branch). Out of scope here — it is a separate
  mechanic from the eleven cadence rows and no AC names it — and it belongs with whatever story
  revisits BOLEV. *Found by Dev during implementation.*
- **Gap** (non-blocking): four PJOYT arming sites remain unmodelled because the port has no state to
  hang them on — `B2UP3` (:4195-4200) and `SHUP3` (:4411-4416), the "LEVEL FLIGHT, READY TO GO UP"
  states with their frozen `#20+1` intervals, exist in neither brain here. TEA's FROZEN oracle group
  pins their ROM shape so they are not re-discovered. Affects
  `plugins/joust/src/core/enemy.ts` (the hunter and shadow climb-preparation states). Wiring them
  needs the states first, which is a mechanic story, not a row story. *Found by Dev during
  implementation.*
- **Improvement** (non-blocking): the ENTRY phase of the up-seek latch is asymmetric between the
  brains (`BRA BOUP1A` :3853 flaps immediately; `BRA B2UP2D` :4037 glides first) and TEA's suite
  deliberately pins period rather than phase, so nothing new covers it — the bug was caught by
  `homing.test.ts` and `target-wiring.test.ts` reddening. That is luck rather than coverage. Affects
  `plugins/joust/tests/cadence-wiring.test.ts` (a phase-pinning test for the arm wake, per brain,
  would close it). *Found by Dev during implementation.*
- **Question** (non-blocking): this story confirms the SM's open question about the bounder/hunter
  asymmetry, and the answer is "deliberate, in two places at once" — the hunter both enters the climb
  gliding AND gates its first flap on HUUPVY, while the bounder enters flapping and has no gate. So
  the two latches must NOT be unified behind one helper, which is what the SM asked be settled before
  sharing code. Recorded here rather than left in the setup assessment because the evidence
  (`:3853` vs `:4037`) only surfaced during GREEN. Affects `plugins/joust/src/core/enemy.ts`
  (`wingWake`). *Found by Dev during implementation.*

## Reviewer Assessment (round 1)

## Subagent Results

**All received: Yes** — accounted for exhaustively, which for this project means something specific:
`pf settings get workflow.reviewer_subagents` reports **8 of the 9 specialists `false`**, and this
session does not spawn subagents. So no specialist was dispatched, none is outstanding, and the
verification each would have performed was done inline and is reproduced in this assessment with its
commands and outputs. The mutation battery is the substitute the project's own reviewer sidecar
prescribes for exactly this configuration.

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 1 | reviewer-preflight | Yes | run inline, not spawned | 2860/2860 joust+shared · 11150 cabinet · orchestrator 372/372 · `tsc` clean on this story's surface | N/A — reproduced above |
| 2 | reviewer-edge-hunter | Yes | DISABLED (`edge_hunter: false`) | covered inline: boundary mutants M2/M3/M15 (off-by-one on the hold), plus `timer: 0`/negative/`NaN` traced in Devil's Advocate | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | DISABLED (`silent_failure_hunter: false`) | covered inline: no try/catch, no fallbacks and no swallowed errors added — every new function is total and synchronous | N/A |
| 4 | reviewer-test-analyzer | Yes | DISABLED (`test_analyzer: false`) | covered by the battery — 6 survivors are precisely test-quality findings (R1-1, R1-3, R1-4) | N/A |
| 5 | reviewer-comment-analyzer | Yes | DISABLED (`comment_analyzer: false`) | covered inline: the citation sweep found R1-5, three stale cites, one with false content | N/A |
| 6 | reviewer-type-design | Yes | DISABLED (`type_design: false`) | covered inline: R1-6 (four type escapes) and the `PjoyState` four-meaning-union observation | N/A |
| 7 | reviewer-security | Yes | DISABLED (`security: false`) | n/a by inspection — pure deterministic core, no I/O, no network, no auth, no user input, no tenant data | N/A |
| 8 | reviewer-simplifier | Yes | DISABLED (`simplifier: false`) | covered inline: one provably unnecessary cast (verified by removing it and typechecking) | N/A |
| 9 | reviewer-rule-checker | Yes | DISABLED (`rule_checker: false`) | covered by the `### Rule Compliance` enumeration below (all 7 typescript rules × the shipped diff) | N/A |


**Verdict:** REJECTED
**Method:** 8 of 9 reviewer specialists are `false` in `workflow.reviewer_subagents`, so the review is
an **18-mutation battery** against the shipped source plus independent ROM re-derivation. Each
mutation was anchored on a unique substring, asserted `count == 1` before applying (an ANCHOR MISS
is indistinguishable from a caught mutation otherwise), run through `--project joust --project
shared`, and restored; `git status` was empty afterwards.

**Result: 12 CAUGHT, 6 SURVIVED.** The survivors are the review.

| # | Mutation | Result |
|---|---|---|
| M1 | bounder arms the up-seek wings-UP (Dev's own entry bug) | CAUGHT (8) |
| M2 | drop the HUUPVY `INC` re-arm | CAUGHT (1) |
| M3 | down-seek hold reads BOUPWD instead of the frozen 2 | CAUGHT (1) |
| M4 | **down-seek gains a wing-UP reload** | **SURVIVED** |
| M5 | shadow SHUPVY gate reverts to `velY >= 0` | CAUGHT (3) |
| M6 | shadow reads HUUPVY instead of SHUPVY | CAUGHT (2) |
| M7 | **shadow interval always SHUPTM (SHLETM never read)** | **SURVIVED** |
| M8 | BOLETM/HULETM swapped | **SURVIVED** — equivalent mutant, see below |
| M9 | **hunter cliff dwell reads SHCLTM instead of its frozen 8** | **SURVIVED** |
| M10 | `currentRoute` drops the level-interval hold | CAUGHT (12) |
| M11 | wing rows swapped between brains | CAUGHT (1) |
| M12 | `pursue` inverts the held wing phase | CAUGHT (21) |
| M13 | `flap` reverts to the LEVEL | CAUGHT (16) |
| M14 | the decision interval never counts down | CAUGHT (15) |
| M15 | wing hold off-by-one (`>=`) | CAUGHT (11) |
| M16 | **the shadow cliff dwell is never armed** | **SURVIVED** |
| M17 | **the interval arms on every branch, not just level** | **SURVIVED** |
| M18 | SHCLTM disposition re-labelled a decision timer | CAUGHT (1) |

The caught set is precise and mostly uncoupled — the boundary mutants (M2, M3, M11) redden exactly
one test each, the structural ones (M12, M13, M14) redden 15-21. That is a healthy shape.

### Findings

| # | Severity | Finding | Location |
|---|---|---|---|
| R1-1 | **HIGH** | AC4's SHCLTM wiring cannot be distinguished from absent | `enemy.ts` `withCliffDwell` |
| R1-2 | MEDIUM | The hunter's post-cliff dwell runs the WING cadence, not `B2AV` | `enemy.ts` `withCliffDwell`/`wingWake` |
| R1-3 | MEDIUM | SHLETM has no test that reads it | `enemy.ts` `decideInterval` |
| R1-4 | MEDIUM | The down-seek's "no wing-up reload" law is unguarded | `cadence-wiring.test.ts` |
| R1-5 | MEDIUM | Three citations broken by this diff, one with FALSE content | `audio-flap.test.ts:536`, `difficulty-wiring.test.ts:27`, `events.ts:47` |
| R1-6 | LOW | Four avoidable type escapes (2 casts, 2 non-null assertions) | `enemy.ts` |
| R1-7 | LOW | The hunter/shadow cadences are unreachable in any test's play | (coverage note) |

**R1-1 [HIGH] — AC4's second half is unproven.** AC4 requires SHCLTM be "wired as what the ROM makes
it — the cliff-avoidance brake dwell at SHDICL". M16 replaced `withCliffDwell`'s body with
`return enemy` — never arming the dwell at all — and **2860/2860 still passed**. M17 (arm an interval
on every branch, not just level) also survived. So the row is stamped `kind: 'wired'` with
`consumer: 'enemy.cliffDwell …'` and nothing in the suite can tell that consumer from a no-op. This
is precisely the defect class epic uf1 exists to eliminate — "built, tested and cited but never
reaching the running game" — and a `wired` disposition is the artifact the NEXT sweep will trust
instead of re-deriving. Half of AC4 (the disposition correction) is genuinely pinned by M18; the
other half is decoration.
**Prescribed fix:** a test that steps a shadow lord into a cliff turn and asserts the dwell holds for
`waveValue('SHCLTM', wave)` wakes and then re-decides — SHCLTM is 8 at wave 1 and 7 at wave 3, and
SHUPTM (10/9) is the discriminating neighbour, so the assertion has teeth at either wave.

**R1-2 [MEDIUM] — the hunter's cliff dwell is not `B2AV`.** `withCliffDwell` writes
`{timer, wings: 'up'}` for BOTH brains, but only the shadow's expiry is handled by `shadowDwellWake`
(which re-decides, matching `SHAV … JMP SHADOW` :4406-4409). The hunter's falls to `wingWake`, which
reads `wings: 'up'` as a wing-UP CADENCE phase and therefore **flaps on expiry** (or consults
HUUPVY) — where `B2AV` (:4190-4193) is `CLRB / DEC PJOYT / BGT B2DIRA / JMP B2UNDR`, i.e. it
RE-DECIDES and never flaps. On the down route the dwell is ignored outright, because that branch
re-tests the brake and never reads the timer. Introduced by this story; no test covers it (M9 also
survived, which is the same blind spot from the value side).

**R1-3 [MEDIUM] — SHLETM is wired to nothing a test reads.** M7 made `decideInterval` return SHUPTM
for every shadow, so `SHLETM` is never evaluated, and nothing reddened. The two ARE discriminable —
SHLETM is 21 at wave 1, SHUPTM is 10 — and the branch is `hasTarget`, so the test is one
`stepEnemy(shadow, { player: null })` away.

**R1-4 [MEDIUM] — the down-seek's asymmetry is half-guarded.** TEA's down-seek test filters
`completeRuns(...).filter(([lvl]) => lvl)` — the wings-DOWN runs only — so the ROM law that the
down path arms NO wing-up reload (`BODN2` expiry `CLRB`s and stores nothing, :3836-3839) is
untested. M4 added a BOUPWU-length wings-up hold there and nothing noticed. Asserting the wings-UP
runs are exactly 1 wake closes it in one line, and that asymmetry is one of this story's own
headline findings.

**R1-5 [MEDIUM] — this diff broke three citations, and one now asserts something false.** The
sidecar rule "a story that GROWS a file invalidates every citation pointing INTO it" applied and was
not run. `enemy.ts` gained ~360 lines:
- `audio-flap.test.ts:536` — cites `enemy.ts:540` for the synthetic-joystick construction, which is
  now at `:1129` (`:540` is `b2undrRows`). **Worse, its claim is now false**: it says `flap` and
  `flapHeld` are "ONE bit doing both jobs" and that "what the ROM adds is a LATCH" — this story
  split them (`flap: pressed`, `flapHeld: held`) and added the latch. The comment describes the
  pre-uf1-9 world as present tense.
- `difficulty-wiring.test.ts:27` — "enemy.ts:115/118 hardcode 0x100 / 0x200"; they are at `:266`/`:273`.
- `events.ts:47` and `audio-events.test.ts:197` — "difficulty.ts:362-367 already records [LAVGRA] by
  name"; LAVGRA's entry is now at `:376` and `:362-367` shows EGGWT/EGGWT2.

**R1-6 [LOW] — four avoidable type escapes**, against lang-review typescript rule #1. Two
`as SmartBrain` casts (`wingWake`, `seekWake`) and two `enemy.pjoy!` non-null assertions
(`wingWake`, `seekWake`). All four are provably guarded — I traced each and none can be null at
runtime — so this is robustness, not a bug. **Verified concretely:** removing the first cast
entirely (`enemy.brain === 'linet' ? null : enemy.brain`) typechecks clean, so TS narrows it on its
own and that cast is pure noise. The two `!`s go away by binding `const pj = enemy.pjoy` before the
guard.

**R1-7 [LOW] — measured coverage boundary, not a defect.** Surveyed the REAL game (`createGame` +
`stepGame`, three seeds, 6000 frames each): only `linet` and `boundr` brains ever appear, and the
runs reach wave 3. The wave table introduces hunters at **wave 4** (`WAVE_TABLE[3]`) and lords later,
so this is a reach limit of the fixtures, **not** a dead code path — the first probe I ran
(`createWaveDemo`, which hardcodes wave 1's complement) would have supported a much stronger and
WRONG claim, and was discarded. Recorded so the next reviewer does not re-derive it: seven of the
eleven rows are exercised only by unit-level calls, never end-to-end.

### Equivalent mutant — recorded, not a coverage demand

**M8 (BOLETM ↔ HULETM swapped) survived and no test should be written for it.** The two rows have
identical `starts`, `end` and `inc`, and differ only in `timeBytes`; at the shipped GA1 of 5 the
cadence nibble is the LOW nibble of `timeBytes[2]` — `0x44` → 4 and `0x84` → 4 — so they resolve
equal at every wave. Through the public surface the swap is unobservable, exactly the jt5-5
equivalent-mutant shape. It is covered STRUCTURALLY instead: M18 proves the disposition consumer
strings are pinned, and those name the rows correctly. TEA measured and recorded the same limit for
BOUPWD/HUUPWD in the RED assessment.

### Rule Compliance (lang-review/typescript)

Enumerated every rule against the shipped diff (`plugins/joust/src/core/*`). No `.claude/rules/` and
no `SOUL.md` exist in this repo.

| Rule | Instances in diff | Verdict |
|---|---|---|
| #1 type-safety escapes | 2 casts, 2 non-null assertions | **R1-6 (LOW)** — all guarded; one cast provably unnecessary |
| #2 generic/interface pitfalls | `PjoyState` — 2 `readonly` fields, no `Record<string, any>`, no `object`/`Function` | compliant |
| #3 enum anti-patterns | none added (string-literal unions `'down' \| 'up'`) | compliant |
| #4 null/undefined | `enemy.pjoy?.wings`, `ctx?.player ?? null`, `enemy.brain === 'linet'` guards; no `\|\|`-on-falsy | compliant |
| #5 module/declaration | no new imports; existing `.js` specifiers untouched | compliant |
| #6 React/JSX | n/a — pure core | n/a |
| #7 async/promise | none — every function added is synchronous and pure | compliant |

**Project-specific (CLAUDE.md):** `src/core` purity — `enemy.ts` and `difficulty.ts` add no clock,
no entropy, no browser surface, no shell import; the jt1-7 scanner passes (75/75 in
`purity.test.ts`). Every new function is pure and returns fresh objects (`{ ...enemy, pjoy }`), never
mutating its argument — checked at all six call sites.

### Data-flow trace

Followed one wake end to end for a promoted bounder with a quarry above:
`stepDemo` → `runBehaviour` (frame.ts) computes the `PlayerView` via `target.ts` → `stepEnemyDetailed`
→ `homingWake` (facing) → `steerWake` (cliff look-ahead; `turned`) → `seekWake` (PDIST episode +
the level decision interval) → `withWingCadence` → `wingWake` (the latch) → `runBrain` → `pursue`
reads `enemy.pjoy.wings` → `input = { flap: pressed, flapHeld: held }` → `stepEntity` → `flap()` on
the edge and `stepFlight` selects `GRAVITY_WINGS_DOWN` for the whole hold (`flight.ts:292`) →
`prevFlapHeld` carried for the next wake's edge. The ordering is the ROM's: the countdown decrements
inside the episode state and falls into that state's own flap logic on the same wake.

### Devil's Advocate

Assume this is broken. The most dangerous thing here is that `pjoy` is a SINGLE field carrying four
different meanings — a wing phase, a level interval, a shadow cliff dwell, and (by absence) "no
episode". The discriminator is whether `wings` is undefined. That is a stringly-typed union in
disguise, and R1-2 is exactly what it costs: the hunter's cliff dwell and the hunter's wing-up phase
are the SAME representation (`{timer, wings: 'up'}`) with different laws, so the code cannot tell
them apart and runs the wrong one. A proper discriminated union (`{kind: 'wing'|'interval'|'dwell'}`)
would have made that unrepresentable, and the type-design specialist would have said so if it were
enabled. I am not blocking on the refactor, but R1-2 is a real bug that the representation invited.

What would a confused caller do? Hand `stepEnemy` an enemy carrying a `pjoy` from a different brain —
which is exactly what `wave.test.ts` did, and Dev had to clear the field to make that test
discriminate again. That is a smell: a fixture that "carries state forward" now silently pre-empts
the range gate, and any future test staging a promoted enemy will hit it. It is disclosed, but the
next author will hit it too.

Boundary inputs: `timer: 0` gives `remaining = -1`, falls to expiry, re-arms — terminates.
A negative or `NaN` timer takes the same branch (`NaN > 0` is false) — no infinite loop, no
unbounded growth, values are bounded by the DYTBL walk. A `linet` enemy has `pjoy` cleared on every
wake. A route change clears it (`pjoy: undefined` on both arm branches). I could not construct a
state where the latch fails to terminate or leaks across brains.

Where I think the story is genuinely strong: the entry-phase asymmetry (`BRA BOUP1A` vs
`BRA B2UP2D`) is the kind of one-instruction ROM fact that ports get wrong silently forever, and it
was caught, fixed, and the fix VALIDATED by two unrelated suites going green again. The re-baseline
discipline is also right — `rng` bit-identical across every fingerprint and every player row
unchanged is a real bound on what moved, not a hand-wave.

### Deviation Audit

- **TEA: declared two missing members on the enemy contract** → ✓ ACCEPTED: `stepEnemyDetailed` and
  `prevFlapHeld` did exist in the module and not the contract; verified both by grep. Contract
  catch-up, not scope creep.
- **TEA: pinned PERIOD not PHASE** → ✓ ACCEPTED as reasoned, but note it is the deviation that let
  Dev's entry bug through — the deviation's own "forward impact" says so honestly, and Dev's
  assessment confirms it was caught elsewhere. No action; the record is correct.
- **TEA: AC7 pinned as invariant, not recorded digest** → ✓ ACCEPTED: the digests could not be known
  pre-implementation, and the invariant chosen (same seed → same run) is the right one.
- **Dev: declared `pjoy` on the contract** → ✓ ACCEPTED, same reasoning as TEA's.
- **Dev: re-staged four sibling fixtures rather than re-expecting them** → ✓ ACCEPTED. I checked all
  four: `seek-wiring`'s `rising` (−$50 → −$600) keeps all four assertions and their meanings and is
  required by the corrected gate; `wave.test`'s `pjoy: undefined` restores the discriminator;
  `difficulty-wiring` R2-1's wave-9 partner is correct and the added wave-10 ≠ wave-16 assertion is
  strictly stronger than what it replaced. Each is disclosed at the line.
- **Dev: AC7 re-baseline, 21 pins** → ✓ ACCEPTED with evidence checked: `rng` is bit-identical in
  every fingerprint and every PLAYER row in every entity digest is unchanged. The two seed changes
  are justified by an empty solution set, which I spot-checked for the egg pin (0xbeef scores player
  ONE on every collection).
- **Dev: did NOT model the level one-wake flap alternation** → ✓ ACCEPTED: out of scope, correctly
  filed as a Delivery Finding with its ROM lines.

### Reviewer (audit) — undocumented deviations

- **The hunter's cliff dwell was introduced without a ROM-faithful expiry law.** Spec source: AC4's
  family (`B2DICL` :4142-4145 is named in the story's own FROZEN oracle group). Code arms the dwell
  for the hunter but routes its expiry through the wing cadence. Not logged by Dev. Severity: MEDIUM
  → filed as R1-2.

---

### Reviewer (round 1)

- **Gap** (blocking): AC4's SHCLTM wiring cannot be distinguished from absent — replacing
  `withCliffDwell`'s body with `return enemy` leaves 2860/2860 green, so a row stamped `wired` with a
  named consumer has nothing proving that consumer runs. Affects
  `plugins/joust/src/core/enemy.ts` (`withCliffDwell`) and `plugins/joust/tests/cadence-wiring.test.ts`
  (needs a shadow cliff-turn test asserting an SHCLTM-length dwell; SHCLTM 8/7 vs SHUPTM 10/9 gives
  it teeth). *Found by Reviewer during review.*
- **Conflict** (blocking): the hunter's cliff dwell runs the wing cadence rather than `B2AV` — it
  flaps on expiry where `JMP B2UNDR` (:4190-4193) re-decides, and is ignored outright on the down
  route. Affects `plugins/joust/src/core/enemy.ts` (`withCliffDwell` / `wingWake` share one
  representation for two different laws). *Found by Reviewer during review.*
- **Gap** (non-blocking): SHLETM is never read by any test — forcing `decideInterval` to return
  SHUPTM for every shadow reddens nothing, though the two differ 21 vs 10 at wave 1. Affects
  `plugins/joust/tests/cadence-wiring.test.ts` (one `stepEnemy(shadow, { player: null })` closes it).
  *Found by Reviewer during review.*
- **Gap** (non-blocking): the down-seek's "arms no wing-up reload" law is unguarded — TEA's test
  filters the wings-DOWN runs only, so adding a BOUPWU-length wings-up hold there passes. Affects
  `plugins/joust/tests/cadence-wiring.test.ts` (assert the wings-UP runs are exactly 1 wake).
  *Found by Reviewer during review.*
- **Gap** (non-blocking): three citations broken by this diff's ~360 added lines to `enemy.ts`, one
  of which now asserts something FALSE — `audio-flap.test.ts:536` says `flap`/`flapHeld` are "ONE bit
  doing both jobs" and that the latch is what the ROM "adds", both of which this story changed.
  Affects `plugins/joust/tests/audio-flap.test.ts:536`,
  `plugins/joust/tests/difficulty-wiring.test.ts:27`, `plugins/joust/src/core/events.ts:47`,
  `plugins/joust/tests/audio-events.test.ts:197`. *Found by Reviewer during review.*
- **Improvement** (non-blocking): `pjoy` is one field carrying four meanings (wing phase, level
  interval, cliff dwell, absent), discriminated by whether `wings` is undefined — a discriminated
  union (`kind: 'wing' | 'interval' | 'dwell'`) would make R1-2 unrepresentable rather than merely
  fixed. Affects `plugins/joust/src/core/enemy.ts` (`PjoyState`). Not blocking; the immediate bug is
  R1-2. *Found by Reviewer during review.*
- **Improvement** (non-blocking): four avoidable type escapes against lang-review typescript #1 — two
  `as SmartBrain` casts and two `enemy.pjoy!` non-null assertions, all provably guarded. Verified the
  first cast is unnecessary outright (removing it typechecks clean). Affects
  `plugins/joust/src/core/enemy.ts`. *Found by Reviewer during review.*

## Dev Assessment (round 2)

**Implementation Complete:** Yes — all seven round-1 findings addressed.
**Tests:** joust+shared **2869/2869**. Cabinet-wide 30 vitest failures + 1 orchestrator failure,
**all attributable to the sibling's in-flight `sw8-18` RED** in `plugins/star-wars`
(`comment-citations.test.ts`, `sw8-18-remediation.test.ts`); the orchestrator's
`tsc --noEmit exits 0` guard fails for the same reason. Verified: the only file with a `tsc` error is
`plugins/star-wars/tests/audit/comment-citations.test.ts`, and my diff touches zero star-wars files.
**Landed on:** `main`.

### R1-1 + R1-2 — fixed by making the bug unrepresentable

The Reviewer's Devil's Advocate named the root cause exactly: `pjoy` was one field carrying four
meanings, so the hunter's cliff dwell and its wing-up phase had the SAME shape and the code ran the
wrong law. `PjoyState` is now a discriminated union — `wing` | `interval` | `dwell`.

Two things that only surfaced while fixing it, both of which the round-2 tests now pin:

1. **The dwell had to move to the FRONT of the decide.** My first fix ticked it in
   `withWingCadence`, which runs AFTER `seekWake` — and `seekWake`'s level decide clobbered the
   dwell before it was ever read. `B2AV`/`SHAV` are states the brain sits IN: while the countdown
   runs, `B2UNDR`/`SHADOW` are not re-entered at all. Ticking it first also gives the ROM's
   same-wake re-decide on expiry (`JMP B2UNDR`) instead of a one-wake lag.
2. **Two of my own round-2 assertions were wrong, and the code was right.** I asserted the expired
   dwell leaves `pjoy` undefined — it does not, because the same-wake re-decide immediately arms the
   level interval, which is faithful. And I asserted the expiry never presses the button, staged at
   `velY 0`, where the re-decided level law flaps ON ITS OWN (`B2LEV1`'s "FALLING?"). Re-staged
   rising, which isolates the dwell's contribution. Both were my staging lying, per the Reviewer's
   own sidecar rule.

### R1-3 — SHLETM was proven by test, and then made to MATTER

Adding the test the Reviewer prescribed made M7 fail as intended. But re-running M17 showed the
shadow's interval was armed from the right row, ticked correctly, and **gated nothing** — `shadow()`
re-decided its branch every wake, so SHUPTM/SHLETM were read and inert. That is the same shape round
1 rejected for SHCLTM, so I fixed it rather than documenting it: a running interval now holds the
level branch (`SHLEP1`/`SHLEV1`, :4286-4287/:4319-4320). M17 and a new M22 both catch it now.

Finding the discriminating fixture took two attempts and is worth recording: with the quarry above,
BOTH the climb branch and `SHLEP` flap, so the hold is invisible. Staging the shadow rising FASTER
than SHUPVY is the one geometry where they disagree — the climb refuses the flap, `SHLEP` takes it.
The first draft passed for that wrong reason.

### R1-5 — repaired as CLAIMS, not line numbers

The `audio-flap.test.ts` comment did not merely point at the wrong line; it asserted `flap` and
`flapHeld` are "ONE bit doing both jobs" and that the LATCH is what the ROM adds and the port lacks —
both of which this story changed. Its claim was rewritten with the correction stated, keeping the ROM
reading that is still true. All three citations are now **named references** (`BOUNDR_DOWN_BRAKE`,
`ROW_DISPOSITION.LAVGRA`, `stepEnemyDetailed`) rather than line numbers, so they cannot rot the next
time a file grows.

### Round-2 mutation battery: 9 mutations, 8 CAUGHT

Every round-1 survivor that was a real gap is now caught — M7 (SHLETM), M9 (hunter dwell reads
SHCLTM), M16 (dwell never armed), M17 (interval arms everywhere) — plus four aimed at the new law:
M19 (the dwell flaps), M20 (the dwell no longer pre-empts the decide), M21 (the dwell never counts
down), M22 (the interval no longer holds its branch).

**M4 survives and is a PROVEN equivalent mutant.** On the down route with the wings up, the code
re-tests the brake and never reads the timer, so the value stored there is unobservable. I did not
assert that — I tested it: aiming an *observable* variant (make the down route honour a wings-up
hold) **is** caught by R1-4's guard, which shows the guard is real and M4 unreachable. Recorded
rather than chased, per the jt5-5 equivalent-mutant rule.

**Handoff:** To The Argument Professional (Reviewer), round 2.

---

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

## Subagent Results

**All received: Yes** — same configuration as round 1 and accounted for the same way: 8 of 9
specialists are `false` in `workflow.reviewer_subagents`, none was dispatched, none is outstanding,
and the verification each would have performed was done inline. Round 2 adds an INDEPENDENT
five-mutation battery aimed where Dev's own battery was not, so this is not a re-read of their
homework.

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 1 | reviewer-preflight | Yes | run inline | 739 files / 11235 tests / 0 `tsc` errors / orchestrator 372-372 | N/A |
| 2-9 | the other eight | Yes | DISABLED | covered by the N1-N5 battery, the ROM re-derivation and the per-finding verification below | N/A |

### Verification of each round-1 finding — evidence, not assertion

| # | Finding | Verified how | Status |
|---|---|---|---|
| R1-1 | SHCLTM wiring indistinguishable from absent | Dev's M16 now CAUGHT; my N3/N4 (dwell leaks, dwell inverted) also caught | **CLOSED** |
| R1-2 | hunter dwell ran the wing cadence, not `B2AV` | ROM law re-read independently: `B2AV` :4190-4193 and `SHAV` :4406-4409 are both `CLRB / DEC PJOYT,U / BGT / JMP` — Dev's description is exact. M19/M20/M21 caught | **CLOSED** |
| R1-3 | SHLETM read by no test | M7 CAUGHT; my N2 (rows swapped on `hasTarget`) CAUGHT | **CLOSED** |
| R1-4 | down-seek wing-up law unguarded | Dev proved the guard bites by aiming an observable variant; I re-ran it | **CLOSED** |
| R1-5 | three citations broken, one false | `grep` for line-cites into the grown files returns only `difficulty.ts:38-52`, which I opened and confirmed still accurate (`:47-52` carries the retrofit ruling it cites, and nothing above line 290 changed). The false "ONE bit doing both jobs" claim is gone (count 0) | **CLOSED** |
| R1-6 | four type escapes | `grep -c "as SmartBrain\|pjoy!"` → 0 | **CLOSED** |
| R1-7 | hunter/shadow unreachable in test play | no action required; recorded | N/A |

### My own battery — 5 mutations Dev did not run, 4 caught, 1 REAL GAP found and closed

| # | Mutation | Result |
|---|---|---|
| N1 | **the SHADOW's dwell reads the hunter's frozen 8** | **SURVIVED → fixed in review** |
| N2 | the shadow interval rows swapped on `hasTarget` | CAUGHT (4) |
| N3 | the dwell never clears on expiry (leaks forever) | CAUGHT (3) |
| N4 | the dwell holds the wings DOWN (`CLRB` inverted) | CAUGHT (2) |
| N5 | the bounder/hunter interval no longer holds the route | CAUGHT (12) |

**N1 was a real gap and it is this story's own lesson unapplied.** Dev's hunter dwell test correctly
runs at **wave 3**, where SHCLTM has walked to 7 and the hardcoded 8 has not moved. Their SHADOW
dwell test ran at **wave 1**, where SHCLTM is 8 and `HUNTER_CLIFF_DWELL` is 8 — so wiring the
shadow's dwell to the frozen constant instead of the row was invisible. That is exactly the
"place the fixture where the pair disagrees" rule this story wrote into its own RED header for
BOUPWU/HUUPWU, applied on one side of the mirror and not the other.

**Fixed in review** rather than bounced: the change is one wave number in a test with no design
freedom, and the story's whole subject is row identity — waving it through would have shipped the
defect class the story exists to remove. The shadow dwell test now runs at wave 3 and asserts SHCLTM
is distinguishable from BOTH neighbours (the frozen 8 and SHUPTM's 9). **Re-verified by re-running
N1: it now CAUGHT (1 failed).** Recorded as a round-2 finding rather than silently amended.

### Scope audit of round 2

Dev made two changes beyond the literal findings. Both are justified and both are logged:
- **The discriminated union.** I marked it non-blocking and Dev did it anyway, correctly — the
  shared `{timer, wings:'up'}` shape WAS the bug, not a stylistic complaint.
- **Making the shadow's interval gate its branch.** This is the more interesting one: Dev went to
  write the test I prescribed for R1-3, found via M17 that the interval was armed, ticked and
  **inert**, and fixed that instead of documenting it. That is the same defect I rejected round 1 for
  SHCLTM, caught on the other side of the story by the person fixing it. Verified it is faithful:
  `SHLEP1`/`SHLEV1` do spend the countdown and only its expiry returns to `SHADOW`.
  No determinism re-baseline was needed, which independently corroborates R1-7's measurement that the
  shadow brain never appears in reachable play.

Diff scope is contained: `enemy.ts` only in `src/` (116 lines), plus the citation repairs, the test
additions and the contract. `difficulty.ts` is untouched in round 2 — the dispositions from round 1
still stand and `cadence-source` still passes.

### Devil's Advocate (round 2)

The thing I want to be wrong about is the shadow interval gating, because it is the one behavioural
change that arrived in a rework and did not move a single digest. Silence like that usually means
"unreachable", and unreachable is how uf1 stories fail. But the silence is explained and measured:
the shadow brain first spawns beyond wave 3 and no test's play reaches wave 4, which I measured
myself in round 1 across three seeds and 6000 frames. So the correct reading is "unexercised
end-to-end", not "inert" — the unit-level tests exercise it directly and N2/N5 prove they bite. It is
recorded as a Delivery Finding, which is the honest disposition; pretending it is proven in play
would be the overclaim.

Second worry: `withCliffDwell` still writes a dwell for the bounder if it were ever reached. It never
is — `steerWake` returns early for any brain that is not `b2undr`/`shadow` (:921-923), so the bounder
has no cliff look-ahead at all. That is a guard by construction rather than by test, and it is stated
in the function's own comment, so I am not filing it.

Third: the level interval now holds a route across a target CHANGE, including the target dying. A
bounder mid-interval whose quarry is removed keeps flying level until expiry rather than re-deciding.
That is faithful (`BOLEV1` re-runs SELPLY only at expiry) and bounded by BOLETM's 21 wakes, so it is
correct rather than a leak — but it is the kind of thing that reads as a bug in a later bisect, and
the code says why at the line.

No Critical or High remain. The two blocking round-1 findings are closed with mutation evidence, the
five non-blocking ones are closed or recorded, and the one gap I found in round 2 is fixed and
re-verified.

### Deviation Audit (round 2)

- **Dev: discriminated union instead of patching the dwell** → ✓ ACCEPTED — this was my own
  suggestion and the right call; the representation was the defect.
- **Dev: made the shadow interval gate its branch** → ✓ ACCEPTED — goes beyond the finding, and
  correctly: an armed-but-inert row is the exact thing round 1 rejected. Faithful to
  `SHLEP1`/`SHLEV1`, and the forward impact is stated.
- **Dev: declared `steerWake`/`DOWN_SEEK_WING_HOLD`/`HUNTER_CLIFF_DWELL` on the contract** → ✓
  ACCEPTED — `steerWake` had been undeclared since jt8-3; same one-directional drift TEA flagged.

### Reviewer (audit) — round 2

- **The shadow dwell test was staged on a non-discriminating wave.** Spec source: this story's own
  RED header rule ("WAVE 7, NOT WAVE 1, for anything that must prove WHICH row was read"). Found by
  mutation N1, fixed in review, re-verified. Severity: MEDIUM, now closed.

**Verification:** 739 files / 11235 tests / 1 todo, all passing. `tsc --noEmit` 0 errors.
`npm run test:orchestrator` 372/372. The sibling `sw8-18` failures noted in Dev's round-2 assessment
have since landed green, so the cabinet is clean end to end.

---

## Impact Summary

**Blocking: 0.** Two review rounds; round 1 REJECTED on one HIGH, round 2 APPROVED. Every round-1
finding is closed with mutation evidence, and the one gap found in round 2 was fixed in review and
re-verified. Nothing outstanding blocks this story.

**Shipped.** All eleven DYTBL cadence rows wired and inventoried:
- the UP-seek two-phase wing latch (BOUPWD/BOUPWU, HUUPWD/HUUPWU) with the ROM's **asymmetric
  entry** — the bounder flaps on the arm wake (`BRA BOUP1A` :3853), the hunter glides first
  (`BRA B2UP2D` :4037);
- the four level-flight decision intervals (BOLETM, HULETM, SHUPTM, SHLETM), which now **hold the
  route** until expiry rather than being armed and inert;
- SHCLTM as the `SHDICL`/`SHAV` **cliff dwell** it actually is — not the decision timer the backlog
  called it — with the hunter's identically-shaped dwell kept on its hardcoded 8;
- HUUPVY gated at timer expiry with the `INC PJOYT,U` re-arm (:4176); SHUPVY consulted every wake
  with no countdown. Not a matched pair, and now provably not.

**Four corrections to the story as filed**, each measured and pinned by an ORACLE test:
`smartDecision` no longer exists (uf1-8 split it); SHCLTM is not a decision timer (four rows carry
that ROM comment, not five — and the whole-file census found **six** sites, two of them hardcoded);
the promised wave-1 "free check" holds for **nine** of eleven rows, with SHLETM and SHUPTM diverging
and now excluded by name; and BOUPWD/HUUPWD govern the UP-seek hold only — the down-seek has its own
frozen 2 and no wing-up reload at all.

**Determinism was re-baselined deliberately, and bounded.** 21 sibling assertions moved. Every frame
pin was re-found by sweeping for its own precondition; two had to change SEED because the
precondition had an empty solution set on the old one. What did NOT move is the bound: `rng` is
bit-identical in every fingerprint and every PLAYER row in every entity digest is unchanged.

**Filed at finish** (nothing left as "out of scope" without an owner):
- **jt5-18** — level flight flaps every falling wake; the ROM forces a glide wake after each level
  flap (`BOFAST` → `BOLEV2` → `BOLEVA`, :3931-3938).
- **jt5-19** — the `B2UP3`/`SHUP3` climb-preparation states and the four PJOYT sites no DYTBL row
  covers.
- **jt8-16** — `PPVELX`: `homingWake` compares the live velocity index where the ROM snapshots it at
  the decide. jt8-2 deferred this to uf1-9 explicitly; uf1-9 built the precondition and this closes it.
- **jt5-8 RE-SCOPED** per the user's ruling — it no longer owns the PJOYT latch (uf1-9 built it) and
  now covers what genuinely remains: the DUMB brain's `LNTUP`/`LNTOFP` wingbeat and the player-side
  `flapHeld`. Its title was corrected too, since the old one advertised work that has shipped.

**Two prose defects fixed in place rather than filed**, both false universals that no test asserts:
`difficulty-wiring.test.ts`'s header claimed "Every DYWORD row's GA1 column 1 reproduces EXACTLY the
immediate" (false for two rows — this story's AC6), and `audio-flap.test.ts`'s comment claimed `flap`
and `flapHeld` are "ONE bit doing both jobs" with the latch still missing (this story split them and
added it). Three stale line-citations were repaired as **named references**, which cannot rot the
next time a file grows.

**Known and recorded, not defects:** the hunter and shadow-lord cadences are exercised only at unit
level — hunters first spawn at wave 4 and no test's play reaches it (measured across three seeds and
6000 frames). And `BOLETM`/`HULETM` are an equivalent mutant at the shipped GA1 of 5, covered
structurally by the disposition consumer strings rather than behaviourally.

**Verification at finish:** 739 test files / 11235 tests / 1 todo, all passing. `tsc --noEmit` 0
errors. `npm run test:orchestrator` 372/372.
