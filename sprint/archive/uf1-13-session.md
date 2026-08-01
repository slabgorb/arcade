---
story_id: "uf1-13"
jira_key: "uf1-13"
epic: "uf1"
workflow: "trivial"
---
# Story uf1-13: lobby showcase carousel — close the deferred review residuals

## Story Details
- **ID:** uf1-13
- **Jira Key:** uf1-13
- **Workflow:** trivial
- **Stack Parent:** none
- **Assignee:** Keith Avery
- **Repos:** arcade
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-01T20:29:48Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T18:04:58Z | 2026-08-01T18:08:54Z | 3m 56s |
| implement | 2026-08-01T18:08:54Z | 2026-08-01T18:49:31Z | 40m 37s |
| review | 2026-08-01T18:49:31Z | 2026-08-01T19:13:12Z | 23m 41s |
| implement | 2026-08-01T19:13:12Z | 2026-08-01T19:38:30Z | 25m 18s |
| review | 2026-08-01T19:38:30Z | 2026-08-01T19:55:51Z | 17m 21s |
| implement | 2026-08-01T19:55:51Z | 2026-08-01T20:09:17Z | 13m 26s |
| review | 2026-08-01T20:09:17Z | 2026-08-01T20:29:48Z | 20m 31s |
| finish | 2026-08-01T20:29:48Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement / non-blocking — AC-3 is two different kinds of work, and the story treats
  them as one.** The arrow's `aria-hidden` was already correct and merely unpinned, so a
  test for it is *green against the pre-story tree by design*. The button's missing
  accessible name is new behaviour, so its test is red there. My first draft asserted both
  in a single case, which made the pre-story replay pass for the wrong reason — the label
  assertion alone was carrying the failure, and the arrow half could have been vacuous
  without anyone noticing. Split into two cases. Worth carrying into how residual-cleanup
  stories are written: "add coverage" and "change behaviour" want separate ACs.
- **Gap / non-blocking — the story's "all 127 tests" is stale.** The lobby suite was **131**
  before this story and is **135** now. The 127 was accurate when the uf1-6 review deferred
  these items; nothing is wrong with the finding, but a future reader reconciling counts
  will not find 127 anywhere.
- **Improvement / non-blocking — AC-2's defect is invisible to every assertion except a
  direct timer count.** Nothing accumulates, no behaviour changes, and no DOM state differs;
  the orphaned dwell simply calls `next` a second time. `vi.getTimerCount()` is the only
  instrument that sees it. Flagging because the neighbouring test at
  `showcase-dom.test.ts:174` already had to reach for the same instrument for a related
  bug — this file has now needed a raw timer count twice, which suggests the timer
  bookkeeping is the part of this module worth watching.

### Reviewer (code review)

- **Conflict** (blocking): the `aria-label` added to close AC-3 replaces the button's
  accessible name, so the visible label "SHOW DEMO" is no longer contained in it — a
  WCAG 2.5.3 Label in Name (Level A) failure introduced by an accessibility fix.
  Affects `lobby/src/shell/showcase.ts` (line 143 — use the file's own `visually-hidden`
  span idiom at lines 105-108 instead of `aria-label`).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the story text itself prescribed "an aria-label on the button
  would close it", which is what produced the Label-in-Name failure above. The story was
  wrong, not just the implementation. Affects `sprint/epic-uf1.yaml` (the uf1-13
  description — a successor should not re-derive `aria-label` from it).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `just check-showcase` is a pure HTTP status probe
  (`justfile:349-351`, `curl -w "%{http_code}"`, `[ "$code" = "200" ] || fail=1`) and
  nothing in the docs says so, which is how two wrong examples got written against it.
  Affects `docs/ops/hosting.md` (state what the probe actually measures).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): three sites assign `slideTimer`
  (`showcase.ts:202`, `:216`, `:266`) and each now reasons about cancellation separately.
  Affects `lobby/src/shell/showcase.ts` (a single `armSlideTimer()` that always
  cancels-then-sets would retire the whole question). Independently recommended by
  reviewer-rule-checker under checklist rule #14.
  *Found by Reviewer during code review.*

### Dev (rework round 1)

- **Improvement / non-blocking — a mutation battery targeted at one test case can report a
  false survivor.** Running each mutation as `vitest -t '<the case I expect to bite>'` had
  m4 (collapse the button, leaving a bare `▸` in the text node) come back GREEN, which
  reads as an unguarded regression. It is not: the arrow case is honestly green there —
  the hidden span still exists and is still hidden — and the *name* case is what fails,
  because a bare glyph leaked into the accessible name. Re-running the battery against the
  FULL suite showed all six mutations RED. The lesson is not about this story: a battery
  scoped to the case you predicted measures your prediction, not the suite, and its
  failure mode is a false alarm that looks exactly like a real one. Run the whole suite and
  report which case bit.
- **Improvement / non-blocking — the two a11y guards on this button are complementary, and
  neither alone is sufficient.** m4 (bare glyph in the text node) is caught only by the
  name guard; m4b (arrow span deleted outright) is caught only by the arrow guard. Anyone
  later tempted to fold them into one case should know they are covering different
  mutations, not saying the same thing twice.

### Reviewer (code review — round 3)

- **Gap** (blocking-quality, carried to a successor rather than blocking this story): the
  lobby test apparatus has five unpinned points, and they form one coherent unit of work.
  Three are in the new helper — the recursive `aria-hidden` walk, the `nodeType` guard and
  `collapse()` — each of which can be reverted with the suite green (I ran all three). Two
  are **pre-existing and out of this story's scope**: `showcase-dom.test.ts:114` and `:122`
  assert `slideFor`'s launch-link name and live-slide caption only against ALPHA, so
  hardcoding either interpolation keeps the file green — the same class round 2's F1 named,
  on the other side of the module, in lines this story never touched.
  Affects `lobby/tests/accessible-name.ts` and `lobby/tests/showcase-dom.test.ts`
  (one fixture with a two-level-deep `aria-hidden`; one `chrome.test.ts` case on a
  non-labelled element; one whitespace fixture; ALPHA/BRAVO on the two `slideFor` cases).
  **Recommend the SM cut a successor story for exactly this list** — it is small, it
  terminates (fixtures need no guards of their own), and it closes the pre-existing gaps
  that no in-scope round could have reached.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the suite already has a shared-helper convention at
  `lobby/tests/helpers/` (`cookie-jar.ts`, imported as `./helpers/cookie-jar` at
  `storage.test.ts:5`); the new helper landed one directory up.
  Affects `lobby/tests/accessible-name.ts` (move to `lobby/tests/helpers/` with the above).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): three rounds running, this story shipped a mechanism whose guard
  did not bite — the `aria-label` (round 1), the ALPHA-only fixture (round 2), the helper's
  own branches (round 3) — and each was caught one round later by a reader other than the
  author. Dev correctly diagnosed this after round 2 ("the fix is structural, an independent
  mutant author, not attentional") and it recurred anyway, which is evidence for the
  diagnosis rather than against it. The `trivial` workflow has no TEA phase, so on a story
  whose deliverable IS a guard there is no independent author of mutants by construction.
  Affects the workflow definition (`trivial`), not a file — worth a look at whether
  guard-deliverable stories should be routed to `tdd` regardless of point count.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `docs/ops/hosting.md`'s probe section has now been
  rewritten in three consecutive rounds and each time a phrase was left describing the
  previous shape. Affects `docs/ops/hosting.md:319` ("the two halves" now introduces three
  bullets; the enumeration also has no case for a `403` on a bucket that is not public).
  *Found by Reviewer during code review.*

### Dev (rework round 2)

- **Gap / non-blocking — sharing a DOM helper across this suite is not realm-safe by
  default, and the obvious implementation throws.** `lobby/tests/` spans two runtime
  environments: `showcase-dom.test.ts` opts into `@vitest-environment jsdom` and has the
  DOM globals, while `chrome.test.ts` runs in the project's default `node` environment and
  constructs documents from an imported `JSDOM`. Any shared helper that reaches for a
  global constructor — `instanceof Element`, `instanceof HTMLElement`, `Node.ELEMENT_NODE`
  — is fine in the first file and a `ReferenceError` in the second, and no type checker
  will say so because the DOM *types* are ambient in both. Keying on `nodeType` is the
  portable form. Worth knowing before the next helper gets extracted, since the failure
  looks like a broken test rather than an environment mismatch.
- **Improvement / non-blocking — a fixture whose value equals the assertion cannot test
  the code path that produces it.** F1 was not a missing assertion; it was four correct
  assertions run against the one input that could not discriminate. The tell is cheap and
  general: if a test's literal appears in both the fixture and the expectation, ask what
  the code would have to do wrong for the test to notice. Here the answer was "nothing".
  This suite had the second fixture (`BRAVO`) sitting unused two lines away.

### Reviewer (code review — round 2)

- **Gap** (blocking): a fixture that is also the assertion cannot test interpolation — the
  reduced-motion block mounts only `ALPHA`, whose title IS the literal string every case
  asserts, so `game.title` and `'ALPHA'` are indistinguishable to the whole block.
  Affects `lobby/tests/showcase-dom.test.ts` (mount a second differently-titled game;
  `BRAVO` already exists at `:37` and is unused in this describe).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the lobby test suite now has two `accessibleName`
  helpers with the same signature and different semantics, and no shared test-helper
  module to put one in. Affects `lobby/tests/` (there is no `lobby/tests/helpers.ts`;
  this is the second consumer, which is the bar CLAUDE.md sets for extraction).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): a mutation battery written by the same agent that wrote the code
  inherits that agent's blind spots — Dev's six mutations were all ones Dev predicted, and
  the two that survive were found by a different reader. Dev filed exactly this lesson as a
  Delivery Finding in the same round and it still did not prevent the miss, which suggests
  the fix is structural (an independent mutant author), not attentional.
  Affects the workflow, not a file — worth carrying into how the `trivial` workflow
  handles stories whose deliverable IS a guard.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): checklist check #16, added by this story, has no scope
  limit and false-positives on two correct `aria-label` usages in this repo.
  Affects `.pennyfarthing/gates/lang-review/typescript.md` (#16 needs one line excluding
  landmarks and elements whose visible text is absent or entirely `aria-hidden`).
  *Found by Reviewer during code review.*

## Impact Summary

> Written by hand at finish. `pf sprint story finish` reported `archive_session` success but
> emitted no Impact Summary section at all — a known failure mode of the auto-writer, and the
> reason this is reconstructed from the Delivery Findings above rather than trusted.

