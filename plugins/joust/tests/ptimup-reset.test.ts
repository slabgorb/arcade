// tests/ptimup-reset.test.ts
//
// Story jt9-8 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for "a wing
// transition clears PTIMUP." Its provenance companion is
// ptimup-reset-source.test.ts, which proves the ROM really clears PTIMUP at
// BOTH edges (the jt1-10/jt2-1 double-entry pattern).
//
// ─── THE CONTRACT, TRACED FROM JOUSTRV4.SRC (verified, not taken from the AC) ─
// PTIMUP is the flap-lift budget: flap()'s impulse is ((timeUp*96)>>8)-96, so a
// LOW timeUp lifts hard (-96) and a spent (high) one barely lifts. The ROM
// RE-INITS that budget on EITHER wing transition:
//
//   GOFLIP (pressed→released, :6182-6186):  CLR PTIMUP,U   RE-INIT BUTTON PRESSES
//   GOFLAP (released→pressed, :6212-6219):  JSR ADDFLP  (the impulse, reads PTIMUP)
//                                           …
//                                           CLR PTIMUP,U          (only AFTER)
//
// So RELEASING the button restores your lift, which is why rapid tapping
// out-climbs a hold — the mechanic every Joust player knows. Our port
// (flight.ts `tickTimeUp`, wired in frame.ts `stepPlayerEntity`) only ever
// INCREMENTS timeUp and never clears it in flight, so neither edge restores the
// budget today. (The derived AC1 claimed "the press edge already modelled" —
// it is NOT: `flap()` reads timeUp but does not clear it. Both edges need it.
// See the Delivery Finding.)
//
// ─── WHY THE END-OF-FRAME VALUE ON AN EDGE IS EXACTLY 0, NOT 1 ────────────────
// Within one frame the ROM runs AIROVR FIRST (`JSR AIROVR`, :6167 / :6194),
// which increments PTIMUP (`AIRTIM INC PTIMUP,U`, :6476); only THEN does the
// `TSTB` button test branch to GOFLIP/GOFLAP and `CLR PTIMUP,U`. Increment then
// clear ⇒ an edge frame ends at 0. That is the same order as applying the reset
// AFTER `tickTimeUp`, so these tests pin `=== 0`.
//
// ─── WHY THE RAW `stepFrame` SEAM ────────────────────────────────────────────
// audio-flap.test.ts's `rawSim` shape: `prevFlapHeld` is a first-class
// ProcessSpec field `runBehaviour` writes every player wake, so SEEDING it is
// exactly the state the sim leaves behind — it lets a single step BE an edge
// without a played-in press moving the measured velocity. A lone player also
// means no other process can collide, so the only hazard is the ground, which
// the staging Y avoids.

import { describe, it, expect } from 'vitest'
import { createState, spawn, stepFrame, type GameState } from '../src/core/frame.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import { CEILING } from '../src/core/arena.js'

const PID = 1

/** A lone airborne bird at pixel `posYpx`, carrying a `timeUp` budget. */
const airborne = (timeUp: number, posYpx = 50, velY = 0): EntityState => ({
  posX: 0,
  posY: posYpx << 8,
  velXIndex: 0,
  velXFrac: 0,
  velY,
  timeUp,
  groundState: null,
  plantZ: 0,
  airborne: true,
  animPhase: 0,
})

/** One player, waking every frame, with its previous-flap level SEEDED. */
const sim = (e: EntityState, prevFlapHeld: boolean): GameState =>
  spawn(createState(0x1234), {
    id: PID,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    entity: e,
    prevFlapHeld,
  })

const entityOf = (s: GameState): EntityState => {
  const p = s.processes.find((q) => q.id === PID)
  if (!p?.entity) throw new Error('player entity missing from stepped state')
  return p.entity
}

const step = (s: GameState, input: PlayerInput): GameState => stepFrame(s, { [PID]: input })

// The four inputs, by whether the button is held and whether THIS frame is the
// released→pressed rising edge (`flap`). `dir` is neutral throughout.
const PRESS: PlayerInput = { dir: 0, flap: true, flapHeld: true } // rising edge: released→pressed
const RELEASE: PlayerInput = { dir: 0, flap: false, flapHeld: false } // released this frame
const HOLD_ON: PlayerInput = { dir: 0, flap: false, flapHeld: true } // button stays down, no edge
const HOLD_OFF: PlayerInput = { dir: 0, flap: false, flapHeld: false } // button stays up, no edge

// A long glide spends the budget: timeUp climbs toward 255 and lift decays.
const SPENT = 200
// The impulse flap() computes from a spent budget — a weak lift, ((200*96)>>8)-96.
const SPENT_IMPULSE = ((SPENT * 96) >> 8) - 96 // = -21
// Wings-DOWN gravity is added on a frame the button is held (a press frame).
const WINGS_DOWN_GRAV = 4

