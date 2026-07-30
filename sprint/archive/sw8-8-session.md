---
story_id: "sw8-8"
jira_key: "sw8-8"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-8: Incoming-fire reaction window (sw8-2 follow-up)

## Story Details
- **ID:** sw8-8
- **Jira Key:** sw8-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Repos:** star-wars
- **Type:** bug

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-30T11:01:09Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-29T10:32:08Z | 2026-07-29T10:36:28Z | 4m 20s |
| red | 2026-07-29T10:36:28Z | 2026-07-29T10:56:15Z | 19m 47s |
| green | 2026-07-29T10:56:15Z | 2026-07-29T14:16:13Z | 3h 19m |
| review | 2026-07-29T14:16:13Z | 2026-07-29T14:31:02Z | 14m 49s |
| green | 2026-07-29T14:31:02Z | 2026-07-29T22:26:22Z | 7h 55m |
| review | 2026-07-29T22:26:22Z | 2026-07-29T23:18:04Z | 51m 42s |
| finish | 2026-07-29T23:18:04Z | 2026-07-30T00:35:53Z | 1h 17m |
| green | 2026-07-30T00:35:53Z | 2026-07-30T00:51:23Z | 15m 30s |
| review | 2026-07-30T00:51:23Z | 2026-07-30T11:01:09Z | 10h 9m |
| finish | 2026-07-30T11:01:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (blocking): The naive fix for this story — unify the pilot's seat by homing the fireball
  to `spaceEye` AND seating the space cockpit hit sphere there (`shipPoint` case 'space') — was
  measured and it does NOT work. It leaves 4 of my 5 tests failing (worse than the 3 it starts
  with) and additionally reddens TWO sibling tests in `tests/core/homing-fireball.test.ts`:
  "homes along its launch line" (:106) and "is frame-rate independent — 30/60/144 Hz stepping
  yields the same trajectory" (:149). The dt-independence break is the informative one: `spaceEye`
  is a **sawtooth function of the integer `frame` counter** that jumps 4096 units at each wrap, so
  a shot homing toward it inherits a target that is neither continuous nor dt-invariant. Dev must
  not spend GREEN discovering this. Affects `src/core/sim.ts` (`homeShots` target, `shipPoint`)
  and `src/core/gameRules.ts` (`spaceEye` continuity). *Found by TEA during test design.*

- **Question** (blocking): The story's fix is genuinely under-determined and I believe it needs a
  RULING before code. The pilot is currently at TWO places at once — at `spaceEye` for viewing and
  shooting (`beamOrigin`, sim.ts:297; `cameraView`) and at the ORIGIN for being hit and for
  incoming-fire homing (sw8-2 AC12). Every fix must collapse that to one point, and both obvious
  collapses are blocked: moving the pilot to the eye breaks dt-independence (finding above), and
  moving the eye to the pilot deletes sw8-1's shipped ST.UX viewer drift (my second control
  catches it). A third reading — that ST.UX is a drift of the drawn WORLD, so incoming fire should
  ride the drift and stay centred as it arrives, rather than the pilot being displaced from it —
  is the one I would take to Architect first. Affects `src/core/gameRules.ts` (`spaceEye`
  semantics), `src/core/sim.ts` (`beamOrigin`/`shipPoint`/`homeShots`). *Found by TEA during test
  design.*

- **Conflict** (non-blocking): `spaceEye`'s own doc comment (`src/core/gameRules.ts:239-241`)
  asserts the ±2048 amplitude "stays well inside the space-combat FOV envelope, so combat stays
  reachable AND the Death Star still drifts". The first half is now measured false for incoming
  fire: the FOV-envelope argument is a fixed-depth argument, and a fireball closes to zero depth,
  where any non-zero eye offset diverges the angle. The comment should be corrected as part of
  the fix rather than left as a defence of the current seat. Affects `src/core/gameRules.ts`.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): `tests/core/bounded-eye-combat.test.ts` (sw8-2 AC9/AC11) is the
  suite that was supposed to own "incoming fire stays fair", and it cannot see this defect because
  it asserts against a STATIC hand-placed `incomingFireball = [1200, 0, -8000]` with
  `enemyShots: []` — a fireball that never closes. It is not wrong, but its name over-promises.
  Recommend a pointer comment there to this suite once GREEN lands, so the next reader does not
  again mistake fixed-depth reachability for reachability through impact. I did not edit it in
  RED: it is green, correct within its own scope, and belongs to sw8-2. Affects
  `tests/core/bounded-eye-combat.test.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): `finish_ground.wav` still 404s in production. Observed live in the
  browser console while playtesting this fix on a spare port:
  `GET https://arcade-assets.slabgorb.com/star-wars/music/finish_ground.wav 404` followed by
  `Unable to decode audio data`. sw8-14 ("music-bake pipeline cannot reproduce finish_ground.wav")
  is marked **done** (2026-07-27) and did add `finishGround` to the bake spec — but adding it to
  the bake is not the same as uploading it, and the R2 object is still absent, so the cue is still
  silent in play. Someone needs to run the asset deploy. Not caused by and not blocking sw8-8.
  Affects the R2 `arcade-assets` bucket / `just deploy-assets`. *Found by Dev during
  implementation.*

- **Improvement** (non-blocking): Space-phase incoming fire is very sparse — 3–4 fireballs in the
  whole ~19 s space phase across every seed I ran, and the launch ranges repeat almost exactly
  between seeds (7864 / 9018 / 15905 / 24086 / 28179 / 30157) because the fire gate is
  frame-driven (`(frame & fireMask) === 0`) and only the threshold roll is seeded. sw8-9's note
  records the pre-fix rate as "2 shots in 19 s" and treated raising it as part of that story; at
  3–4 it is still thin for what the longplay shows. Not in this story's scope and NOT something
  Dev should tune here (it would move my measured baselines mid-flight), but worth a backlog
  story alongside sw8-10/sw8-16. Affects `src/core/sim.ts` (space fire gate). *Found by TEA
  during test design.*

### Dev (implementation) — rework round 1

- **Gap** (non-blocking): a sibling suite's "long run" fixture silently walks into another phase,
  and this is a repo-wide pattern, not one file. `bounded-eye-combat.test.ts` stepped
  `advance(spaceRun(), 1600)` and called it a long SPACE run; sw8-11 later time-boxed the space
  phase (~19 s ≈ 390 game frames), so by frame 1,600 that fixture was in the trench and `eyeOf`
  was returning the trench seat `[0, 768, 0]`. It measured the wrong camera for two stories and
  stayed green, because nothing asserted the phase. My replacement asserts it. **I swept for
  siblings and found none live**: the only other long-run space fixtures are
  `starfield-lateral-drift.test.ts:43,62` and `render.space-camera.test.ts:73`, all `advance(…,
  720)` at `dt = 1/60`, which lands at `phase: 'space'`, `phaseTime 13.95` — inside the box
  (measured, not reasoned). So this is a lone survivor, not a class — but the general hazard is
  real: a space fixture that steps to a fixed frame count has an undeclared dependency on the
  phase length, and sw8-11 can move it again. Affects `tests/` (space fixtures without a phase
  assert). *Found by Dev during implementation (rework round 1).*

- **Improvement** (non-blocking): the audit citation gate re-anchors on line MOVES but has no
  signal for a file RENAME. This round renamed a test file (`bounded-eye-combat.test.ts` →
  `space-eye-is-cockpit.test.ts`) and round 1 renamed another; neither was cited by a finding, so
  nothing broke — but a rename of a CITED file would surface as a LOST citation with no hint that
  the content still exists under a new path, and the tool's own message would steer the reader
  toward `remediated_by` (the wrong exit, per the tp1-6 lesson). A `--follow-renames` pass, or just
  a line in the LOST message saying "check `git log --diff-filter=R`", would close it. Affects
  `tools/audit/reanchor-citations.mjs`. *Found by Dev during implementation (rework round 1).*

- **Question** (non-blocking): the epic design spec is now amended in two places by a story that is
  not its author, and there is no convention for that. I used inline block quotes headed
  `AMENDED 2026-07-29 by sw8-8` / `SUPERSEDED IN PART` rather than editing the original prose, so
  the wrong inference stays visible next to its correction — the spec is a historical design
  record and silently rewriting it would erase why the mis-port was plausible. If the project would
  rather amendments live in a separate changelog, this is the moment to say so; there will be more
  of them as sw8 keeps ruling against sw8-1-era inferences. Affects
  `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`. *Found by
  Dev during implementation (rework round 1).*

### Reviewer (code review) — round 2

- **Gap** (non-blocking): the audit citation gate verifies only OUR side. `reanchor-citations.mjs`
  checks every finding's `ours` anchor against the working tree (96 correct, 0 lost this round) but
  nothing checks the `theirs` ROM anchors, and nothing checks ROM citations that live in ordinary
  source COMMENTS rather than in `docs/audit/findings/*.json`. Both of this round's Medium findings
  are exactly that: a wrong `WSMAIN.MAC` span and a false structural claim, sitting in a
  `src/core/gameRules.ts` comment where no tool looks. The ROM source is on disk and greppable
  (`~/Projects/star-wars-1983-source-text`), so a checker that extracts `FILE.MAC:N-M` patterns from
  `src/**` and `tests/**` comments and verifies the quoted text appears in that span is buildable —
  it would have caught both. Affects `tools/audit/` (a new comment-citation checker). *Found by
  Reviewer during code review.*

- **Improvement** (non-blocking): `[SEC]` reports that a from-scratch sweep of the whole findings
  corpus surfaces pre-existing stale citations that `reanchor-citations.mjs` does not flag,
  unrelated to and not introduced by this diff. If real, the gate's "96 already correct" is
  narrower than it reads. Worth one story to characterise the gap before anyone leans harder on
  that number. Affects `tools/audit/reanchor-citations.mjs`, `docs/audit/findings/*.json`. *Found by
  Reviewer during code review.*

- **Question** (non-blocking): an untracked `tests/core/_tmp-measure.test.ts` appeared and
  disappeared in the main working tree during review, reproducing the "3,4,5,5,4 kills" figure.
  Two reviewers were verifying that same claim concurrently, so the benign explanation is one of
  them scratch-testing in the live checkout rather than a worktree. The tree is verified clean now
  (md5 on `src/shell/render.ts` back to baseline, `git worktree list` shows only the main tree, both
  repos `git status` empty). Flagging the practice, not the file: concurrent scratch-testing in the
  shared checkout is how a stray mutation gets attributed to the author's diff. Affects review
  process (`.pennyfarthing/` reviewer subagent briefs should mandate worktrees for mutation).
  *Found by Reviewer during code review.*

### SM (finish)

- **Conflict** (blocking): sw8-8 cannot merge — `origin/develop` gained uf1-3 (#137) and uf1-12
  (#138) after this branch was cut, and uf1-12's new C_PS bit derives the player's SIGHTS from
  `spaceEye`, the symbol sw8-8 deletes (`develop:src/core/tie-status.ts:37,127,162`). Trial merge
  yields 10 conflicts: `src/core/tie-status.ts` plus 9 citation files. 25 uf1-12 tests across
  `tie-sights-status.test.ts` and `tie-loiter-sights.test.ts` stage the moving eye. Returned to
  green for resolution; scope is in the SM Assessment at the end of this file. Affects
  `src/core/tie-status.ts` and uf1-12's two eye-staging suites (re-point both bits to `COCKPIT`,
  re-seat the tests). *Found by SM during finish.*

- **Gap** (non-blocking): nothing warned either story about the other. uf1-12 hung a NEW consumer
  on `spaceEye` while sw8-8 — an in-flight story whose entire deliverable is retiring `spaceEye` —
  sat in review. Both were visible in the same sprint. A pre-merge check that greps an opening PR's
  diff for symbols that any `in_progress`/`in_review` story's branch DELETES would have caught it
  at #138, when it was one line. This is the second time an ST.UX consumer has been built on a seam
  another story was actively ruling on. Affects the merge gate / `.pennyfarthing/gates/merge-ready`.
  *Found by SM during finish.*

### Dev (merge resolution)

- **Question** (non-blocking): uf1-12's acceptance criteria were written, reviewed and approved
  against the moving eye, and sw8-8 has now moved the seam under them without anyone re-reading
  them. The mechanical part is done and green, but "a fighter held under the crosshair breaks off
  its weave" means something measurably different when the crosshair starts at the point every
  fighter is flying toward — the loiter break now fires without the player steering. I re-seated
  the fixture, mutation-proved it still discriminates, and I believe the new behaviour is
  ROM-correct (the cabinet's space pilot is fixed at the origin, `WSMAIN.MAC:2522-2529`) — but that
  is a judgement about someone else's shipped story, made inside a merge commit. Affects
  `src/core/tie-status.ts` (C_PS) and uf1-12's ACs. *Found by Dev during implementation (merge
  resolution).*

- **Improvement** (non-blocking): that fixture's parked-yoke half was passing for a reason nobody
  ever stated — it depended on the measuring point being displaced from the origin the target was
  seated on. Nothing in the test said so, so the dependency stayed invisible until the eye moved.
  It is the lesson this story keeps re-learning: a fixture seated at the ORIGIN, measured from a
  DISPLACED point, silently encodes the displacement as part of what it tests. Worth sweeping other
  `tests/core/helpers/space.ts` consumers for negative cases seated at `[0, 0, -z]` that depend on
  the measuring point being elsewhere. Affects `tests/core/` space fixtures. *Found by Dev during
  implementation (merge resolution).*

### Reviewer (code review) — round 3

- **Gap** (non-blocking): `C_PS` is now reachable with `C_PV` CLEAR, and the retired eye used to make
  that impossible. The ROM's `CHSET C$PS` sits inside the DRAW pass (`WSMAIN.MAC:3919-3932`), so an
  object the cabinet does not draw cannot receive the bit; the port carries only one of the draw
  pass's gates — `beamHit` refusing anything behind the gun — and `beamHit` has no FOV clamp at all.
  Worked example: a TIE at `[400, 0, -10]` has perpendicular distance 400 against the 500 u band so
  C_PS SETS, while its view depth of 10 is under `VIEW_NEAR` (0x10 = 16) so C_PV is CLEAR. Under the
  drifting eye this was unreachable — with the eye 1,024 off to one side and the fighter beelining
  the origin, `along = dot(pos − eye, dir)` was 0 at point blank and `beamHit` returned null. Now the
  eye and the fighters' destination are the same point, so every closing fighter passes through the
  band. Behaviourally small (a loiter break on a fighter about to collide) but it is a fidelity gap
  in a bit that gates choreography. Affects `src/core/tie-status.ts` (C_PS should probably require
  C_PV, i.e. "was it drawn"). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the two duplicate-verbatim citation pins that moved this round —
  `G-009` and `S-016`, both in `src/core/sim.ts` — are exactly the pair story td1-13 predicts can be
  silently mis-anchored while the gate stays green, and NOTHING in the pipeline checks for it. Dev's
  two verifications ("no non-`line` change", "`remediated_by` counts match") both pass a mis-anchor,
  and so does `check-citations.mjs`. They landed correctly this time; that was luck plus care, not a
  guard. The cheap interim fix, well short of td1-13's full audit-commit freeze: have
  `reanchor-citations.mjs` REFUSE to move a pin whose verbatim is non-unique in its file, and report
  it for hand resolution. Affects `tools/audit/reanchor-citations.mjs`, and strengthens td1-13's
  case. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): sw8-18 is now carrying SIX citation/stale-prose defects across four
  files (`gameRules.ts` ×4, `incoming-fire-reaction-window.test.ts`, `render.space-camera.test.ts`,
  `sim.ts`), two of them found only on the third read of the same five-line block. Individually each
  is Low or Medium prose; collectively they are the failure mode the tombstone exists to prevent, and
  the branch ships them. Recommend sw8-18 be treated as blocking-before-release rather than ordinary
  backlog, and that it add a mechanical guard for the general case: the audit gate re-opens ROM
  citations but nothing re-opens the `.MAC:NNNN` spans embedded in ordinary source comments, which is
  why all six survived two green rounds. Affects `sprint/epic-sw8.yaml` (sw8-18 priority) and
  `tools/audit/`. *Found by Reviewer during code review.*

- **Question** (non-blocking): this orchestrator checkout is 21 commits behind `origin/main` and 9
  ahead, and `sprint/epic-sw8.yaml` carries an uncommitted `in_review` status edit. uf1-12's story
  record does not exist locally at all — I had to read its acceptance criteria from
  `origin/main:sprint/epic-uf1.yaml` to rule on the seam. SM should expect a sprint-file reconcile at
  finish; `star-wars`'s `origin/develop` is still at `aabe488` (verified), so the code side is not
  racing, but the tracking side is. Affects `sprint/epic-sw8.yaml`, `sprint/epic-uf1.yaml`. *Found by
  Reviewer during code review.*

## Impact Summary

> **SM note:** `pf sprint story finish` could not compile this section — its AI step timed out after
> 120 s and fell back to templates, which emitted nothing at all. Written by hand, as on `uf1-6`,
> because the archive is the permanent record and a missing Impact Summary reads as "no upstream
> effects" to whoever greps it next. This is a faithful digest of the 20 Delivery Findings above and
> contradicts none of them.

**Upstream Effects:** 20 findings across seven agent passes — 3 logged blocking, all 3 now resolved,
17 non-blocking. The ones that outlive this story:

1. **sw8-18 is the big one, and it should not sit in the backlog.** Six citation/stale-prose defects
   ship on this branch across four files (`gameRules.ts` ×4, `incoming-fire-reaction-window.test.ts`,
   `render.space-camera.test.ts`, `sim.ts`). Four are pre-existing round-2 misses; two were introduced
   by the merge round. The general hole is mechanical: the audit gate re-opens ROM citations, but
   **nothing re-opens a `.MAC:NNNN` or `file.md:NN` span embedded in an ordinary source comment**,
   which is exactly why all six survived two green rounds. The sharpest instance is self-inflicted —
   sw8-8 cited a design spec at `:26-30` and, in the same commit, inserted 31 lines pushing the quoted
   longplay observation to `:45-46`. Reviewer recommends treating sw8-18 as blocking-before-release and
   adding the mechanical guard, not just fixing the six.
2. **`C_PS` can now be set with `C_PV` clear — a new fidelity gap in uf1-12's bit.** The ROM's
   `CHSET C$PS` sits inside the DRAW pass (`WSMAIN.MAC:3919-3932`), so an object the cabinet does not
   draw cannot receive it; the port carries only the "behind the gun" gate. A TIE at `[400, 0, -10]`
   is inside the 500 u sights band while its view depth of 10 is under `VIEW_NEAR` (16). The retired
   eye made this unreachable; the cockpit seat does not. Wants its own story against
   `src/core/tie-status.ts`.
3. **The citation re-anchor tool has an unguarded silent-corruption path** (strengthens td1-13). Two of
   the three duplicate-verbatim pins in the whole findings set moved this round — `G-009` and `S-016`,
   the exact pair td1-13 names — and *nothing in the pipeline checks which occurrence they land on*.
   They landed correctly here; that was care, not a guard. Cheap interim fix well short of td1-13's
   full audit-commit freeze: have `reanchor-citations.mjs` REFUSE to move a pin whose verbatim is
   non-unique in its file and report it for hand resolution.
4. **A shipped story's observable changed and no one has played it.** uf1-12's `TCH1DZ` → `20$` loiter
   break now fires without the player steering for any fighter closing on the cockpit, because the
   crosshair and the fighters' destination are the same point. Ruled ROM-correct and unit-verified, but
   it is a playtest observation by nature. uf1-12's ACs are satisfied as written (they are relational —
   "the SAME aim ray the gun uses"), so this is a note, not a defect.
5. **Smaller, still live:** the audit citation gate verifies only *our* side of each finding, never the
   ROM side; a general `tests/core/` fixture hazard (a target seated at the origin measured from a
   displaced point silently encodes the displacement); and this checkout was 21 commits behind
   `origin/main` throughout the review, so uf1-12's story record was not locally readable and the Dev
   sidecar lesson that would have caught finding #1 was one `git pull` away.

