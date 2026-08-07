// tests/shell/tune.test.ts
//
// Story pm2-4 — the start-of-game theme sequencer. Two halves:
//
//  1. THE BAKE TRACKS THE GATE: the baked stream/table constants in `tune.ts`
//     are re-derived here from `docs/rom-study/claims/sound.json` (the
//     `SND-THEME-BASS-*` / `SND-THEME-MELODY-*` per-line claims the citation
//     checker byte-verifies against `pacman.asm`), so a byte drifting in either
//     place reddens — no hand-copied magic numbers.
//  2. THE SCHEDULE IS THE ROM'S: against a spy voice and a frame-counting
//     clock, the player must voice every non-rest note of the cited streams in
//     order, at the exact frame offsets the ROM duration table dictates, with
//     the stream-commanded waveform/volume (and the bass f4-effect-1 decay).
//     The schedule is re-derived here with an INDEPENDENT minimal decoder, so
//     the expectation is the claim bytes, not tune.ts's own decode.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  THEME_BASS_STREAM,
  THEME_MELODY_STREAM,
  TUNE_DURATION_TABLE,
  TUNE_PITCH_TABLE,
  THEME_FRAMES,
  createTunePlayer,
} from '../../src/shell/tune'
import type { Wsg, WsgEffect } from '../../src/shell/wsg'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const claims: Array<{ id: string; addr: string; value: string | number }> = JSON.parse(
  readFileSync(join(pluginRoot, 'docs', 'rom-study', 'claims', 'sound.json'), 'utf8'),
)

/** Concatenate the gate-verified per-line claim bytes of one stream, in
 *  ROM-address order. */
function citedStream(prefix: string): number[] {
  return claims
    .filter((c) => c.id.startsWith(prefix))
    .sort((a, b) => parseInt(a.addr, 16) - parseInt(b.addr, 16))
    .flatMap((c) => String(c.value).split(/\s+/))
    .map((b) => parseInt(b, 16))
}

const citedTable = (id: string): number[] =>
  String(claims.find((c) => c.id === id)?.value)
    .split(/\s+/)
    .map((b) => parseInt(b, 16))

describe('tune.ts bakes exactly the cited ROM bytes', () => {
  it('the bass stream matches the SND-THEME-BASS-* claims', () => {
    expect([...THEME_BASS_STREAM]).toEqual(citedStream('SND-THEME-BASS-'))
  })
  it('the melody stream matches the SND-THEME-MELODY-* claims', () => {
    expect([...THEME_MELODY_STREAM]).toEqual(citedStream('SND-THEME-MELODY-'))
  })
  it('the duration and pitch tables match their claims', () => {
    expect([...TUNE_DURATION_TABLE]).toEqual(citedTable('SND-DURATION-TABLE'))
    expect([...TUNE_PITCH_TABLE]).toEqual(citedTable('SND-FREQ-TABLE'))
  })
})

// ─── An INDEPENDENT reference decode of the ROM stream format ────────────────
// (pacman.asm:2d72-2de5 — deliberately re-written, not imported from tune.ts.)

interface RefNote {
  atFrame: number
  frames: number
  word: number // 0 = rest
  waveform: number
  volume: number
  decay: boolean
}

function refDecode(stream: readonly number[], nibbleShift: number): RefNote[] {
  const out: RefNote[] = []
  let wave = 0
  let shift = 0
  let vol = 0
  let decay = false
  let frame = 0
  for (let i = 0; i < stream.length; i++) {
    const b = stream[i]
    if (b === 0xff) break
    if (b >= 0xf0) {
      const op = stream[++i]
      if (b === 0xf1) wave = op
      else if (b === 0xf2) shift = op
      else if (b === 0xf3) vol = op
      else if (b === 0xf4) decay = op === 1
      continue
    }
    const frames = 1 << (b >> 5) // the #3bb0 table IS powers of two
    const pitch = TUNE_PITCH_TABLE[b & 0x0f]
    const word = (b & 0x1f) === 0 ? -1 : pitch << (shift + ((b >> 4) & 1) + nibbleShift)
    out.push({ atFrame: frame, frames, word: word === -1 ? 0 : word, waveform: wave, volume: vol, decay })
    frame += frames
  }
  return out
}

