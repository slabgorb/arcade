---
story_id: "sw8-18"
jira_key: "sw8-18"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-18: Correct the sw8 ST.UX citation and prose defects from sw8-8 review rounds 2+3 -- 11 filed (4 since drifted) plus a 12th created by sw8-17 -- and add the comment-citation guard for the three a mechanical checker can catch

## Story Details
- **ID:** sw8-18
- **Jira Key:** sw8-18
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

> The branch field above is the documented escape hatch for a trunk-based story whose work
> lands on `main`. It is set proactively at setup because `pf sprint story finish` scrapes that
> labelled token by pattern from anywhere in the file and refuses when it cannot verify the
> value (jt8-3). `feat/sw8-18-stux-citation-corrections-and-comment-guard` exists as a CLAIM
> marker at zero commits ahead of `main`, so a sibling checkout's `git branch -r | grep sw8-18`
> probe sees this story is owned. Nothing merges it; delete it at finish once the count is 0.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T08:27:43Z
**Round-Trip Count:** 0

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T07:00:03Z | 2026-08-02T07:11:33Z | 11m 30s |
| red | 2026-08-02T07:11:33Z | 2026-08-02T07:40:46Z | 29m 13s |
| green | 2026-08-02T07:40:46Z | 2026-08-02T08:11:30Z | 30m 44s |
| review | 2026-08-02T08:11:30Z | 2026-08-02T08:27:43Z | 16m 13s |
| finish | 2026-08-02T08:27:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup)

