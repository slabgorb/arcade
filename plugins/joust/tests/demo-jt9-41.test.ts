// tests/demo-jt9-41.test.ts
//
// Story jt9-41 — RED phase (TEA). The hatched STANDING KNIGHT is killable during
// EGGLLP before the buzzard remounts (JOUSTRV4.SRC:3316-3319, "WAIT UNTILL BUZZARD
// COMES OR KILLED BY PLAYER").
//
// ─── WHAT THE ROM ACTUALLY DOES (measured, PLYEGG/EGGSCR, :3009-3095) ───────────
// There is NO separate "kill the standing knight" routine. A player that touches the
// egg — at ANY point in its life, cracking or standing — runs the SAME `PLYEGG`
// handler (:3009), which calls `EGGSCR` (:3030): the incrementing EGG-SCORE ladder
// (EGGVAL 250/500/750/1000, capped at 4 hits, :3042-3061). The "kill" is a CONDITIONAL
// side effect of that same hit: `LDY PDIST,X  WAS A BIRD AFTER THE LITTLE MAN? / BEQ
// EGGWAK / DEC NENEMY  THIS GUY IS NO LONGER AN ENEMY / LDD #AUTOFF  THE BIRD SHOULD GO
// OFF SCREEN` (:3078-3087). So when a remount buzzard is already inbound (which it is,
// after EGGLND's INC NENEMY), hitting the egg SENDS THAT BIRD AWAY (AUTOFF) and drops
// the enemy count. That — not a distinct combat — is the EGGLLP "killed by player".
//
// ─── USER RULING (2026-08-06): FULLY ROM-FAITHFUL WINDOW ────────────────────────
// The egg is collidable across the WHOLE cutscene (PID stays $80+EGGID, PCOLY1/PCOLY2
// maintained every EGGTBL row, :3302-3305), so the killable window is the whole
// cutscene, not just the standing frame. This REVISES jt9-25's simplification, which
// made any `hatchRow`-set egg non-collectible (demo.ts catch loop, the
// `if (ep.egg.hatchRow !== undefined) continue` guard) to keep the seed-0xface
// fingerprints still. Removing that guard is the whole change: the existing catch loop
// already scores via the ladder, removes the egg (so the buzzard never spawns at
// walk-off — this port's reachable AUTOFF), and drops it from `population` (NENEMY).
//
// ─── DELIBERATE RE-BASELINE for Dev (GREEN) ────────────────────────────────────
//  1. INVERT demo-jt9-25.test.ts's "a COMMITTED-hatching egg cannot be collected"
//     (:255) — it now asserts the OPPOSITE of the faithful behaviour. Rewrite it, do
//     not delete it: the collect DOES cancel the remount.
//  2. This MOVES seed-0xface (and any seed whose demo player touches a cracking egg)
//     replay fingerprints — the buzzard no longer flies in when the AI collects. Sweep
//     each moved pin for its OWN precondition (method: sprint/archive/jt5-8-session.md);
//     never nudge a digest toward the new output.
//  3. Update the stale jt9-25 comment at the catch-loop guard when removing it.
//
// Node env on purpose (dynamic import of demo.js off disk). This header never spells
// the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoProcess,
  type DemoState,
  type DemoEvent,
  type EggState,
} from './helpers/demo-contract.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// ─── Staging (the jt9-25 local-factory idiom) ──────────────────────────────────

function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 2,
    hitCount: 0,
    pfeet: 1,
    settled: true,
    ...over,
  }
}

/** A settled kill-egg already MID-CUTSCENE — `hatchRow` set is the reachable state
 *  stepDemo writes every frame of the EGGMAN walk. */
function hatchingEggProc(over: Partial<EggState> = {}): DemoProcess {
  return {
    id: 0x1_0000 + 1,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    egg: eggOf({ hatchRow: 0, hatchNap: 7, ...over }),
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

async function stagedDemo(processes: DemoProcess[], wave = 1): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return { ...base, wave, sim: { ...base.sim, processes } }
}

// The remount buzzard rides `0x40_0000 + eggId` (demo.ts remountEnemyProcess) — a
// namespace above every other live process (wave enemies < 0x10000, baiters 0x30_0000).
// Scoping to it isolates the REMOUNT from the wave-advance enemies that spawn once the
// arena clears after a collect, which a bare enemy count would wrongly catch.
const REMOUNT_NS = 0x40_0000
const remountsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy' && p.id >= REMOUNT_NS)
const hasProc = (d: DemoState, id: number): boolean => d.sim.processes.some((p) => p.id === id)
const eggScores = (d: DemoState): Array<DemoEvent & { value: number }> =>
  d.events.filter(
    (e): e is DemoEvent & { value: number } =>
      e.kind === 'score' && (e as { reason?: string }).reason === 'egg',
  )

const EGG_X = 100

/** Step up to `frames`, running `each` after every step; stops early only via `each`
 *  returning true (so the buzzard-spawn frame never ends the loop implicitly). */
function run(
  step: (d: DemoState) => DemoState,
  start: DemoState,
  frames: number,
  onFrame: (d: DemoState) => void,
): DemoState {
  let d = start
  for (let f = 0; f < frames; f++) {
    d = step(d)
    onFrame(d)
  }
  return d
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — a HATCHING egg is a hittable target across the cutscene (the jt9-25
//        exclusion is lifted): a player on it collects it — cue + egg-score event.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-41 AC-1 — a player kills/collects a hatching egg (PLYEGG, JOUSTRV4.SRC:3009)', () => {
  it('collects an egg mid-CRACK (hatchRow 0): egg-collected cue + a reason:egg score', async () => {
    const dmod = await loadDemo()
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 0, hatchRow: 0, hatchNap: 7 }),
    ])
    let collected = false
    let scored = false
    run(dmod.stepDemo, start, 200, (d) => {
      if (d.cues.some((c) => c.type === 'egg-collected')) collected = true
      if (eggScores(d).length > 0) scored = true
    })
    // TODAY the catch loop's `hatchRow !== undefined` skip fires — no collect ever.
    expect(collected, 'a hatching egg overlapping a player must be collectible').toBe(true)
    expect(scored, 'collecting it must surface a reason:egg score, exactly as a normal catch').toBe(true)
  })

  it('collects the STANDING KNIGHT (hatchRow 7, PLY4S) — the literal EGGLLP kill', async () => {
    const dmod = await loadDemo()
    // hatchRow 7 = the terminal PLY4S standing frame; the EGGLLP wait before remount.
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 0, hatchRow: 7, hatchNap: 7 }),
    ])
    let collected = false
    run(dmod.stepDemo, start, 60, (d) => {
      if (d.cues.some((c) => c.type === 'egg-collected')) collected = true
    })
    expect(collected, 'the standing knight (PLY4S) is killable during EGGLLP').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — killing the knight CANCELS the pending remount: the buzzard never flies
