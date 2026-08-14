// src/core/shot.ts
//
// Story ml6-2 (grown runtime) — SHOOT1, the player shot vs the PLAYFIELD
// (MILLI.MAC:1988-2063). stepGame already resolves a shot against the millipede
// segments and the enemy roster; this is the missing third target — the field
// itself: mushrooms and DDT bombs. Pure src/core (the ml1-1 purity sweep scans
// it): it mutates the `field` and the DDT `table` in place exactly as the ROM
// mutates the playfield RAM and the DDTADD bank, and returns a structured
// outcome the orchestrator turns into a score delta + one audio event.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC / MLSUB.MAC are `.RADIX 16`: every literal below is hex.
//
// ─── THE CELL LOOKUP (MILLI.MAC:1988-1997) ───────────────────────────────────
// SHOOT1 seeds OBSTAC with TEMP1 = SHOTH, A = SHOTV + 2 (upright: :1990-1994
// "LDA I,2 / ... / CLC / ADC SHOTV") and Y = 0 (":1996 GIVE NO DIRECTION"). The
// zero direction drops OBSTAC's 8*D term, so H' = SHOTH; the col8*4 + V/8 math
// is the one ml3-6 pinned (mushroom.ts `obstacOffset`, obstac.test.ts).

import { obstacOffset, ROCK } from './mushroom'
import { ddtShoot, CLOUD_STAMP, DDT_STAMP, type DdtTable } from './ddt'

/** The upright SHOTV bias before the cell lookup (MILLI.MAC:1990-1994 "LDA I,2"). */
const SHOT_V_BIAS = 2

/** The outcome of resolving one climbing shot against the playfield.
 *  `pass` — the shot keeps climbing (empty cell, a DDT cloud, or a bomb stamp
 *  with no live bank entry). Everything else STOPS the shot. */
export type ShotOutcome =
  | { kind: 'pass'; points: 0 }
  | { kind: 'stop'; points: 0 } // a letter or ROCK — hit, but nothing scored
  | { kind: 'mushroom'; points: number; destroyed: boolean }
  | { kind: 'ddt'; points: number }

// The stamp-1 boundaries that mark "END OF MUSHROOM" — a chip that lands here
// destroys the stamp (MILLI.MAC:2018-2027): 0x7B (was NORMAL 0x7C), 0x77 (was
// GROWTH-top 0x78), 0x74 (was a growing 0x75), 0x70 (was DEATHS 0x71).
const MUSHROOM_END: ReadonlySet<number> = new Set([0x7b, 0x77, 0x74, 0x70])

/**
 * SHOOT1: resolve a player shot at (`shotH`, `shotV`) against the playfield.
 * MUTATES `field` (chipped/destroyed mushroom, or a detonated bomb's cleared
 * cells) and `table` (a detonated bomb's DDTADD entry → exploding). The score /
 * event / shot-consumption are the caller's (core/sim.ts).
 */
export function resolveShot(table: DdtTable, field: Uint8Array, shotH: number, shotV: number): ShotOutcome {
  const offset = obstacOffset(shotH, (shotV + SHOT_V_BIAS) & 0xff, 0) // :1990-1997, Y=0
  const stamp = field[offset] & 0x7f // OBSTAC tail "AND I,7F"

  if (stamp === 0) return { kind: 'pass', points: 0 } // :1998 BEQ 11$ — no obstacle
  if (stamp < CLOUD_STAMP) return { kind: 'stop', points: 0 } // :1999-2000 BCC 108$ — a letter
  if (stamp < DDT_STAMP) return { kind: 'pass', points: 0 } // :2002-2003 BCC 11$ — a DDT cloud

  if (stamp === DDT_STAMP || stamp === DDT_STAMP + 1) {
    // :2004-2006 — a DDT bomb (base or its +1 window). ddtShoot owns the base
    // normalization (DDT+1 → -0x20), the bank search, the cell clear and the
    // exploding-anchor rewrite (MILLI.MAC 16$/18$/20$/25$/40$).
    const hit = ddtShoot(table, field, offset, stamp)
    if (hit.kind === 'exploded') return { kind: 'ddt', points: hit.points } // 40$ +80
    return { kind: 'pass', points: 0 } // :2057 BPL 11$ — no entry: the bomb is mid-explosion
  }

  if (stamp === ROCK) return { kind: 'stop', points: 0 } // :2008-2009 BCC 108$ — indestructible

  // :2010-2028 — a mushroom stage (0x71..0x7F). Chip it one stage (SBC I,1); a
  // chip that lands on an END boundary destroys it for one point.
  const chipped = stamp - 1
  const destroyed = MUSHROOM_END.has(chipped)
  const newStamp = destroyed ? 0 : chipped // :2020-2024 106$ leaves zero, else 107$ keeps stamp-1
  field[offset] = (field[offset] & 0x80) | newStamp // :2029-2033 keep the grey background bit
  // MUSHDC (the mushroom count decrement, :2035) is deferred with the rest of
  // the MushCounts threading — TODO(ml7-2 fidelity): pass counts through here.
  return { kind: 'mushroom', points: destroyed ? 1 : 0, destroyed }
}
