// tests/core/radar-sweep.test.ts
//
// Story bz3-7 — RED phase (O'Brien / TEA). Cluster C7; pins audit findings
// D-001 (sweep rate), D-002 (blip afterglow/decay), D-003 (sweep-gating), and
// D-005 (max-range drop). The clone computes a sweep angle but never gates the
// blip list with it, so every target shows CONTINUOUSLY instead of flashing as
// the rotating arm passes. These tests pin the ROM's DRADAR behaviour.
//
// PRIMARY SOURCE: /Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC,
// routine DRADAR (BZONE.MAC:3888-4060), JSRed once per display frame at
// BZONE.MAC:510 — so the sweep is FRAME-driven, not $INTCT-driven. Every magic
// number below is inside the file's `.RADIX 16` region (BZONE.MAC:3 governs
// through :4878), so 0B/0C/0F0/80 are HEX. Confirmed against the citable
// LF-only mirror (battlezone-source-text), NOT the CRLF sibling.
//
// ─── CONTRACT for the GREEN phase (Julia / DEV) ──────────────────────────────
// Keep `deriveRadar` (pure geometry: bearing/range + kind filter) and
// `sweepAngle`/`SWEEP_PERIOD_MS` as-is EXCEPT re-derive SWEEP_PERIOD_MS to the
// ROM 1489 ms. Add a deterministic, PURE frame-driven radar state machine that
// OWNS the sweep, the per-target blip brightness, and the max-range drop —
// the analog of the ROM's once-per-frame DRADAR. Suggested surface (the tests
// below pin behaviour, not internal representation):
//
//   // ROM magnitudes (each cited to BZONE.MAC), all decimal in TS:
//   export const SWEEP_STEP_PER_FRAME   // 11   (0x0B, :3895 "INCREMENT SWEEP ANGLE")
//   export const SWEEP_BYTE_TURN        // 256  (8-bit BAM full turn; SIN/COS take a byte)
//   export const BLIP_PEAK              // 240  (0xF0, :3947-3948 "SET BRIGHTNESS OF BLIP")
//   export const BLIP_DECAY_PER_FRAME   // 8    (:4058-4059 SBC I,8 / STA BLIP)
//   export const BLIP_WINDOW            // 12   (0x0C, :3945 CMP I,0C — [0,0x0C) trailing gate)
//   export const RADAR_MAX_RANGE        // 32768 = 0x8000; high byte 0x80 (:3977 CMP I,80)
//   export const SWEEP_PERIOD_MS        // 256/11/GAME_FRAME_HZ*1000 ≈ 1489  (was 2000)
//
//   export interface RadarState { readonly sweep: number /* byte-angle [0,256) */ }
//   export interface LitBlip { readonly bearing: number; readonly range: number
//                              readonly brightness: number /* peak 240, −8/frame */ }
//   export function initRadarState(): RadarState
//   // Advance ONE game frame: rotate sweep +11, re-light blips the arm crossed
//   // to 240, decay ALL blips −8, DROP contacts past RADAR_MAX_RANGE. Pure — new
//   // state out, input state/contacts never mutated. Returns only LIT, in-range
//   // blips (brightness > 0). Internally builds on deriveRadar for bearing/range.
//   export function stepRadar(
//     state: RadarState, pose: TankPose, contacts: readonly RadarContact[],
//   ): { readonly state: RadarState; readonly blips: readonly LitBlip[] }
//
// The shell then drives stepRadar once per frame (deterministic sweep in state,
// replacing sweepAngle(performance.now())), renders each LitBlip at its
// brightness, and draws the arm from state.sweep — and DROPS out-of-range blips
// instead of the render.ts:202 `Math.min(range/RADAR_RANGE, 1)` edge-clamp.
//
// Loaded defensively (await import in beforeAll): during RED the new exports do
// not exist, so every invariant reports a clean assertion failure — the exact
// contract DEV must satisfy — rather than one opaque resolution error.

