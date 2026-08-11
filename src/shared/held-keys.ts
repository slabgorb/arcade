// src/shared/held-keys.ts — SH4-2 RED stub (Han Solo / TEA).
//
// The held-keys input tracker, extracted from the six games that each hand-roll
// the same `Set<string>` + keydown-add/keyup-remove + membership pattern
// (asteroids, battlezone, joust, pac-man, red-baron; centipede already disposes
// and keeps its own). This is a fourth compositional shell helper, a sibling of
// `@shared/host-helpers` — and it follows that module's two laws, NOT the
// setup's proposed `class HeldKeys { attach(element?) }` shape:
//
//   1. FACTORY-RETURNS-HANDLE, never a class. Every host helper is a function
//      that installs and hands back a disposer (`installAudioUnlock`) or a
//      handle with `uninstall` (`installPauseToggle`). `installHeldKeys` is the
//      same.
//   2. EVERY SEAM IS A REQUIRED PARAMETER. `target` is positional and required.
//      An `attach(element?)` that falls back to `window` is exactly the mg1-5
//      "fails OPEN" hazard the host-helpers header warns about: a helper reading
//      `element ?? window` silently wires the real global on a typo. There is no
//      options-bag seam here — only behavioural config (`idOf`,
//      `preventDefaultFor`, `resetOnBlur`), none of which defaults to a live
//      global.
//
// RED SEAM: this stub exports the full contract so `tsc --noEmit` stays green,
// but every entry point throws "not implemented" so the behavioural suite in
// `tests/held-keys.test.ts` is RED until Dev (Yoda) fills it in.

/** A keyboard/focus event source — `window` in every game, a spy under test. */
export interface HeldKeysTarget {
  addEventListener(type: 'keydown' | 'keyup', listener: (e: KeyboardEvent) => void): void
  addEventListener(type: 'blur', listener: (e: Event) => void): void
  removeEventListener(type: 'keydown' | 'keyup', listener: (e: KeyboardEvent) => void): void
  removeEventListener(type: 'blur', listener: (e: Event) => void): void
}

/** Behavioural config. None of these is a test seam; none defaults to a global. */
export interface HeldKeysOptions {
  /**
   * Map a KeyboardEvent to the id stored in the set. Default: `e => e.code`.
   * The three shapes the fleet uses: `e.code` (asteroids, joust),
   * `e.key.toLowerCase()` (battlezone, pac-man), `e.key` (red-baron).
   */
  idOf?: (e: KeyboardEvent) => string
  /** Ids whose keydown calls `e.preventDefault()`. Default: none. */
  preventDefaultFor?: ReadonlySet<string>
  /** Reset the held set on the target's `blur`. Default: `true` (the leak fix). */
  resetOnBlur?: boolean
}

/** The live held-keys state, plus the way to detach every listener it installed. */
export interface HeldKeysHandle {
  /** Is this id currently held? */
  has(id: string): boolean
  /** Is ANY of these ids currently held? (asteroids' `any(codes)`.) */
  any(ids: readonly string[]): boolean
  /** Clear the held set — what a blur/focus-loss does, exposed for manual use. */
  reset(): void
  /** Remove keydown, keyup and (if installed) blur listeners. No leak. */
  uninstall(): void
}

/**
 * Install a held-keys tracker on `target`, returning a handle. Attaches keydown
 * (add), keyup (remove) and — unless `resetOnBlur` is false — a blur listener
 * that clears the set. `uninstall()` removes all three.
 */
export function installHeldKeys(_target: HeldKeysTarget, _options?: HeldKeysOptions): HeldKeysHandle {
  throw new Error('installHeldKeys: not implemented (SH4-2 RED)')
}
