// tests/core/select-death-star.test.ts
//
// RED-phase suite for story sw9-2 — the SELECT-A-DEATH-STAR difficulty picker.
//
// PROVENANCE (1983 "Warp Speed" source, ~/Projects/star-wars-1983-source-text —
// `.MAC` are .RADIX 16, but score `.BYTE` tables are packed BCD digit-pairs added
// by ADUSCR/DAA, so `20,00,00` reads DECIMAL 200000):
//
//   * The bonus table TSCBN (WSGAS.MAC:526-530): "NO BONUS FOR CHOOSING DETH STAR 0",
//     then TSCBN1..4 = .BYTE 20/40/60/80,00,00 = 200k/400k/600k/800k, indexed by the
//     0-based ROM wave GM.WAV. Full table = [0, 200000, 400000, 600000, 800000].
//   * SCRWAV (WSGAS.MAC:327-343, called WSMAIN.MAC:1982) banks TSCBN[GM.WAV] once,
//     a pure function of the STARTING wave selected.
//   * The shipped picker draws THREE Death Stars (TDTH has 3 active rows; two are
//     commented out — PHESDS/WSMAIN.MAC:1044). The cursor→choice math
//     `SUBD #TDTH / LSRB` (";CONVERT 0->0,4->2,8->4") maps them to GM.WAV 0/2/4.
//     Labels EASY/MEDIUM/HARD (TCMES.MAC:585-587). So EASY→GM.WAV0, MEDIUM→GM.WAV2,
//     HARD→GM.WAV4, banking TSCBN[0/2/4] = {0, 400000, 800000}.
//     THE ROM WINS over the epic's "200k/400k/600k/800k": the picker cannot reach
//     waves 1/3, so 200,000 and 600,000 are present in the table but unreachable.
//   * GM.WAV is 0-based; the clone's wave is 1-based (romWave0 = wave-1, the
//     forceBonusForWave convention). EASY→wave 1, MEDIUM→wave 3, HARD→wave 5.
//   * The countdown PH.TIM (WSMAIN.MAC:1019/1046-1054) inits 0x100 = 256 frames,
//     decrements each frame; going negative starts the game at EASY ("PLAYER DIDN'T
//     DECIDE, START AT EASY"). Firing on a Death Star commits early.
//
// PRE-GREEN this whole feature is absent (`startRun` still jumps attract→playing,
// no 'select' mode, no DEATH_STAR_CHOICES/START_WAVE_BONUS). Every `it` below fails
// LOCALLY on its own behavioural assertion — the support helpers are read through a
// namespace cast so the module still loads (the difficulty.test.ts RED idiom).

import { describe, it, expect } from 'vitest'
import {
  initialState,
  STARTING_LIVES,
  TICK_HZ,
  type GameState,
} from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import {
  enterSelect,
  fireAtChoice,
  beginRunAt,
  choices,
  startWaveBonus,
  countdownSeconds,
  countdownOf,
  hoverOf,
  SELECT_DT,
} from '../support/select'

const attract = (seed = 1983): GameState => ({ ...initialState(seed), mode: 'attract' })
const modeOf = (s: GameState): string => (s as unknown as { mode: string }).mode

// The ROM start bonuses, decimal (packed-BCD digit pairs), indexed by GM.WAV.
const ROM_TSCBN = [0, 200_000, 400_000, 600_000, 800_000]

// --- AC-1: attract + start opens the picker ---------------------------------

describe('sw9-2 · attract + start opens the SELECT-A-DEATH-STAR screen (AC-1)', () => {
  it('goes to the select mode, NOT straight into a playing run', () => {
    const s = enterSelect(42)
    expect(modeOf(s)).toBe('select')
    expect(modeOf(s)).not.toBe('playing')
  })

  it('arms the countdown to SELECT_COUNTDOWN_SECONDS', () => {
    const s = enterSelect()
    // one SELECT_DT step has elapsed since arming; allow that single tick of slack.
    expect(countdownOf(s)).toBeGreaterThan(countdownSeconds() - 2 * SELECT_DT)
    expect(countdownOf(s)).toBeLessThanOrEqual(countdownSeconds())
  })

  it('consumes no randomness opening the picker (framing never touches the RNG)', () => {
    const before = attract(7)
    const rngBefore = { ...before.rng }
    const s = stepGame(before, { ...NO_INPUT, start: true }, SELECT_DT)
    expect(modeOf(s)).toBe('select')
    expect(s.rng).toEqual(rngBefore)
  })

  it('does not begin the run yet — no score, no enemies, no run-start spawn', () => {
    const s = enterSelect()
    expect(s.score).toBe(0)
    expect(s.enemies).toHaveLength(0)
    expect(s.events).not.toContainEqual({ type: 'player-spawn' })
  })
})