import { describe, it, expect, beforeAll } from 'vitest'
import type { TankPose } from '../../src/core/camera'
import { GAME_FRAME_HZ } from '../../src/core/timebase'

type RadarContactKind = 'tank' | 'super-tank' | 'missile' | 'saucer' | 'obstacle'

interface RadarContact {
  readonly x: number
  readonly z: number
  readonly kind: RadarContactKind
}

interface RadarState {
  readonly sweep: number
}

interface LitBlip {
  readonly bearing: number
  readonly range: number
  readonly brightness: number
}

interface RadarStep {
  readonly state: RadarState
  readonly blips: readonly LitBlip[]
  /** bz3-10 (U-009, review round 2) — whether a contact was FRESHLY re-lit to
   *  peak this call, RBEEP's trigger. Optional so this file still type-checks
   *  against a pre-bz3-10 radar.ts. */
  readonly litThisFrame?: boolean
}

type RadarModule = {
  SWEEP_STEP_PER_FRAME?: number
  SWEEP_BYTE_TURN?: number
  BLIP_PEAK?: number
  BLIP_DECAY_PER_FRAME?: number
  BLIP_WINDOW?: number
  RADAR_MAX_RANGE?: number
  SWEEP_PERIOD_MS?: number
  initRadarState?: () => RadarState
  stepRadar?: (state: RadarState, pose: TankPose, contacts: readonly RadarContact[]) => RadarStep
}

let mod: RadarModule = {}

// A missing export becomes a loud, deterministic failure naming the exact export
// DEV must provide, rather than a crash during collection.
const constant = (name: keyof RadarModule): number => {
  const v = mod[name]
  if (typeof v !== 'number') throw new Error(`radar.ts must export a numeric ${String(name)}`)
  return v
}
const initRadarState = (): RadarState => {
  if (!mod.initRadarState) throw new Error('radar.ts must export initRadarState()')
  return mod.initRadarState()
}
const stepRadar = (
  state: RadarState,
  pose: TankPose,
  contacts: readonly RadarContact[],
): RadarStep => {
  if (!mod.stepRadar) throw new Error('radar.ts must export stepRadar()')
  return mod.stepRadar(state, pose, contacts)
}

const AT_ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }

/** Drive the frame-stepper N frames over one fixed target, return the per-frame
 *  brightness sequence (0 when the target is not painted that frame). */
const brightnessSeries = (target: RadarContact, frames: number): number[] => {
  let s = initRadarState()
  const seq: number[] = []
  for (let i = 0; i < frames; i++) {
    const r = stepRadar(s, AT_ORIGIN, [target])
    s = r.state
    seq.push(r.blips.length > 0 ? r.blips[0].brightness : 0)
  }
  return seq
}

beforeAll(async () => {
  try {
    mod = (await import('../../src/core/radar')) as RadarModule
  } catch {
    mod = {}
  }
})

