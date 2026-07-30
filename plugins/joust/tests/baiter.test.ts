// tests/baiter.test.ts
//
// Story jt3-5 — RED phase (Leeloo / TEA). The BEHAVIOUR of the baiter: the BAITBL
// send-off schedule with its V4 15s→1s collapse and the 3-live cap (AC-1), the six
// PCHASE-gated RV4 patches proven BOTH WAYS — a PCHASE=−1 baiter shows the patched
// behaviour, a PCHASE=0 plain ptero does NOT (AC-2), and a seeded stall that fires
// baiters replaying bit-for-bit with no argument mutation (AC-4). The source
// re-derivation, the seam against jt2-2 (AC-3), and the claim coverage live in the
// companion tests/baiter-source.test.ts.
//
// ─── MUTATION-RESISTANCE (the jt1-4 / jt3-4 lesson, applied) ─────────────────
// The gate is pinned BOTH WAYS for every patch: baiter(−1) ≠ plain(0) on an input
// where the patch actually changes something, so a mutant that DROPS the gate (applies
// the patch unconditionally) reddens the plain-ptero case, and a mutant that INVERTS
// it reddens the baiter case. The schedule is pinned at its exact nap-tick values so a
// Dev who mis-transcribes an entry (or the /8) reddens. The cap is pinned at the 3rd
// baiter (2 more allowed, the 4th refused) so an off-by-one on `#3-1` reddens.

import { describe, it, expect } from 'vitest'
import { loadBaiter, type BaiterClock, type BaiterModule } from './helpers/baiter-contract.js'

