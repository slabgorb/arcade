// tests/game-bounty.test.ts
//
// Story jt4-3 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for the third module
// layer of epic jt4: the two remaining WJSRTB wave-type behaviours (egg + gladiator)
// and the three co-op BOUNTIES, on top of jt4-1's BCD registers and jt2-5's dispatch.
//
//   1. AC-1 — the EGG wave spawns its wave AS EGGS and the GLADIATOR wave ARMS PvP,
//      both routed THROUGH jt2-5's dispatchWaveType (the ptero type from jt3-4 stays
//      exactly as it was); all six WJSRTB types now carry a behaviour or a cited no-op.
//   2. AC-2 — the three bounties, each 3,000 via decodeDvalue('SCRHUN', $30) (a jt4-1
//      PASS-THROUGH, never a fresh literal): co-op 3,000 each VOIDED by a partner-kill
//      (WCOSCR, JOUSTRV4.SRC:2642-2661), survival 3,000 for a DEATHLESS wave (WSUSCR,
//      :2674-2693), gladiator 3,000 to the FIRST partner-killer (SPDGLA, :4691-4698).
//      Each is proven WITH its non-award path.
//   3. AC-3 — the PLYG1/2 POLARITY inversion (co-op arms 0 / gladiator arms −1,
//      :2634-2635 vs :2703-2705) transcribed with BOTH meanings; the PATC11 boot
//      cleanup (:6282-6284); the solo degrade laws (co-op→survival, gladiator no-op).
//   4. AC-4 — the four seeded scenarios replay bit-for-bit; the pure functions never
//      mutate their arguments.
//
// The provenance / source re-derivation + the JT43-* claim coverage live in the
// companion tests/game-bounty-source.test.ts. Every test loads the not-yet-built
// surface INSIDE its own it() via loadGameBounty (the tp1-8 collection trap) — it
// reddens cleanly ("jt4-3 … not built yet …") until Korben ships it. Each test NAMES
// the mutant it kills (guard-must-be-mutation-tested).

import { describe, it, expect } from 'vitest'
import { loadGameBounty } from './helpers/game-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import type { PlayerLedger, WaveGuards, WaveEndContext, ResolvedWaveType } from './helpers/game-contract.js'

const SEED = 0x1234

// The status low-nibble → WJSRTB type index is `(status & $0E) >> 1`, so a bare
// even byte selects each type: nop 0 / intro 2 / coop 4 / gladiator 6 / egg 8 /
// ptero $0A. These are the same constants wave.test.ts pins for the dispatch.
const NOP = 0x00
const INTRO = 0x02
const COOP = 0x04
const GLAD = 0x06
const EGG = 0x08
const PTERO = 0x0a

const BOTH_ALIVE = { p1: true, p2: true } as const
const P1_ONLY = { p1: true, p2: false } as const
const P2_ONLY = { p1: false, p2: true } as const

/** A jt4-3 ledger literal (NSHIP lives, armed at the first REPLAY threshold). */
function ledger(score = 0): PlayerLedger {
  return { score, scoreBcd: [0, 0, 0], lives: 5, extraManAt: 20_000, out: false }
}

