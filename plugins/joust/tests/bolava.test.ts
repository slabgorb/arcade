// tests/bolava.test.ts
//
// Story jt9-22 — RED phase (O'Brien / TEA). BOLAVA (JOUSTRV4.SRC:3953+) is the
// lava-avoid EPISODE the steering gates DIVERT to — the hunter's B2DIRL (:4102,
// `JMP BOLAVA`) and the no-target shadow's SHDIR pre-check (:4334, `LBPL
// BOLAVA`). jt8-3 shipped both gates exactly but SUPPRESSES rather than diverts:
// a gated wake returns `steerWake ⇒ held` and then falls through to the brain's
// existing law, with SHLEV's protective flap (`enemyY > LAVA_ESCAPE_Y`, uf1-8)
// standing in. This suite pins the DIVERT the stand-in gets wrong.
//
// THE EPISODE (JOUSTRV4.SRC:3948-3964), a `PJOY,U` entry-address ping-pong like
// LINET's glide (jt5-8/jt9-1) — provenance in tests/bolava-source.test.ts:
//   BOLAVA  LDD #BOLAV2 / STD PJOY,U / LDB #1  → FLAP, arm BOLAV2   (:3953-3956)
//   BOLAV2  LDD #BOLAV1 / STD PJOY,U / CLRB    → COAST, arm BOLAV1  (:3958-3961)
//   BOLAV1  CMPA #$D3 / BLO BOLAV4 / LDA PVELY,U / BMI BOLAV4       (:3948-3952)
//           → re-check: above $D3 OR rising ⇒ BOLAV4 (back to brains); else FLAP
// Two consequences this suite fixes on, both invisible to a threshold tweak:
//   • the shadow diverts at $D0 (:4331) — three scanlines ABOVE the stand-in's
//     $D3 flap line — so a shadow in [$D0,$D3) falling flaps in the ROM and
//     stays put here;
//   • the episode is TARGET-BLIND (`BODIR3 JMP BODIR`, :3946 — the bounder's
//     own homing, no player read), so a hunter's lava escape cannot depend on
//     where its quarry is. Today it runs the full pursue law, which chases a
//     quarry ABOVE the lava straight DOWN into it.
//
// Behaviour only — every observable is `wingEdge` and the resulting motion.
// The ROM-line provenance and the radix-cited claims are the RED in the
// -source companion.

import { describe, it, expect, beforeAll } from 'vitest'
import { loadEnemy, type EnemyModule, type EnemyState, type EntityState, type PlayerView } from './helpers/enemy-contract.js'

// ─── Fixtures (mirroring steering.test.ts's builders) ────────────────────────
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

const hunterAt = (pixelY: number, entOver: Partial<EntityState> = {}): EnemyState =>
  enemyAt(pixelY, {}, entOver)
const shadowAt = (pixelY: number, entOver: Partial<EntityState> = {}): EnemyState =>
  enemyAt(pixelY, { brain: 'shadow', decision: 'shadow' }, entOver)

const FALL = 0x200 // a plain downward PVELY (positive = falling)
const DEEP_FALL = 0x400
const D0 = 0xd0 // SHDIR_LAVA_Y — the shadow's gate (:4331)
const D3 = 0xd3 // LAVA_ESCAPE_Y — the hunter's gate AND BOLAV1's re-check (:3949)

let E: EnemyModule
beforeAll(async () => {
  E = await loadEnemy()
})

