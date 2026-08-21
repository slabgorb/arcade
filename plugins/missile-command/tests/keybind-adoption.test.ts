// plugins/missile-command/tests/keybind-adoption.test.ts — sa1-5. missile-command
// GAINS remappable key bindings for its four discrete keyboard controls (the three
// fire-base keys + the '1' start/abort switch). Mouse/crosshair/pointer input is
// deliberately OUTSIDE this manifest — see shell/controls.ts's header comment.
import { describe, it, expect } from 'vitest'
import { resolveBindings } from '@shared/keybind'
import { CONTROL_MANIFEST } from '../src/shell/controls.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

describe('sa1-5 overlay mouse handlers freeze game state while overlay is open', () => {
  it('pointerdown handler is guarded by overlay.isOpen() — no demo exit while rebinding', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const main = readFileSync(join(root, 'src', 'main.ts'), 'utf8')
    // The pointerdown listener (mc6-4) calls beginSetupOnInput, which mutates state
    // to leave the attract demo. The guard ensures this does not happen while the
    // overlay is open (the game is frozen).
    const pointerdownMatch = main.match(/canvas\.addEventListener\('pointerdown',\s*\(\)\s*=>\s*\{([^}]+)\}/s)
    expect(
      pointerdownMatch && pointerdownMatch[1].includes('if (overlay.isOpen()) return'),
      'pointerdown handler must guard on overlay.isOpen() to freeze while rebinding',
    ).toBe(true)
  })

  it('mousedown handler is guarded by overlay.isOpen() — no fire while rebinding', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const main = readFileSync(join(root, 'src', 'main.ts'), 'utf8')
    // The mousedown listener (pt1-12) calls mousedownReducer to fire a base or start
    // a new game. The guard ensures neither happens while the overlay is open.
    const mousedownMatch = main.match(/canvas\.addEventListener\('mousedown',\s*\([^)]*\)\s*:\s*void\s*=>\s*\{([^}]+)\}/s)
    expect(
      mousedownMatch && mousedownMatch[1].includes('if (overlay.isOpen()) return'),
      'mousedown handler must guard on overlay.isOpen() to freeze while rebinding',
    ).toBe(true)
  })

  it('mousemove handler is NOT guarded — crosshair tracking stays live', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const main = readFileSync(join(root, 'src', 'main.ts'), 'utf8')
    // mousemove only updates the cursor position (pure aim), not game state like
    // firing or starting. It may remain live while the overlay is open.
    const mousemoveMatch = main.match(/canvas\.addEventListener\('mousemove',\s*\([^)]*\)\s*:\s*void\s*=>\s*\{([^}]+)\}/s)
    expect(
      mousemoveMatch && !mousemoveMatch[1].includes('if (overlay.isOpen()) return'),
      'mousemove handler must NOT guard — crosshair tracking is a live cursor aim',
    ).toBe(true)
  })
})
