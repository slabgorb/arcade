# Context: sw10-1 — Unify projection lens

**Story ID:** sw10-1  
**Epic:** sw10 — Star Wars projection & fire-frame fidelity  
**Workflow:** tdd  
**Points:** 8  
**Type:** refactor  

---

## Summary

The Star Wars projection lens diverges from the authentic cabinet. The cabinet uses a symmetric ~90° field-of-view with perspective divide by the depth axis (X-forward); our code uses a 60° vertical / ~78° horizontal anisotropic lens dividing by −Z (OpenGL convention). This divergence forced per-model axis-swap hacks (`SURFACE_ORIENT`, `TOWER_ORIENT`, `PORT_ORIENT`, `TIE_ORIENT`) to bridge ROM object-space into our frame one at a time. The lens is the architectural base: every placement constant, scale factor, and collision bound was hand-tuned to compensate against it. **Fixing the lens first is required** — correcting it in isolation and re-deriving placements from ROM constants is the path to coherence. This story unifies the lens; the follow-up (sw10-2) re-derives the surface turret fire scroll-carry.

**Reference:** `plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md` — full findings, visual comparisons, source citations.

---

## Authentic Projection (from audit §2, confirmed via source)

From MACRO-11 source files (`SWMP.DOC`, `SWMP.MAC`, `WSOBJ.MAC`, `WSMAIN.MAC`, `WSCPU.MAC`):

- **Axes:** X = straight ahead (depth), Y = to the right, Z = up. (+X away, aliens spawn at X=$7C00 and X decreases toward player.)
- **Perspective divide:** by the depth axis X — `YP = YP·(1/X)` → screen X, `ZP = ZP·(1/X)` → screen Y. The hardware divider uses fixed numerator `M.DVN = $200`.
- **Field of view:** symmetric 90° (45° half-angle on both axes), literally the clip test: `|Y| < X` and `|Z| < X`. **No** separate focal-length constant; **no** per-phase FOV change.
- **Aspect:** aspect-independent — lateral and vertical share the same `< X` bound (not tuned to viewport width/height).
- **World scale:** `$4000 = 1.0` fixed-point; zoom = unity; play cube ±`$7CFF`; TIE spawn depth = `$7C00`.

---

## Current Divergence (from audit §3, cited in code)

From `src/shared/math3d.ts`, `plugins/star-wars/src/core/gameRules.ts`, `plugins/star-wars/src/shell/render.ts`:

| Property | Cabinet (authentic) | Ours (current) |
|---|---|---|
| **Depth / divide axis** | X | −Z (OpenGL right-handed) |
| **Basis** | native X-fwd, Y-right, Z-up | −Z-fwd, +X-right, +Y-up (+ per-model rotations) |
| **Field of view** | symmetric 90° (45° half-angle) | 60° vertical, ~78° horizontal (at 16:10 aspect) |
| **Aspect handling** | aspect-independent (both bounded by depth) | aspect-dependent (`w/h` ratio) |
| **Scale numerator** | fixed `$200`, unity zoom | `f = 1/tan(30°)` |

**Per-model axis-swap hacks** (render.ts lines 164, 193, 204-226, 239):
- `SURFACE_ORIENT = rotationZ(-π/2)` — rotates cross-sections from X/Y plane to floor relief.
- `PORT_ORIENT = rotationX(-π/2)` — maps ROM height axis to world depth.
- `TOWER_ORIENT = rotationX(-π/2)` × `translation(0, GD_HEIGHT_OFFSET / 30, 0)` — stands towers upright + lifts to floor.
- `GROUND_MODEL_SCALE = 1/30` — ROM scale (`.S = 30×4` units per design unit) → world presentation.
- `TIE_ORIENT = rotationZ(π/2)` — stands TIE solar panels upright, banks them at the cockpit.

These exist **instead of** one world→eye remap applied uniformly to all objects. The comments in render.ts state the mappings they undo — evidence that the base frame is wrong and being corrected ad-hoc per object.

---

## Acceptance Criteria

### 1. Authentic Lens Implementation
- [ ] Implement or adopt a symmetric ~90° field-of-view projection that matches the cabinet's clip test (`|lateral| < depth`, aspect-independent).
- [ ] Projection divides by the depth axis (decide: native X-forward in a world-space reframing, or a single consistent world→eye transform).
- [ ] Document the decision (native world frame vs. transformed frame) in a comment at the entry point.

### 2. Retire Per-Model Axis-Swap Hacks
- [ ] Remove or disable `SURFACE_ORIENT`, `PORT_ORIENT`, `TIE_ORIENT` from render.ts.
- [ ] Remove or disable `TOWER_ORIENT`, `GROUND_MODEL_SCALE` from render.ts.
- [ ] Verify that the model transforms now express themselves **entirely** via the single world→eye remap (no ad-hoc per-object rotations to hide the lens).