/** Step an enemy `n` wakes against a fixed target; return the flap edge each wake. */
function flapWakes(enemy: EnemyState, target: PlayerView | null, n: number): boolean[] {
  let e = enemy
  const flaps: boolean[] = []
  for (let i = 0; i < n; i++) {
    const r = E.stepEnemyDetailed(e, { player: target, wave: 1 })
    flaps.push(r.wingEdge === 'down')
    e = r.enemy
  }
  return flaps
}
const count = (flaps: readonly boolean[]): number => flaps.filter(Boolean).length

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE EPISODE STATE MACHINE (:3948-3964), seeded at each entry address so
//        the flap↔coast PHASE and the exit are pinned directly — the wing-edge
//        end-to-end tests below merge consecutive flaps and cannot see them.
//   BOLAV2 (:3958-3961) COAST, arm BOLAV1. BOLAV1 (:3948-3952) re-check $D3:
//   still gated ⇒ FLAP (BOLAVA), arm BOLAV2; above $D3 OR rising ⇒ BOLAV4 exit.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the BOLAVA ping-pong: BOLAV2 coasts, BOLAV1 flaps-or-exits', () => {
  /** A hunter already mid-episode at a given entry address. */
  const inLava = (entry: 'BOLAV2' | 'BOLAV1', pixelY: number, velY = FALL): EnemyState => ({
    ...hunterAt(pixelY, { velY }),
    pjoy: { kind: 'lava', entry },
  })

  it('BOLAV2 COASTS (`CLRB`) even while gated, and arms BOLAV1 — a bird never flaps two wakes running', () => {
    // Deep in the lava and falling — the gate would re-fire, but a BOLAV2 wake
    // still coasts unconditionally. This is the wake right after every divert.
    const r = E.stepEnemyDetailed(inLava('BOLAV2', 0xf0), { player: null, wave: 1 })
    expect(r.enemy.prevFlapHeld, 'BOLAV2 is a coast — wings up this wake (CLRB)').toBe(false)
    expect(r.enemy.pjoy, 'BOLAV2 arms the BOLAV1 re-check next').toEqual({ kind: 'lava', entry: 'BOLAV1' })
  })

  it('BOLAV1 still below $D3 and falling FLAPS (`LDB #1`) and arms BOLAV2', () => {
    const r = E.stepEnemyDetailed(inLava('BOLAV1', 0xf0), { player: null, wave: 1 })
    expect(r.enemy.prevFlapHeld, 'a re-check that stays in the lava flaps').toBe(true)
    expect(r.enemy.pjoy, 'BOLAVA arms the BOLAV2 coast next').toEqual({ kind: 'lava', entry: 'BOLAV2' })
  })

  it('BOLAV1 ABOVE $D3 EXITS the episode (`BLO BOLAV4`) — pjoy is no longer lava', () => {
    // Climbed clear of $D3: the re-check drops PJOY,U and returns to the brains.
    const r = E.stepEnemyDetailed(inLava('BOLAV1', 0xc0), { player: null, wave: 1 })
    expect(r.enemy.pjoy?.kind, 'above $D3 the lava episode ends').not.toBe('lava')
  })

  it('BOLAV1 while RISING EXITS the episode (`BMI BOLAV4`, IGNORE LAVA) even deep below $D3', () => {
    const r = E.stepEnemyDetailed(inLava('BOLAV1', 0xf0, -FALL), { player: null, wave: 1 })
    expect(r.enemy.pjoy?.kind, 'a rising bird leaves the lava even from deep below').not.toBe('lava')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE SHADOW DIVERTS AT $D0, NOT THE STAND-IN'S $D3.
//   SHDIR (:4330-4334): `CMPA #$D0 / BLO 1$ / LDA PVELY,U / LBPL BOLAVA`. A
//   no-target (SHLEV) shadow at/below $D0 and falling diverts to BOLAVA and
//   FLAPS on that wake. The stand-in flaps on `enemyY > $D3`, so it does
//   nothing in the whole [$D0,$D3) band — the three scanlines this story adds.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the no-target shadow diverts to BOLAVA at its own $D0 gate', () => {
  it('the two gate constants are DISTINCT — $D0 for the shadow, $D3 for the hunter (jt8-3, not re-derived)', () => {
    // Consistency with jt8-3's steering.test.ts; the divert must reuse them, not conflate.
    expect(D0, 'SHDIR_LAVA_Y').toBe(0xd0)
    expect(D3, 'LAVA_ESCAPE_Y / BOLAV1 re-check').toBe(0xd3)
    expect(D0).not.toBe(D3)
  })

  it('at $D0 EXACTLY (208) and falling ⇒ diverts and FLAPS on the divert wake (:4331 CMPA is inclusive)', () => {
    const flaps = flapWakes(shadowAt(D0, { velY: FALL }), null, 4)
    expect(flaps[0], 'a shadow at $D0 falling must flap to avoid the lava — the stand-in did not').toBe(true)
  })

  it('in the [$D0,$D3) band (210) and falling ⇒ FLAPS — the stand-in used $D3 and stayed put', () => {
    // The heart of the story: 210 ≥ $D0 (divert) but 210 ≤ $D3 (stand-in silent).
    const flaps = flapWakes(shadowAt(0xd2, { velY: FALL }), null, 4)
    expect(flaps[0], 'a shadow in the $D0..$D3 band falling flaps in the ROM').toBe(true)
  })

  it('CONTROL — ABOVE the $D0 gate (207) falling ⇒ no divert flap (this is SHDIR look-ahead territory)', () => {
    const flaps = flapWakes(shadowAt(0xcf, { velY: FALL }), null, 4)
    expect(flaps[0], '207 < $D0 — the divert does not arm, so the flap must be caused by crossing $D0').toBe(false)
  })

  it('CONTROL — in the band (210) but RISING ⇒ no divert (`LDA PVELY,U / LBPL BOLAVA`, :4333-4334 needs falling)', () => {
    const flaps = flapWakes(shadowAt(0xd2, { velY: -FALL }), null, 4)
    expect(flaps[0], 'a rising shadow ignores the lava — the gate is falling-only').toBe(false)
  })

  it('BOUNDARY — velY EXACTLY 0 still diverts (`LBPL` is >= 0, non-negative, not strictly falling)', () => {
    const flaps = flapWakes(shadowAt(0xd2, { velY: 0 }), null, 4)
    expect(flaps[0], 'zero vertical velocity is on the divert side of the gate, not the rising side').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE HUNTER'S DIVERT IS TARGET-BLIND (`BODIR3 JMP BODIR`, :3946).
//   B2DIRL (:4097-4102): at/below $D3 AND falling ⇒ `JMP BOLAVA`. BOLAVA reads
//   no player, so a deep falling hunter escapes the lava the SAME way whether
//   its quarry is above or below. The suppressed port runs the full pursue law
//   instead: with the quarry ABOVE the lava it up-seeks — wings held, coasting
//   — and sinks DEEPER; with the quarry below it happens to alternate. Same
//   fixture, two flap sequences ⇒ the escape is (wrongly) target-dependent.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the hunter diverts to BOLAVA, target-blind', () => {
  const above: PlayerView = { pixelY: 0x40, velXIndex: 0 }
  const below: PlayerView = { pixelY: 0xf8, velXIndex: 0 }

  it('fixture premise: the hunter starts gated — at/below $D3 and falling', () => {
    const e = hunterAt(0xf0, { velY: DEEP_FALL })
    expect(e.entity.posY >> 8, 'deep in the lava band').toBeGreaterThanOrEqual(D3)
    expect(e.entity.velY, 'falling').toBeGreaterThanOrEqual(0)
  })

  it('the divert arms BOLAV2 — so the wake AFTER the divert coasts, never a second flap', () => {
    // `JMP BOLAVA` stores #BOLAV2 (:3953-3954): the divert wake flaps, the next
    // is the coast. Arming BOLAV1 instead would re-check and flap again — two
    // flaps running — which the wing-edge tests cannot see (a held flap is no
    // new edge). Pin the stored state directly.
    const r = E.stepEnemyDetailed(hunterAt(0xf0, { velY: DEEP_FALL }), { player: below, wave: 1 })
    expect(r.enemy.prevFlapHeld, 'the divert wake itself flaps').toBe(true)
    expect(r.enemy.pjoy, 'and arms the BOLAV2 coast, not the BOLAV1 re-check').toEqual({
      kind: 'lava',
      entry: 'BOLAV2',
    })
  })

  it('the flap sequence is INDEPENDENT of the target — above vs below give the same escape', () => {
    const withAbove = flapWakes(hunterAt(0xf0, { velY: DEEP_FALL }), above, 6)
    const withBelow = flapWakes(hunterAt(0xf0, { velY: DEEP_FALL }), below, 6)
    // Today the suppressed pursue law flaps ONCE with the quarry above and
    // THREE times with it below — a target-dependent lava escape, which BOLAVA
    // is not. The divert reads no player, so the two must match.
    expect(count(withAbove), 'a target-blind escape flaps the same either way').toBe(count(withBelow))
  })

  it('and it ACTIVELY re-flaps — BOLAV1 re-enters BOLAVA every other wake while still gated', () => {
    // With the quarry above, the suppressed up-seek flaps once and then coasts
    // down into the lava (one flap in six). BOLAVA re-flaps on BOLAV1 (:3948-3956)
    // for as long as it stays at/below $D3 falling — at least twice in six wakes.
    const withAbove = flapWakes(hunterAt(0xf0, { velY: DEEP_FALL }), above, 6)
    expect(count(withAbove), 'BOLAVA keeps flapping out of the lava; the pursue up-seek did not').toBeGreaterThanOrEqual(2)
  })
})
