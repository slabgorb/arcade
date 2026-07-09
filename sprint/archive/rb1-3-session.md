---
story_id: rb1-3
jira_key: rb1-3
epic: rb1
workflow: tdd
---
# Story rb1-3: Flight-camera foundation — roll/pitch/yaw camera on shared math3d, tilting horizon, vector terrain/horizon render substrate, runnable empty cockpit

## Story Details
- **ID:** rb1-3
- **Jira Key:** rb1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** red-baron
- **Points:** 5
- **Type:** feature

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-09T10:33:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T09:41:23Z | 2026-07-09T09:42:56Z | 1m 33s |
| red | 2026-07-09T09:42:56Z | 2026-07-09T10:08:05Z | 25m 9s |
| green | 2026-07-09T10:08:05Z | 2026-07-09T10:21:39Z | 13m 34s |
| review | 2026-07-09T10:21:39Z | 2026-07-09T10:33:38Z | 11m 59s |
| finish | 2026-07-09T10:33:38Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The sprint YAML for rb1-3 carries NO acceptance criteria and NO technical approach (context-story-rb1-3.md is a stub — "TEA to define during the RED phase"). TEA authored the AC set from the story title + epic §2/§8 + the design brief. Affects `sprint/epic-rb1.yaml` (future foundation stories should carry at least a one-line AC set so the RED contract isn't derived solely from the title). *Found by TEA during test design.*
- **Improvement** (non-blocking): rb2 must own the authentic flight-model dynamics that DRIVE this camera's `Attitude`/`eye` — PLDELX turn-rate inertia + hysteresis, the 11-step POTDLY pitch table, PFROTN = PLDELX×8 bank coupling clamped ≤0x100, and the I4YPOS altitude clamp 8*4..180*4 (findings §2). rb1-3 deliberately builds the camera these feed but not the feed itself. Affects the future `red-baron/src/core` flight-model module (rb2). *Found by TEA during test design.*
- **Question** (non-blocking): red-baron's tsconfig uses `moduleResolution: "bundler"`, so relative source imports are correctly EXTENSIONLESS (Vite/Vitest resolve them). The TypeScript lang-review checklist item #5 ("`.js` extension missing in relative imports") is written for Node16 resolution and does NOT apply here — Reviewer should not flag extensionless `./core/*` imports as a violation. Affects `red-baron/tsconfig.json` (documents the intended import style). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the horizon's absolute BANK DIRECTION and the vertical HORIZN=$40 offset are unverified by unit tests (node env has no DOM) — they need a live visual check. Recommend `just serve` → `http://localhost:5277/red-baron/` to eyeball the demonstrator bank, and defer final calibration to the rb1 epic-closing live playtest. Affects `red-baron/src/core/horizon.ts` / `src/main.ts` (visual tuning only). *Found by Dev during implementation.*
- **Question** (non-blocking): the shared `@arcade/shared/loop` fixed-timestep accumulator (design brief reuse spine) is NOT yet wired — `main.ts` uses a raw `requestAnimationFrame` demonstrator. rb2 should drive the sim at `SIM_TIMESTEP_S` (src/core/timing.ts) via the shared loop when the real flight model lands. Affects the future rb2 loop wiring. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking for rb2, non-blocking for rb1-3): `projectSegment` only culls when BOTH endpoints are behind the eye (`ca.w <= 0 && cb.w <= 0`). A segment that STRADDLES the eye plane (one endpoint behind, one in front) is not clipped — the behind vertex perspective-mirrors to a plausible on-screen NDC coord (the very "ghost" the module header warns against), and a `w ≈ 0`/`w = 0` endpoint yields exploding/`NaN` coords. Unreached in rb1-3 (the horizon sits at distance 10000, roll-only → both endpoints always `w > 0`; Canvas silently no-ops non-finite coords), so it is latent, not active. Affects `red-baron/src/core/scene.ts:55-60` (add near-plane clipping — clip the straddling segment at the near plane, or cull if EITHER endpoint is behind — BEFORE rb2 renders terrain/enemy geometry that can cross the eye plane). Independently confirmed by Reviewer (empirical) and reviewer-test-analyzer. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the cockpit-boot wiring test `anyMatch(/core\/camera/)` (tests/cockpit-boot.test.ts:58) scans ALL of src/, and `horizon.ts` already imports `./camera`, so the assertion passes even if `main.ts` drops its own camera import — it verifies "camera imported somewhere in src" rather than "the runnable cockpit is wired to the camera." The actual wiring is correct (`main.ts:11`), so this is a test-strength gap, not a code defect. Affects `red-baron/tests/cockpit-boot.test.ts` (scope the regex to `src/main.ts` specifically). *Found by Reviewer during code review.*

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Deferred the authentic flight-model DYNAMICS to rb2; rb1-3 tests only the camera the dynamics drive**
  - Spec source: context-story-rb1-3.md (title); context-epic-rb1.md §2; design brief §4 (roadmap)
  - Spec text: story title "roll/pitch/yaw camera on shared math3d, tilting horizon, vector terrain/horizon render substrate, runnable empty cockpit"; epic §2 "PFMOTN pipeline (PLDELX→world pan, PFROTN=PLDELX×8→bank clamp ≤0x100, PLDELY 11-step→I4YPOS clamp 8*4..180*4) … seeds rb1-3"; roadmap files "flight model" under **rb2**.
  - Implementation: tests pin `flightView({roll,pitch,yaw}, eye)` + the tilting horizon + render substrate + cadence constants. The ROM dynamics that PRODUCE the attitude (PLDELX inertia/hysteresis, the POTDLY pitch table, the ×8 bank coupling + clamp, the I4YPOS altitude clamp, DISCHK feel) are NOT tested here.
  - Rationale: the epic roadmap explicitly assigns "flight model" to rb2; testing PLDELX/PLDELY now would gold-plate rb2 into rb1 (violates the epic "don't gold-plate" guardrail). Foundation = camera + horizon + render substrate + runnable cockpit.
  - Severity: minor
  - Forward impact: rb2 owns the authentic flight dynamics that feed `Attitude`/`eye`; recorded as a Delivery Finding to seed rb2.