/** A wave-end context tuple builder (defaults: both alive, no partner-kill, deathless). */
function ctx(over: Partial<WaveEndContext> = {}): WaveEndContext {
  return {
    alive: [true, true],
    guards: { plyg1: 0, plyg2: 0 },
    died: [false, false],
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the egg + gladiator behaviours through the WJSRTB dispatch; ptero unchanged;
//        all six types carry a behaviour or a cited no-op.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — egg + gladiator wave-type behaviours through jt2-5 dispatch', () => {
  it('the EGG wave spawns AS EGGS — true for an egg-type status, false for every other type', async () => {
    const g = await loadGameBounty()
    // The egg behaviour flows THROUGH dispatchWaveType (WAVEGG index 4), exactly the
    // shape jt3-4's pteroWaveSpawnCount uses. Kills "egg spawn is wired to the wrong
    // type index" and "always spawns eggs".
    expect(g.eggWaveSpawnsEggs(EGG, BOTH_ALIVE), 'an egg-type wave hatches its complement').toBe(true)
    for (const [name, status] of [['nop', NOP], ['intro', INTRO], ['coop', COOP], ['gladiator', GLAD], ['ptero', PTERO]] as const) {
      expect(g.eggWaveSpawnsEggs(status, BOTH_ALIVE), `a ${name}-type wave does NOT spawn eggs`).toBe(false)
    }
  })

  it('the egg type never DEGRADES by player-count — an egg wave stays an egg wave solo', async () => {
    const g = await loadGameBounty()
    // Kills a mutant that routes egg through the coop/gladiator degrade path: egg is
    // invariant to who is alive (only coop/gladiator degrade, wave.test.ts AC-2).
    for (const players of [BOTH_ALIVE, P1_ONLY, P2_ONLY, { p1: false, p2: false }] as const) {
      expect(g.eggWaveSpawnsEggs(EGG, players), 'egg spawns regardless of player count').toBe(true)
    }
  })

  it('the GLADIATOR wave ARMS PvP through the dispatch (both alive), and no-ops SOLO', async () => {
    const g = await loadGameBounty()
    const w = await loadWave()
    // 2P: the dispatch resolves 'gladiator' and the guards arm to −1 (the 1st-encounter
    // trigger). Kills "gladiator never arms" and "arms to 0".
    expect(g.armWaveGuards(w.dispatchWaveType(GLAD, BOTH_ALIVE)), '2P gladiator arms PvP to −1').toEqual({
      plyg1: -1,
      plyg2: -1,
    })
    // Solo: the dispatch degrades gladiator to 'nop' (WGLAD BEQ WAVRT2, :2697-2700), and
    // a nop wave never arms — the "gladiator no-ops solo" law. Kills "arms even solo".
    expect(g.armWaveGuards(w.dispatchWaveType(GLAD, P1_ONLY)), 'a solo gladiator degrades to nop → unarmed').toEqual({
      plyg1: 0,
      plyg2: 0,
    })
  })

  it('the PTERO type is UNCHANGED from jt3-4 — it carries the spawn-pteros behaviour, no bounty, no arm', async () => {
    const g = await loadGameBounty()
    expect(g.waveTypeBehaviour('ptero'), 'ptero still routes to the jt3-4 spawn behaviour').toBe('spawnPteros')
    // ptero arms no PvP guards (only coop/gladiator do) and pays no wave bounty.
    expect(g.armWaveGuards('ptero'), 'ptero does not arm the PLYG guards').toEqual({ plyg1: 0, plyg2: 0 })
    expect(g.awardWaveBounty([ledger(), ledger()], 'ptero', ctx()).map((p) => p.score), 'ptero pays no bounty').toEqual([
      0, 0,
    ])
  })

  it('ALL SIX WJSRTB types carry a behaviour or a cited no-op — nop is the ONLY no-op', async () => {
    const g = await loadGameBounty()
    const w = await loadWave()
    const behaviourOf = Object.fromEntries(w.WAVE_TYPES.map((t) => [t, g.waveTypeBehaviour(t)]))
    // Every one of the six raw types resolves to a behaviour string (kills "an
    // unimplemented type returns undefined / throws").
    expect(w.WAVE_TYPES.length, 'the WJSRTB table has six entries').toBe(6)
    expect(behaviourOf, 'each of the six carries its cited routine').toEqual({
      nop: 'noop',
      intro: 'message',
      coop: 'coopBonus',
      gladiator: 'gladiatorBounty',
      egg: 'spawnEggs',
      ptero: 'spawnPteros',
    })
    // The RTS no-op is nop's ALONE — kills "everything defaulted to noop".
    const noops = w.WAVE_TYPES.filter((t) => g.waveTypeBehaviour(t) === 'noop')
    expect(noops, 'WAVRTS RTS is the nop type only (JOUSTRV4.SRC:2593)').toEqual(['nop'])
    // The degraded 'survival' also carries its own behaviour (WAVSUR, :2665).
    expect(g.waveTypeBehaviour('survival'), 'survival carries its bonus behaviour').toBe('survivalBonus')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the three bounties: award AND non-award, each 3,000 via SCRHUN $30.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 co-op bonus — 3,000 each, VOIDED by a partner-kill', () => {
  it('the bounty is a jt4-1 PASS-THROUGH — 3,000 == decodeDvalue(SCRHUN, $30), never a fresh literal', async () => {
    const g = await loadGameBounty()
    // The whole DVALUE discipline: the 3,000 is LDA #$30 / JSR SCRHUN, decoded through
    // the SAME jt4-1 routine (thousands high nibble). Kills "hardcoded 3000 that would
    // survive a change to the SCRHUN decode".
    expect(g.decodeDvalue('SCRHUN', 0x30), 'SCRHUN $30 = 3 thousands = 3000').toBe(3000)
  })

  it('a clean co-op wave (both alive, no partner-kill) awards 3,000 to EACH player', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    const out = g.awardWaveBounty([ledger(), ledger()], 'coop', ctx({ guards: { plyg1: 0, plyg2: 0 } }))
    expect(out.map((p) => p.score), 'both team-mates bank the 3,000').toEqual([bonus, bonus])
    // The BCD register tracks the credit (kills "score moves but scoreBcd does not").
    expect(out[0].scoreBcd, 'the DSCORE view tracks the +3,000').toEqual(g.scoreToBcd(bonus))
  })

  it('a partner-kill VOIDS the WHOLE team bonus — neither player is paid (COOP3, no re-credit)', async () => {
    const g = await loadGameBounty()
    // A partner-kill in co-op INCrements a guard non-zero; LDA PLYG1 / ORA PLYG2 / BEQ
    // then skips the award for BOTH (:2642-2646). Kills "voids only the killer's share"
    // and "ignores the guard and always pays".
    const guards = g.recordPartnerKill(g.armWaveGuards('coop'), 1)
    expect(guards.plyg1 !== 0 || guards.plyg2 !== 0, 'a co-op partner-kill leaves a non-zero counter').toBe(true)
    const out = g.awardWaveBounty([ledger(), ledger()], 'coop', ctx({ guards }))
    expect(out.map((p) => p.score), 'the partner-kill voids the team bonus for BOTH').toEqual([0, 0])
  })

  it('a co-op wave only pays LIVING players (a dead team-mate banks nothing)', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    // SPLY1+6 / SPLY2+6 gate each award (:2648-2657). Kills "pays the dead player too".
    const out = g.awardWaveBounty([ledger(), ledger()], 'coop', ctx({ alive: [true, false] }))
    expect(out.map((p) => p.score), 'only the living team-mate is paid').toEqual([bonus, 0])
  })
})

