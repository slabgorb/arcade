// tests/field-recolour.test.ts
//
// Story ml11-1 — RED phase (Tyr / TEA). CENTIN/LCOLOR-gated per-length field
// recolour. Deferred from ml7-11 (its Design Deviations: "Colour index held at
// CENTIN=12; LCOLOR-gated per-length recolour deferred").
//
// GROUND TRUTH (SM-verified 2026-08-16). CLRCH recolours the field colour-RAM
// ONLY when the LCOLOR flag is set: `LDA LCOLOR / BNE 10$` (MLIRQ.MAC:248); on
// the set path it clears the flag (STA LCOLOR, :253) and loads the colour row
// indexed by the millipede LENGTH — `LDY X,CENTIN / DEY` (MLIRQ.MAC:255) => row
// = CENTIN-1, 0..11. CENTIN is the connected length (MLDEF.MAC:299), init 12
// (MILLI.MAC:1168-1170). So the field recolours a STEP as the millipede shortens,
// LATCHED at the LCOLOR event — NOT recomputed every frame.
//
// ─── WHAT ALREADY EXISTS (reuse-first) ───────────────────────────────────────
// • The pure per-length pens `playfieldPens(centin)` and the per-CODE composer
//   `fieldPens(code, centin?)` BOTH already take a CENTIN and both already read
//   `waveColours(centin)` for the base band (playfield-palette.ts:43,106). The
//   per-code overrides — normal cap ANCOL+5, poison cap ANCOL+7, DDT letters red
//   $1F (ml9-2/ml9-3) — already layer on top of that base. Coverage:
//   tests/playfield-palette.test.ts (playfieldPens 12 @:53, 1 @:62) and
//   tests/ingame-colour.test.ts (fieldPens per-code, ml9-2).
// • `GameState.centin` already tracks the LIVE connected length (game-state.ts:51),
//   recomputed each frame in stepPlay (sim.ts:427).
//
// The one thing MISSING is the GATE + the wiring: the live render freezes the base
// at CENTIN=12 because main.ts calls `fieldPens(p.stamp)` with NO centin argument
// (main.ts:240-241), so the base never follows the length. This story models the
// LCOLOR gate in core (a pure `recolourField` reducer + a latched
// GameState.fieldColourIndex / lcolor flag) and threads the LATCHED index into the
// field draw. A straight swap to global `playfieldPens(centin)` would DROP the
// ml9-2 per-code caps — so the fix must ride `fieldPens`, whose composer already
// survives the base shift.
//
// ─── RED/GREEN SPLIT ─────────────────────────────────────────────────────────
// TEA (this file) authors the failing suite. GREEN (Dev) ships:
//   1. src/core/field-recolour.ts → `recolourField(fieldColourIndex, centin,
//      lcolor): { fieldColourIndex, lcolor }` — the pure LCOLOR gate.
//   2. GameState.fieldColourIndex (latched, init NCENT) + GameState.lcolor (flag,
//      init false); createGame seeds both; stepPlay/stepDeath thread them.
//   3. main.ts: `fieldPens(p.stamp, state.fieldColourIndex)` at BOTH field-draw
//      call sites (glyph + non-glyph), never the bare `fieldPens(p.stamp)`.
//
// The VISUAL playtest at /millipede/ stays MANDATORY (ml11-1 AC4): byte-decode
// tests pass while the screen is wrong, and only eyes confirm the step is steady
// (no strobe — ml7-4) against ingame-mame-reference.png.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte, type Rgb } from '../src/core/palette'
import { waveColours } from '../src/core/playfield-colour'
import { NCENT, HEAD_COLOR } from '../src/core/millipede'
import { DDT_STAMP } from '../src/core/ddt'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { drawGridStamps } from '../src/shell/render'
import { playfieldPens, fieldPens } from '../src/shell/playfield-palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Strip // and block comments so a wiring grep can never be satisfied by prose. */
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const mainSrc = (): string => stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))

const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const kinds = (g: GameState): string[] => g.events.map((e) => e.type)
const key = (c: Rgb): string => `${c.r},${c.g},${c.b}`

// A putImageData recorder (the ml9-2 pattern): each blit carries its painted pixel
// bytes so colour assertions read what was actually drawn onto the canvas.
function fakeCtx(): { ctx: CanvasRenderingContext2D; blits: Uint8ClampedArray[] } {
  const blits: Uint8ClampedArray[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { data: Uint8ClampedArray }) => blits.push(img.data),
  } as unknown as CanvasRenderingContext2D
  return { ctx, blits }
}
/** The distinct opaque RGB triples a blit painted. */
function paintedColours(data: Uint8ClampedArray): Set<string> {
  const seen = new Set<string>()
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] === 255) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
  return seen
}

