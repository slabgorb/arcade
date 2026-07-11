---
story_id: "rb3-8"
jira_key: null
epic: "rb3"
workflow: "trivial"
---
# Story rb3-8: Fix flight.ts altitude-clamp radix

## Story Details
- **ID:** rb3-8
- **Jira Key:** null
- **Workflow:** trivial
- **Stack Parent:** none
- **Repo:** red-baron
- **Priority:** p1
- **Type:** bug
- **Points:** 2

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-11T00:37:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T00:23:20Z | 2026-07-11T00:25:12Z | 1m 52s |
| implement | 2026-07-11T00:25:12Z | 2026-07-11T00:31:42Z | 6m 30s |
| review | 2026-07-11T00:31:42Z | 2026-07-11T00:37:06Z | 5m 24s |
| finish | 2026-07-11T00:37:06Z | - | - |

## Story Context

### Problem
The altitude clamp constants in `flight.ts` (lines 50-53) read RBARON.MAC equates in decimal instead of hexadecimal. The ROM uses `.RADIX 16` throughout the equate block, so constants like `PLYMAX=180*4` should be interpreted as `0x180*4=1536`, not `720`.

### Acceptance Criteria
1. Re-verify PLYMIN/PLYMAX (and PFPLOW/PFPHI) against the hex-radix RBARON.MAC equate block
2. Cross-check topology.ts HORZ/HORIZN/PFPLOW values landed by rb3-1 for consistency
3. Correct flight.ts lines 50-53 with the right hex values
4. Verify ALT_MIN=8*4=32 (coincidentally correct) and ALT_MAX=0x180*4=1536 (not 720)
5. Confirm no tests or render logic regresses

### Technical Approach
1. Extract the hex-radix equates from RBARON.MAC (.RADIX 16 block)
2. Verify proof markers (e.g., .STAR0=1B hex, P.MAXZ=1001=HORZ+1)
3. Cross-reference topology.ts constants (HORZ=1000, HORIZN=0x40, PFPLOW=80*4=320)
4. Update flight.ts:50-53 with corrected hex values
5. Ensure rb3-2 (ground-mode altitude) and rb3-3 (HORIZN render) will work correctly with the fix

### Blocking rb3-2 and rb3-3
This is a critical p1 fix that must land before:
- **rb3-2**: Ground-wave mode entry (relies on correct altitude bands)
- **rb3-3**: Scrolling landscape (HORIZN render depends on correct horizon constant)

## Sm Assessment

**Routing:** trivial workflow → hand off to Dev (Julia) for the `implement` phase. Scope is a self-contained constant fix in `red-baron/src/core/flight.ts:50-53`; no test-first ceremony needed, but Dev must confirm the existing suite + build stay green.

**Quarry-location warning (blocking gotcha):** The canonical ROM reference set (RBARON.MAC / RBGRND / 037007.XXX) is **NOT present in this checkout (a-1)** — it lives only in **a-2's** red-baron `reference/` directory. Dev should verify the hex equates from a-2's copy (or from the rb3-1 topology.ts values already landed here, which were derived correctly). The reference files are **CRLF-terminated**, so `grep`/ugrep silently returns nothing — read them with `awk` instead.

**Established facts (from rb3-1 + prior sessions):** RBARON.MAC/RBGRND equates are `.RADIX 16` (hex). Proof markers: `.STAR0=1B`, `P.MAXZ=1001=HORZ+1` (so HORZ=0x1000=4096). rb3-1 already landed HORZ/HORIZN/PFPLOW correctly in `topology.ts` — cross-check against those, don't re-derive from scratch. The bug: `flight.ts` ALT_MAX read `PLYMAX=180*4` as decimal 720; correct is `0x180*4=1536`. ALT_MIN=`8*4`=32 is coincidentally right (0x8=8). Also re-verify PFPLOW/PFPHI.

