---
story_id: "bz3-8"
jira_key: "bz3-8"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-8: MOUNTAIN & MOON GEOMETRY — the ridge is a procedural two-sine; the real MTN0-7 was in the ROM all along

## Story Details
- **ID:** bz3-8
- **Jira Key:** bz3-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/bz3-8-mountain-moon-geometry
- **Branch Strategy:** gitflow
- **Type:** bug
- **Points:** 5

## Story Description

Cluster C8. Subsumes H-002, H-003. The clone's mountain ridge is a procedural two-sine profile (H-002) and its moon is independently authored (H-003), both built on the false premise that the quarry held no horizon picture data. It does: the hand-authored ridge is MTNS/MTN0-7 (BZMTNS.MAC:11-183, .RADIX 16) drawn by DRAW MOUNTAIN SCAPE/MOUNTS (BZONE.MAC:1240), with the moon embedded in MTN0 (brite tiers 7/2/5).

**CRITICAL premise-correction (audit finding H-001):** BATBL, which an earlier draft called 'the mountain-scape table', is actually the 'BATTLE' TITLE-LOGO object 0x17 (LOGOBJ at BZMTNS.MAC:846) — NOT the ridge. Do NOT port BATBL as the mountains. The real ridge is MTN0-7 at BZMTNS.MAC:11-183.

## Acceptance Criteria

- [ ] The mountain ridge is ported from the ROM's hand-authored MTN0-7 vector data (BZMTNS.MAC:11-183), replacing the procedural two-sine profile.
- [ ] The moon geometry is taken from its embedding in MTN0 (brite tiers 7/2/5), not authored separately.

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T04:01:14.101429Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T04:01:14.101429Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): H-001 premise re-verified against primary source — `BATBL` is object 0x17 in the `OBJPNT` 3D-object dispatch table (BZMTNS.MAC:485-490 `.WORD ...,BATBL`) and in `LOGOBJ` (BZMTNS.MAC:846 `.BYTE 17,80,1E,80,1F,80` = BAT/TLE/ZON title logo). It is NOT the ridge. The real ridge is `MTNS`/`MTN0-7` at BZMTNS.MAC:19-183. Confirmed before pinning. *Found by TEA during test design.*
- **Gap** (non-blocking): when Dev rewrites `horizon.ts` in GREEN, the `ours` verbatims in `docs/audit/findings/pair-horizon.json` for **H-002** (horizon.ts:57, the two-sine `const el = ...`) and **H-003** (horizon.ts:81, the crescent `return [5.5 + 0.045 * Math.sin(t)...`) will no longer match those lines and `npm test -- citations` will break. Dev must remediate both findings in that JSON (set `remediated_by: bz3-8`; a remediated DIVERGENCE still owes a valid historical `ours` quote that matches a real line — re-point/re-quote it, do not null it, per the citations checker). Applies also to any pinned-line drift in OTHER findings that cite horizon.ts. *Found by TEA during test design.*
- **Conflict** (non-blocking): finding H-003's `reasoning` labels the inner-detail run "brite 5 (BZMTNS.MAC:56-67)"; the byte decode shows lines 56 and 62 are brite-0 positioning moves and line 67 closes at brite 2 — the pure brite-5 strokes are 9 (57-61, 63-66). The finding's own `refuter_correction` already flags the 56/67 edge but misses line 62. Immaterial to the divergence; tests pin the exact decode (9 brite-5 strokes). *Found by TEA during test design.*
- **Improvement** (non-blocking): tiers 7/2/5 (and terminator-close 2) appear **only** in MTN0 — the plain ridge is brite {0,3}. This is a clean fidelity invariant the tests exploit to prove the moon is embedded in MTN0 and nowhere else. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the citations checker (`tools/audit/check-citations.mjs`) does NOT re-validate a remediated (non-`NO_COUNTERPART`) finding's `ours.line`/`ours.verbatim` against the live file at all — it only requires `ours.file` to be truthy once `remediated_by` is set. `reanchor-citations.mjs` explicitly skips remediated findings too ("their quote is MEANT to be stale"). So H-002/H-003's `ours` needed no re-quoting — I left their historical file/line/verbatim untouched and only added `remediated_by`. TEA's GREEN guidance ("re-quote `ours` to a surviving line") over-specified this; worth correcting in future story guidance so the next Dev doesn't spend time hunting a "surviving line" that isn't actually required. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `MTN_SEGMENTS`' 8 segments each sum their `[dx,dy]` deltas to exactly `[512, 0]` — a closed loop, 8×512=4096 vector-generator units per full 360° turn, with the whole-path cumulative `y` never going negative (global min 0). This let the render mapping use ONE shared scale (`TAU/4096`) for both axes with no clamping needed to satisfy `horizon.test.ts`'s `el >= 0` / moon `el > 0` ACs — confirmed by simulating the full stroke walk before writing the render code. Worth knowing for any future story that touches this data: the closed-loop property is load-bearing for the render, not incidental. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the render pipeline (`PanoramaPolyline` → `SceneSegment`) carries NO per-point brightness, so the moon's ROM tiers (7/2/5) and the ridge's dim/bright distinction (0/3) are preserved in the `MTN_SEGMENTS` DATA but FLATTENED at render — the moon still draws as an un-graded outline, exactly the visual H-003's claim called out ("flattens the ROM's 3-tier brightness"). AC2 is met at the data-fidelity level (geometry + tiers come from MTN0, not authored separately), and differential-brightness rendering is a shell concern (cf. H-004: "dim brightness (3) is a shell/render concern outside horizon.ts"). A faithful brightness render of ridge+moon is a separate shell-side enhancement for a future story. *Found by Reviewer during code review.*
- **Question** (non-blocking): the backdrop's VERTICAL angular scale is unpinned. `deriveMtnPanorama()` reuses `TAU/4096` for elevation; the horizontal factor is ROM-exact (4096 units = one 360° wrap, confirmed H-005) but the vertical factor is the ROM's *own authored 1:1 aspect*, not a source-derived degrees-per-unit. The audit itself declined to pin this (H-009 filed STRUCTURAL, deferred to the epic-closing playtest). Single-scale is the least-assumption choice and is not distorting relative to anything the source pins; final vertical calibration remains open under H-009. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Byte-exact DATA pin instead of well-formedness only:** the SM brief said "pin the DATA the way existing battlezone model tests do", but `models.test.ts`/`horizon.test.ts` deliberately pin only *structure/well-formedness*, never exact coordinates (to avoid coupling to the gitignored quarry). I baked the exact ROM decode (all 157 strokes) into `tests/core/horizon-mtns.test.ts` instead. Reason: a structural-only test PASSES against the current two-sine ridge and can never go RED — the whole point of H-002/H-003 is that the ROM *does* ship the ridge/moon data, so byte-exactness is the AC. The fixture is a script-verified hex decode of BZMTNS.MAC:19-183 (not hand-transcribed), self-contained (no runtime dependency on `~/Projects/battlezone-source-text`), and citation-commented per segment.
- **New export contract defined:** RED contract adds `MtnStroke = readonly [dx,dy,brite]` and `MTN_SEGMENTS: readonly (readonly MtnStroke[])[]` (8 segments) to `src/core/horizon.ts`. The existing `PanoramaPolyline`/`PANORAMA`/`skylineSegments` API is untouched by the contract; the two "GONE" tests only require the two-sine and crescent to no longer appear in `PANORAMA`. This lets Dev choose the render-mapping (relative-delta accumulation → angular space) freely.

