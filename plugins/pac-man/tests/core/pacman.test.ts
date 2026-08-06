// tests/core/pacman.test.ts
//
// Story pm1-4 (RED, TEA) — Pac-Man's movement, written BEFORE src/core/actor.ts
// and src/core/pacman.ts exist. Per glossary.md §Speeds/§Movement: level-1
// Pac-Man speed is 80% (Pac-Man Dossier Table A.1), realized as a per-frame
// move/skip pattern (no floats); a queued turn latches at the next GRID-ALIGNED
// tile, rejected if that tile is a wall; eating a dot pauses movement 1 frame,
// an energizer 3 frames (Pac-Man Dossier: "stops moving for one frame" / "three
// frames"). Every maze coordinate below is checked against the real
// pm1-3 maze table via tileAt/isWalkable, never assumed.

import { describe, it, expect } from 'vitest'
import { tileAt, isWalkable, TUNNEL_ROW, ENERGIZER_TILES } from '../../src/core/maze'
import { TILE_PX, speedPattern, type Dir } from '../../src/core/actor'
import { createPacmanState, stepPacman, EAT_PAUSE_DOT, EAT_PAUSE_ENERGIZER } from '../../src/core/pacman'

describe('speedPattern (glossary.md §Speeds — no floats, a repeating move/skip cycle)', () => {
  it('80% (Pac-Man level-1 speed, Pac-Man Dossier Table A.1) moves 4 of every 5 frames', () => {
    const pattern = speedPattern(80)
    expect(pattern).toHaveLength(5)
    expect(pattern.filter(Boolean)).toHaveLength(4)
  })

  it('100% moves every frame', () => {
    expect(speedPattern(100)).toEqual([true])
  })

  it('50% alternates move/skip', () => {
    expect(speedPattern(50)).toEqual([false, true])
  })

  it('rejects a non-integer or out-of-range percentage', () => {
    expect(() => speedPattern(0)).toThrow()
    expect(() => speedPattern(101)).toThrow()
    expect(() => speedPattern(33.5)).toThrow()
  })
})

describe('stepPacman — level-1 (80%) speed advances the cited pixel count over N frames', () => {
  it('advances exactly 4px over 5 frames on a clear straight run (tunnel row, no dots)', () => {
    // The tunnel row (maze.ts TUNNEL_ROW) is bare path ('T   ...   T') —
    // confirmed here, not assumed, so this test cannot silently drift onto a
    // dot tile and pick up an unplanned eat-pause.
    const startTx = 5
    expect(tileAt(startTx, TUNNEL_ROW)).toBe('path')
    for (let tx = startTx; tx <= startTx + 5; tx++) {
      expect(tileAt(tx, TUNNEL_ROW), `(${tx},${TUNNEL_ROW}) must be clear path for this test`).toBe('path')
    }

    const state = createPacmanState(startTx, TUNNEL_ROW, 'right', 80)
    const startXPx = state.actor.xPx

    for (let i = 0; i < 5; i++) stepPacman(state, { dir: 'none' })

    // speedPattern(80) === [false, true, true, true, true]: the first frame
    // is a skip, the remaining four move — 4px over 5 frames, matching the
    // Dossier's 80% figure by construction (glossary.md §Speeds).
    expect(state.actor.xPx - startXPx).toBe(4)
    expect(state.actor.yPx).toBe(TUNNEL_ROW * TILE_PX)
    expect(state.pauseFrames).toBe(0) // no dot on this row to interrupt the count
  })

  it('100% speed advances exactly 1px per frame', () => {
    const startTx = 5
    const state = createPacmanState(startTx, TUNNEL_ROW, 'right', 100)
    const startXPx = state.actor.xPx
    for (let i = 0; i < 3; i++) stepPacman(state, { dir: 'none' })
    expect(state.actor.xPx - startXPx).toBe(3)
  })
})

