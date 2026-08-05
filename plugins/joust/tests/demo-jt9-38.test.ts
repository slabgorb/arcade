// tests/demo-jt9-38.test.ts
//
// Story jt9-38 — RED phase (Mr. Praline / TEA). The egg wave's DENSITY and the
// NENEMY/WENEMY population gate on the settled-egg hatch. Two halves of one
// mechanism: `WENEMY` is the ROM's "NUMBER OF ENEMIES TO HATCH AT A TIME"
// (JOUSTRV4.SRC:2759), so it can only bite when MORE eggs exist than WENEMY.
//
// MEASURED AT RED, and it is why the two halves are one story. Today
// `spawnWaveEggs` deals `bounders + hunters + lords` eggs, and across all
// eighteen egg waves that number EQUALS the ROM's derived WENEMY (every egg row
// carries exactly one non-zero ground nibble). Probed on the real seeded demo at
// wave 5, seeds 0x1234 / 0xbeef / 0x2468: all six wave eggs mature on the SAME
// frame (f=624) with ZERO enemies alive, so the sixth hatches at a population of
// 5 against a quota of 6 and the gate never fires. Building the gate alone would
// ship a guard no seeded run can exercise. With the density at the ROM's twelve
// the same probe gives `hatched=12` at f=624 — six of which must now DEFER — plus
// three further deferrals at f=1403/1738/2694 with 10-11 enemies alive.
//
// THE MUTANT THAT SHAPED THIS FILE. Because every egg in an egg wave matures on
// ONE frame, the gate is only a gate if the population count RISES WITHIN the
// frame — the ROM's `INC NENEMY` at :3242 runs per hatch, not per frame. An
// implementation that counts enemies once before the hatch pass lets all twelve
// through and is indistinguishable from no gate at all. `AC-2/4` below pins it.
//
// WAVE NUMBERS ARE THE DEMO'S BCD COUNTER. Measured: the reachable counters are
// 1-9, 16-25, 32-41, 48-57, 64-65 …, and the egg-typed ones among them are
// 5, 20, 25, 35, 40, 50, 55, 65. Decimal "wave 10" is NOT reachable (the counter
// jumps 9 -> 16), so a fixture staged there would pin nothing. That unit
// confusion is td1-12's, not this story's; it only constrains which waves the
// fixtures may use.
//
// Each test NAMES the mutant it kills. Citations spell the filename
// (`JOUSTRV4.SRC:NNNN`) rather than a bare `:NNNN`, so the comment-citation
// guard's nearest-preceding-filename rule cannot bind a ROM span to a .ts file.

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoProcess, type DemoState } from './helpers/demo-contract.js'
import { loadWave, type WaveRow } from './helpers/wave-contract.js'
import type { EggState } from './helpers/egg-contract.js'

const SEED = 0x1234
const PLAYER1_ID = 1

/** An egg wave whose ground nibble is 6 (wave 5, bounders). */
const EGG_WAVE_6 = 5
/** An egg wave whose ground nibble is 8 (wave 35, hunters) — reachable, and a DIFFERENT nibble. */
const EGG_WAVE_8 = 35
/** A NON-egg wave with a MIXED row (3 bounders + 3 hunters) — the WENEMY-255 control. */
const NON_EGG_WAVE = 4

// ─── The resolver under test, loaded without widening the shared contract ────

/**
 * `wenemyFor` is new in this story, so it cannot go in `loadWave`'s required-export
 * list: that list is checked for EVERY caller of `loadWave`, and adding a name
 * there would fail-to-load every wave-machine test file in the plugin. A file
 * whose tests never ran is indistinguishable on stdout from a file whose tests all
 * passed, so the red would be worthless as well as enormous. Scoped here instead.
 */
