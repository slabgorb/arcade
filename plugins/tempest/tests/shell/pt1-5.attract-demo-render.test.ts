// tests/shell/pt1-5.attract-demo-render.test.ts
//
// Story pt1-5 (RED, O'Brien / TEA) — the render WIRING guard: the attract screen
// must draw the self-play DEMO scene when the demo is running, instead of
// suppressing the whole scene to show only the wordmark.
//
// render.ts draws to a live canvas (phosphor needs `document`; untestable in
// vitest's `node` env) — so, exactly like render.title-rainbow.test.ts and the warp
// dispatch guard, the testable seam for "is it wired?" is the render source read via
// Vite's `?raw`. The pixel-level behaviour ("scene differs from the wordmark") is
// covered where it CAN be exercised: the core cycle test proves `s.demoActive` is
// true on the demo page, and this proves render consults it.
//
// THE BUG (pt1): render.ts:1041 suppresses the entire phosphor scene for
// `mode === 'attract'` and returns after drawing the framing chrome only — the 4-2
// F1 ghost-tube fix. That suppression must become CONDITIONAL on `!s.demoActive`, so
// the demo page falls through to the scene path; the ghost-tube fix must survive for
// every OTHER framing case (a stale board must never leak on the ladder/logo pages,
// on select, or on highscore).

import { describe, it, expect } from 'vitest'
import renderSrc from '../../src/shell/render.ts?raw'

// Bound the suppression window with CODE on both sides (checklist #25): the render()
// definition below, and the phosphor scene path above. The framing early-return that
// this story makes conditional lives strictly inside this window.
const iRender = renderSrc.indexOf('export function render(')
const iScene = renderSrc.indexOf('phosphor.beginScene', iRender)
const suppressionWindow = iRender > -1 && iScene > iRender ? renderSrc.slice(iRender, iScene) : ''

// Slice drawAttract's body the same way render.title-rainbow.test.ts does, to guard
// the wordmark chrome is not lost when the attract screen gains its extra pages.
const iAttract = renderSrc.indexOf('function drawAttract')
const iNextFn = renderSrc.indexOf('function drawSelect', iAttract)
const attractSrc = iAttract > -1 && iNextFn > iAttract ? renderSrc.slice(iAttract, iNextFn) : ''

describe('pt1-5 render wiring — locate the seams', () => {
  it('finds render() and the phosphor scene path that bound the suppression window', () => {
    expect(iRender, 'render.ts must define export function render()').toBeGreaterThan(-1)
    expect(iScene, 'render() must open the phosphor scene with beginScene()').toBeGreaterThan(iRender)
  })

  it('finds the drawAttract() body followed by drawSelect()', () => {
    expect(iAttract, 'render.ts must define drawAttract()').toBeGreaterThan(-1)
    expect(iNextFn, 'drawAttract() must be followed by drawSelect()').toBeGreaterThan(iAttract)
  })
})

describe('pt1-5 render wiring — the attract scene is gated on demoActive', () => {
  // Anchor to `s.demoActive` used in a BOOLEAN EXPRESSION inside the suppression
  // window — not a bare word that a comment could satisfy (checklist #15). Deleting
  // the gate, or letting attract fall through unconditionally, reddens this.
  it('the framing suppression consults s.demoActive so the demo page draws the scene', () => {
    expect(suppressionWindow).toMatch(/[!&|(]\s*s\.demoActive\b|\bs\.demoActive\s*[)&|]/)
  })

  // The 4-2 F1 ghost-tube fix must survive: the frame-only suppression is still there
  // for the non-demo framing modes, so a stale board never leaks on ladder/logo/
  // select/highscore. Anchor to the modes that must STAY suppressed.
  it('still suppresses the scene (drawFrame + return) for select and highscore', () => {
    expect(suppressionWindow).toMatch(/s\.mode === 'select'/)
    expect(suppressionWindow).toMatch(/s\.mode === 'highscore'/)
    expect(suppressionWindow).toMatch(/drawFrame\(/)
    expect(suppressionWindow).toMatch(/\breturn\b/)
  })

  it('still names the attract mode in the framing branch (it is not simply removed)', () => {
    expect(suppressionWindow).toMatch(/s\.mode === 'attract'/)
  })
})

describe('pt1-5 render wiring — the wordmark chrome is not regressed', () => {
  // The logo page keeps the approaching-rainbow wordmark and the PRESS START prompt;
  // these guard against the extra-pages work dropping the title screen (10-6).
  it('drawAttract still stacks the approaching-rainbow logo', () => {
    expect(attractSrc).toMatch(/titleLogoPasses\(/)
    expect(attractSrc).toMatch(/logoGlyph\(/)
  })

  it('drawAttract still draws the high-score table and the PRESS START prompt', () => {
    expect(attractSrc).toMatch(/drawHighScoreTable\(/)
    expect(attractSrc).toContain('PRESS START')
  })
})
