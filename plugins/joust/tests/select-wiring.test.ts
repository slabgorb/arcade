// tests/select-wiring.test.ts
//
// Story jt10-5 — RED (Tyr / TEA). AC-3: main.ts wires the cabinet's 'select' mode
// to the select overlay and the start-select handler. main.ts is a SHELL file
// that touches the canvas/DOM, so a node test cannot run its frame loop — what it
// CAN pin (the render.ts?raw source-wiring idiom the design's testing strategy
// names) is that the wiring LINES are present: the cabinet tier is imported and
// stepped, the 'select' branch renders the overlay, the start press maps through
// selectPlayerCount into startPlaying, and the press is EDGE-debounced so a held
// start button does not re-seed the game every frame (typescript lang-review #14).
//
// Deliberately NOT pinned here (see the TEA assessment's Delivery Findings):
//  • WHICH mode main.ts boots into. createCabinet boots 'attract', whose self-play
//    render is jt10-4 (not yet built) — booting there would render nothing and
//    break today's working demo. The boot slice (likely: boot straight to 'select'
//    until jt10-4 lands attract→select) is Dev's/Architect's call; a human smoke
//    test confirms the screen renders.
//  • Pixel placement / colours — a human smoke test + reference capture.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

// A single import statement's specifier + brace-list, so an assertion can check a
// symbol is imported FROM a given module (not merely mentioned in a comment).
function importsFrom(src: string, moduleMatch: RegExp, symbol: string): boolean {
  const importRe = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g
  for (const m of src.matchAll(importRe)) {
    const [, names, spec] = m
    if (moduleMatch.test(spec) && names.split(',').some((n) => n.trim().replace(/\s+as\s+.*/, '') === symbol)) {
      return true
    }
  }
  return false
}

describe('AC-3 main.ts wires the cabinet select mode to the overlay + handler', () => {
  it('imports the cabinet tier (startPlaying) from core/cabinet', () => {
    const src = readMain()
    // Kills "main.ts still boots straight into createGame and never enters the
    // cabinet machine" — the pre-jt10-5 state of this file.
    expect(importsFrom(src, /core\/cabinet(\.js)?$/, 'startPlaying'), 'startPlaying from core/cabinet').toBe(true)
  })

  it('imports selectPlayerCount from core/select', () => {
    expect(importsFrom(readMain(), /core\/select(\.js)?$/, 'selectPlayerCount'), 'selectPlayerCount import').toBe(
      true,
    )
  })

  it('imports the select overlay (layoutSelectScreen) from shell/selectScreen', () => {
    expect(
      importsFrom(readMain(), /shell\/selectScreen(\.js)?$/, 'layoutSelectScreen'),
      'layoutSelectScreen import',
    ).toBe(true)
  })

  it('branches on the select mode and starts the game with the chosen count', () => {
    const src = readMain()
    // The 'select' mode literal drives the overlay branch...
    expect(src, "main.ts references the 'select' mode").toMatch(/['"]select['"]/)
    // ...and the chosen count flows selectPlayerCount → startPlaying.
    expect(src, 'main.ts calls selectPlayerCount').toMatch(/selectPlayerCount\s*\(/)
    expect(src, 'main.ts calls startPlaying to begin the game').toMatch(/startPlaying\s*\(/)
  })

  it('EDGE-debounces the start press so a HELD start button does not re-seed the game every frame', () => {
    const src = readMain()
    // lang-review #14 (derived edges in a state machine): startPlaying wraps a FRESH
    // createGame each call, so firing it while the start button is merely HELD would
    // re-seed the game every frame. main.ts already keeps prevFlap1/prevFlap2 for the
    // flap rising-edge; the start press needs the same. Tolerant on the identifier —
    // any "previous start/select" tracker satisfies it; the reviewer + human smoke
    // test confirm the debounce actually holds.
    expect(
      /\bprev\w*(start|select)\w*\b|\b(start|select)\w*prev\b|\b(was|held)\w*(start|select)\w*\b|\b(start|select)\w*edge\b/i.test(
        src,
      ),
      'main.ts tracks the previous-frame start press (a rising-edge guard)',
    ).toBe(true)
  })
})
