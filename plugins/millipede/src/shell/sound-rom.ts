// src/shell/sound-rom.ts
//
// Story ml6-1 — the PURE two-POKEY, eight-voice SOUND DRIVER: millipede's
// SOUNDS routine ported as cited envelope DATA plus the pure reads over it.
// Sister to gfx-rom.ts: no fetch, DOM, canvas, clock, or entropy — deterministic
// ROM tables, held to the ml1-1 core-purity law even though it lives in
// src/shell (it runs under vitest's Node env, and the ml6-2 synth binding is its
// only browser-side consumer). Tone generation (@shared/synth), the gesture
// gate, event mapping, and attract-mute are ml6-2.
//
// ─── THE DRIVER LAW (cited into the VENDORED source — MAME never copied) ───────
// Source: reference/original-source/millipede/{MLIRQ,MLDEF}.MAC. MLDEF.MAC is
// `.RADIX 16` (MLDEF.MAC:2), so bytes below are hex to read 1:1 against it.
//
//   • TWELVE slots. `NCHAN =11.` (MLDEF.MAC:190) is DECIMAL 11 — the ROM's top
//     index over CHAN0..CHAN11 (MLDEF.MAC:312-323). Read as hex it would be 17.
//   • TWO POKEYS. SOUNDS does `CPX I,08` / `BCC …USE LOWER POKEY`
//     (MLIRQ.MAC:57-58): slot < 8 → lower POKEY #0 (AUDF0=$400 / AUDC0=$401,
//     MLDEF.MAC:83-84); slot >= 8 → upper POKEY #1 (AUDF1=$800 / AUDC1=$801,
//     MLDEF.MAC:96-97).
//   • MASK is the tempo. A slot updates only when `(MASK[i] AND INTCT) == 0`
//     (MLIRQ.MAC:17-19, mask table :121-123): mask 0 every interrupt, 1 every
//     2nd, 3 every 4th, 1F every 32nd.
//   • FREQ/CONT are SWEEPS. Each slot's FREQ/CONT pointer (MLIRQ.MAC:124-147)
//     names a table (MLIRQ.MAC:148-239) that steps frame-to-frame — that
//     stepping IS the effect. A 0 pointer means the game stuffs POKEY directly
//     (dragonfly slot 4, bee slot 7: MLIRQ.MAC:100-111,128,131), so those
//     synthesize no frequency sweep. A CONT stored as a bare word is a CONSTANT
//     volume (shot 0x68, bee/earwig/bonus 0xA8, inchworm 0xA9: MLIRQ.MAC:142-147).
//   • PLAY ORDER = STORED REVERSED. SOUNDS reads its tables via negative-Y
//     indexing off a `table-1` pointer (MLIRQ.MAC:38-40) while the slot's
//     countdown falls from N to 1 (`DEC X,CHAN`, MLIRQ.MAC:28-29), and the
//     header states the bytes are stored "IN THE OPPOSITE ORDER WRITTEN TO THE
//     POKEY" (MLIRQ.MAC:106-107). So emission is the stored table reversed —
//     confirmed by the envelope shape it produces (CONT2 played back-to-front is
//     a loud attack decaying to silence, the explosion envelope; forward it
//     would fade IN). The `NY` macro itself is a cross-assembler global, not in
//     the vendored tree — see this story's Design Deviation.

/** The twelve sound slots, index = CHAN number (MLDEF.MAC:312-323). */
export const EFFECT_NAMES: readonly string[] = [
  'beetle', // CHAN0  MLDEF.MAC:312
  'centipede', // CHAN1  :313
  'explosion', // CHAN2  :314
  'spider', // CHAN3  :315
  'dragonfly', // CHAN4  :316 (FLY SOUND)
  'mosquito', // CHAN5  :317
  'shot', // CHAN6  :318
  'bee', // CHAN7  :319
  'inchworm', // CHAN8  :320
  'earwig', // CHAN9  :321
  'player-explosion', // CHAN10 :322
  'bonus-life', // CHAN11 :323
]

/** `NCHAN =11.` — the ROM's DECIMAL top index over CHAN0..CHAN11 (MLDEF.MAC:190),
 *  i.e. `EFFECT_NAMES.length - 1`. NOT hex 0x11. */
export const NCHAN = 11

/** Per-slot frame-mask: a slot updates when `(MASK[i] & intct) === 0`
 *  (MLIRQ.MAC:121-123). */
