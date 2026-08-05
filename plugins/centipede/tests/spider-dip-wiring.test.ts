// plugins/centipede/tests/spider-dip-wiring.test.ts
//
// Story cp7-5 (RED, Han Solo/TEA) — THE OPTNS DIFFICULTY DIP IS DECLARED AND
// NEVER PASSED. src/core/spider.ts ALREADY reads `easy` at BOTH consumers: the
// score-speed gate (createSpider, "opts.easy ? SPIDER_GATE_EASY : SPIDER_GATE_HARD")
// and the per-turn V-reversal mask (stepSpider, "(opts.easy ? 0x40 : 0x00) |
// SPIDER_VDIR_MASK"). tests/spider.test.ts:285-307 and :1416-1438 already exercise
// both — by passing `easy` DIRECTLY into the pure functions. What no test and no
// PRODUCER does is SET it in live play: sim.ts builds the SpiderStepCtx at the
// stepSpider call site without `easy`, and calls createSpider (init + death
// respawn) with no opts, so `ctx.easy` is forever `undefined` and the clone runs
// the HARD branch permanently. That is the defect the player felt as "much too
// fast" — the fast spider from 1,100 pts (vs 5,100) and half the zig-zag.
//
// These tests therefore observe PLAY through createSim/stepSim ONLY — never the
// pure function — and fail until the DIP is threaded from a SIM-LEVEL option into
// both consumers (AC1), with EASY as the default (AC4, the cp7-5 product ruling).
//
// TEST-DEFINED SEAM: the sim-level DIP enters through an optional second arg on
// createSim, `createSim(seed, { easy?: boolean })`, defaulting to EASY. It is
// optional so every existing `createSim(seed)` caller keeps compiling. Dev may
// choose the internal representation freely, but createSim must accept it and it
// must reach BOTH spider consumers AND survive a death respawn. (Delivery Finding:
// the restart path in sim.ts — `...createSim(state.rng.seed)` — must thread the DIP
// too, or a restart silently reverts to HARD.)
//
// Byte facts, hand-mirrored from the source so the expectations self-check:
//   CENTI4.MAC:258-262 — gate byte (OPTNS & 40) | 10 vs SCORE1: fast above 1000
//     (HARD) or 5000 (EASY) points. At 2,000 pts: HARD is fast, EASY is slow.
//   CENTI4.MAC:332-336 — reversal mask (OPTNS & 40) | 20: one bit HARD (reverse
//     ~1/2), two bits EASY (reverse ~3/4). At score 0 the gate is slow for BOTH
//     positions, so the mask is the ONLY thing that can make an easy sim diverge
//     from a hard one — which isolates the reversal-mask consumer end to end.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SPIDER_DV_FAST, SPIDER_DV_SLOW, spiderTopLimit } from '../src/core/spider'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// Ceiling constants, hand-mirrored (:391-396) — kept local so the AC6 guard is
// self-checking rather than an echo of the module under test.
const SPIDER_TOP_BASE = 0x60 // :396 "LDA I,60"
const SPIDER_TOP_STEP = 8 // :392-394 three ASLs

const IDLE = { dh: 0, dv: 0, fire: false } as unknown

interface SimLike {
  score: number
  spider: {
    h: number
    v: number
    dh: number
    dv: number
    pic: number
    count2: number
    count: number
    oldDh: number
    pts: number
  }
}

async function loadSim(): Promise<{
  createSim: (seed: number, opts?: { easy?: boolean }) => SimLike
  stepSim: (s: unknown, i: unknown) => SimLike
}> {
  const sim = (await import('../src/core/sim')) as Record<string, unknown>
  return {
    createSim: sim.createSim as (seed: number, opts?: { easy?: boolean }) => SimLike,
    stepSim: sim.stepSim as (s: unknown, i: unknown) => SimLike,
  }
}

