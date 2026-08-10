---
story_id: "pm4-1"
jira_key: "pm4-1"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-1: [SAFETY] Remove the full-screen white level-clear strobe

## Story Details
- **ID:** pm4-1
- **Jira Key:** pm4-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pm4-1-safety-remove-levelclear-strobe
- **PR:** https://github.com/slabgorb/arcade/pull/186

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T06:39:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T06:13:14Z | 2026-08-10T06:16:43Z | 3m 29s |
| red | 2026-08-10T06:16:43Z | 2026-08-10T06:21:29Z | 4m 46s |
| green | 2026-08-10T06:21:29Z | 2026-08-10T06:27:13Z | 5m 44s |
| review | 2026-08-10T06:27:13Z | 2026-08-10T06:39:22Z | 12m 9s |
| finish | 2026-08-10T06:39:22Z | - | - |

## Delivery Findings

No upstream findings

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec.

### Dev (implementation)
- **Removed the level-clear latch entirely instead of retaining it**
  - Spec source: context-story-pm4-1.md, Technical Approach (echoed in the Tea Assessment handoff)
  - Spec text: "Keep the `level-cleared` latch/plumbing (the `flashFramesLeft` counter or an equivalent hold timer) so the successor story pm4-7 (freeze pauses) can layer the proper sim-freeze on top"
  - Implementation: Removed the full-screen paint AND all its supporting code from `overlays.ts` — the `FLASH_HALF_PERIOD/FLASH_CYCLES/FLASH_FRAMES/FLASH_COLOR` constants, the `flashFramesLeft` counter (decl + reset), and the `case 'level-cleared'` in `onEvents`. The overlay no longer reacts to `level-cleared`.
  - Rationale: CLAUDE.md forbids dead code and designing for hypothetical future needs ("delete what's certainly unused"); a decrement-only counter that paints nothing is dead code, `noUnusedLocals` forces removing the now-unused constants, and per the epic design pm4-7 implements the freeze in CORE (game.ts phase machine), not via a shell hold timer.
  - Severity: minor
  - Forward impact: minor — pm4-7 adds its own level-clear pause in core (game.ts) per the design; it must not rely on a shell hold counter (there is none) and must not reintroduce any strobe. Consistent with the epic design, not a broken assumption.

### Reviewer (audit)
- **Removed the level-clear latch entirely instead of retaining it** → ✓ ACCEPTED by Reviewer: agrees with author reasoning and CLAUDE.md's no-dead-code / no-future-proofing rule — a decrement-only counter that paints nothing is dead code, `noUnusedLocals` forces removing the now-unused constants, and pm4-7 implements the level-clear freeze in core per the epic design. No downstream breakage; the level-clear event is still acknowledged via `audio.ts:96`.

## Sm Assessment

**Setup complete — routing to TEA (red).**

- **Story:** pm4-1 [SAFETY, p0] — remove the full-screen white level-clear
  strobe in `plugins/pac-man/src/shell/overlays.ts`. Shell-only, 2pts, tdd.
- **Why first:** photosensitive-epilepsy seizure hazard (boss). Ships
  independently of the pm4 state-machine spine; nothing depends on it.
- **Branch:** `feat/pm4-1-safety-remove-levelclear-strobe` (cut from develop, gitflow).
- **Context:** `sprint/context/context-story-pm4-1.md` enriched with the exact
  offending mechanism (`FLASH_COLOR` full-screen `fillRect` strobe, ~3.75 Hz ×96
  frames on `level-cleared`) and four ACs; epic context at
  `sprint/context/context-epic-pm4.md`. Design: `docs/superpowers/specs/2026-08-09-pac-man-cabinet-lifecycle-design.md`.
- **No ROM citations** apply (accessibility change, not a fidelity constant) —
  `citations.test.ts` N/A for this story.
- **Guardrail for the successor:** the `level-cleared` latch is retained so
  **pm4-7** (freeze pauses) can add the proper sim-freeze later; pm4-7 must NOT
  reintroduce any strobe.
