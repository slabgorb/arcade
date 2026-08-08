// plugins/missile-command/tests/modsnd.test.ts
//
// Story mc8-2 — review hardening (Thought Police). The RED suite left the pure
// MODSND stepper (src/core/modsnd.ts) unexercised: a mutation battery showed
// `Number(key) - 1` → `Number(key)` and dropping the `& 0xFF` wrap BOTH survived
// the whole suite. Those two are UNAMBIGUOUS (unlike the NUMBER-vs-NUMBER+1 frame
// count TEA deliberately left open), so they get pinned here — with SYNTHETIC
// inputs (project memory: a derived value needs a fabricated input, never the real
// tables), so this asserts the MECHANISM, not the ROM data the citation gate owns.

import { describe, it, expect } from 'vitest'
import { expandSound } from '../src/core/modsnd.js'
import type { Sound } from '../src/core/sound-tables.js'

describe('expandSound — the pure MODSND envelope stepper (synthetic inputs)', () => {
  it('maps a channel key to POKEY register key-1 (AUDF1 is 0, AUDF3 is 4)', () => {
    // Channel '5' is AUDF3 → register 4. A synthetic one-step sequence isolates it.
    const sound: Sound = { channels: { '5': [[0x60, 0x01, 0x00, 0x00]] } }
    const writes = expandSound(sound)
    expect(writes.length).toBeGreaterThan(0)
    expect(new Set(writes.map((w) => w.register))).toEqual(new Set([4]))
  })

  it('two channels land on their own registers (key-1 each), never a shared one', () => {
    const sound: Sound = { channels: { '1': [[0x10, 0x01, 0x00, 0x00]], '2': [[0x20, 0x01, 0x00, 0x00]] } }
    const regs = new Set(expandSound(sound).map((w) => w.register))
    expect(regs).toEqual(new Set([0, 1])) // '1'→AUDF1(0), '2'→AUDC1(1) — a `Number(key)` bug would give {1,2}
  })

  it('applies CHANGE as a raw byte wrapped mod 256, so 0xFE reads as −2', () => {
    // start 0x60, one change of 0xFE. The stepped value must be 0x5E (0x60-2),
    // which only holds if the delta wraps `& 0xFF` — dropping the wrap yields 0x15E.
    const sound: Sound = { channels: { '1': [[0x60, 0x01, 0xfe, 0x01]] } }
    const values = expandSound(sound).map((w) => w.value)
    expect(values[0]).toBe(0x60) // STVAL first
    expect(values).toContain(0x5e) // 0x60 + 0xFE = 0x15E & 0xFF = 0x5E
    expect(values.every((v) => v >= 0x00 && v <= 0xff)).toBe(true) // never escapes a byte
  })

  it('spaces successive writes FRCNT frames apart (the one unambiguous timing fact)', () => {
    // FRCNT=4, two values (STVAL + one change): the second write is 4 frames after
    // the first. (NUMBER-vs-NUMBER+1 length is intentionally NOT asserted here.)
    const sound: Sound = { channels: { '1': [[0x10, 0x04, 0x01, 0x01]] } }
    const frames = expandSound(sound).map((w) => w.frame)
    expect(frames[0]).toBe(0)
    expect(frames[1]).toBe(4)
  })
})
