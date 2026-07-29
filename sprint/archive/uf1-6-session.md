---
story_id: "uf1-6"
jira_key: "uf1-6"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-6: lobby attract-mode demo loop is promised by the docs and absent from the code

## Story Details
- **ID:** uf1-6
- **Jira Key:** uf1-6
- **Workflow:** tdd
- **Repos:** lobby, . (orchestrator)
- **Branch:** `feat/uf1-6-showcase-carousel` (lobby; merged + deleted)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-29T19:30:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T19:45:00Z | 2026-07-28T20:31:00Z | 46m |
| red/green (SDD) | 2026-07-29T05:55:00Z | 2026-07-29T19:10:00Z | ~13h |
| review | 2026-07-29T19:10:00Z | 2026-07-29T19:22:00Z | 12m |
| finish | 2026-07-29T19:30:00Z | - | - |

**Execution route — read this before judging the phase history.** This story was NOT run
through the pf phase pipeline. The user invoked `/superpowers:subagent-driven-development`
against a committed implementation plan
(`docs/superpowers/plans/2026-07-28-lobby-showcase-carousel.md`, 7 tasks), so RED/GREEN/review
happened per-task inside that skill: a fresh implementer subagent per task, a spec+quality
review after each, fix loops, then a whole-branch review before merge. The controller ledger
with every commit, verdict and ruling is at
`.superpowers/sdd/2026-07-28-lobby-showcase-carousel/progress.md`. The phase rows above are
the honest wall-clock mapping, not pf handoff records — there were none.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (delivery)

- **Gap** (non-blocking): four review residuals were deliberately deferred and are **already
  filed as `uf1-13`** (2pt, p3, trivial, lobby) rather than left here — per the design spec's §9,
  a finding that says "X must follow later" dies in the archive and takes the feature with it.
  The most valuable of the four: the reveal button's `aria-hidden` arrow and the static card
  caption's deliberate *lack* of `aria-hidden` are both untested, so a refactor back to a single
  `textContent` assignment passes all 127 tests while making the arrow announce as "black
  right-pointing small triangle". That asymmetry sits on the one point in the whole feature that
  required a judgment call. Affects `lobby/src/shell/showcase.ts`, `lobby/tests/showcase-dom.test.ts`.
  *Found by SM while triaging the whole-branch review.*

- **Gap** (non-blocking): `pf sprint story update` has **no `--repos` flag**, so a story's repos
  field cannot be corrected after creation without hand-editing sprint YAML — which CLAUDE.md
  forbids. This bit `ad1`: all five of its stories give one game a self-play demo **and** flip
  that game's `showcase` flag in `lobby/src/core/registry.ts`, so each touches two repos, but
  each is tagged `repos: <game>` only and the epic's own `repos` omits `lobby` too. Not corrected
  because there is no supported path; the substance is safe because the epic description states
  the lobby flag flip outright, and every reader of an `ad1` story sees it. Affects the `pf`
  CLI (`sprint story update`). *Found by SM after filing ad1.*

- **Improvement** (non-blocking): the highest-value defect class in this story was **a core
  function whose contract lied, and a caller that trusted it** — `advance()` returned a fresh
  state object even when the cursor had not moved, and the shell rebuilt the iframe on that
  signal. The plan mandated both halves, and no test caught it because each half is defensible
  alone. Worth generalising into the review rubric for this fleet: when a pure-core function's
  return value is used as a *change signal* by shell code, assert the identity contract at the
  core level, not only through the shell. `lobby/tests/showcase.test.ts` now does exactly that
  (two `toBe` identity cases). Affects the reviewer gate checklists.
  *Found by SM from the Task 3 review.*

- **Question** (non-blocking): the pane's size is now capped against viewport height
  (`min(68rem, calc(40svh * 16 / 9))`) rather than width alone, because the plan's sizing put the
  games grid entirely below the fold — measured 0 of 189px of the first tile row visible at
  1200×829, where before the branch all six tiles fitted. The fix restores a full tile row at
  1200×829, 1440×900 and 1920×1080, but the pane is now 55–71% of the grid's width instead of
  flush with it, so their edges no longer align. That is a visual-design consequence the user
  should eyeball and may want overruled in either direction; it is one coefficient. Affects
  `lobby/index.html` (`.showcase` max-width). *Found by SM from the whole-branch review.*

## Impact Summary

