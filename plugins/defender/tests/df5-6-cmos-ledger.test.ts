// tests/df5-6-cmos-ledger.test.ts
//
// Story df5-6 — RED phase (Leeloo / TEA). AC3: the CMOS coin/credit ledger (SLOT1/SLOT2/
// SLOT3 coin totals + TOTPDC total paid credits) is modelled PURE and persisted to
// one-origin localStorage, and every ledger constant has a byte-verified claim (the df1-1
// gate). This is the ADR-0004 cross-origin-cookie retirement: one origin, shared
// localStorage — the CMOS RAM the cabinet kept in battery-backed memory now lives under a
// single-origin key.
//
// ─── THE ROM, DECODED (all lines from tool output — ROMF8.SRC "* CMOS RAM ALLOCATION") ─
//   SLOT1  RMB 4   LEFT COIN TOTAL        ROMF8.SRC:20
//   SLOT2  RMB 4   CENTER COIN TOTAL      ROMF8.SRC:21
//   SLOT3  RMB 4   RIGHT COIN TOTAL       ROMF8.SRC:22
//   TOTPDC RMB 4   TOTAL PAID CREDITS     ROMF8.SRC:23
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────────────
//   plugins/defender/src/core/cmos.ts  — the PURE ledger: CmosLedger { slot1, slot2, slot3,
//     totpdc }, createCmosLedger() (all zero), and immutable recordCoin(ledger, slot)/
//     recordPaidCredit(ledger) accumulators. No localStorage (purity.test.ts — the wiring
//     of WHEN a coin/credit fires is df7).
//   plugins/defender/src/shell/cmos.ts — the one-origin persistence seam: CMOS_STORAGE_KEY
//     and makeCmosLedgerStorage() (load-on-boot → zero ledger on first boot / corrupt store,
//     save-on-change), the ONLY localStorage toucher.
//   A glossary row + byte-verified claim per ledger constant (ROMF8.SRC:20-23) — df1-1 gate.

import { describe, it, expect, vi, afterEach } from 'vitest'
// RED until GREEN creates the modules.
import {
  createCmosLedger,
  recordCoin,
  recordPaidCredit,
  type CmosLedger,
} from '../src/core/cmos.js'
import { CMOS_STORAGE_KEY, makeCmosLedgerStorage } from '../src/shell/cmos.js'
// The CMOS cited-constant (glossary + claim) assertions live in df5-6-identity.test.ts.

/** A minimal in-memory localStorage (the asteroids/tuning.test.ts shape). */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('df5-6 AC3 — the PURE CMOS ledger model (SLOT1/2/3 coin totals + TOTPDC)', () => {
  it('a fresh ledger is all-zero — SLOT1/SLOT2/SLOT3 and TOTPDC', () => {
    const l = createCmosLedger()
    expect(l).toEqual({ slot1: 0, slot2: 0, slot3: 0, totpdc: 0 })
  })

  it('recordCoin increments ONLY the named slot, immutably', () => {
    const l0 = createCmosLedger()
    const l1 = recordCoin(l0, 1)
    expect(l1).toEqual({ slot1: 1, slot2: 0, slot3: 0, totpdc: 0 })
    expect(l0, 'the input ledger must not be mutated').toEqual({
      slot1: 0,
      slot2: 0,
      slot3: 0,
      totpdc: 0,
    })
    const l2 = recordCoin(recordCoin(l1, 2), 3)
    expect(l2).toEqual({ slot1: 1, slot2: 1, slot3: 1, totpdc: 0 })
    // the center slot accumulates independently
    expect(recordCoin(recordCoin(l0, 2), 2)).toEqual({ slot1: 0, slot2: 2, slot3: 0, totpdc: 0 })
  })

  it('recordPaidCredit increments TOTPDC alone, immutably', () => {
    const l0 = createCmosLedger()
    const l1 = recordPaidCredit(l0)
    expect(l1).toEqual({ slot1: 0, slot2: 0, slot3: 0, totpdc: 1 })
    expect(l0.totpdc, 'the input ledger must not be mutated').toBe(0)
    expect(recordPaidCredit(l1).totpdc).toBe(2)
    // credits are independent of coin slots
    expect(recordPaidCredit(recordCoin(l0, 1))).toEqual({ slot1: 1, slot2: 0, slot3: 0, totpdc: 1 })
  })
})

describe('df5-6 AC3 — the CMOS ledger persists to one-origin localStorage', () => {
  it('binds a single-origin storage key (ADR-0004: one origin, shared localStorage)', () => {
    expect(typeof CMOS_STORAGE_KEY).toBe('string')
    // one-origin: the key is namespaced to the defender cabinet slot, not a bare 'cmos'.
    expect(CMOS_STORAGE_KEY).toMatch(/defender/)
  })

  it('round-trips a ledger through localStorage', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    const storage = makeCmosLedgerStorage()
    const ledger: CmosLedger = { slot1: 3, slot2: 1, slot3: 4, totpdc: 8 }
    storage.save(ledger)
    expect(storage.load()).toEqual(ledger)
  })

  it('loads a ZERO ledger on first boot and on a corrupt store (never a garbage total)', () => {
    // first boot — nothing stored
    vi.stubGlobal('localStorage', fakeStorage())
    expect(makeCmosLedgerStorage().load()).toEqual(createCmosLedger())
    // corrupt store — must degrade to zero, not throw and not surface garbage
    vi.stubGlobal('localStorage', fakeStorage({ [CMOS_STORAGE_KEY]: '{not json' }))
    expect(() => makeCmosLedgerStorage().load()).not.toThrow()
    expect(makeCmosLedgerStorage().load()).toEqual(createCmosLedger())
  })
})
