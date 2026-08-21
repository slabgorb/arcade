---
story_id: "df8-4"
jira_key: "df8-4"
epic: "df8"
workflow: "tdd"
---
# Story df8-4: Player laser ROM-faithful (travel speed, edge fire, beam shape)

## Story Details
- **ID:** df8-4
- **Jira Key:** df8-4
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** fix/df8-4-laser-rom
- **PR:** (none yet - recorded when the PR is created)
- **Stack Parent:** none

## Background

Playtest 2026-08-20: the laser "feels weak and slow to fire". Root causes, all verified
against reference/original-source/defender/DEFA7.SRC (ROM canonical):
1. Travel ¼ speed — laser.ts STEP=0x100 vs the ROM's $400/tick head advance
   (LASR1 `LDA #4` :2799 × `LEAX $100,X` :2805, `STX PD,U` :2810).
2. Auto-repeat fire — sim.ts:607 fires every held tick; the ROM's SSCAN
   (DEFA7.SRC:760-796; SWTAB→LFIRE DEFB6.SRC:1845) is one dispatch per switch closure.
3. 4-px streak — scene.ts LASER_LENGTH=4 vs the ROM's laid beam: 4×$11 body bytes +
   $99 bright tip (:2801-2810, $500 head span ≈ 10 px) + 3 FISTAB fissle bytes via the
   PD+2 trail (:2811-2823) ≈ 15-16 px total at the port's ~1.95 px/$100 projection.

## TEA Assessment

**Tests Required:** Yes
**Reason:** behavioural bug fix with ROM-pinnable magnitudes.

**Test Files:**
- `plugins/defender/tests/df8-4-laser-rom.test.ts` — 11 tests: AC1 travel $400/tick
  (3), AC2 edge-per-press fire + cap guard (3), AC3 ROM beam length/tip (3),
  AC4 determinism + pt1-27 y-capture guards (2).

**Tests Written:** 11 tests covering 4 ACs — 8 RED (the three defects), 3 GREEN by
design (cap-unchanged / determinism / y-capture regression guards).
**Status:** RED (verified failing for the right reasons — see handoff for output)

**Handoff:** To Dev for implementation (`.session/df8-4-handoff-red.md`)

## Design Deviations

### TEA (test design)
- **Beam shape pinned by robust properties, not pixel-match:** Spec/ROM lays an exact
  multi-part beam (4×$11 + $99 + 3 FISTAB fissle bytes, and a $100/tick erasing tail
  via PD+4, :2824-2825 — the beam actually STRETCHES $300/frame between tail and head).
  Tests pin the robust ROM properties instead: span ≥ 9 px (the $500 head span under
  floor projection), ≤ 40 px sanity, body ink = palette 1 ($11), leading pixel =
  palette 9 ($99), mirrored for LASL. Reason: fissle values are FISTAB-random and the
  floor projection collapses byte-columns; an exact pixel-match would pin projection
  artefacts, not the ROM. The stretching tail (PD/PD+2/PD+4 three-pointer beam) is
  left to Dev's discretion — a fixed-length laid-beam reading satisfies the tests.
- **3 guard tests pass at RED:** cap-unchanged, determinism, y-capture are regression
  guards over invariants the fix must NOT move; they are green today by design
  (green-guard precedent, lang-review #15).

### Reviewer (audit)
- **ACCEPTED** — beam pinned by robust properties, not pixel-match: FISTAB values are
  rand-driven and the floor projection collapses columns; an exact match would pin
  projection artefacts. The pinned properties (span ≥9, body $11, leading pixel $99,
  mirrored) are the ROM-load-bearing ones.
- **ACCEPTED** — 3 guards green at RED: lang-review #15 precedent; the test-analyzer's
  mutation battery proved all three load-bearing (cap 4→5, determinism, y-capture
  state each redden the new suite).
- **ACCEPTED** — fixed-length laid beam, not the stretching PD/PD+2/PD+4 three-pointer:
  TEA's handoff sanctioned it; the stretch would thread per-laser tail state through
  the pure core for no test-visible property.
- **ACCEPTED** — `rt.prevFire` assigned after the gate, not at the prevThrust site:
  verified in control flow (gate reads it at sim.ts:614, assignment at :618; the
  prevThrust site is :540, which executes BEFORE the fire gate — assigning there would
  make `input.fire && !rt.prevFire` always false on the press tick). Ordering claim correct.

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): df8-4 is not materialized in `sprint/epic-df8.yaml` (stories
  stop at df8-3) though df8-2's session already referenced "df8-4's description".
  Affects `sprint/epic-df8.yaml` (SM should add the story entry before finish).
