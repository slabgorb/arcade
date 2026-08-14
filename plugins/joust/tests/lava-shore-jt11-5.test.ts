// tests/lava-shore-jt11-5.test.ts
//
// Story jt11-5 — RED phase (Tyr / TEA). TWO defects, sim and render, one seam:
// the mutable arena (jt3-2's ArenaState) is COMPUTED every wave but consumed
// only by the troll gate (troll.ts), and the lava-shore planks the whole
// bottom row's footing claims to stand on are never drawn at all.
//
//   (A) RENDER — BRIDGE/BRIDG2 (JOUSTRV4.SRC:1126-1127) are SOLID-COLOUR DMA
//       fills, not pictures: `FDB $1200+LIB*$11,0,$00D3,$1B03!XDMAFIX` — the
//       source word is 0, the colour byte is LIB*$11 (LIB EQU $8, :60), the
//       dest/len words decode (×2 on X) to 54×3 at (0,211) and 60×3 at
//       (240,211). No atlas block can carry them, so `drawList` grows a
//       `kind: 'fill'` op and the shell paints it with fillRect (wiring pinned
//       in tests/lava-shore-jt11-5-wiring.test.ts). Without them the LNDXUP
//       `ORA #$20` footing (flight.ts landMaskAtX) is invisible black at
//       x 0-54 / 240-300, y 211.
//   (B) SIM — the burn-off must be CONSUMED by the production ground paths:
//       • `groundMaskAt` drops the baked `ORA #$20` once `arena.bridgeBurned`
//         (the LAVAB per-column clear, JOUSTRV4.SRC:5258-5264, at the
//         bit granularity jt3-2 ruled) — the planks lose footing, the CLIF5
//         island keeps its own NATIVE table bits (indestructible,
//         arena-state.ts);
//       • the player/enemy/egg steppers thread the arena into their
//         land/walk-off/bounce checks (frame.ts, enemy.ts, sim.ts stepEgg) so
//         a destroyed cliff's landing bit VETOES a landing
//         (`groundOutcomeInState`) and a burned plank drops its stander —
//         CKGND answers EQ only for a real platform; LNDB7 ("LAVA TROLLS")
//         explicitly "INDICATE[s] NOT TO LAND" (JOUSTRV4.SRC:6764,6792), so
//         "on the ground" is `kind === 'platform'`, NOT `kind !== 'airborne'`;
//       • the enemy cliff look-ahead's BCKXTB sample honours destroyed cliffs
//         (`backgroundActive` — WCLFEW clears the BCKXD1 bits, :2301-2325);
//       • `drawList` filters BACKGROUND_RECORDS by `arena.destroyedCliffs`
//         (today it never reads `demo.arena` at all).
//
// OUT OF SCOPE (jt11-7): the CLFDES crumble animation. The CLIF5 island's own
// records must keep rendering — it is never destroyed.
//
// The wave-advance driver (forceAdvance) is demo-troll.test.ts's, verbatim: the
// call-site under it (stepSim re-applying applyWaveDestruction) has been pinned
// since jt3-3.

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type DrawOp,
  type EggState,
} from './helpers/sim-contract.js'
import { loadArenaState } from './helpers/arena-state-contract.js'
import { loadFlight, type EntityState, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadScheduler } from './helpers/scheduler-contract.js'
import { loadEnemy, type EnemyState } from './helpers/enemy-contract.js'
import { BACKGROUND_RECORDS } from '../src/core/pictures.js'
// Review round 2 (F4): the z-order split the expected-order helper applies is
// THE production predicate, not a re-derived 0xc0 literal that could desync.
import { isForegroundArena } from '../src/core/sim.js'

const SEED = 0x1234

const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

// ─── The transcription under test, stated once ───────────────────────────────
// BRIDGE  FDB $1200+LIB*$11,0,$00D3,$1B03!XDMAFIX  (JOUSTRV4.SRC:1126)
// BRIDG2  FDB $1200+LIB*$11,0,$78D3,$1E03!XDMAFIX  (JOUSTRV4.SRC:1127)
// dest $00D3 → x 0x00×2 = 0,   y 0xD3 = 211;  len $1B03 → w 0x1B×2 = 54, h 3
// dest $78D3 → x 0x78×2 = 240, y 0xD3 = 211;  len $1E03 → w 0x1E×2 = 60, h 3
// colour LIB*$11 = $88 — two 4-bit pixels of PROM nibble 8 (LIB EQU $8, :60).
const BRIDGE_FILL = { kind: 'fill', name: 'BRIDGE', x: 0, y: 211, width: 54, height: 3, colour: 8 }
const BRIDG2_FILL = { kind: 'fill', name: 'BRIDG2', x: 240, y: 211, width: 60, height: 3, colour: 8 }

