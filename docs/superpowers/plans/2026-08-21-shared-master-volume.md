# Shared Master Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single persisted master-volume control, adjustable from the lobby and from inside every game, that scales all audio across the fleet.

**Architecture:** Every game routes its master gain through one of two shared engines (`src/shared/audio.ts` sample player, `src/shared/synth.ts` oscillator). A new `src/shared/volume.ts` holds the persisted user volume (single-origin localStorage); both engines read it at `resume()` and subscribe for live updates, applying `effectiveGain = userVolume × cabinetHeadroom`. A new `src/shared/volume-ui.ts` renders one shared DOM slider, mounted always-on in the lobby and shown-on-pause in games.

**Tech Stack:** TypeScript, in-tree `@shared/*` directory alias, Vite, Vitest (per-app projects incl. a `shared` project; DOM tests use the `// @vitest-environment jsdom` file pragma).

**Spec:** `docs/superpowers/specs/2026-08-21-shared-master-volume-design.md`

## Global Constraints

- **Node ≥ 22.18** (repo `engines`); `scripts/` rely on native `.ts` type-stripping.
- **`@shared/<module>`** resolves via the directory alias in `vite.config.ts`, `vitest.config.ts`, `tsconfig.json` — a new `src/shared/<name>.ts` is importable with **no registration**. There is no package `exports` map to edit.
- **Silent-degrade / no-throw contract** (both audio engines): audio runs on the frame path; a sound failure must never throw. Every storage and Web-Audio path degrades, never throws.
- **`masterGain: 0` is honoured, not defaulted** — pinned by `synth-source-rules.test.ts` and `audio.test.ts`. Default a headroom with `??`, never `||`. The volume factor multiplies headroom, so `volume × 0 === 0` for any volume; these tests must stay green **unchanged**.
- **Default volume 1.0** — a fresh player hears exactly today's levels (headroom already prevents clipping). No behaviour change on upgrade.
- **Type check:** `npm run lint` (`tsc --noEmit`, repo-wide) is the only type check; run it before finishing a task that adds a module or export.
- **Branch:** work is on `feat/sa1-4-shared-master-volume` (already cut from `develop`). Commit per task; do not push to `develop`.
- **Run a single shared test file:** `npx vitest run <path>` (e.g. `npx vitest run src/shared/tests/volume.test.ts`). Run a whole app project: `npx vitest run --project <id>`.

---

### Task 1: Extract the defensive `getStorage()` accessor

`volume.ts` needs the same defensive localStorage accessor `highscore.ts` already has. It is about to have a second consumer, so lift it to a shared helper rather than duplicate it a third time (a copy already lives inline in older highscore tests). Behaviour is identical; `highscore.ts` imports it.

**Files:**
- Create: `src/shared/storage.ts`
- Modify: `src/shared/highscore.ts` (remove the local `getStorage`, import the shared one — around lines 469-479)
- Test: `src/shared/tests/storage.test.ts`

**Interfaces:**
- Produces: `getStorage(): Storage | null` — returns `globalThis.localStorage`, or `null` when it is absent or reading it throws.

- [ ] **Step 1: Write the failing test**

Create `src/shared/tests/storage.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { getStorage } from '@shared/storage'
import { makeFakeStorage } from './helpers/storage-stub'

describe('getStorage', () => {
  const g = globalThis as { localStorage?: Storage | undefined }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete g.localStorage
  })

  it('returns the global localStorage when present', () => {
    const fake = makeFakeStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
    expect(getStorage()).toBe(fake)
  })

  it('returns null when localStorage is absent', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    expect(getStorage()).toBeNull()
  })

  it('returns null (does not throw) when reading localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: access denied')
      },
    })
    expect(() => getStorage()).not.toThrow()
    expect(getStorage()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/tests/storage.test.ts`
Expected: FAIL — `Cannot find module '@shared/storage'`.

- [ ] **Step 3: Create the shared helper**

Create `src/shared/storage.ts`:

