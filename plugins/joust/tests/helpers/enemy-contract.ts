// tests/helpers/enemy-contract.ts
//
// Story jt2-2 — the CONTRACT for the enemy intelligence core, TEA-authored
// (O'Brien). Same double-entry split the epic has used since jt1-2: TEA states
// the module shape and the laws that pin it; Dev (Julia) writes the module. The
// behaviour lives in tests/enemy.test.ts; the ROM-law provenance in
// tests/enemy-source.test.ts, and every newly-cited range carries a committed
// claim in docs/rom-study/claims/enemy.json (byte-verified by the citations
// suite).
//
// ─── WHAT jt2-2 MODELS (all cited; see enemy-source.test.ts) ─────────────────
// The three ground enemies (bounder / hunter / shadow lord) as processes on the
// SAME flight core the players use — buzzards flap. One SHARED DUMB brain:
//
//   • LINET lane-tracking toward the three cliff-tier altitudes $45/$81/$D0,
//     the nearest chosen through a ±$20 band (AOFFL1/2/3 + AOFFUD,
//     JOUSTRV4.SRC:7994-7997; the tracking logic JOUSTRV4.SRC:3722-3749). A dumb
//     enemy holds its lane: it flaps when it has sunk BELOW its target line and
//     is not already rising, and moves horizontally in its facing direction.
//
// A GLOBAL intelligence budget promotes dumb enemies to their smart brains:
//
//   • NSMART (current smart count) vs WSMART (wanted smart count) —
//     RAMDEF.SRC:308-309. WSMART is SEEDED per wave from the pursuit NIBBLE
//     (WPERSUE low four bits, JOUSTRV4.SRC:2076-2077) and grows +1 every ~15 s
//     (112 naps × 8 frames = 896 frames, JOUSTRV4.SRC:2094-2096,2127-2129)
//     while enemies live, saturating at 255.
//   • A dumb enemy PROMOTES while NSMART < WSMART: INC NSMART debits the budget
//     (JOUSTRV4.SRC:3764), PCHASE goes 0→1 (the smart flag, RAMDEF.SRC:213), and
//     it switches to its decision block's smart brain (PDECSN → DSMART,
//     JOUSTRV4.SRC:3772-3773). An already-smart enemy is NEVER re-promoted
//     ("PCHASE … BETTER BE ZERO", JOUSTRV4.SRC:3766).
//   • A DEATH credits the budget back by exactly the dead enemy's PCHASE flag
//     (NSMART -= PCHASE, JOUSTRV4.SRC:2962-2963): a smart death gives one back, a
//     dumb death gives nothing. The ledger balances to zero at wave end — the
//     author's own IFN DEBUG oracle, "NSMART … HAD BETTER BE ZERO"
//     (JOUSTRV4.SRC:1983).
//
// EMYTIM is a DIVIDER, not a speed scale (ruled, open-questions §4). It is the
// enemy process's nap between movements ("PAUSE TIME BETWEEN ENEMIES MOVEMENTS",
// RAMDEF.SRC:336; consumed as `LDA EMYTIM / JSR VNAPTPC`, JOUSTRV4.SRC:3156-3157):
// EMYTIM=2 on waves 1-2 (JOUSTRV4.SRC:2204-2205), else 1 (JOUSTRV4.SRC:1993).
// On jt2-1's frame-nap scheduler this is a process `period` of EMYTIM, so an
// EMYTIM=2 enemy integrates every 2nd frame — HALF the steps over any window,
// with each step's displacement UNCHANGED.
//
// ─── SEAM: the budget's INPUTS, not its laws ─────────────────────────────────
// jt2-5 lands the wave machine that supplies the pursuit nibble and the growth
// cadence. jt2-2 stubs those INPUTS as parameters (`seedBudget(nibble)`,
// `growWanted(budget, enemiesAlive)`) and pins the LAWS. The brains are
// deterministic pure functions of enemy+player state — the jt2-1 per-frame RNG
// stir is NOT threaded through them (nothing here consumes randomness), so a
// seeded replay reproduces bit-for-bit.

import type { EntityState, PlayerInput } from './flight-contract.js'
import type { GameState, ProcessSpec } from './scheduler-contract.js'

export type { EntityState, PlayerInput, GameState, ProcessSpec }

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