### Dev (implementation)
- **Data lives in `models.ts`, not `horizon.ts`:** per the story's core/shell-split instruction ("if `MTN_SEGMENTS` is data, put it where battlezone keeps its other ROM-decoded model data"), `MtnStroke`/`MTN_SEGMENTS` are defined in `src/core/models.ts` (alongside the other ROM-decoded geometry) and re-exported from `horizon.ts` (`export { MTN_SEGMENTS }`, `export type { MtnStroke }`) to satisfy the RED contract's import path (`tests/core/horizon-mtns.test.ts` imports `../../src/core/horizon`). `MTN_SEGMENTS` is NOT a `Model3D` (indexed vertex/edge wireframe) — it's a flat run of relative pen strokes, a structurally different shape, so it gets its own section in `models.ts` rather than being forced into the existing type.
- **Render-mapping choice (not test-pinned, so recording the reasoning):** `deriveMtnPanorama()` walks the 157 strokes in MTN0..MTN7 order with ONE cursor, accumulating `[dx,dy]` in raw vector-generator units, converting to radians via a SINGLE shared scale `VECTOR_UNIT_RAD = TAU / 4096` for both azimuth (dx) and elevation (dy) — 4096 because all 8 segments' deltas close a full loop (see Delivery Finding above). A brite-0 stroke is a pen-up move: it repositions the cursor and breaks whatever polyline is in progress (matches vector-generator semantics — the beam only draws on brite>0). Runs of consecutive draws of the SAME family (ridge vs. the MTN0-embedded moon, classified by segment index 0 + stroke index 17..48) chain into one polyline; a direct brite change within the SAME family (e.g. the moon's disc-outline brite-7 run flowing straight into the terminator brite-2 run with no intervening pen-up) stays one continuous polyline, which is deliberate — the ROM strokes are back-to-back with no move between them, so the beam never lifts. Verified by simulation before coding: max azimuth gap among rendered 'mountains' points is ~0.344 rad (well under `H_FOV` = 0.785 rad), all mountain elevations land in [0, 0.147] rad and all moon elevations in [0.153, 0.25] rad (strictly positive, matching horizon.test.ts's ACs without any extra clamping).

## TEA Assessment

**Tests Required:** Yes
**Reason:** H-002 (ridge) + H-003 (moon) are DIVERGENCE findings — real geometry data to port; byte-exact pinning needed.

**Test Files:**
- `battlezone/tests/core/horizon-mtns.test.ts` — byte-exact MTN0-7 ridge + moon-in-MTN0 + two-sine/crescent-gone (14 tests)

**Tests Written:** 14 tests covering 2 ACs (H-002 ridge, H-003 moon)
**Status:** RED — 14 failed | 896 passed (full suite); `tsc --noEmit` clean; `npm test -- citations` GREEN (12 pass); existing `horizon.test.ts` still green.

**RED proof (right reasons):**
- 12 tests throw `must export MTN_SEGMENTS` — the ROM data isn't ported yet.
- 2 tests fail `expected true to be false` — they detect the LIVE two-sine ridge and crescent moon in `PANORAMA` (proves non-vacuous; will flip GREEN when removed).

### Verified ROM citations (BZMTNS.MAC, .RADIX 16 — HEX)
- Ridge dispatch `MTNS`: BZMTNS.MAC:11-18 (`JSRL MTN0..MTN7`).
- `MTN0`:19-68 (50), `MTN1`:70-83 (14), `MTN2`:85-115 (31), `MTN3`:117-132 (16), `MTN4`:134-144 (11), `MTN5`:146-160 (15), `MTN6`:162-175 (14), `MTN7`:177-182 (6). Total **157 strokes**.
- Moon embedded in MTN0: BZMTNS.MAC:36-67. PART A brite 7 (36-49, 14 strokes, first `VCTR 5,-0C,7 ;MOON` → `[5,-12,7]`); PART B brite 2 (50-55, 6 strokes); inner brite 5 (57-61, 63-66 = 9 strokes) with brite-0 moves (56, 62) and a brite-2 close (67).
- Hex-decode reminders: `-0C`=-12, `0A0`=160, `0C0`=192, `0E0`=224, `-40`=-64.
- Horizon line `HORIZN`:9 (`VCTR -600,0,3`) is H-004 (already matches) — out of this story's scope.

### GREEN guidance for Dev
1. **Where the ridge/moon live today:** `battlezone/src/core/horizon.ts`. `MOUNTAIN_RIDGE` (lines 53-60, the two-sine) and `MOON` (lines 75-89, the sin/cos crescent) are the two things to remove. `VOLCANO` (63-72) is a SEPARATE finding (H-008) — **leave it**, out of scope for bz3-8.
2. **Target data shape (RED contract):** export from `horizon.ts`:
   - `export type MtnStroke = readonly [number, number, number]` (`[dx, dy, brite]`).
   - `export const MTN_SEGMENTS: readonly (readonly MtnStroke[])[]` — the 8 segments, byte-exact per the fixture in the test file. The test file's `MTN0..MTN7` arrays ARE the exact values (copy the decode; the test deep-equals them).
3. **Decode subtleties:**
   - Values are RELATIVE VCTR deltas (the actual ROM bytes), NOT absolute vertices. `brite 0` = pen-up MOVE (reposition, no line); `brite > 0` = visible DRAW at that intensity tier.
   - Render mapping (accumulate deltas from a cursor → angular az/el, break the polyline at brite-0 moves so pen-up gaps don't draw) is a Dev render choice — the tests pin the DATA, not the mapping. Keep `PANORAMA`/`skylineSegments` satisfying the existing `horizon.test.ts` (mountains ring 360°, moon floats above horizon, wrap/determinism).
   - The moon is EMBEDDED in MTN0 (strokes 17-48). Do not author it as a separate `PANORAMA` entry with new coordinates — derive the rendered moon from MTN0's brite-7/2/5 strokes. A `PANORAMA` polyline may still be `name:'moon'`, but its points must come from the ROM data, not the old arcs.
4. **Citations gate (WILL break — fix it):** editing `horizon.ts` shifts/removes the lines cited by `pair-horizon.json`. H-002 (`ours` = horizon.ts:57) and H-003 (`ours` = horizon.ts:81) are the defects THIS story removes — mark each `remediated_by: "bz3-8"`. The citations checker still requires a WELL-FORMED `ours` whose verbatim matches a real line (a remediated DIVERGENCE may not null `ours`) — re-point/re-quote to a surviving horizon.ts line. Also re-check H-004/H-005/H-007/H-008/H-009 `ours` line numbers for drift and re-anchor any that moved. Run `npm test -- citations` before handoff.
5. **Verify:** `npx vitest run` (all green incl. the 14 new), `tsc --noEmit` clean, `npm test -- citations` green.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/models.ts` — added `MtnStroke` type + `MTN_SEGMENTS` (8 segments, 157 strokes, byte-exact ROM decode of BZMTNS.MAC:19-183), in its own "Mountain-scape backdrop ridge" section (not forced into `Model3D`, which is a different shape).
- `battlezone/src/core/horizon.ts` — removed `MOUNTAIN_RIDGE` (old two-sine) and `MOON` (old crescent); kept `VOLCANO` untouched (H-008 is a separate story); re-exports `MTN_SEGMENTS`/`MtnStroke` from `models.ts`; added `deriveMtnPanorama()`, which walks the ROM strokes into angular `PanoramaPolyline`s (mountains + moon), breaking at brite-0 pen-ups; `PANORAMA` is now `[...MTN_PANORAMA, VOLCANO]`; rewrote the stale header premise.
- `battlezone/docs/audit/findings/pair-horizon.json` — H-002/H-003 marked `remediated_by: "bz3-8"` (their historical `ours` citations left untouched — the checker doesn't re-validate a remediated finding's `ours` beyond requiring `ours.file` truthy, and `reanchor-citations.mjs` deliberately skips remediated findings); H-001's `ours` re-pointed from the deleted `MOUNTAIN_RIDGE` line to the new `MTN_PANORAMA` line (its old quote is gone entirely, so this needed a manual re-anchor, not the automated tool); H-004/H-005/H-007/H-008/H-009 auto-re-anchored via `node tools/audit/reanchor-citations.mjs --write` (unchanged text, shifted line numbers) — verified 0 remaining drift with a second dry run.

**Tests:** 910/910 passing (GREEN), including the 34 in `horizon-mtns.test.ts` + `horizon.test.ts`. Citations: 12/12. `tsc --noEmit` clean. `npm run lint` clean.
**Branch:** feat/bz3-8-mountain-moon-geometry (pushed, commit 6a7ffec)

**Handoff:** To Reviewer.

**Reviewer should scrutinize:**
- **Byte-exactness of the `MTN_SEGMENTS` decode** in `models.ts` — I copied it verbatim from the RED test fixture (not re-derived from the .MAC source myself); the 34 passing tests in `horizon-mtns.test.ts` cross-check it structurally and by exact deep-equal against that same fixture, so this mainly confirms internal consistency between the fixture and `models.ts`, not fresh independent verification against BZMTNS.MAC.
- **The render-translation judgment call** (`deriveMtnPanorama()`): the RED contract deliberately left the relative-delta-to-angular-space mapping to Dev. I chose ONE shared scale (`TAU/4096`) for both azimuth and elevation, derived from the empirical fact that all 8 segments' deltas close a loop (verified by simulation, logged as a Delivery Finding above) — worth an independent sanity check that this reading of the ROM data is reasonable, since it's an interpretation, not a pinned test value.
- **The citations remediation mechanics** for H-002/H-003 — I left their `ours.line`/`ours.verbatim` exactly as originally audited (pointing at now-deleted code) rather than re-quoting to a surviving line, based on reading `check-citations.mjs`/`reanchor-citations.mjs`'s actual logic (a remediated non-`NO_COUNTERPART` finding's `ours` is never re-validated against the live file). This is a deviation from the session's literal GREEN guidance text ("re-quote `ours` to a surviving line") — logged as a Delivery Finding above with the reasoning; worth confirming this reading of the tool is right.

## Reviewer Assessment

**Verdict:** APPROVED

**Independent ROM decode (the whole point of this story):** I re-decoded MTN0-7 from `BZMTNS.MAC:19-183` (`.RADIX 16`) from scratch — by hand AND with an independent parser that does NOT read the RED fixture — and deep-compared against `models.ts`'s `MTN_SEGMENTS`. Result: **BYTE-EXACT, 0 mismatches** across all 8 segments. Verified: segment boundaries, per-segment counts `[50,14,31,16,11,15,14,6]`, 157 total, and every `[dx,dy,brite]` stroke (signs, hex→dec, brightness tier). Spot-checks landed in all 8 segments — e.g. MTN2:108 `-40,18,3`→`[-64,24,3]`, MTN5:148 `0E0,-20,3`→`[224,-32,3]`, MTN7:177 `0C0,0,0`→`[192,0,0]`. The moon (MTN0 strokes 17-48, `BZMTNS.MAC:36-67`) matches: PART A 14×brite-7 (first `[5,-12,7]`), PART B 6×brite-2, inner 9×brite-5 with two brite-0 moves + a brite-2 close. Closed-loop confirmed independently: every segment sums to `[512,0]`, grand total `[4096,0]`; cumulative y min/max = `0`/`163` (never negative — the no-clamp render property is real).

**H-001 premise honored:** the ported data is MTN0-7, NOT the BATBL title-logo (object 0x17 / LOGOBJ). Confirmed — no BATBL bytes appear in `MTN_SEGMENTS`.

**Render-mapping verdict:** SOUND, documented interpretation — not a defect. Horizontal scale `TAU/4096` is ROM-exact (4096 units = one 360° wrap, confirmed by H-005). Delta accumulation closes the loop; brite-0 pen-ups correctly flush/split polylines (verified against beam semantics — the moon's internal brite-0 moves at strokes 37/43 split it into the expected sub-polylines, and every MTN segment opens with a move so no phantom line crosses a segment seam). The single shared scale for elevation is the ROM's own authored 1:1 aspect; the source does not pin a separate vertical angular scale (audit filed that STRUCTURAL as H-009, deferred). Logged as a non-blocking Question, tied to H-009.

**Citation-honesty verdict:** HONEST. Verified against `tools/audit/check-citations.mjs:98-132` and `reanchor-citations.mjs:48-51`: a remediated non-`NO_COUNTERPART` finding's `ours` is DELIBERATELY frozen as historical record and never re-opened against the working tree (checker only requires `ours.file` truthy; reanchor tool skips it). Leaving H-002/H-003's original `ours` is the DESIGNED behavior, not a stale/false quote — the TEA GREEN-guidance text "re-quote to a surviving line" was over-specified and would have been *less* correct (it would point the defect at unrelated surviving code). H-001 re-anchor (→line 123) and the auto-re-anchors H-004(→188)/H-005(→152)/H-007(→178)/H-008(→129)/H-009(→55) are all line-only and byte-exact against the live file. `npm test -- citations` = 12/12.

**VOLCANO:** untouched — const body unchanged, still `[...MTN_PANORAMA, VOLCANO]`; H-008 (bz3-6's job) correctly left un-remediated. Only `MOUNTAIN_RIDGE` and `MOON` were removed.

**Data flow traced:** `BZMTNS.MAC` VCTR bytes → `MTN_SEGMENTS` (models.ts, byte-exact) → `deriveMtnPanorama()` accumulates deltas → angular `PanoramaPolyline[]` → `skylineSegments()` → `SceneSegment[]`. Pure, deterministic, no DOM/time/RNG.

**Deviation audit:**
- Dev "single `TAU/4096` render scale" — **ACCEPTED**: not test-pinned, horizontal component ROM-exact, vertical component the least-assumption choice, calibration open under H-009.
- Dev "data lives in models.ts, re-exported from horizon.ts" — **ACCEPTED**: matches the core/shell-split instruction; `MTN_SEGMENTS` is a flat stroke run, not a `Model3D`.
- Dev "left H-002/H-003 `ours` untouched (no re-quote)" — **ACCEPTED**: verified correct against the citation tooling's actual logic; the literal GREEN guidance was wrong, Dev's reading is right.
- TEA "byte-exact DATA pin" — **ACCEPTED**: correct call; a structural-only test could never go RED against the two-sine ridge.

**Independent verification results (my own runs):**
- `npx vitest run` → **910 passed / 0 failed** (65 files)
- `npx vitest run tests/audit/citations.test.ts` → **12 passed / 0 failed**
- `npx tsc --noEmit` → **clean (exit 0)**

**Findings:** No Critical, no High. Two non-blocking observations logged under Delivery Findings (brightness flattened at render; vertical scale unpinned/H-009). One style nit: `export { MTN_SEGMENTS }` re-exports an imported binding (could be `export … from './models'`) — harmless, LOW.

**Handoff:** To SM for finish-story.
