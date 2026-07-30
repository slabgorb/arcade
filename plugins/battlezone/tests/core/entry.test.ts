// tests/core/entry.test.ts
//
// SH2-13 RED — battlezone gains a REAL high-score name-entry screen. bz1-10
// descoped it: today `returnToAttract` (src/core/sim.ts) silently inserts
// DEFAULT_INITIALS 'AAA' at the gameover->attract transition — the exact
// "candidate follow-up" its Reviewer filed, which this story supersedes.
//
// TEA decisions pinned here (battlezone's NUMBERS, logged as deviations in
// .session/SH2-13-session.md):
//  - Mode gains 'entry': when the GAME_OVER_SECONDS card expires, a QUALIFYING
//    score routes gameover -> 'entry' (empty buffer, nothing inserted yet); a
//    non-qualifying score routes -> 'attract' exactly as today (the framing
//    boundary test survives untouched — a scoreless run never sees the screen).
//  - GameState gains `entry: { initials: string } | null` (null outside 'entry').
//  - enterInitial(state, key): the typed-entry event function (asteroids
//    pattern; the shell calls it per keydown): A-Z appends UPPERCASED up to 3,
//    'Backspace' deletes (never past empty), other keys inert; inert outside
//    'entry' mode. Delegates to the shared reducer (@shared/name-entry).
//  - CONFIRM: battlezone's existing confirm — the shell-latched one-shot
//    `input.start` — commits when all 3 initials are typed: insert
//    { name: <typed>, score } and return to attract. With an incomplete buffer
//    start is INERT (a stray latched press on arrival cannot skip or commit —
//    the held-fire 'AAA' regression class, AC-4).
//  - TIMEOUT: authentic cabinets auto-cycle (the bz1-10 TEA bound: back to
//    attract within 30 simulated seconds of NO input, entry sub-state
//    included). On expiry the CURRENT buffer commits verbatim — the recorded
//    name is exactly what the player typed ('' if nothing), NEVER an
//    auto-tagged constant. The entry timeout magnitude is Dev's per-cabinet
//    number; only the 30 s outer bound is pinned.
//  - core/screens.ts gains entryLines(initials) — the entry screen is core
//    data like every other battlezone screen (attractLines/gameOverLines).
//
// Pre-GREEN this file is RED on assertions: 'entry' mode does not exist (the
// card expiry auto-tags 'AAA' and lands on attract), and enterInitial /
// entryLines are absent (read through loose module views).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initGame, type GameState } from '../../src/core/state'
import * as simModule from '../../src/core/sim'
import * as screensModule from '../../src/core/screens'
import { NO_INPUT, type Input } from '../../src/core/input'
import { MESSAGES } from '../../src/core/text'

const { stepGame, GAME_OVER_SECONDS } = simModule
const enterInitial = (
  simModule as unknown as { enterInitial?: (s: GameState, key: string) => GameState }
).enterInitial
const entryLines = (
  screensModule as unknown as { entryLines?: (initials: string) => readonly string[] }
).entryLines

const DT = 1 / 60
const START: Input = { ...NO_INPUT, start: true }

const modeOf = (s: GameState): string => (s as unknown as { mode: string }).mode
const entryOf = (s: GameState): { initials: string } | null =>
  (s as unknown as { entry: { initials: string } | null }).entry

const step = (s: GameState, input: Input = NO_INPUT) => stepGame(s, input, DT)
const run = (s: GameState, frames: number, input: Input = NO_INPUT): GameState => {
  let out = s
  for (let i = 0; i < frames; i++) out = stepGame(out, input, DT)
  return out
}
const pulseStart = (s: GameState) => stepGame(s, START, DT)

/** Park an inbound enemy shell on the player so the next step kills (the
 *  framing.test.ts helper, kept in lockstep). */
function withInboundEnemyShell(s: GameState): GameState {
  return {
    ...s,
    enemies: {
      ...s.enemies,
      shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 },
    },
  }
}
const die = (s: GameState) => step(withInboundEnemyShell(s))

/** A QUALIFYING run dead on the game-over card: last tank, score 3000. */
function qualifyingGameOver(seed = 7): GameState {
  const playing = pulseStart(initGame(seed))
  const lastTank: GameState = { ...playing, lives: 1, score: 3000 }
  const over = die(lastTank)
  expect(modeOf(over)).toBe('gameover')
  return over
}

