// tests/transporter.test.ts
//
// Story jt2-6 — RED phase (O'Brien / TEA). The BEHAVIOUR suite for the
// transporter + spawn-service core: the four pads by tier, the SELARE empty-
// third rule, the NPSERV/LPSERV ticket queue, the timed-materialisation abort
// law, the P1/P2 spawn constants, and the wave-1 complement entering via pads.
// The ROM-law provenance + the byte gate live in transporter-source.test.ts; the
// committed JT26-* claims in docs/rom-study/claims/transporter.json.
//
// EVERY law is pinned in BOTH directions and — where there is a boundary — at the
// exact boundary value and one past it. The transporter epic has lost a review
// round to a one-sided pin three times; this suite refuses to be the fourth.
//
// RED today: src/core/transporter.ts does not exist, so loadTransporter() throws
// a self-describing "transporter service not built yet" per test.

import { describe, it, expect } from 'vitest'
import { loadTransporter, type PlayerInput, type PadId } from './helpers/transporter-contract.js'
import { loadWave } from './helpers/wave-contract.js'

// The neutral glide — the ONLY non-control input (all zero/false).
const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the four transporter pads by tier (JOUSTRV4.SRC:5587-5590).
// ─────────────────────────────────────────────────────────────────────────────
describe('the four transporter pads by tier (AC-1)', () => {
  it('there are exactly four pads, in TR1..TR4 order', async () => {
    const t = await loadTransporter()
    expect(t.PADS.map((p) => p.id)).toEqual(['TR1', 'TR2', 'TR3', 'TR4'])
  })

  it('each pad carries its evaluated TPOSX/TPOSY (JOUSTRV4.SRC:5587-5590)', async () => {
    const t = await loadTransporter()
    // $6A+7=113 / $51-1=80 ; $E0+7=231 / $81-1=128 ; $10+7=23 / $8A-1=137 ;
    // $78+7=127 / $D3-1=210. The bytes are re-derived from source in
    // transporter-source.test.ts; here they are pinned exactly.
    const byId = Object.fromEntries(t.PADS.map((p) => [p.id, p]))
    expect([byId.TR1.x, byId.TR1.y], 'TR1').toEqual([113, 80])
    expect([byId.TR2.x, byId.TR2.y], 'TR2').toEqual([231, 128])
    expect([byId.TR3.x, byId.TR3.y], 'TR3').toEqual([23, 137])
    expect([byId.TR4.x, byId.TR4.y], 'TR4').toEqual([127, 210])
  })

  it('the pad tiers are top / middle / middle / bottom — the AREA routing', async () => {
    const t = await loadTransporter()
    // TR1 top (AREA1), TR2+TR3 the two middle pads (AREA2 right/left), TR4 bottom
    // (AREA3) — the tier→transporter routing at JOUSTRV4.SRC:5641-5654.
    expect(t.PADS.map((p) => p.tier)).toEqual(['top', 'middle', 'middle', 'bottom'])
  })

  it("each pad's tier is exactly the SELARE class of its own Y (no hand-typed tier)", async () => {
    const t = await loadTransporter()
    for (const p of t.PADS) {
      expect(p.tier, `${p.id} @ y=${p.y}`).toBe(t.selectArea(p.y))
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — SELARE, the empty-third rule (JOUSTRV4.SRC:6413-6424).
// ─────────────────────────────────────────────────────────────────────────────
describe('SELARE sorts a Y position into one of three screen thirds (AC-2)', () => {
  it('exposes the two hex boundaries $51 and $A9 (= $A3+6)', async () => {
    const t = await loadTransporter()
    expect(t.THIRD_MIDDLE_MIN, 'top/middle boundary $51').toBe(0x51)
    // $A9, NOT the $90 of the dead `$8A+6` comment column on :6414 (the COLOR1
    // trap — the operand field ends at the first whitespace).
    expect(t.THIRD_BOTTOM_MIN, 'middle/bottom boundary $A3+6').toBe(0xa9)
  })

  it('classifies the interior of each third', async () => {
    const t = await loadTransporter()
    expect(t.selectArea(0), 'y=0 top').toBe('top')
    expect(t.selectArea(0x30), 'y=48 top').toBe('top')
    expect(t.selectArea(0x70), 'y=112 middle').toBe('middle')
    expect(t.selectArea(0xc0), 'y=192 bottom').toBe('bottom')
    expect(t.selectArea(255), 'y=255 bottom').toBe('bottom')
  })

  it('is boundary-exact at the top/middle line ($50 top, $51 middle)', async () => {
    const t = await loadTransporter()
    // BLO #$51 → Y < $51 is top; Y == $51 falls through to middle.
    expect(t.selectArea(0x50), '$50 = 80 is the last top row').toBe('top')
    expect(t.selectArea(0x51), '$51 = 81 is the first middle row').toBe('middle')
  })

  it('is boundary-exact at the middle/bottom line ($A8 middle, $A9 bottom)', async () => {
    const t = await loadTransporter()
    // BLO #$A3+6 → Y < $A9 is (top or) middle; Y == $A9 falls through to bottom.
    expect(t.selectArea(0xa8), '$A8 = 168 is the last middle row').toBe('middle')
    expect(t.selectArea(0xa9), '$A9 = 169 is the first bottom row').toBe('bottom')
  })

  it('scanAreas clears then counts occupants per third (JOUSTRV4.SRC:5622-5635)', async () => {
    const t = await loadTransporter()
    expect(t.scanAreas([]), 'empty screen — every third clear').toEqual({ top: 0, middle: 0, bottom: 0 })
    // one in top ($30), two in middle ($70,$A8), one in bottom ($C0).
    expect(t.scanAreas([0x30, 0x70, 0xa8, 0xc0])).toEqual({ top: 1, middle: 2, bottom: 1 })
  })
})

describe('the empty-third rule: empty proceeds, crowded defers (AC-2)', () => {
  it('a spawn PROCEEDS into an empty third', async () => {
    const t = await loadTransporter()
    const clear = { top: 0, middle: 0, bottom: 0 }
    expect(t.spawnProceeds(clear, 'top')).toBe(true)
    expect(t.spawnProceeds(clear, 'middle')).toBe(true)
    expect(t.spawnProceeds(clear, 'bottom')).toBe(true)
  })

  it('a spawn DEFERS from a crowded third — the other direction', async () => {
    const t = await loadTransporter()
    // Each third crowded in turn; only that third defers, the empty ones proceed.
    expect(t.spawnProceeds({ top: 1, middle: 0, bottom: 0 }, 'top'), 'top crowded → defer').toBe(false)
    expect(t.spawnProceeds({ top: 1, middle: 0, bottom: 0 }, 'middle'), 'middle still empty').toBe(true)
    expect(t.spawnProceeds({ top: 0, middle: 3, bottom: 0 }, 'middle'), 'middle crowded → defer').toBe(false)
    expect(t.spawnProceeds({ top: 0, middle: 0, bottom: 2 }, 'bottom'), 'bottom crowded → defer').toBe(false)
  })

  it('the rule is on the third that is spawned into, wired to the scan', async () => {
    const t = await loadTransporter()
    // A live occupant in the top third defers a top spawn but not a bottom one —
    // proving the rule reads the SELARE-scanned occupancy of the SPAWN's third.
    const occ = t.scanAreas([0x20]) // one object in the top third
    expect(t.spawnProceeds(occ, 'top'), 'top occupied → defer').toBe(false)
    expect(t.spawnProceeds(occ, 'bottom'), 'bottom empty → proceed').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the ticket queue (NPSERV/LPSERV/NESERV/LESERV, JOUSTRV4.SRC:5615-5676).
// ─────────────────────────────────────────────────────────────────────────────
describe('the take-a-number ticket queue (AC-2)', () => {
  it('a fresh queue serves nobody', async () => {
    const t = await loadTransporter()
    expect(t.nextServed(t.newServiceQueue())).toBe('idle')
  })

  it('drawing a number puts that class in the queue', async () => {
    const t = await loadTransporter()
    const { queue } = t.takePlayerNumber(t.newServiceQueue())
    expect(t.nextServed(queue), 'a waiting player is served next').toBe('player')
  })

  it('players are served in FIFO ticket order (LPSERV), both directions', async () => {
    const t = await loadTransporter()
    const a = t.takePlayerNumber(t.newServiceQueue())
    const b = t.takePlayerNumber(a.queue)
    expect(a.ticket, 'the two players hold distinct numbers').not.toBe(b.ticket)
    // first player's turn now; second player's is NOT.
    expect(t.playerTurn(b.queue, a.ticket), 'first drawn → served first').toBe(true)
    expect(t.playerTurn(b.queue, b.ticket), 'second drawn → must wait').toBe(false)
    // after serving the first, the second player's turn comes up.
    const served = t.servePlayer(b.queue)
    expect(t.playerTurn(served, b.ticket), 'second player served next').toBe(true)
    expect(t.playerTurn(served, a.ticket), 'the served number is no longer up').toBe(false)
  })

  it('an enemy WAITS while any player still holds a number — players first', async () => {
    const t = await loadTransporter()
    const p = t.takePlayerNumber(t.newServiceQueue())
    const e = t.takeEnemyNumber(p.queue)
    // The enemy holds the current enemy number, yet must yield to the player.
    expect(t.nextServed(e.queue), 'the player is ahead of the queued enemy').toBe('player')
    expect(
      t.enemyTurn(e.queue, e.ticket),
      'even at the front of the enemy line, an enemy waits while a player is unserved',
    ).toBe(false)
    // Once the player is served, the enemy's turn arrives — the OTHER direction.
    const afterPlayer = t.servePlayer(e.queue)
    expect(t.nextServed(afterPlayer), 'now the enemy is next').toBe('enemy')
    expect(t.enemyTurn(afterPlayer, e.ticket), 'the front enemy is now served').toBe(true)
  })

  it('enemies keep their own FIFO order among themselves (LESERV), both directions', async () => {
    const t = await loadTransporter()
    const e1 = t.takeEnemyNumber(t.newServiceQueue())
    const e2 = t.takeEnemyNumber(e1.queue)
    expect(e1.ticket).not.toBe(e2.ticket)
    // No players waiting → the first enemy is up; the second is not.
    expect(t.enemyTurn(e2.queue, e1.ticket), 'first enemy served first').toBe(true)
    expect(t.enemyTurn(e2.queue, e2.ticket), 'second enemy waits its turn').toBe(false)
    const served = t.serveEnemy(e2.queue)
    expect(t.enemyTurn(served, e2.ticket), 'second enemy served next').toBe(true)
  })

  it('serving a player does not advance the enemy line, and vice versa', async () => {
    const t = await loadTransporter()
    const p = t.takePlayerNumber(t.newServiceQueue())
    const e = t.takeEnemyNumber(p.queue)
    const afterPlayer = t.servePlayer(e.queue)
    // The enemy number in service is untouched by serving the player.
    expect(afterPlayer.leserv, 'servePlayer leaves LESERV alone').toBe(e.queue.leserv)
    const afterEnemy = t.serveEnemy(afterPlayer)
    expect(afterEnemy.lpserv, 'serveEnemy leaves LPSERV alone').toBe(afterPlayer.lpserv)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — timed materialisation safety: an ABORT law, not invulnerability
// (JOUSTRV4.SRC:5831,5841,5892,5923-5925).
// ─────────────────────────────────────────────────────────────────────────────
describe('isControlInput — the whole CURJOY word (AC-3)', () => {
  it('the neutral glide is NOT a control input', async () => {
    const t = await loadTransporter()
    expect(t.isControlInput(NEUTRAL)).toBe(false)
  })

  it('ANY of direction, flap-edge, or flap-held IS a control input', async () => {
    const t = await loadTransporter()
    expect(t.isControlInput({ dir: 1, flap: false, flapHeld: false }), 'right').toBe(true)
    expect(t.isControlInput({ dir: -1, flap: false, flapHeld: false }), 'left').toBe(true)
    expect(t.isControlInput({ dir: 0, flap: true, flapHeld: false }), 'flap edge').toBe(true)
    expect(t.isControlInput({ dir: 0, flap: false, flapHeld: true }), 'flap held').toBe(true)
  })
})

describe('the materialisation window times out when untouched (AC-3)', () => {
  it('begins safe: collisions disabled, window active', async () => {
    const t = await loadTransporter()
    const m = t.beginMaterialise(3)
    expect(m).toEqual({ napLeft: 3, collisionsEnabled: false, end: 'active' })
  })

  it('a neutral input naps one frame and stays safe until the last frame', async () => {
    const t = await loadTransporter()
    let m = t.beginMaterialise(3)
    m = t.stepMaterialise(m, NEUTRAL)
    expect(m, 'after 1 nap').toMatchObject({ napLeft: 2, collisionsEnabled: false, end: 'active' })
    m = t.stepMaterialise(m, NEUTRAL)
    // napLeft 1 — the LAST safe frame. Still active, still no collisions.
    expect(m, 'last safe frame').toMatchObject({ napLeft: 1, collisionsEnabled: false, end: 'active' })
  })

  it('one frame PAST the last: the window times out and collisions come back', async () => {
    const t = await loadTransporter()
    let m = t.beginMaterialise(3)
    m = t.stepMaterialise(m, NEUTRAL)
    m = t.stepMaterialise(m, NEUTRAL)
    m = t.stepMaterialise(m, NEUTRAL) // the 3rd nap — one past the last safe frame
    expect(m.end, 'timed out, not aborted').toBe('timed-out')
    expect(m.collisionsEnabled, 'PLYINT re-enables collisions on timeout').toBe(true)
  })
})

describe('ANY control input aborts the window EARLY — not invulnerability (AC-3)', () => {
  it('aborts on the very first frame, with the window barely open', async () => {
    const t = await loadTransporter()
    const m = t.stepMaterialise(t.beginMaterialise(60), { dir: 1, flap: false, flapHeld: false })
    expect(m.end, 'control input → ABORTED EARLY (JOUSTRV4.SRC:5892)').toBe('aborted')
    expect(m.collisionsEnabled, 'aborting re-enables collisions immediately').toBe(true)
  })

  it('aborts on the LAST safe frame too — a flap ends the safety, it does not time out', async () => {
    const t = await loadTransporter()
    let m = t.beginMaterialise(2)
    m = t.stepMaterialise(m, NEUTRAL) // napLeft 1 — last safe frame
    expect(m.end).toBe('active')
    m = t.stepMaterialise(m, { dir: 0, flap: true, flapHeld: false })
    expect(m.end, 'input on the last frame aborts, it is not a timeout').toBe('aborted')
    expect(m.collisionsEnabled).toBe(true)
  })

  it('every kind of control input aborts (direction, flap edge, flap held)', async () => {
    const t = await loadTransporter()
    for (const input of [
      { dir: -1, flap: false, flapHeld: false },
      { dir: 0, flap: true, flapHeld: false },
      { dir: 0, flap: false, flapHeld: true },
    ] as const) {
      const m = t.stepMaterialise(t.beginMaterialise(30), input)
      expect(m.end, `${JSON.stringify(input)} aborts`).toBe('aborted')
    }
  })

  it('an ended window is inert — no resurrecting the safety', async () => {
    const t = await loadTransporter()
    const aborted = t.stepMaterialise(t.beginMaterialise(5), { dir: 1, flap: false, flapHeld: false })
    // Neutral input after an abort must NOT re-open the window or disable collisions.
    const again = t.stepMaterialise(aborted, NEUTRAL)
    expect(again.end, 'still aborted').toBe('aborted')
    expect(again.collisionsEnabled, 'collisions stay enabled').toBe(true)
  })

  it('a TIMED-OUT window is inert too — a late control input cannot resurrect the safety', async () => {
    const t = await loadTransporter()
    // Run a 2-frame window untouched to timeout.
    let m = t.beginMaterialise(2)
    m = t.stepMaterialise(m, NEUTRAL) // napLeft 1, still active
    m = t.stepMaterialise(m, NEUTRAL) // napLeft 0 → timed out
    expect(m.end, 'the window has timed out').toBe('timed-out')
    const timedOut = m
    // A late CONTROL input must NOT flip a timed-out window to 'aborted' — the exit
    // guard is `end !== active`, not `end === aborted`. (Narrowing it to the latter
    // would let this input resurrect and re-abort an already-expired safety.)
    const afterControl = t.stepMaterialise(timedOut, { dir: -1, flap: false, flapHeld: false })
    expect(afterControl.end, 'a late control input leaves a timed-out window timed out').toBe('timed-out')
    expect(afterControl.collisionsEnabled, 'collisions stay enabled').toBe(true)
    // A neutral input is likewise inert — no further nap decrement, no state change.
    const afterNeutral = t.stepMaterialise(timedOut, NEUTRAL)
    expect(afterNeutral.end, 'still timed out').toBe('timed-out')
    expect(afterNeutral.collisionsEnabled, 'collisions stay enabled').toBe(true)
    expect(afterNeutral, 'a timed-out window is returned unchanged').toEqual(timedOut)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the player spawn constants (JOUSTRV4.SRC:1020-1039).
// ─────────────────────────────────────────────────────────────────────────────
describe('the P1/P2 spawn constants (AC-1)', () => {
  it('P1 materialises at X=100 facing right on the ostrich', async () => {
    const t = await loadTransporter()
    expect(t.PLAYER1_SPAWN).toEqual({ x: 100, facing: 1, mount: 'ostrich' })
  })

  it('P2 materialises at X=200 facing left on the stork', async () => {
    const t = await loadTransporter()
    expect(t.PLAYER2_SPAWN).toEqual({ x: 200, facing: -1, mount: 'stork' })
  })

  it('the two players differ — not the same spawn twice (both directions)', async () => {
    const t = await loadTransporter()
    expect(t.PLAYER1_SPAWN.x, 'distinct X').not.toBe(t.PLAYER2_SPAWN.x)
    expect(t.PLAYER1_SPAWN.facing, 'P1 is not facing left').not.toBe(-1)
    expect(t.PLAYER2_SPAWN.facing, 'P2 is not facing right').not.toBe(1)
    expect(t.PLAYER1_SPAWN.mount, 'distinct mounts').not.toBe(t.PLAYER2_SPAWN.mount)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — a full wave-1 enemy complement enters via pads under seed.
// ─────────────────────────────────────────────────────────────────────────────
describe('the wave-1 enemy complement enters via pads deterministically (AC-4)', () => {
  it("wave 1's complement is 3 (three bounders) from jt2-5's WAVE_TABLE row 1", async () => {
    const t = await loadTransporter()
    const wave = await loadWave()
    // WAVE_TABLE row 1 = $30,$01,0,2 → bounders 3, hunters 0, lords 0, ptero 0.
    expect(t.waveEnemyComplement(wave.waveRowAt(1))).toBe(3)
  })

  it('the pursuit nibble is EXCLUDED from the count — it seeds the budget', async () => {
    const t = await loadTransporter()
    // pursuers must NOT inflate the complement: a row that is ALL pursuit sends
    // in nobody; a mixed row counts the four enemy fields and ignores pursuers.
    expect(
      t.waveEnemyComplement({ bounders: 0, hunters: 0, lords: 0, pursuers: 15, pterodactyls: 0, status: 0 }),
      'all pursuit, no enemies',
    ).toBe(0)
    expect(
      t.waveEnemyComplement({ bounders: 2, hunters: 1, lords: 1, pursuers: 9, pterodactyls: 1, status: 0 }),
      'sum of the four enemy fields, pursuers ignored',
    ).toBe(5)
  })

  it('every enemy enters on a real pad, once, in order', async () => {
    const t = await loadTransporter()
    const padIds = new Set<PadId>(t.PADS.map((p) => p.id))
    const entries = t.enterViaPads(3, 0xc0ffee)
    expect(entries.length, 'the whole complement enters').toBe(3)
    expect(entries.map((e) => e.index), 'entries are ordered 0..n-1').toEqual([0, 1, 2])
    for (const e of entries) {
      expect(padIds.has(e.pad), `${e.pad} is a real pad`).toBe(true)
    }
  })

  it('threads the count parameter — length and index run track count, not a literal', async () => {
    const t = await loadTransporter()
    // The count-3 tests above pass even if the loop bound were hard-wired to 3, so
    // pin counts OTHER than 3: an empty complement enters nobody, and 1 / 5 produce
    // exactly that many entries indexed 0..count-1.
    expect(t.enterViaPads(0, 99), 'zero complement → no entries').toEqual([])
    expect(t.enterViaPads(1, 99).map((e) => e.index), 'one enemy → index [0]').toEqual([0])
    const five = t.enterViaPads(5, 99)
    expect(five.length, 'five enemies → five entries').toBe(5)
    expect(five.map((e) => e.index), 'indices 0..4').toEqual([0, 1, 2, 3, 4])
  })

  it('is deterministic under seed — same seed, identical sequence', async () => {
    const t = await loadTransporter()
    expect(t.enterViaPads(3, 42)).toEqual(t.enterViaPads(3, 42))
  })

  it('actually consumes the seed — different seeds do not all collapse to one sequence', async () => {
    const t = await loadTransporter()
    // The anti-vacuity rail: a constant assignment would be "deterministic" while
    // ignoring the seed. Across several seeds the pad sequence must vary.
    const shapes = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => t.enterViaPads(3, s).map((e) => e.pad).join(',')),
    )
    expect(shapes.size, 'the seed must influence which pads are used').toBeGreaterThan(1)
  })

  it("the wave-1 count flows through the pad service (AC-4 end to end)", async () => {
    const t = await loadTransporter()
    const wave = await loadWave()
    const count = t.waveEnemyComplement(wave.waveRowAt(1))
    expect(t.enterViaPads(count, 7).length, 'three bounders enter via pads').toBe(3)
  })
})
