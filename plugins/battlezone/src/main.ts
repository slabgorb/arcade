// src/main.ts
//
// Battlezone bootstrap — bz1-10: the whole game now lives in ONE GameState
// stepped by the pure core/sim.ts (attract → playing → gameover → attract),
// integrating everything the earlier stories built: dual-tread movement
// (bz1-4), the cannon (bz1-5), the radar scanner (bz1-6), the full roster
// (bz1-7/8/9), and this story's difficulty ratchet, lives, extra-tank award,
// and high-score run loop. The shell's job is unchanged in kind: read the
// keyboard (with the bz1-10 start edge latch), step the sim, stroke the
// battlefield from the LIVE state, overlay the mode's screen text
// (core/screens.ts — coin-op-free by test), and persist the high-score table
// at run end. The render camera IS the player pose (turret forward-locked),
// so the projection follows the tank — and the attract demo — for free.
//
// SH-5 (ADR-0001): the hand-rolled variable-dt single-step loop this file used
// to inline is retired in favour of the shared fixed-timestep accumulator
// (@shared/loop). The sim now advances in constant 1/60 sub-steps with
// the shared 0.25s stall clamp (was a variable dt clamped at 0.05s) — a
// deliberate, ratified cadence change that unifies battlezone with its siblings
// and gains the started-boolean baseline fix for free. `step` and `render` are
// split so the shared loop drives each: side effects ride the sub-steps, drawing
// rides the render frame.

import { SHARED_VERSION } from '@shared/index'
import { createLoop } from '@shared/loop'
import { skylineSegments, panoramaToNdc, VOLCANO_PEAK } from './core/horizon'
import { enemyTankSegments, obstacleSegments, projectModel } from './core/scene'
import { SWEEP_BYTE_TURN } from './core/radar'
import { type HostileKind } from './core/enemies'
import { VOLCANO_LIFETIME } from './core/volcano'
import { SHELL, SLOW_TANK, SUPER_TANK, MISSILE, SAUCER, EXPLOSION_DEBRIS, type Model3D } from './core/models'
import { initGame, type GameState } from './core/state'
import { enterInitial } from './core/sim'
import { attractLines, gameOverLines, entryLines } from './core/screens'
import { inGameAlert, alertFlashOn } from './core/alerts'
import { MESSAGES } from './core/text'
import { KeyboardTreads } from './shell/input'
import { INITIAL_PAUSED, isPauseKey, stepUnlessPaused } from './shell/pause'
import { mountCanvas, installAudioUnlock, installPauseToggle } from '@shared/host-helpers'
import { makeHighScoreStorage, isHighScoreRow } from '@shared/highscore'
import { createAudioEngine } from './shell/audio'
import { playEventSounds, updateContinuousSounds } from './shell/audio-dispatch'
import { applyLetterbox } from './shell/viewport'
import {
  drawSegments,
  drawGunsight,
  drawRadar,
  drawScore,
  drawScreenLines,
  drawLives,
  drawCrackedGlass,
  drawPeriscope,
  drawHorizonBand,
  drawMessage,
  drawPauseOverlay,
  drawControlIndicator,
  drawVolcanoRocks,
} from './shell/render'

// The live roster wears its own ROM wireframe (models.ts, bz1-2 §6).
const HOSTILE_MODEL: Readonly<Record<HostileKind, Model3D>> = {
  tank: SLOW_TANK,
  'super-tank': SUPER_TANK,
  missile: MISSILE,
}

/**
 * bz3-6 (H-006): radians of backdrop elevation per debris height-unit for the
 * volcano's flying rocks. The ROM plots VOLCNO's rocks via a hardware DOT
 * sprite at its own native (non-angular) coordinate — there is no ROM-cited
 * conversion into this port's angular backdrop space — so this is an
 * authored, playtest-tunable visual fit (like RADAR_RANGE), sized so the
 * ~0-80-unit arc (launch velocities 5..12, gravity -1) rises a plausible
 * amount above VOLCANO_PEAK without overshooting the mountain-scape.
 */
const VOLCANO_HEIGHT_SCALE = 0.002

