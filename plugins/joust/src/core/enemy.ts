// src/core/enemy.ts
//
// Story jt2-2 (GREEN, Julia) — the enemy intelligence core. The three ground
// enemies (bounder / hunter / shadow lord) as processes on the SAME flight core
// the players fly (buzzards flap): one shared dumb LINET lane-tracking brain, a
// global NSMART/WSMART intelligence budget that promotes dumb enemies to their
// smart brains, and the EMYTIM integrate-every-Nth-frame divider (which is the
// jt2-1 scheduler `period`, NOT anything time-scaling inside a step).
//
// CORE: pure functions over plain numbers — no clock, no ambient entropy, no
// browser surface, no shell import. Every function is a pure transform of the
// state handed in (the jt1-7 purity scanner sweeps this file). The brains are
// deterministic functions of enemy+player state — nothing here consumes the
// jt2-1 per-frame RNG stir, so a seeded replay reproduces bit-for-bit.
//
// The behaviour is pinned by tests/enemy.test.ts; the ROM-law provenance by
// tests/enemy-source.test.ts + the JT22-* claims in
// docs/rom-study/claims/enemy.json (byte-verified against the vendored 1982
// Williams source). Every constant below carries its radix-cited anchor.

import {
  BCK_X_TABLE,
  X_TABLE_ORIGIN,
  flap,
  stepFlight,
  tickTimeUp,
  land,
  groundMaskAt,
  stepGround,
  takeOff,
  walkOff,
  wingEdge,
  type EntityState,
  type PlayerInput,
  type WingEdge,
} from './flight.js'
import { BCK_Y_TABLE, applyCeiling, groundOutcome, wrapX } from './arena.js'
// uf1-2 — the per-wave difficulty seam. This closes a module CYCLE (difficulty.ts
// imports `seedBudget` from here), which is safe only because neither module calls
// across the cycle at import time: `waveValue` is invoked per decision, and
// `seedBudget` per wave seed. Do not add a module-init-time call in either
// direction — it would run against a half-initialised namespace.
import { waveValue } from './difficulty.js'

export type { EntityState }

// ─── Types ────────────────────────────────────────────────────────────────

/** The three smart brains an enemy can be promoted INTO (PDECSN → DSMART). */
export type SmartBrain = 'boundr' | 'b2undr' | 'shadow'

/** An enemy's current brain — the shared dumb `linet`, or a promoted smart one. */
export type EnemyBrain = 'linet' | SmartBrain

/**
 * The global intelligence budget (RAMDEF.SRC:308-309). The available promotion
 * allowance is `wsmart - nsmart`: promotions debit it (nsmart↑), deaths of smart
 * enemies credit it (nsmart↓), and the 15-second timer grows it (wsmart↑).
 */
export interface IntelBudget {
  /** `NSMART` — CURRENT number of promoted (smart/attacking) enemies. */
  readonly nsmart: number
  /** `WSMART` — WANTED number of smart enemies this wave (the target). */
  readonly wsmart: number
}

/** A brain's per-wake control output (`CURJOY`): a horizontal dir + a flap. */
export interface Decision {
  /** −1 left, 0 neutral, +1 right — the ROM's `CURJOY` high byte. */
  readonly dir: -1 | 0 | 1
  /** Whether to flap this wake — the `CURJOY` low byte. Buzzards flap. */
  readonly flap: boolean
}

/** What a smart brain sees of its quarry: the altitude it pursues, and (jt8-2) the
 * speed it matches itself against. */
export interface PlayerView {
  /** The player's whole-pixel Y (`PPOSY+1,X`). */
  readonly pixelY: number
  /**
   * The player's FLYX velocity index (`PVELX,X` — "TABLE LOOK-UP FLYING
   * VELOCITY-X", RAMDEF.SRC:190). A signed even index in [−MAXVX, +MAXVX]
   * (`MAXVX EQU 8`, JOUSTRV4.SRC:40) stepped by `2 × dir` on each flap
   * (`ADDFLP`, :6437-6439). The horizontal-homing throttle compares the enemy's
   * OWN index against this one — see `homingWake`.
   */
  readonly velXIndex: number
}

/**
 * jt8-2 — the per-enemy horizontal-homing workspace.
 *
 * ONE byte, not two. The ROM pairs `PRDIR` with `PPVELX` ("OLD PLAYERS X
 * VELOCITY", RAMDEF.SRC:209). Across the three smart brains that second byte is
 * written at exactly THREE sites — `BOLEV` (`LDA PVELX,X / STA PPVELX,U`,
 * JOUSTRV4.SRC:3907-3908), `B2LEV` (:4058-4059) and `SHLEP` (:4281-4282), each
 * on entry to an episode timed by a "TIME UNTIL NEXT DECISION" row (`BOLETM`
 * :3909, `HULETM` :4060, `SHUPTM` :4283) — and the write-set is enumerated
 * mechanically in tests/steering-source.test.ts. (jt8-2's original note claimed
 * "exactly one place"; that was true of the BOUNDR brain alone.) `BOLEVB` and
 * its twins only ever READ it. The decision timers belong to a later story
 * (uf1-9 owns the "TIME UNTIL NEXT DECISION" rows), so there is no moment here
 * at which a snapshot could honestly be taken and `homingWake` compares the
 * target's LIVE index instead — which is also snapshot-equivalent for SHLEP
 * under the per-wake collapse, since a brain that re-decides every wake
 * re-stores every wake. Carrying an unwritten `ppvelx` would read as modelled
 * while being inert.
 */
export interface HomingState {
  /**
   * `PRDIR` — the reverse-direction counter ("REVERSE DIRECTION COUNTER",
   * RAMDEF.SRC:208). An **8-bit** register: the whole flip cadence hangs on the
   * wrap, so this is masked to 0..255 on every tick. See `PRDIR_FLIP_WAKES`.
   */
  readonly prdir: number

  /**
   * jt9-18 (folded jt9-19) — `PPVELX` ("OLD PLAYERS X VELOCITY", RAMDEF.SRC:209):
   * the TARGET's FLYX index SNAPSHOTTED at the level-flight decide and HELD.
   * `BOLEV` freezes it once (`LDA PVELX,X / STA PPVELX,U`, :3907-3908; twins
   * `B2LEV` :4058-4059, `SHLEP` :4281-4282) and `BOLEVB` READS it against the
   * enemy's OWN current index (`LDA PPVELX,U / CMPA PVELX,U`, :3939-3940), never
   * rewriting it until the interval expires. `homingWake` gates on THIS, not the
   * target's live index — the gap uf1-9's decide interval finally made closable.
   * Absent = no decide yet (the throttle holds); written at the three decide sites
   * only (SHLEV steers via SHDIR, not the throttle, so it has no PPVELX).
   */
  readonly ppvelx?: number
}

/**
 * uf1-8 — the per-enemy SEEK-EPISODE workspace: `PDIST,U`, "distance to go".
 *
 * The ROM's bounder/hunter brains are EPISODIC, not per-wake: a LONG-range
 * decide arms `PDIST` from the wave's DI row (`LDD BODNDI / STD PDIST,U`,
 * JOUSTRV4.SRC:3803-3804; `BOUPDI` :3851-3852; `HUDNDI` :3986-3987; `HUUPDI`
 * :4035-4036) and COMMITS — the episode states (`BODN1` :3811-3817, `BOUP1`
 * :3855-3860 and their B2 twins) never re-run SELPLY. The budget's units are
 * the port's posY subpixels: −$0E00 = 14 pixels of travel, the same DYLEN the
 * RG rows express in whole pixels — one length, two radixes. Down budgets are
 * NEGATIVE (exhausted at ≥ 0, `BPL BOBRAIN` :3816); up budgets POSITIVE
 * (exhausted at < 0, `BMI` :3859). The shadow lord has NO DI rows — its
 * episode states re-enter `SHADOW` each wake (`SHUP1 LDD #SHADOW / STD
 * PJOY,U`, :4269-4270) — so it never carries one, and neither does LINET.
 */
export interface SeekState {
  /** Which committed seek this enemy is inside: descending or climbing. */
  readonly mode: 'down' | 'up'
  /**
   * `PDIST,U` — the signed distance-to-go budget, in posY subpixel units.
   * Negative while descending (armed from BODNDI/HUDNDI), positive while
   * climbing (armed from BOUPDI/HUUPDI).
   */
  readonly pdist: number
}

/** An enemy's mind riding the shared flight core (buzzards flap). */
export interface EnemyState {
  /** The flight/ground state — stepped by the SAME flight core players use. */
  entity: EntityState
  /** `PFACE` — facing: +1 right, −1 left. LINET moves in this direction. */
  facing: -1 | 1
  /** `PCHASE` — the smart flag: 0 = dumb (LINET), 1 = promoted (smart brain). */
  pchase: 0 | 1
  /** The brain currently driving this enemy. */
  brain: EnemyBrain
  /** `PDECSN → DSMART` — which smart brain this enemy is promoted INTO. */
  decision: SmartBrain
  /**
   * jt8-2 — the horizontal-homing workspace. OPTIONAL (the `EntityState.animPhase`
   * / `GameState.targets` precedent): a fixture need not supply it and the first
   * matched wake seeds it. When present it is CARRIED, never re-seeded.
   */
  homing?: HomingState
  /**
   * uf1-8 — the committed seek episode, if one is in flight. OPTIONAL on the
   * same precedent as `homing`: absent means "at the decide step". `stepEnemy`
   * arms it on a long-range bounder/hunter decide, CARRIES and spends it
   * across wakes (never re-seeds an unspent one), and clears it when the
   * budget exhausts or the enemy grounds (`BODN1 LDD PSTATE,U / BNE BOBRAIN`,
   * JOUSTRV4.SRC:3811-3812). A dumb `linet` enemy and the shadow lord never
   * carry one.
   */
  seek?: SeekState
  /**
   * jt9-1 — `PLAVT,U`, the lava-troll looker's countdown (`DEC PLAVT,U / BGT`,
   * JOUSTRV4.SRC:3725-3726). OPTIONAL on the `homing`/`seek` precedent: absent
   * means the countdown has never been seeded, which behaves exactly as the
   * machine's zero-initialised byte does (`STA PLAVT,U  INITIAL DELAY = NO
   * TIME`, :3345) — `DEC` takes it negative, `BGT` fails, and the first wake
   * reloads it from LNTLAV.
   *
   * It lives in the prologue a GLIDE wake skips, so it does NOT tick on a glide
   * wake. That is the model, not an oversight.
   */
  plavt?: number
  /**
   * jt9-9 — `PEGG,U`, the number of eggs this enemy has left before permadeath.
   *
   * The ROM keeps this on the BIRD and hands it right around the death cycle:
   * DEATH3 transfers the victim's count to the egg and decrements it
   * (`LDA PEGG,U / STA PEGG,Y / DEC PEGG,Y`, JOUSTRV4.SRC:2999-3001), and the
   * hatch hands it back to the buzzard that remounts (`LDA PEGG,U  MAINTAIN NBR
   * OF EGGS LEFT IN THE BIRD / STA PEGG,Y`, :3251-3252). Without the second half
   * the count resets every cycle and can never walk down, which is what made
   * permadeath and the DEATH3 egg award unreachable in this port.
   *
   * OPTIONAL on the `homing`/`seek`/`plavt` precedent: absent means a full
   * `EGGS_PER_ENEMY`, which is what a freshly-materialised wave enemy has.
   */
  eggsLeft?: number
  /**
   * jt5-3 — the wing-edge detector's memory: the `flapHeld` LEVEL this enemy's
   * synthetic joystick carried on its LAST WAKE (`CURJOY+1`, read as the edge
   * by FLIPLP's `TSTB`/`BNE GOFLAP` and as the level by FLAPS2's `CLRB`,
   * :6195-6196/:6170). Lives here rather than on `EntityState` for the same
   * reason a player's `facing` lives on the demo's PROCESS and not there
   * (demo.ts Finding #2): `EntityState` is GENERATED (flight.ts) and shared
   * with the player, whose own migration-guard test JSON-compares only
   * `.entity` against a pre-jt5-3 reference pipeline. OPTIONAL — absent reads
   * as `false`, since an enemy that has never woken has never held the button
   * either.
   */
  prevFlapHeld?: boolean
  /**
   * uf1-9 — the `PJOY`/`PJOYT` workspace: which wing phase the brain is in and
   * how many wakes remain in it. OPTIONAL on the `homing`/`seek` precedent —
   * absent means "no episode is armed", and the next decide arms one.
   *
   * The ROM keeps ONE state pointer and ONE countdown per enemy (`PJOY,U` /
   * `PJOYT,U`, RAMDEF), and which state they are in is what gives the countdown
   * its meaning. That is modelled here rather than as three separate timers:
   * `wings` present means a seek episode's wing cadence is running, `wings`
   * absent means a level-flight decide is holding its "time until next
   * decision" interval.
   */
  pjoy?: PjoyState
}

