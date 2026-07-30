// tests/core/debris.test.ts
//
// Story bz3-5 — RED phase (O'Brien / TEA). Cluster C5, subsumes F-008
// (re-sized m -> l by the coverage review AND the refuter: a whole new
// deterministic-core particle subsystem, not a constant swap).
//
// THE ROM FACT (F-008, pair-combat.json). An object explosion is a 6-piece
// gravity-driven particle sim, NOT a fixed 1.5 s timer:
//   * EXINIT seeds 6 fragments, each with ZVELOC = IZVEL[i]
//       IZVEL = .BYTE 55,40,70,88,40   (BZMTNS.MAC:837)
//               .BYTE 66               (BZMTNS.MAC:838 — the SIXTH byte the
//               auditor missed; the refuter found it. EXINIT seeds IZVEL[0..5].)
//       These bytes sit in BZMTNS's .RADIX 10 region (`.RADIX 10` at :501, the
//       next `.RADIX 16` not until :839), so they are DECIMAL: 55,40,70,88,40,66.
//       (`.BYTE 88` is itself proof of decimal — 8 is not an octal digit.)
//   * EXPLDE runs once per GAME frame (15.625 Hz — bz3-1, BZONE.MAC:1085/:422):
//       EXPOSZ += ZVELOC * 4      (sign-extended <<2)
//       ZVELOC += GRAVTY          GRAVTY = -4.  (BZONE.MAC:380, decimal)
//   * The blast ends by PHYSICS, not a clock: it is over only once ALL six
//     pieces have fallen back below ground. The tallest piece (V0=88) apexes
//     near ZVELOC=0 (~88/4 = 22 frames) and lands at ~44-46 frames; at
//     64 ms/frame that is ~2.8-3.0 s — roughly DOUBLE the clone's 1.5 s.
//   * The clone today: EXPLOSION_DURATION = 1.5 (enemies.ts:157), a scalar
//     timer with NO debris physics in the core.
//
// AC1: object explosions spawn 6 gravity-driven debris pieces (IZVEL launch
//      55,40,70,88,40,66; GRAVTY=-4/frame at 15.625 Hz) with physics-driven
//      termination, replacing the fixed 1.5 s timer.
// AC2: the particle subsystem is FACTORED so bz3-6's volcano eruption reuses
//      it — different launch velocities / gravity / count feed the SAME engine.
//
// CONTRACT pinned for Dev (GREEN) — a NEW pure core module src/core/debris.ts:
//
//   interface DebrisConfig {
//     readonly launchVelocities: readonly number[]  // one entry per piece (IZVEL)
//     readonly gravity: number                      // per-frame velocity delta (GRAVTY = -4)
//     readonly heightScale: number                  // height += velocity*heightScale/frame (ROM EXPOSZ += ZVELOC*4)
//     readonly groundHeight?: number                // grounded threshold; default 0
//   }
//   interface DebrisPiece  { readonly height: number; readonly velocity: number; readonly grounded: boolean }
//   interface DebrisState  { readonly pieces: readonly DebrisPiece[]; readonly config: DebrisConfig; readonly done: boolean }
//   const OBJECT_EXPLOSION: DebrisConfig  // { [55,40,70,88,40,66], -4, 4 } — the ROM object-explosion preset
//   function spawnDebris(config: DebrisConfig): DebrisState   // height 0, velocity = launchVelocities[i]
//   function stepDebris(state: DebrisState): DebrisState      // advances ONE game frame; pure reducer
//
// Per-frame semantics (order-independent for velocity; the exact height
// integration order shifts an apex/landing by at most 1 frame — bands allow it):
//     velocity_{n+1} = velocity_n + gravity                  (so velocity == v0 - 4n while airborne)
//     height_{n+1}   = height_n   + velocity * heightScale
// Grounded predicate (put here so Dev matches the termination frame the tests
// pin): a piece is grounded once it has passed apex and fallen back to ground —
//     grounded  <=>  velocity <= 0 && height <= groundHeight
// so a fresh piece (velocity = v0 > 0, height 0) is NOT grounded. `done` = every
// piece grounded. The burst lifetime is therefore an EMERGENT property of the
// tallest launch velocity + gravity, never a hard-coded duration.
//
// PURITY (epic non-negotiable): src/core/debris.ts is deterministic — no DOM,
// no wall clock, no ambient randomness, no rAF. Physics is sim state, not render;
// the flying/spinning/falling shape (models.ts "Explosion Debris" $0e) is drawn
// in shell/ from the pure per-piece height/velocity this module produces.
//
// RED: src/core/debris.ts does not exist yet; the module loads defensively so a
// missing export fails as a clean contract miss (house pattern).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { GAME_FRAME_HZ } from '../../src/core/timebase'
import { stepEnemies, type EnemyState, type Hostile } from '../../src/core/enemies'
import type { Shell } from '../../src/core/firing'
import type { TankPose } from '../../src/core/camera'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const modPath = join(root, 'src/core/debris.ts')

