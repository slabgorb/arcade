import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_SPEED, MAX_TURN_RATE } from '../../src/core/movement'
import { SHELL_SPEED } from '../../src/core/firing'

// bz3-1 / cluster C1 — THE TIMEBASE REBASE.
//
// The clone hard-codes a 60 Hz "player-update cadence", but the cabinet advances
// one GAME frame per 64 ms = 15.625 Hz (NMI 250 Hz / 16; BZONE.MAC:1085
// "END OF FRAME (64 MS)", gated by LSR SYNC at :422). Audit:
// docs/2026-07-17-battlezone-primary-source-audit.md, findings C-001/M-001/M-003/F-004.
//
// The error is NOT a uniform 3.84x — that is the whole point of this suite, and why
// each quantum is pinned independently rather than with one blanket assertion:
//   * TURN   is a pure per-frame quantum  -> 3.84x too fast   (84.4 vs 22 deg/s)
//   * FORWARD is 1.96x too fast, because FORWARD_STEP=48 is ALSO under-scaled
//     (the ROM sin table peaks at 0x7FFF, so the amplitude is 3/4 x 127 = 0x5E = 94)
//   * SHELL  is ~4% off only, because the shell already sub-steps 4x/frame — it must
//     NOT be dragged down to 256 x 15.625 = 4000 when the frame rate is corrected.

const RAD_TO_DEG = 180 / Math.PI
// The ROM's 9-bit player facing wheel: 2*pi/512 rad per unit. Byte-exact and CONFIRMED
// (M-002) — it is the frame rate, not this unit, that is wrong.
const TURN_UNIT = (2 * Math.PI) / 512

describe('bz3-1 timebase (C1) — magnitudes derive from the 15.625 Hz game frame', () => {
  // AC-2 / M-001. Full pivot = TURN_UNIT x 2 treads x 15.625 Hz = 0.3835 rad/s = 21.97 deg/s.
  it('MAX_TURN_RATE is the ROM ~22 deg/s pivot, not the 60 Hz 84 deg/s', () => {
    const degPerSec = MAX_TURN_RATE * RAD_TO_DEG
    expect(degPerSec, 'player full-pivot rate (deg/s)').toBeCloseTo(21.97, 1)
  })

  // AC-2 / M-003. Full-throttle = FORWARD_STEP(94) x 2 treads x 15.625 Hz = 2937.5 u/s.
  it('MAX_SPEED is the corrected ~2937.5 u/s, not the 60 Hz 5760', () => {
    expect(MAX_SPEED, 'full-throttle speed (u/s)').toBeCloseTo(2937.5, 0)
  })

  // AC-2 / M-003, ISOLATED. MAX_SPEED / MAX_TURN_RATE = FORWARD_STEP / TURN_UNIT — the frame
  // rate cancels, so this pins the forward-step magnitude alone, even if the Hz were still
  // wrong. Current FORWARD_STEP=48 -> 48; corrected 0x5E -> 94.
  it('FORWARD_STEP is 0x5E = 94 (frame-rate-independent ratio isolates it)', () => {
    const forwardStep = (MAX_SPEED / MAX_TURN_RATE) * TURN_UNIT
    expect(forwardStep, 'ROM forward step (0x5E)').toBeCloseTo(94, 0)
  })

  // AC-3 / F-004. GUARD: the shell already sub-steps 4x/frame (SAVE3=4, BZONE.MAC:608), so its
  // speed is ~16000 u/s (256 x 4 x 15.625) and must be LEFT ~there. This passes now (15360, within
  // ~4%) and after the correct fix (16000), but goes RED the instant a dev "fixes" the frame rate
  // by rescaling SHELL_SPEED = 256 x 15.625 = 4000 — the exact F-004 naive-rescale trap.
  it('SHELL_SPEED stays ~16000 u/s (sub-stepped), never the 4000 naive-rescale trap', () => {
    expect(SHELL_SPEED, 'must not collapse to 256 x 15.625 = 4000').toBeGreaterThan(8000)
    expect(SHELL_SPEED, 'the sub-stepped ~16000 u/s value').toBeGreaterThan(14000)
    expect(SHELL_SPEED).toBeLessThan(17000)
  })
})

describe('bz3-1 timebase (C1) — the 60 Hz cadence is purged from the sim and cited', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const read = (p: string) => readFileSync(join(root, p), 'utf8')

  // AC-1: the corrected constant must carry a ROM citation (BZONE.MAC:1085 / :422).
  it('movement.ts documents the 15.625 Hz / 64 ms game frame with a BZONE.MAC citation', () => {
    const src = read('src/core/movement.ts')
    expect(src, 'cite the 15.625 Hz / 64 ms game frame').toMatch(/15\.625|64\s*ms/i)
    expect(src, 'cite BZONE.MAC (the shipped source, not just the dis65)').toMatch(/BZONE\.MAC/)
  })

  it('firing.ts documents the 15.625 Hz / 64 ms game frame with a BZONE.MAC citation', () => {
    const src = read('src/core/firing.ts')
    expect(src).toMatch(/15\.625|64\s*ms/i)
    expect(src).toMatch(/BZONE\.MAC/)
  })

  // AC-1 "everywhere it feeds a per-frame quantum". enemies.ts hard-codes `SHELL_SPEED / 60` for
  // the enemy-shell swept-collision granularity — an UNAUDITED third instance of the 60 Hz bug
  // (no finding cites it). With SHELL_SPEED corrected to ~16000, `/ 60` yields 66.7 where the ROM
  // per-sub-step distance is 256; it must use the 15.625 Hz game frame instead.
  it('enemies.ts no longer divides SHELL_SPEED by a hard-coded 60 frame rate', () => {
    const src = read('src/core/enemies.ts')
    expect(src, 'enemy-shell substep must use the 15.625 Hz frame, not 60').not.toMatch(
      /SHELL_SPEED\s*\/\s*60\b/,
    )
  })
})
