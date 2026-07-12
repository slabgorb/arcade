// scripts/audio/render/envelope.mjs
// The T2SOUN envelope engine — ONE engine for THREE cabinets.
//
// Tempest ALSOUN, Battlezone BZSOUN and Red Baron RBSOUN are the same driver:
// Battlezone's CSECT is still named T2SOUN, and Red Baron's title reads
// "RBSOUN-(WAS T2SOUN)". They differ ONLY in slot count (registers per sound):
// Battlezone 4, Red Baron 8, Tempest 16 (dual POKEY).
//
// Record (from the sources' own doc block):
//   STVAL  = value to start the sequence
//   FRCNT  = frames to hold before any change
//   CHANGE = amount added each step (mod 256)
//   NUMBER = total changes in this sequence
// A channel is N x 4-byte records + a 2-byte terminator: 0,0 = stop, X,0 = loop to X.
//
// NB the "6 BYTES PER SOUND NUMBER" comment in all three sources is STALE — a
// copy-paste artifact of the shared template. The record is 4 bytes.
//
// OFF-BY-ONE (traced through MODSND's 6502 loop): COUNT is loaded with the raw
// NUMBER byte when a record activates, which also emits STVAL as the first value.
// Each expiry does DEC COUNT; BNE apply — so a change lands only while the
// post-decrement is non-zero, i.e. NUMBER-1 times. The ROM therefore emits NUMBER
// distinct values: STVAL + (NUMBER-1) changes.
// Red Baron TK2 (A4,7,FF,4) -> A4,A3,A2,A1. It NEVER reaches A0.

// maskHighNibble: Tempest's ALSOUN (6502 update_sounds) masks the AUDC high nibble
// when ramping — `Ld0 = (Ld0 & 0x0f) | (old & 0xf0)` — so a ramp changes the VOLUME
// and preserves the DISTORTION bits. Red Baron's MODSND does a plain CLC/ADC with no
// mask. This is a real behavioural difference between the ALSOUN and T2SOUN variants,
// not a knob: getting it wrong corrupts every Tempest volume ramp.
export function expandEnvelope(bytes, offset, { reg, tickHz, maxSeconds = 2, maskHighNibble = false }) {
  const events = [];
  const dt = 1 / tickHz;
  const maxTicks = Math.floor(maxSeconds * tickHz);
  let pos = offset;
  let t = 0;
  let ticks = 0;
  const seen = new Set(); // loop-back guard

  while (ticks < maxTicks) {
    if (pos + 1 >= bytes.length) break;
    const stval = bytes[pos];
    const frcnt = bytes[pos + 1];

    if (frcnt === 0) {                    // terminator
      if (stval === 0) break;             // 0,0 = stop
      if (seen.has(stval)) break;         // X,0 = loop — but never spin forever
      seen.add(stval);
      pos = stval;                        // loop back to offset X
      continue;
    }

    if (pos + 3 >= bytes.length) break;
    const change = bytes[pos + 2];
    const number = bytes[pos + 3];

    let val = stval;
    // NUMBER distinct values: STVAL, then NUMBER-1 changes.
    for (let i = 0; i < Math.max(1, number); i++) {
      if (ticks >= maxTicks) break;
      events.push(reg, val & 0xff, Number(t.toFixed(5)));
      const next = (val + change) & 0xff;
      val = maskHighNibble ? ((next & 0x0f) | (val & 0xf0)) : next;
      t += frcnt * dt;
      ticks += frcnt;
    }
    pos += 4;
  }

  return { events, durationMs: Math.max(20, Math.round((Math.min(t, maxSeconds) + 0.02) * 1000)) };
}
