// tests/core/tie-hit-status.test.ts
//
// Story uf1-3 — RED (Mr. Praline / TEA): C_AH, the last permanently-false bit in
// the TIE choreography status word, wired to the hit resolver.
//
// -- WHAT THE STORY SAID, AND WHAT THE ROM SAYS -------------------------------
//
// The story (and tie-status.ts's own TODO) frames C_AH as "a NEARBY alien has
// been hit", so that SQUADMATES react to a kill beside them. That framing comes
// from the bit's equate comment:
//
//   WSCPU.MAC:27   C$AH ==1   ;NEARBY ALIEN HAS BEEN HIT
//
// The cabinet does not implement that sentence. The ENTIRE 1983 source tree
// contains exactly ONE `CHSET C$AH`, and it is a SELF-damage flag:
//
//   WSCPU.MAC:344  CPHTSA::           ;SPACE LAZAR HIT ALIEN SHIP
//   WSCPU.MAC:345      LDX CL.AP      ;X-->ALIEN PARMS      <- the alien that was HIT
//   ...
//   WSCPU.MAC:355      LDD A$CHST(X)
//   WSCPU.MAC:357      CHSET C$AH     ;STATUS: THIS ALIEN DAMAGED
//   WSCPU.MAC:358      STD A$CHST(X)  <- written back to THAT SAME alien
//
// No loop over other aliens. No distance test. Anywhere. The equate's "NEARBY"
// is abandoned design language, and its sibling bit says so out loud — C$AD is
// annotated `/PLEASE DELETE/` in two files and has ZERO setters in the tree:
//
//   WSCPU.MAC:28   C$AD ==2   ;/PLEASE DELETE/NEARBY ALIEN HAS DIED
//
// So this suite pins the ROM, not the equate's English. The story's AC-2 asked
// for exactly this ("the absence of one in WSCPU.MAC is recorded as a logged
// deviation") and the session file carries the deviation record.
//
// -- WHY THIS IS OBSERVABLE AT ALL, AND ONLY ON DARTH -------------------------
//
// The ROM's design is self-consistent once you follow it through:
//
//   1. CPHTSA sets C$AH on the alien it just hit — BEFORE the lethality check
//      (`DEC A$HTA(X) / LBLE XPSA`).
//   2. A plain TIE dies on that hit, so it never lives to test the bit.
//   3. Darth is the ONE alien deliberately kept alive: `LDA #05 / STA A$HTA(X)
//      ;KEEP DARTH ALIVE` (WSCPU.MAC:367-368) — already ported as the immortal
//      'darth' kind (sim.ts, sw7-13).
//   4. Darth is seated with choreography 1D3 — `TRTH1D`'s third entry is the RTH
//      shape (tie-waves.ts:60, WSCPU.MAC:1273-1276).
//   5. TCH1D3 holds the ONLY `.CUNTIL C$AH` in the ROM (WSCPU.MAC:1590).
//
// C_AH is therefore Darth's "I've been shot" reaction: he runs an 8-record
// jinking weave, and a laser hit CUTS IT SHORT and drops him into the
// `.CUNTIL C$AS` attack arm. Shoot Vader mid-weave and he breaks off and comes
// at you. That is the behaviour this bit has been silently withholding.
//
// -- THE THREADING CONTRACT ---------------------------------------------------
//
// Mirrors C_AG exactly, per AC-1 ("threaded the same way C_AG threads firedGun,
// not read from mutable module state"):
//
//   * a new OPTIONAL per-frame field on `Enemy` — `damaged?: boolean`, named for
//     the ROM's own `;STATUS: THIS ALIEN DAMAGED`;
//   * the hit resolver sets it on the fighter it processed a hit for;
//   * `computeStatus` merely REPORTS it into the status word;
//   * the decision tick CLEARS it after reading, exactly as the ROM's per-frame
//     A$CHST rebuild does (WSCPU.MAC:532-536 keeps only C$PV + fresh random
//     bits, so a low-byte bit like C$AH cannot survive a frame).
//
// Ordering note for whoever implements it: within `stepGame` the decision tick
// runs BEFORE hit resolution, so a hit landed on step N is observed by the VM on
// step N+1 — which is precisely the cabinet's order (CPHTSA sets it; the next
// CPUAL's CHOPDO tests it, then the rebuild clears it).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeStatus } from '../../src/core/tie-status'
import { Status, initVm, tickChoreo, program, TCH1 } from '../../src/core/tie-vm'
import { choreoPc } from '../../src/core/tie-waves'
import { stepGame } from '../../src/core/sim'
import {
  initialState,
  TICK_HZ,
  VADER_SCORE,
  TIE_SCORE,
  DARTH_GLOW_SECONDS,
  type GameState,
  type Enemy,
} from '../../src/core/state'
import type { Input } from '../../src/core/input'
import { makeSpaceState, makeTie, rngSeed } from './helpers/space'
import { perspective, transform, IDENTITY, type Vec3 } from '@shared/math3d'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sourceDir = process.env.STARWARS_SOURCE_DIR ?? '/Users/slabgorb/Projects/star-wars-1983-source-text'
const sourceAvailable = existsSync(sourceDir)

