// tests/demo-jt5-16.test.ts
//
// Story jt5-16 — RED phase (TEA). The collision half jt5-10 was ruled to RECORD
// and file, now priced and built: the pterodactyl becomes a FULL COLLISION
// PARTICIPANT. The ROM routing was settled by jt5-10 and is already pinned
// verbatim (tests/audio-ptero-wing-source.test.ts Group 6; claims joust.json
// JOUSTRV4.SRC:4961, audio.json :5019/:5028), so this file does not re-open it:
//
//   :4961        BNE OSTHT2            BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)
//   :5019-5020   OSTHT2 LDX #SNETHD / JSR VSND   the thud sounds FIRST
//   :5031-5033   OSTH12 LDA PID,X / CMPA #$80+PTEID / BEQ OSTH11   two pteros →
//   :5028        OSTH11 JSR OSTBMP    "NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS"
//
// The port's gap: `collisionPass`'s eligible set filters to player|enemy, so two
// pteros never meet. This suite makes closing it a measured behaviour:
//
//   Group 1 (RED)    — a ptero pair reaches enemy-thud and the ordinary bump.
//   Group 2 (guards) — the routing fences: ptero-vs-PLAYER stays whole on
//                      resolvePteroAttack, ptero-vs-BUZZARD stays UNRESOLVED.
//                      PTEBRD (:5034, :5037-5038 after EXG X,U) is real in the
//                      ROM and deliberately NOT built here — it is a separate
//                      unmeasured mechanic; the Delivery Finding filed this
//                      phase demands its own story at finish.
//   Group 3 (RED)    — the record: demo.ts names the story that closed the gap,
//                      and the claims registry carries the ptero-pair dispatch.
//
// Staging discipline (the jt5-10 Group 5 lessons, kept):
//   • hush everything but the subjects EVERY frame — cues carry no process id,
//     so attribution comes from the fixture, not the stream.
//   • a base-wave 'enemy' anchor is kept (napped, still materialising) so the
//     wave NEVER clears: `spawnWavePteros` stacks a later wave's pteros at ONE
//     coordinate, and once the set is widened a stacked pair would thud on its
//     own and poison every absence assertion below.
//   • every absence test shares a harness with a presence CONTROL (the buzzard
//     pair), so a fixture that cannot produce the cue cannot certify absence.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { sourceLines, vendoredAvailable } from './helpers/joust-source.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, type Claim } from './helpers/claims.js'
import type { EntityState } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROM = 'JOUSTRV4.SRC'

const SEED = 0x1234

// Subject ids ride clear of the wave namespaces (0x100*wave + …) and of
// jt5-10's 0xb01/0xb02.
const HIGH_PTERO = 0xb10
const LOW_PTERO = 0xb11
const BUZZ_A = 0xb20
const BUZZ_B = 0xb21
const VS_BUZZ = 0xb22
const VS_PTERO = 0xb23
const LANCE_PTERO = 0xb30

const cueKinds = (d: DemoState): string[] => d.cues.map((c) => c.type as string)
const DEATH_OR_THUD = /-death$|-thud$/

/** The gravity-exempt hover: velXIndex 0 and velY 0, so stepPteroFlight moves
 *  NOTHING — any Y displacement in the window below is the bump's alone. */
function flightEntity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 200,
    posY: 0x40 << 8,
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

/** A live wave pterodactyl, exactly as pteroProcess spawns one (collision ON). */
function pteroAt(id: number, over: Partial<EntityState> = {}): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'ptero',
    facing: 1,
    collisionEnabled: true,
    entity: flightEntity(over),
  }
}

/** A live airborne buzzard (bounder), collision ON — the control species. */
function buzzardAt(id: number, over: Partial<EntityState> = {}): DemoProcess {
  const entity = flightEntity(over)
  const enemy: EnemyState = { entity, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' }
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: true,
    enemy,
  }
}

