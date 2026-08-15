// src/main.ts
//
// Story ml6-2/ml7-2 — the millipede CABINET: the page now runs the real game.
// createGame boots into the silent attract demo; the first gesture unlocks audio
// (browser autoplay policy) and a click drops into play. The shell reads the mouse
// as the trackball and steps the pure simulation (core/sim.ts stepGame) at a FIXED
// 60 Hz — the ROM's logic rate — via a real-time accumulator (shell/frame-clock.ts,
// ml7-5), so the sim speed is decoupled from the display refresh; it renders every
// rAF from the latest GameState and dispatches each step's core events to the ml6-1
// sound driver through @shared/synth. THE SWEEP IS THE SOUND — a green vitest is not
// acceptance; this page is the AC3 playtest.
//
// SHELL only beyond stepGame: the clock is requestAnimationFrame, folded to fixed
// 60 Hz steps; the mouse, the AudioContext and the canvas are the only browser
// surfaces touched.

import { mountCanvas } from '@shared/host-helpers'
import { PLYFLD_STRIDE } from './core/conway'
import { BACKGROUND_BIT } from './core/mushroom'
import { VACANT_COLOR } from './core/millipede'
import { createGame, type GameState } from './core/game-state'
import { stepGame, type GameInput } from './core/sim'
import { hudPlacements, SHIP_STAMP, type HudPlacement } from './core/hud'
import { DEFAULT_HIGH_SCORES } from './core/highscore'
import { showcasePlacements, showcaseSprites, SHOWCASE_BACKGROUND } from './core/attract-showcase'
import { decodeColourByte, type Rgb } from './core/palette'
import { drawGridStamps, drawStampAtPx, charTile } from './shell/render'
import { playfieldPens, playerPens, spritePens } from './shell/playfield-palette'
import { createAudio } from './shell/audio'
import { playEventSounds } from './shell/audio-dispatch'
import { runFixedSteps } from './shell/frame-clock'

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
let firePending = false // a fresh press this frame (edge)
let fireHeld = false // the fire button is currently held down (auto-repeat)
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
// Fire while HELD: the sim only spawns a shot when none is on screen
// (sim.ts `!shot.active && input.fire`), so keeping fire true down the whole
// hold auto-repeats at the natural one-shot-at-a-time cadence.
const FIRE_KEYS = new Set([' ', 'Spacebar', 'Enter', 'Control', 'z', 'Z', 'x', 'X', 'ArrowUp'])
window.addEventListener('keydown', (e: KeyboardEvent) => {
  startPlay()
  if (FIRE_KEYS.has(e.key)) fireHeld = true
})
window.addEventListener('keyup', (e: KeyboardEvent) => {
  if (FIRE_KEYS.has(e.key)) fireHeld = false
})
canvas.addEventListener('pointerdown', () => {
  startPlay()
  fireHeld = true
  firePending = true
})
const releaseFire = (): void => {
  fireHeld = false
}
canvas.addEventListener('pointerup', releaseFire)
canvas.addEventListener('pointercancel', releaseFire)
canvas.addEventListener('pointerleave', releaseFire)
window.addEventListener('pointerup', releaseFire)
window.addEventListener('blur', releaseFire)
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  // Horizontal is NEGATED: input.ts models the ROM trackball where a higher H is
  // further LEFT (positive dh ⇒ gun left), so mouse-right (+movementX) must map
  // to a NEGATIVE dh for the gun to track the mouse. Vertical needs no negate —
  // input.ts already COMP-reverses dv (mouse-down ⇒ gun-down).
  accDh -= e.movementX
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

/**
 * Draw a motion-object picture at a pixel position. A MOBJ picture is 8 wide x
 * 16 tall — two 8x8 sheet tiles STACKED vertically (2p on top, 2p+1 below), not
 * side by side: the picture EPROM stores the two halves so they mirror across
 * the tile boundary (e.g. earwig $38/$39), so stacking is what forms the
 * creature. Graphics-bank tiles are upright, so no rotation (drawStampAtPx
 * default). The 2-bit pixel is coloured by the caller's palette.
 */
function drawSpritePx(c: CanvasRenderingContext2D, x: number, y: number, pic: number, palette?: readonly Rgb[]): void {
  // MOBJP -> sheet tile. The ROM does NOT use tile = 2*pic; the milliped motion
  // engine bit-shuffles the picture byte into the 8x16 spritelayout code
  // (centiped_v.cpp:533): code = ((pic & 0x3e) >> 1) | ((pic & 1) << 6), and a
  // sprite is chars 2*code / 2*code+1 — i.e. topTile = 2*code =
  // (pic & 0x3e) | ((pic & 1) << 7). (For even pics that is just `pic`; the old
  // 2*pic sent beetle $34 to $68, a DIGIT tile.)
  //
  // Motion objects rotate WITH the vertical monitor exactly like the playfield
  // chars (the CCW turn). Turning the 8-wide x 16-tall sprite (top over bottom)
  // 90 deg CCW makes it 16-wide x 8-tall: the top tile, rotated, on the LEFT and
  // the bottom tile, rotated, on the RIGHT. (Drawing them upright left the
  // millipede/spider/fly lying on their sides.)
  const top = (pic & 0x3e) | ((pic & 1) << 7)
  drawStampAtPx(c, top, x, y, palette, true)
  drawStampAtPx(c, top + 1, x + 8, y, palette, true)
}