/** What a smart brain sees of its quarry. */
export interface PlayerView {
  /** The player's whole-pixel Y (`PPOSY+1,X`). */
  readonly pixelY: number
  /**
   * jt8-2 — the player's FLYX velocity index (`PVELX,X`, "TABLE LOOK-UP FLYING
   * VELOCITY-X", RAMDEF.SRC:190). A signed even index in [−MAXVX, +MAXVX]
   * (MAXVX = 8, JOUSTRV4.SRC:40), stepped by `2 × dir` on each flap
   * (`ADDFLP`, :6437-6439). The horizontal-homing throttle compares the enemy's
   * OWN index against this one — see `HomingState`.
   *
   * REQUIRED, deliberately: the vertical seek could reach the brains while this
   * stayed undefined and the homing would silently never fire (the routing ≠
   * geometry trap). Making it non-optional forces `selectTarget` and `frame.ts`
   * to actually plumb it.
   */
  readonly velXIndex: number
}

/**
 * jt8-2 — the per-enemy horizontal-homing workspace.
 *
 * ─── WHY THERE IS NO `ppvelx` HERE ──────────────────────────────────────────
 * The ROM's throttle reads a SNAPSHOT of the target's FLYX index:
 *
 *   PPVELX RMB 1   OLD PLAYERS X VELOCITY (FOR EMEMY TRACKING)   RAMDEF.SRC:209
 *
 * but that byte is written in exactly ONE place — `BOLEV`, on entry to a level-
 * flight episode (`LDA PVELX,X / STA PPVELX,U`, JOUSTRV4.SRC:3907-3908) — and
 * the episode is timed by `BOLETM`, "TIME UNTIL NEXT DECISION" (:3909).
 * `BOLEVB` only ever READS it (:3939); it never writes it.
 *
 * The BOLETM decision timer is **uf1-9's** to build ("the DECISION timer
 * BOLETM :3909 …"; that story's own text records that the buzzard "has no …
 * 'time until next decision' timer at all"). Without a decision boundary there
 * is no moment at which a snapshot could honestly be TAKEN, so modelling
 * `ppvelx` here would ship a field that is either never written (dead) or
 * written on a cadence jt8-2 invented (worse than dead). jt8-2 therefore
 * compares the target's LIVE `velXIndex`, and uf1-9 adds the freeze.
 *
 * Consequence, logged as a Design Deviation: while the ROM compares against an
 * index up to `BOLETM` wakes old, this port compares against the current one.
 * The two diverge only when the target changes speed mid-episode.
 */
export interface HomingState {
  /**
   * `PRDIR` — the reverse-direction counter, an **8-bit** register (0..255)
   * ("REVERSE DIRECTION COUNTER", RAMDEF.SRC:208).
   *
   * The 8-bit width is load-bearing: the flip fires on the wake the `DEC` first
   * lands non-negative, and from a CLEARED counter — the zero `CLR PRDIR,U`
   * (:3944) writes on every flip — that takes 0 → $FF → … → $80 → $7F, i.e.
   * `PRDIR_FLIP_WAKES` wakes. Modelled as an unbounded JS integer it would go
   * −1, −2, … and NEVER flip.
   *
   * A MOUNTED enemy is not born cleared: it is born at 1 (`SEEKFS`, :3584-3585)
   * and so reverses on its first matched wake. See `seedHoming` in
   * homing-contract.ts for the full chain and why round 1 got this wrong.
   */
  readonly prdir: number
}

