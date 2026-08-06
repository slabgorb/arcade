// tests/joust-jt9-18-forced-glide.test.ts
//
// Story jt9-18 — RED phase (Tyr One-Handed / TEA). THE BOLEV2 FORCED GLIDE:
// a level-flying buzzard beats its wings at most every OTHER wake, because the
// wake after a level flap is a FORCED GLIDE no matter what the falling test
// would say. Found by Dev during uf1-9's GREEN, confirmed by the Reviewer.
//
// ─── THE ROM, READ FIRSTHAND (JOUSTRV4.SRC:3903-3946) ────────────────────────
// The level-flight block is a two-state PJOY machine, not a per-wake test:
//
//   BOLEV1  DEC  PJOYT,U          :3911   the "can I flap?" wake
//           …falling & below line…
//   BOFAST  LDD  #BOLEV2          :3931   ← FLAP: point PJOY at BOLEV2, and
//           STD  PJOY,U           :3932     LDB #$01 (:3933) beats the wings.
//   BOLEV2  LDD  #BOLEV1          :3936   ← the NEXT wake lands HERE: it points
//           STD  PJOY,U           :3937     PJOY back at BOLEV1 and falls into…
//   BOLEVA  CLRB                  :3938   ← …WINGS UP. A GLIDE, unconditionally.
//
// So a flap ALWAYS costs the following wake to a glide: flap → glide → flap →
// glide. The fastest a level flyer can beat its wings is every other wake. It
// does not matter that the bird is still sinking on the glide wake — BOLEV2 ran,
// not BOLEV1, so the falling test at :3926 was never reached.
//
// ─── THE PORT'S BUG (plugins/joust/src/core/enemy.ts) ────────────────────────
// `pursue()`'s level fallthrough is a plain per-wake test — `return { dir, flap:
// velY >= 0 }` — with the comment "`BOFAST`'s `LDB #$01` and `BOLEVA`'s `CLRB`
// are re-decided every wake (:3926-3938)". That comment is the exact premise
// this story retires. With no BOLEV2 state, a bird that keeps falling flaps
// EVERY single wake: one unbroken wing-down hold, where the ROM pumps.
//
// ─── THE TWIN CENSUS (the story's standing rule: enumerate, don't assume one) ─
// uf1-9's census found SIX sites where the backlog claimed four; the forced
// glide is FOUR level-flight families, each with its own LEV2 state that points
// PJOY back to LEV1 and falls into a CLRB glide:
//
//   family            LEV1 / flap        LEV2 (forced glide)   port path
//   bounder  BOLEV    BOLEV1  BOFAST     BOLEV2  :3936         pursue() fallthrough
//   hunter   B2LEV    B2LEV1  B2FAST     B2LEV2  :4162         pursue() fallthrough
//   shadow   SHLEP    SHLEP1  SHFAST     SHLEP2  :4300         shadow() SHLEP line-track
//   shadow   SHLEV    SHLEV1  (:4326)    SHLEV2  :4399         shadow() null-target
//
// All four hold a decision interval in this port (bounder/hunter via seekWake,
// both shadow branches via shadowDwellWake — verified: shadowDwellWake arms an
// interval for a null target too), so a forced-glide phase can attach to each.
// This suite pins the behaviour for every one of the four — a fix that repairs
// the bounder but forgets the hunter or either shadow branch stays RED here.
//
// ─── WHY THESE ASSERTIONS, AND HOW THEY FAIL TODAY ───────────────────────────
// Every test FORCES the bird to keep falling (a large positive velY re-injected
// each wake) so that velY can never be the reason a wake glides. That isolates
// the forced-glide state as the ONLY thing that can stop a flap. Under the
// current per-wake law every such wake flaps; under the fix, every other one
// glides. Two complementary reads, both directions:
//   • the DECISION: the wake immediately after a level flap is a glide even
//     while still falling (`boundr`/`b2undr`/`shadow` return `flap: false`);
//   • the INTEGRATION: over N forced-falling wakes the bird produces MULTIPLE
//     distinct wing-down edges (it pumps), where the buggy hold produces one.
//
// RED today: the module loads fine (this is not a "feature absent" red — the
// brains exist) but every forced-glide assertion fails because the state is not
// modelled. Each failing `expect` names the wake and the family.

import { describe, it, expect, beforeAll } from 'vitest'
import {
  loadEnemy,
  type EnemyModule,
  type EnemyState,
  type SmartBrain,
  type EntityState,
  type PlayerView,
} from './helpers/enemy-contract.js'

let E: EnemyModule
beforeAll(async () => {
  E = await loadEnemy()
})