// --- The pinned contract, declared structurally (RED: module not built yet) ---

interface DebrisConfig {
  readonly launchVelocities: readonly number[]
  readonly gravity: number
  readonly heightScale: number
  readonly groundHeight?: number
}
interface DebrisPiece {
  readonly height: number
  readonly velocity: number
  readonly grounded: boolean
}
interface DebrisState {
  readonly pieces: readonly DebrisPiece[]
  readonly config: DebrisConfig
  readonly done: boolean
}
interface DebrisModule {
  OBJECT_EXPLOSION: DebrisConfig
  spawnDebris(config: DebrisConfig): DebrisState
  stepDebris(state: DebrisState): DebrisState
}

async function loadDebris(): Promise<DebrisModule> {
  let m: Partial<DebrisModule> = {}
  try {
    // A variable specifier so tsc defers resolution to GREEN (the module does
    // not exist yet); it still resolves at runtime once Dev creates it.
    const spec = '../../src/core/debris'
    m = (await import(/* @vite-ignore */ spec)) as unknown as Partial<DebrisModule>
  } catch {
    // module not built yet (RED)
  }
  if (
    typeof m.spawnDebris !== 'function' ||
    typeof m.stepDebris !== 'function' ||
    typeof m.OBJECT_EXPLOSION !== 'object' ||
    m.OBJECT_EXPLOSION === null
  ) {
    throw new Error(
      'CONTRACT: src/core/debris.ts must export ' +
        'OBJECT_EXPLOSION: DebrisConfig, spawnDebris(config): DebrisState, and stepDebris(state): DebrisState',
    )
  }
  return m as DebrisModule
}

/** Run a burst to completion; return frames-until-done and the whole height trace of piece #index. */
function flight(
  mod: DebrisModule,
  config: DebrisConfig,
  index = 0,
  cap = 5_000,
): { frames: number; heights: number[]; velocities: number[]; final: DebrisState } {
  let s = mod.spawnDebris(config)
  const heights: number[] = [s.pieces[index].height]
  const velocities: number[] = [s.pieces[index].velocity]
  let frames = 0
  while (!s.done && frames < cap) {
    s = mod.stepDebris(s)
    frames++
    heights.push(s.pieces[index].height)
    velocities.push(s.pieces[index].velocity)
  }
  return { frames, heights, velocities, final: s }
}

// ---------------------------------------------------------------------------
// AC1 — the six IZVEL launch velocities (BZMTNS.MAC:837-838, decimal)
// ---------------------------------------------------------------------------

