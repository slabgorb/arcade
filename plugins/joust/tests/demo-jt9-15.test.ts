// tests/demo-jt9-15.test.ts
//
// Story jt9-15 — RED phase (TEA). jt5-16 admitted the pterodactyl to
// collisionPass's eligible set and routed ONLY the ptero/ptero pair (enemy-thud
// + the ordinary ±2 bump). It deliberately left the MIXED pair unbuilt: the pair
// loop skips any ptero/non-ptero pair, and demo-jt5-16.test.ts's scope fence
// pins that a ptero/buzzard overlap resolves NOTHING. This story measures PTEBRD
// and routes the mixed pair. That fence is flipped IN PLACE over in
// demo-jt5-16.test.ts; this file is the mechanic's own dedicated suite.
//
// WHAT THE ROM DOES (PTEBRD, JOUSTRV4.SRC:5203-5248, "COLIDE PTERODACTYL & BIRD"):
//   • The no-kill branch sounds SNETHD FIRST (OSTHT2, :5019-5020), then dispatches
//     a one-pterodactyl pair to PTEBRD (OSTPX :5034, or OSTH13's EXG X,U :5037-5039
//     so REG.U is ALWAYS the pterodactyl on entry, REG.X the bird).
//   • PTEBRD is a ONE-SIDED repulsion: every write targets the BIRD (,X) —
//     PBUMPY,X / PVELX,X / PBUMPX,X / PFACE,X — and the pterodactyl (U) is only
//     READ. Nobody dies, no score is taken (JT915-001).
//   • Who is on top is decided by the collision-box Y sum: BPL (bird's sum ≥
//     ptero's → ptero LOWER-numbered Y → ptero on top), :5203-5211 (JT915-002).
//   • The bird is driven AWAY with a HARD bump of magnitude 5 — NOT the ordinary
//     ±2 OSTBMP uses: bird-on-top → LDA #-5 / STA PBUMPY,X (:5213-5214, JT915-003);
//     ptero-on-top → LDA #5 / STA PBUMPY,X (:5218-5219, JT915-004). The port folds
//     PBUMPY into posY the same frame (consumeBumpY), so the bird's whole-pixel Y
//     moves by exactly ∓5 while the pterodactyl does not move at all.
//
// PORT SCOPE. This port's JoustEntity carries velX=0 and withBounced writes back
// only velY/posY, so PTEBRD's horizontal (PBUMPX = −2·ptero.velX) and PFACE arms
// are inert in the current entity model — measured (JT915-001) but not asserted
// here, because there is no observable field to pin them to yet. The VERTICAL
// hard bump and the one-sidedness ARE observable, and they are what distinguishes
// real PTEBRD from the "invent it as an ordinary symmetric bump" mutant jt5-16's
// fence named. Those are what this suite pins.
//
// Staging discipline (inherited from jt5-16 / jt5-10, kept):
//   • hush everything but the two subjects EVERY frame — cues carry no process
//     id, so attribution is the fixture's, not the stream's.
//   • a napped base 'enemy' anchor holds the wave open, so spawnWavePteros never
//     stacks a later wave's pteros at one coordinate behind our backs.
//   • both subjects are gravity-EXEMPT hovers (velXIndex 0, velY 0): probed inert
//     over 6 frames, so every Y displacement below is the bump's alone and exact.
//   • a presence CONTROL (the buzzard pair, which already thuds) proves the
//     harness can sound enemy-thud, so an absence would mean something.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { sourceLines, vendoredAvailable } from './helpers/joust-source.js'
import { loadClaims, type Claim } from './helpers/claims.js'
import type { EntityState } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROM = 'JOUSTRV4.SRC'
const SEED = 0x1234

