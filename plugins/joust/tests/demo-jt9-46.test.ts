// tests/demo-jt9-46.test.ts
//
// Story jt9-46 — RED phase (Tyr One-Handed / TEA). Two user playtest reports,
// ONE render-selection gap: "I never see ANY figures riding the buzzards" and
// "I still have yet to see any enemies spawn besides buzzards". The port draws
// exactly ONE op per enemy (the buzzard body, enemyFrame), where the ROM draws
// TWO — a bird PLUS a rider — for every knight, enemy as well as player. So every
// enemy renders as a bare bird, and the three ground species (bounder / hunter /
// shadow lord) are indistinguishable because their ONLY visible difference is
// WHICH rider they carry.
//
// THE FIX (deliverable): a pure `enemyDrawList(p)` mirroring `playerDrawList` —
// [ enemyFrame(p), <species' DPLYR rider> ] — with `drawList` emitting BOTH ops,
// facing-tagged, for every kind:'enemy' process (so the hatched remount buzzard
// gets its rider for free too).
//
// ─── THE MAPPING IS READ FROM THE ROM, NOT THIS FILE ─────────────────────────
// Each enemy species' decision block carries a DPLYR field — `DPLYR RMB 2  RIDERS
// IMAGE` (field 6 / offset 10, JOUSTRV4.SRC:109). Group 1 re-opens the vendored
// source and reads the field out of the P4DEC/P5DEC/P6DEC blocks directly; it does
// not take the filing's word for the mapping. On CI (no vendored tree) it degrades
// via `vendoredAvailable`, exactly like the sibling oracle in
// audio-ptero-wing-source.test.ts. The port-side groups (2-5) then pin that the
// built code AGREES with what the ROM says.
//
// ROUTING ≠ GEOMETRY (MEMORY): the rider is DATA on the draw list — a frame name
// and a facing tag the shell blits — not a canvas call. The facing rails vary the
// enemy's facing and require the ops to MIRROR it (both directions), so a constant
// facing dies.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  loadEnemyDrawList,
  type DemoState,
  type DemoProcess,
  type DrawOp,
  type EntityState,
  type EnemyState,
  type EnemyType,
} from './helpers/demo-contract.js'
import { sourceLines, parseStatement, vendoredAvailable } from './helpers/joust-source.js'

const SEED = 0x1234_5678
const ROM = 'JOUSTRV4.SRC'

// ─── Vendored-source readers (only ever called inside an it()) ────────────────

/** Read one 1-based line of the vendored source. */
function romLine(n: number): string {
  const line = sourceLines(ROM)[n - 1]
  if (line === undefined) throw new Error(`${ROM} has no line ${n}`)
  return line
}

/** The comma-split operands of a labelled decision block's FIRST FDB line. */
function decBlockFields(label: string): string[] {
  const lines = sourceLines(ROM)
  const idx = lines.findIndex((l) => l.startsWith(`${label}\t`))
  if (idx < 0) throw new Error(`no ${label} decision block in ${ROM}`)
  const st = parseStatement(lines[idx], idx + 1)
  if (!st || st.op !== 'FDB') throw new Error(`${label}'s first line is not an FDB`)
  return st.operands
}

// ─── Port-side factories ──────────────────────────────────────────────────────

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

/** The smart brain a species is promoted into — matches the port's `brainFor`. */
const BRAIN_FOR: Record<EnemyType, EnemyState['decision']> = {
  bounder: 'boundr',
  hunter: 'b2undr',
  shadowLord: 'shadow',
}

function enemyProc(
  id: number,
  species: EnemyType,
  posX: number,
  pixelY: number,
  facing: -1 | 1 = 1,
  airborne = true,
): DemoProcess {
  const enemy: EnemyState = {
    entity: entityAt(posX, pixelY, airborne),
    facing,
    pchase: 0,
    brain: 'linet',
    decision: BRAIN_FOR[species],
  }
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy', enemyType: species, collisionEnabled: true, enemy }
}

