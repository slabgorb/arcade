// src/core/tie-status.ts
//
// Task 1 of the TIE-VM-wiring plan (sw7, docs 4c93855) — computeStatus: the
// status-word computer for the GATED bits of a TIE's live A$CHST
// (WSCPU.MAC:16-38) that the choreography VM (tie-vm.ts) tests via .CIF/
// .CUNTIL — the ones the VM engine itself does not (and should not) know how
// to derive, since it only interprets the bytecode against whatever status
// word its caller hands it. sw7-24 added C_PV (the player's VIEW of the
// alien) because the §6 fire gate consumes it; uf1-12 added C_PS (the
// player's SIGHTS — his crosshair, WSMAIN.MAC:3930) because TCH1DZ's loiter
// loop gates on it in four places. BOTH are measured from the COCKPIT as of
// sw8-8: uf1-12 landed while sw8-8 was in review and built C_PS on the
// `spaceEye` camera copy, which sw8-8 then retired (ST.UX is the starfield's
// register, never a viewer — see the tombstone in gameRules.ts). The player's
// view, his crosshair, his gun and his hit sphere are one point.
//
// The three bits still absent are correctly absent, and for TWO different
// reasons — keep them apart, because a sweep that merges them draws the wrong
// conclusion (uf1-12's review caught this file doing exactly that):
//
//   - C_AD is dead DESIGN LANGUAGE. WSCPU.MAC:28 annotates the equate
//     "/PLEASE DELETE/" and the whole 1983 tree holds ZERO `CHSET C$AD`.
//     Deriving it would be inventing cabinet behaviour.
//   - C_AV and C_PM ARE set by the cabinet — `CHSET C$AV` at WSCPU.MAC:613
//     ("ALIEN HAS PLAYER IN FRONT VIEW", in the same routine as the C$AS
//     gate) and `CHSET C$PM` at WSMAIN.MAC:3780 ("PLAYER MIDDLE DISTANCE",
//     seven lines above the C$PN setter this file DOES port at :3787). What
//     they lack is a CONSUMER: the assembled choreography gates on neither
//     (tie-vm.ts holds them only as equates, :41 and :48), so deriving them
//     would be dead computation, not fidelity. If a future program revision
//     ever gates on one, it becomes a real gap — these two are the pair to
//     look at first, and the ROM already tells you where the setter is.
//
// PURE src/core: no DOM, no wall clock, no Math.random — every random bit
// comes from the Rng the caller threads through the sim (the same discipline
// sim.ts is held to). WIRED: stepGame's decision tick status-computes every
// live enemy each game frame and feeds both the VM and the §6 fire gate.

import { Status } from './tie-vm'
import { TIE_HIT_RADIUS, type Enemy, type GameState } from './state'
import { aimDirection, beamHit, COCKPIT, FOV_Y } from './gameRules'
import { nextInt, type Rng } from '@shared/rng'
import { length, dot, sub, scale, IDENTITY, type Vec3 } from '@shared/math3d'

/**
 * Convert one of the ROM's SQUARED M$PSB2 thresholds — a literal exactly as it
 * appears in a `CMPD`/`CMPU` against `M.xPS` — into world units.
 *
 * M$PSB2 is math box PC $67 (WSGLOB.MAC:177, `M$PSB2 ==19C/4`), and Jed Margolin
 * documents that program himself at SWMP.DOC:140-158 ("PRE2"): translate and HALVE
 * each axis (`XT = (XIND-XT1)/2`; the constant is `HALF=$E000`, "actually -1/2",
 * SWMP.DOC:307), rotate into the viewer's frame, then square (`XPS = XP*XP` …).
 * Two scalings therefore sit between the literal and the world:
 *
 *   the halving     XP,YP,ZP are HALF the true offsets                → ×2 the radius
 *   the multiplier  SWMP.DOC:17 "In the Multiplier, 4000H * 4000H = 4000H" → a·b/$4000
 *
 *   ⇒ world = 2 · sqrt(S · $4000)
 *
 * CROSS-VALIDATED, not asserted. WSMAIN.MAC:3772-3788 pushes the identical PRE2
 * output through the identical squaring for two OTHER thresholds, and this chain
 * lands both on exact round hex — $900 ("PLAYER MIDDLE DISTANCE") → $3000, $100
 * ("PLAYER NEAR") → $1000. A chain missing either scaling misses both; the pair is
 * run, not reasoned about, in tie-aim-axis.test.ts.
 *
 * Radix is hex (WSCOMN.MAC:5 `.RADIX 16`), and raw ROM units ARE our world units,
 * so nothing further scales the result.
 */