**Blocking:** None outstanding. All three blocking findings were closed in-flight:
TEA's Gap (the naive fix breaks frame-rate independence) was resolved by the Architect seam ruling;
TEA's Question (which seam is authoritative) by the same ruling; and SM's Conflict (`origin/develop`
gained uf1-12 on the retired seam) by absorbing the reconciliation into this story rather than
deferring it — the decision recorded under *Sm Assessment — finish attempt 1*.

**Shipped:** star-wars PR [#139](https://github.com/slabgorb/star-wars/pull/139) merged to `develop`
as `fc70b9f` (merge of `af32d5b`). Verified on `develop` rather than assumed:
`sim.ts:311 const beamOrigin: Vec3 = shipPoint(state)`, `tie-status.ts:134 const eye = COCKPIT`, and
zero `spaceEye` exports. 2035/2035 tests across 190 files; `tsc --noEmit` and `vite build` clean.
Three review rounds: REJECTED → APPROVED → APPROVED (merge resolution).

### Deviation Justifications

Fourteen deviations logged across four rounds; every one carries a Reviewer stamp. The load-bearing
ones, in the order they mattered:

- **Retired `spaceEye` rather than re-seating the pilot onto it** — the ROM decides, and it retires a
  live feature. `ST.UX` is the starfield's register; sw8-1 ported one ROM routine twice. ✓ ACCEPTED,
  with the Reviewer re-deriving the case from primary source rather than from the entry.
- **No sibling test re-seated during RED, deliberately** — measuring the collision instead of
  pre-empting it kept `homing-fireball.test.ts`'s launch-line and dt-invariance assertions intact, and
  those are what caught the wrong fix. ✓ ACCEPTED; the restraint paid off.
- **Rewrote `bounded-eye-combat.test.ts` as `space-eye-is-cockpit.test.ts` rather than deleting it** —
  the round-1 REJECT was that retiring the seam had hollowed this guard into a green, un-failable test.
  Inverting was the right branch. ✓ ACCEPTED (round 2), mutation-proven in both directions.
- **Absorbed uf1-12's C_PS into this story instead of filing a follow-up** — the symbol C_PS reads no
  longer existed, so sw8-8 changed uf1-12's behaviour either way; doing it deliberately with tests
  re-seated beat doing it mechanically and deferring. User decision, recorded.
- **Re-seated uf1-12's loiter fixture `[0,0,-6000]` → `[6000,0,-6000]`** — severity **major**, the one
  non-mechanical re-seat, and the finding of the merge round. ✓ ACCEPTED with two corrections to its
  own reasoning (the C_PV pyramid is not what holds the negative half, and "by construction" holds only
  for the degenerate dead-ahead beeline) and one Low: the admissible seat window is narrow (of
  {0, 1500, 3000, 4500, 6000, 7500} only 6000 discriminates) and the test never asserts its own premise.
- **"Keep the dead `state` parameter" SUPERSEDED, not reversed** — uf1-12 made the parameter genuinely
  used, falsifying the premise of an argument the Reviewer had accepted. ✓ ACCEPTED; the frame-invariance
  guard the argument protected is still live and the merge added a second one for C_PS.
- **Corrected uf1-12's C_PS origin comment** — ✗ PARTLY FLAGGED. Correcting was right; the
  *condensation* is the problem, restating the tombstone's qualified case as bare claims the ROM's own
  text appears to refute ("never a viewer" vs `WSGLOB.MAC:465 ;VIEWER X POSITION`), twice, differently,
  in one file. Filed to sw8-18.
- **Exported `COCKPIT` from `gameRules.ts`** — ✗ PARTLY FLAGGED in round 1 (the justifying comment
  claimed a benefit it had not delivered), resolved in round 2 by consolidating `sim.ts`'s private copy
  rather than softening the prose. A residual Low remains: the comment still says "Neither can read
  `sim.ts shipPoint`" when `render.ts:62` already imports `sim.ts`.
- **Three UNDOCUMENTED deviations caught by Reviewer audit** — the design-spec conflict (round 1), the
  tombstone's misstated `.SBTTL` structure and the deliverable header still recommending the retired
  fix (round 2), plus four more in round 3. All filed rather than fixed in-flight; all to sw8-18.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **No sibling test was re-seated in RED, deliberately.** The story context and the TEA sidecar both
  warn that a story changing a hit/collision contract should re-seat siblings during RED rather
  than leave Dev stuck between a new AC and an old test. I measured the collision instead of
  pre-empting it (see the blocking Gap finding): `homing-fireball.test.ts` :106 and :149 redden
  ONLY under the specific fix that retargets `homeShots`, and that fix is measurably wrong. Since
  the correct seam is still unruled, re-seating those two tests now would be re-seating them to a
  guess — and their intent ("the shot stays on its launch line toward the pilot" / "the trajectory
  is dt-invariant") is exactly the property the wrong fix violates, so weakening them pre-emptively
  would delete the signal that caught it. They stay as-is; whichever seam is ruled, re-seating is a
  RED-round-2 job with the ruling in hand.
  → ✓ **ACCEPTED by Reviewer:** the restraint was correct and it paid off. Not guessing the seam kept
  `homing-fireball.test.ts`'s launch-line and dt-invariance assertions intact, and those are exactly
  the two that caught the wrong fix when it was measured. Both suites are green under the seam that
  was actually ruled, so no re-seat was ever needed.

### Dev (implementation)

- **Retired `spaceEye` rather than re-seating the pilot onto it**
  - Spec source: `.session/sw8-8-session.md`, TEA blocking Question + Architect Assessment (seam ruling)
  - Spec text: TEA — "The pilot is currently at TWO places at once… Every fix must collapse that to one point"; Architect — "`ST.UX` is the STARFIELD's register. Retire `spaceEye` as a camera/gun/visibility origin and return the pilot to ONE point — the cockpit at the world origin."
  - Implementation: deleted `spaceEye`/`SPACE_EYE_SHIFT_PER_FRAME`/`EYE_WRAP`; `beamOrigin`, `cameraView`'s space arm and `tie-status`' C_PV all read the cockpit. Left a tombstone with the full ST.UX source case in `gameRules.ts`.
  - Rationale: the 1983 source has exactly one reader of ST.UX — the star generator (`WSSTAR.MAC:98-102`) — and sw8-1 ported it twice. Keeping a dead exported `spaceEye` would invite a third re-derivation, which is the failure mode the tombstone exists to block.
  - Severity: major
  - Forward impact: sw8-1's camera drift is retired (its starfield drift, `STAR_LATERAL_SPEED`, is untouched and still pinned). Any future story wanting the Death Star off-centre must move `deathStarPlacement`, not the camera.
  - → ✓ **ACCEPTED by Reviewer:** I re-derived the ROM case from primary source rather than from this entry, and it holds — `ST.UX` is declared inside the `;STARS` RAM block (`WSGLOB.MAC:458-466`), `VWSTAR` is its sole reader, and, decisively, NO space-phase code writes the player's world position at all (`SMVSP1`'s entire body is `STD ST.UX`; every `M$TX+M.S1` writer is ground/trench/reset). Deleting the symbol rather than leaving it dead is the right call for the same reason the tombstone gives. The related MEDIUM about the design spec is filed under Reviewer (audit) below, not against this entry.

- **Edited five test files, which is normally TEA's ground**
  - Spec source: `.session/sw8-8-session.md`, Architect Assessment — "The 5 failures are the blast radius" table
  - Spec text: per-test dispositions — "**Retire.** The premise is unsourced." / "**Re-seat** onto the starfield" / "**Invert.** It should now assert the pyramid IS measured from the cockpit." / "All of it lands in sw8-8."
  - Implementation: inverted sw8-1's AC2/AC3 and sw7-24's C_PV test, re-seated sw8-1's AC5 and TEA's control onto the starfield, repointed `tie-in-front-loiter` at `COCKPIT`, and renamed `render.moving-eye.test.ts` → `render.space-camera.test.ts` so the filename stops asserting the retired premise.
  - Rationale: these tests assert a behaviour the ROM refutes, so making them pass by changing code was impossible; the dispositions were specified by Architect, not chosen by me. I added a MIRROR case to the inverted C_PV test (a TIE inside the pyramid must still read in-view at both frame values) so the inversion is a real constraint and cannot be satisfied by "C_PV never sets".
  - Severity: major
  - Forward impact: sw8-1's and sw7-24's acceptance records now differ from what those stories shipped; both files carry an inline note explaining the inversion and citing the source. Reviewer should scrutinise each edit as a goalpost-move candidate.
  - → ✓ **ACCEPTED by Reviewer, with one carve-out.** I treated all five as goalpost-move candidates and they survive: test-analyzer independently restored the retired `spaceEye` in a scratch worktree and confirmed all three inversions genuinely FAIL against the old behaviour, so they are discriminators, not rewrites-to-green; the added C_PV mirror case is genuinely exercised; and the `tie-in-front-loiter` edit is a provable no-op (`spaceEye` returned `[x,0,0]`, so its `[2]` was always `0`). **Carve-out:** one of the inverted assertions — the Death Star holding the optical axis — over-reaches past the ROM claim and contradicts the design spec's longplay anchor. That is the MEDIUM in the assessment; the other four dispositions are sound.

- **Exported `COCKPIT` from `gameRules.ts` (a new public symbol no test demanded)**
  - Spec source: `star-wars/CLAUDE.md`, "The Hard Architectural Boundary"; sw7-16 precedent in `tests/support/aim.ts`
  - Spec text: aim.ts — "Never hand-write `[0, altitude, 0]` (or `trenchView`) in a test to stand in for the camera… it would have sat green through any drift in render.ts."
  - Implementation: `const COCKPIT` → `export const COCKPIT` in gameRules; consumed by `tie-status.ts`, `render.ts` and two tests.
  - Rationale: `tie-status` cannot import `shipPoint` from `sim` without creating a core import cycle — the very reason `spaceEye` was moved into gameRules by sw7-24. The alternative was a fourth hand-written `[0,0,0]`. Minimal-change discipline argues against new exports, but duplicating the cockpit literal is the specific anti-pattern sw7-16 was fought over.
  - Severity: minor
  - Forward impact: `sim.ts:136` still keeps its own private `COCKPIT` copy (pre-existing, untouched). A follow-up could collapse the two, but that is out of this story's scope.
  - → **PARTLY FLAGGED by Reviewer.** The export decision itself is ACCEPTED — the core import cycle is real (`tie-status` ← `sim` is exactly why `spaceEye` lived in gameRules), `Vec3` is a `readonly` tuple so the shared reference cannot be mutated (compile error; [SEC] proved it with a probe), and every math consumer was verified never to write its arguments. What is FLAGGED: the deviation itself is honest and the disclosure is accurate, but the JUSTIFYING COMMENT it points at is not. `gameRules.ts:16-21` argues the export exists so nobody writes "a fourth hand-written `[0,0,0]`" while the THIRD one sits unconsolidated in `sim.ts:136` (used at `:1510`, `:2169`). Corroborated by rule-checker violation #17. Low severity — either consolidate, or soften the comment so it stops claiming a benefit it did not deliver.

### Reviewer (audit)

- **The change contradicts the epic design spec's sw8-1 entry, and no one logged it**
  - Spec source: `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`, §5 sw8-1 (lines 91-100) and the §1 evidence anchor (lines 26-35)
  - Spec text: "**Investigate:** `ST.UX`/`ST.UY`/`ST.UZ` viewer-translation math in `WSSTAR.MAC` + its frame-counter drive in `WSMAIN.MAC`… **Fix:** drive `cameraView(state)`'s space branch from the ported viewer vector so the world (stars, Death Star, TIEs) slides past a moving eye; the Death Star may leave frame… **Acceptance:** at a cabinet-matched wave/point, the DS sits off-centre / off-screen". And the anchor: "Longplay ~wave 4 (score 352,171): mid space-combat, the **Death Star is entirely out of frame**".
  - Implementation: sw8-8 does the OPPOSITE — it removes `cameraView`'s space branch from the viewer vector entirely and pins the Death Star on the optical axis.
  - Rationale: the spec's own instruction names `WSSTAR.MAC` — the STAR generator — as the source for a WORLD camera, and that inference is what introduced the defect. Per the spec-authority hierarchy the session's Architect ruling (rung 1) outranks an architecture doc (rung 4), so the change is authorised. But the spec is still on disk telling the next reader to do the thing we just undid.
  - Severity: medium
  - Forward impact: the spec's §1 evidence anchor is a REAL cabinet observation that our port no longer reproduces, and nothing currently explains it. The design spec should be amended (not silently left) and the Death-Star-motion follow-up filed, or a future story will re-follow §5 sw8-1 and re-introduce the eye/cockpit split.

- **A vacuous suite was left behind, against a rule the author was operating under**
  - Spec source: the TEA agent charter (`.pennyfarthing/` agent definition, `<critical>` "EVERY TEST MUST ASSERT SOMETHING MEANINGFUL") and TEA's own RED-phase Delivery Finding in this session
  - Spec text: TEA charter — "**If you find a vacuous test in pre-existing code, fix it or remove it.** Do not preserve broken tests." TEA's finding — "`tests/core/bounded-eye-combat.test.ts` … is the suite that was supposed to own 'incoming fire stays fair' … Recommend a pointer comment there to this suite once GREEN lands."
  - Implementation: the file was not touched. Post-diff its four tests cannot fail (`eyeOf` is constant), and its header states the retired `spaceEye` as present-tense fact.
  - Rationale: none given — this appears to be an oversight rather than a decision; the same commit correctly retired the sibling `render.moving-eye.test.ts`.
  - Severity: high
  - Forward impact: the designated guard for sw8-2's fire-fairness invariant is now incapable of failing, so a regression of the eye/cockpit split would be caught only by the new suite while `bounded-eye-combat` stays green and reassuring.

### Dev (implementation) — rework round 1

- **Rewrote `bounded-eye-combat.test.ts` as `space-eye-is-cockpit.test.ts` rather than deleting it**
  - Spec source: `.session/sw8-8-session.md`, Reviewer Assessment "Required before merge" item 1 (the HIGH)
  - Spec text: "Retire or invert `tests/core/bounded-eye-combat.test.ts`… either delete it with a tombstone pointing at the new suite, or invert it to 'the eye stays at the cockpit regardless of `frame`' so it can fail again."
  - Implementation: took the INVERT branch and went one step further than the wording. Three tests: (1) `eyeOf` is EXACTLY `COCKPIT` at frame 0, after a real in-space run, and at frame 50,000; (2) a closing fireball, flown by the real `homeShots` law, is aim-reachable on EVERY frame through impact — verified arrived via the sim's own `player-death` event, not by a proximity guess; (3) sw8-2's AC11 fixed-depth anchor, kept. `git rm` on the old path, new file, header carries the full "why it was rewritten" case and points at the live-fire sibling.
  - Rationale: deleting it would have left sw8-2's AC9/AC11 with no cheap deterministic guard at all, and the reachability-through-impact property is the one sw8-2's fixed-depth fixture structurally could not see. Test (1) is stated as exact equality rather than a bound because sw8-2's `|eye| < 33_000` bound is precisely what let a blinding ±2048 eye pass — there is no acceptable non-zero offset, so there is no bound to tune.
  - Severity: minor
  - Forward impact: net −1 test (4 → 3); the suite name and file path change, so anything grepping for `bounded-eye-combat` (nothing in `src`/`docs`; two prose mentions in the sw8-2 archive and the sw8-8 story context) now points at history.
  - → ✓ **ACCEPTED by Reviewer (round 2).** Invert was the right branch and the result is stronger than the brief asked for. [TEST] re-ran BOTH mutations in a scratch worktree rather than trusting the entry: sw8-2's bounded ±2048 wrap reds tests 1 and 2 while test 3 survives; sw8-1's unbounded eye reds all three. That split is itself the evidence for the rewrite — the fixed-depth anchor provably cannot see the defect. [RULE] independently confirmed round-1 violation #16 is closed (file deleted, replacement mutation-tested). One caveat, filed as a Low: [TEST] showed test 3's fixtures are a strict subset of test 1's, and test 1 asserts exact equality on the same states, so no mutation can red test 3 while test 1 stays green — it is an AC anchor, not added coverage. Not vacuous (mutation A reds it), so not a defect.

- **Found and fixed a second, undisclosed way the old suite was lying: its "long run" fixture had left the space phase**
  - Spec source: Reviewer Assessment, the HIGH (scope: "its `frame: 50_000` and `advance(spaceRun(), 1600)` fixtures built specifically to exercise drift")
  - Spec text: the finding treats both fixtures as merely CONSTANT post-diff.
  - Implementation: measured it — `advance(spaceRun(), 1600)` returns a state in the TRENCH, where `eyeOf` reads `[0, 768, 0]` (the trench seat), because sw8-11 later made the space phase TIME-boxed (~19 s ≈ 390 game frames) and that fixture predates it. So it was measuring the wrong camera even before this diff flattened it. The replacement steps 300 frames and ASSERTS `phase === 'space'`; anything needing a deep frame counter sets `frame` directly instead of playing to it.
  - Rationale: a fixture that silently walks into another phase is the same class of defect as the HIGH and would have re-appeared the moment the phase length changed again. The assert makes it loud instead.
  - Severity: minor
  - Forward impact: none outward; a note for whoever changes the space phase length next.
  - → ✓ **ACCEPTED by Reviewer (round 2).** Verified and it is a real catch that my round-1 HIGH did not reach — I called those fixtures merely constant; they were measuring the trench camera. Corroborated by arithmetic I ran myself: `SPACE_PHASE_END_S = 21` less the 39-frame first-wave head start (`state.ts:919-922`, 1.95 s) is a ~19.05 s box, and 1,600 game frames is ~78 s of `dt` — three phases past space. `TRENCH_EYE_SEAT = 768` (`trench-channel.ts:108`) matches the observed `[0, 768, 0]` exactly. The added phase assert is the correct fix.

- **Restated the Death-Star assertion to pin the CAMERA, and did not simply delete it**
  - Spec source: Reviewer Assessment "Required before merge" item 2 (the MEDIUM)
  - Spec text: "retired or restated as 'the camera does not move the Death Star', not 'the Death Star does not move'… correct the 'if the longplay shows…' hedge to cite the spec's wave-4 anchor as established."
  - Implementation: `|deathStarViewX| < 1e-6` → `deathStarViewX ≈ deathStarPlacement(s).pos[0]` (9 dp) at each of 12 checkpoints. The hedge is gone; the comment now states the wave-4 longplay anchor as established fact, says our port cannot reproduce it, and names sw8-17 as the story that must.
  - Rationale: restating keeps the tripwire against the actual failure mode (re-deriving the wander as a camera slide, which is what broke fire fairness) while releasing the claim the ROM does not support. Mutation-proven both directions: a camera slide reddens it; giving the STATION its own lateral motion leaves it green — which is exactly what round 1's version got wrong.
  - Severity: minor
  - Forward impact: sw8-17 can now port the station's motion without having to delete a test first.
  - → ✓ **ACCEPTED by Reviewer (round 2).** This is the finding I raised in round 1 and the restatement lands it precisely. [TEST] proved it in BOTH directions, which is what makes it a restatement rather than a deletion: a camera slide fails it (1,888-unit displacement), and giving the STATION its own lateral motion — the sw8-17 change — leaves it green. Round 1's `|viewX| < 1e-6` would have failed the second, so sw8-17 would have opened by deleting a test. The hedge is gone and the wave-4 longplay anchor is now cited as established.

- **Consolidated `sim.ts`'s private `COCKPIT` instead of softening the comment**
  - Spec source: Reviewer Assessment "[LOW] [RULE] `src/core/sim.ts:136` still holds a private duplicate `COCKPIT`" — "Either consolidate or soften the comment."
  - Spec text: "the `gameRules.ts:16-21` comment should stop claiming an anti-duplication benefit it did not deliver."
  - Implementation: took the consolidate branch — deleted `const COCKPIT` from `sim.ts` and imported the `gameRules` export; rewrote the `gameRules` comment to describe what is now true (one definition shared by the core and the space camera) instead of arguing for the export.
  - Rationale: consolidating makes the claim true rather than withdrawing it, and it is a pure alias substitution (both were `[0,0,0]: Vec3`; the two call sites copy or read elements, never write).
  - Severity: minor
  - Forward impact: `sim.ts` line numbers shift by 1 — 25 audit citations re-anchored (0 lost, diff is line-number-only).
  - → ✓ **ACCEPTED by Reviewer (round 2).** Consolidating was the better of the two branches I offered, and the rewritten comment no longer over-claims — I checked the claim's exact scope myself: the only other `[0,0,0]` literals in `src/core` are `ZERO` (used solely as a zero VELOCITY, `sim.ts:1909`) and a velocity literal at `sim.ts:411`; neither stands in for the cockpit, so "the single definition the whole core and the space camera share" is literally true. The surviving hand-written stand-ins are all in `tests/`, which the comment does not claim. [RULE] reached the same verdict independently and confirmed the import-cycle rationale is real. [SEC] traced every consumer of the now-shared array and found no mutation path: `Vec3` is a `readonly` tuple enforced by the `tsc --noEmit` build gate, the math primitives all return new arrays, and `shipPoint` spread-copies rather than aliasing.

- **KEPT the dead `state` parameter on `computeStatus`, against the Reviewer's LOW**
  - Spec source: Reviewer Assessment "[LOW] [SIMPLE] `computeStatus(e, state, rng)` now has a dead `state` parameter" (flagged as fix-or-log, author's discretion)
  - Spec text: "the signature now advertises a dependency on game state that no longer exists."
  - Implementation: not removed. Documented instead — a note on the signature saying it is deliberate, why, and that `noUnusedParameters` is off.
  - Rationale: removing it would GUT `tie-fire-visibility.test.ts:120-151`, the inverted C_PV test the Reviewer certified as a genuine discriminator. That test proves the pyramid is frame-independent by feeding the same TIE at `frame: 0` and `frame: 128` and requiring the same verdict — it can only do that if `state` is a parameter. Drop the parameter and the guarantee degrades to a signature tautology that a future re-wiring would satisfy just by adding the argument back. Hollowing out a certified guard to tidy a signature is the same defect this round exists to fix, so the disclosure is the right trade, not the deletion. It is also the vehicle the C_AH TODO in that file needs.
  - Severity: minor
  - Forward impact: the signature stays wider than its body until C_AH lands; a reader hitting it now finds the reason at the declaration.
  - → ✓ **ACCEPTED by Reviewer (round 2).** A refusal of a Low, argued rather than ignored, and the argument holds — I checked it myself instead of taking it: `tests/core/tie-fire-visibility.test.ts:134-140` builds `{ ...makeSpaceState(), frame }` and passes it as the second argument, so that parameter is the ONLY path by which `frame` can reach the C_PV computation. Remove it and the frame-invariance discriminator cannot be written at all. [RULE] verified all three factual sub-claims in the new comment independently (state unread; the test really varies frame through it; `noUnusedParameters: false` really is tsconfig.json:8). Trading a tidy signature for a live guard would have been the same defect as the round-1 HIGH; declining was correct.

- **Did not pin the C_PV fire-count change**
  - Spec source: Reviewer Assessment "[LOW] The C_PV reseat changed incoming-fire counts, undisclosed and unpinned."
  - Spec text: "seed 1234 goes 3 → 5 shots per space phase… it is a gameplay change nobody stated, and no test pins it."
  - Implementation: disclosed here and in Delivery Findings; no test added.
  - Rationale: the count is a joint product of the fire cadence, the frame-driven gate and wave timing — TEA's own RED finding already flags space fire as too sparse and headed for its own backlog story. A per-seed count assertion would pin an incidental number this story does not own and would go red on the story that fixes the sparsity. The direction (slightly more fire, because the pyramid is now measured from where the player actually is) is ROM-faithful.
  - Severity: minor
  - Forward impact: whoever tunes space fire rate should expect these counts to move; there is no test standing in the way.
  - → ✓ **ACCEPTED by Reviewer (round 2).** Agreed, and the reasoning is the right one: a per-seed fire count is a joint product of cadence, the frame-driven gate and wave timing, none of which this story owns, and pinning it would go red on the story that fixes the sparsity TEA logged. Disclosure is the correct disposition for a non-defect gameplay delta.

### Dev (implementation) — merge resolution round

- **The "keep the dead `state` parameter" deviation is SUPERSEDED, not reversed**
  - Spec source: `.session/sw8-8-session.md`, my own round-2 deviation and the Reviewer's ✓ ACCEPTED stamp on it
  - Spec text: "`state` IS UNUSED as of sw8-8 and is kept deliberately… It is also the vehicle the C_AH TODO below needs."
  - Implementation: deleted the whole justifying comment block. uf1-12 (`#138`, on develop) made `state` genuinely used — `computeStatus` reads `state.aimX / state.aimY / state.aspect` to build the C_PS sights ray. A parameter that is used needs no defence, and a comment insisting it is unused would be a plain falsehood.
  - Rationale: the argument I made and the Reviewer accepted was sound on the tree it was made against; the merge falsified its premise, not its logic. Leaving the stamped deviation in place while deleting the comment is the honest record — I am not claiming the Reviewer was wrong, and I am not keeping prose the merge disproved.
  - Severity: minor
  - Forward impact: none. The C_AH TODO the comment leaned on is also gone — uf1-3 (`#137`) implemented C_AH from `e.damaged`.
  - → ✓ **ACCEPTED by Reviewer (round 3).** Superseded is the right word and the right disposition. I verified both halves rather than taking them: the comment block is gone (`grep -rn "IS UNUSED" src/ tests/` returns only two unrelated hits, `state.ts:1048` and `sim.ts:1951`, neither about this parameter), and the premise really is falsified — `computeStatus` now reads `state.aimX / state.aimY / state.aspect` at `tie-status.ts:174` to build the sights ray. The replacement doc block (`:97-102`) enumerates eight bits and the enumeration is correct (C_AS, C_PN, C_PV, C_PS, C_AG, C_AH, C_R1, C_R2). Note what did NOT get lost with the comment: the frame-invariance guard the round-2 argument existed to protect is still live and still routes through this parameter — `tie-fire-visibility.test.ts` feeds `{ ...makeSpaceState(), frame }` at 0 and 128 and requires one verdict, and the merge ADDED a second such guard for C_PS at `tie-sights-status.test.ts:206-222`. The argument was retired because it won, not because it was abandoned.

- **Re-seated uf1-12's loiter fixture, which passed only because of the defect sw8-8 removes**
  - Spec source: SM Assessment (finish attempt 1), scope item 3 — "Re-seat the 25 uf1-12 tests that stage the moving eye"
  - Spec text: "Expect the sibling-fixture fan-out the Dev sidecar warns about: run the FULL suite, not the named files."
  - Implementation: `tie-loiter-sights.test.ts`'s in-play fixture moved from `[0, 0, -6000]` (dead ahead) to `[6000, 0, -6000]` (45° off, the C_PV pyramid edge). Nothing else in that test changed.
  - Rationale: the one re-seat that is NOT mechanical, and it exposes a real behaviour change rather than a fixture quirk. The test's negative half — "yoke parked ⇒ 20$ stays unvisited" — held only because the eye was the drifting `spaceEye`, off to one side, so the centred ray missed a target seated on the ORIGIN. With the pilot back at the cockpit, a fighter beelining him is under the parked crosshair BY CONSTRUCTION: the crosshair and the fighters' target are now the same point. I measured rather than guessed the new seat — at 1,500 and 3,000 lateral the loiter weave still carries it into the parked band inside 900 frames; 6,000 stays wide. Mutation-proven afterwards: forcing C_PS never to set reds the positive half, so it still discriminates the sights mechanism and is not tuned-to-green.
  - Severity: **major** — a gameplay change to a story that shipped three days ago
  - Forward impact: uf1-12's loiter-break (`TCH1DZ` → 20$) now fires MORE often in play — any fighter closing on the cockpit is in the sights band without the player steering. I believe this is ROM-correct (the sights are the player's crosshair, and the cabinet's space pilot is fixed at the origin, `WSMAIN.MAC:2522-2529`), but uf1-12's ACs were written and reviewed against the moving eye and nobody has re-read them under the new seam. Reviewer should rule whether that needs its own story.
  - → ✓ **ACCEPTED by Reviewer (round 3), and here is the ruling you asked for: NO separate story is needed for the SEAM, because uf1-12's ACs are written RELATIONALLY.** I re-read all six from `origin/main:sprint/epic-uf1.yaml` — the binding one is AC-6, "C_PS is measured against the SAME aim ray the gun uses, viewport aspect included." Not "the ray from `spaceEye`". The gun's origin and the sights' origin moved together (`sim.ts:311` `beamOrigin = shipPoint(state)`, `tie-status.ts:134` `const eye = COCKPIT`, both the world origin in space via `shipPoint`'s space arm), and both read the same shadowed yoke from `sim.ts:158`. So AC-6 is satisfied more exactly after the merge than before, not merely still. AC-2/AC-3/AC-4 are VM-level and eye-independent; AC-5 (the header no longer lists C_PS as out-of-scope) survives the rewrite — I checked, the header now enumerates three absent bits and C_PS is not among them. And the ruling direction is not a judgement call: the ROM's space pilot is fixed and the sights ARE his crosshair, so the cockpit is the only defensible origin regardless of what it retires.
  - **Two corrections to the entry's own reasoning, neither of which changes the disposition.** (1) "45° off, the C_PV pyramid edge" is true geometry but irrelevant to what the test measures — `TCH1DZ` gates on C_PN/C_PS/C_AS/C_AG and never on C_PV (`tie-vm.ts:341-342`), and `beamHit` carries no FOV clamp, so the pyramid cannot be what holds the negative half. I raised this as the prime suspect for a vacuous negative and [TEST] refuted it with measurement, not argument. (2) "under the parked crosshair BY CONSTRUCTION" holds only for the degenerate dead-ahead beeline the old fixture used. In general a beeline is a RADIAL line, so its angular offset from the origin is constant and its perpendicular distance shrinks with range — every beelining fighter enters the 500 u band eventually, but at range `500/sin θ`, not always. The forward-impact sentence is right; the mechanism sentence overstates it.
  - **The re-seat is measured, not tuned-to-green — but the admissible window is narrow and undeclared.** [TEST] ran the real `stepGame` frame-by-frame: parked, C_PS reads 0 for all 391 frames of the flight with a minimum perpendicular distance of 916 u against the 500 u band — a 416 u margin, not a hairsbreadth; tracked, C_PS reads true on 70 of those 391 frames. Both degenerate stand-ins are caught. But its seatX sweep shows 6000 is the ONLY value of six that discriminates: 0/1500/3000/7500 break the negative half and 4500 breaks the positive. That is a real fragility and it is recorded as a Low in the assessment, with the fix (an in-loop fixture guard) named there.

- **Corrected uf1-12's C_PS origin comment rather than leaving it**
  - Spec source: `star-wars/CLAUDE.md` (ROM citations must be checkable) and the sw8-8 tombstone
  - Spec text: develop's `tie-status.ts` — "All three terms match `beamDir`/`beamOrigin` in sim.ts: the same moving eye (`spaceEye`, so the origin is a `state.frame` derivation shared with the camera)"
  - Implementation: rewritten to name the COCKPIT as the shared origin, record that uf1-12 wrote it as the moving eye, that this was true of `beamOrigin` when written and stopped being true days later, and why it matters more for C_PS than for the gun (C_PS gates a loiter break, so an eye offset would peel fighters off at a crosshair the player is not looking down).
  - Rationale: otherwise the sentence describes an origin the code no longer uses, in the file the next ST.UX reader opens first.
  - Severity: minor
  - Forward impact: none.
  - → ✗ **PARTLY FLAGGED by Reviewer (round 3).** Correcting rather than leaving it was right, and the substantive content is accurate — I verified every ROM anchor in the rewritten C_PS block against `~/Projects/star-wars-1983-source-text` and they hold exactly: `WSMAIN.MAC:3930` is `CHSET C$PS ;STATUS: ALIEN IN PLAYER SITES`; `:3904-3906` is `LDD TMPSIZ / LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON`; `:3920-3923` is the doubling with `;ALLOW LARGER WARNING AREA`; so `SIGHTS_BAND_FACTOR = 2` is 3 ÷ 1.5 re-derived from primary source, not inferred.
  - **What is FLAGGED is the CONDENSATION.** The rewrite compresses the tombstone's carefully-qualified case into parentheticals that the ROM's own text appears to refute, and it does so twice, differently, in one file: `tie-status.ts:13-14` says ST.UX is "the starfield's register, never a viewer" while `WSGLOB.MAC:465` reads `ST.UX::	.BLKB 2			;VIEWER X POSITION`, and `:130-131` says "never a camera" for the same fact ten lines later. The tombstone survives this because it disambiguates outright ("`ST.UX::`'s own `;VIEWER X POSITION` names the QUANTITY, not a consumer"); the condensed copy drops the qualifier and keeps the conclusion. The same pattern recurs in the test comment this round added — see the Medium in the assessment. This is the round-2 defect class reproduced in new prose, in the file the entry itself calls "the file the next ST.UX reader opens first," which is exactly why it matters. Non-blocking; filed to sw8-18.

- **Took develop's side wholesale on all nine citation conflicts**
  - Spec source: SM Assessment scope item 5
  - Spec text: "take develop's side, then `reanchor-citations.mjs --write` … never `--ours`: `--ours` silently clobbers the other story's `remediated_by` stamps"
  - Implementation: `git checkout --theirs` on all nine, then re-anchored (60 correct, 36 re-anchored, 0 lost). Verified two ways beyond the tool: the applied diff contains no non-`"line"` change, and per-file `remediated_by` counts are identical to develop's.
  - Rationale: these files are pure derived anchors; the only thing a conflict can destroy is the other story's semantic stamps, so the safe resolution is always "take theirs, recompute".
  - Severity: minor
  - Forward impact: none.
  - → ✓ **ACCEPTED by Reviewer (round 3) — and this is the item I tried hardest to break, because the entry's own two verifications cannot detect the failure mode that story td1-13 was filed to describe.** "No non-`line` change" and "`remediated_by` counts match develop" would BOTH pass a mis-anchored duplicate. td1-13 (`origin/main:sprint/epic-td1.yaml`, filed by Dev during uf1-12) names the hazard and the exact two verbatims: the re-anchor tool matches nearest-line, and `src/core/sim.ts` carries `      damage++` and `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {` twice each because the space and surface cockpit-damage paths are near-identical — "so a mis-anchored S-016 would describe the surface routine while reading green forever."
  - I enumerated every pin in all ten findings files programmatically. Exactly three have a duplicate verbatim, and **two of the three moved in this round**: `G-009` → `sim.ts:624` (occurrences at 624 and 1109) and `S-016` → `sim.ts:625` (occurrences at 625 and 1110). Both landed on the SPACE occurrence — line 605's `// --- Cockpit damage: any TIE that reaches it, any fireball that lands`, emitting `cause: 'enemy'` — and not the surface turret path at line 1105 emitting `cause: 'turret'`. That matches what the findings actually claim (G-009 is the fireball→player sweep; S-016 is "every colliding TIE and fireball … does damage++", and TIEs are space-only). The +1 shift is arithmetically exactly right for this diff's net effect above those lines. The third duplicate, `M-013` (`  edges: [`, 15 occurrences in `models.ts`), did not move.
  - Independently: 96 gate-checked pins (excluding `remediated_by` and `NO_COUNTERPART`, which `check-citations.mjs:150-165` deliberately does not re-open against the working tree), **0 mismatched** — reconciling the entry's 60 + 36 exactly. [RULE] cross-checked all 38 changed `(file, line, verbatim)` triples and found all 38 exact. [PREFLIGHT] re-ran the tool read-only: `96 already correct, 0 re-anchored, 0 lost`, and confirmed it mutated nothing without `--write`. The resolution is correct; the entry just could not have known it was correct.


### Reviewer (audit) — round 2

- **UNDOCUMENTED — the tombstone misstates the ROM structure it cites as its own authority, and I wrongly VERIFIED it in round 1**
  - Spec source: `star-wars/CLAUDE.md` (the ROM source is authoritative; citations must be checkable) and the tombstone's own stated purpose, `src/core/gameRules.ts:227-243`
  - Spec text: `gameRules.ts:238-239` — "Every writer sits under `WSMAIN.MAC` `.SBTTL MOVE STARS IN SOME DIRECTION` and is an `SMV*` routine — banner, instructions, scoring screen, high scores"; `:241` — "The space-wave writer is `WSMAIN.MAC:2523-2531` — `SMVSP1/SMVSP2/SMVNXT/S1MV:`"
  - Implementation: three separate citation defects in one five-line evidentiary block, all verified by me against `~/Projects/star-wars-1983-source-text` and independently by [RULE]. (1) The "every writer" claim is FALSE, and falsified by the tombstone's own next bullet: `.SBTTL MOVE STARS IN SOME DIRECTION` is at `WSMAIN.MAC:2243` and ends at `:2291`; `.SBTTL MOVE THE PLAYER` begins at `:2292`; the space-wave writer at `:2522` is under MOVE THE PLAYER, and `S1MV` is not an `SMV*` name. (2) The span `2523-2531` omits the `SMVSP1:` label it names (`:2522`) and runs into `S1MVHP:` (`:2531`), an unrelated routine — while the spec amendment added in the SAME commit cites `2522-2530` correctly for the identical fact, so the branch ships two disagreeing citations for one ROM line. (3) `S1MVHP` (`;MOVE DURING HYPER`, `LDD FRAME / JSR LSLD8 / STD ST.UX`, `:2531-2536`) is itself an `ST.UX` writer absent from an enumeration claiming to be exhaustive.
  - Rationale: none — not logged by anyone. Round 1's Architect ruling made the same over-generalisation and my round-1 review stamped it `[VERIFIED]`. I had checked the star-screen writers and generalised to "every writer" without reading the `.SBTTL` boundary at `:2292`. That VERIFIED is hereby withdrawn.
  - Severity: medium
  - Forward impact: the correction STRENGTHENS the ruling — the ROM's own routine named "MOVE THE PLAYER" has a body that moves nothing but the stars, which is the sharpest available statement of the case — but as written the tombstone is checkably wrong in the direction that argues against its own conclusion. A future engineer who greps `ST.UX`, finds `SMVSP1` under MOVE THE PLAYER, and reads "every writer sits under MOVE STARS" will conclude the tombstone is unreliable — which is precisely the third re-derivation it exists to prevent. Filed as sw8-18.

- **UNDOCUMENTED — the deliverable suite's header still recommends the retired fix**
  - Spec source: the same tombstone (`gameRules.ts:227`), which forbids resurrecting `spaceEye`
  - Spec text: `tests/core/incoming-fire-reaction-window.test.ts:40` — "WHY NO EXISTING SUITE CAUGHT IT: `bounded-eye-combat.test.ts` (sw8-2 AC9) **checks** reachability against a STATIC hand-placed position"; `:45-46` — "Dev **may** close the eye/cockpit split from either side (seat the pilot at `spaceEye`, or home the shot and the hit sphere at the eye); **both satisfy every assertion here**"; `:47-48` — "The two controls at the bottom fence off … slowing the fireball, and **parking the eye**"
  - Implementation: unchanged since the RED commit `a759e4b`. The first sentence is present tense about a file THIS BRANCH deletes. The second offers two remediations that the story ruled out — one of which (`seat the pilot at spaceEye`) TEA measured as breaking frame-rate independence — and names a symbol that no longer exists. The third describes a control that round 1 re-seated onto the starfield; parking the eye is now the shipped design, not a failure mode.
  - Rationale: none given; the header was simply never revisited across two green rounds. Independently flagged by [RULE] as violation #3.
  - Severity: medium
  - Forward impact: bounded, because the new tripwire tests fail loudly on either recommended route — the damage is wasted effort, not a shipped defect. But it is the same defect class as the round-1 HIGH (a header stating retired facts in present tense), in the sibling file, and it contradicts the tombstone from inside the story's own deliverable. Filed as sw8-18.
  - → **Round 3 note:** still unchanged, correctly — SM scoped sw8-18 out of the merge round. [PREFLIGHT] re-swept all 14 surviving `spaceEye` mentions independently and reached the same single conclusion: `:46` is the one hit that reads as still offering `spaceEye` as a live option rather than narrating history. No new instance of this item; no regression.

### Reviewer (audit) — round 3

- **UNDOCUMENTED — sw8-8 broke its own design-spec citation, in the commit that broke it**
  - Spec source: `star-wars/CLAUDE.md` (citations must be checkable) and the round-2 finding that established this defect class
  - Spec text: `tests/shell/render.space-camera.test.ts:85` — `// out of frame" (\`docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:26-30\`)`, cited for the quoted longplay observation "mid space-combat, the Death Star is entirely out of frame"
  - Implementation: the cited span no longer holds the quote. `:26` is now the `### Evidence anchor — the moving eye` heading and `:28-31` is the opening of sw8-8's own **AMENDED** blockquote; the longplay sentence lives at `:45-46`. Verified both sides: at `9c6f19c` (pre-story) the quote sat at `:28-30` under that heading, so `:26-30` was CORRECT when written — and sw8-8's 31-line amendment, added in the SAME commit `b664763` as this test file, pushed it down 17 lines. Found by [RULE]; I confirmed it against both revisions.
  - Rationale: none — nobody logged it, and rounds 1 and 2 both read past it. The failure is structural rather than careless: the citation and the insertion that invalidated it were written together, so no diff ever showed them disagreeing.
  - Severity: medium
  - Forward impact: this is the sharpest instance of the class, because it is self-inflicted and it is the citation carrying the story's ONE piece of counter-evidence — the longplay observation that the cabinet DOES put the Death Star out of frame, which the amendment preserves as "still unexplained". A reader who follows `:26-30` lands on the amendment that reinterprets the observation and never reaches the observation itself. Fold into sw8-18.

- **UNDOCUMENTED — the tombstone's `.REPT 0` citation starts two lines past the directive it names**
  - Spec source: `star-wars/CLAUDE.md` (citations must be checkable); the tombstone's own stated purpose, `gameRules.ts:227-259`
  - Spec text: `gameRules.ts:240` — "The Death-Star ones are assembled OUT (`.REPT 0`, :2273-2290; call sites :2186/:2216/:2233 commented out)"
  - Implementation: `.REPT 0` is at `WSMAIN.MAC:2271`. `:2272` is `SMVDX1:`, and `:2273` is `LDD ST.UX` — the second line of that routine's BODY. The span end (`:2290` = `.ENDR`) is correct; only the start is wrong, and it lands on a line that is not the directive the parenthetical names. Found by [RULE]; I read `WSMAIN.MAC:2268-2292` myself and confirmed. Distinct from the three round-2 items — those were the "every writer" exhaustiveness claim, the `2523-2531` span, and the missing `S1MVHP` writer.
  - Rationale: none logged. `gameRules.ts` is byte-identical to the round-2 approved tree, so this is a round-2 miss newly discovered, not a resolution-round regression.
  - Severity: low
  - Forward impact: low on its own — the `.REPT 0`/`.ENDR` pair really does assemble the Death-Star writers out, so the CLAIM is true and only its anchor is off. It matters as the fourth defect in one five-line evidentiary block whose entire job is to be re-checkable. Fold into sw8-18.

- **UNDOCUMENTED — `sim.ts` keeps five lines of present-tense prose introducing a re-export it retired on the next line**
  - Spec source: the mechanical rule that a comment must not state retired facts in present tense — the round-1 HIGH and round-2 Medium in this same story
  - Spec text: `sim.ts:2163-2165` — "Re-exported here so the shell's camera (render.ts cameraView) and every existing caller keep their import path — the sw7-16 'one eye, one gun' invariant still routes through the single function." Immediately followed by `:2166` — "(sw8-8 retired the `spaceEye` re-export with the eye itself …)"
  - Implementation: the retirement was recorded by APPENDING a correction note rather than deleting the paragraph it corrects, so the file now asserts and un-asserts the same fact in five consecutive lines, and "Re-exported **here**" describes nothing that exists in the file. Found by [RULE]. I checked provenance: the identical block is at `94fb711:2132-2137`, so it shipped in the round-2 approved tree — a round-2 miss, not a merge artifact.
  - Rationale: none logged.
  - Severity: low
  - Forward impact: cosmetic but self-contradicting, in the file a reader opens to find out where the eye went. Fold into sw8-18.

- **UNDOCUMENTED — the `COCKPIT` export comment says "Neither can read `sim.ts shipPoint`" and one of the two can**
  - Spec source: round 2's PARTLY FLAGGED stamp on the `COCKPIT`-export deviation, which established that this comment's factual claims are in scope
  - Spec text: `gameRules.ts:19-20` — "`render.ts cameraView` and `tie-status.ts`'s C_PV pyramid both need it. Neither can read `sim.ts shipPoint` for it — `tie-status ← sim` is a core import cycle"
  - Implementation: the cycle argument is sound for `tie-status.ts` and does not apply to `render.ts`, which is SHELL and already imports `sim.ts` — `render.ts:62`, `import { surfaceShip } from '../core/sim'`. So `render.ts` could always have read `shipPoint`; the real reason it does not is architectural consistency, not a hard constraint. Raised as a low-confidence note by [RULE]; I confirmed the import.
  - Rationale: none logged. Pre-existing from round 2 (`gameRules.ts` unchanged).
  - Severity: low
  - Forward impact: none functional. It is a justification that over-claims, in the same comment round 2 already flagged once for over-claiming. Fold into sw8-18.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tests/core/incoming-fire-reaction-window.test.ts` — 5 tests: 3 RED (the defect) + 2 controls
  (green today, fencing off the two cheap fixes).

**Tests Written:** 5 tests covering AC1 (the ruling, evidenced below), AC2 (reachable at impact,
no blind tail) and AC3 (live-fire answerability).
**Status: RED** — 3 failing, 2 controls passing. Full suite 1982 passed / 3 failed / 1985 total
across 187 files (the 3 are all mine — no sibling breakage); `tsc --noEmit` clean.

### AC1 — THE RULING (the story's first deliverable)

Measured on develop @ `9c6f19c` after `npm ci`, under `NO_INPUT`, seeds 1983/1234/7/42/99/31337,
stepping the public `stepGame` one game frame at a time. **All durations are in seconds of
accumulated `dt`, at the sim's 20.508 Hz game frame — not 60 Hz.**

**The playtest report is half right, and the half that is wrong matters.**

1. **Flight duration is NOT the defect — REFUTED.** Spawn-to-impact measured **1.707 s – 2.194 s**.
   The floor is structural, not luck: a TIE may not fire inside `TIE_NEAR_BOUND` (`$800` = 2048)
   and the shot decays 7/8 per game frame to the 80-unit cockpit sphere, so the fastest possible
   arrival is `log(80/2048)/log(7/8)` = 24.28 frames = **1.184 s**. Nothing can arrive in under a
   second. The "died in <1s" reading, taken literally, is refuted — and that refutation is pinned
   as a control so no future change can "solve" this story by slowing the fireball down.

2. **The answerable window IS the defect, and it is absent exactly where a human reacts.** In
   **100 % of measured flights** the fireball went aim-unreachable **before** impact. Reach ran
   **2 %–66 %** of flight life; the **blind tail immediately before the hit was 0.731 s – 2.146 s**;
   `reachableAtImpact` was **false for every flight of every seed**. Worst case: reachable for a
   single 0.049 s frame, then blind for 2.146 s. So what the pilot experiences is not a fast shot —
   it is a shot that is visible and answerable while it is far away and then vanishes from the arc
   he can reach for the whole final approach. That reads in play as "it just killed me", which is
   what the report captured.

3. **Cause — the eye/cockpit SPLIT, isolated by counterfactual.** Re-measuring the identical
   flights from the world ORIGIN instead of from the eye gives **100 % reachability and
   reachable-at-impact for every one**. The fireball's own geometry is sound. `aimAt` divides
   lateral offset by remaining depth; as a shot decays toward the origin its depth → 0 while its
   offset from `spaceEye` → the eye's own offset, so the angle diverges and it necessarily leaves
   the view. **Any non-zero eye offset produces a blind tail** — sw8-2's bounding only changed how
   early the tail starts, which is why sw8-2 shipped believing this was closed.

4. **Live-fire confirmation (the answer to "is it shootable?").** A yoke clamped to ±1 — all
   `src/shell/input.ts` can physically produce — tracking a fireball inside 400 units with the
   trigger mashed scored **0 kills across 36/48/60 consecutive frames (1.8–2.9 s of continuous,
   correctly-aimed fire)** and took **3/4/5 hits**. The same runs with an unclamped (impossible)
   yoke killed **every** fireball and took **none**. The shot is mechanically hittable; the player
   cannot point at it. sw8-2's "the shootable half already exists" is true in code and unavailable
   in play.

**RULING: this is a genuine defect, not ROM-authentic.** In the cabinet the viewer and the cockpit
are the same point, so no such blind tail exists. Our clone has the pilot in two places at once —
at `spaceEye` for seeing and shooting, at the origin for being hit and homed at (sw8-2 AC12). The
fix is to collapse that to one point. **But the two obvious collapses are both blocked** (measured,
see Delivery Findings): retargeting homing to the eye breaks frame-rate independence because
`spaceEye` is a sawtooth of the integer `frame`, and parking the eye deletes sw8-1's drift. I
therefore recommend **Dev route the seam choice to Architect before implementing** — the ruling of
*what* is broken is settled and evidenced; the ruling of *which seat moves* is not, and the story
is 3 points.

### Rule Coverage

`.pennyfarthing/gates/lang-review/typescript.md` + the repo's own hard rule (`star-wars/CLAUDE.md`,
"The Hard Architectural Boundary").

| Rule | Test(s) | Status |
|------|---------|--------|
| core purity — no DOM/`Date.now`/`Math.random`; time only via `dt` | whole suite drives public `stepGame`; all time is `TICK_DT`, all randomness the seeded `initialState(seed)` | passing (by construction; repo's own `core-purity` suite still green) |
| determinism — identical input ⇒ identical output | every test re-runs the same seeds and compares against fixed expectations; `flightsOf(seed)` is called twice per seed across tests and agrees | passing |
| no vacuous assertions | every `expect` carries a message rendering the measured value; each RED test additionally asserts its scenario was non-empty (`flights.length > 0`, `framesOnTarget > 0`) so it cannot pass on an empty run | passing |
| test must be able to fail (mutation) | both controls mutation-proven — see below | passing |
| no implementation coupling | assertions are on the observable (reachability, kills, shield hits), never on `spaceEye`'s formula, so any seam Dev picks can satisfy them | passing |

**Rules checked:** 5 of 5 applicable. **Self-check:** 0 vacuous tests written; 0 found in the files
I touched.

### Mutation evidence (the controls are not scenery)

- **Park the eye** (`spaceEye` → `[0,0,0]`): all **3 RED tests turn GREEN** and *only* the
  `sw8-1's moving eye survives` control fails. That control is the sole thing standing between this
  story and a fix that silently reverts sw8-1.
- **Speed the fireball** (homing decay 7/8 → 1/2): only the `flight duration is NOT the defect`
  control fails, reporting `arrived in 0.439s`. It bites on exactly the class of change it fences.
- Both mutations were applied to a `cp` backup and restored by `cp` (never `git checkout`), md5
  verified back to `6a541575…` / `e6c95dae…`, and a **control run after restore** reproduced the
  original 3-fail/2-pass split.

**Handoff:** To Korben Dallas (Dev) for GREEN — but read the two **blocking** Delivery Findings
first; the obvious fix is measured-wrong and Architect should rule the seam.

## Architect Assessment (seam ruling)

**Decision: `ST.UX` is the STARFIELD's register. Retire `spaceEye` as a camera/gun/visibility
origin and return the pilot to ONE point — the cockpit at the world origin.**

### The source settles it

TEA's blocking Question asked which of the pilot's two seats should move. The 1983 source answers
it outright — `ST.UX` never had anything to do with the camera.

| Evidence | Source |
|---|---|
| The ONLY reader of `ST.UX`/`ST.UY`/`ST.UZ` in the entire tree is the star generator, which loads them straight into the Math Box translation registers before emitting star points | `WSSTAR.MAC:98-102` (`VWSTAR`), `LDD ST.UX ;STARS RELATIVE MOVEMENT` |
| Its two sibling registers name their purpose explicitly | `WSGLOB.MAC:752-753` — `ST.UY:: ;PLAYERS UNIVERSE Y FOR STARS`, `ST.UZ:: ;PLAYERS UNIVERSE Z FOR STARS` |
| Every writer lives under one section heading, and each is a `SMV*` "move the stars" routine | `WSMAIN.MAC` `.SBTTL MOVE STARS IN SOME DIRECTION` — `SMVBNR` (banner), `SMVINS` (instructions), `SMVSCR` (scoring), `SMVHIS` (high score) |
| The Death-Star star-movers are **assembled out** | `WSMAIN.MAC:2273-2290` sit inside `.REPT 0`; their call sites `:2186/:2216/:2233` are commented out |
| The space-wave writer sw8-1 ported | `WSMAIN.MAC:2523-2531` — `SMVSP1/SMVSP2/SMVNXT/S1MV:` `LDD FRAME / JSR LSLD7 / STD ST.UX ;STARS RELATIVE MOVEMENT` |

`WSGLOB.MAC:465`'s `;VIEWER X POSITION` is the single line that reads like a camera, and it is
naming the *quantity* (where the viewer is, for the purpose of drawing stars against it), not its
consumers — which its own two siblings disambiguate by saying "FOR STARS". Nothing in the ROM
draws a TIE, the Death Star, a fireball or the gun through `ST.UX`.

### What actually went wrong

sw8-1 read `S1MV` **correctly** and then applied it **twice**:

1. `src/core/starfield.ts` `STAR_LATERAL_SPEED` — the faithful port. Its comment already cites
   `WSMAIN.MAC:2529-2531` and reads it right: *"a viewer translation labelled 'STARS RELATIVE
   MOVEMENT', NOT a rotation; that is the sw8-1 AC1 ruling"*.
2. `src/core/gameRules.ts` `spaceEye` — a second, unfaithful copy wired into the world camera
   (`render.ts:364 cameraView`), then into the gun (`sim.ts:297 beamOrigin`, sw7-16/sw8-2) and the
   `C_PV` visibility pyramid (`tie-status.ts:92`).

Copy 2 is the entire cause of sw8-8. It displaced the pilot's eye and gun from the cockpit the
fireball homes at and the shield is scored at — the two-places-at-once TEA measured. sw8-2's AC12
then chose to *shrink* the split (`EYE_WRAP` ±2048) rather than close it, which is why sw8-2 shipped
believing fire fairness was solved. It cannot be solved while the split exists: TEA's counterfactual
(100 % reachable from the origin, 0 % at impact from the eye) is exactly the ROM behaviour on one
side and the mis-port on the other.

This also disposes of TEA's blocking Gap: homing at `spaceEye` broke frame-rate independence
because `spaceEye` is a sawtooth of the integer `frame`. That was the right result for the wrong
reason — nothing should home at it, because it is not where the pilot is.

### Design (validated, not proposed)

I applied the change as a throwaway probe, ran the full suite, and restored (md5-verified back to
`e6c95dae…` / `63d3da16…` / `e6ab5bf0…`; control run reproduced the original 3-fail split).

Three call sites move the pilot back to one point:

- `sim.ts:297` — `beamOrigin` drops the space special-case: `shipPoint(state)` in every phase.
- `render.ts:364` — `cameraView`'s space arm returns the cockpit origin instead of `spaceEye`.
- `tie-status.ts:92` — `C_PV` measures its view pyramid from the cockpit. This is a *fidelity*
  correction too, not just fallout: the ROM's pyramid is measured from the player, and the player
  does not move with `ST.UX`.
- `gameRules.ts` — `spaceEye` / `SPACE_EYE_SHIFT_PER_FRAME` / `EYE_WRAP` lose every consumer.
  Retire them (and the re-export at `sim.ts:2136`). Leave a tombstone comment pointing at
  `starfield.ts STAR_LATERAL_SPEED` as where `ST.UX` actually lives, so this is not re-derived a
  third time.

**The lateral drift is not deleted — it stays where the ROM puts it.** `STAR_LATERAL_SPEED` keeps
the starfield sliding, which was sw8-1's own headline observable ("starfield drifts laterally
instead of forward-streaming").

**Measured result:** all three sw8-8 RED tests PASS. Full suite 1980 passed / 5 failed / 1985.

### The 5 failures are the blast radius, and every one asserts the mis-port

| Test | Claim | Disposition |
|---|---|---|
| `render.moving-eye.test.ts` AC2 — "the space view matrix changes as the frame counter advances" | pins camera drift | **Retire.** The premise is unsourced. |
| `render.moving-eye.test.ts` AC3 — "the Death Star leaves screen centre over the space run" | pins camera drift | **Retire.** `deathStarPlacement` pins the station at `x=0`; it only left centre because the camera slid. The ROM's own finale comment is `;VIEW DETH STAR, ENLARGING` — centred and looming. |
| `render.moving-eye.test.ts` AC5 — "the camera path is deterministic AND non-constant" | pins camera drift | **Re-seat** onto the starfield: the *field* must still drift and stay seed-deterministic. That preserves the half of sw8-1 the ROM supports. |
| `tie-fire-visibility.test.ts` — "measures the pyramid from the MOVING eye (spaceEye), not the origin" | pins C_PV at the wrong origin | **Invert.** It should now assert the pyramid IS measured from the cockpit. |
| `incoming-fire-reaction-window.test.ts` CONTROL — "sw8-1's moving eye survives" | TEA's guard against parking the camera | **Re-seat** onto the starfield, exactly as TEA anticipated in the RED Design Deviation. Its intent (don't delete the drift) is preserved; only the subject changes from the eye to the field. |

