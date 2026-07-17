# Story rb4-17 Context

## Title
THE PLANE IS DRAWN AT THE WRONG SCALE — model bytes are not world units, and the ROM sizes the picture with its own Z

## Metadata
- **Story ID:** rb4-17
- **Type:** bug
- **Points:** 8
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** red-baron
- **Epic:** Red Baron — ROM fidelity against the original 1980 Atari source

## Problem
AUDIT SCOPE HOLE (user playtest 2026-07-16): no pair-* finding covers the ROM display path's vertex scaling — pair-4 audited combat logic, nobody audited PROJECT/ZAXIS. Symptom (user video + reproduced): the enemy plane renders as a ~15px speck at spawn and only ~10% of screen width at closest approach; the arcade shows a clearly visible aircraft at entry and a screen-dominating fly-by. Position is NOT the bug — P.INDP=0x1080=4224 is correctly transcribed (rb4-1). TWO ROM MECHANISMS ARE MISSING, both from the CITABLE quarry ~/Projects/red-baron-source-text (RBGRND.MAC .RADIX 16 from :6; RBARON.MAC from :74). (1) VERTEX PRE-SCALING: model vertex bytes are scaled UP before the depth divide in EVERY display path, and our clone injects raw bytes into world space 1:1 (main.ts:196 translation·PLANE_POINTS). RBGRND.MAC PROJECT (:359-441, ground objects + drones): vertex X sign-extended then 4×ASL/ROL = ×16 (:374-381) into the Math Box divide by O.DPTH (:382-385); vertex Y only 2×ASL/ROL = ×4. RBGRND.MAC ZAXIS (the full-plane 3D path via PLTEST:4984→PLNABZ:443): storage-convention comments say X bytes are held ×2 and shifted once more to enter the MM at ×4 (";X (*2)" :484, ";X LSB (*4)" :488) while Y enters unshifted at ×4 (";Y (*4)" :492) — so the full-plane path is ISOTROPIC ×4 into the rotation, and the PROJECT path's ×16/×4 likely composes with per-table storage scales. DO NOT bake ×16 in as gospel: RED must derive each path's composite vertex→screen factor coherently from these citations (PFTRIG :5981 loads plain sin/cos — no rebalance hides there). (2) DUAL Z — PICTURE SIZE vs POSITION: PLOBDB carries +4/+5 "Z LSB PICTURE SIZE" (:272) AND +19/+1A "POSITION Z" (:295) with SEPARATE deltas +10/+11 DELTA Z vs +1B DELTA POS Z (:297). PLNLBS positions the center by dividing world X/Y by POSITION Z (:4817-4822 → POSITP) but loads O.DPTH for the vertex divide from +4/+5 (:4848-4850). STPLNE spawns BOTH at P.INDP (:2318-2324); UPDPLN steps them separately (+4 += +10/+11 at :2666-2671; +19 += sign-extended +1B at :2704-2708) and the P.MNDP fly-by-over check reads PICTURE Z +4/+5 (:2712-2716). Our enemy.ts has ONE depth doing both jobs. Direct proof O.DPTH is a picture-scale control, not merely distance: the end-of-game path pins it to a constant with the ROM's own comment "STA O.DPTH+1 ;SCALE FACTOR" (RBARON.MAC:1322-1324). ABSOLUTE-SCALE ANCHORS for the scene.ts "not byte-pinned" seam (scene.ts:43-52, the invented 60° FOV / ROM_SCREEN_HALF=512): SETBM culls at |screen| ≥ 0x300 (:326-334) and SETGRS windows ±0x220 X / ±0x188 Y (:345-355) — derive or explicitly re-affirm the NDC scale against them. Blimp is OUT OF SCOPE for dual-Z (BLOBJ has no +19 field, :299-318) but its picture scale rides the same vertex path — verify in RED alongside wrecks/shells. SEQUENCE AFTER rb4-16 (PLONSN display-space servo — the sibling half of the same display pipeline: rb4-16 servos where the CENTER sits, this story sizes the PICTURE drawn around it; rb4-6 landed 2026-07-16) and coordinate with rb4-15 (shared screen-scale/depth-scale test files). Expect the screen-scale and depth-scale suites to re-baseline — that is the point. Depends on rb4-1 (hex) and rb4-5 (camera shape).

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- Enemy planes and drones render at the ROM's picture scale: every vertex→screen scale factor is DERIVED from the cited routines (PROJECT :374-385 pre-shifts; ZAXIS :484-492 storage comments; per-table storage scales) and carries its citation. Any factor that cannot be byte-pinned is declared a seam with the derivation shown, exactly like scene.ts:43 does — never silently invented.
- Dual-Z is implemented: the enemy carries a PICTURE Z (spawned P.INDP, stepped by the PLPOSZ delta, RBARON.MAC:2666-2671) and a POSITION Z (spawned P.INDP, stepped by DELTA POS Z, :2704-2708); the center is positioned by POSITION Z (PLNLBS :4817) and the vertices divided by PICTURE Z (:4848-4850); the P.MNDP fly-by-over check reads PICTURE Z (:2712-2716).
- The scene.ts NDC-scale seam is re-derived or re-affirmed against the ROM's own screen windows: SETBM |screen| < 0x300 visibility cull (RBGRND.MAC:326-334) and the SETGRS ±0x220/±0x188 window (:345-355), with the chosen FOV documented against those anchors.
- A projection test pins the functional outcome with ROM-derived numbers, not eyeballing: at spawn depth P.INDP the drawn wingspan meets the derived NDC size, and at P.MNDP the fly-by dominates the frame per the derived scale.
- The X-vs-Y anisotropy question is SETTLED in the story notes with citations (ZAXIS says the full-plane path is isotropic ×4; PROJECT's ×16/×4 must be reconciled against its point tables' storage scale) — cross-checked visually against MAME footage before the constants land.
- Blimp/wreck/shell picture scale is verified against the same paths in RED; blimp gets NO position-Z (BLOBJ has no +19 field).
- npm test -- citations stays green; screen-scale/depth-scale re-baselines cite the line they re-derive from.

---
_Generated by `pf context create story rb4-17` from the sprint YAML._
