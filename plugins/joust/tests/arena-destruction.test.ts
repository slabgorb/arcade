// tests/arena-destruction.test.ts
//
// Story jt3-2 — RED phase (Leeloo / TEA). The BEHAVIOUR of mid-game arena
// destruction: the wave-3 bridge burn (AC-1), high-nibble cliff destruction as a
// geometry mutation (AC-2), and determinism through both (AC-4). The trace
// obligations and the source byte-gate live in the companion suite,
// tests/arena-destruction-source.test.ts.
//
// ─── THE ARCHITECTURE CONSTRAINT UNDER TEST ──────────────────────────────────
// jt1-5 froze the arena. Destruction must NOT unfreeze the exports — it flows
// THROUGH a wave event into a mutable ArenaState (the ROM's own RAM-copy shape,
// LNDXD1/BCKXD1). Every test below drives the REAL frozen data out of arena.ts and
// asserts the frozen exports STAY frozen while a per-run ArenaState reflects the
// burned bridge / destroyed cliffs. A test that mutated PLATFORMS in place would be
// testing the wrong architecture.
//
// ─── MUTATION-RESISTANCE (the jt1-4 lesson, applied) ─────────────────────────
// A review once flipped `>=` to `===` in bridgeDestroyedOnWave and every test
// still passed (the bridge came back on wave 4 and nobody noticed). So the pins
// here assert the ACTUAL mutated geometry — a destroyed cliff's landing goes
// AIRBORNE, the burned bridge drops an entity into the lava, and burned STAYS
// burned — never a bare boolean flip.

import { describe, it, expect } from 'vitest'
import { loadArena, type Platform } from './helpers/arena-contract.js'
import { loadArenaState, type ArenaState } from './helpers/arena-state-contract.js'

