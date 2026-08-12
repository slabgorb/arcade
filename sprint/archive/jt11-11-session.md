---
story_id: "jt11-11"
jira_key: "jt11-11"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-11: Enemy facing for ground velXIndex

## Story Details
- **ID:** jt11-11
- **Jira Key:** jt11-11
- **Epic:** jt11
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T19:31:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T18:45:23Z | 2026-08-12T18:48:06Z | 2m 43s |
| red | 2026-08-12T18:48:06Z | 2026-08-12T19:02:37Z | 14m 31s |
| green | 2026-08-12T19:02:37Z | 2026-08-12T19:18:57Z | 16m 20s |
| review | 2026-08-12T19:18:57Z | 2026-08-12T19:31:55Z | 12m 58s |
| finish | 2026-08-12T19:31:55Z | - | - |

## Sm Assessment

**Story:** jt11-11 — thread the enemy's own `facing` into its `stepGround` call so a
grounded enemy's `velXIndex` is signed by `PFACE`, not always positive.

**Setup verification (all clean before claiming):**
- No remote branch matched `jt11-11` (`git branch -r`) — the story was genuinely free,
  not merely marked `backlog`.
- No open PRs fleet-wide → the merge gate is satisfied.
- Tree clean on `develop`; branch `feat/jt11-11-enemy-facing-ground-velxindex` cut from it.

**Routing:** `tdd` (phased) → TEA for RED. 2pt, but this is behavioral core-sim work with a
ROM ground-truth obligation, so `trivial` would be wrong even at the point count.

**Context:** `pf context create` emitted a stub (no description/AC in the sprint YAML).
I did context discovery and rewrote `sprint/context/context-story-jt11-11.md` with the
problem, the exact seam, ACs and scope. TEA inherits a located story, not a title.

**The seam, located:** `plugins/joust/src/core/enemy.ts:1319` calls `stepGround(s, input)` —
the 2-arg form. `stepGround` (`flight.ts:349`) takes an optional `facing: -1 | 1`; without it
every non-zero `dir` reads as `onPlus`, so `velXIndex` is always `+flyVel` and the skid chain
is unreachable for enemies. The value to thread is `EnemyState.facing` (`enemy.ts:177`,
`PFACE`), which must come down from the call site at `enemy.ts:1670` because `stepEntity`
receives a bare `EntityState` that has no facing field.

**Three things I am flagging to TEA rather than deciding:**
1. **`flight.ts` is generated — no hand-edit.** The fix belongs in `enemy.ts`. `stepGround`
   already accepts `facing`; nothing there needs to change.
2. **Verify the ROM, don't reason by analogy.** The story says the enemy ground loop signs
   `PVELX` by `PFACE` "like UPDNO2". That is a *claim to check* against `JOUSTRV4.SRC`, and
   the citation must be to the **enemy** loop. If the ROM disagrees, the premise changes and
   that is a blocking Delivery Finding before code moves.
3. **A stale comment is part of the deliverable.** `ground-momentum.test.ts:194-195` says the
   facing-less enemy sign is "NOT pinned … pending this story". Shipping the fix without
   replacing that comment leaves the suite claiming coverage it defers.

**Known trap carried forward from jt11-3:** `flyVel * facing` leaks an `Object.is`-visible
`-0` into standing left-facing frames and serialized replay fixtures — see the note at
`ground-momentum.test.ts:176-177`. AC-5 pins it.

**Judgment checks:**
- [x] Story claimed (no Jira in this repo — `jira_key` is the story id)
- [x] Story context written with technical approach and ACs
- [x] Branch created from `develop`, session file present

**Handoff:** Han Solo (TEA) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — behavioral change to the pure core sim.

**Test Files:**
- `plugins/joust/tests/enemy-ground-facing-jt11-11.test.ts` — NEW. 14 tests: 1 ROM transcription
  pin, 4 apparatus premises, 4 AC-1 (sign), 3 AC-2 (takeoff direction), 2 AC-3 (routing).
- `plugins/joust/tests/ground-momentum.test.ts` — EDITED. Retired the stale deferral comment
  (AC-6). It claimed "the enemy caller threads no facing", which this story makes false.
- `plugins/joust/README.md` — the derived suite file count 177 → 178 (`audio-seam-scope`
  guards it).

**Tests Written:** 14 covering 6 of 7 ACs
**Status:** RED — 5 failing, all clean assertion failures, no errors. `npm run lint` green.

### The ROM check — the story's premise, measured

The story said to "verify against the ROM enemy ground loop, which signs PVELX by PFACE like
UPDNO2" (AC-4). Verified, and the truth is stronger than the story states: **there is no separate
enemy ground loop.** The enemy process is created at `CREEM` (JOUSTRV4.SRC:5663) and, once its
transporter materialisation completes, ends `BSR PLYINT` / `LDD CURJOY` / `BRA PLYRS2`
(:5904-5906) — and `PLYRS2` (:5952) sits inside the loop the source itself labels "MAIN
RUNNING/STANDING/SKIDDING LOOP" (:5946-5948). The enemy executes **UPDNO2 itself**, at the same
addresses, with `U` pointing at its own workspace. So `LDA 6,X / STA PVELX,U` (:6000-6001) and
`LDA PFACE,U / BPL PL2RIT / NEG PVELX,U` (:6006-6008) are not an analogy for the enemy — they
are its code.

