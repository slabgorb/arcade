// tests/demo-jt9-9.test.ts
//
// Story jt9-9 — RED phase (Mr. Praline / TEA). THE EGG LIFECYCLE, in the fixed
// order the story mandates: (1) the EGGWT/EGGWT2 wait, (2) the uncollected KILL
// egg that matures, (3) EGGSCR scored to the victor on the kill.
//
// ─── THREE CORRECTIONS TO THE STORY, ALL MEASURED AT RED ─────────────────────
//
// (1) THE WAIT IS NOT PER-FRAME. The story context's AC-1 says the timer
//     "decrements the timer by 1 per frame". The ROM's settled-egg loop is
//
//         EGGLND  LDA  EGGWT       GET CURRENT WAIT TIME     (:3224)
//                 STA  PJOYT,U                               (:3225)
//         EGGLN2  JSR  WEGG                                  (:3226)
//                 PCNAP 12         12 EGG MAXIMUM, HOPEFULLY MULTIPLEXED (:3227)
//                 ...
//                 DEC  PJOYT,U                               (:3236)
//                 BNE  EGGLN2                                (:3237)
//
//     so one decrement costs a PCNAP-12 nap — TWELVE display frames, not one.
//     This port already models PCNAP that way everywhere else it appears
//     (`baiter.EMYOK_NAP_FRAMES` = 8 for `PCNAP 8` at :2096; `dissolve` holds
//     2+6 naps at :1393-1399). A per-frame decrement would make every egg in
//     the game hatch TWELVE TIMES too fast, which is the same class of error
//     bz3 found in battlezone's timebase. The pins below are written against
//     the nap, and `EGG_WAIT_NAP_FRAMES` is asserted to be 12.
//
// (2) EGGWT AND EGGWT2 ARE DIFFERENT WAITS, and RAMDEF names the split:
//         EGGWT   RMB 1+1  TIME TO WAIT BEFORE STARTING EGG HATCHIN SEQUENCE
//         EGGWT2  RMB 1+1  TIME TO WAIT BEFORE STARTING EGG HATCHIN (EGG WAVES)
//                                              (RAMDEF.SRC:393, :395)
//     EGGWT is loaded at EGGLND — the moment ANY egg lands (:3224). EGGWT2 is
//     loaded once during EGG-WAVE setup (`LDB EGGWT2  INITIAL EGG WAITING
//     TIME`, :2761). So a wave egg enters holding EGGWT2 and a landed kill egg
//     takes EGGWT. Wiring one row to both is the mutant AC-1's split kills.
//
// (3) `eggsLeft` CANNOT REACH ZERO IN THIS PORT, so AC-3's trigger is
//     unreachable as the story states it. Both producers hard-code the count:
//     `resolveContacts` passes `eggsLeft: EGGS_PER_ENEMY` on every kill
//     (demo.ts:1165) and `settledWaveEgg` sets `EGGS_PER_ENEMY` (demo.ts:602),
//     `EnemyState` carries no PEGG field at all, and `remountEnemyProcess`
//     (demo.ts:637) builds a fresh enemy that remembers nothing. So every
//     kill-egg in the running game is born with 3 and dies with 3; permadeath
//     and the last-egg score are both dead code paths.
//
//     The ROM carries the count on the BIRD across the whole cycle:
//         LDA  PEGG,U   TRANSFER NBR OF EGG LEFT      (:2999)  death  → egg
//         STA  PEGG,Y                                 (:3000)
//         DEC  PEGG,Y   YOU CAN ONLY SQUEEZE ...      (:3001)
//         ...
//         LDA  PEGG,U   MAINTAIN NBR OF EGGS LEFT IN THE BIRD (:3251) egg → bird
//         STA  PEGG,Y                                 (:3252)
//     AC-3 therefore needs the PEGG carry FIRST. The pins below state it as an
//     observable over a full kill → egg → hatch → kill cycle, seam-agnostic
//     about where Dev homes the field (on `EnemyState`, or beside `budget` on
//     `DemoSim` — jt8-1's precedent), exactly as jt8-4 did for DEGGS.
//
// ─── WHAT THESE PINS KILL ────────────────────────────────────────────────────
// Every assertion names the mutant it forbids. Expected values are read out of
// `difficulty.waveValue` rather than re-typed, so a re-implementation of the
// DYTBL walk inside the egg code cannot pass by agreeing with a literal here;
// the ROM-cited anchors ($40 at wave 1, the 4x fall to $10) are asserted
// separately so a broken `waveValue` cannot make the oracle vacuous.

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoProcess, type DemoState, type EggState } from './helpers/demo-contract.js'
import { loadDifficulty } from './helpers/difficulty-contract.js'
import { loadEgg } from './helpers/egg-contract.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// ─── Staging ─────────────────────────────────────────────────────────────────

