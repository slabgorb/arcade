// plugins/missile-command/tests/cursor.test.ts
//
// Story mc1-3 — RED phase (Han Solo / TEA). AC1: the trackball/mouse crosshair
// as a PURE core reducer. `src/core/cursor.ts` integrates a per-frame delta into
// the cursor position and CLAMPS it to the cabinet's play area so the crosshair
// can never leave the field. Core owns the arithmetic; the shell (shell/input.ts,
// tested in input.test.ts) only supplies the delta.
//
// ─── GROUND TRUTH (W3MAIN.MAC routines, W3COMN.MAC constants) ─────────────────
// The cabinet reads the trackball, adds the increment to the cursor, then clamps:
//   PROCESS CURSOR MOTION   W3MAIN:424  (UPCURS, physical line 847)
//   ADD TBALL TO CURSOR     W3MAIN:546  (ADCURS, physical line 1091)
//   UPDATE CURSOR POSITION  W3MAIN:587  (UPDCUR/DOCURS, physical line 1173) — the
//     clamp: `CMP AX,HMIN / IFCC / LDA AX,HMIN` then `CMP AX,HMAX / IFCS / LDA
//     AX,HMAX`, with the bound table `HMIN: .BYTE IHMIN,IVMIN,IHMAX,IVMAX`.
// The four bounds are W3COMN.MAC constants (`.RADIX 16` at :1, a trailing `.`
// forces decimal):
//   IHMIN = 8    (:113)              → HMIN 8
//   IHMAX = 247. (:115)              → HMAX 247
//   IVMIN = 45.  (:117)              → VMIN 45
//   IVMAX = TOPSCR-16. (:119), TOPSCR=222. (:107) → VMAX 206
// The H/V axis is the cabinet's — V grows UPWARD from the bottom (same axis as
// core/field.ts and the render projection). The reducer works in that space; the
// shell flips V for the top-left-origin pointer (input.test.ts pins that).
//
// ─── CITATION CONVENTION (measured at SM setup — avoids a wrong-line trap) ─────
// W3MAIN.MAC is DOUBLE-SPACED (a blank line after every source line), so the
// design's logical cites are ~physical/2: :424→phys 847, :546→phys 1091,
// :587→phys 1173. Grep the `.SBTTL` label, do not open the raw physical line.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/cursor.ts` does not exist yet. `loadCursor()` dynamic-imports it and
// throws a self-describing "not built yet" (never a module-resolution stack
// trace), so every reducer test reddens for the FEATURE's absence. Purity of the
// new module is guarded automatically by the src/core sweep in purity.test.ts the
// moment the file lands — this file does not re-assert it.
//
// ─── THE GREEN-FROM-DAY-ONE TEST ─────────────────────────────────────────────
// "source ground truth" reads the vendored W3COMN.MAC directly and proves the
// bound decimals this file expects (8/247/45/206) really decode from the source.
// It is green now (data, not code) and is the anti-drift anchor: a later edit that
// "corrects" a bound to something the ROM never said reddens here — not a human.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/cursor.ts ──────────

/** The crosshair position in cabinet coordinates (V origin at the BOTTOM). */
interface Cursor {
  /** Horizontal cabinet coordinate, clamped to [HMIN, HMAX]. */
  readonly h: number
  /** Vertical cabinet coordinate (bottom-origin), clamped to [VMIN, VMAX]. */
  readonly v: number
}

/** A per-frame motion increment. `dv` is in cabinet space (up is +). */
interface Delta {
  readonly dh: number
  readonly dv: number
}

interface CursorModule {
  /** IHMIN — W3COMN.MAC:113. */
  HMIN: number
  /** IHMAX — W3COMN.MAC:115. */
  HMAX: number
  /** IVMIN — W3COMN.MAC:117. */
  VMIN: number
  /** IVMAX = TOPSCR-16 — W3COMN.MAC:119/:107. */
  VMAX: number
  /** Integrate the delta and clamp the result to the play area. Pure. */
  moveCursor: (cursor: Cursor, delta: Delta) => Cursor
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while cursor.ts is still absent — the fleet idiom for a RED import
// of a not-yet-built module (field.test.ts, asteroids audio-migration, centipede).
const CURSOR_SPECIFIER = '../src/core/cursor.js'

async function loadCursor(): Promise<CursorModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CURSOR_SPECIFIER)) as Partial<CursorModule>
    if (typeof mod.moveCursor !== 'function') {
      throw new Error('module has no `moveCursor` export')
    }
    return mod as CursorModule
  } catch (e) {
    throw new Error(
      'cursor core module not built yet — GREEN (Yoda) creates src/core/cursor.ts, a PURE ' +
        'reducer exporting moveCursor(cursor, {dh, dv}) that integrates the per-frame delta and ' +
        'CLAMPS the result to the cabinet play area — HMIN=8 (IHMIN W3COMN:113), HMAX=247 (IHMAX ' +
        ':115), VMIN=45 (IVMIN :117), VMAX=206 (IVMAX=TOPSCR-16 :119/:107) — plus those four bound ' +
        'constants. V is bottom-origin (UPDCUR/DOCURS clamp, W3MAIN:587). No shell import, no ' +
        `clock, no entropy (purity.test.ts sweeps it). (${(e as Error).message})`,
    )
  }
}