- **Scope discipline:** core (`src/core`) is out of scope for pm4-1.

**Next:** TEA writes failing tests for ACs 1–2 (assert the full-screen strobe
path is gone), keeps `npx vitest run --project pac-man` green.
## Tea Assessment

**RED confirmed — handing to Dev (green).**

**RED state:** `npx vitest run --project pac-man` → **2 failing, 277 passing** (22 files). The only two reds are the intended new AC tests:
- `overlays.test.ts > AC1: a level-cleared event paints no full-screen fill at all across the whole window` — fails: the strobe emits `fillRect(0,0,LOGICAL_W,LOGICAL_H)`.
- `overlays.test.ts > AC2: no high-luminance full-screen transition (strobe) survives after level-cleared` — fails: counts **48** bright full-screen fills (the 48 "on" frames of the 96-frame, half-period-8 strobe).

**Tests written** (`plugins/pac-man/tests/shell/overlays.test.ts`):
- Strengthened the fake ctx: `fillRect` now records `(x,y,w,h)` + the `fillStyle` in effect at call time; added `fullScreenFills()` and `isHighLuminance()` helpers.
- AC1 + AC2 (above) pin the hazard's removal without over-constraining Dev — removing the effect entirely OR keeping a bounded, non-flashing, low-luminance hold both pass.
- **Negative control** `AC1 negative-control: the mock DOES catch a full-screen white fill` — proves the assertions are non-vacuous (a real `#ffffff` full-screen fill is detected). This stays GREEN now and after the fix.
- Replaced the obsolete pm3-7 test `level-cleared triggers a flash state that paints…` which pinned the very behavior being removed.

**Rule Coverage** (TS lang-review checklist):
- **#8 Test quality** — no vacuous assertions (negative control guards this); mock signatures match the real `CanvasRenderingContext2D.fillRect(x,y,w,h)` shape; no new `as any` (reused the file's existing `as unknown as CanvasRenderingContext2D` fake-ctx idiom).
- #1–7, #9 (type escapes, generics, enums, null-handling, modules, React/JSX, async, build) — **N/A**: shell test-only change, no source/enum/async/JSX/config touched.

**Handoff to Dev (GREEN target):** In `plugins/pac-man/src/shell/overlays.ts` `draw()`, remove the full-screen white flash branch (the `fillRect(0,0,LOGICAL_W,LOGICAL_H)` under `flashFramesLeft`). **Keep** the `level-cleared` latch/counter plumbing so **pm4-7** (freeze pauses) can add the proper sim-freeze later — pm4-7 must NOT reintroduce any strobe. Success = AC1/AC2 green, all 279 pac-man tests green, core untouched.