export function psb2SquaredToWorld(squared: number): number {
  return 2 * Math.sqrt(squared * 0x4000)
}

/**
 * C_AS's aim CYLINDER — the perpendicular distance from the alien's nose axis
 * within which the player counts as "in its sights".
 *
 * The gate is WSCPU.MAC:604-618: `LDA #M$PSB2 / JSR MGOWT ;VIEW PLAYERS SHIP`, then
 * `LDD M.YPS / ADDD M.ZPS / CMPD #20 ;?AIMING NEAR SHIP? / BHI 140$` (:615-618).
 * That is neither a screen-space test nor a cone, and both halves of that were read
 * off primary source rather than argued (uf1-15):
 *
 *   - NO PERSPECTIVE DIVIDE RUNS. PRE2 (PC $67) rotates and squares and stops; the
 *     perspective multiply is a different program — "PERS", PC $86, SWMP.DOC:180-186,
 *     "YP = YP * XP (SCREEN X)" — which this path never calls. docs/mathbox.md:170-175
 *     says the same from the disassembly side: $67 is the view transform "plus
 *     Reg38=X²,Reg39=Y²,Reg3A=Z²", while "the perspective divide … that yields screen
 *     coordinates the AVG can draw" is a separate $AE/$B0. So M.YPS/M.ZPS are squares
 *     of VIEW-space offsets, not of screen coordinates.
 *   - THE TEST CARRIES NO DEPTH TERM. `M.YPS + M.ZPS` is compared against a CONSTANT.
 *     The sibling ratio tests do divide by depth, by subtracting it — `LDD M.YPS /
 *     SUBD M.XPS` (WSMAIN.MAC:3834-3841 for C$PV, WSSTAR.MAC:135-139 for the
 *     starfield) — and THOSE are the ±45° cones. C$AS is not one of them.
 *
 * A lateral+vertical bound with no depth term is a cylinder about the nose axis, so
 * there is no half-angle to convert to at any scale: the `Math.cos(12°)` threshold
 * this replaces had the wrong SHAPE, not merely an unmeasured number. $20 = 32 comes
 * out irrational (1024·√2) only because 32 is not a perfect square, where its two
 * round siblings $900 = 48² and $100 = 16² are — the author picked round squares.
 */
export const AIM_AXIS_RADIUS = psb2SquaredToWorld(0x20)

/**
 * C_AS's range bound. `LDD M.XP / … / SUBD #4000 / BGE 140$` (WSCPU.MAC:607-611,
 * ";IGNORE GUN IF TOO FAR AWAY") compares the LINEAR depth along the alien's nose,
 * and PRE2 halves every axis on the way in — not only the ones it squares — so the
 * true-world bound is twice the literal. $8000 = 32768 sits just past the $7C00 =
 * 31744 spawn depth, so this gate bites at the play cube's diagonal corners rather
 * than in routine play.
 */
export const AIM_DEPTH_MAX = 0x8000

/**
 * C_PN's range threshold. The ROM sets C$PN from a squared math-box-VIEW
 * distance (WSMAIN.MAC:3776-3787: `M.XPS+M.YPS+M.ZPS`, `CMPU #100`) — units
 * post-projection in a per-shape scale, not raw world units — so, per this
 * task's scope, that threshold is not ported directly (no further ROM dig
 * here). TODO(playtest): ~40% of TIE_SPAWN_DISTANCE (0x7c00 = 31744) as a
 * defensible "close enough to react to the player" band; retune in playtest.
 */
export const PLAYER_NEAR_RANGE = 0x7c00 * 0.4 // 12697.6

