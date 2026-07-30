// tests/death-restor.test.ts
//
// Story cp2-5 — RED phase (O'Brien / TEA). The capstone: player DEATH (PLAY,
// CENTI4.MAC:1775), the frame-stepped RESTOR mushroom sweep (CENTI4.MAC:1829),
// and the wave-1 loop, assembled into the stepped SimState. Transcribed from
// rev-4 and pinned by CT-49..CT-71 in docs/rom-study/claims/09-centipede-train.json.
//
// ─── THE MODEL ───────────────────────────────────────────────────────────────────
// V=0xF8 is the TOP of the screen, V=8 the bottom player row (V decreases down).
// Two PURE building blocks + the assembled sim lifecycle are pinned here:
//   • checkPlayerContact(segs, player)         — PLAY (CT-49/50/51): the diamond hit
//   • stepRestor(field, mem, frame)            — RESTOR (CT-56/58/59/60/61): the sweep
//   • createSim/stepSim death+RESTOR+wave loop  — AC-1/AC-2/AC-3 integration
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// checkPlayerContact and stepRestor do not exist yet; SimState does not yet carry
// the train/lives/wave/death state. loadCp25() dynamic-imports the new surface and
// throws a self-describing "not built yet", so every assertion reddens for the
// FEATURE's absence, not a stack trace.

import { describe, it, expect } from 'vitest'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  MUSHROOM_FULL, // 0x3F full normal mushroom
  type Playfield,
} from '../src/core/playfield'

// ─── ROM constants this story transcribes (claims 09, hand-mirrored so the
//     expectations are self-checking, not echoes of the module) ──────────────────
const PLAY_H_WINDOW = 7 // CT-49 (:1785-1786 CMP I,07 / BCS ;DIFF>6)
const PLAY_V_WINDOW = 7 // CT-50 (:1792-1793 CMP I,7 / BCS ;DIFF>6)
const PLAY_SUM_WINDOW = 0x0c // CT-51 (:1795/1798 ADC X+Y / CMP I,0C)

const STARTING_LIVES = 3 // CT-67/68 (factory default *3; DIP range ((OPTNS>>2)&3)+2 ∈ [2,5])
const SCORE_RESTORE = 5 // PM-26 / CT-59 (:1856 LDA I,5)
const RESTOR_START = 0x400 // PM-22 / CT-55 (MEM armed to PLYFLD base)
const RESTOR_END = 0x7c0 // CT-61 (:1841-1842 sweep disarms at 0x07C0)

// Damage codes the RESTOR sweep must repair back to full (0x3F): CT-58 restores
// the WHOLE band 0x38-0x3E — partial NORMAL (0x3C-0x3E) AND poison (0x38-0x3B).
const MUSH_3_4 = 0x3e // a partial normal mushroom (one hit taken)
const POISON_FULL = 0x3b // a full POISON mushroom
const POISON_1_4 = 0x38 // a nearly-gone poison mushroom

// ─── the extended contract GREEN (Julia) builds ─────────────────────────────────
interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
}

interface Cp25Module {
  /** PLAY (CENTI4.MAC:1775, CT-49/50/51): true iff any LIVE segment overlaps the
   *  gun — |dH|<7 AND |dV|<7 AND |dH|+|dV| < 0x0C (a Manhattan diamond). Vacant
   *  (bit-7) segments never collide. */
  checkPlayerContact: (segs: Segment[], player: { h: number; v: number }) => boolean
  /** RESTOR one frame (CENTI4.MAC:1829, CT-56/58/59/60/61). Inactive unless
   *  frame&7==0. On an active frame it scans the field from `mem` (a ROM address
   *  0x0400-0x07C0) forward to the NEXT partial/poison mushroom (0x38-0x3E),
   *  restores it to 0x3F in place (+SCORE_RESTORE), and returns the advanced
   *  cursor; with no mushroom left before 0x07C0 it returns mem=RESTOR_END. */
  stepRestor: (field: Playfield, mem: number, frame: number) => { mem: number; scored: number }
  RESTOR_END: number
}

