// tests/game-extra.test.ts
//
// Story jt4-2 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for EXTRA MEN, the
// second module layer of epic jt4 above jt4-1's BCD scoring core (src/core/game.ts):
//
//   1. NSHIP — each player opens with the kept free-play CMOS default of 5 men
//      (TB12REV3.SRC:135 NMEN $05 / EQU.SRC:111 NSHIP). createGame seeds it.
//   2. The REPLAY extra-man award — an extra man at every 20,000 (the REPLAY CMOS
//      nibble $20 justified ×16 into LEVPAS, JOUSTRV4.SRC:915-928), RE-ARMED +20,000
//      after each award so the NEXT man lands at the next multiple (SCRLEV,
//      JOUSTRV4.SRC:7382-7411 — its `BRA SCRLEV` re-checks, so ONE big jump can pass
//      several levels at once). Folded into jt4-1's creditScoreEvents (checked AS
//      score accrues) with a per-player `extraManAt` threshold on the ledger.
//   3. The 50-for-dying credit — a mount death books the dying player 50 points via
//      SCRTEN $50 (JOUSTRV4.SRC:4730-4732) AND drops that player's OWN life count.
//
// The source re-derivation (NSHIP/REPLAY/50 straight out of the vendored 1982 tree)
// + the JT42-* claim coverage live in the companion tests/game-extra-source.test.ts.
//
// Every test loads the module INSIDE its own it() (the tp1-8 collection trap) via
// loadGameExtra, which reddens cleanly ("jt4-2 extra-men not built yet …") until
// Korben ships `bookDeath` + the NSHIP seed + the folded award. Each test NAMES the
// mutant it kills — the epic mutation-tests its guards (guard-must-be-mutation-tested).

import { describe, it, expect } from 'vitest'
import { loadGameExtra } from './helpers/game-contract.js'
import type { PlayerLedger, GameScoreEvent, PlayerInput } from './helpers/game-contract.js'

const SEED = 0x1234

// The source-derived facts these behaviour tests assert the module against. The
// companion source suite RE-DERIVES each of these out of the vendored tree with the
// independent reader; here they are the expected numbers.
const NSHIP = 5 // TB12REV3.SRC:135 FCB $05 NMEN
const REPLAY_STEP = 20_000 // REPLAY $20 justified ×16 → 20,000 (JOUSTRV4.SRC:915-928)
const DEATH_POINTS = 50 // SCRTEN $50 (JOUSTRV4.SRC:4730-4732)

