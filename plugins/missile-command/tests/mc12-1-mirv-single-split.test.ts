// plugins/missile-command/tests/mc12-1-mirv-single-split.test.ts
//
// Story mc12-1 — RED phase (Leeloo / TEA). Bound the MIRV to a SINGLE split so one
// missile can't cascade into a swarm. Today mirvSplit (core/mirv.ts:50) launches its
// 3 children AT parent.pos — inside the MIRV band [MIRV_LO=128, MIRV_HI=160] — and
// stepCombat (game.ts) appends them while LEAVING the split parent in the roster with
// no "spent" marker, so every frame the in-band cluster re-qualifies (mirvEligible,
// mirv.ts:38) and re-splits, bounded only by the NICBMS=8 slot ceiling. That is the
// 6+ fan the owner screenshotted (epic mc12, finding 1).
//
// ─── GROUND TRUTH (REV-01; W3MAIN.MAC/W3COMN.MAC, .RADIX 16 — hex bytes, trailing
//     '.' = decimal). The ROM splits each ICBM exactly ONCE: ─────────────────────
//   MIRVIX is a single "ICBM TO MIRV (INDEX)" slot     — W3MAIN.MAC:227
//   the split CONSUMES that slot (one-shot)            — W3MAIN.MAC:2011-2017
//   POTENT caps "NO MORE THAN 3 SHOTS FROM A MIRV"     — W3MAIN.MAC:2717 (claim MC-MIRV-MAX)
//   MIRV band [MIRVLO=128, MIRVHI=160], inclusive      — W3COMN.MAC:159/161
// DECISION (ROM-always-wins): a MIRVed ICBM and its children carry a one-shot spent
// marker so they never re-split. No invented difficulty knob (epic contract).
//
// ─── THE MARKER CONTRACT (this RED file defines the interface GREEN must honour) ──
// GREEN (Korben) adds `readonly mirvSpent?: boolean` to Icbm (icbm.ts): OPTIONAL so
// every pre-mc12 Icbm literal stays valid, READONLY per the core immutability rule.
//   • mirvEligible(icbm) returns false when icbm.mirvSpent is true.
//   • mirvSplit(parent, …) marks EVERY child `mirvSpent: true`.
//   • stepCombat (game.ts) replaces the split parent with its spent copy, so it drops
//     out of the eligible set the very next frame.
// `SpentIcbm` below extends Icbm with the optional marker ONLY to keep `tsc --noEmit`
// (the release gate) green while icbm.ts has not added the field yet — once it does,
// the extension is merely redundant.
//
// ─── WHY THIS IS RED against today's code ────────────────────────────────────────
//   AC1  mirvEligible ignores any spent marker → a spent warhead stays eligible;
//        children are born un-marked and eligible in-band.
//   AC1/AC3  a lone in-band ICBM re-splits every frame → totalChildren ≫ 3, splitEvents
//        ≫ 1, the roster climbs to NICBMS(8), not 1+3.
//   AC4  children carry no `mirvSpent` marker (the split shape is otherwise unchanged).

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { launchIcbm, type Icbm, type Vec } from '../src/core/icbm.js'
import { mirvEligible, mirvSplit, MIRV_MAX_CHILDREN, MIRV_LO, MIRV_HI } from '../src/core/mirv.js'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'
import { NICBMS } from '../src/core/spawn.js'

// The one-shot MIRV-spent marker GREEN adds to Icbm. Optional + readonly (see header).
type SpentIcbm = Icbm & { readonly mirvSpent?: boolean }

// A ballistic ICBM parked at head-height v (its ground target is below; irrelevant to
// eligibility). Origin ≠ pos so a child's `origin === parent.pos` is a real assertion.
const at = (v: number): Icbm => ({ ...launchIcbm({ h: 100, v: 210 }, { h: 100, v: 16 }), pos: { h: 100, v } })

const targets: readonly Vec[] = [
  { h: 10, v: 16 },
  { h: 50, v: 16 },
  { h: 90, v: 16 },
]

describe('mc12-1 AC1 — the one-shot MIRV-spent marker (mirv.ts)', () => {
  it('mirvEligible returns FALSE for an in-band ICBM already marked spent', () => {
    // The marker IS the MIRVIX consume (W3MAIN.MAC:2011-2017): an ICBM that has already
    // MIRVed never re-qualifies. Today mirvEligible ignores it → still eligible → RED.
    const spent: SpentIcbm = { ...at(150), mirvSpent: true }
    expect(mirvEligible(spent)).toBe(false)
  })

  it('regression: an in-band ballistic with NO spent marker is STILL eligible', () => {
    // Guards against an over-broad mutant that returns false for everything in-band.
    expect(mirvEligible(at(128))).toBe(true) // low edge
    expect(mirvEligible(at(150))).toBe(true) // interior
    expect(mirvEligible(at(160))).toBe(true) // high edge
  })

  it('every child mirvSplit produces is born SPENT — never re-eligible though it sits in-band', () => {
    // Children launch from the parent's in-band pos (v=150 ∈ [128,160]); today each is a
    // fresh eligible warhead that re-splits next frame. GREEN marks them spent at birth.
    // Field-name-agnostic: asserts the OBSERVABLE eligibility via mirvEligible.
    const kids = mirvSplit(at(150), targets, createRng(7))
    expect(kids.length).toBe(MIRV_MAX_CHILDREN)
    for (const k of kids) {
      expect(k.pos.v).toBeGreaterThanOrEqual(MIRV_LO) // sanity: born inside the band…
      expect(k.pos.v).toBeLessThanOrEqual(MIRV_HI)
      expect(mirvEligible(k)).toBe(false) // …yet a MIRV never re-splits its own child
    }
  })
})

