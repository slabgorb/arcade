// plugins/missile-command/tests/explosion.test.ts
//
// Story mc1-4 — RED phase (Han Solo / TEA). AC1 (blast half): the detonation as a
// PURE core reducer. `src/core/explosion.ts` models the expanding-then-collapsing
// blast circle an arrived ABM leaves at the target: radius starts at 0, GROWS to a
// maximum, then COLLAPSES back to 0, deterministically over ticks, at which point
// the explosion is done. Core owns the geometry; render.ts paints the circle.
//
// ─── GROUND TRUTH (REV-01) — CITATION BASIS DIFFERS BY FILE (see citations-source
//     .test.ts): W3MAIN is DOUBLE-SPACED, so its cites are LOGICAL non-blank lines
//     (annotated `phys N` below); W3COMN cites are PHYSICAL lines. grep `.SBTTL`/
//     labels with `grep -a`, not the raw physical line. ──
//   PROCESS EXPLOSIONS   W3MAIN:906 (PREXPL, phys 1811) — each explosion carries a
//     time index (EXTIME) that walks a radius table and finishes when it reaches
//     EXDONE. The radius-vs-time table IS in this routine:
//         OLDRAD: .BYTE 0,0,2,3,4,5,6,7,8,9,10.,11.,12.,13.
//                 .BYTE 13.,12.,11.,10.,9,8,7,6,5,4,3,2,1,0,0
//     i.e. radius climbs 0→13 then falls 13→0 — a single peak of 13. (Radix: a
//     trailing `.` is decimal; the bare 0-9 are hex == decimal here.)
//   DRAW A CIRCLE        W3MAIN:2503 (phys 5005) — renders a circle of that radius.
//   EXDONE = 27.         W3COMN:225 (physical) — "EXPLOSION DIAMETER"; the time index at which
//     the blast is finished. Diameter 27 ⇒ radius ≈ 13 == the OLDRAD peak. The
//     skeleton pins those two source facts: MAX_BLAST_RADIUS = 13 and EXDONE = 27.
//
// mc1-4's skeleton pinned only the SHAPE and the two cited constants — a symmetric
// triangle grow 0→MAX→0 — deferring the exact OLDRAD per-tick curve and the EXPFRA
// update cadence to mc9. The shape tests below (single peak, grows-and-shrinks,
// never exceeds 13, finishes after collapse) still hold for the authentic curve and
// remain the SHAPE floor.
//
// ─── mc9-3 (Han Solo / TEA) — RETIRE THE TRIANGLE ────────────────────────────
// mc9-3 replaces the triangle with the byte-exact OLDRAD radius-vs-time table AND
// the EXPFRA update cadence, both decoded from PROCESS EXPLOSIONS (PREXPL, phys
// W3MAIN.MAC:1811). Two authentic facts the triangle got wrong:
//   • OLDRAD is ASYMMETRIC and PLATEAUED, not a linear triangle:
//         idx: 0 1 2 3 …            13 14 …               26 27
//         rad: 0 0 2 3 4 5 6 7 8 9 10 11 12 13 13 12 …  2 1 0 0
//     It holds 0 for TWO steps then JUMPS to 2 (skips 1 on the rise), HOLDS 13 for
//     two steps at the peak, and carries a lone 1 on the collapse that the mirror
//     rise never had. `W3MAIN.MAC:1917-1919` (physical; the table spans two `.BYTE`
//     rows across the double-spaced blank at 1918).
//   • EXPFRA cadence: the ROM advances an explosion's time index ONCE EVERY 5 game
//     frames (each frame updates one of 5 round-robin batches; `EXPFIX:.BYTE
//     -1,3,7,11,15,19` at W3MAIN.MAC:1911, timer reset EXPEND-EXPFIX-2 = 4 ⇒ a
//     5-frame cycle). Our core steps once per video frame (game.ts:120 calls
//     stepExplosion once per stepGame), so the faithful model samples OLDRAD at
//     index = floor(t / 5): the blast lives EXDONE·5 = 135 frames, ~5× the
//     triangle's 26 — the triangle ran the blast 5× too fast.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/explosion.ts` today is the mc1-4 triangle (`Math.min(t, LIFETIME-t)`,
// LIFETIME = EXDONE-1). Against the authentic curve+cadence it diverges at nearly
// every tick (radius at frame 10 is 10, not OLDRAD[2]=2; it advances every frame,
// not every 5th; it finishes at frame 26, not 135; its peak is a spike, not a
// two-step plateau). GREEN (Yoda) ports OLDRAD + the 5-frame cadence, backs the new
// constants with a byte-exact claim (so citations.test.ts's AC3 no-uncited-literal
// guard stays green), and cites PROCESS EXPLOSIONS / EXPFRA. Purity is guarded by
// the src/core sweep (purity.test.ts) — not re-asserted here.
//
// The "source ground truth" describe at the bottom reads the vendored W3COMN.MAC /
// W3MAIN.MAC directly (data, not code) and is GREEN from day one: it proves 27 and
// 13 really decode from the ROM, so a later "fix" that drifts either constant away
// from what Atari shipped reddens against the source, not against a human.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/explosion.ts ───────

