// src/core/level.ts
//
// Story pm1-8 (Julia) — the per-level table `game.ts`'s round lifecycle reads
// from. Speeds are Dossier Table A.1 figures with no isolable pacman.asm
// literal (the same honest-uncited policy actor.ts/pacman.ts §Speeds and
// mode.ts §Modes already apply); the FRUIT column is the one with a real,
// byte-cited ROM literal — the FRUIT TABLE at `pacman.asm:2b23`-`2b31`
// (little-endian BCD x10, same encoding as the scoring table it immediately
// follows) and the two fruit-spawn dot-eaten thresholds at `pacman.asm:0eba`/
// `pacman.asm:0ebe`. Elroy thresholds and frightened seconds/flash count are
// NOT re-derived here — they are read straight from mode.ts's own
// `elroyThresholds`/`frightenedFramesForLevel`/`FRIGHT_FLASHES`, so there is
// exactly one implementation of each and this table can never silently drift
// from Task 7's. PURE: no DOM, no clock, no Math.random, no shell import.

import { elroyThresholds, frightenedFramesForLevel, FRIGHT_FLASHES } from './mode'

/** The eight bonus-fruit kinds, in the ROM's FRUIT TABLE order
 *  (`pacman.asm:2b23`-`2b31`, claims/level.json FRUIT-CHERRY..FRUIT-KEY). */
export type FruitType = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'melon' | 'galaxian' | 'bell' | 'key'

export interface LevelFruit {
  readonly type: FruitType
  readonly points: number
}

export interface Level {
  readonly level: number
  /** Pac-Man's normal (non-eating) speed, percent of the 1px/frame reference
   *  rate. glossary.md §Speeds; honest-uncited (Dossier Table A.1). */
  readonly pacSpeedPct: number
  /** A ghost's normal (non-frightened, non-Elroy) speed, same units.
   *  glossary.md §Level table; honest-uncited (Dossier Table A.1). */
  readonly ghostSpeedPct: number
  /** Blinky's Cruise Elroy stage-1 speed — replaces `ghostSpeedPct` for
   *  Blinky ONLY once `mode.ts`'s `elroyStage(dotsRemaining, level) >= 1`.
   *  glossary.md §Level table / §Speeds; honest-uncited (Dossier Table A.1,
   *  same status as `ghostSpeedPct` itself). */
  readonly elroy1SpeedPct: number
  /** Blinky's Cruise Elroy stage-2 (faster) speed — replaces `ghostSpeedPct`
   *  once `elroyStage(...) >= 2`. Same citation status as `elroy1SpeedPct`. */
  readonly elroy2SpeedPct: number
  /** Frightened duration in seconds — `frightenedFramesForLevel(level) / 60`,
   *  reused from mode.ts, never a second literal. */
  readonly frightenedSeconds: number
  /** End-of-frightened flash count — `mode.ts`'s `FRIGHT_FLASHES`, reused. */
  readonly frightenedFlashes: number
  /** This level's bonus fruit: kind + points. The one column with a real,
   *  byte-cited ROM literal (claims/level.json FRUIT-*). */
  readonly fruit: LevelFruit
  /** Cruise Elroy dots-remaining thresholds — reused from mode.ts's
   *  `elroyThresholds`, never a second literal. */
  readonly elroy1: number
  readonly elroy2: number
}

/** The two dots-eaten counts that trigger a bonus-fruit spawn — REAL ROM
 *  literals: `pacman.asm:0eba` (`cp #46` = 70) and `pacman.asm:0ebe`
 *  (`cp #aa` = 170), claims/level.json FRUIT-SPAWN-1/2. These are the ONLY
 *  two thresholds the routine checks (a miss on the second `ret nz`s out),
 *  so this tuple is exhaustive, not a sample. */
export const FRUIT_SPAWN_DOTS: readonly [number, number] = [70, 170]

/** Dossier Table A.1 speed progression (honest-uncited, glossary.md
 *  §Level table): level 1, levels 2-4, levels 5-20, level 21+. 21 rows total
 *  — beyond 21 the Dossier documents no further speed change before the
 *  level-256 kill screen (out of scope, epic pm1's DEFERRED list). */
interface SpeedRow {
  pac: number
  ghost: number
  /** Blinky's Cruise Elroy stage-1/stage-2 speeds — same Dossier Table A.1
   *  row as `ghost`, honest-uncited for the same reason (glossary.md
   *  §Level table). */
  elroy1: number
  elroy2: number
}

