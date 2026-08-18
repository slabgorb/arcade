// tests/warpin-idle-jt13-9.test.ts
//
// Story jt13-9 — RED phase (Han Solo / TEA). The BEHAVIOUR of the TREFF PHASE 2
// idle colour-cycle: the pure "wait for 1st move, or time out" state machine a
// full-size arrival plays AFTER the 30-frame grow-in of phase 1 (jt13-2) finishes
// and BEFORE PLYINT hands it to the brain. The ROM provenance (every constant
// re-derived from the vendored :5805-5890 loop and the TREPL tables) lives in
// warpin-idle-source-jt13-9.test.ts; the sim wiring in warpin-idle-wiring-jt13-9.
//
// These are pure state functions, exercised directly (the warpin / dissolve /
// crumble precedent). Every constant is imported from the built module and compared
// to the ROM literal, so a module that re-bakes a misreading (a constant cadence, a
// wrong palette, a never-timeout) reddens here, and the source suite proves the
// literal itself is the ROM's.

import { describe, it, expect } from 'vitest'
import { loadWarpInIdle, type IdleCycleState, type IdleColour } from './helpers/warpin-idle-contract.js'

// Drive a fresh idle cycle to its terminal state with NO input, returning the whole
// wake-by-wake trace (the state AFTER each stepIdleCycle). A generous cap guards a
// never-terminating regression without masking the real ~376-wake length.
async function runToEnd(
  owner: 'player' | 'enemy' = 'player',
): Promise<{ w: Awaited<ReturnType<typeof loadWarpInIdle>>; trace: IdleCycleState[] }> {
  const w = await loadWarpInIdle()
  let s = w.startIdleCycle(owner)
  const trace: IdleCycleState[] = []
  for (let i = 0; i < 5000 && s.end === 'active'; i++) {
    s = w.stepIdleCycle(s, false)
    trace.push(s)
  }
  return { w, trace }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — the module literals pin the ROM's :5805-5890 seeds and the palette.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-9 — idle-cycle constants pin the wait-loop seeds', () => {
  it('IDLE_SPEED_INIT is PFEET = 16*2 = 32 (LDA #16*2, :5810)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_SPEED_INIT, 'PFEET seed, halved to 16 on the first wake').toBe(32)
  })

  it('IDLE_STEP_INIT is PACCX = PFEET>>1 = 16 (LSRA/STA PACCX, :5812-5813)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_STEP_INIT, 'the initial colour-step counter').toBe(16)
    expect(w.IDLE_STEP_INIT, 'PACCX is PFEET halved').toBe(w.IDLE_SPEED_INIT >> 1)
  })

  it('IDLE_COLOUR_INDEX_INIT is PLANTZ = 2 (LDA #2, :5814)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_COLOUR_INDEX_INIT, 'the starting PLANTZ colour index').toBe(2)
  })

  it('IDLE_SPEED_WINDOW_NAPS is the PTIMUP reload = 75 (LDA #75, :5845)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_SPEED_WINDOW_NAPS, 'each cadence value is held for one 75-nap window').toBe(75)
  })

  it('IDLE_CADENCE is the accelerating 16,8,4,2,1 (the PFEET halvings, :5847-5848)', async () => {
    const w = await loadWarpInIdle()
    expect(
      [...w.IDLE_CADENCE],
      'PFEET walks 32→16→8→4→2→1→0: five live cadences then timeout',
    ).toEqual([16, 8, 4, 2, 1])
    // Each is the previous halved — a genuinely accelerating geometric run.
    for (let i = 1; i < w.IDLE_CADENCE.length; i++) {
      expect(w.IDLE_CADENCE[i], `cadence ${i} halves cadence ${i - 1}`).toBe(w.IDLE_CADENCE[i - 1] >> 1)
    }
    expect(w.IDLE_CADENCE[0], 'the first live cadence is PFEET after its first halving (32>>1)').toBe(
      w.IDLE_SPEED_INIT >> 1,
    )
  })

  it('the TREPL palettes are the owner/white/grey role tables (TREPL1/2/3, :5581-5583)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_SEQUENCE_LENGTH, 'eight entries (ANDB #$07)').toBe(8)
    // TREPL1 ≡ TREPL2 as roles: owner,owner,white,owner,owner,grey,owner,owner.
    expect(
      [...w.IDLE_SEQUENCE_PLAYER],
      'players: owner nibble with a white flash at 2 and a grey flash at 5',
    ).toEqual(['owner', 'owner', 'white', 'owner', 'owner', 'grey', 'owner', 'owner'])
    // TREPL3: white base, grey flashes at 2 and 5.
    expect(
      [...w.IDLE_SEQUENCE_ENEMY],
      'enemies: white base with grey flashes at 2 and 5',
    ).toEqual(['white', 'white', 'grey', 'white', 'white', 'grey', 'white', 'white'])
    expect(w.IDLE_SEQUENCE_PLAYER.length, 'player table is 8 long').toBe(w.IDLE_SEQUENCE_LENGTH)
    expect(w.IDLE_SEQUENCE_ENEMY.length, 'enemy table is 8 long').toBe(w.IDLE_SEQUENCE_LENGTH)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// START — the cycle opens on the ROM's seeds, not ended.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-9 — startIdleCycle opens the wait loop', () => {
  it('seeds PFEET=32, PACCX=16, PLANTZ=2, an empty window, active', async () => {
    const w = await loadWarpInIdle()
    const s = w.startIdleCycle('player')
    expect(s.speed, 'PFEET seed').toBe(w.IDLE_SPEED_INIT)
    expect(s.step, 'PACCX seed').toBe(w.IDLE_STEP_INIT)
    expect(s.colourIndex, 'PLANTZ seed').toBe(w.IDLE_COLOUR_INDEX_INIT)
    expect(s.windowNaps, 'PTIMUP starts CLR at 0 — the first wake halves PFEET immediately').toBe(0)
    expect(s.end, 'the cycle is running').toBe('active')
    expect(s.owner, 'carries its palette selector').toBe('player')
  })

  it('the first wake halves PFEET 32→16 and arms the 75-nap window (CLR PTIMUP quirk)', async () => {
    const w = await loadWarpInIdle()
    const s = w.stepIdleCycle(w.startIdleCycle('player'), false)
    expect(s.speed, 'PFEET immediately halves to 16 (PTIMUP was 0, DEC/BGT fires)').toBe(16)
    expect(s.windowNaps, 'and PTIMUP reloads to 75').toBe(w.IDLE_SPEED_WINDOW_NAPS)
    expect(s.end, 'still running').toBe('active')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE ACCELERATING CADENCE — the heart of the story. Colour changes speed up
// through 16,8,4,2,1; a constant-cadence or wrong-palette build reddens here.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-9 — the colour cycle accelerates through the cadence', () => {
  it('times out after exactly 1 + CADENCE.length * WINDOW naps with no input', async () => {
    const { w, trace } = await runToEnd('player')
    expect(trace[trace.length - 1]?.end, 'no flap → the phase times out (PFEET halves to 0)').toBe(
      'timed-out',
    )
    // wake 1 halves 32→16; then five 75-nap windows carry 16→8→4→2→1→0.
    const expected = 1 + w.IDLE_CADENCE.length * w.IDLE_SPEED_WINDOW_NAPS
    expect(trace.length, 'the full wait is one immediate halve plus five speed windows (= 376)').toBe(
      expected,
    )
    expect(expected, 'sanity: the ROM literals give 376 naps ≈ 6.4s at ~58Hz').toBe(376)
  })

  it('the gaps between colour changes are exactly the cadence {16,8,4,2,1}, non-increasing', async () => {
    const { w, trace } = await runToEnd('player')
    // Wake indices (1-based, matching trace position+1) where the colour index changed.
    const changeWakes: number[] = []
    let prev = w.IDLE_COLOUR_INDEX_INIT
    trace.forEach((s, i) => {
      if (s.colourIndex !== prev) changeWakes.push(i + 1)
      prev = s.colourIndex
    })
    expect(changeWakes.length, 'the colour advances many times over the wait').toBeGreaterThan(5)
    const gaps: number[] = []
    for (let i = 1; i < changeWakes.length; i++) gaps.push(changeWakes[i] - changeWakes[i - 1])
    // Accelerating: each gap is ≤ the one before it.
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i], `gap ${i} does not grow (the cadence only accelerates)`).toBeLessThanOrEqual(
        gaps[i - 1],
      )
    }
    // Every gap is one of the cadence values, and both extremes are realised.
    const distinct = [...new Set(gaps)].sort((a, b) => b - a)
    expect(distinct, 'the only colour-step intervals are the cadence values').toEqual([...w.IDLE_CADENCE])
    expect(Math.max(...gaps), 'the slow opening cadence is 16').toBe(16)
    expect(Math.min(...gaps), 'the frantic final cadence is 1 (a colour every nap)').toBe(1)
  })

  it('a player run shows all three roles; an enemy run shows only white and grey', async () => {
    const { w, trace: playerTrace } = await runToEnd('player')
    const start = w.startIdleCycle('player')
    const playerColours = new Set<IdleColour>([w.idleColour(start), ...playerTrace.map((s) => w.idleColour(s))])
    expect(playerColours, 'a player flashes owner, white AND grey').toEqual(
      new Set<IdleColour>(['owner', 'white', 'grey']),
    )

    const { w: w2, trace: enemyTrace } = await runToEnd('enemy')
    const enemyColours = new Set<IdleColour>([
      w2.idleColour(w2.startIdleCycle('enemy')),
      ...enemyTrace.map((s) => w2.idleColour(s)),
    ])
    expect(enemyColours, 'an enemy is white/grey only — no owner colour (TREPL3)').toEqual(
      new Set<IdleColour>(['white', 'grey']),
    )
  })

  it('idleColour indexes the owner palette modulo 8', async () => {
    const w = await loadWarpInIdle()
    for (let ci = 0; ci < 20; ci++) {
      const s = { ...w.startIdleCycle('player'), colourIndex: ci }
      expect(w.idleColour(s), `PLANTZ ${ci} wraps into the 8-entry player table`).toBe(
        w.IDLE_SEQUENCE_PLAYER[ci % w.IDLE_SEQUENCE_LENGTH],
      )
      const e = { ...w.startIdleCycle('enemy'), colourIndex: ci }
      expect(w.idleColour(e), `PLANTZ ${ci} wraps into the 8-entry enemy table`).toBe(
        w.IDLE_SEQUENCE_ENEMY[ci % w.IDLE_SEQUENCE_LENGTH],
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FIRST MOVE — any input aborts the wait immediately (BNE 51$), before timeout.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-9 — a first move aborts the wait early', () => {
  it('a flap on the very first wake ends it "moved", not "timed-out"', async () => {
    const w = await loadWarpInIdle()
    const s = w.stepIdleCycle(w.startIdleCycle('player'), true)
    expect(s.end, 'CURJOY ≠ 0 → the arrival wants to flap, the wait ends').toBe('moved')
  })

  it('a flap partway through a long wait aborts it there (before it would time out)', async () => {
    const w = await loadWarpInIdle()
    let s = w.startIdleCycle('player')
    for (let i = 0; i < 100; i++) s = w.stepIdleCycle(s, false)
    expect(s.end, 'still cycling 100 naps in — nowhere near the 376-nap timeout').toBe('active')
    const moved = w.stepIdleCycle(s, true)
    expect(moved.end, 'the flap ends it immediately').toBe('moved')
  })

  it('an enemy that never moves always times out (its complement is AI, no first move)', async () => {
    const { trace } = await runToEnd('enemy')
    expect(trace[trace.length - 1]?.end, 'no input → timeout, same length as the player run').toBe(
      'timed-out',
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PURITY — deterministic, non-mutating, terminal (the core-boundary contract).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-9 — the idle cycle is deterministic, pure, and terminal', () => {
  it('two no-input runs produce identical traces', async () => {
    const w = await loadWarpInIdle()
    const trace = (): string => {
      let s = w.startIdleCycle('player')
      const out: string[] = []
      for (let i = 0; i < 5000 && s.end === 'active'; i++) {
        s = w.stepIdleCycle(s, false)
        out.push(`${s.colourIndex},${s.step},${s.speed},${s.windowNaps},${s.end}`)
      }
      return out.join('|')
    }
    expect(trace(), 'no clock, no entropy — replays identically').toBe(trace())
  })

  it('stepIdleCycle never mutates its argument', async () => {
    const w = await loadWarpInIdle()
    const s = w.startIdleCycle('player')
    const before = JSON.stringify(s)
    w.stepIdleCycle(s, false)
    w.stepIdleCycle(s, true)
    expect(JSON.stringify(s), 'the input state is untouched').toBe(before)
  })

  it('an ended cycle is a fixed point under either input', async () => {
    const { w, trace } = await runToEnd('player')
    const done = trace[trace.length - 1]
    expect(done.end, 'reached a terminal state').toBe('timed-out')
    expect(w.stepIdleCycle(done, false), 'timed-out is idempotent (no input)').toEqual(done)
    expect(w.stepIdleCycle(done, true), 'a late flap cannot revive a timed-out cycle').toEqual(done)

    const moved = w.stepIdleCycle(w.startIdleCycle('player'), true)
    expect(moved.end, 'moved terminal').toBe('moved')
    expect(w.stepIdleCycle(moved, false), 'moved is idempotent too').toEqual(moved)
  })
})
