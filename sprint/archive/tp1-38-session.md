---
story_id: "tp1-38"
jira_key: "tp1-38"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-38: THE MOVING EYE, part 3 — the full rim-fly-off: the near rim sweeps past the advancing eye and off-screen while the Claw rides CURSY (WD-012 full fidelity beyond tp1-33's near-ring-fixed model)

## Story Details
- **ID:** tp1-38
- **Jira Key:** tp1-38
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** tempest
- **Branch:** feat/tp1-38-moving-eye-rim-fly-off

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T16:09:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T15:18:37Z | 2026-07-17T15:22:39Z | 4m 2s |
| red | 2026-07-17T15:22:39Z | 2026-07-17T15:44:02Z | 21m 23s |
| green | 2026-07-17T15:44:02Z | 2026-07-17T15:59:19Z | 15m 17s |
| review | 2026-07-17T15:59:19Z | 2026-07-17T16:09:09Z | 9m 50s |
| finish | 2026-07-17T16:09:09Z | - | - |

## Story Context

### Background: WD-012 and the Three-Part Eye Arc

This is Part 3 of a three-story arc implementing the ROM's full warp-dive camera behavior (WD-012: "the ROM dives the CAMERA with the Claw"). 

- **tp1-33 (Part 1):** Implemented the descent well-expansion via `warpDiveTube` — the far ring expands outward on screen while the NEAR ring (rim/Claw) is held FIXED.
- **tp1-37 (Part 2):** Implemented the fly-in phase, where the eye flies INTO the new well over NEWAV2 (WD-018).
- **tp1-38 (Part 3):** Implements the full rim-fly-off — the near rim sweeps PAST the advancing eye and off-screen. The Claw detaches from the rim and rides a fixed screen point (PY=CURSY), creating the optical effect of the well truly "falling away" around the player.

### Current State: tp1-33's Simplification

From tp1-33's session archive (Reviewer notes):

> "the full ROM dive also sweeps the NEAR rim past the advancing eye and off-screen (the Claw detaches from the rim to PY=CURSY, a fixed screen point). This story's near-ring-fixed model is faithful to the headline ('well expands past the fixed Claw') and to the shipped clawTransform, but the rim-fly-off is a further-fidelity follow-up."

And from the Delivery Finding:

> "Full rim-fly-off (claw at CURSY, rim off-screen) is a further-fidelity follow-up → Delivery Finding."

So tp1-33 shipped with the Claw fixed at the near ring's screen position. This story completes the ROM-faithful model by:
1. Moving the Claw to ride PY=CURSY (a fixed screen depth), detaching it from the near ring
2. Allowing the near ring to expand/sweep inward (toward the advancing eye) and off-screen
3. Making the well's rim disappear as part of the dive-into-the-well visual

### ROM Source

From tp1-33's session, the relevant ROM source is:
- **Eye advancement:** `MOVCUD` (ALWELG.MAC:1049-1062) — the eye and cursor both advance by identical velocity `CURSVH:CURSVL` each frame
- **Claw drawing:** `DSPCUR` (ALDISP.MAC:604-608) — draws the cursor at `PYL = CURSY` (a fixed ROM depth, not the rim)
- **Projection scale:** `CASCAL` (ALDISP.MAC:1449-1460) — projects each object using `(PYL - EYL)`, so when both `CURSY` and `EYL` advance by the same amount, the relative scale (and screen position) of the Claw remain invariant

### Provisional Acceptance Criteria (SM-Derived)

These ACs are drafted by the Scrum Master from the epic context and predecessor archives. **TEA must verify them against the ROM source during RED.**

1. **The Claw rides a fixed screen point (PY=CURSY), not the near ring.** During the warp dive, the Claw's projected depth is derived from `CURSY` (a fixed ROM depth), not from the near ring's position. The Claw does not shrink or move as the eye advances; only the well's geometry changes relative to it.

2. **The near ring expands/sweeps inward and becomes visible off-screen.** As the eye advances during the dive, the near ring (rim) gets closer to the eye, shrinking its screen radius (the inverse of the far ring's expansion). The near ring eventually sweeps past the eye and off-screen (screen Y < 0 or > max), creating the illusion of the well "falling away."

3. **The effective far/near ratio expands to beyond 1.0 (inverted), allowing rim-off-screen.** In tp1-33, the near ring was held fixed and the far ring contracted to meet it (R_eff: R → 1). In this story, as the eye advances PAST the near ring (in ROM units), the ratio can exceed 1.0, where the "near" in screen space is actually farther from the camera than the "far" — flipping the geometry. This is the mathematical envelope that allows the rim to sweep backward off-screen.

4. **Reuse the `warpDiveTube` seam, but adapt it for the moving rim.** The core `warpDiveTube(tube, progress)` function from tp1-33 may be reused or refactored to compute the rim's position as a function of the eye's advance (rather than holding it fixed). The Claw transform moves from the rim to `PY=CURSY` in the render layer.

5. **The Claw's screen position is fixed; only the well moves.** The Claw should not drift on screen as the dive progresses. It rides the fixed projection of `CURSY`. The well's near and far rings move relative to the fixed Claw, creating the rush-inward effect.

6. **Render integration: Claw drawn at CURSY depth, not clawTransform at the rim.** The shell render needs to feed the Claw's depth as a constant `CURSY` (or recovered from the game state) rather than tying it to the near ring's screen Y. Non-blocking shell verification by driving the game.

7. **Scope and dependencies:** Depends on tp1-33 (the warpDiveTube seam and the descent well-expansion) and tp1-37 (the fly-in eye field). Does NOT implement the starfield-OFF gate (PLAGRO=1 at EYH≥0xFC, a render concern — deferred to a render-polish follow-up). All cited ROM constants and the eye-advance math are tested and referenced to the source.

### Touch Points (Key Files to Modify)

**Core simulation (src/core/):**
- `geometry.ts` — Adapt `warpDiveTube` or create a new function (e.g., `warpDiveTubeRimFlyOff`) to compute ring positions with the near ring moving inward. The near ring's screen radius shrinks as the eye advances, eventually going negative (off-screen).
- `rules.ts` — May need `CURSY_CONSTANT` or confirm it's derived from the ROM. The Claw's depth during warp must be pinned.

**Shell render (src/shell/):**
- `render.ts` — The Claw transform during warp must use `CURSY` depth (or the equivalent in canvas units) rather than the near ring's screen position. Non-blocking visual verification.

**Tests:**
- NEW `tests/core/tp1-38.warp-rim-flyoff.test.ts` — Test the near ring's movement, the inverted R_eff behavior, and rim-off-screen conditions.
- RE-SEAT `tests/core/tp1-33.warp-eye.test.ts` (if necessary) — May need updates if tp1-38 changes `warpDiveTube`'s contract.

### Prior Archives: ROM Quarry & Findings

**tp1-33-session.md** (Reviewer notes):
- Identified the full rim-fly-off as a deferred follow-up
- Documented the `warpDiveTube` seam (reusable by this story)
- Noted that the ROM's `CURSY` is fixed at 0x10 during ordinary play, but during the dive it follows `MOVCUD`'s advancement

**tp1-37-session.md**:
- Documented the fly-in eye's `+0x18/frame` advancement and per-well `EYLDES` destination
- Confirmed that `WarpState.eyeY` is now a live field advancing during descent + fly-in

### Known Constraints & Risks

- **Off-screen rim rendering:** Once the near ring goes off-screen, render.ts may need to clip or handle screen-wrapping gracefully. Shell concern; not blocking RED.
- **Inverted far/near ratio:** When R_eff > 1.0, the projection pipeline's assumption that "far > near" breaks. Unit tests must confirm divide safety and finite geometry.
- **Claw depth derivation:** The ROM draws the Claw at `DSPCUR` using `PYL = CURSY`. In our canvas-unit system, `CURSY` must be recovered or pinned as a constant. Verify against tp1-10 and render integration.
- **Sibling test ripple:** Existing `tp1-33` and `tp1-37` warp tests may rely on the near-ring-fixed model. Re-seats expected.

## Sm Assessment

**Story selection:** User-directed (`/pf-work tp1-38`). Merge gate clear — zero open tempest PRs. Sibling-checkout race check: origin fetched, no `tp1-38` branch or commit on tempest origin (a-2/a-3 not on this story).

**Setup decisions:**
- Workflow `tdd` (phased, per epic YAML) → red phase, owner TEA.
- Branch `feat/tp1-38-moving-eye-rim-fly-off` created from a freshly fetched `origin/develop` — tempest is gitflow; PR will target `develop`.
- Story context enriched from the tp1-33/tp1-37 archive sessions (prior TEA pre-extracted the WD-012 quarry) rather than re-derived.
- Status `in_progress` set via pf CLI; epic YAML round-trip verified clean (2 insertions, 1 deletion). Setup committed to orchestrator main (`d7ab954`) after rebasing over a sibling's sw7-17/rb4 push.

**Handoff notes for TEA (O'Brien):**
- WD-012 finding labels in the story title/context are unverified guesses — re-pull the claim + reasoning (watch for [REFUTATION]/[CORRECTION]) and `remediated_by` from `tempest/docs/audit/findings/` before writing RED.
- Prior-art risk: tp1-33/tp1-37 warp tests assume the near-ring-fixed model; expect re-seats, not silent green.
- Citation gate: any edit to cited files (render.ts) requires re-anchoring (`node tools/audit/reanchor-citations.mjs --write`) or `npm test -- citations` goes red.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `tempest/tests/core/tp1-38.warp-rim-flyoff.test.ts` — the descent-law suite: near-rim expansion `kNear = (16+H)/((16+H)−224p)` about the per-well VP, universal fraction law `kNear(f·p*) = 1/(1−f)`, far-ring absolute law + per-vertex continuity with the shipped `warpDiveTube`, the `rimBehindEye` crossing at `p* = (16+H)/224`, `farRatio = (16+H−224p)/(240+H−224p)`, claw-frame divergence (AC6), fly-in seam keep-behavior guards (AC7), totality/purity, and a live-dive wiring test.
- `tempest/tests/shell/tp1-38.warp-rim-flyoff-render.test.ts` — `?raw` source pins (tp1-10 precedent strength): render calls `warpDescentTube(`, keeps `warpDiveTube(` for the fly-in, consults `rimBehindEye`, and drops the `clawTransform(tube, …)` warped-tube claw anchor.
- `tempest/tests/core/tp1-33.warp-eye.test.ts` — COMMENT-ONLY re-scope: its pins are now permanent keep-behavior guards for the fly-in frame (see the seam-split rationale below). Zero functional re-seats.

**Tests Written:** 27 (22 core + 5 shell) covering the story's corrected ACs
**Status:** RED (verified by testing-runner, run tp1-38-tea-red: 19 core failures all `warpDescentTube is not a function` — the right reason; 3 shell wiring reds; 5 intended pre-GREEN guard passes audited; tp1-33 fully green; citations green; zero regressions elsewhere; 1626 passed / 22 failed)

**The contract (for Julia):** a NEW pure seam `warpDescentTube(tube, progress): Tube & { rimBehindEye: boolean }` in `geometry.ts`. The shipped `warpDiveTube` MUST NOT change — it remains the fly-in's transform (ONELN2's behind-eye cull is disarmed while the eye is negative: `LDA EYH / IFPL`, ALDISP.MAC:1550-1552). Far ring: identical absolute path to `warpDiveTube`'s (proved algebraically; pinned per-vertex). Near ring: scaled about the same VP by `kNear`, finite at the singular `p*` exactly, flagged `rimBehindEye` past it. Render: descent branch draws the descent tube, consults the flag (abort rim-dependent draws — the ONELN2 cull is the shell's job), and anchors the Claw from the STATIC tube (the `(CURSY−EY) ≡ 16+H` invariant — no new constant needed).

**ROM quarry (byte-verified this phase):**
- MOVCUD eye advance + carry into EYH: ALWELG.MAC:1049-1057; re-projection request :1058-1061; CURSY past-bottom forced to 0xFF :1038-1039; starfield INSTAR gate at CURSY ≥ 0x50 :1041-1048 (out of scope, see findings).
- CASCAL `(PYL−EY)` divide: ALDISP.MAC:1449, 1456-1464. DSPCUR cursor gate: :604-608.
- ONELN2 behind-eye cull + EYH IFPL disarm: ALDISP.MAC:1550-1558.
- WD-012 (pair-9-warp-drop-mode.json): CONFIRMED; its `[REFUTATION]` section strengthens the claim; `remediated_by: tp1-10` covers the Claw-fixed half only.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety (no `any`; narrowing intersection for the flag) | `rimFlag` helper via `Tube & { rimBehindEye?: boolean }`; flag `typeof === 'boolean'` runtime pin | failing (RED) |
| #2 interface contract (readonly/shape preserved) | AC1 ring/ratio/translate preservation; totality block laneCount/closed/screenZ pins | failing (RED) |
| #4 null/undefined (`??` semantics; explicit boolean) | AC1 `rimBehindEye === false` (not merely absent); AC7 `?? false` on the legacy seam | failing (RED) / guard green |
| #7 purity/determinism | referential-transparency + no-mutation test; live-dive determinism via seeded state | failing (RED) |
| #8 test quality (no vacuous asserts) | self-checked: every `it` carries concrete numeric assertions; recoverVpY cross-checks VP.x=0 in-suite | done |

**Rules checked:** 5 of 13 applicable (no enums, async, React, JSON parsing, or error paths in a pure-geometry story)
**Self-check:** 0 vacuous tests found; the 5 pre-GREEN passes were audited as intended guards (ROM-literal p* pin + fly-in keep-behavior + drawWarp-exists + warpDiveTube-in-service)

**Handoff:** To Julia (Dev) for GREEN. Reminders: geometry.ts and render.ts are CITED files — run `node tools/audit/reanchor-citations.mjs --write` after edits and keep `npm test -- citations` green; do not touch `warpDiveTube`'s behavior (AC7 guards will catch it); the AC-5 trace-proven performance criterion from tp1-40 does not apply here, but keep the descent path allocation-light (it runs per frame).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/geometry.ts` — new pure seam `warpDescentTube(tube, progress): WarpDescentTube` (Tube + `rimBehindEye`), plus `warpEyeClipDepth` and `WARP_EYE_CLIP_MARGIN`. Rim scales by `R/rho` (`rho = R − p(1−R)` ∝ `16+H−224p`) about the per-well VP via the VP-free identity `(near0 − VP) = (near0 − far0)/(1 − R)`; far ring keeps `warpDiveTube`'s verbatim expression (bit-identical continuity); `farRatio = rho/D` while visible. Once flagged (`rho ≤ 1e-6`), the near ring parks at the eye-plane clip ring — scale `R/(margin·(1−R))`, progress-independent because `p + d_eye ≡ 1/(1−R)` — finite everywhere, off the phosphor box on every well. `warpDiveTube` untouched (the fly-in frame).
- `tempest/src/shell/render.ts` — descent branch maps the scene through `warpDescentTube` (fly-in keeps `warpDiveTube`); when `rimBehindEye`, the view's spike heights are re-parameterised onto the truncated span `min(h, span)/span` with `span = warpEyeClipDepth − margin` (keeps the projective interpolation EXACT for visible spike points — verified: scale 0.470 vs true 0.471 at p=0.5); `drawTube` skips the rim stroke + rim sparks when flagged (ONELN2's abort); `drawWarp` anchors the Claw explicitly from `staticTube` (rename + comment — see the finding below on TEA's premise).
- `tempest/docs/audit/findings/pair-2,4,6.json` — re-anchored: exactly 16 `ours.line` re-points, 0 LOST, no verbatim/field changes (semantic diff inventory verified field-by-field; pair-4's `—`→`—` unicode churn is the known serializer artifact, content-identical).

**Tests:** 1648/1648 passing (GREEN), 138 files; `tsc --noEmit` clean; citations suite green.
**Branch:** feat/tp1-38-moving-eye-rim-fly-off (pushed, `1170ed0`)

**Handoff:** To O'Brien for the verify phase (simplify + quality-pass). The visual eyeball run (rim streaming off-screen, Claw steady, fly-in unchanged) is delegated per the TEA AC-6 deviation — the Reviewer should drive a level-1 warp. Beware the pinned-port trap (5273 may be a sibling checkout's server — check `lsof` cwd first).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 1648/1648, tsc clean, build clean, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [EDGE] observations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [RULE] / Rule Compliance) |

