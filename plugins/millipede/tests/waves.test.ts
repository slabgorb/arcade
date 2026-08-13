// tests/waves.test.ts
//
// Story ml5-1 — RED phase (Han Solo / TEA). WAVES: the per-wave difficulty dial
// and the inter-wave DELAY. This is one half of ml5-1 (the scoring half is
// tests/scoring.test.ts); together they are the "outer loop that turns reducers
// into a game" — the first ml5 story.
//
// ─── THE TWO ROM ROUTINES THIS FILE PINS ────────────────────────────────────────
//
// (1) BEETLA — beetles allowed during THIS wave, the per-wave QUOTA.
//     MLDEF.MAC:370  BEETLA: .BLKB 1  ;NUMBER OF BEETLES ALLOWED DURING THIS "WAVE"
//     The quota is (re)computed at each wave start from SCORE2 (the ten-thousands
//     BCD byte of the running score) with an easy/hard DIP split, MILLI.MAC:637-665:
//
//       640: LDY I,1
//       641: LDA X,SCORE2
//       642: CMP I,7    BCC 95$   ;ALLOW 1 BEETLE PER WAVE UNTIL 70000
//       644: INY
//       645: CMP I,14   BCC 95$   ;("ALLOW 3 AFTER 140000" — Y is 2 here)
//       647: INY
//       648: CMP I,21   BCC 95$   ;("ALLOW 4 AFTER 210000" — Y is 3 here)
//       650: INY
//       651: CMP I,40   BCC 95$   ;ONLY 4 BEETLES UNTIL 400,000        (Y = 4)
//       653: CMP I,70   BCS 93$   ;255 BEETLES AFTER 700,000
//       655: CMP I,50   BCS 94$   ;6 BEETLES AFTER 500,000
//       657: LDA OPTNS1 / AND I,02
//       659: BEQ 95$              ;IF EASY WAIT UNTIL 500,000          (Y = 4)
//       660: BNE 94$              ;IF HARD THEN 6 BEETLES AFTER 400,000
//       662: 93$: LDY I,0FD
//       663: 94$: INY / INY                                            (0FD->0FF, or 4->6)
//       665: 95$: STY BEETLA
//
//     ⚠ THE COMMENT TRAP (BT/WV): the ROM comments describe the NEXT tier, not the
//     value being stored — at :645 Y is 2 though the comment says "ALLOW 3", at :648
//     Y is 3 though it says "ALLOW 4". Tests pin the ACTUAL stored count, never the
//     comment. And :662 `LDY 0FD` + the two `INY` at :663-664 = 0xFF = 255, NOT 253.
//
//     Bands, keyed on score2 as a BCD byte (valid-BCD bytes compare numerically, so
//     plain `<` matches the ROM's CMP — the same idiom as beetle.ts:beetleAllowed):
//       score2 < 0x07 → 1     0x07..0x13 → 2     0x14..0x20 → 3
//       0x21..0x3F → 4        0x40..0x49 → easy 4 / hard 6
//       0x50..0x6F → 6        score2 >= 0x70 → 255
//
//     NOTE this is the per-wave QUOTA (BEETLA), a DIFFERENT variable from the
//     already-shipped beetle.ts:beetleAllowed(score2) which is the CONCURRENCY cap
//     (1/2/3, BEETLS vs allowance, MILLI.MAC:272-279). ml5-1's gap: nothing in the
//     tree sets BEETLA at wave start today — beetle.ts only DECREMENTS it (:151).
//
// (2) DELAY — the non-zero inter-wave pause. MLDEF.MAC:286 DELAY: .BLKB 1 ;NON ZERO
//     TO DELY BETWEEN WAVES. Armed to 0x40 when a wave clears (MILLI.MAC:1904-1905
//     LDA I,40 / STA DELAY ;DELAY BEFORE NEXT WAVE) and counted down by CHKEND,
//     MLSUB.MAC:52-81:
//
//       52: CHKEND: LDA DELAY / BEQ 1$        ;IF NO DELAY  (delay 0 => not counting)
//       54: LDA MEM+1                          ;WAIT UNTIL MUSHROOMS RESTORED
//       55: ORA PEXPLD                         ;WAIT UNTIL PLAYER STOPS EXPLODING
//       56: ORA BEETLS
//       57: BNE 1$                             ;DON'T BRING IN CENTIPEDE WHILE BEETLES PRESENT
//       58: DEC DELAY
//       59: BNE 1$                             ;DON'T DO ANYTHING YET
//       ..: (DELAY hit 0 this frame => advance / switch players)
//
//     So the countdown HOLDS (no decrement) whenever mushrooms are restoring, the
//     player is exploding, OR beetles are present; it only ticks down on a clear
//     frame, and the "wave is ready" EDGE fires on the single frame DELAY reaches 0.
//
// ─── WHAT GREEN (Dev) MUST SHIP: src/core/waves.ts ──────────────────────────────
//   export const WAVE_DELAY: number                              // 0x40 (MILLI.MAC:1904-1905)
//   export function beetlesPerWave(score2: number, hard: boolean): number
//   export interface WaveBlockers {
//     readonly mushroomsRestoring: boolean   // MEM+1  (MLSUB.MAC:54)
//     readonly playerExploding:   boolean    // PEXPLD (MLSUB.MAC:55)
//     readonly beetlesPresent:    boolean    // BEETLS (MLSUB.MAC:56)
//   }
//   export function stepWaveDelay(
//     delay: number, blockers: Readonly<WaveBlockers>,
//   ): { readonly delay: number; readonly waveReady: boolean }
//   Pure, cited (WV-* in docs/rom-study/claims/13-waves-scoring.json), no clock/DOM.
//   The `waveReady` edge MUST be computed at the single return of stepWaveDelay so no
//   caller path can miss the transition (lang-review typescript #14).
//
// ─── RADIX / ORIENTATION ─────────────────────────────────────────────────────────
// score2 is a BCD byte (ten-thousands digit-pair): 0x07 == 70,000, 0x70 == 700,000.
// All ramp thresholds below are hex BCD literals, matching the ROM CMP operands.