**Shipped:** `6e8155c` + `e8cc5bf` + `6c2c412` + `c0dec32` on `main` (trunk-based, no PR).
Five acceptance criteria in `lobby/`: the header's total-failure invariant documented as
conditional (AC-1); `next()`'s focus-hold no longer double-arms the dwell, via a single
`armSlideTimer()` all three arming sites share (AC-2); the reveal button now names its game
by composition — a `visually-hidden` span, **not** the `aria-label` the story text asked for
— with the arrow's `aria-hidden` and the static caption's deliberate lack of it both pinned
(AC-3); the "silent reorder" test comment replaced with a claim that was actually run
(`error TS2345`) rather than re-asserted (AC-4); and `docs/ops/hosting.md`'s showcase
subsection now states what `just check-showcase` measures and routes `404` / `000` / `200`
to different evidence (AC-5). Lobby suite **131 → 136**; fleet **11040 passed, 0 failed**;
orchestrator **359/359**; `npm run lint` exit 0.

**⚠ Merged, NOT released.** The lobby ships from the bucket root, so AC-3 is only
user-visible after `just release lobby` cuts a `lobby-vX.Y.Z` tag. Nothing in this story
deployed anything; the last lobby tag predates it.

**Three review rounds, two rejections** — both for the same class, one level apart each time:
round 1 shipped an `aria-label` that REPLACED the button's accessible name (WCAG 2.5.3 Label
in Name, Level A — an a11y fix that broke speech input); round 2 shipped a guard that could
not fail for the defect it named (only `ALPHA` was ever mounted, so a hardcoded title kept
the suite green). Both were caught by a reader other than the author, and both were
reproduced by the Reviewer before being raised.

**Upstream Effects:** 19 findings (8 Gap, 1 Conflict, 0 Question, 10 Improvement).

**Blocking:** none outstanding. The two that were blocking are resolved *in this story* —
the Label-in-Name Conflict (round 1) and the vacuous-guard Gap (round 2).

**Carried forward (non-blocking):**
- **[Gap → successor story, recommended by the Reviewer]** Five unpinned points in the lobby
  test apparatus, forming one coherent unit of work. Three are in this story's new
  `lobby/tests/accessible-name.ts` — the recursive `aria-hidden` walk, the `nodeType` realm
  guard, and `collapse()` — each revertible with the suite green. **Two are pre-existing and
  were out of scope for every round of this story**: `showcase-dom.test.ts:114` and `:122`
  assert `slideFor`'s launch-link name and live-slide caption only against `ALPHA`, so a
  hardcode passes. Fix is fixtures, not mechanisms, so it terminates.
- **[Improvement]** `lobby/tests/accessible-name.ts` sits one directory above the suite's
  existing shared-helper convention (`lobby/tests/helpers/cookie-jar.ts`). Move it with the
  above.
- **[Gap → process]** The `trivial` workflow has no TEA phase, so on a story whose
  *deliverable is a guard* there is no independent author of mutants by construction — which
  is precisely the failure that recurred three times here. Worth deciding whether
  guard-deliverable stories should route to `tdd` regardless of point count.
- **[Gap → process]** Checklist check **#17 was missed twice in the round that wrote it**.
  That is its second recorded miss; by the gate's own promotion rule a third should make it
  an automated check rather than a checklist line.
- **[Improvement]** `docs/ops/hosting.md`'s probe section was rewritten in three consecutive
  rounds and each time a phrase was left describing the previous shape — currently "the two
  halves are not symmetric" introduces three bullets, and the enumeration has no case for a
  `403` on a bucket that is not public.
- **[Gap]** The uf1-13 description in `sprint/epic-uf1.yaml` still prescribes "an aria-label
  on the button would close it" — the text that *caused* round 1's Level A regression. Left
  deliberately unedited so the archive records what was actually asked; the Design Deviations
  entry below is the correction. **A successor must not re-derive `aria-label` from it.**

**Institutional memory:** three checks were added to
`.pennyfarthing/gates/lang-review/typescript.md` from this story's own findings — **#16**
(accessible names built by replacement, plus the scope note that keeps it off landmarks and
all-`aria-hidden` wordmarks), **#17** (comments and docs asserting a mechanism nobody re-ran)
and **#18** (the defect is in the test apparatus and fails by PASSING). All four
cross-references to the check range were updated with them.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

### Reviewer (audit)

- **Nothing logged by Dev to stamp** — the section was left at "No design deviations", and
  that is accurate as far as the SPEC goes: AC-3 prescribed "an aria-label on the button"
  and an aria-label is what was built. Dev did not deviate.
- **One undocumented divergence from established PATTERN, not from spec.** `slideFor`
  (`showcase.ts:105-108`) already names a control for assistive tech with a
  `visually-hidden` span; `staticCardFor` reached for `aria-label` instead, and the
  departure was not logged. Severity: covered by finding F1 rather than double-counted
  here — but noting it because the pattern divergence, not the spec, is what produced the
  Level A failure. The lesson for the deviations log: "the spec told me to" is worth
  recording as a deviation when the spec's instruction conflicts with an idiom the file
  already establishes.

### Dev (implementation)

Round 1 logged "No design deviations" and that was accurate for what it built. Rework
round 1 introduces one real deviation and one scope note.

- **Reveal button named by a visually-hidden span, not the `aria-label` the story prescribed**
  - Spec source: `sprint/epic-uf1.yaml`, uf1-13 description (AC-3), transcribed by SM into
    `sprint/context/context-story-uf1-13.md`
  - Spec text: "a screen-reader user who tabs straight to the button hears SHOW DEMO with
    no game name — an aria-label on the button would close it"
  - Implementation: no `aria-label`. A `<span class="visually-hidden">— TITLE</span>` is
    appended to the button, so the accessible name composes to "SHOW DEMO — TITLE"
  - Rationale: `aria-label` REPLACES the accessible name rather than supplementing it, so
    the visible "SHOW DEMO" stops being contained in it — WCAG 2.5.3 Label in Name, Level
    A. A speech-input user (Voice Control, Dragon) saying "click show demo" could no longer
    operate the button, because those engines match the accessible name and not the pixels.
    The spec's instruction fixed one assistive technology by breaking another. `slideFor`
    (`showcase.ts:105-108`) already establishes the visually-hidden idiom two functions up
    in the same file. Reviewer finding F1 [HIGH], which independently identified the story
    text — not the implementation — as the root cause.
  - Severity: minor — the AC's *intent* (the button names the game) is fully met and
    strengthened; only the mechanism differs
  - Forward impact: none on siblings; no other story reads this button. But a successor
    reading the uf1-13 description in `sprint/epic-uf1.yaml` will still find `aria-label`
    prescribed there. That text was deliberately left unedited so the archive records what
    was actually asked; this entry and the Reviewer's Gap finding are the correction.

- **AC-5's "one line pointing back at the table" grew into a rewrite of the paragraph**
  - Spec source: `sprint/epic-uf1.yaml`, uf1-13 description (AC-5)
  - Spec text: "Also worth one line: the new hosting.md subsection does not point the reader
    back to the failure-modes table above it once a game fails the liveness check."
  - Implementation: the paragraph round 1 added is replaced by a two-bullet split — what a
    non-200 means (points back at the table, as asked) and what a 200 does NOT mean
  - Rationale: Reviewer finding F2 [MEDIUM]. Two of round 1's three worked examples named
    failures that cannot produce a non-200 — a red deploy uploads nothing and leaves the
    last good build serving, and a stale build serves fine — so the paragraph routed a 3am
    operator toward evidence that cannot exist. Pointing back at the table correctly
    required first stating what the probe measures, which nothing in the docs said.
  - Severity: minor — additive prose, no behaviour
  - Forward impact: none. Closes the Reviewer's third (non-blocking) Delivery Finding in
    the same edit.

### Reviewer (audit — round 3)

Dev logged no new spec deviations this round and recorded two judgment calls instead. Both
stamped; I found nothing undocumented.

- **"No new deviations from spec" (rework round 2)** → ✓ **ACCEPTED by Reviewer.** Verified
  rather than assumed: all six round-3 changes trace to a numbered round-2 finding, and no
  AC text is contradicted by any of them. AC-3 is now satisfied more strictly than its own
  wording required.
- **The caption case moved to BRAVO, which the review did not ask for** → ✓ **ACCEPTED,
  and it was the right call.** `caption.textContent = game.title` had the identical
  fixture-monoculture defect one line from the one I named, and I confirmed the fix bites
  (hardcoding `staticCardFor`'s caption fails the BRAVO case). Going past the review's table
  to close a class rather than an instance is the behaviour I want; the fact that the same
  class survives in `slideFor` is a scope boundary, not a criticism of this decision.
- **The shared helper keys on `nodeType`, not `instanceof`** → ✓ **ACCEPTED as a decision,
  FLAGGED as unverified.** The reasoning is correct — I checked that `chrome.test.ts` runs in
  the `node` environment with no global `Element` — so the code is right. But no test
  exercises it, which is finding F2 in my assessment. Accepting the deviation and flagging
  its guard are not in tension: the choice is sound and the proof is missing.

- **No UNDOCUMENTED deviation found.** I checked the two places one could hide this round:
  the new module's placement (a judgment call about directories, not a spec departure —
  filed as F6) and check #18's addition to the checklist (mandated by the review-correlation
  gate, not story scope).

### Dev (implementation — rework round 2)

- **No new deviations from spec.** All six changes this round were mandated by the round-2
  review, and none departs from an AC. Two are worth recording as *judgment* calls rather
  than deviations, so the next reviewer does not have to re-derive them:
  - **The caption case moved to BRAVO, which the review did not ask for.** F1 named only
    the reveal-button case. `caption.textContent = game.title` had the identical
    fixture-equals-assertion defect one line over, and a hardcode there would have passed
    the whole block. Fixing the named instance and leaving its twin is what produced round
    2's F4 in the first place, so the class was closed instead of the instance. Proven by
    mutation `S3`.
  - **The shared helper keys on `nodeType`, not `instanceof`.** Not a style preference: the
    two consumers do not share a realm (see the Delivery Finding above), and the
    `instanceof` form throws in `chrome.test.ts`. Recorded because the code looks needlessly
    defensive until you know that.

### Reviewer (audit — round 2)

Both of Dev's rework-round-1 deviations are stamped. Nothing in this round is undocumented.

