// plugins/missile-command/src/core/drone.ts
//
// Story mc8-4 (GREEN, Loki) — the cruise/Sputnik descending DRONE, the one PARAMETRIC
// (non-table) voice in W3SOUN. mc8-2 shipped the drone's start/stop LIFECYCLE; this is
// its pitch SWEEP. Pure, deterministic and node-testable: the shell engine (audio.ts)
// feeds the returned AUDF1+6 (voice-4 frequency) to POKEY each frame while the drone runs.
//
// PMRBIL (A35820.1C = W3SOUN, .RADIX 16 — physical lines cited): each frame collapses the
// MRBILL request bits to an index (ROL x3 / AND 3 → 1=Sputnik, 2=Cruise, 3=both), reads the
// running freq, and if it is AT that type's BOTTOM resets to its TOP, else DECREMENTS by 2
// (SEC / SBC I,2), then stores to AUDF1+6. So the pitch descends TOP->BOTTOM by 2 and wraps.
// The LIVE TRIGGER (start on cruise/Sputnik presence, gated by CRMONS) is mc8-5 — this
// module is the VOICE only; nothing here decides WHEN the drone runs.

/** Which descending drone is sounding — the MRBILL index (1=Sputnik, 2=Cruise, 3=both). */
export type DroneKind = 'sputnik' | 'cruise' | 'both'

// Per-type sweep bounds on AUDF1+6, indexed 1=Sputnik/2=Cruise/3=both (A35820.1C:354-355):
//   TOP:    .BYTE 70,30,30   (A35820.1C:355)  → Sputnik ceiling 0x70, Cruise/Both 0x30
//   BOTTOM: .BYTE 30,0,0     (A35820.1C:354)  → Sputnik floor 0x30, Cruise/Both 0
// Values are hex under the inherited .RADIX 16 (claims SOUND-DRONE-TOP-70 / -BOTTOM-30).
const TOP: Readonly<Record<DroneKind, number>> = { sputnik: 0x70, cruise: 0x30, both: 0x30 }
const BOTTOM: Readonly<Record<DroneKind, number>> = { sputnik: 0x30, cruise: 0, both: 0 }

// PMRBIL decrements the drone frequency by 2 each frame (SBC I,2, A35820.1C).
const STEP = 2

// The drone's voice-4 frequency (AUDF1+6) at sweep `frame` for `kind`. Starts at TOP,
// descends by STEP each frame, and wraps back to TOP once it reaches BOTTOM — the PMRBIL
// sweep (A35820.1C:354-355). Pure and deterministic; frame 0 is TOP. (Line comments, not
// JSDoc: the core citation scanner strips `//` but reads numbers inside `/** */`.)
export function droneSweep(frame: number, kind: DroneKind): number {
  const top = TOP[kind]
  const bottom = BOTTOM[kind]
  const values = (top - bottom) / STEP + 1 // distinct freqs in one TOP..BOTTOM cycle (both ends)
  const pos = ((frame % values) + values) % values
  return top - pos * STEP
}
