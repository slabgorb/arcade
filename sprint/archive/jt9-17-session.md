---
story_id: "jt9-17"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story jt9-17: Port OSTLR: the horizontal half of the bounce has no PBUMPX home and bounceHorizontal models a quarter of it

## Story Details
- **ID:** jt9-17
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T20:02:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T19:01:21Z | 2026-08-05T19:03:45Z | 2m 24s |
| red | 2026-08-05T19:03:45Z | 2026-08-05T19:25:38Z | 21m 53s |
| green | 2026-08-05T19:25:38Z | 2026-08-05T19:56:43Z | 31m 5s |
| review | 2026-08-05T19:56:43Z | 2026-08-05T20:02:21Z | 5m 38s |
| finish | 2026-08-05T20:02:21Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): PVELX *is* the FLYX index (`LDA PVELX,U / LDD A,X`, :7150-7158) — the horizontal velocity OSTLR reverses is `velXIndex` itself, and the ±2 slowdown is exactly one flap-step on the EVEN ladder, so reflected values stay on the ladder (|−velX+2| ≤ 8 for velX ∈ [−8,8]). The RED asserts `velXIndex`, not a new pixel-velocity field. Affects `plugins/joust/src/core/demo.ts` (`toJoustEntity` carries `velXIndex`→`JoustEntity.velX`; `withBounced` carries the reflected index, the parked `bumpX` and the turned facing back). *Found by TEA during test design.*
- **Gap** (blocking): the DETERMINISM RE-BASELINE this story WILL trigger is not yet applied — a horizontal shove moves entities, so every seeded replay whose script produces a non-killing contact diverges (same class as jt5-4's vertical re-baseline). This is a FINGERPRINT-MOVER: per the epic's standing rule it must land in its OWN commit, and every moved pin must be re-found by sweeping for its own precondition (a swept first-contact frame), never by nudging a number toward the new output. The pins at risk live in `audio-events.test.ts` (fingerprint 0x1a2b3c4d/240, 0xbeef/2400, 0x2468/900), `audio-flap.test.ts` (entityDigest 0xbeef/200) and `audio-thud.test.ts` (its own re-baseline block). jt5-4's ruling (sprint/archive/jt5-4-session.md:953-993) is the template: only anchors AT OR AFTER a seed's first-contact frame may move; anything strictly BEFORE, the rng cursor across a contact, and the process roster/order are REGRESSIONS. Affects those three test files. *Found by TEA during test design.*
- **Gap** (blocking): B2DIRA (:4148-4150) and SHDIRA (:4379-4381) — the DIRECTION routines' bump-facing arms (`LDA PBUMPX,U / BEQ …/ STA PFACE,U`, turn the enemy to face along the accumulated PBUMPX) — are OWNED by this story but NOT covered by a failing test in this RED (test-omission logged as a deviation). They consume the `bumpX` field this story creates and couple to the steering subsystem; they are currently de-scoped in `plugins/joust/tests/steering-source.test.ts` (write-set membership at :121/:130 + `toContain('PBUMPX,U')` at :122/:131, comment ":114-116 recorded as a Delivery Finding, not scope"). Promoting them needs new `LAWS`/`CITED_RANGES` rows AND committed claims (the `claimCovers` gate). Affects `plugins/joust/tests/steering-source.test.ts` + the claims file. *Found by TEA during test design.*
- **Question** (non-blocking): the PBUMPX drain SEAM. The ROM drains in the flight loop (`WRAPX`, :7270-7288, per-object), but jt5-4 deliberately applied PBUMPY same-frame in `stepDemo` (withBounced docstring, demo.ts:1248-1252) so the cue and physics land together. The drain RED (demo-jt9-17.test.ts, the FROZEN pair) assumes a `stepDemo`-level per-frame drain (frozen objects skip the flight loop but still must drain, matching "drains each frame"). If Dev wires the drain into the flight loop instead, that test's FROZEN staging must change — flag at GREEN. Affects `plugins/joust/src/core/demo.ts` (the drain seam after `collisionPass(materialised)`, ~:1834). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the PBUMPX drain now runs at the TOP of `stepDemo` (draining last frame's parked shove), NOT after `collisionPass`. This was forced by a real observation: a same-frame drain landed inconsistently (some birds next-frame, some same-frame — deterministic per seed but fragile), which made `bumpX` an unreliable marker for the sibling attribution filters. Top-of-frame drain is more ROM-faithful (WRAPX is one frame after OSTLR parks PBUMPX) and makes `bumpX ≠ 0` a RELIABLE end-of-frame marker of a just-happened joust. Affects `plugins/joust/src/core/demo.ts` (`stepDemo`, `drainProcessBumpX`). *Found by Dev during implementation.*
- **Gap** (non-blocking): AC-6 (B2DIRA/SHDIRA bump-facing) is FILED as **jt9-48** (3pt, backlog, `pf sprint story add`), not built here — no failing test, couples to enemy.ts steering, and its provenance promotion trips the claimCovers gate. Its prerequisite (the PBUMPX home) is DONE. Affects `plugins/joust/src/core/enemy.ts` + `plugins/joust/tests/steering-source.test.ts` (owned by jt9-48). *Found by Dev during implementation.*
- **Improvement** (non-blocking): OSTLR turning enemy facing is a THIRD facing-flip cause (besides steering and homing) that reddened four sibling attribution tests TEA never touched (steering-wiring ×2, homing-wiring ×2) — the RED-vs-old-code illusion. Their filters now exclude joust-turns via `bumpX ≠ 0`, restoring the controls soundly. Affects `plugins/joust/tests/steering-wiring.test.ts`, `homing-wiring.test.ts`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Modelled the OSTLR law as a NEW `bounceApartX(leftVelX, rightVelX)` rather than mutating `bounceHorizontal`'s signature**
  - Spec source: context-story-jt9-17.md, Problem ("rewrite bounceHorizontal to return both parties' velocities AND both PFACE writes")
  - Spec text: "rewrite bounceHorizontal to return both parties' velocities AND both PFACE writes"
  - Implementation: added a new pure function `bounceApartX` (both parties + both PBUMPX + both PFACE) and left `bounceHorizontal` (the one-quarter model) in place; the existing `bounceHorizontal(6)` unit pin (joust.test.ts:232) stays green.
  - Rationale: `bounceHorizontal`'s type is also carried by the shared `joust-collision-contract.ts` (:257); mutating it in RED would ripple the contract and could redden unrelated consumers. A new function is functionally equivalent and keeps the RED surgical; Dev MAY consolidate/remove `bounceHorizontal` in GREEN (its only caller-count is zero).
  - Severity: minor
  - Forward impact: Dev decides whether to delete `bounceHorizontal`; if kept, note the two names coexist.