describe('AC1 — object explosion is 6 gravity pieces with the ROM IZVEL launch speeds', () => {
  // BZMTNS.MAC:837  IZVEL:  .BYTE 55,40,70,88,40   (decimal — .RADIX 10 at :501)
  // BZMTNS.MAC:838          .BYTE 66               (the SIXTH byte; the refuter's catch)
  const IZVEL = [55, 40, 70, 88, 40, 66] as const

  it('OBJECT_EXPLOSION carries exactly the six IZVEL velocities — including the 6th (.BYTE 66)', async () => {
    const { OBJECT_EXPLOSION } = await loadDebris()
    expect(
      OBJECT_EXPLOSION.launchVelocities.length,
      'EXINIT seeds SIX pieces (IZVEL[0..5]); the auditor stopped at five — the 6th is .BYTE 66 at BZMTNS.MAC:838',
    ).toBe(6)
    expect([...OBJECT_EXPLOSION.launchVelocities]).toEqual([...IZVEL])
  })

  it('OBJECT_EXPLOSION uses GRAVTY = -4 per frame and the <<2 height scale (ROM EXPOSZ += ZVELOC*4)', async () => {
    const { OBJECT_EXPLOSION } = await loadDebris()
    expect(OBJECT_EXPLOSION.gravity, 'BZONE.MAC:380  GRAVTY = -4. (decimal)').toBe(-4)
    expect(OBJECT_EXPLOSION.heightScale, 'ROM EXPLDE: EXPOSZ += ZVELOC * 4 (sign-extended <<2)').toBe(4)
  })

  it('spawnDebris seeds one airborne piece per launch velocity, height 0, velocity = IZVEL[i]', async () => {
    const mod = await loadDebris()
    const s = mod.spawnDebris(mod.OBJECT_EXPLOSION)
    expect(s.pieces.length).toBe(6)
    expect(s.done, 'a just-spawned burst is not over').toBe(false)
    s.pieces.forEach((p, i) => {
      expect(p.velocity, `piece ${i} launches at IZVEL[${i}]`).toBe(IZVEL[i])
      expect(p.height, `piece ${i} starts at the object centre (EXPOSZ = 0)`).toBe(0)
      expect(p.grounded, `piece ${i} is airborne at launch (velocity ${IZVEL[i]} > 0)`).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// AC1 — GRAVTY = -4/frame integration and the rise-then-fall arc
// ---------------------------------------------------------------------------

describe('AC1 — gravity integration and the ballistic arc', () => {
  it('every airborne piece loses exactly 4 velocity per frame (GRAVTY = -4)', async () => {
    const mod = await loadDebris()
    let s = mod.spawnDebris(mod.OBJECT_EXPLOSION)
    const v0 = s.pieces.map((p) => p.velocity)
    // Two frames in — well before even the shortest piece (v=40) lands — every
    // piece's velocity must have dropped by exactly |GRAVTY| each frame.
    s = mod.stepDebris(s)
    s.pieces.forEach((p, i) => expect(p.velocity, `piece ${i} after 1 frame`).toBe(v0[i] - 4))
    s = mod.stepDebris(s)
    s.pieces.forEach((p, i) => expect(p.velocity, `piece ${i} after 2 frames`).toBe(v0[i] - 8))
  })

  it('the tallest piece (V0=88) rises, apexes near the velocity zero-crossing (~22 frames), then falls', async () => {
    const mod = await loadDebris()
    // Index 3 is the V0=88 piece.
    const { heights, velocities } = flight(mod, mod.OBJECT_EXPLOSION, 3)
    const apex = heights.indexOf(Math.max(...heights))

    // Apex sits at the velocity zero-crossing: 88/4 = 22 frames (±1 for
    // integration order). This ties the arc to GRAVTY, not to a magic peak.
    expect(apex, `apex frame was ${apex}`).toBeGreaterThanOrEqual(20)
    expect(apex).toBeLessThanOrEqual(24)
    // At apex the velocity has crossed zero (rising -> falling).
    expect(velocities[apex]).toBeLessThanOrEqual(0)
    expect(velocities[apex - 1]).toBeGreaterThan(0)

    // Strictly rising up to apex …
    for (let f = 1; f <= apex; f++) {
      expect(heights[f], `height must rise through frame ${f}`).toBeGreaterThan(heights[f - 1])
    }
    // … then non-increasing down to the ground (it must actually come back down).
    for (let f = apex + 1; f < heights.length; f++) {
      expect(heights[f], `height must fall after apex at frame ${f}`).toBeLessThanOrEqual(heights[f - 1])
    }
    expect(heights[heights.length - 1], 'the piece ends on or below the ground').toBeLessThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// AC1 — physics-driven termination (~3 s, governed by the tallest piece)
// ---------------------------------------------------------------------------

describe('AC1 — the blast ends by physics when the tallest piece lands, not on a 1.5 s clock', () => {
  it('the burst is NOT done until every piece has grounded (the tallest governs)', async () => {
    const mod = await loadDebris()
    let s = mod.spawnDebris(mod.OBJECT_EXPLOSION)
    let sawShortLanded = false
    let frames = 0
    while (!s.done && frames < 500) {
      const someGrounded = s.pieces.some((p) => p.grounded)
      const allGrounded = s.pieces.every((p) => p.grounded)
      // While at least one short piece has already landed but not all have, the
      // burst must still be running — a clock would have stopped it early.
      if (someGrounded && !allGrounded) {
        sawShortLanded = true
        expect(s.done, 'done must wait for the LAST (tallest) piece to land').toBe(false)
      }
      s = mod.stepDebris(s)
      frames++
    }
    expect(s.done, 'the burst eventually completes').toBe(true)
    expect(sawShortLanded, 'the short pieces land before the tall ones — staggered, not simultaneous').toBe(true)
    s.pieces.forEach((p, i) => expect(p.grounded, `piece ${i} is grounded when done`).toBe(true))
  })

  it('lifetime is the physics ~3 s (44-46 frames), roughly double the old 1.5 s timer', async () => {
    const mod = await loadDebris()
    const { frames } = flight(mod, mod.OBJECT_EXPLOSION)
    const seconds = frames / GAME_FRAME_HZ

    // Frame band: tallest piece (V0=88, GRAVTY=-4) lands at ~44-46 frames.
    expect(frames, `burst ran ${frames} frames`).toBeGreaterThanOrEqual(40)
    expect(frames).toBeLessThanOrEqual(52)
    // Seconds band at the 15.625 Hz timebase (bz3-1): ~2.8-3.0 s target.
    expect(seconds).toBeGreaterThanOrEqual(2.5)
    expect(seconds).toBeLessThanOrEqual(3.4)
    // Emphatically NOT the fixed 1.5 s the clone replaced.
    expect(seconds, 'the ROM blast is ~double 1.5 s').toBeGreaterThan(2.2)
    expect(seconds < 1.4 || seconds > 1.6, 'must not land back on the 1.5 s timer').toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC1 — the subsystem is actually WIRED into the enemy explosion
// ---------------------------------------------------------------------------

describe('AC1 (wired-up) — the enemy explosion consumes the physics burst, not the 1.5 s timer', () => {
  const OPEN: TankPose = { x: 200_000, z: 200_000, heading: 0 }
  const DT = 1 / GAME_FRAME_HZ

  it('the hostile stays "exploding" for ~3 s (physics) before the replacement spawns — not 1.5 s', async () => {
    const h: Hostile = { x: 210_000, z: 200_000, heading: 0, kind: 'tank', phase: 'alive', phaseAge: 0 }
    const state: EnemyState = { hostile: h, shell: null, rng: 42, missilesLaunched: 0 }
    // A player shell sitting on the tank — the standard kill setup (enemies.test.ts).
    const playerShell: Shell = { x: h.x, z: h.z, heading: -Math.PI / 2, range: 10_000 }

    let r = stepEnemies(state, OPEN, playerShell, DT)
    expect(r.state.hostile.phase, 'the shell kills it — now exploding').toBe('exploding')

    // Burn the blast down and record how long the hostile spends exploding.
    let cur = r.state
    let explosionSeconds = cur.hostile.phaseAge
    let frames = 0
    while (cur.hostile.phase === 'exploding' && frames < 500) {
      cur = stepEnemies(cur, OPEN, null, DT).state
      frames++
      if (cur.hostile.phase === 'exploding') explosionSeconds = cur.hostile.phaseAge
    }
    expect(cur.hostile.phase, 'the replacement eventually spawns (findings §2: no gap)').toBe('alive')

    // The observable blast length must now be the ROM's physics ~3 s, not 1.5 s.
    expect(explosionSeconds, `explosion lasted ${explosionSeconds.toFixed(3)} s`).toBeGreaterThan(2.2)
    expect(explosionSeconds).toBeLessThanOrEqual(3.4)
    expect(
      explosionSeconds < 1.4 || explosionSeconds > 1.6,
      'the fixed 1.5 s timer must be gone',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC2 — the engine is factored/parameterized so bz3-6's volcano reuses it
// ---------------------------------------------------------------------------

describe('AC2 — reusable engine: launch velocities / gravity / count are parameters, lifetime is emergent', () => {
  it('drives an ARBITRARY config — piece count follows launchVelocities.length', async () => {
    const mod = await loadDebris()
    const cfg: DebrisConfig = { launchVelocities: [10, 20, 30], gravity: -4, heightScale: 4, groundHeight: 0 }
    const s = mod.spawnDebris(cfg)
    expect(s.pieces.length, 'three velocities -> three pieces (count is a parameter, not hard-coded 6)').toBe(3)
    expect(s.pieces.map((p) => p.velocity)).toEqual([10, 20, 30])
  })

  it("a volcano-like plume (V0=200) outlives the object explosion — lifetime is physics, not a battlezone constant", async () => {
    const mod = await loadDebris()
    // bz3-6 will feed the SAME engine a taller, single-column eruption. Its
    // longer flight must fall straight out of the physics, proving the lifetime
    // is NOT the object explosion's ~3 s baked in.
    const volcano: DebrisConfig = { launchVelocities: [200], gravity: -4, heightScale: 4, groundHeight: 0 }
    const object = flight(mod, mod.OBJECT_EXPLOSION).frames
    const plume = flight(mod, volcano).frames

    expect(plume, `volcano ran ${plume} frames vs object ${object}`).toBeGreaterThan(object)
    // V0=200 apexes at 200/4 = 50 frames and lands near ~100 — clearly its own
    // lifetime, not a copy of the object explosion's.
    expect(plume).toBeGreaterThanOrEqual(90)
    expect(plume).toBeLessThanOrEqual(112)
  })

  it('gravity is a real parameter — a steeper gravity lands the SAME launch speed sooner', async () => {
    const mod = await loadDebris()
    const soft: DebrisConfig = { launchVelocities: [88], gravity: -4, heightScale: 4, groundHeight: 0 }
    const hard: DebrisConfig = { launchVelocities: [88], gravity: -8, heightScale: 4, groundHeight: 0 }
    expect(flight(mod, hard).frames, 'twice the gravity, roughly half the flight').toBeLessThan(
      flight(mod, soft).frames,
    )
  })
})

// ---------------------------------------------------------------------------
// Determinism & purity — the deterministic-core non-negotiable
// ---------------------------------------------------------------------------

describe('determinism & purity — src/core/debris.ts is a pure deterministic reducer', () => {
  it('is fully deterministic — two independent runs are byte-for-byte identical', async () => {
    const mod = await loadDebris()
    const a = flight(mod, mod.OBJECT_EXPLOSION)
    const b = flight(mod, mod.OBJECT_EXPLOSION)
    expect(a.frames).toBe(b.frames)
    expect(a.final).toEqual(b.final)
  })

  it('stepDebris does not mutate the state it is handed (readonly reducer — lang-review #2)', async () => {
    const mod = await loadDebris()
    const s0 = mod.spawnDebris(mod.OBJECT_EXPLOSION)
    const before = JSON.parse(JSON.stringify(s0))
    const s1 = mod.stepDebris(s0)
    expect(s1).not.toBe(s0)
    expect(JSON.parse(JSON.stringify(s0)), 'the input burst must be untouched').toEqual(before)
  })

  it('exists as a core module', () => {
    expect(existsSync(modPath), 'src/core/debris.ts must exist').toBe(true)
  })

  it('contains no DOM / time / randomness tokens (epic core-purity rule)', () => {
    const src = existsSync(modPath) ? readFileSync(modPath, 'utf8') : ''
    expect(src.length, 'src/core/debris.ts must exist and be non-empty').toBeGreaterThan(0)
    for (const token of [
      'Math.random',
      'Date.now',
      'new Date',
      'performance.now',
      'requestAnimationFrame',
      'document.',
      'window.',
      'localStorage',
    ]) {
      expect(src, `debris.ts must not contain "${token}"`).not.toContain(token)
    }
  })

  it('contains no type-safety escapes (lang-review #1)', () => {
    const src = existsSync(modPath) ? readFileSync(modPath, 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    for (const token of ['as any', '@ts-ignore', 'as unknown as']) {
      expect(src, `debris.ts must not contain "${token}"`).not.toContain(token)
    }
  })

  it('imports only sibling core modules or the pinned @shared library (never shell/, never node builtins)', () => {
    const src = existsSync(modPath) ? readFileSync(modPath, 'utf8') : ''
    expect(src.length).toBeGreaterThan(0)
    const importPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((mm) => mm[1])
    for (const p of importPaths) {
      const allowed = p.startsWith('./') || p.startsWith('@shared/')
      expect(allowed, `debris.ts imports "${p}" — core may only import siblings or @shared`).toBe(true)
    }
  })
})
