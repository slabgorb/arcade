// @shared/controls-overlay — sa1-5. The BROWSER half of key rebinding: the
// localStorage store, the canvas overlay renderer, and the keydown-capture
// controller. ADR-0003 browser subpath — classified by its dirtiest dependency
// (localStorage + ctx), like esc-overlay.ts and highscore.ts. Pure binding logic
// and the navigation state machine live in ./keybind.ts.
import { parseOverrides, type Overrides } from './keybind.js'

export interface BindingStore {
  load(): Overrides
  save(overrides: Overrides): void
}

export function keybindKey(gameId: string): string {
  return `${gameId}-keybinds`
}

// Defensive access — reading the global can throw in sandboxed contexts (highscore idiom).
function defaultStorage(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function makeBindingStore(gameId: string, storage: Storage | null = defaultStorage()): BindingStore {
  const key = keybindKey(gameId)
  return {
    load(): Overrides {
      if (!storage) return {}
      let raw: string | null
      try { raw = storage.getItem(key) } catch { return {} }
      if (raw === null) return {}
      try { return parseOverrides(JSON.parse(raw)) ?? {} } catch { return {} }
    },
    save(overrides: Overrides): void {
      if (!storage) return
      try { storage.setItem(key, JSON.stringify(overrides)) } catch { /* quota / unavailable — no-op */ }
    },
  }
}