/**
 * uf1-8 — the per-enemy SEEK-EPISODE workspace: `PDIST,U`, "distance to go".
 *
 * The ROM's smart brains are episodic, not per-wake: the DECIDE step (`BOUNDR`
 * :3796-3803 / `B2UNDR` :3979-3990 / `SHADOW` :4238-4245) runs SELPLY, splits
 * down/up on the sign of the player Y-delta (`LDD PPOSY,X / SUBD PPOSY,U /
 * LBLT …UP`, :3798-3800), and gates LONG vs SHORT range against the wave's
 * DYTBL row. A LONG-range bounder/hunter seek then ARMS `PDIST` from its DI row
 * (`LDD BODNDI / STD PDIST,U`, :3803-3804; `BOUPDI` :3851-3852; `HUDNDI`
 * :3986-3987; `HUUPDI` :4035-4036) and COMMITS: the episode states (`BODN1`
 * :3811-3817, `BOUP1` :3855-3860 and their B2 twins) never re-run SELPLY — they
 * spend the budget until it crosses zero, and only the exhaust (`BPL BOBRAIN` /
 * `BMI BOBRAIN`) returns to the decide, THE SAME WAKE (`BOBRAIN JMP BOUNDR`,
 * :3842).
 *
 * The spend law (`LDD PVELY,U / ADDD PDIST,U / STD PDIST,U`): pdist += the
 * wake's ENTRY velY, and ONLY on a wake moving in the episode's direction — a
 * rising wake in a down episode (`BMI BOUP1B`, :3814) and a falling wake in an
 * up episode (`BPL BOUP11`, :3856) skip the add entirely. Down budgets are
 * NEGATIVE (BODNDI/HUDNDI, exhausted at ≥ 0); up budgets POSITIVE
 * (BOUPDI/HUUPDI, exhausted at < 0). Units are the port's own posY subpixels:
 * −$0E00 = 14 pixels of travel, the same DYLEN the RG rows express in whole
 * pixels — one length, two radixes.
 *
 * SHORT range and no-target route to LEVEL FLIGHT (`BOLEV` :3903 / `B2LEV`
 * :4054 / `SHLEP` :4277 / `SHLEV` :4312) — which is timed by the BOLETM-family
 * "TIME UNTIL NEXT DECISION" rows, ALL owned by uf1-9. Until that story lands,
 * level flight is a PER-WAKE decision here, so `mode` has no 'level': a level
 * wake carries NO SeekState at all. Do not add one — an armed level episode
 * with an invented exit cadence would pre-empt uf1-9's seam.
 *
 * The shadow lord has NO DI rows: its episode states re-enter `SHADOW` each
 * wake (`SHUP1 LDD #SHADOW / STD PJOY,U`, :4269-4270), so it re-decides
 * per-wake and never carries a SeekState either.
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

/**
 * An enemy's mind riding the shared flight core. `entity` is the very same
 * `EntityState` a player flies (buzzards flap); the rest is the enemy-specific
 * payload the tagged union carries — it does NOT grow the shared struct.
 */
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
   * jt8-2 — the horizontal-homing workspace (`PPVELX`/`PRDIR`). OPTIONAL, the
   * `EntityState.animPhase` / `GameState.targets` precedent: a bare fixture need
   * not supply it and `stepEnemy` seeds it on first use. When it IS supplied,
   * `stepEnemy` must CARRY it (thread it through, never re-seed) — that is what
   * lets a test prime the counter one wake short of a flip.
   */
  homing?: HomingState
  /**
   * uf1-8 — the committed seek episode, if one is in flight. OPTIONAL on the
   * same precedent as `homing`: absent means "at the decide step". `stepEnemy`
   * arms it on a long-range bounder/hunter decide, CARRIES and spends it across
   * wakes (never re-seeds an unspent one), and clears it when the budget
   * exhausts or the enemy grounds (`BODN1 LDD PSTATE,U / BNE BOBRAIN`,
   * :3811-3812). A dumb `linet` enemy and the shadow lord never carry one.
   */
  seek?: SeekState
  /**
   * jt5-3 — the wing-edge detector's memory: the `flapHeld` LEVEL this enemy's
   * synthetic joystick carried on its LAST wake (`CURJOY+1`). OPTIONAL; absent
   * reads as `false`, since an enemy that has never woken has never held the
   * button either.
   *
   * Declared here by uf1-9. jt5-3 added it to `src/core/enemy.ts` and to
   * `stepEnemyDetailed`'s return, but never to this contract — so the held wing
   * LEVEL, which is the whole observable of a wing-cadence LATCH, was invisible
   * to any test written against the contract. See the TEA assessment.
   */
  prevFlapHeld?: boolean
  /**
   * uf1-9 — the `PJOY`/`PJOYT` workspace: the wing phase the brain is in and the
   * wakes left in it. OPTIONAL on the `homing`/`seek` precedent; absent means no
   * episode is armed and the next decide arms one.
   *
   * `wings` present  → a seek episode's wing cadence is running (BOUPWD/BOUPWU
   * and their hunter twins on the UP route; a frozen 2-wake hold on the DOWN
   * route), or, for the shadow lord, its SHCLTM cliff dwell.
   * `wings` absent   → a level-flight decide is holding its "time until next
   * decision" interval (BOLETM / HULETM / SHUPTM / SHLETM).
   */
  pjoy?:
    | { readonly kind: 'wing'; readonly timer: number; readonly wings: 'down' | 'up' }
    | { readonly kind: 'interval'; readonly timer: number }
    | { readonly kind: 'dwell'; readonly timer: number }
    /**
     * jt5-8's DUMB-brain forced glide (`LNTOFP` parked in `PJOY,U`,
     * JOUSTRV4.SRC:3746-3747). Added by jt9-1 (R-6): the contract shipped three
     * variants while production carried four, so an exhaustive `switch` written
     * against THIS type compiled clean while missing the case. It carries no
     * `timer` — the alternation has no countdown, which is the model rather than
     * an omission.
     */
    | { readonly kind: 'glide' }

  /**
   * `PLAVT,U` — jt9-1's lava-troll looker countdown (`DEC PLAVT,U / BGT`,
   * JOUSTRV4.SRC:3725-3726). OPTIONAL on the `homing`/`seek` precedent: absent
   * means the countdown has not been seeded and the first wake seeds it from
   * LNTLAV (DYTBL row 3, wave-scaled).
   */
  plavt?: number
}

