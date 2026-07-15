---
story_id: "tp1-37"
jira_key: "tp1-37"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-37: THE MOVING EYE, part 2 — the fly-in: fly the eye INTO the new well over NEWAV2 (WD-018), replacing the countdown placeholder; reuse warpDiveTube toward the per-well EYLDES at +0x18/frame (ALWELG.MAC:85-91)

## Story Details
- **ID:** tp1-37
- **Jira Key:** tp1-37
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** tempest
- **Branch:** feat/tp1-37-moving-eye-fly-in

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T21:26:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T20:34:03Z | 2026-07-15T20:37:13Z | 3m 10s |
| red | 2026-07-15T20:37:13Z | 2026-07-15T21:04:05Z | 26m 52s |
| green | 2026-07-15T21:04:05Z | 2026-07-15T21:19:35Z | 15m 30s |
| review | 2026-07-15T21:19:35Z | 2026-07-15T21:26:57Z | 7m 22s |
| finish | 2026-07-15T21:26:57Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA (O'Brien) for the RED phase.**

- **Story:** tp1-37, THE MOVING EYE part 2 — the fly-in (WD-018). Part 2 of a two-story arc; tp1-33 (part 1, tempest#127) landed the well-expansion descent and the `warpDiveTube` seam that this story reuses.
- **Goal:** replace the countdown placeholder with the eye actually flying INTO the newly-expanded well over NEWAV2, advancing toward the per-well `EYLDES` destination at **+0x18/frame** (ALWELG.MAC:85-91).
- **Repos:** tempest only. Gitflow — feature branch `feat/tp1-37-moving-eye-fly-in` created off `origin/develop` (fetched fresh). Merge gate clean (no open tempest PRs). No `tp1-37`/`WD-018` commits on origin/develop, so no sibling checkout has raced this.
- **ROM quarry for TEA:** ALWELG.MAC:85-91 (fly-in advance +0x18/frame), ALCOMN.MAC:532 (per-well EYLDES). Read `sprint/archive/tp1-33-session.md` (Delivery Findings / reviewer notes) — the prior TEA pre-extracted this story's quarry and documented the `warpDiveTube` reuse seam.
- **Next:** TEA writes failing tests for the fly-in advancement mechanism (RED).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the fly-in's star-field OFF gate — PLAGRO set to 1 when the eye's high byte reaches 0xFC (`CMP I,0FC / IFCS / LDA I,1 / STA PLAGRO`, ALWELG.MAC:92-96) — is a shell/render concern (star-field visibility as the eye nears the new well) and is left OUT of the pure-core RED. Affects `src/shell/render.ts` (star-field visibility during the fly-in). *Found by TEA during test design.*
- **Improvement** (non-blocking): the render wiring that makes the new well visibly animate — feeding `warpDiveTube(newTube, f(eyeY))` into `render()` so the well zooms/settles as the eye flies in — is SHELL work verified by driving the real game (no headless render harness; CLAUDE.md), exactly as tp1-33 verified its dive-zoom. The `eyeY → progress` mapping (grow-from-far vs un-flatten from the descent's flat R_eff=1 state) is a play-test tune, not a pinned byte. Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the audit finding WD-018 is `ours: null` (it was only a placeholder). This story implements the genuine fly-in, so Dev/Reviewer should mark WD-018 `remediated_by: tp1-37` (legitimately — the placeholder IS being removed; not a phantom-fix per tempest-citation-gate-traps) and run `node tools/audit/reanchor-citations.mjs --write` for any citation shifted by edits to `src/core/rules.ts`/`sim.ts`/`state.ts`. Affects `docs/audit/findings/*.json`. *Found by TEA during test design.*
- **Improvement** (non-blocking): lengthening the fly-in from ~10 to ~63 frames delays `warp-end` by ~53 frames and stretches the T3 space-drone beat (more faithful — the arcade's "fly through space to the next well"). Reviewer should confirm no audio/timing test hard-codes the old ~10-frame fly-in window. Affects `tests/core/rom-clock-timing.test.ts`, tp1-13 audio-wiring. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): re-anchored 20 citations shifted by the eyeY/constants/helper/render edits — 17 in `src/core/{rules,sim,geometry,state}.ts` (W-001, W-015/16/17/18, W-021, W-036, FR-005, DB-018, SC-003, P7-002, P7-013, B-007/8, B-015, WD-006/7) and 3 in `src/shell/render.ts` (V-030/031/032) — via `reanchor-citations.mjs --write` (0 lost), committed with the change. *Found by Dev during implementation.*
- **Question** (non-blocking): the WD-018 audit finding is `ours: null` (it was only the placeholder). I did NOT edit `docs/audit/findings/*.json` to add `ours`/`remediated_by: tp1-37`, deferring the audit-finding bookkeeping to Reviewer/SM per the TEA finding (the placeholder removal is genuine, but the frozen-`ours` trap means the record edit is a deliberate, reviewed step). Affects `docs/audit/findings/*.json` (WD-018). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the star-field-OFF gate during the fly-in (PLAGRO=1 at EYH≥0xFC, ALWELG.MAC:92-96) is NOT wired — it stays out of scope (star-field visibility polish); the render fly-in wiring drives only the well geometry. Affects `src/shell/render.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): two SIBLING test comments still name the retired `WARP_FLYIN_FRAMES` (`tests/core/rom-clock-timing.test.ts:188`, `tests/core/tp1-23.warp-curwav.test.ts:133`) — comment-only, non-breaking (the phrase "mode stays 'warp' for the fly-in" is still true), left untouched to avoid churning passing suites. Reviewer/comment-analyzer may refresh them. *Found by Dev during implementation.*

### Reviewer (code review)

- **Question** (non-blocking, RESOLVED): the TEA/Dev "mark WD-018 `remediated_by: tp1-37`" action item is a NON-ISSUE — WD-018 (`docs/audit/findings/pair-9-warp-drop-mode.json`) is ALREADY `remediated_by: tp1-10` with `ours: null`, so the citation gate is green (25/25) with no stale/false `ours` quote to re-open. tp1-37 completes that remediation; the single-value field reasonably keeps the originating story. No action required; SM may optionally refine attribution to tp1-37 at finish. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the two stale `WARP_FLYIN_FRAMES` comment mentions Dev flagged (`rom-clock-timing.test.ts:188`, `tp1-23.warp-curwav.test.ts:133`) are cosmetic and could be refreshed to "the per-well fly-in count" in a future touch — not worth a rework here. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `render()` computes `dest = warpEyeDest(s.tube)` unconditionally every frame (all modes), though it is used only when `flyingIn`. A trivial hoist into the `flyingIn` branch would avoid a per-frame divide/round on non-fly-in frames — micro-optimisation, not worth blocking. Affects `src/shell/render.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Fly-in frame count re-derived from the ROM — it is per-well ~63 frames, NOT the placeholder's invented ceil(224/24)=10**
  - Spec source: `src/core/rules.ts:210-221` (WARP_FLYIN_FRAMES) + the tp1-10 shipped placeholder
  - Spec text: "it must fly that same 224-unit span back at 24/frame: ceil(224/24) = 10 frames"
  - Implementation: RED pins the fly-in as the eye flying the FULL 16-bit EYH:EYL span from 0xFA00 (−1536) to the per-well destination −H at +0x18/frame → `ceil((1536 − H)/24)` ≈ 63–64 frames per well (H = ROM_EYE_Y[wellID]).
  - Rationale: byte-verified two ways — INEWAV parks the eye at 0xFA00 (`LDA I,0FA / STA EYH … STA EYL`, ALWELG.MAC:29-33) BEFORE NEWAV2 walks it in, and NEWAV2 clamps at EYLDES (ALWELG.MAC:104-108). The "224-unit span" is the DESCENT span (WARP_ALONG_SPAN), not the fly-in span; reusing it was an invented derivation. Ratifying 10 keeps the tp1-27 "invented constant" trap; the tp1-10 test header already deferred this exact count "to a follow-up story" (this one).
  - Severity: major
  - Forward impact: Dev retires the flat `WARP_FLYIN_FRAMES=10` for the per-well count; the fly-in runs ~6× longer (~2.2s at 28.44 fps), lengthening the T3 space-drone beat and delaying `warp-end` (both more faithful). `tests/core/tp1-10.warp-flyin.test.ts`'s count assertion re-seated onto the ROM formula.

- **A live eye field replaces the bare countdown; `flyIn` stays as the phase gate**
  - Spec source: story title — "replacing the countdown placeholder; reuse warpDiveTube toward the per-well EYLDES at +0x18/frame"
  - Spec text: "replacing the countdown placeholder"
  - Implementation: RED pins a LIVE eye (`WarpState.eyeY`, ROM units) advancing +0x18/frame and clamping at −H; the frame count emerges from it. `flyIn` is KEPT as the phase gate (>0 = flying in) so the existing fire-suppression/gate suite (`tp1-10.warp-fire`, `warp-ramp`, `tp1-23.warp-curwav`, `rom-clock-timing`) still reads it unchanged.
  - Rationale: the placeholder decrements a counter with no eye and draws the new well static; the story needs the eye to actually fly in (drive warpDiveTube). Keeping `flyIn` avoids churning four sibling suites.
  - Severity: minor
  - Forward impact: Dev adds `WarpState.eyeY` (cloneState already shallow-spreads `warp`, so a primitive is carried free) + constants `EYE_FLYIN_START`/`EYE_FLYIN_STEP`.

- **EYLDES reconciled against primary source — scalar STORAGE, per-well VALUE = −ROM_EYE_Y[well]**
  - Spec source: story title "per-well EYLDES" vs the tp1-33 finding "EYLDES is a 1-byte scalar, NOT a table"
  - Spec text: "toward the per-well EYLDES … (ALWELG.MAC:85-91)"
  - Implementation: the destination is pinned as −ROM_EYE_Y[well] (recovered from the tube's farRatio). EYLDES is scalar storage (`EYLDES: .BLKB 1`, ALCOMN.MAC:532) whose value is written per-well by INIWLS = −HOLEYL[wellID] (`LDA Y,HOLEYL / EOR I,0FF / CLC / ADC I,1 / STA EYLDES`, ALDISP.MAC:2470-2475). Both readings are correct — there is no `EYLDES[]` table, but the value IS per-well.
  - Rationale: reconciles the apparent conflict against Theurer's source before any test pins it (avoids re-inventing a 16-row table, and avoids contradicting tp1-33's byte-verified scalar finding).
  - Severity: minor
  - Forward impact: none — the destination derives from ROM_EYE_Y, already in `geometry.ts`.

- **warpDiveTube render wiring scoped to SHELL (game-drive), like tp1-33's dive**
  - Spec source: story title "reuse warpDiveTube" + tempest CLAUDE.md ("the shell … is verified by running the game") + the tp1-33 precedent
  - Spec text: "reuse warpDiveTube toward the per-well EYLDES at +0x18/frame"
  - Implementation: the RED pins the pure-core eye mechanism only; the well-zoom pixels (feeding `warpDiveTube(newTube, f(eyeY))` through `render()`) are shell work verified on the dev server, NOT a unit test — identical to how tp1-33 shipped the dive-zoom.
  - Rationale: repo convention (no headless render harness, no warp-trigger debug key); the exact eyeY→progress visual curve is a play-test tune. Pinning it in a unit test would over-couple the core to a render decision.
  - Severity: minor
  - Forward impact: Dev wires render + game-drives the arrival; a Delivery Finding records the render integration and the star-field gate.

### Dev (implementation)

- **Wired the shell render to drive warpDiveTube during the fly-in — code beyond the pure-core RED (scope expansion)**
  - Spec source: TEA firmed SCOPE ("the well-zoom RENDER wiring … are shell/Dev-Reviewer follow-through") + the story title "reuse warpDiveTube"
  - Spec text: "SCOPE (firmed): the pure-core eye fly-in mechanism. The well-zoom RENDER wiring … game-drive-verified per repo convention."
  - Implementation: `src/shell/render.ts` derives the warp progress from `s.warp.eyeY` when `flyIn > 0` — `warpProgress = (dest − eyeY)/(dest − start)` — so the new well starts FLAT (progress 1, continuous with the descent's flattened bottom) and un-flattens to the normal well (progress 0) as the eye lands; it then feeds the existing `{ ...s, tube: warpDiveTube(...) }` swap. No failing unit test demanded this (shell is eyeballed), but shipping the eye field with the well drawn STATIC would leave "reuse warpDiveTube" unfulfilled and the fly-in invisible.
  - Rationale: delivers the story's visible headline and smooths the hard flat-old-well → new-well cut the tp1-33 Reviewer flagged; mirrors tp1-33 Dev wiring render.ts beyond its pure-core RED. Minimal, and the `render.warp-dispatch` structural guard is unaffected (no new `s.mode === 'warp'` textual match added ahead of the dispatch).
  - Severity: minor
  - Forward impact: the visible fly-in zoom is verified by game-drive on the dev server (repo convention), NOT a unit test — Reviewer to re-confirm visually; the eyeY→progress "un-flatten" curve is a play-test tune.

- **Scoped sim.warp-ramp's frame-rate-independence test to the descent (excluded the frame-count fly-in)**
  - Spec source: `tests/core/sim.warp-ramp.test.ts:214` + the qframe convention (`stepCamera`, sim.ts: "one stepPlaying call = one ROM frame")
  - Spec text: "is frame-rate independent: total descent time barely moves across dt (no spikes)" — the loop ran `while s.mode === 'warp'`, folding the fly-in into the measured window
  - Implementation: the loop now stops at the descent bottom (`(s.warp.flyIn ?? 0) === 0`), measuring only the dt-scaled descent; the frame-count fly-in is excluded and the reached-bottom assertion added.
  - Rationale: the eye fly-in is a frame COUNT (matching tp1-31's per-frame camera slide and the prior placeholder), so its wall-time is intentionally tied to the step rate, not wall-clock — folding it into a dt-independence assertion measures the wrong thing. At 10 placeholder frames the tail sat under the 15% tolerance; at ~63 ROM frames it does not. The test's SUBJECT (the descent's dt-independence) is preserved and still asserted. Parallel to tp1-33 Dev re-seating render.warp-dispatch.test.ts.
  - Severity: minor
  - Forward impact: none — the descent's frame-rate-independence contract is unchanged and still enforced; the fly-in's frame-count nature is the established qframe convention.

### Reviewer (audit)

Every logged deviation stamped (4 TEA + 2 Dev):

- **TEA: fly-in frame count re-derived (~63 per-well, not the placeholder 10)** → ✓ ACCEPTED: byte-verified two independent ways — INEWAV parks the eye at 0xFA00 (ALWELG.MAC:29-33) and NEWAV2 clamps at EYLDES (ALWELG.MAC:104-108); the retired `ceil(224/24)=10` flew the DESCENT span, an invented derivation the tp1-10 header itself deferred. Correctly refuses the invented constant (the tp1-27 trap). The ~6× longer fly-in is the arcade's authentic "fly through space" beat.
- **TEA: live eye field replaces the bare countdown; `flyIn` kept as the gate** → ✓ ACCEPTED: the live eye is the faithful state; keeping `flyIn>0` as the phase gate preserves the fire-suppression/gate suites (verified `tp1-10.warp-fire`, `sim.warp-ramp`, `tp1-23.warp-curwav`, `rom-clock-timing` all green).
- **TEA: EYLDES reconciled — scalar storage, per-well value = −ROM_EYE_Y[well]** → ✓ ACCEPTED: independently re-verified — `EYLDES: .BLKB 1` (ALCOMN.MAC:532, scalar) written per-well by INIWLS = −HOLEYL[wellID] (ALDISP.MAC:2470-2475). Both the story title ("per-well") and tp1-33 ("scalar") are correct; no fabricated `EYLDES[]` table.
- **TEA: warpDiveTube render wiring scoped to shell (game-drive)** → ✓ ACCEPTED: consistent with CLAUDE.md (shell eyeballed) and the tp1-33 precedent; the pure-core eye mechanism is fully unit-tested.
- **Dev: wired the shell render to drive warpDiveTube during the fly-in (scope expansion)** → ✓ ACCEPTED: necessary to deliver the story's visible headline (else the eye field is invisible and "reuse warpDiveTube" is unmet); the `warpProgress = (dest−eyeY)/(dest−start)` mapping is continuous with the descent's flat bottom (progress 1 → 0, no pop) and smooths the exact cut the tp1-33 Reviewer flagged. `render.warp-dispatch` structural guard verified intact (6/6). Mirrors tp1-33 Dev wiring render beyond the pure-core RED.
- **Dev: scoped sim.warp-ramp's frame-rate-independence test to the descent** → ✓ ACCEPTED: the eye fly-in is a frame COUNT (qframe, like `stepCamera`'s per-frame slide), so its wall-time is intentionally step-rate-tied and does not belong in a dt-independence assertion; the test's SUBJECT (the dt-scaled descent) is preserved and still asserted. Parallel to tp1-33 Dev re-seating `render.warp-dispatch`. The old 10-frame tail slipped under the 15% tolerance by luck; ~63 does not.

No UNDOCUMENTED deviations found — the diff matches the firmed ACs and every departure was logged.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Status:** RED — verified by testing-runner (RUN_ID tp1-37-tea-red).

**Test Files:**
- NEW `tempest/tests/core/tp1-37.warp-flyin-eye.test.ts` — the fly-in eye, pinned to the byte-verified ROM (NEWAV2: eye 0xFA00 → −H at +0x18/frame, clamped at per-well EYLDES). **10 of 11 failing** on the missing `eyeY` field / `EYE_FLYIN_START`/`EYE_FLYIN_STEP` constants and the still-`10` held-frame count; the 1 passing ("resumes play … warp-end") is an intended keep-behavior anchor (the story must PRESERVE the warp-space → warp-end handoff).
- RE-SEATED `tempest/tests/core/tp1-10.warp-flyin.test.ts` — its 4th test pinned the invented `WARP_FLYIN_FRAMES===10`; rewritten to the ROM per-well count `ceil((1536−H)/24)`. **1 failing** (sim still holds 10), other 3 pass.

**Collateral:** CLEAN — full suite 1426/1436 pass; the only failures are the 10 above (2 files). No sibling breakage from the test edits.

### The RED contract handed to Dev (Julia)

Replace the countdown placeholder in `stepWarp`/`beginFlyIn` with the ROM's eye fly-in:
- Add `WarpState.eyeY` (ROM units, signed). `beginFlyIn` seeds it at `EYE_FLYIN_START = −1536` (0xFA00).
- Each fly-in frame advance `eyeY += EYE_FLYIN_STEP` (`0x18` = 24) and CLAMP at the per-well destination `−H` (H = ROM_EYE_Y[wellID], recoverable from `tube.farRatio` as tp1-33 does). Never overshoot.
- The fly-in ends → `mode='playing'` (emitting `warp-end`) the frame the eye reaches `−H`; its length is per-well `ceil((1536−H)/24)` ≈ 63–64 frames, retiring the flat `WARP_FLYIN_FRAMES=10`.
- KEEP `flyIn` as the phase gate (>0 = flying in). Pure/deterministic — no RNG, no time; `cloneState` carries `eyeY`.
- SHELL (game-drive, not unit-tested): feed `warpDiveTube(s.tube, f(eyeY))` through `render()` so the new well animates in; handle the star-field-off gate (EYH≥0xFC). Mark WD-018 `remediated_by: tp1-37` + re-anchor citations in any edited cited src file.

### Firmed Acceptance Criteria (TEA — supersede the story title's provisional wording)

1. A live eye field `WarpState.eyeY` exists during the fly-in, seeded at −1536 (0xFA00) on the first fly-in frame (INEWAV, ALWELG.MAC:29-33).
2. The eye advances by exactly +0x18 (24) ROM units per fly-in frame (NEWAV2, ALWELG.MAC:85-88), monotonically toward the well.
3. The eye clamps exactly at the per-well destination EYLDES = −ROM_EYE_Y[well] (ALDISP.MAC:2470-2475, ALWELG.MAC:104-108) and never overshoots.
4. The fly-in lasts the ROM per-well count `ceil((1536−H)/24)` (~63 frames), NOT the retired flat 10 — and the length genuinely varies by destination well.
5. Play resumes (`mode='playing'` + `warp-end`) the frame the eye reaches EYLDES; the descent-bottom `warp-space` handoff is preserved.
6. Pure/deterministic: identical eye sequence for a given seed; `stepGame` does not mutate its input; `cloneState` carries the eye.
7. `EYE_FLYIN_START = −1536` and `EYE_FLYIN_STEP = 24` are exported ROM constants.

**SCOPE (firmed):** the pure-core eye fly-in mechanism. The well-zoom RENDER wiring (warpDiveTube reuse in `render.ts`), the star-field-off gate, and the WD-018 audit-finding bookkeeping are shell/Dev-Reviewer follow-through (Delivery Findings + Deviations), game-drive-verified per repo convention.

### Rule Coverage (TS lang-review — applicable checks only)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 Interface/return-type contract | "exposes EYE_FLYIN_START/STEP"; the `eyeY` field pinned via every eye assertion | failing (field/consts absent) |
| #4 Null/undefined & divide safety | "advances by exactly +0x18 … until it clamps"; "stops exactly at −H, never overshooting" (bounded, finite, no NaN) | failing (eye absent) |
| #8 Test quality (meaningful assertions) | determinism test hardened to reject an all-`undefined` sequence (`every(typeof==='number')`); no `let _=`, no `assert(true)` | self-check: 0 vacuous |
| #13 Fix-introduced regressions (meta) | collateral run: 1426 sibling tests still pass | passing (no regression) |

Rules #1, #3, #5–#7, #9–#12 are N/A — a pure deterministic sim/geometry change: no type escapes, enums, modules/async/React, user input, error handling, or perf/bundle surface (same profile as tp1-33).

**Self-check:** 0 vacuous tests. The single pre-GREEN pass ("resumes play … warp-end") is a keep-behavior anchor (preserves the existing warp-space→warp-end handoff), not a new-behavior assertion.

**Handoff:** To Dev (Julia) for GREEN — add the live eye field + constants; make the fly-in fly.

## Dev Assessment

**Implementation Complete:** Yes
**Status:** GREEN — verified by testing-runner (RUN_ID tp1-37-dev-green): full suite **1436/1436**, build clean (`tsc --noEmit` + vite), citation gate **25/25**, render.warp-dispatch guard **6/6**, all 101 warp tests pass. Zero regressions.

**Files Changed:**
- `src/core/state.ts` — added `WarpState.eyeY?` (the live fly-in eye, ROM units).
- `src/core/rules.ts` — retired the invented `WARP_FLYIN_FRAMES=10`; added `EYE_FLYIN_START = -1536` (0xFA00) and `EYE_FLYIN_STEP = 0x18`.
- `src/core/geometry.ts` — added pure `warpEyeDest(tube)` → the per-well destination `-H` (recovered from farRatio, = INIWLS's EYLDES = -HOLEYL[well]).
- `src/core/sim.ts` — `beginFlyIn` seeds `eyeY = EYE_FLYIN_START` and sets `flyIn = ceil((dest - start)/step)` (per-well ~63); `stepWarp`'s fly-in branch advances `eyeY += 0x18` clamped at `dest`, ends → `playing` + `warp-end` when the eye reaches EYLDES. `flyIn` kept as the phase gate.
- `src/shell/render.ts` — drives `warpDiveTube` from `eyeY` during the fly-in (flat → normal as the eye lands), so the new well visibly animates in (scope expansion, see Dev deviation).
- `tests/core/sim.warp-ramp.test.ts` — the frame-rate-independence test scoped to the descent (excludes the frame-count fly-in; see Dev deviation).
- `docs/audit/findings/*.json` — 20 citations re-anchored (0 lost).

**Verification:** `npm test` 1436/1436, `npm run build` clean, `npm test -- citations` 25/25. The pure-core eye fly-in is fully unit-tested; the well-zoom PIXELS (render) are game-drive/dev-server work per repo convention (Reviewer to re-confirm visually) — the eyeY→warpProgress mapping is continuous by construction (progress 1 at the descent's flat end → 0 at the normal well, no pop).

**Scope delivered:** the ROM eye fly-in mechanism (core, tested) + the render reuse of warpDiveTube (shell, game-drive). Star-field-off gate and the WD-018 audit-finding bookkeeping deferred (Delivery Findings).

**Branch:** feat/tp1-37-moving-eye-fly-in (to be pushed).

**Handoff:** To the next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (tests 1436/1436, build clean, citations 25/25, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([RULE]) |

**All received:** Yes (1 preflight returned clean; the other 8 are disabled via `workflow.reviewer_subagents` and each domain was assessed by the Reviewer directly)
**Total findings:** 0 confirmed blocking, 3 confirmed non-blocking (LOW → Delivery Findings), 0 dismissed

### Rule Compliance

Exhaustive enumeration of every applicable project rule against the changed code:

- **Core purity boundary (tempest CLAUDE.md, "the most important rule"):** VERIFIED — `warpEyeDest` (geometry.ts) and the `beginFlyIn`/`stepWarp` eye logic (sim.ts) are pure arithmetic; independent smell-scan found 0 hits for `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame` in the four changed `src/core` files. All canvas/`warpProgress` use is in `src/shell/render.ts` (shell) — correct side of the boundary.
- **Determinism / immutability (core contract):** VERIFIED — `warpEyeDest` is referentially transparent; `eyeY` advances by pure `Math.min(dest, eyeY+0x18)`; `cloneState` carries `eyeY` via `warp: { ...s.warp }` (a primitive), and the tp1-37 "does not mutate the input state" test + the `sim.warp-ramp` cloneState-purity test both pass.
- **Citation gate (tempest CLAUDE.md, load-bearing):** VERIFIED — touched cited files (`rules/sim/geometry/state.ts` + `render.ts`) → `reanchor-citations.mjs` re-anchored 20 quotes (0 lost); the `docs/audit/findings/*.json` diff is line-numbers ONLY (`verbatim`/`claim` unchanged, filter empty). WD-018 already `remediated_by: tp1-10`, `ours: null` → no frozen-`ours` trap. `npm test -- citations` GREEN (25/25).
- **TS lang-review #2 (interface/return contract):** VERIFIED — `WarpState.eyeY?: number` optional (matches the 3-field warp literals); `warpEyeDest(tube: Tube): number`; `EYE_FLYIN_START`/`EYE_FLYIN_STEP` typed consts; `tsc --noEmit` clean.
- **TS lang-review #4 (null/undefined & divide safety):** VERIFIED — `warpEyeDest` divides by `(1−r)`, r∈[0.10,0.16] for all 16 base wells (never 1); render divides by `dest−EYE_FLYIN_START = 1536−H ∈ [1508,1526]` (never 0); `s.warp.eyeY ?? EYE_FLYIN_START` and `s.warp.flyIn ?? 0` guard the optionals with `??` (not `||`, correct for a 0-valued number). No NaN/Infinity reaches state or canvas.
- **TS lang-review #8 (test quality):** VERIFIED — 11 tp1-37 tests each assert a ROM-derived value or strict inequality; the determinism test is hardened against an all-`undefined` sequence; 0 vacuous. The re-seated tp1-10 count test and the descent-scoped warp-ramp test both assert real values.
- **TS lang-review #1/#5 (type escapes, modules):** VERIFIED — no `as any`/`@ts-ignore`/casts in the diff; imports use correct relative paths; `EYE_FLYIN_START` imported where used.
- Rules #3 (enums), #6 (React), #7 (async), #10 (input validation), #11 (error handling), #12 (perf/bundle) — N/A: pure deterministic sim/geometry + a render progress swap; no enums, JSX, async, user input, error surface, or bundle change.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** descent bottoms (`stepWarp`, progress≥1) → `beginFlyIn` loads the new well + seeds `eyeY = EYE_FLYIN_START (−1536)` and `flyIn = ceil((−H − (−1536))/0x18)` → each `stepWarp` fly-in frame advances `eyeY += 0x18` clamped at `warpEyeDest(s.tube) = −H`, ending → `mode='playing'` + `warp-end` when `eyeY ≥ −H` → `render()` reads `eyeY` while `flyIn>0` to drive `warpDiveTube(s.tube, (dest−eyeY)/(dest−start))`, the new well un-flattening from the descent's flat bottom to normal. Safe end-to-end: `eyeY` strictly climbs start→dest (dest ≫ start, H≤28), all denominators positive, no NaN/Inf.

**Observations (11):**

- `[VERIFIED]` **the fly-in eye math is ROM-exact and terminates** — `sim.ts:893-905`. `eyeY = min(dest, eyeY+0x18)` climbs −1536→−H in `ceil((1536−H)/0x18)` frames and clamps; ends on `eyeY ≥ dest`. No infinite loop (dest=−H ≫ start=−1536), no overshoot (clamped). Matches the 11-test tp1-37 suite + my own derivation (well H=24 → 63 frames).
- `[EDGE]` **divide/boundary safety across the domain** — `warpEyeDest` (geometry.ts) `/(1−r)` with r∈[0.10,0.16] for every base well; render `/(1536−H)`, H∈[10,28] → never 0. `s.tube` at every `warpEyeDest` call site is a BASE well (set by `tubeForLevel`; the diving tube is a local `scene.tube`), never a flat r=1 tube. Assessed by Reviewer (edge-hunter disabled).
- `[EDGE]` **crash path is clean** — the fly-in branch returns FIRST, so `resolveWarpSpikeHit` never runs during the fly-in; `eyeY` is only ever set during the crash-proof fly-in and is read only while `flyIn>0`. A descent crash leaves `eyeY` undefined; `replayWave` (sim.ts:835) resets `flyIn=0` so the stale `eyeY` is never read. No cleanup bug. Assessed by Reviewer.
- `[SILENT]` **no swallowed errors / silent fallbacks** — pure arithmetic; the `?? 0`/`?? EYE_FLYIN_START` are correct number-safe defaults (not `||`), no empty catches, no masked failures. Assessed by Reviewer (silent-failure-hunter disabled).
- `[TEST]` **test quality is strong** — 11 tp1-37 tests pin ROM values/inequalities; the retired-placeholder count is caught both in the new suite and the re-seated tp1-10 test; the warp-ramp test correctly re-scoped to the dt-driven descent. The one pre-GREEN passing anchor ("resumes play … warp-end") guards the preserved handoff. 0 vacuous. Assessed by Reviewer (test-analyzer disabled).
- `[DOC]` **comments accurate and ROM-cited** — every new comment carries the byte-verified anchor (ALWELG.MAC:29-33/85-108, ALDISP.MAC:2470-2475, ALCOMN.MAC:532). Two SIBLING test comments still name the retired `WARP_FLYIN_FRAMES` (cosmetic, non-breaking) → LOW finding. Assessed by Reviewer (comment-analyzer disabled).
- `[TYPE]` **type contract clean** — `eyeY?: number`, `warpEyeDest(tube): number`, typed consts; no `any`/casts/`@ts-ignore`; `tsc --noEmit` clean. Assessed by Reviewer (type-design disabled).
- `[SEC]` **no security surface** — client-only vector game; no auth, input parsing, secrets, tenant data, or network. N/A. Assessed by Reviewer (security disabled).
- `[SIMPLE]` **minimal, non-dead** — the eye field + one helper + a render progress swap; `flyIn` kept as the gate (avoids churning 4 suites). One micro-inefficiency: `render` computes `warpEyeDest(s.tube)` every frame regardless of `flyingIn` → LOW finding (trivial hoist). Assessed by Reviewer (simplifier disabled).
- `[RULE]` **all applicable project rules pass** — see `### Rule Compliance`: core purity, determinism/immutability, citation gate (20 re-anchored, 0 lost), TS lang-review #1/#2/#4/#5/#8. No violations. Assessed by Reviewer (rule-checker disabled).
- `[LOW]` **the `flyIn` counter and `eyeY` are dual state that must stay in sync** — `eyeY≥dest` is the real terminator; `flyIn` is the gate, decremented in parallel. They terminate on the same frame today (both derived from `ceil((dest−start)/0x18)`), but a future edit to the step or init formula could desync them. Non-blocking; a comment could note `eyeY` is authoritative. `sim.ts:896-900`.

**Deviation audit:** all 6 logged deviations (4 TEA + 2 Dev) stamped ✓ ACCEPTED (see `### Reviewer (audit)`); 0 undocumented deviations found.

**Error handling:** no failure paths introduced — pure arithmetic + a render view swap. Optionals (`eyeY`, `flyIn`) are `??`-guarded; read only under `mode==='warp'` / `flyIn>0`.

### Devil's Advocate

Let me argue this is broken. First attack: the fly-in never ends → the player is frozen in space forever. For that, `eyeY` would have to never reach `dest`. But `eyeY = min(dest, eyeY + 0x18)` adds a positive constant every frame and `dest = −H ≫ start = −1536` (H≤28), so `eyeY` strictly climbs and hits `dest` in ~63 frames, where `eyeY ≥ dest` fires and resumes play. The 5000-iteration test bounds confirm convergence at both dt=1/60 and 1/120. Not broken.

Second attack: a divide-by-zero sprays NaN into the canvas. `warpEyeDest` divides by `(1−r)` and render by `(dest−start)`. Could `r=1`? Only a fully flat tube — but `s.tube` at every call site is a base `GEOMETRIES` well (r∈[0.10,0.16]); the flat diving tube exists only as render's local `scene.tube`, never passed to `warpEyeDest`. Could `dest−start=0`? That needs `−H=−1536`, i.e. H=1536 — impossible (H≤28). Both denominators are provably nonzero. Not broken.

Third attack: the dual `flyIn`/`eyeY` counters desync and the gate closes early, dropping the sim into descent logic on a level-2 warp (accel/spike-crash on a well with no spikes armed for the descent). For that, `flyIn` would have to hit 0 while `eyeY < dest`. Both start from the SAME `ceil((dest−start)/0x18)` and advance once per frame, so after N frames `eyeY = start+0x18·N ≥ dest` exactly as `flyIn` hits 0 — they cannot desync under the current formula. I filed the coupling as a LOW (a future edit could break the invariant), but it is sound today.

Fourth attack: the render pops. At the descent's last frame the old well is flat (progress→1); the fly-in's first frame has `eyeY=start` → `warpProgress=1` → also flat. Continuous. As the eye lands, `warpProgress→0` → the normal well, and the frame play resumes `flyingIn` is false so the well is drawn normally. No discontinuity by construction. The honest weakness: the pixel-level arrival is verified by construction + the dispatch guard, NOT by a headless render test (repo convention — shell is eyeballed), so a subtle visual (e.g. the un-flatten curve feeling too slow over 2.2s) is a play-test tune the user/Reviewer should confirm on the dev server. And the 2.2s no-fire window is a real feel change — but it is the ROM's authentic space beat, documented, non-blocking. Nothing rises to High or Critical.

**Handoff:** To SM (Winston Smith) for finish-story.