- **Tilting-horizon tests pin tilt MAGNITUDE + sign anti-symmetry, not the absolute bank direction**
  - Spec source: context-epic-rb1.md §2; design brief §3
  - Spec text: "banking tilts the entire horizon/scene"; "the horizon tilt falls out of rotationZ in the view matrix".
  - Implementation: horizon.test asserts |tilt| ≈ |roll| and that +roll/−roll tilt oppositely; it does NOT assert whether banking right drops the right or the left side of the horizon.
  - Rationale: absolute direction depends on the Dev's horizon point ordering and is a visual/feel property; the rb1 epic closes on a live-playtest gate, which is the right place to calibrate bank direction. Pinning a hard sign now risks failing a geometrically-correct implementation.
  - Severity: minor
  - Forward impact: bank direction to be confirmed at the rb1 epic-closing live playtest.
- **Flight camera uses the shared Math Box's −Z-forward convention with NO source-space sign bridge**
  - Spec source: context-epic-rb1.md §8 (findings §8); design brief §3
  - Spec text: findings §8 "Z = +behind / −forward (nose at −Z)"; design brief "rotationZ(roll) ∘ rotationX(pitch) ∘ rotationY(yaw) → viewMatrix".
  - Implementation: `flightView` feeds attitude straight into `viewMatrix` (forward = −Z, right = +X, up = +Y). Unlike Battlezone's `tankView` (whose +Z-into-monitor ROM world needed a heading+π bridge), no bridge is applied.
  - Rationale: Red Baron's nose-at-−Z model space ALREADY matches the shared module's −Z-forward eye space, so a bridge would be gratuitous. Simpler and faithful to §8.
  - Severity: minor
  - Forward impact: none — rb2 terrain/enemy projection inherits the same convention.