**All received:** Yes (1 returned clean; 8 disabled via settings, domains reviewed personally)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `s.warp.progress` (sim, monotone 0→1) → render `warpProgress` (clamped ≤1) → `warpDescentTube(s.tube, p)` → `scene.tube` + `rimGone` → `drawTube`/`drawSpikes` on the render-local view (spikes re-parameterised copy — the sim's `s.spikes` is never mutated; verified: `.map` on the spread view only), while `drawWarp(pctx, s, color)` receives the UNMAPPED `s` — its Claw anchor comes from the static tube. Safe because the warped view exists only inside `render()`; sim collision still runs on true sim-unit heights (`warpClawDepth`, untouched).

**Pattern observed:** consumer-scoped transform seams — `warpDiveTube` (fly-in frame) vs `warpDescentTube` (descent) at geometry.ts:317/371 — a good pattern: each consumer's contract stays permanently true rather than one seam serving two phases with opposite cull semantics (ONELN2's `EYH IFPL` disarm, verified verbatim in ALDISP.MAC:1550-1558 against ~/Projects/tempest-source-text this session).

**Error handling:** `warpDescentTube` is total over the render's input domain — the flagged branch parks the near ring at the constant clip-ring scale instead of dividing by the vanishing `rho`; `warpEyeClipDepth`'s `1−R` divisor is nonzero by construction (`makeRingTube` gives R = (16+H)/(240+H) < 1 for every well); the render's `Math.max(0.01, spikeSpan)` floor can never bind at warpProgress ≤ 1 (d_x(1) = R/(1−R) ≥ 26/224·…≈0.116) — a cheap defensive guard, not dead logic hiding a bug.

