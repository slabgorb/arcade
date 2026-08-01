// tests/demo-jt8-7.test.ts
//
// Story jt8-7 — RED phase (Mr. Praline / TEA). THE EGG CATCH IS BOX-ONLY:
// wire the transcribed egg collision masks into the player-vs-egg pass, and
// transcribe the six EGGI rows the port dropped.
//
// ─── RED TODAY ───────────────────────────────────────────────────────────────
// `collisionPass`'s catch pass (demo.ts:1027) runs
//     if (!broadPhase(collisionBox(catcher), eggBox(ep.egg))) continue
// and then scores. There is no narrowPhase, so the egg's vertical reach is the
// bare 16px ENTITY_BOX_H (demo.ts:322) rather than CEGGUP's 7 real scanlines.
// The joust pass 140 lines above (demo.ts:887-897) already does broad THEN
// narrow — this story brings the catch to the same shape.
//
// ─── WHERE THE FIXTURES SIT, AND WHY (the jt8-3 rule) ────────────────────────
// "Place fixtures where the two maps DISAGREE." The box and the mask are the
// two maps here. Measured against the transcribed tables (player airborne, so
// `collisionMaskFor` gives CWNG3R — 13 rows; CEGGUP — 7 rows):
//
//   dy = eggTop - playerTop   |  16px box  |  CEGGUP mask
//   -15 .. -6                 |   accepts  |   REJECTS     <- box-only
//    -5 ..  11                |   accepts  |   accepts     <- real catch
//    12 ..  15                |   accepts  |   REJECTS     <- box-only
//   |dy| >= 16                |   rejects  |   rejects     <- no contact
//
// Every no-catch pin below sits strictly inside a box-only band, and the two
// PAIRS (-5/-6 and 11/12) are the sharp discriminators: one pixel apart, on
// opposite sides of the boundary. A fix that tightens the BOX instead of
// consulting the mask cannot satisfy both halves of either pair.
//
// ─── WHY THE FIXTURES ARE `settled: true` ────────────────────────────────────
// `stepFrame` runs BEFORE `collisionPass` (demo.ts:1174-1175), so a falling egg
// is moved and re-accelerated (velY += GRAV = 4, posY += velY) before the catch
// is tested — staged numbers would not be the numbers at collision time.
// `stepEgg` returns a SETTLED egg completely untouched (demo.ts:699), so
// `settled: true` freezes BOTH posY and velY across the step and the staged
// values ARE the collision-time values. Measured, not assumed. The player does
// not drift either (velY 0, timeUp 1 — verified: playerTop is the staged y).
//
// This deliberately isolates the selector's two inputs. A settled egg carrying
// velY=300 is not a state ordinary play produces; the LAST test in the AC-2
// block re-pins one selector case on a genuinely FALLING egg (accounting for the
// +4/+1 drift) so the wiring is proven on a reachable state too.
//
// ─── WHAT PASSES TODAY, AND WHY IT IS NOT SCENERY ────────────────────────────
// Today every pin that expects a CATCH already passes (box-only accepts them
// all). They are here because the cheap wrong fix — shrinking ENTITY_BOX_H to 7,
// or rejecting anything not exactly co-located — makes them fail. They are the
// guards against over-tightening, and the mutation table in the TEA Assessment
// records which mutant each one kills.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EggState,
} from './helpers/demo-contract.js'
import { loadFlight } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// ─── Staging (mirrors demo-jt8-4.test.ts) ────────────────────────────────────

function playerAt(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}

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

const eggProcAt = (id: number, over: Partial<EggState>): DemoProcess => ({
  id,
  cls: 'secondary',
  nap: 1,
  period: 1,
  kind: 'egg',
  egg: eggOf(over),
})

/** Payload-less enemy: holds the wave open without ever jousting (jt8-4's idiom). */
const waveHolder = (): DemoProcess => ({
  id: 0x7000,
  cls: 'secondary',
  nap: 1,
  period: 1,
  kind: 'enemy',
})

const withProcesses = (d: DemoState, procs: readonly DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
})

const eggs = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')

function eggValuesOf(before: DemoState, after: DemoState): number[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<typeof e, { kind: 'score' }> => e.kind === 'score')
    .filter((e) => e.reason === 'egg')
    .map((e) => e.value)
}

