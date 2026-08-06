// tests/helpers/egg-contract.ts
//
// Story jt2-4 — the CONTRACT for the egg lifecycle core, TEA-authored (O'Brien).
// Same double-entry split every jt story has used since jt1-2: TEA states the
// module shape and the laws that pin it; Dev (Julia) writes the module. The
// behaviour lives in tests/egg.test.ts; the ROM-law provenance in
// tests/egg-source.test.ts, and every newly-cited range carries a committed
// claim in docs/rom-study/claims/egg.json (byte-verified by the citations suite).
//
// ─── WHAT jt2-4 MODELS (all cited; see egg-source.test.ts) ───────────────────
// The egg lifecycle as a PROCESS. A killed enemy becomes an egg (DEATH3,
// JOUSTRV4.SRC:2952-3007); the egg falls, bounces, settles on a ledge, and — if
// the enemy has eggs left — HATCHES a buzzard that flies back in to remount:
//
//   • SPAWN carries the victim's velocities verbatim (LDD PVELY / STD PVELY,
//     LDA PVELX / STA PVELX, JOUSTRV4.SRC:2991-2994) and RESETS the bump
//     registers (CLR PBUMPX/PBUMPY, :2995-2996). It sits X+4 / Y-8px off the
//     dead enemy (:2980, :2983) with PFEET=0 — "NOT CAUGHT IN THE AIR YET!" the
//     500-pt catch bonus is still live (:2985).
//   • BOUNCE (EGGBON, JOUSTRV4.SRC:3196-3218): the FLYX "X index" decays by 2
//     toward zero each bounce (ADDA #-2 / ADDA #2, :3204/:3207); the downward
//     Y velocity keeps a QUARTER of itself, INVERTED (ASRA/RORB twice = >>2, then
//     COMA/NEGB/SBCA #-1 = 16-bit negate, :3211-3217) → velY' = −(velY >> 2).
//   • SETTLE (JOUSTRV4.SRC:3219-3222): the egg lands only when the bounced velY
//     is no faster than $20 up AND the X index has reached 0 — `CMPD #-$0020 /
//     BLT (still too fast)` then `LDA PVELX / BNE (still too fast)`. So settle
//     iff `velY >= -$20 && velX === 0`, both exact.
//   • The egg uses a NARROWER wrap than an entity: [4, 288] (EGGWR, :3141-3146),
//     a 284-unit correction — vs the entity band [ELEFT −10, ERIGHT 292] / 303.
//     An X in (288, 292] or [−10, 4) wraps for an EGG but not for an entity.
//   • LEDGE placement seeds an egg every 8th pixel (LDB #8 / MUL, :2871) across
//     the six cliff tiers via the EGLEDG cumulative table (JOUSTRV4.SRC:2910-2915,
//     [8,19,26,38,46,69]) — 69 slots total; EGGLNT gives each cliff's land Y.
//   • VALUE LADDER (EGGVAL, JOUSTRV4.SRC:3097-3104): a caught egg scores 250 →
//     500 → 750 → 1000 by the running per-decision hit count, CAPPED at 1000
//     ("PEG AT 1,000"); the counter itself pegs at 4 (CMPB #4 / BHS, :3043). Each
//     byte is DVALUE-decoded, not a raw ×100 ($57 via SCRTEN = 750, the jt2-3
//     trap). A MID-AIR catch — PFEET still 0 — pays an extra +500 (PFEET, :3065-3069).
//     These are SCORE EVENTS only; BCD accumulation is jt4 (epic scoring ruling).
//   • HATCH (EGGLND, JOUSTRV4.SRC:3245-3278): a buzzard flies in at MAX FLYX
//     speed 8 (LDA #8 / STA PVELX, :3256-3257) to remount. Its ENTRY EDGE is the
//     OPPOSITE / FARTHER edge — see the correction below. The remount debits the
//     intelligence budget exactly like a LINET promotion: MOUNRI INC NSMART
//     (:3669, jt2-2's recorded seam JT22-015) + INC PCHASE 0→1 (:3676).
//   • PERMADEATH: each enemy carries PEGG=4 (LDA #4, JOUSTRV4.SRC:2900-2901);
//     spawning an egg DECrements it (:3001) and only hatches while it is nonzero
//     (BNE, :3002). The 4th egg (PEGG → 0) is permadeath — no hatch.
//
// ─── THE HATCH ENTERS FROM THE FARTHER EDGE — a correction to the AC prose ────
// This story's AC-3 and epic law #7 say the hatched buzzard "flies in from the
// NEARER screen edge". The vendored source does the OPPOSITE, and it is
// unambiguous (JOUSTRV4.SRC:3270-3279):
//
//     LDD  PPOSX,U                 WHERE IS THE LITTLE MAN?   (the egg's X)
//     SUBD #(ERIGHT-ELEFT)/2       — compare against the 151-px half-width
//     BHI  EGGMRT                  BR=MAN ON RIGHT SIDE OF SCREEN
//     COM  PFACE,Y / NEG PVELX,Y   (man on LEFT: face left, velX −8)
//     LDD  #ERIGHT-1               ...start the bird at the RIGHT edge (291)
//     BRA  EGGMAN
//   EGGMRT
//     LDD  #ELEFT+1                (man on RIGHT: start the bird at the LEFT edge, −9)
//   EGGMAN STD PPOSX,Y
//
// So an egg in the RIGHT half spawns its buzzard at the LEFT edge (−9) flying
// RIGHT (+8); an egg in the LEFT half spawns it at the RIGHT edge (291) flying
// LEFT (−8). The bird ALWAYS enters from the edge OPPOSITE the rider and sweeps
// across — the FARTHER edge, not the nearer. This is a jt1-10-class wrong-prose
// citation, the same shape as jt2-3's "fraction included" OSTBO correction.
// TEA pins the ROM truth (opposite edge) and logs a Design Deviation + a blocking
// Conflict against AC-3 / epic law #7 (see the TEA Assessment's Delivery Findings).
//
// ─── THE EGG'S FIELDS RIDE THE TAGGED UNION, NOT THE SHARED STRUCT ────────────
// A binding epic ruling: the egg's score-message state OVERLAYS PRDIR/PPVELX
// (JOUSTRV4.SRC:3028-3036, :3054) — the ROM reuses a process's RAM for egg
// purposes. In the port, the egg-specific fields live in this `EggState`
// variant; the shared flight `EntityState` does NOT grow egg fields (it is
// generated and DO-NOT-HAND-EDIT). egg-source.test.ts pins that the shared
// struct stays clean.

