# Story rb4-16 Context

## Title
PLONSN, OR THE PLANE ESCAPES THE SCREEN — the servo must weave the DISPLAY position, clamped on-screen the ROM's way

## Metadata
- **Story ID:** rb4-16
- **Type:** refactor
- **Points:** 8
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** red-baron
- **Epic:** Red Baron — ROM fidelity against the original 1980 Atari source

## Problem

This is a POINTER STORY with scope derived from rb4-6 (THE ENEMY IS THE WRONG MACHINE), specifically its blocking Impact Summary finding logged by Dev in round 2.

The enemy window servo in rb4-6 still decides its zone from the STORED (world) position, while the ROM decides from DISPLAY, bounded by PLONSN (RBARON.MAC :2877-2937). The story ships an eye-free servo; a full eye-aware servo WITHOUT the PLONSN bounds re-creates a soft-lock at GMLEVL-4 (measured 0.0 frames in reach vs the shipped 11.6 frames). This story ports PLONSN and moves the servo onto `displayPos` to complete the display-space seam.

**CRITICAL TRAP:** AC-R3 (the guard that is this story's entire deliverable) must drive `step(e, lvl)` and `stepWave(enemies, lvl)` WITH eye through the bounds check — the servo cannot be eye-aware in production without that coverage, or the game ships the real soft-lock behaviour with zero test assertion (rb4-6 Deviation Justification, "The servo reads the STORED position...").

## Technical Approach

1. **Port PLONSN (RBARON.MAC :2877-2937)** — the on-screen bound that clamps the plane's world position to keep its display projection inside the gun window. This is a depth-scaled, PFROTN-rotated mechanism that acts as a per-frame anchor on the plane's position.

2. **Move the enemy window servo onto `displayPos`** — the servo currently reads the plane's STORED (world) position via `enemy.pos`; port it to read the plane's `displayPos` (world minus pilot eye via UNIV4X on X, I4YPOS on Y). The servo's zone-detection and olim/ilim clamping must now run on the display-space coordinates (RBARON.MAC :3157 `LDY PLSTAT+8 ;X SCREEN POSITION`, :3162 `LDY PLSTAT+0A ;Y SCREEN POSITION`).

   **PLSTAT storage convention** (RBARON.MAC :266-297): `PLSTAT+0/+2` are WORLD; `PLSTAT+8/+0A`
   are DISPLAY. The servo must read the `+8/+0A` pair. `PLSTAT+8` also appears at :2867
   (`;X DISPLAY`) and :2749 — do NOT cite those as the servo's screen-position source.

   **TRAP — HORIZN is normalization, not a bias (rb4-6, settled):** RBARON.MAC :2749-2752 is
   `LDA ZX,PLSTAT+8 / SBC I,HORIZN` — an X-axis routine that NORMALIZES into screen space, and it
   is NOT a Y clamp. rb4-6 established that porting a `SBC I,HORIZN` as a positional bias
   double-counts what our origin already absorbs. Do not re-introduce a HORIZN bias here.

3. **RE-WRITE AC-R3 to drive the eye through `step`/`stepWave`** — the guard must cover the display-space servo in the act. This means AC-R3 must call `step(enemy, level, eye)` / `stepWave(enemies, level, eye)` WITH a stepping eye that validates the PLONSN bounds are correctly applied. The predecessor story's eye-free guard is NOT sufficient for this story's deliverable, because an eye-aware servo without driving the eye in the test re-creates the GMLEVL-4 soft-lock (as measured in rb4-6 Dev round 2). The assertion must prove the servo keeps the plane reachable under the new bounds.

4. **Inherit and integrate four logged satellites from rb4-6** (each a behavioural gap identified but deferred):
   - **Spawn-X-about-UNIV4X gap** (Reviewer round 2): planes spawn about world origin while `heading` is unbounded, creating a potential outrun scenario when the servo first engages. Document or integrate into the bounds logic.
   - **P_ODLX's X-axis behavioural inertness under the ±olim clamp** (TEA round 3): the outer-limit position clamp makes the outer zone behave asymmetrically on the X axis (velocity can reverse, position cannot). This is load-bearing for the shot-avoidance window but under-tested. A follow-up may be needed.
   - **Y-pins-at-a-band-edge behaviour** (Reviewer audit annotation): sustained vertical cat-and-mouse requires the display-space servo to keep the plane inside a narrower Y band than its world position would suggest. The Y bounds in the DISPLAY space must be tighter than ±P_OLIM on the world Y.
   - **STPLNE's un-ported MAXDEL entry-delta seeding** (Dev round 2): the entry ramp seeds the plane's velocity deltas; the ROM's MAXDEL table has entry-dependent scaling that we do not model. A successor story may extend the entry logic.

5. **Address non-blocking comment follow-ups from rb4-6 Reviewer round 3** (can ride this story or be deferred):
   - The NaN-clamp comment overclaims totality (deltas flow unclamped — latent, production-unreachable).
   - AC-R3's z-gate vacuity deserves one disclosing line.
   - The ace-wiring comment should name the specific regex guard it indicts.

## Scope
- In scope: porting PLONSN, moving the window servo onto `displayPos`, re-writing AC-R3 to drive the eye through the bounds check, integrating the four logged satellites into the story's codebase or documentation.
- Out of scope: other enemy mechanics, depth-scale refactors, blimp display logic (bz is handled by rb4-15).

## Acceptance Criteria

**AC-1: PLONSN (on-screen bound) is ported from RBARON.MAC :2877-2937 and applied to the enemy's world position each frame**
- The bound is a depth-scaled, PFROTN-rotated clamp that keeps the plane's display projection inside the gun window.
- The plane's world position is anchored by PLONSN each frame during `step()`.
- Citation: rb4-6 Impact Summary, blocking finding (Dev round 2); RBARON.MAC :2877-2937.

**AC-2: The enemy window servo (windowServo) is moved onto `displayPos` and runs on both axes**
- The servo reads `displayPos` (world minus pilot eye via UNIV4X on X, I4YPOS on Y), not the stored world position.
- The servo's zone-detection (INNER vs OUTER) and olim/ilim clamping run on display-space coordinates.
- Corrected reading: "the servo runs on DISPLAY coordinates; the plane's screen position is world minus the pilot (UNIV4X on X, I4YPOS on Y)" (rb4-6 Impact Summary, context correction).
- Citations: rb4-6 Impact Summary, context-correction finding; RBARON.MAC :3157 (`LDY PLSTAT+8 ;X SCREEN POSITION`), :3162 (`LDY PLSTAT+0A ;Y SCREEN POSITION`), :266-297 (PLSTAT +0/+2 = WORLD vs +8/+0A = DISPLAY).
- Every citation above was verified against the quarry `~/Projects/red-baron-source-text/RBARON.MAC` by SM at setup. TEA: re-verify before pinning any constant — do not trust a quoted line you have not opened.

**AC-R3: AC-R3 from rb4-6 is RE-WRITTEN to drive the eye through `step()/stepWave()` and validate the PLONSN bounds**
- The assertion must prove the plane stays reachable (inside the gun window) under the new PLONSN bounds at all levels.
- `step(enemy, level, eye)` and `stepWave(enemies, level, eye)` must be called WITH a stepping eye in the guard.
- The guard covers the display-space servo in the act; an eye-aware servo without this coverage re-creates the GMLEVL-4 soft-lock (measured 0.0 frames in reach).
- This is the story's central trap and delivery proof.
- **THE MARGIN IS THIN — DO NOT RE-TUNE IT.** AC-R3's bar is `>10` frames-in-reach. The shipped
  servo measures 11.6 BEFORE the real gun (archive :235, :590) but **10.8 THROUGH THE REAL GUN**
  (archive :1467) — it clears the bar by 0.8 frames, not 1.6 (archive :285, hypot series
  599.2/124.3/28.2/22.1/11.6). Quote 10.8, not 11.6, when reasoning about the shipped margin.
- **Coupled seam:** `WINDOW_X`/`WINDOW_Y` = 32 (and `WINDOW_Z`) are INFERRED/playtest, not
  byte-pinned — the real CDSSET/SHCDCK window is untranscribed (rb4-6 TEA round 2, non-blocking).
  Any window change moves the 0.8-frame margin. If this guard fails, it is failing LOUDLY and
  HONESTLY — fix the servo, never re-tune the bar to make it green.
- Citation: rb4-6 Impact Summary, blocking finding (Dev round 2); rb4-6 Deviation Justification "The servo reads the STORED position..." (lines 578-601).

**AC-4: Four satellites from rb4-6 are logged and integrated into the story's scope or deferred with clear documentation**
- **Spawn-X-about-UNIV4X gap** (planes spawn about origin while heading unbounded) — document interaction with PLONSN entry logic.
- **P_ODLX X-axis inertness** (outer-limit asymmetry) — measure test coverage; note as follow-up if under-tested.
- **Y-pins-at-a-band-edge behaviour** (display Y servo needs tighter bounds) — verify Y band is tighter than world ±P_OLIM.
- **STPLNE MAXDEL seeding** (entry-dependent velocity scaling) — note as potential follow-up.
- Citations: rb4-6 Impact Summary, lines 371-374 (four satellites listed).

**AC-5: Non-blocking comment follow-ups from rb4-6 Reviewer round 3 are addressed or marked for follow-up**
- Audit and document the NaN-clamp totality claim (deltas flow unclamped — production-unreachable).
- Add one disclosing line to AC-R3's z-gate (vacuity noted).
- Name the specific regex guard indicted by the ace-wiring comment.
- Citations: rb4-6 Impact Summary, lines 389-392 (comment follow-ups).

## Dependencies
- **Depends on rb4-6** (THE ENEMY IS THE WRONG MACHINE): the servo is currently eye-free and positioned on STORED coordinates. rb4-16 completes the display-space seam by adding PLONSN bounds and eye-aware servo logic.

---
_Generated by `pf context create story rb4-16` from the sprint YAML and rb4-6 session archive._