### Observations

1. `[VERIFIED][RULE]` Core purity — `warpDescentTube` is pure arithmetic over its inputs, new arrays via `.map`, no DOM/clock/RNG; complies with the hard core boundary (CLAUDE.md). Evidence: geometry.ts:371-395; referential-transparency + no-mutation tests green.
2. `[VERIFIED][EDGE]` Boundary at p*: flag threshold `rho ≤ 1e-6` sits ~1.2e-6 of progress from true p*; TEA's ±1e-3 pins bracket it; at exact float p* the flagged branch avoids the singular divide entirely. Worst unflagged kNear = R/1e-6 ≈ 1.5e5 — finite, one-frame-band unreachable at real dive steps (~0.02/frame).
3. `[VERIFIED][EDGE]` Interior projection exactness, both phases — worked numbers: unflagged p = p*−0.01, h = 0.5 → pipeline scale 0.350 ≡ true CASCAL R/(1−(p+h)(1−R)); flagged p = 0.5, re-spanned h → 0.470 vs true 0.471 (margin-bounded). The re-parameterisation claim in the mapping comment is TRUE, not aspirational.
4. `[VERIFIED][SILENT]` No silent degradation: vacant-lane sentinel survives the rescale (h = 0 → 0/span = 0; drawSpikes skips h ≤ 0 — the ROM's LINEY-vacant convention, the tp1-15 lesson checked); no swallowed errors introduced; sim crash semantics untouched (crash while flagged still reads visually — the drawn spike spans the Claw's screen radius, confirmed in screenshot C).
5. `[VERIFIED][TEST]` tp1-33's edit is a describe-title string ONLY (diff grep: zero non-comment assertion lines changed); the RED suite's 5 pre-GREEN passes are intended guards; the live-dive test proves the flag flips in real play. No weakened assertions anywhere.
6. `[LOW]` `[DOC]` PRE-EXISTING stale phrase: warpDiveTube's tp1-33 comment still says the fly-in "keeps its shipped countdown placeholder" (geometry.ts:314-316) — tp1-37 shipped the real eye walk. Not introduced by this diff; filed as a non-blocking Delivery Finding.
7. `[VERIFIED][TYPE]` `WarpDescentTube extends Tube` with `readonly rimBehindEye: boolean`, always-explicit boolean on the new seam; consumers narrow via `in` — zero casts, zero `as any`/`@ts-ignore` in the diff (preflight smell scan: 0).
8. `[VERIFIED][SEC]` No security surface: pure geometry + canvas render, no input parsing, no storage/network. Tenant isolation N/A (client-only game, no tenancy concept).
9. `[LOW]` `[SIMPLE]` drawWarp's speed streaks still ride the static tube's spokes — radially identical rays, shorter extent than the diving well. Cosmetic; Dev already logged it; non-blocking.
10. `[VERIFIED][EYEBALL]` 4-frame render probe against THIS checkout's dev server (port 5273 ownership proven via `lsof` cwd = /Users/slabgorb/Projects/a-1/tempest; probe drove the real `render()` on models.html — no game loop interference): (A) p=0.02 no pop, rim + sparks drawn; (B) p=0.10 rim swept past the screen edges, Claw pinned at the identical spot; (C) p=0.50 flagged — rim/sparks culled, floor ring expanded, spikes streaming past the stationary Claw, zero inversion/NaN artifacts; (D) fly-in level-2 square keeps its rim mid-un-flatten. Screenshots: scratchpad `tp1-38-eyeball/`.

