// tests/shell/pt1-9.select-preview-bonus.test.ts
//
// RED for story pt1-9: the difficulty/level SELECT screen must PREVIEW the board
// (well) layout for the selected starting level and SHOW the bonus that starting
// there pays. Remediation of audit finding SC-011.
//
// WHY SHAPE (b), NOT the 5-wide scroll — the PRIMARY SOURCE settles it:
//   SC-011 (docs/audit/findings/pair-6-alscor-scoring.json) carries
//   `recommendation: accept`. Its reasoning: "a keyboard/discrete-step chooser
//   doesn't need a preview window to convey the same information (current level,
//   its bonus, its hole), so collapsing to a single value is a reasonable
//   interaction simplification rather than a missing feature."
//   Our drawSelect() today draws only the level NUMBER — it does not convey the
//   bonus or the hole, so it sits BELOW the audit's own accepted bar. The fix is
//   to convey those two facts on the existing contiguous 1..16 chooser, NOT to
//   adopt the ROM's analog-spinner scroll window. See the TEA/Design Deviation.
//
// SINGLE SOURCE OF TRUTH (AC2): starting a game at level L pays exactly
//   startWaveBonus(L) — the sim commits `s.startBonus = startWaveBonus(level)`
//   (src/core/sim.ts:707) and beginFlyIn pays it. So the value the select screen
//   SHOWS must come from the SAME function applied to the SAME selected level —
//   startWaveBonus(s.select.selectedLevel) — never a hand-copied ladder literal,
//   or the shown number can silently diverge from the paid one. The companion
//   core test (tests/core/pt1-9.select-bonus-paid.test.ts) pins the paid side.
//
// SEAM: render.ts draws to a live canvas (none in the node test env), so — exactly
// as tp1-20.hud-messages.test.ts and render.banners.test.ts do — the testable seam
// is the drawSelect() SOURCE TEXT via Vite `?raw`. The source-scan helpers below
// are the same ones those suites use.
//
// These fail now: drawSelect() references neither startWaveBonus nor tubeForLevel
// and draws no polyline. They go green once Dev adds the preview + bonus.
import { describe, it, expect } from 'vitest'
import renderSrc from '../../src/shell/render.ts?raw'

// ---- source-scan helpers (shared shape with tp1-20.hud-messages.test.ts) ----

