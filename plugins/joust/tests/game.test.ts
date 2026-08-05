// tests/game.test.ts
//
// Story jt4-1 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for the game-loop
// session layer: src/core/game.ts. The provenance / source re-derivation (SCRHUN
// vs SCRTEN out of the vendored 1982 tree) + the JT41 claim coverage live in the
// companion tests/game-source.test.ts.
//
// Every test loads the module INSIDE its own it() (the collection trap — a
// top-level await import would redden the whole file at collection, not per
// test). RED today: src/core/game.ts does not exist, so loadGame() throws a
// clean "feature absent" per test.
//
// Each test names the mutant it kills — the epic mutation-tests its guards
// (guard-must-be-mutation-tested), so a green that survives a plausible wrong
// fix is not a guard.

import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGame, type PlayerLedger, type GameScoreEvent, type PlayerInput } from './helpers/game-contract.js'
import { loadDemo } from './helpers/demo-contract.js'
import { loadJoust } from './helpers/joust-collision-contract.js'
import { loadPtero } from './helpers/ptero-contract.js'

const SEED = 0x1234

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(repoRoot, 'src', 'core')

// A ledger literal for the pure-drain tests (Dev's real ledgers may carry more
// fields; the drain must at least advance `score` + `scoreBcd`).
function ledger(score = 0): PlayerLedger {
  return { score, scoreBcd: [0, 0, 0], lives: 5, out: false }
}
function scoreEvent(value: number, player: number, reason: 'kill' | 'egg' = 'kill'): GameScoreEvent {
  return { kind: 'score', value, reason, player }
}

/** A continuous-flap input for one player, facing `dir`. Drives a real joust. */
const flap = (dir: -1 | 0 | 1): PlayerInput => ({ dir, flap: true, flapHeld: true })

/**
 * Step a fresh game with `input` until the sim emits its first score event (a real
 * kill), returning the game AT that frame plus the frame index. Deterministic under
 * the fixed SEED. Fails loudly (frame -1) if no kill fires within `maxFrames`.
 */
