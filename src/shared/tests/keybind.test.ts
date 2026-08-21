import { describe, it, expect } from 'vitest'
import { resolveBindings, applyRebind, resetToDefaults, diffOverrides, parseOverrides, type ControlManifest } from '@shared/keybind'

const MANIFEST: ControlManifest = [
  { action: 'thrust', label: 'THRUST', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
]

describe('resolveBindings', () => {
  it('returns the defaults when there are no overrides', () => {
    expect(resolveBindings(MANIFEST, {})).toEqual({ thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })
  })
  it('replaces a single action from overrides, leaving the rest at default', () => {
    expect(resolveBindings(MANIFEST, { fire: ['KeyJ'] })).toEqual({ thrust: ['ArrowUp', 'KeyW'], fire: ['KeyJ'] })
  })
  it('ignores overrides for unknown actions', () => {
    expect(resolveBindings(MANIFEST, { warp: ['KeyX'] })).toEqual({ thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })
  })
  it('returns fresh arrays — mutating the result never touches the manifest defaults', () => {
    const map = resolveBindings(MANIFEST, {})
    map.thrust.push('KeyZ')
    expect(MANIFEST[0].defaults).toEqual(['ArrowUp', 'KeyW'])
  })
})

describe('applyRebind', () => {
  const base = { thrust: ['ArrowUp', 'KeyW'], fire: ['Space'], start: ['Space', 'Enter'] }

  it('replaces the action binding with exactly the captured code', () => {
    const { map } = applyRebind(base, 'thrust', 'KeyJ')
    expect(map.thrust).toEqual(['KeyJ'])
  })
  it('does not mutate the input map', () => {
    applyRebind(base, 'thrust', 'KeyJ')
    expect(base.thrust).toEqual(['ArrowUp', 'KeyW'])
  })
  it('never auto-unbinds another action that shares the code (Space stays on start)', () => {
    const { map } = applyRebind(base, 'fire', 'Space')
    expect(map.start).toEqual(['Space', 'Enter'])
  })
  it('reports the other actions already holding the captured code', () => {
    const { alsoBoundTo } = applyRebind(base, 'fire', 'Enter')
    expect(alsoBoundTo).toEqual(['start'])
  })
  it('reports no overlap for a fresh code', () => {
    expect(applyRebind(base, 'fire', 'KeyK').alsoBoundTo).toEqual([])
  })
})

describe('resetToDefaults', () => {
  it('rebuilds the full default map', () => {
    expect(resetToDefaults(MANIFEST)).toEqual({ thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })
  })
})

describe('diffOverrides', () => {
  it('is empty when the map equals the defaults', () => {
    expect(diffOverrides(MANIFEST, { thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })).toEqual({})
  })
  it('keeps only actions whose list differs (order-insensitive)', () => {
    expect(diffOverrides(MANIFEST, { thrust: ['KeyW', 'ArrowUp'], fire: ['KeyJ'] })).toEqual({ fire: ['KeyJ'] })
  })
  it('round-trips with resolveBindings', () => {
    const map = { thrust: ['ArrowUp', 'KeyW'], fire: ['KeyJ'] }
    expect(resolveBindings(MANIFEST, diffOverrides(MANIFEST, map))).toEqual(map)
  })
})

describe('parseOverrides', () => {
  it('accepts a record of action -> string[]', () => {
    expect(parseOverrides({ fire: ['KeyJ'], thrust: ['KeyW', 'ArrowUp'] })).toEqual({ fire: ['KeyJ'], thrust: ['KeyW', 'ArrowUp'] })
  })
  it('accepts the empty record', () => {
    expect(parseOverrides({})).toEqual({})
  })
  it('rejects non-objects', () => {
    expect(parseOverrides(null)).toBeNull()
    expect(parseOverrides('nope')).toBeNull()
    expect(parseOverrides(['a'])).toBeNull()
  })
  it('rejects a value that is not a string array', () => {
    expect(parseOverrides({ fire: 'KeyJ' })).toBeNull()
    expect(parseOverrides({ fire: [1, 2] })).toBeNull()
  })
})