// Expected bounds, transcribed from W3COMN.MAC. The "source ground truth"
// describe below proves these against the file so a typo here cannot pass by
// agreeing with a matching typo in cursor.ts.
const HMIN = 8
const HMAX = 247
const VMIN = 45
const VMAX = 206 // TOPSCR(222) - 16

describe('AC1 — the exported bounds are the cabinet play-area limits', () => {
  it('HMIN/HMAX are IHMIN/IHMAX (8, 247)', async () => {
    const c = await loadCursor()
    expect(c.HMIN).toBe(HMIN)
    expect(c.HMAX).toBe(HMAX)
  })

  it('VMIN/VMAX are IVMIN/IVMAX (45, 206)', async () => {
    const c = await loadCursor()
    expect(c.VMIN).toBe(VMIN)
    expect(c.VMAX).toBe(VMAX)
  })
})

describe('AC1 — moveCursor integrates the delta inside the play area', () => {
  it('adds dh to h and dv to v for an interior move', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 100, v: 100 }, { dh: 5, dv: -3 })).toEqual({ h: 105, v: 97 })
  })

  it('a zero delta leaves an interior cursor exactly where it was', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 123, v: 88 }, { dh: 0, dv: 0 })).toEqual({ h: 123, v: 88 })
  })

  it('accumulates across successive frames', async () => {
    const { moveCursor } = await loadCursor()
    let cur: Cursor = { h: 100, v: 100 }
    cur = moveCursor(cur, { dh: 10, dv: 10 })
    cur = moveCursor(cur, { dh: -4, dv: 6 })
    expect(cur).toEqual({ h: 106, v: 116 })
  })
})

describe('AC1 — moveCursor clamps: the crosshair cannot leave the play area', () => {
  it('a large +delta clamps to (HMAX, VMAX), never beyond', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 200, v: 200 }, { dh: 100, dv: 100 })).toEqual({ h: HMAX, v: VMAX })
  })

  it('a large -delta clamps to (HMIN, VMIN), never beyond', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 20, v: 60 }, { dh: -100, dv: -100 })).toEqual({ h: HMIN, v: VMIN })
  })

  it('clamps each axis independently (H high while V low)', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 240, v: 50 }, { dh: 50, dv: -50 })).toEqual({ h: HMAX, v: VMIN })
  })

  it('sitting on a boundary and pushing outward stays pinned to the edge', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: HMAX, v: VMAX }, { dh: 1, dv: 1 })).toEqual({ h: HMAX, v: VMAX })
    expect(moveCursor({ h: HMIN, v: VMIN }, { dh: -1, dv: -1 })).toEqual({ h: HMIN, v: VMIN })
  })

  it('a landing exactly on the boundary is kept (clamp is inclusive)', async () => {
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: HMAX - 5, v: VMIN + 5 }, { dh: 5, dv: -5 })).toEqual({ h: HMAX, v: VMIN })
  })

  it('an already out-of-bounds cursor is pulled back inside even with a zero delta', async () => {
    // The reducer clamps the RESULT, so it cannot pass an illegal cursor through.
    const { moveCursor } = await loadCursor()
    expect(moveCursor({ h: 300, v: 10 }, { dh: 0, dv: 0 })).toEqual({ h: HMAX, v: VMIN })
  })

  it('holds the invariant across a fuzz sweep of positions and deltas', async () => {
    const { moveCursor } = await loadCursor()
    for (let h = -50; h <= 300; h += 37) {
      for (let v = -50; v <= 300; v += 41) {
        for (const dh of [-200, -1, 0, 1, 200]) {
          for (const dv of [-200, -1, 0, 1, 200]) {
            const out = moveCursor({ h, v }, { dh, dv })
            expect(out.h, `h out of range at h=${h} dh=${dh}`).toBeGreaterThanOrEqual(HMIN)
            expect(out.h, `h out of range at h=${h} dh=${dh}`).toBeLessThanOrEqual(HMAX)
            expect(out.v, `v out of range at v=${v} dv=${dv}`).toBeGreaterThanOrEqual(VMIN)
            expect(out.v, `v out of range at v=${v} dv=${dv}`).toBeLessThanOrEqual(VMAX)
          }
        }
      }
    }
  })
})

