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

import { mountCanvas, installPauseToggle } from '@shared/host-helpers'
import { mountVolumeControl } from '@shared/volume-ui'
import { INITIAL_PAUSED, isPauseKey } from '@shared/pause'
import { drawEscOverlay } from '@shared/esc-overlay'
import { drawCabinetChrome, CABINET_CHROME } from '@shared/cabinet'
import { PLYFLD_STRIDE } from './core/conway'
import { BACKGROUND_BIT } from './core/mushroom'
import { VACANT_COLOR, segmentOnScreen } from './core/millipede'
import { createGame, type GameState } from './core/game-state'
import { stepGame, type GameInput } from './core/sim'
import { hudPlacements, SHIP_STAMP, type HudPlacement } from './core/hud'
import { MILLI_INITIALS_LENGTH, type MilliHighScore } from './core/highscore'
import { showcaseSections, showcaseSprites, textPlacements, SHOWCASE_BACKGROUND } from './core/attract-showcase'
import { decodeColourByte, type Rgb } from './core/palette'
import { drawGridStamps, drawStampAtPx, drawStampGridAtPx, charTile, drawPlayerAreaBand } from './shell/render'
import { ddtGlyph } from './shell/ddt-glyph'
import { fieldPens, playerPens, alphanumericPens, spritePens } from './shell/playfield-palette'
import { createAudio } from './shell/audio'
import { playEventSounds } from './shell/audio-dispatch'
import { runFixedSteps } from './shell/frame-clock'
import { createMouseAdapter, createPointerLock, nameEntryFromKey } from './shell/input'
import { makeMilliHighScoreStorage, loadHighScores } from './shell/highscore'

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

// ── High-score persistence (ml10-2): one-origin localStorage under the 'millipede'
//    cabinet key (shell/highscore.ts). Loaded into the boot state so the attract board
//    and the qualify check read the persisted ladder, saved when a commit changes it. ──
const highScoreStorage = makeMilliHighScoreStorage()

// ── The game, booting into the silent attract demo, with the persisted ladder
//    (EMPTY on a first/empty boot — pt1-8: no built-in seed; loadHighScores). ──
let game: GameState = { ...createGame(0x1982), highScores: loadHighScores(highScoreStorage) }

