// scripts/audio/games/red-baron.mjs
// Red Baron — RBSOUN.MAC (".TITLE RBSOUN-(WAS T2SOUN)" — the same driver again).
// RBARON.MAP: `RBSOUN 71C4 0104` -> $71C4, 260 bytes, in chip 036996.01 ($7000).
// .IRPC X,<12345678> -> 8 slots = all 4 POKEY channels.
//
// red-baron/src/shell/pokey.ts claims TP/BN/WP/TH were "SYNTHESISED" because "the
// raw RBSOUN.MAC is not in this checkout". The file exists and has real data for
// all four — and three of them are INVERTED in the port (it holds the register the
// ROM sweeps and sweeps the register the ROM holds). Only TK is ROM-exact.
//
// xTerminator: RBSOUN's own doc block (the shared T2SOUN base driver) reads "TO
// STOP A CHANNEL & RETURN TO ITS IDLE STATE, PUT IN AS A 2 BYTE SEQUENCE X,0 WHERE
// X WILL BE USED AS THE NEW IDLE VALUE" — that is expandEnvelope's 'idle' mode,
// which is also its default, so it is not passed explicitly below.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0x71c4;  // RBARON.MAP: RBSOUN
// RBSOUN.MAC:17 "THE SECOND MUST BE CALLED ONCE EVERY 4 MSEC." -> 250 Hz.
const TICK_HZ = 250;         // 4 ms envelope step

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

  sfx() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      const f = expandEnvelope(bytes, fOff, { reg: s.regs[0], tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(bytes, aOff, { reg: s.regs[1], tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: MODULE_BASE + fOff,
        provenance: `RBSOUN.MAC ${s.audf}/${s.audc}`,
      });
    }
    return out;
  },
};
