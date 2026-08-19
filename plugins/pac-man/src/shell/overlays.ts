// src/shell/overlays.ts
//
// Story pm3-7 — the presentation-overlay DRIVER: mirrors `createAudioDriver`
// (audio.ts, pm2-3) exactly in shape — a stateful factory that subscribes to
// the SAME `events.ts` seam the audio driver reads and turns each `GameEvent`
// into a latched visual overlay, painted on top of the playfield each frame.
// Where the audio driver maps an event to a WSG voice call, this module maps
// an event to a bounded on-screen state: a ghost/fruit-eaten score popup
// (`drawScorePopup`, pm3-6/pm3-7) and the READY!/GAME OVER banners. (pm4-1
// removed the level-clear flash for photosensitivity safety — see the note by
// POPUP_FRAMES; the authentic level-clear pause is core work in pm4-7.) All
// timing is FRAME-COUNT — `onEvents` only
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
import { LOGICAL_W } from './layout'
import { drawScorePopup, drawCutscene } from './render'

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
// pm4-1 [SAFETY]: the level-clear effect used to be a full-screen white strobe
// (fillRect over the whole logical buffer, ~3.75 Hz for 96 frames) painted over
// live play. The boss has photosensitive epilepsy, so it is removed outright —
// the overlay no longer reacts to `level-cleared`. The authentic level-clear
// pause (a sim freeze, no strobe) lands in core in pm4-7.

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
  let banner: 'game-over' | null = null
  let readyCleared = false
  // pm3-7 review fix (CRITICAL 2): `overlays` is constructed ONCE in main.ts
  // and outlives every individual GameState — main.ts builds a fresh GameState
  // on Enter-after-game-over, but never a fresh Overlays, so without this the
  // GAME OVER banner would latch forever and READY! would never return.
  // `createAudioDriver` (audio.ts) self-heals the same way, polling `state.phase`
  // every `onFrame` rather than relying on a dedicated "new game" event
  // (`events.ts` has none). pm4-6 UPDATE: since the cabinet now boots into
  // 'attract' (createGameState), a restart flips 'game-over' -> 'attract', not
  // -> 'playing'. So the un-latch fires on 'game-over' -> ANY other phase — a
  // fresh game never starts already in 'game-over', so that edge is still an
  // unambiguous "new game" signal, read entirely from the GameState passed in.
  let prevPhase: GameState['phase'] | null = null

  function resetForNewGame(): void {
    queued.length = 0
    active = []
    banner = null
    readyCleared = false
  }

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
        case 'game-over':
          banner = 'game-over'
          break
        // level-cleared/energizer-eaten/fruit-spawned/fruit-expired/pac-died/
        // extra-life have no overlay: score/lives render
        // every frame via drawHud, and the level-clear pause (a sim freeze, no
        // strobe) is core work in pm4-7 — see the pm4-1 note by POPUP_FRAMES.
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
    if (prevPhase === 'game-over' && game.phase !== 'game-over') {
      resetForNewGame()
    }
    prevPhase = game.phase

    // Resolve this frame's newly-queued popups against the live GameState,
    // then drop them into the countdown list.
    for (const popup of queued) {
      const { xPx, yPx } = resolvePopupPosition(popup, game)
      active.push({ xPx, yPx, points: popup.points, framesLeft: POPUP_FRAMES })
    }
    queued.length = 0

    for (const popup of active) {
      drawScorePopup(ctx, popup.xPx, popup.yPx, popup.points)
      popup.framesLeft--
    }
    active = active.filter((popup) => popup.framesLeft > 0)

    // pm4-9: while the pm4-8 demo plays itself in attract, paint the cabinet's
    // attract screen on top of it (never READY! — that belongs to the pre-play
    // 'ready' phase). Everywhere else keep the pm3-7/pm4-6 banner behaviour.
    if (game.phase === 'attract') {
      drawAttractScreen(ctx)
    } else if (game.phase === 'intermission') {
      // pm6-5: the between-level coffee break. main.ts has cleared the field, so the
      // scripted actors (pm6-2/pm6-3) play on black here — and NOT the READY! banner.
      // A forced-null break (the pm6-2 no-cutscene path) simply draws nothing.
      if (game.cutscene) drawCutscene(ctx, game.cutscene)
    } else if (banner === 'game-over') {
      drawBanner(ctx, 'GAME OVER')
    } else if (!readyCleared) {
      drawBanner(ctx, 'READY!')
    }
  }

  return { onEvents, draw }
}

// pm4-9: the attract-only prompt, painted over the pm4-8 self-playing demo while
// `phase === 'attract'`. ROM-authentic text from Pac-Man's attract string-pointer
// table: "PUSH START BUTTON" (pacman.asm:36b3), sitting in the play area the way the
// cabinet shows it. The HIGH SCORE readout is NOT here — it is a permanent HUD element
// (drawHud, top-centre, all phases), so this draws only the attract-specific prompt.
//
// pm4-1 [SAFETY]: plain `fillText` only — never a `fillRect` over the buffer. The
// boss has photosensitive epilepsy, so the attract screen must never full-screen
// flash. The prompt is drawn steadily (no blink) — the authentic blink is optional
// and deliberately omitted as the simplest non-flashing render.
function drawAttractScreen(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BANNER_COLOR
  ctx.font = '8px monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText('PUSH START BUTTON', LOGICAL_W / 2, 180) // pacman.asm:36b3
  ctx.textAlign = 'start'
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
  ctx.fillText(text, LOGICAL_W / 2, 164) // centred over the playfield, just above the ghost house
  ctx.textAlign = 'start'
}