/** Ride the game-over card to its expiry and land on the entry screen. */
function reachEntry(seed = 7): GameState {
  const s = run(qualifyingGameOver(seed), Math.ceil((GAME_OVER_SECONDS + 0.4) * 60))
  expect(modeOf(s), 'a qualifying score must reach the entry screen').toBe('entry')
  return s
}

const typeAll = (s: GameState, keys: string[]): GameState =>
  keys.reduce((acc, k) => enterInitial!(acc, k), s)

// ---- the new surface exists ---------------------------------------------------

describe('typed entry — the core surface exists', () => {
  it('sim.ts exports enterInitial(state, key)', () => {
    expect(typeof enterInitial).toBe('function')
  })

  it('screens.ts exports entryLines(initials)', () => {
    expect(typeof entryLines).toBe('function')
  })
})

// ---- routing into the entry screen ----------------------------------------------

describe('gameover card expiry routes by qualification', () => {
  it('a QUALIFYING score lands on the entry screen with an empty buffer, nothing inserted', () => {
    const s = reachEntry()
    expect(entryOf(s)).toEqual({ initials: '' })
    expect(s.highScores).toHaveLength(0) // no auto-tag on arrival
  })

  it('a SCORELESS run never sees the entry screen (straight to attract, as today)', () => {
    const over = die({ ...pulseStart(initGame(7)), lives: 1 }) // score 0
    let cur = over
    for (let i = 0; i < 30 * 60 && modeOf(cur) !== 'attract'; i++) {
      cur = step(cur)
      expect(modeOf(cur)).not.toBe('entry')
    }
    expect(modeOf(cur)).toBe('attract')
    expect(cur.highScores).toHaveLength(0) // non-positive never qualifies
  })
})

// ---- typing (the shared verb, battlezone numbers) --------------------------------

describe('enterInitial — typing fills the buffer (uppercased, capped at 3)', () => {
  it('appends lowercase keydowns UPPERCASED, in typing order', () => {
    const s = typeAll(reachEntry(), ['b', 'o', 'b'])
    expect(entryOf(s)?.initials).toBe('BOB')
  })

  it('ignores a 4th letter (3-char arcade convention)', () => {
    const s = typeAll(reachEntry(), ['b', 'o', 'b', 'x'])
    expect(entryOf(s)?.initials).toBe('BOB')
  })

  it('ignores non-letter keys', () => {
    const s = reachEntry()
    for (const key of ['5', ' ', 'Enter', 'ArrowUp', 'Escape', 'ab', '']) {
      expect(entryOf(enterInitial!(s, key)), `key ${JSON.stringify(key)}`).toEqual({ initials: '' })
    }
  })

  it('is inert outside entry mode (attract, playing, gameover)', () => {
    const attract = initGame(7)
    expect(enterInitial!(attract, 'a')).toEqual(attract)
    const playing = pulseStart(initGame(7))
    expect(enterInitial!(playing, 'a')).toEqual(playing)
    const over = qualifyingGameOver()
    expect(enterInitial!(over, 'a')).toEqual(over)
  })
})

describe('enterInitial — Backspace (AC-2)', () => {
  it('deletes the last typed initial', () => {
    const s = enterInitial!(typeAll(reachEntry(), ['b', 'o']), 'Backspace')
    expect(entryOf(s)?.initials).toBe('B')
  })

  it('cannot delete past an empty buffer', () => {
    const s = enterInitial!(reachEntry(), 'Backspace')
    expect(entryOf(s)?.initials).toBe('')
    expect(modeOf(s)).toBe('entry') // still entering
  })

  it('corrects a full-buffer typo: delete then retype', () => {
    const typo = typeAll(reachEntry(), ['b', 'o', 'x'])
    const fixed = enterInitial!(enterInitial!(typo, 'Backspace'), 'b')
    expect(entryOf(fixed)?.initials).toBe('BOB')
  })
})

// ---- confirm + the death of the 'AAA' auto-tag (AC-1 / AC-4) ----------------------

