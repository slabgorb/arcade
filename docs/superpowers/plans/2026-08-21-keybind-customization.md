# Key Binding Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players remap every game's keyboard controls through one shared, ESC-reachable rebinding overlay, persisted per game.

**Architecture:** A pure `@shared/keybind` module (binding types, resolve/rebind/reset logic, a pure navigation state machine) plus a browser `@shared/controls-overlay` module (localStorage store, canvas renderer, keydown-capture controller). Every game declares a `ControlManifest` and reads input from resolved bindings instead of a hard-coded key table, canonicalising the whole fleet on physical `KeyboardEvent.code`.

**Tech Stack:** TypeScript, Vite, Vitest (per-app projects), node:test (orchestrator), Canvas 2D + `@shared/font` vector glyphs.

**Spec:** `docs/superpowers/specs/2026-08-21-keybind-customization-design.md`

## Global Constraints

- **Node ≥ 22.18** — `scripts/` import `.ts` directly via native type-stripping.
- **Pure/browser split is mechanically enforced.** `keybind.ts` must be DOM-free (no `localStorage`, `document`, `window`, `CanvasRenderingContext2D`) or the purity guard fails. `controls-overlay.ts` is an ADR-0003 browser subpath, classified by its dirtiest dependency like `esc-overlay.ts`/`highscore.ts`.
- **Canonical binding token = physical `KeyboardEvent.code`** (`'KeyW'`, `'ArrowUp'`, `'Space'`, `'ShiftLeft'`). Never `e.key`.
- **Defensive storage** — copy the `getStorage()` idiom from `src/shared/highscore.ts`: every storage failure mode degrades (load → defaults, save → no-op), never throws.
- **Two test runners, no overlap.** Shared + per-game specs are Vitest (`npx vitest run --project <app>`); cabinet-wide invariants are node:test (`npm run test:orchestrator`). New shared tests go in `src/shared/tests/`; the convergence guard goes in `tests/`.
- **Commit structure (AC-3 of `tests/shell-convergence.test.mjs`):** any commit that changes more than one game's `main.ts` reddens the tree. Infra lands in commits touching **no** `main.ts`; each game's adoption is **its own** commit.
- **Type check:** `npm run lint` (`tsc --noEmit`, repo-wide) is the only type check — run it before finishing any task that adds/changes types.
- **Lint/format:** `npm run lint` for types; the repo's existing eslint/prettier config governs style — match surrounding files.

---

## File Structure

- **Create `src/shared/keybind.ts`** — pure. Types (`Binding`, `Control`, `ControlManifest`, `BindingMap`, `Overrides`, `Screen`, `RebindEvent`, `RebindCommand`) + `resolveBindings`, `applyRebind`, `resetToDefaults`, `diffOverrides`, `parseOverrides`, `rebindReduce`.
- **Create `src/shared/controls-overlay.ts`** — browser. `makeBindingStore`, `drawControlsOverlay`, `createControlsOverlay`.
- **Create `src/shared/tests/keybind.test.ts`** — pure-logic + state-machine specs (Vitest, shared project).
- **Create `src/shared/tests/controls-overlay.test.ts`** — store + renderer specs (recording-ctx + storage-stub).
- **Create `tests/keybind-convergence.test.mjs`** — orchestrator guard: every game exports a `ControlManifest` and routes input through resolved bindings.
- **Modify `src/shared/index.ts`** — document the two new subpaths in the barrel comment (no runtime export needed; games import from `@shared/keybind` / `@shared/controls-overlay` directly, matching `@shared/held-keys`).
- **Per game (×12): Create `plugins/<id>/src/shell/controls.ts`** (the `ControlManifest` + `makeBindingStore`-backed default map) and **Modify `plugins/<id>/src/shell/input.ts`** (read resolved bindings) and **`plugins/<id>/src/main.ts`** (wire `createControlsOverlay`). **Create `plugins/<id>/tests/keybind-adoption.test.ts`** (per-game override proof).

---

## Phase 1 — Pure core (`src/shared/keybind.ts`)

### Task 1: Binding types + `resolveBindings`