/** An egg with test-neutral defaults (mirrors demo.test.ts's local factory). */
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

/** A SETTLED kill-egg process — the `$1_0000+` namespace, and NO `waveEgg` tag. */
function killEggProc(id: number, over: Partial<EggState> = {}): DemoProcess {
  return { id: 0x1_0000 + id, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg: eggOf(over) }
}

/** A SETTLED wave-egg process — the complement namespace, tagged `waveEgg`. */
function waveEggProc(id: number, over: Partial<EggState> = {}): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    waveEgg: true,
    egg: eggOf(over),
  }
}

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

/**
 * A demo staged with exactly these processes at `wave`. The player sits far from
 * the egg (posX 20 vs the egg's 100+) so no catch pass can collect it — these
 * tests are about MATURATION, and a collected egg would prove nothing about it.
 */
async function stagedDemo(processes: DemoProcess[], wave = 1): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return { ...base, wave, sim: { ...base.sim, processes } }
}

/** Step `n` frames with neutral input. */
async function run(demo: DemoState, n: number): Promise<DemoState> {
  const dmod = await loadDemo()
  let d = demo
  for (let f = 0; f < n; f++) d = dmod.stepDemo(d)
  return d
}

const eggsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')
const enemiesIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the EGGWT / EGGWT2 wait, counted in PCNAP-12 naps
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-1 — a settled egg WAITS before it hatches (EGGWT :3224 / EGGWT2 :2761)', () => {
  it('exposes the PCNAP-12 nap length as a cited constant, not a bare 1', async () => {
    const dmod = (await loadDemo()) as unknown as Record<string, unknown>
    // KILLS: a per-frame decrement. `PCNAP 12` (:3227) is the cost of ONE
    // `DEC PJOYT,U` (:3236), so the nap length is the unit the wait is counted
    // in. 1 here would make every egg hatch twelve times too fast.
    expect(dmod.EGG_WAIT_NAP_FRAMES, 'PCNAP 12 at JOUSTRV4.SRC:3227').toBe(12)
  })

  it('takes its wait from the DYTBL EGGWT row — $40 at wave 1, falling 4x to $10', async () => {
    const d = await loadDifficulty()
    // The ROM-cited anchors, asserted against the ROW rather than against a
    // literal in the egg code. KILLS: a frozen constant (the uf1-2 defect —
    // every dial resolved at wave 1 forever) and a wrong start column.
    expect(d.waveValue('EGGWT', 1), 'EGGWT wave 1 = $40 (DYWST1, GA1 default 5)').toBe(0x40)
    expect(d.dyRow('EGGWT').end, 'EGGWT plateaus at $10 — the 4x fall the story names').toBe(0x10)
    // A LATE wave must be strictly faster. KILLS: reading the row but ignoring
    // the wave (a permissive mutant that still returns a plausible number).
    expect(d.waveValue('EGGWT', 40), 'late-wave eggs hatch sooner').toBeLessThan(
      d.waveValue('EGGWT', 1),
    )
  })

  it('does NOT hatch a settled wave egg on the frame it is already settled', async () => {
    // TODAY THIS IS THE WHOLE BUG: stepDemo's self-clear hatch (demo.ts:1288)
    // matures a settled wave egg on the very next frame, with no wait at all.
    // KILLS: shipping the timer as a field nothing reads.
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), waveEggProc(0x100)])
    const after = await run(demo, 1)
    expect(eggsIn(after).length, 'the egg is still an egg one frame after settling').toBe(1)
    expect(enemiesIn(after).length, 'and nothing has remounted yet').toBe(0)
  })

  it('hatches a settled WAVE egg after EGGWT2 naps — and not a nap sooner', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const nap = dmod.EGG_WAIT_NAP_FRAMES
    // EGGWT2 is the EGG-WAVE initial wait (`LDB EGGWT2  INITIAL EGG WAITING
    // TIME`, :2761; RAMDEF.SRC:395 "EGG WAVES"). Wiring EGGWT here instead is
    // the mutant this pin and the next one jointly kill: at wave 1 the two rows
    // differ (56 vs 64), so the boundary lands in a different place for each.
    const waitNaps = diff.waveValue('EGGWT2', 1)
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), waveEggProc(0x100)])

    const justBefore = await run(demo, waitNaps * nap - 1)
    expect(eggsIn(justBefore).length, 'one frame short of the wait, still an egg').toBe(1)

    const atExpiry = await run(demo, waitNaps * nap)
    expect(eggsIn(atExpiry).length, 'the wait elapses and the egg is gone').toBe(0)
    expect(enemiesIn(atExpiry).length, 'it matured into a remounting buzzard').toBe(1)
  })

  it('hatches a settled KILL egg after EGGWT naps — the LANDING wait, not the wave one', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const nap = dmod.EGG_WAIT_NAP_FRAMES
    // EGGLND is reached by ANY egg that lands (:3224), so a kill-egg's wait is
    // EGGWT. KILLS: one row wired to both paths — EGGWT2 (56) would fire this
    // egg 96 frames early.
    const waitNaps = diff.waveValue('EGGWT', 1)
    expect(waitNaps, 'the two rows differ at wave 1, so this pin discriminates').not.toBe(
      diff.waveValue('EGGWT2', 1),
    )
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1)])

    const justBefore = await run(demo, waitNaps * nap - 1)
    expect(eggsIn(justBefore).length, 'one frame short of EGGWT, still an egg').toBe(1)

    const atExpiry = await run(demo, waitNaps * nap)
    expect(eggsIn(atExpiry).length, 'the EGGWT wait elapses and the kill-egg is gone').toBe(0)
  })

  it('records EGGWT and EGGWT2 as WIRED, each naming its live consumer', async () => {
    const d = await loadDifficulty()
    // ROW_DISPOSITION currently reads `no-consumer-yet, owner: uf1-10` for both
    // (difficulty.ts:375-386). uf1-10 IS this story — the epic renumbered it to
    // jt9-12 and its egg half was folded into jt9-9 — so shipping the wiring
    // without moving these two leaves the inventory lying about its own port.
    for (const name of ['EGGWT', 'EGGWT2'] as const) {
      const disp = d.ROW_DISPOSITION[name]
      expect(disp.kind, `${name} is read by the egg wait now`).toBe('wired')
      expect(
        disp.kind === 'wired' && disp.consumer,
        `${name} must name the egg-wait consumer that reads it`,
      ).toMatch(/egg/i)
    }
    // And the tracked remainder falls by exactly two. KILLS: flipping the
    // dispositions without wiring anything, or wiring a third row by accident.
    const pending = d.DYTBL_ROW_NAMES.filter((n) => d.ROW_DISPOSITION[n].kind === 'no-consumer-yet')
    expect([...pending].sort(), 'only the two lava rows are left waiting').toEqual([
      'LAVGRA',
      'LAVTIM',
    ])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the uncollected KILL egg matures, and the wave can then close
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-2 — an uncollected KILL egg matures like any other (the waveEgg gate goes)', () => {
  it('matures an uncollected kill-egg into a remounting buzzard', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    // THE STORY'S CENTRE. `stepDemo` filters on `p.waveEgg === true`
    // (demo.ts:1288), so today a kill-egg sits settled forever. Nothing in
    // JOUSTRV4.SRC privileges a wave egg's maturation over a kill egg's —
    // EGGLND is one routine and reaches both.
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1)])
    const after = await run(demo, frames)
    expect(eggsIn(after).length, 'the kill-egg matured').toBe(0)
    expect(enemiesIn(after).length, 'and a buzzard flew back in to remount').toBe(1)
  })

  it('enters that buzzard from the FARTHER edge, like every other remount', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const egg = await loadEgg()
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    // KILLS: a kill-egg hatch that skips `remountEntryEdge` and drops the bird
    // where the egg lay. The egg sits at posX 250 (the RIGHT half), so the ROM
    // sends the bird in from the LEFT (:3272-3278).
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1, { posX: 250 })])
    const after = await run(demo, frames)
    const bird = enemiesIn(after)[0]
    expect(bird, 'a bird remounted').toBeTruthy()
    expect(bird.enemy?.entity.posX, 'a right-half egg sends the bird in from the LEFT').toBe(
      egg.REMOUNT_ENTRY_LEFT_X,
    )
  })

  it('stops holding the wave open PERMANENTLY — the egg leaves, a killable bird replaces it', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    // The gate is `!enemiesLeft && !processes.some(egg) && some(player)`
    // (demo.ts:1320-1323). A kill-egg that can never mature sits in the second
    // clause forever, so wave N cannot end however well the players play. After
    // the fix the egg leaves and what holds the wave is a LIVE BUZZARD — which
    // play can remove. That is the whole difference, and it is why this is a
    // fidelity gap rather than the soft-lock jt5-4 twice read it as.
    //
    // NOT ASSERTED, deliberately: that the wave ADVANCES here. It must not —
    // the remount holds it open, correctly. A test demanding an advance would
    // be demanding a bug.
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1, { eggsLeft: 2 })])
    const after = await run(demo, frames)
    expect(eggsIn(after).length, 'no egg is holding the wave any more').toBe(0)
    expect(enemiesIn(after).length, 'a killable buzzard holds it instead').toBe(1)
    expect(after.wave, 'and the wave is still 1 — the bird has to be beaten first').toBe(1)
  })

  it('CONTROL — before the wait expires the egg is still there, still holding wave 1', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    // The positive control for the test above: an implementation that DELETED
    // the egg on frame 1 would satisfy "no egg is holding the wave any more".
    // Here the same staging, one frame short of expiry, must still show it.
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1, { eggsLeft: 2 })])
    const before = await run(demo, frames - 1)
    expect(eggsIn(before).length, 'still waiting').toBe(1)
    expect(enemiesIn(before).length, 'and nothing has remounted yet').toBe(0)
    expect(before.wave, 'still holding wave 1 open').toBe(1)
  })

  it('a PERMADEATH egg (eggsLeft 0) never hatches — and the ROM leaves it lying there', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    // `willHatch` is false at zero (`BNE 1$`, :3002 — the 4th egg is the
    // enemy's permanent death), and DEATH3 still CREATES that egg: the zero
    // case scores through EGGSCR and produces an egg that can only ever be
    // collected. So opening the hatch to kill-eggs must NOT open it to this
    // one. KILLS: dropping the `willHatch` term along with the `waveEgg` term
    // — the obvious way to write AC-2, and it would resurrect dead enemies
    // forever.
    //
    // ─── THIS TEST WAS VACUOUS AND THE REVIEW MUTATION CAUGHT IT ─────────────
    // It used to run `frames * 2` and assert `eggsIn(after).length === 1`. Under
    // the exact mutant it exists to kill, the permadeath egg DOES hatch at frame
    // 767 — and the bird it becomes is then killed and leaves a NEW egg, so by
    // frame 1536 the arena holds one egg again and the count assertion passed.
    // It was satisfied by a DIFFERENT egg than the one it named.
    //
    // Two changes fix it, and both matter: assert IDENTITY (this egg process id,
    // still carrying eggsLeft 0) rather than a population count, and stop at the
    // frame the hatch would happen rather than running on past it into a second
    // lifecycle.
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1, { eggsLeft: 0 })])
    const eggId = killEggProc(1).id

    const atHatchFrame = await run(demo, frames)
    const survivor = atHatchFrame.sim.processes.find((p) => p.id === eggId)
    expect(survivor, 'the SAME egg process is still on the board').toBeTruthy()
    expect(survivor?.kind, 'and it is still an egg, not a hatched bird').toBe('egg')
    expect(survivor?.egg?.eggsLeft, 'still the permadeath egg, not a fresh one').toBe(0)
    expect(enemiesIn(atHatchFrame).length, 'nothing remounted from it').toBe(0)
  })

  it('the hatch reads the wave — a LATE wave egg hatches strictly sooner (the EGGWT walk)', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    // AC-1's headline claim is that EGGWT walks $40 -> $10, so "late-wave eggs
    // hatch four times sooner". Nothing tested it END TO END: the DYTBL oracle
    // above proves `waveValue` walks, but that is the difficulty engine, which
    // already worked. This asserts the EGG CODE consults it.
    //
    // KILLS the mutant that survived review: hard-wiring the hatch's wave
    // argument to 1. That leaves the walk correct, the oracle green and the
    // per-wave pressure entirely absent — the uf1-2 defect exactly, one layer
    // down. Wave 0x20 is BCD for the twentieth (the counter is packed), where
    // EGGWT has walked 64 -> 58.
    const LATE_BCD = 0x20
    const lateWait = diff.waveValue('EGGWT', 20)
    const earlyWait = diff.waveValue('EGGWT', 1)
    expect(lateWait, 'precondition: the row really has walked down by wave 20').toBeLessThan(
      earlyWait,
    )

    const late = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1)], LATE_BCD)
    // One frame short of the LATE wait: still an egg on any correct reading.
    const shortOfLate = await run(late, lateWait * dmod.EGG_WAIT_NAP_FRAMES - 1)
    expect(eggsIn(shortOfLate).length, 'still waiting at wave 20').toBe(1)
    // AT the late wait it must be gone. A hatch pinned to wave 1 would still be
    // waiting here, because wave 1's wait is longer.
    const atLate = await run(late, lateWait * dmod.EGG_WAIT_NAP_FRAMES)
    expect(eggsIn(atLate).length, 'the wave-20 egg hatched on the wave-20 schedule').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 / AC-4 — PEGG carries, and the LAST egg scores to the victor on the kill
