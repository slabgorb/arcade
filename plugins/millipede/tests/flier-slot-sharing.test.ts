// tests/flier-slot-sharing.test.ts
//
// Story ml7-8 (AC3) — reconcile the fliers sharing MOBJ slot 12 (a DOCUMENTED
// deviation). In the ROM the bee, dragonfly, mosquito and earwig are ONE motion
// object at BEEC+12 (BEE_SLOT/DRAGONFLY_SLOT/MOSQUITO_SLOT/EARWIG_SLOT all = 12),
// so only ONE of the four is ever alive at a time. The port gives each its own
// one-element slot array (roster.ts), so up to four could co-exist — the accepted
// deviation this story documents.
//
// This is a GUARD, not a RED behaviour change: it pins the shared-slot identity
// (a future edit that renumbers a flier off 12 reddens here and forces the
// deviation to be re-examined) and the one-object-per-flier shape. The prose
// reconciliation lives in the module headers; see the ml7-8 TEA notes.

import { describe, it, expect } from 'vitest'
import { BEE_SLOT } from '../src/core/bee'
import { DRAGONFLY_SLOT } from '../src/core/dragonfly'
import { MOSQUITO_SLOT } from '../src/core/mosquito'
import { EARWIG_SLOT } from '../src/core/earwig'
import { initRoster } from '../src/core/enemies/roster'

describe('ml7-8 AC3 — the four fliers share ROM motion-object slot 12', () => {
  it('bee, dragonfly, mosquito and earwig all name BEEC+12 (slot 12)', () => {
    expect(BEE_SLOT).toBe(12)
    expect(DRAGONFLY_SLOT).toBe(12)
    expect(MOSQUITO_SLOT).toBe(12)
    expect(EARWIG_SLOT).toBe(12)
    // The identity IS the shared slot — every flier occupies the same one.
    const uniq = new Set([BEE_SLOT, DRAGONFLY_SLOT, MOSQUITO_SLOT, EARWIG_SLOT])
    expect(uniq.size, 'all four fliers share exactly one slot number').toBe(1)
  })

  it('each flier is a SINGLE motion object (a one-element slot array)', () => {
    const r = initRoster()
    expect(r.bees, 'bee is one MOBJ').toHaveLength(1)
    expect(r.dragonflies, 'dragonfly is one MOBJ').toHaveLength(1)
    expect(r.mosquitoes, 'mosquito is one MOBJ').toHaveLength(1)
    expect(r.earwigs, 'earwig is one MOBJ').toHaveLength(1)
  })
})