describe('AC-2 survival bonus — 3,000 for a DEATHLESS wave only', () => {
  it('a surviving player who did NOT die this wave banks 3,000', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    const out = g.awardWaveBounty([ledger(), ledger()], 'survival', ctx({ alive: [true, false], died: [false, false] }))
    expect(out.map((p) => p.score), 'the deathless survivor banks the 3,000').toEqual([bonus, 0])
  })

  it('a survivor who DIED this wave banks NOTHING — the PLYD gate (LDA PLYD1 / BNE ENDTS)', async () => {
    const g = await loadGameBounty()
    // Still alive (lives left) but lost a life this wave → PLYD set → no bonus (:2677-2678).
    // Kills "survival pays anyone alive, ignoring PLYD".
    const out = g.awardWaveBounty([ledger(), ledger()], 'survival', ctx({ alive: [true, false], died: [true, false] }))
    expect(out.map((p) => p.score), 'a survivor who died this wave earns no bonus').toEqual([0, 0])
  })

  it('the survival gate is per-player — P1 deathless pays, P2 (also credited-eligible) is independent', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    // P1 deathless survivor pays; P2 alive-but-died pays nothing. Kills "one PLYD flag
    // gates both players".
    const out = g.awardWaveBounty([ledger(), ledger()], 'survival', ctx({ alive: [true, true], died: [false, true] }))
    expect(out.map((p) => p.score), 'P1 deathless → 3,000; P2 died → 0').toEqual([bonus, 0])
  })
})

