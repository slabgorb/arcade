// plugins/defender/tests/df7-5-hud-scanner.test.ts
//
// Story df7-5 — RED phase (Leeloo / TEA). The HUD + scanner render story, reached via
// /pf-work df7-7 (df7-7 is the epic's capstone visual playtest and is blocked on THIS
// story + df7-4; the user ruled df7-5 first).
//
// ─── PREMISE REFUTED, SCOPE NARROWED (see the session Delivery Findings) ──────────────
// df7-5's description says "the scanner is projected in core (df5-1) but drawn NOWHERE
// today" and its AC1 says the scanner is "drawn nowhere today". That is STALE: df5-7
// already wired `drawScanner` (live-attacker blips, coloured by palette INDEX) and
// `drawHud` (score + men) into core/scene.ts `composeFrame`, and df5-7's own comment
// (scene.ts:186-192) explicitly LEFT to df7 "the scanner SCREEN-ADDRESS/bezel/player-blip".
// So the genuine, un-built df7-5 delta is:
//   • AC1 — the scanner BEZEL: the radar strip's frame, drawn REGARDLESS of attackers
//           (*SCANNER BEZEL defender/AMODE1.SRC:1225, the 64-col strip :1223 already
//           claimed). Today drawScanner early-returns with zero attackers → no frame.
//   • AC2 — the WAVE number in the HUD. drawHud writes score + men only; composeFrame
//           reads state.wave for NOTHING today.
// The attacker-blip + score/men render already shipped in df5-7 and is green there — a
// test asserting it would pass on arrival (vacuous RED), so this file does NOT re-assert
// it. The player-blip (:1242-1257) is in the ROM and named as df7's, but is NOT in df7-5's
// ACs, so it is flagged in the session findings for a scope ruling, not tested here.
//
// This suite is BLACK-BOX over composeFrame (the df5-7 digest/top-band technique): it
// pins BEHAVIOUR (the bezel reaches the frame, the wave reaches the HUD, nothing strobes),
// never an internal constant or export name — GREEN is free to choose the layout.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, spawnLander, type SimState } from '../src/core/sim.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { SCANNER_COLUMNS } from '../src/core/scanner.js'
import { wrap16 } from '../src/core/world.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df4-6/df5-7 precedent)
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0
const WORLD = 0x10000
/** The top rows that hold the compressed radar strip (objY>>3), above the play field (df5-7). */
const SCANNER_BAND_ROWS = 40

/** Deterministic byte source (LCG) — the df3-6/df4-6/df5-7 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/**
 * The longest horizontal run of a SINGLE non-background palette index within the top
 * `rows` of the frame. A radar bezel frames the 64-column strip, so its horizontal rule
 * is a contiguous run of at least SCANNER_COLUMNS cells; sparse stars and the few HUD
 * glyphs never span that width, so this cleanly separates "a bezel is drawn" from "the
 * top band merely has stars + score text".
 */
function longestTopBandRun(fb: Framebuffer, rows: number): number {
  let best = 0
  for (let y = 0; y < rows && y < fb.height; y++) {
    let run = 0
    let prev = -1
    for (let x = 0; x < fb.width; x++) {
      const px = fb.data[y * fb.width + x]
      if (px !== BACKGROUND && px === prev) {
        run++
      } else {
        run = px !== BACKGROUND ? 1 : 0
      }
      prev = px
      if (run > best) best = run
    }
  }
  return best
}

/** A play state with NO live attacker — isolates the bezel (drawn regardless) from blips. */
function unpopulatedPlayState(seed: number): SimState {
  return { ...createSim(makeRand(seed)), landers: [] }
}

