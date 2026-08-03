// tests/difficulty-wiring.test.ts
//
// Story uf1-2 — RED phase (Mr. Praline / TEA). jt3-1 built the DYTBL difficulty
// engine and NOTHING EVER CALLED IT. This suite wires it, and pins the wiring at
// the seam rather than at the engine — because the engine already works. A test
// that only exercises `difficultyValue` is green today and proves nothing about
// the bug.
//
// ─── WHAT WAS ACTUALLY DEAD (verified against the tree at 279b1df) ────────────
// `grep -rn "\bSYM\b" src --include="*.ts"` outside src/core/difficulty.ts returns
// ZERO hits for DIFFICULTY_TABLE, difficultyValue, ga1StartColumn, stepNibble,
// GA1_DEFAULT and DYTBL_ROW_COUNT. The module IS imported — by wave.ts:24 and
// arena.ts:51 — but only for the three retrofit knobs, never for a row. So all 28
// rows of the ROM's per-wave escalation were unreachable from the running game.
//
// ─── THE SMOKING GUN: THE CLONE FROZE THE WAVE-1 VALUE ───────────────────────
// MOST DYWORD rows' GA1 column 1 (the shipped GA1=5 tier) reproduce EXACTLY the
// immediate the 1982 source hardcoded before DYTBL existed — the ROM's own trailing
// comments record the migration. (This paragraph said "Every" until uf1-9 measured
// it: SHLETM's column 1 is $0015 = 21 against a comment of 8+1 = 9, and SHUPTM's is
// $000A = 10 against the same 8+1. Nine of that story's eleven rows match and two do
// not, so a blanket sweep reddens on correctly-ported rows — the exceptions are
// asserted BY NAME in tests/cadence-source.test.ts. Corrected here rather than left
// standing because no test asserts this comment, which is exactly how a false
// universal survives.)
//
//     JOUSTRV4.SRC:3819   BODN11  SUBD  BODNVY   #$0100    FALLING NOT TOO FAST?
//     JOUSTRV4.SRC:4004   B2DN11  SUBD  HUDNVY   #$0200    FALLING NOT TOO FAST?
//     JOUSTRV4.SRC:3864           LDA   BOUPWD   #2
//     JOUSTRV4.SRC:3894           LDA   BOUPWU   #8
//     JOUSTRV4.SRC:3801   BOUNDN  CMPD  BODNRG   #DYLEN    LONG OR SHORT RANGE SEEK
//
// and enemy.ts's BOUNDR_DOWN_BRAKE / B2UNDR_DOWN_BRAKE hardcode 0x100 / 0x200 —
// named rather than line-cited, because uf1-9 grew that file and the numbers
// moved (:115/:118 → :266/:273). The wave-1 values, correct for wave
// 1 and wrong for every wave after it. That is the whole defect in one line: the
// clone is a cabinet permanently stuck on wave 1's difficulty.
//
// ─── WHY WAVE 3 IS THE BOUNDARY FOR EVERY ROW ────────────────────────────────
// The RAM copy seeds its countdown timer to 2 (LDA #2 / STA 2,Y, JOUSTRV4.SRC:945),
// game start SKIPS the walk (BRA IWAVE2, :1883), and end-of-wave runs it once
// (LBEQ IWAVE, :2099). So during wave N the walk has run N-1 times, and the first
// step lands on the SECOND walk — i.e. wave 3. All 28 rows change first at wave 3;
// waves 1 and 2 are the start value. That is what keeps jt2's replays safe (AC-5).
//
// ─── THE WIRED SUBSET, AND WHY IT IS TWO ROWS AND NOT TWENTY-EIGHT ───────────
// A row is only wireable if the clone HAS the mechanic that reads it. Consumer map
// recovered by grepping every row label in JOUSTRV4.SRC (27 rows have exactly one
// consumer; LAVLAV has NONE — see ROW_DISPOSITION and the AC-6 suite). Of those,
// only the down-seek brake has a live consumer chain in this port:
//
//     waveValue('BODNVY') → enemy.boundr  ─┐
//     waveValue('HUDNVY') → enemy.b2undr  ─┴→ runBrain → stepEnemy
//                                            → frame.ts:265 → demo.stepDemo → game
//
// Everything else needs a mechanic first (a wing-flap cadence timer, a PDIST
// "distance to go", a range gate, a decision timer, an egg wait) or has a consumer
// that is ITSELF production-dead (troll.beginGrip). Those are inventoried, not
// hand-waved. See the TEA assessment for the two story-text corrections this
// forced.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `waveValue` / `dyRow` / `DYTBL_ROW_NAMES` / `ROW_DISPOSITION` do not exist, so
// loadDifficulty() throws a self-describing "difficulty engine not built yet" per
// test — a clean feature-absent red. The behavioural tests redden on the wave
// argument being ignored: today `boundr(e, p, 3)` returns exactly `boundr(e, p, 1)`
// because the brake is a frozen module constant.
//
// Every test NAMES the mutant it kills.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDifficulty, type DyRowName } from './helpers/difficulty-contract.js'
import { loadEnemy, type EnemyState, type PlayerView } from './helpers/enemy-contract.js'
import { loadDemo } from './helpers/demo-contract.js'
import type { DemoState, DemoProcess } from './helpers/demo-contract.js'
import { loadWaveBcd } from './helpers/wave-contract.js'
import { violations } from './helpers/purity-scanner.js'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')
const readCore = (f: string): string => readFileSync(join(coreDir, f), 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
// The two wired dials, with their curves derived by hand from the DYWORD rows and
// re-derived independently by the engine (the double-entry the epic has used since
// jt1-2). These literals are the SPEC — if the module disagrees, the module is
// wrong.
//
//   BODNVY  :7311  $0080,$0100,$0200,$20,$0300,$4211,$F813,$21
//   HUDNVY  :7319  $0100,$0200,$0300,$20,$0380,$FFFF,$FF84,$84
//
// At GA1=5: tier column 1, and the cadence nibble is the LOW nibble of
// timeBytes[floor(5/2)] — $F8 → 8 for BODNVY, $FF → 15 for HUDNVY.
// ─────────────────────────────────────────────────────────────────────────────
const WIRED = {
  BODNVY: {
    columns: [0x0080, 0x0100, 0x0200] as const,
    start: 0x0100, // GA1=5 → column 1
    end: 0x0300,
    inc: 0x20,
    nibble: 8,
    wave3: 0x0120,
    wave11: 0x0140,
    /** The first wave whose value equals END — the plateau, reached by walking. */
    plateauWave: 123,
    brain: 'boundr' as const,
    constant: 'BOUNDR_DOWN_BRAKE' as const,
    rom: 'JOUSTRV4.SRC:3819',
  },
  HUDNVY: {
    columns: [0x0100, 0x0200, 0x0300] as const,
    start: 0x0200,
    end: 0x0380,
    inc: 0x20,
    nibble: 15,
    wave3: 0x0220,
    wave18: 0x0240,
    plateauWave: 168,
    brain: 'b2undr' as const,
    constant: 'B2UNDR_DOWN_BRAKE' as const,
    rom: 'JOUSTRV4.SRC:4004',
  },
}

const WIRED_NAMES = ['BODNVY', 'HUDNVY'] as const satisfies readonly DyRowName[]

/**
 * A falling enemy staged at a chosen Y-velocity. `velY` is the whole point: the
 * brake compares against it, so it is the ONLY input that must vary between the
 * two halves of a discriminator test.
 */
const fallingEnemy = (brain: 'boundr' | 'b2undr', velY: number): EnemyState => ({
  entity: {
    posX: 100,
    posY: 0x60 << 8, // mid-air, well above the lava and below the ceiling
    velXIndex: 0,
    velXFrac: 0,
    velY,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
  },
  brain,
  decision: brain,
  pchase: 1,
  facing: 1,
})

/**
 * uf1-8 re-homing: the brake probes below used to stage `null as never` — no
 * target, brake decides by fall-through. That is a state the 1982 machine does
 * not have: `JSR SELPLY / BEQ BOLEVV` (:3796-3797) routes a no-target bounder
 * to BOLEV, which never consults BODNVY, and uf1-8 ports that routing. The
 * regime where the wired dial LEGITIMATELY decides is a LONG-RANGE DOWN seek —
 * quarry ≥ BODNRG/HUDNRG pixels below (14 at wave 1, never more) — where the
 * arm wake and every committed wake run the brake law. A knight parked on the
 * bottom island is 114 px under the staged buzzard: long range on every wave,
 * under both the shipped code and uf1-8's. `velXIndex: 2` against the probes'
 * 0 keeps the jt8-2 homing throttle unticked, so no facing flip contaminates
 * an entity comparison.
 */
const FAR_BELOW: PlayerView = { pixelY: 0xd2, velXIndex: 2 }

// ─────────────────────────────────────────────────────────────────────────────
// ROUND 3 — STAGING THE REGION WHERE THE BRAKE STILL DECIDES (the jt8-1 overlap)
//
// jt8-1 (`origin/develop` 85f3537) landed mid-story and threads a live SELPLY
// target into every enemy step. `smartDecision` (enemy.ts) has a seek-up clause and
// a down-seek brake clause, and BOTH return the identical `{ dir, flap: true }`:
//
//     if (playerY !== undefined && playerY < enemyY && velY >= 0) → flap
//     if (velY >= t.brake)                                        → flap   ← the wired dial
//
// so the decision is their DISJUNCTION, and the wired dial only CHANGES the outcome
// where the seek-up clause is false — the quarry is at or below the buzzard, or
// absent. (It is NOT the clause order that does this: the two orderings were checked
// exhaustively over waves × altitudes × velocities and are extensionally identical,
// because both clauses return the same value. Do not write a test to pin the order;
// there is nothing there to pin.) Until jt8-1 `frame.ts` stepped every enemy with no
// player at all, so the seek-up clause was never true in production and the brake
// decided every down-seek — which is why these two end-to-end probes discriminated
// on the natural spawn geometry.
//
// jt8-1 does NOT kill the wired dial. It NARROWS the region in which the dial is
// the branch that decides, to "the buzzard is at or above its quarry". Both probes
// below therefore stage that region deliberately instead of stumbling into it, and
// GUARD that they landed in it (see `brakeDecidingFrames`). Everything else stays
// the real wave: the real complement, the real spawn geometry, the real collision
// pass, and the real aggro state ticking and reconciling every frame.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `createWaveDemo`'s knights start mid-screen at pixel Y 90 and settle at 162 and
 * 128 — one above and one below the buzzard that promotes on this seed. Park both
 * at the bottom island's band top: `arena.ts:151` is CLIF5's LANDING record (LNDB5,
 * `bandTop: 211, snapY: 210`), which is exactly why a knight staged at 211 comes to
 * rest at 210 and stays there, BELOW every buzzard for the whole run. Nothing else
 * about the wave is touched.
 *
 * Below, not merely out of the way: with EVERY live knight at or under the buzzard,
 * `smartDecision`'s seek-up clause is false no matter which of the two SELPLY
 * picks — so the staging does not depend on target.ts's (explicitly approximate)
 * nearest-of-two metric.
 */
const KNIGHTS_ON_THE_BOTTOM_ISLAND = 211

const knightsBelowTheBuzzards = (base: DemoState): DemoState => ({
  ...base,
  sim: {
    ...base.sim,
    processes: base.sim.processes.map((p) =>
      p.kind === 'player' && p.entity
        ? { ...p, entity: { ...p.entity, posY: KNIGHTS_ON_THE_BOTTOM_ISLAND << 8 } }
        : p,
    ),
  },
})

/**
 * How many (frame × smart buzzard) pairs of this frame sat inside the wave-1 /
 * wave-3 brake window WITH THE BRAKE AS THE DECIDING BRANCH — at least one knight
 * alive, and none of them above the buzzard.
 *
 * The "and none above" half is the round-3 addition, and it is the half that
 * matters. Counting merely "a smart enemy was in the window" would ALSO be
 * satisfied by a stretch of the run in which every knight is dead — no target, so
 * no seek-up, so the brake decides by default. That is the pre-jt8-1 world wearing
 * the new code's clothes, and a probe that accepts it proves nothing about the
 * running game. Requiring a LIVE knight below is what makes the count evidence.
 *
 * The empty-list early return is NOT decoration and NOT redundant with the
 * `every` below it: `[].every(…)` is vacuously TRUE, so without this line a frame
 * with every knight dead would be counted as "the brake decided" — the exact
 * regime the paragraph above rules out. Both wave-3 runs below DO reach that
 * regime (the harder-diving buzzard kills the last knight around frame 203), and
 * neither end-to-end assertion would flip without this line, because the live-knight
 * frames already carry their counts above zero. So it is pinned directly, by the
 * "reads ZERO once the knights are gone" test — this suite has now twice shipped a
 * guard clause that could not fail (see the Dev Delivery Findings), and the cheap
 * check is to delete each clause and confirm a test dies.
 */
const brakeDecidingFrames = (d: DemoState): number => {
  // A narrowing loop, not `filter().map()` — the latter needs a cast to reach
  // `entity`, and this file is the template uf1-8/uf1-9 are told to copy.
  const knightY: number[] = []
  for (const p of d.sim.processes) {
    if (p.kind === 'player' && p.entity) knightY.push(p.entity.posY >> 8)
  }
  if (knightY.length === 0) return 0
  let n = 0
  for (const p of d.sim.processes) {
    if (p.kind !== 'enemy' || !p.enemy) continue
    // EACH BRAIN AGAINST ITS OWN ROW. A hunter inside the BOUNDER's window
    // ($0100..$0120) brakes at neither wave 1 ($0200) nor wave 3 ($0220), so it
    // discriminates nothing — counting it would be the guard certifying evidence it
    // does not have. Unreachable on today's staging (every probe uses wave 1's
    // complement, which promotes only `boundr`), which is precisely why it is
    // written correctly now rather than when a hunter first appears.
    const row =
      p.enemy.brain === 'boundr' ? WIRED.BODNVY : p.enemy.brain === 'b2undr' ? WIRED.HUDNVY : null
    if (row === null) continue
    const enemyY = p.enemy.entity.posY >> 8
    if (!knightY.every((y) => y >= enemyY)) continue // a knight above → seek-up decides
    const v = p.enemy.entity.velY
    if (v >= row.start && v < row.wave3) n++
  }
  return n
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — difficultyValue drives the wired rows THROUGH THEIR REAL CONSUMERS, so a
//        later wave observably differs from wave 1 on each wired dial.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the wired dials reach production and escalate', () => {
  it('ties each frozen enemy.ts constant to the table it was copied from', async () => {
    const d = await loadDifficulty()
    const e = await loadEnemy()
    // Kills the mutant "invent a fresh number for the seam": the constant the clone
    // shipped IS the row's wave-1 value at the shipped operator difficulty. If these
    // ever disagree, either the table or the constant drifted.
    expect(d.waveValue('BODNVY', 1), `${WIRED.BODNVY.rom} — the bounder's frozen brake`).toBe(
      e.BOUNDR_DOWN_BRAKE,
    )
    expect(d.waveValue('HUDNVY', 1), `${WIRED.HUDNVY.rom} — the hunter's frozen brake`).toBe(
      e.B2UNDR_DOWN_BRAKE,
    )
  })

  it('escalates each wired dial away from its wave-1 value', async () => {
    const d = await loadDifficulty()
    for (const name of WIRED_NAMES) {
      const spec = WIRED[name]
      // Kills "return the start forever" — the exact bug this story exists to fix.
      expect(d.waveValue(name, 3), `${name} must escalate by wave 3`).toBe(spec.wave3)
      expect(d.waveValue(name, 3), `${name} wave 3 must differ from wave 1`).not.toBe(
        d.waveValue(name, 1),
      )
    }
  })

  it('MIRRORS the wave in the bounder brain: the same fall brakes at wave 1 and does NOT at wave 3', async () => {
    const e = await loadEnemy()
    // velY sits strictly between the wave-1 brake (0x100) and the wave-3 brake
    // (0x120), so it is on opposite sides of the threshold in the two waves. Both
    // halves asserted in ONE test so neither can pass alone — a brain that ignores
    // `wave` gives the SAME answer twice and fails whichever half it does not match.
    const velY = 0x110
    expect(velY).toBeGreaterThanOrEqual(WIRED.BODNVY.start)
    expect(velY).toBeLessThan(WIRED.BODNVY.wave3)

    const at = (wave: number) => e.boundr(fallingEnemy('boundr', velY), FAR_BELOW, wave)
    expect(at(1).flap, 'wave 1: the fall exceeds the 0x100 brake → flap').toBe(true)
    expect(at(3).flap, 'wave 3: the brake has risen to 0x120 → the buzzard keeps falling').toBe(false)

    // Liveness — a brain hard-wired to one answer would satisfy one half above by
    // accident. Below every brake it never flaps; far above every brake it always does.
    const far = (wave: number, v: number) => e.boundr(fallingEnemy('boundr', v), FAR_BELOW, wave)
    expect(far(3, 0).flap, 'not falling at all → no brake at any wave').toBe(false)
    expect(far(3, WIRED.BODNVY.end + 0x100).flap, 'far past every brake → always flaps').toBe(true)
  })

  it('MIRRORS the wave in the hunter brain, at its own higher threshold', async () => {
    const e = await loadEnemy()
    const velY = 0x210 // between HUDNVY wave 1 (0x200) and wave 3 (0x220)
    expect(velY).toBeGreaterThanOrEqual(WIRED.HUDNVY.start)
    expect(velY).toBeLessThan(WIRED.HUDNVY.wave3)

    const at = (wave: number) => e.b2undr(fallingEnemy('b2undr', velY), FAR_BELOW, wave)
    expect(at(1).flap, 'wave 1: exceeds the 0x200 brake → flap').toBe(true)
    expect(at(3).flap, 'wave 3: the brake has risen to 0x220 → keeps falling').toBe(false)

    // The hunter must still tolerate a faster fall than the bounder AT THE SAME WAVE —
    // kills "wire one row into both brains".
    const bounderAt3 = e.boundr(fallingEnemy('boundr', velY), FAR_BELOW, 3)
    expect(bounderAt3.flap, 'at wave 3 the same fall still brakes the BOUNDER (0x120)').toBe(true)
  })

  it('changes the stepped ENTITY, not just the decision (the integration proof)', async () => {
    const e = await loadEnemy()
    const staged = fallingEnemy('boundr', 0x110)
    const w1 = e.stepEnemy(staged, { player: FAR_BELOW, wave: 1 })
    const w3 = e.stepEnemy(staged, { player: FAR_BELOW, wave: 3 })

    // Liveness first: both actually integrated (a frozen enemy would "differ" never,
    // and an exception-swallowing stub would return the input unchanged).
    expect(w1.entity.posY, 'wave 1 step must move the enemy').not.toBe(staged.entity.posY)
    expect(w3.entity.posY, 'wave 3 step must move the enemy').not.toBe(staged.entity.posY)

    // Kills "thread the wave but never use it": at wave 1 the brake fires (an upward
    // flap impulse), at wave 3 it does not, so the resulting velocities diverge.
    expect(w3.entity.velY, 'the wave-3 buzzard is NOT braked, so it falls faster').toBeGreaterThan(
      w1.entity.velY,
    )
  })

  it('reaches the RUNNING GAME — stepDemo feeds its own wave to the enemies', async () => {
    const demo = await loadDemo()
    const SEED = 0x1234
    // The two demos differ in ONE field: `wave`. Same seed, same processes, same
    // arena — so any divergence in the enemies is attributable to the wired dial and
    // nothing else. This is the test that fails if `stepEnemy` gains a `wave` option
    // that no caller ever passes — i.e. if the fix stops one layer short and leaves
    // the engine dead exactly the way uf1-2 found it.
    const base = knightsBelowTheBuzzards(demo.createWaveDemo(SEED))
    const seed3: DemoState = { ...base, wave: 3 }

    const enemyStates = (d: DemoState): string =>
      JSON.stringify(
        d.sim.processes
          .filter((p) => p.kind === 'enemy')
          .map((p) => [p.id, p.enemy?.entity.posY, p.enemy?.entity.velY]),
      )

    let a: DemoState = base
    let b: DemoState = seed3
    // THE PROBE GUARDS ITS OWN DISCRIMINABILITY. The two waves can only diverge if
    // some SMART-brained enemy actually falls into the window between the wave-1
    // brake and the wave-3 brake WHILE the brake is the branch that decides — a dumb
    // `linet` enemy ignores the brake entirely, a buzzard that never falls that fast
    // never consults it, and (since jt8-1) a buzzard whose quarry is ABOVE it flaps
    // for the altitude whatever the wave says. Measured on this seed with the knights
    // parked on the bottom island: enemy 256 promotes to `boundr` and sits in
    // [$0100,$0120) with every live knight below it for 14 of the 240 frames — the
    // first two of those with BOTH knights (one dies at frame 121, the other twelve
    // have one). The first is frame 113, where it touches EXACTLY $0100 — the wave-1
    // rung brakes it and the wave-3 rung does not. If a future change moves the spawn
    // geometry or the aggro selection, THIS assertion fails and says so, instead of
    // the divergence check silently becoming untestable.
    let discriminating = 0
    for (let i = 0; i < 240; i++) {
      a = demo.stepDemo(a)
      b = demo.stepDemo(b)
      discriminating += brakeDecidingFrames(a)
    }
    expect(
      discriminating,
      'the run must put a SMART enemy inside the wave-1/wave-3 brake window WITH A ' +
        'LIVE KNIGHT AT OR BELOW IT (so the wave-dependent brake, not the seek-up ' +
        'branch jt8-1 made reachable, is what decides), or it cannot tell the two ' +
        'waves apart at all',
    ).toBeGreaterThan(0)

    // Liveness — the enemies actually flew; an empty process list would make the
    // comparison below vacuously equal AND vacuously different.
    expect(a.sim.processes.filter((p) => p.kind === 'enemy').length, 'wave 1 must have enemies').toBeGreaterThan(0)
    expect(enemyStates(a), 'the wave-1 enemies must have moved from their spawn').not.toBe(
      enemyStates(base),
    )

    expect(enemyStates(b), 'a wave-3 run must diverge from a wave-1 run of the same seed').not.toBe(
      enemyStates(a),
    )
  })

  it('reads ZERO once the knights are gone — the guard cannot certify the pre-jt8-1 regime', async () => {
    const demo = await loadDemo()
    // The instrument the two end-to-end probes above depend on, pinned directly.
    // With no knight on screen nothing is targetable, `selectTarget` answers null and
    // the brake decides every down-seek — which is exactly the world uf1-2 was
    // written against and exactly the world jt8-1 replaced. A run that only reached
    // the brake window AFTER its last knight died proves nothing about the running
    // game, so `brakeDecidingFrames` must refuse to count it.
    //
    // This is the assertion that dies if the `knightY.length === 0` early return is
    // deleted: `[].every(…)` is vacuously true, so the guard would happily certify a
    // knightless frame. Neither probe above flips without it — which is precisely why
    // it is pinned here instead of being trusted.
    const base = knightsBelowTheBuzzards(demo.createWaveDemo(0x1234))
    // uf1-8: a knightless wave can no longer WANDER into the brake window — a
    // no-target buzzard flies BOLEV (flap iff falling) and never builds $0100
    // of fall. The run therefore carries one buzzard mid-episode with a budget
    // deep enough to outlast all 240 frames (a committed episode spends on,
    // target or none — `BODN1` never re-runs SELPLY), so the window IS reached
    // and the guard's refusal to count it is what is measured, not vacuity.
    const knightless: DemoState = {
      ...base,
      sim: {
        ...base.sim,
        processes: [
          ...base.sim.processes.filter((p) => p.kind !== 'player'),
          enemyProcess({
            ...fallingEnemy('boundr', 0),
            seek: { mode: 'down', pdist: -0x8000 },
          }),
        ],
      },
    }

    // Discriminability of THIS test: the knightless run must genuinely put a smart
    // buzzard in the brake window, or a guard that always returned 0 would pass. That
    // UNGUARDED count comes off the same loop — stepping the run twice to measure two
    // things about it is waste.
    const smartInWindow = (d: DemoState): number =>
      d.sim.processes.filter(
        (p) =>
          p.kind === 'enemy' &&
          p.enemy !== undefined &&
          (p.enemy.brain === 'boundr' || p.enemy.brain === 'b2undr') &&
          p.enemy.entity.velY >= WIRED.BODNVY.start &&
          p.enemy.entity.velY < WIRED.BODNVY.wave3,
      ).length

    let withKnights: DemoState = base
    let without: DemoState = knightless
    let counted = 0
    let countedKnightless = 0
    let raw = 0
    for (let i = 0; i < 240; i++) {
      withKnights = demo.stepDemo(withKnights)
      without = demo.stepDemo(without)
      counted += brakeDecidingFrames(withKnights)
      countedKnightless += brakeDecidingFrames(without)
      raw += smartInWindow(without)
    }
    expect(raw, 'the knightless run must reach the brake window at all, or this proves nothing').toBeGreaterThan(0)

    expect(countedKnightless, 'a knightless frame is NEVER a brake-deciding frame').toBe(0)
    expect(counted, 'the same run WITH knights below does count').toBeGreaterThan(0)
  })

  it('reads ZERO with the knight ABOVE — that is the seek-up branch deciding, not the dial', async () => {
    const demo = await loadDemo()
    // The other half of the instrument, and the half jt8-1 created. A buzzard falling
    // at $0110 is inside the wave-1/wave-3 brake window whatever is on screen — but
    // with the quarry ABOVE, `smartDecision`'s seek-up clause is true, and since both
    // clauses return the same flap the buzzard flaps at EVERY wave: the wired dial
    // cannot change the outcome there. Counting that frame would credit the dial for
    // a decision it did not make.
    //
    // One frame, two placements of the same knight: it is the ONLY thing that differs,
    // so the guard's answer is attributable to the placement and nothing else. This is
    // the assertion that dies if the `knightY.every(y => y >= enemyY)` clause is
    // deleted — the end-to-end probes above cannot kill it, because their knights are
    // parked below for the whole run.
    const base = demo.createWaveDemo(0x1234)
    const buzzard = enemyProcess(fallingEnemy('boundr', 0x110))
    const buzzardY = buzzard.enemy!.entity.posY >> 8
    const knightAt = (pixelY: number): DemoState => ({
      ...base,
      sim: {
        ...base.sim,
        processes: [
          ...base.sim.processes.filter((p) => p.kind === 'player').map((p) => ({
            ...p,
            entity: { ...(p.entity as NonNullable<typeof p.entity>), posY: pixelY << 8 },
          })),
          buzzard,
        ],
      },
    })

    // The premise, asserted not assumed: the staged fall really is inside the window.
    expect(buzzard.enemy!.entity.velY).toBeGreaterThanOrEqual(WIRED.BODNVY.start)
    expect(buzzard.enemy!.entity.velY).toBeLessThan(WIRED.BODNVY.wave3)

    expect(
      brakeDecidingFrames(knightAt(buzzardY + 20)),
      'knight BELOW → seek-up is dormant → the brake decides → counted',
    ).toBe(1)
    expect(
      brakeDecidingFrames(knightAt(buzzardY - 20)),
      'knight ABOVE → seek-up pre-empts the brake → NOT the dial deciding → not counted',
    ).toBe(0)
    expect(
      brakeDecidingFrames(knightAt(buzzardY)),
      'knight LEVEL → `playerY < enemyY` is false, so seek-up stays dormant → counted',
    ).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — ga1StartColumn and the GA1 tier buckets (0-3, 4-6, 7+) select the start
//        column that seeds each wired row, with GA1_DEFAULT 5 shipped.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the GA1 tiers seed the wired rows at the seam', () => {
  it('buckets every operator setting into the right start column, per wired row', async () => {
    const d = await loadDifficulty()
    for (const name of WIRED_NAMES) {
      const [c0, c1, c2] = WIRED[name].columns
      // The boundaries are the bug surface: 3|4 and 6|7 (CMPA #3 / CMPA #6, BLS —
      // JOUSTRV4.SRC:933-938). An off-by-one in either comparison moves a whole tier.
      for (const ga1 of [0, 1, 2, 3]) expect(d.waveValue(name, 1, ga1), `${name} ga1=${ga1}`).toBe(c0)
      for (const ga1 of [4, 5, 6]) expect(d.waveValue(name, 1, ga1), `${name} ga1=${ga1}`).toBe(c1)
      for (const ga1 of [7, 8, 9]) expect(d.waveValue(name, 1, ga1), `${name} ga1=${ga1}`).toBe(c2)
      // The three columns must be genuinely distinct, or the sweep above is vacuous.
      expect(new Set([c0, c1, c2]).size, `${name} tiers must differ`).toBe(3)
    }
  })

  it('defaults the operator setting to GA1_DEFAULT = 5, the shipped middle tier', async () => {
    const d = await loadDifficulty()
    expect(d.GA1_DEFAULT, 'the factory GA1 setting').toBe(5)
    for (const name of WIRED_NAMES) {
      // Kills "default to tier 0" — a silent easiest-difficulty cabinet.
      expect(d.waveValue(name, 1), `${name}: the omitted ga1 must mean GA1_DEFAULT`).toBe(
        d.waveValue(name, 1, d.GA1_DEFAULT),
      )
      expect(d.waveValue(name, 1)).toBe(WIRED[name].columns[1])
    }
  })

  it('ships the DEFAULT tier into the brains, not tier 0 or tier 2', async () => {
    const e = await loadEnemy()
    // The production chain must resolve at GA1=5. A bounder braking at 0x80 (tier 0)
    // or 0x200 (tier 2) would still "use the table" and still be wrong.
    const justUnder = (v: number, brain: 'boundr' | 'b2undr', wave: number) =>
      brain === 'boundr'
        ? e.boundr(fallingEnemy(brain, v), FAR_BELOW, wave).flap
        : e.b2undr(fallingEnemy(brain, v), FAR_BELOW, wave).flap
    expect(justUnder(0x0ff, 'boundr', 1), 'just under the tier-1 brake → no flap').toBe(false)
    expect(justUnder(0x100, 'boundr', 1), 'exactly at the tier-1 brake → flap (SUBD/BMI is >=)').toBe(true)
    expect(justUnder(0x1ff, 'b2undr', 1), 'hunter just under its tier-1 brake → no flap').toBe(false)
    expect(justUnder(0x200, 'b2undr', 1), 'hunter exactly at its tier-1 brake → flap').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the IWAVE walk semantics hold for every wired row: the walk runs wave-1
//        times, clamps at END by the signed comparison, holds flat forever after.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — the IWAVE walk semantics hold at the seam', () => {
  it('reads the START on waves 1 AND 2 — the countdown timer seeds to 2', async () => {
    const d = await loadDifficulty()
    // JOUSTRV4.SRC:945 seeds the timer to 2 and :1883 skips the walk at game start,
    // so the first STEP lands on the second walk = wave 3. This holds for ALL 28
    // rows; asserting it table-wide is cheap and kills "seed the timer to 1"
    // (which would move every row's escalation a wave early) and "seed to 0"
    // (which would step at wave 2).
    for (const name of d.DYTBL_ROW_NAMES) {
      const w1 = d.waveValue(name, 1)
      expect(d.waveValue(name, 2), `${name}: wave 2 still reads the start`).toBe(w1)
      expect(d.waveValue(name, 3), `${name}: wave 3 is the FIRST change`).not.toBe(w1)
    }
  })

  it('walks each wired row monotonically toward END and never past it', async () => {
    const d = await loadDifficulty()
    for (const name of WIRED_NAMES) {
      const spec = WIRED[name]
      let prev = d.waveValue(name, 1)
      for (let wave = 1; wave <= 400; wave++) {
        const v = d.waveValue(name, wave)
        // Both wired rows have a POSITIVE increment, so the walk rises to END and
        // the signed BLT clamp (JOUSTRV4.SRC:1914-1916) must never overshoot.
        expect(v, `${name} w${wave} must not pass END`).toBeLessThanOrEqual(spec.end)
        expect(v, `${name} w${wave} must not go backwards`).toBeGreaterThanOrEqual(prev)
        prev = v
      }
      expect(prev, `${name} must actually REACH its END inside 400 waves`).toBe(spec.end)
    }
  })

  it('holds FLAT forever past the end of the walk — the plateau, not a fall-through', async () => {
    const d = await loadDifficulty()
    for (const name of WIRED_NAMES) {
      const spec = WIRED[name]
      // The tp1-25 lesson: a table lookup's bug lives where the table ENDS. Probe
      // the plateau wave itself and then far, far past it. A walk that silently
      // wrapped, overflowed the signed word, or fell through to a "not found" 0
      // shows up here and nowhere else.
      expect(d.waveValue(name, spec.plateauWave), `${name} reaches END at w${spec.plateauWave}`).toBe(
        spec.end,
      )
      expect(d.waveValue(name, spec.plateauWave - 1), `${name} has NOT reached END the wave before`).not.toBe(
        spec.end,
      )
      for (const wave of [500, 5_000, 100_000]) {
        expect(d.waveValue(name, wave), `${name} w${wave} holds at END`).toBe(spec.end)
      }
    }
  })

  it('reports the cadence nibble the walk actually used', async () => {
    const d = await loadDifficulty()
    for (const name of WIRED_NAMES) {
      // The shipped cadence at GA1=5, which is what the wired dials actually ramp on.
      expect(d.stepNibble(d.dyRow(name), 5), `${name} GA1=5 cadence`).toBe(WIRED[name].nibble)
    }

    // The PARITY rule, probed only where it is observable. An even GA1 takes the
    // HIGH nibble (BCC → LSRB×4), an odd one the LOW (BCS → ANDB #$0F),
    // JOUSTRV4.SRC:1903-1908. Reading the wrong half silently halves or doubles a
    // ramp, and no behavioural test at wave 3 would catch it because wave 3 steps
    // under either nibble.
    //
    // The probe byte MUST have distinct nibbles or the assertion is vacuous. This
    // is why the pair differs per row: BODNVY's timeBytes[2] is $F8 (15/8, probe at
    // GA1 4/5), but HUDNVY's timeBytes[2] is $FF — nibble-SYMMETRIC, so GA1 4/5
    // cannot tell the halves apart there at all. Its timeBytes[3] is $84 (8/4), so
    // HUDNVY is probed at GA1 6/7 instead.
    const parityProbes = [
      { name: 'BODNVY' as const, evenGa1: 4, high: 0xf, oddGa1: 5, low: 0x8 },
      { name: 'HUDNVY' as const, evenGa1: 6, high: 0x8, oddGa1: 7, low: 0x4 },
    ]
    for (const p of parityProbes) {
      expect(p.high, `${p.name}: the probe byte must have distinct nibbles`).not.toBe(p.low)
      expect(d.stepNibble(d.dyRow(p.name), p.evenGa1), `${p.name} GA1=${p.evenGa1} → HIGH`).toBe(
        p.high,
      )
      expect(d.stepNibble(d.dyRow(p.name), p.oddGa1), `${p.name} GA1=${p.oddGa1} → LOW`).toBe(p.low)
    }
  })

  it('REJECTS a wave before 1 instead of silently answering with the start', async () => {
    const d = await loadDifficulty()
    // The walk loop runs `wave - 1` times, so waves 0 and -5 quietly return the START
    // — a legitimate-looking value indistinguishable from wave 1. That is the silent
    // degradation the tp1-25 lesson warns about; a 1-based wave must be enforced at
    // the seam, where callers live.
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => d.waveValue('BODNVY', bad), `wave ${bad} must throw, not answer`).toThrow()
    }
    expect(() => d.dyRow('NOTAROW' as DyRowName), 'an unknown row name must throw').toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the three retrofit knobs are reconciled with the table rather than
//        duplicated. VERIFIED RULING: they are not DYTBL rows at all.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — the retrofit knobs are separate BY ROM, and stay put', () => {
  it('keeps the three knobs OUT of the table — they are computed in the same IWAVE pass, not by it', async () => {
    const d = await loadDifficulty()
    // Verified firsthand against JOUSTRV4.SRC:
    //   EMYTIM  :2202-2205  LDA TBRIDGE / BEQ / LDA #2 / STA EMYTIM  — wave setup.
    //   SAFRAM  :1929-1933  the lava raise, AFTER the DYTBL loop ends at :1927.
    //   WPERSUE :2075-2077  LDA WPERSUE,X / ANDA #$0F / STA WSMART   — the WAVE table.
    // None is a DYWORD row, so "source them from the table" is not available; the
    // module's existing ruling (difficulty.ts:38-52) is CORRECT and this pins it.
    for (const notARow of ['EMYTIM', 'SAFRAM', 'WPERSUE', 'GRAV']) {
      expect(d.DYTBL_ROW_NAMES as readonly string[], `${notARow} is not a DYWORD row`).not.toContain(
        notARow,
      )
      expect(() => d.dyRow(notARow as DyRowName), `dyRow('${notARow}') must throw`).toThrow()
    }
  })

  it('leaves every retrofit knob bit-for-bit unchanged across a wave sweep', async () => {
    const d = await loadDifficulty()
    // Keep-behavior guard. uf1-2 wires NEW dials; it must not perturb the three the
    // jt2-1 migration already settled. The literals are today's shipped values —
    // EMYTIM 2 on waves 1-2 else 1 (:2202-2205), lava $EA→$E5→$E0 then flat
    // (:1929-1933). If Dev "reconciles" these INTO the table, this fails loudly.
    for (let wave = 1; wave <= 12; wave++) {
      expect(d.emytimForWave(wave), `EMYTIM w${wave}`).toBe(wave <= 2 ? 2 : 1)
    }
    expect([1, 2, 3, 4, 5, 6].map((w) => d.lavaLevelForWave(w)), 'the lava-level walk').toEqual([
      0xea, 0xe5, 0xe0, 0xe0, 0xe0, 0xe0,
    ])
  })

  it('documents the separation with its three ROM citations, so the ruling cannot rot', async () => {
    const text = readCore('difficulty.ts')
    // The wrong-prose rule: a ruling that lives only in a reviewer's memory drifts.
    for (const cite of ['2202-2205', '1929-1933', '2075-2077']) {
      expect(text, `difficulty.ts must cite JOUSTRV4.SRC:${cite} for the retrofit ruling`).toContain(
        cite,
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — jt2's seeded determinism replays still reproduce.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-5 — waves 1 and 2 are bit-identical to the frozen behaviour', () => {
  it('holds every wired dial at its shipped constant for waves 1 and 2', async () => {
    const d = await loadDifficulty()
    const e = await loadEnemy()
    // This is WHY the retrofit is replay-safe rather than merely hoped to be: the
    // walk cannot move before wave 3, so anything jt2 recorded on waves 1-2 reads
    // the identical value it read before uf1-2.
    for (const wave of [1, 2]) {
      expect(d.waveValue('BODNVY', wave), `BODNVY w${wave}`).toBe(e.BOUNDR_DOWN_BRAKE)
      expect(d.waveValue('HUDNVY', wave), `HUDNVY w${wave}`).toBe(e.B2UNDR_DOWN_BRAKE)
    }
  })

  it('keeps the exported constants alive at their cited values', async () => {
    const e = await loadEnemy()
    // enemy-contract.ts types these as `number` and tests/enemy.test.ts:317-319 pins
    // them. Turning them into functions would break both for no fidelity gain — the
    // wave-1 value IS a real ROM constant (the pre-DYTBL immediate). Kills the
    // over-eager refactor.
    expect(e.BOUNDR_DOWN_BRAKE, `${WIRED.BODNVY.rom}`).toBe(0x100)
    expect(e.B2UNDR_DOWN_BRAKE, `${WIRED.HUDNVY.rom}`).toBe(0x200)
    expect(e.B2UNDR_DOWN_BRAKE).toBeGreaterThan(e.BOUNDR_DOWN_BRAKE)
  })

  it('defaults an unqualified step to wave-1 behaviour', async () => {
    const e = await loadEnemy()
    const staged = fallingEnemy('boundr', 0x110)
    // Every existing caller that has not been taught about waves must keep getting
    // exactly what it got before. Kills "default the wave to 0" and "default to the
    // plateau".
    expect(e.stepEnemy(staged)).toEqual(e.stepEnemy(staged, { wave: 1 }))
    expect(e.stepEnemy(staged, {})).toEqual(e.stepEnemy(staged, { wave: 1 }))
    expect(e.stepEnemy(staged, { wave: 2 })).toEqual(e.stepEnemy(staged, { wave: 1 }))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — the rows NOT wired by this story are inventoried, so the remaining gap is
//        tracked rather than rediscovered by the next sweep.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-6 — every one of the 28 rows carries an explicit disposition', () => {
  it('covers the table exactly — no row missing, no name invented', async () => {
    const d = await loadDifficulty()
    expect(d.DYTBL_ROW_NAMES.length, 'the 28 DYWORD labels').toBe(d.DYTBL_ROW_COUNT)
    expect([...d.DYTBL_ROW_NAMES], 'row names follow the table order').toEqual(
      d.DIFFICULTY_TABLE.map((r) => r.name),
    )
    expect(Object.keys(d.ROW_DISPOSITION).sort(), 'the inventory is TOTAL over the table').toEqual(
      [...d.DYTBL_ROW_NAMES].sort(),
    )
  })

  it('marks exactly the rows the wiring stories have wired, and names their consumer', async () => {
    const d = await loadDifficulty()
    const wired = d.DYTBL_ROW_NAMES.filter((n) => d.ROW_DISPOSITION[n].kind === 'wired')
    // uf1-2 wired the two down-seek brakes; uf1-8 wired its ten seek rows (the
    // range gates + the PDIST budgets — pinned row-by-row, with consumers, by
    // tests/seek-wiring.test.ts AC-5); uf1-9 wired its eleven cadence rows (the
    // wing latch, the decision intervals, the cliff dwell and the two up-flight
    // VY gates — pinned by tests/cadence-wiring.test.ts). The exact set still
    // forbids overreach: a story that quietly flips an uf1-10 row fails here.
    const UF18_ROWS = [
      'BODNRG', 'BODNDI', 'BOUPRG', 'BOUPDI', 'HUDNRG', 'HUDNDI', 'HUUPRG', 'HUUPDI',
      'SHDNRG', 'SHUPRG',
    ] as const
    const UF19_ROWS = [
      'BOUPWD', 'BOUPWU', 'HUUPWD', 'HUUPWU', 'BOLETM', 'HULETM', 'SHUPTM', 'SHLETM', 'SHCLTM',
      'HUUPVY', 'SHUPVY',
    ] as const
    expect(
      [...wired].sort(),
      "the wired set is uf1-2's two brakes + uf1-8's ten seek rows + uf1-9's eleven cadence " +
        "rows + jt9-1's LAVLAV + jt9-9's two egg waits",
    ).toEqual(
      [...WIRED_NAMES, ...UF18_ROWS, ...UF19_ROWS,
        'LAVLAV',
        // jt9-9 — the settled egg's hatch wait. EGGWT is the wait an egg takes
        // when it LANDS (EGGLND :3224); EGGWT2 the one an EGG WAVE's eggs enter
        // holding (:2761). Both reach `demo.eggWaitFrames`.
        'EGGWT', 'EGGWT2',
      ].sort())
    for (const n of wired) {
      const disp = d.ROW_DISPOSITION[n]
      // A disposition that says "wired" without naming where is how a row goes dead
      // again quietly.
      expect(disp.kind === 'wired' && disp.consumer, `${n} must name its live consumer`).toBeTruthy()
    }
  })

  it('records LAVLAV as WIRED — the "dead in the ROM" reading was a label-keyed miss', async () => {
    const d = await loadDifficulty()
    // This test used to assert `dead-in-rom`, on the reasoning that "LAVLAV's
    // label appears EXACTLY ONCE in JOUSTRV4.SRC — on its own DYWORD line at
    // :7306. Williams shipped a row nothing reads."
    //
    // jt9-1: the LABEL claim is true; the ROW claim is false. A DYWORD's
    // trailing label is a COMMENT. The initialiser reads no names — it walks
    // DYTBL and DYNADJ positionally (:939-950), three RAM bytes per row — so
    // row 3 fills the slot RAMDEF.SRC:391 declares as LNTLAV, which four brains
    // load. The alignment is re-derived from the source, and the row's four
    // read sites enumerated, in tests/glide-prologue-source.test.ts.
    //
    // NO ROW IS DEAD IN THE ROM ANY MORE. The category still exists in the type
    // because it is a real distinction; it simply has no members, and this
    // assertion is what would catch a future story re-inventing one without
    // checking how its consumer addresses the table.
    const disp = d.ROW_DISPOSITION.LAVLAV
    expect(disp.kind, 'LAVLAV is read by LINET, BOUNDR, B2UNDR and SHADOW').toBe('wired')
    expect(
      disp.kind === 'wired' && disp.consumer,
      'and the disposition names the looker that reads it',
    ).toMatch(/looker/i)
    const dead = d.DYTBL_ROW_NAMES.filter((n) => d.ROW_DISPOSITION[n].kind === 'dead-in-rom')
    expect(dead, 'the dead-in-ROM category is now empty').toEqual([])
  })

  it('gives every unwired row a ROM line, a missing mechanic and an owner', async () => {
    const d = await loadDifficulty()
    const pending = d.DYTBL_ROW_NAMES.filter((n) => d.ROW_DISPOSITION[n].kind === 'no-consumer-yet')
    // 28 rows − 26 wired (uf1-2's 2 + uf1-8's 10 + uf1-9's 11 + jt9-1's LAVLAV
    // + jt9-9's EGGWT/EGGWT2) − 0 dead-in-ROM = 2 genuinely waiting on a
    // mechanic: LAVTIM and LAVGRA, both of which need a live lava-troll grab.
    // jt9-1 moved the dead term to zero; jt9-9 took the two egg waits, leaving
    // the troll pair for jt9-11.
    expect(pending.length, 'the tracked remainder').toBe(2)
    expect([...pending].sort(), 'and it is the troll pair, by name').toEqual(['LAVGRA', 'LAVTIM'])
    for (const n of pending) {
      const disp = d.ROW_DISPOSITION[n]
      if (disp.kind !== 'no-consumer-yet') throw new Error('unreachable')
      // "Not wired" is only acceptable as a FACT with an address. Empty strings are
      // the shrug this AC exists to forbid.
      expect(disp.rom, `${n} must cite the ROM line that reads it`).toMatch(/JOUSTRV4\.SRC:\d+/)
      expect(disp.missing.length, `${n} must name the mechanic the clone lacks`).toBeGreaterThan(0)
      expect(disp.owner, `${n} must name the story that will wire it`).toMatch(/\S/)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Project rules — the lang-review checklist applied to the modules this story
// changes. These are not AC coverage; they are the HOW the ACs must be built.
// ═════════════════════════════════════════════════════════════════════════════
describe('project rules — the core boundary and the type-safety escapes', () => {
  it('keeps every module this story touches inside the pure core', async () => {
    // The single most important rule in the repo. Threading a wave is exactly the
    // kind of change that tempts a module-scope mutable "current wave".
    for (const f of ['difficulty.ts', 'enemy.ts', 'frame.ts', 'demo.ts', 'wave.ts']) {
      expect(violations(readCore(f), f), `${f} must stay inside the core boundary`).toEqual([])
    }
  })

  it('adds no type-safety escape hatches (checklist rule 1)', () => {
    for (const f of ['difficulty.ts', 'enemy.ts', 'frame.ts', 'demo.ts', 'wave.ts']) {
      const text = readCore(f)
      expect(text, `${f} must not cast away the type system`).not.toMatch(/\bas\s+any\b/)
      expect(text, `${f} must not suppress errors without a code`).not.toMatch(/@ts-ignore/)
    }
  })

  it('carries the .js extension on every relative import (checklist rule 5)', () => {
    // ESM/Node16 resolution — a bare './difficulty' resolves under the bundler and
    // explodes nowhere else until it does.
    for (const f of ['difficulty.ts', 'enemy.ts', 'frame.ts', 'demo.ts', 'wave.ts']) {
      for (const m of readCore(f).matchAll(/from\s+'(\.[^']*)'/g)) {
        expect(m[1], `${f}: relative import ${m[1]} needs the .js extension`).toMatch(/\.js$/)
      }
    }
  })

  it('keeps the table and the inventory deeply immutable (checklist rule 2)', async () => {
    const d = await loadDifficulty()
    // The table is shared, module-scope data reached from the sim every frame; a
    // mutable row is a cross-wave contamination waiting to happen.
    expect(Object.isFrozen(d.DIFFICULTY_TABLE), 'DIFFICULTY_TABLE frozen').toBe(true)
    expect(Object.isFrozen(d.ROW_DISPOSITION), 'ROW_DISPOSITION frozen').toBe(true)
    expect(Object.isFrozen(d.dyRow('BODNVY')), 'each row frozen').toBe(true)
    expect(Object.isFrozen(d.dyRow('BODNVY').starts), 'the start columns frozen').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ═══ ROUND 2 — THE UNIT OF THE WAVE ══════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
//
// Round 1 threaded the wave through all four layers and the Reviewer confirmed
// every link load-bearing. It then REJECTED the story, because the VALUE entering
// the chain is the wrong unit: `demo.wave` is the ROM's WAVBCD byte — BCD-PACKED,
// advanced by `nextWaveBcd` (demo.ts:955; "BCD not binary" is already pinned at
// tests/wave.test.ts:155) — and `waveValue` documents its argument as a 1-based
// DECIMAL wave. The two agree for waves 1-9 and diverge forever after.
//
// MEASURED against the tree at 88de71c, through the real `stepDemo`:
//
//   the cabinet's wave │ counter │ brake the brains got │ brake the ROM says
//   ───────────────────┼─────────┼──────────────────────┼───────────────────
//   tenth              │  0x10   │ $0140 (wave 16)      │ $0120
//   seventeenth        │  0x17   │ $0240 (wave 23)      │ $0220
//   hundredth          │  0x00   │ **THROWS**           │ $0280
//
// So round 1 shipped something WORSE than the frozen constant it replaced: the
// old `0x100` was honestly stale, this is confidently wrong — and at the
// hundredth wave the counter rolls to 0x00, `waveValue` rejects a wave < 1, and
// the running game CRASHES on the first smart-enemy decision. (Verified: a lone
// `boundr` process at counter 0x00 makes `stepDemo` throw "wave must be a 1-based
// integer, got 0". That crash did not exist before this story's seam.)
//
// ─── WHY ROUND 1's SUITE MISSED IT ───────────────────────────────────────────
// Nothing drove the PRODUCTION path past wave 3. Waves 11/18/33/500/100,000 were
// exercised only by direct `waveValue(name, N)` calls with hand-written DECIMAL
// literals, which bypass the counter entirely — so every high-wave assertion was
// testing the engine, which already worked, and none was testing the seam. The
// e2e test stopped at wave 3, one wave short of the boundary. Every test below
// therefore reaches the dial THROUGH `stepDemo` and through the counter's own
// advance, never through a literal.
//
// ─── SCOPE — WHAT IS *NOT* HERE ──────────────────────────────────────────────
// The same confusion PREDATES uf1-2 at demo.ts:959-968, where the raw counter also
// reaches `waveRowAt` / `applyWaveDestruction` / `spawnWaveEnemies` /
// `trollSpawnable` / `seedWaveBudget` (and game.ts:347). That is **td1-12**, filed,
// p1, and deliberately untouched here: every probe below is staged so the wave
// never ADVANCES (a wave clears only with a player present — demo.ts:950-953 —
// and no probe stages one), so those consumers never run and this suite cannot
// accidentally demand td1-12's fix.
// ═════════════════════════════════════════════════════════════════════════════

const PROBE_ID = 0x7e57

/** A `boundr`/`b2undr` process already smart (pchase 1), woken on the first frame. */
const enemyProcess = (enemy: EnemyState): DemoProcess => ({
  id: PROBE_ID,
  cls: 'secondary',
  nap: 1,
  period: 1,
  kind: 'enemy',
  enemyType: 'bounder',
  collisionEnabled: true,
  enemy,
})

/**
 * A demo holding one falling buzzard and the wave's knights PARKED ON THE
 * BOTTOM ISLAND, at a chosen counter value.
 *
 * Round 3 staged these probes with NO player at all — jt8-1's reconcile left
 * the aggro slots empty, `selectTarget` answered null, and the brake decided by
 * fall-through. uf1-8 retires that fall-through: `JSR SELPLY / BEQ BOLEVV`
 * (:3796-3797) routes a NO-TARGET buzzard to BOLEV, which never consults the
 * wired dial, so an empty world now measures the level seek instead of the
 * brake.
 *
 * AND a single-step probe IS a no-target probe, parked knights or none: the
 * demo registers players into the aggro slots only at the END of its first
 * step, with their TARTIM grace armed (`reconcileTargets`, demo.ts) — so the
 * probe's one wake reads `selectTarget` = null whatever sits on the island.
 * The regime where the dial legitimately decides in ONE wake is therefore a
 * COMMITTED DOWN EPISODE (`enemy.seek`): `BODN1` never re-runs SELPLY and runs
 * the brake law on every committed wake (:3811-3820), target or none — that is
 * uf1-8's headline mechanic, and it is wave-scaled through the same seam. The
 * probes below arm the wave's own BODNDI/HUDNDI budget, unspent; the knights
 * stay parked below for the 240-frame runs, where the grace expires and the
 * live decide takes over.
 *
 * The probe carries `homing: { prdir: $FF }` so the jt8-2 throttle cannot flip
 * its facing whatever velocity index its target reads once one exists —
 * $FF − 1 = $FE keeps BMI looping (:3942-3943), the flip needs 128 more matched
 * wakes than any probe gets, and the entity comparison stays about the BRAKE.
 * One `stepDemo` on this state reproduces `stepEnemy(probe, { player:
 * FAR_BELOW, wave })` on the entity — the committed episode runs the same
 * brake law both sides — so the assertions below compare against the engine
 * directly instead of against a hand-copied expectation.
 */
const demoAtCounter = (
  demo: Awaited<ReturnType<typeof loadDemo>>,
  counter: number,
  enemy: EnemyState,
): DemoState => {
  const base = knightsBelowTheBuzzards(demo.createWaveDemo(0x1234))
  return {
    ...base,
    wave: counter,
    sim: {
      ...base.sim,
      processes: [...base.sim.processes.filter((p) => p.kind === 'player'), enemyProcess(enemy)],
    },
    events: [],
  }
}

/** The counter value the demo's OWN advance holds on its Nth wave. Never a literal. */
const counterAtWave = (w: Pick<Awaited<ReturnType<typeof loadWaveBcd>>, 'nextWaveBcd'>, n: number): number => {
  let c = 1 // createWaveDemo seeds wave 1 (demo.ts:598)
  for (let i = 2; i <= n; i++) c = w.nextWaveBcd(c)
  return c
}

/** The enemy as one `stepDemo` leaves it. Throws rather than returning undefined. */
const steppedProbe = (d: DemoState, demo: Awaited<ReturnType<typeof loadDemo>>): EnemyState => {
  const p = demo.stepDemo(d).sim.processes.find((q) => q.id === PROBE_ID)
  if (!p?.enemy) throw new Error('the probe buzzard vanished — the staging is wrong, not the code')
  return p.enemy
}

describe('R2-1 — the wave the brains read is the wave the CABINET is on', () => {
  it('resolves the TENTH wave at wave 10, not at its BCD byte 16', async () => {
    const demo = await loadDemo()
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const w = await loadWaveBcd()

    // Premise, asserted not assumed: the counter really is packed, and really does
    // read 0x10 (= 16 as a plain number) on the tenth wave. If td1-12 later makes
    // `demo.wave` decimal, THIS fails first and says the staging must be revisited.
    const counter = counterAtWave(w, 10)
    expect(counter, 'the demo counter on its tenth wave (BCD, demo.ts:955)').toBe(0x10)

    // Discriminability: the probe can only tell 10 from 16 if the rungs differ.
    // BODNVY steps at waves 3, 11, 19… so wave 10 is still on $0120 and wave 16 is
    // on $0140. If a future table edit collapses those, this fails loudly instead
    // of the test going quietly vacuous.
    const rung10 = d.waveValue('BODNVY', 10)
    const rung16 = d.waveValue('BODNVY', 16)
    expect(rung10, 'wave 10 sits on the second rung').toBe(WIRED.BODNVY.wave3)
    expect(rung16, 'wave 16 sits on the third').toBe(WIRED.BODNVY.wave11)
    expect(rung10, 'the two readings must differ or this test proves nothing').not.toBe(rung16)

    // The probe falls at $0130 — strictly BETWEEN the two brakes. Under the correct
    // reading it is over the brake and the buzzard checks itself; under the BCD
    // misreading it is under the brake and the buzzard keeps diving. One input, two
    // opposite outcomes: no implementation can satisfy both halves by accident.
    // uf1-8: committed mid-episode (the wave's own budget, unspent) so the ONE
    // demo wake runs the brake law — a bare probe's wake is a null-target BOLEV
    // wake (see demoAtCounter), which flaps at EVERY wave and could not tell
    // 10 from 16 at all.
    const probe: EnemyState = {
      ...fallingEnemy('boundr', 0x130),
      homing: { prdir: 0xff },
      seek: { mode: 'down', pdist: d.waveValue('BODNDI', 10) },
    }
    expect(probe.entity.velY, 'the probe must sit between the rungs').toBeGreaterThanOrEqual(rung10)
    expect(probe.entity.velY, 'the probe must sit between the rungs').toBeLessThan(rung16)

    const viaDemo = steppedProbe(demoAtCounter(demo, counter, probe), demo)
    const asWave10 = e.stepEnemy(probe, { player: FAR_BELOW, wave: 10 })
    const asWave16 = e.stepEnemy(probe, { player: FAR_BELOW, wave: 16 })

    // Liveness: the reference readings genuinely differ, and the buzzard flew.
    expect(asWave10.entity.velY, 'wave 10 BRAKES the fall').toBeLessThan(probe.entity.velY)
    expect(asWave16.entity.velY, 'wave 16 lets it keep diving').toBeGreaterThan(probe.entity.velY)

    expect(viaDemo.entity, 'the cabinet on its tenth wave must fly wave 10').toEqual(asWave10.entity)
    expect(viaDemo.entity, 'and must NOT fly the counter byte read as decimal 16').not.toEqual(
      asWave16.entity,
    )
  })

  it('resolves the TWELFTH wave at wave 12 for the HUNTER too — the seam, not a BODNVY patch', async () => {
    const demo = await loadDemo()
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const w = await loadWaveBcd()

    // A second row, a second wave — and deliberately the ONE wave in the counter's
    // whole 10..99 range where the BOUNDER is blind to the misreading and the HUNTER
    // is not. BODNVY reads $0140 at both 12 and 18 (its rungs run 11-18); HUDNVY
    // steps at 18, so it reads $0220 against $0240. A fix special-cased to BODNVY,
    // or to the literal tenth wave, passes the test above and dies here. (Searched
    // exhaustively over waves 10-99: wave 12 is the only such wave.)
    const counter = counterAtWave(w, 12)
    expect(counter, 'the counter on the twelfth wave').toBe(0x12)
    expect(d.waveValue('BODNVY', 12), 'the bounder is deliberately blind here').toBe(
      d.waveValue('BODNVY', 18),
    )
    const rung12 = d.waveValue('HUDNVY', 12)
    const rung18 = d.waveValue('HUDNVY', 18)
    expect(rung12).not.toBe(rung18)

    // Committed mid-episode for the same reason as the tenth-wave probe — the
    // hunter's OWN budget, so the twins stay apart on the workspace too.
    const probe: EnemyState = {
      ...fallingEnemy('b2undr', 0x230),
      homing: { prdir: 0xff },
      seek: { mode: 'down', pdist: d.waveValue('HUDNDI', 12) },
    }
    expect(probe.entity.velY).toBeGreaterThanOrEqual(rung12)
    expect(probe.entity.velY).toBeLessThan(rung18)

    const viaDemo = steppedProbe(demoAtCounter(demo, counter, probe), demo)
    expect(viaDemo.entity, 'the hunter on the twelfth wave flies wave 12').toEqual(
      e.stepEnemy(probe, { player: FAR_BELOW, wave: 12 }).entity,
    )
    expect(viaDemo.entity, 'not wave 18 — the counter byte 0x12 read as decimal').not.toEqual(
      e.stepEnemy(probe, { player: FAR_BELOW, wave: 18 }).entity,
    )
  })

  it('brakes at THAT wave rung on every wave 1..24 — driven through the counter, never a literal', async () => {
    const demo = await loadDemo()
    const d = await loadDifficulty()
    const w = await loadWaveBcd()

    // The sweep the round-1 suite lacked. For each wave the cabinet can be on, park
    // a buzzard EXACTLY on that wave's brake (must check itself — the SUBD/BMI is
    // `>=`) and one unit under it (must not). A decode that is right for 1-9 and
    // wrong from 10 fails 15 of the 24; a decode that is right only at 10 fails the
    // rest. Waves 1-9 are the control: they must stay green, since BCD and decimal
    // agree there and jt2's replays live in that region.
    const wrong: string[] = []
    for (let wave = 1; wave <= 24; wave++) {
      const counter = counterAtWave(w, wave)
      const brake = d.waveValue('BODNVY', wave)

      // uf1-8: each probe rides a committed down episode (the wave's own armed
      // budget, unspent) — the one regime in which a single null-target wake
      // runs the brake law at all (see demoAtCounter). The spend this wake is
      // the entry velY, thousands short of exhausting the budget.
      const committed = (velY: number): EnemyState => ({
        ...fallingEnemy('boundr', velY),
        seek: { mode: 'down', pdist: d.waveValue('BODNDI', wave) },
      })
      const at = steppedProbe(demoAtCounter(demo, counter, committed(brake)), demo)
      const under = steppedProbe(demoAtCounter(demo, counter, committed(brake - 1)), demo)

      // "Braked" is not a flag we can read from the entity — it is the SIGN of what
      // the frame did to the fall. A flap subtracts; gravity adds.
      if (!(at.entity.velY < brake)) wrong.push(`wave ${wave} (counter 0x${counter.toString(16)}): at $${brake.toString(16)} it did NOT brake`)
      if (!(under.entity.velY > brake - 1)) wrong.push(`wave ${wave} (counter 0x${counter.toString(16)}): one under $${brake.toString(16)} it braked anyway`)
    }
    expect(wrong, 'every wave must brake at its OWN rung').toEqual([])
  })

  it('plays its TENTH wave exactly as its third, and not as its eleventh — the whole cabinet, 240 frames', async () => {
    const demo = await loadDemo()
    const d = await loadDifficulty()
    const w = await loadWaveBcd()

    // The full-ecosystem counterpart of the staged probes: the real wave-1
    // complement, the real spawn geometry, the real collision pass, the real aggro
    // state, driven 240 frames — with the knights parked on the bottom island so the
    // brake stays the deciding branch (see `knightsBelowTheBuzzards`). The invariant
    // is ROM-derived, not observational — waves 3 and 10 sit on the SAME rung of BOTH
    // wired rows, so a correct cabinet cannot tell them apart, while wave 11 steps
    // BODNVY to $0140 and must diverge.
    for (const name of WIRED_NAMES) {
      expect(d.waveValue(name, 10), `${name}: waves 3 and 10 share a rung`).toBe(d.waveValue(name, 3))
    }
    expect(d.waveValue('BODNVY', 11), 'wave 11 steps off it').not.toBe(d.waveValue('BODNVY', 3))

    // The signature is the WHOLE trajectory, not the end state: measured, two runs
    // that differ mid-flight can reconverge by frame 240, so comparing final
    // positions alone would have been vacuously green on the broken code. The run
    // also reports how many of those frames had the BRAKE deciding — the same guard
    // AC-1 uses, carried here so this probe cannot go vacuous either.
    const trajectory = (counter: number): { signature: string; deciding: number } => {
      let s: DemoState = { ...knightsBelowTheBuzzards(demo.createWaveDemo(0x1234)), wave: counter }
      const frames: string[] = []
      let deciding = 0
      for (let i = 0; i < 240; i++) {
        s = demo.stepDemo(s)
        deciding += brakeDecidingFrames(s)
        frames.push(
          JSON.stringify(
            s.sim.processes
              .filter((p) => p.kind === 'enemy')
              .map((p) => [p.id, p.enemy?.entity.posY, p.enemy?.entity.velY]),
          ),
        )
      }
      return { signature: frames.join('|'), deciding }
    }

    const third = trajectory(counterAtWave(w, 3))
    const tenth = trajectory(counterAtWave(w, 10))
    const eleventh = trajectory(counterAtWave(w, 11))
    const first = trajectory(counterAtWave(w, 1))
    // uf1-9 re-based the SAME-RUNG partner and changed no expectation's meaning.
    // When this was written the only live dials were the two brakes, which plateau
    // by wave 3, so wave 3 and wave 10 were on one rung and the equality below
    // read `tenth === third`. uf1-9 makes eleven more rows live and several are
    // still WALKING at wave 3 (BOUPWU 7→6 at wave 7, BOLETM 20→19), so waves 3 and
    // 10 are genuinely different rungs now and that equality would assert a
    // falsehood. Wave 9 is wave 10's same-rung partner across every live row, so
    // the misread this guards — wave 10 looked up as the byte 0x10, i.e. 16 —
    // still diverges and is still caught.
    const ninth = trajectory(counterAtWave(w, 9))
    const sixteenth = trajectory(counterAtWave(w, 16))

    // Discriminability BEFORE the comparisons: every run must actually reach the
    // brake window with a live knight at or below the buzzard. Without this, a
    // future change that (say) lets the knights die early would leave four runs that
    // agree because nothing consults the dial — and `tenth === third` would pass for
    // the wrong reason.
    for (const [label, run] of [
      ['wave 1', first],
      ['wave 3', third],
      ['wave 10', tenth],
      ['wave 11', eleventh],
    ] as const) {
      expect(
        run.deciding,
        `${label}: the run must reach the brake window with a live knight at or below ` +
          'the buzzard, or the dial is not what these trajectories differ on',
      ).toBeGreaterThan(0)
    }

    // Liveness in both directions: wave 1 differs from wave 3 (the dial is live at
    // all — this is the round-1 guard restated), and wave 11 differs from wave 3
    // (the run really can tell rungs apart over 240 frames).
    expect(first.signature, 'the seam must still be LIVE — wave 1 differs from wave 3').not.toBe(
      third.signature,
    )
    expect(
      eleventh.signature,
      'wave 11 must diverge, or the probe cannot resolve a rung step',
    ).not.toBe(third.signature)

    expect(
      tenth.signature,
      "the cabinet's tenth wave plays its own rung — identical to wave 9, its same-rung partner",
    ).toBe(ninth.signature)
    // …and the misread itself, asserted directly rather than implied: a wave 10
    // resolved as the byte 0x10 would play wave SIXTEEN's rung.
    expect(
      tenth.signature,
      'wave 10 must NOT play wave 16 — that is the 0x10-read-as-16 misread',
    ).not.toBe(sixteenth.signature)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// R2-2 — the decode is a NAMED, GUARDED seam carrying its unit, not an inline
//        expression. `waveValue`'s existing guard rejects `wave < 1`, which cannot
//        happen, and waves a BCD byte straight through, which does — so the guard
//        that matters has to live where the unit changes.
// ═════════════════════════════════════════════════════════════════════════════
describe('R2-2 — the BCD→decimal decode seam', () => {
  it('inverts the counter exactly, for all 99 waves the byte can express', async () => {
    const w = await loadWaveBcd()
    // Double entry: the decode is checked against the ADVANCE, not against a second
    // copy of the same arithmetic. Walking the counter forward and decoding it back
    // must return the ordinal we walked to, for every wave in the cycle.
    let counter = 1
    for (let wave = 1; wave <= 99; wave++) {
      expect(w.decimalWaveFromBcd(counter), `wave ${wave} (counter 0x${counter.toString(16)})`).toBe(wave)
      counter = w.nextWaveBcd(counter)
    }
    // Spot the two that matter, by literal, so a reader sees the defect in one line.
    expect(w.decimalWaveFromBcd(0x10), 'the tenth wave is 10, not 16').toBe(10)
    expect(w.decimalWaveFromBcd(0x20), 'the twentieth is 20, not 32').toBe(20)
    expect(w.decimalWaveFromBcd(0x99)).toBe(99)
  })

  it('REJECTS a byte that is not BCD — the guard aimed at the failure that happens', async () => {
    const w = await loadWaveBcd()
    // A DECIMAL wave arriving where the packed counter belongs is exactly the
    // mistake round 1 made. $0A..$0F and any high nibble > 9 are unreachable from
    // `nextWaveBcd`, so their arrival means a caller has confused the units — and
    // silently answering (0x0A → 10) would hide it forever.
    for (const bad of [0x0a, 0x0f, 0x1a, 0xa0, 0xff, 0x9f]) {
      expect(() => w.decimalWaveFromBcd(bad), `0x${bad.toString(16)} is not BCD`).toThrow()
    }
    // -16 and -160 are the shapes the NIBBLE check cannot see: `-16 >> 4` is -1 and
    // `-16 & 0x0f` is 0, so neither nibble reads as > 9 and the decode would answer
    // -10. -1 does not test this — its low nibble is 15, so the BCD check catches it
    // and the negative clause never fires. (Found by Dev's mutation battery: dropping
    // the `counter < 0` clause survived the original list.)
    for (const bad of [-1, -16, -160, 1.5, Number.NaN, 0x100]) {
      expect(() => w.decimalWaveFromBcd(bad), `${bad} is not a counter byte`).toThrow()
    }
    // …and every value the advance CAN produce must be accepted, or the guard is
    // rejecting the legitimate case (round 1's mistake, mirrored).
    let c = 0x00
    for (let i = 0; i < 100; i++) {
      expect(() => w.decimalWaveFromBcd(c), `0x${c.toString(16)} is reachable`).not.toThrow()
      c = w.nextWaveBcd(c)
    }
  })

  it('leaves the BCD ARITHMETIC alone — nextWaveBcd still rolls 0x99 → 0x00', async () => {
    const w = await loadWaveBcd()
    // A keep-behavior guard on the increment's contract, NOT a mutant-killer.
    //
    // RED claimed folding `decimalWaveFromBcd` into `nextWaveBcd` would turn
    // 0x99 → 0x01. It would not, and Dev's mutation battery proved it: that
    // refactor is an EQUIVALENT MUTANT. 0x99 decodes to 99, so the roll still
    // lands on 0x00; and the rollover mapping is absorbed by the `% 100` —
    // 0x00 → 100 → 101 % 100 → 1, exactly what 0 → 1 gives. Identical across all
    // 100 reachable counter values, verified exhaustively.
    //
    // The two functions are still kept apart on purpose — `decimalWaveFromBcd`
    // throws on a non-BCD byte, which the increment has no business doing — but
    // the reason is separation of concerns, not a lurking off-by-one. Nothing here
    // can fail; wave.test.ts owns the real coverage of this contract.
    expect(w.nextWaveBcd(0x99), 'the counter still wraps to 0x00').toBe(0x00)
    expect(w.nextWaveBcd(0x09), 'and still decimal-adjusts').toBe(0x10)
  })

  it('says at the seam that the counter it feeds the difficulty engine is BCD', async () => {
    // The Reviewer required this in prose, and prose is the only defence a future
    // reader gets: `demo.wave` looks like an ordinary number at every call site.
    const demoSrc = readCore('demo.ts')
    expect(demoSrc, 'demo.ts must name the encoding it is decoding').toMatch(/BCD/)
    expect(demoSrc, 'and must point at the story that owns the other consumers').toMatch(/td1-12/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// R2-3 — THE ROLLOVER. Found in round-2 RED, not reported by the Reviewer.
//        `nextWaveBcd` wraps 0x99 → 0x00 (pinned, wave.test.ts), and `waveValue`
//        throws for a wave < 1 (pinned, AC-3 above). Round 1 joined those two
//        facts: on the HUNDREDTH wave the first smart-enemy decision throws and
//        the running game dies. That crash is this story's, and it did not exist
//        before the seam — so it is fixed here, not deferred.
//
//        The counter cannot express "which hundred", so the ordinal is genuinely
//        unrecoverable above 100 — a monotone wave count is td1-12's job (its
//        option B). uf1-2 owes the hundredth wave a correct answer and every wave
//        a NON-FATAL one. It does NOT owe — and cannot deliver — a correct wave
//        101: there the counter reads 0x01 again and the difficulty RESETS to its
//        opening value and re-climbs, once per hundred waves. That is pinned
//        below as a known divergence rather than left implied-absent.
// ═════════════════════════════════════════════════════════════════════════════
describe('R2-3 — the counter rolls over and the cabinet must not die', () => {
  it('reads the rolled 0x00 as the HUNDREDTH wave, not as wave zero', async () => {
    const w = await loadWaveBcd()
    expect(counterAtWave(w, 100), 'the counter on the hundredth wave').toBe(0x00)
    expect(w.decimalWaveFromBcd(0x00), 'which is the hundredth wave played').toBe(100)
  })

  it('does not THROW at the hundredth wave — the crash round 1 introduced', async () => {
    const demo = await loadDemo()
    const e = await loadEnemy()
    const w = await loadWaveBcd()
    const counter = counterAtWave(w, 100)
    const probe = fallingEnemy('boundr', 0x130)

    // Before the fix this is not an assertion failure — `stepDemo` throws
    // "wave must be a 1-based integer, got 0" out of `waveValue`, through
    // `brakeForWave` → `boundr` → `runBrain`. A dumb `linet` enemy never consults
    // the brake, which is why the crash needs a SMART one to surface.
    const viaDemo = steppedProbe(demoAtCounter(demo, counter, probe), demo)
    expect(viaDemo.entity, 'the hundredth wave flies wave 100').toEqual(
      e.stepEnemy(probe, { wave: 100 }).entity,
    )
  })

  it('carries the difficulty THROUGH the rollover — the hundredth wave does not fall back', async () => {
    const d = await loadDifficulty()
    const w = await loadWaveBcd()
    // Scope: waves 99 → 100, and NOTHING beyond. This kills the cheap non-crashing
    // fix — clamping the decoded wave up to 1 — which would drop a hundred-wave
    // cabinet to its opening difficulty one wave early. It does NOT establish that
    // the difficulty never falls back; it demonstrably does at wave 101, which the
    // next test pins. An earlier draft of this test was named for the general
    // property and asserted only this pair, which is how the reset stayed invisible
    // through a whole review round.
    const at99 = d.waveValue('BODNVY', w.decimalWaveFromBcd(counterAtWave(w, 99)))
    const at100 = d.waveValue('BODNVY', w.decimalWaveFromBcd(counterAtWave(w, 100)))
    expect(at99, 'the ninety-ninth wave is well past the start').toBeGreaterThan(WIRED.BODNVY.start)
    expect(at100, 'and the hundredth does not fall back below it').toBeGreaterThanOrEqual(at99)
  })

  it('PINS the known divergence: from the 101st wave the difficulty resets and re-climbs', async () => {
    const d = await loadDifficulty()
    const w = await loadWaveBcd()

    // ─── THIS TEST ASSERTS WRONG BEHAVIOUR ON PURPOSE ──────────────────────────
    // The counter is two BCD digits, so wave 101 and wave 1 both read `01`. The
    // ordinal is not recoverable from the byte, and no fix confined to uf1-2 can
    // make it so — the story stops the CRASH and gets wave 100 exactly right, and
    // that is the whole of what it can do.
    //
    // The ROM has no such problem, and I checked rather than assumed: WAVBCD has
    // exactly four references in JOUSTRV4.SRC, and its ONLY read is the display
    // routine (`LDA WAVBCD / BITA #$F0 / BNE / ORA #$F0 / JMP OUTBCD`, :2399-2403,
    // inside WAVEN3 "PUT UP WAVE NUMBER"). It indexes nothing. The wave TABLE walks
    // on a separate pointer (`LDX PWAVE,U / LEAX WLEN,X / CMPX #WTBEND /
    // LDX #WTBRST`, :2011-2019) and the DYTBL difficulty on a per-row RAM countdown
    // run from IWAVE at each wave end (:945 seeds it to 2, :2099 fires it). Both are
    // monotone. The 1982 cabinet's difficulty NEVER resets.
    //
    // So this is a divergence, it is ours, and it is pinned rather than left to be
    // discovered — the ROW_DISPOSITION discipline applied to behaviour. **td1-12
    // owns the fix** (a monotone wave count in DemoState, its option B). When it
    // lands, this test SHOULD fail. Delete it then; do not "repair" it.
    const rung = (wave: number): number =>
      d.waveValue('BODNVY', w.decimalWaveFromBcd(counterAtWave(w, wave)))

    expect(rung(100), 'wave 100 is the last correct wave').toBe(d.waveValue('BODNVY', 100))
    expect(rung(101), 'wave 101 reads the counter 0x01 and resets to the OPENING value').toBe(
      WIRED.BODNVY.start,
    )
    // The size of the regression, stated so nobody has to compute it: the deepest
    // wave the cabinet can reach drops back to what wave 1 hands a fresh player.
    expect(rung(100) - rung(101), 'the cliff is the whole hundred-wave climb').toBe(
      d.waveValue('BODNVY', 100) - WIRED.BODNVY.start,
    )
    // And it re-climbs from there on the same curve, once per hundred waves.
    expect(rung(103), 'the walk restarts, it does not stay flat').toBe(WIRED.BODNVY.wave3)
    expect(rung(111)).toBe(WIRED.BODNVY.wave11)
  })

  it('never THROWS at any wave the counter can reach — the crash is closed everywhere', async () => {
    const demo = await loadDemo()
    const w = await loadWaveBcd()
    // The single-wave test above proves the hundredth wave specifically. This proves
    // the PROPERTY: every one of the 100 values the counter cycles through, driven
    // over two full rollovers, with a SMART enemy staged so the brake is actually
    // consulted (a dumb `linet` never reads it and would hide the crash).
    const threw: string[] = []
    for (let wave = 1; wave <= 200; wave++) {
      const counter = counterAtWave(w, wave)
      try {
        steppedProbe(demoAtCounter(demo, counter, fallingEnemy('boundr', 0x130)), demo)
      } catch (err) {
        threw.push(`wave ${wave} (counter 0x${counter.toString(16)}): ${(err as Error).message}`)
      }
    }
    expect(threw, 'no reachable counter value may kill a frame').toEqual([])
  })
})
