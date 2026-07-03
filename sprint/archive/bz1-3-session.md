---
story_id: "bz1-3"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-3: 3D render foundation — camera/projection, horizon/mountains/volcano/moon, wireframe 21-obstacle field

## Story Details
- **ID:** bz1-3
- **Jira Key:** (not applicable — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T15:30:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T14:52:06+00:00 | 2026-07-03T14:53:52Z | 1m 46s |
| red | 2026-07-03T14:53:52Z | 2026-07-03T15:09:29Z | 15m 37s |
| green | 2026-07-03T15:09:29Z | 2026-07-03T15:21:06Z | 11m 37s |
| review | 2026-07-03T15:21:06Z | 2026-07-03T15:30:55Z | 9m 49s |
| finish | 2026-07-03T15:30:55Z | - | - |

## Sm Assessment

**Story selection:** User directly requested bz1-3 via `/pf-work bz1-3`. Story was in backlog, unblocked — bz1-1 (repo scaffold) and bz1-2 (disassembly quarry) are complete and merged, so the render-foundation work has its prerequisites in place.

**Setup verification:**
- Session file created with story fields, workflow tracking, and findings/deviations sections.
- Story context written to `sprint/context/context-story-bz1-3.md`.
- Feature branch `feat/bz1-3-3d-render-foundation` created in the `battlezone` subrepo off `develop` (from 94dcccc, the bz1-2 merge).
- Sprint YAML (`sprint/epic-bz1.yaml`) updated: bz1-3 → in_progress with branch reference.
- Jira: skipped — this project tracks issues locally in sprint YAML; there is no Jira instance.

**Routing decision:** Workflow is `tdd` (phased). Next phase is `red`, owned by TEA, who will author failing tests for the 3D render foundation: camera/projection math, horizon/mountains/volcano/moon skyline, and the wireframe 21-obstacle field. Handing off via the standard exit protocol.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings yet.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): the epic context's "background horizon spans 90° FOV" claim is quarry-unconfirmed (findings doc §10 lists it as neither confirmed nor denied), while the 45° unit-visibility cone IS confirmed (§7).
  Affects `battlezone/src/core/horizon.ts` (tests allow `BACKDROP_FOV` to be π/4 or π/2 — Dev picks one; bz1-12 must true it up against footage or newly quarried landscape data).
  *Found by TEA during test design.*