/** A steep, sustained fall — well past every brain's brake, so "falling" is never in doubt. */
const FALLING = 0x300

/** An airborne entity falling hard, at a whole-pixel Y. */
function fallingEntity(pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: FALLING,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/**
 * A promoted smart enemy already INSIDE a level-flight interval, so `currentRoute`
 * reports `level` and the level law is the one under test. Timer 20 is under the
 * shortest wave-1 interval (SHUPTM/SHLETM = 9), so it never expires across the
 * short runs here — the route is held level the whole time.
 */
function levelFlyer(
  brain: SmartBrain,
  pixelY: number,
  over: Partial<EnemyState> = {},
  entOver: Partial<EntityState> = {},
): EnemyState {
  return {
    entity: fallingEntity(pixelY, entOver),
    facing: 1,
    pchase: 1,
    brain,
    decision: brain,
    homing: { prdir: 1 },
    pjoy: { kind: 'interval', timer: 20 },
    ...over,
  }
}

/** Re-inject a hard fall onto an enemy, leaving its brain workspace (pjoy/homing) intact. */
function keepFalling(enemy: EnemyState): EnemyState {
  return { ...enemy, entity: { ...enemy.entity, velY: FALLING } }
}

/**
 * Re-inject a hard fall AND pin the altitude. The shadow's level laws are
 * position-dependent (`enemyY > line`, `enemyY > LAVA_ESCAPE_Y`), so a flap that
 * lifts the bird would turn the flap OFF for the wrong reason — masking whether
 * the glide came from the forced-glide state or from the changed position. Pinning
 * Y holds the flap-WANTING condition fixed so only the forced glide can stop it.
 */
function keepFallingAt(enemy: EnemyState, pixelY: number): EnemyState {
  return { ...enemy, entity: { ...enemy.entity, velY: FALLING, posY: pixelY << 8 } }
}

/** This wake's raw flap decision for a given brain. */
function flapOf(enemy: EnemyState, player: PlayerView | null, brain: SmartBrain): boolean {
  return E[brain](enemy, player).flap
}

/**
 * Drive N forced-falling wakes through `stepEnemyDetailed`, collecting the
 * wing-edge each produced. When flaps are non-consecutive every flap is a fresh
 * `'down'` rising edge and every glide-after-flap is an `'up'` release — so the
 * count of `'down'` edges IS the number of distinct wingbeats. A bird that
 * flaps every wake holds its wings down: exactly one `'down'`, then nulls.
 */
function wingEdges(
  enemy: EnemyState,
  player: PlayerView | null,
  wave: number,
  n: number,
): Array<'down' | 'up' | null> {
  const out: Array<'down' | 'up' | null> = []
  let e = enemy
  for (let i = 0; i < n; i++) {
    e = keepFalling(e)
    const r = E.stepEnemyDetailed(e, { player: player ?? null, wave })
    out.push(r.wingEdge)
    e = r.enemy
  }
  return out
}

// A player parked at the flyer's own altitude keeps the bounder/hunter on the
// LEVEL route (delta ≈ 0, inside the range gate); the shadow's SHLEP branch is
// reached with the flyer BELOW the player's line so it wants to flap.
const LEVEL_PLAYER: PlayerView = { pixelY: 0x60, velXIndex: 0 }

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE DECISION: the wake immediately after a level flap is a forced glide.
//        Bounder & hunter share pursue()'s level fallthrough (the cited code).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the wake after a level flap is a FORCED GLIDE (BOLEV2/B2LEV2)', () => {
  it.each([
    { brain: 'boundr' as const, lev2: 'BOLEV2 :3936' },
    { brain: 'b2undr' as const, lev2: 'B2LEV2 :4162' },
  ])('$brain: still falling, yet the post-flap wake glides ($lev2)', ({ brain }) => {
    const flyer = levelFlyer(brain, 0x60)
    // Sanity: the FIRST wake of the interval is a flap (BOLEV1, falling). If this
    // ever goes false the fixture stopped exercising the flap path.
    expect(flapOf(flyer, LEVEL_PLAYER, brain), `${brain} flaps on the BOLEV1 wake while falling`).toBe(true)

    // Advance one whole wake (it flaps), then force the bird to keep falling and
    // read the NEXT decision. The falling test would say "flap"; BOLEV2 says glide.
    const afterFlap = keepFalling(E.stepEnemy(flyer, { player: LEVEL_PLAYER, wave: 1 }))
    expect(
      flapOf(afterFlap, LEVEL_PLAYER, brain),
      `${brain}: the wake after a flap is a glide even while falling — BOLEV2 ran, not BOLEV1`,
    ).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE INTEGRATION: a continuously-falling level flyer PUMPS its wings
//        (multiple distinct wingbeats), it does not hold them down.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — a falling level flyer flaps at most every OTHER wake (it pumps)', () => {
  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: 6 forced-falling wakes ⇒ several separate wing-down edges, never one long hold', ({ brain }) => {
    const edges = wingEdges(levelFlyer(brain, 0x60), LEVEL_PLAYER, 1, 6)
    const downs = edges.filter((x) => x === 'down').length
    // The buggy per-wake law flaps every wake: ONE rising edge, then a held
    // wing-down (nulls). The forced glide breaks the hold, so the bird re-flaps.
    expect(
      downs,
      `${brain}: expected repeated wingbeats over 6 falling wakes, got edges ${JSON.stringify(edges)}`,
    ).toBeGreaterThanOrEqual(2)
  })

  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: the alternation CONTINUES — after the forced glide the bird flaps AGAIN', ({ brain }) => {
    // flap (BOLEV1) → glide (BOLEV2) → flap (BOLEV1) …: prove it is "every OTHER
    // wake", not "flap once then glide forever". Advance two whole wakes so the
    // PJOY phase returns to BOLEV1, then read the decision while still falling.
    let e = levelFlyer(brain, 0x60)
    e = E.stepEnemy(keepFalling(e), { player: LEVEL_PLAYER, wave: 1 }) // wake 1: flap
    e = E.stepEnemy(keepFalling(e), { player: LEVEL_PLAYER, wave: 1 }) // wake 2: forced glide
    expect(
      flapOf(keepFalling(e), LEVEL_PLAYER, brain),
      `${brain}: two wakes after a flap, still falling, the bird flaps again — BOLEV1 is back`,
    ).toBe(true) // GREEN BEFORE AND AFTER: guards against a fix that glides forever.
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE SHADOW LORD'S TWO LEVEL BRANCHES: SHLEP (a live target, below its
//        line) and SHLEV (no target, below the lava) each force a glide too.
//        These do NOT share pursue() — they live in shadow() — so the bounder
//        fix does not cover them, and this AC keeps that honest.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the shadow lord forces a glide after a level flap (SHLEP2/SHLEV2)', () => {
  it('SHLEP (below the tracked line ⇒ wants to flap): post-flap wake glides', () => {
    // Shadow BELOW the player's line so the SHLEP line-track calls for a flap.
    // Altitude is PINNED (keepFallingAt) across the step so the flap-wanting
    // condition `enemyY > line` cannot switch off from the flap lifting the bird.
    const player: PlayerView = { pixelY: 0x50, velXIndex: 0 }
    const flyer = levelFlyer('shadow', 0x60) // enemyY 0x60 > player line 0x50 ⇒ flap
    expect(flapOf(flyer, player, 'shadow'), 'shadow below the tracked line flaps (SHLEP)').toBe(true)

    const afterFlap = keepFallingAt(E.stepEnemy(flyer, { player, wave: 1 }), 0x60)
    expect(
      flapOf(afterFlap, player, 'shadow'),
      'SHLEP2: the wake after a shadow level flap is a forced glide (position held below the line)',
    ).toBe(false)
  })

  it('SHLEV (no target, below the lava ⇒ escape flap): post-flap wake glides', () => {
    // jt9-22 — a null-target shadow deep below cliff5 ($D3) and falling no longer
    // reaches SHLEV2's forced glide: `SHLEV JMP SHDIR`, whose $D0 pre-check
    // (:4330-4334) DIVERTS it to the real BOLAVA episode (`LBPL BOLAVA`). The
    // `enemyY > $D3` flap this once measured via `shadow()` WAS the uf1-8 BOLAVA
    // stand-in, now replaced. The invariant is unchanged and stronger: BOLAVA's
    // own BOLAV2 coast (`CLRB`, :3960) is the glide after the BOLAVA flap, so
    // the bird still never flaps two wakes running. Measured through the real
    // pipeline (the divert lives in `stepEnemyDetailed`, not `shadow()`), altitude
    // pinned deep in the lava so the episode keeps re-entering.
    const flyer = levelFlyer('shadow', 0xf0)
    const flap = E.stepEnemyDetailed(flyer, { player: null, wave: 1 })
    expect(flap.wingEdge, 'shadow below the lava flaps to escape (BOLAVA divert)').toBe('down')

    const glide = E.stepEnemyDetailed(keepFallingAt(flap.enemy, 0xf0), { player: null, wave: 1 })
    expect(
      glide.wingEdge,
      'the wake after the BOLAVA flap is a coast (BOLAV2), not a second flap',
    ).not.toBe('down')
  })
})