/** A spy voice stamping each play with the tick count at which it arrived. */
function spyWsg(): {
  wsg: Wsg
  tickRef: { now: number }
  plays: Array<{ atFrame: number; effect: WsgEffect; voice?: number }>
} {
  const tickRef = { now: 0 }
  const plays: Array<{ atFrame: number; effect: WsgEffect; voice?: number }> = []
  const wsg: Wsg = {
    resume: () => {},
    play: (effect, opts) => plays.push({ atFrame: tickRef.now, effect, voice: opts?.voice }),
    startSiren: () => {},
    setSirenPitch: () => {},
    stopAll: () => {},
  }
  return { wsg, tickRef, plays }
}

const FRAME_MS = 1000 / 60

describe('the tune player schedules the cited streams', () => {
  const run = () => {
    const { wsg, tickRef, plays } = spyWsg()
    const player = createTunePlayer(wsg)
    player.playTheme()
    for (tickRef.now = 0; tickRef.now < THEME_FRAMES; tickRef.now++) {
      expect(player.playing()).toBe(true)
      player.tick()
    }
    return { player, plays }
  }

  it('voices every non-rest melody note in order, at the ROM frame offsets', () => {
    const { plays } = run()
    const expected = refDecode(THEME_MELODY_STREAM, 4).filter((n) => n.word > 0)
    const melody = plays.filter((p) => p.voice === 1)
    expect(melody.map((p) => [p.atFrame, p.effect.frequency])).toEqual(
      expected.map((n) => [n.atFrame, n.word]),
    )
    // Waveform 0, flat full volume (f1 00 / f3 0f / f4 00), note-length stops.
    for (let i = 0; i < melody.length; i++) {
      expect(melody[i].effect.waveform).toBe(expected[i].waveform)
      expect(melody[i].effect.volume).toBe(0x0f)
      expect(melody[i].effect.volumeEnd).toBeUndefined()
      expect(melody[i].effect.durationMs).toBeCloseTo(expected[i].frames * FRAME_MS, 6)
    }
  })

  it('voices every bass note with the f4-effect-1 pluck decay', () => {
    const { plays } = run()
    const expected = refDecode(THEME_BASS_STREAM, 0).filter((n) => n.word > 0)
    const bass = plays.filter((p) => p.voice === 2)
    expect(bass.map((p) => [p.atFrame, p.effect.frequency])).toEqual(
      expected.map((n) => [n.atFrame, n.word]),
    )
    for (let i = 0; i < bass.length; i++) {
      expect(bass[i].effect.waveform).toBe(2) // f1 02
      expect(bass[i].effect.volume).toBe(0x0f)
      // effect 1: −1 volume per frame from 15, floored at 0 at the cutoff.
      expect(bass[i].effect.volumeEnd).toBe(Math.max(0, 0x0f - expected[i].frames))
      expect(bass[i].effect.durationMs).toBeCloseTo(expected[i].frames * FRAME_MS, 6)
    }
  })

  it('spans the cited ~4 s: 256 bass frames, 248 melody frames, then silence', () => {
    const refBass = refDecode(THEME_BASS_STREAM, 0)
    const refMelody = refDecode(THEME_MELODY_STREAM, 4)
    const total = (notes: RefNote[]) => notes.reduce((s, n) => s + n.frames, 0)
    expect(total(refBass)).toBe(256)
    expect(total(refMelody)).toBe(248)
    expect(THEME_FRAMES).toBe(256)

    const { player, plays } = run()
    expect(player.playing()).toBe(false)
    const before = plays.length
    player.tick() // past the end: nothing more is voiced
    expect(plays.length).toBe(before)
  })

  it('the first melody note is the cited root: #5c << (2+4) = 5888', () => {
    const { plays } = run()
    const first = plays.find((p) => p.voice === 1)
    expect(first?.atFrame).toBe(0)
    expect(first?.effect.frequency).toBe(0x5c << 6)
  })

  it('playTheme() restarts from the top', () => {
    const { wsg, tickRef, plays } = spyWsg()
    const player = createTunePlayer(wsg)
    player.playTheme()
    for (tickRef.now = 0; tickRef.now < 10; tickRef.now++) player.tick()
    player.playTheme()
    player.tick()
    const firstNotePlays = plays.filter((p) => p.voice === 1 && p.effect.frequency === 0x5c << 6)
    expect(firstNotePlays.length).toBe(2)
    expect(player.playing()).toBe(true)
  })
})
