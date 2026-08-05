// tests/demo-td1-12.test.ts
//
// Story td1-12 — RED phase (Leeloo / TEA). The joust wave counter is BCD but every
// ADVANCE-BLOCK consumer reads it as a 1-based decimal wave. `demo.wave` is advanced
// by `nextWaveBcd` (demo.ts:1974, LDA WAVBCD / ADDA #$01 / DAA, JOUSTRV4.SRC:2001-2004),
// so it is a BCD-PACKED byte — 1..9 then 0x10, 0x11 … 0x99, 0x00 — while `waveRowAt`,
// `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable` and `seedWaveBudget`
// (demo.ts, the advance block) and `resolveWaveType` (game.ts:373) all document their
// argument as a 1-based DECIMAL wave. BCD and decimal AGREE for waves 1-9 and diverge
// forever after, so nothing is visibly wrong until the TENTH wave.
//
// ─── THE RULED FIX — OPTION (B), per the user's setup decision ────────────────
// Hold a DECIMAL, monotone wave in `DemoState.wave` (the ROM's PWAVE table pointer,
// walked by LDX PWAVE,U / … / LDX #WTBRST, :2011-2019 — monotone, and NEVER a BCD
// counter), and derive the WAVBCD byte only where the ROM's byte semantics matter:
// the display (WAVEN3 formats WAVBCD for OUTBCD, :2399-2403) and the 0x99 wrap.
// WAVBCD has exactly FOUR references in the whole 1982 source and indexes NOTHING;
// modelling it as the game's wave number is the bug this story ends.
//
// ─── WHAT IS RED HERE, AND WHY IT IS NOT VACUOUS ─────────────────────────────
// Every test below DRIVES the cabinet through its own real `stepDemo`/`stepGame`
// advance — never a hand-written `wave:` literal, the exact trap that let uf1-2's
// round 1 ship. The driving is REGIME-NEUTRAL: it counts wave ADVANCES (clear the
// board, step, the wave increments once), so `advance(d) × 9` puts the cabinet on
// its tenth wave whether the counter underneath is BCD or decimal. The ASSERTION is
// what discriminates — the tenth wave's ORDINAL is 10, and its complement is wave
// 10's, not the byte 0x10 read as decimal 16. Against the current tree these fail;
// after Option (B) they pass. Waves 1-9 are the untouched control (BCD ≡ decimal).
//
// ─── COORDINATION WITH uf1-2's SUITE ─────────────────────────────────────────
// `tests/difficulty-wiring.test.ts` R2-1..R2-3 pin the DIFFICULTY hop (demo.ts:1792,
// `decimalWaveFromBcd(demo.wave)`) and deliberately stage so the wave NEVER advances
// (an enemy is always present), so they exercise none of the advance-block consumers
// this story owns — and no probe here can accidentally demand uf1-2's fix, nor vice
// versa. Under Option (B) that whole suite's `wave: <BCD counter>` staging becomes
// the wrong unit and Dev must re-seat it during GREEN (the "broad re-seat" the story
// flags); its R2-3 rollover pins are expected to fail and be rewritten to the new
// monotone contract. That re-seat is Dev's, not this file's.

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoState, type DemoProcess } from './helpers/demo-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import { loadGameFull, type GameState } from './helpers/game-contract.js'

const SEED = 0x1234_5678

// ─── Regime-neutral driving ──────────────────────────────────────────────────

const players = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'player')
const enemies = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const eggs = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')

/**
 * Advance the cabinet by EXACTLY ONE wave, without asserting anything about the
 * counter's units. A wave clears only with no enemies, no eggs, and a player present
 * (demo.ts:1969-1972), so stripping the board to its knights makes the very next
 * `stepDemo` take the advance branch. Counting these calls is the regime-neutral
 * odometer: N advances from the wave-1 seed ⇒ the cabinet is on its (N+1)th wave,
 * BCD or decimal. Throws if the advance did not happen — a silent non-advance would
 * make every downstream ordinal wrong and the test vacuously green.
 */
const advance = (
  demo: Awaited<ReturnType<typeof loadDemo>>,
  d: DemoState,
): DemoState => {
  let s: DemoState = { ...d, sim: { ...d.sim, processes: players(d) } }
  const before = s.wave
  for (let i = 0; i < 6 && s.wave === before; i++) s = demo.stepDemo(s)
  if (s.wave === before) throw new Error('the cleared wave did not advance — staging is wrong')
  return s
}