async function loadWenemy(): Promise<(row: WaveRow) => number> {
  const specifier = ['..', '..', 'src', 'core', 'wave.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>
  const fn = mod['wenemyFor']
  if (typeof fn !== 'function') {
    throw new Error(
      'wave.ts has no `wenemyFor` export — GREEN (Bicycle Repair Man) adds the WENEMY ' +
        'resolver: 255 for a non-egg wave (LDA #255 / STA WENEMY "MAXIMIM ENEMIES FOR A ' +
        'NORMAL WAVE", JOUSTRV4.SRC:1991-1992, reached on every wave advance), and for an ' +
        'EGG wave the three-way nibble select of JOUSTRV4.SRC:2744-2759 — WBOUND\'s LOW ' +
        'nibble when non-zero, else WBOUND\'s HIGH nibble, else WLORD\'s HIGH nibble.',
    )
  }
  return fn as (row: WaveRow) => number
}

// ─── Staging ─────────────────────────────────────────────────────────────────

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
    pfeet: 1,
    settled: true,
    ...over,
  }
}

/**
 * A settled WAVE egg one frame from maturity. `waitFrames: 1` means the next
 * `stepDemo` computes `remaining = 0` and reaches the hatch/defer decision — the
 * ROM's `DEC PJOYT,U / BNE EGGLN2` falling through (JOUSTRV4.SRC:3236-3237).
 */
function ripeEgg(id: number, posX = 100): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    waveEgg: true,
    egg: eggOf({ waitFrames: 1, posX }),
  }
}

/** Payload-less enemy: holds a population slot without ever jousting (jt8-4/jt8-7 idiom). */
const holder = (id: number): DemoProcess => ({
  id,
  cls: 'secondary',
  nap: 1,
  period: 1,
  kind: 'enemy',
})

/** The plugin's local widening for the baiter tag (mirrors demo-jt4-4.test.ts:39). */
type BaiterProc = DemoProcess & { baiter?: boolean }

/** A PTERODACTYL/baiter process. The ROM counts these on NBAIT (JOUSTRV4.SRC:2111), never NENEMY. */
const ptero = (id: number, baiter: boolean): BaiterProc => ({
  id,
  cls: 'secondary',
  nap: 1,
  period: 1,
  kind: 'ptero',
  baiter,
  facing: -1,
  entity: {
    posX: 260,
    posY: 20 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  },
})

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

/** A demo staged with exactly these processes at `wave`. The player sits far from every egg. */
async function stagedDemo(processes: DemoProcess[], wave: number): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return { ...base, wave, sim: { ...base.sim, processes }, events: [] }
}

const eggsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')
const enemiesIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
// jt9-25 — a "hatch" now ADMITS the egg into the EGGMAN cutscene (hatchRow set at the
// quota-passing frame, INC NENEMY there) rather than spawning the buzzard that frame;
// the remount flies in EGG_HATCH_ANIM_FRAMES later. So the quota's effect is observed
// as cutscene-entry, not as an enemy appearing. A deferred egg stays purely waiting.
const hatchingIn = (d: DemoState): DemoProcess[] => eggsIn(d).filter((p) => p.egg?.hatchRow !== undefined)
const waitingIn = (d: DemoState): DemoProcess[] => eggsIn(d).filter((p) => p.egg?.hatchRow === undefined)
const pterosIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'ptero')

