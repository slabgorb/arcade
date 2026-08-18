// tests/df4-3-sim-wiring.test.ts
//
// Story df4-3 — RED phase (Han Solo / TEA). The abduction loop must reach the SCREEN,
// not just the module: the sim aggregate carries the landers + humanoids, and the
// dynamic composer blits them over the scrolling world so df4-6's visual playtest has
// something real to screenshot. Enemies are painted by df2 palette INDEX only.
//
// Seam (a GREEN decision, kept deliberately surgical so the df3-6 live-sim suite is
// undisturbed): at df4-3, createSim started with no enemies — `landers` and `humanoids`
// were empty arrays on a fresh sim. df4-3 adds two explicit spawn entries, `spawnLander(state,
// x)` and `spawnHumanoid(state, x, y)`, that return a new SimState with the enemy
// present in its view arrays (a df5 wave spawner, or df4-6, calls these). The views
// refresh from the shared enemy bank exactly as `lasers` refreshes from the laser bank.
//
// df5-10 UPDATE: createSim now SEEDS the ground humanoid population at game start (the
// df5-8 lander-wiring analog), so a fresh sim's `humanoids` is no longer empty — landers
// have prey. `landers` is still empty at createSim (the df5-8 wave director spawns them on
// the first tick, not at construction). The spawn-entry tests below now assert the DELTA a
// spawn adds, not an absolute count, so they survive the seeded population.
//
// Loader pattern mirrors df3-6-live-sim.test.ts: variable module specifiers keep
// `tsc --noEmit` from binding the observable-subset SimState to the concrete one, and
// a self-describing throw turns a missing export into an ABSENT-FEATURE RED.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeStaticFrame } from '../src/core/scene.js'

const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0
const YMIN = 42 // world.ts YMIN — enemies live in the [YMIN, YMAX] band

// The observable subset this suite reads. The enemy views are the new df4-3 fields;
// they carry at least a position so the composer can place them.
interface EnemyView {
  readonly x: number
  readonly y: number
}
interface SimState {
  readonly landers: readonly EnemyView[]
  readonly humanoids: readonly EnemyView[]
}
interface SimModule {
  createSim: (rand: () => number) => SimState
  spawnLander: (state: SimState, x: number) => SimState
  spawnHumanoid: (state: SimState, x: number, y: number) => SimState
}
interface DynamicSceneModule {
  composeFrame: (state: SimState, width: number, height: number) => Framebuffer
}

const SIM_SPECIFIER = '../src/core/sim.js'
const SCENE_SPECIFIER = '../src/core/scene.js'

async function loadSim(): Promise<SimModule> {
  const mod = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
  const missing = (['createSim', 'spawnLander', 'spawnHumanoid'] as const).filter((k) => typeof mod[k] !== 'function')
  if (missing.length > 0) {
    throw new Error(
      `src/core/sim.ts is missing df4-3 export(s): ${missing.join(', ')}. GREEN (Yoda) wires the ` +
        'abduction bank into the sim: createSim starts with empty `landers`/`humanoids` view arrays ' +
        '(refreshed from the enemy bank each stepSim, like `lasers`), plus `spawnLander(state, x)` and ' +
        '`spawnHumanoid(state, x, y)` returning a new SimState with the enemy present. PURE core.',
    )
  }
  return mod as SimModule
}

async function loadDynamicScene(): Promise<DynamicSceneModule> {
  const mod = (await import(/* @vite-ignore */ SCENE_SPECIFIER)) as Partial<DynamicSceneModule>
  if (typeof mod.composeFrame !== 'function') {
    throw new Error(
      'src/core/scene.ts has no `composeFrame` export — df3-6 lands it; df4-3 GREEN extends it to blit ' +
        'landers (LNDP1) and humanoids (ASTP1) over the world, by palette INDEX only.',
    )
  }
  return mod as DynamicSceneModule
}

