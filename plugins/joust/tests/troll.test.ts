// tests/troll.test.ts
//
// Story jt3-3 — RED phase (Leeloo / TEA). The BEHAVIOUR of the lava troll's hand:
// the spawn gate that reads arena.bridgeBurned (AC-1), the PADGRA→ADDLAV grip with
// the SUSTAINED break-free and its 50-point escape (AC-2), the RV4 30s-grace /
// escalating-pull / $500-cap escalation (AC-3), and bit-for-bit determinism through
// a seeded escape and a seeded cap-death (AC-4). The source re-derivation + PATCH
// provenance + claims live in the companion tests/troll-source.test.ts; the demo
// call-site pin (the carried jt3-2 obligation) in tests/demo-troll.test.ts.
//
// ─── MUTATION-RESISTANCE (the jt1-4 lesson, applied) ─────────────────────────
// The break-free and cap pins assert the ACTUAL arithmetic, never a bare boolean:
//   • the pull is added to VY BEFORE the -$0180 compare, so a raw single-frame
//     spike to the threshold does NOT escape — a `velY < -$0180` mutant that read
//     the RAW velocity would wrongly free the victim, and a dedicated case kills it;
//   • the $500 cap is proven inescapable by BOTH a long sustained-flap simulation
//     AND the arithmetic (the per-frame pull exceeds any flap the game can make).

import { describe, it, expect } from 'vitest'
import { loadTroll, type TrollGrip, type GripStep, type TrollModule } from './helpers/troll-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadFlight } from './helpers/flight-contract.js'

// A representative strong flap impulse — the ROM's own takeoff velocity
// (LDD #-$0080, STFLY JOUSTRV4.SRC:6124). Applied to VY BEFORE the grip's gravity
// each frame, exactly as ADDFLP modifies PVELY before [PADGRA] runs.
const FLAP = -0x80

/**
 * Drive the grip for up to `frames`, optionally flapping and/or escalating each
 * frame, stopping at the first escape or lava death. Pure over its inputs — the
 * determinism suite runs it twice and deep-equals the whole trajectory.
 */