### Dev (implementation)
- **Corrected the horizon test's tilt measurement to on-screen (aspect-corrected) space**
  - Spec source: tests/core/horizon.test.ts (TEA RED contract — the roll-tilt assertion)
  - Spec text: "rolling tilts the horizon by the bank angle (|tilt| ≈ |roll|)"
  - Implementation: KEPT the behavioral assertion (|tilt| ≈ |roll|) but fixed the test's `line()` helper to measure tilt in on-screen space — `atan2(dy, dx·aspect)` — instead of raw NDC. NDC is anisotropic (x∈[-1,1]→pixel WIDTH, y∈[-1,1]→HEIGHT): a camera rolled by θ tilts the horizon by exactly θ on the square-pixel screen but reads as `atan(aspect·tanθ)` in raw NDC. The horizon itself is perspective-projected through the shared camera + scene substrate and is geometrically correct.
  - Rationale: the perspective horizon renders the CORRECT on-screen tilt (θ). Contorting the code to satisfy the raw-NDC assertion would have UNDER-banked the horizon on screen (≈ atan(tanθ/aspect) ≈ 0.17 rad for a 0.30 rad bank). The test measured tilt in the wrong coordinate space; the fix preserves the intent while measuring the physically-meaningful angle. Verified: all four horizon behaviors (level/roll/pitch/yaw) pass with the geometrically-correct implementation.
  - Severity: minor
  - Forward impact: none — the shell's NDC→pixel map (main.ts `toPixel`) applies the same width/height scaling, so the rendered horizon matches the tested on-screen tilt.
- **Added a static demonstrator bank to the runnable cockpit (main.ts), not required by any test**
  - Spec source: design brief §4 (rb1 exit criterion)
  - Spec text: "a runnable banking cockpit flying over vector terrain"
  - Implementation: `main.ts` runs a `requestAnimationFrame` loop with a gentle sinusoidal roll (±0.35 rad) so the tilting horizon is visibly banking in the empty cockpit.
  - Rationale: serves the epic exit criterion ("banking cockpit") for the foundation. It is shell-only (not deterministic core), ~4 lines, and drives the already-tested horizon pipeline — not new logic. The authentic PLDELX/PLDELY flight model that will drive attitude for real is rb2.
  - Severity: minor
  - Forward impact: rb2 replaces the demonstrator roll with the authentic flight model wired to input.

