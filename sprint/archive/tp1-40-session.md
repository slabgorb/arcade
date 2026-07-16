---
story_id: "tp1-40"
jira_key: "tp1-40"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-40: THE GLOW TAX — live shadowBlur saturates the GPU; production runs 8-34 fps

## Story Details
- **ID:** tp1-40
- **Jira Key:** tp1-40
- **Workflow:** tdd
- **Stack Parent:** none

## Story Context (From Architect Investigation)

**Root Cause:** Live ctx.shadowBlur glow — per-primitive Gaussian blur at device resolution, ~100+ blurred primitives per gameplay frame. Confirmed by controlled A/B: patching the shadowBlur setter to a no-op flipped laggy scenes to locked 60fps (emulated dpr=2), everything else (phosphor, gradients, sim) measured-innocent.

**User Trace:** (Trace-20260716T085610, PRODUCTION tempest.slabgorb.com, dpr=1.75): GPU process saturated ~100% (950-1050ms busy/sec) every gameplay second → 8-34fps (8-9fps with explosion bursts); text framing screens 60fps at 96-196ms/sec GPU; renderer main thread ~2% busy. GPU-raster-bound, not JS-bound.

**Hot Sites:**
- strokeGlyph per-sub-stroke blur (render.ts:114)
- warp starfield ~160 blurred arc-fills/frame (render.ts:203)
- glowTrace triple-stroke with two blurred passes (render.ts:667)
- drawTube spokes/rims, inline dots

**Fix Design:**
1. Dots → cached additive glowSprite pattern (render.ts:509-518, already proven for particles)
2. Strokes/text → wider low-alpha UNBLURRED additive passes under 'lighter'
3. Single named tunable scene-buffer dpr cap as weak-GPU hedge
4. Keep phosphor pipeline. Tempest-local — do not touch @arcade/shared/glow.

**Verification:**
- DevTools trace during heavy gameplay must show ~60fps with GPU busy <600ms/sec
- npm test -- citations must stay green (render.ts is cited; re-anchor with tools/audit/reanchor-citations.mjs --write)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T14:20:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T13:32:18Z | 2026-07-16T13:34:42Z | 2m 24s |
| red | 2026-07-16T13:34:42Z | 2026-07-16T13:48:28Z | 13m 46s |
| green | 2026-07-16T13:48:28Z | 2026-07-16T14:07:03Z | 18m 35s |
| review | 2026-07-16T14:07:03Z | 2026-07-16T14:20:42Z | 13m 39s |
| finish | 2026-07-16T14:20:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): main.ts already routes dpr through `resizeToDisplay` (@arcade/shared/view), which owns a `Math.min(2, devicePixelRatio||1)` cap — the new `cappedDpr` composes ON TOP of that for the scene/phosphor buffers, it does not replace it.
  Affects `tempest/src/main.ts` (Dev wires `cappedDpr` at the point dpr reaches the scene, keeping HUD/overlay crispness a separate decision).
  *Found by TEA during test design.*
- **Gap** (non-blocking): `phosphor.composite()` blits the accumulator at identity transform, assuming scene buffers match the main canvas resolution. If Dev caps the SCENE dpr below the main-canvas dpr, composite must scale the blit accordingly or the scene renders quarter-size.
  Affects `tempest/src/shell/phosphor.ts` (composite needs a scale-aware drawImage if scene dpr < canvas dpr).
  *Found by TEA during test design.*
