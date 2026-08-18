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
import { drawList, type DrawOp } from './core/sim.js'
import { createGame, stepGame, overlayReadout, GOVER_OVER, type GameState, type OverlayReadout } from './core/game.js'
import {
  startPlaying,
  modeForGover,
  afterGameOver,
  toSelect,
  toAttract,
  type CabinetState,
} from './core/cabinet.js'
import { createAttract, stepAttract, MARQUE_DWELL_FRAMES, type AttractState } from './core/attract-scheduler.js'
import { selectPlayerCount, type SelectInput } from './core/select.js'
import {
  beginEntry,
  enterInitial,
  isEntryComplete,
  commitEntry,
  rankForScore,
  promptForRank,
  PROMPT_LESSER,
  tickEntry,
  isEntryExpired,
  timeoutInitials,
  type JoustHighScore,
} from './core/highscore.js'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@shared/highscore'
import { installHeldKeys, type KeyMembership } from '@shared/held-keys'
import { mountCanvas } from '@shared/host-helpers'
import { layoutHud } from './shell/hudScreen.js'
import { layoutSelectScreen } from './shell/selectScreen.js'
import { layoutHighscoreScreen } from './shell/highscoreScreen.js'
import { layoutGameOverScreen } from './shell/gameOverScreen.js'
import { layoutAttractBanner, layoutStartPrompt } from './shell/attractScreen.js'
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
  paintCrumble,
  paintWarpIn,
  reshapeRagged,
  rgbaPalette,
  viewport,
  type Rgba,
} from './shell/render.js'
import { mapPlayer1, mapPlayer2 } from './shell/input.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds } from './shell/audio-dispatch.js'

// SH3-2: the checked #game mount is @shared/host-helpers.mountCanvas now — one
// boot-time lookup with the null-element and not-a-canvas guards the whole fleet
// shares (joust and centipede hand-wrote a byte-identical version, which is what
// proved the helper worth extracting). Only the MOUNT is shared: the audio unlock
// stays hand-rolled below (rom-cadence — it is fused into the input-sampling
// keydown, the hazard the epic names), per docs/ops/shell-adoption-matrix.md.
const { canvas, ctx: context } = mountCanvas(document)
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
  // jt11-5 — a `fill` op is a SOLID-COLOUR DMA rectangle (the BRIDGE/BRIDG2
  // lava-shore planks, JOUSTRV4.SRC:1126-1127): no pixel source, no atlas
  // block — paint it as the palette nibble the op carries, like drawIsland
  // paints the island's grid nibbles.
  if (op.kind === 'fill') {
    const colour = colours[op.colour ?? 0]
    logicalContext.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
    logicalContext.fillRect(op.x, op.y, op.width ?? 0, op.height ?? 0)
    return
  }
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

/**
 * jt11-2 — the AUTHENTIC HUD, replacing the jt4-5 fillText dev bar: each player's
 * BCD score in FONT57 anchored at its ROM units column and its lives as rider-icon
 * blits from the ROM anchors, all laid out by the pure `layoutHud` (every column,
 * stride, colour and the 5-icon cap is ROM-cited there) and painted through the
 * existing paintText/blit paths. The readout is still the pure `overlayReadout`
 * projection off the very GameState the shell steps — no shell-side counters, and
 * no wave number: that was the dev bar's line, not the ROM's.
 */
function drawHud(readout: OverlayReadout): void {
  for (const p of layoutHud(readout, colours).players) {
    paintText(p.score, p.scoreX, p.scoreY)
    for (const icon of p.lives) blit(icon.name, icon.x, icon.y)
  }
}

// jt10-5 — the select-screen text colour. A transcribed COLOR1 palette index (the
// PLYR1 rider colour, PL1's own score colour), NOT an invented literal, so the
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

/**
 * jt10-7 — the JOUST CHAMPIONS overlay: the FONT57 heading, one FONT35 row per
 * table entry, and (while entering) the rank-conditional FONT35 prompt, each centred
 * horizontally. Text + fonts come from `layoutHighscoreScreen`; positions are the
 * shell's (a human smoke test / reference capture tunes them).
 */
