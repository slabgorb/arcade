---
story_id: "cp2-16"
jira_key: "cp2-16"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-16: PLAYEX side-effects on a gun death — stamp the colliding slot 0xFF and blank the shot (CENTI4.MAC:1805-1808)

## Story Details
- **ID:** cp2-16
- **Jira Key:** cp2-16
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T11:40:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T11:00:35Z | 2026-07-27T11:02:34Z | 1m 59s |
| red | 2026-07-27T11:02:34Z | 2026-07-27T11:17:12Z | 14m 38s |
| green | 2026-07-27T11:17:12Z | 2026-07-27T11:27:01Z | 9m 49s |
| review | 2026-07-27T11:27:01Z | 2026-07-27T11:40:15Z | 13m 14s |
| finish | 2026-07-27T11:40:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): the ROM freezes BUGMV/ANTMV once the gun is dead (BUGMV
  `:289-291 "LDA PLAYP / AND I,0AF / BEQ 5$ ;BUG MOVE IF PLAYER IS ALIVE"`, ANTMV `:50-52` —
  both re-verified this session), but #35 deliberately keeps every stepper running on the kill
  frame for replay stability (sim.ts:408-412), and the cp4-7 attract demo now leans on
  deterministic playout. Affects `centipede/src/core/sim.ts` (kill-frame stepper gating). Needs a
  RULING before anyone ports the reference branch's gates — per the story context, neither side
  may be kept silently. Scope note for the ruling: respawn re-parks the spider and clears the
  flea (sim.ts:691-693), so the observable divergence is one kill-frame of spider/flea motion
  plus rng-draw cursor shifts; the reference branch (WITH gates) ran the full suite including
  attract-demo green on its cp4-7 base. No cp2-16 red depends on either side.
  *Found by TEA during test design.*
- **Gap** (non-blocking): `centipede/docs/rom-study/claims/09-centipede-train.json` cites
  MOTION's `JSR PLAY` at `:1447` in FOUR places (JSON lines 175, 181, 970, 979); the verified
  line is `:1449` — `:1447` is `ADC X,MOBJH` (quarry re-opened this session). Affects that
  claims file (fix in GREEN — the stamp work touches exactly these claims).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the sim.ts:398-406 comment "Do not 'fix' this by passing the
  post-step flea" over-generalizes OVRLAP/BUGMV's genuinely pre-step read of slot 12 to ANTMV's
  OWN PLAY (`:107-108`, which runs after ANTMV's move `:101-103` and after SHOOT `:34`) and is
  refuted by the AC-3 reds. Affects `centipede/src/core/sim.ts` (comment must be rewritten when
  the slot-12 check relocates). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the dossier `:1447` Gap finding overcounts — of the four
  string occurrences, only CT-70's claim + note misplace `JSR PLAY` (fixed to `:1449` in
  `244e529`); CT-13's two cite `ADC X,MOBJH`, which genuinely IS `:1447` (each occurrence
  verified against the quarry before editing — a count of a line-number STRING is not a count
  of wrong citations). Same class: the reference branch's comment puts MOTION's slot-loop
  start at `:1281`; the quarry says `:1284 "LDX I,NCENT-1"` (`:1281` is `BEQ 2$`) — the ported
  comment cites `:1284`. Affects `centipede/docs/rom-study/claims/09-centipede-train.json`
  (no further change needed). *Found by Dev during implementation.*
