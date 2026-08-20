---
story_id: pt1-26
jira_key: pt1-26
epic: pt1
workflow: tdd
---
# Story pt1-26: defender: flipping the ship around does not flip the sprite — it always faces right

## Story Details
- **ID:** pt1-26
- **Jira Key:** pt1-26
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-26-defender-ship-sprite-facing-flip
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T21:36:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T21:00:57Z | 2026-08-20T21:03:26Z | 2m 29s |
| red | 2026-08-20T21:03:26Z | 2026-08-20T21:09:55Z | 6m 29s |
| green | 2026-08-20T21:09:55Z | 2026-08-20T21:13:49Z | 3m 54s |
| review | 2026-08-20T21:13:49Z | 2026-08-20T21:36:54Z | 23m 5s |
| finish | 2026-08-20T21:36:54Z | - | - |

## Background

The facing is fully tracked: `plugins/defender/src/core/ship.ts` `stepReverse()` flips `state.ship.facing` between 'right'/'left' (REV debounce, DEFA7.SRC:3155-3171). Confirmed correct.

The RENDER ignores it. In `plugins/defender/src/core/scene.ts` the ship blit is at **line 455** (the epic-YAML line 442 is stale): `blitObject(fb, require_(OBJECTS, SHIP_OBJECT, 'object'), state.ship.x, state.ship.y)` where `SHIP_OBJECT = 'PLAPIC'`. There is NO facing branch — PLAPIC is always blitted right-facing.

`blitObject(fb, obj, x, y)` in `plugins/defender/src/core/objects.ts` has NO flip parameter (signature at objects.ts:43).

`objects-data.ts` PLAPIC is a single width:8 height:6 right-facing raster cell (DEFB6.SRC PLAPIC line 1961) with no mirrored variant.

Precedent to cite: `drawLaserStreak(fb, headX, y, facing)` in scene.ts:183 ALREADY threads facing (dir = facing === 'right' ? -1 : 1) — the laser respects facing while the ship sprite does not. This is the in-file idiom for reading facing at render.

## SM Setup Assessment (Ruby Rhod)

