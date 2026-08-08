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
import { createGame, stepGame, overlayReadout, GOVER_OVER, type GameState } from './core/game.js'
import {
  startPlaying,
  modeForGover,
  afterGameOver,
  toSelect,
  toAttract,
  type CabinetState,
} from './core/cabinet.js'
import { createAttract, stepAttract, type AttractState } from './core/attract-scheduler.js'
import { selectPlayerCount, type SelectInput } from './core/select.js'
import { layoutSelectScreen } from './shell/selectScreen.js'
import { layoutGameOverScreen } from './shell/gameOverScreen.js'
import { layoutAttractBanner } from './shell/attractScreen.js'
import { layoutTitleScreen, type TitleScreenLayout } from './shell/titleScreen.js'
import { titleColorRow } from './core/title.js'
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
  type Rgba,
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

// jt10-6 — the game-over banner colour (a transcribed COLOR1 index, as the select
// screen and dev overlay use — NOT an invented literal, so the denylist scan stays
// clean) and its Y position (a placeholder tuned by a human smoke test / reference
// capture; the ROM puts the phrase at $3090). The exact colour awaits a capture.
const GAMEOVER_COLOUR_INDEX = 5
const GAMEOVER_BANNER_Y = 108

/**
 * The game-over overlay: the single 'THY GAME IS OVER' banner (FONT57), centred
 * horizontally on the backbuffer. Text + font come from `layoutGameOverScreen`; the
 * position is the shell's (a human smoke test / reference capture tunes it).
 */
function renderGameOverScreen(): void {
  const { banner } = layoutGameOverScreen(colours[GAMEOVER_COLOUR_INDEX])
  paintText(banner, Math.round((LOGICAL_WIDTH - banner.width) / 2), GAMEOVER_BANNER_Y)
}

// jt10-3 — the title screen (MARQUE). The marquee palette cycles one MARCOL row
// every TITLE_COLOR_CADENCE frames; `titleColorRow` (pure core, fed the shell's
// frame counter — the shell owns the clock) selects the active row. The exact
// MARCOL->RGB decode and the letter/line screen positions await a reference
// capture (a human smoke test tunes them), so — as with the select/game-over
// placeholders — the cycling row indexes the existing palette for a legible,
// visibly-cycling title, and the wordmark is drawn from its own y coordinates.
// The render hook is in place, but this mode is not yet reached: `toTitle` has no caller,
// and jt10-4's attract PAGE_ORDER (demo + the two banners) carries no title page — wiring
// title into the attract cycle is deferred with the remaining ATMST lessions (see the
// session Delivery Findings).
let titleFrame = 0
const TITLE_LOGO_Y = 40
const TITLE_COPYRIGHT_Y = 190
const TITLE_EXTRA_MOUNT_Y = 210

/** Stroke the vector JOUST wordmark: each letter's polylines, offset by its x. */
function strokeLogo(logo: TitleScreenLayout['logo'], originX: number, originY: number, colour: Rgba): void {
  logicalContext.strokeStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
  logicalContext.lineWidth = 1
  for (const letter of logo.letters) {
    for (const stroke of letter.strokes) {
      if (stroke.points.length === 0) continue
      logicalContext.beginPath()
      const [x0, y0] = stroke.points[0]
      logicalContext.moveTo(originX + letter.xOffset + x0, originY + y0)
      for (let k = 1; k < stroke.points.length; k++) {
        const [px, py] = stroke.points[k]
        logicalContext.lineTo(originX + letter.xOffset + px, originY + py)
      }
      logicalContext.stroke()
    }
  }
}

/**
 * The title overlay: the vector JOUST wordmark plus the (C)1982 copyright and the
 * EXTRA MOUNT phrase line (FONT57), all in the current colour-cycle colour. Text +
 * font + geometry come from `layoutTitleScreen`; positions are the shell's (tuned
 * by a human smoke test / reference capture).
 */
