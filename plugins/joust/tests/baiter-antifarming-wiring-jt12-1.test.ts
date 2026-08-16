// tests/baiter-antifarming-wiring-jt12-1.test.ts
//
// Story jt12-1 — RED phase (Leeloo / TEA). WIRING the RV4 anti-farming patches
// into the ptero flight/attack path. The five PATCH functions already exist as
// pure, byte-verified transforms in src/core/baiter.ts (jt3-5, pinned by
// tests/baiter.test.ts); jt3-7 wired the baiter SPAWN CADENCE but NOT the
// patches, so a live baiter is today mechanically identical to a plain wave
// pterodactyl (self-confessed at baiter.ts:8-10 and the jt12 epic context). This
// suite drives the wire: `stepPteroFlight` and `resolvePteroAttack` gain a
// `pchase` argument, and for a live baiter (PCHASE ≠ 0) they apply the patches at
// their decision points. The headline AC — "a baiter diverges from a plain wave
// ptero" — is asserted directly, patch by patch.
//
// ─── SCOPE OF THIS RED (honest, and why) ─────────────────────────────────────
// The five patches split by WHERE their decision point lives:
//   • PATCH4 aim-lower  → resolvePteroAttack: shifts the lance-height band. Point
//     transform of the existing compare. PINNED here, exact (±AIM_LOWER_PIXELS).
//   • PATCH5 slow-dive  → stepPteroFlight: signed VY ÷ 4 before the posY integrate.
//     Point transform of the existing velY. PINNED here, exact, both signs.
//   • PATCH6 lane-reroute → stepPteroFlight: a pure function of posX, recomputable
//     each wake. PINNED here as a FLANK-SPECIFIC divergence (fires past the CLIF3U
//     mid-band, no-op inside it) — the mechanism of how a lane biases flight is
//     Dev's to choose (cadence-wiring.test.ts discipline: pin the invariant, not
//     the transcript), so this asserts divergence + the boundary, not the bias.
//   • PATCH8 first-pass-miss + PATCH9 seek-timer → a PERSISTENT `PPVELX` seek-delay
//     counter (seed 138, DEC saturating at 1) that the ptero does NOT model today
//     (PPVELX lives only on the enemy, enemy.ts:143; the ptero flight carries no
//     seek state and no player-seek behaviour). Wiring these two is NOT a point
//     transform — it needs new ptero state + a home for the counter. Marked
//     `it.todo` below and raised as a BLOCKING Delivery Finding (Gap): the design
//     of the counter's home / whether it splits to a jt12-1 successor is a GREEN
//     decision, not something this RED invents a system for.
//
// ─── MUTATION-RESISTANCE (the jt1-4 lesson, applied) ─────────────────────────
//   • slow-dive is pinned at the EXACT quotient (velY 0x100 → 0x40, and the SIGNED
//     -0x100 → -0x40) so a `>>> 2` (unsigned) or `/ 2` mutant reddens, and a velY 0
//     control proves it is a no-op for a still ptero.
//   • aim-lower is pinned as the SHIFT INVARIANT `baiter@offset === plain@(offset+2)`
//     across the whole band neighbourhood — a wrong magnitude (1 or 3) or wrong
//     direction breaks it, without this test hardcoding which offsets kill.
//   • lane-reroute pins BOTH flanks diverge AND the mid-band is an exact no-op, so a
//     mutant that reroutes everywhere reddens the mid-band control and one that
//     never reroutes reddens the flanks.
//   • The plain-ptero path (pchase 0 / the 2-arg call) is pinned byte-identical, so
//     a mutant that fires ANY patch on a wave ptero reddens.

import { describe, it, expect } from 'vitest'
import { loadPtero } from './helpers/ptero-contract.js'
import { loadBaiter } from './helpers/baiter-contract.js'
import type { EntityState, PlayerInput, JoustEntity } from './helpers/ptero-contract.js'
import type { PteroEntity } from './helpers/ptero-contract.js'

const NO_INPUT: PlayerInput = { dir: 0, flap: false, flapHeld: false }

/** A mid-screen airborne ptero entity, well above the floor clamp ($D3). velXIndex
 *  0 → the FLYXP rung is 0, so posX is untouched and posY isolates the vertical. */
function airborne(overrides: Partial<EntityState> = {}): EntityState {
  return {
    posX: 220, // inside the CLIF3U mid-band (166..267) unless a test overrides it
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...overrides,
  }
}

/** A player joust participant at pixel (x, y) facing `facing`. */
function player(x: number, y: number, facing: 1 | -1, plantZ = 0): JoustEntity {
  return {
    posX: x,
    posY: y << 8,
    velY: 0,
    velX: 0,
    plantZ,
    facing,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
  }
}

