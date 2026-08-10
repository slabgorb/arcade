// plugins/missile-command/tests/mc10-4-per-wave-palette-wiring.test.ts
//
// Story mc10-4 — RED phase (Tyr One-Handed / TEA). The per-wave palette is real
// (paletteForWave, mc9-2) and drawFrame reads it from its 5th `wave` argument. But
// the SHELL never feeds the live wave: main.ts's frame loop calls
//   drawFrame(context, game, canvas.width, canvas.height)
// — four args — so the 5th param falls back to its `wave = INITIAL_WAVE` default and
// EVERY frame renders the wave-1 palette forever, no matter how far the game advances
// (GameState.wave climbs at each wave-end, game.ts:405). The fix is one argument:
//   drawFrame(context, game, canvas.width, canvas.height, game.wave)
//
// Two contracts, two shapes of test:
//
// AC1 — the WIRING (the genuine RED). main.ts is the DOM entry: it touches
// `document` at module top, so it cannot be imported under node/vitest. We pin the
// call by SOURCE TEXT — the fleet ?raw idiom already used by place-cursor.test.ts and
// mc8-4-event-wiring.test.ts. Comments are stripped first (mc9-2 review, round 1: a
// header comment naming the symbol can satisfy a whole-file grep — mutation-proven),
// so the guard anchors to real CODE. The current 4-arg call reddens both assertions.
//
// AC2 — the CONSEQUENCE (a control comparison, green-on-arrival). drawFrame's per-wave
// palette machinery predates this story, so we can reproduce the bug behaviourally:
// paint a state that is ON a later wave the FROZEN way (4-arg → default INITIAL_WAVE)
// and the WIRED way (5-arg → game.wave), and assert the skies DIFFER. A frozen palette
// still returns a valid colour, so a bare non-null check would pass on the bug and
// prove nothing; the difference against the wave-1 control is the whole point.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'
import { paletteForWave, rgbCss, SLOT } from '../src/shell/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── AC1: main.ts wires game.wave into the drawFrame call ────────────────────────
describe('mc10-4 AC1 — main.ts passes the live game.wave as drawFrame\'s 5th argument', () => {
  const mainSrc = readFileSync(join(root, 'src', 'main.ts'), 'utf8')
  // Strip block + line comments so a comment mentioning `game.wave` or the old call
  // shape can never satisfy (or falsely fail) a guard. Guards see CODE only.
  const code = mainSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('calls drawFrame(..., canvas.height, game.wave) — the wave reaches render', () => {
    // game.wave must be the argument that FOLLOWS canvas.height, i.e. the 5th positional
    // arg the palette reads — not merely present somewhere in the call. Anchoring on
    // `canvas.height, game.wave)` rejects the mutation that drops game.wave into an
    // earlier slot.
    expect(code, 'main.ts must pass game.wave as drawFrame\'s 5th argument').toMatch(
      /drawFrame\s*\([^)]*canvas\.height\s*,\s*game\.wave\s*\)/,
    )
  })

  it('no longer makes the bare 4-arg drawFrame(...canvas.height) call that freezes wave 1', () => {
    // The frozen call — drawFrame(context, game, canvas.width, canvas.height) with no
    // 5th arg — must be gone. This is the assertion that reddens on today's main.ts.
    expect(code, 'the 4-arg drawFrame call (defaults wave→INITIAL_WAVE) must be replaced').not.toMatch(
      /drawFrame\s*\([^)]*canvas\.height\s*\)/,
    )
  })
})

// ─── AC2: passing the LIVE wave changes the sky vs the frozen default ─────────────
describe('mc10-4 AC2 — feeding game.wave (not the INITIAL_WAVE default) changes the sky', () => {
  const W = 256
  const H = 231
  const SKY = SLOT.SKY

  // A recording ctx that snapshots the fill at the full-canvas background clear — the
  // sky. Same shape as the sibling render-palette mock; we only need the background.
  function skyOf(state: GameState, wave?: number): string {
    let sky = ''
    const api: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '' }
    const noop = (): void => {}
    Object.assign(api, {
      fillRect: (x: number, y: number, w: number): void => {
        if (x === 0 && y === 0 && w === W && sky === '') sky = String(api.fillStyle)
      },
      strokeRect: noop, rect: noop, moveTo: noop, lineTo: noop, arc: noop, ellipse: noop,
      fillText: noop, strokeText: noop, beginPath: noop, closePath: noop, fill: noop, stroke: noop,
      save: noop, restore: noop, translate: noop, scale: noop, setTransform: noop, clip: noop,
    })
    // Park the crosshair off the structure columns, like the sibling render tests.
    const parked: GameState = { ...state, cursor: { h: 5, v: 210 } }
    drawFrame(api as unknown as CanvasRenderingContext2D, parked, W, H, wave)
    return sky
  }

  // WV1COL sky = CBLACK (wave 1); WVCCOL sky = CWHITE (wave 17) — a visibly different
  // backdrop, so this pin does not depend on a subtle near-equal pair.
  const LATER_WAVE = 17
  // A live game that has advanced to a later wave — exactly the state main.ts holds
  // mid-run and today paints with the frozen wave-1 palette.
  const laterGame: GameState = { ...createGame(1), wave: LATER_WAVE }

  it('the FROZEN 4-arg paint of a wave-17 game yields the WAVE-1 sky (reproduces the bug)', () => {
    const frozen = skyOf(laterGame) // no 5th arg → default INITIAL_WAVE
    expect(frozen, 'the default-wave paint must equal the wave-1 palette sky').toBe(
      rgbCss(paletteForWave(1)[SKY]),
    )
  })

  it('the WIRED paint (game.wave) yields the wave-17 sky, which DIFFERS from wave 1', () => {
    const wired = skyOf(laterGame, laterGame.wave) // 5th arg = game.wave
    const frozen = skyOf(laterGame)
    expect(wired, 'passing game.wave must select the wave-17 palette sky').toBe(
      rgbCss(paletteForWave(LATER_WAVE)[SKY]),
    )
    expect(wired, 'the wired sky must differ from the frozen wave-1 sky (the visible fix)').not.toBe(frozen)
  })
})
