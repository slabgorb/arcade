# sa1-4 — Shared master volume, design

**Story:** sa1-4 (epic sa1, "Shared arcade & lobby features and polish") — *Sound
volume controls.* 3 points, `tdd`, repo `arcade`.

**Scope decisions (owner, 2026-08-21):**
- **Master only.** One volume knob, not a master/SFX/music split. The fleet has a
  single master bus per game and no music/SFX bus separation; a per-category split
  would mean re-routing every sound in all 12 games and is a separate epic. "master/SFX"
  in the story text is read as loose wording for "the master volume that governs SFX".
- **Shared DOM overlay.** One HTML/CSS control reused by the lobby and every game — no
  per-game canvas slider, no input hit-testing reimplemented 12 times.

## Background — why this is a 3-pointer, not a 12-game slog

Every one of the 12 games routes its master gain through **exactly two shared modules**:

- `src/shared/audio.ts` — `createAudioEngine`, the sample player. Used directly by
  asteroids, centipede, defender, missile-command, star-wars, tempest; wrapped by
  joust (`plugins/joust/src/shell/audio.ts` re-exports it).
- `src/shared/synth.ts` — `createSynthEngine`, the oscillator engine. Used by
  battlezone and red-baron directly, by pac-man's WSG (`plugins/pac-man/src/shell/wsg.ts`)
  and millipede's POKEY (`plugins/millipede/src/shell/audio.ts`) as their `SynthTarget`
  master bus.

**No game hand-rolls an independent master GainNode.** Instrumenting these two engines
covers the whole fleet with zero per-game audio surgery. The reach of this story is:

- 2 engine files (`audio.ts`, `synth.ts`) — read + live-update master gain.
- 1 new state module (`src/shared/volume.ts`).
- 1 new shared UI module (`src/shared/volume-ui.ts`).
- 1 mount line per game `main.ts` (13 apps incl. lobby) — mirrors the existing
  `mountCanvas` / `installPauseToggle` one-liners.

`@shared/*` is a directory alias in `vite.config.ts`, `vitest.config.ts` and
`tsconfig.json`; a new `src/shared/volume.ts` is importable as `@shared/volume` with no
registration. There is no package `exports` map to edit.

## Components

### 1. `src/shared/volume.ts` — single source of truth (new)

The persisted user master volume, single-origin localStorage, defensive against every
storage failure (private-browsing, quota, sandbox, non-browser).

```ts
/** User master volume, 0..1. 1.0 = today's behaviour (no change for existing players). */
export function getMasterVolume(): number
/** Clamp to 0..1, persist, notify subscribers. */
export function setMasterVolume(v: number): void
/** Register a change listener; returns an unsubscribe. Does NOT fire on register. */
export function subscribeVolume(fn: (v: number) => void): () => void
```

- **Key:** `arcade-volume` (single string, e.g. `"0.6"`). Single origin → the lobby and
  any open game tab read the same key.
- **Default 1.0.** A fresh player hears exactly today's levels; the per-cabinet headroom
  (below) already prevents clipping. No behaviour change on upgrade.
- **Clamp** via the existing `@shared/clamp` `clamp(v, 0, 1)`.
- **Defensive storage.** Reuse the `highscore.ts` `getStorage()` idiom (try/catch around
  `globalThis.localStorage`, `null` when absent/throwing). It is now needed by a second
  module, so **lift it** to a tiny shared helper (`src/shared/storage.ts`,
  `getStorage(): Storage | null`) and have `highscore.ts` import it — rather than
  duplicate the accessor a second time. This is an in-place improvement to code we are
  touching, not unrelated refactoring: highscore keeps identical behaviour.
- **Cross-tab sync.** Attach one `window` `storage` listener; on an `arcade-volume`
  change, update the cache and notify subscribers. Keeps the lobby slider and a running
  game in agreement for free. Guarded for non-browser (no `window`).
- **Cache.** Read-through cache so `getMasterVolume()` is cheap on the frame path; the
  cache is the authority after first read, updated by `setMasterVolume` and the `storage`
  event.

### 2. Engine integration — `audio.ts` and `synth.ts`

The existing per-cabinet `masterGain` config (defaults: sample 0.4, synth 0.8; asteroids
0.5; etc.) is **clip headroom, not user volume.** The user control *composes* with it:

```
effectiveGain = getMasterVolume() × headroom
```

- **On construction / `resume()`:** set `master.gain.value = getMasterVolume() × headroom`
  instead of `= headroom`.
- **Live updates:** `subscribeVolume` and re-apply `effectiveGain` to the held master
  node whenever the value changes. Guard on a live master (`null` before `resume`, after
  a closed context) — a dead engine ignores the update, consistent with the no-throw /
  silent-degrade contract.
