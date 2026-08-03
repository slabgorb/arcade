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
  allMalformedCitations,
  claimCovers,
  extractProseCitations,
  loadClaims,
  pluginRoot,
  readDossier,
  romStudyDir,
  scanProseCitations,
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
  /**
   * `CENTI4.MAC:N` — the `ST[AXY] AUD[FC]n` write that PUTS this cue on
   * `pokeyVoice`. Required for every rom cue.
   *
   * cp6-1 round 2. Until this existed, `pokeyVoice` was the only transcribed
   * field in the fixture with no citation and no ROM cross-check — it was
   * range-checked 0..3 and nothing more, so `segmentKill` could claim voice 3
   * while the ROM wrote `AUDF0`, and the suite stayed green. That hole is not
   * academic: it is why the voice-1 arbitration ruling shipped naming three
   * contenders when this file's own `pokeyVoice` fields name four.
   */
  voiceCite: string | null
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

/**
 * The contention ruling for POKEY voice 1.
 *
 * cp6-1 round 2: this block already existed, but it was declared NOWHERE — not
 * in this interface and not in `fixtureCitations()` — so neither its prose nor
 * its citations were swept by anything, and the ruling inside it was wrong.
 * Declaring it here is half the fix; the tests below are the other half.
 */
interface VoiceArbitration {
  /**
   * The cue keys that contend for the voice, as fixture keys — NOT prose. The
   * ROM decides this set and the tests recover it: every cue whose `voiceCite`
   * writes `AUD[FC]1` is a contender, and nothing else is.
   */
  contenders: string[]
  note: string
  ourShellDiffers: string
  cites: string[]
}

/**
 * The contention ruling for POKEY voice 0 (cp6-3).
 *
 * Same shape as the voice-1 record plus a `winner`, because this contention has
 * one: the player explosion does not merely rank highest, it makes the kill
 * block UNREACHABLE (CENTI4.MAC:2437 is the only reference to label 52$).
 *
 * Declared here for the reason cp6-1 round 2 had to declare its sibling: a
 * top-level record this interface does not name, and `fixtureCitations()` does
 * not walk, is recorded but UNVERIFIED — the fixture's shape is structural, so
 * adding one reddens nothing on its own. See the AC-7 note on the sweep below.
 */
interface Voice0Arbitration {
  contenders: string[]
  /** The cue that takes the voice outright. */
  winner: string
  note: string
  ourShellDiffers: string
  cites: string[]
}

