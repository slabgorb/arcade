// src/main.ts
//
// Story jt2-7 (GREEN, Julia) — the wave-1 demo, playable. main.ts is a thin SHELL
// over the pure core: it seeds the game with a shell-owned seed, steps it once per
// video frame through the shell timebase, and RENDERS the resulting process list —
// players, buzzard-rider enemies and eggs — from the transcribed ENTITY_RECORDS
// through the existing atlas path.
//
// jt10-5 (GREEN, Loki) — the CABINET tier now fronts the game. main.ts no longer
// boots straight into a game: it boots the cabinet into the 1P/2P 'select' screen,
// and a start-button press begins a real game via startPlaying. The game itself is
// still the SESSION layer (createGame / stepGame from core/game) stepped once per
// frame; the cabinet only adds the outer mode. SHELL owns the clock: wall time
// accumulates here and the core is stepped in whole video frames — core never
// reads a clock.

import { ENTITY_RECORDS, PALETTES, COMCL5, expandComcl5 } from './core/pictures.js'
import { drawList, type DrawOp } from './core/demo.js'
import { createGame, stepGame, overlayReadout, type GameState } from './core/game.js'
import { startPlaying, type CabinetState } from './core/cabinet.js'
import { selectPlayerCount, type SelectInput } from './core/select.js'
import { layoutSelectScreen } from './shell/selectScreen.js'
import type { LaidOutText } from './shell/fontRender.js'
import type { PlayerInput } from './core/flight.js'
import { pumpFrames } from './shell/timebase.js'
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  buildGameAtlas,
  configureContext,
  paintDissolve,
  reshapeRagged,
  rgbaPalette,
  viewport,
} from './shell/render.js'
import { mapPlayer1, mapPlayer2 } from './shell/input.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds } from './shell/audio-dispatch.js'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const context = canvas.getContext('2d')
if (!context) throw new Error('2d canvas context unavailable')
configureContext(context)

// Everything is drawn into a fixed 292x240 backbuffer and blitted to the
// visible canvas at an INTEGER scale, so the 1982 pixels stay square.
const logical = document.createElement('canvas')
logical.width = LOGICAL_WIDTH
logical.height = LOGICAL_HEIGHT
const logicalContextOrNull = logical.getContext('2d')
if (!logicalContextOrNull) throw new Error('2d context unavailable for the backbuffer')
const logicalContext: CanvasRenderingContext2D = logicalContextOrNull
configureContext(logicalContext)

const colours = rgbaPalette(PALETTES.COLOR1)
const atlas = buildGameAtlas()

// The atlas as an ImageBitmap-able surface, so blits are a drawImage rather
// than a per-pixel loop.
const atlasCanvas = document.createElement('canvas')
atlasCanvas.width = atlas.width
atlasCanvas.height = atlas.height
const atlasContext = atlasCanvas.getContext('2d')
if (!atlasContext) throw new Error('2d context unavailable for the atlas')
const atlasImage = atlasContext.createImageData(atlas.width, atlas.height)
atlasImage.data.set(atlas.data)
atlasContext.putImageData(atlasImage, 0, 0)

// CLIF5's compacted island, expanded once and reshaped out of its ragged rows.
const island = expandComcl5(COMCL5.bytes)
const islandGrid = reshapeRagged(island.pixels, island.width, island.height, island.rowLengths)

/** Draw one raster block at a whole-pixel destination. */
function blit(name: string, x: number, y: number, heightOverride?: number): void {
  const slot = atlas.blocks[name]
  if (!slot) return
  // CSRC5L holds 14 rows while its record draws 13 — the caller passes the
  // RECORD height so the extra row is carried but never shown.
  const height = heightOverride ?? slot.height
  logicalContext.drawImage(atlasCanvas, slot.x, slot.y, slot.width, height, x, y, slot.width, height)
}

/** The pixel-source block for a named ENTITY_RECORDS frame (transcribed data only). */
function entitySource(name: string): string | undefined {
  return ENTITY_RECORDS.find((r) => r.name === name)?.source
}

/**
 * Blit one ordered render op from the core's `drawList`. An ENTITY_RECORDS frame
 * name resolves to its transcribed pixel-source block; an atlas block (a stork
 * mount frame, an arena tile source) blits directly. A left-facer (`op.facing`
 * of -1) is MIRRORED horizontally here: every buzzard/ostrich/stork atlas frame
 * is drawn right-facing, so the flip is the shell's job (jt2-9 — the SELECTION
 * incl. facing is DATA on the op; the mirror is the only canvas step).
 */
function blitOp(op: DrawOp): void {
  const name = entitySource(op.name) ?? op.name
  if (op.facing === -1) {
    const slot = atlas.blocks[name]
    if (!slot) return
    const height = op.height ?? slot.height
    logicalContext.save()
    logicalContext.translate(op.x + slot.width, op.y)
    logicalContext.scale(-1, 1)
    logicalContext.drawImage(atlasCanvas, slot.x, slot.y, slot.width, height, 0, 0, slot.width, height)
    logicalContext.restore()
    return
  }
  blit(name, op.x, op.y, op.height)
}

