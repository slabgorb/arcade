// tests/helpers/steering-contract.ts
//
// Story jt8-3 — RED phase (Mr. Praline / TEA). The contract for the CLIFF
// LOOK-AHEAD steering (`B2DIR` JOUSTRV4.SRC:4104-4159, `SHDIR` :4330-4377) —
// the first thing in this port that ever AIMS an enemy's facing rather than
// toggling it. jt8-2's `homingWake` (`COM PFACE,U`, a blind complement) is the
// only facing writer today; this story adds the writes that KNOW where they are
// pointing: `CLR PFACE,U  FACE RIGHT` (:4122/:4353) and `#-1 STA PFACE  FACE
// LEFT` (:4140-4141/:4371-4372).
//
// Extends `enemy-contract.ts` (the loadEnemy/loadHoming pattern): the RED here
// is "the module has no such export", surfaced by the runtime shape check in
// `loadSteering()` — never a tsc error, because every type this suite uses is
// declared HERE, not imported from `src/`.
//
// ─── WHAT THE ROM ACTUALLY DOES (read firsthand) ─────────────────────────────
//
//   B2DIR   LDA  PVELX,U          :4104   ← travel direction = the FLYX index SIGN
//           BEQ  B2DIRA           :4105     not moving ⇒ NO look-ahead at all
//           BPL  B2DILR           :4106     moving right ⇒ the +B2XLEN branch
//           …                     :4108-4115  D = PVELY << 3 (three ASLB/ROLA pairs)
//           LEAY A,Y              :4118     project the sample by (PVELY×8)'s HIGH
//                                           byte — look 16 px below at a $0200 dive
//           LDA  BCKXTB-B2XLEN,X  :4119   ← the BACKGROUND-collision pair, NOT the
//           ANDA BCKYTB,Y         :4120     landing pair CKGND reads (:6705-6706)
//           BEQ  B2DIRA           :4121     open air ⇒ nothing happens
//           CLR  PFACE,U          :4122     cliff ahead ⇒ FACE RIGHT (away)
//           BRA  B2DICL           :4123
//   B2DILR  …the mirror image…    :4125-4141  +B2XLEN sample; `#-1 STA PFACE` FACE LEFT
//   B2DICL  LDD  #B2AV / STD PJOY :4142-4143  install the 8-wake SLOW episode
//           LDA  #8 / STA PJOYT   :4144-4145  (B2AV :4190-4193 — wings up, dir =
//           LDB  #1               :4146       the NEW facing, i.e. thrust AGAINST
//                                             the old motion), and FLAP the turn wake
//
// The shadow's copy (`SHDIR` :4330-4377) is identical in law (SHXLEN :4228,
// SHAV :4406-4409, SHCLTM #8 :4375) with ONE extra pre-check the hunter lacks:
// :4330-4334 compares PPOSY+1 against **#$D0** (not $D3) and routes a falling
// shadow to BOLAVA instead. The hunter's own gate sits OUTSIDE B2DIR, at
// `B2DIRL` :4097-4102, and uses **#$D3**. Two different lava thresholds; do not
// conflate them.
//
// ─── WHO STEERS, ON WHICH WAKES (every route traced) ─────────────────────────
// Hunter: EVERY airborne exit funnels into the look-ahead — the episode states
// through `B2DIRL` (:4097, `JMP B2DIRL` at :4011/:4024/:4052) and the level
// path through `B2LE11 → B2DIR` (:4089/:4091/:4094). Shadow: ONLY the
// no-players SHLEV route falls into SHDIR (:4329-4330, and `SHLEVA JMP SHDIR`
// :4401-4402). A shadow HUNTING a player never looks ahead: SHLEP exits via
// `SHLEPB → SHDIRA` (:4303-4310) and the long-range seeks coast via `SHDIRB`
// (:4388-4392, dir = 0 while moving — a filed finding, not this story's).
// Bounder: `BODIR` (:3876-3884) reads PFACE and nothing else — the sole PFACE
// write in the whole BOUNDR brain is jt8-2's COM (:3945), enumerated in
// homing-source.test.ts. The plain bounder does NOT look ahead.
//
// ─── THE PORT SEAM (per-wake collapse, same as homing/seek) ──────────────────
// PJOYT episode timing (the 8-wake B2AV/SHAV hold, like every "TIME UNTIL NEXT
// DECISION" row) is uf1-9's; the collapse runs the look-ahead per wake. That is
// stable because B2DIR is IDEMPOTENT — it SETS facing away from the cliff, it
// does not toggle — and the slow collapses to "dir = the new facing while the
// old velocity decays". The turn wake's `LDB #1` flap is kept: through ADDFLP
// (:6437-6439) it steps the FLYX index 2 toward the new facing, which is the
// observable "slow" this suite pins.

import type { EnemyState, PlayerView } from './enemy-contract.js'

export type { EnemyState, PlayerView }

/** What one steering wake did to the enemy. */
export interface SteerResult {
  /** The enemy after the wake — facing set AWAY from a detected cliff. */
  readonly enemy: EnemyState
  /**
   * Whether a cliff was detected ahead this wake (`BEQ B2DIRA` NOT taken).
   * A turned wake flaps (`LDB #1`, :4146/:4377) — `stepEnemyDetailed` must
   * route that into the entity input so the FLYX index steps away.
   */
  readonly turned: boolean
}