export const MASK: readonly number[] = [
  0x3, 0x1, 0x3, 0x7, // MLIRQ.MAC:121
  0x3, 0x0, 0x3, 0x3, // :122
  0x3, 0x3, 0x7, 0x1f, // :123
]

// ─── The stored FREQ tables (ROM byte order), MLIRQ.MAC:148-239. `null` marks a
//     0 pointer (the game stuffs POKEY directly). Transcribed verbatim; the
//     citations gate (docs/rom-study/claims/07-sound.json) byte-verifies them. ─
const FREQ_TABLES: readonly (readonly number[] | null)[] = [
  [0x00, 0x80], // FREQ0  beetle              MLIRQ.MAC:148
  [
    0xfc, 0xfc, 0xfc, 0xfc, 0xfc, 0xfc, 0xfc, 0xfc, // FREQ1 centipede feet :150-151
    0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, // :152-153
    0xf4, 0xf4, 0xf4, 0xf4, 0xf4, 0xf4, 0xf4, 0xf4, // :154-155
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // :156-157
  ],
  [
    0x00, 0x00, 0x00, 0x00, // FREQ2 explosion               :166
    0xf0, 0xe0, 0xd0, 0xc0, // :167
    0xb0, 0xa0, 0x90, 0x80, // :168
    0x70, 0x60, 0x50, 0x40, // :169
    0x30, 0x20, 0x10, 0x10, // :170
    0x14, 0x20, 0x18, 0x1c, // :171 DDT EXPLOSION EXTENSION
    0x24, 0x20, 0x28, 0x30, // :172
    0x26, 0x20, 0x24, 0x1c, // :173
    0x14, 0x10, 0x18, 0x10, // :174
  ],
  [
    0x05, 0x05, 0x20, 0x20, // FREQ3 spider                  :184
    0x30, 0x30, 0x35, 0x35, // :185
    0x30, 0x30, 0x20, 0x20, // :186
    0x05, 0x05, 0x20, 0x20, // :187
    0x30, 0x30, 0x35, 0x35, // :188
  ],
  null, // slot 4 dragonfly — FREQ pointer 0 (MLIRQ.MAC:128)
  [
    0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90, // FREQ5 mosquito :194-195
    0x40, 0x48, 0x40, 0x48, // :196
    0x50, 0x58, 0x50, 0x58, // :197
    0x60, 0x68, 0x60, 0x68, // :198
    0x70, 0x78, 0x70, 0x78, // :199
    0x80, 0x88, 0x80, 0x88, // :200
    0x90, 0x98, 0x90, 0x98, // :201
    0xa0, 0xa8, 0xa0, 0xa8, // :202
  ],
  [
    0xf0, 0xe0, 0xd0, 0xc0, // FREQ6 shot                    :212
    0xb0, 0xa0, 0x90, 0x80, // :213
    0x70, 0x60, 0x50, //        :214
  ],
  null, // slot 7 bee — FREQ pointer 0 (MLIRQ.MAC:131)
  [
    0x20, 0x30, 0x40, 0x50, // FREQ8 inchworm                :215
    0x60, 0x70, 0x00, 0x00, // :216
    0x70, 0x60, 0x50, 0x40, // :217
    0x30, 0x20, 0x00, 0x00, // :218
    0x01, //                    :219
  ],
  [
    0x60, 0x60, 0x70, 0x70, // FREQ9 earwig                  :220
    0x60, 0x60, 0x60, 0x70, // :221
    0x70, 0x70, 0x50, 0x50, // :222
    0x80, 0x80, 0x50, 0x50, // :223
    0x50, 0x80, 0x80, 0x80, // :224
  ],
  [
    0x50, 0x4c, 0x48, 0x44, // FREQ10 player explosion       :225
    0x40, 0x3c, 0x38, 0x34, // :226
    0x30, 0x2c, 0x28, 0x24, // :227
    0x20, 0x1c, 0x18, 0x14, // :228
    0x0d, 0x09, 0x05, 0x02, // :229
  ],
  [
    0x28, 0x28, 0x30, 0x28, // FREQ11 bonus life             :235
    0x28, 0x30, 0x3c, 0x51, // :236
    0x50, 0x50, 0x60, 0x50, // :237
    0x50, 0x60, 0x74, 0xa2, // :238
    0x00, //                    :239
  ],
]

