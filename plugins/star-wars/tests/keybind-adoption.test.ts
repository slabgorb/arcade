import { describe, it, expect } from 'vitest'
import { resolveBindings } from '@shared/keybind'
import { CONTROL_MANIFEST } from '../src/shell/controls'

describe('star-wars key rebinding', () => {
  it('manifest declares every control with non-empty physical-code defaults', () => {
    expect(CONTROL_MANIFEST.length).toBeGreaterThan(0)
    for (const c of CONTROL_MANIFEST) {
      expect(c.defaults.length).toBeGreaterThan(0)
      for (const code of c.defaults) expect(code).toMatch(/^[A-Z][A-Za-z0-9]+$/) // physical e.code, not a bare char
    }
  })
  it('an override resolves onto the new code and drops the default', () => {
    const map = resolveBindings(CONTROL_MANIFEST, { fire: ['KeyJ'] })
    expect(map.fire).toEqual(['KeyJ'])
    expect(map.fire).not.toContain('Space')
    expect(map.start).toEqual(['Enter', 'NumpadEnter', 'Digit1', 'Numpad1']) // untouched actions keep defaults
  })
})