describe('start commits the COMPLETED buffer; the auto-tag constant is dead', () => {
  it('start with all 3 typed inserts the TYPED name and returns to attract', () => {
    const ready = typeAll(reachEntry(), ['b', 'o', 'b'])
    const s = step(ready, START)
    expect(modeOf(s)).toBe('attract')
    expect(entryOf(s)).toBeNull()
    expect(s.highScores).toHaveLength(1)
    expect(s.highScores[0]).toMatchObject({ name: 'BOB', score: 3000 })
  })

  it('a latched start on ARRIVAL with an empty buffer neither commits nor skips (AC-4)', () => {
    // The shell latch can deliver a start edge on the very frame the entry
    // screen appears (the press that happened during the card). It must not
    // auto-fill anything — that is the bz1-10 'AAA' regression class.
    let s = step(reachEntry(), START)
    expect(modeOf(s)).toBe('entry')
    expect(s.highScores).toHaveLength(0)
    s = run(s, 30, START) // even a machine-gunned latch stays inert while incomplete
    expect(modeOf(s)).toBe('entry')
    expect(s.highScores).toHaveLength(0)
  })

  it("the recorded name is NEVER the retired 'AAA' constant unless the player types it", () => {
    const ready = typeAll(reachEntry(), ['k', 'a', 'v'])
    const s = step(ready, START)
    expect(s.highScores.map((e) => e.name)).toEqual(['KAV'])
  })
})

describe('the entry screen times out — the cabinet still cycles itself (bz1-10 bound)', () => {
  it('under NO input the run returns to attract within 30 s and the score is recorded', () => {
    let cur = qualifyingGameOver()
    for (let i = 0; i < 30 * 60 && modeOf(cur) !== 'attract'; i++) cur = step(cur)
    expect(modeOf(cur), 'the run loop must return to attract by itself').toBe('attract')
    expect(cur.highScores).toHaveLength(1)
    expect(cur.highScores[0].score).toBe(3000)
    // The lobby contract holds; the name is whatever was typed — here, nothing.
    expect(typeof cur.highScores[0].name).toBe('string')
    expect(cur.highScores[0].name).toBe('') // verbatim buffer, NOT an auto-tag
  })

  it('a PARTIAL buffer commits verbatim on timeout', () => {
    let cur = typeAll(reachEntry(), ['b', 'o'])
    for (let i = 0; i < 30 * 60 && modeOf(cur) !== 'attract'; i++) cur = step(cur)
    expect(modeOf(cur)).toBe('attract')
    expect(cur.highScores.map((e) => e.name)).toEqual(['BO'])
  })

  it('dt = 0 never creeps the entry timeout (the main.ts first-frame contract)', () => {
    const s = reachEntry()
    let cur = s
    for (let i = 0; i < 1000; i++) cur = stepGame(cur, NO_INPUT, 0)
    expect(modeOf(cur)).toBe('entry')
    expect(cur.modeAge).toBe(s.modeAge)
  })
})

// ---- determinism ------------------------------------------------------------------

describe('typed entry — determinism', () => {
  it('identical (state, input, dt) sequences yield identical entry outcomes', () => {
    const play = (seed: number): GameState => {
      let s = typeAll(reachEntry(seed), ['z', 'o', 'e'])
      s = step(s, START)
      return s
    }
    const a = play(7)
    const b = play(7)
    expect(modeOf(a)).toBe(modeOf(b))
    expect(a.highScores).toEqual(b.highScores)
  })
})

// ---- the entry screen is core data (screens.ts) -------------------------------------

describe('entryLines — the entry screen renders as core screen data', () => {
  it('carries the typed initials', () => {
    const lines = entryLines!('KV')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.join('\n')).toContain('KV')
  })

  it('renders non-empty prompt lines even with an empty buffer', () => {
    const lines = entryLines!('')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some((l) => l.trim().length > 0)).toBe(true)
  })

  // bz3-13 / S-020: the ROM's banner is L1MSG = 'GREAT SCORE' (BZONE.MAC:4302),
  // the qualifying-run congratulation — not a generic 'HIGH SCORE' label.
  it('shows the ROM congratulation banner GREAT SCORE, not a generic HIGH SCORE label', () => {
    const lines = entryLines!('')
    expect(lines[0]).toBe(MESSAGES.GREAT_SCORE)
    expect(lines.join('\n')).not.toMatch(/HIGH SCORE/)
  })
})

// ---- the shared VERB + shell wiring (AC-3 / AC-2) -----------------------------------

describe('the mechanism is the SHARED reducer and the shell forwards keys', () => {
  const srcPath = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))
  const joinSources = (dir: string): string =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
      .join('\n')

  it('some core module imports @shared/name-entry (AC-3)', () => {
    expect(joinSources(srcPath('../../src/core'))).toContain('@shared/name-entry')
  })

  it('the shell forwards keydown letters AND Backspace to enterInitial', () => {
    const shell =
      joinSources(srcPath('../../src/shell')) +
      readFileSync(srcPath('../../src/main.ts'), 'utf8')
    expect(shell).toContain('enterInitial')
    expect(shell).toContain('Backspace')
  })
})
