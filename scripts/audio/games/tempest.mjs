// scripts/audio/games/tempest.mjs
// Tempest — ALSOUN.MAC, Atari's GENERIC sound library, dual POKEY (16 slots).
//
// The chain, every number checked against a symbol the 1981 linker emitted:
//   ALEXEC.MAP: `CB01 02DD REL,CON ALSOUN`  -> module base $CB01
//   PNTRS (13 sounds x 16 bytes = 0xD0)     -> data starts at $CBD1
//   T51F..PO6A = 222 bytes                  -> ends at $CCAE
//   ALEXEC.MAP: CHKSM9 = $CCAF              -> the arithmetic closes exactly
//
// WARNING: the source COMMENTS ARE LIES. ALSOUN is Atari's generic library, so
// EX2 is commented "ENEMY EXPLOSION" but Tempest uses it as player_fire; T26/T36
// are commented "THRUST" but are warp/enemy_explosion. Key on the ROM ADDRESS,
// never on the comment.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0xcb01;   // from ALEXEC.MAP
const DATA_BASE = 0xcbd1;     // MODULE_BASE + 0xD0 (13 sounds x 16 bytes of PNTRS)
const TICK_HZ = 250;          // the sound IRQ, ~250 Hz (1 beat ~= 4 ms)

// label -> the name the game ships it under. Keyed by LABEL (i.e. by address),
// never by the source's misleading comment.
const SOUNDS = [
  { label: 'LO5F', audc: 'LO5A', name: 'segment_tick' },
  { label: 'EX2F', audc: 'EX2A', name: 'player_fire' },
  { label: 'LA3F', audc: 'LA3A', name: 'launch' },
  { label: 'PU6F', audc: 'PU6A', name: 'pulsar_hum' },
  { label: 'WP4F', audc: 'WP4A', name: 'extra_life' },
  { label: 'DI1F', audc: 'DI1A', name: 'player_explosion' },
  { label: 'T26F', audc: 'T26A', name: 'warp' },
  { label: 'T36F', audc: 'T36A', name: 'enemy_explosion' },
  { label: 'ES8F', audc: 'ES8A', name: 'enemy_fire' },
  { label: 'EL7F', audc: 'EL7A', name: 'spike_shot' },
  { label: 'SL1F', audc: 'SL1A', name: 'countdown_beep' },
  { label: 'S31F', audc: 'S31A', name: 'three_second_warning' },
  { label: 'PO6F', audc: 'PO6A', name: 'pulsar_active' },
];

export default {
  name: 'tempest',
  dirbase: 'tempest',
  sourceFile: 'ALSOUN.MAC',
  mapFile: 'ALEXEC.MAP',
  romFile: 'ALEXEC.LDA',
  tickHz: TICK_HZ,
  moduleBase: MODULE_BASE,
  dataBase: DATA_BASE,

  // LINK 3 verifies the WHOLE CONTIGUOUS TABLE against the ROM in one comparison —
  // not per-sound slices. Simpler, and strictly stronger: it is what catches the
  // 4-byte truncation in the shipped hand table (218 bytes where the ROM has 222).
  table() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = labels.get('T51F');
    return { bytes: bytes.slice(start), romAddr: DATA_BASE, labels, all: bytes, start };
  },

  sfx() {
    const { all, labels, start } = this.table();
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.label);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      // AUDF1 = reg 0 (pitch), AUDC1 = reg 1 (distortion + volume).
      // ALSOUN masks the AUDC high nibble when ramping — volume moves, distortion holds.
      const f = expandEnvelope(all, fOff, { reg: 0, tickHz: TICK_HZ, maxSeconds: 1.6 });
      const a = expandEnvelope(all, aOff, { reg: 1, tickHz: TICK_HZ, maxSeconds: 1.6, maskHighNibble: true });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events], // AUDCTL=0 first
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: DATA_BASE + fOff - start,
        provenance: `ALSOUN.MAC ${s.label} @ $${(DATA_BASE + fOff - start).toString(16)}`,
      });
    }
    return out;
  },
};
