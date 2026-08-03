---
story_id: "sw8-19"
jira_key: "sw8-19"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-19: C_PS can be set while C_PV is clear — the port carries only one of the ROM draw-pass gates

## Story Details
- **ID:** sw8-19
- **Jira Key:** sw8-19
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work lands on the default branch)

> The branch field above is the documented escape hatch for a trunk-based story whose work lands
> on `main`. It is set proactively at setup because `pf sprint story finish` scrapes that labelled
> token by pattern from anywhere in the file and refuses when it cannot verify the value (jt8-3).
> `feat/sw8-19-gate-c-ps-on-c-pv` exists purely as a CLAIM marker at zero commits ahead of `main`,
> so a sibling checkout's `git branch -r | grep sw8-19` probe sees this story is owned. Nothing
> merges it; delete it at finish once the count is 0.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T01:52:04Z
**Round-Trip Count:** 0

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T00:32:50Z | 2026-08-03T00:35:09Z | 2m 19s |
| red | 2026-08-03T00:35:09Z | 2026-08-03T01:08:52Z | 33m 43s |
| green | 2026-08-03T01:08:52Z | 2026-08-03T01:37:38Z | 28m 46s |
| review | 2026-08-03T01:37:38Z | 2026-08-03T01:52:04Z | 14m 26s |
| finish | 2026-08-03T01:52:04Z | - | - |

## Delivery Findings

<!-- agents append below; never edit another agent's entries -->

### TEA (test design)

- **Gap** (non-blocking): the player's GUN carries the SAME divergence this story fixes for the
  sights bit, and it is a separate story. `sim.ts:535` resolves the player's laser through
  `beamHit(beamOrigin, beamDir, enemies[ei].pos, TIE_HIT_RADIUS)`, and `beamHit` has no view
  test — but the ROM's laser-hit block (`WSMAIN.MAC:3898-3918`) sits under the very same four
  `C$PV` exits as the sights block, so the cabinet cannot resolve a hit on an object it did not
  draw. MEASURED: a TIE at `[0, 240, -400]` on a 16:9 canvas is outside the rendered pyramid
  (vertical bound 230.9) and 240 u from the aim ray, i.e. inside `TIE_HIT_RADIUS` — killable
  while off-screen. Affects `plugins/star-wars/src/core/gameRules.ts` / `sim.ts` (the hitscan
  would need the same gate). Deliberately NOT fixed here: it changes what the player can shoot,
  which is not a 2-point sights-bit story, and `tie-sights-visibility.test.ts` pins the current
  gun behaviour so the change cannot happen by accident. *Found by TEA during test design.*

- **Improvement** (non-blocking): `tests/core/tie-sights-status.test.ts:154` is named
  `'never sights a TIE behind the eye — the CHSET lives in the DRAW pass'`, but it only proves
  the behind-the-eye half; nothing in it observes the draw pass. That name was the closest the
  suite could get while the draw-pass gate was unported. Once this story lands the property is
  real and separately covered, so the name should be narrowed to what the test proves. Affects
  `plugins/star-wars/tests/core/tie-sights-status.test.ts` (rename only). *Found by TEA during
  test design.*

- **Improvement** (non-blocking): `tests/core/tie-loiter-sights.test.ts:192-193` already recorded
  this defect's geometry without recognising it — "4,000 at this depth is 33.7° off the nose —
  still outside the ±30° glass" — as the reason its parked-yoke half holds. That fixture is the
  in-play seat this story's RED flies, and it spends 30 of its 391 frames sighting an off-glass
  fighter. Worth a cross-reference in that comment once the gate lands, so the next reader sees
  the two facts are the same fact. Affects `plugins/star-wars/tests/core/tie-loiter-sights.test.ts`
  (comment only). *Found by TEA during test design.*

- **Question** (non-blocking): sw8-25's citation-association defect reproduces during ORDINARY
  AUTHORING, not only in legacy prose. Writing `:3898-3918` bare in a comment that also mentions
  `gameRules.ts` made the guard bind the ROM span to `gameRules.ts` (272 lines) and report a span
  out of range — raising the tree-wide count to 30 against the ratchet ceiling of 29. Caught and
  corrected here by spelling the filename (`WSMAIN.MAC:3898-3918`), with the near-miss recorded in
  the file. sw8-25 already owns the association rule; the open question is whether it should also
  own a "bare span near a different filename" warning, since the failure mode is a new file rather
  than a drifted one. Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the gate reads `status` for C_PV, so it depends on the C_PV
  block running BEFORE the C_PS block inside `computeStatus`. It does today, and the dependency
  is genuinely covered — mutating the gate to always-false reddens 16 tests — but nothing in the
  code says "this block must stay below C_PV", so a future reordering breaks it silently at the
  source even though the suite would catch it. Affects
  `plugins/star-wars/src/core/tie-status.ts` (a one-line note, or hoisting the C_PV predicate
  into a named local both blocks read). Not done here: it is beyond what any AC asks and the
  mutation coverage is real. *Found by Dev during implementation.*

- **Question** (non-blocking): TEA's gun finding was re-verified while implementing and it
  stands — `sim.ts:535` resolves the player's laser through the same `beamHit`, so the clone can
  still kill a fighter it does not draw, where the cabinet's hit block sits under the identical
  `C$PV` exits. One extra datum for whoever picks it up: the fix there is NOT the same one-line
  gate, because `beamHit` is shared by the trench and ground phases (`sim.ts:1083`, `:1312`,
  `:1328`) which have no `C_PV` notion at all — so it needs a caller-side gate on the space arm,
  not a change to the helper. Affects `plugins/star-wars/src/core/sim.ts`.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): `tests/core/tie-sights-visibility.test.ts`'s "records that the FAR exit
  (:3828) is unreachable in space" does NOT guard the property it names. It pins
  `TIE_SPAWN_DISTANCE` (0x7c00 = 31744), but reachable depth is bounded by `PLAY_CUBE_MIN`
  (-32000, `state.ts:597`, applied at `sim.ts:470` via `clampToPlayCube`). MUTATION-PROVEN:
  setting `PLAY_CUBE_MIN = -33000` makes depth 33000 reachable — past `VIEW_FAR` (32512), so the
  far exit becomes live — and **all 2252 tests stay green**, that one included. Affects
  `plugins/star-wars/tests/core/tie-sights-visibility.test.ts` (assert
  `VIEW_FAR > Math.abs(PLAY_CUBE_MIN)`, keeping the spawn pin as a second anchor).
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `sim.ts:151-158` argues the sights bit and the gun "cannot
  disagree", and names the outcome "the laser kills fighters the bit says are not there" as the
  failure mode a stale aim would cause. After this story that outcome is the DELIBERATE shipped
  behaviour for off-glass fighters — the gun still resolves them, the bit no longer does. The
  comment is not false about its own subject (aim freshness) but a reader now meets a paragraph
  calling a shipped, intended divergence a bug. Affects `plugins/star-wars/src/core/sim.ts` (one
  sentence naming the visibility divergence as separate, intended, and filed).
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `state.ts:998` says `computeStatus`'s C_PS bit "is the first
  consumer" of `state.aspect`. Since uf1-14, C_PV consumes it too — and after this story C_PS
  reads it only THROUGH C_PV. The sentence is true as history and misleading as description.
  Pre-existing (introduced by uf1-14, not by sw8-19) so recorded rather than charged to this
  story. Affects `plugins/star-wars/src/core/state.ts`. *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)