**Design Deviations:** none.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/shell/overlays.ts` — removed the full-screen white level-clear strobe (paint + FLASH_* constants + flashFramesLeft counter + the level-cleared case); overlay now ignores level-cleared. Shell-only; core untouched.

**AC Accountability:**
| AC | Status | Evidence |
|----|--------|----------|
| AC1 — no full-screen fill on level-cleared | DONE | `overlays.test.ts > AC1` green; `fillRect(0,0,LOGICAL_W,LOGICAL_H)` path deleted |
| AC2 — no rapid/large-area high-luminance transition | DONE | `overlays.test.ts > AC2` green (was 48 bright full-screen fills, now 0); negative control still green (assertion non-vacuous) |
| AC3 — pac-man vitest green | DONE | `npx vitest run --project pac-man` → 279/279 |
| AC4 — purity/orchestrator unaffected | DONE | `npm run test:orchestrator` → 457/457; `npm run lint` (tsc --noEmit) clean; core untouched |

**Tests:** 279/279 pac-man (GREEN), 457/457 orchestrator, tsc --noEmit clean.
**Branch:** feat/pm4-1-safety-remove-levelclear-strobe (committed locally, 3 commits; not pushed — PR/merge is the boss's call).

**Playtest note:** No live playtest was run — this story REMOVES a visual effect, its absence is proven by the AC unit tests, and triggering a level-clear in a browser is unnecessary (and I avoid exercising the removed effect at all given the boss's photosensitive epilepsy).

**Handoff:** To Reviewer.

## Delivery Findings

### Dev (implementation)
- No upstream findings.
## Reviewer Findings (tagged)

[PRE] reviewer-preflight — all green: 279/279 pac-man, 457/457 orchestrator, tsc --noEmit clean, 0 code smells (no console.log/skips/TODOs). No findings.
[SEC] reviewer-security — clean: shell-only canvas-draw removal, no input/network/auth/serialization surface; no `as any`/`@ts-ignore`/non-null; the `as unknown as` cast is pre-existing on develop. No findings.
[RULE] reviewer-rule-checker — 2 LOW findings (stale file-header comments, below); 37/39 checks pass. Independently mutation-tested the removal guard: restored develop's strobe → AC1/AC2 went red (1 fill / 48 bright fills) → restored diff → all green. Confirms the guard is non-vacuous.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (rule-checker backstopped it — caught the 2 stale comments) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 2 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (the two [LOW] [DOC] nits below were applied inline as review-nits before finish — commit `docs(pm4-1): fix stale overlay headers`; comment-only, re-verified 279/279 green)

**Specialist coverage:**
- [PRE] reviewer-preflight — clean: 279/279 pac-man, 457/457 orchestrator, tsc --noEmit clean, 0 code smells. No findings.
- [SEC] reviewer-security — clean: shell-only canvas-draw removal, no input/network/auth/serialization surface, no new type-safety escapes. No findings.
- [RULE] reviewer-rule-checker — 2 confirmed LOW findings (below); 37/39 checks pass; the removal guard was independently mutation-tested (restored strobe → AC1/AC2 red → restored diff → green), so it is non-vacuous.

Substance is correct and safe — the p0 photosensitivity hazard is fully removed, the removal guard is independently mutation-tested ([RULE]), and the latch-removal deviation is ACCEPTED. The only issues are two [RULE] [DOC] LOW findings: file-header comments made stale by this diff. Per this repo's norm they get a comments-only green-rework before the header ships lying (rather than a Delivery Finding that dies in the archive). Comments-only — no logic or test change.

| Severity | Source | Issue | Location | Fix Required |
|----------|--------|-------|----------|--------------|
| [LOW] | [RULE] | Module header still lists "a level-clear flash over the maze" as something this driver produces — false as of this diff | plugins/pac-man/src/shell/overlays.ts:9 | Update the header: the driver no longer flashes on level-clear (score popups + READY!/GAME OVER banners remain); note pm4-7 owns the core level-clear pause |
| [LOW] | [RULE] | Test-file header still lists "the level-clear flash" among the overlays it pins — false; the new AC1/AC2 tests exist to prove it is gone | plugins/pac-man/tests/shell/overlays.test.ts:6 | Update the header to reflect that level-clear is now asserted ABSENT (AC1/AC2), not pinned present |

**Also verified (my own analysis, non-blocking):** the removal is well-isolated — no orphaned refs to the removed symbols; `render.ts`'s `FLASH_COLOR_CODE` is the unrelated small-area frightened-ghost sprite flash (untouched); `audio.ts:96` still acknowledges level-clear via audio, so the event stays observable.

**Handoff:** Back to Dev for a comments-only green-rework (the two headers above).

## Delivery Findings

### Reviewer (code review)
- **Improvement** (non-blocking): Epic pm4 should audit ALL pac-man visual flashes for photosensitivity, not only the level-clear strobe. The frightened-ghost body flash (`render.ts` 'flash' mode via `main.ts` FLASH_HALF_PERIOD=14 → ~2.1 Hz, small sprite area) is very likely safe (<3 Hz, small area) but should be confirmed against the same accessibility bar. Affects the pm4 epic scope (a small audit story), not pm4-1.