/**
 * C_PV view-pyramid depth clamps (WSMAIN.MAC:3824-3846). The alien is on the
 * player's screen when its view-space depth sits in (VIEW_NEAR, VIEW_FAR] and
 * both |lateral| and |vertical| are STRICTLY inside the pyramid — the ROM's
 * ratio law (`LDD M.YPS / SUBD M.XPS / LBHS RTS1` — a ratio test, so it ports
 * unit-for-unit; BHS puts equality out of view). Near/far are the ROM's own
 * literals (`CMPD #10 / LBLE`, `CMPD #7F00 / LBHI` — the far edge itself is
 * still in view), in the same world-unit space as the $800 fire floor and the
 * $7C00 spawn depth, so every fresh spawn starts visible.
 */
export const VIEW_NEAR = 0x10
export const VIEW_FAR = 0x7f00

/**
 * tan of the rendered frustum's vertical half-angle — the slope C_PV's pyramid
 * actually has on OUR glass (uf1-14). The ROM compares lateral/vertical to the
 * depth 1:1 — a ±45° pyramid — because that is the 1983 cabinet's screen shape.
 * Ours is `perspective(FOV_Y, aspect, NEAR, FAR)` (render.ts:451), whose glass
 * ends at FOV_Y/2 = 30° vertically at EVERY aspect, and at
 * atan(aspect · tan(FOV_Y/2)) horizontally. Keeping the 45° claimed a 15° band
 * of sky the player cannot see (so off-screen TIEs passed the §6 fire gate —
 * the defect sw7-24 meant to kill, surviving on the vertical axis) and
 * UNDER-claimed ultrawide flanks by 8.4°, silently starving their fire.
 */
const TAN_HALF_FOV = Math.tan(FOV_Y / 2)

/**
 * C_PS's band, as a multiple of the target's own kill radius. The cabinet
 * computes TWO scratch values once per object in the draw pass — `TMPSIZ`
 * (projected size + cursor size) and `TMPOCT` (`|dx| + |dy|` from the
 * crosshair, WSMAIN.MAC:3880-3897) — then tests the SAME pair twice:
 *
 *   the laser hit    `LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON`  (:3904-3906)
 *   the sights bit   `ADDD TMPSIZ / ADDD TMPSIZ
 *                     ;ALLOW LARGER WARNING AREA`                (:3920-3923)
 *
 * so C_PS is the kill band, DOUBLED — 3 ÷ 1.5 = exactly 2. That ratio is the
 * only term in the whole expression that is unit-free, radix-free and
 * projection-free, which is precisely why it is the part that ports: no
 * invented reticle size, no tuned threshold, nothing to retune in playtest.
 */
export const SIGHTS_BAND_FACTOR = 2

/**
 * OR together the 8 status bits this file derives: C_AS, C_PN, C_PV, C_PS,
 * C_AG, C_AH, C_R1, C_R2. Pure — identical (e, state, rng.seed) yields
 * identical bits, modulo the Rng's own documented mutation (nextInt advances
 * `rng.seed`).
 */
