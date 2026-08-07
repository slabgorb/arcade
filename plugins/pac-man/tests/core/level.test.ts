// tests/core/level.test.ts
//
// Story pm3-2 (RED, TEA) — the level table's tunnel-speed column
// (`tunnelSpeedPct`), written BEFORE `SpeedRow`/`Level` carry it. Dossier
// Table A.1 figures, honest-uncited — same status as `ghostSpeedPct` and its
// siblings (see level.ts's file-header note).

import { describe, it, expect } from 'vitest'
import { levelRow } from '../../src/core/level'

describe('levelRow(...).tunnelSpeedPct (pm3-2, Dossier Table A.1)', () => {
  it('level 1 ghosts crawl in the tunnel (Dossier Table A.1: 40%)', () => {
    expect(levelRow(1).tunnelSpeedPct).toBe(40)
  })

  it('tunnel speed rises with the level group (2-4 = 45, 5-20 = 50)', () => {
    expect(levelRow(3).tunnelSpeedPct).toBe(45)
    expect(levelRow(10).tunnelSpeedPct).toBe(50)
  })
})
