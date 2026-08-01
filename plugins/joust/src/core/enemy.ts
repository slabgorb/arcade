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
import { applyCeiling, groundOutcome, wrapX } from './arena.js'
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
 * VELOCITY", RAMDEF.SRC:209), but that second byte is written in exactly one
 * place — `BOLEV` (`LDA PVELX,X / STA PPVELX,U`, JOUSTRV4.SRC:3907-3908), on
 * entry to a level-flight episode timed by `BOLETM` ("TIME UNTIL NEXT DECISION",
 * :3909). `BOLEVB` only ever READS it. The BOLETM decision timer belongs to a
 * later story (uf1-9 owns all five "TIME UNTIL NEXT DECISION" rows), so there is
 * no moment here at which a snapshot could honestly be taken and `homingWake`
 * compares the target's LIVE index instead. Carrying an unwritten `ppvelx` would
 * read as modelled while being inert.
 */
export interface HomingState {
  /**
   * `PRDIR` — the reverse-direction counter ("REVERSE DIRECTION COUNTER",
   * RAMDEF.SRC:208). An **8-bit** register: the whole flip cadence hangs on the
   * wrap, so this is masked to 0..255 on every tick. See `PRDIR_FLIP_WAKES`.
   */
  readonly prdir: number
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
}

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
// The horizontal cliff look-ahead (B2XLEN/SHXLEN) is provenance-only
// (claims JT22-025/026); dir follows facing.

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
function pursue(enemy: EnemyState, player: PlayerView | null | undefined, rows: SeekRows): Decision {
  const velY = enemy.entity.velY
  const dir = enemy.facing
  const route: SeekRoute =
    enemy.seek?.mode ??
    rangeRoute(player == null ? null : player.pixelY - (enemy.entity.posY >> 8), rows)
  if (route === 'down') return { dir, flap: velY >= rows.brake }
  // The climb law and the level law collapse to the same per-wake flap — kept
  // as one expression on purpose; the episodes tell them apart, not the wings.
  return { dir, flap: velY >= 0 }
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
 * wings up above the lava); delta ≥ SHDNRG(wave) → SHDN, the no-flap drop
 * (`CLRB`, :4246-4248); delta ≤ SHUPRG(wave) → up-seek (flap iff not rising);
 * otherwise SHORT range → SHLEP (:4277), which tracks the PLAYER'S line with
 * NO velY gate — it flaps whenever strictly below the player's pixel Y, even
 * mid-rise (`CMPB PDIST+1,U / BLS SHLEPA`, :4293-4294). The lava escape below
 * `LAVA_ESCAPE_Y` stays in every branch. Pure.
 */
export function shadow(enemy: EnemyState, player: PlayerView | null, wave = 1): Decision {
  const enemyY = enemy.entity.posY >> 8
  const velY = enemy.entity.velY
  const dir = enemy.facing
  // The one descent flap the shadow has: escape the lava below cliff5 ($D3).
  if (enemyY > LAVA_ESCAPE_Y) return { dir, flap: true }
  // SHLEV — no players here: wings up above the lava (the shipped behaviour).
  if (player == null) return { dir, flap: false }
  const delta = player.pixelY - enemyY
  // SHDN — long-range down: the no-flap drop (:4246-4248).
  if (delta >= waveValue('SHDNRG', wave)) return { dir, flap: false }
  // Long-range up-seek: flap while not already rising.
  if (delta <= waveValue('SHUPRG', wave)) return { dir, flap: velY >= 0 }
  // SHLEP — short range: track the player's LIVE line, no velY gate.
  return { dir, flap: enemyY > player.pixelY }
}

// ─── Horizontal homing (BODIR / BOLEVB) ─────────────────────────────────────
//
// The only thing that ever changes the BOUNDER's facing. (Not "a smart enemy's"
// — the hunter and the shadow lord also AIM, via `B2DIR`'s `CLR PFACE,U  FACE
// RIGHT` / `STA PFACE,U  FACE LEFT` at :4122/:4141 and `SHDIR`'s pair at
// :4353/:4372. That steering is jt8-3's. What is true here, and enumerated
// mechanically in tests/homing-source.test.ts, is that across the whole BOUNDR
// brain :3787-3946 the COM at :3945 is the sole PFACE write.) Before jt8-2 an
// enemy's `facing` was set at spawn and never moved, so it orbited the arena at
// a fixed heading.
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
 * A wake counts ONLY when the enemy is flying its target's speed; a mismatched
 * wake leaves the counter untouched (not reset — skipped), so the 129-wake
 * budget is spent in matched frames alone.
 */