```ts
// @arcade/shared/storage — the defensive localStorage accessor.
//
// Lifted from highscore.ts (sa1-4) once a second module (volume.ts) needed the
// same guard. In private-browsing / sandboxed contexts even *reading* the global
// can throw, and outside a browser it is simply absent. Every consumer treats a
// null return as "no persistence" and degrades — never throws.

/** The origin's localStorage, or null when it is absent or reading it throws. */
export function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Point highscore.ts at the shared helper**

In `src/shared/highscore.ts`, delete the local `getStorage` function (the block at ~469-479, including its two-line comment) and add an import near the top of the file's imports:

```ts
import { getStorage } from './storage'
```

Leave every call site (`getStorage()`) unchanged.

- [ ] **Step 5: Run storage + highscore tests to verify all pass**

Run: `npx vitest run src/shared/tests/storage.test.ts src/shared/tests/highscore.test.ts src/shared/tests/highscore.dom.test.ts`
Expected: PASS — new storage tests green, all highscore tests unchanged and green.

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/storage.ts src/shared/highscore.ts src/shared/tests/storage.test.ts
git commit -m "refactor(sa1-4): extract defensive getStorage to @shared/storage"
```

---

### Task 2: `volume.ts` — the persisted master-volume source of truth

**Files:**
- Create: `src/shared/volume.ts`
- Test: `src/shared/tests/volume.test.ts` (node env — injected storage)
- Test: `src/shared/tests/volume.dom.test.ts` (jsdom — cross-tab `storage` event)

**Interfaces:**
- Consumes: `getStorage()` from `@shared/storage`; `clamp(v, lo, hi)` from `@shared/clamp` (`clamp(NaN,0,1) === 0`).
- Produces:
  - `getMasterVolume(): number` — 0..1; reads `arcade-volume` from storage each call; returns `1` when unset, unparseable, or storage is absent.
  - `setMasterVolume(v: number): void` — `clamp(v,0,1)`, persist, notify subscribers with the clamped value.
  - `subscribeVolume(fn: (v: number) => void): () => void` — register a change listener (fired by `setMasterVolume` and by a cross-tab `storage` event); returns an unsubscribe. Does **not** fire on register.
  - `VOLUME_STORAGE_KEY = 'arcade-volume'` (exported for tests).

Design notes for the implementer:
- **No cache.** `getMasterVolume()` reads storage on each call — it runs at `resume()` and inside subscriber callbacks, never on the per-frame hot path, so a single `getItem` + `parseFloat` is cheap and keeps the module trivially testable (no cross-test cache to reset).
- The cross-tab `storage` listener is attached once at module load, guarded by `typeof window !== 'undefined'` so the node test env (no `window`) is unaffected.

- [ ] **Step 1: Write the failing node test**

Create `src/shared/tests/volume.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFakeStorage, makeQuotaStorage } from './helpers/storage-stub'
import {
  getMasterVolume,
  setMasterVolume,
  subscribeVolume,
  VOLUME_STORAGE_KEY,
} from '@shared/volume'

function withStorage(s: Storage | undefined): void {
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true })
}

describe('volume', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  beforeEach(() => withStorage(makeFakeStorage()))
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('defaults to 1.0 when unset', () => {
    expect(getMasterVolume()).toBe(1)
  })

  it('persists and reads back a set value', () => {
    setMasterVolume(0.6)
    expect(getMasterVolume()).toBeCloseTo(0.6, 9)
    expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe('0.6')
  })

  it('clamps below 0 and above 1', () => {
    setMasterVolume(-0.5)
    expect(getMasterVolume()).toBe(0)
    setMasterVolume(2)
    expect(getMasterVolume()).toBe(1)
  })

  it('returns 1.0 when the stored value is unparseable', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, 'not-a-number')
    expect(getMasterVolume()).toBe(1)
  })

  it('returns 1.0 and does not throw when storage is absent', () => {
    withStorage(undefined)
    expect(() => getMasterVolume()).not.toThrow()
    expect(getMasterVolume()).toBe(1)
  })

  it('does not throw when persisting to a full/quota storage', () => {
    withStorage(makeQuotaStorage())
    expect(() => setMasterVolume(0.5)).not.toThrow()
  })

  it('notifies subscribers with the clamped value on set', () => {
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    setMasterVolume(0.3)
    setMasterVolume(5)
    off()
    setMasterVolume(0.9)
    expect(seen).toEqual([0.3, 1])
  })

  it('does not fire the subscriber on registration', () => {
    const fn = vi.fn()
    const off = subscribeVolume(fn)
    off()
    expect(fn).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/tests/volume.test.ts`