describe('AC-2 gladiator bounty — 3,000 to the FIRST partner-killer only', () => {
  it('the first partner-killer (P1) banks 3,000; the loser banks nothing', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    const guards = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    const out = g.awardWaveBounty([ledger(), ledger()], 'gladiator', ctx({ guards }))
    expect(out.map((p) => p.score), 'P1 (the winning gladiator) banks the 3,000; P2 nothing').toEqual([bonus, 0])
  })

  it('the mirror — a P2 first-kill credits P2, not P1 (the bounty is not stuck on one ledger)', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    const guards = g.recordPartnerKill(g.armWaveGuards('gladiator'), 2)
    const out = g.awardWaveBounty([ledger(), ledger()], 'gladiator', ctx({ guards }))
    expect(out.map((p) => p.score), 'P2 wins the bounty; P1 nothing').toEqual([0, bonus])
  })

  it('nobody killed a partner → NO bounty (GLAD4, both guards still armed at −1)', async () => {
    const g = await loadGameBounty()
    // The guards are still the freshly-armed {−1,−1}; nobody flipped one, so no bounty.
    // Kills "pays a gladiator bounty from the mere fact of a gladiator wave".
    const out = g.awardWaveBounty([ledger(), ledger()], 'gladiator', ctx({ guards: g.armWaveGuards('gladiator') }))
    expect(out.map((p) => p.score), 'an un-fought gladiator wave pays no bounty').toEqual([0, 0])
  })

  it('FIRST killer ONLY — a later kill by the OTHER player does not win the bounty too', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    // P1 claims first; THEN P2 also kills a partner. The ROM ("ONLY 1 GLADIATOR IN THE
    // WAVE", SPDGLA CLR PLYG1/2 + $80 marker) awards P1 alone. Kills "each partner-kill
    // pays" and "the last killer wins".
    let guards = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    guards = g.recordPartnerKill(guards, 2)
    const out = g.awardWaveBounty([ledger(), ledger()], 'gladiator', ctx({ guards }))
    expect(out.map((p) => p.score), 'only the FIRST partner-killer (P1) is paid').toEqual([bonus, 0])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the PLYG1/2 polarity inversion (both meanings), PATC11, solo degrade.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the PLYG1/2 polarity trap, with both meanings', () => {
  it('co-op ARMS the guards to 0 (RESET); gladiator ARMS them to −1 (1st-encounter trigger)', async () => {
    const g = await loadGameBounty()
    // The whole trap, at the arming: the SAME two bytes start at OPPOSITE values.
    expect(g.armWaveGuards('coop'), 'co-op resets PLYG1/2 to 0 (JOUSTRV4.SRC:2634-2635)').toEqual({
      plyg1: 0,
      plyg2: 0,
    })
    expect(g.armWaveGuards('gladiator'), 'gladiator arms PLYG1/2 to −1 (JOUSTRV4.SRC:2703-2705)').toEqual({
      plyg1: -1,
      plyg2: -1,
    })
    // Kills "both types arm the same value" — the inversion must be observable.
    expect(g.armWaveGuards('coop')).not.toEqual(g.armWaveGuards('gladiator'))
  })

  it('the SAME partner-kill INVERTS: it VOIDS the co-op bonus but AWARDS the gladiator bounty', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    // One partner-kill by P1, recorded against each polarity's armed guards.
    const coopGuards = g.recordPartnerKill(g.armWaveGuards('coop'), 1)
    const gladGuards = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    // Co-op meaning: a partner-kill VOIDS the team's bonus.
    const coopOut = g.awardWaveBounty([ledger(), ledger()], 'coop', ctx({ guards: coopGuards }))
    expect(coopOut.map((p) => p.score), 'co-op: the partner-kill voids the bonus').toEqual([0, 0])
    // Gladiator meaning: the SAME partner-kill AWARDS the 3,000 bounty to the killer.
    const gladOut = g.awardWaveBounty([ledger(), ledger()], 'gladiator', ctx({ guards: gladGuards }))
    expect(gladOut.map((p) => p.score), 'gladiator: the same partner-kill AWARDS the killer').toEqual([bonus, 0])
  })

  it('PATC11 — a fresh game opens with the guards CLEARED to 0 (RESET 3,000 POINT TRIGGER)', async () => {
    const g = await loadGameBounty()
    // The "GAME START GOOF" cleanup (JOUSTRV4.SRC:6282-6284): createGame must NOT open
    // armed with a stale gladiator −1, or the game would mis-award a 3,000 bounty on the
    // first partner-kill of a non-gladiator wave. Kills "guards left undefined / −1 at boot".
    expect(g.createGame(SEED).guards, 'a fresh game boots with PLYG1/2 = 0').toEqual({ plyg1: 0, plyg2: 0 })
  })
})