async function loadCp25(): Promise<Cp25Module> {
  try {
    const cent = (await import('../src/core/centipede')) as Record<string, unknown>
    const field = (await import('../src/core/playfield')) as Record<string, unknown>
    if (typeof cent.checkPlayerContact !== 'function') throw new Error('centipede.ts has no checkPlayerContact')
    if (typeof field.stepRestor !== 'function') throw new Error('playfield.ts has no stepRestor')
    return {
      checkPlayerContact: cent.checkPlayerContact as Cp25Module['checkPlayerContact'],
      stepRestor: field.stepRestor as Cp25Module['stepRestor'],
      RESTOR_END: field.RESTOR_END as number,
    }
  } catch (e) {
    throw new Error(
      'cp2-5 death/RESTOR surface not built yet — GREEN (Julia) adds checkPlayerContact ' +
        '(PLAY, CT-49/50/51) to src/core/centipede.ts and stepRestor (RESTOR, CT-56/58/59/60/61) + ' +
        'RESTOR_END to src/core/playfield.ts, then assembles the death/RESTOR/wave loop into ' +
        `src/core/sim.ts (see the story handoff for the full Dev contract). (${(e as Error).message})`,
    )
  }
}

// ─── PLAY — the player-collision diamond (AC-1, CT-49/50/51) ─────────────────────
describe('cp2-5 PLAY — gun-vs-segment contact kills the player (CT-49/50/51)', () => {
  const gun = { h: 0x80, v: 0x10 }
  const seg = (h: number, v: number, pic = 0x03): Segment => ({ h, v, dh: 2, dv: 2, pic })

  it('a live segment ON the gun is a hit (dH=dV=0, well inside the diamond)', async () => {
    const { checkPlayerContact } = await loadCp25()
    expect(checkPlayerContact([seg(gun.h, gun.v)], gun)).toBe(true)
  })

  it('rejects a horizontal gap of PLAY_H_WINDOW or more (< 7, CT-49)', async () => {
    const { checkPlayerContact } = await loadCp25()
    expect(checkPlayerContact([seg(gun.h + PLAY_H_WINDOW - 1, gun.v)], gun), '|dH|=6 collides').toBe(true)
    expect(checkPlayerContact([seg(gun.h + PLAY_H_WINDOW, gun.v)], gun), '|dH|=7 is out of the H window').toBe(false)
  })

  it('rejects a vertical gap of PLAY_V_WINDOW or more (< 7, CT-50)', async () => {
    const { checkPlayerContact } = await loadCp25()
    expect(checkPlayerContact([seg(gun.h, gun.v + PLAY_V_WINDOW - 1)], gun), '|dV|=6 collides').toBe(true)
    expect(checkPlayerContact([seg(gun.h, gun.v + PLAY_V_WINDOW)], gun), '|dV|=7 is out of the V window').toBe(false)
  })

  it('the binding test is the Manhattan diamond |dH|+|dV| < PLAY_SUM_WINDOW (0x0C, CT-51)', async () => {
    const { checkPlayerContact } = await loadCp25()
    // Both axes within 7, but the SUM decides: sum == PLAY_SUM_WINDOW-1 (11) hits,
    // sum == PLAY_SUM_WINDOW (12) misses.
    expect(checkPlayerContact([seg(gun.h + 5, gun.v + (PLAY_SUM_WINDOW - 1 - 5))], gun), 'sum 11 < 0x0C hits').toBe(
      true,
    )
    expect(checkPlayerContact([seg(gun.h + 6, gun.v + (PLAY_SUM_WINDOW - 6))], gun), 'sum 12 == 0x0C misses').toBe(
      false,
    )
  })

  it('a vacant/exploding segment (bit 7 set) never collides', async () => {
    const { checkPlayerContact } = await loadCp25()
    expect(checkPlayerContact([seg(gun.h, gun.v, 0xff)], gun), 'an exploding segment on the gun is not a contact').toBe(
      false,
    )
    expect(checkPlayerContact([seg(gun.h, gun.v, 0x80)], gun), 'a vacant slot on the gun is not a contact').toBe(false)
  })

  it('no live segment in range → no contact', async () => {
    const { checkPlayerContact } = await loadCp25()
    expect(checkPlayerContact([seg(gun.h + 40, gun.v), seg(gun.h, gun.v + 40)], gun)).toBe(false)
  })
})

