---
story_id: "jt11-7"
jira_key: "jt11-7"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-7: CLFDES cliff-crumble animation (deferred polish from jt11-5)

## Story Details
- **ID:** jt11-7
- **Jira Key:** jt11-7
- **Workflow:** tdd
- **Stack Parent:** jt11-5 (DONE - prerequisite satisfied)
- **Branch Strategy:** gitflow (feat/jt11-7-clfdes-cliff-crumble)

## Story Description

CLFDES cliff-crumble animation (deferred polish from jt11-5): the ROM crumble CLFDES (JOUSTRV4.SRC:4562-4599) is wholly absent - dissolve.ts is a false friend (it is the ptero/baiter death ASH animation, dissolve.ts:3-13; grep CLFDES hits only the arena-state.ts:62-63 comment 'both jt3-later'). After jt11-5 makes destroyed cliffs vanish from physics and render, this story adds the visible crumble transition between intact and gone. Requires jt11-5.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T11:18:04Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T07:08:37Z | - | - |
| red | 2026-08-13T07:08:37Z | 2026-08-13T10:23:31Z | 3h 14m |
| green | 2026-08-13T10:23:31Z | 2026-08-13T10:32:44Z | 9m 13s |
| review | 2026-08-13T10:32:44Z | 2026-08-13T10:48:01Z | 15m 17s |
| green | 2026-08-13T10:48:01Z | 2026-08-13T10:58:54Z | 10m 53s |
| review | 2026-08-13T10:58:54Z | 2026-08-13T11:08:55Z | 10m 1s |
| green | 2026-08-13T11:08:55Z | 2026-08-13T11:11:36Z | 2m 41s |
| review | 2026-08-13T11:11:36Z | 2026-08-13T11:18:04Z | 6m 28s |
| finish | 2026-08-13T11:18:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the five FIRSTI debris images CLFDES draws through
  CLIFER (`JOUSTRV4.SRC:4578-4592`) are not transcribed — the RED pins the debris
  TIMELINE (5 frames @ 8 naps) and PRESENCE, not the debris pixels. A clean follow-up
  can transcribe the FIRSTI images and paint them (the CLIFER decoder already exists
  from jt3-6's `expandAsh`). Affects a future crumble-render story; the CrumbleState's
  `phase`/`frame` already carry what such a render needs. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (TEA's deferred-debris Improvement stands —
  the `kind:'crumble'` op carries `cliff`/`phase`/`frame`, so a debris-render follow-up needs
  no state change, only the FIRSTI pixel transcription and a shell painter.)

### Reviewer (review)
- No upstream findings during review. F1 (the missing shell painter) is IN-story scope, not an
  upstream defect — routed to rework. Corroborated by reviewer-security's "no shell consumer yet."

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pixel-accurate debris deferred**
  - Spec source: context-story-jt11-7.md, AC-1 / AC-4 ("the visible crumble transition")
  - Spec text: "adds the visible crumble transition between intact and gone"
  - Implementation: the RED pins the crumble TIMELINE (5 shakes @20, 5 debris @8) and the
    drawList PRESENCE overlay, NOT pixel-accurate debris (decoding the five FIRSTI images
    through CLIFER).
  - Rationale: transcribing/locating the FIRSTI debris images is a large pixel effort out
    of proportion to a 3pt story; the "visible transition" is satisfied by the shake+debris
    overlay timeline. Filed as a follow-up (Delivery Findings).
  - Severity: minor
  - Forward impact: a follow-up story transcribes the FIRSTI debris and paints via CLIFER.
- **AC-4 wiring pinned at the drawList boundary, not the sim carrier**
  - Spec source: context-story-jt11-7.md, AC-4
  - Spec text: "surfaces a kind:'crumble' overlay through drawList ... then settles to gone"
  - Implementation: AC-4 asserts the observable (overlay present after destruction, gone
    after the CLFDES budget, jt11-5 arena records untouched, CLIF5 never crumbles) and
    leaves the exact carrier for crumble state (process vs sibling field on SimState) to Dev.
  - Rationale: a cliff is not a moving entity like the dissolve's ptero, so the carrier is a
    genuine design choice; pinning drawList observables keeps the test faithful without
    dictating internals.
  - Severity: minor
  - Forward impact: none — Dev picks the representation within the drawList contract.

### Dev (implementation)
- **Crumble carried as an optional SimState field; overlay geometry from the cliff record**
  - Spec source: crumble-wiring-jt11-7.test.ts, AC-4 (TEA's "carrier is Dev's" deviation)
  - Spec text: the tests pin the drawList observable (op kind/cliff/phase/frame, present→gone),
    not the sim carrier nor the op's x/y
  - Implementation: crumbles ride SimState as `crumbles?: readonly CrumbleState[]` (the
    `pendingPteros`/`pendingEnemies` optional-field precedent) — spawned in the existing
    newly-destroyed-cliff loop (beside the `cliff-destroyed` cue), stepped once per `stepSim`,
    dropped on `done`. The `kind:'crumble'` op takes x/y/height from the cliff's primary
    BACKGROUND_RECORD dest (the same projection arena ops use) and its own z-layer via
    `isForegroundArena`.
  - Rationale: reuses the established optional-field + newly-destroyed-detection seams (no new
    scheduler machinery); DrawOp requires x/y, and the record dest puts the crumble where the
    cliff was. No test constrains the geometry, so this is the minimal faithful fill.
  - Severity: minor
  - Forward impact: a debris-render follow-up can refine the geometry; the op already carries
    cliff/phase/frame.
- **Procedural `paintCrumble` shell render (rework round 1, F1 fix)**
  - Spec source: Reviewer F1 remediation + TEA "Pixel-accurate debris deferred"
  - Spec text: "add a paintCrumble path in main.ts … shake … debris … pin it with a shell test"
  - Implementation: `render.ts` `paintCrumble` draws a PROCEDURAL fillRect crumble (shake: the
    footprint jittered up on alternate frames; debris: five→one thinning, falling slices),
    tinted `colours[CRUMBLE_FLAVOR & 0x0f]` — the $2A flavor byte's low nibble — NOT the ROM's
    five FIRSTI debris images (still deferred).
  - Rationale: makes the transition genuinely visible + animated within the 3pt budget; the
    $2A nibble is the cited flavor byte (JOUSTRV4.SRC:4570), not an invented colour; the render
    denylist scan stays clean (palette index, no hex literal).
  - Severity: minor
  - Forward impact: the deferred FIRSTI-debris follow-up replaces the procedural slices with the
    real debris images (the CLIFER decoder already exists).

## Dev Assessment (rework round 1)

**Fixed the Reviewer's findings:**
- F1 (HIGH) → `render.ts` `paintCrumble` + `main.ts` paintSim dispatch (`kind === 'crumble'`) +
  new `tests/render-crumble-jt11-7.test.ts` pinning the paint seam AND the main.ts wiring.
- F2/F4 → `DrawOp` (sim.ts + sim-contract) now carries `kind:'crumble'` + `cliff`/`phase`
  (+ shared `frame`); wiring test filters `DrawOp` directly; removed `CrumbleDrawOp` and the
  stale casts.
- F3 → DrawOp `cliff`/`phase` jsdoc reworded (frame is shared with dissolve).
- F5 → guarded `instrAt(N)!` via `operandAt()`.
- F6 → drawList skips a crumble with no matching record (no phantom 0,0 paint).

**Tests:** full joust project 3583/3583 GREEN (added the shell test). **lint** clean.
**build** ok. **Branch:** feat/jt11-7-clfdes-cliff-crumble (pushed `39d1ae99`).
**Handoff:** back to Reviewer for re-review.

## TEA Assessment

**Tests Required:** Yes
**Reason:** CLFDES cliff-crumble is net-new behaviour with a ROM ground truth.

**Test Files:**
- `plugins/joust/tests/helpers/crumble-contract.ts` — the pure-core state-machine seam
  (dissolve precedent) + the `kind:'crumble'` drawList overlay op shape.
- `plugins/joust/tests/crumble-jt11-7.test.ts` — AC-1/2/3/5(core): the CLFDES two-phase
  timeline, the phase walk to `done`, purity + determinism, false-friend module guard.
- `plugins/joust/tests/crumble-source-jt11-7.test.ts` — AC-1(fidelity)/AC-5: independent
  CLFDES re-derivation from the vendored ROM (skipIf) + JT117-* claims coverage.
- `plugins/joust/tests/crumble-wiring-jt11-7.test.ts` — AC-4: the visible transition
  through `drawList` (additive overlay, jt11-5 non-regression, settles to gone, CLIF5 never).

**Tests Written:** 45 tests across 5 AC groups (36 RED, 9 premise/no-regression guards)
**Status:** RED (failing — ready for Dev)

### Rule Coverage (TypeScript lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test quality (no vacuous asserts) | all — every assert carries a message + a mutation guard | failing |
| #14 state-machine edges computed per-branch | `stepCrumble walks all five debris frames…`, `each SHAKE/DEBRIS frame held N naps`, `debris NEVER precedes shake` | failing |
| #15 source guard matches the CLAIM, not a token | `crumble module re-derives from CLFDES` (independent parser, double-entry), `every JT117-* verbatim matches` | failing/guard |
| #18 apparatus fails-by-passing | source companion re-derives values independently (not "value IS the expectation") | passing (premise) |
| purity (jt1-7 scanner) | auto-swept once `src/core/crumble.ts` lands; AC-3 pins no-mutation/determinism | pending module |

**Rules checked:** the applicable core-state-machine + source-guard rules (#8/#14/#15/#18 + purity).
**Self-check:** 0 vacuous tests — each of the 9 green tests is an intentional premise/no-regression guard (CLFDES source facts, jt11-5 stays-green, CLIF5-never-crumbles, verbatim-guard-has-teeth).

**Verification (this session):**
- `npx vitest run --project joust` → 3 files fail (36 RED), 3541 pass; only crumble AC failures red.
- `npm run lint` (tsc --noEmit, repo-wide) → clean.
- Two meta-guards reconciled to my own new files: `comment-line-refs` (converted 4 `<our>.ts:line`
  refs to symbol names) and `audio-seam-scope` suite count (README 180→183).

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/crumble.ts` (new) — the pure-core CLFDES state machine
  (`startCrumble`/`stepCrumble` + the five constants). No shell/clock/entropy import.
- `plugins/joust/docs/rom-study/claims/crumble.json` (new) — 10 JT117-* claims pinning the
  CLFDES laws (:4563/4564/4567/4570/4572/4575/4576/4579/4594/4599), verbatim byte-exact.
- `plugins/joust/src/core/sim.ts` — the wiring: `crumbles?` on SimState; spawn on a newly-
  destroyed cliff + step-and-retire each frame in `stepSim`; a `kind:'crumble'` overlay in
  `drawList` (additive, over the vacated space); DrawOp gains `'crumble'` + `cliff`/`phase`.
- `plugins/joust/README.md` — derived claim count 1083→1093 (my 10 new claims).

**Tests:** 45/45 crumble tests passing; full joust project 3579/3579 GREEN.
**Verification:** `npx vitest run --project joust` GREEN; `npm run lint` (tsc --noEmit) clean;
`node scripts/build-app.mjs joust` builds. No regression — jt11-5's arena-record omission and
the purity scanner (now sweeping crumble.ts) both green.
**Branch:** feat/jt11-7-clfdes-cliff-crumble (to be pushed)

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (3579 green, lint clean, build ok, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see Rule Compliance) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (LOW doc) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A (pure core confirmed; independently noted "no shell consumer yet" — corroborates F1) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (wiring is minimal, no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 7 | confirmed 6, folded 1 (design note) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 8 confirmed (1 High, 1 Medium, 6 Low/cleanup), 0 dismissed, 1 design note

### Confirmed Findings

- **F1 [WIRING] — HIGH — the "visible" crumble transition renders NOTHING.** `drawList` emits
  `kind:'crumble'` overlay ops, but no shell code consumes them. The render loop
  (`main.ts` `paintSim`) special-cases only `op.name === 'ASH1R'` → `paintDissolve`; everything
  else falls to `blitOp`, which for a crumble op (`name` = the cliff, e.g. `'CLIF2'`) calls
  `blit('CLIF2', …)` — and `blit` no-ops on a missing atlas block (`if (!slot) return`), because
  the atlas is keyed by SOURCE names (`CSRC2`), not cliff names. Nothing reads `op.phase`/
  `op.frame`. Net effect for a player: a destroyed cliff still blinks out instantly (jt11-5
  behaviour) — the shake→debris animation is never drawn. Grep confirms ZERO `crumble`
  references in `src/shell/` or `main.ts`. Corroborated independently by reviewer-security
  ("no shell rendering code was touched … the new fields have no consumer yet"). This is the
  story's central deliverable ("the VISIBLE crumble transition") unmet at the player-facing
  layer — a computed-but-unconsumed feature. The core-only tests (which assert `drawList`, a
  pure function, not the canvas) cannot see it — the exact blind spot of a same-session
  TEA≡Dev≡Reviewer pipeline.
  **Remediation:** add a `paintCrumble` path in `main.ts` (analogous to `paintDissolve`) that
  reads `phase`/`frame` — shake: redraw the cliff's `CSRC*` block tinted `$2A` + jittered;
  debris: a placeholder debris mark — and pin it with a SHELL-level test so visibility is
  guarded, not just the core `drawList`. Testable → rework routes to `red` (TEA seeds the
  shell-visibility test first).
- **F2 [RULE #18] — MEDIUM — `CrumbleDrawOp` exported but unused; wiring test re-declares a looser
  `MaybeCrumbleOp`.** (`crumble-contract.ts:92`; `crumble-wiring-jt11-7.test.ts:50-55`.) Two
  shapes for one concept can drift from `sim.ts`'s real `DrawOp` with nothing catching it. Fix
  in rework: have the shell painter / wiring test consume the canonical `CrumbleDrawOp`, or
  remove it and keep one shape.
- **F3 [DOC] — LOW — DrawOp `cliff`/`phase` jsdoc imprecise** (`sim.ts`, the new field comment):
  "both undefined on every non-crumble op" is false for `frame`, which is shared with the
  dissolve op kind. Reword to scope the claim to `cliff`/`phase`.
- **F4 [RULE #1] — LOW — unnecessary/stale casts** (`crumble-jt11-7.test.ts:236` double-cast;
  `crumble-wiring-jt11-7.test.ts:57,59` stale RED-phase `as unknown as MaybeCrumbleOp[]`, now
  unnecessary since `DrawOp` carries `cliff?`/`phase?`). Drop them.
- **F5 [RULE #1] — LOW — `instrAt(N)!.operand` non-null assertions without a guard**
  (`crumble-source-jt11-7.test.ts:114,130,141`): a null parse throws a bare TypeError instead of
  a readable assertion failure. Add a guard or a readable non-null assert.
- **F6 [design note] — INFO — dead fallback in the crumble drawList loop** (`sim.ts` the
  `BACKGROUND_RECORDS.find(...)` `rec ? … : 0/undefined`): currently unreachable (all four
  destructible cliffs have primary records), but would silently draw at `(0,0)` if it ever
  fired. Optionally harden to skip/throw. Not blocking.

### Devil's Advocate

Assume this is broken. The loudest crack: **the story promises a *visible* transition and ships
an invisible one.** A player who destroys a cliff sees exactly what jt11-5 already gave them — an
instant vanish — because the sim's new `kind:'crumble'` ops hit `blitOp`, miss the atlas, and
paint nothing. Every green test is green about the wrong layer: they assert the *data*
(`drawList`) not the *pixels*. A confused reviewer trusting "45 tests pass" would ship a no-op.
What would a malicious/stressed input do? A wave that rebuilds a cliff mid-crumble leaves an
in-flight `CrumbleState` whose cliff is no longer in `destroyedCliffs`; the crumble keeps
animating (correct per CLFDES running to completion) but the cliff's arena record is drawn again
— so for those frames the shell would show the intact cliff AND (once F1 is fixed) a crumble
overlay on top. Rare (waves are >>140 frames apart) but real; the fix's painter should tolerate
it. What about the geometry fallback? If a cliff id ever stops matching a `BACKGROUND_RECORD`
name, the overlay silently relocates to `(0,0)` with `height: undefined` — a phantom in the top
corner rather than a loud failure (F6). Could the crumble list leak? No — `stepCrumble` is
called every frame and `done` entries are filtered out; bounded to ≤4 cliffs. Could determinism
break? No — `stepCrumble` is pure, `crumbles` derives only from prior state, purity scanner green.
Could a duplicate crumble stack? Yes, in principle (rebuild→redestroy inside 140 frames), harmless
and self-limiting. None of these are blocking except F1 — but F1 alone is the whole point of the
story, so it blocks.

### Rule Compliance (lang-review typescript.md)

Mapped to the checklist via reviewer-rule-checker (34 rules, 61 instances, mutation-tested the
load-bearing guards). Clean on #2,3,4,5,7-13,16,19-30 and the ADDITIONAL rules (#31 purity, #32
citation gate, #33 determinism, #34 CLFDES constants — all verified byte-for-byte against the
ROM). Violations: #1 (F4/F5 casts + non-null asserts), #18 (F2 CrumbleDrawOp unused). Disabled
subagents' domains assessed here by the Reviewer: **edge** (F6 + the rebuild-mid-crumble case,
non-blocking), **type-design** (DrawOp union extension is sound; the F2 duplication is the only
type smell), **simplifier** (the wiring reuses existing seams — the newly-destroyed loop, the
optional-field precedent — no over-engineering), **test-analyzer** (tests are non-vacuous and
mutation-resistant per #14/#15/#26/#29, but they pin the CORE `drawList` and leave the SHELL paint
untested — the F1 coverage gap), **silent-failure** (F6 is the one silent-fallback).

### Reviewer (deviation audit)

- TEA "Pixel-accurate debris deferred" — **ACCEPTED.** Deferring the FIRSTI pixel transcription is
  proportionate; but note it does not license rendering *nothing* (F1) — a placeholder paint is
  still required for "visible."
- TEA "AC-4 wiring pinned at the drawList boundary, not the sim carrier" — **FLAGGED.** This is the
  root of F1's blind spot: pinning AC-4 only at the `drawList` (core) boundary and never at the
  shell canvas is exactly why an unrendered overlay passed. The rework must add a shell-level
  visibility test.
- Dev "Crumble carried as an optional SimState field; overlay geometry from the cliff record" —
  **ACCEPTED.** Sound reuse of the `pendingPteros` precedent and the arena-op projection.

## Reviewer Assessment

**Verdict:** REJECTED

**Summary:** The core CLFDES state machine, its ROM provenance (10 JT117-* claims, byte-exact,
mutation-tested), and the deterministic `drawList` wiring are correct and well-tested. But the
story's central deliverable — the **visible** crumble transition — is not rendered: the
`kind:'crumble'` overlay ops have no shell consumer, so a player still sees an instant vanish.
That is a HIGH, blocking gap. Plus one MEDIUM type-duplication and four LOW cleanups.

**Specialist correlation:** **[DOC]** comment-analyzer → F3 (imprecise jsdoc); **[RULE]** rule-checker
→ F2/F4/F5 (unused type, stale casts, unguarded non-null); **[SEC]** security → clean (pure core,
bounded growth, no injection). F1 (the shell-consumer gap) was caught by cross-boundary Reviewer
analysis, corroborated by **[SEC]**'s "no shell consumer yet".

| Severity | Finding | Location |
|----------|---------|----------|
| HIGH | F1 — crumble overlay has no shell consumer; "visible" transition paints nothing | `main.ts` paintSim/blitOp; `src/shell/*` (absent) |
| MEDIUM | F2 — `CrumbleDrawOp` exported-but-unused; wiring test re-declares `MaybeCrumbleOp` | `crumble-contract.ts:92`, `crumble-wiring-jt11-7.test.ts:50-59` |
| LOW | F3 — DrawOp `cliff`/`phase` jsdoc imprecise re: `frame` | `sim.ts` DrawOp field comment |
| LOW | F4 — unnecessary/stale casts | `crumble-jt11-7.test.ts:236`, `crumble-wiring-jt11-7.test.ts:57,59` |
| LOW | F5 — `instrAt(N)!` non-null without guard | `crumble-source-jt11-7.test.ts:114,130,141` |
| INFO | F6 — dead `(0,0)` geometry fallback in the crumble drawList loop | `sim.ts` drawList crumble loop |

**Blocking:** F1 (High). **Rework route:** `red` (TEA seeds a shell-visibility test), then Dev
wires `paintCrumble` + clears F2–F6.

**Handoff:** REJECTED → rework (TEA/red).
---

## Subagent Results (re-review, round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (184 files, 3583 green, lint clean, build ok, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | domain assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (R1, R3 doc) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | domain assessed by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A (paintCrumble shell-only; colours[10] in-range; no injection; crumbles bounded) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 2 (+F5 partial) | confirmed R1, R2; F2/F3/F4/F6 verified RESOLVED |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 3 confirmed (0 High, 1 Medium, 2 Low) — all traceable to incomplete round-1 rework fixes.

### Round-2 findings (all non-blocking, but incomplete-fix quality)

- **R1 [RULE #1] — LOW — F5 only half-fixed.** `operandAt()` was applied to the GATE block but
  three `ins!.operand` non-null asserts remain in the STRUCTURE block
  (`crumble-source-jt11-7.test.ts:88,96,103`). Reachable-safe (a preceding `expect(ins?.op)`
  throws first), but it is the exact pattern the prior review's F5 named. Finish the fix.
- **R2 [RULE #15/#25] — MEDIUM (mutation-confirmed) — the F1 wiring guard is defeatable.**
  `render-crumble-jt11-7.test.ts`'s "main.ts WIRES it" assertion is a whole-file `/paintCrumble/`
  + `/kind === 'crumble'/` regex; deleting the dispatch reddens it (good), but replacing the
  dispatch with a COMMENT carrying both substrings PASSES all 4 tests. A regression guard that a
  decoy comment defeats gives false confidence (the repo's comment-stripping-guard trap). Anchor
  it to the actual call (e.g. match `paintCrumble(` as a call, and/or strip comments / bound the
  scan to the paintSim body).
- **R3 [DOC] — LOW — two contradictions from the incomplete F3 fix** (`sim.ts`): the `frame?`
  field docstring still says "undefined on every non-dissolve op" (now false — crumble ops carry
  `frame`), and the new `cliff`/`phase` comment says the shared `frame` is "above"/"see its note
  above" when the field is declared BELOW. Fix both to match the corrected sim-contract copy.

### Devil's Advocate (round 2)

The feature itself now survives scrutiny: preflight, security, and the rule-checker all confirm
the crumble PAINTS (fillRect seam) and is WIRED (main.ts dispatch), F2/F3/F4/F6 are resolved, the
shell code is pure-boundary-clean, the palette index is in range, and there is no injection or
unbounded growth. The remaining cracks are all in the SAFETY NET, not the feature — and that is
precisely where this repo refuses to compromise: a guard that passes on a decoy comment (R2) is
worse than no guard, because it advertises protection it does not provide; a docstring that
asserts the opposite of what the code does (R3) is the rot the citation gates exist to kill; and a
prior finding fixed in one block but not its sibling (R1) is the "retirement applied where the AC
named it and nowhere else" smell. None bite at runtime, but all three are cheap, and shipping them
in a repo whose identity is guard integrity would be the wrong call.

## Reviewer Assessment (round 2)

**Verdict:** REJECTED

| Severity | Finding | Location |
|----------|---------|----------|
| MEDIUM | R2 — F1 wiring guard defeatable by a decoy comment (mutation-confirmed) | `render-crumble-jt11-7.test.ts` main.ts-wiring assertion |
| LOW | R1 — F5 half-fixed: 3 `ins!.operand` remain | `crumble-source-jt11-7.test.ts:88,96,103` |
| LOW | R3 — two doc contradictions from the incomplete F3 fix | `sim.ts` DrawOp `frame?` docstring + cliff/phase comment |

**Not blocking by the strict Critical/High rule — but all three are incomplete-fix cleanups from
round 1, cheap to close, and R2 is a false-security guard this repo will not ship.** Rework route:
`green` (Dev — all test/comment cleanup, no new behavior).

**Handoff:** REJECTED → rework (Dev/green).
## Dev Assessment (rework round 2)

Fixed all three round-2 findings (cleanup only, no behavior change):
- **R2** → strengthened the render-crumble main.ts-wiring guard: strip comments, anchor to the
  live `kind === 'crumble') paintCrumble(` dispatch. Mutation-verified — the decoy-comment case
  that defeated the old whole-file token scan now reddens.
- **R1** → finished F5: the 3 remaining `ins!.operand` in the STRUCTURE block now use `operandAt()`.
- **R3** → fixed the two `sim.ts` doc contradictions (frame? docstring now SHARED; above→below).

Full joust project 3583/3583 GREEN; lint clean; builds. Pushed `c90c5755`.
**Handoff:** back to Reviewer for re-review (round 3).
---

## Subagent Results (re-review, round 3)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (184 files, 3583 green, lint clean, build ok, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | domain assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (all 3 doc fixes verified resolved; R1 confirmed) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | domain assessed by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A (no new surface; comment-strip regex linear-time, no ReDoS) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (R1/R2/R3 RESOLVED, R2 mutation-verified live; 0 new violations) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 — every round-1 and round-2 finding resolved and independently verified.

### Round-3 verification

- **R1 (F5)** RESOLVED — 0 `ins!` remain in crumble-source-jt11-7.test.ts (all → `operandAt()`).
- **R2 (defeatable guard)** RESOLVED — mutation-verified LIVE by rule-checker against `src/main.ts`:
  deleting the dispatch reddens the guard AND replacing it with a decoy comment reddens it too
  (comment-immunity restored). Tree confirmed clean after each revert.
- **R3 (doc contradictions)** RESOLVED — the `frame?` docstring now says SHARED by dissolve+crumble;
  the cliff/phase comment's direction corrected to "below". No self-contradiction remains.
- No new violations in the round-2 delta.

### Devil's Advocate (round 3)

Two rounds of rework closed a real cluster: the feature was invisible (F1), then its safety net was
defeatable (R2) and its prior fixes half-applied (R1/R3). What remains to doubt? The crumble render
is PROCEDURAL, not the ROM's FIRSTI debris — but that is a documented, accepted deferral (a
follow-up Improvement is filed, and the op already carries phase/frame for it). The $2A tint is a
cited byte taken as a palette index, defensible and denylist-clean. A rebuild-mid-crumble could
briefly draw the intact cliff plus its overlay — rare (waves ≫140 frames), harmless, pre-existing to
the fix. The wiring guard now anchors to the live dispatch shape and was mutation-proven against the
exact evasion that beat it before. Purity, determinism, bounded growth, and no-injection are all
independently confirmed. Nothing blocking survives; the residuals are the accepted debris-fidelity
follow-up, nothing more.

### Reviewer (deviation audit)

- TEA "Pixel-accurate debris deferred" — **ACCEPTED** (a follow-up Improvement is filed; the op
  carries phase/frame so the FIRSTI-debris story needs no state change).
- TEA "AC-4 wiring pinned at the drawList boundary" — **FLAGGED (now addressed)**: this was the root
  of F1's blind spot; the rework added the shell painter AND a shell-level, mutation-proven
  visibility guard, so the gap it flagged is closed.
- Dev "Crumble carried as an optional SimState field" — **ACCEPTED** (sound reuse of the
  pendingPteros precedent).
- Dev "Procedural paintCrumble shell render (round 1 F1 fix)" — **ACCEPTED** (makes the transition
  genuinely visible within budget; cited $2A tint; FIRSTI-debris is the filed follow-up).

## Reviewer Assessment (round 3)

**Verdict:** APPROVED

The CLFDES cliff-crumble is complete and correct: a pure-core state machine (5 shakes @20, 5 debris
@8, $2A tint — byte-exact to JOUSTRV4.SRC:4562-4599, 10 JT117-* claims, mutation-tested), a
deterministic drawList overlay that does NOT regress jt11-5's instant arena-record omission, and a
shell `paintCrumble` that makes the transition genuinely VISIBLE and animated — pinned by a
comment-immune wiring guard. All findings from two rework rounds are resolved and independently
verified (preflight, security, comment-analyzer, rule-checker all clean). Full joust suite
3583/3583 GREEN, lint clean, builds. Pixel-accurate FIRSTI debris is the one accepted, filed
deferral.

**Specialist correlation (round 3, all clean):**
- **[DOC]** reviewer-comment-analyzer — clean: all three round-2 doc fixes verified (frame? docstring
  now SHARED, cliff/phase direction corrected); no new stale/misleading comments; ROM citations exact.
- **[RULE]** reviewer-rule-checker — clean: R1/R2/R3 all RESOLVED (R2 mutation-verified live — delete
  AND decoy-comment both redden the guard); 0 new typescript.md violations in the delta.
- **[SEC]** reviewer-security — clean: no new attack surface; the test-side comment-stripping regex is
  linear-time (no ReDoS); core purity/determinism and bounded crumble growth intact.

**Handoff:** APPROVED → SM for finish.