describe('jt9-8 AC1 — a wing transition clears PTIMUP (CLR PTIMUP,U)', () => {
  it('the RELEASE edge (GOFLIP, :6185) resets timeUp to 0', () => {
    // The edge: last frame the button was HELD, this frame it is up.
    const releaseEdge = entityOf(step(sim(airborne(SPENT), /* prevFlapHeld */ true), RELEASE))
    // The control is the SAME frame with NO transition — the button was already
    // up last frame — so timeUp merely ticks. This is what today's port does on
    // BOTH, and it is why the edge case below is RED until the reset lands.
    const noEdge = entityOf(step(sim(airborne(SPENT), /* prevFlapHeld */ false), HOLD_OFF))

    expect(noEdge.timeUp, 'control: with no wing transition PTIMUP only ticks up (AIRTIM INC, :6476)').toBe(SPENT + 1)
    expect(
      releaseEdge.timeUp,
      'the release edge must clear PTIMUP: AIROVR increments (:6476) then GOFLIP clears (:6185) — net 0',
    ).toBe(0)
  })

  it('the PRESS edge (GOFLAP, :6219) clears PTIMUP, but only AFTER the impulse has read it (:6212 ADDFLP)', () => {
    const pressed = entityOf(step(sim(airborne(SPENT), /* prevFlapHeld */ false), PRESS))

    // Ordering guard: `ADDFLP` runs at :6212, `CLR PTIMUP,U` at :6219, so the
    // impulse must use the PRE-clear, spent budget — a weak lift, NOT a fresh
    // -96. velY = impulse(from timeUp 200) + wings-down gravity. If the reset
    // were applied BEFORE the impulse, velY would be -96+4 and this fails.
    expect(
      pressed.velY,
      'the press impulse reads the spent budget before the clear (:6212 precedes :6219)',
    ).toBe(SPENT_IMPULSE + WINGS_DOWN_GRAV)

    // …and only then is the budget cleared, so the NEXT flap can be strong.
    expect(pressed.timeUp, 'GOFLAP clears PTIMUP after ADDFLP (:6219)').toBe(0)
  })
})

describe('jt9-8 AC2 — releasing restores lift (rapid tapping climbs, a hold does not)', () => {
  it('a spent bird that RELEASES and then re-presses gets a FULL -96 impulse again', () => {
    // Frame 1 — the RELEASE (GOFLIP): last frame held, this frame up. The ROM
    // clears the spent budget here.
    const released = step(sim(airborne(SPENT), /* prevFlapHeld */ true), RELEASE)
    const vBefore = entityOf(released).velY

    // Frame 2 — the re-PRESS. Its impulse is velY_after − velY_before minus the
    // wings-down gravity of this frame. With the budget restored it is a full
    // -96; without the fix the budget is still ~201 so it is the weak ~-21.
    const vAfter = entityOf(step(released, PRESS)).velY
    const impulse = vAfter - vBefore - WINGS_DOWN_GRAV
    expect(
      impulse,
      'the flap after a release lifts at full strength (-96): the release cleared the spent budget',
    ).toBe(-96)
  })

  it('from a spent budget, TAPPING climbs to the ceiling within 40 frames; a HOLD never does', () => {
    const FRAMES = 40
    const highestPixel = (make: () => GameState, drive: (i: number) => PlayerInput): { top: number; airborneAtEnd: boolean } => {
      let s = make()
      let top = Infinity
      for (let i = 0; i < FRAMES; i++) {
        s = step(s, drive(i))
        top = Math.min(top, entityOf(s).posY >> 8)
      }
      return { top, airborneAtEnd: entityOf(s).airborne }
    }

    // TAP: a wing transition EVERY frame — press, release, press, …
    const tap = highestPixel(
      () => sim(airborne(SPENT), false),
      (i) => (i % 2 === 0 ? PRESS : RELEASE),
    )
    // HOLD: one press, then keep the button DOWN — exactly one flap, no restore.
    const hold = highestPixel(
      () => sim(airborne(SPENT), false),
      (i) => (i === 0 ? PRESS : HOLD_ON),
    )

    // Preconditions: neither bird ever touched the ground (staging is open air).
    expect(tap.airborneAtEnd, 'precondition: the tapping bird never lands').toBe(true)
    expect(hold.airborneAtEnd, 'precondition: the holding bird never lands').toBe(true)

    // A spent single flap cannot reach the ceiling — the bird sinks.
    expect(hold.top, 'control: one flap on a spent budget never reaches the ceiling').toBeGreaterThan(CEILING)
    // Tapping restores lift on every release, so it climbs all the way up.
    expect(
      tap.top,
      'tapping must restore lift each release and climb to the ceiling — the mechanic a spent hold cannot reach',
    ).toBeLessThanOrEqual(CEILING)
  })
})
