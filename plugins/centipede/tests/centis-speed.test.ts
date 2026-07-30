// tests/centis-speed.test.ts
//
// Story cp4-1 — RED phase (O'Brien / TEA). "Centipede speed goes live": thread
// CENTIS into the march step and the entry direction. This closes the SPEED half
// of the cp3-4 scope fence (centipede.ts:162-168) — SimState.centis and the
// per-wave cadence (stepWaveCadence, shipped by cp3-4) already exist, but the
// train marches at a module-private CENT_SPEED=2 and NEVER reads centis, so every
// wave runs at the same pace (the user's 2026-07-20 playtest).
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────────
// CENTPC, CENTI4.MAC:456-554 (vendored revision.v4). CENTIS drives BOTH axes —
// claim CT-10 (docs/rom-study/claims/09-centipede-train.json):
//   :479-480  LDA X,CENTIS-1 / STA MOBJDV            vertical magnitude = CENTIS
//   :481-485  TAY / LDA FRAME / AND I,2 / BNE 10$ /
//             TYA / JSR COMP / TAY / 10$: STY MOBJDH ;HDIR=CENTIS*1 OR -1
//     FRAME&2 != 0 → MOBJDH = +CENTIS   (BNE taken, COMP skipped)
//     FRAME&2 == 0 → MOBJDH = -CENTIS   (COMP = EOR 0FF / CLC / ADC 1 =
//                                        two's-complement negate, CENIR4.MAC:184)
// The 2 shipping today is exactly CENTIS's boot value (INIT :1174-1176 "FAST TO
// START WITH" = CENTIS_INIT), which is why wave 1 looks correct and nothing after
// it changes.
//
// ─── SCOPE (fenced) ──────────────────────────────────────────────────────────────
// The SPEED + entry-direction half only. Fragmentation / loose heads = cp4-2,
// the LCOLOR colour walk = cp4-3. NEWHD's fresh head keeps its HARDCODED MOBJDV=2
// ("NEW BUG GOES FAST", :1672) — NOT centis — so this story does not touch the
// factory; only CENTPC's train lay.
//
// ─── THE CONTRACT THIS SUITE DRIVES ──────────────────────────────────────────────
// createCentipede(centis, frame) reads the wave's speed magnitude and the frame
// parity. The params carry ROM-boot DEFAULTS (CENTIS_INIT, 0) so the ~18 existing
// zero-arg call sites keep laying the boot train unchanged — the new behaviour is
// exercised through the parameterised form here and through the three real lay
// sites (createSim boot, wave-clear re-lay, death respawn) driven below.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// createCentipede() currently ignores centis (dh=dv=CENT_SPEED=2, always). So:
//   • createCentipede(1, …) / (3, …) still yield |dh|=dv=2 → magnitude asserts fail.
//   • the FRAME&2 sign is not modelled (dh is always +2) → sign asserts fail.
//   • a wave-2 re-lay marches at 2, not the cadence's 1 → the integration pin fails.

import { describe, it, expect } from 'vitest'
import {
  createCentipede,
  stepCentipede,
  stepWaveCadence,
  CENTIS_INIT,
  CENTIS_SLOW,
  NCENT,
  type Segment,
} from '../src/core/centipede'
import { createPlayfield } from '../src/core/playfield'
import { createSim, stepSim, STARTING_LIVES, WAVE_DELAY, type SimState } from '../src/core/sim'

const NO_INPUT = { dh: 0, dv: 0, fire: false } as const
const DEAD_BIT = 0x80
const liveSegs = (segs: Segment[]): Segment[] => segs.filter((s) => (s.pic & DEAD_BIT) === 0)

