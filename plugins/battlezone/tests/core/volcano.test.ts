// tests/core/volcano.test.ts
//
// Story bz3-6 — RED phase (O'Brien / TEA). Cluster C6, subsumes H-006 + H-008.
// Depends on bz3-5's reusable particle engine (src/core/debris.ts).
//
// THE ROM FACT (H-006, pair-horizon.json). The volcano's "eruption" is the
// VOLCAO ROCK MOVEMENT routine VOLCNO (BZONE.MAC:1390-1449), a per-GAME-frame
// (64 ms, 15.625 Hz — bz3-1) ballistic sim of up to NOROCK=5 rocks:
//   * NOROCK = 5                       (BZONE.MAC:319  `NOROCK =5`)
//   * lifetime OBJTIM = 0x1F = 31      (BZONE.MAC:1396 `LDA I,1F` — the rock's
//       active-time countdown; radix-16 region, so 0x1F = 31 decimal frames =
//       31 / 15.625 Hz = 1.984 s. This is the ROM's ejecta LIFETIME (AC2).)
//   * gravity = -1 per frame           (BZONE.MAC:1417 `DEC X,YSPD ;GRAVITY
//       TAMES HOLD` — YSPD is decremented by 1 each frame → dv = -1 unit/frame
//       = -1 * 15.625^2 = -244.1 units/s^2. Contrast the object explosion's
//       GRAVTY = -4.)
//   * height integrates YPOS += YSPD   (BZONE.MAC:1418-1435 — a plain signed add
//       of YSPD into YPOS, NO <<2 shift. So heightScale = 1, unlike EXPLDE's
//       EXPOSZ += ZVELOC*4 / heightScale = 4.)
//   * launch YSPD = (PRAND&7)+5 = 5..12 (BZONE.MAC:1405-1407 `AND I,7 / ADC I,5`
//       — random vertical velocity in [5, 12] units/frame; the horizontal
//       XSPD = (PRAND&3)+1 with a 50% sign flip is a shell/orientation concern,
//       not the AC2 physics.)
//   * a rock also dies on ground contact below the launch point (YPOSH<0 &&
//       YPOSL<0xA2, BZONE.MAC:1425-1432 — a floor at YPOS ~ -95, BELOW the
//       volcano top) and the beam DIMS with age (brightness = (OBJTIM<<3)&0xE0,
//       BZONE.MAC:1355-1360). Both are shell/render fidelity, deferred here.
//
// AC1 (in horizon.test.ts): the invented static volcano cone is removed (H-008).
// AC2 (this file): the VOLCNO ejecta erupts by driving the SAME bz3-5 engine
//   (spawnDebris / stepDebris) with a VOLCANO_ERUPTION DebrisConfig at the ROM
//   lifetime (~1.984 s) and gravity (-1/frame). NO engine fork.
//
// bz3-5 reviewer CARRY-FORWARDS, pinned here as bz3-6 requirements:
//   (a) The engine did NO config/dt validation — a non-terminating config
//       (gravity >= 0 with no lifetime), a NaN/empty velocity set, or a
//       non-finite dt HANGS the `while (!done)` consumer. The volcano feeds the
//       engine a brand-new config, so spawnDebris must VALIDATE and throw
//       rather than loop forever (dt guard is the consumer's; see guidance).
//   (b) The ROM EXPLDE terminal-velocity clamp (~-124, BZONE.MAC:1795-1798) is
//       omitted. VERIFIED IMMATERIAL for the volcano: velocities 5..12 with
//       gravity -1 over a 31-frame life reach at most ~-26 — nowhere near -124,
//       and VOLCNO itself has NO clamp. Pinned so no un-cited clamp is added.
//
// CONTRACT for Dev (GREEN) — extend src/core/debris.ts (do NOT fork it):
//   * Add `readonly lifetime?: number` to DebrisConfig — a max age in game
//     frames (ROM OBJTIM). `undefined` = physics-only termination (unchanged
//     for OBJECT_EXPLOSION). A finite positive lifetime also GUARANTEES
//     termination, so it doubles as the non-hang guard.
//   * DebrisState tracks `age` (frames since spawn); a burst is `done` once all
//     pieces grounded OR (lifetime !== undefined && age >= lifetime).
//   * spawnDebris VALIDATES the config (throws on empty/NaN velocities,
//     non-finite gravity/heightScale/groundHeight, non-positive/non-finite
//     lifetime, and a non-terminating config: lifetime undefined && gravity>=0).
//   * export `VOLCANO_ERUPTION: DebrisConfig` (5 rocks, gravity -1, heightScale
//     1, lifetime 31, velocities in [5,12]) — a preset like OBJECT_EXPLOSION.
//
// RED: VOLCANO_ERUPTION and the lifetime/validation behavior do NOT exist yet.
// The module loads defensively (variable specifier) so the missing export is a
// clean contract miss and tsc defers resolution to GREEN.

