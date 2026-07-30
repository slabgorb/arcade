// tests/shell/render.destroyed-shot-burst.test.ts
//
// Story sw8-3 — the destroy-burst is DRAWN when a fireball is shot down (RED phase,
// O'Brien / TEA). The SHELL half of the story.
//
// The core suite (tests/core/destroyed-shot-burst.test.ts) pins that a killed
// fireball spawns a `destroyedShots` entry that ages and expires. This suite pins
// that render() actually PAINTS it: a brief RED sparkle at the burst's position that
// fades out — the same VGCRED ink the live fireball body uses (WSVROM.MAC GNB/GNT,
// `COLOR VGCRED,0FF`), so a shot-down fireball leaves the cabinet afterimage instead
// of the current silent-delete.
//
// Asserted through the recording-canvas idiom (render.enemy-fireball /
// render.tie-death-fragments): we record every stroked segment with its colour and
// count RED ink in a tight window around the burst's projected screen point, so the
// red WAVE digit in the HUD (top of screen) and the cyan crosshair / grey Death Star
// can never satisfy a burst assertion. Exact hue, spike count and fade curve stay the
// eyeball's job per repo convention — we pin colour FAMILY (red) and PRESENCE/DECAY.
//
// EXPECTED TO FAIL until GREEN loops `state.destroyedShots` in render() and strokes a
// fading red sparkle at each. Today render() never reads the field, so there is no
// red ink at the burst and the "present" assertions fail.

import { describe, it, expect } from 'vitest'
import { render } from '../../src/shell/render'
import {
  initialState,
  ENEMY_SHOT_TTL,
  type GameState,
  type Projectile,
} from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { fireAt } from '../support/aim'
import type { Vec3 } from '@shared/math3d'

interface Seg {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

/** Canvas-context stub recording every stroked segment with its colour. Mirrors the
 *  proven stub in render.enemy-fireball.test.ts. */
function makeCtx() {
  const segments: Seg[] = []
  let pen: [number, number] = [0, 0]
  let curStroke = ''
  const ctx = {
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0,
    lineWidth: 0,
    font: '700 18px monospace',
    textAlign: '',
    textBaseline: '',
    letterSpacing: '',
    globalCompositeOperation: '',
    set strokeStyle(v: string) {
      curStroke = v
    },
    get strokeStyle() {
      return curStroke
    },
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo(x: number, y: number) {
      pen = [x, y]
    },
    lineTo(x: number, y: number) {
      segments.push({ x1: pen[0], y1: pen[1], x2: x, y2: y, color: curStroke })
      pen = [x, y]
    },
    arc() {},
    stroke() {},
    fill() {},
    save() {},
    restore() {},
    fillText() {},
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, segments }
}

const W = 800
const H = 600
const CENTER: [number, number] = [W / 2, H / 2]

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

/** Parse #rrggbb → [r,g,b]; non-hex colours read as black (excluded by isRed). */
function rgb(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c.trim())
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}
// A red-dominant vector colour (VGCRED family): strong red, weak green+blue. Accepts
// the cabinet fireball red (#ff3b30) and rejects the amber muzzle flash (#ffd60a,
// green 214), the cyan crosshair (#00e5ff, red 0) and the grey Death Star (green 147).
const isRed = (c: string): boolean => {
  const [r, g, b] = rgb(c)
  return r >= 150 && g <= 100 && b <= 100
}

// The burst projects to a COMPACT region around its screen point; restrict every red
// check to a window around it so the red HUD digit at the top can never count.
const BURST_WINDOW = 120
const nearCenter = (s: Seg) =>
  dist(s.x1, s.y1, ...CENTER) <= BURST_WINDOW || dist(s.x2, s.y2, ...CENTER) <= BURST_WINDOW

/** Count of red stroked segments near screen centre when `state` is rendered. */
const redAtCenter = (state: GameState): number => {
  const { ctx, segments } = makeCtx()
  render(ctx, state, W, H)
  return segments.filter((s) => isRed(s.color) && nearCenter(s)).length
}

/** A quiet space scene on-axis at centre — no live TIEs/fireballs, no spawns, no enemy
 *  fire — so the only red ink near centre is whatever the burst draws. */
const quietScene = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(1983),
  mode: 'playing',
  phase: 'space',
  enemies: [],
  enemyShots: [],
  projectiles: [],
  spawnTimer: 1e9,
  enemyFireCooldown: 1e9,
  ...over,
})

const fireball = (pos: Vec3): Projectile => ({ pos, vel: [0, 0, 1], ttl: ENEMY_SHOT_TTL })
const TICK = 0.001
const DT = 1 / 60

// Every assertion is a DIFFERENCE between an otherwise-identical burst-present and
// burst-free frame, so any constant red backdrop near centre — notably the Death
// Star's red superlaser dish (DEATH_STAR_DISH_GLOW = VGCRED) — cancels out exactly,
// and what remains is the burst's own ink. An absolute `=== 0` would be hostage to
// wherever the dish happens to project.
describe('sw8-3 — render paints the destroy-burst from state.destroyedShots (AC4)', () => {
  it('a fresh burst adds red ink near its position that a burst-free frame lacks', () => {
    // On-axis burst dead ahead projects to screen centre.
    const withBurst = quietScene({ destroyedShots: [{ pos: [0, 0, -1000] as Vec3, age: 0 }] } as Partial<GameState>)
    const withoutBurst = quietScene({ destroyedShots: [] } as Partial<GameState>)

    // GREEN: the burst strokes extra red near centre. RED: render never reads the
    // field, so both frames are identical → no difference → fails.
    expect(
      redAtCenter(withBurst),
      'a fresh burst paints red ink its burst-free twin does not',
    ).toBeGreaterThan(redAtCenter(withoutBurst))
  })

  it('a real fireball kill puts the burst on screen end-to-end (sim populates, render draws)', () => {
    // Drive the REAL kill path, then render the FOLLOWING frame with the trigger UP so
    // the player beam is off and cannot confound the red count while the burst still burns.
    const s0: GameState = { ...quietScene(), enemyShots: [fireball([0, 0, -1000])] }
    const kill = stepGame(s0, fireAt(s0, [0, 0, -1000]), TICK)
    expect(kill.enemyShots, 'the fireball really was shot down').toHaveLength(0)

    const burning = stepGame(kill, NO_INPUT, DT) // trigger up: beam off, burst still lit
    const burnFree: GameState = { ...burning, destroyedShots: [] } // same frame, burst removed

    // GREEN: sim populated destroyedShots and render draws it → more red than the twin.
    // RED: neither the field nor its rendering exists → equal → fails.
    expect(
      redAtCenter(burning),
      'the kill leaves a lingering burst — more red than the same frame without it',
    ).toBeGreaterThan(redAtCenter(burnFree))
  })
})