// ─── AC-2 — sweep rate corrected to +0x0B/frame → 1489 ms/rev ────────────────
describe('AC-2 sweep rate — +0x0B (11) byte-angle units per frame, frame-driven', () => {
  it('SWEEP_STEP_PER_FRAME is 11 (0x0B, BZONE.MAC:3895 "LDA I,0B ;C INCREMENT SWEEP ANGLE")', () => {
    expect(constant('SWEEP_STEP_PER_FRAME')).toBe(11)
  })

  it('SWEEP_BYTE_TURN is 256 (8-bit BAM full turn; SANGLE is a byte, SIN/COS take a byte)', () => {
    expect(constant('SWEEP_BYTE_TURN')).toBe(256)
  })

  it('stepRadar advances the sweep by exactly +11 byte-units each frame (mod 256), even with no contacts', () => {
    // SANGLE += 0x0B at the TOP of DRADAR (BZONE.MAC:3895-3898), before TRACK —
    // so the arm rotates every frame regardless of any target.
    const step = constant('SWEEP_STEP_PER_FRAME')
    const turn = constant('SWEEP_BYTE_TURN')
    let s = initRadarState()
    for (let i = 0; i < 40; i++) {
      const r = stepRadar(s, AT_ORIGIN, [])
      const delta = ((r.state.sweep - s.sweep) % turn + turn) % turn
      expect(delta).toBe(step)
      expect(r.state.sweep).toBeGreaterThanOrEqual(0)
      expect(r.state.sweep).toBeLessThan(turn)
      s = r.state
    }
  })

  it('one revolution = 256/11 ≈ 23.27 frames → 1489 ms/rev at 15.625 Hz (NOT the clone 2000, NOT the 60 Hz false-match 388)', () => {
    const framesPerRev = constant('SWEEP_BYTE_TURN') / constant('SWEEP_STEP_PER_FRAME')
    expect(framesPerRev).toBeCloseTo(23.27, 1)
    const derivedPeriodMs = (framesPerRev / GAME_FRAME_HZ) * 1000 // 256/11/15.625*1000 = 1489.45
    expect(derivedPeriodMs).toBeCloseTo(1489.45, 0)

    const period = constant('SWEEP_PERIOD_MS')
    expect(period).toBeCloseTo(derivedPeriodMs, 0) // dev re-derives; 1489 or 1489.45 both pass
    expect(Math.abs(period - 2000)).toBeGreaterThan(400) // NOT the clone's unsourced 2000
    expect(Math.abs(period - 388)).toBeGreaterThan(400) //  NOT the ruled-out 60 Hz 388
  })
})

// ─── AC-1 — sweep-gated PULSING blips with 0xF0 / −8/frame afterglow ──────────
describe('AC-1 blip lifecycle — re-lit to 0xF0 on a sweep pass, then −8/frame afterglow', () => {
  it('BLIP_PEAK is 240 (0xF0, BZONE.MAC:3947-3948 "SET BRIGHTNESS OF BLIP")', () => {
    expect(constant('BLIP_PEAK')).toBe(240)
  })

  it('BLIP_DECAY_PER_FRAME is 8 (BZONE.MAC:4058-4059 "SBC I,8" / "STA BLIP")', () => {
    expect(constant('BLIP_DECAY_PER_FRAME')).toBe(8)
  })

  it('BLIP_WINDOW is 12 (0x0C, BZONE.MAC:3945 "CMP I,0C" — the [0,0x0C) trailing gate)', () => {
    expect(constant('BLIP_WINDOW')).toBe(12)
  })

  it('afterglow spans 240/8 = 30 frames ≈ 1.92 s (D-002)', () => {
    const frames = constant('BLIP_PEAK') / constant('BLIP_DECAY_PER_FRAME')
    expect(frames).toBe(30)
    expect(frames / GAME_FRAME_HZ).toBeCloseTo(1.92, 2) // 30 / 15.625 = 1.92 s
  })

  it('an in-range target PULSES: peaks at 240 on each pass, fades −8/frame between, never continuous', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const peak = constant('BLIP_PEAK')
    const target: RadarContact = { x: 0, z: maxRange * 0.5, kind: 'tank' } // well in range, dead ahead
    const seq = brightnessSeries(target, 72) // ~3 revolutions (23.27 frames each)

    // Reaches full brightness (the arm passes it) …
    expect(Math.max(...seq)).toBe(peak)
    // … and fades substantially between passes — NOT lit at full strength every
    // frame the way the current continuous model paints it.
    expect(Math.min(...seq)).toBeLessThan(peak)
    // The blip is bright only a small fraction of the time (sweep-GATED, not continuous).
    const atPeak = seq.filter((b) => b === peak).length
    expect(atPeak).toBeLessThan(seq.length * 0.3)
  })

  it('every brightness transition is a −8 decay or a re-light to 240 — nothing stays constant (kills the continuous model)', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const peak = constant('BLIP_PEAK')
    const decay = constant('BLIP_DECAY_PER_FRAME')
    const target: RadarContact = { x: 0, z: maxRange * 0.5, kind: 'tank' }
    const seq = brightnessSeries(target, 72)

    const illegal: string[] = []
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1]
      const cur = seq[i]
      const ok =
        prev === 0 || //            warm-up before the first pass
        cur === peak || //          re-light to 0xF0 (may span 2 frames when window straddles 0)
        cur === prev - decay //     afterglow decay −8/frame
      if (!ok) illegal.push(`frame ${i}: ${prev} → ${cur}`)
    }
    expect(illegal, `illegal transitions (expected only −${decay} decay or →${peak} re-light): ${illegal.join(', ')}`).toEqual([])

    // Proof BOTH halves of the lifecycle actually occur:
    const relights = seq.filter((b, i) => b === peak && seq[i - 1] !== peak).length
    const decaySteps = seq.filter((b, i) => i > 0 && b === seq[i - 1] - decay).length
    expect(relights).toBeGreaterThanOrEqual(2) // the arm passes ~once/rev → ~3 over 72 frames
    expect(relights).toBeLessThanOrEqual(8) //   but NOT every frame (that would be continuous)
    expect(decaySteps).toBeGreaterThanOrEqual(10) // long afterglow tails between passes
  })

  it('stepRadar is deterministic and does not mutate its input state or contacts', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const contacts: RadarContact[] = [{ x: 0, z: maxRange * 0.5, kind: 'tank' }]
    const snapshot = JSON.stringify(contacts)
    const s0 = initRadarState()
    const s0Snapshot = JSON.stringify(s0)

    const a = stepRadar(s0, AT_ORIGIN, contacts)
    const b = stepRadar(s0, AT_ORIGIN, contacts)

    // Identical inputs → identical outputs (no ambient state / clock / randomness).
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    // Input state and contacts are untouched.
    expect(JSON.stringify(s0)).toBe(s0Snapshot)
    expect(JSON.stringify(contacts)).toBe(snapshot)
  })
})

