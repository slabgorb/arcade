// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMasterVolume, setMasterVolume } from '@shared/volume'
import { mountVolumeControl } from '@shared/volume-ui'

// jsdom's ambient `localStorage` is not wired up by vitest's `populateGlobal` (it
// skips keys already present on globalThis) — Node ships an inert stub of its own
// that has no getItem/setItem. Reach past it to jsdom's real Storage, same idiom
// as tests/highscore.dom.test.ts.
const jsdomWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
vi.stubGlobal('localStorage', jsdomWindow.localStorage)

describe('volume-ui', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    setMasterVolume(1)
  })

  function range(root: ParentNode): HTMLInputElement {
    const el = root.querySelector('input[type="range"]')
    if (!el) throw new Error('no range input mounted')
    return el as HTMLInputElement
  }

  it('renders a range input at the current volume with an aria-label', () => {
    setMasterVolume(0.6)
    const h = mountVolumeControl({ root: document.body })
    const input = range(document.body)
    expect(input.valueAsNumber).toBeCloseTo(0.6, 9)
    expect(input.getAttribute('aria-label')).toBe('Master volume')
    h.destroy()
  })

  it('writes volume on input', () => {
    const h = mountVolumeControl({ root: document.body })
    const input = range(document.body)
    input.value = '0.3'
    input.dispatchEvent(new Event('input'))
    expect(getMasterVolume()).toBeCloseTo(0.3, 9)
    h.destroy()
  })

  it('reflects an external volume change', () => {
    const h = mountVolumeControl({ root: document.body })
    setMasterVolume(0.15)
    expect(range(document.body).valueAsNumber).toBeCloseTo(0.15, 9)
    h.destroy()
  })

  it('is hidden by default and toggles with setVisible', () => {
    const h = mountVolumeControl({ root: document.body })
    expect(h.element.hidden).toBe(true)
    h.setVisible(true)
    expect(h.element.hidden).toBe(false)
    h.destroy()
  })

  it('is visible from the start when initiallyVisible', () => {
    const h = mountVolumeControl({ root: document.body, initiallyVisible: true })
    expect(h.element.hidden).toBe(false)
    h.destroy()
  })

  it('destroy removes the element and stops reflecting changes', () => {
    const h = mountVolumeControl({ root: document.body })
    h.destroy()
    expect(document.body.querySelector('input[type="range"]')).toBeNull()
    expect(() => setMasterVolume(0.4)).not.toThrow()
  })
})
