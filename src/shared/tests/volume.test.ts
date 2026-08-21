import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFakeStorage, makeQuotaStorage } from './helpers/storage-stub'
import {
  getMasterVolume,
  setMasterVolume,
  subscribeVolume,
  VOLUME_STORAGE_KEY,
} from '@shared/volume'

function withStorage(s: Storage | undefined): void {
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true })
}

describe('volume', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  beforeEach(() => withStorage(makeFakeStorage()))
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('defaults to 1.0 when unset', () => {
    expect(getMasterVolume()).toBe(1)
  })

  it('persists and reads back a set value', () => {
    setMasterVolume(0.6)
    expect(getMasterVolume()).toBeCloseTo(0.6, 9)
    expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe('0.6')
  })

  it('clamps below 0 and above 1', () => {
    setMasterVolume(-0.5)
    expect(getMasterVolume()).toBe(0)
    setMasterVolume(2)
    expect(getMasterVolume()).toBe(1)
  })

  it('returns 1.0 when the stored value is unparseable', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, 'not-a-number')
    expect(getMasterVolume()).toBe(1)
  })

  it('returns 1.0 and does not throw when storage is absent', () => {
    withStorage(undefined)
    expect(() => getMasterVolume()).not.toThrow()
    expect(getMasterVolume()).toBe(1)
  })

  it('does not throw when persisting to a full/quota storage', () => {
    withStorage(makeQuotaStorage())
    expect(() => setMasterVolume(0.5)).not.toThrow()
  })

  it('notifies subscribers with the clamped value on set', () => {
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    setMasterVolume(0.3)
    setMasterVolume(5)
    off()
    setMasterVolume(0.9)
    expect(seen).toEqual([0.3, 1])
  })

  it('does not fire the subscriber on registration', () => {
    const fn = vi.fn()
    const off = subscribeVolume(fn)
    off()
    expect(fn).not.toHaveBeenCalled()
  })
})
