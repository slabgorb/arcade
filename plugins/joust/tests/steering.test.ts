// tests/steering.test.ts
//
// Story jt8-3 — RED phase (Mr. Praline / TEA). The BEHAVIOUR suite for the
// cliff look-ahead (`B2DIR` JOUSTRV4.SRC:4104-4159 / `SHDIR` :4330-4377) and
// the shadow lord's SHDN/SHLEP laws (:4246-4298). Provenance companion:
// tests/steering-source.test.ts; plumbing + in-play guard:
// tests/steering-wiring.test.ts.
//
// ─── HOW THIS SUITE REDS TODAY ───────────────────────────────────────────────
//   • AC-1 look-ahead groups: `loadSteering()` throws in `beforeAll` — the
//     module has no steerWake/B2XLEN/SHXLEN/SHDIR_LAVA_Y exports yet.
//   • AC-2 SHDN/SHLEP law groups: `shadow()` EXISTS (uf1-8), so these red on
//     ASSERTIONS — today a blanket `enemyY > $D3 ⇒ flap` runs before every
//     branch, which flaps in three places the ROM does not (a leftward-moving
//     SHDN shadow, the $D3 scanline itself is excluded, a rising SHLEP shadow
//     above its line).
//   • The green-on-arrival controls are labelled as such inline; each one's
//     non-vacuity is established by the mutation table in the session file
//     (TEA Assessment), not asserted in prose.
//
// ─── FIXTURE PREMISES ARE PROVEN, NOT TRUSTED (jt5-10) ───────────────────────
// Every cliff/open-air coordinate below is ASSERTED against the transcribed
// BCK_X_TABLE/BCK_Y_TABLE (the ROM's `BCKXTB`/`BCKYTB`, flight.ts /
// arena.ts) inside the test that uses it — and the cliff samples are chosen
// where the LANDING pair (`groundMaskAt`, the `CKGND` :6705-6706 analog) reads
// ZERO, so an implementation that samples the wrong table pair cannot pass.

import { describe, it, expect, beforeAll } from 'vitest'
import { loadEnemy, type EnemyModule, type EnemyState, type EntityState } from './helpers/enemy-contract.js'
import { loadSteering, type SteeringModule } from './helpers/steering-contract.js'
import { waveValue } from '../src/core/difficulty.js'
import { BCK_X_TABLE, X_TABLE_ORIGIN, groundMaskAt } from '../src/core/flight.js'
import { BCK_Y_TABLE } from '../src/core/arena.js'

// ─── The test's OWN oracle for the background-collision mask ─────────────────
// Deliberately re-derived here from the transcribed tables (same indexing as
// `landMaskAtX`: table[x + X_TABLE_ORIGIN], out of range ⇒ no ground) so the
// fixtures can prove their premises without consulting the code under test.
const bckX = (x: number): number => {
  const i = x + X_TABLE_ORIGIN
  return i >= 0 && i < BCK_X_TABLE.length ? BCK_X_TABLE[i] : 0
}
const bck = (x: number, y: number): number =>
  y >= 0 && y < BCK_Y_TABLE.length ? bckX(x) & BCK_Y_TABLE[y] : 0

/** `(velY × 8) >> 8` — the ROM's sample-line projection (three ASLB/ROLA pairs
 * :4108-4115 then `LEAY A,Y` :4118): the HIGH byte of PVELY×8, signed. */
const projectY = (pixelY: number, velY: number): number => pixelY + ((velY * 8) >> 8)

/** `B2XLEN EQU 27+4` (:3969) — used by the fixtures' premise checks. The
 * contract pins the module's own export to this same value. */
const XLEN = 31

// ─── Fixtures (probed against the tables; premises asserted in-test) ─────────
/** Cliff 31 px to the RIGHT (CLIF1R's box), self and behind clear, LANDING pair clear at the sample. */
const CLIFF_R = { x: 204, y: 75 }
/** Cliff 31 px to the LEFT (CLIF1L's box) — the mirror. */
const CLIFF_L = { x: 36, y: 75 }
/** Open air in every direction (and 16 px below). */
const OPEN = { x: 204, y: 40 }
/** Clear at the flight line, SOLID 16 px below (and clear at +2/+8) — the projection fixture. */
const PROJ = { x: 204, y: 59 }
/** Rising-projection twin of CLIFF_R: at y 83 a rising (−$100) sample lands on y 75. */
const CLIFF_R_RISING = { x: 204, y: 83 }
/** An X whose +31 sample sits in CLIF5's tall bottom box for the lava-gate fixtures. */
const LAVA_X = 100

