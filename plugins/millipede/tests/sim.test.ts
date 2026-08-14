// tests/sim.test.ts
//
// Story ml7-2 — stepGame, the orchestrator. This pins the CORE playable loop and,
// crucially for ml6-2, that it EMITS the right events (a green audio test proves
// nothing if the sim never produces the event). Enemies/DDT/waves are wired in
// follow-up increments; this is the player↔millipede vertical + phase dispatch.

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { HEAD_COLOR } from '../src/core/millipede'
import { ddtVacant, ddtExploding, DDT_STAMP } from '../src/core/ddt'
import type { GameEventKind } from '../src/core/events'

const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const kinds = (g: GameState): GameEventKind[] => g.events.map((e) => e.type)

describe('ml7-2 stepGame — phase dispatch', () => {
  it('attract is SILENT (no events) and holds until start', () => {
    const g = createGame(0x1982)
    const after = stepGame(g, idle)
    expect(after.phase).toBe('attract')
    expect(after.events).toEqual([])
  })

  it('start in attract transitions to play', () => {
    const g = createGame(0x1982)
    const after = stepGame(g, { ...idle, start: true })
    expect(after.phase).toBe('play')
  })
})

describe('ml7-2 stepGame — play loop emits audio events', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('firing spawns a shot and emits shot-fired', () => {
    const g = play({ shot: { active: false, h: 0, v: 0 } })
    const after = stepGame(g, { ...idle, fire: true })
    expect(after.shot.active).toBe(true)
    expect(kinds(after)).toContain('shot-fired')
  })

  it('a shot reaching a segment kills it: segment-killed + score up', () => {
    const seg = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
    const g = play({
      segments: [seg],
      shot: { active: true, h: 0x80, v: 0x40 }, // already on the segment
    })
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('segment-killed')
    expect(after.score).toBeGreaterThan(g.score)
    expect(after.shot.active).toBe(false) // shot consumed
  })

  it('a segment on the player kills the player: player-died, lives--, phase death', () => {
    const onPlayer = { h: 0x80, v: 0x08, dh: 0, dv: 0, pic: 0, color: HEAD_COLOR }
    const g = play({ segments: [onPlayer] })
    // put the player exactly under the segment
    const g2 = { ...g, player: { ...g.player, h: 0x80, v: 0x08 } }
    const after = stepGame(g2, idle)
    expect(kinds(after)).toContain('player-died')
    expect(after.lives).toBe(g2.lives - 1)
    expect(after.phase).toBe('death')
  })

  const liveSpider = (h: number, v: number) => ({
    color: 0xb9,
    pic: 0x14,
    v,
    h,
    dv: 0,
    dh: 0,
    oldDh: 0,
    count2: 0,
    pts: 0,
  })

  it('shooting an enemy emits enemy-killed and scores', () => {
    const base = play()
    const g: GameState = {
      ...base,
      segments: [],
      roster: { ...base.roster, spiders: [liveSpider(0x80, 0x40)] },
      shot: { active: true, h: 0x80, v: 0x40 },
    }
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('enemy-killed')
    expect(after.score).toBeGreaterThan(g.score)
    expect(after.shot.active).toBe(false)
  })

  it('an enemy touching the player kills the player (phase → death)', () => {
    const base = play()
    const g: GameState = {
      ...base,
      segments: [],
      roster: { ...base.roster, spiders: [liveSpider(0x80, 0x08)] },
      player: { ...base.player, h: 0x80, v: 0x08 },
    }
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('player-died')
    expect(after.phase).toBe('death')
    expect(after.lives).toBe(g.lives - 1)
  })

  it('rebuilds the event stream every frame (no accumulation)', () => {
    const g = play({ shot: { active: false, h: 0, v: 0 } })
    const fired = stepGame(g, { ...idle, fire: true })
    expect(kinds(fired)).toContain('shot-fired')
    const next = stepGame(fired, idle) // no fire this frame
    expect(kinds(next)).not.toContain('shot-fired')
  })
})

