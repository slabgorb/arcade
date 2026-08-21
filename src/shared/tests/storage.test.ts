import { afterEach, describe, expect, it } from 'vitest'
import { getStorage } from '@shared/storage'
import { makeFakeStorage } from './helpers/storage-stub'

describe('getStorage', () => {
  const g = globalThis as { localStorage?: Storage | undefined }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete g.localStorage
  })

  it('returns the global localStorage when present', () => {
    const fake = makeFakeStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
    expect(getStorage()).toBe(fake)
  })

  it('returns null when localStorage is absent', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(getStorage()).toBeNull()
  })

  it('returns null (does not throw) when reading localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: access denied')
      },
    })
    expect(() => getStorage()).not.toThrow()
    expect(getStorage()).toBeNull()
  })
})