// Probe columns, chosen off the transcribed LNDXS1 regions:
//   PLANK_L / PLANK_R sit on the shore planks — their footing exists ONLY
//   through the wave-init `ORA #$20` (the native table byte has no $20 bit);
//   ISLAND sits on CLIF5's own span — the native byte CARRIES $20, so the burn
//   must not touch it (the ROM's flame STOPS at the island: "HIT CLIFF5?
//   BR=YES, STOP!!!", JOUSTRV4.SRC:5264-5265).
const PLANK_L = 20
const PLANK_R = 250
const ISLAND = 100

/** The CLIF5 band's Y row a stander's feet-below check reads (bandTop 211). */
const SHORE_Y = 211

/** Force ONE wave advance (demo-troll.test.ts, verbatim): strip to players so
 *  the wave is "cleared", step once — stepSim advances the wave and re-applies
 *  wave destruction to `demo.arena`. */
function forceAdvance(step: (d: SimState) => SimState, demo: SimState): SimState {
  const players = demo.sim.processes.filter((p: SimProcess) => p.kind === 'player')
  const stripped: SimState = { ...demo, sim: { ...demo.sim, processes: players } }
  return step(stripped)
}

/** Advance a fresh demo to `wave` through the REAL wave-event path. */
async function demoAtWave(wave: number): Promise<SimState> {
  const demo = await loadSim()
  let d = demo.createWaveSim(SEED)
  while (d.wave < wave) d = forceAdvance(demo.stepSim, d)
  return d
}

/** A minimal airborne player entity (flight.test.ts's fixture shape). */
function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

/** A full EggState (demo.test.ts's eggOf shape). */
function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 0,
    settled: false,
    ...over,
  }
}

// ── The arena-op identity space ──────────────────────────────────────────────
// drawList names an arena op after the record's pixel SOURCE (rec.source), not
// the record — CLIF1L and its second-variant row CLIF1L_CSRC1L both emit ops
// named CSRC1L. So a destroyed cliff is matched on the RECORD (its name, or the
// `CLIF_` prefix of a variant row) and asserted in op space via this projection
// — the exact fields drawList derives (x doubled, y/height the low bytes).
interface ArenaOpShape {
  name: string
  x: number
  y: number
  height: number
}
const projected = (rec: (typeof BACKGROUND_RECORDS)[number]): ArenaOpShape => ({
  name: rec.source,
  x: ((rec.dest >> 8) & 0xff) * 2,
  y: rec.dest & 0xff,
  height: rec.wh & 0xff,
})
/** The cliff a record belongs to: `CLIF2_CSRC2` → `CLIF2`; primaries themselves. */
const cliffOf = (rec: (typeof BACKGROUND_RECORDS)[number]): string => rec.name.split('_')[0]

/** All BACKGROUND_RECORDS ops surviving `destroyed`, in drawList's OWN order:
 *  the back group (destY < $C0) first, the foreground group after the sprites
 *  (the jt3-7 z-order split, `isForegroundArena`). */
function survivingOps(destroyed: readonly string[]): ArenaOpShape[] {
  const gone = new Set(destroyed)
  const kept = BACKGROUND_RECORDS.filter((r) => !gone.has(cliffOf(r)))
  const back = kept.filter((r) => !isForegroundArena(r.dest & 0xff))
  const fore = kept.filter((r) => isForegroundArena(r.dest & 0xff))
  return [...back, ...fore].map(projected)
}

const fills = (ops: DrawOp[]): DrawOp[] => ops.filter((op) => op.kind === 'fill')
const arenaOps = (ops: DrawOp[]): ArenaOpShape[] =>
  ops
    .filter((op) => op.kind === 'arena')
    .map((op) => ({ name: op.name, x: op.x, y: op.y, height: op.height ?? -1 }))