- **Gap** (non-blocking): #35's frame structure moves the shot advance + mushroom resolution
  to the frame TOP (before MOTION), so a shot can hit-and-score a mushroom on the same frame a
  later PLAY kills the gun — the cabinet's SHOOT (:34) runs wholly after PLAYEX and a blanked
  SHOTP dies unspent. Pre-existing, orthogonal to the stamps, unobserved by any current test.
  Affects `centipede/src/core/sim.ts` (fidelity backlog candidate).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): two mutation-proven coverage gaps, both scoped to the multi-collider
  frame: (1) the `!playerHit` cross-hazard guards (sim.ts:436, :530) — removing both stays
  905-green; (2) `playerContactIndex`'s NCENT-1-descending tie-break — reversing to ascending
  stays 905-green, despite the docstring's ROM citation (quarry evidence now in hand: `:1284`
  descending walk + `:1450 BCC 35$` MOTION exits on a kill → highest-slot-wins). Affects
  `centipede/tests/` (a dual-kill fixture + a two-segment tie-break fixture). Route BOTH to the
  death-frame-gates ruling successor: the cross-hazard frame's stepping regime is that story's
  question, and a fixture written pre-ruling risks pinning the losing regime's positions.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the rule-checker's "stale quarry copy" claim about
  `~/Projects/centipede-source/` is a NEWLINE ARTIFACT, adjudicated by reading BOTH copies with
  universal newlines: every cited line (`:1284`, `:1449`, `:1805-1806`, …) is IDENTICAL in the
  two copies; the md5/line-count delta is byte-level newline noise, and the "2-line offset" came
  from the subagent's own CRLF splitting. Canonical path to cite remains the repo-bundled
  `reference/atari-source/centipede/revision.v4/CENTI4.MAC` (byte-identical across checkouts).
  Affects nothing in the diff (citations verified exact against both).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Shot-blank AC pinned as a green GUARD, not a red**
  - Spec source: context-story-cp2-16.md, AC (2)
  - Spec text: "the shot blank incl. a far-away in-flight shot on a contact death"
  - Implementation: the far-shot-blank test is green today and marked GUARD; no red exists for it
  - Rationale: #35 (`156430e`) already blanks the shot on a gun hit — a red is impossible without deleting shipped behavior; the guard protects it through the stamp refactor
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: correct — a red against shipped behavior is impossible; the guard is mutation-relevant (analyzer proved the suite discriminates the blank via the flea reds)
- **ROM death-frame gates deliberately unpinned — routed to a ruling**
  - Spec source: context-story-cp2-16.md, "The reference branch — what to lift"
  - Spec text: "BUGMV :289-291 / ANTMV :50-52 skip once the gun is dead … Route to a ruling rather than silently keeping either"
  - Implementation: no test pins freeze-vs-run for post-kill stepping; the RED covers only the kill frame's PLAYEX side-effects, satisfiable under either regime
  - Rationale: the context forbids silently pinning either side; the ruling is routed as the Conflict delivery finding above
  - Severity: minor
  - Forward impact: Dev must NOT port the reference gates before the ruling lands (review or successor story)
  - → ✓ ACCEPTED by Reviewer: the routing honors the story context's explicit instruction; review adds one datum for the ruling — during the death PAUSE the sim freezes the stamped 0xFE explosion (stepDeathFrame runs no EXPLOD), so the pause-frame stepping regime belongs to the same ruling
