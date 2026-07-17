# Story rb4-16 Context

> ## ⛔ PARKED — SEQUENCING INVERTED (SM ruling, user-confirmed 2026-07-17)
>
> **rb4-16 is BLOCKED ON rb4-17 and returned to backlog.** The 2026-07-16 ruling put rb4-16
> first ("settle where the centre sits, then size the picture around it"); Dev's green-phase
> archaeology proved that backwards, and rb4-17's OWN citations corroborate it. **rb4-17 must
> ship first.** When rb4-16 is re-cut, this section is its corrected scope; the body below is the
> ORIGINAL spec, kept for provenance but now known to encode a wrong premise (AC-2 mixes spaces).
>
> Branch `refactor/rb4-16-plonsn-display-space-servo` (pushed) and TEA's RED commit `bdd03f1` are
> kept as evidence; the session is archived at `sprint/archive/rb4-16-session.md`. The RED suite
> `tests/core/plonsn.test.ts` needs REWRITING when re-cut — AC-2's premise assertions are wrong.
>
> **Why rb4-17 is the prerequisite, not the successor (all re-openable in the quarry):**
>
> 1. **The servo lives in POST-DIVIDE SCREEN space, not our pre-divide `displayPos`.** `PLNDEL`
>    reads `PLSTAT+8..+B`, which the ROM names `;X SCREEN POSITION` / `;Y SCREEN POSITION`
>    (RBARON.MAC:3157/:3162) and which carries POSITH's post-divide `ADC I,HORIZN` lift
>    (RBGRND.MAC:303) — which is exactly why the Y entry subtracts HORIZN back off (:2750) and the
>    X entry does not. So `P_OLIM`/`P_ILIM` are SCREEN units. `PLONSN`'s `PLSTAT − UNIV4X`
>    (:2909-2913) is a SEPARATE pre-divide world offset it computes fresh, and THAT is why it
>    scales by depth (:2886): it is the bridge between the two spaces. Three spaces, not two.
>    → This is exactly rb4-17's AC-3: the `scene.ts` NDC seam (`ROM_SCREEN_HALF=512`, invented at
>    rb4-5) must be pinned against the ROM's own screen windows — `SETBM |screen| < 0x300`
>    (RBGRND.MAC:326-334) and `SETGRS ±0x220 X / ±0x188 Y` (:345-355). Until that scale exists,
>    PLONSN's window has no unit to be expressed in. (Dev independently hit `:353 CPY I,88 / SBC I,1`
>    = the ±0x188 Y window while tracing POSITH — that citation is real.)
>
> 2. **PLONSN's depth input is POSITION Z, a field our clone doesn't separate yet.** `:2882` loads
>    `PLSTAT+19` = POSITION Z (:295) — a DIFFERENT field from `+4/+5` PICTURE SIZE Z (:272), with
>    its own delta. → This IS rb4-17's AC-2 (dual-Z). Our `enemy.ts` has ONE `depth` doing both
>    jobs, so any PLONSN derivation feeds the wrong Z. rb4-16 cannot be built until dual-Z exists.
>
> 3. **No citable PLONSN window clears AC-R3 anyway.** Math Box multiply is settled at `>>16`
>    (`MBUCOD.V05:494-516`), but the SINE table is `SINE=3800` (:396) — a bare ROM address whose
>    data is in NO `.MAC` file, so the trig fixed-point is unreadable from the quarry. Dev measured
>    the family with the real `spawn`/`flight.step`/`guns.collides`: AC-R3 (bar `>10` frames-in-reach
>    at GMLEVL 4) recovers only for a limit coefficient `C = limit/depth ≲ 0.05`, while the literal
>    transcription gives C≈1.58 and our own projection gives C≈0.63 — both score **0.0** (the
>    no-PLONSN case also scores 0.0, reproducing rb4-6's archive exactly). Green would need C≈0.025,
>    which nothing cites. The real defect is upstream: our gun is a fixed ±32 WORLD tube
>    (`WINDOW_X/Y`, playtest) while the ROM's is the plane's PROJECTED PICTURE bbox that grows as it
>    closes (COLSTP :5789-5821, `DB.TRP` min/max) — rb4-17's picture-scale territory.
>
> **Un-ported detail to fold in when re-cut:** the OUTER zone's "return to centre" is depth-gated
> (`:2776-2781`, `LDA PLSTAT+19 / CMP I,4`) — close in, the plane deliberately flies past off-screen
> rather than returning. Our `windowServo` returns unconditionally. Same `PLSTAT+19` field as (2).
>
> Full evidence: `sprint/archive/rb4-16-session.md` Dev Assessment + Delivery Findings (Gap/Conflict).

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

   **CORRECTED BY TEA — the SM assessment's citation fix was itself WRONG. This is the true reading**
   (verified against the quarry AND corroborated by rb4-6's own Dev rationale, archive :586-588):

   `PLNDEL` runs ONE servo twice, and the axis is selected by the X register — `ZX` is zero-page
   **X-indexed**, so the SAME instruction reads a different field per pass:

   - **Y pass** — `:2747 LDX I,2` sets X=2, so `:2749 LDA ZX,PLSTAT+8` reads `PLSTAT+8+2` =
     **`PLSTAT+0A` = Y DISPLAY**, then `:2750 SBC I,HORIZN`. The ROM's own comment `;PLSTAT+10.`
     is DECIMAL 10 = `0x0A`, and `:2755 P.WINDW: STX SAVX ;OFFSET FOR Y DELTA` names the axis
     outright. `:2749-2752` IS the Y entry.
   - **X pass** — `:2865 P.WITR: DEX/DEX` drops X to 0, so `:2867 LDA ZX,PLSTAT+8` reads
     **`PLSTAT+8` = X DISPLAY** (`;X DISPLAY`), loaded RAW with no HORIZN term.
   - `:3157` (`;X SCREEN POSITION`) / `:3162` (`;Y SCREEN POSITION`) are `LDY PLSTAT+8`
     NON-indexed, in the DPABS display path — they are NAMING EVIDENCE that `PLSTAT+8..+B` is the
     DISPLAY block, NOT the servo's entry points. Cite them for the block's identity, not the servo.
   - Block layout `:266-297` / `:278-281`: `PLSTAT+0/+2` = "PLANE POSITION" (WORLD),
     `PLSTAT+8/+A` = "DISPLAY POSITION". The servo reads the `+8/+0A` DISPLAY pair — which is
     exactly what our `windowServo` does NOT do, and is this story's bug.

   **TRAP — HORIZN normalizes, it does not displace (rb4-6, settled; stands unchanged).** The Y
   entry's `SBC I,HORIZN` only puts Y back into the horizon-relative space X already occupies —
   POSITH added it on the way out of the divide (`ADC I,HORIZN`, RBGRND.MAC:303). Porting it as a
   positional bias double-counts what our origin already absorbs. Our display Y is horizon-relative
   BY CONSTRUCTION (the eye sits on the horizon in level flight), so there is still no HORIZN term
   in this module's arithmetic — `scene.ts` remains the one place that adds it. See `enemy.ts:103-128`,
   which already documents all of the above correctly. Do NOT re-introduce a HORIZN bias here.

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
- Citations (TEA-corrected — see the CORRECTED block in Technical Approach §2 above): the servo's
  own entries are RBARON.MAC :2749-2752 (Y pass, `ZX` X=2 → `PLSTAT+0A` Y DISPLAY, `SBC I,HORIZN`)
  and :2867 (X pass, `ZX` X=0 → `PLSTAT+8` X DISPLAY, raw); :2755 `;OFFSET FOR Y DELTA` proves the
  Y axis; :266-297 / :278-281 name +0/+2 WORLD vs +8/+A DISPLAY; :3157/:3162 are DPABS-path naming
  evidence only. Corroborated by rb4-6 archive :586-588 (Dev's own rationale) and `enemy.ts:103-128`.
- **Citation hygiene, the hard way.** sm-setup fabricated a line number here; the SM's fix then
  introduced a WORSE error (it called the Y entry an "X-axis routine"), because a `grep`/`sed` of
  `:2749` shows `LDA ZX,PLSTAT+8` and LOOKS like the X field unless you track the X register set at
  :2747. Do not read a `ZX,` operand without finding the `LDX` that selects the axis. Open the ROM,
  read the surrounding block, and cross-check against `enemy.ts` — which had it right the whole time.

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