// ─── AC2 — the HUD renders the WAVE number (df5-2 counter → pixels) ────────────────────
describe('df7-5 AC2 — the wave number reaches the HUD', () => {
  it('composeFrame CHANGES when only state.wave differs — the HUD paints the wave figure', () => {
    // Isolate the wave's contribution exactly as df5-7 isolates score/men: two states
    // identical but for `wave`. df5-7's drawHud writes score + men ONLY and composeFrame
    // reads state.wave for nothing else, so today the digests MATCH → RED. GREEN adds the
    // wave figure to the HUD (df5-2 `wave`), by df2 charset/palette INDEX.
    const base = createSim(makeRand(2))
    const advanced: SimState = { ...base, wave: base.wave + 7 }
    expect(
      digest(composeFrame(advanced, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'composeFrame ignored state.wave — the wave number never reaches the HUD (drawHud writes score + men only)',
    ).not.toBe(digest(composeFrame(base, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })
})

// ─── AC1 — the scanner BEZEL frames the radar strip, attacker-independent ──────────────
describe('df7-5 AC1 — the scanner bezel is drawn (AMODE1.SRC:1225)', () => {
  it('a play state with NO live attacker still draws the radar-strip bezel frame', () => {
    // df5-7's drawScanner early-returns when no attacker is live, so today the top band
    // holds only sparse stars and the corner HUD glyphs — neither spans the 64-column
    // strip. The bezel (*SCANNER BEZEL AMODE1.SRC:1225, framing the :1223 64-col strip)
    // is drawn REGARDLESS of attackers, so its horizontal rule is a run of ≥ SCANNER_COLUMNS
    // same-index cells in the top band. RED today (no bezel); GREEN draws the frame.
    const fb = composeFrame(unpopulatedPlayState(3), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      longestTopBandRun(fb, SCANNER_BAND_ROWS),
      'no radar bezel is drawn — with no attacker live the top band has no run spanning the 64-column strip',
    ).toBeGreaterThanOrEqual(SCANNER_COLUMNS)
  })

  it('the bezel is drawn by palette INDEX only — every top-band cell stays 0..15, no invented colour', () => {
    // AC1: "blip colour is a df2 palette INDEX, never a hex literal" — same for the bezel.
    // An index > 15 would decode as CRAM[i&0x0f], a colour the palette never named. Guards
    // the NEW bezel code (green today, rejects a bezel drawn with an out-of-range index).
    const fb = composeFrame(unpopulatedPlayState(5), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    let worst = 0
    for (let i = 0; i < SCANNER_BAND_ROWS * fb.width; i++) if (fb.data[i] > worst) worst = fb.data[i]
    expect(worst, `a top-band cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(15)
  })
})

// ─── AC4 — no full-frame strobe from the bezel/HUD; stable across frames (ADR-0005) ────
describe('df7-5 AC4 — the HUD/scanner draw never strobes and is stable (ADR-0005, Decision B)', () => {
  it('a static play state renders identically twice — no per-frame flicker', () => {
    // The whole draw is a pure function of state: same state in → same indices out. A
    // bezel/HUD that flickered frame-to-frame (a strobe hazard for the photosensitive
    // owner) would break determinism here.
    let s = createSim(makeRand(11))
    s = spawnLander(s, wrap16(s.camera + WORLD / 2)) // an off-camera attacker → a live scanner blip
    expect(digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))).toBe(
      digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
    )
  })

  it('the populated HUD/scanner frame is not a full-frame strobe against the play field', () => {
    // Decision B / ADR-0005: no full-frame luminance flip anywhere. The bezel + HUD +
    // blips are a SMALL overlay on the play field, never a whole-screen event. Compare the
    // populated frame against the same state with the strip stripped (landers removed):
    // assertNoFullFrameStrobe must accept the delta (a bounded change, not a page invert).
    let s = createSim(makeRand(13))
    s = spawnLander(s, wrap16(s.camera + WORLD / 2))
    const populated = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const stripped = composeFrame({ ...s, landers: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(() => assertNoFullFrameStrobe(populated.data, stripped.data)).not.toThrow()
  })

  it('non-vacuity: assertNoFullFrameStrobe DOES reject an actual full-frame strobe', () => {
    // Guards the safety test above — if the guard accepted everything it would prove nothing.
    const base = composeFrame(unpopulatedPlayState(17), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const strobe = new Uint8Array(base.data.length).fill(0x0f)
    expect(() => assertNoFullFrameStrobe(base.data, strobe)).toThrow()
  })
})