describe('ml6-2 stepGame — DDT bombs are placed, shot, and animate', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('createGame places the four DDT bombs and stamps them into the field', () => {
    const g = createGame(0x1982)
    expect(g.ddt).toHaveLength(4)
    // The four DDTST words are all live (only word 11 of the attract set is vacant).
    expect(g.ddt.every((e) => !ddtVacant(e))).toBe(true)
    // The bombs are stamped into the field (DDT_STAMP at each entry's base cell).
    const stamped = g.ddt.filter((e) => field7(g.field, e) === DDT_STAMP)
    expect(stamped.length).toBe(4)
  })

  // Bomb 0 (DDTST 0x10CD) sits at field offset 0xCD; SHOTH=0xC7, SHOTV=0x66
  // is the hand-derived shot that lands on it (tests/shot.test.ts).
  it('a shot on a bomb detonates it: ddt-exploded, +80, entry now exploding', () => {
    const g = play({ shot: { active: true, h: 0xc7, v: 0x66 } })
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('ddt-exploded')
    expect(after.score).toBe(g.score + 80)
    expect(after.shot.active).toBe(false)
    expect(ddtExploding(after.ddt[0])).toBe(true)
  })

  it('an exploding bomb animates its cloud on FRAME & 7 == 0', () => {
    // Detonate on frame 1 (1 & 7 != 0) so the explosion machine does NOT step on
    // the detonation frame itself — isolating the animation that follows.
    let g = play({ shot: { active: true, h: 0xc7, v: 0x66 }, frame: 1 })
    g = stepGame(g, idle) // frame 1→2, bomb now exploding, not yet stepped
    expect(ddtExploding(g.ddt[0])).toBe(true)
    const hiBefore = g.ddt[0].hi
    // Step across the next FRAME&7==0 boundary (frame 8); the machine advances.
    for (let i = 0; i < 8; i++) g = stepGame(g, idle)
    expect(g.ddt[0].hi).not.toBe(hiBefore) // the cloud state stepped
  })
})

/** DDT entry's base-cell stamp (low 7 bits), for asserting the field stamp. */
function field7(field: Uint8Array, e: { lo: number; hi: number }): number {
  const offset = ((e.hi & 3) << 8) | e.lo
  return field[offset] & 0x7f
}

describe('ml6-2 stepGame — the wave loop (clear → DELAY → next wave)', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })
  const liveBeetle = { color: 0xb9, pic: 0x34, v: 0x40, h: 0x80, dv: 0, dh: 0, timer: 0 }

  it('clearing the millipede arms the inter-wave DELAY (MILLI.MAC:1912-1915)', () => {
    // No live segments and DELAY idle → the wave is won: arm 0x40, minus this
    // frame's own tick (CHKEND runs the same frame) → 0x3F.
    const g = play({ segments: [], delay: 0 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0x3f)
  })

  it('does NOT re-arm while a DELAY is already counting (edge-only)', () => {
    const g = play({ segments: [], delay: 0x20 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0x1f) // just ticked down, not re-armed to 0x40
  })

  it('when DELAY reaches 0 a fresh millipede marches in and the wave advances', () => {
    const g = play({ segments: [], delay: 1, wave: 0 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0)
    expect(after.segments.some((s) => s.color !== 0)).toBe(true) // a new train
    expect(after.wave).toBe(1)
    expect(kinds(after)).toContain('march-start') // the audible wave transition
  })

  it('holds the countdown while beetles are still present (MLSUB.MAC:56)', () => {
    const base = play({ segments: [], delay: 5 })
    const g: GameState = { ...base, roster: { ...base.roster, beetles: [liveBeetle] } }
    const after = stepGame(g, idle)
    expect(after.delay).toBe(5) // held, no decrement
  })
})

describe('ml6-2 stepGame — bonus life at score thresholds (SCORNG tail)', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('createGame seeds the first bonus threshold at 12,000 (bonusL/bonusM)', () => {
    const g = createGame(0x1982)
    // BONUS_INCREMENTS[0] = 0x0120 = BCD 1·20·00 → 12,000 (bonus.ts).
    expect(g.bonusL).toBe(0x20)
    expect(g.bonusM).toBe(0x01)
  })

  it('crossing 12,000 awards a life and emits bonus-life (CHAN11)', () => {
    // Score just under 12,000; a DDT hit (+80) crosses into the [12000,21999]
    // band comparator window, awarding the extra life.
    const g = play({ score: 11990, lives: 3, shot: { active: true, h: 0xc7, v: 0x66 } })
    const after = stepGame(g, idle)
    expect(after.score).toBe(12070) // 11990 + 80 (DDT)
    expect(after.lives).toBe(4)
    expect(kinds(after)).toContain('bonus-life')
    // The threshold advanced past the window (no re-fire next frame).
    expect(after.bonusM).toBe(0x02) // 12,000 → 24,000
  })

  it('a score award that does NOT cross the threshold awards no life', () => {
    const g = play({ score: 100, lives: 3, shot: { active: true, h: 0xc7, v: 0x66 } })
    const after = stepGame(g, idle)
    expect(after.lives).toBe(3)
    expect(kinds(after)).not.toContain('bonus-life')
  })
})

