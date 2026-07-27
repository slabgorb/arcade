---
story_id: "cp2-15"
jira_key: "cp2-15"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-15: Frame order — reproduce the ROM mainloop sequence so PLAY precedes SHOOT and SHOOT scans slot 13 first

## Story Details
- **ID:** cp2-15
- **Jira Key:** cp2-15
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** centipede
- **Branch:** fix/cp2-15-frame-order-rom-mainloop

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T07:39:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T06:58:36Z | 2026-07-27T07:01:26Z | 2m 50s |
| red | 2026-07-27T07:01:26Z | 2026-07-27T07:22:52Z | 21m 26s |
| green | 2026-07-27T07:22:52Z | 2026-07-27T07:34:34Z | 11m 42s |
| review | 2026-07-27T07:34:34Z | 2026-07-27T07:39:43Z | 5m 9s |
| finish | 2026-07-27T07:39:43Z | - | - |

## Story Context

This is a frame-order bug fix that reorders shared code in the sim to reproduce the ROM mainloop sequence. The fix addresses two findings from cp3-1's review that are rooted in the same cause: checkPlayerContact (PLAY) runs too late, and shot resolution scans creatures in the wrong order.

### Current Frame Order (stepPlayingFrame)
1. movePlayer + stepShot
2. resolveShotHit (segments) ← SHOOT, segments
3. stepCentipede + stepExplosions
4. stepSpiderExplosion + stepSpider + resolveSpiderShotHit (spider)
5. stepSpiderKillTimer
6. stepFleaExplosion + resolveScorpionShotHit + resolveFleaShotHit
7. stepScorp + stepFlea
8. awardBonus
9. **checkPlayerContact (gun contact)** ← WRONG: should be before SHOOT

### Correct ROM Order (CENTI4.MAC:30-34)
1. MOTION (:30) — centipede steps
2. EXPLOD (:31) — explosion countdown
3. **PLAY (:33, called from BUGMV)** — gun contact (PLAYER dies if hit)
4. SHOOT (:34) — shot collision, scans slots 13→0, first match exits loop

### The Two Bugs

**Bug 1: PLAY-vs-SHOOT order**
- ROM: PLAY kills player (MOBJP=0xFF), then SHOOT skips the slot, no points
- Sim: resolveShotHit runs first, creature dies, player lives, points awarded (wrong)
- Fix: move checkPlayerContact BEFORE resolveShotHit

**Bug 2: SHOOT scan order**
- ROM: scans slots descending from 13 (spider → flea/scorpion → segments)
- Sim: segments first, then spider, then flea/scorpion (wrong)
- On frame matching both spider and segment window: ROM kills spider (300/900/600), sim kills segment (10/100)
- Fix: reorder resolveSpiderShotHit before resolveShotHit

### Inherited Regression Surface (AC-3)

All of these are affected because they call stepPlayingFrame or step:
- cp2-3/4/5: segment motion, collision, death, RESTOR
- cp3-1: spider lifecycle
- cp3-2: flea ANTMV
- cp3-3: scorpion SCORP
- cp3-4: fragmented train
- cp4-7: attract demo auto-play

All existing tests must re-pin (not weaken).

### ROM Citations (reference/atari-source/centipede/revision.v4/CENTI4.MAC)
- :30 MOTION
- :31 EXPLOD
- :33 mainloop calls PLAY from BUGMV
- :34 mainloop SHOOT
- :417 PLAY (inside BUGMV)
- :1806 PLAY stamps MOBJP=0xFF
- :2171 SHOOT slot loop: LDX I,13.
- :2177-2178 SHOOT skips dead slot
- :2202 window: |dV|<5
- :2232 spider window: |dH|<10. (decimal)
- :2266 segment window: |dH|<6 (hex)
- :2292-2294 SHOOT loop: DEX/BMI/JMP (descend, first match exits)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): PLAYEX's side-effects are only half-modelled — on a gun death the ROM stamps the COLLIDING slot's picture 0xFF (CENTI4.MAC:1805-1806 "LDA I,0FF / STA X,MOBJP") and blanks the shot (:1807-1808 "LDA I,28 / STA SHOTP"), while the sim leaves the collider alive and visible through the death pause and carries the live shot into the death return. Not pinned by the cp2-15 RED suite on purpose (AC-1 pins the player-dies-no-points outcome only). **Filed as cp2-16.**
  Affects `src/core/sim.ts` (death transition should stamp the collider and blank the shot).
  *Found by TEA during test design.*