function renderHighscoreScreen(): void {
  // jt11-13 — thread the in-flight initials buffer in so the entry screen echoes
  // every keystroke (the ROM's ENTRET → OUTHSC). Without entry.initials here the
  // player types and nothing appears.
  const screen = layoutHighscoreScreen(colours[SELECT_COLOUR_INDEX], highScoreTable, entryPrompt, entry.initials)
  const centred = (laid: LaidOutText): number => Math.round((LOGICAL_WIDTH - laid.width) / 2)
  paintText(screen.heading, centred(screen.heading), 32)
  screen.rows.forEach((row, i) => paintText(row, centred(row), 72 + i * 12))
  if (screen.prompt) paintText(screen.prompt, centred(screen.prompt), 210)
  // jt11-13 — the typed initials, directly under the 'ENTER YOUR INITIALS' prompt so
  // the player sees the letters appear where the prompt asks for them.
  if (screen.entry) paintText(screen.entry, centred(screen.entry), 222)
  // jt11-6 — the key instructions, below the entry line (FONT35 is 5 rows tall, so
  // each line clears the one above and 234 still sits inside the 240-row screen).
  if (screen.instructions) paintText(screen.instructions, centred(screen.instructions), 234)
}

// jt10-6 — the game-over banner colour (a transcribed COLOR1 index, as the select
// screen uses — NOT an invented literal, so the denylist scan stays
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
// jt11-16 — this mode is now the BOOT mode: the cabinet opens on MARQUE (below), dwells
// MARQUE_DWELL_FRAMES of pumped frames, then hands off to the attract self-play cycle —
// the ROM's marque→VSIM rhythm. Making MARQUE RECUR inside the attract loop (a title page
// in PAGE_ORDER) is a deferred follow-up with the remaining ATMST lessions.
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
  // The extra-mount line is three adjacent parts — "EXTRA MOUNT EVERY " + the replay
  // level ("20") + ",000 POINTS" — centred as one line (MSW17 / OUTBCD / MSW18, ATT.SRC:67-79).
  const extraMountWidth = screen.extraMount.width + screen.replayLevel.width + screen.pointsSuffix.width
  const extraMountX = Math.round((LOGICAL_WIDTH - extraMountWidth) / 2)
  paintText(screen.extraMount, extraMountX, TITLE_EXTRA_MOUNT_Y)
  paintText(screen.replayLevel, extraMountX + screen.extraMount.width, TITLE_EXTRA_MOUNT_Y)
  paintText(screen.pointsSuffix, extraMountX + screen.extraMount.width + screen.replayLevel.width, TITLE_EXTRA_MOUNT_Y)
  titleFrame++
}

// jt10-4 — paint the core's ordered draw list for a game sim (back platforms →
// entity sprites → foreground island). The render SELECTION lives in the pure core
// (drawList), never by-eye in the shell. Shared by the 'playing' render and the
// attract self-play demo; the HUD is the caller's concern (attract omits it).
function paintSim(game: GameState): void {
  for (const op of drawList(game.sim)) {
    // The dissolve's ASH1R is a runlength stream — not in the atlas, so blitOp would
    // silently skip it (jt3-7 B1). Decode + paint it via expandAshFrames here, the ASH
    // twin of the COMCL5 island path, indexed by op.frame.
    if (op.kind === 'crumble') paintCrumble(logicalContext, op, colours)
    else if (op.kind === 'warpin') paintWarpIn(logicalContext, op, colours)
    else if (op.name === 'ASH1R') paintDissolve(logicalContext, op, colours)
    else blitOp(op)
  }
  // The bottom island is the front-most layer, occluding entities behind its front edge.
  drawIsland()
}

// jt10-4 — the attract render: the live self-play sim on the demo page, or a warning
// banner (FONT57) centred on a STATIC background (the fixed colours[0] fill each frame).
// The banner's TEXT colour steps with the scheduler's `colourPhase` (ATT.SRC:173, every 2.5 s).
const ATTRACT_BANNER_Y = 108
// jt11-1 — the start prompt paints LAST on every attract page (the demo page
// included: that is where a new player is stuck without it). At y 228 it sits
// INSIDE the island's painted rows — the decoded COMCL5 island spans y 211-243
// (33 rows, measured in review) — and is legible only because it is painted
// AFTER paintSim/drawIsland, over the bricks. Do not move this paint above the
// sim paint, and do not trust an "island ends at 223" claim: that figure is a
// CLIF5 sub-record, not the island.
const ATTRACT_PROMPT_Y = 228
function renderAttract(): void {
  const page = attract.page
  const colour = colours[1 + (attract.colourPhase % (colours.length - 1))]
  if (page === 'demo') {
    paintSim(cabinet.game)
  } else {
    const { banner } = layoutAttractBanner(page, colour)
    paintText(banner, Math.round((LOGICAL_WIDTH - banner.width) / 2), ATTRACT_BANNER_Y)
  }
  const prompt = layoutStartPrompt(colour)
  paintText(prompt, Math.round((LOGICAL_WIDTH - prompt.width) / 2), ATTRACT_PROMPT_Y)
}