// ─── The CONT (volume/control) source per slot, MLIRQ.MAC:136-147 + tables
//     :149-234. A number is a CONSTANT volume; an array is a stored table;
//     `null` is a 0 pointer. ─────────────────────────────────────────────────
const CONT_SOURCES: readonly (readonly number[] | number | null)[] = [
  [0x00, 0xa8], // CONT0  beetle                             MLIRQ.MAC:149
  [
    0x00, 0x00, 0x00, 0x00, // CONT1 centipede feet (rests)  :158
    0xa3, 0xa4, 0xa5, 0xa6, // :159
    0x00, 0x00, 0x00, 0x00, // :160
    0xa4, 0xa5, 0xa6, 0xa7, // :161
    0x00, 0x00, 0x00, 0x00, // :162
    0xa5, 0xa6, 0xa7, 0xa8, // :163
    0x00, 0x00, 0x00, 0xa8, // :164
    0xa9, 0xaa, 0xab, 0xac, // :165
  ],
  [
    0x00, 0x00, 0x00, 0x81, // CONT2 explosion               :175
    0x81, 0x82, 0x82, 0x83, // :176
    0x83, 0x84, 0x84, 0x85, // :177
    0x85, 0x86, 0x86, 0x87, // :178
    0x87, 0x88, 0x88, 0x89, // :179
    0x89, 0x89, 0x8a, 0x8a, // :180 DDT EXPLOSION EXTENSION
    0x8a, 0x8b, 0x8b, 0x8b, // :181
    0x8c, 0x8c, 0x8d, 0x8d, // :182
    0x8e, 0x8e, 0x8f, 0x8f, // :183
  ],
  [
    0xa2, 0x00, 0xa4, 0x00, // CONT3 spider                  :189
    0xa6, 0x00, 0xa8, 0x00, // :190
    0xa6, 0x00, 0xa4, 0x00, // :191
    0xa2, 0x00, 0xa4, 0x00, // :192
    0xa6, 0x00, 0xa4, 0x00, // :193
  ],
  null, // slot 4 dragonfly — CONT pointer 0 (MLIRQ.MAC:140)
  [
    0x17, 0xa8, 0xa8, 0xa8, // CONT5 mosquito                :203
    0x17, 0xa8, 0xa8, 0xa8, // :204
    0xa9, 0xa9, 0xa9, 0xa9, // :205
    0xaa, 0xaa, 0xaa, 0xaa, // :206
    0xab, 0xab, 0xab, 0xab, // :207
    0xac, 0xac, 0xac, 0xac, // :208
    0xad, 0xad, 0xad, 0xad, // :209
    0xae, 0xae, 0xae, 0xae, // :210
    0xaf, 0xaf, 0xaf, 0xaf, // :211
  ],
  0x68, // shot    — constant volume (MLIRQ.MAC:142)
  0xa8, // bee     — constant volume (MLIRQ.MAC:143)
  0xa9, // inchworm— constant volume (MLIRQ.MAC:144)
  0xa8, // earwig  — constant volume (MLIRQ.MAC:145)
  [
    0xa0, 0xa1, 0xa2, 0xa3, // CONT10 player explosion       :230
    0xa4, 0xa5, 0xa6, 0xa7, // :231
    0xa8, 0xa9, 0xaa, 0xab, // :232
    0xac, 0xad, 0xae, 0xaf, // :233
    0xaf, 0xaf, 0xaf, 0xaf, // :234
  ],
  0xa8, // bonus life — constant volume (MLIRQ.MAC:147)
]

/** Which POKEY a slot drives: 0..7 → lower #0, 8..11 → upper #1 (MLIRQ.MAC:57-58). */
export function pokeyOf(index: number): 0 | 1 {
  return index < 8 ? 0 : 1
}

/** Whether slot `index` updates on interrupt `intct` — `(MASK[i] & intct) === 0`
 *  (MLIRQ.MAC:17-19). */
export function shouldTick(index: number, intct: number): boolean {
  return (MASK[index] & intct) === 0
}

/** The AUDF values slot `index` writes over its lifetime, in PLAY order (stored
 *  table reversed — see the driver law). Empty for a program-stuffed slot. */
export function freqSweep(index: number): readonly number[] {
  const table = FREQ_TABLES[index]
  return table ? [...table].reverse() : []
}

/** The AUDC values slot `index` writes over its lifetime, in PLAY order. A
 *  constant-volume slot repeats its byte once per frequency step (one step when
 *  the frequency is program-stuffed); a 0 pointer yields no writes. */
export function contSweep(index: number): readonly number[] {
  const source = CONT_SOURCES[index]
  if (source == null) return []
  if (typeof source === 'number') {
    const steps = freqSweep(index).length || 1
    return new Array<number>(steps).fill(source)
  }
  return [...source].reverse()
}