// ── Mouse capture (ml10-4): the trackball reads pointer-lock movementX/Y deltas
//    through the shell adapter, drained once per stepped frame. Under lock those
//    deltas are UNBOUNDED (the cursor never hits a screen edge), so the mouse
//    behaves like the cabinet trackball. The cursor is hidden while it does. ──
// sa1-3 — fleet-consistent capture chrome: the OS cursor is hidden only WHILE the
// pointer is actually captured, not from boot. It is visible in attract (so the player
// sees a pointer to click) and RESTORED on a lock EXIT (Escape). mc parity: missile-command
// hides the cursor only AFTER the lock is confirmed held (inside request().then(), guarded
// by pointerLockElement === canvas, main.ts:113-117) and restores it with `cursor = ''` on
// onExit; centipede never hides it (the OS handles it under lock). The guarded hide lives in
// the pointerdown capture path below; onExit restores it here.
const mouse = createMouseAdapter(document)
// R5: an Escape-exit keeps the window focused, so 'blur' never fires — the
// pointerlockchange listener clears the last accumulated delta regardless of what
// caused the exit (Escape or blur) so the gun does not keep drifting (no runaway
// travel), and (sa1-3) restores the OS cursor the capture hid. R4/cp2-8: a rejected
// requestPointerLock (re-lock cooldown) is surfaced to the console instead of vanishing.
const pointerLock = createPointerLock(
  canvas,
  document,
  () => {
    mouse.reset()
    canvas.style.cursor = '' // sa1-3: restore the OS cursor on lock EXIT (ESC parity with mc)
  },
  (reason) => console.warn('millipede: pointer lock request rejected', reason),
)

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
  // ml10-2: during name entry a keystroke types an initial (or commits on Enter) and
  // must NOT start/fire — gate on the PRE-keystroke phase, or a committing Enter
  // (entry→attract) then falls into startPlay and boots an unrequested new game.
  // Persist the moment a commit changes the ladder reference (the asteroids/mc signal:
  // commitNameEntry's insert returns a NEW array).
  if (game.phase === 'entry') {
    const prevScores = game.highScores
    game = nameEntryFromKey(e.key, game)
    if (game.highScores !== prevScores) highScoreStorage.save(game.highScores)
    return
  }
  // sa1-2: Escape is the PAUSE key (installPauseToggle owns it on its own listener) —
  // it must NOT also fall into startPlay/fire here, or toggling pause on the attract
  // screen would latch startPending and boot an unrequested game on resume.
  if (isPauseKey(e.key.toLowerCase())) return
  startPlay()
  if (FIRE_KEYS.has(e.key)) fireHeld = true
})
window.addEventListener('keyup', (e: KeyboardEvent) => {
  if (FIRE_KEYS.has(e.key)) fireHeld = false
})
canvas.addEventListener('pointerdown', () => {
  startPlay()
  // click-to-lock the canvas for the trackball (R4-safe). sa1-3: hide the OS cursor ONLY
  // once the lock is ACTUALLY held — request() resolves on a swallowed rejection too (the
  // R4 re-lock cooldown), so gate on pointerLockElement or a rejected re-lock would leave
  // the cursor hidden with no lock (mc main.ts:113-117). onExit restores it on ESC.
  void pointerLock.request().then(() => {
    if (document.pointerLockElement === canvas) canvas.style.cursor = 'none'
  })
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
// The mouse-move → {dh, dv} mapping (negated horizontal, non-negated vertical) now
// lives in createMouseAdapter (shell/input.ts, ml10-4); it listens on `document` so
// it receives the movementX/Y deltas pointer lock dispatches there.

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

// A one-colour text palette from a ROM colour byte (the alphanumericPens shape):
// pen 0 is the transparent background, pens 1-3 the ink, so a glyph prints in
// `byte` whatever 2-bit pixel value its stamp uses.
const showcaseInkPalette = (byte: number): readonly Rgb[] => {
  const ink = decodeColourByte(byte)
  return [decodeColourByte(0xff), ink, ink, ink]
}

function renderShowcase(c: CanvasRenderingContext2D, highScores: readonly MilliHighScore[]): void {
  const { r, g, b } = decodeColourByte(SHOWCASE_BACKGROUND)
  c.fillStyle = `rgb(${r}, ${g}, ${b})`
  c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  // Each section draws through its OWN one-colour palette: white HIGH SCORES +
  // footer, red creature labels (ml9-3, attract-mame-reference.png). Without this
  // the whole screen prints the census-default green. The board is the LIVE ladder
  // (ml10-2 — the persisted board on a returning boot), not the seeded default.
  for (const s of showcaseSections(highScores)) {
    drawGridStamps(c, s.placements, showcaseInkPalette(s.ink))
  }
  // Each creature's sprite, blitted just above its name label, in its OWN
  // authentic MOCOL colours (spritePens keyed by the creature's colour byte).
  // ml11-2: each cell sits on a solid BLACK panel (attract-mame-reference.png:
  // the creatures show on black boxes, not floating on the blue background). The
  // panel is drawn BEFORE the sprite so the creature sits ON it, and its geometry
  // is DERIVED from the sprite cell (not eyeballed): the 16px-wide footprint padded
  // out horizontally, spanning from above the sprite down to its name-label row 18px
  // below. A static fill — no strobe (ml7-4 accessibility). The exact box extents
  // are confirmed against the reference at the /millipede/ visual playtest (AC3).
  const PANEL_PAD_X = 10
  const PANEL_PAD_TOP = 8
  for (const s of showcaseSprites()) {
    const spriteX = s.col * 8
    const spriteY = (0x1f - s.row) * 8 - 18
    c.fillStyle = '#000'
    c.fillRect(spriteX - PANEL_PAD_X, spriteY - PANEL_PAD_TOP, 16 + PANEL_PAD_X * 2, 18 + PANEL_PAD_TOP)
    drawSpritePx(c, spriteX, spriteY, s.pic, spritePens(s.color))
  }
}

function render(state: GameState): void {
  const c = lctx as CanvasRenderingContext2D
  if (state.phase === 'attract' && state.frame % ATTRACT_CYCLE_FRAMES >= ATTRACT_CYCLE_FRAMES - SHOWCASE_FRAMES) {
    renderShowcase(c, state.highScores)
    return
  }
  // ml10-2: the name-entry screen — a qualifying game-over lands here to sign the
  // board. A minimal prompt over black with the in-progress initials (padded to the
  // three cells); the full ROM entry-screen dressing is deferred to the visual playtest.
  if (state.phase === 'entry') {
    c.fillStyle = '#000'
    c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    drawGridStamps(c, textPlacements('GREAT SCORE', 9, 20), showcaseInkPalette(0xff))
    drawGridStamps(c, textPlacements('ENTER YOUR INITIALS', 6, 17), showcaseInkPalette(0xff))
    drawGridStamps(c, textPlacements(state.initials.padEnd(MILLI_INITIALS_LENGTH, ' '), 14, 13), showcaseInkPalette(0x0f))
    return
  }
  c.fillStyle = '#000'
  c.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  drawPlayerAreaBand(c) // the green grass band along the bottom rows, under the field

  // Each field cell is coloured by its CHAR CODE: a normal mushroom cap reads
  // salmon, a poison cap blue (fieldPens), which one global palette cannot do.
  // DDT-bomb cells ($6E/$6F) render from the ml9-3 two-colour override glyph
  // (blue box + red 'DDT' letters) instead of the monochrome ROM tile. The base
  // band is the LCOLOR-latched per-length colour (state.fieldColourIndex, ml11-1),
  // so it steps with the millipede's length while the per-code caps/DDT survive.
  for (const p of fieldPlacements(state.field)) {
    const glyph = ddtGlyph(p.stamp)
    if (glyph) drawStampGridAtPx(c, glyph, p.col * 8, (0x1f - p.row) * 8, fieldPens(p.stamp, state.fieldColourIndex))
    else drawGridStamps(c, [p], fieldPens(p.stamp, state.fieldColourIndex))
  }
  // Each motion object paints in its OWN authentic per-creature MOCOL colours,
  // keyed by its `color` attribute byte (milliped's packed sprite palette).
  // segmentOnScreen gates the wave-start train off the ROM's off-top band
  // (MOBJV >= OFFTOP_V, MILLI.MAC:1872): at wave start every segment sits at
  // ENTER_V=0xF8, so ungated it painted straight onto the HUD score row (ml12-1).
  for (const s of state.segments)
    if (s.color !== VACANT_COLOR && segmentOnScreen(s.v)) drawSprite(s.h, s.v, s.pic, spritePens(s.color))

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
    hudPlacements({ score: state.score, lives: state.lives, highScore: state.highScores[0]?.score ?? 0 }),
    alphanumericPens(),
  )
}

// sa1-2: Escape toggles pause via the shared @shared/pause gate (installPauseToggle
// guards e.repeat). Escape also releases the trackball pointer-lock (browser default),
// so a paused cabinet frees the mouse — pressing ESC again resumes. The freeze skips
// the fixed-step pump below; the card + colour are millipede's OWN per-cabinet NUMBERS.
const pause = installPauseToggle(window, isPauseKey, INITIAL_PAUSED)
// sa1-4: the shared master-volume control, shown only while paused.
const volume = mountVolumeControl({ root: document.body })
const MILLIPEDE_PAUSE = {
  lines: [
    'PAUSED',
    '',
    'ESC          RESUME',
    'MOUSE        AIM',
    'SPACE        FIRE',
    'CLICK        START',
  ],
  color: '#7bff5a',
  opacity: 0.72,
} as const

// ── Fixed-timestep accumulator (ml7-5). stepGame is one ROM 60 Hz frame, so we
//    drive it off REAL elapsed time, not the raw rAF cadence: a >60 Hz display
//    (or uncapped rAF) no longer runs the sim faster than the arcade, and a
//    backgrounded tab that hands back a huge delta is clamped (frame-clock.ts). ──
let accMs = 0
let lastTs: number | null = null

const frame = (ts: number): void => {
  // sa1-4: keep the volume slider's visibility in sync every animated frame — it
  // must track both entering AND leaving pause, so this runs unconditionally,
  // ahead of the freeze branch below (which skips the sim pump, not this).
  volume.setVisible(pause.isPaused())
  const elapsed = lastTs === null ? 0 : ts - lastTs
  lastTs = ts

  // Drain the trackball delta accumulated across skipped rAFs exactly once this frame.
  const { dh, dv } = mouse.sample()
  // Test tap (ml10-5), mirroring window.__sim below: expose the drained trackball so a
  // boot-harness pin can prove the pointer-lock EXIT reset actually cleared it.
  ;(window as unknown as { __trackball?: { dh: number; dv: number } }).__trackball = { dh, dv }

  // Step the sim a whole number of fixed 60 Hz frames for the real time elapsed
  // (runFixedSteps folds the delta + carries the remainder). Input is drained once,
  // into the first sub-step, so a catch-up burst can't replay the same fire/start
  // and the mouse travel is consumed whole.
  // sa1-2: freeze the sim while paused — skip the fixed-step pump. `lastTs` is
  // already updated above, so paused wall-time is discarded (no catch-up burst).
  // (Braced so a future statement added after the pump can't silently escape the guard.)
  if (!pause.isPaused()) {
    accMs = runFixedSteps(accMs, elapsed, (isFirst) => {
    const input: GameInput = isFirst
      ? { dh: toByte(dh), dv: toByte(dv), fire: firePending || fireHeld, start: startPending }
      : { dh: 0, dv: 0, fire: false, start: false }
    if (isFirst) {
      firePending = false
      startPending = false
    }
    game = stepGame(game, input)
    playEventSounds(audio, game.events)
    ;(window as unknown as { __sim?: GameState }).__sim = game
    })
  }

  render(game)

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  const scale = Math.max(1, Math.floor(Math.min(canvas.width / LOGICAL_W, canvas.height / LOGICAL_H)))
  const dx = Math.floor((canvas.width - LOGICAL_W * scale) / 2)
  const dy = Math.floor((canvas.height - LOGICAL_H * scale) / 2)
  ctx.drawImage(logical, dx, dy, LOGICAL_W * scale, LOGICAL_H * scale)
  // sa1-1: the shared cabinet surround — one uniform fill over the integer-fit's
  // dead margin (the bars the centred, floored dx/dy leave around the scaled
  // raster), matching every other adopter's frame colour (centipede's
  // src/main.ts is the mirrored sibling adoption).
  drawCabinetChrome(
    ctx,
    { width: canvas.width, height: canvas.height },
    { x: dx, y: dy, width: LOGICAL_W * scale, height: LOGICAL_H * scale },
    CABINET_CHROME,
  )
  // sa1-2: dim the frozen field and stroke millipede's own keybind card over it —
  // drawn AFTER the cabinet chrome so the pause dim covers the surround too.
  if (pause.isPaused()) drawEscOverlay(ctx, canvas.width, canvas.height, MILLIPEDE_PAUSE)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