Two corroborations that the sharing is deliberate: the joystick is read through an indirection,
`JSR [PJOY,U]` (:5951) — the real stick for a player, the AI decision block for an enemy, which
is exactly the `input` this port hands `stepEntity`; and the author's own branch comments inside
that loop read "BR=PLAYER/ENEMY WANTS TO MOVE / …TO FLAP" (:5836,:5841). PFACE is genuinely live
for enemies (BODIR :3876, B2DIR :4122/:4141, SHDIRA :4353/:4372/:4381), so the defect bites in
play, not only in theory.

**Consequence for Dev:** there is exactly ONE rule, and the enemy must obey it identically to the
player. No enemy-specific sign law to discover.

### What the failing tests say

| Failing test | Says |
|---|---|
| AC-1 THE BUG | left-facing grounded enemy parks `+4`; must be `-4` |
| AC-1 wrapper | the same through `stepEnemy`, not just `stepEnemyDetailed` |
| AC-1 sweep | across all 13 ground states × both facings, `sign(velXIndex)` must be PFACE's |
| AC-2 THE FELT BUG | a left-facing buzzard that flaps launches at `+4` — rightward |
| AC-2 carry | and consequently does not move left on the next wake (`97` → `97`) |

The 9 already-green tests in the file are the transcription pin, the four apparatus premises, the
right-facing controls, and the AC-3 routing pins — they exist so a green run cannot be a vacuous
one.

### Rule Coverage

| lang-review rule | Test(s) | Status |
|---|---|---|
| #8 test quality — meaningful assertions | every test asserts a value; no `let _ =`, no bare `is-defined` | passing |
| #18 apparatus fails by PASSING — fixture whose value IS the expectation | the transcription pin (`PLYCR.onPlus`/`PLYDR.flyVel` hand-read) + literal `-4`/`+4` expectations rather than table-derived-only | passing |
| #18 apparatus — premise silently vacuous | 4 explicit premise tests: the island really is a platform; the shadow really stays grounded; the flapper really takes off; the look-ahead does not turn the fixture | passing |
| #21 degenerate numeric input | `Object.is(v, -0)` asserted on every state × facing (AC-5) | passing |
| #14 derived edge in one branch | the sign is checked on ALL 13 rows × both facings, not one happy row | 1 failing (the point) |
| #17 comments asserting a mechanism nobody re-ran | the ROM chain above was re-read in the vendored source this phase, not carried over; and the stale ground-momentum deferral comment is retired (AC-6) | passing |
| #4 null/undefined handling | the 2-arg (`facing === undefined`) branch keeps its own coverage in ground-momentum.test.ts | passing |

**Rules checked:** 7 applicable TypeScript checklist rules have test coverage.
**Self-check:** no vacuous tests. One authoring error found and fixed before commit (a garbled
`after.enemy_facing_unchanged ?? after.facing` in the sweep). Two collateral guards I had
tripped — `comment-line-refs` (jt9-30 stale line refs in my own comments) and `audio-seam-scope`
(the derived file count) — were fixed and re-verified green rather than left for Dev.

### AC status handed to Dev

- **AC-1** sign follows facing — RED, 3 tests
- **AC-2** takeoff inherits direction — RED, 3 tests (1 control green)
- **AC-3** routing — re-aimed, see Design Deviations; GREEN pins in place
- **AC-4** ROM citation — DONE this phase (above, and in the test file header)
- **AC-5** no `-0` — GREEN pin in the sweep, will stay green only if Dev avoids `flyVel * facing`
- **AC-6** stale deferral retired — DONE this phase
- **AC-7** green fleet — `npm run lint` green; joust is the only project touched

**The change Dev needs:** thread `phased.facing` from `stepEnemyDetailed`'s `stepEntity(...)` call
into `stepEntity`, and on to its `stepGround` call. Post-brain facing is the correct value — it
matches the ROM's read order, where PFACE is read at UPDNO2 *after* `JSR [PJOY,U]`.
`src/core/flight.ts` is GENERATED and needs no change; `stepGround` already accepts `facing`.

**Handoff:** To Yoda (Dev) for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — the fix. Three lines of code: a `facing: -1 | 1`
  parameter on `stepEntity`, passing it to `stepGround`, and passing `phased.facing` at the
  single call site in `stepEnemyDetailed`.
