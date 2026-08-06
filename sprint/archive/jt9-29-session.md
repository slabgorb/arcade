---
story_id: "jt9-29"
jira_key: "jt9-29"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-29: The lava-troll looker in the three SMART brains — BOUNDR/B2UNDR/SHADOW, and why jt9-1's looker cannot fire without them

## Story Details
- **ID:** jt9-29
- **Jira Key:** jt9-29
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T13:47:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T12:58:23Z | 2026-08-06T13:00:40Z | 2m 17s |
| red | 2026-08-06T13:00:40Z | 2026-08-06T13:21:13Z | 20m 33s |
| green | 2026-08-06T13:21:13Z | 2026-08-06T13:39:07Z | 17m 54s |
| review | 2026-08-06T13:39:07Z | 2026-08-06T13:47:32Z | 8m 25s |
| finish | 2026-08-06T13:47:32Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): the story's "EXPECT A DETERMINISM RE-BASELINE HERE, unlike jt9-1" is likely false for the same reason jt9-1's turned out to be, and it was inherited by analogy. Measured at RED: adding the two test files moved **zero** seeded-replay pins (only the two new files + the README file-count guard reddened). The looker can only FIRE when a troll is behind, and jt9-1's Dev measured **zero troll-present frames across 3 seeds × 6000 frames** because `trollSpawnable` needs `wave ≥ 4 && bridgeBurned` and seeded play reaches wave 1–3. So Dev's GREEN, like jt9-1's, should move zero seeded fingerprints **provided `plavt` on smart-brain enemies stays out of every entity digest** (it did for LINET birds in jt9-1 — verify it still does when smart brains carry it). Affects `sprint/epic-jt9.yaml` (jt9-29's description). *Found by TEA during test design.*
- **Gap** (non-blocking): AC3's second RED (`SHUPST arms #SHUP1, so the NEXT wake climbs`) is a genuine STATE-CARRY addition, not a one-liner. The port's `shadow()` is stateless — it re-decides every wake and carries no up/down `SeekState` (only `dwell`/`interval` pjoy). SHUPST sets `PJOY = #SHUP1`, so a faithful port must carry an "armed climb" state across the wake boundary for the shadow, which the shadow currently has no representation for. Flagged so Dev sizes it as real work; if the port genuinely cannot express it within scope, log a Design Deviation rather than weakening the pin. Affects `plugins/joust/src/core/enemy.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the frame-boundary deviation the story asked to re-assess (`lastRanKind` re-inits per `stepFrame` vs the ROM's persistent `PPREV`, RAMDEF.SRC:240 / jt9-1 R-5) is STILL unobservable after this story. Wiring the looker into the three smart brains widens the set of processes that read `PPREV`, but `insertTroll` still guarantees an enemy follows the troll, so a troll is never a frame's last process while any enemy exists — the precondition that would make the carry-over observable never holds. AC5 stages processes directly and does not cross a frame boundary, so it does not exercise it either. Recommendation: keep jt9-1's R-5 deviation logged; do not model the carry-over on this story. Affects `plugins/joust/src/core/frame.ts:456-460`. *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 1 Conflict, 0 Question, 0 Improvement)
**Blocking:** None

- **Conflict:** the story's "EXPECT A DETERMINISM RE-BASELINE HERE, unlike jt9-1" is likely false for the same reason jt9-1's turned out to be, and it was inherited by analogy. Measured at RED: adding the two test files moved **zero** seeded-replay pins (only the two new files + the README file-count guard reddened). The looker can only FIRE when a troll is behind, and jt9-1's Dev measured **zero troll-present frames across 3 seeds × 6000 frames** because `trollSpawnable` needs `wave ≥ 4 && bridgeBurned` and seeded play reaches wave 1–3. So Dev's GREEN, like jt9-1's, should move zero seeded fingerprints **provided `plavt` on smart-brain enemies stays out of every entity digest** (it did for LINET birds in jt9-1 — verify it still does when smart brains carry it). Affects `sprint/epic-jt9.yaml`.

### Downstream Effects

- **`sprint`** — 1 finding

### Deviation Justifications

2 deviations

- **BODN1A/B2DN1A force the flap but do NOT arm the down-seek's BODN2 wing state**
  - Rationale: the observable this story pins for those two brains is the forced flap on the looker wake (AC1/AC2/AC5). TEA deliberately kept the next-wake BODN2 arming unpinned (representation-agnostic), and the minimalist rule is not to build behaviour no test constrains. The flap is what the mutation battery guards; arming BODN2 too would be unguarded scope.
  - Severity: minor
  - Forward impact: if a later story needs the bounder's post-looker descent to be BODN2-faithful, restore the arming and pin it. The shadow's climb (SHUP1) IS carried, because AC3 pins the deferred flap.
- **The looker ticks `plavt` on the ENTRY state's re-decide, not on an exhausting-episode wake**
  - Rationale: detecting "exhausts this wake" requires running `seekWake` first, which would move the looker below the seek advance and split its state across the pipeline. No test exercises an exhaustion wake's tick; gating on the entry `PJOY` address is the faithful reading of "which routine the scheduler dispatched to". At `LNTLAV`'s wave-scaled period (8→7) a one-wake-late tick is unobservable.
  - Severity: minor
  - Forward impact: none measured; note it if a future story pins the exact `plavt` phase across an episode boundary.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **BODN1A/B2DN1A force the flap but do NOT arm the down-seek's BODN2 wing state**
  - Spec source: `JOUSTRV4.SRC:3821` (BODN1A) / `:4006` (B2DN1A)
  - Spec text: `LDD #BODN2 / STD PJOY,U / LDA #2 / STA PJOYT,U / LDB #$01` — the branch target arms the next wake at BODN2 (`PJOYT=2`, wing-down) as well as flapping THIS wake.
  - Implementation: `smartBrainLooker` overrides only the decision (`flap: true`, `dir: facing`) for the bounder/hunter; it does not commit a `seek`/`wing` BODN2 episode.
  - Rationale: the observable this story pins for those two brains is the forced flap on the looker wake (AC1/AC2/AC5). TEA deliberately kept the next-wake BODN2 arming unpinned (representation-agnostic), and the minimalist rule is not to build behaviour no test constrains. The flap is what the mutation battery guards; arming BODN2 too would be unguarded scope.
  - Severity: minor
  - Forward impact: if a later story needs the bounder's post-looker descent to be BODN2-faithful, restore the arming and pin it. The shadow's climb (SHUP1) IS carried, because AC3 pins the deferred flap.