// --- AC-4: the ROM TSCBN bonus table and the three choices ------------------

describe('sw9-2 · the start-bonus table is the ROM TSCBN (AC-4)', () => {
  it('START_WAVE_BONUS is [0, 200000, 400000, 600000, 800000] (GM.WAV-indexed)', () => {
    expect(startWaveBonus()).toEqual(ROM_TSCBN)
  })

  it('exposes exactly the three shipped Death Stars — EASY, MEDIUM, HARD', () => {
    const c = choices()
    expect(c).toHaveLength(3)
    expect(c.map((x) => x.label)).toEqual(['EASY', 'MEDIUM', 'HARD'])
  })

  it('maps the three choices to GM.WAV 0/2/4 → clone waves 1/3/5', () => {
    expect(choices().map((x) => x.wave)).toEqual([1, 3, 5])
  })

  it("each choice's bonus is TSCBN[GM.WAV] = TSCBN[wave-1] → {0, 400000, 800000}", () => {
    expect(choices().map((x) => x.bonus)).toEqual([0, 400_000, 800_000])
    // and each is exactly the table entry for its 0-based wave, not a magic number
    for (const c of choices()) expect(c.bonus).toBe(startWaveBonus()[c.wave - 1])
  })

  it('200,000 and 600,000 exist in the table but are UNREACHABLE via any choice', () => {
    // The two commented-out Death Stars (waves 2/4 → GM.WAV 1/3). ROM wins over the
    // epic's "200k/400k/600k/800k": the shipped three-star picker never banks these.
    const reachable = new Set(choices().map((x) => x.bonus))
    expect(startWaveBonus()).toContain(200_000)
    expect(startWaveBonus()).toContain(600_000)
    expect(reachable.has(200_000)).toBe(false)
    expect(reachable.has(600_000)).toBe(false)
  })
})

// --- AC-3: firing over a Death Star selects it, banks the bonus, sets the wave

describe('sw9-2 · fire over a Death Star begins the run (AC-3)', () => {
  it('EASY banks nothing and starts at wave 1, full shields, in space', () => {
    const run = beginRunAt(0)
    expect(modeOf(run)).toBe('playing')
    expect(run.phase).toBe('space')
    expect(run.wave).toBe(1)
    expect(run.score).toBe(0)
    expect(run.lives).toBe(STARTING_LIVES)
    expect(run.gameOver).toBe(false)
  })

  it('MEDIUM banks 400,000 and starts at wave 3', () => {
    const run = beginRunAt(1)
    expect(modeOf(run)).toBe('playing')
    expect(run.wave).toBe(3)
    expect(run.score).toBe(400_000)
    expect(run.lives).toBe(STARTING_LIVES)
  })

  it('HARD banks 800,000 and starts at wave 5', () => {
    const run = beginRunAt(2)
    expect(modeOf(run)).toBe('playing')
    expect(run.wave).toBe(5)
    expect(run.score).toBe(800_000)
    expect(run.lives).toBe(STARTING_LIVES)
  })

  it('banks each choice its own TSCBN bonus (table-driven, no drift)', () => {
    for (let i = 0; i < choices().length; i++) {
      const c = choices()[i]
      const run = beginRunAt(i)
      expect(run.wave, c.label).toBe(c.wave)
      expect(run.score, c.label).toBe(c.bonus)
    }
  })
})

// --- AC-2: the countdown runs and expires to EASY ---------------------------

describe('sw9-2 · the countdown runs and defaults to EASY (AC-2)', () => {
  it('decrements the countdown by dt on a neutral step', () => {
    const s0 = enterSelect()
    const c0 = countdownOf(s0) as number
    const s1 = stepGame(s0, NO_INPUT, 0.1)
    expect(countdownOf(s1)).toBeCloseTo(c0 - 0.1, 5)
    expect(modeOf(s1)).toBe('select') // still deciding
  })

  it('stays in select while time remains (a step short of the limit does not start)', () => {
    const s1 = stepGame(enterSelect(), NO_INPUT, countdownSeconds() / 2)
    expect(modeOf(s1)).toBe('select')
  })

  it("expires to EASY — 'player didn\\'t decide, start at EASY' (wave 1, no bonus)", () => {
    // One step past the whole countdown, no fire: the run begins at EASY.
    const sel = enterSelect()
    expect(modeOf(sel)).toBe('select') // anchor: pre-GREEN there is no picker to expire
    const expired = stepGame(sel, NO_INPUT, countdownSeconds() + 0.001)
    expect(modeOf(expired)).toBe('playing')
    expect(expired.wave).toBe(1)
    expect(expired.score).toBe(0)
    expect(expired.phase).toBe('space')
    expect(expired.lives).toBe(STARTING_LIVES)
  })

  it('defaults to EASY even after the cursor last hovered HARD (timeout forces GM.WAV 0)', () => {
    // Hover HARD (no fire), then let it time out — the ROM forces GM.WAV←0 on expiry
    // regardless of the last hover.
    const hard = choices()[2]
    const s0 = enterSelect()
    const hovered = stepGame(s0, { aimX: hard.aim[0], aimY: hard.aim[1], fire: false }, SELECT_DT)
    expect(modeOf(hovered)).toBe('select')
    const expired = stepGame(hovered, NO_INPUT, countdownSeconds() + 0.001)
    expect(modeOf(expired)).toBe('playing')
    expect(expired.wave).toBe(1)
    expect(expired.score).toBe(0)
  })

  it('SELECT_COUNTDOWN_SECONDS is the ROM PH.TIM = 0x100 frames / TICK_HZ (≈ 12.48 s)', () => {
    expect(countdownSeconds()).toBeCloseTo(0x100 / TICK_HZ, 4)
  })
})

