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
// A channel is N x 4-byte records + a 2-byte terminator.
//
// NB the "6 BYTES PER SOUND NUMBER" comment in all three sources is STALE — a
// copy-paste artifact of the shared template. The record is 4 bytes.
//
// TERMINAL ZERO WRITE (traced through MODSND's shared epilogue): on a 0,0
// terminator, MODSND loads the terminator's STVAL (=0) into CURRENT, kills the
// RAM pointer, and falls into the epilogue that writes CURRENT to the POKEY
// hardware register. So a 0,0 stop is not silent — it is a genuine final
// register write of 0, THEN the channel goes idle. Both drivers do this.
//
// X,0 TERMINATOR — the two drivers disagree on what it means (xTerminator):
//   'loop' (Tempest ALSOUN):     "TO LOOP BACK, PUT IN X,0, WHERE X=<OFFSET
//                                 FROM SOUND: OF RESTART LOC>/2" — jump back to
//                                 byte offset X and keep playing (no write at
//                                 the jump itself; the resumed record emits as
//                                 normal). The `seen` Set guards against a
//                                 target that never advances `ticks`.
//   'idle' (Red Baron RBSOUN / Battlezone BZSOUN, i.e. shared T2SOUN): "TO STOP
//                                 A CHANNEL & RETURN TO ITS IDLE STATE, PUT IN
//                                 AS A 2 BYTE SEQUENCE X,0 WHERE X WILL BE USED
//                                 AS THE NEW IDLE VALUE." — one register write
//                                 of X, then stop. No loop-back.
// Default is 'idle' (the shared T2SOUN base driver, used by 2 of the 3
// cabinets); Tempest's ALSOUN is the variant and opts in to 'loop' explicitly
// in scripts/audio/games/tempest.mjs, the same way it opts in to
// maskHighNibble for its AUDC ramps below.
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
export function expandEnvelope(bytes, offset, {
  reg, tickHz, maxSeconds = 2, maskHighNibble = false, xTerminator = 'idle',
}) {
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
      if (stval === 0) {                  // 0,0 = stop — MODSND epilogue writes CURRENT=0
        events.push(reg, 0, Number(t.toFixed(5)));
        break;
      }
      if (xTerminator === 'idle') {       // X,0 = write X as the new idle value, then stop
        events.push(reg, stval & 0xff, Number(t.toFixed(5)));
        break;
      }
      // xTerminator === 'loop' (Tempest ALSOUN): X,0 = jump back to offset X.
      if (seen.has(stval)) break;         // never spin forever
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
