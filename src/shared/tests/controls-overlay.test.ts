import { describe, it, expect, vi } from 'vitest'
import { makeBindingStore, keybindKey } from '@shared/controls-overlay'

const font = vi.hoisted(() => {
  const calls: string[] = []
  return { calls, layoutText: (text: string) => { calls.push(text); return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 8, y: 0 }] }], width: 8 } } }
})
vi.mock('@shared/font', () => ({ layoutText: font.layoutText, CELL_H: 8 }))

import { drawControlsOverlay, bindingLabel } from '@shared/controls-overlay'
import type { ControlManifest, Screen } from '@shared/keybind'

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

const M: ControlManifest = [
  { action: 'thrust', label: 'THRUST', defaults: ['ArrowUp', 'KeyW'] },
  { action: 'fire', label: 'FIRE', defaults: ['Space'] },
]
function recCtx() {
  return { fillStyle: '', strokeStyle: '', shadowColor: '', shadowBlur: 0, lineWidth: 0,
    fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() } as unknown as CanvasRenderingContext2D
}

describe('bindingLabel', () => {
  it('maps codes to friendly glyphs and joins with / ', () => {
    expect(bindingLabel(['ArrowUp', 'KeyW'])).toBe('↑ / W')
  })
  it('renders an empty binding as a dash', () => {
    expect(bindingLabel([])).toBe('—')
  })
})

describe('drawControlsOverlay', () => {
  it('menu marks the cursor row and lists RESUME/CONTROLS', () => {
    font.calls.length = 0
    drawControlsOverlay(recCtx(), 800, 600, { name: 'menu', cursor: 1 }, {}, M, { color: '#0f0', opacity: 0.6 })
    expect(font.calls).toContain('  RESUME')
    expect(font.calls).toContain('> CONTROLS')
  })
  it('controls lists every label with its binding, plus RESET/BACK', () => {
    font.calls.length = 0
    const s: Screen = { name: 'controls', cursor: 0, capturing: null }
    const map = { thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] }
    drawControlsOverlay(recCtx(), 800, 600, s, map, M, { color: '#0f0', opacity: 0.6 })
    expect(font.calls.some((t) => t.includes('THRUST') && t.includes('↑ / W'))).toBe(true)
    expect(font.calls.some((t) => t.includes('FIRE') && t.includes('SPACE'))).toBe(true)
    expect(font.calls.some((t) => t.includes('RESET DEFAULTS'))).toBe(true)
    expect(font.calls.some((t) => t.includes('BACK'))).toBe(true)
  })
  it('the capturing row shows PRESS A KEY instead of its binding', () => {
    font.calls.length = 0
    const s: Screen = { name: 'controls', cursor: 0, capturing: 'thrust' }
    drawControlsOverlay(recCtx(), 800, 600, s, { thrust: ['ArrowUp'], fire: ['Space'] }, M, { color: '#0f0', opacity: 0.6 })
    expect(font.calls.some((t) => t.includes('THRUST') && t.includes('PRESS A KEY'))).toBe(true)
    expect(font.calls.some((t) => t.includes('THRUST') && t.includes('↑'))).toBe(false)
  })
})