describe('cp7-5 — the OPTNS difficulty DIP must reach live play, defaulting to EASY', () => {
  it('AC1 (reversal-mask consumer) + AC2 + AC4: the DIP changes play and its DEFAULT is EASY', async () => {
    const { createSim, stepSim } = await loadSim()

    // Score stays 0 across an idle run, so the speed gate is SLOW for BOTH DIP
    // positions and the ONLY possible source of divergence is the wider EASY
    // reversal mask (:332-336). Recording the spider's V each frame captures it.
    const vTrace = (seed: number, opts?: { easy?: boolean }): number[] => {
      let s = createSim(seed, opts)
      const vs: number[] = []
      for (let i = 0; i < 600; i++) {
        s = stepSim(s, IDLE)
        vs.push(s.spider.v)
      }
      return vs
    }

    let seedsWhereDipMatters = 0
    for (let seed = 1; seed <= 6; seed++) {
      const dflt = vTrace(seed)
      const easy = vTrace(seed, { easy: true })
      const hard = vTrace(seed, { easy: false })

      // The ruling: the DEFAULT sim IS the EASY DIP, seed for seed.
      expect(dflt, `seed ${seed}: the default sim must play IDENTICALLY to the EASY DIP (cp7-5 ruling)`).toEqual(easy)

      if (JSON.stringify(easy) !== JSON.stringify(hard)) seedsWhereDipMatters++
    }

    // The DIP must actually reach play: an easy sim cannot be byte-identical to a
    // hard one over every seed. Today createSim ignores the option, so easy and
    // hard are the same run and this is 0 (RED). Combined with default==easy above,
    // it also proves the default is NOT the HARD branch the player complained about.
    expect(
      seedsWhereDipMatters,
      'the OPTNS DIP never changed spider play across 6 seeds — the sim-level option is not wired into the reversal mask',
    ).toBeGreaterThan(0)
  })

  it('AC1 (score-gate consumer) + AC4: the DEFAULT (easy) sim spawns a SLOW spider at 2,000 pts where HARD spawns a fast one', async () => {
    const { createSim, stepSim } = await loadSim()

    // Force the walk-off re-park (BUGOFF, spider.ts "if (s.h >= SPIDER_OFF_H)")
    // on the very next frame: a WALKING spider at h=0xFE stepping `h -= dh` with
    // dh=-1 lands on 0xFF and re-parks. BUGOFF re-creates it reading the CURRENT
    // score through the SAME ctx the sim built at the stepSpider call site — so
    // the re-parked spider's speed reports which DIP position reached live play.
    // count2 is high so the direction-change branch is skipped and the step is a
    // clean walk-off; the pre-step dh/dv are irrelevant (BUGOFF overwrites them).
    const respawnSpeed = (opts?: { easy?: boolean }): number => {
      const base = createSim(0x51de, opts)
      const aboutToWalkOff = {
        h: 0xfe,
        v: 0x40,
        dh: -1,
        dv: 1,
        pic: 0x14, // a walking face — not the parked 0xF8 — so BUGMV moves it
        count2: 0x30,
        count: 0,
        oldDh: -1,
        pts: base.spider.pts,
      }
      const s = stepSim({ ...base, score: 2000, spider: aboutToWalkOff } as unknown, IDLE)
      return Math.abs(s.spider.dv)
    }

    // Control: HARD is already the fast spider at 2,000 pts (gate threshold 1,100).
    expect(respawnSpeed({ easy: false }), 'HARD DIP: the fast spider has already arrived by 2,000 pts').toBe(
      SPIDER_DV_FAST,
    )
    // EASY defers the fast spider to 5,100 pts, so at 2,000 it is still slow.
    expect(respawnSpeed({ easy: true }), 'EASY DIP: still the slow spider at 2,000 pts (gate threshold 5,100)').toBe(
      SPIDER_DV_SLOW,
    )
    // The ruling: the default is EASY, so the default sim spawns the SLOW spider.
    expect(
      respawnSpeed(),
      'DEFAULT must be the EASY DIP (cp7-5 ruling): a slow spider at 2,000 pts, not the fast one the player felt',
    ).toBe(SPIDER_DV_SLOW)
  })

  it('AC5: the stale "DIP is not modelled" comment in spider.ts is corrected', () => {
    // The stale sentence spans TWO `//` lines in the source ("...anywhere in the\n
    // // sim yet"), so a raw substring search misses it and passes vacuously.
    // Normalize by dropping `//` markers and collapsing whitespace, so a rewrapped
    // comment is still caught.
    const flatten = (s: string): string => s.replace(/\/\//g, ' ').replace(/\s+/g, ' ')
    const STALE = 'The DIP itself is not modelled anywhere in the sim yet'

    // Scanner self-check on the ACTUAL wrapped shape this comment has in the
    // source — a guard that cannot fire on the real layout guards nothing.
    const wrapped = 'or 5000 (easy). The DIP itself is not modelled anywhere in the\n// sim yet, so it is'
    expect(flatten(wrapped).includes(STALE), 'scanner catches the two-line wrapped phrase').toBe(true)

    const src = flatten(readFileSync(join(repoRoot, 'src/core/spider.ts'), 'utf8'))
    expect(
      src.includes(STALE),
      'spider.ts still claims the DIP is not modelled in the sim — cp7-5 models it; correct this comment (AC5)',
    ).toBe(false)
  })

  it('AC6: our port already MODELS the 60K score-driven spider ceiling (:380-399) — confirmed PRESENT', () => {
    // Stated either way, as AC6 asks: it is PRESENT — spiderTopLimit implements the
    // BCD-biased, halved, 8-per-step, 5-step-capped ceiling. This guards it against
    // regression while cp7-5 threads the (separate) OPTNS difficulty DIP.
    expect(spiderTopLimit(0), 'no ceiling drop before the 60K datum').toBe(SPIDER_TOP_BASE)
    // The halving means the first actual step is at 80,000, not 60,000 (faithful quirk).
    expect(spiderTopLimit(60000), 'no drop AT 60K — the arithmetic begins here, the drop does not').toBe(
      SPIDER_TOP_BASE,
    )
    expect(spiderTopLimit(80000), 'first actual step down at 80K').toBe(SPIDER_TOP_BASE - SPIDER_TOP_STEP)
    expect(spiderTopLimit(600000), 'clamped at 5 steps (:391 "LDA I,5")').toBe(
      SPIDER_TOP_BASE - 5 * SPIDER_TOP_STEP,
    )
  })
})
