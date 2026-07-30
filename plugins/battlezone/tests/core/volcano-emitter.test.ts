// tests/core/volcano-emitter.test.ts
//
// Story bz4-2 — RED phase (O'Brien / TEA). The SEEDED-STOCHASTIC volcano
// emitter: rocks respawn INDEPENDENTLY on their own ~1-in-8 staggered timer,
// each drawing a random launch velocity YSPD=(PRAND&7)+5 from a seeded,
// deterministic PRNG — replayable and core-pure.
//
// WHAT THIS REPLACES. bz3-6 shipped a DOCUMENTED DEVIATION (sim.ts's
// `advanceVolcano`): a FIXED-velocity SYNCHRONISED relaunch-on-retire volley —
// the whole 5-rock burst retires together and immediately respawns together,
// every rock at the same authored velocity ([5,7,9,11,12]). That is a
// synchronized volley on a single burst clock, NOT the ROM's per-rock
// independently-staggered stochastic respawn with per-rock random velocity.
// This story makes the emitter faithful; these tests pin the faithful behaviour.
//
// THE ROM FACT (VOLCNO, BZONE.MAC — verified against
// /Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC lines 1390-1417):
//
//   VOLCNO: LDX I,NOROCK-1      ;5 ROCKS                 (:1390 — NOROCK=5, :319)
//   10$:    LDA X,OBJTIM        ;THIS ROCK ACTIVE?       (:1391 — per-rock timer)
//           BNE 30$             ;YES → just fly it
//           LDA PRAND           ;NOT ACTIVE, START ONE?  (:1393)
//           AND I,7             ;(THIS # MAY CHANGE)     (:1394)  ── 1-in-8 gate:
//           BNE 50$             ;DON'T START THIS TIME   (:1395)     relaunch ONLY
//                                                                     when (PRAND&7)==0
//           LDA I,1F            ;ROCK ACTIVE TIME        (:1396 — OBJTIM=0x1F=31)
//           STA X,OBJTIM
//           ... XSPD draw (shell/orientation, not this story) ...
//           LDA PRAND           ;                        (:1405)
//           AND I,7             ;                        (:1406)
//           ADC I,5             ;SOME RANDOM VERT VELOCITY(:1407) ── YSPD=(PRAND&7)+5
//           STA X,YSPD                                                ∈ [5,12]
//           ...
//   30$:    DEC X,OBJTIM
//           DEC X,YSPD          ;GRAVITY TAMES HOLD      (:1417 — gravity -1/frame)
//
// The `LDX I,NOROCK-1 … DEX` loop rolls EACH of the 5 rocks INDEPENDENTLY every
// game frame off the SAME hardware LFSR (PRAND), which advances on every read.
// So each rock's respawn is its OWN staggered 1-in-8 roll (not a shared volley
// clock), and each launch draws its OWN random velocity. That is exactly the
// two behaviours these tests pin: (AC-1) staggered independent respawn, and
// (AC-2) per-rock seeded random velocity, replayable and pure.
//
// ── AC COVERAGE ──────────────────────────────────────────────────────────────
//   AC-1 (independent staggered respawn): over a long seeded run, rocks
//     (re)launch on DIFFERENT frames — there is a frame where SOME but not ALL
//     inactive rocks launch (the anti-volley discriminator), the per-rock
//     launch schedules are not all identical, and the mean inactive-wait before
//     relaunch matches the ROM's ~1-in-8 roll (E≈8 frames), NOT the volley's 0.
//   AC-2 (seeded random velocity + replay + purity): every launch velocity is
//     an integer in [5,12]; a rock SLOT launches with ≥2 distinct velocities
//     across the run (kills bz3-6's one-fixed-value-per-slot); the run's launch
//     velocities span the band; TWO sims from the SAME seed produce a
//     byte-identical eruption sequence and a DIFFERENT seed diverges; and the
//     emitter is a pure function of its carried state (no ambient randomness —
//     the behavioural proof of the no-Math.random/Date.now rule the epic
//     core-purity-sweep also enforces statically on the new module).
//
// ── PRNG the Dev threads (found by TEA, for GREEN) ────────────────────────────
//   Reuse the EXISTING seeded PRNG — do NOT invent a second one. `saucer.ts` and
//   `enemies.ts` already carry a `rng: number` seed word in their state and draw
//   from `@shared/rng` (`createRng(seed)` → `nextFloat`/`nextInt` →
//   `rng.seed` back out; mulberry32, pinned v0.15.0). The volcano gets its OWN
//   derived stream from the run seed (the saucer's `initSaucer((seed^K))`
//   precedent), so it is independent of the enemy/saucer streams yet replayable
//   from `initGame(seed)`.
//
// ── CONTRACT pinned for Dev (GREEN) — a NEW pure core module, saucer.ts shape ──
//   src/core/volcano.ts
//     interface VolcanoRock {
//       readonly velocity: number   // current YSPD: the [5,12] launch draw on the
//                                    //   frame it (re)launches, then gravity-decayed
//       readonly active:  boolean   // airborne? (ROM OBJTIM > 0). false = retired,
//                                    //   waiting on its own 1-in-8 respawn roll
//       (Dev may carry height / age / OBJTIM etc. — the tests read velocity+active.)
//     }
//     interface VolcanoState {
//       readonly rocks: readonly VolcanoRock[]  // NOROCK = 5
//       readonly rng:   number                  // carried seed word — part of the
//                                               //   sim snapshot (saucer precedent),
//                                               //   so replays reproduce the sequence
//     }
//     initVolcano(seed: number): VolcanoState   // 5 rocks, seeded, deterministic
//     stepVolcano(state: VolcanoState): VolcanoState
//         // advance EXACTLY ONE 15.625 Hz game frame (frame-based like
//         // stepDebris; the dt→frames accumulation stays in sim.ts's
//         // advanceVolcano). Each inactive rock rolls its own 1-in-8; a hit
//         // (re)launches it with YSPD=(rng&7)+5; each active rock ages/falls and
//         // retires at OBJTIM=31. Reuse debris.ts's per-rock physics constants
//         // (gravity -1, heightScale 1, lifetime 31) — only the SCHEDULING and
//         // the VELOCITY DRAW are new (context: "reuse the engine as-is").
//   WIRING (GREEN): sim.ts's advanceVolcano drives stepVolcano off dt→frames;
//     state.ts's GameState.volcano becomes a VolcanoState seeded in initGame;
//     main.ts's render reads the rocks (shell — out of RED scope).
//
// RED: src/core/volcano.ts does not exist yet, so the direct-emitter suites fail
// as a clean CONTRACT MISS (needEmitter throws, defensive variable-specifier
// import — the bz3-6 pattern), and the wiring suites fail BEHAVIOURALLY against
// the current synchronised-fixed volley in the live sim. Neither is an
// import/typo error — every failure names the missing stochastic/staggered
// behaviour.