Nothing else in 187 files moves. `homing-fireball.test.ts` stays green — the homing target is a
constant origin again, so TEA's dt-independence concern evaporates.

### Scope

All of it lands in sw8-8. Leaving a half-retired seam across two shipped stories is worse than a
3-point story that runs long, and four of the five re-seats are one-line intent inversions.

**Follow-up to file (do NOT absorb):** if the longplay shows the Death Star genuinely wandering
off-centre during a space wave, that is a property of the *station's* placement, not the camera —
port it as a lateral term in `deathStarPlacement`. Retiring the camera copy is correct regardless;
the drift, if real, must be re-derived from its own ROM mechanism rather than borrowed from the
starfield register.

**Decision: hand to Dev for GREEN.** The seam is ruled, the fix is validated end-to-end, and the
blast radius is enumerated with a disposition per test.

## Dev Assessment — Round 1 (superseded by Rework Round 1 below)

**Implementation Complete:** Yes
**Tests:** 1985/1985 passing across 187 files (GREEN). `tsc --noEmit` clean; `npm run build` clean.
**Branch:** `feat/sw8-8-incoming-fire-reaction-window` (pushed)

**Files Changed:**
- `src/core/gameRules.ts` — deleted `spaceEye` / `SPACE_EYE_SHIFT_PER_FRAME` / `EYE_WRAP`, replaced
  by a tombstone carrying the source case (every ST.UX site) so the camera is not re-derived a
  third time. Exported `COCKPIT`.
