// src/core/modsnd.ts
//
// Story mc8-2 (GREEN, Julia) — the pure port of W3SOUN's MODSND envelope stepper
// (W3SOUN:273-353), the routine the cabinet calls once per frame to advance every
// active sound and write POKEY. Here it is a DETERMINISTIC, side-effect-free
// EXPANSION: a lifted `Sound` (src/core/sound-tables.ts) → the exact list of POKEY
// register writes, each tagged with the FRAME it lands on. The shell
// (src/shell/audio.ts) converts frame → seconds at the sim rate and schedules the
// writes into the live POKEY worklet. Belongs in core (pure, deterministic) behind
// the sim/shell boundary; carries no browser surface, clock, or entropy.
//
// EXPANSION RULE (W3SOUN:65-69, 81-83). A record [STVAL, FRCNT, CHANGE, NUMBER]
// emits NUMBER+1 values — STVAL then NUMBER successive deltas — each held FRCNT
// frames (the source's own example, EX1 `0FF,1,-1,6`, lists seven values FF…F9 for
// NUMBER=6). CHANGE is a raw ROM byte and POKEY registers are 8-bit, so the delta
// is applied mod 256 (`& 0xFF`): 0FE therefore reads as −2 without a signed decode,
// exactly as the hardware wraps it. Records within a channel run back-to-back; the
// next channel restarts at frame 0 (all channels of one sound begin together).
//
// The precise per-frame HOLD/pre-emption timing (the NUMBER vs NUMBER+1 question
// that battlezone's bz4-4 litigated) is deliberately not asserted by any mc8-2
// test — it is audible-only and tunable against the ROM by ear in mc8-3; this
// expansion is the faithful first cut, and the BYTES it steps are citation-locked.

import type { Sound } from './sound-tables.js'

// One POKEY register write: `register` (AUDF1 first, AUDC4 last), the 8-bit
// `value`, at sim `frame` (0-based, relative to the sound's start).
export interface RegisterWrite {
  readonly register: number
  readonly value: number
  readonly frame: number
}

// Expand one lifted sound into its full, frame-tagged register-write schedule.
// Pure: same `Sound` in, same writes out. The channel key's number is the POKEY
// register plus one (see sound-tables.ts), so `register = Number(key) - 1`.
export function expandSound(sound: Sound): readonly RegisterWrite[] {
  const writes: RegisterWrite[] = []
  for (const key of Object.keys(sound.channels)) {
    const register = Number(key) - 1
    let frame = 0
    for (const [stval, frcnt, change, count] of sound.channels[key]) {
      for (let i = 0; i <= count; i++) {
        writes.push({ register, value: (stval + i * change) & 0xff, frame: frame + i * frcnt })
      }
      frame += (count + 1) * frcnt
    }
  }
  return writes
}