import { describe, it, expect } from 'vitest'
import { GAME_FRAME_HZ } from '../../src/core/timebase'

// --- The pinned contract, declared structurally (bz3-6 additions in *bold*) ---

interface DebrisConfig {
  readonly launchVelocities: readonly number[]
  readonly gravity: number
  readonly heightScale: number
  readonly groundHeight?: number
  readonly lifetime?: number // bz3-6: max age in frames (ROM OBJTIM); undefined = physics-only
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
  VOLCANO_ERUPTION?: DebrisConfig // bz3-6: the new preset (undefined in RED)
  spawnDebris(config: DebrisConfig): DebrisState
  stepDebris(state: DebrisState): DebrisState
}

async function loadEngine(): Promise<DebrisModule> {
  let m: Partial<DebrisModule> = {}
  try {
    // Variable specifier so tsc does not resolve the not-yet-added export.
    const spec = '../../src/core/debris'
    m = (await import(/* @vite-ignore */ spec)) as unknown as Partial<DebrisModule>
  } catch {
    // module unbuilt — should not happen (bz3-5 shipped it), but stay defensive
  }
  if (
    typeof m.spawnDebris !== 'function' ||
    typeof m.stepDebris !== 'function' ||
    typeof m.OBJECT_EXPLOSION !== 'object' ||
    m.OBJECT_EXPLOSION === null
  ) {
    throw new Error('CONTRACT: src/core/debris.ts must export spawnDebris, stepDebris, OBJECT_EXPLOSION')
  }
  return m as DebrisModule
}

/** Fetch the new preset or fail with a clear bz3-6 contract-miss message (RED). */
function needVolcano(mod: DebrisModule): DebrisConfig {
  if (typeof mod.VOLCANO_ERUPTION !== 'object' || mod.VOLCANO_ERUPTION === null) {
    throw new Error(
      'CONTRACT (bz3-6): src/core/debris.ts must export VOLCANO_ERUPTION: DebrisConfig ' +
        '(5 rocks, gravity -1, heightScale 1, lifetime 31, velocities in [5,12])',
    )
  }
  return mod.VOLCANO_ERUPTION
}

/**
 * Run a burst to completion (or the cap). The cap is a HARD safety net: a
 * non-terminating config must NOT hang the runner — it returns `frames === cap`
 * so the assertion, not a timeout, reports the failure.
 */
function flight(
  mod: DebrisModule,
  config: DebrisConfig,
  index = 0,
  cap = 5_000,
): { frames: number; heights: number[]; velocities: number[]; minVelocity: number; final: DebrisState } {
  let s = mod.spawnDebris(config)
  const heights: number[] = [s.pieces[index].height]
  const velocities: number[] = [s.pieces[index].velocity]
  let minVelocity = Math.min(...s.pieces.map((p) => p.velocity))
  let frames = 0
  while (!s.done && frames < cap) {
    s = mod.stepDebris(s)
    frames++
    heights.push(s.pieces[index].height)
    velocities.push(s.pieces[index].velocity)
    minVelocity = Math.min(minVelocity, ...s.pieces.map((p) => p.velocity))
  }
  return { frames, heights, velocities, minVelocity, final: s }
}

// ---------------------------------------------------------------------------
// AC2 — the VOLCANO_ERUPTION preset carries the ROM VOLCNO constants
// ---------------------------------------------------------------------------