### 3. Preserve Model Rendering Correctness
- [ ] All three phases (space, surface, trench) render without visual regression **or obvious divergence** from the cabinet.
- [ ] Live playtest in `just serve` at `/star-wars/` — confirm no geometry glitches (models clipped, upside-down, scaled wrong, occlusion bugs).
- [ ] TIE panels read as upright and facing the cockpit; surface towers stand upright on the terrain; trench catwalks span the corridor; exhaust port sits in the trench floor.

### 4. Test Coverage & Line-Anchor Preservation
- [ ] Write new projection invariants (tests in `tests/core/`) that pin the authenticated lens (symmetric FOV, depth divide, aspect-independence).
- [ ] Ensure all existing tests in the star-wars suite remain green — the pure core is deterministic and the changes are a frame remapping, not algorithmic.
- [ ] **Citation gate**: check that `tests/audit/citations.test.ts` remains green. Any edits to `sim.ts` or `gameRules.ts` must be net-line-neutral or citations re-anchored (see below).

### 5. Placement Constants — Baseline Only
- [ ] **This story does NOT re-derive placement constants** (`SPAWN_DISTANCE`, trench dimensions, camera height, etc.). They remain fudged against the old lens for now.
- [ ] Record which constants are known-fudged in a comment (e.g., "// TODO: re-derive from ROM $7C00, $4000=1.0 once lens is canonical").
- [ ] A follow-up story will re-derive them from ROM values.

---

## Source Files Involved

### Core impact (pure simulation, no DOM):
- **`src/shared/math3d.ts`** — the `perspective()` projection function, possibly `viewMatrix()` if adopting a new world-frame convention. May need new FOV constants or world-frame assumptions.
- **`plugins/star-wars/src/core/gameRules.ts`** — `FOV_Y` (currently `Math.PI / 3` = 60°) and potentially camera/aim calibration constants. If shifting to a native X-forward frame, may need to re-calibrate `aimDirection()` and aim-to-screen coherence.

### Shell / rendering (canvas, no game math):
- **`plugins/star-wars/src/shell/render.ts`** — removes the `*_ORIENT` constants (lines 164, 193, 204-226, 239) and the per-model applications of them. Model transforms now apply only the world→eye remap, not these ad-hoc per-object fixes.
- **`plugins/star-wars/src/shell/wireframe.ts`** — may need adjustment to clip planes or near/far if the new projection changes depth semantics.

### Tests & fixtures:
- **`tests/core/`** — existing camera-MVP and projection-invariant tests may need updates if the lens changes. New tests pin the authentic lens.
- **`tests/audit/citations.test.ts`** — ensures citations to `sim.ts` and `gameRules.ts` remain valid after line edits. The audit commit (`3580752`) is immutable; any quote drift must be re-anchored.

---

## Critical Constraints

### Line-Anchor Tax: Citation & Fixture Sensitivity
**Editing `sim.ts` and `gameRules.ts` drifts line numbers and breaks two subsystems:**

1. **Comment-citation gate** (`tests/audit/citations.test.ts`): the audit records findings with line numbers pointing to the commit `3580752`. Line edits shift those anchors. **Remediation:** use `node tools/audit/reanchor-citations.mjs` to validate and re-baseline any quotes that drift. Edits should aim to be net-line-neutral (add lines, remove lines, keep the count stable within a section) to minimize re-anchoring work.

2. **sw8-27 line-list fixtures** (`tests/core/`): if any fixture pins line numbers from `sim.ts` (e.g., "the shield trigger at line 1234"), those references must be updated in lockstep. Grep the test files for numeric line references before sign-off.

**Mitigation strategy:** Keep edits localized and net-line-neutral. If that's impossible, explicitly re-anchor citations and update any fixture line refs as part of the commit. The memory at `./MEMORY.md` has an entry `starwars-sim-edit-reanchor-tax` with full guidance.

### Core/Shell Purity Constraint
- **`src/core/` is pure:** Deterministic sim, no DOM/canvas, no `Date.now()` or `Math.random()`. Time enters as `dt`, randomness via seeded RNG. Projection math is a pure function on vectors/matrices (math3d).
- **`src/shell/` is render/IO:** Canvas, input, audio, font, glow. The shell consumes the core's projected coordinates; it never does game math.
- **Projection lives in the seam:** The `perspective()` function and the `view`/`model` matrices are pure-core concerns (determinism, replayability, test-fixture reproduction). Their constants and calibration (FOV_Y, world-frame assumptions) belong in `gameRules.ts` (core).
- **Render orientation (the *_ORIENT hacks) is a shell concern**, but the root cause — the divergent lens — is a core issue. The fix touches both, but the primary (the lens) is core.