const DT = 1 / 60
/** Slightly MORE than one decision-tick period, so a step is guaranteed to tick
 *  the VM at least once. TICK_HZ is ~20.5 Hz, so a single 1/60 s step ticks only
 *  ~1 frame in 3 — a test that stepped once and expected a tick would be a coin
 *  flip. The 1.05 is float headroom: at exactly `1 / TICK_HZ` the accumulator
 *  comparison sits on the equality boundary. */
const TICK_DT = 1.05 / TICK_HZ

// --- fixtures ---------------------------------------------------------------

const FOV_Y = Math.PI / 3
/** The yoke deflection that puts the crosshair ON a world point — the same
 *  inversion `combat-kill-loop.test.ts` uses, so "aim at it" is literal. */
const aimAt = (pos: Vec3): { aimX: number; aimY: number } => {
  const ndc = transform(perspective(FOV_Y, 16 / 9, 1, 5000), pos)
  return { aimX: ndc[0], aimY: ndc[1] }
}

/** A lone-fighter wave with spawns and enemy fire suppressed, so the only thing
 *  that can change the enemy list or the score is the player's own fire. */
const loneWave = (enemy: Enemy, over: Partial<GameState> = {}): GameState => ({
  ...initialState(1983),
  enemies: [enemy],
  spawnTimer: 999,
  enemyFireCooldown: 999,
  ...over,
})

/** Darth holding station at `pos`. Immortal to player fire (sw7-13), so he is
 *  the only fighter that survives a hit to observe his own C_AH. */
const darthStill = (pos: Vec3): Enemy => ({ pos, kind: 'darth', orient: IDENTITY })

/**
 * Hold the trigger until Darth's hit is actually PROCESSED — the ROM scores
 * SCRDARTH on exactly the frame CPHTSA runs, so the score edge IS the "the hit
 * happened" signal — and return that state.
 *
 * THROWS if the beam never lands. Without that, a fixture whose geometry drifted
 * would hand every assertion below an un-hit Darth and they would all pass
 * vacuously by asserting `false`/absent on a fighter that was never shot.
 */
function fireUntilDarthHit(s0: GameState, maxFrames = 240): GameState {
  let s = s0
  for (let i = 0; i < maxFrames; i++) {
    // Re-aim every frame: once Darth has a seated VM he FLIES his weave (the
    // gated records carry MU2/MD2 move bits), so a yoke deflection computed once
    // at entry would slide off him and the helper would throw on a healthy tree.
    const fire: Input = { ...aimAt(s.enemies[0].pos), fire: true }
    s = stepGame(s, fire, DT)
    if (s.score >= VADER_SCORE) return s
  }
  throw new Error(
    'fireUntilDarthHit: the beam never landed on Darth in ' +
      `${maxFrames} frames — the FIXTURE geometry is wrong, not the code under test`,
  )
}