function driveGrip(
  t: TrollModule,
  opts: {
    grip: TrollGrip
    startVelY?: number
    startPosY: number
    flapEveryFrame?: boolean
    flapFirstFrameOnly?: boolean
    flapImpulse?: number
    escalate?: boolean
    frames: number
  },
): { steps: GripStep[]; last: GripStep } {
  const impulse = opts.flapImpulse ?? FLAP
  let velY = opts.startVelY ?? 0
  let posY = opts.startPosY
  let grip = opts.grip
  const steps: GripStep[] = []
  for (let f = 0; f < opts.frames; f++) {
    const flapThisFrame =
      opts.flapEveryFrame === true || (opts.flapFirstFrameOnly === true && f === 0)
    if (flapThisFrame) velY += impulse
    if (opts.escalate) grip = t.escalateGrip(grip)
    const step = t.stepGrip(velY, posY, grip)
    steps.push(step)
    velY = step.velY
    posY = step.posY
    if (step.escaped || step.inLava) break
  }
  return { steps, last: steps[steps.length - 1] }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE SPAWN GATE. Troll only after the bridge burns (TTROLL = TBRIDGE + 1),
// off CLIF5's landing path; the LNDB7 dispatch reserved in jt1-4 is reachable.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the troll spawns only after the bridge has burned (wave TBRIDGE+1)', () => {
  const burned = { bridgeBurned: true }
  const intact = { bridgeBurned: false }

  it('is unspawnable at every wave while the bridge is intact — the gate READS bridgeBurned', async () => {
    const t = await loadTroll()
    for (const wave of [1, 2, 3, 4, 5, 9, 42]) {
      expect(t.trollSpawnable(intact, wave), `wave ${wave}, bridge intact`).toBe(false)
    }
  })

  it('stays unspawnable through the bridge wave itself — the TTROLL+1 delay (waves 1-3)', async () => {
    const t = await loadTroll()
    // The bridge burns on wave 3 (bridgeBurned latches), but TTROLL = 1 delays the
    // troll ONE further wave: it first appears on wave 4. Waves 1-3 stay empty.
    for (const wave of [1, 2, 3]) {
      expect(t.trollSpawnable(burned, wave), `wave ${wave}: bridge burned but pre-delay`).toBe(false)
    }
  })

  it('becomes spawnable from wave TROLL_WAVE (4) onward once the bridge has burned', async () => {
    const t = await loadTroll()
    expect(t.TROLL_WAVE).toBe(4)
    for (const wave of [4, 5, 12, 99]) {
      expect(t.trollSpawnable(burned, wave), `wave ${wave}: burned + past delay`).toBe(true)
    }
  })

  it('THE CARRIED OBLIGATION — a STALE arena (bridgeBurned false) can never spawn, even at wave 4+', async () => {
    // This is the mutation pin for the jt3-2 seam: a Dev who gated on `wave >= 4`
    // ALONE (dropping the bridgeBurned read) would spawn a troll from a demo that
    // never applied wave destruction. The gate must consume bridgeBurned.
    const t = await loadTroll()
    for (const wave of [4, 5, 20]) {
      expect(t.trollSpawnable(intact, wave), `wave ${wave} with a stale arena must NOT spawn`).toBe(false)
    }
  })

  it('LNDB7 is REACHABLE: the bit-7-without-bit-5 mask dispatches to the troll', async () => {
    // The jt1-4-reserved seventh landing outcome. $80 = bit 7 set, bit 5 clear.
    const a = await loadArena()
    expect(a.groundOutcome(0x80).kind, 'bit 7 without bit 5 is the lava troll').toBe('troll')
    // …and CLIF5 ($A0 = bit7|bit5) is NOT the troll — the distinguishing bit is bit 5.
    expect(a.groundOutcome(0xa0).kind, 'CLIF5 keeps its footing').toBe('platform')
  })

  it('the troll dispatch is reachable from REAL arena geometry (some (x,y) → troll)', async () => {
    // "Exercised", not just hand-fed: a real (x,y) run through the flight core's
    // groundMaskAt must actually land on the troll band, or the seventh outcome is
    // unreachable in play.
    const a = await loadArena()
    const f = await loadFlight()
    let hit: { x: number; y: number } | null = null
    for (let y = 0; y < a.LND_Y_TABLE.length && !hit; y++) {
      for (let x = -40; x <= 300 && !hit; x++) {
        if (a.groundOutcome(f.groundMaskAt(x, y)).kind === 'troll') hit = { x, y }
      }
    }
    expect(hit, 'no (x,y) reaches the lava-troll band — the seventh outcome is unreachable').not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE GRIP. PADGRA→ADDLAV; break-free needs SUSTAINED post-pull VY < -$0180;
// a clean escape scores 50.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the grip repoints gravity and the break-free is sustained', () => {
  const HIGH = 90 << 8 // mid-screen, well above the lava — a fall takes many frames

  it('names the swap it performs: the normal ADDGRA becomes ADDLAV', async () => {
    const t = await loadTroll()
    expect(t.NORMAL_ROUTINE).toBe('ADDGRA')
    expect(t.GRIP_ROUTINE).toBe('ADDLAV')
  })

  it('the pull is added to VY BEFORE the -$0180 test — the boundary is exact', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(8) // a grace-range pull (LAVGRA is $04..$2d)
    // Escape needs POST-pull VY < BREAK_FREE_VY, i.e. rawVelY < BREAK_FREE_VY - pull.
    const boundary = t.BREAK_FREE_VY - grip.pull
    expect(t.stepGrip(boundary, HIGH, grip).escaped, 'AT the boundary: VY+pull == -$0180, not below').toBe(false)
    expect(t.stepGrip(boundary - 1, HIGH, grip).escaped, 'one below the boundary: escapes').toBe(true)
    expect(t.stepGrip(boundary + 1, HIGH, grip).escaped, 'one above: held').toBe(false)
  })

  it('KILLS the raw-threshold mutant: VY just below -$0180 does NOT escape once the pull is added', async () => {
    // A `velY < -$0180` implementation that read the RAW velocity (not VY+pull)
    // would free the victim here. VY = -$0181 is below the threshold, but + pull it
    // is back above it, so no escape. This is the whole point of "sustained".
    const t = await loadTroll()
    const grip = t.beginGrip(8)
    expect(t.stepGrip(t.BREAK_FREE_VY - 1, HIGH, grip).escaped).toBe(false)
  })

  it('on escape the position is NOT integrated (ADLFRE branches before the fall)', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(8)
    const escVelY = t.BREAK_FREE_VY - grip.pull - 1
    const step = t.stepGrip(escVelY, HIGH, grip)
    expect(step.escaped).toBe(true)
    expect(step.posY, 'position frozen on the frame the victim breaks free').toBe(HIGH)
    expect(step.velY, 'the stored VY includes the pull add').toBe(escVelY + grip.pull)
    expect(step.inLava).toBe(false)
  })

  it('a held frame integrates the fall downward and does not escape', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(8)
    const step = t.stepGrip(-100, HIGH, grip)
    expect(step.escaped).toBe(false)
    expect(step.inLava).toBe(false)
    expect(step.velY).toBe(-100 + grip.pull)
    expect(step.posY, '8.8 position advances by the new VY').toBe(HIGH + (-100 + grip.pull))
  })

  it('the wings-up offset adds 4 to the pull (LDB #$04 vs CLRB — ADDLAV keeps no GRAV)', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(8)
    const down = t.stepGrip(0, HIGH, grip, false)
    const up = t.stepGrip(0, HIGH, grip, true)
    expect(up.velY - down.velY, 'wings-up = wings-down + $04').toBe(4)
  })

  it('SUSTAINED flapping breaks free; a SINGLE-frame flap spike does NOT (it falls to the lava)', async () => {
    const t = await loadArena().then(() => loadTroll())
    const grip = t.beginGrip(8) // grace pull — escapable
    const HIGH2 = 90 << 8

    const sustained = driveGrip(t, { grip, startPosY: HIGH2, flapEveryFrame: true, frames: 400 })
    expect(sustained.last.escaped, 'sustained upward flapping breaks free').toBe(true)
    expect(sustained.last.inLava).toBe(false)

    const spike = driveGrip(t, { grip, startPosY: HIGH2, flapFirstFrameOnly: true, frames: 800 })
    expect(spike.steps.some((s) => s.escaped), 'a single flap must NOT sustain an escape').toBe(false)
    expect(spike.last.inLava, 'the pull recovers and drags the victim into the lava').toBe(true)
  })

  it('a clean escape emits a 50-point score EVENT (reason "escape", ruling C caveat in the claim)', async () => {
    const t = await loadTroll()
    expect(t.ESCAPE_SCORE).toBe(50)
    expect(t.escapeScoreEvent()).toEqual({ kind: 'score', value: 50, reason: 'escape' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE RV4 ESCALATION. 30s grace, then +1/frame to the $500 cap; inescapable
// at the cap; escapable below it.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the pull holds for the grace, then climbs +1/frame to the $500 cap', () => {
  it('beginGrip seeds the pull from LAVGRA and the grace timer to 30*60', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(0x08)
    expect(grip.pull, 'CLVGRA = LAVGRA (the wave base gravity)').toBe(0x08)
    expect(grip.killTimer, 'LAVKLL = 30*60 frames').toBe(t.GRACE_FRAMES)
    expect(t.GRACE_FRAMES).toBe(1800)
  })

  it('DURING the grace the pull does not change — only the timer counts down', async () => {
    const t = await loadTroll()
    let grip = t.beginGrip(0x08)
    for (let i = 0; i < 5; i++) {
      const before = grip.pull
      grip = t.escalateGrip(grip)
      expect(grip.pull, `grace frame ${i}: pull frozen`).toBe(before)
    }
    expect(grip.killTimer, 'the timer has counted down 5 frames').toBe(t.GRACE_FRAMES - 5)
  })

  it('AFTER the grace the pull grows exactly +1 per frame', async () => {
    const t = await loadTroll()
    // A grip whose grace has just one frame left; the next tick expires it.
    let grip: TrollGrip = { pull: 0x08, killTimer: 1 }
    grip = t.escalateGrip(grip)
    expect(grip.pull, 'first post-grace frame: +1').toBe(0x09)
    grip = t.escalateGrip(grip)
    expect(grip.pull, 'second: +1 again').toBe(0x0a)
    expect(grip.killTimer, 'the timer holds at 1 so every subsequent frame escalates').toBe(1)
  })

  it('the pull caps at the $500 boundary — CMPD #$500 / BHI (mutation-resistant)', async () => {
    const t = await loadTroll()
    // The BHI (unsigned-higher) boundary: it increments WHILE pull <= $500, so it
    // overshoots to $501, then holds. Pin the exact edge, not just "big".
    expect(t.escalateGrip({ pull: 0x4ff, killTimer: 1 }).pull, '$4FF → $500').toBe(0x500)
    expect(t.escalateGrip({ pull: 0x500, killTimer: 1 }).pull, '$500 is not "higher" → $501').toBe(0x501)
    expect(t.escalateGrip({ pull: 0x501, killTimer: 1 }).pull, '$501 IS higher → capped').toBe(0x501)
    expect(t.escalateGrip({ pull: 0x600, killTimer: 1 }).pull, 'never climbs past the cap').toBe(0x600)
  })

  it('ESCAPABLE at/below the grace pull: sustained flapping still frees the victim', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(0x08)
    const run = driveGrip(t, { grip, startPosY: 90 << 8, flapEveryFrame: true, frames: 400 })
    expect(run.last.escaped, 'a small pull is escapable with sustained effort').toBe(true)
  })

  it('INESCAPABLE at the $500 cap: no sustained flap the game can make ever breaks free', async () => {
    const t = await loadTroll()
    const capped: TrollGrip = { pull: t.PULL_CAP, killTimer: 1 }
    // Even an EXAGGERATED flap (six times the ROM takeoff) cannot overcome the cap.
    for (const impulse of [FLAP, -0x300]) {
      const run = driveGrip(t, {
        grip: capped,
        startPosY: 200 << 8,
        flapEveryFrame: true,
        flapImpulse: impulse,
        frames: 600,
      })
      expect(run.steps.some((s) => s.escaped), `flap ${impulse}: never escapes at the cap`).toBe(false)
      expect(run.last.inLava, `flap ${impulse}: the cap drags the victim into the lava`).toBe(true)
    }
  })

  it('the cap is ARITHMETICALLY inescapable: the per-frame pull exceeds the break-free margin', async () => {
    const t = await loadTroll()
    // To escape, the pre-pull VY must be below BREAK_FREE_VY - PULL_CAP; but at the
    // cap every frame ADDS PULL_CAP, which is larger than any flap the ladder makes,
    // so VY strictly climbs and can never reach that floor. Pin the numbers.
    const floor = t.BREAK_FREE_VY - t.PULL_CAP
    expect(floor, 'the VY you would need: -$0180 - $500 = -$0680').toBe(-0x680)
    // From a fresh grab (VY 0) even the strongest single flap cannot reach the floor
    // in one frame at the cap.
    const strongestFlap = -0x300
    expect(0 + strongestFlap > floor, 'one max flap from rest stays above the escape floor').toBe(true)
    expect(t.PULL_CAP > Math.abs(strongestFlap), 'the pull outweighs the flap → VY climbs each frame').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM. A seeded grab→struggle→ESCAPE and a seeded grab→cap→DEATH
// both replay bit-for-bit.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — seeded escape and seeded cap-death replay bit-for-bit', () => {
  it('grab → struggle → ESCAPE is deterministic (identical trajectory + a 50 event)', async () => {
    const t = await loadTroll()
    const run = (): { steps: GripStep[]; last: GripStep } =>
      driveGrip(t, { grip: t.beginGrip(0x08), startPosY: 90 << 8, flapEveryFrame: true, frames: 400 })
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(a.last.escaped, 'the scenario ends in an escape').toBe(true)
    expect(t.escapeScoreEvent().value, 'which credits 50').toBe(50)
  })

  it('grab → cap → DEATH is deterministic (identical trajectory ending in the lava)', async () => {
    const t = await loadTroll()
    const run = (): { steps: GripStep[]; last: GripStep } =>
      driveGrip(t, {
        grip: { pull: t.PULL_CAP, killTimer: 1 },
        startPosY: 200 << 8,
        flapEveryFrame: true,
        frames: 600,
      })
    const a = run()
    const b = run()
    expect(a).toEqual(b)
    expect(a.last.inLava, 'the scenario ends in a lava death').toBe(true)
    expect(a.last.escaped).toBe(false)
  })

  it('escalateGrip and stepGrip are pure — same inputs, same outputs, no argument mutation', async () => {
    const t = await loadTroll()
    const grip: TrollGrip = { pull: 0x10, killTimer: 1 }
    const snapshot = JSON.stringify(grip)
    const out1 = t.escalateGrip(grip)
    const out2 = t.escalateGrip(grip)
    expect(out1).toEqual(out2)
    expect(JSON.stringify(grip), 'escalateGrip must not mutate its argument').toBe(snapshot)
    expect(t.stepGrip(-50, 90 << 8, grip)).toEqual(t.stepGrip(-50, 90 << 8, grip))
  })
})