// ─── RESTOR — the frame-stepped mushroom sweep (AC-2, CT-56/58/59/60/61) ─────────
describe('cp2-5 RESTOR — the sweep restores partial AND poison mushrooms at 5 pts (CT-58/59)', () => {
  /** ROM address for flat cell (h,v): MEM = 0x0400 + h*0x20 + v (CT-61). */
  const memOf = (h: number, v: number) => RESTOR_START + h * PLYFLD_STRIDE + v
  const plant = (f: Playfield, h: number, v: number, code: number) => {
    f.cells[h * PLYFLD_STRIDE + v] = code
  }

  it('does NO work on an inactive frame (frame&7 != 0) — cursor and field frozen (CT-56)', async () => {
    const { stepRestor } = await loadCp25()
    const field = createPlayfield()
    plant(field, 0, 0, MUSH_3_4)
    const before = Array.from(field.cells)
    const r = stepRestor(field, RESTOR_START, 3) // 3 & 7 != 0
    expect(r.scored, 'no score on an inactive frame').toBe(0)
    expect(r.mem, 'cursor does not advance on an inactive frame').toBe(RESTOR_START)
    expect(Array.from(field.cells), 'field untouched on an inactive frame').toEqual(before)
  })

  it('on an active frame restores the next partial NORMAL mushroom to full and scores 5 (CT-58/59)', async () => {
    const { stepRestor } = await loadCp25()
    const field = createPlayfield()
    plant(field, 0, 5, MUSH_3_4) // 0x3E one hit taken
    const r = stepRestor(field, RESTOR_START, 0) // 0 & 7 == 0 (active)
    expect(field.cells[0 * PLYFLD_STRIDE + 5], 'partial normal restored to full 0x3F').toBe(MUSHROOM_FULL)
    expect(r.scored, 'a restore scores 5 (SCORE_RESTORE)').toBe(SCORE_RESTORE)
    expect(r.mem, 'cursor advanced PAST the restored cell (CT-60)').toBe(memOf(0, 5) + 1)
  })

  it('restores POISON mushrooms too, into a NORMAL full mushroom (CT-58: whole 0x38-0x3E band)', async () => {
    const { stepRestor } = await loadCp25()
    for (const code of [POISON_FULL, POISON_1_4]) {
      const field = createPlayfield()
      plant(field, 2, 9, code)
      const r = stepRestor(field, RESTOR_START, 0)
      expect(field.cells[2 * PLYFLD_STRIDE + 9], `poison ${code.toString(16)} restored to normal full 0x3F`).toBe(
        MUSHROOM_FULL,
      )
      expect(r.scored, 'a poison restore also scores 5').toBe(SCORE_RESTORE)
    }
  })

  it('leaves a FULL mushroom and an EMPTY cell untouched (skips both, CT-58)', async () => {
    const { stepRestor } = await loadCp25()
    const field = createPlayfield()
    plant(field, 0, 0, MUSHROOM_FULL) // already full
    const r = stepRestor(field, RESTOR_START, 0)
    expect(field.cells[0], 'a full mushroom is not re-restored').toBe(MUSHROOM_FULL)
    // No partial anywhere → the sweep runs to the end and disarms (CT-61).
    expect(r.scored, 'nothing to restore → no score').toBe(0)
    expect(r.mem, 'exhausted sweep lands at RESTOR_END').toBe(RESTOR_END)
  })

  it('restores exactly ONE mushroom per active pass, in ascending ADDRESS order (CT-60/61)', async () => {
    const { stepRestor, RESTOR_END: end } = await loadCp25()
    const field = createPlayfield()
    // Three damaged cells, planted OUT of address order; the sweep must hit them
    // in ascending MEM (== flat offset h*0x20+v) order.
    const cells: Array<[number, number]> = [
      [3, 10], // offset 3*32+10 = 106
      [0, 20], // offset 20
      [1, 4], // offset 36
    ]
    for (const [h, v] of cells) plant(field, h, v, MUSH_3_4)
    const expectedOrder = cells
      .map(([h, v]) => h * PLYFLD_STRIDE + v)
      .sort((a, b) => a - b) // 20, 36, 106
    const restoredOrder: number[] = []
    let mem = RESTOR_START
    // Drive only ACTIVE frames (frame&7==0): 0, 8, 16, ...
    for (let frame = 0; frame < 8 * 200 && mem < end; frame += 8) {
      const before = Array.from(field.cells)
      const r = stepRestor(field, mem, frame)
      mem = r.mem
      if (r.scored > 0) {
        // find which cell changed to full this pass
        const idx = field.cells.findIndex((c, i) => c !== before[i])
        restoredOrder.push(idx)
        expect(r.scored, 'each pass scores exactly one 5-pt restore').toBe(SCORE_RESTORE)
      }
    }
    expect(restoredOrder, 'the sweep restores in ascending address order, one per active pass').toEqual(expectedOrder)
    expect(field.cells[3 * PLYFLD_STRIDE + 10], 'every planted cell ends full').toBe(MUSHROOM_FULL)
  })

  it('is deterministic — same field + same frame stream replays byte-identically (AC-2)', async () => {
    const { stepRestor, RESTOR_END: end } = await loadCp25()
    const build = () => {
      const f = createPlayfield()
      plant(f, 0, 6, MUSH_3_4)
      plant(f, 4, 12, POISON_FULL)
      plant(f, 9, 30, POISON_1_4)
      return f
    }
    const run = () => {
      const f = build()
      let mem = RESTOR_START
      let score = 0
      for (let frame = 0; frame < 8 * 400 && mem < end; frame += 8) {
        const r = stepRestor(f, mem, frame)
        mem = r.mem
        score += r.scored
      }
      return { cells: Array.from(f.cells), score }
    }
    const a = run()
    const b = run()
    expect(a.cells, 'identical field replay').toEqual(b.cells)
    expect(a.score, 'identical score replay').toBe(b.score)
    expect(a.score, 'three damaged mushrooms → 15 points').toBe(3 * SCORE_RESTORE)
  })
})