/**
 * uf1-9 — one enemy's `PJOY`/`PJOYT` pair.
 *
 * THE CADENCES THIS CARRIES, and the four ROM shapes they are NOT the same:
 *
 *   • UP-seek (`BOUP1`/`BOUP2` :3855-3899, `B2UP1`/`B2UP2` :4174-4185 + :4044-4051)
 *     — a true two-phase square wave: wings DOWN for BOUPWD/HUUPWD wakes, UP for
 *     BOUPWU/HUUPWU wakes. All four are DYTBL rows, so all four scale per wave.
 *   • DOWN-seek (`BODN1`/`BODN2` :3818-3840, `B2DN1`/`B2DN2` :4004-4024) — wings
 *     DOWN for a HARDCODED 2 wakes (`LDA #2`, :3823 and :4008 — never migrated to
 *     DYTBL), and NO wing-up reload at all: `BODN2`'s expiry returns to `BODN1`
 *     with `CLRB` and arms nothing, so the wings-up side is re-decided by the
 *     BODNVY/HUDNVY brake on every wake.
 *   • LEVEL flight (`BOLEV`/`B2LEV`/`SHLEV`/`SHLEP`) — no wings at all; the
 *     countdown is the decision interval, and its expiry re-runs the decide.
 *   • The shadow's CLIFF dwell (`SHDICL` :4373-4376) — SHCLTM wakes of `SHAV`.
 *     The hunter's identically-shaped dwell (`B2DICL` :4142-4145) is a hardcoded
 *     8 and must NOT read SHCLTM.
 */
export type PjoyState =
  /** A seek episode's wing cadence: which phase, and the wakes left in it. */
  | { readonly kind: 'wing'; readonly timer: number; readonly wings: 'down' | 'up' }
  /**
   * A level-flight decide holding its "time until next decision" interval.
   *
   * jt9-18 — `glide` is the BOLEV1↔BOLEV2 sub-phase. `BOFAST` FLAPS and points
   * `PJOY` at `BOLEV2` (:3931-3934); the next wake lands at `BOLEV2`, which points
   * `PJOY` back at `BOLEV1` and falls into `BOLEVA`'s `CLRB` (:3936-3938) — a
   * FORCED GLIDE, whatever the falling test would say. So a level wake that
   * flapped forces the next to glide: `glide: true` marks the BOLEV2 wake. The
   * twins are `B2LEV2` :4162, `SHLEP2` :4300, `SHLEV2` :4399. Absent = BOLEV1.
   */
  | { readonly kind: 'interval'; readonly timer: number; readonly glide?: boolean }
  /**
   * A cliff-avoidance dwell — `B2AV` (:4190-4193) / `SHAV` (:4406-4409). Wings
   * stay UP for the whole dwell and its expiry RE-DECIDES (`JMP B2UNDR` /
   * `JMP SHADOW`); it never flaps. Round 1 review (R1-2) caught this sharing a
   * shape with the wing cadence, which made the hunter's dwell flap on expiry
   * and be ignored entirely on the down route. Distinct `kind` makes that
   * unrepresentable rather than merely fixed.
   */
  | { readonly kind: 'dwell'; readonly timer: number }
  /**
   * jt5-8 — the DUMB brain's forced glide: `LNTOFP` parked in `PJOY,U` by a
   * flapping `LINET` wake (`LDD #LNTOFP / STD PJOY,U`, JOUSTRV4.SRC:3746-3747).
   * The next wake enters at `LNTOFP` instead of at `LINET`, which restores
   * `#LINET` and clears the flap bit UNCONDITIONALLY (:3759-3762) — so the lane
   * decision is never re-run on it, and the machine cannot flap on two
   * consecutive wakes.
   *
   * It carries NO `timer`, and that absence is the model, not an omission: the
   * ROM's alternation is two routine pointers and nothing else — no `PJOYT`
   * write, no DYTBL row, so it does not scale with the wave the way every other
   * variant here does. `dumbWingbeat` is the only reader and writer.
   */
  | { readonly kind: 'glide' }
  /**
   * jt9-22 — the BOLAVA lava-avoid episode (`JOUSTRV4.SRC:3948-3964`), a second
   * `PJOY,U` entry-address ping-pong that the steering gates DIVERT to (hunter
   * `B2DIRL` :4102 `JMP BOLAVA`; no-target shadow `SHDIR` :4334 `LBPL BOLAVA`).
   * `entry` is the address THIS wake begins at:
   *   • `BOLAV2` (:3958-3961) — COAST (`CLRB`), then arm `BOLAV1`.
   *   • `BOLAV1` (:3948-3952) — RE-CHECK `PPOSY+1 < $D3` OR rising ⇒ `BOLAV4`
   *     (exit to `[DSMART,X]`, the brains); else fall into `BOLAVA` — FLAP
   *     (`LDB #1`) and arm `BOLAV2`.
   * The divert wake itself enters at `BOLAVA` (flap, arm `BOLAV2`) from the gate;
   * it is never STORED, so only these two addresses are held. The whole episode
   * steers via `BODIR3 JMP BODIR` (:3946) — the BOUNDER homing, target-blind —
   * which is why the escape reads no player. Carries no timer: the ping-pong is
   * two routine pointers, like `glide`. `stepEnemyDetailed` is the only reader.
   */
  | { readonly kind: 'lava'; readonly entry: 'BOLAV2' | 'BOLAV1' }
  /**
   * jt9-29 — the SHADOW lava-troll looker's armed climb (`SHUPST`,
   * JOUSTRV4.SRC:4264-4267). When a lava troll ran immediately before a SHADOW
   * wake and its looker expires, `BEQ SHUPST` points `PJOY` at `#SHUP1` and
   * CLEARS the flap bit (`CLRB`) — so the wake it fires is wings-UP, and the
   * NEXT wake enters at `SHUP1` (:4269-4275) and FLAPS into the climb. Unlike the
   * bounder/hunter targets (`BODN1A`/`B2DN1A`, which flap on the looker wake
   * itself), the shadow's is a DEFERRED flap. Carries no timer: it is a single
   * routine pointer, like `glide`/`lava`, consumed on the one wake it is read.
   */
  | { readonly kind: 'climb' }

// ─── Cited constants ────────────────────────────────────────────────────────

/**
 * `[AOFFL1, AOFFL2, AOFFL3]` = `[$45, $81, $D0]` — the three cliff-tier lanes
 * LINET tracks toward (JOUSTRV4.SRC:7994-7996). HEX.
 */
export const AOFF_LINES: readonly [number, number, number] = Object.freeze([0x45, 0x81, 0xd0])

/** `AOFFUD EQU $20` — the tolerance band that picks the nearest lane (JOUSTRV4.SRC:7997). HEX. */
export const AOFF_BAND = 0x20

/** `EMYTIM` default = 1 — integrate every frame (`NO ENEMY SLOW DOWN`, JOUSTRV4.SRC:1993). DECIMAL. */
export const EMYTIM_NORMAL = 1

/** `EMYTIM` on waves 1-2 = 2 — integrate every 2nd frame, the divider (JOUSTRV4.SRC:2204-2205). DECIMAL. */
export const EMYTIM_SLOW = 2

/** `PDELAY` reload = 112 — the growth timer's tick count (`AFTER 15 SECONDS…`, JOUSTRV4.SRC:2094). DECIMAL. */
export const INTEL_GROWTH_NAPS = 112

/** `EMYOK PCNAP 8` — the growth timer naps 8 frames per tick (JOUSTRV4.SRC:2096). DECIMAL. */
export const INTEL_GROWTH_NAP_FRAMES = 8

/** 112 × 8 = 896 frames (~15 s at ~60 Hz) between WSMART bumps. DERIVED, never stated independently. */
export const INTEL_GROWTH_FRAMES = INTEL_GROWTH_NAPS * INTEL_GROWTH_NAP_FRAMES

/** WSMART saturation ceiling — the `INC WSMART / BNE / DEC WSMART` guard (JOUSTRV4.SRC:2127-2129) = 255. */
export const WSMART_MAX = 255

/**
 * `BODNVY` at operator difficulty 5 on WAVE 1 ($0100) — the bounder's down-seek
 * brake VY (JOUSTRV4.SRC:3819). HEX. This is also the immediate the ROM hardcoded
 * before DYTBL existed, which its own trailing comment on that line still records.
 * From wave 3 the DYTBL walk raises it toward $0300, so this constant is the START
 * of the ramp, not the whole story — `boundr` reads the live value per wave
 * (uf1-2). Kept exported because it IS a real ROM constant and the wave-1 anchor.
 */
export const BOUNDR_DOWN_BRAKE = 0x100

/**
 * `HUDNVY` at operator difficulty 5 on WAVE 1 ($0200) — the hunter tolerates a
 * faster fall than the bounder (JOUSTRV4.SRC:4004). HEX. Same shape as
 * `BOUNDR_DOWN_BRAKE`: the wave-1 anchor of a DYTBL ramp that climbs to $0380.
 */
export const B2UNDR_DOWN_BRAKE = 0x200

/**
 * `$D3` — below this whole-pixel scanline the shadow lord flaps to escape the
 * lava (SHDN, JOUSTRV4.SRC:4246-4254; cliff5 lands at $D3, LNDB5). HEX.
 */
export const LAVA_ESCAPE_Y = 0xd3

/**
 * `B2XLEN EQU 27+4` = 31 — how far ahead, in whole pixels, the hunter's cliff
 * look-ahead samples the background mask (JOUSTRV4.SRC:3969). DECIMAL.
 */
export const B2XLEN = 27 + 4

/**
 * `SHXLEN EQU 27+4` = 31 — the shadow lord's copy of the same length
 * (JOUSTRV4.SRC:4228). DECIMAL. Equal by construction in the ROM; kept as its
 * own named constant because the ROM names it, exactly like the two DOWN-brake
 * dials above.
 */
export const SHXLEN = 27 + 4

/**
 * `$D0` — SHDIR's own lava pre-check line (JOUSTRV4.SRC:4330-4334): a shadow
 * lord AT or below this whole-pixel scanline while falling is BOLAVA's problem,
 * not the look-ahead's. Three scanlines ABOVE the hunter's `B2DIRL` gate and
 * the SHDN escape line (`$D3`, `LAVA_ESCAPE_Y`) — two different thresholds,
 * deliberately not one constant. HEX.
 */
export const SHDIR_LAVA_Y = 0xd0

/**
 * The number of velocity-MATCHED wakes between two facing flips = 129.
 *
 * DERIVED — never stated as a constant anywhere in the source. It falls out of
 * the 8-bit `DEC`/`BMI` pair (JOUSTRV4.SRC:3942-3943) walking a CLEARED counter.
 * `DEC` sets N from bit 7 of the 8-bit result and `BMI` skips the flip while N
 * is set, so the counter walks `0 → $FF → $FE → … → $80` — 128 wakes, every
 * result negative, no flip — and the 129th `DEC` lands `$7F`, non-negative,
 * which finally reaches `CLR PRDIR,U` + `COM PFACE,U`.
 *
 * The zero this walk starts from is the one the FLIP writes — `CLR PRDIR,U`
 * (:3944) — so 129 is the cadence BETWEEN flips, every cycle after the first.
 * It is NOT what a mounted enemy is born with; see `seedHoming`. Anchoring it on
 * `CLR PRDIR,Y` (:3255) instead, as the first cut did, is what made the shipped
 * mechanism inert: the first flip cost 129 matched wakes and no enemy lives long
 * enough to spend them.
 */
export const PRDIR_FLIP_WAKES = 129

/**
 * `SEEKFS  LDA #1` — the short-range sensor flag a bird carries into its brain
 * (JOUSTRV4.SRC:3584, stored to `PRDIR` on :3585). DECIMAL.
 *
 * Named and exported rather than inlined so the one value this mechanism turns
 * on obeys the same radix-cited-constant discipline as every other anchor in
 * this file. See `seedHoming` for the chain that makes it the MOUNTED value.
 */
export const SEEKFS_PRDIR = 1

// ─── The shared dumb brain (LINET) ──────────────────────────────────────────

/**
 * The nearest cliff-tier lane for a whole-pixel Y, chosen through the ±$20 band
 * with a strict `<` upper edge (the ROM's `CMPB #AOFFLn+AOFFUD / BLO`,
 * JOUSTRV4.SRC:3733-3740): `y < $45+$20` → `$45`; else `y < $81+$20` → `$81`;
 * else `$D0`. The edge is EXCLUSIVE — `$65` falls to line 2, not line 1.
 */
export function linetTarget(pixelY: number): number {
  if (pixelY < AOFF_LINES[0] + AOFF_BAND) return AOFF_LINES[0]
  if (pixelY < AOFF_LINES[1] + AOFF_BAND) return AOFF_LINES[1]
  return AOFF_LINES[2]
}

/**
 * The dumb lane-tracking decision (JOUSTRV4.SRC:3733-3757): flap iff the enemy
 * has sunk BELOW its lane (`pixelY > linetTarget`) AND is not already rising
 * (`velY >= 0`); move horizontally in the facing direction. The player is
 * ignored entirely. Pure.
 */
export function linet(enemy: EnemyState): Decision {
  const pixelY = enemy.entity.posY >> 8
  const target = linetTarget(pixelY)
  const rising = enemy.entity.velY < 0
  return { dir: enemy.facing, flap: pixelY > target && !rising }
}

// ─── The intelligence budget ────────────────────────────────────────────────

/**
 * Seed the budget from a wave pursuit nibble: `wsmart = nibble & 0x0F` (the
 * `ANDA #$0F` masks off the high nibble, JOUSTRV4.SRC:2076-2077), `nsmart = 0`.
 * The nibble is the wave machine's INPUT (jt2-5); this pins the LAW.
 */
export function seedBudget(pursuitNibble: number): IntelBudget {
  return { nsmart: 0, wsmart: pursuitNibble & 0x0f }
}