- **Reference suite's descending-scan tests not duplicated**
  - Spec source: context-story-cp2-16.md, "The reference branch — what to lift"
  - Spec text: "tests/frame-order.test.ts — 10 tests incl. the dual-window suite"
  - Implementation: lifted only the 4 probe-red tests + 1 blank guard; the AC-2 scan/mirror-pair tests were not copied
  - Rationale: upstream's own tests/frame-order.test.ts already pins the scan order and the dual-window score-nothing halves; duplicate pins add maintenance without new discrimination
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: verified — upstream's suite covers AC-2 scan order (frame-order.test.ts:152-225); duplication would add no discrimination
- **MOTION multi-collider tie-break unpinned**
  - Spec source: context-story-cp2-16.md, "The reference branch — what to lift"
  - Spec text: "playerContactIndex in centipede.ts (MOTION's NCENT-1-descending tie-break …)"
  - Implementation: every fixture stages exactly ONE collider; which segment is stamped when two share the gun box is untested
  - Rationale: the tie-break claim needs its own quarry verification (MOTION's `:1450 BCC 35$ ;IF PLAYER IS DEAD` exit path) that a 2-pt RED doesn't carry; single-collider fixtures pin all filed ACs
  - Severity: minor
  - Forward impact: Dev may port the reference tie-break unpinned; flagged for Reviewer attention
  - → ✓ ACCEPTED by Reviewer: attended to — the analyzer mutation-PROVED the gap (ascending scan stays 905-green), and review adds the quarry evidence the deviation asked for (`:1284 LDX I,NCENT-1` descending walk + `:1450 BCC 35$` exits MOTION on a kill, so first-checked-highest wins). Fixture routed to the ruling successor as a [TEST] Medium finding — see Reviewer findings

### Dev (implementation)
- **Reference implementation ported WITHOUT its death-frame stepper gates**
  - Spec source: context-story-cp2-16.md, "The reference branch — what to lift"
  - Spec text: "The ROM death-frame gates: BUGMV :289-291 / ANTMV :50-52 skip once the gun is dead … Route to a ruling rather than silently keeping either"
  - Implementation: the reference's `died`-flag gating of the spider/flea/shot STEPPERS was stripped; only the PLAY checks carry a one-death-per-frame guard (`!playerHit`), which both regimes agree on (ROM: a dead gun's PLAY is unreachable — both callers gate on PLAYP; #35: the single consolidated check had the same net effect). Movement stays ungated, preserving #35's replay-stability regime and rng-draw cadence
  - Rationale: per TEA's Conflict finding the gate question is routed for a ruling; porting the mechanism without the unratified decision keeps the story shippable under either outcome
  - Severity: minor
  - Forward impact: the ruling story (or review) can add the stepper gates as a self-contained change; no cp2-16 test pins either side
  - → ✓ ACCEPTED by Reviewer: the narrow line is drawn correctly — the `!playerHit` CHECK guards are regime-agreed (ROM: PLAYP-gated callers; #35: one consolidated check), while the stepper freezes stay unported. Note the guards themselves are mutation-unpinned — see Reviewer (audit) below
- **MOTION's PLAY reads the PRE-move gun**
  - Spec source: context-story-cp2-16.md, Scope (the three PLAY sites); CENTI4.MAC mainloop order
  - Spec text: "0-11 via MOTION's per-segment PLAY (:1449)" — MOTION is :30, MOVE is :32
  - Implementation: the MOTION-site check reads `state.player` (pre-move), where #35's consolidated check read the post-move gun for segments
  - Rationale: ROM-faithful (:30 precedes :32); no cp2-16 red discriminates (IDLE fixtures) but a moving gun now cannot dodge a segment contact within the frame it happens
  - Severity: minor
  - Forward impact: none (spider/flea checks keep the post-move gun, matching BUGMV :33 / ANTMV :37 after MOVE :32)
  - → ✓ ACCEPTED by Reviewer: mainloop order verified in the quarry (:30 MOTION / :32 MOVE); pre-move read is the faithful one, and the full suite shows no sibling depended on the post-move read

### Reviewer (audit)
- **Cross-hazard one-death guards untested (undocumented by TEA/Dev):** Dev's GREEN introduced
  the `!playerHit` guards (sim.ts:436, :530) that stop a second hazard stamping/re-arming PLAYEX
  on a frame where an earlier caller already killed the player. TEA's "tie-break unpinned"
  deviation covers the two-SEGMENT case, but the CROSS-hazard case (segment kill + spider/flea
  also in contact) is a distinct untested behavior nobody logged — mutation-proven: removing
  both guards stays 905-green. Severity: M. Routed with the tie-break fixture to the ruling
  successor (the cross-hazard frame is exactly the frame whose stepping regime that ruling
  decides, and a fixture written before it risks pinning the losing regime's positions).

## Sm Assessment

Setup complete and verified on disk for cp2-16 (bug, 2pt, centipede, tdd/phased).

- **Session file:** created at `.session/cp2-16-session.md`, Phase `setup` (not pre-advanced).
- **Branch:** `fix/cp2-16-playex-death-stamps` created from centipede `develop` and checked out.
- **Sprint tracking:** cp2-16 moved backlog → in_progress with started timestamp.
- **Story context:** `sprint/context/context-story-cp2-16.md` is HAND-AUTHORED (2026-07-27) and was
  deliberately NOT regenerated — sm-setup ran with an explicit skip override and reported
  `context_file_touched: false`; verified post-run by empty `git status --short` and md5 match
  (`be65dcd16df246eafe55f04bbdc99cf0`) against the committed copy. It carries the full spec:
  provenance from the superseded cp2-15 session, the three PLAYEX stamp sites, the shot blank,
  and the REQUIRED slot-12/ANTMV amendment found by a-2's review probe.
- **Jira:** skipped — no Jira in this project; jira_key is the story id.
- **Note for TEA (Leeloo):** the reference branch `fix/cp2-15-frame-order` (centipede origin,
  head `7babb64`) contains a ready-made RED — `tests/frame-order.test.ts` T6a/T6b fail on current
  develop. Treat the branch as spec-with-proofs, not as a mergeable branch (both sides rewrote
  stepPlayingFrame). Also flag for a deliberate ruling: ROM death-frame gates (BUGMV/ANTMV freeze
  once the gun is dead) vs #35's every-stepper-runs replay argument — route to a ruling, don't
  silently keep either.

Routing: workflow `tdd` (phased) → next agent **tea**, next phase **red**.

## Tea Assessment

**Tests Required:** Yes

**Test Files:**
- `centipede/tests/playex-stamps.test.ts` — NEW, 5 tests: the PLAYEX stamp at all three PLAY
  sites (spider 0xFF held to frame end, segment 0xFE via the MOTION-site/EXPLOD ordering,
  flea 0xFF dying with the player), the shot blank (far in-flight guard), and the slot-12/ANTMV
  amendment (fast-flea shot-first +200/player-lives; slow-flea scoreless speed-up then
  post-move kill)
- `centipede/tests/newhd-factory.test.ts` — re-seat only: the lone-head NEWD staging moved off
  the gun column (h `0x80` → `0x40`, the reference branch's proven hunk) so it survives the
  stamps; green under both codes

**Tests Written:** 5 tests covering ACs 1-3 (+1 test-file re-seat serving AC-4)
**Status:** RED (4 failing — ready for Dev)

**RED verification (testing-runner + direct full-suite cross-check, totals MATCH):**
49 files / 905 tests; 901 pass, 4 fail, ALL in `tests/playex-stamps.test.ts`, each failing on
its discriminating assert with the cp2-15 probe's exact message — `expected 20 to be 255`
(spider stamp), `expected +0 to be 254` (segment 0xFE), `expected +0 to be 200` (fast flea),
`expected 1 to be 4` (slow flea). The lead-in asserts (delay/playerExplode/score) pass first,
proving each staging engages the mechanism — the reds are non-vacuous by construction.
Committed: centipede `00e7c11` on `fix/cp2-16-playex-death-stamps`.

**Provenance:** fixtures lifted verbatim from the probe-proven reference branch
`fix/cp2-15-frame-order` (`7babb64`); develop HEAD confirmed still `156430e` (the probe's
tree). Every ROM citation re-opened against the local quarry
(`~/Projects/centipede-source/revision.v4/CENTI4.MAC`) this session: PLAYEX `:1800-1808`
(stamp `:1805-1806`, blank `:1807-1808`), MOTION's PLAY `:1449`, BUGMV's `:416-417`, ANTMV's
move `:101-103` + PLAY `:107-108` + gates `:50-56`, SHOOT's dead-slot skip `:2177-2178`,
flea first-hit `:2219-2224`, mainloop `:30-39`.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | tests-only diff; zero casts/`as any`/`!` in both files | pass by inspection |
| TS #8 test quality | every assert carries a message + exact expected value; no mocks; vacuous-test self-check clean | pass by inspection |
| live repo guards | purity scanner, audit citation gate, ONE-PLAYEX source scan (`spider.test.ts:883-889`) all green in the full run | passing |

**Rules checked:** 2 of 13 typescript checks apply to a tests-only diff; the other 11 target
implementation code and fall to Dev's GREEN. No new rule-enforcement test needed — the repo's
existing guards (above) already cover this story's rule surface.
**Self-check:** 0 vacuous tests found.

**Notes for Dev (Korben Dallas):**
- The reference branch `fix/cp2-15-frame-order` (`7babb64`) is spec-with-proofs, NOT mergeable —
  both sides rewrote stepPlayingFrame; expect real conflicts. Lift its design: a
  `playerContactIndex`-style killer-identification seam, stamps applied at each caller's site.
- The segment 0xFE red FORCES the stamp inside the MOTION site (before `stepExplosions`); a
  stamp bolted onto the current consolidated check ends at 0xFF and stays red.
- The slot-12 fix moves the flea's gun check AFTER the SHOOT resolvers and AFTER the flea's
  move, gated on the slot being alive (ANTMV `:50-56`); segments+spider stay pre-SHOOT. Keep
  exactly ONE `playerExplode: PLAYER_EXPLODE_START` construction (`spider.test.ts:883` guard).
- Do NOT port the reference's BUGMV/ANTMV death-frame gates — Conflict finding routed for a
  ruling first.
- In GREEN, also fix the dossier's four `:1447` cites → `:1449` and rewrite the sim.ts:398-406
  "Do not 'fix'" comment (both filed as Gap findings).
- The attract demo (cp4-7) plays through deaths; if its suite shifts under the amendment,
  the reference branch's green run on the same base says the destination state is attainable.

**Handoff:** To Dev for implementation (GREEN).
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/centipede.ts` — `playerContactIndex` (MOTION's per-segment PLAY as an
  index, NCENT-1-descending per `:1284`); `checkPlayerContact`'s segment half delegates to it
  so the diamond test stays in one place
- `centipede/src/core/sim.ts` — PLAY decomposed to its three ROM caller sites, each with its
  PLAYEX stamp (:1805-1806) + shot blank (:1807-1808): MOTION-site check (pre-move gun, stamp
  BEFORE stepExplosions → 0xFE same frame), BUGMV-site spider check (post-move spider, holds
  0xFF), ANTMV-site flea check (post-move flea, alive-gated, AFTER the SHOOT resolvers —
  the slot-12 amendment). The refuted "Do not 'fix'" comment rewritten with the probe's
  reasoning. ONE PLAYEX construction preserved (spider.test.ts:883 guard green)
- `centipede/docs/rom-study/claims/09-centipede-train.json` — CT-70's two `JSR PLAY` cites
  corrected `:1447` → `:1449`; CT-13's `:1447` cites verified genuine and untouched

**Tests:** 905/905 passing (GREEN) — verified by testing-runner (49 files, totals match my
direct full-suite run) plus `npm run lint` (tsc) clean. No sibling re-seats needed beyond
TEA's newhd-factory one; the flea-on-gun contact death (flea.test.ts) passes through the
relocated post-move check unchanged.
**Branch:** `fix/cp2-16-playex-death-stamps` (pushed, `244e529` on `00e7c11`)

**Not ported (deliberate):** the reference branch's death-frame stepper gates (`died`-flag
freezing of spider/flea/SHOOT on the kill frame) — stripped per the routed ruling; only the
PLAY checks are one-death-guarded, which both regimes agree on. See Design Deviations.

**Handoff:** To next phase per the gate (review).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 905/905 green, tsc clean, 0 smells, tree synced with origin |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [EDGE] observations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [SILENT] observation) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (both Medium, mutation-proven; routed to ruling successor); all 4 story reds proven load-bearing; newhd re-seat proven legitimate; source-scan guards proven sound |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [DOC] observation) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [TYPE] observation) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity sweep 22/22, no nondeterminism, no shell leakage |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [SIMPLE] observation) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 16 rules / 27 instances / 0 violations; its "stale quarry" side-claim adjudicated as a CRLF artifact (both copies identical at every cited line under universal newlines) |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 2 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Independence note:** this session authored the RED and GREEN under relay; per the sidecar, the
subagent fleet's mutation evidence is weighted over the author's recollection throughout.

**Data flow traced:** shell `InputCounts` → `movePlayer` → `player.h/v` → the three per-caller
PLAY checks (`playerContactIndex(segs, state.player)` pre-move at the MOTION site;
`checkPlayerContact([], player, spider)` post-move at the BUGMV site; `checkPlayerContact([],
player, null, flea)` post-move at the ANTMV site) → single PLAYEX construction (sim.ts:573)
→ `stepDeathFrame` pause → respawn re-lays the train via `createCentipede` (sim.ts:742),
re-parks the spider and clears the flea — every stamp's afterlife is bounded by the respawn.
Safe: all comparisons are pure integer windows on typed state; no input reaches
anything ambient.

**Observations (tags cover every specialist domain):**

1. [VERIFIED] [TEST] All four story reds are load-bearing — analyzer mutations: moving the
   segment stamp after `stepExplosions` reds the 0xFE assert; reverting the flea check to
   pre-SHOOT `state.flea` reds both flea tests; dropping the spider stamp reds its assert; a
   full checkout of `156430e`'s sim reproduces exactly the documented RED set (4 red, guard
   green). The suite discriminates the story's claims, not geometry.
2. [TEST] Medium — cross-hazard `!playerHit` guards (sim.ts:436, :530) mutation-unpinned
   (removal stays 905-green). Confirmed; routed to the ruling successor (Delivery Finding).
3. [TEST] Medium — `playerContactIndex` descending tie-break mutation-unpinned (ascending stays
   905-green). Confirmed; quarry evidence gathered this review (`:1284` + `:1450 BCC 35$`);
   routed with observation 2.
4. [VERIFIED] [RULE] All 8 new ROM citations exact against the repo-bundled quarry
   (`reference/atari-source/.../CENTI4.MAC`) AND the `~/Projects/centipede-source` copy under
   universal-newline reading — the rule-checker's offset claim was its own CRLF splitting.
   16 lang-review rules / 27 instances / 0 violations. Dossier edit surgical: CT-70's two
   `JSR PLAY` cites corrected to `:1449`; CT-13's genuine `:1447 ADC X,MOBJH` cites untouched
   (verified pre-edit in the Dev phase, re-verified by the rule-checker).
5. [VERIFIED] [SEC] Purity holds — security subagent ran the TS-compiler purity sweep 22/22;
   no wall clock, no ambient randomness, no shell import; stamps draw no rng, so the replay
   cursor is untouched on every path (attract-demo suite green).
6. [VERIFIED] [SILENT] No swallowed errors introduced — the new branches are pure conditionals
   with no catch/fallback surface; a failed contact simply falls through to the normal frame
   (self-assessed; specialist disabled).
7. [VERIFIED] [EDGE] Boundary walk (self-assessed; specialist disabled): empty `segs` returns
   -1 (loop from length-1 skips); wave-clear + death same frame → death return precedes the
   wave-clear return (unchanged order); fast-flea 0xFF fails the `FLEA_PLAY_PIC_LIMIT` gate so
   ANTMV's check cannot re-kill; the stamped 0xFE segment is excluded from `newd` arming
   (pic ≥ 0x10) and discarded at respawn re-lay.
8. [VERIFIED] [TYPE] New surface is fully typed (self-assessed; specialist disabled):
   `playerContactIndex(Segment[], {h,v}): number`, no casts, no `any`, inline `type` imports in
   the test file; tsc clean.
9. [VERIFIED] [DOC] The rewritten sim.ts:414-424 comment now states the probe-proven phasing
   (OVRLAP pre-step vs ANTMV post-move) instead of the refuted generalization; the tie-break
   docstring's ROM claim gained corroborating quarry evidence this review (self-assessed;
   specialist disabled).
10. [SIMPLE] No unnecessary complexity (self-assessed; specialist disabled): the three checks
    reuse the ONE diamond implementation via delegation; one PLAYEX construction (guard green);
    no new abstractions beyond the index-returning variant the stamp requires.

**Pattern observed:** stamps applied at each ROM caller's own mainloop site, funneling to a
single PLAYEX construction — sim.ts:370-381 (MOTION), :436-439 (BUGMV), :530-534 (ANTMV),
death return :560-577. This is the reference branch's design ported minus its unratified
death-frame stepper gates, and the strip is logged and stamped as a deviation.

**Error handling:** N/A surface — pure sim; failure modes are behavioral, covered by the
mutation-proven suite.

### Rule Compliance

Rule-checker ran the full typescript.md checklist (13 numbered checks) plus 3 repo rules
against every changed .ts file: 27 instances enumerated, 0 violations (full table in the
subagent's report; spot-confirmed #1 no-escapes, #5 `import type` usage, #8 test quality
against the diff myself). Repo-specific rules: purity (rule 14) — pass, 22/22 sweep; ROM
citation convention (rule 15) — pass, 8/8 exact; single-PLAYEX construction (rule 16) — pass,
count exactly 1 at sim.ts:573 with the spider.test.ts scanner still armed.

### Devil's Advocate

Assume this diff is broken. The strongest attack: the one-death-per-frame guards are new,
untested behavior — if a refactor drops one, a segment kill's frame would also stamp a
contact-adjacent spider, and nothing goes red; worse, the double-stamp is exactly the ROM's
behavior REVERSED (the ROM freezes the spider's caller entirely). I confirmed the exposure by
mutation and chose to route rather than block — but the honest cost is that until the ruling
successor lands its fixtures, this seam is protected only by review memory, recorded in three
places (finding, audit entry, deviation stamp). Second attack: the MOTION check now reads the
pre-move gun, so a gun sliding INTO a marching head's window mid-frame survives where the old
consolidated check would have killed — is that a regression? The quarry says no: MOTION (:30)
runs before MOVE (:32), so the cabinet also tests the pre-move gun; the old post-move read was
the unfaithful one. But no test stages a moving-gun contact frame, so this fidelity claim rides
on the mainloop order citation alone. Third: the slow-flea test asserts the flea is stamped
0xFF — but if `stepFlea`'s move had consumed rng on the staged frame, the fixture's
determinism would silently depend on seed 0x1234's draws; the ANTMV mushroom-seed path draws
only on the every-4-frames branch (:110-112), and the staged frame passes — fragile-looking
but deterministic. Fourth: the pause now freezes a stamped killer at 0xFE where the cabinet
may animate it through the death pause (EXPLOD's DELAY gating is unverified) — cosmetic,
unpinned, and now attached to the routed ruling where it belongs. None of these attacks
surfaces a Critical or High defect; each is either ROM-corroborated, mutation-checked, or
explicitly routed with an owner.

**Deviation audit:** all 6 TEA/Dev entries stamped ACCEPTED (with evidence added to two); one
undocumented deviation added under Reviewer (audit) — the cross-hazard guard gap — severity M,
routed.

**Verdict rationale:** zero Critical/High. The two confirmed findings are Medium
missing-edge-case coverage gaps inside scope TEA explicitly deviated-and-flagged, and their
correct home is the death-frame-gates ruling successor whose subject IS the multi-collider
frame. Every AC-bearing test is mutation-proven load-bearing; rules 16/16 clean; purity and
determinism intact; citations 8/8 exact.

**Handoff:** To SM for finish-story. SM: the two routed fixtures + the pause-regime datum must
land in the ruling successor's context when it is filed.
## Impact Summary

_Compiled manually by SM at finish (the auto-writer was deliberately not run; findings below
are restated from this file's Delivery Findings with their final dispositions)._

**Blocking:** none. All findings non-blocking; review verdict APPROVED; PR centipede#36
squash-merged to develop as `359c7fe` by the user 2026-07-27.

**Routed to cp2-17 (filed at this finish, 3pt backlog):**
- TEA Conflict — death-frame stepping ruling: ROM BUGMV/ANTMV freezes (`:289-291`/`:50-56`)
  vs #35's every-stepper-runs replay stability (attract demo depends on draw cadence).
- Reviewer Gap — two mutation-proven Medium fixtures for the multi-collider frame:
  cross-hazard `!playerHit` guards and the NCENT-1-descending tie-break (quarry evidence
  `:1284` + `:1450` recorded in the review).
- Reviewer datum — the death PAUSE freezes a stamped 0xFE explosion (stepDeathFrame runs no
  EXPLOD); pause-regime belongs to the same ruling.

**Resolved in the merged code (`359c7fe`):**
- TEA Gap — dossier `JSR PLAY` mis-cites: CT-70's two `:1447` → `:1449`. Dev correction of
  record: the finding's "FOUR places" overcounted — CT-13's two `:1447` cites are the genuine
  `ADC X,MOBJH` and were correctly left untouched.
- TEA Gap — the refuted sim.ts "Do not 'fix' this by passing the post-step flea" comment,
  rewritten with the probe-proven ANTMV phasing.

**Open (fidelity backlog candidates, no story yet):**
- Dev Gap — #35's shot-advance-at-frame-top lets a mushroom score on a death frame where the
  cabinet's blanked SHOTP dies unspent; pre-existing, unobserved by any test.

**Recorded, no action:** Reviewer Improvement — the "stale quarry copy" alarm on
`~/Projects/centipede-source` was a CRLF newline artifact; both copies identical at every
cited line; canonical cite path is the repo-bundled `reference/atari-source/...` quarry.
