// tests/demo-round2.test.ts
//
// Story jt2-7 — RED phase, ROUND 2 (Leeloo / TEA). The Reviewer rejected the GREEN
// and the user watched the live demo and reported three visible bugs. Unlike the
// prior rounds these are REAL code gaps in the shipped demo.ts / main.ts, confirmed
// at source level. These rails fail against the CURRENT code (HEAD 9003193); Dev
// then fixes them. Pre-existing 1007 stay green (these rails use loadDemoRender for
// the not-yet-extracted seams, so the round-1 suite is untouched).
//
// THE GAPS (Reviewer + user, source-confirmed):
//   1. The live collision pass is DEAD: toJoustEntity hard-codes collision:null
//      (demo.ts) so collisionPass `continue`s on every pair — no joust can EVER
//      resolve through stepDemo (deleting the whole pass reds nothing today).
//   2. Render: the buzzard RUN frames (BRRUN1-4) never play (drawEntities uses only
//      BRFLAP/BRSTND); the player draws a rider with NO mount (ostrich/stork records
//      + PLAYER*_SPAWN.mount go unused); lower-platform z-order is wrong (a monolithic
//      arena→entities order leaves foreground cliffs behind the sprites).
//   3. Wave 2 never follows: stepDemo returns `wave` unchanged.
//
// The render seams are pure functions the shell blits FROM — routing≠geometry: the
// rails pin the actual OUTPUT (frame names, [mount, rider] layers, draw order), not
// "was a draw called".

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  loadDemoRender,
  type DemoState,
  type DemoProcess,
  type EntityState,
  type EnemyState,
} from './helpers/demo-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import { loadTransporter } from './helpers/transporter-contract.js'

const SEED = 0x1234_5678

// ─── Factories ──────────────────────────────────────────────────────────────

function entityAt(posX: number, pixelY: number, airborne: boolean, animPhase = 0): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: airborne ? null : 'PLYBR',
    plantZ: 0,
    airborne,
    animPhase,
  }
}

function enemyStateAt(posX: number, pixelY: number, airborne: boolean, animPhase = 0): EnemyState {
  return {
    entity: entityAt(posX, pixelY, airborne, animPhase),
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
  }
}

function enemyProcess(id: number, state: EnemyState): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: true,
    enemy: state,
  }
}

function playerProcess(id: number, posX: number, mount: 'ostrich' | 'stork', facing: -1 | 1): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing,
    mount,
    collisionEnabled: true,
    entity: entityAt(posX, 90, true),
  }
}

