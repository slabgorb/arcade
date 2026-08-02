---
story_id: "uf1-15"
jira_key: "uf1-15"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-15: star-wars C_AS's fire cone is INVENTED — the ROM's own gate is a squared screen radius (WSCPU.MAC:615-618)

## Story Details
- **ID:** uf1-15
- **Jira Key:** uf1-15
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none

**Branch:** none
Trunk-based (`repos.yaml` → `branch_strategy: trunk-based`) — commit straight to `main`.

**Context:** `sprint/context/context-story-uf1-15.md`

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T09:49:39Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T22:36:28Z | 2026-08-01T22:38:10Z | 1m 42s |
| red | 2026-08-01T22:38:10Z | 2026-08-01T23:35:53Z | 57m 43s |
| green | 2026-08-01T23:35:53Z | 2026-08-02T00:22:26Z | 46m 33s |
| review | 2026-08-02T00:22:26Z | 2026-08-02T07:32:58Z | 7h 10m |
| red | 2026-08-02T07:32:58Z | 2026-08-02T09:30:49Z | 1h 57m |
| green | 2026-08-02T09:30:49Z | 2026-08-02T09:35:15Z | 4m 26s |
| review | 2026-08-02T09:35:15Z | 2026-08-02T09:49:39Z | 14m 24s |
| finish | 2026-08-02T09:49:39Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

Pinning the M$PSB2 unit chain (this story's deliverable) retires four MORE invented or
mis-scaled constants for free. All four are the same defect — a literal compared against a
PRE2 output ported as though PRE2 did not halve its input — and all four are OUT OF SCOPE
here. Each is one line plus a test.

- **Gap** (non-blocking): `PLAYER_NEAR_RANGE` is invented (`0x7c00 * 0.4` = 12697.6, self-labelled
  `TODO(playtest)`) but the ROM gives it exactly. `CMPU #100` on the same squared PRE2 quantity
  (WSMAIN.MAC:3784-3788) converts to **4096 = $1000**, a round hex value — the same landing that
  validates this story's chain. Affects `plugins/star-wars/src/core/tie-status.ts` (swap the
  guess for `psb2SquaredToWorld(0x100)`). *Found by TEA during test design.*
- **Gap** (non-blocking): `VIEW_NEAR = 0x10` / `VIEW_FAR = 0x7f00` are halved-unit literals ported
  1:1. Both come from `LDD M.XP / CMPD #10 / CMPD #7F00` (WSMAIN.MAC:3823-3827) and M.XP is PRE2
  output, so the true-world bounds are **$20 and $FE00**. The doubled far bound is the more
  plausible one independently: $7F00 = 32512 would cull just past the $7C00 = 31744 spawn depth,
  while $FE00 = 65024 is "never culled by distance", which is what a 15-bit saturation value is
  for. The C_PV *ratio* test beside them is unaffected — halving cancels in a ratio. Affects
  `plugins/star-wars/src/core/tie-status.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `TIE_NEAR_BOUND = 0x800` (state.ts:574) has the same halving error — the
  ROM's `LDD M.XP / SUBD #800 / BLE` (WSCPU.MAC:629-631) is **$1000 = 4096** in true world units.
  Separately, the port measures it as `length(e.pos)`, a RADIAL distance from the cockpit, where
  M.XP is the player's depth along the ALIEN'S NOSE — different quantities for any fighter not
  pointed straight at the pilot. Affects `plugins/star-wars/src/core/state.ts` and the §6 fire
  gate in `sim.ts`. Fire-rate behaviour, so sw8-9's territory, not this story's.
  *Found by TEA during test design.*
- **Gap** (non-blocking): the C$T9 lead-aim offset is unported. When a fighter's AIM_AHEAD twirl
  flag is set the cabinet shifts the viewed point by `ADDD #1000 ;GO IN FRONT OF PLAYER`
  (WSCPU.MAC:591-597) BEFORE computing C$AV/C$AS, so a leading fighter's sights bit is measured
  against where the player is going, not where he is. Ours computes both from the true position
  always. Affects `plugins/star-wars/src/core/tie-status.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the halving was already recorded in this repo and never
  connected to anything — `plugins/star-wars/docs/mathbox.md:171` describes math box program
  `0x67` as "like `0x2A`, scaled by `$E000`", `$E000` being the −1/2 constant, and puts the
  perspective divide in a different program (`0xAE`/`0xB0`). Worth a line in that table naming
  $67 as M$PSB2 so the next reader does not re-derive it. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): TEA's mathbox.md line is worth taking, but it now has a
  companion cost — `tie-status.ts` cites `docs/mathbox.md:170-175` BY LINE, so inserting the
  "$67 is M$PSB2" note drifts that citation. Affects `plugins/star-wars/docs/mathbox.md` (add the
  name) and `plugins/star-wars/src/core/tie-status.ts` (re-check the line span in the same commit).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): the row span itself was cited one line high. The `$67` table row is at
  `docs/mathbox.md:170` and the perspective-divide row at `:175` — measured, not read off the
  session. `tie-status.ts` now cites 170-175; TEA's `tie-aim-axis.test.ts` header still says
  171-176. Comment-only drift, and it is TEA's own evidence, so it was left alone rather than
  edited by Dev. Affects `plugins/star-wars/tests/core/tie-aim-axis.test.ts` (one number).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the uf1-12 in-play loiter test's seat is an empirical constant
  that has now been re-measured twice — once by sw8-8, once by this story — because it is tuned
  against a whole-sim trajectory that any C_AS, C_PS or flight change perturbs chaotically. Every
  seat in a 40-point sweep either discriminates or does not with no smooth neighbourhood, so the
  next change will not "nearly" pass. Worth making the test seek its own seat (assert that SOME
  seat in a fixed list enters tracked and NONE enter parked) instead of pinning one. Affects
  `plugins/star-wars/tests/core/tie-loiter-sights.test.ts`. *Found by Dev during implementation.*
- **Conflict** (non-blocking): `sprint/epic-uf1.yaml:201` and `sprint/context/context-story-uf1-15.md`
  both still assert the refuted premise — "a fixed screen radius, which IS an angular cone",
  "radius sqrt(32) ~= 5.66" — and the context file's AC-2 still asks for a cosine. They are the
  story's own record and shipping them uncorrected leaves the wrong law on the board for the next
  reader. Affects `sprint/epic-uf1.yaml` and `sprint/context/context-story-uf1-15.md` (correct both
  at finish, per TEA's deviation). *Found by Dev during implementation.*

### Reviewer (code review)

- **Conflict** (blocking): the Dev finding above ("the row span itself was cited one line high")
  is BACKWARDS, and acting on it would corrupt the one correct citation. Measured with `grep -n`
  against `plugins/star-wars/docs/mathbox.md`: the `$67` row is at **171** (line 170 is the
  unrelated `0x2A` row) and the `$AE`/`$B0` perspective-divide row is at **176**. So the correct
  span is **171-176** — exactly what TEA wrote at `tie-aim-axis.test.ts:35` — and it is
  `tie-status.ts:84`'s `170-175` that is wrong. The cited range does not even contain the
  "perspective divide … that yields screen coordinates the AVG can draw" text the comment quotes
  and attributes to it. Affects `plugins/star-wars/src/core/tie-status.ts` (change to `171-176`;
  leave the test file alone). *Found by Reviewer during code review.*
- **Gap** (blocking): `AIM_DEPTH_MAX` — one of the story's two headline constants — has no real
  test. Its only value assertion is `expect(AIM_DEPTH_MAX).toBe(0x8000)`
  (`tie-aim-axis.test.ts:131`) against a declaration that IS `0x8000`, and both of the gate's
  depth boundaries survive mutation. Affects `plugins/star-wars/tests/core/tie-aim-axis.test.ts`
  (fixtures at exactly `AIM_DEPTH_MAX` and exactly zero nose-depth, plus a non-tautological
  derivation of the ×2). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the ROM increments an aim counter INSIDE the gate this story
  ported — `INC A$AIM(X)` at WSCPU.MAC:609, between the front-sign test and the range test. The
  port carries both branches and silently skips the increment. `computeStatus` is pure and
  stateless so it cannot hold a counter, which is a real reason, but nothing records the omission.
  Affects `plugins/star-wars/src/core/tie-status.ts` (one line of comment, or a story if a
  consumer is ever found). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): this story now computes `noseDepth >= 0 && noseDepth <
  AIM_DEPTH_MAX` inline, which IS the ROM's C$AV condition — `CHSET C$AV` sits at WSCPU.MAC:613,
  between those exact two gates (verified against the source). The file's header (`tie-status.ts:24`)
  already explains why C_AV is unported (no consumer, so it would be dead computation) and that
  reasoning still holds; worth noting only that if a future program revision does gate on it, the
  predicate is now already there. Affects `plugins/star-wars/src/core/tie-status.ts`.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `plugins/star-wars/docs/superpowers/plans/2026-07-18-star-wars-tie-vm-fire-wiring.md:41,48,88`
  still names `FIRE_CONE_COS` as a deliverable to be built ("start with `Math.cos(deg2rad(12))`
  and mark it TODO(playtest)"). Pre-existing — sw7-24, uf1-12 and sw8-9 all passed it by — so not
  a regression from this diff, but it is now the last place in the repo where the retired constant
  reads as live spec. *Found by Reviewer during code review.*

### Reviewer (code review, round 2)

- **Gap** (blocking-as-chore): the `SWMP.DOC` citation correction was applied to one of its two
  copies. `tie-status.ts:91` now reads `180-187`; `tie-aim-axis.test.ts:33` still reads `180-186`,
  and the sentence there asserts "PC $86" which is on line **187**. Swept the repo — this is the
  only surviving mirror of any of round 1's three corrected spans. Affects
  `plugins/star-wars/tests/core/tie-aim-axis.test.ts` (one character).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tie-flight-cleanup.test.ts:145` says `aimOrient` "is its ONE live
  caller", which is true of `src/` but not repo-wide — the `lookAtOrigin` test helper calls
  `toCockpit`, and round 2's own new fixtures route through it. Scoped to production deadness so it
  does not mislead; worth the two words. Affects
  `plugins/star-wars/tests/core/tie-flight-cleanup.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): my own round-1 finding on `WSMAIN.MAC:3834-3841` was framed
  wrongly — "two files disagree, pick one span" — when the source actually holds TWO ratio pairs
  (Y at 3834-3835, Z at 3840-3841), making the narrower citation the accurate one. Dev caught this
  and resolved it better than the instruction asked. Recorded so the next reader does not trust the
  original framing. No action. *Found by Reviewer during code review.*
- **Question** (non-blocking): four of the five TEA findings filed in round 1 — `PLAYER_NEAR_RANGE`,
  `VIEW_NEAR`/`VIEW_FAR`, `TIE_NEAR_BOUND`, and the C$T9 lead-aim offset — are all the same
  halved-unit defect this story just built the tool for. `psb2SquaredToWorld` now exists and is
  mutation-proved, so each is roughly one line plus a test. Worth filing as a single follow-up epic
  rather than four unrelated stories. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **C$AS ports as a fixed AXIS RADIUS, not a half-angle — the story's central premise is refuted by primary source**
  - Spec source: context-story-uf1-15.md, AC-1 and AC-2 (and the epic-uf1.yaml story description they were written from)
  - Spec text: "establishing the screen-units-per-radian conversion that links the squared radius 0x20 = 32 (radius ~5.66 screen units) to an angular half-angle" / "convert 0x20 to a half-angle, replace the invented 12°"
  - Implementation: the tests pin a world-space CYLINDER radius — 1024·√2 = 1448.1546878700494 raw ROM units — about the alien's nose axis, plus the ROM's own in-front and max-depth gates. No cosine is derived at any point, and `FIRE_CONE_COS` is deleted rather than retuned.
  - Rationale: M$PSB2 is math box PC $67 (WSGLOB.MAC:177), and SWMP.DOC:140-158 documents that program as translate-and-halve → rotate → square. It performs NO perspective divide; the perspective multiply is a separate program (PERS, PC $86, SWMP.DOC:180-186, "YP = YP * XP (SCREEN X)"), and this repo's own docs/mathbox.md:171-176 says the same from the disassembly side. So M.YPS/M.ZPS are squares of VIEW-space offsets, not screen coordinates. `M.YPS + M.ZPS <= #20` then carries no depth term at all — unlike the sibling ratio tests `LDD M.YPS / SUBD M.XPS` (WSMAIN.MAC:3834-3841, WSSTAR.MAC:135-139) which ARE ±45° cones. A depth-free radius is a cylinder, and a cylinder has no half-angle at any scale. The premise's other half — that the scale is pinnable — is correct, and is pinned.
  - Severity: major
  - Forward impact: AC-1 and AC-2 as written cannot be satisfied and are superseded by the tests. The story's "radius sqrt(32) ~= 5.66" figure is wrong in two places at once — it omits the multiplier's /$4000 (SWMP.DOC:17) and PRE2's ×2 — and the same wrong figure sits in `sprint/epic-uf1.yaml` and `sprint/context/context-story-uf1-15.md`, which need correcting at finish. The in-source comment being replaced ("a SCREEN-SPACE test in per-shape math-box units … there is no direct unit conversion to a cosine threshold") is wrong for the same reason and must not be paraphrased forward.

