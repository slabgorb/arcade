// tests/demo-jt9-40.test.ts
//
// Story jt9-40 — RED phase (Mr. Praline / TEA). PWHCH: the egg wave's PRE-MATURE
// HATCHINGS. The egg-wave setup loads `LDA #2 / STA PWHCH,U` "NUMBER OF PRE-MATURE
// EGG HATCHINGS" (JOUSTRV4.SRC:2776-2777) and CREGG spends it, one egg at a time,
// shortening that egg's hatch wait by a VRAND draw (JOUSTRV4.SRC:2886-2894).
//
// ─── THE COUNT WAS CONTESTED, SO IT IS DERIVED, NOT TRANSCRIBED ──────────────
// This story's own filing contains BOTH numbers. SM's first draft asserted THREE
// ("despite the comment saying two"); the correction says TWO; and the committed
// description still carries one stale sentence — "With PWHCH the first three would
// arrive earlier" — that contradicts its own title. A count that its own filing
// states two ways cannot be transcribed from that filing in either direction.
//
// So TEA re-ran the three-line trace against the vendored source rather than
// reading either number, and demo-jt9-40-source.test.ts DERIVES it mechanically:
// it parses the immediate, the DEC mnemonic and the BRANCH mnemonic out of the
// source and simulates the loop. The answer is TWO — `DEC PWHCH,U / BMI 20$`
// shortens on the decrement to 1 and the decrement to 0 (BMI branches only on
// NEGATIVE) and skips from the decrement to -1 onward. The 1982 comment was
// right and the re-derivation that overrode it was wrong, which is the inverse of
// this repo's usual failure. Nothing below hard-codes a 2 that is not also
// derived over there.
//
// ─── WHAT THE PORT LOOKS LIKE, MEASURED AT RED ───────────────────────────────
// `advanceTo(5)` then one `stepDemo`, seeds 0x1234 / 0xbeef / 0x2468:
//   · twelve eggs, ids 0x500..0x50b in deal order;
//   · `waitFrames` UNDEFINED on all twelve at spawn (jt9-9 seeds the wait lazily,
//     in the hatch pass, because `spawnWaveEggs` holds the raw BCD counter);
//   · after ONE step all twelve read 623 — `eggWaitFrames('EGGWT2', 5) - 1`, one
//     value, no stagger at all;
//   · stepped on, SIX hatch together at f=628 and six defer on jt9-38's quota.
// That single shared wait is exactly what PWHCH exists to break up.
//
// ─── WHY THE TEN ARE THE CONTROL ─────────────────────────────────────────────
// Every numeric expectation below is taken from the TEN eggs PWHCH does not
// touch, never from a hard-coded 623. A wave's EGGWT2 falls with the wave and the
// demo's BCD counter is not its decimal ordinal (td1-12), so a literal would pin
// the fixture's arithmetic rather than the mechanism — and would have to be
// re-typed for a second egg wave. The ten say what a full wait is; the two are
// asserted against them.
//
// ─── THE ZERO DRAW IS REAL, AND EVERY ASSERTION HERE SURVIVES IT ─────────────
// VRAND yields 0-127, so a draw of 0 shortens by nothing and that egg is
// indistinguishable from the ten. No test below requires a particular seed to
// draw non-zero: the per-seed assertions are bounds and identity (both true at
// draw 0), and the one "it really does shorten" claim is made over a 32-seed
// SWEEP with the zero rate reasoned about explicitly. See AC-4.
//
// Citations spell the filename (`JOUSTRV4.SRC:NNNN`) rather than a bare `:NNNN`,
// so the comment-citation guard's nearest-preceding-filename rule cannot bind a
// ROM span to a .ts file.

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoProcess, type DemoState, type DemoModule } from './helpers/demo-contract.js'
import type { EggState } from './helpers/egg-contract.js'

/** The egg wave the whole suite works in — counter 5, decimal ordinal 5. */
const EGG_WAVE = 5
/** A SECOND egg wave, reached through the first, for the re-arm test. */
const EGG_WAVE_2 = 20
/** A NON-egg wave, for the kill-egg control. */
const NON_EGG_WAVE = 4

