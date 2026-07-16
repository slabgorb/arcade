---
story_id: "rb4-6"
jira_key: "rb4-6"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-6: THE ENEMY IS THE WRONG MACHINE — the weave reverses at the INNER window, and runs on Y too

## Story Details
- **ID:** rb4-6
- **Jira Key:** rb4-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** red-baron
- **Type:** refactor
- **Points:** 13

## Workflow Tracking
**Workflow:** tdd (phased)
**Phase:** finish
**Phase Started:** 2026-07-16T12:24:19Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T04:47:18Z | 2026-07-16T04:50:41Z | 3m 23s |
| red | 2026-07-16T04:50:41Z | 2026-07-16T06:16:23Z | 1h 25m |
| green | 2026-07-16T06:16:23Z | 2026-07-16T09:53:23Z | 3h 37m |
| review | 2026-07-16T09:53:23Z | 2026-07-16T10:17:20Z | 23m 57s |
| red | 2026-07-16T10:17:20Z | 2026-07-16T10:38:46Z | 21m 26s |
| green | 2026-07-16T10:38:46Z | 2026-07-16T11:21:48Z | 43m 2s |
| review | 2026-07-16T11:21:48Z | 2026-07-16T11:48:32Z | 26m 44s |
| red | 2026-07-16T11:48:32Z | 2026-07-16T12:05:55Z | 17m 23s |
| green | 2026-07-16T12:05:55Z | 2026-07-16T12:08:05Z | 2m 10s |
| review | 2026-07-16T12:08:05Z | 2026-07-16T12:24:19Z | 16m 14s |
| finish | 2026-07-16T12:24:19Z | - | - |

## Story Context

### Epic Cluster
**Cluster:** C5
**Subsumes:** EN-016, EN-017, EN-018, EN-020, EN-021
**Category:** ROM fidelity — enemy movement mechanics

### Technical Approach

The enemy stepper is fundamentally broken in five ways:

1. **Weave Reversal at Wrong Window:** We reverse at the OUTER window; the ROM reverses at the INNER one — P.INER is reached only when |position| < P.ILIM and does `EOR I,0FF ;REVERSE FLAG (HEAD AWAY FROM CENTER)` (RBARON.MAC:2794-2797). The plane turns around when it gets CLOSE TO CENTRE. This changes the shape of every engagement.

2. **Y-Axis Movement Missing:** Enemy planes NEVER MOVE VERTICALLY in our clone; the ROM runs the SAME window/servo machine on the Y axis (PLNDEL enters with LDX I,2 for Y, then DEX/DEX to X=0 and re-runs the whole machine on X — RBARON.MAC:2747-2754, :2865-2873).

3. **Plane Lifecycle:** Planes FLY PAST you and are destroyed as objects when they cross P.MNDP (0x140 = 320 after radix sweep); ours hover at a depth floor forever.

4. **Drone vs Lead Behavior:** Drones have their own two-phase PARALLEL→FREE behaviour; ours weave exactly like leads.

5. **Entry Bank Discard:** The 90-degree entry bank is discarded on our first step().