- **Conflict** (non-blocking): the story's blanket "PLAY precedes SHOOT" is spider/segment-true but flea-INVERTED in the ROM: the flea's PLAY lives inside ANTMV (:107-108 "LDX I,12. / JSR PLAY"), and ANTMV is mainloop :37 — AFTER SHOOT (:34). The consolidated `checkPlayerContact` reading `state.flea` (last frame's post-ANTMV position, the same phasing argument sim.ts already documents for OVRLAP) reproduces the ROM interleave exactly, so **no code change is needed and no flea both-boxes test was written** — a flea in both boxes takes the SHOOT hit in the ROM. Owned by this story: Dev should state this phasing in the reordered frame's comment so a later reader doesn't "fix" it.
  Affects `src/core/sim.ts` (comment on the reordered frame).
  *Found by TEA during test design.*
- **Improvement** (non-blocking, no action): the sim runs the NEWHD factory after stepScorp/stepFlea; the ROM runs NEWHD at :35, before SCORP (:36)/ANTMV (:37). Proven commutative — stepNewhd touches only segment slots 0-11 and reads no slot-12 state; stepScorp/stepFlea touch only slot 12 — so there is no observable divergence and nothing to file. Recorded to pre-empt a future finding.
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): `stepShot` (shot movement + mushroom collision + its 1-point score, ROM :2150-2168) still runs at the frame top, before PLAY — but in the ROM it is part of SHOOT (:34), AFTER PLAY (:33), and PLAYEX's blank stops it. So a PLAY-death frame whose shot would have hit a mushroom scores 1 point where the ROM scores 0 (and the mushroom is nicked). Same fix surface as the shot-lifecycle work already **filed as cp2-16** (PLAYEX side-effects) — fold the stepShot-after-PLAY ordering into that story.
  Affects `src/core/sim.ts` (`stepShot` position vs the PLAY check).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): two `flea.test.ts` stagings passed `{left, right, fire}` — not the real `InputCounts` shape — giving `movePlayer` a NaN gun that `byteDistance` reads as distance 0 to EVERYTHING (`NaN & 0xff === 0`). Repaired here (it broke under the reorder), but the root is that `stepSim`'s input is structurally untyped at the test seam (dynamic-import casts through `Record<string, unknown>`). A cheap guard — `movePlayer` asserting finite inputs, or tests importing `InputCounts` — would have caught it at write time. Worth folding into any future test-hygiene pass; no dedicated story filed because the two known instances are fixed in this commit and the pattern is now greppable (`grep -rn 'left: 0' tests/`).
  Affects `tests/flea.test.ts` (fixed), `src/core/player.ts` (optional guard).
  *Found by Dev during implementation.*

### Reviewer (review)

