# Story uf1-13 Context

## Title
lobby showcase carousel — close the deferred review residuals

## Metadata
- **Story ID:** uf1-13
- **Type:** story
- **Points:** 2
- **Priority:** p3
- **Workflow:** trivial
- **Repo:** arcade
- **Epic:** Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep

## Problem
Four items the uf1-6 reviews deferred, none blocking, all in lobby. FIRST, src/shell/showcase.ts header states that total load failure REMOVES the pane, unconditionally — that is no longer exactly true. Rotation now holds while the pane owns focus, so if every game is dead while a visitor has focus on the launch link, retirement is deferred until they blur. It self-heals and holding is the right call, but the comment states an invariant the code no longer keeps unconditionally, which is precisely the kind of stale prose that gets a correct guard deleted by a future maintainer. Document the exception. SECOND, the focus-hold branch overwrites a still-armed slideTimer when next() is entered from the load-timeout callback, so next() runs about twice per dwell while focus is held. Measured flat at 2 live timers across 140 seconds and 0 after retirement, so nothing accumulates — but one clearTimeout makes the bookkeeping honest. THIRD, and the most valuable, the reveal button's arrow aria-hidden and the static card caption's deliberate LACK of aria-hidden are both untested: a refactor back to a single textContent assignment passes all 127 tests while making the arrow announce as black right-pointing small triangle. That asymmetry sits on the one point in the whole feature that needed a judgment call, which is the worst place to have no coverage. The reduced-motion path also emits no launch anchor, so its caption is the only thing naming the game and a screen-reader user who tabs straight to the button hears SHOW DEMO with no game name — an aria-label on the button would close it. FOURTH, a test comment in showcase-dom.test.ts calls a guard reorder silent when tsc under strict would actually reject it outright. Also worth one line: the new hosting.md subsection does not point the reader back to the failure-modes table above it once a game fails the liveness check.

## Technical Approach
Residual cleanup, not new behavior. Every item below was raised and deliberately
deferred by the uf1-6 reviews, and each names its own file. Two are prose fixes,
one is a one-call bookkeeping fix, one is the coverage gap that actually matters.
Dev owns the how; the items are independent and can land in any order.

## Scope
- **In scope:** `lobby/src/shell/showcase.ts`, `lobby/tests/showcase-dom.test.ts`,
  and the showcase subsection of `docs/ops/hosting.md`.
- **Out of scope:** the rotation/focus-hold *behavior* itself — it is correct and
  measured (2 live timers flat across 140s, 0 after retirement). This story
  documents and covers that behavior; it does not redesign it.

## Acceptance Criteria

**AC-1 — the stale invariant in the header is documented as conditional.**
`lobby/src/shell/showcase.ts`'s header states that total load failure REMOVES the
pane, *unconditionally*. That is no longer exactly true: rotation now holds while
the pane owns focus, so if every game is dead while a visitor has focus on the
launch link, retirement is deferred until they blur. It self-heals and holding is
the right call — the comment, not the code, is what is wrong. Document the
exception.

**AC-2 — the focus-hold branch stops double-arming the slide timer.**
The focus-hold branch overwrites a still-armed `slideTimer` when `next()` is
entered from the load-timeout callback, so `next()` runs about twice per dwell
while focus is held. Nothing accumulates (measured flat at 2 live timers across
140 seconds, 0 after retirement), so this is honesty in the bookkeeping, not a
leak: one `clearTimeout`.

**AC-3 — the aria asymmetry gets coverage, and the reduced-motion path names its game.**
The reveal button arrow's `aria-hidden` and the static card caption's deliberate
*lack* of `aria-hidden` are both untested — a refactor back to a single
`textContent` assignment passes all 127 tests while making the arrow announce as
"black right-pointing small triangle". That asymmetry is the one point in the
feature that needed a judgment call, so it is the worst place to have no coverage.
Both halves must be pinned. Separately: the reduced-motion path emits no launch
anchor, so its caption is the only thing naming the game and a screen-reader user
who tabs straight to the button hears "SHOW DEMO" with no game name — an
`aria-label` on the button closes it.

**AC-4 — the "silent" test comment is corrected.**
A comment in `lobby/tests/showcase-dom.test.ts` calls a guard reorder *silent*
when `tsc` under strict would reject it outright.

**AC-5 — the hosting doc points back to its failure-modes table.**
The showcase subsection added to `docs/ops/hosting.md` does not point the reader
back to the failure-modes table above it once a game fails the liveness check.
One line.

> **Note for the implement phase:** this story's workflow is `trivial`
> (setup → implement → review → finish). There is **no RED phase and no TEA** —
> the ACs above are the specification, transcribed from the story description in
> `sprint/epic-uf1.yaml`. AC-3 is the one carrying real risk; treat the other four
> as bounded.

---
_Generated by `pf context create story uf1-13` from the sprint YAML._