/** Draw a sprite at a MOBJ (h, v) position. */
function drawSprite(h: number, v: number, pic: number, palette?: readonly Rgb[]): void {
  const [x, y] = px(h, v)
  drawSpritePx(lctx as CanvasRenderingContext2D, x, y, pic, palette)
}

// Attract mode cycles between the self-playing silent demo and the static
// enemy-showcase screen (ml9-1, the ROM MLATR behaviour). The DEMO shows first
// (so a fresh boot and the lobby-carousel liveness sample see live motion), then
// the showcase for the last SHOWCASE_FRAMES of each cycle.
const ATTRACT_CYCLE_FRAMES = 720 // ~12s at the ROM's 60 Hz
const SHOWCASE_FRAMES = 300 // ~5s of the cycle shows the showcase

function renderShowcase(c: CanvasRenderingContext2D): void {
  const { r, g, b } = decodeColourByte(SHOWCASE_BACKGROUND)
  c.fillStyle = `rgb(${r}, ${g}, ${b})`
  c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  drawGridStamps(c, showcasePlacements(DEFAULT_HIGH_SCORES))
  // Each creature's sprite, blitted just above its name label, in its OWN
  // authentic MOCOL colours (spritePens keyed by the creature's colour byte).
  for (const s of showcaseSprites()) {
    drawSpritePx(c, s.col * 8, (0x1f - s.row) * 8 - 18, s.pic, spritePens(s.color))
  }
}

function render(state: GameState): void {
  const c = lctx as CanvasRenderingContext2D
  if (state.phase === 'attract' && state.frame % ATTRACT_CYCLE_FRAMES >= ATTRACT_CYCLE_FRAMES - SHOWCASE_FRAMES) {
    renderShowcase(c)
    return
  }
  c.fillStyle = '#000'
  c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

  drawGridStamps(c, fieldPlacements(state.field), playfieldPens())
  // Each motion object paints in its OWN authentic per-creature MOCOL colours,
  // keyed by its `color` attribute byte (milliped's packed sprite palette).
  for (const s of state.segments) if (s.color !== VACANT_COLOR) drawSprite(s.h, s.v, s.pic, spritePens(s.color))

  const r = state.roster
  for (const grp of [r.spiders, r.bees, r.beetles, r.dragonflies, r.mosquitoes, r.earwigs, r.inchworms]) {
    for (const e of grp) {
      const ec = e as { color: number; pic: number }
      if (ec.color !== 0) drawSprite(e.h, e.v, ec.pic, spritePens(ec.color))
    }
  }

  // Player ship: the ROM's ship picture is $1F (MLSUB.MAC:518 "PICTURE OF SHIP",
  // the same picture DLIVES draws for the lives icon — core/hud.ts SHIP_STAMP).
  // render.ts `charTile` maps that ship char to sheet tile $5F (the archer), and
  // `rotatedStampImage` stands it upright with the shared 90° CCW turn, so the
  // gun renders as its real decoded sprite instead of a placeholder fill.
  if (state.player.alive) {
    const [pxx, pyy] = px(state.player.h, state.player.v)
    drawStampAtPx(c, charTile(SHIP_STAMP), pxx, pyy, playerPens(), true)
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
}

// ── Fixed-timestep accumulator (ml7-5). stepGame is one ROM 60 Hz frame, so we
//    drive it off REAL elapsed time, not the raw rAF cadence: a >60 Hz display
//    (or uncapped rAF) no longer runs the sim faster than the arcade, and a
//    backgrounded tab that hands back a huge delta is clamped (frame-clock.ts). ──
let accMs = 0
let lastTs: number | null = null

const frame = (ts: number): void => {
  const elapsed = lastTs === null ? 0 : ts - lastTs
  lastTs = ts

  // Step the sim a whole number of fixed 60 Hz frames for the real time elapsed
  // (runFixedSteps folds the delta + carries the remainder). Input is drained once,
  // into the first sub-step, so a catch-up burst can't replay the same fire/start
  // and the mouse travel accumulated across skipped rAFs is consumed whole.
  accMs = runFixedSteps(accMs, elapsed, (isFirst) => {
    const input: GameInput = isFirst
      ? { dh: toByte(accDh), dv: toByte(accDv), fire: firePending || fireHeld, start: startPending }
      : { dh: 0, dv: 0, fire: false, start: false }
    if (isFirst) {
      accDh = 0
      accDv = 0
      firePending = false
      startPending = false
    }
    game = stepGame(game, input)
    playEventSounds(audio, game.events)
    ;(window as unknown as { __sim?: GameState }).__sim = game
  })

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