/** A SETTLED wave egg primed to hatch on the next frame — matures into a remount. */
function hatchingEggProc(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    egg: {
      posX,
      posY: pixelY << 8,
      velX: 0,
      velY: 0,
      bumpX: 0,
      bumpY: 0,
      waitFrames: 1,
      eggsLeft: 2,
      hitCount: 0,
      pfeet: 1,
      settled: true,
    },
  }
}

/** Replace a demo's process list, clearing the event log. */
const only = (d: DemoState, procs: DemoProcess[]): DemoState => ({ ...d, sim: { ...d.sim, processes: procs }, events: [] })

/** The entity ops in a draw list (the sprites), in order. */
const entityOps = (ops: DrawOp[]): DrawOp[] => ops.filter((o) => o.kind === 'entity')

const isMount = (name: string) => /^BR/.test(name) // BRFLAP / BRRUN1-4 / BRSTND
const isRider = (name: string) => /^PLYR[345]$/.test(name) // the enemy DPLYR knights

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 1 (AC-2 oracle) — the ROM's DPLYR mapping, re-read from the vendored source
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('jt9-46 AC-2 oracle — the DPLYR rider per species, from the ROM', () => {
  it('DPLYR is field 6 (offset 10) of the decision block — the 6th FDB word', () => {
    // Re-derive the field position instead of trusting ":109". Walk the RMB run
    // that begins at DJOY; DPLYR must be the 6th entry (index 5 → offset 10), so
    // the 6th comma-separated operand of a PxDEC block's first FDB line IS its rider.
    const lines = sourceLines(ROM)
    const djoy = lines.findIndex((l) => /^DJOY\tRMB\t2/.test(l))
    expect(djoy, 'the decision-block field table starts at DJOY').toBeGreaterThanOrEqual(0)
    const fields: string[] = []
    for (let i = djoy; i < lines.length; i++) {
      const m = lines[i].match(/^(\S+)\tRMB\t2/)
      if (!m) break
      fields.push(m[1])
    }
    expect(fields.slice(0, 6)).toEqual(['DJOY', 'DSMART', 'DSCORE', 'DSCLOC', 'DSCPLY', 'DPLYR'])
    expect(fields.indexOf('DPLYR'), 'DPLYR is the 6th field (index 5, offset 10)').toBe(5)
    expect(romLine(109), 'and the pinned line still reads it verbatim').toBe('DPLYR\tRMB\t2\tRIDERS IMAGE')
  })

  it('bounder→PLYR3, hunter→PLYR4, shadow-lord→PLYR5 — read off each PxDEC block', () => {
    // Field 2 (DSMART, index 1) is the brain that NAMES the species; field 6
    // (DPLYR, index 5) is that species' rider. Reading BOTH pins that we mapped
    // the right rider to the right species, not merely that three riders exist.
    const bounder = decBlockFields('P4DEC') // DSMART = BOUNDR  (bounder brain, :3787)
    const hunter = decBlockFields('P5DEC') // DSMART = B2UNDR  (hunter brain, :3971)
    const shadow = decBlockFields('P6DEC') // DSMART = SHADOW  (shadow-lord brain, :4230)

    expect(bounder[1], 'P4DEC is the bounder block (DSMART = BOUNDR)').toBe('BOUNDR')
    expect(hunter[1], 'P5DEC is the hunter block (DSMART = B2UNDR)').toBe('B2UNDR')
    expect(shadow[1], 'P6DEC is the shadow-lord block (DSMART = SHADOW)').toBe('SHADOW')

    expect(bounder[5], 'the bounder rides PLYR3').toBe('PLYR3')
    expect(hunter[5], 'the hunter rides PLYR4').toBe('PLYR4')
    expect(shadow[5], 'the shadow lord rides PLYR5').toBe('PLYR5')

    // The three are DISTINCT — the species' whole visible difference. A source in
    // which two blocks shared a rider would make two species indistinguishable.
    expect(new Set([bounder[5], hunter[5], shadow[5]]).size, 'each species carries its OWN rider').toBe(3)
  })

  it('P7DEC (the pterodactyl) carries 0 in DPLYR — a ptero has no rider (the control)', () => {
    // The negative control the sibling oracle already noted: the ptero's DPLYR is
    // 0, so "field 6 names a rider" is a real discriminator, not a tautology.
    const ptero = decBlockFields('P7DEC')
    expect(ptero[1], 'P7DEC is the pterodactyl block').toBe('PTERO')
    expect(ptero[5], 'the pterodactyl carries NO rider').toBe('0')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 2 (AC-1) — every enemy draws a MOUNT and a RIDER
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-46 AC-1 — enemyDrawList stacks a rider on the mount, and drawList emits both', () => {
  it('enemyDrawList returns exactly [mount, rider] — the BR* body then a PLYR* knight', async () => {
    const r = await loadEnemyDrawList()
    const p = enemyProc(0x40, 'bounder', 150, 90)
    const list = r.enemyDrawList(p)
    expect(list.length, 'two ordered layers, exactly as playerDrawList returns for a player').toBe(2)
    expect(list[0], 'the first (under) layer is the unchanged buzzard body frame').toBe(r.enemyFrame(p))
    expect(isMount(list[0]), 'the mount is a BR* body frame').toBe(true)
    expect(isRider(list[1]), 'the second (top) layer is a PLYR3/4/5 rider').toBe(true)
  })

  it('drawList emits BOTH ops for one enemy, each tagged with the enemy facing (both directions)', async () => {
    // MUTATION: dropping the rider op (reverting to the single mount op the port
    // emits today) collapses this to length 1 and reddens. Vary facing so a
    // constant tag dies (routing ≠ geometry — the flip is data on the op).
    const r = await loadEnemyDrawList()
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)

    for (const facing of [1, -1] as const) {
      const ents = entityOps(r.drawList(only(base, [enemyProc(0x40, 'hunter', 150, 90, facing)])))
      expect(ents.length, `a single enemy (facing ${facing}) draws a mount AND a rider — two ops`).toBe(2)
      expect(ents.filter((o) => isMount(o.name)).length, 'exactly one BR* mount op').toBe(1)
      expect(ents.filter((o) => isRider(o.name)).length, 'exactly one PLYR* rider op').toBe(1)
      expect(
        ents.every((o) => o.facing === facing),
        `both ops carry facing ${facing} so the shell mirrors a left-facer`,
      ).toBe(true)
    }
  })

  it('a FRESH-WAVE enemy (wave 1 bounder) produces a rider op stacked on its BR* mount', async () => {
    // Not a hand-built fixture: pull the actual enemy createWaveDemo spawned and
    // isolate it so its two ops can be attributed. This is the AC-1 guard proper —
    // a real wave enemy carries a rider, so the user sees a knight on every buzzard.
    const r = await loadEnemyDrawList()
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)
    const fresh = base.sim.processes.find((p) => p.kind === 'enemy')
    expect(fresh, 'wave 1 sends in ground enemies').toBeDefined()

    const ents = entityOps(r.drawList(only(base, [fresh!])))
    expect(ents.length, 'the fresh-wave enemy is drawn as a mount + rider, not a bare bird').toBe(2)
    expect(ents.some((o) => isMount(o.name)), 'its BR* mount is drawn').toBe(true)
    expect(ents.some((o) => isRider(o.name)), 'its PLYR* rider is drawn').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 3 (AC-2 port) — the built code draws the species' OWN DPLYR sprite
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-46 AC-2 (port) — enemyDrawList picks the species rider the ROM names', () => {
  it('bounder→PLYR3, hunter→PLYR4, shadowLord→PLYR5', async () => {
    // MUTATION: swapping any two species' riders reddens exactly here. The values
    // are the mapping Group 1 read out of the vendored source.
    const r = await loadEnemyDrawList()
    expect(r.enemyDrawList(enemyProc(1, 'bounder', 150, 90))[1], 'bounder rides PLYR3').toBe('PLYR3')
    expect(r.enemyDrawList(enemyProc(2, 'hunter', 150, 90))[1], 'hunter rides PLYR4').toBe('PLYR4')
    expect(r.enemyDrawList(enemyProc(3, 'shadowLord', 150, 90))[1], 'shadow lord rides PLYR5').toBe('PLYR5')
  })

  it('the three species draw THREE distinct riders (the whole visible difference)', async () => {
    const r = await loadEnemyDrawList()
    const riders = (['bounder', 'hunter', 'shadowLord'] as const).map(
      (s, i) => r.enemyDrawList(enemyProc(i, s, 150, 90))[1],
    )
    expect(new Set(riders).size, 'a fix that drew ONE rider for all enemies would fail here').toBe(3)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 4 (AC-4) — the HATCHED REMOUNT buzzard also gets a rider
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-46 AC-4 — a matured-egg remount buzzard is drawn with a rider too', () => {
  it('drawList gives the remount enemy a rider op (no special case in the enemy branch)', async () => {
    // remountEnemyProcess builds a kind:'enemy' process, so enemyDrawList covers it
    // with no special-casing. Drive a settled egg through its hatch cutscene until
    // the remount buzzard flies in, then pin that it is drawn as mount + rider.
    //
    // NOTE: the remount's species is 'bounder' ONLY because remountEnemyProcess
    // hardcodes it today (the jt9-47 follow-up — a hatched hunter/lord loses its
    // species). So this AC pins that the rider is DRAWN, not which species it is.
    const r = await loadEnemyDrawList()
    const dmod = await loadDemo()
    let d: DemoState = only(dmod.createWaveDemo(SEED), [hatchingEggProc(0x1_0001, 60, 40)])

    let remount: DemoProcess | undefined
    for (let f = 0; f < 600 && !remount; f++) {
      d = dmod.stepDemo(d)
      remount = d.sim.processes.find((p) => p.kind === 'enemy')
    }
    expect(remount, 'the settled egg hatched into a remount buzzard').toBeDefined()

    const ents = entityOps(r.drawList(only(d, [remount!])))
    expect(ents.some((o) => isRider(o.name)), 'the remount buzzard carries a rider, not a bare bird').toBe(true)
    expect(ents.length, 'it is drawn as a mount + rider like every other enemy').toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 5 (AC-5) — the rider SITS ON the buzzard (its own POSOFF, not at the feet)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-46 AC-5 — the rider op carries the PLYR* record POSOFF (stacked, not at the feet)', () => {
  it('the rider op is placed at feet + posOffset(rider) — lifted onto the mount', async () => {
    // The rider must carry PLYR3/4/5's OWN transcribed POSOFF (position word 751),
    // so it stacks on the buzzard rather than drawing its top-left at the feet.
    // Tie the placement to the record via posOffset (not a literal); a rider drawn
    // at the feet (zero offset) reddens.
    //
    // HUMAN VISUAL-VERIFICATION POINT (for the Reviewer): the EXACT on-buzzard
    // alignment — 751 was authored over the ostrich/stork mount, not the BR* body —
    // is not asserted here. Confirm it with a `just serve` screenshot at /joust/.
    const r = await loadEnemyDrawList()
    const dmod = await loadDemo()
    const base = dmod.createWaveDemo(SEED)

    const POSX = 150
    const PIXEL_Y = 90
    const p = enemyProc(0x40, 'bounder', POSX, PIXEL_Y) // rides PLYR3
    const rider = r.enemyDrawList(p)[1]
    const off = r.posOffset(rider)

    // The lift is real, not a no-op — else "carries its POSOFF" is vacuous.
    expect(off.yoff, 'PLYR3 carries a non-zero POSOFF lift (position word 751)').not.toBe(0)

    const ops = entityOps(r.drawList(only(base, [p])))
    const riderOp = ops.find((o) => isRider(o.name))
    expect(riderOp, 'the rider op is present').toBeDefined()
    expect(riderOp!.x, 'rider x = feetX + xoff (its own POSOFF, not the feet)').toBe(POSX + off.xoff)
    expect(riderOp!.y, 'rider y = feetY − yoff (its own POSOFF, not the feet)').toBe(PIXEL_Y - off.yoff)
  })
})