- **The looker ticks `plavt` on the ENTRY state's re-decide, not on an exhausting-episode wake**
  - Spec source: `JOUSTRV4.SRC:3816` `BPL BOBRAIN` → `:3842 BOBRAIN JMP BOUNDR`
  - Spec text: an episode that EXHAUSTS this wake re-decides on the same wake by jumping to the brain top — where `DEC PLAVT,U` would run.
  - Implementation: `smartBrainReDecides` reads the ENTRY `seek`/`pjoy`, so a wake that enters mid-episode and exhausts it does not tick `plavt` (it entered below the brain top).
  - Rationale: detecting "exhausts this wake" requires running `seekWake` first, which would move the looker below the seek advance and split its state across the pipeline. No test exercises an exhaustion wake's tick; gating on the entry `PJOY` address is the faithful reading of "which routine the scheduler dispatched to". At `LNTLAV`'s wave-scaled period (8→7) a one-wake-late tick is unobservable.
  - Severity: minor
  - Forward impact: none measured; note it if a future story pins the exact `plavt` phase across an episode boundary.

## Sm Assessment

**Routing to TEA for RED.** Scope is tight and already-measured: this story adds THREE call sites and their branch targets — the lava-troll looker wired into the three SMART brains — and nothing else. All four source blocks (LINET already ported by jt9-1, plus BOUNDR :3787-3794→BODN1A, B2UNDR :3971-3978→B2DN1A, SHADOW :4230-4237→SHUPST) are already pinned in `plugins/joust/tests/glide-prologue-source.test.ts`.

Do NOT rebuild what jt9-1 shipped: `EnemyState.plavt`, `lavaTrollLooker()` + its wave-scaled LNTLAV reload, the PPREV channel in `frame.ts` (`lastRanKind`), and `insertTroll()` in `demo.ts`. Read `sprint/context/context-story-jt9-29.md` and `sprint/archive/jt9-1-session.md` before writing tests.