/** A blast in progress at a fixed cabinet point. `t` = ticks since detonation. */
interface Explosion {
  readonly h: number
  readonly v: number
  readonly t: number
}

interface ExplosionModule {
  /** Explosion time index at which the blast is finished — EXDONE, W3COMN:225 (27). */
  EXDONE: number
  /** Peak blast radius — the OLDRAD table maximum, W3MAIN:906 (13). */
  MAX_BLAST_RADIUS: number
  /** Detonate at (h, v): t = 0, radius 0, not done. Pure. */
  startExplosion: (h: number, v: number) => Explosion
  /** Advance one tick (t + 1). Pure, non-mutating. */
  stepExplosion: (exp: Explosion) => Explosion
  /** The blast radius at this explosion's current time: 0 → MAX → 0. Pure. */
  blastRadius: (exp: Explosion) => number
  /** True once the blast has expanded and collapsed back to nothing. Pure. */
  isExplosionDone: (exp: Explosion) => boolean
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` stays green while
// explosion.ts is still absent — the fleet RED-import idiom.
const EXPLOSION_SPECIFIER = '../src/core/explosion.js'

async function loadExplosion(): Promise<ExplosionModule> {
  try {
    const mod = (await import(/* @vite-ignore */ EXPLOSION_SPECIFIER)) as Partial<ExplosionModule>
    if (
      typeof mod.startExplosion !== 'function' ||
      typeof mod.stepExplosion !== 'function' ||
      typeof mod.blastRadius !== 'function' ||
      typeof mod.isExplosionDone !== 'function'
    ) {
      throw new Error('module is missing one of startExplosion/stepExplosion/blastRadius/isExplosionDone')
    }
    return mod as ExplosionModule
  } catch (e) {
    throw new Error(
      'explosion core module not built yet — GREEN (Yoda) creates src/core/explosion.ts, a PURE ' +
        'module exporting EXDONE (27, W3COMN:225), MAX_BLAST_RADIUS (13, the OLDRAD peak, ' +
        'W3MAIN PROCESS EXPLOSIONS :906), startExplosion(h,v) {t:0}, stepExplosion (t+1), ' +
        'blastRadius(exp) that GROWS from 0 to MAX_BLAST_RADIUS then COLLAPSES to 0 over ticks, ' +
        'and isExplosionDone(exp) that flips true once it has collapsed. No shell import, no clock, ' +
        `no entropy (purity.test.ts sweeps it). (${(e as Error).message})`,
    )
  }
}

// Expected constants, transcribed from source. The "source ground truth" describe
// proves these against the ROM so a typo here cannot pass by matching a typo in
// explosion.ts.
const EXDONE = 27
const MAX_BLAST_RADIUS = 13

// mc9-3 — the authentic OLDRAD radius-vs-time table (W3MAIN.MAC:1917-1919) and the
// EXPFRA update cadence (W3MAIN.MAC:1911). Both are re-derived from the vendored
// source in the "source ground truth" describe at the bottom, so a typo here cannot
// pass by matching a typo in explosion.ts — the table below is the EXPECTED value,
// the parse down there is the WITNESS.
const OLDRAD: readonly number[] = [
  0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, // rise (index 0..13): 0,0 then skips 1
  13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, // fall (index 14..28): holds 13, carries a lone 1
]
/** Game frames per OLDRAD index step — EXPEND-EXPFIX-2 = 4 ⇒ a 5-frame cycle. */
const EXPFRA_FRAMES = 5
/** The blast's full lifetime in game frames: EXDONE index steps × the cadence. */
const LIFETIME_FRAMES = EXDONE * EXPFRA_FRAMES // 135
/** The authentic radius at game-frame t: OLDRAD sampled at index = floor(t / cadence). */
const authenticRadius = (t: number): number => {
  const idx = Math.floor(t / EXPFRA_FRAMES)
  return idx >= EXDONE ? 0 : OLDRAD[idx]
}

/** Walk a fresh blast to completion; return the radius at each tick from t=0. */
const radiusCurve = (mod: ExplosionModule, cap = 2 * LIFETIME_FRAMES): number[] => {
  const radii: number[] = []
  let exp = mod.startExplosion(100, 120)
  for (let i = 0; i < cap; i++) {
    radii.push(mod.blastRadius(exp))
    if (mod.isExplosionDone(exp)) break
    exp = mod.stepExplosion(exp)
  }
  return radii
}

describe('AC1 — the cited constants are exported', () => {
  it('EXDONE is the explosion diameter/lifetime 27 (W3COMN:225)', async () => {
    const m = await loadExplosion()
    expect(m.EXDONE).toBe(EXDONE)
  })

  it('MAX_BLAST_RADIUS is the OLDRAD peak 13 (W3MAIN:906)', async () => {
    const m = await loadExplosion()
    expect(m.MAX_BLAST_RADIUS).toBe(MAX_BLAST_RADIUS)
  })
})

describe('AC1 — startExplosion detonates a fresh blast at the target point', () => {
  it('sets the point, starts at t=0, radius 0, and is not done', async () => {
    const { startExplosion, blastRadius, isExplosionDone } = await loadExplosion()
    const exp = startExplosion(140, 88)
    expect(exp.h).toBe(140)
    expect(exp.v).toBe(88)
    expect(exp.t).toBe(0)
    expect(blastRadius(exp)).toBe(0)
    expect(isExplosionDone(exp)).toBe(false)
  })
})

describe('AC1 — the blast EXPANDS to a maximum then COLLAPSES to nothing', () => {
  it('the radius reaches exactly MAX_BLAST_RADIUS and never exceeds it', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    expect(Math.max(...curve), 'the peak must be exactly the cited OLDRAD maximum').toBe(
      MAX_BLAST_RADIUS,
    )
    for (const r of curve) {
      expect(r, 'blast radius may never exceed the cited peak').toBeLessThanOrEqual(MAX_BLAST_RADIUS)
      expect(r, 'blast radius is never negative').toBeGreaterThanOrEqual(0)
    }
  })

  it('starts at 0, rises to the peak, then falls back to 0 (a single peak)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    expect(curve[0], 'a fresh blast has zero radius').toBe(0)
    expect(curve[curve.length - 1], 'a finished blast has collapsed to nothing').toBe(0)

    const peakIdx = curve.indexOf(MAX_BLAST_RADIUS)
    expect(peakIdx, 'the peak radius must be reached at some tick').toBeGreaterThan(0)

    // Monotonic up to the (first) peak …
    for (let i = 1; i <= peakIdx; i++) {
      expect(curve[i], `radius dipped while still expanding at tick ${i}`).toBeGreaterThanOrEqual(
        curve[i - 1],
      )
    }
    // … then monotonic down to zero (never grows again — no second bloom).
    for (let i = peakIdx + 1; i < curve.length; i++) {
      expect(curve[i], `radius grew again while collapsing at tick ${i}`).toBeLessThanOrEqual(
        curve[i - 1],
      )
    }
  })

  it('the blast both grows and shrinks (it is not a monotone ramp)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    const grew = curve.some((r, i) => i > 0 && r > curve[i - 1])
    const shrank = curve.some((r, i) => i > 0 && r < curve[i - 1])
    expect(grew, 'radius never increased — the blast did not expand').toBe(true)
    expect(shrank, 'radius never decreased — the blast did not collapse').toBe(true)
  })
})

describe('AC1 — isExplosionDone: the blast finishes exactly once, after it collapses', () => {
  it('is not done until the radius has returned to 0 past the peak', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(50, 60)
    let sawPeak = false
    for (let i = 0; i < 2 * LIFETIME_FRAMES && !mod.isExplosionDone(exp); i++) {
      if (mod.blastRadius(exp) === MAX_BLAST_RADIUS) sawPeak = true
      // While not done, if we've already peaked the radius must be shrinking-or-zero,
      // never still at max forever: guards against "done" that never triggers.
      exp = mod.stepExplosion(exp)
    }
    expect(sawPeak, 'the blast was declared done without ever reaching peak radius').toBe(true)
    expect(mod.isExplosionDone(exp), 'the blast never became done within its lifetime').toBe(true)
    expect(mod.blastRadius(exp), 'a done blast has zero radius').toBe(0)
  })

  it('finishes after EXDONE index steps at the EXPFRA cadence (~135 frames, not the triangle 26)', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(0, 0)
    let ticks = 0
    while (!mod.isExplosionDone(exp) && ticks < 2 * LIFETIME_FRAMES) {
      exp = mod.stepExplosion(exp)
      ticks++
    }
    expect(mod.isExplosionDone(exp)).toBe(true)
    // EXDONE (27) index steps × the 5-frame EXPFRA cadence = 135 frames. The mc1-4
    // triangle finished in EXDONE-1 = 26 frames — 5× too fast. Bound it tightly so a
    // regression back to a per-frame index (any cadence < 5) reddens here.
    expect(ticks, 'the blast must live its full EXPFRA-paced lifetime').toBe(LIFETIME_FRAMES)
  })

  it('stays done and at radius 0 once finished (stepping past the end is safe)', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(10, 10)
    while (!mod.isExplosionDone(exp)) exp = mod.stepExplosion(exp)
    for (let i = 0; i < 5; i++) {
      exp = mod.stepExplosion(exp)
      expect(mod.isExplosionDone(exp)).toBe(true)
      expect(mod.blastRadius(exp)).toBe(0)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// mc9-3 AC1 — the EXACT OLDRAD per-tick curve (retire the triangle)
// The natural, faithful core model: t = video frames, index = floor(t / cadence),
// radius = OLDRAD[index] until the index reaches EXDONE. Sampled at the start of
// each cadence window so the assertion reads OLDRAD[step] directly.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc9-3 AC1 — blastRadius walks the exact OLDRAD table, not a symmetric triangle', () => {
  it('radius at each cadence step equals OLDRAD[step]: 0,0,2,3,…,13,13,…,2,1 then done', async () => {
    const { startExplosion, stepExplosion, blastRadius } = await loadExplosion()
    let exp = startExplosion(100, 120)
    for (let step = 0; step < EXDONE; step++) {
      expect(
        blastRadius(exp),
        `OLDRAD step ${step} (frame ${step * EXPFRA_FRAMES}) must be the cited table value, ` +
          `not the triangle's Math.min(t, LIFETIME-t)`,
      ).toBe(OLDRAD[step])
      for (let f = 0; f < EXPFRA_FRAMES; f++) exp = stepExplosion(exp)
    }
    expect(blastRadius(exp), 'once the index reaches EXDONE the blast is finished (radius 0)').toBe(0)
  })

  it('the rise SKIPS 1: radius holds 0 for two steps then jumps to 2 (0,0,2 — never 0,1,2)', async () => {
    const { startExplosion, stepExplosion, blastRadius } = await loadExplosion()
    // Sample the first three cadence steps.
    const at = (step: number): number => {
      let exp = startExplosion(0, 0)
      for (let f = 0; f < step * EXPFRA_FRAMES; f++) exp = stepExplosion(exp)
      return blastRadius(exp)
    }
    expect([at(0), at(1), at(2)], 'the authentic rise is 0,0,2 — the triangle would give 0,1,2').toEqual([0, 0, 2])
  })

  it('radius 1 appears ONLY on the collapse, never on the rise (the table is asymmetric)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    const peakIdx = curve.indexOf(MAX_BLAST_RADIUS)
    expect(peakIdx, 'the peak must be reached').toBeGreaterThan(0)
    const rise = curve.slice(0, peakIdx)
    const fall = curve.slice(peakIdx)
    expect(rise.includes(1), 'the rise skips radius 1 (0,0,2,…) — a triangle would include it').toBe(false)
    expect(fall.includes(1), 'the collapse carries a lone radius 1 (…,2,1,0) the rise never had').toBe(true)
  })

  it('holds the peak radius 13 for TWO index steps (a plateau, not a single-frame spike)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    // OLDRAD peaks at idx 13 AND 14, so at the 5-frame cadence the radius sits at 13
    // for a full 2·EXPFRA_FRAMES = 10 consecutive frames.
    const peakFrames = curve.filter((r) => r === MAX_BLAST_RADIUS).length
    expect(
      peakFrames,
      'the OLDRAD plateau (idx 13 and 14) means 13 is held for two cadence steps = 10 frames',
    ).toBe(2 * EXPFRA_FRAMES)
  })

  it('the last non-zero radius before finishing is 1 (OLDRAD[26]), not 0', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    const lastNonZero = [...curve].reverse().find((r) => r > 0)
    expect(lastNonZero, 'the blast winks out from radius 1, per OLDRAD[26]=1').toBe(1)
  })

  it('every frame of the blast matches authenticRadius(t) exactly (whole-curve pin)', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(60, 60)
    for (let t = 0; t <= LIFETIME_FRAMES; t++) {
      expect(mod.blastRadius(exp), `blastRadius at frame ${t}`).toBe(authenticRadius(t))
      exp = mod.stepExplosion(exp)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// mc9-3 AC1 — the EXPFRA update cadence: the radius index advances once per 5 frames
// ═════════════════════════════════════════════════════════════════════════════
describe('mc9-3 AC1 — the EXPFRA cadence paces the blast (one OLDRAD step per 5 frames)', () => {
  it('the radius changes ONLY at cadence boundaries — and it DOES change (rise + fall)', async () => {
    const mod = await loadExplosion()
    let prev = mod.blastRadius(mod.startExplosion(0, 0))
    let exp = mod.startExplosion(0, 0)
    const changeFrames: number[] = []
    for (let t = 1; t <= LIFETIME_FRAMES; t++) {
      exp = mod.stepExplosion(exp)
      const r = mod.blastRadius(exp)
      if (r !== prev) changeFrames.push(t)
      prev = r
    }
    // Assert the COUNT first, so this test cannot pass vacuously: the cadence check
    // below lives inside `if (r !== prev)`, so a frozen blastRadius (e.g. `return 0`)
    // would produce ZERO changes and execute ZERO cadence assertions. Bracket the
    // count — the paced OLDRAD curve changes value ~25 times over its 27 index steps;
    // a per-frame (cadence-1) curve would change on the order of LIFETIME_FRAMES times.
    // (Reviewer round-1 F3, lang-review #15.)
    expect(changeFrames.length, 'a frozen/never-changing radius must fail here, not pass silently')
      .toBeGreaterThan(20)
    expect(changeFrames.length, 'a per-frame (uncadenced) radius changes far more than EXDONE steps')
      .toBeLessThanOrEqual(EXDONE)
    // Every change lands on a cadence boundary — the defining property of EXPFRA pacing.
    for (const t of changeFrames) {
      expect(
        t % EXPFRA_FRAMES,
        `radius changed at frame ${t}, which is not a multiple of the ${EXPFRA_FRAMES}-frame cadence`,
      ).toBe(0)
    }
  })

  it('within a single cadence window the radius is flat (advancing < 5 frames does not change it)', async () => {
    const mod = await loadExplosion()
    // Land inside a window where the radius is a distinctive non-zero value: frames
    // 10..14 all sit at OLDRAD[2] = 2.
    let exp = mod.startExplosion(0, 0)
    for (let f = 0; f < 10; f++) exp = mod.stepExplosion(exp)
    const held = mod.blastRadius(exp)
    expect(held, 'frame 10 sits at OLDRAD[2]').toBe(2)
    for (let f = 1; f < EXPFRA_FRAMES; f++) {
      exp = mod.stepExplosion(exp)
      expect(mod.blastRadius(exp), `radius must stay ${held} for all ${EXPFRA_FRAMES} frames of the window`).toBe(held)
    }
    // The NEXT frame crosses the window boundary and the index advances to OLDRAD[3]=3.
    exp = mod.stepExplosion(exp)
    expect(mod.blastRadius(exp), 'crossing the cadence boundary advances the OLDRAD index').toBe(3)
  })

})

// ═════════════════════════════════════════════════════════════════════════════
// mc9-3 (Reviewer round-1 F4) — blastRadius must CLAMP a degenerate t, never index
// OLDRAD out of bounds. The mc1-4 triangle returned 0 for t <= 0; the OLDRAD rewrite
// guards only the UPPER bound (idx >= EXDONE), so a negative index returns
// OLDRAD[-1] = undefined and a NaN index returns OLDRAD[NaN] = undefined — which
// flows into render.ts's ctx.arc(radius) as NaN and throws. `Explosion` is a bare
// {h,v,t} interface with no constructor guard, and raw literals are constructed
// across the suite, so the boundary must be restored. NOTE for GREEN: `idx < 0 ||
// idx >= EXDONE` does NOT catch NaN (every NaN comparison is false); use
// `idx >= 0 && idx < EXDONE ? OLDRAD[idx] : 0` (lang-review #21/#22).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc9-3 F4 — blastRadius / isExplosionDone clamp a degenerate (negative / NaN) t', () => {
  const DEGENERATE = [-1, -5, -100, Number.NaN]

  it('blastRadius returns 0 (never undefined / NaN) for a negative or NaN t', async () => {
    const { blastRadius } = await loadExplosion()
    for (const t of DEGENERATE) {
      const r = blastRadius({ h: 0, v: 0, t })
      expect(r, `blastRadius at degenerate t=${t} must be exactly 0, not undefined/NaN`).toBe(0)
      expect(Number.isFinite(r), `blastRadius at t=${t} must be a finite number`).toBe(true)
    }
  })

  it('isExplosionDone reports a degenerate blast as done (consistent with its 0 radius)', async () => {
    // The reviewer flagged the inconsistent pair: blastRadius→undefined while
    // isExplosionDone→false for the same t. A degenerate/out-of-range blast has no
    // radius, so it must read as done/inert — not a live, growing blast.
    const { isExplosionDone } = await loadExplosion()
    for (const t of DEGENERATE) {
      expect(isExplosionDone({ h: 0, v: 0, t }), `a degenerate t=${t} is not a live blast`).toBe(true)
    }
  })
})