/**
 * One firing of the 15-second growth timer (`INC WSMART / BNE / DEC WSMART`,
 * JOUSTRV4.SRC:2127-2129): while `enemiesAlive`, bump WSMART by one, saturating
 * at 255; with no enemies alive it does not grow. The CADENCE (every 896 frames)
 * is the wave machine's INPUT (jt2-5); this is the LAW of what happens when it
 * fires.
 */
export function growWanted(budget: IntelBudget, enemiesAlive: boolean): IntelBudget {
  if (!enemiesAlive) return budget
  return { ...budget, wsmart: Math.min(budget.wsmart + 1, WSMART_MAX) }
}

/** A dumb enemy may promote while the budget has room: `nsmart < wsmart` (`LINET`, JOUSTRV4.SRC:3722-3724). */
export function shouldPromote(budget: IntelBudget): boolean {
  return budget.nsmart < budget.wsmart
}

/**
 * Promote a dumb enemy: debit the budget (`INC NSMART`, JOUSTRV4.SRC:3764), set
 * the smart flag (`pchase 0→1`), and switch `brain` to the enemy's `decision`
 * (PDECSN → DSMART, JOUSTRV4.SRC:3772-3773). Throws if the enemy is already
 * smart — the "PCHASE … BETTER BE ZERO" invariant (JOUSTRV4.SRC:3766); an
 * already-smart enemy is NEVER re-promoted. Pure — inputs untouched.
 *
 * jt5-8 — it also DISCARDS the `PJOY` workspace, because `LNTSMT` writes the new
 * smart routine over that very cell (`LDX DSMART,X / STX PJOY,U / JMP ,X`,
 * :3773-3775). The only thing a dumb enemy can have parked there is the LNTOFP
 * glide.
 *
 * BELT AND BRACES, and said plainly rather than left to read as load-bearing: a
 * leaked glide could not survive anyway. A freshly promoted enemy carries no
 * `seek`, so its first smart wake always reaches `seekWake`'s decide, and every
 * route there writes `pjoy` (undefined on the up/down seeks, a fresh interval on
 * level). Measured, not reasoned: deleting this clear leaves all 34 of
 * tests/dumb-wingbeat.test.ts green. It is kept because AC3's mechanism IS this
 * store, and stating it here makes promotion's contract local instead of a
 * property of a function three calls away.
 */
export function promote(
  enemy: EnemyState,
  budget: IntelBudget,
): { enemy: EnemyState; budget: IntelBudget } {
  if (enemy.pchase !== 0) {
    throw new Error(
      'PCHASE had better be zero — an already-smart enemy is never re-promoted ' +
        '(JOUSTRV4.SRC:3766)',
    )
  }
  // jt9-1 (review R-4): the same class of impossible state, one field over.
  // AC6 removed this function's `pjoy: undefined` because a dumb bird's PJOY is
  // only ever absent or a glide — and a glide can no longer reach here at all,
  // since `frame.ts` skips the promotion check while one is pending. That is
  // true of production (both spawn sites pair `pchase: 0` with `brain: 'linet'`,
  // `demo.ts:425` and `:654`, and nothing demotes) but nothing ENFORCED it, so
  // the deletion rested on an argued invariant rather than a checked one.
  // Constructed and measured during review: a `{pchase: 0, brain: 'boundr',
  // pjoy: {kind:'interval'}}` enemy carried that interval straight through into
  // its smart brain. Refuse it here, where the neighbouring invariant is already
  // refused, rather than re-adding a clear that would silently paper over it.
  if (enemy.pjoy !== undefined) {
    throw new Error(
      `a dumb enemy reaching promotion carries no PJOY state — got ${enemy.pjoy.kind}. ` +
        'A glide cannot reach LNTSMT (JOUSTRV4.SRC:3722-3724, skipped by a wake ' +
        'entering at :3759) and the smart cadences never run on a linet bird.',
    )
  }
  // jt9-1 (AC6): `pjoy` is NOT cleared here any more, because it cannot be set.
  // Promotion is now gated on the glide (`frame.ts`), and a dumb `linet` bird's
  // `pjoy` is only ever absent or a glide — never `interval`/`wing`, which
  // belong to the smart brains' cadences and are fenced off `linet` by
  // `withWingCadence` and `withCliffDwell`. So every enemy that reaches this
  // function arrives carrying nothing, and jt5-8's belt-and-braces clear was a
  // branch no input could take (its Reviewer's R-2: deleting it left all 2463
  // tests green, because two independent routes already guaranteed it).
  return {
    enemy: { ...enemy, pchase: 1, brain: enemy.decision },
    budget: { ...budget, nsmart: budget.nsmart + 1 },
  }
}

/**
 * Credit the budget back on a death: `nsmart -= enemy.pchase` (`LDA NSMART /
 * SUBA PCHASE,U`, JOUSTRV4.SRC:2962-2963). A smart death (pchase 1) restores one
 * unit; a dumb death (pchase 0) restores nothing. Pure — the budget untouched.
 */
export function creditDeath(enemy: EnemyState, budget: IntelBudget): IntelBudget {
  return { ...budget, nsmart: budget.nsmart - enemy.pchase }
}

// ─── The three smart brains (distinct, cited pursuit) ───────────────────────
//
// uf1-8 — every brain DECIDES through its RANGE GATE on the whole-pixel player
// Y-delta (player pixelY − enemy pixelY; positive = player below), against the
// wave's DYTBL row. The ROM reaches a gate only after `JSR SELPLY / BEQ BOLEVV
// BR=NO PLAYERS HERE` (:3796-3797) and the down/up sign split (`LDD PPOSY,X /
// SUBD PPOSY,U / LBLT …UP`, :3798-3800) — so a NO-TARGET bounder/hunter flies
// LEVEL (BOLEV :3903 / B2LEV :4054) and never consults its BODNVY/HUDNVY dial.
// The gate is strict-INCLUSIVE on the long side, both directions: delta ≥ row
// is long DOWN (`CMPD BODNRG / BLT`, :3801-3802 — BLT exits only strictly
// under); delta ≤ row is long UP (`CMPD BOUPRG / BGT`, :3844-3845 — BGT exits
// only strictly over). A LONG bounder/hunter decide commits to a PDIST episode
// (see `SeekState` and `stepEnemy`); SHORT range and null-target fly level.
// Level flight here is the per-wake collapse "flap iff falling" — the timed
// BOLETM-family episodes are uf1-9's rows, deliberately not modelled yet.
// The horizontal cliff look-ahead (B2XLEN/SHXLEN) is `steerWake` below
// (jt8-3 — it writes the FACING before the brain runs); dir follows facing.

/** The route a bounder/hunter wake is on: a committed/long seek, or level. */
type SeekRoute = 'down' | 'up' | 'level'

/** One brain's five wave-scaled DYTBL seek rows, read fresh per decide. */
interface SeekRows {
  /** The down range gate, in whole pixels — long at delta ≥ gate. */
  readonly dnRg: number
  /** The down episode budget, in posY subpixels (negative). */
  readonly dnDi: number
  /** The up range gate (negative pixels) — long at delta ≤ gate. */
  readonly upRg: number
  /** The up episode budget, in posY subpixels (positive). */
  readonly upDi: number
  /** uf1-2 — the down-seek brake VY (`SUBD BODNVY` :3819 / `HUDNVY` :4004). */
  readonly brake: number
}

/**
 * uf1-9 — `LDA #2` at JOUSTRV4.SRC:3823 (bounder, `BODN1A`) and :4008 (hunter,
 * `B2DN1A`). The DOWN-seek's wing-down hold. HARDCODED in the 1982 source: it is
 * NOT BOUPWD/HUUPWD, which are the UP-seek holds. Both read 2 at wave 1 and the
 * rows walk to 1 from wave 3, so reading the row here looks right for two waves
 * and is wrong for every wave after. DECIMAL.
 */
export const DOWN_SEEK_WING_HOLD = 2

/**
 * uf1-9 — `LDA #8` at JOUSTRV4.SRC:4144 (`B2DICL`). The HUNTER's cliff-avoidance
 * dwell. The shadow lord's identically-shaped dwell at `SHDICL` (:4375) reads the
 * SHCLTM row instead; only that one was migrated to DYTBL. DECIMAL.
 */
export const HUNTER_CLIFF_DWELL = 8

/**
 * jt9-23 — `B2YLEN = SHYLEN EQU $14-6` = 14. The height, in whole pixels, the
 * up-seek decide samples ABOVE the bird for a cliff blocking the climb — the
 * VERTICAL `ANDA BCKYTB-B2YLEN,Y` (JOUSTRV4.SRC:4205 `B2UP` / `-SHYLEN` :4262
 * `SHUNUP`). DECIMAL. A different read from steerWake's HORIZONTAL `B2XLEN`
 * look-ahead: this one asks "is there a ceiling over my climb?", not "a wall
 * ahead of me?".
 */
const CLIMB_PREP_YLEN = 0x14 - 6

/**
 * jt9-23 — `ADDD #-$0040`, the climb-prep body's "FALLING FAST ENOUGH?" gate
 * (`B2UP3A` :4210 / `SHUP3A` :4426). Holding level below a cliff, the bird flaps
 * back toward its tracked line only once the fall reaches this VY; slower than
 * that it glides, wings up. HEX, in PVELY's 16-bit units.
 */
const CLIMB_PREP_FALL_FAST = 0x40

/** uf1-9 — one brain's UP-seek wing cadence, in wakes. */
interface WingRows {
  /** Wakes the wings stay DOWN (`BOUPWD` :3864 / `HUUPWD` :4182). */
  readonly down: number
  /** Wakes the wings stay UP (`BOUPWU` :3894 / `HUUPWU` :4047). */
  readonly up: number
  /**
   * The up-flight VY gate consulted AT EXPIRY of the wings-up hold, or null when
   * the brain has none. Only the hunter does (`HUUPVY` :4178); the bounder's
   * `BOUP1` flaps at expiry unconditionally.
   */
  readonly upVy: number | null
}

/** uf1-9 — the UP-seek cadence for a smart brain at a wave. */
function wingRows(brain: SmartBrain, wave: number): WingRows {
  if (brain === 'b2undr') {
    return {
      down: waveValue('HUUPWD', wave),
      up: waveValue('HUUPWU', wave),
      upVy: waveValue('HUUPVY', wave),
    }
  }
  return { down: waveValue('BOUPWD', wave), up: waveValue('BOUPWU', wave), upVy: null }
}

/**
 * uf1-9 — the "TIME UNTIL NEXT DECISION" interval a level-flight decide arms, in
 * wakes. `BOLETM` :3909 (bounder), `HULETM` :4060 (hunter), `SHLETM` :4316 /
 * `SHUPTM` :4283 (shadow lord).
 *
 * The shadow has TWO level states — `SHLEV` (its own line, SHLETM) and `SHLEP`
 * (the player's line, SHUPTM). This port's shadow re-decides on one level route,
 * so it reads SHLEP's SHUPTM: `SHLEP` is the branch a shadow with a live target
 * takes (:4277), and a null-target shadow does not run a decide at all.
 */
/**
 * jt9-18 — a level-flight interval `PjoyState`, with the BOLEV1↔BOLEV2 sub-phase.
 * `glide: true` is set ONLY on a forced-glide (BOLEV2) wake; the field is OMITTED
 * otherwise, so a normal level interval keeps its pre-jt9-18 shape (`{kind,timer}`)
 * and the many suites that assert that exact object stay green.
 */
function levelInterval(timer: number, glide: boolean | undefined): PjoyState {
  return glide === true ? { kind: 'interval', timer, glide: true } : { kind: 'interval', timer }
}

/**
 * jt9-18 (folded jt9-19) — the `PPVELX` snapshot taken at a level-flight decide:
 * freeze the TARGET's FLYX index into the homing workspace (`LDA PVELX,X / STA
 * PPVELX,U`, :3907-3908 and twins). A null-target level decide (SHLEV / a
 * quarry-less bounder) has no player to copy, so it snapshots NOTHING — the
 * homing workspace is left as-is and `homingWake` holds.
 */
function snapshotHoming(enemy: EnemyState, target: PlayerView | null): HomingState | undefined {
  if (target === null) return enemy.homing
  return { ...(enemy.homing ?? seedHoming()), ppvelx: target.velXIndex }
}

function decideInterval(brain: SmartBrain, wave: number, hasTarget: boolean): number {
  if (brain === 'boundr') return waveValue('BOLETM', wave)
  if (brain === 'b2undr') return waveValue('HULETM', wave)
  // The shadow lord has BOTH level states and they read different rows: `SHLEP`
  // (:4277-4284) tracks the PLAYER's line on SHUPTM, `SHLEV` (:4312-4317) tracks
  // its OWN line on SHLETM. Which one it is in is decided by whether SELPLY
  // found anybody — `SHLEV` is the no-players branch.
  return hasTarget ? waveValue('SHUPTM', wave) : waveValue('SHLETM', wave)
}

/**
 * uf1-9 — the wakes a cliff-avoidance dwell lasts. The shadow lord's `SHDICL`
 * (:4373-4376) reads the SHCLTM row; the hunter's identically-shaped `B2DICL`
 * (:4142-4145) is a HARDCODED 8 that was never migrated to DYTBL, so it must not
 * be wave-scaled with it.
 */
function cliffDwell(brain: SmartBrain, wave: number): number {
  return brain === 'shadow' ? waveValue('SHCLTM', wave) : HUNTER_CLIFF_DWELL
}