/**
 * Base players + ONE materialising base enemy (the wave-open anchor) + the
 * subjects. The anchor is never in `keep`, so `hush` naps it every frame: its
 * materialisation window freezes, it can never collide, and — because a wave is
 * cleared only when NO 'enemy' remains — the wave can never advance and spawn
 * stacked pteros behind our backs.
 */
function stage(extras: DemoProcess[]): DemoState {
  const base = createWaveDemo(SEED)
  const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
  if (!anchor) throw new Error('wave 1 must supply a ground enemy to hold the wave open')
  return {
    ...base,
    sim: {
      ...base.sim,
      processes: [...base.sim.processes.filter((p) => p.kind === 'player'), anchor, ...extras],
      budget: { nsmart: 0, wsmart: 0 },
    },
  }
}

/** jt5-10's hushAllBut, widened to a keep-SET (a collision needs two subjects).
 *  Re-applied every frame, because a process that did not exist at frame 0
 *  cannot be hushed at frame 0. */
function hush(d: DemoState, keep: ReadonlySet<number>): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'player' || keep.has(p.id) ? p : { ...p, nap: 100_000 },
      ),
    },
  }
}

const procOf = (d: DemoState, id: number): DemoProcess | undefined =>
  d.sim.processes.find((p) => p.id === id)

/** The subject's pixel position, whichever side of the process shape it lives on. */
function pixelPos(d: DemoState, id: number): { x: number; y: number } {
  const p = procOf(d, id)
  const e = p?.entity ?? p?.enemy?.entity
  if (!e) throw new Error(`process ${id} is gone or carries no entity`)
  return { x: e.posX, y: e.posY >> 8 }
}