// ─── The cabinet: booted to 'title' (MARQUE), stepping the SESSION layer once playing ──
//
// jt4-5 MIGRATION (Dev/Korben): the shell drives the SESSION layer — `createGame` +
// `stepGame` from core/game — NOT the raw sim. The jt2-1 one-sim seam still holds:
// `stepGame` internally WRAPS the sim's `stepSim` over a `createWaveSim`-built
// sim, so there is no divergent second stepping path, and the HUD reads the
// per-player registers straight off the GameState it steps. jt10-5 wrapped that game
// in the cabinet tier; jt10-4 landed `renderAttract` (the self-play cycle below).
// jt11-16 — the cabinet now boots into 'title' (the MARQUE logo screen), the ROM's
// authentic attract opening: the title pump branch dwells MARQUE_DWELL_FRAMES then
// hands to the 'attract' self-play cycle (what puts joust's live demo in the lobby
// showcase carousel, showcase:true). This is `createCabinet(SEED)` with the mode
// overridden to 'title' at boot — spelled inline to keep the jt4-5 session seam
// visible: main.ts constructs the game with the literal `createGame(` and steps it
// with `stepGame(` (pinned by demo-source.test.ts / gameover-wiring.test.ts), rather
// than through a wrapper. A start press in TITLE routes on to the 'select' coin-up
// (toSelect), and select → startPlaying begins a real game; a start press in ATTRACT
// now direct-starts with the pressed count (jt11-17), bypassing select.
// A fixed shell-owned seed replays the same run each load; core mints no entropy,
// so the seed crosses the boundary from here.
const SEED = 0x1a2b_3c4d
let cabinet: CabinetState = { mode: 'title', game: createGame(SEED) }

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

// jt10-7 — the JOUST CHAMPIONS persistence seam. makeHighScoreStorage is the ONLY
// localStorage touch (single-origin, keyed `joust-high-scores`), with the 'wave'
// domain guard (joust's own domain field). Loaded once at boot; the qualify gate
// (afterGameOver) and the initials-entry commit both read/write this table.
const highScores = makeHighScoreStorage('joust', makeHighScoreRowGuard('wave'), 'wave')
let highScoreTable: JoustHighScore[] = highScores.load()

// jt10-7 — the in-flight initials entry (the SH2-13 shared keyboard verb). Letters
// arrive as keydown EVENTS through enterInitial; the flap RISING edge commits once
// the buffer is complete. entryScore/entryWave are captured when 'highscore' is
// entered; entryPrompt is the rank-selected line (champion vs lesser).
//
// jt11-6 — the buffer also carries a TICK BUDGET (beginEntry seeds it), and there
// are now TWO ways it commits: that flap confirm, and the budget running out, which
// commits whatever has been typed rather than requiring a complete buffer. Both go
// through commitHighScore below, so there is still exactly one write.
let entry = beginEntry()
let entryScore = 0
let entryWave = 1
let entryPrompt = PROMPT_LESSER
let prevHsFlap = false
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

// jt11-16 — the MARQUE (title) dwell budget, spent in the frame pump (the shell owns
// the clock). Counts up to MARQUE_DWELL_FRAMES, then the title hands off to attract —
// the ROM's marque→VSIM rhythm (ATT.SRC:121). Boot-only in this story; the title is
// entered once, at boot, and does not recur.
let titleDwellFrames = 0

/** Begin a real game for `count` players, seeded from SEED, and cache its player ids. */
function enterPlaying(count: 1 | 2): void {
  cabinet = startPlaying(cabinet, SEED, count)
  playerIds = cabinet.game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
  prevFlap1 = false
  prevFlap2 = false
  gameoverHoldFrames = 0
}

/**
 * jt10-7 — seed the initials-entry state when the cabinet routes into 'highscore'.
 * The final score is the best player's (afterGameOver's own gate value); the wave
 * is the session's. The prompt is rank-conditional — the CHAMPION (rank 1) sees
 * 'ENTER THY NAME MY LORD!', a lesser qualifier 'ENTER YOUR INITIALS'.
 */
function beginHighScoreEntry(game: GameState): void {
  entryScore = game.players.reduce((max, p) => Math.max(max, p.score), 0)
  entryWave = game.wave
  entry = beginEntry()
  entryPrompt = promptForRank(rankForScore(highScoreTable, entryScore))
  prevHsFlap = false
}

