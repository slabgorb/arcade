// src/main.ts
//
// Story ml6-2/ml7-2 — the millipede CABINET: the page now runs the real game.
// createGame boots into the silent attract demo; the first gesture unlocks audio
// (browser autoplay policy) and a click drops into play. Each frame the shell
// reads the mouse as the trackball, steps the pure simulation (core/sim.ts
// stepGame), renders every entity from the returned GameState, and dispatches the
// frame's core events to the ml6-1 sound driver through @shared/synth. THE SWEEP
// IS THE SOUND — a green vitest is not acceptance; this page is the AC3 playtest.
//
// SHELL only beyond stepGame: the one clock is requestAnimationFrame; the mouse,
// the AudioContext and the canvas are the only browser surfaces touched.

import { mountCanvas } from '@shared/host-helpers'
import { PLYFLD_STRIDE } from './core/conway'
import { BACKGROUND_BIT } from './core/mushroom'
import { VACANT_COLOR } from './core/millipede'
import { createGame, type GameState } from './core/game-state'
import { stepGame, type GameInput } from './core/sim'
import { hudPlacements, SHIP_STAMP, type HudPlacement } from './core/hud'
import { DEFAULT_HIGH_SCORES } from './core/highscore'
import { drawGridStamps, drawStampAtPx } from './shell/render'
import { createAudio } from './shell/audio'
import { playEventSounds } from './shell/audio-dispatch'

const LOGICAL_W = 240
const LOGICAL_H = 256

const { canvas, ctx } = mountCanvas(document)

const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const lctx = logical.getContext('2d')
if (!lctx) throw new Error('millipede: 2d context unavailable for the logical screen')

// ── Audio: built inert at module scope (no WebAudio touched until resume()). ──
const audio = createAudio()

// ── The game, booting into the silent attract demo. ──
let game: GameState = createGame(0x1982)

// ── Input accumulators drained once per stepped frame. ──
let accDh = 0
let accDv = 0
let firePending = false
let startPending = false

/** Clamp accumulated mouse travel to a signed trackball byte (TBLMT re-clamps). */
const toByte = (n: number): number => {
  const c = Math.max(-128, Math.min(127, Math.trunc(n)))
  return c & 0xff
}

// ── Gesture gate (browser autoplay): the FIRST gesture unlocks audio; a click or
//    key also drops attract into play. resume() is idempotent; listeners stay. ──
const unlock = (): void => audio.resume()
const startPlay = (): void => {
  unlock()
  startPending = true
}
window.addEventListener('keydown', startPlay)
canvas.addEventListener('pointerdown', () => {
  startPlay()
  firePending = true
})
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  accDh += e.movementX
  accDv += e.movementY
})

/** Every occupied field cell as a grid placement (low 7 bits = stamp). */
function fieldPlacements(field: Uint8Array): HudPlacement[] {
  const placements: HudPlacement[] = []
  for (let off = 0; off < field.length; off++) {
    const byte = field[off]
    if (byte === 0) continue
    placements.push({ col: Math.floor(off / PLYFLD_STRIDE), row: off % PLYFLD_STRIDE, stamp: byte & ~BACKGROUND_BIT })
  }
  return placements
}

/** MOBJ pixel → screen pixel (higher H = left, higher V = up; ml7-3 mapping). */
const px = (h: number, v: number): [number, number] => [(0xf7 - h) & 0xff, (0xf8 - v) & 0xff]

/** Draw a sprite pair (pic → tiles 2p / 2p+1) at a MOBJ position. */
function drawSprite(h: number, v: number, pic: number): void {
  const [x, y] = px(h, v)
  drawStampAtPx(lctx as CanvasRenderingContext2D, 2 * pic, x, y)
  drawStampAtPx(lctx as CanvasRenderingContext2D, 2 * pic + 1, x + 8, y)
}

function render(state: GameState): void {
  const c = lctx as CanvasRenderingContext2D
  c.fillStyle = '#000'
  c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

  drawGridStamps(c, fieldPlacements(state.field))
  for (const s of state.segments) if (s.color !== VACANT_COLOR) drawSprite(s.h, s.v, s.pic)

  const r = state.roster
  for (const grp of [r.spiders, r.bees, r.beetles, r.dragonflies, r.mosquitoes, r.earwigs, r.inchworms]) {
    for (const e of grp) if ((e as { color: number }).color !== 0) drawSprite(e.h, e.v, (e as { pic: number }).pic)
  }

  // Player ship (a visible marker at the gun; exact sprite decode is a follow-up).
  if (state.player.alive) {
    const [pxx, pyy] = px(state.player.h, state.player.v)
    c.fillStyle = '#4cf'
    c.fillRect(pxx + 2, pyy + 2, 4, 4)
  }
  // Shot.
  if (state.shot.active) {
    const [sx, sy] = px(state.shot.h, state.shot.v)
    c.fillStyle = '#fff'
    c.fillRect(sx + 3, sy, 2, 6)
  }

  drawGridStamps(
    c,
    hudPlacements({ score: state.score, lives: state.lives, highScore: DEFAULT_HIGH_SCORES[0].score }),
  )
  void SHIP_STAMP
}

const frame = (): void => {
  const input: GameInput = { dh: toByte(accDh), dv: toByte(accDv), fire: firePending, start: startPending }
  accDh = 0
  accDv = 0
  firePending = false
  startPending = false

  game = stepGame(game, input)
  playEventSounds(audio, game.events)
  ;(window as unknown as { __sim?: GameState }).__sim = game

  render(game)

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  const scale = Math.max(1, Math.floor(Math.min(canvas.width / LOGICAL_W, canvas.height / LOGICAL_H)))
  const dx = Math.floor((canvas.width - LOGICAL_W * scale) / 2)
  const dy = Math.floor((canvas.height - LOGICAL_H * scale) / 2)
  ctx.drawImage(logical, dx, dy, LOGICAL_W * scale, LOGICAL_H * scale)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
