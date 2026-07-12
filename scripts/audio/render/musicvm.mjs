// scripts/audio/render/musicvm.mjs
// The Star Wars music bytecode VM — an INTERPRETER, not a synthesizer. It emits
// POKEY register writes into the same core the SFX use.
//
// Derived from SNDPM.MAC (".SBTTL (RUSTY'S POKEY MUSIC) DRIVER, 6809 VERSION").
// Dispatch (SNDPM.MAC:701): `TSTB; LBMI PKFUN` — opcode >= 0x80 is a function,
// < 0x80 is a note. Instructions are 2 bytes (the fetch auto-advances by 2), except
// .GOSUB (3) and .RETURN (1).
//
// TIMING: the board's 4ms IRQ services HALF the voices per tick (alternating on
// $INTCT bit0), so each voice is serviced every 8ms = 125 Hz. Default ORATE = 64
// ticks per interval, so a quarter note (4096 ticks) = 64 intervals = 512ms ~ 117 BPM.
//
// SINGLE-SLOT EVERYTHING: .LOOP/.ENDL keep ONE counter + ONE saved PC per voice, so
// loops CANNOT NEST. .GOSUB/.RETURN keep ONE return address. .CALL keeps a SEPARATE
// single slot. Two nested .CALLs (or two nested .GOSUBs) would clobber each other —
// so we model exactly one slot each and do not "helpfully" add a stack.

export const VOICE_INTERVAL_S = 0.008; // each voice serviced every 8 ms
const DEFAULT_RATE = 64;               // ORATE default (ticks consumed per interval)

const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "D4" -> 0x33 ; "BF4" -> 0x3B ; "FS5" -> 0x43 ; "R1" -> 0 (rest)
export function noteToAudf(name) {
  const m = name.match(/^([A-G])([SFN]?)(\d)/);
  if (!m || name.startsWith('R')) return 0;
  const [, letter, accidental, octave] = m;
  let semi = SEMITONE[letter];
  if (accidental === 'S') semi += 1;
  if (accidental === 'F') semi -= 1;
  return 1 + 12 * Number(octave) + semi;
}

// bit0 = tie flag (do not restart the envelope); magnitude = bits 7..1.
export function decodeDuration(byte) {
  return { ticks: (byte & 0xfe) * 64, tie: (byte & 0x01) === 1 };
}

const OP = {
  NRATE: 0x80, CRATE: 0x81, NVOL: 0x82, CVOL: 0x83,
  NKEY: 0x84, CKEY: 0x85, FENV: 0x86, AENV: 0x87,
  VC: 0x8a, SYN: 0x8c, CALL: 0x8d, LOOP: 0x8e, ENDL: 0x8f,
  GOSUB: 0x90, RETURN: 0x91,
};

const s8 = (b) => (b > 0x7f ? b - 0x100 : b);

// POKEY register indices for the AUDF/AUDC pair a voice writes.
const VOICE_REGS = { 1: [0, 1], 2: [2, 3], 3: [4, 5], 4: [6, 7] };

export function runVoice(bytes, entryOffset, tuntab, { voice = 1, maxSeconds = 30 } = {}) {
  const [audf, audc] = VOICE_REGS[voice] ?? VOICE_REGS[1];
  const events = [];

  let pc = entryOffset;
  let t = 0;
  let key = 0;                 // .NKEY/.CKEY — transpose in semitones
  let vol = 0x0a;              // .NVOL/.CVOL — median volume
  let rate = DEFAULT_RATE;     // .NRATE/.CRATE — ticks consumed per 8ms interval
  let vc = 0xa0;               // .VC — distortion bits (default: pure tone)

  // Single-slot state — exactly as the hardware has it. No stacks.
  let loopCount = 0;
  let loopPc = -1;
  let gosubRet = -1;
  let callRet = -1;

  let guard = 0;
  while (t < maxSeconds && pc >= 0 && pc + 1 < bytes.length) {
    if (++guard > 100000) break;              // never spin forever on bad data
    const op = bytes[pc];
    const arg = bytes[pc + 1];

    if (op < 0x80) {
      // --- note or rest ---
      const { ticks } = decodeDuration(arg);
      if (ticks === 0) {
        // `.BYTE 0,0` = .ENDT. Inside a .CALL it returns; at top level it ends.
        if (callRet >= 0) { pc = callRet; callRet = -1; continue; }
        break;
      }
      if (op !== 0) {
        const pitch = (op + key) & 0xff;
        events.push(audf, pitch & 0xff, Number(t.toFixed(5)));
        events.push(audc, (vc | (vol & 0x0f)) & 0xff, Number(t.toFixed(5)));
      } else {
        events.push(audc, vc & 0xf0, Number(t.toFixed(5))); // rest: volume 0
      }
      t += (ticks / rate) * VOICE_INTERVAL_S;
      pc += 2;
      continue;
    }

    switch (op) {
      case OP.NRATE: rate = arg || DEFAULT_RATE; pc += 2; break;
      case OP.CRATE: rate = Math.max(1, rate + s8(arg)); pc += 2; break;
      case OP.NVOL: vol = arg & 0x0f; pc += 2; break;
      case OP.CVOL: vol = Math.max(0, Math.min(0x0f, vol + s8(arg))); pc += 2; break;
      case OP.NKEY: key = s8(arg); pc += 2; break;
      case OP.CKEY: key += s8(arg); pc += 2; break;
      case OP.VC: vc = arg; pc += 2; break;
      case OP.FENV: case OP.AENV: case OP.SYN: pc += 2; break; // envelope select / glide
      case OP.LOOP: loopCount = arg; loopPc = pc + 2; pc += 2; break;
      case OP.ENDL:
        if (--loopCount > 0 && loopPc >= 0) pc = loopPc;
        else pc += 2;
        break;
      case OP.CALL: {
        const target = tuntab[arg];
        if (target === undefined) { pc += 2; break; }
        callRet = pc + 2;
        pc = target;
        break;
      }
      case OP.GOSUB:
        gosubRet = pc + 3;                       // .GOSUB is THREE bytes
        pc = bytes[pc + 1] | (bytes[pc + 2] << 8);
        break;
      case OP.RETURN:
        pc = gosubRet >= 0 ? gosubRet : -1;      // .RETURN is ONE byte
        gosubRet = -1;
        break;
      default: pc += 2; break;                   // 0x88/0x89/0x8B — dead in this ROM
    }
  }

  return { events, durationMs: Math.max(20, Math.round(Math.min(t, maxSeconds) * 1000)) };
}