/** The bounder's rows: BODNRG :3801, BODNDI :3803, BOUPRG :3844, BOUPDI :3851. */
function boundrRows(wave: number): SeekRows {
  return {
    dnRg: waveValue('BODNRG', wave),
    dnDi: waveValue('BODNDI', wave),
    upRg: waveValue('BOUPRG', wave),
    upDi: waveValue('BOUPDI', wave),
    brake: waveValue('BODNVY', wave),
  }
}

/** The hunter's rows: HUDNRG :3984, HUDNDI :3988, HUUPRG :4028, HUUPDI :4035.
 * The RG curves are IDENTICAL to the bounder's at every GA1-5 wave — the DI
 * twins first disagree on wave 5 (cadence nibbles 2 vs 15). */
function b2undrRows(wave: number): SeekRows {
  return {
    dnRg: waveValue('HUDNRG', wave),
    dnDi: waveValue('HUDNDI', wave),
    upRg: waveValue('HUUPRG', wave),
    upDi: waveValue('HUUPDI', wave),
    brake: waveValue('HUDNVY', wave),
  }
}

/**
 * The DECIDE's routing (`BOUNDR` :3796-3803 / `B2UNDR` :3979-3990): null
 * target → level (`BEQ BOLEVV`); sign split on the delta (:3800); then the
 * range gate, strict-inclusive on the long side. Pure.
 */
function rangeRoute(delta: number | null, rows: SeekRows): SeekRoute {
  if (delta === null) return 'level'
  if (delta >= 0) return delta >= rows.dnRg ? 'down' : 'level'
  return delta <= rows.upRg ? 'up' : 'level'
}

/**
 * One bounder/hunter wake's decision. An armed `enemy.seek` episode PRE-EMPTS
 * the decide entirely — `BODN1`/`BOUP1` never re-run SELPLY, so mid-episode
 * the committed mode picks the law whatever the player is doing now.
 * Otherwise the range gate routes:
 *   down  → the brake law — flap iff the fall has reached the wave's VY dial
 *           (the arm wake runs it too: `SUBD BODNVY / BMI`, :3818-3820);
 *   up    → the climb law — flap iff not already rising (:3855-3860 collapsed
 *           per-wake: the BOUPWD/BOUPWU wing cadences are uf1-9's rows);
 *   level → BOLEV/B2LEV (:3903/:4054) — flap iff falling, dial dark.
 * Pure — the workspace is advanced by `stepEnemy`, never here.
 */
/**
 * uf1-9 — the route this wake is ACTUALLY on, which is not always what the
 * quarry's position says:
 *   • a committed PDIST episode pre-empts the decide entirely (uf1-8);
 *   • a running DECISION INTERVAL holds the level route until it expires
 *     (`BOLEV1 DEC PJOYT,U / BLE BOBRA2`, :3911-3912) — the ROM re-runs SELPLY
 *     only at that expiry, so a quarry that wanders into long range mid-interval
 *     changes nothing;
 *   • otherwise the range gate decides.
 */
function currentRoute(
  enemy: EnemyState,
  player: PlayerView | null | undefined,
  rows: SeekRows,
): SeekRoute {
  if (enemy.seek !== undefined) return enemy.seek.mode
  if (enemy.pjoy?.kind === 'interval') return 'level'
  return rangeRoute(player == null ? null : player.pixelY - (enemy.entity.posY >> 8), rows)
}

function pursue(enemy: EnemyState, player: PlayerView | null | undefined, rows: SeekRows): Decision {
  const velY = enemy.entity.velY
  const dir = enemy.facing
  const route: SeekRoute = currentRoute(enemy, player, rows)
  // uf1-9: inside a seek episode the WINGS are a latched state, not a per-wake
  // test — `pjoyWake` has already advanced `PJOY`/`PJOYT` for this wake, so the
  // brain just reads the phase it is in. `LDB #$01` / `CLRB` in the ROM.
  // A cliff dwell holds the wings UP and never flaps (`B2AV`/`SHAV` `CLRB`).
  if (enemy.pjoy?.kind === 'dwell') return { dir, flap: false }
  // jt9-23 — B2UP3, "LEVEL FLIGHT, READY TO GO UP" (the HUNTER only; the bounder's
  // BOUP diverts a blocked climb to plain BOLEV, :3850, and the shadow has its own
  // copy in `shadow()`). At the up-seek the decide samples the background one YLEN
  // above the bird (`B2UP` :4204); a cliff there holds it LEVEL instead of flapping
  // up into the box. The body (`B2UP3A` :4202-4218) flaps back toward the tracked
  // line only once the fall reaches #-$0040, else wings up. Re-derived per wake, so
  // a cleared cliff falls straight back to the climb; the port's per-wake line ≡
  // live line collapses the ROM's `PDIST+1 CMPB PPOSY+1` gate (as SHLEP does, :4279).
  if (enemy.brain === 'b2undr' && route === 'up' && cliffBlocksClimb(enemy)) {
    return { dir, flap: velY >= CLIMB_PREP_FALL_FAST }
  }
  if (route !== 'level' && enemy.pjoy?.kind === 'wing') {
    return { dir, flap: enemy.pjoy.wings === 'down' }
  }
  // No episode armed (a bare `boundr(e, p, w)` call, or a level route): the
  // per-wake laws.
  if (route === 'down') return { dir, flap: velY >= rows.brake }
  // Level route. jt9-18 — the wake AFTER a level flap is a FORCED GLIDE: `BOFAST`
  // set `PJOY = BOLEV2` (:3931), so this wake ran BOLEV2 (`CLRB`, :3936-3938), not
  // BOLEV1, and the falling test at :3926 was never reached. Otherwise the BOLEV1
  // law: flap iff falling.
  if (enemy.pjoy?.kind === 'interval' && enemy.pjoy.glide === true) return { dir, flap: false }
  return { dir, flap: velY >= 0 }
}

/**
 * uf1-9 — one wake of the `PJOY`/`PJOYT` wing cadence, run BEFORE the brain
 * reads it (the ROM's episode states decrement the countdown and fall into the
 * flap logic of the SAME wake). All on ENTRY state; pure.
 *
 * UP-seek — the two-phase square wave (`BOUP1` :3860-3867, `BOUP2` :3891-3898):
 *   • wings UP, not expired  → carry;
 *   • wings UP, expired      → flap: phase DOWN, reload BOUPWD/HUUPWD …unless
 *     this is the hunter and `HUUPVY` refuses the climb (`CMPD HUUPVY / BLT`,
 *     :4178-4179), in which case `INC PJOYT,U` (:4176) puts the countdown back
 *     to 1 so the NEXT wake retries rather than waiting a whole cadence;
 *   • wings DOWN, not expired → carry;
 *   • wings DOWN, expired     → phase UP, reload BOUPWU/HUUPWU.
 *
 * DOWN-seek (`BODN1`/`BODN2` :3818-3840) — asymmetric on purpose:
 *   • wings DOWN, not expired → carry;
 *   • wings DOWN, expired     → wings UP and arm NOTHING (`CLRB`, :3839);
 *   • wings UP                → re-run the brake (`SUBD BODNVY / BMI`,
 *     :3819-3820) and, when it fires, hold the wings down for the HARDCODED
 *     `DOWN_SEEK_WING_HOLD` wakes — never the BOUPWD row.
 */
function wingWake(
  enemy: EnemyState,
  route: SeekRoute,
  brake: number,
  wave: number,
): PjoyState | undefined {
  const brain = enemy.brain === 'linet' ? null : enemy.brain
  if (brain === null || route === 'level') return undefined
  const velY = enemy.entity.velY
  const phase = enemy.pjoy?.kind === 'wing' ? enemy.pjoy : undefined
  const held = phase?.wings
  const remaining = phase === undefined ? 0 : phase.timer - 1

  if (route === 'up') {
    const rows = wingRows(brain, wave)
    // THE ARM WAKE IS ASYMMETRIC BETWEEN THE BRAINS, and it is deliberate:
    //   • the bounder's decide ends `BRA BOUP1A` (:3853) — straight into the
    //     FLAP branch, so it enters wings DOWN on BOUPWD and commits a flap on
    //     the arm wake itself, without consulting any VY gate;
    //   • the hunter's ends `BRA B2UP2D` (:4037) — into `LDA HUUPWU / … / CLRB`
    //     (:4047-4051), so it enters wings UP and glides a full HUUPWU hold
    //     before its first flap, which is then gated on HUUPVY.
    // Seeding both the same way costs the bounder its entry flap and it stops
    // climbing toward a quarry above it.
    if (held === undefined) {
      return brain === 'boundr'
        ? { kind: 'wing', timer: rows.down, wings: 'down' }
        : { kind: 'wing', timer: rows.up, wings: 'up' }
    }
    if (remaining > 0) return { kind: 'wing', timer: remaining, wings: held }
    if (held === 'down') return { kind: 'wing', timer: rows.up, wings: 'up' }
    // The wings-up hold has expired: flap, unless the up-flight VY gate refuses.
    if (rows.upVy !== null && velY < rows.upVy) return { kind: 'wing', timer: 1, wings: 'up' }
    return { kind: 'wing', timer: rows.down, wings: 'down' }
  }

  // route === 'down'
  if (held === 'down') {
    if (remaining > 0) return { kind: 'wing', timer: remaining, wings: 'down' }
    return { kind: 'wing', timer: 0, wings: 'up' }
  }
  if (velY >= brake) return { kind: 'wing', timer: DOWN_SEEK_WING_HOLD, wings: 'down' }
  return { kind: 'wing', timer: 0, wings: 'up' }
}

/**
 * Bounder (`BOUNDR` :3787-3946): the range-gated episodic pursuit through its
 * own rows — BODNRG/BOUPRG gates, BODNDI/BOUPDI budgets, the BODNVY brake
 * (JOUSTRV4.SRC:3819; $0100 on waves 1-2, walking to $0300). Moves in facing
 * direction. Pure.
 */
export function boundr(enemy: EnemyState, player: PlayerView | null, wave = 1): Decision {
  return pursue(enemy, player, boundrRows(wave))
}

/**
 * Hunter (`B2UNDR` :3960-4200): the same episodic pursuit as the bounder
 * through its OWN rows — HUDNRG/HUUPRG gates, HUDNDI/HUUPDI budgets, and the
 * faster HUDNVY brake (JOUSTRV4.SRC:4004; $0200 on waves 1-2 climbing to
 * $0380, above the bounder's at every wave). Pure.
 */
export function b2undr(enemy: EnemyState, player: PlayerView | null, wave = 1): Decision {
  return pursue(enemy, player, b2undrRows(wave))
}

/**
 * Shadow lord (`SHADOW` :4230-4330): stateless — no DI rows, no SeekState; it
 * re-decides every wake. Null target → SHLEV (own line, per-wake collapse:
 * wings up, plus the protective lava flap standing in for the unmodelled
 * BOLAVA route SHDIR's `$D0` gate diverts to, :4330-4334). Otherwise each
 * branch carries its OWN lava term — jt8-3 retired the old blanket pre-branch
 * flap, which fired in three places the ROM does not:
 *   • delta ≥ SHDNRG(wave) → SHDN, the no-flap free-fall (`CLRB` :4246-4248);
 *     its escape (:4249-4254) is `pixelY ≥ $D3` — INCLUSIVE — gated on
 *     `PVELX ≥ 0`. The gate reads the X velocity as written; its own comment
 *     says "FALLING?" and the comment is wrong, identically in all four
 *     vendored revisions (RV1:4178/RV2:4213/RV3:4230/RV4:4252 — claims
 *     JT83-008; the port pins the machine, not the prose).
 *   • delta ≤ SHUPRG(wave) → up-seek: flap iff not already rising.
 *   • SHORT range → SHLEP (:4277): track the player's line with NO velY gate
 *     on the line term (`CMPB PDIST+1,U / BLS SHLEPA`, :4293-4294) — but the
 *     lava term (:4288-4292) is FALLING-gated (`LDA PVELY,U / BPL SHFAST`),
 *     PVELY this time, not SHDN's PVELX. Two branches, two different gates.
 * The ROM tracks the line STORED at the SHLEP decide (:4279-4280) on the
 * SHUPTM decision timer (:4283-4284, uf1-9's family); re-deciding every wake
 * makes stored ≡ live, so the collapse tracks the live line. Pure.
 */
