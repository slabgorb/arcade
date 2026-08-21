// @shared/keybind — sa1-5. PURE binding logic + the rebinding navigation state
// machine. DOM-free (no localStorage, ctx, or globals) so the purity guard scans
// it clean like view.ts/cabinet.ts. The browser half — storage, canvas render,
// key capture — lives in ./controls-overlay.ts.

/** A physical KeyboardEvent.code, e.g. 'KeyW' | 'ArrowUp' | 'Space'. Canonical fleet-wide. */
export type Binding = string

/** One remappable control a game declares. */
export interface Control {
  readonly action: string
  readonly label: string
  readonly defaults: readonly Binding[]
}

export type ControlManifest = readonly Control[]

/** Resolved bindings the shell reads each frame: action -> codes. */
export type BindingMap = Record<string, Binding[]>

/** Only the deltas from defaults — what we persist. */
export type Overrides = Record<string, Binding[]>

/** Defaults, with any override replacing a whole action's list. Fresh arrays so a
 *  caller mutating the result can never reach back into a manifest's defaults. */
export function resolveBindings(manifest: ControlManifest, overrides: Overrides): BindingMap {
  const map: BindingMap = {}
  for (const c of manifest) {
    const override = overrides[c.action]
    map[c.action] = override ? [...override] : [...c.defaults]
  }
  return map
}