// ─── AC-1 / AC-2: the pure createCentipede(centis, frame) contract ────────────────
describe('cp4-1 createCentipede consumes CENTIS on both axes (AC-1/AC-2, CT-10)', () => {
  it('lays every segment with dv = centis and |dh| = centis — the magnitude IS the argument, not the old constant 2', () => {
    // frame=2 (frame&2 != 0) fixes the sign positive so this test isolates MAGNITUDE.
    // centis=3 is OUTSIDE the live 1..2 range on purpose: it proves the step is the
    // argument verbatim (MOBJDV=CENTIS, no clamp), so the demoted CENT_SPEED=2 can
    // no longer be governing the march (AC-1).
    for (const centis of [1, 2, 3]) {
      const segs = createCentipede(centis, 2)
      expect(segs, `centis=${centis}: still a full ${NCENT}-segment train`).toHaveLength(NCENT)
      for (const s of segs) {
        expect(s.dv, `centis=${centis}: vertical step = CENTIS (:479-480 STA MOBJDV)`).toBe(centis)
        expect(Math.abs(s.dh), `centis=${centis}: |horizontal step| = CENTIS (:481-485 MOBJDH)`).toBe(centis)
      }
    }
  })

  it('the horizontal ENTRY sign is FRAME&2: set → +CENTIS, clear → -CENTIS (both halves in one test — neither passes alone)', () => {
    const centis = 2
    // FRAME&2 != 0 → BNE taken → the COMP negate is skipped → MOBJDH = +CENTIS.
    for (const frame of [2, 3, 6, 7]) {
      const head = createCentipede(centis, frame)[0]
      expect(head.dh, `frame=${frame} (frame&2 != 0) enters +CENTIS`).toBe(+centis)
    }
    // FRAME&2 == 0 → COMP negates → MOBJDH = -CENTIS.
    for (const frame of [0, 1, 4, 5]) {
      const head = createCentipede(centis, frame)[0]
      expect(head.dh, `frame=${frame} (frame&2 == 0) enters -CENTIS`).toBe(-centis)
    }
  })

  it('bodies copy the head heading exactly (CT-8): identical dh AND dv on every segment, either sign', () => {
    for (const frame of [0, 2]) {
      const segs = createCentipede(2, frame)
      for (const s of segs) {
        expect(s.dh, `frame=${frame}: body copies head dh`).toBe(segs[0].dh)
        expect(s.dv, `frame=${frame}: body copies head dv`).toBe(segs[0].dv)
      }
    }
  })

  it('the step magnitude actually MOVES the train by centis per frame (a faster wave marches faster)', () => {
    // A behavioural cross-check on top of the field pins above: over the same small
    // number of frames on a clear field, a centis=2 head travels twice as far as a
    // centis=1 head. Guards against a build that stores centis on the segment but
    // marches by a fixed step.
    const marchDistance = (centis: number): number => {
      // frame=2 → +centis (rightward), mid-field so no edge/mushroom turn in 3 frames.
      let head = createCentipede(centis, 2)[0]
      const startH = head.h
      const field = createPlayfield()
      for (let i = 0; i < 3; i++) head = stepCentipede([head], field)[0]
      return head.h - startH
    }
    expect(marchDistance(2), 'centis=2 marches twice as far as centis=1 over 3 frames').toBe(2 * marchDistance(1))
    expect(marchDistance(1), 'centis=1 still actually moves (liveness)').toBeGreaterThan(0)
  })
})

// ─── AC-3: the wave-2 re-lay marches at the CENTIS the cadence produced ────────────
describe('cp4-1 a real wave clear makes the next train march at the cadence CENTIS (AC-3)', () => {
  it('clearing wave 1 lays a wave-2 train whose march speed is stepWaveCadence()’s centis, not the boot 2', () => {
    const boot = createSim(0xcade)
    expect(boot.centis, 'boots at CENTIS_INIT (CT-92)').toBe(CENTIS_INIT)

    // Stage a wave clear the only way a wave clears: every segment killed. centis is
    // NOT hand-poked — it flows through SHOOT's INC (:2317) and CENTPC's cadence.
    let s: SimState = { ...boot, segs: boot.segs.map((seg) => ({ ...seg, pic: seg.pic | DEAD_BIT })) }

    // The clearing frame: all-dead → WAVE_DELAY pause + SHOOT's "50$: INC CENTIS".
    s = stepSim(s, NO_INPUT)
    expect(s.delay, 'the all-dead frame arms the between-wave pause (WAVE_DELAY)').toBe(WAVE_DELAY)
    expect(s.centis, 'SHOOT’s wave-clear tail bumps CENTIS by one (:2317)').toBe(CENTIS_INIT + 1)

    // Run out the pause until the re-lay advances the wave.
    for (let i = 0; i < WAVE_DELAY + 8 && s.wave === 1; i++) s = stepSim(s, NO_INPUT)
    expect(s.wave, 'the pause ends on a wave-2 re-lay').toBe(2)

    // The cadence cp3-4 produces for THIS clear (boot centin=12, bumped centis=3,
    // score 0 → below 40,000 → CENTIS resets to 1). Reuse the real function.
    const expected = stepWaveCadence(boot.centin, CENTIS_INIT + 1, boot.score).centis
    expect(expected, 'below 40,000 the wave-2 CENTIS resets to 1 (CT-95)').toBe(CENTIS_SLOW)
    expect(s.centis, 'the sim’s centis matches the cadence output').toBe(expected)

    // THE PIN: the re-laid train marches at that centis on BOTH axes — proof the
    // train consumes the cadence, not the module constant or the transient 3.
    // cp4-2 forward-compat: DEAD=NCENT keeps all 12 slots alive, but wave 2 is now
    // 11 CONNECTED segments (marching at CENTIS) + 1 LOOSE head (its own dv=2,
    // pinned in fragmented-train.test.ts). The cadence-speed pin therefore narrows
    // to the connected block [0, centin); the loose head is excluded on purpose.
    const live = liveSegs(s.segs)
    expect(live.length, 'all 12 slots alive: connected + loose head (DEAD=NCENT)').toBe(NCENT)
    for (const seg of s.segs.slice(0, s.centin)) {
      expect(seg.dv, 'wave-2 connected vertical step = cadence CENTIS').toBe(expected)
      expect(Math.abs(seg.dh), 'wave-2 connected horizontal step = cadence CENTIS').toBe(expected)
    }

    // SANITY (the story's watch-out): below 40,000 the ROM cadence OSCILLATES, and
    // wave 2 is SLOWER than wave 1 (centis 2 → 1), not faster. Pin the ROM, not the
    // folk intuition. Recorded as a Delivery Finding for open-questions.md.
    expect(expected, 'wave 2 marches SLOWER than boot below 40,000 (oscillating cadence)').toBeLessThan(CENTIS_INIT)
  })
})