describe('AC-3 — the solo degrade laws (co-op→survival, gladiator no-op)', () => {
  it('a SOLO co-op wave degrades to survival and pays the deathless survivor 3,000', async () => {
    const g = await loadGameBounty()
    const w = await loadWave()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    // The co-op status, with P2 out, dispatches to 'survival' (WCOOP → WAVSUR, :2628-2631).
    const type: ResolvedWaveType = w.dispatchWaveType(COOP, P1_ONLY)
    expect(type, 'a solo co-op wave degrades to survival').toBe('survival')
    const out = g.awardWaveBounty([ledger(), ledger()], type, ctx({ alive: [true, false], died: [false, false] }))
    expect(out.map((p) => p.score), 'the lone deathless survivor banks the survival 3,000').toEqual([bonus, 0])
  })

  it('a SOLO gladiator wave no-ops — it dispatches to nop and pays no bounty', async () => {
    const g = await loadGameBounty()
    const w = await loadWave()
    // The gladiator status, solo, dispatches to 'nop' (WGLAD → WAVRT2 RTS, :2697-2700).
    const type: ResolvedWaveType = w.dispatchWaveType(GLAD, P1_ONLY)
    expect(type, 'a solo gladiator wave no-ops').toBe('nop')
    expect(g.waveTypeBehaviour(type), 'nop carries the cited RTS no-op').toBe('noop')
    // Even with a partner-kill recorded, a nop wave pays nothing (there is no partner to
    // kill solo, and the routine is a bare RTS).
    const out = g.awardWaveBounty([ledger(), ledger()], type, ctx())
    expect(out.map((p) => p.score), 'a solo gladiator (nop) wave pays no bounty').toEqual([0, 0])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — determinism (the four seeded scenarios replay bit-for-bit) + purity.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 determinism — the four bounty scenarios replay bit-for-bit', () => {
  // Natural play cannot deterministically drive a partner-kill / wave-clear inside a
  // unit-test window, so — as jt4-2 did for its two-threshold extra-man run (logged as a
  // TEA test-strategy deviation) — each scenario is a FIXED, deterministic script over
  // createGame(SEED)'s real ledgers, replayed twice and compared byte-for-byte.
  const scenarios: Record<string, (g: Awaited<ReturnType<typeof loadGameBounty>>) => PlayerLedger[]> = {
    'co-op-bonus': (g) =>
      g.awardWaveBounty(g.createGame(SEED).players, 'coop', ctx({ guards: { plyg1: 0, plyg2: 0 } })),
    'partner-kill-void': (g) =>
      g.awardWaveBounty(
        g.createGame(SEED).players,
        'coop',
        ctx({ guards: g.recordPartnerKill(g.armWaveGuards('coop'), 1) }),
      ),
    survival: (g) =>
      g.awardWaveBounty(g.createGame(SEED).players, 'survival', ctx({ alive: [true, false], died: [false, false] })),
    'gladiator-bounty': (g) =>
      g.awardWaveBounty(
        g.createGame(SEED).players,
        'gladiator',
        ctx({ guards: g.recordPartnerKill(g.armWaveGuards('gladiator'), 2) }),
      ),
  }

  for (const [name, run] of Object.entries(scenarios)) {
    it(`the "${name}" scenario is deterministic (two runs are byte-identical)`, async () => {
      const g = await loadGameBounty()
      const a = run(g)
      const b = run(g)
      expect(a, `${name} replays bit-for-bit`).toEqual(b)
    })
  }

  it('the determinism runs are NON-VACUOUS — the awarding scenarios actually moved score', async () => {
    const g = await loadGameBounty()
    const bonus = g.decodeDvalue('SCRHUN', 0x30)
    expect(scenarios['co-op-bonus'](g).map((p) => p.score), 'co-op paid both').toEqual([bonus, bonus])
    expect(scenarios['partner-kill-void'](g).map((p) => p.score), 'the void paid neither').toEqual([0, 0])
    expect(scenarios['survival'](g)[0].score, 'survival paid the lone survivor').toBe(bonus)
    expect(scenarios['gladiator-bounty'](g).map((p) => p.score), 'gladiator paid P2 only').toEqual([0, bonus])
  })
})

describe('AC-4 purity — the bounty functions never mutate their arguments', () => {
  it('awardWaveBounty does not mutate the input ledgers', async () => {
    const g = await loadGameBounty()
    const players = [ledger(), ledger()]
    const before = JSON.stringify(players)
    g.awardWaveBounty(players, 'coop', ctx())
    expect(JSON.stringify(players), 'awardWaveBounty leaves the argument ledgers untouched').toBe(before)
  })

  it('armWaveGuards / recordPartnerKill never mutate their argument guards', async () => {
    const g = await loadGameBounty()
    const armed: WaveGuards = g.armWaveGuards('gladiator')
    const before = JSON.stringify(armed)
    g.recordPartnerKill(armed, 1)
    expect(JSON.stringify(armed), 'recordPartnerKill returns a new guards object').toBe(before)
  })
})
