// tests/demo-jt2-9.test.ts
//
// Story jt2-9 — RED phase (Leeloo / TEA). The user's jt2-7 playtest follow-up.
// Every gap below is source-confirmed on HEAD a755096 (the jt2-7 merge); these
// rails fail against the CURRENT code and Dev (Julia) greens them. The pre-
// existing 1018 stay green — these use the round-2 render seams + stepDemo.
//
// The FIVE items (source anchors in the assessment):
//   (1) LEDGE SEAT — sprites sit a full POSOFF too low; the render ignores each
//       ENTITY_RECORD's `position` word. (rails in demo-jt2-9-anchor.test.ts —
//       the POSOFF geometry, added once the ROM draw formula is pinned.)
//   (2) TURNING/FACING — input NEVER flips facing (runBehaviour steps
//       stepPlayerEntity(p.entity, input) and never threads p.facing), and the
//       ground skid chain (joust.ts groundStep/groundTransition — LANDED + TESTED
//       in jt2-3) has ZERO callers in src/, so it is unreachable from input; the
//       render draws right-facing frames only. THIS FILE.
//   (3) JOUST-FACING FEEL — the ruling: OSTBO is HEIGHT-ONLY (facing-independent,
//       ROM-canonical), and facing decides a joust only INDIRECTLY through the
//       skid (PLANTZ=2). So the fix is (2), NOT an OSTBO law change. THIS FILE.
//   (4) render polish — per-tier z-depth / mount alignment / run cadence (rails in
//       demo-jt2-9-anchor.test.ts, ROM-derived).
//   (5) leftovers — DemoState.events grows UNBOUNDED (stepDemo appends every
//       frame, main.ts never drains). THIS FILE.
//
// ROUTING ≠ GEOMETRY (MEMORY): the facing FLIP is pinned as DATA on the drawList
// op (a left-mover's op carries facing −1), not "was a flip called" — a canvas-
// free pin the shell cannot silently get wrong. And the input→facing rails vary
// the INPUT and assert facing MIRRORS it (the seed-vs-input lesson): a constant
// facing, or one that only ever flips one way, dies.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  loadDemoRender,
  type DemoState,
  type DemoProcess,
  type DemoEvent,
  type EntityState,
  type EnemyState,
  type JoustEntity,
} from './helpers/demo-contract.js'
import { loadJoust } from './helpers/joust-collision-contract.js'
import type { PlayerInput } from './helpers/flight-contract.js'

const SEED = 0x1234_5678

// ─── Factories ──────────────────────────────────────────────────────────────

function entityAt(posX: number, pixelY: number, airborne: boolean, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: airborne ? null : 'PLYER',
    plantZ: 0,
    airborne,
    animPhase: 0,
    ...over,
  }
}

function playerProcess(
  id: number,
  posX: number,
  facing: -1 | 1,
  over: Partial<EntityState> = {},
  airborne = true,
): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing,
    mount: 'ostrich',
    collisionEnabled: true,
    entity: entityAt(posX, over.posY !== undefined ? over.posY >> 8 : 90, airborne, over),
  }
}

function enemyStateAt(posX: number, pixelY: number, airborne: boolean, facing: -1 | 1 = 1): EnemyState {
  return {
    entity: entityAt(posX, pixelY, airborne),
    facing,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
  }
}

function enemyProcess(id: number, state: EnemyState): DemoProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy', enemyType: 'bounder', collisionEnabled: true, enemy: state }
}

const only = (d: DemoState, procs: DemoProcess[]): DemoState => ({ ...d, sim: { ...d.sim, processes: procs }, events: [] })

const input = (dir: -1 | 0 | 1): PlayerInput => ({ dir, flap: false, flapHeld: false })