- **Edited a comment inside TEA's RED test file**
  - Spec source: the Dev role contract — "make tests pass", never move another agent's goalposts
  - Spec text: implementation makes failing tests pass; test authorship belongs to TEA
  - Implementation: corrected a factual error in the header prose of
    `tests/core/tie-sights-visibility.test.ts` (it claimed `86$` was "the only branch target
    BETWEEN" `:3846` and `:3930`; `86$` is at `:3933`, past the second CHSET). No assertion,
    fixture, name or import was touched — the diff is comment text only.
  - Rationale: the same false sentence was in the source comment I was required to write, and I
    had copied it from the RED header. Fixing one copy and leaving the other would have shipped
    a false ROM claim in the file whose whole purpose is pinning that ROM claim — the exact
    defect class sw8-18 exists for, and the one AC5 was written to close.
  - Severity: minor
  - Forward impact: none on coverage. The Reviewer should read it as a Dev edit to a TEA file
    and check that no assertion moved with it (`git show 0119a9b` — comment lines only).

### TEA (test design)

- **Pinned AC5's corrected claim in TWO files, where the AC names one**
  - Spec source: context-story-sw8-19.md, AC5
  - Spec text: "The C_PS comment block records the ROM structural gate ... replacing the sentence
    currently at tie-status.ts:283-284"
  - Implementation: the assertion sweeps `src/core/tie-status.ts` AND
    `tests/core/tie-sights-status.test.ts`, whose header states the same understatement in the
    same words ("the 'must be drawn' gate the CHSET inherits from sitting in the draw pass comes
    free from `beamHit`").
  - Rationale: sw8-18's finding on this very epic was that a false sentence lived at nine sites
    and correcting three of them "is not a shippable deliverable". Both copies say the thing this
    story exists to correct; fixing one and leaving the other reproduces that exact defect one
    story later.
  - Severity: minor
  - Forward impact: Dev edits two files rather than one, the second a test header. No assertion
    in that suite changes.

- **The far-clamp exit (`WSMAIN.MAC:3828`) is asserted by CONSTANT ORDERING, not by a seat**
  - Spec source: context-story-sw8-19.md, "Two boundaries TEA should not waste a test on"
  - Spec text: "The far clamp is unreachable ... a far-side seat cannot be built."
  - Implementation: `records that the FAR exit (:3828) is unreachable in space` pins
    `TIE_SPAWN_DISTANCE === 0x7c00` and `VIEW_FAR > TIE_SPAWN_DISTANCE` instead of seating a TIE
    past the far plane.
  - Rationale: no such seat exists — the play cube clamps inside `VIEW_FAR`, so any fixture would
    be unreachable state and the test would assert nothing. Pinning the ordering makes the
    unreachability itself falsifiable: if either constant moves, that test says so rather than a
    silent coverage hole implying the case was handled.
  - Severity: minor
  - Forward impact: if a later story raises the play cube or lowers `VIEW_FAR`, this test reddens
    and a real far-side seat becomes writable and necessary.

### Reviewer (audit)

- **TEA — "Pinned AC5's corrected claim in TWO files, where the AC names one"** → ✓ **ACCEPTED**.
  Not merely sound, load-bearing: Dev's battery shows G7 (source) and G8 (test header) each redden
  exactly one test *independently*, so pinning only the file AC5 names would have let half the
  corrected claim ship still wrong. This is the sw8-18 nine-sites lesson applied correctly.

- **TEA — "The far-clamp exit (`WSMAIN.MAC:3828`) is asserted by CONSTANT ORDERING, not by a
  seat"** → ✗ **FLAGGED**. The decision to assert rather than seat is right — the state is genuinely
  unreachable, so no fixture exists. But the entry's stated rationale is false: *"if either
  constant moves, this says so instead of a silent coverage hole implying the case was handled."*
  The test pins `TIE_SPAWN_DISTANCE`, while reachability is bounded by `PLAY_CUBE_MIN`. Mutating
  `PLAY_CUBE_MIN` to -33000 makes the far exit reachable with all 2252 tests green. Raised as a
  Medium; the fix is one assertion. The deviation is otherwise accepted — only its rationale needs
  correcting, and it must be corrected because the archived session is the permanent record.

- **Dev — "Edited a comment inside TEA's RED test file"** → ✓ **ACCEPTED**. Verified mechanically
  rather than taken: stripping every `//` comment from both files at `3583ed3` and `0119a9b` and
  diffing yields IDENTICAL output for each, so no assertion, fixture, name or import moved. The
  edit corrects a false ROM claim in the file whose purpose is pinning that claim; leaving TEA's
  copy wrong would have reproduced the exact defect AC5 exists to close.

## Sm Assessment

**Story:** sw8-19 (sw8, 2 points, p3, `tdd`, `type: bug`). Filed as the "Gap" by sw8-8's round-3
Reviewer. Set up 2026-08-02 in checkout `a-2`.

### Board probes — clean, and the dependency is satisfied

- `git fetch --prune` then `git branch -r | grep -Ei sw8` → **no remote branch** for any sw8 story.
- Sibling sessions across checkouts: `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` →
  one hit, `a-1/.session/jt9-2-session.md`. Read the output rather than trusting the exit code —
  a failing glob and a clean board look identical.
- `gh pr list -R slabgorb/arcade --state open` → empty. Merge gate clear.
- **The story's own hard dependency is discharged.** Its description opens "DEPENDENCY (architect
  sweep, 2026-07-31): DO uf1-14 FIRST", and warns that uf1-14, uf1-15 and this story all rewrite
  `computeStatus`. **uf1-14 and uf1-15 are both `done`.** No open story in any epic touches
  `tie-status.ts` / `computeStatus` / C_PV besides this one.
- Sole-owner probe (the uf1-9 reflex — grep the central symbol across `sprint/epic-*.yaml`, not
  just the code): `C_PS` / `C$PS` / `SIGHTS_BAND` / `tie-status` hits only this story's own row and
  the completed uf1-12/14/15 rows. **No second story builds this.**
- Predecessor audit (the jt9-1 rule — check off *every* row of the predecessor's findings table,
  not only the rows this story's description mentions): sw8-8 round 3 filed 2 Medium + 4 Low + 1
  dismissed, and the Reviewer routed **all seven to sw8-18**, which is `done`. The Gap is the
  eighth row and it is this story. **No unrouted leftovers.**

### Measurement before setup — the description carried five falsifiable claims, and two are wrong

The standing rule is to measure a description's falsifiable claims before handing them forward as
current fact. This story earned it twice over: it is a citation-dense filing, **and** its own
prerequisite (uf1-14) shipped after it was written, which is the change most likely to have rotted
its identifiers. Full detail with the tables is in `sprint/context/context-story-sw8-19.md`;
the summary:

**Verified, needed no correction (7):** `WSMAIN.MAC:3930` is the tree's sole `CHSET C$PS` and
`:3919-3932` is exactly its block; `tie-vm.ts:341-342` carries exactly four C_PS gates;
`TIE_HIT_RADIUS = 250` so the band is 500; `VIEW_NEAR = 0x10 = 16`; `beamHit` has no FOV clamp
(only `along <= 0` and `along > maxRange`); and the worked example `[400, 0, -10]` returns C_PS set
/ C_PV clear — **run, not read**.

**Corrected (5):**

1. **Its own citation rotted.** `tie-status.ts:170-173` → the sentence is now at **:283-284**
   (+113). The claim survives at the corrected lines; only the pointer moved. sw8-18's thesis,
   demonstrated on a story filed by the same review.
2. **The ROM gate is much stronger than filed**, and this is the finding that changes the work.
   The filing calls it implicit in "sitting inside the object draw pass". Measured: `S2VW`
   (`WSMAIN.MAC:3755`) has **exactly four exits before `CHSET C$PV`** — `:3826`, `:3828`, `:3836`,
   `:3842`, all to `RTS1: RTS` at `:3754`, and those are its only four references in the file. Those
   four tests **are** C_PV. `CHSET C$PV` is `:3846`, `CHSET C$PS` is `:3930`, and the only branch
   target between them is the forward `86$` at `:3933`. So the sights bit is **unreachable** unless
   the view bit was set 84 lines earlier on the same object in the same pass. "Likely fix: gate C_PS
   on C_PV" is not a guess — it is a transcription of the cabinet's control flow.
3. **The story's open question is answered: no other implicit gates remain.** `IS2UV`/`OBJCEN`
   (`:3870-3873`) are `JSR`s returning to `:3875` and cannot skip the caller; the laser-hit block's
   four `ENDIF`s all close before `:3919`, so C_PS is **not** nested inside the laser's conditions;
   and the only other gate, `?ALIVE?` (`:3926-3928`), is already ported.
4. **The impact is understated.** "Behaviourally small (the fighter is about to collide)" is true
   of the seat the filing chose and false of the region. Swept: C_PS-set/C_PV-clear runs from depth
   10 out to **depth ≈ 866** (crossover `500 / tan(30°)`), where the TIE is ~925 u away — 3.7 ×
   `TIE_HIT_RADIUS`, not colliding.
5. **uf1-14 made the defect BIGGER, not smaller.** The crossover is `band / tan(half-angle)`: 500 at
   the retired ±45°, 866 at uf1-14's rendered 30°. A **73% deeper** region, and aspect-dependent
   horizontally (866 / aspect → 487 at 16:9, 371 at 21:9, 866 at 1:1) — worst on a square canvas.
   The dependency ordering was right for a reason nobody had written down.

### The sizing measurement, and why AC4 is mandatory

Per the rule that an executable subject is **run**, not read: the candidate one-line gate was
applied to committed source, the whole game suite run, and the file restored from a `cp` backup
with the md5 re-matched and the tree confirmed clean.

**2238 passed / 200 files / zero red.** Two conclusions, and the second is the one that matters:

- No fixture rework; no existing seat sits outside the pyramid; the 2-point estimate holds.
- **Nothing already in the tree can observe this change.** The new test *is* the fix's entire
  observable footprint. That is exactly the shape where a gate ships as scenery, so AC4 requires a
  mutation proof with the mutated string recorded verbatim — not "morally equivalent" — so the next
  reader re-runs the string instead of reconstructing the intent.

### One observation I could NOT resolve — handed over as a question, with the check named

The ROM's C_PS test is a pure L1 octagon (`|dx| + |dy| <= 3·TMPSIZ`, `:3920-3924`) with **no** box
test, while the laser hit is box **and** octagon at 1.5× (`:3898-3908`). Our port models both as
Euclidean spheres. I ruled this **out of scope** (AC6) and I believe that ruling is right —
the 2× ratio is the octagon-term ratio and is correct, the shape deviation is pre-existing and
documented at `gameRules.ts:118-123`, it is shared with the gun, and containment (kill ⊆ sights)
holds in both models. What I did **not** determine is whether the ROM's L1 diamond and our L2
sphere ever disagree about a *specific* seat in a way a test could see. If TEA finds one while
building the pyramid-edge fixtures, that is a finding worth filing — not worth fixing here, since
the fix would move the gun.

### No user ruling was needed, and I checked

The two shapes that normally require one were both closed by measurement rather than by taste. The
either/or ("gate on C_PV, or port some other draw-pass gate?") was resolved by the ROM's own
control flow — there is no second option, so offering one would have handed over a choice that does
not exist. The scope call (the octagon shape) is a pre-existing documented deviation shared with the
gun, not a decision this story opens. Recorded here so the absence of a question is visible as a
decision rather than an omission.

### Baseline handed forward (this checkout, clean tree, 2026-08-02)

`--project star-wars` **2238/2238 (200 files)** · `test:orchestrator` **390 pass / 0 fail** ·
`lint` **0 errors**. Nothing red is inherited; any red after RED lands belongs to this story.

Environment: dev port 5270 is held by the **`a-1`** checkout (pid 7744). This story is pure-core and
needs no browser — do not kill that server; use `npx vite --port 5290 --strictPort` if a served
check is ever wanted.

### Artifacts and their verification

- `sprint/epic-sw8.yaml` — six ACs written (the story was filed `acceptance_criteria: null`).
  `git diff --stat` = one file, 7 insertions. Every story in the epic still carries `repos: arcade`.
- `sprint/context/context-story-sw8-19.md` — hand-authored. All six ACs confirmed byte-verbatim by a
  `python3` `in` test against `yaml.safe_load`, not by grep; no `Approach hints to be refined` /
  `TEA to define` filler survives.
- No subagent was spawned for setup on this run; the session instructions bar the Agent tool unless
  the user asks, so both files were written by hand. (Stated as what happened this run, not as a
  property of the project.)

**Handoff:** Leeloo (TEA) for RED. The RED test is the whole deliverable's visibility — write the
two negative seats *and* the positive control, and watch the negatives fail before anything is
gated.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/star-wars/tests/core/tie-sights-visibility.test.ts` — 14 tests across 4 describes:
  the gate itself, the "don't change anything else" guards, the in-play run, and the comment.

**Tests Written:** 14 tests covering 6 ACs
**Status:** RED — 8 failing, 6 green on arrival (positive controls and don't-change-this guards)

### The measurement that reframed the story

The filing described the ROM gate as implicit — the sole `CHSET C$PS` "sits INSIDE the object
draw pass". SM measured it as control flow, and the RED is built on that: `S2VW`
(`WSMAIN.MAC:3755`) has exactly four exits before `CHSET C$PV`, all to `RTS1: RTS` at `:3754`,
and those four tests ARE C_PV's definition. I re-verified every one against the **vendored**
`reference/atari-source/star-wars-1983/WSMAIN.MAC` — which is byte-identical (`cmp`) to the
machine-local greppable copy, so the citations are safe from the known off-by-N quarry trap —
and each cited line reads exactly as claimed. So each negative seat is named for the ROM exit it
exercises rather than for its coordinates.

### RED shape: what fails, and what must NOT

| # | Test | On arrival |
|---|------|-----------|
| 1 | anchors the geometry (TIE_HIT_RADIUS 250, factor 2, VIEW_NEAR/FAR, crossover 866) | green |
| 2 | NEAR-clamp exit `:3826` — the filing's `[400, 0, -10]` | **RED** |
| 3 | a RATIO exit `:3836/:3842` — depth 800, 3.7× kill radius from the cockpit | **RED** |
| 4 | the OTHER ratio exit — lateral, 16:9, depth 400 | **RED** |
| 5 | follows the REAL viewport — `[480,0,-800]` off-glass at 1:1, on-glass at 16:9 | **RED** |
| 6 | UNIVERSAL sweep, C_PS ⇒ C_PV, both counters asserted non-zero | **RED** |
| 7 | positive control — a visible fighter in the band stays sighted | green |
| 8 | does NOT change the GUN — `beamHit` still has no view test | green |
| 9 | band stays at exactly 2× — the fix is a gate, not a narrowing | green |
| 10 | far exit `:3828` unreachable, asserted by constant ordering | green |
| 11 | IN PLAY — the shipped uf1-12 loiter fixture, zero off-glass sighted frames | **RED** (30 today) |
| 12 | the comment names C_PV and cites the four RTS1 exits | **RED** |
| 13 | no file still offers `beamHit` as the "must be drawn" gate | **RED** |
| 14 | `beamHit` is still described truthfully — a weaker guard that survives | green |

The six green ones are the point of the design: **if a fix simply stopped deriving C_PS, every
negative above would pass.** 7, 8, 9 and 11's own controls are what forbid it.

### Satisfiability, proven rather than assumed

Applied the candidate one-line gate to committed source and ran the full game suite:
**2250 passed / 2252, and the only 2 failures are tests 12 and 13** — the comment ACs, which are
Dev's prose and cannot be closed by code. **Zero sibling breakage.** Restored by `cp`, md5
re-matched (`286e31462b910b0af2848e0757bc0d29`), `git status` on `src/` empty. An unsatisfiable
RED is worse than no RED and cannot be detected by reading it.

### Mutation battery — every guard ranked, and each wrong fix caught by a DIFFERENT test

Mutations were written to a file, each asserting its own landing (`count(needle) == 1`,
`mutated != original`) before the run was believed. Full star-wars suite per mutant.

| mutant | my file | full suite | what it establishes |
|---|---|---|---|
| M0 correct gate | 2 red | 5 red / 2247 | satisfiable; the 2 are the prose ACs |
| M1 aspect-BLIND fixed 30° cone | 3 red | 7 red | test 5 bites — a constant cone cannot pass |
| M2 near clamp ONLY (fixes the filed example alone) | 7 red | 10 red | tests 3, 4, 5 kill the tempting minimal fix |
| M3 vertical term only (half the pyramid) | 6 red | 9 red | the two ratio exits are separately covered |
| M4 narrow the BAND instead of gating | 6 red | 12 red | test 9 plus 12 siblings — the band is load-bearing |
| M5 C_PS killed outright | 7 red | 21 red | the positive controls bite hardest, as designed |
| M6 clamp `beamHit` itself | 9 red | 14 red | test 8 kills the fix that moves the gun |

No mutant reddens everything, and none reddens nothing — the guards are strong and uncoupled.

### A defect of my own, caught by this epic's own guard

My first draft raised the tree-wide stale-citation count to **30** against sw8-18's ratchet
ceiling of **29** — three failures in `comment-citations.test.ts` and `sw8-23-guard-hardening.test.ts`
with no source change at all. Cause: I wrote a ROM span bare (`:3898-3918`) in a comment that also
named `gameRules.ts`, so the guard's association rule bound the span to that 272-line file and
correctly reported it out of range. That is sw8-25's filed defect, reproduced by accident while
writing a new file. Fixed by spelling the filename; count back to 29, zero from my file, and the
near-miss is recorded in the test so the next author does not repeat it. Filed as a Question.

Worth stating plainly: **the 3 failures were mine, not the gate's.** Attributing them to the
candidate fix would have made SM's "zero fixture rework" sizing look wrong when it was right.

### Rule Coverage

`.pennyfarthing/gates/lang-review/` holds no TypeScript checklist in this repo, so the rubric is
the project's own hard rules (`CLAUDE.md`, `plugins/star-wars/CLAUDE.md`).

| Rule | Test(s) | Status |
|------|---------|--------|
| `src/core` purity — no DOM, no wall clock, no `Math.random` | whole file: only `computeStatus`/`stepGame` + seeded `rngSeed`; enforced repo-side by the existing core-boundary scan | green |
| Determinism — seeded RNG only | every fixture threads `rngSeed(1)`; the in-play run uses `initialState(1983)` | green |
| ROM claims cite primary source | every cited span re-opened against the VENDORED `reference/atari-source/star-wars-1983/WSMAIN.MAC` (byte-identical to the greppable copy) | green |
| Comment citations must resolve | tree-wide guard back to the 29 ceiling with 0 from this file | green |
| No vacuous assertions | see self-check below | green |

**Self-check:** 0 vacuous assertions. Every negative seat is preceded by a fixture guard proving,
with the same machinery the assertion uses, that the seat is inside the sights band and outside
the pyramid — so a "C_PS is clear" cannot pass because the seat drifted out of the band. The
swept universal asserts BOTH `sighted > 0` and `inBandOffGlass > 0`, because an implication over
an empty antecedent proves nothing. The in-play test asserts its positive controls (frames flown,
visible-sighted frames, and that 20$ is still reached) BEFORE the zero it exists to check.

**Baseline at handoff:** `--project star-wars` 8 failed / 2244 passed (all 8 mine, by design) ·
`test:orchestrator` 390/390 · `npm run lint` 0 errors. One caveat worth passing on: an earlier
orchestrator run showed 389/390, and the flake is the documented dev-port gotcha — 5270 is held
by the `a-1` checkout, which makes `canonical-serve.test.mjs` fail only in a full run. It passed
on re-run and is not this story's.

**Handoff:** To Korben Dallas (Dev) for GREEN. The gate is one line; the comment is the other
half and two files carry it. Do not reach for `beamHit` — test 8 is there because that is the
fix that looks right and moves the player's gun.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/star-wars/src/core/tie-status.ts` — the gate (one condition) plus the C_PS comment
  block rewritten to state the ROM's structural gate with its four `RTS1` exits cited.
- `plugins/star-wars/tests/core/tie-sights-status.test.ts` — header only: the second copy of the
  understated claim, replaced (AC5, per TEA's logged deviation).
- `plugins/star-wars/tests/core/tie-sights-visibility.test.ts` — header comment only, correcting a
  false structural claim I had propagated from it (see Design Deviations).

**Tests:** 2252/2252 passing (GREEN) — the whole star-wars project, zero failures
**Landed on:** `main` (trunk-based; `3583ed3` GREEN, `0119a9b` the prose correction), pushed

### The implementation

One condition. `computeStatus` already derived C_PV from the rendered frustum immediately above
the C_PS block, so the gate is `(status & Status.C_PV) !== 0 &&` in front of the existing
`beamHit` test. That is not a minimal-effort choice dressed up as fidelity — it is what the
cabinet does, and the comment now carries the evidence rather than the old inference.

### What I verified rather than inherited

The handoff said the ROM gate is control flow. I re-derived it from the vendored
`reference/atari-source/star-wars-1983/WSMAIN.MAC` before writing the comment, because the comment
is half the deliverable:

- `RTS1` has exactly FIVE references in the file — its definition at `:3754` and four long
  branches, `:3826`, `:3828`, `:3836`, `:3842`. All four are inside `S2VW` and all precede
  `CHSET C$PV` at `:3846`.
- Between `:3846` and `:3930` there is **no label at all** — enumerated, not assumed.
- `86$` has exactly two references: the `BNE 86$` at `:3928` and its definition at `:3933`.

### I shipped a false claim and caught it

The GREEN comment — and the RED header I took it from — said `86$` was *"the only branch target
BETWEEN"* the two CHSETs. It is at `:3933`, **past** `CHSET C$PS`, so it is not between them at
all. Corrected in `0119a9b`, in both files, to the statement the evidence actually supports and
which is strictly stronger: the span contains no label, so nothing can branch in and reach the
sights bit without having executed the view bit; `86$` can only ever SKIP the bit.

Recording it plainly because the story is a claim-correction story: the Dev sidecar's rule that
"in a fix round convened to delete false claims, your own correction prose is the likeliest new
false claim" fired exactly as written, on the first paragraph I wrote.

### Mutation battery against the DELIVERED code — 8 mutants, 8 caught, 0 survivors

TEA's battery scored a throwaway patch; this one mutates what shipped, prose included, since two
ACs are claims rather than code. Each mutation asserted its own landing before the run was
believed; source restored by `cp`, both md5s re-matched, `git status` empty.

| mutant | result | what it establishes |
|---|---|---|
| G1 the gate REMOVED (back to the defect) | 7 red | the gate is load-bearing |
| G2 gate reads `C_PN` instead of `C_PV` | 9 red | the RIGHT bit, not merely "a" gate |
| G3 gate sense INVERTED | 19 red | |
| G4 gate always-false (the ordering hazard) | 16 red | the positive controls carry it |
| G5 one ROM exit citation DROPPED | 1 red | AC5's citation half is real, not scenery |
| G6 a cited verbatim CORRUPTED (`M.YPS`→`M.QQQ`) | 4 red | the epic's own citation guard bites |
| G7 `beamHit` re-offered as the gate (source) | 1 red | |
| G8 `beamHit` re-offered as the gate (test header) | 1 red | |

G7 and G8 are the pair worth reading together: each file is guarded **independently**, so
TEA's deviation to widen AC5 from one file to two was load-bearing — had only the source been
pinned, G8 would have survived and half the corrected claim would have shipped still wrong.

### The citation gate fired on me twice, and both times it was right

My comment edits added ~35 lines to `tie-status.ts`, and the tree-wide stale-citation count went
29 → 32: I had cited single lines (`WSMAIN.MAC:3826`) while quoting verbatims that span two or
three (`CMPD #10` is on `:3825`). Corrected to real spans (`:3825-3826`, `:3827-3828`,
`:3834-3836`, `:3840-3842`), which still satisfy AC5's requirement that each exit line be named.
Count back to **29** — the delivered ceiling — with **zero** from any of the three files this
story touched.

**Final:** `--project star-wars` 2252/2252 · `npm run lint` 0 errors · `test:orchestrator` 390/390
· comment-citation guard at the 29 ceiling. Working tree clean.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer). Two things to point a gun at: the prose
correction in `0119a9b` (a Dev edit inside a TEA test file — verify no assertion moved), and
whether the four ROM exits I cite really are C_PV's definition rather than three of them plus
something I assimilated.
## Subagent Results

The Agent tool is barred by this session's own instructions ("Do not call the AgentTool unless the
user requested it"), and the user did not request it. No specialist was spawned. Per the documented
accounting pattern for unavailable specialists, every enabled domain was assessed BY HAND with
line-level or measured evidence, and each row records that honestly rather than claiming coverage
from a subagent that never ran. Three rows are disabled in `workflow.reviewer_subagents` and are
recorded as such.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (accounting) | hand-assessed | none | Ran the gates myself: star-wars 2252/2252, lint 0, orchestrator 390/390, comment-citation guard at its 29 ceiling with 0 from the 3 touched files. confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Yes (accounting) | disabled | N/A | Disabled via settings; hand-assessed anyway — degenerate `aspect` (0 and NaN) and the far/near clamp boundaries. 1 finding (the far-exit guard). confirmed 1 |
| 3 | reviewer-silent-failure-hunter | Yes (accounting) | hand-assessed | none | The gate adds no error path; `&&` short-circuits explicitly, nothing is caught or swallowed, and no value is defaulted silently. confirmed 0 |
| 4 | reviewer-test-analyzer | Yes (accounting) | hand-assessed | 1 | The far-exit guard is mutation-passable (proven). The two "positive control" counters in the sweep and the in-play run were checked to be genuinely non-vacuous. confirmed 1 |
| 5 | reviewer-comment-analyzer | Yes (accounting) | hand-assessed | 2 | `sim.ts:151-158` and `state.ts:998`. Every ROM citation in the diff re-opened against the vendored source. confirmed 2, plus 1 Low on the "ARE C_PV's definition" wording |
| 6 | reviewer-type-design | Yes (accounting) | disabled | N/A | Disabled via settings. Hand-check: the diff introduces no new type, field or signature — one `&&` term and comment text. confirmed 0 |
| 7 | reviewer-security | Yes (accounting) | hand-assessed | none | `src/core` is a pure deterministic simulation: no I/O, no DOM, no network, no auth surface, no secrets, no untrusted input. The change reads two in-memory numbers. confirmed 0 |
| 8 | reviewer-simplifier | Yes (accounting) | disabled | N/A | Disabled via settings. Hand-check: the implementation is one conjunct — there is no simpler form that satisfies AC1. confirmed 0 |
| 9 | reviewer-rule-checker | Yes (accounting) | hand-assessed | none | Enumerated below in Rule Compliance. confirmed 0 |

**All received:** Yes (9 rows accounted; 6 enabled domains hand-assessed with evidence, 3 disabled)
**Total findings:** 4 confirmed (2 Medium, 2 Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Two Medium, two Low, zero High, zero Critical. The shipped behaviour is correct and I could not
break it — not the gate, not the ROM reading, not the citations, not the degenerate inputs. Both
Mediums are claims that assert more than they prove, which is this epic's signature defect and is
exactly what the story was written to fix; neither changes what the code does.

**Data flow traced:** canvas geometry → `shell/input.ts:45` (`clientHeight > 0 ? w/h : 1`) →
`Input.aspect` → `sim.ts:159` shadows it onto `state.aspect` → `computeStatus` builds the C_PV
pyramid (`tie-status.ts:247-249`) and the sights ray (`:321`) from the SAME field → C_PS now
requires C_PV (`:322-325`) → `tie-vm.ts:341-342`'s four TCH1DZ gates. Safe because the gun
(`sim.ts:313`) inverts the projection from `input.aspect` and the bit from `state.aspect =
input.aspect ?? 1` — the same number by construction on every frame.

### The four things I attacked hardest

**[VERIFIED] Dev's `30 of 391` is real — I re-measured it rather than reading it.** Removed the
gate in place from committed source, ran the shipped uf1-12 loiter fixture, restored and
md5-matched: `frames=391 offGlassSighted=30 visibleSighted=154`. Exactly as claimed. The 154 is
the number nobody stated and it is the one that matters most — it means the in-play test's positive
control is substantial rather than marginal, so `offGlassSighted === 0` cannot pass by the fighter
simply never being sighted.

**[VERIFIED] The ROM structural claim, re-derived from the vendored source, not from the handoff.**
`grep -nF RTS1` returns exactly five references — the definition at `WSMAIN.MAC:3754` and four long
branches at `:3826`, `:3828`, `:3836`, `:3842`, all inside `S2VW` and all before `CHSET C$PV` at
`:3846`. `RTS1` appears in no `.GLOBL`, so Dev's "nothing else **in the file** branches to it" is
correctly scoped rather than accidentally narrow. Between `:3846` and `:3930` I enumerated every
label: there are none. `86$` has exactly two references — the `BNE` at `:3928` and its definition
at `:3933`. The corrected claim is exactly right, and it is stronger than the one it replaced.

**[VERIFIED] Dev's "comment-only" edit to TEA's test file — proven, not accepted.** Stripping every
`//` comment from both files at `3583ed3` and at `0119a9b` and diffing yields IDENTICAL output for
each. No assertion, fixture, test name or import moved with the prose.

**[MEDIUM] [TEST] The far-exit guard does not guard its claim.** Its name says the far exit
"is unreachable in space rather than leaving it untested", and TEA's logged deviation says "if
either constant moves, this says so". It pins `TIE_SPAWN_DISTANCE` (0x7c00 = 31744) — but reachable
depth is bounded by `PLAY_CUBE_MIN` (-32000, `state.ts:597`), applied every step at `sim.ts:470`.
Mutation: `PLAY_CUBE_MIN = -33000` makes depth 33000 reachable, past `VIEW_FAR` (32512), so the far
exit becomes live — and **all 2252 tests stay green**, that one included. The property is TRUE today
(32000 < 32512, margin 512), so nothing is broken; the guard simply cannot see the thing it is named
for. Fix: `expect(VIEW_FAR).toBeGreaterThan(Math.abs(PLAY_CUBE_MIN))`, keeping the spawn pin as a
second anchor, and re-run the same mutation to prove it now bites.

### The domains that came back clean, and what I actually checked in each

Recorded with their tags so "clean" is a result with evidence rather than a domain nobody opened.

- **[SILENT] No swallowed failure.** The diff adds one conjunct. There is no `try`, no `catch`, no
  `?? fallback`, no default-on-error and no early `return` introduced anywhere in it. The `&&`
  short-circuit is the only control flow added, and skipping `beamHit` when C_PV is clear discards
  no error — `beamHit` returns `number | null`, never throws, and its `null` was already a normal
  outcome. Nothing that previously reported a problem now stays quiet.

- **[SEC] No security surface exists in this change.** `src/core` is a pure deterministic
  simulation with no I/O, no DOM, no network, no filesystem, no persistence and no auth. I
  enumerated every function the diff touches — `computeStatus` is the only one — and it accepts no
  identity or credential, reads two numbers already in memory, and returns a bitfield. There is no
  untrusted input to sanitise, no secret to leak and no tenant to isolate. The two test files read
  source with `readFileSync` at fixed in-repo paths and write nothing.

- **[RULE] Every applicable project rule enumerated, no violation.** Full table in Rule Compliance
  below: core purity (no `shell/` import, no DOM, no wall clock, no `Math.random`), the comment-text
  purity regex, seeded-RNG discipline including the short-circuit's effect on draw ordering, ROM
  citations resolving against the vendored source, the comment-citation ceiling, and the
  no-writes-into-a-measured-tree rule. Checked exhaustively rather than by exemplar — every span in
  the diff was re-opened, not a representative one.

### Findings

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] [TEST] | The far-exit guard pins the wrong constant — mutation-proven green while the property is violated | `tests/core/tie-sights-visibility.test.ts` (the `FAR exit (:3828)` test) | Assert against `PLAY_CUBE_MIN`; mutation-prove the new assertion |
| [MEDIUM] [DOC] | `sim.ts` names as a failure mode ("the laser kills fighters the bit says are not there") what this story ships by design for off-glass fighters | `plugins/star-wars/src/core/sim.ts:151-158` | One sentence: the visibility divergence is separate, intended, and filed |
| [LOW] [DOC] | "Those four tests ARE C_PV's definition" asserts an identity; the relationship is the same near/far literals and the same ratio SHAPE, re-sloped to our glass by uf1-14 | `plugins/star-wars/src/core/tie-status.ts:296-297` | "…are the ROM's C_PV — the same near/far literals and the same per-axis ratio shape our C_PV ports, re-sloped to our glass by uf1-14" |
| [LOW] [DOC] | "C_PS sights bit is the first consumer" of `state.aspect` is incomplete — C_PV consumes it since uf1-14, and C_PS now reads it only through C_PV | `plugins/star-wars/src/core/state.ts:998` | Pre-existing (uf1-14, not this story). Note only |

### Rule Compliance

Rubric: `CLAUDE.md`, `plugins/star-wars/CLAUDE.md`. `.pennyfarthing/gates/lang-review/` carries no
TypeScript checklist in this repo, and there is no `SOUL.md` or `.claude/rules/`.

| Rule | Every governed item in the diff | Verdict |
|------|--------------------------------|---------|
| `src/core` is pure — no `shell/` import, no DOM, no `window`/`document`/`canvas` | The one changed core file, `tie-status.ts`: imports are `./tie-vm`, `./state`, `./gameRules`, `@shared/rng`, `@shared/math3d`. No shell import added. | compliant |
| No `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame` in core | The diff adds one `&&` term reading `status`; no call of any kind added. The existing `Math.tan`/`Math.sqrt` are pure. | compliant |
| The purity guard greps COMMENTS too (`/\bwindow\s*\./`) | ~35 new comment lines in `tie-status.ts`. Checked: no sentence ends on the word "window"; the suite's own boundary scan is green. | compliant |
| All randomness via the seeded `Rng` | The gate short-circuits BEFORE `beamHit`, which draws no RNG; the two `nextInt` calls sit after and remain unconditional, so no seed desync. The existing "costs no extra RNG" test is green. | compliant |
| ROM claims cite primary source, resolvable | Every span in the diff re-opened against the VENDORED `reference/atari-source/star-wars-1983/WSMAIN.MAC` — which `cmp` says is byte-identical to the greppable clone. `:3825-3826`, `:3827-3828`, `:3834-3836`, `:3840-3842`, `:3754`, `:3846`, `:3930`, `:3933`, `:3926-3928`, `:3915-3918`, `:3870-3873` all read as quoted. | compliant |
| Comment citations must resolve (`check-comment-citations`) | Tree-wide count 29 — the delivered ceiling — with 0 from any of the three touched files. | compliant |
| Tests must not write into a tree another suite measures | The new suite touches no filesystem; the only reads are `readFileSync` of two source files. | compliant |
| Tenant isolation / auth / secrets | No such surface exists in this diff: a pure sim function reading two numbers from an in-memory struct. Enumerated all changed functions — `computeStatus` is the only one, and it takes no identity, performs no I/O, and returns a bitfield. | N/A |

### Devil's Advocate

Let me try to break it. The gate is `(status & Status.C_PV) !== 0 && beamHit(...)`, and it reads
`status` — a local accumulated in statement order. That is a hidden temporal coupling: the C_PV
block must run above. Today it does, at `:249-251`, forty lines up. Move the C_PS block above it, or
hoist C_PV into a later refactor, and the gate silently becomes always-false — C_PS dies entirely
and the loiter break never fires. Nothing in the code says "must stay below C_PV". Dev flagged this
and I confirm the risk is real; what saves it is that the failure is loud, not that it is prevented:
Dev's G4 mutant (gate forced always-false) reddens 16 tests, and my own reading of the in-play test
shows it asserts `visibleSighted > 0` and `enteredTwenty` BEFORE the zero it exists to check, so a
collapsed derivation fails on the control. I would still prefer a named local, and I am recording it
rather than requiring it because no AC asks for it and the coverage is genuine.

What would a confused user do? Play on a strangely-shaped canvas. I checked the degenerate end:
`aspect = 0` (a zero-width but non-zero-height element) and `aspect = NaN` both yield C_PV clear and
therefore, now, C_PS clear — where before this story C_PS would still have set. That IS a behaviour
change in a degenerate case. It is not a regression, and here is the evidence: the §6 fire gate at
`sim.ts:414` already reads `(status & Status.C_PV) !== 0`, so on such a canvas enemies already
could not shoot at all. The new coupling makes the sights bit degrade the same way the fire gate
already did, which is consistent rather than newly broken — and `shell/input.ts:45` guards the
zero-height case explicitly, so the only route in is a CSS width of exactly zero.

What about the ROM being read too generously? This is where I pushed hardest, because "the ROM says
so" is the strongest claim in the file and the least checkable by any gate. The load-bearing
inference is: C$PS is unreachable without C$PV, therefore gate ours the same way. I verified the
premise exhaustively — four exits, no label in the span, `86$` past the CHSET — but the inference
also needs OUR C_PV to be the right analogue of THEIRS, and it is not identical: the ROM's ratio
tests are ±45°, ours are the rendered frustum (uf1-14). That is deliberate and disclosed fifty lines
up, and it is the correct call — a bit that claims to say "the player can see it" must use the
player's actual glass. But the new paragraph asserts an identity where a re-sloped analogue is what
exists, and someone reading only that paragraph could "restore fidelity" by putting ±45° back and
undo uf1-14. That is the Low above, and it is the one I would most want reworded.

Finally, the tests. A narrowing story's greatest risk is a fix that narrows to nothing, and I
checked the controls are real rather than decorative: the sweep asserts `sighted > 0` AND
`inBandOffGlass > 0`, and the second counter is computed from `beamHit` independently of C_PS, so it
cannot be hollowed out by the very change under test. That is correct design. The one place the
suite over-promises is the far-exit guard, which I mutation-proved does not bite — and it is worth
noting *how* it hid: mutating `VIEW_FAR` DOES redden, but via the separate geometry-anchor test, so
a casual battery would score the far-exit guard as protected by someone else's assertion.

**Pattern observed:** positive controls placed before the negative assertion in the same test —
`tie-sights-visibility.test.ts` in-play block. Good pattern; it makes a collapsed derivation fail on
the control rather than pass the negative.

**Error handling:** no new failure path. Degenerate `aspect` degrades consistently with the
pre-existing fire gate (evidence above). `beamHit` still returns `null` behind the gun.

**Handoff:** To Ruby Rhod (SM) for finish-story. The four findings are prose and one test
assertion — none re-derives anything, all replacement text is supplied above, so they belong in a
`/pf-chore` at finish rather than a second review round (the mg1-5 / sw8-23 precedent). If the chore
does not land, the far-exit finding must be re-raised rather than quietly dropped.
## Impact Summary

**HAND-WRITTEN at finish.** The `sm-finish` preflight subagent was not spawned (this session's
instructions bar the Agent tool unless the user asks, and the user did not), so
`write_impact_summary_to_session()` never ran. It is absent or stale often enough that the
standing rule is to grep for it and rebuild it by hand either way — recorded here as what
happened, not as a property of the tool.

**One round. APPROVED on round 1.** No rejection, no rework loop, no round 2.

sw8-19 gates the C_PS sights bit on C_PV, so the clone can no longer report a fighter "in the
player's sights" that the player cannot see. The change is **one conjunct** in `computeStatus`
(`plugins/star-wars/src/core/tie-status.ts`) — and it is a transcription of the cabinet's control
flow, not an inference: `S2VW` (`WSMAIN.MAC:3755`) has exactly four exits before `CHSET C$PV`
(`:3846`), all long branches to `RTS1` at `:3754`, and between `:3846` and the tree's sole
`CHSET C$PS` at `:3930` there is **no label at all**. The sights bit is unreachable for an object
the cabinet did not draw.

**Observable effect, measured in play rather than argued:** the shipped uf1-12 loiter fixture spent
**30 of its 391 flight frames** sighting an off-glass fighter. Now zero — with `visibleSighted =
154` in the same run as the positive control, so the zero is an observed zero rather than a
collapsed derivation. TCH1DZ's loiter break (four C_PS gates, `tie-vm.ts:341-342`) can no longer
fire for a fighter that is not on screen.

**What the story did NOT change, deliberately:** the player's gun. `beamHit` still resolves
off-glass fighters, and `tie-sights-visibility.test.ts` pins that so it cannot change by accident.
Filed as **sw8-27**.

### Findings, and where each one went

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| 1 | MEDIUM [TEST] | The far-exit guard pinned `TIE_SPAWN_DISTANCE` while reachable depth is bounded by `PLAY_CUBE_MIN` — mutation-proven green while its named property was violated | **FIXED** in the finish chore (`fd96744`), and re-mutation-proven: the Reviewer's own `PLAY_CUBE_MIN = -33000` now reddens that test on its own assertion |
| 2 | MEDIUM [DOC] | `sim.ts` named as a failure mode what this story ships by design for off-glass fighters | **FIXED** (`fd96744`) — the paragraph now separates a stale aim ray (bug) from visibility (intended, filed) |
| 3 | LOW [DOC] | "Those four tests ARE C_PV's definition" asserts an identity where a re-sloped analogue exists; a reader could "restore fidelity" and undo uf1-14 | **FIXED** (`fd96744`), with the warning stated explicitly |
| 4 | LOW [DOC] | `state.ts` "C_PS is the first consumer" of `state.aspect` — pre-existing (uf1-14) | **FIXED** (`fd96744`) |
| 5 | TEA Gap | The GUN carries the same divergence | **FILED as sw8-27** (`d2b456c`), 3 pts, with Dev's datum that the fix is caller-side, not in `beamHit` |
| 6 | TEA Improvement | `tie-sights-status.test.ts`'s test name claims a draw-pass property it does not observe | **FIXED** (`fd96744`) — narrowed to what it proves |
| 7 | TEA Improvement | `tie-loiter-sights.test.ts` recorded this defect's geometry without recognising it | **FIXED** (`fd96744`) — cross-referenced |
| 8 | TEA Question | sw8-25's association defect reproduces during ordinary authoring | **APPENDED to sw8-25** (`d2b456c`), with a second occurrence found during this very chore |
| 9 | Dev Improvement | The gate reads `status`, so the C_PS block must stay below C_PV — nothing in the code says so | **FIXED** (`fd96744`) — the note, not the refactor; the Reviewer confirmed the risk is real and the failure loud |
| 10 | Dev Question | Re-verification of #5 | Folded into sw8-27 |

**Zero findings dropped, zero deferred without a home.** The Reviewer's handoff said "if the chore
does not land, the far-exit finding must be re-raised rather than quietly dropped." The chore landed.

### The Reviewer's FLAG on TEA's deviation is discharged by the fix, not by prose

The Reviewer accepted TEA's far-clamp deviation but flagged its stated rationale as false: *"if
either constant moves, this says so"* — the test pinned the wrong constant, so it did not. Rather
than annotate the deviation as wrong, the chore made the rationale **true**: the guard now asserts
`VIEW_FAR > |PLAY_CUBE_MIN|`, and the Reviewer's mutation now reddens it. The deviation entry above
is left as TEA wrote it, because as of this commit it describes what the test does.

### Gates, before and after the chore

| Gate | At review handoff | After the chore |
|------|-------------------|-----------------|
| `--project star-wars` | 2252 / 2252 | **2252 / 2252** (201 files) |
| `npm run lint` | 0 errors | **0 errors** |
| `npm run test:orchestrator` | 390 / 390 | **390 / 390** |
| comment-citation guard | 29 (the ceiling) | **29**, 0 from any touched file |

Nothing red is attributable to this story, and nothing red was inherited.

## SM Finish

### The chore was not free — the citation gate fired a third time, on me

Dev recorded that the citation gate fired on them twice and was right both times. It fired on this
chore too, and the accounting is worth keeping because the cause is structural rather than careless:
**an 11-line comment insertion at `sim.ts:159` shifted every line below it by 11**, and that broke
citations in three separate populations, only one of which the guard reports.

1. **Comment citations the guard sees** — 3 genuinely new, taking the tree-wide count 29 → 32.
2. **Bare `:N` spellings the guard does NOT see** — six more in the same comment blocks
   (`(:1122-1123)`, `(:1145-1150)`, `(:965-969)`). Re-anchoring only the visible ones would have
   left a comment where some numbers were correct and their neighbours silently wrong. All 11 were
   shifted by hand, each replacement asserting `count == 1` on its own line before writing.
3. **23 audit-findings `ours` citations** in `docs/audit/findings/*.json`, invisible to the comment
   guard entirely. Re-anchored by `tools/audit/reanchor-citations.mjs`; every shift was exactly +11
   (sim.ts) or +2 (state.ts), matching the two insertions, with **0 lost**.

**The measurement that made "0 from my files" evidence rather than an assertion:** the before-state
was captured from a `git worktree` at HEAD and diffed against the after-state, so pre-existing
staleness could not be credited to this chore. That mattered — of the 5 lines that LOOKED new, 2
were pre-existing stale citations whose *reported* target had merely shifted by 11
(`coaching-clears-on-death.test.ts`, `tie-waves-past-plan.test.ts`). Counting those as mine would
have made the chore look like it introduced defects it did not.

### One recovery worth recording: `git stash` is the wrong tool in this repo

Reaching for `git stash push -- plugins/star-wars` to capture the before-state failed on a path
prefix (the shell's cwd was inside the plugin), and the follow-up `git stash pop` then popped an
**unrelated pre-existing stash** — `stash@{0}`, a WIP from an old rb2-4 session — leaving
`sprint/archive/epic-rb2.yaml` in conflict. Recovered with `git checkout HEAD -- <path>`; the stash
list still holds its original 4 entries and my own edits were never stashed. **This checkout carries
4 parked stashes, so `stash pop` is never safe here as a scratch mechanism.** A `git worktree` at
HEAD does the same job with no shared mutable state, and is what the measurement above used.

### Board state at finish

- `git fetch --prune --tags`; `main` level with `origin/main` at start.
- `gh pr list --state open` → **empty**. Merge gate clear.
- Sibling checkouts: `a-3` holds `cp6-2`. No sw8 story is open anywhere else.
- `origin/feat/sw8-19-gate-c-ps-on-c-pv` — the claim marker — is **0 commits ahead** of `main`
  (7 behind). Deleted at finish, as the setup note instructed.
- **`archive_epics` will sweep nothing:** no epic is 100% done (sw8 still has 5 backlog + sw8-27).
  Checked deliberately because that sweep has twice moved epic YAML out from under
  `tests/jt5-7-epic-yaml-truth.test.mjs` and reddened the orchestrator suite AFTER a clean
  pre-finish run.

### What was NOT done, and why

- **No subagent was spawned at any phase of this story**, finish included. The session's own
  instructions bar the Agent tool unless the user requests it. Stated as what happened on this run.
- **The 29 pre-existing stale citations were not swept.** That is sw8-24, a 5-point story that
  exists for exactly this. Fixing an arbitrary one or two of them mid-ceremony would have made the
  ratchet's baseline harder to reason about, not easier.
- **`sprint/archive/sprint-2628-completed.yaml`'s six rows missing `points`/`completed`** were left
  alone — a known historical data-loss bug with its own documented cleanup, not this finish's to
  repair. This story's own row is parsed after the finish to confirm it landed complete.