describe('ml6-2 stepGame — the player cannot walk through mushrooms (MOVE OBSTAC)', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })
  // Player at H=0x87 stepping +4 (dh=8 → tblmt +4) reaches H=0x8B, which crosses
  // into a new 8px column: obstacOffset(0x8B, 0x28, 0) = 0x1A5. The starting cell
  // (0x87,0x28) = 0x1C5 is a different column, so only the target is planted.
  const START = { h: 0x87, v: 0x28, hl: 0, vl: 0, alive: true }

  it('a mushroom in the target cell blocks the move (MILLI.MAC:1662-1668)', () => {
    const field = new Uint8Array(0x3c0)
    field[0x1a5] = 0x7f // FULL_MUSHROOM in the cell the player would step into
    const g = play({ field, player: { ...START } })
    const after = stepGame(g, { ...idle, dh: 8 })
    expect(after.player.h).toBe(0x87) // blocked — did not advance to 0x8B
  })

  it('control: with a clear field the same input advances the player to 0x8B', () => {
    const g = play({ field: new Uint8Array(0x3c0), player: { ...START } })
    const after = stepGame(g, { ...idle, dh: 8 })
    expect(after.player.h).toBe(0x8b) // moved +4
  })
})

describe('ml6-2 stepGame — game-over holds then times out to attract', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it("losing the last life enters game-over and arms the 0x80 GAME OVER hold", () => {
    const onPlayer = { h: 0x80, v: 0x08, dh: 0, dv: 0, pic: 0, color: HEAD_COLOR }
    const g = play({ segments: [onPlayer], lives: 1, player: { ...createGame(0).player, h: 0x80, v: 0x08 } })
    const after = stepGame(g, idle)
    expect(after.phase).toBe('game-over') // no lives left → straight to game-over
    expect(after.lives).toBe(0)
    expect(after.delay).toBe(0x80) // MLSUB.MAC:162 LDA I,80 / STA DELAY
  })

  it('game-over does not advance while the hold counts down', () => {
    const g = createGame(0x1982, { phase: 'game-over' })
    const after = stepGame({ ...g, delay: 0x40 }, idle)
    expect(after.phase).toBe('game-over')
    expect(after.delay).toBe(0x3f) // ticking down, still held
  })

  it('when the hold reaches 0 it returns to a FRESH attract world (score reset)', () => {
    const g = createGame(0x1982, { phase: 'game-over' })
    const after = stepGame({ ...g, delay: 1, score: 99999, lives: 0 }, idle)
    expect(after.phase).toBe('attract')
    expect(after.score).toBe(0) // a brand-new game
    expect(after.lives).toBe(3)
  })
})

describe('ml6-2 stepGame — between-wave CONWAY mushroom growth', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('CONWAY is idle during boot/normal play', () => {
    expect(createGame(0x1982).conway.active).toBe(false)
  })

  it('clearing the millipede starts CONWAY (INICON, MILLI.MAC:1913-1914)', () => {
    const g = play({ segments: [], delay: 0 })
    const after = stepGame(g, idle)
    expect(after.conway.active).toBe(true)
  })

  it('CONWAY is driven each frame (MASTER, MILLI.MAC:47-49) and terminates on its own', () => {
    // An empty field has nothing to grow, so the process ends quickly (CW-24/25).
    let g = play({ segments: [], delay: 0, field: new Uint8Array(0x3c0) })
    g = stepGame(g, idle)
    expect(g.conway.active).toBe(true)
    for (let i = 0; i < 200 && g.phase === 'play' && g.conway.active; i++) g = stepGame(g, idle)
    expect(g.conway.active).toBe(false) // TIMER RAN OUT, END CONWAY (CW-25)
  })
})