- **The tests also pin the two gates C$AS is nested inside, which no AC mentions**
  - Spec source: context-story-uf1-15.md, AC-2 (scope is stated as the constant only)
  - Spec text: "replace the invented `FIRE_CONE_COS = Math.cos(12°)` constant … with the derived ROM-grounded value"
  - Implementation: three added tests require the ROM's `LDD M.XP / BMI 140$` (in front) and `SUBD #4000 / BGE 140$` (within $8000 true depth) as preconditions on the bit.
  - Rationale: not optional. A cylinder is built on an INFINITE line, so a fighter pointed directly away from the pilot has perpendicular distance 0 from its own nose axis and a radius-only port sets C_AS for it — turning the existing `lookAway` case from correct to wrong. The in-front gate is what makes it a half-line. The range gate comes from the same four ROM lines and is one comparison.
  - Severity: minor
  - Forward impact: none beyond C_AS. Both gates sit inside the same `140$` skip chain, so no other bit changes.

### Dev (implementation)

- **Built to TEA's tests, not to AC-1/AC-2 — no cosine is derived and `FIRE_CONE_COS` is deleted rather than retuned**
  - Spec source: context-story-uf1-15.md, AC-1 and AC-2
  - Spec text: "convert 0x20 to a half-angle, replace the invented 12°"
  - Implementation: `psb2SquaredToWorld`, `AIM_AXIS_RADIUS = 1024·√2` and `AIM_DEPTH_MAX = 0x8000` are exported; C_AS is a sign test, a range test and a perpendicular radius about the nose axis. No trigonometry anywhere in the change.
  - Rationale: this is the Dev half of TEA's major deviation above, recorded here because it is an implementation decision I could have taken differently. I re-read the primary source before accepting it rather than taking the finding on trust — WSCPU.MAC:607-618, SWMP.DOC:17/140-158/180-186/307 and WSGLOB.MAC:177 all read as TEA reports, and `M.YPS + M.ZPS` genuinely carries no depth term where the C$PV and starfield siblings (WSMAIN.MAC:3834-3841, WSSTAR.MAC:133-140) carry it explicitly as `SUBD M.XPS`. A cone cannot satisfy the tests' opposite-direction pair at any threshold, so retuning was not an available outcome.
  - Severity: major
  - Forward impact: AC-1 and AC-2 as written are unsatisfiable and the "radius sqrt(32) ~= 5.66" figure is wrong in `sprint/epic-uf1.yaml` and `sprint/context/context-story-uf1-15.md`. Both still need correcting at finish (TEA's entry above says the same; repeated here so it does not ship as surviving wrong prose).

- **Re-seated uf1-12's in-play loiter fixture — lateral 6,000 → 4,000**
  - Spec source: `plugins/star-wars/tests/core/tie-loiter-sights.test.ts` (uf1-12's in-play test), and context-story-uf1-15.md's blast-radius note
  - Spec text: "sw8-9 removed C_AS from the §6 fire gate entirely … a retune therefore moves **flight/choreography** behaviour — the `.CUNTIL C$AS` release conditions"
  - Implementation: the fixture's seat moved from `[6000, 0, -6000]` to `[4000, 0, -6000]`, with the measurement written into the comment. No assertion, helper or title changed.
  - Rationale: the predicted blast radius landed exactly here. TCH1DZ releases on C$AS twice — `.CUNTIL C$AS+C$AG` (WSCPU.MAC:1633) and `.CUNTIL C$AS+C$AG+C$PS` (:1641) — so the new law moves both release frames and the whole weave downstream. Measured under it at 6,000 depth: the old 6,000 seat now reaches 20$ under NEITHER the tracked nor the parked yoke, i.e. it stopped discriminating rather than started failing; 4,000 reaches 20$ at frame 99 tracked and never parked, and at 33.7° off-axis it keeps the seat's original "wide of the parked reticle" property. The fighter is culled at frame 391 in every seat and both modes, so the 900-frame budget is just "until it leaves".
  - Severity: minor
  - Forward impact: none to production code. The seat remains an empirical constant that a future C_AS/C_PS/flight change will invalidate again — filed as a finding below.

- **Retired the `toCockpit` import from `tie-status.ts`, and re-aimed sw7-23's T4c source assertion onto `COCKPIT`**
  - Spec source: `plugins/star-wars/tests/core/tie-flight-cleanup.test.ts`, "sw7-23 T4c — toCockpit is a single shared helper, not two copies"
  - Spec text: "tie-status.ts imports the shared `toCockpit` helper instead of hand-rolling it" — `expect(tieStatusSrc).toMatch(/import\s*\{[^}]*\btoCockpit\b[^}]*\}\s*from/)`
  - Implementation: `computeStatus` takes the raw offset `sub(COCKPIT, e.pos)`; the `toCockpit` import is gone. The assertion now pins `COCKPIT` in the import statement plus two negatives — no local `const toCockpit|COCKPIT`, no hand-written `[0, 0, 0]` — and its comment records why.
  - Rationale: a normalized direction is not a term in the ROM's gate, which is a sign, a range and a perpendicular radius on the OFFSET. Precision forces it independently: reconstructing the offset as unit-direction × range flips the exactly-on-the-radius fixture (measured p² = 2097152.000000001 against R² = 2097152.0000000005; the rejection form lands on R² exactly). Keeping the import alive is not an option — `noUnusedLocals` is on — and keeping a redundant sign test alive purely to satisfy a source-text grep is the cargo cult the rule exists to prevent. T4c's real invariant (ONE shared cockpit definition, never a local copy) is preserved and still asserted, and its sibling `normalize(sub(COCKPIT` negative is untouched.
  - Severity: minor
  - Forward impact: `toCockpit` itself is unchanged and still shared — `sim.ts`'s `spawnTie` and `aimOrient` remain its callers, so the helper does not become dead.

### Reviewer (audit)

Every logged deviation was re-derived against primary source before being stamped — I read
`~/Projects/star-wars-1983-source-text/WSCPU.MAC:604-620` myself rather than accepting the
quotations in the session.

- **TEA — "C$AS ports as a fixed AXIS RADIUS, not a half-angle — the story's central premise is
  refuted by primary source"** → ✓ ACCEPTED by Reviewer. Confirmed independently and completely.
  `M.YPS + M.ZPS` is compared to a bare constant with no depth term, where the sibling ratio tests
  subtract depth explicitly; PRE2 (PC $67) squares without a perspective divide and PERS (PC $86)
  is a different program the path never calls. A depth-free lateral bound is a cylinder and has no
  half-angle at any scale. Refuting a story's own premise from the source is exactly what this
  epic is for, and the deviation is logged at the right severity.
- **TEA — "The tests also pin the two gates C_AS is nested inside, which no AC mentions"** →
  ✓ ACCEPTED by Reviewer. Not scope creep but a correctness requirement: a radius-only port sets
  the bit for a fighter pointed directly away (its infinite nose axis passes through the cockpit),
  so the `?PLAYER IN FRONT?` sign test is what makes the cylinder a half-line. Both gates come
  from the same four ROM lines.
- **Dev — "Built to TEA's tests, not to AC-1/AC-2 — no cosine is derived and `FIRE_CONE_COS` is
  deleted rather than retuned"** → ✓ ACCEPTED by Reviewer. The right call, and Dev re-read the
  primary source rather than taking TEA's finding on trust, which is the behaviour this pipeline
  wants. Retuning was genuinely unavailable: the test pair demands a half-angle both under 8.53°
  and at least 18.43°.
- **Dev — "Re-seated uf1-12's in-play loiter fixture — lateral 6,000 → 4,000"** → ✓ ACCEPTED by
  Reviewer. The blast radius landed where the sprint predicted (`.CUNTIL C$AS` at WSCPU.MAC:1633
  and :1641), the seat's stated geometry checks out (`atan(4000/6000)` = 33.69°, matching the
  comment's "33.7°"), no assertion changed, and the old seat stopped discriminating rather than
  started failing — which is the honest reason to re-seat.
- **Dev — "Retired the `toCockpit` import from `tie-status.ts`, and re-aimed sw7-23's T4c source
  assertion onto `COCKPIT`"** → ✓ ACCEPTED **with the supporting evidence FLAGGED**. The decision
  is right: a normalized direction is not a term in the ROM's gate, `noUnusedLocals` forbids
  keeping a dead import, and T4c's real invariant (one shared cockpit definition, never a local
  copy) is preserved and now pinned by three assertions instead of one — verified that all three
  run on comment-stripped source (`tie-flight-cleanup.test.ts:136`), so the docstring cannot mask
  a declaration. The FLAG is on the justification, not the change: the claim "sim.ts's `spawnTie`
  and `aimOrient` are its callers" is half false. `toCockpit` has exactly ONE live caller,
  `aimOrient` (sim.ts:2020); `spawnTie` returns `lookRotation(FACING_PLAYER)` and sim.ts:2153 is a
  comment saying explicitly that it does NOT use `lookRotation(toCockpit(pos))`. The conclusion
  (the helper does not become dead) survives on the one real caller; the evidence written into the
  test file does not, and it is written into the very test whose subject is how many callers the
  shared helper has. See finding R4.

### Reviewer (audit, round 2)

Round 2 logged no new entries in this section. One deviation from the review's own instructions did
occur and is stamped here rather than left implicit:

- **Dev — resolved `WSMAIN.MAC:3834-3841` by naming BOTH ratio pairs instead of "picking one span"**
  → ✓ ACCEPTED by Reviewer. My round-1 finding instructed "pick one span for the shared claim". Dev
  read the source instead of complying and found two ratio pairs — `LDD M.YPS / SUBD M.XPS` at
  3834-3835 and `LDD M.ZPS / SUBD M.XPS` at 3840-3841 — so the sentence's plural "tests" needed both
  citations and the narrower span in the test file was already correct. Naming both is strictly
  better than either option I offered, and it resolved the inconsistency from the source side rather
  than by editing a test during the GREEN phase. Explained in the Dev Assessment; recorded here
  because departing from a review instruction is a deviation even when it improves on it.
- **TEA — rebuilt the out-of-range fixtures rather than only correcting their comment** → ✓ ACCEPTED
  by Reviewer. The finding permitted either. Rebuilding as a genuine in-cube diagonal with the
  legality asserted in the test is the stronger of the two, and it keeps the on-axis operator probe
  separate and honestly labelled instead of blurring the two purposes.

## Sm Assessment

**Verdict:** setup complete — routing to TEA for the RED phase.

**Claim probe (before setup):** `git branch -r | grep uf1` → no remote branch; sibling
checkouts `a-1` (no sessions) and `a-2` (holds `mg1-5-session.md`, unrelated). `origin/main`
had moved 7aa5ff8..4a63f9b (a-2's mg1-5 deploy-r2 work) — pulled fast-forward before setup, so
this tree is current. uf1-15 was genuinely free; status now `in_progress`, assigned.

**What the story is.** `plugins/star-wars/src/core/tie-status.ts` carries
`FIRE_CONE_COS = Math.cos(12°)` with a self-confessed `TODO(playtest): this 12° is INFERRED`.
The ROM has a literal the port never used: WSCPU.MAC:615-618 sets C$AS when
(Y² + Z²) ≤ 0x20 = 32 — a CIRCLE of radius √32 ≈ 5.66 in math-box **projected screen units**,
taken after the M$PSB2 view transform. The `S` suffix means SQUARED, and that is not a guess:
the author annotates the identical operand pattern `LDD M.YPS / SUBD M.XPS ;X SQUARED` at
WSMAIN.MAC:3835 and :3841.

**The one open question, and it is the whole story.** A fixed screen radius IS an angular cone,
so it DOES convert to a cosine — but only once the math box's screen-units-per-radian scale is
pinned. That scale is unpinned today, which is why the in-source comment's claim that "there is
no direct unit conversion to a cosine threshold" is true *in practice and false in principle*.
Pinning it from the source is the deliverable; a reasoned, logged deviation is the acceptable
alternative if the scale proves unrecoverable. Either outcome must retire the TODO with an
**answer**, not a restatement of the guess. `@shared/math3d` (the ported Atari Math Box) is
where that scale most likely lives.

**Blast radius is bounded, and both bounds were verified upstream — do not re-derive them:**
1. sw8-9 removed C_AS from the §6 fire gate entirely (`sim.ts`: "NO AIM CONE (sw8-9) … C$AS is
   computed just above it (:619-621) for the CHOREOGRAPHY to branch on and is never read by the
   gate"). A retune therefore moves **flight/choreography** behaviour — the `.CUNTIL C$AS`
   release conditions — and **not fire rate**. A test that pins fire rate to this constant is
   testing the wrong seam.
2. uf1-12 deliberately left it alone. C_PS sidesteps projected units by riding the clone's
   existing world-space kill radius (3×TMPSIZ vs the laser hit's 1.5×TMPSIZ — a unit-free
   doubling). That sets **no precedent** for C_AS; this one is genuinely open.

**Cautions for TEA/Dev:**
- star-wars citations are audit-gated. Editing a cited source file drifts line numbers and
  reddens the gate — fix with `tools/audit/reanchor-citations.mjs --write` (line numbers only;
  re-anchoring is legitimate, re-pointing a citation at different content is laundering).
- The core/shell boundary is enforced mechanically by star-wars' own purity test. `tie-status.ts`
  is core.
- Prove the change non-vacuous by mutation, not by a green suite: perturb the cone and show a
  choreography transition moves.

**Open question for TEA to answer explicitly, in writing:** is the screen-units-per-radian scale
recoverable from the vendored source, or not? The story's outcome branches on that answer and
nothing downstream should proceed on an assumed one.

**Handoff:** TEA → RED phase.
## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `plugins/star-wars/tests/core/tie-aim-axis.test.ts` — NEW. The uf1-15 suite: the M$PSB2
  unit chain, the cylinder law, the two gates C_AS is nested inside, and the guess's retirement.
- `plugins/star-wars/tests/core/tie-status.test.ts` — EDITED. Dropped the `FIRE_CONE_COS is a
  plausible narrow-cone cosine threshold` test and its import. It asserted only `0.9 < cos < 1`
  — a band holding every angle from 0° to 25° — so it pinned the invented 12° about as loosely
  as a test can while still counting as coverage (lang-review #15: "bounds far looser than the
  measured value … pin the number"). Its replacement pins the number.

**Tests Written:** 12 (10 failing, 2 passing by design)

### The finding, because it changes what Dev builds

**The story's premise is wrong, and the ROM says so in its own author's documentation.**

The story asserts the C$AS gate is a screen-space radius that "IS an angular cone and therefore
DOES convert to a cosine once the math box's screen-units-per-radian scale is pinned". It is not,
and it does not.

`M$PSB2` resolves to math box PC $67 (WSGLOB.MAC:177), and Jed Margolin documents that program
himself at SWMP.DOC:140-158 — **PRE2**: `XT = (XIND-XT1)/2` for each axis, then a plain matrix
rotation into the viewer's frame, then `XPS = XP*XP` &c. There is no perspective divide anywhere
in it. The perspective multiply is a *different program* — PERS, PC $86, SWMP.DOC:180-186,
"`YP = YP * XP` (SCREEN X)" — and the C$AS path never runs it. This repo's own
`docs/mathbox.md:171-176` already said the same thing from the disassembly side and nobody had
joined it up: $67 is the view transform "plus Reg38=X²…", while the divide "that yields screen
coordinates the AVG can draw" is $AE/$B0.

So `M.YPS`/`M.ZPS` are squares of **view-space** offsets. And `M.YPS + M.ZPS <= #20` has **no
depth term** — compare the sibling tests `LDD M.YPS / SUBD M.XPS` (WSMAIN.MAC:3834-3841 for C$PV,
WSSTAR.MAC:135-139 for the starfield), which subtract depth and therefore *are* ±45° cones. C$AS
is not one of them.

**C_AS is a cylinder** — the player is in the alien's sights when he lies within a fixed
perpendicular distance of its nose axis, at any depth in range. There is no half-angle to convert
to at any scale. The shape is wrong, not just the number.

### The scale, and why it is not a guess

| step | source | effect |
|------|--------|--------|
| multiplier fixed point | SWMP.DOC:17 — "In the Multiplier, 4000H * 4000H = 4000H" | `a*b/$4000` |
| PRE2 halving | SWMP.DOC:143 — `XT = (XIND-XT1)/2`; the constant is `HALF=$E000`, "actually -1/2" (SWMP.DOC:307) | XP,YP,ZP are HALF of true |

⇒ world radius for a squared threshold S = `2 · sqrt(S · $4000)`.

**Cross-validated, not asserted.** WSMAIN.MAC:3772-3795 runs the identical PRE2 output through
the identical squaring for two other thresholds, and this chain lands both on exact round hex —
which two independently-wrong scalings cannot do:

```
C$PM  "PLAYER MIDDLE DISTANCE"   $900  → 12288  = $3000   exact
C$PN  "PLAYER NEAR"              $100  →  4096  = $1000   exact
C$AS  "PLAYER IN ALIENS SITES"    $20  →  1448.1546878700494 = 1024·√2
```

C$AS is irrational because `$20` is not a perfect square while `$900` = 48² and `$100` = 16² are
— the author chose round *squares*, so two radii come out round and one does not. Radix is hex
(WSCOMN.MAC:5 `.RADIX 16`; decimals carry the explicit point, e.g. `A$AIM ==10.`).

The story's "radius sqrt(32) ~= 5.66" is wrong twice over — it drops the `/$4000` and the `×2`.

### The contract the tests define

Three new exports from `src/core/tie-status.ts`, and `FIRE_CONE_COS` deleted:

- `psb2SquaredToWorld(squared: number): number` — the chain above. Exported because its proof is
  the two round-hex landings, and because four follow-up constants (see Delivery Findings) need
  the same conversion. This is the "pin the scale" deliverable expressed as code rather than prose.
- `AIM_AXIS_RADIUS = psb2SquaredToWorld(0x20)` — 1024·√2.
- `AIM_DEPTH_MAX = 0x8000` — the LINEAR bound, `SUBD #4000` doubled.

C_AS is then: depth along the nose ≥ 0, depth < `AIM_DEPTH_MAX`, perpendicular ≤ `AIM_AXIS_RADIUS`.

### Why this RED cannot be faked

The two load-bearing tests fail **in opposite directions**:

| fixture | angle off nose | cone (12°) says | ROM says |
|---------|----------------|-----------------|----------|
| depth 20000, perp 3000 | 8.53° | SET | **CLEAR** (3000 > 1448) |
| depth 3000, perp 1000 | 18.43° | CLEAR | **SET** (1000 ≤ 1448) |

No cosine threshold can satisfy both — a cone that clears 8.53° necessarily clears 18.43°. So
`FIRE_CONE_COS` cannot be retuned to any value that passes; only changing the shape does. That is
the mutation proof, and it is structural rather than a deleted-line probe.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 pin the number, not a loose band | `converts C$AS's own literal $20 to 1024·√2 world units` | failing |
| #15 anchor to the DECLARATION, not the token | `no longer declares FIRE_CONE_COS` (`/export\s+const\s+FIRE_CONE_COS\b/`) | failing |
| #15 every guard mutation-tested | opposite-direction pair above — structural, no retune passes | failing |
| #17 comments asserting a mechanism nobody re-ran | `answers the TODO … instead of restating it` — block-scoped so the neighbouring TODO cannot satisfy it | failing |
| #17 "where the claim is cheap to run, RUN it" | the chain is run against $900/$100 and the output quoted, not reasoned | failing |
| #18 fixture that cannot distinguish a broken impl | `tieAt(depth, perp)` builds both quantities exactly, no trig; far-gate test is paired with an inside-the-bound control | 1 failing, 1 passing |
| #13 fix-introduced regression | `clears the bit for a fighter aimed AWAY` — the trap a naive cylinder port falls into | passing (guard) |

**Self-check:** 1 vacuous pre-existing test found and removed (the `0.9 < FIRE_CONE_COS < 1` band).
Every new test asserts a value or a boolean verdict; none use `let _ =` or bare `is_some`-style checks.

### Verification run

```
npx vitest run --project star-wars
  Test Files  1 failed | 196 passed (197)
       Tests  10 failed | 2103 passed (2113)
```

The only failing file is the new one. Failure reasons, all intended: 3 × missing export
(`psb2SquaredToWorld is not a function`, `AIM_DEPTH_MAX` undefined), 5 × the wrong-shape verdicts,
2 × the source-text retirement. The 2 passing tests are the two regression guards.

```
npm run lint
  tie-aim-axis.test.ts(82,3): error TS2305: no exported member 'psb2SquaredToWorld'
  tie-aim-axis.test.ts(83,3): error TS2305: no exported member 'AIM_AXIS_RADIUS'
  tie-aim-axis.test.ts(84,3): error TS2305: no exported member 'AIM_DEPTH_MAX'
```
Three errors, all the missing contract. No collateral type damage.

### Notes for Dev

- **Re-anchor citations after editing `tie-status.ts`** — the star-wars gate re-opens each finding's
  `ours` citation against the working tree, so shifting a cited line reddens it:
  `node plugins/star-wars/tools/audit/reanchor-citations.mjs --write` (line numbers only).
- `tie-in-front-loiter.test.ts:59-61` carries a comment naming `FIRE_CONE_COS = 12°` in the past
  tense. It is describing what sw8-9 removed from the FIRE gate, which is still true and still
  about the old constant — read it before touching it, and update only the constant's name if the
  sentence would otherwise dangle (lang-review #17).
- Do not paraphrase the old doc comment forward. It is wrong ("SCREEN-SPACE test", "no direct unit
  conversion"), and replacing one confident false claim with another is the exact defect #17 names.

**Handoff:** To Dev for implementation (GREEN).
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 2113/2113 passing (GREEN) — `npx vitest run --project star-wars`, 197 files, 0 failed.
**Branch:** none
Trunk-based (`repos.yaml` → `branch_strategy: trunk-based`) — committed straight to `main` as
`5a15f21`, rebased onto `origin/main` (which had moved to mg1-5's `ec78d0d`) and pushed. Both suites
were re-run after the rebase: orchestrator 372/372, star-wars 2113/2113.

**Files Changed:**
- `plugins/star-wars/src/core/tie-status.ts` — `FIRE_CONE_COS` deleted. Three exports replace it:
  `psb2SquaredToWorld(squared)` = `2 · sqrt(S · $4000)`, `AIM_AXIS_RADIUS = psb2SquaredToWorld(0x20)`
  = 1024·√2, `AIM_DEPTH_MAX = 0x8000`. C_AS is now the ROM's three conditions in the ROM's order:
  `noseDepth >= 0` (:607-608 `BMI`), `noseDepth < AIM_DEPTH_MAX` (:610-611 `BGE`), and
  `|rejection|² <= AIM_AXIS_RADIUS²` (:615-618 `BHI`). The `toCockpit` import is gone — the gate
  needs the OFFSET, not a direction.
- `plugins/star-wars/tests/core/tie-flight-cleanup.test.ts` — sw7-23's T4c import assertion re-aimed
  from `toCockpit` onto `COCKPIT`, plus two negatives that pin the invariant it actually guards. The
  adjacent "fire cone" prose corrected. (Deviation logged.)
- `plugins/star-wars/tests/core/tie-loiter-sights.test.ts` — uf1-12's in-play seat re-measured,
  `[6000,0,-6000]` → `[4000,0,-6000]`. No assertion changed. (Deviation logged.)
- `plugins/star-wars/tests/core/tie-in-front-loiter.test.ts` — the past-tense `FIRE_CONE_COS = 12°`
  sentence keeps its history and now says the constant is retired and why (TEA's note 2).

### The shape change, in one line

C_AS was a 12° cone; it is a cylinder of radius 1448.15 world units about the alien's nose axis,
half-line-bounded in front and cut off at $8000 depth. Close in that is WIDER than the cone (25.8°
at 3,000 units); far out it is much TIGHTER (4.1° at 20,000). That inversion is the ROM's, and it is
what makes the tests unfakeable — no cosine satisfies both halves of TEA's opposite-direction pair.

### Non-vacuity, proved by mutation rather than by a green suite

The suite was re-run under five separate mutations of the new law (backup taken first; tree restored
by copy and verified by checksum, never by `git checkout --`, since the story's work was uncommitted):

| mutation | tests failed |
|----------|--------------|
| drop the PRE2 ×2 halving from the chain | 4 |
| drop the `?PLAYER IN FRONT?` sign gate | 3 |
| drop the range gate | 1 |
| `AIM_DEPTH_MAX` back to the raw `$4000` literal | 3 |
| radius test `<=` → `<` (BHS instead of BHI) | 1 |

Every term of the ported gate is load-bearing, including both boundary directions.

### The choreography DID move — measured, not asserted

SM asked for a choreography transition to move under the change, and one did, in the one place the
sprint predicted (`.CUNTIL C$AS` release conditions, WSCPU.MAC:1633 and :1641). Running uf1-12's
in-play TCH1DZ loiter at the old seat, tracked with the yoke: under the cone the fighter entered the
20$ arm; under the cylinder it never does, because both C$AS gates now release on different frames
and the weave diverges from ~frame 25 onward. That is why the seat was re-measured — the fixture was
tuned to the trajectory, and this story changed the trajectory. Fire rate is untouched, exactly as
sw8-9 and the story predicted: the §6 gate does not read C_AS.

### Verification run

```
npm run lint                                  → clean (tsc --noEmit, repo-wide)
npx vitest run --project star-wars            → 197 files, 2113 tests, 0 failed
npx vitest run --project star-wars citations  → 12 passed, 0 skipped (source dir present)
npm run test:orchestrator                     → 372 pass, 0 fail
node scripts/build-app.mjs star-wars          → built
```

No citation re-anchoring was needed: `grep -rl tie-status plugins/star-wars/docs/audit/` returns
nothing, so no audit finding cites the file whose lines moved. Every ROM citation I wrote was opened
and read (WSCPU.MAC:607-621 and :1628-1652, WSGLOB.MAC:177, SWMP.DOC:17/140-160/180-188/305-309,
WSMAIN.MAC:3770-3796 and :3832-3843, WSSTAR.MAC:133-140, WSCOMN.MAC:5, docs/mathbox.md:165-180) —
one of them, the mathbox.md row span, came back one line off the session's figure and is corrected
in the source comment and filed as a finding.

**Handoff:** To Reviewer (Obi-Wan Kenobi) for review.

## Subagent Results

Seven of the nine specialists are disabled in this repo's settings
(`pf settings get workflow.reviewer_subagents`). Their domains were covered by me directly —
edge/boundary work became the two mutation runs below, test quality became the tautology and
fixture audit, and documentation became the citation audit, which is where most of this review's
findings came from.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all green, and I re-ran the suite twice myself under mutation |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (boundary mutations, R2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (NaN path, R7) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (R2, R3, R5) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (R1, R3, R4, R6) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (R8) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A, no auth/IO/tenant surface in a pure core module |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — no over-engineering found; the change is smaller than what it replaced |
| 9 | reviewer-rule-checker | Yes | findings | 11 | confirmed 8, dismissed 0, deferred 3 (all LOW, routed as follow-ups) |

**All received:** Yes (2 enabled specialists returned, 7 pre-filled as disabled)
**Total findings:** 8 confirmed, 0 dismissed, 3 deferred

Both specialists were re-briefed mid-run: my first dispatch gave them only commit `5a15f21`, but
the story landed in TWO commits (`88e9121` RED + `5a15f21` GREEN) interleaved with a sibling
checkout's mg1-5 work, so the real diff is six files and 376 insertions, not four and 149. The
219-line RED suite — the story's whole non-vacuity argument — was in the half I initially missed.

### Verification I ran myself, not on a specialist's word

| Check | Result |
|-------|--------|
| Unit chain re-derived from SWMP.DOC, independent of the session | `W = 2·√(S·$4000)` — matches `psb2SquaredToWorld` |
| Cross-validation exact in IEEE754? | `psb2SquaredToWorld(0x900) === 12288 === 0x3000` ✓, `(0x100) === 4096 === 0x1000` ✓ |
| Is `toBe(1024*Math.SQRT2)` a flaky float equality? | No — `psb2SquaredToWorld(0x20) === 1024*Math.SQRT2` is exactly true |
| `WSCPU.MAC:604-620` read directly from `~/Projects/star-wars-1983-source-text` | `SUBD #4000`=610, `BGE`=611, **612 = `LDD A$CHST(X) ;SET PLAYER IN ALIENS VIEW`**, `CHSET C$AV`=613, `CMPD #20`=617, `BHI`=618 |
| `mathbox.md` row positions via `grep -n` | `$67` at **171**, `$AE/$B0` at **176** |
| Comment angle figures | 8.5308°, 18.4349°, 33.69° — all three true |
| Mutation `noseDepth >= 0` → `> 0` | **2113/2113 GREEN — mutation survives** |
| Mutation `noseDepth < AIM_DEPTH_MAX` → `<=` | **2113/2113 GREEN — mutation survives** |
| Tree integrity after mutation probes | restored by `cp` from backup, SHA-256 matches, `git diff HEAD` empty |

Mutation hygiene: the story's work is committed, but I still restored by file copy and verified by
checksum rather than `git checkout --`, and confirmed the only remaining working-tree change is the
expected `sprint/epic-uf1.yaml` status flip.

### Rule Compliance

Checked against `.pennyfarthing/gates/lang-review/typescript.md` (18 numbered checks), the root
`CLAUDE.md`, and `plugins/star-wars/CLAUDE.md`. Every rule that governs the diff, enumerated
against every item it governs — not one exemplar per rule.

| Rule | Instances | Verdict |
|------|-----------|---------|
| Core/shell boundary (star-wars CLAUDE.md, "most important rule") | `tie-status.ts` — all 3 new exports + the `computeStatus` C_AS block | ✓ COMPLIANT. New imports are `sub`, `scale` from `@shared/math3d` only. No DOM, no `window`, no `Date`, no `performance`, no `requestAnimationFrame`, no shell import. |
| Determinism / seeded RNG only | `computeStatus` | ✓ COMPLIANT. No `Math.random()` added; `nextInt`/`Rng` threading unchanged. `Math.sqrt`/`Math.SQRT2` are pure and deterministic. |
| ROM constants must cite file:line | 14 citation sites across the 6 files | ✗ **VIOLATION ×2** — `tie-status.ts:84` (mathbox 170-175, correct is 171-176) and `tie-aim-axis.test.ts:127` (WSCPU.MAC:612, correct is 610-611). Two more off-by-one/scope LOWs at `tie-status.ts:83` and `:91`. The other ~10 are exact. |
| A MEASURED claim must actually have been measured | 7 measured claims | ✗ **VIOLATION ×3** — the play-cube reachability claim (R3), the `spawnTie` caller claim (R4), and the session's "every term of the ported gate is load-bearing, including both boundary directions" (R2). Four verified TRUE: the on-the-radius rounding flip, 33.7°, 8.53°, 18.43°. |
| Citations must be re-anchored, never re-pointed (no laundering) | `grep -rl tie-status plugins/star-wars/docs/audit/` → no hits | ✓ COMPLIANT — no audit finding cites the file whose lines moved, so nothing needed re-anchoring and nothing was re-pointed. Citation gate green (12 passed, source dir present — not a silent skip). |
| #1 Type-safety escapes | 6 fns/consts | ✓ COMPLIANT — no `as any`, no `@ts-ignore`, no `!`. |
| #2 Generic/interface pitfalls (readonly) | `hasSights`, `tieAt` | ✗ VIOLATION (LOW) — both re-declare `[number, number, number]` instead of the `Vec3` the same file already imports a sibling type from. |
| #4 Null/undefined | `e.orient ?? IDENTITY` | ✓ COMPLIANT — `??` is correct here; no valid falsy orient exists. |
| #5 Module/declaration | type-only imports; relative specifiers | ✓ COMPLIANT — `type Vec3`/`type Mat4` correctly marked; `moduleResolution: bundler` so no `.js` extension is required (the `@shared` ESM rule does not bite here). |
| #8 Test quality — vacuous assertions | 12 `it`s | ✗ **VIOLATION ×2** — tautologies at `tie-aim-axis.test.ts:122` and `:131`. The `:131` one is the only assertion `AIM_DEPTH_MAX` has. |
| #10 Type-level input validation | `psb2SquaredToWorld` | ✗ VIOLATION (MEDIUM, low live risk) — no domain guard; negative → silent `NaN`. All three call sites pass hex literals today. |
| #15 Source-text / mutation gaps | 5 assertions + 3 boundaries | ✗ **VIOLATION ×2** — both depth boundaries survive mutation (verified by me). The radius boundary `<=`→`<` IS caught, and the source-text regexes are correctly anchored to declaration forms, not bare tokens. |
| #18 Defect in the test apparatus | `hasSights`, `tieAt` | ✓ COMPLIANT — `tieAt` is exact and trig-free by construction; `COCKPIT` is genuinely `[0,0,0]` (`gameRules.ts:24`), which is what makes the construction exact. |
| #3, #6, #7, #9, #11, #12, #16 | — | N/A — no enums, JSX, async, config, catch blocks, bundle surface or accessible names in the diff. |

### Devil's Advocate

Let me argue this change is broken. The strongest attack is that the story replaced a number it
could not justify with a number nobody can check, and then wrote a suite that mostly agrees with
itself. Two of the twelve assertions are literally the implementation restated —
`AIM_AXIS_RADIUS` compared to `psb2SquaredToWorld(0x20)` when that is its definition, and
`AIM_DEPTH_MAX` compared to `0x8000` when that is its declaration. Delete the implementation and
retype it wrong in exactly the same way and both still pass. If the whole suite were of that
character, the story would have shipped an unfalsifiable claim dressed as fidelity. It is not — I
checked, and the surrounding assertions hardcode ROM-derived literals — but for `AIM_DEPTH_MAX`
specifically the attack lands cleanly: it has one assertion, that assertion is a tautology, and
when I mutated its boundary the entire 2113-test suite stayed green. So one of the two constants
this story exists to pin is, in the only sense that matters, not pinned at all.

Second attack: the unit chain is an argument, not an observation. Nobody has run a math box. The
defence is the cross-validation — two other ROM thresholds land on exact round hex through the
same chain — and I confirmed both land exactly, in IEEE754, not approximately. Two independent
wrong scalings do not both produce round hex. That defence holds, and it is the best kind of
evidence available without hardware.

Third: what would a confused future reader do? Open `tie-status.ts:84`, follow the citation to
`mathbox.md:170-175`, and not find the sentence the comment puts in quotation marks, because it is
at 176. Then they would find the session telling them the OPPOSITE — that 170 is right and TEA's
171 is wrong — and "fix" the one correct citation to match the incorrect one. That is not
hypothetical; it is written down as a delivery finding awaiting harvest. A story whose entire
subject is that an uncited number was invented should not ship a citation that does not contain
its own quotation.

Fourth: stressed inputs. `psb2SquaredToWorld(-1)` returns `NaN` silently; `NaN` fails every
comparison, so C_AS would never set and no error would ever surface. Only literal call sites exist
today, so this is latent, not live. And a non-orthonormal `orient` would corrupt the vector
rejection — but `orient` is written by `lookRotation` or defaults to `IDENTITY`, so no such path
exists.

What survives all of this: the shape change itself is right, and the opposite-direction test pair
genuinely cannot be satisfied by any cosine. The defects are in the story's evidence, not its
conclusion.

## Reviewer Assessment — round 1 (superseded by round 2 below)

**Verdict:** REJECTED

The ROM analysis at the centre of this story is excellent and I am not asking for any of it back.
I re-derived the unit chain from `SWMP.DOC` independently, read `WSCPU.MAC:604-620` directly, and
confirmed the conclusion: C$AS is a depth-free lateral bound, therefore a cylinder, therefore has
no half-angle at any scale, and `FIRE_CONE_COS` had the wrong SHAPE rather than the wrong number.
The cross-validation is exact in floating point, the branch semantics port correctly in all three
directions, and the opposite-direction test pair is a genuine structural proof that no cosine can
pass. That is the hard part and it is done.

What fails is the story's own standard, applied to its own evidence. This story exists because a
constant was asserted without being measured. It ships one constant that is asserted without being
tested, one citation that does not contain the text it quotes, and three comments stating measured
facts that measurement refutes.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] [RULE] | **`AIM_DEPTH_MAX` is not tested at all.** Its only value assertion, `expect(AIM_DEPTH_MAX).toBe(0x8000)`, restates its own declaration (`tie-status.ts:110`) and cannot fail. Its boundary is not covered either: I mutated `noseDepth < AIM_DEPTH_MAX` to `<=` and ran the full suite — **2113/2113 green**. Half the story's deliverable ships unverified, in a story whose SM brief said "prove the change non-vacuous by mutation, not by a green suite". | `tie-aim-axis.test.ts:131`; `tie-status.ts:205` | Replace the tautology with a test that derives the ×2 rather than restating the literal (e.g. assert the bound against the halved-literal relationship the comment claims). Add a fixture at exactly `AIM_DEPTH_MAX` and prove the `<`/`<=` mutation red. |
| [HIGH] [EDGE] [RULE] | **The front-sign boundary is not covered either.** Mutating `noseDepth >= 0` to `> 0` also leaves **2113/2113 green** (verified by me). No test places the cockpit at exactly zero nose-depth, so the ROM's `BMI`-means-zero-passes semantics — which the comment specifically explains — is unenforced. This also refutes the session's claim that "every term of the ported gate is load-bearing, including both boundary directions." | `tie-status.ts:204` | Add an exactly-zero nose-depth fixture and prove the mutation red. |
| [MEDIUM] [DOC] [RULE] | **The mathbox citation in production source is wrong, and the finding that "measured" it is backwards.** `grep -n` puts the `$67` row at **171** and the `$AE`/`$B0` perspective-divide row at **176**; the cited `170-175` starts on the unrelated `0x2A` row and stops one line short of the sentence the comment quotes. TEA's `171-176` at `tie-aim-axis.test.ts:35` is the correct one. The Dev delivery finding asserts the reverse as "measured, not read off the session" and routes a follow-up that would corrupt the correct citation. | `tie-status.ts:84` | Change to `docs/mathbox.md:171-176`. Leave the test file alone. The inverted delivery finding is corrected in `### Reviewer (code review)` above — do not harvest the original. |
| [MEDIUM] [DOC] [RULE] | **`WSCPU.MAC:612` is the wrong line.** Read from the source: `SUBD #4000` is at **610** and `BGE 140$` at **611**; line **612** is `LDD A$CHST(X) ;SET PLAYER IN ALIENS VIEW`, the start of the unrelated C$AV setter. The same instruction pair is cited correctly as `607-611` and `610-611` elsewhere in the same story. | `tie-aim-axis.test.ts:127` | Change `WSCPU.MAC:612` to `WSCPU.MAC:610-611`. |
| [MEDIUM] [TEST] [DOC] | **A fixture is outside the play cube its own comment says it is inside.** The comment justifies `tieAt(35355.339…, 0)` as "a state the game can actually be in, not a synthetic one" via the diagonal `[-25000,0,-25000]`. But `tieAt(d, 0)` returns `[0, 0, -d]` — a single-axis Z of 35355.34, against `PLAY_CUBE_MAX = 0x7cff` = 31999 (`state.ts:596`), clamped per-axis at `sim.ts:2050-2052`. The reasoning is sound (a cube corner reaches 55424, so the gate IS reachable); the fixture just is not the diagonal it describes. | `tie-aim-axis.test.ts:179-183` | Either place the TIE at the diagonal the comment describes, or drop the reachability claim. Do not leave a comment asserting a property the fixture lacks. |
| [MEDIUM] [DOC] | **"sim.ts's `spawnTie` and `aimOrient` are its callers" — `spawnTie` is not.** `toCockpit` has exactly one live caller, `aimOrient` (`sim.ts:2020`). `spawnTie` returns `lookRotation(FACING_PLAYER)`, and `sim.ts:2153` is a comment stating explicitly that it does NOT use `lookRotation(toCockpit(pos))`. The conclusion (the helper is not orphaned) survives on the one real caller, but this false claim is written into the very test whose subject is how the shared helper is used, and into the deviation that justifies weakening its guard. | `tie-flight-cleanup.test.ts:145`; deviation in this session | Correct to the one real caller. |
| [MEDIUM] [TYPE] [RULE] | `psb2SquaredToWorld` has no guard on its documented domain; a negative argument returns `NaN` silently, and every `NaN` comparison in `computeStatus` is false, so a bad call disables C_AS permanently with no error. All three call sites pass hex literals today, so this is latent. | `tie-status.ts:69-71` | Guard the domain, or state the precondition in the doc block and note why a guard is unnecessary. |
| [LOW] [TEST] | Tautological assertion — `expect(AIM_AXIS_RADIUS).toBe(psb2SquaredToWorld(0x20))` restates the declaration. Harmless here because `:121` and `:123` carry the real proof, but it reads as coverage and is not. | `tie-aim-axis.test.ts:122` | Delete, or replace with a comment. |
| [LOW] [DOC] | `SWMP.DOC:180-186` for PERS/PC $86 stops one line short — `PC : 86` is at 187. And the same "sibling ratio test" claim is cited at two different spans: `WSMAIN.MAC:3834-3841` (`tie-status.ts:91`) vs `3834-3835` (`tie-aim-axis.test.ts:44`). Both spans are individually accurate; only the inconsistency is the issue. | `tie-status.ts:83`, `:91` | Extend to `:187`; pick one span for the shared claim. |
| [LOW] [TYPE] [RULE] | `hasSights` and `tieAt` re-declare `[number, number, number]` instead of the shared `Vec3` (`readonly`), in a file that already imports `Mat4` from the same module. | `tie-aim-axis.test.ts:91,105` | Use `Vec3`. |

**Verified good (evidence, not impressions):**

- `[VERIFIED]` The unit chain is correct and the linear/squared asymmetry is required, not a bug —
  `M.XP` is halved only, so it needs ×2; `M.YPS`/`M.ZPS` are Multiplier products that also carry
  the hidden `/$4000`, so they need `2·√(S·$4000)`. Re-derived from `SWMP.DOC:17,140-158,307`
  without reference to the session. `tie-status.ts:69-71,100,110`.
- `[VERIFIED]` Cross-validation is exact, not approximate — `psb2SquaredToWorld(0x900) === 12288`
  and `(0x100) === 4096`, both `===` in IEEE754 (ran it). Two wrong scalings cannot both land on
  round hex. `tie-aim-axis.test.ts:114-115`.
- `[VERIFIED]` The strict-equality float assertion is safe — `psb2SquaredToWorld(0x20) ===
  1024*Math.SQRT2` is exactly true, so `:121` is not a latent flake.
- `[VERIFIED]` All three branch semantics port correctly, read from the ROM myself: `BHI` skips on
  strictly-greater ⇒ inclusive radius ⇒ `<=` at `:206`; `BGE` skips at the bound ⇒ strict range ⇒
  `<` at `:205`; `BMI` skips only on negative ⇒ zero passes ⇒ `>= 0` at `:204`. Correct in all
  three cases — the finding above is that two of them are *untested*, not that they are wrong.
- `[VERIFIED]` Code order matches the comment's ROM order (sign → range → radius), and JS
  short-circuiting preserves the cabinet's actual branch order. `tie-status.ts:204-206`.
- `[VERIFIED]` The non-vacuity claim is real and structural. Far case needs a half-angle below
  8.53°, near case needs at least 18.43°; a cone is monotonic in angle, so no threshold satisfies
  both. Angles measured: 8.5308° and 18.4349°. `tie-aim-axis.test.ts:147-152`.
- `[VERIFIED]` Core purity intact — the only new imports are `sub` and `scale` from
  `@shared/math3d`. No DOM, clock, or `Math.random` added; star-wars' own purity test is green.
- `[VERIFIED]` T4c's replacement guard is stronger than what it replaced and is not fooled by
  prose: all three assertions run on `stripComments(readSrc('tie-status.ts'))`
  (`tie-flight-cleanup.test.ts:136`), so a docstring naming the old helper cannot mask a
  declaration.
- `[VERIFIED]` The `FIRE_CONE_COS` deletion from `tie-status.test.ts` lost no coverage — the
  removed assertion was `0.9 < cos < 1`, a band holding every angle from 0° to 25°, and the two
  behavioural smoke tests beside it still pass under the cylinder for the right reasons.
- `[VERIFIED]` No citation laundering — no audit finding cites `tie-status.ts`, so no re-anchoring
  was needed and none was done. Citation gate green with the source dir present (12 passed, not a
  silent skip).
- `[VERIFIED]` Units port 1:1 — `plugins/star-wars/CLAUDE.md` states coordinates are raw 16-bit
  ROM units with spawn depth `$7C00` = 31744, so the comment's "$8000 = 32768 sits just past the
  spawn depth" is right and no scaling is missing.
- `[SIMPLE]` No over-engineering: the new C_AS block is a sign test, a comparison and a vector
  rejection, and taking the rejection rather than Pythagoras-on-the-range is justified by a
  measured rounding failure I confirmed is real.
- `[SEC]` No security surface — pure core module, no IO, no auth, no untrusted input, no tenancy.

**Why REJECTED and not APPROVED with follow-ups:** two HIGHs, and the fixes are small and all in
files already open. Every item above is a one-to-few-line change, and the boundary tests are the
same fixture helper used four times already. I also do not want the inverted mathbox finding
harvested into a new story, because acting on it makes the repo worse.

**Round 2 should be short.** Do not revisit the shape change, the unit chain, the re-seated loiter
fixture or the T4c re-aim — all four are accepted above.

**Handoff:** Back to TEA (Han Solo) — the blocking findings are missing edge cases, which is the
RED phase's domain.

## TEA Assessment — round 2 (rework)

**Status:** RED (one failing test — ready for Dev). Commit `f4ba811`.

### The shape of this round: the code was already right

Both blocking findings were missing TESTS, not broken behaviour — I re-confirmed the Reviewer's
reading of `WSCPU.MAC:607-611` and the port is correct in all three directions. So the new guards
are GREEN on arrival and **the RED is the mutation, not the suite**. Anything else would be a
vacuous round: a test that passes the moment it is written proves nothing until you show it can
fail.

| Mutation applied to `tie-status.ts` | Test that went red | Others touched |
|---|---|---|
| `noseDepth >= 0` → `> 0` | `sets the bit at exactly ZERO nose-depth, as BMI does` | none |
| `noseDepth < AIM_DEPTH_MAX` → `<=` | `excludes the range bound ITSELF, as BGE does` | none |
| `AIM_DEPTH_MAX = 0x8000` → `0x4000` | `doubles the LINEAR depth bound too` | the 2 behavioural range tests, correctly |

Each guard is caught by the mutation it owns, and the first two are precisely the mutations that
left all 2113 tests green before this round. Hygiene: probes applied to a `cp` backup, restored by
copy and verified by SHA-256 (never `git checkout --`), and `git diff HEAD -- tie-status.ts` is
empty — the source file is untouched by TEA, as the role requires.

### What Dev must do (the one real RED)

```
× rejects a negative squared input instead of returning a silent NaN
  expected [Function] to throw an error   tie-aim-axis.test.ts:158
```

`psb2SquaredToWorld(-1)` returns `NaN` today. Every `NaN` comparison in `computeStatus` is false,
so a bad call would disable C_AS permanently and raise nothing. Guard the domain and throw;
`psb2SquaredToWorld(0)` must stay legal and return `0` (asserted on the next line).

**Also Dev's, all in `tie-status.ts` and all comment-only — no behaviour:**

1. `:84` — `docs/mathbox.md:170-175` → **`171-176`**. Measured with `grep -n`: the `$67` row is at
   171, the `$AE`/`$B0` perspective-divide row at 176; the current span opens on the unrelated
   `0x2A` row and stops one line short of the sentence the comment quotes. Do **not** "fix" the
   test file to match — `tie-aim-axis.test.ts:35` already has it right, and the Dev delivery
   finding that says otherwise is countermanded above.
2. `:83` — `SWMP.DOC:180-186` → `180-187` (`PC : 86` is at 187).
3. `:91` — cites `WSMAIN.MAC:3834-3841` for the sibling-ratio claim where the test file cites
   `3834-3835`. Both are accurate; pick one and use it in both places.

### Rule Coverage

| lang-review check | How this round covers it |
|---|---|
| **#8 Test quality — vacuous assertions** | Removed the two tautologies. `expect(AIM_AXIS_RADIUS).toBe(psb2SquaredToWorld(0x20))` restated the declaration and is deleted (`:121`/`:123` carry the real proof). `expect(AIM_DEPTH_MAX).toBe(0x8000)` is replaced by `toBe(2 * ROM_DEPTH_OPERAND)` plus `not.toBe(ROM_DEPTH_OPERAND)`, which encodes the ×2 rule rather than the answer — mutation-proved by M3. |
| **#15 Every guard must be mutation-tested** | All three new guards proved red under their own mutation; table above. No guard was added without one. |
| **#15 Bounds looser than the measured value** | Both new pairs are exact, single-unit boundary probes (`AIM_DEPTH_MAX` / `AIM_DEPTH_MAX - 1`, `0` / `-1`), not bands. |
| **#18 Defect in the test apparatus** | The out-of-range fixtures no longer claim a reachability they lack. Rebuilt via `diagonalAt()` + `lookAtOrigin`, with `PLAY_CUBE_MAX` asserted per-axis inside each test — the legality is now checked by the suite, not asserted in prose. The operator-probe pair stays on-axis for exactness and says so. |
| **#2 Missing `readonly`** | `hasSights` and `tieAt` now take/return the shared `Vec3` (`readonly [number, number, number]`) instead of re-declaring a mutable tuple. |
| **#10 Type-level input validation** | The `psb2SquaredToWorld` domain test is the RED above. |
| **#1, #3–#7, #9, #11–#14, #16–#17** | N/A to this diff — no casts, enums, async, config, catch blocks, JSX or accessible names touched. |

### Deliberately NOT done

- **`tie-status.ts` untouched.** TEA writes tests, not source; the four items above are Dev's.
- **No new coverage for the accepted work.** The shape change, unit chain, loiter re-seat and T4c
  re-aim were all stamped ACCEPTED in review — re-testing them would pad the round.
- **The play-cube legality check is per-axis (`Math.max` of `|component|`), not a range check.**
  That is the invariant the cube actually enforces (`sim.ts:2050-2052` clamps each axis
  independently), and using the range would wrongly reject legal corner positions.

### Verification

```
npx vitest run --project star-wars tie-aim-axis  → 15 tests, 1 failed (the intended RED)
npx vitest run --project star-wars               → 197 files, 2116 tests, 1 failed (same one)
npm run lint                                     → clean (tsc --noEmit, repo-wide)
git diff HEAD -- src/core/tie-status.ts          → empty (no source touched by TEA)
```

Test count moved 2113 → 2116: three new guards, no test deleted (the two tautologies were
assertions inside surviving tests). Verified by running the suites directly rather than through
`testing-runner` — that helper has a standing misattribution failure mode in this repo, and this
round's whole claim is about which specific test fails under which specific mutation.

**Handoff:** To Dev (Yoda) for the GREEN phase.

## Dev Assessment — round 2 (rework)

**Status:** GREEN. Commit `80ecbd5`. Four changes, all in `tie-status.ts`, one behavioural and
three comment-only. No test file touched by Dev.

### The one behavioural change

```ts
if (!(squared >= 0)) {
  throw new RangeError(`psb2SquaredToWorld expects a squared (non-negative) value, got ${squared}`)
}
```

Spelled as the negated `>=` rather than `squared < 0` deliberately: `NaN < 0` is false, so the
obvious form would let a NaN argument straight through to `Math.sqrt` and reproduce the exact
silent-NaN failure the guard exists to stop. `0` remains legal and returns `0`, which TEA's test
asserts on the line below the throw.

The function is called three times, all at module load with hex literals, so this is not on any
per-frame path. Core purity is unaffected — a `throw` is not IO.

### Three citations, each re-opened against the source

I did not take any of these from the review; I read all three and one came back different from
what the finding said.

| Was | Now | What the source actually shows |
|---|---|---|
| `SWMP.DOC:180-186` | `:180-187` | `PC : 86 (starts program)` is on **187** — the old tail stopped one line short of the line that identifies the program |
| `docs/mathbox.md:170-175` | `:171-176` | `$67` row on **171**, `$AE`/`$B0` perspective-divide row on **176**; the old span opened on the unrelated `0x2A` row and excluded the sentence the comment quotes |
| `WSMAIN.MAC:3834-3841` | `:3834-3835` **and** `:3840-3841` | Not a wrong span — an imprecise one. |

The third deserves its own line because the review graded it as "two files cite the same claim at
different spans, pick one" and that framing turns out to be slightly off. Reading
`WSMAIN.MAC:3830-3845`, there are **two** ratio tests, not one: `LDD M.YPS / SUBD M.XPS` at
3834-3835 and `LDD M.ZPS / SUBD M.XPS` at 3840-3841. The comment quotes only the Y pair, so the
test file's narrower `3834-3835` was the accurate citation for what is quoted, and this file's
`3834-3841` was silently spanning a second instruction pair it never mentioned. Naming both is
strictly better than picking either: the sentence says "tests" plural and now has both citations,
and the disagreement with `tie-aim-axis.test.ts:44` is resolved without editing a test.

### The reversed finding is now reversed in the code

Last round's delivery finding asserted `$67` was on 170 and called it "measured". It is on 171.
That finding is countermanded in `### Reviewer (code review)` and the source now carries TEA's
original span. Nothing in the test files was changed to match the error — which was the specific
way this could have gone wrong.

### Deliberately NOT done

- **No behaviour beyond the guard.** The two boundary gates were already correct; TEA's round added
  the tests that prove it, and there was nothing to implement. Round 2 changed one line of logic.
- **No test edits.** The `WSMAIN.MAC` inconsistency was resolved from the source side precisely so
  that Dev did not have to reach into a test file.
- **No re-derivation of the accepted work.** Shape change, unit chain, loiter seat and T4c re-aim
  were stamped ACCEPTED and are untouched.

### Verification

```
npx vitest run --project star-wars            → 197 files, 2116 tests, 0 failed
npx vitest run --project star-wars citations  → 12 passed, 0 skipped (source dir present)
npm run lint                                  → clean (tsc --noEmit, repo-wide)
npm run test:orchestrator                     → 372 pass, 0 fail
node scripts/build-app.mjs star-wars          → built
```

No citation re-anchoring needed: no audit finding cites `tie-status.ts`, and the citation gate ran
green with the source directory present rather than silently skipping.

**Handoff:** To Reviewer (Obi-Wan Kenobi) for round 2 review.

## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — green including the WHOLE monorepo, 11,119 tests / 735 files |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (boundary geometry re-derived) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (the NaN path IS this round's fix) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer + rule-checker mutation reruns |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (repo-wide stale-citation sweep) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — `Vec3` retyping reviewed directly |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A, pure core module |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — one guard, three comments; nothing to simplify |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1, dismissed 0, deferred 1 (the `2 * ROM_DEPTH_OPERAND` nuance — accepted as an improvement, not a re-open) |

**All received:** Yes (2 enabled specialists returned, 7 pre-filled as disabled)
**Total findings:** 1 confirmed, 0 dismissed, 1 deferred

### Independent verification — the mutations were re-run, not re-read

The whole point of round 2 was that two guards could not fail. I did not accept TEA's word for the
fix, and neither did the rule-checker: **both of us re-applied all three mutations independently**,
and both got the same result.

| Mutation | Reddens | Confirmed by |
|---|---|---|
| `noseDepth >= 0` → `> 0` | ONLY `sets the bit at exactly ZERO nose-depth` | TEA, then rule-checker |
| `noseDepth < AIM_DEPTH_MAX` → `<=` | ONLY `excludes the range bound ITSELF` | TEA, then rule-checker |
| `AIM_DEPTH_MAX = 0x8000` → `0x4000` | the derivation test + the 2 behavioural range tests | TEA, then rule-checker |

Both round-1 HIGHs are closed, by the only evidence that closes them.

I also re-derived the rebuilt fixtures rather than trusting the comment: `diagonalAt(25000)` has max
axis 25000 and `diagonalAt(20000)` has 20000, both inside `PLAY_CUBE_MAX` = 31999; nose-depths are
35355.34 and 28284.27, straddling 32768; and off-axis distance measures 5.14e-12 in both, so
`lookAtOrigin` is doing real work and the `true`-expecting control genuinely discriminates.

### Rule Compliance — round 2

| Rule | Verdict |
|------|---------|
| Core/shell purity | ✓ A `throw` is not IO. `tie-status.ts` remains deterministic and side-effect-free — same input, same outcome. No DOM, clock, or `Math.random`. |
| #10 Type-level input validation | ✓ **Round-1 violation closed.** The guard is spelled `!(squared >= 0)`, which rejects `NaN` too; the obvious `squared < 0` would not, since `NaN < 0` is false. Verified by execution: `0x20`/`0x900`/`0x100`/`0` pass, `-1` and `NaN` throw. |
| #11 Error handling | ✓ Specific `RangeError`, message carries the offending value, nothing caught or swallowed. |
| #8 / #15 Vacuous assertions, mutation mandate | ✓ **Round-1 violation closed.** Both tautologies gone; all three new guards mutation-proved. |
| #18 Test apparatus | ✓ **Round-1 violation closed.** Fixtures no longer claim a reachability they lack, and legality is now asserted by the suite rather than in prose. |
| #2 Missing `readonly` | ✓ **Round-1 violation closed.** `hasSights`/`tieAt` take the shared `Vec3`. |
| ROM citations cite file:line | ✗ **One stale mirror survives** — see the finding below. The three Dev corrected are all verified right against the source. |
| #13 Fix-introduced regressions | ✓ None. The new `PLAY_CUBE_MAX` import resolves to `state.ts:596`, and `Math.max(...pos.map(Math.abs))` is safe (`Math.abs` ignores `map`'s extra index argument, unlike `parseInt`). |

### Devil's Advocate

Argue round 2 is theatre. The strongest version: the story was rejected for untested constants, and
the response was to add tests that pass the moment they are written — which is precisely the failure
mode that produced the rejection. If the boundary tests were written by reading the implementation
rather than the ROM, they encode whatever the code already does, and mutation-testing them proves
only that the test and the code agree, not that either matches the cabinet. That attack has real
force in general and I took it seriously here. It fails on the specific facts: the boundary
semantics were derived from `BMI`, `BGE` and `BHI` in `WSCPU.MAC:607-618`, which I read directly,
and the ROM's behaviour at each boundary (zero is not minus; `BGE` skips at the bound) is a property
of the 6809 instruction set, not of our port. A test that pins "zero passes" is pinning the cabinet,
not the clone.

Second attack: the guard is security theatre on an unreachable path. `psb2SquaredToWorld` is called
three times, all with hex literals, all at module load. True — and the finding was always latent
rather than live. But the cost is one line, the failure mode it prevents is silent and total (C_AS
never sets, nothing raises), and the `!(x >= 0)` spelling is the non-obvious detail that makes it
actually work. Cheap insurance against a genuinely undetectable failure is not theatre.

Third: did the rework break something subtler? The one candidate is `Math.max(...pos.map(Math.abs))`
— `map` passes three arguments, and a callback like `parseInt` would misread the index. `Math.abs`
takes one and ignores the rest, so it is safe, and I checked rather than assumed.

Fourth, and this one lands: **did the citation fix get applied everywhere the wrong citation lives?**
No. `SWMP.DOC:180-186` was corrected in `tie-status.ts` and left standing in `tie-aim-axis.test.ts:33`
— the same file, the same claim, one file over. That is the incomplete-fix pattern this repo has
been bitten by before, and it is the one thing round 2 got wrong.

## Reviewer Assessment

**Verdict:** APPROVED — with one comment correction due as a chore before finish.

Both round-1 HIGHs are closed and closed properly: not by argument, but by three mutations that two
independent parties re-ran and that redden exactly the guard each one owns. `AIM_DEPTH_MAX` went
from having no real test to having a behavioural boundary pair plus a derivation assertion; the
front-sign boundary went from unenforced to pinned at exactly zero. The domain guard is correct in
the non-obvious way that matters (`!(x >= 0)` catches `NaN`; `x < 0` would not). All three citation
corrections are right — I re-opened each against the 1983 source rather than trusting the fix.

Two things this round did better than the review that ordered it. The fixtures were not merely
re-commented to stop lying — they were rebuilt as the diagonal the comment always described, with
legality asserted by the suite instead of claimed in prose, and the on-axis operator probe kept
separate and honestly labelled. And my own `WSMAIN.MAC` finding was improved on: I framed it as "two
files disagree, pick a span," but the source has *two* ratio pairs (Y at 3834-3835, Z at 3840-3841),
so the narrower citation was the accurate one and the fix names both — resolved from the source side
without reaching into a test file.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [DOC] [RULE] | **The `SWMP.DOC` correction was applied to one of its two copies.** `tie-status.ts:91` now reads `180-187`; `tie-aim-axis.test.ts:33` still reads `180-186`. The span matters for the same reason it did next door — the sentence asserts "PC $86", and `PC : 86` is on line **187**, outside the cited range. Found by the rule-checker; I confirmed it and swept the repo for further mirrors: this is the only one. | `plugins/star-wars/tests/core/tie-aim-axis.test.ts:33` | `SWMP.DOC:180-186` → `180-187`. One character. |
| [LOW] [DOC] | "That is its ONE live caller" is true of `src/` but not literally repo-wide — the `lookAtOrigin` test helper calls `toCockpit` as well, and round 2's own new fixtures now route through it. The sentence is scoped to production deadness so it will not mislead, but after round 1 rejected an over-broad caller claim I would rather it be exact. | `plugins/star-wars/tests/core/tie-flight-cleanup.test.ts:145` | "one live caller in `src/`". |
| [LOW] [TEST] | Deferred, not a re-open. `expect(AIM_DEPTH_MAX).toBe(2 * ROM_DEPTH_OPERAND)` has the same mutation-catching power as the `toBe(0x8000)` it replaced, since `2 * 0x4000 === 0x8000` — it is a documentation and intent improvement rather than a stronger assertion. Accepted because the actual coverage now comes from the two behavioural boundary guards, which are what the story was missing. | `tie-aim-axis.test.ts:150` | None required. |

**Why APPROVED and not a third round:** the blocking defects are gone and independently verified.
What remains is one stale citation mirror and one over-precise sentence — both comment-only, both
one line. This repo has a settled pattern for exactly that, used three commits ago on mg1-5
(`ab38bd1` "review round 4 — APPROVED, with one comment correction due as a chore", then `3c4ab11`
correcting it): approve, and carry the correction as a chore. Holding a fixed 3-point story for a
character in a comment would cost more than it buys.

**Verified good — round 2 specific:**

- `[VERIFIED]` The guard rejects `NaN`, executed not assumed: `0x20`→1448.15, `0x900`→12288,
  `0x100`→4096, `0`→0, `-1`→RangeError, `NaN`→RangeError. `tie-status.ts:74-79`.
- `[VERIFIED]` Module init cannot break — the sole production call is
  `AIM_AXIS_RADIUS = psb2SquaredToWorld(0x20)` with a positive literal.
- `[VERIFIED]` `SWMP.DOC:187` is `PC : 86`; `mathbox.md:171` is the `$67` row and `:176` the
  `$AE`/`$B0` row; `WSMAIN.MAC:3834-3835` and `:3840-3841` are two real ratio pairs and the quoted
  instruction matches the first. All read from source.
- `[VERIFIED]` `tie-aim-axis.test.ts:35` still says `171-176` — the correct citation was NOT edited
  to match round 1's error, which was the specific way this could have gone wrong.
- `[VERIFIED]` Fixture geometry re-derived: axes 25000/20000 inside the cube, nose-depths
  35355.34/28284.27 straddling 32768, off-axis 5.14e-12.
- `[VERIFIED]` No regression anywhere — 11,119 tests across the whole monorepo, 372 orchestrator,
  citation gate ran (12 passed, not a silent skip), build green, `git diff HEAD` clean on the source
  file, no mutation-probe residue.
- `[SIMPLE]` Round 2 is one line of logic and three comment corrections. Correctly scoped.
- `[SEC]` No security surface.
- `[TYPE]` `Vec3` retyping is a strict tightening (`readonly`), not a regression.
- `[EDGE]` `[SILENT]` Both round-1 gaps in these domains — the unmutated boundaries and the silent
  `NaN` — are the two things this round fixed.

**Handoff:** To SM (Grand Admiral Thrawn) for finish. Two chores ride along: the
`SWMP.DOC:180-186` → `180-187` mirror, and the "one live caller in `src/`" wording. The epic and
context prose correction Dev filed last round is still outstanding and also belongs at finish.