function renderTitleScreen(): void {
  const colour = colours[1 + titleColorRow(titleFrame)]
  const screen = layoutTitleScreen(colour)
  strokeLogo(screen.logo, Math.round((LOGICAL_WIDTH - 292) / 2), TITLE_LOGO_Y, colour)
  paintText(screen.copyright, Math.round((LOGICAL_WIDTH - screen.copyright.width) / 2), TITLE_COPYRIGHT_Y)
  paintText(screen.extraMount, Math.round((LOGICAL_WIDTH - screen.extraMount.width) / 2), TITLE_EXTRA_MOUNT_Y)
  titleFrame++
}

// jt10-4 — paint the core's ordered draw list for a game sim (back platforms →
// entity sprites → foreground island). The render SELECTION lives in the pure core
// (drawList), never by-eye in the shell. Shared by the 'playing' render and the
// attract self-play demo; the dev-overlay is the caller's concern (attract omits it).
function paintSim(game: GameState): void {
  for (const op of drawList(game.sim)) {
    // The dissolve's ASH1R is a runlength stream — not in the atlas, so blitOp would
    // silently skip it (jt3-7 B1). Decode + paint it via expandAshFrames here, the ASH
    // twin of the COMCL5 island path, indexed by op.frame.
    if (op.name === 'ASH1R') paintDissolve(logicalContext, op, colours)
    else blitOp(op)
  }
  // The bottom island is the front-most layer, occluding entities behind its front edge.
  drawIsland()
}