async function findAir(): Promise<{ x: number; y: number }> {
  const flight = await loadFlight()
  const arena = await loadArena()
  for (let x = 8; x <= 284; x++) {
    let clear = true
    for (let y = 12; y <= 84; y++) {
      if (arena.groundOutcome(flight.groundMaskAt(x, y)).kind !== 'airborne') {
        clear = false
        break
      }
    }
    if (clear) return { x, y: 48 }
  }
  throw new Error('no open-air column found')
}

/**
 * Stage one player and one SETTLED egg at a vertical offset `dy`, step one
 * frame, and report whether the egg was collected. `velX`/`velY` are the
 * selector's inputs and survive the step untouched (see the header).
 */
async function caughtAt(
  dy: number,
  over: Partial<EggState> = {},
): Promise<{ caught: boolean; values: number[] }> {
  const dmod = await loadDemo()
  const { x, y } = await findAir()
  const before = withProcesses(dmod.createWaveDemo(SEED), [
    playerAt(PLAYER1_ID, x, y),
    eggProcAt(0x1_0001, { posX: x, posY: (y + dy) << 8, settled: true, pfeet: 1, ...over }),
    waveHolder(),
  ])
  expect(eggs(before).length, 'staged with exactly one egg').toBe(1)
  const after = dmod.stepDemo(before)
  return { caught: eggs(after).length === 0, values: eggValuesOf(before, after) }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE SEVEN EGGI ROWS.
//
// `EGGI` is a SEVEN-row frame table (JOUSTI.SRC:2255-2261). pictures.ts:1699
// transcribed row 0 only, anchored startLine 2255 / endLine 2255. Rows 1-6 were
// dropped — the same multi-row-table-read-as-one-row shape as the SNPCR1 sound
// table. The ROM rows, verbatim:
//
//   2255  EGGI  FDB  CEGGUP,$00FA,EGGUP      still, upright
//   2256        FDB  CEGGLF,$00FB,EGGLF      still, tilt left
//   2257        FDB  CEGGRT,$00FB,EGGRT      still, tilt right
//   2258        FDB  CEGGUP,$00FB,EGGB1      hatching 1
//   2259        FDB  CEGGMN,$FFF6,EGGB2      hatching 2
//   2260        FDB  CEGGMN,$FEF5,EGGB3      hatching 3
//   2261        FDB  CEGGMN,$00F5,PLY4S      standing rider
//
// The per-ROM-row record shape is jt3-7's established precedent (IPTERO
// :2601-2606 and ILAVAT :2376-2381 are each transcribed one record per row).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 AC-1 — all seven EGGI rows are transcribed, one record per ROM row', () => {
  /** (collision, position, source) per EGGI row, keyed by its JOUSTI.SRC line. */
  const EGGI_ROWS: ReadonlyArray<readonly [number, string, number, string]> = [
    [2255, 'CEGGUP', 0x00fa, 'EGGUP'],
    [2256, 'CEGGLF', 0x00fb, 'EGGLF'],
    [2257, 'CEGGRT', 0x00fb, 'EGGRT'],
    [2258, 'CEGGUP', 0x00fb, 'EGGB1'],
    [2259, 'CEGGMN', 0xfff6, 'EGGB2'],
    [2260, 'CEGGMN', 0xfef5, 'EGGB3'],
    [2261, 'CEGGMN', 0x00f5, 'PLY4S'],
  ]

  it('every EGGI row has its own ENTITY_RECORD anchored to its own source line', async () => {
    // Kills the do-nothing mutant (today: one record at 2255) and the
    // "widen the existing anchor to 2255-2261" mutant, which would claim the
    // whole table from a single record that still carries only row 0's data.
    const pics = await loadPictures()
    const atLine = (line: number) =>
      pics.ENTITY_RECORDS.filter(
        (r) => r.anchor.file === 'JOUSTI.SRC' && r.anchor.startLine === line,
      )
    const missing = EGGI_ROWS.filter(([line]) => atLine(line).length === 0).map(([l]) => l)
    expect(missing, 'these EGGI rows have no ENTITY_RECORD').toEqual([])
    for (const [line] of EGGI_ROWS) {
      expect(atLine(line).length, `exactly one record anchored at :${line}`).toBe(1)
      expect(atLine(line)[0].anchor.endLine, `the record at :${line} spans ONE row`).toBe(line)
    }
  })

  it('each row carries that row’s own collision mask, position word and pixel source', async () => {
    // Kills the "seven copies of row 0" mutant — the row COUNT alone cannot
    // see it, and a hatching row that keeps CEGGUP would collide as an egg.
    //
    // The position is compared as a 16-BIT WORD, which is what AC-1 names.
    // Rows 4 and 5 ($FFF6, $FEF5) are the first transcribed records whose word
    // has the high bit set — every one of the 44 existing records is in
    // [237, 751] — so there is NO house precedent for signed-vs-unsigned here.
    // Normalising leaves that representation to Dev while still pinning the
    // word exactly. See the Delivery Findings.
    const word = (v: number): number => ((v % 0x10000) + 0x10000) % 0x10000
    const pics = await loadPictures()
    const actual = EGGI_ROWS.map(([line]) => {
      const r = pics.ENTITY_RECORDS.find(
        (e) => e.anchor.file === 'JOUSTI.SRC' && e.anchor.startLine === line,
      )
      return r ? [line, r.collision, word(r.position), r.source] : [line, null, null, null]
    })
    expect(actual).toEqual(EGGI_ROWS.map(([l, c, p, s]) => [l, c, word(p), s]))
  })

  it('introduces NO new pixel blocks and NO new collision tables', async () => {
    // AC-1's explicit negative: all seven sources and all four masks already
    // exist. Kills the "invent an EGGB1 block to satisfy the record" mutant.
    const pics = await loadPictures()
    const blocks = new Set(pics.PIXEL_BLOCKS.flatMap((b) => [b.name, ...b.aliases]))
    const masks = new Set(pics.COLLISION_TABLES.flatMap((t) => [t.name, ...t.aliases]))
    for (const [line, collision, , source] of EGGI_ROWS) {
      expect(blocks.has(source), `row :${line} source ${source} is a pre-existing block`).toBe(true)
      expect(masks.has(collision), `row :${line} mask ${collision} is a pre-existing table`).toBe(
        true,
      )
    }
  })

  it('the dismounted-rider assertion still holds — row 6 does not disturb it', async () => {
    // Row 6 (CEGGMN/PLY4S) is the standing rider, whose mask is also reached
    // through the PLYR4 table at JOUSTI.SRC:2159. The pre-existing guard in
    // pictures.test.ts keys on COLLISION_TABLES membership and PLYR1's null
    // collision; adding row 6 must not perturb either.
    const pics = await loadPictures()
    const plyr1 = pics.ENTITY_RECORDS.find((r) => r.name === 'PLYR1')
    expect(plyr1?.collision, 'a mounted rider overlay still has collision pointer 0').toBeNull()
    expect(
      pics.COLLISION_TABLES.some((t) => t.name === 'CEGGMN' || t.aliases.includes('CEGGMN')),
      'CEGGMN is still a real table',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 / AC-4 — THE CATCH CONSULTS THE MASK.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 AC-3/AC-4 — the catch pass runs narrowPhase after broadPhase', () => {
  it('a co-located egg is still collected (the jt8-4 behaviour survives)', async () => {
    // PASSES TODAY. Kills every over-tightening fix: shrink the box to 7px,
    // demand exact equality, or drop the catch pass altogether.
    const { caught, values } = await caughtAt(0)
    expect(caught, 'a co-located egg is caught').toBe(true)
    expect(values.length, 'and it scores').toBeGreaterThan(0)
  })

  it('an egg 14px BELOW is inside the 16px box but clear of the 7-row mask — NOT caught', async () => {
    // THE HEADLINE. RED today: the box accepts dy=14, so the egg is collected
    // from visibly clear of the player. Kills the do-nothing mutant.
    const { caught, values } = await caughtAt(14)
    expect(caught, 'dy=14 is box-only — the mask must reject it').toBe(false)
    expect(values, 'and nothing is scored').toEqual([])
  })

  it('an egg 10px ABOVE is likewise box-only — NOT caught', async () => {
    // The mirror band. A fix that only guards downward overlap survives the
    // test above and dies here.
    const { caught } = await caughtAt(-10)
    expect(caught, 'dy=-10 is box-only — the mask must reject it').toBe(false)
  })

  it('the lower boundary is SHARP: dy=11 catches, dy=12 does not', async () => {
    // One pixel apart, opposite sides of the mask boundary. A box narrowed to
    // any fixed height cannot land exactly here for both this pair and the
    // upper pair below — only consulting the mask can.
    expect((await caughtAt(11)).caught, 'dy=11 is the last agreeing row below').toBe(true)
    expect((await caughtAt(12)).caught, 'dy=12 is the first box-only row below').toBe(false)
  })

  it('the upper boundary is SHARP: dy=-5 catches, dy=-6 does not', async () => {
    expect((await caughtAt(-5)).caught, 'dy=-5 is the last agreeing row above').toBe(true)
    expect((await caughtAt(-6)).caught, 'dy=-6 is the first box-only row above').toBe(false)
  })

  it('an egg beyond the box entirely is still not caught — broadPhase is not removed', async () => {
    // PASSES TODAY. Kills the "delete broadPhase and rely on the mask" mutant:
    // the masks are only 7 and 13 rows, so a distant egg would also miss, but
    // the horizontal reach would become unbounded — narrowPhase ignores X.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const before = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0002, { posX: x + 64, posY: y << 8, settled: true, pfeet: 1 }),
      waveHolder(),
    ])
    const after = dmod.stepDemo(before)
    expect(eggs(after).length, 'an egg 64px away in X survives').toBe(1)
    expect(eggValuesOf(before, after), 'and scores nothing').toEqual([])
  })

  it('a genuine catch still scores the ladder rung and emits exactly ONE cue', async () => {
    // PASSES TODAY. AC-4's "the catch still fires" half: the narrowPhase gate
    // must not disturb the jt8-4 scoring or the single SNEGG cue.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const before = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0003, { posX: x, posY: y << 8, settled: true, pfeet: 1 }),
      waveHolder(),
    ])
    const after = dmod.stepDemo(before)
    expect(eggValuesOf(before, after).length, 'the ladder rung is scored').toBeGreaterThan(0)
    expect(
      after.cues.filter((c) => c.type === 'egg-collected').length,
      'exactly one egg-collected cue',
    ).toBe(1)
  })

  it('a MID-AIR catch still adds the 500 bonus through the mask gate', async () => {
    // PASSES TODAY. Guards the pfeet branch against a fix that reroutes the
    // catch and loses the bonus on the way.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const before = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0004, { posX: x, posY: y << 8, settled: true, pfeet: 0 }),
      waveHolder(),
    ])
    const after = dmod.stepDemo(before)
    expect(eggValuesOf(before, after).length, 'ladder AND bonus are both emitted').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE WEGG SELECTOR, PINNED THROUGH OBSERVABLE CATCHES.
