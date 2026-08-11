// src/shared/held-keys.ts — SH4-2 (Han Solo / TEA, Julia / Dev).
//
// The held-keys input tracker, extracted from the six games that each hand-roll
// the same `Set<string>` + keydown-add/keyup-remove + membership pattern
// (asteroids, battlezone, joust, pac-man, red-baron; centipede already disposes
// and keeps its own). This is a fourth compositional shell helper, a sibling of
// `@shared/host-helpers`. It follows that module's ONE documented law and its
// observed convention, NOT the setup's proposed `class HeldKeys { attach(el?) }`:
//
//   1. FACTORY-RETURNS-HANDLE, never a class. This is the host-helpers CONVENTION
//      — not a rule its header spells out, but the shape every helper there takes:
//      a function that installs and hands back a disposer (`installAudioUnlock`)
//      or a handle with `uninstall` (`installPauseToggle`). `installHeldKeys` is
//      the same.
//   2. EVERY SEAM IS A REQUIRED PARAMETER. This one the host-helpers header DOES
//      document (its "WHY EVERY SEAM IS A REQUIRED PARAMETER" section, citing
//      mg1-5). `target` is positional and required; an `attach(element?)` that
//      falls back to `window` is exactly the "fails OPEN" hazard it warns about —
//      a helper reading `element ?? window` silently wires the real global on a
//      typo. There is no options-bag seam here — only behavioural config
//      (`idOf`, `preventDefaultFor`, `resetOnBlur`), none defaulting to a global.
//
// This is the fourth compositional shell helper — the held-keys tracker the six
// games hand-rolled, now with the two things four of them lacked: a blur reset
// so a key does not stick after alt-tab, and a disposer so navigating away does
// not orphan the listeners.

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

/**
 * The read side of a held-keys set: "is this id down?". A real `Set<string>`
 * satisfies it too, so a consumer typed against this accepts either the handle
 * or a plain Set (what joust's pure mappers take).
 */
export interface KeyMembership {
  has(id: string): boolean
}

/** The live held-keys state, plus the way to detach every listener it installed. */
export interface HeldKeysHandle extends KeyMembership {
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
export function installHeldKeys(target: HeldKeysTarget, options?: HeldKeysOptions): HeldKeysHandle {
  const held = new Set<string>()
  const idOf = options?.idOf ?? ((e: KeyboardEvent) => e.code)
  const preventDefaultFor = options?.preventDefaultFor
  const resetOnBlur = options?.resetOnBlur ?? true

  const onKeyDown = (e: KeyboardEvent): void => {
    const id = idOf(e)
    held.add(id)
    if (preventDefaultFor?.has(id)) e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    held.delete(idOf(e))
  }
  const onBlur = (): void => {
    held.clear()
  }

  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  if (resetOnBlur) target.addEventListener('blur', onBlur)

  return {
    has: (id) => held.has(id),
    any: (ids) => ids.some((id) => held.has(id)),
    reset: () => held.clear(),
    uninstall: () => {
      target.removeEventListener('keydown', onKeyDown)
      target.removeEventListener('keyup', onKeyUp)
      if (resetOnBlur) target.removeEventListener('blur', onBlur)
    },
  }
}