/** `JSR VRAND  A RANDOM NUMBER 0-127` (JOUSTRV4.SRC:2890) — the draw's top value. */
const MAX_DRAW = 127

/** The twelve eggs an egg wave deals, in deal order: `0x100 * wave + i`. */
const eggIdsFor = (wave: number): number[] => Array.from({ length: 12 }, (_, i) => 0x100 * wave + i)

// ─── The seam under test, loaded without widening the shared contract ────────

/**
 * `prematureHatchWait` is new in this story. It cannot join `loadDemo`'s
 * required-export list: that list is checked for EVERY caller of `loadDemo`, so a
 * name added there fails-to-load every demo test file in the plugin, and a file
 * whose tests never ran is indistinguishable on stdout from one whose tests all
 * passed. Scoped here instead — the jt9-38 `loadWenemy` idiom.
 */
async function loadPrematureHatchWait(): Promise<(wait: number, draw: number) => number> {
  const specifier = ['..', '..', 'src', 'core', 'demo.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>
  const fn = mod['prematureHatchWait']
  if (typeof fn !== 'function') {
    throw new Error(
      'demo.ts has no `prematureHatchWait` export — GREEN (Bicycle Repair Man) adds the ' +
        'PWHCH shortening as a pure function of (wait, draw): CREGG loads the wave wait ' +
        '(`LDB PEGGTM,U`, JOUSTRV4.SRC:2886), draws `JSR VRAND  A RANDOM NUMBER 0-127` ' +
        '(JOUSTRV4.SRC:2890), and MULs the two — the 6809 MUL leaves the HIGH byte of ' +
        'A*B in A, so the reduction is `(draw * wait) >> 8` — then `NEGA / ADDA PJOYT,Y` ' +
        '(JOUSTRV4.SRC:2892-2893) subtracts it. That is why the ROM calls it "1/2 OF THE ' +
        'RANGE": a draw capped at 127 can never take away half the wait.',
    )
  }
  return fn as (wait: number, draw: number) => number
}

// ─── Staging ─────────────────────────────────────────────────────────────────

const eggsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')
const enemiesIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')

/**
 * Enter `target` by clearing the arena each frame (the jt4-5 forced-advance idiom
 * jt9-38 reuses). The complement of the wave it lands on is spawned by the real
 * `spawnWaveEnemies`, so the eggs under test are the PRODUCT of the port's own
 * egg-wave path — never hand-staged, which is the only way the premature marking
 * can be observed at all.
 */
async function advanceTo(seed: number, target: number): Promise<DemoState> {
  const dmod = await loadDemo()
  let s = dmod.createWaveDemo(seed)
  for (let g = 0; s.wave < target && g < 200; g++) {
    s = dmod.stepDemo({
      ...s,
      sim: { ...s.sim, processes: s.sim.processes.filter((p) => p.kind === 'player') },
      events: [],
    })
  }
  if (s.wave !== target) throw new Error(`wave ${target} is not reachable on the BCD counter (stopped at ${s.wave})`)
  return s
}

/**
 * Strip the demo to its EGGS. Measured at RED: with no player and no enemy the
 * eggs still mature on schedule, the quota still bites (six hatch, six defer) and
 * the wave does not advance — the clear gate wants a player. So this isolates the
 * hatch timing from a remount buzzard jousting somebody three hundred frames in.
 */
const eggsOnly = (d: DemoState): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: d.sim.processes.filter((p) => p.kind === 'egg') },
})

/** The `waitFrames` each egg carries, keyed by id. */
function waitsById(d: DemoState): Map<number, number | undefined> {
  return new Map(eggsIn(d).map((p) => [p.id, p.egg?.waitFrames]))
}

/**
 * ONE step of a freshly-entered egg wave, reported as the wait each egg then
 * holds. The hatch pass writes `remaining = wait - 1` onto every settled egg it
 * passes, so one step is the earliest moment the resolved wait is READABLE — and
 * it is readable whether the port shortens at the deal or at the first resolve.
 * Nothing here assumes which.
 */