**Files:**
- Create: `src/shared/keybind.ts`
- Test: `src/shared/tests/keybind.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Binding = string
  export interface Control { readonly action: string; readonly label: string; readonly defaults: readonly Binding[] }
  export type ControlManifest = readonly Control[]
  export type BindingMap = Record<string, Binding[]>
  export type Overrides = Record<string, Binding[]>
  export function resolveBindings(manifest: ControlManifest, overrides: Overrides): BindingMap
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/tests/keybind.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project shared src/shared/tests/keybind.test.ts`
Expected: FAIL — `keybind` module / `resolveBindings` not found. (If `--project shared` is not the shared project id, run `npx vitest run src/shared/tests/keybind.test.ts`; the shared tests root is `src/shared`.)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/keybind.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/tests/keybind.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/keybind.ts src/shared/tests/keybind.test.ts
git commit -m "feat(sa1-5): keybind types + resolveBindings"
```

---

### Task 2: `applyRebind` (replace, report overlaps)

**Files:**
- Modify: `src/shared/keybind.ts`
- Test: `src/shared/tests/keybind.test.ts`

**Interfaces:**
- Consumes: `BindingMap` (Task 1).
- Produces: `export function applyRebind(map: BindingMap, action: string, code: Binding): { map: BindingMap; alsoBoundTo: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { applyRebind } from '@shared/keybind'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/tests/keybind.test.ts`
Expected: FAIL — `applyRebind` not exported.

- [ ] **Step 3: Write minimal implementation** (append to `keybind.ts`)

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/tests/keybind.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/keybind.ts src/shared/tests/keybind.test.ts
git commit -m "feat(sa1-5): applyRebind — replace, report overlaps, no auto-unbind"
```

---

### Task 3: `resetToDefaults` + `diffOverrides`

**Files:**
- Modify: `src/shared/keybind.ts`
- Test: `src/shared/tests/keybind.test.ts`

**Interfaces:**
- Consumes: `ControlManifest`, `BindingMap`, `Overrides` (Task 1).
- Produces:
  ```ts
  export function resetToDefaults(manifest: ControlManifest): BindingMap
  export function diffOverrides(manifest: ControlManifest, map: BindingMap): Overrides
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { resetToDefaults, diffOverrides } from '@shared/keybind'

describe('resetToDefaults', () => {
  it('rebuilds the full default map', () => {
    expect(resetToDefaults(MANIFEST)).toEqual({ thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })
  })
})

describe('diffOverrides', () => {
  it('is empty when the map equals the defaults', () => {
    expect(diffOverrides(MANIFEST, { thrust: ['ArrowUp', 'KeyW'], fire: ['Space'] })).toEqual({})
  })
  it('keeps only actions whose list differs (order-insensitive)', () => {
    expect(diffOverrides(MANIFEST, { thrust: ['KeyW', 'ArrowUp'], fire: ['KeyJ'] })).toEqual({ fire: ['KeyJ'] })
  })
  it('round-trips with resolveBindings', () => {
    const map = { thrust: ['ArrowUp', 'KeyW'], fire: ['KeyJ'] }
    expect(resolveBindings(MANIFEST, diffOverrides(MANIFEST, map))).toEqual(map)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/shared/tests/keybind.test.ts` — FAIL (not exported).

- [ ] **Step 3: Implement** (append)

```ts
export function resetToDefaults(manifest: ControlManifest): BindingMap {
  return resolveBindings(manifest, {})
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')

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
```

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/keybind.ts src/shared/tests/keybind.test.ts
git commit -m "feat(sa1-5): resetToDefaults + diffOverrides (persist only deltas)"
```

---

### Task 4: `parseOverrides` (storage guard)

**Files:**
- Modify: `src/shared/keybind.ts`
- Test: `src/shared/tests/keybind.test.ts`

**Interfaces:**
- Produces: `export function parseOverrides(raw: unknown): Overrides | null`

- [ ] **Step 1: Write the failing test**

```ts
import { parseOverrides } from '@shared/keybind'

describe('parseOverrides', () => {
  it('accepts a record of action -> string[]', () => {
    expect(parseOverrides({ fire: ['KeyJ'], thrust: ['KeyW', 'ArrowUp'] })).toEqual({ fire: ['KeyJ'], thrust: ['KeyW', 'ArrowUp'] })
  })
  it('accepts the empty record', () => {
    expect(parseOverrides({})).toEqual({})
  })
  it('rejects non-objects', () => {
    expect(parseOverrides(null)).toBeNull()
    expect(parseOverrides('nope')).toBeNull()
    expect(parseOverrides(['a'])).toBeNull()
  })
  it('rejects a value that is not a string array', () => {
    expect(parseOverrides({ fire: 'KeyJ' })).toBeNull()
    expect(parseOverrides({ fire: [1, 2] })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** (append)

```ts
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
```

- [ ] **Step 4: Run to verify it passes** — PASS. Then `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/keybind.ts src/shared/tests/keybind.test.ts
git commit -m "feat(sa1-5): parseOverrides storage guard"
```

---

### Task 5: `rebindReduce` navigation state machine

**Files:**
- Modify: `src/shared/keybind.ts`
- Test: `src/shared/tests/keybind.test.ts`

**Interfaces:**
- Consumes: `ControlManifest`, `BindingMap`, `applyRebind` (Tasks 1–2).
- Produces:
  ```ts
  export type Screen =
    | { readonly name: 'menu'; readonly cursor: number }
    | { readonly name: 'controls'; readonly cursor: number; readonly capturing: string | null }
  export type RebindEvent =
    | { readonly t: 'up' } | { readonly t: 'down' } | { readonly t: 'select' } | { readonly t: 'back' }
    | { readonly t: 'capture'; readonly code: Binding }
  export type RebindCommand = 'resume' | 'save' | 'reset'
  export const MENU_ITEMS: readonly string[]  // ['RESUME','CONTROLS']
  export const INITIAL_SCREEN: Screen          // { name:'menu', cursor:0 }
  export function controlsRowCount(manifest: ControlManifest): number  // actions + 2 (RESET, BACK)
  export function rebindReduce(
    screen: Screen, map: BindingMap, manifest: ControlManifest, event: RebindEvent,
  ): { screen: Screen; map: BindingMap; command?: RebindCommand }
  ```

**Navigation contract** (encode these exact rules):
- `menu` rows are `MENU_ITEMS` = `['RESUME', 'CONTROLS']`. `up`/`down` move the cursor, clamped (no wrap). `select` on `RESUME` → `command:'resume'`. `select` on `CONTROLS` → screen `{name:'controls',cursor:0,capturing:null}`. `back` on menu → `command:'resume'`.
- `controls` rows are `manifest.length` action rows, then `RESET DEFAULTS` (index `manifest.length`), then `BACK` (index `manifest.length + 1`). `up`/`down` clamp.
- `controls`, not capturing: `select` on an action row → set `capturing` to that action's id. `select` on `RESET DEFAULTS` → `command:'reset'` (caller rebuilds+saves; screen stays). `select` on `BACK` → screen `{name:'menu',cursor:1}` (cursor back on CONTROLS) and `command:'save'`. `back` → same as selecting `BACK`.
- `controls`, capturing !== null: `capture(code)` → `applyRebind(map, capturing, code)`, clear `capturing`, `command:'save'`. `back` while capturing → cancel (clear `capturing`, no command). `up`/`down`/`select` are ignored while capturing.

- [ ] **Step 1: Write the failing test**

```ts
import { rebindReduce, INITIAL_SCREEN, MENU_ITEMS, controlsRowCount, type Screen } from '@shared/keybind'

const map = { thrust: ['ArrowUp'], fire: ['Space'] }
const M = MANIFEST // thrust,fire

describe('rebindReduce — menu', () => {
  it('down then up clamps at the ends', () => {
    let s = INITIAL_SCREEN
    s = rebindReduce(s, map, M, { t: 'up' }).screen           // already top
    expect(s).toEqual({ name: 'menu', cursor: 0 })
    s = rebindReduce(s, map, M, { t: 'down' }).screen
    s = rebindReduce(s, map, M, { t: 'down' }).screen         // clamp at RESUME/CONTROLS end
    expect(s).toEqual({ name: 'menu', cursor: MENU_ITEMS.length - 1 })
  })
  it('RESUME emits resume', () => {
    expect(rebindReduce({ name: 'menu', cursor: 0 }, map, M, { t: 'select' }).command).toBe('resume')
  })
  it('CONTROLS enters the controls screen', () => {
    expect(rebindReduce({ name: 'menu', cursor: 1 }, map, M, { t: 'select' }).screen)
      .toEqual({ name: 'controls', cursor: 0, capturing: null })
  })
})

describe('rebindReduce — controls', () => {
  const controls: Screen = { name: 'controls', cursor: 0, capturing: null }
  it('has actions + RESET + BACK rows', () => {
    expect(controlsRowCount(M)).toBe(M.length + 2)
  })
  it('select on an action begins capture', () => {
    expect(rebindReduce(controls, map, M, { t: 'select' }).screen)
      .toEqual({ name: 'controls', cursor: 0, capturing: 'thrust' })
  })
  it('capture rebinds, clears capturing, and requests save', () => {
    const capturing: Screen = { name: 'controls', cursor: 0, capturing: 'thrust' }
    const r = rebindReduce(capturing, map, M, { t: 'capture', code: 'KeyT' })
    expect(r.map.thrust).toEqual(['KeyT'])
    expect(r.screen).toEqual({ name: 'controls', cursor: 0, capturing: null })
    expect(r.command).toBe('save')
  })
  it('back while capturing cancels without saving', () => {
    const capturing: Screen = { name: 'controls', cursor: 0, capturing: 'thrust' }
    const r = rebindReduce(capturing, map, M, { t: 'back' })
    expect(r.screen).toEqual({ name: 'controls', cursor: 0, capturing: null })
    expect(r.command).toBeUndefined()
    expect(r.map).toEqual(map)
  })
  it('RESET emits reset', () => {
    const onReset: Screen = { name: 'controls', cursor: M.length, capturing: null }
    expect(rebindReduce(onReset, map, M, { t: 'select' }).command).toBe('reset')
  })
  it('BACK returns to the menu on CONTROLS and saves', () => {
    const onBack: Screen = { name: 'controls', cursor: M.length + 1, capturing: null }
    const r = rebindReduce(onBack, map, M, { t: 'select' })
    expect(r.screen).toEqual({ name: 'menu', cursor: 1 })
    expect(r.command).toBe('save')
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** (append). Encode the contract exactly:

```ts
export type Screen =
  | { readonly name: 'menu'; readonly cursor: number }
  | { readonly name: 'controls'; readonly cursor: number; readonly capturing: string | null }

export type RebindEvent =
  | { readonly t: 'up' } | { readonly t: 'down' } | { readonly t: 'select' } | { readonly t: 'back' }
  | { readonly t: 'capture'; readonly code: Binding }

export type RebindCommand = 'resume' | 'save' | 'reset'

export const MENU_ITEMS = ['RESUME', 'CONTROLS'] as const
export const INITIAL_SCREEN: Screen = { name: 'menu', cursor: 0 }

/** action rows + RESET DEFAULTS + BACK. */
export function controlsRowCount(manifest: ControlManifest): number {
  return manifest.length + 2
}

const clamp = (n: number, max: number): number => (n < 0 ? 0 : n > max ? max : n)

export function rebindReduce(
  screen: Screen,
  map: BindingMap,
  manifest: ControlManifest,
  event: RebindEvent,
): { screen: Screen; map: BindingMap; command?: RebindCommand } {
  if (screen.name === 'menu') {
    switch (event.t) {
      case 'up': return { screen: { ...screen, cursor: clamp(screen.cursor - 1, MENU_ITEMS.length - 1) }, map }
      case 'down': return { screen: { ...screen, cursor: clamp(screen.cursor + 1, MENU_ITEMS.length - 1) }, map }
      case 'back': return { screen, map, command: 'resume' }
      case 'select':
        return screen.cursor === 0
          ? { screen, map, command: 'resume' }
          : { screen: { name: 'controls', cursor: 0, capturing: null }, map }
      default: return { screen, map }
    }
  }
  // controls
  const rows = controlsRowCount(manifest)
  const resetIdx = manifest.length
  const backIdx = manifest.length + 1
  if (screen.capturing !== null) {
    if (event.t === 'capture') {
      const { map: next } = applyRebind(map, screen.capturing, event.code)
      return { screen: { ...screen, capturing: null }, map: next, command: 'save' }
    }
    if (event.t === 'back') return { screen: { ...screen, capturing: null }, map }
    return { screen, map }
  }
  switch (event.t) {
    case 'up': return { screen: { ...screen, cursor: clamp(screen.cursor - 1, rows - 1) }, map }
    case 'down': return { screen: { ...screen, cursor: clamp(screen.cursor + 1, rows - 1) }, map }
    case 'back': return { screen: { name: 'menu', cursor: 1 }, map, command: 'save' }
    case 'select':
      if (screen.cursor === backIdx) return { screen: { name: 'menu', cursor: 1 }, map, command: 'save' }
      if (screen.cursor === resetIdx) return { screen, map, command: 'reset' }
      return { screen: { ...screen, capturing: manifest[screen.cursor].action }, map }
    default: return { screen, map }
  }
}
```

- [ ] **Step 4: Run to verify it passes** — PASS. Then `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/keybind.ts src/shared/tests/keybind.test.ts
git commit -m "feat(sa1-5): rebindReduce navigation state machine"
```

---

## Phase 2 — Browser module (`src/shared/controls-overlay.ts`)

### Task 6: `makeBindingStore`

**Files:**
- Create: `src/shared/controls-overlay.ts`
- Test: `src/shared/tests/controls-overlay.test.ts`
- Reference: `src/shared/highscore.ts` (the `getStorage()` idiom), `src/shared/tests/helpers/storage-stub.ts`

**Interfaces:**
- Consumes: `Overrides`, `parseOverrides` (Phase 1).
- Produces:
  ```ts
  export interface BindingStore { load(): Overrides; save(overrides: Overrides): void }
  export function makeBindingStore(gameId: string, storage?: Storage | null): BindingStore
  export function keybindKey(gameId: string): string   // `${gameId}-keybinds`
  ```

- [ ] **Step 1: Write the failing test** (check the existing `storage-stub.ts` API first and use it; the shape below is a plain in-memory `Storage`):

```ts
// src/shared/tests/controls-overlay.test.ts
import { describe, it, expect } from 'vitest'
import { makeBindingStore, keybindKey } from '@shared/controls-overlay'

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
```

- [ ] **Step 2: Run to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/shared/controls-overlay.ts
// @shared/controls-overlay — sa1-5. The BROWSER half of key rebinding: the
// localStorage store, the canvas overlay renderer, and the keydown-capture
// controller. ADR-0003 browser subpath — classified by its dirtiest dependency
// (localStorage + ctx), like esc-overlay.ts and highscore.ts. Pure binding logic
// and the navigation state machine live in ./keybind.ts.
import {
  parseOverrides, resolveBindings, resetToDefaults, diffOverrides, rebindReduce,
  INITIAL_SCREEN, MENU_ITEMS, controlsRowCount,
  type Overrides, type ControlManifest, type BindingMap, type Screen, type Binding,
} from './keybind.js'

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
```

- [ ] **Step 4: Run to verify it passes** — PASS. Then `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/controls-overlay.ts src/shared/tests/controls-overlay.test.ts
git commit -m "feat(sa1-5): makeBindingStore — defensive per-game localStorage"
```

---

### Task 7: `drawControlsOverlay` renderer

**Files:**
- Modify: `src/shared/controls-overlay.ts`
- Modify: `src/shared/esc-overlay.ts` — export `strokeCardLine` so the new renderer reuses it (it is currently module-private).
- Test: `src/shared/tests/controls-overlay.test.ts`
- Reference: `src/shared/esc-overlay.ts` (`drawEscOverlay` dim+card pattern), `src/shared/tests/esc-overlay.test.ts` (recording-ctx + font-mock seam).

**Interfaces:**
- Consumes: `Screen`, `BindingMap`, `ControlManifest`, `MENU_ITEMS`, `controlsRowCount` (Phase 1); `strokeCardLine` (esc-overlay).
- Produces:
  ```ts
  export interface ControlsOverlayOptions { readonly color: string; readonly opacity: number }
  export function drawControlsOverlay(
    ctx: CanvasRenderingContext2D, w: number, h: number,
    screen: Screen, map: BindingMap, manifest: ControlManifest, opts: ControlsOverlayOptions,
  ): void
  export function bindingLabel(codes: readonly Binding[]): string   // 'ArrowUp / KeyW' -> '↑ / W'
  ```

**Render contract:**
- Dim the frame (`rgba(0,0,0,opacity)`, `shadowBlur=0` first) exactly like `drawEscOverlay`.
- `menu` screen: stroke `MENU_ITEMS`, the cursor row prefixed with `'> '` and others with `'  '`.
- `controls` screen: one row per control `` `${label}   [ ${bindingLabel(map[action])} ]` ``, then `RESET DEFAULTS`, then `BACK`. Cursor row prefixed `'> '`. The `capturing` row renders `` `${label}   [ PRESS A KEY ]` `` instead of its binding.
- `bindingLabel` maps common codes to friendly glyphs (`KeyA`→`A`, `ArrowUp`→`↑`, `ArrowDown`→`↓`, `ArrowLeft`→`←`, `ArrowRight`→`→`, `Space`→`SPACE`, `Enter`→`ENTER`, `ShiftLeft`/`ShiftRight`→`SHIFT`, `Digit1`→`1`), falling back to the raw code; join multiple with `' / '`; empty list → `'—'`.

- [ ] **Step 1: Write the failing test** (mirror `esc-overlay.test.ts`: mock the font `layoutText`, record the strings routed through it):

```ts
import { describe, it, expect, vi } from 'vitest'

const font = vi.hoisted(() => {
  const calls: string[] = []
  return { calls, layoutText: (text: string) => { calls.push(text); return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 8, y: 0 }] }], width: 8 } } }
})
vi.mock('@shared/font', () => ({ layoutText: font.layoutText, CELL_H: 8 }))

import { drawControlsOverlay, bindingLabel } from '@shared/controls-overlay'
import type { ControlManifest, Screen } from '@shared/keybind'

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
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement.** First export `strokeCardLine` from `esc-overlay.ts` (change `function strokeCardLine` → `export function strokeCardLine`; leave `drawEscOverlay` calling it unchanged). Then add to `controls-overlay.ts`:

```ts
import { strokeCardLine } from './esc-overlay.js'
import { CELL_H } from './font.js' // only if needed for sizing; else reuse esc-overlay's own sizing

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
export function bindingLabel(codes: readonly Binding[]): string {
  return codes.length === 0 ? '—' : codes.map(codeLabel).join(' / ')
}

export interface ControlsOverlayOptions { readonly color: string; readonly opacity: number }

export function drawControlsOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  screen: Screen, map: BindingMap, manifest: ControlManifest, opts: ControlsOverlayOptions,
): void {
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
    const resetIdx = manifest.length, backIdx = manifest.length + 1
    lines.push(`${screen.cursor === resetIdx ? '> ' : '  '}RESET DEFAULTS`)
    lines.push(`${screen.cursor === backIdx ? '> ' : '  '}BACK`)
  }

  const size = Math.max(14, Math.round(Math.min(w, h) * 0.04))
  const lineHeight = size * 1.6
  const top = h / 2 - (lines.length - 1) * lineHeight * 0.5
  lines.forEach((line, i) => strokeCardLine(ctx, line, w / 2, top + i * lineHeight + size / 2, size, opts.color))
}
```

- [ ] **Step 4: Run to verify it passes** — PASS. Then run the shared project + `npm run lint`.

Run: `npx vitest run src/shared/tests/esc-overlay.test.ts src/shared/tests/controls-overlay.test.ts`
Expected: both PASS (esc-overlay unaffected by the export change).

- [ ] **Step 5: Commit**

```bash
git add src/shared/esc-overlay.ts src/shared/controls-overlay.ts src/shared/tests/controls-overlay.test.ts
git commit -m "feat(sa1-5): drawControlsOverlay renderer + bindingLabel"
```

---

### Task 8: `createControlsOverlay` controller

**Files:**
- Modify: `src/shared/controls-overlay.ts`
- Test: `src/shared/tests/controls-overlay.test.ts`

**Interfaces:**
- Consumes: everything above; `resolveBindings`, `diffOverrides`, `resetToDefaults`, `rebindReduce`, `INITIAL_SCREEN`.
- Produces:
  ```ts
  export interface ControlsOverlay {
    open(): void
    close(): void
    isOpen(): boolean
    handleKey(e: KeyboardEvent): boolean       // true = consumed
    draw(ctx: CanvasRenderingContext2D, w: number, h: number): void
    readonly bindings: BindingMap
  }
  export function createControlsOverlay(args: {
    manifest: ControlManifest
    store: BindingStore
    opts: ControlsOverlayOptions
    onChange?: (map: BindingMap) => void
  }): ControlsOverlay
  ```

**Controller contract:**
- Holds `map = resolveBindings(manifest, store.load())`, `screen`, `open` flag.
- `open()` sets `open=true`, `screen=INITIAL_SCREEN`. `close()` sets `open=false`.
- `handleKey(e)`: if not open, return `false`. Map `e.code` → `RebindEvent`:
  - While `screen.capturing !== null`: any code except `Escape` → `{t:'capture',code:e.code}`; `Escape` → `{t:'back'}`.
  - Else: `ArrowUp`/`KeyW` → `up`; `ArrowDown`/`KeyS` → `down`; `Enter`/`Space` → `select`; `Escape` → `back`; anything else → ignore (return `true`, still consumed while open).
  - Run `rebindReduce`; apply `command`: `resume` → `close()`; `save` → `store.save(diffOverrides(manifest, nextMap))` + `onChange?.(nextMap)`; `reset` → `map = resetToDefaults(manifest)`, `store.save({})`, `onChange?.(map)`.
  - Always `e.preventDefault()` while open; return `true`.
- `draw(ctx,w,h)`: if open, `drawControlsOverlay(ctx,w,h,screen,map,manifest,opts)`.
- `bindings` getter returns the live `map`.

- [ ] **Step 1: Write the failing test**

```ts
import { createControlsOverlay } from '@shared/controls-overlay'
function key(code: string) { return { code, preventDefault: () => {} } as KeyboardEvent }

describe('createControlsOverlay controller', () => {
  const make = () => {
    const saved: any[] = []
    const store = { load: () => ({}), save: (o: any) => saved.push(o) }
    let changed: any = null
    const o = createControlsOverlay({ manifest: M, store, opts: { color: '#0f0', opacity: 0.6 }, onChange: (m) => (changed = m) })
    return { o, saved, changed: () => changed }
  }

  it('ignores keys and consumes nothing while closed', () => {
    const { o } = make()
    expect(o.isOpen()).toBe(false)
    expect(o.handleKey(key('Enter'))).toBe(false)
  })
  it('rebinds thrust end-to-end: open → CONTROLS → select → capture', () => {
    const { o, saved, changed } = make()
    o.open()
    o.handleKey(key('ArrowDown'))  // cursor → CONTROLS
    o.handleKey(key('Enter'))      // enter controls
    o.handleKey(key('Enter'))      // capture thrust (row 0)
    o.handleKey(key('KeyT'))       // bind KeyT
    expect(o.bindings.thrust).toEqual(['KeyT'])
    expect(saved.at(-1)).toEqual({ thrust: ['KeyT'] })
    expect(changed()?.thrust).toEqual(['KeyT'])
  })
  it('RESUME closes the overlay', () => {
    const { o } = make()
    o.open()
    o.handleKey(key('Enter'))      // RESUME (cursor 0)
    expect(o.isOpen()).toBe(false)
  })
  it('Escape while capturing cancels, does not bind', () => {
    const { o, saved } = make()
    o.open(); o.handleKey(key('ArrowDown')); o.handleKey(key('Enter')); o.handleKey(key('Enter'))
    const before = saved.length
    o.handleKey(key('Escape'))
    expect(o.bindings.thrust).toEqual(['ArrowUp', 'KeyW'])
    expect(saved.length).toBe(before)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** (append to `controls-overlay.ts`):

```ts
export interface ControlsOverlay {
  open(): void; close(): void; isOpen(): boolean
  handleKey(e: KeyboardEvent): boolean
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void
  readonly bindings: BindingMap
}

export function createControlsOverlay(args: {
  manifest: ControlManifest; store: BindingStore; opts: ControlsOverlayOptions
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
```

- [ ] **Step 4: Run to verify it passes** — PASS. Run the whole shared project (`npx vitest run src/shared/`) + `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/controls-overlay.ts src/shared/tests/controls-overlay.test.ts
git commit -m "feat(sa1-5): createControlsOverlay controller"
```

---

## Phase 3 — Convergence guard (orchestrator)

### Task 9: `keybind-convergence.test.mjs`

**Files:**
- Create: `tests/keybind-convergence.test.mjs`
- Reference: `tests/shell-convergence.test.mjs` (sibling structure), `vitest.config.ts` (the `GAMES` list this guard iterates).

**Interfaces:**
- Consumes: the per-game `shell/controls.ts` each game will add in Phase 4.

**Contract:** For every id in `GAMES`, assert `plugins/<id>/src/shell/controls.ts` exists, exports a `CONTROL_MANIFEST` (a non-empty array of `{action,label,defaults}` with `defaults` a non-empty `string[]`), and that `plugins/<id>/src/shell/input.ts` references `resolveBindings` (i.e. reads bindings, not a frozen literal). This is a source-text + import check (node:test), like the existing convergence guards.

> **Sequencing note:** this guard fails until every game is adopted (Phase 4). Write it now but expect RED; it turns GREEN only after Task 10.N for the last game. Run it at the end of Phase 4, not mid-phase. (Alternatively, land it as the final infra commit right before the last game — either way it must be green before the story closes.) Keep it out of `main.ts` (it is a `tests/` file, so it does not trip AC-3).

- [ ] **Step 1: Write the guard** (adapt the loop + `GAMES` import from `shell-convergence.test.mjs`):

```js
// tests/keybind-convergence.test.mjs — sa1-5. Every game exposes a remappable
// ControlManifest and reads its input through resolveBindings, so a new game
// cannot silently ship un-rebindable controls. Sibling of shell-convergence.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { GAMES } from './helpers/games.mjs' // or however shell-convergence sources the id list

for (const id of GAMES) {
  test(`${id} declares a ControlManifest`, () => {
    const controls = `plugins/${id}/src/shell/controls.ts`
    assert.ok(existsSync(controls), `${controls} missing`)
    const src = readFileSync(controls, 'utf8')
    assert.match(src, /export const CONTROL_MANIFEST/, `${id} must export CONTROL_MANIFEST`)
    assert.match(src, /action:/, `${id} manifest looks empty`)
  })
  test(`${id} input reads resolveBindings`, () => {
    const input = readFileSync(`plugins/${id}/src/shell/input.ts`, 'utf8')
    assert.match(input, /resolveBindings/, `${id} input.ts must resolve bindings, not hard-code keys`)
  })
}
```

*(Confirm how `shell-convergence.test.mjs` sources the game-id list and copy that exact mechanism; do not invent `helpers/games.mjs` if it does not exist.)*

- [ ] **Step 2: Run — expect RED** (no game adopted yet)

Run: `node --test tests/keybind-convergence.test.mjs`
Expected: FAIL for every game (controls.ts missing). This is the pending-work signal.

- [ ] **Step 3: Commit the guard** (infra commit, no `main.ts`)

```bash
git add tests/keybind-convergence.test.mjs
git commit -m "test(sa1-5): keybind convergence guard (RED until every game adopts)"
```

---

## Phase 4 — Per-game adoption (×12, one commit each)

**Games (from `vitest.config.ts` `GAMES` / `justfile` `games`):** `tempest`, `star-wars`, `asteroids`, `battlezone`, `red-baron`, `centipede`, `joust`, `missile-command`, `pac-man`, `millipede`, `defender`, plus the lobby is **not** a game (no controls) — confirm the exact list against `vitest.config.ts` before starting; there are 11 games + lobby.

Each game is **one task, one commit** (AC-3: never two games' `main.ts` in a commit). The recipe is identical; only the manifest data and the `idOf` conversion differ. Do them one at a time, running that game's project after each.

### The adoption recipe (apply per game `<id>`)

**Files per game:**
- Create: `plugins/<id>/src/shell/controls.ts`
- Modify: `plugins/<id>/src/shell/input.ts`
- Modify: `plugins/<id>/src/main.ts`
- Create: `plugins/<id>/tests/keybind-adoption.test.ts`

- [ ] **Step 1: Extract the manifest from the current input.ts.** Read `plugins/<id>/src/shell/input.ts`. Its existing action→keys table (asteroids' `KEYS`, or the imperative `held('e')` calls for battlezone) is the source of truth for `CONTROL_MANIFEST` defaults. Write:

```ts
// plugins/<id>/src/shell/controls.ts
import { makeBindingStore } from '@shared/controls-overlay'
import type { ControlManifest } from '@shared/keybind'

export const CONTROL_MANIFEST: ControlManifest = [
  { action: 'thrust', label: 'THRUST', defaults: ['ArrowUp', 'KeyW'] },
  // ...one entry per control, defaults copied verbatim from the current input.ts table
]
export const bindingStore = makeBindingStore('<id>')
```

**`e.key` → `e.code` conversion:** if the game's `installHeldKeys` passes `idOf: (e) => e.key.toLowerCase()` (battlezone, pac-man) or `idOf: (e) => e.key` (red-baron), translate every default character to its physical code (`'e'`→`'KeyE'`, `'arrowup'`→`'ArrowUp'`, `' '`→`'Space'`, `'1'`→`'Digit1'`, `'enter'`→`'Enter'`, `'shift'`→`'ShiftLeft'`+`'ShiftRight'`) **and** drop the `idOf` override so the tracker keys on the default `e.code`. On QWERTY this is behaviour-identical.

- [ ] **Step 2: Rewire input.ts to resolved bindings.** Replace the literal `const KEYS = {...}` with:

```ts
import { resolveBindings, type BindingMap } from '@shared/keybind'
import { CONTROL_MANIFEST, bindingStore } from './controls'

let bindings: BindingMap = resolveBindings(CONTROL_MANIFEST, bindingStore.load())
export function setBindings(map: BindingMap): void { bindings = map }  // called by main via overlay onChange
```

Change every `KEYS.<action>` read to `bindings.<action>` (or `bindings['<action>']`). For imperative games (battlezone), replace `held('e')` with `keys.any(bindings.leftTreadFwd)` etc. Keep the edge-latch / tap-nudge logic; only the *source of the codes* changes.

- [ ] **Step 3: Write the per-game override proof (RED first).**

```ts
// plugins/<id>/tests/keybind-adoption.test.ts
import { describe, it, expect } from 'vitest'
import { resolveBindings } from '@shared/keybind'
import { CONTROL_MANIFEST } from '../src/shell/controls'
// Drive the game's input controller with a stubbed held-set (see the game's existing
// input test for how it fakes key state), then assert:
describe('<id> honours a remapped binding', () => {
  it('resolves an override onto the new code and drops the default', () => {
    const map = resolveBindings(CONTROL_MANIFEST, { fire: ['KeyJ'] }) // pick a real action
    expect(map.fire).toEqual(['KeyJ'])
  })
  // Stronger (preferred where the controller is testable in isolation): construct the
  // controller with an injected store returning { <action>: ['KeyJ'] }, simulate KeyJ
  // down, assert sample()/read() reports that action active and the OLD default inactive.
})
```

Prefer the stronger controller-level assertion where the game's input controller can be constructed under test (asteroids/joust take a target and are unit-testable; battlezone is not unit-tested by convention — for those, the manifest-resolution assertion above plus a `:5270/<id>/` eyeball is the proof, matching that game's existing IO-by-running convention).

- [ ] **Step 4: Wire the overlay in main.ts.** Next to the existing `installPauseToggle` + `drawEscOverlay` block:

```ts
import { createControlsOverlay } from '@shared/controls-overlay'
import { CONTROL_MANIFEST, bindingStore } from './shell/controls'
import { setBindings } from './shell/input'

const overlay = createControlsOverlay({
  manifest: CONTROL_MANIFEST, store: bindingStore,
  opts: <the same color/opacity the game passes to drawEscOverlay>,
  onChange: setBindings,
})
// ESC opens the overlay when it pauses; route keydown while open; draw after the frozen frame.
window.addEventListener('keydown', (e) => { if (overlay.isOpen()) overlay.handleKey(e) }, true) // capture phase, before input/pause see it
// in the pause branch of the render loop:
//   if (pause.isPaused()) { overlay.isOpen() ? overlay.draw(ctx, W, H) : (overlay.open(), overlay.draw(ctx, W, H)) }
// and when pause clears, overlay.close().
```

> **Integration detail to resolve during implementation (do not defer):** the existing pause toggle and the overlay both watch Escape. The overlay must consume Escape while open (so Escape backs *out of a submenu* before it resumes) yet still let the first Escape *enter* pause. Concretely: keep `installPauseToggle` as the pause gate; when it flips to paused, `overlay.open()`; while `overlay.isOpen()`, the capture-phase listener consumes keydown so the pause toggle does not also see it; the overlay's own `back`/`resume` command calls `overlay.close()` and must also clear pause (expose a `resume()` from the pause handle or drive pause from the overlay's open state). Pick one owner of the paused boolean and make the other follow it — wire it, in this task, for this game.

- [ ] **Step 5: Run this game's project + lint, then commit.**

```bash
npx vitest run --project <id>
npm run lint
git add plugins/<id>/src/shell/controls.ts plugins/<id>/src/shell/input.ts plugins/<id>/src/main.ts plugins/<id>/tests/keybind-adoption.test.ts
git commit -m "feat(sa1-5): <id> adopts shared key rebinding"
```

**Per-game order (easy → hard, to validate the recipe before the hard cases):**
`asteroids` → `joust` → `tempest` → `star-wars` → `centipede` → `defender` → `millipede` → `missile-command` → `pac-man` → `red-baron` → `battlezone` (the `e.key` games and battlezone's dual-scheme last).

After the **last** game: run `node --test tests/keybind-convergence.test.mjs` (now GREEN), then `just ci`.

---

## Phase 5 — Close-out

### Task 11: Barrel doc + full CI + eyeball

**Files:**
- Modify: `src/shared/index.ts` (document the two new subpaths in the header comment, per its "added here as subpath exports" convention).
- Modify: relevant `CHANGELOG.md` if the repo tracks shared changes there — note the `e.code`-on-non-QWERTY behaviour so it is not read as a regression (spec § Open risks).

- [ ] **Step 1:** Add the doc lines to `src/shared/index.ts`.
- [ ] **Step 2:** `just ci` (orchestrator + all app tests + build-all) — all green.
- [ ] **Step 3:** Eyeball each game at `http://127.0.0.1:5270/<id>/` (`just serve`): ESC opens the menu, CONTROLS lists the game's controls, a rebind takes effect on resume, RESET restores, and the card fits the viewport (battlezone's longer card especially — spec § Open risks). *(Per the repo's dev-server pin caveat, confirm your checkout owns `:5270` before trusting a screenshot.)*
- [ ] **Step 4: Commit**

```bash
git add src/shared/index.ts
git commit -m "docs(sa1-5): note keybind subpaths + non-QWERTY behaviour"
```

---

## Self-Review (against the spec)

**Spec coverage:**
- `@shared/keybind` pure module → Tasks 1–5. ✓
- `@shared/controls-overlay` (store, renderer, controller) → Tasks 6–8. ✓
- ESC-reachable canvas overlay, menu → controls, capture/cancel/reset → Tasks 5, 7, 8, and per-game 10.N Step 4. ✓
- Per-game manifest + resolved-binding input, all 12/11 games → Phase 4. ✓
- Canonical `e.code`, `e.key`→`e.code` conversion (battlezone/red-baron/pac-man) → recipe Step 1. ✓
- Persistence (defensive, per-game deltas) → Task 6. ✓
- Live-on-resume (`onChange`/`setBindings`) → Tasks 8, 10.N Steps 2 & 4. ✓
- Steal-vs-replace correction (overlaps allowed) → Task 2. ✓
- Escape reserved / any code bindable incl. modifiers → Task 8 `toEvent`. ✓
- Testing: pure, storage, render-identity, per-game override, orchestrator guard → Tasks 1–9, 10.N. ✓
- Commit structure (AC-3) → infra Tasks 1–9 touch no `main.ts`; Phase 4 one game per commit. ✓
- Non-goals honoured: no lobby page, no QUIT, no volume — none appear in any task. ✓

**Placeholder scan:** the only intentional "resolve during implementation" items are the two flagged integration details (convergence-guard game-id sourcing in Task 9; the pause/overlay Escape ownership in recipe Step 4) — both name the exact files and decision to make, not vague hand-waves, and both are explicitly "do not defer."

**Type consistency:** `applyRebind` returns `{map, alsoBoundTo}` everywhere; `rebindReduce(screen, map, manifest, event) → {screen, map, command?}` consistent Tasks 5/8; `BindingStore.load/save`, `ControlsOverlay`, `createControlsOverlay` signatures identical across Tasks 6/8 and the recipe; `CONTROL_MANIFEST`/`bindingStore`/`setBindings` names identical across controls.ts, input.ts, main.ts, and the guard.

**Known gap to confirm at execution time:** the exact `GAMES` id list and how `shell-convergence.test.mjs` sources it — verified before Task 9 and Phase 4, not assumed here.