const overlapping = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
  Math.abs(a.x - b.x) < 16 && Math.abs(a.y - b.y) < 16

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 1 (RED) — the deliverable: a ptero pair thuds and bumps, no-one dies
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-16 AC1/AC2 — two pterodactyls reach SNETHD and the ordinary bump', () => {
  it('an overlapping ptero pair emits enemy-thud and separates ±2px — neither dies', () => {
    // RED today: the eligible set is player|enemy, so the pair below never
    // meets and no thud can ever fire. Kills the do-nothing mutant outright.
    let d = stage([
      pteroAt(HIGH_PTERO, { posY: 0x40 << 8 }),
      pteroAt(LOW_PTERO, { posY: 0x44 << 8 }),
    ])
    const keep = new Set([HIGH_PTERO, LOW_PTERO])
    let thudFrame = -1
    const forbidden: string[] = []

    for (let f = 0; f < 8 && thudFrame === -1; f++) {
      const beforeHigh = pixelPos(d, HIGH_PTERO)
      const beforeLow = pixelPos(d, LOW_PTERO)
      // Precondition, per the audio-emission rule: prove the MOMENT — the pair
      // really is overlapping when the cue is (or is not) sounded.
      expect(overlapping(beforeHigh, beforeLow), `frame ${f}: the pair overlaps`).toBe(true)

      d = hush(d, keep)
      d = stepDemo(d, {})
      const kinds = cueKinds(d)
      forbidden.push(...kinds.filter((k) => k.endsWith('-death')))

      if (kinds.includes('enemy-thud')) {
        thudFrame = f
        // The ordinary bump, "identical to a buzzard/buzzard pair": OSTBMP
        // sends the physically higher bird UP (OSTXUP, bumpY −2) and the lower
        // DOWN (OSTXDN, +2), consumed whole the same frame (consumeBumpY).
        // Flight contributes 0 here (velY 0, gravity-exempt), so the deltas
        // are exact. Kills "routed somewhere other than the enemy bump".
        expect(pixelPos(d, HIGH_PTERO).y, 'the higher ptero rises 2px (OSTXUP)').toBe(
          beforeHigh.y - 2,
        )
        expect(pixelPos(d, LOW_PTERO).y, 'the lower ptero descends 2px (OSTXDN)').toBe(
          beforeLow.y + 2,
        )
      }
    }

    expect(thudFrame, 'a ptero/ptero overlap must reach SNETHD (enemy-thud)').toBeGreaterThanOrEqual(0)
    // OSTH11: "NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS".
    expect(forbidden, 'no death cue of any species').toEqual([])
    expect(procOf(d, HIGH_PTERO), 'the higher ptero survives the bump').toBeDefined()
    expect(procOf(d, LOW_PTERO), 'the lower ptero survives the bump').toBeDefined()
    expect(
      d.sim.processes.some((p) => p.kind === 'egg'),
      'no egg — an egg would mean a resolveJoust KILL resolved the pair',
    ).toBe(false)
    expect(
      d.sim.processes.some((p) => p.kind === 'dissolve'),
      'no dissolve — a dissolve would mean the lance-height path resolved it',
    ).toBe(false)
  })

  it('CONTROL — a buzzard pair in the SAME harness already thuds (the fixture can sound it)', () => {
    // GREEN today, deliberately: enemy/enemy pairs are already eligible. If this
    // control ever reddens, Group 1's red and Group 2's absences alike say
    // nothing — the harness itself would have stopped producing the cue.
    let d = stage([
      buzzardAt(BUZZ_A, { posY: 0x40 << 8 }),
      buzzardAt(BUZZ_B, { posY: 0x44 << 8 }),
    ])
    const keep = new Set([BUZZ_A, BUZZ_B])
    const all: string[] = []
    for (let f = 0; f < 6 && !all.includes('enemy-thud'); f++) {
      d = hush(d, keep)
      d = stepDemo(d, {})
      all.push(...cueKinds(d))
    }
    expect(all, 'two overlapping buzzards must reach enemy-thud').toContain('enemy-thud')
    expect(procOf(d, BUZZ_A), 'enemies bounce, never kill each other').toBeDefined()
    expect(procOf(d, BUZZ_B)).toBeDefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 2 (guards) — the routing fences the widening must NOT move
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-16 AC4 — ptero-vs-PLAYER stays whole on resolvePteroAttack', () => {
  // The hazard these two kill: once 'ptero' joins the eligible set, a
  // player/ptero pair meets in the pair loop TOO, and resolveJoust would
  // resolve it (the ptero, party enemy, sits higher → the PLAYER dies) before
  // the dedicated lance-height loop ever runs. Exactly one death cue may fire.

  it('a lance-band contact still kills the ptero — one ptero-death, no pair-loop leak', () => {
    // jt4-4's proven lance geometry: player 9px below, opposite facings,
    // facing into the ptero → the resolvePteroAttack KILL band.
    // jt9-14 re-seat: was 10px (posY 110). The player-vs-ptero pass now runs
    // narrowPhase after broadPhase (the ROM's BPCOL→OSTHIT gate,
    // JOUSTRV4.SRC:4944-4952), and CWNG3R×PT1RC overlap only at lanceOffset 8-9,
    // so offset 10 became a mask MISS. Offset 9 is in the band AND the mask —
    // green on both the pre- and post-jt9-14 tree. See demo-jt9-14.test.ts.
    const player: DemoProcess = {
      id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
      collisionEnabled: true, entity: flightEntity({ posX: 100, posY: 109 << 8 }),
    }
    // jt9-43 COLDX re-seat 104→100: at dy=−9 only player row 0 [7,9] aligns with
    // PT1RC row 9 [8,15], and narrowPhase now folds COLDX — dx=4 shifts it to
    // [12,19], a MISS (the ROM rejects it too). Co-locating keeps the masks
    // superimposed at the lance row (COLDX=0 right-facer kill, JOUSTRV4.SRC:4994).
    const ptero: DemoProcess = { ...pteroAt(LANCE_PTERO, { posX: 100, posY: 100 << 8 }), facing: -1 }
    const base = stage([])
    const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
    if (!anchor) throw new Error('stage() always keeps the anchor')
    let d: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [player, ptero, anchor] },
      events: [],
    }
    const seen: string[] = []
    for (let f = 0; f < 3; f++) {
      d = hush(d, new Set([LANCE_PTERO]))
      d = stepDemo(d, {})
      seen.push(...cueKinds(d))
    }
    // The moment happened: the ptero died the jt3-4 way (dissolve, not vanish).
    expect(procOf(d, LANCE_PTERO), 'the lanced ptero leaves the live set').toBeUndefined()
    expect(
      d.sim.processes.some((p) => p.kind === 'dissolve'),
      'the body dissolves (jt3-6), proving the lance-height path resolved it',
    ).toBe(true)
    // Exactly ONE resolution: a pair-loop double-resolution would add
    // player-death (resolveJoust: the higher ptero wins) or enemy-thud/egg.
    expect(seen.filter((k) => DEATH_OR_THUD.test(k)), 'exactly one death, the ptero’s').toEqual([
      'ptero-death',
    ])
    expect(procOf(d, 1), 'the player survives the lance kill').toBeDefined()
    expect(d.sim.processes.some((p) => p.kind === 'egg'), 'a ptero kill leaves NO egg').toBe(false)
  })

  it('an out-of-band contact still kills the PLAYER once — pteroWins, not twice', () => {
    // Same height (lanceOffset 0, out of the 10±2 band) → the OSTBO fallback
    // the epic ruled the ptero wins. The pair loop resolving the same pair
    // would sound a SECOND player-death (or a thud) — the double-cue leak.
    const player: DemoProcess = {
      id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
      collisionEnabled: true, entity: flightEntity({ posX: 100, posY: 100 << 8 }),
    }
    const ptero: DemoProcess = { ...pteroAt(LANCE_PTERO, { posX: 104, posY: 100 << 8 }), facing: -1 }
    const base = stage([])
    const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
    if (!anchor) throw new Error('stage() always keeps the anchor')
    let d: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [player, ptero, anchor] },
      events: [],
    }
    const seen: string[] = []
    for (let f = 0; f < 3; f++) {
      d = hush(d, new Set([LANCE_PTERO]))
      d = stepDemo(d, {})
      seen.push(...cueKinds(d))
    }
    expect(procOf(d, 1), 'the player loses the OSTBO fallback').toBeUndefined()
    expect(seen.filter((k) => DEATH_OR_THUD.test(k)), 'exactly one death, the player’s').toEqual([
      'player-death',
    ])
    expect(procOf(d, LANCE_PTERO), 'the ptero survives its win').toBeDefined()
  })
})

