// tests/wave.test.ts
//
// Story jt2-5 — RED phase (O'Brien / TEA). The wave machine core: the CIA
// process. The full 90-row WAVTBL decode with its loop-at-81 and $00,$AF
// plateau, the independent BCD 0-99 wave counter, the six-type WJSRTB dispatch
// skeleton with the survival/co-op-live degrade laws, the negative claims
// (phantom types 12/14, wave 0 never played), the ~1 s message beats with NO
// pinned durations, the budget/EMYTIM seeding into jt2-2's inputs, and the
// carried seam — the intelligence budget threaded onto GameState so a dumb
// enemy promotes IN-SCHEDULER. The provenance of every law + the 90-row byte
// gate live in the companion suite, tests/wave-source.test.ts.
//
// RED today: tests/helpers/wave-contract.ts::loadWave throws "wave machine not
// built yet" (src/core/wave.ts absent) and loadWaveScheduler throws "the
// frame.ts budget seam is not wired yet" (GameState carries no `budget`) — a
// clean feature-absent red, per test, never a module-resolution trace or a type
// error. EVERY test loads a module FIRST so it reds that clean way.
//
// ─── HARDENING DISCIPLINE (jt2-3/jt2-4 both lost a round to under-pinning) ────
// Every who/which law is pinned in BOTH directions; boundary values are pinned
// EXACTLY ($AF plateau edge, BCD 99→00 rollover, the 12/14 phantom vs its valid
// neighbour 10); and each pin is shaped so its targeted mutant reds — the mutant
// is named in a comment beside the assertion.

import { describe, it, expect } from 'vitest'
import {
  loadWave,
  loadWaveScheduler,
  type ResolvedWaveType,
  type PlayersAlive,
  type GameState,
  type Process,
  type EnemyState,
  type PlayerView,
} from './helpers/wave-contract.js'
import { loadEnemy, type EntityState, type EnemyProcessSpec } from './helpers/enemy-contract.js'

// ─── Builders (mirroring enemy.test.ts's fixtures) ───────────────────────────

