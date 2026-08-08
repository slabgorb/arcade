// plugins/missile-command/tests/mc4-playthrough.test.ts
//
// Story mc4-4 — RED phase (Tyr One-Handed / TEA). This story WIRES the wave model
// into the composition root and makes it visible; it invents no new game rule. The
// pure pieces already exist and are pinned elsewhere, so this file must NOT re-test
// them — it proves the COMPOSITION:
//
//   • mc4-1  waveSchedule(wave) → { count, velocity }              (wave.ts)          — pinned by wave.test.ts
//   • mc4-2  isWaveOver / waveEndBonus / regenerateCities /        (wave.ts+state.ts) — pinned by wave-transition.test.ts
//            refillAmmo / nextWaveBudget / nextWavePhase / resumePlay
//   • mc4-3  scoreMultiplier(wave) = min((wave+1)>>1, MAXMUL)      (score.ts)         — pinned by score-multiplier.test.ts
//
// mc4-4's job (epic mc4, story mc4-4):
//   (a) src/core/game.ts   — createGame seeds wave 1 + its multiplier; GameState
//       gains `wave` and `multiplier`; stepGame runs the wave-end resolution in its
//       resolve step (bonus → regen → refill → advance) and freezes on game-over.
//   (b) src/shell/render.ts — the HUD draws the wave number and current multiplier;
//       the score/ammo it draws stay the core's verbatim values (HUD-figure rule).
//   (c) THIS FILE — one seeded run across ≥2 waves showing the descent ramp between
//       waves, the wave-end bonus banked, cities regenerated, ammo refilled, the
//       multiplier climbing, and identical seeds yielding identical states.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Today GameState has no `wave`/`multiplier`, stepGame runs mc3's play→over loop
// (never the wave-end resolution), the spawner launches every ICBM at the mc3 unit
// velocity (1) regardless of wave, and the HUD draws only SCORE + AMMO. So every
// composition assertion below fails until Dev wires mc4-1/2/3 into game.ts,
// spawn.ts (the icbm.ts:20 deferral — "wiring the spawner to launch each wave's
// ICBMs at waveSchedule(wave).velocity is mc4-4") and render.ts.
//
// TYPE STRATEGY: the two new fields do not exist on GameState yet, so a direct
// `state.wave` would break `tsc --noEmit` (npm run lint) during RED. We widen with
// `Partial<WaveState>` reads (compile-clean, runtime-undefined-until-wired) instead
// of the dynamic-import idiom — every module/function we touch already exports.
//
// No wall clock, no entropy beyond the seeded Rng carried in state; every expected
// value is DERIVED from the cited core constants/functions, never a fresh literal
// (the mc4-1 review lesson: relative-only assertions let two wrong formulae ship).

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { drawFrame } from '../src/shell/render.js'
import { INITIAL_WAVE, waveSchedule, waveEndBonus, nextWaveBudget } from '../src/core/wave.js'
import { scoreMultiplier, ICBM_KILL_POINTS } from '../src/core/score.js'
import { START_CITIES, NCITY, MAXMIS } from '../src/core/field.js'
import { MXICON } from '../src/core/spawn.js'
import { type Icbm } from '../src/core/icbm.js'
import { startExplosion, stepExplosion, blastRadius, MAX_BLAST_RADIUS, type Explosion } from '../src/core/explosion.js'

// ─── The two fields mc4-4 adds to GameState. Read through a widened view so tsc
//     stays green while they are still absent; each read is `undefined` until Dev
//     adds the field, so a `.toBe(number)` assertion is RED now and GREEN once wired.
type WaveState = GameState & { readonly wave: number; readonly multiplier: number }
const waveOf = (s: GameState): number | undefined => (s as Partial<WaveState>).wave
const multOf = (s: GameState): number | undefined => (s as Partial<WaveState>).multiplier

/** Build a state with extra/overridden fields (incl. the not-yet-existing wave/
 *  multiplier) without tripping tsc's excess-property check. */
const withFields = (base: GameState, extra: Partial<WaveState>): WaveState =>
  ({ ...base, ...extra }) as WaveState

const SEED = 11
const OTHER_SEED = 8
const NEXT_WAVE = INITIAL_WAVE + 1 // 2

const aliveCities = (s: GameState): number => s.cities.filter((c) => c.alive).length
const totalAmmo = (s: GameState): number => s.bases.reduce((n, b) => n + b.ammo, 0)

/** The pure enemy-loop trajectory: fresh seeded game, then `n` frames of stepGame. */
function trajectory(seed: number, n: number): GameState[] {
  const out: GameState[] = [createGame(seed)]
  for (let k = 0; k < n; k++) out.push(stepGame(out[out.length - 1]))
  return out
}