**Priority:** p1 blocker — rb3-2 (ground-mode altitude) and rb3-3 (HORIZN render) depend on this landing first.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/flight.ts` — `ALT_MAX` corrected `180 * 4` (decimal 720) → `0x180 * 4` (1536); `ALT_MIN` rewritten `8 * 4` → `0x8 * 4` (value 32 unchanged, hex made explicit); doc comments now cite the `.RADIX 16` hex block and the sibling `PFPLOW = $80·4` in topology.ts.
- `tests/core/flight.test.ts` — clamp-bounds assertion + header comment updated from the decimal 720 misread to `0x180 * 4` = 1536.
- `tests/core/camera.test.ts` — one-token `.RADIX 16` clarifier on a cross-reference comment.

**Verification:**
- Cross-checked the hex reading against `topology.ts` (rb3-1 landed HORZ=0x1000, HORIZN=0x40, PFPLOW=0x80*4 under the same RBARON.MAC `.RADIX 16` block). Spawn I4YPOS=0x210=528 now sits sensibly inside [32, 1536] instead of near the buggy 720 ceiling. Note: the canonical ROM (RBARON.MAC) is absent from this a-1 checkout, so verification used the rb3-1-derived topology.ts values, not the ROM directly — see SM Assessment quarry-location warning.
- PFPHI: no such symbol exists anywhere in `src/` (the story asked to re-verify "PFPLOW/PFPHI"; only PFPLOW exists, already correct at `0x80*4` in topology.ts from rb3-1). Nothing to change.

**Tests:** 335/335 passing (GREEN). `tsc --noEmit` + vite build clean.
**Branch:** fix/rb3-8-altitude-clamp-radix (pushed to origin)

**Handoff:** To review phase (The Thought Police / Reviewer).

## Delivery Findings

No upstream findings.

### Dev (implementation)
- No upstream findings during implementation.

### Reviewer (code review)
- No upstream findings during code review.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Co-corrected the altitude-clamp test, which baked in the same radix misread**
  - Rationale: The source fix cannot be GREEN while the test hardcodes the buggy expected value; correcting the test's expected value IS correcting the bug (the test asserted the misread), not hiding it.
  - Severity: minor
  - Forward impact: none — no sibling story consumes this test.
- **Touched a cross-reference comment outside flight.ts (camera.test.ts:33)**
  - Rationale: Leaving that comment perpetuates the exact radix ambiguity this story exists to eliminate; a one-token clarification prevents recurrence. Comment-only, no behavior.
  - Severity: trivial
  - Forward impact: none.

## Design Deviations

### Dev (implementation)
- **Co-corrected the altitude-clamp test, which baked in the same radix misread**
  - Spec source: context-story-rb3-8.md, AC-3 ("Correct flight.ts lines 50-53") + AC-5 ("Confirm no tests or render logic regresses")
  - Spec text: AC narrowly names `flight.ts:50-53`, but AC-5 requires tests stay green
  - Implementation: `tests/core/flight.test.ts:337-339` asserted `ALT_MAX === 180 * 4` (JS decimal = 720) — the identical decimal misread mirrored into the test. Changed the assertion to `0x180 * 4` (1536) and the `.RADIX 16` comments. The behavioral clamp tests (climb settles ON ALT_MAX / dive settles ON ALT_MIN) read the constant dynamically, so they verify the clamp works at the corrected ceiling.
  - Rationale: The source fix cannot be GREEN while the test hardcodes the buggy expected value; correcting the test's expected value IS correcting the bug (the test asserted the misread), not hiding it.
  - Severity: minor
  - Forward impact: none — no sibling story consumes this test.
- **Touched a cross-reference comment outside flight.ts (camera.test.ts:33)**
  - Spec source: context-story-rb3-8.md, AC-3 (scope named as `flight.ts:50-53`)
  - Spec text: "correct flight.ts:50-53"
  - Implementation: also added a `(hex, .RADIX 16)` clarifier to a prose SCOPE-BOUNDARY comment in `camera.test.ts` that described the clamp as `8*4..180*4` in the same ambiguous notation.
  - Rationale: Leaving that comment perpetuates the exact radix ambiguity this story exists to eliminate; a one-token clarification prevents recurrence. Comment-only, no behavior.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **Co-corrected the altitude-clamp test** → ✓ ACCEPTED by Reviewer: The test asserted the *misread* value (`180 * 4` = 720). Correcting the expected value to `0x180 * 4` = 1536 is the fix, not a mask — the source constant has no behavior beyond the clamp bound, and the settle-on-ceiling/settle-on-floor behavioral tests read the constant dynamically, so they independently exercise the clamp at the corrected bound (335/335 green). This is the codebase's established ROM value-pin pattern (cf. rb3-1).
- **Touched a cross-reference comment in camera.test.ts** → ✓ ACCEPTED by Reviewer: Comment-only, zero behavior, directly serves the story's intent (kill the `180*4` decimal ambiguity). In-scope for a radix-correction story; not gold-plating.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (335/335 green, build clean, 0 code smells, no stray 720) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` |

