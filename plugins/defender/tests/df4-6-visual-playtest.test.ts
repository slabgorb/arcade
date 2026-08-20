// tests/df4-6-visual-playtest.test.ts
//
// Story df4-6 — RED phase (O'Brien / TEA). The df4 VISUAL PLAYTEST, mechanised — the
// dynamic counterpart of df2-6's still-frame suite. df2-6 proved the STATIC pieces
// (palette + charset + objects + terrain) compose into one upright still. df4-6 proves
// the DYNAMIC df4 menagerie composes into the LIVE frame the player screenshots at
// http://127.0.0.1:5270/defender/ :
//
//   1. enemies MATERIALIZE — the df4-2 APPEAR animation (SAMEXAP7 APST) plays when an
//      enemy appears, and composeFrame renders it.
//   2. a laser KILLS one via the ACCESSIBILITY-SAFE explosion — the df4-1 COLIDE seam
//      runs in stepSim, a laser overlapping a lander kills it (LKIL1) and starts the
//      df4-2 EXPLODE effect (SAMEXAP7 EXST), rendered as a LOCALIZED burst. NO death
//      path writes a whole-framebuffer strobe (ADR-0005, the ONE exception to
//      ROM-always-wins — docs/adr/0005-photosensitivity-accessibility-exception.md).
//   3. a lander ABDUCTS a humanoid — the df4-3 loop, driven through the LIVE stepSim
//      (not just the bank), reaches the composed frame.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// df4-1 (collision.ts) and df4-2 (effects.ts) are built, pure, and gated IN ISOLATION,
// but NOTHING wires them into the live sim: `grep effects|collide src/core/sim.ts
// src/core/scene.ts` is empty. SimState carries no `effects` view; composeFrame blits
// no explosion or materialize animation; stepSim runs no laser-vs-enemy hit test. So a
// laser passes through every lander and no enemy ever appears-in or blows-up on screen.
// The abduction (df4-3) IS wired, so those assertions lock it as a regression while the
// rest drive the integration GREEN must build.
//
// ─── THE CONTRACT GREEN (Dev) BUILDS ─────────────────────────────────────────────
//   • SimState gains an `effects` VIEW — `readonly effects: readonly PlacedEffect[]`,
//     refreshed each stepSim from an effect bank exactly as `lasers`/`landers` refresh
//     (df4-3 precedent). Empty on a fresh sim, so every existing composeFrame test is
//     undisturbed. Each entry carries at least { kind:'appear'|'explode', x, y, done }
//     and the INERT picture it animates (df4-2 EffectState references OBJECTS, invents
//     no pixels).
//   • spawnLander(state, x) MATERIALIZES the lander: it enqueues an 'appear' effect
//     (APST) at the lander, so a freshly spawned lander carries one in `effects`.
//   • spawnExplosion(state, x, y) starts an 'explode' effect (EXST) at (x, y) — the
//     public seam the COLIDE wiring uses AND the playtest drives deterministically,
//     mirroring df4-3's spawnLander/spawnHumanoid.
//   • composeFrame renders `state.effects` — the appear shrink / explode grow animation
//     over the referenced picture, by palette INDEX only (colour is never invented).
//   • stepSim runs the df4-1 COLIDE seam (laserVsObject) against the landers: a laser
//     whose box overlaps a lander kills it (killLander) and spawns an explode effect.
//     The explosion is classify('enemy-explode') === 'localized' — rastered normally,
//     bounded in area; it does NOT invert or white-fill the whole framebuffer.
//
// Loader pattern mirrors df4-3-sim-wiring.test.ts: a variable module specifier keeps
// `tsc --noEmit` from binding this file's observable-subset SimState to the concrete
// one, and a self-describing throw turns a missing export into an ABSENT-FEATURE RED.
//
// ─── df5 ACCESSIBILITY NOTE (carried forward, per the story) ──────────────────────
// df5 adds the SMART BOMB (SBOMB, COM PCRAM, defender/DEFA7.SRC:3199) and HYPERSPACE
// (HYPER, defender/DEFA7.SRC:3211) — both ROM full-screen strobes. ADR-0005 binds them
// too: they must FREEZE/FADE/particle, never strobe, and each cites the ADR as a Design
// Deviation. df4-6 pins the death path safe here so df5 inherits a proven guard; df7
// then asserts "no strobe anywhere" fleet-wide. This suite does NOT exercise SBOMB/HYPER
// (out of df4 scope) — it only forbids the enemy-death strobe df4 introduces.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeStaticFrame } from '../src/core/scene.js'
import { classify, assertNoFullFrameStrobe } from '../src/core/effects.js'