/**
 * The bottom lava island (COMCL5's expanded stream, not the atlas) — drawn as the
 * FOREGROUND after the sprites so it occludes entities behind its front edge.
 */
function drawIsland(): void {
  for (let row = 0; row < island.height; row++) {
    for (let column = 0; column < island.width; column++) {
      const nibble = islandGrid[row * island.width + column]
      if (nibble === 0) continue
      const colour = colours[nibble]
      logicalContext.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
      logicalContext.fillRect(54 + column, 211 + row, 1, 1)
    }
  }
}

// The dev-overlay palette index — the colour-5 rider nibble (PLYR1), a transcribed
// COLOR1 entry, NOT an invented literal (so the denylist scan stays clean).
const OVERLAY_COLOUR_INDEX = 5

/**
 * Draw the DEV-OVERLAY: each player's score + lives and the wave number, read
 * STRAIGHT off the GameState through the pure `overlayReadout` projection — the shell
 * keeps NO score/lives counters of its own, so the readout cannot drift from the sim
 * (routing≠geometry). The authentic MESSAGE.SRC score row is jt5; this is the dev bar.
 */
function drawOverlay(state: GameState): void {
  const readout = overlayReadout(state)
  const colour = colours[OVERLAY_COLOUR_INDEX]
  logicalContext.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
  logicalContext.font = '8px monospace'
  logicalContext.textBaseline = 'top'
  logicalContext.fillText(`WAVE ${readout.wave}`, 4, 2)
  for (const p of readout.players) {
    const digits = p.score.toString().padStart(6, '0')
    logicalContext.fillText(`P${p.player} ${digits} MEN ${p.lives}`, 4, 2 + p.player * 10)
  }
}

// jt10-5 — the select-screen text colour. A transcribed COLOR1 palette index (the
// PLYR1 rider colour, as the dev overlay uses), NOT an invented literal, so the
// denylist scan stays clean. The exact select-screen colours await a reference
// capture (Delivery Finding); this is a legible placeholder.
const SELECT_COLOUR_INDEX = 5

/**
 * Paint one laid-out line (fontRender `layoutText` ops) at a whole-pixel origin —
 * each SET glyph pixel a 1×1 fillRect in the line's colour. This is the raster
 * paint idiom the COMCL5 island / paintDissolve paths use, applied to text (the
 * jt10-1 painter guidance: fontRender lays out, the painter fills).
 */
function paintText(laid: LaidOutText, originX: number, originY: number): void {
  const c = laid.colour
  logicalContext.fillStyle = `rgb(${c.r} ${c.g} ${c.b})`
  for (const op of laid.ops) {
    const rows = op.glyph.rows
    for (let ry = 0; ry < rows.length; ry++) {
      const row = rows[ry]
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx]) logicalContext.fillRect(originX + op.x + rx, originY + op.y + ry, 1, 1)
      }
    }
  }
}

/**
 * The 1P/2P start-select overlay: the two START banners (FONT57) and the static
 * CREDITS row (FONT35), each centred horizontally on the backbuffer. Text + fonts
 * come from `layoutSelectScreen`; positions are the shell's (a human smoke test /
 * reference capture tunes them).
 */
function renderSelectScreen(): void {
  const screen = layoutSelectScreen(colours[SELECT_COLOUR_INDEX])
  const centred = (laid: LaidOutText): number => Math.round((LOGICAL_WIDTH - laid.width) / 2)
  paintText(screen.onePlayer, centred(screen.onePlayer), 96)
  paintText(screen.twoPlayer, centred(screen.twoPlayer), 120)
  paintText(screen.credits, centred(screen.credits), 210)
}

// ─── The cabinet: booted to 'select', stepping the SESSION layer once playing ──
//
// jt4-5 MIGRATION (Dev/Korben): the shell drives the SESSION layer — `createGame` +
// `stepGame` from core/game — NOT the raw sim. The jt2-1 one-sim seam still holds:
// `stepGame` internally WRAPS the demo's `stepDemo` over a `createWaveDemo`-built
// sim, so there is no divergent second stepping path, and the dev-overlay reads the
// per-player registers straight off the GameState it steps. jt10-5 wraps that game
// in the cabinet tier: the cabinet boots into 'select' (the coin-up screen) over a
// fresh `createGame(seed)`, and a start press begins a real game via `startPlaying`.
// A fixed shell-owned seed replays the same run each load; core mints no entropy,
// so the seed crosses the boundary from here.
const SEED = 0x1a2b_3c4d
let cabinet: CabinetState = { mode: 'select', game: createGame(SEED) }