export interface SteeringModule {
  /** `B2XLEN EQU 27+4` (JOUSTRV4.SRC:3969) = 31 — the hunter's look-ahead, in px. DECIMAL. */
  B2XLEN: number
  /** `SHXLEN EQU 27+4` (JOUSTRV4.SRC:4228) = 31 — the shadow lord's, same length. DECIMAL. */
  SHXLEN: number
  /**
   * `SHDIR`'s lava pre-check line = `$D0` (JOUSTRV4.SRC:4330-4334): at or below
   * it, a FALLING shadow goes to BOLAVA instead of steering. NOT the hunter's
   * `$D3` (`B2DIRL` :4097-4102) and NOT `LAVA_ESCAPE_Y` ($D3, the SHDN escape).
   */
  SHDIR_LAVA_Y: number
  /**
   * One look-ahead wake (`B2DIR` :4104-4159 / `SHDIR` :4330-4377), collapsed
   * per-wake. Pure — the argument is never mutated. The laws:
   *
   *   • runs for the HUNTER (`b2undr`) on every airborne wake, gated by
   *     `B2DIRL` (:4097-4102): at/below $D3 AND falling ⇒ BOLAVA's territory,
   *     no steer (BOLAVA itself is a filed follow-up, not modelled);
   *   • runs for the SHADOW (`shadow`) ONLY when `target` is null (the SHLEV
   *     route — a hunting shadow exits SHLEPB→SHDIRA/SHDIRB and never looks),
   *     gated by :4330-4334: at/below $D0 AND falling ⇒ no steer;
   *   • never runs for `boundr`, `linet`, a grounded enemy, or `velXIndex` 0
   *     (`BEQ B2DIRA`, :4105/:4335);
   *   • samples the BACKGROUND-collision pair — `BCK_X_TABLE[x ± 31] &
   *     BCK_Y_TABLE[pixelY + ((velY×8) >> 8)]` (:4108-4120, the three
   *     ASLB/ROLA pairs then `LEAY A,Y`) — NOT `groundMaskAt`, which is the
   *     LANDING pair (`CKGND` :6705-6706). The fixtures in steering.test.ts
   *     sit where the two pairs disagree, so sampling the wrong one reds;
   *   • a solid sample sets facing AWAY from the cliff (right-moving ⇒ face
   *     left, :4140-4141; left-moving ⇒ face right, :4122) and reports
   *     `turned: true`; open air changes nothing.
   *
   * jt9-48 — the THIRD parameter is `bumpX`, the collision shove jt9-17 parked
   * on the `DemoProcess` (`PBUMPX,U`). B2DIRA (:4148-4150) / SHDIRA (:4379-4381)
   * are the tails EVERY B2DIR/SHDIR path funnels through before the aim: the
   * parked branch (`BEQ B2DIRA` :4105/:4336), open air (`BEQ B2DIRA`
   * :4121/:4352/:4370), AND a cliff turn (`B2DICL`/`SHDICL` fall THROUGH into
   * B2DIRA/SHDIRA — :4142-4148 / :4373-4379). At that tail `LDA PBUMPX,U / BEQ
   * B2FDIR / STA PFACE,U`: a NON-ZERO bump is the LAST word on facing —
   * `facing = sign(bumpX)`, overriding even the turn-away it just set. Zero (or
   * `undefined` — an unshoved process) leaves facing exactly as the look-ahead
   * left it. Never reached when lava-diverted (B2DIRL/`$D0` fired) or for the
   * bounder/linet/grounded, which return before the tail. Defaults to no shove.
   */
  steerWake(enemy: EnemyState, target: PlayerView | null, bumpX?: number): SteerResult
}

/**
 * Load the jt8-3 additions with a self-describing failure — the
 * loadEnemy/loadHoming pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/enemy.ts` exports none of these, so this throws
 * "cliff look-ahead not built yet" per test — a clean "feature absent" red.
 */
export async function loadSteering(): Promise<SteeringModule> {
  const specifier = ['..', '..', 'src', 'core', 'enemy.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SteeringModule>
    if (typeof mod.steerWake !== 'function') throw new Error('module has no `steerWake` export')
    for (const k of ['B2XLEN', 'SHXLEN', 'SHDIR_LAVA_Y'] as const) {
      if (mod[k] === undefined) throw new Error(`module has no \`${k}\` export`)
    }
    return mod as SteeringModule
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e)
    throw new Error(
      'cliff look-ahead not built yet — GREEN (Bicycle Repair Man) extends ' +
        'joust/src/core/enemy.ts to satisfy tests/helpers/steering-contract.ts: ' +
        'B2XLEN + SHXLEN + SHDIR_LAVA_Y + steerWake() (the B2DIR/SHDIR cliff ' +
        'look-ahead, JOUSTRV4.SRC:4104-4159/:4330-4377, sampling BCK_X_TABLE & ' +
        'BCK_Y_TABLE with the (velY×8)>>8 projection), called from ' +
        'stepEnemyDetailed with the turn wake flapping (LDB #1, :4146); plus the ' +
        "shadow()'s SHDN/SHLEP laws re-seated per steering.test.ts. " +
        `(${cause})`,
    )
  }
}