- **Reveal button named by a visually-hidden span, not the `aria-label` the story
  prescribed** → ✓ **ACCEPTED by Reviewer.** This is not merely defensible, it is what
  round 1's F1 required, and the reasoning in the entry is correct on both halves: an
  `aria-label` replaces the accessible name (WCAG 2.5.3 Label in Name, Level A) and the
  file already established the `visually-hidden` idiom two functions up. The decision to
  leave `sprint/epic-uf1.yaml`'s AC-3 text unedited is also endorsed — the archive should
  record what was asked, and this entry plus the Reviewer's round-1 Gap finding are the
  correction. Verified retired: no `aria-label` survives anywhere in `lobby/src`.
- **AC-5's "one line pointing back at the table" grew into a rewrite of the paragraph**
  → ✓ **ACCEPTED by Reviewer.** Required by round 1's F2; the expansion is proportionate
  and the AC's actual requirement (point back at the failure-modes table) is still met at
  `hosting.md:323-324`. Accepted with one correction outstanding — the rewritten paragraph
  is itself incomplete on the `000` case, filed as a LOW finding rather than a reversal of
  the deviation.

- **No UNDOCUMENTED deviation found this round.** I checked the three places one could
  hide: the `armSlideTimer` extraction (a Reviewer-requested refactor, not a spec
  departure), the two new checklist entries (mandated by the review-correlation gate), and
  the test-helper addition (test infrastructure, no AC governs it). The last of these is
  where I expected to find one and did not — `accessibleName` is new surface area, but no
  spec said how the assertion should be written, so it is a finding (F3), not a deviation.

## Sm Assessment

**Story prepared. Routing to Dev for the implement phase.**

**Workflow:** `trivial` — four phases, no RED, no TEA. The acceptance criteria are
therefore the specification, not a starting point for someone else to derive.

**What I corrected before handoff.** `pf context create` generated the story context
with an empty criteria section reading "TEA to define during the RED phase" — a phase
this workflow does not have. Left alone, Dev would have picked up a 2-point story with
no stated bar. I transcribed the five criteria (AC-1 … AC-5) from the story description
in `sprint/epic-uf1.yaml` into `sprint/context/context-story-uf1-13.md`. They are
transcription, not new scope: every one was raised and deferred by the uf1-6 reviews.

**Branching:** none. `repos.yaml` is `trunk-based` and this repo commits straight to
`main`; the gate's branch check is N/A here, recorded rather than satisfied.

**Where the risk actually is.** AC-3 is the only item with any. The reveal arrow's
`aria-hidden` and the caption's deliberate *lack* of it are both uncovered, and the
uf1-6 review demonstrated the failure concretely: collapsing back to a single
`textContent` assignment keeps all 127 tests green while making the arrow announce as
"black right-pointing small triangle". A test that passes against the pre-story tree is
not guarding this story — pin both halves of the asymmetry, and check the new
assertions fail when each half is reverted. AC-1, AC-4 and AC-5 are prose; AC-2 is one
`clearTimeout` over behavior that is already measured sound (2 live timers flat across
140s, 0 after retirement) — it is bookkeeping honesty, not a leak, so resist rewriting
the focus-hold design around it.

**Anchors verified to exist:** `lobby/src/shell/showcase.ts` (239 lines),
`lobby/tests/showcase-dom.test.ts` (315 lines), `docs/ops/hosting.md` (424 lines).

**Cabinet state at handoff:** all eight apps released and tagged minutes ago
(`tempest-v1.0.32` … `lobby-v0.0.26`); working tree clean, `main` in sync with origin.
Lobby ships from the bucket root, so AC-3's change is user-visible at `/` on the next
`lobby` release.

## Dev Assessment

**All five criteria delivered. Suite green, type check clean, every new guard mutation-proven.**

| AC | Change | Proven by |
|----|--------|-----------|
| AC-1 | `showcase.ts` header point 3 now states the focus-hold exception to unconditional retirement | prose — no test claimed |
| AC-2 | `next()` cancels the dwell it replaces before re-arming | `m1` mutation → target test RED |
| AC-3a | reveal arrow's `aria-hidden` pinned (coverage; green pre-story by design) | `m2` collapse-to-`textContent` → RED |
| AC-3b | `aria-label` naming the game added to the reveal button | `m3` label removed → RED; also RED pre-story |
| AC-3c | static caption's deliberate *lack* of `aria-hidden` pinned | `m4` caption hidden → RED |
| AC-4 | the "silent reorder" comment corrected — it does not compile | reorder applied, `tsc` → `error TS2345` |
| AC-5 | `hosting.md` showcase subsection points back to the failure-modes table | prose — no test claimed |

**Verification, in the order it actually happened.** The suite went green on the first run,
which is the least informative moment in a story like this, so it was not treated as
evidence. Replaying the new cases against the pre-story source (`git checkout HEAD --`
on the source only, tests left in place) is what produced the one real finding: two of
three failed, and the third passed. Then a four-mutation battery, each mutation asserting
its own anchor matched exactly once so a no-op edit could not masquerade as a surviving
mutant, and each restored from a `cp` backup rather than `git checkout` — which would have
reverted to HEAD and quietly discarded the story's work, making the next RED a lie.

**AC-4 deserved more than a rewrite.** The defect being fixed *was* a comment asserting
something untrue, so replacing it with a second confident claim would have repeated the
failure rather than closed it. The reorder was actually performed and `npm run lint` run
against it: `lobby/src/shell/showcase.ts(228,26): error TS2345: Argument of type
'GameMeta | undefined' is not assignable to parameter of type 'GameMeta'`. The comment
now says what was measured, and keeps the runtime case as second-line defence for a
reorder that narrows past the compiler.

**One judgment call worth the Reviewer's attention.** `aria-label` on the reveal button
overrides its text content for the accessible name, so the arrow's `aria-hidden` is no
longer what keeps the glyph out of that name — the label is. The attribute still earns its
place (it keeps the glyph out of the tree a visitor browses, and holds the line if the
label is ever dropped), and the comment now says exactly that rather than the older,
now-false "the accessible name is just its text content". If the Reviewer prefers the
button keep "SHOW DEMO" as its literal name, the alternative is a `visually-hidden` span
carrying the title instead — a different trade, not a fix, and I did not take it because
the story asks for a label by name.

**Not done, deliberately:** the focus-hold *behaviour* was left exactly as it is. It is
correct and measured, and AC-2 asked for honest bookkeeping inside it, not a redesign.