describe('AC2 — VOLCANO_ERUPTION preset (ROM VOLCNO constants, BZONE.MAC)', () => {
  it('gravity is -1 per frame (BZONE.MAC:1417 `DEC X,YSPD` = -244 units/s^2)', async () => {
    const cfg = needVolcano(await loadEngine())
    expect(cfg.gravity, 'DEC X,YSPD decrements velocity by 1 each 15.625 Hz frame').toBe(-1)
  })

  it('heightScale is 1 — YPOS += YSPD, no <<2 (BZONE.MAC:1418-1435; contrast EXPLDE ×4)', async () => {
    const mod = await loadEngine()
    const cfg = needVolcano(mod)
    expect(cfg.heightScale, 'VOLCNO adds YSPD straight into YPOS — no sign-extended shift').toBe(1)
    // Guard against copy-pasting the object explosion's ×4 height scale.
    expect(cfg.heightScale).not.toBe(mod.OBJECT_EXPLOSION.heightScale)
  })

  it('lifetime is OBJTIM = 0x1F = 31 frames = 1.984 s (BZONE.MAC:1396 `LDA I,1F`)', async () => {
    const cfg = needVolcano(await loadEngine())
    expect(cfg.lifetime, 'ROM OBJTIM = 0x1F (radix-16 region) = 31 decimal frames').toBe(0x1f)
    expect(cfg.lifetime).toBe(31)
    // 31 frames at the bz3-1 timebase is the AC2 "~1.984 s" ejecta lifetime.
    expect(31 / GAME_FRAME_HZ, 'OBJTIM in seconds').toBeCloseTo(1.984, 2)
  })

  it('has NOROCK = 5 rocks, each launched at a ROM YSPD in [5,12] (BZONE.MAC:319, :1405-1407)', async () => {
    const cfg = needVolcano(await loadEngine())
    expect(cfg.launchVelocities.length, 'NOROCK = 5 (BZONE.MAC:319)').toBe(5)
    for (const v of cfg.launchVelocities) {
      // YSPD = (PRAND&7)+5 → an integer in [5,12]. The exact per-rock value is
      // PRAND-random in the ROM; the deterministic core pins the BAND + count,
      // not a magic velocity (mirrors bz3-5's structural-not-exact stance).
      expect(Number.isInteger(v), `launch velocity ${v} must be a whole unit/frame`).toBe(true)
      expect(v, 'YSPD = (PRAND&7)+5 lower bound').toBeGreaterThanOrEqual(5)
      expect(v, 'YSPD = (PRAND&7)+5 upper bound').toBeLessThanOrEqual(12)
    }
  })
})

// ---------------------------------------------------------------------------
// AC2 — the engine now HONORS `lifetime` (the new termination path + non-hang)
// ---------------------------------------------------------------------------