async function stepToFirstKill(
  g: Awaited<ReturnType<typeof loadGame>>,
  input: Record<number, PlayerInput>,
  maxFrames = 400,
) {
  let game = g.createGame(SEED)
  for (let f = 1; f <= maxFrames; f++) {
    game = g.stepGame(game, input)
    if (game.sim.events.some((e) => e.kind === 'score')) return { game, frame: f }
  }
  return { game, frame: -1 }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — game.ts exists; stepGame WRAPS stepDemo (one sim, no second path);
//        the per-player registers are drained; the purity scanner sweeps game.ts.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the session layer wraps the sim, one stepping path', () => {
  it('createGame builds two zeroed ledgers over a real createWaveDemo sim', async () => {
    const g = await loadGame()
    const d = await loadDemo()
    const game = g.createGame(SEED)

    expect(game.players.length, 'two knights = two ledgers (the ROM co-op shape)').toBe(2)
    expect(game.players.map((p) => p.score), 'both ledgers open at zero').toEqual([0, 0])
    expect(game.wave, 'the game opens on wave 1').toBe(1)
    // The wrapped sim IS a createWaveDemo DemoState — not a re-implementation.
    expect(game.sim, 'game.sim is a genuine createWaveDemo(seed) — no parallel sim').toEqual(
      d.createWaveDemo(SEED),
    )
  })

  it('stepGame delegates stepping to stepDemo — the produced sim is bit-identical (no second stepping path)', async () => {
    const g = await loadGame()
    const d = await loadDemo()
    const stepped = g.stepGame(g.createGame(SEED))
    // Kills the mutant "game.ts re-implements the frame loop": if stepGame ran its
    // OWN stepper the sim would drift from a raw stepDemo within a frame.
    expect(stepped.sim, 'stepGame(game).sim === stepDemo(createWaveDemo(seed)) — ONE sim').toEqual(
      d.stepDemo(d.createWaveDemo(SEED)),
    )
    expect(stepped.wave, 'the wave mirrors the sim').toBe(stepped.sim.wave)
  })

  it('does not mutate its argument (pure — the jt1-7 discipline)', async () => {
    const g = await loadGame()
    const game = g.createGame(SEED)
    const before = JSON.stringify(game.players)
    g.stepGame(game)
    expect(JSON.stringify(game.players), 'stepGame never mutates the input ledgers').toBe(before)
  })

  it('game.ts lives in src/core/ so the ONE purity scanner sweeps it', async () => {
    // AC-1 requires the purity guard to sweep game.ts. The scanner (purity.test.ts /
    // purity-scanner.test.ts) globs src/core/*.ts, so the load-bearing fact is that
    // game.ts is IN that directory. RED until the file exists.
    await loadGame() // fail cleanly if the module is absent
    expect(readdirSync(coreDir), 'game.ts is a core module — swept by the purity scanner').toContain(
      'game.ts',
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the SCRHUN/SCRTEN decode (the BACKWARDS trap) + the DSCORE byte order.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — SCRHUN forwards, SCRTEN backwards, the register in ROM byte order', () => {
  it('SCRHUN packs thousands|hundreds forwards ($15 → 1500, $10 → 1000)', async () => {
    const g = await loadGame()
    expect(g.decodeDvalue('SCRHUN', 0x15), 'shadow lord: thousands 1, hundreds 5').toBe(1500)
    expect(g.decodeDvalue('SCRHUN', 0x10), 'ptero: thousands 1, hundreds 0 (DERIVED)').toBe(1000)
  })

  it('SCRTEN packs tens|hundreds BACKWARDS ($57 → 750, $05 → 500)', async () => {
    const g = await loadGame()
    // The whole trap: $57 read forwards is 570; the backwards packing (tens = HIGH
    // nibble 5 → 50, hundreds = LOW nibble 7 → 700) makes it 750.
    expect(g.decodeDvalue('SCRTEN', 0x57), 'hunter: tens 5 (=50) + hundreds 7 (=700)').toBe(750)
    expect(g.decodeDvalue('SCRTEN', 0x05), 'bounder: tens 0 + hundreds 5 (=500)').toBe(500)
  })

  it('the backwards packing is REAL — SCRTEN and SCRHUN disagree on the same digit byte', async () => {
    const g = await loadGame()
    // Kills the mutant "SCRTEN is just SCRHUN" (a forwards reader): $57 through the
    // two routines must differ (750 vs 5700), and neither may equal the naive 570.
    expect(g.decodeDvalue('SCRTEN', 0x57)).not.toBe(g.decodeDvalue('SCRHUN', 0x57))
    expect(g.decodeDvalue('SCRTEN', 0x57), 'never the forwards misread 570').not.toBe(570)
  })

  it('scoreToBcd lays the register out MSB-first; a value crossing tens/hundreds lands in ROM byte order', async () => {
    const g = await loadGame()
    // 1250 = 0 (hThou|tThou) / $12 (thousands|hundreds) / $50 (tens|ones).
    expect(g.scoreToBcd(1250), '1250 → [$00,$12,$50] — the DSCORE byte order').toEqual([0x00, 0x12, 0x50])
    // A round thousands value carries into the middle byte, zero low byte.
    expect(g.scoreToBcd(3000), '3000 → [$00,$30,$00]').toEqual([0x00, 0x30, 0x00])
    // Kills the mutant "store the raw integer / little-endian": the low byte is the
    // tens|ones pair, not the whole number.
    expect(g.scoreToBcd(750), '750 → [$00,$07,$50]').toEqual([0x00, 0x07, 0x50])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — two independent ledgers; the derived values are PASS-THROUGH.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — two independent ledgers, provenance flagged pass-through', () => {
  it('a P1 score event moves ONLY ledger 0; a P2 event moves ONLY ledger 1', async () => {
    const g = await loadGame()
    const [l0, l1] = [ledger(), ledger()]

    const afterP1 = g.creditScoreEvents([l0, l1], [scoreEvent(500, 1)])
    expect(afterP1[0].score, 'P1 (player id 1) credits ledger 0').toBe(500)
    expect(afterP1[1].score, 'a P1 kill never moves P2 — the co-op independence').toBe(0)

    const afterP2 = g.creditScoreEvents([l0, l1], [scoreEvent(750, 2)])
    expect(afterP2[1].score, 'P2 (player id 2) credits ledger 1').toBe(750)
    expect(afterP2[0].score, 'and never P1').toBe(0)
  })

  it('same-frame events for both players credit each ledger independently', async () => {
    const g = await loadGame()
    const out = g.creditScoreEvents([ledger(), ledger()], [scoreEvent(500, 1), scoreEvent(1000, 2)])
    expect(out.map((p) => p.score), 'each player banks only their own kills').toEqual([500, 1000])
  })

  it('a credited ledger advances its scoreBcd in ROM byte order too', async () => {
    const g = await loadGame()
    const out = g.creditScoreEvents([ledger(), ledger()], [scoreEvent(1250, 1)])
    expect(out[0].scoreBcd, 'the BCD view tracks the numeric total').toEqual(g.scoreToBcd(1250))
  })

  it('the derived rungs are PASS-THROUGH — decodeDvalue agrees with the already-gated values, not a fresh literal', async () => {
    const g = await loadGame()
    const j = await loadJoust()
    const p = await loadPtero()
    // Provenance flag: game.ts must not re-invent the ladder. Its decode must equal
    // the values jt2/jt3 already transcribed + gated (killScore, PTERO_SCORE).
    expect(g.decodeDvalue('SCRTEN', 0x05), 'bounder pass-through').toBe(j.killScore('bounder'))
    expect(g.decodeDvalue('SCRTEN', 0x57), 'hunter pass-through').toBe(j.killScore('hunter'))
    expect(g.decodeDvalue('SCRHUN', 0x15), 'shadow lord pass-through').toBe(j.killScore('shadowLord'))
    expect(g.decodeDvalue('SCRHUN', 0x10), 'ptero pass-through (DERIVED 1000)').toBe(p.PTERO_SCORE)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — determinism (seeded replay bit-for-bit) + no phantom score.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — determinism and an honest drain', () => {
  it('two seeded runs of N frames produce bit-identical ledgers AND sim — with a real kill in the window', async () => {
    const g = await loadGame()
    // Drive P2 into a joust so the run ACCUMULATES score (P2 kills a bounder ~frame
    // 145 at this seed) — otherwise the ledger comparison is a vacuous [0,0]==[0,0]
    // and score-accumulation determinism goes untested (Reviewer finding, jt4-1).
    const input: Record<number, PlayerInput> = { 2: flap(-1) }
    const run = () => {
      let game = g.createGame(SEED)
      for (let i = 0; i < 200; i++) game = g.stepGame(game, input)
      return game
    }
    const a = run()
    const b = run()
    expect(
      a.players.some((p) => p.score > 0),
      'the determinism check is non-vacuous — a real kill accumulated score in the window',
    ).toBe(true)
    expect(a.players, 'per-player score replays bit-for-bit under a fixed seed').toEqual(b.players)
    expect(a.sim, 'and the wrapped sim is deterministic too').toEqual(b.sim)
  })

  it('no phantom score: an opening run with no kills leaves both ledgers at zero while the sim logs beats', async () => {
    const g = await loadGame()
    let game = g.createGame(SEED)
    // Wave 1 opens with the enemies still materialising (jt2-6) — no joust resolves
    // in the first handful of frames, but the sim's event log carries 'beat' events.
    for (let i = 0; i < 5; i++) game = g.stepGame(game)
    expect(game.players.map((p) => p.score), 'the drain ignores non-score events; it does not hallucinate').toEqual([0, 0])
    expect(game.sim.events.length, 'guard is not vacuous — the sim log is non-empty (beats present)').toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-3/AC-4 INTEGRATION — a REAL kill through stepGame's full wiring.
// The pure creditScoreEvents tests above pin the drain in isolation; these drive
// demo.ts's collisionPass -> winner.id attribution -> stepGame's event-diff ->
// creditScoreEvents end-to-end. Each mutation-KILLS a specific bug the isolated
// tests missed (Reviewer REJECT, jt4-1): hardcoding player=P1, dropping the
// dedupe, and disconnecting the drain all leave the isolated suite green.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 integration — a real kill through stepGame credits the right ledger', () => {
  it('a P2 kill credits ONLY ledger 1, once, through the full wiring (kills hardcode-P1 / dedupe-drop / drain-disconnect)', async () => {
    const g = await loadGame()
    // P2 flies left into a bounder and kills it (~frame 145 at SEED 0x1234); P1 idle.
    const input: Record<number, PlayerInput> = { 2: flap(-1) }
    const { game, frame } = await stepToFirstKill(g, input)

    expect(frame, 'a real kill must fire through the sim — the test is not dead').toBeGreaterThan(0)
    const kill = game.sim.events.find((e) => e.kind === 'score') as GameScoreEvent | undefined
    expect(kill?.player, 'the sim attributes the kill to P2 (player id 2)').toBe(2)
    // Disconnecting creditScoreEvents (mutation 3) leaves this 0; hardcoding player=P1
    // (mutation 1) credits ledger 0 instead — both fail here.
    expect(game.players[1].score, 'P2 (ledger 1) banked exactly the DVALUE, via the real wiring').toBe(kill!.value)
    expect(game.players[0].score, 'P1 (ledger 0) was untouched — co-op independence, end-to-end').toBe(0)

    // Step well past the kill: the ledger must not move again. Dropping the
    // `!prior.has(e)` dedupe (mutation 2) re-credits the retained event every frame,
    // inflating the score — this pins it to exactly one credit.
    //
    // jt8-4 RE-SEAT: the kill leaves an EGG at the victim's position (resolveContacts
    // → spawnEgg) and P2, still flying left into that spot, now COLLECTS it on the
    // very next frame — f145 kill (500), f146 egg (250 ladder + 500 mid-air) at this
    // seed. That is authentic play, not a leak: the +500 air-catch bonus (:3063-3069)
    // exists precisely for the egg you take straight off a kill. So this window can no
    // longer be baselined AT the kill frame. Re-baselined two frames later, AFTER the
    // egg credit settles, which preserves this test's actual intent (the dedupe) with
    // its original exact-equality strength: a dropped dedupe re-credits every one of
    // the 60 frames and blows past `settled` regardless of where we baseline.
    // Deliberately NEUTRAL: this re-baseline is green both before and after jt8-4
    // (it only stops asserting that no OTHER award may land in the window). The
    // positive claim — that the egg off the kill really is credited end-to-end — is
    // pinned in tests/demo-jt8-4.test.ts, which owns it.
    let after = game
    for (let i = 0; i < 2; i++) after = g.stepGame(after, input)
    const settled = after.players[1].score
    for (let i = 0; i < 60; i++) after = g.stepGame(after, input)
    expect(after.players[1].score, 'every award credits EXACTLY once — no re-credit from the rolling log').toBe(settled)
    // jt8-1: enemies now HUNT (the target-aggro wiring), so an idle P1 can be caught
    // by a now-hunting enemy within this window and bank its OWN 50-for-dying — a P1
    // event, never P2's kill. Co-op independence still holds end-to-end: P1's ledger
    // never receives P2's DVALUE, and its ONLY legit score here is its own death
    // credit(s), which are 50-for-dying (SCRTEN=$50). So P1's score must be a MULTIPLE
    // of 50 (tighter than the old bare `< kill.value`, which allowed a stray 137). The
    // kill-frame `toBe(0)` (above) is what kills hardcode-P1; these two assertions together
    // pin BOTH the shape (÷50) AND the magnitude — a round-2 reviewer finding: `% 50` alone
    // can't catch a leak of P2's kill DVALUE (itself ÷50), so we ALSO bound it below kill.value.
    expect(after.players[0].score % 50, "P1's only score is its own 50-for-dying death credit(s)").toBe(0)
    expect(after.players[0].score, "and never a leak of P2's kill DVALUE onto P1's ledger").toBeLessThan(kill!.value)
  })

  it('a P2 kill credits ONLY ledger 1 (the mirror — attribution is not stuck on one ledger)', async () => {
    const g = await loadGame()
    // Both flap toward centre. jt9-43 RE-BASELINE: screen-precise collision flips the early
    // jousts — P2 now takes the bounder kills (first ~frame 315 at SEED 0x1234) and P1 books
    // only its own death credit. The mirror is unchanged in intent: a kill credits the KILLER's
    // ledger (here ledger 1), never the other. Detect the kill as a >=500 jump (a bounder), not
    // the 50-for-dying death credit P2 also books.
    const input: Record<number, PlayerInput> = { 1: flap(1), 2: flap(-1) }
    let game = g.createGame(SEED)
    let killed = false
    let prevP2 = 0
    for (let f = 1; f <= 400 && !killed; f++) {
      game = g.stepGame(game, input)
      if (game.players[1].score - prevP2 >= 500) killed = true
      prevP2 = game.players[1].score
    }
    expect(killed, 'P2 scored a real kill through the wiring').toBe(true)
    expect(game.players[1].score, 'P2 (ledger 1) banked a bounder').toBeGreaterThanOrEqual(500)
    // The mirror this test exists to guard: P1's ledger (ledger 0) NEVER receives P2's 500-point
    // bounder. P1 carries at most its OWN death credit(s) — a multiple of the 50-for-dying — and
    // never the 500 (at the kill frame P1 has not yet died, so this is 0; the property holds
    // either way and is robust to respawn timing).
    expect(game.players[0].score % 50, "P1's ledger carries only its own death credit(s)").toBe(0)
    expect(game.players[0].score, "and NEVER a leak of P2's 500-point bounder kill").not.toBe(500)
  })
})