// ═════════════════════════════════════════════════════════════════════════════

describe('AC-3 — the egg count CARRIES (PEGG :2999-3001, :3251-3252)', () => {
  it('takes the kill-egg count from the VICTIM, not from a hard-coded 4', async () => {
    const dmod = await loadDemo()
    const egg = await loadEgg()
    // `resolveContacts` (demo.ts:1160-1166) passes `eggsLeft: EGGS_PER_ENEMY`
    // unconditionally, so a bird on its LAST egg still yields a 3-left egg and
    // the count never walks down. The ROM transfers the victim's own count and
    // decrements it (`LDA PEGG,U / STA PEGG,Y / DEC PEGG,Y`, :2999-3001).
    //
    // MUTATION DIRECTION: this asserts a value the current code cannot produce
    // (0), not merely that some value differs — a permissive mutant cannot
    // satisfy it.
    expect(
      egg.spawnEgg({ posX: 0, posY: 0, velX: 0, velY: 0, eggsLeft: 1 }).eggsLeft,
      'the pure law already transfers-and-decrements',
    ).toBe(0)
    // The WIRING is what is missing. Kill an enemy carrying one egg and the
    // resulting kill-egg must be the permadeath one.
    const staged = dmod.resolveContacts(enemyVictim(120, 40, 1), playerVictor(120, 30))
    expect(staged.egg?.eggsLeft, 'a 1-egg enemy leaves a 0-egg (permadeath) egg').toBe(0)
  })

  it('MAINTAINS the count into the remounted bird (:3251-3252)', async () => {
    const diff = await loadDifficulty()
    const dmod = (await loadDemo()) as unknown as Record<string, number>
    const frames = diff.waveValue('EGGWT', 1) * dmod.EGG_WAIT_NAP_FRAMES
    // `LDA PEGG,U / STA PEGG,Y  MAINTAIN NBR OF EGGS LEFT IN THE BIRD`.
    // `remountEnemyProcess` (demo.ts:637) builds an EnemyState with no such
    // field, so today the cycle resets to a full 4 every time and permadeath is
    // unreachable in play. Seam-agnostic: read back through whatever accessor
    // Dev lands, but the OBSERVABLE is that a 2-left egg makes a 2-left bird.
    const demo = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), killEggProc(1, { eggsLeft: 2 })])
    const after = await run(demo, frames)
    const bird = enemiesIn(after)[0]
    expect(bird, 'a bird remounted').toBeTruthy()
    expect(eggsLeftOf(bird), 'the bird carries the egg count forward').toBe(2)
  })
})

