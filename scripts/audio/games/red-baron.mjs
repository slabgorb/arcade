// scripts/audio/games/red-baron.mjs
// Red Baron — RBSOUN.MAC (".TITLE RBSOUN-(WAS T2SOUN)" — the same driver again).
// RBARON.MAP: `RBSOUN 71C4 0104` -> $71C4, 260 bytes, in chip 036996.01 ($7000).
// .IRPC X,<12345678> -> 8 slots = all 4 POKEY channels.
//
// rb4-10 (585943b, 2026-07-18) re-sourced TP/BN/WP/TH byte-exact from RBSOUN.MAC —
// they had previously been "SYNTHESISED to shape" (rb2-11) with three of the four
// INVERTED (holding the register the ROM sweeps and sweeping the register the ROM
// holds). All five tones (TK/TP/BN/WP/TH) now agree with the ROM's sweep/hold
// shape; see scripts/audio/compare/shipped.mjs's compareRedBaronShipped.
//
// xTerminator: RBSOUN's own doc block (the shared T2SOUN base driver) reads "TO
// STOP A CHANNEL & RETURN TO ITS IDLE STATE, PUT IN AS A 2 BYTE SEQUENCE X,0 WHERE
// X WILL BE USED AS THE NEW IDLE VALUE" — that is expandEnvelope's 'idle' mode,
// which is also its default, so it is not passed explicitly below.
import { readFileSync } from 'node:fs';
import { sourceDir } from '../../sources.mjs';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0x71c4;  // RBARON.MAP: RBSOUN
// RBSOUN.MAC:17 "THE SECOND MUST BE CALLED ONCE EVERY 4 MSEC." -> 250 Hz.
const TICK_HZ = 250;         // 4 ms envelope step

// LINK 3 needs the table's real ROM address, and — same trap as Battlezone's
// T2SOUN sibling (see battlezone.mjs's DATA_BASE comment for the full
// derivation) — it is NOT `MODULE_BASE + a parseMac label offset`:
//
//   1. PNTRS is 5 sounds x `OFFSET <name>` (RBSOUN.MAC:126-130), each
//      expanding via `.IRPC X,<12345678>` to 8 real `.BYTE` instructions =
//      0x28 bytes. That macro expansion is invisible to our line-based
//      parseMac, which only counts literal `.BYTE`/`.WORD` tokens actually
//      WRITTEN in the source (a macro CALL site contributes 0).
//   2. The `.MACRO OFFSET,LABEL` DEFINITION (RBSOUN.MAC:96-104) itself
//      contains a literal fallback `.BYTE 0` (RBSOUN.MAC:101) in its body.
//      parseMac sees that line once as real data — a phantom byte baked into
//      every label offset it reports here (confirmed: parseMac reports
//      SOUND: at offset 1, not the real 0).
//
// (RBSOUN's IDLEV, unlike BZSOUN's, is a plain `IDLEV=0` EQU — no `.BYTE`, no
// bytes emitted.) SOUND: .BYTE 0 (RBSOUN.MAC:143) is the only literal byte
// before the table. Real table start = MODULE_BASE + PNTRS(0x28) + SOUND(1
// byte) = $71ED -- confirmed EXACT byte-for-byte against 036996.01 (108
// bytes, TK1..TP2 inclusive). Do NOT rederive this as MODULE_BASE + a
// parseMac label offset; re-verify against the ROM image if RBSOUN.MAC ever
// changes shape.
const DATA_BASE = 0x71ed;

// The register-slot pair each sound occupies (slot -> POKEY register index).
const SOUNDS = [
  { audf: 'TK1', audc: 'TK2', name: 'point_tick', regs: [0, 1] },        // ch1
  { audf: 'BN1', audc: 'BN2', name: 'bonus_life', regs: [0, 1] },        // ch1
  { audf: 'WP5', audc: 'WP6', name: 'new_plane', regs: [4, 5] },         // ch3
  { audf: 'TH3', audc: 'TH4', name: 'three_hundred', regs: [2, 3] },     // ch2
  { audf: 'TP1', audc: 'TP2', name: 'ten_point_tick', regs: [0, 1] },    // ch1
];

export default {
  name: 'red-baron',
  dirbase: 'red-baron',
  sourceFile: 'RBSOUN.MAC',
  mapFile: 'RBARON.MAP',
  romFile: '036996.01',
  romBase: 0x7000,
  moduleBase: MODULE_BASE,
  tickHz: TICK_HZ,
  // The analog board (gun, explosion, engine hum, approach whine) is genuinely
  // discrete circuitry — no POKEY table exists for it. Say so; do not invent one.
  noRomAudio: [
    { name: 'gun', reason: 'discrete analog board, not POKEY' },
    { name: 'explosion', reason: 'discrete analog board, not POKEY' },
    { name: 'engine_hum', reason: 'discrete analog board, not POKEY' },
    { name: 'approach_whine', reason: 'discrete analog board, not POKEY' },
  ],

  // LINK 3 verifies the WHOLE CONTIGUOUS TABLE against the ROM in one
  // comparison — see the DATA_BASE derivation above for why this can't just
  // be "MODULE_BASE + a parseMac label offset."
  table() {
    const text = readFileSync(join(sourceDir(this.dirbase), this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = Math.min(...SOUNDS.map((s) => labels.get(s.audf)).filter((v) => v !== undefined));
    return { bytes: bytes.slice(start), romAddr: DATA_BASE, labels, all: bytes, start };
  },

  sfx() {
    const { all, labels, start } = this.table();
    const out = [];
    // A label that vanished from the source must not silently drop the sound
    // from the report — that reads as "not looked at yet", not "known
    // broken". Name it; audit() turns this into an UNVERIFIED row.
    const missing = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) {
        const bad = [fOff === undefined && s.audf, aOff === undefined && s.audc].filter(Boolean);
        missing.push({ name: s.name, reason: `label(s) ${bad.join(', ')} not found in ${this.sourceFile} — cannot locate this sound` });
        continue;
      }
      const f = expandEnvelope(all, fOff, { reg: s.regs[0], tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(all, aOff, { reg: s.regs[1], tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        // The ROM's own structural classification for link 5 (COMPARE): does
        // this register's record actually change value (CHANGE != 0), or is
        // it held flat (CHANGE == 0, including the degenerate 2-byte "X,0"
        // idle terminator, which is a single flat write)? Exposed here so the
        // driver's comparator (scripts/audio/compare/shipped.mjs) can diff it
        // against the shipped port WITHOUT re-deriving it from `events` — the
        // envelope's universal terminal-zero write (see envelope.mjs) would
        // otherwise pollute a naive "distinct value" count on a genuinely flat
        // register.
        tone: s.audf.replace(/\d+$/, ''),
        audfSweeps: recordSweeps(all, fOff),
        audcSweeps: recordSweeps(all, aOff),
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: DATA_BASE + fOff - start,
        provenance: `RBSOUN.MAC ${s.audf}/${s.audc} @ $${(DATA_BASE + fOff - start).toString(16)}`,
      });
    }
    out.missing = missing;
    return out;
  },
};

// STVAL,FRCNT[,CHANGE,NUMBER] at `offset` in `bytes` (see the record format in
// envelope.mjs's header comment). FRCNT==0 is the degenerate 2-byte "X,0" idle
// terminator — a single flat write, never a sweep. Otherwise the record is a
// real 4-byte envelope and CHANGE (byte offset+2) says whether it ramps.
function recordSweeps(bytes, offset) {
  const frcnt = bytes[offset + 1];
  if (frcnt === 0) return false;
  return (bytes[offset + 2] & 0xff) !== 0;
}