- **Preserve the `masterGain: 0` contract.** `synth-source-rules.test.ts` and
  `audio.test.ts` pin that an explicit `masterGain: 0` reaches the node (a muted cabinet)
  and is defaulted with `??`, never `||`. Multiplication preserves this: `volume × 0 = 0`
  for any volume, and the `?? DEFAULT` on the headroom stays. These tests must remain
  green unchanged.
- Both engines already hold their master `GainNode` in a closure (`master` in `audio.ts`;
  the synth builds it in `resume`). Add a held reference in the synth if not already
  retained, so the subscribe callback can re-apply.
- **Teardown:** engines are page-scoped and have no dispose today; the subscription lives
  for the page. Acceptable — note it, do not invent a lifecycle.

### 3. `src/shared/volume-ui.ts` — shared DOM overlay (new)

```ts
export interface VolumeControlHandle {
  readonly element: HTMLElement
  setVisible(v: boolean): void
  destroy(): void
}
export function mountVolumeControl(opts: {
  root: ParentNode          // where to append (document.body over the canvas, or a lobby container)
  initiallyVisible?: boolean
}): VolumeControlHandle
```

- Renders a labelled `<input type="range" min=0 max=1 step=0.01>` bound to `volume.ts`:
  reads `getMasterVolume()` on mount, writes `setMasterVolume()` on `input`, and
  `subscribeVolume` to reflect external changes (cross-tab, or the lobby control) without
  a feedback loop.
- **Accessibility:** the native range input is keyboard-adjustable; add an `aria-label`
  ("Master volume") and a visible percentage/opacity affordance. Slider-to-zero *is*
  mute — no separate mute button (YAGNI for 3pt).
- **Pointer-lock safety (sa1-3).** In games the control is a DOM element above the canvas
  and is only *shown* while the game is paused — pointer lock is released then, so the
  slider receives pointer events without fighting the capture. `setVisible` is driven off
  the game's `PauseHandle.isPaused()`.

### 4. Wiring

- **Each game `main.ts`:** `const vol = mountVolumeControl({ root: document.body })`, then
  drive `vol.setVisible(pause.isPaused())` from the same place the loop already reads
  `pause.isPaused()` (every game adopted the shared pause gate in sa1-2, so this seam is
  now uniform across the fleet). Mirrors the existing one-line `mountCanvas` /
  `installPauseToggle` adoptions.
- **`lobby/src/main.ts`:** `mountVolumeControl({ root: <settings container>,
  initiallyVisible: true })` — always visible; the lobby has no pause state and no canvas
  pointer-lock conflict.

## Data flow

```
        ┌─────────────── window 'storage' (cross-tab, single origin) ───────────────┐
        ▼                                                                            │
  volume-ui slider ──setMasterVolume()──▶  volume.ts  ──subscribeVolume──▶  audio.ts / synth.ts
  (lobby + per game)                     (localStorage:              re-apply volume×headroom
        ▲                                 arcade-volume, cache)       to live master GainNode
        └────────────── subscribeVolume (reflect external change) ───────┘
```

## Error handling

- Every storage path degrades: unreadable → default 1.0; unwritable → in-memory only
  (session-local), never throws.
- A volume update to a dead/absent engine master is a no-op — matches the existing
  silent-degrade contract; audio never crashes a frame.
- Out-of-range `setMasterVolume` is clamped, not rejected.

## Testing

- **`volume.ts`** (vitest, storage stub from `src/shared/tests/helpers/storage-stub.ts`):
  default 1.0 when unset; persist round-trip; clamp below 0 / above 1; storage-throws →
  no throw, returns default; `subscribeVolume` notify on set; unsubscribe stops
  notifications; `storage` event updates cache + notifies.
- **`storage.ts`**: `getStorage()` returns the global; returns `null` when access throws;
  `highscore` tests stay green after the lift.
- **`audio.ts` / `synth.ts`**: `master.gain.value === volume × headroom` on resume for a
  seeded volume; live change on `setMasterVolume`; `masterGain: 0` stays 0 for any
  volume; existing gain-default tests unchanged.
- **`volume-ui.ts`** (jsdom): renders a range input at the current volume; `input` event
  calls `setMasterVolume`; reflects an external `setMasterVolume`; `setVisible(false)`
  hides it; `aria-label` present.

## YAGNI / ruled out

- No master/SFX/music bus split (owner: master only).
- No dedicated mute button — slider to zero.
- No per-game canvas slider — one shared DOM control.
- No engine dispose/lifecycle — page-scoped subscription.
- Default 1.0 — no migration, no behaviour change for existing players.

## Deviations from prior design constraints

- None. The two-engine convergence means this adds a cross-cutting shared concern
  without violating "share the VERB, not the NUMBERS": volume is a global user setting,
  not a per-cabinet ROM number, so it belongs in shared state, and the effective-gain
  composition leaves each cabinet's headroom NUMBER untouched.