> **SM note:** the compiler wrote this section with `finding_count: 0` and "No upstream effects
> noted" because the four Delivery Findings above are prose rather than the structured R1 format,
> and it truncated every deviation rationale to its first physical line — leaving five sentences
> cut off mid-clause. Both were corrected by hand before archiving, since this section is the
> permanent record and an archived summary that says "no upstream effects" when four were filed
> would mislead whoever greps it next. Nothing below contradicts the full Design Deviations
> section; it is a faithful digest of it.

**Upstream Effects:** 4 findings, all non-blocking. (1) Four review residuals were filed as story
`uf1-13` rather than left here — chief among them that the reveal button's `aria-hidden` arrow and
the static caption's deliberate *lack* of one are both untested. (2) `pf sprint story update` has
no `--repos` flag, so `ad1`'s five stories cannot be re-tagged to include `lobby` without
hand-editing sprint YAML. (3) A reviewer-rubric improvement: assert a pure-core function's
identity contract at the core level when shell code uses its return value as a change signal.
(4) A design question for the user on pane size vs tile visibility.

**Blocking:** None. The whole-branch review returned **Merge**; the code is on lobby `develop` as
`cf51d33`.

### Deviation Justifications

5 deviations

- **Story ACs rewritten before implementation: the design supersedes an idle-triggered loop**
  - Rationale: the story's own AC-1 demanded a product ruling *before* implementation — build the
    loop or strike the claim — and the committed design doc **is** that ruling. It chose a third
    resolution (an always-on carousel) that neither original AC anticipated. User confirmed the
    design governs.
  - Severity: major (scope-defining)
  - Forward impact: none — the delivered ACs describe the delivered feature.
- **`advance()`'s return contract tightened, and `next()` given a hold guard — the plan mandated a reachable bug**
  - Rationale: as planned, a one-live-game carousel reloaded its iframe every 20s, and any reload
    slower than the 8s load timeout marked the **working** game unavailable, retiring the pane
    permanently. Reachable the instant either opted-in game went down.
  - Severity: major
  - Forward impact: positive. Note the implementer improved on the controller's proposed guard —
    object identity alone cannot separate "held on the sole survivor" from "everything died",
    since `advance` returns the same object in both cases.
- **`outline-offset: -3px`, not the plan's `+3px`; plus `.showcase:empty { display: none }` beyond the plan**
  - Rationale: the anchor is `inset: 0`, so its border box **is** the pane's `overflow: hidden`
    clip rect; outlines paint outside the border box, so the focus ring was clipped away entirely.
    Separately, the un-bootstrapped pane rendered as a 612px empty glowing box.
  - Severity: minor (each is one property)
  - Forward impact: both are now guarded by computed-style tests in `chrome.test.ts`,
    mutation-proved.
- **Rotation holds while the pane owns focus — not in the plan at all**
  - Rationale: `replaceChildren` destroyed the focused launch link and dropped focus to `<body>`,
    measured in Chrome. That link is the first focusable element in the document, so a keyboard
    visitor's next Tab restarted from the top of the page.
  - Severity: minor
  - Forward impact: one known consequence, recorded in `uf1-13` — with every game dead *and* focus
    held, retirement is deferred until blur. It self-heals, but the module header still states the
    removal invariant unconditionally and should note the exception.
- **Task 5's Step 8 (push + open PR) moved from the implementer to the controller**
  - Rationale: opening and merging a PR is outward-facing and was explicitly authorised by the
    user for the controller, gated on a clean review. It also let the whole-branch review run
    *before* the merge, which the plan's mid-plan merge gate would otherwise have inverted.
  - Severity: minor (process)
  - Forward impact: none.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### SM (delivery)

- **Story ACs rewritten before implementation: the design supersedes an idle-triggered loop**
  - Spec source: `sprint/epic-uf1.yaml`, uf1-6 acceptance_criteria (original)
  - Spec text: "If built, the loop starts only after a defined idle period, stops on any input"
  - Implementation: shipped an always-on showcase carousel framing the live deployed games that
    opt in, rotating every 20s, with no idle trigger and no stop-on-input. The 11 ACs were
    replaced to match (commit `5c3c2ce`).
  - Rationale: the story's own AC-1 demanded a product ruling *before* implementation — build the
    loop or strike the claim. The committed design doc
    (`docs/superpowers/specs/2026-07-28-lobby-showcase-carousel-design.md`) **is** that ruling,
    and it chose a third resolution neither original AC anticipated. User confirmed the design
    governs. Leaving the ACs stale would have had the finish gate judge shipped work against
    superseded text.
  - Severity: major (scope-defining)
  - Forward impact: none — the delivered ACs describe the delivered feature.