### Acceptance Criteria
- [ ] The weave reverses at the INNER window limit (P.ILIM), heading away from centre, and accelerates toward the P.IIDL target by level.
- [ ] The window/servo machine runs on BOTH axes — enemy planes move vertically as well as laterally, biased by HORIZN.
- [ ] A plane that crosses P.MNDP (0x140 = 320) is DESTROYED as an object and arms the returning attack (GMEND0), with the WO.RTN re-entry delay — it does not hover at a floor.
- [ ] Drones implement the PARALLEL→FREE two-phase behaviour and spawn at DRINZ = 0x1600, not at the lead's depth.
- [ ] The blimp is an APPROACHING airship (Z from 0x1000, closing 0x80/frame), gated behind FOUR planes having appeared (N.PLNZ), firing 1-in-4 calc frames (2.604 shots/s) and only at GMLEVL >= 2 — NOT the constant-depth lateral drifter firing every 2nd frame at all levels that we ship. (CD-005 CERTIFIED our blimp as correct; the coverage review proved that CONFIRMED FALSE — it borrowed the plane's div-by-2. Do not trust it.)
- [ ] Depends on rb4-1.

### Dependencies
**Blocks:** None currently
**Depends On:** rb4-1 (RADIX SWEEP — constants must be hex-corrected first)

### Key ROM References
- PLNDEL stepper entry point: RBARON.MAC:2747-2754, :2865-2873
- Weave reversal: RBARON.MAC:2794-2797
- Plane destruction at P.MNDP: RBARON.MAC (crossing depth threshold)
- DRINZ (drone spawn depth): 0x1600
- HORIZN bias for Y movement: 0x40 = 64

## Delivery Findings

### TEA (test design)
- **Scope** (blocking): AC-5 (blimp) was SPLIT into its own story by user ruling (2026-07-16).
  Affects `sprint/` (a new blimp story must be created by the SM) and `red-baron/tests/core/`
  (the blimp-approach RED suite + the ~25-test sibling re-seat map are preserved at scratchpad
  `blimp-story-seed/`). rb4-6 now delivers AC-1..4 + problem item 5 (entry-bank ramp).
  *Found by TEA during test design.*
- **Gap** (non-blocking): AC-3 "arms the returning attack (GMEND0)" is an INTEGRATION behaviour
  (main.ts + returning-ace.closesPast/beginPass), not unit-observable in enemy.ts. The RED suite
  pins the fly-past DEACTIVATION and couples it to the closesPast threshold; the actual arming
  wiring (drop the deactivated plane, beginPass from its side, WO.RTN re-entry delay) is Dev's
  integration. Affects `src/main.ts` / `src/core/waves.ts` (a new `stepWave`). *Found by TEA during test design.*
- **Improvement** (non-blocking): the per-level weave-speed tables P.ODLX/P.IDLX/P.IIDL
  (RBARON.MAC:2948-2956) use `.2WORD`/`.3WORD` macros with an unverified ×2/×3 scale and NO baked
  artifact — deliberately NOT byte-pinned (behaviour pinned instead). Reviewer should diff-trace the
  Dev's magnitudes against the ROM. Affects `src/core/enemy.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (blocking): AC-2's "biased by HORIZN" reads `SBC I,HORIZN` backwards — it REMOVES a
  displacement rather than creating one. PLNDEL loads the X axis raw (`LDA ZX,PLSTAT+8 ;X DISPLAY`,
  :2867; ";X SCREEN POSITION", :3157) and the Y axis as `PLSTAT+10 - HORIZN` (:2749-2752); the
  subtraction exists to put Y in the DISPLAY space X is already in, so the machine runs on screen
  coordinates centred on the boresight for both axes. Our `x`/`y` ARE screen-window coordinates
  (`enemy.ts:165`, `guns.ts:179-181`, `main.ts:196` feeds `y` to the camera), so our y is already
  `PLSTAT+10 - HORIZN`. Applying the bias again lifts every plane 64 units above a gun whose hit
  window is ±32 (shells fire at `y: 0`, `guns.ts:321`) — planes that cannot be shot. Resolved by
  user ruling (2026-07-16): ship the unbiased servo. Affects `sprint/context/context-story-rb4-6.md`
  (AC-2's wording should be corrected to "the Y axis runs the same machine, on display coordinates")
  and `src/core/enemy.ts`. *Found by Dev during implementation.*
- **Gap** (blocking): TEA's AC-2 test `the vertical weave is BIASED by HORIZN` is VACUOUS with
  respect to its own claim — proven by mutation, not by inspection. Re-adding the HORIZN bias leaves
  rb4-6's whole suite GREEN (23/23), because the test asserts only that the weave's midpoint sits
  >HORIZN/2 from zero, and the ROM's one-sided weave (P.INER reverses AWAY from centre, so a plane
  oscillates in the [P.ILIM, P.OLIM] band on its entry side) satisfies that with OR without any bias.
  The only thing that catches the bias is the sibling integration suites (9 failures across
  dead-mechanics-wiring / ground-collision-wiring / cockpit-draw-path). Affects
  `red-baron/tests/core/enemy-machine.test.ts` (the assertion needs to pin the weave's centre-line
  against the boresight — e.g. that a plane's y band straddles the gun window — or be retired as
  the one-sided-weave duplicate it currently is). *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's RED re-seat missed 10 tests in 4 files it never named — the sidecar's
  documented "tightening a shared mechanism breaks sibling FIXTURES" trap. All 10 are genuine
  regressions of this story (verified by stashing the diff: the 4 files pass 46/46 on the clean
  tree), not pre-existing. 9 were caused by the HORIZN double-count and fell out when it was
  removed; the 10th is a deliberate determinism fingerprint (below). Affects
  `red-baron/tests/dead-mechanics-wiring.test.ts`, `tests/ground-collision-wiring.test.ts`,
  `tests/shell/cockpit-draw-path.test.ts`, `tests/core/depth-scale.test.ts`. *Found by Dev during
  implementation.*
- **Improvement** (non-blocking): the ROM ties problem-item-5's entry ramp and AC-4's formation break
  to ONE event, and our `facingAway` does not follow it. `25$` (:2650-2653) clears D4
  (";D4=0 (PLANE FACING AWAY)") and calls `JSR FREPAR` on the SAME frame — the frame the entry
  rotation PLSTAT+14/15 finishes ramping to zero (±0x40/frame, :2634-2648). Our `step()` sets
  `facingAway: true` unconditionally on frame 1 (rb4-13's shipped behaviour) while the bank ramps
  over ENTRY_RAMP_FRAMES — so one ROM bit drives two different timings in our code. Not changed
  here: no test pins `facingAway`'s step timing, and re-timing it would churn `biplaneLOD` render
  output outside this story's ACs. Affects `src/core/enemy.ts` (`facingAway` should flip when
  `entryFrames` reaches 0). *Found by Dev during implementation.*
- **Question** (non-blocking): two ROM nuances in PLNDEL are not modelled and may belong to a
  follow-up. (1) The outer-window reversal is CONDITIONAL: `LDA PLSTAT+19 / CMP I,4 / BCS 10$`
  (";W/I DEPTH NO RETURN TO SCREEN", :2776-2779) skips the return-to-centre once the plane is
  within a depth-MSB of 4 — ours always returns. (2) PLNDEL is gated on PLSTAT+6 D5
  (`AND I,20 / BEQ 2$`, :2743-2746): a plane does NOT weave at all until FORMTN clears D5 after it
  crosses centre or its ^20-frame timer expires (:2360-2361, :3533-3545) — ours weaves from frame 1.
  Affects `src/core/enemy.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the ported servo makes enemy planes UNREACHABLE by the gun at GMLEVL >= 2 —
  the game soft-locks after 5 kills. The Y servo's inner reversal drives |y| away from centre into
  the [P.ILIM, P.OLIM] band, but the player's shell is pinned at `y: 0` for its whole flight
  (`guns.ts:321`; `guns.step` only advances `z`) and `collides` needs the offset inside a rotated
  32x32 box (`guns.ts:390`) — max reach 32*sqrt(2) = 45.25. Measured at HEAD vs `origin/develop`
  (200 planes/level, isolated worktrees): baseline planes are in reach for their whole life at every
  level; at HEAD, GMLEVL 2/3/4 give avg frames-in-reach = 1.0 (the spawn frame only) and 0/200
  planes reachable after the first `step()`. `PLNLVL` (`scoring.ts:34`) reaches GMLEVL 2 at 5 kills,
  so no 6th kill is possible. Affects `src/core/enemy.ts` + `src/core/guns.ts` (the servo runs in a
  space the gun cannot track — see the Reviewer audit deviation). *Found by Reviewer during code review.*
- **Conflict** (blocking): AC-1's "accelerates toward the P.IIDL target by level" is unimplemented,
  and the stated reason for skipping it is factually false. TEA (`enemy-machine.test.ts:40`) and Dev
  (`enemy.ts:122`) both assert the `.2WORD`/`.3WORD` scale is "unverified" with "NO baked artifact";
  the macros are DEFINED at RBARON.MAC:20-27 (`.WORD 2*.A,...` / `.WORD 3*.A,...`) in the same file
  both cite, and corroborated by the longhand 5th entries (`.WORD 80*2`, `2C*3`, `40*3`). The tables
  are fully recoverable: P.ODLX=[288,280,264,248,256], P.IDLX=[24,60,84,108,132],
  P.IIDL=[0,48,72,120,192]. Affects `src/core/enemy.ts` (`weaveSpeedCap`/`WEAVE_SPEED_CAP` are a
  fabricated stand-in for available ROM data) and `tests/core/enemy-machine.test.ts` (the header's
  claim). *Found by Reviewer during code review.*
- **Gap** (blocking): four tests in `tests/core/enemy-machine.test.ts` are mutation-proven vacuous —
  three of them are the AC-3/AC-4 guards. `the vertical weave is BIASED by HORIZN` passes with the
  bias re-added (verified independently by Reviewer AND test-analyzer); `deactivation is COUPLED to
  the returning-attack trigger` passes when the plane NEVER deactivates; `PARALLEL drones hold
  FORMATION with the lead` and `drones eventually BREAK to FREE` both 0-assert when drones are not
  flagged `parallel` at spawn (`offsetsOf` filters on `e.parallel` → empty arrays → `0 === 0`).
  Affects `tests/core/enemy-machine.test.ts`. *Found by Reviewer during code review.*
- **Gap** (blocking): no test drives a stepped plane into the gun — the seam that would have caught
  the finding above. `tests/core/engagement.test.ts:47` hand-builds its target with `y: 0`, so the
  gun is tested against a static fixture and the servo is tested without the gun. Affects
  `tests/core/engagement.test.ts` (a reachability test is needed: spawn → stepWave → guns.step must
  land a hit at every GMLEVL). *Found by Reviewer during code review.*
- **Conflict** (non-blocking): `HORIZN` is now declared TWICE for one ROM equate (RBARON.MAC:456).
  `topology.ts:394` already exports `HORIZN = 0x40`, wired through `scene.ts:49`; `enemy.ts:71` adds
  a second export referenced nowhere but its own doc comment and a value-only test. This is the
  "one identifier, two homes" fragility `enemy.ts`'s own P_MNDP comment says the epic exists to kill.
  Affects `src/core/enemy.ts` (import/re-export from `./topology`, or drop it).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `WO_RTN` is a dead export with a false doc claim — AC-3's "with the WO.RTN
  re-entry delay" is unimplemented. Value is byte-correct (0x10, RBARON.MAC:473) but nothing consumes
  it; its comment claims "Exported for the returning-ace arming wiring" and no such wiring exists.
  main.ts arms on `ACE_ATTACK_FRAMES = 0x0c` (a different equate, PLSTAT+7's threshold at :1078-1080)
  rather than seeding PLSTAT+7 = WO.RTN at :2736. Affects `src/core/enemy.ts` + `src/main.ts`.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `step()`'s docstring contradicts its own body — it states "the depth
  is never floored" while `enemy.ts` does `const depth = flyingPast ? closed : Math.max(closed, P_MNDP)`.
  The floor is deliberate (one transitional frame at P.MNDP) but the ROM destroys the object in the
  SAME frame off the raw sub-floor depth (:2704-2742), so our one-frame lag is an unflagged deviation
  asserted with the same confidence as the byte-pinned claims around it. Affects `src/core/enemy.ts`.
  *Found by Reviewer during code review.*

### TEA (test design, round 2)
- **Conflict** (blocking): the ROM CONTRADICTS rb4-5's motion-object exemption, which is the root of the
  Reviewer's CRITICAL. `main.ts:180-186` claims "motion objects are already in view-relative coords, so
  they take ONLY the bank (eye at the origin) — the UNIV4X/I4YPOS world pan must not drift them off as
  the pilot turns or climbs", and renders enemies with `flightView(attitude, [0,0,0])` (`main.ts:187`).
  RBARON.MAC:2907-2933 says the opposite: `LDA ZX,PLSTAT ;PLANE POSITION` / `SBC ZX,UNIV4X ;- UNIVERSE
  CENTER` / `;ABSOLUTE OF POSITION ON SCREEN`, written back via `ADC ZX,UNIV4X` (:2929-2930) — the stored
  position is WORLD and the screen position is world minus the pilot. The `LDX I,2 … DEX/DEX` loop
  (:2906, :2934-2936) runs BOTH axes, and :90-91 make the two subtrahends explicit: `UNIV4X` (turn pan)
  on X, `I4YPOS = UNIV4X+2 ;PLAYER Y POSITION * 4` (altitude) on Y. rb4-5's own suite already states the
  correct model for world objects ("objects are drawn at (their X − UNIV4X)", `camera-shape.test.ts:10-11`)
  — motion objects were wrongly exempted from it. Affects `src/main.ts` (the exemption + its comment) and
  `src/core/guns.ts` (collision must take the eye). *Found by TEA during test design.*
- **Gap** (blocking): AC-2's wording is wrong for the SECOND time and should be corrected at the source.
  Round 1 proved "biased by HORIZN" reads `SBC I,HORIZN` backwards. Round 2 shows what the ROM actually
  does with the pilot's Y: subtract I4YPOS (:91, :2909-2913). AC-2 should read "the window/servo machine
  runs on BOTH axes, on DISPLAY coordinates — the plane's screen position is its world position minus the
  pilot's (UNIV4X on X, I4YPOS on Y)". Affects `sprint/context/context-story-rb4-6.md`.
  *Found by TEA during test design.*
- **Question** (non-blocking): `WINDOW_X`/`WINDOW_Y = 32` (`guns.ts:143,145`) are INFERRED/playtest, not
  ROM — `guns.ts:33` already flags "WINDOW size — flagged for ROM/MAME ratification" and `guns.ts:123`
  says "Inferred/playtest". The whole CRITICAL is a collision between a ROM-exact weave band and an
  un-ratified gun window, so the real CDSSET/SHCDCK window is worth transcribing before this is tuned
  further. Deliberately NOT pinned by this RED suite (the fix is the display seam, not the window size —
  widening the window would only hide the defect). Affects `src/core/guns.ts`; candidate follow-up story.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the GREEN for this rework has a real blast radius outside `enemy.ts` —
  `guns.step`/`collides` gain the eye, `main.ts` stops passing `[0,0,0]` for enemies, and the enemy
  spawn's coordinate space changes (`enemy.y` spawns at ±40 today while `toEye(INITIAL_FLIGHT)` is
  `[0, 132, 0]`, so world/display is NOT a naive subtraction). Expect sibling re-seats in
  `cockpit-draw-path` (the 52→53 fingerprint will move AGAIN, and must be re-read only after the seam
  lands), `engagement`, `dead-mechanics-wiring`, `ground-collision-wiring`. Affects those four files.
  *Found by TEA during test design.*

### Dev (implementation, round 2)
- **Gap** (blocking): the servo still decides its zone from the STORED position; the ROM's P.WINDW
  decides it from the DISPLAY position (`LDA ZX,PLSTAT+8 ;X DISPLAY`, :2867; the block layout at
  :266-297 lists +0/+2 "PLANE POSITION" and +8/+A "DISPLAY POSITION" as separate fields). The
  faithful version cannot ship alone: it needs PLONSN (:2877-2937), the depth-scaled PFROTN-rotated
  clamp that drags a plane's world position to keep it on screen. Measured without PLONSN, an
  eye-aware servo re-creates the soft-lock at GMLEVL 4 (avg 0.0 frames in reach vs the shipped 11.6),
  because P.IIDL[4]/4 = 48 units/frame outruns the pilot's 40. A successor story should port PLONSN,
  move the servo onto `displayPos`, and **re-write AC-R3 to drive the eye through `step`/`stepWave`** —
  as written it drives `step(e, lvl)` eye-free, so it cannot see this seam at all. Affects
  `src/core/enemy.ts`, `src/core/waves.ts`, `tests/core/display-space.test.ts`. *Found by Dev during
  implementation.*
- **Gap** (non-blocking): `spawn`'s new STPLNE altitude is NOT behaviourally guarded — mutation-proven.
  Reverting it to round 1's `±40` screen offset leaves all 51 story tests GREEN, because `step`'s
  UPDPLN clamp lifts Y into [128, 320] on the first frame regardless. The clamp is the load-bearing
  half (dropping it → 4 RED); the spawn only removes a one-frame teleport and makes the field's
  documented meaning true at frame 0. A spawn-altitude test would pin it (e.g. `spawn().y` inside
  [PFPLOW, PFPHI]×ALT_TO_Y for every seed). Affects `tests/core/enemy-machine.test.ts`. *Found by Dev
  during implementation.*
- **Gap** (non-blocking): `STPLNE` seeds the plane's X and Y DELTAS from `MAXDEL` (:2298-2309:
  `STY PLSTAT+0E / STX PLSTAT+0D`), signed by the player's own PLDELX; we spawn with `deltaX: 0,
  deltaY: 0`. That is rb2-4's shipped behaviour, no test pins it, and it changes which zone a plane
  coasts toward on its first frames. Affects `src/core/enemy.ts` (`spawn`). *Found by Dev during
  implementation.*
- **Gap** (non-blocking): the returning ace still attacks REPEATEDLY; the ROM resolves the evade check
  ONCE per fly-past (`CMP I,0C / BNE 25$`, :1078-1080 — only on the single frame PLSTAT+7 reads 0x0C),
  then counts to 0 and re-enables the slot for a new plane. rb4-6 wires WO.RTN as the counter's seed
  (AC-3's delay) but leaves the repeat. Affects `src/main.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `WO_RTN`'s guard is an IMPORT-BINDING source check, so it proves the
  export is referenced, not that the delay works — mutation-proven: seeding the ace from
  `ACE_ATTACK_FRAMES` again (with the import left in place) keeps all 51 green; only deleting the
  import goes RED. A behavioural pin (the pass resolves WO_RTN − ACE_ATTACK_FRAMES frames after the
  fly-past) would close it. TEA's note already concedes the guard reads source "because 'is it
  referenced outside its own declaration?' has no runtime seam" — but the wiring does. Affects
  `tests/core/enemy-machine.test.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): two `guns.step` mock passthroughs silently dropped the new eye
  argument (`cockpit-draw-path`, `prod-build-parity`), so the recorded cockpit collided from the
  origin and landed NO kills all run — caught only because `WRECK TRUTH` asserts a kill must land.
  The class is general: a `vi.mock` wrapper that re-declares a signature is a COPY of it and cannot
  track the real one. Both now forward `...args`-equivalently and record the eye. Worth a lint or a
  house pattern. Affects `tests/shell/*.test.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-R3's bar is >10 and GMLEVL 4 measures 11.6 — a real but thin margin
  (GMLEVL 0/1/2/3 = 599/124/28/22). That is the ROM's own difficulty ramp, not slack in the fix, but
  it means an innocuous future change could flip level 4 red. That is arguably the guard doing its
  job; flagged so nobody re-tunes the bar instead of reading it. Affects
  `tests/core/display-space.test.ts`. *Found by Dev during implementation.*

### Reviewer (code review, round 2)
- **Gap** (blocking): AC-R3 — the story's headline soft-lock guard — never exercises the production
  hit-test. It reimplements "in reach" as `Math.hypot(x, y) <= 32*sqrt(2)` (the collision box's
  circumscribed circle) instead of calling `guns.collides`/`guns.step`. Mutation-proven independently
  by test-analyzer AND contradicting Dev's mutation table: reverting `collides` to ignore its eye —
  round 1's exact defect, the regression the suite's own header names — leaves all 6 AC-R3 tests
  GREEN (only AC-R2's 2 go RED, so the table's "3 RED" overstates the guard). The circle also
  systematically overestimates the rotated 32×32 box: re-measured through the REAL `collides`
  (Reviewer probe, same chase rig), frames-in-reach per life = 597.3/112.5/24.1/20.2/**10.8** vs
  hypot's 599.2/124.3/28.2/22.1/11.6 — so GMLEVL 4 clears the >10 bar by 0.8 frames, not 1.6, and a
  future `WINDOW_X/Y` change moves the real margin while AC-R3 stays green. THE PRODUCTION FIX IS
  REAL (all levels clear through the real gun); only its guard is defective. Affects
  `tests/core/display-space.test.ts` (route the reach check through `guns.collides` with a boresight
  shell at the plane's depth — or `guns.step` — inside the chase loop; prefer `stepWave` over `step`
  so the formation path rides the same guard). *Found by Reviewer during code review (round 2).*
- **Gap** (blocking): `windowServo`'s OUTER and INNER zone targets are unguarded at the point of use.
  `target = iidl || 48` — the exact 0-is-valid trap `P_IIDL`'s own doc comment warns about — and
  `target = odlx * 2` BOTH leave the whole 1069-test suite green (test-analyzer, mutation-proven).
  Only the middle band (P_IDLX) has a convergence test; the byte-pins catch table corruption, not
  consumption. Affects `tests/core/enemy-machine.test.ts` (clone the P_IDLX convergence test for the
  outer zone at the wall and the inner zone at GMLEVL 0 — the latter pins the dead stop end-to-end).
  *Found by Reviewer during code review (round 2).*
- **Gap** (non-blocking): the AC-R3 ramp-coupling test is TAUTOLOGICAL — it asserts `PLNLVL[5] === 2`
  against its own LOCAL literal while `scoring.ts:34` exports the real table. Reviewer mutation: real
  `PLNLVL[5]` 2 → 1, all 11 display-space tests stay green. A literal compared to itself cannot fail.
  Affects `tests/core/display-space.test.ts:259-266` (`import { PLNLVL } from '../../src/core/scoring'`).
  *Found by Reviewer during code review (round 2).*
- **Gap** (non-blocking): `spawnAltitude` (the STPLNE transcription) and the `WO_RTN` wiring are
  guarded only by scenery — both self-reported by Dev, both independently confirmed by test-analyzer:
  reverting the spawn to round 1's ±40 offset leaves 1069 green; re-seeding the ace from
  `ACE_ATTACK_FRAMES` with the import kept alive leaves the "actually WIRED" regex green. Affects
  `tests/core/enemy-machine.test.ts` (a seeded-Rng band+byte pin for the spawn; a behavioural delay
  pin for WO_RTN: armed ace resolves nothing for WO_RTN−ACE_ATTACK_FRAMES−1 frames, then resolves).
  *Found by Reviewer during code review (round 2).*
- **Conflict** (non-blocking): `spawn` places X about the WORLD ORIGIN; the ROM's STPLNE places it
  about the pilot's pan (`ADC UNIV4X`, :2291-2297 — quoted in enemy.ts's own spawn docs). Our
  `flight.heading` is UNBOUNDED (`flight.ts:208`, no clamp or wrap), so a pilot who drifts far and
  then clears a wave meets the next spawn arbitrarily far off-boresight. Newly LIVE in this diff
  (pre-seam the gun ignored the eye, so pan never affected hittability); recoverable by turning back,
  so not a soft-lock, and invisible to AC-R3 (which starts at INITIAL_FLIGHT). Belongs to the PLONSN
  successor story — the fix (an eye-aware or UNIV4X-relative spawn) shares its seam. Affects
  `src/core/enemy.ts` (`spawn`), `src/core/flight.ts`. *Found by Reviewer during code review (round 2).*
- **Improvement** (non-blocking): `clamp()` propagates NaN (`Math.max/min` semantics) — unreachable
  today (every Enemy producer is finite; `levelIndex` sanitizes the one external input; verified by
  security's full producer trace) but the altitude clamp's totality is a stated expectation. One-line
  hardening. Affects `src/core/enemy.ts:346`. *Found by Reviewer during code review (round 2).*

### Reviewer (code review, round 3)
- **Improvement** (non-blocking): the NaN-safe `clamp` guards POSITIONS only — `windowServo`'s
  returned velocity is assigned to `deltaX`/`deltaY` without passing through it, so a hand-built
  NaN delta persists indefinitely (NaN fails every comparison, so the servo never snaps it back)
  and poisons the render-facing `bank` via `biplaneBank(sx.vel)`. Same latent class as the round-2
  clamp finding: NO production producer of a NaN delta exists (spawn seeds 0; finite-in→finite-out
  arithmetic). The actionable defect is the fix's COMMENT, which claims to be "the total answer for
  a degenerate hand-built fixture" — true for x/y, false for deltas. Independently found and
  10-frame-verified by test-analyzer. Affects `src/core/enemy.ts:346-349` (tighten the comment to
  "positions"; optionally route vel through the same guard or add a delta-NaN pin shaped like the
  x/y totality test). *Found by Reviewer during code review (round 3).*
- **Improvement** (non-blocking): AC-R3's boresight shell sits at exactly `depthToShellZ(depth)`,
  so the collision z-gate is satisfied by construction and a WINDOW_Z regression is invisible to
  this specific guard (verified: WINDOW_Z 1 → 0.00001 leaves all 11 tests green; ~30 other suite
  tests do catch it). The test's comment already says it measures X/Y reach — add one line naming
  the z-vacuity so a future reader doesn't assume Z coverage. Affects
  `tests/core/display-space.test.ts` (comment only). *Found by Reviewer during code review (round 3).*
- **Improvement** (non-blocking): the WO.RTN delay test's comment says round 2 "proved it green with
  every aceCountdown = WO_RTN site reverted" — true of the import-regex guard specifically; the
  pre-existing BEFLAG-freebie test in the same file DID go red under that mutation (test-analyzer
  re-verified at 587a1cc). Name the regex test in the comment so the round-2 suite isn't
  mischaracterized. Affects `tests/ace-wiring.test.ts` (comment only). *Found by Reviewer during
  code review (round 3).*

### TEA (test design, round 3)
- **Gap** (non-blocking): `P_ODLX` is behaviourally INERT on the X axis in the shipped machine — the
  ±P_OLIM position clamp makes the outer zone a one-frame wall event (any inward delta puts |x| < olim
  next frame, before the servo can approach the target) and spawn deltas are zero-seeded, so no X
  trajectory ever depends on the outer target's magnitude. Derived while designing the round-3
  convergence pin; the Reviewer's prescribed "outer zone at the wall" X-axis test is unwritable — it
  would have been permanently-green scenery. The consumption pin lives on the Y axis instead (GMLEVL 0,
  where the UPDPLN altitude floor holds the plane inside the outer zone and ΔY provably settles at
  −P_ODLX[0]). P_ODLX becomes X-observable only when the PLONSN successor removes the position clamp
  and/or ports STPLNE's MAXDEL entry deltas — fold this into that story's scope. Affects
  `src/core/enemy.ts` (successor), `tests/core/enemy-machine.test.ts` (the Y-axis pin carries it today).
  *Found by TEA during test design (round 3).*
- No other upstream findings during test design (round 3).

## Impact Summary

*(Rebuilt manually by SM — the auto-writer's regex missed every word-wrapped finding and wrote
"No upstream effects noted" over a session with 30+ findings across three rounds. Known bug.)*

**Upstream Effects:**
- **A PLONSN successor story is REQUIRED** (blocking finding, Dev round 2): the servo still decides
  its zone from the STORED position; the ROM decides from DISPLAY, bounded by PLONSN (:2877-2937),
  which we do not model. The successor ports PLONSN, moves the servo onto `displayPos`, and MUST
  re-write AC-R3 to drive the eye through `step`/`stepWave`. It inherits four logged satellites:
  the spawn-X-about-UNIV4X gap (planes spawn about world origin while `heading` is unbounded —
  Reviewer round 2), P_ODLX's X-axis behavioural inertness under the ±olim clamp (TEA round 3),
  the Y-pins-at-a-band-edge behaviour (Reviewer audit annotation — sustained vertical cat-and-mouse
  needs the display-space servo), and STPLNE's un-ported MAXDEL entry-delta seeding (Dev round 2).
- **Returning-ace shape** (Dev round 2, non-blocking): WO.RTN is now wired (cadence honestly moved
  12 → 4 frames, a real difficulty change), but the ROM resolves the evade check ONCE per fly-past
  where ours repeats; the once-per-pass port is a successor candidate, and the round-3 ace-wiring
  test pins the shipped cadence with a conscious-re-seat instruction.
- **Gun window ratification** (TEA round 2, non-blocking): WINDOW_X/Y = 32 (and WINDOW_Z) are
  inferred/playtest; the real CDSSET/SHCDCK window is worth transcribing — AC-R3's GMLEVL-4 margin
  is 10.8 vs a bar of 10 THROUGH THE REAL GUN, so a window change will move that margin; the guard
  will fail loudly and must not be re-tuned.
- **Story-context correction** (TEA rounds 1-2): AC-2's "biased by HORIZN" wording in
  `sprint/context/context-story-rb4-6.md` is wrong twice over — corrected reading: "the servo runs
  on DISPLAY coordinates; the plane's screen position is world minus the pilot (UNIV4X on X,
  I4YPOS on Y)". Fix at source if the context is reused.
- **rb4-15 (blimp)** deletes `worldBlimpTarget` in main.ts when the airship gets real world
  coordinates (Dev round 2 deviation note).
- **Comment follow-ups** (Reviewer round 3, all non-blocking, can ride the PLONSN story): the
  NaN-clamp comment overclaims totality (deltas flow unclamped — latent, production-unreachable);
  AC-R3's z-gate vacuity deserves one disclosing line; the ace-wiring comment should name the
  specific regex guard it indicts.

**Blocking:** None for THIS story's merge — all blocking findings from rounds 1-2 are closed and
independently verified (round-3 review APPROVED). The PLONSN successor is blocking only in the
sense that the display-space seam remains half-ported until it lands.

### Deviation Justifications

18 deviations

- **AC-5 (blimp) split out of rb4-6**
  - Rationale: the blimp rewrite flips ~25 tests across 5 files (module-import collection risk) vs 4 clean for the enemy stepper, and a correct re-seat depends on the Dev's blimp-API decisions.
  - Severity: major
  - Forward impact: SM must create the new blimp story; its RED is written and ready.
- **P.IIDL / P.ODLX / P.IDLX magnitudes not byte-pinned**
  - Rationale: the `.2WORD`/`.3WORD` macros carry an unverified ×2/×3 scale with no baked artifact to arbitrate — byte-pinning risks shipping a fabricated constant, the exact trap the epic exists to kill.
  - Severity: minor
  - Forward impact: Reviewer diff-traces the Dev's magnitudes against the ROM.
- **Fly-past destruction via `active: false`, not a null step() return**
  - Rationale: `active:false` maps to the cleared PLSTAT+6/D7 and keeps step() total (no null), minimizing ripple; the arming (GMEND0/beginPass) already lives in returning-ace.ts + main.ts and is integration-level.
  - Severity: minor
  - Forward impact: main.ts filters deactivated planes (or uses stepWave) and arms the returning pass from a just-deactivated plane's side.
- **Re-seated 4 sibling tests to the rb4-6 machine**
  - Rationale: these encoded the OLD machine and would flip red under the rewrite, blocking Dev; re-seated preserving each test's orthogonal intent (liveness, never-behind-eye, formation offsets).
  - Severity: minor
  - Forward impact: none — the re-seats pass under both old and new where they are guards, and are RED where the old behaviour is genuinely contradicted (enemy L580, waves L213).
- **The Y-axis window servo runs UNBIASED — HORIZN is not added to our `y`**
  - Rationale: `SBC I,HORIZN` (:2750) converts the ROM's stored Y into the DISPLAY space its X axis
  - Severity: major
  - Forward impact: AC-2's wording in context-story-rb4-6.md is wrong and should be corrected;
- **The drone formation breaks on the LEAD's entry-rotation completion, not a closing distance**
  - Rationale: `FRDRNE` (:3511-3528) has NO distance or timer test — it frees a parallel drone
  - Severity: minor
  - Forward impact: none — it removes an invented constant and ties AC-4 to problem-item-5's ramp,
- **Re-read the cockpit determinism fingerprint (TOTAL_LIVE_SHELLS 52 → 53)**
  - Rationale: this is the guard's own documented instruction. The sim legitimately changed (planes
  - Severity: minor
  - Forward impact: none — the anti-vacuity guard is intact and still fails on a drift toward zero.
- **Registered DRINZ in the depth registry rather than renaming it**
  - Rationale: DRINZ is a ROM NAME with a citation (:466, :2369-2370). Renaming it to
  - Severity: minor
  - Forward impact: none.
- **Removed two dead test helpers left by RED (`mean`, `crossings`)**
  - Rationale: the build must pass; neither helper had a caller. `crossings` is explained rather than
  - Severity: minor
  - Forward impact: none.
- **The servo reads the STORED position, not the DISPLAY position — the ROM reads DISPLAY**
  - Rationale: this is the ROM's shape and I did not take TEA's word for it — P.WINDW reads PLSTAT+8
  - Severity: major
  - Forward impact: a successor story should port PLONSN and move the servo onto `displayPos`, and
- **`enemy.y` is an ABSOLUTE ALTITUDE; the Y position clamp is UPDPLN's band, not ±P_OLIM**
  - Rationale: the ROM's asymmetry is real and load-bearing, not an inconsistency. STPLNE writes X as
  - Severity: major
  - Forward impact: `enemy.y` no longer means what it did — anything reading it for a SCREEN position
- **The entry ramp is a plain countdown — decoupled from ΔX**
  - Rationale: the clause was round 1's invention and the ROM tables falsified it. UPDMOB ramps
  - Severity: minor
  - Forward impact: none — it removes an invented coupling.
- **WO.RTN wired as the SEED of the counter ACE_ATTACK_FRAMES resolves on (ace cadence 12 → 4)**
  - Rationale: `LDA I,WO.RTN / STA PLSTAT+7 ;DISABLE PLANE FOR WO.RTN FRAMES` (:2736-2737) seeds the
  - Severity: minor
  - Forward impact: the ROM fires the evade check ONCE per fly-past (`BNE 25$` — only at exactly
- **Wrecks and the airship stay DISPLAY-space; converted at their boundaries**
  - Rationale: routing the enemy through `displayPos` means the cockpit DRAWS through the identical
  - Severity: minor
  - Forward impact: rb4-15 deletes `worldBlimpTarget` when the blimp gets real world coordinates.
- **Re-seated 4 sibling tests + 2 stale mock passthroughs**
  - Rationale: the three GMLEVL-0 tests assert a behaviour the ROM does not have — P.IIDL[0] = 0 is a
  - Severity: minor
  - Forward impact: `TARGET TRUTH` is now a strictly stronger guard — it measures the drawn position
- **Re-read the cockpit determinism fingerprint — number unchanged (53), stated CAUSE corrected**
  - Rationale: the Reviewer's objection was to the REASON, not the digit: that sentence described a
  - Severity: minor
  - Forward impact: none — the guard still fails on a drift toward zero.
- **The OUTER-target convergence pin runs on the Y axis, not the X axis the Reviewer prescribed**
  - Rationale: derived before writing — on X the ±P_OLIM position clamp makes the outer zone a
  - Severity: minor
  - Forward impact: the same test documents the Y-pins-at-a-band-edge behaviour the Reviewer's audit
- **The WO.RTN pin also freezes the SHIPPED repeat cadence, a logged ROM divergence**
  - Rationale: pinning only the first delay leaves the reseed free to drift silently; the repeat is a
  - Severity: minor
  - Forward impact: the once-per-fly-past successor re-seats one assertion, on purpose.

## Design Deviations

### TEA (test design)
- **AC-5 (blimp) split out of rb4-6**
  - Spec source: context-story-rb4-6.md, AC-5
  - Spec text: "The blimp is an APPROACHING airship (Z from 0x1000, closing 0x80/frame), gated behind FOUR planes ... firing 1-in-4 calc frames ... only at GMLEVL >= 2"
  - Implementation: AC-5 moved to a new story (user ruling). rb4-6 ships AC-1..4 + item 5; the blimp RED suite + re-seat map are seeded for the new story.
  - Rationale: the blimp rewrite flips ~25 tests across 5 files (module-import collection risk) vs 4 clean for the enemy stepper, and a correct re-seat depends on the Dev's blimp-API decisions.
  - Severity: major
  - Forward impact: SM must create the new blimp story; its RED is written and ready.
- **P.IIDL / P.ODLX / P.IDLX magnitudes not byte-pinned**
  - Spec source: context-story-rb4-6.md, AC-1
  - Spec text: "accelerates toward the P.IIDL target by level"
  - Implementation: the inner-window reversal BEHAVIOUR is pinned (heads away from centre, per level, deterministic); exact per-level target magnitudes are not asserted to the byte.
  - Rationale: the `.2WORD`/`.3WORD` macros carry an unverified ×2/×3 scale with no baked artifact to arbitrate — byte-pinning risks shipping a fabricated constant, the exact trap the epic exists to kill.
  - Severity: minor
  - Forward impact: Reviewer diff-traces the Dev's magnitudes against the ROM.
- **Fly-past destruction via `active: false`, not a null step() return**
  - Spec source: context-story-rb4-6.md, AC-3
  - Spec text: "A plane that crosses P.MNDP ... is DESTROYED as an object and arms the returning attack (GMEND0), with the WO.RTN re-entry delay"
  - Implementation: step() deactivates the plane (active → false; the ROM's `STA PLSTAT+6 ;CLR PLANE`) on crossing P.MNDP; a new stepWave() drops deactivated planes. WO.RTN is pinned as a constant (WO_RTN=0x10), not an observable frame-count in the unit tests.
  - Rationale: `active:false` maps to the cleared PLSTAT+6/D7 and keeps step() total (no null), minimizing ripple; the arming (GMEND0/beginPass) already lives in returning-ace.ts + main.ts and is integration-level.
  - Severity: minor
  - Forward impact: main.ts filters deactivated planes (or uses stepWave) and arms the returning pass from a just-deactivated plane's side.
- **Re-seated 4 sibling tests to the rb4-6 machine**
  - Spec source: tests/core/enemy.test.ts (L306, L325, L372, L580), tests/core/waves.test.ts (L213)
  - Spec text: old assertions "weaves ACROSS screen centre", "P.MNDP is a floor", "clamps at a stable positive floor", "sharing the lead depth"
  - Implementation: cross-centre → liveness (the one-sided weave is pinned deterministically in enemy-machine.test.ts); beeline range→maxAbs (robust to the one-sided weave); floor→tunnel-guard (active depth > 0) + fly-past-ends; drone depth === lead → drone depth > lead (DRINZ).
  - Rationale: these encoded the OLD machine and would flip red under the rewrite, blocking Dev; re-seated preserving each test's orthogonal intent (liveness, never-behind-eye, formation offsets).
  - Severity: minor
  - Forward impact: none — the re-seats pass under both old and new where they are guards, and are RED where the old behaviour is genuinely contradicted (enemy L580, waves L213).

### Dev (implementation)
- **The Y-axis window servo runs UNBIASED — HORIZN is not added to our `y`**
  - Spec source: context-story-rb4-6.md, AC-2
  - Spec text: "The window/servo machine runs on BOTH axes — enemy planes move vertically as well as
    laterally, biased by HORIZN."
  - Implementation: one unbiased `windowServo(pos, vel, olim, ilim)` serves both axes (the ROM
    re-enters the one P.WINDW block per axis, :2865-2873). HORIZN stays exported and byte-pinned at
    0x40 as the documented provenance of the offset our coordinate origin has already absorbed.
  - Rationale: `SBC I,HORIZN` (:2750) converts the ROM's stored Y into the DISPLAY space its X axis
    is already in (`;X DISPLAY`, :2867) — it removes a displacement, it does not add one. Our `x`/`y`
    are already screen-window/display coordinates, so re-applying it double-counts: planes fly 64
    units above a ±32 gun window and become unshootable (9 sibling tests RED, kills and wrecks stop).
    Verified against the citable quarry (md5 497db93e…). Put to the user as an explicit ruling
    (2026-07-16) rather than decided by Dev: "Unbias the Y servo" selected.
  - Severity: major
  - Forward impact: AC-2's wording in context-story-rb4-6.md is wrong and should be corrected;
    TEA's `BIASED by HORIZN` test does not pin its claim (mutation-proven — see Delivery Findings)
    and needs re-writing or retiring. rb4-5's AC ("HORIZN is added to the projected Y of EVERY
    object (POSITH)") is a DIFFERENT seam — the projection, not the enemy servo — and is untouched.
- **The drone formation breaks on the LEAD's entry-rotation completion, not a closing distance**
  - Spec source: context-story-rb4-6.md, AC-4; tests/core/enemy-machine.test.ts (FRDRNE :3511-3528)
  - Spec text: "Drones implement the PARALLEL→FREE two-phase behaviour and spawn at DRINZ = 0x1600"
  - Implementation: `stepWave` frees parallel drones when the lead's `entryFrames` reaches 0 (or when
    no live lead remains). An earlier draft of this story proxied the break as a fabricated
    `FRDRNE_BREAK = 0x30` closing distance from DRINZ; that constant is deleted.
  - Rationale: `FRDRNE` (:3511-3528) has NO distance or timer test — it frees a parallel drone
    unconditionally and resolves its offset to absolute. The break is decided by WHEN `FREPAR` is
    called, and the ROM calls it in exactly two places, both keyed on the LEAD: :2652-2653 (the frame
    the lead's entry rotation ramps to zero, immediately after `AND I,0EF ;D4=0`) and :5587 (a shell
    kills the lead). Inventing a depth constant is precisely the failure rb4-1 exists to prevent, and
    it also tripped depth-scale.test.ts's unannounced-constant sweep.
  - Severity: minor
  - Forward impact: none — it removes an invented constant and ties AC-4 to problem-item-5's ramp,
    which is what the ROM does. Both directions mutation-proven RED (always-free → the FORMATION
    test; never-free → the BREAK-to-FREE test).
- **Re-read the cockpit determinism fingerprint (TOTAL_LIVE_SHELLS 52 → 53)**
  - Spec source: tests/shell/cockpit-draw-path.test.ts:526-533
  - Spec text: "If a future change moves them, this fails and someone re-reads the numbers on purpose
    — which is exactly the behaviour we want, and the opposite of a threshold quietly sliding to zero."
  - Implementation: pinned to the re-measured 53, with the reason recorded at the constant.
  - Rationale: this is the guard's own documented instruction. The sim legitimately changed (planes
    now weave on Y), the move is +1 rather than a collapse, and the count is stable across runs
    (verified 3×) — so it remains a property of the code, not of the weather.
  - Severity: minor
  - Forward impact: none — the anti-vacuity guard is intact and still fails on a drift toward zero.
- **Registered DRINZ in the depth registry rather than renaming it**
  - Spec source: tests/core/depth-scale.test.ts:630-633
  - Spec text: "Either rename it (…_DEPTH / …_DISTANCE / …_RANGE) so the sweep catches it, or add it
    to the registry with a justification."
  - Implementation: took the registry branch — `DRINZ` added alongside `P_INDP`/`P_MNDP` with a
    citation. Separately, a trailing comment's shouted "PAST" was lower-cased: the sweep reads
    ALL-CAPS tokens on any line mentioning depth, so prose tripped it (the sidecar's `window.` trap).
  - Rationale: DRINZ is a ROM NAME with a citation (:466, :2369-2370). Renaming it to
    DRONE_SPAWN_DEPTH to satisfy a regex would trade provenance for spelling — the registry branch is
    what the guard offers for exactly this case.
  - Severity: minor
  - Forward impact: none.
- **Removed two dead test helpers left by RED (`mean`, `crossings`)**
  - Spec source: tests/core/enemy-machine.test.ts:153, tests/core/enemy.test.ts:163
  - Spec text: n/a — both were unused declarations that failed `tsc --noEmit` (TS6133) and so blocked
    the build gate.
  - Implementation: deleted `mean`; deleted `crossings` and left a note recording why its last caller
    went away (the ROM's inner reversal means a plane never crosses centre, so L306 became a liveness
    check).
  - Rationale: the build must pass; neither helper had a caller. `crossings` is explained rather than
    silently dropped so the next reader knows the behaviour changed, not just the code.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation, round 2)

- **The servo reads the STORED position, not the DISPLAY position — the ROM reads DISPLAY**
  - Spec source: Reviewer Assessment (CRITICAL fix direction, USER RULING 2026-07-16);
    tests/core/display-space.test.ts AC-R3
  - Spec text: "The ROM's servo runs on DISPLAY coords that TRACK the player's view (PLSTAT+8
    ';X SCREEN POSITION' :3157); ours are static world coords the camera merely looks at."
  - Implementation: `displayPos`/`collides`/the render seam all moved to display space as ruled, but
    `windowServo` itself still decides its zone from the plane's STORED (world) position. `step(enemy,
    level)` and `stepWave(enemies, level)` keep their eye-free signatures.
  - Rationale: this is the ROM's shape and I did not take TEA's word for it — P.WINDW reads PLSTAT+8
    (";X DISPLAY", :2867) and PLSTAT+10−HORIZN (:2749-2752), and the block layout at :266-297 lists
    +0/+2 "PLANE POSITION" and +8/+A "DISPLAY POSITION" as distinct fields. So an eye-aware servo IS
    more faithful. I BUILT it and MEASURED it before rejecting it: it re-creates the soft-lock at
    GMLEVL 4 (avg 0.0 frames in reach vs the shipped 11.6), because the ROM bounds the display
    position with PLONSN — a depth-scaled, PFROTN-rotated on-screen clamp (:2877-2937) that drags the
    plane's world position to keep it on screen. Without PLONSN the eye-aware servo lets the plane
    outrun the stick (P.IIDL[4]/4 = 48 units/frame vs the pilot's 40) and never return. PLONSN is a
    whole mechanism outside this story's ACs. Decisively: **AC-R3, the guard that is this story's
    entire deliverable, drives `step(e, lvl)` with no eye.** Shipping an eye-aware servo would mean
    shipping the game's real behaviour with ZERO coverage — which is precisely how round 1 shipped a
    soft-lock past 1051 green tests. The guard must cover what the game does.
  - Severity: major
  - Forward impact: a successor story should port PLONSN and move the servo onto `displayPos`, and
    must re-write AC-R3 to drive the eye through `step`/`stepWave` — the measurement above is the
    starting evidence. Logged as a blocking Delivery Finding.

- **`enemy.y` is an ABSOLUTE ALTITUDE; the Y position clamp is UPDPLN's band, not ±P_OLIM**
  - Spec source: TEA Assessment round 2, "Deliberately left to Dev: the world/display algebra"
  - Spec text: "where the spawn sits in world space, and where HORIZN (:2750) lands in the
    conversion, is yours to derive."
  - Implementation: `enemy.y` is the plane's altitude in `toEye`'s units; `spawn` seeds it from
    STPLNE's random-altitude bit-twiddle (:2310-2316) instead of a ±40 screen offset; `step` clamps
    it to [PFPLOW, PFPHI]×ALT_TO_Y = [128, 320] per UPDPLN (:2595-2611) rather than to ±P_OLIM. X
    keeps the ±P_OLIM clamp. HORIZN lands in the PROJECTION (scene.ts), where it already was.
  - Rationale: the ROM's asymmetry is real and load-bearing, not an inconsistency. STPLNE writes X as
    `offset + UNIV4X` (:2291-2297) but Y as a bare absolute (:2313-2316), and UPDPLN clamps only Y.
    That band [128, 320] sits inside the pilot's own reachable eye range [8, 384] — which is exactly
    what makes every GMLEVL winnable with an eye-free servo. Without it, Y weaves about the world
    origin and a plane that picks the negative side sits at −288 under an eye that cannot descend
    below +8: round 1's soft-lock in different clothes. Mutation-proven: dropping the band → 4 RED.
  - Severity: major
  - Forward impact: `enemy.y` no longer means what it did — anything reading it for a SCREEN position
    must go through `displayPos`. All in-tree readers are converted.

- **The entry ramp is a plain countdown — decoupled from ΔX**
  - Spec source: tests/core/enemy.test.ts:500 (the round-1 fixture); problem item 5
  - Spec text: round 1's comment — "It settles the instant ΔX reverses through 0".
  - Implementation: dropped the `sx.vel !== 0` clause; `entryFrames` counts down over
    ENTRY_RAMP_FRAMES regardless of the delta. Re-seated `enemy.test.ts:500`'s fixture to
    `entryFrames: 0`.
  - Rationale: the clause was round 1's invention and the ROM tables falsified it. UPDMOB ramps
    PLSTAT+14/15 toward zero by a fixed ±0x40/frame and clears D4 when the ROTATION reaches zero
    (:2634-2652) — it never consults the delta. And the coupling was actively wrong once P.IIDL[0]=0
    landed: a GMLEVL-0 plane legitimately DEAD-STOPS in the inner window, which round 1's condition
    read as "the entry ramp finished", so `stepWave` fired FREPAR and the drones broke formation on
    frame 4 (AC-4 RED). One signal doing two jobs. Mutation-proven both ways: re-adding the clause →
    1 RED (FORMATION); the fixture re-seat preserves the ΔX=0 → bank=0 intent exactly.
  - Severity: minor
  - Forward impact: none — it removes an invented coupling.

- **WO.RTN wired as the SEED of the counter ACE_ATTACK_FRAMES resolves on (ace cadence 12 → 4)**
  - Spec source: context-story-rb4-6.md, AC-3; Reviewer finding "[MEDIUM] WO_RTN is a dead export"
  - Spec text: "arms the returning attack (GMEND0), with the WO.RTN re-entry delay"
  - Implementation: `aceCountdown = WO_RTN` (0x10) on arming; the pass resolves at
    `aceCountdown <= ACE_ATTACK_FRAMES` (0x0C) and re-seeds. The delay is WO_RTN − ACE_ATTACK_FRAMES
    = 4 frames; the repeat cadence therefore moves 12 → 4 frames.
  - Rationale: `LDA I,WO.RTN / STA PLSTAT+7 ;DISABLE PLANE FOR WO.RTN FRAMES` (:2736-2737) seeds the
    counter; `LDA PLSTAT+7 / CMP I,0C / BNE 25$` (:1078-1080) resolves the evade check the one frame
    it reads 0x0C. They are ONE mechanism, and rb4-4's reading of 0x0C as a standalone "cadence" left
    WO.RTN with nothing to do. The cadence change is a real behaviour change I verified rather than
    assumed: the full suite is green, including dead-mechanics-wiring / ground-collision-wiring.
  - Severity: minor
  - Forward impact: the ROM fires the evade check ONCE per fly-past (`BNE 25$` — only at exactly
    0x0C), then counts to 0 and re-enables the slot. Ours still repeats. Logged as a Delivery Finding.

- **Wrecks and the airship stay DISPLAY-space; converted at their boundaries**
  - Spec source: TEA Assessment round 2 (the four predicted sibling re-seats)
  - Spec text: "`main.ts` stops rendering enemies at eye `[0,0,0]`"
  - Implementation: enemies are drawn via `displayPos` through the existing origin-eye `projView`
    rather than by re-pointing `flightView` — algebraically identical for a translation eye, and it
    leaves tracers/wrecks/airship untouched. `explode` receives the plane already converted; the
    airship is LIFTED to world at the collision seam (`worldBlimpTarget`) so one pass serves both.
  - Rationale: routing the enemy through `displayPos` means the cockpit DRAWS through the identical
    function the gun KILLS through — the seam is closed by construction, which is the lesson guns.ts's
    own `shellDepth` comment records ("a copy cannot track anything"). Re-pointing `flightView` would
    have dragged the airship (rb4-15's story) and the tracers into the change for no gain. The
    airship's lift is the ROM's own conversion (`ADC UNIV4X`, :2291-2297/:2223/:2500), and the round
    trip makes its behaviour bit-identical to what shipped.
  - Severity: minor
  - Forward impact: rb4-15 deletes `worldBlimpTarget` when the blimp gets real world coordinates.

- **Re-seated 4 sibling tests + 2 stale mock passthroughs**
  - Spec source: tests/core/enemy.test.ts (L295, L307, L325, L500); tests/shell/cockpit-draw-path.test.ts;
    tests/shell/prod-build-parity.test.ts
  - Spec text: three tests drove GMLEVL 0 asserting "ΔX takes both signs" / "still swings out past
    P.ILIM"; the two mocks declared `step: (guns, targets) => actual.step(guns, targets)`.
  - Implementation: the three weave tests now drive GMLEVL 2 (with the reason recorded in place); the
    ΔX=0 fixture gains `entryFrames: 0`; both `guns.step` mocks forward and record the eye;
    `ndcOfTarget` measures through `displayPos` at the eye the gun collided from; the wreck probe uses
    a display-space helper and loses its fake Enemy literal; the test mirror gains `deltaY`/`entryFrames`.
  - Rationale: the three GMLEVL-0 tests assert a behaviour the ROM does not have — P.IIDL[0] = 0 is a
    real dead stop, so a level-0 plane parks rather than weaving. Driving them where the machine
    weaves preserves their intent (window-follower, not beeline seeker) without asserting a fiction.
    The mocks were the serious one: a passthrough that re-declares its signature is a COPY of it, so
    when the gun grew an eye the recorded cockpit silently collided from the origin — no kill landed
    in the whole run, which is what surfaced it (`WRECK TRUTH`'s own anti-vacuity assertion).
  - Severity: minor
  - Forward impact: `TARGET TRUTH` is now a strictly stronger guard — it measures the drawn position
    against the killed position across the display seam.

- **Re-read the cockpit determinism fingerprint — number unchanged (53), stated CAUSE corrected**
  - Spec source: tests/shell/cockpit-draw-path.test.ts:446; Reviewer's FLAG on the round-1 re-pin
  - Spec text: "Re-pin the number only after the reachability finding is resolved — otherwise 53
    bakes in the bug."
  - Implementation: re-measured after the seam landed. It is still 53, stable across 3 runs, so the
    literal did not move — but round 1's recorded rationale ("one more shell lives out its flight
    instead of ending early on a plane that used to sit still in Y") is deleted and replaced with the
    round-2 cause.
  - Rationale: the Reviewer's objection was to the REASON, not the digit: that sentence described a
    shot that used to connect and now missed, i.e. the fingerprint had noticed the soft-lock and been
    re-pinned over it. Post-seam the sky is different again (absolute-altitude spawn, ROM delta
    scale) and kills DO land — `WRECK TRUTH` requires one and passes, which round 1's sky could not
    have satisfied. 53 returning is a coincidence of a new sky, and the comment now says so.
  - Severity: minor
  - Forward impact: none — the guard still fails on a drift toward zero.

### TEA (test design, round 3)
- **The OUTER-target convergence pin runs on the Y axis, not the X axis the Reviewer prescribed**
  - Spec source: Reviewer Assessment (round 2), [MEDIUM] zone-target finding
  - Spec text: "Clone the P_IDLX convergence test for the outer zone (delta settles at ∓P_ODLX[lvl] at the wall)"
  - Implementation: the pin drives a GMLEVL-0 spawn and asserts ΔY settles at exactly −P_ODLX[0] and
    holds; no X-axis outer-convergence test is written.
  - Rationale: derived before writing — on X the ±P_OLIM position clamp makes the outer zone a
    one-frame wall event, so ΔX never converges to the outer target and the prescribed test could
    only pass vacuously (tolerance) or never. On Y at GMLEVL 0 the UPDPLN altitude floor (128) sits
    above the level-0 window (olim 64), pinning the plane INSIDE the outer zone permanently — the
    one place the shipped machine genuinely consumes P_ODLX. Mutation-proven: `target = odlx * 2`
    inside windowServo → RED (it survived the whole round-2 suite).
  - Severity: minor
  - Forward impact: the same test documents the Y-pins-at-a-band-edge behaviour the Reviewer's audit
    annotated; the PLONSN successor re-seats it when the servo moves to display space. Logged as a
    Delivery Finding (P_ODLX X-axis inertness).
- **The WO.RTN pin also freezes the SHIPPED repeat cadence, a logged ROM divergence**
  - Spec source: Reviewer Assessment (round 2), [MEDIUM] WO_RTN finding; Dev round-2 Delivery Finding
    (ROM resolves ONCE per fly-past)
  - Spec text: "Behavioural pin: armed ace resolves nothing for WO_RTN−ACE_ATTACK_FRAMES−1 frames, then resolves on the next"
  - Implementation: pins the first delay (4 frames) AND the evade[1]−evade[0] gap (also 4 — the
    shipped reseed), with a comment ordering a CONSCIOUS re-seat when a successor ports the
    once-per-pass shape.
  - Rationale: pinning only the first delay leaves the reseed free to drift silently; the repeat is a
    real, logged divergence and should fail loudly when it changes, in either direction.
  - Severity: minor
  - Forward impact: the once-per-fly-past successor re-seats one assertion, on purpose.

### Dev (implementation, round 3)
- No deviations from spec — the GREEN is exactly TEA's three-line contract (NaN-safe clamp, cast
  deletion, comment correction), with no behaviour change for finite inputs and no test edits.

### Reviewer (audit)

**TEA deviations**
- **AC-5 (blimp) split out of rb4-6** → ✓ ACCEPTED by Reviewer: user ruling, RED suite seeded for the
  successor story (rb4-15 exists on the sprint). Verified the blimp subsystem is untouched by this diff.
- **P.IIDL / P.ODLX / P.IDLX magnitudes not byte-pinned** → ✗ FLAGGED by Reviewer: the RATIONALE IS
  FALSE. "the `.2WORD`/`.3WORD` macros carry an unverified ×2/×3 scale with no baked artifact to
  arbitrate" — the macros are defined at RBARON.MAC:20-27 of the very file TEA cites and md5-verified
  (`.MACRO .2WORD` → `.WORD 2*.A,...`; `.MACRO .3WORD` → `.WORD 3*.A,...`), and the longhand 5th
  entries (`.WORD 80*2` :2949, `2C*3` :2953, `40*3` :2956) corroborate the multiplier independently.
  `.LEVLS=5` (:504) plus the `LDA I,.LEVLS*2` / `.LEVLS*4` offsets (:2791, :2797) confirm the three
  tables are contiguous and indexed by zone×GMLEVL, and P.WCHK (:2806-2864) servos the delta TOWARD
  them ("ACCELERATE SO DELTA=MAX", :2832). The data was recoverable with zero ambiguity; a fabricated
  `sqrt(ACCEL·ilim)` was shipped in its place. Independently confirmed by rule-checker. See findings.
- **Fly-past destruction via `active: false`, not a null step() return** → ✓ ACCEPTED by Reviewer:
  maps to the cleared PLSTAT+6/D7, keeps `step()` total, mutation-proven (3 RED on re-flooring).
  The WO.RTN half of the same AC was NOT delivered — logged separately as a finding, not against this.
- **Re-seated 4 sibling tests to the rb4-6 machine** → ✓ ACCEPTED by Reviewer: each re-seat preserves
  an orthogonal intent (liveness / never-behind-eye / formation offsets) and the byte-exact claims moved
  to `enemy-machine.test.ts` rather than being dropped. test-analyzer confirms the surviving guards bite.

**Dev deviations**
- **The Y-axis window servo runs UNBIASED — HORIZN is not added to our `y`** → ✓ ACCEPTED by Reviewer:
  the reasoning is correct and independently verified — `SBC I,HORIZN` (:2750) NORMALIZES the stored Y
  into the display space X already occupies (`;X DISPLAY` :2867, `;X SCREEN POSITION` :3157), so it
  removes a displacement rather than creating one. Re-applying it double-counts. Escalated to the user
  rather than decided unilaterally, which is the right call. NOTE: this deviation is accepted on its own
  terms, but it does not rescue the coordinate-space defect below.
- **The drone formation breaks on the LEAD's entry-rotation completion, not a closing distance** →
  ✓ ACCEPTED by Reviewer: verified FRDRNE (:3511-3529) carries no distance/timer test and FREPAR is
  called at exactly :2652-2653 and :5587, both keyed on the lead. Deleting the fabricated
  `FRDRNE_BREAK = 0x30` is the epic's whole point. Both directions mutation-proven.
- **Re-read the cockpit determinism fingerprint (TOTAL_LIVE_SHELLS 52 → 53)** → ✗ FLAGGED by Reviewer:
  the re-read is procedurally correct (the guard asks for it, the move is +1 not a collapse, stable 3×,
  and test-analyzer confirms freezing Y restores exactly 52 — it is a real guard). But the stated CAUSE
  is the defect: "one more shell lives out its flight instead of ending early on a plane that used to sit
  still in Y" means a shell that used to CONNECT now MISSES. That is the reachability regression showing
  up in the fingerprint at GMLEVL 0 and being rationalised as benign. Re-pin the number only after the
  reachability finding is resolved — otherwise 53 bakes in the bug.
- **Registered DRINZ in the depth registry rather than renaming it** → ✓ ACCEPTED by Reviewer: DRINZ is a
  cited ROM name (:466, :2369-2370); the registry branch is exactly what the guard offers for that case,
  and test-analyzer mutation-proved the registry entry is a live guard (removing it goes RED on waves.ts:93).
- **Removed two dead test helpers (`mean`, `crossings`)** → ✓ ACCEPTED by Reviewer: both were unused and
  failed `tsc` (TS6133); `crossings` is explained rather than silently dropped. Correct.

**UNDOCUMENTED deviations found by Reviewer (not logged by TEA or Dev)**
- **AC-3's WO.RTN re-entry delay was not implemented:** Spec said a fly-past "arms the returning attack
  (GMEND0), with the WO.RTN re-entry delay" and TEA explicitly assigned the wiring to Dev's integration.
  Code exports `WO_RTN = 0x10` and consumes it nowhere; main.ts arms on `ACE_ATTACK_FRAMES = 0x0c`.
  The export's comment claims wiring that does not exist. Severity: M.
- **`HORIZN` duplicated across two modules:** Spec (rb4-1's whole mandate) says one ROM equate, one home.
  `topology.ts:394` already binds it and is wired via `scene.ts:49`; `enemy.ts:71` adds a dead twin. Severity: M.
- **`step()` floors depth for one frame while its docstring says "the depth is never floored":** the ROM
  destroys off the raw sub-floor depth in the same frame (:2704-2742). Severity: L.

### Reviewer (audit, round 2)

**Dev round-2 deviations**
- **The servo reads the STORED position, not the DISPLAY position** → ✓ ACCEPTED by Reviewer: the
  ROM shape is real (P.WINDW reads PLSTAT+8/+A; +0/+2 vs +8/+A are distinct fields, :266-297 —
  re-verified at the quarry), the eye-aware alternative was BUILT and MEASURED before rejection
  (soft-lock at GMLEVL 4 without PLONSN), and the blocking Delivery Finding + successor scope
  (PLONSN, servo on displayPos, re-written AC-R3) are logged. ANNOTATION for the successor: the
  eye-free servo on absolute altitude means a plane's Y PINS at a band edge after a transient
  (traced by Reviewer: L0/1/2 settle at 128, L3/4 at 320 — the middle band coasts one-way into the
  clamp and the clamp is invisible to the delta). Reachable (both edges sit inside the pilot's
  [8, 384]) and AC-R3-guarded, but the sustained vertical cat-and-mouse the ROM plays needs the
  display-space servo — say so in the successor's problem statement.
- **`enemy.y` is an ABSOLUTE ALTITUDE; the clamp is UPDPLN's band** → ✓ ACCEPTED by Reviewer:
  independently verified at the quarry — PFPLOW=80*4/PFPHI=140*4 (:448-449), UPDPLN integrates both
  axes through DIVBY4 and clamps ONLY Y (:2570-2611), STPLNE's X is `offset + UNIV4X` while Y is a
  bare absolute (:2291-2316). The asymmetry is the ROM's own. The spawn transcription itself is
  faithful (carry-through-AND included) but UNGUARDED — logged as a finding, not against this.
- **The entry ramp is a plain countdown** → ✓ ACCEPTED by Reviewer: verified at the quarry —
  PLSTAT+14/15 ramps by ±0x40/frame and `25$` fires `AND I,0EF` + `JSR FREPAR` the frame it reaches
  zero (:2634-2653), never consulting the delta. Round 1's ΔX clause was an invention; deleting it
  is correct and both directions are mutation-proven.
- **WO.RTN wired as the seed of the ACE_ATTACK_FRAMES counter** → ✓ ACCEPTED by Reviewer: :2736-2737
  seeds PLSTAT+7 = 0x10 at fly-past, :1078-1080 resolves at exactly 0x0C — one mechanism, and the
  4-frame delay is the ROM's own arithmetic (verified at the quarry). The repeat-per-pass divergence
  (ROM resolves ONCE, `BNE 25$`) is honestly logged. The GUARD for this wiring is vacuous — logged
  as a finding, not against the deviation.
- **Wrecks and the airship stay DISPLAY-space; converted at their boundaries** → ✓ ACCEPTED by
  Reviewer: `worldBlimpTarget` adds the eye that `collides` subtracts — an exact round trip, so the
  shipped blimp behaviour is bit-identical; the wreck converts at the one boundary it crosses;
  rb4-15 is named as the deleter. Draw and kill share `displayPos` by construction (main.ts:207-209,
  guns.ts:413-418) — the seam cannot drift.
- **Re-seated 4 sibling tests + 2 stale mock passthroughs** → ✓ ACCEPTED by Reviewer: test-analyzer
  verified both mocks now declare AND forward the eye, and TARGET TRUTH/WRECK TRUTH catch an
  origin-eye main.ts; the GMLEVL 0→2 re-seats preserve intent (P_IIDL[0]=0 makes a level-0 plane a
  legitimate dead stop).
- **Fingerprint re-read — 53 unchanged, cause corrected** → ✓ ACCEPTED by Reviewer: the round-1 FLAG
  demanded exactly this (re-pin only after the seam lands, correct the recorded cause); WRECK TRUTH
  now requires a landed kill and passes, which round 1's sky could not satisfy.

### Reviewer (audit, round 3)

**TEA round-3 deviations**
- **The OUTER-target convergence pin runs on the Y axis, not the X axis the Reviewer prescribed** →
  ✓ ACCEPTED by Reviewer: the X-inertness derivation is correct (the ±P_OLIM output clamp makes the
  outer zone a one-frame wall event on X — re-traced independently: spawn mag ∈ [ilim, olim) never
  enters outer, and a wall-clamped plane departs the frame its delta turns inward, before any
  approach to ±odlx), and the prescribed X test would have been born permanently green — the exact
  scenery class this story was twice rejected for. The Y-axis pin is the one place the shipped
  machine consumes P_ODLX, and test-analyzer independently re-ran the `odlx * 2` mutation → RED.
  The prescription's INTENT (pin odlx consumption) is satisfied; its MECHANISM was wrong, and the
  deviation correctly said so instead of writing the test anyway. This is the right kind of
  disobedience.
- **The WO.RTN pin also freezes the SHIPPED repeat cadence, a logged ROM divergence** → ✓ ACCEPTED
  by Reviewer: a guard on a logged divergence with an explicit conscious-re-seat instruction is the
  fingerprint-pin philosophy applied correctly — the successor's once-per-pass port must fail this
  line on purpose, not drift past it.

**Dev round-3 deviations**
- **No deviations from spec** → ✓ ACCEPTED by Reviewer: verified against the delta — 2 source files,
  6 insertions / 3 deletions, exactly TEA's three-line contract (NaN-safe clamp with the constraint
  comment, cast deletion, comment correction), nothing else.

**UNDOCUMENTED deviations found by Reviewer (round 2)**
- **Spawn X about the world origin, not the pilot's pan:** ROM STPLNE writes `offset + UNIV4X`
  (:2291-2297); ours writes `side * mag` about 0 while `flight.heading` is unbounded. Newly live
  with the display seam; recoverable, non-blocking; routed to the PLONSN successor. Severity: M.
- **AC-R3's rig deviates from the prescribed guard:** the round-1 ruling text prescribed
  "spawn → stepWave → guns.step must land a hit at EVERY GMLEVL"; the shipped guard drives `step`
  (not `stepWave`) and never touches the gun. This is the blocking [TEST] finding. Severity: H.

## Sm Assessment

**Setup complete and verified on disk.** Session file, story context (`sprint/context/context-story-rb4-6.md`), and feature branch `feat/rb4-6-enemy-inner-weave-y-axis` (cut from red-baron `develop` @ v0.0.17) all confirmed present. Story moved to `in_progress`; epic context `context-epic-rb4.md` was NOT clobbered (only `epic-rb4.yaml` Branch field added).

**Dependency cleared.** rb4-6 depends on rb4-1 (THE RADIX SWEEP), which is `done` — along with the whole numeric foundation (rb4-2 doc retraction, rb4-3 determinism, rb4-4/5, rb4-13). The hex-corrected constants this story leans on (P.MNDP = 0x140 = 320, DRINZ = 0x1600, HORIZN = 0x40) are already the post-sweep values. No stale-decimal risk.

**Scope for TEA (Imperator Furiosa) — this is a stepper REWRITE, not a tweak.** Five distinct failures, each with its own AC and ROM citation:
1. Weave reverses at the INNER window (P.INER when |pos| < P.ILIM, `EOR I,0FF`, RBARON.MAC:2794-2797) — plane turns away from centre, not at the outer edge.
2. Same window/servo machine must run on the Y axis (PLNDEL LDX I,2 → DEX/DEX → X=0, RBARON.MAC:2747-2754, :2865-2873), biased by HORIZN.
3. Plane lifecycle: crossing P.MNDP DESTROYS the plane as an object (arms returning attack GMEND0 + WO.RTN re-entry delay); ours hovers at a floor.
4. Drones: two-phase PARALLEL→FREE, spawn at DRINZ 0x1600 — not lead-weave.
5. Entry 90° bank must survive the first step().

**Watch item for review:** the blimp AC explicitly retracts CD-005's "blimp is correct" CERTIFIED finding (it had borrowed the plane's div-by-2). Do not let a test re-assert the constant-depth every-2nd-frame drifter as authoritative.

**Route:** phased tdd → handoff to TEA for RED phase.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Scope note:** AC-5 (blimp) was SPLIT into its own story (user ruling 2026-07-16) — see Design
Deviations. rb4-6 delivers the ENEMY-STEPPER rewrite: AC-1 (inner-window reversal), AC-2 (two-axis
Y machine + HORIZN), AC-3 (fly-past destruction at P.MNDP), AC-4 (drone PARALLEL→FREE at DRINZ), plus
problem-statement item 5 (the 90° entry bank is a ramp, not a first-frame discard). AC-6 (depends on
rb4-1) is a satisfied dependency — rb4-1 is `done`, no behavioural test.

**Machine derivation:** every constant + behaviour was re-derived from the CONSUMING 6502 in the
CITABLE quarry `~/Projects/red-baron-source-text/RBARON.MAC` (md5 497db93e…, 6294 lines, `.RADIX 16`
from :74 — NOT the CRLF sibling `reference/red-baron/`, which is 8 lines short in a staircase and
poisoned the findings doc). Full derivation: scratchpad `rb4-6-machine.md`. The AC decodes were
NOT taken on trust: P.OLIM (:2939) is the "RETURN TO CENTER LIMIT", P.ILIM (:2945) the "HEAD AWAY
FROM CENTER LIMIT", P.INER (:2794) does `EOR I,0FF`; PLNDEL runs the machine on Y (`LDX I,2`,
`SBC I,HORIZN`) then `DEX/DEX` to X; P.UPD0 (:2727) clears PLSTAT+6 past P.MNDP.

**Test Files:**
- `tests/core/enemy-machine.test.ts` — NEW. 23 tests: AC-1 inner reversal (3), item-5 entry ramp (2),
  AC-2 Y machine + HORIZN (4), AC-3 fly-past (5), AC-4 drones/DRINZ/PARALLEL→FREE/stepWave (6), rule
  coverage (3). RED: 6 pass (regression guards), 17 fail as `need()`-guard + assertion mismatches.
- `tests/core/enemy.test.ts` — RE-SEATED 4 tests (L306 cross-centre→liveness, L325 range→maxAbs,
  L372 floor→tunnel-guard, L580 floor→fly-past). 42 pass, 1 RED (L580, as intended).
- `tests/core/waves.test.ts` — RE-SEATED 1 test (L213 drone depth === lead → > lead / DRINZ). 28 pass, 1 RED.

**Full-suite verification (testing-runner, 58 files):** all files collect; 3 files RED
(enemy-machine, enemy, waves) exactly as intended; blimp/screen-scale/cockpit-loop/depth-scale all
GREEN (0 failures) — the split left the blimp subsystem untouched. Totals: 1032 pass / 19 fail.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/0-not-falsy (totality) | `#4 totality: step() survives a degenerate GMLEVL on BOTH axes` | passing (guard) |
| #4 0-is-valid (falsy≠missing) | `#4 0-is-valid: GMLEVL 0 is honoured, not defaulted away` | passing (guard) |
| #2 readonly / purity | `#2 purity: step() does not mutate its input` + AC-3 `stepping an already-destroyed plane is idempotent` | idempotent test failing (RED); purity passing |
| #8 test quality | Phase-C self-check (below) | done |

**Rules checked:** 3 of the applicable TS lang-review rules (#2, #4, #8) have coverage; the rest of
the checklist (React/JSX, async, security input-validation, build-config) does not apply to a pure
deterministic core sim.

**Self-check (Phase C):** 1 vacuous test found and fixed — the original `#4 0-is-valid` read back
values it set via `withEnemy` without exercising any logic; replaced with a driven guard that steps a
level-0 plane and proves GMLEVL 0 is not defaulted to level 1's window. No `let _ =`, no `assert(true)`,
no always-null assertions remain.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement the machine so the 19 RED tests pass. Key
contract points: new exports HORIZN(0x40)/DRINZ(0x1600)/WO_RTN(0x10); Enemy gains `parallel: boolean`;
`step()` deactivates (active→false) past P.MNDP and never floors depth; a new `stepWave(enemies, level)`
in waves.ts runs the lead weave, holds/breaks drone formation (PARALLEL→FREE), and drops flown-past
planes; drones spawn at DRINZ. Do NOT re-pin the P.ODLX/P.IDLX/P.IIDL magnitudes to the byte (unverified
macro scale, no artifact) — pin behaviour, and flag the derived magnitudes for the Reviewer's ROM diff.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/enemy.ts` — the window/servo machine. One `windowServo(pos, vel, olim, ilim)` run on BOTH
  axes (Y then X, the ROM's order); three zones per GMLEVL — outer (P.OLIM) reverses toward centre,
  inner (P.ILIM) reverses AWAY (`EOR I,0FF`, :2794-2796), middle coasts. Fly-past: a plane past
  P.MNDP deactivates (`active → false`, the ROM's `STA PLSTAT+6 ;CLR PLANE`) and depth is never
  floored. `step()` is total and idempotent on a destroyed plane. New exports HORIZN (0x40) / DRINZ
  (0x1600) / WO_RTN (0x10); Enemy gains optional `deltaY`, `entryFrames`, `parallel`. The ±90° entry
  bank RAMPS out over ENTRY_RAMP_FRAMES instead of being discarded on frame 1.
- `src/core/waves.ts` — new `stepWave(enemies, level)`: the PLMOTN/FREPAR seam. Drones spawn at DRINZ
  flagged `parallel`, ride the lead's motion holding their entry offset, and are freed by FREPAR when
  the lead's entry rotation completes (:2652-2653) or the lead dies (:5587). Flown-past planes are
  dropped so the wave empties. The fabricated `FRDRNE_BREAK` distance constant is gone.
- `src/main.ts` — the calc-frame loop steps the wave through `stepWave` (was a per-enemy `map`), and
  the returning ace is consulted every calc frame (`JSR EOLSEQ`, :825) now that nothing hovers at the
  floor to gate on.
- `tests/core/depth-scale.test.ts` — registered `DRINZ` (a cited ROM name) in the depth registry.
- `tests/shell/cockpit-draw-path.test.ts` — determinism fingerprint re-read on purpose, 52 → 53.
- `tests/core/enemy-machine.test.ts`, `tests/core/enemy.test.ts` — removed two dead RED-phase helpers
  that failed `tsc` (TS6133).

**Tests:** 1051/1051 passing across 58 files (GREEN). `npm run build` (tsc --noEmit && vite build)
clean. Baseline at RED was 1032 pass / 19 fail.

**Guards mutation-proven (each reverted → a specific test goes RED; control 23/23 green):**

| Mutation | Result |
|---|---|
| `freed = true` (always free the drones) | 1 RED — the FORMATION-hold test |
| `freed = false` (never free) | 1 RED — the BREAK-to-FREE test |
| drone depth = lead's (drop DRINZ) | 1 RED — the spawn-DEEPER test |
| Y servo removed (y frozen) | 3 RED — the AC-2 axis tests |
| depth floored at P.MNDP (the old `Math.max`) | 3 RED — the fly-past tests |
| **HORIZN bias re-added** | **0 RED in this suite** — see Delivery Findings |

**Branch:** feat/rb4-6-enemy-inner-weave-y-axis (pushed)

**Two things the Reviewer should not take on trust:**
1. **AC-2 is wrong, by user ruling.** `SBC I,HORIZN` removes a displacement rather than adding one;
   our `y` is already the ROM's display-space Y. Shipped unbiased. TEA's `BIASED by HORIZN` test
   passes either way (mutation-proven vacuous) — the only thing that catches the bias is the sibling
   integration suites. Both logged as blocking Delivery Findings.
2. **The P.ODLX/P.IDLX/P.IIDL magnitudes are still un-pinned**, as TEA intended. `WEAVE_SPEED_CAP`
   (100) and `weaveSpeedCap(ilim) = sqrt(ACCEL·ilim)` are behavioural stand-ins, not transcriptions —
   they carry no ROM citation and are the flagged targets of the ROM diff TEA asked for.
   `ENTRY_RAMP_FRAMES = 8` is likewise inferred; the ROM ramps PLSTAT+14/15 by ±0x40 per frame
   (:2634-2648), which is a real transcription target for a follow-up.

## Subagent Results

Toggles (`pf settings get workflow.reviewer_subagents`): 4 enabled, 5 disabled. Every disabled
specialist's domain was assessed by the Reviewer directly — no coverage is claimed from an unrun agent.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1051/1051 pass, build clean, no PR, no smells; SELF-RETRACTED its counts (caught mid-mutation tree) | confirmed 0, dismissed 0, deferred 0 — counts re-derived by Reviewer in an isolated worktree (1051/1051, tsc clean) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths assessed by Reviewer (levelIndex clamp, empty-wave deref, sqrt domain, index alignment in stepWave) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error-handling surface in a pure sim; no catches/fallbacks in diff (Reviewer-verified) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (4 vacuous tests incl. 3 unreported by Dev; 2 weak) | confirmed 6, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comment audit done by Reviewer (found the false ×2/×3 claim, the WO_RTN wiring claim, the "never floored" contradiction) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type audit done by Reviewer + rule-checker (readonly intact, `??` correct on all 3 optional fields, no escapes) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 — thin threat model confirmed thin; numeric-integrity trace accepted |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by Reviewer (found 2 dead exports: HORIZN twin, WO_RTN) |
| 9 | reviewer-rule-checker | Yes | findings | 4 violations + 1 upgrade (WEAVE_SPEED_CAP compliant → violation) + 1 minor | confirmed 5, dismissed 0, deferred 1 (test mirror types → LOW) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled and self-assessed)
**Total findings:** 11 confirmed, 0 dismissed, 1 deferred

**Independence note.** Review was NOT self-authored (Dev was a separate agent), but the two biggest
findings came from adversarial work rather than reading: an empirical reachability probe in an isolated
worktree, and an independent ROM re-decode that falsified a premise both TEA and Dev had asserted.
Every subagent's mutation-proven finding is confirmed; none is dismissed.

**Mutation-collision hygiene.** test-analyzer mutated the LIVE tree throughout; preflight caught a
transient `DRINZ`-removed state and correctly retracted its own numbers, and security/rule-checker both
caught moving files and re-anchored to the frozen diff. Per the sidecar lesson, the Reviewer ran every
independent check in `git worktree` copies pinned to HEAD and `origin/develop`, restored via `cp` backup
(never `git checkout`), ended with a CONTROL run, and removed both worktrees. Live tree verified clean.

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + the orchestrator CLAUDE.md
core/shell rule + the rb4 no-fabricated-constants mandate. Every governed instance enumerated.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type escapes | whole diff: 0 `as any`, 0 `as unknown as`, 0 `@ts-ignore`/`@ts-expect-error`; 2 `!` (tests only, `enemy-machine.test.ts:380,418`, provably safe — `spawnWave` seeds index 0 as lead) | PASS |
| #2 readonly/generics | every `Enemy` field incl. new `deltaY?`/`entryFrames?`/`parallel?` is `readonly`; `stepWave(readonly Enemy[]): readonly Enemy[]`; purity mutation-proven | PASS |
| #3 enums | no enums in diff | N/A |
| #4 null/0-not-falsy | ALL 4 sites: `enemy.deltaY ?? 0` (:311), `enemy.entryFrames ?? 0` (:333), `postLead.entryFrames ?? 0` (waves:127) — correct `??`; `Math.sign(enemy.bank) \|\| 1` (:340) — `\|\|` is CORRECT here (0 sign carries no direction; `??` would yield 0 and zero the bank); `levelIndex`'s `Math.floor(level) \|\| 0` is a NaN guard where 0→0 either way, pinned by the `0-is-valid` test | PASS |
| #5 modules | `import { ..., type Enemy }` inlined in waves.ts:30 and main.ts | PASS |
| #6 React/JSX | no .tsx touched | N/A |
| #7 async | no new async production code; test `beforeAll(async import)` is the house pattern | N/A |
| #8 test quality | **4 vacuous tests mutation-proven** (BIASED by HORIZN; COUPLED deactivation; PARALLEL drones hold FORMATION; drones BREAK to FREE) + 2 weak + mirror types diverge from real `Enemy` | **FAIL** |
| #9 build/config | untouched; `tsc --noEmit` clean (Reviewer-verified, isolated worktree) | PASS |
| #10 input validation | no external input in a pure sim | N/A |
| #11 error handling | no catches introduced; `step()` total on all degenerate GMLEVL (NaN/±Inf/negative), verified | PASS |
| #12 bundle | `src/core` sim module; no barrel over-import | N/A |
| #13 fix regressions | n/a (first review round) | N/A |
| **core/shell boundary** | `enemy.ts` + `waves.ts`: 0 hits for `Math.random`/`Date.now`/`document`/`window.`/`localStorage`/shell imports; imports are `@arcade/shared/rng`, `./biplane`, `./flight` (type), `./returning-ace` only | PASS |
| **rb4 no fabricated constants** | HORIZN/DRINZ/WO_RTN/P_OLIM/P_ILIM/P_MNDP/P_INDP/ACCEL all byte-exact vs ROM, radix correct. BUT `WEAVE_SPEED_CAP=100` + `weaveSpeedCap(ilim)=sqrt(ACCEL·ilim)` stand in for P.ODLX/P.IDLX/P.IIDL, which ARE recoverable (:20-27 macros) — a fabricated constant substituted for available ROM data | **FAIL** |

## Devil's Advocate

Argue this code is broken. It is, and the tests are the reason nobody noticed.

Start with the player. Five kills in, the sky goes bulletproof. Every plane climbs or dives out of the
gun's 32-unit window on its first calc frame and never returns, because the servo I ported reverses AWAY
from centre — and "centre", in our clone, is the only place the gun can ever shoot. The player empties
both Vickers into a plane that is visibly right there on screen and nothing happens, forever. There is no
score, no progression, no death: the game just stops meaning anything while continuing to run. That is
worse than a crash. A crash gets reported.

Why didn't 1051 tests see it? Because every test that fires a gun builds its target by hand at `y: 0`
(`engagement.test.ts:47`), and every test that drives the servo never fires a gun. The two halves of the
engagement are each tested in a world where the other doesn't exist. The suite is not wrong about anything
it asserts; it is silent about the only thing that matters. And the one artifact that DID notice — the
cockpit determinism fingerprint moving 52 → 53 because "one more shell lives out its flight instead of
ending early on a plane" — was read as a curiosity and re-pinned. That number was the bug filing itself,
and it got closed as "re-read on purpose".

Now the confused reader. `enemy.ts:71` exports `HORIZN`; so does `topology.ts:394`. One is wired, one is
decoration. A future dev fixes the horizon by editing the wrong one and watches nothing happen. `WO_RTN`
is exported "for the returning-ace arming wiring" that does not exist, and a test asserts its value so the
line looks covered. `step()`'s docstring promises "the depth is never floored" directly above a
`Math.max(closed, P_MNDP)`. Each of these is a small lie, and this epic exists precisely because small
lies about the ROM compounded into a game that was wrong in five ways at once.

And the deepest one: the story's own justification for the largest thing it skipped is false. "No baked
artifact to arbitrate" — the arbiter is twenty lines from the top of the file, in the same `.MACRO` block
both agents scrolled past to reach `.RADIX 16` at :74. The story shipped `sqrt(ACCEL·ilim)` — invented — to
avoid the risk of inventing something. A malicious reviewer could not design a better trap; it inverts the
epic's purpose while wearing its vocabulary.

## Round-1 Reviewer Assessment (REJECTED — superseded by round 3)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [CRITICAL] | Planes are UNREACHABLE by the gun at GMLEVL >= 2 — the game soft-locks after 5 kills. The Y servo drives \|y\| away from centre into [P.ILIM, P.OLIM]; the shell is pinned at `y: 0` for its whole flight and `collides` reaches at most 32*sqrt(2)=45.25. Measured 200 planes/level in isolated worktrees: baseline in-reach for full life at every level vs HEAD avg 1.0 frames (spawn only) and 0/200 reachable after the first step() at GMLEVL 2/3/4. `PLNLVL` hits GMLEVL 2 at 5 kills | `src/core/enemy.ts` (windowServo/step, y axis) × `src/core/guns.ts:321,390` | The ROM's servo runs on DISPLAY coords that TRACK the player's view (PLSTAT+8 ";X SCREEN POSITION" :3157); ours are static world coords the camera merely looks at (`main.ts:187-197`) and the gun collides in that same static space. Decide the seam with the user: either project enemy x/y through the player's attitude before the gun tests them, or bound the servo to the reachable window. Do NOT just widen WINDOW_Y — that hides it |
| [HIGH] | [RULE] AC-1's "accelerates toward the P.IIDL target by level" is unimplemented and its stated justification is FALSE. `.2WORD`/`.3WORD` are defined at RBARON.MAC:20-27 of the cited file; longhand 5th entries (`80*2`/`2C*3`/`40*3`) corroborate. Tables recover exactly: P.ODLX=[288,280,264,248,256], P.IDLX=[24,60,84,108,132], P.IIDL=[0,48,72,120,192]. P.WCHK (:2806-2864) servos TOWARD them per zone×GMLEVL ("ACCELERATE SO DELTA=MAX" :2832) — not one symmetric cap. Confirmed independently by rule-checker | `src/core/enemy.ts:119-136` (`WEAVE_SPEED_CAP`, `weaveSpeedCap`), `tests/core/enemy-machine.test.ts:40` | Transcribe the three tables with citations and servo the delta toward the zone target; delete the fabricated `sqrt(ACCEL·ilim)`. Correct the false claim in both the suite header and the enemy.ts comment |
| [HIGH] | [TEST] Four mutation-proven vacuous tests — three are the AC-3/AC-4 guards. `BIASED by HORIZN` green with the bias re-added (Reviewer + test-analyzer, independently); `deactivation is COUPLED...` green when the plane NEVER deactivates; `PARALLEL drones hold FORMATION` and `drones eventually BREAK to FREE` both 0-assert when drones aren't `parallel` at spawn (`offsetsOf` filters on `e.parallel` → `0 === 0`) | `tests/core/enemy-machine.test.ts` (lines 268, 337, 420, 435) | Retire/rewrite `BIASED by HORIZN` (it asserts a behaviour the code deliberately does not have — it cannot fail either way). Add missing-precondition asserts to the drone tests (`expect(drones.length).toBeGreaterThan(0)` before comparing). Make COUPLED assert deactivation HAPPENS, not only that it isn't premature |
| [MEDIUM] | [TEST] The seam that would have caught the CRITICAL is untested: no test drives a stepped plane into the gun. `engagement.test.ts:47` hand-builds `y: 0` | `tests/core/engagement.test.ts` | Add a reachability test: spawn → stepWave → guns.step must land a hit at EVERY GMLEVL. This is the regression guard for the CRITICAL |
| [MEDIUM] | [SIMPLE][RULE] `HORIZN` declared twice for one ROM equate — `topology.ts:394` (wired via `scene.ts:49`) and `enemy.ts:71` (dead). The "one identifier, two homes" fragility enemy.ts's own P_MNDP comment says the epic exists to kill | `src/core/enemy.ts:71` | Import/re-export from `./topology`, or drop the export and adjust the value-only test |
| [MEDIUM] | [SIMPLE][DOC] `WO_RTN` is a dead export with a false doc claim; AC-3's "WO.RTN re-entry delay" is unimplemented. Comment says "Exported for the returning-ace arming wiring" — none exists. main.ts arms on `ACE_ATTACK_FRAMES=0x0c` (:1078-1080), a different equate from PLSTAT+7 = WO.RTN (:2736) | `src/core/enemy.ts:80-85`, `src/main.ts:409-422` | Either wire the delay (seed the ace countdown from WO_RTN) or drop the export and log the descope explicitly. Do not leave a constant whose only consumer is a test asserting its own literal |
| [LOW] | [DOC] `step()` docstring says "the depth is never floored" directly above `Math.max(closed, P_MNDP)`. The one-frame floor is deliberate but the ROM destroys off the raw sub-floor depth in the same frame (:2704-2742) — an unflagged timing deviation stated with byte-pinned confidence | `src/core/enemy.ts:293-298, 325` | Correct the comment and label the one-frame lag as an inferred deviation |
| [LOW] | [TEST] Weak-but-sibling-covered: AC-1 liveness passes for the outer-only machine; item-5's "DECREASES toward the weave" misses a frame-1 discard. Test mirror types omit `deltaY?`/`entryFrames?` and declare `parallel` required | `tests/core/enemy-machine.test.ts:187,246,491-538` | Tighten if the file survives; each has a stronger sibling today |

**No findings from:** [SEC] — security returned clean; thin threat model verified thin (no escapes, no
unbounded growth, `sqrt` domain safe, `levelIndex` total). [EDGE] and [SILENT] were disabled; Reviewer
assessed both domains directly and found no defect (see VERIFIED below). [TYPE] disabled; covered by
rule-checker + Reviewer — `readonly` intact, `??` correct on every optional field.

**VERIFIED (evidence + rule compatibility):**
- [VERIFIED] Test counts and build are HONEST — Reviewer re-ran both in a `git worktree` pinned to HEAD,
  isolated from the live-tree mutations: 58 files / 1051 tests pass, `tsc --noEmit` exit 0. Dev's claim matches.
- [VERIFIED] Every ROM constant is byte-exact and radix-correct — `HORIZN=40`→0x40 (:456), `ACCEL=30`→0x30
  (:465), `DRINZ=1600`→0x1600 (:466), `P.MNDP=140`→0x140 (:469), `WO.RTN=10`→0x10 (:473), `P.INDP=1080`
  (:464), P.OLIM (:2939-2943) and P.ILIM (:2945-2946) exact. Radix independently proven from the file's own
  dot convention (`L.OBJ =28.` decimal at :462 vs bare hex neighbours), not taken from the doc comments.
- [VERIFIED] The HORIZN un-biasing RULING is correct — `SBC I,HORIZN` (:2750) normalizes Y into the display
  space X already occupies (`;X DISPLAY` :2867, `;X SCREEN POSITION` :3157). Complies with the rb4 mandate;
  re-applying it would double-count. Dev escalated rather than deciding. (This is the recorded
  normalization-vs-displacement trap, correctly avoided.)
- [VERIFIED] Empty-wave deref is safe — `nearestDepth([])` returns `+Infinity` (`main.ts:295`) so
  `closesPast(Infinity)` is false (`returning-ace.ts:129`), guarding `enemies[0]` at `main.ts:414`; and
  `main.ts:619` respawns once `enemies.length === 0`. The newly-emptying wave is handled. [EDGE domain]
- [VERIFIED] `levelIndex` clamps to [0,4] (`enemy.ts:230`), matching the ROM's own GMLEVL clamp
  (`CMP I,5 / BCC 5$ / LDA I,4`, :2756-2759). Complies with rule #4 — 0 is honoured, NaN→0 is a guard.
- [VERIFIED] Core/shell boundary intact — `enemy.ts`/`waves.ts` have zero DOM/`Math.random`/`Date.now`/
  shell imports; sim stays deterministic. Complies with the single most important rule in the repo.
- [VERIFIED] `stepWave` index alignment is sound — `stepped = enemies.map(...)` preserves order/length, so
  `enemies[i]` in the following `.map((s,i))` is the true pre-image; the `.filter` runs after. [EDGE domain]
- [VERIFIED] The DRINZ registry entry and the cockpit fingerprint are REAL guards, not scenery —
  test-analyzer mutation-proved both (removing DRINZ from the registry → RED on `waves.ts:93`; freezing Y →
  the count returns to exactly 52). The fingerprint's CAUSE is still flagged above.

**Challenge of VERIFIEDs against subagent findings:** rule-checker initially marked
`WEAVE_SPEED_CAP`/`weaveSpeedCap` COMPLIANT ("honestly labelled inferred") — it then re-examined on the ROM
evidence and upgraded it to a violation, agreeing with the Reviewer. I did not mark it verified. No VERIFIED
above is contradicted by any subagent finding; `Math.sign(...) || 1` is the one item a pattern-matching pass
would flag under rule #4, and rule-checker independently reached the same conclusion I did — `||` is correct
there and `??` would be the bug.

**Data flow traced:** player trigger → `fire()` seeds `Shell{x: ±MUZZLE_X, y: 0}` (`guns.ts:321`) →
`guns.step` advances ONLY `z` (`guns.ts:348-372`, so `shell.y ≡ 0` for life) → `collides` rotates
`(shell − enemy)` into the banked frame and gates on `|ry| <= WINDOW_Y = 32` (`guns.ts:382-390`) → meanwhile
`stepWave` → `step` → `windowServo` drives `enemy.y` AWAY from 0 into `[P.ILIM, P.OLIM]` (`enemy.ts:281-311`).
NOT safe: the producer and the consumer disagree about where the plane is allowed to be, and nothing joins them.

**Pattern observed:** the good one — `windowServo` as ONE function called twice (`enemy.ts:310-311`, Y then X)
faithfully mirrors the ROM re-entering one block per axis via `P.WITR: DEX/DEX` (:2865-2873). That is the right
shape. The bad one — an AC's headline constant (P.IIDL) surviving only as prose in a comment while a
fabricated formula does its job.

**Error handling:** `step()` is total and idempotent — `if (!enemy.active) return enemy` (`enemy.ts:301`)
makes re-stepping a destroyed plane a no-op, and degenerate GMLEVL (NaN/±Inf/negative/fractional) resolves to
finite x/y/depth via `levelIndex`'s clamp. Verified by mutation and by security's independent trace.

**USER RULING (2026-07-16) — the CRITICAL's fix direction is DECIDED.** Put to the user rather than left for
TEA to guess (the same escalation Dev correctly made for HORIZN). Selected: **project enemy x/y through the
player's attitude before the gun tests them** — i.e. make our coordinates actually be the ROM's DISPLAY
coordinates, which is what PLSTAT+8 (";X SCREEN POSITION", :3157) already is. The plane weaves away from the
BORESIGHT and the pilot yaws/pitches to chase it back into the sights; the authentic inner reversal (AC-1)
then stays intact because the pilot can follow it. REJECTED alternatives: bounding the servo to the reachable
window (re-introduces a tuned constant the epic exists to kill, and fakes AC-1's shape), and splitting the Y
axis into a successor story.

**Consequences TEA must design for:**
- The seam moves OUTSIDE `enemy.ts`: `guns.collides`/`guns.step` must consume view-relative coordinates
  (`guns.ts:382-390`), and `main.ts` must supply the attitude projection it currently uses for RENDER only
  (`main.ts:187-197`). `enemy.ts`'s servo itself is probably CORRECT as written — do not rewrite it first.
- `HORIZN`'s status may change. Dev's un-biasing ruling was accepted on the premise "our y is already display
  space." Once y is genuinely re-projected per frame, re-derive whether `SBC I,HORIZN` (:2750) is already
  absorbed by the new origin or must be applied. Do NOT assume the earlier ruling survives the seam change —
  re-verify it against :2749-2752 and :2867.
- The regression guard is the deliverable: spawn → stepWave → guns.step must land a hit at EVERY GMLEVL.
  Pin frames-in-reach PER PLANE LIFE, not hits-per-run (fly-past shortens lifetimes and confounds a raw count),
  and count from the spawn frame explicitly (a probe that skips frame 0 over-reports the failure — it did for me).
- Re-pin `TOTAL_LIVE_SHELLS` only AFTER this lands. The 52→53 move is a symptom of shots that stopped
  connecting; freezing it now bakes the bug into the fingerprint.

**Handoff:** Back to TEA (Imperator Furiosa) — the findings are testable (a coordinate-space defect needing a
reachability guard, plus four vacuous tests to re-pin), so this routes red, not green. The fix DIRECTION is
settled by the user ruling above; TEA writes the RED for that direction, not for a guess.

**Handoff:** To Reviewer (Immortan Joe) for the review phase.

## TEA Assessment (round 2 — rework RED)

**Tests Required:** Yes
**Status:** RED (18 failing / 1051 passing across 59 files; `tsc --noEmit` clean)

**Baseline discipline.** Round 1 ended at 1051/1051. Round 2 is 1069 tests: the SAME 1051 still pass and
the 18 new ones fail. Zero sibling breakage from the test additions — the re-seats come in GREEN, when the
source moves. Commit `c26181c`.

**The rework's headline is not a bug in the servo — it is the space the servo runs in.** Round 1's servo is
a faithful port; the defect is that we ran it on coordinates the ROM re-projects every frame and we never
do. The decisive citation is RBARON.MAC:2907-2933 (`PLSTAT − UNIV4X` = ";ABSOLUTE OF POSITION ON SCREEN",
written back with `ADC ZX,UNIV4X`), with :90-91 naming the two subtrahends — `UNIV4X` (turn) on X,
`I4YPOS = UNIV4X+2 ;PLAYER Y POSITION * 4` (altitude) on Y. Our `toEye` already returns exactly that pair.
So Dev should NOT start by rewriting `windowServo` — it is probably right. Start at `main.ts:187` and
`guns.collides`.

**Test Files:**
- `tests/core/display-space.test.ts` — NEW, 11 tests, 10 RED.
  - AC-R1 (3): turning displaces a plane on screen (UNIV4X); climbing displaces it (I4YPOS); the eye is
    `toEye`'s, not a second pan. RED on the `displayPos` contract.
  - AC-R2 (2): the gun collides in display space. **These two fail on the REAL assertion against today's
    shipped code** — "the gun ignores the eye" / "y is not pilot-relative" — because `collides` silently
    ignores a third argument. They demonstrate the defect, they do not merely await an export.
  - AC-R3 (6): the soft-lock guard — every GMLEVL winnable by a CHASING pilot (drives the real
    `flight.step` from the plane's display offset), plus the `PLNLVL[5] === 2` coupling that makes it
    critical. The 6th passes today by design: it is a regression guard on the ramp, so nobody "fixes" the
    soft-lock by re-tuning PLNLVL instead of the seam.
- `tests/core/enemy-machine.test.ts` — 23 → 30 tests, 8 RED. P.ODLX/P.IDLX/P.IIDL byte-exact, the radix
  guard, the servo targeting the zone delta, `WEAVE_SPEED_CAP`/`weaveSpeedCap` deleted, HORIZN's single
  home, WO_RTN wired-or-gone. Round 1's descope header is RETRACTED in place, with the :20-27 macro
  definitions quoted so the next reader cannot re-make the mistake.

**Why the metric is frames-in-reach PER LIFE.** Round 1 also (correctly) made planes fly past, which
shortens lifetimes and confounds any hits-per-run count — the Reviewer's own first probe over-claimed
"never reachable" because it skipped the spawn frame; the honest number was exactly 1.0 (spawn only).
AC-R3 counts from frame 0 and normalises per life, so it cannot be gamed from either direction.

**The four vacuous guards are repaired AND mutation-proven** (each reverted → RED; every restore from a
`cp` backup, never `git checkout`; control run green; no `src/` changes — TEA writes tests only):

| Repaired guard | Mutation | Round 1 | Round 2 |
|---|---|---|---|
| `BIASED by HORIZN` | re-add the HORIZN bias | green (vacuous) | **RETIRED** — see below |
| `deactivation is COUPLED…` | restore clamp-forever | green (vacuous) | RED: "the plane NEVER deactivated in 4000 frames" |
| `PARALLEL drones hold FORMATION` | drop `parallel: true` at spawn | green (0-asserted) | RED: "no PARALLEL drone at spawn — would compare two empty arrays" |
| `drones eventually BREAK to FREE` | drop `parallel: true` at spawn | green (0-asserted) | RED: "`sawFree` would be true from frame 0 having proven nothing" |

`BIASED by HORIZN` is RETIRED, not rewritten. It asserted a behaviour the code deliberately does not have
(the user ruled the servo unbiased), so it could not fail in either direction — there is no bias to test.
What the ROM actually does with the pilot's Y is now pinned as a real claim with a real failure mode in
`display-space.test.ts` AC-R1.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test quality | the 4 repairs above + my own phase-C self-check (below) | 3 repaired-and-RED-on-mutation, 1 retired |
| #4 0-is-valid | `P.IIDL — INNER deltas` pins `P_IIDL[0] === 0` — a REAL target (dead stop at GMLEVL 0), which a `\|\|` default would silently promote to level 1's 48 | RED (contract) |
| #4 totality / #2 purity | round 1's guards retained, unchanged, still passing | passing (guards) |
| rb4 no fabricated constants | `WEAVE_SPEED_CAP`/`weaveSpeedCap` deleted; three tables byte-exact; radix guard | RED |
| one-equate-one-home | `HORIZN has exactly ONE home` (structural) | RED |

**Self-check (Phase C) — two of my OWN new tests were vacuous on first write, and I caught them because
they PASSED when they should have failed.** Both are now structural and both bite:
1. `HORIZN has exactly ONE home` first compared `enemy.HORIZN` to `topology.HORIZN`. Both are 0x40, so it
   passed while the fork sat right there — it could only ever fire AFTER the drift, which is the damage.
   Now asserts enemy.ts carries no `export const HORIZN =` binding at all.
2. `WEAVE_SPEED_CAP … are GONE` first probed module exports. Both are module-PRIVATE `const`s, so the
   probe read `undefined` today and would forever, no matter how alive they are. Now asserts the source.
Both source-reading guards **strip comments before matching**: this file's own retraction names both
symbols in prose, and a raw grep would have matched the comment and passed on it — the tp1-10 trap, which
this suite would otherwise have walked straight into. The `WO_RTN` guard matches an IMPORT BINDING rather
than the bare token for the same reason.

**Handoff:** To Dev (The Word Burgers) for GREEN. [round 2]
**Contract:** `displayPos(enemy, eye) → {x, y}` exported from `core/enemy` (the ROM's `PLSTAT − UNIV4X`);
`guns.step(guns, targets, eye)` and `guns.collides(shell, enemy, eye)` collide in that space; `main.ts`
stops rendering enemies at eye `[0,0,0]` and drops the exemption comment; `P_ODLX`/`P_IDLX`/`P_IIDL`
exported and servoed toward per zone×GMLEVL, with `WEAVE_SPEED_CAP`/`weaveSpeedCap` deleted; `HORIZN`
imported from `./topology` rather than forked; `WO_RTN` wired or dropped.
**Deliberately left to Dev:** the world/display algebra. `enemy.y` spawns at ±40 while
`toEye(INITIAL_FLIGHT)` is `[0, 132, 0]`, so `enemy.y − eye[1]` is NOT the mapping — where the spawn sits
in world space, and where HORIZN (:2750) lands in the conversion, is yours to derive. Re-seat these tests
if you pick a different factoring; the BEHAVIOURS are the ACs, the shapes are not. Expect sibling re-seats
in `cockpit-draw-path`/`engagement`/`dead-mechanics-wiring`/`ground-collision-wiring` — all four are
logged as a Delivery Finding, and the 52→53 fingerprint must be re-read only AFTER the seam lands.
## Dev Assessment (round 2)

**Implementation Complete:** Yes

**Tests:** 1069/1069 passing across 59 files (GREEN). `npm run build` (tsc --noEmit && vite build)
clean. Baseline at RED was 1051 pass / 18 fail — the same 1051 still pass, and no test was deleted.

**Branch:** feat/rb4-6-enemy-inner-weave-y-axis @ `587a1cc` (pushed)

**The rework in one line:** TEA was right that the servo was not the bug — but the ROM had one more
fact in it than either round had found, and that fact is what let the fix land inside the ACs.

**Files Changed:**
- `src/core/enemy.ts` — `displayPos(enemy, eye)`, the world/display seam (`PLSTAT − UNIV4X`,
  :2909-2913). `P_ODLX`/`P_IDLX`/`P_IIDL` transcribed byte-exact; `WEAVE_SPEED_CAP`/`weaveSpeedCap`
  deleted; the servo accelerates the delta toward the zone TARGET (P.WCHK :2806-2864). The position
  integrates `delta/4` — UPDPLN's `JSR DIVBY4` (:2570-2581, :6170-6176). `enemy.y` is now an absolute
  ALTITUDE, seeded by STPLNE (:2310-2316) and clamped to UPDPLN's [PFPLOW, PFPHI] band (:2595-2611).
  `HORIZN` re-exported from `./topology`. The entry ramp is a plain countdown.
- `src/core/guns.ts` — `collides(shell, enemy, eye)` / `step(guns, targets, eye)` judge the shot in
  DISPLAY space, defaulting to the boresight so every existing two-arg caller is unchanged.
- `src/core/topology.ts` — `PFPHI` added beside `PFPLOW` (RBARON.MAC:449, its sibling equate).
- `src/main.ts` — the rb4-5 motion-object exemption RETRACTED; enemies drawn through `displayPos`;
  the gun given `toEye(flight)`; `WO_RTN` wired as the ace counter's seed; `worldBlimpTarget` lifts
  the (still display-space) airship so one collision pass serves both.
- `tests/core/enemy.test.ts`, `tests/shell/cockpit-draw-path.test.ts`,
  `tests/shell/prod-build-parity.test.ts` — sibling re-seats (see Design Deviations).

### The finding that unlocked it: UPDPLN's DIVBY4

Round 1 refused to transcribe P.ODLX/P.IDLX/P.IIDL and invented `sqrt(ACCEL·ilim)` instead. The
Reviewer proved the tables ARE recoverable (:20-27) — and was right — but the reason round 1
disbelieved them still stood: a 288-units/frame delta inside GMLEVL 0's ±64 window is absurd. It
isn't, because **the position never takes the raw delta**. `UPDPLN` puts it through `DIVBY4`
(:2573), a signed 16-bit `ROR/ROR` ÷4 (:6170-6176), so the tables are QUARTER-units per frame: 288 →
a 72-unit outer dash, 24 → a 6-unit middle coast. Against a 64-unit window that is a hard run home
and a gentle drift — the engagement the arcade plays. The scale was one `JSR` from the data.

### AC-R3 — the soft-lock guard, measured

Chasing pilot, 25 seeds/level, from the spawn frame, per life (the rig TEA specified):

| GMLEVL | avg frames in reach | of life-frames | bar |
|---|---|---|---|
| 0 | 599.2 | 600 | >10 |
| 1 | 124.3 | 245 | >10 |
| 2 | 28.2 | 123 | >10 |
| 3 | 22.1 | 83 | >10 |
| 4 | 11.6 | 62 | >10 |

Round 1 scored exactly 1.0 (the spawn frame) at GMLEVL 2/3/4. The ramp is the ROM's difficulty
curve falling out of the tables, not tuning. **GMLEVL 4's margin is thin (11.6 vs 10)** — logged as
a Question so nobody re-tunes the bar instead of reading it.

**What makes every level reachable is a ROM clamp, not a guard I invented:** UPDPLN bounds a plane's
world Y to [PFPLOW, PFPHI] = [128, 320] (:2595-2611), and the pilot's own eye rides [8, 384]. The
plane is always at an altitude the pilot can fly to. Mutation-proven: drop the band → 4 RED.

### Guards mutation-proven (each mutation reverted from a `cp` backup; CONTROL green; tree diffed clean)

| Mutation | Result |
|---|---|
| `collides` ignores the eye (restore the round-1 defect) | **3 RED** |
| `displayPos` ADDS the eye instead of subtracting | **13 RED** |
| Drop the UPDPLN altitude band | **4 RED** |
| Position takes the RAW delta (drop DIVBY4) | **1 RED** |
| `P_IIDL[0]` promoted 0 → 48 (the 0-is-valid trap) | **1 RED** |
| Entry ramp re-coupled to ΔX (round 1's clause) | **1 RED** |
| `WO_RTN` import removed from main.ts | **1 RED** |
| **`spawn` Y back to round 1's ±40 offset** | **0 RED — NOT GUARDED** (logged) |
| CONTROL (all restored) | 51/51 green |

### Three things the Reviewer should not take on trust

1. **The servo still reads the STORED position; the ROM reads the DISPLAY position.** This is a real,
   logged deviation, not an oversight — P.WINDW reads PLSTAT+8 (";X DISPLAY", :2867) and the block
   layout (:266-297) lists world and display as separate fields. I built the eye-aware servo and
   measured it before rejecting it: **it re-creates the soft-lock at GMLEVL 4 (0.0 frames in reach)**,
   because the ROM bounds the display position with PLONSN (:2877-2937), which we do not model.
   Decisively, AC-R3 — this story's whole deliverable — drives `step(e, lvl)` with no eye, so shipping
   the eye-aware servo would ship the game's real behaviour with ZERO coverage. That is exactly how
   round 1 shipped a soft-lock past 1051 green tests. Blocking Delivery Finding; the successor needs
   PLONSN **and** a re-written AC-R3.
2. **`spawn`'s STPLNE altitude is not behaviourally guarded** — I mutation-proved that myself and am
   reporting it rather than letting the mutation table imply otherwise. Reverting it to ±40 leaves all
   51 story tests green, because the UPDPLN clamp repairs it on frame 1. The clamp is load-bearing;
   the spawn only removes a one-frame teleport and makes the field's documented meaning true at frame 0.
3. **The ace cadence moved 12 → 4 frames** as a consequence of wiring WO.RTN honestly (:2736 seeds the
   counter :1078-1080 resolves on). The full suite — including dead-mechanics-wiring and
   ground-collision-wiring — is green, but this is a real difficulty change, and the ROM additionally
   fires the check ONCE per fly-past where we still repeat (logged).

**The bug that would have gone unnoticed:** two `vi.mock` passthroughs for `guns.step` re-declared the
signature as `(guns, targets)`, so the recorded cockpit collided from the origin the moment the gun
grew an eye — **no kill landed in the entire run**. Only `WRECK TRUTH`'s anti-vacuity assertion ("a kill
must land, or this guard is vacuous") caught it. A mock that copies a signature cannot track it.

**Handoff:** To Reviewer (Immortan Joe) for the review phase.

## Subagent Results (round 2)

Toggles (`pf settings get workflow.reviewer_subagents`): 4 enabled, 5 disabled. Every disabled
specialist's domain was assessed by the Reviewer directly — no coverage is claimed from an unrun agent.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1069/1069 pass in an isolated worktree, tsc clean, 0 behind / 4 ahead, no PR, zero smells — matches Dev's claims exactly) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths assessed by Reviewer: levelIndex clamp intact, empty-wave deref still guarded (closesPast(Infinity) false), stepWave index alignment sound (map preserves order, filter after), windowServo band tracing found the Y-pin annotation and the unbounded-heading spawn gap (confirmed 1, the [EDGE] Conflict) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer: the `eye` DEFAULT on `collides`/`step` is a silent fallback to round-1 semantics for any future caller that omits it; today the only production caller (main.ts:632) passes the eye and AC-R2/WRECK TRUTH cover the shipped wiring, so noted as a watch item, not a finding. Test `catch {}` blocks convert to `need()` failures — the house pattern, nothing swallowed |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (AC-R3 bypasses the real gun; zone-target consumption unguarded; spawnAltitude unguarded; WO_RTN guard import-only) + 7 verified-clean | confirmed 4, dismissed 0, deferred 0 — the AC-R3 finding independently extended by the Reviewer's own probe (real-collides margins 10.8 vs 11.6 at GMLEVL 4) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comment audit done by Reviewer: found the stale "biased toward HORIZN" phrase at enemy.ts:401 (confirmed 1, LOW); round 1's "never floored" contradiction is FIXED (the docstring now names the one-frame floor a deviation); the retraction comments and main.ts exemption retraction are accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker + Reviewer: readonly intact on every Enemy field, `??` correct on all three optional fields, `Math.sign(...) \|\| 1` correct (0 carries no direction), EYE_ORIGIN double-cast confirmed under rule #1 |
| 7 | reviewer-security | Yes | findings | 1 (clamp NaN propagation — latent, unreachable today; full producer trace confirms every Enemy x/y finite and levelIndex sanitizes the one external input) | confirmed 1 as LOW/non-blocking (corroborated by Reviewer: the fact is true, the reachability analysis is sound), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by Reviewer: round 1's two dead exports are RESOLVED (HORIZN re-export single home; WO_RTN consumed), `worldBlimpTarget` is a deliberate temporary with its deleter named (rb4-15), no dead code found in the diff |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation (rule #1: `as unknown as Vec3` on EYE_ORIGIN — cast-free form recompiled clean under the project tsconfig) + 2 awareness notes; 17 rules / 75 instances swept, all else compliant incl. the rb4 mandate (12/12 constants cited or labelled-inferred) and one-equate-one-home (9/9) | confirmed 1 (LOW — narrow, house-style fix proven), noted 2 (ENTRY_RAMP_FRAMES sweep auto-exemption; test-mirror casts documented) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled and self-assessed)
**Total findings:** 9 confirmed (1 HIGH, 5 MEDIUM, 3 LOW), 0 dismissed, 0 deferred

**Mutation-collision hygiene.** test-analyzer mutated the live tree and restored it (verified: live
tree `git status --short` clean at review end). The Reviewer ran every independent check — the ROM
re-decode, the PLNLVL tautology proof, and the real-collides reachability probe — in a detached
`git worktree` pinned to HEAD, restored its one mutation from a `cp` backup, deleted the probe file,
and verified the worktree diff-clean before removal.

## Rule Compliance (round 2)

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + the core/shell rule + the rb4
no-fabricated-constants mandate. Rule-checker swept 17 rules / 75 instances; Reviewer spot-verified.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type escapes | 8 sites: **1 violation** — `EYE_ORIGIN: Vec3 = Object.freeze([0,0,0]) as unknown as Vec3` (guns.ts:49); the cast-free form compiles clean (recompiled under project tsconfig, 4-element mismatch still caught) and guns.ts:307-308 already uses the cast-free pattern. Test-side `as unknown as` module casts are documented RED-contract shapes (precedented); the one `!` is locally proven | **FAIL (1, LOW)** |
| #2 readonly/generics | Enemy fields incl. new `deltaY?`/`entryFrames?`/`parallel?` all readonly; `Partial<Enemy>` is the builder pattern | PASS |
| #4 null/0-not-falsy | all 5 sites `??`-correct; table indexing never `\|\|`-defaulted, so P_IIDL[0]=0 survives at the DECLARATION — but its CONSUMPTION is unguarded (see #8) | PASS (code) |
| #5 modules | inline `type` imports throughout; `export { HORIZN }` is a value re-export | PASS |
| #7 async | test beforeAll house pattern only | N/A |
| #8 test quality | **FAIL — 5 findings**: AC-R3 never calls the production hit-test (mutation-proven green under round 1's exact defect); PLNLVL ramp pin tautological (local literal vs available export — Reviewer-proven); zone targets unguarded at point of use (`iidl \|\| 48`, `odlx * 2` both survive 1069 green); spawnAltitude unguarded; WO_RTN guard import-binding-only. Round 1's four vacuous guards ARE repaired (all re-verified biting) | **FAIL** |
| #9-#12 | no build/config/input/error/bundle surface in diff | N/A / PASS |
| #13 fix regressions | round-2 re-scan: the EYE_ORIGIN cast is the one fix-introduced escape; default-parameter back-compat verified against 8+ pre-existing 2-arg call sites | PASS (1 filed at #1) |
| **core/shell boundary** | all 4 src/core files: imports pure, no ambient state, RNG seeded only | PASS |
| **rb4 no fabricated constants** | 12/12 new constants cited-ROM or labelled-inferred; the three tables independently re-decoded by the Reviewer from the quarry (macros :19-27 × operands :2948-2956 under .RADIX 16 → exactly the shipped arrays); `WEAVE_SPEED_CAP`/`weaveSpeedCap` grepped to zero in src/ | **PASS** (round 1's FAIL is closed) |
| **one-equate-one-home** | 9/9 equates single-homed; HORIZN now a re-export with a structural guard that strips comments in the safe direction | PASS |

## Devil's Advocate (round 2)

Argue this code is broken. The strongest case is no longer the sky — it is the paperwork.

Start where round 1 ended: the guard. The suite's own header calls AC-R3 "the guard whose absence let
round 1 ship" and orders "Never delete this." Nobody deleted it; it was born unable to fire. It judges
reach with its own `hypot` circle against its own copy of the window radius, so the one function whose
regression it exists to catch — `guns.collides` — can revert to round 1's exact defect and AC-R3 stays
green. We proved that by doing it. Worse, the circle is BIGGER than the box: the story's public margin
at GMLEVL 4 (11.6 vs 10) is really 10.8 through the gun that actually fires. If a future story trims
WINDOW_Y for fidelity — and TEA round 2 explicitly flagged the window as un-ratified — the real margin
can cross under the bar while the headline guard applauds. That is round 1's disease with better
handwriting: a green suite narrating a game it is not measuring. And the ramp-coupling test beside it
asserts a hand-copied PLNLVL literal against itself — we mutated the REAL table and nothing blinked.

Now the sky, honestly: the pilot CAN win at every level — I measured it through the real gun, not the
suite's circle. But watch a long session. The plane's altitude servo coasts one-way into the ROM band
and parks there, so after a transient every plane flies at exactly 128 or 320 forever — the vertical
dogfight the ROM plays is a transient here, and no test says so out loud. And `heading` accumulates
without bound while every spawn is pinned near world zero: a player who circles for a minute clears
the wave and the next plane materializes half a world off-boresight. Recoverable, yes. The arcade
never did that — STPLNE spawns AT the pilot's pan. Both are consequences of the one honest deviation
this round logged, and both belong in the successor's problem statement, not in silence.

The verdict below rejects none of the machine. It rejects the scenery around it — because this epic's
entire lesson is that scenery compounds.

## Round-2 Reviewer Assessment (REJECTED — superseded by round 3)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | [TEST] AC-R3, the story's headline regression guard, never exercises the production hit-test — it reimplements reach as `hypot <= 32*sqrt(2)` (circumscribed circle) instead of calling `guns.collides`/`guns.step`. Mutation-proven: reverting `collides` to ignore its eye (round 1's exact defect) leaves all 6 AC-R3 tests GREEN. The circle overestimates the rotated 32×32 box — through the REAL `collides` the margins are 597.3/112.5/24.1/20.2/10.8 (vs hypot's 599.2/124.3/28.2/22.1/11.6), so GMLEVL 4 clears by 0.8 frames, not 1.6. Round 1's prescription was explicit: "spawn → stepWave → guns.step must land a hit at EVERY GMLEVL". **The production fix is real — the Reviewer's probe through the real gun clears every level — so this is a guard rewrite, not a code fix** | tests/core/display-space.test.ts:229-256 | Inside the chase loop, judge reach with the real gun: `collides({x:0, y:0, z: e.depth/256}, e, eye)` (or drive `guns.step`), and step the wave via `stepWave` so drones ride the same guard. Keep the >10 bar; expect GMLEVL 4 ≈ 10.8 |
| [MEDIUM] | [TEST] `windowServo`'s outer and inner zone targets unguarded at point of use: `target = iidl \|\| 48` (the exact 0-is-valid trap P_IIDL's doc warns about) and `target = odlx * 2` both survive the full 1069-test suite. Only the middle band has a convergence test | src/core/enemy.ts:457-462 | Clone the P_IDLX convergence test for the outer zone (delta settles at ∓P_ODLX[lvl] at the wall) and inner zone at GMLEVL 0 (delta settles at exactly 0) |
| [MEDIUM] | [TEST] The ramp-coupling test is tautological: asserts `PLNLVL[5] === 2` on its own local literal; `scoring.ts:34` exports the real table. Reviewer-proven: real PLNLVL[5] 2→1 leaves all 11 tests green | tests/core/display-space.test.ts:259-266 | Import PLNLVL from scoring.ts and assert on the export |
| [MEDIUM] | [TEST] `spawnAltitude` (STPLNE transcription, fully cited) has zero coverage — reverting to round 1's ±40 offset leaves 1069 green. A citation with no test is scenery (self-reported by Dev; confirmed) | src/core/enemy.ts:271-276 | Seeded-Rng test pinning the output band [PLANE_ALT_MIN, PLANE_ALT_MAX] and one exact byte-algorithm value |
| [MEDIUM] | [TEST] `WO_RTN is actually WIRED` is an import-binding regex — re-seeding all three sites from ACE_ATTACK_FRAMES with the import alive stays green (self-reported; confirmed; the collapse is caught only incidentally by ace-wiring) | tests/core/enemy-machine.test.ts:442-468 | Behavioural pin: armed ace resolves nothing for WO_RTN−ACE_ATTACK_FRAMES−1 frames, then resolves on the next |
| [MEDIUM] | [EDGE] Undocumented deviation, newly live with the seam: `spawn` places X about the world origin; ROM STPLNE places it about UNIV4X (:2291-2297), and `flight.heading` is unbounded — a drifted pilot meets the next wave arbitrarily far off-boresight. Recoverable (not a soft-lock), invisible to AC-R3 | src/core/enemy.ts:392-397 × src/core/flight.ts:208 | Logged in the deviation audit; route to the PLONSN successor (the eye-aware spawn shares that seam). No change required this story |
| [LOW] | [RULE][TYPE] `as unknown as Vec3` double-cast on EYE_ORIGIN — rule #1's named pattern; the cast-free form compiles clean under the project tsconfig and this same file already uses it (guns.ts:307-308) | src/core/guns.ts:49 | Delete the cast |
| [LOW] | [DOC] Stale comment: spawn's `deltaY: 0` says the Y machine starts "biased toward HORIZN" — the ruling shipped it UNBIASED and the HORIZN block above says so | src/core/enemy.ts:401 | Reword to "starts from rest; the servo is unbiased (see HORIZN above)" |
| [LOW] | [SEC] `clamp(NaN)` propagates NaN — latent only (every producer finite, levelIndex sanitizes; security's full trace + Reviewer concur) | src/core/enemy.ts:346 | Optional one-liner in the same pass: `Number.isNaN(v) ? lo : …` |

**No findings from:** [SILENT] — assessed directly; the `eye` default on `collides`/`step` is a
watch-item silent fallback, covered today by AC-R2 + WRECK TRUTH and main.ts passing the eye; nothing
swallowed. [SIMPLE] — assessed directly; round 1's dead exports are resolved, no new dead code.

**VERIFIED (evidence + rule compatibility):**
- [VERIFIED] The three tables are byte-exact — Reviewer re-decoded them from the quarry independently:
  `.MACRO .2WORD/.3WORD` (:19-27) × operands (:2948-2956) under `.RADIX 16` (:74) assemble to exactly
  P_ODLX=[288,280,264,248,256], P_IDLX=[24,60,84,108,132], P_IIDL=[0,48,72,120,192] = enemy.ts:91/94/101,
  with the `.LEVLS*2`/`.LEVLS*4` zone offsets (:2791/:2797, `.LEVLS=5` :504) landing on the contiguous
  tables. Complies with the rb4 mandate; round 1's HIGH is CLOSED.
- [VERIFIED] DIVBY4 is real and correctly ported — UPDPLN (:2570-2593) feeds each 16-bit delta through
  DIVBY4 (:6170-6176), `CMP I,80 / ROR / ROR TEMP2` twice = signed ÷4; `windowServo` integrates
  `newVel / DELTA_SCALE`, DELTA_SCALE = 4 (enemy.ts:469).
- [VERIFIED] The altitude band is the ROM's — PFPLOW=80*4 / PFPHI=140*4 (:448-449); UPDPLN clamps ONLY
  the Y it integrates (:2586-2611); [128,320] = equates × the pre-existing ALT_TO_Y (flight.ts:119);
  pilot's PLYMIN/PLYMAX (:446-447) = [8,384] ⊃ band. One conversion, no second copy.
- [VERIFIED] `displayPos` is the ROM's display seam — `LDA ZX,PLSTAT / SBC ZX,UNIV4X` per axis
  (:2906-2936), Y subtracting I4YPOS = UNIV4X+2 (:90-91); enemy.ts:376-378 subtracts the same pair, and
  draw (main.ts:207-209) and kill (guns.ts:413-418) consume the SAME function — the seam cannot drift.
- [VERIFIED] WO.RTN wiring matches the ROM's mechanism — :2736-2737 seeds PLSTAT+7 = 0x10 at fly-past;
  :1078-1080 resolves at exactly 0x0C; the 4-frame delay is ROM arithmetic. The repeat-per-pass
  divergence is logged (ROM resolves once, `BNE 25$`).
- [VERIFIED] FREPAR coupling — `AND I,0EF` + `JSR FREPAR` fire the frame PLSTAT+14/15 ramps to zero at
  ±0x40/frame (:2634-2653), delta never consulted; stepWave frees on `postLead.entryFrames === 0` or no
  live lead (:5587's kill site) — waves.ts:700-718.
- [VERIFIED] **Production reachability is real through the real gun** — Reviewer probe (AC-R3's chase
  rig, 25 seeds/level, real `collides` with a boresight shell at the plane's depth): 597.3 / 112.5 /
  24.1 / 20.2 / 10.8 frames-in-reach per life, every level > 10. The round-1 CRITICAL is fixed in
  production; only its guard is defective.
- [VERIFIED] Test counts honest — preflight re-ran in an isolated worktree: 59 files / 1069 pass,
  `tsc --noEmit` exit 0, branch 0 behind / 4 ahead of origin/develop, no PR, no smells.
- [VERIFIED] Round 1's four vacuous guards all bite now — test-analyzer re-mutated each: deactivation
  coupling (6 RED across 2 files), both drone guards (RED at the precondition, not 0===0), and the two
  mock passthroughs forward + record the eye (TARGET/WRECK TRUTH catch an origin-eye main.ts).

**Challenge of VERIFIEDs against subagent findings:** test-analyzer's AC-R3 finding contradicts Dev's
mutation table ("collides ignores the eye → 3 RED" — measured: 2 RED, both AC-R2), and I adopted the
subagent's number after my own probe agreed with its mechanism; no VERIFIED above rests on that row.
My "production reachability" VERIFIED uses my own probe THROUGH the real gun precisely so it cannot
inherit AC-R3's blind spot. rule-checker's EYE_ORIGIN recompile beats my own weaker fix suggestion
(I proposed keeping a cast; its cast-free proof is strictly better) — adopted theirs.

**Data flow traced:** trigger → `fire()` seeds `Shell{x: ±muzzle, y: 0}` → `guns.step(guns, targets,
eyeNow)` advances z and asks `collides(shell, enemy, eye)` → `displayPos(enemy, eye)` subtracts the
pilot's pan/altitude → offset rotated into the banked frame, gated on the 32×32 window; meanwhile
`stepWave → step → windowServo` moves the same enemy in world space and `draw` renders it through the
SAME `displayPos`. Producer and consumer are joined by one function — safe by construction, and
measured live by the Reviewer's probe.

**Pattern observed:** the good — one `windowServo` called twice (enemy.ts:497-498) mirroring P.WITR's
`DEX/DEX` re-entry, and one `displayPos` shared by draw and kill. The bad — a regression guard that
REIMPLEMENTS its consumer instead of calling it (display-space.test.ts:243), which is the mock-copies-
a-signature trap wearing a geometry hat.

**Error handling:** `step()` total and idempotent (`if (!enemy.active) return enemy`, enemy.ts:489);
degenerate GMLEVL clamped by `levelIndex`; `collides` returns false (never throws) on NaN offsets;
the one latent gap (`clamp(NaN)`) is unreachable today and filed LOW.

**Round-trip note:** every round-1 blocking finding is CLOSED — the display seam is real and measured,
the tables are transcribed and re-decoded independently, the four vacuous guards bite, HORIZN has one
home, WO_RTN is wired. This rejection is narrower: the round-2 guard set has one guard that cannot see
the production gun, one tautological pin, and three self-reported-or-found coverage gaps. All five are
test-side; the three LOWs are one-line source edits that can ride the same rework.

**Handoff:** Back to TEA (Imperator Furiosa) — the findings are testable (they ARE tests), so this
routes red, not green. No production behaviour change is required; expect GMLEVL 4 to measure ≈ 10.8
through the real gun, and do not re-tune the bar to widen that margin.

## TEA Assessment (round 3 — rework RED)

**Tests Required:** Yes
**Status:** RED (1 failing / 1074 passing across 59 files; `tsc --noEmit` clean; testing-runner
verified, failing test name corroborated against TEA's own direct run)

**Baseline discipline.** Round 2 ended at 1069/1069. Round 3 is 1075 tests: the same 1069 still pass
(two of them rewritten in place — AC-R3's five levels and the ramp pin — remain green because the
production machine is correct), 6 are new, and exactly ONE fails by design. Commit `0d3865a` (pushed).
Tree diff is tests-only — TEA touched no source.

**The round in one line:** the review proved the round-2 guards were watching a reflection; every
guard now watches the machine, and each one is mutation-proven against the exact defect the review
named.

**Test Files:**
- `tests/core/display-space.test.ts` — AC-R3 REWRITTEN: reach is judged by the real `guns.collides`
  (boresight shell at the plane's exact depth) and the wave advances through the real `stepWave`; the
  hypot circle is demoted to AC-R2's "definitely outside" offset with a comment recording why. The
  ramp pin asserts `scoring.ts`'s exported PLNLVL, not a local literal.
- `tests/core/enemy-machine.test.ts` — 4 new guards + 1 designed-RED: OUTER target consumed (GMLEVL-0
  altitude-floored ΔY → −P_ODLX[0], with the derivation of why X cannot host this pin), INNER target
  consumed (ΔX → +P_IIDL[2] inside the window), the P_IIDL[0]=0 dead stop end-to-end (kills `|| 48`),
  STPLNE's spawn altitude pinned by its own carry-recoverable bit-twiddle identity (msb ≡
  (lsb&1)+1+(lsb<0x80) for every unclamped spawn — no golden float, no RNG mirroring, anti-vacuity
  floor of 50 unclamped seeds), and **the one RED**: `step()` must return finite x/y for a NaN
  fixture (clamp() propagates NaN today — the review's [SEC] finding, Dev's one-line fix).
- `tests/ace-wiring.test.ts` — the WO.RTN re-entry delay pinned BEHAVIOURALLY from the recorded
  frames: first attack exactly WO_RTN − ACE_ATTACK_FRAMES = 4 calc frames after arming, and the
  shipped 4-frame reseed pinned as a conscious guard on a logged ROM divergence.

**Every guard mutation-proven** (cp backups, serial, CONTROL green at 1074/1075, tree diff clean):

| Mutation (the review's own exhibits) | Round 2 | Round 3 |
|---|---|---|
| `collides` ignores its eye (round 1's defect) | AC-R3 green (2 RED elsewhere) | **7 RED** — all 5 AC-R3 levels + AC-R2's 2 |
| `target = iidl \|\| 48` in windowServo | 1069 green | **RED** (dead-stop pin) |
| `target = odlx * 2` in windowServo | 1069 green | **RED** (outer ΔY pin) |
| spawnAltitude → round 1's ±40 offset | 1069 green | **RED** (twiddle identity) |
| all 3 `aceCountdown = WO_RTN` sites → ACE_ATTACK_FRAMES | regex guard green | **RED** (delay pin) |
| scoring.ts PLNLVL[5] 2 → 1 | 11/11 green | **RED** (export pin) |

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test quality | all 5 review findings repaired; each mutation-proven above | done |
| #4 0-is-valid | `P_IIDL[0] = 0 is CONSUMED as a dead stop` — the trap pinned at the point of USE, not just the export | passing (guard) |
| #11 totality | `step() returns finite x/y for a NaN fixture` | **RED — drives Dev** |
| rb4 no fabricated constants | STPLNE identity pin (a transcription now has a test); zone targets consumed through step() | passing (guards) |

**Self-check (Phase C):** the near-miss this round was the Reviewer's own prescription — the outer-zone
X-axis convergence test is UNWRITABLE against the shipped machine (position clamp makes outer a
one-frame event), and written naively with a tolerance it would have been born permanently green: the
exact scenery class this rework exists to kill. Derived first, re-seated the pin onto the Y axis where
the target is genuinely consumed, and logged the deviation + a Delivery Finding (P_ODLX X-inertness →
PLONSN successor). All six new tests carry anti-vacuity floors or exact-equality asserts; none reads
source except via the established comment-stripping guards (untouched this round).

**Handoff:** To Dev (The Word Burgers) for GREEN. [round 3]
**Contract:** make the ONE red test green by hardening `clamp` (enemy.ts:346) to be NaN-safe —
`Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))` or equivalent; no behaviour change for finite
inputs (1074 greens must stay green). While in there, take the review's two remaining LOWs in the same
pass: delete the `as unknown as Vec3` double-cast (guns.ts:49 — the cast-free
`const EYE_ORIGIN: Vec3 = Object.freeze([0, 0, 0])` is PROVEN to compile under the project tsconfig;
rule-checker verified, and guns.ts:307-308 already uses the pattern) and reword the stale
"biased toward HORIZN" comment at enemy.ts:401 (the servo is unbiased by user ruling). Expected end
state: 1075/1075, `tsc --noEmit` clean, no new constants, no test edits.

## Dev Assessment (round 3)

**Implementation Complete:** Yes

**Tests:** 1075/1075 passing across 59 files (GREEN). `npm run build` (tsc --noEmit && vite build)
clean. Baseline at RED was 1074 pass / 1 fail; the one designed-RED test (NaN totality) is green and
nothing else moved. No test file was edited.

**Branch:** feat/rb4-6-enemy-inner-weave-y-axis @ `1b52f28` (pushed)

**Files Changed** (6 insertions, 3 deletions — TEA's contract verbatim):
- `src/core/enemy.ts:346` — `clamp` is NaN-safe: `Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))`,
  with a comment stating the constraint (Math.min/max propagate NaN, and a NaN reaching x/y persists
  across frames). Finite inputs take the identical path — the other 1074 tests prove no behaviour moved.
- `src/core/guns.ts:49` — the `as unknown as Vec3` double-cast deleted:
  `const EYE_ORIGIN: Vec3 = Object.freeze([0, 0, 0])` compiles clean exactly as rule-checker proved
  (contextual typing narrows the tuple literal through Object.freeze's generic).
- `src/core/enemy.ts:401` — spawn's `deltaY` comment corrected: the Y servo is UNBIASED (user ruling);
  the stale "biased toward HORIZN" phrase — the twice-killed misreading — is gone.

**Nothing for the Reviewer to take on trust this round:** no new constants, no signature changes, no
ROM claims. The three edits are the review's own LOW table, and the RED→GREEN flip of the totality
test is the only observable delta.

**Handoff:** To Reviewer (Immortan Joe) for the review phase. [round 3]

## Subagent Results (round 3)

Toggles unchanged: 4 enabled, 5 disabled — every disabled specialist's domain assessed by the
Reviewer directly. INDEPENDENCE NOTE: this round's tests (TEA) and source fixes (Dev) were authored
by the SAME session now reviewing them; per the sidecar lesson, the enabled subagents' independent
mutation runs are the review's evidentiary backbone, and every round-3 claim was re-verified by an
agent that did not write it.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1075/1075 in an isolated worktree, tsc + vite build clean, branch synced with its remote and 6 ahead of origin/develop, zero smells in the delta, no PR) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer assessed the delta's edges: clamp's ±Infinity/-0 paths unchanged (security's trace concurs), the spawn-identity clamp-skip branch (raw === PFPLOW) correctly excludes the one unrecoverable case, AC-R3's wave-empties loop bound is sound |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — Reviewer assessed: no new catches/fallbacks in the delta; the new beforeAll try/catch mirrors the adjudicated house pattern and converts to need() failures |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 medium-high: NaN deltas unclamped + comment overclaim; 3 low/informational: AC-R3 z-vacuity, WINDOW_Y sensitivity by level, ace comment precision) + ALL 5 round-3 mutation-claim sets independently CONFIRMED (incl. the carry-drop catch and the 7-RED collides mutation) with control 1075/1075 and clean tree | confirmed 3 (routed as non-blocking Delivery Findings), noted 1 (WINDOW_Y sensitivity — informational, the guard's new capability working as documented), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer assessed the delta's comments: the clamp comment OVERCLAIMS totality (confirmed via test-analyzer's finding — logged), the corrected HORIZN comment now matches the ruling, the AC-R3/MAX_REACH retitling is accurate, citations in new tests verified against the quarry in rounds 2-3 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker: the cast deletion verified by scratch tsc --strict compile; mirror fields match the real Enemy exactly; no new escapes in 35 instances |
| 7 | reviewer-security | Yes | clean | none — clamp change strictly additive (finite/±Inf/-0 identical, all 4 callers traced), EYE_ORIGIN runtime-identical and never mutated, new tests core-only and deterministic, no secrets | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — Reviewer assessed: the delta is 3 one-liners + tests; no dead code, no over-engineering; the retired hypot judgment was correctly DEMOTED to AC-R2's offset helper rather than left as scenery |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations across 16 rules / 35 instances; round-2's one violation (EYE_ORIGIN cast) verified FIXED by independent compile; anti-vacuity floor brute-forced sound (144/200 unclamped vs floor 50); ACE_ATTACK_FRAMES resolves through the mock spread; test-local PFPLOW literal adjudicated as PIN discipline per house precedent | N/A (2 informational notes recorded: thin-but-deterministic GMLEVL-4 margin; pre-existing stylistic cast difference outside the delta) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled and self-assessed)
**Total findings:** 3 confirmed (all non-blocking, routed to Delivery Findings), 1 noted, 0 dismissed, 0 deferred

## Devil's Advocate (round 3)

Argue this code is broken. Three rounds in, the honest attack surface is narrow, so aim at what
approval would wave through.

First: the reviewer wrote this round. TEA-me designed the guards, Dev-me applied the fixes, and
Joe-me now grades them — the cleanest conflict of interest in the pipeline. If the subagents had
rubber-stamped, this approval would be worthless. They did not: test-analyzer re-ran every mutation
from scratch and came back with a finding the author missed — the NaN fix protects positions while
velocities sail through unclamped, and the fix's own comment claims a totality it does not have.
That is a fix introducing a small lie, the exact species this epic exists to exterminate. Why
approve over it? Because the lie is one adverb wide, the state it mislabels is unreachable from
every production producer (spawn seeds zero deltas; finite-in→finite-out arithmetic; two
independent traces agree), and round 2 itself rated the whole NaN class LOW with "optional
one-liner" as the ask. Rejecting a third time over an adjacent latent edge the spec never named
would be moving the goalposts after the kick.

Second: the thin margin. GMLEVL 4 clears its bar by 0.8 deterministic frames. A future innocent
change — a window ratification, a table correction — will flip that level red, and someone under
deadline will want to nudge the bar. Every comment in the file now says don't. That is all a test
can do: fail loudly in front of the right sentence.

Third: what nobody measured — the guard rewrite could itself have a blind spot. Probed: WINDOW_Y
shrink now bites at the levels where margins are tight (2/3/4), which the old circle version caught
NOWHERE; the z-gate is vacuous here by construction and disclosed. The residue is logged, not
hidden. Approve.

## Reviewer Assessment

**Verdict:** APPROVED

**What was reviewed:** round 3 of rb4-6 — the guard-rewrite RED (commit `0d3865a`, tests only) and
the three-line GREEN (`1b52f28`) — on top of the round-2 full-branch review whose every blocking
finding this round closes. Full-branch diff re-snapshotted; no upstream supersession; toggles
unchanged.

**Round-2 findings — all CLOSED and independently confirmed:**
- [TEST] AC-R3 now judges reach through the REAL `guns.collides` and advances via the REAL
  `stepWave`; the collides-ignores-eye mutation (round 1's defect) yields **7 RED** where round 2's
  guard gave zero. Confirmed by test-analyzer's own run, not the author's.
- [TEST] The ramp pin asserts `scoring.ts`'s exported PLNLVL — the real-table mutation now bites.
- [TEST] Zone-target consumption pinned end-to-end: `odlx * 2`, `iidl * 2`, and `iidl || 48` each
  turn exactly the intended guard RED (outer via the GMLEVL-0 altitude-floored ΔY, the one place the
  shipped machine consumes P_ODLX — the X-axis inertness derivation was verified and the deviation
  ACCEPTED).
- [TEST] STPLNE's spawn altitude pinned by its carry-recoverable output identity — catches both the
  ±40 revert AND the subtle carry-drop mutation; anti-vacuity floor brute-forced sound (≈25.4% of
  bytes clamp; 144/200 seeds exercise the identity vs a floor of 50).
- [TEST] WO.RTN's 4-frame delay pinned behaviourally from recorded frames; the all-sites revert
  mutation goes RED where round 2's import-regex stayed green.
- [SEC] `clamp` is NaN-safe; the designed-RED totality test flipped green with the fix and RED with
  it reverted (non-vacuous both ways).
- [RULE] [TYPE] The `as unknown as Vec3` double-cast is GONE — cast-free form independently
  recompiled clean under the project tsconfig.
- [DOC] The stale "biased toward HORIZN" comment is corrected and its citation verified in place.

**New findings this round (all non-blocking, logged as Delivery Findings):** the clamp comment
overclaims totality while NaN DELTAS flow unclamped into `bank` (latent, production-unreachable —
same class round 2 rated LOW; comment fix + optional vel guard routed forward); AC-R3's z-gate is
vacuous by construction (disclosed; one clarifying line requested); the ace-wiring comment should
name the specific regex guard it indicts. [EDGE] and [SILENT] domains re-assessed directly with no
defect; [SIMPLE] found no dead code — the demoted hypot helper retains its one honest job.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + core/shell + the rb4
mandate, applied to the round-3 delta (the full branch was enumerated in rounds 1-2; round 2's table
stands for the unchanged remainder).

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type escapes | 3 in delta: EYE_ORIGIN cast REMOVED (independent tsc --strict compile, 0 diagnostics); the one new test-side `as unknown as` follows the round-2-adjudicated contract-cast idiom; zero `as any`/`!` on added lines | PASS — round 2's FAIL is closed |
| #2 generics/readonly | mirror fields `readonly deltaY?`/`entryFrames?` match the real Enemy exactly; WavesModule matches the real stepWave signature | PASS |
| #4 null/0-not-falsy | `Number.isNaN` (house style, not global isNaN); twiddle identity uses ternaries, no `\|\|` on possibly-0; the dead-stop test EXISTS to prove 0-is-valid at the point of use | PASS |
| #5 modules | 3 new static imports verified: PLNLVL (real export), WO_RTN (unmocked module), ACE_ATTACK_FRAMES (resolves through the `{...real}` mock spread — verified) | PASS |
| #7 async | new beforeAll block mirrors the sibling pattern | PASS |
| #8 test quality | every new guard mutation-proven by an INDEPENDENT agent; anti-vacuity floor derived sound; exact-value assertions throughout; GMLEVL-4 bar thin (10.8 > 10) but deterministic, with re-tuning forbidden in place | **PASS — round 2's FAIL is closed** |
| #9-#12 | no build/config/input/error/perf surface in the delta; AC-R3's real-gun loop is bounded (25×600×5) | N/A / PASS |
| #13 fix regressions | all 3 fixes re-scanned: clamp strictly additive on finite paths (traced by security + rule-checker), cast removal tightens types, comment fix cites a real section. ONE fix-introduced defect found: the clamp comment's totality overclaim — LOW, logged, non-blocking | PASS (1 LOW routed) |
| **core/shell boundary** | new test imports are core-only; no Date.now/Math.random/DOM in delta (grepped) | PASS |
| **rb4 no fabricated constants** | 4 new test literals verified: RAW_MAX=0x37F derived from the cited twiddle; test-local PFPLOW matches topology.ts:396 byte-for-byte (PIN discipline per house precedent — importing what you check is the tautology this round fixed); delay=4 derived from the two cited equates; table bounds pulled from live exports | PASS |
| **one-equate-one-home** | no new src/ constant homes; the test-side PFPLOW literal adjudicated compliant (rule-checker, precedent named) | PASS |

**VERIFIED (evidence + rule compatibility):**
- [VERIFIED] Test counts and build honest — preflight in an isolated worktree: 59 files / 1075
  pass, tsc + vite build clean, branch synced with remote. Complies with #9 (no config drift).
- [VERIFIED] All six round-3 mutation claims reproduced by an agent that did not author them —
  including the two the author never ran (carry-drop on the twiddle; `iidl * 2` on the inner zone).
  Complies with #8 (guards RED on the defect they name).
- [VERIFIED] The clamp fix changes NO finite-input behaviour — the false branch is byte-identical
  to the old expression; all four callers traced (levelIndex pre-sanitizes, spawnAltitude always
  finite, windowServo's clamp is the live conversion, step's altitude clamp receives pre-sanitized
  input). Security and rule-checker traced independently and agree. Complies with #4 and the rb4
  mandate (no behavioural drift smuggled in a fix).
- [VERIFIED] EYE_ORIGIN is runtime-identical (still frozen, never mutated at either use site) and
  the type now checks WITHOUT an escape — complies with #1, and with the house pattern at
  guns.ts:307-308 it now matches.
- [VERIFIED] The WO.RTN delay pin measures the mechanism, not the import — delay = WO_RTN −
  ACE_ATTACK_FRAMES = 4 asserted from recorded beginPass/evade frames; static constants resolve
  correctly through the vi.mock spread (rule-checker verified). Complies with #5 and #8.
- [VERIFIED] The cockpit determinism fingerprint (53) is untouched by this round — the suite is
  green with no test edits in the GREEN commit, and the only source changes are NaN-path-only and
  type-level. Complies with the fingerprint guard's own re-read protocol (no re-pin occurred).

**Challenge of VERIFIEDs against subagent findings:** test-analyzer's Finding D (NaN deltas) does
not contradict any VERIFIED — the totality VERIFIED above is scoped to x/y, which is exactly what
the test asserts and what the finding confirms; the defect is the source COMMENT's wider claim,
logged as a finding rather than verified around. Its nuance on the ace comment CORRECTS the round-3
test comment's framing (the BEFLAG test did catch the class at 587a1cc) — adopted as a Delivery
Finding; no VERIFIED relied on the mischaracterization.

**Data flow traced:** trigger → `fire()` → `guns.step(guns, targets, toEye(flight))` →
`collides(shell, enemy, eye)` → `displayPos` — and now the SAME chain is exercised per level by
AC-R3's chase loop with a boresight shell, so the seam that round 1 shipped broken is guarded by
the production functions themselves (safe because producer, consumer, AND guard share one
projection).

**Pattern observed:** the good — a guard that CALLS what it guards (display-space.test.ts:314,
`collides` inside the chase loop), and a spawn pin that recovers the algorithm from its own output
instead of mirroring the RNG (enemy-machine.test.ts:344-366). The bad, prevented — the fix's
comment overclaiming its scope (enemy.ts:346), caught by independent review before it aged into
"documented behaviour".

**Error handling:** `step()` now total on degenerate positions (NaN → band floor, mutation-proven
both directions); deltas remain the one unguarded field — latent, logged, non-blocking.

**Handoff:** To SM (The Organic Mechanic) for finish-story. Reviewer does NOT create or merge the
PR — SM owns the finish flow. Three non-blocking Delivery Findings ride forward; the PLONSN
successor inherits the display-space servo, the spawn-about-UNIV4X gap, and the once-per-fly-past
ace shape, all logged.