### Rule Compliance

TypeScript lang-review checklist vs every changed `.ts` file:

| # | Check | Instances judged | Result |
|---|-------|------------------|--------|
| 1 | Type-safety escapes | whole diff | Compliant — no `as any`, `@ts-ignore`, `!`, or unvalidated predicates; tests use a narrowing intersection (`Tube & { rimBehindEye?: boolean }`) |
| 2 | Generic/interface pitfalls | `WarpDescentTube`, `warpEyeClipDepth`, `warpDescentTube`, render locals | Compliant — `readonly` flag field; no `Record<string,any>`/`object`/`Function`; input `tube` treated as immutable |
| 3 | Enum anti-patterns | none in diff | N/A |
| 4 | Null/undefined | `s.warp.flyIn ?? 0`, `eyeY ?? EYE_FLYIN_START` (pre-existing pattern, correct `??`); new flag is a required boolean — no nullish path | Compliant |
| 5 | Module/declaration | `export interface` (type-only, erased), value exports consumed by render | Compliant |
| 6 | React/JSX | N/A | N/A |
| 7 | Async/promises | none in diff | N/A |
| 8 | Test quality | both new suites + tp1-33 edit | Compliant — literal-pinned oracles, no `as any`, no vacuous asserts; pre-GREEN passes audited |
| 9 | Build/config | untouched; `tsc --noEmit` + `vite build` green | Compliant |
| 10 | Input validation | no user input in diff | N/A |
| 11 | Error handling | totality analysis above; no catch blocks needed (pure math) | Compliant |
| 12 | Performance/bundle | two 16-pt array allocs per warp frame + one 16-len map when flagged — negligible vs the tp1-40 budget; zero new `shadowBlur` (glow suites green) | Compliant |
| 13 | Fix-introduced regressions | re-scanned the GREEN diff after the claw rename + rim gate | Compliant |