- **`advance()`'s return contract tightened, and `next()` given a hold guard — the plan mandated a reachable bug**
  - Spec source: plan Task 2 (`core/showcase.ts`) and Task 3 (`shell/showcase.ts`), quoted code
  - Spec text: `return i === -1 ? state : { ...state, index: i }`, and `next()` as
    `state = advance(state); show()`
  - Implementation: `advance` now returns the same object iff the displayed game did not change
    (`i === -1 || i === state.index`); `next()` holds the frame and re-arms only the dwell when
    that happens, distinguished from "everything died" by `currentGame(state) !== null`.
  - Rationale: as planned, a one-live-game carousel reloaded its iframe every 20s, and any reload
    slower than the 8s load timeout marked the **working** game unavailable → `currentGame` null →
    pane retired permanently. Reachable the instant either opted-in game went down — the failure
    model triggering the exact silent degrade it exists to prevent. The user's standing ruling is
    that the plan does not get to mandate a real bug.
  - Severity: major
  - Forward impact: positive. Note the implementer improved on the controller's proposed guard —
    object identity alone cannot separate "held on sole survivor" from "all dead", since `advance`
    returns the same object in both.

- **`outline-offset: -3px`, not the plan's `+3px`; plus `.showcase:empty { display: none }` beyond the plan**
  - Spec source: plan Task 5, the `.showcase-launch:focus-visible` rule and the `.showcase` rule
  - Spec text: `outline-offset: 3px`, and `overflow: hidden` on the pane
  - Implementation: offset flipped negative so the ring draws inside the clip rect; and an
    `:empty` rule added so the un-bootstrapped pane is hidden.
  - Rationale: the anchor is `inset: 0`, so its border box **is** the pane's `overflow: hidden`
    clip rect; outlines paint outside the border box, so the ring was clipped away entirely,
    leaving the lobby's first focusable element with no visible focus at all — violating a law
    stated 200 lines below it in the same stylesheet. Separately the static pane rendered as a
    612px empty glowing box, which `showcase.ts`'s own header calls "indistinguishable from a
    game that happens to be dark".
  - Severity: minor (each is one property)
  - Forward impact: both are now guarded by computed-style tests in `chrome.test.ts`,
    mutation-proved.

- **Rotation holds while the pane owns focus — not in the plan at all**
  - Spec source: plan Task 3, `show()`'s unconditional `section.replaceChildren(...)`
  - Spec text: each slide replaces the frame element
  - Implementation: `next()` returns early, re-arming only the dwell, when
    `section.contains(document.activeElement)`.
  - Rationale: `replaceChildren` destroyed the focused launch link and dropped focus to `<body>`
    — measured in Chrome. That link is the first focusable element in the document, so a keyboard
    visitor's next Tab restarted from the top of the page. Holding is also WCAG 2.2.2's
    pause-moving-content in effect. The alternative (mutating the link in place) was rejected: it
    would swap the game *under* a focused link, so Enter would launch a different game than the
    one the visitor chose.
  - Severity: minor
  - Forward impact: one known consequence, recorded in `uf1-13` — with every game dead *and* focus
    held, retirement is deferred until blur. Self-heals; the module header still states the
    removal invariant unconditionally and should note the exception.

- **Task 5's Step 8 (push + open PR) moved from the implementer to the controller**
  - Spec source: plan Task 5, Step 8
  - Spec text: `git push -u origin …` then `gh pr create …`
  - Implementation: the implementer stopped after committing; the controller pushed, opened
    PR #24 and merged it after the whole-branch review.
  - Rationale: opening and merging a PR is outward-facing and was explicitly authorised by the
    user for the controller, gated on a clean review. Also let the whole-branch review run
    *before* the merge rather than after, which the plan's mid-plan merge gate would otherwise
    have inverted.
  - Severity: minor (process)
  - Forward impact: none.

## Sm Assessment

**Delivered and merged.** Verified by command, not by subagent claim.

**Where the code is:**
- `lobby`: 8 commits on `feat/uf1-6-showcase-carousel`, merged to `develop` as **`cf51d33`** via
  PR **#24**; branch deleted. Final state 127/127 tests, `tsc --noEmit` clean, `vite build` clean.