/** Step a demo N frames threading one player's fixed input; returns that player each frame's end. */
async function drivePlayer(demo: DemoState, playerId: number, dir: -1 | 0 | 1, frames: number): Promise<DemoProcess> {
  const dmod = await loadDemo()
  let d = demo
  for (let i = 0; i < frames; i++) d = dmod.stepDemo(d, { [playerId]: input(dir) })
  const p = d.sim.processes.find((q) => q.id === playerId)
  if (!p) throw new Error(`player ${playerId} vanished mid-drive`)
  return p
}

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 2 — TURNING / FACING
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2a — AIR: pressing a direction flips PFACE (the air facing) ──────────────
//   Gap: runBehaviour → stepPlayerEntity(p.entity, input) never touches p.facing,
//   so a player's facing is frozen at its spawn value forever. Vary the INPUT and
//   require facing to MIRROR it (both directions in ONE assertion set): a constant
//   facing dies, and a facing that only flips one way dies.
describe('jt2-9 item 2a — air: direction input flips facing (PFACE)', () => {
  it('a right-facer pressing LEFT ends up facing left; then pressing RIGHT faces right again', async () => {
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    const p0 = playerProcess(1, 146, 1) // airborne, facing right

    const leftFaced = await drivePlayer(only(base, [p0]), 1, -1, 4)
    expect(leftFaced.facing, 'sustained LEFT input must turn the player to face left').toBe(-1)

    // Continue from the left-faced state, now pressing RIGHT — it must turn back.
    const rightFaced = await drivePlayer(only(base, [{ ...p0, facing: -1 }]), 1, 1, 4)
    expect(rightFaced.facing, 'sustained RIGHT input must turn the player to face right').toBe(1)
  })

  it('neutral input (dir 0) PRESERVES facing for BOTH directions — a reset-to-default bug dies', async () => {
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    // A right-facer stays right AND a left-facer stays left. Testing only the
    // right-facer would let `nextFacing = dir === 0 ? 1 : …` (reset-to-right) pass,
    // since 1 coincides with the start — so pin the LEFT case too (Reviewer round 2).
    const heldRight = await drivePlayer(only(base, [playerProcess(1, 146, 1)]), 1, 0, 4)
    expect(heldRight.facing, 'a right-facer under neutral input stays right').toBe(1)
    const heldLeft = await drivePlayer(only(base, [playerProcess(1, 146, -1)]), 1, 0, 4)
    expect(heldLeft.facing, 'a left-facer under neutral input stays LEFT (not reset to a default)').toBe(-1)
  })
})

// ─── 2b — GROUND: reversing against your facing REACHES the skid chain ────────
//   The jt2-3 groundStep/groundTransition (facing-aware, onMinus → a SKIDR state
//   → plantZ = 2) is landed + tested but has ZERO callers in src/ — the demo steps
//   the facing-BLIND flight.ts stepGround, whose `input.dir !== 0 ? onPlus : onZero`
//   can never take onMinus. So a grounded player can never skid from input today.
//   Staged over CLIF5 (LNDB5, snapY 210 — "lands at all points", so the player
//   stays grounded while it turns).
describe('jt2-9 item 2b — ground: reversing reaches the skid chain (jt2-3, until now unreachable)', () => {
  it('a grounded player who reverses against its facing skids — plantZ becomes 2 (SKID_PLANT_Z)', async () => {
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    // Grounded on the bottom island, running right, facing right.
    const grounded = playerProcess(1, 146, 1, { posY: 210 << 8, groundState: 'PLYER', animPhase: 2 }, false)

    // Reverse: press LEFT against a right-facing runner → the onMinus (skid) path.
    let d = only(base, [grounded])
    let skidded = false
    let stayedGrounded = false
    for (let i = 0; i < 6; i++) {
      d = dmod.stepDemo(d, { 1: input(-1) })
      const p = d.sim.processes.find((q) => q.id === 1)
      if (p?.entity && !p.entity.airborne) stayedGrounded = true
      if (p?.entity?.plantZ === 2) skidded = true
    }
    expect(stayedGrounded, 'the staged player must remain grounded over CLIF5 while it turns').toBe(true)
    expect(skidded, 'reversing on the ground must reach the SKIDR chain and set plantZ = 2').toBe(true)
  })

  it('a grounded player running WITH its facing never skids — plantZ stays 0 (the control)', async () => {
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    const grounded = playerProcess(1, 146, 1, { posY: 210 << 8, groundState: 'PLYER', animPhase: 2 }, false)
    let d = only(base, [grounded])
    let everSkidded = false
    for (let i = 0; i < 6; i++) {
      d = dmod.stepDemo(d, { 1: input(1) }) // WITH facing → onPlus, the run chain
      const p = d.sim.processes.find((q) => q.id === 1)
      if (p?.entity?.plantZ === 2) everSkidded = true
    }
    expect(everSkidded, 'running forward never skids — plantZ must stay 0').toBe(false)
  })
})

