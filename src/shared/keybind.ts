// @shared/keybind — sa1-5. PURE binding logic + the rebinding navigation state
// machine. DOM-free (no localStorage, ctx, or globals) so the purity guard scans
// it clean like view.ts/cabinet.ts. The browser half — storage, rendering,
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

/** Set `action` to the single captured `code` (replace, not append). NEVER
 *  auto-unbinds another action — deliberate overlaps exist (Space = fire+start).
 *  `alsoBoundTo` lists the other actions already holding `code`, for a note only. */
export function applyRebind(
  map: BindingMap,
  action: string,
  code: Binding,
): { map: BindingMap; alsoBoundTo: string[] } {
  const next: BindingMap = {}
  for (const a of Object.keys(map)) next[a] = [...map[a]]
  const alsoBoundTo = Object.keys(map).filter((a) => a !== action && map[a].includes(code))
  next[action] = [code]
  return { map: next, alsoBoundTo }
}

export function resetToDefaults(manifest: ControlManifest): BindingMap {
  return resolveBindings(manifest, {})
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')

/** Reduce a resolved map to only the actions whose binding list differs from the
 *  manifest default (order-insensitive). That delta is what we persist, so a later
 *  change to a game's default still reaches players who never touched that action. */
export function diffOverrides(manifest: ControlManifest, map: BindingMap): Overrides {
  const out: Overrides = {}
  for (const c of manifest) {
    const cur = map[c.action]
    if (cur && !sameSet(cur, c.defaults)) out[c.action] = [...cur]
  }
  return out
}

/** Parse persisted JSON into Overrides, or null if malformed (the storage guard). */
export function parseOverrides(raw: unknown): Overrides | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const out: Overrides = {}
  for (const [action, codes] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(codes) || !codes.every((c) => typeof c === 'string')) return null
    out[action] = codes as string[]
  }
  return out
}