- `plugins/joust/tests/audio-events.test.ts` — re-baselined (3 frame anchors + 1 fingerprint)
- `plugins/joust/tests/audio-thud.test.ts` — re-baselined (1 frame anchor)
- `plugins/joust/tests/audio-transporter-split.test.ts` — re-baselined (2 frame anchors)
- `plugins/joust/tests/dumb-wingbeat.test.ts` — re-baselined (2 seeds' censuses)
- `sprint/context/context-story-jt11-11.md` — `**Repo:**` corrected to the registered id

**Tests:** joust 3502/3502 (GREEN) · orchestrator 478/478 · `npm run lint` clean
**Branch:** `feat/jt11-11-enemy-facing-ground-velxindex` (pushed)

### The implementation

TEA's ROM reading made this unambiguous — there is one ground loop, shared, so the enemy owes
the identical `NEG PVELX` the player does. The change is the smallest one that delivers it.

Two decisions worth stating:

1. **`facing` is REQUIRED on `stepEntity`, not optional with a default.** An optional parameter
   with a silent fallback is precisely the defect this story fixes one level up; reintroducing
   the same shape one level down would leave the next caller free to make the same mistake
   invisibly. There is exactly one call site, so nothing is paid for it. (The equivalent change
   on `stepGround` itself is NOT made here — that is generated-file territory; TEA filed it.)
2. **The threaded value is `phased.facing`, the POST-brain facing.** This matches the ROM's read
   order: `JSR [PJOY,U]` (:5951) runs the decision block, and PFACE is only read afterwards at
   UPDNO2 (:6006). So a wake on which BODIR / B2DIR / SHDIRA re-aimed the bird signs THAT wake's
   PVELX with the new facing. Using the pre-brain facing would have been a frame late.

### The fixture blast radius — the honest part

The first green run traded 5 failures for 10, in four files I did not touch: `audio-events`,
`audio-thud`, `audio-transporter-split`, `dumb-wingbeat`. All are seeded whole-sim replays that
pin measured frame numbers. Changing which way half the buzzards launch necessarily moves them.

I did **not** treat that as licence to nudge numbers until green. Three things governed it:

- **The law each file pins was checked first, separately from the fingerprint.** `audio-events`
  AC3's actual claim is that `rng` stays `2_006_456_271` — that the sim draws the *same numbers*.
  It does: `rng` and `wave` are both unmoved. Only play-dependent fields moved. Had `rng` moved,
  this would have been a bug in my change, not a stale fixture, and I would have stopped.
- **Every new number was re-measured by that test's own documented precondition**, with a
  throwaway scan harness that mirrored each file's own seating/script — never by reading the
  failure message and pasting the received value. The scan found, for seed `0xface`: deaths at
  604/957/2103/3089, re-entries at 605/958/2104/3090, and the wave advance at 5041 with the four
  buzzards served at 5102/5163/5224/5285.
- **Documented constraints were honoured, not discovered by trial.** The `audio-events` death /
  re-entry pair had to stay a knight-**TWO** re-entry because the sibling `audio-transporter-split`
  test pins SNPCR2 against that exact frame — which is why 957/958 was chosen over the earlier
  604/605. And the thud test's method comment says to DEEPEN the window before widening the seed
  range: I re-swept `[0x1000,0x1120)` over 4000 frames by its own precondition (exactly one
  `player-thud`, silent frame before), found 27 qualifying seeds, and the existing seed `0x1035`
  is still the lowest at the earliest frame — so the seed did not move, only 723 → 505.

Two things I want the Reviewer to look at rather than take on trust:

- **The wave-advance sweep window had to grow 6000 → 9000 frames.** Seed `0xface` now clears
  wave 1 much later (5041, was 2866). The `jt9-8` note in that test warns that a too-small window
  reads as "no frame satisfies this", and that is exactly what a 3200-frame scan showed me first.
  I widened rather than changed seed. The game genuinely got harder, which is the expected
  direction: enemies that launch the way they were walking press the knights.
- **`dumb-wingbeat`'s KNIGHT cue counts moved, breaking that table's standing pattern.** Every
  prior re-baseline there could say "every scripted knight cue (154) is UNMOVED — the change is
  enemy-only". This one cannot: `0xbeef` playerDown 154→153 and playerUp 153→151. That is not
  contamination — it is the coupling the `jt9-9` note already names (knight cues move when
  knight-death timing shifts), and enemy trajectory changes do shift knight deaths. I wrote it
  into the comment explicitly rather than letting the old "unmoved" sentence stand next to
  changed numbers.

I also re-verified the thud staging is still enemy-vs-PLAYER from the process positions rather
than assuming it survived the move: entering frame 505, `enemy#257` is at (212,128) and the idle
`player#2` at (200,128) — same row — and the bounce pushes the buzzard DOWN to y=130 and the
knight UP to y=126, the same shape every prior staging carried.

**Self-review:**
- [x] Wired to the production path — the fix is on `stepEnemyDetailed`, which `stepEnemy` and
      `sim.ts` both go through; TEA's wrapper test pins that both seams get it
- [x] Follows project patterns — ROM citation on the change, re-baselines documented in the
      house style each file already uses
- [x] All ACs met (AC-1, AC-2, AC-5, AC-7 by test; AC-3 per TEA's re-aim; AC-4/AC-6 in RED)
- [x] No debug code; the temporary measurement scaffold is deleted and its absence verified by
      absolute path (a first `rm` silently no-opped against a stale working directory)

**Handoff:** To Obi-Wan Kenobi (Reviewer).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): `src/core/flight.ts` says "GENERATED by tools/transcribe-flight.mjs —
  DO NOT HAND-EDIT", but the generator's `stepGround` template has DRIFTED from the file it
  generates. The template still emits the pre-jt2-9 two-argument signature with no `facing`
  parameter, no `velXIndex` write, and a comment asserting "onMinus is unreachable here".
  Re-running the generator would therefore silently REVERT both jt2-9 (facing-relative
  transitions) and jt11-3 (the UPDNO2 momentum write) — and this story on top of them.
  Affects `tools/transcribe-flight.mjs` (its `stepGround` template must be brought up to the
  shipped `flight.ts`, or `flight.ts` must stop advertising itself as regenerable).
  Latent, not active: no test, npm script or CI step runs the generator today, which is the
  only reason this has not already bitten. Out of scope for a 2pt enemy.ts change.
  *Found by TEA during test design.*
- **Question** (non-blocking): the story's AC set (and the epic's framing) assumes threading
  `facing` re-opens the `onMinus` skid chain for enemies. Measured: it does not. EVERY brain in
  `src/core/enemy.ts` aims its `dir` at its own facing, and the shadow's `shdira` bump-aim is
  mirrored back onto `facing` by `stepEnemyDetailed`, so `dir === facing` (or `0`) always — which
  routes to `onPlus`/`onZero` under BOTH the faced and the legacy branch. The fix is therefore
  SIGN-ONLY, and enemy skids remain unreachable from brain input. Affects
  `plugins/joust/src/core/enemy.ts` (nothing to change; the point is that Dev must not go
  looking for a routing change that is not there, and Reviewer must not read its absence as an
  incomplete fix). Pinned as an executable observation test so it reddens if a future brain ever
  aims away from its facing. *Found by TEA during test design.*