export function shadow(enemy: EnemyState, player: PlayerView | null, wave = 1): Decision {
  const enemyY = enemy.entity.posY >> 8
  const velY = enemy.entity.velY
  const dir = enemy.facing
  // uf1-9 — `SHAV`, the cliff-avoidance dwell armed by `SHDICL` for SHCLTM
  // wakes: `CLRB` (:4406) holds the wings UP for the whole dwell and the brain
  // does not re-decide until it expires.
  if (enemy.pjoy?.kind === 'dwell') return { dir, flap: false }
  // jt9-29 — `SHUP1` (:4269-4275), the climb the lava-troll looker armed via
  // `SHUPST` on the previous wake. It FLAPS into the climb unless already rising
  // faster than the SHUPVY gate (`CMPD SHUPVY / BLT SHUP0`, strict), and steers
  // through `SHDIRB` — a moving seek coasts (dir 0), a parked one aims at facing.
  // The pointer then hands `PJOY` back to `SHADOW` (cleared once consumed).
  if (enemy.pjoy?.kind === 'climb') {
    const coast: -1 | 0 | 1 = enemy.entity.velXIndex !== 0 ? 0 : dir
    return { dir: coast, flap: velY >= waveValue('SHUPVY', wave) }
  }
  // jt9-18 — the SHLEP2/SHLEV2 forced glide: the wake after a shadow level flap
  // is a glide (`SHLEP2`/`SHLEV2` point PJOY back and `CLRB`, :4300-4302/:4399-4401).
  // A shadow only ever holds an interval on a level route, so this gate is the
  // level forced-glide for BOTH shadow branches, before either flap law runs.
  if (enemy.pjoy?.kind === 'interval' && enemy.pjoy.glide === true) return { dir, flap: false }
  // SHLEV — no players: wings up, with the BOLAVA stand-in below the lava line.
  if (player == null) return { dir, flap: enemyY > LAVA_ESCAPE_Y }
  const delta = player.pixelY - enemyY
  // uf1-9 round 2 (R1-2's sibling, found by mutation M17) — A RUNNING DECISION
  // INTERVAL HOLDS THE LEVEL BRANCH. `SHLEP1`/`SHLEV1` spend the countdown
  // (`DEC PJOYT,U / LBLE SHBRA2`, :4286-4287 and :4319-4320) and only that expiry
  // returns to `SHADOW` to re-run the range gate, so a quarry that wanders into
  // free-fall or climb range mid-interval changes nothing. Without this the row
  // was READ and stored and then gated nothing at all — armed, ticked, and inert,
  // which is the shape round 1 rejected for SHCLTM.
  const holding = enemy.pjoy?.kind === 'interval'
  // jt9-20 — SHDIRB (:4388-4392) is the no-steer exit BOTH long-range seeks jump
  // to (SHDN :4255, SHUP0 :4267, SHUP1 :4275): `LDA PVELX,U / BEQ SHDIRA / CLRA /
  // STD CURJOY`. A MOVING seek (PVELX≠0) writes CURJOY dir 0 — it COASTS, no
  // horizontal thrust; only a PARKED seek (PVELX==0) falls through to SHDIRA and
  // aims at its facing. The port previously thrust at `dir` on every branch.
  const coastDir: -1 | 0 | 1 = enemy.entity.velXIndex !== 0 ? 0 : dir
  // SHDN — the free-fall; the escape is velX-gated and inclusive at $D3.
  if (!holding && delta >= waveValue('SHDNRG', wave))
    return { dir: coastDir, flap: enemyY >= LAVA_ESCAPE_Y && enemy.entity.velXIndex >= 0 }
  // Long-range up-seek (`SHUP1` :4269-4275): flap unless already climbing FASTER
  // than the SHUPVY gate. uf1-9 — before this the port compared against a bare 0,
  // which is the gate's wave-1 value only in sign: SHUPVY is -$0200 at wave 1 and
  // -$0400 from wave 3, so a shadow rising in [-$0200, 0) flapped in the ROM and
  // did not here. NOTE the gate carries NO countdown — unlike the hunter's
  // HUUPVY (:4174-4179) it is consulted on every entry to SHUP1, which is why it
  // lives in this per-wake law and not in `wingWake`. `CMPD SHUPVY / BLT SHUP0`
  // is strict, so velY EQUAL to the gate still flaps.
  if (!holding && delta <= waveValue('SHUPRG', wave)) {
    // jt9-23 — SHUP3, the shadow's copy of "LEVEL FLIGHT, READY TO GO UP": a cliff
    // one SHYLEN above (`SHUNUP` :4261-4262 → `LBNE SHUP3`) suppresses the climb and
    // holds level, flapping back toward the tracked line only past #-$0040 (`SHUP3A`
    // :4426). Stateless like the rest of the shadow's up-seek — re-checked each wake,
    // so a cleared cliff resumes the climb. NOTE: `SHUP3A`/`SHUP3B` `JMP SHDIRA`
    // (:4434/:4441) — the AIMING routine (`SHFDIR` :4382, dir = facing, no PVELX
    // check) — NOT `SHDIRB`'s coast. So this AIMS at `dir`, unlike SHUP1 above which
    // coasts (`SHUP1`→`SHDIRB`, jt9-20). Reviewer R1 F1: was `coastDir`, corrected.
    if (cliffBlocksClimb(enemy)) return { dir, flap: velY >= CLIMB_PREP_FALL_FAST }
    return { dir: coastDir, flap: velY >= waveValue('SHUPVY', wave) }
  }
  // SHLEP — track the line; the lava term is falling-gated (velY, not velX).
  return { dir, flap: enemyY > player.pixelY || (enemyY >= LAVA_ESCAPE_Y && velY >= 0) }
}

// ─── Horizontal homing (BODIR / BOLEVB) ─────────────────────────────────────
//
// The only thing that ever changes the BOUNDER's facing. (Not "a smart enemy's"
// — the hunter and the shadow lord also AIM, via `B2DIR`'s `CLR PFACE,U  FACE
// RIGHT` / `STA PFACE,U  FACE LEFT` at :4122/:4141 and `SHDIR`'s pair at
// :4353/:4372 — `steerWake` in the section below, landed by jt8-3. What is true
// here, and enumerated mechanically in tests/homing-source.test.ts, is that
// across the whole BOUNDR brain :3787-3946 the COM at :3945 is the sole PFACE
// write.) Before jt8-2 an enemy's `facing` was set at spawn and never moved, so
// it orbited the arena at a fixed heading.
//
//   BOLEVB  LDA  PPVELX,U   :3939   "DO NOT COPY PLAYERS MOVES TOO OFTEN"
//           CMPA PVELX,U    :3940   ← the ENEMY'S OWN index (U = self)
//           BNE  BODIR3     :3941     different ⇒ nothing happens at all
//           DEC  PRDIR,U    :3942     same     ⇒ tick the reverse counter
//           BMI  BODIR3     :3943     still negative ⇒ no flip
//           CLR  PRDIR,U    :3944
//           COM  PFACE,U    :3945   "TRY THE OTHER DIRECTION"
//   BODIR3  JMP  BODIR      :3946   ← BODIR reads the NEW facing, this same wake
//
// Note what this is NOT: there is no toward-the-target term. The enemy flies its
// current heading until its own speed MATCHES its target's — i.e. until it is
// shadowing them in lockstep and therefore never closing — and only then, after
// the throttle counts out, reverses to cut them off. Steering that genuinely
// aims at the player is `B2DIR`/`SHDIR` (:4104-4159, :4335-4382), a later story.
// Across the whole BOUNDR brain (:3787-3946) the only write to PFACE is the COM.
//
// The identical block appears once per smart brain — bounder BOLEVB :3939-3946,
// hunter B2LE11 :4087-4094, shadow SHLEPB :4303-4310 (the shadow's copy uses the
// long branches `LBNE`/`LBMI`) — so this one function serves all three.

/**
 * The homing workspace a MOUNTED enemy is born with: `prdir` = `SEEKFS_PRDIR`, so
 * it reverses on its FIRST velocity-matched wake.
 *
 *   SEEKFS  LDA  #1                  JOUSTRV4.SRC:3584
 *           STA  PRDIR,U   THE BIRD CAME WITHIN SHORT RANGE SENSORS    :3585
 *           …
 *           BEQ  MOUNTM    GOT THE MAN!!!                              :3592
 *   MOUNTM  PULS B                                                     :3654
 *   …       LDD  DSMART,X  SELECT PROPER JOYSTICK ROUTINE              :3693
 *           STD  PJOY,U                                                :3694
 *
 * `MOUNTM` is branched to from exactly ONE place in the whole source (:3592),
 * that branch sits in the straight-line run beginning at `SEEKFS` — no label in
 * between can bypass the store — and nothing rewrites `PRDIR` before the
 * `DSMART` install. So every bird that acquires a rider enters its smart brain
 * at 1.
 *
 * NOT `CLR PRDIR,Y` ("ASSUME BIRD NEVER CAME WITHIN SHORT RANGE SCAN", :3255).
 * That line is real but it clears the RIDERLESS seeker the hatch sends out under
 * `PJOY = SEEKE` ("TELL THE DOGIE TO FETCH THE LITTLE MAN", :3268) — a state
 * this port has no `EnemyState` for, since every enemy here is already mounted.
 * Seeding from it made the flip cost 129 matched wakes from a standing start and
 * the mechanism never fired in play.
 *
 * The transporter-entry path is left UNDEFINED by the ROM rather than zeroed —
 * `CUPROC` writes only PLINK/PNAP/PPC/PID/PPRI (SYSTEM.SRC:387-404), so the
 * recycled workspace is never cleared; `WCREATE` clears PCHASE and not PRDIR
 * (:2201); and `LNTSMT` promotes LINET → smart without touching it (:3764-3775).
 * A port must be deterministic, so it unifies on the one DEFINED mounted value.
 * Logged as a Design Deviation.
 *
 * Pure.
 */
export function seedHoming(): HomingState {
  return { prdir: SEEKFS_PRDIR }
}

/**
 * `BOLEVB` (JOUSTRV4.SRC:3939-3946) — one wake of the horizontal-homing
 * throttle. Returns the enemy with its `facing` and `homing` advanced. Pure —
 * the argument is never mutated.
 *
 * A wake counts ONLY when the enemy is flying the speed the target had AT THE
 * LEVEL-FLIGHT DECIDE (jt9-18: `PPVELX`, the snapshot frozen there), not the
 * target's live speed; a mismatched wake leaves the counter untouched (not reset
 * — skipped), so the 129-wake budget is spent in matched frames alone.
 */
export function homingWake(enemy: EnemyState, target: PlayerView | null): EnemyState {
  // The dumb lane-tracker has no homing at all — it moves in its facing and
  // never reverses (`LNTFLP  TST PFACE,U   MOVE IN DIRECTION OF FACING`, :3749).
  if (enemy.brain === 'linet') return enemy
  // Nobody to copy. Holding here is what keeps a bare scheduler run — where
  // every enemy is stepped with no target — bit-identical to its pre-jt8-2 replay.
  if (target === null) return enemy
  // jt9-18 (folded jt9-19): the throttle reads `PPVELX,U` — the target's index
  // SNAPSHOTTED at the last level decide (:3939) — held for the interval. In the
  // ROM `BOLEVB` is reached ONLY after `BOLEV` froze that snapshot, so a snapshot
  // always exists when it runs; this port calls the throttle every wake, so before
  // any level decide has frozen one it FALLS BACK to the target's live index (the
  // pre-jt9-18 read). The snapshot therefore OVERRIDES only where the ROM has one
  // — inside a held level interval — and off-level / freshly-mounted wakes are
  // unchanged. The two diverge exactly when the target changes speed mid-interval.
  const snapshot = enemy.homing?.ppvelx
  const gate = snapshot ?? target.velXIndex
  // `CMPA PVELX,U / BNE BODIR3` (:3940-3941): the branch jumps CLEAR of the DEC,
  // so a wake on which the enemy is not matching that index does not tick at all.
  if (gate !== enemy.entity.velXIndex) return enemy
  // `DEC PRDIR,U` (:3942) — 8-bit, and the wrap is the whole cadence. The snapshot
  // rides along untouched (the ROM never rewrites PPVELX in BOLEVB).
  const prdir = ((enemy.homing ?? seedHoming()).prdir - 1) & 0xff
  // `BMI BODIR3` (:3943) — N set (bit 7 of the result), so no flip this wake.
  if (prdir & 0x80) return { ...enemy, homing: { prdir, ppvelx: snapshot } }
  // `CLR PRDIR,U` (:3944) then `COM PFACE,U` (:3945). A COMplement toggles the
  // facing; it does not aim it.
  return { ...enemy, facing: enemy.facing === 1 ? -1 : 1, homing: { prdir: 0, ppvelx: snapshot } }
}

// ─── Cliff look-ahead steering (B2DIR / SHDIR) — jt8-3 ─────────────────────
//
// The first facing-writer in this port that KNOWS where it is pointing.
// `homingWake` above is a blind complement; `B2DIR` (:4104-4159) and `SHDIR`
// (:4330-4377) SET the facing away from a cliff detected B2XLEN/SHXLEN = 31 px
// ahead in the travel direction — `CLR PFACE,U  FACE RIGHT` (:4122/:4353),
// `#-1 STA PFACE  FACE LEFT` (:4140-4141/:4371-4372) — which makes the wake
// idempotent: re-running it against the same cliff re-sets the same facing.
//
// WHO STEERS, ON WHICH WAKES (every route traced; the port keeps the map):
//   hunter  — every airborne wake: the episode exits funnel through `B2DIRL`
//             (:4097-4102 — at/below $D3 AND falling ⇒ `JMP BOLAVA`, no steer)
//             and the level path through `B2LE11 → B2DIR` (:4089-4094);
//   shadow  — ONLY the no-players SHLEV route (:4326-4330, `SHLEVA JMP SHDIR`
//             :4401-4402), behind its own $D0 pre-check (:4330-4334). A
//             HUNTING shadow never looks: SHLEP exits `SHLEPB → SHDIRA`
//             (:4303-4310, no BCKXTB read on the whole path) and the seeks
//             coast via `SHDIRB` (:4388-4392);
//   bounder — never: `BODIR` (:3876-3884) reads PFACE and samples nothing.
//
// THE SAMPLE is the BACKGROUND-collision pair — `BCKXTB ± XLEN` ANDed with
// `BCKYTB` at the flight line projected by (PVELY×8)'s HIGH byte (three
// ASLB/ROLA pairs :4108-4115, then `LEAY A,Y` :4118) — a diving bird looks
// where it is GOING, 16 px below at a $0200 fall. NOT the landing pair:
// `groundMaskAt` is the `CKGND` analog (`LNDXTB/LNDYTB`, :6705-6706), a
// different map with thin landing strips where BCK has tall cliff boxes.
//
// THE TURN slows the bird: `B2DICL`/`SHDICL` install the B2AV/SHAV episode —
// 8 wakes of wings-up thrust on the NEW facing (:4142-4146/:4373-4377,
// :4190-4193/:4406-4409) — and flap the turn wake itself (`LDB #1`), stepping
// the FLYX index 2 toward the new facing through ADDFLP (:6437-6439). The
// 8-wake PJOYT hold is the decision-timer family (uf1-9's rows); the per-wake
// collapse keeps the turn-wake flap and lets the idempotent re-steer supply
// the sustained brake (Design Deviation, session file). BOLAVA itself is the
// lava-avoid episode the gates DIVERT to — modelled as a `PjoyState` in
// `stepEnemyDetailed` (jt9-22); `steerWake` holds on a gated wake because
// BOLAVA aims via `BODIR`, not the look-ahead.

