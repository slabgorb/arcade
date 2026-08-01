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
// BCK_X_TABLE/BCK_Y_TABLE (the ROM's `BCKXTB`/`BCKYTB`, flight.ts:176 /
// arena.ts:198) inside the test that uses it — and the cliff samples are chosen
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
    // brain's own flaps now step the index DOWN. Within 40 wakes of the turn
    // the index must have left saturation and crossed zero — the hunter is no
    // longer barrelling at the cliff.
    let e = hunterAt(CLIFF_R_RISING.x, CLIFF_R_RISING.y, 8, { velY: -0x100 })
    for (let i = 0; i < 40; i++) e = E.stepEnemy(e, { player: null, wave: 1 })
    expect(e.facing, 'the away-facing holds while the drift decays').toBe(-1)
    expect(e.entity.velXIndex, 'the FLYX index has been braked off +8').toBeLessThanOrEqual(0)
  })
})
