// tests/helpers/target-contract.ts
//
// Story jt8-1 — RED phase (Leeloo / TEA). The API contract for the enemy AGGRO
// subsystem — the `SELPLY`/`TARPLY`/`TARTM` targeting the smart brains read
// (JOUSTRV4.SRC:4462-4520). This is the `loadEnemy`/`loadFlight` pattern: TEA
// declares the not-yet-built module's public shape here; the behaviour suite
// (tests/target.test.ts) drives it; Dev (Korben, GREEN) creates
// joust/src/core/target.ts to satisfy it.
//
// WHY A SEPARATE MODULE: the aggro state is a per-run global (which player each
// enemy hunts, and the spawn-grace timer that protects a freshly-materialised
// knight). It rides the sim exactly like `IntelBudget` and `BaiterClock` already
// do — a carried field advanced once per frame — so it belongs in its own pure
// core, not smeared across frame.ts. See the design spec
// (joust/docs/superpowers/specs/2026-07-28-joust-playability-design.md).

/** What a smart brain sees of its quarry (structurally identical to the enemy.ts
 * PlayerView, so `selectTarget`'s result feeds `stepEnemy` directly). */
export interface PlayerView {
  /** The targeted player's whole-pixel Y (`PPOSY+1,X`). */
  readonly pixelY: number
  /**
   * jt8-2 — the targeted player's FLYX velocity index (`PVELX,X`,
   * RAMDEF.SRC:190). The horizontal-homing throttle (`BOLEVB`,
   * JOUSTRV4.SRC:3939-3940) compares the enemy's OWN index against this one, so
   * `selectTarget` must carry it through or the homing can never fire.
   */
  readonly velXIndex: number
}

/**
 * The global aggro state (RAMDEF.SRC:289-290,328-330). Two target slots, each a
 * player id (or null for empty), and each with a grace timer counting down to the
 * moment that player becomes targetable:
 *   TARPLY / TARPL2 — "TARGETED PLAYERS WORKSPACE" (RAMDEF:289-290).
 *   TARTM1 / TARTM2 — "CURRENT TIME LEFT (FOR TARPLY/TARPL2) UNTIL FINDING PLAYER"
 *                     (RAMDEF:329-330). A player is targetable iff its timer is 0.
 */
export interface TargetState {
  /** TARPLY — the primary targeted player id, or null when the slot is empty. */
  readonly tarply: number | null
  /** TARPL2 — the secondary targeted player id, or null when empty. */
  readonly tarpl2: number | null
  /** TARTM1 — grace frames left before the TARPLY player is targetable (>= 0). */
  readonly tartm1: number
  /** TARTM2 — grace frames left before the TARPL2 player is targetable (>= 0). */
  readonly tartm2: number
}

/** A live player as a selection candidate: id + whole-pixel position (+ jt8-2's
 * FLYX index, which `selectTarget` copies into the returned `PlayerView`). */
export interface TargetPlayer {
  readonly id: number
  readonly posX: number
  readonly pixelY: number
  /** jt8-2 — `PVELX,X`, the player's FLYX velocity index (RAMDEF.SRC:190). */
  readonly velXIndex: number
}

/** The enemy asking "who do I hunt?" — its whole-pixel position (for the
 * nearest-of-two tiebreak, `SELPLY` :4476-4514). */
export interface TargetSeeker {
  readonly posX: number
  readonly pixelY: number
}

export interface TargetModule {
  /**
   * A fresh aggro state with both slots empty and both timers 0 — the wave/game
   * reset (`STD TARPLY / STD TARPL2`, JOUSTRV4.SRC:969-970). Pure.
   */
  seedTargets(): TargetState

  /**
   * Register a player into the first EMPTY slot with its grace timer set to
   * `grace` (`STPLY1/2`: TARPLY first, else TARPL2; `LDA TARTIM / STA TARTMn`,
   * JOUSTRV4.SRC:4655-4665). A player registered with grace > 0 is NOT yet
   * targetable. Pure — the argument is never mutated.
   */
  registerPlayer(state: TargetState, playerId: number, grace: number): TargetState

  /**
   * Decrement both grace timers one frame, floored at 0 (`LDA TARTMn / BEQ / DEC
   * TARTMn`, JOUSTRV4.SRC:4857-4862 — the BEQ guards the floor). Pure.
   */
  tickTargetTimers(state: TargetState): TargetState

  /**
   * Remove a player from the target slots on its death: if it is the primary,
   * shift the secondary up (`TARPL2 -> TARPLY`, `TARTM2 -> TARTM1`) and clear the
   * secondary; if it is the secondary, clear the secondary (`CMPU TARPLY ... LDD
   * TARPL2 / STD TARPLY / STA TARTM1 / STD TARPL2`, JOUSTRV4.SRC:4746-4753). Pure.
   */
  removeTarget(state: TargetState, playerId: number): TargetState

  /**
   * `SELPLY` (JOUSTRV4.SRC:4462-4520): the PlayerView of the player this enemy
   * hunts, or null when nobody is targetable. A player is targetable only once its
   * grace timer is 0; when BOTH are targetable, the nearer to `seeker` by the ROM
   * "FIND CLOSEST CO-ORDINANT" metric (:4476-4514) is chosen. Pure.
   */
  selectTarget(
    state: TargetState,
    seeker: TargetSeeker,
    players: readonly TargetPlayer[],
  ): PlayerView | null
}

/**
 * Load the not-yet-built aggro core with a self-describing failure — the
 * `loadEnemy` pattern. The specifier is assembled at runtime so the bundler
 * cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/target.ts` does not exist, so this throws "target core not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace.
 */
export async function loadTarget(): Promise<TargetModule> {
  const specifier = ['..', '..', 'src', 'core', 'target.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<TargetModule>
    for (const fn of [
      'seedTargets',
      'registerPlayer',
      'tickTargetTimers',
      'removeTarget',
      'selectTarget',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as TargetModule
  } catch (e) {
    throw new Error(
      'target core not built yet — GREEN (Korben) creates joust/src/core/target.ts to ' +
        'satisfy tests/helpers/target-contract.ts: the SELPLY/TARPLY/TARTM aggro ' +
        'subsystem (seedTargets/registerPlayer/tickTargetTimers/removeTarget/selectTarget), ' +
        'carried on the sim like IntelBudget/BaiterClock and passed into stepEnemy from ' +
        'frame.ts. ' +
        `(${(e as Error).message})`,
    )
  }
}
