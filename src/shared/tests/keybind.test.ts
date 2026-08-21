import { describe, it, expect } from 'vitest'
import { resolveBindings, applyRebind, type ControlManifest } from '@shared/keybind'

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
