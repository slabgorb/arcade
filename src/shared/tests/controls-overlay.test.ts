import { describe, it, expect } from 'vitest'
import { makeBindingStore, keybindKey } from '@shared/controls-overlay'

function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  } as Storage
}

describe('makeBindingStore', () => {
  it('round-trips overrides under the per-game key', () => {
    const s = memStorage()
    makeBindingStore('asteroids', s).save({ fire: ['KeyJ'] })
    expect(s.getItem(keybindKey('asteroids'))).toContain('KeyJ')
    expect(makeBindingStore('asteroids', s).load()).toEqual({ fire: ['KeyJ'] })
  })
  it('returns {} when nothing is stored', () => {
    expect(makeBindingStore('asteroids', memStorage()).load()).toEqual({})
  })
  it('returns {} for corrupt JSON, never throws', () => {
    const s = memStorage(); s.setItem(keybindKey('asteroids'), '{not json')
    expect(makeBindingStore('asteroids', s).load()).toEqual({})
  })
  it('returns {} for structurally invalid data', () => {
    const s = memStorage(); s.setItem(keybindKey('asteroids'), JSON.stringify({ fire: 'KeyJ' }))
    expect(makeBindingStore('asteroids', s).load()).toEqual({})
  })
  it('degrades to in-memory no-op when storage is null', () => {
    const store = makeBindingStore('asteroids', null)
    expect(() => store.save({ fire: ['KeyJ'] })).not.toThrow()
    expect(store.load()).toEqual({})
  })
})