import { describe, it, expect } from 'vitest'

interface WaveBlockers {
  mushroomsRestoring: boolean
  playerExploding: boolean
  beetlesPresent: boolean
}

interface WavesModule {
  WAVE_DELAY: number
  beetlesPerWave: (score2: number, hard: boolean) => number
  stepWaveDelay: (
    delay: number,
    blockers: Readonly<WaveBlockers>,
  ) => { delay: number; waveReady: boolean }
}

// COMPUTED specifier (the beetle.test.ts / conway.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean while the module does not exist;
// vitest resolves it at runtime, relative to this file.
const WAVES_SPECIFIER = ['..', 'src', 'core', 'waves'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadWaves(): Promise<WavesModule> {
  try {
    const mod = (await import(/* @vite-ignore */ WAVES_SPECIFIER)) as Partial<WavesModule>
    if (typeof mod.beetlesPerWave !== 'function') throw new Error('module has no beetlesPerWave export')
    if (typeof mod.stepWaveDelay !== 'function') throw new Error('module has no stepWaveDelay export')
    return mod as WavesModule
  } catch (e) {
    throw new Error(
      'waves reducer not built yet — GREEN (Dev) ships src/core/waves.ts per the ' +
        'contract at the top of tests/waves.test.ts (pure, cited BEETLA quota + DELAY ' +
        `countdown). (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** No blocker set — the clear-frame case where the countdown ticks. */
function clear(over: Partial<WaveBlockers> = {}): WaveBlockers {
  return { mushroomsRestoring: false, playerExploding: false, beetlesPresent: false, ...over }
}

describe('waves — cited constants', () => {
  it('pins WAVE_DELAY to 0x40 (MILLI.MAC:1904-1905, WV-DELAY-ARM)', async () => {
    const m = await loadWaves()
    expect(m.WAVE_DELAY, 'LDA I,40 / STA DELAY ;DELAY BEFORE NEXT WAVE (MILLI.MAC:1904-1905)').toBe(0x40)
  })
})

describe('waves — beetlesPerWave: the BEETLA per-wave quota ramp (MILLI.MAC:637-665)', () => {
  // Each row: [score2 (BCD), easyQuota, hardQuota]. The easy/hard split only
  // differs in the 0x40..0x49 band (MILLI.MAC:657-660).
  const BANDS: ReadonlyArray<readonly [number, number, number]> = [
    [0x00, 1, 1], // below 70k
    [0x06, 1, 1], // 60k — still band 1 (< 0x07)
    [0x07, 2, 2], // 70k — first step up (:642 boundary is exclusive of band 1)
    [0x13, 2, 2], // 130k — top of band 2 (< 0x14)
    [0x14, 3, 3], // 140k — band 3
    [0x20, 3, 3], // 200k — top of band 3 (< 0x21)
    [0x21, 4, 4], // 210k — band 4
    [0x39, 4, 4], // 390k — top of band 4 (< 0x40)
    [0x40, 4, 6], // 400k — the DIP-split band: easy 4, hard 6
    [0x49, 4, 6], // 490k — top of the split band (< 0x50)
    [0x50, 6, 6], // 500k — band 6 for both
    [0x69, 6, 6], // 690k — top of band 6 (< 0x70)
    [0x70, 255, 255], // 700k — the LDY 0FD + INY INY = 0xFF terminal band
    [0x99, 255, 255], // deep play stays at 255
  ]

  it('EASY quota follows the score2 ladder 1→2→3→4→4→6→255 (WV-QUOTA-EASY)', async () => {
    const m = await loadWaves()
    for (const [score2, easy] of BANDS) {
      expect(m.beetlesPerWave(score2, /* hard */ false), `easy score2=0x${score2.toString(16)}`).toBe(easy)
    }
  })

  it('HARD quota diverges only in the 0x40..0x49 band → 6 not 4 (MILLI.MAC:657-660, WV-QUOTA-HARD)', async () => {
    const m = await loadWaves()
    for (const [score2, , hard] of BANDS) {
      expect(m.beetlesPerWave(score2, /* hard */ true), `hard score2=0x${score2.toString(16)}`).toBe(hard)
    }
    // The ONLY band where hard != easy:
    expect(m.beetlesPerWave(0x45, true), 'hard 450k → 6').toBe(6)
    expect(m.beetlesPerWave(0x45, false), 'easy 450k → 4').toBe(4)
  })

  it('the terminal band is 255, not 253 — LDY 0FD then two INY (MILLI.MAC:662-664, WV-QUOTA-MAX)', async () => {
    const m = await loadWaves()
    // Guards the off-by-INY reading of 0FD: 0xFD + 1 + 1 == 0xFF == 255.
    expect(m.beetlesPerWave(0x70, false)).toBe(255)
    expect(m.beetlesPerWave(0x70, true)).toBe(255)
    expect(m.beetlesPerWave(0x70, false)).not.toBe(253)
  })

  it('does NOT collapse into beetle.ts beetleAllowed (concurrency 1/2/3) — they are different variables', async () => {
    const m = await loadWaves()
    // At 250k the concurrency cap is 3 but the per-wave QUOTA is 4 — proving these
    // are distinct ramps, not the same function under two names.
    expect(m.beetlesPerWave(0x25, false), 'quota at 250k').toBe(4)
  })
})

describe('waves — stepWaveDelay: the CHKEND inter-wave countdown (MLSUB.MAC:52-81)', () => {
  it('a zero DELAY is not counting: stays 0, never signals ready (MLSUB.MAC:52-53, WV-DELAY-IDLE)', async () => {
    const m = await loadWaves()
    expect(m.stepWaveDelay(0, clear())).toEqual({ delay: 0, waveReady: false })
  })

  it('ticks down by one on a clear frame (MLSUB.MAC:58, WV-DELAY-TICK)', async () => {
    const m = await loadWaves()
    expect(m.stepWaveDelay(0x40, clear())).toEqual({ delay: 0x3f, waveReady: false })
    expect(m.stepWaveDelay(2, clear())).toEqual({ delay: 1, waveReady: false })
  })

  it('HOLDS (no decrement) while mushrooms are restoring (MLSUB.MAC:54, WV-DELAY-HOLD-MEM)', async () => {
    const m = await loadWaves()
    expect(m.stepWaveDelay(0x40, clear({ mushroomsRestoring: true }))).toEqual({ delay: 0x40, waveReady: false })
  })

  it('HOLDS while the player is exploding (MLSUB.MAC:55, WV-DELAY-HOLD-PEXPLD)', async () => {
    const m = await loadWaves()
    expect(m.stepWaveDelay(0x10, clear({ playerExploding: true }))).toEqual({ delay: 0x10, waveReady: false })
  })

  it('HOLDS while beetles are present (MLSUB.MAC:56-57, WV-DELAY-HOLD-BEETLS)', async () => {
    const m = await loadWaves()
    expect(m.stepWaveDelay(1, clear({ beetlesPresent: true }))).toEqual({ delay: 1, waveReady: false })
  })

  it('the waveReady EDGE fires ONLY on the frame DELAY reaches 0 (MLSUB.MAC:58-59, WV-DELAY-READY)', async () => {
    const m = await loadWaves()
    const step = m.stepWaveDelay(1, clear())
    expect(step, 'delay 1 → 0 with the ready edge set').toEqual({ delay: 0, waveReady: true })
    // The frame AFTER (delay already 0) must NOT re-fire the edge — it is idle now.
    expect(m.stepWaveDelay(0, clear()), 'idle, not a second edge').toEqual({ delay: 0, waveReady: false })
  })

  it('counts a full WAVE_DELAY (0x40) down to a single ready edge, holds during a mid-count blocker', async () => {
    const m = await loadWaves()
    let delay = m.WAVE_DELAY
    let readyFrames = 0
    let holds = 0
    for (let frame = 0; frame < 200 && delay > 0; frame++) {
      // Inject a blocker for a stretch in the middle to prove the hold does not
      // consume frames from the countdown.
      const blocked = frame >= 10 && frame < 15
      if (blocked) holds++
      const step = m.stepWaveDelay(delay, clear({ beetlesPresent: blocked }))
      delay = step.delay
      if (step.waveReady) readyFrames++
    }
    expect(holds, '5 blocked frames were injected').toBe(5)
    expect(delay, 'countdown completed').toBe(0)
    expect(readyFrames, 'the ready edge fires exactly once across the whole countdown').toBe(1)
  })
})