import type { EntityState } from './flight-contract.js'
import type { IntelBudget } from './enemy-contract.js'
import type { EnemyType } from './joust-collision-contract.js'

export type { EntityState, IntelBudget }

/** `PFACE` — facing: +1 right, −1 left (RAMDEF.SRC:186 — 0=right, <>0=left). */
export type Facing = -1 | 1

/**
 * The tagged union's EGG variant. These fields ride HERE, never on the shared
 * flight `EntityState` (the epic's tagged-union ruling — the shared struct does
 * not grow). `posY` is 8.8 (high byte = whole pixel); `velX` is the FLYX index
 * (−8..+8, the "X index" that decays 2 per bounce); `velY` is 16-bit signed.
 */
export interface EggState {
  /** Whole-pixel X (PPOSX). Wraps to the NARROW [4, 288] band. */
  posX: number
  /** 8.8 fixed Y — high byte the pixel, low byte the fraction. */
  posY: number
  /** `PVELX` — the FLYX index; the "X index" that decays 2 toward 0 per bounce. */
  velX: number
  /** `PVELY` — 16-bit signed; keeps a QUARTER of itself, inverted, on a bounce. */
  velY: number
  /** `PBUMPX` — one-shot horizontal shove (reset at spawn). */
  bumpX: number
  /** `PBUMPY` — one-shot vertical shove (reset at spawn). */
  bumpY: number
  /** `PEGG` — eggs left in this enemy; hatches while > 0, permadeath at 0. */
  eggsLeft: number
  /** The running per-decision egg-hit count (DEGGS) for the value ladder; pegs at 4. */
  hitCount: number
  /** `PFEET` — 0 = still in the air (the +500 catch bonus is live), nonzero = landed. */
  pfeet: number
  /** Whether the egg has SETTLED on a ledge (|velY| ≤ $20 and X index 0). */
  settled: boolean
  /**
   * `PJOYT` — the settled egg's remaining hatch wait in DISPLAY frames (jt9-9).
   * Production has carried this since jt9-9 (`src/core/egg.ts:73`); the mirror
   * had not been updated, so no test could stage a wait. Seeding it is NOT a
   * fixture cheat: `stepDemo`'s hatch loop writes this exact field on the egg on
   * every frame of the wait, so a seeded value is a state the sim itself
   * produces — it only saves stepping the full EGGWT/EGGWT2 wait to reach it.
   */
  waitFrames?: number
  /**
   * jt9-25 — the EGGMAN hatch-cutscene walk position (the EGGTBL row 0..7 shown),
   * UNDEFINED until the wait expires and the crack animation begins. Production
   * carries this on `src/core/egg.ts`'s EggState; the mirror gains it so tests can
   * observe that the hatch is now a multi-frame cutscene, not an instant remount.
   */
  hatchRow?: number
  /** jt9-25 — display frames left on the current EGGTBL row before the walk advances. */
  hatchNap?: number
  /**
   * jt9-47 — the LAYING enemy's species (PID), carried across the hatch so the
   * remount buzzard restores its parent's type/brain/score instead of the
   * hardcoded 'bounder' the port used through jt9-46 (the `const type` in
   * `remountEnemyProcess`). Set by `spawnEgg` from the dying enemy at DEATH3; the remount
   * reads it. OPTIONAL because a WAVEGG wave egg has no laying enemy — such an
   * egg carries no species and the remount falls back to 'bounder'.
   */
  enemyType?: EnemyType
}