- **Improvement** (non-blocking): after this story, `stepGround`'s optional `facing` parameter has
  ZERO remaining facing-less production callers — `frame.ts`'s `stepPlayerEntity` and
  `enemy.ts`'s `stepEntity` both pass it. The parameter could become required, which would make
  this class of defect a compile error rather than a silent wrong sign. Affects
  `src/core/flight.ts` (signature) and `tools/transcribe-flight.mjs` (the generator template —
  see the Gap above; they must move together). Deliberately NOT done here: it is a
  generated-file change, outside a 2pt story, and it is only safe once the generator drift is
  resolved. *Found by TEA during test design.*
- **Improvement** (non-blocking): `land()` also writes `velXIndex` unsigned
  (`GROUND_STATES[rung].flyVel`), so between touchdown and the next ground step a left-facing
  entity briefly carries a rightward index. Harmless today because the very next `stepGround`
  re-signs it, and it is symmetric for players and enemies — but it is the same facing-blind
  shape this story is fixing one caller of, and it is the reason a single-frame land-then-flap
  fixture cannot be used to test facing. Affects `src/core/flight.ts` (`land`). Not in scope:
  jt11-3 shipped this deliberately and the ROM's landing path does not write PFACE either.
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the fleet's seeded-replay fixtures are coupled ACROSS files by frame
  number with no mechanical link between them. `audio-events`'s death/re-entry staging must land
  on a knight-TWO re-entry solely because `audio-transporter-split`'s SNPCR2 test independently
  hardcodes the same frame; the only thing recording that is a sentence in a comment. A
  re-baseliner who moves one file and not the other gets a green run in the file they edited and
  a confusing failure in a file they never opened. Affects
  `plugins/joust/tests/audio-events.test.ts` and
  `plugins/joust/tests/audio-transporter-split.test.ts` (a shared fixture module exporting the
  staged frames, or a guard asserting the two agree, would make the coupling mechanical).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): every trajectory-dependent re-baseline in this epic is done by
  hand-writing a throwaway scan harness that re-implements each test file's seating and input
  script, because those harnesses are deliberately module-private. That is per-story cost paid at
  least ten times now, and each re-implementation is a chance to measure under a subtly different
  script than the test uses. Affects `plugins/joust/tests/helpers/` (a shared
  `replay-probe` helper exposing "sweep this seed for frames satisfying <predicate>" under the
  canonical seated script would make re-baselining a query instead of a rewrite).
  *Found by Dev during implementation.*
- **Question** (non-blocking): this change makes the game measurably HARDER on the sampled seeds
  — seed `0xbeef` P1 drops from 2600 points and 3 lives to 200 and 1 life over 2400 frames, and
  seed `0xface` no longer clears wave 1 until frame 5041 (was 2866). That is the expected
  direction for the fix (enemies that launch the way they were walking press the knights instead
  of drifting rightward off them), and it is a fidelity gain, not a regression. But nothing in
  the epic pins cabinet DIFFICULTY against the real machine, so there is no test that would catch
  it if the port were now too hard rather than correctly hard. Affects `plugins/joust/` (a
  difficulty-fidelity check against cabinet footage, if the epic wants one — cf. the fleet rule
  that the video is the ground truth). Raised for visibility, not as a blocker on this story.
  *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **AC-3 re-aimed from "skid reachability" to "routing must not change"**
  - Spec source: context-story-jt11-11.md, AC-3
  - Spec text: "With facing threaded, a grounded enemy pushed **against** its facing takes the
    `onMinus` transition (the skid chain), as the player already does."
  - Implementation: the AC-3 tests pin that the resulting ground state equals the
    facing-relative transition of the brain's ACTUAL `dir` (derived per-case from `runBrain`,
    mirroring production's `steerWake`-then-brain order), plus an explicit observation test that
    every brain aims `dir` at its own facing. There is no "pushed against its facing" test.
  - Rationale: the AC is not reachable through the seam. Enemy `dir` is not player input — it is
    the brain's output, and every brain returns `enemy.facing` or `0`. Writing a test that forces
    an opposing `dir` would require fabricating a decision no brain produces, which would pin an
    invented behaviour rather than the shipped one. The re-aimed AC-3 still guards the real risk
    (that threading facing silently re-routes enemies into skids) and the observation test makes
    the premise fail loudly if a future brain breaks it.
  - Severity: minor
  - Forward impact: if a later story gives a brain a facing-independent `dir`, the observation
    test reddens and the skid chain needs its own ACs. Filed as a Question finding above.
