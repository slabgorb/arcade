# Story tp1-38 Context

## Title
THE MOVING EYE, part 3 — the full rim-fly-off: the near rim sweeps past the advancing eye and off-screen while the Claw rides CURSY (WD-012 full fidelity beyond tp1-33's near-ring-fixed model)

## Metadata
- **Story ID:** tp1-38
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Tempest — ROM fidelity against Theurer's original 1981 source

## Problem

**Part 3 of the three-part WD-012 remediation arc** (tp1-33 → tp1-37 → tp1-38).

tp1-33 implemented the descent well-expansion ("the well expands past the fixed Claw") by holding the near ring fixed and expanding the far ring. tp1-37 implemented the fly-in phase eye-into-new-well. This story completes the ROM-faithful model by implementing the **full rim-fly-off**: the near rim sweeps PAST the advancing eye and off-screen, while the Claw detaches from the rim and rides a fixed screen point (PY=CURSY).

**WD-012 Audit Finding Summary:**
- **Class:** DIVERGENCE
- **Title:** "The ROM dives the CAMERA with the Claw - the Claw's size is constant and the well expands; we shrink the Claw down a static tube"
- **ROM Basis:** `MOVCUD` (ALWELG.MAC:1049-1062) advances both the eye (`EYL/EYH`) and cursor (`CURSY`) by identical velocity each frame. Since the cursor is drawn at `PYL = CURSY` (ALDISP.MAC:604-608) and projection scales by `(PYL - EYL)`, the Claw's relative size and screen position are INVARIANT across the dive.
- **Current Divergence:** Our model shrinks the Claw down a static tube (warpClawDepth). The ROM model keeps the Claw stationary while the well (rim and floor) move closer to the eye.
- **Remediation Path:**
  - tp1-10: Shipped the fixed-Claw half (core model + render Claw at rim)
  - tp1-33: Shipped the well-expansion half (far ring expands, near ring FIXED)
  - tp1-38: Ships the complete ROM model (near ring MOVES, Claw at CURSY depth)

**Current State (post-tp1-33):**
The near ring is held fixed at its depth-1 screen position. Only the far ring expands/contracts. This gives the visual appearance of the well expanding past the Claw, which is ROM-faithful for the DESCENT alone. However, the full model has the near rim sweeping inward (toward the advancing eye) and eventually off-screen, creating a more dramatic "falling into the well" effect.

## Technical Approach

From tp1-33's Reviewer findings and the ROM source:

1. **Adapt the `warpDiveTube` seam** to compute the near ring's position as a function of eye-advance, rather than holding it fixed. The near ring's screen radius shrinks as the eye advances.
2. **Allow R_eff to exceed 1.0** (inverted geometry) when the eye advances past the near ring (in ROM units), allowing the rim to sweep off-screen.
3. **Move the Claw to PY=CURSY in render** — the Claw's depth becomes a fixed constant (CURSY, or recovered from core state), not tied to the near ring's position.
4. **Reuse the eye-advance mechanics** from tp1-33 (MOVCUD: cursor-velocity eye advancement) and tp1-37 (live `WarpState.eyeY` field).

**ROM References (from tp1-33/37 archives):**
- `MOVCUD`: ALWELG.MAC:1049-1062 (eye + cursor both advance by CURSVH:CURSVL)
- `CASCAL`: ALDISP.MAC:1449-1460 (projection: scale = (PYL - EYL))
- `DSPCUR`: ALDISP.MAC:604-608 (cursor drawn at PYL = CURSY)
- `CURSY`: Fixed at ILINLIY=0x10 during normal play; during dive, advances via MOVCUD

## Scope

- **In scope:**
  - Adapting the core geometry function to move the near ring inward as the eye advances
  - Allowing R_eff > 1.0 for inverted geometry (rim off-screen)
  - Moving the Claw render to a fixed CURSY depth (non-blocking shell verification by game-drive)
  - All unit tests pinning the near-ring movement, rim-off-screen, and inverted ratio
  - Full RUN-aided verification: `npm test` green, `npm run build` clean, game-drive visual confirmation

- **Out of scope:**
  - Starfield OFF gate during fly-in (PLAGRO=1 at EYH≥0xFC, ALWELG.MAC:92-96) — render-polish, defer to follow-up
  - Unrelated render optimizations or render-performance work

## Acceptance Criteria

_To be firmed by TEA during RED phase. Provisional outline below._

**Provisional Acceptance Criteria (SM-Drafted, TEA to Verify):**

1. The Claw rides a fixed screen depth (PY=CURSY), invariant as the eye advances, not tethered to the near ring.
2. The near ring's screen radius shrinks as eye-advance increases; the ring sweeps inward and off-screen.
3. The effective far/near ratio can exceed 1.0 (inverted geometry) for progress > a threshold value, enabling rim-off-screen.
4. Unit tests pin the near-ring movement law, the inverted R_eff behavior at rim-off-screen, and safe divide conditions across all 16 wells and the full dive range.
5. The Claw stays locked at the same screen point during the entire dive (descent + fly-in), verified by a render test (shell, ?raw).
6. Reuses the `warpDiveTube` contract from tp1-33 or adapts it with clear documentation (if broken).
7. Purity/determinism: the core geometry function is referentially transparent, finite, and domain-safe.
8. Citation gate stays green; any ROM edits use `reanchor-citations.mjs --write` before commit.

---
_Generated by `pf context create story tp1-38` from the sprint YAML._