/** An enemy process for jt2-1's scheduler — the tagged union's new `enemy` kind. */
export interface EnemyProcessSpec extends ProcessSpec {
  /** The enemy payload the `kind: 'enemy'` process carries. */
  enemy?: EnemyState
}

export interface EnemyModule {
  // ─── Cited constants ──────────────────────────────────────────────────────
  /** `[AOFFL1, AOFFL2, AOFFL3]` = `[$45, $81, $D0]` — the three cliff-tier lanes. */
  AOFF_LINES: readonly [number, number, number]
  /** `AOFFUD` = `$20` — the tolerance band that picks the nearest lane. */
  AOFF_BAND: number
  /** `EMYTIM` normal — integrate every frame (`NO ENEMY SLOW DOWN`). */
  EMYTIM_NORMAL: number
  /** `EMYTIM` on waves 1-2 — integrate every 2nd frame (the divider). */
  EMYTIM_SLOW: number
  /** `PDELAY` reload = 112 — the growth timer's tick count. */
  INTEL_GROWTH_NAPS: number
  /** `PCNAP 8` — the growth timer naps 8 frames per tick. */
  INTEL_GROWTH_NAP_FRAMES: number
  /** 112 × 8 = 896 frames (~15 s at ~60 Hz) between WSMART bumps. */
  INTEL_GROWTH_FRAMES: number
  /** WSMART saturation ceiling (the `INC/BNE/DEC` guard) = 255. */
  WSMART_MAX: number
  /** `BODNVY` (normal difficulty, $0100) — the bounder's down-seek brake VY. */
  BOUNDR_DOWN_BRAKE: number
  /** `HUDNVY` (normal difficulty, $0200) — the hunter tolerates a faster fall. */
  B2UNDR_DOWN_BRAKE: number
  /** `$D3` — below this scanline the shadow lord flaps to escape the lava (SHDN). */
  LAVA_ESCAPE_Y: number

  // ─── The shared dumb brain (LINET) ────────────────────────────────────────
  /**
   * The nearest cliff-tier lane for a whole-pixel Y, chosen through the ±$20
   * band: `y < $45+$20` → `$45`; else `y < $81+$20` → `$81`; else `$D0`
   * (JOUSTRV4.SRC:3733-3740).
   */
  linetTarget(pixelY: number): number

  /**
   * The dumb lane-tracking decision (JOUSTRV4.SRC:3733-3757): flap iff the enemy
   * has sunk BELOW its lane (`pixelY > linetTarget`) AND is not already rising
   * (`velY >= 0`); move horizontally in the facing direction. Pure.
   */
  linet(enemy: EnemyState): Decision

  // ─── The intelligence budget ──────────────────────────────────────────────
  /** Seed the budget from a wave pursuit nibble: `wsmart = nibble & 0x0F`, `nsmart = 0`. */
  seedBudget(pursuitNibble: number): IntelBudget

  /**
   * One firing of the 15-second growth timer: while `enemiesAlive`, bump WSMART
   * by one, saturating at 255; with no enemies alive it does not grow. The
   * CADENCE (every 896 frames) is the wave machine's INPUT (jt2-5); this is the
   * LAW of what happens when it fires.
   */
  growWanted(budget: IntelBudget, enemiesAlive: boolean): IntelBudget