const SPEED_TABLE: readonly SpeedRow[] = [
  { pac: 80, ghost: 75, elroy1: 80, elroy2: 85 }, // level 1
  { pac: 90, ghost: 85, elroy1: 90, elroy2: 95 }, // level 2
  { pac: 90, ghost: 85, elroy1: 90, elroy2: 95 }, // level 3
  { pac: 90, ghost: 85, elroy1: 90, elroy2: 95 }, // level 4
  ...Array.from({ length: 16 }, () => ({ pac: 100, ghost: 95, elroy1: 100, elroy2: 105 })), // levels 5-20
  { pac: 90, ghost: 95, elroy1: 100, elroy2: 100 }, // level 21
]
const MAX_TABLED_LEVEL = SPEED_TABLE.length // 21

function speedRow(level: number): SpeedRow {
  const idx = Math.min(Math.max(level, 1), MAX_TABLED_LEVEL) - 1
  return SPEED_TABLE[idx]
}

/** A frightened ghost's speed — a single Dossier figure, not per-level in
 *  this table (the Dossier's frightened-speed column does vary slightly by
 *  level group too, but only the level-1 figure is test-pinned here, same
 *  scope discipline `frightenedSeconds`/`frightenedFlashes` already use).
 *  Honest-uncited, glossary.md §Speeds — was a bare `50` literal in
 *  `game.ts` before this fix, indistinguishable at a glance from the CITED
 *  `SCORE_ENERGIZER = 50`; now a named, documented constant. */
export const FRIGHTENED_GHOST_SPEED_PCT = 50

/** Fruit progression by level (Dossier ch.5 "Fruit"), byte-cited points
 *  table above: cherry(1) / strawberry(2) / orange(3-4) / apple(5-6) /
 *  melon(7-8) / galaxian(9-10) / bell(11-12) / key(13+). */
const FRUIT_PROGRESSION: readonly LevelFruit[] = [
  { type: 'cherry', points: 100 }, // pacman.asm:2b23
  { type: 'strawberry', points: 300 }, // pacman.asm:2b25
  { type: 'orange', points: 500 }, // pacman.asm:2b27
  { type: 'orange', points: 500 },
  { type: 'apple', points: 700 }, // pacman.asm:2b29
  { type: 'apple', points: 700 },
  { type: 'melon', points: 1000 }, // pacman.asm:2b2b
  { type: 'melon', points: 1000 },
  { type: 'galaxian', points: 2000 }, // pacman.asm:2b2d
  { type: 'galaxian', points: 2000 },
  { type: 'bell', points: 3000 }, // pacman.asm:2b2f
  { type: 'bell', points: 3000 },
]
const KEY_FRUIT: LevelFruit = { type: 'key', points: 5000 } // pacman.asm:2b31

function fruitForLevel(level: number): LevelFruit {
  const idx = level - 1
  return idx < FRUIT_PROGRESSION.length ? FRUIT_PROGRESSION[idx] : KEY_FRUIT
}

function buildLevel(level: number): Level {
  const speed = speedRow(level)
  const { elroy1, elroy2 } = elroyThresholds(level)
  return {
    level,
    pacSpeedPct: speed.pac,
    ghostSpeedPct: speed.ghost,
    elroy1SpeedPct: speed.elroy1,
    elroy2SpeedPct: speed.elroy2,
    frightenedSeconds: frightenedFramesForLevel(level) / 60,
    frightenedFlashes: FRIGHT_FLASHES,
    fruit: fruitForLevel(level),
    elroy1,
    elroy2,
  }
}

/** The level table, 1-based rows 1..21 (`LEVELS[0]` is level 1). Beyond row
 *  21 callers use `levelRow`, which clamps to the last tabled row — the
 *  Dossier documents no further speed change before the (out-of-scope)
 *  level-256 kill screen. */
export const LEVELS: readonly Level[] = Array.from({ length: MAX_TABLED_LEVEL }, (_, i) => buildLevel(i + 1))

/** `LEVELS` row for `level` (1-based), clamped to the last tabled row for any
 *  level beyond the table (never throws, never returns undefined). */
export function levelRow(level: number): Level {
  const idx = Math.min(Math.max(level, 1), LEVELS.length) - 1
  return LEVELS[idx]
}