async function waitsAfterOneStep(seed: number, wave: number): Promise<Map<number, number | undefined>> {
  const dmod = await loadDemo()
  return waitsById(dmod.stepDemo(eggsOnly(await advanceTo(seed, wave))))
}

/** A settled KILL egg — a DEATH3 egg, NOT one an egg wave dealt (no `waveEgg`). */
function killEgg(id: number, posX = 180): DemoProcess {
  const egg: EggState = {
    posX,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 1,
    settled: true,
  }
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg }
}

function playerAt(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}

/**
 * Split a wave's twelve into the two PWHCH may touch and the ten it may not.
 * `wait` is asserted present on all twelve: an `undefined` here would mean the
 * hatch pass never resolved the egg at all, and every comparison below would
 * silently compare `undefined` to `undefined`.
 */
function splitFirstTwo(waits: Map<number, number | undefined>, wave: number): { two: number[]; ten: number[] } {
  const ids = eggIdsFor(wave)
  const at = (id: number): number => {
    const v = waits.get(id)
    expect(v, `egg 0x${id.toString(16)} carries no resolved wait after one step`).toBeTypeOf('number')
    return v as number
  }
  return { two: ids.slice(0, 2).map(at), ten: ids.slice(2).map(at) }
}

/** 32 distinct seeds. Odd stride so the low bits differ as well as the high ones. */
const SWEEP: readonly number[] = Array.from({ length: 32 }, (_, i) => 0x1000 + i * 0x0507)

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the shortening itself, pinned on SYNTHETIC (wait, draw) pairs
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-1 — prematureHatchWait: PJOYT minus the HIGH byte of VRAND x PEGGTM', () => {
  it('the four corners are exact — 0 takes nothing, 127 takes the most there is', async () => {
    // THE POINT OF SYNTHETIC INPUTS. No seeded run can tell `wait - (draw*wait>>8)`
    // from a dozen other plausible readings, because every real draw lands
    // somewhere in the middle of all of them. Fabricated pairs can
    // (`derived-vs-transcribed-needs-a-synthetic-input`). Expected values are
    // written as LITERALS, never as a second copy of the formula — a re-implemented
    // oracle in the test would agree with a re-implemented bug in production.
    //
    // KILLS `wait - draw` (624 at draw 127 would be 497, not 315), `wait -
    // (draw*wait>>7)` (5), `wait - draw*wait/128` (5), a constant `wait/2` (312),
    // and rounding the multiply up instead of truncating (draw 1 -> 621).
    const prematureHatchWait = await loadPrematureHatchWait()
    expect(prematureHatchWait(624, 0), 'a zero draw shortens by nothing at all').toBe(624)
    expect(prematureHatchWait(624, 1), 'floor(1 x 624 / 256) = 2').toBe(622)
    expect(prematureHatchWait(624, 64), 'floor(64 x 624 / 256) = 156 — exactly a quarter').toBe(468)
    expect(prematureHatchWait(624, MAX_DRAW), 'floor(127 x 624 / 256) = 309 — the deepest cut').toBe(315)
  })

  it('the cut scales with the WAIT, not with the draw alone', async () => {
    // `LDB PEGGTM,U` (JOUSTRV4.SRC:2886) is still in B when the MUL runs
    // (JOUSTRV4.SRC:2891) — the source companion proves nothing rewrites B in
    // between — so the multiplicand is the wave's own wait. A late wave's EGGWT2 is
    // a sixth of wave one's, and its pre-mature eggs must arrive proportionally
    // sooner rather than by the same absolute number of frames.
    // KILLS "subtract a random number of FRAMES" — under it these three would tie.
    const prematureHatchWait = await loadPrematureHatchWait()
    expect(prematureHatchWait(672, MAX_DRAW), 'wave 1: floor(127 x 672 / 256) = 333').toBe(339)
    expect(prematureHatchWait(336, MAX_DRAW), 'wave 35: floor(127 x 336 / 256) = 166').toBe(170)
    expect(prematureHatchWait(96, MAX_DRAW), 'wave 65: floor(127 x 96 / 256) = 47').toBe(49)
  })

  it('"1/2 OF THE RANGE" is an invariant, not a description — no draw can halve a wait', async () => {
    // The ROM's own comment on the MUL (JOUSTRV4.SRC:2891). It is a CONSEQUENCE of
    // the 0-127 cap meeting an 8-bit high-byte take, and it is the single property
    // that separates this from "shorten by a random slice of the wait": a pre-mature
    // egg is early, never instant. Swept over every draw the machine can produce.
    // KILLS any mapping that lets the draw reach 255 — at 255 the wait halves and
    // the assertion goes.
    const prematureHatchWait = await loadPrematureHatchWait()
    for (const wait of [96, 192, 336, 480, 624, 672]) {
      for (let draw = 0; draw <= MAX_DRAW; draw++) {
        const got = prematureHatchWait(wait, draw)
        expect(got, `wait ${wait} draw ${draw}: a shortened wait is never longer than the full one`).toBeLessThanOrEqual(wait)
        expect(got, `wait ${wait} draw ${draw}: and never as short as half`).toBeGreaterThan(wait / 2)
      }
    }
  })

  it('a bigger draw never gives a LONGER wait', async () => {
    // Monotonicity — cheap, and it kills a sign slip (`ADDA` where the ROM NEGAs
    // first, JOUSTRV4.SRC:2892) that the corner values alone would not catch if the
    // formula were also mis-scaled to compensate.
    const prematureHatchWait = await loadPrematureHatchWait()
    for (const wait of [96, 624]) {
      for (let draw = 1; draw <= MAX_DRAW; draw++) {
        expect(
          prematureHatchWait(wait, draw),
          `wait ${wait}: draw ${draw} must not wait longer than draw ${draw - 1}`,
        ).toBeLessThanOrEqual(prematureHatchWait(wait, draw - 1))
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — TWO of the twelve, and they are the first TWO DEALT
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-2 — PWHCH touches the first two eggs an egg wave deals, and no others', () => {
  it('the other TEN all carry one identical, unshortened wait', async () => {
    // THE COUNT, stated from the side that cannot be satisfied by accident. Asserting
    // "two are short" is satisfied by an implementation that shortens two of the ten
    // as well; asserting the TEN are untouched and mutually equal is not. Identity-
    // keyed, never "ten of them" — a count assertion passes on the wrong ten.
    //
    // KILLS N = 3 (the reading this story's own filing still carries in one
    // sentence: "the first three would arrive earlier"), N = 12 ("shorten every egg
    // in the wave"), and "shorten a RANDOM two of the twelve".
    const { two, ten } = splitFirstTwo(await waitsAfterOneStep(0x1234, EGG_WAVE), EGG_WAVE)
    expect(new Set(ten).size, `the ten PWHCH cannot reach must share one wait — got ${ten.join(',')}`).toBe(1)
    expect(two.length, 'and exactly two eggs are eligible at all').toBe(2)
  })

  it('the ten unshortened waits are the wave\'s own EGGWT2, so the control is the right control', async () => {
    // Without this the test above is satisfied by twelve eggs all sharing some OTHER
    // wrong wait. Counter 5 is decimal ordinal 5, the one wave where the BCD counter
    // and the ordinal coincide, so the expected value can be named here without
    // re-deriving td1-12's conversion.
    const dmod: DemoModule = await loadDemo()
    const { ten } = splitFirstTwo(await waitsAfterOneStep(0x1234, EGG_WAVE), EGG_WAVE)
    const full = dmod.eggWaitFrames('EGGWT2', EGG_WAVE)
    expect(full, 'EGGWT2 at wave 5, in display frames').toBe(624)
    expect(ten[0], 'and the untouched ten hold it, less the frame just stepped').toBe(full - 1)
  })

  it('EVERY egg wave re-arms — the SECOND one shortens two of its own', async () => {
    // `LDA #2 / STA PWHCH,U` (JOUSTRV4.SRC:2776-2777) is inside the egg-wave SETUP,
    // so the counter is re-primed every time an egg wave starts. The port must not
    // spend one game-long budget on the first egg wave it ever reaches.
    //
    // KILLS "shorten the first two eggs of the RUN" — under it wave 20 shows twelve
    // identical waits, because wave 5 already spent both. That mutant is why this
    // counts SHORTENED EGGS rather than asserting a bound: a bound like `<= full` is
    // satisfied by an egg that was never touched, so it could not tell the two
    // apart (`mutation-direction-must-be-restrictive`).
    //
    // Wave 20 is a COUNTER, not a decimal ordinal, so its EGGWT2 is read off its own
    // ten rather than named. It is reached THROUGH wave 5, which is the whole point.
    // The 8-seed floor is AC-4's reasoning at a smaller n: 16 draws, ~0.125 of them
    // expected to be a zero draw that shortens nothing, so 14 leaves ample room.
    let shortened = 0
    for (const seed of SWEEP.slice(0, 8)) {
      const waits = await waitsAfterOneStep(seed, EGG_WAVE_2)
      const { two, ten } = splitFirstTwo(waits, EGG_WAVE_2)
      expect(waits.size, `seed 0x${seed.toString(16)}: the second egg wave deals twelve too`).toBe(12)
      expect(new Set(ten).size, 'its ten untouched eggs share one wait').toBe(1)
      const full = ten[0] + 1
      for (const v of two) {
        expect(v + 1, 'a second-wave cut is drawn against THAT wave\'s wait, not wave 5\'s').toBeGreaterThanOrEqual(
          full - Math.floor((MAX_DRAW * full) / 256),
        )
        expect(v, 'and never lengthens it').toBeLessThanOrEqual(ten[0])
        if (v < ten[0]) shortened++
      }
    }
    expect(shortened, `only ${shortened} of 16 draws shortened anything at the SECOND egg wave`).toBeGreaterThanOrEqual(14)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — a KILL egg is never pre-mature, in any wave
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-3 — PWHCH is the egg WAVE\'s, and CREGG is its only spender', () => {
  it('a settled kill-egg in a NORMAL wave takes the full EGGWT', async () => {
    // CREGG has exactly two call sites and both are inside WAVEGG's placement loops
    // (proved in the source companion), so no other egg the game creates can ever
    // reach the DEC. A DEATH3 egg in a normal wave is the commonest of those.
    // KILLS "shorten the first two settled eggs to resolve a wait".
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(0x1234)
    const staged: DemoState = {
      ...base,
      wave: NON_EGG_WAVE,
      events: [],
      sim: { ...base.sim, processes: [playerAt(1, 20, 40), killEgg(0x1_0500), killEgg(0x1_0501)] },
    }
    const after = dmod.stepDemo(staged)
    const full = dmod.eggWaitFrames('EGGWT', NON_EGG_WAVE)
    expect(full, 'a landed egg takes EGGWT, not EGGWT2').toBe(744)
    for (const p of eggsIn(after)) {
      expect(p.egg?.waitFrames, `kill-egg 0x${p.id.toString(16)} must take the full landed wait`).toBe(full - 1)
    }
  })

  it('a kill-egg standing FIRST in an egg wave\'s own list is still not shortened', async () => {
    // The discriminating version. A natural implementation reaches for "the first two
    // eggs in the process list", which is right by accident while the twelve are
    // alone — so this puts a kill-egg AT THE FRONT of that list, inside the egg wave,
    // where the accident becomes visible.
    // KILLS "shorten the first two entries of `processes`" and "shorten the first two
    // eggs to appear in the wave, whatever their provenance".
    const dmod = await loadDemo()
    const at = eggsOnly(await advanceTo(0x1234, EGG_WAVE))
    const intruder = killEgg(0x1_0900)
    const staged: DemoState = { ...at, sim: { ...at.sim, processes: [intruder, ...at.sim.processes] } }
    const after = dmod.stepDemo(staged)
    const waits = waitsById(after)
    expect(waits.size, 'the twelve plus the intruder').toBe(13)
    expect(
      waits.get(intruder.id),
      'the intruder is a LANDED egg — EGGWT, at full length, however early it sits in the list',
    ).toBe(dmod.eggWaitFrames('EGGWT', EGG_WAVE) - 1)
    const { ten } = splitFirstTwo(waits, EGG_WAVE)
    expect(new Set(ten).size, 'and the wave\'s own ten are still untouched').toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — it is drawn, it is bounded, and it is not always nothing
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-4 — the draw, swept over 32 seeds', () => {
  it('EVERY seed: the two sit inside the ROM\'s window, and the ten never move', async () => {
    // The per-seed contract, stated as bounds so a zero draw cannot red it. The
    // window is derived from the ten — `full - floor(127 * full / 256)` — rather than
    // from a literal, because it must hold for whatever EGGWT2 the wave carries.
    //
    // KILLS "shorten by a draw over the FULL range" (values below half appear),
    // "shorten by a fixed 100 frames" once the window is tight enough at a short
    // wait, and any implementation that lengthens a wait instead of shortening it.
    for (const seed of SWEEP) {
      const { two, ten } = splitFirstTwo(await waitsAfterOneStep(seed, EGG_WAVE), EGG_WAVE)
      expect(new Set(ten).size, `seed 0x${seed.toString(16)}: the ten must stay identical`).toBe(1)
      const full = ten[0] + 1
      const floorWait = full - Math.floor((MAX_DRAW * full) / 256)
      for (const v of two) {
        expect(v + 1, `seed 0x${seed.toString(16)}: a pre-mature wait is never longer than the full one`).toBeLessThanOrEqual(full)
        expect(v + 1, `seed 0x${seed.toString(16)}: nor shorter than a 127 draw allows (${floorWait})`).toBeGreaterThanOrEqual(floorWait)
      }
    }
  })

  it('ACROSS the sweep it really shortens, and by a DIFFERENT amount each time', async () => {
    // The claim a per-seed bound cannot make: that anything happens at all. Stated as
    // a sweep total because a single seed may legitimately draw 0 — VRAND yields
    // 0-127, so 1 draw in 128 shortens by nothing and that egg is indistinguishable
    // from the ten. Over 32 seeds x 2 eggs = 64 draws, the expected number of zero
    // draws is 0.5; a floor of 60 leaves room for four of them, and still fails any
    // implementation that shortens less than 94% of the time.
    //
    // KILLS "no shortening at all" (0 of 64), a constant reduction (1 distinct
    // value), and one draw SHARED by both eggs — CREGG's `JSR VRAND` sits inside the
    // per-egg routine (JOUSTRV4.SRC:2890), so the two eggs get INDEPENDENT draws and
    // may not keep tying.
    let shortened = 0
    let tied = 0
    const distinct = new Set<number>()
    for (const seed of SWEEP) {
      const { two, ten } = splitFirstTwo(await waitsAfterOneStep(seed, EGG_WAVE), EGG_WAVE)
      for (const v of two) {
        if (v < ten[0]) {
          shortened++
          distinct.add(ten[0] - v)
        }
      }
      if (two[0] === two[1]) tied++
    }
    expect(shortened, `only ${shortened} of 64 draws shortened anything`).toBeGreaterThanOrEqual(60)
    expect(distinct.size, 'a constant reduction is not a draw').toBeGreaterThanOrEqual(8)
    expect(tied, `${tied} of 32 seeds gave the two eggs the SAME cut — they must be drawn separately`).toBeLessThan(8)
  })

  it('the draw CONSUMES the run\'s stream — the wave leaves the RNG somewhere else', async () => {
    // ADDED AT REVIEW, from the mutation battery. Measured: replacing `rng` with
    // `stepped.rng` in the sim this frame returns — so the two draws happen, shorten the
    // two waits correctly, and are then THROWN AWAY instead of moving the run's durable
    // word — left all 2657 tests green. Every other test in this file reads a WAIT, and a
    // wait is computed from a local that advances whether or not the result is kept.
    //
    // It matters because the consumption is the story's own reason for existing as a
    // separate story: PWHCH "draws from VRAND, so it moves the re-baseline a second time"
    // is why it was descoped from jt9-38. A shortening that does not advance the shared
    // generator leaves every later draw in the run exactly where it would have been
    // without PWHCH, which is not what `JSR VRAND` (JOUSTRV4.SRC:2890) does.
    //
    // "DID THE RNG MOVE?" WOULD BE VACUOUS — `stepFrame` advances it every frame anyway,
    // so the only honest question is whether it moved FURTHER than it would have. Hence
    // the twin: the same twelve eggs, one set as the wave dealt them, one rebuilt from
    // their own data through a field whitelist that drops whatever tag the deal added.
    // Same processes, same frame, same everything the scheduler can see.
    const dmod = await loadDemo()
    const dealt = eggsOnly(await advanceTo(0x1234, EGG_WAVE))
    const plain = (p: DemoProcess): DemoProcess => ({
      id: p.id, cls: p.cls, nap: p.nap, period: p.period, kind: p.kind, waveEgg: p.waveEgg, egg: p.egg,
    })
    const untagged: DemoState = { ...dealt, sim: { ...dealt.sim, processes: dealt.sim.processes.map(plain) } }

    const withPwhch = dmod.stepDemo(dealt)
    const without = dmod.stepDemo(untagged)

    // The fixtures really are the same twelve eggs, or the comparison below is between
    // two different runs and proves nothing.
    expect(eggsIn(dealt).length, 'twelve dealt eggs').toBe(12)
    expect(eggsIn(untagged).map((p) => p.id), 'and the twin holds the same twelve ids').toEqual(
      eggsIn(dealt).map((p) => p.id),
    )
    // CONTROL — the twin has no pre-mature eggs at all, so its twelve share one wait.
    // Without this the rng difference below could come from the twin being broken.
    expect(new Set(eggsIn(without).map((p) => p.egg?.waitFrames)).size, 'the untagged twelve are uniform').toBe(1)

    expect(
      withPwhch.sim.rng,
      'the two VRAND draws must leave the run\'s durable word somewhere the untagged run never reaches',
    ).not.toBe(without.sim.rng)

    // And it is not simply nondeterministic: the same input replays to the same word.
    expect(dmod.stepDemo(dealt).sim.rng, 'the advance is deterministic, not entropy').toBe(withPwhch.sim.rng)
  })

  it('DETERMINISM — the same seed gives the same two waits, twice over', async () => {
    // The story's own constraint: "drawn from the run's seeded RNG so it stays
    // deterministic". Core mints no entropy (the jt1-7 purity law), and this is the
    // behavioural half of that — a `Math.random()` would pass every other test in
    // this file and fail only here.
    for (const seed of [0x1234, 0xbeef]) {
      const a = splitFirstTwo(await waitsAfterOneStep(seed, EGG_WAVE), EGG_WAVE)
      const b = splitFirstTwo(await waitsAfterOneStep(seed, EGG_WAVE), EGG_WAVE)
      expect(b.two, `seed 0x${seed.toString(16)} must replay exactly`).toEqual(a.two)
    }
  })

  it('and a DIFFERENT seed generally gives different waits', async () => {
    // The other half: a "deterministic" implementation that ignores the seed
    // entirely — a hash of the egg index, say — replays perfectly and is not a draw.
    // Asserted over the sweep rather than on one pair, so the 1-in-128 chance of two
    // particular seeds agreeing cannot red it.
    const firstWaits = new Set<number>()
    for (const seed of SWEEP) {
      const { two } = splitFirstTwo(await waitsAfterOneStep(seed, EGG_WAVE), EGG_WAVE)
      firstWaits.add(two[0])
    }
    expect(firstWaits.size, 'the first egg\'s wait must track the run\'s RNG, not its index').toBeGreaterThanOrEqual(8)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the shortened wait is really SPENT: the pile-up breaks up
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-5 — the wave no longer matures in one lump (JOUSTRV4.SRC:2776-2777, in play)', () => {
  it('exactly the two PWHCH chose beat the bulk — nobody else, and not nobody', async () => {
    // The behavioural end of the mechanism: a shortened wait that never reaches the
    // hatch pass is a number in a field. Measured at RED: all twelve mature together
    // at f = spawn + 624 (SIX hatch there, six defer on jt9-38's quota), so today
    // NOTHING beats the bulk and the early set is empty on every seed.
    //
    // THE BOUNDARY, because it is one frame wide and getting it wrong makes this
    // test meaningless in the direction that still shows red. An egg entered at
    // frame `spawn` with wait `full` reaches zero on the step that lands on
    // `spawn + full`; "early" is therefore everything up to `spawn + full - 1`, and
    // a loop that runs one step further sweeps the entire bulk into the early set —
    // measured, that reads `6 <= 2` and reds for a reason having nothing to do with
    // PWHCH.
    //
    // Two claims, and the second is the one that reds today: the early hatchers are
    // ONLY ever the two eggs PWHCH touched (identity, never a count — an early hatch
    // by any other egg is a different mechanism wearing this one's result), and
    // there ARE early hatchers. The floor is AC-4's reasoning at n=16 draws.
    // KILLS N = 3+, "shorten a random egg", and "compute the cut but never spend it".
    const dmod = await loadDemo()
    const eligible = new Set(eggIdsFor(EGG_WAVE).slice(0, 2))
    let earlyTotal = 0
    for (const seed of SWEEP.slice(0, 8)) {
      let d = eggsOnly(await advanceTo(seed, EGG_WAVE))
      const bulk = d.sim.frame + dmod.eggWaitFrames('EGGWT2', EGG_WAVE)
      // jt9-25 — "beats the bulk" now means BEGINS THE HATCH CUTSCENE early (hatchRow
      // set), not disappears: a matured egg lingers as an egg for EGG_HATCH_ANIM_FRAMES.
      // The maturation frame is unchanged, so the boundary reasoning above still holds;
      // only the observable moved from id-disappearance to hatchRow being set.
      const started = new Set<number>()
      const early: number[] = []
      while (d.sim.frame < bulk - 1) {
        d = dmod.stepDemo(d)
        for (const p of eggsIn(d)) {
          if (p.egg?.hatchRow !== undefined && !started.has(p.id)) {
            started.add(p.id)
            early.push(p.id)
          }
        }
      }
      expect(early.length, `seed 0x${seed.toString(16)}: more than two eggs beat the bulk`).toBeLessThanOrEqual(2)
      for (const id of early) {
        expect(eligible.has(id), `egg 0x${id.toString(16)} hatched early and PWHCH never touched it`).toBe(true)
      }
      earlyTotal += early.length
    }
    expect(earlyTotal, `only ${earlyTotal} of 16 pre-mature eggs actually arrived early`).toBeGreaterThanOrEqual(14)
  })

  it('the quota still admits exactly SIX in total — jt9-38\'s gate is not loosened', async () => {
    // The regression this story is most likely to cause. Staggering the maturities
    // changes WHICH eggs meet the population test and WHEN, and an early hatch that
    // slipped past the gate would show up here as a seventh remount. WENEMY is 6 at
    // wave 5 (JOUSTRV4.SRC:2744-2759), so six eggs must still be sitting deferred one
    // frame after the bulk matures, whatever order they got there in.
    // KILLS "apply the shortening AFTER the population test" and any hatch that
    // bypasses the gate for a pre-mature egg.
    const dmod = await loadDemo()
    for (const seed of SWEEP.slice(0, 8)) {
      let d = eggsOnly(await advanceTo(seed, EGG_WAVE))
      // jt9-25 — step past the whole EGGMAN cutscene so every matured egg has become
      // its buzzard. The quota must STILL be six even though matured eggs spend
      // EGG_HATCH_ANIM_FRAMES as mid-cutscene eggs: during that window they must keep
      // counting toward NENEMY, or a deferred egg re-polling into a seemingly-empty
      // arena would hatch past the gate. This step-through is what proves it.
      const until =
        d.sim.frame + dmod.eggWaitFrames('EGGWT2', EGG_WAVE) + dmod.EGG_HATCH_ANIM_FRAMES + 1
      while (d.sim.frame < until) d = dmod.stepDemo(d)
      expect(enemiesIn(d).length, `seed 0x${seed.toString(16)}: the quota admits six remounts, no more`).toBe(6)
      expect(eggsIn(d).length, 'and the other six are still eggs, deferred').toBe(6)
    }
  })
})