interface SoundFixture {
  /** Must name src/shell/timebase.ts's FRAME_HZ — AC-3 forbids re-deriving it. */
  frameHzSource: string
  /** How lengthSeconds is obtained. Written down so cp6-2 reads a number. */
  derivation: string
  voiceArbitration: VoiceArbitration
  /** cp6-3. Optional in the TYPE only so this file still reads a cp6-1-era
   *  fixture; the sweep below treats a missing record as zero citations, and
   *  voice0-contention.test.ts is what requires it to be there. */
  voice0Arbitration?: Voice0Arbitration
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

/**
 * Parse `CENTI4.MAC:2463-2464` → { file, start, end }; throws on anything else.
 *
 * Accepts null/undefined deliberately, and names the field when it gets one.
 * Every caller reaches a `*Cite` field whose nullability the surrounding filter
 * does not always guarantee — `tableCues()` filters on `freqTable`, not on
 * `tableCite` — and the old signature took `string`, so those calls were made
 * through an `as string` cast. The cast did not make the value a string: it
 * only silenced the checker, and a missing citation arrived as
 * `Cannot read properties of undefined (reading 'match')` with no field name in
 * it. A gate whose failure mode is an unattributed TypeError is a gate nobody
 * can act on.
 */
function parseCite(cite: string | null | undefined, where: string): { file: string; start: number; end: number } {
  if (typeof cite !== 'string' || cite.trim() === '') {
    throw new Error(
      `${where}: no citation recorded (${cite === undefined ? 'field absent from the fixture' : JSON.stringify(cite)}). ` +
        'Every fact this fixture states about the machine must name the line it came from — ' +
        'an uncited constant cannot fail a gate, it can only read plausibly.',
    )
  }
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

/**
 * Every `CENTI4.MAC:N[-M]` citation the fixture carries, with where it came from.
 *
 * cp6-1 round 2: this used to walk `.cues` ONLY, which meant the top-level
 * `voiceArbitration.cites` — six citations backing the least obvious ruling in
 * the document — were swept by nothing at all. Replacing them with six wrong
 * line numbers left the whole suite green. The fixture's citations are now
 * enumerated from BOTH places, so a citation cannot escape the AC-2 sweep by
 * living outside the cue map.
 */
function fixtureCitations(): { cite: string; where: string }[] {
  const out: { cite: string; where: string }[] = []
  const fixture = loadFixture()
  for (const [name, cue] of Object.entries(fixture.cues)) {
    const fields: (keyof CueRuling)[] = [
      'tableCite',
      'contCite',
      'computedCite',
      'channelCite',
      'seedCite',
      'voiceCite',
      'frameGateCite',
      'loopCite',
    ]
    for (const f of fields) {
      const v = cue[f]
      if (typeof v === 'string' && v !== '') out.push({ cite: v, where: `cues.${name}.${String(f)}` })
    }
  }
  // Every top-level arbitration record's citations, not just the first one's.
  //
  // cp6-3: this walked `voiceArbitration` ALONE, and that was the exact failure
  // the gate exists to prevent — a voice-0 record's citations would have been
  // recorded and re-opened by nothing, which is worse than absent because it
  // reads gated. Written as a list rather than a second hardcoded block so the
  // NEXT record is enrolled by adding one key, not by remembering this function.
  const records: [string, { cites?: string[] } | undefined][] = [
    ['voiceArbitration', fixture.voiceArbitration],
    ['voice0Arbitration', fixture.voice0Arbitration],
  ]
  for (const [where, arb] of records) {
    if (!arb || !Array.isArray(arb.cites)) continue
    arb.cites.forEach((cite, i) => {
      if (typeof cite === 'string' && cite !== '') out.push({ cite, where: `${where}.cites[${i}]` })
    })
  }
  return out
}

/**
 * lang-review #15: a universally-quantified sweep whose every iteration can
 * `continue` asserts nothing at all, and it fails by PASSING. Every loop below
 * therefore states the population it must actually have visited, and the floor
 * is chosen not to shrink under the defect the loop guards: the ROM drives seven
 * channels and defines six frequency tables, so a ruling that visits fewer has
 * lost cues rather than found fewer.
 */
function expectPopulated(n: number, floor: number, what: string): void {
  expect(
    n,
    `${what}: this sweep would have examined ${n} entries (floor ${floor}) — below that it passes ` +
      'without checking anything, which is the shape of a green gate that measures itself',
  ).toBeGreaterThanOrEqual(floor)
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
// THE ROM READERS ARE THEMSELVES PINNED (lang-review #18).
// countByteOperands and decodeImmediate reimplement two things the MACRO
// assembler did in 1981: counting `.BYTE` operands and deciding a literal's
// radix. A test helper that reimplements an algorithm is untested code — it gets
// the easy shape right, the awkward one wrong, and it fails toward GREEN. So
// both are pinned against values read out of CENTI4.MAC by hand this session,
// BEFORE anything downstream is allowed to trust them.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the ROM readers this suite depends on', () => {
  it('countByteOperands counts each of the six tables as hand-verified', () => {
    const lines = centi4()
    // [label, start, end, operands] — read off the vendored file by hand.
    // FREQ4 is the only table that spans two lines (8 then 9), which is exactly
    // the case a single-line counter would get wrong and never be told about.
    const TABLES: [string, number, number, number][] = [
      ['FREQ0', 2455, 2455, 19],
      ['CONT0', 2456, 2456, 19],
      ['FREQ1', 2457, 2457, 7],
      ['CONT1', 2458, 2458, 7],
      ['FREQ2', 2459, 2459, 11],
      ['FREQ3', 2461, 2461, 20],
      ['CONT3', 2462, 2462, 20],
      ['FREQ4', 2463, 2464, 17],
      ['FREQ6', 2465, 2465, 20],
    ]
    for (const [label, start, end, want] of TABLES) {
      expect(lines[start], `fixture drift: CENTI4.MAC:${start} is no longer ${label}`).toMatch(
        new RegExp(`^${label}:`),
      )
      expect(countByteOperands(lines, start, end), `${label} at :${start}-${end}`).toBe(want)
    }
    // The trailing `;EXPLOSION SOUND` comment must not be counted as an operand.
    expect(lines[2455]).toContain(';')
  })

  it('there is no FREQ5 — the player explosion is FREQ0 made louder, not a table', () => {
    // A reader who assumed FREQ0..FREQ6 were contiguous would invent a table the
    // machine does not have and bake a sound nobody wrote.
    const src = centi4().slice(2450, 2470).join('\n')
    expect(src, 'FREQ5 must not exist anywhere in the table block').not.toMatch(/^FREQ5:/m)
    expect(centi4()[2449], 'the player explosion instead adds hex 02 to CONT0 to increase volume')
      .toMatch(/ADC\s+I,02/)
  })

  it('decodeImmediate reads each channel seed in the radix the ROM spells', () => {
    const lines = centi4()
    // [channel, seed start, seed end, decoded value]. Two of the seven carry a
    // trailing period and are DECIMAL; the rest are hex. Read all seven one way
    // and CHAN4 becomes 23 against a 17-byte table, CHAN6 becomes 32 against a
    // 20-byte one — the systematic misread, not a typo.
    const SEEDS: [string, number, number, number][] = [
      ['CHAN0 (kill)', 2299, 2300, 19], // LDA I,13   — hex
      ['CHAN0 (segment)', 1881, 1882, 19], // LDA I,13   — hex
      ['CHAN1', 1288, 1289, 7], // LDA I,07   — hex
      ['CHAN2', 2133, 2134, 11], // LDA I,0B   — hex
      ['CHAN3', 430, 431, 20], // LDA I,14   — hex
      ['CHAN4', 1994, 1995, 17], // LDA I,17.  — DECIMAL
      ['CHAN5', 1811, 1812, 19], // LDA I,13   — hex
      ['CHAN6', 2024, 2025, 20], // LDA I,20.  — DECIMAL
    ]
    for (const [label, start, end, want] of SEEDS) {
      expect(decodeImmediate(lines, start, end), `${label} seed at :${start}-${end}`).toEqual({
        line: start,
        value: want,
      })
    }
    // The discriminator: the two decimal seeds must NOT read as hex.
    expect(parseInt('17', 16), 'if :1994 were read as hex it would be 23, not 17').toBe(23)
    expect(parseInt('20', 16), 'if :2024 were read as hex it would be 32, not 20').toBe(32)
  })
})

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
// AC-6 — CENTIPEDE IS STILL SILENT WHEN cp6-1 CLOSES.
//
// cp6-1 shipped three guards here. TWO WERE SCOPE FENCES FOR cp6-1 AND ARE
// RETIRED BY cp6-2, which is the story they name: they asserted that
// `tools/pokey-bake/` does NOT exist and that `deploy-assets` does NOT mention
// centipede, and their own failure messages say "belongs to cp6-2, not cp6-1"
// and "adding centipede to deploy-assets is cp6-2". cp6-2 has now built the
// baker and extended the recipe, so both fences forbid the very work they were
// holding the door open for.
//
// This is the same class as the four cp5 guards cp6-2 inverted in
// tests/audio-seam-scope.test.ts, and it is worth being explicit about why they
// are DELETED rather than inverted: a guard reading "the baker exists" belongs
// to the story that built it, and it already exists — the whole of
// tools/pokey-bake/bake-sfx.test.mjs asserts what that baker does.
//
// The THIRD guard survives unchanged. It is about cp6-1's own deliverable, the
// dossier's truth-in-reporting clause, and cp6-2 does not touch the dossier.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp6-1 AC-6 — the dossier reports its own scope honestly', () => {
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
    const all = Object.entries(loadFixture().cues)
    expectPopulated(all.length, 14, 'origin/note sweep')
    for (const [name, cue] of all) {
      expect(cue.origin, `cues.${name}.origin must be "rom" or "invention"`).toMatch(/^(rom|invention)$/)
      expect(typeof cue.note, `cues.${name}.note must be a string`).toBe('string')
      expect(cue.note.trim(), `cues.${name}.note must say what the ruling IS — a blank note is a silent claim`)
        .not.toBe('')
    }
  })

  it('every ROM-sourced cue names its channel and cites primary source — a table OR a computation', () => {
    expectPopulated(romCues().length, 7, 'ROM-sourced cue sweep')
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
    // cp6-1 round 2: the only loop in this file that carried no population floor,
    // against the rule stated at the top of it. Relabel all fourteen cues "rom"
    // and every assertion below would stop executing while the test stayed green.
    const inventions = Object.values(loadFixture().cues).filter((c) => c.origin === 'invention')
    expectPopulated(inventions.length, 3, 'invention sweep')
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

  it('the ruling transcribes all SIX frequency tables the ROM defines — and never a seventh', () => {
    // A count of table-backed cues is not enough: six cues could all point at
    // FREQ0 and leave five tables unclaimed, which is a sound engine half
    // transcribed. The tables are the deliverable, so enumerate them.
    // There is deliberately no FREQ5 — the player explosion replays FREQ0 with
    // `ADC I,02`, so a cue naming FREQ5 has invented a table the machine lacks.
    const ROM_TABLES = ['FREQ0', 'FREQ1', 'FREQ2', 'FREQ3', 'FREQ4', 'FREQ6']
    const named = new Set(tableCues().map(([, c]) => c.freqTable))
    expect(
      ROM_TABLES.filter((t) => !named.has(t)),
      'these ROM frequency tables are transcribed by NO cue — the ruling covers part of the engine',
    ).toEqual([])
    expect(
      [...named].filter((t) => t !== null && !ROM_TABLES.includes(t)),
      'these tables do not exist in CENTI4.MAC — note there is no FREQ5, so naming one is an invention',
    ).toEqual([])
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
    expectPopulated(tableCues().length, 6, 'table-definition sweep')
    for (const [name, cue] of tableCues()) {
      const { start } = parseCite(cue.tableCite, `cues.${name}.tableCite`)
      expect(
        lines[start] ?? '',
        `cues.${name} says it transcribes ${cue.freqTable}, but CENTI4.MAC:${start} does not define it — ` +
          'naming a table without pointing at it is how an invention reads as authentic',
      ).toMatch(new RegExp(`^${cue.freqTable}:`))
    }
  })

  it.skipIf(!vendoredAvailable)('a cue\'s channelCite and seedCite really touch that channel', () => {
    const lines = centi4()
    const channelled = romCues().filter(([, c]) => c.channel !== null)
    expectPopulated(channelled.length, 7, 'channel/seed citation sweep')
    for (const [name, cue] of channelled) {
      const ch = cue.channel
      const { start } = parseCite(cue.channelCite, `cues.${name}.channelCite`)
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
    const seeded = romCues().filter(([, c]) => c.seedCite !== null)
    expectPopulated(seeded.length, 7, 'seed-constant claim sweep')
    for (const [name, cue] of seeded) {
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
    const timed = romCues().filter(([, c]) => c.lengthFrames !== null)
    expectPopulated(timed.length, 7, 'lengthSeconds derivation sweep')
    for (const [name, cue] of timed) {
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
    const timed = tableCues().filter(([, c]) => c.lengthFrames !== null)
    expectPopulated(timed.length, 6, 'seed-vs-table-length sweep')
    for (const [name, cue] of timed) {
      expect(
        cue.lengthFrames,
        `cues.${name}: the countdown seed (${cue.lengthFrames}) and ${cue.freqTable}'s byte count ` +
          `(${cue.tableLengthBytes}) disagree. In this ROM they are equal in every channel — a ` +
          'mismatch usually means the seed was read in the wrong radix.',
      ).toBe(cue.tableLengthBytes)
    }
  })

  it('a looping cue quotes the ROM saying so; a one-shot claims no such line', () => {
    expectPopulated(romCues().length, 7, 'loop-citation sweep')
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
    const seeded = romCues().filter(([, c]) => c.seedCite !== null && c.lengthFrames !== null)
    expectPopulated(seeded.length, 7, 'seed-radix recovery sweep')
    for (const [name, cue] of seeded) {
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
    expectPopulated(tableCues().length, 6, '.BYTE operand-count sweep')
    for (const [name, cue] of tableCues()) {
      const { start, end } = parseCite(cue.tableCite, `cues.${name}.tableCite`)
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
    // cp6-1 round 2 (Reviewer H4): this swept tableCues() — romCues() filtered on
    // `freqTable !== null` — which excluded the ONE cue whose frequency the ROM
    // computes. `fleaLoop` therefore carried `contImmediate: "0xA4"` with
    // `contCite: null` and was never checked against anything: rewriting it to
    // "0xFF" left all 1075 centipede tests green. Every rom cue writes an AUDC
    // byte, so every rom cue is swept here now, and the `.filter` below is on the
    // field this loop actually reads rather than on a neighbouring one.
    expectPopulated(romCues().length, 7, 'control-byte sweep')
    for (const [name, cue] of romCues()) {
      const hasTable = cue.contTable !== null
      const hasImm = cue.contImmediate !== null
      expect(
        hasTable !== hasImm,
        `cues.${name}: give it EITHER contTable (the ROM indexes a CONTn table) OR contImmediate ` +
          "(the ROM writes a fixed control byte, e.g. FREQ2's `LDA I,64`), never both and never neither",
      ).toBe(true)
      expect(
        cue.contCite,
        `cues.${name} records a control byte but cites nowhere for it. AC-2: every transcribed ` +
          'constant carries a claims entry the gate re-opens, and a value with no line number ' +
          'cannot fail — it can only read plausibly. The flea path loads its byte at ' +
          'CENTI4.MAC:2415.',
      ).not.toBeNull()
      const { start, end } = parseCite(cue.contCite, `cues.${name}.contCite`)
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
    expectPopulated(romCues().length, 7, 'frame-gate sweep')
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
    expectPopulated(romCues().length, 7, 'gate-citation sweep')
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
    const gated = romCues().filter(([, c]) => c.frameGate !== 1 && c.frameGateCite !== null)
    expectPopulated(gated.length, 3, 'gate-mask sweep')
    for (const [name, cue] of gated) {
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
    expectPopulated(fixtureCitations().length, 20, 'fixture-citation sweep')
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

  it('cp6-3 — the sweep visits EVERY top-level record that carries citations, not just the first', () => {
    // The test above cannot catch its own blind spot. `fixtureCitations()` used
    // to walk `voiceArbitration` ALONE, so a second arbitration record's
    // citations would have been swept by nothing — and the test above would
    // still have passed, because a citation the sweep never emits is a citation
    // it never finds missing. Recorded but unverified is worse than absent: it
    // READS gated. (The fixture's TS shape is structural with no exhaustive
    // key assertion, so adding a record reddens nothing on its own either.)
    //
    // Derived from the fixture rather than naming the two records, so the THIRD
    // one is enrolled by adding a key or fails here — which is the failure mode
    // this whole test exists for.
    const visited = new Set(fixtureCitations().map((c) => c.where.split('.')[0]))
    const withCites = Object.entries(loadFixture() as unknown as Record<string, unknown>)
      .filter(([, v]) => Array.isArray((v as { cites?: unknown } | null)?.cites))
      .map(([k]) => k)
    expect(
      withCites.length,
      'fewer than two top-level records carry `cites`, so "every record" is a claim about one ' +
        'thing and this test proves nothing',
    ).toBeGreaterThan(1)
    expect(
      withCites.filter((r) => !visited.has(r)),
      'these fixture records carry citations that fixtureCitations() never emits, so the claim ' +
        'gate never re-opens them:\n  ' + withCites.filter((r) => !visited.has(r)).join('\n  '),
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

// ─────────────────────────────────────────────────────────────────────────────
// ROUND 2 — WHAT THE REVIEWER PROVED THE FIRST PASS COULD NOT SEE.
//
// The first RED built a suite that re-derives lengths, tables, radices and gates
// from the ROM, and those guards hold. It left one transcribed field with NO
// cross-check at all — `pokeyVoice` — and swept the control byte only over cues
// that own a frequency TABLE, which excluded the one cue the ROM computes.
//
// Both holes were proved by mutation against the COMMITTED artifacts, not argued:
//
//   • `segmentKill.pokeyVoice` 0 → 3, while the ROM writes AUDF0 at :2423 …… 42/42 GREEN
//   • `fleaLoop.contImmediate` "0xA4" → "0xFF", uncited entirely ………………… 1075/1075 GREEN
//
// And the cost of the first hole was not hypothetical. `voiceArbitration` rules
// that three cues contend for POKEY voice 1. The ROM has FOUR `STA AUDF1`, and
// this same fixture already marks four cues `pokeyVoice: 1`. Nothing could see
// the contradiction because nothing read `pokeyVoice` against the machine.
//
// So the rule these tests encode is one rule, applied twice: A TRANSCRIBED FIELD
// THAT CITES NOTHING IS A GUESS WITH A LINE NUMBER'S AUTHORITY. Every fact the
// fixture states about the machine must name the instruction it came from, and
// the instruction must say it.
// ─────────────────────────────────────────────────────────────────────────────

/** The `ST[AXY] AUD[FC]n` writes inside SOUNDS, excluding the attract-mode mute. */
function audfWriters(lines: string[], voice: number): number[] {
  const out: number[] = []
  // SOUNDS runs :2322-2451. The attract path zeroes all four AUDC with STX at
  // :2332-2335 before returning — that silences every voice and belongs to no
  // cue, so it is not a writer. Keying on STA excludes it by opcode.
  for (let i = 2322; i <= 2451; i++) {
    if (new RegExp(`STA\\s+AUDF${voice}\\b`).test(lines[i] ?? '')) out.push(i)
  }
  return out
}

describe('cp6-1 round 2 — pokeyVoice is recovered from the ROM, not asserted', () => {
  it.skipIf(!vendoredAvailable)('every ROM cue cites the register write that puts it on its voice', () => {
    const lines = centi4()
    expectPopulated(romCues().length, 7, 'voice-citation sweep')
    const missing = romCues()
      .filter(([, c]) => typeof c.voiceCite !== 'string' || c.voiceCite === '')
      .map(([n]) => n)
    expect(
      missing,
      'these ROM cues record a pokeyVoice but cite nothing for it. pokeyVoice says which POKEY ' +
        'voice the cue occupies — the fact cp6-2 needs in order to know what can sound at once — ' +
        'so it must cite the `STA AUDFn` that does it. The eight writes are CENTI4.MAC:2349 ' +
        '(spider), :2357 (shot), :2382 (bonus), :2392 (scorpion), :2414 (flea), :2423 ' +
        '(explosions), :2433 (march), :2445 (player explosion). Missing: ' +
        `${missing.join(', ')}`,
    ).toEqual([])
    for (const [name, cue] of romCues()) {
      const { start } = parseCite(cue.voiceCite, `cues.${name}.voiceCite`)
      expect(
        lines[start] ?? '',
        `cues.${name}.voiceCite → CENTI4.MAC:${start} is not a POKEY register write`,
      ).toMatch(/ST[AXY]\s+AUD[FC][0-3]\b/)
    }
  })

  it.skipIf(!vendoredAvailable)('pokeyVoice EQUALS the voice the cited write targets', () => {
    // The mutation this exists to kill: set any cue's pokeyVoice to a number the
    // ROM does not write and require red. Before this test, segmentKill could
    // claim voice 3 against `STA AUDF0` and nothing objected.
    const lines = centi4()
    const voiced = romCues().filter(([, c]) => typeof c.voiceCite === 'string' && c.voiceCite !== '')
    expectPopulated(voiced.length, 7, 'pokeyVoice cross-check')
    for (const [name, cue] of voiced) {
      const { start } = parseCite(cue.voiceCite, `cues.${name}.voiceCite`)
      const m = (lines[start] ?? '').match(/ST[AXY]\s+AUD[FC]([0-3])\b/)
      expect(m, `cues.${name}.voiceCite → CENTI4.MAC:${start} writes no AUD register`).not.toBeNull()
      expect(
        Number((m as RegExpMatchArray)[1]),
        `cues.${name}.pokeyVoice is ${cue.pokeyVoice}, but CENTI4.MAC:${start} writes ` +
          `${(m as RegExpMatchArray)[0].trim()} — voice ${(m as RegExpMatchArray)[1]}`,
      ).toBe(cue.pokeyVoice)
    }
  })
})

describe('cp6-1 round 2 — the voice-1 contention ruling is recovered from the ROM', () => {
  it.skipIf(!vendoredAvailable)('the ROM has exactly FOUR writers of POKEY voice 1', () => {
    // Recovered, not restated. If this number ever changes the ruling below is
    // stale by construction, and the failure names the lines rather than a count.
    const writers = audfWriters(centi4(), 1)
    expect(
      writers,
      'SOUNDS should contain exactly four `STA AUDF1` — the bonus (:2382), the scorpion (:2392), ' +
        'the computed flea (:2414) and the march (:2433), all converging on the single ' +
        '`STA AUDC1` at :2435',
    ).toEqual([2382, 2392, 2414, 2433])
  })

  it.skipIf(!vendoredAvailable)('voiceArbitration.contenders is EXACTLY the set of cues on voice 1', () => {
    const lines = centi4()
    const writers = new Set(audfWriters(lines, 1))
    const onVoice1 = romCues()
      .filter(([, c]) => typeof c.voiceCite === 'string' && c.voiceCite !== '')
      .filter(([, c]) => writers.has(parseCite(c.voiceCite, 'voiceCite').start))
      .map(([n]) => n)
      .sort()
    expectPopulated(onVoice1.length, 4, 'voice-1 contender recovery')

    const declared = [...(loadFixture().voiceArbitration?.contenders ?? [])].sort()
    expect(
      declared,
      'voiceArbitration.contenders must name every cue whose voiceCite writes AUDF1 and no other. ' +
        'The ruling as first written named three (march, flea, scorpion) and omitted `bonusLife`, ' +
        'while listing `spiderLoop` — which writes AUDF3 at :2349 and never contends for this ' +
        'voice at all. The ROM says the contenders are: ' +
        `${onVoice1.join(', ')}.`,
    ).toEqual(onVoice1)
  })

  it('every cue the fixture marks pokeyVoice 1 is a declared contender', () => {
    // The contradiction that shipped: FOUR cues carried pokeyVoice 1 while the
    // arbitration note named three. Two statements in one file that cannot both
    // be right, and nothing compared them.
    const fixture = loadFixture()
    const marked = Object.entries(fixture.cues)
      .filter(([, c]) => c.pokeyVoice === 1)
      .map(([n]) => n)
      .sort()
    expectPopulated(marked.length, 4, 'pokeyVoice-1 membership')
    expect(
      [...(fixture.voiceArbitration?.contenders ?? [])].sort(),
      `these cues carry pokeyVoice: 1 — ${marked.join(', ')} — so they contend by this file's own ` +
        'account. voiceArbitration must say the same thing the cue map says.',
    ).toEqual(marked)
  })

  it.skipIf(!vendoredAvailable)('the ruling cites the gate that decides the PRIORITY, not just the writers', () => {
    // Naming the four contenders is half a ruling. The other half is which one
    // wins, and that is decided before the arbitration block is ever reached:
    // `LDY CHAN4 / BEQ 48$` at :2373-2374 means a live bonus tone skips the
    // whole of 48$, so bonus preempts scorpion, flea and march alike. A ruling
    // that cites only :2396-2435 has recorded the contenders and missed the
    // outcome — which is exactly how "priority runs scorpion, flea, march" got
    // written down.
    const lines = centi4()
    expect(lines[2373] ?? '', 'CENTI4.MAC:2373 should read the bonus countdown').toMatch(/LDY\s+CHAN4\b/)
    expect(lines[2374] ?? '', 'CENTI4.MAC:2374 should branch past the arbitration').toMatch(/BEQ\s+48\$/)

    const cites = loadFixture().voiceArbitration?.cites ?? []
    const covers = cites.some((c) => {
      const { start, end } = parseCite(c, 'voiceArbitration.cites')
      return start <= 2374 && end >= 2373
    })
    expect(
      covers,
      'voiceArbitration.cites must include the CHAN4 preemption test at CENTI4.MAC:2373-2374. ' +
        `Cited today: ${cites.join(', ') || '(nothing)'}`,
    ).toBe(true)
  })

  it('the prose names the same contenders the fixture does', () => {
    // The fixture is what cp6-2 consumes, but the prose is what a human reads,
    // and they disagreed: §2.5 listed `spiderLoop` among the cues that "ring
    // simultaneously" where the cabinet would not, though it is on voice 3 and
    // rings alongside voice 1 on the cabinet too.
    const md = readDossier(SOUND_DOC)
    const heading = md.split('\n').findIndex((l) => /^#{2,4}\s.*voice\s*1/i.test(l))
    expect(heading, `${SOUND_DOC} must carry a section about POKEY voice 1 contention`).toBeGreaterThan(-1)
    const rest = md.split('\n').slice(heading + 1)
    const endRel = rest.findIndex((l) => /^#{2,4}\s/.test(l))
    const section = (endRel === -1 ? rest : rest.slice(0, endRel)).join('\n')

    const contenders = new Set(loadFixture().voiceArbitration?.contenders ?? [])
    const cueNames = Object.keys(loadFixture().cues)
    const named = cueNames.filter((n) => new RegExp('`' + n + '`').test(section))
    expectPopulated(named.length, 4, 'prose contender sweep')
    expect(
      named.filter((n) => !contenders.has(n)),
      'the voice-1 section names these cues as if they contended, but voiceArbitration.contenders ' +
        'does not list them. A cue on another POKEY voice is not preempted and must not be ' +
        'described as though it were.',
    ).toEqual([])
    expect(
      [...contenders].filter((n) => !named.includes(n)),
      'these declared contenders are never named in the voice-1 section — the prose and the ' +
        'fixture must rule the same way',
    ).toEqual([])
  })
})

describe('cp6-1 round 2 — the sweep reports what it cannot parse', () => {
  it('a malformed linespec is REPORTED, never silently dropped', () => {
    // Proof the detector bites, on synthetic input, before it is pointed at the
    // real docs — otherwise "no malformed citations" is indistinguishable from
    // "the detector never fires".
    const scan = scanProseCitations('see `CENTI4.MAC:2463-24-64` and `CENTI4.MAC:2455` and `CENTI4.MAC:2465-2455`')
    expect(scan.citations.map((c) => c.raw), 'the well-formed citation must still be extracted').toEqual([
      'CENTI4.MAC:2455',
    ])
    expect(
      scan.malformed,
      'a linespec the grammar cannot parse must surface, not vanish — a dropped citation is one ' +
        'nothing re-checks, and the coverage sweep would call the doc fully covered',
    ).toEqual(['CENTI4.MAC:2463-24-64', 'CENTI4.MAC:2465-2455'])
  })

  it('no enrolled dossier file carries a malformed citation', () => {
    const bad = allMalformedCitations()
    expect(bad, `these citations look like line references but cannot be parsed:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  it('EVERY enrolled dossier file carries citations of its own, not just the set as a whole', () => {
    // The aggregate floor in citations.test.ts is >20 across all three files.
    // brief.md and glossary.md contribute 32 and 24 today, so either could be
    // rewritten into total invisibility and the total would still clear the bar
    // on the strength of the other two. A floor that a file can fall to zero
    // beneath is a floor for the wrong thing.
    const empty = DOSSIER_FILES.filter((f) => extractProseCitations(readDossier(f), f).length === 0)
    expect(
      empty,
      `these enrolled dossier files contribute NO citations, so the coverage sweep proves nothing ` +
        `about them: ${empty.join(', ')}`,
    ).toEqual([])
    for (const f of DOSSIER_FILES) {
      expect(
        extractProseCitations(readDossier(f), f).length,
        `${f} is enrolled in DOSSIER_FILES but carries almost no citations — an enrolled doc that ` +
          'cites nothing passes coverage vacuously',
      ).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('cp6-1 round 2 — the prose quotes the machine accurately', () => {
  it.skipIf(!vendoredAvailable)('every ROM comment sound.md quotes is REAL and sits on a cited line', () => {
    // The doc quotes the 1981 comments as evidence, in backticks, leading `;`.
    // Two things can go wrong and both did somewhere in this repo's history: the
    // quote can be a paraphrase the machine never wrote, or it can be real but
    // attributed to a neighbouring line. `;1/4 SECOND BOUNDARY` was both — the
    // ROM says `;IF NOT 1/4 SECOND BOUNDARY` at :1287, and the prose cited
    // :1286 and :1289 around it.
    const md = readDossier(SOUND_DOC)
    const lines = centi4()
    const norm = (s: string): string => s.split(/\s+/).join(' ').trim()
    const cited = new Set<number>()
    for (const c of extractProseCitations(md, SOUND_DOC)) {
      for (let i = c.start; i <= c.end; i++) cited.add(i)
    }
    const quotes = [...new Set([...md.matchAll(/`(;[^`]+)`/g)].map((m) => norm(m[1])))]
    expectPopulated(quotes.length, 5, 'ROM comment-quote sweep')

    const notInRom: string[] = []
    const uncited: string[] = []
    for (const q of quotes) {
      const hits: number[] = []
      for (let i = 1; i < lines.length; i++) if (norm(lines[i]).includes(q)) hits.push(i)
      if (!hits.length) notInRom.push(q)
      else if (!hits.some((h) => cited.has(h))) uncited.push(`${q} (ROM lines ${hits.join(', ')})`)
    }
    expect(
      notInRom,
      'these strings are quoted as the ROM\'s own words but appear nowhere in CENTI4.MAC. Quote ' +
        'the comment as written or stop presenting it as a quotation:\n  ' + notInRom.join('\n  '),
    ).toEqual([])
    expect(
      uncited,
      'these ROM comments are quoted accurately but the line carrying each one is never cited, so ' +
        'the claim gate never re-opens it:\n  ' + uncited.join('\n  '),
    ).toEqual([])
  })
})