  /** A dumb enemy may promote while the budget has room: `nsmart < wsmart`. */
  shouldPromote(budget: IntelBudget): boolean

  /**
   * Promote a dumb enemy: debit the budget (`nsmart + 1`), set the smart flag
   * (`pchase 0→1`), and switch `brain` to the enemy's `decision`. Throws if the
   * enemy is already smart — the "PCHASE … BETTER BE ZERO" invariant
   * (JOUSTRV4.SRC:3766); an already-smart enemy is never re-promoted.
   */
  promote(enemy: EnemyState, budget: IntelBudget): { enemy: EnemyState; budget: IntelBudget }

  /**
   * Credit the budget back on a death: `nsmart -= enemy.pchase`
   * (JOUSTRV4.SRC:2962-2963). A smart death (pchase 1) restores one unit; a dumb
   * death (pchase 0) restores nothing.
   */
  creditDeath(enemy: EnemyState, budget: IntelBudget): IntelBudget

  // ─── The three smart brains (distinct, cited pursuit) ─────────────────────
  //
  // uf1-8 — every brain DECIDES through its range gate on the whole-pixel player
  // Y-delta (player.pixelY − enemy pixel Y; positive = player below), against the
  // WAVE's row via difficulty.waveValue. LONG range commits to a seek; SHORT
  // range and a null player fly LEVEL. The decide is strict-inclusive on the
  // long side, both directions: delta ≥ row is long DOWN (`CMPD BODNRG / BLT`,
  // :3801-3802 — BLT exits only strictly under); delta ≤ row is long UP
  // (`CMPD BOUPRG / BGT`, :3844-3845 — BGT exits only strictly over).
  /**
   * Bounder (`BOUNDR` :3787-3946). Decide: null player → level (`BEQ BOLEVV`,
   * :3797); delta ≥ BODNRG(wave) → down-seek, braking the fall at BODNVY(wave)
   * (:3819); delta ≤ BOUPRG(wave) → up-seek (flap while not rising); otherwise
   * level. LEVEL flight (`BOLEV` :3903): flap iff falling (velY ≥ 0) — the
   * per-wake collapse of tracking the line it was on when it decided; it NEVER
   * consults BODNVY. An armed `enemy.seek` episode pre-empts the decide
   * entirely: mode 'down' runs the brake law, mode 'up' the climb law,
   * whatever the player is doing now (`BODN1`/`BOUP1` never re-run SELPLY).
   * Pure — the workspace is advanced by `stepEnemy`, not here.
   */
  boundr(enemy: EnemyState, player: PlayerView | null, wave?: number): Decision

  /**
   * Hunter (`B2UNDR` :3960-4200): the same episodic pursuit as the bounder
   * through its OWN rows — HUDNRG/HUUPRG gates (:3984, :4028), HUDNDI/HUUPDI
   * budgets (:3986, :4035), the faster HUDNVY brake (:4004). Pure.
   */
  b2undr(enemy: EnemyState, player: PlayerView | null, wave?: number): Decision

  /**
   * Shadow lord (`SHADOW` :4230-4330): stateless — no DI rows, no SeekState.
   * Decide: null player → SHLEV (own line, per-wake: wings up above the lava);
   * delta ≥ SHDNRG(wave) → SHDN, the no-flap drop (:4246-4248); delta ≤
   * SHUPRG(wave) → up-seek; otherwise SHORT range → SHLEP (:4277), which tracks
   * the PLAYER'S line with NO velY gate — it flaps whenever strictly below the
   * player's pixel Y, even mid-rise (`CMPB PDIST+1,U / BLS SHLEPA`,
   * :4293-4294). The lava escape below `LAVA_ESCAPE_Y` stays in every branch.
   * Pure.
   */
  shadow(enemy: EnemyState, player: PlayerView | null, wave?: number): Decision

  /**
   * Dispatch by `enemy.brain`: `linet` runs the dumb lane-track (player ignored);
   * a smart brain runs its pursuit against `player`. Pure.
   */
  runBrain(enemy: EnemyState, player?: PlayerView | null, wave?: number): Decision

