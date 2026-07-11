---
story_id: "sw3-10"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-10: Death Star renders inside-out / anomalous — fix the buildDeathStar wireframe (models.ts) winding/geometry so the hull reads as a solid sphere, not turned-through

## Story Details
- **ID:** sw3-10
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Stack Parent:** none

## Story Context

### Problem
The Death Star wireframe in star-wars renders inside-out or anomalously. The mesh geometry/winding in `buildDeathStar` (star-wars/src/shell/models.ts) causes the hull to read as a turned-through sphere rather than a solid convex hull.

### Technical Approach
1. **Inspect current buildDeathStar model** — examine vertex layout and face winding in star-wars/src/shell/models.ts
2. **Diagnose winding issue** — determine if normals are inverted, or if the mesh uses backface culling that hides the visible hull
3. **Fix geometry/winding** — correct the face winding order and/or normal direction so the hull reads as a convex, solid sphere (exterior faces visible, interior faces culled)
4. **Test render fidelity** — visually confirm the Death Star hull appears solid and matches the 1983 ROM cabinet appearance

### Acceptance Criteria
- Death Star hull renders as a solid, convex sphere (not inside-out, not turned-through)
- The wireframe or solid hull is recognizable as the iconic Death Star geometry
- Rendering matches the 1983 cabinet when viewed from all angles (rotation, approach/recession)
- Core simulation (src/core) and shell rendering (src/shell) maintain existing separation; no sim-side changes

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T18:47:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T18:17:51Z | 2026-07-11T18:19:31Z | 1m 40s |
| red | 2026-07-11T18:19:31Z | 2026-07-11T18:39:05Z | 19m 34s |
| green | 2026-07-11T18:39:05Z | 2026-07-11T18:43:14Z | 4m 9s |
| review | 2026-07-11T18:43:14Z | 2026-07-11T18:47:59Z | 4m 45s |
| finish | 2026-07-11T18:47:59Z | - | - |

## SM Assessment