- orchestrator (`main`, trunk-based): **`386cbcf`** (repos.yaml + hosting.md +
  `just check-showcase`), plus the sprint commit this session file lands in (uf1-6's repoint and
  ACs, epic `ad1` + its five stories, `uf1-13`, and this archive).

**The orchestrator side was rebuilt on top of a sibling checkout — read this before trusting any
SHA.** My first four orchestrator commits (`5c3c2ce`, `17b90b2`, `d1b66c4`, `ff25b7d`) were
rejected on push: a sibling checkout had landed **18 commits** on `main`, finishing uf1-2, uf1-3,
jt8-1 and jt8-2 and materialising epic `jt8`. Two collisions mattered. First, it had already
filed **its own `uf1-8`** (joust DYTBL flight-control rows) along with uf1-9..uf1-12 — so my
residuals story could not keep that id and was re-filed as **`uf1-13`**. Second, its `epic-uf1.yaml`
had no knowledge of uf1-6's repoint or AC rewrite. Rather than hand-resolve three YAML conflicts
across three of my commits — which CLAUDE.md forbids, since every sprint write must go through
`pf` — I reset to `origin/main`, replayed only the conflict-free docs commit, and **re-derived
every sprint change through `pf` on top of theirs**. That makes the `completed_stories` union
automatic instead of hand-merged. The pre-rebase state is preserved on the local branch
`sdd-uf1-6-preserve` (`ff25b7d`) as evidence. The SHAs quoted elsewhere in this file from before
that point (`5c3c2ce`, `17b90b2`, `d1b66c4`, `ff25b7d`) no longer exist on `main`.

**Integration was not clean and had to be handled.** `develop` moved five tile-version syncs plus
a release ahead while the branch was in flight, and since those bump each game's `version:` string
while this branch adds `showcase:` on the very next line, **every game entry conflicted**.
Resolved by merge (`e7b9985`), not rebase — with 10 commits whose first touches `registry.ts`, a
rebase would have re-resolved the same conflict repeatedly with a fresh chance to corrupt the
product flags each time. Both sides verified afterwards: six `version:` strings byte-match
`origin/develop`, six `showcase:` flags match the spec (tempest/centipede true).

**Board integrity — the reserialiser trap did not fire, checked on both attempts.** `pf` rewrites
every epic shard on write, and a `#` inside an unquoted string truncates a line in an *unrelated*
shard, which then under-reports silently rather than erroring. On the pre-rebase attempt the proof
was that `git show --stat d1b66c4` showed 3 files, 52 insertions and **zero deletions** — untouched
shards cannot be damaged, and `uf1`'s pre-existing stories gained lines with nothing removed. The
rebuilt attempt was re-checked the same way against `origin/main` as its baseline. `pf sprint
status` parses clean, and every epic shard was re-parsed by path afterwards.

**Review coverage, honestly stated.** Tasks 1–6 each got a spec+quality review, and the branch got
a whole-branch review on the most capable model before merge — two Important findings, both
measured in a real browser (focus loss on rotation; games grid below the fold), both fixed, both
re-verified by the same method that found them. **Task 7's review dispatch failed twice on API 529**
and I verified it myself in its place: board integrity as above, apostrophe survival (pf writes
these as double-quoted scalars, so the single-quote trap never applied), and both of `uf1-13`'s code
claims spot-checked against shipped `develop` so the story is not chasing phantoms.

**What made this story expensive, for whoever reads this next.** The plan was detailed and mostly
correct, and its three worst defects were all things a green suite cannot see: a reachable
pane-retirement bug hidden behind a lying function contract, a focus ring clipped into
invisibility by an ancestor's `overflow: hidden`, and a layout that pushed the lobby's entire
reason for existing below the fold. Every one was caught by a reviewer that was told to trace a
named risk or to measure in a browser — not by tests, and not by reading the diff. Four CSS
contracts the shell module structurally depends on are now guarded by computed-style tests with
mutation proofs, because deleting any one of them otherwise leaves 127 tests green while breaking
the page.

**Outstanding:** nothing blocking. `uf1-13` carries the four deferred residuals; `ad1` carries the
five per-game attract demos the carousel needs to be worth watching. One design question for the
user is recorded in Delivery Findings (pane size vs tile visibility).