// The body of a top-level `function NAME(` up to the next top-level function.
function fnBody(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`)
  if (start < 0) return ''
  const next = src.indexOf('\nfunction ', start + 1)
  return src.slice(start, next < 0 ? undefined : next)
}

// Every `vecText(...)` / `drawGlowText(...)` call in `src`, as full call strings.
// Paren- and quote-aware so template literals with ${...} stay inside their call.
function textDrawCalls(src: string): string[] {
  const out: string[] = []
  const re = /\b(?:vecText|drawGlowText)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let quote: string | null = null
    let i = open
    for (; i < src.length; i++) {
      const c = src[i]
      if (quote) {
        if (c === '\\') { i++; continue }
        if (c === quote) quote = null
        continue
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue }
      if (c === '(') depth++
      else if (c === ')') { depth--; if (depth === 0) break }
    }
    out.push(src.slice(m.index, i + 1))
  }
  return out
}

// Top-level argument list of a call string; text is args[1], colour is args[5].
function argsOf(call: string): string[] {
  const open = call.indexOf('(')
  const inner = call.slice(open + 1, call.length - 1)
  const args: string[] = []
  let depth = 0
  let quote: string | null = null
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (quote) {
      cur += c
      if (c === '\\') { cur += inner[++i] ?? ''; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) args.push(cur.trim())
  return args
}

const select = fnBody(renderSrc, 'drawSelect')

// ---- helper sanity (not the feature) --------------------------------------

describe('pt1-9 helper sanity — drawSelect body is found and parseable', () => {
  it('locates the drawSelect function body', () => {
    expect(select, 'drawSelect must exist in render.ts').not.toBe('')
    expect(select).toContain('RATE YOURSELF') // known content, proves we sliced the right fn
  })
})

// ---- AC1: per-level board (well) PREVIEW -----------------------------------

describe('pt1-9 AC1 — the select screen previews the selected level\'s well layout', () => {
  it('draws the well geometry for the selected level via tubeForLevel', () => {
    // The preview must come from the canonical geometry table (tubeForLevel →
    // ROM_REMAP), the SAME source the playfield uses — not a bespoke drawing.
    expect(select, "drawSelect must build the preview from tubeForLevel(...)")
      .toMatch(/tubeForLevel\s*\(/)
  })

  it('keys the preview to the SELECTED level, not a fixed one', () => {
    // tubeForLevel(1) hardcoded would show the same web for every choice — the
    // whole point is that spinning the chooser changes the previewed layout.
    expect(select, 'the previewed tube must be tubeForLevel(...selectedLevel...)')
      .toMatch(/tubeForLevel\s*\([^)]*selectedLevel/)
  })

  it('strokes the well outline as a polyline (the ROM DSPHOL rim, no spokes)', () => {
    // DSPHOL draws the rim outline only; a scaled glowPolyline over the near ring
    // is exactly that. drawSelect draws no polyline today.
    expect(select, 'drawSelect must stroke the preview outline via glowPolyline')
      .toMatch(/glowPolyline\s*\(/)
  })
})

// ---- AC2: the bonus VALUE, from the same function the sim pays --------------

describe('pt1-9 AC2 — the select screen shows the start bonus, single source of truth', () => {
  it('computes the shown bonus from startWaveBonus(...)', () => {
    expect(select, 'drawSelect must read the bonus from startWaveBonus(...)')
      .toMatch(/startWaveBonus\s*\(/)
  })

  it('applies startWaveBonus to the SELECTED level — so shown == paid by construction', () => {
    // The sim pays startWaveBonus(level) with level === selectedLevel at start
    // (sim.ts:707 via startGameAtLevel). Showing startWaveBonus(selectedLevel)
    // makes the displayed number identical to the paid one, always.
    expect(select, 'the shown bonus must be startWaveBonus(...selectedLevel...)')
      .toMatch(/startWaveBonus\s*\([^)]*selectedLevel/)
  })

  it('renders the bonus through a text-draw call (it appears on screen)', () => {
    const carriesBonus = textDrawCalls(select).some((c) => {
      const a = argsOf(c)
      return a.length >= 2 && /startWaveBonus/.test(a[1])
    })
    expect(carriesBonus, 'a drawGlowText/vecText call must carry the startWaveBonus value')
      .toBe(true)
  })

  it('does NOT hand-copy the bonus ladder as literals into the select screen', () => {
    // A hardcoded ladder is the exact defect AC2 forbids: it can drift from the
    // paid value. None of the ladder magnitudes may appear as literals here.
    const LADDER = ['6000', '16000', '32000', '54000', '74000', '94000', '114000']
    for (const v of LADDER) {
      const re = new RegExp(v.replace(/(\d)(?=(\d{3})+$)/g, '$1_?')) // 16000 or 16_000
      expect(select, `select must not hardcode the bonus literal ${v}`).not.toMatch(re)
    }
  })
})

// ---- AC4: no photosensitive strobe (accessibility outranks fidelity) -------

describe('pt1-9 AC4 — the preview/bonus add no fast luminance strobe (Decision B)', () => {
  // Safety regression guard (green on arrival; proven non-vacuous by the bound).
  // Photosensitive-epilepsy rule: no >3 Hz large-area luminance strobing in any
  // game. drawSelect's only animation today is the PRESS FIRE blink at
  // renderTime*4 (~0.64 Hz). Any preview/bonus animation must stay gentle: no
  // Math.sin(renderTime * K) with K above ~8 rad/s (~1.3 Hz), well under 3 Hz.
  it('introduces no sine flash faster than the existing gentle blink', () => {
    const re = /Math\.sin\(\s*renderTime\s*\*\s*([\d.]+)\s*\)/g
    const coeffs: number[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(select))) coeffs.push(parseFloat(m[1]))
    for (const k of coeffs) {
      expect(k, `sine flash coefficient ${k} rad/s exceeds the ~1.3 Hz strobe ceiling`)
        .toBeLessThanOrEqual(8)
    }
  })
})