// ── Self-describing loader for the not-yet-built gate: a missing export reddens
//    with a message naming what GREEN (Dev) must ship, not an opaque TypeError. ──
interface FieldRecolourModule {
  /** MLIRQ.MAC:248-255 — the LCOLOR gate: when `lcolor` is set, latch the field
   *  colour index to the live CENTIN (colour row = CENTIN-1) and clear the flag;
   *  otherwise HOLD the previous index (steady, ml7-4 no-strobe). */
  recolourField: (
    fieldColourIndex: number,
    centin: number,
    lcolor: boolean,
  ) => { fieldColourIndex: number; lcolor: boolean }
}
async function loadGate(): Promise<FieldRecolourModule> {
  const spec = ['..', 'src', 'core', 'field-recolour'].join('/')
  const mod = (await import(/* @vite-ignore */ spec)) as Partial<FieldRecolourModule>
  if (typeof mod.recolourField !== 'function') {
    throw new Error(
      'src/core/field-recolour.ts is missing recolourField — GREEN (Dev) ships the pure LCOLOR ' +
        'gate `recolourField(fieldColourIndex, centin, lcolor): { fieldColourIndex, lcolor }` ' +
        '(MLIRQ.MAC:248-255): gate set → latch index to CENTIN and clear the flag; gate clear → hold.',
    )
  }
  return mod as FieldRecolourModule
}