import { describe, it, expect } from 'vitest'
import { GAME_FRAME_HZ } from '../../src/core/timebase'
import { initGame } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'

// --- The pinned emitter contract, declared structurally (RED-safe) -----------

interface VolcanoRock {
  readonly velocity: number
  readonly active: boolean
}
interface VolcanoState {
  readonly rocks: readonly VolcanoRock[]
  readonly rng: number
}
interface VolcanoEmitter {
  initVolcano(seed: number): VolcanoState
  stepVolcano(state: VolcanoState): VolcanoState
}

/** Defensive load — a VARIABLE specifier so tsc does not resolve the not-yet-
 *  built module; a missing module/export becomes a clean in-test contract miss,
 *  never a file-load crash (mirrors bz3-6's volcano.test.ts loader). */
async function loadEmitter(): Promise<Partial<VolcanoEmitter>> {
  try {
    const spec = '../../src/core/volcano'
    return (await import(/* @vite-ignore */ spec)) as unknown as Partial<VolcanoEmitter>
  } catch {
    return {}
  }
}

function needEmitter(m: Partial<VolcanoEmitter>): VolcanoEmitter {
  if (typeof m.initVolcano !== 'function' || typeof m.stepVolcano !== 'function') {
    throw new Error(
      'CONTRACT (bz4-2): src/core/volcano.ts must export ' +
        'initVolcano(seed): VolcanoState and stepVolcano(state): VolcanoState — ' +
        'the seeded staggered emitter (NOROCK=5 rocks, per-rock 1-in-8 respawn, ' +
        'YSPD=(rng&7)+5).',
    )
  }
  return m as VolcanoEmitter
}