// jt10-4 — the attract render: the live self-play sim on the demo page, or a warning
// banner (FONT57) centred on a STATIC background (the fixed colours[0] fill each frame).
// The banner's TEXT colour steps with the scheduler's `colourPhase` (ATT.SRC:173, every 2.5 s).
const ATTRACT_BANNER_Y = 108
function renderAttract(): void {
  const page = attract.page
  if (page === 'demo') {
    paintSim(cabinet.game)
    return
  }
  const colour = colours[1 + (attract.colourPhase % (colours.length - 1))]
  const { banner } = layoutAttractBanner(page, colour)
  paintText(banner, Math.round((LOGICAL_WIDTH - banner.width) / 2), ATTRACT_BANNER_Y)
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
// jt10-4 (Yoda): the 'attract' mode is now a real cycle — reached from a game-over
// that doesn't qualify (afterGameOver → attract), rendered by renderAttract below;
// a start press there routes on to the 'select' coin-up (toSelect).
// A fixed shell-owned seed replays the same run each load; core mints no entropy,
// so the seed crosses the boundary from here.
const SEED = 0x1a2b_3c4d
let cabinet: CabinetState = { mode: 'select', game: createGame(SEED) }

// jt10-4 — the attract SUB-CYCLE scheduler (pure core). Stepped once per video frame
// while the cabinet sits in 'attract'; it cycles the self-play demo and the two
// warning banners and repeats. Created ONCE at load and NOT reset on re-entry: when a
// non-qualifying game-over routes back to attract (afterGameOver), the cycle simply
// CONTINUES from wherever stepAttract last left it. Resetting to a fresh demo page on
// re-entry is a deferred follow-up (see the session Delivery Findings).
let attract: AttractState = createAttract()

// The player process ids for the CURRENT game — recomputed when a game begins (a
// fresh createGame mints new ids), so keyboard input maps to the right processes.
let playerIds: number[] = []
let prevFlap1 = false
let prevFlap2 = false
// The previous frame's start-button LEVEL. `startPlaying` wraps a FRESH createGame,
// so the press must fire on its RISING edge only — a held start must not re-seed the
// game every frame (the prevFlap discipline, one tier up).
let prevStartHeld = false

// jt10-6 — the game-over hold. GOVWAT (JOUSTRV4.SRC:678, `#11  8*11 OR 88 TICK WAIT`)
// shows the banner ~88 ticks before JMP GAMEND, so the shell holds the overlay this
// many whole frames before routing on through afterGameOver — otherwise the banner
// would flash for a single frame. Reset when a fresh game begins.
const GAMEOVER_HOLD_FRAMES = 88
let gameoverHoldFrames = 0

/** Begin a real game for `count` players, seeded from SEED, and cache its player ids. */
function enterPlaying(count: 1 | 2): void {
  cabinet = startPlaying(cabinet, SEED, count)
  playerIds = cabinet.game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
  prevFlap1 = false
  prevFlap2 = false
  gameoverHoldFrames = 0
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
      if (cabinet.mode === 'gameover') {
        // Hold the banner ~88 ticks (GOVWAT), then route on through the PURE gate:
        // afterGameOver → 'highscore' iff the best score qualifies, else 'attract'
        // (the table is empty until jt10-7 wires @shared/highscore). 'attract' now renders
        // via renderAttract (jt10-4, below); 'highscore' has no screen yet, so until jt10-7
        // it alone falls through to the coin-up door — the cabinet never dead-ends.
        if (++gameoverHoldFrames >= GAMEOVER_HOLD_FRAMES) {
          cabinet = afterGameOver(cabinet, [])
          gameoverHoldFrames = 0
        }
        return
      }
      if (cabinet.mode === 'attract') {
        // jt10-4 — the attract SUB-CYCLE. Step the pure scheduler one video frame; on
        // the demo page PUMP the self-play SESSION (empty inputs — active player AI is
        // the deferred G-block follow-up), restarting a fresh demo when it settles to
        // game-over so the loop never ends. A start press leaves attract for the coin-up
        // 'select' screen (AC-6); the shared prevStartHeld gives that press edge
        // discipline across the transition, so a held key cannot then start a game.
        attract = stepAttract(attract)
        const want = readSelectInput(held)
        const startHeld = want !== null
        if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)
        prevStartHeld = startHeld
        if (cabinet.mode === 'attract' && attract.page === 'demo') {
          const game = stepGame(cabinet.game, {})
          cabinet = game.gover === GOVER_OVER ? toAttract(cabinet, SEED) : { mode: 'attract', game }
        }
        return
      }
      if (cabinet.mode !== 'playing') {
        // The coin-up door: 'select', and — until jt10-7 — 'highscore' too. Begin a
        // game on the RISING edge of a start press only, so a held start button cannot
        // re-seed the game each frame.
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
      // Step the SESSION layer, then DERIVE the mode from the stepped game's settled
      // GOVER (modeForGover) — so an all-players-out frame lands in 'gameover'. The
      // literal stepGame( call is preserved (the jt4-5 demo-source seam).
      const game = stepGame(cabinet.game, inputs)
      cabinet = { mode: modeForGover(game.gover), game }
      // The core emitted this frame's moments as DATA; the shell turns them into
      // cues. Inside the pump, so a catch-up frame's moments are not dropped.
      playEventSounds(audio, cabinet.game.events)
      prevFlap1 = in1.flapHeld
      prevFlap2 = in2.flapHeld
    })
  }

  logicalContext.fillStyle = `rgb(${colours[0].r} ${colours[0].g} ${colours[0].b})`
  logicalContext.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  if (cabinet.mode === 'playing') {
    // The live game, plus the dev-overlay reading the session registers off the
    // stepped GameState.
    paintSim(cabinet.game)
    drawOverlay(cabinet.game)
  } else if (cabinet.mode === 'attract') {
    // jt10-4 — the attract cycle: the self-play sim on the demo page, or a warning
    // banner. No dev overlay — attract is the public face of the cabinet.
    renderAttract()
  } else if (cabinet.mode === 'gameover') {
    // The game-over overlay: the 'THY GAME IS OVER' banner, held ~88 ticks.
    renderGameOverScreen()
  } else if (cabinet.mode === 'title') {
    // The title overlay: the vector JOUST wordmark + copyright/extra-mount lines,
    // colour-cycling every TITLE_COLOR_CADENCE frames. The hook is here now.
    renderTitleScreen()
  } else {
    // The coin-up door: the two START banners and the CREDITS row. 'select', and —
    // until jt10-7 (high-score) lands — 'highscore' too.
    renderSelectScreen()
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
