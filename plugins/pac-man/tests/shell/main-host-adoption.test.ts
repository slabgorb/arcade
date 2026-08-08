// tests/shell/main-host-adoption.test.ts
//
// Story SH3-4 — RED phase (Tyr One-Handed / TEA). Shared-module adoption: pac-man's
// `src/main.ts` must retire its hand-rolled canvas-mount + 1× resize boilerplate in
// favour of the shared primitives `@shared/host-helpers.mountCanvas` and
// `@shared/view.resizeToDisplay`.
//
// ⚠ The sprint-YAML TITLE is materially stale (see sprint/context/context-story-SH3-4.md,
// the SM CORRECTION block). This test pins the CORRECTED scope, not the title:
//   • AC-1  mount via @shared/host-helpers.mountCanvas  (retire `querySelector('#game')`)
//   • AC-2  DPR-aware resize via @shared/view.resizeToDisplay (retire `canvas.width = canvas.clientWidth`)
//   • AC-3  KEEP pac-man's own `fitIntegerScale`; do NOT swap in `@shared/view.letterbox`
//           (a raster cabinet needs whole-number integer scale — letterbox() is fractional/aspect)
//   • AC-4  the rng/loop determinism seam is a raster no-op here and must stay untouched
//
// main.ts is a side-effectful boot module: it runs `document.querySelector` at import,
// throws without a real `<canvas id="game">`, and starts a requestAnimationFrame loop —
// none of which exists in the node vitest env. Its wiring is therefore pinned by the
// `?raw` source read, the reviewer-blessed idiom (tp1-39; centipede cp1-6
// tests/main-loop.test.ts). The observable render half (crisp pixels unchanged) is the
// human screenshot in review; this file is the mechanical half.
//
// RED now: the AC-1/AC-2 assertions fail because main.ts still hand-rolls both seams.
// The AC-3/AC-4 groups are GREEN regression guards — they must stay green so the GREEN
// refactor cannot force a false-match letterbox swap or rip out the determinism seed.

import { describe, it, expect } from 'vitest'
import mainSrc from '../../src/main.ts?raw'

// cp2-1 R3 hardening (ported): strip line + block comments so a token that survives
// only in a doc comment (e.g. a mention of `mountCanvas` in this very header's sibling
// files, or a gutted call) can never satisfy a positive scan. The arcade source
// scanners read comments — every assertion below runs against comment-free code.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const code = stripComments(mainSrc)

describe('SH3-4 AC-1 — mount the canvas via @shared/host-helpers.mountCanvas', () => {
  it('imports mountCanvas from @shared/host-helpers', () => {
    expect(code, 'main.ts must import from @shared/host-helpers').toMatch(/from\s+['"]@shared\/host-helpers['"]/)
    expect(code, 'the imported binding must be mountCanvas').toMatch(/\bmountCanvas\b/)
  })

  it('calls mountCanvas() to acquire the #game canvas + 2d context', () => {
    expect(code, 'main.ts must CALL mountCanvas(), not merely import it').toMatch(/\bmountCanvas\s*\(/)
  })

  it('retires the hand-rolled querySelector(\'#game\') mount boilerplate', () => {
    // Today main.ts:43 does `document.querySelector<HTMLCanvasElement>('#game')`.
    // mountCanvas owns that lookup + the null/not-a-canvas guards now, so the raw
    // querySelector('#game') must be gone from main.ts (proves adoption, not a
    // dead second import sitting beside the old code).
    expect(code, "main.ts must no longer hand-roll querySelector('#game') — mountCanvas replaces it").not.toMatch(
      /querySelector[^\n]*#game/,
    )
  })
})

describe('SH3-4 AC-2 — DPR-aware resize via @shared/view.resizeToDisplay', () => {
  it('imports resizeToDisplay from @shared/view', () => {
    expect(code, 'main.ts must import from @shared/view').toMatch(/from\s+['"]@shared\/view['"]/)
    expect(code, 'the imported binding must be resizeToDisplay').toMatch(/\bresizeToDisplay\b/)
  })

  it('calls resizeToDisplay() in the resize lifecycle', () => {
    expect(code, 'main.ts must CALL resizeToDisplay()').toMatch(/\bresizeToDisplay\s*\(/)
  })

  it('feeds a real device pixel ratio (the DPR the old resize entirely lacked)', () => {
    // The current resize sets canvas.width = clientWidth — always 1×, zero DPR.
    // resizeToDisplay(canvas, cssW, cssH, rawDpr) folds in the MAX_DPR=2 cap +
    // falsy-guard, so main.ts must actually pass devicePixelRatio through. pac-man
    // has NO occurrence of devicePixelRatio today, so this is a clean RED.
    expect(code, 'main.ts must pass window.devicePixelRatio into resizeToDisplay').toMatch(/\bdevicePixelRatio\b/)
  })

  it('retires the hand-rolled 1× resize (canvas.width = canvas.clientWidth)', () => {
    expect(code, 'the always-1× resize must be gone — resizeToDisplay owns the backing-store sizing').not.toMatch(
      /canvas\.width\s*=\s*canvas\.clientWidth/,
    )
    expect(code, 'the always-1× resize must be gone (height half too)').not.toMatch(
      /canvas\.height\s*=\s*canvas\.clientHeight/,
    )
  })
})

describe('SH3-4 AC-3 — keep the raster integer letterbox; do NOT swap in @shared/view.letterbox', () => {
  it('still applies pac-man\'s own fitIntegerScale (whole-number crisp scale)', () => {
    expect(code, 'fitIntegerScale must remain — it is the crisp raster letterbox').toMatch(/\bfitIntegerScale\b/)
  })

  it('keeps crisp pixels (imageSmoothingEnabled = false)', () => {
    expect(code, 'crisp-pixel blit must be preserved').toMatch(/imageSmoothingEnabled\s*=\s*false/)
  })

  it('does NOT adopt @shared/view.letterbox (a fractional/aspect fn — a false match for a raster cabinet)', () => {
    // resizeToDisplay is a distinct token; \bletterbox\b cannot match it. This guards
    // the reuse-first ruling: share the VERB (resize/DPR), keep the NUMBERS (integer scale).
    expect(code, 'main.ts must not use @shared/view.letterbox — it would break crisp integer pixels').not.toMatch(
      /\bletterbox\b/,
    )
  })
})

describe('SH3-4 AC-4 — no determinism regression (host-lifecycle refactor must not touch the seed/loop seam)', () => {
  it('still paces the sim through the timebase pump (pumpFrame)', () => {
    expect(code, 'the fixed-timestep pump must survive the mount/resize refactor').toMatch(/\bpumpFrame\b/)
  })

  it('still seeds the core via createGameState()', () => {
    expect(code, 'the sim seed seam must be untouched').toMatch(/\bcreateGameState\s*\(/)
  })

  it('still honours the shell-only ?seed= determinism override', () => {
    expect(code, "the ?seed= replay override must survive — it is how a pinned render is reproduced").toMatch(
      /params\.get\(\s*['"]seed['"]\s*\)/,
    )
  })
})
