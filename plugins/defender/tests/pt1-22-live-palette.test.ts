// plugins/defender/tests/pt1-22-live-palette.test.ts
//
// Story pt1-22 — RED phase (Tyr One-Handed / TEA). Root cause R1 of the 2026-08-20
// Defender gameplay render audit, ruled by ADR-0007 decision 1: the palette is FROZEN
// at boot defaults. shell/render.ts:41 resolves CRAM once at module load and decodes
// every frame through it; core carries no live PCRAM shadow and writes no colour
// registers. So palette index 1 (LASER) and indices A-F stay $00 = black forever, and
// every Williams colour-cycle effect is dead: the player laser is drawn correctly every
// frame in PURE BLACK ON BLACK (core/scene.ts:113 LASER_COLOUR=1; core/palette.ts:25
// DEFAULT_PCRAM[1]=$00), the bomb/TIE/pod sprites render black, and the mutant's one
// index-12 pixel never shimmers.
//
// ─── THE ROM FACTS THIS PINS ─────────────────────────────────────────────────────
//   • The frame IRQ copies the 16-byte PCRAM shadow into hardware CRAM EVERY FRAME
//     (defender/DEFA7.SRC:1968-1980, "*COLOR MAPPING"); CRINIT seeds PCRAM from CRTAB
//     at boot (defender/DEFA7.SRC:1057). PCRAM is live RAM the game mutates at runtime.
//   • At player-start the game spawns THREE STANDING colour-cycle processes
//     (defender/DEFA7.SRC:1283-1288 NEWP COLR/CBOMB/TIECOL,STYPE) — they run for the
//     whole life, not per-entity:
//       - COLR   (defender/DEFA7.SRC:3024-3043): walks COLTAB, one entry per SLEEP #2,
//                stores it to PCRAM+1 (index 1 = LASER), wraps at the $00 terminator.
//       - CBOMB  (defender/DEFB6.SRC:1213-1228): flashes PCRAM+$A (10) and PCRAM+$C (12)
//                — $FF, then COLTAB[SEED AND $1F]; the index-12 write IS the mutant
//                shimmer (SCZP1's index-12 pixel).
//       - TIECOL (defender/DEFB6.SRC:1195-1209): walks TCTAB in 3-byte rows into
//                PCRAM+$D/$E/$F (13/14/15), one row per NAP 6.
//   • Index $B (11) is the PLAYER-DEATH register (defender/DEFA7.SRC:1364 PDTH) and
//     index 5 is the per-wave WCTAB colour — NEITHER is a live play cycler here; the
//     death/effect visuals are pt1-25's scope (ADR-0007 decision 2, R2).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
//   • SimState has no `pcram` field — createSim(rand) does not expose the live shadow.
//   • stepSim runs no colour cyclers — nothing mutates a colour register, ever.
//   • render.ts caches `const CRAM = resolveCram(DEFAULT_PCRAM)` at module load and
//     `indexToRgba(index)` reads it; there is no way to decode a LIVE palette per frame.
//   • core/color-cycle.ts (COLTAB/TCTAB + the pure cycler steps) does not exist.
//   The loaders below throw a self-describing "not built yet" until GREEN builds these,
//   so the whole suite stays collectable and each test reds with an actionable message.
//
// ─── PROPOSED SEAM (TEA's contract — Dev MAY rename, but a rename means updating this
//     file, so the names are the cheap path; df3-6-live-sim precedent) ──────────────
//   // core/sim.ts — SimState gains the live shadow; createSim seeds it; stepSim cycles it:
//   interface SimState { …; readonly pcram: readonly number[] }   // 16 bytes, BBGGGRRR
//   // core/color-cycle.ts — the ported ROM tables (byte-verified by the citation gate,
//   // NOT re-transcribed here — lang-review #18/#26: a fixture whose value IS the
//   // expectation checks nothing) plus the pure per-tick cycler steps:
//   export const COLTAB: readonly number[]   // defender/DEFA7.SRC:3037-3043
//   export const TCTAB:  readonly number[]   // defender/DEFB6.SRC:1207-1209 (3 rows x 3)
//   // shell/render.ts — the decode reads a SUPPLIED palette (the live path passes
//   // sim.pcram; the static/attract path may still pass DEFAULT_PCRAM):
//   export function indexToRgba(index: number, cram?: readonly number[]): Rgba
//   export function render(ctx, fb, pcram?: readonly number[]): void
//
// This suite owns SHAPE + WIRING + the R1 bug + the ADR-0005 area-safety invariant.
// Byte-accuracy of COLTAB/TCTAB belongs to the citation gate (a new claims/*.json).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Variable specifiers so `tsc --noEmit` does not statically resolve modules whose future
// shape does not exist yet (sim.ts has no `pcram`; core/color-cycle.ts is unbuilt) — a
// literal path would be TS2307 / TS2352 during RED. vitest still resolves them at runtime,
// so the loaders throw and report the self-describing "not built yet" messages below.
const SIM_SPECIFIER = '../src/core/sim.js'
const RENDER_SPECIFIER = '../src/shell/render.js'
const CYCLE_SPECIFIER = '../src/core/color-cycle.js'
const PALETTE_SPECIFIER = '../src/core/palette.js'