/** The minimum a dying joust victim hands the egg (its velocities + eggs-left). */
export interface EggVictim {
  posX: number
  posY: number
  /** The victim's FLYX X index (PVELX) — carried verbatim. */
  velX: number
  /** The victim's PVELY — carried verbatim. */
  velY: number
  /** The victim's PEGG before this death. */
  eggsLeft: number
  /**
   * jt9-47 — the dying enemy's species (PID), the field `spawnEgg` threads onto
   * the egg's `enemyType` so the eventual remount restores the parent's species.
   * OPTIONAL only so pre-jt9-47 `spawnEgg` callers still typecheck; a real DEATH3
   * victim always carries it.
   */
  enemyType?: EnemyType
}

/** Where a hatched buzzard enters, and how it flies toward the rider. */
export interface RemountEntry {
  /** The entry X — an edge (`REMOUNT_ENTRY_LEFT_X` or `REMOUNT_ENTRY_RIGHT_X`). */
  posX: number
  /** The fly-in velocity: +`REMOUNT_MAX_VELX` (from the left) or −it (from the right). */
  velX: number
  /** The buzzard's facing as it sweeps toward the rider. */
  facing: Facing
}

export interface EggModule {
  // ─── Cited constants ──────────────────────────────────────────────────────
  /** `LDA #4` — 4 eggs before an enemy's permadeath (JOUSTRV4.SRC:2900-2901). */
  EGGS_PER_ENEMY: number
  /** Egg X = victim X + 4 (`ADDD #4`, JOUSTRV4.SRC:2983). */
  EGG_SPAWN_X_OFFSET: number
  /** Egg pixel-Y = victim pixel-Y − 8 (`SUBB #13-5`, JOUSTRV4.SRC:2980). */
  EGG_SPAWN_Y_OFFSET: number
  /** The FLYX-index decay per bounce (`ADDA #-2` / `ADDA #2`, JOUSTRV4.SRC:3204/3207). */
  EGG_VELX_DECAY: number
  /** `$20` — the settle velY bound (`CMPD #-$0020`, JOUSTRV4.SRC:3219). */
  EGG_SETTLE_VY_MAX: number
  /** The narrow egg wrap's LEFT bound `4` (`CMPD #4`, JOUSTRV4.SRC:3144). */
  EGG_WRAP_LEFT: number
  /** The narrow egg wrap's RIGHT bound `288` (`CMPD #288`, JOUSTRV4.SRC:3141). */
  EGG_WRAP_RIGHT: number
  /** `288 − 4` = 284 — the narrow-wrap correction step (JOUSTRV4.SRC:3143/3146). */
  EGG_WRAP_SPAN: number
  /** `8` — an egg every 8th pixel on a ledge (`LDB #8 / MUL`, JOUSTRV4.SRC:2871). */
  EGG_SLOT_SPACING: number
  /** EGLEDG cumulative slots per tier `[8,19,26,38,46,69]` (JOUSTRV4.SRC:2910-2915). */
  EGG_LEDGE_CUMULATIVE: readonly number[]
  /** `69` — total ledge egg slots (the last EGLEDG entry). */
  EGG_LEDGE_SLOTS: number
  /** EGGVAL decoded: `[250, 500, 750, 1000]` (JOUSTRV4.SRC:3097-3104). */
  EGG_VALUE_LADDER: readonly number[]
  /** `1000` — the capped top value ("PEG AT 1,000", JOUSTRV4.SRC:3103). */
  EGG_VALUE_CAP: number
  /** `4` — the hit-count peg (`CMPB #4 / BHS`, JOUSTRV4.SRC:3043). */
  EGG_HIT_MAX: number
  /** `500` — the mid-air catch bonus (`LDA #$05 / SCRHUN`, JOUSTRV4.SRC:3068). */
  AIR_CATCH_BONUS: number
  /** `8` (MAXVX) — the buzzard's fly-in speed (`LDA #8`, JOUSTRV4.SRC:3256-3257). */
  REMOUNT_MAX_VELX: number
  /** `(ERIGHT-ELEFT)/2` = 151 — the side split (`SUBD #…`, JOUSTRV4.SRC:3271). */
  REMOUNT_HALF_X: number
  /** `ELEFT+1` = −9 — the LEFT entry edge (`LDD #ELEFT+1`, JOUSTRV4.SRC:3278). */
  REMOUNT_ENTRY_LEFT_X: number
  /** `ERIGHT-1` = 291 — the RIGHT entry edge (`LDD #ERIGHT-1`, JOUSTRV4.SRC:3275). */
  REMOUNT_ENTRY_RIGHT_X: number