//        in (AUTOFF + DEC NENEMY, :3078-3087). With a positive control that the
//        UNtouched egg DOES spawn the buzzard, so the cancel is doing the work.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-41 AC-2 — a kill cancels the remount buzzard (AUTOFF, JOUSTRV4.SRC:3086)', () => {
  it('CONTROL: an untouched standing knight (hatchRow 7, nap 1) DOES spawn a buzzard', async () => {
    const dmod = await loadDemo()
    // No player near it: the cutscene runs off the end and remounts. Passes today and
    // after — it proves the buzzard normally comes, so AC-2's cancel is non-vacuous.
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X + 400, 40), // parked far away
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, hatchRow: 7, hatchNap: 1 }),
    ])
    let sawRemount = false
    run(dmod.stepDemo, start, 20, (d) => {
      if (remountsIn(d).length > 0) sawRemount = true
    })
    expect(sawRemount, 'the uncollected cutscene must remount into a buzzard').toBe(true)
  })

  it('a player on the standing knight cancels the remount — NO buzzard ever flies in', async () => {
    const dmod = await loadDemo()
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 0, hatchRow: 7, hatchNap: 1 }),
    ])
    let sawRemount = false
    // 150 frames > EGG_HATCH_ANIM_FRAMES (112): well past when a remount could fly in.
    // Scoped to the remount namespace so the wave-advance enemies that appear once the
    // arena clears after the collect are not miscounted as the cancelled buzzard.
    const end = run(dmod.stepDemo, start, 150, (d) => {
      if (remountsIn(d).length > 0) sawRemount = true
    })
    // TODAY the egg is un-collectible, so the flatMap remounts it into a buzzard.
    expect(sawRemount, 'killing the knight must send the inbound buzzard away, not spawn one').toBe(false)
    expect(remountsIn(end).length, 'no remount buzzard at the end either').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the kill scores through the EGG LADDER (EGGSCR/EGGVAL), NOT a flat enemy
//        kill value. First hit of a grounded egg = 250 (rung 1), never 500/750/1500.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-41 AC-3 — the score is the egg ladder, not killScore (EGGVAL, JOUSTRV4.SRC:3097)', () => {
  it('a first, grounded collect scores 250 — the ladder rung, not a bounder/hunter/lord value', async () => {
    const dmod = await loadDemo()
    // pfeet 1 (already bounced) → no +500 air-catch bonus, isolating rung 1 = 250.
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 1, hitCount: 0, hatchRow: 0, hatchNap: 7 }),
    ])
    const values: number[] = []
    run(dmod.stepDemo, start, 200, (d) => {
      if (d.cues.some((c) => c.type === 'egg-collected')) {
        for (const e of eggScores(d)) values.push(e.value)
      }
    })
    expect(values.length, 'the collect must have surfaced a score').toBeGreaterThan(0)
    // EGGVAL rung 1 = 250 ($52 via SCRTEN). A Dev who reuses killScore would emit 500.
    expect(values, 'the ladder rung, not a flat kill value').toContain(250)
    expect(values, 'must NOT be a bounder kill (500)').not.toContain(500)
    expect(values, 'must NOT be a hunter kill (750)').not.toContain(750)
    expect(values, 'must NOT be a shadow-lord kill (1500)').not.toContain(1500)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the killed knight is REMOVED (DEC NENEMY reachable form): it becomes
//        neither a buzzard nor a fresh egg. No re-egg loop.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-41 AC-4 — a killed knight leaves nothing behind (DEC NENEMY, JOUSTRV4.SRC:3080)', () => {
  it('after the kill there is no egg and no enemy for that lineage', async () => {
    const dmod = await loadDemo()
    const eggId = 0x1_0000 + 1 // hatchingEggProc's id
    const remountId = REMOUNT_NS + eggId // what remountEnemyProcess would create
    const start = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 0, hatchRow: 5, hatchNap: 7 }),
    ])
    let collected = false
    let sawRemount = false
    const end = run(dmod.stepDemo, start, 150, (d) => {
      if (d.cues.some((c) => c.type === 'egg-collected')) collected = true
      if (hasProc(d, remountId)) sawRemount = true
    })
    expect(collected, 'the knight was killed').toBe(true)
    // Killing ends the lineage — no infinite egg loop: the egg is gone and it neither
    // remounts into its buzzard nor leaves a fresh egg. (Scoped to the lineage's own
    // ids so wave-advance enemies/eggs, spawned once the arena clears, are not caught.)
    expect(hasProc(end, eggId), 'the killed egg is gone').toBe(false)
    expect(sawRemount, 'the killed knight never remounted into its buzzard').toBe(false)
  })
})