// ─── bz3-10 (U-009) — litThisFrame: RBEEP's rising-edge trigger, review round 2 ──
// A dispatch-level unit test (audio-cue-triggers.test.ts) proves the MAP from
// `radar-blip` to `rbeep`, but nothing previously drove `stepRadar` itself to
// prove core ever surfaces a genuine, non-vacuous edge. Deleting the
// `litThisFrame` flag, or the `prev !== BLIP_PEAK` edge-guard that stops the
// window-vs-step overlap from double-counting one sweep pass, must fail here.
describe('litThisFrame — the RBEEP rising edge (bz3-10 / U-009, review rework)', () => {
  /** Drive N frames over one fixed target, returning the per-frame
   *  `litThisFrame` sequence (mirrors `brightnessSeries` above). */
  const litSeries = (target: RadarContact, frames: number): boolean[] => {
    let s = initRadarState()
    const seq: boolean[] = []
    for (let i = 0; i < frames; i++) {
      const r = stepRadar(s, AT_ORIGIN, [target])
      s = r.state
      seq.push(r.litThisFrame === true)
    }
    return seq
  }

  it('fires exactly once per sweep pass, never on consecutive frames (kills the 11-vs-12 double-fire)', () => {
    // Byte offset 8 is a bearing chosen OFFLINE (verified against the raw
    // sweep/window arithmetic, not just this bug's own fix) to land on a
    // sweep pass whose RAW `inWindow` check hits TWO consecutive frames
    // (24 and 25) — the exact 11-vs-12 overlap the LOW finding named.
    // Deleting the `prev !== BLIP_PEAK` edge-guard reproduces that double-hit
    // and this test catches it directly, rather than hoping an arbitrary
    // bearing happens to land on the overlap.
    const targetByte = 8
    const bearing = (targetByte / constant('SWEEP_BYTE_TURN')) * Math.PI * 2
    const maxRange = constant('RADAR_MAX_RANGE')
    const R = maxRange * 0.5
    const target: RadarContact = { x: R * Math.sin(bearing), z: R * Math.cos(bearing), kind: 'tank' }
    const seq = litSeries(target, 72) // ~3 revolutions (23.27 frames each)

    // The arm must actually pass the target several times — a deleted flag
    // or an always-false stub would make this vacuous.
    const lit = seq.filter(Boolean).length
    expect(lit, 'staging: the sweep must pass the target across 3 revolutions').toBeGreaterThanOrEqual(3)
    expect(lit, 'the window(12) vs step(11) overlap must not double-fire a pass').toBeLessThanOrEqual(5)

    // No two TRUE frames back-to-back — each pass is a single rising edge,
    // never a 2-frame plateau (the exact double-fire the LOW finding named,
    // reproducible at this bearing without the `prev !== BLIP_PEAK` guard).
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] && seq[i - 1]) {
        expect.unreachable(`frames ${i - 1} and ${i} both fired — a pass double-fired`)
      }
    }
  })

  it('a far, never-in-window target never lights (no phantom fires off an empty sweep)', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const far: RadarContact = { x: 0, z: maxRange * 2, kind: 'tank' } // past RADAR_MAX_RANGE
    const seq = litSeries(far, 40)
    expect(seq.some(Boolean)).toBe(false)
  })

  it('stays false every frame with no contacts at all', () => {
    let s = initRadarState()
    for (let i = 0; i < 30; i++) {
      const r = stepRadar(s, AT_ORIGIN, [])
      expect(r.litThisFrame === true).toBe(false)
      s = r.state
    }
  })
})

