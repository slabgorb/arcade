// tests/audit/sound-dossier.test.ts
//
// Story cp6-1 — RED phase (Leeloo / TEA). The POKEY dossier and the
// fourteen-cues-over-six-tables ruling.
//
// ─── WHAT THIS STORY SHIPS, AND WHY IT IS TESTABLE AT ALL ────────────────────
// The deliverable is a RULING, not a feature: what does centipede's ROM actually
// sound like, and which of shell/audio.ts's fourteen declared cues have a table
// behind them. A ruling written only as prose is unfalsifiable — the reader has
// no way to tell an authentic transcription from a confident invention, which is
// the precise failure this story exists to prevent in cp6-2's baker. So the
// ruling lands in TWO artifacts and both are gated:
//
//   docs/rom-study/sound.md           — the prose dossier. Enrolled in the
//                                       coverage sweep (AC-7) so every citation
//                                       in it must be pinned by a claim.
//   docs/rom-study/sound.fixture.json — the MACHINE-READABLE ruling: one entry
//                                       per cue with its table, channel, length,
//                                       loop flag and frame gate. This is what
//                                       cp6-2 consumes, so AC-3's "cp6-2 consumes
//                                       a number rather than a judgement" is a
//                                       fact about a file, not an aspiration.
//   docs/rom-study/claims/16-sound.json — the claims the live citation gate
//                                       re-opens byte-for-byte against the
//                                       vendored CENTI4.MAC.
//
// ─── THE TESTS WITH REAL TEETH ARE THE ONES THAT RE-DERIVE FROM THE ROM ──────
// Anything the fixture merely ASSERTS about itself is worth little. What is worth
// something is a check that recomputes the fixture's number from the vendored
// 1981 source and requires agreement:
//
//   • A cue claiming to transcribe FREQ2 must cite the line that DEFINES FREQ2.
//   • Its `tableLengthBytes` must equal the operands actually on that `.BYTE`
//     line — counted here, not trusted.
//   • Its `lengthFrames` must equal that byte count, because in this ROM the
//     CHANn countdown seed IS the table length in all seven channels. That
//     invariant is also the radix detector the story asks for: CHAN0's seed is
//     `LDA I,13` (HEX 13 = 19) against FREQ0's 19 bytes, while CHAN4's is
//     `LDA I,17.` (DECIMAL 17, trailing period) against FREQ4's 17. Read either
//     one in the wrong radix and the seed stops matching its table.
//   • Its `lengthSeconds` must equal lengthFrames × frameGate ÷ FRAME_HZ, where
//     FRAME_HZ is IMPORTED from src/shell/timebase.ts (AC-3: consume it, do not
//     re-derive it) — and the fixture is forbidden from restating 15750 itself.
//   • Its `frameGate` must match the masking instruction in the gate it cites.
//
// ─── SCOPE, AND WHAT THIS STORY MUST NOT DO ──────────────────────────────────
// AC-5: it RULES, it does not EDIT. SOUNDS and CHANNELS are pinned below exactly
// as cp5-1 left them, so an "improvement" smuggled into the manifest reddens.
// AC-6: centipede is still silent at close — no baker, no deploy line, and the
// dossier says so in words.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { SOUNDS, CHANNELS } from '../../src/shell/audio'
import { FRAME_HZ } from '../../src/shell/timebase'
import {
  DOSSIER_FILES,
  claimCovers,
  extractProseCitations,
  loadClaims,
  pluginRoot,
  readDossier,
  romStudyDir,
  uncoveredCitations,
  type ProseCitation,
} from './dossier-sweep'
import type { Claim } from '../../tools/audit/check-citations.mjs'

type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

const SOUND_DOC = 'sound.md'
const fixturePath = join(romStudyDir, 'sound.fixture.json')
const soundClaimsPath = join(romStudyDir, 'claims', '16-sound.json')

// The vendored 1981 source lives at the MONOREPO root, two levels above this
// plugin. Absent on CI, so every block that re-opens a byte is skipped there —
// the same graceful degradation citations.test.ts uses.
const vendoredRoot =
  process.env.CENTIPEDE_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'atari-source', 'centipede')
const vendoredAvailable = existsSync(vendoredRoot)