  // ─── Spawn (DEATH3, JOUSTRV4.SRC:2979-3001) ───────────────────────────────
  /**
   * A killed enemy becomes an egg carrying the victim's velocities verbatim,
   * bump registers reset, PFEET=0 (air-catch live), hitCount 0, X+4 / Y-8px off
   * the victim, and `eggsLeft = victim.eggsLeft − 1` (the DEC PEGG at :3001).
   * Pure — the victim is untouched.
   */
  spawnEgg(victim: EggVictim): EggState

  // ─── Bounce + settle (EGGBON, JOUSTRV4.SRC:3196-3222) ─────────────────────
  /** The bounced Y velocity: a QUARTER kept and INVERTED — `−(velY >> 2)` (downward velY). */
  bounceVelY(velY: number): number
  /** Decay the FLYX X index 2 TOWARD zero: `velX>0 → −2`, `velX<0 → +2`, `0 → 0`. */
  decayVelX(velX: number): number
  /** Settle iff the bounced velY is `>= -EGG_SETTLE_VY_MAX` AND the X index is exactly 0. */
  eggSettles(velY: number, velX: number): boolean
  /**
   * One full bounce (EGGBON): decay the X index, quarter-invert a downward velY,
   * mark the egg landed (PFEET nonzero → no more air-catch bonus), and set
   * `settled` per `eggSettles`. Pure.
   */
  bounceEgg(egg: EggState): EggState

