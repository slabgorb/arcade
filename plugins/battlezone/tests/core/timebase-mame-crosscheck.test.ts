import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GAME_FRAME_HZ } from '../../src/core/timebase'

// Story bz5-3 — RED phase (O'Brien / Leeloo, TEA). TIMEBASE CROSS-CHECK against
// MAME as an INDEPENDENT SECOND primary source. bz3-1 fixed the sim to a 15.625 Hz
// game-frame from the ROM's own "END OF FRAME (64 MS)" comment (NMI taken as a round
// 250 Hz, ÷16). This story reconciles that against MAME's EXECUTABLE clock chain and
// records the result in the findings ledger (§11.3), the same pattern as bz5-1/-2/-4.
//
// MAME source lives at the EXTERNAL, non-vendored tree
// ~/Projects/mame/src/mame/atari/ — its line numbers are cited in PROSE only (the
// vendored citations gate cannot blob-verify an out-of-repo tree). Verified 2026-08-06:
//   bzone.h:20   #define BZONE_MASTER_CLOCK (XTAL(12'096'000))
//   bzone.h:21   #define BZONE_CLOCK_3KHZ   (BZONE_MASTER_CLOCK / 4096)
//   bzone.cpp:611  M6502(config, m_maincpu, BZONE_MASTER_CLOCK / 8);
//   bzone.cpp:613  set_periodic_int(..., attotime::from_hz(BZONE_CLOCK_3KHZ / 12));  // NMI
//   bzone.cpp:619  m_vector->set_refresh_hz(BZONE_CLOCK_3KHZ / 12 / 6);
//
// THE RECONCILED ANSWER (user ruling 2026-08-06 — "accept + document", NOT a rewrite):
// MAME confirms the MECHANISM (frame = NMI÷16, vector refresh = NMI÷6) but shows the
// exact NMI is 246.094 Hz, NOT the round 250 the ROM's "64 MS" comment implies. So the
// executed hardware frame is 246.094/16 = 15.381 Hz (65.02 ms), and the clone's 15.625 Hz
// is ~1.59% fast. Per the story's "verification-first, NOT a speculative rewrite" mandate
// and the bz5-1 pre-ruling (findings :499-501: "the difference does not materially change
// the window"), the clone KEEPS the ROM-documented 15.625 Hz; the delta is DOCUMENTED with
// MAME citations, and the bz3 magnitude suite is left untouched.
//
// Groups A/B are CONFIRMED regression pins (they pass on arrival — fabricating a failing
// numeric test would violate AC's verification-first mandate). Groups C/D are the genuine
// RED: the reconciled findings §11.3 and the timebase.ts second-source citation do not
// exist yet — Dev writes them in GREEN.

// The MAME clock chain, transcribed from the documented constants above and derived here.
const MASTER_HZ = 12_096_000 // bzone.h:20 XTAL(12'096'000)
const CLOCK_3KHZ = MASTER_HZ / 4096 // bzone.h:21  ≈ 2953.125 Hz
const CPU_HZ = MASTER_HZ / 8 // bzone.cpp:611  1.512 MHz
const NMI_HZ = CLOCK_3KHZ / 12 // bzone.cpp:613  ≈ 246.094 Hz
const VECTOR_HZ = CLOCK_3KHZ / 12 / 6 // bzone.cpp:619  ≈ 41.016 Hz

const NMI_PER_FRAME = 16 // ROM: AND I,0F + INC SYNC every 16th NMI (BZONE.MAC:1084-1088)
const NMI_PER_VECTOR = 6 // ROM: VTIMER←6, vector every 6th NMI (BZONE.MAC:1216-1235)

// NOTE (rule-#26): the assertions in this block are DOCUMENTARY transcription pins — they
// make the off-repo MAME derivation executable and reproducible, so they check arithmetic
// among test-local constants (a wrong transcription of the MAME source is a shared-source
// error no in-repo test can catch). The production-facing guards live BELOW: the AC1/AC2
// blocks read findings.md / timebase.ts live from disk and assert 246.09 / 15.381 / 1.59%
// are actually written there, and the drift/immutability block imports GAME_FRAME_HZ live.
describe('bz5-3 · MAME clock chain — the executable second source (CONFIRMED pins)', () => {
  it('derives the 6502 core clock: master ÷ 8 = 1.512 MHz (bzone.cpp:611)', () => {
    expect(CPU_HZ).toBe(1_512_000)
  })

  it('derives CLOCK_3KHZ: master ÷ 4096 ≈ 2953.125 Hz (bzone.h:21)', () => {
    expect(CLOCK_3KHZ).toBeCloseTo(2953.125, 3)
  })

  it('derives the exact NMI rate: CLOCK_3KHZ ÷ 12 ≈ 246.094 Hz (bzone.cpp:613)', () => {
    expect(NMI_HZ).toBeCloseTo(246.094, 2)
  })

  // THE RECONCILIATION CRUX: the bz3 audit took the NMI as a round 250 Hz (back-computed
  // from the ROM's "64 MS" comment). MAME's chain proves it is 246.094 Hz — off by enough
  // that it cannot be rounded to 250. This is WHY the clone's frame is ~1.6% fast.
  it('the exact NMI is NOT the round 250 Hz the ROM comment implies (Δ ≈ 3.9 Hz)', () => {
    expect(Math.abs(NMI_HZ - 250)).toBeGreaterThan(3)
    expect(NMI_HZ).toBeLessThan(250)
  })

  it('derives the vector refresh: NMI ÷ 6 ≈ 41.016 Hz — not the audit\'s nominal 41.67 (bzone.cpp:619)', () => {
    expect(VECTOR_HZ).toBeCloseTo(41.016, 2)
    expect(VECTOR_HZ).not.toBeCloseTo(41.67, 1)
  })
})