// ─── 2c — RENDER: the drawList op carries facing so the shell can flip ────────
//   Gap: DrawOp has no facing; blitOp draws the right-facing atlas frame un-
//   flipped, so a left-mover visually faces right. Pin the flip as DATA: an entity
//   op carries the process's facing. (routing≠geometry — the flip is selectable
//   from the pure list, not trusted at the canvas.)
describe('jt2-9 item 2c — drawList carries facing on entity ops (the shell flips from data)', () => {
  it('a LEFT-facing player yields entity ops with facing −1; a RIGHT-facer yields +1', async () => {
    const r = await loadDemoRender()
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)

    const left = only(base, [playerProcess(1, 146, -1)])
    const right = only(base, [playerProcess(1, 146, 1)])

    const leftEnts = r.drawList(left).filter((op) => op.kind === 'entity')
    const rightEnts = r.drawList(right).filter((op) => op.kind === 'entity')

    expect(leftEnts.length, 'the player must produce entity ops').toBeGreaterThan(0)
    expect(
      leftEnts.every((op) => op.facing === -1),
      'a left-facing player’s entity ops must carry facing −1 so the shell flips them',
    ).toBe(true)
    expect(
      rightEnts.every((op) => op.facing === 1),
      'a right-facing player’s entity ops carry facing +1 (drawn un-flipped)',
    ).toBe(true)
  })

  it('a LEFT-facing enemy also carries facing −1 (buzzards face their travel too)', async () => {
    const r = await loadDemoRender()
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    const enemyLeft = only(base, [enemyProcess(0x40, enemyStateAt(150, 90, true, -1))])
    const ents = r.drawList(enemyLeft).filter((op) => op.kind === 'entity')
    expect(ents.length, 'the enemy must produce an entity op').toBeGreaterThan(0)
    expect(ents.every((op) => op.facing === -1), 'a left-facing buzzard’s op carries facing −1').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 2d (user playtest, 2026-07-20) — P2 IS A DISTINCT COLOUR (not both yellow)
// ═════════════════════════════════════════════════════════════════════════════
//   Gap the user saw live: playerDrawList hardcodes the rider frame 'PLYR1' for
//   BOTH players, so P2 draws P1's yellow knight. The rider records are the same
//   7×7 shape in DIFFERENT colours — PLY1R is colour index 5, PLY2R is colour
//   index 7 (a swap) — so P1→PLYR1 / P2→PLYR2 is the ROM's two-player colouring.
//   The mount already distinguishes them (ostrich P1 / stork P2).
describe('jt2-9 item 2d — P1 and P2 ride DIFFERENT-coloured riders (not both yellow)', () => {
  const withMount = (id: number, mount: 'ostrich' | 'stork'): DemoProcess => ({
    id, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount,
    collisionEnabled: true, entity: entityAt(100 + id, 90, true),
  })

  it('P1 (ostrich) rides PLYR1, P2 (stork) rides PLYR2 — the second (top) layer differs', async () => {
    const r = await loadDemoRender()
    const p1 = r.playerDrawList(withMount(1, 'ostrich'))
    const p2 = r.playerDrawList(withMount(2, 'stork'))
    expect(p1[1], 'P1 rides the colour-5 rider PLYR1').toBe('PLYR1')
    expect(p2[1], 'P2 rides the colour-7 rider PLYR2 — not P1’s yellow knight').toBe('PLYR2')
    expect(p1[1] === p2[1], 'the two players must not draw the SAME rider (both yellow is the bug)').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 3 — THE JOUST-FACING RULING (OSTBO is HEIGHT-ONLY, ROM-canonical)
// ═════════════════════════════════════════════════════════════════════════════
//   The user reported "colliding backwards WINS even when faced the wrong way."
//   Ruling (verified against JOUSTRV4.SRC:5002-5017 + jt2-8): OSTBO compares only
//   plantHeight = plantZ + (posY>>8). Facing is NOT a term — height decides, ROM-
//   canonical. So the joust LAW must NOT gain a facing term (guard below). Facing
//   changes a joust only INDIRECTLY: pointing the wrong way skids → plantZ = 2 →
//   you sit lower → you lose. The real fix is item 2 (make the skid reachable),
//   not an OSTBO change. These guards keep a well-meaning "face-toward-wins" fix
//   from corrupting the ROM law.
describe('jt2-9 item 3 — the joust stays HEIGHT-ONLY (facing is not a joust term)', () => {
  function ent(over: Partial<JoustEntity>): JoustEntity {
    return {
      posX: 100, posY: 100 << 8, velY: 0, velX: 0, plantZ: 0, facing: 1,
      bumpX: 0, bumpY: 0, party: 'player', collision: null, groundState: null, ...over,
    }
  }

  it('the HIGHER entity wins even while facing AWAY — height, not facing, decides', async () => {
    const j = await loadJoust()
    // 'a' is higher (smaller plantHeight) but faces AWAY (−1) from 'b' (an enemy).
    const higher = ent({ posY: 90 << 8, facing: -1, party: 'player' })
    const lower = ent({ posY: 100 << 8, facing: 1, party: 'enemy', enemyType: 'bounder' })
    const out = j.resolveJoust(higher, lower)
    expect(out.kind, 'a real height difference resolves to a kill').toBe('kill')
    if (out.kind === 'kill') {
      expect(out.winner, 'the higher entity wins REGARDLESS of which way it faces').toBe('a')
    }
    // The mirror: give the LOWER one the "correct" facing — it must still lose.
    const out2 = j.resolveJoust(ent({ posY: 100 << 8, facing: -1, party: 'enemy', enemyType: 'bounder' }), ent({ posY: 90 << 8, facing: 1, party: 'player' }))
    expect(out2.kind === 'kill' && out2.winner, 'facing never rescues the lower entity').toBe('b')
  })

  it('two entities on the same plantHeight bounce whatever their facings — no facing tiebreak', async () => {
    const j = await loadJoust()
    for (const [fa, fb] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const out = j.resolveJoust(
        ent({ posY: 100 << 8, plantZ: 0, facing: fa, party: 'player' }),
        ent({ posY: 100 << 8, plantZ: 0, facing: fb, party: 'enemy', enemyType: 'bounder' }),
      )
      expect(out.kind, `equal height (facings ${fa}/${fb}) must bounce — facing breaks no tie`).toBe('bounce')
    }
  })

  it('the skid (plantZ 2) — reachable via item 2 — is what makes pointing wrong LOSE, not a facing term', async () => {
    const j = await loadJoust()
    // Same whole pixel; the one who skidded (plantZ 2) sits lower and loses. This
    // is the ROM's real "wrong-way" penalty — through height, via plantZ.
    const skidder = ent({ posY: 100 << 8, plantZ: 2, party: 'enemy', enemyType: 'bounder' })
    const upright = ent({ posY: 100 << 8, plantZ: 0, party: 'player' })
    const out = j.resolveJoust(skidder, upright)
    expect(out.kind === 'kill' && out.winner, 'the upright (plantZ 0) beats the skidder (plantZ 2)').toBe('b')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 5a — DemoState.events must not grow UNBOUNDED
// ═════════════════════════════════════════════════════════════════════════════
//   Gap: stepDemo returns `events: [...demo.events, ...collided.events]` — it only
//   ever APPENDS, and main.ts never drains it, so a long session leaks the whole
//   score/beat history. The fix caps (keep last K) or drains (per-frame, main.ts
//   consumes). Prove the unboundedness directly: seed a large log, step ONE no-
//   contact frame, and require the result NOT to have retained it. Both a cap and a
//   drain pass; only the current unbounded append (which carries all 200 forward)
//   fails.
describe('jt2-9 item 5a — the event log is capped/drained, not unbounded', () => {
  it('one no-contact step does not carry a large pre-existing log forward unchanged', async () => {
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)

    // Seed 200 stale score events — the leak a long session would have accrued.
    const stale: DemoEvent[] = Array.from({ length: 200 }, () => ({
      kind: 'score' as const,
      value: 500,
      reason: 'kill' as const,
    }))
    // Wave-1 enemies are still materialising (collisions off) and the players sit
    // apart, so this frame resolves NO contact — collided.events is empty.
    const stepped = dmod.stepDemo({ ...base, events: stale })

    expect(
      stepped.events.length,
      `a 200-event log survived a no-contact frame at ${stepped.events.length} — the log leaks (cap or drain it)`,
    ).toBeLessThanOrEqual(64)
    expect(stepped.events.length, 'the append-only bug would carry all 200 forward').toBeLessThan(200)
  })

  it('a SEEDED log stays capped across a long run — the cap holds every frame, not just once', async () => {
    const dmod = await loadDemo()
    // Seed a log far larger than any sane cap, then run 400 frames. Neutral input
    // adds no events, so an UNCAPPED stepDemo would carry all 300 forward unchanged
    // (Reviewer round 2: the old no-seed version only ever saw 2 events → vacuous).
    const stale: DemoEvent[] = Array.from({ length: 300 }, () => ({ kind: 'score' as const, value: 500, reason: 'kill' as const }))
    let d: DemoState = { ...dmod.createWaveDemo(SEED), events: stale }
    // Track the peak AFTER stepping — the cap governs stepDemo's OUTPUT, so the very
    // first step must already collapse the 300 seed to the cap and hold it there.
    let maxAfterStep = 0
    for (let i = 0; i < 400; i++) {
      d = dmod.stepDemo(d)
      maxAfterStep = Math.max(maxAfterStep, d.events.length)
    }
    expect(d.events.length, `events reached ${d.events.length} at the end`).toBeLessThanOrEqual(64)
    expect(maxAfterStep, `a stepped log peaked at ${maxAfterStep} — an uncapped stepDemo would carry all 300 forward`).toBeLessThanOrEqual(64)
  })
})