- `src/core/sim.ts` — `beamOrigin` is `shipPoint(state)` in every phase (the space special-case is
  gone); dropped the `spaceEye` import and re-export.
- `src/core/tie-status.ts` — the C_PV view pyramid is measured from `COCKPIT`. Imported from
  `gameRules`, not `sim`: `tie-status ← sim` is a core import cycle (the original reason `spaceEye`
  lived in gameRules), and a fourth hand-written `[0,0,0]` is what sw7-16 exists to prevent.
- `src/shell/render.ts` — `cameraView`'s space arm returns `COCKPIT`.
- `tests/shell/render.moving-eye.test.ts` → **renamed** `render.space-camera.test.ts` — AC2/AC3
  inverted, AC5 re-seated onto the starfield, AC7 kept.
- `tests/core/tie-fire-visibility.test.ts` — the C_PV test inverted, with a mirror case added.
- `tests/core/incoming-fire-reaction-window.test.ts` — TEA's drift control re-seated onto the
  starfield.
- `tests/core/tie-in-front-loiter.test.ts` — reads `COCKPIT` instead of `spaceEye`.
- `docs/audit/findings/*.json` (10 files) — 38 `ours` citations re-anchored.

**The citation gate caught the line drift and it was clean.** `tools/audit/reanchor-citations.mjs`
reported **58 already correct, 38 re-anchored, 0 lost**, and no finding cited any of the retired
symbols — so every one was a pure line MOVE, not a fixed line. The applied diff is 38 insertions /
38 deletions, all `"line": N` values, with no re-serialization damage (the known `\uXXXX` hazard did
not trigger — verified by filtering the diff for any non-line-number change and getting nothing).