### Dev (implementation)
- **`facing` made a REQUIRED parameter on `stepEntity` rather than optional**
  - Spec source: context-story-jt11-11.md, Technical Approach
  - Spec text: "thread the enemy's own `facing` from the `stepEntity` call site (`enemy.ts:1670`)
    into `stepEntity`, and on to `stepGround`"
  - Implementation: `stepEntity(state, input, arena = PRISTINE_ARENA, facing: -1 | 1)` — required,
    with no default, so a caller that omits it fails to compile.
  - Rationale: the spec is silent on optionality, and the minimal literal reading would have been
    an optional `facing?` mirroring `stepGround`'s. That would reproduce inside `enemy.ts` the
    exact silent-default hole this story exists to close one level up. There is a single call
    site, so requiring it costs nothing and converts the defect class into a compile error.
  - Severity: minor
  - Forward impact: any future caller of `stepEntity` must supply a facing. That is the intent.
    The equivalent tightening on `stepGround` itself is NOT done here (generated file) and is
    filed as a TEA Improvement finding.
- **Re-baselined four seeded-replay fixture files this story does not own**
  - Spec source: context-story-jt11-11.md, Scope ("Out of scope: … unrelated changes") and AC-7
  - Spec text: "In scope: threading `facing` … the tests that pin the sign … retiring the stale
    deferral comment." / AC-7: "`npx vitest run --project joust` and `npm run lint` pass"
  - Implementation: also edited `audio-events.test.ts`, `audio-thud.test.ts`,
    `audio-transporter-split.test.ts` and `dumb-wingbeat.test.ts` — eight measured frame anchors,
    one process/score/lives fingerprint and two wing-cue censuses.
  - Rationale: the two clauses conflict, and AC-7 (a green project) is unreachable without it —
    these files pin frame numbers of a whole-sim seeded replay, and correcting which way half the
    buzzards launch necessarily moves them. Scope's "unrelated changes" is aimed at drive-by
    edits; these are the direct, unavoidable consequence of the in-scope change, and the four
    files already carry nine prior stories' re-baselines in exactly this form. Every number was
    re-measured by each test's own documented precondition, and each file's own invariant was
    verified to still hold BEFORE its fingerprint was touched (notably `rng`, unmoved).
  - Severity: moderate
  - Forward impact: the next story to change enemy trajectories re-baselines the same four files
    from these numbers. Two findings filed to make that cheaper and safer (the cross-file frame
    coupling, and the missing shared replay-probe helper).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | error (partial) | 0 | N/A — permission-blocked on vitest/lint; I ran both myself (see below) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by me + rule-checker |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 2, dismissed 1, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by me |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by me |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents` and covered directly)
**Total findings:** 4 confirmed, 1 dismissed (with rationale), 0 deferred

**Preflight was permission-blocked** on `npx vitest run` and `npm run lint`. I ran all three suites myself rather than claim coverage from a subagent that could not: **joust 178 files / 3502 tests green · `npm run lint` (tsc --noEmit) clean · orchestrator 478/478**. Preflight did complete its other checks: clean `git status`, no `console.log`, no `.only`/`.skip`, no TODO/FIXME.

**Dismissed:** comment-analyzer's third finding (a stray untracked `tests/zzprobe-reviewer.test.ts` inflating the file count) — that was MY OWN verification probe, running concurrently with the subagent; it is deleted and the final suite run confirms 178 files / 3502 tests, matching the README. Not a diff defect.

**Cross-check where the two specialists DISAGREED:** rule-checker marked the `:3876` BODIR citation "verified exact — compliant"; comment-analyzer flagged it. Comment-analyzer is right and rule-checker checked the wrong thing. `JOUSTRV4.SRC:3876` is `BODIR  LDA  PFACE,U` — verified by me directly. The line lands exactly where cited (rule-checker's test), but `LDA` is a **read**, and the comment lists it among citations that "all write it" (comment-analyzer's test). Finding F3 below.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `EnemyState.facing` (PFACE) → `stepEnemyDetailed` `phased.facing` → `stepEntity(…, facing)` → `stepGround(s, input, facing)` → `velXIndex = (facing === -1 ? -next.flyVel : next.flyVel) | 0` → survives `takeOff()` verbatim → `FLYX[velXIndex/2+4]` moves `posX`. Safe because `facing` is typed `-1 | 1` end to end with no cast, default or nullish path.

### The correctness question I actually cared about

The synthetic fixtures TEA wrote could pass while real play stayed broken, so I verified the invariant in **real seeded play** with a throwaway probe: 5 seeds × 6000 frames, every grounded enemy of every brain, asserting `sign(velXIndex) === facing`.

My first two probes were themselves defective and I record that, because it is the reason the result is trustworthy:

1. **Probe v1** flagged violations — which turned out to be the post-`land()` window, not this story. 
2. **Probe v2** classified them by "distinct grounded state key", which would have **hidden the very failure being hunted** (a `stepGround` that re-wrote `land()`'s exact value). Replaced with a time-based window (≥12 grounded frames ⇒ ≥6 ground steps even at the EMYTIM=2 divider).
3. **Probe v3 passed — and passed with a mutant applied too.** Vacuous: my non-vacuity guard was on `groundedSamples`, not on the population that discriminates. Fixed to require left-facing steady grounded samples.

With the guard on the right quantity, and using a **faithful** mutant (restoring the exact pre-fix 2-arg `stepGround(s, input)` — note a `facing = 1` mutant is *unfaithful*, because it also re-routes transitions into the skid chain):

| Tree | left-facing steady samples | sign violations |
|---|---|---|
| Faithful mutant (pre-fix) | 525 | **520** |
| HEAD (the fix) | populated (>20) | **0** |

That is the fix verified against real play across all four brains, with the probe proven non-vacuous. `postLand` violations remain in both trees — those are `land()`'s pre-existing unsigned write, which TEA already filed and which is explicitly out of scope.

### Findings

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] `[RULE]` | Docstring claims "a mutated GROUND_STATES entry reddens IN THIS FILE", but the transcription pin hand-checks only **2** facts (`PLYCR.onPlus`, `PLYDR.flyVel`) while the sweep derives magnitude from `GROUND_STATES[nextId].flyVel` — the same table under test — for all 12 rows. **I re-ran the mutation myself:** `PLYHR.flyVel` 4→6 (plausible, even, in-range) leaves **all 178 files / 3502 tests green**. Rules #17 + #18. | `tests/enemy-ground-facing-jt11-11.test.ts:64-66` and `:213-233` | Narrow the docstring to the two facts actually pinned, OR extend the pin to all 12 rows' `flyVel` against `JOUSTRV4.SRC:7163-7175` (~12 lines, mirrors `ground-momentum.test.ts`'s FRCONV pin). |
| [MEDIUM] `[DOC]` | Re-baseline note headlines "AND THE SWEEP WINDOW HAD TO GROW AGAIN", then its own next sentence says "sweeping the customary 6000 frames still finds the advance". The new anchor is 5041 — **inside** 6000. The window did not have to grow; the author's first scan was 3200. Self-contradicting, and these notes are demonstrably read as method guidance by the next re-baseliner (this file carries ten of them, each citing the last). Rule #17. | `tests/audio-events.test.ts`, jt11-11 note above the wave-advance test | Reword: "a 3200-frame scan finds nothing; the customary 6000 suffices; 9000 was swept for margin." |
| [MEDIUM] `[DOC]` | "BODIR (:3876), B2DIR's `CLR PFACE,U` / `STA PFACE,U` (:4122,:4141) and SHDIRA (:4353,:4372,:4381) **all write it**." Verified directly: `:3876` is `BODIR  LDA  PFACE,U` — a **read**, not a write. The other five are genuine writes (`CLR`/`STA`), so the load-bearing claim (PFACE is live for enemies) holds; only BODIR is misfiled. | `tests/enemy-ground-facing-jt11-11.test.ts:48` | Move BODIR out of the "write" list, or say it reads PFACE to sign CURJOY. |
| [LOW] `[DOC]` | `:5836` is cited beside `:5841` as "the author's own branch comments in that loop". Verified: `:5836` is prefixed `********` — this assembler's disabled-code convention. Text is quoted accurately but it is dead source, presented as equal corroboration to the live `:5841`. | `tests/enemy-ground-facing-jt11-11.test.ts:45` | Note it as the superseded predecessor, or drop it. |
| [LOW] `[TYPE]` | `stepEntity(state, input, arena = PRISTINE_ARENA, facing: -1 \| 1)` — a **required** parameter after a defaulted one makes the `arena` default unreachable (only an explicit `undefined` could trigger it), i.e. dead. | `src/core/enemy.ts:1300-1309` | Reorder to `(state, input, facing, arena = PRISTINE_ARENA)`, or drop the now-dead default. |

### Rule Compliance (typescript.md, enumerated)

- **#1 type escapes** — no `any`, `as unknown`, `@ts-ignore`, or `!` added anywhere in the diff. `EnemyState.facing` is already `-1 | 1`, so threading it needs no cast. **Compliant.**
- **#4 null/undefined** — `facing` is non-optional; both call sites pass a required field. No `??`/`||` fallback that could mask a missing value. **Compliant** (and the deliberate opposite of the defect being fixed).
- **#8 test quality** — every new test asserts a concrete value; the four "premise" tests exist precisely so a green run cannot be vacuous; AC-2 pins `velY === TAKEOFF_VEL_Y` and `groundState === null` before trusting its `velXIndex` claim. **Compliant**, except the sweep's magnitude term (F1).
- **#17 comments asserting an unre-run mechanism** — **3 violations** (F1, F2, F3). All other new citations verified by me byte-for-byte: `:5904-5906`, `:5946-5948`, `:5951`, `:6000-6001`, `:6006-6008`, `:5663`, `:4122`, `:4141`, `:4353`, `:4372`, `:4381` — all exact.
- **#18 apparatus fails by PASSING** — **1 violation** (F1, mutation-proved twice, independently). No "one concept, two helpers"; the new file calls production throughout rather than reimplementing the ground state machine — with one partial exception: AC-3 re-derives `stepGround`'s dispatch, the same shape `ground-momentum.test.ts` uses and openly acknowledges. Here it is unacknowledged, but the concrete `groundState === 'PLYDR'` assertion in "THE BUG" is an independent pin for the case under test. **Acceptable.**
- **#20 quantity measured from an artifact the same diff changes** — the README's `178 files / ~3500 tests` is derived and guarded by `audio-seam-scope`; I ran the real post-change tree and got exactly 178/3502. **Compliant.**
- **#21 degenerate numeric input** — `-0` is asserted absent for every state × facing; production kills it with `| 0`. I checked for a **second writer** bypassing the guard: the only `velXIndex` writers are `stepGround` and `land()`, both `| 0`'d. **Compliant.**
- **#24 retirement applied only where the AC named it** — I grepped every synonym (`facing-less`, `threads no facing`, `legacy 2-arg`, `NOT pinned to a sign`). The surviving `facing-less` occurrences all describe the 2-arg overload's generic semantics, which remains true. The one false claim was rewritten. **Compliant.**
- **#15, #22, #23, #25, #27–#30** — not applicable (no new source-text guard, no predicate inversion, no published mutant table, no data-file re-serialization).
- **Core purity** — no clock, entropy, DOM or shell import added; `purity.test.ts` sweeps `src/core/` and is green. **Compliant.**
- **`flight.ts` is GENERATED / DO NOT HAND-EDIT** — untouched by this diff. **Compliant.**

### Observations

- `[VERIFIED]` **`decision.dir` and `phased.facing` cannot desync** — the property the whole fix rests on. I enumerated every `facing` write in `enemy.ts`: `:1122` (homing flip), `:1253`/`:1254`/`:1269` (steerWake/bumpFace) all run **before** the brain, and the only post-brain write, `:1640`, sets `facing := decision.dir` — making them agree by construction. `runBrain` (`:1449`) is a pure dispatcher with no internal facing mutation. So `input.dir ∈ {0, phased.facing}` always, which is why routing is unchanged and the fix is sign-only.
- `[VERIFIED]` **No assertion was weakened during re-baselining** — I diffed the four fixture files with comment lines stripped: every change is a frame number or a measured constant. Not one operator, structure or expectation shape moved; no `toBe`→`toBeTruthy`, no deleted expectation, no `.skip`. This was my main integrity concern and it is clean.
- `[VERIFIED]` **Determinism preserved** — `rng: 2_006_456_271` and `wave: 1` do **not** appear as changed lines in the diff of the fingerprint test; only play-dependent fields moved. That is the law that group exists to pin, and it holds — the change signs an already-computed index and draws no randomness.
- `[VERIFIED]` **The cross-file frame coupling is satisfied** — `audio-events` stages the knight-**two** re-entry at 958 and `audio-transporter-split` asserts SNPCR2 at 958; both green. The constraint Dev flagged was honoured, not discovered by accident.
- `[VERIFIED]` **Only two `stepGround` production callers exist** — `frame.ts:280` and `enemy.ts`; both now pass facing, so `ground-momentum.test.ts`'s legacy-branch test is genuinely the last thing keeping the 2-arg overload honest, exactly as its rewritten comment now claims.
- `[VERIFIED]` `[SEC]` **No security findings — and the categories that matter here were checked, not waved past.** Conventional web-security categories are inapplicable (browser-only clone, no backend, auth, tenancy, network I/O or secrets; persistence is localStorage high scores). The project's actual security-adjacent invariants were verified instead: (a) **core purity** — no clock, entropy, DOM or shell import added to `src/core/enemy.ts`; the additions are a typed parameter and prose comments, and `purity.test.ts` strips comments before scanning, so the guard is not being fooled by them — green; (b) **determinism**, the security-adjacent property in a seeded-replay engine — the change signs an already-computed index from an existing state field, consumes no RNG and depends on no iteration order, corroborated by `rng: 2_006_456_271` being unchanged in the fingerprint test; (c) **type escapes** — zero `any`, `as unknown`, `@ts-ignore` or `!` added across the whole diff; (d) **CI-hang risk** from the new loops — every one is bounded (13 states × 2 facings × 4 brains = 104 iterations worst case) and the in-test frame window is a fixed `i < 320`, with the 6000→9000 figure being an offline sweep, not a runtime bound.
- `[MEDIUM]` The wave-advance test now runs ~5361 frames instead of ~3186 (+68%). The suite is still 2.5s, so this is not a problem today, but the fixture's cost grows every time this seed clears later.
- Independent corroboration worth recording: comment-analyzer **reproduced Dev's thud staging positions** at seed `0x1035` frame 505 (`enemy#257` at (212,128), `player#2` at (200,128), bounce down/up) with its own standalone script. That re-baseline narrative is measured, not confabulated.

