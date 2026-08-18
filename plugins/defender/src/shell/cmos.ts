// src/shell/cmos.ts — df5-6 (Korben Dallas / Dev). The one-origin localStorage persistence
// seam for the CMOS coin/credit ledger. The core owns the pure ledger (core/cmos.ts); this
// SHELL module holds only load-on-boot / save-on-change, the ONLY localStorage toucher.
//
// One origin (arcade.slabgorb.com/<id>/) means the cabinet's CMOS RAM lives under a single
// namespaced key — the ADR-0004 cross-origin-cookie retirement. Every failure mode
// (missing / corrupt / not-a-ledger / unavailable) degrades to a ZERO ledger and save is a
// no-op, so persistence never crashes the game and never surfaces a garbage coin total.

import { createCmosLedger, type CmosLedger } from '../core/cmos.js'

/** The one-origin localStorage key for Defender's CMOS ledger (namespaced to the cabinet slot
 *  so it can never collide with another game's audit). */
export const CMOS_STORAGE_KEY = 'defender-cmos'

/** The load/save pair main.ts wires. */
export interface CmosLedgerStorage {
  load(): CmosLedger
  save(ledger: CmosLedger): void
}

// Access localStorage defensively: reading the global can throw in sandboxed contexts, and
// outside a browser it is simply absent.
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** True when `value` is a well-formed ledger (four finite numbers) — a corrupt or partial
 *  record is rejected in favour of a fresh zero ledger. */
function isCmosLedger(value: unknown): value is CmosLedger {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (['slot1', 'slot2', 'slot3', 'totpdc'] as const).every(
    (k) => typeof v[k] === 'number' && Number.isFinite(v[k] as number),
  )
}

/** Bind load/save to CMOS_STORAGE_KEY. load returns a ZERO ledger on first boot / corrupt /
 *  unavailable storage; save is a no-op if storage is unreachable. */
export function makeCmosLedgerStorage(): CmosLedgerStorage {
  return {
    load(): CmosLedger {
      const store = getStorage()
      if (!store) return createCmosLedger()
      try {
        const raw = store.getItem(CMOS_STORAGE_KEY)
        if (raw === null) return createCmosLedger()
        const parsed: unknown = JSON.parse(raw)
        return isCmosLedger(parsed)
          ? { slot1: parsed.slot1, slot2: parsed.slot2, slot3: parsed.slot3, totpdc: parsed.totpdc }
          : createCmosLedger()
      } catch {
        return createCmosLedger()
      }
    },
    save(ledger: CmosLedger): void {
      const store = getStorage()
      if (!store) return
      try {
        store.setItem(CMOS_STORAGE_KEY, JSON.stringify(ledger))
      } catch {
        // quota / unavailable — persistence is best-effort, never fatal.
      }
    },
  }
}