**Mutation-verified, not just green:**
- Re-splitting the camera from the cockpit (`viewMatrix([1000,0,0])`) reddens both AC2 tests **and**
  the new Death-Star-axis test — the blind tail comes straight back.
- Additionally displacing the gun (reproducing the original bug shape: camera *and* `beamOrigin`
  off the cockpit) reddens AC3 as well, so all three of the story's tests bite on the real defect.
- Both mutations restored by `cp` backup, md5-verified, and a control run reproduced 1985/1985.

**Observed in play** (`npx vite --port 5294`, ownership proven via `lsof` to be THIS checkout, not a
sibling's): the space phase renders correctly — Death Star centred with its equatorial trench and
port dish, crosshair on it, TIEs in the swirl, HUD and shield readout intact, no console errors from
the change. An idle pilot still bleeds shields and dies to fire (the sw8-2-disclosed behaviour), and
the run drops to attract mode, so the loop is intact end to end. I did not get a clean two-frame
starfield-drift comparison out of the pixels — the frame is dominated by the symmetric Death Star
and TIE geometry, so a pixel-mean is not a usable discriminator for a 50-star field. The drift is
covered instead by the re-seated AC5, which pins it as monotone AND seed-deterministic and is
mutation-proven. Flagging that honestly rather than claiming a visual confirmation I did not get.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer). Two things deserve his attention: (1) I
edited five test files, which is normally TEA's ground — each edit implements a disposition
specified in the Architect ruling above, and each is logged as a deviation below; (2) the change
retires a shipped sw8-1 behaviour (the Death Star leaving frame), which is deliberate and
source-grounded, with the follow-up named.

## Subagent Results — Round 1 (superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — disabled via `workflow.reviewer_subagents.edge_hunter` |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — disabled via settings; domain assessed by me (stale-doc sweep of `docs/`, `README.md`, audit findings) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — disabled via settings; `COCKPIT` type invariant assessed by me + security + rule-checker |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — disabled via settings; dead-`state`-param finding raised by me instead |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 7 confirmed (5 from specialists, 2 mine), 0 dismissed, 0 deferred

Five specialists are disabled in this project's settings. I did not treat that as coverage — I
assessed the comment, type-design and simplifier domains myself and two of the seven confirmed
findings come from that self-assessment.

## Reviewer Assessment — Round 1 (REJECTED, superseded by Round 2 below)

**Verdict: REJECTED** — one High, three Medium, three Low. The product change is correct,
ROM-verified and mutation-proven; the test estate it leaves behind is not.

### The fix itself is sound — I tried hard to break it and could not

[VERIFIED] The ROM ruling is independently confirmed, from primary source, not from the author's
summary. `ST.UX::` is declared INSIDE the RAM block headed `;STARS`, between `ST.GNB` and the
`;GAS` block (`WSGLOB.MAC:458-466`) — the ROM author filed it under stars. Its siblings are named
`;PLAYERS UNIVERSE Y FOR STARS` / `...Z FOR STARS` (`WSGLOB.MAC:752-753`). Its sole reader in the
entire tree is `VWSTAR` (`WSSTAR.MAC:98-102`). Every writer sits under `.SBTTL MOVE STARS IN SOME
DIRECTION`, and the Death-Star movers are inside `.REPT 0` with their call sites commented out.

[VERIFIED] The decisive check the author did not make, and which I made independently: **in the
cabinet's space wave the player's world position is never written at all.** `SMVSP1/SMVSP2/SMVNXT/
S1MV` (`WSMAIN.MAC:2522-2530`) is the space "MOVE PLAYER" routine and its entire body is
`LDD FRAME / JSR LSLD7 / STD ST.UX`. Every writer of `M$TX+M.S1` in `WSMAIN.MAC` is non-space:
`:1624` ground init (`JSR IGRND`, `;INITIAL HITE`), `:1760` `PHIG1B ;GET US AT START OF TRENCH`,
`:1784` the ground→base turnover, `:2626`/`:2656` `;MOVE PLAYER FORWARD` (ground), `:3974`
`NW1SHP` reset-to-origin. The space pilot is fixed at the origin in the ROM. Camera-at-cockpit is
exactly what the cabinet does.

[VERIFIED] The code change is six edits and nothing else — I diffed with comments stripped to be
sure. No hidden behaviour rode along.

[VERIFIED] `COCKPIT` is not a shared-mutable hazard: `Vec3` is `readonly [number, number, number]`
(`@arcade/shared/dist/math3d.d.ts:1`), so element assignment is a compile error, and this repo's
build gate IS `tsc --noEmit`. Corroborated independently by [SEC] (which compiled a probe to prove
TS2540) and [RULE] (which verified `viewMatrix`/`sub`/`normalize` never write their arguments).

[VERIFIED] Core purity holds — no `window.`/`Date.now`/`Math.random` in `src/core`, and the story's
"reaction window" prose does not trip the `/\bwindow\s*\./` guard that has bitten this repo before.
`core-purity` 14/14. Checked by me and by [SEC].

[VERIFIED] The `tie-in-front-loiter` edit is a provable no-op: `spaceEye` returned `[x, 0, 0]`
(`develop:src/core/gameRules.ts:264`), so its `[2]` was always `0` — identical to `COCKPIT[2]`. It
could not have weakened that test.

[VERIFIED] Collateral is bounded to one file. Of the 13 `eyeOf` consumers, eleven are surface/trench
suites whose camera arms this diff never touches; only `bounded-eye-combat` and the new suite see
the space change.

[TEST] The three inversions are genuine discriminators, not rewrites-to-green — test-analyzer
restored the retired `spaceEye` in a scratch worktree and confirmed all three fail against the old
behaviour, and that the C_PV mirror case is actually exercised (the bit does get set).

### Findings

**[HIGH] [TEST] [RULE] `tests/core/bounded-eye-combat.test.ts` is now dead scenery guarding this
story's own subject.** Flagged independently by THREE reviewers (test-analyzer high-confidence,
rule-checker violation #16, and me). With `cameraView` returning a constant, `eyeOf(s)` is `[0,0,0]`
for every state — including the `frame: 50_000` and `advance(spaceRun(), 1600)` fixtures built
specifically to exercise drift. Its last test reduces to `Math.hypot(0,0,0) < 33_000`, i.e.
`0 < 33_000`, which cannot fail under any regression. Its header (line 6) still states as
present-tense fact that `spaceEye(state) = [state.frame * SPACE_EYE_SHIFT_PER_FRAME, 0, 0]` — a
function that no longer exists.

I rate this High rather than Medium because of WHAT it guards. This file is the designated guard
for "incoming fire stays shootable/fair" (sw8-2 AC9/AC11) — the exact invariant sw8-8 exists to
restore. After this diff a future regression of the eye/cockpit split would be caught only by the
new suite, while a file named `bounded-eye-combat` sits green and reassuring next to it. That is
worse than no test. It also violates a stated project rule the author was operating under as TEA
("If you find a vacuous test in pre-existing code, fix it or remove it"), and TEA explicitly flagged
this file in RED as an Improvement — Dev then did not act on it. The author demonstrably knew how to
retire an obsoleted suite: they did exactly that for `render.moving-eye.test.ts` in the same commit.
This one was simply missed.

**[MEDIUM] [DOC] The Death-Star test over-reaches past what the ROM supports, and contradicts our
own longplay evidence.** `tests/shell/render.space-camera.test.ts:78-95` asserts the Death Star holds
the optical axis to 1e-6 across the run. The ROM evidence supports "the CAMERA does not drift" — it
says nothing about whether the STATION moves. And the epic's own design spec records a direct
observation of the cabinet: *"Longplay ~wave 4 (score 352,171): mid space-combat, the Death Star is
entirely out of frame"* (`docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:28-30`).
The test's comment hedges this as "**If** the longplay does show the station wandering off centre" —
our own spec says it does. So the diff pins as an invariant a behaviour our primary evidence says is
wrong, and any correct follow-up will have to delete this assertion. The camera claim is already
pinned separately and correctly by the frame-invariance test two blocks above; this one should be
retired or restated as "the camera does not move the Death Star", not "the Death Star does not move".

**[MEDIUM] [TEST] `killed >= 3` has exactly zero margin — measured, not theorised.** Confirmed
test-analyzer's medium-confidence finding by replaying the AC3 scenario across five seeds:
killed = **3**, 4, 5, 5, 4. Seed 1983 sits precisely on the bar. The floor is derived from this
fix's incidental outcome, and depends on TIE fire cadence, wave timing and the beam's
nearest-target priority — none of which is the reaction-window property under test. `landed === 0`
already carries the acceptance and has margin on all five seeds. Relax the floor to `>= 1` (still
non-vacuous: proves an interception is possible) or drop it.

**[MEDIUM] [DOC] Undocumented spec conflict.** The change contradicts the epic design spec's sw8-1
entry, which explicitly directs the fix at *"`ST.UX`/`ST.UY`/`ST.UZ` viewer-translation math in
`WSSTAR.MAC`"* driving *"`cameraView(state)`'s space branch so the world (stars, Death Star, TIEs)
slides past a moving eye"*, with acceptance *"the DS sits off-centre / off-screen"*
(`…cabinet-feel-render-fidelity-design.md:91-100`). The spec is the lowest rung of the spec-authority
hierarchy and the session's Architect ruling outranks it, so the change is authorised — but the
conflict is nowhere in the deviation log. The spec pointed at `WSSTAR.MAC` — the STAR file — as the
source for a WORLD camera; that is where the original error entered, and it should be recorded so
the spec is not re-followed. Added below as a Reviewer (audit) deviation.

**[LOW] [RULE] `src/core/sim.ts:136` still holds a private duplicate `COCKPIT`.** rule-checker's
violation #17, and it lands: the new `gameRules.ts:16-21` comment justifies exporting `COCKPIT`
precisely so nobody writes "a fourth hand-written `[0,0,0]`" — while leaving the third one
unconsolidated in `sim.ts`, used at `:1510` and `:2169`. Dev disclosed this in the deviation log, so
it is honest, but the justifying comment currently overstates what the export achieved. Either
consolidate or soften the comment.

**[LOW] [SIMPLE] `computeStatus(e, state, rng)` now has a dead `state` parameter.** Mine — no
specialist caught it, because `noUnusedParameters: false` (`tsconfig.json:8`) hides it from `tsc`.
`state`'s only use was `spaceEye(state)`; the body now reads `e` and `rng` only (verified: the sole
remaining mentions at `tie-status.ts:60,111` are comments). One production call site
(`sim.ts:399`) and ~10 test call sites pass it for nothing, and the signature now advertises a
dependency on game state that no longer exists. Notable in its own right: TIE status is now a pure
function of the enemy and the RNG.

**[LOW] [TEST] `rayId` can collide for concurrent shots on the same ray.** test-analyzer's
low-confidence finding, and it is structurally correct: `flightsOf` keys flights by
`normalize(pos).toFixed(4)`, so two live fireballs launched down the same bearing merge in the map.
Not reachable at the 3-4 shots/phase this wave produces, but `MAX_FIREBALL_SLOTS` is 6. Worth a
comment acknowledging the bound rather than a rewrite.

**[LOW] The C_PV reseat changed incoming-fire counts, undisclosed and unpinned.** Measured
before/after across five seeds: seed 1234 goes 3 → 5 shots per space phase; the other four are
unchanged. Moving the view pyramid from the drifting eye to the cockpit changes which TIEs pass
`C_PV` and therefore which may fire. The direction is ROM-faithful and mildly helps the sparse-fire
problem TEA logged, so this is not a defect — but it is a gameplay change nobody stated, and no test
pins it.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + `star-wars/CLAUDE.md`
"The Hard Architectural Boundary". rule-checker enumerated 39 instances across 17 rules; I
re-derived the boundary and dead-code rows myself rather than take them on trust.

| Rule | Instances | Verdict |
|------|-----------|---------|
| 1 Type-safety escapes | 8 | Compliant — no `as any`, `as unknown as`, `@ts-ignore`, or non-null assertions added anywhere in the diff |
| 2 Generic/interface pitfalls | 3 | Compliant — `COCKPIT: Vec3` is a `readonly` tuple; matches the file's existing style for Vec3 consts (`ZERO`, `FACING_PLAYER`, sim's own `COCKPIT` are all plain `const X: Vec3`) |
| 3 Enum anti-patterns | 0 | N/A — no enum declared or switched on |
| 4 Null/undefined | 3 | Compliant — `open.get(id)` and `.find()` results both guarded before use; no `\|\|`-on-falsy-valid introduced |
| 5 Module/declaration | 4 | Compliant — the three deleted re-exports were value exports; dropped `type GameState` import genuinely unused; `moduleResolution: bundler` so extensionless relative imports are correct |
| 6 React/JSX | 0 | N/A — no `.tsx` |
| 7 Async/Promise | 0 | N/A — all touched code is synchronous, as the core's determinism requires |
| 8 Test quality | 4 | **Violation** — see the HIGH finding; `bounded-eye-combat` is vacuous post-diff. New files themselves are clean (no `as any`, no mocks, no `dist/` imports) |
| 9 Build/config | 0 | N/A — no config touched |
| 10 Type-level input validation | 0 | N/A — no external input; all values are internal `GameState`/`Vec3` |
| 11 Error handling | 0 | N/A — no `try`/`catch` |
| 12 Performance/bundle | 1 | Compliant — `@arcade/shared` imports stay scoped subpaths, no barrel import |
| 13 Fix-introduced regressions | 1 | Compliant — the fix introduces none of 1-12; it removes stateful code in favour of a constant |
| CLAUDE.md core/shell boundary | 4 | Compliant — `src/core` imports no shell, touches no DOM/clock/`Math.random`; replacing `spaceEye(state)` with a constant makes `tie-status` strictly MORE deterministic; `render.ts` is shell and may import core |
| Dead code / orphaned exports | 5 | **Violation (Low)** — `COCKPIT` duplicate at `sim.ts:136`; plus the dead `state` param that `noUnusedParameters: false` hides |
| Stale references to deleted symbols | 6 | **Violation** — `bounded-eye-combat.test.ts:6` states the retired `spaceEye`/`SPACE_EYE_SHIFT_PER_FRAME` as present-tense fact |

### Devil's Advocate

