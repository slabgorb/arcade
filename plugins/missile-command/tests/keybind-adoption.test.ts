// plugins/missile-command/tests/keybind-adoption.test.ts — sa1-5. missile-command
// GAINS remappable key bindings for its four discrete keyboard controls (the three
// fire-base keys + the '1' start/abort switch). Mouse/crosshair/pointer input is
// deliberately OUTSIDE this manifest — see shell/controls.ts's header comment.
import { describe, it, expect } from 'vitest'
import { resolveBindings } from '@shared/keybind'
import { CONTROL_MANIFEST } from '../src/shell/controls.js'

describe('missile-command key rebinding', () => {
  it('manifest declares every control with non-empty physical-code defaults', () => {
    expect(CONTROL_MANIFEST.length).toBeGreaterThan(0)
    for (const c of CONTROL_MANIFEST) {
      expect(c.defaults.length).toBeGreaterThan(0)
      for (const code of c.defaults) expect(code).toMatch(/^[A-Z][A-Za-z0-9]+$/) // physical e.code, not a bare char
    }
  })

  it('an override resolves onto the new code and drops the default', () => {
    const map = resolveBindings(CONTROL_MANIFEST, { fireLeft: ['KeyJ'] })
    expect(map.fireLeft).toEqual(['KeyJ'])
    expect(map.fireLeft).not.toContain('KeyZ')
    // untouched actions keep their defaults
    expect(map.fireCentre).toEqual(['KeyX'])
    expect(map.fireRight).toEqual(['KeyC'])
    expect(map.start).toEqual(['Digit1'])
  })
})
