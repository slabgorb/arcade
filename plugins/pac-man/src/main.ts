// src/main.ts
//
// Story pm1-8 (GREEN, Julia) — the playable cabinet: wires the full sim
// (game.ts's stepGame) into the 60 Hz fixed-timestep accumulator + integer-
// scaled 224x288 backbuffer this file already had (pm1-3), plus keyboard
// direction input, name entry and the persisted high-score board
// (`@shared/name-entry` + `@shared/highscore`, the centipede pattern, adapted
// — this cabinet has no attract mode / trackball, so it is a smaller wiring
// than centipede's, not a re-invention of it).

import { drawMaze, drawPacman, drawGhost, drawFruit, drawHud } from './shell/render'
import { LOGICAL_W, LOGICAL_H, fitIntegerScale } from './shell/layout'
import { pumpFrame } from './shell/timebase'
import { createWsg } from './shell/wsg'
import { createAudioDriver, type AudioDriver } from './shell/audio'
import { createGameState, stepGame, enterInitial, confirmNameEntry, type GameState } from './core/game'
import type { Dir } from './core/actor'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@shared/highscore'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('2d canvas context unavailable')

// render draws into this fixed 224x288 logical backbuffer; the visible
// canvas only ever receives an integer-scaled blit of it (AC-2).
const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const logicalCtx = logical.getContext('2d')
if (!logicalCtx) throw new Error('2d canvas context unavailable for the logical backbuffer')

const resize = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}
window.addEventListener('resize', resize)
resize()

// The persistence seam — the ONLY thing that touches localStorage, so it
// lives here in the shell and never in the pure core (purity guard). 'level'
// is pac-man's domain field, matching tempest's convention.
const highScoreStorage = makeHighScoreStorage('pac-man', makeHighScoreRowGuard('level'), 'level')

// pm1-8: shell-only `?seed=N` rng seed (the cp5-2 Design Deviation pattern —
// parsed here in the shell, handed to the core as a plain argument). Without
// it the game seeds from the wall clock, which is fine for play and simply
// not what a pinned test would use.
const params = new URLSearchParams(window.location.search)
const rawSeed = Number.parseInt(params.get('seed') ?? '', 10)
const seed = Number.isFinite(rawSeed) ? rawSeed : Date.now()

let game: GameState = createGameState(seed, highScoreStorage.load())

// ── Audio: the WSG voice + the events→cue driver (pm2-3) ─────────────────
// pm1 built the `events.ts` seam and left it idle; this consumes it. All of it
// degrades silently: WebAudio starts suspended until a user gesture (resumed on
// the first keydown below), and if the voice can't be built at all (no audio
// device) the game simply runs muted — one missing sound never crashes a frame.
let audio: AudioDriver | null = null
let resumeAudio: () => void = () => {}
try {
  const wsg = createWsg()
  audio = createAudioDriver(wsg)
  resumeAudio = () => {
    try {
      wsg.resume()
    } catch {
      /* audio device vanished mid-session — stay muted, keep playing */
    }
  }
} catch {
  audio = null
}

// ── Keyboard: held-direction sampling + name-entry edge events ───────────
const held = new Set<string>()
const DIR_KEYS: Readonly<Record<string, Dir>> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

function currentDir(): Dir {
  // Newest-held-wins is unrecoverable from a Set alone (no press order), so
  // this samples in a fixed priority order — good enough for a keyboard
  // (a real joystick reports one direction at a time anyway; pacman.ts's own
  // `pending` latch is what makes an early turn "stick" until it opens).
  for (const key of ['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd']) {
    if (held.has(key) && DIR_KEYS[key]) return DIR_KEYS[key]
  }
  return 'none'
}

window.addEventListener('keydown', (e) => {
  // WebAudio autoplay policy: the context stays suspended until a user gesture.
  // The first keydown is that gesture — idempotent thereafter.
  resumeAudio()

  const key = e.key.toLowerCase()
  if (key in DIR_KEYS) held.add(key)

  // Initials entry rides its own edge event, same as centipede's
  // enterInitial — it is not part of the held-direction sampling above.
  if (game.phase === 'game-over' && game.nameEntry && !game.nameEntry.confirmed) {
    if (e.key === 'Enter') {
      confirmNameEntry(game)
      highScoreStorage.save(game.highScoreTable)
    } else {
      enterInitial(game, e.key)
    }
    return
  }

  // Restart once game-over is fully resolved (no open, unconfirmed entry).
  if (game.phase === 'game-over' && (!game.nameEntry || game.nameEntry.confirmed) && e.key === 'Enter') {
    game = createGameState(Date.now(), game.highScoreTable)
  }
})
window.addEventListener('keyup', (e) => {
  held.delete(e.key.toLowerCase())
})

let acc = 0
let last = 0
let started = false

const frame = (now: number): void => {
  if (!started) {
    // First frame only establishes the wall-clock baseline — no sub-steps.
    started = true
    last = now
  } else {
    const elapsed = (now - last) / 1000
    last = now
    acc = pumpFrame(
      acc,
      elapsed,
      () => ({ dir: currentDir() }),
      (input) => {
        if (game.phase === 'game-over') return
        const boardBefore = game.highScoreTable
        stepGame(game, input)
        // Voice this step's cues, then poll the ambient siren. Both run PER sub-
        // step (not per rAF): a catch-up frame may run several steps and each
        // clears `state.events`, so onEvents must consume them before the next.
        audio?.onEvents(game.events)
        audio?.onFrame(game)
        if (game.highScoreTable !== boardBefore) highScoreStorage.save(game.highScoreTable)
      },
    )
  }

  drawMaze(logicalCtx, game.pac.eaten)
  for (const id of ['blinky', 'pinky', 'inky', 'clyde'] as const) {
    if (game.house.released[id]) drawGhost(logicalCtx, game.ghosts[id], game.mode.frightenedTimer > 0 ? 'frightened' : 'chase')
  }
  drawPacman(logicalCtx, game.pac.actor.xPx, game.pac.actor.yPx, game.pac.actor.dir)
  if (game.fruit) drawFruit(logicalCtx, game.fruit.tile.x, game.fruit.tile.y)
  drawHud(logicalCtx, game.score, game.lives, game.level)

  const fit = fitIntegerScale(canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H, fit.dx, fit.dy, fit.width, fit.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
