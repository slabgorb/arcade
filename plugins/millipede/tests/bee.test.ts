// tests/bee.test.ts
//
// Story ml4-3 — RED phase (TEA). THE BEE: `BEEMV — MOVE BEE DOWN SCREEN`
// (`MILLI.MAC:56`, BE-1). The bee spawns into motion-object slot 12 (BE-3)
// when few mushrooms remain near the BOTTOM — the BEEMV1 needed-count against
// MUSH (BE-8/9) — or DIRECTLY when the centipede is dead, a beetle survives
// and CENTIN >= 10 (BE-7). It dives straight down: dh 0 (BE-42), V minus dv
// each tick through the shared BEEMV0 (BE-16/17), planting mushrooms in its
// wake on a 1-in-4 RND1 roll (mask 3, BE-24 — everywhere on screen, unlike
// the dragonfly's area-halved mask). Its signature is the TWO-HIT kill:
// SHOOT2 compares the slot dv against 4 — a first hit STORES the 4 (the bee
// speeds up, NO score, BE-45/49/50); only a bee already at dv 4 explodes, for
// 200 — 600 by DDT (BE-44..48). Every constant below carries a BE-* claim in
// docs/rom-study/claims/11-earwig-inchworm-bee.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate. Per the
// ml4-2 Delivery Finding, the shared-helper claims (BEEMV0/1/2, BEEOFF) crib
// the DF-33..52 ground the dragonfly story broke — re-cited here as BE-*
// under the one-subsystem-per-file rule.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/bee.ts — a pure cited reducer (conway.ts house style: in-place
//   mutation, deterministic, BYTE semantics — fields are 0..255, -1 is 0xFF).
//   One standalone subsystem per file (the ml4-1 rule): the BEEMV1/BEEMV2/
//   BEEOFF ports are module-local copies, not imports from dragonfly.ts —
//   extraction waits for the rule's third-consumer trigger, which this story
//   MEETS but does not act on (route it as a Delivery Finding, owner ml4-5 or
//   the extraction story the Reviewer names). Exports:
//
//     BEE_SLOT = 12               // BEEC+12. (MILLI.MAC:66/:80, BE-3/10)
//     BEE_PIC = 0x38              // BEEMV3 :223 (BE-37); band 0x38..0x39 (BE-12/13)
//     BEE_COLOR = 0x79            // BEEMV2 :238 (BE-43)
//     BEE_SPAWN_V = 0xf8          // BEEMV2 :225 (BE-38)
//     BEE_PTS = 200               // :2099 (BE-45)
//     BEE_DDT_PTS = 600           // :2102 (BE-46)
//     BEE_HIT_DV = 4              // :2103-2107 (BE-47/49)
//     BEE_MUSH_V_OFFSET = 4       // the plant cell is v+4 (:131, BE-19)
//
//     interface BeeSlot { color; pic; v; h; dv; dh; pts }
//         // BEEC/BEEP/BEEV/BEEH/BEEDV/BEEDH/PTS. color 0 = free.
//     interface BeeEnv {
//       frame;                    // FRAME byte (BE-14/22)
//       score2;                   // SCORE2 — the BCD ten-thousands byte
//       attract;                  // MODE bit 7 (BE-20)
//       nocent;                   // NOCENT — bombing mode (BE-21)
//       playerAlive;              // the PLAYP/PEXPLD gate (:60-63, BE-2)
//       rnd0;                     // POKEY RND0 — the spawn column (BE-39..41)
//       rnd1;                     // POKEY RND1 — the plant roll (BE-25)
//       centin;                   // CENTIN (BE-7)
//       dead;                     // DEAD (BE-5)
//       beetles;                  // BEETLS (BE-6/7)
//       mush;                     // MUSH — mushrooms near the BOTTOM (BE-9;
//                                 //   the dragonfly reads MUSH+2, the top)
//     }
//
//     isBee(slot): boolean                      // :84-90 (BE-12/13)
//     mushroomsNeeded(score2): number           // BEEMV1 :179-194 (BE-29..33)
//     mayStartBee(env): boolean                 // :68-78 (BE-5..9)
//     beeSpeed(score2): 2 | 3                   // BEEMV3 :199-218 (BE-34/35/36)
//     spawnH(rnd0): number | null               // BEEMV2 :228-234 (BE-39/40/41);
//         // null = the ROM's reroll, deferred to the next tick (the same
//         // logged Design Deviation as ml4-2's)
//     startBee(slot, env): void                 // BEEMV3+BEEMV2 writes (BE-34..43)
//     trySpawnBee(slot, env): boolean           // player gate + slot free + gates
//     moveBee(slot, env):
//       { kind: 'idle' } | { kind: 'offscreen' }
//       | { kind: 'moved'; plantMushroom: boolean }
//         // one BEEMV sweep tick for ONE live bee: flap on EVEN frames
//         // (:91-96, BE-14/15 — the opposite parity from the mosquito, with
//         // NO slow-mode override), then BEEMV0: V -= dv (:120-125, BE-17),
//         // V < 4 exits via beeOff (:126-128, BE-18), and the plant DECISION
//         // (:139-159, BE-20..25): mask 3, every fourth frame, vetoed by
//         // NOCENT outside attract. The OBSTAC/DDTEXP/PLAY/MUSHER seams stay
//         // with their callers; the caller plants at v + BEE_MUSH_V_OFFSET.
//         // CHAN7/AUDF1 sound (:82-83, :97-106, :111-112) is an ml6 seam.
//     beeOff(slot): void                        // BEEOFF :166-171 (BE-26/27/28)
//     beeHit(slot, byDdt):
//       { kind: 'speedup' } | { kind: 'killed'; points: number }
//         // SHOOT2 :2099-2108 — dv !== 4: STORE 4, no score (BE-47/49/50);
//         // dv === 4: 200/600 (BE-44/45/46/48). DDT does NOT bypass the
//         // two-hit rule: a first hit in a cloud still only speeds up.
//
// ─── SCOPE (the ml4-1/ml4-2 precedent) ───────────────────────────────────────
// • Upright cabinet only: the :225-226 EOR CKF8 and :2103-2104 EOR CKF8 are
//   identity; cocktail is ml8-3.
// • The SECURA block in BEEMV3 (:204-217) is anti-piracy, not game behaviour
//   — on genuine hardware it falls through to speed 2. Not modelled.
// • The sweep's lowest-frequency fold across slots (:82-83/:97-106/:111-112)
//   is sound pacing — ml6.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// (`12.`, `10.`) marks DECIMAL.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// V DECREASES downward: spawn at V=0xF8 (top), SUBTRACT dv until V<4 (bottom,
// BE-17/18). The bee flies STRAIGHT down: dh is 0 at spawn and nothing moves H.
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface BeeSlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  pts: number
}