const PLAIN = 0 // a plain wave-type ptero (jt3-4) — the gate must NOT fire
const BAITER = -1 // PCHASE = −1 — the gate MUST fire

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE BAITBL SCHEDULE (SECONDS*60/8), the V4 15s→1s collapse, the 3-live cap,
//        the PCHASE=−1 tag.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — baiters are PCHASE=−1 pteros on the BAITBL SECONDS*60/8 schedule, capped at 3', () => {
  it('the PCHASE tag is −1 and the cap is 3 (JOUSTRV4.SRC:2108-2113)', async () => {
    const b = await loadBaiter()
    expect(b.BAITER_PCHASE, "PCHASE = −1 (BAITER TYPE PTERODACTYL'S)").toBe(-1)
    expect(b.MAX_BAITERS, 'ONLY ALLOW 3 BAITERS ON THE SCREEN').toBe(3)
  })

  it('napTicks re-derives SECONDS*60/8 (display rate 60, /8 = the PCNAP nap length), integer-truncated', async () => {
    const b = await loadBaiter()
    expect(b.DISPLAY_RATE_HZ, 'the literal uses the 60 Hz display field rate, not a calc rate').toBe(60)
    expect(b.NAP_FRAMES, 'the /8 is the EMYOK PCNAP 8 nap length').toBe(8)
    // 1*60/8 = 60/8 = 7 (integer truncation), 3*60/8 = 22, 15*60/8 = 112, 60*60/8 = 450.
    expect(b.napTicks(1), '1*60/8 truncates to 7 nap-ticks').toBe(7)
    expect(b.napTicks(3)).toBe(22)
    expect(b.napTicks(5)).toBe(37)
    expect(b.napTicks(7)).toBe(52)
    expect(b.napTicks(15), '15*60/8 = 112 nap-ticks').toBe(112)
    expect(b.napTicks(30)).toBe(225)
    expect(b.napTicks(45)).toBe(337)
    expect(b.napTicks(60)).toBe(450)
    // A nap-tick is 8 display frames, so napTicks(s)*8 = s*60 = s seconds at 60 Hz.
    expect(b.napTicks(15) * b.NAP_FRAMES, '15 s = 112 ticks × 8 = 896 frames').toBe(896)
  })

  it('the V4 live schedule is [1×6, 3, 5, 7, 15, 15, 30, 45, 60] seconds (JOUSTRV4.SRC:2150-2163)', async () => {
    const b = await loadBaiter()
    expect(b.BAITBL_SECONDS_V4).toEqual([1, 1, 1, 1, 1, 1, 3, 5, 7, 15, 15, 30, 45, 60])
    expect(b.BAITBL_SECONDS_V4.length, 'fourteen entries').toBe(14)
    // The reload table is the SECONDS run through napTicks.
    expect(b.BAITBL_V4).toEqual(b.BAITBL_SECONDS_V4.map((s) => b.napTicks(s)))
    expect(b.BAITBL_V4[0], 'index 0 is the fiercest 1-second send-off (7 ticks)').toBe(7)
  })

  it('the RV3 original is [1, 3, 5, 7, 15×7, 30, 45, 60] seconds — preserved as ******** (JOUSTRV4.SRC:2135-2148)', async () => {
    const b = await loadBaiter()
    expect(b.BAITBL_SECONDS_RV3).toEqual([1, 3, 5, 7, 15, 15, 15, 15, 15, 15, 15, 30, 45, 60])
    expect(b.BAITBL_SECONDS_RV3.length, 'also fourteen entries').toBe(14)
  })

  it('THE V4 COLLAPSE: mid-game 15 s → 1 s — the 15 s run shrinks and the 1 s run grows', async () => {
    const b = await loadBaiter()
    const count = (arr: readonly number[], v: number) => arr.filter((x) => x === v).length
    // RV3: one 1-second entry and SEVEN 15-second entries (the long mid-game plateau).
    expect(count(b.BAITBL_SECONDS_RV3, 1), 'RV3 has a single 1 s entry').toBe(1)
    expect(count(b.BAITBL_SECONDS_RV3, 15), 'RV3 plateaus at seven 15 s entries').toBe(7)
    // V4: SIX 1-second entries (fierce front-load) and only TWO 15-second entries.
    expect(count(b.BAITBL_SECONDS_V4, 1), 'V4 front-loads six 1 s entries').toBe(6)
    expect(count(b.BAITBL_SECONDS_V4, 15), 'V4 keeps only two 15 s entries').toBe(2)
    // The tail seeds (BWAVN/BWAV2/BWAV1 = 30/45/60) are unchanged by the collapse.
    expect(b.BAITBL_SECONDS_V4.slice(11), 'the wave-N/2/1 seed tail is unchanged').toEqual([30, 45, 60])
    expect(b.BAITBL_SECONDS_RV3.slice(11)).toEqual([30, 45, 60])
  })

  it('the RV3 full walk sums to 256 s = 4:16 — the "OLD TIME 4 MIN 16 SEC" comment reconciles', async () => {
    const b = await loadBaiter()
    const sum = (arr: readonly number[]) => arr.reduce((a, x) => a + x, 0)
    expect(sum(b.BAITBL_SECONDS_RV3), 'RV3 total = 256 s = 4 min 16 s (matches PATCH7)').toBe(256)
    // NB: the V4 full walk is 186 s = 3:06, NOT the comment's "2 MIN 16 SEC" (136 s) —
    // see the Delivery Finding; the TABLE is authoritative, the marketing figure is not.
    expect(sum(b.BAITBL_SECONDS_V4), 'V4 total = 186 s (the shipped table, not the 136 s comment)').toBe(186)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 (cont.) — THE SEND-OFF CLOCK: BAISBL wave seeding + the 3-live cap in motion.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the baiter send-off clock caps at 3 live and walks PBAITN fiercer', () => {
  it('BAISBL start indices are [10, 11, 12] and pick the wave-N/2/1 column (JOUSTRV4.SRC:2167-2169)', async () => {
    const b = await loadBaiter()
    expect(b.BAISBL, 'wave-N / wave-2 / wave-1 start indices into BAITBL').toEqual([10, 11, 12])
    expect(b.baisblStartIndex(1), 'wave 1 starts slow, at BAISBL[2] = index 12 (45 s)').toBe(12)
    expect(b.baisblStartIndex(2), 'wave 2 at BAISBL[1] = index 11 (30 s)').toBe(11)
    expect(b.baisblStartIndex(3), 'wave 3+ at BAISBL[0] = index 10 (15 s)').toBe(10)
    expect(b.baisblStartIndex(9), 'every wave past 3 uses the wave-N column').toBe(10)
  })

  it('a wake below CBAIT just counts down (no send-off, PBAITN untouched)', async () => {
    const b = await loadBaiter()
    const clock: BaiterClock = { cbait: 5, nbait: 0, pbaitn: 4 }
    const { clock: next, spawned } = b.stepBaiterClock(clock)
    expect(spawned, 'CBAIT-1 = 4 > 0, not time yet').toBe(false)
    expect(next.cbait, 'CBAIT decremented by one').toBe(4)
    expect(next.pbaitn, 'PBAITN untouched while counting down').toBe(4)
    expect(next.nbait).toBe(0)
  })

  it('when CBAIT expires and room remains: send a baiter, reload from BAITBL[PBAITN], walk PBAITN down', async () => {
    const b = await loadBaiter()
    const clock: BaiterClock = { cbait: 1, nbait: 0, pbaitn: 3 }
    const { clock: next, spawned } = b.stepBaiterClock(clock)
    expect(spawned, 'CBAIT-1 = 0, room on screen → send-off').toBe(true)
    expect(next.nbait, 'one more baiter on screen').toBe(1)
    expect(next.cbait, 'CBAIT reloads from BAITBL[PBAITN=3] = napTicks(7) = 52').toBe(b.BAITBL_V4[3])
    expect(next.pbaitn, 'PBAITN walks DOWN toward 0 (fiercer)').toBe(2)
  })

  it('PBAITN saturates at 0 — the fiercest 1-second rung, never underflowing', async () => {
    const b = await loadBaiter()
    const { clock: next, spawned } = b.stepBaiterClock({ cbait: 1, nbait: 0, pbaitn: 0 })
    expect(spawned).toBe(true)
    expect(next.cbait, 'reloads from BAITBL[0] = 7 ticks (1 s)').toBe(b.BAITBL_V4[0])
    expect(next.pbaitn, 'PBAITN stays at 0 (BEQ skips the DEC)').toBe(0)
  })

  it('THE CAP: the 3rd baiter is allowed but a 4th is REFUSED (CMPA #3-1 / BHI, mutation-resistant)', async () => {
    const b = await loadBaiter()
    // 2 already on screen → the 3rd is allowed (2 is NOT higher than 3-1=2).
    const third = b.stepBaiterClock({ cbait: 1, nbait: 2, pbaitn: 5 })
    expect(third.spawned, '2 on screen: the 3rd send-off is allowed').toBe(true)
    expect(third.clock.nbait).toBe(3)
    // 3 already on screen → refused (3 IS higher than 2), and the send-off stays READY.
    const fourth = b.stepBaiterClock({ cbait: 1, nbait: 3, pbaitn: 5 })
    expect(fourth.spawned, '3 on screen: the 4th is refused — 3 BAITERS ON SCREEN, BUT READY').toBe(false)
    expect(fourth.clock.nbait, 'no 4th baiter').toBe(3)
    expect(fourth.clock.pbaitn, 'PBAITN NOT walked while refused (no send-off happened)').toBe(5)
  })

  it('a refused (capped) clock stays READY — it sends the instant a slot frees', async () => {
    const b = await loadBaiter()
    // Capped and expired: CBAIT is not committed, so the next wake is still ready.
    const capped = b.stepBaiterClock({ cbait: 1, nbait: 3, pbaitn: 5 })
    expect(capped.spawned).toBe(false)
    // A slot frees (nbait drops to 2) and the very next wake sends off.
    const freed = b.stepBaiterClock({ ...capped.clock, nbait: 2 })
    expect(freed.spawned, 'ready-and-waiting: sends the instant room appears').toBe(true)
    expect(freed.clock.nbait).toBe(3)
  })

  it('seedBaiterClock seeds a slow wave-1 (first sleep from BAITBL[startIndex+1]) and no baiters yet', async () => {
    const b = await loadBaiter()
    const c1 = b.seedBaiterClock(1)
    expect(c1.nbait, 'no baiters at wave start').toBe(0)
    expect(c1.pbaitn, 'wave 1 seeds PBAITN = 12').toBe(12)
    expect(c1.cbait, 'initial CBAIT = BAITBL[12+1] = BAITBL[13] = napTicks(60) = 450').toBe(b.BAITBL_V4[13])
    const c3 = b.seedBaiterClock(3)
    expect(c3.pbaitn, 'wave 3+ seeds PBAITN = 10').toBe(10)
    expect(c3.cbait, 'initial CBAIT = BAITBL[10+1] = BAITBL[11] = napTicks(30) = 225').toBe(b.BAITBL_V4[11])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE SIX PCHASE-GATED PATCHES, PROVEN BOTH WAYS. A baiter (PCHASE=−1) shows
//        the patched behaviour; a plain ptero (PCHASE=0) is untouched. (JOUSTRV4.SRC:6296-6360)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the PCHASE gate fires for baiters, is a NO-OP for the plain wave-type ptero', () => {
  it('patchFires is the TST PCHASE,U / BEQ gate — true for −1 (baiter), false for 0 (plain ptero)', async () => {
    const b = await loadBaiter()
    expect(b.patchFires(BAITER), 'PCHASE ≠ 0 → the patch fires (baiter)').toBe(true)
    expect(b.patchFires(PLAIN), 'PCHASE = 0 → BEQ skips the patch (plain ptero)').toBe(false)
    // Tie the tag to the gate: the −1 PCHASE tag is EXACTLY what makes the patches fire.
    expect(b.patchFires(b.BAITER_PCHASE), 'the BAITER_PCHASE tag trips the gate').toBe(true)
  })

  it('PATCH4 aim-lower: baiter lowers the attack window by 2 px; plain ptero unchanged (JOUSTRV4.SRC:6357-6360)', async () => {
    const b = await loadBaiter()
    expect(b.AIM_LOWER_PIXELS).toBe(2)
    expect(b.patchAimLower(BAITER, 8), 'baiter: attack window 8 + 2 = 10').toBe(10)
    expect(b.patchAimLower(PLAIN, 8), 'plain ptero: window unchanged (the gate did not fire)').toBe(8)
    expect(b.patchAimLower(BAITER, 8), 'both-ways divergence').not.toBe(b.patchAimLower(PLAIN, 8))
  })

  it('PATCH5 slow-dive: baiter divides VY by 4 (signed ASR/ROR ×2); plain ptero unchanged (JOUSTRV4.SRC:6344-6351)', async () => {
    const b = await loadBaiter()
    expect(b.patchSlowDive(BAITER, 0x0200), 'baiter: 512 ÷ 4 = 128').toBe(128)
    expect(b.patchSlowDive(BAITER, -0x0400), 'baiter: −1024 ÷ 4 = −256 (arithmetic shift keeps the sign)').toBe(-256)
    expect(b.patchSlowDive(PLAIN, 0x0200), 'plain ptero: VY unchanged').toBe(0x0200)
    expect(b.patchSlowDive(PLAIN, -0x0400), 'plain ptero: VY unchanged').toBe(-0x0400)
  })

  it('PATCH8 first-pass-miss: baiter delays to 1/2-way (138); plain ptero keeps its value (JOUSTRV4.SRC:6304-6311)', async () => {
    const b = await loadBaiter()
    expect(b.FIRST_PASS_DELAY).toBe(138)
    expect(b.patchFirstPassMiss(BAITER, 40), 'baiter: overwritten to 138 (DELAY TILL 1/2 WAY ACROSS)').toBe(138)
    expect(b.patchFirstPassMiss(PLAIN, 40), 'plain ptero: keeps the incoming ppvelx (RESTORE OLD INSTRUCTION)').toBe(40)
  })

  it('PATCH9 seek-timer: baiter decrements PPVELX saturating at 1; plain ptero unchanged (JOUSTRV4.SRC:6296-6302)', async () => {
    const b = await loadBaiter()
    expect(b.patchSeekTimer(BAITER, 5), 'baiter: 5 → 4').toBe(4)
    expect(b.patchSeekTimer(BAITER, 2), 'baiter: 2 → 1').toBe(1)
    expect(b.patchSeekTimer(BAITER, 1), 'baiter: 1 → 1 (BNE fails, INC restores — saturates, never 0)').toBe(1)
    expect(b.patchSeekTimer(PLAIN, 5), 'plain ptero: unchanged').toBe(5)
    expect(b.patchSeekTimer(PLAIN, 1), 'plain ptero: unchanged').toBe(1)
  })

  it('PATCH6 lane-reroute: baiter drops to $88 on the flanks, tracks line 2 mid-band; plain always line 2 (JOUSTRV4.SRC:6323-6338)', async () => {
    const b = await loadBaiter()
    expect(b.LANE_LOWER, '$88 — NEW LINE TO TRACK FOR LOWER CLIFFS').toBe(0x88)
    expect(b.LANE_TRACK2, '$7F — AOFFL2-2, the plain line-2 target').toBe(0x7f)
    // Flank (x ≤ 165): a baiter reroutes to the lower line; a plain ptero stays on line 2.
    expect(b.patchLaneReroute(BAITER, 100), 'baiter on the left flank → $88').toBe(0x88)
    expect(b.patchLaneReroute(PLAIN, 100), 'plain ptero → line 2 ($7F)').toBe(0x7f)
    // Right flank (x > 267): also the lower line for a baiter.
    expect(b.patchLaneReroute(BAITER, 300), 'baiter past CLIF3U right → $88').toBe(0x88)
    // Mid-band (165 < x ≤ 267): even a baiter skims line 2 (over higher CLIF3U) — patch is a no-op here.
    expect(b.patchLaneReroute(BAITER, 200), 'baiter over CLIF3U mid-band → line 2').toBe(0x7f)
    expect(b.patchLaneReroute(PLAIN, 200), 'plain ptero mid-band → line 2').toBe(0x7f)
    // The both-ways divergence lives on the flank.
    expect(b.patchLaneReroute(BAITER, 100)).not.toBe(b.patchLaneReroute(PLAIN, 100))
  })

  it('THE GATE, ONE ASSERTION PER PATCH: a mutant that drops the gate reddens the plain-ptero side', async () => {
    const b = await loadBaiter()
    // For each patch, choose an input where the patched value differs from the input,
    // and require the PLAIN (PCHASE=0) result to equal the identity — this is the pin an
    // "apply unconditionally" mutant fails.
    expect(b.patchAimLower(PLAIN, 8)).toBe(8)
    expect(b.patchSlowDive(PLAIN, 0x0200)).toBe(0x0200)
    expect(b.patchFirstPassMiss(PLAIN, 40)).toBe(40)
    expect(b.patchSeekTimer(PLAIN, 5)).toBe(5)
    expect(b.patchLaneReroute(PLAIN, 100)).toBe(0x7f)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM + PURITY. A seeded stall that fires baiters replays bit-for-bit;
//        the clock and the patches never mutate their arguments and never touch a clock.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — a seeded stall that fires baiters replays bit-for-bit', () => {
  /** Run the send-off clock for N wakes from a wave seed, recording each spawn decision. */
  function stall(b: BaiterModule, wave: number, wakes: number): boolean[] {
    let clock = b.seedBaiterClock(wave)
    const spawns: boolean[] = []
    for (let i = 0; i < wakes; i++) {
      const step = b.stepBaiterClock(clock)
      clock = step.clock
      spawns.push(step.spawned)
    }
    return spawns
  }

  it('the send-off sequence is deterministic — identical spawn train on replay', async () => {
    const b = await loadBaiter()
    expect(stall(b, 3, 1200)).toEqual(stall(b, 3, 1200))
  })

  it('a seeded stall actually FIRES baiters (the pin is not vacuously green)', async () => {
    const b = await loadBaiter()
    const spawns = stall(b, 3, 2000)
    expect(spawns.some((s) => s), 'the stall must eventually send off baiters').toBe(true)
  })

  it('stepBaiterClock and the patches are PURE — no argument mutation', async () => {
    const b = await loadBaiter()
    const clock: BaiterClock = { cbait: 1, nbait: 0, pbaitn: 3 }
    const snap = JSON.stringify(clock)
    b.stepBaiterClock(clock)
    expect(JSON.stringify(clock), 'stepBaiterClock must not mutate its clock argument').toBe(snap)
    // The patches are scalar-in/scalar-out — nothing to mutate, but pin idempotence.
    expect(b.patchAimLower(BAITER, 8)).toBe(b.patchAimLower(BAITER, 8))
    expect(b.patchSlowDive(BAITER, -0x0400)).toBe(b.patchSlowDive(BAITER, -0x0400))
  })
})