**Measured:** lobby 131 → **135** tests. Full fleet `npx vitest run` — 722 files, **10881
passed**, 1 todo, 0 failed. `npm run test:orchestrator` — **359 passed**, 0 failed.
`npm run lint` — exit 0. Nothing committed; the tree is left for review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint exit 0, lobby 135/135, orchestrator 359/359 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (see Rule Compliance #14 and Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (no try/catch, no fallback added; nothing swallowed) |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — traced all four mutations independently, found no surviving assertion |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — **domain covered by Reviewer by hand, and it is where 3 of 5 findings came from.** Three of this story's five ACs are prose, so this was the highest-risk gap in the fleet |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: no casts added in source; test casts match the file's pre-existing DOM-narrowing idiom |
| 7 | reviewer-security | Yes | clean | none | N/A — confirmed `setAttribute` does not parse markup and `game.title` is build-time data validated by `validateMeta` |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: the narrow `clearTimeout` is correct and `clearTimers()` would be wrong (see VERIFIED-2) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 — rule #14 at `showcase.ts:216`, severity set to MEDIUM by Reviewer (see F3) |

**All received:** Yes (4 enabled specialists returned; 5 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped, each with its domain accounted for by the Reviewer in the row above)
**Total findings:** 5 confirmed, 0 dismissed, 0 deferred

### Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md`, rules #1-#15, plus the CLAUDE.md core/shell rule.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 4 (test casts) + 0 in source | Compliant — no `as any`, no `!`, no `@ts-ignore`; test casts match the file's existing idiom |
| #4 null/undefined | 1 (`showcase.ts:201`) | Compliant — explicit `!== undefined`, not `\|\|` |
| #8 / #15 test quality + mutation | 4 new cases | Compliant — every guard mutation-proven; see VERIFIED-1 |
| #10 input validation | 1 (`showcase.ts:143`) | Compliant on the injection axis — but see F1, which is an a11y defect, not a type defect |
| #13 fix-introduced regressions | full diff re-scanned | **VIOLATION — F1.** The fix for AC-3 introduced a WCAG Level A failure. This is exactly what #13 exists to catch |
| #14 derived edges in one branch | 3 `slideTimer` sites | **VIOLATION (structural) — F3** at `showcase.ts:216` |
| #2 #3 #5 #6 #7 #9 #11 #12 | 0 | N/A — no generics, enums, modules, JSX, async, config, error handling or bundle surface in this diff |
| CLAUDE.md core/shell boundary | 1 | Compliant — `lobby/src/core/showcase.ts` untouched; both real changes (a DOM attribute write, timer bookkeeping) are shell-appropriate |

### Devil's Advocate

Argue this change is broken. Start with the visitor it was written for. A speech-input
user — Dragon, or macOS Voice Control — looks at the reduced-motion card, sees a button
reading SHOW DEMO, and says "click Show Demo." Nothing happens. The control's accessible
name is now "Show ALPHA demo", and speech engines match against the accessible name, not
the pixels. Before this diff that user could operate the button; after it they cannot.
The change was made to help screen-reader users and it broke a different assistive
technology, which is the characteristic failure of accessibility work done by reasoning
about one AT at a time. WCAG 2.5.3 exists precisely to stop this and it is Level A, the
floor, not an enhancement. That is F1 and it is why this review rejects.

Now the confused maintainer. They open `staticCardFor` and read, at line 132, that hiding
the caption "would strip the game's name out of the accessibility tree" — then read, at
line 143, code putting the game's name on the button. Both statements were added by the
same diff, eleven lines apart, and they cannot both be true. Whichever one they believe,
they will make a wrong edit. This is the identical defect class AC-1 was written to
close, reintroduced in the act of closing it.

Now the operator at 3am. A game is dark on the lobby. They read the new hosting.md
paragraph, which tells them a red *Upload to R2* step looks like this from the lobby. So
they go rotate a Cloudflare token — for a failure mode that cannot produce the symptom,
because `hosting.md:176` states in the same file that a red run uploads nothing and the
bucket keeps serving the last good build. A 200 keeps being served; `check-showcase`
keeps passing. Same for "stale build after a green run": stale still returns 200. Two of
the three worked examples send the reader somewhere the evidence cannot be. Documentation
that misroutes an incident is worse than no documentation, because it is trusted.

And the future maintainer of the timer code. Three sites arm `slideTimer`; two now defend
themselves and one relies on an invariant living in a different module. It is safe today
— I measured it, exhaustively, and so did the rule-checker independently. But nothing at
that site says why, and no test pins it. Change `markUnavailable` and the bug this story
just fixed comes back silently, at the sibling site, with the regression test still green
because it only covers the other branch.

## Reviewer Round 1 Assessment (REJECT — addressed by the rework, superseded)

> Heading deliberately not `## Reviewer Assessment`: the approval gate and the PR-body
> writer both read the FIRST heading matching that name, and the *current* verdict is the
> round-3 one at the end of this file. Renaming the superseded rounds keeps every consumer
> pointed at the operative assessment without moving these records out of order.

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [DOC] | WCAG 2.5.3 Label in Name (Level A): `aria-label` REPLACES the accessible name, so visible label "SHOW DEMO" is no longer contained in the name "Show ALPHA demo". A speech-input user saying "click Show Demo" cannot activate the button — an a11y regression introduced by an a11y fix | `lobby/src/shell/showcase.ts:143` | Drop the `aria-label`. Use the file's own idiom from `slideFor` (`showcase.ts:105-108`): append a `<span class="visually-hidden">` carrying the title, so the name becomes "SHOW DEMO — ALPHA" and CONTAINS the visible label. Update the test at `showcase-dom.test.ts:343` to assert the composed name, not the attribute |
| [MEDIUM] [DOC] | Two of the three worked examples cannot produce the symptom described. `check-showcase` is a pure HTTP status probe (`justfile:349-351`); a red *Upload to R2* leaves the bucket untouched serving the last good build (stated at `hosting.md:176`, 144 lines above), and a stale build still returns 200. Both PASS the check | `docs/ops/hosting.md:319-320` | Keep the `/<id>/` 404 example (correct). Replace the other two with failures that actually yield a non-200, or say plainly that the probe reads status only and a stale-but-serving build passes it |
| [MEDIUM] [RULE] | `slideTimer` re-armed with no preceding cancel, unlike its two sibling sites. NOT currently reachable with an armed timer — measured exhaustively twice (Reviewer 0/621 with a control of 21; rule-checker 0/129, independently) — but its safety rests on an unasserted invariant in `lobby/src/core/showcase.ts`. Confirmed under checklist rule #14; not dismissible, severity downgraded from the rule-checker's default because it is provably not a live bug | `lobby/src/shell/showcase.ts:216` | Either a comment at the site naming the core invariant it depends on, or (preferred, and what the rule-checker recommends) one `armSlideTimer()` helper that always cancels-then-sets, used by all three sites |
| [LOW] [DOC] | "Hiding it 'for symmetry' would strip the game's name out of the accessibility tree" is no longer true once line 143 puts the title on the button. Two comments added by one diff, eleven lines apart, contradict each other — the exact defect class AC-1 exists to close | `lobby/src/shell/showcase.ts:132-133` | Reword to the real reason: the caption is the card's VISIBLE label and hiding it would leave a visible name with no accessible counterpart |
| [LOW] [DOC] | "retirement goes through `next()`" is not exactly true — `mountShowcase` → `show()` → `retire()` runs at mount when nobody opted in, never entering `next()` (pinned by 'removes the section when no game opted in'). The substance is right for the total-failure case; the wording overreaches, in the header this story is fixing for overreaching | `lobby/src/shell/showcase.ts:38-39` | Narrow to "retirement in that case goes through `next()`" |

**Verified good:**

- [VERIFIED-1] All four new guards are real, not scenery — each mutation-proven. Independently confirmed three ways: Dev ran a 4-mutation battery with per-mutation anchor assertions; reviewer-test-analyzer hand-traced each mutation's DOM effect and looked specifically for an assertion that would survive an untried mutation, finding none; reviewer-rule-checker checked all four against checklist #15 and found no bare-token match — every assertion anchors to the declaration that does the work (`showcase-dom.test.ts:215, 320, 339, 351`).
- [VERIFIED-2] The AC-2 fix uses `clearTimeout(slideTimer)` and NOT `clearTimers()` — correct, and the non-obvious choice. `clearTimers()` (`showcase.ts:172-177`) also cancels `loadTimer`, which would destroy the pending load-failure detection for the slide being held. Narrow cancellation is the only correct option here.
- [VERIFIED-3] AC-4's replacement claim was empirically established, not asserted — the branch reorder was actually performed and `tsc` run, yielding `error TS2345` at the `staticCardFor` call. Given this story exists because a comment asserted something false, verifying rather than re-asserting is the right standard and it was met.
- [VERIFIED-4] No injection surface. `setAttribute` does not parse markup, and `game.title` is build-time data validated by `validateMeta` in `src/host/contract.ts`; reviewer-security swept every sibling use of `game.title` for a parsing sink (`innerHTML`/`outerHTML`/`insertAdjacentHTML`) and found none anywhere in `lobby/`.
- [VERIFIED-5] core/shell boundary held — CLAUDE.md's "single most important rule". `lobby/src/core/showcase.ts` has zero lines changed; both real edits are a DOM attribute write and timer bookkeeping, which are shell concerns.
- [VERIFIED-6] Suite integrity — the working tree was byte-identical before and after the specialist fleet ran (`cmp` against a diff snapshot taken at review start), so no reported failure or pass is an artifact of a subagent mutating the tree mid-review.

**Data flow traced:** `plugins/<id>/plugin.ts` manifest → `validateMeta` → generated `src/host/registry.ts` → `GameMeta.title` → `staticCardFor` → `setAttribute('aria-label', ...)` → the accessibility tree. Safe against injection (VERIFIED-4); the defect is at the last hop, where the value lands in a slot that REPLACES rather than supplements the visible name.

**Pattern observed:** `slideFor` (`showcase.ts:105-108`) already solves "name a control for AT without changing its visible text" with a `visually-hidden` span — an idiom defined at `lobby/index.html:282` and independently CSS-guarded at `chrome.test.ts:183-197`. `staticCardFor` reached for `aria-label` instead. The correct pattern was two functions up in the same file.

**Error handling:** No error paths added or removed; no try/catch, no swallowed failures. The load-failure path is unchanged apart from the cancel at `showcase.ts:201`.

**Note on scope:** F1's root cause is the story text itself — `sprint/epic-uf1.yaml` prescribes "an aria-label on the button would close it". Dev implemented what the story asked for. The story was wrong; recorded as a Delivery Finding so a successor does not re-derive it.

**Handoff:** Back to Dev for fixes

## Dev Assessment (Rework Round 2)

**All six findings fixed. Both survivors are RED. Suite green, type check clean.**

| # | Severity | Finding | Fix | Proven by |
|---|----------|---------|-----|-----------|
| F1 | HIGH | The AC-3 name guard could not fail for the defect it names | the case runs over ALPHA **and** BRAVO | `S1` hardcode → **(bravo) RED, (alpha) still green** |
| F2 | MEDIUM | `accessibleName` checked `aria-hidden` on direct children, then `.textContent` recursed back into hidden subtrees | the helper recurses, checking `aria-hidden` at every level | `S2` nested `aria-hidden` → RED |
| F3 | MEDIUM | Two same-named, divergent `accessibleName` helpers | one `lobby/tests/accessible-name.ts`, imported by both | `H1`/`H2` → each consumer's case RED |
| F4 | LOW | "hiding it strips the game's name out of the accessibility tree" — false since the button carries the name | reworded to the real reason, matching the source's corrected twin | comment-only |
| F5 | LOW | `hosting.md`'s non-200 list omitted curl's `000`; "can ever" overreached | `000` is now its own bullet; "can ever" narrowed to games with a good build in the bucket | prose — no test claimed |
| F6 | LOW | Check #16 had no scope limit and condemned two correct `aria-label`s in this repo | scope paragraph added: landmarks, and elements with no visible text to replace | checklist-only |

**F1 is the finding that mattered, and the fix is one word wide.** The case mounted
`[ALPHA]` — a fixture whose title is the literal string it asserts — so `game.title` and
`'ALPHA'` were the same value and the interpolation was invisible to it. Adding BRAVO to
the loop makes the hardcode fail: under `named.textContent = '— ALPHA'` the `(alpha)` case
**still passes** and `(bravo)` fails, which is exactly the discrimination that was absent.
The caption case moved to BRAVO for the same reason — every other reduced-motion case uses
ALPHA, so `caption.textContent = 'ALPHA'` would have sailed through the whole block too.
That one was not in the review's table; it is the same defect one line over, and leaving it
would have been fixing the instance instead of the class.

**F3 had a trap in it that the obvious fix walks straight into.** The two helpers could not
simply be merged: `showcase-dom.test.ts` runs under `@vitest-environment jsdom` and has the
DOM globals, while `chrome.test.ts` runs in the **node** environment and builds its
documents from an imported `JSDOM`. There is no global `Element` in the second file to be
an instance of — and even where there is one, nodes from another realm are not instances of
it. The shared helper therefore keys on `nodeType`, and `H1` exists to prove the import is
live in `chrome.test.ts` rather than assumed: breaking the helper's `aria-label` branch
reddens the wordmark case in that file.

**On the battery that missed these.** Round 1's six mutations were all ones I predicted, and
I had filed a Delivery Finding that round saying a battery scoped to your predictions
measures your predictions. Writing the lesson down did not prevent the miss — the Reviewer
found both survivors, and I reproduced each before accepting them. The round-3 battery is
therefore built the other way round: it starts from the two mutants an independent reader
produced, adds one per consumer of the new shared helper, and re-runs round 2's six to prove
the rework did not weaken them. **Eleven mutations, all RED against the full suite.**

| Mutation | Caught by |
|----------|-----------|
| `S1` hardcode the title | `names the game … (bravo)` — `(alpha)` correctly unaffected |
| `S2` bury the title under a nested `aria-hidden` | `names the game …` |
| `S3` hardcode the static caption | `leaves the static card caption announceable …` |
| `H1` helper stops honouring `aria-label` | `exposes the wordmark as the accessible name SLABCADE` (chrome.test.ts) |
| `H2` helper stops skipping `aria-hidden` | `names the game …` |
| `M1`…`M5` (round 2's six, re-run) | unchanged — each still caught by its own case |

**Not done, deliberately.** The `review_verdict: rejected` / `review_findings` fields the
Reviewer wrote into `sprint/epic-uf1.yaml` are left as they are: they record the last
*completed* review, and it is the next review pass's job to move them, not mine. The uf1-13
description still prescribes `aria-label` — unchanged for the reason logged in round 1's
deviation entry.

**Measured, after the battery restored the tree and the commit rebased onto `97cea70`:**
lobby **136/136** (up one — the name case became two). Full fleet `npx vitest run` — 728
files, **11040 passed**, 1 todo, **0 failed**. `npm run test:orchestrator` — **359 passed**,
0 failed. `npm run lint` — exit 0. Pushed as `6c2c412`; working tree clean, `main` in sync
with origin.

**Files Changed:**
- `lobby/tests/accessible-name.ts` — **new**: the suite's one accessible-name helper
- `lobby/tests/showcase-dom.test.ts` — F1 parameterised over two games, F3 import, F4 comment
- `lobby/tests/chrome.test.ts` — F3: local copy deleted, shared helper imported
- `docs/ops/hosting.md` — F5
- `.pennyfarthing/gates/lang-review/typescript.md` — F6

**Tests:** 136/136 lobby (GREEN) · 11040/11040 fleet · 359/359 orchestrator
**Branch:** `main` (trunk-based — committed and pushed)

**Handoff:** To review

## Review Correlation (Round 2)

Same checklist and sources as round 1; still no PR, no CI failure and no external
reviewer, so all six findings are internal.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| F1 | reviewer + test-analyzer | The name guard could not fail for the defect it names — the only game mounted was the one asserted | NEW_CHECK | — | Added as check **#18**, first bullet |
| F2 | reviewer + test-analyzer | A test helper reimplementing accessible-name computation got the nested case wrong and failed toward green | NEW_CHECK | — | Covered by check **#18**, second bullet |
| F3 | reviewer | Two same-named, divergent `accessibleName` helpers in one suite | NEW_CHECK | — | Covered by check **#18**, third and fourth bullets |
| F4 | reviewer | Stale claim at `showcase-dom.test.ts:385` contradicting its corrected twin | EXISTING_CHECK | **#17** | Dev missed the check this story added last round — see below |
| F5 | reviewer | `hosting.md`'s non-200 list omitted curl's `000`; "can ever" overreached | EXISTING_CHECK | **#17** | Same check, same round, second instance |
| F6 | reviewer | Check #16 had no scope limit and condemned two correct usages in this repo | NOT_APPLICABLE | — | Not a code defect — a defect in a checklist entry. Fixed in place at `typescript.md:147-179` |

### Signal Summary
- **External findings: 0** — trunk-based, no PR, no bot, no maintainer
- **CI findings: 0** — lint, fleet and orchestrator suites green locally throughout
- **Internal findings: 6** (all from the round-2 review; two corroborated independently by `reviewer-test-analyzer`, both reproduced by the Reviewer before being raised)
- **New checks added: 1** — #18, internal-sourced, so no `[EXT]` prefix

**#17 was missed twice in the round it was written.** F4 and F5 are both #17 instances, and
#17 is the check this story added one round earlier, from this story's own findings. Adding
a check does not make you apply it — the check went into the checklist and the same diff
shipped two more instances of the class it describes. That is worth more than the two LOW
findings it produced: a rule added mid-story is not yet a habit, and the round that adds it
is exactly the round least likely to enforce it. **This is #17's second recorded miss**
(F4/F5 here, after the round-1 pair that created it); by the gate's own promotion rule, a
third should make it an automated check rather than a checklist line — plausibly a grep for
a comment and a fix touching the same hunk.

**Why F1, F2 and F3 are one check.** All three are the same failure: the defect is in the
test apparatus rather than the code, so it manifests as a PASS. A fixture that cannot
discriminate, a helper that reimplements a platform algorithm and gets the nested shape
wrong, and two helpers that disagree — in each case every assertion is honest and the suite
is measuring itself. #15 already asks "is the guard mutation-tested?"; #18 asks the question
one level down, about the apparatus doing the measuring. Splitting them would hide the
common tell.

## Dev Assessment (Rework Round 1)

**All five findings fixed. Suite green, type check clean, every guard re-proven by mutation.**

| # | Severity | Finding | Fix | Proven by |
|---|----------|---------|-----|-----------|
| F1 | HIGH | `aria-label` replaces the accessible name — WCAG 2.5.3 Label in Name | `aria-label` dropped; a `visually-hidden` span carries `— TITLE`, so the name composes to "SHOW DEMO — ALPHA" and CONTAINS the visible label | `m2` (revert to `aria-label`) → RED |
| F2 | MEDIUM | Two of three worked examples cannot produce the symptom | Paragraph split: what a non-200 means (points back at the table, per AC-5) and what a 200 does not mean, with the probe's semantics stated outright | prose — no test claimed |
| F3 | MEDIUM | `slideTimer` armed three ways, each reasoning about cancellation separately | one `armSlideTimer()` that always cancels-then-sets; all three sites call it | `m3` (drop the cancel) → RED |
| F4 | LOW | Two comments eleven lines apart contradicted each other | caption comment now gives the real reason — it is the card's VISIBLE label | comment-only |
| F5 | LOW | "retirement goes through `next()`" overreaches | narrowed to that case, and the mount-time route named | comment-only |

**F1 is the one worth reading.** The Reviewer's Devil's Advocate was right and the fix is not
symmetrical with the defect: the failure was not "wrong attribute", it was that naming a
control by *replacement* is a trade against speech input, and naming it by *composition* is
not a trade at all. So the assertion moved too. The old test read the `aria-label`
attribute, which is the mechanism; the new one computes the accessible name the way a
browser does — `aria-label` wins if present, otherwise content minus `aria-hidden` subtrees
— and asserts the name CONTAINS "SHOW DEMO". That spelling makes the rejected
implementation fail the test rather than pass it, which an attribute check could never do.

**The mutation battery found something, and it was in the battery.** Six mutations, each
asserting its anchor matched exactly once, each restored from a `cp` backup rather than
`git checkout` (the tree is uncommitted; checkout would have reverted to HEAD and quietly
discarded the story). First pass ran each mutation as `vitest -t '<the case I expected to
bite>'` and m4 came back GREEN — apparently an unguarded regression. It was not. Scoped to
the case I predicted, the battery was measuring my prediction. Re-run against the full
suite: **all six RED**, and the two a11y guards turn out to be complementary — m4 (bare
glyph left in the text node) is caught only by the name guard, m4b (arrow span deleted) only
by the arrow guard. Recorded as a Delivery Finding, because the false-alarm failure mode
looks exactly like a real one.

| Mutation | Caught by |
|----------|-----------|
| m1 drop the visually-hidden name span | `names the game on the reveal button without renaming the button` |
| m2 revert to the rejected `aria-label` | same case — the WCAG containment assertion |
| m3 drop the cancel inside `armSlideTimer` | `cancels the dwell it is replacing when the hold is entered from a load failure` |
| m4 collapse to one `textContent`, glyph bare in the text node | the name guard (`not.toContain('▸')`) |
| m4b same collapse, arrow span removed with it | `hides the reveal arrow from assistive tech` |
| m5 hide the static caption "for symmetry" | `leaves the static card caption announceable…` |

**F3 changed no behaviour, and that is checked, not assumed.** `show()` already calls
`clearTimers()` before arming, so the new cancel is a no-op at that site — stated in a
comment there so nobody re-derives it. The site the Reviewer flagged
(`state === before && currentGame(state) !== null`) is still not reachable with a live
dwell; it simply no longer depends on an invariant that lives in another module to be safe.

**Not done, deliberately.** The uf1-13 description in `sprint/epic-uf1.yaml` still prescribes
"an aria-label on the button would close it" — the text the Reviewer identified as F1's root
cause. Left unedited: the archive should record what was actually asked, and rewriting an AC
to match what shipped hides the more useful fact that the story was wrong. The Design
Deviations entry and the Reviewer's Gap finding are the correction, and both archive with it.

**Measured, after the battery restored the tree:** lobby **135/135**. Full fleet
`npx vitest run` — 728 files, **11038 passed**, 1 todo, **0 failed**. `npm run
test:orchestrator` — **359 passed**, 0 failed. `npm run lint` — exit 0. (The fleet is up
from round 1's 722/10881 because `sw8-17` landed on `main` from another checkout at 15:16,
mid-review; nothing of mine accounts for the difference.)

**Re-measured after the push,** because the commit rebased onto `1019265` (`jt8-3` review
round 1, from another checkout) and that merged state had not been run anywhere: 728 files,
**11039 passed**, 1 todo, **0 failed** — the extra case is jt8-3's — and `npm run lint`
exit 0. Pushed as `6e8155c`; `main` is in sync with origin and the tree is clean.

**Files Changed:**
- `lobby/src/shell/showcase.ts` — F1 name composition, F3 `armSlideTimer()`, F4/F5 comments
- `lobby/tests/showcase-dom.test.ts` — `accessibleName()` helper; the name case rewritten
  to assert the composed name and WCAG 2.5.3 containment
- `docs/ops/hosting.md` — F2 worked examples corrected, probe semantics stated

**Tests:** 135/135 lobby (GREEN) · 11039/11039 fleet · 359/359 orchestrator
**Branch:** `main` (trunk-based — no branch; committed and pushed)

**Handoff:** To review

## Review Correlation

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (project-local; `language:
typescript` in `repos.yaml`). No CI failures and no external reviewers on this story —
the repo is trunk-based with no PR, so every finding is internal.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| F1 | reviewer | `aria-label` REPLACES the accessible name — WCAG 2.5.3 Label in Name, Level A | NEW_CHECK | — | Added as check **#16** |
| F2 | reviewer | Two of three worked examples name failures that cannot produce the symptom | NEW_CHECK | — | Covered by check **#17** (the docs half of the same class) |
| F3 | reviewer + rule-checker | `slideTimer` re-armed with no preceding cancel, unlike its two siblings | EXISTING_CHECK | **#14** derived edges in one branch | Dev missed an existing check — see below |
| F4 | reviewer | Two comments eleven lines apart, added by one diff, contradict each other | NEW_CHECK | — | Added as check **#17** |
| F5 | reviewer | "retirement goes through `next()`" is universal wording for a case-specific truth | NEW_CHECK | — | Covered by check **#17** |
| D1 | reviewer (delivery) | The story text itself prescribed the `aria-label` that produced F1 | PROCESS | — | Delivery Finding already filed by Reviewer; Design Deviation logged; epic text deliberately not retrofitted |
| D2 | reviewer (delivery) | Nothing documented that `just check-showcase` is a status-only probe | NOT_APPLICABLE | — | Not a language pattern — closed in this diff by F2's fix |
| D3 | dev (delivery) | A mutation battery scoped to `-t '<the case I predicted>'` reports false survivors | PROCESS | — | Delivery Finding filed under `### Dev (rework round 1)` |

### Signal Summary
- **External findings: 0** — no PR, no bot, no maintainer; nothing here is a pipeline blind spot in the external sense
- **CI findings: 0** — `npm run lint`, the fleet suite and the orchestrator suite were all green locally before review and are green now
- **Internal findings: 8** (5 review findings + 3 delivery findings)
- **New checks added: 2** — #16 (accessible names built by replacement) and #17 (comments and docs asserting a mechanism nobody re-ran), both internal-sourced, so neither carries the `[EXT]` prefix

**On F3, the one EXISTING_CHECK.** #14 already describes it exactly — "one member of a
family handled centrally and its siblings handled locally… the comment explaining why it
is 'special' is usually wrong". Round 1 added a cancel at one of three arming sites and
wrote a comment at that site explaining why it was the special one. The check was in the
file and the class was named in it; it was missed, not absent. Noted rather than
promoted: #14's origin is cp5-1 and this is its second recorded miss, so the third should
trigger the promotion-to-automated-gate the gate description calls for.

**Why F1 is a new check rather than a line under #13.** The Reviewer recorded F1 as a #13
violation (a fix introducing the class of bug it was fixing) and that is true, but #13 is
a meta-check — it says "re-scan against the other checks", and re-scanning would not have
caught this, because no check covered accessible-name computation. #13 was doing its job
and had nothing to point at. The gap was real coverage, so #16 states the mechanism
(replacement vs. composition), the tell (a control that already renders visible text), and
the test shape that distinguishes them.

**Why F2, F4 and F5 are one check, not three.** All three are a claim about code that
nobody re-ran: two comments that cannot both be true, a universal that has an exception,
and a runbook example naming an instrument that cannot see the symptom. Splitting them
would produce three narrow greps; #17 names the class and lists the three shapes as tells.
Three of this story's five findings were that class — it is the dominant defect mode in a
story whose ACs are mostly prose, which is itself worth knowing.

## Subagent Results (Round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint exit 0, lobby 135/135, orchestrator 359/359, tree clean, zero debug patterns |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: the three `armSlideTimer` sites and the `!revealed` early return were enumerated by hand (see VERIFIED-3) and independently by the rule-checker |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: no try/catch, no fallback, no swallowed error anywhere in the diff; the only error path (load failure) is unchanged |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | **confirmed 3, downgraded 1, dismissed 0** — F1 and F2 below are its two mutation-proven survivors, both of which I reproduced myself before rejecting on them |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer by hand, and it is again where the prose findings came from (F4, F5). Three of five ACs are prose, so this stays the fleet's biggest gap on this story |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer and rule-checker: `armSlideTimer(): void` and `accessibleName(el: Element): string` are both specifically typed; no casts added to source; test casts match the file's DOM-narrowing idiom |
| 7 | reviewer-security | Yes | clean | none | N/A — traced `game.title` and `game.id` to the generated registry, confirmed `validateMeta`'s `URL_SAFE_ID` gate, and swept `lobby/` for every parsing sink |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: the diff REMOVES duplication (three arming sites → one helper). But see F3, which is the opposite finding the simplifier would have caught: a duplicated helper it introduced |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations / 46 instances / 17 rules) | N/A as reported — but see the challenge below: its #17 sweep enumerated five instances and did not reach `showcase-dom.test.ts:381-385`, which is F4 |

**All received:** Yes (4 enabled specialists returned; 5 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped, each domain accounted for above)
**Total findings:** 6 confirmed, 0 dismissed, 1 downgraded to a note

**Challenging a "clean" result.** The rule-checker reported 0 violations across 17 rules,
including four compliant instances under #17. That is not wrong, but it is not complete:
its #17 sweep covered `showcase.ts:36-46`, `test.ts:394-401`, `hosting.md:321-324`,
`hosting.md:327-328` and `showcase.ts:224-231`, and never reached `test.ts:381-385`,
where the stale claim actually is. A clean sweep over an incomplete enumeration is a
clean sweep over an incomplete enumeration. F4 stands on line-level evidence.

**Downgraded, not confirmed — test-analyzer's third finding** (`armSlideTimer`'s comment
"reads as a uniform coverage claim" while only site 1 has a red/green-sensitive test). The
comment does not claim test coverage: it says one site "provably did that" and "a second is
safe only because of an invariant that lives in core/showcase.ts". That is an accurate
statement about SAFETY, and it is the statement round 1's F3 asked for. More to the point, a
branch that cannot be entered with a live handle cannot have a test that goes red when its
cancel is removed — the absence of that test is a property of the code, not a hole in the
suite. Recorded as a note rather than a finding; the analyzer's own trace of
`advance`/`scanFrom` is the evidence that the invariant holds.

### Rule Compliance (Round 2)

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` rules #1-#17 (as amended by
this very story), plus CLAUDE.md's core/shell rule.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 0 source + 10 test casts | Compliant — no `as any`, no `!`, no `@ts-ignore`; `instanceof` used as a real runtime guard at `test.ts:64` |
| #4 null/undefined | 4 (`test.ts:61-62`, `:65`, `showcase.ts:210`, `:254`) | Compliant — `!== null` and `??`, never `\|\|` |
| #8 test quality | 4 new cases | **VIOLATION — F1.** One of the four cannot fail for the defect it names |
| #13 fix-introduced regressions | full fix diff re-scanned | **VIOLATION — F4.** The fix corrected one false comment and shipped its twin uncorrected, eleven lines from the fix |
| #14 derived edges in one branch | 3 `slideTimer` sites + 1 `loadTimer` site | **Compliant — round 1's violation is fixed and verified twice.** All three arm sites route through `armSlideTimer` (`:232`, `:246`, `:298`); `loadTimer` checked for the same class and does not have it (one arm site at `:285`, always preceded by `clearTimers()`) |
| #15 guards must be mutation-tested | 4 new guards | **VIOLATION — F1, F2.** Two mutants survive the suite; I reproduced both |
| #16 accessible names by replacement | 1 (`showcase.ts:168-171`) | Compliant — composition via `visually-hidden`, no `aria-label`; but see F6 on the check's own scope |
| #17 prose asserting a mechanism | 6 (5 swept by rule-checker + `test.ts:381-385`) | **VIOLATION — F4, F5** |
| #10 input validation / security | 1 (`showcase.ts:170`) | Compliant — `textContent`, a non-parsing sink; `game.title` gated by `validateMeta` at build time |
| #2 #3 #5 #6 #7 #9 #11 #12 | 0 | N/A — no generics, enums, modules, JSX, async, config, error handling or bundle surface in this diff |
| CLAUDE.md core/shell | 1 | Compliant — `lobby/src/core/showcase.ts` has zero changed lines; DOM writes and timer bookkeeping are shell concerns |

### Devil's Advocate (Round 2)

Argue this is broken, and start where the story started. AC-3 exists because "a refactor
back to a single `textContent` assignment passes all 127 tests while making the arrow
announce as 'black right-pointing small triangle'" — a correct behaviour, unpinned, that a
tidy-up silently destroys. The whole story is that sentence. So the only question that
matters at review is whether, after this diff, a plausible edit can still break the
behaviour while the suite stays green. It can, twice, and I ran both.

Replace `` named.textContent = `— ${game.title}` `` with `named.textContent = '— ALPHA'` —
a hardcoded literal, the single most ordinary bug in templated UI. 135/135 pass. Every
game's reveal button now announces ALPHA, so a reduced-motion visitor on the Tempest card
hears the wrong game's name, and the test whose title is *names the game on the reveal
button* certifies it. It cannot do otherwise: the only game it ever mounts is called ALPHA,
so "the game's title" and "the literal ALPHA" are indistinguishable to it. The assertion
tests the fixture, not the code.

Now the subtler one. Bury the title one level deeper, inside an `aria-hidden` span within
the `visually-hidden` wrapper — the sort of thing that happens when someone adds a
decorative separator. A real browser's accessible-name computation excludes every node with
an `aria-hidden` ancestor at any depth, so the name collapses to exactly "SHOW DEMO": the
game name gone, AC-3 undone, the precise regression this story was written to make
impossible. 135/135 pass, because the helper checks `aria-hidden` only on direct children
and then calls `.textContent`, which cheerfully recurses through the hidden subtree. The
helper's own docstring says it computes the name "the way a browser does". It does not, and
the gap is on the one axis the story is about.

And the maintainer. They open the test file, read at line 385 that hiding the caption
"strips the game's name out of the accessibility tree entirely", then open the source and
read at line 137 that the button "carries the title too, inside its accessible name". Same
diff, both new, mutually exclusive. That is F4 from round one, reintroduced by the fix for
F4 — which is exactly what check #13 exists to catch and exactly what this story added
check #17 to describe. The Dev filed a Delivery Finding warning that a mutation battery
scoped to the mutations you predicted measures your prediction. It was the right lesson,
correctly written down, and then the battery was run against six predicted mutations and
none of the two that survive.

## Reviewer Round 2 Assessment (REJECT — addressed by the rework, superseded)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | **The headline AC-3 guard cannot fail for the defect it names.** The case only ever mounts `[ALPHA]`, whose title is the literal string asserted, so `named.textContent = '— ALPHA'` in place of `` `— ${game.title}` `` keeps **135/135 green**. Reproduced independently by me, not taken from the specialist. Every non-ALPHA game's button would announce the wrong game and this test would certify it | `lobby/tests/showcase-dom.test.ts:363-379` | Mount a second, differently-titled game (`BRAVO` already exists at `:37`) and assert its own title, or parameterise the case over both. Then re-run the hardcode mutation and require RED — the suite must distinguish "names the game" from "says ALPHA" |
| [MEDIUM] [TEST] | `accessibleName` checks `aria-hidden` on DIRECT children only, then calls `.textContent`, which recurses through `aria-hidden` descendants. Burying the title under a nested `aria-hidden` span keeps **135/135 green** while a real browser computes the name as just "SHOW DEMO" — the game name gone, AC-3 undone. Reproduced independently. The docstring's claim that it computes the name "the way a browser does" is therefore false, which makes this a #17 instance as well as a #15 one | `lobby/tests/showcase-dom.test.ts:54-68` | Check `aria-hidden` at every ancestor level (recursive descent or a `TreeWalker`), not just direct children. If that is more machinery than a test helper deserves, narrow the docstring to the flat shapes it actually handles and say plainly that a nested `aria-hidden` would fool it |
| [MEDIUM] [TEST] | A **second** `accessibleName(el: Element): string` — same name, same signature, divergent semantics — now exists in the same vitest project. `chrome.test.ts:60` does not exclude `aria-hidden`; the new one does. Neither mentions the other, so the next person needing an accessible name in `lobby/tests/` has two definitions that disagree on precisely the property this story is about. `chrome.test.ts:58-59`'s comment ("the accessible name a screen reader would announce") is true only because its single usage, `:121`, is an `aria-label` element | `lobby/tests/showcase-dom.test.ts:60` vs `lobby/tests/chrome.test.ts:60` | At minimum have each name the other and state the difference. Better: promote the `aria-hidden`-aware version (once F2 is fixed) into one lobby test helper and delete the weaker copy |
| [LOW] [DOC] | "hiding it strips the game's name out of the accessibility tree entirely" is **no longer true** — the button now carries the name, so hiding the caption strips nothing from the tree. The identical claim was CORRECTED in the source by this same diff (`showcase.ts:132-140`) and missed in its twin. Two new comments, one diff, mutually exclusive: check #17's first bullet, and the exact F4 class round 1 was rejected for | `lobby/tests/showcase-dom.test.ts:381-385` | Reword to the real reason, matching the source: the caption is the card's VISIBLE label, and hiding it would leave text on screen with no counterpart in the accessibility tree |
| [LOW] [DOC] | The non-200 bullet enumerates only 404 causes, but `justfile:340-347` deliberately emits `000` on connection failure or timeout and comments that it "lands in the same non-200 path" — an operator seeing `000` is routed to the directory-index rule. Separately "neither can **ever** produce a non-200" overreaches: a prefix whose first deploy went red has no last good build and does 404, a case the other bullet already claims | `docs/ops/hosting.md:320-331` | Name `000` (host unreachable / timed out) in the non-200 list, and narrow "can ever" to the case where a previous good build exists |
| [LOW] [RULE] | New check **#16 has no scope limit** and, read mechanically, condemns two CORRECT `aria-label`s in the repo that added it: `lobby/index.html:443` (the `h1` wordmark, every glyph span `aria-hidden`, so content computes to empty) and `:462` (a `nav` landmark with no visible text). WCAG 2.5.3 governs user-interface components with visible labels — not headings, not landmarks. A new rule that false-positives on its own repo will be learned as noise | `.pennyfarthing/gates/lang-review/typescript.md:147-172` | One line in #16: `aria-label` is correct on landmarks, and wherever the visible text is absent or entirely `aria-hidden` decoration — the check is about controls whose visible label it would REPLACE |

**Verified good:**

- [VERIFIED-1] **`.visually-hidden` is the clip pattern, not `display: none`** — `lobby/index.html:282-292` (`position:absolute; width:1px; height:1px; clip-path: inset(50%)`). This is the load-bearing check on the whole F1 fix: `display:none` removes a node from the accessibility tree, so the composed name would silently lose the game in every real browser while all 135 jsdom tests stayed green. Both halves are guarded — `showcase-dom.test.ts:378` pins that the class is USED, `chrome.test.ts:183-197` pins that it BEHAVES (`width === '1px'`, `display !== 'none'`).
- [VERIFIED-2] **The F1 mechanism is fully retired** — `grep -rn "aria-label" lobby/src` returns only comments; the sole remaining `aria-label`s in the lobby are `index.html:443` and `:462`, neither a control (see the F6 finding, which is about the CHECK's wording, not this code).
- [VERIFIED-3] [RULE] **Round 1's #14 violation is genuinely closed** — all three `slideTimer` arm sites route through `armSlideTimer()` (`showcase.ts:232`, `:246`, `:298`), and `loadTimer` was checked for the same defect class and does not have it: one arm site (`:285`), always synchronously preceded by `clearTimers()` (`:271`) on every path into `show()`. Enumerated by me and independently by the rule-checker.
- [VERIFIED-4] [TEST] **The AC-2 guard is genuinely fix-sensitive** — reverting site 1 alone to a bare `slideTimer = setTimeout(...)` fails `showcase-dom.test.ts:242` with `expected 2 to be 1`, and no other case. Unlike F1 and F2, this guard bites.
- [VERIFIED-5] [SEC] **No injection surface** — `game.title` reaches only `textContent` (a non-parsing sink); it originates in the generated, committed `src/host/registry.ts`, gated at build time by `validateMeta` in `src/host/contract.ts`; `lobby/src/` contains no `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`DOMParser` at all, and `refresh-rules.test.ts:69` independently asserts shipped code never assigns `.innerHTML`. `gamePath(id)` cannot escape `/<id>/`: ids are pinned by `URL_SAFE_ID = /^[a-z][a-z0-9-]*$/` plus an equality check against the plugin's directory name.
- [VERIFIED-6] [TYPE] **Core/shell boundary held** — CLAUDE.md's "single most important rule". `lobby/src/core/showcase.ts` has zero changed lines; both real edits are a DOM write and timer bookkeeping.
- [VERIFIED-7] [SIMPLE] **The checklist edit is self-consistent** — #16 and #17 carry `*Origin: uf1-13 …*` lines in the same format as #14/#15, and all four cross-references were updated together (`typescript.md:104`, `:194`, `:234`, `:299`); no stale "15 checks" or old range string survives. The arithmetic checks out: #1-#12 plus #14-#17 is the 16 that #13 re-scans, #13 itself excluded, 17 total.
- [VERIFIED-8] [EDGE] [SILENT] **Suite integrity and error paths** — the story diff was byte-identical to a snapshot taken at review start, after the whole specialist fleet had run, so no result here is an artifact of a mutated tree. No try/catch, no fallback and no swallowed failure appears anywhere in the diff; the only error path in the module (the load-failure timeout) is unchanged apart from the cancel now living in the helper.

**Data flow traced:** `plugins/<id>/plugin.ts` manifest → `validateMeta` (`src/host/contract.ts`) → generated `src/host/registry.ts` → `GameMeta.title` → `staticCardFor` → `named.textContent` on a `visually-hidden` span → the button's accessible name → what a screen reader announces and what Voice Control matches. Safe against injection at every hop (VERIFIED-5). The defect is not in the flow — it is that **the test at the last hop cannot tell whether the value arrived**, because the only value ever sent is the one asserted (F1).

**Pattern observed:** the fix correctly adopted the file's own idiom — `slideFor` (`showcase.ts:105-108`) names its launch link with a `visually-hidden` span, and `staticCardFor` (`:168-171`) now does the same. That is the right pattern, applied where round 1 reached for `aria-label`. It also introduced the opposite pattern one directory over: a duplicate `accessibleName` helper that disagrees with its twin (F3).

**Error handling:** unchanged. No error paths added or removed; the load-failure detection still runs off its own `loadTimer`, and `armSlideTimer` deliberately does not touch it — cancelling it there would destroy the pending failure detection for the slide being held.

**Note on scope:** F1 and F2 are defects in the story's DELIVERABLE, not in the shipped runtime behaviour. The lobby renders correctly today: the button's accessible name really is "SHOW DEMO — ALPHA", and a real visitor is better off than before this story. What fails is the guard, on a story whose entire purpose was that "the behaviour was right and unpinned". Both fixes are small and local to the test file.

**Handoff:** Back to Dev for fixes

## Subagent Results (Round 3)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint exit 0, lobby 136/136, orchestrator 359/359, tree clean, no debug patterns; also confirmed the new non-test module is NOT collected (10 test files, unchanged) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: no branching logic added this round except the helper's recursion, whose paths I enumerated and mutation-tested myself |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: no try/catch, no fallback, no error path anywhere in a test-and-docs diff |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | **confirmed 3, reclassified 2 to out-of-scope Delivery Findings** — it re-verified its own round-2 mutants are now RED, then found the new helper's own branches unpinned |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer and rule-checker; it is again where a finding came from (F4: the helper header asserts two mechanisms nothing exercises) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker under #1: the hand-rolled `isElement(node): node is Element` predicate has real runtime validation in its body (`nodeType === ELEMENT_NODE`), not a cast dressed as a guard |
| 7 | reviewer-security | Yes | clean | none | N/A — verified the helper is structurally unreachable from the build graph (`rollupOptions.input` is `lobby/index.html` only; no `publicDir` override), the `\s+` regex is not a ReDoS shape, and zero `lobby/src/**` files changed |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: this diff removes a duplicate helper, which is the simplifier's own goal. But see F6, a placement inconsistency it would likely have caught |
| 9 | reviewer-rule-checker | Yes | findings | 4 (21 rules / 29 instances) | **confirmed 4** — independently reproduced both mechanisms I had mutation-tested, and found a THIRD I had not (the `nodeType` guard), which I then reproduced myself |

**All received:** Yes (4 enabled specialists returned; 5 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped, each domain accounted for above)
**Total findings:** 6 confirmed, 0 dismissed, 2 reclassified as out-of-scope Delivery Findings

**Everything load-bearing here was reproduced by me before it was recorded.** Three
mutations, each run against the full lobby suite on the committed tree and restored after:
flattening the recursion → **136/136 green**; `collapse()` as a no-op → **136/136 green**;
`isElement` → `instanceof Element` → **136/136 green**. The third came from the
rule-checker rather than from me, and I did not take it on trust — it is confirmed because
I ran it, which is the standard this story's own round-2 rejection was held to.

**Reclassified, not dismissed.** The test-analyzer's findings 3 and 4 (`showcase-dom.test.ts:114`
and `:122` — `slideFor`'s launch-link name and live-slide caption each asserted only against
ALPHA, so a hardcode passes) are real and I verified the diff does not touch either line.
They are the same class as round 2's F1 on the *other* side of the module, and they predate
this story. Blocking a story on lines it never touched is scope creep; losing them is worse.
Filed as Delivery Findings, and bundled into the successor recommendation below.