// ---------------------------------------------------------------------------
// AC-1 — computeStatus REPORTS the per-fighter signal (the C_AG mirror)
// ---------------------------------------------------------------------------

describe('uf1-3 AC-1 — computeStatus reports the damage signal into C_AH', () => {
  it('sets C_AH when the fighter took a processed hit this step', () => {
    const e = makeTie({ pos: [0, 0, -9000], damaged: true })
    expect(computeStatus(e, makeSpaceState(), rngSeed(1)) & Status.C_AH).toBe(Status.C_AH)
  })

  it('clears C_AH when the fighter was not hit (the negative case)', () => {
    const e = makeTie({ pos: [0, 0, -9000] })
    expect(computeStatus(e, makeSpaceState(), rngSeed(1)) & Status.C_AH).toBe(0)
  })

  it('reads the flag off the ENTITY, not module state — two fighters in one pass disagree', () => {
    // AC-1 forbids a module-level "somebody got hit" latch. If the signal lived
    // in module scope, both fighters below would report the same bit; threaded
    // through the entity, only the hit one does. This is the test that dies if
    // the implementation reaches for a file-scope variable.
    const state = makeSpaceState()
    const hit = makeTie({ pos: [0, 0, -9000], damaged: true })
    const untouched = makeTie({ pos: [0, 0, -9000] })
    expect(computeStatus(hit, state, rngSeed(7)) & Status.C_AH).toBe(Status.C_AH)
    expect(computeStatus(untouched, state, rngSeed(7)) & Status.C_AH).toBe(0)
  })

  it('does not disturb the other status bits it shares the word with', () => {
    // C_AH is bit 0 of a 14-bit word. A sloppy `status |= 1` on the wrong value,
    // or a flag that accidentally sets the whole low byte, shows up here.
    const state = makeSpaceState()
    const plain = computeStatus(makeTie({ pos: [0, 0, -9000] }), state, rngSeed(3))
    const hit = computeStatus(makeTie({ pos: [0, 0, -9000], damaged: true }), state, rngSeed(3))
    expect(hit & ~Status.C_AH).toBe(plain & ~Status.C_AH)
    expect(hit).toBe(plain | Status.C_AH)
  })
})

// ---------------------------------------------------------------------------
// AC-2 — the ROM rule, pinned against the 1983 source so it cannot be
//        re-litigated by the next sweep
// ---------------------------------------------------------------------------