// sc1-1: the checked mount replaces `as HTMLCanvasElement` + `getContext('2d')!`.
const { canvas, ctx } = mountCanvas(document)

// SH-1: first consumer of the shared library (ADR-0001). Stamp the shared-lib
// version this build was compiled against onto the document for diagnostics — a
// retained, side-effecting use that proves the bundler resolves the shared
// library (a version-pinned git-URL dep once; the in-repo `@shared` alias onto
// src/shared now). The real payloads (math3d, rng) land in SH-2/SH-3.
document.documentElement.dataset.arcadeShared = SHARED_VERSION

// bz2-1: pin the canvas to the fixed cabinet aspect ratio and letterbox it,
// instead of stretching to the full window. The fit math + HiDPI clamp live in
// the pure, unit-tested shell/viewport module; the black page background shows
// through around the centered canvas as the letterbox/pillarbox bars.
function resize(): void {
  applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)
}

window.addEventListener('resize', resize)
resize()

const treads = new KeyboardTreads()

// bz1-11: the sound engine. The context is built ONLY inside resume() —
// never at bootstrap (autoplay policy) — so unlockAudio is safe to wire to
// every plausible first gesture; repeats are harmless no-ops (sibling
// convention: star-wars pointerdown/keydown).
const audio = createAudioEngine()
installAudioUnlock(() => audio.resume(), window)

// SH-6: the high-score persistence seam is now the shared factory (the same
// module + `battlezone-high-scores` key the lobby reads). battlezone records no
// domain field, so it binds the domain-AGNOSTIC base guard `isHighScoreRow`
// directly — not makeHighScoreRowGuard — closing the tile's NO SCORE gap.
const highScoreStorage = makeHighScoreStorage('battlezone', isHighScoreRow, '')

// The core is seeded once per page load — the shell owns the wall clock, the
// core sees only the word (epic boundary: randomness enters as a carried
// seed). The persisted board is loaded into the booted attract state so the
// title screen shows it immediately.
// Annotated GameState: the shared `load()` returns a MUTABLE HighScoreEntryBase[],
// so without this the field would infer mutable and reject the readonly board
// stepGame returns each frame. mutable → readonly is a safe widening.
let game: GameState = { ...initGame(Date.now() >>> 0), highScores: highScoreStorage.load() }
let wasAttract = true

// bz2-5: Escape toggles pause. Edge, not level (guard e.repeat) so a held key
// can't machine-gun the toggle — the same one-press-one-event discipline as the
// bz1-10 start latch (shell/input.ts). The freeze itself lives in stepUnlessPaused.
// sc1-1: the toggle is the shared helper, fed battlezone's OWN isPauseKey (which
// shell/pause re-exports verbatim from @shared/pause). The 4-arg stepUnlessPaused
// gate and the local drawPauseOverlay stay battlezone's — only the listener moved.
const pause = installPauseToggle(window, isPauseKey, INITIAL_PAUSED)