/** CENTI4.MAC as 1-indexed lines, so `lines[2455]` is what a citation calls :2455. */
function centi4(): string[] {
  const p = join(vendoredRoot, 'revision.v4', 'CENTI4.MAC')
  return ['', ...readFileSync(p, 'utf8').split('\n')]
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FIXTURE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One cue's ruling.
 *
 * `channel` is the ROM's countdown variable (CHAN0..CHAN6) — NOT the shell's
 * CHANNELS value, which is a voice-stealing bucket in our own engine. The two
 * namespaces are unrelated and conflating them is how a plausible-looking
 * fixture ends up describing our code instead of the machine.
 */
interface CueRuling {
  /** 'rom' — this cue transcribes the machine. 'invention' — it has no source. */
  origin: 'rom' | 'invention'
  /** The ruling in one sentence. Never empty: a blank note IS a silent claim. */
  note: string
  /** e.g. "FREQ0". Null for an invention, or for a rom cue whose frequency the
   *  ROM COMPUTES rather than tabulates (the ant/scorpion path derives AUDF1
   *  from ANTV) — in which case `computedCite` carries the citation instead. */
  freqTable: string | null
  /** e.g. "CONT0", when the control/volume byte comes from a table. */
  contTable: string | null
  /** e.g. "0x64", when the ROM writes the control byte as an immediate instead. */
  contImmediate: string | null
  /** "CHAN0".."CHAN6" — the ROM countdown variable this cue rides. */
  channel: string | null
  /** Which POKEY voice (0..3) the cue is written to. */
  pokeyVoice: number | null
  /** `CENTI4.MAC:N` or `:N-M` — the line(s) DEFINING freqTable. */
  tableCite: string | null
  /** `CENTI4.MAC:N` — where contTable is defined, or the immediate is loaded. */
  contCite: string | null
  /** `CENTI4.MAC:N-M` — for a rom cue with no table: where the ROM computes it. */
  computedCite: string | null
  /** `CENTI4.MAC:N` — a line in SOUNDS that reads or decrements `channel`. */
  channelCite: string | null
  /**
   * `CENTI4.MAC:N-M` — where the ROM SEEDS the countdown. A RANGE, spanning both
   * the immediate that carries the value and the store into `channel`. Citing
   * only the `STA CHANn` would leave the seed VALUE — the one number whose radix
   * decides the cue's length — recorded nowhere.
   */
  seedCite: string | null
  /** Operands on the `.BYTE` line(s) at `tableCite`. Recomputed here. */
  tableLengthBytes: number | null
  /** SOUNDS passes the cue occupies — the countdown seed. */
  lengthFrames: number | null
  /** Video frames per SOUNDS pass FOR THIS CUE: 1, 2, 4 or 8. */
  frameGate: number | null
  /** `CENTI4.MAC:N-M` — the FRAME mask that produces frameGate. Null iff gate 1. */
  frameGateCite: string | null
  /** lengthFrames × frameGate ÷ FRAME_HZ. Recomputed here. */
  lengthSeconds: number | null
  /** Does the ROM repeat this cue until told to stop? */
  loop: boolean
  /** `CENTI4.MAC:N` — the ROM's own words for the repeat. Required when loop. */
  loopCite: string | null
  /** For an invention: the named decision handed to cp6-2 (AC-5). */
  cp62Decision: string | null
}

interface SoundFixture {
  /** Must name src/shell/timebase.ts's FRAME_HZ — AC-3 forbids re-deriving it. */
  frameHzSource: string
  /** How lengthSeconds is obtained. Written down so cp6-2 reads a number. */
  derivation: string
  cues: Record<string, CueRuling>
}

function loadFixture(): SoundFixture {
  if (!existsSync(fixturePath)) {
    throw new Error(
      'cp6-1 not delivered yet: GREEN (Julia) must create ' +
        'plugins/centipede/docs/rom-study/sound.fixture.json — the machine-readable ruling, ' +
        'one entry per SOUNDS cue with { origin, note, freqTable, contTable, contImmediate, ' +
        'channel, pokeyVoice, tableCite, contCite, computedCite, channelCite, seedCite, ' +
        'tableLengthBytes, lengthFrames, frameGate, frameGateCite, lengthSeconds, loop, ' +
        'loopCite, cp62Decision }, plus top-level { frameHzSource, derivation }. ' +
        'The prose lives in sound.md; this file is what cp6-2 consumes.',
    )
  }
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as SoundFixture
}

/** Every cue the ruling marks as transcribed from the machine. */
function romCues(): [string, CueRuling][] {
  return Object.entries(loadFixture().cues).filter(([, c]) => c.origin === 'rom')
}

/** Rom cues backed by an actual `.BYTE` table (not the computed ANTV path). */
function tableCues(): [string, CueRuling][] {
  return romCues().filter(([, c]) => c.freqTable !== null)
}

/** Parse `CENTI4.MAC:2463-2464` → { file, start, end }; throws on anything else. */
function parseCite(cite: string, where: string): { file: string; start: number; end: number } {
  const m = cite.match(/^([\w.]+\.(?:MAC|DOC|MAP)):(\d+)(?:-(\d+))?$/)
  if (!m) {
    throw new Error(
      `${where}: "${cite}" is not a FILE:LINESPEC citation. Spell it "CENTI4.MAC:2455" or ` +
        '"CENTI4.MAC:2463-2464" — the bare-colon form ":2455" is invisible to every gate in this repo.',
    )
  }
  return { file: m[1], start: +m[2], end: m[3] ? +m[3] : +m[2] }
}

/**
 * The immediate a `LD[AXY] I,...` carries somewhere in a citation's range, decoded
 * by the ROM's OWN spelling: a trailing period means decimal, everything else is
 * hex (.RADIX 16, inherited from CENDE4 by .INCLUDE).
 *
 * This is the whole radix discipline reduced to a function. The seeds are written
 * in BOTH radices across the seven channels — `LDA I,13` (hex, 19) for the
 * explosion, `LDA I,17.` (decimal, 17) for the bonus — so a reader who assumes
 * one radix throughout gets some cue lengths right and others silently wrong.
 */
function decodeImmediate(lines: string[], start: number, end: number): { line: number; value: number } | null {
  for (let i = start; i <= end; i++) {
    const m = (lines[i] ?? '').match(/LD[AXY]\s+I,([0-9A-F]+)(\.?)/)
    if (m) return { line: i, value: m[2] === '.' ? parseInt(m[1], 10) : parseInt(m[1], 16) }
  }
  return null
}

/** The operands on the `.BYTE` line(s) in a citation's range, counted from the ROM. */
function countByteOperands(lines: string[], start: number, end: number): number {
  let n = 0
  for (let i = start; i <= end; i++) {
    const src = lines[i] ?? ''
    const m = src.match(/\.BYTE\s+(.*)$/)
    if (!m) continue
    const operands = m[1].split(';')[0] // drop the trailing ROM comment
    n += operands.split(',').filter((s) => s.trim() !== '').length
  }
  return n
}

/** Every `CENTI4.MAC:N[-M]` citation the fixture carries, with where it came from. */
function fixtureCitations(): { cite: string; where: string }[] {
  const out: { cite: string; where: string }[] = []
  for (const [name, cue] of Object.entries(loadFixture().cues)) {
    const fields: (keyof CueRuling)[] = [
      'tableCite',
      'contCite',
      'computedCite',
      'channelCite',
      'seedCite',
      'frameGateCite',
      'loopCite',
    ]
    for (const f of fields) {
      const v = cue[f]
      if (typeof v === 'string' && v !== '') out.push({ cite: v, where: `cues.${name}.${String(f)}` })
    }
  }
  return out
}

async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
  return mod.checkClaims
}