Assume this is broken and argue it. **Attack 1 — the ROM case is cherry-picked.** The author grepped
`ST.UX` and found one reader, but a 6809 program can reach RAM without naming the symbol: an
index register walking a block, a `LDX #ST.CNT` plus offsets, a block clear. I checked. `ST.UX` sits
alone at the end of the `;STARS` block and `VWSTAR` loads it by direct addressing (`LDD ST.UX`), not
via a base pointer; `ST.UY`/`ST.UZ` live in a completely different RAM region, so the three are not
even a contiguous vector that could be block-copied as one. The grep is sound. **Attack 2 — the
observable is gone.** This is the real hit, and it survives: the cabinet demonstrably puts the Death
Star out of frame (the spec's wave-4 anchor), and after this diff ours never can. The author's answer
— that the station's motion belongs to the station — is almost certainly right, but it is an
unported mechanism, and the diff pins the *absence* of that motion as a test invariant. That is the
MEDIUM above. **Attack 3 — retiring beats fixing.** Could the split have been closed while keeping
the drift, by moving the homing target and hit sphere onto the eye? TEA measured exactly that and it
broke frame-rate independence, because the eye is a sawtooth of an integer frame counter; and the ROM
says the pilot does not move anyway. Retiring is right. **Attack 4 — a stressed or hostile input.**
There is no external input here: no parsing, no network, no user strings; `stepGame` consumes a
typed `Input` whose aim the shell bounds to ±1, and the new code paths add no branch that a large,
negative, `NaN` or fractional `dt` reaches differently than before — `beamOrigin` went from a
computed value to a constant, which strictly reduces the input surface. **Attack 5 — the tests are
green for the wrong reason.** Partly true, and that is the HIGH: four of them are green because they
can no longer fail. The three that matter were mutation-proven by an independent reviewer against a
restored pre-fix tree, and I reproduced the AC3 numbers myself. **What survives:** the product fix is
correct and well-evidenced; the defects are all in the test and documentation estate, and every one
of them is cheap to fix.

### Required before merge

1. Retire or invert `tests/core/bounded-eye-combat.test.ts` (the HIGH). Its bounded-eye property no
   longer exists; either delete it with a tombstone pointing at the new suite, or invert it to
   "the eye stays at the cockpit regardless of `frame`" so it can fail again.
2. Retire or restate the Death-Star-axis assertion so it pins the camera, not the station, and
   correct the "if the longplay shows…" hedge to cite the spec's wave-4 anchor as established.
3. File the follow-up story to port the Death Star's own lateral motion from its ROM mechanism.
4. Relax `killed >= 3` to `>= 1` (zero measured margin on seed 1983).

Items 5-7 (the duplicate `COCKPIT`, the dead `state` param, the `rayId` bound, the C_PV fire-count
note) are Low — fix or log at the author's discretion, but the `gameRules.ts:16-21` comment should
stop claiming an anti-duplication benefit it did not deliver.

**Handoff:** Back to Korben Dallas (Dev) for the four required items.

## Dev Assessment — Rework Round 1

**Implementation Complete:** Yes
**Tests:** 1984/1984 passing across 187 files (GREEN). `tsc --noEmit` clean; `npm run build` clean.
**Branch:** `feat/sw8-8-incoming-fire-reaction-window` (pushed)

Net −1 test: the retired 4-test `bounded-eye-combat.test.ts` is replaced by a 3-test
`space-eye-is-cockpit.test.ts`. Every one of the three can fail; none of the four could.

**The verdict was right and I am not arguing with it.** The product change survived review; the
test estate did not, and the HIGH is the one that mattered — I retired one obsoleted suite in the
same commit where I left its twin standing, and the one I left is the designated guard for the
exact invariant this story exists to restore. Everything below is the four required items plus the
Lows, with the evidence for each.

### The four required items

**1. [HIGH] `bounded-eye-combat.test.ts` — INVERTED, not deleted, and it now bites harder than it
ever did.** `git rm`'d, replaced by `tests/core/space-eye-is-cockpit.test.ts` (3 tests):

| Test | What it pins |
|---|---|
| the eye IS the cockpit at every frame | `eyeOf` === `COCKPIT` exactly — fresh, after 300 in-space frames, at `frame: 50_000` |
| AC9 restated: a closing fireball stays reachable on EVERY frame through impact | the real `homeShots` law flies a shot in; arrival is the sim's own `player-death`, not a proximity guess |
| AC11 | sw8-2's fixed-depth anchor, kept, at both a real run and a deep frame |

Stated as EXACT equality, not a bound, and that is the point: sw8-2 pinned `|eye| < 33_000` and a
±2048 wrapped eye satisfied it while still blinding the pilot. There is no acceptable non-zero
offset, so there is no bound to tune.

**Mutation-proven, both of the eyes this repo has actually shipped** (applied to a `cp` backup,
restored by `cp`, md5 verified back to `8ef14531…`, control run reproduced 3/3):

- sw8-2's BOUNDED wrapping eye (`((frame*8) % 4096) − 2048`): tests 1 and 2 RED, test 3 GREEN.
  That split is the finding in miniature — the fixed-depth anchor **cannot see** the defect, which
  is exactly why sw8-2 shipped believing fire fairness was solved.
- sw8-1's UNBOUNDED eye (`frame * 8`): all 3 RED.

**A second lie in that file, which the finding did not reach.** Its `advance(spaceRun(), 1600)`
fixture was not merely constant post-diff — it had left the space phase entirely. sw8-11 later
time-boxed space (~19 s ≈ 390 game frames), so at frame 1,600 `eyeOf` was reading the TRENCH seat
`[0, 768, 0]`. It measured the wrong camera across two stories and stayed green. The replacement
runs 300 frames and asserts `phase === 'space'`; anything needing a deep frame sets `frame`
directly. I swept for siblings and measured the three other long-run space fixtures — all land at
`phase: 'space'`, `phaseTime 13.95` — so this was a lone survivor. Logged as a Delivery Finding.

**2. [MEDIUM] The Death-Star assertion — RESTATED to pin the camera.**
`|deathStarViewX| < 1e-6` → `deathStarViewX ≈ deathStarPlacement(s).pos[0]` (9 dp, 12 checkpoints).
The hedge is gone: the comment now states the wave-4 longplay anchor as established, says our port
cannot reproduce it, and names sw8-17. **Mutation-proven in both directions**, which is what makes
the restatement real rather than cosmetic:

- camera slides (`viewMatrix([frame*8,0,0])`) → RED. The shortcut still fails loudly.
- the STATION gains lateral motion (`deathStarPlacement.pos[0] = phaseTime*400`) → GREEN.
  Round 1's version went RED here — that is precisely the over-reach, and sw8-17 would have had to
  delete a test before it could start.

**3. [MEDIUM] Follow-up filed: sw8-17** (3 pts, p3, star-wars, tdd, `sprint/epic-sw8.yaml`) — port
the Death Star's OWN lateral motion into `deathStarPlacement` from its own ROM mechanism, with the
explicit prohibition on re-deriving it from `ST.UX` or as a camera slide.

**And the spec is amended, not just contradicted.** The Reviewer's audit deviation asked for both;
only the filing was in the numbered list, so I did the amendment too — the §1 evidence anchor and
the §5 sw8-1 entry each carry a dated block quote that keeps the wrong inference visible next to
its correction (a design spec is a historical record; silently rewriting it erases why the mis-port
was plausible). Both name sw8-17 as the honest route to the acceptance line.

**4. [MEDIUM] `killed >= 3` → `>= 1`,** with the measurement in the comment (3,4,5,5,4 across five
seeds — seed 1983 sat exactly on the old bar). **I proved the relaxation did not weaken the test
rather than assuming it:** I ran the suite in a scratch `git worktree` at the real pre-fix tree
(`9c6f19c`, not an approximated mutation), and AC3 still fails there — on `landed === 0`, its
actual discriminator: *"seed 1983: 3 fireball(s) hit a pilot who tracked them for 36 frames
(1.76s) with the trigger down"*. The `killed` floor only exists so "nothing landed" cannot be
satisfied by a run with nothing to shoot at. Worktree removed.

### The Lows

- **Duplicate `COCKPIT` — CONSOLIDATED** (rather than softening the comment): `sim.ts`'s private
  copy is gone, it imports the `gameRules` export, and the comment now describes what is true
  instead of arguing for the export. Pure alias substitution — both were `[0,0,0]: Vec3`, and the
  two call sites copy or read elements, never write.
- **`rayId` collision — BOUND STATED.** Comment added, with the reason it is safe rather than a
  hand-wave: a merge CONCATENATES two reach histories, which can only add un-reachable frames, so
  the failure mode is a false RED and never a false green.
- **Dead `state` param on `computeStatus` — KEPT, deliberately, and documented at the signature.**
  This is the one place I did not do what was suggested, and I want it looked at. Removing it would
  gut `tie-fire-visibility.test.ts:120-151` — the inverted C_PV test [TEST] certified as a genuine
  discriminator. It proves frame-independence by feeding the same TIE at `frame: 0` and
  `frame: 128` and requiring the same verdict; it can only do that if `state` is a parameter. Drop
  the parameter and the guarantee becomes a signature tautology that a future re-wiring satisfies
  merely by adding the argument back. Hollowing out a certified guard to tidy a signature is the
  same defect as the HIGH, so I disclosed instead of deleting.
- **C_PV fire-count change — DISCLOSED, not pinned.** Deviation logged. A per-seed count assertion
  would pin an incidental number this story does not own and would go red on the story that fixes
  the sparsity TEA flagged.

### Verification

- Full suite **1984/1984 across 187 files**; `tsc --noEmit` clean; `npm run build` clean.
- Citation gate: `reanchor-citations.mjs` → **71 already correct, 25 re-anchored, 0 lost** (the
  `sim.ts` line shift from the `COCKPIT` consolidation). Applied diff is 25 insertions / 25
  deletions; I filtered the diff for any non-`"line"` change and got nothing, so no
  re-serialization damage.
- **No playtest this round, and that is a claim about scope, not a skip.** The only source change
  is the `COCKPIT` alias consolidation and two comments — no behavioural delta, so round 1's
  observed-in-play evidence still stands unmodified. If Reviewer disagrees that the alias is
  behaviour-free, the fastest disproof is the suite: `shipPoint`'s space arm and the port-crossing
  test both exercise it.

**Handoff:** Back to Jean-Baptiste Emanuel Zorg (Reviewer). Two places to aim: (1) the kept `state`
parameter is a deliberate refusal of a Low, argued above — if the argument is wrong the fix is
mechanical; (2) `space-eye-is-cockpit.test.ts` is a rewrite of someone else's suite by the person
whose diff hollowed it out, so it deserves the same goalpost-move scrutiny the round-1 inversions
got — the mutation split (bounded eye reds 2 of 3, unbounded reds 3 of 3) is the evidence I would
attack first.

## Subagent Results — Round 2 (superseded by Round 3 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — `workflow.reviewer_subagents.edge_hunter: false` |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — disabled via settings; domain assessed by me (I raised 3 of the 6 findings from it) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — disabled via settings; the `COCKPIT` shared-reference invariant assessed by [SEC] + [RULE] + me |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — disabled via settings; the duplicate-import defect that would have landed here was caught by [RULE] |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 6 confirmed (5 from specialists, 3 of them corroborating findings I raised independently; 2 mine alone), 0 dismissed, 0 deferred

Five specialists are disabled in this project's settings. I did not treat that as coverage: I worked the
comment-accuracy domain myself and it produced both Mediums. `reviewer-test-analyzer` initially went
idle without delivering a report; I re-requested it and received the full analysis, including the tree-state
attestation I asked for.

## Reviewer Assessment — Round 2 (APPROVED; superseded by Round 3 below)

**Verdict: APPROVED** — two Medium, four Low, zero High, zero Critical. All four round-1 required
items are delivered and independently mutation-verified. Everything that remains is comment prose.

### The four required items — each one checked by someone who re-ran it

I did not accept a single mutation claim on the author's word. [TEST] reproduced every one in scratch
worktrees and pasted the output; [RULE] independently re-ran a third.

**1. [HIGH, round 1] The hollowed-out guard — CLOSED, and the replacement is stronger than the brief
asked for.** `bounded-eye-combat.test.ts` is `git rm`'d; `tests/core/space-eye-is-cockpit.test.ts`
replaces it. [TEST] re-ran both mutations: sw8-2's bounded ±2048 wrap reds tests 1 and 2 while test 3
survives; sw8-1's unbounded eye reds all three. That split is the finding in miniature — the
fixed-depth anchor provably cannot see the defect, which is how sw8-2 shipped believing fire fairness
was solved. [TEST] also ran a mutation I had not asked for and should have: forcing `decay = 1` in
`homeShots` so the shot never closes yields *"the fireball never reached the cockpit: expected false to
be true"*, proving the arrival proxy is a real assertion rather than automatically true. [RULE]
independently mutation-tested the same file with a fixed off-cockpit eye and confirmed 2 of 3 red.

[VERIFIED] The `player-death` arrival proxy is unambiguous in this fixture — evidence: the only
`player-death` push reachable in the space phase is `sim.ts:597` (the enemy-shot collision arm); the
other two (`:1082`, `:1336`) are surface/trench turret arms and the loop guards `phase === 'space'`,
and `enemies: []` removes any collision path. TTL expiry drops a shot with no event at all, so a
fireball that merely timed out cannot satisfy it.

**2. [MEDIUM, round 1] The Death-Star over-reach — RELEASED, and proven in both directions.** This was
my finding and the restatement lands it precisely. [TEST] verified (a) a camera slide fails it with a
1,888-unit displacement, and (b) giving the STATION its own lateral motion — literally the sw8-17
change — leaves it green. Round 1's `|viewX| < 1e-6` failed (b), which is exactly why sw8-17 would
have opened by deleting a test. The "if the longplay shows…" hedge is gone and the wave-4 anchor is
cited as established.

**3. [MEDIUM, round 1] Follow-up filed — sw8-17 is real**, not a phantom reference: `sprint/epic-sw8.yaml`,
3 pts, p3, verified on disk by me and by [RULE]. The author also did the half of my audit deviation
that was not in the numbered list: the design spec is AMENDED at both §1 and §5 sw8-1 with dated block
quotes that keep the wrong inference visible beside its correction. I checked all four ROM citations in
those amendments against primary source — `WSGLOB.MAC:458-466`, `:752-753`, `WSSTAR.MAC:98-102`,
`WSMAIN.MAC:2522-2530` — and every one is correct.

**4. [MEDIUM, round 1] `killed >= 3` → `>= 1` — and it turned out STRONGER than the author claimed.**
The author argued the floor was redundant because `landed === 0` carries the acceptance. [TEST] tested
that rather than accepting it: it bypassed the `landed` assertion at the pre-fix tree and logged both
values — `killed = 0` on all three seeds. So the relaxed floor independently discriminates the real
defect; it simply never gets the chance because `landed` throws first. The relaxation removed a
zero-margin coupling to TIE fire cadence and cost no coverage.

### The rest of the code holds up

[VERIFIED] The rework's entire non-comment source delta is two lines — evidence: `git diff 94fb711~1..94fb711 -- src/`
with comment lines stripped yields exactly an added import specifier and a deleted `const COCKPIT`.
The author's "no behavioural delta, so round 1's playtest still stands" is therefore checkable and true.

[SEC] The now-shared `COCKPIT` array has no mutation path: `Vec3` is a `readonly` tuple enforced by
the `tsc --noEmit` build gate, every math primitive returns a new array, and `shipPoint` spread-copies
rather than aliasing. Core purity holds; the "reaction window" prose never threatened the
`/\bwindow\s*\./` guard because it carries no trailing dot and lives in test headers, not `src/core`.

[VERIFIED] The rewritten `gameRules.ts` comment no longer over-claims — evidence: the only other
`[0,0,0]` literals in `src/core` are `ZERO` (a zero VELOCITY, `sim.ts:1909`) and a velocity literal at
`sim.ts:411`; neither stands in for the cockpit, so "the single definition the whole core and the space
camera share" is literally true. The surviving hand-written stand-ins are all in `tests/`, outside the
claim's scope. [RULE] enumerated the same set and agreed.

[VERIFIED] Keeping the dead `state` parameter is correct, not laziness — evidence:
`tests/core/tie-fire-visibility.test.ts:134-140` builds `{ ...makeSpaceState(), frame }` and passes it
as the second argument, so that parameter is the ONLY route by which `frame` can reach C_PV. Remove it
and the frame-invariance discriminator becomes unwritable. [RULE] verified all three sub-claims in the
justifying comment independently, including `noUnusedParameters: false` at `tsconfig.json:8`.

[SEC] The 25 re-anchored citations are line-number-only: with `"line"` fields stripped, old and new
JSON are byte-identical, and all 25 new numbers point at their exact verbatim line. My own gate run:
96 correct, 0 re-anchored, 0 lost.

[VERIFIED] No front-end wiring gap — evidence: `cameraView`'s signature is unchanged and its only
callers are `render.ts:455` and `debug-overlay.ts:214`, both inside the shell. `main.ts` never touches
it, so the round-1 "silent no-op" hazard does not apply here.

[RULE] Zero violations across all 13 TypeScript checklist categories and the CLAUDE.md core/shell
boundary. Preflight: 1984/1984 across 187 files, `tsc --noEmit` and `vite build` clean, tree clean, no
debug code. I reproduced all three myself after every subagent finished.

### Findings

**[MEDIUM] [RULE] [DOC] The tombstone misstates the ROM structure it cites as its own authority — and
I VERIFIED this wrongly in round 1.** `src/core/gameRules.ts:238-241`. Three defects in one five-line
evidentiary block, found by me and independently by [RULE]:

- *"Every writer sits under `WSMAIN.MAC` `.SBTTL MOVE STARS IN SOME DIRECTION` and is an `SMV*`
  routine"* is FALSE, and falsified by the tombstone's own next bullet. That `.SBTTL` is at `:2243`
  and ends at `:2291`; `.SBTTL MOVE THE PLAYER` starts at `:2292`; the space-wave writer at `:2522`
  is under MOVE THE PLAYER, and `S1MV` is not an `SMV*` name.
- The span `2523-2531` omits the `SMVSP1:` label it names (`:2522`) and runs into `S1MVHP:` (`:2531`),
  a different routine. The spec amendment added in the SAME commit cites `2522-2530` correctly for the
  identical fact — so the branch ships two disagreeing citations for one ROM line.
- `S1MVHP` (`;MOVE DURING HYPER`, `LDD FRAME / JSR LSLD8 / STD ST.UX`, `:2531-2536`) is an `ST.UX`
  writer missing from an enumeration that claims to be exhaustive.

Round 1's Architect ruling made the same over-generalisation and **I stamped it `[VERIFIED]`**. I had
checked the star-screen writers and generalised without reading the `.SBTTL` boundary at `:2292`. That
VERIFIED is withdrawn. The correction STRENGTHENS the ruling — the ROM's own routine named "MOVE THE
PLAYER" has a body that moves nothing but the stars, which is the sharpest statement of the case
available — but as written the tombstone is checkably wrong in the direction that argues against its
own conclusion, in the one artifact whose stated job is to stop a third re-derivation.

**[MEDIUM] [RULE] [DOC] The deliverable suite's header still recommends the retired fix.**
`tests/core/incoming-fire-reaction-window.test.ts:40` states in present tense that
`bounded-eye-combat.test.ts` *"checks"* something — a file this branch deletes. Worse, `:45-46` tells
the reader *"Dev may close the eye/cockpit split from either side (seat the pilot at `spaceEye`, or
home the shot and the hit sphere at the eye); both satisfy every assertion here"* — both routes were
ruled out, one was measured to break frame-rate independence, and `spaceEye` no longer exists. `:47-48`
describes the second control as fencing off "parking the eye", which is now the shipped design. Damage
is bounded because the new tripwires fail loudly on either route, but this is the same defect class as
the round-1 HIGH, in the sibling file, contradicting the tombstone from inside the deliverable.

**[LOW] [RULE] [SIMPLE] Duplicate import statement.** `src/shell/render.ts:61` and `:63` both import
from `'../core/gameRules'` with an unrelated `'../core/sim'` import sandwiched between. Introduced by
round 1. Should be one statement. Caught by [RULE]; the disabled simplifier would have been its
natural home.

**[LOW] [TEST] Test 3 of the new suite adds no independent coverage.** Its two fixtures are a strict
subset of test 1's three, and test 1 asserts exact equality on the same states, so no mutation can red
test 3 while test 1 stays green. Not vacuous — mutation A reds it — so it is an AC anchor rather than
a guard. Worth saying so in its comment rather than deleting it.

**[LOW] [DOC] The new suite's header contradicts its own helper 60 lines later.**
`space-eye-is-cockpit.test.ts:14-15` says `eyeOf(s)` was `[0,0,0]` "in EVERY fixture here — including …
`advance(…, 1600)`". The `advance()` doc at `:70-77` correctly says that fixture was in the trench
returning `[0, 768, 0]`. The header restates my round-1 finding verbatim; the helper records what the
author later measured. The second is right and the first was never reconciled.

**[LOW] The phase-guard fix was applied to one of two files sharing the hazard.** The author's own
Delivery Finding says the hazard is general, and added `expect(s.phase).toBe('space')` to
`space-eye-is-cockpit.test.ts`'s `advance()` — but not to `render.space-camera.test.ts`'s, in the same
commit. Mild: I measured the margins and the unguarded fixture has MORE headroom (12.0 s of `dt` + the
1.95 s head start = `phaseTime` 13.95, against a 21 s box) than the guarded one (16.58). Both are safe
today; only one fails loudly if the box moves.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + `star-wars/CLAUDE.md` "The Hard
Architectural Boundary". [RULE] enumerated every category; I re-derived the citation-accuracy and
dead-code rows myself rather than take them on trust, and the two Mediums came out of that.

| Rule | Verdict |
|------|---------|
| 1 Type-safety escapes | Compliant — no `as any`, `as unknown as`, `@ts-ignore`, or non-null assertions in the diff |
| 2 Generic/interface pitfalls | Compliant — `COCKPIT: Vec3` is a `readonly` tuple; matches the file's existing const style |
| 3 Enum anti-patterns | N/A — none introduced |
| 4 Null/undefined | Compliant — `??` used throughout; the `||` uses are genuine booleans |
| 5 Module/declaration | **Violation (Low)** — duplicate `'../core/gameRules'` import, `render.ts:61`/`:63` |
| 6 React/JSX | N/A — no `.tsx` |
| 7 Async/Promise | N/A — all touched code synchronous, as determinism requires |
| 8 Test quality | Compliant — round 1's vacuous suite is gone and its replacement is mutation-proven three ways; no `as any`, no mocks, no `dist/` imports |
| 9 Build/config | N/A — tsconfig untouched; `noUnusedParameters: false` is pre-existing policy |
| 10 Type-level input validation | N/A — no external input |
| 11 Error handling | N/A — no `try`/`catch` |
| 12 Performance/bundle | Compliant — `@arcade/shared` imports stay scoped subpaths |
| 13 Fix-introduced regressions | Compliant — the rework introduces none of 1-12 beyond the duplicate import it inherited |
| CLAUDE.md core/shell boundary | Compliant — `src/core` imports no shell, no DOM/clock/`Math.random`; `core-purity` 14/14 |
| Dead code / orphaned exports | Compliant — `sim.ts`'s duplicate `COCKPIT` consolidated; the retained `state` param is argued and verified, not orphaned |
| ROM citation accuracy | **Violation (Medium)** — `gameRules.ts:238-241`, three defects, see the finding |
| Stale references to deleted symbols | **Violation (Medium)** — `incoming-fire-reaction-window.test.ts:40,45-48` |

### Devil's Advocate