//
// WEGG (JOUSTRV4.SRC:3507-3530) picks the EGGI row every frame from PVELX's
// sign and PVELY against +/-$0080, indexing EGFLFT/EGFRIT (:3535-3536):
//
//   EGFLFT FCB 0,12,6     (velX <  0)      offsets are BYTES into EGGI,
//   EGFRIT FCB 0,6,12     (velX >= 0)      rows are 6 bytes: 0/6/12 -> row 0/1/2
//
//   near-level  -128 < velY <= 128  -> offset[0] -> row 0  CEGGUP  (both dirs)
//   fast FALL   velY  >  128        -> offset[2] -> LF if velX<0 else RT
//   fast RISE   velY <= -128        -> offset[1] -> RT if velX<0 else LF
//
// The two probe offsets below are the ONLY dy values that separate the three
// masks for an airborne player (measured):
//   dy = -5   UP=catch  LF=catch  RT=NO      <- separates LF from RT
//   dy = 11   UP=catch  LF=NO     RT=NO      <- separates UP from both
//
// NOTE THE ASYMMETRIC BOUNDARY, and see the session's Design Deviations: the
// fall edge is INCLUSIVE (velY=128 is near-level, `SUBD #$0080` then `BGT`
// fails on 0) while the rise edge is EXCLUSIVE (velY=-128 is a FAST RISE,
// `ADDD #$0080` then `BGT` fails on 0). AC-2 as written says `|velY| <= $0080`,
// which is wrong at exactly velY=-128. These tests follow the ROM.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 AC-2 — the egg mask follows WEGG, not a hardcoded CEGGUP', () => {
  it('a near-level egg uses CEGGUP: caught at BOTH probe offsets', async () => {
    // PASSES TODAY. The baseline both other cases are measured against.
    expect((await caughtAt(-5, { velX: 0, velY: 0 })).caught, 'CEGGUP at dy=-5').toBe(true)
    expect((await caughtAt(11, { velX: 0, velY: 0 })).caught, 'CEGGUP at dy=11').toBe(true)
  })

  it('a fast-falling LEFT-moving egg uses CEGGLF — caught at dy=-5, NOT at dy=11', async () => {
    // RED today at dy=11 (box-only catches it). The dy=11 half is what kills a
    // hardcoded CEGGUP: same position, different velocity, different outcome.
    expect((await caughtAt(-5, { velX: -4, velY: 300 })).caught, 'CEGGLF reaches dy=-5').toBe(true)
    expect((await caughtAt(11, { velX: -4, velY: 300 })).caught, 'CEGGLF cannot reach dy=11').toBe(
      false,
    )
  })

  it('a fast-falling RIGHT-moving egg uses CEGGRT — caught at NEITHER offset', async () => {
    // RED today at both. Kills a selector that ignores velX's sign: CEGGLF and
    // CEGGRT differ at dy=-5 and only there.
    expect((await caughtAt(-5, { velX: 4, velY: 300 })).caught, 'CEGGRT misses dy=-5').toBe(false)
    expect((await caughtAt(11, { velX: 4, velY: 300 })).caught, 'CEGGRT misses dy=11').toBe(false)
  })

  it('velX = 0 counts as RIGHT-moving (BPL is taken on zero)', async () => {
    // The sign convention, pinned. `LDA PVELX,U / BPL WEGRIT` sends zero down
    // the EGFRIT path, so a fast-falling egg with no X drift is CEGGRT, not
    // CEGGLF — and CEGGLF would be caught at dy=-5.
    expect((await caughtAt(-5, { velX: 0, velY: 300 })).caught, 'velX=0 is CEGGRT at dy=-5').toBe(
      false,
    )
  })

  it('a fast-RISING egg swaps the two tilts (velX<0 -> CEGGRT, velX>=0 -> CEGGLF)', async () => {
    // EGFLFT is 0,12,6 and EGFRIT is 0,6,12 — the rise slot is the MIRROR of
    // the fall slot. Kills a selector that reuses the fall mapping for a rise.
    expect((await caughtAt(-5, { velX: -4, velY: -300 })).caught, 'rising left -> CEGGRT').toBe(
      false,
    )
    expect((await caughtAt(-5, { velX: 4, velY: -300 })).caught, 'rising right -> CEGGLF').toBe(
      true,
    )
  })

  it('the FALL boundary is inclusive: velY=128 is near-level, velY=129 is a fast fall', async () => {
    // `SUBD #$0080 / BGT` — 128-128 = 0 is not > 0, so 128 stays on row 0.
    expect((await caughtAt(11, { velX: 4, velY: 128 })).caught, 'velY=128 -> CEGGUP').toBe(true)
    expect((await caughtAt(11, { velX: 4, velY: 129 })).caught, 'velY=129 -> CEGGRT').toBe(false)
  })

  it('the RISE boundary is EXCLUSIVE: velY=-128 is already a fast rise', async () => {
    // `ADDD #$0080 / BGT` — -128+128 = 0 is not > 0, so -128 falls through to
    // WEGD3. This is the case AC-2's `|velY| <= $0080` gets wrong; the ROM is
    // the authority and the deviation is logged.
    expect((await caughtAt(11, { velX: 4, velY: -128 })).caught, 'velY=-128 -> CEGGLF').toBe(false)
    expect((await caughtAt(11, { velX: 4, velY: -127 })).caught, 'velY=-127 -> CEGGUP').toBe(true)
  })

  it('the selector works on a genuinely FALLING egg, not only a frozen fixture', async () => {
    // The reachable-state check. This egg is NOT settled, so stepFrame moves it
    // before the catch: staged velY 300 becomes 304 (still a fast fall) and the
    // egg descends exactly 1px, so a stage at dy=10 arrives at dy=11 — where
    // CEGGRT (velX=+4) cannot reach. Both numbers were measured, not assumed.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const before = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0005, {
        posX: x,
        posY: (y + 10) << 8,
        settled: false,
        pfeet: 0,
        velX: 4,
        velY: 300,
      }),
      waveHolder(),
    ])
    const after = dmod.stepDemo(before)
    const survivor = eggs(after)[0]
    expect(survivor, 'the falling egg is NOT collected').toBeDefined()
    // Fixture premises, asserted rather than trusted (the jt8-3 rule).
    expect(survivor!.egg!.velY, 'velY drifted by exactly GRAV').toBe(304)
    expect((survivor!.egg!.posY >> 8) - y, 'and it arrived at dy=11').toBe(11)
  })
})