// ─── Loaders (lazy, self-describing) ──────────────────────────────────────────────

interface LivePaletteInput {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
  readonly smartBomb?: boolean
  readonly hyperspace?: boolean
}
const NEUTRAL: LivePaletteInput = { thrust: false, reverse: false, up: false, down: false, fire: false }

/** The minimum observable slice of SimState this suite reads. */
interface SimStateView {
  readonly pcram: readonly number[]
}
interface SimModule {
  createSim: (rand: () => number) => SimStateView
  stepSim: (state: SimStateView, input: LivePaletteInput) => SimStateView
}

async function loadSim(): Promise<SimModule> {
  const mod = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
  if (typeof mod.createSim !== 'function' || typeof mod.stepSim !== 'function')
    throw new Error(
      'core/sim.ts must expose createSim(rand) + stepSim(state, input) with a live ' +
        '`readonly pcram: readonly number[]` on SimState (ADR-0007 decision 1).',
    )
  const probe = mod.createSim(mulberry32(1))
  if (!Array.isArray((probe as { pcram?: unknown }).pcram))
    throw new Error(
      'SimState has no live `pcram` shadow yet — GREEN (Dev) adds `readonly pcram: ' +
        'readonly number[]` to SimState, seeds it from DEFAULT_PCRAM in createSim (the ' +
        'CRINIT copy, defender/DEFA7.SRC:1057), and advances the standing colour cyclers ' +
        'each tick in stepSim (COLR/CBOMB/TIECOL, defender/DEFA7.SRC:1283-1288).',
    )
  return mod as SimModule
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}
interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
}
interface RenderModule {
  indexToRgba: (index: number, cram?: readonly number[]) => Rgba
  render: (ctx: unknown, fb: Framebuffer, pcram?: readonly number[]) => void
}
async function loadRender(): Promise<RenderModule> {
  const mod = (await import(/* @vite-ignore */ RENDER_SPECIFIER)) as Partial<RenderModule>
  if (typeof mod.indexToRgba !== 'function' || typeof mod.render !== 'function')
    throw new Error('render.ts must export indexToRgba + render.')
  // The live-decode contract: indexToRgba must accept and honour a supplied palette so
  // render can decode this frame's sim.pcram (the R1 fix), instead of the module-load
  // `const CRAM = resolveCram(DEFAULT_PCRAM)` cache it reads today.
  return mod as RenderModule
}

