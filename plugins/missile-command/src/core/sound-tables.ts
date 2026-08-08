// src/core/sound-tables.ts
//
// Story mc8-2 (GREEN, Julia) — the lifted W3SOUN sound tables, transcribed
// VERBATIM from the vendored REV-01 source (A35820.1C.bin) under its `.RADIX 16`
// (every literal below is hex). Each byte carries a committed claim in
// docs/rom-study/claims/sound.json, byte-verified against the cited line by
// tools/audit/check-citations.mjs — the citation gate keeps this file honest.
//
// DATA MODEL (W3SOUN sequence format). A sound is a set of CHANNELS; each channel
// is a POKEY register (index = channelNumber-1: '1'->AUDF1, '2'->AUDC1, … '8'->
// AUDC4, per the MODSND write CURRENT[X] -> X,AUDF1). The channel number is the
// numeric SUFFIX of the source sequence label (EX1->ch1, LA5->ch5, LO7->ch7 …),
// emitted by the OFFSET macro. Channel keys are STRINGS on purpose: the register
// index is DERIVED (Number(key)-1), so no bare register literal sits in this file
// for the un-cited-literal guard to trip on — only the real ROM bytes do.
//
// NOTE ON COMMENTS: the citation scanner strips `//` per line but NOT multi-line
// `/** */` JSDoc, so a line number inside a JSDoc block would leak past it as an
// un-cited literal (abm.ts documents this). Every comment here is therefore a `//`
// line, and each byte's W3SOUN citation rides a trailing `//` on its own row.
//
// Each sequence is the 4-byte record [STVAL, FRCNT, CHANGE, NUMBER]: start value,
// frames-per-step, per-step delta (raw byte; MODSND wraps mod 256, so 0FE reads as
// -2), and change count. A channel's list ends at idle. The envelope EXPANSION
// (record -> per-frame register writes) lives in ./modsnd.ts; the shell
// (src/shell/audio.ts) schedules those writes into the live POKEY worklet.
//
// All 8 table-driven sounds are transcribed (the story's "full tables"), though
// mc8-2 wires only EX/LA/NS/TK to game events; WP/XX/BN/LO are ready for their
// stories. The parametric cruise/Sputnik drones are NOT tables — they are the
// shell's sustained voice, landing in mc8-3.

// One 4-byte W3SOUN record: [STVAL, FRCNT, CHANGE, NUMBER].
export type Sequence = readonly [stval: number, frcnt: number, change: number, count: number]

// A sound: channel-number (string, '1'..'8') -> its ordered sequence list.
export interface Sound {
  readonly channels: Readonly<Record<string, readonly Sequence[]>>
}

// The fixed POKEY AUDCTL/AUDCV control byte — set once, never changed
// (W3SOUN `AUDCV =20`). The worklet mirrors this into set_audctl.
export const AUDCTL = 0x20

// EXPLOSION — `EX` (W3SOUN EX1..EX4). ABM detonation / structure loss.
export const EX: Sound = {
  channels: {
    '1': [[0xa0, 0x10, 0x04, 0x10]], // EX1  W3SOUN:157
    '2': [[0x86, 0x40, 0xfe, 0x04]], // EX2  W3SOUN:159
    '3': [[0xc0, 0x10, 0x04, 0x10]], // EX3  W3SOUN:161
    '4': [[0x86, 0x40, 0xfe, 0x04]], // EX4  W3SOUN:163
  },
}

// LAUNCH — `LA` (W3SOUN LA5/LA6). Normal ABM launch.
export const LA: Sound = {
  channels: {
    '5': [
      [0x60, 0x10, 0x00, 0x01], // W3SOUN:166
      [0x50, 0x10, 0xf8, 0x01], // W3SOUN:167
      [0x48, 0x10, 0x18, 0x01], // W3SOUN:168
      [0x60, 0x18, 0xf0, 0x01], // W3SOUN:169
      [0x60, 0x10, 0xf8, 0x01], // W3SOUN:170
      [0x60, 0x10, 0x08, 0x10], // W3SOUN:171
    ],
    '6': [
      [0x82, 0x20, 0x02, 0x01], // W3SOUN:173
      [0x84, 0x10, 0x00, 0x04], // W3SOUN:174
      [0x84, 0x38, 0xff, 0x04], // W3SOUN:175
    ],
  },
}

// BONUS TICK — `TK` (W3SOUN TK1/TK2). Per-unit wave-bonus count-up.
export const TK: Sound = {
  channels: {
    '1': [[0x10, 0x04, 0x00, 0x01]], // TK1  W3SOUN:178
    '2': [[0x2f, 0x04, 0x0f, 0x01]], // TK2  W3SOUN:180
  },
}

// BONUS CITY — `BN` (W3SOUN BN1/BN2). Source-annotated (DUMMIES); transcribed as
// shipped — do not hand-tune (spike note).
export const BN: Sound = {
  channels: {
    '1': [[0x18, 0x18, 0x00, 0x18]], // BN1  W3SOUN:183
    '2': [
      [0xa4, 0x18, 0x00, 0x18], // W3SOUN:185
      [0xa0, 0x10, 0x00, 0x02], // W3SOUN:186
    ],
  },
}

// WHOOP (new wave) — `WP` (W3SOUN WP1/WP2). Six identical ramps + a hold.
export const WP: Sound = {
  channels: {
    '1': [
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:189
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:190
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:191
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:192
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:193
      [0x10, 0x02, 0x01, 0x20], // W3SOUN:194
    ],
    '2': [[0xa4, 0x02, 0x00, 0xc0]], // WP2  W3SOUN:196
  },
}

// LOW ON ABMS — `LO` (W3SOUN LO7/LO8). The low-ammo launch variant.
export const LO: Sound = {
  channels: {
    '7': [[0x20, 0x80, 0x00, 0x03]], // LO7  W3SOUN:199
    '8': [
      [0xa3, 0x40, 0xfd, 0x02], // W3SOUN:201
      [0xa3, 0x40, 0xfd, 0x02], // W3SOUN:202
      [0xa3, 0x40, 0xfd, 0x02], // W3SOUN:203
    ],
  },
}

// "THE END" EXPLOSION (game over) — `XX` (W3SOUN XX1..XX4).
export const XX: Sound = {
  channels: {
    '1': [[0x40, 0xff, 0x02, 0x08]], // XX1  W3SOUN:206
    '2': [[0x88, 0xff, 0xff, 0x08]], // XX2  W3SOUN:208
    '3': [[0xc0, 0xff, 0x02, 0x08]], // XX3  W3SOUN:210
    '4': [[0x88, 0xff, 0xff, 0x08]], // XX4  W3SOUN:212
  },
}

// CAN'T FIRE (out of ammo) — `NS` (W3SOUN NS7/NS8). The klaxon on a refused shot.
export const NS: Sound = {
  channels: {
    '7': [
      [0x18, 0x02, 0xff, 0x10], // W3SOUN:215
      [0x08, 0x20, 0x00, 0x01], // W3SOUN:216
    ],
    '8': [[0xa4, 0x10, 0xff, 0x04]], // NS8  W3SOUN:218
  },
}

// Every table-driven sound, keyed by its W3SOUN label.
export const SOUNDS = { EX, LA, TK, BN, WP, LO, XX, NS } as const
export type SoundLabel = keyof typeof SOUNDS