Expected: FAIL — `Cannot find module '@shared/volume'`.

- [ ] **Step 3: Implement `volume.ts`**

Create `src/shared/volume.ts`:

```ts
// @arcade/shared/volume — the persisted, single-origin master volume (sa1-4).
//
// One user knob, 0..1, shared by the lobby and every game (single origin ⇒ one
// localStorage key). This is NOT a cabinet's headroom `masterGain` (0.4/0.8 clip
// headroom, a per-cabinet NUMBER) — it is the global user setting the two shared
// audio engines multiply INTO that headroom: effectiveGain = getMasterVolume() ×
// headroom. Default 1.0 ⇒ no behaviour change for existing players.
//
// No cache: getMasterVolume() reads storage each call. It runs at resume() and in
// subscriber callbacks, never on the per-frame hot path, so the read is cheap and
// there is no cross-load state to get stale. Every storage path degrades and never
// throws — persistence must never crash a frame.
import { clamp } from './clamp'
import { getStorage } from './storage'

export const VOLUME_STORAGE_KEY = 'arcade-volume'
const DEFAULT_VOLUME = 1

type Listener = (v: number) => void
const listeners = new Set<Listener>()

/** Master volume, 0..1. Returns 1.0 when unset, unparseable, or storage is absent. */
export function getMasterVolume(): number {
  const storage = getStorage()
  if (!storage) return DEFAULT_VOLUME
  let raw: string | null = null
  try {
    raw = storage.getItem(VOLUME_STORAGE_KEY)
  } catch {
    return DEFAULT_VOLUME
  }
  if (raw === null) return DEFAULT_VOLUME
  const parsed = Number.parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_VOLUME
  return clamp(parsed, 0, 1)
}

/** Clamp to 0..1, persist, and notify subscribers with the clamped value. */
export function setMasterVolume(v: number): void {
  const value = clamp(v, 0, 1)
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(VOLUME_STORAGE_KEY, String(value))
    } catch {
      /* quota / disabled — keep going; the change still notifies live listeners */
    }
  }
  notify(value)
}

/** Register a change listener; returns an unsubscribe. Does not fire on register. */
export function subscribeVolume(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

function notify(v: number): void {
  for (const fn of listeners) {
    try {
      fn(v)
    } catch {
      /* a listener must not break the others (or the setter's caller) */
    }
  }
}

// Cross-tab sync: another tab (the lobby, or a second game) writing the key fires a
// `storage` event here. Guarded for non-browser test envs (no window).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== VOLUME_STORAGE_KEY) return
    notify(getMasterVolume())
  })
}
```

- [ ] **Step 4: Run node test to verify it passes**

Run: `npx vitest run src/shared/tests/volume.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing cross-tab (jsdom) test**

Create `src/shared/tests/volume.dom.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { getMasterVolume, subscribeVolume, VOLUME_STORAGE_KEY } from '@shared/volume'

describe('volume cross-tab sync', () => {
  afterEach(() => localStorage.clear())

  it('notifies subscribers when another tab writes the key', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, '0.25')
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    // Simulate the cross-tab write: jsdom does not fire `storage` for same-document
    // writes, so dispatch the event a real second tab would have produced.
    window.dispatchEvent(new StorageEvent('storage', { key: VOLUME_STORAGE_KEY, newValue: '0.25' }))
    off()
    expect(seen).toEqual([0.25])
    expect(getMasterVolume()).toBeCloseTo(0.25, 9)
  })

  it('ignores storage events for other keys', () => {
    const seen: number[] = []
    const off = subscribeVolume((v) => seen.push(v))
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else', newValue: 'x' }))
    off()
    expect(seen).toEqual([])
  })
})
```

- [ ] **Step 6: Run the jsdom test to verify it passes**

Run: `npx vitest run src/shared/tests/volume.dom.test.ts`
Expected: PASS (the listener attached at module load handles the dispatched event).

- [ ] **Step 7: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/shared/volume.ts src/shared/tests/volume.test.ts src/shared/tests/volume.dom.test.ts
git commit -m "feat(sa1-4): @shared/volume — persisted single-origin master volume"
```

---

### Task 3: Apply volume to the sample engine (`audio.ts`)

The sample player sets its master gain once at `resume()` (`src/shared/audio.ts:211`). Change it to `volume × headroom` and subscribe for live updates.