export function computeStatus(e: Enemy, state: GameState, rng: Rng): number {
  let status = 0

  // C_AS (0x04) — "ALIEN HAS PLAYER IN SITES" (WSCPU.MAC:29,604-621). Three
  // conditions, in the ROM's own order, all measured on the offset from the fighter
  // to the cockpit resolved about its nose axis — model +Z mapped through e.orient,
  // the same column lookRotation writes forward into (math3d.ts:171-186):
  //
  //   :607-608  `LDD M.XP / BMI 140$`   ;?PLAYER IN FRONT?  — the sign of the depth
  //   :610-611  `SUBD #4000 / BGE 140$` ;IGNORE GUN IF TOO FAR AWAY
  //   :615-618  `LDD M.YPS / ADDD M.ZPS / CMPD #20 / BHI`   ;?AIMING NEAR SHIP?
  //
  // The last one is the cylinder (AIM_AXIS_RADIUS above), and the first two are what
  // make it a half-line rather than an infinite one: a fighter pointed directly AWAY
  // has its nose axis running straight through the cockpit, so perpendicular distance
  // alone would put the player in its sights. `BHI` skips on strictly greater, so the
  // radius itself is inside; `BGE` skips at the bound, so the range is strict.
  //
  // The radius test stays SQUARED, as the ROM's `CMPD` is, and the perpendicular is
  // taken as the vector REJECTION rather than via Pythagoras on the range — recovering
  // a small square by subtracting two large ones loses the boundary case to rounding
  // (measured: the exactly-on-the-radius fixture flips).
  //
  // Minimal collision/spawn fixtures build a TIE without `orient`; the §6 fire gate
  // now status-computes EVERY live enemy (sim.ts's decision tick), so tolerate a
  // missing matrix by defaulting to IDENTITY (nose = model +Z), exactly as
  // `applyManeuver` does, rather than reading off `undefined[2]`.
  const orient = e.orient ?? IDENTITY
  const nose: Vec3 = [orient[2], orient[6], orient[10]]
  const toCockpitOffset = sub(COCKPIT, e.pos)
  const noseDepth = dot(nose, toCockpitOffset) // M.XP
  const offAxis = sub(toCockpitOffset, scale(nose, noseDepth)) // (M.YP, M.ZP)
  if (
    noseDepth >= 0 &&
    noseDepth < AIM_DEPTH_MAX &&
    dot(offAxis, offAxis) <= AIM_AXIS_RADIUS * AIM_AXIS_RADIUS
  ) {
    status |= Status.C_AS
  }

  // C_PN (0x400) — "PLAYER IS NEAR THE ALIEN" (WSCPU.MAC:35; CHSET C$PN at
  // WSMAIN.MAC:3787). The TIE is within PLAYER_NEAR_RANGE of the cockpit.
  if (length(e.pos) <= PLAYER_NEAR_RANGE) status |= Status.C_PN

  // C_PV (0x1000) — "PLAYER HAS ALIEN IN VIEW" (WSCPU.MAC:37; CHSET C$PV at
  // WSMAIN.MAC:3846 "WITHIN PLAYERS VIEW SCREEN"). The one bit the ROM's
  // per-frame A$CHST rebuild PRESERVES (`ANDA #C$PV/100 ;SAVE IF IN VIEW FOR
  // GUNS`, WSCPU.MAC:532-536), because it is the §6 fire gate's literal first
  // condition (sim.ts's decision tick, sw7-24 T5b). Measured from the COCKPIT,
  // which in space IS the world origin — the view the player actually has, so
  // the bit cannot lie about what is on screen. sw7-24 measured it from the
  // `spaceEye` camera instead; sw8-8 retired that eye (ST.UX is the starfield's
  // register, never a camera — see the tombstone in gameRules.ts), so the
  // pyramid, the gun and the shield hit-test now share one point. In-front is
  // negative z, so the view depth is eye z minus alien z.
  //
  // The pyramid keeps the ROM's ratio law as its SHAPE — per-axis, strict, the
  // edge itself out of view — but its slope is the RENDERED frustum's, not the
  // cabinet's ±45° (uf1-14, TAN_HALF_FOV above): the vertical bound is
  // depth · tan(FOV_Y/2), the horizontal bound scales that by the viewport
  // aspect the frame was actually projected with — state.aspect, the uf1-12
  // field C_PS below already reads, so the bit and the glass cannot disagree
  // on any canvas shape.
  const eye = COCKPIT
  const depth = eye[2] - e.pos[2]
  const lat = e.pos[0] - eye[0]
  const vert = e.pos[1] - eye[1]
  const vBound = depth * TAN_HALF_FOV
  const hBound = vBound * state.aspect
  if (depth > VIEW_NEAR && depth <= VIEW_FAR && lat * lat < hBound * hBound && vert * vert < vBound * vBound) {
    status |= Status.C_PV
  }

  // C_PS (0x800) — "PLAYER HAS ALIEN IN SITES" (WSCPU.MAC:36; the tree's SOLE
  // `CHSET C$PS` at WSMAIN.MAC:3930, ";STATUS: ALIEN IN PLAYER SITES"). Four
  // gates inside TCH1DZ read it, including the two-way branch into 20$
  // (WSCPU.MAC:1639,1641,1643,1646 → tie-vm.ts:341-342), so a loitering
  // fighter breaks off its weave once the crosshair settles on it. (uf1-12)
  //
  // Ported as the AIM RAY passing within SIGHTS_BAND_FACTOR × the target's hit
  // radius — the doctrine gameRules.ts already states for this exact ROM
  // octagon ("an object is under the site exactly when the AIM RAY passes
  // within its hit radius … reuses the hit radii the game already has instead
  // of inventing a reticle size"), just at twice the radius. Keeping the bit on
  // the SAME predicate as the gun is what stops the sights and the laser
  // disagreeing about a target — so this must be the gun's ray exactly, not one
  // like it. All three terms match `beamDir`/`beamOrigin` in sim.ts: the same
  // origin — the COCKPIT, shared with the C_PV pyramid above and with
  // `shipPoint`'s space arm — the same viewport aspect, and — since uf1-12's
  // review — THIS frame's yoke, which `stepGame` shadows onto `state` for
  // exactly this reason. uf1-12 wrote this origin as the moving `spaceEye`,
  // which was true of `beamOrigin` when it was written and stopped being true
  // when sw8-8 retired that eye days later; the two are still the same point,
  // and now it is the point the player actually occupies. That matters more for
  // C_PS than for the gun: the sights bit gates a LOITER break, so an eye
  // offset would have TIEs breaking off at a crosshair the player is not
  // looking down. Reading a stale aim reintroduces the divergence AC-6 exists to
  // close: 613 u of separation on a one-frame flick of 0.1, against a 500 u
  // band. The cabinet has no such gap — it builds both tests from one cursor
  // sample in one pass (WSMAIN.MAC:3881-3930).
  //
  // Two ROM guards come free. `?ALIVE?` (`CMPA #1 / BNE 86$`, :3926-3928) needs
  // no port — `state.enemies` holds only live fighters, a killed one moves to
  // `dyingTies`. And the "must be drawn" gate the CHSET inherits from sitting
  // in the draw pass is `beamHit` refusing anything behind the gun.
  const sightsRay = aimDirection(state.aimX, state.aimY, state.aspect)
  if (beamHit(eye, sightsRay, e.pos, SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS) !== null) {
    status |= Status.C_PS
  }

  // C_AG (0x40) — "ALIEN HAS FIRED A GUN" (WSCPU.MAC:33,658: `CHSET C$AG` in
  // the gun-fire handler). Read-only here — a later task's fire step sets
  // `e.firedGun` on the frame this TIE actually fires; computeStatus just
  // reports it.
  if (e.firedGun ?? false) status |= Status.C_AG

  // C_AH (0x01) — the equate calls it "NEARBY ALIEN HAS BEEN HIT"
  // (WSCPU.MAC:27), but the cabinet never implemented that sentence. The whole
  // 1983 tree holds exactly ONE `CHSET C$AH` — WSCPU.MAC:357, inside `CPHTSA`
  // ("SPACE LAZAR HIT ALIEN SHIP") — and it writes the bit back to the alien it
  // opened on (`LDX CL.AP` … `STD A$CHST(X)`, commented ";STATUS: THIS ALIEN
  // DAMAGED"). No loop over neighbours, no distance test, anywhere. So C_AH is
  // SELF-damage, and "NEARBY" is abandoned design language — the sibling bit
  // C$AD ("NEARBY ALIEN HAS DIED") is annotated "/PLEASE DELETE/" at
  // WSCPU.MAC:28 and has zero setters tree-wide. (uf1-3)
  //
  // Read-only here, exactly like C_AG above: the hit resolver sets `e.damaged`
  // on the step it PROCESSES a hit, and computeStatus just reports it. Only
  // Darth ever observes his own bit — a plain TIE dies on the hit that sets it,
  // while Darth is the one alien the ROM keeps alive (WSCPU.MAC:367-368) and is
  // seated with choreography 1D3, which holds the ROM's only `.CUNTIL C$AH`
  // (WSCPU.MAC:1590). Shooting him mid-weave cuts it short into his attack arm.
  if (e.damaged ?? false) status |= Status.C_AH

  // C_R1 / C_R2 (0x10 / 0x20) — two independent "random bit" event gates
  // (WSCPU.MAC:31-32). The ROM draws ONE random byte and masks both bits at
  // once (`LDB P.RND1 / ANDB #C$R1+C$R2`, WSCPU.MAC:534-535); each bit of a
  // uniform byte is itself uniform and independent, so two separate
  // nextInt(rng, 2) draws off the seeded core Rng are the same distribution.
  if (nextInt(rng, 2) === 1) status |= Status.C_R1
  if (nextInt(rng, 2) === 1) status |= Status.C_R2

  return status
}