### Rule Compliance (Round 3)

Checklist `#1-#18`, plus CLAUDE.md. Only the four rules with instances are expanded.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 1 (`accessible-name.ts:36-38`) | Compliant — `node is Element` predicate whose body performs real runtime validation (`nodeType === ELEMENT_NODE`); no `as any`, no new `!`, no `@ts-ignore` in the diff |
| #4 null/undefined | 2 (`accessible-name.ts:53-54`, `:63`) | Compliant — explicit `!== null`; `?? ''` where `\|\|` would have been a latent bug on a valid empty string |
| #5 module/declaration | 2 (the two imports) | Compliant — extensionless imports are correct under `moduleResolution: bundler`, and match `storage.test.ts:5`'s existing `./helpers/cookie-jar` |
| #13 fix-introduced regressions | 6 | **VIOLATION — F1, F2.** Five of round 2's six findings are closed cleanly and verifiably. The sixth was fixed in *implementation* but not in *verification*: the new helper is itself unguarded |
| #15 guards must be mutation-tested | 3 mechanisms | **VIOLATION — F1, F2, F3.** "Delete the mechanism and require red" fails for the recursion, the `nodeType` guard and `collapse()` |
| #16 accessible names | 3 | **Compliant, and the round-2 scope note is correct in both directions** — it excludes exactly `index.html:443` and `:462` (verified repo-wide: those are the only two `aria-label`s anywhere in `lobby/`), and still catches the reveal button, which carries real visible text |
| #17 prose asserting a mechanism | 6 | **VIOLATION — F4, F5.** The helper header states two failure modes as established fact, neither exercised; and `hosting.md`'s "two halves" now introduces three bullets |
| #18 defect in the test apparatus | 4 | **2 fixed, 2 VIOLATED** — the ALPHA-only fixture and the two-helpers finding are genuinely closed and mutation-verified; the helper's own branches reproduce the class one level up |
| #2 #3 #6 #7 #8 #9 #10 #11 #12 #14 | 0 | N/A — no enums, JSX, async, config, input handling, error paths or state-machine edges in a test-and-docs diff |
| CLAUDE.md core/shell | 0 changed | Compliant — zero `lobby/src/**` files changed this round (independently confirmed by reviewer-security) |
| CLAUDE.md extraction bar | 1 | Compliant — a lobby-only *test* helper belongs in `lobby/tests/`, not `src/shared/`, regardless of consumer count. But see F6 on which directory |

