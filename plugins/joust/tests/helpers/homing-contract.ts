// tests/helpers/homing-contract.ts
//
// Story jt8-2 — RED phase (Leeloo / TEA). The contract for HORIZONTAL HOMING:
// the `BODIR` / `BOLEVB` pair (JOUSTRV4.SRC:3876-3884, 3939-3946) — the only
// thing that ever changes the BOUNDER's facing. (Round-2 correction, Reviewer
// [LOW][DOC]: "the only thing in the ROM that ever changes a SMART enemy's
// facing" was false. The hunter and the shadow lord ALSO aim directly —
// `B2DIR`'s `CLR PFACE,U  FACE RIGHT` / `STA PFACE,U  FACE LEFT` at :4122/:4141
// and `SHDIR`'s pair at :4353/:4372 — and those are jt8-3's. What is true, and
// pinned mechanically in homing-source.test.ts, is that across the whole BOUNDR
// brain :3787-3946 the COM at :3945 is the sole PFACE write.) jt8-1 gave the
// brains a TARGET; jt2-2 gave them a vertical seek. Today an enemy's `facing` is
// set once at spawn and never changes again, so it orbits the arena at a fixed
// heading. This is the piece that turns it around.
//
// Extends `enemy-contract.ts` rather than replacing it: `src/core/enemy.ts`
// already exists, so the RED here is "the module has no such export", surfaced by
// the runtime shape check in `loadHoming()` — never a tsc error, because every
// type this suite uses is declared HERE, not imported from `src/`.
//
// ─── WHAT THE ROM ACTUALLY DOES (read firsthand, and it is NOT the story prose) ─
//
//   BODIR   LDA  PFACE,U            :3876   ← the horizontal decision IS the facing
//           BMI  BODN1C             :3877
//           LDA  #1  / STD CURJOY   :3878-9  facing >= 0  ⇒  dir = +1
//   BODN1C  LDA  #-1 / STD CURJOY   :3882-3  facing <  0  ⇒  dir = −1
//
//   BOLEV   ...                     :3903    entering LEVEL FLIGHT:
//           LDA  PVELX,X            :3907    ← the TARGET's FLYX index (X = the player)
//           STA  PPVELX,U           :3908      snapshotted into the enemy's workspace
//           LDA  BOLETM             :3909      "TIME UNTIL NEXT DECISION"  (uf1-9's)
//
//   BOLEVB  LDA  PPVELX,U           :3939    "DO NOT COPY PLAYERS MOVES TOO OFTEN"
//           CMPA PVELX,U            :3940    ← against the ENEMY'S OWN index (U = self)
//           BNE  BODIR3             :3941      DIFFERENT ⇒ nothing happens at all
//           DEC  PRDIR,U            :3942      SAME     ⇒ tick the reverse counter
//           BMI  BODIR3             :3943      still negative ⇒ no flip
//           CLR  PRDIR,U            :3944
//           COM  PFACE,U            :3945    "TRY THE OTHER DIRECTION"
//   BODIR3  JMP  BODIR              :3946    ← the flip is read by BODIR THIS SAME WAKE
//
// So the bounder does NOT steer toward its target. It flies its current heading
// until its own speed MATCHES the target's — i.e. until it is shadowing them in
// lockstep and therefore never closing — and only then, after the throttle counts
// out, reverses to cut them off.
//
// jt8-2 compares the target's LIVE speed. The ROM compares a SNAPSHOT frozen at
// the last BOLEV decision (:3907-3908), and the decision timer that creates that
// moment — BOLETM, :3909 — belongs to **uf1-9**. See `HomingState` in
// enemy-contract.ts for why no `ppvelx` field is modelled here, and the session
// file's Design Deviations for the divergence this leaves open. The anti-orbit
// mechanism is a velocity-matched periodic REVERSAL. (Steering that actually aims
// at the player is `B2DIR`/`SHDIR` — the cliff look-ahead and the shadow's
// player-line track — which the design spec assigns to **jt8-3**.)
//
// The identical idiom appears three times, once per smart brain, which is why
// this contract covers all three rather than the bounder alone:
//   bounder BOLEVB :3939-3946   hunter B2LE11 :4087-4094   shadow SHLEPB :4303-4310
//
// ─── THE PORT SEAM ───────────────────────────────────────────────────────────
// `AIROVR` (:6456-6481) is the shared airborne step for players AND enemies: it
// calls the brain through `JSR [PJOY,U]`, then sets `PFACE` from the returned
// direction (:6470-6475). For an enemy that write is a NO-OP — BODIR returns
// `sign(PFACE)`, so it re-stores what it just read. The facing therefore round-
// trips unchanged, and `COM PFACE,U` at :3945 is the ONLY mutation. Our port's
// equivalent is `stepEnemy`: homing wake first, then the brain, then the flight
// step — so a flip is already visible in the SAME wake's `dir` and in the
// horizontal impulse that wake applies.