  /**
   * One integration step of an enemy on the flight core: advance the homing
   * throttle, advance the SEEK workspace (uf1-8), run the brain, then apply the
   * decision through the SAME flight pipeline a player uses (flap + stepFlight +
   * ceiling/wrap/land). Returns the enemy after the step. This is what a
   * `kind: 'enemy'` scheduler process runs on each wake; the EMYTIM divider is
   * the process `period`, NOT anything inside this step. Pure.
   *
   * The uf1-8 seek-workspace laws this must obey (all on ENTRY state — the
   * brain runs before the wake's integration, exactly as the ROM's PJOY routine
   * writes CURJOY before the mover consumes it):
   *   • a smart bounder/hunter deciding LONG range arms `seek` with the wave's
   *     DI-row value, unspent (`LDD BODNDI / STD PDIST,U` :3803-3804 — the arm
   *     wake performs no ADDD);
   *   • a carried episode spends `pdist += entry velY` only on wakes moving in
   *     its direction (:3813-3817 / :3855-3860), and is otherwise carried
   *     UNTOUCHED — never re-seeded while unspent;
   *   • a spend that crosses zero (down: ≥ 0, up: < 0) exhausts the episode and
   *     re-decides THE SAME WAKE (`BPL BOBRAIN` :3816, `BOBRAIN JMP BOUNDR`
   *     :3842) — the fresh decide may arm a fresh episode, at the FULL wave
   *     value, or clear `seek` if it routes short/level;
   *   • a grounded enemy exits its episode and re-decides (`BODN1 LDD PSTATE,U
   *     / BNE BOBRAIN` :3811-3812);
   *   • short-range, null-target and shadow/linet wakes carry NO `seek`.
   */
  stepEnemy(enemy: EnemyState, ctx?: { player?: PlayerView | null; wave?: number }): EnemyState

  /**
   * jt5-3 — `stepEnemy` PLUS the wing EDGE this wake produced (or `null`).
   * frame.ts calls this to get the flap cue without re-running the brain.
   *
   * Declared here by uf1-9 for the same reason as `prevFlapHeld` above: a
   * cadence is only observable through the level and its edges, and neither was
   * reachable from the contract. `wingEdge` is `'down'` on the wake the wings
   * go down, `'up'` on the wake they come back up, `null` otherwise.
   */
  stepEnemyDetailed(
    enemy: EnemyState,
    ctx?: { player?: PlayerView | null; wave?: number },
  ): { enemy: EnemyState; wingEdge: 'down' | 'up' | null }

  /**
   * jt8-3 — the cliff look-ahead that may flip `facing` BEFORE the brain runs.
   * Declared by uf1-9 round 2: it has existed in `src/core/enemy.ts` since jt8-3
   * and never in this contract (the same one-directional drift that hid
   * `stepEnemyDetailed`), and a cliff turn is the only way to arm a dwell.
   */
  steerWake(enemy: EnemyState, target: PlayerView | null): { enemy: EnemyState; turned: boolean }

  /** uf1-9 — `LDA #2` (:3823/:4008), the DOWN-seek's frozen wing-down hold. */
  DOWN_SEEK_WING_HOLD: number

  /** uf1-9 — `LDA #8` (:4144), `B2DICL`'s frozen dwell. NOT the SHCLTM row. */
  HUNTER_CLIFF_DWELL: number
}

/**
 * Load the not-yet-built enemy core with a self-describing failure — the
 * loadFlight/loadScheduler pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/enemy.ts` does not exist, so this throws "enemy core not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace or a type error.
 */
export async function loadEnemy(): Promise<EnemyModule> {
  const specifier = ['..', '..', 'src', 'core', 'enemy.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<EnemyModule>
    for (const fn of [
      'linetTarget',
      'linet',
      'seedBudget',
      'growWanted',
      'shouldPromote',
      'promote',
      'creditDeath',
      'boundr',
      'b2undr',
      'shadow',
      'runBrain',
      'stepEnemy',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['AOFF_LINES', 'AOFF_BAND', 'EMYTIM_NORMAL', 'EMYTIM_SLOW'] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as EnemyModule
  } catch (e) {
    throw new Error(
      'enemy core not built yet — GREEN (Julia) creates joust/src/core/enemy.ts to ' +
        'satisfy tests/helpers/enemy-contract.ts: the LINET dumb brain + the ' +
        'NSMART/WSMART budget (seed/grow/promote/creditDeath) + the three smart ' +
        'brains + stepEnemy, and wires a `kind: "enemy"` process into ' +
        'src/core/frame.ts (period = EMYTIM). ' +
        `(${(e as Error).message})`,
    )
  }
}