### Devil's Advocate (Round 3)

Argue this is broken. The story's thesis, stated in its own AC-3, is that behaviour which
is correct but unpinned is a defect, because the refactor that destroys it looks like a
tidy-up. Round 2 rejected because a guard could not fail. Round 3 fixed that guard — and
shipped a brand-new module, `accessible-name.ts`, whose three distinguishing mechanisms are
every one of them correct and unpinned. Flatten the recursion: green. Swap `nodeType` for
`instanceof`: green. Neuter `collapse`: green. The file's header explains, at length and
correctly, why each of those three choices is necessary; nothing in the suite would notice
if all three were undone tomorrow. The story wrote check #18 — "a test helper that
reimplements a platform algorithm is untested code" — two commits before committing an
untested test helper that reimplements a platform algorithm.

The sharpest version: the recursion exists *only* because round 2 proved a shallow walk
calls a broken button healthy. That proof was an injected mutation, not a fixture. So the
suite still contains no DOM shape that requires recursion, which means the exact defect
round 2 caught can be reintroduced in two independent steps — simplify the helper, then
nest an `aria-hidden` in `showcase.ts` — with green tests at both. Each step looks locally
harmless and the second author has no way to see the first.

And the maintainer reading the helper's header, which says `instanceof Element` "throws in
the second case". True — and unfalsifiable from inside this suite, because `chrome.test.ts`
only ever calls the function on an element carrying `aria-label`, so control returns at line
54 and the child-walk that would throw is never entered. The comment describes a hazard the
tests cannot reach, which is precisely what check #17 names.

