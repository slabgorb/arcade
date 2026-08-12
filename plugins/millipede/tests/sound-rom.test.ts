// tests/sound-rom.test.ts
//
// Story ml6-1 — RED phase (TEA / Leeloo). The PURE two-POKEY, eight-voice
// SOUND-DRIVER seam: the millipede half of centipede's SOUNDS routine, ported
// as cited envelope DATA plus the pure functions that read it. Mirrors the
// plugin's own gfx-rom.ts shape (src/shell, bytes/indices in → plain data out,
// no fetch/DOM/canvas/clock/entropy) so vitest exercises it in Node. The actual
// tone generation (binding these sweeps to @shared/synth) and the gesture gate
// are ml6-2 — OUT OF SCOPE here.
//
// ─── THE DRIVER LAW (cited into the VENDORED source — GPL: MAME never copied) ──
// Every citation is into reference/original-source/millipede/{MLIRQ,MLDEF}.MAC
// (the ml1-vendored tree the citation gate re-opens byte-for-byte). MLDEF.MAC is
// `.RADIX 16` (MLDEF.MAC:2) — hex unless a number carries a trailing `.`.
//
//   • CHANNELS. `NCHAN =11.` (MLDEF.MAC:190) is DECIMAL 11 — the ROM's own top
//     index over CHAN0..CHAN11 (MLDEF.MAC:311-323), i.e. TWELVE sound slots.
//     Read as hex, `11` would be 17 and the roster would be wrong: the radix
//     trap this suite guards. The slots, in order (MLDEF.MAC:312-323):
//       0 beetle · 1 centipede · 2 explosion · 3 spider · 4 fly(dragonfly)
//       5 mosquito · 6 shot · 7 bee · 8 inchworm · 9 earwig
//       10 player-explosion · 11 bonus-life
//
//   • TWO POKEYS, split by index. SOUNDS does `AND I,0F` / `CPX I,08` /
//     `BCC …USE LOWER POKEY` (MLIRQ.MAC:54-58): a slot with index < 8 writes the
//     LOWER POKEY (#0) — AUDF0=$400 / AUDC0=$401 (MLDEF.MAC:83-84); index >= 8
//     writes the UPPER POKEY (#1) — AUDF1=$800 / AUDC1=$801 (MLDEF.MAC:96-97).
//     (Which of a POKEY's four voices a slot lands on — the priority/contention
//     logic at MLIRQ.MAC:20-23,66-73 — is NOT pinned here; that is ml6-2's
//     wiring concern. This seam pins only WHICH CHIP, the one clean fact.)
//
//   • THE MASK IS THE TEMPO. Each slot has a frame-mask (MLIRQ.MAC:121-123):
//       3,1,3,7, 3,0,3,3, 3,3,7,1F
//     SOUNDS updates a slot only when `(MASK[i] AND INTCT) == 0` (MLIRQ.MAC:
//     17-19: `LDA X,MASK / AND $INTCT / BNE …skip`). mask 0 → every interrupt;
//     mask 1 → every 2nd; mask 3 → every 4th; mask 1F → every 32nd. INTCT is
//     the interrupt counter (MLDEF.MAC:339).
//
//   • THE SWEEP IS THE SOUND. A slot's FREQ/CONT pointer (MLIRQ.MAC:124-147)
//     names a TABLE (MLIRQ.MAC:148-239): the frequency and the volume/control
//     STEP frame-to-frame — that stepping IS the effect. A driver that emits a
//     slot's first value forever is flat beeps, not millipede (the silent-
//     feature trap, playbook §4). A pointer of 0 (dragonfly slot 4, bee slot 7:
//     MLIRQ.MAC:128,131,140,143) means "the program stuffs POKEY directly"
//     (MLIRQ.MAC:100-111) — the driver synthesizes NO frequency sweep for those.
//
//   • PLAY ORDER IS NOT PINNED HERE, DELIBERATELY. SOUNDS reads its tables via
//     negative-Y indexing off a `table-1` pointer (MLIRQ.MAC:38-40) and the
//     header says the bytes are stored "IN THE OPPOSITE ORDER WRITTEN TO THE
//     POKEY" (MLIRQ.MAC:106-107) — so emission is very likely the table
//     REVERSED. TEA did not confirm the vendored `NY` macro's exact semantics,
//     so no test below asserts a direction: the sweep tests compare as
//     multisets / endpoints / monotonic-either-way, all true forward OR
//     reversed. GREEN owns nailing the direction against the macro and logging
//     it as a deviation. (See this story's Delivery Finding.)
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/shell/sound-rom.ts — a PURE module (no fetch/DOM/canvas/clock/entropy;
//   the ml1-1 purity scanner sweeps its source, AC-7). Exports:
//     NCHAN: number                                   // 11 (decimal; 12 slots)
//     EFFECT_NAMES: readonly string[]                 // length 12, the roster
//     pokeyOf(index: number): 0 | 1                   // 0..7 → 0, 8..11 → 1
//     MASK: readonly number[]                         // length 12, the tempos
//     shouldTick(index: number, intct: number): boolean   // (MASK[i] & intct)===0
//     freqSweep(index: number): readonly number[]     // AUDF values in play order; [] if ptr 0
//     contSweep(index: number): readonly number[]     // AUDC values in play order
//   Every table Dev transcribes carries a citations.test.ts-gated claim quoting
//   the MLIRQ/MLDEF lines VERBATIM out of the vendored file (the ml2-3
//   palette-claims pattern; loadClaims() enrols a new claims/*.json by glob).
//
// OUT OF SCOPE (recorded, not built): binding sweeps to @shared/synth, the
// gesture/autoplay gate, mapping game events → slots, attract-mode muting
// (MLIRQ.MAC:30-31 `LDA MODE / BMI …` — MODE is game state, so its wiring is
// ml6-2), and the per-voice contention within a POKEY.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const soundRomPath = join(root, 'src', 'shell', 'sound-rom.ts')

interface SoundRomModule {
  NCHAN: number
  EFFECT_NAMES: readonly string[]
  pokeyOf(index: number): 0 | 1
  MASK: readonly number[]
  shouldTick(index: number, intct: number): boolean
  freqSweep(index: number): readonly number[]
  contSweep(index: number): readonly number[]
}

/**
 * Load the not-yet-built module with a self-describing failure (the ml1-1
 * loadScanner idiom shared with gfx-rom.test.ts): the specifier is assembled at
 * runtime so neither tsc nor the bundler resolves it statically, and a missing
 * module reads as "sound-rom not built yet", never a collect-time stack trace.
 */
async function loadSoundRom(): Promise<SoundRomModule> {
  const parts = ['..', 'src', 'shell', 'sound-rom.js']
  try {
    const mod = (await import(/* @vite-ignore */ new URL(parts.join('/'), import.meta.url).href)) as SoundRomModule
    if (typeof mod.freqSweep !== 'function') throw new Error('module has no `freqSweep` export')
    return mod
  } catch (e) {
    throw new Error(
      'sound-rom seam not built yet: GREEN ships plugins/millipede/src/shell/sound-rom.ts ' +
        'exporting NCHAN / EFFECT_NAMES / pokeyOf / MASK / shouldTick / freqSweep / contSweep — ' +
        `see this file’s header for the driver law (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── The ROM tables, hand-transcribed from the VENDORED source for the four
//     representative effects this RED pins. Every entry is cited to its exact
//     MLIRQ.MAC line; the numbers are hex to read 1:1 against the `.RADIX 16`
//     listing. GREEN transcribes all twelve slots WITH claims; these four are
//     the behavioural anchors. ───────────────────────────────────────────────

// FREQ2 — EXPLOSION frequency, MLIRQ.MAC:166-174 (main body :166-170, DDT
// explosion extension :171-174). The main body is the F0→10 descent.
const FREQ2 = [
  0x00, 0x00, 0x00, 0x00, // :166
  0xf0, 0xe0, 0xd0, 0xc0, // :167
  0xb0, 0xa0, 0x90, 0x80, // :168
  0x70, 0x60, 0x50, 0x40, // :169
  0x30, 0x20, 0x10, 0x10, // :170
  0x14, 0x20, 0x18, 0x1c, // :171  DDT EXPLOSION EXTENSION
  0x24, 0x20, 0x28, 0x30, // :172
  0x26, 0x20, 0x24, 0x1c, // :173
  0x14, 0x10, 0x18, 0x10, // :174
]

// CONT2 — EXPLOSION control/volume, MLIRQ.MAC:175-183. Low nibble = POKEY
// volume; it climbs 1→F under distortion nibble 8. The rising body is :175-179.
const CONT2 = [
  0x00, 0x00, 0x00, 0x81, // :175
  0x81, 0x82, 0x82, 0x83, // :176
  0x83, 0x84, 0x84, 0x85, // :177
  0x85, 0x86, 0x86, 0x87, // :178
  0x87, 0x88, 0x88, 0x89, // :179
  0x89, 0x89, 0x8a, 0x8a, // :180  DDT EXPLOSION EXTENSION
  0x8a, 0x8b, 0x8b, 0x8b, // :181
  0x8c, 0x8c, 0x8d, 0x8d, // :182
  0x8e, 0x8e, 0x8f, 0x8f, // :183
]

// CONT1 — CENTIPEDE-feet control, MLIRQ.MAC:158-165. The REST frames (0x00)
// interleaved with voiced 0xA3+ bytes are the walking PULSE; a driver that
// drops the rests plays a drone, not footsteps.
const CONT1 = [
  0x00, 0x00, 0x00, 0x00, // :158
  0xa3, 0xa4, 0xa5, 0xa6, // :159
  0x00, 0x00, 0x00, 0x00, // :160
  0xa4, 0xa5, 0xa6, 0xa7, // :161
  0x00, 0x00, 0x00, 0x00, // :162
  0xa5, 0xa6, 0xa7, 0xa8, // :163
  0x00, 0x00, 0x00, 0xa8, // :164
  0xa9, 0xaa, 0xab, 0xac, // :165
]

// FREQ10 — PLAYER-EXPLOSION frequency, MLIRQ.MAC:225-229. A clean strictly-
// descending 50→02 fall.
const FREQ10 = [
  0x50, 0x4c, 0x48, 0x44, // :225
  0x40, 0x3c, 0x38, 0x34, // :226
  0x30, 0x2c, 0x28, 0x24, // :227
  0x20, 0x1c, 0x18, 0x14, // :228
  0x0d, 0x09, 0x05, 0x02, // :229
]

// FREQ6 — SHOT frequency, MLIRQ.MAC:212-214. Descends F0→50. Slot 6's CONT
// pointer is the CONSTANT 0x68 (MLIRQ.MAC:142 `.WORD 68`), not a table — so the
// shot holds one volume while its pitch falls.
const FREQ6 = [
  0xf0, 0xe0, 0xd0, 0xc0, // :212
  0xb0, 0xa0, 0x90, 0x80, // :213
  0x70, 0x60, 0x50, //        :214
]
const SHOT_CONT = 0x68 // MLIRQ.MAC:142

const sorted = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)
const distinct = (xs: readonly number[]): number => new Set(xs).size
/** Monotonic in EITHER direction (plateaus allowed) — true of a table and of
 *  its reverse, so it proves a real ramp without asserting a play direction. */
const isMonotonic = (xs: readonly number[]): boolean => {
  const nonDec = xs.every((v, i) => i === 0 || v >= xs[i - 1])
  const nonInc = xs.every((v, i) => i === 0 || v <= xs[i - 1])
  return nonDec || nonInc
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the pure driver seam exists in src/shell/sound-rom.ts.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-1 — the pure sound-driver seam exists', () => {
  it('GREEN ships src/shell/sound-rom.ts — the plugin’s sound-ROM module', () => {
    expect(
      existsSync(soundRomPath),
      'src/shell/sound-rom.ts not built yet — the pure two-POKEY driver the ml6-2 ' +
        'synth binding and event wiring consume',
    ).toBe(true)
  })

  it('exports the driver surface: NCHAN, EFFECT_NAMES, pokeyOf, MASK, shouldTick, freqSweep, contSweep', async () => {
    const m = await loadSoundRom()
    expect(typeof m.NCHAN).toBe('number')
    expect(Array.isArray(m.EFFECT_NAMES)).toBe(true)
    expect(typeof m.pokeyOf).toBe('function')
    expect(Array.isArray(m.MASK)).toBe(true)
    expect(typeof m.shouldTick).toBe('function')
    expect(typeof m.freqSweep).toBe('function')
    expect(typeof m.contSweep).toBe('function')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the roster: NCHAN is DECIMAL 11 (12 slots), names per CHAN0..11.
// The radix trap: read as hex, 11 → 17 and the roster is wrong.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-2 — twelve sound slots (NCHAN = decimal 11), the ROM roster', () => {
  it('NCHAN is 11 (decimal top index over CHAN0..CHAN11), NOT hex 0x11=17', async () => {
    const { NCHAN } = await loadSoundRom()
    expect(NCHAN).toBe(11) // MLDEF.MAC:190 `NCHAN =11.` under .RADIX 16 (MLDEF.MAC:2)
    expect(NCHAN).not.toBe(0x11)
  })

  it('EFFECT_NAMES has twelve entries — CHAN0..CHAN11 (MLDEF.MAC:312-323)', async () => {
    const { EFFECT_NAMES, NCHAN } = await loadSoundRom()
    expect(EFFECT_NAMES).toHaveLength(12)
    expect(EFFECT_NAMES).toHaveLength(NCHAN + 1) // NCHAN is the TOP index, not the count
  })

  it('the roster names, in order, match the ROM channel comments', async () => {
    const { EFFECT_NAMES } = await loadSoundRom()
    // MLDEF.MAC:312-323 — one CHANn per line; matched case-insensitively so the
    // exact spelling (dragonfly vs fly, player-explosion vs player explosion) is
    // Dev's to choose, but the CREATURE at each index is fixed.
    const expected = [
      'beetle', 'centipede', 'explosion', 'spider', 'fly', 'mosquito',
      'shot', 'bee', 'inchworm', 'earwig', 'player', 'bonus',
    ]
    const lower = EFFECT_NAMES.map((n) => n.toLowerCase())
    expected.forEach((needle, i) => {
      expect(lower[i], `slot ${i} should name the ${needle} sound`).toContain(needle)
    })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — POKEY routing: index < 8 → lower POKEY (#0), index >= 8 → upper (#1).
// The boundary is MLIRQ.MAC:57-58 (CPX I,08 / BCC USE LOWER POKEY).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-3 — two POKEYs, split at index 8', () => {
  it('slots 0..7 route to the lower POKEY (#0), slots 8..11 to the upper (#1)', async () => {
    const { pokeyOf } = await loadSoundRom()
    for (let i = 0; i <= 7; i++) expect(pokeyOf(i), `slot ${i}`).toBe(0)
    for (let i = 8; i <= 11; i++) expect(pokeyOf(i), `slot ${i}`).toBe(1)
  })

  it('the split is exactly at 8 — slot 7 is lower, slot 8 is upper (BCC I,08)', async () => {
    const { pokeyOf } = await loadSoundRom()
    // A `<= 8` or `< 7` off-by-one lands the boundary slots on the wrong chip.
    expect(pokeyOf(7)).toBe(0)
    expect(pokeyOf(8)).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the mask is the tempo: a slot updates iff (MASK[i] & intct) === 0.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-4 — MASK gates each slot’s update cadence', () => {
  it('MASK is the twelve ROM frame-masks (MLIRQ.MAC:121-123)', async () => {
    const { MASK } = await loadSoundRom()
    expect([...MASK]).toEqual([0x3, 0x1, 0x3, 0x7, 0x3, 0x0, 0x3, 0x3, 0x3, 0x3, 0x7, 0x1f])
  })

  it('shouldTick fires on (MASK[i] & intct) === 0 — every-frame / every-2nd / every-4th / every-32nd', async () => {
    const { shouldTick } = await loadSoundRom()
    // slot 5 mask 0x00 → every interrupt
    for (let t = 0; t < 8; t++) expect(shouldTick(5, t), `slot5 t=${t}`).toBe(true)
    // slot 1 mask 0x01 → even interrupts only
    expect(shouldTick(1, 0)).toBe(true)
    expect(shouldTick(1, 1)).toBe(false)
    expect(shouldTick(1, 2)).toBe(true)
    // slot 0 mask 0x03 → every 4th
    expect(shouldTick(0, 0)).toBe(true)
    expect(shouldTick(0, 1)).toBe(false)
    expect(shouldTick(0, 3)).toBe(false)
    expect(shouldTick(0, 4)).toBe(true)
    // slot 11 mask 0x1F → every 32nd
    expect(shouldTick(11, 0)).toBe(true)
    expect(shouldTick(11, 16)).toBe(false)
    expect(shouldTick(11, 32)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — THE SWEEP IS THE SOUND. Every table-backed slot's frequency and volume
// STEP across the effect; none may flatten to a beep. Compared as multisets /
// endpoints / monotonic-either-way, so a correct GREEN passes whichever play
// direction the NY read turns out to be (see header + Delivery Finding).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-5 — the frequency/volume sweeps carry the ROM envelopes', () => {
  it('explosion (slot 2) frequency is the FREQ2 table — never a flat beep', async () => {
    const { freqSweep } = await loadSoundRom()
    const sweep = freqSweep(2)
    expect(distinct(sweep), 'a flat/constant frequency is a beep, not an explosion').toBeGreaterThan(1)
    expect(sorted(sweep), 'exact FREQ2 bytes, none invented or dropped').toEqual(sorted(FREQ2))
    expect(Math.min(...sweep)).toBe(Math.min(...FREQ2)) // spans the table's full
    expect(Math.max(...sweep)).toBe(Math.max(...FREQ2)) // range (0x00 rests → 0xF0)
  })

  it('explosion (slot 2) volume climbs — CONT2, a rising envelope not a fixed level', async () => {
    const { contSweep } = await loadSoundRom()
    const cont = contSweep(2)
    expect(distinct(cont)).toBeGreaterThan(1)
    expect(sorted(cont)).toEqual(sorted(CONT2))
    // the loud end (0x89) and the ramp foot (0x81) are both present
    expect(cont).toContain(0x81)
    expect(cont).toContain(0x89)
  })

  it('centipede feet (slot 1) keep their REST frames — CONT1 pulses, not a drone', async () => {
    const { contSweep } = await loadSoundRom()
    const cont = contSweep(1)
    expect(sorted(cont)).toEqual(sorted(CONT1))
    expect(cont, 'the interleaved 0x00 rests are the footstep pulse').toContain(0x00)
    expect(cont.some((v) => v >= 0xa3), 'and the voiced steps are present too').toBe(true)
    expect(cont.filter((v) => v === 0x00).length, 'CONT1 holds 15 rest frames').toBe(15)
  })

  it('player explosion (slot 10) is a clean monotonic fall — FREQ10, 0x50 → 0x02', async () => {
    const { freqSweep } = await loadSoundRom()
    const sweep = freqSweep(10)
    expect(distinct(sweep)).toBeGreaterThan(1)
    expect(sorted(sweep)).toEqual(sorted(FREQ10))
    expect(isMonotonic(sweep), 'a strictly-ramping fall, forward or reversed').toBe(true)
  })

  it('shot (slot 6) sweeps frequency F0→50 over a CONSTANT volume 0x68', async () => {
    const { freqSweep, contSweep } = await loadSoundRom()
    const sweep = freqSweep(6)
    expect(distinct(sweep)).toBeGreaterThan(1)
    expect(sorted(sweep)).toEqual(sorted(FREQ6))
    expect(isMonotonic(sweep)).toBe(true)
    // slot 6's CONT pointer is the constant 0x68, not a table (MLIRQ.MAC:142)
    const cont = contSweep(6)
    expect(cont.length).toBeGreaterThan(0)
    expect(new Set(cont)).toEqual(new Set([SHOT_CONT]))
  })

  it('NO table-backed slot degrades to a flat beep — the silent-feature guard', async () => {
    const { freqSweep } = await loadSoundRom()
    // Slots 4 (dragonfly) and 7 (bee) have a 0 FREQ pointer — the program stuffs
    // POKEY directly (MLIRQ.MAC:128,131), so they legitimately synthesize NO
    // frequency sweep. Every OTHER slot names a real FREQ table and must move.
    const externallyStuffed = new Set([4, 7])
    for (let i = 0; i <= 11; i++) {
      if (externallyStuffed.has(i)) continue
      expect(distinct(freqSweep(i)), `slot ${i} must sweep, not beep`).toBeGreaterThan(1)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — externally-stuffed slots (FREQ pointer 0) synthesize no sweep.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-6 — dragonfly (4) and bee (7) are program-stuffed, no FREQ table', () => {
  it('freqSweep(4) and freqSweep(7) are empty — the program stuffs POKEY (MLIRQ.MAC:100-111,128,131)', async () => {
    const { freqSweep } = await loadSoundRom()
    expect(freqSweep(4), 'dragonfly frequency is stuffed by the game, not swept').toHaveLength(0)
    expect(freqSweep(7), 'bee frequency is stuffed by the game, not swept').toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-7 — the whole driver loop moves, and the seam stays pure. Ties routing +
// cadence + sweep together: the definitive "not a static beep" proof, built
// from the exported functions ONLY (no reach into Dev's internals).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml6-1 AC-7 — the driver plays a moving sweep, purely', () => {
  it('playing the explosion across masked frames emits a CHANGING frequency on POKEY #0', async () => {
    const { freqSweep, shouldTick, pokeyOf } = await loadSoundRom()
    const seq = freqSweep(2)
    // Advance one table step each interrupt the mask admits (MASK[2]=3 → 4th).
    const emitted: number[] = []
    let step = 0
    for (let intct = 0; step < seq.length && intct < seq.length * 8; intct++) {
      if (shouldTick(2, intct)) {
        emitted.push(seq[step])
        step++
      }
    }
    expect(emitted).toHaveLength(seq.length)
    expect(new Set(emitted).size, 'the emitted pitch SWEEPS frame-to-frame').toBeGreaterThan(1)
    expect(pokeyOf(2), 'explosion is a lower-POKEY voice').toBe(0)
  })

  it('the ml1-1 purity scanner finds nothing in src/shell/sound-rom.ts', () => {
    expect(existsSync(soundRomPath), 'src/shell/sound-rom.ts not built yet — nothing to scan').toBe(true)
    // Pure driver DATA: no fetch, DOM, canvas, clock, or entropy. It runs under
    // vitest's Node env today and any Node consumer tomorrow, so it is held to
    // the same purity as core (the gfx-rom.ts precedent).
    const hits = violations(readFileSync(soundRomPath, 'utf8'), 'sound-rom.ts')
    expect(hits, `purity violations in sound-rom.ts: ${hits.join(', ')}`).toEqual([])
  })

  it('no MAME / GPL code crosses the seam — the tables cite VENDORED .MAC only', () => {
    expect(existsSync(soundRomPath)).toBe(true)
    const src = readFileSync(soundRomPath, 'utf8')
    // The millipede sound source is the vendored MLIRQ/MLDEF.MAC — MAME is not
    // even needed here. A `.cpp` citation would mean MAME leaked into the port.
    expect(src, 'no .cpp (MAME) citation belongs in the sound driver').not.toMatch(/\.cpp\b/)
  })
})
