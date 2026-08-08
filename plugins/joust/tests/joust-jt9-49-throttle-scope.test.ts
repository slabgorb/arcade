// tests/joust-jt9-49-throttle-scope.test.ts
//
// Story jt9-49 — RED phase (Tyr One-Handed / TEA). SCOPE THE HORIZONTAL-HOMING
// THROTTLE TO A LIVE LEVEL INTERVAL. The throttle (`BOLEVB`, JOUSTRV4.SRC:3939-
// 3946, and its twins B2LE11 :4087-4094 / SHLEPB :4303-4310) is reached in the
// ROM ONLY on the level-flight path — it sits after `BOLEV` (:3907) froze the
// PPVELX snapshot and armed `BOLETM`. A bird that DECIDES down/up runs `BODN1`/
// `BOUP1` and never falls into `BOLEVB` at all. So the reverse counter must not
// tick, and the facing must not flip, on any wake the enemy is off the level path.
//
// ─── THE PORT'S BUG (jt8-2's deviation, jt9-18's residue) ────────────────────
// `stepEnemyDetailed` calls `homingWake` on EVERY wake's entry state (enemy.ts,
// `const flipped = homingWake(enemy, target)`), before the seek/brain even runs.
// jt8-2 chose to run the throttle every wake; jt9-18 froze a PPVELX snapshot at
// the level decide but LEFT that snapshot intact when `seekWake` routes to a
// down/up seek (`pjoy: undefined`, `homing` untouched) — so the throttle keeps
// ticking off the level path against a STALE snapshot. This story retires both.
//
// Measured firsthand (a bounder below a player, both at FLYX index 8, primed one
// wake from a flip): on wake 0 it enters an UP-seek — `seek.mode==='up'`,
// `pjoy.kind==='wing'` — and the throttle nonetheless flips its facing and clears
// `prdir` that same wake. That off-level flip is the behaviour retired here.
//
// ─── WHAT IS PINNED, AND AT WHAT ALTITUDE ────────────────────────────────────
// Every test drives whole wakes through `stepEnemyDetailed` and is REPRESENTATION-
// AGNOSTIC about HOW the scoping is done (a call-site guard, or a state read inside
// `homingWake` — the Dev's choice). The observable is the reverse counter
// `homing.prdir`: the ONLY writer of `prdir` is the throttle, whereas a HUNTER's
// facing is also written by its cliff look-ahead (`steerWake`/B2DIR), which would
// mask the throttle — so `prdir` is read for both brains and `facing` is asserted
// only for the BOUNDER (which never steers: `BODIR` samples nothing, :3876-3884).
//
// ─── HOW THESE FAIL TODAY ────────────────────────────────────────────────────
// The seek tests are RED: today the throttle ticks off the level path, so `prdir`
// spends (and the bounder's facing flips) during a seek. After the fix they hold.
// The GUARD blocks (a live level interval; a matched decide) are GREEN today and
// must STAY green — they prove the scoping narrows the throttle without deleting it.

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