/** Step to the given wave counter by clearing the arena (jt4-5's forced-advance idiom). */
async function advanceTo(target: number): Promise<DemoState> {
  const dmod = await loadDemo()
  let s = dmod.createWaveDemo(SEED)
  for (let g = 0; s.wave < target && g < 90; g++) {
    s = dmod.stepDemo({
      ...s,
      sim: { ...s.sim, processes: s.sim.processes.filter((p) => p.kind === 'player') },
      events: [],
    })
  }
  if (s.wave !== target) throw new Error(`wave ${target} is not reachable on the BCD counter (stopped at ${s.wave})`)
  return s
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — WENEMY is DERIVED, and it is 255 outside an egg wave
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-1 — wenemyFor: 255 for a normal wave, the ROM nibble select for an egg wave', () => {
  it('a NON-egg wave resolves to 255 even though its row has a ground complement', async () => {
    // WNRM: `LDA #255 / STA WENEMY  MAXIMIM ENEMIES FOR A NORMAL WAVE`
    // (JOUSTRV4.SRC:1991-1992). WNRM is reached on EVERY wave advance — all four
    // routes converge on it (JOUSTRV4.SRC:1937, :1952, :1955, :1957) — and only the
    // egg-wave setup at JOUSTRV4.SRC:2759 overwrites it. So the gate is INERT in a
    // normal wave, which is exactly where jt9-9's kill-eggs live.
    //
    // KILLS: "derive WENEMY from the row for every wave" — wave 4 is 3 bounders +
    // 3 hunters, so a bare `bounders + hunters + lords` returns 6 here.
    const w = await loadWave()
    const wenemyFor = await loadWenemy()
    const row = w.waveRowAt(NON_EGG_WAVE)
    expect(w.rawWaveType(row.status), 'wave 4 is not an egg wave').not.toBe('egg')
    expect(row.bounders + row.hunters + row.lords, 'and it DOES have a ground complement to be wrong about').toBe(6)
    expect(wenemyFor(row), 'a normal wave admits every enemy — LDA #255').toBe(255)
  })

  it('every non-egg row in the whole 90-row table resolves to 255', async () => {
    // The sweep's EXTENT is asserted, not just an empty offender list: a sweep that
    // visited nothing is green. KILLS "special-case wave 4".
    const w = await loadWave()
    const wenemyFor = await loadWenemy()
    let checked = 0
    for (const row of w.WAVE_TABLE) {
      if (w.rawWaveType(row.status) === 'egg') continue
      checked++
      expect(wenemyFor(row), `a non-egg row resolved to ${wenemyFor(row)}, not 255`).toBe(255)
    }
    expect(checked, 'the sweep must actually visit the non-egg rows').toBeGreaterThan(60)
  })

  it('an egg wave resolves to its own ground nibble — 6 at wave 5, 8 at wave 35', async () => {
    // `STA WENEMY  NUMBER OF ENEMIES TO HATCH AT A TIME` (JOUSTRV4.SRC:2759), fed by
    // the three-way select at JOUSTRV4.SRC:2744-2759.
    // KILLS "return a constant 6" and "return 255 everywhere".
    const w = await loadWave()
    const wenemyFor = await loadWenemy()
    expect(wenemyFor(w.waveRowAt(EGG_WAVE_6)), 'wave 5 hatches 6 at a time').toBe(6)
    expect(wenemyFor(w.waveRowAt(EGG_WAVE_8)), 'wave 35 hatches 8 at a time').toBe(8)
  })

  it('the nibble SELECT is pinned on SYNTHETIC rows — summing the nibbles is not the ROM', async () => {
    // THE POINT OF THIS TEST. On every one of the eighteen shipped egg rows exactly
    // one ground nibble is non-zero, so `bounders + hunters + lords` agrees with the
    // ROM's select on all of them and no real row can tell the two apart. Only a
    // FABRICATED row can. (`derived-vs-transcribed-needs-a-synthetic-input`.)
    //
    // JOUSTRV4.SRC:2744-2759, read as branches:
    //   A = WBOUND (byte0). BNE 1$ -> non-zero: BITA #$0F / BNE 3$ -> hunters (LOW).
    //                                           else 2$: LSRA x4  -> bounders (HIGH).
    //       else:  A = WLORD (byte1), 2$: LSRA x4 -> lords (HIGH).
    // KILLS "return bounders + hunters + lords" and "always take the high nibble".
    const w = await loadWave()
    const wenemyFor = await loadWenemy()
    const eggStatus = w.WAVE_TABLE.find((r) => w.rawWaveType(r.status) === 'egg')?.status
    expect(eggStatus, 'the table must contain an egg row to borrow a status from').toBeDefined()
    const synth = (over: Partial<WaveRow>): WaveRow => ({
      bounders: 0, hunters: 0, lords: 0, pursuers: 0, pterodactyls: 0, status: eggStatus as number, ...over,
    })
    // hunters non-zero -> the LOW nibble wins outright, even with bounders present.
    expect(wenemyFor(synth({ bounders: 7, hunters: 3 })), 'hunters present: the LOW nibble wins (sum would be 10)').toBe(3)
    // hunters zero -> the HIGH nibble of byte0.
    expect(wenemyFor(synth({ bounders: 7, hunters: 0 })), 'no hunters: the HIGH nibble of WBOUND').toBe(7)
    // byte0 entirely zero -> WLORD's HIGH nibble, and the pursuit nibble must NOT leak in.
    expect(wenemyFor(synth({ lords: 5, pursuers: 15 })), "byte0 zero: WLORD's HIGH nibble, not the pursuit nibble").toBe(5)
  })

  it('every SHIPPED egg row really does carry exactly one non-zero ground nibble', async () => {
    // The honest disclosure that makes the synthetic test above necessary rather
    // than decorative — and it is itself a claim about the table, so it is asserted
    // rather than asserted-in-prose. If a future row breaks this, the select stops
    // being unobservable and this test says so.
    const w = await loadWave()
    const eggRows = w.WAVE_TABLE.filter((r) => w.rawWaveType(r.status) === 'egg')
    expect(eggRows.length, 'the table ships eighteen egg waves').toBe(18)
    for (const r of eggRows) {
      const nonZero = [r.bounders, r.hunters, r.lords].filter((n) => n !== 0)
      expect(nonZero.length, `egg row ${JSON.stringify(r)} must have exactly one ground nibble`).toBe(1)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the egg wave deals TWELVE eggs, independent of the wave row
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-2 — an egg wave deals the ROM\'s TWELVE eggs (JOUSTRV4.SRC:2778-2822)', () => {
  it('wave 5 (a SIX-nibble egg wave) enters TWELVE eggs, not its ground complement', async () => {
    // WAVEGG places six one-per-ledge over EGLEDG's six entries (LDA #6 /
    // STA PWREGA,U "6 EGGS ON EACH LEDGE", JOUSTRV4.SRC:2778-2779, loop
    // JOUSTRV4.SRC:2780-2804, table JOUSTRV4.SRC:2910-2915), then re-primes the
    // counter (LDA #6 / STA PWREGA,U "6 MORE EGGS TO GO", JOUSTRV4.SRC:2805-2806)
    // and scatters six more over the 69-slot EGPTBL (JOUSTRV4.SRC:2807-2822).
    // Both sixes are literal immediates: the total does not track the wave row.
    //
    // KILLS "the complement enters as eggs" — measured, wave 5's complement is 6.
    const w = await loadWave()
    const at = await advanceTo(EGG_WAVE_6)
    expect(w.rawWaveType(w.waveRowAt(EGG_WAVE_6).status), 'wave 5 is the egg wave').toBe('egg')
    const complement = w.waveRowAt(EGG_WAVE_6).bounders + w.waveRowAt(EGG_WAVE_6).hunters + w.waveRowAt(EGG_WAVE_6).lords
    expect(complement, 'wave 5 has a SIX ground complement — the number the port used to deal').toBe(6)
    expect(eggsIn(at).length, 'the egg wave deals the ROM twelve').toBe(12)
    expect(enemiesIn(at).length, 'and NO materialising ground enemy enters alongside them').toBe(0)
  })

  it('wave 35 (an EIGHT-nibble egg wave) enters TWELVE too — the count is row-independent', async () => {
    // The second nibble, so "12" cannot pass by coinciding with one row's arithmetic
    // (2 x complement is 12 at wave 5 and 16 here).
    // KILLS "deal complement x 2" and "deal complement + 6".
    const w = await loadWave()
    const at = await advanceTo(EGG_WAVE_8)
    const complement = w.waveRowAt(EGG_WAVE_8).bounders + w.waveRowAt(EGG_WAVE_8).hunters + w.waveRowAt(EGG_WAVE_8).lords
    expect(complement, 'wave 35 has an EIGHT ground complement').toBe(8)
    expect(eggsIn(at).length, 'still twelve — the ROM immediates do not track the row').toBe(12)
  })

  it('a NON-egg wave still deals no eggs at all — the density is egg-typed', async () => {
    // The negative control: KILLS "spawn twelve eggs on every wave".
    const at = await advanceTo(NON_EGG_WAVE)
    expect(eggsIn(at).length, 'a non-egg wave enters ground enemies, not eggs').toBe(0)
    expect(enemiesIn(at).length, 'and it does enter its ground complement').toBeGreaterThan(0)
  })

  it('the twelve are SPREAD across the pads, not piled on one spot', async () => {
    // ADDED AT FINISH, from the Reviewer's battery. AC-2 requires the placement to be a
    // stated port decision rather than something shipped silently — but it was stated
    // only in a comment, and nothing held it: measured, `const pad = PADS[0]` (all twelve
    // on one spot) left all 2627 tests green.
    //
    // It matters because a co-located stack is collected ATOMICALLY. The catch loop
    // iterates every overlapping egg without breaking, so a player standing on a pad
    // takes the whole stack in ONE frame: measured, three eggs give three DEGGS rungs
    // (250/500/750) and three `egg-collected` cues on a single frame, where the ROM
    // spreads its twelve over six ledges plus a 69-slot table and can never stack at all.
    // Piling all twelve on one pad would make that four rungs and twelve cues.
    //
    // Deliberately asserts the WEAK property (more than one position), not the exact
    // four: the pad layout is the port's approximation and a truer six-ledge placement
    // should not have to redden this. KILLS `PADS[0]`.
    const at = await advanceTo(EGG_WAVE_6)
    const positions = new Set(eggsIn(at).map((p) => `${p.egg?.posX},${(p.egg?.posY ?? 0) >> 8}`))
    expect(eggsIn(at).length, 'twelve eggs staged').toBe(12)
    expect(positions.size, 'the twelve must not all land on one spot').toBeGreaterThan(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2/4 — the gate is a RUNNING count: twelve ripe eggs, SIX hatch, SIX defer
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-2/4 — twelve simultaneous maturities against a quota of six', () => {
  it('exactly SIX hatch and SIX remain — and the six that remain are the SAME eggs', async () => {
    // THE CENTRAL TEST. Measured on the real seeded demo: every wave egg matures on
    // ONE frame (f=624 for all three probed seeds), so the population must rise
    // WITHIN the frame or the gate is not a gate. The ROM's `INC NENEMY` at
    // JOUSTRV4.SRC:3242 runs on the pass that hatches, not once per frame.
    //
    // KILLS, and this is the mutant a natural implementation actually ships:
    // "count the enemies ONCE before the hatch pass" — under it all twelve hatch.
    // Also kills "gate on <= WENEMY" (seven would hatch) and "no gate" (twelve).
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 12 }, (_, i) => ripeEgg(0x500 + i, 100 + i)),
    ]
    const before = await stagedDemo(staged, EGG_WAVE_6)
    expect(eggsIn(before).length, 'staged with twelve ripe eggs').toBe(12)
    expect(enemiesIn(before).length, 'and an empty arena — the population starts at zero').toBe(0)

    const after = dmod.stepDemo(before)
    expect(hatchingIn(after).length, 'the quota admits six into the hatch cutscene (WENEMY = 6 at wave 5)').toBe(6)
    expect(waitingIn(after).length, 'and the other six are DEFERRED, still purely waiting').toBe(6)

    // IDENTITY, never a count: jt9-9's Reviewer caught a count assertion passing on a
    // REGENERATED egg. Every surviving egg must be one we staged, and no new egg id
    // may appear — a fresh egg satisfying `length === 6` is a different failure.
    const stagedIds = new Set(eggsIn(before).map((p) => p.id))
    for (const p of eggsIn(after)) {
      expect(stagedIds.has(p.id), `egg ${p.id} is not one of the twelve staged — it was REGENERATED`).toBe(true)
      expect(p.egg?.settled, 'a deferred egg is still a settled egg').toBe(true)
      expect(p.waveEgg, 'and it keeps its wave-egg tag, so it still serves the EGGWT2 wait').toBe(true)
    }
  })

  it('POSITIVE CONTROL — with the quota lifted above twelve, all twelve hatch on that frame', async () => {
    // Without this, "six remain" is satisfied just as well by a hatch that has
    // stopped working for some unrelated reason. Wave 35's quota is 8, so a run
    // there must admit EIGHT, not six: the number tracks WENEMY rather than being a
    // second hard-coded constant.
    // KILLS "defer everything past six" and "hard-code the quota to 6".
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 12 }, (_, i) => ripeEgg(0x500 + i, 100 + i)),
    ]
    const after = dmod.stepDemo(await stagedDemo(staged, EGG_WAVE_8))
    expect(hatchingIn(after).length, 'wave 35 admits EIGHT into the cutscene — the quota is read, not hard-coded').toBe(8)
    expect(waitingIn(after).length, 'so four are deferred').toBe(4)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — NENEMY is the live ENEMY population: baiters and pterodactyls are not in it
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-3 — pterodactyls and baiters do NOT count toward the quota (NBAIT, JOUSTRV4.SRC:2111)', () => {
  it('five enemies plus three pteros is FIVE — the egg hatches', async () => {
    // The ROM's baiter creation increments NBAIT (JOUSTRV4.SRC:2111 "1 MORE BAITER ON
    // THE SCREEN") and never NENEMY, and the port matches for free because baiters and
    // pterodactyls are `kind: 'ptero'` processes. This test pins that as a property
    // that must STAY free.
    // KILLS "count every non-player process" and "count enemies + pteros" — either
    // gives 8 against a quota of 6 and the egg would be deferred.
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 5 }, (_, i) => holder(0x7000 + i)),
      ptero(0x880, true),
      ptero(0x881, true),
      ptero(0x882, false),
      ripeEgg(0x500),
    ]
    const before = await stagedDemo(staged, EGG_WAVE_6)
    expect(enemiesIn(before).length, 'five enemies — one below the quota of six').toBe(5)
    expect(pterosIn(before).length, 'and three pteros staged alongside').toBe(3)

    const after = dmod.stepDemo(before)
    expect(pterosIn(after).length, 'the pteros are still present at the decision frame').toBe(3)
    expect(hatchingIn(after).length, 'the egg hatched (entered the cutscene): pteros are not part of the population').toBe(1)
    expect(enemiesIn(after).length, 'the five enemies are unchanged — the remount flies in after the cutscene').toBe(5)
  })

  it('CONTROL — six enemies and NO pteros defers, so the test above is discriminating', async () => {
    // Same fixture, one more enemy and no pteros. If this did not defer, the test
    // above would pass for a reason having nothing to do with pteros.
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 6 }, (_, i) => holder(0x7000 + i)),
      ripeEgg(0x500),
    ]
    const after = dmod.stepDemo(await stagedDemo(staged, EGG_WAVE_6))
    expect(eggsIn(after).length, 'at quota, the egg is deferred').toBe(1)
    expect(eggsIn(after)[0]?.id, 'and it is the SAME egg').toBe(0x500)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1/4 — the gate is INERT in a normal wave (CORRECTION 1)
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-1/4 — a NORMAL wave never defers, however crowded (WENEMY = 255)', () => {
  it('twenty enemies in a non-egg wave still let a settled kill-egg hatch', async () => {
    // The behavioural half of CORRECTION 1. jt9-9 opened the hatch to kill-eggs, and
    // kill-eggs live in NORMAL waves — where the ROM's quota is 255 and every settled
    // egg matures the instant its timer runs out. That is FAITHFUL, not the defect.
    // KILLS the whole-story regression: "gate every wave on the row's nibble", under
    // which twenty enemies at wave 4 (nibble arithmetic = 6) would defer forever.
    const dmod = await loadDemo()
    const w = await loadWave()
    expect(w.rawWaveType(w.waveRowAt(NON_EGG_WAVE).status), 'wave 4 is not an egg wave').not.toBe('egg')
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 20 }, (_, i) => holder(0x7000 + i)),
      { ...ripeEgg(0x1_0500), waveEgg: undefined } as DemoProcess,
    ]
    const before = await stagedDemo(staged, NON_EGG_WAVE)
    expect(enemiesIn(before).length, 'a very crowded normal wave').toBe(20)
    const after = dmod.stepDemo(before)
    expect(hatchingIn(after).length, 'the kill-egg matured anyway (entered the cutscene) — a normal wave admits 255').toBe(1)
    expect(enemiesIn(after).length, 'the twenty enemies are unchanged — the buzzard flies in after the cutscene').toBe(20)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — resolving the quota must not kill the cabinet at the BCD ROLLOVER
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-4 — the quota lookup survives an OUT-OF-RANGE wave (the `demo.wave >= 1` guard)', () => {
  it('a settled egg maturing at wave 0 does not throw — the `>= 1` guard holds', async () => {
    // `waveRowAt` refuses a wave < 1, and the egg-quota lookup in `stepDemo`'s hatch
    // block keys on `demo.wave`. Since td1-12 (Option B) `demo.wave` is the monotone
    // DECIMAL ordinal, so it is >= 1 in every real game and wave 0 is UNREACHABLE in
    // play — but that invariant is not local to the lookup, so the line carries a
    // `demo.wave >= 1 ? … : 255` guard as cheap defence: without it, a stray wave 0
    // would throw "there is no wave 0" the frame an egg matures. This is the only
    // fixture that reaches that guard; it stages a ripe egg at wave 0 and pins that
    // the cabinet does not go down.
    //
    // (History: this class of crash was live while `demo.wave` was still the BCD
    // WAVBCD byte, which rolled 0x99 -> 0x00 on the hundredth wave. td1-12 retired the
    // rollover — the counter is monotone now — so wave 0 no longer OCCURS; the guard
    // and this test remain only as belt-and-suspenders against an out-of-range wave.)
    const dmod = await loadDemo()
    const outOfRange = 0
    const staged = [playerAt(PLAYER1_ID, 20, 40), ripeEgg(0x500)]
    const at = await stagedDemo(staged, outOfRange)
    expect(() => dmod.stepDemo(at), 'an out-of-range wave must not take the cabinet down').not.toThrow()
  })

  it('CONTROL — the same fixture at an in-range wave hatches, so the test above is about the GUARD', async () => {
    // Without this, the test above would pass just as well against a `stepDemo` that
    // had stopped hatching anything at all, anywhere. Wave 99 is a plain in-range
    // decimal wave (td1-12 / Option B), not the old BCD 0x99 counter.
    const dmod = await loadDemo()
    const after = dmod.stepDemo(await stagedDemo([playerAt(PLAYER1_ID, 20, 40), ripeEgg(0x500)], 99))
    expect(hatchingIn(after).length, 'at wave 99 an unblocked egg still matures (enters the cutscene)').toBe(1)
  })

  it('the rollover fallback ADMITS — a crowded hundredth wave still hatches, it does not freeze', async () => {
    // ADDED AT FINISH, from the Reviewer's battery. The test above pins only that the
    // rolled counter does not THROW — and `.not.toThrow()` admits EVERY non-throwing
    // value. Measured: substituting `: 0` for `: 255` in demo.ts left all 2627 tests
    // green, and `: 1` did too. A quota of 0 makes `population >= quota` true for every
    // egg forever, so on the hundredth wave no settled egg can ever hatch, the clear
    // gate wants no eggs, and the wave becomes unwinnable — a permanent soft-lock
    // shipping green from a one-character edit.
    //
    // 255 is WNRM's own normal-wave value (JOUSTRV4.SRC:1991-1992) and gates nothing, so
    // the right assertion is that the fallback ADMITS a hatch with the arena already
    // crowded. KILLS `: 0` and `: 1`; stays green on `: 255`.
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 9 }, (_, i) => holder(0x7000 + i)),
      ripeEgg(0x500),
    ]
    const before = await stagedDemo(staged, 0x00)
    expect(enemiesIn(before).length, 'nine enemies — well past any real wave quota').toBe(9)
    const after = dmod.stepDemo(before)
    expect(hatchingIn(after).length, 'the hundredth wave ADMITS the hatch (into the cutscene) rather than freezing it').toBe(1)
    expect(enemiesIn(after).length, 'the nine enemies are unchanged — the remount joins them after the cutscene').toBe(9)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the deferral re-polls once per NAP: twelve frames
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-5 — a deferred egg re-checks after ONE nap (JOUSTRV4.SRC:3238 + :3227)', () => {
  it('the deferred egg hatches exactly TWELVE frames after the quota clears, not one and not a whole wait', async () => {
    // `INC PJOYT,U  SET = 1,` (JOUSTRV4.SRC:3238) re-primes the timer to 1 BEFORE the
    // population test, so the branch back to EGGLN2 costs exactly one `PCNAP 12`
    // (JOUSTRV4.SRC:3227) — twelve display frames, the port's EGG_WAIT_NAP_FRAMES.
    // Without :3238 the branch would DEC a zero timer to $FF and wait 255 more naps.
    //
    // KILLS both wrong cadences: re-priming the FULL EGGWT2 wait (the egg would not
    // reappear for hundreds of frames) and re-checking on the NEXT frame (it would
    // hatch at +1).
    const dmod = await loadDemo()
    const nap = dmod.EGG_WAIT_NAP_FRAMES
    expect(nap, 'the nap quantum is the PCNAP 12 of JOUSTRV4.SRC:3227').toBe(12)

    // Frame 1: at quota, so the egg defers.
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 6 }, (_, i) => holder(0x7000 + i)),
      ripeEgg(0x500),
    ]
    const deferred = dmod.stepDemo(await stagedDemo(staged, EGG_WAVE_6))
    expect(eggsIn(deferred).length, 'deferred at the quota').toBe(1)

    // Now clear the quota: strip the holders, keep the deferred egg exactly as it is.
    let d: DemoState = {
      ...deferred,
      sim: {
        ...deferred.sim,
        processes: deferred.sim.processes.filter((p) => p.kind !== 'enemy'),
      },
    }
    expect(enemiesIn(d).length, 'the arena is empty — nothing is blocking the hatch now').toBe(0)

    const hatchedAt: number[] = []
    for (let f = 1; f <= 40 && hatchedAt.length === 0; f++) {
      d = dmod.stepDemo(d)
      // jt9-25 — "hatch" is the egg entering the cutscene (hatchRow set), the frame
      // the re-poll admits it; the buzzard itself flies in later and would confound
      // the cadence measurement.
      if (hatchingIn(d).length > 0) hatchedAt.push(f)
    }
    expect(hatchedAt[0], `the re-poll is one nap: expected the hatch ${nap} frames after the deferral`).toBe(nap)
  })

  it('the deferred egg is NOT re-checked on the very next frame', async () => {
    // Stated separately so a fix that happens to hatch at +12 for some other reason
    // (say, a hard-coded countdown) still has to survive the frame-by-frame shape.
    // KILLS "waitFrames = 1 on defer".
    const dmod = await loadDemo()
    const staged = [
      playerAt(PLAYER1_ID, 20, 40),
      ...Array.from({ length: 6 }, (_, i) => holder(0x7000 + i)),
      ripeEgg(0x500),
    ]
    const deferred = dmod.stepDemo(await stagedDemo(staged, EGG_WAVE_6))
    let d: DemoState = {
      ...deferred,
      sim: { ...deferred.sim, processes: deferred.sim.processes.filter((p) => p.kind !== 'enemy') },
    }
    for (let f = 1; f < dmod.EGG_WAIT_NAP_FRAMES; f++) {
      d = dmod.stepDemo(d)
      expect(eggsIn(d).length, `the egg hatched at +${f}, inside the nap`).toBe(1)
      expect(eggsIn(d)[0]?.id, 'and it is still the same egg all the way through the nap').toBe(0x500)
    }
  })
})
