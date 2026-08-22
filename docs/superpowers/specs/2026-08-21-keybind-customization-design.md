# Key Binding Customization — sa1-5 Design

**Story:** sa1-5 (epic sa1, "Shared arcade & lobby features and polish") · 5 points · workflow `tdd`
**Date:** 2026-08-21
**Status:** approved design, pre-implementation

## Summary

Let players remap every game's controls, persist the remap per game, and expose one
shared rebinding UI reachable from each game's ESC pause overlay. This is the
input-binding sibling of the sa1-1/sa1-2/sa1-3 convergence work: one shared mechanism,
every game adopts it. It also pays down a standing inconsistency — half the fleet keys
input on the physical `KeyboardEvent.code`, half on the character `KeyboardEvent.key` —
by canonicalising the whole fleet onto physical `e.code`.

Chosen approach: **Approach A — declarative `ControlManifest`, canonical physical
`e.code`, full convergence.** The rejected alternative (a thin per-game resolver adapter
that preserves each game's existing `idOf` convention) was declined because it preserves
exactly the divergence that makes a *shared* UI awkward, and battlezone forces the hard
refactor either way, so the smaller diff buys nothing lasting.

## Goals / Non-goals

**Goals**
- A shared `@shared/keybind` (pure) + `@shared/controls-overlay` (browser) module pair.
- Every game (all 12) declares a `ControlManifest` and reads its input from *resolved*
  bindings instead of a hard-coded key table.
- An ESC-reachable, canvas-drawn, keyboard-navigated rebinding overlay usable by every
  game, matching the existing `esc-overlay` aesthetic (dim + centred card, shared vector
  font).
- Per-game persistence in single-origin `localStorage`, behind the same defensive
  storage seam `@shared/highscore` uses.
- A remapped binding takes effect the instant the player resumes — no reload.

**Non-goals (deliberate YAGNI / descope)**
- No lobby settings page. The UI is per-game and in-game (owner decision, 2026-08-21).
- No `QUIT` action in the pause menu — the lobby is one browser-back away.
- No volume controls — that is sa1-4, a separate backlog story. The overlay is designed
  so a future settings host *could* compose it, but this story builds no such host.
- No gamepad / mouse remapping. Keyboard only (mouse buttons stay wired as they are).
- No layout-label prettification beyond a simple `e.code` → display string map (e.g.
  `KeyW` → `W`, `ArrowUp` → `↑`). Physical codes are canonical; the display map is cosmetic.

## Architecture

Two files, split pure-from-browser the way the codebase already splits `view.ts` (pure)
from `esc-overlay.ts` (browser-flagged, ADR-0003):

### `src/shared/keybind.ts` — pure, DOM-free, node-tested

No `localStorage`, no `ctx`, no globals. Passes the purity guard like `view.ts` /
`cabinet.ts`. Contains all binding logic and the navigation state machine.

```ts
/** A physical KeyboardEvent.code, e.g. 'KeyW', 'ArrowUp', 'Space'. The canonical
 *  binding token fleet-wide. */
export type Binding = string

/** One remappable control a game declares. */
export interface Control {
  readonly action: string            // stable id the shell reads, e.g. 'thrust'
  readonly label: string             // shown in the overlay, e.g. 'THRUST'
  readonly defaults: readonly Binding[]
}

export type ControlManifest = readonly Control[]

/** Resolved bindings the shell reads each frame: action -> codes. */
export type BindingMap = Record<string, Binding[]>

/** Only the deltas from defaults — what we persist. */
export type Overrides = Record<string, Binding[]>

/** Defaults merged under overrides (override wins per-action, whole-list replace). */
export function resolveBindings(manifest: ControlManifest, overrides: Overrides): BindingMap

/** Set `action`'s binding to the single captured `code` (replace, not append).
 *  Codes are NOT globally unique across actions — some games deliberately share
 *  one (asteroids' Space is both `fire` and `start`; `ArrowUp` is `thrust`), so
 *  this NEVER auto-unbinds another action. `alsoBoundTo` lists the other actions
 *  that already hold `code`, purely so the overlay can flash an informational note. */
export function applyRebind(
  map: BindingMap,
  action: string,
  code: Binding,
): { map: BindingMap; alsoBoundTo: string[] }

/** A fresh map equal to the manifest defaults. */
export function resetToDefaults(manifest: ControlManifest): BindingMap

/** Reduce a resolved map back to only what differs from defaults (what we store). */
export function diffOverrides(manifest: ControlManifest, map: BindingMap): Overrides

/** Parse persisted JSON into Overrides, or null if malformed (the storage guard). */
export function parseOverrides(raw: unknown): Overrides | null
```

**Navigation state machine (pure).** Events are semantic, not raw DOM, so the whole thing
is node-tested with zero browser:

```ts
export type Screen =
  | { readonly name: 'menu'; readonly cursor: number }
  | { readonly name: 'controls'; readonly cursor: number; readonly capturing: string | null }

export type RebindEvent =
  | { t: 'up' } | { t: 'down' } | { t: 'select' } | { t: 'back' }
  | { t: 'capture'; code: Binding }   // a raw keydown while capturing

export type RebindCommand = 'resume' | 'save' | 'reset'

export function rebindReduce(
  screen: Screen,
  map: BindingMap,
  manifest: ControlManifest,
  event: RebindEvent,
): { screen: Screen; map: BindingMap; command?: RebindCommand }
```

### `src/shared/controls-overlay.ts` — browser subpath (ADR-0003 flagged)

Classified by its dirtiest dependency (`localStorage` + `ctx`), exactly like
`esc-overlay.ts` and `highscore.ts`. Three concerns:

**Storage** — mirrors `makeHighScoreStorage`:

```ts
export interface BindingStore {
  load(): Overrides                    // parseOverrides; malformed -> {}
  save(overrides: Overrides): void     // no-throw; silently in-memory if storage absent
}
export function makeBindingStore(gameId: string, storage?: Storage | null): BindingStore
```

- Defensive `getStorage()` (the `@shared/highscore` idiom): private-browsing / sandboxed
  contexts return null → in-memory only, never throws.
- Per-game key: `"<gameId>-keybinds"`.
- Persists `Overrides` (deltas), not the full map — so a later change to a game's default
  binding still reaches a player who never touched that action.

**Renderer** — built on `esc-overlay`'s existing `strokeCardLine` primitives, same dim +
centred card + shared vector font:

```ts
export function drawControlsOverlay(
  ctx: CanvasRenderingContext2D,
  container: Size,
  screen: Screen,
  map: BindingMap,
  manifest: ControlManifest,
  opts: ControlsOverlayOptions,   // color, opacity — the per-cabinet params esc-overlay already takes
): void
```

- `menu` screen: `RESUME` / `CONTROLS`, cursor-marked.
- `controls` screen: one row per control — `LABEL  … [ current binding ]` — plus
  `RESET DEFAULTS` and `BACK`; the cursor row and any `capturing` row are marked
  (e.g. `[ press a key… ]`).

**Controller** — the thing a game wires next to its existing pause wiring:

```ts
export interface ControlsOverlay {
  open(): void
  close(): void
  isOpen(): boolean
  handleKey(e: KeyboardEvent): boolean   // returns true if consumed (don't reach the sim)
  draw(ctx: CanvasRenderingContext2D, container: Size): void
  readonly bindings: BindingMap          // live, updated on every rebind/reset
}
export function createControlsOverlay(args: {
  manifest: ControlManifest
  store: BindingStore
  opts: ControlsOverlayOptions
  onChange?: (map: BindingMap) => void   // fired when bindings change, so input.ts re-reads
}): ControlsOverlay
```

`handleKey` translates raw keydown → the pure `RebindEvent`s and applies the reducer's
`command` (`resume` → `close`; `save` → `store.save(diffOverrides(...))` + `onChange`;
`reset` → `resetToDefaults` + save + `onChange`).

## Data flow

1. **Boot.** `input.ts` builds `store = makeBindingStore(gameId)`, then
   `map = resolveBindings(manifest, store.load())`. Held-keys tracks physical `e.code`.
   `sample()` reads `keys.any(map[action])`.
2. **Play.** Unchanged, except the key arrays come from `map` instead of a literal.
3. **ESC.** `@shared/pause` toggles the boolean sim-freeze (untouched). `main.ts` also
   calls `overlay.open()`; screen = `menu`.
4. **Menu.** ↑/↓ move cursor, Enter selects. `RESUME` → `close()` + unpause.
   `CONTROLS` → controls screen.
5. **Controls.** Cursor over rows. Enter on a control → `capturing`. Next non-Escape
   keydown → `applyRebind` (steal-on-conflict). Escape cancels capture, then backs out.
   `RESET DEFAULTS` → reset. `BACK` → menu.
6. **Apply.** Every rebind and reset runs `store.save` and fires `onChange`, so `input.ts`
   swaps in the new `map` and the change is live the instant the player resumes — no reload.

## Error handling

- **Storage absent / throws:** `getStorage()` returns null → store is in-memory; save is a
  no-op; game plays with session-only remaps, never crashes (matches highscore).
- **Malformed persisted JSON:** `parseOverrides` returns null → treated as `{}` → defaults.
- **Capture edge cases:** any `e.code` is a valid target *except* `Escape`, which is
  reserved for cancel/back and can never become a binding. Bare modifiers are captured
  normally — asteroids binds `ShiftLeft`/`ShiftRight` for hyperspace, so a player must be
  able to remap onto a lone modifier. Capture reads `e.code` and calls `e.preventDefault()`
  so the keypress does nothing else.
- **Conflicts:** capturing **replaces** an action's binding with the single new code; it
  never auto-unbinds another action, because deliberate overlaps exist (Space = fire+start).
  A code already bound elsewhere is allowed; `alsoBoundTo` lets the overlay flash a one-line
  "also X" note. Multi-key *defaults* (arrows + WASD) survive untouched until that action is
  rebound, at which point it collapses to the one chosen code; `RESET DEFAULTS` restores the
  full default list.

## Per-game adoption (all 12)

Each game gains a `ControlManifest` (in `shell/controls.ts`, or the top of `input.ts`) and
its `input.ts` changes from a literal `const KEYS = {…}` to
`resolveBindings(manifest, store.load())`, reading `keys.any(map[action])`. `main.ts` wires
`createControlsOverlay` beside its existing pause wiring: feed keydown through
`overlay.handleKey` while open, and `overlay.draw` after the frozen frame.

- **asteroids, joust** (already `e.code` + a clean table): near mechanical — the existing
  `KEYS` object *becomes* the manifest defaults.
- **battlezone** (the real work): its imperative dual-scheme arithmetic
  (`if (held('e')) left += 1`, arcade + friendly arrows simultaneously) is re-expressed as
  declared actions (`leftTreadFwd`, `leftTreadBack`, …, plus the friendly-arrow actions)
  that read resolved codes; its `installHeldKeys` drops the `idOf: e.key.toLowerCase()`
  override back to the default `e.code`. On QWERTY the codes are identical (`'e'`→`'KeyE'`),
  so no feel change.
- **red-baron, pac-man** (keyed on `e.key`): convert to `e.code` the same way.
- Remaining games: declare the manifest, swap the literal for the resolver.

## Testing

- **Pure (`src/shared/tests/`, node):** `resolveBindings` merge; `applyRebind` steal +
  `unboundFrom`; `resetToDefaults`; `diffOverrides` round-trips with `resolveBindings`;
  `parseOverrides` accepts valid, rejects garbage; `rebindReduce` full walk
  (navigate → capture → conflict → cancel → save/reset). Mutation-tested, non-vacuous.
- **Storage:** null-storage degrades silently (no throw, in-memory); malformed JSON →
  defaults. Reuse `tests/helpers/storage-stub.ts`.
- **Overlay render:** like `esc-overlay.test.ts` — assert the controls screen strokes each
  label and its current binding and marks the cursor / capturing row. Identity, not just
  "pixels changed": assert the specific rows/tokens are present, each mutation-tested.
- **Per-game (each vitest project):** inject a store with one remapped action; assert
  `sample()` responds to the *new* code and ignores the old. This is the integration-wiring
  proof, per game — built now, not deferred.
- **Orchestrator (`tests/`):** a convergence guard (sibling of `shell-convergence.test.mjs`)
  asserting every game in `GAMES` exports a `ControlManifest` and routes input through
  resolved bindings, so a future game cannot silently skip it.

## Commit structure

Per `shell-convergence.test.mjs` AC-3 (a *commit* test: green uncommitted, red once
committed): a fleet-wide `main.ts` change must be split into per-game commits, plus an
infra commit that touches no `main.ts`.

1. Infra: `@shared/keybind` + `@shared/controls-overlay` + `@shared/pause`/`esc-overlay`
   touch-ups + the orchestrator convergence guard — **no `main.ts`**.
2. One commit per game for its `input.ts`/`main.ts`/`controls.ts` adoption.

## Open risks

- **battlezone conversion is the schedule risk.** Its two control schemes running at once
  mean the manifest has more actions than any other game; the overlay must render a longer
  card. Verify the card still fits the viewport at battlezone's scale (eyeball at
  `:5270/battlezone/`).
- **`e.code` on non-QWERTY layouts** changes which physical key a character maps to. That is
  the intended, standard game behavior (position-stable, not character-stable) and is why
  the overlay exists — but note it in the changelog so it is not read as a regression.
