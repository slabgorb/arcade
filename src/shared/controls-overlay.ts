// @shared/controls-overlay — sa1-5. The BROWSER half of key rebinding: the
// localStorage store, the canvas overlay renderer, and the keydown-capture
// controller. ADR-0003 browser subpath — classified by its dirtiest dependency
// (localStorage + ctx), like esc-overlay.ts and highscore.ts. Pure binding logic
// and the navigation state machine live in ./keybind.ts.
import { parseOverrides, type Overrides, MENU_ITEMS, type Screen, type BindingMap, type ControlManifest, type Binding, resolveBindings, diffOverrides, resetToDefaults, rebindReduce, INITIAL_SCREEN } from './keybind.js'
import { strokeCardLine } from './esc-overlay.js'

export interface BindingStore {
  load(): Overrides
  save(overrides: Overrides): void
}

export function keybindKey(gameId: string): string {
  return `${gameId}-keybinds`
}

// Defensive access — reading the global can throw in sandboxed contexts (highscore idiom).
function defaultStorage(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function makeBindingStore(gameId: string, storage: Storage | null = defaultStorage()): BindingStore {
  const key = keybindKey(gameId)
  return {
    load(): Overrides {
      if (!storage) return {}
      let raw: string | null
      try { raw = storage.getItem(key) } catch { return {} }
      if (raw === null) return {}
      try { return parseOverrides(JSON.parse(raw)) ?? {} } catch { return {} }
    },
    save(overrides: Overrides): void {
      if (!storage) return
      try { storage.setItem(key, JSON.stringify(overrides)) } catch { /* quota / unavailable — no-op */ }
    },
  }
}

// The canvas renderer for the controls-rebinding overlay (menu + controls
// screens). Reuses esc-overlay's dim-panel + centred-card mechanism
// (strokeCardLine) rather than duplicating it.

const GLYPH: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
}
function codeLabel(code: string): string {
  if (GLYPH[code]) return GLYPH[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  return code
}

/** Friendly glyphs for a control's bound codes, joined with ' / '; '—' when unbound. */
export function bindingLabel(codes: readonly Binding[]): string {
  return codes.length === 0 ? '—' : codes.map(codeLabel).join(' / ')
}

/** Per-cabinet parameters — mirrors EscOverlayOptions minus `lines` (this
 *  renderer derives its own lines from screen/map/manifest). */
export interface ControlsOverlayOptions {
  readonly color: string
  readonly opacity: number
}

/**
 * Draw the controls-rebinding overlay: the dim panel (shared with
 * drawEscOverlay), then either the menu (RESUME/CONTROLS) or the controls
 * list (one row per control, then RESET DEFAULTS, then BACK). The row under
 * capture shows "PRESS A KEY" instead of its current binding.
 */
export function drawControlsOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  screen: Screen,
  map: BindingMap,
  manifest: ControlManifest,
  opts: ControlsOverlayOptions,
): void {
  // The dim panel — shadowBlur 0 first so the black box never glows.
  ctx.shadowBlur = 0
  ctx.fillStyle = `rgba(0, 0, 0, ${opts.opacity})`
  ctx.fillRect(0, 0, w, h)

  const lines: string[] = []
  if (screen.name === 'menu') {
    MENU_ITEMS.forEach((item, i) => lines.push(`${i === screen.cursor ? '> ' : '  '}${item}`))
  } else {
    manifest.forEach((c, i) => {
      const val = screen.capturing === c.action ? 'PRESS A KEY' : bindingLabel(map[c.action] ?? [])
      lines.push(`${i === screen.cursor ? '> ' : '  '}${c.label}   [ ${val} ]`)
    })
    const resetIdx = manifest.length
    const backIdx = manifest.length + 1
    lines.push(`${screen.cursor === resetIdx ? '> ' : '  '}RESET DEFAULTS`)
    lines.push(`${screen.cursor === backIdx ? '> ' : '  '}BACK`)
  }

  const size = Math.max(14, Math.round(Math.min(w, h) * 0.04))
  const lineHeight = size * 1.6
  const top = h / 2 - (lines.length - 1) * lineHeight * 0.5
  lines.forEach((line, i) => strokeCardLine(ctx, line, w / 2, top + i * lineHeight + size / 2, size, opts.color))
}

/**
 * The keydown-capture controller: owns the live binding map, the current
 * screen, and the open/closed state, and wires keyboard input through
 * keybind.ts's pure `rebindReduce` state machine into `store` (persist) and
 * `onChange` (the shell's live-binding callback). This is the integration
 * keystone every game wires its ESC/pause path to.
 */
export interface ControlsOverlay {
  open(): void
  close(): void
  isOpen(): boolean
  handleKey(e: KeyboardEvent): boolean // true = consumed
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void
  readonly bindings: BindingMap
}

export function createControlsOverlay(args: {
  manifest: ControlManifest
  store: BindingStore
  opts: ControlsOverlayOptions
  onChange?: (map: BindingMap) => void
}): ControlsOverlay {
  const { manifest, store, opts, onChange } = args
  let map = resolveBindings(manifest, store.load())
  let screen: Screen = INITIAL_SCREEN
  let open = false

  const toEvent = (code: string) => {
    if (screen.name === 'controls' && screen.capturing !== null) {
      return code === 'Escape' ? { t: 'back' as const } : { t: 'capture' as const, code }
    }
    if (code === 'ArrowUp' || code === 'KeyW') return { t: 'up' as const }
    if (code === 'ArrowDown' || code === 'KeyS') return { t: 'down' as const }
    if (code === 'Enter' || code === 'Space') return { t: 'select' as const }
    if (code === 'Escape') return { t: 'back' as const }
    return null
  }

  return {
    open() { open = true; screen = INITIAL_SCREEN },
    close() { open = false },
    isOpen: () => open,
    get bindings() { return map },
    handleKey(e: KeyboardEvent): boolean {
      if (!open) return false
      const ev = toEvent(e.code)
      if (ev) {
        const r = rebindReduce(screen, map, manifest, ev)
        screen = r.screen; map = r.map
        if (r.command === 'resume') open = false
        else if (r.command === 'save') { store.save(diffOverrides(manifest, map)); onChange?.(map) }
        else if (r.command === 'reset') { map = resetToDefaults(manifest); store.save({}); onChange?.(map) }
      }
      e.preventDefault()
      return true
    },
    draw(ctx, w, h) { if (open) drawControlsOverlay(ctx, w, h, screen, map, manifest, opts) },
  }
}