/** The demo the cabinet reaches on its Nth wave, driven through its own advance. */
const demoAtNthWave = (demo: Awaited<ReturnType<typeof loadDemo>>, n: number): DemoState => {
  let d = demo.createWaveDemo(SEED) // seeds wave 1 (demo.ts createWaveDemo)
  for (let i = 1; i < n; i++) d = advance(demo, d)
  return d
}

/**
 * The game-layer twin of `advance`, so the overlay readout is driven, not hand-set.
 * `GameState.sim` is a DemoState, so the board lives two levels down at
 * `g.sim.sim.processes`; clear it there and stepGame delegates the advance to stepDemo.
 */
const advanceGame = (
  game: Awaited<ReturnType<typeof loadGameFull>>,
  g: GameState,
): GameState => {
  let s: GameState = {
    ...g,
    sim: { ...g.sim, sim: { ...g.sim.sim, processes: players(g.sim) } },
  }
  const before = s.sim.wave
  for (let i = 0; i < 6 && s.sim.wave === before; i++) s = game.stepGame(s)
  if (s.sim.wave === before) throw new Error('the cleared wave did not advance (game layer)')
  return s
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — demo.wave is a DECIMAL, monotone wave, and the advance-block consumers
//        read the wave the CABINET is on, not its BCD byte read as decimal.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the wave the advance block reads is the wave the cabinet is on', () => {
  it('holds the tenth wave as 10, not its BCD byte 0x10 (= 16)', async () => {
    const demo = await loadDemo()
    // Nine advances from the wave-1 seed. Waves 1-9 are BCD ≡ decimal, so the drive
    // itself is identical under either regime; only the LANDING differs — the ROM's
    // DAA takes 0x09 → 0x10, and 0x10 read as a plain number is 16.
    const tenth = demoAtNthWave(demo, 10)
    expect(tenth.wave, 'the tenth wave is ordinal 10, not the packed byte 0x10 = 16').toBe(10)
  })

  it("materialises the tenth wave's OWN complement — wave 10's eggs, not wave 16's ground enemies", async () => {
    const demo = await loadDemo()
    const w = await loadWave()

    // Discriminability, asserted before the behaviour so a future table edit that
    // collapses the two rows fails HERE, loudly, instead of going vacuously green.
    // The tenth wave and wave 16 are DIFFERENT WAVE TYPES, which is the sharpest
    // possible discriminator: wave 10's status 0x08 is an EGG wave (waveTypeIndex
    // (0x08) = 4 → 'egg', wave.ts), so its complement enters as settled EGGS and NO
    // ground enemies; wave 16's status 0x00 is a NOP/ground wave, so it enters ground
    // enemies (five hunters, one lord) and NO eggs. (The story's "8 bounders" was the
    // wave-10 ROW's bounder count — but an egg wave never materialises that row's
    // ground nibble as buzzards, so the observable complement is eggs. Corrected in
    // GREEN; see the session's Design Deviations.)
    const row10 = w.waveRowAt(10)
    const row16 = w.waveRowAt(16)
    expect(w.rawWaveType(row10.status), 'the tenth wave is an EGG wave').toBe('egg')
    expect(w.rawWaveType(row16.status), 'wave 16 is not an egg wave').not.toBe('egg')

    // The complement that entered on the advance INTO the tenth wave. Under Option (B)
    // the advance block calls spawnWaveEnemies(10) → the twelve-egg EGG-wave complement
    // (six per ledge + six scattered, JOUSTRV4.SRC:2778-2822) and zero ground enemies;
    // against the current tree it calls spawnWaveEnemies(0x10 = 16) → wave 16's six
    // ground enemies and zero eggs. Eggs-vs-enemies is the cleanest discriminator.
    const tenth = demoAtNthWave(demo, 10)
    expect(eggs(tenth).length, "the tenth wave's twelve eggs enter (its EGG-wave complement)").toBe(
      12,
    )
    expect(
      enemies(tenth).length,
      'and NO ground enemies — the current tree would enter wave 16’s six here',
    ).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the dev overlay shows the wave the cabinet is on. game.ts:688 returns the
//        raw counter and main.ts:135 prints `WAVE ${wave}`, so today the tenth wave
//        reads "WAVE 16". Driven through stepGame, never a hand-set field.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the dev-overlay wave readout', () => {
  it('reads "WAVE 10" on the tenth wave, not "WAVE 16"', async () => {
    const game = await loadGameFull()

    let g = game.createGame(SEED) // wave 1
    for (let i = 1; i < 10; i++) g = advanceGame(game, g)

    const readout = game.overlayReadout(g)
    expect(readout.wave, 'the overlay projects the ordinal wave, not the packed counter').toBe(10)
    // main.ts:135 renders `WAVE ${readout.wave}` verbatim — pin the string the player
    // would actually see, so "16" cannot slip through as a stringified number.
    expect(`WAVE ${readout.wave}`, 'the rendered dev-bar line').toBe('WAVE 10')
    expect(`WAVE ${readout.wave}`, 'and NOT the 0x10-read-as-16 misprint').not.toBe('WAVE 16')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — a MONOTONE counter: no once-per-hundred-waves difficulty reset, and no
//        death at the hundredth wave. The current BCD counter rolls 0x99 → 0x00 at
//        the hundredth wave, so (a) wave 101's byte is 0x01, indistinguishable from
//        wave 1 — the whole difficulty climb collapses and re-climbs — and (b) the
//        advance block reaches waveRowAt(0x00), which throws "no wave 0" mid-frame.
//        (b) is the same "cabinet must not die" law difficulty-wiring.test.ts R2-3
//        pins by STAGING 0x00; here it is reached through the ADVANCE the story owns.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — the counter is monotone, so it neither resets nor dies at wave 100', () => {
  it('reaches the 101st wave as 101 — never rolling back to wave 1', async () => {
    const demo = await loadDemo()

    // One hundred advances from the wave-1 seed. Against the current tree this cannot
    // even ARRIVE: the 99→100 advance sets the counter to 0x00 and waveRowAt(0) throws,
    // so this line raises before the assertion — still RED, and RED for the crash the
    // fix removes. Under Option (B) the wave climbs 1..101 monotonically and the table
    // loops at 81 (WAVE_LOOP_START, wave.ts:171) with no counter reset at all.
    const wave101 = demoAtNthWave(demo, 101)
    expect(wave101.wave, 'the 101st wave is 101, not wave 1 read off a rolled-over 0x01').toBe(101)
  })

  it('plays the 101st wave differently from the first — the difficulty does not reset', async () => {
    const demo = await loadDemo()
    const w = await loadWave()

    // The mechanism, stated as an invariant the fix must satisfy: a monotone wave sends
    // a DIFFERENT ordinal into the row lookup on the 101st wave than on the first, where
    // the rolled BCD byte (0x01) sent the SAME one. The table loops at 81, so wave 101
    // resolves to wave 81's row (offset (101-81) % 10 = 0) — a plateau row, not wave 1's.
    expect(w.waveRowAt(101), 'wave 101 loops to the wave-81 plateau row, not wave 1').not.toEqual(
      w.waveRowAt(1),
    )

    const first = demo.createWaveDemo(SEED)
    const wave101 = demoAtNthWave(demo, 101)
    expect(wave101.wave, 'the 101st wave must not read as the first').not.toBe(first.wave)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the uf1-2 TRIPWIRE. stepDemo already decodes demo.wave through
//        `decimalWaveFromBcd(demo.wave)` (demo.ts:1792), which THROWS on a byte that
//        is not valid BCD. The tenth decimal wave, 10, is 0x0A — not valid BCD — so
//        the moment `demo.wave` becomes decimal that call site MUST change in the same
//        edit or the game dies at the tenth wave. This test drives PAST the tenth wave
//        and reads the ordinal, so a decimal field with an unfixed :1792 throws here.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — the tripwire: a decimal counter must not die at the decode seam', () => {
  it('steps through the tenth wave and on to the twelfth without throwing, reading 12', async () => {
    const demo = await loadDemo()
    // Eleven advances → the twelfth wave. Against the current tree the ordinal is the
    // byte 0x12 read as decimal 18 (RED). Under a CORRECT Option (B) the decode seam at
    // demo.ts:1792 has been updated alongside the field and this reaches 12 cleanly;
    // under a PARTIAL fix (field made decimal, :1792 left decoding) the drive throws at
    // the tenth wave — which is exactly the failure this guard exists to force.
    const twelfth = demoAtNthWave(demo, 12)
    expect(twelfth.wave, 'the twelfth wave is 12, not the byte 0x12 read as 18').toBe(12)

    // And it keeps running — one more step past the twelfth wave must not throw.
    expect(() => demo.stepDemo(twelfth), 'the cabinet keeps stepping past the tenth wave').not.toThrow()
  })
})