// --- AC-5: selection needs a real fire on a real target ---------------------

describe('sw9-2 · selection requires a fire on a Death Star (AC-5)', () => {
  it('hovering a choice WITHOUT fire does not select — stays in select, hover set', () => {
    const medium = choices()[1]
    const s = stepGame(enterSelect(), { aimX: medium.aim[0], aimY: medium.aim[1], fire: false }, SELECT_DT)
    expect(modeOf(s)).toBe('select')
    expect(hoverOf(s)).toBe(1)
  })

  it('firing far off every Death Star does not select — stays in select, hover null', () => {
    const c0 = choices()[0]
    // 1000 units away in normalised aim space is beyond any sane hit radius on a
    // [-1,1] screen, and equally far from all three choices.
    const off: Input = { aimX: c0.aim[0] + 1000, aimY: c0.aim[1] + 1000, fire: true }
    const s = stepGame(enterSelect(), off, SELECT_DT)
    expect(modeOf(s)).toBe('select')
    expect(hoverOf(s)).toBeNull()
    expect(s.score).toBe(0)
  })

  it('a neutral step (no aim, no fire) reports no hover', () => {
    const s = stepGame(enterSelect(), NO_INPUT, SELECT_DT)
    expect(modeOf(s)).toBe('select')
    expect(hoverOf(s)).toBeNull()
  })
})

// --- AC-6: a run begun from select fires the run-start cues ------------------

describe('sw9-2 · run-start cues move to the select→playing edge (AC-6)', () => {
  it('fire-select emits player-spawn + Red Five — and NO music (sw8-12: the theme is the 2s milestone)', () => {
    const run = beginRunAt(0)
    expect(run.events).toContainEqual({ type: 'player-spawn' })
    expect(run.events).toContainEqual({ type: 'speech', line: 'redFiveStandingBy' })
    // sw8-12 re-seat: the ROM's PHISP1 opens the space phase in SILENCE — the
    // run-start cues are the spawn + the voice line; the theme fires at 2s.
    expect(run.events.some((e) => e.type === 'music')).toBe(false)
  })

  it('countdown-expiry also emits the run-start cues (a run truly begins)', () => {
    const expired = stepGame(enterSelect(), NO_INPUT, countdownSeconds() + 0.001)
    expect(modeOf(expired)).toBe('playing')
    expect(expired.events).toContainEqual({ type: 'player-spawn' })
    expect(expired.events).toContainEqual({ type: 'speech', line: 'redFiveStandingBy' })
  })
})

// --- AC-7: purity / determinism ---------------------------------------------

describe('sw9-2 · the picker is pure and deterministic (AC-7)', () => {
  it('opening the picker is identical for a fixed seed', () => {
    expect(modeOf(enterSelect(7))).toBe('select') // anchor: this is the picker, not a run
    expect(enterSelect(7)).toEqual(enterSelect(7))
  })

  it('selecting the same choice from the same seed yields deep-equal runs', () => {
    expect(beginRunAt(2, 99)).toEqual(beginRunAt(2, 99))
  })

  it('a select step never mutates its input state', () => {
    const s0 = enterSelect(123)
    expect(modeOf(s0)).toBe('select') // anchor: exercising the picker step, not a run
    const snapshot = structuredClone(s0)
    stepGame(s0, { ...NO_INPUT, fire: true }, SELECT_DT)
    expect(s0).toEqual(snapshot)
  })

  it('the RNG is untouched across the whole attract→select→play crossing', () => {
    const before = attract(2024)
    const rngBefore = { ...before.rng }
    const run = fireAtChoice(stepGame(before, { ...NO_INPUT, start: true }, SELECT_DT), 1)
    expect(run.rng).toEqual(rngBefore)
  })
})