const SEED = 0x1a2b3c4d
const SEED2 = 0x7f5e6d9c

/** Step the emitter `frames` game frames from a fresh seed; snapshot per frame
 *  each rock's velocity + active flag. */
function runEmitter(
  em: VolcanoEmitter,
  seed: number,
  frames: number,
): { vel: number[][]; active: boolean[][] } {
  let s = em.initVolcano(seed)
  const vel: number[][] = []
  const active: boolean[][] = []
  for (let f = 0; f < frames; f++) {
    s = em.stepVolcano(s)
    vel.push(s.rocks.map((r) => r.velocity))
    active.push(s.rocks.map((r) => r.active))
  }
  return { vel, active }
}

/** Per rock, the (re)launch events after frame 0: every inactive→active edge,
 *  with the velocity observed on the launch frame. */
function launchesPerRock(snap: { vel: number[][]; active: boolean[][] }): {
  frames: number[][]
  velocities: number[][]
} {
  const rockCount = snap.active[0].length
  const frames: number[][] = Array.from({ length: rockCount }, () => [])
  const velocities: number[][] = Array.from({ length: rockCount }, () => [])
  for (let r = 0; r < rockCount; r++) {
    for (let f = 1; f < snap.active.length; f++) {
      if (snap.active[f][r] && !snap.active[f - 1][r]) {
        frames[r].push(f)
        velocities[r].push(snap.vel[f][r])
      }
    }
  }
  return { frames, velocities }
}

// ---------------------------------------------------------------------------
// AC-1 — independent, staggered per-rock respawn (NOT a synchronized volley)
// ---------------------------------------------------------------------------

describe('AC-1 — rocks respawn INDEPENDENTLY on their own staggered 1-in-8 timer (BZONE.MAC:1391-1395)', () => {
  it('there is a frame where SOME but not ALL inactive rocks launch — the anti-volley discriminator', async () => {
    const em = needEmitter(await loadEmitter())
    const snap = runEmitter(em, SEED, 4000)
    let staggered = false
    for (let f = 1; f < snap.active.length && !staggered; f++) {
      let launchers = 0
      let inactiveBefore = 0
      for (let r = 0; r < snap.active[f].length; r++) {
        if (!snap.active[f - 1][r]) inactiveBefore++
        if (snap.active[f][r] && !snap.active[f - 1][r]) launchers++
      }
      // A synchronized volley ALWAYS relaunches every inactive rock together
      // (launchers === inactiveBefore); staggered independent rolls produce a
      // frame where only some of the waiting rocks fire.
      if (launchers > 0 && launchers < inactiveBefore) staggered = true
    }
    expect(
      staggered,
      'no frame launched a subset of the idle rocks — rocks are relaunching as a synchronized volley, not on independent 1-in-8 timers',
    ).toBe(true)
  })

  it('the five rocks do NOT all share one identical launch schedule (they are decoupled)', async () => {
    const em = needEmitter(await loadEmitter())
    const { frames } = launchesPerRock(runEmitter(em, SEED, 4000))
    const schedules = new Set(frames.map((f) => f.join(',')))
    expect(
      schedules.size,
      'every rock launched on the exact same frames — a single shared burst clock, not per-rock timers',
    ).toBeGreaterThan(1)
  })

  it('the mean inactive-wait before relaunch matches the ROM ~1-in-8 roll (E≈8 frames), not the volley 0', async () => {
    const em = needEmitter(await loadEmitter())
    const snap = runEmitter(em, SEED, 4000)
    const waits: number[] = []
    for (let r = 0; r < snap.active[0].length; r++) {
      let offAt = -1
      for (let f = 1; f < snap.active.length; f++) {
        if (snap.active[f - 1][r] && !snap.active[f][r]) {
          offAt = f // retired this frame — the idle stretch begins
        } else if (!snap.active[f - 1][r] && snap.active[f][r] && offAt >= 0) {
          waits.push(f - offAt) // frames spent idle before this relaunch
          offAt = -1
        }
      }
    }
    expect(waits.length, 'not enough observed relaunch waits to judge cadence').toBeGreaterThan(20)
    const mean = waits.reduce((a, b) => a + b, 0) / waits.length
    // Geometric wait for p=1/8 has E≈8. A synchronized relaunch-on-retire volley
    // waits ~0; a much rarer roll waits ≫14. The band pins the ~1/8 ROM roll.
    expect(mean, `mean idle-wait was ${mean.toFixed(2)} frames`).toBeGreaterThanOrEqual(4)
    expect(mean, `mean idle-wait was ${mean.toFixed(2)} frames`).toBeLessThanOrEqual(14)
  })
})