Assume this is broken and argue it. **Attack 1 — the new suite is a rewrite-to-green by the person
whose diff hollowed out the old one.** This is the strongest prior and it does not survive: [TEST]
reconstructed both historical eyes in scratch worktrees and got exactly the claimed red/green split,
[RULE] reproduced a third mutation independently, and the `decay = 1` probe proved the arrival
assertion is failable. Three reviewers, four mutations, one tree — and the tree came back md5-identical.
**Attack 2 — the relaxed `killed` floor is coverage laundering.** Tested directly and refuted: `killed`
is 0 on every seed pre-fix, so `>= 1` independently catches the defect; the old `>= 3` was pinning TIE
fire cadence, which this story does not own. **Attack 3 — the story is now defended only by prose, and
the prose is wrong.** This is the real hit and it is the two Mediums. But the load-bearing defence is
the tripwire tests, not the comments: any re-derived eye — bounded, wrapped, or free-running — reds two
of three tests immediately. The comments are the second line, and a wrong second line is a Medium, not
a High. **Attack 4 — the ROM ruling itself is wrong and everyone has been copying one grep.** I went
back to primary source a second time this round precisely because I had over-generalised once already,
and the case got stronger, not weaker: the routine the ROM itself files under "MOVE THE PLAYER" for a
space wave writes nothing but `ST.UX`. The pilot does not move. **Attack 5 — a stressed or hostile
input.** No external input exists; `stepGame` takes a typed `Input` the shell bounds to ±1, and the
rework's two-line delta adds no branch that any `dt` reaches differently. **Attack 6 — concurrency
corrupted the evidence.** A stray `_tmp-measure.test.ts` did appear in the live checkout mid-review.
I re-ran everything serially after all four specialists finished and got the same numbers, with the
tree verified clean and `render.ts` back to baseline md5. Filed as a process finding.
**What survives:** the product change is correct and now triply mutation-proven; the four required
items are genuinely done; the remaining defects are comment text, cheap, and tracked in sw8-18.

### Why APPROVED and not a third round

Two Mediums and four Lows, no High, no Critical — the blocking rule is Critical/High and neither is
present. Round 1 rejected on a guard that could not fail; that is fixed and verified by people who
re-ran it. What is left is prose, and this epic already has the precedent for exactly this: sw8-15 is a
filed story whose entire content is comment-accuracy corrections. Sending a correct, mutation-proven
diff back a third time for comment text would be process for its own sake. **sw8-18 is filed** with all
six findings, and it carries the tombstone correction — which I want done soon, because I am the one
who wrongly VERIFIED the claim it fixes.

**Handoff:** To Ruby Rhod (SM) for finish-story.

## Sm Assessment

**Setup verification (all checked on disk, not taken from the subagent's report):**
session file present with fields set; story context on disk at
`sprint/context/context-story-sw8-8.md`; branch
`feat/sw8-8-incoming-fire-reaction-window` cut in the star-wars subrepo off
`develop` @ `9c6f19c`; story `in_progress` in `sprint/epic-sw8.yaml`; Jira
explicitly skipped (this project tracks in local YAML — `jira_key` is just the
story id). Merge gate clear: `gh pr list -R slabgorb/star-wars` returned `[]`.

**Baseline moved before setup.** The star-wars checkout was 5 commits behind
`origin/develop`; I fast-forwarded it before cutting the branch. sw8-9 (play-cube
clamp, no TIE-body collision, ROM fire gate — PRs #134/#135) and sw8-11/sw8-12
(space-phase clock + music milestones) all landed AFTER sw8-2 shipped, and they
touch exactly the ground this story measures. Every measurement must be taken at
`9c6f19c`, after `npm ci` — nothing from the sw8-2-era tree carries over.

**Three errors corrected in the generated context before handoff** (committed as
`523ce41`; the setup commit `30d0019` claimed "and context" in its subject but
committed only the epic YAML, leaving the context file untracked):

1. `sub_A875` was attributed to `WSCPU.MAC`. It is a **model-doc** reference —
   `docs/tie-flight-ai-model.md:242`, restated in the 2026-07-11 world-metric
   spec:71, implemented at `src/core/sim.ts:301` and `:1914`. The false
   attribution would have sent TEA grepping a file that never contained it.
2. `WSFLAY` and `TGFDBK` were cited as ROM tables for fireball spawn distance.
   Neither string appears anywhere in `star-wars/{src,docs,tests}`. Fabricated;
   removed, and replaced with an instruction to find and cite a real symbol or
   cite none.
3. The frame→second math was written at 60 Hz. The sim's game frame is
   **20.508 Hz** (`src/core/state.ts:317-322`, sw7-1, "pinned three ways"), and
   `stepGame` is dt-driven and rate-independent (`sim.ts:1918`), so a raw step
   count is not a unit of time at all. The draft's "30 frames ≈ 0.5 s" is really
   ≈1.46 s — off by ~3× **in the direction that makes an unfair window look
   fair**. Since this story's whole deliverable is a wall-clock ruling, that error
   would have corrupted the answer. Thresholds are now specified in accumulated
   `dt` seconds, under an explicit timebase warning.

**The trap this story must not fall into.** sw8-2 already ruled that ROM homing
"genuinely always arrives" and that this is authentic, then satisfied fairness by
proving an incoming fireball stays *aim-reachable over a long run*. sw8-8 exists
because that property turned out to be **weaker than "the player has time to
react"** — a shot can be reachable at every instant and still arrive in under a
second. So the deliverable is a measured duration in seconds, not a re-run of
sw8-2's reachability proof. Ruling first, per the epic's rule-before-fix
discipline: the <1s death is either a real defect (spawn distance, shot speed,
cadence, shield accounting, hit sphere) or ROM-authentic with the remedy
elsewhere — and "ROM-authentic" is a legitimate outcome that closes this story
with a knowledge deliverable, exactly like sw8-1's AC1 and sw8-2's AC6.

**Handoff:** Leeloo (TEA) for RED. Run `npm ci` first — develop moved. Establish
the suite baseline empirically; do not assume 1793 or 1437 (both are recorded in
prior sessions, they disagree, and neither is current).

---

## Dev Assessment — Merge Resolution Round

**Implementation Complete:** Yes
**Tests:** 2035/2035 across 190 files (GREEN) on the MERGED tree. `tsc --noEmit` clean; `npm run build` clean.
**Branch:** `feat/sw8-8-incoming-fire-reaction-window` @ `af32d5b` (pushed)

The arithmetic on the count: 1984 pre-merge + 51 from develop's three new suites = 2035, and
187 + 3 = 190 files. No test was added or dropped in the resolution — every change was a re-seat.

**Scope was SM's seven items; all seven done, and one of them was not mechanical.**

**1-2. The merge and `tie-status.ts`.** Git auto-merged the C_PV body correctly (it took
`const eye = COCKPIT`), so only three marker regions needed hand resolution: the header comment
(took develop's absent-bits analysis — that is uf1-12's review content and worth keeping — and
corrected its `spaceEye` premise), the imports (union of both, minus `spaceEye`), and the doc block
above `computeStatus`. Develop's C_PS already reuses the same `eye` binding, so re-pointing C_PV
re-pointed C_PS with it — one constant, both bits.

**3. The 25 test re-seats — 24 mechanical, 1 not.** Eight `spaceEye(s)` reads in
`tie-sights-status.test.ts` and two in `tie-loiter-sights.test.ts` became `COCKPIT`; two `aimAt`
helpers lost a parameter that the constant made dead. One test was a real INVERSION —
"measures from the MOVING eye (spaceEye), not the origin" is now "measures from the COCKPIT, and
never drifts off it with the frame counter", built the same way as the C_PV inversion in round 1:
the frame counter is the discriminator (0 and 128), with a mirror case so it cannot be satisfied by
C_PS simply never setting.

**The one that was not mechanical, and it is the finding of this round.**
`tie-loiter-sights.test.ts`'s in-play fixture seated its fighter at `[0, 0, -6000]` — dead ahead —
and asserted that with the yoke PARKED the loiter loop never breaks into 20$. That half passed only
because the eye was displaced: the centred ray started 1,024 units to one side and missed a target
seated on the origin. Put the pilot back at the cockpit and **a fighter beelining him is under the
parked crosshair by construction**, because the crosshair and the fighters' target are now the same
point. So the negative control went red on the merge, correctly.

I measured the re-seat instead of guessing it: at 1,500 and 3,000 lateral the loiter weave still
carries the fighter into the parked band inside 900 frames; at 6,000 (45°, the C_PV pyramid edge) it
stays wide and the yoke is what brings it in. Then I mutation-proved the result rather than trusting
green — forcing `C_PS` never to set reds the positive half (and two sibling tests), restored by `cp`,
control re-run green. **This is a gameplay change to a story that shipped three days ago** and I have
logged it as a major deviation and a Delivery Finding; I did not treat "the suite is green" as
permission to leave it undisclosed.

**5. Citations.** Nine conflicts to develop's side, then re-anchor: 60 correct, 36 re-anchored,
0 lost. Verified beyond the tool's own report — the applied diff contains no non-`"line"` change, and
per-file `remediated_by` counts match develop's exactly, which is the specific thing `--ours` would
have destroyed.

**6-7.** Full suite and build green on the merged tree; the uf1-12 behaviour change is logged.

**sw8-8's own guarantee re-verified AFTER the merge.** The merge rewrote `tie-status.ts`, so I did
not assume the story's tripwire survived it — I re-ran the bounded-eye mutation on the merged tree
and it still reds 2 of 3 in `space-eye-is-cockpit.test.ts`. `render.ts` md5 back to
`8ef145317fb5f104cc35223bc4f1661e`, tree clean.

**Post-merge stale-symbol sweep:** every surviving `spaceEye` mention in `src/`, `tests/` and
`tools/` is a past-tense comment. No code reference remains. The two in
`incoming-fire-reaction-window.test.ts` are the already-filed sw8-18 items — not touched here,
deliberately, because SM scoped sw8-18 out of this round.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer). Re-review is scoped to the resolution. The
one thing that deserves a real ruling rather than a check: whether re-pointing C_PS at the cockpit
needs uf1-12's acceptance criteria formally re-read, or whether the deviation + finding is
disclosure enough.

## Sm Assessment — finish attempt 1 (BLOCKED, returned to green)

**The story is APPROVED and cannot merge.** Those are both true, and the second is new
information that arrived after the Reviewer signed off. I did not finish it, did not create a
PR, and did not spawn `sm-finish` preflight (documented as non-read-only — it has previously
opened and attempted to merge a PR on its own).

### What blocks it

`origin/develop` advanced by two commits while sw8-8 was in flight, both merged after this
branch was cut off `9c6f19c`:

| PR | Commit | Lands in |
|---|---|---|
| #137 `feat(uf1-3)` — wire C_AH | `94905d7` | `src/core/tie-status.ts`, `src/core/sim.ts`, `src/core/state.ts` |
| #138 `feat(uf1-12)` — derive C_PS | `aabe488` | same, plus 3 new test files (~1,090 lines, 51 tests) |

Trial-merged `origin/develop` into `HEAD` in a throwaway worktree (`--no-ff --no-commit`,
aborted, worktree removed, both trees verified clean afterwards). **10 conflicts:** 9 in
`docs/audit/findings/*.json` and one in `src/core/tie-status.ts`.

The nine JSON conflicts are ordinary line-anchor churn — two stories re-anchoring the same
citations. They must be resolved by taking **develop's** side and then re-running
`tools/audit/reanchor-citations.mjs --write`, never `--ours`: `--ours` silently clobbers the
other story's `remediated_by` stamps, and a lost stamp reads as a closed finding re-opening.

`tie-status.ts` is the real one, and it is semantic, not textual:

```
develop:src/core/tie-status.ts
  :37   import { aimDirection, beamHit, spaceEye, toCockpit } from './gameRules'
  :127  const eye = spaceEye(state)                                  // C_PV
  :162  beamHit(eye, sightsRay, e.pos, SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS)   // C_PS — SAME eye
```

**uf1-12 built a second consumer of the drifting eye, three days after sw8-2 and days before
sw8-8 retired it** — and it is the player's SIGHTS bit, which `TCH1DZ`'s loiter loop gates on in
four places. sw8-8 deletes `spaceEye`, so there is no version of this merge that leaves uf1-12
untouched. Its two eye-staging suites (`tie-sights-status.test.ts`, `tie-loiter-sights.test.ts`)
carry 13 `spaceEye` references across 25 tests.

### Two things the Reviewer could not have known

1. **An accepted deviation is now moot.** Dev kept `computeStatus`'s `state` parameter and
   documented it as "`state` IS UNUSED as of sw8-8". On develop it IS used — uf1-12 reads
   `state.aimX / state.aimY / state.aspect` at `:161`. I stamped that deviation ACCEPTED on a
   premise the merge falsifies. The comment must not ship as written; the parameter now needs no
   justification at all.
2. **This is the second ST.UX consumer built on an unruled seam.** sw8-1 ported `ST.UX` twice
   (starfield + camera); uf1-12 has now hung C_PS off the camera copy. The sw8-8 ruling covers
   it — the sights are the player's crosshair and the player is at the cockpit — but nobody
   applied the ruling to uf1-12 because uf1-12 landed in parallel.

### Decision (user, this session): ABSORB into sw8-8, then re-review

The alternative — a minimal merge plus a follow-up story — was declined. Rationale for the
choice: there is no smaller resolution available, because the symbol C_PS reads no longer
exists, so sw8-8 changes uf1-12's behaviour either way; doing it deliberately with tests
re-seated beats doing it mechanically and deferring the reconciliation.

### Scope handed to Dev

1. Merge `origin/develop` into the branch (not rebase — three commits with review history).
2. `tie-status.ts`: take develop's newer file as the base and re-apply sw8-8's change to it —
   `const eye = COCKPIT` for BOTH C_PV and C_PS. Do not reintroduce `spaceEye`.
3. Re-seat the 25 uf1-12 tests that stage the moving eye. Expect the sibling-fixture fan-out the
   Dev sidecar warns about: run the FULL suite, not the named files.
4. Delete the "`state` IS UNUSED" comment block (`tie-status.ts:64-72`) — uf1-12 makes it false.
   The kept-parameter deviation should be restated as superseded rather than left stamped.
5. Nine citation conflicts: take develop's side, then `reanchor-citations.mjs --write`, then
   verify `0 lost` and that the diff is line-numbers-only.
6. Full suite + `npm run build` green on the MERGED tree, with the post-merge total stated (the
   pre-merge figure 1984 will move — develop adds 51 tests).
7. Log the uf1-12 behaviour change as a Dev deviation. It is a change to a shipped story's
   observable, and Reviewer will want it disclosed rather than discovered.

**Not in scope:** sw8-18 (the round-2 doc findings) stays a separate story. Do not fold it in.

**Handoff:** Korben Dallas (Dev) for the merge resolution. Re-review afterwards is scoped to the
resolution only — the round-2 APPROVED verdict on the branch's own content stands and is not
reopened.
## Subagent Results

Round 3 (merge resolution). Five of nine specialists are disabled via
`workflow.reviewer_subagents` — I assessed those five domains myself and say so per row, because a
disabled specialist is not coverage.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 190/190 files, 2035/2035 tests, build + lint clean, tree clean, 96 pins correct/0 lost, tool mutated nothing without `--write`; its one flagged item (`incoming-fire-reaction-window.test.ts:46`) is the known sw8-18 entry, confirmed as known |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — I enumerated the boundary paths myself: the `beamHit` band edge (`onRay(s, 6000, band±1)` at `tie-sights-status.test.ts:117/121` is an exact 499/501 pair against the 500 u band), `along <= 0` behind-the-gun rejection, the `depth > VIEW_NEAR` near clamp, and the C_PS-without-C_PV corner at `[400, 0, -10]` — the last is a confirmed Gap, filed upstream |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed myself: no try/catch, no async, no swallowed errors in the diff. The one silent-degradation path is `normalize` returning `[0,0,0]` on a zero vector (`math3d.js:158-161`), which makes `toCockpit(origin)` degrade to a null direction rather than NaN; unchanged by this diff and pre-existing |
| 4 | reviewer-test-analyzer | Yes | clean | none (5 questions answered with measurement) | N/A — confirmed and adopted: the inverted test catches BOTH hardwired stand-ins; the loiter negative holds with a 916 u vs 500 u margin over all 391 frames and is provably not a C_PV artifact; and the frame-0 identity (`spaceEye(s) == 0` at `frame: 0`) closes the defanging question for every other call site. Its seatX sweep is the evidence behind my one Low |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed myself, and this is where the round's findings are: four confirmed comment/citation defects (2 Medium, 2 Low), two of which [RULE] found independently. The disabled-specialist warning in my own sidecar was correct twice over |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed myself: no new types; `COCKPIT: Vec3` is a `readonly` tuple so the newly shared reference cannot be mutated (round 2 proved this with a probe and `tsc --noEmit` still gates it); `shipPoint` stays exhaustive over `Phase` with no `default`, so a fourth phase is still a compile error |
| 7 | reviewer-security | Yes | clean | none | N/A — confirms no nondeterminism into `src/core`, no core→shell import, no `as any`/`@ts-ignore`/non-null assertions, no division-by-zero on the newly-coincident eye/target, and that all ten findings files changed only `"line"`. Independently corroborated my own zero-vector and `beamHit` analysis |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed myself: no dead code left by the retirement (every export of the four changed source files has live call sites), and the only redundancy is the duplicate `../core/gameRules` import at `render.ts:61`/`:63`, which is round 2's existing Low, still open, re-confirmed by [RULE] |
| 9 | reviewer-rule-checker | Yes | findings | 4 defects + 1 low-confidence note | confirmed 3, deduped 1, confirmed the note as a Low — DEFECT 1 (`2523-2531`) is round 2's sw8-18 item, deduped; DEFECT 2 (`.REPT 0` at `:2271` not `:2273`), DEFECT 3 (design-spec `:26-30` should be `:45-46`) and DEFECT 4 (`sim.ts:2161-2165` stale prose) all verified by me against primary source and both revisions, all confirmed; the `render.ts`-can-import-`sim.ts` note verified and confirmed as a Low |

**All received:** Yes (4 enabled specialists returned, 5 disabled rows assessed by me)
**Total findings:** 6 confirmed (2 Medium, 4 Low), 1 dismissed as duplicate of a known sw8-18 item, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Two Medium, four Low, zero High, zero Critical. The resolution is correct where it counts, and I
could not break it — not on the seam, not on the geometry, not on the citations, not on the
tripwire. Everything I am holding against it is prose, and all of it belongs to a story that already
exists.

Mr. Dallas asked for a ruling rather than a check, which is the right instinct, so it goes first.

### The ruling: uf1-12 needs no separate story for the seam, because its ACs are relational

I read all six of uf1-12's acceptance criteria from `origin/main:sprint/epic-uf1.yaml` — they are not
in this checkout, which is 21 commits behind. Not one of them names `spaceEye`. The binding one is
AC-6: *"C_PS is measured against the SAME aim ray the gun uses, viewport aspect included."* Same as
the gun. Not "from the moving eye."

So trace it. `sim.ts:158` shadows this frame's yoke onto the state; `sim.ts:311` builds
`beamOrigin = shipPoint(state)`; `tie-status.ts:134` sets `const eye = COCKPIT`; `shipPoint`'s space
arm returns `[...COCKPIT]`. One origin, one direction, one aspect, one frame's input. **AC-6 is
satisfied more exactly after the merge than before it** — previously the gun fired from `spaceEye`
and this suite's own fixtures were built from `spaceEye` too, so the relation held; now both are the
cockpit and the relation is an identity. AC-2, AC-3 and AC-4 are VM-level and eye-independent. AC-5
(the header no longer lists C_PS as out-of-scope) survives the rewrite — the header now enumerates
three absent bits, C_PS is not among them, and C_AD/C_AV/C_PM keep their ROM reasons.

And the direction was never a judgement call. The cabinet's space pilot is fixed and the sights ARE
his crosshair. The ROM wins even when it retires a live behaviour; the deviation plus the Delivery
Finding is the correct disposition, and the disclosure is complete. **What is NOT needed is a story
to re-litigate the seam. What IS worth one is the fidelity gap the change exposes** — see the Gap
below.

### The tripwire still bites on the merged tree — I ran it, I did not take it

The merge rewrote `tie-status.ts`, so the story's own guarantee needed re-proving on the merged
tree rather than on the tree it was written against. Dev claims "2 of 3". I backed up
`src/shell/render.ts` (md5 `8ef145317fb5f104cc35223bc4f1661e`), reinstated sw8-2's bounded ±2048
wrapping eye in `cameraView`'s space arm, and ran all three tripwire suites:

```
× the eye IS the cockpit at every frame — fresh, after a long run, and at a deep frame
× AC9 restated: a closing fireball stays aim-reachable on EVERY frame through impact
× the space view matrix is FRAME-INVARIANT — the camera never drifts off the cockpit
× the CAMERA never moves the Death Star — its view-x is its world-x, always
× AC2: a fireball is still aim-reachable at the moment it lands
× AC2: the answerable window runs contiguously INTO impact, with no blind tail
  Test Files  3 failed (3)      Tests  6 failed | 6 passed (12)
```

Six of twelve red across all three suites — 2 of 3 in `space-eye-is-cockpit.test.ts` exactly as
claimed, plus both `render.space-camera` guards and both AC2 deliverables. The failure message is
the original defect verbatim: *"the fireball left the yoke's reach at range 251 (26 frames into its
flight)."* Restored from the backup, md5 matched, tree clean, **CONTROL run 12/12 green.**