### Devil's Advocate

Assume it is broken. The likeliest fracture is the flag boundary: `rho ≤ 1e-6` is a taste threshold, and a frame landing inside the sliver between the true p* and the flag would divide by a near-zero `rho`, drawing spokes to ±4.5e7 canvas units. But the sliver is ~1.2e-6 of progress wide against real dive steps of ~0.02 — odds ~6e-5 per dive — and the failure mode is off-screen strokes for one frame, not NaN (only exact zero diverges, and exact zero is inside the flag). Second attack: the clip margin 0.02 is invented, not a ROM byte — true, and logged as a deviation; the ROM's own equality frame feeds (PY−EY)=0 into the math box, so *any* finite margin is a port decision; the visible consequence is bounded by the margin and the probe shows no artifact. Third: the spike view rescale changes `scene.spikes` semantics — a future warp-branch reader expecting sim units would mis-read; the mapping comment says so, but a comment is weak armor; residual risk accepted as LOW with the deviation on record. Fourth: the claw textual pin can be fooled by a rename — so I did the trace myself rather than trusting the regex: the call site passes the unmapped `s` (diff hunk context, line unchanged), and drawWarp has no other tube in scope; structural. Fifth: could a crash mid-flagged-phase look wrong — claw dying to a spike whose drawn tip was clipped? The drawn spike line spans the claw's screen radius (screenshot C shows lane-3's spike crossing the Claw exactly), so the crash reads. Sixth: does the phosphor ghost the culled rim? Yes, briefly — as a natural fade-out, which is arguably more cabinet-authentic than a hard cut. Nothing here rises above LOW.

**Handoff:** To Winston Smith (SM) for finish-story. Merge requires the user's authorization (self-approval guardrail).
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): once `rimBehindEye` is set, render's rim-dependent draws must be aborted or clipped, not merely left to blow up — drawWarp's streak loop lerps far↔near per spoke, and spikes during the dive project near-ring-dependent geometry (deep spike TIPS cross behind the eye once p > (32+H)/224 on non-player lanes). The ROM's pattern is ONELN2's abort (ALDISP.MAC:1550-1558).
  Affects `tempest/src/shell/render.ts` (drawWarp streaks, warp-phase spike drawing — draw the visible along-span only).
  *Found by TEA during test design.*