/** A ptero at pixel (x, y). */
function ptero(x: number, y: number, facing: 1 | -1, attackFrame: boolean): PteroEntity {
  return { posX: x, posY: y << 8, facing, attackFrame }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE HEADLINE — a live baiter (PCHASE ≠ 0) diverges from a plain wave ptero, and
// a plain wave ptero (PCHASE 0 / the 2-arg call) is left EXACTLY as jt3-4 built it.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 — the baiter/plain-ptero divergence is threaded through pchase', () => {
  it('a diving baiter and a diving plain ptero end the frame at DIFFERENT altitudes', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const diving = airborne({ velY: 0x100 }) // positive VY = DOWN

    const plain = p.stepPteroFlight(diving, NO_INPUT, 0)
    const baiter = p.stepPteroFlight(diving, NO_INPUT, b.BAITER_PCHASE)

    expect(baiter.posY, 'a live baiter must not fly identically to a plain wave ptero').not.toBe(
      plain.posY,
    )
  })

  it('a plain wave ptero flies IDENTICALLY whether pchase is 0 or omitted (no patch fires)', async () => {
    const p = await loadPtero()
    const diving = airborne({ velY: 0x100 })

    // The jt3-4 2-arg call and the explicit pchase-0 call must be byte-identical: a
    // mutant that fires any flight patch on a wave ptero reddens here.
    expect(p.stepPteroFlight(diving, NO_INPUT, 0)).toEqual(p.stepPteroFlight(diving, NO_INPUT))
  })

  it('a plain wave ptero resolves an attack IDENTICALLY whether pchase is 0 or omitted', async () => {
    const p = await loadPtero()
    const pl = player(100, 100, 1)
    const pt = ptero(120, 90, -1, false)

    expect(p.resolvePteroAttack(pl, pt, 0)).toEqual(p.resolvePteroAttack(pl, pt))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH5 — SLOW-DIVE. A baiter's VY is signed-shifted right by 2 (ASR/ROR ×2 =
// ÷ 4, sign-preserving) before the posY integrate (JOUSTRV4.SRC:6344-6351). The
// plain ptero integrates the raw VY (jt3-4). velXIndex 0 keeps posX out of it.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 PATCH5 — a baiter dives at 1/4 speed; a plain ptero at full speed', () => {
  it('descending: the baiter falls exactly VY÷4 while the plain ptero falls VY', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ velY: 0x100 }) // +256

    const plain = p.stepPteroFlight(s, NO_INPUT, 0)
    const baiter = p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)

    expect(plain.posY - s.posY, 'plain ptero: raw VY').toBe(0x100)
    expect(baiter.posY - s.posY, 'baiter: signed VY ÷ 4 = 0x40').toBe(0x40)
  })

  it('ascending: the ÷4 is a SIGNED shift — a rising baiter climbs VY÷4, not (VY>>>2)', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ velY: -0x100 }) // -256, rising

    const baiter = p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)

    // -0x100 >> 2 = -0x40 (arithmetic). An unsigned `>>> 2` mutant would give a huge
    // positive value and redden.
    expect(baiter.posY - s.posY, 'baiter: signed -0x100 ÷ 4 = -0x40').toBe(-0x40)
  })

  it('still (VY 0): slow-dive is a no-op — the baiter holds altitude like a plain ptero', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ velY: 0 })

    const baiter = p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)
    const plain = p.stepPteroFlight(s, NO_INPUT, 0)

    expect(baiter.posY, 'VY 0 ÷ 4 = 0 — no divergence when still').toBe(plain.posY)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH4 — AIM-LOWER. A baiter's lance-height compare shifts by AIM_LOWER_PIXELS
