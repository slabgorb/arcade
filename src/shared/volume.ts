// @arcade/shared/volume — the persisted, single-origin master volume (sa1-4).
//
// One user knob, 0..1, shared by the lobby and every game (single origin ⇒ one
// localStorage key). This is NOT a cabinet's headroom `masterGain` (0.4/0.8 clip
// headroom, a per-cabinet NUMBER) — it is the global user setting the two shared
// audio engines multiply INTO that headroom: effectiveGain = getMasterVolume() ×
// headroom. Default 1.0 ⇒ no behaviour change for existing players.
//
// No cache: getMasterVolume() reads storage each call. It runs at resume() and in
// subscriber callbacks, never on the per-frame hot path, so the read is cheap and
// there is no cross-load state to get stale. Every storage path degrades and never
// throws — persistence must never crash a frame.
import { clamp } from './clamp'
import { getStorage } from './storage'

export const VOLUME_STORAGE_KEY = 'arcade-volume'
const DEFAULT_VOLUME = 1

type Listener = (v: number) => void
const listeners = new Set<Listener>()

/** Master volume, 0..1. Returns 1.0 when unset, unparseable, or storage is absent. */
export function getMasterVolume(): number {
  const storage = getStorage()
  if (!storage) return DEFAULT_VOLUME
  let raw: string | null = null
  try {
    raw = storage.getItem(VOLUME_STORAGE_KEY)
  } catch {
    return DEFAULT_VOLUME
  }
  if (raw === null) return DEFAULT_VOLUME
  const parsed = Number.parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_VOLUME
  return clamp(parsed, 0, 1)
}

/** Clamp to 0..1, persist, and notify subscribers with the clamped value. */
export function setMasterVolume(v: number): void {
  const value = clamp(v, 0, 1)
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(VOLUME_STORAGE_KEY, String(value))
    } catch {
      /* quota / disabled — keep going; the change still notifies live listeners */
    }
  }
  notify(value)
}

/** Register a change listener; returns an unsubscribe. Does not fire on register. */
export function subscribeVolume(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

function notify(v: number): void {
  for (const fn of listeners) {
    try {
      fn(v)
    } catch {
      /* a listener must not break the others (or the setter's caller) */
    }
  }
}

// Cross-tab sync: another tab (the lobby, or a second game) writing the key fires a
// `storage` event here. Guarded for non-browser test envs (no window).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== VOLUME_STORAGE_KEY) return
    notify(getMasterVolume())
  })
}