// ─── the assembled sim: DEATH → explosion → RESTOR → respawn (AC-1/AC-2/AC-3) ────
import { createSim, stepSim, cloneState, type SimState } from '../src/core/sim'

// The extended SimState the sim ASSEMBLY carries. We read these by name; if the
// module has not been extended they are `undefined` and the assertions redden.
type SimExt = SimState & {
  segs: Segment[]
  lives: number
  wave: number
  gameOver: boolean
  delay: number
}
const ext = (s: SimState) => s as SimExt

/** Force a death next frame: a live head sitting exactly on the gun. */
function segOnGun(s: SimState): Segment {
  return { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }
}

/** Damage a handful of the seeded mushrooms (and plant a poison one) so RESTOR
 *  has real work; returns the cell offsets and the count. */
function damageSomeMushrooms(field: Playfield): { offsets: number[]; count: number } {
  const offsets: number[] = []
  // Plant a deterministic, known set of damaged/poison cells on the lower field.
  const spec: Array<[number, number, number]> = [
    [5, 6, MUSH_3_4],
    [8, 7, POISON_FULL],
    [12, 3, MUSH_3_4],
    [20, 9, POISON_1_4],
  ]
  for (const [h, v, code] of spec) {
    const off = h * PLYFLD_STRIDE + v
    field.cells[off] = code
    offsets.push(off)
  }
  return { offsets, count: spec.length }
}