import type { EnemyState, PlayerView, HomingState } from './enemy-contract.js'

export type { EnemyState, PlayerView, HomingState }

export interface HomingModule {
  /**
   * The number of velocity-MATCHED wakes between two flips = **129**.
   *
   * DERIVED, never stated as a constant in the source — it falls out of the
   * 8-bit `DEC`/`BMI` pair at :3942-3943 walking a counter that stands at ZERO.
   * `DEC` sets N from bit 7 of the 8-bit result and `BMI` skips the flip while N
   * is set, so the counter walks 0 → $FF → $FE → … → $80 (128 wakes, all
   * negative, no flip) and the 129th `DEC` lands $7F — non-negative — which
   * finally reaches `CLR PRDIR,U` + `COM PFACE,U`.
   *
   * ROUND-2 CORRECTION to the anchor: the zero this walk starts from is the one
   * **the flip itself writes** — `CLR PRDIR,U` (:3944) — so 129 is the cadence
   * BETWEEN flips, every cycle after the first. It is NOT the state a mounted
   * enemy is born in; see `seedHoming`. The old text anchored the walk on
   * `CLR PRDIR,Y` (:3255), which clears the RIDERLESS seeker's counter, and that
   * mis-anchoring is precisely what made the shipped feature inert.
   */
  PRDIR_FLIP_WAKES: number

  /**
   * The homing workspace a MOUNTED enemy is born with: `prdir` = **1**.
   *
   * ─── ROUND-2 CORRECTION (Reviewer [HIGH]) ───────────────────────────────────
   * This returned 0, cited `CLR PRDIR,Y` ("ASSUME BIRD NEVER CAME WITHIN SHORT
   * RANGE SCAN", JOUSTRV4.SRC:3255). That citation is real but it describes a
   * bird THIS PORT DOES NOT MODEL. At :3268 the freshly hatched bird is given
   * `PJOY = SEEKE` — "TELL THE DOGIE TO FETCH THE LITTLE MAN" — i.e. it is a
   * RIDERLESS seeker running the SEEK flight, not a smart brain. Our
   * `EnemyState` is always a MOUNTED knight (it carries an `enemyType` and a
   * `decision` brain), and the ROM's value for that bird is 1:
   *
   *   SEEKFS  LDA  #1                    :3584
   *           STA  PRDIR,U   THE BIRD CAME WITHIN SHORT RANGE SENSORS   :3585
   *           …
   *           BEQ  MOUNTM    GOT THE MAN!!!                             :3592
   *   MOUNTM  PULS B                                                    :3654
   *   …       LDD  DSMART,X  SELECT PROPER JOYSTICK ROUTINE             :3693
   *           STD  PJOY,U                                               :3694
   *
   * `MOUNTM` is branched to from exactly ONE place in the whole source (:3592),
   * that branch sits in the straight-line run that begins at `SEEKFS`, and
   * nothing between :3585 and the `DSMART` install writes `PRDIR`. So **every
   * bird that acquires a rider enters its smart brain with PRDIR = 1** and
   * reverses on its FIRST velocity-matched wake — the 129-walk is the ROM's
   * cadence between LATER flips, not the price of the first one. All three
   * facts are pinned mechanically in homing-source.test.ts.
   *
   * The transporter-entry path is left UNDEFINED by the ROM rather than zeroed
   * (`CUPROC` writes only PLINK/PNAP/PPC/PID/PPRI — SYSTEM.SRC:387-404 — so the
   * recycled workspace is never cleared; `WCREATE` :2201 clears PCHASE and not
   * PRDIR; `LNTSMT` :3764-3775 promotes LINET → smart without touching it). A
   * port must be deterministic, so it unifies on the one DEFINED mounted value
   * instead of inventing a second. Logged as a Design Deviation.
   *
   * Pure.
   */
  seedHoming(): HomingState