// ─── AC-3 — targets past maximum range are DROPPED, not clamped to the ring ──
describe('AC-3 max range — TDIST ≥ 0x80 is dropped (BZONE.MAC:3977 "CMP I,80 ;D IF OUT OF RANGE")', () => {
  it('RADAR_MAX_RANGE is 0x8000 = 32768 (high byte 0x80; matches the shell RADAR_RANGE)', () => {
    // 0x8000 is the smallest distance whose high byte reaches 0x80, so
    // range ≥ 0x8000 ⇔ TDIST ≥ 0x80 ⇔ out of range. render.ts:74 already carries
    // RADAR_RANGE = 32768 — the clone clamps to it (render.ts:202) instead of dropping.
    expect(constant('RADAR_MAX_RANGE')).toBe(0x8000)
  })

  it('a target BEYOND max range is dropped — no blip across a full revolution (not clamped to the edge)', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const far: RadarContact = { x: 0, z: maxRange * 2, kind: 'tank' } // clearly out of range
    let s = initRadarState()
    let everPainted = false
    for (let i = 0; i < 30; i++) {
      // > one revolution (23.27 frames) — the arm crosses the target's bearing and
      // must STILL not paint it, unlike the clone's ring-edge clamp.
      const r = stepRadar(s, AT_ORIGIN, [far])
      if (r.blips.length > 0) everPainted = true
      s = r.state
    }
    expect(everPainted).toBe(false)
  })

  it('a target WITHIN max range IS painted when the arm passes it', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const near: RadarContact = { x: 0, z: maxRange * 0.5, kind: 'tank' }
    const seq = brightnessSeries(near, 30)
    expect(Math.max(...seq)).toBeGreaterThan(0) // lit at least once → in-range targets still scan
  })

  it('the boundary is exclusive at the top: a target exactly at RADAR_MAX_RANGE is out of range (≥ drops)', () => {
    const maxRange = constant('RADAR_MAX_RANGE')
    const onEdge: RadarContact = { x: 0, z: maxRange, kind: 'tank' } // range === RADAR_MAX_RANGE
    let s = initRadarState()
    let everPainted = false
    for (let i = 0; i < 30; i++) {
      const r = stepRadar(s, AT_ORIGIN, [onEdge])
      if (r.blips.length > 0) everPainted = true
      s = r.state
    }
    expect(everPainted).toBe(false)
  })
})