  // ─── The narrow egg wrap (EGGWR, JOUSTRV4.SRC:3141-3146) ───────────────────
  /** Wrap X into [4, 288] (a 284-unit correction) — NARROWER than the entity band. */
  wrapEggX(x: number): number

  // ─── Scoring (EGGSCR / EGGVAL, event values only) ─────────────────────────
  /** Bump the running hit count, pegged at 4 (`CMPB #4 / BHS`, JOUSTRV4.SRC:3043). */
  bumpEggHits(hitCount: number): number
  /** The ladder value for a 1-based hit number: 1→250, 2→500, 3→750, 4+→1000 (capped). */
  eggValue(hitCount: number): number
  /** The mid-air catch bonus: 500 iff `pfeet === 0` (not yet bounced), else 0. */
  airCatchBonus(pfeet: number): number
  /**
   * The score EVENTS for catching an egg in its current state: the ladder value
   * (bumping the hit count), then +500 if it was caught mid-air. No accumulation.
   */
  eggScoreEvents(egg: EggState): number[]

  // ─── Hatch / permadeath / remount (EGGLND, JOUSTRV4.SRC:3239-3278, MOUNRI) ─
  /** The egg hatches only while `eggsLeft > 0`; the 4th egg (0) is permadeath. */
  willHatch(egg: EggState): boolean
  /**
   * Where the hatched buzzard enters — the FARTHER edge (the correction above):
   * an egg in the RIGHT half (`eggX > REMOUNT_HALF_X`) → the LEFT edge flying
   * RIGHT (+8); an egg in the LEFT half → the RIGHT edge flying LEFT (−8).
   */
  remountEntryEdge(eggX: number): RemountEntry
  /**
   * The remount debits the intelligence budget exactly like a LINET promotion —
   * MOUNRI INC NSMART (JOUSTRV4.SRC:3669) — returning the budget with `nsmart+1`.
   */
  remountBudgetDebit(budget: IntelBudget): IntelBudget
}

/**
 * Load the not-yet-built egg core with a self-describing failure — the
 * loadEnemy/loadJoust pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/egg.ts` does not exist, so this throws "egg core not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace or a type error.
 */
export async function loadEgg(): Promise<EggModule> {
  const specifier = ['..', '..', 'src', 'core', 'egg.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<EggModule>
    for (const fn of [
      'spawnEgg',
      'bounceVelY',
      'decayVelX',
      'eggSettles',
      'bounceEgg',
      'wrapEggX',
      'bumpEggHits',
      'eggValue',
      'airCatchBonus',
      'eggScoreEvents',
      'willHatch',
      'remountEntryEdge',
      'remountBudgetDebit',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'EGGS_PER_ENEMY',
      'EGG_SETTLE_VY_MAX',
      'EGG_WRAP_LEFT',
      'EGG_WRAP_RIGHT',
      'EGG_VALUE_LADDER',
      'REMOUNT_MAX_VELX',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as EggModule
  } catch (e) {
    throw new Error(
      'egg core not built yet — GREEN (Julia) creates joust/src/core/egg.ts to ' +
        'satisfy tests/helpers/egg-contract.ts: spawnEgg (carry victim velocities, ' +
        'reset bumps, DEC eggsLeft), bounce (velX decays 2/bounce, velY → −(velY>>2)), ' +
        'eggSettles (velY ≥ -$20 AND velX === 0), the NARROW [4,288] wrapEggX, the ' +
        'capped 250/500/750/1000 value ladder + the +500 PFEET air catch (score ' +
        'events only), willHatch (eggsLeft > 0; 4th egg permadeath), remountEntryEdge ' +
        '(the FARTHER edge at max FLYX speed 8 — the ROM-corrected direction), and ' +
        'remountBudgetDebit (MOUNRI INC NSMART, like a LINET promotion). ' +
        `(${(e as Error).message})`,
    )
  }
}
