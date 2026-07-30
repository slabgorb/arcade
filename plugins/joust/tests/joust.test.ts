// tests/joust.test.ts
//
// Story jt2-3 — RED phase (O'Brien / TEA). The BEHAVIOURAL suite for the joust
// collision + resolution core. Every test drives `loadJoust()`, which throws a
// clean "joust core not built yet" until Dev (Julia) writes src/core/joust.ts —
// so today's red reads as "the feature is absent", never a module-resolution
// trace or a type error. The ROM-law provenance lives in tests/joust-source.test.ts;
// the transcription claims in docs/rom-study/claims/joust.json.
//
// See tests/helpers/joust-collision-contract.ts for the module shape and the
// WHOLE-PIXEL correction to the dossier's OSTBO prose.

import { describe, it, expect } from 'vitest'
import {
  loadJoust,
  type JoustEntity,
  type EnemyType,
  type CollisionBox,
} from './helpers/joust-collision-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A joust participant with sane defaults; override only what a test needs. */
function ent(over: Partial<JoustEntity> = {}): JoustEntity {
  return {
    posX: 100,
    posY: 100 << 8, // pixel 100, fraction 0
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
    ...over,
  }
}

const COFF = 0x0200
/** A synthetic COFF-biased mask row for the given [left,right] pixel span. */
const row = (l: number, r: number): [number, number] => [l + COFF, r + COFF]
const NO_COLLISION: [number, number] = [0x8000, 0x8000]
const END: [number, number] = [0x8100, 0x8100]

// ─── Contract sanity ─────────────────────────────────────────────────────────

describe('the joust core — contract', () => {
  it('exposes the collision + resolution API once built (RED until src/core/joust.ts exists)', async () => {
    const j = await loadJoust()
    for (const fn of [
      'broadPhase',
      'narrowPhase',
      'plantHeight',
      'resolveJoust',
      'bounceTop',
      'bounceBottom',
      'bounceHorizontal',
      'drainBumpX',
      'consumeBumpY',
      'killScore',
      'groundTransition',
      'groundStep',
    ] as const) {
      expect(typeof j[fn], `${fn} must be a function`).toBe('function')
    }
  })
})

// ─── AC-1 — THE JOUST RESOLVES ON WHOLE PIXELS + PLANTZ (fraction EXCLUDED) ───

describe('AC-1 — the joust resolution (OSTBO, whole-pixel + PLANTZ)', () => {
  it('plantHeight is plantZ + (posY >> 8); the fraction is NOT part of it', async () => {
    const j = await loadJoust()
    // pixel 100, fraction 0xFF, plantZ 2 → 102. If the fraction leaked in this
    // would be 102.996… — the dossier "fraction included" reading.
    expect(j.plantHeight(ent({ plantZ: 2, posY: (100 << 8) | 0xff }))).toBe(102)
    expect(j.plantHeight(ent({ plantZ: 0, posY: 100 << 8 }))).toBe(100)
  })

  it('strictly LOWER (smaller height) wins and kills the other', async () => {
    const j = await loadJoust()
    // A at pixel 100 (higher on screen) vs enemy B at pixel 101 → A wins, B dies.
    const a = ent({ posY: 100 << 8, party: 'player' })
    const b = ent({ posY: 101 << 8, party: 'enemy', enemyType: 'bounder' })
    const out = j.resolveJoust(a, b)
    expect(out).toEqual({ kind: 'kill', winner: 'a', loser: 'b', score: 500, victimType: 'bounder' })
  })

  it('an EXACT tie (equal plantHeight) bounces both — nobody dies', async () => {
    const j = await loadJoust()
    const a = ent({ posY: 100 << 8, party: 'player' })
    const b = ent({ posY: 100 << 8, party: 'enemy', enemyType: 'bounder' })
    expect(j.resolveJoust(a, b)).toEqual({ kind: 'bounce' })
  })

  it('same WHOLE pixel, DIFFERENT fraction ⇒ TIE (the corrected false-tie trap)', async () => {
    // ⚠️ This is the crux of TEA's dossier correction. OSTBO reads PPOSY at
    // offset +0 (the whole-pixel word), so two entities on pixel 100 that differ
    // only in the fraction are the SAME height → both bounce. An implementation
    // that "includes the fraction" (subsystems.md:137-139 / AC-1's literal text)
    // would see 100.0 < 100.996 and wrongly kill one. It must NOT.
    const j = await loadJoust()
    const a = ent({ posY: (100 << 8) | 0x00, party: 'player' })
    const b = ent({ posY: (100 << 8) | 0xff, party: 'enemy', enemyType: 'hunter' })
    expect(j.resolveJoust(a, b), 'the fraction must not break the tie').toEqual({ kind: 'bounce' })
  })

  it('PLANTZ decides at the WHOLE-pixel level: a skidder (plantZ 2) on the same pixel LOSES', async () => {
    const j = await loadJoust()
    // Skidding bounder at pixel 100 + plantZ 2 → height 102; player at pixel 100
    // → height 100. Player is higher, so the skidding enemy dies (500).
    const skidder = ent({ posY: 100 << 8, plantZ: 2, party: 'enemy', enemyType: 'bounder' })
    const player = ent({ posY: 100 << 8, plantZ: 0, party: 'player' })
    const out = j.resolveJoust(skidder, player)
    expect(out).toEqual({ kind: 'kill', winner: 'b', loser: 'a', score: 500, victimType: 'bounder' })
  })
})