// The player process ids for the CURRENT game — recomputed when a game begins (a
// fresh createGame mints new ids), so keyboard input maps to the right processes.
let playerIds: number[] = []
let prevFlap1 = false
let prevFlap2 = false
// The previous frame's start-button LEVEL. `startPlaying` wraps a FRESH createGame,
// so the press must fire on its RISING edge only — a held start must not re-seed the
// game every frame (the prevFlap discipline, one tier up).
let prevStartHeld = false

/** Begin a real game for `count` players, seeded from SEED, and cache its player ids. */
function enterPlaying(count: 1 | 2): void {
  cabinet = startPlaying(cabinet, SEED, count)
  playerIds = cabinet.game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
  prevFlap1 = false
  prevFlap2 = false
}

/** The player's start-button intent this frame: the 1P / 2P start keys (1 / 2). */
function readSelectInput(keys: Set<string>): SelectInput {
  if (keys.has('Digit1')) return 'one-player'
  if (keys.has('Digit2')) return 'two-player'
  return null
}

// jt5-1 — the audio seam. The engine is inert until a user gesture unlocks the
// context (browsers refuse an AudioContext before one) and inert forever where
// WebAudio is absent, so `resume()` on every keydown is the cheap, correct hook:
// only the first call does work. The eighteen `.wav` files it will fetch are NOT
// in this repo and nothing has put them in the bucket yet — jt5-1 ships the seam
// and joust stays quiet, because a failed fetch degrades silently by design.
const audio = createAudioEngine()

const held = new Set<string>()
window.addEventListener('keydown', (e) => {
  audio.resume()
  held.add(e.code)
  if (e.code === 'Space') e.preventDefault()
})
window.addEventListener('keyup', (e) => held.delete(e.code))

const MAX_CATCHUP_SECONDS = 0.25
let accumulator = 0
let last = 0
let started = false

const frame = (now: number): void => {
  if (!started) {
    started = true
    last = now
  } else {
    const elapsed = Math.min((now - last) / 1000, MAX_CATCHUP_SECONDS)
    last = now
    accumulator = pumpFrames(accumulator, elapsed, () => {
      if (cabinet.mode === 'select') {
        // Coin-up: begin a game on the RISING edge of a start press only, so a
        // held start button cannot re-seed the game each frame.
        const want = readSelectInput(held)
        const startHeld = want !== null
        if (startHeld && !prevStartHeld) {
          const count = selectPlayerCount(want)
          if (count !== null) enterPlaying(count)
        }
        prevStartHeld = startHeld
        return
      }
      const in1 = mapPlayer1(held, prevFlap1)
      const in2 = mapPlayer2(held, prevFlap2)
      const inputs: Record<number, PlayerInput> = {}
      if (playerIds[0] !== undefined) inputs[playerIds[0]] = in1
      if (playerIds[1] !== undefined) inputs[playerIds[1]] = in2
      cabinet = { mode: 'playing', game: stepGame(cabinet.game, inputs) }
      // The core emitted this frame's moments as DATA; the shell turns them into
      // cues. Inside the pump, so a catch-up frame's moments are not dropped.
      playEventSounds(audio, cabinet.game.events)
      prevFlap1 = in1.flapHeld
      prevFlap2 = in2.flapHeld
    })
  }

  logicalContext.fillStyle = `rgb(${colours[0].r} ${colours[0].g} ${colours[0].b})`
  logicalContext.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  if (cabinet.mode === 'select') {
    // The coin-up screen: the two START banners and the CREDITS row.
    renderSelectScreen()
  } else {
    // Render BY the core's ordered draw list (back platforms → entity sprites →
    // foreground platforms) — the render SELECTION lives in the pure core
    // (enemyFrame/playerDrawList/drawList), never by-eye in the shell.
    for (const op of drawList(cabinet.game.sim)) {
      // The dissolve's ASH1R is a runlength stream — not in the atlas, so blitOp
      // would silently skip it (jt3-7 B1). Decode + paint it via expandAshFrames
      // here, the ASH twin of the COMCL5 island path, indexed by op.frame.
      if (op.name === 'ASH1R') paintDissolve(logicalContext, op, colours)
      else blitOp(op)
    }
    // The bottom island is the front-most layer, occluding entities behind its front edge.
    drawIsland()
    // The dev-overlay reads the session registers straight off the stepped GameState.
    drawOverlay(cabinet.game)
  }

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  configureContext(context)
  const view = viewport(canvas.width, canvas.height)
  // The letterbox is palette index 0's colour (the 1982 background), not an
  // invented literal — so the widened denylist scan covers this file too.
  context.fillStyle = `rgb(${colours[0].r} ${colours[0].g} ${colours[0].b})`
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(
    logical,
    0,
    0,
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    view.offsetX,
    view.offsetY,
    LOGICAL_WIDTH * view.scale,
    LOGICAL_HEIGHT * view.scale,
  )

  requestAnimationFrame(frame)
}

// The shell's clock, and the only one: pumpFrames drains wall time into whole
// simulation steps at the ROM's own video rate. Core is never asked what time
// it is.
requestAnimationFrame(frame)
