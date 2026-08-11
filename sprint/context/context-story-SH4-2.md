# Story SH4-2 — Extract held-keys input tracker into shared shell helper

**Epic:** SH4 · **Points:** 5 · **Priority:** p2 · **Type:** refactor · **Repo:** arcade · **Workflow:** tdd

## Summary

Extract the held-keys input tracker pattern (Set<string> + keydown-add/keyup-remove + membership tests) duplicated across 6 games into a reusable shared shell helper beside `@shared/host-helpers`. The extraction includes parameterization for the key-identity function and blur-reset, plus disposal cleanup so 5 leaky input-listener sites stop accumulating orphaned event handlers.

## Technical Approach

### Current state (measured facts — ground truth at setup)

**All 6 games carry the held-keys pattern:**
- **asteroids**: `plugins/asteroids/src/shell/input.ts:60` (Set-based; partial blur reset at line 98, no removeEventListener)
- **battlezone**: `plugins/battlezone/src/shell/input.ts:23` (class-based InputController with private `down` Set; no removeEventListener)
- **centipede**: `plugins/centipede/src/shell/input.ts:108` (Set-based; **already calls removeEventListener** — not leaky, has dispose; EXCLUDE from migration)
- **joust**: `plugins/joust/src/main.ts:426` (Set-based; no removeEventListener)
- **pac-man**: `plugins/pac-man/src/main.ts:96` (Set-based; no removeEventListener)
- **red-baron**: `plugins/red-baron/src/main.ts:356` (Set-based; no removeEventListener)

**File location split:**
- **shell/ location:** asteroids, battlezone, centipede (input.ts pattern)
- **main.ts location:** joust, pac-man, red-baron (inlined in main)

**Leaky sites (lack removeEventListener):**
> ⚠ The title says "4 leaky sites" but audit counts **5 leaky sites** (all non-centipede): asteroids (partial blur only), battlezone, joust, pac-man, red-baron. None call removeEventListener; centipede is the ONLY game that cleans up.

**Key-identity function variation (3 shapes, not 2):**
1. `e.code` — asteroids, joust
2. `e.key.toLowerCase()` — battlezone, pac-man
3. `e.key` / `String(e.key)` — centipede, red-baron

### Design

**Shared module location:** `src/shared/host-helpers/heldKeys.ts` (alongside the existing host-helpers)

**HeldKeys abstraction:**
```typescript
export interface HeldKeysConfig {
  idOf?: (e: KeyboardEvent) => string;        // default: e.code
  preventDefaultFor?: Set<string>;             // optional set of key ids to preventDefault()
  onBlur?: () => void;                         // optional blur-reset callback
}

export class HeldKeys {
  keys: Set<string>;
  config: HeldKeysConfig;
  
  constructor(config?: HeldKeysConfig);
  
  add(key: string): void;
  has(key: string): boolean;
  any(...keys: string[]): boolean;
  remove(key: string): void;
  reset(): void;                              // clears the set (used by blur handler)
  
  attach(element?: Window | Element): void;   // adds keydown/keyup listeners
  dispose(): void;                            // removes keydown/keyup listeners
}
```

**Parameterization:**
- `idOf` defaults to `(e: KeyboardEvent) => e.code`; games pass custom extractors to handle `e.key.toLowerCase()` or `e.key` variants
- `preventDefaultFor` is an optional Set of key identities; if provided, matching keys trigger `e.preventDefault()`
- `onBlur` callback allows games to reset the set when the window loses focus (asteroids partial pattern)

**Disposal pattern:**
- All 5 leaky games must call `heldKeys.dispose()` on cleanup (shutdown/unmount)
- `dispose()` removes the registered keydown/keyup listeners, preventing listener accumulation on page navigations

## Acceptance Criteria

- [ ] HeldKeys class exported from `src/shared/host-helpers/heldKeys.ts` with documented config interface
- [ ] Supports all three key-identity shapes: `e.code`, `e.key.toLowerCase()`, `e.key`
- [ ] `preventDefaultFor` parameter gates `e.preventDefault()` per-key
- [ ] `onBlur` callback allows games to reset the held-keys set on window blur
- [ ] `attach(element?)` method registers keydown/keyup listeners (defaults to `window`)
- [ ] `dispose()` method removes all attached listeners, preventing listener leaks
- [ ] Centipede continues using its own implementation (no migration — already has dispose)
- [ ] Asteroids migrates to HeldKeys with `e.code` idOf and `onBlur` reset
- [ ] Battlezone migrates: unwrap the class-based InputController and use HeldKeys with `e.key.toLowerCase()` idOf
- [ ] Joust migrates to HeldKeys with `e.code` idOf, removes leak from main.ts
- [ ] Pac-man migrates to HeldKeys with `e.key.toLowerCase()` idOf, removes leak from main.ts
- [ ] Red-baron migrates to HeldKeys with `e.key` idOf, removes leak from main.ts
- [ ] All 5 migrating games call `dispose()` on shutdown (module cleanup / unmount)
- [ ] Existing test suites for all 5 games stay green (no determinism changes, render output preserved)
- [ ] Shared test (`tests/shared/host-helpers.test.ts`) covers HeldKeys initialization, add/remove/any, blur-reset, dispose cleanup

## Test Coverage

**Shared-library suite** (`tests/shared/host-helpers.test.ts` or similar):
1. Instantiate with default idOf (`e.code`)
2. Add and has membership checks
3. `any()` with multiple keys
4. Custom `idOf` (lowercase variant)
5. `preventDefaultFor` prevents default on matching keys
6. `onBlur` callback resets the set on window blur event
7. `dispose()` removes listeners; subsequent events are not captured

**Per-game suites (via existing vitest projects):**
1. Each game's existing tests must remain green (determinism + render)
2. Input integration: verify held-key state propagates correctly via the new helper

## References

- **Audit:** Shared-library extraction survey (2026-08-08)
- **Context:** `sprint/context/context-epic-SH4.md`
- **Extraction pattern:** ADR-0001 (algorithm-identical duplication bar)
- **Related:** SH4-1 (model-view helpers), SH4-3 (raster letterbox), SH4-4 (clamp), SH4-5 (audio-dispatch)