const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0
const YMIN = 42 // world.ts YMIN — enemies live in the [YMIN, YMAX] band

// The neutral input snapshot: no thrust, no fire — the sim coasts, so the abduction
// scenario is undisturbed by lasers scrolling the world.
const IDLE = { thrust: false, reverse: false, up: false, down: false, fire: false } as const
// Hold fire (ship dwelling in place) — the kill scenario, where the player's laser stream
// meets a lander descending into the beam row.
const FIRE = { thrust: false, reverse: false, up: false, down: false, fire: true } as const

// ─── Observable subsets ──────────────────────────────────────────────────────────
// The df4-6 addition is the `effects` view; the enemy/ship views come from df3/df4-3.
interface PlacedEffect {
  readonly kind: 'appear' | 'explode'
  readonly x: number
  readonly y: number
  readonly done: boolean
}
interface EnemyView {
  readonly x: number
  readonly y: number
  readonly alive?: boolean
  readonly carrying?: boolean
  readonly state?: string
}
interface ShipView {
  readonly x: number
  readonly y: number
}
interface SimState {
  readonly ship: ShipView
  readonly landers: readonly EnemyView[]
  readonly humanoids: readonly EnemyView[]
  readonly effects: readonly PlacedEffect[]
}
interface Input {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
}
interface SimModule {
  createSim: (rand: () => number) => SimState
  spawnLander: (state: SimState, x: number) => SimState
  spawnHumanoid: (state: SimState, x: number, y: number) => SimState
  spawnExplosion: (state: SimState, x: number, y: number) => SimState
  stepSim: (state: SimState, input: Input) => SimState
}
interface DynamicSceneModule {
  composeFrame: (state: SimState, width: number, height: number) => Framebuffer
}

const SIM_SPECIFIER = '../src/core/sim.js'
const SCENE_SPECIFIER = '../src/core/scene.js'

async function loadSim(): Promise<SimModule> {
  const mod = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
  const missing = (['createSim', 'spawnLander', 'spawnHumanoid', 'spawnExplosion', 'stepSim'] as const).filter(
    (k) => typeof mod[k] !== 'function',
  )
  if (missing.length > 0) {
    throw new Error(
      `src/core/sim.ts is missing df4-6 export(s): ${missing.join(', ')}. GREEN wires df4-1 collision + ` +
        'df4-2 effects into the live sim: SimState gains a `effects` view (refreshed each stepSim like ' +
        '`lasers`); spawnLander enqueues an APPEAR effect (materialize); `spawnExplosion(state, x, y)` starts ' +
        'an EXST explode effect; and stepSim runs laserVsObject against the landers, killing a hit lander ' +
        '(killLander) and spawning a LOCALIZED explosion. PURE core — colour by palette INDEX only.',
    )
  }
  return mod as SimModule
}

async function loadDynamicScene(): Promise<DynamicSceneModule> {
  const mod = (await import(/* @vite-ignore */ SCENE_SPECIFIER)) as Partial<DynamicSceneModule>
  if (typeof mod.composeFrame !== 'function') {
    throw new Error('src/core/scene.ts has no `composeFrame` export — df3-6 lands it; df4-6 GREEN renders `effects`.')
  }
  return mod as DynamicSceneModule
}

/** Deterministic byte source (LCG), the shape df3-6/df4-3 use — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** Drive stepSim until `pred(state)` holds or `budget` ticks pass; returns the final
 *  state and whether the predicate was met. Enemies advance on the ONE cabinet scheduler
 *  stepSim pumps (df3 scheduler.ts) — no per-enemy tick. */