// ─── AC-2 — FACING, THE REACHABLE SKID CHAIN, AND THE BUMP DRAIN LAWS ─────────

describe('AC-2 — facing makes the skid chain reachable (the jt1-6 gap)', () => {
  it('the facing-aware transition takes onMinus on a reversal (against facing)', async () => {
    const j = await loadJoust()
    // PLYER running right (facing +1): joystick with the facing → PLYFR (onPlus);
    // AGAINST the facing → PLYHR (onMinus, a SKIDR state); neutral → PLYER (onZero).
    expect(j.groundTransition('PLYER', 1, 1)).toBe('PLYFR')
    expect(j.groundTransition('PLYER', 1, -1)).toBe('PLYHR')
    expect(j.groundTransition('PLYER', 1, 0)).toBe('PLYER')
    // Symmetric for a left-facer: dir −1 is WITH the facing (onPlus), dir +1 against.
    expect(j.groundTransition('PLYER', -1, -1)).toBe('PLYFR')
    expect(j.groundTransition('PLYER', -1, 1)).toBe('PLYHR')
  })

  it('a facing-vs-input reversal ENTERS the skid chain and sets plantZ = 2', async () => {
    const j = await loadJoust()
    const running = ent({ groundState: 'PLYER', facing: 1, plantZ: 0, party: 'enemy', enemyType: 'bounder' })
    const skidded = j.groundStep(running, { dir: -1, flap: false, flapHeld: false })
    expect(skidded.groundState, 'reversal reaches the SKIDR state PLYHR').toBe('PLYHR')
    expect(skidded.plantZ, 'skidding lowers the lance by 2 (SKID_PLANT_Z)').toBe(2)
  })

  it('a non-reversing step does NOT skid and leaves plantZ at 0', async () => {
    const j = await loadJoust()
    const running = ent({ groundState: 'PLYER', facing: 1, plantZ: 0 })
    const forward = j.groundStep(running, { dir: 1, flap: false, flapHeld: false })
    expect(forward.groundState).toBe('PLYFR')
    expect(forward.plantZ, 'running forward keeps plantZ 0').toBe(0)
  })

  it('skidding demonstrably flows into a LOSING joust outcome (plantZ 2 lowers the lance)', async () => {
    const j = await loadJoust()
    // Two enemies is a bounce, so pit a skidding ENEMY against a PLAYER on the
    // same pixel: the skid (plantZ 2) makes the enemy lower → the player wins.
    const running = ent({ groundState: 'PLYER', facing: 1, posY: 100 << 8, party: 'enemy', enemyType: 'shadowLord' })
    const skidded = j.groundStep(running, { dir: -1, flap: false, flapHeld: false })
    const player = ent({ posY: 100 << 8, plantZ: 0, party: 'player' })
    const out = j.resolveJoust(skidded, player)
    expect(out).toMatchObject({ kind: 'kill', winner: 'b', loser: 'a', score: 1500 })
  })
})