/** A full airborne EntityState at a whole-pixel Y — the flight fields a buzzard flies. */
function airborneEntity(pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

/** An enemy mind at a whole-pixel Y. Dumb (linet) by default; override to shape it. */
function enemyAt(pixelY: number, over: Partial<EnemyState> = {}, entOver: Partial<EntityState> = {}): EnemyState {
  return {
    entity: airborneEntity(pixelY, entOver),
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
    ...over,
  }
}

/** Spawn a dumb enemy process onto a state — the jt2-2 `kind:'enemy'` process. */
function enemySpec(id: number, enemy: EnemyState): EnemyProcessSpec {
  return { id, cls: 'primary', nap: 1, period: 1, kind: 'enemy', enemy }
}

type EnemyProc = Process & { enemy: EnemyState }
const enemyProcs = (s: GameState): EnemyProc[] =>
  s.processes.filter((p) => p.kind === 'enemy') as EnemyProc[]

const ALL_PLAYER_STATES: readonly PlayersAlive[] = [
  { p1: true, p2: true },
  { p1: true, p2: false },
  { p1: false, p2: true },
  { p1: false, p2: false },
]

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE FULL 90-ROW WAVTBL DECODE, its loop-at-81, and the $00,$AF plateau.
//        (The byte-for-byte re-derivation gate lives in wave-source.test.ts.)
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the full WAVTBL decode + geometry', () => {
  it('commits all 90 rows (waves 1-90) and the loop-back point (wave 81)', async () => {
    const w = await loadWave()
    expect(w.WAVE_TABLE.length, 'waves 1-90 committed').toBe(90)
    expect(w.WAVE_TABLE_LEN).toBe(90)
    expect(w.WAVE_LOOP_START, 'WTBRST loops back to wave 81').toBe(81)
  })

  it('decodes the nibble packing of wave 1: $30,$01,0,2 → 3 bounders, 1 pursuer, status 2', async () => {
    const w = await loadWave()
    const r = w.waveRowAt(1)
    // byte0 $30 → bounders (hi) 3, hunters (lo) 0; byte1 $01 → lords 0, pursuers 1.
    expect([r.bounders, r.hunters], 'a wrong nibble split reddens here').toEqual([3, 0])
    expect([r.lords, r.pursuers]).toEqual([0, 1])
    expect(r.pterodactyls).toBe(0)
    expect(r.status).toBe(2)
  })

  it('decodes wave 2 ($40,$01,0,4) — 4 bounders, status 4 (the co-op wave)', async () => {
    const w = await loadWave()
    const r = w.waveRowAt(2)
    expect([r.bounders, r.hunters, r.lords, r.pursuers]).toEqual([4, 0, 0, 1])
    expect(r.status).toBe(4)
  })

  it('LOOPS at 81, not at 1 and not modulo 90: wave 91 replays wave 81 (WTBRST), never wave 1', async () => {
    const w = await loadWave()
    // Kills a "wrap to wave 1" mutant and a "% 90" mutant.
    expect(w.waveRowAt(91), 'wave 91 = wave 81 (WTBRST)').toEqual(w.waveRowAt(81))
    expect(w.waveRowAt(101), 'and again').toEqual(w.waveRowAt(81))
    expect(w.waveRowAt(100), 'wave 100 = wave 90 (last row)').toEqual(w.waveRowAt(90))
    expect(w.waveRowAt(110)).toEqual(w.waveRowAt(90))
    expect(w.waveRowAt(91), 'the loop does NOT return to wave 1').not.toEqual(w.waveRowAt(1))
  })

  it('the loop region is the late-wave plateau: no bounders/hunters, pursuit maxed ($F)', async () => {
    const w = await loadWave()
    // "all Shadow Lords at max pursuit $00,$AF" — byte0 = $00, pursuit nibble = $F.
    for (const n of [81, 85, 90, 91, 100, 150, 999]) {
      const r = w.waveRowAt(n)
      expect([r.bounders, r.hunters], `wave ${n}: no bounders/hunters`).toEqual([0, 0])
      expect(r.pursuers, `wave ${n}: max pursuit`).toBe(0xf)
    }
    // BOTH directions: an EARLY wave is NOT the plateau (wave 1 pursuit = 1, not 15).
    expect(w.waveRowAt(1).pursuers).toBe(1)
    expect(w.waveRowAt(1).bounders).toBeGreaterThan(0)
  })

  it('rejects wave 0 and negatives — wave 0 is never played (PWAVE advances before the first wave)', async () => {
    const w = await loadWave()
    expect(() => w.waveRowAt(0), 'there is no wave 0').toThrow()
    expect(() => w.waveRowAt(-1)).toThrow()
    // The FIRST wave a fresh game plays is wave 1 (the intro wave), never wave 0.
    const first = w.waveRowAt(1)
    expect(w.rawWaveType(first.status), 'wave 1 is the intro wave').toBe('intro')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE BCD WAVE COUNTER, independent of the table index.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1/AC-2 — the BCD 0-99 wave counter (independent of the table index)', () => {
  it('increments in BCD, not binary: 0x09 → 0x10 (the DAA), never 0x0A', async () => {
    const w = await loadWave()
    expect(w.nextWaveBcd(0x00)).toBe(0x01)
    expect(w.nextWaveBcd(0x08)).toBe(0x09)
    // The decimal-adjust: 0x09 + 1 = 0x10, NOT 0x0A. Kills a plain-binary mutant.
    expect(w.nextWaveBcd(0x09), 'BCD not binary').toBe(0x10)
    expect(w.nextWaveBcd(0x19)).toBe(0x20)
    expect(w.nextWaveBcd(0x89)).toBe(0x90)
    expect(w.nextWaveBcd(0x98)).toBe(0x99)
  })

  it('rolls 99 → 00 (0-99, the exact boundary), not to 0x9A and not saturating', async () => {
    const w = await loadWave()
    // Kills both a binary-overflow-to-0x9A mutant and a clamp-at-99 mutant.
    expect(w.nextWaveBcd(0x99)).toBe(0x00)
  })

  it('is INDEPENDENT of the table index: the counter wraps at 100 while the table sits in its plateau', async () => {
    const w = await loadWave()
    // 100 increments from a fresh WAVBCD=0 land back on 0x00 (BCD wrapped once)…
    let bcd = 0x00
    for (let i = 0; i < 100; i++) bcd = w.nextWaveBcd(bcd)
    expect(bcd, 'BCD wrapped to 00 after 100 waves').toBe(0x00)
    // …but the 100th table row is wave 90 (a real plateau row), NOT wave 0.
    const row100 = w.waveRowAt(100)
    expect(row100, 'the table index does not wrap with the BCD').toEqual(w.waveRowAt(90))
    expect(() => w.waveRowAt(0), 'and there is still no wave-0 row to fall back to').toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE SIX-TYPE WJSRTB DISPATCH SKELETON + the degrade laws.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the WJSRTB six-type dispatch', () => {
  it('masks the low nibble to the JSR bits ($0E >> 1): the persue + cliff bits never leak into the type', async () => {
    const w = await loadWave()
    // status $0E = WBJSR0+WBJSR1+WBJSR2 mask; index = (status & $0E) >> 1.
    expect(w.waveTypeIndex(0x00)).toBe(0)
    expect(w.waveTypeIndex(0x02)).toBe(1)
    expect(w.waveTypeIndex(0x04)).toBe(2)
    expect(w.waveTypeIndex(0x06)).toBe(3)
    expect(w.waveTypeIndex(0x08)).toBe(4)
    expect(w.waveTypeIndex(0x0a)).toBe(5)
    // The persue bit ($01) is BELOW the mask — wave 6's status $41 is still type 0.
    expect(w.waveTypeIndex(0x41), 'WBPER does not leak into the type').toBe(0)
    // The cliff bits ($F0) are ABOVE the mask — wave 8's status $7B is still type 5.
    expect(w.waveTypeIndex(0x7b), 'cliff bits do not leak into the type').toBe(5)
  })

  it('routes each of the six real types by name', async () => {
    const w = await loadWave()
    expect(w.rawWaveType(0x00)).toBe('nop')
    expect(w.rawWaveType(0x02)).toBe('intro')
    expect(w.rawWaveType(0x04)).toBe('coop')
    expect(w.rawWaveType(0x06)).toBe('gladiator')
    expect(w.rawWaveType(0x08)).toBe('egg')
    expect(w.rawWaveType(0x0a)).toBe('ptero')
    expect([...w.WAVE_TYPES], 'the WJSRTB skeleton in order').toEqual([
      'nop',
      'intro',
      'coop',
      'gladiator',
      'egg',
      'ptero',
    ])
  })

  it('maps every canonical wave to its labelled type (all six types are reachable from the real table)', async () => {
    const w = await loadWave()
    const typeOf = (n: number): ResolvedWaveType => w.rawWaveType(w.waveRowAt(n).status)
    expect(typeOf(3), 'wave 3 is a plain (nop) wave').toBe('nop')
    expect(typeOf(1), 'wave 1 - needs intro message').toBe('intro')
    expect(typeOf(2), 'wave 2 - coop/team/survive').toBe('coop')
    expect(typeOf(4), 'wave 4 - gladiator').toBe('gladiator')
    expect(typeOf(5), 'wave 5 - egg').toBe('egg')
    expect(typeOf(8), 'wave 8 - pterodactyl').toBe('ptero')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — NEGATIVE CLAIMS: the phantom types 12/14, and the cliff bits as DATA.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — the phantom WBJSR types 12/14 are absent', () => {
  it('exposes exactly the two phantom indices 6 and 7 (offsets 12 and 14)', async () => {
    const w = await loadWave()
    expect([...w.PHANTOM_TYPE_INDICES].sort((a, b) => a - b)).toEqual([6, 7])
  })

  it('the valid neighbour (offset 10 → ptero) works, but offsets 12/14 are unreachable', async () => {
    const w = await loadWave()
    // Boundary: 10 is the last REAL type, 12 and 14 are phantom. Both directions.
    expect(w.waveTypeIndex(0x0a), 'offset 10 = index 5 = ptero').toBe(5)
    expect(w.rawWaveType(0x0a)).toBe('ptero')
    expect(w.waveTypeIndex(0x0c), 'offset 12 = index 6 = phantom').toBe(6)
    expect(w.waveTypeIndex(0x0e), 'offset 14 = index 7 = phantom').toBe(7)
    expect(() => w.rawWaveType(0x0c), 'phantom type 12 is never implemented').toThrow()
    expect(() => w.rawWaveType(0x0e), 'phantom type 14 is never implemented').toThrow()
    expect(() => w.dispatchWaveType(0x0c, { p1: true, p2: true })).toThrow()
  })

  it('NO wave in the real table dispatches to a phantom type', async () => {
    const w = await loadWave()
    const offenders = w.WAVE_TABLE.map((r, i) => ({ wave: i + 1, idx: w.waveTypeIndex(r.status) })).filter(
      (x) => x.idx > 5,
    )
    expect(offenders, 'every committed wave routes to one of the six real types').toEqual([])
  })

  it('records the high-nibble cliff destruction as DATA only ($F0), with no behaviour', async () => {
    const w = await loadWave()
    // wave 6 status $41 → WBCL2 ($40); wave 21 status $31 → WBCL1 ($30). Data, jt3 burns.
    expect(w.cliffBits(w.waveRowAt(6).status)).toBe(0x40)
    expect(w.cliffBits(w.waveRowAt(21).status)).toBe(0x30)
    expect(w.cliffBits(0x00), 'a wave with no cliff bits').toBe(0x00)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE DEGRADE-BY-PLAYER-COUNT LAWS (both directions, every player combo).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — survival/co-op live + degrade laws', () => {
  it('a co-op wave stays co-op with BOTH players alive, degrades to survival otherwise', async () => {
    const w = await loadWave()
    const COOP = 0x04
    expect(w.dispatchWaveType(COOP, { p1: true, p2: true }), '2P co-op').toBe('coop')
    expect(w.dispatchWaveType(COOP, { p1: true, p2: false }), 'P2 out → survival').toBe('survival')
    expect(w.dispatchWaveType(COOP, { p1: false, p2: true }), 'P1 out → survival').toBe('survival')
    expect(w.dispatchWaveType(COOP, { p1: false, p2: false }), 'both out → survival').toBe('survival')
  })

  it('a gladiator wave runs with BOTH players alive, no-ops (nop) solo', async () => {
    const w = await loadWave()
    const GLAD = 0x06
    expect(w.dispatchWaveType(GLAD, { p1: true, p2: true }), '2P gladiator').toBe('gladiator')
    expect(w.dispatchWaveType(GLAD, { p1: true, p2: false }), 'P2 out → nop (WAVRT2 RTS)').toBe('nop')
    expect(w.dispatchWaveType(GLAD, { p1: false, p2: true }), 'P1 out → nop').toBe('nop')
    // The 4th combo — BOTH out — mirrors the co-op both-out case at the top of
    // this describe. Without it a `both-out → 'gladiator'` short-circuit survives
    // all 36 wave tests: gladiator no-ops whenever ANY player is out, so two out
    // is still solo, still nop (WGLAD BEQ WAVRT2 twice, JOUSTRV4.SRC:2697-2700).
    expect(w.dispatchWaveType(GLAD, { p1: false, p2: false }), 'both out → nop').toBe('nop')
  })

  it('the non-degrading types are invariant to player count (intro/egg/ptero/nop)', async () => {
    const w = await loadWave()
    for (const players of ALL_PLAYER_STATES) {
      expect(w.dispatchWaveType(0x02, players), 'intro never degrades').toBe('intro')
      expect(w.dispatchWaveType(0x08, players), 'egg never degrades').toBe('egg')
      expect(w.dispatchWaveType(0x0a, players), 'ptero never degrades').toBe('ptero')
      expect(w.dispatchWaveType(0x00, players), 'nop never degrades').toBe('nop')
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — MESSAGE BEATS: a beat-count / event-shape pin, with NO pinned durations.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — the WAVDEL message beats carry the beat, not a pinned second', () => {
  it('each dispatched type emits its cited number of message beats', async () => {
    const w = await loadWave()
    // WAVMSG counts read straight from the WJSRTB routines (wave-source.test.ts).
    expect(w.waveBeats('nop').length, 'WAVRTS emits nothing').toBe(0)
    expect(w.waveBeats('intro').length, 'INTRO1, INTRO2').toBe(2)
    expect(w.waveBeats('coop').length, 'COOP1, COOP2').toBe(2)
    expect(w.waveBeats('survival').length, 'SURV1').toBe(1)
    expect(w.waveBeats('gladiator').length, 'GLAD1, GLAD2, GLAD3').toBe(3)
    expect(w.waveBeats('egg').length, 'EGG1').toBe(1)
    expect(w.waveBeats('ptero').length, 'PTER1').toBe(1)
  })

  it('NO beat carries a duration — the text seam owns timing (~1 s, unpinned)', async () => {
    const w = await loadWave()
    const types: ResolvedWaveType[] = ['intro', 'coop', 'survival', 'gladiator', 'egg', 'ptero']
    for (const t of types) {
      for (const beat of w.waveBeats(t)) {
        expect(Object.keys(beat).sort(), `beat for ${t} must be {message} only`).toEqual(['message'])
        expect(typeof beat.message, 'a beat names its message').toBe('string')
        expect(beat.message.length).toBeGreaterThan(0)
        // The ruling: no exact-duration assertion. Guard the shape can't grow one.
        for (const forbidden of ['seconds', 'ms', 'duration', 'delay', 'frames']) {
          expect(beat, `${t} beat must not pin a ${forbidden}`).not.toHaveProperty(forbidden)
        }
      }
    }
  })

  it('distinct types emit distinct message runs (intro ≠ coop ≠ gladiator)', async () => {
    const w = await loadWave()
    const msgs = (t: ResolvedWaveType): string => w.waveBeats(t).map((b) => b.message).join('|')
    expect(new Set([msgs('intro'), msgs('coop'), msgs('gladiator'), msgs('survival')]).size).toBe(4)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — SEEDING FLOWS TO jt2-2's INPUTS (pursuit nibble, EMYTIM, growth cadence).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — budget / EMYTIM seeding into jt2-2', () => {
  it('seeds the budget from the pursuit nibble — identical to enemy.seedBudget(row.pursuers)', async () => {
    const w = await loadWave()
    const e = await loadEnemy()
    const wave5 = w.waveRowAt(5) // $60,$01,0,8 → pursuers 1
    expect(w.seedWaveBudget(wave5)).toEqual({ nsmart: 0, wsmart: wave5.pursuers })
    expect(w.seedWaveBudget(wave5), 'the wave machine feeds jt2-2 seedBudget').toEqual(
      e.seedBudget(wave5.pursuers),
    )
    // A plateau wave seeds the maxed pursuit (nsmart still 0).
    const plateau = w.waveRowAt(81) // $00,$AF → pursuers 15
    expect(w.seedWaveBudget(plateau)).toEqual({ nsmart: 0, wsmart: 15 })
  })

  it('sets EMYTIM = 2 on waves 1 and 2 only — the divider, exact boundary', async () => {
    const w = await loadWave()
    expect(w.EMYTIM_SLOW).toBe(2)
    expect(w.EMYTIM_NORMAL).toBe(1)
    expect(w.emytimForWave(1), 'wave 1 slowed').toBe(2)
    expect(w.emytimForWave(2), 'wave 2 slowed').toBe(2)
    // BOTH directions + exact boundary: wave 3 is already back to 1.
    expect(w.emytimForWave(3), 'wave 3 not slowed').toBe(1)
    expect(w.emytimForWave(90)).toBe(1)
  })

  it('drives the CIA growth on the 896-frame cadence — the jt2-2 growth-timer input', async () => {
    const w = await loadWave()
    const e = await loadEnemy()
    // 112 naps × 8 frames = 896, shared with jt2-2's INTEL_GROWTH_FRAMES.
    expect(w.CIA_GROWTH_FRAMES).toBe(896)
    expect(w.CIA_GROWTH_FRAMES, 'the same cadence jt2-2 defined').toBe(e.INTEL_GROWTH_FRAMES)
    // Fires at each whole multiple; never before, never at 0. Both directions.
    expect(w.growthDue(0), 'no growth at frame 0').toBe(false)
    expect(w.growthDue(895), 'not one frame early').toBe(false)
    expect(w.growthDue(896), 'the first 15-second bump').toBe(true)
    expect(w.growthDue(897)).toBe(false)
    expect(w.growthDue(1792), 'and again at 2×').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — THE IFN DEBUG WAVE ORACLES (JOUSTRV4.SRC:1983, 2966-2970).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — the IFN DEBUG bookkeeping oracles', () => {
  it('accepts a clean wave boundary (NSMART balanced to 0, no enemies left)', async () => {
    const w = await loadWave()
    expect(() => w.assertWaveEndClean({ nsmart: 0, wsmart: 4 }, 0), 'the balanced ledger').not.toThrow()
  })

  it('throws when NSMART did not balance to zero ("NSMART had better be zero")', async () => {
    const w = await loadWave()
    // A promoted enemy survived into the next wave — the author's SWI.
    expect(() => w.assertWaveEndClean({ nsmart: 1, wsmart: 4 }, 0)).toThrow(/nsmart/i)
  })

  it('throws when the active-enemy count went negative (the NENEMY BPL/SWI oracle)', async () => {
    const w = await loadWave()
    expect(() => w.assertWaveEndClean({ nsmart: 0, wsmart: 4 }, -1)).toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// CARRIED SEAM — the budget is THREADED ONTO GameState, and in-scheduler
// promotion goes LIVE (jt2-2's scheduler enemies were dumb-only).
// ═════════════════════════════════════════════════════════════════════════════
describe('CARRIED SEAM — in-scheduler promotion via the GameState budget', () => {
  it('createState seeds an empty budget on GameState (the thread lands)', async () => {
    const sched = await loadWaveScheduler()
    const s = sched.createState(1)
    expect(s.budget, 'GameState now carries the intelligence budget').toEqual({ nsmart: 0, wsmart: 0 })
  })

  it('withBudget replaces ONLY the budget, leaving the process list + frame untouched', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    let s = sched.createState(1)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81)))
    const withB = w.withBudget(s, { nsmart: 0, wsmart: 3 })
    expect(withB.budget).toEqual({ nsmart: 0, wsmart: 3 })
    expect(withB.processes, 'processes untouched').toEqual(s.processes)
    expect(withB.frame, 'frame untouched').toBe(s.frame)
  })

  it('promotes a dumb enemy IN-SCHEDULER when the budget has room, debiting it', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    let s = sched.createState(7)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81)))
    s = sched.spawn(s, enemySpec(0x21, enemyAt(0x81)))
    s = w.withBudget(s, { nsmart: 0, wsmart: 2 }) // room for both
    s = sched.stepFrame(s)
    const enemies = enemyProcs(s)
    expect(
      enemies.map((p) => p.enemy.pchase),
      'both dumb enemies promote (jt2-2 left them dumb-only)',
    ).toEqual([1, 1])
    expect(s.budget.nsmart, 'the budget is debited once per promotion').toBe(2)
  })

  it('stops promoting when the budget is exhausted (first-come, list order)', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    let s = sched.createState(7)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81)))
    s = sched.spawn(s, enemySpec(0x21, enemyAt(0x81)))
    s = w.withBudget(s, { nsmart: 0, wsmart: 1 }) // room for ONE
    s = sched.stepFrame(s)
    const enemies = enemyProcs(s)
    expect(enemies.map((p) => p.enemy.pchase), 'only the first promotes').toEqual([1, 0])
    expect(s.budget.nsmart).toBe(1)
  })

  it('never re-promotes an already-smart enemy (PCHASE better be zero — budget untouched)', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    let s = sched.createState(7)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81, { pchase: 1, brain: 'boundr', decision: 'boundr' })))
    s = w.withBudget(s, { nsmart: 1, wsmart: 8 }) // plenty of room, but it is already smart
    s = sched.stepFrame(s)
    expect(s.budget.nsmart, 'an already-smart enemy is not re-promoted').toBe(1)
  })

  it('routes each promoted enemy to ITS OWN decision brain, not a hard-coded boundr (kills the b2undr→boundr reroute)', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    const e = await loadEnemy()
    let s = sched.createState(7)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81, { decision: 'b2undr' })))
    s = w.withBudget(s, { nsmart: 0, wsmart: 1 })
    s = sched.stepFrame(s)
    const promoted = enemyProcs(s)[0].enemy
    expect(promoted.pchase, 'promoted in-scheduler').toBe(1)
    expect(promoted.brain, 'to its OWN decision (b2undr), not boundr').toBe('b2undr')
    // And the dispatch really runs b2undr: at velY $180 (between the bounder brake
    // $100 and the hunter brake $200) with the player below, b2undr tolerates the
    // fall (no flap) where boundr would brake (flap) — so runBrain ≠ boundr.
    const downSeek: EnemyState = { ...promoted, entity: airborneEntity(0x81, { velY: 0x180 }) }
    const playerBelow: PlayerView = { pixelY: 0xc0, velXIndex: 0 }
    expect(e.runBrain(downSeek, playerBelow)).toEqual(e.b2undr(downSeek, playerBelow))
    expect(e.runBrain(downSeek, playerBelow), 'b2undr ≠ boundr at $180').not.toEqual(
      e.boundr(downSeek, playerBelow),
    )
  })

  it('routes a shadow-lord decision to shadow, not boundr (kills the shadow→boundr reroute)', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    const e = await loadEnemy()
    let s = sched.createState(7)
    s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81, { decision: 'shadow' })))
    s = w.withBudget(s, { nsmart: 0, wsmart: 1 })
    s = sched.stepFrame(s)
    const promoted = enemyProcs(s)[0].enemy
    expect(promoted.brain, 'to its OWN decision (shadow), not boundr').toBe('shadow')
    const downSeek: EnemyState = { ...promoted, entity: airborneEntity(0x81, { velY: 0x180 }) }
    const playerBelow: PlayerView = { pixelY: 0xc0, velXIndex: 0 }
    expect(e.runBrain(downSeek, playerBelow)).toEqual(e.shadow(downSeek, playerBelow))
    expect(e.runBrain(downSeek, playerBelow), 'shadow never brakes; boundr does').not.toEqual(
      e.boundr(downSeek, playerBelow),
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// DETERMINISM under seed (law #10) — the whole seam replays bit-for-bit.
// ═════════════════════════════════════════════════════════════════════════════
describe('determinism — a seeded wave-seed + scheduler run replays bit-for-bit', () => {
  it('two identical runs of seed → withBudget → N steps produce identical states', async () => {
    const w = await loadWave()
    const sched = await loadWaveScheduler()
    const run = (): GameState => {
      let s = sched.createState(12345)
      s = sched.spawn(s, enemySpec(0x20, enemyAt(0x81, { decision: 'b2undr' })))
      s = sched.spawn(s, enemySpec(0x21, enemyAt(0x60, { decision: 'shadow' })))
      s = w.withBudget(s, { nsmart: 0, wsmart: 2 })
      for (let i = 0; i < 20; i++) s = sched.stepFrame(s)
      return s
    }
    expect(run()).toEqual(run())
  })
})
