// tests/shell/windshield-crack-gate.test.ts
//
// Story bz5-1 (epic bz5) — RED phase (Leeloo / TEA). The shell half of the
// windshield-crack fix: the cracked-glass overlay must be GATED on the core
// `crack` counter (tests/core/windshield-crack.test.ts pins that counter), not
// stroked unconditionally every frame.
//
// The ROM gates the whole windshield on CRACK at BZONE.MAC:506-508
// (`LDA CRACK / BEQ 31$ / JMP WNSHLD`): CRACK == 0 draws the clear window,
// CRACK != 0 draws the cracked one. Our shell must mirror that — read
// `game.crack` (the core computes it; the shell only READS, preserving core
// purity) and call `drawCrackedGlass` only when it is non-zero.
//
// main.ts:276 currently calls `drawCrackedGlass(ctx, w, h)` as a bare,
// unconditional statement, so the viewport "starts cracked". renderFrame closes
// over module/DOM state and is not exported, so this is a source-level wiring
// guard rather than a render unit test; the behavioural pin lives in the core
// test. It is intentionally tolerant of both the one-line and block `if` forms.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const mainSrc = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8')

describe('windshield crack — the shell gates the overlay on core crack (bz5-1)', () => {
  it('the render path READS the core crack counter (game.crack)', () => {
    // The shell reads the flag core computes — the same `game.<field>` idiom the
    // renderer already uses for game.bounce / game.mode / game.radar.
    expect(mainSrc, 'main.ts must read game.crack in the render path').toMatch(/game\.crack/)
  })

  it('drawCrackedGlass is called ONLY under an `if` that tests crack — no unconditional draw', () => {
    // Matches `if (…crack…) drawCrackedGlass(` (one-line) AND
    // `if (…crack…) {` <newline+indent> `drawCrackedGlass(` (block). The current
    // bare call — preceded only by a comment, no `if` — matches neither → RED.
    expect(mainSrc, 'the overlay draw must be guarded by a crack test').toMatch(
      /if\s*\([^)]*\bcrack\b[^)]*\)[\s\S]{0,80}drawCrackedGlass\s*\(/,
    )
  })
})