describe('AC-2 — the bump registers drain by the cited laws', () => {
  it('PBUMPX drains at most 3 px/frame, keeping the remainder', async () => {
    const j = await loadJoust()
    expect(j.drainBumpX(7)).toEqual({ applied: 3, remaining: 4 })
    expect(j.drainBumpX(3)).toEqual({ applied: 3, remaining: 0 })
    expect(j.drainBumpX(2)).toEqual({ applied: 2, remaining: 0 })
    expect(j.drainBumpX(0)).toEqual({ applied: 0, remaining: 0 })
    // Symmetric for a leftward shove (CMPA #-3 branch).
    expect(j.drainBumpX(-7)).toEqual({ applied: -3, remaining: -4 })
    expect(j.drainBumpX(-3)).toEqual({ applied: -3, remaining: 0 })
    expect(j.drainBumpX(-2)).toEqual({ applied: -2, remaining: 0 })
  })

  it('a large PBUMPX takes several frames to drain (3, 3, then the rest)', async () => {
    const j = await loadJoust()
    let bump = 8
    const applied: number[] = []
    for (let i = 0; i < 3; i++) {
      const d = j.drainBumpX(bump)
      applied.push(d.applied)
      bump = d.remaining
    }
    expect(applied).toEqual([3, 3, 2])
    expect(bump).toBe(0)
  })

  it('PBUMPY is consumed WHOLE in one frame — pixel shifts, fraction kept, register cleared', async () => {
    const j = await loadJoust()
    const before = ent({ posY: (100 << 8) | 0x40, bumpY: -2 })
    const after = j.consumeBumpY(before)
    expect(after.posY, 'pixel 100 → 98, fraction 0x40 preserved').toBe((98 << 8) | 0x40)
    expect(after.bumpY, 'the Y bump register is cleared in one frame').toBe(0)
  })
})

// ─── AC-3 — BOUNCE-APART, ENEMIES-NEVER-KILL, KILL SCORES ────────────────────

describe('AC-3 — bounce-apart velocities and bumps (OSTXUP/OSTXDN/OSTXLF)', () => {
  it('the TOP entity gets bumpY −2, and a downward (wrong-way) velY is inverted and halved', async () => {
    const j = await loadJoust()
    const bounced = j.bounceTop(ent({ velY: 8 }))
    expect(bounced.bumpY, 'winner/top shoves UP by 2').toBe(-2)
    expect(bounced.velY, 'a downward velY (8) inverts and halves to −4').toBe(-4)
  })

  it('the TOP entity already moving up keeps its velY (only the bump applies)', async () => {
    const j = await loadJoust()
    const bounced = j.bounceTop(ent({ velY: -8 }))
    expect(bounced.bumpY).toBe(-2)
    expect(bounced.velY, 'already rising → velY untouched').toBe(-8)
  })

  it('the BOTTOM entity gets bumpY +2, and an upward (wrong-way) velY is inverted and halved', async () => {
    const j = await loadJoust()
    const bounced = j.bounceBottom(ent({ velY: -8 }))
    expect(bounced.bumpY, 'loser/bottom shoves DOWN by 2').toBe(2)
    expect(bounced.velY, 'an upward velY (−8) inverts and halves to +4').toBe(4)
  })

  it('the BOTTOM entity already moving down keeps its velY', async () => {
    const j = await loadJoust()
    const bounced = j.bounceBottom(ent({ velY: 8 }))
    expect(bounced.bumpY).toBe(2)
    expect(bounced.velY).toBe(8)
  })

  it('horizontal: own velX is reversed and slowed by 2; HALF is passed to the other as a bump', async () => {
    const j = await loadJoust()
    // OSTXLF main path (velX 6 toward the other): self → −6+2 = −4; other bump → 6>>1 = 3.
    expect(j.bounceHorizontal(6)).toEqual({ selfVelX: -4, otherBumpX: 3 })
  })
})

describe('AC-3 — enemies NEVER kill each other', () => {
  it('enemy-vs-enemy always bounces, even when one is clearly higher', async () => {
    const j = await loadJoust()
    const high = ent({ posY: 80 << 8, party: 'enemy', enemyType: 'shadowLord' })
    const low = ent({ posY: 120 << 8, party: 'enemy', enemyType: 'bounder' })
    expect(j.resolveJoust(high, low), 'no enemy kills another — always a bounce').toEqual({
      kind: 'bounce',
    })
  })

  it('a player DOES kill an enemy it is above (the contrast case)', async () => {
    const j = await loadJoust()
    const player = ent({ posY: 80 << 8, party: 'player' })
    const enemy = ent({ posY: 120 << 8, party: 'enemy', enemyType: 'hunter' })
    expect(j.resolveJoust(player, enemy)).toMatchObject({ kind: 'kill', winner: 'a', loser: 'b' })
  })
})