// ─── wiring: every lay site reads the live centis, so none can silently default ───
describe('cp4-1 all three lay sites read the live CENTIS (no silent boot-speed default)', () => {
  it('createSim boots the wave-1 train at CENTIS_INIT — and frame 0 enters LEFTWARD (-CENTIS), not the old hardcoded +2', () => {
    // The boot centis (2) coincides with the old hardcoded CENT_SPEED (2), so a
    // magnitude-only assert here is vacuous (2 == 2 either way — the sidecar's
    // coincidence-boundary trap). The SIGN is what distinguishes the feature: the
    // boot frame is 0 (createSim), 0 & 2 == 0, so CENTPC's COMP negates → -CENTIS.
    // Today's train hardcodes +2, so this reddens now and pins the boot entry
    // direction after the fix.
    const boot = createSim(0xb007)
    expect(boot.centis).toBe(CENTIS_INIT)
    expect(boot.frame, 'createSim boots on frame 0').toBe(0)
    for (const seg of boot.segs) {
      expect(seg.dv, 'boot vertical step = CENTIS_INIT').toBe(CENTIS_INIT)
      expect(seg.dh, 'boot frame 0 (frame&2 == 0) enters -CENTIS (leftward)').toBe(-CENTIS_INIT)
    }
  })

  it('a death on wave 2 respawns the train at the RAMPED centis (1), not the boot speed — CT-65 reads state.centis', () => {
    // Reach wave 2 legitimately so centis has ramped to 1 (below 40,000).
    let s: SimState = createSim(0xdead2)
    s = { ...s, segs: s.segs.map((seg) => ({ ...seg, pic: seg.pic | DEAD_BIT })) }
    for (let i = 0; i < WAVE_DELAY + 12 && s.wave === 1; i++) s = stepSim(s, NO_INPUT)
    expect(s.wave, 'reached wave 2').toBe(2)
    expect(s.centis, 'wave-2 centis has ramped to 1').toBe(CENTIS_SLOW)

    // Force a player death: one live head sitting exactly on the gun.
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }
    s = { ...s, segs: [onGun] }
    let recovered = false
    for (let i = 0; i < 4000 && !recovered; i++) {
      s = stepSim(s, NO_INPUT)
      if (s.lives === STARTING_LIVES - 1 && s.delay === 0 && !s.gameOver) recovered = true
    }
    expect(recovered, 'the death pause ends in a respawn').toBe(true)

    // The respawn re-lays a fresh train (CENTPC, :396) — a DEATH does NOT change
    // centis (:459-460 gate skips the cadence when segments are still alive), so the
    // respawned train must march at the ramped 1, not the boot 2.
    expect(s.centis, 'a death leaves centis unchanged').toBe(CENTIS_SLOW)
    // cp4-2 forward-compat: the wave-2 respawn is fragmented (11 connected + 1 loose
    // head). The connected block marches at state.centis; the loose head has its own
    // dv=2 (pinned in fragmented-train.test.ts), so it is excluded from this pin.
    const live = liveSegs(s.segs)
    expect(live.length, 'a full 12-object train respawns (connected + loose)').toBe(NCENT)
    for (const seg of s.segs.slice(0, s.centin)) {
      expect(seg.dv, 'respawn connected vertical step = state.centis (1)').toBe(CENTIS_SLOW)
      expect(Math.abs(seg.dh), 'respawn connected |horizontal step| = state.centis (1)').toBe(CENTIS_SLOW)
    }
  })
})