describe('bz5-3 · frame reconciliation — mechanism confirmed, 15.625 kept, delta quantified (CONFIRMED pins)', () => {
  // The executed hardware game frame: exact NMI ÷ 16.
  const EXACT_FRAME_HZ = NMI_HZ / NMI_PER_FRAME // ≈ 15.381 Hz

  it('the ROM mechanism divides NMI by 16 for the game frame and by 6 for vector draw', () => {
    // 15.625 = 250/16 (nominal); 41.667 = 250/6 (nominal). The clone's nominal frame and
    // the audit's nominal vector both ride the SAME 250 Hz nominal — one mechanism.
    expect(250 / NMI_PER_FRAME).toBeCloseTo(15.625, 3)
    expect(250 / NMI_PER_VECTOR).toBeCloseTo(41.667, 2)
  })

  it('the exact-hardware game frame is ≈15.381 Hz (65.02 ms), not the nominal 15.625 Hz', () => {
    expect(EXACT_FRAME_HZ).toBeCloseTo(15.381, 2)
    const periodMs = 1000 / EXACT_FRAME_HZ
    expect(periodMs).toBeCloseTo(65.02, 1)
  })

  it('quantifies the drift: the clone runs ≈1.59% fast vs the executed hardware', () => {
    const driftPercent = (GAME_FRAME_HZ / EXACT_FRAME_HZ - 1) * 100
    expect(driftPercent).toBeCloseTo(1.59, 1)
    // Equivalent framing: purely the nominal-vs-exact NMI ratio.
    expect((250 / NMI_HZ - 1) * 100).toBeCloseTo(1.59, 1)
  })

  // THE ACCEPT DECISION, PINNED. The user ruled "keep 15.625, document the delta". This
  // guards BOTH ways: against a silent drift back, AND against a well-meaning dev
  // "correcting" GAME_FRAME_HZ to the MAME-exact 15.381 (which would re-baseline the
  // entire bz3 magnitude suite — out of scope for this verification-first story).
  it('GAME_FRAME_HZ stays the ROM-documented 15.625 — no speculative rewrite to 15.381', () => {
    expect(GAME_FRAME_HZ).toBe(15.625)
    expect(GAME_FRAME_HZ).not.toBeCloseTo(EXACT_FRAME_HZ, 2)
  })
})

describe('bz5-3 · AC1 — the reconcile is written up in the findings ledger (§11.3)', () => {
  const findings = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'battlezone-1980-source-findings.md'),
    'utf8',
  )

  it('adds a §11.3 timebase cross-check subsection (beyond bz5-1\'s deferral)', () => {
    expect(findings, 'a new ### 11.3 heading reconciling the timebase vs MAME').toMatch(/###\s*11\.3\b/)
  })

  it('records the EXACT NMI rate 246.09(4) Hz, not just the rounded ≈246', () => {
    expect(findings).toMatch(/246\.09/)
  })

  it('records the exact-hardware ≈15.381 Hz frame and the ≈1.59% drift', () => {
    expect(findings).toMatch(/15\.381/)
    expect(findings, 'the quantified nominal-vs-exact delta').toMatch(/1\.59|1\.6\s*%/)
  })

  it('cites MAME\'s NMI source for the reconcile (bzone.cpp:613)', () => {
    expect(findings).toMatch(/bzone\.cpp:613/)
  })
})

describe('bz5-3 · AC2 — timebase.ts gains an explicit MAME second-source citation', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'core', 'timebase.ts'),
    'utf8',
  )

  it('cites the MAME driver as the independent second source (bzone.cpp / CLOCK_3KHZ)', () => {
    expect(src, 'timebase.ts must cite MAME, not only BZONE.MAC').toMatch(
      /bzone\.cpp|BZONE_CLOCK_3KHZ|MAME/,
    )
  })

  it('reconciles the nominal 250 Hz against MAME\'s exact 246.09 Hz NMI', () => {
    // Currently the comment asserts a bare "250 Hz" with no exact reconcile — RED until
    // Dev notes the nominal-vs-exact delta.
    expect(src, 'note the exact 246.09 Hz alongside the nominal 250').toMatch(/246/)
  })

  it('keeps the BZONE.MAC first-source citation intact (adds, does not replace)', () => {
    expect(src).toMatch(/BZONE\.MAC/)
  })
})
