// tests/core/level-mirror-fields-dropped.test.ts
//
// Story pm5-2 (RED, TEA / Han Solo) — DROP the four dead `Level` mirror fields.
//
// `frightenedSeconds`/`frightenedFlashes`/`elroy1`/`elroy2` sit on the `Level`
// type (level.ts:49-60) and are populated at `buildLevel` (:145-149), but the
// running game reads NONE of them: they are pure mirrors of a single source in
// `mode.ts` (`frightenedFramesForLevel`/`FRIGHT_FLASHES` and `elroyThresholds`).
//
// ROM RULING (see context-story-pm5-2.md): the real Pac-Man machine DISPLAYS
// none of these four values, so the story's "wire a consumer (attract/HUD
// readout)" branch would invent cabinet behaviour that never existed. Fidelity
// forecloses it; the only ROM-faithful resolution is to DROP the fields. These
// tests encode the deletion, not a readout.
//
// WHY RUNTIME, not a source-text scan: level.ts's own comments name all four
// fields (e.g. the doc block at :105), so a grep of the source would still match
// them after the code is gone. This suite asserts the OBSERVABLE shape of the
// object `buildLevel` produces (via the public `levelRow`), which flips exactly
// on the behaviour change and cannot be defeated by a comment.
//
// SCOPE FENCE — `elroy1SpeedPct`/`elroy2SpeedPct` (level.ts:39,42) are a DIFFERENT
// pair, genuinely consumed for Blinky's Cruise-Elroy speed at game.ts:709,711.
// They STAY. The last `describe` guards them against an over-eager deletion.
//
// AC-1 (type removal) needs no bespoke compile assertion: `LEVELS: readonly
// Level[]` (level.ts:157) pins `buildLevel`'s literal to `Level`, so dropping a
// key from the literal while it remains required on the type is a missing-property
// error under `tsc --noEmit` (the repo lint, AC-5) — and re-adding it to the
// literal reddens the runtime suite below. Type and population are coupled.

import { describe, it, expect } from 'vitest'
import { levelRow } from '../../src/core/level'

/** The four mirror columns pm5-2 removes. */
const DROPPED_FIELDS = ['frightenedSeconds', 'frightenedFlashes', 'elroy1', 'elroy2'] as const

/** Representative levels spanning every speed-table group (1, 2-4, 5-20, 21). */
const SAMPLE_LEVELS = [1, 2, 5, 21] as const

describe('pm5-2 — the four dead Level mirror fields are dropped (AC-1, AC-2)', () => {
  // RED today: `buildLevel` still sets all four keys (level.ts:145-149), so each
  // `hasOwn` is `true` and these expectations fail. GREEN once Dev stops populating
  // them and removes them from the `Level` type.
  it.each(SAMPLE_LEVELS)('levelRow(%i) carries none of the mirror fields', (level) => {
    const row = levelRow(level) as Record<string, unknown>
    for (const field of DROPPED_FIELDS) {
      // ES2020 lib — no `Object.hasOwn`; `hasOwnProperty.call` is equivalent here.
      expect(
        Object.prototype.hasOwnProperty.call(row, field),
        `levelRow(${level}) must not carry the dead mirror field '${field}'`,
      ).toBe(false)
    }
  })
})

describe('pm5-2 — the consumed Cruise-Elroy speed columns survive (AC-4 regression)', () => {
  // Passes today AND after the drop — a guard against deleting the WRONG elroy
  // pair. `elroy1SpeedPct`/`elroy2SpeedPct` are read at game.ts:711/709; if they
  // vanish, Blinky's Elroy speed-up silently dies.
  it.each(SAMPLE_LEVELS)('levelRow(%i) keeps elroy1SpeedPct / elroy2SpeedPct', (level) => {
    const row = levelRow(level)
    expect(typeof row.elroy1SpeedPct, 'elroy1SpeedPct is consumed at game.ts:711').toBe('number')
    expect(typeof row.elroy2SpeedPct, 'elroy2SpeedPct is consumed at game.ts:709').toBe('number')
  })
})