### Reviewer (audit)
- **TEA — Deferred flight-model DYNAMICS to rb2** → ✓ ACCEPTED: matches the design-brief §4 roadmap (flight model = rb2) and the epic "don't gold-plate" guardrail. Correct scope boundary.
- **TEA — Tilt magnitude + anti-symmetry, not absolute bank direction** → ✓ ACCEPTED: absolute direction is a visual/feel property; the rb1 epic closes on a live-playtest gate. Recorded as needing a live visual check (see Reviewer Delivery Findings context).
- **TEA — Camera uses shared −Z-forward convention, no sign bridge** → ✓ ACCEPTED: verified — findings §8 nose-at-−Z matches the shared Math Box's −Z eye space; no bridge is warranted (unlike Battlezone's +Z world). Camera tests confirm the axis mapping behaviorally.
- **Dev — Corrected the horizon test's tilt measurement to on-screen (aspect-corrected) space** → ✓ ACCEPTED: independently verified by Reviewer (Δy_ndc/Δx_ndc = −aspect·tanθ exactly) AND by reviewer-test-analyzer (empirical: the corrected test still FAILS if the implementation ignores roll → falsifiable, not gamed; the correction matches how `main.ts` `toPixel` maps NDC→pixels). The change strengthens the suite. This is a legitimate geometric correction, not test-weakening.
- **Dev — Static demonstrator bank in main.ts** → ✓ ACCEPTED: serves the rb1 exit criterion ("banking cockpit"), shell-only, drives the already-tested horizon pipeline. NOTE: the demonstrator only sets `roll` — so the pitch/yaw horizon-render paths are exercised by tests but never at runtime in rb1-3 (acceptable for the foundation; rb2's flight model drives all three).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5-point foundation feature — the deterministic flight camera, tilting horizon, and render substrate are pure logic that must be pinned before implementation.

**Test Files:**
- `tests/core/camera.test.ts` — the roll/pitch/yaw flight camera (`Attitude`, `LEVEL`, `flightView(attitude, eye)`) built on `@arcade/shared/math3d`; behavioral (where world points land in eye space).
- `tests/core/timing.test.ts` — the calc-frame cadence constants (`src/core/timing.ts`) — the ÷N fidelity-trap guard (sim ~10.42 Hz vs display 62.5 Hz, ~6× trap).
- `tests/core/scene.test.ts` — the world→NDC render substrate (`SceneSegment`, `sceneProjection`, `projectSegment`) with the behind-eye cull.
- `tests/core/horizon.test.ts` — THE tilting horizon (`horizonSegments(attitude, aspect)`): level flat, roll tilts by bank angle, pitch shifts vertically, yaw-invariant.
- `tests/cockpit-boot.test.ts` — runnable-cockpit wiring (camera + horizon reach a 2D canvas stroke) + the picture-ROM scope fence (no biplane geometry).

**Tests Written:** 39 tests across 5 files, covering the foundation AC set derived from the story title + epic §1/§2/§8 + design brief §3/§4 (no ACs existed in the YAML — see Delivery Findings).
**Status:** RED — verified by `testing-runner` (RUN_ID rb1-3-tea-red): 36 new tests fail with clean contract errors (missing `src/core/*` exports / unwired `main.ts`), 3 cockpit-boot scope-fence guards pass. Existing rb1-1 `scaffold.test.ts` + rb1-2 `findings-doc.test.ts` still green — no regression, no collection crashes.

**AC set (TEA-authored, derived — cited):**
- **AC-1 Flight camera:** `flightView({roll,pitch,yaw}, eye)` builds a view on shared `math3d` where roll banks about the forward axis (tilting horizon), pitch about the right axis, yaw about the up axis, composed `rotationZ ∘ rotationX ∘ rotationY`; level at origin = IDENTITY. (design brief §3; findings §8)
- **AC-2 Tilting horizon:** the horizon is flat+centered when level, tilts by the bank angle under roll, slides vertically under pitch, and is invariant under a level turn. (findings §2; design brief §3)
- **AC-3 Render substrate:** a pure world→NDC projector emits `SceneSegment`s (ground below the horizon, sky above) and drops geometry behind the eye. (epic ruling "projection stays core"; findings §8)
- **AC-4 Frame cadence:** the sim ticks at the calc-frame rate (~96 ms / ~10.42 Hz), distinct from the 62.5 Hz display — the ÷N trap guarded. (findings §1)
- **AC-5 Runnable empty cockpit:** the flight camera + tilting horizon are wired to a 2D-canvas vector stroke; NO biplane geometry (blocked on the absent picture-ROM source, findings §9 gap #1). (design brief §4 exit criterion)

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #8 test-quality: meaningful assertions, no vacuous `let _=`/`assert(true)` | self-check pass — every test asserts a concrete value/relationship | pass |
| #1 type-safety: no `as any` in tests | typed module-interface casts only (`as CameraModule` etc.) | pass |
| #4 null/undefined: guard the null branch | `scene.test` "drops a segment behind the eye" pins `projectSegment → null` | failing (RED) |
| purity/determinism (SOUL-style, battlezone precedent) | `camera.test` + `horizon.test` determinism cases (identical input → bit-identical output) | failing (RED) |
| #2 generic/interface: `readonly` immutable data | `Attitude`/`SceneSegment` typed `readonly`; horizon returns `readonly SceneSegment[]` | failing (RED) |

**Rules checked:** the TS lang-review checklist is predominantly a Dev pre-handoff self-review (type escapes, module/build config, async) rather than TEA-testable behavior; the testable subset (test-quality, null-branch, purity, readonly immutability) is covered above. Reviewer note: extensionless `./core/*` imports are CORRECT under `moduleResolution: bundler` — do not flag check #5 (see Delivery Findings).
**Self-check:** 0 vacuous tests — every test asserts a concrete value or relationship; no `let _ =`, no `assert(true)`, no `is_none()`-on-always-none.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement `src/core/camera.ts`, `src/core/timing.ts`, `src/core/scene.ts`, `src/core/horizon.ts`, and rewire `src/main.ts` to render the tilting horizon on the canvas. Module contracts are in each test file's header block.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/camera.ts` (new) — `Attitude`, `LEVEL`, `flightView(attitude, eye)`: roll/pitch/yaw camera on shared `@arcade/shared/math3d`, composed `rotationZ ∘ rotationX ∘ rotationY → viewMatrix`.
- `red-baron/src/core/timing.ts` (new) — the three ROM clocks + derived rates (`SIM_HZ ≈ 10.42`, `DISPLAY_HZ 62.5`, `SIM_TIMESTEP_S 0.096`); the ÷N cadence-trap constants.
- `red-baron/src/core/scene.ts` (new) — the world→NDC render substrate: `SceneSegment`, `sceneProjection(aspect)`, `projectSegment(a,b,mvp)` with the behind-eye cull.
- `red-baron/src/core/horizon.ts` (new) — `horizonSegments(attitude, aspect)`: the tilting horizon, perspective-projected through camera + scene (level flat, roll tilts, pitch shifts, yaw pans).
- `red-baron/src/main.ts` (rewritten) — the runnable empty cockpit: strokes the tilting horizon as glowing vectors on a black canvas, with a gentle demonstrator bank. Replaces the rb1-1 placeholder.
- `red-baron/tests/core/horizon.test.ts` (test correction) — `line()` helper now measures tilt in on-screen (aspect-corrected) space; see Dev design deviation. Behavioral assertions unchanged.

**Tests:** 63/63 passing (GREEN) — verified by `testing-runner` (RUN_ID rb1-3-dev-green). `tsc --noEmit` clean; `vite build` succeeds (9 modules → 2.65 kB bundle, proving the `@arcade/shared` pipe bundles for production, not just vitest).

**Acceptance:** AC-1..5 (session TEA Assessment) all GREEN. Runnable cockpit builds and is wired camera → horizon → canvas stroke.

**Not verified by automated tests (node env, no DOM):** the live pixel render / absolute bank direction / HORIZN offset — recommend a quick `just serve` eyeball (see Delivery Findings) with final calibration at the rb1 epic-closing live playtest.

**Branch:** `feat/rb1-3-flight-camera-foundation` (red-baron is local-only per epic policy — committed, NOT pushed; no PR).

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (63/63 green, tsc clean, vite build ok, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 high-conf, 1 med, 2 low) + horizon-correction audit cleared | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rule categories, 47 instances, 0 violations) | N/A |

**All received:** Yes (4 enabled ran, 5 disabled pre-filled Skipped)
**Total findings:** 2 confirmed MEDIUM (non-blocking) + 2 confirmed LOW; 0 dismissed; 0 deferred. 0 Critical/High.

## Reviewer Assessment

**Verdict:** APPROVED

The flight-camera foundation is sound: pure/deterministic core on the shared Math Box, correct runnable wiring, and a geometrically-correct tilting horizon. Preflight, security, and the exhaustive rule-checker are all clean; the test-analyzer's central audit (was Dev's horizon-test change a dodge?) cleared it as a legitimate correction. The findings are two MEDIUM (both non-blocking, both scoped to rb2) and two LOW. No Critical/High → approved.