### Devil's Advocate

Argue this is broken. The strongest case starts with the play data: seed `0xbeef` player 1 falls from 2600 points and 3 lives to 200 and 1, and seed `0xface` stops clearing wave 1 until frame 5041 instead of 2866. If I wanted to believe this change is wrong, that is the evidence I would reach for — a "fix" that guts the player's score by 92% looks like a regression wearing a citation. So I tried to break it three ways. First, the sign could be one wake stale: if `phased.facing` were read before the brain re-aimed, every enemy that turned would carry the wrong sign for a frame and jitter. It is not stale — every facing write except `:1640` precedes the brain, and `:1640` sets facing *from* `decision.dir`. Second, the magnitude could be wrong even with a right sign; but magnitude comes from the row's `flyVel`, which this diff does not touch. Third, and most plausibly, the fixtures could have been nudged until green, with the "harder game" story invented afterwards to justify it. That is the failure mode I spent the most effort on, and it is refuted three ways: no assertion shape changed, `rng` is untouched, and my own faithful-mutant probe reproduces 520 violations pre-fix and 0 post-fix without reference to any fixture. The harder game is what the ROM's own `NEG PVELX` produces once half the buzzards stop drifting rightward off the knights. What a confused future reader *would* get wrong is F1 — they will believe a wrong `flyVel` is caught here when it is not — and F2, which will send them widening a sweep window that never needed widening. Those are documentation defects with real downstream cost, which is why they are Medium and not Low. Neither makes the shipped simulation wrong.