describe('AC-3 — kill events carry the transcribed DVALUE scores', () => {
  it('bounder 500, hunter 750, shadow lord 1500 (DVALUE decoded through DVALUR)', async () => {
    const j = await loadJoust()
    expect(j.killScore('bounder'), 'P4DEC $05 via SCRTEN → 500').toBe(500)
    expect(j.killScore('hunter'), 'P5DEC $57 via SCRTEN → 5 tens + 7 hundreds = 750').toBe(750)
    expect(j.killScore('shadowLord'), 'P6DEC $15 via SCRHUN → 1500').toBe(1500)
  })

  it('a resolved kill carries the victim enemy’s score, not a raw ×100 of the byte', async () => {
    const j = await loadJoust()
    // The hunter is the trap: $57 naïvely ×100 is 5700; the real event is 750.
    const player = ent({ posY: 90 << 8, party: 'player' })
    const hunter = ent({ posY: 110 << 8, party: 'enemy', enemyType: 'hunter' })
    const out = j.resolveJoust(player, hunter)
    expect(out).toMatchObject({ kind: 'kill', score: 750, victimType: 'hunter' })
  })
})

// ─── AC-4 — BROAD/NARROW PHASE (consumes COLLISION_TABLES) + DETERMINISM ──────

describe('AC-4 — broad phase (the HITEM box test)', () => {
  const box = (x: number, y: number, w: number, h: number): CollisionBox => ({ x, y, w, h })

  it('overlapping boxes hit; separated boxes miss (both axes required)', async () => {
    const j = await loadJoust()
    expect(j.broadPhase(box(0, 0, 10, 10), box(5, 5, 10, 10)), 'overlap in X and Y').toBe(true)
    expect(j.broadPhase(box(0, 0, 10, 10), box(50, 0, 10, 10)), 'apart in X').toBe(false)
    expect(j.broadPhase(box(0, 0, 10, 10), box(0, 50, 10, 10)), 'apart in Y').toBe(false)
  })
})

describe('AC-4 — narrow phase (the transcribed COFF-biased spans + sentinels)', () => {
  it('unbias subtracts COFF', async () => {
    const j = await loadJoust()
    expect(j.unbias(0x0200 + 5)).toBe(5)
    expect(j.COFF).toBe(0x0200)
  })

  it('aligned scanlines with overlapping spans collide; disjoint spans do not', async () => {
    const j = await loadJoust()
    const masks = {
      A: [row(2, 5), END],
      B: [row(4, 8), END], // [4,8] overlaps [2,5] at 4-5
      C: [row(10, 12), END], // disjoint from [2,5]
    }
    expect(j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, masks)).toBe(true)
    expect(j.narrowPhase({ name: 'A', top: 100 }, { name: 'C', top: 100 }, masks)).toBe(false)
  })

  it('a $8000 row contributes NO collision on its scanline', async () => {
    const j = await loadJoust()
    const masks = {
      A: [NO_COLLISION, row(2, 5), END],
      B: [row(2, 5), row(2, 5), END],
    }
    // Scanline 0: A is $8000 (no collision) even though B has a span there.
    // Scanline 1: both [2,5] → collide.
    expect(j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, masks)).toBe(true)
    // If we shift B down by one so only A's $8000 row aligns with a B span, miss.
    const onlyNoCollisionAligns = {
      A: [NO_COLLISION, END],
      B: [row(2, 5), END],
    }
    expect(
      j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, onlyNoCollisionAligns),
    ).toBe(false)
  })

  it('the walk stops at the $8100 end-of-table sentinel', async () => {
    const j = await loadJoust()
    // A's real span sits AFTER an $8100 terminator — it must never be reached.
    const masks = {
      A: [END, row(2, 5)],
      B: [row(2, 5), row(2, 5)],
    }
    expect(j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, masks)).toBe(false)
  })

  it('consumes a REAL transcribed mask from COLLISION_TABLES', async () => {
    const j = await loadJoust()
    const pics = await loadPictures()
    const masks: Record<string, Array<[number, number]>> = Object.fromEntries(
      pics.COLLISION_TABLES.map((t) => [t.name, t.spans]),
    )
    // A real mask overlaps itself when perfectly aligned…
    expect(j.narrowPhase({ name: 'CSTN1R', top: 100 }, { name: 'CSTN1R', top: 100 }, masks)).toBe(true)
    // …and cannot collide with a copy shifted far below its own height.
    expect(j.narrowPhase({ name: 'CSTN1R', top: 100 }, { name: 'CSTN1R', top: 300 }, masks)).toBe(false)
  })
})