- No upstream findings during review — the one Minor (stepShot's mushroom leg preceding PLAY) was already filed by Dev as part of cp2-16, and the mutation battery surfaced no coverage gap.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **What:** AC-1's "written so cp3-2/cp3-3 creatures inherit it" is covered by a slot-12
  DESCENDING-SCAN test (scorpion-beats-segment) plus a segment both-boxes test — NOT by a
  flea both-boxes gun test. **Spec said:** AC-1's blanket wording implies every creature's
  gun contact resolves before SHOOT. **Why:** the ROM itself inverts that for the flea
  (ANTMV, which hosts the flea's PLAY at :107-108, is mainloop :37 — AFTER SHOOT :34), so a
  flea both-boxes test asserting player-dies-no-points would pin behavior the ROM does not
  have. See the Conflict Delivery Finding. The spider (AC-1's named subject) and the
  segment (MOTION :30 before SHOOT :34) are both pinned.
- **What:** the AC-1 tests do not pin the collider's own fate (the ROM stamps it 0xFF at
  :1805-1806) or the shot blank (:1807-1808). **Spec said:** AC-1 cites :1806 as the
  mechanism. **Why:** AC-1's demanded OBSERVABLE is "kills the PLAYER and awards NO
  points" — pinning the stamp would forbid the equivalent skip-resolutions implementation.
  The stamp/blank divergence is real but separable; **filed as cp2-16**.

### Dev (implementation)

- **Segment shot resolution placed at the SHOOT scan's tail, not where the story context's design sketch put it**
  - Spec source: context-story-cp2-15.md, "Design: Reordered Frame Skeleton" steps 3-5
  - Spec text: "checkPlayerContact ← INSERT HERE / resolveShotHit (segments) / [spider block] / [flea block]"
  - Implementation: resolution order is spider (13) → scorpion/flea (12) → segments (11..0); the sketch's segments-before-spider order would have failed AC-2
  - Rationale: AC-2 and the ROM's descending scan (:2171, :2292-2294, CT-32) outrank the context sketch (spec-authority hierarchy); the same file's line "SHOOT tests spider (13) before segments (0-11)" agrees with the AC
  - Severity: minor
  - Forward impact: none — the sketch was internally inconsistent and the AC is what shipped
- **Sibling test repair during GREEN (flea.test.ts, two stagings)**
  - Spec source: TEA's RED handoff (test-maintenance ownership) + AC-3 "re-pinned rather than weakened"
  - Spec text: AC-3 requires existing tests re-pinned, not weakened; Dev normally may not edit sibling tests
  - Implementation: replaced the malformed `{left, right, fire}` inputs with `InputCounts` `{dh, dv, fire}` in the two cp3-2 stagings, with in-place comments explaining the NaN mechanism
  - Rationale: the stagings were objectively malformed (not InputCounts), previously green only because the phantom NaN contact fired after the assertions' subjects had already resolved; the repair strengthens both tests and preserves their exact intent (the order-discrimination staging still fails under an inverted frame)
  - Severity: minor
  - Forward impact: none — pattern greppable, both instances fixed; optional movePlayer guard noted as a Delivery Finding


## Sm Assessment

**Setup complete — story cp2-15 is ready for TEA (RED phase).**

- **Story:** cp2-15, 3pt p2 `bug`, repos: centipede, workflow: tdd. Reviewer-surfaced during cp3-1 review (2026-07-19); fixes two Delivery Findings with one root cause: sim frame order does not reproduce the ROM mainloop (PLAY must precede SHOOT; SHOOT must scan slots descending from 13, first match ends the scan).
- **Race check:** centipede origin fetched; no cp2-15 commits on any origin branch; no open PRs (merge gate clear); no sibling-checkout collision.
- **Staleness note (verified 2026-07-27):** the story's "SHOULD LAND BEFORE cp3-2" clause is overtaken — cp3-2 (#22), cp3-3 (#30), cp3-4 (#24) and all of cp4 (#26–#34) are already on origin/develop. The reorder now touches a frame skeleton with flea (slot 12), scorpion, fragmented-train, and attract-demo consumers; AC-3's re-pin obligation extends to those suites, not just cp2 + cp3-1 spider tests.
- **Branch:** `fix/cp2-15-frame-order-rom-mainloop` cut from origin/develop (d79ffb2, cp4-7). Subrepo clean.
- **Context:** `sprint/context/context-story-cp2-15.md` written fresh (no prior curated context clobbered); includes current stepPlayingFrame order, ROM citation ledger (CENTI4.MAC :33-34/:417/:1806/:2171/:2177-2178/:2202/:2232/:2266/:2292-2294), and the two cp3-1 findings to be marked resolved.
- **Watch items for TEA/Dev:** citation gate (129+ claims) — edits to cited files need re-anchoring (`npm test -- citations`); fix is one shared reorder, not per-creature patches.
- **Jira:** skipped (local YAML tracking only). Story status set `in_progress`.

**Routing:** phased tdd workflow → next agent **tea** (O'Brien), phase **red**.
## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `centipede/tests/frame-order.test.ts` — cp2-15's frame-order pins at the stepSim level: PLAY-before-SHOOT (AC-1) and SHOOT's descending slot scan (AC-2). 5 tests: 4 RED + 1 keep-behavior guard.

**Tests Written:** 5 tests covering AC-1 and AC-2 (AC-3 is a no-regression obligation verified at GREEN/verify, not a new test)
**Status:** RED (4 failing for the verified-right reasons — commit `7c6af67` on `fix/cp2-15-frame-order-rom-mainloop`)

### RED verification (testing-runner + direct cross-check)

- Full suite: **48 files / 900 tests — 896 pass, 4 fail**, all 4 in `tests/frame-order.test.ts`. Runner total matches my direct `npx vitest run` (no scope narrowing). `tsc --noEmit` clean; citation gate 26/26 green (no cited file touched).
- Engagement proven non-vacuous with a temporary probe (deleted before commit): on CURRENT code each staging exercises the wrong mechanism — AC1-spider: spider dies +900, player lives; AC1-segment: head dies +100, player lives; AC2-spider: segment +10, spider survives, mushroom stamped; AC2-scorpion: segment +10, scorpion survives.
- Every cited ROM line was re-opened in `reference/atari-source/centipede/revision.v4/CENTI4.MAC` this session: mainloop :30-:37; PLAY :1775-1799 + PLAYEX :1800-1808; PLAY call sites :108 (ANTMV), :417 (BUGMV), :1449 (MOTION); SHOOT scan :2171-2294.

### Staging design (why these cannot pass by accident)

- **AC1-spider** stages the spider ONE BUGMV step outside both boxes (pre-move |dH|=10 misses the gun :1781 AND the shot :2232), landing one step inside both. This rejects two wrong seams: PLAY-before-BUGMV (pre-move read misses) and SHOOT-before-PLAY (points paid). Only move→PLAY→SHOOT (:342-356→:417→:34) goes green.
- **AC2** stagings put the target dead-centre and keep the co-windowed segment inside its windows both pre- and post-march, so they discriminate scan ORDER only, never staging drift. Score bands double as slot identity (300 spider / 1000 scorpion / 10 segment); the empty-field + no-mushroom assert catches a segment kill even if scores were ever rebalanced.
- All stagings are rng-silent (spider count2 far from 0; parked slot-12/13 defaults draw nothing in one frame; `centin=12` gates the flea spawn before its rng read) — deterministic without seed hunting.

### Rule Coverage

| Rule | How it is covered | Status |
|------|-------------------|--------|
| ts#1 type-safety escapes | no `as any`/`as unknown`; one repo-precedented `as SimState` widening on a Partial spread (same as sim-assembly.test.ts:123) | pass |
| ts#8 test quality | every test asserts concrete values with named messages; probe confirmed non-vacuous engagement | pass |
| repo: core purity | RED touches `tests/` only — `src/core` untouched | pass |
| repo: citation gate | no cited file edited; 26/26 green | pass |

**Rules checked:** the 2 applicable ts-checklist items for a test-only diff + the repo's 2 structural gates
**Self-check:** 0 vacuous tests; the one expected-green test is explicitly labelled GUARD (13-beats-12) with its rationale

### Dev guidance (Julia) — scope and traps

1. **Minimal reorder, one shared change:** move `checkPlayerContact` ahead of ALL shot resolutions (after `stepSpider` — PLAY at :417 reads the POST-move spider) and order resolutions spider(13) → slot-12 scorpion/flea → segments, with segment resolution AFTER `stepCentipede`/`stepExplosions`. Do NOT also reorder the rng-drawing steppers (stepSpider/stepScorp/stepFlea/stepNewhd order stays) — reordering them shifts every replay cursor for zero AC gain.
2. **Preferred death mechanism:** on a PLAY hit, prefer the ROM's own composition — blank/flag the shot (PLAYEX :1807-1808) so the resolutions no-op naturally, keep the steppers running, and build the existing death return at the frame tail. That preserves death-frame rng-draw parity with today's code (attract-demo/death-restor replays stay stable). An early return before the steppers changes death-frame rng draws and may force re-baselines in cp4-7/death suites — legitimate if chosen, but re-pin durations/positions only, never weaken assertions (AC-3).
3. **Known one-frame side-effect of the segment-resolution move:** a shot-killed segment now keeps `EXPLOSION_PIC` (0xFF) through its kill frame (EXPLOD :31 precedes SHOOT :34 — the treatment cp3-1/cp3-2 already give slots 13/12). No existing test pins the current same-frame decrement (swept this session); if one reddens anyway, re-seat per AC-3.
4. **Citations:** `sim.ts`'s reordered comments need new dossier claims for mainloop order (:33 `JSR BUGMV` / :34 `JSR SHOOT`), PLAY-in-BUGMV (:416-417), and the dead-slot skip (:2177-2178) — CT-32 already carries the full descending-scan claim (:2171/:2292-2294) and PLAY windows are CT-49/50/51/SP-15/16. Any edit that shifts lines in cited files needs `npm test -- citations` re-anchoring.
5. **AC-3 closure:** the two cp3-1 Delivery Findings (in `sprint/archive/cp3-1-session.md`) must be marked resolved with the fixing commit hash in the commit message / session, per AC-3.

**Handoff:** To Dev (Julia) for implementation (GREEN).
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/sim.ts` — the reorder, one shared change in `stepPlayingFrame`: MOTION/EXPLOD first (segment resolution removed from its pre-MOTION slot), `checkPlayerContact` (PLAY, CT-102) after `stepSpider` (post-BUGMV read, CT-103) and before ONE descending SHOOT scan — spider (13) → scorpion/flea (12) → segments (11..0, at the scan's tail). A gun contact BLANKS the shot exactly as PLAYEX does (:1807-1808), so the scan no-ops on a death frame (CT-104) and every stepper still runs — the death transition is built at the same tail position as before, so death-frame rng draws are UNCHANGED and no replay re-baselines were needed (TEA guidance option 2, taken).
- `centipede/docs/rom-study/claims/09-centipede-train.json` — new byte-verified claims CT-102 (mainloop :33/:34 PLAY-before-SHOOT), CT-103 (:416-417 PLAY reads the post-move spider), CT-104 (:2177-2178 dead-slot skip).
- `centipede/tests/flea.test.ts` — repaired two stagings that passed a malformed input (`{left, right}` instead of `InputCounts {dh, dv, fire}`): `movePlayer` produced a NaN gun, and `NaN & 0xff === 0` made `byteDistance` read every object as touching the player. Harmless while PLAY ran last; once PLAY ran first the phantom contact blanked the shot before the flea's hit. Repair preserves each test's intent (verified: the PRE-move-position test still discriminates the orders; the flea-on-gun death test now passes because the flea is actually on the gun).

**Tests:** 900/900 passing (GREEN — runner-verified, cross-checked against direct run); citations 26/26 with the 3 new claims; `tsc --noEmit` clean; `npm run build` green.
**Branch:** `fix/cp2-15-frame-order-rom-mainloop` (pushed, `fe9a9aa`)

**AC-3 closure:** both cp3-1 Delivery Findings annotated **RESOLVED by cp2-15 (centipede fe9a9aa)** in `sprint/archive/cp3-1-session.md` (orchestrator commit).

**Fidelity note:** `stepSpider` now reads the frame's score BEFORE any SHOOT scoring — which is the ROM's own order (BUGMV :33 precedes SHOOT :34), so the spider's score-driven ceiling gate is now MORE faithful, not less.

**Handoff:** To Reviewer (The Thought Police) for review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 note | confirmed 1 (flea.test.ts input repair called out — already logged as Dev deviation + finding); 1 prose claim corrected (see below) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by mutation battery M1-M5/M9 + strict-staging analysis |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no swallowed errors; blank-shot path is explicit, no empty catches in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by mutation battery (every mutation killed ⇒ no vacuous assertion in the new suite) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments checked against re-opened ROM lines; CT-102/103/104 byte-verified by the citation gate |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — diff adds no types; one repo-precedented `as SimState` in tests noted by TEA |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure deterministic sim, no input/auth/network surface in diff |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — diff is a reorder + comments; no new abstractions to simplify |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — ts-checklist walked directly in Rule Compliance below |

**All received:** Yes (1 enabled subagent returned; 8 disabled per settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

**Preflight correction:** preflight's prose said `checkPlayerContact` reads a "pre-step spider" — false. The call passes the post-`stepSpider` local (`sim.ts`, the `playerHit` line), and mutation M2 (pre-step read) FAILS the suite, proving the post-move read is load-bearing. Its mechanical results (900/900, lint/build/citations green, 0 smells) stand.

## Reviewer Assessment

**Verdict: APPROVED**

### Mutation Battery (primary adversarial instrument — 8 of 9 specialists disabled)

Six mutations, each a plausible wrong implementation of this story; committed tree, mutate → full 900-test run → revert. **6/6 killed:**

| # | Mutation | Killed by |
|---|----------|-----------|
| M1 | PLAY hit no longer blanks the shot | 2 tests (frame-order AC-1 ×2 — points paid on a death frame) |
| M2 | contact check reads the PRE-move spider | 1 test (AC-1 spider — TEA's one-step-outside staging, built for exactly this) |
| M3 | segment resolution at the scan's HEAD | 2 tests (both AC-2 — segment paid 10 instead of 300/1000) |
| M4 | spider resolution demoted below slot 12 | 1 test (the 13-beats-12 GUARD — the expected-green test is the ONLY kill here; it earns its place) |
| M5 | stepScorp/stepFlea hoisted above the slot-12 resolutions | 2 tests (cp3-2 pre-move-position + source-order companion) |
| M9 | flea leg dropped from checkPlayerContact | 1 test (flea-on-gun death — one of the two Dev-REPAIRED tests; the repair made this kill possible) |

Every ordering leg of the new frame contract has at least one test that dies when it is broken, and the two AC-1/AC-2 halves fail independently.

### Observations

1. **[VERIFIED] PLAY-before-SHOOT with the ROM's own suppression mechanism** — `src/core/sim.ts` (`playerHit` + blank): the blank (`live: false`) makes every resolver no-op via their existing `shot.live` guards; evidence: M1 kill + AC-1 tests. Complies with CT-102/104 (byte-verified claims). ROM lines :33-34/:1805-1808/:2177-2178 re-opened this session by TEA and match.
2. **[VERIFIED] Descending scan 13→12→segments with first-match-exits** — resolution sequence in the SHOOT block; each resolver consumes the shot; evidence: M3/M4 kills + AC-2's segment-survives asserts. Complies with CT-32.
3. **[VERIFIED] No replay/rng regression** — the reorder moved only rng-free calls (`checkPlayerContact`, `resolveShotHit`) and the blank-not-return choice keeps all steppers running on death frames; evidence: full suite green with ZERO re-baselines — attract-demo (cp4-7), death-restor, centis-speed, newhd-factory replays byte-identical.
4. **[VERIFIED] Death-frame shot is now blanked in the returned state** — the death return carries `live: false`, matching SHOTP=0x28; cosmetically MORE faithful (no shot rendered during the death pause). No test pins the old behavior (suite green).
5. **[VERIFIED] The flea.test.ts repair is a strengthening, not a goalpost move** — the `{left,right}` input produced a NaN gun (`NaN & 0xff === 0` ⇒ `byteDistance` 0 to everything); the repaired tests still discriminate the order contract (M5 kill) and now earn their pass (M9 kill). The repair is precisely documented in-file and in the Dev deviation.
6. **[VERIFIED] Wave-clear and NEWD semantics unchanged** — the kill still lands before the wave-clear test and the arming check excludes exploding pics (`pic < 0x10`); evidence: shoot-train/flea-live wave-clear tests and newhd-factory suite green.
7. **[MINOR, accepted] `stepShot` (mushroom leg of SHOOT) still precedes PLAY** — a PLAY-death frame whose shot would hit a mushroom scores 1 where the ROM scores 0. Correctly routed: **filed as cp2-16** (Dev finding). Not blocking: one point, rare frame, invisible to all ACs.

### Rule Compliance (ts lang-review walked directly; rule-checker disabled)

- **#1 type-safety escapes:** no `as any`/`as unknown`/`@ts-ignore` in diff; `as SimState` (tests) is a repo-precedented Partial-spread widening (sim-assembly.test.ts:123), not a bypass. Compliant.
- **#2 generics/interfaces:** no new types or signatures in diff. N/A-compliant.
- **#4 null/undefined:** `checkPlayerContact`'s optional params handled by existing guards; no `||`-vs-`??` sites added. Compliant.
- **#8 test quality:** no `as any` in assertions, no mock-type drift, every new test kills ≥1 mutation. Compliant.
- **Repo purity rule:** `src/core` diff imports nothing new; purity + purity-scanner suites green. Compliant.
- **Repo citation rule:** three new claims byte-verified against the vendored CENTI4.MAC (leading tabs preserved); gate 26/26. Compliant.
- **Security/tenant rules:** no input, auth, network, or tenant surface exists in this pure sim. N/A.

### Deviation Audit

- TEA dev.1 (flea both-boxes not pinned) — UPHELD: the ROM's ANTMV-after-SHOOT interleave is real (call sites :107-108/:37 verified); pinning the story's blanket wording would pin a falsehood. Conflict finding + in-code comment both landed.
- TEA dev.2 (collider stamp not pinned) — UPHELD: separable divergence, properly **filed as cp2-16**; pinning it would forbid the equivalent implementation this diff chose.
- Dev dev.1 (segments at scan tail vs context sketch) — UPHELD: the context sketch was internally inconsistent; AC-2 is the higher authority and the shipped order matches the ROM.
- Dev dev.2 (sibling test repair) — UPHELD with scrutiny: repair verified minimal (input shape only), intent preserved (M5/M9 kills), disclosure complete.

### Devil's Advocate

Suppose this reorder is subtly wrong. The most dangerous corner is the death frame itself: the blank-shot design lets every stepper run after the player is already dead — could a post-death stepper corrupt state the death pause then freezes? stepScorp/stepFlea can move slot 12 and stamp mushrooms on a frame the ROM also runs them (the ROM's mainloop does not stop at PLAYEX either — :36/:37 execute regardless), so the sim errs on the ROM's side; and the death return snapshots `flea` AFTER those steps exactly as the pre-reorder code did. Second angle: the contact check reads `state.flea` while the death return carries the STEPPED flea — is there a frame where the flea kills the player and then steps out of the gun box, leaving a corpse-free death? Yes — and that is precisely the ROM's phasing: ANTMV moved the flea last frame, PLAY kills this frame, ANTMV moves again before the freeze. Third angle: double-counting — could a creature die to the shot AND kill the player in one frame now? No: the blank precedes all resolutions, so contact ⇒ no kills; conversely a shot kill cannot precede contact because the check runs first. Fourth: the one-frame score staleness in `stepSpider`'s ceiling gate (reads pre-SHOOT score) — verified this is the ROM's own order (BUGMV :33 before SHOOT :34), an accidental fidelity GAIN. Fifth: could the M4 guard test pass vacuously if the scorpion staging drifted out of window? No — its miss would leave the scorpion alive but also pay the spider band from a DIFFERENT staging error; the battery proved the test dies when the order flips, which is the property that matters. The corner I cannot fully dismiss is cp2-16's scope (collider stamp + stepShot ordering) — but it is filed, non-blocking, and invisible to every current consumer.

### Verdict rationale

No Critical or High findings. One Minor, filed forward (cp2-16). All three ACs met with mutation-proven coverage; AC-3's archive annotations verified present (`sprint/archive/cp3-1-session.md`, RESOLVED notes citing `fe9a9aa`). Mechanical gates: suite 900/900, tsc, build, citations 26/26, 0 smells.

**Handoff:** To Winston Smith (SM) for finish — PR creation + merge per repo convention (squash, `(#N)` suffix).
## Impact Summary

**Story:** cp2-15 — frame order: reproduce the ROM mainloop so PLAY precedes SHOOT and SHOOT scans slot 13 first (3pt bug, centipede, tdd)
**Outcome:** APPROVED (round 1) and MERGED — centipede PR #35, squash `156430e` on `origin/develop` (branch `fix/cp2-15-frame-order-rom-mainloop`, RED `7c6af67` + GREEN `fe9a9aa`). Suite 900/900 re-run on the merged base; citations 26/26; tsc + build green.
**Blocking:** 0 blocking items. All findings non-blocking and routed.

**What shipped:**
- `stepPlayingFrame` now runs MOTION/EXPLOD → BUGMV → PLAY (post-move spider read, CT-102/103) → ONE descending SHOOT scan (spider 13 → scorpion/flea 12 → segments 11..0, CT-32), with a gun contact blanking the shot the way PLAYEX does (CT-104) so death frames score nothing while every stepper still runs — zero rng/replay shift.
- `tests/frame-order.test.ts`: 4 order pins + 1 guard, all mutation-load-bearing (reviewer battery 6/6 killed).
- Dossier claims CT-102/103/104, byte-verified.
- Two `flea.test.ts` stagings repaired (malformed `{left,right}` input → NaN gun); intent preserved and proven by mutation kills.
- Both cp3-1 frame-order Delivery Findings marked RESOLVED (with `fe9a9aa`) in `sprint/archive/cp3-1-session.md`.

**Descopes and routing (every one filed or owned):**
- PLAYEX collider stamp + shot blank in the returned death state, and the stepShot-mushroom-before-PLAY ordering nuance — **filed as cp2-16**.
- Flea PLAY interleave (ANTMV after SHOOT) — no defect; modelled correctly by the pre-move read, documented in the frame comment (owned by this story, shipped).
- NEWHD-vs-SCORP mainloop position — proven commutative, no observable divergence, nothing to file.
- InputCounts shape guard at the test seam — both known instances fixed in this story; pattern greppable; flagged for any future test-hygiene pass (no story: no remaining instance to fix).