describe('mc12-1 AC4 — the split SHAPE is unchanged; only re-qualification is removed', () => {
  it('children still fork from parent.pos toward a live target at the parent velocity — now spent', () => {
    const parent = { ...at(150), velocity: 2 } // a non-default velocity pins the pass-through
    const kids = mirvSplit(parent, targets, createRng(3)) as readonly SpentIcbm[]
    expect(kids.length).toBe(MIRV_MAX_CHILDREN)
    for (const k of kids) {
      expect(k.origin).toEqual(parent.pos) // forks mid-air FROM the parent's current pos
      expect(k.pos).toEqual(parent.pos)
      expect(k.velocity).toBe(parent.velocity) // inherits the parent's descent speed
      expect(k.arrived).toBe(false) // fresh ordinary ballistic warhead
      expect(targets).toContainEqual(k.target) // re-targeted at a LIVE structure
      expect(k.kind ?? 'ballistic').toBe('ballistic') // not a cruise
      expect(k.mirvSpent).toBe(true) // the ONLY addition: the one-shot spent marker
    }
  })

  it('a lone live target is still re-drawn per child, and no target still fabricates none', () => {
    const lone: readonly Vec[] = [{ h: 30, v: 16 }]
    const kids = mirvSplit(at(150), lone, createRng(9))
    expect(kids.length).toBe(MIRV_MAX_CHILDREN) // targets re-drawn each child, not consumed
    for (const k of kids) expect(k.target).toEqual(lone[0])
    expect(mirvSplit(at(150), [], createRng(3))).toEqual([]) // never fabricates a target
  })
})

// ─── INTEGRATION: the split WIRED through stepGame. A play-phase game holding exactly
//     ONE in-band ballistic ICBM, no pending spawns (remaining:0) and no live blasts —
//     so every change in icbms.length is a MIRV split, never a spawn or a removal. The
//     ICBM descends at unit speed (150 → 128 over ~22 frames), well inside the 40-frame
//     window, and no child (born v≈149, unit speed → ground at 134 frames) arrives yet.
const bandIcbm = (): Icbm => ({ ...launchIcbm({ h: 120, v: 200 }, { h: 40, v: 16 }), pos: { h: 120, v: 150 } })
const oneBandFixture = (): GameState => ({ ...createPlayGame(11), icbms: [bandIcbm()], explosions: [], remaining: 0 })

describe('mc12-1 AC1/AC3 — one ICBM MIRVs ONCE; no per-frame cascade (stepGame)', () => {
  it('a single in-band ICBM yields at most MIRV_MAX_CHILDREN children across ALL its in-band frames', () => {
    let s = oneBandFixture()
    let totalChildren = 0
    let splitEvents = 0
    let maxOnScreen = s.icbms.length
    for (let f = 0; f < 40; f++) {
      const before = s.icbms.length
      s = stepGame(s)
      const grew = s.icbms.length - before // no removals in-band ⇒ growth is pure MIRV
      if (grew > 0) {
        totalChildren += grew
        splitEvents += 1
      }
      maxOnScreen = Math.max(maxOnScreen, s.icbms.length)
    }
    // TODAY: the un-marked parent + its in-band children re-qualify every frame, so the
    // cluster climbs to NICBMS(8) and totalChildren ≫ 3 across the descent. GREEN bounds it.
    expect(totalChildren).toBe(MIRV_MAX_CHILDREN) // AC1: exactly 3 children, ever
    expect(splitEvents).toBe(1) // AC3: exactly ONE MIRV event per originating ICBM
    expect(maxOnScreen).toBeLessThanOrEqual(1 + MIRV_MAX_CHILDREN) // AC3: peaks at 4, not 8
  })
})

describe('mc12-1 AC3 — after the one split, no survivor re-qualifies (stepGame)', () => {
  it('the split parent + all 3 children physically remain in-band, yet NONE is MIRV-eligible', () => {
    // The direct, integration-level statement of AC1's "mirvEligible returns false for an
    // already-split ICBM and for any MIRV child": run the single frame in which the split
    // happens, then look at the survivors. Today every one of them sits in [128,160] AND
    // re-qualifies (4 eligible) → RED. GREEN: the parent consumed its MIRVIX slot and the
    // children were born spent, so 0 re-qualify even though all 4 remain in the band.
    const s = stepGame(oneBandFixture())
    const inBand = s.icbms.filter((i) => i.pos.v >= MIRV_LO && i.pos.v <= MIRV_HI)
    expect(inBand.length).toBe(1 + MIRV_MAX_CHILDREN) // 4 warheads are physically in the band…
    expect(s.icbms.filter(mirvEligible).length).toBe(0) // …yet none re-qualifies for a split
  })

  it('the on-screen ICBM count never exceeds NICBMS across the descent (regression anchor)', () => {
    // AC3's stated ceiling. The slice-cap already holds this today, so it is a regression
    // guard for that cap — NOT the reddening lever (that is the two counts above/below).
    let s = oneBandFixture()
    for (let f = 0; f < 40; f++) {
      s = stepGame(s)
      expect(s.icbms.length).toBeLessThanOrEqual(NICBMS)
    }
  })
})

describe('mc12-1 AC1 — backward compatibility: the marker is OPTIONAL', () => {
  it('an ordinary Icbm literal that omits the marker is unaffected (still eligible in-band, not in-band otherwise)', () => {
    // The new field must be optional so every pre-mc12 Icbm literal/test stays valid.
    expect(mirvEligible(at(144))).toBe(true) // in-band, no marker → eligible
    expect(mirvEligible(at(200))).toBe(false) // above band, no marker → not eligible
    expect(mirvEligible({ ...at(144), arrived: true })).toBe(false) // arrived guard intact
  })
})