- **Gap** (non-blocking): fly-in visual fidelity residue (WD-018): the ROM's fly-in grows the WHOLE well from tiny (eye parked at −1536 → rim scale ∝ 1/(16−EY)), while our mapping keeps the rim full-size and walks the ratio 1→R via the near-fixed seam. Faithful, growing fly-in is a candidate follow-up story — NOT this one (scope: the descent).
  Affects `tempest/src/shell/render.ts` (fly-in mapping) and `tempest/src/core/geometry.ts` (would need an eye-parameterised well).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM starts the warp starfield when the CURSOR passes 0x50 (`LDA CURSY / CMP I,50 / IFCS / … / JSR INSTAR`, ALWELG.MAC:1041-1048), i.e. at progress (0x50−0x10)/224 ≈ 0.286 — our `WARP_STARFIELD_GATE` is a progress constant; worth a one-line fidelity check against that byte in a future polish story (the epic already defers the PLAGRO OFF-gate).
  Affects `tempest/src/core/rules.ts` (WARP_STARFIELD_GATE).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): TEA's render-wiring premise was partially incorrect — `drawWarp` was already called with the UNMAPPED state (render.ts passes `s`, not the mapped `scene`), so the dive Claw was already anchored to the static tube; the warped tube only ever reached `drawTube`/`drawSpikes`. The `staticTube` rename makes this structural (and satisfies the textual pin), but no behavioral claw bug existed to fix. The Reviewer should still diff-trace that `scene` never reaches `drawWarp`.
  Affects `tempest/src/shell/render.ts` (drawWarp call site — documentation of intent).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's flagged-phase render finding is ADDRESSED for rim strokes, rim sparks, and spikes (gated/re-parameterised); drawWarp's speed STREAKS still lerp over the static tube's spokes — radially identical rays, shorter extent than the diving well. Cosmetic; worth a look in the eyeball run, not a correctness gap.
  Affects `tempest/src/shell/render.ts` (drawWarp streak span).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): stale pre-existing phrase in `warpDiveTube`'s tp1-33 comment — "Phase-2 … keeps its shipped countdown placeholder" — tp1-37 replaced the countdown with the real eye walk. One-line comment fix for any future story touching geometry.ts (re-anchor citations after).
  Affects `tempest/src/core/geometry.ts` (tp1-33 comment block, ~line 314).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Corrected the story context's "shrinking rim" to EXPANSION**
  - Spec source: context-story-tp1-38.md, provisional AC-2 (and Touch Points)
  - Spec text: "the near ring (rim) gets closer to the eye, shrinking its screen radius … eventually going negative"
  - Implementation: tests pin the rim EXPANDING — scale ∝ 1/(16+H−224p) about the VP, diverging at p* = (16+H)/224, then behind the eye
  - Rationale: the projection law (CASCAL: scale ∝ 1/(PY−EY), ALDISP.MAC:1449-1464) says an object nearing the eye GROWS; the refutation is written into the test ("REFUTES the rim-shrinks misconception") per the tp1-27 rule
  - Severity: minor
  - Forward impact: Dev implements expansion; anyone reading the context file should trust the test header over its AC-2 prose