// Subject ids ride clear of the wave namespaces and of jt5-16's 0xb1x/0xb2x/0xb3x.
const PTERO_HI = 0xc10 // a pterodactyl placed ABOVE the buzzard (ptero on top)
const BUZZ_LO = 0xc11 // its buzzard partner, below
const PTERO_LO = 0xc12 // a pterodactyl placed BELOW the buzzard (bird on top)
const BUZZ_HI = 0xc13 // its buzzard partner, above
const CTRL_A = 0xc20 // buzzard-pair presence control
const CTRL_B = 0xc21
const TIE_PTERO = 0xc30 // level pair — the BPL-includes-zero boundary
const TIE_BUZZ = 0xc31

const cueKinds = (d: DemoState): string[] => d.cues.map((c) => c.type as string)

/** The gravity-exempt hover: velXIndex 0 and velY 0, so flight moves NOTHING —
 *  any Y displacement in the window below is the bump's alone. */
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

/** A live airborne buzzard (bounder), collision ON — the bird species PTEBRD bumps. */
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

/** Base players + ONE materialising base enemy (the wave-open anchor) + subjects. */
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

/** hush, re-applied every frame: nap everything but the players and the keep-set. */
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

/**
 * Step the pair until the FIRST enemy-thud, hushing to the keep-set each frame.
 * Returns the frame the thud landed (or −1), the Y of each subject captured on
 * the frame BEFORE the thud step and AFTER it, and every death cue seen.
 */
function runToThud(
  d0: DemoState,
  birdId: number,
  pteroId: number,
): {
  thudFrame: number
  birdBefore: number
  birdAfter: number
  pteroBefore: number
  pteroAfter: number
  deaths: string[]
  final: DemoState
} {
  const keep = new Set([birdId, pteroId])
  let d = d0
  const deaths: string[] = []
  let thudFrame = -1
  let birdBefore = NaN
  let birdAfter = NaN
  let pteroBefore = NaN
  let pteroAfter = NaN
  for (let f = 0; f < 8 && thudFrame === -1; f++) {
    const bBird = pixelPos(d, birdId)
    const bPtero = pixelPos(d, pteroId)
    // Precondition, per the audio-emission rule: prove the MOMENT — the pair
    // really overlaps when the cue is (or is not) sounded.
    expect(overlapping(bBird, bPtero), `frame ${f}: the pair overlaps`).toBe(true)

    d = hush(d, keep)
    d = stepDemo(d, {})
    const kinds = cueKinds(d)
    deaths.push(...kinds.filter((k) => k.endsWith('-death')))
    if (kinds.includes('enemy-thud')) {
      thudFrame = f
      birdBefore = bBird.y
      pteroBefore = bPtero.y
      birdAfter = pixelPos(d, birdId).y
      pteroAfter = pixelPos(d, pteroId).y
    }
  }
  return { thudFrame, birdBefore, birdAfter, pteroBefore, pteroAfter, deaths, final: d }
}

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 1 (RED) — PTEBRD routes the mixed pair: SNETHD, then the hard one-sided bump
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-15 — PTEBRD: the PTERODACTYL on top drives the bird DOWN by a hard 5', () => {
  it('an overlapping ptero/buzzard pair (ptero higher) thuds and bumps ONLY the buzzard, +5, no death', () => {
    // RED today: collisionPass skips the mixed pair ('a ptero pairs only with a
    // ptero'), so no thud can fire and nothing moves. Ptero at Y64, buzzard at
    // Y68 → the ptero is the higher (lower Y) party → PTEBRD's '1$' arm →
    // OSTXDN then LDA #5 / STA PBUMPY,X (:5218-5219) → the BIRD goes DOWN 5.
    const d = stage([
      pteroAt(PTERO_HI, { posY: 0x40 << 8 }),
      buzzardAt(BUZZ_LO, { posY: 0x44 << 8 }),
    ])
    const r = runToThud(d, BUZZ_LO, PTERO_HI)

    expect(r.thudFrame, 'a ptero/buzzard overlap must reach SNETHD (enemy-thud)').toBeGreaterThanOrEqual(0)
    // The HARD bump, magnitude 5 — the fact that tells PTEBRD from the ordinary
    // ±2 OSTBMP bump the "invent it as a symmetric bump" mutant would use.
    expect(r.birdAfter - r.birdBefore, 'the buzzard is driven DOWN a hard 5px (PBUMPY +5)').toBe(5)
    // One-sided: the pterodactyl is only READ by PTEBRD — it does NOT move. This
    // kills the ordinary-symmetric-bump mutant, which would shove BOTH by ±2.
    expect(r.pteroAfter - r.pteroBefore, 'the pterodactyl flies on undisturbed (never bumped)').toBe(0)
    // Nobody dies, and the pair is a pure bump — no egg, no dissolve.
    expect(r.deaths, 'PTEBRD kills no-one — no death cue of any species').toEqual([])
    expect(procOf(r.final, BUZZ_LO), 'the buzzard survives the bump').toBeDefined()
    expect(procOf(r.final, PTERO_HI), 'the pterodactyl survives the bump').toBeDefined()
    expect(
      r.final.sim.processes.some((p) => p.kind === 'egg'),
      'no egg — an egg would mean a resolveJoust KILL resolved the pair',
    ).toBe(false)
    expect(
      r.final.sim.processes.some((p) => p.kind === 'dissolve'),
      'no dissolve — a dissolve would mean the lance-height path resolved it',
    ).toBe(false)
  })

  it('a LEVEL pair treats the pterodactyl as on top — the bird goes DOWN +5, not up', () => {
    // The boundary JT915-002 pins: PTEBRD's who-is-on-top BPL takes the EXACT
    // tie (result ≥ 0), so a ptero and bird at the same Y treat the pterodactyl
    // as the higher party and drive the bird DOWN +5. Both subjects at Y64.
    // Kills the '<=' → '<' mutant (which would send the bird UP −5 at a tie).
    const d = stage([
      pteroAt(TIE_PTERO, { posY: 0x40 << 8 }),
      buzzardAt(TIE_BUZZ, { posY: 0x40 << 8 }),
    ])
    const r = runToThud(d, TIE_BUZZ, TIE_PTERO)

    expect(r.thudFrame, 'a level ptero/buzzard overlap still reaches SNETHD').toBeGreaterThanOrEqual(0)
    expect(r.birdAfter - r.birdBefore, 'at a tie the ptero is on top → bird DOWN +5').toBe(5)
    expect(r.pteroAfter - r.pteroBefore, 'the pterodactyl flies on undisturbed').toBe(0)
    expect(r.deaths, 'PTEBRD kills no-one').toEqual([])
  })
})