**All received:** Yes (preflight returned clean; the other 8 are toggled off via `workflow.reviewer_subagents` — I assessed their domains myself against the 10-line diff, tagged below.)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred.

### Rule Compliance (.pennyfarthing/gates/lang-review/typescript.md)

Diff is `.ts`-only (one src constant pair + two test/comment edits). Enumerated every applicable check:

- **#1 Type-safety escapes** — PASS. No `as any`, `@ts-ignore`, `@ts-expect-error`, non-null `!`, or type predicates. `export const ALT_MAX = 0x180 * 4` infers `number` cleanly.
- **#2 Generic/interface** — N/A. No generics, `Record`, or `Function` types touched.
- **#3 Enum** — N/A.
- **#4 Null/undefined** — N/A. No `||`/`??`; the `need()` test helper is unchanged.
- **#5 Module/declaration** — PASS. No import/export or `export type` changes.
- **#6 React/JSX** — N/A. No `.tsx`.
- **#7 Async/Promise** — N/A. Pure synchronous constants.
- **#8 Test quality** — PASS. No `as any` in assertions. `expect(f.ALT_MAX).toBe(0x180 * 4)` is a concrete ROM value-pin (not vacuous); the settle-on-ceiling / settle-on-floor tests exercise the clamp behaviorally against the exported symbol.
- **#9 Build/config** — N/A / PASS. No tsconfig changes; `tsc --noEmit` strict build passed.
- **#10 Input validation** — N/A. No user/external input; a compile-time numeric constant.
- **#11 Error handling** — N/A.
- **#12 Perf/bundle** — N/A. 1536 is a small integer; no float/precision/overflow concern.
- **#13 Fix-introduced regressions** — PASS. The fix introduces none of checks #1–#12's anti-patterns.

### Devil's Advocate

Suppose this fix is wrong. The most dangerous failure mode is a *shared* radix error: what if RBARON.MAC is actually `.RADIX 10`, rb3-1 mis-transcribed it into `topology.ts`, and I'm now "confirming" flight.ts against a co-propagated mistake — a circular cross-check? Mitigation: the hex reading is anchored to two proof markers that are only coherent in hex. `.STAR0 = 1B` contains the digit `B`, which is a **syntax error** in decimal — the file would not assemble. And `P.MAXZ = 1001 = HORZ + 1` only holds if HORZ = `0x1000` = 4096 (since `0x1001` = 4097 = 4096 + 1); under a decimal reading, `1001 ≠ 1000 + 1` fails. Both identities are self-proving and independent of topology.ts, so the radix is hex beyond reasonable doubt.

Second failure mode: downstream blow-up. Raising the ceiling 720 → 1536 more than doubles reachable altitude. Could that drive camera/horizon math into a NaN, overflow, or wraparound? I traced it: altitude feeds eye height via `ALT_TO_Y = 1/4` (max eye height 384 vs old 180); nothing divides *by* altitude, so no division-by-zero. horizon.ts's lone `180` literal is `Math.PI / 180` (degrees→radians), unrelated to the clamp. The consumers this unblocks — rb3-2 (ground-mode altitude) and rb3-3 (HORIZN render) — are not yet written, so they will be authored against the corrected value; that is the story's explicit purpose.