- **Gap** (non-blocking): at $400/tick the head moves ~7.8 px/tick while
  `hitTestLasers` (sim.ts:830) samples only the head's per-tick position — narrow
  targets between samples can be tunnelled through. The ROM effectively collides the
  laid contiguous beam (LCOL near the head each frame over a beam that stretches
  $300/frame). Affects `plugins/defender/src/core/sim.ts` (consider sweeping the
  traversed $400 span per tick); today's wall tests use dense walls and still hit,
  so non-blocking — but single-enemy shots will feel misses.
- **Improvement** (non-blocking): laser.ts's D2 header comment (and laser.test.ts's
  D2 block, :65-73) documents STEP=0x100 as a deliberate placeholder — both comments
  must be rewritten when STEP becomes the ROM $400 (no longer a placeholder).

### Dev (implementation)
- **AC3 beam ported as a fixed-length laid beam, not the stretching three-pointer:** Spec/ROM
  stretches the beam $300/frame between an erasing tail (PD+4, $100/tick) and the head
  ($400/tick), with 3 FISTAB fissle bytes through PD+2. Implemented a fixed-length laid beam:
  2 px palette-9 tip at the head + 8 px palette-1 body behind (≈ the $500 head span through
  the 64*292/9600 projection). Reason: TEA's handoff explicitly sanctions it ("a fixed-length
  laid beam passes... port [the stretch] only if cheap") — the stretch needs per-laser tail
  state threaded through the pure core for no test-visible property; minimalist discipline says no.
- **`rt.prevFire` updates after the fire gate, not at the prevThrust site (~sim.ts:536):**
  the gate at the fire call site reads `!rt.prevFire`, so updating at :536 (before the gate)
  would make the edge never fire. The update is unconditional, immediately after the gated
  fire block — same semantics as the prevSmartBomb/prevHyperspace idiom.

### Reviewer (code review)
- **Gap** (blocking): the pt1-27 dragged-shot regression guard is now VACUOUS. Proven by
  mutation: reverting `hitTestLasers`'s query row to the ship's live row
  (`y: laser.y` → `y: state.ship.y`, sim.ts:917) leaves the ENTIRE 1210-test defender
  suite green — including pt1-27 AC3, whose whole purpose is to redden under exactly that
  mutation. Cause: at the $400/tick step the single tick-0 laser dies ~tick 30, but the
  ship (1..2 rows/tick from row 120) only reaches the rows-40..50 pod band ~tick 47 — the
  discriminating window (laser in flight while the ship sits in the wall band) no longer
  exists. Affects `plugins/defender/tests/pt1-27-laser-y-capture.test.ts` AC3 (re-stage so
  the wall overlaps the SHIP's rows during the ~30-tick flight, e.g. pods banded across
  rows ~60..100 with a no-pod-hit assertion, and verify the ship.y mutation reddens it).
  The rewritten AC3 comment ("a shipRow-based query would mow the wall down",
  pt1-27-laser-y-capture.test.ts:191-194) is FALSE at HEAD and must be corrected with the
  re-stage. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `df8-4-laser-rom.test.ts:21` cites "the prevThrust edge
  idiom already in sim.ts (:534-536)" — this PR's own sim.ts insertions (prevFire decl +
  init) shifted the idiom to :538-540; :534-536 now lands on the df6-2 prose comment
  above it. Cite by name or fix the range. *Found by reviewer-comment-analyzer.*
