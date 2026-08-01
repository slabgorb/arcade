// tests/core/trench-gun-streaming.test.ts
//
// Story uf1-4 — RED phase: the trench's WALL GUNS stream from the wedge grid's
// PANEL_GUN (TD$WGA) columns, the way sw7-22 already streams its force fields
// from PANEL_FORCEFIELD. This is the successor sw7-22's own suite named: "PIE1
// … is all wall GUNS (B-017, the NEXT story)" (trench-forcefield-streaming
// .test.ts:22-24).
//
// THE DEFECT: trench gun behaviour lands on 7 hand-authored TrenchObstacle
// stations (`spawnTrenchObstacles`, trench-obstacles.ts) crammed into the
// nearest ~4,448 units and explicitly marked PROVISIONAL "pending a full
// geometry-decode pass" — while the decoded geometry sits in trench-wedges.ts,
// tested and unread. Wave 1 (PIE1) carries 80 authored wall guns across the
// full 327,680-unit channel; the running game places 3.
//
// MEASURED GROUND TRUTH (probe run 2026-08-01 against the committed grid, via
// buildTrench — not invented): gun slots per wave 1..13 span 52..96; wave 1 has
// 80, its first at exactly −Z 0x6000 (= TRENCH_GUN_FIRE_RANGE, so the intro
// wedge's guns are in firing range AT ENTRY); force fields 0..256; decorative
// panels 74..114; the port is constant at 327,680 (pinned by
// trench-port-bs-plc.test.ts — run DURATION is untouched by this story).
//
// SEAM (same rule as the sw7-22 suite): everything is pinned via OBSERVABLES
// off the SIM state — `enterPhase(...).trenchObstacles`, kind 'turret', the
// kind the B-017 TGPROB fire loop and the 100-point scoring already read — so
// Dev owns the streaming function's name and shape. Grid-derived expectations
// are walked out of `buildTrench` independently in this file. Waves ≤ 11 are
// RNG-free (finding B-011), so grid walks here need no seed coordination.
// Per-slot HEIGHTS are deliberately pinned structurally (distinct, ordered,
// on-wall), not as literals — the grid→world height map stays Dev's, exactly
// as it did for the force fields.
//
// RED/PIN map: tests 2-6 and 8 are the RED body (fail until guns stream).
// Test 1 anchors the data facts the others rely on (green, keeps them
// non-circular). Test 7's ceilings and field count are the regression pins;
// its gun half is RED. Test 8 is the story's biggest find: MEASURED (probe
// 2026-08-01), today's wave-1 trench fires ZERO gun shots — the 7 legacy
// stations all despawn past the cockpit ~0.28s in, before the first TGPROB
// opening at game-frame 15 (~0.73s), so the B-017 threat does not exist in
// the running game. Post-GREEN, test 8 is also the mutation bar: unhooking
// the stream from the fire loop reddens it.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState, type TrenchObstacle } from '../../src/core/state'
import { enterPhase, stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_HALF_W, TRENCH_WALL_H } from '../../src/core/trench-channel'
import { buildTrench, wedgeLength, PANEL_GUN, type Wedge } from '../../src/core/trench-wedges'
import { createRng } from '@shared/rng'

const FRAME = 1 / 60

/** A fresh trench opened at the given (1-based) wave — the real spawn path. */
function freshTrench(wave: number, seed = 1983): GameState {
  return enterPhase({ ...initialState(seed), wave }, 'trench')
}

/** The wall guns the trench carries — the kind the B-017 fire loop reads. */
function turrets(s: GameState): TrenchObstacle[] {
  return s.trenchObstacles.filter((o) => o.kind === 'turret')
}

/** One authored gun cell: wall sign, −Z distance down the channel, slot 0..3. */
interface GridGun {
  side: -1 | 1
  dist: number
  slot: number
}

/** The grid's own gun placements for a (1-based) wave, walked out of
 *  `buildTrench` independently of the sim — the oracle the stream must match. */
function gridGuns(wave: number): GridGun[] {
  const chain: readonly Wedge[] = buildTrench(wave - 1, createRng(0))
  const out: GridGun[] = []
  let acc = 0
  for (const w of chain) {
    w.left.forEach((s, i) => {
      if (s === PANEL_GUN) out.push({ side: -1, dist: acc, slot: i })
    })
    w.right.forEach((s, i) => {
      if (s === PANEL_GUN) out.push({ side: 1, dist: acc, slot: i })
    })
    acc += wedgeLength(w.type)
  }
  return out
}

