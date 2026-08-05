// tests/audit/sw8-30-mame-corroboration.test.ts
//
// Story sw8-30 — RED phase (Han Solo / TEA), AC6: the CONFIRMED ledger. The
// 2026-08-05 MAME cross-check independently corroborated two constants we already
// ship — the game-logic timebase and the starting shield count. AC6 requires those
// corroborations be APPENDED to the star-wars primary-source audit's confirmed
// findings WITH the MAME (starwars.cpp) cites, so the cross-check leaves a trace and
// is not re-run from scratch.
//
// Pure fs/text guard (star-wars is `environment: 'node'`, so fileURLToPath is safe).
// RED until GREEN appends the two corroborations; the doc carries neither token today.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const auditDoc = readFileSync(join(root, 'docs/2026-07-15-star-wars-primary-source-audit.md'), 'utf8')

describe('sw8-30 AC6 — the MAME corroborations are recorded in the audit ledger', () => {
  it('the audit doc carries the MAME source cite (starwars.cpp)', () => {
    expect(auditDoc).toMatch(/starwars\.cpp/)
  })

  it('the timebase corroboration cites MAME: 246.094 Hz via CLOCK_3KHZ/12 set_periodic_int', () => {
    expect(auditDoc).toMatch(/246\.094/)
    expect(auditDoc).toMatch(/CLOCK_3KHZ|set_periodic_int/)
  })

  it('the starting-shields corroboration is recorded (factory default 6 shields)', () => {
    // The MAME decode ANDA #03 / ADDA #06 corroborates STARTING_LIVES = 6.
    const hasShieldCorroboration =
      /starwars\.cpp/.test(auditDoc) && /(STARTING_LIVES|starting shield|6 shield|ADDA\s*#0?6)/i.test(auditDoc)
    expect(hasShieldCorroboration).toBe(true)
  })
})