/** Force `start` to end-of-wave shape (budget spent, screen clear) is the CALLER's
 *  job; this drives the REAL stepGame until the wave number advances (or the game
 *  ends), and returns that state. Pre-wiring the wave never changes, so it returns
 *  the last stepped state and the wave assertions stay RED. */
function crossWave(start: WaveState, maxFrames = 12): WaveState {
  const w0 = waveOf(start)
  let cur: WaveState = start
  for (let k = 0; k < maxFrames; k++) {
    cur = stepGame(cur) as WaveState
    if (waveOf(cur) !== w0 || cur.phase === 'over') return cur
  }
  return cur
}

/** An end-of-wave state at wave 1: budget spent, screen clear, ONE city lost (to
 *  make regeneration observable) and magazines part-spent (to make the refill and a
 *  non-zero unused-missile bonus observable). Built from the real createGame model. */
function endOfWaveOne(seed: number): WaveState {
  const base = createGame(seed)
  return withFields(base, {
    remaining: 0,
    icbms: [],
    score: 1000,
    cities: base.cities.map((c, i) => (i === 0 ? { ...c, alive: false } : c)),
    bases: base.bases.map((b) => ({ ...b, ammo: 2 })),
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — createGame seeds the opening wave and its multiplier onto GameState.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC1 — createGame seeds wave 1 and its multiplier', () => {
  it('a fresh game starts on the opening wave (INITIAL_WAVE)', () => {
    expect(waveOf(createGame(SEED)), 'createGame must seed GameState.wave = INITIAL_WAVE').toBe(INITIAL_WAVE)
  })

  it("the opening multiplier is wave 1's score multiplier (the base ×1)", () => {
    expect(multOf(createGame(SEED)), 'createGame must seed GameState.multiplier = scoreMultiplier(wave)').toBe(
      scoreMultiplier(INITIAL_WAVE),
    )
  })

  it('the seeded wave/multiplier are independent of the RNG seed (same opening for any seed)', () => {
    expect(waveOf(createGame(OTHER_SEED))).toBe(INITIAL_WAVE)
    expect(multOf(createGame(OTHER_SEED))).toBe(scoreMultiplier(INITIAL_WAVE))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC3 — stepGame runs the wave-end resolution: a WINNABLE wave-end banks the
// bonus, regenerates cities, refills ammo, re-seeds the budget, and advances the
// wave. (The pure reducers are pinned in wave-transition.test.ts; here we prove the
// composition in stepGame CALLS them.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC1/AC3 — a winnable wave-end advances the wave and resolves it', () => {
  const eow = endOfWaveOne(SEED)
  const survivingCities = aliveCities(eow) // 5 (one lost)
  const unusedMissiles = totalAmmo(eow) // 3 bases × 2 = 6
  const expectedBonus = waveEndBonus(survivingCities, unusedMissiles) // 5×100 + 6×5 = 530
  const w2 = crossWave(eow)

  it('the wave advances to the next wave (INITIAL_WAVE + 1)', () => {
    expect(waveOf(w2), 'a spent, cleared, winnable wave must advance the wave number').toBe(NEXT_WAVE)
  })

  it('the game is NOT over — a surviving city keeps play going', () => {
    expect(['play', 'between'], 'a winnable wave-end never flips to over').toContain(w2.phase)
  })

  it('the end-of-wave bonus is banked onto the score (exact: waveEndBonus of the pre-state)', () => {
    // No kills occur across the resolution, so the ONLY score change is the bonus.
    expect(w2.score, 'score must gain exactly the surviving-city + unused-missile bonus').toBe(
      eow.score + expectedBonus,
    )
  })

  it('destroyed cities regenerate up to the cabinet entitlement (min(START_CITIES, NCITY))', () => {
    expect(aliveCities(w2), 'regeneration must actually revive the lost city').toBeGreaterThan(survivingCities)
    // REGEN brings the board up to min(PLIVES, NCITY); at a fresh game's first wave
    // PLIVES = START_CITIES (no bonus cities yet — that award is mc4-5).
    expect(aliveCities(w2), 'the board heals up to the entitlement, capped at NCITY').toBe(
      Math.min(START_CITIES, NCITY),
    )
  })

  it('every surviving base refills to a full MAXMIS magazine', () => {
    for (const b of w2.bases) {
      if (b.alive) expect(b.ammo, 'a live base must refill to MAXMIS between waves').toBe(MAXMIS)
    }
  })

  it("the next wave's ICBM budget is re-seeded from the mc4-1 schedule", () => {
    expect(w2.remaining, 'the advanced wave draws a fresh budget = nextWaveBudget(wave)').toBe(
      nextWaveBudget(INITIAL_WAVE),
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — game-over WINS at wave-end: a wave-end with every city dead flips to 'over'
// and does NOT advance the wave or bank a bonus (ENDWV5's C5HI). This is the
// composition mirror of the block above — the losing branch of the same resolve.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC1 — game-over wins at wave-end (no advance, frozen)', () => {
  // Spent, cleared, and every city dead — with empty magazines so no bonus can be
  // banked on ANY resolve ordering (waveEndBonus(0, 0) === 0), isolating the freeze.
  const base = createGame(SEED)
  const eowDead = withFields(base, {
    remaining: 0,
    icbms: [],
    score: 1000,
    cities: base.cities.map((c) => ({ ...c, alive: false })),
    bases: base.bases.map((b) => ({ ...b, ammo: 0 })),
  })
  const stepped = stepGame(eowDead) as WaveState

  it('the phase flips to over', () => {
    expect(stepped.phase, 'all cities dead at wave-end ⇒ game over').toBe('over')
  })

  it('the wave does NOT advance past the opening wave (game-over wins)', () => {
    expect(waveOf(stepped), 'a lost wave-end must not advance the wave').toBe(INITIAL_WAVE)
  })

  it('no bonus is banked when the game ends', () => {
    expect(stepped.score, 'a game-over resolve banks no surviving-structure bonus here').toBe(1000)
  })

  it('a game-over game stays frozen: the wave never changes on subsequent frames', () => {
    let s: WaveState = stepped
    for (let k = 0; k < 5; k++) s = stepGame(s) as WaveState
    expect(waveOf(s), 'over is terminal — the wave is frozen').toBe(INITIAL_WAVE)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the ICBM descent is measurably slower on wave 1 than on a later wave. The
// spawner must launch each wave's ICBMs at waveSchedule(wave).velocity (icbm.ts:20).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC3 — ICBM descent ramps: slower on wave 1 than on wave 2', () => {
  /** The velocity carried by the first in-flight ICBM observed while at `wave`. */
  function firstIcbmVelocityAtWave(states: GameState[], wave: number): number | undefined {
    for (const s of states) {
      if (waveOf(s) !== wave) continue
      const live = s.icbms.find(() => true)
      if (live) return live.velocity ?? 1 // stepIcbm/launchIcbm default the unset velocity to 1
    }
    return undefined
  }

  // Wave 1: a plain seeded run launches wave-1 ICBMs.
  const run1 = trajectory(SEED, 60)
  const vel1 = firstIcbmVelocityAtWave(run1, INITIAL_WAVE)

  // Wave 2: cross a wave, then step the wave-2 state forward so it launches ICBMs.
  const w2 = crossWave(endOfWaveOne(SEED))
  const run2: GameState[] = [w2]
  for (let k = 0; k < 80; k++) run2.push(stepGame(run2[run2.length - 1]))
  const vel2 = firstIcbmVelocityAtWave(run2, NEXT_WAVE)

  it('wave-1 ICBMs actually launch, at the wave-1 schedule velocity', () => {
    expect(vel1, 'the wave-1 run must put an ICBM in flight').toBeDefined()
    expect(vel1, 'wave-1 ICBMs descend at waveSchedule(1).velocity, not the mc3 unit speed').toBe(
      waveSchedule(INITIAL_WAVE).velocity,
    )
  })

  it('wave-2 ICBMs launch at the wave-2 schedule velocity', () => {
    expect(vel2, 'the wave-2 run must put an ICBM in flight').toBeDefined()
    expect(vel2, 'wave-2 ICBMs descend at waveSchedule(2).velocity').toBe(waveSchedule(NEXT_WAVE).velocity)
  })

  it('the observed descent is strictly faster on wave 2 (slower on wave 1)', () => {
    expect(vel2 as number, 'a later wave descends measurably faster than wave 1').toBeGreaterThan(vel1 as number)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — across a multi-wave run the score multiplier CLIMBS (it tracks the wave:
// SMULTI steps every two waves, so wave 1 → ×1 and wave 3 → ×2).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC3 — the multiplier tracks the wave and climbs across waves', () => {
  const w1 = createGame(SEED)
  const w2 = crossWave(endOfWaveOne(SEED))
  // End wave 2 as well (budget spent, screen clear) to reach wave 3, where SMULTI steps.
  const eow2 = withFields(w2, { remaining: 0, icbms: [] })
  const w3 = crossWave(eow2)

  it('the multiplier at each reached wave is scoreMultiplier(wave)', () => {
    expect(multOf(w1), 'wave 1 multiplier').toBe(scoreMultiplier(INITIAL_WAVE))
    expect(waveOf(w2), 'reached wave 2').toBe(NEXT_WAVE)
    expect(multOf(w2), 'wave 2 multiplier').toBe(scoreMultiplier(NEXT_WAVE))
    expect(waveOf(w3), 'reached wave 3').toBe(NEXT_WAVE + 1)
    expect(multOf(w3), 'wave 3 multiplier').toBe(scoreMultiplier(NEXT_WAVE + 1))
  })

  it('the multiplier is strictly higher by wave 3 than at wave 1 (it climbs)', () => {
    expect(multOf(w3) as number, 'SMULTI steps every two waves — ×2 by wave 3').toBeGreaterThan(multOf(w1) as number)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the multiplier is not cosmetic: an ICBM kill is SCORED at the current
// wave's multiplier, not the base rate. (score-multiplier.test.ts pins the
// scoreMultiplier function and score.test.ts the scoreKills function; this pins
// the stepGame WIRING that threads `state.wave` into scoreKills — the wiring a
// dropped arg would neuter while the HUD still displayed the climbing ×N.)
// Round-2 (Heimdall): mutation M2 — `scoreKills(..., state.wave)` → `scoreKills(...)`
// — survived the whole suite; this is the guard that kills it.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC3 — an ICBM kill is scored at the wave multiplier, not the base', () => {
  /** A blast stepped to its PEAK radius (independent of which radius model is live),
   *  the deterministic-kill fixture from game.test.ts / sound-events.test.ts. */
  const peakBlast = (h: number, v: number): Explosion => {
    let e = startExplosion(h, v)
    for (let i = 0; blastRadius(e) < MAX_BLAST_RADIUS && i < 10000; i++) e = stepExplosion(e)
    return e
  }

  /** Score gained when a pre-existing blast kills exactly one ICBM on a frame at
   *  `wave`. A far-off bystander ICBM keeps the screen non-clear (so the frame is
   *  NOT a wave-end and the resolution does not interfere), and `remaining: 0`
   *  suppresses spawns so the ONLY score change is the single kill. */
  function scoreForOneKillAtWave(wave: number): number {
    const victim: Icbm = { origin: { h: 100, v: 222 }, target: { h: 100, v: 20 }, pos: { h: 100, v: 100 }, arrived: false }
    const bystander: Icbm = { origin: { h: 5, v: 222 }, target: { h: 5, v: 20 }, pos: { h: 5, v: 100 }, arrived: false }
    const g = withFields(createGame(SEED), {
      wave,
      multiplier: scoreMultiplier(wave),
      score: 0,
      remaining: 0,
      icbms: [victim, bystander],
      explosions: [peakBlast(100, 99)],
      abms: [],
    })
    const next = stepGame(g) as WaveState
    // guard the staging: exactly one kill, still mid-wave on the same wave.
    expect(next.icbms.length, 'staging: the bystander survives, the victim is killed').toBe(1)
    expect(waveOf(next), 'staging: not a wave-end — the wave is unchanged').toBe(wave)
    return next.score
  }

  it('at wave 1 (×1) a kill scores the base ICBM_KILL_POINTS', () => {
    expect(scoreForOneKillAtWave(1)).toBe(ICBM_KILL_POINTS * scoreMultiplier(1))
    expect(scoreForOneKillAtWave(1)).toBe(ICBM_KILL_POINTS) // scoreMultiplier(1) === 1
  })

  it('at wave 3 (×2) the SAME kill scores twice the base — the multiplier scales scoring', () => {
    const scaled = scoreForOneKillAtWave(3)
    expect(scaled, 'a kill on wave 3 must score ICBM_KILL_POINTS × scoreMultiplier(3)').toBe(
      ICBM_KILL_POINTS * scoreMultiplier(3),
    )
    // The decisive tooth: it is NOT the base rate — the wave, not a constant, scales it.
    expect(scaled, 'the multiplier must actually affect kill scoring, not just the HUD').toBeGreaterThan(
      ICBM_KILL_POINTS,
    )
    expect(scaled).toBe(2 * scoreForOneKillAtWave(1)) // exactly double the ×1 kill
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — determinism: identical seeds replay identically; different seeds diverge;
// the composed wave-end resolution is itself deterministic. Also a swarm-cap guard.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-4 AC3 — the composed run is fully deterministic in the seed', () => {
  it('identical seeds replay to identical states, frame for frame (incl. wave state)', () => {
    expect(trajectory(SEED, 200)).toEqual(trajectory(SEED, 200))
  })

  it('different seeds diverge (the seed is actually consumed)', () => {
    expect(trajectory(SEED, 200)).not.toEqual(trajectory(OTHER_SEED, 200))
  })

  it('the wave-end resolution is deterministic (same end-of-wave in ⇒ same next wave out)', () => {
    expect(crossWave(endOfWaveOne(SEED))).toEqual(crossWave(endOfWaveOne(SEED)))
  })

  it('never more than MXICON ICBMs on screen across the whole run', () => {
    for (const s of trajectory(SEED, 200)) {
      expect(s.icbms.length, `frame ${s.frame}: MXICON exceeded`).toBeLessThanOrEqual(MXICON)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the HUD draws the wave number and current multiplier; the score and ammo it
// draws remain the core's verbatim values (the HUD-figure rule). Uses the same
// recording-canvas harness render-battle.test.ts / render-field.test.ts use.
// ═════════════════════════════════════════════════════════════════════════════
interface Mark {
  op: string
  x: number
  y: number
  w?: number
  text?: string
}
function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const xy =
    (op: string) =>
    (x: number, y: number, w?: number): void => {
      marks.push({ op, x, y, w })
    }
  const text =
    (op: string) =>
    (t: string, x: number, y: number): void => {
      marks.push({ op, x, y, text: String(t) })
    }
  const noop = (): void => {}
  const api: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    fillRect: xy('fillRect'),
    strokeRect: xy('strokeRect'),
    rect: xy('rect'),
    moveTo: xy('moveTo'),
    lineTo: xy('lineTo'),
    arc: xy('arc'),
    ellipse: xy('ellipse'),
    fillText: text('fillText'),
    strokeText: text('strokeText'),
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    clip: noop,
  }
  return { ctx: api as unknown as CanvasRenderingContext2D, marks }
}
const W = 256
const H = 231
/** All HUD/text strings drawn for a state, joined. */
function hudText(state: GameState): string {
  const { ctx, marks } = recordingCtx()
  drawFrame(ctx, state, W, H)
  return marks
    .filter((m) => m.text !== undefined)
    .map((m) => m.text as string)
    .join(' ')
}

describe('mc4-4 AC2 — the HUD draws the wave number and the current multiplier', () => {
  // Wave 7 → scoreMultiplier(7) = 4. Score 90210 and ammo 9/8/5 are chosen so that
  // neither the digit 7 (the wave) nor the digit 4 (the multiplier) appears anywhere
  // else — so a match on '7' proves the wave is drawn and '4' proves the multiplier.
  const HUD_WAVE = 7
  const hudMultiplier = scoreMultiplier(HUD_WAVE) // 4
  const AMMOS = [9, 8, 5]
  const g = createGame(1)
  const state = withFields(g, {
    wave: HUD_WAVE,
    multiplier: hudMultiplier,
    score: 90210,
    cursor: { h: 5, v: 210 }, // parked away from the structure columns
    bases: g.bases.map((b, i) => ({ ...b, ammo: AMMOS[i] })),
  })
  const drawn = hudText(state)

  it('draws the wave number', () => {
    expect(drawn, 'the HUD must show the wave number (7)').toContain(String(HUD_WAVE))
  })

  it('draws the current multiplier value', () => {
    expect(drawn, 'the HUD must show the current multiplier (scoreMultiplier(7) = 4)').toContain(
      String(hudMultiplier),
    )
  })

  it('still draws the core score VERBATIM (HUD-figure rule — not a re-derived copy)', () => {
    // 90210 is unreachable by re-derivation from this state (0 kills), so drawing it
    // proves the HUD reads state.score directly.
    expect(drawn, 'the score must remain the core value 90210').toContain('90210')
  })

  it('still draws each live base ammo', () => {
    for (const a of AMMOS) expect(drawn, `the HUD must still show base ammo ${a}`).toContain(String(a))
  })

  it('the drawn wave TRACKS state.wave (not a hardcoded literal)', () => {
    const early = hudText(withFields(g, { wave: 1, multiplier: scoreMultiplier(1), score: 400 }))
    const later = hudText(withFields(g, { wave: 7, multiplier: scoreMultiplier(7), score: 400 }))
    expect(early, 'wave 1 must be shown on the wave-1 state').toContain('1')
    expect(later, 'wave 7 must be shown on the wave-7 state').toContain('7')
    expect(later, 'a different wave must produce different HUD text').not.toBe(early)
  })
})
