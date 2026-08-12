// tests/lava-shore-jt11-5-wiring.test.ts
//
// Story jt11-5 — RED phase (Tyr / TEA). The SOURCE-WIRING arm of the lava-shore
// story: the behaviour suite (tests/lava-shore-jt11-5.test.ts) proves the
// destruction is consumed; this file pins that it is consumed THROUGH the jt3-2
// seam — the dead queries the story names (`groundOutcomeInState`,
// `backgroundActive`, arena-state.ts) become the production path, rather than
// each consumer re-deriving the veto inline and leaving the seam dead with the
// suite green.
//
// The idiom is hud-jt11-2's hardened `?raw` scan: a grep satisfied by comment
// prose proves nothing (the jt9-era lesson), so every scan below runs over
// comment-STRIPPED source text, and the stripper itself is controlled both ways.
//
// main.ts is the one surface a node suite cannot execute (no canvas), so the
// shell's half of defect A — a `kind: 'fill'` op painted with `fillRect` —
// is pinned the same way (the render-jt4-5 / select-wiring precedent).
//
// Deliberately NOT pinned: a caller for `bridgeGroundOutcome`. The burn's
// production path runs through the conditional mask (`groundMaskAt` + arena),
// which subsumes that query; forcing a call-site would be wiring for wiring's
// sake. Logged as a Question in the session's Delivery Findings.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

/** Comment-stripped source text (the hud-jt11-2 stripper, verbatim). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const stripped = (rel: string): string =>
  stripComments(readFileSync(join(srcDir, rel), 'utf8'))

describe('the stripper is controlled both ways (a vacuous scan pins nothing)', () => {
  it('removes line and block comments', () => {
    const text = 'a()\n// groundOutcomeInState(\n/* backgroundActive( */\nb()'
    const s = stripComments(text)
    expect(s).not.toMatch(/groundOutcomeInState\s*\(/)
    expect(s).not.toMatch(/backgroundActive\s*\(/)
  })

  it('keeps code', () => {
    expect(stripComments('const x = groundOutcomeInState(arena, m)')).toMatch(
      /groundOutcomeInState\s*\(/,
    )
  })
})

describe('jt11-5 — the dead arena-state queries become the production path', () => {
  // The story's named defect: groundOutcomeInState / backgroundActive had ZERO
  // callers outside arena-state.ts — destruction was computed every wave and
  // consumed only by the troll gate. Each consumer file must now CALL the seam
  // (a call, `name(`, not a bare import — an import alone is the jt2-7
  // routing≠geometry trap).

  it('frame.ts (the player land/walk-off pair) calls groundOutcomeInState', () => {
    expect(stripped('core/frame.ts')).toMatch(/\bgroundOutcomeInState\s*\(/)
  })

  it('enemy.ts (stepEntity’s land/walk-off pair) calls groundOutcomeInState', () => {
    expect(stripped('core/enemy.ts')).toMatch(/\bgroundOutcomeInState\s*\(/)
  })

  it('enemy.ts (the BCKXTB look-ahead) calls backgroundActive', () => {
    expect(stripped('core/enemy.ts')).toMatch(/\bbackgroundActive\s*\(/)
  })

  it('demo.ts (the egg fall loop) calls groundOutcomeInState', () => {
    expect(stripped('core/demo.ts')).toMatch(/\bgroundOutcomeInState\s*\(/)
  })
})

describe('jt11-5 — the shell paints a fill op (defect A’s render half)', () => {
  it('main.ts dispatches on the new fill kind', () => {
    // A branch on the op kind — `op.kind === 'fill'` or a switch case — not a
    // comment and not the substring inside `fillStyle`/`fillRect`.
    expect(stripped('main.ts')).toMatch(/kind\s*===\s*['"]fill['"]|case\s+['"]fill['"]/)
  })

  it('main.ts paints rectangles somewhere (fillRect premise — passes today via drawIsland)', () => {
    // A premise, not the RED: the fill branch above must resolve to a real
    // fillRect painter, and this pin keeps that painter from being deleted out
    // from under it.
    expect(stripped('main.ts')).toMatch(/\.fillRect\s*\(/)
  })
})