describe.skipIf(!sourceAvailable)('uf1-3 AC-2 — the ROM sets C$AH on the alien it HIT, with no proximity rule', () => {
  const wscpu = (): string => readFileSync(join(sourceDir, 'WSCPU.MAC'), 'utf8')

  it('has exactly ONE CHSET C$AH in WSCPU.MAC — there is no second, proximity-driven setter', () => {
    const setters = wscpu().split('\n').filter((l) => /^\s*CHSET\s+C\$AH\b/.test(l))
    expect(setters).toHaveLength(1)
    expect(setters[0]).toMatch(/;STATUS: THIS ALIEN DAMAGED/)
  })

  it('writes the bit back to the HIT alien (A$CHST(X), X = CL.AP), not to any neighbour', () => {
    // The window around the CHSET must load and store the SAME alien record that
    // CPHTSA opened with `LDX CL.AP`. If a future reader claims "nearby", this
    // is the line that refutes it.
    const lines = wscpu().split('\n')
    const at = lines.findIndex((l) => /^\s*CHSET\s+C\$AH\b/.test(l))
    expect(at).toBeGreaterThan(-1)
    const window = lines.slice(at - 2, at + 2).join('\n')
    expect(window).toMatch(/LDD\s+A\$CHST\(X\)/)
    expect(window).toMatch(/STD\s+A\$CHST\(X\)/)
    // and the routine it sits in is the laser-hit handler, opened on the hit alien
    const routine = lines.slice(0, at).join('\n')
    expect(routine).toMatch(/CPHTSA::[\s\S]*LDX\s+CL\.AP\s+;X-->ALIEN PARMS/)
  })

  it('never sets the sibling "nearby alien died" bit at all — C$AD is marked /PLEASE DELETE/', () => {
    // The strongest evidence that this bit-pair's English was abandoned: C$AD
    // has an equate, a comment telling you to delete it, and zero setters.
    const src = wscpu()
    expect(src).toMatch(/C\$AD\s+==2\s+;\/PLEASE DELETE\/NEARBY ALIEN HAS DIED/)
    expect(src.split('\n').filter((l) => /^\s*CHSET\s+C\$AD\b/.test(l))).toHaveLength(0)
  })

  it('rebuilds the status word every frame keeping only C$PV — so C$AH cannot latch', () => {
    // The ROM basis for AC-4. CPUAL tests the choreography (JSR CHOPDO) and THEN
    // rebuilds A$CHST: high byte masked down to C$PV, low byte replaced outright
    // by the fresh random bits. C$AH is ==1, in that low byte, so it is gone.
    const src = wscpu()
    expect(src).toMatch(/ANDA\s+#C\$PV\/100\s+;SAVE IF IN VIEW FOR GUNS/)
    expect(src).toMatch(/ANDB\s+#C\$R1\+C\$R2/)
    expect(src).toMatch(/STD\s+A\$CHST\(X\)\s+;PREPARE NEW CHOREG STATUS/)
  })

  it('parks the only .CUNTIL C$AH in TCH1D3 — the script the RTH (Darth) shape is seated with', () => {
    const gates = wscpu().split('\n').filter((l) => /^\s*\.CUNTIL\s+C\$AH\b/.test(l))
    expect(gates).toHaveLength(1)
    // ...and the port seats Darth with that same script, so the arm is reachable in play.
    expect(choreoPc('1D3')).toBe(TCH1[14]) // TCH1D3 is the 15th TCH1 entry (A1..AZ,B1..BZ,C1..CZ,D1,D2,D3)
  })
})

// ---------------------------------------------------------------------------
// AC-3 — the choreography arm gated on C_AH is reachable
// ---------------------------------------------------------------------------

describe('uf1-3 AC-3 — the C_AH arm of TCH1D3 is reachable', () => {
  /** The single C_AH gate in the whole assembled program. */
  const cAhGates = (): number[] =>
    program.reduce<number[]>((acc, instr, i) => {
      if (instr.op === 'until' && instr.mask === Status.C_AH) acc.push(i)
      return acc
    }, [])

  it('the assembled program holds exactly one C_AH gate, inside TCH1D3', () => {
    const gates = cAhGates()
    expect(gates).toHaveLength(1)
    // it sits after TCH1D3's entry and before the next script's (TCH1DZ)
    expect(gates[0]).toBeGreaterThan(TCH1[14])
    expect(gates[0]).toBeLessThan(TCH1[15])
  })

  it('holds the jinking weave while C_AH stays false (the state the game ships today)', () => {
    // Park on the gate, arm it, then run frames with a status that never carries
    // C_AH. The fighter must still be inside the gated weave — untilMask still
    // armed on C_AH — because nothing has interrupted it.
    let vm = initVm(cAhGates()[0])
    vm = tickChoreo(vm, program, 0)
    expect(vm.untilMask).toBe(Status.C_AH) // the gate armed
    for (let i = 0; i < 30; i++) vm = tickChoreo(vm, program, 0)
    expect(vm.untilMask).toBe(Status.C_AH) // ...and never fired
  })

  it('CUTS THE WEAVE SHORT the frame C_AH fires, landing on the C_AS attack arm', () => {
    // This is the branch the permanently-false bit has been pruning. The gate
    // fires, the maneuver is abandoned, and the VM skips forward to the next
    // control record — TCH1D3's `.CUNTIL C$AS` (WSCPU.MAC:1600).
    let vm = initVm(cAhGates()[0])
    vm = tickChoreo(vm, program, 0)
    const stillWeaving = { ...vm }
    vm = tickChoreo(vm, program, Status.C_AH)
    expect(vm.untilMask).toBe(Status.C_AS)
    expect(vm.pc).toBeGreaterThan(stillWeaving.pc) // it moved FORWARD, past the weave
  })

  it('only C_AH opens that arm — an unrelated bit in the status word leaves it weaving', () => {
    // Guards against an implementation that widens the gate (e.g. tests `status
    // !== 0`). C_PN/C_R1/C_R2 are live every frame; if any of them sprang this
    // gate, Darth would jink out of formation constantly.
    let vm = initVm(cAhGates()[0])
    vm = tickChoreo(vm, program, 0)
    vm = tickChoreo(vm, program, Status.C_PN | Status.C_R1 | Status.C_R2 | Status.C_PV)
    expect(vm.untilMask).toBe(Status.C_AH)
  })
})

// ---------------------------------------------------------------------------
// AC-1 + AC-3 end to end — a real laser hit reaches the real VM
// ---------------------------------------------------------------------------

describe('uf1-3 — end to end: shooting Darth drives his choreography', () => {
  it('a processed laser hit on Darth sets his damage signal', () => {
    const s = fireUntilDarthHit(loneWave(darthStill([0, 0, -1200])))
    expect(s.enemies).toHaveLength(1) // KEEP DARTH ALIVE — he survives to react
    expect(s.score).toBe(VADER_SCORE) // the hit was PROCESSED (SCRDARTH ran)
    expect(s.enemies[0].damaged).toBe(true)
  })

  it("the next decision tick feeds it to Darth's VM, which leaves the weave", () => {
    // The whole point of the story: not that a field flips, but that the
    // choreography reacts. Seat Darth ON the gate so the reaction is legible.
    const gate = program.reduce<number>((a, instr, i) => (instr.op === 'until' && instr.mask === Status.C_AH ? i : a), -1)
    const darth: Enemy = { ...darthStill([0, 0, -1200]), vm: initVm(gate) }
    let s = loneWave(darth)
    // arm the gate first, without firing, so the "before" state is mid-weave
    s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
    expect(s.enemies[0].vm?.untilMask).toBe(Status.C_AH)

    s = fireUntilDarthHit(s)
    // consume the signal on the following tick
    s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
    expect(s.enemies[0].vm?.untilMask).toBe(Status.C_AS)
  })

  it('an UNSHOT Darth never leaves the weave — the control that makes the test above mean something', () => {
    const gate = program.reduce<number>((a, instr, i) => (instr.op === 'until' && instr.mask === Status.C_AH ? i : a), -1)
    const darth: Enemy = { ...darthStill([0, 0, -1200]), vm: initVm(gate) }
    let s = loneWave(darth)
    for (let i = 0; i < 12; i++) s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
    expect(s.enemies[0].vm?.untilMask).toBe(Status.C_AH)
    expect(s.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// THE SHIPPED CADENCE (review round 1, M-1)
//
// Every other end-to-end test above consumes the signal with a TICK_DT step, which
// GUARANTEES a decision tick lands immediately. The game does not run that way.
// TICK_HZ is ~20.5 Hz against a 60 Hz render, so roughly TWO OF EVERY THREE steps
// run no decision tick at all — and on those steps `stepGame` rebuilds the enemy
// list three separate times before the flag is ever read: `applyManeuver`, the
// play-cube clamp, and the glow decay.
//
// So C_AH working in the shipped game depends on all three of those rebuilds
// SPREADING the fighter rather than reconstructing it. That is a real invariant with
// no other guard: turn `applyManeuver`'s `return { ...e, orient, pos }` into an
// explicit object literal — an entirely plausible cleanup — and the flag is dropped
// before any tick can read it, C_AH silently stops working, and every other test in
// this repo stays green. These two pin it at the cadence that ships.
// ---------------------------------------------------------------------------

describe('uf1-3 — the signal survives the 60fps no-tick gap', () => {
  const cAhGate = (): number =>
    program.reduce<number>((a, instr, i) => (instr.op === 'until' && instr.mask === Status.C_AH ? i : a), -1)

  it("reaches Darth's VM at real render cadence, not only on a forced tick", () => {
    const darth: Enemy = { ...darthStill([0, 0, -1200]), vm: initVm(cAhGate()) }
    let s = loneWave(darth)
    // arm the gate at 60fps (several steps, since most carry no tick)
    for (let i = 0; i < 6; i++) s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, DT)
    expect(s.enemies[0].vm?.untilMask).toBe(Status.C_AH)

    s = fireUntilDarthHit(s)
    expect(s.enemies[0].damaged).toBe(true)

    // Coast at 60fps ONLY — no TICK_DT anywhere. The flag has to survive the
    // tick-less steps' rebuilds and still be there when a tick finally lands.
    let arm: number | undefined
    for (let i = 0; i < 10; i++) {
      s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, DT)
      arm = s.enemies[0].vm?.untilMask
      if (arm !== Status.C_AH) break
    }
    expect(arm).toBe(Status.C_AS)
  })

  it('survives the tick-less steps, then clears on the first tick — phase PINNED, not guessed', () => {
    // This assertion is derived, not observed. Round 1 of this test asserted the
    // literal profile [true, false, false, false, false], which happened to be true
    // but encoded the tick PHASE incidentally — one extra idle step before the hit
    // flipped it to [false, …], a CORRECT outcome (the tick simply consumed the flag
    // at once) that the test would have called a failure. Loosening it to "clears and
    // never re-asserts" then went too far the other way: with the flag DROPPED
    // entirely, [false, false, …] satisfies that too, so it stopped catching the
    // rebuild regression this whole block exists for.
    //
    // So pin the phase instead of guessing or ignoring it. `frameAcc` is reset to 0
    // immediately after the hit, which makes the tick schedule pure arithmetic:
    //   tickPeriod = 1 / TICK_HZ = 12 / 246.094 ≈ 0.048762 s
    //   after step 1: frameAcc = 1/60 ≈ 0.01667  → no tick, flag must SURVIVE
    //   after step 2: frameAcc = 2/60 ≈ 0.03333  → no tick, flag must SURVIVE
    //   after step 3: frameAcc = 3/60 = 0.05     → TICK, flag read and CLEARED
    // The two surviving steps are what catch a rebuild that drops the field; the
    // clear on step 3 is what catches a latch.
    let s = fireUntilDarthHit(loneWave(darthStill([0, 0, -1200])))
    expect(s.enemies[0].damaged).toBe(true)
    s = { ...s, frameAcc: 0 } // pin the tick phase; the schedule above now holds exactly

    const carried: boolean[] = []
    for (let i = 0; i < 6; i++) {
      s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, DT)
      carried.push(s.enemies[0].damaged ?? false)
    }
    expect(carried).toEqual([true, true, false, false, false, false])
  })
})

// ---------------------------------------------------------------------------
// AC-4 — a per-step event, never a latched flag
// ---------------------------------------------------------------------------

describe('uf1-3 AC-4 — the signal clears on the following step', () => {
  it('is false again after the decision tick that consumed it', () => {
    const hit = fireUntilDarthHit(loneWave(darthStill([0, 0, -1200])))
    expect(hit.enemies[0].damaged).toBe(true)
    const after = stepGame(hit, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
    expect(after.enemies[0].damaged ?? false).toBe(false)
  })

  it('stays clear for the rest of the wave — it does not re-assert itself', () => {
    let s = fireUntilDarthHit(loneWave(darthStill([0, 0, -1200])))
    for (let i = 0; i < 20; i++) {
      s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
      expect(s.enemies[0].damaged ?? false).toBe(false)
    }
  })

  it('clears on a fighter with NO seated VM too — the latch hazard in the C_AG pattern', () => {
    // The C_AG precedent writes back with `return e.vm ? { ...e, vm, firedGun } : e`
    // — a VM-less fixture is passed through UNTOUCHED. Copy that shape for this
    // flag and a hand-built enemy that gets hit keeps `damaged: true` forever,
    // which is exactly the latched-flag AC-4 forbids. Darth without a VM is a
    // legal fixture (helpers/space.ts builds them), so this is reachable.
    const darth: Enemy = darthStill([0, 0, -1200]) // no `vm`
    let s = fireUntilDarthHit(loneWave(darth))
    expect(s.enemies[0].damaged).toBe(true)
    s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
    expect(s.enemies[0].damaged ?? false).toBe(false)
  })

  it('a hit inside the no-double-jeopardy glow window sets NOTHING', () => {
    // CPHTSA returns before it ever reaches the CHSET when the alien is already
    // glowing (`LDA A$GLW(X) / IFNE / 5$: RTS ;LEAVE ALONE FOR A WHILE`). The
    // port already gates SCORING on glow; the new signal must sit behind the
    // same gate, or a held trigger would machine-gun Darth out of his script.
    const darth: Enemy = { ...darthStill([0, 0, -1200]), glow: DARTH_GLOW_SECONDS }
    const fire: Input = { ...aimAt(darth.pos), fire: true }
    let s: GameState = loneWave(darth)
    s = stepGame(s, fire, DT)
    expect(s.score).toBe(0) // no double jeopardy: the hit was not processed...
    expect(s.enemies[0].damaged ?? false).toBe(false) // ...so no damage signal either
  })
})

// ---------------------------------------------------------------------------
// AC-6 — the confession comment is retired
// ---------------------------------------------------------------------------

describe('uf1-3 AC-6 — tie-status.ts no longer confesses an unwired bit', () => {
  const tieStatus = (): string => readFileSync(join(repoRoot, 'src', 'core', 'tie-status.ts'), 'utf8')

  it('drops the "always reads false" TODO the fleet sweep reported', () => {
    const src = tieStatus()
    expect(src).not.toMatch(/for now this always reads false/)
    expect(src).not.toMatch(/TODO: a later task threads the hit resolver/)
  })

  it('describes what C_AH now does, so the next sweep does not re-report it', () => {
    const src = tieStatus()
    // The bit must still be DOCUMENTED (not silently deleted) and must still
    // point at the ROM setter it is fed from. The citation may name the routine
    // (CPHTSA — preferred, a mechanism outlives a line number) or cite line 357
    // in this file's existing "equate,setter" list form, e.g. `WSCPU.MAC:27,357`.
    expect(src).toMatch(/C_AH/)
    expect(src).toMatch(/CPHTSA|WSCPU\.MAC:(?:\d+,)*357/)
  })
})

// ---------------------------------------------------------------------------
// A plain TIE is unaffected — the regression guard on sw7-17's hitscan fixtures
// ---------------------------------------------------------------------------

describe('uf1-3 — plain TIEs are untouched by the new signal', () => {
  it('a killed TIE still dies, scores, and leaves no fighter behind', () => {
    const tie: Enemy = { pos: [0, 0, -1200], kind: 'tie', orient: IDENTITY }
    let s = loneWave(tie)
    const fire: Input = { ...aimAt(tie.pos), fire: true }
    for (let i = 0; i < 180 && s.enemies.length > 0; i++) s = stepGame(s, fire, DT)
    expect(s.enemies).toHaveLength(0)
    expect(s.score).toBe(TIE_SCORE)
  })

  it('an untouched TIE never reports C_AH through a full wave of ticks', () => {
    const tie: Enemy = { pos: [0, 0, -1200], kind: 'tie', orient: IDENTITY }
    let s = loneWave(tie)
    for (let i = 0; i < 20; i++) {
      s = stepGame(s, { aimX: 0, aimY: 0, fire: false }, TICK_DT)
      if (s.enemies.length === 0) break
      expect(s.enemies[0].damaged ?? false).toBe(false)
    }
  })
})