// (ADDB #2, "JUST LOWER THE ATTACK WINDOW BY 2 PIXELS", JOUSTRV4.SRC:6357-6360).
// Pinned as the SHIFT INVARIANT: a baiter's verdict at lance-offset `o` equals a
// plain ptero's verdict at `o + AIM_LOWER_PIXELS`, across the whole band
// neighbourhood — so the magnitude AND the direction are pinned without this test
// hardcoding which offsets kill. The offset is dialled via the ptero's whole-pixel
// posY against a fixed player (lanceOffset = plantZ + playerY − pteroY).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 PATCH4 — a baiter aims 2px lower than a plain ptero', () => {
  // Opposite facings + facing-into held so the band alone decides the outcome
  // (glide frame → the 10 ± 2 band). Player at x=100 facing right; ptero to its
  // right facing left, so COLDX ≥ 0 and the facing-into gate passes for a kill.
  const PL_Y = 100
  const PL = player(100, PL_Y, 1, 0)
  /** A glide-frame ptero whose lance-offset is `off`: pteroY = plantZ + playerY − off. */
  const ptAtOffset = (off: number): PteroEntity => ptero(120, PL_Y - off, -1, false)

  it('there EXISTS an offset where the baiter and the plain ptero disagree (the patch is wired)', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const offsets = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

    const disagreements = offsets.filter(
      (o) =>
        p.resolvePteroAttack(PL, ptAtOffset(o), 0).kind !==
        p.resolvePteroAttack(PL, ptAtOffset(o), b.BAITER_PCHASE).kind,
    )
    expect(disagreements.length, 'an unwired baiter would agree at every offset').toBeGreaterThan(0)
  })

  it('the baiter band is the plain band shifted by EXACTLY AIM_LOWER_PIXELS', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const shift = b.AIM_LOWER_PIXELS

    // baiter@o === plain@(o + shift) for every o in the band neighbourhood.
    for (let o = 4; o <= 12; o++) {
      const baiterVerdict = p.resolvePteroAttack(PL, ptAtOffset(o), b.BAITER_PCHASE).kind
      const plainShifted = p.resolvePteroAttack(PL, ptAtOffset(o + shift), 0).kind
      expect(baiterVerdict, `baiter@${o} must equal plain@${o + shift}`).toBe(plainShifted)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH6 — LANE-REROUTE. On the flanks (posX past the CLIF3U mid-band, > 267 to the
// right or ≤ 165 to the left) a baiter drops to the lower lane; inside the mid-band
// it tracks line 2 exactly as a plain ptero flies (JOUSTRV4.SRC:6323-6338). The
// plain ptero flight ignores posX entirely, so a baiter that flies DIFFERENTLY on
// the flanks and IDENTICALLY in the mid-band isolates the reroute. The mechanism of
// how a lane biases flight is Dev's — this pins the divergence and the boundary.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 PATCH6 — a baiter reroutes to the lower lane on the flanks only', () => {
  // velY 0 neutralises slow-dive (0 ÷ 4 = 0), so any vertical divergence here is the
  // reroute alone. Vertical = (posY, velY) after one wake.
  const vertical = (e: EntityState) => ({ posY: e.posY, velY: e.velY })

  it('RIGHT flank (posX > 267): the baiter flies differently from a plain ptero', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ posX: 300, velY: 0 })

    expect(
      vertical(p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)),
      'a right-flank baiter must reroute (diverge) from the plain ptero',
    ).not.toEqual(vertical(p.stepPteroFlight(s, NO_INPUT, 0)))
  })

  it('LEFT flank (posX ≤ 165): the baiter flies differently from a plain ptero', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ posX: 150, velY: 0 })

    expect(
      vertical(p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)),
      'a left-flank baiter must reroute (diverge) from the plain ptero',
    ).not.toEqual(vertical(p.stepPteroFlight(s, NO_INPUT, 0)))
  })

  it('MID-BAND (166..267): the baiter flies IDENTICALLY to a plain ptero (reroute is a no-op)', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ posX: 220, velY: 0 })

    expect(
      vertical(p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)),
      'inside the CLIF3U mid-band the lane is line 2 — no reroute, no divergence',
    ).toEqual(vertical(p.stepPteroFlight(s, NO_INPUT, 0)))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH8 + PATCH9 — FIRST-PASS-MISS + SEEK-TIMER. DEFERRED (blocking finding).
// These two write and decrement a persistent PPVELX seek-delay counter (seed 138,
// DEC saturating at 1 — JOUSTRV4.SRC:6294-6311) that gates when a baiter starts
// actively seeking the player. The ptero models NO such counter and NO player-seek
// flight today (PPVELX lives only on the enemy, enemy.ts:143). Wiring them needs a
// home for the counter (mirroring enemy.ts's `homing.ppvelx` sidecar) and a seek
// behaviour to gate — a design decision, not a point transform. Raised as a
// blocking Delivery Finding; these stay `todo` until that home is decided (GREEN),
// so the RED does not invent a subsystem the story under-specifies.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 PATCH8/9 — first-pass-miss + seek-timer (deferred: needs a PPVELX home)', () => {
  it.todo(
    'PATCH8: a freshly spawned baiter seeds its seek-delay counter to FIRST_PASS_DELAY (138)',
  )
  it.todo('PATCH9: each baiter pass decrements the seek-delay counter, saturating at 1')
})

// ─────────────────────────────────────────────────────────────────────────────
// PURITY — the new `pchase` arg must not turn a pure transform impure. The jt1-7
// scanner covers the module text; this guards the runtime behaviour of the wire.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt12-1 — the patched paths stay PURE (no argument mutation)', () => {
  it('stepPteroFlight with a baiter pchase does not mutate its state argument', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const s = airborne({ posX: 300, velY: 0x100 })
    const snap = JSON.stringify(s)

    p.stepPteroFlight(s, NO_INPUT, b.BAITER_PCHASE)
    expect(JSON.stringify(s), 'the baiter flight must not mutate its input state').toBe(snap)
  })

  it('resolvePteroAttack with a baiter pchase does not mutate its player/ptero arguments', async () => {
    const p = await loadPtero()
    const b = await loadBaiter()
    const pl = player(100, 100, 1)
    const pt = ptero(120, 90, -1, false)
    const plSnap = JSON.stringify(pl)
    const ptSnap = JSON.stringify(pt)

    p.resolvePteroAttack(pl, pt, b.BAITER_PCHASE)
    expect(JSON.stringify(pl), 'must not mutate the player').toBe(plSnap)
    expect(JSON.stringify(pt), 'must not mutate the ptero').toBe(ptSnap)
  })
})