Now argue the other way, because the verdict has to be proportionate. None of this is
shipped behaviour. Zero files under `lobby/src/` changed this round; the lobby renders
correctly and has throughout all three rounds. AC-3's own guard — the thing the story was
written for — is now sound and mutation-proven three independent ways. The residue is
second-order: guards on test infrastructure that the review itself demanded into existence.
The harm requires two future edits by two people, and one of the three mechanisms
(`nodeType`) fails loudly rather than silently when it bites. That is a follow-up, not a
gate.

## Reviewer Assessment

*(Round 3 — the operative verdict. Rounds 1 and 2 are recorded above under
`## Reviewer Round N Assessment` headings.)*

**Verdict:** APPROVED

Round 2's six findings are closed — five cleanly, one in implementation but not in
verification. No Critical or High remains: **zero production files changed this round**, and
the acceptance criteria are met and independently mutation-proven. What is left is
second-order, and it is recorded rather than waved through.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] [TEST] [RULE] | The **recursive `aria-hidden` walk** — the exact mechanism added to fix round 2's F2 — is unpinned. Reverted to the old direct-children shape: **136/136 green**. No fixture anywhere nests `aria-hidden` two levels under a probed element, so the suite contains no shape that requires recursion | `lobby/tests/accessible-name.ts:56-66` | Confirmed under #15 and #18. **Not blocking** — see the note below. Fix is one synthetic fixture asserting a two-level-deep `aria-hidden` is excluded |
| [MEDIUM] [TEST] [RULE] | The **`nodeType` guard** — the mechanism for the cross-realm hazard — is unpinned. Swapped for `instanceof Element`: **136/136 green**, because `chrome.test.ts`'s only call (`:121`, on the `aria-label`-bearing `h1`) returns at `accessible-name.ts:54` and never enters the child walk the guard protects | `lobby/tests/accessible-name.ts:36-38` | Confirmed under #15/#18. **Not blocking.** Fix: one case in `chrome.test.ts` calling `accessibleName` on a non-labelled element with nested content — which pins the guard AND makes the header's claim true-by-test |
| [LOW] [TEST] | `collapse()` is unpinned — a no-op body leaves the suite green; no fixture has an internal whitespace run only it would normalise | `lobby/tests/accessible-name.ts:42-44` | Confirmed, same class, lower stakes |
| [LOW] [DOC] | The helper header states two concrete failure modes as established fact ("a shallow check calls that healthy"; "`instanceof` throws in the second case"). Both are **true** — I checked the reasoning — but neither is exercised by any test. Reasoned, not run | `lobby/tests/accessible-name.ts:9-27` | Confirmed under #17. Dissolves automatically once the two MEDIUMs are pinned |
| [LOW] [DOC] | This diff split the probe's bullet list from two cases into three (`404`, `000`, `200`) and left the introducing clause reading "the two halves are not symmetric". Also, the enumeration has no case for other statuses — `403` on a bucket that is not public is the plausible one | `docs/ops/hosting.md:319` | Confirmed under #13/#17. One clause; optionally one bullet |
| [LOW] [SIMPLE] | The shared helper landed at `lobby/tests/accessible-name.ts`, but this suite already has a shared-helper convention one directory down — `lobby/tests/helpers/cookie-jar.ts`, imported as `./helpers/cookie-jar` at `storage.test.ts:5` | `lobby/tests/accessible-name.ts` | Confirmed. Move to `lobby/tests/helpers/` when the MEDIUMs are addressed |

