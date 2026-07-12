// scripts/audio/games/battlezone.mjs
// Battlezone — BZSOUN.MAC. Its CSECT is literally `.CSECT T2SOUN`: the SAME driver
// as Tempest's ALSOUN and Red Baron's RBSOUN (whose title even says "WAS T2SOUN").
//
// battlezone/src/shell/audio.ts asserts "there is no ROM register data to bake".
// That is FALSE. BZONE.MAP: `T2SOUN 7864 01B5 REL,OVR BZSOUN` — 437 bytes at $7864,
// inside chip 036409.01 (base $7800 per BZONE.DOC). Eight real table-driven sounds.
//
// The table drives AUDF1/AUDC1/AUDF2/AUDC2 only (4 slots, channels 1-2). Channels
// 3-4 are poked directly by procedural code in BZONE.MAC for the enemy-tank engine
// hum — genuinely synthesized, NOT table data, and reported as NO ROM AUDIO.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0x7864;  // BZONE.MAP: T2SOUN

// LINK 3 needs the table's real ROM address, and it is NOT `MODULE_BASE + the
// offset parseMac reports for a label`. Two things make that naive sum wrong:
//
//   1. PNTRS is 8 sounds x `OFFSET <name>` macro calls, each expanding (via
//      `.IRPC X,<1234>`) to 4 real `.BYTE` instructions = 0x20 bytes -- but
//      that expansion happens at MACRO-11 assembly time. Our line-based
//      parseMac (scripts/audio/parse/mac.mjs) only matches literal `.BYTE`/
//      `.WORD` tokens actually WRITTEN in the source; a macro CALL site
//      ("OFFSET BE") contributes zero bytes to its byte count.
//   2. The `.MACRO OFFSET,LABEL` DEFINITION itself (BZSOUN.MAC:83-91) contains
//      a literal fallback line `.BYTE 0` (BZSOUN.MAC:88) inside its body. That
//      line is only ever real data when the macro is EXPANDED, but parseMac
//      sees the macro's source text once and picks up that one `.BYTE 0`
//      literally -- a phantom byte baked into every label offset it reports
//      here (confirmed: parseMac reports SOUND: at offset 3, not the real 2).
//
// AUDCV/IDLEV ARE literal `.BYTE 0` (BZSOUN.MAC:124-125, correctly counted),
// then 14 zero-offset alias labels, then SOUND: .BYTE 0 (BZSOUN.MAC:148).
// Real table start = MODULE_BASE + PNTRS(0x20) + AUDCV/IDLEV/SOUND(3 bytes)
// = $7887 -- confirmed EXACT byte-for-byte against 036409.01 (254 bytes,
// WG3..SU2 inclusive). Do NOT rederive this as MODULE_BASE + a parseMac label
// offset; re-verify against the ROM image if BZSOUN.MAC ever changes shape.
const DATA_BASE = 0x7887;

// TICK RATE IS GENUINELY AMBIGUOUS IN THE SOURCE — do not "resolve" it by ear:
//   BZSOUN.MAC:17  "THE SECOND MUST BE CALLED ONCE EVERY 16 MSEC (OR 1 FRAME)"
//   BZONE.MAC:21   ";* INTERRUPTS: NMI (4 US)"
//   BZONE.MAC:1083 NMI sync math (AND I,0F -> "64 MS") implies ~4ms per NMI,
//                  and JSR MODSND is called on EVERY NMI with no pre-divider.
// We use BZSOUN.MAC's own stated contract (16 ms) as the module's authored intent
// and CARRY THE AMBIGUITY into the verdict rather than hiding it. This is the same
// divide-by-4 cadence trap that produced the Asteroids bug.
const TICK_HZ = 62.5; // 16 ms

const SOUNDS = [
  { bit: 0x01, audf: 'BE3', audc: 'BE4', name: 'radar_beep' },
  { bit: 0x02, audf: 'WP1', audc: 'WP2', name: 'bump' },
  { bit: 0x04, audf: 'BK1', audc: 'BK2', name: 'block' },
  { bit: 0x08, audf: 'BO3', audc: 'BO4', name: 'bonus' },
  { bit: 0x10, audf: 'WG3', audc: 'WG4', name: 'warning' },
  { bit: 0x20, audf: 'DS1', audc: 'DS2', name: 'disintegration' },
  { bit: 0x40, audf: 'SA1', audc: 'SA2', name: 'saucer' },
  { bit: 0x80, audf: 'SU1', audc: 'SU2', name: 'super_bonus' },
];

export default {
  name: 'battlezone',
  dirbase: 'battlezone',
  sourceFile: 'BZSOUN.MAC',
  mapFile: 'BZONE.MAP',
  romFile: '036409.01',
  romBase: 0x7800,
  moduleBase: MODULE_BASE,
  tickHz: TICK_HZ,
  tickNote: 'AMBIGUOUS: BZSOUN.MAC contracts 16ms; BZONE.MAC NMI math implies ~4ms. Using 16ms (the module\'s own stated contract).',
  // Honest declaration: the engine hum is NOT table data.
  noRomAudio: [
    { name: 'engine_hum', reason: 'AUDF3/AUDC3/AUDF4/AUDC4 are poked directly by procedural code in BZONE.MAC (robot-tracking distance-to-volume); there is no envelope table for it.' },
  ],

  // LINK 3 verifies the WHOLE CONTIGUOUS TABLE against the ROM in one
  // comparison — see the DATA_BASE derivation above for why this can't just
  // be "MODULE_BASE + a parseMac label offset."
  table() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = Math.min(...SOUNDS.map((s) => labels.get(s.audf)).filter((v) => v !== undefined));
    return { bytes: bytes.slice(start), romAddr: DATA_BASE, labels, all: bytes, start };
  },

  sfx() {
    const { all, labels, start } = this.table();
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      const f = expandEnvelope(all, fOff, { reg: 0, tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(all, aOff, { reg: 1, tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: DATA_BASE + fOff - start,
        provenance: `BZSOUN.MAC ${s.audf}/${s.audc} (bit 0x${s.bit.toString(16)}) @ $${(DATA_BASE + fOff - start).toString(16)} — tick ${this.tickNote}`,
      });
    }
    return out;
  },
};