**Observations:**
- [VERIFIED] Runnable wiring connects: `main.ts` `getElementById('game')` matches `index.html:13` `<canvas id="game">`, and `main.ts:11-12` import `LEVEL`/`Attitude` + `horizonSegments` — camera and tilting horizon reach the canvas stroke. Evidence: index.html:13, main.ts:11-12,40-49.
- [VERIFIED] [RULE] Core/shell purity holds (reviewer-rule-checker: 14 categories, 47 instances, 0 violations). `camera/scene/horizon/timing` are pure (no DOM, no `Date.now`/`performance.now`, no `Math.random`); DOM + time confined to `main.ts` (shell). Determinism is test-pinned (camera + horizon purity blocks). Evidence: rule-checker rule #14.
- [MEDIUM] [TEST] `projectSegment` straddle gap (scene.ts:55-60): the cull fires only when BOTH endpoints are behind the eye, so a segment crossing the eye plane mirrors its behind vertex to a plausible on-screen coord (the "ghost" scene.ts:11-14 warns against); `w≈0` explodes, `w=0` → NaN. Independently confirmed by Reviewer (empirical: mixed segment `[10,0,-400]/[10,0,50]` → x2 flips sign) and reviewer-test-analyzer (high confidence). **Downgraded to MEDIUM with rationale:** UNREACHED in rb1-3 — the horizon sits at distance 10000, the demonstrator only rolls, so both endpoints are always `w > 0`; Canvas silently no-ops non-finite coords (no crash). Latent for rb2 terrain/enemies → recorded as a blocking-for-rb2 Delivery Finding.
- [MEDIUM] [TEST] Cockpit-boot camera-import check is implementation-coupled (cockpit-boot.test.ts:58): `anyMatch(/core\/camera/)` scans all of src/, and `horizon.ts` imports `./camera`, so the assertion can't fail even if `main.ts` drops its camera import. The actual wiring IS correct (main.ts:11), so this is a test-strength gap, not a code defect. Non-blocking; recorded as an Improvement Delivery Finding.
- [LOW] [TEST] Cockpit-boot text-scan can't confirm the strokes derive from `horizonSegments()`'s return (a decoy main.ts would pass) — an accepted limitation of the node-env (no DOM) text-scan house pattern, not a fresh defect.
- [LOW] [TEST] `camera.test.ts:187` filler assertion (`flightView(att,eye).length === 16`) added to silence lint duplicates the checks at :215/:221 — cosmetic.
- [VERIFIED] [SEC] Security surface is empty: browser-only offline vector math, no network/auth/input/tenant/persistence. The `as HTMLCanvasElement` at main.ts:14 is UNCHANGED pre-existing context (rb1-1), not introduced here, and not attacker-reachable (hardcoded literal id against the app's own markup).
- [VERIFIED] Error/null handling: `main.ts:28` ctx-null early return; `main.ts:33` `height === 0` div-by-zero guard; `main.ts:18-19` `clientWidth || innerWidth` correctly treats 0 (not-yet-laid-out) as absent (rule-checker confirmed `||` over `??` is right here); `scene.ts` both-behind cull. Evidence: main.ts:18-19,28,33; scene.ts:57.
- [VERIFIED] Dev's horizon-test correction is a legitimate geometric fix, NOT test-gaming: Reviewer derived `Δy_ndc/Δx_ndc = −aspect·tanθ` (so raw-NDC `atan2` measured the wrong quantity); reviewer-test-analyzer empirically confirmed the aspect-corrected test still FAILS when the implementation ignores roll (falsifiable) and matches `main.ts` `toPixel` NDC→pixel mapping. Deviation ACCEPTED.
- Disabled specialists — [EDGE] boundary conditions: covered by Reviewer's own straddle/eye-plane analysis above. [SILENT] swallowed errors: none — failures surface via the `need()` contract helpers and explicit guards, not silent fallbacks. [DOC] comments: accurate and citation-backed (rule-checker corroborated); scene.ts header precisely describes the both-behind cull. [TYPE] type design: `Attitude`/`SceneSegment` are `readonly`, signatures use shared `Mat4`/`Vec3`, no stringly-typed APIs (rule-checker #2 clean). [SIMPLE] complexity: minimal, mirrors battlezone's `camera/scene/horizon` structure — no over-engineering.

### Rule Compliance

Exhaustive TypeScript lang-review verification (reviewer-rule-checker, corroborated by Reviewer): 13 checklist categories + 1 CLAUDE.md core/shell purity rule, 47 concrete instances, **0 violations**. Specifically confirmed compliant: #1 type-safety (no `as any`/`@ts-ignore`/unguarded `!`; test module casts are typed descriptors), #2 generics (`readonly` on all interface fields + array/tuple params), #4 null (`||` correct for 0-means-unlaid-out; no unchecked `Map.get`/`?.`), #5 modules (inline `type` markers; extensionless imports correct under `moduleResolution: bundler`), #8 test quality (module-interface shapes match real signatures exactly; no `as any`; src-not-dist imports), #9 strict mode on + `tsc --noEmit` clean, #11 error handling (bare `catch {}` intentional in RED defensive-load), #14 purity (core pure, shell isolated). No `.claude/rules/*.md` or SOUL.md exist in this repo.

### Devil's Advocate

Argue this is broken. The most damning: `projectSegment` is a substrate whose stated job is to never stroke a behind-camera ghost, and it demonstrably does exactly that for any segment straddling the eye plane — mirroring a behind vertex to a believable on-screen position, or emitting NaN at `w=0`. rb2 will feed it mountains and enemy wireframes that routinely cross the eye plane as the player flies through them, and the first such frame will paint a phantom edge or a garbage spike. The only reason rb1-3 "passes" is that its sole consumer (the horizon) is pinned at distance 10000 and the demonstrator only rolls — a fragile accident of usage, not a guarantee of the substrate. Worse, the runtime NEVER exercises pitch or yaw: `main.ts` sets `roll` only, so the pitch-shift and yaw-pan render paths ship untested-in-the-real-app — a subtle attitude bug could hide there until rb2 wires real input and nobody would know from running rb1-3. A confused user resizing to a zero-height window relies on the `height === 0 → 1` guard; a headless/detached canvas where BOTH `clientWidth` and `innerWidth` are 0 would produce a 0×0 canvas and an invisible game (degrades silently, doesn't crash). And the cockpit-boot wiring test gives false confidence: because `horizon.ts` imports `./camera`, a future refactor that unwires `main.ts` from the camera entirely would still pass the "cockpit consumes the camera" assertion green. None of these sink the FOUNDATION — the horizon renders correctly, the math is pinned, nothing crashes — but every one is a real edge the suite doesn't guard, and the projectSegment gap MUST be closed before rb2 or the ghost the module promises to prevent will ship.

**Data flow traced:** `attitude` (roll from the `main.ts` demonstrator) → `horizonSegments(attitude, aspect)` → `flightView` (shared `viewMatrix`) → `mvp` → `projectSegment` → NDC `SceneSegment` → `toPixel` → `ctx.moveTo/lineTo/stroke`. Safe and finite for rb1-3 (the horizon never straddles the eye plane).
**Pattern observed:** Mirrors battlezone/src/core (`camera` pose→view, `scene` projector, `horizon` skyline); "projection stays core, shell strokes NDC" — at scene.ts / horizon.ts / main.ts.
**Error handling:** ctx-null guard (main.ts:28), div-by-zero guard (main.ts:33), both-behind cull (scene.ts:57); the straddle case is the one uncovered branch (MEDIUM, rb2).

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Sm Assessment

(To be completed by SM at workflow finish.)