// src/shell/tune.ts
//
// Story pm2-4 — the start-of-game theme: a note-stream sequencer on the WSG
// voice. Distinct MECHANISM from pm2-3's one-shot SFX (`wsg-effects.ts`): the
// ROM has two sound-table families, and the theme rides the NOTE-STREAM engine
// (`pacman.asm:2d44`), a per-frame sequencer walking a byte stream of notes and
// `#f0`-`#ff` command escapes — not an 8-byte tone voice-def. This module bakes
// the two cited streams and transcribes that engine's decode; the driver
// (`audio.ts`) ticks the player once per 60 Hz sim frame, exactly as the ROM's
// interrupt does. No fetch, no runtime asset — the `wsg-data.ts` precedent.
//
// The ROM decode (every byte under the sound.json citation gate; glossary
// `## Sound (Namco WSG)` → `### The note-stream (tune) format`):
//
//  - At game start the ROM writes sound #1 to #4ecc/#4edc (`pacman.asm:066d`),
//    request bit0 of voices 1 & 2 → streams #3bd4 (bass) + #3c58 (melody) via
//    the voice-def pointer tables @#3bc8/#3bcc (`pacman.asm:3bc8`, `:3bcc`).
//    Voice 3's streams (@#3bd0) are `00` placeholders — a two-voice theme.
//  - A stream byte ≥ #f0 is a COMMAND (`cp #f0` @2d7a, jump table @2d85):
//    f0=jump, f1=waveform, f2=base octave shift, f3=volume, f4=volume-effect
//    (0 flat, 1 decay-per-frame — the bass pluck, `pacman.asm:2f26`), ff=end.
//  - A byte < #f0 is a NOTE (`pacman.asm:2da5`): bits 7-5 index the duration
//    table @#3bb0 (frames = 1<<idx), bit 4 is +1 octave (`pacman.asm:2ddf`),
//    bits 3-0 index the 16-entry pitch table @#3bb8 (a chromatic scale; entry 0
//    is 00, so pitch idx 0 with bit4 set — #50/#70 — is a REST). Low 5 bits all
//    zero sustains the previous pitch.
//  - The 16-bit word = pitch byte << (base shift + octave bit). Voice 1's four
//    written nibbles are frequency bits 0-15; voices 2/3's are bits 4-19 — an
//    implicit further ×16 for the melody voice (`pacman.asm:2ddf` claim,
//    matching `wsg-effects.ts` VOICE23_NIBBLE_SHIFT).
import type { Wsg, WsgEffect, WsgVoice } from './wsg'

/** The engine ticks once per 60 Hz frame (the ROM's VBLANK interrupt). */
const FRAME_MS = 1000 / 60

/** Duration table @#3bb0 (`SND-DURATION-TABLE`): frames = table[note >> 5]. */
export const TUNE_DURATION_TABLE: readonly number[] = [
  0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80,
]

/** Pitch table @#3bb8 (`SND-FREQ-TABLE`): 0 = rest, 1…15 a chromatic scale. */
export const TUNE_PITCH_TABLE: readonly number[] = [
  0x00, 0x57, 0x5c, 0x61, 0x67, 0x6d, 0x74, 0x7b,
  0x82, 0x8a, 0x92, 0x9a, 0xa3, 0xad, 0xb8, 0xc3,
]

/** Start-theme BASS stream @#3bd4-#3bf2 (`SND-THEME-BASS-*`, ROM voice 1). */
export const THEME_BASS_STREAM: readonly number[] = [
  0xf1, 0x02, 0xf2, 0x03, 0xf3, 0x0f, 0xf4, 0x01,
  0x82, 0x70, 0x69, 0x82, 0x70, 0x69,
  0x83, 0x70, 0x6a, 0x83, 0x70, 0x6a,
  0x82, 0x70, 0x69, 0x82, 0x70, 0x69,
  0x89, 0x8b, 0x8d, 0x8e,
  0xff,
]

/** Start-theme MELODY stream @#3c58-#3c94 (`SND-THEME-MELODY-*`, ROM voice 2). */
export const THEME_MELODY_STREAM: readonly number[] = [
  0xf1, 0x00, 0xf2, 0x02, 0xf3, 0x0f, 0xf4, 0x00,
  0x42, 0x50, 0x4e, 0x50, 0x49, 0x50, 0x46, 0x50, 0x4e, 0x49, 0x70, 0x66, 0x70,
  0x43, 0x50, 0x4f, 0x50, 0x4a, 0x50, 0x47, 0x50, 0x4f, 0x4a, 0x70, 0x67, 0x70,
  0x42, 0x50, 0x4e, 0x50, 0x49, 0x50, 0x46, 0x50, 0x4e, 0x49, 0x70, 0x66, 0x70,
  0x45, 0x46, 0x47, 0x50, 0x47, 0x48, 0x49, 0x50, 0x49, 0x4a, 0x4b, 0x50, 0x6e,
  0xff,
]

/** One decoded step: hold `frames`; `frequency` 0 = rest (nothing to voice). */
export interface TuneNote {
  frames: number
  /** The 20-bit WSG word (0 for a rest). */
  frequency: number
  volume: number
  /** Set when the stream's f4 effect is 1 (decay: −1 volume per frame). */
  volumeEnd?: number
}