// Read the latched-index / flag fields off a state without coupling the file to a
// GameState shape Dev has not landed yet (undefined reddens meaningfully in RED).
const colourIndexOf = (s: GameState): unknown => (s as unknown as Record<string, unknown>).fieldColourIndex
const lcolorOf = (s: GameState): unknown => (s as unknown as Record<string, unknown>).lcolor

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the recolour is LCOLOR-GATED, not per-frame (the reducer mechanism).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml11-1 AC2 — recolourField is the LCOLOR gate (MLIRQ.MAC:248-255)', () => {
  it('gate CLEAR: a length change is IGNORED — the field colour index is held', async () => {
    const { recolourField } = await loadGate()
    // CENTIN dropped 12 → 8 but LCOLOR is not set: CLRCH does not recolour.
    const out = recolourField(12, 8, false)
    expect(out.fieldColourIndex, 'index held while the gate is clear').toBe(12)
    expect(out.lcolor, 'the flag stays clear').toBe(false)
  })

  it('gate SET: the index STEPS to the live CENTIN and the flag is CLEARED (STA LCOLOR :253)', async () => {
    const { recolourField } = await loadGate()
    expect(recolourField(12, 8, true)).toEqual({ fieldColourIndex: 8, lcolor: false })
  })

  it('the latched index selects the ROM colour ROW for that length (row = CENTIN-1)', async () => {
    const { recolourField } = await loadGate()
    const latched = recolourField(12, 8, true).fieldColourIndex
    // playfieldPens(latched) must be the CENTIN=8 row, NOT the frozen CENTIN=12 row.
    expect(playfieldPens(latched)).toEqual(playfieldPens(8))
    expect(playfieldPens(latched)).not.toEqual(playfieldPens(12))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — no strobe: the recolour is a DISCRETE step, steady between events.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml11-1 AC4 — steady by construction (ml7-4 no-strobe)', () => {
  it('with the gate clear, repeated frames HOLD the index — no per-frame flicker', async () => {
    const { recolourField } = await loadGate()
    let idx = recolourField(12, 8, true).fieldColourIndex // one armed step to 8
    // 240 idle frames (CENTIN steady at 8, gate clear): the colour must not move.
    for (let f = 0; f < 240; f++) idx = recolourField(idx, 8, false).fieldColourIndex
    expect(idx, 'the base colour is a discrete step, held steady between LCOLOR events').toBe(8)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the LIVE latched index is threaded from GameState into the field draw
//       (not the frozen CENTIN=12 default).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml11-1 AC1 — GameState exposes the latched colour index + gate', () => {
  it('createGame seeds fieldColourIndex = NCENT (12, the full-millipede wave-start colour)', () => {
    expect(colourIndexOf(createGame(0x1982)), 'GameState.fieldColourIndex init NCENT (MILLI.MAC:1168-1170)').toBe(
      NCENT,
    )
  })

  it('createGame seeds the LCOLOR flag CLEAR (nothing to recolour at boot)', () => {
    expect(lcolorOf(createGame(0x1982)), 'GameState.lcolor init false (MLIRQ.MAC:248)').toBe(false)
  })

  it('a REAL length change (segment kill) latches the field colour a step DOWN — the gate is not dead', () => {
    // Three connected segments; the shot sits on one. Killing it drops the live
    // connected length 3 → 2, so the field must recolour to the CENTIN=2 row.
    // (A single-segment kill reloads CENTIN to NCENT — sim.ts:427 — so use three.)
    type Segment = GameState['segments'][number]
    const at = (h: number): Segment => ({ h, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR })
    const g: GameState = {
      ...createGame(0x1982, { phase: 'play' }),
      segments: [at(0x80), at(0x90), at(0xa0)],
      centin: 3,
      shot: { active: true, h: 0x80, v: 0x40 },
    }
    const after = stepGame(g, idle)
    expect(kinds(after), 'precondition: the shot killed a segment').toContain('segment-killed')
    expect(after.centin, 'precondition: the live connected length dropped to 2').toBe(2)
    expect(colourIndexOf(after), 'the field recoloured a step — latched to the live length, not frozen at 12').toBe(2)
  })
})

describe('ml11-1 AC1 — main.ts threads the latched index into BOTH field-draw call sites', () => {
  it('the non-glyph field cell is drawn with fieldPens(p.stamp, state.fieldColourIndex)', () => {
    expect(mainSrc(), 'drawGridStamps must pass the LIVE latched index as fieldPens’ 2nd arg').toMatch(
      /drawGridStamps\s*\(\s*c\s*,\s*\[\s*p\s*\]\s*,\s*fieldPens\s*\(\s*p\.stamp\s*,\s*state\.fieldColourIndex\s*\)\s*\)/,
    )
  })

  it('the DDT-glyph field cell also threads the latched index (fieldPens 2nd arg)', () => {
    expect(mainSrc(), 'drawStampGridAtPx must pass state.fieldColourIndex to fieldPens too').toMatch(
      /drawStampGridAtPx\s*\([\s\S]*?fieldPens\s*\(\s*p\.stamp\s*,\s*state\.fieldColourIndex\s*\)\s*\)/,
    )
  })

  it('NO field cell is still drawn through the frozen CENTIN=12 default (bare fieldPens(p.stamp))', () => {
    // This is the actual defect today: main.ts:240-241 call fieldPens(p.stamp)
    // with no centin, so the base band never follows the length.
    expect(mainSrc(), 'the bare, un-threaded fieldPens(p.stamp) must be gone').not.toMatch(
      /fieldPens\s*\(\s*p\.stamp\s*\)/,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the per-length BASE composes with ml9-2/ml9-3 per-code overrides WITHOUT
//       regressing them: the base band shifts with length while the caps/DDT keep
//       their code-selected colours.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml11-1 AC3 — base shifts with length; ml9-2/ml9-3 per-code colours survive', () => {
  const poisonBlue = decodeColourByte(0xf8) // ANCOL+7 inside-of-poison (waveColours 8 & 12 both $F8)
  const red = decodeColourByte(0x1f) // ALPHANUMERIC_COLOUR — the ml9-3 DDT letters
  const plainCode = 0x00 // neither mushroom nor DDT → base pens only

  it('the BASE band (outside-mushroom pen) SHIFTS with length: CENTIN 12 $E2 → CENTIN 8 $67', () => {
    // Proves the story's whole point: the base is no longer frozen at 12. The
    // expected bytes are the ROM rows (MLIRQ.MAC:348 / :332), pinned as LITERALS
    // so the assertion does not route through the same waveColours() fieldPens uses.
    expect(waveColours(12).outsideMushroom, 'ROM row 12 outside byte (:348)').toBe(0xe2)
    expect(waveColours(8).outsideMushroom, 'ROM row 8 outside byte (:332)').toBe(0x67)
    expect(fieldPens(plainCode, 12)[2]).toEqual(decodeColourByte(0xe2))
    expect(fieldPens(plainCode, 8)[2]).toEqual(decodeColourByte(0x67))
    expect(fieldPens(plainCode, 8)[2]).not.toEqual(fieldPens(plainCode, 12)[2])
  })

  it('a POISON cap stays blue $F8 across CENTIN 12 AND 8 — the ml9-2 per-code override survives', () => {
    for (const c of [12, 8]) expect(fieldPens(0x7b, c)[3], `poison cap @ CENTIN=${c}`).toEqual(poisonBlue)
  })

  it('a NORMAL cap and a POISON cap stay DIFFERENTLY coloured at BOTH lengths (per-code distinction holds)', () => {
    for (const c of [12, 8]) expect(fieldPens(0x7f, c), `normal vs poison @ CENTIN=${c}`).not.toEqual(fieldPens(0x7b, c))
  })

  it('a DDT cell keeps the ml9-3 red $1F letters (pen 1) across CENTIN 12 AND 8', () => {
    for (const c of [12, 8]) expect(fieldPens(DDT_STAMP, c)[1], `DDT letters @ CENTIN=${c}`).toEqual(red)
  })

  it('painted: a poison cap under the CENTIN=8 base still shows blue, and the base green shifted', () => {
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0x1f, stamp: 0x7b }], fieldPens(0x7b, 8))
    expect(blits).toHaveLength(1)
    expect(paintedColours(blits[0]).has(key(poisonBlue)), 'poison stays blue under the shorter-length base').toBe(true)
  })
})
