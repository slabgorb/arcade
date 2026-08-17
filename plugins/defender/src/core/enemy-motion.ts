// plugins/defender/src/core/enemy-motion.ts
//
// Story df4-4 (GREEN — Yoda / Dev). The pursuit seam shared by the two df4-4 enemies
// that SEEK THE PLAYER — the MUTANT (core/mutants.ts) and the BAITER (core/ufo.ts).
// Extracted here at the second consumer (lang-review #18): both banks step toward an
// injected player pose and shoot at it, so the injection types and the `approach` step
// live in one place. (landers.ts keeps its own private `approach` — that pre-dates this
// story and hunts an in-bank humanoid, not the injected player; leaving it is out of
// this story's scope.)
//
// PURE src/core (tests/purity.test.ts scans this file): no clock, no entropy minted
// here (the SEED byte is injected as `rand`), no browser surface. The player pose is
// INJECTED because world.ts derives the player position from the ship rather than
// storing it — the same reason createEnemyBank takes `rand` rather than minting it.

/** PLABX / PLAYC — the ship pose an enemy seeks, injected (world.ts stores no player). */
export interface PlayerPos {
  readonly x: number
  readonly y: number
}

/** The SHOOT sink (JSR SHOOT, DEFB6.SRC:35,897): a shot fired FROM the enemy AT a target.
 *  The projectile entity is df4-5/df5; df4-4 owns only the decision + aim. */
export type Fire = (fromX: number, fromY: number, toX: number, toY: number) => void

/** The injected seam both seek-the-player banks consume — the pure core mints none of it. */
export interface EnemyDeps {
  /** SEED byte source (0..255): the mutant's random-Y-hop sign and any seek entropy. */
  rand: () => number
  /** The player pose the enemy seeks (PLABX/PLAYC). */
  player: () => PlayerPos
  /** Called when the enemy's shot timer expires and it fires at the player. */
  fire: Fire
}

/** Move `from` toward `to` by at most `step`; snaps when within a step (no overshoot). */
export function approach(from: number, to: number, step: number): number {
  const delta = to - from
  if (Math.abs(delta) <= step) return to
  return from + Math.sign(delta) * step
}
