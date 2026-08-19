// src/core/cmos.ts — df5-6 (Korben Dallas / Dev). The PURE CMOS coin/credit ledger. The
// arcade cabinet kept its coin audit in battery-backed CMOS RAM; this monorepo maps it onto
// one-origin localStorage (the ADR-0004 cross-origin-cookie retirement — see the shell seam,
// src/shell/cmos.ts). This module is the pure data model + immutable accumulators; the WIRING
// of WHEN a coin/credit event fires is df7 (Decision C).
//
// ROM ground truth — * CMOS RAM ALLOCATION (ROMF8.SRC):
//   SLOT1  RMB 4  LEFT COIN TOTAL     ROMF8.SRC:20
//   SLOT2  RMB 4  CENTER COIN TOTAL   ROMF8.SRC:21
//   SLOT3  RMB 4  RIGHT COIN TOTAL    ROMF8.SRC:22
//   TOTPDC RMB 4  TOTAL PAID CREDITS  ROMF8.SRC:23
//
// Pure core: no localStorage, no wall-clock (purity.test.ts).

/** The CMOS coin/credit ledger: the three coin-slot totals + total paid credits. */
export interface CmosLedger {
  readonly slot1: number // LEFT COIN TOTAL     ROMF8.SRC:20
  readonly slot2: number // CENTER COIN TOTAL   ROMF8.SRC:21
  readonly slot3: number // RIGHT COIN TOTAL    ROMF8.SRC:22
  readonly totpdc: number // TOTAL PAID CREDITS  ROMF8.SRC:23
}

/** A which-slot selector for recordCoin — the three coin doors. */
export type CoinSlot = 1 | 2 | 3

/** A fresh, all-zero ledger (a cabinet that has taken no coins and paid no credits). */
export function createCmosLedger(): CmosLedger {
  return { slot1: 0, slot2: 0, slot3: 0, totpdc: 0 }
}

/** Record one coin in the named slot — increments that coin total ALONE, immutably. */
export function recordCoin(ledger: CmosLedger, slot: CoinSlot): CmosLedger {
  switch (slot) {
    case 1:
      return { ...ledger, slot1: ledger.slot1 + 1 }
    case 2:
      return { ...ledger, slot2: ledger.slot2 + 1 }
    case 3:
      return { ...ledger, slot3: ledger.slot3 + 1 }
  }
}

/** Record one paid credit — increments TOTPDC alone, immutably. */
export function recordPaidCredit(ledger: CmosLedger): CmosLedger {
  return { ...ledger, totpdc: ledger.totpdc + 1 }
}
