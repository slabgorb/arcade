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

  sfx() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      const f = expandEnvelope(bytes, fOff, { reg: 0, tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(bytes, aOff, { reg: 1, tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: MODULE_BASE + fOff,
        provenance: `BZSOUN.MAC ${s.audf}/${s.audc} (bit 0x${s.bit.toString(16)}) — tick ${this.tickNote}`,
      });
    }
    return out;
  },
};