- **Split the seam instead of adapting `warpDiveTube` in place**
  - Spec source: context-story-tp1-38.md, Touch Points ("Adapt `warpDiveTube` or create a new function")
  - Spec text: "Adapt warpDiveTube … to compute the rim's position as a function of the eye's advance (rather than holding it fixed)"
  - Implementation: NEW `warpDescentTube` seam; `warpDiveTube` retained near-ring-fixed as the fly-in frame
  - Rationale: ONELN2's cull is disarmed while the eye is negative (`LDA EYH / IFPL`, ALDISP.MAC:1550-1552) — the fly-in mapping must never fly the rim off; a progress-only signature cannot serve both phases. Bonus: tp1-33's suite needs zero functional re-seats (comment re-scope only)
  - Severity: minor
  - Forward impact: render's descent branch switches seams; tp1-33's pins become permanent fly-in guards
- **Cull boundary pinned as false-below / true-above p*, finiteness AT it**
  - Spec source: ROM ONELN2 (ALDISP.MAC:1553-1558)
  - Spec text: "LDA PYL / CMP EYL / IFCC / RTS ;THEN ABORT LINE" — strictly-behind aborts; the equality frame feeds (PY−EY)=0 into the math-box divide (undefined-scale artifact)
  - Implementation: `rimBehindEye` pinned false at p*−1e-3 and true at p*+1e-3; at the exact float p* only FINITENESS is pinned, not the flag's value
  - Severity: minor
  - Forward impact: Dev may choose ≥ or > at the boundary; either passes; no NaN may escape