// ---------------------------------------------------------------------------
// AC-2 — seeded random launch velocity YSPD=(PRAND&7)+5 ∈ [5,12] (BZONE.MAC:1405-1407)
// ---------------------------------------------------------------------------

describe('AC-2 — each launch draws a seeded random velocity in [5,12] (BZONE.MAC:1405-1407)', () => {
  it('every launch velocity is a whole unit/frame in [5,12] (YSPD=(rng&7)+5)', async () => {
    const em = needEmitter(await loadEmitter())
    const { velocities } = launchesPerRock(runEmitter(em, SEED, 4000))
    const all = velocities.flat()
    expect(all.length, 'the emitter never launched a rock across 4000 frames').toBeGreaterThan(20)
    for (const v of all) {
      expect(Number.isInteger(v), `launch velocity ${v} must be a whole unit/frame`).toBe(true)
      expect(v, 'YSPD lower bound (PRAND&7)+5').toBeGreaterThanOrEqual(5)
      expect(v, 'YSPD upper bound (PRAND&7)+5').toBeLessThanOrEqual(12)
    }
  })

  it('a rock SLOT launches with ≥2 DISTINCT velocities across the run (kills bz3-6 one-fixed-value-per-slot)', async () => {
    const em = needEmitter(await loadEmitter())
    const { velocities } = launchesPerRock(runEmitter(em, SEED, 4000))
    const someSlotVaries = velocities.some((slot) => new Set(slot).size >= 2)
    expect(
      someSlotVaries,
      'every rock slot always relaunched at the same velocity — a fixed authored set, not a per-rock random draw',
    ).toBe(true)
  })

  it('the run spans the band — launch velocities cover ≥5 of the 8 possible values in [5,12]', async () => {
    const em = needEmitter(await loadEmitter())
    const { velocities } = launchesPerRock(runEmitter(em, SEED, 4000))
    const distinct = new Set(velocities.flat())
    // A genuine uniform (rng&7)+5 over hundreds of draws hits nearly all 8; a
    // degenerate/single-value draw stays far below 5.
    expect(
      distinct.size,
      `only ${distinct.size} distinct launch velocities observed — the draw is not spanning [5,12]`,
    ).toBeGreaterThanOrEqual(5)
  })
})

// ---------------------------------------------------------------------------
// AC-2 — replayability: same seed ⇒ byte-identical eruption; different ⇒ diverges
// ---------------------------------------------------------------------------

describe('AC-2 — the eruption is deterministic & seed-replayable (core-pure PRNG)', () => {
  it('two sims from the SAME seed produce a byte-identical velocity + respawn sequence', async () => {
    const em = needEmitter(await loadEmitter())
    const a = runEmitter(em, SEED, 1500)
    const b = runEmitter(em, SEED, 1500)
    // A non-deterministic source (Math.random / Date.now) would diverge here.
    expect(b.vel, 'same-seed velocity sequences must match exactly').toEqual(a.vel)
    expect(b.active, 'same-seed respawn (active) sequences must match exactly').toEqual(a.active)
  })

  it('a DIFFERENT seed produces a DIFFERENT eruption sequence (the emitter truly consumes the seed)', async () => {
    const em = needEmitter(await loadEmitter())
    const a = runEmitter(em, SEED, 1500)
    const c = runEmitter(em, SEED2, 1500)
    expect(c.vel, 'a different seed must not replay the same velocities — the draw ignores the seed').not.toEqual(
      a.vel,
    )
  })
})

// ---------------------------------------------------------------------------
// CORE PURITY — stepVolcano is a pure function of its carried state
// (behavioural proof; core-purity-sweep.test.ts also bans Math.random/Date.now
//  statically on src/core/volcano.ts once it exists)
// ---------------------------------------------------------------------------

