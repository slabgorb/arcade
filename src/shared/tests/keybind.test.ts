import { describe, it, expect } from 'vitest'
import { resolveBindings, type ControlManifest } from '@shared/keybind'

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