interface BeeEnv {
  frame: number
  score2: number
  attract: boolean
  nocent: number
  playerAlive: boolean
  rnd0: number
  rnd1: number
  centin: number
  dead: number
  beetles: number
  mush: number
}

type BeeMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved'; plantMushroom: boolean }
type BeeHit = { kind: 'speedup' } | { kind: 'killed'; points: number }

interface BeeModule {
  BEE_SLOT: number
  BEE_PIC: number
  BEE_COLOR: number
  BEE_SPAWN_V: number
  BEE_PTS: number
  BEE_DDT_PTS: number
  BEE_HIT_DV: number
  BEE_MUSH_V_OFFSET: number
  isBee: (slot: Readonly<BeeSlot>) => boolean
  mushroomsNeeded: (score2: number) => number
  mayStartBee: (env: Readonly<BeeEnv>) => boolean
  beeSpeed: (score2: number) => number
  spawnH: (rnd0: number) => number | null
  startBee: (slot: BeeSlot, env: Readonly<BeeEnv>) => void
  trySpawnBee: (slot: BeeSlot, env: Readonly<BeeEnv>) => boolean
  moveBee: (slot: BeeSlot, env: Readonly<BeeEnv>) => BeeMove
  beeOff: (slot: BeeSlot) => void
  beeHit: (slot: BeeSlot, byDdt: boolean) => BeeHit
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const BEE_SPECIFIER = ['..', 'src', 'core', 'bee'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadBee(): Promise<BeeModule> {
  try {
    const mod = (await import(/* @vite-ignore */ BEE_SPECIFIER)) as Partial<BeeModule>
    if (typeof mod.moveBee !== 'function') throw new Error('module has no moveBee export')
    if (typeof mod.trySpawnBee !== 'function') throw new Error('module has no trySpawnBee export')
    return mod as BeeModule
  } catch (e) {
    throw new Error(
      'bee reducer not built yet — GREEN (Dev) ships src/core/bee.ts per the ' +
      'contract at the top of tests/bee.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot as BEEOFF leaves it. */
function freeSlot(over: Partial<BeeSlot> = {}): BeeSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0, ...over }
}

/** A live mid-screen bee in a known state (frame 1 → odd, no flap). */
function bee(over: Partial<BeeSlot> = {}): BeeSlot {
  return { color: 0x79, pic: 0x38, v: 0x80, h: 0x40, dv: 2, dh: 0, pts: 0, ...over }
}

function env(over: Partial<BeeEnv> = {}): BeeEnv {
  return {
    frame: 1, score2: 0, attract: false, nocent: 0, playerAlive: true,
    rnd0: 0x47, rnd1: 0x01, centin: 0, dead: 1, beetles: 0, mush: 0, ...over,
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — cited constants', () => {
  it('pins the slot, picture, spawn bytes, hit dv and scores (BE-3/37/38/43/45/46/47)', async () => {
    const m = await loadBee()
    expect(m.BEE_SLOT, 'BEEC+12. spawn slot (MILLI.MAC:66, BE-3)').toBe(12)
    expect(m.BEE_PIC, 'BEEMV3 picture (MILLI.MAC:223, BE-37)').toBe(0x38)
    expect(m.BEE_COLOR, 'BEEMV2 colour (MILLI.MAC:238, BE-43)').toBe(0x79)
    expect(m.BEE_SPAWN_V, 'BEEMV2 top-row V (MILLI.MAC:225, BE-38)').toBe(0xf8)
    expect(m.BEE_PTS, 'BCD 2 hundreds (MILLI.MAC:2099, BE-45)').toBe(200)
    expect(m.BEE_DDT_PTS, 'BCD 6 hundreds by DDT (MILLI.MAC:2102, BE-46)').toBe(600)
    expect(m.BEE_HIT_DV, 'the two-hit compare byte (MILLI.MAC:2103, BE-47)').toBe(4)
    expect(m.BEE_MUSH_V_OFFSET, 'the plant cell is v+4 (MILLI.MAC:131, BE-19)').toBe(4)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Identification — the BEEMV/SHOOT2 picture band (BE-11/12/13/44)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — identification', () => {
  it('pics 0x38 and 0x39 are bees; the band edges are not (BE-12/13)', async () => {
    const m = await loadBee()
    expect(m.isBee(bee({ pic: 0x38 }))).toBe(true)
    expect(m.isBee(bee({ pic: 0x39 })), 'the flapped frame is still a bee').toBe(true)
    expect(m.isBee(bee({ pic: 0x37 })), 'CMP I,38 / BCC (BE-13)').toBe(false)
    expect(m.isBee(bee({ pic: 0x3a })), 'CMP I,3A / BCS (BE-12)').toBe(false)
  })

  it('a free slot (color 0) is never a bee', async () => {
    const m = await loadBee()
    expect(m.isBee(freeSlot({ pic: 0x38 }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BEEMV1 — the mushrooms-needed curve (:179-194, BE-29..33; the DF-49..52 crib)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — mushrooms needed', () => {
  it('5 below 20,000; 9 to 120,000 (BE-29/30/31)', async () => {
    const m = await loadBee()
    expect(m.mushroomsNeeded(0x00)).toBe(0x05)
    expect(m.mushroomsNeeded(0x01)).toBe(0x05)
    expect(m.mushroomsNeeded(0x02), 'CMP I,2 / BCC — 20k flips to 9').toBe(0x09)
    expect(m.mushroomsNeeded(0x11)).toBe(0x09)
  })

  it('from 120,000 the halved SCORE2 byte plus 6, capped at 0x2f (BE-32/33)', async () => {
    const m = await loadBee()
    expect(m.mushroomsNeeded(0x12), '0x12 >> 1 = 9, + 6').toBe(0x0f)
    expect(m.mushroomsNeeded(0x52), '0x29 + 6 — the last uncapped value').toBe(0x2f)
    expect(m.mushroomsNeeded(0x54), '0x2a + 6 = 0x30 hits the cap (BE-33)').toBe(0x2f)
    expect(m.mushroomsNeeded(0x99)).toBe(0x2f)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The start gates (:68-78, BE-5..9)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — start gates', () => {
  it('with the centipede alive, the bee needs FEW mushrooms near the bottom: needed >= MUSH (BE-5/8/9)', async () => {
    const m = await loadBee()
    // score2 0 → needed 5 (BE-29)
    expect(m.mayStartBee(env({ dead: 1, mush: 5 })), 'CMP X,MUSH — equal spawns').toBe(true)
    expect(m.mayStartBee(env({ dead: 1, mush: 6 })), 'BCC — many mushrooms block (BE-9)').toBe(false)
    expect(m.mayStartBee(env({ dead: 1, mush: 0 }))).toBe(true)
  })

  it('centipede dead + no beetles also runs the mushroom check (BE-6)', async () => {
    const m = await loadBee()
    expect(m.mayStartBee(env({ dead: 0, beetles: 0, mush: 6 }))).toBe(false)
    expect(m.mayStartBee(env({ dead: 0, beetles: 0, mush: 5 }))).toBe(true)
  })

  it('centipede dead + a beetle + CENTIN >= 10 spawns DIRECTLY, mushrooms be damned (BE-7)', async () => {
    const m = await loadBee()
    expect(m.mayStartBee(env({ dead: 0, beetles: 1, centin: 10, mush: 0xff }))).toBe(true)
    expect(m.mayStartBee(env({ dead: 0, beetles: 1, centin: 9, mush: 0xff })), 'CENTIN 9 falls back to the mushroom check').toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Speed and the spawn column (:199-240, BE-34..43)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — speed and spawn column', () => {
  it('dive speed 2 below 60,000; 3 from 60,000 (BE-34/35/36)', async () => {
    const m = await loadBee()
    expect(m.beeSpeed(0x00)).toBe(2)
    expect(m.beeSpeed(0x05)).toBe(2)
    expect(m.beeSpeed(0x06), 'CPY I,6 / BCS — 60k is fast').toBe(3)
    expect(m.beeSpeed(0x99)).toBe(3)
  })

  it('spawnH masks RND0 with 0xf8, rejects <0x10, subtracts 4 (BE-39/40/41)', async () => {
    const m = await loadBee()
    expect(m.spawnH(0x00)).toBeNull()
    expect(m.spawnH(0x0f)).toBeNull()
    expect(m.spawnH(0x10)).toBe(0x0c)
    expect(m.spawnH(0x47)).toBe(0x3c)
    expect(m.spawnH(0xff)).toBe(0xf4)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn writes — BEEMV3 + BEEMV2 (:197-240, BE-34..43)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — spawn', () => {
  it('startBee writes the BEEMV3/BEEMV2 slot bytes — straight down, dh 0 (BE-37/38/39/42/43)', async () => {
    const m = await loadBee()
    const slot = freeSlot({ dh: 0xaa })
    m.startBee(slot, env({ rnd0: 0x47, score2: 0 }))
    expect(slot.pic, 'picture 0x38 (BE-37)').toBe(0x38)
    expect(slot.v, 'top row (BE-38)').toBe(0xf8)
    expect(slot.h, 'random column').toBe(0x3c)
    expect(slot.color, 'turned on (BE-43)').toBe(0x79)
    expect(slot.dv, 'speed 2 below 60k (BE-36)').toBe(2)
    expect(slot.dh, 'HDIR cleared — the bee never drifts (BE-42)').toBe(0)
  })

  it('a 60k bee dives at 3 (BE-34/35)', async () => {
    const m = await loadBee()
    const slot = freeSlot()
    m.startBee(slot, env({ score2: 0x06 }))
    expect(slot.dv).toBe(3)
  })

  it('trySpawnBee runs the whole path: player gate, slot free, gates, valid rnd0 (BE-2/3/4)', async () => {
    const m = await loadBee()
    const slot = freeSlot()
    expect(m.trySpawnBee(slot, env({ playerAlive: false })), 'dead player (BE-2)').toBe(false)
    expect(m.trySpawnBee(bee(), env()), 'occupied slot never spawns (BE-4)').toBe(false)
    expect(m.trySpawnBee(slot, env({ mush: 6 })), 'many mushrooms (BE-9)').toBe(false)
    expect(m.trySpawnBee(slot, env({ rnd0: 0x0f })), 'invalid column defers the spawn').toBe(false)
    expect(m.trySpawnBee(slot, env())).toBe(true)
    expect(slot.color, 'the passing path wrote the slot').toBe(0x79)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Movement — flap parity and the dive (:91-128, BE-14..18)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — movement', () => {
  it('a dead player idles the bee (BE-2)', async () => {
    const m = await loadBee()
    const slot = bee()
    expect(m.moveBee(slot, env({ playerAlive: false }))).toEqual({ kind: 'idle' })
    expect(slot.v, 'no motion while idle').toBe(0x80)
  })

  it('the wings flap on EVEN frames — the opposite parity from the mosquito (BE-14/15)', async () => {
    const m = await loadBee()
    const flap = bee({ pic: 0x38 })
    m.moveBee(flap, env({ frame: 2 }))
    expect(flap.pic, 'frame & 1 === 0 flaps').toBe(0x39)
    m.moveBee(flap, env({ frame: 4 }))
    expect(flap.pic, 'EOR 1 toggles back').toBe(0x38)
    const still = bee({ pic: 0x38 })
    m.moveBee(still, env({ frame: 1 }))
    expect(still.pic, 'AND I,01 / BNE skips odd frames').toBe(0x38)
  })

  it('V subtracts dv each tick; H never moves (BE-17)', async () => {
    const m = await loadBee()
    const slot = bee({ v: 0x80, dv: 2, h: 0x40 })
    const r = m.moveBee(slot, env({ frame: 1 }))
    expect(r.kind).toBe('moved')
    expect(slot.v).toBe(0x7e)
    expect(slot.h, 'dh is 0 and nothing touches H').toBe(0x40)
  })

  it('a post-move V below 4 is the bottom: beeOff frees the slot (BE-18)', async () => {
    const m = await loadBee()
    const slot = bee({ v: 5, dv: 2, pts: 0x55 })
    expect(m.moveBee(slot, env({ frame: 1 }))).toEqual({ kind: 'offscreen' })
    expect(slot.color, 'BEEOFF clears the colour (BE-27)').toBe(0)
    expect(slot.h, 'BEEOFF clears H (BE-28)').toBe(0)
    expect(slot.pts, 'BEEOFF clears PTS (BE-26)').toBe(0)
    expect(slot.v, 'V keeps the subtracted value').toBe(3)
  })

  it('V exactly 4 is still on screen — CMP I,4 / BCC (BE-18)', async () => {
    const m = await loadBee()
    const slot = bee({ v: 6, dv: 2 })
    expect(m.moveBee(slot, env({ frame: 1 })).kind).toBe('moved')
    expect(slot.v).toBe(4)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The plant decision (:139-159, BE-19..25)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — mushroom planting', () => {
  it('plants on every-fourth frames when rnd1 & 3 === 0 (BE-22/24/25)', async () => {
    const m = await loadBee()
    const r = m.moveBee(bee(), env({ frame: 4, rnd1: 0x00 }))
    expect(r).toEqual({ kind: 'moved', plantMushroom: true })
  })

  it('the bee mask is 3 EVERYWHERE — no player-area halving (BE-23/24)', async () => {
    const m = await loadBee()
    // v 0x30 is inside the dragonfly's "player area" (< 0x48). rnd1 0x04:
    // mask 3 → 3 & 4 === 0 plants; the dragonfly's area mask 7 would block.
    const low = m.moveBee(bee({ v: 0x30 }), env({ frame: 4, rnd1: 0x04 }))
    expect(low).toEqual({ kind: 'moved', plantMushroom: true })
    // rnd1 0x02: mask 3 blocks; a port that borrowed the dragonfly's
    // above-area mask 1 would plant.
    const blocked = m.moveBee(bee({ v: 0xa0 }), env({ frame: 4, rnd1: 0x02 }))
    expect(blocked).toEqual({ kind: 'moved', plantMushroom: false })
  })

  it('off-cadence frames never plant (BE-22)', async () => {
    const m = await loadBee()
    const r = m.moveBee(bee(), env({ frame: 2, rnd1: 0x00 }))
    expect(r).toEqual({ kind: 'moved', plantMushroom: false })
  })

  it('NOCENT vetoes planting outside attract; attract bypasses the veto (BE-20/21)', async () => {
    const m = await loadBee()
    const vetoed = m.moveBee(bee(), env({ frame: 4, rnd1: 0x00, nocent: 1 }))
    expect(vetoed).toEqual({ kind: 'moved', plantMushroom: false })
    const attract = m.moveBee(bee(), env({ frame: 4, rnd1: 0x00, nocent: 1, attract: true }))
    expect(attract, 'BIT MODE / BMI skips the NOCENT check (BE-20)').toEqual({ kind: 'moved', plantMushroom: true })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BEEOFF and the TWO-HIT kill (:166-171, :2099-2108, BE-26..28, BE-44..50)
// ───────────────────────────────────────────────────────────────────────────────
describe('bee — off and the two-hit kill', () => {
  it('beeOff clears pts, colour and H; V and pic stay (BE-26/27/28)', async () => {
    const m = await loadBee()
    const slot = bee({ pts: 0x40, v: 0x60, pic: 0x39 })
    m.beeOff(slot)
    expect(slot.pts).toBe(0)
    expect(slot.color).toBe(0)
    expect(slot.h).toBe(0)
    expect(slot.v, 'BEEOFF leaves V').toBe(0x60)
    expect(slot.pic, 'BEEOFF leaves the picture').toBe(0x39)
  })

  it('the FIRST hit stores dv 4 and scores NOTHING (BE-47/49/50)', async () => {
    const m = await loadBee()
    const slot = bee({ dv: 2 })
    expect(m.beeHit(slot, false)).toEqual({ kind: 'speedup' })
    expect(slot.dv, 'STA X,BEEDV — the bee dives at 4 now (BE-49)').toBe(4)
  })

  it('a fast (60k) bee at dv 3 still takes two hits (BE-49)', async () => {
    const m = await loadBee()
    const slot = bee({ dv: 3 })
    expect(m.beeHit(slot, false)).toEqual({ kind: 'speedup' })
    expect(slot.dv).toBe(4)
  })

  it('the SECOND hit — dv already 4 — kills for 200 (BE-44/45/48)', async () => {
    const m = await loadBee()
    const slot = bee({ dv: 4 })
    expect(m.beeHit(slot, false)).toEqual({ kind: 'killed', points: 200 })
  })

  it('DDT does NOT bypass the two-hit rule: a first cloud hit only speeds up (BE-46/49)', async () => {
    const m = await loadBee()
    const fresh = bee({ dv: 2 })
    expect(m.beeHit(fresh, true), 'the CMP runs after the Y load — no early kill').toEqual({ kind: 'speedup' })
    expect(fresh.dv).toBe(4)
    const primed = bee({ dv: 4 })
    expect(m.beeHit(primed, true), 'BCD 6 hundreds (BE-46)').toEqual({ kind: 'killed', points: 600 })
  })
})