/** An airborne entity at a whole-pixel Y, at a chosen FLYX index. */
function airborne(pixelY: number, velXIndex: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: pixelY << 8,
    velXIndex,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/**
 * A promoted smart enemy at mid-altitude, facing right. `prdir` defaults to 1 so a
 * single matched throttle tick would clear it to 0 AND flip the facing — the loud,
 * unambiguous signal that the throttle ran. Overridable for the level-interval guard.
 */
function smartEnemy(brain: SmartBrain, velXIndex: number, over: Partial<EnemyState> = {}): EnemyState {
  return {
    entity: airborne(0x60, velXIndex),
    facing: 1,
    pchase: 1,
    brain,
    decision: brain,
    homing: { prdir: 1 },
    ...over,
  }
}

const targetAt = (velXIndex: number, pixelY = 0x60): PlayerView => ({ pixelY, velXIndex })
const prdirOf = (e: EnemyState): number | undefined => e.homing?.prdir

// A held DOWN-seek at wake entry: the episode does not exhaust this wake (a very
// negative `pdist`, `velY` 0 ⇒ `pdist` unchanged, still < 0), so nothing but the
// throttle can touch `prdir`. The enemy carries a STALE snapshot (`ppvelx`) equal
// to its own index — jt9-18's residue: matched, so the old throttle would tick.
const downSeek = (brain: SmartBrain, idx: number): EnemyState =>
  smartEnemy(brain, idx, {
    seek: { mode: 'down', pdist: -4000 },
    pjoy: { kind: 'wing', timer: 5, wings: 'down' },
    homing: { prdir: 1, ppvelx: idx },
  })

// A held UP-seek: `mode: 'up'` spends only on `velY < 0`; `velY` 0 ⇒ unchanged,
// `pdist` stays ≥ 0 ⇒ not exhausted. Same stale matched snapshot.
const upSeek = (brain: SmartBrain, idx: number): EnemyState =>
  smartEnemy(brain, idx, {
    seek: { mode: 'up', pdist: 4000 },
    pjoy: { kind: 'wing', timer: 5, wings: 'up' },
    homing: { prdir: 1, ppvelx: idx },
  })

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — OFF THE LEVEL PATH THE THROTTLE DOES NOT TICK. A bird in a down/up seek
//        runs BODN1/BOUP1, never BOLEVB, so `prdir` is untouched and the facing
//        holds — even though it is flying the very index its snapshot names.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the throttle is scoped to the level path: a SEEK wake does not tick it', () => {
  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: a DOWN-seek wake leaves prdir untouched (BODN1, never BOLEVB)', ({ brain }) => {
    const r = E.stepEnemyDetailed(downSeek(brain, 4), { player: targetAt(4), wave: 1 })
    expect(
      prdirOf(r.enemy),
      `${brain}: down-seeking ⇒ off the level path ⇒ the throttle never runs ⇒ prdir held at 1`,
    ).toBe(1)
  })

  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: an UP-seek wake leaves prdir untouched (BOUP1, never BOLEVB)', ({ brain }) => {
    const r = E.stepEnemyDetailed(upSeek(brain, 4), { player: targetAt(4), wave: 1 })
    expect(
      prdirOf(r.enemy),
      `${brain}: up-seeking ⇒ off the level path ⇒ the throttle never runs ⇒ prdir held at 1`,
    ).toBe(1)
  })

  it('the BOUNDER also holds its FACING across a seek (it never steers, so a flip could only be the throttle)', () => {
    // The bounder's sole PFACE writer is the COM at :3945 inside BOLEVB; `BODIR`
    // reads facing and samples nothing. So a flipped facing during a seek is proof
    // the throttle ran off the level path — exactly the bug.
    const down = E.stepEnemyDetailed(downSeek('boundr', 4), { player: targetAt(4), wave: 1 })
    const up = E.stepEnemyDetailed(upSeek('boundr', 4), { player: targetAt(4), wave: 1 })
    expect(down.enemy.facing, 'down-seek: facing held (no off-level flip)').toBe(1)
    expect(up.enemy.facing, 'up-seek: facing held (no off-level flip)').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE STALE-PPVELX-DURING-SEEK PATH IS GONE (the specific jt9-18 residue).
//        A seek entered after a level interval still carries the frozen `ppvelx`
//        (`seekWake` clears `pjoy` but not `homing`). Today the throttle ticks
//        against that stale snapshot; after the fix the snapshot is never consulted
//        off the level path. Belt-and-braces: the snapshot MATCHES the enemy while
//        the LIVE target does NOT — a throttle that stayed scoped-out cannot tell
//        them apart, but the old every-wake read flips on the stale match.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — a stale snapshot carried into a seek no longer drives the throttle', () => {
  it('down-seek, stale snapshot matches the enemy, live target differs ⇒ still no tick', () => {
    const enemy = smartEnemy('boundr', 4, {
      seek: { mode: 'down', pdist: -4000 },
      pjoy: { kind: 'wing', timer: 5, wings: 'down' },
      homing: { prdir: 1, ppvelx: 4 }, // stale snapshot 4 == enemy 4 (would tick if read)
    })
    const r = E.stepEnemyDetailed(enemy, { player: targetAt(8), wave: 1 })
    expect(prdirOf(r.enemy), 'the stale snapshot is off-level ⇒ never consulted ⇒ prdir held').toBe(1)
    expect(r.enemy.facing, 'no off-level flip from the stale snapshot').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — A FRESHLY-MOUNTED bird that DECIDES up does not tick on that wake either
//        (retiring jt8-2's every-wake read). With no interval and no seek at entry
//        and a player above, `seekWake` routes UP this wake; the ROM runs SEEKFS →
//        the up decide → BOUP, never the throttle. (This pins ONLY the decide-UP
//        case — unambiguous. The mount-to-LEVEL wake is left to Dev/Reviewer, per
//        the session's Scope Subtlety.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — a mount wake that decides UP does not tick (jt8-2 every-wake read retired)', () => {
  it('bounder freshly mounted, player above, matched live index ⇒ decides up ⇒ prdir held, facing held', () => {
    // No pjoy, no seek: the decide wake. Player 0x20 is well above the enemy 0x60
    // (smaller pixelY = higher) ⇒ an up route. Enemy and player both at index 4:
    // the old every-wake fallback (absent snapshot ⇒ live read) would match and flip.
    const born = smartEnemy('boundr', 4, { homing: { prdir: 1 } })
    const r = E.stepEnemyDetailed(born, { player: targetAt(4, 0x20), wave: 1 })
    expect(r.enemy.seek?.mode, 'sanity: the fixture really does route up this wake').toBe('up')
    expect(prdirOf(r.enemy), 'off the level path on the mount wake ⇒ no tick').toBe(1)
    expect(r.enemy.facing, 'no off-level flip on the mount wake').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GUARD (green today, MUST stay green) — the throttle still fires where the ROM
//        reaches it. An enemy already IN a live level interval, matched to its
//        frozen snapshot, ticks and flips exactly as before. This is the control
//        that keeps the scoping from becoming "delete the throttle": a fix that
//        silenced BOLEVB entirely would redden HERE.
// ─────────────────────────────────────────────────────────────────────────────
describe('GUARD — a live level interval still ticks the throttle (scoping ≠ deletion)', () => {
  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: in a held level interval, matched to the frozen snapshot ⇒ tick clears prdir to 0', ({ brain }) => {
    // pjoy is a running level interval (uf1-9), homing carries the snapshot frozen
    // at its decide (jt9-18). Enemy matches the snapshot ⇒ the throttle ticks 1→0.
    const enemy = smartEnemy(brain, 4, {
      pjoy: { kind: 'interval', timer: 5 },
      homing: { prdir: 1, ppvelx: 4 },
    })
    const r = E.stepEnemyDetailed(enemy, { player: targetAt(4), wave: 1 })
    expect(prdirOf(r.enemy), `${brain}: level interval + matched snapshot ⇒ the throttle still ticks`).toBe(0)
  })

  it('the BOUNDER flips its facing on that matched level-interval wake (the COM at :3945 still fires)', () => {
    const enemy = smartEnemy('boundr', 4, {
      pjoy: { kind: 'interval', timer: 5 },
      homing: { prdir: 1, ppvelx: 4 },
    })
    const r = E.stepEnemyDetailed(enemy, { player: targetAt(4), wave: 1 })
    expect(r.enemy.facing, 'a matched wake in a live interval flips the facing').toBe(-1)
  })
})