**Pattern observed:** the ROM citation carried onto the change itself (`src/core/enemy.ts:1321-1330`) rather than left in the commit message — consistent with this codebase, and it is what let me verify the mechanism in minutes.
**Error handling:** none applicable — pure total functions over `-1 | 1`; `stepGround`'s `RangeError` on an unknown state id is pre-existing and unreachable from the new parameter.
**Handoff:** To SM for finish-story.

### Reviewer (audit)

**TEA's deviation — AC-3 re-aimed from "skid reachability" to "routing must not change"** → ✓ **ACCEPTED by Reviewer.** Independently verified the premise rather than taking it on trust: I enumerated every `facing` write in `enemy.ts` and confirmed `decision.dir ∈ {0, phased.facing}` by construction (three writes precede the brain; the only post-brain write sets `facing := decision.dir`). So `onMinus` genuinely is unreachable from brain input and the original AC-3 could not have been written honestly. Re-aiming it, rather than fabricating a decision no brain produces, was the correct call.

**Dev's deviation — `facing` made a REQUIRED parameter on `stepEntity`** → ✓ **ACCEPTED by Reviewer**, agrees with author reasoning: an optional parameter with a silent fallback is the exact defect shape this story removes, and with one call site it costs nothing. Note the minor consequence recorded as finding F5 — it strands the `arena` default.