/** The op names a cliff's records project to (CSRC*, shared by its variants). */
const sourcesOf = (cliff: string): string[] =>
  BACKGROUND_RECORDS.filter((r) => cliffOf(r) === cliff).map((r) => r.source)

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE PLANKS EXIST (defect A). drawList emits the two solid fills,
//        behind the sprites, while the bridge stands.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the BRIDGE/BRIDG2 lava-shore planks are drawn as solid fills', () => {
  it('emits exactly one BRIDGE fill: 54×3 at (0,211), colour nibble 8', async () => {
    const demo = await loadSim()
    const ops = demo.drawList(demo.createWaveSim(SEED))
    const bridge = fills(ops).filter((op) => op.name === 'BRIDGE')
    expect(bridge, 'one op per DMA record — not a per-row expansion').toHaveLength(1)
    expect(bridge[0]).toMatchObject(BRIDGE_FILL)
  })

  it('emits exactly one BRIDG2 fill: 60×3 at (240,211), colour nibble 8', async () => {
    const demo = await loadSim()
    const ops = demo.drawList(demo.createWaveSim(SEED))
    const bridg2 = fills(ops).filter((op) => op.name === 'BRIDG2')
    expect(bridg2).toHaveLength(1)
    expect(bridg2[0]).toMatchObject(BRIDG2_FILL)
  })

  it('the planks are BACKGROUND — both fills precede every entity op', async () => {
    // The ROM writes BRIDGE/BRIDG2 with the arena's background objects at wave
    // init (LDY #BRIDGE / LDY #BRIDG2, JOUSTRV4.SRC:998,1002); sprites paint on
    // top every frame. A fill emitted after the entities would sit ON the feet
    // of anything standing at y 211.
    const demo = await loadSim()
    const ops = demo.drawList(demo.createWaveSim(SEED))
    const firstEntity = ops.findIndex((op) => op.kind === 'entity')
    expect(firstEntity, 'premise: a fresh demo draws entities').toBeGreaterThan(-1)
    for (const name of ['BRIDGE', 'BRIDG2']) {
      const at = ops.findIndex((op) => op.kind === 'fill' && op.name === name)
      expect(at, `${name} is emitted`).toBeGreaterThan(-1)
      expect(at, `${name} is painted before the sprites`).toBeLessThan(firstEntity)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE PLANKS BURN OFF (defects A+B meet). Once the wave-3 event burns
//        the bridge, the fills are gone — and it is the ARENA drawList reads,
//        not the wave number.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the burn-off removes the plank fills, driven by demo.arena', () => {
  it('the REAL path: advancing across wave 3 removes both PLANK fills', async () => {
    const demo = await loadSim()
    const d3 = await demoAtWave(3)
    expect(d3.arena.bridgeBurned, 'premise (jt3-3): wave 3 burned the bridge').toBe(true)
    // jt11-18 — the burn now draws a LAVA fill over the vacated span, so "0 fills"
    // is no longer the burn's signature; the PLANKS specifically must be gone.
    const plankNames = fills(demo.drawList(d3)).map((op) => op.name).filter((n) => n === 'BRIDGE' || n === 'BRIDG2')
    expect(plankNames, 'no plank fill survives the burn').toHaveLength(0)
  })

  it('the PRODUCER pin: a stale pristine arena on the same wave-3 demo keeps the fills', async () => {
    // Counterfactual splice — if drawList keyed off `demo.wave` (or anything
    // else) instead of consuming `demo.arena`, this arm could not diverge from
    // the one above.
    const demo = await loadSim()
    const arenaMod = await loadArenaState()
    const d3 = await demoAtWave(3)
    const stale: SimState = { ...d3, arena: arenaMod.initialArenaState() }
    const names = fills(demo.drawList(stale)).map((op) => op.name)
    expect(names.sort(), 'an unburned arena still draws both planks').toEqual([
      'BRIDG2',
      'BRIDGE',
    ])
  })

  it('and the converse: a burned arena spliced onto a FRESH wave-1 demo removes the planks', async () => {
    const demo = await loadSim()
    const fresh = demo.createWaveSim(SEED)
    const burned: SimState = {
      ...fresh,
      arena: { ...fresh.arena, bridgeBurned: true },
    }
    // jt11-18 — the lava fill replaces the planks over the burned span; the planks
    // themselves must be gone (the burn's actual signature).
    const plankNames = fills(demo.drawList(burned)).map((op) => op.name).filter((n) => n === 'BRIDGE' || n === 'BRIDG2')
    expect(plankNames).toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — DESTROYED CLIFFS STOP DRAWING (defect B, render arm). drawList filters
//        BACKGROUND_RECORDS by arena.destroyedCliffs — primary record AND the
//        second-variant `_CSRC` rows both go; CLIF5/CLIF3*/TRANS never go.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — drawList drops a destroyed cliff’s background records', () => {
  it('the REAL path: wave 6 (WSTATUS $41) destroys CLIF2 and its records vanish', async () => {
    const demo = await loadSim()
    const d6 = await demoAtWave(6)
    expect(d6.arena.destroyedCliffs, 'premise: wave 6 status $41 → WBCL2').toEqual(['CLIF2'])
    const names = arenaOps(demo.drawList(d6)).map((op) => op.name)
    for (const gone of sourcesOf('CLIF2')) {
      expect(names, `${gone} is not drawn while CLIF2 is destroyed`).not.toContain(gone)
    }
    expect(names, 'an intact cliff still draws').toContain('CSRC1L')
    expect(names, 'the indestructible island still draws').toContain('CSRC5')
  })

  it('all four destructible cliffs at once ($F0): exactly their records go, in order', async () => {
    const demo = await loadSim()
    const arenaMod = await loadArenaState()
    const fresh = demo.createWaveSim(SEED)
    const all: SimState = {
      ...fresh,
      arena: arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0xf0),
    }
    expect(all.arena.destroyedCliffs, 'premise: the full WBCLS nibble').toEqual([
      'CLIF1L',
      'CLIF1R',
      'CLIF2',
      'CLIF4',
    ])
    // Identity + order, not a count: the surviving arena ops must be EXACTLY
    // the frozen record sequence minus the destroyed cliffs' records, each op
    // carrying its own record's derived geometry (a regenerated or reordered
    // list with the right length must fail).
    expect(arenaOps(demo.drawList(all))).toEqual(
      survivingOps(['CLIF1L', 'CLIF1R', 'CLIF2', 'CLIF4']),
    )
  })

  it('a REBUILT cliff draws again — destruction reflects the current wave', async () => {
    // The WCLFEW create path (JOUSTRV4.SRC:2335-2368): a later wave whose status
    // nibble drops the bit REBUILDS the cliff. drawList must follow the live
    // arena down as well as up.
    const demo = await loadSim()
    const arenaMod = await loadArenaState()
    const fresh = demo.createWaveSim(SEED)
    const wrecked = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0xf0)
    const rebuilt = arenaMod.applyWaveDestruction(wrecked, 2, 0x00)
    const d: SimState = { ...fresh, arena: rebuilt }
    expect(arenaOps(demo.drawList(d)), 'the full pristine record sequence returns').toEqual(
      survivingOps([]),
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — THE MASK LAW (defect B, the `ORA #$20` made conditional). Once
//        bridgeBurned, groundMaskAt is the plain table AND: the planks lose
//        their granted $20, the island keeps its native $20.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — groundMaskAt drops the baked OR-$20 once the bridge burns', () => {
  it('premises (pass today): the planks’ footing is GRANTED, the island’s is NATIVE', async () => {
    const f = await loadFlight()
    const a = await loadArena()
    for (const x of [PLANK_L, PLANK_R]) {
      expect(
        f.LND_X_TABLE[x + f.X_TABLE_ORIGIN] & 0x20,
        `x=${x}: no native $20 — the plank column exists only through LNDXUP`,
      ).toBe(0)
    }
    expect(
      f.LND_X_TABLE[ISLAND + f.X_TABLE_ORIGIN] & 0x20,
      'x=100: CLIF5’s own span carries $20 in LNDXS1 itself',
    ).not.toBe(0)
    // And the mask a stander's feet-below check reads today, on all three:
    expect(f.groundMaskAt(PLANK_L, SHORE_Y) & 0x20).not.toBe(0)
    expect(f.groundMaskAt(PLANK_R, SHORE_Y) & 0x20).not.toBe(0)
    expect(f.groundMaskAt(ISLAND, SHORE_Y) & 0x20).not.toBe(0)
    // Bit 7 without bit 5 is the lava-troll zone, and it does NOT land:
    expect(a.groundOutcome(0x80).kind, 'LNDB7 “INDICATE NOT TO LAND”').toBe('troll')
  })

  it('burned: the plank columns lose $20; what remains is the troll zone', async () => {
    const f = await loadFlight()
    const a = await loadArena()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    expect(burned.bridgeBurned, 'premise: wave 3 burns').toBe(true)
    for (const x of [PLANK_L, PLANK_R]) {
      const mask = f.groundMaskAt(x, SHORE_Y, burned)
      expect(mask & 0x20, `x=${x}: the granted footing is gone`).toBe(0)
      expect(a.groundOutcome(mask).kind, `x=${x}: the shore is lava-troll space now`).toBe('troll')
    }
  })

  it('burned: the CLIF5 island still lands — the flame stops at the island', async () => {
    const f = await loadFlight()
    const a = await loadArena()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const outcome = a.groundOutcome(f.groundMaskAt(ISLAND, SHORE_Y, burned))
    expect(outcome.kind).toBe('platform')
  })

  it('back-compat: an INTACT arena (and no arena at all) keep today’s mask, byte for byte', async () => {
    const f = await loadFlight()
    const arenaMod = await loadArenaState()
    const intact = arenaMod.initialArenaState()
    for (const x of [PLANK_L, ISLAND, PLANK_R]) {
      for (const y of [SHORE_Y, 81, 100]) {
        expect(f.groundMaskAt(x, y, intact), `(${x},${y}) with an intact arena`).toBe(
          f.groundMaskAt(x, y),
        )
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — THE PLAYER CONSUMES IT (frame.ts's land + walk-off pair).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-5 — stepFrame threads the arena into the player ground paths', () => {
  const standerAt = (x: number) =>
    entityAt(x, 210, { airborne: false, groundState: 'stand', posY: 210 << 8 })

  async function standerFrame(x: number) {
    const sched = await loadScheduler()
    const state = sched.spawn(sched.createState(SEED), {
      id: 1,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      entity: standerAt(x),
    })
    return { sched, state }
  }

  it('a stander on the plank loses its footing the frame the bridge is burned', async () => {
    // CKGND answers EQ ("on the ground") ONLY for a platform; the burned shore
    // dispatches LNDB7, which "INDICATE[s] NOT TO LAND" (JOUSTRV4.SRC:6792) —
    // so the walk-off condition is `!== 'platform'`, and the stander drops.
    const { sched, state } = await standerFrame(PLANK_L)
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const after = sched.stepFrame(state, { 1: NEUTRAL }, { arena: burned })
    const p = after.processes.find((q) => q.id === 1)
    expect(p?.entity?.airborne, 'the plank is gone — the stander walks off into the lava').toBe(
      true,
    )
  })

  it('control: the same stander with an INTACT arena stays grounded', async () => {
    const { sched, state } = await standerFrame(PLANK_L)
    const arenaMod = await loadArenaState()
    const after = sched.stepFrame(state, { 1: NEUTRAL }, { arena: arenaMod.initialArenaState() })
    expect(after.processes.find((q) => q.id === 1)?.entity?.airborne).toBe(false)
  })

  it('control: an ISLAND stander keeps its footing through the burn', async () => {
    const { sched, state } = await standerFrame(ISLAND)
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const after = sched.stepFrame(state, { 1: NEUTRAL }, { arena: burned })
    expect(after.processes.find((q) => q.id === 1)?.entity?.airborne).toBe(false)
  })

  it('a descending player cannot LAND on the burned plank (it falls on past the band)', async () => {
    const sched = await loadScheduler()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const spawnDescent = () =>
      sched.spawn(sched.createState(SEED), {
        id: 1,
        cls: 'primary',
        nap: 1,
        period: 1,
        kind: 'player',
        entity: entityAt(PLANK_L, 200, { velY: 0x100 }),
      })

    // Pristine arm: find the landing frame.
    let intact = spawnDescent()
    let landedAt = -1
    for (let i = 0; i < 60 && landedAt < 0; i++) {
      intact = sched.stepFrame(intact, { 1: NEUTRAL })
      const e = intact.processes.find((q) => q.id === 1)?.entity
      if (e && !e.airborne) landedAt = i
    }
    expect(landedAt, 'premise: the pristine descent lands on the shore').toBeGreaterThan(-1)
    const landedEntity = intact.processes.find((q) => q.id === 1)?.entity
    expect(landedEntity?.posY, 'on CLIF5’s snap row').toBe(210 << 8)

    // Burned arm: the identical descent never grounds in the same window.
    let over = spawnDescent()
    for (let i = 0; i <= landedAt; i++) {
      over = sched.stepFrame(over, { 1: NEUTRAL }, { arena: burned })
      expect(
        over.processes.find((q) => q.id === 1)?.entity?.airborne,
        `frame ${i}: no footing materialises over the burned plank`,
      ).toBe(true)
    }
  })

  it('a destroyed cliff VETOES the landing — CLIF2 gone, the fall continues to CLIF4', async () => {
    // groundOutcomeInState (arena-state.ts): a landing whose bit belongs to a
    // destroyed cliff resolves airborne. x=100 descends through CLIF2's band
    // (y 81, bit $02) onto CLIF4's (y 163, bit $10) — per-bit, not blanket.
    const sched = await loadScheduler()
    const arenaMod = await loadArenaState()
    const clif2Gone = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x40)
    expect(clif2Gone.destroyedCliffs, 'premise: $40 is WBCL2').toEqual(['CLIF2'])
    const spawnDescent = () =>
      sched.spawn(sched.createState(SEED), {
        id: 1,
        cls: 'primary',
        nap: 1,
        period: 1,
        kind: 'player',
        entity: entityAt(ISLAND, 70, { velY: 0x40 }),
      })

    // Pristine arm lands on CLIF2's snap row (80).
    let intact = spawnDescent()
    let landedAt = -1
    for (let i = 0; i < 60 && landedAt < 0; i++) {
      intact = sched.stepFrame(intact, { 1: NEUTRAL })
      const e = intact.processes.find((q) => q.id === 1)?.entity
      if (e && !e.airborne) landedAt = i
    }
    expect(landedAt, 'premise: the pristine descent lands').toBeGreaterThan(-1)
    expect(intact.processes.find((q) => q.id === 1)?.entity?.posY).toBe(80 << 8)

    // Destroyed arm: never grounds AT CLIF2's row; eventually lands CLIF4 (162).
    let vetoed = spawnDescent()
    for (let i = 0; i < 200; i++) {
      vetoed = sched.stepFrame(vetoed, { 1: NEUTRAL }, { arena: clif2Gone })
      const e = vetoed.processes.find((q) => q.id === 1)?.entity
      if (e && !e.airborne) {
        expect(e.posY, 'the veto is per-bit: CLIF2 refuses, CLIF4 catches').toBe(162 << 8)
        return
      }
    }
    expect.unreachable('the descent must land on CLIF4 within the window')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — THE ENEMY AND THE EGG CONSUME IT (enemy.ts stepEntity, sim.ts
//        stepEgg, and frame.ts's egg call-site).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-6 — enemy and egg ground checks read the same arena', () => {
  it('a descending enemy cannot land on the destroyed CLIF2 either', async () => {
    const E = await loadEnemy()
    const arenaMod = await loadArenaState()
    const clif2Gone = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x40)
    // A targetless SHADOW settles onto the platform below it (SHLEV level
    // flight descends; probed: it grounds on CLIF2's snap row within ~20
    // wakes and never drifts off x=100).
    const descend = (): EnemyState => ({
      entity: entityAt(ISLAND, 70, { velY: 0x40 }),
      facing: 1,
      pchase: 1,
      brain: 'shadow',
      decision: 'shadow',
    })

    // Pristine arm: the bird grounds on CLIF2's snap row within the window.
    let intact = descend()
    let landedAt = -1
    for (let i = 0; i < 60 && landedAt < 0; i++) {
      intact = E.stepEnemyDetailed(intact, { player: null }).enemy
      if (!intact.entity.airborne) landedAt = i
    }
    expect(landedAt, 'premise: the pristine enemy descent lands').toBeGreaterThan(-1)
    expect(intact.entity.posY).toBe(80 << 8)

    // Destroyed arm: identical wakes, no landing at CLIF2's row in that window.
    let vetoed = descend()
    for (let i = 0; i <= landedAt; i++) {
      vetoed = E.stepEnemyDetailed(vetoed, { player: null, arena: clif2Gone }).enemy
      expect(
        !vetoed.entity.airborne && vetoed.entity.posY === 80 << 8,
        `wake ${i}: the destroyed cliff must not catch the bird`,
      ).toBe(false)
    }
  })

  it('a GROUNDED enemy on the plank walks off the frame the bridge is burned (review F2)', async () => {
    // Review round 2 — mutation M1 proved the enemy walk-off comparison
    // (`kind !== 'platform'`, enemy.ts stepEntity) could silently revert to
    // `=== 'airborne'` with the suite green. The discriminating fixture
    // (probed): a GROUNDED targetless shadow never flaps — pristine it stands
    // forever, so a burned-arm lift-off can only be the walk-off branch. The
    // velY pin nails it to walkOff (no flap impulse), and the pristine control
    // rules out a takeOff masking the comparison in both arms.
    const E = await loadEnemy()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const stander = (): EnemyState => ({
      entity: entityAt(PLANK_L, 210, { airborne: false, groundState: 'stand' }),
      facing: 1,
      pchase: 1,
      brain: 'shadow',
      decision: 'shadow',
    })

    const held = E.stepEnemyDetailed(stander(), { player: null }).enemy
    expect(held.entity.airborne, 'control: on the intact plank the shadow stands').toBe(false)

    const dropped = E.stepEnemyDetailed(stander(), { player: null, arena: burned }).enemy
    expect(dropped.entity.airborne, 'CKGND NE: the burned plank is not a platform').toBe(true)
    expect(dropped.entity.velY, 'a walk-off, not a flap — no impulse').toBe(0)
  })

  it('an egg reaching the burned plank finds no ledge and keeps falling', async () => {
    const demo = await loadSim()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const egg = eggOf({ posX: PLANK_L, posY: 210 << 8, velX: 0, velY: 0x40 })

    const settled = demo.stepEgg(egg, arenaMod.initialArenaState())
    expect(settled.settled, 'premise: on the intact plank the slow egg settles').toBe(true)

    const falling = demo.stepEgg(egg, burned)
    expect(falling.settled, 'no plank, no ledge, no settle').toBe(false)
    expect(falling.posY, 'the fall keeps integrating').toBeGreaterThan(egg.posY)
  })

  it('an egg over the destroyed CLIF2 falls through the band', async () => {
    const demo = await loadSim()
    const arenaMod = await loadArenaState()
    const clif2Gone = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x40)
    const egg = eggOf({ posX: ISLAND, posY: 80 << 8, velX: 0, velY: 0x40 })

    expect(demo.stepEgg(egg).settled, 'premise: CLIF2 settles the slow egg today').toBe(true)
    expect(demo.stepEgg(egg, clif2Gone).settled).toBe(false)
  })

  it('frame.ts’s egg call-site passes the arena through (an egg PROCESS over the burned plank)', async () => {
    const sched = await loadScheduler()
    const arenaMod = await loadArenaState()
    const burned = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 3, 0x00)
    const spawnEgg = () =>
      sched.spawn(sched.createState(SEED), {
        id: 9,
        cls: 'secondary',
        nap: 1,
        period: 1,
        kind: 'egg',
        egg: eggOf({ posX: PLANK_L, posY: 210 << 8, velX: 0, velY: 0x40 }),
      })

    const intact = sched.stepFrame(spawnEgg(), undefined, { arena: arenaMod.initialArenaState() })
    const settledEgg = intact.processes.find((p) => p.id === 9)?.egg
    expect(settledEgg?.settled, 'premise: the intact-arena egg process settles').toBe(true)

    const over = sched.stepFrame(spawnEgg(), undefined, { arena: burned })
    expect(over.processes.find((p) => p.id === 9)?.egg?.settled).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-8 (review round 2, F1) — THE DEMO LAYER THREADS ITS OWN ARENA. stepSim
//        must pass demo.arena into stepFrame: mutation M2 proved deleting that
//        one option left the whole suite green while the production demo
//        regressed to pristine ground physics. A brainless egg process is the
//        deterministic witness: driven through stepSim (not stepFrame), it
//        settles on the plank only if the frame it rides received THIS demo's
//        arena.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-8 — stepSim passes demo.arena into the frame it drives', () => {
  const eggProc = (): SimProcess => ({
    id: 0x7001,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    egg: eggOf({ posX: PLANK_L, posY: 210 << 8, velX: 0, velY: 0x40 }),
  })

  const withEgg = (d: SimState): SimState => ({
    ...d,
    sim: { ...d.sim, processes: [...d.sim.processes, eggProc()] },
  })

  it('control: on the intact wave-1 demo the plank egg settles through stepSim', async () => {
    const demo = await loadSim()
    const d = demo.stepSim(withEgg(demo.createWaveSim(SEED)))
    expect(d.sim.processes.find((p) => p.id === 0x7001)?.egg?.settled).toBe(true)
  })

  it('with the demo arena burned, the same egg finds no plank — through stepSim itself', async () => {
    const demo = await loadSim()
    const fresh = demo.createWaveSim(SEED)
    const burned: SimState = withEgg({ ...fresh, arena: { ...fresh.arena, bridgeBurned: true } })
    const d = demo.stepSim(burned)
    const egg = d.sim.processes.find((p) => p.id === 0x7001)?.egg
    expect(egg?.settled, 'stepSim must hand ITS arena to stepFrame').toBe(false)
    expect(egg && egg.posY, 'the fall keeps integrating').toBeGreaterThan(210 << 8)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-7 — THE LOOK-AHEAD CONSUMES IT (backgroundActive). A destroyed cliff's
//        BCKXTB bits are inactive; the steer turn at its side stops firing.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-7 — steerWake honours destroyed cliffs’ background bits', () => {
  // steering.test.ts's proven fixture: a hunter at (204,75) travelling right
  // samples BCK solid 31 px ahead — that sample is CLIF1R's side (bit $02).
  // WCLFTB row 1 (JOUSTRV4.SRC:2407): destroying CLIF1L clears backgroundBits
  // $03 — BOTH CLIF1 sides (the merged-ledge law arena-state transcribed).
  const CLIFF_R = { x: 204, y: 75 }
  const hunter = (): EnemyState => ({
    entity: entityAt(CLIFF_R.x, CLIFF_R.y, { velXIndex: 8 }),
    facing: 1,
    pchase: 1,
    brain: 'b2undr',
    decision: 'b2undr',
  })

  it('premise (passes today): the pristine look-ahead turns at CLIF1R’s side', async () => {
    const E = await loadEnemy()
    const r = E.steerWake(hunter(), null)
    expect(r.turned).toBe(true)
    expect(r.enemy.facing).toBe(-1)
  })

  it('with CLIF1L destroyed ($10 — clears BOTH CLIF1 background bits) the turn stops', async () => {
    const E = await loadEnemy()
    const arenaMod = await loadArenaState()
    const gone = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x10)
    expect(gone.destroyedBackgroundBits & 0x02, 'premise: bit $02 is cleared').toBe(0x02)
    const r = E.steerWake(hunter(), null, 0, gone)
    expect(r.turned, 'no cliff, no turn').toBe(false)
    expect(r.enemy.facing, 'the bird flies on').toBe(1)
  })

  it('control: destroying an UNRELATED cliff (CLIF4, $80) leaves the turn armed', async () => {
    const E = await loadEnemy()
    const arenaMod = await loadArenaState()
    const unrelated = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x80)
    expect(unrelated.destroyedBackgroundBits & 0x02).toBe(0)
    const r = E.steerWake(hunter(), null, 0, unrelated)
    expect(r.turned, 'CLIF1R still stands — still a wall').toBe(true)
  })

  it('the multi-bit law: ANY destroyed bit in the sample clears it (review F5)', async () => {
    // No real (x,y) produces a sample mixing destroyed and live bits today
    // (verified against BCK_X/BCK_Y by two independent probes in review round
    // 1), so this pins the exported query's law synthetically: any overlap
    // with destroyedBackgroundBits deactivates the whole sample; no overlap
    // leaves it live.
    const arenaMod = await loadArenaState()
    const clif2Gone = arenaMod.applyWaveDestruction(arenaMod.initialArenaState(), 1, 0x40)
    expect(clif2Gone.destroyedBackgroundBits, 'premise: CLIF2 clears $04').toBe(0x04)
    expect(arenaMod.backgroundActive(clif2Gone, 0x06), 'mixed $04|$02: any-overlap clears').toBe(
      false,
    )
    expect(arenaMod.backgroundActive(clif2Gone, 0x02), 'disjoint $02: still a wall').toBe(true)
  })
})
