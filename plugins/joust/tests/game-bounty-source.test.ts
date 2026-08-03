// tests/game-bounty-source.test.ts
//
// Story jt4-3 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/game-bounty.test.ts. The behaviour suite encodes the bounty +
// polarity laws; this one RE-DERIVES their constants straight out of the vendored 1982
// source with the INDEPENDENT reader (tests/helpers/joust-source.ts — nothing under
// src/ may import it: the jt1-3 double-entry), and pins the JT43-* claims.
//
// ─── THE FACTS, RE-DERIVED ───────────────────────────────────────────────────
//   • The WJSRTB egg + gladiator entries — `FDB WGLAD` / `FDB WAVEGG`
//     (JOUSTRV4.SRC:2589-2590) — the two routines this story makes live.
//   • The 3,000 bounty — `LDA #$30 / JSR SCRHUN` (co-op :2651-2652, gladiator
//     :4697-4698); through the SAME jt4-1 routine decodeDvalue('SCRHUN',$30) = 3000.
//   • THE POLARITY TRAP — co-op `CLR PLYG1/2` = 0 (:2634-2635) vs gladiator
//     `LDA #-1 / STA PLYG1/2` = −1 (:2703-2705): the same two bytes, inverted.
//   • The survival DEATHLESS gate — `LDA PLYD1 / BNE ENDTS` (:2677-2678).
//   • SPDGLA the partner-kill accrual — `INC ,Y` / `BEQ SPDGLA` (:4685-4687).
//   • PATC11 the boot cleanup — `CLR PLYG1/2` (:6282-6284), with the DISPLACED
//     instruction `JMP EMSGS` preserved ("(OLD INSTRUCTION)", :6284).
//   • The egg wave — `WAVEGG LDX #EGG1` (:2737) + the 2 pre-mature hatchings (:2776).
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// INSIDE an it() body (the tp1-8 collection trap).
//
// ─── THE JT4x CLAIM NAMESPACES ───────────────────────────────────────────────
// jt1-4 owns "JT4-NNN", jt4-1 "JT41-NNN", jt4-2 "JT42-NNN", jt4-3 "JT43-NNN".
// "JT43-001".startsWith("JT4") is TRUE, so coverage here matches the FULL "JT43-"
// prefix — never a bare "JT4".

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, parseStatement } from './helpers/joust-source.js'
import { loadGameBounty } from './helpers/game-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. The local clone was named `covers` rather than
// `claimCovers` — same body, so the call sites below just take the shared name.
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'