describe('AC1 — explosion reducers are pure (deterministic, non-mutating)', () => {
  it('same inputs give the same radius and the same next state', async () => {
    const { startExplosion, stepExplosion, blastRadius } = await loadExplosion()
    const a = stepExplosion(stepExplosion(startExplosion(70, 70)))
    const b = stepExplosion(stepExplosion(startExplosion(70, 70)))
    expect(a).toEqual(b)
    expect(blastRadius(a)).toBe(blastRadius(b))
  })

  it('stepExplosion does not mutate the explosion it is given', async () => {
    const { startExplosion, stepExplosion } = await loadExplosion()
    const exp = startExplosion(33, 44)
    const snapshot = JSON.parse(JSON.stringify(exp))
    const out = stepExplosion(exp)
    expect(exp).toEqual(snapshot)
    expect(out).not.toBe(exp)
  })
})

describe('AC1 — explosion.ts carries its W3MAIN / W3COMN source citations', () => {
  const explosionSrc = (): string => readFileSync(join(root, 'src', 'core', 'explosion.ts'), 'utf8')

  it('names the routine source W3MAIN and the constant source W3COMN', () => {
    const src = explosionSrc()
    expect(src, 'must cite W3MAIN — where PROCESS EXPLOSIONS / DRAW A CIRCLE live').toMatch(/W3MAIN/)
    expect(src, 'must cite W3COMN — where EXDONE is defined').toMatch(/W3COMN/)
  })

  it('cites EXDONE and the radius table / process routine', () => {
    const src = explosionSrc()
    expect(src, 'must cite the EXDONE symbol (the 27 lifetime)').toMatch(/EXDONE/)
    expect(
      src,
      'must cite the radius source — the PROCESS EXPLOSIONS routine (bare /OLDRAD/ is now a code identifier, so it would match tautologically; Reviewer round-1 F2)',
    ).toMatch(/PROCESS EXPLOSIONS/)
  })

  it('mc9-3 — cites PROCESS EXPLOSIONS, the OLDRAD table line and the EXPFRA cadence line it ports', () => {
    // AC2's citation half: explosion.ts names PROCESS EXPLOSIONS (W3MAIN.MAC:1811).
    // AC1: the authentic curve+cadence must carry their SOURCE CITATIONS now that the
    // triangle is gone. Anchor to the physical-line cites, NOT the bare symbols
    // `OLDRAD` / `EXPFRA_FRAMES` — those are now code identifiers (explosion.ts:53,60),
    // so a `/OLDRAD/` match would be tautological (satisfied by the declaration even if
    // every citation comment were stripped). Reviewer round-1 F2 (lang-review #15/#25).
    const src = explosionSrc()
    expect(src, 'must name the PROCESS EXPLOSIONS routine it ports (W3MAIN.MAC:1811)').toMatch(
      /PROCESS EXPLOSIONS/,
    )
    expect(src, 'must cite the OLDRAD radius-vs-time table at its physical line').toMatch(
      /W3MAIN\.MAC:1917/,
    )
    expect(src, 'must cite the EXPFRA update cadence at its physical line (EXPFIX/EXPEND)').toMatch(
      /W3MAIN\.MAC:1911/,
    )
  })
})