**Files:**
- Modify: `src/shared/audio.ts` (the `resume()` master build, ~204-223; add a subscription in `createAudioEngine`)
- Test: `src/shared/tests/audio.test.ts` (add cases; existing gain-default cases stay green)

**Interfaces:**
- Consumes: `getMasterVolume`, `subscribeVolume` from `@shared/volume`.
- Produces: no signature change to `AudioEngine` — behaviour change only. `master.gain.value === getMasterVolume() × (manifest.masterGain ?? 0.4)` after resume, updated live on `setMasterVolume`.

- [ ] **Step 1: Write the failing tests**

Add to `src/shared/tests/audio.test.ts` (import `getMasterVolume`, `setMasterVolume` from `@shared/volume` at the top; reset volume in an `afterEach` via `setMasterVolume(1)` so cases do not leak). Use the file's existing `mkEngine` helper and its `created.gains[0]` master-node handle:

```ts
it('master gain is volume × headroom after resume', async () => {
  setMasterVolume(0.5)
  const { created } = await mkEngine({ ...TWO, masterGain: 0.4 })
  // 0.5 user × 0.4 headroom
  expect(created.gains[0].gain.value).toBeCloseTo(0.2, 9)
  setMasterVolume(1)
})

it('a live volume change re-applies volume × headroom to the master node', async () => {
  const { created } = await mkEngine({ ...TWO, masterGain: 0.4 })
  expect(created.gains[0].gain.value).toBeCloseTo(0.4, 9) // default volume 1.0
  setMasterVolume(0.25)
  expect(created.gains[0].gain.value).toBeCloseTo(0.1, 9) // 0.25 × 0.4
  setMasterVolume(1)
})

it('headroom 0 stays 0 for any volume (muted cabinet honoured)', async () => {
  setMasterVolume(0.8)
  const { created } = await mkEngine({ ...TWO, masterGain: 0 })
  expect(created.gains[0].gain.value).toBe(0)
  setMasterVolume(1)
})
```

> Note the existing cases "default masterGain is 0.4" and "honours the manifest masterGain" run at the default volume 1.0, so `1 × 0.4 = 0.4` and `1 × 0.7 = 0.7` — they remain correct unchanged. Ensure the volume is 1.0 when they run (the `afterEach` reset covers this).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/shared/tests/audio.test.ts`
Expected: the three new cases FAIL (gain is headroom-only, not multiplied); existing cases PASS.

- [ ] **Step 3: Implement in `audio.ts`**

Add the import at the top:

```ts
import { getMasterVolume, subscribeVolume } from './volume'
```

In `resume()`, replace the master-gain assignment (currently `master.gain.value = manifest.masterGain ?? DEFAULT_MASTER_GAIN`) with the composed value:

```ts
const headroom = manifest.masterGain ?? DEFAULT_MASTER_GAIN
master.gain.value = getMasterVolume() * headroom
```

Inside `createAudioEngine`, after the `master`/`ctx` closure vars are declared, add a live-update subscription (place it near the other closure setup, before the returned object):

```ts
// sa1-4: track the user master volume. headroom is the cabinet's clip NUMBER
// (manifest.masterGain); the user volume multiplies into it. Guarded on a live
// master — a change before resume(), or after a closed context, is a silent no-op,
// consistent with the engine's degrade contract.
const headroomFor = (): number => manifest.masterGain ?? DEFAULT_MASTER_GAIN
subscribeVolume((v) => {
  if (master) master.gain.value = v * headroomFor()
})
```

(You may hoist `headroomFor` and reuse it in `resume()` for the initial set — either is fine as long as both use `manifest.masterGain ?? DEFAULT_MASTER_GAIN`.)

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/shared/tests/audio.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/audio.ts src/shared/tests/audio.test.ts
git commit -m "feat(sa1-4): sample engine scales master by user volume × headroom"
```

---

### Task 4: Apply volume to the synth engine (`synth.ts`)

The synth builds its master gain in `resume()` (`gain.gain.setValueAtTime(masterGain, building.currentTime)`, ~197), and rebuilds it on context recovery. Apply `volume × headroom` at every build and subscribe for live updates.

**Files:**
- Modify: `src/shared/synth.ts` (the master-gain build in `resume()`; add a subscription in `createSynthEngine`)
- Test: `src/shared/tests/synth.test.ts` (add cases; existing masterGain cases stay green)