const enemies = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const players = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'player')

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 1 — A JOUST RESOLVES THROUGH stepDemo (the collision pass is LIVE).
//   Current gap: toJoustEntity hard-codes collision:null, so collisionPass skips
//   every pair — no kill can ever happen in the loop. This forces Dev to give live
//   entities REAL collision spans.
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 1 — a joust resolves through stepDemo', () => {
  it('an overlapping player over an enemy is killed by the loop: loser gone, egg spawned, kill score emitted', async () => {
    const dmod = await loadDemo()
    const demo = dmod.createWaveDemo(SEED)

    // Co-located, mid-air: the player is HIGHER (smaller plantHeight) → it wins.
    // The enemy sits at its LINET lane ($45 = 69) so it does not immediately flap
    // away — the pair stays overlapping while the loop resolves the joust.
    const player = playerProcess(1, 150, 'ostrich', 1)
    player.entity = entityAt(150, 66, true)
    const enemy = enemyProcess(0x40, enemyStateAt(150, 69, true))

    let staged: DemoState = { ...demo, sim: { ...demo.sim, processes: [player, enemy] }, events: [] }

    let loserGone = false
    let eggSpawned = false
    let killScored = false
    for (let i = 0; i < 4 && !(loserGone && eggSpawned && killScored); i++) {
      staged = dmod.stepDemo(staged)
      if (!staged.sim.processes.some((p) => p.kind === 'enemy')) loserGone = true
      if (staged.sim.processes.some((p) => p.kind === 'egg')) eggSpawned = true
      if (staged.events.some((e) => e.kind === 'score' && e.reason === 'kill')) killScored = true
    }

    expect(loserGone, 'the enemy loser must be REMOVED by the loop (collision pass is live)').toBe(true)
    expect(eggSpawned, 'a dying enemy leaves an egg PROCESS in the loop').toBe(true)
    expect(killScored, 'and the kill surfaces a {kind:score, reason:kill} event').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 2a — THE BUZZARD RUN ANIMATION PLAYS (BRRUN1-4).
//   Current gap: drawEntities uses only BRFLAP (flying) / BRSTND (grounded); the
//   run frames never appear. enemyFrame is the pure selection the shell blits from.
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 2a — enemyFrame plays the run animation', () => {
  it('a FLYING enemy selects a wing-flap frame, never a run frame', async () => {
    const r = await loadDemoRender()
    const flying = enemyProcess(0x50, enemyStateAt(150, 90, true))
    expect(['BRFLAP', 'BRFLOP', 'BRFLIP'], 'a flying buzzard flaps').toContain(r.enemyFrame(flying))
  })

  it('a RUNNING enemy cycles through the BRRUN1-4 run frames as its animation phase advances', async () => {
    const r = await loadDemoRender()
    const RUN = new Set(['BRRUN1', 'BRRUN2', 'BRRUN3', 'BRRUN4'])
    // On the ground (airborne false), the run phase PFRAME cycles 1..4.
    const frames = [1, 2, 3, 4].map((phase) =>
      r.enemyFrame(enemyProcess(0x50, enemyStateAt(150, 210, false, phase))),
    )
    for (const f of frames) {
      expect(RUN.has(f), `a running buzzard uses a BRRUN frame, got ${f}`).toBe(true)
    }
    expect(
      new Set(frames).size,
      'the run animation actually CYCLES — not one static frame for every phase',
    ).toBeGreaterThanOrEqual(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 2b — THE PLAYER DRAWS [mount, rider].
//   Current gap: drawEntities blits only PLYR1/PLYR2 (the rider); the ostrich/stork
//   mount is never drawn. playerDrawList is the pure [mount, rider] composition.
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 2b — playerDrawList composes [mount, rider]', () => {
  it('P1 draws an OSTRICH mount under the rider; P2 draws a STORK', async () => {
    const r = await loadDemoRender()
    const list1 = r.playerDrawList(playerProcess(1, 100, 'ostrich', 1))
    const list2 = r.playerDrawList(playerProcess(2, 200, 'stork', -1))

    expect(list1.length, 'a player is mount + rider, two layers').toBe(2)
    expect(list1[0], 'the OSTRICH mount is an O* block, drawn first (under)').toMatch(/^O/)
    expect(list1[1], 'the rider (PLY*) is drawn on top').toMatch(/^PLY/)

    expect(list2.length, 'P2 is mount + rider too').toBe(2)
    expect(list2[0], 'the STORK mount is an S* block').toMatch(/^S/)
    expect(list2[1], 'and its rider on top').toMatch(/^PLY/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 2c — DRAW ORDER: foreground platforms occlude entities.
//   Current gap: main.ts draws ALL arena, then ALL entities (main.ts), so
//   a lower/foreground cliff draws BEHIND a sprite standing in front of it. The
//   correct order layers back tiles → entities → foreground tiles.
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 2c — drawList orders foreground platforms in front of entities', () => {
  it('the draw list is back-arena → entities → foreground-arena (some arena follows some entity)', async () => {
    const dmod = await loadDemo()
    const r = await loadDemoRender()
    const demo = dmod.createWaveDemo(SEED)
    const list = r.drawList(demo)

    const firstEntity = list.findIndex((op) => op.kind === 'entity')
    const lastEntity = list.map((op) => op.kind).lastIndexOf('entity')
    expect(firstEntity, 'the list must contain entity sprites').toBeGreaterThanOrEqual(0)

    // Back platforms behind entities: some arena op precedes the first entity.
    expect(
      list.slice(0, firstEntity).some((op) => op.kind === 'arena'),
      'platforms an entity stands on draw BEFORE it',
    ).toBe(true)

    // Foreground occlusion: some arena op FOLLOWS an entity — a monolithic
    // "all arena, then all entities" fails this (that is the current bug).
    expect(
      list.slice(lastEntity + 1).some((op) => op.kind === 'arena'),
      'a lower/foreground cliff draws AFTER (in front of) the entities it occludes',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 3 — createWaveDemo OUTPUT: enemy type, player facing (drop-mutant guards),
//   and the player MOUNT (the round-2 red).
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 3 — createWaveDemo output', () => {
  it('all three wave-1 enemies carry enemyType bounder (kills the drop mutant)', async () => {
    const dmod = await loadDemo()
    const demo = dmod.createWaveDemo(SEED)
    const types = enemies(demo).map((e) => e.enemyType)
    expect(types.length, 'wave 1 is three enemies').toBe(3)
    expect(types.every((t) => t === 'bounder'), 'every wave-1 enemy is a bounder').toBe(true)
  })

  it('P1 faces right (+1) and P2 faces left (−1) (kills the drop mutant)', async () => {
    const dmod = await loadDemo()
    const trans = await loadTransporter()
    const demo = dmod.createWaveDemo(SEED)
    const p1 = players(demo).find((p) => p.entity?.posX === trans.PLAYER1_SPAWN.x)
    const p2 = players(demo).find((p) => p.entity?.posX === trans.PLAYER2_SPAWN.x)
    expect(p1?.facing, 'P1 faces right').toBe(trans.PLAYER1_SPAWN.facing)
    expect(p2?.facing, 'P2 faces left').toBe(trans.PLAYER2_SPAWN.facing)
    expect([p1?.facing, p2?.facing], 'concretely +1 / −1').toEqual([1, -1])
  })

  it('P1 rides an ostrich and P2 a stork, from PLAYER*_SPAWN.mount (the render needs the mount)', async () => {
    const dmod = await loadDemo()
    const trans = await loadTransporter()
    const demo = dmod.createWaveDemo(SEED)
    const p1 = players(demo).find((p) => p.entity?.posX === trans.PLAYER1_SPAWN.x)
    const p2 = players(demo).find((p) => p.entity?.posX === trans.PLAYER2_SPAWN.x)
    expect(p1?.mount, 'P1 mount = PLAYER1_SPAWN.mount').toBe(trans.PLAYER1_SPAWN.mount)
    expect(p2?.mount, 'P2 mount = PLAYER2_SPAWN.mount').toBe(trans.PLAYER2_SPAWN.mount)
    expect([p1?.mount, p2?.mount], 'concretely ostrich / stork').toEqual(['ostrich', 'stork'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RAIL 4 — CLEARING THE WAVE ADVANCES TO WAVE 2.
//   Current gap: stepDemo returns `wave` unchanged, so the demo is stuck on wave 1.
// ═════════════════════════════════════════════════════════════════════════════
describe('Round 2 Rail 4 — the wave advances when it is cleared', () => {
  /** A demo whose wave has been cleared (no enemies remain), players still live. */
  const cleared = (demo: DemoState): DemoState => ({
    ...demo,
    sim: { ...demo.sim, processes: players(demo) },
  })

  it('when the last enemy is gone, the demo advances to wave 2 and the wave-2 complement enters', async () => {
    const dmod = await loadDemo()
    const wave = await loadWave()
    const trans = await loadTransporter()

    let d = cleared(dmod.createWaveDemo(SEED))
    for (let i = 0; i < 4 && d.wave === 1; i++) d = dmod.stepDemo(d)

    expect(d.wave, 'a cleared wave advances — nextWaveBcd(1) = 2').toBe(2)
    const complement2 = trans.waveEnemyComplement(wave.waveRowAt(2))
    expect(complement2, 'wave 2 is four bounders').toBe(4)
    expect(enemies(d).length, 'the wave-2 complement enters via pads').toBe(complement2)
  })

  it('the wave-2 spawn is a real, deterministic complement under the seed', async () => {
    const dmod = await loadDemo()
    const advance = (): string => {
      let d = cleared(dmod.createWaveDemo(SEED))
      for (let i = 0; i < 4 && d.wave === 1; i++) d = dmod.stepDemo(d)
      return JSON.stringify(enemies(d).map((e) => e.enemy?.entity.posX))
    }
    const layout = advance()
    expect(layout, 'wave 2 must enter a real complement, not stay empty').not.toBe('[]')
    expect(advance(), 'and the same seed replays the same wave-2 layout').toBe(layout)
  })

  it('does NOT advance while enemies are still alive (do not skip a live wave)', async () => {
    const dmod = await loadDemo()
    let d = dmod.createWaveDemo(SEED)
    for (let i = 0; i < 10; i++) d = dmod.stepDemo(d)
    expect(d.wave, 'the wave holds while its enemies live').toBe(1)
  })
})