Two things distinguish this from jt9-1 and are TEA's to design guards for:
- **A determinism re-baseline is EXPECTED here** — this makes a real behaviour reachable in play, so pinned frame/digest fixtures will move. That is not a regression; re-measure on the integrated tree.
- **Positive-control discipline (jt9-1's most expensive lesson):** put a POSITIVE CONTROL beside any "the count is zero" assertion, and when a phase threads a new argument from a producer into a pure consumer, mutate the PRODUCER (hard-wire the arg to its default) or the wiring goes unguarded no matter how clean the unit tests look.
- **Re-assess the frame-boundary deviation** jt9-1 logged: `lastRanKind` re-inits per `stepFrame` while the ROM's PPREV persists across frames (RAMDEF.SRC:240) — currently unobservable, but widening PPREV readers is exactly what could expose it.

No implementation files read by SM; handoff is context-only.
## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/smart-brain-looker-source.test.ts` — NEW, ORACLE (5 green on arrival). Re-derives the three branch-target BODIES from the vendored 1982 source: BODN1A (:3821) / B2DN1A (:4006) both raise the flap bit (`LDB #$01`) into the down-seek; SHUPST (:4264) clears it (`CLRB`, wings up) and arms the climb `#SHUP1`. Companion to jt9-1's `glide-prologue-source.test.ts`, which already pins the shared eight-instruction shape.
- `plugins/joust/tests/smart-brain-looker.test.ts` — NEW, BEHAVIOUR (12 RED / 6 green controls).
- `plugins/joust/README.md` — derived suite-file count 138 → 140 (two files added); indicative test tally refreshed to ~2915.

**Tests Written:** 23 across 5 ACs (12 failing, 11 green oracles + controls).
**Status:** RED — `npx vitest run --project joust` → **12 failed | 2903 passed (2915), 140 files**; only `smart-brain-looker.test.ts` is red. `npm run lint` (`tsc --noEmit`) → clean. Zero seeded-replay pins moved (no production code touched).

### What each AC pins, and why it is RED now

- **AC1 BOUNDR / AC2 B2UNDR** — the looker forcing the down-seek flap (`BEQ BODN1A` / `B2DN1A`). Each fixture is a smart bird whose seek DECLINES to flap (an honest-fixture control asserts `boundr()/b2undr().flap === false`), rising and level with its target. RED: with `plavt` due + `lavaBehind`, the wake flaps (`wingEdge === 'down'`) and `plavt` reloads from the wave-scaled LNTLAV row (`waveValue('LAVLAV', wave)` = 8/7/7 at waves 1/3/6). A no-troll CONTROL proves the reload is NOT troll-gated (`STA PLAVT,U` sits above `CMPA #LAVID`) — the looker ran but the seek governs. Currently all RED because smart brains ignore `plavt` entirely (verified: it stays untouched).
- **AC3 SHADOW** — `BEQ SHUPST` is the up-seek START, NOT a shared flap. RED: the looker RAN (period reloaded) yet does NOT flap this wake (`CLRB`); and it arms `#SHUP1`, so the NEXT wake climbs (a deferred flap) where the no-troll baseline never climbs. A **CONTRAST** test fires the looker in BOTH BOUNDR and SHADOW under the same condition and asserts BOUNDR flaps while SHADOW does not — this is the guard against the obvious wrong port (copying LINET's force-flap into all three brains).
- **AC4 (R-1 generalised)** — the looker sits at the brain ENTRY. A committed-seek EPISODE wake (BODN2) resumes below it, so it must NOT tick `plavt`. Pinned as a PAIR: the episode-wake control (green on arrival, RED only under a naive "tick every brain wake" impl) beside a POSITIVE CONTROL that a re-decide wake DOES tick it (RED now → green when `DEC PLAVT,U` is wired).
- **AC5 (R-3)** — the PRODUCER. Every AC1–AC3 test injects `lavaBehind` into `stepEnemyDetailed`; hard-wiring it to a constant passed every unit test in jt9-1. This drives the REAL scheduler (`stepGame`) and stages a troll BEFORE vs AFTER a promoted boundr, asserting the two orderings produce DIFFERENT enemy state (representation-agnostic) with a floor control that "troll AFTER ≡ no troll". Currently RED — the two orderings are byte-identical because the smart-brain path never consults `lavaBehind`.

### The three mutants this RED is built to kill (for the Reviewer's battery)

| intended mutant | test that kills it |
|---|---|
| copy LINET/BOUNDR's force-flap into SHADOW too | AC3 CONTRAST — SHADOW must NOT flap on the looker wake |
| tick `plavt` on every brain wake (ignore the episode-skip) | AC4 episode-wake control — a committed seek must not tick it |
| hard-wire `lavaBehind` to a constant (sever the producer) | AC5 real-scheduler differ — before ≠ after by POSITION |

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source assertions match a TOKEN, mutation-tested | source oracle re-derives the three branch-target bodies with instruction-exact spans; each behaviour guard has a mutant named above | green (oracle) / RED (behaviour) |
| #15 universally-quantified spans pin their length | every `insnsIn`/`bodyFrom` span asserts its exact instruction list, no floorless map | green |
| #18 the apparatus can distinguish a broken impl | honest-fixture controls (`boundr/b2undr/shadow().flap === false`); the no-troll reload controls; the AC5 "troll after ≡ no troll" floor | green (controls) |
| #14 derived EDGES computed inside one branch | AC3's deferred flap — a SHUPST that flapped the wake it fired would pass a naive check and fail the CONTRAST | RED |
| #4 null/undefined handling | `plavt` read as `number \| undefined`; assertions pin the VALUE (reloaded to 8, ticked to 4), never truthiness | RED |
| #1 type-safety escapes | no `as any`/`as unknown as`/non-null in production; the one `as never` is on the ctx literal for `lavaBehind` (already a ctx field) — `tsc --noEmit` clean | green |

**Rules checked:** 6 of the applicable lang-review rules have direct coverage; #6 (React), #9 (build config), #12 (bundle), #16 (a11y) do not apply to a pure-core simulation change.
**Self-check:** every RED assertion re-run to confirm it fails on the intended VALUE (flap `null` vs `'down'`; plavt `1`/`5`/`3` vs `8`/`4`/`2`; before deep-equals after), not on a TypeError or a mis-built fixture. The `_calib.test.ts` probe used to find honest fixtures was deleted (`git status` clean of it).

**Handoff:** To Dev (Bicycle Repair Man) for GREEN. Read `sprint/context/context-story-jt9-29.md` and `sprint/archive/jt9-1-session.md`. Scope: wire the looker into the three smart-brain call sites with their DISTINCT branch targets (two flap into the down-seek, one arms the wings-up climb) — see the three Delivery Findings above, especially the SHADOW state-carry and the (likely absent) determinism re-baseline.
## Dev Assessment

**Status:** GREEN — `npx vitest run --project joust` → **2915/2915 (140 files)**; `npm run lint` (`tsc --noEmit`) → clean; `npm run test:orchestrator` → see caveat below; `git status --short` → empty (all changes committed).

### What landed

| AC | Where | What |
|---|---|---|
| — | `enemy.ts` PjoyState + `enemy-contract.ts` | new `climb` variant — the shadow's armed SHUP1 (a one-wake pointer, like `glide`/`lava`); contract kept in sync per jt9-1's R-6 rule |
| 4 | `enemy.ts` `smartBrainReDecides()` | the looker's `DEC PLAVT,U` runs only at the brain ENTRY — an episode wake (committed `seek`, or a running `interval`/`wing`/`dwell`/`lava`/`climb`) resumes below it and does not tick |
| 1,2 | `enemy.ts` `smartBrainLooker()` | BODN1A/B2DN1A → force the down-seek flap this wake (`flap: true`, `dir: facing`); wave-scaled LNTLAV reload above the troll test |
| 3 | `enemy.ts` `smartBrainLooker()` + `shadow()` + `shadowDwellWake()` + the `phased` clear | SHUPST → wings-up this wake, arm `climb`; `shadow()` reads `climb` → SHUP1 flap (`velY >= SHUPVY`); cleared once consumed |
| 5 | (wiring only) | `stepEnemyDetailed` threads `reDecides` + `lavaBehind` into the looker; the producer (`frame.ts lastRanKind`) was already correct from jt9-1 |

### AC4 — the determinism re-baseline did NOT fire, confirming TEA's finding

Zero seeded-replay pins moved: the full joust suite is **2915/2915** with only the two new files changing from RED to GREEN. The story budgeted for a re-baseline "unlike jt9-1"; measured, it is exactly like jt9-1 — trolls need `wave ≥ 4 && bridgeBurned` and seeded replays reach wave 1–3, so the looker never fires in any fingerprint fixture, and `plavt` on smart enemies rides serialised state that no digest reads (verified: the fleet is green). This corrects jt9-29's description; a follow-up should drop the "EXPECT A DETERMINISM RE-BASELINE" caution the same way jt9-1's Dev corrected its inherited warning.

### Mutation self-check (the two subtle guards, proven to bite)

Each mutant applied to a backed-up copy, restored by copy, full joust suite re-run.

| mutant | result |
|---|---|
| `smartBrainReDecides` always true (ignore the episode-skip) | **AC4 episode control reddens** — the R-1 generalisation bites |
| the shadow looker copies BOUNDR's `flap: true` (ignore SHUPST's CLRB) | **AC3 CONTRAST + deferred-climb redden** — "not a shared flap" bites |

The BODN1A/B2DN1A flap and the AC5 producer differential were already proven necessary by the RED phase (all 12 failed without the wiring). Two conscious fidelity gaps are logged as Design Deviations (BODN2 not armed for the down-seek brains; the exhaustion-wake tick).

### Baseline caveat — `main` is RED outside joust, and none of it is this story's

Attributed by measurement, not assertion: with my two production files STASHED, the full fleet still fails **10 tests across 5 files** — `missile-command/{cursor,explosion,field}.test.ts` (the sibling's mc1/mc2 in-progress epic, materialized on `main` today) and `star-wars/tests/audit/{citations,citation-gate-freeze}.test.ts` (the audit-blob reader failing locally — `fatal: path 'src/core/sim.ts' does not exist in <commit>`, the known shallow-history / `fetch-depth: 0` citation-gate issue, environmental). `npm run test:orchestrator` errors on the same star-wars audit-blob read. **Zero failures are attributable to jt9-29** — joust is 2915/2915 and the change touches only `plugins/joust/`. Do not debug these; they belong to missile-command's owner and the star-wars audit gate respectively.

**Handoff:** To Reviewer (The Thought Police).
## Reviewer Assessment

**Verdict:** REJECTED (round 1)

Instrument: a mutation battery (8 of 9 reviewer subagents are disabled here; only `preflight` runs). Each mutant applied to a backed-up copy, restored by copy.

### The battery — one mutant SURVIVED, and it is a real bug not just a coverage gap

| # | mutant | result |
|---|---|---|
| M1 | smart looker's reload → keep pre-expiry value | **killed** (AC1/AC2/AC3 reload; note: guard the SMART site — the first `waveValue('LAVLAV')` in the file is LINET's) |
| M2 | smart reload hardcoded 16 | **killed** — AC1 wave-scaled |
| M3 | remove the `phased` climb-clear | **SURVIVED — 23 pass** → see R-1 |
| M4 | shadow climb flap inverted (`velY < SHUPVY`) | **killed** — AC3 deferred climb |
| M5 | bounder/hunter looker `flap: false` | **killed** — AC1/AC2/AC5 |
| M6 | `smartBrainReDecides` ignores the seek/episode check | **killed** — AC4 episode control |
| M7 | shadow looker copies BOUNDR's `flap: true` | **killed** — AC3 CONTRAST + deferred climb |

### Findings

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] `[CORRECTNESS]` | **R-1** — the shadow's armed `climb` is cleared only when the consume wake FLAPS (`settled.pjoy?.kind === 'climb' && decision.flap` in `phased`). But the ROM's `SHUP1` re-points `PJOY→SHADOW` UNCONDITIONALLY as its first two instructions (`LDD #SHADOW / STD PJOY,U`, :4269-4270), BEFORE the `CMPD SHUPVY` flap test. A shadow already climbing faster than `SHUPVY` coasts on the consume wake (`SHUP0`, no flap), so `climb` is never cleared: **measured on current code, `pjoy:'climb'` persists across 4+ wakes and the shadow is stuck in climb-evaluation forever** — it stops re-deciding, never re-runs the SHDNRG/SHUPRG range gates, and stops tracking the player. M3 proves it is unguarded; AC3 only pins the flap on the consume wake (w1), never the re-decide on w2, and its falling-shadow fixture always flaps the consume so the bug is invisible to it. | `enemy.ts` `stepEnemyDetailed` (the `phased` climb branch) | Clear `climb` on the CONSUME wake (entry `pjoy` was `climb`) regardless of `flap`, and add a test with a FAST-climbing shadow (velY < SHUPVY) pinning that it re-decides — `pjoy` cleared — after one climb wake |