// Initials entry (SH2-13): typed letters and Backspace are edge events, not
// held state, so they bypass the per-frame tread sample and feed the core's
// pure event function. enterInitial is inert outside 'entry' mode, so the
// tread letters (E/D/I/K, F) keep their meaning everywhere else.
window.addEventListener('keydown', (e) => {
  if (game.mode === 'entry' && (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace')) {
    game = enterInitial(game, e.key)
  }
})

// SH-5: the shared fixed-timestep loop hands render() only an interpolation
// alpha, so the frame's sampled input and its pre-step pose (for the
// NAVIGATION-BLOCKED alert) ride these vars from stepFrame → renderFrame. Seeded
// so the baseline (0-sub-step) first frame already has values to draw with.
let frameInput = treads.read()
let framePrevPose = game.player

function stepFrame(dt: number): void {
  frameInput = treads.read()
  framePrevPose = game.player // pre-step pose — a blocked translation leaves it unchanged
  const prev = game
  game = stepUnlessPaused(game, frameInput, dt, pause.isPaused())

  // bz2-5: a paused sub-step is frozen (game === prev) — the sim did not advance,
  // so the shell side-effects must NOT fire. Replaying the held step's one-shot
  // cues, re-driving continuous audio, or re-running the attract-boundary save
  // would all misfire against a stale state. Pump them only on a sub-step that
  // actually stepped.
  if (game !== prev) {
    // The sound pump (bz1-11): one-shot cues ride this step's event list; the
    // continuous hum/rattle re-read live state. Both are silent until the
    // gesture gate opens, so pumping is safe.
    playEventSounds(audio, game.events)
    updateContinuousSounds(audio, game, frameInput)

    // Persist at the moment the run loop re-enters attract (the AC's "before/at
    // the transition"): the sim has just folded a qualifying score into the
    // table; the seam writes it under `battlezone-high-scores` for the lobby.
    if (game.mode === 'attract' && !wasAttract) highScoreStorage.save(game.highScores)
    wasAttract = game.mode === 'attract'
  }
}

function renderFrame(): void {
  const w = canvas.width
  const h = canvas.height
  const aspect = w / h
  const pose = game.player

  ctx.fillStyle = '#000'
  ctx.shadowBlur = 0
  ctx.fillRect(0, 0, w, h)

  // bz1-12: the green-tinted horizon band sits behind the green vector world.
  drawHorizonBand(ctx, w, h)

  // bz3-9 (M-009/H-007): `game.bounce` drives BOTH the mountain bob below and
  // the Z view jolt on every projectModel call further down — ONE core value.
  drawSegments(ctx, skylineSegments(pose.heading, aspect, game.bounce), w, h)

  // bz4-2: the VOLCNO rock ejecta — the seeded-stochastic 5-rock emitter, each
  // rock an OBJTIM-dimmed dot at the ridge peak, projected through the SAME
  // panoramaToNdc the rest of the backdrop uses. `game.volcano` is ticked by
  // sim.ts's advanceVolcano at the ROM game-frame rate; retired (inactive) rocks
  // have "landed" and stop rendering. Each rock dims by its OWN OBJTIM remaining.
  if (game.volcano) {
    const [peakAzimuth, peakElevation] = VOLCANO_PEAK
    const rocks: { ndc: readonly [number, number]; brightness: number }[] = []
    for (const rock of game.volcano.rocks) {
      if (!rock.active) continue
      const brightness = Math.max(0, Math.min(1, rock.objtim / VOLCANO_LIFETIME))
      const elevation = peakElevation + Math.max(0, rock.height) * VOLCANO_HEIGHT_SCALE
      const ndc = panoramaToNdc(peakAzimuth, elevation, pose.heading, aspect)
      if (ndc !== null) rocks.push({ ndc, brightness })
    }
    drawVolcanoRocks(ctx, rocks, w, h)
  }

  drawSegments(ctx, obstacleSegments(pose, aspect, game.bounce), w, h)

  // The hostile: body + spinning radar antenna + rolling tread (bz3-12,
  // W-017/W-018) while alive, radiating debris while exploding. bz4-3/AC-1: the
  // tread frame now reads the hostile's own movement-tied `treadCounter`
  // (`stepEnemies` INC/DEC off its drive) instead of the free-running
  // `game.frameCount`, so a stationary tank's treads freeze and a reversing
  // one's roll backward (`?? 0` for pre-bz4-3 Hostiles). The antenna spin still
  // rides `game.frameCount`.
  const hostile = game.enemies.hostile
  const hostilePlacement = { x: hostile.x, z: hostile.z, orientation: hostile.heading }
  drawSegments(
    ctx,
    hostile.phase === 'alive'
      ? enemyTankSegments(
          HOSTILE_MODEL[hostile.kind],
          hostilePlacement,
          pose,
          aspect,
          { frameCount: game.frameCount, treadCounter: hostile.treadCounter ?? 0 },
          game.bounce,
        )
      : projectModel(EXPLOSION_DEBRIS, hostilePlacement, pose, aspect, game.bounce),
    w,
    h,
  )

  // The bonus visitor: its ROM wireframe while alive, the standard debris
  // while its blast burns down — same pipeline as every other entity.
  const visitor = game.saucer.saucer
  if (visitor !== null) {
    drawSegments(
      ctx,
      projectModel(
        visitor.phase === 'alive' ? SAUCER : EXPLOSION_DEBRIS,
        { x: visitor.x, z: visitor.z, orientation: visitor.heading },
        pose,
        aspect,
        game.bounce,
      ),
      w,
      h,
    )
  }

  if (game.playerShell !== null) {
    const s = game.playerShell
    drawSegments(
      ctx,
      projectModel(SHELL, { x: s.x, z: s.z, orientation: s.heading }, pose, aspect, game.bounce),
      w,
      h,
    )
  }
  if (game.enemies.shell !== null) {
    const s = game.enemies.shell
    drawSegments(
      ctx,
      projectModel(SHELL, { x: s.x, z: s.z, orientation: s.heading }, pose, aspect, game.bounce),
      w,
      h,
    )
  }

  // bz5-1: the cracked-glass windshield is the cabinet's HIT reaction, not a
  // permanent decal — the ROM gates the whole windshield on its CRACK counter
  // (`LDA CRACK / BEQ 31$ / JMP WNSHLD`, BZONE.MAC:506-508). Core owns the
  // counter (state.crack, set on death and cleared over the death window); the
  // shell only READS it. Drawn over the world, under the HUD so score/radar stay
  // legible. (bz1-12 originally drew this every frame — that was the bug.)
  if (game.crack !== 0) drawCrackedGlass(ctx, w, h)

  // bz5-2 (AC1): the skeuomorphic periscope bezel frames the viewport. Cabinet
  // artwork (not in the ROM or MAME), drawn OVER the world and UNDER the
  // score/radar HUD so the HUD stays legible — the same slot as the cracked
  // glass above. The bezel leaves a central aperture, so the gunsight and a
  // centred target are never obscured.
  drawPeriscope(ctx, w, h)

  // Radar scanner HUD — bz3-7: the sweep and the blip list are now LIVE core
  // state (`game.radar` / `game.radarBlips`, ticked by sim.ts's `advanceRadar`
  // at the ROM's 15.625 Hz game-frame rate — see D-001/002/003/005). The shell
  // only converts the sweep's byte-angle to radians and strokes what core
  // handed over; no wall clock, no gating logic lives here anymore.
  drawRadar(ctx, game.radarBlips, (game.radar.sweep / SWEEP_BYTE_TURN) * Math.PI * 2, w, h)

  if (game.mode === 'playing') {
    drawGunsight(ctx, w, h)
    drawScore(ctx, game.score, w, h)
    drawLives(ctx, game.lives, w, h)
    // bz2-5: the always-on control indicator — visible for the whole run, not
    // just when paused (AC4). Names the dual-tread scheme + the pause key.
    drawControlIndicator(ctx, w, h)
    // bz1-12: the ROM alert strings — the pure decision lives in core/alerts.ts
    // (a blocked translation, or the hostile gunsight-aligned and in range, or
    // off-gunsight and directional); the shell only strokes the returned word.
    //
    // bz3-11 (C-004/C-005): the ROM flashes the two ENEMY alerts on FRAME bit 1
    // (~3.9 Hz, alertFlashOn) but MOTION BLOCKED steadily (a different bit,
    // out of this cluster's scope) — gate only the former on the flash.
    const message = inGameAlert(frameInput, framePrevPose, game)
    if (message !== null && (message === MESSAGES.MOTION_BLOCKED || alertFlashOn(game.frameCount))) {
      drawMessage(ctx, message, w, h)
    }
  } else {
    // Attract/title, game-over, and initials-entry overlays: the demo
    // battlefield keeps playing behind the text (attract) or holds frozen
    // behind it (gameover/entry).
    drawScore(ctx, game.score, w, h)
    const lines =
      game.mode === 'attract'
        ? attractLines(game.highScores)
        : game.mode === 'entry'
          ? entryLines(game.entry?.initials ?? '')
          : gameOverLines(game.score)
    drawScreenLines(ctx, lines, w, h)
  }

  // bz2-5: the pause overlay sits above the whole scene — the frozen world shows
  // dimmed behind the keybind card. Drawn last so nothing paints over it.
  if (pause.isPaused()) drawPauseOverlay(ctx, w, h)
}

const loop = createLoop(stepFrame, renderFrame)
loop.start()