- **AC-6 render integration pinned textually, visuals delegated**
  - Spec source: context-story-tp1-38.md, provisional AC-6
  - Spec text: "Render integration: Claw drawn at CURSY depth … Non-blocking shell verification by driving the game"
  - Implementation: `?raw` source pins (descent seam called, flag consulted, warped-tube claw anchor spelling banned) at tp1-10.warp-camera precedent strength; the moving picture goes to the Reviewer's eyeball run
  - Severity: minor
  - Forward impact: a renamed-but-still-warped claw tube would fool the textual pin — Reviewer must diff-trace drawWarp's claw anchor source

### Dev (implementation)
- **Flagged-phase near ring parks at the eye-plane clip ring, not the true inverted rim**
  - Spec source: ROM projection law (CASCAL, ALDISP.MAC:1449-1464) + ONELN2 cull (ALDISP.MAC:1550-1558)
  - Spec text: behind the eye, `(PY − EY)` is negative — the rim's true projection inverts through the VP; the ROM aborts such lines rather than drawing them
  - Implementation: once `rimBehindEye`, the returned near ring sits at the eye-plane clip ring (scale `R/(WARP_EYE_CLIP_MARGIN·(1−R))`, progress-independent), on the correct outward rays, far off-screen
  - Rationale: the true inverted ring would draw spokes crisscrossing through the VP (exactly what ONELN2 exists to abort) and is singular AT p*; the clip ring keeps the seam total/finite (TEA's sweep), lands off the ±360 box on every well, and makes the truncated-span projective interpolation exact for the re-parameterised spikes
  - Severity: minor
  - Forward impact: any future consumer projecting interior depths on the FLAGGED descent tube must re-parameterise depths onto `[0, warpEyeClipDepth − margin]` as render does for spikes; the doc comment on `warpDescentTube` says so
- **Spike clipping implemented as a view-level re-parameterisation in the render mapping**
  - Spec source: TEA Delivery Finding ("draw the visible along-span only"), session Story Context touch points
  - Spec text: "render.ts (drawWarp streaks, warp-phase spike drawing — draw the visible along-span only)"
  - Implementation: the warp `scene` maps `spikes: h → min(h, span)/span` when flagged, rather than changing `drawSpikes`' signature or clipping inside it
  - Rationale: `drawSpikes` stays generic; the view state is already a render-local copy (no sim mutation); the rescale doubles as the exact-interpolation re-parameterisation
  - Severity: minor
  - Forward impact: the view's spike heights during the flagged phase are span-relative, not sim units — anything new reading `scene.spikes` inside the warp branch must know that (comment at the mapping says so)

### Reviewer (audit)

All six logged deviations audited; every one stamped, none flagged, none found undocumented:

- **TEA: "shrinking rim" corrected to EXPANSION** → ✓ ACCEPTED by Reviewer: CASCAL's 1/(PY−EY) law is unambiguous (ALDISP.MAC:1449-1464, read verbatim this session); the refutation-in-test protects the record.
- **TEA: seam split instead of adapting warpDiveTube** → ✓ ACCEPTED by Reviewer: ONELN2's `EYH IFPL` disarm (ALDISP.MAC:1550-1552) proves the fly-in must stay near-fixed; one progress-only signature cannot serve both phases; zero functional re-seats confirms the design.
- **TEA: cull boundary false-below/true-above, finiteness AT p*** → ✓ ACCEPTED by Reviewer: the ROM's equality frame is an undefined-scale artifact (divide by zero into the math box); pinning only finiteness there is the honest port.
- **TEA: AC-6 render integration pinned textually, visuals delegated** → ✓ ACCEPTED by Reviewer: I performed both the diff-trace (drawWarp receives the unmapped `s`; no other tube in scope) and the 4-frame eyeball probe (scratchpad tp1-38-eyeball/). The delegation was discharged, not dropped.
- **Dev: flagged near ring parks at the eye-plane clip ring** → ✓ ACCEPTED by Reviewer: the true inverted rim is exactly what ONELN2 aborts; the clip ring is finite, off-screen on every well (min m_clip ≈ 5.8 → ±1740 vs the ±360 box), and keeps the truncated-span interpolation exact (worked number verified).
- **Dev: spike clipping as view-level re-parameterisation** → ✓ ACCEPTED by Reviewer: render-local copy, sim state untouched, vacant-lane sentinel preserved; the exactness claim checked numerically (0.470 vs 0.471, margin-bounded).