- **Question** (non-blocking, for SM): df8-4 is still not materialized in
  `sprint/epic-df8.yaml` (TEA's earlier finding stands — add before finish).

### Reviewer (code review — round-trip 1)
- The round-1 blocking Gap (vacuous pt1-27 AC3 guard) is RESOLVED — see the round-trip-1
  assessment: the `laser.y → state.ship.y` mutation now reddens the re-staged arm. Not a
  new finding, recorded here for the delivery trail.
- **Improvement** (non-blocking): `laserOnlyState`/`beamPixels` in
  `plugins/defender/tests/df8-4-laser-rom.test.ts` end with `} as SimState` casts that
  `tsc --noEmit` confirms are unnecessary (the file compiles clean without them). Not a
  rule violation (no `as any`, hides no type mismatch); a tidiness nit for a future sweep.
  *Found by reviewer-rule-checker (FYI) during round-trip-1 re-review.*
- **Question** (non-blocking, for SM): `origin/develop` advanced to `a821b340` during this
  review (a sibling story landed). The branch will need a rebase/trial-merge at finish;
  the reviewed diff (`develop...HEAD` merge-base) is unaffected. Affects the finish flow.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/laser.ts` - STEP 0x100 → 0x400 (LASR1 ×4 LEAX $100 + STX PD,U, DEFA7.SRC:2799-2810); placeholder comment rewritten to the ROM cite. MAX_LASERS=4 untouched.
- `plugins/defender/src/core/sim.ts` - `prevFire: boolean` on SimRuntime (decl + init false); fire gated on the rising edge (SSCAN :760-796); prevFire updated unconditionally after the gate.
- `plugins/defender/src/core/scene.ts` - LASER_LENGTH=4 flat streak replaced with the ROM-laid beam: LASER_TIP_COLOUR=9 ($99, :2808-2809) 2 px at the leading edge + LASER_BODY_PX=8 of palette-1 ($11, :2801) behind, mirrored for left (LASL1 :2848-2859).
- `plugins/defender/tests/pt1-27-laser-y-capture.test.ts` - re-staged for the ~30-tick flight (AC2 climb 30→20 ticks; AC4 climb 60→20, park assertion → ≥25-row drop; stale ~2 px/~113-tick comment math fixed). AC3 wall tests untouched and green.
- `plugins/defender/tests/df3-6-live-sim.test.ts` - held-fire cap test converted to pulsed presses (i % 2), assertion tightened to peak === 4 (held fire is one edge → vacuous).
- `plugins/defender/tests/laser.test.ts` - D2 comment marked SUPERSEDED by df8-4 (assertions unchanged, all green).
- `plugins/defender/tests/df5-7-visual-playtest.test.ts` - stepUntil accepts an input function; lander-kill score test pulses fire (held FIRE = one laser over 20k ticks).
- `plugins/defender/tests/df5-9-world-scroll.test.ts` - scrolled-camera COLIDE test pulses fire (same reason).
- `plugins/defender/tests/df6-4-audible-playtest.test.ts` - lander-wall audibility test pulses fire; renamed "holding" → "pulsed".
- `plugins/defender/tests/df6-1-audio-events.test.ts` - seed-42 cue-stream fingerprint re-baselined (289 → 306 cues, hash af61f05958d98f14) with the file's documented RE-BASELINED comment; the script's own fire pulses were already distinct edges, so cadence is unchanged — only kill timing shifted.

**Tests:** 1210/1210 passing across 95 defender files (GREEN); the 11 df8-4 tests pass. `npm run lint` clean.
**Branch:** fix/df8-4-laser-rom (pushed, commit bf77ed7b)

**Tunneling (TEA's non-blocking finding, verified):** head step ≈ 7.8 px/tick
((0x400>>2)*292/9600) vs LASER_BOX width 8 — consecutive per-tick head samples overlap by
~0.2 px, so the swept row is gap-free and nothing ≥1 px wide can be tunnelled. pt1-27's AC3
wall tests pass unmodified. The margin is thin: any further speed-up or a narrower LASER_BOX
opens real gaps — a follow-up sweeping the traversed span would make it robust.

**Handoff:** To review

**Round-Trip Count:** 1

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | pt1-27 dragged-shot regression guard vacuous — with `hitTestLasers` mutated back to `y: state.ship.y` (the pt1-27 bug), all 1210 defender tests stay green; AC3's discriminating window (laser in flight while the ship sits inside the pod band) no longer exists at the ~30-tick flight | `plugins/defender/tests/pt1-27-laser-y-capture.test.ts:189-215` (AC3) | Re-stage AC3 so a pod wall overlaps the ship's rows DURING the laser's flight (ship traverses ~rows 60..100 in ticks 1..30; wall there + assert no `pod-hit`), prove the `ship.y` mutation reddens it, and correct the now-false AC3 comment (:191-194) and the Dev Assessment's "AC3 wall tests untouched and green" implication |
| [LOW] | Self-shifted line-pin: "sim.ts (:534-536)" for the prevThrust idiom — this PR's own prevFire insertions moved it to :538-540 | `plugins/defender/tests/df8-4-laser-rom.test.ts:21` | Cite the idiom by name or fix the range (fold into the HIGH fix commit) |

**Data flow traced:** `input.fire` (shell input) → `stepSim` edge gate (sim.ts:614 reads
`rt.prevFire`, :618 assigns it unconditionally AFTER the gate — ordering verified against
the prevThrust site at :540) → `_laserBank.fire(plax16, shipFacing, shipRow)` (pt1-27 row
capture intact) → travel process at STEP=0x400/tick (laser.ts:50) → `hitTestLasers` query
at `laser.y` (sim.ts:917) → `composeFrame`/`drawLaserStreak` tip-then-body (scene.ts).
Safe: `prevFire` is plain carried state on `_rt`, no clock/random — determinism pinned by
AC4 and the df6-1 replay guards.

**Pattern observed:** good — the prevSmartBomb/prevHyperspace edge idiom reused correctly
(sim.ts:583-586 vs :614-618); ROM literals pinned in the test from DEFA7.SRC, not module
exports (df8-4-laser-rom.test.ts:60-74, lang-review #26).

**Error handling:** `bank.fire` returns null at the cap and the cue only pushes on a real
spawn (sim.ts:615-616); off-window targets excluded via `toScreenCol` null (sim.ts:852).

**Observations (verified good):**
1. STEP=0x400 verified against DEFA7.SRC bytes myself: `LDA #4` + 4× `STB ,X / LEAX $100,X`,
   then `LDB #$99 / STB ,X / STX PD,U` — head advances $400/frame, tip stored AT the new
   head; LASL mirror `LEAX -$100,X` confirmed. $11/$99 nibbles = palettes 1/9 (palette.ts
   labels LASER/WHITE). MAX_LASERS=4 untouched (laser.ts:32).
2. SSCAN edge-per-closure verified (two-sample history, `COMA`/`ANDA` newly-closed mask;
   SWTAB first entry `FDB LFIRE`).
3. df6-1 re-baseline 289→306 verified by MEASUREMENT, not just reasoning: cue-composition
   probe on origin/develop vs HEAD worktrees — laser-fire cues 8→28 (the $100 crawl kept
   all 4 slots full so only 8 of 40 pulsed presses fired; $400 recycles slots in ~38 ticks),
   lander-hit 1→3, astro-land/scream appear. More shots + more kills — the exact claimed
   mechanism, no masked regression. Replay + seed-divergence guards unchanged; the file's
   RE-BASELINED idiom followed (6th entry).
4. The 5 other test edits weaken nothing (independent mutation battery concurs): df3-6's
   cap test STRENGTHENED (≤4 → exactly 4 with reach); df5-7/df5-9/df6-4 pulse conversions
   keep their kill/score/sound predicates intact; laser.test.ts comment-only.
5. Tunneling arithmetic verified: head step 4×(64·292/9600)≈7.79 px/tick < LASER_BOX
   width 8 (sim.ts:90) — consecutive samples overlap ~0.2 px, nothing ≥1 px tunnels.
   Margin is thin; TEA's non-blocking sweep-the-span follow-up stands.
6. Purity/core-boundary: purity sweep green; prevFire is deterministic carried state;
   raster beam drawn in core/scene.ts composeFrame as required.
7. Independent verification: `npx vitest run --project defender` → 95 files / 1210 tests
   pass; `npm run lint` clean; working tree clean (all probes ran in throwaway worktrees,
   since removed).

**Handoff:** Back to Dev — one test-file re-stage (pt1-27 AC3) + the line-pin nit; no
production code change required.

## Subagent Results

**Cycle: 1**

Method: full re-run of the enabled subagents against the whole PR diff (`develop...HEAD`),
combined with my own targeted mutation re-verification of both round-1 findings. Six
subagents are DISABLED in `workflow.reviewer_subagents` (lean-review config) — pre-filled
as Skipped/disabled per the completion gate; they do not block.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 1210/1210 green, lint clean, tree clean — confirmed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | client-only Canvas game, no new attack surface; no entropy in core — confirmed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (1 FYI) | 30 checks / 24 instances / 0 violations; both stale line-pins confirmed absent; 1 non-rule FYI (unnecessary casts) folded to a non-blocking delivery finding |

**All received:** Yes (3 enabled returned, all clean; 6 disabled via config)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 non-blocking FYI deferred to delivery findings

## Reviewer Assessment

**Verdict:** APPROVED (round-trip 1 re-review; supersedes the round-0 REJECTED verdict above)

Both round-0 findings are fixed, and I verified each one myself rather than trusting the
commit message:

- **HIGH (resolved) — the pt1-27 AC3 dragged-shot guard has teeth again.** Round 0 rejected
  because reverting `hitTestLasers`'s query row to the ship's live row
  (`y: laser.y → y: state.ship.y`, sim.ts:917) left ALL 1210 defender tests green — the
  guard was vacuous at the df8-4 $400/tick flight. The rework re-stages the pod wall to
  rows 94+102 (boxes blanket 94..110), which the climbing ship crosses at ticks ~9..20
  while the laser is still sweeping the wall columns, and adds a `flightRows` non-vacuity
  assertion that pins that row-overlap window. I ran the exact mutation in a throwaway
  worktree: the re-staged arm now **REDDENS** (`expected [...] not to include 'pod-hit'`),
  and the unmutated tree is **GREEN** (6/6 pt1-27). The tree was restored and audit-tree
  is CLEAN.
- **LOW (resolved) — the self-shifted citations are gone.** `df8-4-laser-rom.test.ts` no
  longer pins `sim.ts:534-536` or `sim.ts:607`; both now cite by symbol ("the step-7 LFIRE
  block", "the `prevThrust` thrust-start/stop cue edge in stepSim"). reviewer-rule-checker
  independently grepped the whole diff for `\.ts:[0-9]` and confirms zero of our own
  source line-pins remain.

The rework commit (ab226019) touched ONLY the two test files; production code (laser.ts
STEP=$400, sim.ts prevFire edge gate, scene.ts tipped beam) and the other six test edits
are byte-identical to what round 0 already cleared on the merits.

**Data flow traced:** `input.fire` (shell input) → stepSim step-7 edge gate
(`input.fire && !rt.prevFire`, sim.ts:614; `rt.prevFire = input.fire` unconditionally AFTER
the gate, :618) → `_laserBank.fire(plax16, shipFacing, shipRow)` captures the fire row
(pt1-27) → travel at STEP=$400/tick → `hitTestLasers` queries at `laser.y` (sim.ts:917, the
mutation site — proven load-bearing) → `drawLaserStreak` lays tip-then-body. Safe: `prevFire`
is plain deterministic carried state, no clock/random; determinism pinned by AC4 + df6-1 replay.

**Pattern observed:** good — the `prevThrust`/`prevSmartBomb`/`prevHyperspace` edge idiom
reused correctly (edge computed and state updated on stepSim's single execution path, no
early return between; rule-checker verified this against check #14, the most failure-prone
pattern for this change class).

**Error handling:** `bank.fire` returns null at the 4-laser cap and the `laser-fire` cue
only pushes on a real spawn (sim.ts:615-616); off-window enemies excluded via `toScreenCol`
null (sim.ts:852). Input.fire is a required boolean — no nullable path.

**Dispatch tags** (all 8 accounted for; 6 subagents disabled via config, their domains
assessed first-hand where relevant):
- `[TEST]` — reviewer-test-analyzer DISABLED; I verified test quality first-hand: the
  re-staged AC3 is mutation-proven non-vacuous, AC1/AC2/AC3 all redden on their reverts
  (rule-checker concurs), df3-6 cap tightened to `toBe(4)`.
- `[RULE]` — reviewer-rule-checker: 30 checks, 0 violations; citation-anchor + no-self-line-pin
  + core purity all clean. Confirmed.
- `[SEC]` — reviewer-security: clean; no new attack surface, no entropy introduced into core.
- `[EDGE]` — edge-hunter DISABLED; the one behavioural edge (button rising edge, cap boundary)
  is directly covered by AC2's three tests (hold→1, release→re-arm, pulsed→cap 4). No unhandled
  boundary.
- `[SILENT]` — silent-failure-hunter DISABLED; no swallowed errors — the only conditional
  is the fire gate, whose "no spawn" path is the ROM cap and is asserted (AC2 cap test).
- `[DOC]` — comment-analyzer DISABLED; I read every changed comment: the STEP placeholder
  comments (laser.ts, laser.test.ts D2) are correctly rewritten to the ROM $400 cite, and
  the df6-1 rebaseline/pt1-27 re-stage comments match the passing behaviour (rule #17 clean).
- `[TYPE]` — type-design DISABLED; only new type surface is `prevFire: boolean` on
  SimRuntime, matching the sibling `prevThrust`/`prevSucking` booleans. No stringly-typed API.
- `[SIMPLE]` — simplifier DISABLED; the one FYI (unnecessary `as SimState` casts in the new
  test helpers) is the only simplification available and is folded to a non-blocking delivery
  finding, not a blocker.

### Rule Compliance

Enumerated against `.pennyfarthing/gates/lang-review/typescript.md` and the arcade
additional rules, over every changed type/constant/function/test (rule-checker's exhaustive
pass corroborated; my spot-checks in brackets):
- **#1 type-safety escapes** — the `!` non-null on `bank.fire(...)!` is provably safe (fresh
  empty bank under cap); no `as any`/`@ts-ignore` anywhere. Compliant.
- **#14 derived-edge-in-one-branch** — `prevFire` edge computed in the `if`, state updated
  unconditionally after, on stepSim's single path; no early return between. Compliant.
  [verified: sim.ts:610-618 myself].
- **#15 source-text token vs claim** — AC1/AC2/AC3 are behavioural (through stepSim/
  composeFrame), each mutation-reddens. Compliant. [verified: my own STEP/edge/body probes].
- **#17 comment asserts unrun mechanism** — df6-1 hash `af61f05958d98f14` is the actual
  passing value (full suite green); STEP/beam pixel-math checks out. Compliant.
- **#26 assertion terms all test-local** — ROM literals (HEAD_STEP, CAP, BODY_INK, TIP_INK…)
  are deliberately test-local, each compared to a value produced by exercising production
  code, not module exports. Compliant.
- **#29 ordering-for-magnitude** — flight-tick bracket (30..45) and beam-span/body-count are
  magnitude bounds, mutation-verified to catch the old $100 crawl. Compliant.
- **core/shell purity** — no Date/Math.random/performance.now introduced; purity.test.ts
  green (52/52). Compliant.
- **ROM-citation anchors the value byte** — every constant cites the encoding opcode+operand
  (LDA #4, LEAX $100, STX PD,U, LDB #$11, LDB #$99, CMPA #4). Compliant.
- **no `<ourfile>.ts:N` self-citations in defender** — zero remain (grep-verified). Compliant.

### Devil's Advocate

Suppose the fix is theatre. The commit message SAYS the mutation reddens — but round 0 was
rejected for a guard that also looked armed and wasn't, so the message proves nothing. The
real risk: the new non-vacuity assertion (`flightRows.some(r => 94..110)`) pins ROW overlap
only, not COLUMN overlap. A future change that keeps the ship crossing rows 94..110 while
the laser is alive but shifts the laser's COLUMN off the pod band would let non-vacuity pass
while the discrimination silently dies again — the exact failure class round 0 caught. So I
did NOT trust the assertion; I ran the `laser.y → state.ship.y` mutation directly and watched
the arm go RED, and ran the clean tree and watched it go GREEN. At HEAD the column overlap is
real and the guard discriminates — proven, not argued. A malicious refactor could still
re-open the gap in future without tripping non-vacuity; that residual is a known robustness
limit of a row-only tripwire, worth a follow-up (pin the column overlap too), but it is NOT
a defect in THIS diff, which correctly reddens today. Could a held button spawn a runaway
laser stream? No — AC2 proves hold→exactly-one, release→re-arm. Could the beam draw off the
fire row and corrupt an enemy row? No — `beamPixels` asserts every differing pixel is on row
120 (pt1-27). Could the $400 step tunnel a narrow target? Yes at the margin (7.79 px step vs
8 px LASER_BOX, ~0.2 px overlap) — already logged non-blocking by TEA and Dev; dense-wall
tests still hit. Nothing here rises to blocking.

**Observations (verified good):**
1. [VERIFIED] Mutation `laser.y → state.ship.y` at sim.ts:917 reddens the re-staged pt1-27
   AC3 arm — evidence: ran it in a detached worktree, `pod-hit` appears; unmutated GREEN 6/6;
   audit-tree CLEAN after. The round-0 HIGH is genuinely closed.
2. [VERIFIED] Both stale line-pins removed — evidence: diff shows `:607`→"step-7 LFIRE block",
   `:534-536`→symbol; rule-checker grep of `\.ts:[0-9]` returns zero. Complies with the
   defender no-self-line-pin rule.
3. [VERIFIED] Rework is test-only — evidence: `git show ab226019 --stat` touches exactly
   df8-4-laser-rom.test.ts and pt1-27-laser-y-capture.test.ts; production files unchanged
   since round-0 approval.
4. [VERIFIED] Full suite + lint clean at HEAD — evidence: reviewer-preflight and my own run,
   95 files / 1210 tests green, `tsc --noEmit` clean, tree clean.
5. [TEST] The `flightRows` non-vaciuity assertion pins row-overlap but not column-overlap —
   a residual robustness limit (not a defect today, mutation-proven); logged as a follow-up
   candidate, non-blocking.
6. [RULE] reviewer-rule-checker: 30 checks, 0 violations, purity 52/52 green.
7. [SEC] No entropy or attack surface introduced into the deterministic core.

**Design deviations:** all round-0 entries remain stamped ACCEPTED (beam-by-robust-properties,
3-guards-green-at-RED, fixed-length-laid-beam, prevFire-assigned-after-gate). The rework
introduced no new deviations — it only re-staged a regression guard and corrected citations.

**Handoff:** To SM for finish-story.