/** What one steering wake did to the enemy. */
export interface SteerResult {
  /** The enemy after the wake — facing set AWAY from a detected cliff. */
  readonly enemy: EnemyState
  /** Whether a cliff was detected ahead this wake (`BEQ B2DIRA` NOT taken).
   * A turned wake flaps (`LDB #1`) — `stepEnemyDetailed` routes that into the
   * entity input so the FLYX index steps away from the cliff. */
  readonly turned: boolean
}

/** `BCKXTB[x] & BCKYTB[y]` — the BACKGROUND-collision point sample the
 * look-ahead reads (:4119-4120), indexed exactly as `landMaskAtX` indexes the
 * landing pair; outside either table there is no background to hit. */
function bckMaskAt(x: number, y: number): number {
  const i = x + X_TABLE_ORIGIN
  const col = i >= 0 && i < BCK_X_TABLE.length ? BCK_X_TABLE[i] : 0
  return y >= 0 && y < BCK_Y_TABLE.length ? col & BCK_Y_TABLE[y] : 0
}

/**
 * jt9-23 — the up-seek decide's VERTICAL cliff sample: is there solid background
 * one height-look-up (`CLIMB_PREP_YLEN`) ABOVE the bird, blocking the climb?
 * `LDA BCKXTB,X / ANDA BCKYTB-B2YLEN,Y` (JOUSTRV4.SRC:4204-4205 / `SHUNUP`
 * :4261-4262). A non-zero sample is the ROM's `LBNE B2UP3`/`LBNE SHUP3` — enter
 * "LEVEL FLIGHT, READY TO GO UP" instead of committing to the climb. Pure.
 */
function cliffBlocksClimb(enemy: EnemyState): boolean {
  return bckMaskAt(enemy.entity.posX, (enemy.entity.posY >> 8) - CLIMB_PREP_YLEN) !== 0
}

/**
 * The lava-avoid DIVERT gate: does this airborne wake `JMP BOLAVA`? The hunter
 * `B2DIRL` (:4097-4102) gates at `$D3` (`LAVA_ESCAPE_Y`); the no-target shadow
 * `SHDIR` pre-check (:4330-4334) gates at `$D0` (`SHDIR_LAVA_Y`) — three
 * scanlines earlier — and only ever with no target (a hunting shadow exits
 * SHDIRA/SHDIRB). Both require a FALLING bird (`LDA PVELY,U / BMI`/`LBPL`,
 * velY ≥ 0). The single home for the two thresholds, read by BOTH `steerWake`
 * (which then holds — BOLAVA does not aim) and the divert in `stepEnemyDetailed`
 * (which arms the episode). Pure.
 */
export function lavaGateFires(enemy: EnemyState, target: PlayerView | null): boolean {
  if (!enemy.entity.airborne) return false
  if (enemy.entity.velY < 0) return false
  const pixelY = enemy.entity.posY >> 8
  if (enemy.brain === 'b2undr') return pixelY >= LAVA_ESCAPE_Y
  if (enemy.brain === 'shadow') return target === null && pixelY >= SHDIR_LAVA_Y
  return false
}

/**
 * One look-ahead wake (`B2DIR` :4104-4159 / `SHDIR` :4330-4377), collapsed
 * per-wake. Runs for the hunter on every airborne wake behind the `$D3`
 * B2DIRL gate; for the shadow only with no target, behind the `$D0` SHDIR
 * gate; never for the bounder, the dumb LINET, a grounded enemy, or a parked
 * FLYX index (`LDA PVELX,U / BEQ B2DIRA`, :4104-4105 — no travel direction,
 * no look-ahead). A solid sample turns the facing AWAY from the cliff and
 * reports `turned`; open air holds everything. Pure — the argument is never
 * mutated.
 */
export function steerWake(enemy: EnemyState, target: PlayerView | null): SteerResult {
  const held: SteerResult = { enemy, turned: false }
  if (!enemy.entity.airborne) return held
  const pixelY = enemy.entity.posY >> 8
  const velY = enemy.entity.velY
  if (enemy.brain === 'b2undr') {
    // B2DIRL (:4097-4102): at/below $D3 and falling is BOLAVA's territory.
    if (lavaGateFires(enemy, target)) return held
  } else if (enemy.brain === 'shadow') {
    // Only SHLEV falls into SHDIR; a hunting shadow exits SHDIRA/SHDIRB.
    if (target !== null) return held
    // SHDIR's own pre-check (:4330-4334): $D0, three scanlines above $D3.
    if (lavaGateFires(enemy, target)) return held
  } else {
    return held
  }
  const vx = enemy.entity.velXIndex
  if (vx === 0) return held
  const dir = vx > 0 ? 1 : -1
  const len = enemy.brain === 'shadow' ? SHXLEN : B2XLEN
  // The (PVELY×8)>>8 projection (:4108-4118): sample where the bird is going.
  const sampleY = pixelY + ((velY * 8) >> 8)
  if (bckMaskAt(enemy.entity.posX + len * dir, sampleY) === 0) return held
  return { enemy: { ...enemy, facing: dir > 0 ? -1 : 1 }, turned: true }
}

/**
 * Dispatch by `enemy.brain`: `linet` runs the dumb lane-track (player ignored);
 * a smart brain runs its pursuit against `player`. Pure.
 */
export function runBrain(enemy: EnemyState, player?: PlayerView | null, wave = 1): Decision {
  switch (enemy.brain) {
    case 'boundr':
      return boundr(enemy, player ?? null, wave)
    case 'b2undr':
      return b2undr(enemy, player ?? null, wave)
    case 'shadow':
      // uf1-8 — the shadow's SHDNRG/SHUPRG range gates are wave-scaled too;
      // SHUPVY, its UP-flight VY gate, still waits on uf1-9.
      return shadow(enemy, player ?? null, wave)
    default:
      return linet(enemy)
  }
}

// ─── The flight pipeline (the SAME one players use) ─────────────────────────
//
// This mirrors frame.ts's `stepPlayerEntity` verbatim — the jt1-5 flight/ground
// pipeline, unchanged — so an enemy integrates through the very `flap()` /
// `stepFlight()` / ceiling / wrap / land a player does (buzzards flap). It is
// duplicated rather than imported because flight.ts is generated (no hand-edit)
// and importing frame.ts would form a cycle (frame.ts imports this module).

function stepEntity(state: EntityState, input: PlayerInput): EntityState {
  let s = state

  if (s.airborne) {
    if (input.flap) s = flap(s, input)
    s = stepFlight(s, input)
    s = { ...s, timeUp: tickTimeUp(s.timeUp) }

    const ceiling = applyCeiling(s.posY, s.velY)
    s = { ...s, posY: ceiling.posY, velY: ceiling.velY }
    s = { ...s, posX: wrapX(s.posX) }

    const outcome = groundOutcome(groundMaskAt(s.posX, s.posY >> 8))
    if (outcome.kind === 'platform') s = land(s, outcome.platform)
  } else {
    s = stepGround(s, input)
    s = { ...s, posX: wrapX(s.posX) }
    if (input.flap) {
      s = takeOff(s)
    } else if (groundOutcome(groundMaskAt(s.posX, (s.posY >> 8) + 1)).kind === 'airborne') {
      s = walkOff(s)
    }
  }

  return s
}

/**
 * One integration step of an enemy on the flight core: run its brain, then apply
 * the decision through the SAME flight pipeline a player uses (flap + stepFlight
 * + ceiling/wrap/land). The brain's `flap` drives BOTH the flap edge and the
 * wings-held gravity of the synthetic joystick (`CURJOY`): a flapping buzzard's
 * wings are down. Returns the enemy after the step. The EMYTIM divider is the
 * scheduler `period`, NOT anything inside this step. Pure — the input untouched.
 *
 * A thin wrapper over `stepEnemyDetailed` (jt5-3), kept at this exact signature
 * because `tests/helpers/enemy-contract.ts` pins it — every existing caller and
 * test wants the enemy alone, not the wing cue riding beside it.
 */
export function stepEnemy(
  enemy: EnemyState,
  ctx?: { player?: PlayerView | null; wave?: number },
): EnemyState {
  return stepEnemyDetailed(enemy, ctx).enemy
}

/**
 * uf1-8 — one wake of the SEEK-EPISODE workspace, run BEFORE the brain reads
 * it (the ROM's episode states spend PDIST and fall into the flap logic of the
 * same wake). All on ENTRY state. The laws (`BODN1` :3811-3817 / `BOUP1`
 * :3855-3860 and their B2 twins):
 *   • a grounded enemy exits its episode and re-decides (`BODN1 LDD PSTATE,U /
 *     BNE BOBRAIN`, :3811-3812);
 *   • a carried episode spends `pdist += entry velY` ONLY on a wake moving in
 *     its direction — a rising wake in a down episode (`BMI`, :3814) and a
 *     falling wake in an up episode (`BPL`, :3856) skip the add — and is
 *     otherwise carried UNTOUCHED, never re-seeded while unspent;
 *   • a spend that crosses zero (down: ≥ 0, up: < 0) exhausts the episode and
 *     re-decides THE SAME WAKE (`BPL BOBRAIN` :3816, `BOBRAIN JMP BOUNDR`
 *     :3842) — the fresh decide may arm a fresh episode at the FULL wave value;
 *   • the decide arms a LONG-range route with the wave's DI row, unspent
 *     (`LDD BODNDI / STD PDIST,U`, :3803-3804 — the arm wake performs no ADDD);
 *   • short-range, null-target, shadow and linet wakes carry NO workspace.
 * Pure — the argument is never mutated.
 */
function seekWake(enemyIn: EnemyState, target: PlayerView | null, wave: number): EnemyState {
  let enemy = enemyIn
  // R1-2 — THE CLIFF DWELL PRE-EMPTS THE DECIDE, and it is ticked HERE (before
  // any routing) because `B2AV`/`SHAV` are states the brain sits IN: while the
  // countdown runs, `B2UNDR`/`SHADOW` are never re-entered, so no route is
  // chosen and no interval is armed. On expiry the ROM's `JMP B2UNDR` re-decides
  // on the SAME wake, which is what falling through from here reproduces. Ticking
  // it later (in `withWingCadence`) let this decide clobber the dwell first.
  const dwell = enemy.pjoy?.kind === 'dwell' ? enemy.pjoy : undefined
  if (dwell !== undefined) {
    const remaining = dwell.timer - 1
    if (remaining > 0) return { ...enemy, pjoy: { kind: 'dwell', timer: remaining } }
    enemy = { ...enemy, pjoy: undefined }
  }
  // Narrowed with an inline test rather than a boolean const: TS carries the
  // narrowing through the rest of the function, which is what lets
  // `decideInterval(enemy.brain, …)` below take a SmartBrain with no cast (R1-6).
  if (enemy.brain !== 'boundr' && enemy.brain !== 'b2undr') {
    // The shadow lord has no DI rows (it re-enters SHADOW each wake, :4269-4270)
    // so it never carries a seek episode — but it DOES carry a countdown: the
    // SHLEP/SHLEV decision interval and the SHDICL cliff dwell.
    const cleared = enemy.seek === undefined ? enemy : { ...enemy, seek: undefined }
    if (enemy.brain !== 'shadow') {
      // jt5-8 — one exception to "a linet wake carries NO workspace": the LNTOFP
      // glide lives in `PJOY,U` too, and this wake is the one that spends it.
      // Everything else on a dumb bird is still wiped, so uf1-9's law holds.
      if (cleared.pjoy?.kind === 'glide') return cleared
      return cleared.pjoy === undefined ? cleared : { ...cleared, pjoy: undefined }
    }
    return shadowDwellWake(cleared, target, wave)
  }
  const rows = enemy.brain === 'boundr' ? boundrRows(wave) : b2undrRows(wave)
  // The ground exit: PSTATE ≠ 0 abandons the episode and re-decides.
  let carried = enemy.entity.airborne ? enemy.seek : undefined
  if (carried !== undefined) {
    const velY = enemy.entity.velY
    // Spend the wake's ENTRY velY, only while moving with the episode.
    const spends = carried.mode === 'down' ? velY >= 0 : velY < 0
    const pdist = spends ? carried.pdist + velY : carried.pdist
    const exhausted = carried.mode === 'down' ? pdist >= 0 : pdist < 0
    if (!exhausted) return { ...enemy, seek: { mode: carried.mode, pdist } }
    carried = undefined // BPL/BMI BOBRAIN → JMP BOUNDR: re-decide the SAME wake
  }
  // uf1-9 — THE DECISION INTERVAL. A level-flight decide is not re-run every
  // wake: `BOLEV` stores the line to track and arms `BOLETM` (:3903-3910), and
  // `BOLEV1` spends it (`DEC PJOYT,U / BLE BOBRA2`, :3911-3912) — only that
  // expiry returns to the brain (`BOBRAIN JMP BOUNDR`, :3842) and re-runs
  // SELPLY. So while the interval is running the route is HELD, however the
  // quarry moves. A level decide is the only route with no wing phase, which is
  // what `wings: undefined` marks.
  const interval = enemy.pjoy?.kind === 'interval' ? enemy.pjoy : undefined
  if (interval !== undefined) {
    const remaining = interval.timer - 1
    if (remaining > 0) {
      // jt9-18 — carry the BOLEV1↔BOLEV2 sub-phase across the countdown; only the
      // timer spends. `stepEnemyDetailed` sets it from this wake's flap decision.
      const carried: EnemyState = {
        ...enemy,
        pjoy: levelInterval(remaining, interval.glide),
      }
      return carried.seek === undefined ? carried : { ...carried, seek: undefined }
    }
    // Expired — fall through and re-decide THIS wake.
  }
  const route = rangeRoute(
    target === null ? null : target.pixelY - (enemy.entity.posY >> 8),
    rows,
  )
  if (route === 'down') return { ...enemy, seek: { mode: 'down', pdist: rows.dnDi }, pjoy: undefined }
  if (route === 'up') return { ...enemy, seek: { mode: 'up', pdist: rows.upDi }, pjoy: undefined }
  // A level decide arms its interval AND snapshots the target's velocity index
  // (PPVELX, jt9-18); the brain is `boundr`/`b2undr` here.
  const armed: PjoyState = {
    kind: 'interval',
    timer: decideInterval(enemy.brain, wave, target !== null),
  }
  return { ...enemy, seek: undefined, pjoy: armed, homing: snapshotHoming(enemy, target) }
}