describe('AC-4 — determinism: a joust replays bit-for-bit', () => {
  it('the same seeded scenario resolves + bounces identically twice', async () => {
    const j = await loadJoust()
    const scenario = (): unknown => {
      const running = ent({ groundState: 'PLYER', facing: 1, posY: 100 << 8, velY: 8, party: 'enemy', enemyType: 'bounder' })
      const skidded = j.groundStep(running, { dir: -1, flap: false, flapHeld: false })
      const player = ent({ posY: 100 << 8, velY: -8, party: 'player' })
      const outcome = j.resolveJoust(skidded, player)
      const bouncedWinner = j.bounceTop(player)
      const bouncedLoser = j.bounceBottom(skidded)
      const drained = j.drainBumpX(8)
      return { outcome, bouncedWinner, bouncedLoser, drained }
    }
    expect(scenario()).toEqual(scenario())
  })

  it('resolveJoust and the bounce functions never mutate their arguments (purity)', async () => {
    const j = await loadJoust()
    const a = ent({ posY: 100 << 8, party: 'player' })
    const b = ent({ posY: 110 << 8, party: 'enemy', enemyType: 'bounder', velY: 8 })
    const aCopy = structuredClone(a)
    const bCopy = structuredClone(b)
    j.resolveJoust(a, b)
    j.bounceTop(b)
    j.bounceBottom(b)
    j.consumeBumpY(b)
    expect(a).toEqual(aCopy)
    expect(b).toEqual(bCopy)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ROUND 2 — HARDENING (Reviewer-driven). The round-1 suite proved the code but
// left gaps a mutant could slip through: an enemy killing a player (all round-1
// kills had the player higher, so a "player always wins" mutant survived), the
// player-victim score contract, narrowPhase's top-alignment SIGN, and the
// airborne groundStep guard. Each test below was mutation-proven to bite (see the
// TEA Assessment round-2 evidence table).
// ─────────────────────────────────────────────────────────────────────────────

describe('ROUND 2 — the namesake law: an enemy that is HIGHER kills the player', () => {
  it('enemy strictly higher (smaller plantHeight) KILLS the player — winner=enemy, loser=player', async () => {
    const j = await loadJoust()
    // The gap every round-1 kill missed: here the ENEMY is above (pixel 80) and
    // the PLAYER below (pixel 120). The enemy wins. A "party==='player' always
    // wins regardless of plantHeight" mutant would say winner='b' (the player)
    // and this reddens.
    const enemy = ent({ posY: 80 << 8, party: 'enemy', enemyType: 'bounder' })
    const player = ent({ posY: 120 << 8, party: 'player' })
    const out = j.resolveJoust(enemy, player)
    expect(out.kind).toBe('kill')
    if (out.kind === 'kill') {
      expect(out.winner, 'the higher enemy wins').toBe('a')
      expect(out.loser, 'the lower player dies').toBe('b')
    }
  })

  it('the symmetric case with the enemy passed second also kills the player', async () => {
    const j = await loadJoust()
    const player = ent({ posY: 120 << 8, party: 'player' })
    const enemy = ent({ posY: 80 << 8, party: 'enemy', enemyType: 'shadowLord' })
    const out = j.resolveJoust(player, enemy)
    expect(out).toMatchObject({ kind: 'kill', winner: 'b', loser: 'a' })
  })
})

describe('ROUND 2 — the player-victim outcome/score contract', () => {
  it('when the loser is a PLAYER the kill carries score 0 and no victimType (the 50-pts credit is DEFERRED)', async () => {
    const j = await loadJoust()
    const enemy = ent({ posY: 80 << 8, party: 'enemy', enemyType: 'hunter' })
    const player = ent({ posY: 120 << 8, party: 'player' })
    const out = j.resolveJoust(enemy, player)
    expect(out.kind).toBe('kill')
    if (out.kind === 'kill') {
      // Pin the intended jt2-3 contract: a player victim has no enemy DVALUE, so
      // the score event is 0 and victimType is undefined. A mutant defaulting the
      // score to a non-zero value reddens here.
      expect(out.score, 'a player victim carries no score in jt2-3').toBe(0)
      expect(out.victimType, 'a player has no enemy type').toBeUndefined()
    }
  })

  it('an ENEMY victim, by contrast, carries its DVALUE score and type', async () => {
    const j = await loadJoust()
    const player = ent({ posY: 80 << 8, party: 'player' })
    const enemy = ent({ posY: 120 << 8, party: 'enemy', enemyType: 'hunter' })
    const out = j.resolveJoust(player, enemy)
    expect(out).toMatchObject({ kind: 'kill', score: 750, victimType: 'hunter' })
  })
})

describe('ROUND 2 — narrowPhase aligns rows by the correct SIGN (j = a.top + i − b.top)', () => {
  it('two masks whose only real rows coincide ONLY under the correct alignment collide; the reversed sign misses', async () => {
    const j = await loadJoust()
    // A's single real span sits at row 2 (scanline a.top+2); B's at row 0. They
    // land on the SAME scanline only when b.top = a.top + 2. Under the correct
    // sign j = a.top + i − b.top: A row 2 → j = 0 → B row 0 → overlap.
    // Under a reversed sign (j = b.top + i − a.top): A row 2 → j = 4 → miss.
    const masks = {
      A: [NO_COLLISION, NO_COLLISION, row(2, 5), END],
      B: [row(2, 5), END],
    }
    expect(
      j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 102 }, masks),
      'correct alignment brings A row 2 onto B row 0',
    ).toBe(true)
    // Not vacuous: shift B so the real rows no longer share a scanline → miss.
    expect(
      j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, masks),
      'mismatched tops → the real rows never align → no collision',
    ).toBe(false)
  })
})

describe('ROUND 2 — groundStep is a no-op while airborne (the null-groundState guard)', () => {
  it('an airborne entity (groundState null) is returned unchanged — deleting the guard would throw', async () => {
    const j = await loadJoust()
    const airborne = ent({ groundState: null, plantZ: 0, facing: 1, posX: 50, posY: 120 << 8, velY: -8 })
    const snapshot = structuredClone(airborne)
    const after = j.groundStep(airborne, { dir: -1, flap: false, flapHeld: false })
    // With the guard deleted, groundTransition(null, …) reads GROUND_STATES[null]
    // and throws — so this call throwing (or mutating) reddens.
    expect(after, 'airborne groundStep is a no-op').toEqual(snapshot)
    expect(after.groundState, 'still airborne').toBeNull()
    expect(after.plantZ, 'no skid applied while airborne').toBe(0)
  })
})

// ─── ROUND 2 — recommended (cheap) boundary pins ─────────────────────────────

describe('ROUND 2 — recommended boundary pins', () => {
  const box = (x: number, y: number, w: number, h: number): CollisionBox => ({ x, y, w, h })

  it('broadPhase uses a STRICT overlap: exactly-touching edges do NOT collide', async () => {
    const j = await loadJoust()
    // a spans x∈[0,10), b starts at x=10 → they share only the boundary line.
    expect(j.broadPhase(box(0, 0, 10, 10), box(10, 0, 10, 10)), 'touching in X only').toBe(false)
    expect(j.broadPhase(box(0, 0, 10, 10), box(0, 10, 10, 10)), 'touching in Y only').toBe(false)
    // one pixel of real overlap DOES collide (the < is not off-by-one the wrong way)
    expect(j.broadPhase(box(0, 0, 10, 10), box(9, 0, 10, 10))).toBe(true)
  })

  it('groundTransition throws RangeError on an unknown ground-state id', async () => {
    const j = await loadJoust()
    expect(() => j.groundTransition('NOPE', 1, 1)).toThrow(RangeError)
  })

  it('both entities skidding on the same pixel is still a tie (both bounce) [LOW]', async () => {
    const j = await loadJoust()
    // Two players (so it is not the enemy-vs-enemy short-circuit), each skidding
    // (plantZ 2) on pixel 100 → equal plantHeight 102 → bounce.
    const a = ent({ posY: 100 << 8, plantZ: 2, party: 'player' })
    const b = ent({ posY: 100 << 8, plantZ: 2, party: 'player' })
    expect(j.resolveJoust(a, b)).toEqual({ kind: 'bounce' })
  })
})

// A tiny type-touch so unused imports flag if the contract drifts.
const _typeProbe: EnemyType[] = ['bounder', 'hunter', 'shadowLord']
void _typeProbe