describe('AC2 — the shared engine terminates a burst on the OBJTIM lifetime', () => {
  it('a lifetime-capped config that would NEVER ground still retires at ~31 frames (not the cap)', async () => {
    const mod = await loadEngine()
    // gravity 0 → this piece rises forever and never grounds; ONLY the lifetime
    // can end it. Today the engine ignores `lifetime` and this HANGS to the cap
    // (the exact reviewer non-termination trap) — RED proof the field is unwired.
    const capped: DebrisConfig = { launchVelocities: [12], gravity: 0, heightScale: 1, lifetime: 31 }
    const { frames } = flight(mod, capped)
    expect(frames, `burst ran ${frames} frames — lifetime must terminate it, not physics`).toBeLessThan(100)
    expect(frames, 'OBJTIM = 31 frames (±1 for the age-check convention)').toBeGreaterThanOrEqual(30)
    expect(frames).toBeLessThanOrEqual(32)
  })

  it('the lifetime maps to the ROM ~1.984 s — NOT the object blast (~2.88 s) NOR the old 1.5 s', async () => {
    const mod = await loadEngine()
    const capped: DebrisConfig = { launchVelocities: [12], gravity: 0, heightScale: 1, lifetime: 31 }
    const seconds = flight(mod, capped).frames / GAME_FRAME_HZ
    expect(seconds, `eruption lifetime was ${seconds.toFixed(3)} s`).toBeGreaterThanOrEqual(1.9)
    expect(seconds).toBeLessThanOrEqual(2.05)
    expect(seconds < 2.5, 'the volcano ejecta is SHORTER than the ~2.88 s object explosion').toBe(true)
    expect(seconds < 1.4 || seconds > 1.6, 'not a 1.5 s static timer').toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC2 — the eruption erupts: ballistic arc + duration, driving the SAME engine
// ---------------------------------------------------------------------------

describe('AC2 — the VOLCANO_ERUPTION drives the shared engine (arc + lifetime ceiling)', () => {
  it('a rock rises then falls — the arc is ballistic (apex at the velocity zero-crossing)', async () => {
    const mod = await loadEngine()
    const cfg = needVolcano(mod)
    // The fastest rock climbs highest; trace it.
    const tallest = cfg.launchVelocities.indexOf(Math.max(...cfg.launchVelocities))
    const { heights, velocities } = flight(mod, cfg, tallest)
    const apex = heights.indexOf(Math.max(...heights))
    expect(apex, `apex frame ${apex} must be after launch`).toBeGreaterThan(0)
    // Apex sits where velocity crosses zero (rising → falling): ties the arc to
    // gravity = -1, not to a magic peak.
    expect(velocities[apex], 'velocity has crossed zero at apex').toBeLessThanOrEqual(0)
    expect(velocities[apex - 1], 'velocity was still positive one frame before apex').toBeGreaterThan(0)
    // It must actually come back down (a real fountain, not a rising streak).
    expect(heights[heights.length - 1]).toBeLessThan(heights[apex])
  })

  it('the whole eruption completes within the ~1.984 s OBJTIM ceiling, well short of the object blast', async () => {
    const mod = await loadEngine()
    const cfg = needVolcano(mod)
    const eruption = flight(mod, cfg).frames
    const object = flight(mod, mod.OBJECT_EXPLOSION).frames
    // No rock outlives OBJTIM = 31 frames (+1 slack for the age convention).
    expect(eruption, `eruption ran ${eruption} frames; ceiling is OBJTIM = 31`).toBeLessThanOrEqual(32)
    expect(eruption, 'the eruption is real, not an instant one-frame retire').toBeGreaterThan(1)
    // The ROM ejecta (~1.984 s) is emphatically shorter than the ~2.88 s object
    // explosion (~45 frames) — different config, same engine.
    expect(eruption, `eruption ${eruption} vs object ${object} frames`).toBeLessThan(object)
  })
})

// ---------------------------------------------------------------------------
// Carry-forward (a) — the engine VALIDATES config rather than hanging
// ---------------------------------------------------------------------------

describe('carry-forward (a) — spawnDebris rejects a config that could hang the consumer', () => {
  it('throws on an EMPTY launch-velocity set (today [].every() vacuously retires the burst)', async () => {
    const mod = await loadEngine()
    const empty: DebrisConfig = { launchVelocities: [], gravity: -1, heightScale: 1, lifetime: 31 }
    expect(() => mod.spawnDebris(empty)).toThrow()
  })

  it('throws on a non-finite launch velocity (NaN / Infinity)', async () => {
    const mod = await loadEngine()
    expect(() => mod.spawnDebris({ launchVelocities: [NaN], gravity: -1, heightScale: 1, lifetime: 31 })).toThrow()
    expect(() =>
      mod.spawnDebris({ launchVelocities: [Infinity], gravity: -1, heightScale: 1, lifetime: 31 }),
    ).toThrow()
  })

  it('throws on non-finite gravity or heightScale', async () => {
    const mod = await loadEngine()
    expect(() => mod.spawnDebris({ launchVelocities: [10], gravity: NaN, heightScale: 1, lifetime: 31 })).toThrow()
    expect(() =>
      mod.spawnDebris({ launchVelocities: [10], gravity: -1, heightScale: Infinity, lifetime: 31 }),
    ).toThrow()
  })

  it('throws on a NON-TERMINATING config (gravity >= 0 with no lifetime) — the reviewer hang', async () => {
    const mod = await loadEngine()
    // gravity 0, no lifetime: the piece rises forever, `done` never flips. The
    // engine must reject this up front rather than let `while (!done)` spin.
    expect(() => mod.spawnDebris({ launchVelocities: [10], gravity: 0, heightScale: 1 })).toThrow()
    expect(() => mod.spawnDebris({ launchVelocities: [10], gravity: 1, heightScale: 1 })).toThrow()
    // …but a finite lifetime RESCUES the same config (it now provably terminates).
    expect(() =>
      mod.spawnDebris({ launchVelocities: [10], gravity: 0, heightScale: 1, lifetime: 31 }),
    ).not.toThrow()
  })

  it('throws on a non-positive / non-finite lifetime', async () => {
    const mod = await loadEngine()
    for (const bad of [0, -5, NaN, Infinity]) {
      expect(
        () => mod.spawnDebris({ launchVelocities: [10], gravity: -1, heightScale: 1, lifetime: bad }),
        `lifetime ${bad} is not a positive finite frame count`,
      ).toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// Carry-forward (b) — the volcano never reaches the EXPLDE terminal-velocity
// clamp, so no un-cited clamp is needed
// ---------------------------------------------------------------------------

describe('carry-forward (b) — the ROM EXPLDE clamp (~-124) is immaterial for the volcano', () => {
  it('no VOLCANO_ERUPTION rock ever falls faster than the EXPLDE clamp (BZONE.MAC:1795-1798)', async () => {
    const mod = await loadEngine()
    const cfg = needVolcano(mod)
    // EXPLDE clamps ZVELOC at CMP I,80-GRAVTY+1 ≈ terminal velocity -124. The
    // volcano's YSPD 5..12 under gravity -1 over ≤31 frames bottoms out near
    // -26 — it NEVER approaches -124, and VOLCNO itself has no clamp. So the
    // bz3-5 carry-forward "matters for large volcano velocities" does NOT apply;
    // the real VOLCNO velocities are SMALLER than the object explosion's.
    const { minVelocity } = flight(mod, cfg)
    expect(minVelocity, `slowest (most negative) velocity was ${minVelocity}`).toBeGreaterThan(-124)
    expect(minVelocity, 'and comfortably above any clamp — no terminal-velocity field required').toBeGreaterThan(-40)
  })
})

// ---------------------------------------------------------------------------
// Reuse / regression — same engine, OBJECT_EXPLOSION path untouched
// ---------------------------------------------------------------------------

describe('reuse — one engine drives both presets; the object-explosion path is unchanged', () => {
  it('REGRESSION: OBJECT_EXPLOSION (no lifetime) still ends by PHYSICS at ~40-52 frames', async () => {
    const mod = await loadEngine()
    // The bz3-6 lifetime addition must be gated on `lifetime !== undefined`, so
    // the lifetime-less object explosion keeps terminating on the tallest
    // piece landing (~45 frames), NOT clamped by any new ceiling.
    expect(mod.OBJECT_EXPLOSION.lifetime, 'the object explosion carries no lifetime').toBeUndefined()
    const { frames } = flight(mod, mod.OBJECT_EXPLOSION)
    expect(frames, `object explosion ran ${frames} frames`).toBeGreaterThanOrEqual(40)
    expect(frames).toBeLessThanOrEqual(52)
  })

  it('both presets flow through the SAME spawnDebris / stepDebris (no engine fork)', async () => {
    const mod = await loadEngine()
    const volcano = needVolcano(mod)
    // Each preset produces a well-formed, one-piece-per-velocity burst from the
    // identical functions — reuse, proven structurally.
    for (const cfg of [mod.OBJECT_EXPLOSION, volcano]) {
      const s = mod.spawnDebris(cfg)
      expect(s.pieces.length).toBe(cfg.launchVelocities.length)
      expect(s.config).toBe(cfg)
      expect(mod.stepDebris(s), 'stepDebris returns a fresh state').not.toBe(s)
    }
  })
})