function airborneEntity(pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 150,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

function enemyAt(pixelY: number, over: Partial<EnemyState> = {}, entOver: Partial<EntityState> = {}): EnemyState {
  return {
    entity: airborneEntity(pixelY, entOver),
    facing: 1,
    pchase: 1,
    brain: 'b2undr',
    decision: 'b2undr',
    ...over,
  }
}

/** A hunter at (x, pixelY) travelling at `velXIndex` (the FLYX sign is the travel direction). */
function hunterAt(x: number, pixelY: number, velXIndex: number, entOver: Partial<EntityState> = {}): EnemyState {
  return enemyAt(pixelY, {}, { posX: x, velXIndex, ...entOver })
}

function shadowAt(x: number, pixelY: number, velXIndex: number, entOver: Partial<EntityState> = {}): EnemyState {
  return enemyAt(pixelY, { brain: 'shadow', decision: 'shadow' }, { posX: x, velXIndex, ...entOver })
}

let E: EnemyModule
beforeAll(async () => {
  E = await loadEnemy()
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE LOOK-AHEAD (B2DIR :4104-4159 / SHDIR :4330-4377): turn + slow at
//        a cliff 31 px ahead in the travel direction; nothing in open air; the
//        plain bounder does NOT look ahead.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the cliff look-ahead constants', () => {
  let S: SteeringModule
  beforeAll(async () => {
    S = await loadSteering()
  })

  it('exports B2XLEN and SHXLEN, both 27+4 = 31 (:3969/:4228, DECIMAL)', () => {
    expect(S.B2XLEN, 'B2XLEN EQU 27+4').toBe(31)
    expect(S.SHXLEN, 'SHXLEN EQU 27+4').toBe(31)
  })

  it("exports the shadow's OWN lava gate $D0 (:4330-4334) — distinct from LAVA_ESCAPE_Y $D3", () => {
    expect(S.SHDIR_LAVA_Y, 'SHDIR compares PPOSY+1 against #$D0').toBe(0xd0)
    expect(E.LAVA_ESCAPE_Y, 'the SHDN escape line is a DIFFERENT constant').toBe(0xd3)
    expect(S.SHDIR_LAVA_Y, 'do not conflate the two').not.toBe(E.LAVA_ESCAPE_Y)
  })
})

describe('AC-1 — the hunter turns AWAY at a cliff 31 px ahead, and slows', () => {
  let S: SteeringModule
  beforeAll(async () => {
    S = await loadSteering()
  })

  it('fixture premise: CLIFF_R has BCK solid at +31, clear at self/behind — and the LANDING pair is CLEAR there', () => {
    // The discriminator (jt5-10: prove the fixture): B2DIR samples the
    // BACKGROUND pair (:4119-4120). At this coordinate the landing pair reads 0,
    // so `groundMaskAt` — the CKGND analog the story prose names — CANNOT be the
    // sampler that passes this suite.
    expect(bck(CLIFF_R.x + XLEN, CLIFF_R.y), 'BCK solid 31 px ahead').not.toBe(0)
    expect(bck(CLIFF_R.x, CLIFF_R.y), 'BCK clear at the enemy itself').toBe(0)
    expect(bck(CLIFF_R.x - XLEN, CLIFF_R.y), 'BCK clear behind').toBe(0)
    expect(groundMaskAt(CLIFF_R.x + XLEN, CLIFF_R.y), 'the LANDING pair reads 0 at the sample').toBe(0)
  })

  it('moving RIGHT into the cliff ⇒ turned, facing LEFT (:4137-4141)', () => {
    const r = S.steerWake(hunterAt(CLIFF_R.x, CLIFF_R.y, 8), null)
    expect(r.turned, 'the cliff 31 px ahead is detected').toBe(true)
    expect(r.enemy.facing, '#-1 STA PFACE — FACE LEFT (away)').toBe(-1)
  })

  it('moving LEFT into the mirror cliff ⇒ turned, facing RIGHT (:4119-4122)', () => {
    expect(bck(CLIFF_L.x - XLEN, CLIFF_L.y), 'premise: BCK solid 31 px to the LEFT').not.toBe(0)
    expect(bck(CLIFF_L.x, CLIFF_L.y), 'premise: clear at self').toBe(0)
    const l = S.steerWake({ ...hunterAt(CLIFF_L.x, CLIFF_L.y, -8), facing: -1 }, null)
    expect(l.turned, 'the cliff 31 px ahead of the leftward travel is detected').toBe(true)
    expect(l.enemy.facing, 'CLR PFACE — FACE RIGHT (away)').toBe(1)
  })

  it('the look-ahead is idempotent — already facing away, it SETS the same facing (no toggle)', () => {
    // B2DIR writes an ABSOLUTE facing (:4122/:4140-4141), unlike homing's COM.
    // Sliding right (velXIndex +8) while already facing left must stay left.
    const r = S.steerWake({ ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8), facing: -1 }, null)
    expect(r.turned, 'still a cliff ahead of the TRAVEL direction').toBe(true)
    expect(r.enemy.facing, 'facing set away, not complemented back').toBe(-1)
  })

  it('open air ⇒ NOT turned, facing held (:4121 BEQ B2DIRA)', () => {
    expect(bck(OPEN.x + XLEN, OPEN.y), 'premise: nothing ahead').toBe(0)
    expect(bck(OPEN.x - XLEN, OPEN.y), 'premise: nothing behind either').toBe(0)
    const r = S.steerWake(hunterAt(OPEN.x, OPEN.y, 8), null)
    expect(r.turned).toBe(false)
    expect(r.enemy.facing, 'nothing to steer away from').toBe(1)
  })

  it('not moving (velXIndex 0) ⇒ NO look-ahead even beside a cliff (:4105 BEQ B2DIRA)', () => {
    const r = S.steerWake(hunterAt(CLIFF_R.x, CLIFF_R.y, 0), null)
    expect(r.turned, 'a parked FLYX index has no travel direction').toBe(false)
    expect(r.enemy.facing).toBe(1)
  })

  it('the sample line is projected by (velY×8)>>8 — a diving hunter sees the cliff BELOW its flight line', () => {
    // PROJ is clear at its own scanline in every direction, and solid 16 px
    // below at +31 (and clear at +2 and +8, which kills a velY>>8 or velY>>6
    // misreading of the three ASLB/ROLA pairs).
    expect(bck(PROJ.x + XLEN, PROJ.y), 'premise: level sample clear').toBe(0)
    expect(bck(PROJ.x + XLEN, PROJ.y + 16), 'premise: the +16 sample is solid').not.toBe(0)
    expect(bck(PROJ.x + XLEN, PROJ.y + 2), 'premise: a >>8 misread would sample clear air').toBe(0)
    expect(bck(PROJ.x + XLEN, PROJ.y + 8), 'premise: a >>6 misread too').toBe(0)
    const level = S.steerWake(hunterAt(PROJ.x, PROJ.y, 8, { velY: 0 }), null)
    expect(level.turned, 'level flight samples the flight line — clear').toBe(false)
    const diving = S.steerWake(hunterAt(PROJ.x, PROJ.y, 8, { velY: 0x200 }), null)
    expect(projectY(PROJ.y, 0x200), 'the oracle: $0200 projects 16 px down').toBe(PROJ.y + 16)
    expect(diving.turned, 'the dive projects the sample into the cliff').toBe(true)
    expect(diving.enemy.facing).toBe(-1)
  })

  it('the plain bounder does NOT look ahead — same fixture, boundr brain, nothing happens', () => {
    const r = S.steerWake({ ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8), brain: 'boundr', decision: 'boundr' }, null)
    expect(r.turned, 'BODIR (:3876-3884) reads PFACE and samples nothing').toBe(false)
    expect(r.enemy.facing).toBe(1)
  })

  it('the dumb LINET does not either', () => {
    const r = S.steerWake(
      { ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8), brain: 'linet', pchase: 0 },
      null,
    )
    expect(r.turned).toBe(false)
    expect(r.enemy.facing).toBe(1)
  })

  it('a grounded enemy does not steer (the brains are flight routines)', () => {
    const grounded = {
      ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8),
      entity: { ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8).entity, airborne: false },
    }
    const r = S.steerWake(grounded, null)
    expect(r.turned).toBe(false)
  })

  it('steerWake is pure — the argument is never mutated', () => {
    const before = hunterAt(CLIFF_R.x, CLIFF_R.y, 8)
    const snapshot = JSON.parse(JSON.stringify(before)) as unknown
    S.steerWake(before, null)
    expect(before).toEqual(snapshot)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// jt9-48 — B2DIRA (:4148-4150) / SHDIRA (:4379-4381): the COLLISION-DRIVEN
// bump-facing arm. jt9-17 parked `PBUMPX` (the OSTLR shove) on the DemoProcess
// but never wired the facing arm that spends it. `B2DIR`/`SHDIR` funnel EVERY
// airborne path through the B2DIRA/SHDIRA tail before the aim (SHFDIR/B2FDIR):
//
//     B2DIRA  LDA  PBUMPX,U   FACE, BUMPED DIRECTION   :4148
//             BEQ  B2FDIR                              :4149  ← zero ⇒ no write
//             STA  PFACE,U                             :4150  ← else face along it
//
// A non-zero shove is the LAST word on facing. It is reached three ways, and
// this suite pins all three: the PARKED branch (`BEQ B2DIRA` :4105), OPEN AIR
// (`BEQ B2DIRA` :4121), and a CLIFF TURN — `B2DICL` (:4142-4146) installs the
// slow episode + `LDB #1` then FALLS THROUGH into B2DIRA (:4147-4148), so a
// bump OVERRIDES even the turn-away it just wrote. `STA PFACE`: PFACE<0 is LEFT
// (`BMI` :4152/:4383), ≥0 is RIGHT — so `facing = sign(bumpX)`, matching the
// port's +1=right / −1=left. The shove passes in as steerWake's 3rd arg (the
// value jt9-17 parked on `DemoProcess.bumpX`); it is NEVER reached when the
// lava gate diverted the wake (B2DIRL/$D0), nor for the bounder/linet/grounded,
// which return before the tail. The wiring — bump plumbed from the process to
// this arg — is steering-wiring.test.ts; the source is steering-source.test.ts.
describe('jt9-48 — B2DIRA/SHDIRA spend PBUMPX: facing = sign(bump), the last word before the aim', () => {
  let S: SteeringModule
  beforeAll(async () => {
    S = await loadSteering()
  })

  it('AC — a PARKED hunter given a RIGHTWARD bump faces RIGHT on its next steering decision', () => {
    // The story's headline AC. Parked (velXIndex 0, no look-ahead) in open air,
    // so the shove is the ONLY facing driver. Facing starts LEFT so the flip is
    // observable (a vacuous +1→+1 would prove nothing).
    const r = S.steerWake({ ...hunterAt(OPEN.x, OPEN.y, 0), facing: -1 }, null, 16)
    expect(r.turned, 'no cliff — a parked FLYX index samples nothing').toBe(false)
    expect(r.enemy.facing, 'STA PFACE — sign(+16) = FACE RIGHT').toBe(1)
  })

  it('a leftward bump faces LEFT (the mirror — sign carries the direction)', () => {
    const r = S.steerWake({ ...hunterAt(OPEN.x, OPEN.y, 0), facing: 1 }, null, -16)
    expect(r.enemy.facing, 'sign(−16) = FACE LEFT').toBe(-1)
  })

  it('a ZERO bump leaves facing exactly as it was (:4149 BEQ B2FDIR — no write)', () => {
    // The guard on the BEQ: sign(0) must NOT collapse facing to 0 or force a
    // side. An unshoved bird keeps whatever the look-ahead left.
    const r = S.steerWake({ ...hunterAt(OPEN.x, OPEN.y, 0), facing: -1 }, null, 0)
    expect(r.enemy.facing, 'zero shove ⇒ facing untouched').toBe(-1)
  })

  it('an OMITTED bump (undefined — an unshoved process) is a no-op too', () => {
    // The `DemoProcess.bumpX` field is optional; frame.ts hands `undefined` for
    // a bird that never bounced. `undefined != 0` is true in JS, so a naive
    // `if (bumpX != 0)` would face `sign(undefined) = NaN` — this pins the
    // `?? 0` / explicit-zero handling (typescript.md #4).
    const r = S.steerWake({ ...hunterAt(OPEN.x, OPEN.y, 0), facing: -1 }, null)
    expect(r.enemy.facing, 'no shove argument ⇒ facing held').toBe(-1)
  })

  it('a MOVING hunter in OPEN air bump-faces too — B2DIRA is NOT the parked branch alone (:4121 BEQ B2DIRA)', () => {
    // The open-air `BEQ B2DIRA` reaches the same tail. An implementation that
    // only spends the bump when velXIndex==0 leaves this one red.
    expect(bck(OPEN.x + XLEN, OPEN.y), 'premise: nothing ahead to turn at').toBe(0)
    const r = S.steerWake({ ...hunterAt(OPEN.x, OPEN.y, 8), facing: -1 }, null, 16)
    expect(r.turned, 'open air — the look-ahead did not turn').toBe(false)
    expect(r.enemy.facing, 'the shove still wins on a moving bird').toBe(1)
  })

  it('the bump OVERRIDES a cliff turn — B2DICL falls THROUGH into B2DIRA (:4142-4150)', () => {
    // Moving RIGHT into CLIFF_R, the look-ahead turns the bird to face LEFT and
    // installs the slow episode (turned=true). Then B2DICL falls into B2DIRA,
    // and a RIGHTWARD shove overwrites PFACE back to RIGHT — the shove is the
    // last word. The episode/flap (turned) survives; only facing is overridden.
    expect(bck(CLIFF_R.x + XLEN, CLIFF_R.y), 'premise: cliff solid 31 px ahead').not.toBe(0)
    const noBump = S.steerWake({ ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8), facing: 1 }, null)
    expect(noBump.turned, 'control: the cliff is detected').toBe(true)
    expect(noBump.enemy.facing, 'control: without a shove the turn faces LEFT away').toBe(-1)
    const bumped = S.steerWake({ ...hunterAt(CLIFF_R.x, CLIFF_R.y, 8), facing: 1 }, null, 16)
    expect(bumped.turned, 'the slow episode + flap still install (B2DICL ran)').toBe(true)
    expect(bumped.enemy.facing, 'but the rightward shove OVERRIDES the turn-away').toBe(1)
  })

  it('a LAVA-DIVERTED hunter never bump-faces — B2DIRL ($D3) fires before B2DIR (:4097-4102)', () => {
    // At/below $D3 and falling is BOLAVA's territory; the wake never enters
    // B2DIR, so it never reaches B2DIRA. A shove here is ignored. Green before
    // AND after — if it flips, the bump was applied ahead of the lava gate.
    const r = S.steerWake(hunterAt(LAVA_X, 212, 8, { velY: 0x200 }), null, -16)
    expect(r.turned, '212 ≥ $D3 and falling ⇒ JMP BOLAVA').toBe(false)
    expect(r.enemy.facing, 'a lava-diverted wake reaches no bump arm').toBe(1)
  })

  it('the plain BOUNDER never bump-faces — BODIR (:3876) has no PBUMPX arm', () => {
    // The complete set of PBUMPX reads in the direction region is exactly two:
    // B2DIRA and SHDIRA (steering-source.test.ts). BODIR is not one of them.
    const r = S.steerWake(
      { ...hunterAt(OPEN.x, OPEN.y, 0), brain: 'boundr', decision: 'boundr', facing: -1 },
      null,
      16,
    )
    expect(r.enemy.facing, 'a bounder returns before the tail — no shove').toBe(-1)
  })

  it('the dumb LINET never bump-faces either', () => {
    const r = S.steerWake(
      { ...hunterAt(OPEN.x, OPEN.y, 0), brain: 'linet', pchase: 0, facing: -1 },
      null,
      16,
    )
    expect(r.enemy.facing).toBe(-1)
  })

  it('a GROUNDED enemy does not bump-face (the arm is a flight routine)', () => {
    const grounded = {
      ...hunterAt(OPEN.x, OPEN.y, 0),
      facing: -1 as const,
      entity: { ...hunterAt(OPEN.x, OPEN.y, 0).entity, airborne: false },
    }
    const r = S.steerWake(grounded, null, 16)
    expect(r.enemy.facing, 'grounded ⇒ no steering wake at all').toBe(-1)
  })

  it('steerWake stays pure with a bump — the argument is never mutated', () => {
    const before = { ...hunterAt(OPEN.x, OPEN.y, 0), facing: -1 as const }
    const snapshot = JSON.parse(JSON.stringify(before)) as unknown
    S.steerWake(before, null, 16)
    expect(before).toEqual(snapshot)
  })

  // ── the shadow's SHDIRA, on its one steerable route (no players → SHLEV) ────
  it('a PARKED no-target shadow spends the bump too — SHDIRA (:4379-4381)', () => {
    const r = S.steerWake({ ...shadowAt(OPEN.x, OPEN.y, 0), facing: -1 }, null, 16)
    expect(r.turned, 'no cliff').toBe(false)
    expect(r.enemy.facing, 'sign(+16) = FACE RIGHT').toBe(1)
  })

  it('the shadow mirrors it leftward, and a MOVING no-target shadow bump-faces in open air', () => {
    const parkedLeft = S.steerWake({ ...shadowAt(OPEN.x, OPEN.y, 0), facing: 1 }, null, -16)
    expect(parkedLeft.enemy.facing, 'sign(−16) = FACE LEFT').toBe(-1)
    const movingOpen = S.steerWake({ ...shadowAt(OPEN.x, OPEN.y, 8), facing: -1 }, null, 16)
    expect(movingOpen.turned, 'open air — no turn').toBe(false)
    expect(movingOpen.enemy.facing, 'the shove wins on a moving shadow').toBe(1)
  })
})

describe('AC-1 — the hunter’s lava gate is $D3 (B2DIRL :4097-4102), the shadow’s is $D0 (:4330-4334)', () => {
  let S: SteeringModule
  beforeAll(async () => {
    S = await loadSteering()
  })

  it('fixture premise: the CLIF5 box is solid at the diving sample for LAVA_X', () => {
    // A dive at $0200 from these scanlines projects the sample 16 px down into
    // CLIF5's tall BCK box; the flight line itself is clear.
    for (const y of [207, 209, 212]) {
      expect(bck(LAVA_X + XLEN, y + 16), `premise: solid at ${y}+16`).not.toBe(0)
      expect(bck(LAVA_X + XLEN, y), `premise: clear on the flight line at ${y}`).toBe(0)
    }
  })

  it('a hunter at scanline 209 (above $D3) diving at the box STILL steers', () => {
    const r = S.steerWake(hunterAt(LAVA_X, 209, 8, { velY: 0x200 }), null)
    expect(r.turned, '209 < $D3 — B2DIRL sends it to B2DIR').toBe(true)
  })

  it('a hunter at/below $D3 and FALLING does not steer — BOLAVA’s territory (:4100-4102)', () => {
    const r = S.steerWake(hunterAt(LAVA_X, 212, 8, { velY: 0x200 }), null)
    expect(r.turned, '212 ≥ $D3 and falling ⇒ JMP BOLAVA, not B2DIR').toBe(false)
    expect(r.enemy.facing).toBe(1)
  })

  it('the SHADOW’s gate bites 3 scanlines EARLIER: at 209 the shadow skips, the hunter steers', () => {
    // The $D0-vs-$D3 discrimination, behaviourally: the same fixture, two
    // brains. 209 ≥ $D0 (shadow: no steer) but 209 < $D3 (hunter: steers).
    const asShadow = S.steerWake(shadowAt(LAVA_X, 209, 8, { velY: 0x200 }), null)
    expect(asShadow.turned, 'SHDIR: 209 ≥ $D0 and falling ⇒ BOLAVA').toBe(false)
    const asHunter = S.steerWake(hunterAt(LAVA_X, 209, 8, { velY: 0x200 }), null)
    expect(asHunter.turned, 'B2DIR: 209 < $D3 ⇒ steer').toBe(true)
  })

  it('a shadow at 207 (above $D0) diving at the box steers', () => {
    const r = S.steerWake(shadowAt(LAVA_X, 207, 8, { velY: 0x200 }), null)
    expect(r.turned, '207 < $D0 — SHDIR proceeds to the look-ahead').toBe(true)
    expect(r.enemy.facing).toBe(-1)
  })

  it('both gates are INCLUSIVE at their own scanline — $D3 exactly gates the hunter, $D0 exactly gates the shadow', () => {
    // Review round 1: both `>`-for-`>=` mutants survived the whole suite —
    // 207/209/212 fixtures behave identically under either comparison, so the
    // boundary scanline itself was unguarded. The ROM's BLO branches make both
    // gates inclusive: CMPA #$D3 / BLO B2DIR (:4098-4099) and CMPA #$D0 / BLO
    // 1$ (:4331-4332) steer strictly BELOW the compare value only.
    expect(bck(LAVA_X + XLEN, 0xd3 + 16), 'premise: the hunter boundary dive samples solid').not.toBe(0)
    expect(bck(LAVA_X + XLEN, 0xd0 + 16), 'premise: the shadow boundary dive samples solid').not.toBe(0)
    const hunterAtLine = S.steerWake(hunterAt(LAVA_X, 0xd3, 8, { velY: 0x200 }), null)
    expect(hunterAtLine.turned, 'at $D3 exactly, falling ⇒ BOLAVA, not B2DIR').toBe(false)
    const shadowAtLine = S.steerWake(shadowAt(LAVA_X, 0xd0, 8, { velY: 0x200 }), null)
    expect(shadowAtLine.turned, 'at $D0 exactly, falling ⇒ BOLAVA, not SHDIR').toBe(false)
  })
})

describe('AC-1/AC-2 — the shadow looks ahead ONLY on the no-players route (SHLEV → SHDIR)', () => {
  let S: SteeringModule
  beforeAll(async () => {
    S = await loadSteering()
  })

  it('no players (target null) ⇒ the shadow steers at the CLIFF_R fixture', () => {
    // The positive control for the negative below — same fixture, target
    // removed. Without this pair the negative would still pass the day the
    // shadow stops being able to steer at all (jt5-10's absence rule).
    const r = S.steerWake(shadowAt(CLIFF_R.x, CLIFF_R.y, 8), null)
    expect(r.turned, 'SHLEV falls into SHDIR (:4329-4330)').toBe(true)
    expect(r.enemy.facing).toBe(-1)
  })

  it('HUNTING (a short-range target) ⇒ NO look-ahead: SHLEP exits SHLEPB → SHDIRA (:4303-4310)', () => {
    const shlepTarget = { pixelY: CLIFF_R.y + waveValue('SHDNRG', 1) - 2, velXIndex: 0 }
    const r = S.steerWake(shadowAt(CLIFF_R.x, CLIFF_R.y, 8), shlepTarget)
    expect(r.turned, 'a hunting shadow never consults the mask').toBe(false)
    expect(r.enemy.facing).toBe(1)
  })

  it('long-range seeks do not look ahead either (SHDN/SHUP exit via SHDIRB, :4255/:4267)', () => {
    const below = { pixelY: CLIFF_R.y + waveValue('SHDNRG', 1), velXIndex: 0 }
    const above = { pixelY: CLIFF_R.y + waveValue('SHUPRG', 1), velXIndex: 0 }
    expect(S.steerWake(shadowAt(CLIFF_R.x, CLIFF_R.y, 8), below).turned, 'SHDN coasts').toBe(false)
    expect(S.steerWake(shadowAt(CLIFF_R.x, CLIFF_R.y, 8), above).turned, 'SHUP coasts').toBe(false)
  })

  it('the HUNTER, by contrast, steers on player-present wakes too (B2LE11 → B2DIR :4089-4094)', () => {
    const anyTarget = { pixelY: CLIFF_R.y, velXIndex: 0 }
    const r = S.steerWake(hunterAt(CLIFF_R.x, CLIFF_R.y, 8), anyTarget)
    expect(r.turned, 'every hunter route funnels into B2DIR').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// jt9-60 — THE HUNTING SHADOW SPENDS PBUMPX AT SHDIRA (:4379-4382). jt9-48 wired
// the bump-facing for the NULL-TARGET shadow through `steerWake`, but that arm
// bails once `target !== null` (a hunting shadow never looks ahead). In the ROM
// the hunting shadow STILL reaches SHDIRA on its AIM wakes — SHLEP's line-track
// (`SHLEPB → JMP SHDIRA`, :4303-4310), SHUP3, and a PARKED long-range seek that
// falls through `SHDIRB`'s `BEQ SHDIRA` (:4388-4389) — where `STA PFACE,U` makes
// `sign(bumpX)` the last word on facing and SHFDIR aims CURJOY at it. A MOVING
// seek COASTS via SHDIRB (dir 0) and never reaches the tail: it must NOT spend
// the bump. Tested through `stepEnemyDetailed` (the real per-wake step, which
// performs SHDIRA's `STA PFACE,U`) so the persisted facing is observed, not just
// the transient CURJOY dir. Mechanism, not a post-drain remainder (jt9-61 re-times
// the drain): every fixture uses an already-drained sign, and pins the SIGN.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-60 — the HUNTING shadow faces its bump on the AIM path, not while coasting', () => {
  // A shadow HIGH above the lava line ($D0/$D3) so no gate diverts the wake.
  const HI = 60
  /** delta 0 ⇒ SHLEP short-range line-track (always an AIM exit → SHDIRA). */
  const shortRangePlayer = { pixelY: HI, velXIndex: 0 }
  /** delta ≥ SHDNRG ⇒ SHDN long-range down-seek (AIM iff PARKED, else SHDIRB coast). */
  const downSeekPlayer = { pixelY: HI + waveValue('SHDNRG', 1) + 4, velXIndex: 0 }

  const hunt = (enemy: EnemyState, player: typeof shortRangePlayer, bumpX: number): -1 | 1 =>
    E.stepEnemyDetailed(enemy, { player, bumpX }).enemy.facing

  it('a PARKED hunting shadow facing LEFT + a positive parked bump ends facing RIGHT — SHLEP → SHDIRA', () => {
    // The mirror of jt9-48's `shovedHunter`, but for a HUNTING shadow (target
    // present). The ONLY driver is the shove: parked (no travel dir), high (no
    // lava gate), short range (SHLEP, whose only PFACE write in the ROM is
    // SHDIRA's bump). LEFT facer with +16 ⇒ RIGHT.
    expect(hunt({ ...shadowAt(204, HI, 0), facing: -1 }, shortRangePlayer, 16)).toBe(1)
  })

  it('CONTROL: the same parked hunting shadow with NO bump holds its LEFT facing', () => {
    // Green before AND after — isolates the shove as the cause. SHLEP alone
    // never writes PFACE (`SHLEPB → SHDIRA` with PBUMPX==0 skips the STA), so a
    // LEFT facer stays LEFT.
    expect(hunt({ ...shadowAt(204, HI, 0), facing: -1 }, shortRangePlayer, 0)).toBe(-1)
  })

  it('and mirrors leftward: a RIGHT-facing parked hunting shadow + a negative bump ends facing LEFT', () => {
    expect(hunt({ ...shadowAt(204, HI, 0), facing: 1 }, shortRangePlayer, -16)).toBe(-1)
  })

  it('a PARKED long-range down-seek is an AIM path too — SHDN falls through SHDIRB’s BEQ SHDIRA (:4389)', () => {
    // Not just SHLEP: a PARKED seek (PVELX==0) reaches SHDIRA through SHDIRB's
    // fall-through, so it spends the bump as well.
    expect(hunt({ ...shadowAt(204, HI, 0), facing: -1 }, downSeekPlayer, 16)).toBe(1)
  })

  it('DISCRIMINATOR: a MOVING long-range down-seek does NOT adopt sign(bump) — SHDIRB coasts (dir 0), never reaching SHDIRA', () => {
    // THE CLAIM the guard must encode: the bump is spent at SHDIRA (aim), NOT by
    // a blanket "shadow always faces the bump". A moving seek writes CURJOY dir 0
    // (`SHDIRB` :4390-4391) and never falls into the SHDIRA tail, so its facing is
    // untouched this wake — the +16 shove does not turn it.
    expect(hunt({ ...shadowAt(204, HI, 8), facing: -1 }, downSeekPlayer, 16)).toBe(-1)
  })

  it('PAIRED: same range, same +16 bump — only PARKED (aim) spends it; MOVING (coast) does not', () => {
    const parked = hunt({ ...shadowAt(204, HI, 0), facing: -1 }, downSeekPlayer, 16)
    const moving = hunt({ ...shadowAt(204, HI, 8), facing: -1 }, downSeekPlayer, 16)
    expect(parked, 'PVELX==0 ⇒ SHDIRA aim ⇒ RIGHT').toBe(1)
    expect(moving, 'PVELX≠0 ⇒ SHDIRB coast ⇒ LEFT (held)').toBe(-1)
    expect(parked, 'the aim-vs-coast split is the whole point — the two disagree').not.toBe(moving)
  })

  it('PRESERVED (jt9-48): a NULL-TARGET parked shadow still spends its bump — via steerWake, unchanged', () => {
    // The hunting arm must not disturb jt9-48: with no target the shadow flies
    // SHLEV → SHDIR and `steerWake`'s bumpFace still faces it. LEFT + 16 ⇒ RIGHT.
    expect(E.stepEnemyDetailed({ ...shadowAt(204, HI, 0), facing: -1 }, { player: null, bumpX: 16 }).enemy.facing).toBe(1)
  })

  it('unit — shadow()’s CURJOY dir: parked AIM returns sign(bump); moving COAST returns 0 (SHFDIR vs SHDIRB)', () => {
    // The mechanism at the brain seam, below the persisted facing: shadow()
    // itself aims dir at sign(bumpX) only on the SHDIRA-reaching wake.
    const aim = E.shadow({ ...shadowAt(204, HI, 0), facing: -1 }, downSeekPlayer, 1, 16)
    const coast = E.shadow({ ...shadowAt(204, HI, 8), facing: -1 }, downSeekPlayer, 1, 16)
    expect(aim.dir, 'parked seek ⇒ SHDIRA ⇒ dir = sign(+16) = +1').toBe(1)
    expect(coast.dir, 'moving seek ⇒ SHDIRB coast ⇒ dir 0, unbumped').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE SHADOW'S OWN LAWS (SHADOW :4230-4298): SHDN free-falls with the
//        velX-gated $D3 escape; SHLEP tracks the player's line with a
//        falling-gated $D3 term; the blanket pre-branch flap is retired.
//        `shadow()` exists (uf1-8), so THESE RED ON ASSERTIONS TODAY.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — SHDN free-fall and the :4249-4254 lava escape', () => {
  const SHDN_DELTA = (): number => waveValue('SHDNRG', 1)

  it('the escape flap is gated on PVELX ≥ 0 — a LEFTWARD-moving shadow deep over the lava does NOT flap', () => {
    // :4252-4253 reads `LDA PVELX,U / BMI 3$` — the X velocity, exactly as
    // written in all four vendored revisions (RV1:4178, RV2:4213, RV3:4230,
    // RV4:4252; its own comment says "FALLING?", and the comment is wrong —
    // steering-source pins the consistency). RED today: the blanket top-level
    // escape flaps regardless.
    const e = shadowAt(150, 212, -2, { velY: 0x100 })
    const player = { pixelY: 212 + SHDN_DELTA(), velXIndex: 0 }
    expect(E.shadow(e, player, 1).flap, 'BMI 3$ — moving left ⇒ no flap, keep dropping').toBe(false)
  })

  it('CONTROL: the same shadow moving RIGHT (or parked) flaps to escape (INCB :4254)', () => {
    const player = { pixelY: 212 + SHDN_DELTA(), velXIndex: 0 }
    expect(E.shadow(shadowAt(150, 212, 2, { velY: 0x100 }), player, 1).flap, 'PVELX ≥ 0 ⇒ flap').toBe(true)
    expect(E.shadow(shadowAt(150, 212, 0, { velY: 0x100 }), player, 1).flap, 'zero is not negative').toBe(true)
  })

  it('the boundary is AT $D3, inclusive (CMPA #$D3 / BLO — :4250-4251)', () => {
    // RED today: the blanket check uses a strict `>`, so the $D3 scanline
    // itself free-falls where the ROM already escapes.
    const player = { pixelY: 0xd3 + SHDN_DELTA(), velXIndex: 0 }
    expect(
      E.shadow(shadowAt(150, 0xd3, 2, { velY: 0x100 }), player, 1).flap,
      'at $D3 exactly, moving right ⇒ the escape fires',
    ).toBe(true)
  })

  it('CONTROL: above the line the drop is a true free-fall — no flap, no brake, any speed', () => {
    const player = (y: number): { pixelY: number; velXIndex: number } => ({
      pixelY: y + SHDN_DELTA(),
      velXIndex: 0,
    })
    expect(E.shadow(shadowAt(150, 200, 2, { velY: 0x100 }), player(200), 1).flap).toBe(false)
    expect(E.shadow(shadowAt(150, 200, 2, { velY: 0x380 }), player(200), 1).flap, 'no HUDNVY-style dial').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// jt9-20 — THE SHDIRB COAST (the `dir` channel, not the `flap` channel).
//
//   SHDIRB (JOUSTRV4.SRC:4388-4392) is the no-steer exit the SHDN free-fall and
//   both SHUP wakes (SHUP0 :4267, SHUP1 :4275) jump to:
//       SHDIRB  LDA  PVELX,U        ; the horizontal velocity index
//               BEQ  SHDIRA         ; PARKED (PVELX==0) ⇒ fall to the aim-writer
//               CLRA
//               STD  CURJOY         ; MOVING (PVELX!=0) ⇒ CURJOY dir = 0 ⇒ COAST
//               RTS
//   A MOVING long-range seek therefore writes dir 0 — no horizontal thrust, the
//   drift decays. Only a PARKED seek falls through to SHDIRA (:4379-4386), which
//   writes CURJOY = the facing sign (+1 right / -1 via SHDN1C left) to get moving.
//
//   Our port's shadow() returns `dir = enemy.facing` on EVERY branch, so a moving
//   SHDN/SHUP seek THRUSTS where the ROM coasts. THE MOVING PINS RED TODAY; the
//   parked pins are GREEN-on-arrival guards that keep the fix from over-correcting
//   (an unconditional `dir = 0` would break the parked SHDIRA aim), and the SHLEP
//   control guards the fix from bleeding onto the level route, which exits SHDIRA
//   directly (:4310) and must keep thrusting.
//
//   `dir` reaches flight only through flap() (flight.ts, `velXIndex + dir*2`):
//   dir 0 leaves the FLYX index unchanged (coast), dir === facing steps it (thrust).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-20 — SHDN/SHUP moving seeks COAST: dir 0, not facing (SHDIRB :4388-4392)', () => {
  const DOWN = (): number => waveValue('SHDNRG', 1) // +20: a player this far BELOW ⇒ SHDN free-fall
  const UP = (): number => waveValue('SHUPRG', 1) // −20: a player this far ABOVE ⇒ SHUP up-seek

  it('fixture premise: SHDNRG(1) is a positive down-delta and SHUPRG(1) a negative up-delta', () => {
    expect(DOWN(), 'a target below ⇒ SHDN').toBeGreaterThan(0)
    expect(UP(), 'a target above ⇒ SHUP').toBeLessThan(0)
  })

  // ── SHDN (:4246 → SHDIRB :4255): the free-fall seek ──────────────────────────
  it('a MOVING shadow on the SHDN free-fall writes dir 0 (SHDIRB CLRA/STD) — RED: port thrusts at facing', () => {
    // enemyY 100 (well above the lava band) so only the dir channel is under test.
    const player = { pixelY: 100 + DOWN(), velXIndex: 0 }
    expect(E.shadow(shadowAt(150, 100, 8), player, 1).dir, 'PVELX!=0 ⇒ CURJOY=0 ⇒ coast').toBe(0)
  })

  it('the SHDN coast is FACING-INDEPENDENT — a left-facing moving shadow also writes 0, not −facing', () => {
    // Proves the fix zeroes the channel rather than returning some transform of
    // facing: a left-facing (facing −1) port returns −1 today; the ROM coasts.
    const e = { ...shadowAt(150, 100, -8), facing: -1 as const }
    const player = { pixelY: 100 + DOWN(), velXIndex: 0 }
    expect(E.shadow(e, player, 1).dir, 'coast is the same 0 whichever way it faces').toBe(0)
  })

  // ── SHUP (:4266/:4269 → SHDIRB :4267/:4275): the up-seek ─────────────────────
  it('a MOVING shadow on the SHUP up-seek writes dir 0 (SHDIRB) — RED: port thrusts at facing', () => {
    const player = { pixelY: 100 + UP(), velXIndex: 0 }
    expect(E.shadow(shadowAt(150, 100, 8), player, 1).dir, 'the up-seek coasts while moving too').toBe(0)
  })

  // ── PARKED (PVELX==0 ⇒ BEQ SHDIRA :4389): the guard against over-correction ──
  it('GUARD: a PARKED shadow on SHDN still AIMS via SHDIRA — dir = facing (+1 right)', () => {
    // Green on arrival. SHDIRB BEQ SHDIRA falls to the aim-writer, which writes
    // the facing sign. An unconditional `dir = 0` fix would break this.
    const player = { pixelY: 100 + DOWN(), velXIndex: 0 }
    expect(E.shadow(shadowAt(150, 100, 0), player, 1).dir, 'parked ⇒ SHDIRA ⇒ +1').toBe(1)
  })

  it('GUARD: a PARKED shadow on SHUP still AIMS — dir tracks the facing sign both ways', () => {
    const up = { pixelY: 100 + UP(), velXIndex: 0 }
    expect(E.shadow(shadowAt(150, 100, 0), up, 1).dir, 'parked right ⇒ +1').toBe(1)
    const left = { ...shadowAt(150, 100, 0), facing: -1 as const }
    expect(E.shadow(left, up, 1).dir, 'parked left ⇒ SHDN1C ⇒ −1').toBe(-1)
  })

  // ── SHLEP control: the level route exits SHDIRA, NOT SHDIRB ──────────────────
  it('GUARD: a MOVING shadow on the SHLEP level track still THRUSTS (dir = facing) — SHLEP → SHDIRA :4310', () => {
    // The coast is exclusive to the SHDN/SHUP long-range seeks. SHLEP (a target
    // inside SHUPRG < delta < SHDNRG) exits through SHDIRA and keeps its aim; the
    // fix must not zero it. Green on arrival — pins the scope boundary.
    const player = { pixelY: 100, velXIndex: 0 } // delta 0: strictly inside the SHLEP window
    expect(DOWN(), 'window premise (down)').toBeGreaterThan(0)
    expect(UP(), 'window premise (up)').toBeLessThan(0)
    expect(E.shadow(shadowAt(150, 100, 8), player, 1).dir, 'SHLEP thrusts at facing').toBe(1)
  })
})

describe('AC-2 — SHLEP tracks the targeted player’s line (:4277-4298)', () => {
  /** A target strictly inside the SHLEP window: SHUPRG(1) < delta < SHDNRG(1). */
  const shlepPlayer = (enemyY: number, offset: number): { pixelY: number; velXIndex: number } => {
    const delta = offset
    expect(delta, 'fixture premise: inside the SHLEP window').toBeLessThan(waveValue('SHDNRG', 1))
    expect(delta, 'fixture premise (up side)').toBeGreaterThan(waveValue('SHUPRG', 1))
    return { pixelY: enemyY + delta, velXIndex: 0 }
  }

  it('below the player’s line ⇒ flap up toward it (CMPB PDIST+1,U / BLS — :4293-4294)', () => {
    // Green on arrival — the live-line collapse uf1-8 shipped. Pinned so the
    // re-seat below cannot regress it. (The ROM tracks the line STORED at the
    // SHLEP decide, :4279-4280, on an 8+1-wake timer — SHUPTM is a "TIME UNTIL
    // NEXT DECISION" row, uf1-9's family, so the per-wake collapse re-decides
    // each wake and stored ≡ live. Design Deviation in the session file.)
    const e = shadowAt(150, 100, 0, { velY: 0 })
    expect(E.shadow(e, shlepPlayer(100, -10), 1).flap, '100 is below a player at 90 ⇒ flap').toBe(true)
  })

  it('at/above the line and ABOVE the lava band ⇒ wings up, even mid-rise', () => {
    const e = shadowAt(150, 100, 0, { velY: -0x100 })
    expect(E.shadow(e, shlepPlayer(100, 10), 1).flap, '100 is above a player at 110 ⇒ no flap').toBe(false)
  })

  it('the $D3 term is gated on FALLING (:4288-4292): a RISING shadow at 212 above its line does NOT flap', () => {
    // RED today: the blanket pre-branch escape flaps any shadow past $D3.
    // The ROM only panics when it is actually sinking (`LDA PVELY,U / BPL
    // SHFAST`); a rising one above its line keeps its wings up.
    const e = shadowAt(150, 212, 0, { velY: -0x100 })
    expect(E.shadow(e, shlepPlayer(212, 10), 1).flap, 'rising ⇒ trust the climb').toBe(false)
  })

  it('CONTROL: the same shadow FALLING at 212 flaps — the lava term fires', () => {
    const e = shadowAt(150, 212, 0, { velY: 0x100 })
    expect(E.shadow(e, shlepPlayer(212, 10), 1).flap, 'falling past $D3 ⇒ SHFAST').toBe(true)
  })

  it('CONTROL: SHLEP’s lava term has NO velX gate — that gate is SHDN’s alone (:4252 vs :4288-4292)', () => {
    // The two laws' lava terms differ in their gate: SHDN reads PVELX, SHLEP1
    // reads PVELY. A port that shares one helper for both reds here.
    const e = shadowAt(150, 212, -2, { velY: 0x100 })
    expect(E.shadow(e, shlepPlayer(212, 10), 1).flap, 'falling + leftward still flaps in SHLEP').toBe(true)
  })

  it('CONTROL: the no-players SHLEV route keeps its protective lava flap (the BOLAVA stand-in)', () => {
    // SHLEV1 (:4319-4328) tracks its own remembered line and its lava exit is
    // SHDIR's $D0 → BOLAVA, which this port does not model. uf1-8's collapse —
    // flap when past $D3 with nobody around — is the stand-in that keeps an
    // idle shadow out of the lava, and the re-seat must NOT strip it.
    expect(E.shadow(shadowAt(150, 220, 0, { velY: 0x100 }), null, 1).flap).toBe(true)
    expect(E.shadow(shadowAt(150, 100, 0, { velY: 0x100 }), null, 1).flap, 'and stays quiet above').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (the "slow") — THROUGH stepEnemy: the turn wake flips the facing AND
//        flaps (LDB #1, :4146), which steps the FLYX index 2 toward the new
//        facing through ADDFLP (:6437-6439). The B2AV/SHAV 8-wake hold is the
//        PJOYT decision-timer family (uf1-9); the collapse keeps the flap.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the turn wake slows the enemy through the real pipeline', () => {
  beforeAll(async () => {
    await loadSteering() // reds this block while the exports are missing
  })

  it('a RISING hunter turning at a cliff flaps against its motion: facing −1 AND velXIndex 8 → 6', () => {
    // Staged RISING (velY −$100) so the level-flight law says "no flap" — the
    // only flap this wake can have is the turn's forced LDB #1. The rising
    // sample from y 83 lands on the CLIFF_R band at 75 (premise below).
    expect(bck(CLIFF_R_RISING.x + XLEN, projectY(CLIFF_R_RISING.y, -0x100)), 'premise: rising sample solid').not.toBe(0)
    const before = hunterAt(CLIFF_R_RISING.x, CLIFF_R_RISING.y, 8, { velY: -0x100 })
    const after = E.stepEnemy(before, { player: null, wave: 1 })
    expect(after.facing, 'the flip reached the process').toBe(-1)
    expect(after.entity.velXIndex, 'the forced flap stepped the index away (8 − 2)').toBe(6)
  })

  it('CONTROL: the same rising hunter in open air neither flips nor flaps', () => {
    const before = hunterAt(OPEN.x, OPEN.y, 8, { velY: -0x100 })
    const after = E.stepEnemy(before, { player: null, wave: 1 })
    expect(after.facing).toBe(1)
    expect(after.entity.velXIndex, 'no turn ⇒ no forced flap ⇒ the index holds').toBe(8)
  })

  it('the shadow’s turn wake does the same on the SHLEV route (SHDICL LDB #1, :4377)', () => {
    const before = shadowAt(CLIFF_R_RISING.x, CLIFF_R_RISING.y, 8, { velY: -0x100 })
    const after = E.stepEnemy(before, { player: null, wave: 1 })
    expect(after.facing).toBe(-1)
    expect(after.entity.velXIndex).toBe(6)
  })

  it('over the following wakes the flipped facing BRAKES the old motion (B2AV collapsed)', () => {
    // The slow episode's observable: with facing −1 and rightward velocity, the
    // brain's own flaps step the index DOWN. The index only moves on FLAP edges
    // (ADDFLP :6437-6439), and the turn's lift keeps this fixture CLIMBING —
    // flapless — until gravity pays the arc off (velY crosses 0 at wake ~44);
    // the level law then flap-hovers and spends the brake. Measured: the index
    // first reaches 0 at wake 65 (this fixture, the RED-phase throwaway);
    // 100 keeps ~1.5x margin.
    let e = hunterAt(CLIFF_R_RISING.x, CLIFF_R_RISING.y, 8, { velY: -0x100 })
    for (let i = 0; i < 100; i++) e = E.stepEnemy(e, { player: null, wave: 1 })
    expect(e.facing, 'the away-facing holds while the drift decays').toBe(-1)
    expect(e.entity.velXIndex, 'the FLYX index has been braked off +8').toBeLessThanOrEqual(0)
  })
})