/**
 * jt9-22 — `BOLAV1`'s re-check (`JOUSTRV4.SRC:3949-3952`): a re-check wake leaves
 * the lava episode (`BOLAV4`, back to the brains) when the bird has climbed above
 * `$D3` (`CMPA #$D3 / BLO BOLAV4`) OR is rising (`LDA PVELY,U / BMI BOLAV4`). The
 * threshold is `$D3` (`LAVA_ESCAPE_Y`) for BOTH brains — a shadow ENTERS the
 * episode at `$D0` but LEAVES it at `$D3`, which is why the two are not the same
 * constant. Pure.
 */
function lavaRecheckExits(enemy: EnemyState): boolean {
  return (enemy.entity.posY >> 8) < LAVA_ESCAPE_Y || enemy.entity.velY < 0
}

/**
 * jt5-3 — `stepEnemy` PLUS the wing edge this WAKE produced (or `null`). The
 * decision (and therefore the edge) is computed from `input.flap`/`flapHeld`,
 * which only this function's internals see — `stepEnemy`'s pinned signature
 * returns `EnemyState` alone, so frame.ts calls THIS to get the cue without
 * re-running the brain a second time. Pure — the argument is never mutated.
 */
export function stepEnemyDetailed(
  enemy: EnemyState,
  ctx?: { player?: PlayerView | null; wave?: number; lavaBehind?: boolean },
): { enemy: EnemyState; wingEdge: WingEdge } {
  const target = ctx?.player ?? null
  const wave = ctx?.wave ?? 1
  // jt9-1: `PPREV` — did a lava troll execute immediately before this process
  // this frame? Only the scheduler knows its own wake order, so it is threaded
  // in exactly as `player` (jt8-1) and `wave` (uf1-2) are.
  const lavaBehind = ctx?.lavaBehind ?? false
  // jt8-2: the homing wake runs BEFORE the brain. `COM PFACE,U` (:3945) falls
  // into `JMP BODIR` (:3946), whose first instruction is `LDA PFACE,U` (:3876) —
  // so a flip already steers THIS wake's horizontal impulse, not the next one.
  const flipped = homingWake(enemy, target)
  // jt8-3: the look-ahead runs AFTER the homing flip and its write WINS — in
  // the ROM the throttle blocks (`B2LE11`/`SHLEPB`) fall INTO the direction
  // routine, so B2DIR/SHDIR read (and may overwrite) the freshly-COMplemented
  // facing on the same wake.
  const steered = steerWake(flipped, target)
  const homed = steered.enemy
  // jt9-22 — BOLAVA (:3948-3964). An enemy already in the lava episode enters at
  // its stored `PJOY,U` address, which BYPASSES the whole brain/seek/wing
  // pipeline — the ping-pong runs and the facing rides on `homed` (the homing
  // flip; `steerWake` held, because BOLAVA aims via `BODIR`, not `B2DIR`/`SHDIR`).
  let settled: EnemyState
  let decision: Decision
  const lava = homed.pjoy?.kind === 'lava' ? homed.pjoy : null
  if (lava !== null && !(lava.entry === 'BOLAV1' && lavaRecheckExits(homed))) {
    // BOLAV2 (:3958-3961) COASTS (`CLRB`) and arms BOLAV1; a BOLAV1 that did NOT
    // exit falls into BOLAVA (:3953-3956) — FLAPS (`LDB #1`) and arms BOLAV2.
    // Target-blind: `dir` is the BODIR facing (`homed.facing`), no player read.
    const flap = lava.entry === 'BOLAV1'
    const entry: 'BOLAV2' | 'BOLAV1' = lava.entry === 'BOLAV2' ? 'BOLAV1' : 'BOLAV2'
    settled = { ...homed, pjoy: { kind: 'lava', entry } }
    decision = { dir: homed.facing, flap }
  } else {
    // A BOLAV1 re-check that clears the lava (`BOLAV4`) drops `PJOY,U` and falls
    // through to `[DSMART,X]` — the brains re-decide THIS wake. A non-lava wake
    // runs the pipeline unchanged.
    const base = lava !== null ? { ...homed, pjoy: undefined } : homed
    // jt9-29: does this wake enter a SMART brain at its top? The looker's
    // `DEC PLAVT,U` runs only there — read on the ENTRY state, before the seek
    // workspace advances, because that is the `PJOY` address dispatched to.
    const reDecides = smartBrainReDecides(base)
    // uf1-8: then the seek workspace advances (ground-exit → spend → exhaust →
    // re-decide/arm), so the brain reads the episode this wake is ACTUALLY in —
    // the arm wake already runs its episode's law, exactly as the ROM's decide
    // falls through into BODN1/BOUP1.
    const sought = seekWake(base, target, wave)
    // uf1-9: then the WING cadence advances, on the route the seek workspace just
    // settled — the ROM's `DEC PJOYT,U` sits inside the episode state and falls
    // into that state's own flap logic on the same wake. A level route leaves the
    // wing phase undefined; `seekWake` owns that route's countdown instead.
    const cadenced = steered.turned
      ? withCliffDwell(sought, wave)
      : withWingCadence(sought, target, wave)
    // uf1-2: the brain reads its per-wave difficulty row from `wave`. It runs on
    // the ALREADY-HOMED enemy, so the wave-scaled seek and the flipped facing are
    // the same wake's decision, not two.
    const decided = runBrain(cadenced, target, wave)
    // jt5-8: LINET's two-state wingbeat sits AROUND the lane decision, not inside
    // it — `linet()` stays the pure decision the ROM reaches at :3733, and this is
    // the `PJOY,U` dispatch that decides whether the wake entered there at all.
    const beat = dumbWingbeat(cadenced, decided, wave, lavaBehind)
    // jt9-29 — the SMART brains' lava-troll looker, at the brain TOP. It ticks
    // `plavt` on a re-decide wake and, on expiry with a troll behind, overrides
    // the decision with the brain's branch target (down-seek flap for the
    // bounder/hunter, the armed climb for the shadow). LINET's looker already ran
    // inside `dumbWingbeat`, so this touches only the three smart brains.
    const looked = smartBrainLooker(beat.enemy, beat.decision, wave, lavaBehind, reDecides)
    // jt9-22 — the DIVERT (`B2DIRL` :4102 / `SHDIR` :4334): a gate fire on this
    // wake `JMP BOLAVA` — `LDD #BOLAV2 / STD PJOY,U` overwrites whatever the brain
    // armed, `LDB #1` forces the flap. The gate is checked AFTER the brain decides
    // (on the episode-exit path), so the seek workspace has already advanced —
    // faithful: the divert wake ran the brain in the ROM too.
    if (lavaGateFires(looked.enemy, target)) {
      settled = { ...looked.enemy, pjoy: { kind: 'lava', entry: 'BOLAV2' } }
      decision = { ...looked.decision, flap: true }
    } else {
      settled = looked.enemy
      decision = looked.decision
    }
  }
  // jt8-3: the turn wake FLAPS (`B2DICL`/`SHDICL` `LDB #1`, :4146/:4377) —
  // through ADDFLP that steps the FLYX index 2 toward the new facing, which is
  // the immediate half of the "slow down, going into a cliff" episode.
  const wingsDown = decision.flap || steered.turned
  // uf1-9: `flapHeld` is the HELD level (`CURJOY+1`, the wing-down state the
  // latch is in) and `flap` is its rising EDGE — the ROM flaps on the
  // transition (`FLIPLP TSTB / BNE GOFLAP`), not on every wake of the hold.
  // Before this they were the same value, so a two-wake wing-down hold spent
  // two impulses instead of one.
  const held = wingsDown
  const pressed = held && !(settled.prevFlapHeld ?? false)
  const input: PlayerInput = { dir: decision.dir, flap: pressed, flapHeld: held }
  const edge = wingEdge(settled.entity.airborne, settled.prevFlapHeld ?? false, input)
  // jt9-8: the PTIMUP wing-edge re-init is a PLAYER-only mechanic — every ROM
  // PTIMUP clear (GOFLIP :6185 / GOFLAP :6219 / STFALL :6154) lives in the human
  // flight loop (FLAPLP/FLIPLP), and buzzards' OST* movement calls neither ADDFLP
  // (the PTIMUP impulse) nor AIROVR (its increment). So NO reset here; only the
  // player path in frame.ts's runBehaviour clears it. (The pterodactyl's PTEFLY
  // uses PTIMUP as an anim timer, not the flap budget — a separate concern.)
  // jt9-18 — advance the level-flight forced-glide sub-phase. A BOLEV1 wake that
  // FLAPPED set `PJOY = BOLEV2`, so the next wake is a forced glide; a glide wake
  // (forced or natural) leaves `PJOY = BOLEV1`. `decision.flap` on the held level
  // interval is exactly that BOLEV1/BOLEV2 next-state (a forced-glide wake decides
  // `flap: false`, so it clears itself). Only a surviving level interval carries
  // it — a cliff turn has already swapped `pjoy` for a dwell.
  // jt9-29 — the shadow's armed `climb` (`SHUP1`) is a one-wake pointer. `SHUP1`
  // re-points `PJOY` back at `SHADOW` UNCONDITIONALLY as its first two
  // instructions (`LDD #SHADOW / STD PJOY,U`, :4269-4270), BEFORE the `CMPD
  // SHUPVY` flap test — so it is cleared on the wake that CONSUMED it (the entry
  // `PJOY` was `climb`), whether that wake flapped (`SHUP1`) or coasted a fast
  // climber (`SHUP0`). It is NOT cleared on the wings-up wake `SHUPST` armed it
  // (there the entry `PJOY` was not yet `climb`), which is what keeps it for one
  // wake. Without the unconditional clear a shadow rising faster than SHUPVY
  // never returns to the brain and stops re-deciding entirely (Reviewer R-1).
  const consumedClimb = homed.pjoy?.kind === 'climb'
  const phased =
    settled.pjoy?.kind === 'interval'
      ? { ...settled, pjoy: levelInterval(settled.pjoy.timer, decision.flap) }
      : consumedClimb && settled.pjoy?.kind === 'climb'
        ? { ...settled, pjoy: undefined }
        : settled
  return {
    enemy: { ...phased, entity: stepEntity(phased.entity, input), prevFlapHeld: input.flapHeld },
    wingEdge: edge,
  }
}

/**
 * jt5-8 — LINET's wingbeat: a two-state alternation with NO timer in it.
 *
 * `PJOY,U` holds the routine the next wake enters at, and LINET writes it twice:
 *
 *   • `LNTUP` (JOUSTRV4.SRC:3746-3748) — reached only when the lane decision
 *     wants a flap — parks `#LNTOFP` and sets `LDB #1` (flap).
 *   • `LNTOFP` (:3759-3762) — where that next wake therefore begins — restores
 *     `#LINET`, `CLRB`, and `BRA LNTFLP`.
 *
 * Two consequences, and both are the point. The glide wake is UNCONDITIONAL:
 * entering at `LNTOFP` means the lane decision at :3733-3745 is never executed,
 * so a bird still sunk below its lane and still falling glides anyway. And the
 * glide wake still STEERS — `LNTFLP` (:3749) is the shared tail both paths reach
 * — so it is a wings-up wake, not a dead one.
 *
 * Modelled here rather than inside `linet()` because `linet()` IS the code at
 * :3733, and the whole content of "unconditional" is that a glide wake does not
 * run it. Pure — the arguments are never mutated.
 */