describe('AC1 — moveCursor is a pure reducer (deterministic, non-mutating)', () => {
  it('returns the same result for the same inputs (referential transparency)', async () => {
    const { moveCursor } = await loadCursor()
    const a = moveCursor({ h: 111, v: 77 }, { dh: 3, dv: 9 })
    const b = moveCursor({ h: 111, v: 77 }, { dh: 3, dv: 9 })
    expect(a).toEqual(b)
  })

  it('does not mutate the cursor it is given', async () => {
    const { moveCursor } = await loadCursor()
    const input: Cursor = { h: 100, v: 100 }
    const frozen = Object.freeze({ ...input })
    const out = moveCursor(input, { dh: 5, dv: 5 })
    expect(input).toEqual(frozen) // unchanged
    expect(out).not.toBe(input) // a fresh object, not the same reference
  })
})

describe('AC1 — cursor.ts carries its W3MAIN / W3COMN source citations', () => {
  // AC1 wants the deterministic reducer cited to source. The citation gate +
  // claims/*.json are DEFERRED to a later epic (skeleton-first, per field.test.ts),
  // so the enforceable form is a raw source-text scan: cursor.ts must name the
  // routine module and the four bound symbols. Raw text — a citation in a comment
  // counts (the purity scanner strips comments; this scan does not).
  const cursorSrc = (): string =>
    readFileSync(join(root, 'src', 'core', 'cursor.ts'), 'utf8')

  it('names the cabinet routine source W3MAIN and the constants source W3COMN', () => {
    const src = cursorSrc()
    expect(src, 'must cite W3MAIN — the routine the clamp comes from').toMatch(/W3MAIN/)
    expect(src, 'must cite W3COMN — the module the four bounds come from').toMatch(/W3COMN/)
  })

  it('cites each of the four bound symbols IHMIN/IHMAX/IVMIN/IVMAX', () => {
    const src = cursorSrc()
    for (const sym of ['IHMIN', 'IHMAX', 'IVMIN', 'IVMAX']) {
      expect(src, `bound ${sym} must be cited`).toMatch(new RegExp(sym))
    }
  })
})

const macPath = join(root, 'reference', 'source', 'W3COMN.MAC')
// Byte-gated: W3COMN.MAC is gitignored (copyright wall — NEVER committed), so
// this suite SKIPS wherever the local quarry is absent (CI included).
// `describe.skipIf` still runs its factory BODY at collection, so the read is
// guarded too — otherwise it ENOENTs before any skip can apply.
describe.skipIf(!existsSync(macPath))('source ground truth — the expected bounds really decode from W3COMN.MAC', () => {
  // GREEN wherever the quarry is present: reads the vendored source (data), not
  // cursor.ts (code), and anchors HMIN/HMAX/VMIN/VMAX to the ROM. (W3COMN.MAC
  // carries a stray non-text byte — `readFileSync(..., 'utf8')` reads it fine; a
  // hand `grep` needs `-a`. Noted in field.test.ts's SOURCE-FILE HAZARD.)
  const mac = existsSync(macPath) ? readFileSync(macPath, 'utf8') : ''

  // A `SYMBOL = value` def in the `.RADIX 16` source. A trailing `.` on the value
  // forces DECIMAL (MACRO-11/6502-XASM convention); a bare value is HEX.
  const valueOf = (symbol: string): number => {
    const m = mac.match(new RegExp(`\\b${symbol}\\s*=\\s*([0-9A-Fa-f]+)(\\.?)`))
    if (!m) throw new Error(`symbol ${symbol} not found in W3COMN.MAC`)
    return m[2] === '.' ? parseInt(m[1], 10) : parseInt(m[1], 16)
  }

  it('IHMIN=8, IHMAX=247, IVMIN=45 (the trailing-dot decimals)', () => {
    expect(valueOf('IHMIN')).toBe(HMIN)
    expect(valueOf('IHMAX')).toBe(HMAX)
    expect(valueOf('IVMIN')).toBe(VMIN)
  })

  it('IVMAX = TOPSCR - 16 = 206', () => {
    expect(valueOf('TOPSCR')).toBe(222)
    expect(valueOf('TOPSCR') - 16).toBe(VMAX)
  })
})