**Setup complete — routing to TEA (O'Brien) for RED phase.**

- **Scope is clear and self-contained.** Single-file geometry/winding bug in `buildDeathStar` (star-wars, `models.ts`). No sim-side changes expected; this is a shell/render mesh-data fix. Fits the tdd phased workflow (SM → TEA → Dev → Reviewer → SM).
- **Testability flag for TEA:** this is a *visual* fidelity bug ("reads as inside-out / turned-through"). The RED phase needs a **deterministic, data-level invariant** to assert against — not a pixel diff. Candidate invariants: every face's winding is consistent, face normals point outward (away from the hull centroid), and vertices lie on/near the sphere surface. Pick the invariant that actually distinguishes the current broken mesh from a correct convex hull so the RED test fails for the right reason before the fix and passes after.
- **ROM quarry:** epic sw3 is a ROM-fidelity pass. If an authentic Death Star vector shape exists in the star-wars `reference/` disassembly (WSVROM / Object_3D_Data), TEA/Dev should cross-check the geometry against it rather than hand-tuning. (Prior sw3 stories mined the ROM for exact vertex data.)
- No blocking dependencies; sw3-2/3/4/9/11 are already done. Merge gate passed (NEW_WORK_STATE).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — behavioural geometry bug with a testable invariant.

**Root cause (verified by headless repro, not theory):** The Death Star body is a
topologically clean UV wireframe sphere (11-7 already pins that). The renderer is a
**cull-free wireframe** — `drawWireframe` strokes every edge, no back-face cull, no
hidden-line removal — so despite the SM/title framing, there is **no winding or
normal to invert**. The sole defect is that the **superlaser dish is seated on the
`+X` axis**. The space phase draws the body with IDENTITY orientation at
`pos [0,0,z<0]` and `cameraView`→IDENTITY (eye at origin looking −Z), so the
object-space **`+Z` hemisphere is the near face the player sees**. On `+X` the dish
is seen edge-on and renders as a crossed, bowtie-shaped spike jutting off the
sphere's side — the "inside-out / anomalous" artifact. I confirmed this by driving
the real `render()` for a space frame in a headless browser and by an A/B render
(dish on +X = spike; dish reseated to +Z = a clean concave superlaser on the
visible face).

**Fix for Dev (Julia):** pure geometry in `buildDeathStar` (src/core/models.ts) —
seat the superlaser dish (rim + recessed focus + stitch) on the **camera-facing
`+Z` hemisphere** instead of `+X` (e.g. rim/focus centred on `+Z`; keep it concave,
inside R, and stitched to the shell). No shell/render change; the placement already
uses IDENTITY orient. A `+Z` reseat preserves every 11-7 invariant (connected,
origin-centred, on-shell bulk, ≥1 principal-plane symmetry, deterministic).

**Test Files:**
- `tests/core/death-star-dish-orientation.test.ts` — the sw3-10 dish-orientation contract.

**Tests Written:** 5 (2 bug + 3 guards). RED verified: 2 fail on the shipped `+X`
seat (`axis[2]=0`, `axis[0]=1`); the 3 guards pass; the 11-7 body suite (14 tests)
stays green. Whole star-wars suite: 2 failed / 717 passed, no compile errors.
**Status:** RED — ready for Dev.

### Rule Coverage
| Rule (lang-review typescript.md) | Test(s) / handling | Status |
|---|---|---|
| #4 null/undefined (`??` not `||` on possibly-0; guard `Map.get`/null) | `dishAxis` returns `null` + `if (!axis) return`; no `||` on numerics; `medianRadius` needs no `\|\| 1` (median of ≥1 verts) | pass |
| #8 test quality (no `as any`, no vacuous asserts, mock types) | every test asserts a concrete geometry value; no `as any`; no `let _ =` / `assert(true)` | pass |
| core purity (CLAUDE.md — no DOM/time/random) | `is deterministic — reseated builder yields identical geometry twice` | failing→guard (green now, guards the fix) |
| #1 type-safety escapes / #3 enums / #6 React / #7,#11 async·error / #10 input-validation | N/A — pure numeric geometry builder + vitest, no such surface | n/a |

**Rules checked:** 2 applicable lang-review rules (#4, #8) enforced in the test code
+ core-purity; the rest are N/A to a pure geometry change.
**Self-check:** 0 vacuous tests (every assertion pins a real value; the two bug
tests are complementary, not duplicates).

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/models.ts` — `buildDeathStar`: reseat the superlaser dish (8-point rim + recessed focus) from the `+X` axis onto the camera-facing `+Z` axis, plus the builder doc comment. Pure geometry, +13 / −8 lines.

**Approach:** exactly the minimal reseat TEA specified — swap the dish axis from x to z (rim `[rd·cosψ, rd·sinψ, zRim]`, focus `[0, 0, R·0.6]`). The rim loop, focus spokes, and nearest-shell-vertex stitch are unchanged, so the dish stays concave, on-shell at the rim, recessed at the focus, and part of the one connected wireframe. No shell/render change — the space placement already draws the body with IDENTITY orient, so `+Z` object space is the near face the player sees.

**Tests:** 719/719 passing (GREEN). New sw3-10 suite 5/5; the 11-7 death-star-body suite 18/18 (no regression). `npm run build` (`tsc --noEmit && vite build`) passes — no type errors.
**Branch:** `feat/sw3-10-deathstar-winding` (pushed, tracking origin).

**Handoff:** To Reviewer (The Thought Police) for review.

## Delivery Findings

No upstream findings.

### TEA (test design)
- No upstream findings. The defect is a self-contained geometry/orientation error fully covered by the dish-reseat contract; no gaps, conflicts, or questions for downstream. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings. The fix was the exact one-axis reseat TEA scoped; nothing surfaced that downstream needs to act on. *Found by Dev during implementation.*

### Reviewer (code review)
- No upstream findings during code review. The change is a self-contained, minimal geometry reseat; nothing for downstream stories. (One LOW non-blocking test-precision note is recorded in the Reviewer Assessment, not a delivery finding.) *Found by Reviewer during code review.*

## Design Deviations

No deviations.

### TEA (test design)
- **Story shipped with no acceptance criteria; TEA authored them from the title + a visual reproduction**
  - Spec source: context-story-sw3-10.md, "Acceptance Criteria"
  - Spec text: "No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase."
  - Implementation: ACs pinned to one geometry invariant — the recessed superlaser dish must face the camera-facing `+Z` hemisphere (and stay concave, contained, stitched) — scoping the fix to `buildDeathStar` geometry, NOT a render-layer hidden-line/depth-cue change.
  - Rationale: the renderer is a cull-free wireframe (no winding/culling exists to "fix"); a headless repro of the real space frame shows the only defect is the dish seated edge-on on `+X`, and the story explicitly scopes the fix to "buildDeathStar (models.ts) winding/geometry."
  - Severity: minor
  - Forward impact: none — a `+Z` reseat preserves the 11-7 sphere invariants; Dev changes core geometry only.

### Dev (implementation)
- No deviations from spec.

### Reviewer (audit)
- **TEA — "Story shipped with no ACs; TEA authored them from title + visual repro"** → ✓ ACCEPTED by Reviewer: the derived ACs (dish faces the camera-facing +Z hemisphere; concave; contained; stitched) are the right, minimal reading of "not inside-out / anomalous," and the geometry-only scope matches the story text ("fix the buildDeathStar (models.ts) … geometry"). Reproduction-backed, not invented.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the diff is exactly the one-axis reseat TEA specified; no structure, algorithm, or abstraction was changed beyond it.
- No undocumented deviations found: the diff touches only the dish seat (x→z) + its doc comments; the sphere, stitch, rim loop, spokes, and every other model are untouched.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells; 719/719 tests; `npm run build` passes) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([RULE]) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents` — each domain assessed by the Reviewer directly and tagged below)
**Total findings:** 0 confirmed blocking · 1 LOW (non-blocking) · remainder VERIFIED

## Reviewer Assessment

**Verdict:** APPROVED

The change is a minimal, correct, pure-geometry reseat of the Death Star superlaser dish from `+X` to the camera-facing `+Z` hemisphere — the exact fix the RED-phase headless A/B render proved (the `+X` seat rendered edge-on as an anomalous crossed spike; `+Z` reads as the concave superlaser on the visible face). Only the dish moved; the sphere, stitch, rim loop, spokes, and all other models are untouched.

**Observations (tagged by domain — the 8 disabled subagents' domains were assessed directly):**

1. `[VERIFIED]` Dish axis swap is geometrically correct — `models.ts:611` rim `[rd·cosψ, rd·sinψ, zRim]` + `models.ts:613` focus `[0, 0, R·0.6]` seat the dish on `+Z`; `zRim = √(R²−rd²)` keeps the rim exactly on the shell (radius R) and the focus recessed at 0.6R. `+Z` is the near face: `render.ts cameraView` returns IDENTITY for `space` and `deathStarPlacement` returns `pos [0,0,z<0]`, drawn at `modelMatrix(pos, IDENTITY, scale)` — no reorientation. Complies with CLAUDE.md core-purity (Math-only).
2. `[EDGE]` `[VERIFIED]` The nearest-shell-vertex stitch (`models.ts` dish loop) is axis-agnostic — an exhaustive min-distance search over `sphereCount` vertices — so the `+Z` reseat yields short stitch edges to the `+Z`-facing ring vertices, the same quality as the former `+X` stitch. No new self-edge (rim index ≥ sphereCount, best < sphereCount), duplicate, or orphan: the 11-7 body suite's "no duplicate/self edge, no orphan vertices" tests are green (18/18).
3. `[SILENT]` `[VERIFIED]` No error-handling surface — the builder is pure `Math.sqrt/cos/sin` + array pushes; no `try/catch`, no fallback, nothing to swallow.
4. `[TEST]` `[LOW]` The `keeps the reseated dish stitched into the shell` guard asserts a recessed↔non-recessed edge exists — but that is satisfied by the focus→rim spokes (both internal to the dish), not specifically by the rim→sphere stitch, so it under-tests its namesake. True dish-to-sphere connectivity is already covered by the 11-7 `isSingleComponent` test, so this is a naming/precision nit, not a coverage gap. Non-blocking; the guard is not vacuous (it fails if the dish were all-recessed or all-on-shell).
5. `[DOC]` `[VERIFIED]` Both comments updated accurately — the builder doc (`models.ts:551`, "+Z axis … x=0 and y=0 planes") and the inline block (`models.ts:597`, cites `render.ts deathStarPlacement/cameraView` and the pre-fix `+X` regression). Grep confirms zero leftover `xRim` / "centred on +X" references.
6. `[TYPE]` `[VERIFIED]` No type changes; test uses type-only imports (`import type { Vec3 }`, `import type { Model3D }`); no `as any`, no casts, no non-null assertions in either file.
7. `[SEC]` `[VERIFIED]` Nothing to attack — pure client-side wireframe geometry, no I/O, user input, network, auth, secrets, or tenant surface.
8. `[SIMPLE]` `[VERIFIED]` Minimal one-axis swap; no over-engineering, no dead code. The determinism guard lightly overlaps 11-7's determinism test but targets the reseated builder directly — acceptable defensive duplication.
9. `[RULE]` `[VERIFIED]` See Rule Compliance below — core-purity + TS lang-review #1/#4/#8 all satisfied.

### Rule Compliance
| Rule | Applies to | Verdict |
|------|-----------|---------|
| CLAUDE.md — `core/` pure/deterministic (no DOM/window/Date/Math.random/rAF) | `buildDeathStar` (core) | COMPLIANT — only `Math.sqrt/cos/sin` + array ops; no forbidden API |
| CLAUDE.md — core owns geometry, shell consumes projection | the reseat is core-only; `render.ts` untouched | COMPLIANT — boundary preserved |
| TS lang-review #1 — no `as any`/`@ts-ignore`/non-null on nullable | both changed files | COMPLIANT — none present |
| TS lang-review #4 — `??` not `||` on possibly-0; null guards | test helpers (`dishAxis` null return + `if (!axis) return`) | COMPLIANT — no `||` on numerics; nulls guarded |
| TS lang-review #8 — meaningful, non-vacuous test assertions | new test file | COMPLIANT — every test pins a concrete value (1 LOW naming nit, obs #4) |
| Determinism (CLAUDE.md) | reseated builder | COMPLIANT — preserved; guarded by determinism test + 11-7 (green) |

**Data flow traced:** `buildDeathStar()` → `DEATH_STAR` const → `render.ts` space branch strokes it via `drawWireframe(DEATH_STAR, modelMatrix(pos[0,0,z<0], IDENTITY, scale), …)` behind the TIEs. Safe: geometry-only; the body never enters the sim, so it cannot touch determinism or TIE hit-tests (the `render.death-star-body` draw-order test is green), and the dish reseat changes only what the player sees on the far body's front face.

**Pattern observed:** correct core/shell separation at `models.ts` dish block — the fix lives entirely in pure core geometry, and the shell placement already supplies the IDENTITY orientation that makes `+Z` the camera-facing face. Good pattern.

**Error handling:** none required — pure total function over finite trig; no partial/failing paths (`models.ts` buildDeathStar).

### Devil's Advocate
Assume this is broken. First attack: is `+Z` actually toward the camera, or did Dev guess? If `cameraView('space')` ever returned a rotated frame, or if `deathStarPlacement` seated the body at `+Z`, the dish would face *away* and the "fix" would hide the anomaly behind the sphere. Checked: `cameraView` returns bare `IDENTITY` for `space` (unconditional final return), and `deathStarPlacement` returns `pos [0,0,z]` with `z ∈ [−8500,−3500]` — always negative — for every `phaseKills`, so `+Z` is invariably the near face. No state makes it wrong. Second attack: does the reseat corrupt the mesh — a rim vertex landing on top of a sphere vertex (zero-length edge) or the stitch snapping to a pole and drawing a long spurious line across the ball? The `+Z` rim circle lies in the XY-plane at `z=zRim`, while sphere ring vertices are parameterised in the XZ-plane about the Y axis; they don't coincide (and the 18/18 11-7 no-duplicate/no-orphan/no-self-edge tests confirm it), and the nearest-vertex search binds each rim point to the adjacent `+Z` equatorial ring vertices, not the ±Y poles — short edges, same as the old `+X` build. Third attack: could the dish now visually collide with the equatorial "trench" ring that also crosses `+Z`? The A/B render in RED showed the concave dish reading cleanly on the front face with the equator behind it — eyeballed, acceptable, and arguably *more* Death-Star-authentic (superlaser near the equator). Fourth attack: is the test a tautology that any sphere passes? No — it fell RED on the shipped `+X` build (`axis[2]=0`, `axis[0]=1`) and only passes once the dish actually faces `+Z`; the guards would catch a "fix" that shoved the dish outward (containment) or deleted it (recessed-exists). Nothing survives as a blocker.

**Handoff:** To SM for finish-story.