describe('core purity — the emitter draws only from its carried seed (no ambient randomness)', () => {
  it('initVolcano carries a numeric seed word and NOROCK=5 rocks (state IS the snapshot)', async () => {
    const em = needEmitter(await loadEmitter())
    const s0 = em.initVolcano(SEED)
    expect(typeof s0.rng, 'the PRNG seed must live in VolcanoState so a snapshot replays it').toBe('number')
    expect(s0.rocks.length, 'NOROCK = 5 (BZONE.MAC:319, :1390)').toBe(5)
  })

  it('stepVolcano is pure — stepping the SAME input state twice yields identical output', async () => {
    const em = needEmitter(await loadEmitter())
    const s0 = em.initVolcano(SEED)
    const next1 = em.stepVolcano(s0)
    const next2 = em.stepVolcano(s0)
    // If the step read Math.random()/Date.now(), the two outputs would differ.
    expect(next2, 'stepVolcano(state) must be a pure function of state alone').toEqual(next1)
  })
})

// ---------------------------------------------------------------------------
// WIRING — the emitter is threaded into the live sim (initGame + stepGame),
// proven BEHAVIOURALLY against the real game state, not just the module in
// isolation ("keep the sneaky dev honest": the volcano must be seeded + stochastic
// end-to-end). Tolerant accessor so it does not over-pin the GameState shape.
// ---------------------------------------------------------------------------

const FRAME_DT = 1 / GAME_FRAME_HZ

/** Read per-rock {velocity, active} from whatever shape the live volcano state
 *  carries — the new `rocks` array, or (today) the legacy DebrisState `pieces`
 *  where active === !grounded. Behaviour-pinning, shape-tolerant. */
function rocksOf(volcano: unknown): VolcanoRock[] {
  const v = volcano as { rocks?: unknown; pieces?: unknown } | null | undefined
  const arr = (v?.rocks ?? v?.pieces ?? []) as ReadonlyArray<{
    velocity: number
    active?: boolean
    grounded?: boolean
  }>
  return arr.map((x) => ({ velocity: Number(x.velocity), active: x.active ?? !x.grounded }))
}

/** Drive the live sim `calls` frames in attract (neutral input) and snapshot the
 *  volcano's per-rock velocity + active each frame. */
function driveSimVolcano(seed: number, calls: number): { vel: number[][]; active: boolean[][] } {
  let s = initGame(seed)
  const vel: number[][] = []
  const active: boolean[][] = []
  for (let i = 0; i < calls; i++) {
    s = stepGame(s, NO_INPUT, FRAME_DT)
    const rocks = rocksOf(s.volcano)
    vel.push(rocks.map((r) => r.velocity))
    active.push(rocks.map((r) => r.active))
  }
  return { vel, active }
}

describe('WIRING — the seeded emitter is threaded through initGame + stepGame', () => {
  it('in the live sim a rock slot relaunches at ≥2 distinct velocities (emitter is wired AND stochastic)', async () => {
    const { velocities } = launchesPerRock(driveSimVolcano(SEED, 1600))
    expect(velocities.flat().length, 'the live volcano never relaunched a rock').toBeGreaterThan(10)
    const someSlotVaries = velocities.some((slot) => new Set(slot).size >= 2)
    expect(
      someSlotVaries,
      'the live volcano relaunches every slot at a fixed velocity — the stochastic emitter is not wired into the sim',
    ).toBe(true)
  })

  it('the same run seed replays the identical volcano; a DIFFERENT seed diverges (volcano consumes the seed)', async () => {
    const a = driveSimVolcano(SEED, 1200)
    const again = driveSimVolcano(SEED, 1200)
    expect(again.vel, 'the sim must replay identically from the same seed').toEqual(a.vel)
    const other = driveSimVolcano(SEED2, 1200)
    // Today the volcano ignores the run seed (fixed preset), so this is IDENTICAL
    // → RED. Once the emitter is seeded from initGame's seed, it diverges.
    expect(
      other.vel,
      'a different run seed produced the identical volcano — the volcano is not seeded from the run',
    ).not.toEqual(a.vel)
  })
})