// The status HIGH nibble (WSTATUS & $F0) is the cliff-destruction datum. These
// are the wave-table status bytes jt2-5 committed (src/core/wave.ts WAVE_TABLE),
// used here as the destruction driver. The low nibble (type/persue) is irrelevant
// to destruction and deliberately varied to prove only the high nibble is read.
const STATUS = {
  none: 0x08, //  wave 5/10/… — high nibble $00: no cliff destroyed
  cliff2: 0x41, // wave 6 — WBCL2 $40: CLIF2 destroyed
  cliff12: 0x75, // wave 7 — WBCL12 $70: CLIF1L+CLIF1R+CLIF2
  cliff4: 0x85, // wave 12 — WBCL4 $80: CLIF4 destroyed
  all: 0xf7, //   wave 9 — WBCLS $F0: all four destructible cliffs
} as const

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE BRIDGE BURN. Latching, on the traced wave, footing removed.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the bridge burns on wave 3 and stays burned', () => {
  it('is intact before wave 3 and gone from wave 3 onward (the TBRIDGE=3 wave)', async () => {
    // The wave-numbering trace (documented in the session + open-questions §4):
    // TBRIDGE is seeded 3 and pre-decremented once per wave in IWAVE2 BEFORE the
    // WAVBCD increment, so it hits zero — STBRID burns the bridge — as wave 3
    // begins. The bridge is present in waves 1-2, gone from wave 3. This matches
    // arena.bridgeDestroyedOnWave(wave) = wave >= 3.
    const s = await loadArenaState()
    const at = (wave: number, status: number): ArenaState =>
      s.applyWaveDestruction(s.initialArenaState(), wave, status)
    expect(at(1, STATUS.none).bridgeBurned, 'wave 1: bridge intact').toBe(false)
    expect(at(2, STATUS.none).bridgeBurned, 'wave 2: bridge intact').toBe(false)
    expect(at(3, STATUS.none).bridgeBurned, 'wave 3: THE bridge burns').toBe(true)
  })

  it('STAYS burned on every later wave — a countdown, not an equality (the >= not === trap)', async () => {
    const s = await loadArenaState()
    for (const wave of [4, 5, 12, 42, 81, 99]) {
      expect(
        s.applyWaveDestruction(s.initialArenaState(), wave, STATUS.none).bridgeBurned,
        `wave ${wave}: the bridge does not come back`,
      ).toBe(true)
    }
  })

  it('LATCHES — once burned it stays burned even if a lower wave is applied afterward', async () => {
    // The ROM burns the bridge ONCE (TBRIDGE reaches zero and is never re-seeded).
    // The seam must OR the prior state, not recompute `wave >= 3` from scratch — a
    // Dev who writes `bridgeBurned = wave >= 3` alone fails this pin.
    const s = await loadArenaState()
    const burned = s.applyWaveDestruction(s.initialArenaState(), 3, STATUS.none)
    const then1 = s.applyWaveDestruction(burned, 1, STATUS.none)
    expect(then1.bridgeBurned, 'burned stays burned across a later apply').toBe(true)
  })

  it('an entity over the bridge span lands while intact and falls once burned', async () => {
    // AC-1's core observable. The bridge extends CLIF5's footing (landing bit $20)
    // across the lava; while intact the entity lands on the CLIF5 surface, once
    // burned it is airborne and drops into the lava (LAVAB, JOUSTRV4.SRC:5258-5264).
    const s = await loadArenaState()
    const a = await loadArena()

    const intact = s.bridgeGroundOutcome(s.initialArenaState())
    expect(intact.kind, 'intact: the bridge is footing').toBe('platform')
    expect((intact as { platform: Platform }).platform.bit, 'the CLIF5 landing bit').toBe(0x20)
    expect((intact as { platform: Platform }).platform.snapY, 'CLIF5 snap Y').toBe(210)

    const burned = s.applyWaveDestruction(s.initialArenaState(), 3, STATUS.none)
    expect(s.bridgeGroundOutcome(burned).kind, 'burned: no footing, into the lava').toBe('airborne')

    // Independent sanity: the burned bridge footing sits at/above the lava, so
    // "airborne here" really does mean a fall to a lava death.
    expect(a.DEATH_Y, 'the lava death line, for context').toBe(230)
  })

  it('burning the bridge does NOT destroy the CLIF5 island itself', async () => {
    // The bridge is CLIF5's footing OVER THE LAVA; the island stays. A general
    // CLIF5 landing query ($A0) must still land after the burn — only the bridge
    // SPAN loses footing. (A Dev who cleared CLIF5's bit wholesale would break
    // every entity on the bottom island.)
    const s = await loadArenaState()
    const burned = s.applyWaveDestruction(s.initialArenaState(), 3, STATUS.none)
    const island = s.groundOutcomeInState(burned, 0xa0)
    expect(island.kind, 'the CLIF5 island survives the bridge burn').toBe('platform')
    expect((island as { platform: Platform }).platform.bit).toBe(0x20)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — HIGH-NIBBLE CLIFF DESTRUCTION. Landing + background geometry mutate.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — a destroyed cliff loses its landing and background-collision geometry', () => {
  it('exposes the four destructible cliffs, in WCLFTB order, with the transcribed bits', async () => {
    // The DATA gate (re-derivation from the source) is the companion suite; this
    // pins the shape the behaviour reads.
    const s = await loadArenaState()
    expect(s.CLIFF_DESTRUCTION.map((c) => c.cliff)).toEqual(['CLIF1L', 'CLIF1R', 'CLIF2', 'CLIF4'])
    const byCliff = Object.fromEntries(s.CLIFF_DESTRUCTION.map((c) => [c.cliff, c]))
    expect(byCliff.CLIF1L).toMatchObject({ statusBit: 0x10, landingBit: 0x01, backgroundBits: 0x03 })
    expect(byCliff.CLIF1R).toMatchObject({ statusBit: 0x20, landingBit: 0x00, backgroundBits: 0x00 })
    expect(byCliff.CLIF2).toMatchObject({ statusBit: 0x40, landingBit: 0x02, backgroundBits: 0x04 })
    expect(byCliff.CLIF4).toMatchObject({ statusBit: 0x80, landingBit: 0x10, backgroundBits: 0x40 })
  })

  it('CLIF2 destroyed (WBCL2 $40): its landing goes airborne, its side stops colliding', async () => {
    const s = await loadArenaState()
    const st = s.applyWaveDestruction(s.initialArenaState(), 6, STATUS.cliff2)
    expect(st.destroyedCliffs).toContain('CLIF2')
    // Landing: CLIF2's mask bit $02 no longer lands.
    expect(s.groundOutcomeInState(st, 0x02).kind, 'CLIF2 landing is gone').toBe('airborne')
    // Background: CLIF2's BCKXTB bit $04 no longer collides.
    expect(s.backgroundActive(st, 0x04), 'CLIF2 side no longer bounces').toBe(false)
    // And ONLY CLIF2: an untouched cliff still lands and still collides.
    expect(s.groundOutcomeInState(st, 0x04).kind, 'CLIF3U (landing bit $04) untouched').toBe('platform')
    expect(s.backgroundActive(st, 0x08), 'CLIF3U background bit $08 untouched').toBe(true)
  })

  it('CLIF4 destroyed (WBCL4 $80): landing bit $10 and background bit $40 clear', async () => {
    const s = await loadArenaState()
    const st = s.applyWaveDestruction(s.initialArenaState(), 12, STATUS.cliff4)
    expect(st.destroyedCliffs).toEqual(['CLIF4'])
    expect(s.groundOutcomeInState(st, 0x10).kind).toBe('airborne')
    expect(s.backgroundActive(st, 0x40)).toBe(false)
  })

  it('the CLIF1 pair share one ledge: destroying them clears landing $01 and BOTH sides ($03)', async () => {
    const s = await loadArenaState()
    const st = s.applyWaveDestruction(s.initialArenaState(), 7, STATUS.cliff12)
    expect(st.destroyedCliffs).toEqual(expect.arrayContaining(['CLIF1L', 'CLIF1R', 'CLIF2']))
    // The merged LNDB0 ledge (bit $01) is gone.
    expect(s.groundOutcomeInState(st, 0x01).kind, 'the CLIF1 ledge is gone').toBe('airborne')
    // CLIF1L's $03 mask cleared BOTH background sides: CLIF1L $01 and CLIF1R $02.
    expect(s.backgroundActive(st, 0x01), 'CLIF1L side').toBe(false)
    expect(s.backgroundActive(st, 0x02), 'CLIF1R side (cleared by CLIF1L $03)').toBe(false)
  })

  it('all four destroyed (WBCLS $F0): every destructible landing goes airborne', async () => {
    const s = await loadArenaState()
    const st = s.applyWaveDestruction(s.initialArenaState(), 9, STATUS.all)
    for (const bit of [0x01, 0x02, 0x10]) {
      expect(s.groundOutcomeInState(st, bit).kind, `landing bit $${bit.toString(16)}`).toBe('airborne')
    }
    // CLIF3* / CLIF5 are NOT destructible — bit $04 (CLIF3U) and $A0 (CLIF5) still land.
    expect(s.groundOutcomeInState(st, 0x04).kind, 'CLIF3U is not destructible').toBe('platform')
    expect(s.groundOutcomeInState(st, 0xa0).kind, 'CLIF5 is not destructible').toBe('platform')
  })

  it('destruction REFLECTS the current wave, not cumulative: a later wave rebuilds the cliff', async () => {
    // The WCLFEW create path (JOUSTRV4.SRC:2335-2368) restores a cliff when its
    // status bit clears. So destroyedCliffs tracks the CURRENT wave's high nibble,
    // NOT a permanent set. A Dev who accumulated destroyed cliffs forever fails here.
    const s = await loadArenaState()
    const destroyed = s.applyWaveDestruction(s.initialArenaState(), 6, STATUS.cliff2)
    expect(s.groundOutcomeInState(destroyed, 0x02).kind).toBe('airborne')
    // Wave 10's status high nibble is $00 — CLIF2 is rebuilt.
    const rebuilt = s.applyWaveDestruction(destroyed, 10, STATUS.none)
    expect(rebuilt.destroyedCliffs, 'no cliffs destroyed on wave 10').toEqual([])
    expect(s.groundOutcomeInState(rebuilt, 0x02).kind, 'CLIF2 lands again').toBe('platform')
  })

  it('only the high nibble is read — the low nibble (type/persue) never destroys a cliff', async () => {
    const s = await loadArenaState()
    // Every low-nibble value with a $00 high nibble destroys nothing.
    for (const status of [0x00, 0x01, 0x0e, 0x0f, 0x08]) {
      const st = s.applyWaveDestruction(s.initialArenaState(), 20, status)
      expect(st.destroyedCliffs, `status $${status.toString(16)} destroys no cliff`).toEqual([])
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 + THE ARCHITECTURE CONSTRAINT — frozen exports, purity, determinism.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — the mutation is pure and the frozen exports stay frozen', () => {
  it('never writes through the frozen arena exports', async () => {
    const s = await loadArenaState()
    const a = await loadArena()
    const before = {
      platforms: JSON.stringify(a.PLATFORMS),
      lnd: JSON.stringify(a.LND_Y_TABLE),
      bck: JSON.stringify(a.BCK_Y_TABLE),
    }
    // Drive a whole gauntlet of destruction.
    let st = s.initialArenaState()
    for (const [wave, status] of [
      [6, STATUS.cliff2],
      [7, STATUS.cliff12],
      [9, STATUS.all],
      [10, STATUS.none],
    ] as const) {
      st = s.applyWaveDestruction(st, wave, status)
    }
    expect(Object.isFrozen(a.PLATFORMS), 'PLATFORMS stays frozen').toBe(true)
    expect(JSON.stringify(a.PLATFORMS), 'PLATFORMS unchanged').toBe(before.platforms)
    expect(JSON.stringify(a.LND_Y_TABLE), 'LNDYTB unchanged').toBe(before.lnd)
    expect(JSON.stringify(a.BCK_Y_TABLE), 'BCKYTB unchanged').toBe(before.bck)
  })

  it('does not mutate the ArenaState it is handed (returns a new value)', async () => {
    const s = await loadArenaState()
    const before = s.initialArenaState()
    const snapshot = JSON.stringify(before)
    s.applyWaveDestruction(before, 9, STATUS.all)
    expect(JSON.stringify(before), 'the argument state is untouched').toBe(snapshot)
  })

  it('ArenaState is plain data — JSON round-trips (carriable on the sim like the budget)', async () => {
    const s = await loadArenaState()
    const st = s.applyWaveDestruction(s.initialArenaState(), 9, STATUS.all)
    expect(JSON.parse(JSON.stringify(st))).toEqual(st)
  })

  it('a seeded run through the wave-3 burn AND a cliff-destruction wave replays bit-for-bit', async () => {
    const s = await loadArenaState()
    // A representative sequence that crosses the bridge burn (wave 3) and several
    // cliff-destruction waves, then a rebuild.
    const sequence: ReadonlyArray<readonly [number, number]> = [
      [1, STATUS.none],
      [2, STATUS.none],
      [3, STATUS.none], // bridge burns
      [6, STATUS.cliff2],
      [7, STATUS.cliff12],
      [9, STATUS.all],
      [10, STATUS.none], // rebuild
    ]
    const run = (): ArenaState[] => {
      const out: ArenaState[] = []
      let st = s.initialArenaState()
      for (const [wave, status] of sequence) {
        st = s.applyWaveDestruction(st, wave, status)
        out.push(st)
      }
      return out
    }
    expect(run()).toEqual(run())
    // And the crossing points are exactly what the trace predicts.
    const [w1, w2, w3] = run()
    expect(w1.bridgeBurned).toBe(false)
    expect(w2.bridgeBurned).toBe(false)
    expect(w3.bridgeBurned).toBe(true)
  })
})