const cellKey = (side: number, dist: number) => `${side}@${dist}`

/** Multiset of gun cells: key → how many guns share that (wall, −Z) column. */
function gridCellCounts(wave: number): Map<string, number> {
  const counts = new Map<string, number>()
  for (const g of gridGuns(wave)) {
    const k = cellKey(g.side, g.dist)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

describe('uf1-4 — trench wall guns stream from the wedge grid (B-017 closes the sw7-6 gap)', () => {
  it('the measured ground truth holds: wave 1 authors 80 guns over the full channel, with the shapes the suite leans on', () => {
    // Anchors the story against the DATA so the tests below are not circular.
    const guns = gridGuns(1)
    expect(guns.length, 'PIE1 authors 80 wall guns').toBe(80)
    expect(Math.min(...guns.map((g) => g.dist)), 'the intro wedge guns sit at 0x6000 — in fire range at entry').toBe(0x6000)
    expect(Math.max(...guns.map((g) => g.dist)), 'guns reach deep down the full channel').toBeGreaterThan(200_000)
    expect(guns.some((g) => g.side === -1) && guns.some((g) => g.side === 1), 'guns on both walls').toBe(true)

    const counts = gridCellCounts(1)
    expect([...counts.values()].some((n) => n >= 2), 'a column stacking 2+ guns exists (distinct heights matter)').toBe(true)

    const leftOnly = guns.some(
      (g) => g.side === -1 && !guns.some((r) => r.side === 1 && r.dist === g.dist),
    )
    expect(leftOnly, 'a left-wall gun with NO right-wall partner exists (TWDG54 — per-wall independence)').toBe(true)

    // A single-gun column exists for EVERY slot level (TWDG04 "ALL LEVELS"),
    // so the height-order test below can observe each slot in isolation.
    for (let slot = 0; slot < 4; slot++) {
      const single = guns.some((g) => g.slot === slot && counts.get(cellKey(g.side, g.dist)) === 1)
      expect(single, `a lone gun in slot ${slot} exists`).toBe(true)
    }
  })

  it('the trench streams EVERY authored gun, not a hand-picked handful (RED: 3 of 80 today)', () => {
    expect(
      turrets(freshTrench(1)).length,
      'wave 1 carries exactly the 80 grid-authored wall guns',
    ).toBe(gridGuns(1).length)
  })

  it('every streamed gun sits at a grid-derived (wall, −Z) cell, and the multiset matches exactly — no invented stations, no lost columns (AC-2)', () => {
    const want = gridCellCounts(1)
    const got = new Map<string, number>()
    for (const t of turrets(freshTrench(1))) {
      expect(Math.abs(t.pos[0]), 'guns mount ON the wall').toBe(TRENCH_HALF_W)
      const k = cellKey(Math.sign(t.pos[0]), -t.pos[2])
      got.set(k, (got.get(k) ?? 0) + 1)
    }
    // Multiset equality both ways: an invented station fails (key not in grid),
    // a dropped or duplicated column fails (count mismatch).
    expect(Object.fromEntries([...got].sort()), 'streamed cells ≡ authored cells').toEqual(
      Object.fromEntries([...want].sort()),
    )
  })

  it('per-wall independence survives: a left-only grid column streams a left gun and NO right gun (the thing the old entity list could not express)', () => {
    const guns = gridGuns(1)
    const counts = gridCellCounts(1)
    const cell = guns.find((g) => g.side === -1 && !counts.has(cellKey(1, g.dist)))
    expect(cell, 'anchor: a left-only column exists in the data').toBeDefined()
    const at = turrets(freshTrench(1)).filter((t) => -t.pos[2] === cell!.dist)
    expect(at.length, 'the column streams its left gun(s)').toBe(counts.get(cellKey(-1, cell!.dist)))
    expect(at.every((t) => t.pos[0] < 0), 'and nothing on the right wall').toBe(true)
  })

  it('a column stacking two guns streams two turrets at distinct on-wall heights (AC-2: moving the gun in the DATA is what moves it on the wall)', () => {
    const counts = gridCellCounts(1)
    const stacked = [...counts.entries()].find(([, n]) => n === 2)
    expect(stacked, 'anchor: a 2-gun column exists in the data').toBeDefined()
    const [key] = stacked!
    const [side, dist] = key.split('@').map(Number)
    const at = turrets(freshTrench(1)).filter((t) => Math.sign(t.pos[0]) === side && -t.pos[2] === dist)
    expect(at.length, 'both stacked guns stream').toBe(2)
    expect(at[0].pos[1], 'distinct slot heights').not.toBe(at[1].pos[1])
    for (const t of at) {
      expect(t.pos[1], 'height is on the wall').toBeGreaterThan(0)
      expect(t.pos[1], 'height is on the wall').toBeLessThanOrEqual(TRENCH_WALL_H)
    }
  })

  it('slot order is respected: slot 0 (top) streams higher than 1, than 2, than 3 (bottom)', () => {
    // Observed through single-gun columns (one per slot, proven to exist by the
    // anchor test) so each slot's world height is read in isolation. The exact
    // heights stay Dev's (PROVISIONAL slot map, as with the force fields) —
    // only the ORDER the ROM's A1..A4 top-to-bottom packing dictates is pinned.
    const guns = gridGuns(1)
    const counts = gridCellCounts(1)
    const ts = turrets(freshTrench(1))
    const slotY: number[] = []
    for (let slot = 0; slot < 4; slot++) {
      const g = guns.find((x) => x.slot === slot && counts.get(cellKey(x.side, x.dist)) === 1)
      expect(g, `lone slot-${slot} column`).toBeDefined()
      const t = ts.find((x) => Math.sign(x.pos[0]) === g!.side && -x.pos[2] === g!.dist)
      expect(t, `its streamed gun`).toBeDefined()
      slotY.push(t!.pos[1])
    }
    expect(slotY.length, 'all four slots observed').toBe(4)
    for (let i = 1; i < 4; i++) {
      expect(slotY[i], `slot ${i} hangs below slot ${i - 1}`).toBeLessThan(slotY[i - 1])
    }
  })

  it('sw7-22 fields still stream beside the guns, and the object count stays under the measured ceilings (AC-3, AC-4)', () => {
    // Wave 2 carries BOTH layers: ~82 force fields (sw7-22, must not be
    // collateral) and 66 authored guns (RED half of this pin today).
    const s2 = freshTrench(2)
    expect(s2.trenchObstacles.filter((o) => o.kind === 'catwalk').length, 'fields survive the gun wiring').toBeGreaterThan(40)
    expect(turrets(s2).length, 'guns stream in the same entry state').toBe(gridGuns(2).length)

    // AC-4 — sw7-19's dense-grid class: measured entry maxima across waves
    // 1..13 (probe 2026-08-01): guns ≤ 96, fields ≤ 256, panels ≤ 114 — worst
    // plausible entry < 470 even if every layer streams. 512 is a REGRESSION
    // ceiling close over the measurement, not an assumed-cheap allowance.
    for (let wave = 1; wave <= 13; wave++) {
      const s = freshTrench(wave)
      expect(s.trenchObstacles.length, `wave ${wave} entry object count`).toBeLessThanOrEqual(512)
      expect(turrets(s).length, `wave ${wave} gun count`).toBeLessThanOrEqual(128)
    }
  })

  it('a wall gun fires at the pilot in the opening seconds (B-017 end-to-end; the threat is real)', () => {
    // RED today, and not for the placement reason: MEASURED (probe 2026-08-01,
    // this exact loop), the legacy stations all scroll past the cockpit and
    // despawn ~0.28s into the run — before the FIRST fire opening at game-frame
    // 15 (~0.73s; mask 0x0f) — so today's wave-1 trench fires zero shots, ever
    // (only 'speech' events in 15 simulated seconds). The B-017 gun threat does
    // not exist in the running game; this is uf1-1's immortal-pilot class.
    // After GREEN: 80 guns span the full channel, the intro wedge's sit at
    // exactly 0x6000 = fire range at entry (anchor test), openings come every
    // 16 game frames at P(fire) ≈ 50% per in-range gun — 15 seconds is orders
    // of magnitude of slack, deterministic under the fixed seed. The multiset
    // test outlaws legacy stations, so staying green REQUIRES streamed guns to
    // reach the TGPROB loop: unhooking the stream reddens this — the mutation bar.
    let s = freshTrench(1)
    let fired = false
    for (let i = 0; i < 900 && !fired; i++) {
      s = stepGame(s, NO_INPUT, FRAME)
      fired = s.events.some((e) => e.type === 'enemy-fire')
    }
    expect(fired, 'an enemy-fire event within 15 simulated seconds').toBe(true)
  })
})