---

## Testing Strategy

1. **Unit tests (new):** Write projection-invariant tests in `tests/core/` that pin the authentic lens:
   - Symmetric FOV: verify that a point at `(X, Y, Z)` projects the same horizontally as `(X, -Y, Z)` (symmetry).
   - Aspect-independence: verify that changing viewport aspect doesn't change the clip boundary.
   - Depth-divide: confirm that screen coords scale as `1/depth`.

2. **Regression (existing):** Run the full star-wars suite (`npx vitest run --project star-wars`). The pure core is deterministic; all existing tests should stay green if the frame remapping is correct.

3. **Citation gate:** Run `npx vitest run --project star-wars citations`. Any quote drift will be reported; re-baseline with `node tools/audit/reanchor-citations.mjs` and commit the fixes.

4. **Visual regression (manual):** After the lens is in place, load `/star-wars/` in `just serve` and do a rough eyeball check:
   - Space: TIEs approach along the center, converging on the reticle. (Rough scale; exact placement is a later story.)
   - Surface: towers stand upright, the grid recedes, the horizon is visible.
   - Trench: catwalks span, walls converge toward the exhaust port, the port sits in the floor.

   **No need for pixel-perfect reproduction** — the audit captured rough on-screen behavior. This is sanity-checking that orientation/scale are in the ballpark, not a fidelity gate.

---

## Known Unknowns & Staging

- **World frame convention:** A single world→eye transform can be applied in multiple ways. Decide early:
  - Option A: Adopt native (X-fwd, Y-right, Z-up) in the world, remap to OpenGL at the camera.
  - Option B: Keep the world OpenGL, but change the projection to symmetric 90°.
  - Option C: Use a hybrid (e.g., keep the current world, remap only the projection constants).
  - **Recommendation:** Option A (native frame) is cleanest and most ROM-authentic; it makes all ROM constants drop in unscaled. Option B is least-disruptive to existing code. Choose one, document it, and apply it consistently.

- **Placement re-derivation:** Deferred to sw10-2. This story leaves known-fudged constants in place with `TODO` comments pointing to ROM sources (e.g., `$7C00` TIE spawn depth, `$4000=1.0` scale factor).

- **Fire direction / targeting:** The audit resolved the "weapons don't line up" symptom as a trench-fire scroll-carry bug (PR #125, already shipped). This story's projection changes may alter aim/fire vectors slightly — test live.

---

## Reference Pointers

- **Audit findings & screenshots:** `plugins/star-wars/docs/2026-08-08-star-wars-projection-audit.md` (full document, audit commit `3580752`).
- **ROM source:** `~/Projects/star-wars-1983-source-text/` (LF-normalized plain-ASCII copy of the 1983 MACRO-11 source).
  - `SWMP.DOC`, `SWMP.MAC` — Math Box documentation and micro-program.
  - `WSMAIN.MAC` — main play loop, projection setup, clip test.
  - `WSCPU.MAC` — TIE constants (spawn depth `$7C00`, lateral offsets ×`$400`).
  - `WSGRND.MAC`, `WSOBJ.MAC` — surface/tower/ground object constants.
- **Related story:** sw8-27 (audit gate + citation re-anchoring infrastructure).
- **Prior fixes:** PR #125 (trench-fire scroll-carry, not a projection bug).

---

## Staging Recommendation

1. **Phase 1 (RED): Pin the authentic lens** — change the projection constant or world-frame convention, retire the *_ORIENT hacks, and write new invariant tests.
2. **Phase 2 (GREEN): Ensure all tests pass** — existing suite should stay green if the frame remapping is correct.
3. **Phase 3 (REVIEW): Verify visual sanity** — load in the dev server, eyeball the three phases. No pixel-perfect matching required; just confirm no gross geometry bugs.
4. **Follow-up (sw10-2): Re-derive placements** — once the lens is canonical, bump placement constants from ROM values.

---

## Delivery Notes for TEA (red phase)

- The story context file and the audit doc are authoritative. TEA's red phase writes tests that **fail** because the current lens is wrong.
- Tests should pin the authentic lens behavior (symmetric FOV, depth divide, aspect-independence) — not the current implementation.
- Keep edits to `sim.ts` and `gameRules.ts` minimal and net-line-neutral, or plan to re-anchor citations.
- Ensure the core/shell purity boundary is maintained — projection math stays in the core.