/**
 * jt11-6 — the ONE path that persists a high-score row. Both ways off the entry
 * screen come through here — the manual FLAP confirm and the timeout's auto-commit
 * — so the ordering, the cap and the buffer reset cannot drift apart between them.
 */
function commitHighScore(initials: string): void {
  highScoreTable = commitEntry(highScoreTable, initials, entryScore, entryWave)
  highScores.save(highScoreTable)
  entry = beginEntry()
}

/** The player's start-button intent this frame: the 1P / 2P start keys (1 / 2). */
function readSelectInput(keys: KeyMembership): SelectInput {
  if (keys.has('Digit1')) return 'one-player'
  if (keys.has('Digit2')) return 'two-player'
  return null
}

// jt5-1 — the audio seam. The engine is inert until a user gesture unlocks the
// context (browsers refuse an AudioContext before one) and inert forever where
// WebAudio is absent, so `resume()` on every keydown is the cheap, correct hook:
// only the first call does work. The twenty `.wav` files it will fetch are NOT
// in this repo and nothing has put them in the bucket yet — jt5-1 ships the seam
// and joust stays quiet, because a failed fetch degrades silently by design.
const audio = createAudioEngine()

// SH4-2: the shared held-keys tracker owns the Set + keydown/keyup and adds a
// blur reset (new — a held key no longer sticks across an alt-tab). Default idOf
// is e.code, which is what joust keys on; Space preventDefault keeps it from
// scrolling. The keydown below keeps only its SIDE effects (audio unlock, the
// highscore-screen initials edge). `held.uninstall()` is the disposer.
const held = installHeldKeys(window, { preventDefaultFor: new Set(['Space']) })
window.addEventListener('keydown', (e) => {
  audio.resume()
  // jt10-7 — initials entry is the shared keyboard verb: a letter/Backspace keydown
  // steps the buffer while the cabinet is on the 'highscore' screen. `e.key` (the
  // character) is what stepNameEntry consumes; every non-letter (incl. the Space
  // confirm) is inert here and handled by the pump's flap-confirm instead.
  if (cabinet.mode === 'highscore') entry = enterInitial(entry, e.key)
})