### The three things I attacked hardest

**[VERIFIED] The citation re-anchor did not silently mis-anchor a duplicate — and neither of Dev's
two verifications could have told us that.** Story td1-13 exists to name this hazard and it names
the exact two verbatims: `      damage++` and `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {`
each occur twice in `sim.ts` because the space and surface cockpit-damage paths are near-identical,
"so a mis-anchored S-016 would describe the surface routine while reading green forever." I
enumerated every pin in all ten findings files: exactly three have a duplicate verbatim, and **two
of the three moved this round** — `G-009` → `sim.ts:624` and `S-016` → `sim.ts:625`. Both landed on
the SPACE occurrence (line 605, `// --- Cockpit damage: any TIE that reaches it, any fireball that
lands`, emitting `cause: 'enemy'`), not the surface turret path at line 1105 emitting
`cause: 'turret'` — and the space path is what both findings actually claim. Evidence: 96
gate-checked pins, 0 mismatched, reconciling 60 + 36 exactly; `check-citations.mjs:150-165` confirms
`remediated_by` and `NO_COUNTERPART` pins are deliberately not re-opened, which accounts for the
other 41. [RULE] cross-checked all 38 changed triples independently: all exact.

**[VERIFIED] `SIGHTS_BAND_FACTOR = 2` is re-derived from primary source, not inferred.**
`WSMAIN.MAC:3904-3906` is `LDD TMPSIZ / LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON`; `:3920-3923` is
`LDD TMPSIZ / ADDD TMPSIZ / ADDD TMPSIZ ;ALLOW LARGER WARNING AREA / SUBD TMPOCT`. 3 ÷ 1.5 = 2,
exactly, and it is the one term in the expression that is unit-free. `CHSET C$PS ;STATUS: ALIEN IN
PLAYER SITES` is at `:3930` as cited. The test's `const SIGHTS_FACTOR = 2` is a deliberate
hand-written pin, documented as such at `tie-sights-status.test.ts:62-65` — correct discipline, not
a duplicated constant.

**[VERIFIED] [TEST] The retirement is complete and no sibling suite was silently hollowed out.**
This is the round-1 defect class and the reason for the third round, so it got the most attention.
`spaceEye` greps to **zero live references** across `src/ tests/ tools/ docs/` — all 15 survivors are
prose, independently classified by [PREFLIGHT], and `gameRules.ts` exports nothing matching `eye`.
Every one of develop's nine consumer files is accounted for. The defanging question is closed by a
mechanical fact [TEST] surfaced that I had not considered: `spaceEye(s)` evaluated to **exactly 0 at
`frame: 0`**, and `makeSpaceState()`/`initialState()` set `frame: 0` — so every `eye = spaceEye(s)`
→ `eye = COCKPIT` swap in a frame-0 fixture is bit-for-bit semantically null. Only two sites ever
saw eye ≠ origin: the explicit `frame: 128` override (inverted, and it catches both an always-set
and a never-set C_PS) and the live-stepping loiter fixture (re-seated). Separately: none of develop's
three new suites touch `eyeOf`, so the 13-importer indirect-consumer sweep from round 1 does not
reopen. `tie-hit-status.test.ts` is correctly untouched — its `aimAt` always projected from the
origin with no view translation, so the merge makes a long-standing approximation exact.

### The four disabled domains, assessed by me

Five of nine specialists are off via `workflow.reviewer_subagents`, and my own sidecar records that
this cost round 2 two of its seven findings. So these are assessed rather than skipped, and one of
them produced this round's Gap.

- **[EDGE]** Boundary paths enumerated by hand. The `beamHit` band edge is pinned by an exact
  499/501 pair (`tie-sights-status.test.ts:117/121`, `onRay(s, 6000, band ± 1)` against the 500 u
  band); `along <= 0` rejects behind-the-gun; `depth > VIEW_NEAR` and `depth <= VIEW_FAR` clamp the
  pyramid; `lat * lat < depth * depth` is strict, so 45° is out of view as the ROM's `BHS` requires.
  The one corner that is NOT covered is C_PS with C_PV clear at point blank — worked example
  `[400, 0, -10]`, filed as the Gap in Delivery Findings.
- **[SILENT]** No try/catch, no async, no swallowed errors anywhere in the diff. The only silent
  degradation is `normalize`'s zero-length guard (`math3d.js:158-161`) turning a
  eye-equals-target query into a null direction rather than NaN — pre-existing, and it fails safe.
- **[TYPE]** No new types. `COCKPIT: Vec3` is a `readonly` tuple, so the reference newly shared
  between `gameRules`, `sim`, `tie-status` and `render` cannot be mutated by any consumer — round 2
  proved that with a probe and `tsc --noEmit` still gates it. `shipPoint` remains exhaustive over
  `Phase` with no `default` and no trailing return, so a fourth phase is a compile error rather than
  a silent origin.
- **[SIMPLE]** No dead code survives the retirement: every export of the four changed source files
  has live call sites beyond its own definition, and `COCKPIT` itself is consumed at `sim.ts:1538`
  and `:2197`. The only redundancy is round 2's still-open duplicate `../core/gameRules` import at
  `render.ts:61`/`:63`, re-confirmed by [RULE].

### Findings

**[MEDIUM] [DOC] [RULE] sw8-8 broke its own design-spec citation, in the commit that broke it.**
`tests/shell/render.space-camera.test.ts:85` cites
`docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:26-30` for the quoted
longplay observation "mid space-combat, the Death Star is entirely out of frame". That span now holds
the `### Evidence anchor` heading and the opening of sw8-8's own **AMENDED** blockquote; the quote
lives at `:45-46`. It was correct when written — at `9c6f19c` the sentence sat at `:28-30` — and
sw8-8's 31-line amendment, added in the same commit `b664763` as this test file, pushed it down 17
lines. Sharpest instance of the class: it is self-inflicted, and it is the anchor carrying the
story's one piece of surviving counter-evidence, so a reader who follows it lands on the amendment
that reinterprets the observation and never reaches the observation. Found by [RULE]; verified by me
against both revisions.

**[MEDIUM] [DOC] The new comments condense the tombstone into claims the ROM appears to refute — and
disagree with each other doing it.** `tie-status.ts:13-14` says `ST.UX` is "the starfield's register,
never a **viewer**", while `WSGLOB.MAC:465` reads `ST.UX::	.BLKB 2			;VIEWER X POSITION`. Ten lines
later `:130-131` states the same fact as "never a **camera**" — two phrasings of one claim in one
file, and only the second is safe. The tombstone survives this because it disambiguates outright
("`ST.UX::`'s own `;VIEWER X POSITION` names the QUANTITY, not a consumer"); the condensed copies
keep the conclusion and drop the qualifier. Same pattern in this round's new test comment:
`tie-sights-status.test.ts:189` says "`WSSTAR.MAC:98` is its only **reader**", but `LDD ST.UX` also
appears at `WSMAIN.MAC:2245, 2266, 2273, 2279, 2285`. Those are read-modify-write increments, so the
tombstone's fuller phrasing ("its only reader … loads ST.UX/UY/UZ straight into the Math Box
translation registers and immediately emits star points") holds and the condensation does not.
`render.ts:357-358` carries the same condensed form from round 2. This is exactly the round-2 defect
class reproduced in new prose, in the files a future ST.UX reader opens first — which is the third
re-derivation the tombstone exists to prevent.

**[LOW] [TEST] The re-seated loiter fixture sits in a narrow admissible window and does not assert
its own premise.** `tie-loiter-sights.test.ts:182`, `seat = [6000, 0, -6000]`. The value is
well-measured — [TEST] ran the real `stepGame` and found C_PS clear on all 391 frames of the parked
flight with a 916 u minimum against the 500 u band, and set on 70 frames when tracked. But its seatX
sweep shows 6000 is the only value of six that discriminates: 0/1500/3000/7500 break the negative
half and 4500 breaks the positive. The test never asserts the premise its own name rests on — that
the fighter is off the crosshair — so if a future change to `TCH1DZ`'s move table, `TICK_HZ` or the
weave amplitude slides the fighter across the band, the negative half goes red with no signal about
which half of the claim broke, and the cheapest response looks like re-seating again. Fix: assert
C_PS inside the parked loop (`expect(computeStatus(...) & Status.C_PS).toBe(0)` per frame), the way
the AC-6 test at `:257-260` already guards its own fixture with an explicit `beamHit(...).toBeNull()`.
Related trivia: the fighter leaves the field at frame 391, so the `900`-frame budget is more than
double dead headroom.

**[LOW] [DOC] [RULE] The tombstone's `.REPT 0` citation starts two lines past the directive it
names.** `gameRules.ts:240` cites `:2273-2290`; `.REPT 0` is at `WSMAIN.MAC:2271`, `:2272` is
`SMVDX1:`, and `:2273` is `LDD ST.UX` — the routine's body. The end (`:2290` = `.ENDR`) is right and
the claim is true; only the anchor is off. Distinct from round 2's three items in this same block,
which makes it the fourth defect in five lines of evidence. `gameRules.ts` is byte-identical to the
round-2 tree, so this is a round-2 miss newly found, not a regression.

**[LOW] [DOC] [RULE] `sim.ts:2161-2165` asserts a re-export that `:2166` retires.** Five lines of
present-tense prose — "Re-exported **here** so the shell's camera … and every existing caller keep
their import path — the sw7-16 invariant **still routes through** the single function" — sit directly
above the note saying the re-export is gone. The retirement was recorded by appending a correction
rather than deleting the paragraph it corrects. Present in `94fb711` too, so also a round-2 miss.

**[LOW] [DOC] [RULE] The `COCKPIT` export comment over-claims its own justification.**
`gameRules.ts:19-20`: "`render.ts cameraView` and `tie-status.ts`'s C_PV pyramid both need it.
Neither can read `sim.ts shipPoint` for it — `tie-status ← sim` is a core import cycle." The cycle is
real for `tie-status.ts` and irrelevant to `render.ts`, which is shell and already imports `sim.ts`
(`render.ts:62`, `import { surfaceShip } from '../core/sim'`). Round 2 flagged this same comment once
for over-claiming; this is a second instance in it.

**[DISMISSED] [RULE] DEFECT 1 — `gameRules.ts:241` cites `WSMAIN.MAC:2523-2531` where the correct
span is `2522-2530`.** Real, but it is verbatim round-2's sw8-18 item ("the span `2523-2531` omits
the `SMVSP1:` label it names (`:2522`) and runs into `S1MVHP:` (`:2531`)"). [RULE] flagged the
overlap itself and asked for dedup. Dismissed as a duplicate finding, not as a non-issue — it ships,
under sw8-18.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + `star-wars/CLAUDE.md`'s hard
boundary. Enumerated exhaustively by [RULE] across every changed `.ts` file and spot-checked by me.

- **#1 type-safety escapes** — PASS. Zero `as any`, `as unknown as`, `@ts-ignore`,
  `@ts-expect-error`, or non-null `!` in the added lines. Confirmed independently by [SEC].
- **#2 generics/interfaces** — PASS. No `Record<string, any>`, `object`, or `Function`. The only new
  type in the branch (`Flight`, in the reaction-window suite) has concrete fields.
- **#3 enums** — N/A. `Status`'s bitflags live in untouched `tie-vm.ts`; `shipPoint`'s switch over
  `Phase` is still exhaustive with no `default`, so a fourth phase breaks the build.
- **#4 null/undefined** — PASS. No `||`-for-`??` introduced. The one nullish default,
  `input.aspect ?? 1` (`sim.ts:158`), is pinned in both directions by
  `tie-loiter-sights.test.ts:214-225`. Noted below that it guards `undefined` but not non-finite.
- **#5 modules** — PASS, except the duplicate `../core/gameRules` import at `render.ts:61`/`:63` —
  round 2's open Low, re-confirmed. No new import cycle: `gameRules → state/math3d`,
  `tie-status → gameRules` (not `sim`), `sim →` both.
- **#6 React/JSX** — N/A, no `.tsx`.
- **#7 async** — N/A, the core is synchronous.
- **#8 test quality** — PASS on the mechanical checks (no `.only`/`.skip`, no `toBeTruthy`, no
  `as any` in assertions). The substantive test findings are the Low above.
- **#9 build/config** — N/A, no config changed. `tsc --noEmit` and `vite build` both clean.
- **#10 input validation** — N/A, no external input.
- **#11 error handling** — N/A, no try/catch touched.
- **#12 performance** — PASS. The catch-up loop is bounded by `MAX_CATCHUP_FRAMES`; no per-frame
  unbounded growth added.
- **#13 fix-introduced regressions** — this is a resolution diff, so it applies at full force, and
  it is where the findings are: four of the six confirmed defects are comment/citation regressions
  in exactly the sense check #13 describes. None is a code regression.
- **`src/core` purity (`star-wars/CLAUDE.md`, the repo's single most important rule)** — PASS, and
  the change strengthens it. `COCKPIT` is a static constant, so `computeStatus` lost its last
  `state.frame` dependency; no DOM, no `Date.now`, no `Math.random`, no `shell` import in any changed
  core file. Frame-invariance is now pinned for BOTH derived player-relative bits — C_PV by
  `tie-fire-visibility.test.ts` and C_PS by the newly inverted test — where before the merge only
  C_PV was.
- **ROM citations checkable** — the failing rule. Six defects, four of them found only on a third
  read of the same block. Every citation I checked myself against
  `~/Projects/star-wars-1983-source-text` was substantively TRUE; what fails is the anchoring and the
  condensation. That distinction is why this is Medium and not High — but it is also why sw8-18
  should not sit in the backlog.

### Devil's Advocate

Suppose this is broken. Where?

The most promising line was that the loiter negative control passes for the wrong reason. The seat
`[6000, 0, -6000]` is exactly 45° off at that depth, which is precisely where `lat * lat < depth *
depth` flips false and C_PV goes CLEAR — a fixture parked on a boundary where a *different* bit
switches off is the signature of a negative that cannot fail. I could not make it stick.
`TCH1DZ` gates on `C_PN | C_PS`, `C_AS | C_AG | C_PS`, `C_AG | C_PS` and `CIF(C_PS)`
(`tie-vm.ts:341-342`) and never on C_PV; `beamHit` carries no FOV clamp. And there is a structural
reason the pair is sound that survives any fixture choice: the player's aim does not influence the
fighter's flight, so the tracked and parked runs fly *identical trajectories* until the branch
diverges — at the frame the tracked run enters 20$, the parked run has the fighter at the same
position with the same C_PN/C_AS/C_AG, and only C_PS differs. The mirror is not decoration; it is
what makes the negative interpretable. [TEST]'s 916-vs-500 measurement then confirmed by experiment
what the structure implies.

Second line: a confused reader. Here the code genuinely is weaker than it looks, and it is why two
Mediums stand. Someone who greps `ST.UX` finds `;VIEWER X POSITION` at `WSGLOB.MAC:465` and reads
`tie-status.ts:14` telling them it is "never a viewer" — those are in direct verbal contradiction,
and the reconciliation lives in a different file. Someone who follows
`render.space-camera.test.ts:85` to spec `:26-30` lands on the amendment rather than the observation.
Every one of these is a reader being told something false by an artifact whose only purpose is to be
trusted, in a story whose central deliverable is a tombstone against a *third* re-derivation. The
code is right and the map to it is wrong in six places.

Third line: degenerate inputs. The eye and the fighters' beeline destination are now the same point,
so a zero-length direction vector is newly reachable — but `beamHit` returns null on `along <= 0`
before any division, and `normalize` guards zero length to `[0,0,0]` (`math3d.js:158-161`), so a TIE
at the exact origin yields "no sights" rather than NaN. Non-finite aim is the one that survives
scrutiny: `input.aspect ?? 1` catches `undefined` but not `Infinity`, which a zero-height canvas
would produce, and the whole aim ray then goes NaN and the player silently cannot shoot. It degrades
to a miss rather than a crash, it is pre-existing shell plumbing, and it is nowhere near this
diff — noted, not filed against this round.

Fourth line: what if the merge left a duplicate live path? That is the characteristic failure of a
unification merge — not a missing guard but a surviving one. `spaceEye`,
`SPACE_EYE_SHIFT_PER_FRAME` and `EYE_WRAP` all grep to zero live references, the `sim.ts` re-export
is gone, and the mutation I ran proves the *surviving* path is the one under test: change the one
remaining eye and six guards across three suites go red. If a second live eye existed, that mutation
would have been compensated somewhere and stayed green.

What I would still like and did not get: nobody has played this. The behaviour change is real —
fighters now break off their weave without the player steering — and it lands in a shipped story.
That is a playtest observation, not a unit-test one, and it is correctly logged rather than
suppressed. It does not block, because the ROM decides this and the ROM has decided.

### Why APPROVED and not a fourth round

The scope SM set was the resolution, and the resolution is right in every dimension I can measure:
the seam ruling is ROM-correct and satisfies uf1-12's ACs as written, the 25 re-seats are mechanical
where they should be and measured where they could not be, the one inversion discriminates in both
directions, the two duplicate-verbatim pins landed on the correct occurrence, and the story's own
tripwire still reds six tests on the merged tree. 2035/2035, build clean, tree clean.

Six prose defects is a lot, and I considered rejecting on the accumulation. I am not going to, for
two reasons. Round 2 rated this identical class Medium and approved; escalating the same class to
blocking on round three, over a branch whose code is correct and mutation-proven, would be
inconsistency dressed as rigour. And four of the six are pre-existing round-2 misses in files this
round did not touch — rejecting the merge resolution for them punishes the wrong commit. The two
that ARE new this round are both condensation defects in comments, and sw8-18 already exists to
collect exactly this. What I have done instead is name all six, add them to sw8-18, and recommend in
the Delivery Findings that sw8-18 be treated as blocking-before-release with a mechanical guard for
the general case — because nothing in this pipeline re-opens a `.MAC:NNNN` span embedded in an
ordinary source comment, and that is precisely why all six survived two green rounds.

**Data flow traced:** `input.aimX/aimY/aspect` → shadowed onto `state` (`sim.ts:158`) → both
`beamOrigin = shipPoint(state)` (`:311`, the gun) and `computeStatus` (`:411`, the only call site) →
`aimDirection(state.aimX, state.aimY, state.aspect)` (`tie-status.ts:174`) →
`beamHit(COCKPIT, ray, e.pos, 2 * TIE_HIT_RADIUS)` → `Status.C_PS` → `tickChoreo` gate → the
`TCH1DZ` → `20$` loiter break. Safe because gun and sights read one origin, one direction and one
frame's input — which is AC-6 stated as an identity rather than a relation.

**Pattern observed:** a retiring story that unifies two consumers onto one constant, `sim.ts:311` and
`tie-status.ts:134`. Good pattern, correctly executed — and its characteristic risk (a surviving
duplicate path) is closed by the grep-to-zero plus the mutation above.

**Error handling:** no error paths in the diff. The one degradation path is `normalize`'s
zero-length guard at `math3d.js:158-161`, which turns the newly-reachable eye-equals-target case into
a null direction instead of NaN.

**Handoff:** To Winston Smith (SM) for finish-story. Do not reopen the round-2 verdict; do expect a
sprint-file reconcile — this checkout is 21 commits behind `origin/main` with an uncommitted
`epic-sw8.yaml` status edit, and `star-wars`'s `origin/develop` is verified still at `aabe488`, so
the code side is not racing.