describe('jt5-16 scope fence FLIPPED (jt9-15) — ptero-vs-BUZZARD now routes through PTEBRD', () => {
  it('an overlapping ptero/buzzard pair thuds and PTEBRD bumps the bird — no death, no egg', () => {
    // jt5-16 fenced this pair to no-interaction because PTEBRD was UNMEASURED
    // and jt5-10 had priced only the ptero/ptero pair. jt9-15 measured PTEBRD
    // (JOUSTRV4.SRC:5203-5248) and routes the pair, so this fence flips IN PLACE
    // — exactly as jt5-16 flipped jt5-10's — from "resolves NOTHING" to "SNETHD
    // sounds and the bird is bumped away". The ROM: OSTHT2 sounds SNETHD first
    // (:5019), then OSTPX/OSTH13 hand the pair (ptero always in REG.U) to PTEBRD,
    // which shoves the BIRD alone by a HARD 5 and leaves the pterodactyl still.
    // Full mechanic + both hard-bump directions live in demo-jt9-15.test.ts;
    // here we only certify the fence is gone. Non-vacuity: Group 1's control
    // proves this harness sounds enemy-thud, and both subjects are inert hovers
    // so the ptero-still / bird-moved split is exact.
    // ptero at Y64 (higher), buzzard at Y68 → ptero on top → bird driven DOWN 5.
    let d = stage([
      pteroAt(VS_PTERO, { posY: 0x40 << 8 }),
      buzzardAt(VS_BUZZ, { posY: 0x44 << 8 }),
    ])
    const keep = new Set([VS_BUZZ, VS_PTERO])
    const seen: string[] = []
    let thudFrame = -1
    let birdBefore = NaN
    let birdAfter = NaN
    let pteroBefore = NaN
    let pteroAfter = NaN
    for (let f = 0; f < 6 && thudFrame === -1; f++) {
      const bBird = pixelPos(d, VS_BUZZ)
      const bPtero = pixelPos(d, VS_PTERO)
      expect(overlapping(bBird, bPtero), `frame ${f}: the pair overlaps`).toBe(true)
      d = hush(d, keep)
      d = stepDemo(d, {})
      const kinds = cueKinds(d)
      seen.push(...kinds)
      if (kinds.includes('enemy-thud')) {
        thudFrame = f
        birdBefore = bBird.y
        pteroBefore = bPtero.y
        birdAfter = pixelPos(d, VS_BUZZ).y
        pteroAfter = pixelPos(d, VS_PTERO).y
      }
    }
    expect(thudFrame, 'the mixed pair now reaches SNETHD (enemy-thud)').toBeGreaterThanOrEqual(0)
    expect(birdAfter - birdBefore, 'PTEBRD drives the bird DOWN a hard 5 (ptero on top)').toBe(5)
    expect(pteroAfter - pteroBefore, 'PTEBRD never bumps the pterodactyl').toBe(0)
    expect(
      seen.filter((k) => k.endsWith('-death')),
      'PTEBRD is a pure bump — no death of any species',
    ).toEqual([])
    expect(procOf(d, VS_BUZZ), 'the buzzard flies on').toBeDefined()
    expect(procOf(d, VS_PTERO), 'the ptero flies on').toBeDefined()
    expect(d.sim.processes.some((p) => p.kind === 'egg'), 'and nobody laid an egg').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 3 (RED) — the record: the closed gap is written down and claimed
// ═════════════════════════════════════════════════════════════════════════════

const readSrc = (...parts: string[]): string => readFileSync(join(root, 'src', ...parts), 'utf8')

const jt516Claims = (): Claim[] => loadClaims().filter((c) => c.id?.startsWith('JT516-'))

describe('jt5-16 AC4 — demo.ts records the gap CLOSED', () => {
  it('demo.ts names the story that closed the gap (the foot note goes true again)', () => {
    // The KNOWN GAP block at the foot of demo.ts says the divergence is
    // "recorded here rather than fixed" — prose that goes FALSE the moment the
    // mechanic lands. The record must be re-anchored to the story that closed
    // it; the citation (jt5-16), not the wording, is what is pinned.
    const src = readSrc('core', 'demo.ts')
    expect(src, 'demo.ts must name jt5-16 as the story that closed the gap').toContain('jt5-16')
  })
})

describe('jt5-16 — the ptero-pair dispatch enters the claims registry', () => {
  it('a JT516 claim covers the OSTH12 ptero-pair dispatch, :5033', () => {
    // :4961 (the no-kill branch) and :5028/:5019 (OSTH11 bump, SNETHD) are
    // already claimed (joust.json, audio.json). The line that is THIS story's —
    // the BEQ that sends two pterodactyls to the SAME OLD COLISION — is not.
    const covered = new Set(
      jt516Claims()
        .filter((c) => c.source && c.source.file.endsWith(ROM))
        .map((c) => c.source!.line),
    )
    expect(covered, `a JT516 claim must cite ${ROM}:5033 (BEQ OSTH11)`).toContain(5033)
  })

  it.skipIf(!vendoredAvailable)('every JT516 verbatim matches the vendored line byte-for-byte', () => {
    const claims = jt516Claims()
    expect(claims.length, 'precondition: there is something to check').toBeGreaterThan(0)
    for (const c of claims) {
      if (!c.source?.verbatim) continue
      const line = sourceLines(ROM)[c.source.line - 1]
      expect(line, `${c.id} cites ${c.source.file}:${c.source.line}`).toBe(c.source.verbatim)
    }
  })
})