- **Conflict** (non-blocking): tp1-15 and tp1-30 fidelity suites identify dots by the fillStyle recorded at `fill()`. A DOM-sprite dot path is invisible to them in the node env, so `blitGlowDot`'s node fallback MUST fill with the requested colour — pinned in `tp1-40.glow.test.ts` ("the node fallback carries the dot COLOUR through fillStyle"). Dev: do not blit dots via a path that bypasses this seam.
  Affects `tempest/src/shell/glow.ts` (fallback contract).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): ~11 dead `ctx.shadowBlur = 0` resets remain in render.ts — allowed by the source scan, now unreachable hygiene since nothing sets a non-zero value. Candidates for the verify-phase simplify pass.
  Affects `tempest/src/shell/render.ts` (delete the dead resets).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the upscaled phosphor blit (scene dpr < canvas dpr) uses default image smoothing — a soft, CRT-ish scale-up. If verify's eyeball pass wants a crisper scene at capped dpr, `imageSmoothingEnabled`/`imageSmoothingQuality` on the main ctx is the knob.
  Affects `tempest/src/shell/phosphor.ts` (composite smoothing policy).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): perf smoke evidence for AC-5's formal verify — dpr=2 CDP emulation, 240-frame rAF sample, same scenario as the Architect's pre-fix baseline: before 48.6 fps avg / p95 34.1ms / 45 drops >25ms; after 60.0 fps / p95 17.4ms / 0 drops. Visual smoke: gameplay screenshot confirms the neon look (tube glow, claw halo, rim sparks, particle puffs) survives.
  Affects `verify phase` (formal DevTools GPU-busy trace still required by AC-5).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): large-text glow (64px banners at blur 22-26) blooms bolder/chunkier than the Gaussian era — within AC-3 but worth a taste check in the user's playtest; the knob is glowStrokePasses' halo alpha/reach shaping in `glow.ts`.
  Affects `tempest/src/shell/glow.ts` (tuning constants only, if desired).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): V-003/DB-013 claim PROSE still cites pre-refactor line numbers (the gate-checked file/line/verbatim fields are correct and byte-verified) — harmless historical narrative, tidy on the next audit-touching story.
  Affects `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json`, `pair-4-aldisp-b-well-projection.json` (prose refs).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the tdd workflow has no verify phase, so wherever TEA/Dev notes above say "verify phase", read "this review + the user's playtest"; AC-5 was measured during review (Observation 10) and only the taste-level eyeball of attract/select/warp/entry modes remains for the playtest.
  Affects `sprint/epic-tp1.yaml` (no change needed — recorded so the finish audit reads cleanly).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Rewrote render.tube-glow.test.ts, superseding SH2-9's pinned blur mechanism**
  - Spec source: tempest/tests/shell/render.tube-glow.test.ts (SH2-9 suite header), epic-SH2 glow-extraction contract
  - Spec text: "tempest conforms to @arcade/shared/glow WITHOUT regressing tube depth … preserves the spoke blur/width (blur 8, width 2 …) … keeps the whole 6/8/18 blur ramp in play on the tube strokes"
  - Implementation: The rewritten suite carries SH2-9's depth-preservation guarantee forward (far→near gradients, dim far ring, bright near rim, halo layering, one-gradient-per-spoke) but REVERSES its wiring pins: render.ts must NOT import @arcade/shared/glow and must never set a non-zero shadowBlur; the 6/8/18 blur values survive only as inputs to glowStrokePasses' halo geometry.
  - Rationale: tp1-40's AC-1 ("zero live shadowBlur in the per-frame scene path") is logically incompatible with SH2-9's AC1 ("strokes via @arcade/shared/glow") — the shared envelope's contract IS live blur; both suites could never pass together, and story scope (session file) outranks the epic-SH2 contract per the spec-authority hierarchy.
  - Severity: major
  - Forward impact: minor — any future SH2 story assuming tempest consumes @arcade/shared/glow must know tempest now carries a local layered-stroke helper (src/shell/glow.ts); promotion back into the library is explicitly deferred until a second game needs it.
  - → ✓ ACCEPTED by Reviewer: the incompatibility is real (SH2-9's AC1 pins the exact mechanism tp1-40's AC-1 outlaws) and the depth-preservation intent demonstrably survives in the rewritten suite — spoke-gradient count, stops, core widths, and halo layering are all still pinned; story scope outranks the epic-SH2 contract per the spec-authority hierarchy.
- **Prescribed the src/shell/glow.ts seam (names and signatures) beyond the AC text**
  - Spec source: sprint/context/context-story-tp1-40.md, AC-2/AC-3/AC-4
  - Spec text: "a single named tunable (e.g. RENDER_DPR_CAP) … glowTrace's two blurred passes become wider, low-alpha, unblurred passes … render via the cached additive glowSprite pattern"
  - Implementation: Tests pin concrete exports — RENDER_DPR_CAP, cappedDpr(dpr), glowStrokePasses(blur, lineWidth) → [{width, alpha}…] (core last, halos wider+dimmer, reach scaling with blur), blitGlowDot(ctx, color, x, y, size) node-safe with a colour-carrying fill fallback. Exact halo widths/alphas are deliberately NOT pinned (Dev tunes by eye).
  - Rationale: TDD needs a callable contract; the ACs name the shape but not the seam. Structure is pinned, aesthetics are left free.
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: the prescribed seam is minimal (4 exports), matches the AC's own vocabulary, and deliberately leaves the tuning values unpinned — correct division between contract and aesthetics.