export interface TunePart {
  /** 3-bit WSG waveform-select (the stream's f1 command). */
  waveform: number
  notes: readonly TuneNote[]
}

/**
 * Transcription of the ROM note-stream decode (`pacman.asm:2d72-2de5`).
 * `nibbleShift` is the voice's hardware placement: 0 for ROM voice 1 (nibbles
 * are freq bits 0-15), 4 for voices 2/3 (bits 4-19).
 */
export function decodeNoteStream(stream: readonly number[], nibbleShift: number): TunePart {
  let waveform = 0
  let baseShift = 0
  let volume = 0
  let effect = 0
  let lastWord = 0
  const notes: TuneNote[] = []
  let i = 0
  decode: while (i < stream.length) {
    const byte = stream[i++]
    if (byte >= 0xf0) {
      switch (byte & 0x0f) {
        case 0x1:
          waveform = stream[i++] & 0x7
          break
        case 0x2:
          baseShift = stream[i++]
          break
        case 0x3:
          volume = stream[i++] & 0x0f
          break
        case 0x4:
          effect = stream[i++]
          break
        case 0xf:
          break decode // end-of-stream (`pacman.asm:2fad`)
        default:
          // f0 (jump — a looping tune) and the unused f5-fe never occur in the
          // finite start-theme streams; stop rather than loop forever.
          break decode
      }
      continue
    }
    const frames = TUNE_DURATION_TABLE[byte >>> 5]
    if ((byte & 0x1f) !== 0) {
      const raw = TUNE_PITCH_TABLE[byte & 0x0f]
      const octave = (byte >>> 4) & 1
      lastWord = raw << (baseShift + octave + nibbleShift)
    }
    // (byte & 0x1f) === 0 sustains lastWord — absent from the theme but part
    // of the format. A pitch-idx-0 byte (#50/#70) lands lastWord = 0: a rest.
    notes.push(
      lastWord === 0
        ? { frames, frequency: 0, volume: 0 }
        : {
            frames,
            frequency: lastWord,
            volume,
            // Effect 1 (`pacman.asm:2f26`): volume decrements once per frame.
            ...(effect === 1 ? { volumeEnd: Math.max(0, volume - frames) } : {}),
          },
    )
  }
  return { waveform, notes }
}

/** ROM voice 1 (bass): 5-nibble voice, no placement shift. */
export const THEME_BASS: TunePart = decodeNoteStream(THEME_BASS_STREAM, 0)
/** ROM voice 2 (melody): 4-nibble voice, frequency bits 4-19 (<<4). */
export const THEME_MELODY: TunePart = decodeNoteStream(THEME_MELODY_STREAM, 4)

const partFrames = (part: TunePart): number =>
  part.notes.reduce((sum, note) => sum + note.frames, 0)

/** Theme length in engine frames (the longer part — the bass, 256). */
export const THEME_FRAMES = Math.max(partFrames(THEME_BASS), partFrames(THEME_MELODY))

/** Which `wsg.play` channels the two parts ride. The pm2-3 driver keeps its
 *  frequent one-shots (munch/ghost/death) on channel 0, so the theme takes the
 *  quieter 1 & 2 — melody on 1, bass on 2. */
const MELODY_CHANNEL: WsgVoice = 1
const BASS_CHANNEL: WsgVoice = 2

export interface TunePlayer {
  /** (Re)start the ~4 s start-of-game theme from its first note. */
  playTheme(): void
  /** Advance one 60 Hz engine frame, voicing any notes that begin on it. */
  tick(): void
  /** True while the theme still has frames to play. */
  playing(): boolean
}

interface Cursor {
  readonly part: TunePart
  readonly channel: WsgVoice
  index: number
  framesLeft: number
}

/** A deterministic per-frame sequencer over the decoded parts: each `tick()`
 *  is one engine frame, exactly the ROM's duration-counter cadence
 *  (`dec (ix+#0c)` @2d66 once per interrupt). */
export function createTunePlayer(wsg: Wsg): TunePlayer {
  let cursors: Cursor[] = []

  function playTheme(): void {
    cursors = [
      { part: THEME_MELODY, channel: MELODY_CHANNEL, index: 0, framesLeft: 0 },
      { part: THEME_BASS, channel: BASS_CHANNEL, index: 0, framesLeft: 0 },
    ]
  }

  function playing(): boolean {
    return cursors.some((c) => c.framesLeft > 0 || c.index < c.part.notes.length)
  }

  function tick(): void {
    for (const cursor of cursors) {
      if (cursor.framesLeft === 0) {
        const note = cursor.part.notes[cursor.index]
        if (note === undefined) continue // this part has ended
        cursor.index++
        cursor.framesLeft = note.frames
        if (note.frequency > 0) {
          const effect: WsgEffect = {
            waveform: cursor.part.waveform,
            frequency: note.frequency,
            volume: note.volume,
            durationMs: note.frames * FRAME_MS,
            ...(note.volumeEnd !== undefined ? { volumeEnd: note.volumeEnd } : {}),
          }
          wsg.play(effect, { voice: cursor.channel })
        }
        // A rest voices nothing: the previous one-shot's durationMs has
        // already scheduled its stop at the note boundary.
      }
      cursor.framesLeft--
    }
  }

  return { playTheme, tick, playing }
}
