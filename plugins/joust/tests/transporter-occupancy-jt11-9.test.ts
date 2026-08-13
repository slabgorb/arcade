// tests/transporter-occupancy-jt11-9.test.ts
//
// Story jt11-9 — RED phase (Han Solo / TEA). An arrival must STAND on its
// transporter pad before its brain flies it away, and the standing period is a
// DIFFERENT constant from the materialisation collision window. Filed as a
// Delivery Finding by jt11-4, which wired the serve QUEUE but left the pad
// itself unmodelled — see the story context.
//
// ─── WHAT THE PORT DOES TODAY (the defect) ──────────────────────────────────
// A served enemy is born ON its pad and its flight brain starts closing the gap
// on the very next frames — measured on seed 0x1234, 1P: the first bird (id
// 256) is born on frame 62 at the TR3 pad, holds for a handful of frames while
// its walking-speed ladder spins up from zero, then drifts off. There is no
// 30-frame plant. `MATERIALISE_WINDOW` (120) is the collisions-disabled window
// (`stepMaterialise`), NOT the ROM's standing period.
//
// ─── WHAT THE MACHINE DOES (JOUSTRV4.SRC, read for this story) ───────────────
// The transporter serve path plants the arrival on the pad for thirty frames:
//
//     GOTTR   INC   [TCURUSE,X]  ; the pad is now IN USE (JOUSTRV4.SRC:5710)
//             …
//             LDA   #30          ; STAND for thirty frames…
//             STA   PFRAME       ; …drawn lit on the transporter (JOUSTRV4.SRC:5726-5727)
//
// The collision window is a separate law entirely — collisions stay disabled for
// the whole materialisation (PCNAP / PLYINT, JOUSTRV4.SRC:5828-5892,5923-5925),
// which the port sizes at 120 frames. Thirty and one-hundred-twenty are two
// constants doing two jobs; conflating them either quadruples the plant (jamming
// the pads) or makes the arrival vulnerable the instant it lands.
//
// ─── THE OBSERVABLE, fix-agnostic ───────────────────────────────────────────
// Nothing here names a field Dev must invent. The suite drives
// `createWaveSim`/`stepSim` and reads the served enemy's ENTITY position and its
// `collisionEnabled` flag off `sim.processes` — the same set `drawList` blits and
// `collisionPass` admits. A faithful plant shows the position pinned to the pad
// for thirty frames and only then moving; the collision flag stays off well past
// the plant, because the window it belongs to is longer.

import { describe, it, expect } from 'vitest'
import { createWaveSim, stepSim, type SimState } from '../src/core/sim.js'
import { enterViaPads, PADS } from '../src/core/transporter.js'

const SEED = 0x1234

/** `LDA #30 / STA PFRAME` — the arrival stands planted on the pad for thirty
 *  frames (JOUSTRV4.SRC:5726-5727). Mirrored here rather than imported so the
 *  suite pins the ROM figure, not whatever the port happens to hold. */
const STAND_FRAMES = 30

interface FirstEnemyTrack {
  /** Frame the first enemy first appeared in `sim.processes`, or -1. */
  birth: number
  id: number
  /** The pad the enemy was born on — its entity position on its birth frame. */
  padX: number
  padY: number
  /** Entity posX per present frame, index 0 = birth frame. */
  posX: number[]
  /** Entity posY (<<8 fixed point) per present frame, index 0 = birth frame. */
  posY: number[]
  /** `collisionEnabled` per present frame, index 0 = birth frame. */
  coll: boolean[]
}

/**
 * Walk `frames` frames of a seeded 1P game and track the FIRST enemy served —
 * its birth frame, the pad it was born on, and its position + collision flag on
 * every frame it is present. The enemy is NOT hushed: its brain runs, which is
 * the whole point — today it drifts off the pad, and the plant must stop it.
 */
function trackFirstEnemy(frames: number): FirstEnemyTrack {
  let d: SimState = createWaveSim(SEED, 1)
  let birth = -1
  let id = -1
  let padX = 0
  let padY = 0
  const posX: number[] = []
  const posY: number[] = []
  const coll: boolean[] = []
  for (let f = 0; f < frames; f++) {
    const e = d.sim.processes.find((p) => p.kind === 'enemy' && (id < 0 || p.id === id))
    if (e) {
      const ex = e.enemy?.entity.posX as number
      const ey = e.enemy?.entity.posY as number
      if (birth < 0) {
        birth = f
        id = e.id
        padX = ex
        padY = ey
      }
      if (e.id === id) {
        posX.push(ex)
        posY.push(ey)
        coll.push(!!e.collisionEnabled)
      }
    }
    d = stepSim(d, {})
  }
  return { birth, id, padX, padY, posX, posY, coll }
}