**Why this approves rather than rejects a third time.** The rubric blocks on Critical and
High, and none of these is either: no shipped behaviour changed this round, and the story's
acceptance criteria are met and proven. I want to be precise about what I am *not* saying —
I am not dismissing the two MEDIUMs. They match standing project rules (#15, #18), they were
reproduced by me rather than accepted on report, and they should be fixed. But they are
guards on test infrastructure that this review itself called into existence two rounds ago,
the harm they permit needs two independent future edits, and the natural unit of work that
closes them also closes two *pre-existing* gaps this story cannot touch in scope
(`slideFor`'s launch-link and caption monocultures). That is a successor story, not a fourth
round. Recorded as a blocking-quality Delivery Finding so it is picked up rather than lost.

**Verified good:**

- [VERIFIED-1] [TEST] **Round 2's HIGH is genuinely closed.** Hardcoding the title fails the `(bravo)` case while `(alpha)` still passes — the discrimination that was entirely absent. Reproduced by me in round 2 and independently by both the test-analyzer and the rule-checker this round.
- [VERIFIED-2] [TEST] **Round 2's nested-`aria-hidden` mutant is RED**, failing both parameterised cases (`expected 'SHOW DEMO' to contain 'ALPHA'`/`'BRAVO'`). The helper's recursion is algorithmically correct; only its guard is missing.
- [VERIFIED-3] [RULE] **The #16 scope note is correct in both directions** — it excludes exactly `lobby/index.html:443` (wordmark, every glyph span `aria-hidden`) and `:462` (nav landmark), which a repo-wide grep confirms are the only two `aria-label`s in `lobby/`, and it still catches the reveal button, which carries real visible text. A scope limit that disarmed the check would have been worse than the false positive; this one does not.
- [VERIFIED-4] [DOC] **`hosting.md`'s new `000` bullet was checked against the recipe, not reasoned.** `justfile:349` is `curl -sL --connect-timeout 5 --max-time 15 … -w "%{http_code}"` and `:351` is `[ "$code" = "200" ] || fail=1`; `:340-347` is the recipe's own comment that a connection failure or timeout surfaces as `000` "landing in the same non-200 path". The doc now matches the tool.
- [VERIFIED-5] [SEC] **The new helper cannot reach production.** `defineAppConfig`'s `rollupOptions.input` is `lobby/index.html` alone, there is no `publicDir` override, and the only three references to `accessible-name` in the repo are the module and its two test importers. Zero `lobby/src/**` files changed this round.
- [VERIFIED-6] [TYPE] **`isElement` is a real type predicate**, not a cast in guard's clothing — its body validates `nodeType === ELEMENT_NODE`, satisfying #1's "type predicates without runtime validation inside".
- [VERIFIED-7] [SIMPLE] **F3's structural goal is achieved** — one definition, two importers, both local copies deleted. The suite no longer has two functions of the same name and signature disagreeing about `aria-hidden`.
- [VERIFIED-8] [EDGE] [SILENT] **Suite and tree integrity** — the round-3 diff was byte-identical to a snapshot taken at review start after the whole fleet had run, so no result here is an artifact of a mutated tree; and there is no error path, `catch`, or swallowed failure anywhere in a diff that touches only tests, docs and a checklist.

**Data flow traced:** unchanged from round 2 and re-confirmed — `plugins/<id>/plugin.ts` →
`validateMeta` → generated `src/host/registry.ts` → `GameMeta.title` → `staticCardFor` →
`textContent` on a `visually-hidden` span → the button's accessible name. The round-3 change
touches only the *observer* of that last hop (the test helper), never the flow. That is why
no production risk attaches to any finding above.

**Pattern observed:** the good one — the fix removed a duplicate definition and consolidated
on the stricter semantics rather than the looser (`accessible-name.ts` keeps the
`aria-hidden` skip that `chrome.test.ts`'s old copy lacked, rather than meeting in the
middle). The bad one — three rounds running, this story has shipped a mechanism whose guard
does not bite: the `aria-label` in round 1, the ALPHA-only fixture in round 2, and the
helper's own branches now. Each was caught one round later by someone other than the author.

**Error handling:** no error paths added or removed; nothing in this diff can throw at
runtime in production, because nothing in this diff ships.

**Handoff:** To SM for finish-story