/** Deterministic byte source (LCG), same shape df3-6 uses — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

describe('df4-3 sim wiring — the abduction loop is carried by the sim', () => {
  it('a fresh sim seeds the ground humanoid population; landers stay empty until a wave spawns (df3 live-sim undisturbed)', async () => {
    const { createSim } = await loadSim()
    const s = createSim(makeRand(1))
    expect(Array.isArray(s.landers), 'SimState carries a `landers` view array').toBe(true)
    expect(Array.isArray(s.humanoids), 'SimState carries a `humanoids` view array').toBe(true)
    expect(s.landers.length, 'a fresh sim has no landers yet — the df5-8 wave director spawns them on the first tick').toBe(0)
    expect(
      s.humanoids.length,
      'df5-10 seeds the ground humanoid population at game start (PTARG astronauts), so landers have prey',
    ).toBeGreaterThan(0)
  })

  it('spawnHumanoid / spawnLander add enemies to the sim views', async () => {
    const { createSim, spawnLander, spawnHumanoid } = await loadSim()
    let s = createSim(makeRand(2))
    // df5-10 pre-seeds the ground population, so assert the DELTA a spawn adds, not an absolute.
    const humanoids0 = s.humanoids.length
    const landers0 = s.landers.length
    s = spawnHumanoid(s, 1000, YMIN + 120)
    s = spawnLander(s, 1000)
    expect(s.humanoids.length, 'the spawned humanoid is added to the view').toBe(humanoids0 + 1)
    expect(s.landers.length, 'the spawned lander is added to the view').toBe(landers0 + 1)
    // The lander appears at the top band (LANDER_SPAWN_Y = YMIN+2 = 44); assert one is
    // near the top, not buried in the terrain (the render would otherwise place it wrong).
    expect(
      s.landers.some((l) => l.y < YMIN + 20),
      'the fresh lander is at the top of the play-field',
    ).toBe(true)
  })
})

describe('df4-3 render wiring — composeFrame paints the enemies (colour by INDEX only)', () => {
  it('a frame WITH a spawned lander DIFFERS from the same fresh frame without it', async () => {
    // The canonical DIFFER lesson, applied to render: proving the lander is actually
    // blitted, not silently dropped. Same seed, same dims — the ONLY difference is the
    // spawned lander, so the frames must differ.
    const { createSim, spawnLander } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const empty = composeFrame(createSim(makeRand(3)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withLander = composeFrame(spawnLander(createSim(makeRand(3)), 1000), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      digest(withLander),
      'composeFrame ignored the spawned lander — the frame is byte-identical to the enemy-free frame',
    ).not.toBe(digest(empty))
  })

  it('every composed cell stays a valid 4-bit palette index (0..15) with enemies present', async () => {
    // still-frame/df3-6 pin this for the ship/laser/star colours; the lander (LNDP1) and
    // humanoid (ASTP1) blits write colours too, and an index > 15 renders as CRAM[i & 0x0f]
    // — a colour the palette never named. Sample the abduction population, not a bare sim.
    const { createSim, spawnLander, spawnHumanoid } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = createSim(makeRand(5))
    s = spawnHumanoid(s, 900, YMIN + 130)
    s = spawnHumanoid(s, 1600, YMIN + 100)
    s = spawnLander(s, 900)
    const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(fb.data.some((i) => i !== BACKGROUND), 'the composed frame is blank').toBe(true)
    let worst = 0
    for (const px of fb.data) if (px > worst) worst = px
    expect(worst, `a composed cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(
      15,
    )
  })

  it('the enemy-populated frame is not merely the static title still', async () => {
    const { createSim, spawnLander, spawnHumanoid } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = createSim(makeRand(9))
    s = spawnHumanoid(s, 1000, YMIN + 120)
    s = spawnLander(s, 1000)
    const live = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const still = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(digest(live), 'the live abduction frame is byte-identical to the static title still').not.toBe(
      digest(still),
    )
  })
})
