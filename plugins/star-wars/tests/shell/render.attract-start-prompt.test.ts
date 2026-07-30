// tests/shell/render.attract-start-prompt.test.ts
//
// sw9-3 RED — attract-mode parity pass (AC-1): the START INVITATION persists on
// EVERY attract page, not only the banner.
//
// Ground truth (1983 "Warp Speed" source, verified firsthand against
// ~/Projects/star-wars-1983-source-text; .RADIX 16 via WSCOMN.MAC:5):
//
//   The cabinet's four idle pages each run VWCOIN as their persistent bottom line:
//     PHEBNR WSMAIN.MAC:1268   PHEINS :702   PHESCR :733   PHEHIS :904
//   VWCOIN (WSMAIN.MAC:802-878) draws `MS.STR` = "PULL TRIGGER TO START"
//   (LDB #MS.STR, :815; string TCMES.MAC:549) whenever there is credit to start with —
//   i.e. the free-play / startable state, the ONLY state our clone models. So the
//   cabinet shows the start invitation on the banner, the flight brief, the scoring
//   table AND the hi-score board alike: a player reading any page still knows the
//   trigger starts the game.
//
//   By contrast the STAR WARS title is drawn by VWBNNR (TCMES.MAC:302), which runs
//   ONLY in PHEBNR — it is genuinely banner-only, and is the correct sentinel for
//   "did the whole banner leak onto another page?" (see the re-seated F5 guard in
//   render.attract-pages.test.ts, sw9-3 AC-2).
//
// OUR CLONE TODAY: `drawAttract` (render.ts:1474) dispatches per page and only
// `drawBannerPage` (render.ts:1502) draws "PULL TRIGGER TO START" (:1506). The three
// non-banner pages omit it → RED here. The parity fix draws the invitation on all four
// pages (mirroring VWCOIN) WITHOUT rendering the rest of the banner (VWBNNR/VWSPMS).
//
// Text is asserted at the layoutText seam (the sw7-10 framing-prompts idiom): `texts()`
// is what render() REQUESTED, captured before the shared VGMSGA font drops any glyph.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../../src/shell/render'
import { attractOn, type AttractPage } from '../support/sw710-contract'

const font = vi.hoisted(() => {
  const calls: { text: string }[] = []
  return {
    calls,
    layoutText(text: string) {
      calls.push({ text })
      return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 * [...text].length }
    },
  }
})

vi.mock('../../src/shell/font', () => ({
  layoutText: font.layoutText,
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_,/',
}))

const W = 800
const H = 600

function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = { canvas: { width: W, height: H } }
  return new Proxy(target, {
    get(t, p) {
      if (p === 'measureText') return () => ({ width: 0 })
      if (p in t) return t[p]
      return () => {}
    },
    set(t, p, v) {
      t[p] = v
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

const texts = (): string[] => font.calls.map((c) => c.text)
const has = (sub: string): boolean => texts().some((t) => t.includes(sub))
const renderPage = (page: AttractPage): void => {
  font.calls.length = 0
  render(makeCtx(), attractOn(page), W, H, [])
}

const ALL_PAGES: readonly AttractPage[] = ['banner', 'instructions', 'scoring', 'hiscore']
// The pages VWCOIN draws that our banner-only render omits today — the RED targets.
const NON_BANNER: readonly AttractPage[] = ['instructions', 'scoring', 'hiscore']

// The verbatim ROM string, MS.STR (TCMES.MAC:549). sw7-3 H-010 already ruled the
// invitation is this, not a "PRESS START" the cabinet never had.
const STR = 'PULL TRIGGER TO START'

beforeEach(() => {
  font.calls.length = 0
})

describe('sw9-3 AC-1 — the start invitation (MS.STR) persists on every attract page', () => {
  it.each(ALL_PAGES)('the %s page shows "PULL TRIGGER TO START" (VWCOIN runs on every attract phase)', (page) => {
    renderPage(page)
    expect(has(STR), `${page} must draw the persistent start invitation, like VWCOIN`).toBe(true)
  })

  // Stated as its own block so the failure names exactly which pages regress today: the
  // three non-banner pages that omit VWCOIN's invitation.
  it('the non-banner pages currently OMIT the invitation (the RED gap this story closes)', () => {
    for (const page of NON_BANNER) {
      renderPage(page)
      expect(has(STR), `${page} is missing the start invitation the cabinet shows via VWCOIN`).toBe(true)
    }
  })
})

describe('sw9-3 AC-1 — the fix adds ONLY the persistent line, not the whole banner', () => {
  // GUARD (green now, must stay green): VWBNNR's STAR WARS title is banner-only. The fix
  // must mirror VWCOIN (one persistent invitation), NOT render the marquee everywhere —
  // otherwise the crawl/title would bleed onto the text/board pages.
  it('the STAR WARS marquee title stays banner-only', () => {
    renderPage('banner')
    expect(has('STAR WARS'), 'the banner draws its own title').toBe(true)
    for (const page of NON_BANNER) {
      renderPage(page)
      expect(has('STAR WARS'), `${page} must NOT render the banner marquee title`).toBe(false)
    }
  })

  // GUARD: the two text pages keep their own copy and do not gain the other's — the
  // invitation is additive, it does not smear page content across pages.
  it('each text page keeps its own header only', () => {
    renderPage('instructions')
    expect(has('FLIGHT INSTRUCTIONS TO RED FIVE')).toBe(true)
    expect(has('SCORING'), 'instructions must not draw the scoring header').toBe(false)
    renderPage('scoring')
    expect(has('SCORING')).toBe(true)
    expect(has('FLIGHT INSTRUCTIONS TO RED FIVE'), 'scoring must not draw the brief header').toBe(false)
  })
})

describe('sw9-3 AC-1 — the invitation is the ROM MS.STR text', () => {
  // Reinforces sw7-3 H-010 across all four pages: the string is "PULL TRIGGER TO START",
  // never the cabinet-absent "PRESS START".
  it.each(ALL_PAGES)('the %s page never draws a "PRESS START" surrogate', (page) => {
    renderPage(page)
    expect(has('PRESS START'), `${page} must use the ROM MS.STR wording`).toBe(false)
  })
})