describe('AC-4 — EGGSCR on the KILL, and the victor guard (BEQ :3005)', () => {
  it('scores the last egg on the kill — no catch needed', async () => {
    const dmod = await loadDemo()
    const egg = await loadEgg()
    // DEATH3: when the transferred count decrements to ZERO the ROM does not
    // leave an egg to be collected at all — it scores immediately to the victor:
    //     DEC PEGG,Y / BNE 1$ / TFR Y,X / LDU ,S / BEQ 1$ / JSR EGGSCR (:3001-3006)
    // jt8-4 wired the OTHER call site (:3021, the catch). This one is dropped,
    // so the award AND its DEGGS ladder bump never happen in play.
    //
    // THE SEAM: `ContactResult` already carries the kill `score` but has no
    // event channel, so the egg award has nowhere to go. This pin specifies
    // `events` on it, matching how the rest of demo.ts surfaces scores. Dev may
    // home it elsewhere provided the stepDemo-level observable is identical —
    // that latitude is recorded in the TEA Assessment.
    const r = dmod.resolveContacts(enemyVictim(120, 40, 1), playerVictor(120, 30))
    const eggScores = eggScoresOf(r)
    expect(eggScores.length, 'the last egg is scored on the kill').toBe(1)
    expect(eggScores[0]?.value, 'at the first EGGVAL rung, via the shared ladder').toBe(
      egg.eggValue(egg.bumpEggHits(0)),
    )
  })

  it('CONTROL — an enemy with eggs still to come scores nothing (the BNE at :3002)', async () => {
    const dmod = await loadDemo()
    // `BNE 1$  BR=YOU CAN GET MORE EGGS` skips the whole scoring block while the
    // count is nonzero. KILLS: scoring every kill — the permissive mutant that
    // would otherwise satisfy the pin above.
    const r = dmod.resolveContacts(enemyVictim(120, 40, 4), playerVictor(120, 30))
    expect(eggScoresOf(r).length, 'three eggs still to come — nothing scored').toBe(0)
  })

  it('the award climbs the DEGGS ladder — it is not pinned to the opening rung', async () => {
    const egg = await loadEgg()
    // AC-3 says the award "bumps the DEGGS ladder". Nothing tested the CLIMB:
    // `lastEggAward(winner.id, 0)` — always paying 250 — survived the full
    // suite at review. The ladder is per-PLAYER and per-wave (jt8-6), so a
    // knight who has already taken eggs this wave is further up it.
    //
    // Staged through stepDemo because the attribution lives in `collisionPass`,
    // which is module-private: a player already holding `eggHits: 2` kills an
    // enemy on its LAST egg, so the award must be the THIRD rung, not the first.
    const victim: DemoProcess = {
      id: 900,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'enemy',
      enemyType: 'bounder',
      collisionEnabled: true,
      enemy: {
        entity: {
          posX: 120,
          posY: 40 << 8,
          velXIndex: 0,
          velXFrac: 0,
          velY: 0,
          timeUp: 1,
          groundState: null,
          plantZ: 0,
          airborne: true,
          animPhase: 0,
        },
        facing: 1,
        pchase: 0,
        brain: 'linet',
        decision: 'boundr',
        eggsLeft: 1,
      },
    }
    const killer: DemoProcess = { ...playerAt(PLAYER1_ID, 120, 30), eggHits: 2 }
    const demo = await stagedDemo([killer, victim])
    const after = await run(demo, 1)

    const eggScores = after.events.filter(
      (e) => e.kind === 'score' && (e as { reason?: string }).reason === 'egg',
    ) as Array<{ value: number; player?: number }>
    expect(eggScores.length, 'precondition: the staged kill really took a last egg').toBe(1)
    expect(eggScores[0].player, 'credited to the knight that made the kill').toBe(PLAYER1_ID)
    // hitCount 2 already banked → this egg is the THIRD rung (750), not the first.
    expect(eggScores[0].value, 'the third rung, because this knight had two already').toBe(
      egg.eggValue(egg.bumpEggHits(2)),
    )
    expect(eggScores[0].value, 'and that is NOT the opening rung — the mutant that survived').not.toBe(
      egg.eggValue(egg.bumpEggHits(0)),
    )
  })

  it('THE VICTOR GUARD — U zero (no victor) skips EGGSCR, as a PURE law', async () => {
    const dmod = (await loadDemo()) as unknown as Record<string, unknown>
    // `LDU ,S  GET VICTORS WORKSPACE` then `BEQ 1$` (:3004-3005): U is zero when
    // nothing killed the enemy, and the ROM skips EGGSCR entirely.
    //
    // WHY THIS IS A PURE-LAW PIN AND NOT AN INTEGRATION ONE, measured at RED:
    // the victor-less death the guard exists for is the LAVA death, and this
    // port has no lava death at all — `troll.beginGrip` has zero production
    // callers, which `ROW_DISPOSITION.LAVGRA` records and jt9-11 owns. A
    // behavioural test driving a lava death would therefore be VACUOUS today:
    // it would assert "no egg score" over a branch nothing can reach, and pass
    // for a reason unrelated to the guard. Pinning the law directly keeps it
    // falsifiable now; the integration lands with jt9-11's live grip.
    const award = dmod.lastEggAward as
      | ((victor: number | null, hits: number) => number)
      | undefined
    expect(award, 'the last-egg award is a named, victor-guarded law').toBeTypeOf('function')
    expect(award!(PLAYER1_ID, 0), 'a joust kill HAS a victor and scores the rung').toBeGreaterThan(0)
    expect(award!(null, 0), 'a victor-less death scores nothing — the BEQ').toBe(0)
  })
})

