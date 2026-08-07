// src/shell/overlays.ts
//
// Story pm3-7 — the presentation-overlay DRIVER: mirrors `createAudioDriver`
// (audio.ts, pm2-3) exactly in shape — a stateful factory that subscribes to
// the SAME `events.ts` seam the audio driver reads and turns each `GameEvent`
// into a latched visual overlay, painted on top of the playfield each frame.
// Where the audio driver maps an event to a WSG voice call, this module maps
// an event to a bounded on-screen state: a ghost/fruit-eaten score popup
// (`drawScoreSprite`, pm3-6), a level-clear flash over the maze, and the
// READY!/GAME OVER banners. All timing is FRAME-COUNT — `onEvents` only
// latches state, `draw` is the sole place a counter is ever decremented —
// there is no Date/performance/requestAnimationFrame read anywhere in this
// file (the same core-purity spirit `render.ts` already follows: a pure
// function of its arguments plus its own prior-frame counters).
//
// Position is the one piece an event alone can't supply — `GhostEatenEvent`/
// `FruitEatenEvent` carry no coordinate (events.ts's header: "no per-frame
// position events, a shell can already read GameState directly for that").
// So `onEvents` only queues the popup's VALUE; `draw` resolves its pixel
// position from the `GameState` it is handed (the eaten ghost's current
// actor position, or the fruit tile) the first time that popup is painted,
// then counts it down like every other overlay.

import type { GameEvent } from '../core/events'
import type { GameState } from '../core/game'
import { TILE_PX } from '../core/actor'
import { drawScoreSprite } from './render'

export interface Overlays {
  /** Voice one frame's worth of gameplay events (the `events.ts` seam) —
   *  same seam and same per-substep call site as `AudioDriver.onEvents`. */
  onEvents(events: readonly GameEvent[]): void
  /** Paint this frame's overlays into `ctx`, decrementing every latched
   *  timer by exactly one call — the sole clock this driver has. */
  draw(ctx: CanvasRenderingContext2D, game: GameState): void
}

// A ghost-chain popup ("200"/"400"/.../"1600", pm3-6's SCORE_SPRITE) stays on
// screen for a bounded window — authored, not ROM-cited (this cabinet's
// overlay TIMING is explicitly a shell presentation choice, same posture as
// main.ts's own FLASH_HALF_PERIOD comment), chosen only to be clearly
// readable at 60fps without lingering into the next moment of play.
const POPUP_FRAMES = 45
// The level-clear flash: the maze alternates between its normal look and a
// bright flash colour a handful of times before the next level's fresh maze
// draws over it — same authored-timing posture as POPUP_FRAMES.
const FLASH_HALF_PERIOD = 8
const FLASH_CYCLES = 6
const FLASH_FRAMES = FLASH_HALF_PERIOD * 2 * FLASH_CYCLES
const FLASH_COLOR = '#ffffff'

const BANNER_COLOR = '#ffff00'

interface ActivePopup {
  readonly xPx: number
  readonly yPx: number
  readonly points: number
  framesLeft: number
}

type QueuedPopup =
  | { readonly kind: 'ghost'; readonly ghost: 'blinky' | 'pinky' | 'inky' | 'clyde'; readonly points: number }
  | { readonly kind: 'fruit'; readonly points: number }

export function createOverlays(): Overlays {
  const queued: QueuedPopup[] = []
  let active: ActivePopup[] = []
  let flashFramesLeft = 0
  let banner: 'game-over' | null = null
  let readyCleared = false

  function onEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'dot-eaten':
          readyCleared = true
          break
        case 'ghost-eaten':
          queued.push({ kind: 'ghost', ghost: event.ghost, points: event.score })
          break
        case 'fruit-eaten':
          queued.push({ kind: 'fruit', points: event.points })
          break
        case 'level-cleared':
          flashFramesLeft = FLASH_FRAMES
          break
        case 'game-over':
          banner = 'game-over'
          break
        // energizer-eaten/fruit-spawned/fruit-expired/pac-died/extra-life/
        // high-score-qualified have no overlay in this story's scope (score/
        // lives already render every frame via drawHud; a future story can
        // layer a pause/flash on pac-died if the brief ever asks for one).
        default:
          break
      }
    }
  }

  function resolvePopupPosition(popup: QueuedPopup, game: GameState): { xPx: number; yPx: number } {
    if (popup.kind === 'ghost') {
      const ghost = game.ghosts[popup.ghost]
      return { xPx: ghost.actor.xPx, yPx: ghost.actor.yPx }
    }
    if (game.fruit) {
      return { xPx: game.fruit.tile.x * TILE_PX, yPx: game.fruit.tile.y * TILE_PX }
    }
    // The fruit already despawned by the time this popup resolves (rare —
    // eaten this same frame, but a caught-up multi-substep frame could in
    // principle drain it first) — fall back to Pac-Man's own position so the
    // popup still reads as "near the action" rather than at the origin.
    return { xPx: game.pac.actor.xPx, yPx: game.pac.actor.yPx }
  }

  function draw(ctx: CanvasRenderingContext2D, game: GameState): void {
    // Resolve this frame's newly-queued popups against the live GameState,
    // then drop them into the countdown list.
    for (const popup of queued) {
      const { xPx, yPx } = resolvePopupPosition(popup, game)
      active.push({ xPx, yPx, points: popup.points, framesLeft: POPUP_FRAMES })
    }
    queued.length = 0

    for (const popup of active) {
      drawScoreSprite(ctx, popup.xPx, popup.yPx, popup.points)
      popup.framesLeft--
    }
    active = active.filter((popup) => popup.framesLeft > 0)

    if (flashFramesLeft > 0) {
      const cycle = Math.floor(flashFramesLeft / FLASH_HALF_PERIOD) % 2
      if (cycle === 0) {
        ctx.fillStyle = FLASH_COLOR
        ctx.fillRect(0, 0, 224, 288)
      }
      flashFramesLeft--
    }

    if (banner === 'game-over') {
      drawBanner(ctx, 'GAME OVER')
    } else if (!readyCleared) {
      drawBanner(ctx, 'READY!')
    }
  }

  return { onEvents, draw }
}

/** Centred banner text over the 224x288 logical playfield — same plain
 *  `fillText` approach `drawHud` already uses for the score/lives/level
 *  strip (render.ts), not a sprite (no glyph-ROM banner art in this task's
 *  scope). */
function drawBanner(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = BANNER_COLOR
  ctx.font = '8px monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, 112, 164) // centred over the playfield, just above the ghost house
  ctx.textAlign = 'start'
}