// A jt4-2 ledger literal: NSHIP lives, un-awarded at the seeded threshold.
function ledger(score = 0, extraManAt: number = REPLAY_STEP): PlayerLedger {
  return { score, scoreBcd: [0, 0, 0], lives: NSHIP, extraManAt, out: false }
}
// A jt4-1-shape ledger WITHOUT extraManAt — proves the drain defaults an absent
// threshold to 20,000 (so jt4-1's pre-existing creditScoreEvents callers still award).
function bareLedger(score = 0): PlayerLedger {
  return { score, scoreBcd: [0, 0, 0], lives: NSHIP, out: false }
}
function scoreEvent(value: number, player: number, reason: 'kill' | 'egg' = 'kill'): GameScoreEvent {
  return { kind: 'score', value, reason, player }
}
const flap = (dir: -1 | 0 | 1): PlayerInput => ({ dir, flap: true, flapHeld: true })

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — NSHIP: every player opens with 5 men (the kept free-play default).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 NSHIP — each player starts with 5 lives', () => {
  it('createGame seeds both co-op ledgers to NSHIP=5 (not the jt4-1 zero placeholder)', async () => {
    const g = await loadGameExtra()
    const game = g.createGame(SEED)
    // Kills the mutant "lives left at the jt4-1 STARTING_LIVES_PLACEHOLDER=0" and the
    // plausible-wrong "3 men" default: the kept CMOS adjustment is 5 (TB12REV3 NMEN $05).
    expect(game.players.map((p) => p.lives), 'both knights open with NSHIP=5 men').toEqual([5, 5])
  })

  it('a solo game seeds one ledger, also to NSHIP', async () => {
    const g = await loadGameExtra()
    expect(g.createGame(SEED, 1).players.map((p) => p.lives), 'playerCount ledgers, each NSHIP').toEqual([5])
  })

  it('createGame arms each ledger at the first REPLAY threshold (20,000)', async () => {
    const g = await loadGameExtra()
    // Kills "seeded already-past the first award" (e.g. 40,000) and "un-seeded/undefined":
    // the first extra man must land at exactly 20,000.
    expect(g.createGame(SEED).players.map((p) => p.extraManAt), 'first man armed at 20,000').toEqual([
      REPLAY_STEP,
      REPLAY_STEP,
    ])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the REPLAY extra man: award at 20,000, RE-ARMED per award, across TWO.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 extra man — award at 20,000, re-armed per award', () => {
  it('crossing 20,000 awards one man AND re-arms the threshold to 40,000', async () => {
    const g = await loadGameExtra()
    const [after] = g.creditScoreEvents([ledger()], [scoreEvent(REPLAY_STEP, 1)])
    expect(after.lives, 'the extra man lands at 20,000 (BLO SCRRTS → award when NOT lower)').toBe(NSHIP + 1)
    expect(after.extraManAt, 're-armed: the NEXT man is due at 40,000, not 20,000 again').toBe(2 * REPLAY_STEP)
  })

  it('the award is RE-ARMED across TWO separate awards (the second man at the next multiple)', async () => {
    const g = await loadGameExtra()
    // Two frames of accrual: 20,000 then a further 20,000 (total 40,000). A one-shot
    // implementation (awards once, never re-arms) leaves lives at 6 here — this pins 7.
    let s = g.creditScoreEvents([ledger()], [scoreEvent(REPLAY_STEP, 1)])
    s = g.creditScoreEvents(s, [scoreEvent(REPLAY_STEP, 1)])
    expect(s[0].lives, 'second man at 40,000 — proven across two awards').toBe(NSHIP + 2)
    expect(s[0].extraManAt, 're-armed twice → next man at 60,000').toBe(3 * REPLAY_STEP)
  })

  it('a single jump PAST two thresholds awards TWO men in one credit (the BRA SCRLEV re-check)', async () => {
    const g = await loadGameExtra()
    // 45,000 in one credit passes 20,000 AND 40,000. Kills the mutant "award at most once
    // per creditScoreEvents call" (an `if` instead of the ROM's `BRA SCRLEV` re-check loop):
    // that mutant awards ONE man for a 45,000 jump; the ROM awards two.
    const [after] = g.creditScoreEvents([ledger()], [scoreEvent(45_000, 1)])
    expect(after.lives, 'two men for a 45,000 jump — the low-level re-check loop').toBe(NSHIP + 2)
    expect(after.extraManAt, 're-armed past both levels → 60,000').toBe(3 * REPLAY_STEP)
  })

  it('19,999 awards nothing; the very next point (→20,000) awards — the threshold is exactly 20,000', async () => {
    const g = await loadGameExtra()
    let s = g.creditScoreEvents([ledger()], [scoreEvent(19_999, 1)])
    // Kills a too-low threshold mutant (e.g. 16,000, the raw ×16 of $20=32 misread as
    // binary 512, or 10,000): those would already have awarded at 19,999.
    expect(s[0].lives, 'no man below 20,000').toBe(NSHIP)
    s = g.creditScoreEvents(s, [scoreEvent(1, 1)])
    expect(s[0].lives, 'the man lands the instant the score reaches 20,000').toBe(NSHIP + 1)
  })

  it('the award is per-player: P1 crossing 20,000 never awards P2 a man', async () => {
    const g = await loadGameExtra()
    const after = g.creditScoreEvents([ledger(), ledger()], [scoreEvent(REPLAY_STEP, 1)])
    expect(after[0].lives, 'P1 earned the man').toBe(NSHIP + 1)
    expect(after[1].lives, "P2's life count is untouched by P1's score — co-op independence").toBe(NSHIP)
    expect(after[1].extraManAt, "and P2's threshold is un-armed forward").toBe(REPLAY_STEP)
  })

  it('an absent extraManAt defaults to the 20,000 threshold (jt4-1 ledgers still award)', async () => {
    const g = await loadGameExtra()
    // A jt4-1-shape ledger carries no extraManAt; the drain must treat it as "due at
    // 20,000, un-awarded" rather than never awarding (a `?? 20000` default, not undefined).
    const [after] = g.creditScoreEvents([bareLedger()], [scoreEvent(REPLAY_STEP, 1)])
    expect(after.lives, 'a bare ledger still earns its man at 20,000').toBe(NSHIP + 1)
  })

  it('does not mutate its argument ledgers (pure)', async () => {
    const g = await loadGameExtra()
    const l = ledger()
    const before = JSON.stringify(l)
    g.creditScoreEvents([l], [scoreEvent(REPLAY_STEP, 1)])
    expect(JSON.stringify(l), 'creditScoreEvents never mutates the input ledger').toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the 50-for-dying credit + the own-life decrement (bookDeath, isolated).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 death — bookDeath drops one own-life and credits the SCRTEN $50 = 50', () => {
  it("a P1 death drops ONLY P1's life by one and credits P1 exactly 50 points", async () => {
    const g = await loadGameExtra()
    const after = g.bookDeath([ledger(), ledger()], 1)
    expect(after[0].lives, 'the dying player loses exactly one man').toBe(NSHIP - 1)
    expect(after[0].score, 'and is credited the 50-for-dying').toBe(DEATH_POINTS)
    expect(after[0].scoreBcd, 'the BCD view tracks the +50').toEqual(g.scoreToBcd(DEATH_POINTS))
    expect(after[1].lives, "the other player's life count is untouched").toBe(NSHIP)
    expect(after[1].score, 'and never credited').toBe(0)
  })

  it('the 50 is the SCRTEN BACKWARDS decode of $50 — NOT the forwards SCRHUN 5000', async () => {
    const g = await loadGameExtra()
    const credit = g.bookDeath([ledger()], 1)[0].score
    // The SCRTEN caveat carried from jt4-1: $50 through SCRTEN (tens=HIGH nibble 5 → 50,
    // hundreds=LOW nibble 0 → 0) is 50; a naive forwards/SCRHUN reader books 5000.
    expect(credit, 'death credit == decodeDvalue(SCRTEN, $50)').toBe(g.decodeDvalue('SCRTEN', 0x50))
    expect(g.decodeDvalue('SCRTEN', 0x50), 'the backwards decode is 50').toBe(50)
    expect(g.decodeDvalue('SCRHUN', 0x50), 'the forwards misread would be 5000 (the trap)').toBe(5000)
    expect(credit, 'and the credit is not that trap').not.toBe(5000)
  })

  it('a P2 death credits P2, and a second death books another 50 and another life', async () => {
    const g = await loadGameExtra()
    let s = g.bookDeath([ledger(), ledger()], 2)
    expect([s[1].lives, s[1].score], 'P2 books its own death').toEqual([NSHIP - 1, DEATH_POINTS])
    expect(s[0].lives, "P1 untouched by P2's death").toBe(NSHIP)
    s = g.bookDeath(s, 2)
    expect([s[1].lives, s[1].score], 'a second P2 death: two lives spent, two 50s banked').toEqual([
      NSHIP - 2,
      2 * DEATH_POINTS,
    ])
  })

  it('does not mutate its argument ledgers (pure)', async () => {
    const g = await loadGameExtra()
    const l = ledger()
    const before = JSON.stringify(l)
    g.bookDeath([l], 1)
    expect(JSON.stringify(l), 'bookDeath never mutates the input ledger').toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 INTEGRATION — a REAL mount death through stepGame's full wiring.
// The isolated bookDeath tests pin the mechanic; this drives demo.ts's collisionPass
// (a player loses a joust → its process is REMOVED, never respawned) and proves
// stepGame detects that removal and books BOTH the life-loss and the 50. Under SEED
// 0x1234 with the players driven apart, P1 loses a joust and dies (jt9-43 RE-BASELINE:
// at frame 227, not 49 — screen-precise collision lets P1 survive and score kills first),
// so the death frame ADDS exactly 50 on top of whatever P1 had banked.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 integration — a real sim death books the life-loss + the 50 through stepGame', () => {
  // A live P1 process in the wrapped sim (GameState.sim is a DemoState → .sim.processes).
  const hasP1 = (game: { sim: { sim: { processes: readonly { kind: string; id: number }[] } } }): boolean =>
    game.sim.sim.processes.some((p) => p.kind === 'player' && p.id === 1)

  it("P1's mount death drops P1 one man and credits exactly 50 — P2's ledger untouched by it", async () => {
    const g = await loadGameExtra()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    let game = g.createGame(SEED)
    let prev = game
    let deathFrame = -1
    for (let f = 1; f <= 400; f++) {
      const next = g.stepGame(game, input)
      // The sim removed P1's process THIS frame → a mount death was booked.
      if (hasP1(game) && !hasP1(next)) {
        deathFrame = f
        prev = game
        game = next
        break
      }
      game = next
    }
    expect(deathFrame, 'P1 must actually lose a joust in the window — the test is not dead').toBeGreaterThan(0)

    // The life-loss (kills "stepGame credits the 50 but forgets the life").
    expect(prev.players[0].lives, 'P1 was at full men the frame before').toBe(NSHIP)
    expect(game.players[0].lives, 'P1 lost exactly one man to the mount death').toBe(NSHIP - 1)
    // The 50 credit (kills "stepGame drops the life but forgets the 50"). jt9-43 RE-BASELINE:
    // P1 now scores kills before dying (death at frame 227, not 49), so the death frame is the
    // DELTA — exactly 50 on top of whatever P1 had banked, no longer the whole score.
    expect(game.players[0].score - prev.players[0].score, 'the death frame credits the 50-for-dying').toBe(DEATH_POINTS)
    // P2 is the control — a P1 death is P1's alone (kills "death decrements a shared/global count").
    // jt9-43: P2 is now also active (it has died and scored earlier), so the invariant tightens to
    // "P1's death frame moves ONLY P1's ledger" — P2's lives and score are UNCHANGED across it.
    expect(game.players[1].lives, "P2's life count untouched by P1's death").toBe(prev.players[1].lives)
    expect(game.players[1].score, "and P2's score untouched by P1's death").toBe(prev.players[1].score)

    // The death books EXACTLY once — the "was-live-last-frame" guard stops per-frame re-booking
    // (dropping it would re-book every subsequent frame, bleeding lives away). Neither the life
    // count nor the score moves again over the next 60 frames.
    const deathLives = game.players[0].lives
    const deathScore = game.players[0].score
    let after = game
    for (let i = 0; i < 60; i++) after = g.stepGame(after, input)
    expect(after.players[0].lives, 'the death books once — no per-frame re-booking').toBe(deathLives)
    expect(after.players[0].score, 'and the 50 is credited once, not every frame').toBe(deathScore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — determinism: a seeded run replays bit-for-bit, and a run crossing TWO
// extra-man thresholds replays bit-for-bit (with the awards actually happening).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 determinism — seeded replay is bit-for-bit, extra men included', () => {
  it('a seeded stepGame run (through a real mount death) replays bit-identical', async () => {
    const g = await loadGameExtra()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    const run = () => {
      let game = g.createGame(SEED)
      // jt9-43 RE-BASELINE: 120 -> 240. Screen-precise collision pushed P1's death
      // from frame 49 to 227; the window must reach it for the non-vacuity pin.
      for (let i = 0; i < 240; i++) game = g.stepGame(game, input)
      return game
    }
    const a = run()
    const b = run()
    // Non-vacuous: the window contains P1's death, so a life was actually spent.
    expect(a.players[0].lives, 'the run is non-vacuous — a mount death was booked').toBe(NSHIP - 1)
    expect(a.players, 'per-player ledgers (lives + score + threshold) replay bit-for-bit').toEqual(b.players)
    expect(a.sim, 'and the wrapped sim is deterministic too').toEqual(b.sim)
  })

  it('a scripted run crossing TWO extra-man thresholds replays bit-for-bit', async () => {
    const g = await loadGameExtra()
    // Natural play accrues ~500–1500 per kill, so reaching 40,000 in a unit-test window
    // is impractical; the threshold-crossing determinism is proven by a fixed, deterministic
    // credit script over createGame's real ledgers (logged as a TEA test-strategy deviation).
    const script: GameScoreEvent[][] = [
      [scoreEvent(15_000, 1)],
      [scoreEvent(10_000, 1)], // → 25,000: first man (re-arm to 40,000)
      [scoreEvent(20_000, 1)], // → 45,000: second man (re-arm to 60,000)
    ]
    const run = () => {
      let players = g.createGame(SEED).players
      for (const frame of script) players = g.creditScoreEvents(players, frame)
      return players
    }
    const a = run()
    const b = run()
    expect(a[0].lives, 'the run is non-vacuous — two extra men were actually awarded').toBe(NSHIP + 2)
    expect(a, 'crossing two thresholds replays bit-for-bit (lives + score + re-armed threshold)').toEqual(b)
  })
})