// ─── Local entity staging (kept out of the describes to stay readable) ────────

/**
 * A dying ENEMY carrying `eggsLeft` — the DEATH3 victim. `eggsLeft` is the field
 * this story adds to the collision entity so `resolveContacts` can transfer the
 * count instead of hard-coding 4 (demo.ts:1165); it is absent today, which is
 * why the AC-3/AC-4 pins are red.
 */
function enemyVictim(posX: number, pixelY: number, eggsLeft: number) {
  return {
    posX,
    posY: pixelY << 8,
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'enemy',
    enemyType: 'bounder',
    collision: null,
    groundState: null,
    eggsLeft,
  } as never
}

/** The winning PLAYER — higher lance, so `resolveJoust` gives it the kill. */
function playerVictor(posX: number, pixelY: number) {
  return {
    posX,
    posY: pixelY << 8,
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
  } as never
}

/** The `reason:'egg'` score events a contact surfaced, however Dev channels them. */
function eggScoresOf(r: unknown): Array<{ kind: string; reason?: string; value?: number }> {
  const events = (r as { events?: Array<{ kind: string; reason?: string; value?: number }> }).events
  return (events ?? []).filter((e) => e.kind === 'score' && e.reason === 'egg')
}

/**
 * The remounted bird's carried egg count, read seam-agnostically: on the enemy
 * state (the `homing`/`seek`/`plavt` optional-field precedent) or on the
 * process. Returns `undefined` when nothing carries it — which is today.
 */
function eggsLeftOf(p: DemoProcess | undefined): number | undefined {
  if (!p) return undefined
  const onEnemy = (p.enemy as unknown as { eggsLeft?: number } | undefined)?.eggsLeft
  const onProc = (p as unknown as { eggsLeft?: number }).eggsLeft
  return onEnemy ?? onProc
}