describe('cp2-5 sim assembly — createSim boots a wave-1 train + full lives', () => {
  it('carries the 12-segment train, STARTING_LIVES, wave 1, not game over', () => {
    const s = ext(createSim(0x1234))
    expect(Array.isArray(s.segs), 'SimState carries the centipede train').toBe(true)
    expect(s.segs.length, 'a fresh wave-1 train has 12 segments (NCENT)').toBe(12)
    expect(s.lives, 'boots with STARTING_LIVES (factory default 3)').toBe(STARTING_LIVES)
    expect(s.wave, 'boots on wave 1').toBe(1)
    expect(s.gameOver, 'not game over at boot').toBe(false)
  })
})

describe('cp2-5 sim assembly — DEATH spends a life and RESTOR repairs the field (AC-1/AC-2/AC-3)', () => {
  it('a segment on the gun kills the player: a life is spent, the field is repaired, a fresh train respawns', () => {
    let s = ext(createSim(0x2222))
    const { offsets } = damageSomeMushrooms(s.playfield)
    // Confirm the setup: those cells are damaged (not full) before death.
    for (const off of offsets) expect(s.playfield.cells[off], 'damaged before death').not.toBe(MUSHROOM_FULL)
    const scoreBefore = s.score
    // Put a head on the gun so the very next step triggers PLAY.
    s = ext({ ...s, segs: [segOnGun(s)] } as SimState)

    // Drive frames until the life is spent AND the sim is back in play (respawned).
    let recovered = false
    for (let i = 0; i < 4000 && !recovered; i++) {
      s = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
      if (s.lives === STARTING_LIVES - 1 && s.delay === 0 && !s.gameOver) recovered = true
    }
    expect(recovered, 'the death pause ends with a respawn within the frame budget').toBe(true)
    expect(s.lives, 'exactly one life is spent per death (CT-65)').toBe(STARTING_LIVES - 1)

    // AC-2/AC-3: RESTOR ran during the pause — every damaged mushroom is full again.
    for (const off of offsets) {
      expect(s.playfield.cells[off], `RESTOR restored cell ${off} to full`).toBe(MUSHROOM_FULL)
    }
    // AC-2: each restored mushroom scored 5 (score rose by at least 5 * count).
    expect(s.score - scoreBefore, 'the restore sweep awarded 5 per mushroom').toBeGreaterThanOrEqual(
      5 * offsets.length,
    )
    // AC-3: respawn lays a fresh wave-1 train, not a leftover exploding one.
    expect(s.segs.length, 'a fresh 12-segment train respawns').toBe(12)
    expect(s.segs.every((seg) => (seg.pic & 0x80) === 0), 'the respawned train is all live (no explosions)').toBe(true)
  })

  it('the player explosion animation actually plays before respawn (AC-1 explosion frames)', () => {
    let s = ext(createSim(0x3333))
    s = ext({ ...s, segs: [segOnGun(s)] } as SimState)
    // Over the death pause the sim must enter a "player dead / exploding" state
    // (delay armed) before it returns to play — the explosion is not skipped.
    let sawDeathPause = false
    for (let i = 0; i < 200; i++) {
      s = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
      if (s.delay > 0) sawDeathPause = true
      if (sawDeathPause && s.delay === 0) break
    }
    expect(sawDeathPause, 'death arms a DELAY pause (the explosion plays out, CT-52/54)').toBe(true)
  })
})