describe('jt9-15 — PTEBRD: the BIRD on top is driven UP by a hard 5', () => {
  it('an overlapping ptero/buzzard pair (buzzard higher) thuds and bumps ONLY the buzzard, −5, no death', () => {
    // Buzzard at Y64, ptero at Y68 → the buzzard is the higher party → PTEBRD's
    // fall-through arm → OSTXUP then LDA #-5 / STA PBUMPY,X (:5213-5214) → the
    // BIRD goes UP 5. The opposite direction to the case above: the bird is
    // always shoved AWAY from the pterodactyl, never toward it.
    const d = stage([
      buzzardAt(BUZZ_HI, { posY: 0x40 << 8 }),
      pteroAt(PTERO_LO, { posY: 0x44 << 8 }),
    ])
    const r = runToThud(d, BUZZ_HI, PTERO_LO)

    expect(r.thudFrame, 'a ptero/buzzard overlap must reach SNETHD (enemy-thud)').toBeGreaterThanOrEqual(0)
    expect(r.birdAfter - r.birdBefore, 'the buzzard is driven UP a hard 5px (PBUMPY -5)').toBe(-5)
    expect(r.pteroAfter - r.pteroBefore, 'the pterodactyl flies on undisturbed (never bumped)').toBe(0)
    expect(r.deaths, 'PTEBRD kills no-one — no death cue of any species').toEqual([])
    expect(procOf(r.final, BUZZ_HI), 'the buzzard survives the bump').toBeDefined()
    expect(procOf(r.final, PTERO_LO), 'the pterodactyl survives the bump').toBeDefined()
    expect(r.final.sim.processes.some((p) => p.kind === 'egg')).toBe(false)
    expect(r.final.sim.processes.some((p) => p.kind === 'dissolve')).toBe(false)
  })

  it('CONTROL — a buzzard pair in the SAME harness already thuds (the fixture can sound it)', () => {
    // GREEN today: enemy/enemy pairs are eligible already. If this ever reddens,
    // the RED assertions above say nothing — the harness itself would have
    // stopped producing the cue.
    let d = stage([buzzardAt(CTRL_A, { posY: 0x40 << 8 }), buzzardAt(CTRL_B, { posY: 0x44 << 8 })])
    const keep = new Set([CTRL_A, CTRL_B])
    const all: string[] = []
    for (let f = 0; f < 6 && !all.includes('enemy-thud'); f++) {
      d = hush(d, keep)
      d = stepDemo(d, {})
      all.push(...cueKinds(d))
    }
    expect(all, 'two overlapping buzzards must reach enemy-thud').toContain('enemy-thud')
    expect(procOf(d, CTRL_A), 'enemies bounce, never kill each other').toBeDefined()
    expect(procOf(d, CTRL_B)).toBeDefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 2 (RED) — the record: PTEBRD is written down and claimed
// ═════════════════════════════════════════════════════════════════════════════

const readSrc = (...parts: string[]): string => readFileSync(join(root, 'src', ...parts), 'utf8')
const jt915Claims = (): Claim[] => loadClaims().filter((c) => c.id?.startsWith('JT915-'))

describe('jt9-15 — demo.ts records that PTEBRD landed', () => {
  it('demo.ts names jt9-15 as the story that built the ptero/bird routing', () => {
    // The mixed-pair skip's comment ('ptero-buzzard is PTEBRD (:5034), unbuilt
    // here') goes FALSE the moment this mechanic lands. The routing site must be
    // annotated with the story that built it; the citation, not the wording, is
    // what is pinned.
    const src = readSrc('core', 'demo.ts')
    expect(src, 'demo.ts must name jt9-15 as the story that routed the ptero/bird pair').toContain(
      'jt9-15',
    )
  })
})

describe('jt9-15 — PTEBRD enters the claims registry', () => {
  it('a JT915 claim covers the PTEBRD entry, :5203', () => {
    const covered = new Set(
      jt915Claims()
        .filter((c) => c.source && c.source.file.endsWith(ROM))
        .map((c) => c.source!.line),
    )
    expect(covered, `a JT915 claim must cite ${ROM}:5203 (PTEBRD entry)`).toContain(5203)
  })

  it('a JT915 claim pins the HARD ±5 bump — both the −5 and the +5', () => {
    // The magnitude 5 (vs the ordinary ±2) is the measured constant the Group 1
    // tests rest on. Pin BOTH arms so a claim that dropped one direction reddens.
    const covered = new Set(
      jt915Claims()
        .filter((c) => c.source && c.source.file.endsWith(ROM))
        .map((c) => c.source!.line),
    )
    expect(covered, 'a JT915 claim must cite the bird-on-top hard bump (LDA #-5, :5213)').toContain(5213)
    expect(covered, 'a JT915 claim must cite the ptero-on-top hard bump (LDA #5, :5218)').toContain(5218)
  })

  it.skipIf(!vendoredAvailable)('every JT915 verbatim matches the vendored line byte-for-byte', () => {
    const claims = jt915Claims()
    expect(claims.length, 'precondition: there is something to check').toBeGreaterThan(0)
    for (const c of claims) {
      if (!c.source?.verbatim) continue
      const line = sourceLines(ROM)[c.source.line - 1]
      expect(line, `${c.id} cites ${c.source.file}:${c.source.line}`).toBe(c.source.verbatim)
    }
  })
})