### Dev (implementation)

- **Pulsar lane-warning quad lost its dedicated halo**
  - Spec source: context-story-tp1-40.md, AC-3
  - Spec text: "strokeGlyph and drawTube's glow envelopes get the same treatment" (the quad is neither, but its blur-16 was part of the pulsing-lane look)
  - Implementation: The electrified-lane quad now fills translucent (alpha 0.12–0.28) with NO halo replacement — its old shadowBlur 16 was simply removed.
  - Rationale: A fill's Gaussian halo has no cheap layered-stroke analogue; the quad's edges sit on the lane's already-glowing spokes, so the marginal halo was judged invisible. Eyeball at verify; if the pulse warning reads flat, blit a soft edge or stroke the quad's outline through withGlow.
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: the quad is a 0.12–0.28-alpha translucent warning wash whose readable signal is the pulsing BAR (which kept its beat-driven glow, render.ts drawEnemy pulsar case) — the wash's own halo was sub-threshold; note the tdd workflow has NO verify phase, so if the user's playtest finds the warning flat, the fix is the one-liner Dev described.
- **glowTrace halo geometry reshaped (×1.5/×0.8 blurred radii → glowStrokePasses ×2/×0.75 widths)**
  - Spec source: context-story-tp1-40.md, AC-3
  - Spec text: "glowTrace's two blurred passes become wider, low-alpha, unblurred passes under 'lighter'"
  - Implementation: The two passes' reach now derives from glowStrokePasses (lineWidth + blur·2 at α .08, lineWidth + blur·0.75 at α .18) rather than the old per-call ×1.5/×0.8 blur multipliers — one shaping for every glow in the game instead of two conventions.
  - Rationale: A single tuning surface (glow.ts) beats scattered per-site multipliers in a story whose whole point is taming this mechanism; the AC prescribes structure, not radii.
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: single tuning surface is the right call; Reviewer's eyeball (gameplay + gameover screenshots) confirms the look survives, with one recorded observation — large text (64px at blur 22-26) blooms bolder/chunkier than the old Gaussian; the knob is glowStrokePasses' alpha/reach shaping and the observation is logged as a non-blocking finding.
- **Test-file and audit-JSON updates made during GREEN (testing-runner assisted)**
  - Spec source: .session/tp1-40-session.md, TEA Assessment ("Tests only" boundary) + tempest/CLAUDE.md citation rules
  - Spec text: "Touched a cited file? Run `node tools/audit/reanchor-citations.mjs --write` … A citation you did not fix, in a file you edited, is still TRUE — it just points at the wrong row now."
  - Implementation: (1) citations re-anchored; V-003 and DB-013 `ours` quotes were LOST by the refactor and re-quoted to the moved evidence (the white tip dot now at the blitGlowDot call, the green spike stroke now at its withGlow call) — both findings remain accurate records, nothing marked remediated; (2) tp1-31.framing.test.ts's starfield-anchoring regex updated from the arc() form to the sprite-blit form (the `not arc(cx +` guard kept); (3) an unused interface TEA left in tp1-40.glow.test.ts removed to satisfy tsc.
  - Rationale: All three are mechanical consequences of the mechanism swap the story mandates; the tp1-31 edit preserves the test's anchoring INTENT (verified by Dev). Flagged here so the Reviewer audits the test edits explicitly.
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: audited all three explicitly — (1) V-003/DB-013 are CONFIRMED-match findings whose evidence lines moved; re-quoting (not `remediated_by`) is exactly the citation-gate rule, and the citations suite byte-verifies the new quotes; (2) tp1-31's new regex `blitGlowDot.*\*\s*r` matches the single-line call at render.ts:260 and the `not arc(cx +` displacement guard is intact; (3) the removed interface was genuinely unused (tsc TS6196).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tempest/tests/shell/tp1-40.glow-tax-sources.test.ts` — source-rule guard (comment-stripped): every `.shadowBlur =` in src/shell + src/main.ts is a reset to 0; no `@arcade/shared/glow` import anywhere in src/shell; `cappedDpr()` wired outside its own module; render.ts routed through the local glow helper (`glowStrokePasses`/`blitGlowDot`).
- `tempest/tests/shell/tp1-40.glow.test.ts` — pure contracts for the new `src/shell/glow.ts`: RENDER_DPR_CAP ∈ [1,2]; cappedDpr (identity below cap, clamp above, `||1`-style guard on 0/NaN/negative, never exceeds cap); glowStrokePasses (blur 0 → single core; otherwise ≥2 halos + crisp core last, halos wider & alpha ≤ 0.6, widths descending, reach scales with blur, deterministic, finite); blitGlowDot (node-safe without `document`, draws via sprite blit OR unblurred fill, node fallback carries colour through fillStyle, zero shadowBlur ever, survives 160 dots/frame).
- `tempest/tests/shell/render.tube-glow.test.ts` — REWRITTEN (supersedes SH2-9's suite; deviation logged): drawTube through a recording ctx must stroke with zero blur while preserving tube depth — 4 far→near gradient spokes with the exact stops, ONE gradient per spoke reused across passes (no per-frame churn regression), crisp cores at widths 2/1.5/3.5, ≥6 wider low-alpha halo passes, near-rim bloom, and ≥5 blur-free dot draws (rim sparks + vanishing glow).

**Tests Written:** 34 tests (25 new + 9 rewritten) covering ACs 1–4; ACs 5–6 are phase-gated (below)
**Status:** RED (failing — ready for Dev). Run `tp1-40-tea-red`: 9 failures, all in the three suites above (tp1-40.glow.test.ts fails whole-file on module resolution — src/shell/glow.ts does not exist yet, the standard missing-module RED). 132 pre-existing test files green, citations green.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | no `as any`/`@ts-ignore` in new tests; recording ctxs typed via narrow interfaces + single documented `as unknown as CanvasRenderingContext2D` cast (house pattern from SH2-9/tp1-15) | self-checked |
| TS #2 readonly params | glowStrokePasses pinned to return data usable as `ReadonlyArray` (deep-equal determinism test) | failing (RED) |
| TS #4 null/undefined | cappedDpr guard test pins 0/NaN/negative → 1 (the `||` vs `??` falsy trap made explicit) | failing (RED) |
| House: source-scan strips comments | glow-tax-sources strips // and /* */ before matching (rom-clock-sources idiom; prose about the old blurred world survives) | in place |
| House: citations gate | no src edits in RED; citations suite verified green in run tp1-40-tea-red | passing |

**Rules checked:** 3 of 5 applicable TS lang-review rule families have direct test coverage; the rest are Dev-side implementation rules the Reviewer checks.
**Self-check:** 0 vacuous tests found — every `it` carries value-bearing assertions; the two wiring regexes assert against live source text, not fixtures.

**AC coverage map:** AC-1 → sources suite + tube-glow behavioral; AC-2 → blitGlowDot contracts + tube-glow dot check (mechanism: sprite cache; the DOM sprite path itself is eyeball/verify territory since node has no document); AC-3 → glowStrokePasses contracts + tube-glow layering/depth; AC-4 → RENDER_DPR_CAP/cappedDpr contracts + wiring scan. **AC-5 (DevTools trace: ~60fps, GPU <600ms/sec) and AC-6 (citations re-anchor after render.ts edits) are not unit-testable in RED — they gate the verify phase**; Dev must run the reanchor tool before committing (AC-6) and verify will demand the trace numbers in this session file (AC-5).

**Notes for Julia (Dev):**
- The node env is load-bearing: blitGlowDot must lazy-init any DOM sprite cache (mirror phosphor.ts) and fall back to a colour-carrying plain fill — tp1-15/tp1-30 observe dots via fillStyle at fill().
- If the scene dpr is capped below canvas dpr, phosphor.composite's identity-transform blit must become scale-aware (Delivery Finding).
- Comments in render.ts mentioning the old blur world are safe — the scans strip comments.

**Handoff:** To Dev for implementation

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/shell/glow.ts` (new) — the tempest-local glow kernel: `glowStrokePasses` (layered halo: lineWidth+blur·2 @ α.08, lineWidth+blur·0.75 @ α.18, crisp core last), `blitGlowDot` + cached additive dot sprite (moved from render.ts; lazy-DOM, node fallback fills in the dot's colour), `RENDER_DPR_CAP = 1.5` + `cappedDpr` (provisional default pending AC-5's verify trace)
- `tempest/src/shell/render.ts` — `@arcade/shared/glow` import replaced by a local layered `withGlow`/`glowPolyline` (same GlowStyle shape, same call sites; halo passes stroke in `style.color` preserving the old shadowColor semantics incl. the far-ring inherited level-colour halo); every dot now blits the sprite (rim sparks, spike tip + SPARK sparkle, starfield ~160/frame, muzzle, vanishing glow); strokeGlyph/glowTrace/spikes/bullets/bursts/warp-streaks/entry-underline all layered; pulsar quad fills without halo (deviation logged); scene renders at `cappedDpr(dpr)`
- `tempest/src/shell/phosphor.ts` — composite blits the accumulator to the FULL main canvas (scale-aware; identity when dprs match)
- `tempest/tests/shell/tp1-31.framing.test.ts` — anchoring guard updated to the sprite-blit form (deviation logged)
- `tempest/docs/audit/findings/*.json` — re-anchored; V-003/DB-013 re-quoted (still-true records, not remediations)

**Tests:** 1594/1594 passing (GREEN), 135 files, citations green, `tsc --noEmit` clean (run `tp1-40-dev-green`)
**Branch:** feat/tp1-40-glow-tax (pushed, 6691977)

**AC status:** AC-1/2/3/4 implemented and pinned green. AC-5: smoke evidence only (dpr=2 emulation: 48.6fps/45 drops → 60.0fps/0 drops; formal GPU-busy DevTools trace is verify's gate). AC-6: green and re-anchored.

**Handoff:** To next phase (verify)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1594/1594 tests, tsc clean, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly (see Observations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rule enumeration done by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings)
**Total findings:** 3 confirmed (all LOW, non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Lang-review checklist (`gates/lang-review/typescript.md`) applied to every changed `.ts` file:

| Rule family | Enumeration | Verdict |
|---|---|---|
| #1 type-safety escapes | Diff contains zero `as any`, `@ts-ignore`, `@ts-expect-error`, `as unknown as` in SOURCE; tests use the house-pattern single cast `as unknown as CanvasRenderingContext2D` (pre-existing convention in tp1-15/tp1-17/tube-glow). `getContext('2d')!` in glow.ts:110 mirrors phosphor.ts's existing pattern | compliant |
| #2 generics/interfaces | GlowPass has `readonly` fields (glow.ts:57-62); glowStrokePasses returns `readonly GlowPass[]`; glowPolyline takes `ReadonlyArray<readonly [number, number]>`; no `Record<string, any>`, no `object`, no bare `Function` in source | compliant |
| #3 enums | No enums introduced | N/A |
| #4 null/undefined | `style.color ?? (...)` in withGlow (render.ts) is the `??`-not-`||` case done right (an explicit empty-string color would be honoured, matching the shared module's documented semantics); cappedDpr guards 0/NaN/negative explicitly (glow.ts:52-55); glowSprite returns `HTMLCanvasElement \| null` and both callers null-check | compliant |
| #5 modules/declarations | All imports are value imports actually used at runtime; no ambient declarations; `import type` unchanged where pre-existing | compliant |
| Tempest CLAUDE.md: core purity | Zero changes under src/core/; all edits in src/shell/ + tests + docs/audit | compliant |
| Tempest CLAUDE.md: citation gate | Cited file (render.ts) edited → reanchor tool run, 2 LOST citations re-quoted (not remediated — both are CONFIRMED-match records whose evidence moved), citations suite green | compliant |
| Tempest CLAUDE.md: no push to main | Branch feat/tp1-40-glow-tax targets develop | compliant |

### Observations

1. `[VERIFIED]` strokeGlyph's glow-reach transform parity — canvas shadow blur was never scaled by the CTM, so the old `blur` was screen-space; the new `glowReach = blur / scale` (render.ts strokeGlyph) is stroked in glyph space and multiplied back by `ctx.scale(scale)`, landing at `blur·k` screen px — the comment's claim checks out against the spec and against the gameplay screenshot (claw/flipper halos at their old footprint). Complies with the AC-3 "same treatment" rule.
2. `[VERIFIED]` withGlow restores ambient state — `baseAlpha` captured before the pass loop and restored after (render.ts withGlow); composite mode restored per halo pass; drawWarp's per-streak `globalAlpha = 0.15 + t·0.6` therefore multiplies through correctly. Evidence: the pass loop multiplies `baseAlpha * pass.alpha` and the trailing `ctx.globalAlpha = baseAlpha`.
3. `[VERIFIED]` far-ring inherited halo survives — glowPolyline far-ring call passes `color` explicitly (render.ts drawTube), and withGlow's halo passes stroke in `style.color`, so the dim-blue ring still blooms in the LEVEL colour — the exact regression SH2-9's Delivery Finding warned about, now guarded behaviourally by the rewritten tube-glow suite.
4. `[VERIFIED]` phosphor scale-aware blit degenerates to identity — `drawImage(accum, sx, sy, mainCtx.canvas.width, mainCtx.canvas.height)` with equal dprs draws at accum's native size (phosphor.ts:composite); with capped scene dpr it upscales; shake stays in canvas-dpr units via the unchanged `shake * dpr` args.
5. `[EDGE]` confirmed non-issue: blitGlowDot inside strokeGlyph's scaled space blits `d = size·8` in glyph units where `size = 1.8/scale` — screen-constant 14.4px, matching the old screen-space dot+blur silhouette by construction.
6. `[SILENT]` confirmed acceptable: glowSprite returns null sans DOM and drawParticles skips the blit (`if (spr)`) — node-only path, browsers always have document; the dot path falls back to a visible fill, so nothing user-facing can silently vanish.
7. `[LOW] [DOC]` V-003/DB-013 claim PROSE still cites old line numbers (e.g. "render.ts 263-266") — the gate-checked `ours` file/line/verbatim fields are correct and byte-verified; the prose refs are historical narrative. Non-blocking.
8. `[LOW] [TEST]` tp1-31's replacement regex `blitGlowDot.*\*\s*r` is weaker than the old coordinate-pair form (any `* r` argument satisfies it) — acceptable because the displacement guard (`not arc(cx +`) is the load-bearing half, but noted for the next SHAPES story.
9. `[LOW]` aesthetic drift on large text: 64px banners (blur 22-26) bloom bolder/chunkier than the Gaussian era — visible on GAME OVER (Reviewer screenshot). Within AC-3's "neon look survives", tunable at glowStrokePasses' alpha/reach if the user's playtest objects.
10. `[VERIFIED]` AC-5 measured by Reviewer (no verify phase exists in this tdd workflow, so the review is where this lands): chromium trace, heavy gameplay (autofire + claw movement), 2560×1400 canvas = 3.58MP ≈ production's 3.36MP raster load — **CrGpuMain busy 41ms/sec** (166ms over a 4.1s trace; the busiest thread event is `ThreadControllerImpl::RunTask`), renderer main 20ms/sec, rAF locked 60.0fps / p95 17.4ms / 0 drops>25ms (480-frame concurrent sample). Pre-fix baselines for the same scenario: 950-1050ms/sec GPU (user production trace) and 48.6fps/45 drops (dpr=2 emulation). Margin vs the <600ms/sec AC ceiling: 14×.

### Devil's Advocate

Assume this is broken. Where would it bite? First: the layered halo is additive, so overlapping halos can clip to white where the Gaussian faded gracefully — a dense board (eight enemies + bullets in one lane) could bloom the lane into an unreadable white smear. Counter: the ambient scene was ALWAYS 'lighter'-composited, so overlap already saturated pre-fix, and halo alphas (.08/.18) are far below the old shadow's peak; the explosion-heavy screenshots show no clipping. Second: blitGlowDot honours the ambient composite mode — on a source-over surface a sprite's transparent corners could OVERWRITE glow beneath. Dots only draw in the scene (always 'lighter') and drawImage with transparency under source-over still alpha-blends, not overwrites; the HUD claw icons go through strokeGlyph whose dots... LIFE1 has no single-point strokes, so no HUD dots exist. Third: the dpr cap quietly softens Retina displays for EVERYONE to buy headroom only weak GPUs need — is 1.5 the right trade? The cap is one documented constant, the softness rides under phosphor's own blur, and the alternative (adaptive capping) is complexity this story doesn't need; if a user with a 120Hz ProMotion display complains about softness, raise the cap — it is labelled as the tuning point. Fourth: the node fill-fallback renders dots HALO-LESS, so tests eyeball a different picture than browsers — true, but tests assert counts/colours/blur-absence, never halo geometry, and the browser path is what both screenshots and the trace exercised. Fifth: `mainCtx.canvas` assumes composite's ctx belongs to a real canvas — a future test driving composite with a stub will crash; acceptable, phosphor is explicitly browser-only and untested by design. Nothing here rises above LOW.

**Verdict basis:** all six ACs verified — AC-1 (source scans + behavioural zero-blur, green), AC-2 (every enumerated dot through blitGlowDot, render.ts), AC-3 (layered passes everywhere + Reviewer eyeball of gameplay/gameover; attract/select/warp/entry share the same two primitives), AC-4 (RENDER_DPR_CAP documented + wired at render.ts beginScene), AC-5 (measured above, 14× margin), AC-6 (citations green, re-anchored).

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** fx.shake → phosphor.composite sx/sy in canvas-dpr units → whole-image shake (unchanged semantics); s.enemies → drawEnemy → strokeGlyph layered passes → phosphor scratch at capped dpr → scale-aware composite → main canvas (safe: every stage restores alpha/composite state it touches).
**Pattern observed:** the in-repo sprite-bake pattern (old render.ts:509) correctly generalized into glow.ts with the lazy-DOM discipline of phosphor.ts — reuse of a proven fix, not invention.
**Error handling:** cappedDpr guards 0/negative/NaN → 1 (glow.ts:52-55); glowSprite null-path degrades to colour-carrying fill (glow.ts / blitGlowDot); loop.ts's runGuarded still fences all draw exceptions.
**Performance evidence:** GPU busy 41ms/sec at production-equivalent raster load, 60.0fps/0 drops (details in Observation 10) — the story's reason to exist, confirmed.
**Findings:** 3 LOW, all non-blocking (stale claim prose, weaker tp1-31 regex, bold large-text bloom) — recorded above and as Delivery Findings.
**Handoff:** To SM for finish-story

## Sm Assessment

**Setup:** Complete. Story tp1-40 filed to epic-tp1 (commit 975447c, pushed to origin/main — the story ID is claimed against sibling checkouts). Session file, story context (`sprint/context/context-story-tp1-40.md`), epic context, and feature branch `feat/tp1-40-glow-tax` (tempest, gitflow, targets develop) all created and verified.

**Story shape:** 5-point p1 bug, workflow tdd, repos tempest. Six ACs in sprint/epic-tp1.yaml — the performance AC is trace-measured (GPU busy <600ms/sec at ~60fps during heavy gameplay), not eyeball-only.

**Evidence provenance:** Root cause and fix design come from the Architect's same-day investigation (memory: tempest-lag-is-live-shadowblur) — live shadowBlur A/B-confirmed as the GPU saturator; the user's production DevTools trace corroborates (8-34fps, GPU ~100% busy). All embedded above for TEA.

**Routing notes for O'Brien (TEA, red phase):**
- This is a SHELL story (render.ts) — the pure-core TDD surface is limited. Testable seams: the layered-stroke glow envelope (pass count/widths/alphas as pure data), the dpr-cap tunable, a source-scan test pinning "no live shadowBlur in the scene path" (mirror the existing source-rules pattern; NOTE the scanner reads comments too — do not name forbidden properties in comment prose).
- render.ts is cited by audit findings JSONs — any edit shifts pinned lines; re-anchor with `node tools/audit/reanchor-citations.mjs --write` before commit or the citations gate goes red.
- Eyeball + trace verification of the visual result belongs to verify phase, not red.

**Decision:** Proceed to red (TEA).