One MEDIUM correctness bug in a fidelity story → **REJECT**. Filing "the clear is untested" as a follow-up would be the exact pattern this epic exists to correct; it is one line of fix and one test.

### Compliance (verified)

- **Core/shell boundary — COMPLIANT.** All production changes are `src/core/enemy.ts`; no `Date`/`Math.random`/DOM/`../shell`. `smartBrainLooker`/`smartBrainReDecides` read only their args and return fresh objects. `purity.test.ts` green in the full run.
- **Determinism — COMPLIANT.** `plavt`/`climb` ride serialised `EnemyState`; no module-level mutable, no identity-keyed Map/Set. Full joust suite 2915/2915 with zero fingerprint movement.
- **ROM-citation accuracy — COMPLIANT.** BODN1A :3821, B2DN1A :4006, SHUPST :4264, SHUP1 :4269-4275 re-opened against the vendored source; the source oracle re-derives all three target bodies. R-1 is itself a citation catch (:4269-4270 unconditional re-point).
- **Exhaustive union handling — COMPLIANT.** `climb` added to both `PjoyState` and the `enemy-contract.ts` mirror (jt9-1's R-6 rule); `tsc --noEmit` clean.

**Handoff:** Back to Dev — REJECTED, one finding (R-1) to close.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

R-1 closed and re-verified by the mutant that found it. The test of a fix for a missing/mis-conditioned guard is not that the suite is green (it was) but that the mutant now DIES.

| # | mutant | round 1 | round 2 |
|---|---|---|---|
| M3 | remove the `climb` clear | **survived** (23 pass) | **1 fail — killed** by the new fast-climber re-decide guard |

### What the fix changed, judged rather than accepted

- **R-1 — properly closed.** The clear now fires on the CONSUME wake (`homed.pjoy?.kind === 'climb'` — the entry `PJOY` address), not gated on `decision.flap`, matching `SHUP1`'s unconditional `LDD #SHADOW / STD PJOY,U` (:4269-4270). Measured on the fixed code: a fast climber (velY = -0x400 < SHUPVY) coasts the consume wake and STILL clears — `pjoy` is `undefined` on w1, and w2 is back in the brain. The arm wake is untouched (entry `PJOY` was not yet `climb`), so the climb still survives exactly one wake. `[VERIFIED]`
- The remaining battery (M4 inverted flap, M5 bounder no-flap, M6 episode-skip, M7 shadow-flap-copy) all still die; the fix touches only the clear.

### Residual, accepted

- **BODN1A/B2DN1A do not arm the down-seek's BODN2 state** (Dev deviation 1). Accepted: the observable this story pins is the forced flap; the next-wake BODN2 arming is unpinned scope and the flap IS mutation-guarded (M5). A follow-up owns it if the bounder's post-looker descent ever needs to be BODN2-faithful.
- **The looker ticks on the entry-state re-decide, not on an exhausting-episode wake** (Dev deviation 2). Accepted: unobservable at LNTLAV's 8→7 period; no test exercises an exhaustion tick.
- **`main` is RED outside joust** (missile-command mc1/mc2 in-progress, star-wars audit-blob/shallow-history) — attributed to other owners by stash-measurement, none of it jt9-29's. Not this story's to fix.

### Gates

`npx vitest run --project joust` → **2916/2916 (140 files)**. `npm run lint` → clean. Zero seeded-pin movement. `git status --short` → empty.

**Handoff:** To SM (The Announcer) for the finish ceremony.

## Subagent Results

Eight of the nine specialists are disabled in this repo (`pf settings get workflow.reviewer_subagents` — only `preflight` is `true`). Their domains were assessed by the Reviewer directly; the primary instrument was a mutation battery, since re-reading just-written code finds nothing.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — gates re-run independently (joust 2916/2916, lint 0) |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Assessed by Reviewer — the climb lifecycle boundaries are mutants M3/M4; R-1 is exactly an edge (the fast-climber coast) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Assessed by Reviewer — no try/catch, no fallback, no swallowed path; the two new helpers are total over their inputs |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Assessed by Reviewer via mutation — produced R-1 (M3 survived until the fast-climber guard was added) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | All new ROM citations (:3821/:4006/:4264/:4269-4270) re-opened against the vendored source |
| 6 | reviewer-type-design | Yes | Skipped | disabled | `climb` added to PjoyState AND the contract mirror (R-6 rule); no new cast, no stringly-typed API; tsc clean |
| 7 | reviewer-security | Yes | Skipped | disabled | Assessed by Reviewer — pure offline simulation, no I/O/network/auth/user input |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Assessed by Reviewer — `smartBrainLooker`/`smartBrainReDecides` are single-purpose; no redundancy |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | The lang-review rules were checked by hand — see Rule Compliance in round 1 |

**All received:** Yes (1 enabled specialist returned, 8 pre-filled as disabled)
**Total findings:** 1 confirmed (R-1, closed in round 2), 0 deferred