describe('stepPacman — cornering: a queued turn latches at the next open tile, rejected into a wall', () => {
  // Column 1 (global rows 4-7 — row 0-3 and 32-35 are the reserved HUD band,
  // maze.ts's own comment) is a real vertical dot/energizer corridor —
  // confirmed against the maze table, not assumed:
  //   (1,4) dot   (1,5) dot   (1,6) energizer   (1,7) dot
  // (2,4) is a real horizontal dot tile, but (2,5) — one tile below it — is a
  // wall: the corridor only opens at column 1, not column 2. That makes
  // (2,4)->(1,4) the exact "queued turn rejected here, opens one tile later"
  // scenario the brief asks for, using only real maze geometry.
  it('maze fixture sanity: the corridor this test relies on is real', () => {
    expect(tileAt(2, 4)).toBe('dot')
    expect(isWalkable(2, 5, 'pac-man'), '(2,5) must be a wall for the reject-then-open scenario').toBe(false)
    expect(tileAt(1, 4)).toBe('dot')
    expect(isWalkable(1, 5, 'pac-man'), '(1,5) must be open for the corner to succeed one tile later').toBe(true)
  })

  it('rejects a turn into a wall, keeping the queued direction pending', () => {
    const state = createPacmanState(2, 4, 'left', 100) // 100%: 1px/frame, deterministic
    stepPacman(state, { dir: 'down' }) // (2,5) is a wall: 'down' latches but cannot apply here
    expect(state.actor.pending).toBe('down')
    expect(state.actor.dir, 'the rejected turn must not change dir').toBe('left')
    expect(state.actor.xPx).toBe(2 * TILE_PX - 1) // still moved 1px in the ORIGINAL direction
  })

  it('a rejected turn latches and opens automatically once a walkable tile is reached, ' +
    'and the dot crossed along the way pauses Pac-Man exactly 1 frame', () => {
    const state = createPacmanState(2, 4, 'left', 100)

    stepPacman(state, { dir: 'down' }) // frame 1: rejected at (2,4); moves left to xPx=15
    expect(state.actor.dir).toBe('left')
    expect(state.actor.xPx).toBe(15)

    // Frames 2-8: seven more 1px moves left, 15 -> 8 (tile (1,4)). No new
    // input — the joystick is still held toward 'down' in spirit, but a real
    // controller re-reports 'none' between discrete pushes; `pending` is
    // already latched from frame 1 and must survive un-touched.
    for (let i = 0; i < 7; i++) stepPacman(state, { dir: 'none' })

    // Arriving at (1,4) (a real dot tile) triggers the 1-frame eat-pause —
    // dir has NOT yet cornered (the corner check runs at the START of a
    // call, using the position as of the PREVIOUS frame's end).
    expect(state.actor.xPx).toBe(1 * TILE_PX)
    expect(state.actor.yPx).toBe(4 * TILE_PX)
    expect(state.actor.dir, 'corner has not been evaluated yet this call').toBe('left')
    expect(state.pauseFrames).toBe(EAT_PAUSE_DOT)
    expect(state.eaten.has('1,4')).toBe(true)

    stepPacman(state, { dir: 'none' }) // frame 9: eat-pause counts down, no movement, no corner
    expect(state.pauseFrames).toBe(0)
    expect(state.actor.dir).toBe('left')
    expect(state.actor.xPx).toBe(1 * TILE_PX)

    stepPacman(state, { dir: 'none' }) // frame 10: pause clear — the queued 'down' finally opens
    expect(state.actor.dir).toBe('down')
    expect(state.actor.yPx).toBe(4 * TILE_PX + 1)
  })
})

describe('stepPacman — eat-pause (Pac-Man Dossier: 1 frame/dot, 3 frames/energizer)', () => {
  it('eating an energizer pauses movement for 3 frames', () => {
    // (1,5) dot -> (1,6) energizer, a real one-tile hop straight down.
    expect(tileAt(1, 6)).toBe('energizer')
    expect(ENERGIZER_TILES.some((t) => t.x === 1 && t.y === 6)).toBe(true)

    const state = createPacmanState(1, 5, 'down', 100)
    for (let i = 0; i < TILE_PX; i++) stepPacman(state, { dir: 'none' })

    expect(state.actor.yPx).toBe(6 * TILE_PX)
    expect(state.pauseFrames).toBe(EAT_PAUSE_ENERGIZER)
    expect(state.eaten.has('1,6')).toBe(true)

    // Three full frames of no movement, then free again.
    for (let i = 0; i < EAT_PAUSE_ENERGIZER; i++) {
      stepPacman(state, { dir: 'none' })
      expect(state.actor.yPx, `frame ${i}: still paused`).toBe(6 * TILE_PX)
    }
    expect(state.pauseFrames).toBe(0)

    stepPacman(state, { dir: 'none' })
    expect(state.actor.yPx, 'movement resumes once the pause has fully counted down').toBe(6 * TILE_PX + 1)
  })

  it('re-crossing an already-eaten tile does not re-trigger the pause', () => {
    const state = createPacmanState(1, 4, 'down', 100)
    for (let i = 0; i < TILE_PX; i++) stepPacman(state, { dir: 'none' }) // eats (1,5)
    expect(state.pauseFrames).toBe(EAT_PAUSE_DOT)
    state.eaten.add('1,4') // pretend the tile behind us was already eaten too

    for (let i = 0; i < EAT_PAUSE_DOT; i++) stepPacman(state, { dir: 'none' }) // count down the pause
    expect(state.pauseFrames).toBe(0)

    const input: { dir: Dir } = { dir: 'up' }
    stepPacman(state, input) // turn back up toward the already-eaten (1,4); moves 1px this same call
    for (let i = 0; i < TILE_PX - 1; i++) stepPacman(state, { dir: 'none' })

    expect(state.actor.yPx).toBe(4 * TILE_PX)
    expect(state.pauseFrames, 'an already-eaten tile must never re-pause Pac-Man').toBe(0)
  })
})