**Dev's deviation — re-baselined four fixture files the story does not own** → ✓ **ACCEPTED by Reviewer.** Scope's "no unrelated changes" and AC-7's "green project" genuinely conflict here, and AC-7 cannot be met without it. I verified the re-baselining was measurement and not nudging: no assertion shape changed in any of the four files, `rng` is untouched, and my own independent mutant probe reproduces the defect without reference to any fixture. Severity "moderate" is honestly graded.

**UNDOCUMENTED deviation found by me:** none. Every divergence from the story context is logged. The one thing I looked hardest for — a fixture nudged rather than re-measured — is not present.

### Reviewer (code review)
- **Gap** (non-blocking): 7 of the 12 `GROUND_STATES` rows have their `flyVel` pinned NOWHERE in the joust suite. `ground-momentum.test.ts`'s transcription pin covers only the 5 FRCONV rungs (and says so honestly); the new jt11-11 pin covers 2 facts. Mutation-proved twice, independently: `PLYHR.flyVel` 4→6 leaves all 178 files / 3502 tests green. The `SKIDR`/`REVR`/`RUNSR` rows (`PLYAR, PLYGR, PLYHR, PLYIR, PLYJR, PLYKR, PLYLR`) are transcribed from `JOUSTRV4.SRC:7163-7175` and never re-checked. Affects `plugins/joust/tests/` (a 12-row hand-transcribed `flyVel` pin, mirroring the existing FRCONV one, closes it in ~12 lines). PRE-EXISTING — this story only made a claim about it that is not true. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `workflow.reviewer_subagents` has `test_analyzer`, `edge_hunter`, `silent_failure_hunter`, `type_design` and `simplifier` all disabled, leaving `preflight`, `comment_analyzer`, `security` and `rule_checker` enabled. On THIS story — whose diff is 96% test code and whose only real findings were test-apparatus and comment defects — the disabled `test_analyzer` was the single most relevant specialist, and the two confirmed Mediums were caught by `rule_checker` and `comment_analyzer` doing its job incidentally. Affects the pf settings for this repo (consider re-enabling `test_analyzer` at least for test-heavy stories). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `reviewer-preflight` was permission-blocked from running `npx vitest run --project joust` and `npm run lint` — the two checks it exists to perform — and returned `status: blocked`. A reviewer who trusted the subagent table would have shipped with no test evidence at all. Affects the permission allowlist for reviewer subagents (`.claude/settings.json`). *Found by Reviewer during code review.*
- **Question** (non-blocking): TEA's filed generator drift is worth escalating in the epic's planning, not just recording. `tools/transcribe-flight.mjs`'s `stepGround` template still emits the pre-jt2-9 two-arg signature with no `facing` and no `velXIndex` write. Regenerating `flight.ts` — which the file's own header instructs future agents to do rather than hand-edit — would silently revert jt2-9, jt11-3 AND this story in one command. I confirmed nothing runs the generator today (no npm script, no test, no CI step), so it is latent, but the header actively invites the action that would trigger it. Affects `plugins/joust/src/core/flight.ts` (header) and `tools/transcribe-flight.mjs` (template). *Found by Reviewer during code review.*