describe('jt11-9 — an arrival stands on its transporter pad before it flies (AC-1)', () => {
  it('is born ON a real transporter pad', () => {
    const t = trackFirstEnemy(80)
    expect(t.birth, 'a wave-1 enemy must be served through the transporter').toBeGreaterThanOrEqual(0)
    // The birth position must be one of the four evaluated pads — not an
    // arbitrary spot. TPOSX/TPOSY per pad (JOUSTRV4.SRC:5587-5590).
    const onAPad = PADS.some((p) => p.x === t.padX && (p.y << 8) === t.padY)
    expect(onAPad, `the arrival must be born on a pad; born at (${t.padX}, ${t.padY >> 8})`).toBe(true)
  })

  it('stays pinned to its pad for the full 30-frame stand, then the brain takes over', () => {
    const t = trackFirstEnemy(120)
    expect(t.posX.length, 'the enemy must remain present across the whole stand window').toBeGreaterThan(
      STAND_FRAMES + 20,
    )
    // RED today: posY drifts within a couple of frames and posX within a
    // handful, because nothing plants the arrival — its walking-speed ladder
    // simply spins up from zero and it slides off the pad.
    for (let k = 0; k < STAND_FRAMES; k++) {
      expect(t.posX[k], `posX must stay pad-constant during the ${STAND_FRAMES}-frame stand; drifted at birth+${k}`).toBe(
        t.padX,
      )
      expect(t.posY[k], `posY must stay pad-constant during the ${STAND_FRAMES}-frame stand; drifted at birth+${k}`).toBe(
        t.padY,
      )
    }
    // Non-vacuity control: a bird that never moves at all also satisfies the
    // constancy above. After the plant ends the flight brain MUST take it off
    // the pad. This also catches the mirror error — reusing the 120-frame
    // window for the plant would leave it still pinned here.
    const afterX = t.posX.slice(STAND_FRAMES, STAND_FRAMES + 30)
    const afterY = t.posY.slice(STAND_FRAMES, STAND_FRAMES + 30)
    const moved = afterX.some((x) => x !== t.padX) || afterY.some((y) => y !== t.padY)
    expect(moved, 'once the 30-frame stand ends the brain must move the bird off the pad (not frozen, not a 120-frame plant)').toBe(
      true,
    )
  })
})

describe('jt11-9 — the 30-frame stand is a DIFFERENT constant from the 120-frame collision window (AC-2)', () => {
  it('collisions stay disabled well past the stand — the window is longer than the plant', () => {
    // A Dev who "simplifies" by reusing `MATERIALISE_WINDOW` for the stand would
    // shrink the collisions-disabled window to 30 and re-enable collisions at
    // birth+40. The window is the jt2-6 `stepMaterialise` law (collisions off
    // for the whole materialisation, JOUSTRV4.SRC:5828-5892); it must outlive
    // the plant. Green today and must stay so: coll[40] is false now.
    const t = trackFirstEnemy(130)
    expect(t.coll.length, 'the enemy must be observed past birth+40').toBeGreaterThan(40)
    expect(
      t.coll[40],
      'collisions must still be disabled at birth+40 — the collision window is 120, not the 30-frame stand',
    ).toBe(false)
  })
})

describe('jt11-9 — determinism and the existing no-contention behaviour are preserved (AC-5)', () => {
  it('the pad PREFERENCE draw is unchanged — the VRAND fall-through only bites on contention', () => {
    // The ROM's CREALL does `JSR VRAND` then falls through GOTR1..GOTR4
    // (JOUSTRV4.SRC:5678-5709): a random PREFERENCE plus a deterministic
    // fall-through. With no pad in use the fall-through is a no-op, so every
    // arrival lands on exactly the pad `enterViaPads` draws today. Golden,
    // measured on develop before this story.
    expect(enterViaPads(3, SEED).map((e) => e.pad)).toEqual(['TR3', 'TR4', 'TR1'])
    expect(enterViaPads(4, SEED).map((e) => e.pad)).toEqual(['TR3', 'TR4', 'TR1', 'TR4'])
  })

  it('a seeded 1P game replays a bit-identical arrival timeline', () => {
    // Pure over the seed: same seed, same frames, same positions. If the plant
    // introduced any ambient input the two walks would diverge.
    const a = trackFirstEnemy(120)
    const b = trackFirstEnemy(120)
    expect({ birth: b.birth, id: b.id, padX: b.padX, padY: b.padY, posX: b.posX, posY: b.posY }).toEqual({
      birth: a.birth,
      id: a.id,
      padX: a.padX,
      padY: a.padY,
      posX: a.posX,
      posY: a.posY,
    })
  })
})