**Interfaces:**
- Consumes: `getMasterVolume`, `subscribeVolume` from `@shared/volume`.
- Produces: no signature change to the synth engine — `master.gain` reflects `getMasterVolume() × (config.masterGain ?? 0.8)` after resume and after a change.

- [ ] **Step 1: Write the failing tests**

Add to `src/shared/tests/synth.test.ts` (import `setMasterVolume` from `@shared/volume`; reset with `setMasterVolume(1)` after each new case). The file already exposes a master-gain `values` array on its fake (see the existing "masterGain 0 must reach the node" case using `master.gain.values`); use the same handle:

```ts
it('master gain is volume × headroom on resume', async () => {
  setMasterVolume(0.5)
  const { master } = /* the file's helper that builds an engine and returns its master */
    makeSynth({ masterGain: 0.8 })
  createSynthEngine({ masterGain: 0.8 }).resume()
  // 0.5 × 0.8 = 0.4 reaches the node
  expect(master.gain.values).toContain(0.4)
  setMasterVolume(1)
})

it('a live volume change re-applies volume × headroom', async () => {
  const { master, engine } = makeSynth({ masterGain: 0.8 })
  engine.resume()
  setMasterVolume(0.25)
  expect(master.gain.values).toContain(0.2) // 0.25 × 0.8
  setMasterVolume(1)
})

it('headroom 0 stays 0 for any volume', async () => {
  setMasterVolume(0.8)
  const { master, engine } = makeSynth({ masterGain: 0 })
  engine.resume()
  expect(master.gain.values).toContain(0)
  expect(master.gain.values).not.toContain(0.8)
  setMasterVolume(1)
})
```

> Adapt the helper names to this test file's actual harness (it already constructs engines and inspects `master.gain.values` — reuse that exact pattern; do not invent a new fake). The existing default/override cases run at volume 1.0, so `1 × 0.8 = 0.8` and `1 × 0.25 = 0.25` stay correct — keep them, and ensure volume is reset to 1.0 around the new cases.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/shared/tests/synth.test.ts`
Expected: new cases FAIL; existing PASS.

- [ ] **Step 3: Implement in `synth.ts`**

Add the import:

```ts
import { getMasterVolume, subscribeVolume } from './volume'
```

At the master-gain build in `resume()`, compose the volume in. Replace:

```ts
gain.gain.setValueAtTime(masterGain, building.currentTime)
```

with:

```ts
gain.gain.setValueAtTime(getMasterVolume() * masterGain, building.currentTime)
```

(`masterGain` here is the already-`??`-defaulted headroom const — leave that line untouched so the `masterGain: 0` contract holds.)

In `createSynthEngine`, after the `master` closure var and `masterGain` const exist, add a live-update subscription. Use the engine's own `guard()` and the `live()`/`master` handles so a dead context is a no-op:

```ts
// sa1-4: re-apply the user master volume onto the live master bus when it changes.
// Uses the engine's guard/live so a change before resume() or after a closed
// context is a silent no-op (the degrade contract). masterGain stays the cabinet's
// headroom NUMBER; the user volume multiplies into it.
subscribeVolume((v) => {
  const rig = live()
  if (rig === null || master === null) return
  guard(() => master.gain.setValueAtTime(v * masterGain, rig.context.currentTime))
})
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/shared/tests/synth.test.ts src/shared/tests/synth-source-rules.test.ts`
Expected: PASS (new + existing, including the `masterGain || 0.8` source-guard).

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/synth.ts src/shared/tests/synth.test.ts
git commit -m "feat(sa1-4): synth engine scales master by user volume × headroom"
```

---

### Task 5: `volume-ui.ts` — the shared DOM slider

**Files:**
- Create: `src/shared/volume-ui.ts`
- Test: `src/shared/tests/volume-ui.dom.test.ts` (jsdom)

**Interfaces:**
- Consumes: `getMasterVolume`, `setMasterVolume`, `subscribeVolume` from `@shared/volume`.
- Produces:
  - `interface VolumeControlHandle { readonly element: HTMLElement; setVisible(v: boolean): void; destroy(): void }`
  - `function mountVolumeControl(opts: { root: ParentNode; initiallyVisible?: boolean }): VolumeControlHandle`

Behaviour: appends a labelled `<input type="range" min="0" max="1" step="0.01">` (with `aria-label="Master volume"`) to `root`, initialised to `getMasterVolume()`. An `input` event calls `setMasterVolume(input.valueAsNumber)`. It also `subscribeVolume`s to reflect external changes (a guard flag prevents the reflect-write from bouncing). `setVisible(false)` hides via `hidden = true`; `initiallyVisible` defaults to `false`. `destroy()` removes the element and unsubscribes.

- [ ] **Step 1: Write the failing test**

Create `src/shared/tests/volume-ui.dom.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { getMasterVolume, setMasterVolume } from '@shared/volume'
import { mountVolumeControl } from '@shared/volume-ui'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/tests/volume-ui.dom.test.ts`
Expected: FAIL — `Cannot find module '@shared/volume-ui'`.

- [ ] **Step 3: Implement `volume-ui.ts`**

Create `src/shared/volume-ui.ts`:

```ts
// @arcade/shared/volume-ui — the one shared DOM volume control (sa1-4).
//
// One HTML slider reused by the lobby (always visible) and every game (shown only
// while paused, so a DOM slider never fights sa1-3's pointer lock — pointer lock is
// released while paused). Chrome, not canvas: the games draw to canvas, but a volume
// knob is furniture, so it lives in the DOM above the playfield rather than being
// re-drawn and re-hit-tested in twelve renderers.
import { getMasterVolume, setMasterVolume, subscribeVolume } from './volume'

export interface VolumeControlHandle {
  readonly element: HTMLElement
  setVisible(visible: boolean): void
  destroy(): void
}