describe('cp2-5 sim assembly — GAME OVER on the last life, restart re-enters wave 1 (AC-1)', () => {
  it('dying with one life left ends the game', () => {
    let s = ext({ ...createSim(0x4444), lives: 1 } as SimState)
    s = ext({ ...s, segs: [segOnGun(s)] } as SimState)
    let over = false
    for (let i = 0; i < 4000 && !over; i++) {
      s = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
      if (s.gameOver) over = true
    }
    expect(over, 'the last life lost → game over (LIVES==0, CT-66)').toBe(true)
    expect(s.lives, 'no lives remain').toBeLessThanOrEqual(0)
  })

  it('a restart (fresh createSim) re-enters wave 1 with a full train', () => {
    const restarted = ext(createSim(0x4444))
    expect(restarted.gameOver, 'a restarted game is live again').toBe(false)
    expect(restarted.wave, 'restart re-enters wave 1').toBe(1)
    expect(restarted.segs.length, 'restart lays the full wave-1 train').toBe(12)
    expect(restarted.lives, 'restart restores full lives').toBe(STARTING_LIVES)
  })
})

describe('cp2-5 sim assembly — the wave-1 LOOP closes (AC-3)', () => {
  it('clearing every segment ends the wave and re-enters wave 1 with a fresh train — no life lost', () => {
    let s = ext(createSim(0x5555))
    expect(s.segs, 'the sim must carry a train to clear').toBeDefined()
    const livesBefore = s.lives
    // Simulate "all 12 killed": every slot exploding/vacant (bit 7). The player
    // is ALIVE (no contact) — this is the wave-clear path, not a death.
    const allDead = s.segs.map((seg) => ({ ...seg, pic: 0xff }))
    s = ext({ ...s, segs: allDead } as SimState)

    let reentered = false
    for (let i = 0; i < 400 && !reentered; i++) {
      s = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
      // A fresh, all-live 12-segment train marks re-entry.
      if (s.segs.length === 12 && s.segs.every((seg) => (seg.pic & 0x80) === 0) && s.delay === 0) reentered = true
    }
    expect(reentered, 'the wave re-enters with a fresh live train (CT-62)').toBe(true)
    expect(s.lives, 'clearing the wave costs no life').toBe(livesBefore)
    expect(s.wave, 'the wave counter advanced past wave 1 (re-entry)').toBeGreaterThan(1)
    expect(s.gameOver, 'clearing the wave is not game over').toBe(false)
  })
})

describe('cp2-5 sim assembly — determinism & cloneState carry the train (AC-2/AC-3)', () => {
  const script = [
    { dh: 5, dv: 2, fire: true },
    { dh: -3, dv: 0, fire: false },
    { dh: 8, dv: -8, fire: true },
    { dh: 0, dv: 0, fire: true },
  ]

  it('same seed + same script → identical train + lives + score (seeded determinism)', () => {
    const play = () => {
      let s = ext(createSim(0x6161))
      for (const inp of script) s = ext(stepSim(s, inp))
      return s
    }
    const a = play()
    const b = play()
    expect(a.segs, 'the sim carries a centipede train (not undefined)').toBeDefined()
    expect(a.segs, 'identical train replay').toEqual(b.segs)
    expect(a.lives).toBe(b.lives)
    expect(a.wave).toBe(b.wave)
    expect(a.score).toBe(b.score)
    expect(Array.from(a.playfield.cells)).toEqual(Array.from(b.playfield.cells))
  })

  it('cloneState deep-copies the train — a stepped clone never mutates the original', () => {
    const s = ext(createSim(0x6161))
    expect(s.segs, 'the sim carries a train to clone').toBeDefined()
    const c = ext(cloneState(s))
    expect(c.segs, 'clone train is a distinct array').not.toBe(s.segs)
    expect(c.segs, 'clone train starts equal').toEqual(s.segs)
    expect(c.lives, 'clone carries lives').toBe(s.lives)
    // Step both from the snapshot; they must stay identical.
    const a = ext(stepSim(s, script[0]))
    const b = ext(stepSim(c, script[0]))
    expect(b.segs, 'clone steps identically to the original').toEqual(a.segs)
  })
})