- **Question** (non-blocking): the ROM quote "Objects outside these distances are culled" does not pin inclusive/exclusive semantics at the exact 1023/31487 boundaries.
  Affects `battlezone/src/core/scene.ts` (tests deliberately probe 800/1100 and 31000/32000, never ±1 of the boundary — Dev may use ≥/≤ or >/< freely).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM bakes eye height into vertex data — every ground-sitting model's base plane is y = −640 (models.ts), so the camera eye sits at world y = 0 with NO eye-height translation. Pinned as `GROUND_Y = −640` in the camera contract.
  Affects `battlezone/src/core/state.ts` and future placement code (bz1-4 movement, bz1-7 enemies: entities place with model y-translation 0, not lifted to a ground plane).
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `projectModel` drops a whole object when any vertex reaches the eye plane; once bz1-4 lets the player drive right up to obstacles, close geometry will pop out instead of clipping.
  Affects `battlezone/src/core/scene.ts` (add per-edge near-plane clipping — port star-wars `shell/wireframe.ts`'s `clipToNear` pattern into the core projector).
  *Found by Dev during implementation.*
- **Question** (non-blocking): models were decoded with `xc = -rawX` (VisBattlezone convention) and the camera bridge flips X again for the ROM's +X-screen-left rule; net model chirality (e.g. which way tank barrels lean) is consistent but unverified against footage.
  Affects `battlezone/src/core/models.ts` / `battlezone/src/core/camera.ts` (verify handedness during bz1-12 playtest; asymmetric models like SLOW_TANK make it visible).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `OBSTACLE_MODEL` is typed as a plain `Record<ObstacleType, Model3D>` — mutable at the type level, unlike every sibling data table (OBSTACLES/MODELS/PANORAMA are readonly).
  Affects `battlezone/src/core/scene.ts` (line 48: change to `Readonly<Record<ObstacleType, Model3D>>` — one-line fix; fold into bz1-4, which touches scene.ts next).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): skyline segments are dropped whole when one endpoint leaves the view, so mountains pop in/out at the screen edges during a pan (~2π/48 ridge spacing ≈ 1/6 of the 45° view) — visible in the AC-8 screenshot as the ridge stopping short of the right edge.
  Affects `battlezone/src/core/horizon.ts` (`skylineSegments`: clip partially-visible segments at the view edge, or map with an overdraw margin; cosmetic — bz1-12 framing fidelity is the natural home).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): three medium-confidence test-coverage gaps from the test-analyzer — no full-pipeline ground-convergence assertion (AC 2 is only tested in eye space), no portrait/aspect < 1 case anywhere, no negative-heading case for the wheel/wrap math. Behavior was probe-verified correct; the gap is regression protection only.
  Affects `battlezone/tests/core/` (fold the three cases into bz1-4's red phase).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Skyline panorama is authored data with structural tests, not a ROM decode**
  - Spec source: context-epic-bz1.md, "Fidelity bar" (authority chain: reference/ quarry first)
  - Spec text: "each story ships ROM-accurate behavior for its slice"
  - Implementation: `PANORAMA` (mountains/volcano/moon) is authored against footage; the RED suite pins structure and behavior (features present, wrap at 2π, scroll direction/rate, no azimuth gap ≥ H_FOV, horizon line at y = 0) and never exact coordinates
  - Rationale: the quarry contains no horizon picture data (findings doc: zero hits for horizon/volcano/moon) — there is nothing to decode; structural tests let a future ROM-exact panorama pass unchanged
  - Severity: minor
  - Forward impact: bz1-12 (framing fidelity) may replace the authored panorama; no test churn expected
- **Volcano ships as a static silhouette — eruption animation deferred**
  - Spec source: context-epic-bz1.md, "Framing" ("horizon with mountains, erupting volcano, and crescent moon"); story title
  - Spec text: "erupting volcano"
  - Implementation: the RED contract requires a volcano polyline with a peak, but no eruption particles or animation
  - Rationale: eruption is animated state (needs dt/seeded-RNG plumbing through GameState — sim territory, not render foundation); bz1-12 is the framing-fidelity capstone
  - Severity: minor
  - Forward impact: bz1-12 adds eruption; if GameState lands earlier (bz1-4), Dev may pull it forward
- **Backdrop FOV left as a two-value choice (45° or 90°), not pinned**
  - Spec source: context-epic-bz1.md, "known ROM facts" ("the background horizon spans 90° FOV")
  - Spec text: "Objects render within a 45° visibility cone; the background horizon spans 90° FOV"
  - Implementation: tests assert `BACKDROP_FOV === H_FOV || BACKDROP_FOV === 2·H_FOV`; all scroll/edge expectations are computed from the exported constant
  - Rationale: the findings doc (§10) explicitly could not confirm the 90° claim from the quarry; hard-pinning an unconfirmed constant would fabricate fidelity the quarry doesn't support
  - Severity: minor
  - Forward impact: bz1-12 trues up the backdrop span; logged as a Question finding

### Dev (implementation)
- **BACKDROP_FOV pinned to 45° (H_FOV), not the epic's 90° claim**
  - Spec source: context-epic-bz1.md, "known ROM facts"; TEA contract (horizon.test.ts header) allowed either
  - Spec text: "the background horizon spans 90° FOV"
  - Implementation: `BACKDROP_FOV = H_FOV` (π/4) in `src/core/horizon.ts`
  - Rationale: 45° is the only quarry-CONFIRMED figure (findings §7); one shared FOV keeps the backdrop angularly consistent with the 3D scene instead of scrolling at half rate on an unconfirmed claim
  - Severity: minor
  - Forward impact: bz1-12 trues up against footage; flipping the constant is a one-line change and every test derives from the exported value
- **Whole-object drop at the eye plane instead of star-wars edge clipping**
  - Spec source: context-epic-bz1.md ("Where this document is silent, do what star-wars does"); star-wars `shell/wireframe.ts` clips edges to the near plane (`clipToNear`)
  - Spec text: epic silence defaults to the star-wars pattern
  - Implementation: `projectModel` culls the entire object when any vertex reaches eye-space z ≥ −1, rather than clipping individual edges
  - Rationale: the ROM culled whole objects "before vertex processing"; with the [1023, 31487] window and a static camera no tested pose can straddle the eye plane, and whole-object drop cannot emit mirrored-divide artifacts
  - Severity: minor
  - Forward impact: bz1-4 (driving up to obstacles) will want per-edge near clipping — logged as a Delivery Finding
- **Slow attract pan instead of a strictly fixed viewpoint (AC 8)**
  - Spec source: context-story-bz1-3.md, AC 8
  - Spec text: "shows the green wireframe obstacle field + skyline from a fixed viewpoint"
  - Implementation: `src/main.ts` holds the pose at the origin but pans heading at 0.08 rad/s (shell-side rAF time only — core stays pure)
  - Rationale: a static frame cannot eyeball-verify skyline scroll, wrap, or the full 21-obstacle ring; the pan is 3 lines of shell and previews the attract mode bz1-10 needs
  - Severity: minor
  - Forward impact: none — bz1-4 replaces the pan with real tread steering

### Reviewer (audit)
- **TEA: Skyline panorama is authored data with structural tests** → ✓ ACCEPTED by Reviewer: the quarry genuinely holds no horizon picture data (verified — findings doc has zero horizon/volcano/moon hits); structural tests are the correct future-proofing so a later ROM-exact panorama passes unchanged.
- **TEA: Volcano ships as a static silhouette — eruption deferred** → ✓ ACCEPTED by Reviewer: eruption is animated state needing dt/RNG plumbing that does not exist until bz1-4+; render-foundation scope is right, bz1-12 owns framing fidelity.
- **TEA: Backdrop FOV left as a two-value choice** → ✓ ACCEPTED by Reviewer: honest handling of a quarry-unconfirmed epic claim; deriving all test expectations from the exported constant makes the later truth-up churn-free.
- **Dev: BACKDROP_FOV pinned to 45° (H_FOV)** → ✓ ACCEPTED by Reviewer: the only quarry-confirmed figure; keeps backdrop and scene angularly consistent; one-line change if bz1-12 proves 90°.
- **Dev: Whole-object drop at the eye plane instead of star-wars edge clipping** → ✓ ACCEPTED by Reviewer: matches the ROM's own per-object cull-before-vertex-processing; no reachable pose in this story straddles the eye plane; per-edge clipping is already tracked as a delivery finding for bz1-4.
- **Dev: Slow attract pan instead of a strictly fixed viewpoint** → ✓ ACCEPTED by Reviewer: shell-side only (core purity untouched — verified by the purity suite), and it strictly increases what the AC-8 eyeball can verify; bz1-4 replaces it with real steering.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point feature story creating three new pure-core modules; the epic's standing determinism AC and ROM-fidelity bar both demand core coverage.

**Test Files:**
- `battlezone/tests/core/camera.test.ts` — 17 tests: ROM constants (NEAR_CULL 1023 / FAR_CULL 31487 / H_FOV π/4 / GROUND_Y −640), ROM angle conventions (heading 0 → +Z, CCW toward +X, +X screen-left), `tankView` world→eye bridge (translate/rotate/rigid/deterministic).
- `battlezone/tests/core/scene.test.ts` — 24 tests: exhaustive `OBSTACLE_MODEL` mapping to the ROM-decoded models, 45° horizontal FOV pinned aspect-invariantly, ROM camera-relative culling window (near/far/behind-camera guard), placement orientation, full 21-obstacle field composition + determinism + no table mutation.
- `battlezone/tests/core/horizon.test.ts` — 20 tests: PANORAMA structure (mountains/volcano/moon present, elevations ≥ 0, no azimuth gap ≥ H_FOV), BACKDROP_FOV two-value pin, `panoramaToNdc` mapper (centre/edges/monotonic/null-outside/wrap/elevation), assembled `skylineSegments` (non-empty at 16 headings, y ≥ 0, full-width horizon line at y = 0, 2π wrap, determinism).
- `battlezone/tests/core/render-foundation-purity.test.ts` — 12 tests: module existence, epic core-purity token scan (no DOM/time/randomness), no type-safety escapes, core-only imports.

**Tests Written:** 73 tests covering ACs 1–7 (AC 8, shell render, is eyeball-verified per repo convention — shell is never unit-tested in this repo family).
**Status:** RED (verified by testing-runner, run `bz1-3-tea-red`: 73/73 new tests fail with clean contract-style missing-export messages, no collection crashes; all 81 pre-existing tests still pass — zero regressions).

**Contract decisions (pinned in test headers for Dev):**
- New module set: `src/core/camera.ts`, `src/core/scene.ts`, `src/core/horizon.ts` — projection stays pure core (epic ruling); shell only strokes `SceneSegment`s.
- ROM conventions bridged, not overridden: world heading 0 faces +Z with +X screen-left (mathbox.html), mapped onto the ported Math Box's −Z eye convention behaviorally — Dev picks the matrix composition.
- Eye at world y = 0, `GROUND_Y = −640`: the ROM pre-offsets vertex data (all bases at −640), so no eye-height translation exists anywhere.
- Culling is per-object and camera-relative ([1023, 31487]); boundary semantics deliberately untested (quarry quote doesn't pin them).
- Skyline is authored data under structural tests; `BACKDROP_FOV` constrained to {π/4, π/2} pending bz1-12 truth-up.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | purity suite: "contains no type-safety escapes" (×3 modules) | failing (RED) |
| TS #2 readonly contracts | contract types declared readonly throughout; enforced by `tsc --noEmit` in `npm run build` (compile-time — not runtime-testable) | n/a (build gate) |
| TS #3 exhaustiveness | scene: "maps every declared ObstacleType (runtime exhaustiveness)" | failing (RED) |
| TS #4 null/undefined | horizon: `panoramaToNdc` null contract ("returns null well outside…", null-guarded assertions) | failing (RED) |
| TS #8 test quality | self-check pass done: 3 vacuous empty-vs-empty holes found and sealed (guards added); no `as any` in assertions — module loads use declared-shape casts per bz1-2 house pattern | done |
| TS #10 input validation | n/a — pure math/data modules, no user/API boundary in this story | n/a |
| Epic: core purity | purity suite: banned-token scan (Math.random, Date.now, performance.now, rAF, document., window., localStorage) + core-only imports (×3 modules) | failing (RED) |
| Epic: determinism AC | camera/scene/horizon each carry an explicit identical-input ⇒ identical-output test | failing (RED) |

**Rules checked:** 6 of 8 applicable rule families have runtime test coverage; 2 are compile-time/n-a, documented above.
**Self-check:** 3 vacuous-assertion risks found and fixed before commit (empty-array guards in horizon wrap/below-horizon tests and scene composition test).

**Commit:** `2f1735c` on `feat/bz1-3-3d-render-foundation` — "test: add failing tests for bz1-3 render foundation (camera/scene/horizon + purity)".
**ACs:** authored into `sprint/context/context-story-bz1-3.md` (was empty — story YAML carried none); technical approach section updated with the pinned contract.

**Handoff:** To The Word Burgers (Dev) for GREEN — implement the three modules to the contracts above, then rewire `src/main.ts`/shell to stroke the obstacle field + skyline from a fixed viewpoint (AC 8, eyeball-verified on :5276).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/camera.ts` — NEW: TankPose, ROM constants (GROUND_Y −640, NEAR_CULL 1023, FAR_CULL 31487, H_FOV π/4), `forwardFromHeading`, `tankView` (the ROM-convention → Math Box bridge: yaw `heading + π` puts world +Z ahead and world +X screen-left).
- `battlezone/src/core/scene.ts` — NEW: `SceneSegment`/`Placement`, exhaustive `OBSTACLE_MODEL`, `sceneProjection` (45° horizontal FOV at any aspect), `visibleObstacles` (ROM camera-relative distance cull), `projectModel` (MVP through the ported Math Box + eye-plane guard), `obstacleSegments` (the 21-obstacle field).
- `battlezone/src/core/horizon.ts` — NEW: authored `PANORAMA` (48-point mountain ridge ringing the full circle, cratered volcano at azimuth ~0.82, crescent moon at ~5.5), `BACKDROP_FOV = H_FOV`, `panoramaToNdc` on an integer angle wheel (2^20 steps — makes heading vs heading+2π bit-identical, satisfying the exact-equality wrap/determinism ACs; the ROM itself ran a 256-step wheel), `skylineSegments` (full-width horizon line at NDC y = 0 + in-view panorama edges).
- `battlezone/src/shell/render.ts` — NEW: NDC→pixel mapping and glowing-green stroke of core-projected segments (`GLOW_GREEN #33ff66`); no game math.
- `battlezone/src/main.ts` — rewired from the bz1-1 black-canvas stub: fixed-timestep-free bootstrap that clears black and strokes skyline + obstacle field each frame from an origin pose with a slow attract pan (deviation logged).

**Tests:** 154/154 passing (GREEN — verified by testing-runner run `bz1-3-dev-green`: all 73 bz1-3 tests green, all 81 pre-existing tests green, zero regressions). `npm run build` (tsc --noEmit + vite build) passes clean.
**Branch:** `feat/bz1-3-3d-render-foundation` (pushed to origin; commits `2f1735c` tests, `f25157f` implementation).

**AC 8 eyeball evidence:** dev server on :5276 (already live from this checkout's standing serve — vite picked the new code up) screenshotted via Playwright → `bz1-3-render-foundation.png` at the orchestrator root (bz1-1 screenshot precedent): full-width horizon line, mountain ridge, wide pyramid with apex correctly poking above the horizon (taller than eye height), short box seated on the ground plane — glowing green vectors on black.

**Handoff:** To Imperator Furiosa (TEA) for the verify phase (simplify + quality-pass), then Immortan Joe for review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 154/154, tsc+vite clean, tree clean, expected commits only, zero smells |
| 2 | reviewer-edge-hunter | No | skipped | N/A | Disabled via settings (workflow.reviewer_subagents.edge_hunter=false); domain covered by my own hard-questions pass below |
| 3 | reviewer-silent-failure-hunter | No | skipped | N/A | Disabled via settings; domain self-assessed — the only silent-return paths are the documented cull contracts (projectModel → [], panoramaToNdc → null), both null/empty-checked by their callers |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 3 (medium coverage gaps → delivery finding), deferred 2 (low: composition self-check + smoke test — documented test-design choices, not worth churn) |
| 5 | reviewer-comment-analyzer | Yes/No: No | skipped | N/A | Disabled via settings; comments self-assessed — headers cite ROM sources accurately (spot-checked against findings doc §4/§7/§10) |
| 6 | reviewer-type-design | No | skipped | N/A | Disabled via settings; domain partially covered by rule-checker families #1/#2/#16 |
| 7 | reviewer-security | Yes | clean | none (1 informational) | informational getContext!/devicePixelRatio note dismissed: unchanged pre-bz1-3 context lines (confirmed in diff hunks), house pattern from bz1-1, no attacker path in an offline canvas app |
| 8 | reviewer-simplifier | No | skipped | N/A | Disabled via settings; self-assessed — per-call rebuild of view/projection matrices (21×/frame) noted as trivially cheap; no dead code found |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (OBSTACLE_MODEL readonly, high confidence — rule-matching, not dismissible; severity LOW with rationale below) |

**All received:** Yes (4 enabled returned; 5 disabled via settings, pre-filled as skipped)
**Total findings:** 5 confirmed, 1 dismissed (with rationale), 2 deferred

### Rule Compliance

Rule-checker verdict across 17 rule families / 71 instances (typescript.md #1–#13 + epic purity, planar-sim, readonly convention, .js-extension convention): **1 violation, 70 compliant.** Key enumerations, independently spot-verified:

- **#1 type-safety escapes:** all five source files clean; the three test-module casts (`as CameraModule` etc.) are declared-shape casts per the bz1-2 house pattern, not `any`. Compliant.
- **#3 enums:** none — closed string-literal unions used instead (`ObstacleType`, `PanoramaPolyline.name`). Compliant by design.
- **#5 modules:** all 12 relative imports use inline `type` modifiers correctly; extensionless imports match the sibling bundler convention (verified against models.ts:74 and tsconfig `moduleResolution: "bundler"`). Compliant.
- **#8 test quality:** declared test-module shapes match real export signatures exactly (verified all three); no dist/ imports; no `as any`. Compliant.
- **Epic core purity (non-negotiable):** camera/scene/horizon import only sibling core modules; zero DOM/time/randomness tokens — triple-checked (rule-checker grep, security grep, and the diff's own purity suite). Compliant.
- **Planar-sim ruling:** `TankPose`/`Placement` carry no y; y appears only in render math and the angular backdrop. Compliant.
- **Readonly table convention:** TankPose/SceneSegment/Placement/PanoramaPolyline fields all readonly; PANORAMA readonly — but **`OBSTACLE_MODEL` (scene.ts:48) is a mutable `Record`**. VIOLATION → confirmed [RULE], severity LOW: type-level only, no runtime code path mutates it, and the mapping's identity is pinned by scene.test.ts — but any importer could reassign an entry without a type error. Fix is one line (`Readonly<Record<...>>`); logged as a delivery finding for bz1-4, which touches scene.ts next.

### Devil's Advocate

Argue it's broken: the deepest structural risk is that RED, GREEN, and this review ran in one session — the tests and the implementation share one mind, so a shared misconception would sail through both. The most dangerous candidate is chirality: the camera bridge flips X (heading + π) on top of model data that was itself decoded with `xc = -rawX`. If both flips encode the same mistake, every test still passes — because all four obstacle shapes are left-right symmetric, the screenshot cannot falsify it either. A mirrored world would only become visible when the asymmetric SLOW_TANK renders in bz1-7. This is real, and it is exactly why Dev's chirality Question finding must survive to the bz1-12 playtest; the ROM-quoted convention text (+X left, CCW toward +X) is the only independent anchor, and I verified the code against that text line by line (camera.ts:60-62, forwardFromHeading sin/cos signs). Second: the angle-wheel quantization means the skyline and the 3D obstacles use different angular arithmetic — they could theoretically disagree by half a wheel step (3e-6 rad, sub-pixel at any real resolution; imperceptible, but a purist would call the backdrop 6e-6-rad-snapped). Third: skylineSegments drops any segment with one endpoint out of view — mountains pop in and out at the screen edges during the pan, plainly visible in the AC-8 screenshot as the ridge stopping short of the right edge. Cosmetic, but it IS a rendering artifact shipping today — confirmed as a delivery finding, not waved off. Fourth: a degenerate canvas (height 0 in a hidden tab) yields aspect Infinity/NaN and NaN segments; canvas ignores NaN strokes silently, so the failure mode is a blank frame, recoverable on resize — shell-side, no crash, acceptable. The devil found one new finding (edge pop-in) and hardened two existing ones; he did not find a blocking defect.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** rAF timestamp (shell, main.ts:31) → heading number → pure core: tankView (camera.ts:62, viewMatrix of ROM-bridged yaw) → projectModel MVP (scene.ts:96-118: ROM distance cull [1023,31487] at :94, eye-plane guard at :103, perspective divide via math3d.transform) → NDC SceneSegments → drawSegments (render.ts:21-38, NDC→px only) → canvas. No user input exists in this story; every core input is numeric and every core function is referentially transparent (safe because: purity suite + zero-state modules + determinism tests).

**Pattern observed:** the core/shell boundary held exactly (epic non-negotiable) — projection math lives entirely in core (scene.ts), the shell strokes blind (render.ts:8 imports only the segment TYPE). House test patterns followed faithfully: defensive module loading (camera.test.ts:59), reference-independence, structural-not-quarry assertions.

**Error handling:** cull contracts are explicit empty/null returns, and both are checked — projectModel → `[]` consumed by flatMap (scene.ts:117); panoramaToNdc → `null` guarded at horizon.ts:137 (`a !== null && b !== null`). The only unchecked assertions in the diff's blast radius (`getContext('2d')!`, `as HTMLCanvasElement`) are unchanged pre-bz1-3 lines (verified: context lines in the hunk, not additions).

**Observations (tagged):**
- [RULE] CONFIRMED (LOW): OBSTACLE_MODEL mutable Record at scene.ts:48 — rule-matching, non-dismissible; one-line fix routed to bz1-4 via delivery finding.
- [TEST] CONFIRMED (MEDIUM, non-blocking): 3 coverage gaps (full-pipeline ground convergence, portrait aspect, negative heading) — behavior probe-verified correct; routed to bz1-4 red phase.
- [TEST] DEFERRED (LOW): composition self-check + Mat4 smoke test — documented design choices.
- [SEC] VERIFIED clean: no injection surface, no impurity, no unbounded growth — evidence: security grep set + purity suite both empty; per-frame allocations bounded by the fixed 21-obstacle/70-point tables (scene.ts:70-75, horizon.ts:132-144). Complies with core-purity rule.
- [EDGE] (specialist disabled — self-assessed): boundary semantics at exactly 1023/31487 deliberately unpinned (quarry quote is silent — documented in tests); degenerate-aspect NaN is shell-side, recoverable, no crash path.
- [SILENT] (specialist disabled — self-assessed): no swallowed errors — the two silent-return paths ARE the documented contracts, both caller-checked (see Error handling).
- [DOC] (specialist disabled — self-assessed): headers cite the findings doc accurately — spot-checked §4 (verbatim mathbox.html quotes), §7 (45° cone), §10 (90° unconfirmed).
- [TYPE] (specialist disabled — partially covered by rule-checker #1/#2/#16): interfaces all-readonly except the one confirmed [RULE] finding.
- [SIMPLE] (specialist disabled — self-assessed): view/projection matrices rebuilt per projectModel call (21×/frame ≈ trivial); acceptable at this scale, natural cache point when bz1-4 adds per-frame state.
- [VERIFIED] ROM constants exact — camera.ts:37-46: NEAR_CULL 1023 = $03ff, FAR_CULL 31487 = $7aff, both matching findings §4 verbatim quotes; H_FOV π/4 matching §7. Complies with the fidelity-bar authority chain.
- [VERIFIED] 21-obstacle field wiring — scene.ts:116-120 composes visibleObstacles × OBSTACLE_MODEL × projectModel over the byte-decoded OBSTACLES table; mapping identity pinned by scene.test.ts (toBe reference equality, all four types).
- [VERIFIED] AC-8 end-to-end — screenshot bz1-3-render-foundation.png: horizon line full-width, ridge, wide pyramid apex correctly above eye level, short box grounded; served from this checkout's live :5276.

**Deviation audit:** all 6 entries (3 TEA, 3 Dev) stamped ✓ ACCEPTED under `### Reviewer (audit)` — none flagged, no undocumented deviations found (I checked the diff against story/epic context for silent divergence; the only unlogged behavior choices are the two Improvement findings above, which are gaps, not spec deviations).

**Handoff:** To The Organic Mechanic (SM) for finish-story — PR creation and merge are SM's (do not merge here).