function dumbWingbeat(
  enemy: EnemyState,
  decision: Decision,
  wave: number,
  lavaBehind: boolean,
): { enemy: EnemyState; decision: Decision } {
  if (enemy.brain !== 'linet') return { enemy, decision }
  if (enemy.pjoy?.kind === 'glide') {
    // LNTOFP (:3759-3762): hand the pointer back to LINET and clear the flap
    // bit. `dir` is untouched, which is the `BRA LNTFLP` fall-through.
    //
    // jt9-1: this returns BEFORE the looker, and that is the whole story. The
    // wake resumed at :3759, so every instruction above it — the promotion
    // check AND the looker — was skipped. `plavt` therefore does not tick here.
    return { enemy: { ...enemy, pjoy: undefined }, decision: { ...decision, flap: false } }
  }
  // The wake entered at LINET, so the prologue runs. The promotion check is the
  // scheduler's half (`frame.ts`); this is the second half.
  const looked = lavaTrollLooker(enemy, decision, wave, lavaBehind)
  // LNTUP: only a FLAPPING wake parks the glide — whether the flap came from
  // the lane decision falling through :3745, or from the looker's `BEQ LNTUP`.
  // Both entries reach the same two instructions.
  if (looked.decision.flap) {
    return { enemy: { ...looked.enemy, pjoy: { kind: 'glide' } }, decision: looked.decision }
  }
  return looked
}

/**
 * jt9-1 — `LINET`'s LAVA TROLL LOOKER (JOUSTRV4.SRC:3725-3732), the SECOND
 * entry into the flapping wake:
 *
 *     DEC  PLAVT,U
 *     BGT  1$            ; still counting — the lane decision governs
 *     LDA  LNTLAV        ; expired: reload the period…
 *     STA  PLAVT,U
 *     LDX  PPREV         ; …and ask "LAVA TROLL AFTER ME?"
 *     LDA  PID,X
 *     CMPA #LAVID
 *     BEQ  LNTUP         ; yes → flap, whatever the lane wanted
 *
 * `PPREV` is a GLOBAL — "ADDR OF PREVIOUSLY EXECUTED PROCESS BLOCK"
 * (RAMDEF.SRC:240) — so the question is "did a lava troll run immediately
 * before me this frame?", not "is one adjacent in some list". `lavaBehind` is
 * the caller's answer; the scheduler computes it from its own wake order.
 *
 * The reload comes from `LNTLAV`, which is DYTBL **row 3** — wave-scaled, 16
 * down to 4 with a floor of 1. The table's own trailing comment spells that row
 * `LAVLAV` while the RAM variable every brain reads is `LNTLAV`; they are one
 * slot, because the initialiser walks DYTBL and DYNADJ positionally
 * (`LEAX DYWLEN,X` / `LEAY 3,Y`, :939-950) and never reads a name.
 *
 * Pure — the arguments are never mutated.
 */
function lavaTrollLooker(
  enemy: EnemyState,
  decision: Decision,
  wave: number,
  lavaBehind: boolean,
): { enemy: EnemyState; decision: Decision } {
  // `DEC` then `BGT`: an absent countdown behaves as the machine's
  // zero-initialised byte — it goes negative and reloads on this very wake.
  const ticked = (enemy.plavt ?? 0) - 1
  if (ticked > 0) return { enemy: { ...enemy, plavt: ticked }, decision }
  // Expired. The reload happens whether or not a troll is behind — `STA PLAVT,U`
  // sits ABOVE the `CMPA #LAVID` test, so the period restarts either way.
  const reloaded: EnemyState = { ...enemy, plavt: waveValue('LAVLAV', wave) }
  if (!lavaBehind) return { enemy: reloaded, decision }
  // `BEQ LNTUP` — into the flapping wake, skipping the lane decision entirely.
  // Both paths converge on `LNTFLP`, which sets `dir` from PFACE, so forcing the
  // flap bit is the whole observable difference.
  return { enemy: reloaded, decision: { ...decision, flap: true } }
}

/**
 * jt9-29 — is THIS wake entering a smart brain at its TOP (`BOUNDR`/`B2UNDR`/
 * `SHADOW`), where the lava-troll looker's `DEC PLAVT,U` lives? Only a re-decide
 * wake does. An EPISODE wake resumes at its own `PJOY` entry (a committed seek's
 * `BODN1`/`BODN2`/`BOUP*`, a level `interval`, a cliff `dwell`, a `lava`
 * ping-pong, or the looker's own armed `climb`), STRICTLY BELOW the brain label,
 * so the looker is skipped and the countdown does not tick — the smart-brain
 * analog of jt9-1's "a glide wake skips LINET's prologue". Read on the ENTRY
 * state, because that is the `PJOY` address the scheduler dispatched to.
 */
function smartBrainReDecides(enemy: EnemyState): boolean {
  if (enemy.brain !== 'boundr' && enemy.brain !== 'b2undr' && enemy.brain !== 'shadow') return false
  // The bounder/hunter carry their committed descent/climb in `seek`; the shadow
  // never does. Any of these `pjoy` phases means the wake resumes inside an
  // episode rather than at the brain entry.
  if (enemy.seek !== undefined) return false
  const k = enemy.pjoy?.kind
  return k !== 'interval' && k !== 'wing' && k !== 'dwell' && k !== 'lava' && k !== 'climb'
}

/**
 * jt9-29 — the lava-troll looker at the top of the three SMART brains
 * (`BOUNDR` :3787, `B2UNDR` :3971, `SHADOW` :4230). The SAME eight instructions
 * as LINET's, differing only in the branch target:
 *
 *     DEC PLAVT,U / BGT 1$ / LDA LNTLAV / STA PLAVT,U / LDX PPREV / LDA PID,X /
 *     CMPA #LAVID / BEQ <target>
 *
 * and the target is NOT a shared flap. `BODN1A`/`B2DN1A` (:3821/:4006) FLAP into
 * the down-seek on THIS wake; `SHUPST` (:4264) clears the flap bit (`CLRB`, wings
 * up) and arms `#SHUP1`, so the shadow's is a DEFERRED flap taken next wake.
 *
 * Runs only on a re-decide wake (`smartBrainReDecides`); the reload from LNTLAV
 * happens on expiry whether or not a troll is behind (`STA PLAVT,U` sits ABOVE
 * `CMPA #LAVID`), and only the `BEQ` is troll-gated. Pure.
 */
function smartBrainLooker(
  enemy: EnemyState,
  decision: Decision,
  wave: number,
  lavaBehind: boolean,
  reDecides: boolean,
): { enemy: EnemyState; decision: Decision } {
  if (!reDecides) return { enemy, decision }
  // `DEC` then `BGT`: an absent countdown behaves as the zero-initialised byte —
  // it goes negative and reloads on this very wake.
  const ticked = (enemy.plavt ?? 0) - 1
  if (ticked > 0) return { enemy: { ...enemy, plavt: ticked }, decision }
  const reloaded: EnemyState = { ...enemy, plavt: waveValue('LAVLAV', wave) }
  if (!lavaBehind) return { enemy: reloaded, decision }
  // `BEQ <target>` — a lava troll ran immediately before us.
  if (enemy.brain === 'shadow') {
    // SHUPST: wings UP this wake, arm the climb for the next (`SHUP1`).
    return { enemy: { ...reloaded, pjoy: { kind: 'climb' } }, decision: { ...decision, flap: false } }
  }
  // BODN1A / B2DN1A: force the down-seek flap on this wake, aimed at the facing.
  return { enemy: reloaded, decision: { dir: enemy.facing, flap: true } }
}

/**
 * uf1-9 — one wake of the SHADOW LORD's countdown. It has two states, told apart
 * by whether a wing phase is present:
 *
 *   • `wings: 'up'` — the `SHAV` cliff dwell armed by `SHDICL` (:4373-4377):
 *     SHCLTM wakes of `CLRB` (wings up) before `JMP SHADOW` re-decides
 *     (:4406-4409). While it runs the brain does not re-decide at all.
 *   • `wings: undefined` — the `SHLEP`/`SHLEV` decision interval (SHUPTM
 *     :4283-4284 / SHLETM :4316-4317), spent by `SHLEP1`/`SHLEV1`'s
 *     `DEC PJOYT,U / LBLE SHBRA2` (:4286-4287, :4319-4320).
 *
 * Armed only on a LEVEL branch: the free-fall (`SHDN`) and the climb (`SHUP1`)
 * re-enter `SHADOW` every wake and carry no countdown.
 */
/**
 * uf1-9 — the cliff turn ARMS a dwell and pre-empts this wake's cadence, exactly
 * as `B2DICL`/`SHDICL` overwrite `PJOY` and `PJOYT` before falling into the
 * direction routine (:4142-4146, :4373-4377). The turn wake itself flaps
 * (`LDB #1`), which `stepEnemyDetailed` already forces via `steered.turned`.
 *
 * The shadow's dwell is the SHCLTM row; the hunter's is a hardcoded 8. The
 * bounder has no cliff look-ahead at all (jt8-3: `steerWake` only turns the
 * hunter and the shadow lord), so it never reaches here.
 */
function withCliffDwell(enemy: EnemyState, wave: number): EnemyState {
  if (enemy.brain === 'linet') return enemy
  return { ...enemy, pjoy: { kind: 'dwell', timer: cliffDwell(enemy.brain, wave) } }
}

function shadowDwellWake(enemy: EnemyState, target: PlayerView | null, wave: number): EnemyState {
  const running = enemy.pjoy
  // A cliff dwell is `withWingCadence`'s to tick (one law, both brains) — leave it.
  if (running?.kind === 'dwell') return enemy
  // jt9-29 — the looker's armed climb (`SHUP1`) survives this wake UNTOUCHED so
  // `shadow()` reads it and flaps; `stepEnemyDetailed` clears it once consumed.
  if (running?.kind === 'climb') return enemy
  // jt5-8 — a `glide` is LINET's, and `dumbWingbeat` is its only writer, so the
  // shadow lord cannot be in one. jt9-22 — a `lava` (BOLAVA) wake bypasses this
  // whole pipeline in `stepEnemyDetailed`, so it never arrives here either. Both
  // excluded by narrowing rather than by comment: the countdown below is the
  // SHLEP/SHLEV interval, and neither of those two carries one.
  if (running !== undefined && running.kind !== 'glide' && running.kind !== 'lava') {
    const remaining = running.timer - 1
    // jt9-18 — carry the SHLEP2/SHLEV2 forced-glide sub-phase across the countdown
    // (only an `interval` carries one; a `wing`/`dwell` has none).
    const glide = running.kind === 'interval' ? running.glide : undefined
    if (remaining > 0) return { ...enemy, pjoy: levelInterval(remaining, glide) }
    // Expired — `JMP SHADOW` / `SHBRA2`: fall through and re-decide this wake.
  }
  // Re-decide. A level branch arms its interval; anything else carries none.
  const enemyY = enemy.entity.posY >> 8
  const delta = target === null ? null : target.pixelY - enemyY
  const level =
    delta === null ||
    (delta < waveValue('SHDNRG', wave) && delta > waveValue('SHUPRG', wave))
  if (!level) return enemy.pjoy === undefined ? enemy : { ...enemy, pjoy: undefined }
  // A level decide arms its interval AND (SHLEP, target present) snapshots PPVELX;
  // SHLEV (null target) snapshots nothing — `snapshotHoming` handles both.
  return {
    ...enemy,
    pjoy: { kind: 'interval', timer: decideInterval('shadow', wave, target !== null) },
    homing: snapshotHoming(enemy, target),
  }
}

/**
 * uf1-9 — advance `PJOY`/`PJOYT` for this wake and return the enemy carrying it.
 * Split out of `stepEnemyDetailed` so the route resolution (which needs the
 * brain's own rows) stays next to the cadence law rather than in the pipeline.
 */
function withWingCadence(enemy: EnemyState, target: PlayerView | null, wave: number): EnemyState {
  if (enemy.brain === 'linet') {
    // jt5-8 — LINET runs no wing CADENCE (there is no `PJOYT` anywhere in its
    // alternation), but it does park LNTOFP in the same `PJOY` cell. Carry that
    // one state through to the brain step, which is what spends it; keep wiping
    // every other, which is uf1-9's "the dumb brain has no workspace".
    if (enemy.pjoy === undefined || enemy.pjoy.kind === 'glide') return enemy
    return { ...enemy, pjoy: undefined }
  }
  // A dwell still running was already decremented by `seekWake` and pre-empts the
  // cadence entirely — `B2AV`/`SHAV` hold the wings up and re-decide on expiry,
  // never flapping. Leaving it untouched here is what stops the hunter's dwell
  // being re-read as a wing-UP phase (round 1, R1-2).
  if (enemy.pjoy?.kind === 'dwell') return enemy
  const brain = enemy.brain
  // The shadow lord has no DI rows and re-enters SHADOW every wake (:4269-4270),
  // so it runs no wing cadence — its climb gate (SHUPVY) is a per-wake law in
  // `shadow()` and its only countdown is the SHCLTM cliff dwell.
  if (brain === 'shadow') return enemy
  const rows = brain === 'boundr' ? boundrRows(wave) : b2undrRows(wave)
  const route: SeekRoute = currentRoute(enemy, target, rows)
  // A LEVEL route's countdown is the decision interval, and `seekWake` has
  // already advanced (or just armed) it this wake. Touching `pjoy` here would
  // wipe it — the interval would expire instantly and the route would re-decide
  // every wake, which is the very behaviour the interval exists to stop.
  if (route === 'level') return enemy
  const pjoy = wingWake(enemy, route, rows.brake, wave)
  if (pjoy === undefined) return enemy.pjoy === undefined ? enemy : { ...enemy, pjoy: undefined }
  return { ...enemy, pjoy }
}