Premise-checked the epic-YAML description against the CURRENT tree before setup (a description
that quotes file/line state is a timestamped claim). Result: **fully confirmed, real bug.**
- `stepReverse` (ship.ts) flips `state.ship.facing` correctly — the facing IS tracked.
- The render ignores it: the ship blit (scene.ts, the pointer read `455` on arrival, not the
  epic's `442`) calls `blitObject(fb, PLAPIC, x, y)` with no facing branch; `blitObject`
  (objects.ts:43) takes no flip param; PLAPIC (objects-data.ts, DEFB6.SRC:1961) is a lone
  right-facing 8×6 cell.
- Only drift is line numbers — substance exact. Background carries the corrected `455`; ACs
  copied verbatim from the epic (they were good).
- In-file idiom for TEA/Dev: `drawLaserStreak(..., facing)` (scene.ts:183) already threads
  facing at render — the laser respects facing while the ship sprite doesn't. Mirror that.
- Purity guard: defender's core-boundary test scans `src/core/` text; the fix lives in the
  pure `composeFrame` path in core/scene.ts — keep it clock-free.

Sibling probes clean at setup (no remote branch, only a-1 on pt1-22). Claim pushed:
`feat/pt1-26-defender-ship-sprite-facing-flip` (commit 27d3d64c, epic stamp + context).
Story stamped `in_progress`. Handing off to TEA (Leeloo) for RED.

## TEA Assessment (Leeloo) — RED

Story carried **no acceptance criteria** in the YAML — I defined them and pinned each with a
failing test. New file: `plugins/defender/tests/pt1-26-ship-facing-flip.test.ts` (committed
896775a2). Black-box over `composeFrame` (the df7-8/df5-7 precedent) — GREEN may add a flip
flag to `blitObject` OR ship a mirrored sprite; either satisfies these. RED verified by
testing-runner: compiles clean, 3 pass / 2 fail, exactly the intended shape.

**Acceptance criteria (TEA-defined):**
- **AC1 (control, GREEN on arrival):** facing `right` draws PLAPIC in its canonical,
  UN-mirrored orientation at the ship position. Guards the inverse regression (a fix that
  mirrors unconditionally or inverts the facing test).
- **AC2 (RED — the fix):** facing `left` draws PLAPIC as its exact horizontal mirror — every
  foreground pixel at local `px` appears at `W-1-px` (W = width*2 = 16). Pinning `W-1-px`
  (not `W-px`) also rejects an off-by-one flip that clips one column.
- **AC3 (RED — owner report, coarse):** the left-facing and right-facing frames DIFFER inside
  the ship box. Directly encodes "flipping the ship does not flip the sprite."
- **AC4:** the left-facing render is deterministic (same state → same frame) — no clock/entropy
  strobe; core purity is also swept by `tests/purity.test.ts`.

**RED evidence (testing-runner, RUN_ID pt1-26-tea-red):**
- AC2 FAIL: `left-facing ship not mirrored at local (2,0) → expected index 6 at mirror column`
  (received 0 — background; the sprite is still at the un-mirrored column).
- AC3 FAIL: `0 differing pixels` — facing is read nowhere in the render today.
- PASS: precondition (PLAPIC asymmetric), AC1, AC4.

**Non-vacuity guards:** the mirror oracle is the real, already-tested `blitObject(PLAPIC)` —
NOT a hand-decoded literal (avoids reimplementing the column-major nibble decode; lang-review
TS #18/#26). A precondition test asserts PLAPIC's mirror ≠ PLAPIC from the real OBJECTS data,
so AC2/AC3 cannot pass vacuously on a symmetric sprite. Reads are restricted to the ship's
FOREGROUND pixels (the ship is blitted last over its play-field box; landers:[] and no lasers),
so a read is the ship's own index, never a star behind a transparent nibble.

### Rule Coverage (lang-review/typescript.md)
- **#15 / #25 (source-text token guards):** avoided by construction — every assertion is
  BEHAVIOURAL (pixel indices out of `composeFrame`), no `toMatch`/`toContain` over source text.
- **#18 (apparatus fails by passing) / #26 (all-local assertion):** oracle derived from real
  `blitObject(PLAPIC)` + real `composeFrame` (two independent code paths); mirror is the only
  in-test transform; asymmetry precondition anchors non-vacuity to real sprite data.
- **#15 mutation-tested:** AC2/AC3 are RED because the mechanism is absent; when GREEN adds the
  flip, deleting it reverts to right-facing and both redden again — load-bearing.
- **#4 / #21 (`??`/degenerate numerics), #14 (edges in one branch):** N/A — no numeric input
  boundary or state-machine edge in this render change.

**Guidance for Dev (Korben):** the in-file idiom is `drawLaserStreak(fb, x, y, facing)`
(scene.ts) which already threads `facing` at render. Mirror that at the ship blit
(scene.ts:455): select the mirror when `state.ship.facing === 'left'`. Fix lives in the pure
`composeFrame` path (core/scene.ts) — keep it clock-free (purity sweep). Do NOT touch the
right-facing path (AC1). Verify the full defender suite stays green afterward.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/objects.ts` — `blitObject` gains an optional `flip = false`
  param that horizontally mirrors the cell within its `width×2`-pixel span
  (`localX → spanX-1-localX`), top-left anchor unchanged. Existing 4-arg call sites and the
  `objects-blit` module-shape interface are untouched (optional trailing param).
- `plugins/defender/src/core/scene.ts` — the ship blit (`composeFrame`) passes
  `state.ship.facing === 'left'`, so PLAPIC (a right-facing cell) is mirrored when the tracked
  facing is left. Same render seam `drawLaserStreak` already reads. Pure core, clock-free.

**Approach:** Chose the flip-flag option (one of the two the story named) over a second
mirrored sprite — no new ROM data, one reusable seam, matches TEA's black-box oracle exactly
(`W-1-px`). Minimal 12-line change.

**Tests:** defender 1092/1092 passing (GREEN); pt1-26 all five (precondition, AC1, AC2, AC3,
AC4) green. `npm run lint` (tsc --noEmit) clean fleet-wide — the signature change is type-safe.
**Verified by:** testing-runner, RUN_ID pt1-26-dev-green. No regressions in objects-blit,
effects, still-frame, render, or purity.
**Branch:** feat/pt1-26-defender-ship-sprite-facing-flip (pushed, 44e2acc2)

**Handoff:** To next phase (verify / review).

## Subagent Results

All nine reviewer subagents are disabled via `workflow.reviewer_subagents` (config.local.yaml) —
the fleet is disproportionate for a single optional-parameter mirror flag, so the user turned them
off for this review. Zorg assessed every domain first-hand on the 12-line diff (see Reviewer
Assessment and the `[TAG]` coverage below).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No — disabled | disabled | N/A | Disabled via settings; tests/lint self-assessed: defender 1092/1092 green, `npm run lint` clean (RUN_ID pt1-26-dev-green) |
| 2 | reviewer-edge-hunter | No — disabled | disabled | N/A | Disabled via settings; boundary self-checked (mirror bijection, no off-by-one) |
| 3 | reviewer-silent-failure-hunter | No — disabled | disabled | N/A | Disabled via settings; no error paths added or swallowed |
| 4 | reviewer-test-analyzer | No — disabled | disabled | N/A | Disabled via settings; test quality self-assessed (non-vacuous, exact mirror pin) |
| 5 | reviewer-comment-analyzer | No — disabled | disabled | N/A | Disabled via settings; comments self-assessed (one low nit found) |
| 6 | reviewer-type-design | No — disabled | disabled | N/A | Disabled via settings; optional boolean param, no type invariant touched |
| 7 | reviewer-security | No — disabled | disabled | N/A | Disabled via settings; pure palette-index arithmetic, no input/auth/injection surface |
| 8 | reviewer-simplifier | No — disabled | disabled | N/A | Disabled via settings; already minimal (12 lines) |
| 9 | reviewer-rule-checker | No — disabled | disabled | N/A | Disabled via settings; rules self-assessed — see `### Rule Compliance` (lang-review TS by hand) |

**All received:** Yes (all 9 specialists disabled via settings; every domain assessed first-hand)
**Total findings:** 1 confirmed (low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Scope reviewed:** `plugins/defender/src/core/objects.ts` (+`flip` param), `scene.ts` (ship blit
passes `facing === 'left'`), and `plugins/defender/tests/pt1-26-ship-facing-flip.test.ts`.

**Observations:**
- [VERIFIED] Mirror arithmetic correct — evidence: `objects.ts` `fx = x + (flip ? spanX-1-localX : localX)`,
  `spanX = width*2`, `localX ∈ [0, spanX-1]`. `spanX-1-localX` is a bijection onto the same span:
  `0↔spanX-1`. No column added or dropped, clip unchanged, no off-by-one. Matches the test's
  independent `W-1-px` spec. Rule check: complies with lang-review TS #21 (no degenerate numeric —
  `spanX` from validated `width`); no other project rule governs pure index math.
- [VERIFIED] Backward compatible — evidence: `flip = false` default; all four existing call sites
  (`scene.ts:89/175/464/471`) are 4-arg and unaffected; the `objects-blit` module-shape interface
  casts via `unknown`. Defender 1092/1092 green proves no regression. Rule check: no applicable
  project rule (optional-param addition; CLAUDE.md core/shell boundary untouched).
- [VERIFIED] Purity held — evidence: change is index arithmetic in `core/objects.ts`/`core/scene.ts`,
  no clock/entropy/shell import; `tests/purity.test.ts` green. AC4 (determinism) green. Rule check:
  complies with the CLAUDE.md core-boundary rule (core stays deterministic, shell-free).
- [VERIFIED] Wiring correct — evidence: `state.ship.facing` (ShipView, set by `stepReverse`) is read
  at the ONLY player-ship blit (`scene.ts:455`); the laser already read the same field. The tracked
  state now reaches the render. Rule check: no applicable project rule beyond the render-in-core
  convention (satisfied — draw lives in `composeFrame`).
- [VERIFIED] Tests non-vacuous — evidence: the asymmetry precondition proves PLAPIC's mirror ≠ PLAPIC
  from real OBJECTS data, so AC2/AC3 cannot pass on a no-op; AC2 pins the exact mirror column; the
  oracle is the real `blitObject`, an independent path from production's flip. Rule check: complies
  with lang-review TS #18/#26 (independent oracle, no all-local assertion). [self-assessed, test_analyzer off]
- [LOW] Comment over-reach at `objects.ts` docstring: "The transcribed sprites all face right" is a
  universal (lang-review TS #17) that is not load-bearing and is dubious for near-symmetric cells
  (UFOP, coins). Non-blocking nit; the operative claim (PLAPIC is right-facing; `flip` draws left)
  is correct. Recommend narrowing to "PLAPIC is a right-facing cell" if touched again. [self-assessed, comment_analyzer off]

**Specialist tag coverage (inline review — every domain assessed first-hand):**
- [EDGE] No concern — mirror stays within `[0, spanX-1]`; edge-clip unchanged (both ends map inside the span).
- [SILENT] No concern — no error paths added or swallowed; the three existing `throw` guards are untouched.
- [TEST] Confirmed strength, no defect — non-vacuous (asymmetry precondition + exact mirror pin + independent oracle).
- [DOC] One LOW nit — the "all face right" universal (see [LOW] above); non-blocking.
- [TYPE] No concern — `flip: boolean` with default; no cast, no widened/stringly type, no invariant touched.
- [SEC] No concern — pure palette-index arithmetic; no input, auth, secret, injection, or tenant surface.
- [SIMPLE] No concern — already minimal (12 lines); no dead code or over-engineering; reuses the existing seam.
- [RULE] No violation — see `### Rule Compliance`; all applicable lang-review TS checks PASS (one LOW comment nit).

### Rule Compliance (lang-review/typescript.md — checked by hand)
- **#1 type-safety escapes:** none — no `as any`/`@ts-ignore`/non-null. `flip: boolean` default. PASS.
- **#4 / #21 null & degenerate numerics:** no `??`/`||`; `spanX` derived from validated `obj.width`
  (byte-count invariant already enforced above); `width=0` → zero iterations, no bad index. PASS.
- **#14 edges in one branch:** N/A — no state-machine transition.
- **#15 / #25 source-text token guards:** N/A — tests are behavioural (pixel indices), no source greps.
- **#17 comments assert a mechanism:** one LOW over-reach (above); operative claims verified by the
  passing tests. PASS with nit.
- **#18 / #26 apparatus/all-local assertions:** oracle from real `blitObject` + real `composeFrame`,
  two independent paths; asymmetry precondition anchors non-vacuity. PASS.

### Devil's Advocate
Where could this break? The flip is a horizontal mirror only — if a sprite's authored orientation
were vertical or diagonal, mirroring `localX` would be wrong; but PLAPIC faces horizontally and the
flag is applied to nothing else, so the scope is exactly right. Could the mirror walk off the cell?
`localX` maxes at `spanX-1`, whose mirror is `0` — both ends stay inside `[0, spanX-1]`, so the flip
cannot shift the sprite off its own footprint or into a neighbour; the existing clip still guards the
framebuffer edge. Could a left-facing ship at the screen edge now clip differently than right-facing?
Yes, and correctly — a mirrored sprite occupies the same 16-px span, so its edge-clip is the natural
mirror, which is the desired behaviour, not a bug. Could a caller accidentally trigger the flip? The
param defaults false and is passed `true` only for the ship on `facing === 'left'`; a typo would be a
compile error (boolean). Could the two independent flip formulas (test `W-1-px`, prod `spanX-1-localX`)
both be wrong the same way? They are the same formula by intent — the test is the SPEC and production
must match it; a wrong production formula (`spanX-localX`) would redden AC2. What about a confused
player: reversing rapidly? `stepReverse` debounces (REVFLG); the render just reads the settled facing
each frame, deterministically (AC4). No race, no strobe (ADR-0005 safe — a mirror is not a luminance
event). Nothing here rises above the one low comment nit.

**Decision rationale:** No Critical or High. One Low, non-blocking comment nit. The fix is correct,
minimal, backward-compatible, pure, well-tested, and directly resolves the owner-reported bug.
APPROVED for merge.

## Delivery Findings

No upstream findings during implementation.

## Review Correlation

First GREEN implementation pass — no feedback from any source yet to correlate.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|----------------|-----------------|--------|
| — | — | (none) | — | — | — |

### Signal Summary
- **External findings: 0** — no PR/CI/external reviewer yet (PR is created by SM at finish).
- **CI findings: 0** — no CI run yet; local `npm run lint` clean.
- **Internal findings: 0** — no `## Reviewer Assessment` yet; upstream Delivery Findings empty.
- **New checks added: 0** — nothing to add; the lang-review TS checklist covered this change.

## Design Deviations

### Dev (implementation)
- No deviations from spec. The story named two options ("add a flip flag to blitObject, or a
  mirrored sprite"); I implemented the flip flag, which is within spec, and it satisfies every
  TEA test.