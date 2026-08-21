// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMasterVolume, subscribeVolume, VOLUME_STORAGE_KEY } from '@shared/volume'

// jsdom does NOT hand us a working `localStorage` by default — vitest's `populateGlobal`
// skips any key that already exists in globalThis. Node 25 ships a global `localStorage`
// that is an inert `{}`. Reach past the stub to jsdom's real Storage.
const jsdomWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
vi.stubGlobal('localStorage', jsdomWindow.localStorage)

describe('volume cross-tab sync', () => {
  afterEach(() => localStorage.clear())

  it('notifies subscribers when another tab writes the key', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, '0.25')
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    // Simulate the cross-tab write: jsdom does not fire `storage` for same-document
    // writes, so dispatch the event a real second tab would have produced.
    window.dispatchEvent(new StorageEvent('storage', { key: VOLUME_STORAGE_KEY, newValue: '0.25' }))
    off()
    expect(seen).toEqual([0.25])
    expect(getMasterVolume()).toBeCloseTo(0.25, 9)
  })

  it('ignores storage events for other keys', () => {
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else', newValue: 'x' }))
    off()
    expect(seen).toEqual([])
  })
})