function stepUntil(
  sim: SimModule,
  start: SimState,
  input: Input,
  pred: (s: SimState) => boolean,
  budget: number,
): { state: SimState; met: boolean } {
  let state = start
  for (let i = 0; i < budget; i++) {
    if (pred(state)) return { state, met: true }
    state = sim.stepSim(state, input)
  }
  return { state, met: pred(state) }
}

/** Count cells that differ between two equal-length frames. */
function changedCells(a: Framebuffer, b: Framebuffer): number {
  let n = 0
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++
  return n
}

// ─── 1. The effects view exists and starts empty (df3/df4-3 undisturbed) ───────────
describe('df4-6 — SimState carries an `effects` view, empty on a fresh sim', () => {
  it('a fresh sim exposes an empty `effects` array (no materialize/explosion until something happens)', async () => {
    const sim = await loadSim()
    const s = sim.createSim(makeRand(1))
    expect(Array.isArray(s.effects), 'SimState must carry an `effects` view array (like `lasers`/`landers`)').toBe(true)
    expect(s.effects.length, 'a fresh sim has no in-flight effects').toBe(0)
  })
})

// ─── 2. MATERIALIZE — spawning an enemy plays the df4-2 APPEAR animation ────────────
describe('df4-6 — enemies MATERIALIZE (df4-2 APPEAR / SAMEXAP7 APST)', () => {
  it('spawnLander enqueues an APPEAR effect at the new lander', async () => {
    const sim = await loadSim()
    const s = sim.spawnLander(sim.createSim(makeRand(2)), 1000)
    expect(
      s.effects.some((e) => e.kind === 'appear'),
      'a freshly spawned lander must materialize — an APPEAR effect (APST) is enqueued when it appears',
    ).toBe(true)
  })

  it('composeFrame RENDERS the appear effect — the frame changes when only `effects` is emptied', async () => {
    // Isolate the EFFECT's contribution: the lander itself renders in both frames; the
    // ONLY difference is whether the appear effect is present. If the two digests match,
    // composeFrame ignored `effects` and nothing materialized on screen.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const withAppear = sim.spawnLander(sim.createSim(makeRand(3)), 1000)
    const withoutEffects: SimState = { ...withAppear, effects: [] }
    expect(
      digest(composeFrame(withAppear, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'composeFrame ignored the APPEAR effect — the materialize animation never reaches the frame',
    ).not.toBe(digest(composeFrame(withoutEffects, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })
})

// ─── 3. SAFE KILL — a LOCALIZED explosion, never a full-screen strobe (ADR-0005) ────
describe('df4-6 — a killed enemy EXPLODES safely (df4-2 EXPLODE / ADR-0005)', () => {
  it("classify('enemy-explode') is LOCALIZED — an ordinary enemy death rasters, it does not strobe", () => {
    // The policy the render relies on. A regression that reclassified enemy death as a
    // full-frame strobe would seize the owner; lock it here alongside the render proof.
    const policy = classify('enemy-explode')
    expect(policy.class, 'an enemy explosion must be LOCALIZED, never a full-frame strobe').toBe('localized')
    expect(policy.presentation, 'an enemy explosion rasters normally').toBe('raster')
  })

  it('spawnExplosion enqueues an EXPLODE effect that composeFrame renders', async () => {
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const s = sim.spawnExplosion(sim.createSim(makeRand(4)), 20 << 8, 120) // pt1-18: on-screen (offset 20<<8=5120 < 9600 window)
    expect(s.effects.some((e) => e.kind === 'explode'), 'spawnExplosion must enqueue an EXST explode effect').toBe(true)
    const withExplosion: SimState = s
    const withoutEffects: SimState = { ...s, effects: [] }
    expect(
      digest(composeFrame(withExplosion, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'composeFrame ignored the EXPLODE effect — no explosion reaches the frame',
    ).not.toBe(digest(composeFrame(withoutEffects, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })

  it('the explosion is LOCALIZED and passes assertNoFullFrameStrobe — NO death flashes the whole screen (ADR-0005)', async () => {
    // The heart of the accessibility exception. The explosion frame is compared to the
    // SAME frame without the effect: assertNoFullFrameStrobe (the df4-2 render guard,
    // fails CLOSED) must NOT throw — the death is not a whole-framebuffer white-fill or
    // inversion. And the burst is BOUNDED: it repaints a small fraction of the frame, not
    // most of it. A full-screen strobe would trip both.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const s = sim.spawnExplosion(sim.createSim(makeRand(5)), 20 << 8, 120) // pt1-18: on-screen (offset 20<<8=5120 < 9600 window)
    const base = composeFrame({ ...s, effects: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const boom = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    // Preconditions: the effect actually rendered (else the safety check is vacuous — the
    // repo's own "zero-canvas guard vacuous" trap).
    const changed = changedCells(base, boom)
    expect(changed, 'the explosion rendered no pixels — the safety assertion below would be vacuous').toBeGreaterThan(0)

    expect(
      () => assertNoFullFrameStrobe(base.data, boom.data),
      'the enemy death rendered a whole-framebuffer strobe — ADR-0005 forbids it (the owner has photosensitive epilepsy)',
    ).not.toThrow()

    // Localized: a seizure-safe burst touches a small region, not the whole screen. Even a
    // strobe that spares one cell (which assertNoFullFrameStrobe would miss) fails here.
    const total = LOGICAL_WIDTH * LOGICAL_HEIGHT
    expect(
      changed / total,
      `the explosion repainted ${changed}/${total} cells — an enemy burst must be LOCALIZED, not near-full-screen`,
    ).toBeLessThan(0.1)
  })
})

// ─── 4. THE KILL IS WIRED — a laser overlapping a lander kills it in the LIVE tick ──
describe('df4-6 — the COLIDE seam runs in stepSim: a laser kills a descending lander', () => {
  it('a spawned lander, crossing the firing ship, is killed and leaves an explosion behind', async () => {
    // The integration the epic headlines ("the first effects that kill"). The ship climbs
    // into the lander's descent band and holds fire; a laser box that overlaps the lander
    // (df4-1 laserVsObject) kills it (LKIL1) and spawns an explode effect.
    //
    // GEOMETRY IS GREEN'S: authentic laser/lander velocities are Dev's to derive, so this
    // asserts the outcome is REACHED within a generous budget, not how fast — the df4-3
    // MAX_TICKS idiom. A lander placed in the ship's forward field that is NEVER killed
    // under continuous fire is an unwired COLIDE seam, which is exactly what RED proves.
    // If an authentic geometry needs a different staging, GREEN adjusts the scenario;
    // it may NOT satisfy this by leaving collision unwired.
    const sim = await loadSim()
    // STAGING (within the license above; RE-STAGED for pt1-19): the ship dwells at its start row
    // and holds fire, so its laser stream is a steady rightward beam along SHIP_ROW. Since pt1-19,
    // a lander only DIVES toward a target it is column-aligned with (LANDS0); otherwise it roams.
    // So we plant a bait humanoid at the GROUND row in the lander's OWN column (col 38, just right
    // of the ship's col 32 — the near firing-lane the beam sweeps first). The aligned lander runs
    // the full abduction: it dives down the near firing-lane to the ground humanoid, grabs, and
    // carries it back UP through SHIP_ROW — and an authentic laser box (df4-1 laserVsObject) overlaps
    // and kills it during that run (verified: killed ~tick 172, explosion + points). The bait is
    // NEARER than any of df5-10's auto-seeded ground humanoids (~0 vs ~3175 to the nearest seeded
    // column), so nearestTarget picks it deterministically. SHIP_ROW mirrors sim.ts INITIAL_Y.
    // Deterministic under the seed.
    const GROUND_ROW = 232 // near the floor (below SHIP_ROW=INITIAL_Y=120): the abduction run climbs back up through the beam
    let s = sim.createSim(makeRand(7))
    s = sim.spawnHumanoid(s, 38 << 8, GROUND_ROW) // lander's own column, on the ground → aligned abduction run up the firing-lane
    s = sim.spawnLander(s, 38 << 8) // near the ship's firing lane; column-aligned with the bait → dives, grabs, carries up through the beam
    const before = s.landers.length
    expect(before, 'precondition: one lander is airborne').toBeGreaterThan(0)

    const { state, met } = stepUntil(
      sim,
      s,
      FIRE,
      (st) => st.landers.length < before && st.effects.some((e) => e.kind === 'explode'),
      20_000,
    )
    expect(
      met,
      'no laser ever killed the descending lander (or the kill spawned no explosion) — the COLIDE seam is not wired into stepSim',
    ).toBe(true)
    expect(state.effects.some((e) => e.kind === 'explode'), 'the kill left an explosion effect behind').toBe(true)
  })
})

// ─── 5. ABDUCTION reaches the LIVE frame (df4-3, driven through stepSim) ────────────
describe('df4-6 — a lander ABDUCTS a humanoid in the live composed frame (df4-3)', () => {
  it('driving stepSim, a lander grabs a humanoid and both render mid-abduction', async () => {
    // df4-3-sim-wiring proved the enemies are in the sim VIEWS; df4-6 proves the abduction
    // LOOP animates through the live stepSim and reaches the composed frame. IDLE input
    // (no fire) so no laser kills the lander before it grabs.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = sim.createSim(makeRand(11))
    const COL = 1000
    s = sim.spawnHumanoid(s, COL, YMIN + 120)
    s = sim.spawnLander(s, COL) // same column: it descends onto the target and grabs

    const { state, met } = stepUntil(
      sim,
      s,
      IDLE,
      (st) => st.landers.some((l) => l.carrying === true) && st.humanoids.some((h) => h.state === 'grabbed'),
      20_000,
    )
    expect(met, 'a lander in the humanoid’s column must grab it when driven through stepSim').toBe(true)

    // Both the carrying lander and the grabbed (still-alive) humanoid are on screen: the
    // populated frame differs from the same sim with the enemies removed from the views.
    const withAbduction = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const emptied: SimState = { ...state, landers: [], humanoids: [] }
    expect(
      digest(withAbduction),
      'the abduction pair (lander + grabbed humanoid) is not painted into the composed frame',
    ).not.toBe(digest(composeFrame(emptied, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })
})

// ─── 6. The df4 live frame DIFFERS from a control (the canonical-serve lesson) ──────
describe('df4-6 — the populated df4 frame is a real render, not the empty/static control', () => {
  it('a frame with a materializing enemy differs from the fresh sim AND from the static title still', async () => {
    // tests/canonical-serve.test.mjs already proves the served /defender/ path DIFFERs
    // from a nonsense control at the HTTP layer. This is the render-layer analogue (the
    // df2-6 / df4-3 idiom): the live df4 frame must not collapse to the empty frame or the
    // attract still — a fallback that answers the same bytes everywhere proves nothing.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const populated = composeFrame(sim.spawnLander(sim.createSim(makeRand(13)), 1000), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const empty = composeFrame(sim.createSim(makeRand(13)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const still = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(digest(populated), 'the populated df4 frame collapsed to the empty frame').not.toBe(digest(empty))
    expect(digest(populated), 'the live df4 frame is byte-identical to the static title still').not.toBe(digest(still))
  })

  it('every composed cell stays a valid 4-bit palette index (0..15) with effects + enemies present', async () => {
    // The effect blits (LNDP1 appear / explosion picture) write palette indices too; an
    // index > 15 renders as CRAM[i & 0x0f] — a colour the palette never named. Sample a
    // frame carrying an appear, an explosion and the abduction population at once.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = sim.createSim(makeRand(17))
    s = sim.spawnHumanoid(s, 900, YMIN + 130)
    s = sim.spawnLander(s, 900) // materializes (appear effect)
    s = sim.spawnExplosion(s, 1500 << 8, 100) // an explosion elsewhere
    const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(fb.data.some((i) => i !== BACKGROUND), 'the composed frame is blank').toBe(true)
    let worst = 0
    for (const px of fb.data) if (px > worst) worst = px
    expect(worst, `a composed cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(
      15,
    )
  })
})