// jt11-14 — the FROZEN-COUNTDOWN escape hatch. jt11-6's entry timeout is spent by
// the frame pump, whose catch-up is clamped (MAX_CATCHUP_SECONDS), so a HIDDEN tab
// freezes the countdown and a CLOSED tab never advances it at all — the one
// 'walked-away' case the pumped timeout cannot reach. On pagehide (the close /
// navigate / discard signal) and on visibilitychange→hidden (the tab-switch signal)
// commit the in-flight entry through the SAME commitHighScore path, padded exactly
// like the timeout so a 0- or 2-letter walk-away still keeps its rank, then route to
// attract so a returning tab cannot re-commit the row. Shell-only: this reads the
// document; core keeps counting ticks and never learns about it.
function commitEntryOnExit(): void {
  if (cabinet.mode === 'highscore') {
    commitHighScore(timeoutInitials(entry))
    cabinet = toAttract(cabinet, SEED)
  }
}
window.addEventListener('pagehide', commitEntryOnExit)
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') commitEntryOnExit()
})

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
        // afterGameOver → 'highscore' iff the best score qualifies against the
        // persisted JOUST CHAMPIONS table (jt10-7), else 'attract' (rendered by
        // renderAttract). On a qualifying route, seed the initials entry.
        if (++gameoverHoldFrames >= GAMEOVER_HOLD_FRAMES) {
          cabinet = afterGameOver(cabinet, highScoreTable)
          gameoverHoldFrames = 0
          if (cabinet.mode === 'highscore') beginHighScoreEntry(cabinet.game)
        }
        return
      }
      if (cabinet.mode === 'highscore') {
        // jt10-7 — the initials-entry screen. Letters arrive as keydown EVENTS
        // (enterInitial, in the keydown handler). Here we watch only the CONFIRM:
        // FLAP (Space) on its RISING edge, with the buffer COMPLETE, commits the row
        // to the persisted JOUST CHAMPIONS table and returns to attract. The rising
        // edge (prevHsFlap) keeps a held flap from re-committing every frame.
        //
        // jt11-6 — the entry also has a BUDGET, spent one tick per pumped frame (the
        // shell owns the clock; core counts ticks). When it runs out the current
        // initials are committed anyway, space-padded — so a player who walks away
        // from a qualifying score keeps the row instead of losing it. The 1982
        // cabinet ran the same 7680-tick leash (AMODE, TB12REV1.SRC:77-78) but
        // ABANDONED the entry on expiry (PKILL, then JMP VATTRT); auto-committing is
        // this port's deliberate deviation — see the session Design Deviations.
        entry = tickEntry(entry)
        const flapHeld = held.has('Space')
        if (flapHeld && !prevHsFlap && isEntryComplete(entry)) {
          commitHighScore(entry.initials)
          cabinet = toAttract(cabinet, SEED)
        } else if (isEntryExpired(entry)) {
          commitHighScore(timeoutInitials(entry))
          cabinet = toAttract(cabinet, SEED)
        }
        prevHsFlap = flapHeld
        return
      }
      if (cabinet.mode === 'attract') {
        // jt10-4 — the attract SUB-CYCLE. Step the pure scheduler one video frame; on
        // the demo page PUMP the self-play SESSION (empty inputs — active player AI is
        // the deferred G-block follow-up), restarting a fresh demo when it settles to
        // game-over so the loop never ends. A start press starts a game DIRECTLY with the
        // pressed count (jt11-17): the CTA promises "PRESS 1 OR 2 TO START", so thread the
        // 1-vs-2 choice through selectPlayerCount into enterPlaying rather than re-asking on
        // a 'select' screen. The shared prevStartHeld gives that press its rising-edge
        // discipline, so a held key cannot re-seed the game every frame. (The 'select'
        // coin-up survives for the title start-press — jt11-16 — and is untouched here.)
        attract = stepAttract(attract)
        const want = readSelectInput(held)
        const startHeld = want !== null
        if (startHeld && !prevStartHeld) {
          const count = selectPlayerCount(want)
          if (count !== null) enterPlaying(count)
        }
        prevStartHeld = startHeld
        if (cabinet.mode === 'attract' && attract.page === 'demo') {
          const game = stepGame(cabinet.game, {})
          cabinet = game.gover === GOVER_OVER ? toAttract(cabinet, SEED) : { mode: 'attract', game }
        }
        return
      }
      if (cabinet.mode === 'title') {
        // jt11-16 — the MARQUE title, the cabinet's boot screen. Spend the dwell budget
        // one pumped frame at a time; when it reaches MARQUE_DWELL_FRAMES hand off to the
        // attract self-play cycle (the ROM's marque→VSIM). A start press leaves early for
        // the 'select' coin-up, on the RISING edge only (the shared prevStartHeld gives
        // that press edge discipline across the transition, as the attract branch does).
        titleDwellFrames += 1
        const want = readSelectInput(held)
        const startHeld = want !== null
        if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)
        else if (titleDwellFrames >= MARQUE_DWELL_FRAMES) cabinet = toAttract(cabinet, SEED)
        prevStartHeld = startHeld
        return
      }
      if (cabinet.mode !== 'playing') {
        // The coin-up door: 'select'. Begin a game on the RISING edge of a start press
        // only, so a held start button cannot re-seed the game each frame.
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
    // The live game, plus the authentic HUD reading the session registers off the
    // stepped GameState. Sim first, HUD over it — the HUD row (y 217) sits inside
    // the island's painted rows, exactly as the jt11-1 prompt does.
    paintSim(cabinet.game)
    drawHud(overlayReadout(cabinet.game))
  } else if (cabinet.mode === 'attract') {
    // jt10-4 — the attract cycle: the self-play sim on the demo page, or a warning
    // banner. No HUD — attract, reached after the title dwell (jt11-16), is the
    // self-play public face of the cabinet.
    renderAttract()
  } else if (cabinet.mode === 'gameover') {
    // The game-over overlay: the 'THY GAME IS OVER' banner, held ~88 ticks.
    renderGameOverScreen()
  } else if (cabinet.mode === 'title') {
    // The title overlay: the vector JOUST wordmark + copyright/extra-mount lines,
    // colour-cycling every TITLE_COLOR_CADENCE frames. This is the cabinet's boot
    // screen as of jt11-16 (the title pump branch dwells here, then hands to attract).
    renderTitleScreen()
  } else if (cabinet.mode === 'highscore') {
    // jt10-7 — the JOUST CHAMPIONS table + the rank-conditional initials prompt.
    renderHighscoreScreen()
  } else {
    // The coin-up door: the two START banners and the CREDITS row ('select').
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