// ─── Claims plumbing (the game-extra-source.test.ts pattern) ─────────────────
function jt43Claims(claims: Claim[]): Claim[] {
  return claims.filter((c) => (c.id ?? '').startsWith('JT43-'))
}
// Raw-line reader for INSTRUCTION lines (parseStatement handles only FCB/FDB).
const line = (n: number): string => sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// The WJSRTB egg + gladiator entries — the two routines jt4-3 makes live.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('WJSRTB source — the egg + gladiator entries (JOUSTRV4.SRC:2589-2590)', () => {
  it('the table routes gladiator → WGLAD and egg → WAVEGG', () => {
    const glad = parseStatement(line(2589), 2589)
    expect(glad?.op, 'the gladiator entry is an FDB pointer').toBe('FDB')
    expect(glad?.operands[0], 'gladiator → WGLAD').toBe('WGLAD')
    expect(line(2589), 'the entry is the gladiator set-up').toContain('GLADIATOR SET-UP')
    const egg = parseStatement(line(2590), 2590)
    expect(egg?.op, 'the egg entry is an FDB pointer').toBe('FDB')
    expect(egg?.operands[0], 'egg → WAVEGG').toBe('WAVEGG')
    expect(line(2590), 'the entry is the egg wave set-up').toContain('EGG WAVE SET-UP')
  })

  it('WAVEGG is the egg wave, spawning its complement as eggs (2 pre-mature hatchings)', () => {
    expect(line(2737), 'WAVEGG opens the EGG WAVE').toMatch(/WAVEGG\s+LDX\s+#EGG1/)
    expect(line(2737), 'labelled EGG WAVE').toContain('EGG WAVE')
    expect(line(2776), 'the wave pre-hatches 2 eggs').toMatch(/LDA\s+#2/)
    expect(line(2776), 'NUMBER OF PRE-MATURE EGG HATCHINGS').toContain('NUMBER OF PRE-MATURE EGG HATCHINGS')
  })

  it('the module routes both types (waveTypeBehaviour) — egg spawns, gladiator arms', async () => {
    const g = await loadGameBounty()
    expect(g.waveTypeBehaviour('egg'), 'egg → spawn-eggs').toBe('spawnEggs')
    expect(g.waveTypeBehaviour('gladiator'), 'gladiator → the PvP bounty').toBe('gladiatorBounty')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE POLARITY TRAP — co-op arms 0, gladiator arms −1 (the same two bytes).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('polarity source — PLYG1/2 co-op 0 vs gladiator −1 (JOUSTRV4.SRC:2634-2635 / 2703-2705)', () => {
  it('co-op CLRs PLYG1/2 (resets the player-hit-player counters to 0)', () => {
    expect(line(2634), 'co-op clears PLYG1').toMatch(/CLR\s+PLYG1/)
    expect(line(2634), 'the comment names the RESET of the hit counters').toContain('RESET PLAYER HIT PLAYER COUNTER')
    expect(line(2635), 'co-op clears PLYG2 too').toMatch(/CLR\s+PLYG2/)
  })

  it('gladiator LDA #-1 / STA PLYG1/2 (arms the 1st-encounter award — the INVERSE value)', () => {
    expect(line(2703), 'gladiator loads −1').toMatch(/LDA\s+#-1/)
    expect(line(2703), 'set-up player killing player variables').toContain('SET-UP PLAYER KILLING PLAYER')
    expect(line(2704), 'store into PLYG1').toMatch(/STA\s+PLYG1/)
    expect(line(2704), 'to award score upon 1st encounter').toContain('AWARD SCORE UPON 1ST ENCOUNTER')
    expect(line(2705), 'store into PLYG2 too').toMatch(/STA\s+PLYG2/)
  })

  it('the module arms each polarity to the source-derived value (0 vs −1)', async () => {
    const g = await loadGameBounty()
    expect(g.armWaveGuards('coop'), 'co-op → 0 (the CLR)').toEqual({ plyg1: 0, plyg2: 0 })
    expect(g.armWaveGuards('gladiator'), 'gladiator → −1 (the LDA #-1)').toEqual({ plyg1: -1, plyg2: -1 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE 3,000 BOUNTY — LDA #$30 / JSR SCRHUN, decoded through the jt4-1 routine.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('bounty source — 3,000 via SCRHUN $30 (co-op :2651-2652, gladiator :4697-4698)', () => {
  it('the co-op end-of-wave scoring awards 3,000 via SCRHUN, voided by a partner-kill', () => {
    expect(line(2642), 'WCOSCR reads PLYG1').toMatch(/LDA\s+PLYG1/)
    expect(line(2643), 'ORs PLYG2 — did a player die from one another?').toMatch(/ORA\s+PLYG2/)
    expect(line(2644), 'BEQ → award only when the counters are clean (zero)').toMatch(/BEQ/)
    expect(line(2651), 'the co-op award digit is $30').toMatch(/LDA\s+#\$30/)
    expect(line(2651), '3,000 points').toContain('3,000 POINTS')
    expect(line(2652), 'through SCRHUN (thousands|hundreds)').toMatch(/JSR\s+SCRHUN/)
  })

  it('the gladiator SPDGLA awards 3,000 to the winning gladiator on the 1st encounter', () => {
    expect(line(4685), 'INC ,Y keeps track of player-vs-player kills').toMatch(/INC\s+,Y/)
    expect(line(4685), 'the comment names player-vs-player kills').toContain('PLAYER VS. PLAYER KILLS')
    expect(line(4687), 'BEQ SPDGLA scores the winning player on the gladiator wave').toMatch(/BEQ\s+SPDGLA/)
    expect(line(4691), 'SPDGLA clears the guards — only 1 gladiator in the wave').toMatch(/SPDGLA\s+CLR\s+PLYG1/)
    expect(line(4697), 'the gladiator award digit is $30').toMatch(/LDA\s+#\$30/)
    expect(line(4697), 'score 3,000').toContain('SCORE 3,000')
    expect(line(4698), 'through SCRHUN').toMatch(/JSR\s+SCRHUN/)
  })

  it('the module books each bounty as decodeDvalue(SCRHUN, $30) = 3000 — a jt4-1 pass-through, not a literal', async () => {
    const g = await loadGameBounty()
    expect(g.decodeDvalue('SCRHUN', 0x30), 'SCRHUN $30 = 3 thousands = 3000').toBe(3000)
    // The forwards/backwards trap discrimination carried from jt4-1: SCRTEN $30 is NOT 3000.
    expect(g.decodeDvalue('SCRTEN', 0x30), 'the SCRTEN backwards decode of $30 is 30, not 3000').toBe(30)
    // A clean co-op wave credits exactly that pass-through value (never a fresh 3000).
    const out = g.awardWaveBounty([{ score: 0, scoreBcd: [0, 0, 0], lives: 5, extraManAt: 20_000, out: false }], 'coop', {
      alive: [true, true],
      guards: { plyg1: 0, plyg2: 0 },
      died: [false, false],
    })
    expect(out[0].score, 'the credited bounty equals decodeDvalue(SCRHUN,$30)').toBe(g.decodeDvalue('SCRHUN', 0x30))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE SURVIVAL DEATHLESS GATE + PATC11 boot cleanup.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('survival + PATC11 source (JOUSTRV4.SRC:2677-2678 / 6282-6284)', () => {
  it('the survival bonus is gated on the player NOT dying this wave (LDA PLYD1 / BNE ENDTS)', () => {
    expect(line(2677), 'WSUSCR reads PLYD1 — did player 1 die?').toMatch(/LDA\s+PLYD1/)
    expect(line(2677), 'the comment asks whether the player died').toContain('DID PLAYER 1 DIE')
    expect(line(2678), 'BNE ENDTS → no score if they died').toMatch(/BNE\s+ENDTS/)
    expect(line(2678), 'no score on death').toContain('NO SCORE')
  })

  it('PATC11 clears PLYG1/2 at game start (RESET 3,000 POINT TRIGGER), preserving the displaced JMP EMSGS', () => {
    expect(line(6282), 'PATC11 clears PLYG1').toMatch(/PATC11\s+CLR\s+PLYG1/)
    expect(line(6282), 'the comment names the 3,000-point trigger reset').toContain('RESET 3,000 POINT TRIGGER')
    expect(line(6283), 'and PLYG2').toMatch(/CLR\s+PLYG2/)
    // The RV4 discipline: the patch OVERWROTE a JMP EMSGS, and the source keeps the old
    // instruction as the patch's tail so nothing is lost — jt4-3 preserves it as a ******** comment.
    expect(line(6284), 'the displaced instruction is preserved').toMatch(/JMP\s+EMSGS/)
    expect(line(6284), 'flagged as the OLD INSTRUCTION').toContain('OLD INSTRUCTION')
  })

  it('the module boots the guards cleared (PATC11) — createGame opens at {0,0}', async () => {
    const g = await loadGameBounty()
    expect(g.createGame(0x1234).guards, 'a fresh game boots with the PLYG trigger reset').toEqual({
      plyg1: 0,
      plyg2: 0,
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE SOLO DEGRADE LAWS (jt2-5's, re-confirmed as jt4-3's degrade source).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('degrade source — co-op→survival, gladiator no-op (JOUSTRV4.SRC:2628-2631 / 2697-2700)', () => {
  it('co-op falls to the survival wave when a player is dead', () => {
    expect(line(2628), 'WCOOP checks SPLY2+6 — this message is for two players only').toMatch(/WCOOP\s+LDA\s+SPLY2\+6/)
    expect(line(2629), 'BEQ WAVSUR when player 2 is dead').toMatch(/BEQ\s+WAVSUR/)
    expect(line(2629), 'go to survival wave').toContain('SURVIVAL WAVE')
  })

  it('the gladiator wave no-ops (RTS) when a player is dead', () => {
    expect(line(2697), 'WGLAD is for two players only').toMatch(/WGLAD\s+LDA\s+SPLY1\+6/)
    expect(line(2698), 'BEQ WAVRT2 when player 1 is dead').toMatch(/BEQ\s+WAVRT2/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JT43 claim coverage — runs EVERYWHERE (no vendored tree needed).
// ─────────────────────────────────────────────────────────────────────────────
describe('JT43 claim coverage — the jt4-3 bounty/polarity constants are committed claims', () => {
  it('jt4-3 commits JT43-* claims covering all of its cited source regions', () => {
    const jt43 = jt43Claims(loadClaims())
    expect(jt43.length, 'jt4-3 commits JT43-* claims (docs/rom-study/claims/game-bounty.json)').toBeGreaterThan(0)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2589, 2590), 'a JT43 claim cites the WGLAD/WAVEGG dispatch entries').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2634, 2635), 'a JT43 claim cites the co-op PLYG reset (polarity)').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2642, 2661), 'a JT43 claim cites the co-op 3,000 bounty').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2674, 2693), 'a JT43 claim cites the survival deathless bonus').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2703, 2705), 'a JT43 claim cites the gladiator PLYG arm (polarity)').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 2737, 2776), 'a JT43 claim cites the egg wave (WAVEGG)').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 4691, 4698), 'a JT43 claim cites the SPDGLA partner-kill bounty').toBe(true)
    expect(claimCovers(jt43, 'JOUSTRV4.SRC', 6282, 6284), 'a JT43 claim cites the PATC11 boot cleanup').toBe(true)
  })

  it('every JT43 id is well-formed and globally unique (no collision with JT4-*/JT41-*/JT42-*)', () => {
    const all = loadClaims()
    for (const c of jt43Claims(all)) expect(c.id, 'JT43 ids match JT43-NNN').toMatch(/^JT43-\d+$/)
    const ids = all.map((c) => c.id).filter(Boolean)
    expect(new Set(ids).size, 'all claim ids are globally unique').toBe(ids.length)
  })

  it.skipIf(!vendoredAvailable)('every JT43 claim verbatim actually appears at its cited source line (byte-gate)', () => {
    for (const c of jt43Claims(loadClaims())) {
      if (!c.source?.verbatim) continue
      const actual = sourceLines(c.source.file)[c.source.line - 1] ?? ''
      expect(actual, `${c.id}: verbatim must match ${c.source.file}:${c.source.line}`).toContain(
        c.source.verbatim.trim(),
      )
    }
  })
})