describe('source ground truth — EXDONE=27 and the OLDRAD peak=13 really decode from the ROM', () => {
  // GREEN from day one: reads the vendored source (data), not explosion.ts (code),
  // anchoring the two constants to what Atari shipped. (W3COMN.MAC/W3MAIN.MAC carry
  // a stray non-text byte — readFileSync utf8 reads them fine; a hand `grep` needs
  // `-a`. Noted in field.test.ts's SOURCE-FILE HAZARD.)
  const w3comn = readFileSync(join(root, 'reference', 'source', 'W3COMN.MAC'), 'utf8')
  const w3main = readFileSync(join(root, 'reference', 'source', 'W3MAIN.MAC'), 'utf8')

  // A `SYMBOL = value` def in `.RADIX 16` source: trailing `.` = decimal, else hex.
  const valueOf = (src: string, symbol: string): number => {
    const m = src.match(new RegExp(`\\b${symbol}\\s*=\\s*([0-9A-Fa-f]+)(\\.?)`))
    if (!m) throw new Error(`symbol ${symbol} not found`)
    return m[2] === '.' ? parseInt(m[1], 10) : parseInt(m[1], 16)
  }

  // Parse the OLDRAD radius-vs-time table (two `.BYTE` lines between OLDRAD: and NEWRAD).
  const oldradTable = (): number[] => {
    const start = w3main.indexOf('OLDRAD:')
    const end = w3main.indexOf('NEWRAD', start)
    expect(start, 'OLDRAD table label not found in W3MAIN').toBeGreaterThan(-1)
    expect(end, 'NEWRAD terminator not found after OLDRAD').toBeGreaterThan(start)
    const block = w3main.slice(start, end)
    const nums: number[] = []
    for (const line of block.matchAll(/\.BYTE\s+([^\n;]+)/g)) {
      for (const raw of line[1].split(',')) {
        const tok = raw.trim()
        if (!/^[0-9A-Fa-f]+\.?$/.test(tok)) continue
        nums.push(tok.endsWith('.') ? parseInt(tok, 10) : parseInt(tok, 16))
      }
    }
    return nums
  }

  it('EXDONE = 27 (decimal, trailing dot) in W3COMN.MAC', () => {
    expect(valueOf(w3comn, 'EXDONE')).toBe(EXDONE)
  })

  it('the OLDRAD table peaks at 13, starts and ends at 0, and is single-peaked', () => {
    const table = oldradTable()
    expect(table.length, 'the OLDRAD table failed to parse').toBeGreaterThan(10)
    expect(Math.max(...table)).toBe(MAX_BLAST_RADIUS)
    expect(table[0]).toBe(0)
    expect(table[table.length - 1]).toBe(0)
    // rises to the peak then never rises again (grow-then-collapse), matching the code contract.
    const peak = table.indexOf(MAX_BLAST_RADIUS)
    for (let i = 1; i <= peak; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1])
    for (let i = peak + 1; i < table.length; i++) expect(table[i]).toBeLessThanOrEqual(table[i - 1])
  })

  it('mc9-3 — the OLDRAD table decodes BYTE-EXACT to the expected curve (W3MAIN.MAC:1917-1919)', () => {
    // The witness for the `OLDRAD` constant the AC1 tests above assert against: the
    // vendored source must decode to exactly the two `.BYTE` rows, in order, so a
    // transcription typo in the test's OLDRAD cannot pass by matching itself.
    expect(oldradTable(), 'OLDRAD must decode to the exact asymmetric, plateaued table').toEqual(OLDRAD)
  })

  it('mc9-3 — the EXPFRA cadence decodes to 5 frames/step from EXPFIX (W3MAIN.MAC:1911)', () => {
    // PREXPL resets its update timer to EXPEND-EXPFIX-2 and the explosion slots are
    // split into (that many + 1) round-robin batches, so a single explosion advances
    // once per (reset+1) frames. EXPFIX is a 6-byte table, EXPEND is its end label ⇒
    // reset = 6-2 = 4 ⇒ cadence = 5. Derived from the assembled byte count, not a
    // hand-typed constant, so a change to the batch table reddens here.
    const m = w3main.match(/EXPFIX:\s*\.BYTE\s+([^\n;]+)/)
    expect(m, 'EXPFIX .BYTE table not found in W3MAIN').not.toBeNull()
    const expfixBytes = (m as RegExpMatchArray)[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    expect(expfixBytes.length, 'EXPFIX must be the 6-entry round-robin batch table').toBe(6)
    const reset = expfixBytes.length - 2 // EXPEND-EXPFIX-2
    const cadence = reset + 1
    expect(cadence, 'the EXPFRA cadence must be 5 frames per OLDRAD index step').toBe(EXPFRA_FRAMES)
  })
})