function loadSoundClaims(): Claim[] {
  if (!existsSync(soundClaimsPath)) {
    throw new Error(
      'cp6-1 not delivered yet: GREEN (Julia) must create ' +
        'plugins/centipede/docs/rom-study/claims/16-sound.json — the SOUNDS routine and its six ' +
        'tables converted to claims the live citation gate re-opens byte-for-byte (AC-2).',
    )
  }
  const parsed = JSON.parse(readFileSync(soundClaimsPath, 'utf8')) as Claim | Claim[]
  return ([] as Claim[]).concat(parsed)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — THIS STORY RULES, IT DOES NOT EDIT.
// Pinned by value, not by shape: a renamed cue, a changed filename or a
// re-pointed channel all redden here. cp5-1 authored these; cp6-1 only describes
// what the ROM does behind them, and cp6-2 is where anything changes.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-5 — the manifest and the CHANNELS map are UNCHANGED', () => {
  const CP5_1_SOUNDS = {
    fire: 'shot_fire.wav',
    mushroom: 'mushroom_hit.wav',
    segmentKill: 'segment_kill.wav',
    spiderKill: 'spider_kill.wav',
    fleaKill: 'flea_kill.wav',
    scorpionKill: 'scorpion_kill.wav',
    headBottom: 'head_bottom.wav',
    playerDeath: 'player_death.wav',
    waveClear: 'wave_clear.wav',
    bonusLife: 'bonus_life.wav',
    march: 'centipede_march.wav',
    spiderLoop: 'spider_move.wav',
    fleaLoop: 'flea_move.wav',
    scorpionLoop: 'scorpion_move.wav',
  }

  const CP5_1_CHANNELS = {
    fire: 'shot',
    mushroom: 'impact',
    segmentKill: 'impact',
    spiderKill: 'impact',
    fleaKill: 'impact',
    scorpionKill: 'impact',
    headBottom: 'alert',
    playerDeath: 'alert',
    waveClear: 'alert',
    bonusLife: 'chan4',
    march: 'voice-march',
    spiderLoop: 'voice-spider',
    fleaLoop: 'voice-flea',
    scorpionLoop: 'voice-scorpion',
  }

  it('SOUNDS still declares exactly the fourteen cp5-1 cues, in order, with the same filenames', () => {
    expect(
      SOUNDS,
      'cp6-1 rules on the manifest; it must not edit it. A cue with no ROM table behind it is ' +
        'handed to cp6-2 as a named decision (fixture cp62Decision), never deleted here.',
    ).toEqual(CP5_1_SOUNDS)
    expect(Object.keys(SOUNDS), 'cue ORDER is part of the manifest cp5-1 shipped').toEqual(
      Object.keys(CP5_1_SOUNDS),
    )
  })

  it('CHANNELS still maps every cue to the same voice-stealing bucket', () => {
    expect(CHANNELS, 'the CHANNELS map is out of scope for cp6-1 (AC-5)').toEqual(CP5_1_CHANNELS)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 — CENTIPEDE IS STILL SILENT WHEN THIS STORY CLOSES.
// Two mechanical proofs and one in words. The mechanical ones matter more: a
// story that quietly started cp6-2's work would read like progress toward sound
// while shipping none, which is the tracking failure epic cp6 exists to repair.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-6 — centipede is still silent', () => {
  it('ships no baker — cp6-1 records what the ROM sounds like, it does not bake it', () => {
    expect(
      existsSync(join(pluginRoot, 'tools', 'pokey-bake')),
      'plugins/centipede/tools/pokey-bake/ belongs to cp6-2, not cp6-1',
    ).toBe(false)
  })

  it('the deploy-assets recipe still does not name centipede', () => {
    const justfile = readFileSync(join(pluginRoot, '..', '..', 'justfile'), 'utf8').split('\n')
    const start = justfile.findIndex((l) => /^deploy-assets:/.test(l))
    expect(start, 'justfile must still carry a deploy-assets recipe').toBeGreaterThan(-1)
    const body: string[] = []
    for (let i = start + 1; i < justfile.length; i++) {
      const line = justfile[i]
      if (line.trim() !== '' && !/^\s/.test(line)) break
      body.push(line)
    }
    expect(
      body.filter((l) => /centipede/i.test(l)),
      'adding centipede to deploy-assets is cp6-2 — uploading samples this story did not bake ' +
        'would make the recipe lie',
    ).toEqual([])
  })

  it('the dossier says plainly that centipede is still silent', () => {
    const md = readDossier(SOUND_DOC)
    expect(md, `docs/rom-study/${SOUND_DOC} must exist (GREEN writes it)`).not.toBe('')
    expect(
      /still\s+silent/i.test(md),
      `${SOUND_DOC} must state in words that centipede is still silent at close — AC-6 is a ` +
        'truth-in-reporting clause, and a dossier that only describes sound implies progress toward it',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — ALL FOURTEEN CUES ACCOUNTED FOR INDIVIDUALLY.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-1 — every SOUNDS cue is ruled on, and nothing is silently authentic', () => {
  it('the fixture rules on exactly the fourteen manifest cues — none missing, none invented', () => {
    const ruled = Object.keys(loadFixture().cues).sort()
    const declared = Object.keys(SOUNDS).sort()
    expect(
      ruled,
      'every cue in shell/audio.ts SOUNDS needs its own entry — a cue with no entry is exactly ' +
        'the cue cp6-2 would bake by guessing',
    ).toEqual(declared)
  })

  it('every cue declares an origin and carries a non-empty ruling note', () => {
    for (const [name, cue] of Object.entries(loadFixture().cues)) {
      expect(cue.origin, `cues.${name}.origin must be "rom" or "invention"`).toMatch(/^(rom|invention)$/)
      expect(typeof cue.note, `cues.${name}.note must be a string`).toBe('string')
      expect(cue.note.trim(), `cues.${name}.note must say what the ruling IS — a blank note is a silent claim`)
        .not.toBe('')
    }
  })

  it('every ROM-sourced cue names its channel and cites primary source — a table OR a computation', () => {
    for (const [name, cue] of romCues()) {
      expect(cue.pokeyVoice, `cues.${name}.pokeyVoice must be the POKEY voice 0..3`).toBeGreaterThanOrEqual(0)
      expect(cue.pokeyVoice, `cues.${name}.pokeyVoice must be the POKEY voice 0..3`).toBeLessThanOrEqual(3)
      const hasTable = cue.freqTable !== null && cue.tableCite !== null
      const hasComputed = cue.freqTable === null && cue.computedCite !== null
      expect(
        hasTable || hasComputed,
        `cues.${name} is marked origin "rom" but cites nothing: give it { freqTable, tableCite } ` +
          'or, when the ROM computes the frequency instead of tabulating it, { computedCite }',
      ).toBe(true)
      if (cue.channel === null) {
        // A rom cue MAY have no countdown variable: the ant/flea voice re-derives
        // AUDF1 from ANTV on every pass and rides no CHANn at all. That is a real
        // finding and the fixture is allowed to say so — but only alongside the
        // citation that shows it, never as an unexplained null.
        expect(
          cue.computedCite,
          `cues.${name} rides no ROM channel, which is only sayable for a cue the ROM COMPUTES — ` +
            'cite the block that does it',
        ).not.toBeNull()
        continue
      }
      expect(cue.channel, `cues.${name}.channel must be CHAN0..CHAN6 (the ROM countdown, not our CHANNELS bucket)`)
        .toMatch(/^CHAN[0-6]$/)
      expect(cue.channelCite, `cues.${name}.channelCite must point at the SOUNDS line that rides ${cue.channel}`)
        .not.toBeNull()
    }
  })

  it('every INVENTED cue is labelled as one and handed to cp6-2 as a named decision', () => {
    for (const [name, cue] of Object.entries(loadFixture().cues)) {
      if (cue.origin !== 'invention') continue
      expect(cue.freqTable, `cues.${name} is an invention — it must not name a ROM table`).toBeNull()
      expect(cue.channel, `cues.${name} is an invention — it must not claim a ROM channel`).toBeNull()
      expect(
        (cue.cp62Decision ?? '').trim(),
        `cues.${name} has no ROM source, so AC-5 requires a NAMED decision for cp6-2 ` +
          '(bake a declared stand-in? reuse another cue? leave silent?) — not a deletion and not a shrug',
      ).not.toBe('')
    }
  })

  it('the ruling accounts for all SEVEN ROM channels, not just the ones with obvious cues', () => {
    // The machine drives seven countdown variables over four POKEY voices
    // (header CENTI4.MAC:2325-2328). A ruling that mapped fourteen cues onto
    // three channels would have quietly dropped the rest of the sound engine.
    const claimed = new Set(romCues().map(([, c]) => c.channel))
    const all = ['CHAN0', 'CHAN1', 'CHAN2', 'CHAN3', 'CHAN4', 'CHAN5', 'CHAN6']
    expect(all.filter((c) => !claimed.has(c)), 'no cue rides these ROM channels — is that ruled or missed?')
      .toEqual([])
  })

  it.skipIf(!vendoredAvailable)('a cue claiming a table cites the line that DEFINES that table', () => {
    const lines = centi4()
    for (const [name, cue] of tableCues()) {
      const { start } = parseCite(cue.tableCite as string, `cues.${name}.tableCite`)
      expect(
        lines[start] ?? '',
        `cues.${name} says it transcribes ${cue.freqTable}, but CENTI4.MAC:${start} does not define it — ` +
          'naming a table without pointing at it is how an invention reads as authentic',
      ).toMatch(new RegExp(`^${cue.freqTable}:`))
    }
  })

  it.skipIf(!vendoredAvailable)('a cue\'s channelCite and seedCite really touch that channel', () => {
    const lines = centi4()
    for (const [name, cue] of romCues()) {
      if (cue.channel === null) continue // the computed ant/flea voice rides no CHANn
      const ch = cue.channel
      const { start } = parseCite(cue.channelCite as string, `cues.${name}.channelCite`)
      expect(lines[start] ?? '', `cues.${name}.channelCite → CENTI4.MAC:${start} does not mention ${ch}`)
        .toContain(ch)
      if (cue.seedCite === null) continue
      const seed = parseCite(cue.seedCite, `cues.${name}.seedCite`)
      const span = lines.slice(seed.start, seed.end + 1)
      expect(
        span.some((l) => new RegExp(`ST[AXY]\\s+${ch}\\b`).test(l)),
        `cues.${name}.seedCite (${cue.seedCite}) must span the ST[AXY] into ${ch}, not merely a ` +
          'line that mentions it',
      ).toBe(true)
      expect(
        decodeImmediate(lines, seed.start, seed.end),
        `cues.${name}.seedCite (${cue.seedCite}) spans no immediate. Cite the LOAD as well as the ` +
          'store: the seed VALUE is the number whose radix decides how long the cue runs, and a ' +
          'range that stops at `STA ' + ch + '` records it nowhere.',
      ).not.toBeNull()
    }
  })

  it.skipIf(!vendoredAvailable)('the seed VALUE is itself claimed, with its radix stated', () => {
    // AC-2: "every transcribed constant carries a radix-cited comment". The rule
    // is only worth anything if the constants actually reach the claims — a
    // fixture that cited `STA CHAN4` and never `LDA I,17.` would satisfy a radix
    // sweep vacuously, because no claim would quote a number at all.
    const lines = centi4()
    const claims = loadClaims()
    const unpinned: string[] = []
    for (const [name, cue] of romCues()) {
      if (cue.seedCite === null) continue
      const seed = parseCite(cue.seedCite, `cues.${name}.seedCite`)
      const imm = decodeImmediate(lines, seed.start, seed.end)
      if (!imm) continue // reported by the test above
      const pinning = claims.filter((c) => c.source && basename(c.source.file) === seed.file && c.source.line === imm.line)
      if (!pinning.length) unpinned.push(`cues.${name} → CENTI4.MAC:${imm.line} (${lines[imm.line].trim()})`)
      else if (!pinning.some((c) => /\bhex\b|\bdecimal\b|0x/i.test(c.claim))) {
        unpinned.push(`cues.${name} → CENTI4.MAC:${imm.line} is claimed, but no claim states its RADIX`)
      }
    }
    expect(
      unpinned,
      'these countdown seeds are transcribed into the fixture but their constants are not pinned ' +
        `by a radix-stating claim:\n  ${unpinned.join('\n  ')}`,
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — LENGTH AND LOOP ARE DERIVED, NOT CHOSEN BY EAR.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-3 — per-cue length and loop are derived from the ROM', () => {
  it('the fixture CONSUMES timebase.ts FRAME_HZ instead of restating it', () => {
    const fx = loadFixture()
    expect(fx.frameHzSource, 'frameHzSource must name where the frame rate comes from').toMatch(/timebase\.ts/)
    expect(fx.frameHzSource, 'frameHzSource must name the FRAME_HZ constant itself').toMatch(/FRAME_HZ/)
    expect(
      readFileSync(fixturePath, 'utf8'),
      'the fixture restates the raw frame rate. FRAME_HZ = 15750/263 already EXISTS as a named ' +
        'constant at src/shell/timebase.ts:20 — a second copy is a second thing to correct',
    ).not.toMatch(/15750/)
  })

  it('the derivation is written down, so cp6-2 reads a formula rather than re-deriving one', () => {
    const fx = loadFixture()
    expect(fx.derivation.trim(), 'top-level `derivation` must not be empty').not.toBe('')
    expect(fx.derivation, 'the derivation must name FRAME_HZ').toMatch(/FRAME_HZ/)
    expect(fx.derivation, 'the derivation must name the frame gate — it is what makes the cues differ')
      .toMatch(/frameGate/)
  })

  it('lengthSeconds is exactly lengthFrames x frameGate / FRAME_HZ', () => {
    for (const [name, cue] of romCues()) {
      if (cue.lengthFrames === null) continue // computed voices need not have a countdown window
      expect(typeof cue.lengthFrames, `cues.${name}.lengthFrames must be a number`).toBe('number')
      expect(typeof cue.frameGate, `cues.${name}.frameGate must be a number`).toBe('number')
      const expected = (Number(cue.lengthFrames) * Number(cue.frameGate)) / FRAME_HZ
      expect(
        Number(cue.lengthSeconds),
        `cues.${name}.lengthSeconds does not follow from its own countdown window: ` +
          `${cue.lengthFrames} passes x gate ${cue.frameGate} / FRAME_HZ = ${expected}. ` +
          'A number that does not reduce to the ROM is a number chosen by ear.',
      ).toBeCloseTo(expected, 9)
    }
  })

  it('a table-backed cue that carries a countdown must ride its table for exactly one pass per byte', () => {
    // The seed and the table length agree in all seven of this ROM's channels.
    // That is not a coincidence to restate — it is the check that catches a
    // misread radix, because the two numbers are written in DIFFERENT radices
    // (CHAN0 `LDA I,13` is hex; CHAN4 `LDA I,17.` is decimal) and only the
    // correct reading of each makes them match.
    for (const [name, cue] of tableCues()) {
      if (cue.lengthFrames === null) continue
      expect(
        cue.lengthFrames,
        `cues.${name}: the countdown seed (${cue.lengthFrames}) and ${cue.freqTable}'s byte count ` +
          `(${cue.tableLengthBytes}) disagree. In this ROM they are equal in every channel — a ` +
          'mismatch usually means the seed was read in the wrong radix.',
      ).toBe(cue.tableLengthBytes)
    }
  })

  it('a looping cue quotes the ROM saying so; a one-shot claims no such line', () => {
    for (const [name, cue] of romCues()) {
      if (cue.loop) {
        expect(
          cue.loopCite,
          `cues.${name} is marked loop:true — cite the ROM's own words for it ` +
            "(CONT1 ';MUST BE REPEATED', CONT3 ';WELL REPEAT UNTIL TURNED OFF', CHAN6 ';CONTINOUS LOOP', " +
            'or the reseed that closes the cycle). AC-3 forbids choosing this by ear.',
        ).not.toBeNull()
      } else {
        expect(cue.loopCite, `cues.${name} is a one-shot but carries a loopCite — one of the two is wrong`)
          .toBeNull()
      }
    }
  })

  it('the ruling finds BOTH loops and one-shots — a uniform answer would mean nobody looked', () => {
    const cues = romCues()
    expect(cues.filter(([, c]) => c.loop).length, 'the ROM repeats several cues; none marked loop:true')
      .toBeGreaterThan(0)
    expect(cues.filter(([, c]) => !c.loop).length, 'the ROM one-shots several cues; none marked loop:false')
      .toBeGreaterThan(0)
  })

  it.skipIf(!vendoredAvailable)('lengthFrames IS the ROM seed, decoded in the radix the ROM spells', () => {
    // The sharpest check in this file. `lengthFrames` is not a number to assert
    // about — it is a number to RECOVER: read the immediate the ROM stores into
    // the channel, decode it hex unless it carries a trailing period, and require
    // agreement. Get the radix wrong on any of the seven and the recovered value
    // stops matching, which is the systematic misread the story warns about
    // rather than a typo in one place.
    const lines = centi4()
    for (const [name, cue] of romCues()) {
      if (cue.seedCite === null || cue.lengthFrames === null) continue
      const seed = parseCite(cue.seedCite, `cues.${name}.seedCite`)
      const imm = decodeImmediate(lines, seed.start, seed.end)
      if (!imm) continue // reported by the AC-1 seed-span test
      expect(
        cue.lengthFrames,
        `cues.${name}.lengthFrames is ${cue.lengthFrames}, but the ROM seeds ${cue.channel} with ` +
          `\`${lines[imm.line].trim()}\` = ${imm.value} (bare literals are HEX; only a trailing ` +
          'period is decimal)',
      ).toBe(imm.value)
    }
  })

  it.skipIf(!vendoredAvailable)('tableLengthBytes equals the operands actually on the cited .BYTE line(s)', () => {
    const lines = centi4()
    for (const [name, cue] of tableCues()) {
      const { start, end } = parseCite(cue.tableCite as string, `cues.${name}.tableCite`)
      const counted = countByteOperands(lines, start, end)
      expect(counted, `cues.${name}.tableCite spans no .BYTE operands at all`).toBeGreaterThan(0)
      expect(
        cue.tableLengthBytes,
        `cues.${name}: ${cue.freqTable} at ${cue.tableCite} actually carries ${counted} operands, ` +
          `not ${cue.tableLengthBytes}. (FREQ4 is the one that spans two lines — cite both.)`,
      ).toBe(counted)
    }
  })

  it.skipIf(!vendoredAvailable)('the control byte resolves to a real CONT table or a real immediate', () => {
    const lines = centi4()
    for (const [name, cue] of tableCues()) {
      const hasTable = cue.contTable !== null
      const hasImm = cue.contImmediate !== null
      expect(
        hasTable !== hasImm,
        `cues.${name}: give it EITHER contTable (the ROM indexes a CONTn table) OR contImmediate ` +
          "(the ROM writes a fixed control byte, e.g. FREQ2's `LDA I,64`), never both and never neither",
      ).toBe(true)
      const { start, end } = parseCite(cue.contCite as string, `cues.${name}.contCite`)
      const src = lines[start] ?? ''
      if (hasTable) {
        expect(src, `cues.${name}.contCite → CENTI4.MAC:${start} does not define ${cue.contTable}`).toMatch(
          new RegExp(`^${cue.contTable}:`),
        )
        expect(
          countByteOperands(lines, start, end),
          `cues.${name}: ${cue.contTable} must carry one control byte per frequency byte`,
        ).toBe(cue.tableLengthBytes)
      } else {
        const m = src.match(/LD[AXY]\s+I,0?([0-9A-F]+)/)
        expect(m, `cues.${name}.contCite → CENTI4.MAC:${start} loads no immediate`).not.toBeNull()
        expect(
          parseInt((m as RegExpMatchArray)[1], 16),
          `cues.${name}.contImmediate is ${cue.contImmediate}, but CENTI4.MAC:${start} loads a ` +
            'different byte. Bare literals here are HEX (.RADIX 16, inherited from CENDE4).',
        ).toBe(Number(cue.contImmediate))
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — THE FRAME GATING IS RECORDED PER CUE, NOT FLATTENED INTO ONE CADENCE.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-4 — the non-uniform frame gating is recorded per cue', () => {
  it('every ROM cue carries a gate of 1, 2, 4 or 8', () => {
    for (const [name, cue] of romCues()) {
      expect([1, 2, 4, 8], `cues.${name}.frameGate is ${cue.frameGate}; SOUNDS gates on FRAME only by 2, 4 or 8`)
        .toContain(cue.frameGate)
    }
  })

  it('the gating is NOT flattened — the cues do not all share one cadence', () => {
    const gates = [...new Set(romCues().map(([, c]) => c.frameGate))]
    expect(
      gates.length,
      `the ruling records ${gates.length} distinct cadence(s) (${gates.join(', ')}). SOUNDS runs ` +
        'once per video frame, but the spider advances every other frame, the bonus every eighth ' +
        'and the player explosion every fourth — flattening those is the failure AC-4 names.',
    ).toBeGreaterThanOrEqual(2)
  })

  it('a gated cue cites its mask; an ungated one claims no mask', () => {
    for (const [name, cue] of romCues()) {
      if (cue.frameGate === 1) {
        expect(
          cue.frameGateCite,
          `cues.${name} advances every SOUNDS pass, so it must not cite a FRAME mask`,
        ).toBeNull()
      } else {
        expect(cue.frameGateCite, `cues.${name} is gated x${cue.frameGate} — cite the FRAME mask that does it`)
          .not.toBeNull()
      }
    }
  })

  it('the three gates AC-4 names each land on the right ROM channel', () => {
    const gateOf = (ch: string): number[] =>
      romCues().filter(([, c]) => c.channel === ch).map(([, c]) => Number(c.frameGate))
    expect(gateOf('CHAN3'), "the spider's LSR gate makes CHAN3 advance every OTHER frame").toContain(2)
    expect(gateOf('CHAN4'), "the bonus's `AND I,07` makes CHAN4 advance every EIGHTH frame").toContain(8)
    expect(gateOf('CHAN5'), "the player explosion's `AND I,3` makes CHAN5 advance every FOURTH frame")
      .toContain(4)
  })

  it.skipIf(!vendoredAvailable)('each cited gate really contains the masking instruction it claims', () => {
    const lines = centi4()
    // gate -> what the ROM must be doing inside the cited range.
    const MASK: Record<number, RegExp> = {
      2: /^\s*LSR\s*(;.*)?$/, // LDA FRAME / LSR / BCC — carry is FRAME bit 0
      4: /AND\s+I,0?3\b/,
      8: /AND\s+I,0?7\b/,
    }
    for (const [name, cue] of romCues()) {
      if (cue.frameGate === 1 || cue.frameGateCite === null) continue
      const { start, end } = parseCite(cue.frameGateCite, `cues.${name}.frameGateCite`)
      const span = lines.slice(start, end + 1)
      expect(
        span.some((l) => /LDA\s+FRAME/.test(l)),
        `cues.${name}.frameGateCite (${cue.frameGateCite}) does not include the \`LDA FRAME\` the mask ` +
          'reads. A range that quotes the mask but drops the load is the off-by-one this story was ' +
          'filed with three times over.',
      ).toBe(true)
      expect(
        span.some((l) => MASK[Number(cue.frameGate)].test(l)),
        `cues.${name} claims a x${cue.frameGate} gate, but ${cue.frameGateCite} contains no such mask`,
      ).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — RADIX-CITED CONSTANTS, RE-OPENED BY THE LIVE GATE.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-2 — every transcribed constant is radix-cited and byte-verified', () => {
  it('claims/16-sound.json exists and is non-empty', () => {
    expect(loadSoundClaims().length, 'the SOUNDS routine and six tables cannot reduce to zero claims')
      .toBeGreaterThan(0)
  })

  it('every claim that transcribes a CONSTANT states its radix', () => {
    // .RADIX 16 is inherited from CENDE4, so a bare literal is HEX and only a
    // trailing period means decimal. A transcribed byte with no radix in its
    // prose is a byte the next reader will guess at — and guessing wrong here
    // produces confidently incorrect tones that no test downstream can see.
    const TRANSCRIBES = /\.BYTE|LD[AXY]\s+I,|AND\s+I,|ADC\s+I,|CMP\s+I,|EOR\s+I,|ORA\s+I,/
    const naked = loadSoundClaims()
      .filter((c) => c.source && TRANSCRIBES.test(c.source.verbatim))
      .filter((c) => !/\bhex\b|\bdecimal\b|0x/i.test(c.claim))
      .map((c) => `${c.id} (${c.source.file}:${c.source.line})`)
    expect(
      naked,
      'these claims quote a numeric operand but never say which radix it is in:\n  ' + naked.join('\n  '),
    ).toEqual([])
  })

  it('the two decimal-20s are pinned SEPARATELY — the coincidence the story warns about', () => {
    // `LDA I,14` at :2346 is HEX 14 = decimal 20 (the CHAN3 reset). `LDY I,20.`
    // at :2389 is DECIMAL 20 by the trailing period (the CHAN6 continuous loop).
    // Same value, different radices, different channels — exactly the pair that
    // hides a systematic misread if one claim is made to serve both.
    const claims = loadSoundClaims()
    const at = (line: number): Claim[] => claims.filter((c) => c.source && c.source.line === line)
    const reset = at(2346)
    const loop = at(2389)
    expect(reset.length, 'no claim pins `LDA I,14` at CENTI4.MAC:2346 (the CHAN3 spider reset)')
      .toBeGreaterThan(0)
    expect(loop.length, 'no claim pins `LDY I,20.` at CENTI4.MAC:2389 (the CHAN6 continuous loop)')
      .toBeGreaterThan(0)
    expect(
      reset.some((c) => /\bhex\b/i.test(c.claim) && /\b20\b/.test(c.claim)),
      ':2346 must be recorded as HEX 14 resolving to decimal 20 — recorded as decimal 14 it is a wrong tone length',
    ).toBe(true)
    expect(
      loop.some((c) => /\bdecimal\b/i.test(c.claim)),
      ':2389 must be recorded as DECIMAL 20 (the trailing period), not as hex 20 = 32',
    ).toBe(true)
    expect(
      reset.map((c) => c.id).some((id) => loop.map((c) => c.id).includes(id)),
      'one claim cannot pin both lines — that is what collapses the coincidence into a misread',
    ).toBe(false)
  })

  it.skipIf(!vendoredAvailable)('every sound claim re-opens byte-for-byte against the vendored CENTI4.MAC', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(loadSoundClaims(), { vendoredRoot }),
      'a wrong line number must FAIL here rather than read plausibly (AC-2)',
    ).toEqual([])
  })

  it('every citation the FIXTURE carries is itself pinned by a claim', () => {
    // The fixture is what cp6-2 consumes, so its line numbers matter at least as
    // much as the prose's. Routing them through a claim puts them under the byte
    // gate above instead of leaving them as unwatched JSON.
    const claims = loadClaims()
    const missing = fixtureCitations().filter(({ cite, where }) => {
      const { file, start, end } = parseCite(cite, where)
      const c: ProseCitation = { file, start, end, raw: cite, from: 'sound.fixture.json' }
      return !claims.some((cl) => claimCovers(cl, c))
    })
    expect(
      missing.map((m) => `${m.where} → ${m.cite}`),
      'these fixture citations have no covering claim, so nothing re-opens them:\n  ' +
        missing.map((m) => `${m.where} → ${m.cite}`).join('\n  '),
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-7 — THE DOSSIER IS ENROLLED IN THE SWEEP, AND THE ENROLLMENT IS PROVED.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-7 — sound.md is swept, and the sweep is proved to have teeth', () => {
  it('sound.md is enrolled in DOSSIER_FILES alongside the two it generalises', () => {
    expect([...DOSSIER_FILES], 'the hardcoded brief+glossary pair becomes a list in joust\'s shape').toEqual([
      'brief.md',
      'glossary.md',
      SOUND_DOC,
    ])
  })

  it('the gate reads the shared sweep rather than re-hardcoding the pair it replaced', () => {
    const gate = readFileSync(join(pluginRoot, 'tests', 'audit', 'citations.test.ts'), 'utf8')
    expect(gate, 'citations.test.ts must import the one sweep implementation').toMatch(/from '\.\/dossier-sweep'/)
    expect(
      gate,
      'citations.test.ts still builds a dossier path by hand — that is the hardcoding AC-7 removes, ' +
        'and it would silently un-enrol sound.md',
    ).not.toMatch(/join\(romStudyDir, '(brief|glossary|sound)\.md'\)/)
  })

  it('sound.md carries a non-trivial set of citations of its own', () => {
    const cites = extractProseCitations(readDossier(SOUND_DOC), SOUND_DOC)
    expect(
      cites.length,
      'the SOUNDS routine, its six tables, three frame gates, seven channel seeds and the attract ' +
        'path do not reduce to a handful of citations — a doc the sweep scans but that carries almost ' +
        'nothing passes coverage vacuously',
    ).toBeGreaterThanOrEqual(20)
  })

  it('every citation in sound.md has a covering claim', () => {
    const missing = uncoveredCitations(loadClaims(), [SOUND_DOC])
    expect(
      missing,
      `these sound.md citations have no claims/*.json entry:\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('MUTATION PROOF: deleting any sound.md citation\'s claim reddens the sweep', () => {
    // The enrollment claim is "sound.md is watched". The only way to know is to
    // break it on purpose. For EVERY citation in the doc, drop the claims that
    // cover it and require the real sweep — the same uncoveredCitations() the
    // gate calls — to name it. A citation that survives its own claim's deletion
    // is prose that merely READS gated.
    const claims = loadClaims()
    const cites = extractProseCitations(readDossier(SOUND_DOC), SOUND_DOC)
    expect(cites.length, 'nothing to mutate — sound.md carries no citations').toBeGreaterThan(0)

    const seen = new Set<string>()
    const survivors: string[] = []
    for (const c of cites) {
      if (seen.has(c.raw)) continue
      seen.add(c.raw)
      const without = claims.filter((cl) => !claimCovers(cl, c))
      expect(without.length, `${c.raw} has no claim to delete — the coverage test above should have caught it`)
        .toBeLessThan(claims.length)
      if (!uncoveredCitations(without, [SOUND_DOC]).includes(c.raw)) survivors.push(c.raw)
    }
    expect(
      survivors,
      'these citations stayed covered after their own claims were deleted, so the sweep is not ' +
        `actually watching them:\n  ${survivors.join('\n  ')}`,
    ).toEqual([])
  })

  it('sound.md spells every citation in the form the sweep can SEE', () => {
    // The extractor matches only the backtick-wrapped `FILE:LINESPEC` form. An
    // unbackticked CENTI4.MAC:2455 and the bare-colon continuation `:2455` are
    // both invisible to it — and an invisible citation is one nothing re-checks,
    // which is how this story's own three line ranges rotted before setup caught
    // them. Strip the backticked spans, then look for what is left.
    const md = readDossier(SOUND_DOC)
    expect(md, `docs/rom-study/${SOUND_DOC} must exist (GREEN writes it)`).not.toBe('')
    const outsideTicks = md.replace(/`[^`]*`/g, '')
    const unbackticked = [...outsideTicks.matchAll(/[\w.]+\.(?:MAC|DOC|MAP):\d+/g)].map((m) => m[0])
    expect(
      [...new Set(unbackticked)],
      'these citations are not backtick-wrapped, so the coverage sweep cannot see them:\n  ' +
        [...new Set(unbackticked)].join('\n  '),
    ).toEqual([])
    const bareColon = [...md.matchAll(/`:\d+(?:-\d+)?`/g)].map((m) => m[0])
    expect(
      [...new Set(bareColon)],
      'these bare-colon references inherit their file from surrounding prose, which no gate can ' +
        'resolve. Spell them in full, e.g. `CENTI4.MAC:2455`:\n  ' + [...new Set(bareColon)].join('\n  '),
    ).toEqual([])
  })
})