export function homingWake(enemy: EnemyState, target: PlayerView | null): EnemyState {
  // The dumb lane-tracker has no homing at all — it moves in its facing and
  // never reverses (`LNTFLP  TST PFACE,U   MOVE IN DIRECTION OF FACING`, :3749).
  if (enemy.brain === 'linet') return enemy
  // Nobody to copy. Holding here is what keeps a bare scheduler run — where
  // every enemy is stepped with no target — bit-identical to its pre-jt8-2 replay.
  if (target === null) return enemy
  // `CMPA PVELX,U / BNE BODIR3` (:3940-3941): the branch jumps CLEAR of the DEC,
  // so a wake on which the enemy is not matching its target does not tick at all.
  if (target.velXIndex !== enemy.entity.velXIndex) return enemy
  // `DEC PRDIR,U` (:3942) — 8-bit, and the wrap is the whole cadence.
  const prdir = ((enemy.homing ?? seedHoming()).prdir - 1) & 0xff
  // `BMI BODIR3` (:3943) — N set (bit 7 of the result), so no flip this wake.
  if (prdir & 0x80) return { ...enemy, homing: { prdir } }
  // `CLR PRDIR,U` (:3944) then `COM PFACE,U` (:3945). A COMplement toggles the
  // facing; it does not aim it.
  return { ...enemy, facing: enemy.facing === 1 ? -1 : 1, homing: { prdir: 0 } }
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
function seekWake(enemy: EnemyState, target: PlayerView | null, wave: number): EnemyState {
  const episodic = enemy.brain === 'boundr' || enemy.brain === 'b2undr'
  if (!episodic) {
    // The shadow lord (no DI rows, re-enters SHADOW each wake) and the dumb
    // LINET never carry a workspace.
    return enemy.seek === undefined ? enemy : { ...enemy, seek: undefined }
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
  const route = rangeRoute(
    target === null ? null : target.pixelY - (enemy.entity.posY >> 8),
    rows,
  )
  if (route === 'down') return { ...enemy, seek: { mode: 'down', pdist: rows.dnDi } }
  if (route === 'up') return { ...enemy, seek: { mode: 'up', pdist: rows.upDi } }
  return enemy.seek === undefined ? enemy : { ...enemy, seek: undefined }
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
  ctx?: { player?: PlayerView | null; wave?: number },
): { enemy: EnemyState; wingEdge: WingEdge } {
  const target = ctx?.player ?? null
  const wave = ctx?.wave ?? 1
  // jt8-2: the homing wake runs BEFORE the brain. `COM PFACE,U` (:3945) falls
  // into `JMP BODIR` (:3946), whose first instruction is `LDA PFACE,U` (:3876) —
  // so a flip already steers THIS wake's horizontal impulse, not the next one.
  const homed = homingWake(enemy, target)
  // uf1-8: then the seek workspace advances (ground-exit → spend → exhaust →
  // re-decide/arm), so the brain reads the episode this wake is ACTUALLY in —
  // the arm wake already runs its episode's law, exactly as the ROM's decide
  // falls through into BODN1/BOUP1.
  const sought = seekWake(homed, target, wave)
  // uf1-2: the brain reads its per-wave difficulty row from `wave`. It runs on
  // the ALREADY-HOMED enemy, so the wave-scaled seek and the flipped facing are
  // the same wake's decision, not two.
  const decision = runBrain(sought, target, wave)
  const input: PlayerInput = { dir: decision.dir, flap: decision.flap, flapHeld: decision.flap }
  const edge = wingEdge(sought.entity.airborne, sought.prevFlapHeld ?? false, input)
  return {
    enemy: { ...sought, entity: stepEntity(sought.entity, input), prevFlapHeld: input.flapHeld },
    wingEdge: edge,
  }
}