- **Conflict** (RESOLVED at setup, but read it — it is the story's own thesis biting live):
  **uf1-15 moved this story's `tie-status.ts` anchor while setup was in progress.** I filed this
  as a prediction when its RED tests (`88e9121`) turned the baseline red; its GREEN
  (`5a15f21 feat(uf1-15): C_AS is the ROM's nose-axis cylinder, not an invented 12° cone`)
  landed in the sibling race that rejected my first push, roughly fifteen minutes later.
  The "never a camera" site moved **:143-144 → :223** (+79). `:14` is above the edits and did
  not move. Every anchor in the context file was re-measured AFTER that commit and the ACs were
  rewritten against the new numbers, so what TEA has is current as of `e42fc50`. The standing
  instruction survives regardless: **re-verify immediately before editing.** This story has now
  had its citations invalidated by a sibling commit once, during setup, which is exactly the
  failure mode it exists to fix. Affects `plugins/star-wars/src/core/tie-status.ts`.
  *Found by SM while attributing the baseline suite; confirmed by the race.*

- **Improvement** (non-blocking): the first condensation sweep used a case-SENSITIVE
  `only reader` and missed `tests/shell/render.space-camera.test.ts:13`, which capitalises it as
  `ONLY reader`. Found on the re-measure; the count went 9 → 10 locations and AC2 now names all
  of them. Sweep case-insensitively when verifying AC2 — a case-sensitive check will report the
  story complete while a site survives. Affects the AC2 verification method.
  *Found by SM while re-measuring after the uf1-15 race.*

### TEA (test design)

- **Gap** (non-blocking, blocking-for-the-epic): **star-wars carries ~146 stale citations
  beyond this story's twelve**, measured by the new guard over `src`, `tests` and
  `docs/superpowers/specs`: 57 dangling file references, 7 out-of-range spans, 82 verbatim
  mismatches. A meaningful share of the dangling ones are RESOLVER gaps rather than defects
  (`math3d.ts`, `loop.ts`, `rng.ts` are `@shared/*` at `src/shared/`; `vite.config.ts` and
  `sprint/**` are at the monorepo root), so the true defect count is lower — but roughly a
  dozen dangling and most of the 82 look genuine. This story hard-gates only its own 11
  files and ratchets the rest. The sweep needs its own story, and the guard now makes it
  mechanical: it re-locates every anchor it rejects. Affects `plugins/star-wars/**`
  (a citation sweep, then lower the ratchet in `tests/audit/comment-citations.test.ts`).
  *Found by TEA during test design.*

- **Improvement** (non-blocking): the guard is plugin-scoped, but nothing about it is
  star-wars-specific — the other six games and the lobby carry the same comment style and
  the same `<file>:<span>` habit, and none of them has any citation gate at all. Answering
  SM's open cabinet-wide question with a number will need the resolver taught about
  `@shared` and the monorepo root first. Affects `plugins/*/` (a cabinet-wide sweep story).
  *Found by TEA during test design.*

- **Question** (non-blocking): `render.space-camera.test.ts:13` writes the sole-readership
  claim as "the ONLY reader", and my first sweep — case-sensitive — missed it, exactly as
  SM's own count did (9 → 10). AC2 now mandates a case-insensitive check. Worth asking
  whether the epic's other doc ACs were verified case-sensitively too. Affects
  `plugins/star-wars/tests/**`. *Found by TEA during test design.*

- **Question** (non-blocking): should the comment-citation guard run cabinet-wide, or only over
  `plugins/star-wars`? Every other game carries the same comment style and the same class of
  embedded span, so a cabinet-wide scan is the version that actually prevents recurrence — but
  the blast radius is seven games plus the lobby and nothing has measured how many stale spans
  are out there. Scoped to star-wars in AC5 deliberately. Raise it with a count rather than
  widening silently. Affects `plugins/star-wars/tools/audit/`.
  *Found by SM during setup measurement.*

### Dev (implementation)

- **Improvement** (non-blocking): the guard's tree-wide count fell **146 → 35**, of which
  **calibration accounts for 146 → 49 and the comment edits for 49 → 35** (CORRECTED at finish —
  this originally claimed none of the drop was an edit). Calibration still dominates (delimiter
  pairing, the whitespace requirement on quotes, assembler-predominance for ROM targets,
  emphasis-stripping keyed on file type, single-line-anchors-a-run). The AC5 ratchet is therefore
  set ~4x above where the tree actually sits. Lower it to 35 when the sweep story runs, or a
  regression of a hundred stale citations would pass. Affects
  `plugins/star-wars/tests/audit/comment-citations.test.ts` (the `toBeLessThanOrEqual(146)`).
  *Found by Dev during implementation.*

- **Gap** (non-blocking): the guard's relocation hint is FIRST-OCCURRENCE, so it can point at the
  wrong routine when the quoted text repeats. `state.ts` cites `ADDD M$TX+M.S1` for S1MVBS and the
  hint suggested :2539 — which is S1MVGD, a different routine; the right answer was :2656. Same
  trap the existing `check-citations.mjs` has with non-unique verbatims (`damage++` occurs three
  times in sim.ts). The hint is a lead, not an answer, and the module should probably say so.
  Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs` (prefer a match inside the
  cited routine, or report all candidates). *Found by Dev during implementation.*

- **Question** (non-blocking): ~35 stale citations remain plugin-wide and several are the same
  migration artefact — `math3d.ts:607-618` style spans pointing at a pre-migration file, and
  references to `context-story-8-3.md` / `.session/8-6-session.md` paths that moved when the nine
  repos collapsed. Those are mechanically fixable as a group and might make the sweep story much
  smaller than its count suggests. Affects `plugins/star-wars/**`.
  *Found by Dev during implementation.*


### Reviewer (code review)

- **Improvement** (blocking-before-finish, NOT a rework): the claim "146 → 35, and not one of that
  drop was a comment edit" is false — the final checker against the pre-story tree (`8b0666b`)
  reports **49**, so calibration is 146 → 49 and comment edits are 49 → 35. It appears in the
  commit message `07b2e58`, the Dev Assessment, a Dev Delivery Finding, and
  `.pennyfarthing/sidecars/dev/gotchas.md`. **SM: apply the verified replacement in the Reviewer
  Assessment via `/pf-chore` before `pf sprint story finish`** — one clause in four places, no code
  change. Affects those four surfaces. *Found by Reviewer during code review.*

- **Improvement** (blocking-before-finish, NOT a rework): the AC5 ratchet is
  `toBeLessThanOrEqual(146)` while the tree is at 35 — it cannot fail until 111 new stale citations
  land. **SM: change it to 35 and update the stated baseline in the surrounding comment**, same
  chore. Affects `plugins/star-wars/tests/audit/comment-citations.test.ts:367`.
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): `checkTree` never scans `tools/`, so the guard cannot see its own
  citations nor those of `check-citations.mjs`, `reanchor-citations.mjs` or `linked-modules.mjs` —
  and `check-comment-citations.mjs:26` already carries a stale one (`design.md:45-46`; the
  observation is at `:47`). Fix the header citation in the chore; widening the scan wants its own
  story, because `tools/` will surface a fresh count. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs`.
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): the opt-out pragma is an unanchored substring test
  (`checkCitations`, `:252` — `raw.includes(IGNORE_PRAGMA)`), so any file that merely MENTIONS
  `citation-guard: ignore-file` — including inside a backticked example — silently drops out of the
  scan. Verified: same file, 1 error → 0 errors. Nothing trips it accidentally today, but
  `docs/superpowers/specs/` is in scope, so the first spec that documents this guard will retire
  itself. Anchor it to a leading comment. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs`.
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): `UNCATCHABLE` omits the guard's two biggest limitations —
  **744 of 1000** line-span citations (74%) get existence/range checking only, and a citation whose
  adjacent quote is a single token is never verbatim-checked (mutant `` (`TGPROB:`, WSCPU.MAC:999) ``
  → MISSED). AC7 is met to its letter; this is the spirit. Affects the `UNCATCHABLE` string.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `CheckOptions.fromFile` is declared, passed by `checkTree` and by
  six test call sites, and never read — so TEA's item-7 mutant varies it to no effect and the suite
  reads as covering citing-file-relative resolution that nothing implements. Wire it into
  `resolve()` or drop it. Affects `plugins/star-wars/tools/audit/check-comment-citations.{mjs,d.mts}`.
  *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: record deliberate departures from the story's stated approach. -->

### Dev (implementation)

- **Rewrote TEA's AC6 "correct span passes" fixture to DERIVE the span instead of naming it**
  - Spec source: `tests/audit/comment-citations.test.ts`, AC6
  - Spec text: `const fixed = M7.replace('design.md:26-30', 'design.md:45-46')`
  - Implementation: the fixture now finds the observation's line in the spec at run time and
    builds the span from it.
  - Rationale: the literal rotted DURING this story. `:45-46` was correct when TEA wrote it and
    became `:47-48` an hour later, because closing the twelfth item edited the spec three lines
    above the observation. A hardcoded span in the suite that polices hardcoded spans reproduces
    the defect one layer up, and the suite's own header says assertions should resolve rather
    than pin. I changed the mechanism, not the property under test.
  - Severity: minor
  - Forward impact: none — the assertion is strictly stronger and no longer needs maintenance.

- **Two "dangling file" reports were rename records, and are marked retired rather than rewritten**
  - Spec source: context-story-sw8-18.md, AC5 ("It fails on a reference to a file that does not
    exist")
  - Spec text: item 4's class — a comment naming a file that is gone.
  - Implementation: `space-eye-is-cockpit.test.ts` and `render.space-camera.test.ts` each open
    with "This file was `<old name>`" — a correct, past-tense record of their own rename. Both
    now carry the `RETIRED:` marker instead of losing the name.
  - Rationale: item 4's defect was a PRESENT-tense reference to a deleted suite as though it
    still ran. A rename record is the opposite: true, useful, and the only place the old name
    survives. Deleting it to satisfy the guard would destroy history to make a checker quiet.
  - Severity: minor
  - Forward impact: none — `RETIRED:` is part of the guard's contract and is pinned by two tests.

- **Five matcher rules were added that no AC describes**
  - Spec source: context-story-sw8-18.md, AC5
  - Spec text: "It fails … on a cited span whose quoted verbatim is no longer inside it."
  - Implementation: delimiter-pair scanning, a whitespace requirement on quotes, an
    assembler-predominance test for ROM targets, emphasis-stripping keyed on the cited file type,
    and single-line-anchors-a-run.
  - Rationale: without them the checker reported CORRECT citations as stale — `WSCPU.MAC:736` is
    `TGPROB:`, `WSGRND.MAC:940-942` is the bunker-top test, `WSMAIN.MAC:1868` is `LDA BS.WAV`.
    Each rule was added only after opening the cited ROM lines and confirming the citation was
    right. They tightened the tree-wide count 146 → 35 without a single edit to a comment.
  - Severity: minor
  - Forward impact: the ratchet in AC5 is now far below its baseline; whoever takes the sweep
    should lower the number.

### TEA (test design)

- **The tree-wide scan is a ratchet, not a green gate**
  - Spec source: context-story-sw8-18.md, AC5
  - Spec text: "A guard re-opens citations embedded in ordinary source comments across
    plugins/star-wars (src, tests, and docs/superpowers/specs)"
  - Implementation: the guard still SCANS that whole scope, but the hard green gate is
    this story's own 11 files. The tree-wide result is pinned by a ratchet
    (`length <= 146`, the measured RED baseline) that may fall but never rise.
  - Rationale: measured, an unrestricted scan of the specced scope reports **146** errors
    — 57 dangling references, 7 out-of-range spans, 82 verbatim mismatches — across seven
    years of star-wars comments. Closing roughly a hundred genuine stale citations is a
    larger story than this one, and a guard that cannot go green is not a deliverable. The
    ratchet makes it load-bearing plugin-wide immediately without demanding the sweep.
  - Severity: major
  - Forward impact: the sweep is filed as a blocking-for-the-epic Delivery Finding with the
    counts attached. Whoever takes it should lower the ratchet number in the same commit.

- **AC5 and AC6 are jointly unsatisfiable as written; resolved with an opt-out pragma**
  - Spec source: context-story-sw8-18.md, AC5 and AC6
  - Spec text: AC5 "across plugins/star-wars (src, tests, …)"; AC6 "restoring item 4's
    reference to the deleted bounded-eye-combat.test.ts … each reddens the suite"
  - Implementation: a file-level `// citation-guard: ignore-file` pragma, pinned by two
    tests (it silences the declaring file; it does not leak to any other file).
  - Rationale: AC6's mutation fixtures ARE deliberately-broken citations and they live in
    `tests/`, which AC5 tells the guard to scan. Without an opt-out the guard reports its
    own fixtures and can never be green. Measured: the unscoped scan reported the guard's
    own suite 14 times.
  - Severity: minor
  - Forward impact: none — the pragma is part of the guard's contract now.

- **Four defects outside the filing are pulled into scope**
  - Spec source: context-story-sw8-18.md, AC5
  - Spec text: "It fails … on a cited span whose quoted verbatim is no longer inside it."
  - Implementation: the story's 11 hard-gated files include `starfield.ts` and `state.ts`,
    which no AC names, and one test explicitly closes four off-by-N citations.
  - Rationale: the guard found them on arrival and they are inside the hard-gate scope, so
    AC5 cannot pass while they stand. Each is a one-number correction.
  - Severity: minor
  - Forward impact: none — they are listed verbatim in the test comment so Dev corrects
    rather than hunts.

### SM (setup)

- The story was filed with its entire body in the `title` field, no description and no
  acceptance criteria. Repaired at setup: a short title, the measured findings moved into the
  description, and seven acceptance criteria written. The original filing text survives in the
  git history of `sprint/epic-sw8.yaml`.
- Points raised 3 → 5 on the user's ruling, after measurement showed the true surface is larger
  than filed (ten condensation locations rather than three, plus a twelfth item from sw8-17).

### Reviewer (audit)

All six logged deviations audited. Five ACCEPTED, one ACCEPTED-with-a-flag.

- **The tree-wide scan is a ratchet, not a green gate** (TEA) → ✓ ACCEPTED as a design, ✗ FLAGGED
  as shipped. The reasoning is right and the measurement backs it. But the ratchet went in at
  **146** and the tree now sits at **35**, so `toBeLessThanOrEqual(146)` cannot fail until 111 new
  stale citations land. In a story whose subject is guards that cannot bite, that is the one
  outcome to avoid. Dev filed it as a Delivery Finding and did not act on it. See finding 2.
- **AC5 and AC6 are jointly unsatisfiable; resolved with an opt-out pragma** (TEA) → ✓ ACCEPTED.
  The conflict is real and the resolution is pinned by two tests, including a no-leak test. The
  pragma's *matching* is a separate problem — see finding 4.
- **Four defects outside the filing are pulled into scope** (TEA) → ✓ ACCEPTED. Required by AC5,
  not scope creep: the hard gate cannot pass while they stand. All four re-verified against the
  ROM by me.
- **Rewrote TEA's AC6 fixture to DERIVE the span** (Dev) → ✓ ACCEPTED, and it is the best change
  in the diff. The literal rotted inside the story; deriving it removes the rot permanently and
  the property under test is unchanged.
- **Two "dangling file" reports were rename records** (Dev) → ✓ ACCEPTED. The distinction — a
  present-tense claim about a live suite versus a past-tense record of a rename — is exactly
  right, and deleting the record to quiet a checker would have destroyed the only surviving copy
  of the old name.
- **Five matcher rules were added that no AC describes** (Dev) → ✓ ACCEPTED. I re-opened the ROM
  for three of them independently: `WSCPU.MAC:736` is `TGPROB:`, `WSGRND.MAC:940-942` is the
  bunker-top test, `WSMAIN.MAC:1868` is `LDA BS.WAV`. All were correct citations the matcher could
  not read, so the rules are earned. Two of them opened undisclosed blind spots — see finding 5.

No undocumented deviations found: every behavioural difference from the ACs I could identify is
covered by one of the six above.

## Sm Assessment

**Setup complete. Handing to TEA for the RED phase.**

### What I measured, and why I measured it at all

This story is nothing but line-number claims — twelve of them, against the 1983 assembler, against
this repo's own sources, and against the epic's design spec. A story whose deliverable is
"correct these citations" is the one story that cannot be handed off on trust, because if its
own citations have gone stale the corrections land in the wrong place. So every claim was
re-opened before handoff.

**The ROM held perfectly.** Ten separate premises verified line-exact in
`reference/atari-source/star-wars-1983/` — the two `.SBTTL` boundaries at WSMAIN.MAC:2243 and
:2292, the four space-wave labels at :2522-2525, `S1MVHP:` at :2531 with its `JSR LSLD8`, the
`.REPT 0`/`.ENDR` pair at :2271/:2290, all five `LDD ST.UX` sites, `WSGLOB.MAC:465`'s
`;VIEWER X POSITION`, and `WSSTAR.MAC:98`. Nine of the eleven filed items are still true exactly
as written. The reviewer who filed this did careful work.

**Four of the story's own citations had drifted anyway** — item 9 by 32 lines, item 10's three
anchors by 38, 13 and 3. The claims survive at the corrected lines; only the pointers rotted.
That is the story's own thesis demonstrated on itself, and it is why the context file tells TEA
to re-verify immediately before editing rather than trusting either the filing or my table.

### Three things the measurement changed

1. **Items 1, 8 and 10 are one edit.** They target the same bullet list (`gameRules.ts:232-241`)
   and the same ROM span. Worse, item 10's evidence over-counts: three of the five `LDD ST.UX`
   sites it cites to refute "only reader" sit inside the assembled-out `.REPT 0` block — which is
   item 8's own subject. Only :2245 and :2266 are live. A fix citing all five would reintroduce
   the defect class inside the correction. Sequencing is in the context: fix 1 and 8 first, or
   item 10's survival argument is written against a tombstone that does not yet support it.

2. **The condensation is at ten locations, not three.** Grepping the claim rather than the filed
   list found it in the tombstone itself, in three more tests, and in the design spec. I ruled
   the sweep in scope rather than asking — fixing three of ten copies of one false sentence is
   not a defensible deliverable, and a reviewer would rightly bounce it. Note how the count was
   reached: my first sweep was case-SENSITIVE and missed
   `render.space-camera.test.ts:13`, which writes "ONLY reader". AC2 therefore specifies a
   case-insensitive verification, because the obvious check passes while a site survives.

3. **sw8-17 shipped after filing and created a twelfth item**, three lines below item 7's own
   target. `deathStarPlacement` now moves the station laterally, but
   `render.space-camera.test.ts:86-88` still describes that as outstanding work. Ruled in scope.

### The user's ruling, and what it fixed

The filing claimed the guard "would have caught them". Measured, that is false, and it was the
single finding worth stopping for. Under the filing's own spec the guard catches **item 7 only**;
widened to handle bare filenames and bare-colon spans it reaches three of twelve. Item 10's span
is *correct* — the false part is the prose around it — so no span-checker will ever see it. Had
that gone to TEA unexamined, either the AC would have been unfalsifiable or a Reviewer would have
bounced a correctly-built guard for not catching items it structurally cannot see.

The user ruled: keep one story, re-spec the AC honestly. AC5 names the three citation forms the
guard must handle, AC6 requires it be mutation-proven against exactly items 4, 7 and 8, and AC7
requires it to document the nine it cannot catch. The guard is still worth building — item 7 is a
citation invalidated by its own commit, which is precisely the recurrence a checker prevents.

### Baseline suite: GREEN, and the number changed twice during setup

star-wars is **2113 passed / 0 failed** at handoff (measured at `e42fc50`).

It was **2103 / 10 failed** when I first measured it. All ten were
`tests/core/tie-aim-axis.test.ts` — a sibling checkout's uf1-15 RED phase (`88e9121`),
attributed rather than inherited, which is the expected steady state on a trunk-based repo.
Then uf1-15's GREEN (`5a15f21`) landed mid-setup and closed them.

Two things worth carrying: the attribution was right, and re-measuring was still necessary.
Had I handed off the first number, TEA would have started by reproducing a red suite that no
longer exists and reading a stale excuse for it. **Re-measure at the start of RED anyway** —
uf1-9 is also in flight (`47189e1`) and this number has a timestamp, not a guarantee.

### Notes

- Type is `chore` but the workflow is `tdd` and the points are 5 — that is correct here. AC5 and
  AC6 require a real guard with real mutation proof, which is test-first work, not a chore edit.
- No visual or served-lobby check is involved, so the dev-server port question does not arise.
- The claim branch is a marker only; the branch field in Story Details is the finish escape
  hatch, set proactively per the jt8-3 precedent rather than as a recovery.

**TEA (Leeloo):** the context file is `sprint/context/context-story-sw8-18.md`. It carries the
verified ROM table, the four corrected anchors, the nine condensation sites, and the sequencing
constraint. Multi-pass, big-picture — that is your call, but AC6's mutation proof is the one that
decides whether the guard is real or scenery.
---

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/star-wars/tests/audit/sw8-18-remediation.test.ts` — AC1-AC4, the nine items no
  span-checker can see. 36 tests, **30 red**.
- `plugins/star-wars/tests/audit/comment-citations.test.ts` — AC5-AC7, the guard's contract.
  40 tests; currently **fails to load** because the module does not exist.

**Tests Written:** 76 tests covering 7 ACs
**Status:** RED (ready for Dev)

### The design decision that shaped everything: assertions RESOLVE, they do not pin numbers

This story exists because citations rot. A suite asserting *"the comment must say
`:2522-2530`"* rots the same way and re-creates the defect one layer up — the next
legitimate ROM edit would make the TEST the stale citation. So wherever a claim can be
checked by opening the cited span, it is: AC1's tests assert the cited span **contains
`SMVSP1:`** and **does not contain `S1MVHP:`**; AC4's assert the cited spec span **contains
the longplay observation**. Those stay true when numbers legitimately move and fail the
moment a comment stops pointing at its subject. Line numbers appear in the suites only
inside `RETIRED:` markers, as the historical record of what a comment used to say.

### Three things I had to measure because the ACs were not satisfiable as filed

**1. The association rule.** A verbatim check needs to know which quote belongs to a
citation, and the obvious rules cannot ever go green:

| rule | candidates | mismatches |
|---|---|---|
| nearest quoted string within 240 chars | 267 | 184 |
| nearest backticked fragment within 200 chars | 265 | 116 |
| **immediately adjacent (≤4 punctuation chars)** | **129** | **17** |

The first two overwhelmingly capture the author's *own prose*, not a quote from the cited
file. Immediate adjacency is the only tractable rule — and it is the pattern items 7 and 8
already use. A second trap sits underneath it: a naive `` /`([^`]+)`/ `` pairs the CLOSING
backtick of one identifier with the OPENING of the next, so ``​`ST.UX` is the STARFIELD's
register`` reads as a quote. Scanning delimiter pairs from the start of the text removes
most of the remaining noise. Both are written into the suite's header.

**2. AC5 and AC6 are jointly unsatisfiable.** AC5 says scan `tests/`; AC6 requires mutation
fixtures that ARE deliberately-broken citations, and they live in `tests/`. Unscoped, the
guard reported its own suite 14 times and could never be green. Resolved with a file-level
`citation-guard: ignore-file` pragma, pinned by two tests — one that it silences the
declaring file, one that it does not leak to any other. Logged as a deviation.

**3. A tree-wide green gate is out of reach.** The specced scan scope reports **146**
errors: 57 dangling references, 7 out-of-range spans, 82 verbatim mismatches. Many dangling
ones are resolver gaps rather than defects (`math3d.ts`, `loop.ts`, `rng.ts` are `@shared/*`
at `src/shared/`; `vite.config.ts` and `sprint/**` are at the monorepo root — the plugin's
own CLAUDE.md says so outright), but roughly a dozen dangling and most of the 82 look real.
Hard gate is this story's 11 files; the rest is a **ratchet at 146** that may fall but never
rise. That keeps the guard load-bearing plugin-wide from day one without dragging a
hundred-citation sweep into a 5-pointer. Filed as a Delivery Finding.

### The guard found four defects nobody had filed

Running it over the tree surfaced four off-by-N citations in files no AC names — the proof
it bites on arrival rather than being scenery:

| file | cites | quote | actually at |
|---|---|---|---|
| `starfield.ts` | `WSMAIN.MAC:2529-2531` | `S1MV: LDD FRAME / JSR LSLD7 / STD ST.UX` | :2525-2528 |
| `gameRules.ts` | `WSLAZR.MAC:417` | `LDD #7000 ;FARTHEST FORWARD POINT` | :418 |
| `state.ts` | `WSBASE.MAC:1330` | `SUBD #6000 ;FURTHEST AWAY FIRING BUNKER` | :1340 |
| `state.ts` | `WSMAIN.MAC:2654` | `ADDD M$TX+M.S1` | :2656 |

The first is the same routine cluster AC1 corrects and is the same defect as item 2 — the
filing found it in `gameRules.ts` and missed it in `starfield.ts`. Nine sibling citations of
that routine are correct. Closing these is required BY AC5, not scope creep.

Item 4 also has **two** references to the deleted file, not the one the filing names.

### Satisfiability proven before handoff

76 tests pinning an API I invented could be jointly impossible, so I wrote a throwaway
implementation: **26/26** contract tests green, and the **full star-wars suite at 197/199
files passing** — no sibling breakage. Then I deleted it. Two of its bugs are real design
requirements now written into the tests: markdown emphasis sits *inside* quoted prose
(`the **Death Star is entirely out of frame**`) so a raw substring test never matches; and
re-location must report the matching LINE, not the first window containing it, or it is off
by the window width — sending the next reader to the wrong row, which is the very defect
this guard exists to prevent.

### Six tests pass on arrival, and one of them was a defect

Per the standing rule I read the PASS list, not the fail list. Four are deliberate oracles
(ROM premises, `WSGLOB.MAC:465`, `render.ts` importing `sim.ts`, `deathStarOffAxis`
existing). Two are green regression guards, and **both were mutation-proven**: injecting the
condensation into `tie-status.ts` reddens its row; deleting the sw8-8 ruling sentence reddens
the ruling guard. Backups were taken with `cp`, never `git checkout`, and the tree was
confirmed clean after each.

The seventh — *"no longer claims EVERY ST.UX writer sits under MOVE STARS IN SOME
DIRECTION"* — was **inert**. Its gap class was `[^.]*`, and the real sentence has
``​`WSMAIN.MAC`​`` between the two halves; a dotted token the class cannot cross. It passed
against the exact text it targets and would have let Dev ship the false claim untouched.
Fixed to `[\s\S]{0,60}` and it now reds. Every positive token was verified absent from its
target at RED (`S1MVHP`, `MOVE THE PLAYER`, `SMVBNR`, `SMVHIS` all count 0 in
`gameRules.ts`) and every negative token verified present, so neither half is vacuous.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|---|---|---|
| #1 type-safety escapes | no `as any` / `@ts-ignore` in either suite | clean |
| #4 `??` vs `\|\|` on falsy-but-valid | `m[2] ?? m[1]` for a degenerate span end | clean |
| #5 `.mjs` imported from TS needs a `.d.mts` | `comment-citations.test.ts` import | **red — see below** |
| test quality — meaningful assertions | self-check, all 76 | 1 inert found and fixed |
| test quality — green guards proven | 2 mutants, both caught | verified |

**Rules checked:** 4 of 4 applicable lang-review rules have coverage
**Self-check:** 1 vacuous assertion found and fixed; 0 remaining

### Lint, and the trap Dev must not fall into

`npm run lint` is **3 errors**, all downstream of one cause: `TS2307` for the missing module,
plus two `TS7006` implicit-anys where the unresolved import degrades to `any`. **Verified**,
not assumed: with the `.mjs` and a `check-comment-citations.d.mts` both present, lint returns
**0**. Dev must ship the declaration alongside the implementation — the existing
`check-citations.d.mts` is the precedent, and shipping only the `.mjs` leaves the suite
red on types while the tests themselves pass.

### Notes for Dev

- **Sequencing:** fix AC1's gameRules bullet list BEFORE AC2's condensation sweep. Item 10's
  survival argument is "the tombstone's fuller phrasing survives", but the tombstone's own
  bullet carries the condensation and the bullet that discloses the WSMAIN writers is items
  1 and 8's defect. The argument only becomes true once 1 and 8 land.
- The guard suite reports **"no tests"** rather than N failures while the module is absent —
  a load failure, not an empty suite. It registers 40 tests the moment the module exists.
- `tests/core/tie-fire-visibility.test.ts` passes its citation gate but is still in AC2's
  list. That is not an inconsistency: its defect is the prose condensation, which the guard
  is blind to by design. It is a small live demonstration of AC7.

### Suite state at handoff, attributed

star-wars is **2119 passed / 30 failed, 197 of 199 files green** at `792134b`. The two failing
files are **both mine** and all 30 failures are `sw8-18-remediation.test.ts`;
`comment-citations.test.ts` contributes zero because it fails to load. **Nothing here is a
sibling's.** Re-measured after a mid-phase rebase took two sibling commits (`d1eaa38`,
`f544f6e`) — uf1-9 is a joust story (`PJOYT`), so it does not touch this project. Its TEA
sidecar entry collided with mine at the tail of `sidecars/tea/gotchas.md`; union-resolved,
both blocks verified present.

**Handoff:** To Dev (Korben Dallas) for implementation.
---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** star-wars **2189/2189** (199/199 files) · `npm run lint` **0 errors** · the pre-existing
citation gate still **12/12** · guard contract **40/40**, remediation **36/36**
**Landed on:** `main` (trunk-based, so the Story Details field above stays `none`); commit `2c7588e`

**Files Changed:**
- `tools/audit/check-comment-citations.mjs` + `.d.mts` — NEW. The guard, and the declaration
  without which the suite fails `tsc` even while the tests pass.
- `src/core/gameRules.ts` — the ST.UX tombstone rewritten as one edit (AC1), the condensation
  (AC2), the `sim.ts shipPoint` claim (AC3), and the `WSLAZR.MAC:417→418` defect.
- `src/core/sim.ts` — the five-line re-export paragraph DELETED, retirement note kept (AC3).
- `src/core/tie-status.ts`, `src/shell/render.ts` — condensation + one phrasing (AC2), pointer fix.
- `src/core/starfield.ts`, `src/core/state.ts` — three of the four off-by-N defects.
- `tests/core/{incoming-fire-reaction-window,space-eye-is-cockpit,tie-fire-visibility,tie-sights-status}.test.ts`,
  `tests/shell/render.space-camera.test.ts` — AC2/AC3/AC4.
- `docs/superpowers/specs/2026-07-20-…-design.md` — AC2 and the sw8-17 forward reference.
- `docs/audit/findings/*.json` — 14 pins re-anchored (see below).
- `tests/audit/comment-citations.test.ts` — one fixture changed; logged as a deviation.

### Most of the work was calibration, and it was the interesting part

I expected to write a checker and fix twelve comments. What actually happened is that the first
working version reported **146** stale citations, and the great majority were CORRECT citations my
matcher could not read. Every rule below was added only after opening the cited ROM lines and
confirming the comment was right — never to make a number go down:

| the rule | what it was reporting as stale |
|---|---|
| pair delimiters by SCANNING, not regex | ``​`ST.UX` is the STARFIELD's register`` read as a quote — a naive ``/`([^`]+)`/`` pairs one identifier's closing backtick with the next one's opening |
| a quote must contain whitespace | `state.ts \`FIRE_MASK\`, WSCPU.MAC:736` — a TS identifier checked against the ROM. `WSCPU.MAC:736` is `TGPROB:`, correct |
| ROM verbatims must be PREDOMINANTLY assembler | `gdSeq >= seq` beside a WSGRND span — our paraphrase, not a quote |
| emphasis-stripping only for markdown targets | `*` is the assembler's multiply operator; stripping it turned `SUBD #6*120.*2` into `6120.2` |
| a single-line citation anchors a RUN | `LDA BS.WAV / LSRA / IFCC`, `WSMAIN.MAC:1868` cites the first line of three, by convention |
| bare spans inherit the nearest ROM file that VERIFIES | `tie-status.ts` lists bare `:607-608` spans belonging to `WSCPU.MAC` three lines up, with `math3d.ts:171-186` in between |

**146 → 35, of which calibration accounts for 146 → 49 and the comment edits for 49 → 35.**
(CORRECTED at finish, per the Reviewer's finding 1: this sentence originally read "and not one of
that drop was an edit to a comment", which is false — running the FINAL checker against the
PRE-STORY tree reports 49, so fourteen of the drop was edits. Re-verified at finish: 49 and 35.)
The calibration share is still the honest measure
of how much of a "stale citation" report is really a reader problem. It is also why I did not
lower the AC5 ratchet: the story's contract is 146, the tree is at 35, and moving the number is
the sweep story's job — filed as a Delivery Finding.

### The corrections

AC1's rewrite is one edit across one bullet list, in the order the context asked for (1 and 8
before 10, so item 10's "the tombstone's fuller phrasing survives" argument is true when it is
made). It now says the space-wave writer sits under `.SBTTL MOVE THE PLAYER` and that `S1MV` is
not an `SMV*` name — which **strengthens** the ruling, since the routine the ROM files under
"MOVE THE PLAYER" writes nothing but ST.UX. It enumerates `S1MVHP`, cites `.REPT 0` at :2271 and
the space wave at :2522-2530, and identifies the two live increments by the ROM's own labels
(`;PLAYER 1 MOVE DURING BANNER`, `;STAR MOVEMENT DURING HIGH SCORE DISPLAY`) rather than my gloss.

For AC2 the replacement everywhere is **CONSUMER**, not a softened "only reader": the star
generator is the only thing that consumes ST.UX as a position, and the WSMAIN reads are the
writers' own increments. That is the distinction the filing's own evidence rests on, so the ten
sites now say the same true thing instead of nine short false ones.

### Four defects outside the filing, and one hint that was wrong

The guard found four off-by-N citations no AC named, and all four are closed. One is worth
flagging: `state.ts` cites `ADDD M$TX+M.S1` for `S1MVBS`, and the guard's relocation hint said
**:2539** — which is `S1MVGD`, a different routine that happens to contain the identical
instruction. The right answer is :2656, and the citation is now `WSMAIN.MAC:2654-2656` so it holds
the label *and* the instruction. **The relocation hint is a lead, not an answer** whenever the
quoted text repeats; filed as a Delivery Finding.

### Two things I deliberately did not do

**I did not delete the two "dangling" filenames.** `space-eye-is-cockpit.test.ts` and
`render.space-camera.test.ts` each open with "This file was `<old name>`" — a true, past-tense
record of their own rename, and the only place the old name survives. That is the *opposite* of
item 4, which referred to a deleted suite in the present tense as though it still ran. Both now
carry the `RETIRED:` marker, so the record stays and the guard is quiet.

**I did not hand-roll a re-anchor script.** 14 audit pins moved under the comment edits (`sim.ts`
carries 22 live ones, `state.ts` 14, `render.ts` 13). `tools/audit/reanchor-citations.mjs` already
exists and did it in one command — 82 correct, 14 moved, **0 lost** — and the diff is 14 surgical
`"line": N` changes with no re-serialization damage.

### Verification

- **Mutation battery, six reverts:** each of the four off-by-N fixes, item 7's spec citation, and
  the `RETIRED:` marker. All six caught **independently** (35 → 36 each), tree restored to 35.
  Backups by `cp`, never `git checkout`.
- **The RED → GREEN transition is the coverage proof for the prose:** the remediation suite had 30
  real assertion failures (not collection errors) and is now 36/36.
- **I falsified my own correction prose** rather than trusting it. `SMVBNR`/`SMVHIS` were checked
  against their ROM labels; `S1MV` really does write nothing but ST.UX; `render.ts` really does
  import `sim.ts`. One claim was softened as a result — I had written "the attract banner" where
  the ROM says `;PLAYER 1 MOVE DURING BANNER`, so the comment now quotes the ROM instead of
  paraphrasing it.

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for code review.
---

---

## Impact Summary

### What shipped

A comment-citation guard for star-wars, and the twelve ST.UX citation/prose defects sw8-8's
reviewer filed — plus four more the guard found unaided.

- `tools/audit/check-comment-citations.mjs` + `.d.mts` — re-opens `<file>:<span>` citations written
  into ordinary source comments, in all three forms the defects used (qualified, bare `:N-M`
  inheriting a filename, bare filename). Reports a stale span **with the line it moved to**.
  Exports `UNCATCHABLE`, its own honest scope.
- **AC1** the gameRules ST.UX tombstone, rewritten as one edit: the `.SBTTL` attribution was false
  (the space-wave writer sits under `MOVE THE PLAYER`, `WSMAIN.MAC:2292`, and `S1MV` is not an
  `SMV*` name), `.REPT 0` starts at :2271, the space wave is :2522-2530, `S1MVHP` enumerated, and
  the three assembled-out reads no longer presented as live.
- **AC2** the sole-readership condensation corrected at all ten locations — the star generator is
  the only CONSUMER; the WSMAIN reads are the writers' own increments.
- **AC3/AC4** the stale `sim.ts` re-export paragraph deleted, the retired `spaceEye` option
  removed, the space-eye fixture value fixed, the duplicate `gameRules` import merged, item 7
  re-anchored, and the twelfth item sw8-17 created closed.
- Four unfiled off-by-N defects closed in `starfield.ts`, `gameRules.ts` and `state.ts` — found by
  the guard on its first run.

### Suite state at finish

star-wars **2189/2189** (199/199 files) · `npm run lint` **0** · `npm run test:orchestrator`
**0 fail** · the pre-existing `citations.test.ts` **12/12** · `reanchor-citations.mjs`
**0 lost**. Nothing red, and nothing attributed elsewhere.

### The review, and the correction it forced

One round, APPROVED, eight findings, no Critical or High. Two were required before finish and
landed as a chore (`98150d1`), each verified independently before applying:

1. **A false MEASURED claim.** Dev's headline — "146 → 35, and not one of that drop was a comment
   edit" — is wrong. Running the FINAL checker against the PRE-STORY tree reports **49**, so
   calibration accounts for 146 → 49 and the comment edits for 49 → 35. Corrected in the Dev
   Assessment, the Dev Delivery Finding, and the **Dev sidecar**, where it would have been
   inherited as fact. **The commit message on `07b2e58` still carries the original sentence and was
   deliberately left alone** — it is already pushed, and rewriting shared history is worse than the
   defect. Anyone reading that message should read this paragraph with it.
2. **An inert ratchet.** `toBeLessThanOrEqual(146)` against a tree at 35 could not fail until 111
   new stale citations landed. Tightened to 35 and **mutation-proven**: one added stale citation now
   reddens it; at 146 it reddened nothing.

The guard's own header also carried a stale citation (`design.md:45-46`, observation at :47-48) —
the story's defect class inside the fix, invisible because `checkTree` never scans `tools/`. The
citation is corrected; the scope gap is filed.

### The number worth carrying forward

**146 → 49 → 35.** Calibration removed 97 reported "defects" that were correct citations the
matcher could not read; the actual corrections removed 14. Every one of the six calibration rules
was earned by opening the cited ROM line and confirming the comment was right — the available
failure mode at each step was to "fix" a correct citation to silence the tool, which would have
written new false claims into the exact comments this story convened to make true.

### Follow-ups filed — THREE

- **sw8-23** (3pt, p2) — harden the guard: it cannot see its own directory, its opt-out pragma
  fires on a mere MENTION (verified: 1 error → 0), `UNCATCHABLE` omits that 74% of citations get
  existence/range checking only, and `fromFile` is dead. Carries the open cabinet-wide question.
- **sw8-24** (5pt, p3) — sweep the 35 remaining stale citations plugin-wide, then lower the ratchet
  again in the same commit.
- **td1-14** (extended 2pt → 3pt) — not a new story: it already owned the "count occurrences, refuse
  to guess" clause for `reanchor-citations.mjs`, and the new guard's relocation hint has the same
  first-occurrence bug. Same four-line clause, two call sites; extending beat filing a
  near-duplicate a groomer would merge anyway.

### What the story's own thesis cost it, twice

sw8-18 had its citations invalidated **during its own execution, twice**: a sibling's uf1-15 GREEN
moved a `tie-status.ts` anchor 79 lines mid-setup, and closing the twelfth item moved the design
spec out from under a citation written an hour earlier — including one inside TEA's own mutation
fixture, which is why that fixture now derives its span instead of naming it. The story is its own
best evidence.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (accounting) | not spawned — hand-assessed | 0 | Session instructions bar the Agent tool unless the user asks; user did not. Mechanical checks run directly: star-wars 2189/2189, `npm run lint` 0, `test:orchestrator` 0 fail, pre-existing citation gate 12/12, `reanchor-citations` 96 correct / 0 lost. |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter=false`. Domain hand-assessed: adversarial mutants against the matcher (single-token quote, 8-segment run cited early, run cited 400 lines away, prose-heavy quote, correct control) — findings 5. |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings. Domain hand-assessed: the `continue` paths in `checkCitations` are the silent-skip surface; each was probed and two are undisclosed — finding 5. The pragma's silent whole-file skip is finding 4. |
| 4 | reviewer-test-analyzer | Yes (accounting) | not spawned — hand-assessed | 2 | Not spawned (see #1). Six-mutant battery run directly against the delivered corrections, all caught once the mutations were made to LAND; one half-inert assertion pair found — finding 6. |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings. Domain hand-assessed and it is where the two Mediums came from: findings 1 and 3 are both false/stale prose. |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings. Domain hand-assessed: `.d.mts` surface vs implementation compared export by export — dead `fromFile` is finding 7. No `as any` / `@ts-ignore` / `Record<string,any>` in the diff. |
| 7 | reviewer-security | Yes (accounting) | not spawned — hand-assessed | 1 | Not spawned (see #1). Comment-controlled read path probed directly — finding 8. |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings. Domain hand-assessed: one dead export option (finding 7), one dead constant already removed by Dev pre-commit. |
| 9 | reviewer-rule-checker | Yes (accounting) | not spawned — hand-assessed | 0 | Not spawned (see #1). `gates/lang-review/typescript.md` walked rule-by-rule against the diff — see `### Rule Compliance`. |

**All received:** Yes (4 hand-assessed in place of un-spawnable specialists, 5 disabled via settings)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

> **On the four "Yes (accounting)" rows:** this session's instructions bar the Agent tool unless
> the user asks for it, and the user did not. I did not claim coverage I do not have — each of
> those four domains was worked by hand with commands run in this transcript, and the evidence is
> cited per finding. Where a specialist would have run, the mutation battery is the substitute.

## Reviewer Assessment

**Verdict: APPROVED — with two Medium corrections required before `story finish`.**

No Critical and no High. The code is correct, the corrections are real, and the guard is
mutation-proven. What is wrong is one number and one sentence — both in prose, both one-line
fixes, and one of them is already heading into institutional memory.

### The finding that matters most: a MEASURED claim that the measurement does not support

**1. [MEDIUM] [DOC] "146 → 35, and not one of that drop was a comment edit" is false.**
Dev's headline figure. I ran the FINAL checker against the PRE-STORY tree (`8b0666b`, via a
throwaway worktree) and it reports **49**, not 146. The honest decomposition is:

| stage | count | attributable to |
|---|---|---|
| TEA's early checker, pre-story tree | 146 | — |
| **final** checker, **pre-story** tree | **49** | calibration: −97 |
| final checker, delivered tree | 35 | **comment edits: −14** |

So 14 of the drop *was* comment edits. The claim appears in four places — the commit message
(`07b2e58`), the Dev Assessment, a Delivery Finding, and **`sidecars/dev/gotchas.md`**, where the
next agent will inherit it as fact. This is precisely the class sw8-18 was convened to eliminate,
committed in the act of reporting the fix, which is the failure mode the Dev sidecar's own
sw7-16 entry warns about. The underlying point Dev was making is true and worth keeping —
calibration dominated — it is the absolute quantifier that is wrong.

*Required correction (exact text, all four sites):* replace "and not one of that drop was a comment
edit" with "**of which calibration accounts for 146 → 49 and the comment edits for 49 → 35**".

**2. [MEDIUM] [TEST] The AC5 ratchet ships inert.** `comment-citations.test.ts:367` asserts
`checkTree(...).length <= 146` while the tree stands at **35** — 111 citations of slack. It cannot
fail until a hundred-plus new stale citations land. Dev filed this as a Delivery Finding and left
the number. In a story about guards that cannot bite, that is the one thing not to ship.

*Required correction:* `toBeLessThanOrEqual(35)`, and update the comment's stated baseline.

### The rest

**3. [MEDIUM] [DOC] The guard cannot see its own citations, and one of them is already stale.**
`checkTree` (`check-comment-citations.mjs:344`) scans `src`, `tests` and `docs/superpowers/specs`
— never `tools/`. The module's own header at `:26` cites
`design.md:45-46` for the longplay observation, which now lives at `:47`. The story's exact defect
class, reproduced inside the fix, invisible by construction. Its three sibling tools
(`check-citations.mjs`, `reanchor-citations.mjs`, `linked-modules.mjs`) are unwatched for the same
reason. Fix the header citation; adding `tools/` to the scan is a follow-up, not this story.

**4. [MEDIUM] [SILENT] Merely MENTIONING the opt-out pragma silences a whole file.**
`checkCitations` gates on `raw.includes(IGNORE_PRAGMA)` (`:252`) with no anchoring. Verified: a
file containing a stale citation reports 1 error; the same file with the sentence "The guard
honours a citation-guard: ignore-file pragma" above it reports **0** — and so does one with the
pragma inside a backticked example. Any doc that documents this guard silently stops being
checked, and `docs/superpowers/specs/` is in scope. Nothing trips it accidentally today (only the
two intended test files carry it). Worth anchoring to a leading comment in a follow-up.

**5. [LOW] [EDGE] `UNCATCHABLE` omits the guard's two largest limitations.** AC7 is met to the
letter — the nine prose items are named. But measured over the scanned tree: **744 of 1000**
citations with a line span (**74%**) get existence/range checking only, because no usable quote is
adjacent; and a citation whose adjacent quote is a single token is never verbatim-checked at all
(mutant `` (`TGPROB:`, WSCPU.MAC:999) `` → **MISSED**). Both are consequences of rules Dev
correctly added. A reader seeing green will over-trust it, which is exactly what AC7 exists to
prevent.

**6. [LOW] [TEST] Half of AC3's space-eye assertion pair cannot discriminate.**
`sw8-18-remediation.test.ts` asserts `toMatch(/\[0,\s*768,\s*0\]/)` against
`space-eye-is-cockpit.test.ts`, which contains that value **twice** — at `:19` (Dev's correction)
and `:78` (the pre-existing `advance()` doc). The positive half is satisfied by the file as it
stood before the story. **The pair as a whole still bites** — I restored the exact pre-story block
and the test reddened — so this is a note, not a defect: the negative half is the load-bearing one.

**7. [LOW] [TYPE] `fromFile` is dead.** Declared in `CheckOptions` (`.d.mts:34`), passed by
`checkTree` (`:359`) and by six test call sites, **never read**. TEA's item-7 mutant varies it
specifically to simulate the citation living in a different file — that variation has no effect,
so the suite reads as covering citing-file-relative resolution when nothing implements it. Either
wire it into `resolve()` or drop it from the interface.

**8. [LOW] [SEC] Comment text controls a filesystem read path.** `resolve()` joins a
comment-supplied name onto `swRoot`/`repoRoot` with no containment check; verified
`../../../../../../etc/hosts.md:1` extracts cleanly and reaches `existsSync`. Bounded and
low-impact — a dev-time tool, the trust boundary is commit access, and the only disclosure is
existence plus a line count in an error string. Same family as mg1-5's argument-injection note.

### Rule Compliance — `gates/lang-review/typescript.md`

The diff's TypeScript surface is one `.d.mts` and six `.ts` test/source files whose changes are
almost entirely comments. `check-comment-citations.mjs` is JavaScript and outside the TS rubric.

| Rule | Instances checked | Verdict |
|---|---|---|
| 1 type-safety escapes | `.d.mts` (6 exports), `comment-citations.test.ts`, all 5 edited `.ts` files | compliant — no `as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, or `!` assertions anywhere in the diff |
| 2 generic/interface pitfalls | `Citation` (7 fields), `CheckOptions` (4 fields) | compliant — both are explicit interfaces; no `Record<string, any>`, bare `object`, or `Function`. `candidates: string[]` is concrete |
| 3 enum anti-patterns | none in diff | N/A — no enums added |
| 4 null/undefined | `isFragment` (`:123`), `quoteFor`, `linesOf`, `?? ` chains at `:270`, `:307` | compliant, and this was an actual catch during implementation: `?.text` yields `undefined`, so a `!== null` guard let it through to `.trim()`. Now `typeof s === 'string'`. All five `\|\|` uses are on booleans/comparisons, none on falsy-but-valid values |
| 5 module/declaration | `check-comment-citations.d.mts` vs the `.mjs` exports | compliant — all five runtime exports (`extractCitations`, `checkCitations`, `checkTree`, `IGNORE_PRAGMA`, `UNCATCHABLE`) are declared, and `tsc --noEmit` is clean. Follows the `check-citations.d.mts` precedent exactly |

**One gap against the interface, not the rule:** `CheckOptions.fromFile` is declared and never read
(finding 7). That is a design smell rather than a rule violation.

### VERIFIED

- `[RULE]` **rule-checker domain: CLEAN** — all five applicable `gates/lang-review/typescript.md`
  rules walked instance-by-instance across the diff's TypeScript surface (the `.d.mts`'s two
  interfaces and six exports, plus the five edited `.ts` files); every instance compliant, with the
  one caveat that `CheckOptions.fromFile` is declared and never read — a design smell, not a rule
  violation. Full enumeration in `### Rule Compliance` above. No rule-matching finding was
  dismissed, because none was raised.
- `[VERIFIED]` **Suite and gates** — star-wars **2189/2189** (199/199 files); `npm run lint` **0**;
  `npm run test:orchestrator` **0 fail** in 8.0 s; the pre-existing `citations.test.ts` **12/12**.
- `[VERIFIED]` **Audit pins re-anchored, none lost** — `reanchor-citations.mjs` now reports
  `96 already correct, 0 re-anchored, 0 lost`, consistent with Dev's `82 correct + 14 moved`.
  Dev used the repo's own tool rather than hand-rolling one, per the standing sidecar rule.
- `[VERIFIED]` **The corrections are load-bearing** — six-mutant battery: re-introducing
  "only reader" in one file, breaking the `S1MVHP` enumeration, restoring the false `.SBTTL`
  attribution, restoring the `sim.ts` re-export paragraph, re-splitting the `render.ts` import,
  and restoring the pre-story space-eye block. **All six caught.** Two initially read as
  NOT-CAUGHT and both were my mutants failing to land — one used a typographic apostrophe, one was
  too narrow — so each was re-run with a landing assertion first.
- `[VERIFIED]` **Dev's ROM claims** — independently re-opened: `WSCPU.MAC:736` is `TGPROB:`;
  `WSGRND.MAC:940-942` is `LDD M$TZ+M.U1 / SUBD #6*120.*2 / IFLT`; `WSMAIN.MAC:1868` is
  `LDA BS.WAV`; `SMVBNR` at `:2244` is `;PLAYER 1 MOVE DURING BANNER` and `SMVHIS` at `:2265` is
  `;STAR MOVEMENT DURING HIGH SCORE DISPLAY`. All five matcher rules are earned, not tuning.
- `[VERIFIED]` **AC1's citations resolve rather than assert numbers** — the space-wave span opens
  on `SMVSP1:` and stops before `S1MVHP:`; the `.REPT 0` span opens on the directive. Checked by
  re-deriving both from `WSMAIN.MAC`, not by reading the comment.
- `[VERIFIED]` **Performance** — the guard suite runs in **0.82 s** wall clock; the basename index
  skips `node_modules` and `.git` (`:187`), so walking the monorepo root is bounded.

### Devil's Advocate

Argue this is broken. The strongest case: **this story shipped a guard that is mostly not
guarding, and told itself otherwise.** Three-quarters of the citations it walks get nothing but
"the file exists and the number is in range" — the weakest possible check, and the one that would
never have caught any of the twelve items. The verbatim check, the part that actually catches
item 7, reaches 256 of 1000 citations. The ratchet that was supposed to make it load-bearing
tree-wide is set 111 above the true count and cannot fire. And the guard is blind to its own
directory, where its own header already carries a stale citation. Assemble those and you can argue
the deliverable is a checker that produces a green light disproportionate to what it verified —
which is precisely the failure sw8-18 exists to end.

I do not think that case wins, and the reason is the mutation evidence rather than the test count.
Every one of the three items the guard claims (4, 7, 8) reddens independently; the four defects it
found unaided in `starfield.ts`, `gameRules.ts` and `state.ts` were real, ROM-verified, and had
survived every prior review; and six independent reverts of the delivered corrections all redden.
A guard that finds four unfiled defects on its first run is not scenery. The 74% is not a defect
either — you cannot verbatim-check a citation nobody quoted — it is a *disclosure* problem, which
is why it is filed against `UNCATCHABLE` rather than against the implementation.

What would a confused reader do? Trust a green run as "the citations are true". `UNCATCHABLE`
half-prevents that and should finish the job. What would a malicious committer do? Write
"citation-guard: ignore-file" into a doc comment and silently retire the file from the scan — no
warning, no log line, and the tool reports success. That is finding 4, and it is the one thing
here I would genuinely call a booby trap rather than a limitation.

**Verdict: APPROVED.** No Critical, no High. Findings 1 and 2 are required before `story finish`
and are a sentence and a number respectively — routed to SM as a chore with exact replacement text
rather than a fourth round, per the mg1-5 precedent. Findings 3-8 are non-blocking; 3 and 4 want
follow-up stories. If the chore does not land, findings 1 and 2 must be re-raised rather than
quietly dropped.