export function mountVolumeControl(opts: {
  root: ParentNode
  initiallyVisible?: boolean
}): VolumeControlHandle {
  const container = document.createElement('div')
  container.className = 'arcade-volume'
  container.hidden = opts.initiallyVisible !== true

  const label = document.createElement('label')
  label.className = 'arcade-volume__label'
  label.textContent = 'VOL'

  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '1'
  input.step = '0.01'
  input.className = 'arcade-volume__slider'
  input.setAttribute('aria-label', 'Master volume')
  input.value = String(getMasterVolume())

  // The slider drives the store; a `reflecting` guard stops the store's own
  // change notification (below) from writing the slider's value back into the store
  // and doubling the event.
  let reflecting = false
  input.addEventListener('input', () => {
    if (reflecting) return
    setMasterVolume(input.valueAsNumber)
  })

  const off = subscribeVolume((v) => {
    reflecting = true
    input.value = String(v)
    reflecting = false
  })

  label.appendChild(input)
  container.appendChild(label)
  opts.root.appendChild(container)

  return {
    element: container,
    setVisible: (visible: boolean) => void (container.hidden = !visible),
    destroy: () => {
      off()
      container.remove()
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/tests/volume-ui.dom.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/volume-ui.ts src/shared/tests/volume-ui.dom.test.ts
git commit -m "feat(sa1-4): @shared/volume-ui — shared DOM master-volume slider"
```

---

### Task 6: Wire the control into the lobby and every game

Mount the control: always-visible in the lobby, shown-on-pause in each game (driven off the sa1-2 `PauseHandle.isPaused()` every game already installs).

**Files:**
- Modify: `lobby/src/main.ts`
- Modify each game `main.ts`: `plugins/asteroids/src/main.ts`, `plugins/battlezone/src/main.ts`, `plugins/centipede/src/main.ts`, `plugins/defender/src/main.ts`, `plugins/joust/src/main.ts`, `plugins/millipede/src/main.ts`, `plugins/missile-command/src/main.ts`, `plugins/pac-man/src/main.ts`, `plugins/red-baron/src/main.ts`, `plugins/star-wars/src/main.ts`, `plugins/tempest/src/main.ts`
- Test: `plugins/pac-man/tests/volume-mount.dom.test.ts` (one representative game wiring test)
- Test: `lobby/tests/volume-mount.dom.test.ts` (lobby wiring test)

> **Interfaces:** Consumes `mountVolumeControl` from `@shared/volume-ui`. Each game already has a `pause` handle (`installPauseToggle(...)`) and a `frame(now)` rAF loop that reads `pause.isPaused()`. Lobby has no pause and no canvas.

**Lobby wiring** — add to `lobby/src/main.ts` (after the existing mounts):

```ts
import { mountVolumeControl } from '@shared/volume-ui'
// ...
mountVolumeControl({ root: document.body, initiallyVisible: true })
```

**Per-game wiring** — the identical pattern for each `main.ts`:

1. Add the import: `import { mountVolumeControl } from '@shared/volume-ui'`
2. After `mountCanvas(...)` and the `pause = installPauseToggle(...)` line, add:
   ```ts
   const volume = mountVolumeControl({ root: document.body })
   ```
3. Inside the `frame(now)` loop, next to the existing `pause.isPaused()` read, keep the slider's visibility in sync:
   ```ts
   volume.setVisible(pause.isPaused())
   ```
   Place this once per frame, unconditionally (before or after the freeze branch) so it tracks both entering and leaving pause.

> Concrete example — pac-man (`plugins/pac-man/src/main.ts`): add the import; add `const volume = mountVolumeControl({ root: document.body })` just below `const pause = installPauseToggle(window, isPauseKey, INITIAL_PAUSED)` (~line 186); inside `const frame = (now) => { ... }` add `volume.setVisible(pause.isPaused())` as the first statement of the `else` branch (the branch that runs after `started` is established), so it runs every animated frame.

- [ ] **Step 1: Write the failing lobby test**

Create `lobby/tests/volume-mount.dom.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

describe('lobby mounts an always-visible volume control', () => {
  it('renders a visible master-volume slider on boot', async () => {
    document.body.innerHTML =
      '<div id="games"></div><div id="showcase"></div>'
    await import('../src/main.ts')
    const input = document.body.querySelector('input[type="range"][aria-label="Master volume"]')
    expect(input).not.toBeNull()
    const container = input!.closest('.arcade-volume') as HTMLElement
    expect(container.hidden).toBe(false)
  })
})
```

> If importing `../src/main.ts` pulls in modules that throw in jsdom (font/showcase side effects), stub the minimum DOM they require in `document.body.innerHTML` above, matching what `lobby/src/main.ts` queries (`#games`, `#showcase`). Do not weaken the assertion.

- [ ] **Step 2: Run the lobby test to verify it fails**

Run: `npx vitest run --project lobby lobby/tests/volume-mount.dom.test.ts`
Expected: FAIL — no range input mounted yet.

- [ ] **Step 3: Wire the lobby**

Apply the **Lobby wiring** edit above to `lobby/src/main.ts`.

- [ ] **Step 4: Run the lobby test to verify it passes**

Run: `npx vitest run --project lobby lobby/tests/volume-mount.dom.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing game test (pac-man representative)**

Create `plugins/pac-man/tests/volume-mount.dom.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

describe('pac-man mounts a pause-gated volume control', () => {
  it('mounts the master-volume slider, hidden until paused', async () => {
    document.body.innerHTML = '<canvas id="game" width="224" height="288"></canvas>'
    await import('../src/main.ts')
    const input = document.body.querySelector('input[type="range"][aria-label="Master volume"]')
    expect(input).not.toBeNull()
    const container = input!.closest('.arcade-volume') as HTMLElement
    // Not yet paused → hidden. (The frame loop flips it once Escape pauses; that
    // interaction is covered by volume-ui's own setVisible test.)
    expect(container.hidden).toBe(true)
  })
})
```

> Match the `#game` canvas markup to what `mountCanvas(document)` requires (a `<canvas id="game">`). If pac-man's boot needs more DOM, add exactly what `main.ts` queries — no more.

- [ ] **Step 6: Run the game test to verify it fails**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/volume-mount.dom.test.ts`
Expected: FAIL — no slider mounted yet.

- [ ] **Step 7: Wire pac-man**

Apply the **Per-game wiring** to `plugins/pac-man/src/main.ts` (concrete example above).

- [ ] **Step 8: Run the game test to verify it passes**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/volume-mount.dom.test.ts`
Expected: PASS.

- [ ] **Step 9: Wire the remaining ten games**

Apply the identical **Per-game wiring** to each remaining `main.ts`: asteroids, battlezone, centipede, defender, joust, millipede, missile-command, red-baron, star-wars, tempest. Each is the same three edits (import, mount, `setVisible` in the frame loop). For any game whose frame loop or pause seam differs, adapt only the placement of `volume.setVisible(pause.isPaused())` so it runs once per animated frame — never gate the mount itself.

- [ ] **Step 10: Full suite + type-check**

Run: `npx vitest run` then `npm run lint`
Expected: every project green; no type errors. If a game boot test needs extra DOM under jsdom, add the minimal markup its `main.ts` queries (canvas id, any `getElementById` it throws on).

- [ ] **Step 11: Commit**

```bash
git add lobby/src/main.ts lobby/tests/volume-mount.dom.test.ts \
  plugins/*/src/main.ts plugins/pac-man/tests/volume-mount.dom.test.ts
git commit -m "feat(sa1-4): mount shared volume control — lobby always, games on pause"
```

---

### Task 7: CSS for the volume control (chrome styling)

The control needs minimal styling so it reads as cabinet furniture (fixed corner, legible, theme-consistent) rather than a raw browser slider. Games append to `document.body` over a full-bleed canvas; the lobby has its own layout.

**Files:**
- Modify: a shared/global stylesheet the games and lobby already load. Determine it first (see Step 1); most likely each app's `index.html` links a common CSS or each has its own. Add a `.arcade-volume` rule block.
- Test: none (pure presentation; behaviour is covered by Task 5/6). Verify visually via `just serve`.

- [ ] **Step 1: Locate the stylesheet seam**

Run: `grep -rl "\.css" plugins/pac-man/index.html lobby/index.html && ls src/shared/*.css lobby/public 2>/dev/null`
Determine whether styling is per-app or shared. If a shared CSS exists, add the rule there; otherwise add a small `.arcade-volume` block to each app's existing stylesheet (or inline a `<style>` the component injects once — acceptable if there is no shared CSS file, keeping the control self-contained).

- [ ] **Step 2: Add the style rule**

Add (in the located stylesheet, or as a one-time injected `<style>` in `volume-ui.ts` if there is no shared CSS):

```css
.arcade-volume {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  font: 12px/1 monospace;
  color: #fff;
}
.arcade-volume[hidden] { display: none; }
.arcade-volume__slider { accent-color: #fff; }
```

> If you inject the `<style>` from `volume-ui.ts`, inject it once per document (guard on a known id) so multiple mounts do not stack duplicate rules. Keep the exact behavioural attributes (`hidden`, `aria-label`, class names) unchanged from Task 5.

- [ ] **Step 3: Visual check**

Run: `just serve` and open `http://127.0.0.1:5270/` (lobby, slider visible) and `http://127.0.0.1:5270/pac-man/` (press Escape → slider appears; drag it → audio scales; Escape again → hides). Confirm the lobby slider and an open game agree after a change (single-origin persistence).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style(sa1-4): cabinet chrome for the shared volume control"
```

---

## Self-Review

**Spec coverage:**
- `volume.ts` state module (get/set/subscribe, default 1.0, defensive storage, cross-tab) → Task 2. ✅
- `getStorage()` lift → Task 1. ✅
- Sample engine `volume × headroom`, live update, `masterGain:0` preserved → Task 3. ✅
- Synth engine same → Task 4. ✅
- `volume-ui.ts` shared DOM control, ARIA, reflect-guard, visibility → Task 5. ✅
- Lobby always-on + per-game shown-on-pause wiring (sa1-2 pause seam, pointer-lock safety) → Task 6. ✅
- Styling / cabinet chrome → Task 7. ✅
- `@shared/volume` + `@shared/volume-ui` importable with no registration (directory alias) → Global Constraints; used throughout. ✅

**Placeholder scan:** No "TBD"/"handle edge cases"/"write tests for the above". The two adaptive steps (Task 4's harness names, Task 6/7's DOM-boot and stylesheet discovery) name the exact existing pattern to match and forbid weakening assertions, rather than deferring content.

**Type consistency:** `getMasterVolume`/`setMasterVolume`/`subscribeVolume`/`VOLUME_STORAGE_KEY` (Task 2) are used with those exact names in Tasks 3, 4, 5. `mountVolumeControl` + `VolumeControlHandle` (`element`, `setVisible`, `destroy`) defined in Task 5 and consumed unchanged in Task 6. `getStorage` (Task 1) consumed in Task 2. Headroom composition `volume × (masterGain ?? DEFAULT)` is consistent across Tasks 3 and 4.