interface CycleModule {
  COLTAB: readonly number[]
  TCTAB: readonly number[]
}
async function loadCycle(): Promise<CycleModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CYCLE_SPECIFIER)) as Partial<CycleModule>
    if (!Array.isArray(mod.COLTAB) || !Array.isArray(mod.TCTAB)) throw new Error('missing COLTAB / TCTAB')
    return mod as CycleModule
  } catch (e) {
    throw new Error(
      'core/color-cycle.ts not built yet — GREEN (Dev) ports the ROM colour tables under ' +
        'the citation gate: COLTAB (the laser/bomb table, defender/DEFA7.SRC:3037-3043) and ' +
        `TCTAB (the TIE table, defender/DEFB6.SRC:1207-1209). (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/** A tiny deterministic PRNG so two runs with the same seed draw the same bytes — the
 *  clone injects entropy (stars/CBOMB's SEED); core stays pure. Returns a byte 0..255. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) & 0xff
  }
}

/** Palette register indices the ROM colour-cycles during live play, and the ones it
 *  must NOT (ADR-0005: no >3 Hz strobe over a large area — index 0 is the whole-screen
 *  background). Named as ROM facts, not magic numbers. */
const LASER = 1 // COLR -> PCRAM+1
const BOMB_A = 0xa // CBOMB -> PCRAM+$A (10)
const BOMB_C = 0xc // CBOMB -> PCRAM+$C (12) — also the mutant SCZP1 index-12 pixel
const TIE_D = 0xd // TIECOL -> PCRAM+$D (13)
const TIE_E = 0xe // TIECOL -> PCRAM+$E (14)
const TIE_F = 0xf // TIECOL -> PCRAM+$F (15)
const CYCLED = [LASER, BOMB_A, BOMB_C, TIE_D, TIE_E, TIE_F] as const
const BACKGROUND = 0 // SPACE — a full-screen area; a >3 Hz cycle here is a seizure risk
const DEATH_REG = 0xb // player-death register (PDTH) — pt1-25's scope, NOT cycled here
/** The nine fixed named colours the ROM never cycles in play (index 5 = per-wave WCTAB
 *  is left out: it is set once at wave start, stable within a wave, out of pt1-22). */
const FIXED_NAMED = [2, 3, 4, 6, 7, 8, 9] as const

/** Play `n` live ticks from a fresh sim and capture every tick's pcram snapshot
 *  (index 0 = the boot state). NEUTRAL input: the standing cyclers run regardless of
 *  what the player does — they are life-scoped, not entity-scoped. */
async function playPcram(seed: number, n: number): Promise<number[][]> {
  const { createSim, stepSim } = await loadSim()
  let s = createSim(mulberry32(seed))
  const frames: number[][] = [[...s.pcram]]
  for (let i = 0; i < n; i++) {
    s = stepSim(s, NEUTRAL)
    frames.push([...s.pcram])
  }
  return frames
}

/** The distinct values register `idx` took across a run of pcram snapshots. */
function valuesAt(frames: readonly number[][], idx: number): number[] {
  return frames.map((f) => f[idx])
}

/** How many consecutive ticks register `idx` holds its FIRST stored value once it leaves
 *  `bootValue` — i.e. the cycler's hold cadence in ticks (its SLEEP/NAP argument). Returns
 *  -1 if the register never leaves its boot value. */
function firstHoldTicks(frames: readonly number[][], idx: number, bootValue: number): number {
  const seq = valuesAt(frames, idx)
  const start = seq.findIndex((v) => v !== bootValue)
  if (start < 0) return -1
  const held = seq[start]
  let run = 0
  while (start + run < seq.length && seq[start + run] === held) run++
  return run
}

// A minimal framebuffer and a recording 2D-context mock (mirrors render.test.ts) so the
// render() live-decode wiring is testable in vitest's `node` env with no real canvas.
function fb(width: number, height: number, laserCell?: number): Framebuffer {
  const data = new Uint8Array(width * height)
  if (laserCell !== undefined) data[laserCell] = LASER // one pixel drawn in the laser index
  return { width, height, data }
}
function makeCtx(cw: number, ch: number) {
  const images: Uint8ClampedArray[] = []
  const rec = (...args: unknown[]): void => {
    const img = args[0] as { data?: Uint8ClampedArray } | undefined
    if (img && img.data instanceof Uint8ClampedArray) images.push(Uint8ClampedArray.from(img.data))
  }
  return {
    canvas: { width: cw, height: ch },
    fillStyle: '',
    fillRect: (): void => {},
    createImageData: (w: number, h: number) => {
      if (!(w > 0) || !(h > 0)) throw new RangeError(`createImageData: ${w}x${h}`)
      return { data: new Uint8ClampedArray((w | 0) * (h | 0) * 4), width: w, height: h }
    },
    putImageData: (img: unknown) => rec(img),
    /** The bytes of the last ImageData blitted, or null. */
    lastImage(): Uint8ClampedArray | null {
      return images.length ? images[images.length - 1] : null
    },
  }
}

// ─── 1. SimState carries the live PCRAM shadow ────────────────────────────────────

describe('pt1-22 · the live PCRAM shadow on SimState (ADR-0007 decision 1)', () => {
  it('createSim exposes a 16-byte pcram, each an integer 0..255', async () => {
    const { createSim } = await loadSim()
    const s = createSim(mulberry32(7))
    expect(s.pcram.length, 'PCRAM is 16 registers (defender/PHR6.SRC:219 PCRAM RMB 16)').toBe(16)
    for (const [i, b] of s.pcram.entries()) {
      expect(Number.isInteger(b), `register ${i} is an integer byte`).toBe(true)
      expect(b, `register ${i} in 0..255`).toBeGreaterThanOrEqual(0)
      expect(b, `register ${i} in 0..255`).toBeLessThanOrEqual(255)
    }
  })

  it('boots seeded from DEFAULT_PCRAM (the CRINIT copy, defender/DEFA7.SRC:1057)', async () => {
    const { createSim } = await loadSim()
    const { DEFAULT_PCRAM } = (await import(/* @vite-ignore */ PALETTE_SPECIFIER)) as { DEFAULT_PCRAM: readonly number[] }
    // The boot shadow IS the default table — this is the frozen state the bug leaves in
    // place forever. DEFAULT_PCRAM is imported (not re-typed) so the two exports must
    // agree; the citation gate owns DEFAULT_PCRAM's bytes (lang-review #26).
    expect([...createSim(mulberry32(3)).pcram]).toEqual([...DEFAULT_PCRAM])
  })

  it('is immutable across a tick — stepSim returns a NEW pcram, never mutating the prior state', async () => {
    const { createSim, stepSim } = await loadSim()
    const s0 = createSim(mulberry32(9))
    const before = [...s0.pcram]
    const s1 = stepSim(s0, NEUTRAL)
    // The previous state's array is untouched (persistent update), and the cyclers have
    // advanced at least one register, so the new shadow differs from the boot state.
    expect([...s0.pcram], 's0.pcram must not be mutated in place').toEqual(before)
    expect([...s1.pcram], 'stepSim must advance the live shadow').not.toEqual(before)
  })
})

// ─── 2. The frame decode reads the LIVE shadow (the R1 bug) ────────────────────────

describe('pt1-22 · indexToRgba decodes the LIVE palette, not a module-load cache (R1)', () => {
  it('honours the supplied palette — two shadows differing at a register decode differently', async () => {
    const { indexToRgba } = await loadRender()
    const a = new Array(16).fill(0)
    const b = new Array(16).fill(0)
    a[LASER] = 0x38 // COLTAB[0], a lit laser colour
    b[LASER] = 0x00 // still background-black
    // The frozen implementation ignores its palette argument and reads the module `CRAM`,
    // so it returns the SAME colour for both — this reds it. A live decode returns two
    // different colours for register 1.
    expect(indexToRgba(LASER, a)).not.toEqual(indexToRgba(LASER, b))
  })

  it('the laser is no longer black-on-black once play has cycled register 1 (the reported bug)', async () => {
    const { indexToRgba } = await loadRender()
    const frames = await playPcram(11, 120)
    // Find a frame where the standing COLR process has lit the laser register.
    const lit = frames.find((f) => f[LASER] !== f[BACKGROUND])
    expect(lit, 'the laser register must differ from the background within 2s of play (COLR)').toBeTruthy()
    const cram = lit as number[]
    // Decoded through the live shadow, the laser pixel is a DIFFERENT colour from the
    // background it is drawn on — the owner-reported "I can't see my laser fire" is fixed.
    expect(
      indexToRgba(LASER, cram),
      'laser (index 1) must decode to a colour distinct from the background (index 0)',
    ).not.toEqual(indexToRgba(BACKGROUND, cram))
  })

  it('render() consults the palette it is given — same framebuffer, two shadows, two images', async () => {
    const { render } = await loadRender()
    // One 8x8 frame with a single laser pixel; render it under two shadows that differ
    // only at the laser register. A render that decodes the LIVE palette produces two
    // different images; the frozen render (ignores the arg) produces byte-identical ones.
    const litLaser = new Array(16).fill(0)
    litLaser[LASER] = 0xff
    const darkLaser = new Array(16).fill(0)
    darkLaser[LASER] = 0x00
    const ctxA = makeCtx(8, 8)
    const ctxB = makeCtx(8, 8)
    render(ctxA, fb(8, 8, 0), litLaser)
    render(ctxB, fb(8, 8, 0), darkLaser)
    const imgA = ctxA.lastImage()
    const imgB = ctxB.lastImage()
    expect(imgA, 'render must blit an image').not.toBeNull()
    expect(imgB, 'render must blit an image').not.toBeNull()
    expect(
      Array.from(imgA as Uint8ClampedArray),
      'render decoded both frames identically — it is not reading the live palette (R1)',
    ).not.toEqual(Array.from(imgB as Uint8ClampedArray))
  })
})

// ─── 3. The laser colour cycler (COLR / COLTAB) ───────────────────────────────────

describe('pt1-22 · the laser colour cycler animates index 1 through COLTAB (COLR, DEFA7.SRC:3024-3043)', () => {
  it('index 1 leaves black and walks a real table — many distinct values, all in COLTAB', async () => {
    const { COLTAB } = await loadCycle()
    const frames = await playPcram(5, 200)
    const seq = valuesAt(frames, LASER)
    const nonBlack = seq.filter((v) => v !== 0x00)
    expect(nonBlack.length, 'the laser register must light up during play (COLR is a standing process)').toBeGreaterThan(0)
    const distinct = new Set(nonBlack)
    // A real table walk visits many entries, not one or two. COLTAB is 36 colours; a
    // cycler stuck on a single value (or toggling two) fails this floor. The number is
    // pinned so a "lit but not cycling" regression reds (lang-review #29).
    expect(distinct.size, 'index 1 must cycle through many COLTAB entries, not toggle').toBeGreaterThanOrEqual(20)
    // Every value the cycler emits is a member of the ported table — this wires the
    // observable animation to COLTAB (imported, not re-transcribed: the citation gate
    // owns its bytes). A cycler pointed at the wrong table reds here.
    const table = new Set(COLTAB)
    for (const v of distinct)
      expect(table.has(v), `laser value 0x${v.toString(16)} is not in COLTAB — wrong table wired`).toBe(true)
  })

  it('the cycle wraps — the laser RETURNS to COLTAB[0] and re-walks (COLR loops, not a one-shot ramp)', async () => {
    // COLR resets LCOLRX at the COLTAB $00 terminator (defender/DEFA7.SRC:3028 BEQ COLR)
    // and re-walks from the top. Assert the wrap DIRECTLY (not "some value recurs" — COLTAB
    // has adjacent duplicate pairs 0x47/0x87/0xc7 that a single monotonic pass already
    // "revisits" with zero wraparound): COLTAB[0] (0x38, UNIQUE in the table) is stored once
    // per pass, so it must recur. A one-shot ramp that freezes at the $00 terminator hits
    // 0x38 exactly once (at the very start) and never again; deleting the terminator reset
    // reddens this. 36 non-terminator entries × LASER_PERIOD(2) = 72 ticks/pass; 200 ≈ 2.7.
    const { COLTAB } = await loadCycle()
    const START = COLTAB[0]
    const seq = valuesAt(await playPcram(6, 200), LASER)
    // Count run-STARTS of COLTAB[0] (the 2-tick hold counts once): ≥2 ⇒ the walk wrapped
    // back to the top of the table at least once.
    let entries = 0
    for (let i = 0; i < seq.length; i++) if (seq[i] === START && (i === 0 || seq[i - 1] !== START)) entries++
    expect(entries, 'COLTAB[0] must recur — COLR wraps at the $00 terminator and re-walks from the top').toBeGreaterThanOrEqual(2)
  })

  it('each laser colour is held for the ROM cadence — SLEEP #2 = 2 ticks (load-bearing)', async () => {
    // COLR sleeps SLEEP #2 between stores (defender/DEFA7.SRC:3031 LDA #2 / :3033 JMP SLEEP),
    // so each laser colour must persist for exactly 2 sim ticks. LASER_CADENCE_TICKS is the
    // ROM magnitude read from the source, NOT the private LASER_PERIOD const — halving the
    // cadence (LASER_PERIOD 2→1) reddens this (lang-review #29: cited constants load-bearing).
    const LASER_CADENCE_TICKS = 2
    const { COLTAB } = await loadCycle()
    const seq = valuesAt(await playPcram(6, 60), LASER)
    // COLTAB[0] (0x38, unique) is the first store; measure its hold before the walk advances.
    const start = seq.indexOf(COLTAB[0])
    expect(start, 'the laser must light within a few ticks').toBeGreaterThan(0)
    let run = 0
    while (start + run < seq.length && seq[start + run] === COLTAB[0]) run++
    expect(run, 'the laser holds each colour for exactly the ROM cadence (SLEEP #2 = 2 ticks)').toBe(LASER_CADENCE_TICKS)
  })
})

// ─── 4. The bomb & TIE cyclers (CBOMB / TIECOL) ───────────────────────────────────

describe('pt1-22 · the bomb & TIE cyclers animate indices A/C and D/E/F', () => {
  it('every A-F play cycler register leaves black during play (CBOMB A/C, TIECOL D/E/F)', async () => {
    const frames = await playPcram(13, 240)
    for (const idx of [BOMB_A, BOMB_C, TIE_D, TIE_E, TIE_F]) {
      const lit = valuesAt(frames, idx).some((v) => v !== 0x00)
      expect(
        lit,
        `register 0x${idx.toString(16)} never left black — its standing cycler ` +
          '(CBOMB defender/DEFB6.SRC:1213-1228 / TIECOL defender/DEFB6.SRC:1195-1209) is not running',
      ).toBe(true)
    }
  })

  it('the TIE registers D/E/F cycle through TCTAB rows (TIECOL, DEFB6.SRC:1195-1209)', async () => {
    const { TCTAB } = await loadCycle()
    // TCTAB is 3 rows of 3 bytes; TIECOL stores a row into PCRAM+$D/$E/$F each NAP 6
    // (LDD ,X++ -> PCRAM+$D/$E ; LDA ,X+ -> PCRAM+$F). So every (D,E,F) triple the sim
    // shows must be one of the table's rows. Reds a cycler wired to the wrong table or
    // storing the bytes in the wrong order.
    expect(TCTAB.length % 3, 'TCTAB is whole 3-byte rows').toBe(0)
    const rows = new Set<string>()
    for (let i = 0; i < TCTAB.length; i += 3) rows.add(`${TCTAB[i]},${TCTAB[i + 1]},${TCTAB[i + 2]}`)
    const frames = await playPcram(17, 240)
    const triples = new Set(frames.map((f) => `${f[TIE_D]},${f[TIE_E]},${f[TIE_F]}`))
    triples.delete('0,0,0') // the boot state before TIECOL's first store
    expect(triples.size, 'the TIE registers must actually cycle (more than one row observed)').toBeGreaterThan(1)
    for (const t of triples)
      expect(rows.has(t), `TIE triple (${t}) is not a TCTAB row — wrong table/order wired`).toBe(true)
  })

  it('the TIE cycler holds each row for the ROM cadence — NAP 6 = 6 ticks (load-bearing)', async () => {
    // TIECOL sleeps NAP 6 between rows (defender/DEFB6.SRC:1197), so each TCTAB row must
    // persist for exactly 6 ticks. TIE_CADENCE_TICKS is the ROM magnitude, NOT the private
    // TIE_PERIOD const — shortening the cadence (TIE_PERIOD 6→3) reddens this. Register E is
    // 0x00 at boot (DEFAULT_PCRAM[14]) and row 0 stores E=0x81, held until row 1 stores 0x2f.
    const TIE_CADENCE_TICKS = 6
    const frames = await playPcram(17, 60)
    expect(
      firstHoldTicks(frames, TIE_E, 0x00),
      'each TIE row is held for exactly the ROM cadence (NAP 6 = 6 ticks)',
    ).toBe(TIE_CADENCE_TICKS)
  })

  it('the bomb flash is two-phase — a frame shows BOMB_A=$FF while BOMB_C=$00 (A≠C), the pre-pick flash', async () => {
    // CBOMB's first phase blacks C and lights A full-white: LDA #$FF / STA PCRAM+$A (A=$FF)
    // then CLR PCRAM+$C (C=$00) — defender/DEFB6.SRC:1213-1215 — the ONE moment A≠C, before
    // the second phase writes the same COLTAB colour into both. This pins the $FF/$00 flash
    // the header calls the mutant shimmer; deleting the flash branch (A always == C) reddens.
    const frames = await playPcram(29, 60)
    const flash = frames.find((f) => f[BOMB_A] === 0xff && f[BOMB_C] === 0x00)
    expect(
      flash,
      'CBOMB must flash PCRAM+$A=$FF with PCRAM+$C=$00 (defender/DEFB6.SRC:1213-1215) before the colour pick',
    ).toBeTruthy()
  })
})

// ─── 4b. The tables are BYTE-VERIFIED against the ROM (mutation-proven, not self-referential) ──
//
// §3/§4 pin the cyclers' WIRING against the exported COLTAB/TCTAB — but a test that checks
// "the laser emits values ⊆ COLTAB" cannot catch a flipped byte IN COLTAB (both sides move
// together: lang-review #18/#26). This block closes that loop with an INDEPENDENT reader of
// the vendored 1981 source (the charset-gate.test.ts pattern): it parses the FCB rows the
// citation gate byte-verifies and asserts the exported constants equal them. Mutate a COLTAB
// or TCTAB byte in core/color-cycle.ts and THIS reddens.

// plugins/defender/tests → the vendored source is three levels up at the monorepo root
// (the same tree + tracked-in-git fact the citation gate relies on).
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

/** Parse the byte list from an FCB row's operand (Williams RASM: `$hh` hex, bare = decimal).
 *  e.g. "COLTAB\tFCB\t$38,$39,$3A" → [0x38,0x39,0x3a]; "\tFCB\t$3C,0" → [0x3c,0x00]. */
function fcbBytes(line: string): number[] {
  const operand = line.split(/\bFCB\b/)[1]
  if (operand === undefined) throw new Error(`not an FCB row: ${JSON.stringify(line)}`)
  return operand
    .trim()
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => (t.startsWith('$') ? parseInt(t.slice(1), 16) : parseInt(t, 10)))
}

/** The bytes an FCB-row range of the vendored source declares, concatenated. */
function sourceTableBytes(file: string, from: number, to: number): number[] {
  const src = readFileSync(join(vendoredRoot, file), 'utf8').split('\n')
  const bytes: number[] = []
  for (let n = from; n <= to; n++) bytes.push(...fcbBytes(src[n - 1]))
  return bytes
}

describe.skipIf(!vendoredAvailable)('pt1-22 · the ROM tables are byte-verified against the 1981 source', () => {
  it('COLTAB equals the vendored DEFA7.SRC:3037-3042 FCB rows byte-for-byte (incl. the $00 terminator)', async () => {
    const { COLTAB } = await loadCycle()
    // Independent re-read of the source rows the citation gate pins (claims/21-color-cycle.json).
    // A flipped byte in core/color-cycle.ts's COLTAB — or in the source — reddens here.
    const rom = sourceTableBytes('DEFA7.SRC', 3037, 3042)
    expect(rom.length, 'COLTAB is 36 colours + the $00 terminator').toBe(37)
    expect(rom[rom.length - 1], 'the last byte is the $00 wrap terminator').toBe(0x00)
    expect([...COLTAB]).toEqual(rom)
  })

  it('TCTAB equals the vendored DEFB6.SRC:1207-1209 FCB rows byte-for-byte', async () => {
    const { TCTAB } = await loadCycle()
    const rom = sourceTableBytes('DEFB6.SRC', 1207, 1209)
    expect(rom.length, 'TCTAB is three 3-byte rows').toBe(9)
    expect([...TCTAB]).toEqual(rom)
  })
})

// ─── 5. ADR-0005 safety — localized cyclers, never a large-area strobe ─────────────

describe('pt1-22 · ADR-0005 safety: the cyclers are localized; the background is never strobed', () => {
  it('the background register (index 0, whole-screen SPACE) is never touched by any cycler', async () => {
    const { DEFAULT_PCRAM } = (await import(/* @vite-ignore */ PALETTE_SPECIFIER)) as { DEFAULT_PCRAM: readonly number[] }
    const frames = await playPcram(21, 300)
    // The seizure-critical invariant: a >3 Hz luminance cycle over a LARGE area is
    // forbidden (ADR-0005; pacman epilepsy note). The background covers most of the
    // screen, so its register must stay fixed — the laser/bomb/TIE cyclers are small-area
    // and permitted precisely because they never move register 0.
    for (const f of frames)
      expect(f[BACKGROUND], 'register 0 (SPACE) must never be cycled — ADR-0005 large-area strobe guard').toBe(
        DEFAULT_PCRAM[BACKGROUND],
      )
  })

  it('cyclers touch ONLY the six play registers — fixed colours and the death register stay put', async () => {
    const { DEFAULT_PCRAM } = (await import(/* @vite-ignore */ PALETTE_SPECIFIER)) as { DEFAULT_PCRAM: readonly number[] }
    const frames = await playPcram(23, 300)
    // The nine fixed named colours (RED/GREEN/YELLOW/BLUE/GRAY/BROWN/PURPLE/WHITE) and the
    // player-death register $B (PDTH, pt1-25's scope) must not move during live play. This
    // bounds the blast radius of the change: exactly {1,A,C,D,E,F} animate, nothing else.
    for (const idx of [...FIXED_NAMED, DEATH_REG]) {
      const moved = valuesAt(frames, idx).some((v) => v !== DEFAULT_PCRAM[idx])
      expect(moved, `register 0x${idx.toString(16)} moved during play — only ${CYCLED.join(',')} may cycle`).toBe(false)
    }
  })
})

// ─── 6. Purity — deterministic given the injected RNG ─────────────────────────────

describe('pt1-22 · the cyclers are pure and do NOT perturb the gameplay RNG stream', () => {
  it('two sims with identical rand produce identical pcram sequences (no wall-clock)', async () => {
    // The shadow is a pure function of tick count — a cycler that read Date.now()/
    // Math.random() would make two same-seed runs diverge. (The src/core purity contract.)
    const a = await playPcram(42, 180)
    const b = await playPcram(42, 180)
    expect(a).toEqual(b)
  })

  it('a DIFFERENT rand yields the SAME shadow sequence — the palette does not draw from gameplay entropy', async () => {
    // CORRECTED CONTRACT (see the Dev deviation for pt1-22): the ROM's CBOMB reads the
    // free-running SEED, but the clone's `rand` is the GAMEPLAY entropy stream threaded
    // through every enemy bank — drawing from it in a per-tick palette cycler would desync
    // ~15 rand-sensitive sim tests (frame hashes, enemy positions). So the cyclers carry
    // their own self-contained counter and are INDEPENDENT of the injected rand: two runs
    // with different seeds must produce the SAME pcram sequence. A cycler that leaked the
    // gameplay rand into the palette (the thing that would break the sim suite) reds here.
    const a = await playPcram(1, 180)
    const b = await playPcram(2, 180)
    expect(a, 'the colour cyclers must not depend on the gameplay RNG (they would desync the sim)').toEqual(b)
  })
})