  /**
   * `BOLEVB` (JOUSTRV4.SRC:3939-3946) — ONE wake of the horizontal-homing
   * throttle. Returns the enemy with its `facing` and `homing` advanced; the
   * argument is never mutated.
   *
   *   • `target === null` — nobody to copy, so nothing happens: facing held, the
   *     counter untouched. (This is what keeps a bare scheduler run, which steps
   *     every enemy with no target, bit-identical to its pre-jt8-2 replay.)
   *   • the target's `velXIndex` ≠ the enemy's own `entity.velXIndex` — the `BNE`
   *     at :3941 leaves the counter ALONE. Not "reset", not "decremented":
   *     untouched. A mismatched wake is not a wake at all.
   *   • they match — `DEC PRDIR` (8-bit). Still negative ⇒ hold. Non-negative ⇒
   *     the counter is CLEARED to 0 and the facing is COMplemented.
   *
   * Applies to the three SMART brains only. The dumb `linet` lane-tracker has no
   * homing at all (`LNTFLP TST PFACE,U  MOVE IN DIRECTION OF FACING`, :3749) —
   * it moves in its facing and never reverses.
   */
  homingWake(enemy: EnemyState, target: PlayerView | null): EnemyState
}

/**
 * Load the jt8-2 additions to the enemy core with a self-describing failure —
 * the `loadEnemy`/`loadTarget` pattern. The specifier is assembled at runtime so
 * the bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/enemy.ts` exists but exports none of these, so this throws
 * "horizontal homing not built yet" per test — a clean "feature absent" red.
 */
export async function loadHoming(): Promise<HomingModule> {
  const specifier = ['..', '..', 'src', 'core', 'enemy.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<HomingModule>
    for (const fn of ['seedHoming', 'homingWake'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    if (mod.PRDIR_FLIP_WAKES === undefined) throw new Error('module has no `PRDIR_FLIP_WAKES` export')
    return mod as HomingModule
  } catch (e) {
    // Rule #11 (round-2 Reviewer [LOW][RULE]): narrow before reading `.message`.
    // A non-Error throw — a bundler rejecting with a string — would otherwise
    // stringify as `undefined` and hide the real cause behind our own prose.
    const cause = e instanceof Error ? e.message : String(e)
    throw new Error(
      'horizontal homing not built yet — GREEN (Korben) extends joust/src/core/enemy.ts to ' +
        'satisfy tests/helpers/homing-contract.ts: PRDIR_FLIP_WAKES + seedHoming() + ' +
        'homingWake() (the BOLEVB velocity-match throttle and its 8-bit PRDIR flip, ' +
        'JOUSTRV4.SRC:3939-3946), called from stepEnemy BEFORE the brain so the flip ' +
        'reaches BODIR the same wake; plus `velXIndex` plumbed onto PlayerView through ' +
        'src/core/target.ts (selectTarget) and src/core/frame.ts (the players array). ' +
        `(${cause})`,
    )
  }
}