Third: could the value-pin test give false comfort? `expect(ALT_MAX).toBe(0x180*4)` mirrors the source expression, so a future edit that changes both identically would pass unnoticed. True, but that is the accepted ROM-pin idiom in this codebase (rb3-1 pins every silhouette the same way), and the behavioral clamp tests are the real safety net — they'd catch a broken clamp regardless of the pin. Fourth: a confused reader re-introducing the decimal misread — the whole change plus the camera.test.ts comment fix exists precisely to prevent that. I find no surviving break. The change is correct, isolated, and well-guarded.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** pilot pitch input → POTDLY/`PITCH_TABLE` step → `clamp(state.altitude + pitchRate * scale, ALT_MIN, ALT_MAX)` at `flight.ts:162` → altitude consumed by the camera via `ALT_TO_Y = 1/4`. Safe: the corrected ceiling only widens the valid band [32, 1536]; no downstream code compares altitude to a literal or divides by it.

**Pattern observed:** ROM constant written as `0x180 * 4 // 1536` with an inline decimal comment — matches the `.RADIX 16` convention rb3-1 established in `topology.ts` (`HORZ = 0x1000 // 4096`). Good, consistent pattern at `flight.ts:50-53`.

**Findings by domain** (8 domain subagents disabled; assessed by reviewer against the diff):
- `[EDGE]` The clamp bounds ARE the only edges. Ordering is coherent (floor 32 < PFPLOW 512 < spawn 528 < ceiling 1536); settle-on-floor and settle-on-ceiling tests are green. No unhandled boundary.
- `[SILENT]` No error paths, catches, or fallbacks in a pure numeric constant change — none to swallow; none introduced.
- `[TEST]` Value-pin corrected to the ROM-true `0x180*4`; behavioral clamp tests read the symbol dynamically and pass at the new bound. Not vacuous, not implementation-coupled beyond the intended contract.
- `[DOC]` Doc comments now cite `.RADIX 16`/HEX; the stale `180*4` notation in `camera.test.ts` was also corrected. No misleading docs remain.
- `[TYPE]` `number` constants; zero type-system escapes.
- `[SEC]` No security surface — compile-time constant, no input, no injection, no secrets, no info leak.
- `[SIMPLE]` Minimal 10-line change; hex literal + inline decimal comment is the simplest correct form. No dead code, no over-engineering.
- `[RULE]` TypeScript lang-review checklist: all applicable checks pass (see Rule Compliance above).

**VERIFIED observations:**
- `[VERIFIED]` ALT_MAX arithmetic — evidence: `flight.ts:53` `0x180 * 4` = 1536 (0x180 = 384; 384×4 = 1536). Radix proven hex by `.STAR0=1B` and `P.MAXZ=1001=HORZ+1`.
- `[VERIFIED]` No stray old ceiling — evidence: full-repo grep, zero `720` hits in `src/` or `tests/`; preflight corroborates.
- `[VERIFIED]` No downstream literal dependence — evidence: all `ALT_MAX`/`ALT_MIN` uses (`flight.ts:162`, `biplane.test.ts:41,175`, `flight.test.ts`) reference the exported symbols; the ceiling change propagates automatically.
- `[VERIFIED]` Sibling constant unaffected — evidence: `topology.ts:396` `PFPLOW = 0x80 * 4` already correct; PFPHI does not exist in `src/` (nothing to fix, matching Dev's finding).
- `[VERIFIED]` Tests + build green — evidence: preflight 335/335 pass, `tsc --noEmit` + vite build clean.

**Error handling:** N/A — pure constant; the `clamp()` at `flight.ts:162` already guards both bounds and is unchanged.

**Handoff:** To SM (Winston Smith) for finish-story.