- **No failing test for B2DIRA/SHDIRA bump-facing (:4148-4150 / :4379-4381) in this RED (test omission)**
  - Spec source: context-story-jt9-17.md, Problem ("ALSO OWNED HERE … the DIRECTION routines' bump-facing arms")
  - Spec text: "B2DIRA (:4148-4150) and SHDIRA (:4379-4381) turn the enemy to face along PBUMPX after a collision shove … extend that enumeration's pins rather than re-deriving"
  - Implementation: recorded as a blocking Delivery Finding with exact anchors; not pinned by a failing test here.
  - Rationale: the mechanism reads the `bumpX` field this story creates and couples to the steering decision subsystem; a rigid RED would over-constrain Dev's seam. Promoting the de-scoped steering-source pins also trips the `claimCovers` gate (needs committed claims), which is GREEN-phase work. The collision-face DIRECTION (left→left, right→right) is already pinned by demo-jt9-17.test.ts's facing test at the OSTLR level.
  - Severity: major
  - Forward impact: Dev + Reviewer must close AC-5 — either a behaviour test (a bumped enemy's next steering decision faces along its parked bumpX) or the steering-source.test.ts promotion + claims. Do not let this ship uncovered.
- **No failing test that pins the PBUMPX drain SEAM (flight-loop vs stepDemo per-frame)**
  - Spec source: context-story-jt9-17.md, Problem ("a PBUMPX field that drainBumpX actually drains each frame")
  - Spec text: "give it a PBUMPX field that drainBumpX actually drains each frame"
  - Implementation: the drain RED (demo-jt9-17.test.ts, FROZEN pair) asserts the OBSERVABLE (posX moves ≤3/frame by the parked bump) but assumes a stepDemo-level per-frame drain; it does not pin WHERE the drain lives.
  - Rationale: jt5-4 chose the same-frame stepDemo seam for PBUMPY; the ROM's is the flight loop. Leaving the seam to Dev avoids over-fitting. The ≤3/frame arithmetic is already pinned by joust.test.ts:165-189 (drainBumpX).
  - Severity: minor
  - Forward impact: if Dev picks the flight-loop seam, the FROZEN drain fixture needs re-staging (see the drain-seam Delivery Finding).

### Dev (implementation)

- **Amended demo-jt9-17.test.ts's PBUMPX drain test — the single-shove premise was physically wrong**
  - Spec source: session TEA Assessment, AC-5; demo-jt9-17.test.ts (original drain case)
  - Spec text: "left bird shoved one pixel LEFT by its PBUMPX = -1" (exact-pixel single-shove)
  - Implementation: rewrote it to pin the LAW — per-frame drain ≤ 3 px, monotonic outward, settles — with a larger bump so the 3 px cap is exercised. The entity box is 16 px wide, so frozen birds re-collide (the scan driver re-bounces while overlapping, :4874-4897) and re-park the bump each frame; the code is ROM-faithful, the original test's assumption was not.
  - Rationale: a Dev must not weaken a test to fit code, but this test encoded an incorrect physical premise (no re-collision); the amendment makes it MORE precise (cap + direction + settle), not less.
  - Severity: minor
  - Forward impact: none — jt9-17's other AC-5 pins (drainBumpX unit law) unchanged.
- **Drain seam: TOP-of-stepDemo per-frame, not after collisionPass**
  - Spec source: session TEA Delivery Finding (drain SEAM Question)
  - Spec text: "If Dev wires the drain into the flight loop instead, that test's FROZEN staging must change"
  - Implementation: chose neither the flight loop (frozen birds skip it) nor after-collisionPass (inconsistent timing) — the drain runs at the TOP of `stepDemo` over all processes, spending last frame's parked bump. Frozen birds still drain; timing is uniform; `bumpX` stays visible the frame it is parked.
  - Rationale: ROM-faithful (WRAPX is a frame after PBUMPX is set) AND makes `bumpX ≠ 0` a reliable joust marker for the sibling filters.
  - Severity: minor
  - Forward impact: the FROZEN drain fixture reads posX over multiple frames, so it is agnostic to same/next-frame; no re-stage needed.
- **Introduced `bounceApartX` rather than mutating `bounceHorizontal` (as TEA proposed)**
  - Spec source: context Problem ("rewrite bounceHorizontal …"); TEA deviation of the same name
  - Spec text: "rewrite bounceHorizontal to return both parties' velocities AND both PFACE writes"
  - Implementation: added `bounceApartX` (both parties + PFACE) beside the untouched `bounceHorizontal` quarter-model, per TEA's RED contract. `bounceHorizontal` is left in place (zero callers).
  - Rationale: matches the RED tests and keeps the shared `joust-collision-contract.ts` stable.
  - Severity: minor
  - Forward impact: a later cleanup MAY delete `bounceHorizontal`; not done here.
- **Tightened two sibling attribution filters (steering-wiring, homing-wiring) to exclude the new joust-turn**
  - Spec source: those files' CONTROL invariants ("ZERO non-mechanism facing flips")
  - Spec text: steering-wiring:197 "a bounder steering turn means the attribution filter is broken"; homing-wiring:381 names "a joust" as a flip cause
  - Implementation: added `bumpX === 0` (steering) / `bumpX !== 0` exclusion (homing) so a joust-turned bird is not miscounted as a steer/reversal.
  - Rationale: OSTLR is a genuinely new facing-flip cause; the controls were only sound because bounces never turned birds before. The fix restores soundness (positives still count real turns/reversals), it does not silence the control.
  - Severity: minor
  - Forward impact: jt9-48 (bump-facing) will add a FOURTH cause and must revisit these filters.
- **AC-6 (B2DIRA/SHDIRA) not implemented — filed as jt9-48**
  - Spec source: TEA Assessment AC-6; context Problem ("ALSO OWNED HERE")
  - Spec text: "B2DIRA (:4148-4150) and SHDIRA (:4379-4381) turn the enemy to face along PBUMPX"
  - Implementation: filed jt9-48 (3pt) with the PBUMPX prerequisite now in place; no untested feature code added.
  - Rationale: no failing test exists (TDD), it couples to enemy.ts steering, and its provenance promotion trips the claimCovers gate — GREEN is the wrong phase to build it untested. Filed per the descoped-findings rule.
  - Severity: major
  - Forward impact: Reviewer to confirm the follow-up split is acceptable; jt9-48 owns the deliverable.

## SM Assessment

**Arrival state:** The prime script reported `FINISH_STATE` for jt9-15, but jt9-15 was already fully complete — finish commit `c69fdac` is an ancestor of HEAD, the story is `done`, it sits in `sprint-2632-completed.yaml`, and its session is archived. The only leftover was a stale live `.session/jt9-15-session.md` byte-identical to the archived copy; I removed it. Board then clean: no live sessions, no open PRs.

**Sibling contention:** Clear. `git branch -r` shows no jt9-17 branch pre-claim; a-2 owns bz5-1, a-3 owns sw8-30. Claim pushed (stamp+context to `main` commit `629f42f`→rebased; empty branch `feat/jt9-17-port-ostlr-horizontal-bounce`) so the story is now visible to siblings. Status stamped `in_progress` (sm-setup left it `backlog`, as always).

**Premise verification (measured, not trusted):** This is a 5-point, three-part story (real horizontal velocity on EntityState + a PBUMPX field drainBumpX actually drains + a both-parties/both-PFACE rewrite of bounceHorizontal wired into collisionPass's bounce fork, plus jt8-3's B2DIRA/SHDIRA bump-facing arms that consume the new PBUMPX). I spot-checked its load-bearing claims against the current tree:
- `drainBumpX` (joust.ts:307) — confirmed ZERO production callers. ✓
- `bounceHorizontal(velX)` (joust.ts:296-297) returns `{selfVelX:-velX+2, otherBumpX:velX>>1}` — byte-exact to the description (models only the rightward party). ✓
- `toJoustEntity` hard-codes `velX:0`/`bumpX:0`. ✓ mechanism, but **line anchors drifted**: description cites demo.ts :748/:764/:751/:767; they now sit ~979/981 (and toJoustEntity-shaped sites ~1213/1216, ~1229/1232) after jt9-15+. Same caution for the collisionPass bounce-fork range (desc says :918-934).
- jt8-3 PFACE write-set to EXTEND lives in `plugins/joust/tests/steering-source.test.ts` — present. ✓

**Carried to TEA:** A `⚠ CONTEXT CORRECTION` block above the verbatim ACs tells TEA to re-anchor every demo.ts line reference by symbol/grep at RED, not by the cited numbers, and to extend jt8-3's existing PFACE write-set enumeration rather than re-derive it. Story premise is CURRENT — the only rot is line numbers, not mechanism. Expect a determinism re-baseline (a horizontal shove moves entities; seeded replays with non-killing contacts will diverge), same reason jt5-4 had one.

**Handoff:** To Pennywise (TEA) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

### Acceptance Criteria (defined by TEA — the sprint YAML carried none)

- **AC-1 — the OSTLR law, both parties (pure).** `bounceApartX(leftVelX, rightVelX)` implements JOUSTRV4.SRC:5110-5159 for BOTH parties at once: the LEFT party reflects to move left (`BLE` guard: skip if velX ≤ 0, else `−velX+2`) and the RIGHT reflects to move right (`BGE` guard: skip if velX ≥ 0, else `−velX−2`); each hands the OTHER an `ASRA`-halved `PBUMPX`; and PFACE is UNCONDITIONAL — left → `−1`, right → `+1` (ROM `CLR PFACE` = 0 = right). Pinned: `joust-jt9-17.test.ts` (5 cases, incl. both-guards-skip proving facing is outside the velocity guard).
- **AC-2 — PVELX ≡ the FLYX index, round-tripped.** `toJoustEntity` carries `EntityState.velXIndex` into `JoustEntity.velX`, and `withBounced` writes the reflected index back onto `velXIndex` (today both zero it / drop it). A non-killing OFFSET contact reverses each bird's `velXIndex` per AC-1. Pinned: `demo-jt9-17.test.ts` (offset pair: +6→−4, −6→+4).
- **AC-3 — the bounce turns the birds.** The same offset contact writes the PFACE turn back onto the process facing: left bird → faces left, right bird → faces right. Pinned: `demo-jt9-17.test.ts` (facing test).
- **AC-4 — the COLDX gate.** A SUPERIMPOSED pair (equal posX ⇒ COLDX = 0 ⇒ `BEQ OSTNLR`, :5112) gets NO horizontal bounce — neither `velXIndex` nor facing is touched (it still bounces vertically). Pinned: `demo-jt9-17.test.ts` (control, currently green; guards the gate once the arm exists).
- **AC-5 — PBUMPX has a home and drains.** The bounce parks a `PBUMPX` (`bumpX`) that `drainBumpX` spends ≤3 px/frame into `posX` (`WRAPX`, :7270-7288). Pinned: `demo-jt9-17.test.ts` (FROZEN pair slid apart by ±1). **Drain seam is Dev's** (see deviation + Delivery Finding).
- **AC-6 — B2DIRA/SHDIRA bump-facing (:4148-4150 / :4379-4381).** The DIRECTION routines turn an enemy to face along its accumulated PBUMPX. **NOT pinned by a failing test in this RED** (test-omission deviation + blocking Delivery Finding with anchors) — Dev + Reviewer must close it.
- **AC-7 — determinism re-baseline, ITS OWN COMMIT.** Wiring the horizontal shove moves seeded-replay fingerprints; the re-baseline lands in a separate commit, each moved pin re-found by sweeping its own first-contact frame (jt5-4 method, sprint/archive/jt5-4-session.md:953-993). Not a RED artifact — Dev executes it in GREEN.

**Test Files:**
- `plugins/joust/tests/joust-jt9-17.test.ts` — the `bounceApartX` unit law (5 cases). Fails: `bounceApartX is not a function`.
- `plugins/joust/tests/demo-jt9-17.test.ts` — wired behaviour (4 tests: reflect ×2, drain — failing; COLDX==0 control — green).
- `plugins/joust/tests/helpers/joust-collision-contract.ts` — added `HorizontalBounce` type + `bounceApartX` signature (loadJoust check UNCHANGED, so only jt9-17 reddens).
- `plugins/joust/README.md` — derived test-file count 129 → 131 (audio-seam-scope census; the known joust file-count gotcha).

**Tests Written:** 9 (8 failing + 1 green control) covering AC-1 through AC-5. AC-6/AC-7 routed to Dev via findings.
**RED verified:** `npx vitest run --project joust` → 2 files failed, 8 tests failed, 2782 passed. Failures are mechanism assertions (`expected 6 to be -4`; `expected 1 to be -1`; `expected 100 to be 99`), not fixture/undefined errors.

### Rule Coverage

| Rule (lang-review/typescript.md + project) | Test(s) | Status |
|---|---|---|
| Core/shell purity (CLAUDE.md) | `bounceApartX` is pure (joust.ts is core); tests reference no shell/DOM | enforced by existing `purity.test.ts` |
| Meaningful, non-vacuous assertions | every jt9-17 test asserts an exact numeric delta / facing / posX; no `is-a-function`-only pins | pass (self-check) |
| ROM-cited constants (fleet convention) | law derived from JOUSTRV4.SRC:5110-5159; anchors cited in-test | pinned by `joust-jt9-17`/`demo-jt9-17` |
| Derived README counts (audio-seam-scope) | file count bumped at RED time | green |
| No manual sprint-YAML edits | ACs recorded here, not in YAML | ✓ |

**Self-check:** 0 vacuous tests. The 1 green test (COLDX==0) is a deliberate gate CONTROL, non-vacuous once the arm exists (a Dev who forgets the gate reddens it).

**Handoff:** To Jack Torrance (Dev) for GREEN — implement `bounceApartX`, carry `velXIndex`/`bumpX`/facing through `toJoustEntity`/`withBounced`, wire the COLDX-gated horizontal arm into collisionPass's bounce fork, drain PBUMPX, then the AC-6 bump-facing and the AC-7 re-baseline (own commit).
## Dev Assessment

**Status:** GREEN — `npx vitest run --project joust` → **131 files, 2790 tests, all pass**. Repo-wide `npm run lint` (tsc --noEmit) clean. Orchestrator suite: 390/392 pass; the 2 failures are the star-wars citation gate failing on a MISSING LOCAL `audit/star-wars` tag (only `audit/red-baron`/`audit/tempest` exist here) — pre-existing, environmental, passes in CI (`fetch-depth: 0`), zero causal path from this joust-only diff.

### What shipped (AC-1 … AC-5, AC-7)

- **AC-1** `bounceApartX(leftVelX, rightVelX)` in `joust.ts` — the whole OSTLR law, both parties, all 5 RED cases green.
- **AC-2** `toJoustEntity` carries `velXIndex`→`velX` and `DemoProcess.bumpX`→`bumpX`; `withBounced` writes the reflected index back to `velXIndex`.
- **AC-3** `withBounced` writes the PFACE turn back to the process facing (player `p.facing`, enemy `p.enemy.facing`).
- **AC-4** the bounce fork calls OSTLR only when `a.posX !== b.posX` (COLDX≠0); the superimposed control stays green.
- **AC-5** `DemoProcess.bumpX` is the PBUMPX home; `drainProcessBumpX` drains ≤3 px/frame into `posX` at the TOP of `stepDemo`.
- **AC-7** determinism re-baseline in its OWN commit (`test(jt9-17): re-baseline …`): audio-events 0xface 4654→4370 (re-swept), dumb-wingbeat 0xbeef 311→302 & 0x2468 290→284 (re-measured), and two sibling attribution filters (steering-wiring, homing-wiring) tightened to exclude the joust-turn.

### Not shipped — routed

- **AC-6** (B2DIRA/SHDIRA bump-facing) → **jt9-48** (3pt, backlog). No jt9-17 test, couples to enemy.ts steering, claimCovers gate. Prerequisite (PBUMPX home) done. See Design Deviations.

### Commits (feature and re-baseline SEPARATED, per the epic's fingerprint-mover rule)

1. `e82c904` feat(jt9-17): port OSTLR — the horizontal half of the non-killing bounce
2. `7fba956` test(jt9-17): re-baseline the seeded replays the OSTLR shove moved
3. `4ac7a0a` chore(sprint): file jt9-48 — B2DIRA/SHDIRA bump-facing

### For the Reviewer (mutation-battery hints, since 8/9 subagents are disabled here)

- The OSTLR arithmetic (`bounceApartX`) — flip a guard (`>0`→`>=0`), a slowdown sign (`+2`→`-2`), a facing (`-1`/`1`), or a bump `>>1`; each should redden `joust-jt9-17.test.ts`.
- The COLDX gate (`a.posX !== b.posX`) — remove it and `demo-jt9-17.test.ts`'s superimposed control should redden.
- The drain seam — the sibling filters' `bumpX` marker depends on the drain being TOP-of-frame (next-frame). Moving it back after `collisionPass` reintroduces the inconsistent timing (documented).
- The re-baseline — each moved pin was re-found by SWEEPING its own precondition (frame 4370 by wave-advance sweep; counts by census), never nudged.

**Handoff:** To Roland Deschain (Reviewer) for code review.
## Subagent Results

**All received:** Yes

| Subagent | Status |
|----------|--------|
| reviewer-preflight | Complete (enabled) |
| reviewer-edge-hunter | Skipped / disabled |
| reviewer-silent-failure-hunter | Skipped / disabled |
| reviewer-test-analyzer | Skipped / disabled |
| reviewer-comment-analyzer | Skipped / disabled |
| reviewer-type-design | Skipped / disabled |
| reviewer-security | Skipped / disabled |
| reviewer-simplifier | Skipped / disabled |
| reviewer-rule-checker | Skipped / disabled |

8 of 9 specialists are disabled in `workflow.reviewer_subagents`, so — per this repo's standing practice — the real signal is a MUTATION BATTERY on the live implementation, run below.

## Reviewer Assessment

**Verdict:** APPROVED

### Mutation battery (the real signal; each mutant restored before the next)

| Mutant | Expectation | Result |
|--------|-------------|--------|
| COLDX gate `a.posX !== b.posX` → `===` (invert the BEQ OSTNLR gate) | die | ✓ 3 failed (demo-jt9-17) |
| drop the ENEMY-branch drain (`posX + applied` → `posX`) | die | ✓ 1 failed (drain test) |
| drop the enemy facing writeback in `withBounced` | die | ✓ 1 failed (facing test) |
| `bounceApartX` `leftFacing: -1` → `1` | die | ✓ 6 failed (unit + behaviour) |
| steering exclusion forced ALWAYS-exclude (`notJoustTurn=false`) | positive reddens | ✓ 4 failed → guard is load-bearing |
| homing exclusion forced ALWAYS-exclude (`joustTurned=true`) | positive reddens | ✓ 4 failed → guard is load-bearing |

No survivors. (One initial drain mutant "survived" — it hit the unused PLAYER branch; re-targeted at the ENEMY branch the drain test uses, it died. Noted, not a gap.)

**[VERIFIED] ROM fidelity** — I re-derived OSTLR (JOUSTRV4.SRC:5110-5159) independently of Dev: both arms' guards (`BLE`/`BGE`), the ±2 slowdowns, the four `ASRA` bump forms (incl. the guard-skip `(-velX+2)>>1` / `-(velX+2)>>1` accumulator reads), and the unconditional PFACE (left −1, right +1 from `CLR`=0). `bounceApartX` transcribes all of it, and `-(rightVelX + 2) >> 1` has the correct JS precedence. The FLYX index is always EVEN, so every reflected value stays even AND within [−8,8] — the ladder invariant `stepFlight` asserts is preserved (no `RangeError`). ✓
**[VERIFIED] roster/rng unchanged across a contact** — audio-thud's 50 jt5-4 differential guards (process order + rng cursor with vs. without the contact) stay green, so the horizontal shove moves entities WITHOUT drawing rng or reordering the roster — exactly jt5-4's non-regression line. ✓
**[VERIFIED] feature is active in real play, not a fixture-only no-op** — the seeded pins genuinely moved (audio-events 4654→4370 wave-clear, dumb-wingbeat counts) — the "silent front-end no-op" trap is disproven.

- **[EDGE]** The three orientations (charging-in, left-fled, right-fled) and the zero-velocity and max-index (±8) cases are all pinned in `joust-jt9-17.test.ts`; the COLDX-centre no-bounce case and the ≤3px multi-frame drain are pinned in `demo-jt9-17.test.ts`. Reflected indices proven to stay on the even ladder. Loop-order independence: the arm sides parties by `posX`, not by a/b, so `pa`/`pb` assignment cannot flip the outcome.
- **[SILENT]** No swallowed errors — `bounceApartX` is total (no throw path), `drainProcessBumpX` early-returns unchanged when `bumpX` is 0/absent (so eggs/dissolves/trolls are untouched), the COLDX gate `continue`s nothing (it augments an existing resolved pair). No empty catch, no silent fallback.
- **[TEST]** Non-vacuous: every jt9-17 assertion is an exact numeric delta / facing / posX; the mutation battery above proves each pin has teeth; the two re-baselined sibling controls were made SOUND (SOUND1/SOUND2 prove they still redden a broken mechanism), not silenced.
- **[DOC]** Comments cite the ROM truthfully — OSTLR arm `:5112`/`:5113`, drain `WRAPX :7270-7288`, `PVELX` = FLYX index `:7150-7158`; the re-baseline comments record the SWEEP method (4370 re-found by wave-advance sweep) and the exact count moves. No stale prose.
- **[TYPE]** `bounceApartX(leftVelX, rightVelX): HorizontalBounce` is well-typed and pure; `HorizontalBounce` is a named interface (mirrored in the test contract); `DemoProcess.bumpX?: number` is documented beside its precedent `facing`/`prevFlapHeld`. No stringly-typed API, no unsafe cast.
- **[SEC]** N/A — pure deterministic sim, no I/O, auth, tenant data, or user input.
- **[SIMPLE]** Minimal: one 12-line pure law, one `bumpX` field, one drain helper, one gated arm, a widened `withBounced`. `bounceHorizontal` (the quarter-model, zero callers) is left in place per the RED contract — pre-existing, still guarded, not new dead code.
- **[RULE]** Core/shell purity: all changed source is in `src/core` (`purity.test.ts` green). ROM-cited constants: the law cites JOUSTRV4.SRC throughout. No manual sprint-YAML edits (jt9-48 via `pf sprint story add`). Fingerprint-mover discipline: feature and re-baseline in SEPARATE commits, each moved pin re-swept not nudged.

### Devil's Advocate
If this is broken, the likeliest spot is the re-baseline masking a regression. Checked: audio-thud's roster/rng differential (50 green) proves the shove neither draws rng nor reorders processes — the jt5-4 lines that a masked regression would trip. The moved pins (4370, counts) were re-found by SWEEPING the precondition (I confirmed the sweep independently as TEA/Dev), and the dumb-wingbeat floor (>50) and knight-cue invariant (154 unmoved) both hold. Second suspect: the sibling attribution filters could hide a steering/homing regression — but the exclusion only removes `bumpX ≠ 0` flips, which steering/homing never produce, and SOUND1/SOUND2 prove the counters still redden a broken mechanism. Third: could a person-thud now turn the PLAYER's facing wrongly? OSTLR runs for person thuds in the ROM too, and the full 2790-test suite (incl. player-control tests) is green. Nothing found that blocks.

### Reviewer audit of Design Deviations
- **TEA — `bounceApartX` not mutating `bounceHorizontal`:** ACCEPTED — keeps the shared contract stable; equivalent law.
- **TEA — no RED test for B2DIRA/SHDIRA (omission):** ACCEPTED — correctly routed to jt9-48; couples to steering + claims gate.
- **TEA — drain-seam not pinned:** ACCEPTED — the ≤3 cap is pinned (drainBumpX unit + drain behaviour); the seam is an implementation choice.
- **Dev — amended the drain test's single-shove premise:** ACCEPTED — the amendment is MORE precise (cap + direction + settle); the 16px-box re-collision is ROM-faithful, verified.
- **Dev — drain seam = top-of-stepDemo:** ACCEPTED — ROM-faithful (WRAPX one frame after PBUMPX), and the audio-thud invariants confirm no collateral.
- **Dev — introduced `bounceApartX`:** ACCEPTED (mirrors TEA's).
- **Dev — tightened steering/homing filters:** ACCEPTED — proven sound (SOUND1/SOUND2); restores the controls, does not silence them.
- **Dev — AC-6 deferred to jt9-48:** ACCEPTED — the primary deliverable (OSTLR horizontal bounce) is complete and tested; bump-facing is a separable consumer of the now-built PBUMPX home, filed with an ID per the descoped-findings rule.

**Handoff:** To Johnny Smith (SM) for finish-story.