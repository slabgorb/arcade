# Context: sw8-1 — The moving eye

## Story Summary
Port the cabinet's viewer motion (`ST.UX` vector from `WSMAIN.MAC`) so the space viewpoint is not bolted to the origin. Death Star can leave frame; starfield drifts laterally (not forward-streaming). This is the lead story of epic sw8 (Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay).

**Status:** TDD — write failing tests first, then implement.
**Points:** 5  
**Workflow:** tdd  
**Repos:** star-wars  

---

## Problem Statement

Epic **sw7** shipped a 173-finding audit of the pure simulation against the 1983 ROM source. The audit is live (v0.0.27, 2026-07-20). However, a playtest report and the cabinet longplay (star-wars-longplay.mov, waves 1–4) reveal a **coverage gap**: the render/camera/tuning layer was never held against the cabinet the way the sim was held against the source.

**Evidence anchor:** Around wave 4 (score 352,171), mid space-combat, the Death Star is entirely out of frame. Our space camera is a fixed identity matrix — eye at the world origin, looking down −Z, Death Star pinned ahead and merely scaling up. It **cannot** put the Death Star out of frame. Therefore, the cabinet flies a **moving viewpoint** driven by a viewer-translation vector `ST.UX` off the frame counter (`WSMAIN.MAC`), sliding the whole world past a moving eye.

The real culprit is camera/projection/tuning, not the sim. This story rules and ports the moving eye.

---

## Design Specification Reference

**Full spec:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`

**Rule #1 (§3): Rule before you fix.** Watch the build beside the longplay, dig the source where a mechanism is in doubt, **rule** each divergence (bug / tuning / accepted-deviation), then fix only what was ruled a bug or tuning.

---

## Technical Approach

### 1. Investigate the Source

**Read:** `WSSTAR.MAC` and `WSMAIN.MAC` from the 1983 disasm (reference/ or the pristine clone at `~/Projects/star-wars-1983-source`).

**Find:**
- `ST.UX`, `ST.UY`, `ST.UZ` viewer-translation math in `WSSTAR.MAC`
- How the frame counter drives this vector in `WSMAIN.MAC`
- Settle **translation vs. rotation**: does the cabinet move the eye (translation) or rotate it (rotation)? Translation vs. rotation is not eyeball-distinguishable without the source.

### 2. Verify Current Code

- Current camera model lives in `src/shell/render.ts` → `cameraView(state)` branch for space phase.
- Today: fixed identity matrix (eye at origin, looking down −Z).
- Verify the starfield code in `src/shell/render.ts` → `projectStars(…)`.
- Confirm Death Star is pinned ahead and only scales.

### 3. Port the Viewer Motion

Once the source is understood:
- Extract `ST.UX`, `ST.UY`, `ST.UZ` values and their frame-counter drive formula.
- If translation: apply the viewer vector to the camera view matrix so the world slides past the eye.
- If rotation: rotate the camera accordingly.
- Keep the existing seeded PRNG for starfield layout (`STARNW` hardware RNG in ROM; we substitute it — keep the substitute).

**Purity:** Determine if the viewer motion must live in `core/state.ts` (for determinism) or can stay in `shell/render.ts` (pure render). The frame counter is already in state; if motion is deterministic, add eye-translation to `GameState`.

### 4. Verify Against Longplay

- Serve the build locally on a spare port (separate checkout or use a distinct port to avoid collision with production servers).
- Play a few waves with the fix and compare frames beside star-wars-longplay.mov (6:52, waves 1–4).
- **At wave 4, score 352,171:** Death Star must be entirely out of frame (off-centre or off-screen).
- Starfield parallax must drift laterally with the eye, not forward-stream.

### 5. Keep Citations Green

Any touched constant must re-stamp its `remediated_by` line in `docs/audit/findings/*.json`. Run:
```bash
npm test -- citations
```

---

## Acceptance Criteria

- [ ] **AC1 — Source ruling complete:**  
  `ST.UX`/`ST.UY`/`ST.UZ` mechanism understood from disasm (translation vs. rotation settled).

- [ ] **AC2 — Viewer motion ported:**  
  `cameraView(state)` space branch now applies the viewer-translation vector off the frame counter, so the world (stars, Death Star, TIEs) slides past a moving eye.

- [ ] **AC3 — Death Star leaves frame:**  
  At wave 4, score ~352,171 (mid-combat phase from longplay), Death Star sits off-centre or entirely off-screen, matching the cabinet.

- [ ] **AC4 — Starfield drifts laterally:**  
  Starfield parallax motion matches lateral eye drift, not forward-streaming hyperspace zoom.

- [ ] **AC5 — Determinism preserved:**  
  Same seed → same camera path. Tests pass with deterministic playback across runs.

- [ ] **AC6 — Citations green:**  
  `npm test -- citations` passes; touched constants have updated `remediated_by` entries.

- [ ] **AC7 — No regressions:**  
  Existing space-phase rendering tests still pass. TIE/fireball positions relative to camera are correct (use `debug-overlay.ts` to verify 3D bounds).

---

## Reference Material

- **Cabinet reference:** `star-wars-longplay.mov` (6:52, waves 1–4)
- **1983 disasm:** `reference/disasm/` (WSSTAR.MAC, WSMAIN.MAC)
- **1983 source (pristine):** `~/Projects/star-wars-1983-source` (github historicalsource/star-wars, commit 5355b76)
- **Current camera code:** `src/shell/render.ts` → `cameraView(state)` space branch
- **Starfield code:** `src/shell/render.ts` → `projectStars(…)`
- **Math box:** `src/core/math3d.ts` (mat4 operations, projection)
- **Design spec:** `docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` (§1–3)
- **Existing debug tools:** `/models.html` (contact sheet), `/scenes.html` (scene grid), `debug-overlay.ts` (axes/frustum/bounds)

---

## Scope & Constraints

- **Scope:** Camera/viewer motion only. Do NOT change the starfield RNG substitute or the TIE/fireball sim.
- **Branches:** Keep `src/core` / `src/shell` purity — camera motion is render unless determinism requires it in state.
- **Testing:** Use Vitest to cover viewer motion math and frame-counter drive; verify pixels against longplay (manual QA).
- **No regression:** All space-phase rendering tests must stay green; `npm test -- citations` must pass.

---

## Story Dependencies

- **Depends on:** none (epic sw8 lead story)
- **Blocks:** sw8-2 (TIE feel and fire fairness)

---

## Definition of Done

When all acceptance criteria are met:
1. **Tests pass:** `npm test` (vitest) + `npm test -- citations` (audit findings)
2. **Build succeeds:** `npm run build`
3. **Manual verification:** Longplay comparison at wave 4 shows Death Star off-frame and starfield drifting laterally
4. **No debug code:** All console logs, breakpoints, and temporary test fixtures removed
5. **Code review approved**
6. **Merged to develop** via PR
