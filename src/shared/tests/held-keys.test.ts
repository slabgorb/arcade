// @vitest-environment jsdom
//
// tests/held-keys.test.ts — SH4-2 RED (Han Solo / TEA).
//
// The held-keys input tracker extracted into `@shared/held-keys`. Every
// assertion here is about the BEHAVIOUR the helper provides — never that a game
// "called" it — so disabling any mechanism inside `installHeldKeys` reddens a
// named case (the mutation battery is recorded in the TEA Assessment of
// `.session/SH4-2-session.md`).
//
// ── WHY A FACTORY WITH A REQUIRED TARGET, NOT `new HeldKeys().attach(el?)` ────
// This helper is a sibling of `@shared/host-helpers` and obeys its two laws:
// factory-returns-handle (like `installPauseToggle`), and every seam is a
// REQUIRED positional parameter. `target` is required — an `attach(element?)`
// that falls back to `window` is the mg1-5 "fails OPEN" hazard (an absent seam
// degrading to the real global). So these cases always pass a `target`
// explicitly, and the leak/dispose cases use a structural SPY target that
// counts listener add/remove so a partial disposer cannot pass.
//
// ── WHY jsdom + real KeyboardEvents ──────────────────────────────────────────
// The `shared` project is `environment: 'node'`; this file opts into jsdom via
// the docblock (the `host-helpers.test.ts` idiom). The whole contract is real
// keyboard/focus semantics — `e.code` vs `e.key`, `preventDefault`, listener
// attachment and removal — and a hand-rolled event fake would model the
// round-trip instead of exercising it.
import { describe, it, expect } from 'vitest'
import { installHeldKeys, type HeldKeysTarget } from '../held-keys'

/** Press a key on `window` with distinct `code` and `key` so tests can tell the
 *  default idOf (`e.code`) from an `e.key`/`e.key.toLowerCase()` override. */
function press(code: string, key: string, opts: { cancelable?: boolean } = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { code, key, cancelable: opts.cancelable ?? false })
  window.dispatchEvent(e)
  return e
}
function release(code: string, key: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key }))
}

/** A structural spy target: records every listener add/remove as a multiset so
 *  the leak-fix cases can prove `uninstall()` removes exactly what it installed.
 *  Satisfies `HeldKeysTarget` (the narrow interface `window` also satisfies). */
function spyTarget(): HeldKeysTarget & {
  live: () => Array<{ type: string }>
  emit: (type: 'keydown' | 'keyup', e: KeyboardEvent) => void
  emitBlur: () => void
} {
  const listeners = new Map<
    string,
    Set<(e: KeyboardEvent) => void | ((e: Event) => void)>
  >()
  const add = (type: string, fn: (e: never) => void): void => {
    const set = listeners.get(type) ?? new Set()
    set.add(fn as never)
    listeners.set(type, set)
  }
  const remove = (type: string, fn: (e: never) => void): void => {
    listeners.get(type)?.delete(fn as never)
  }
  return {
    addEventListener: add as HeldKeysTarget['addEventListener'],
    removeEventListener: remove as HeldKeysTarget['removeEventListener'],
    live: () =>
      [...listeners.entries()].flatMap(([type, set]) =>
        [...set].map(() => ({ type })),
      ),
    emit: (type, e) => {
      for (const fn of listeners.get(type) ?? []) (fn as (e: KeyboardEvent) => void)(e)
    },
    emitBlur: () => {
      for (const fn of listeners.get('blur') ?? []) (fn as (e: Event) => void)(new Event('blur'))
    },
  }
}

describe('installHeldKeys — membership with the default idOf (e.code)', () => {
  it('adds an id on keydown and removes it on keyup', () => {
    const held = installHeldKeys(window)
    expect(held.has('KeyZ')).toBe(false)
    press('KeyZ', 'z')
    expect(held.has('KeyZ')).toBe(true)
    release('KeyZ', 'z')
    expect(held.has('KeyZ')).toBe(false)
    held.uninstall()
  })

  it('keys on e.code by DEFAULT, not e.key — the two must differ for this to bite', () => {
    // Anti-vacuity (TS lang-review #18): press a key whose `code` ('KeyW') and
    // `key` ('w') differ. Under the default idOf the set holds 'KeyW' and NOT
    // 'w'; an implementation that stored `e.key` would fail here rather than
    // pass by coincidence.
    const held = installHeldKeys(window)
    press('KeyW', 'w')
    expect(held.has('KeyW')).toBe(true)
    expect(held.has('w')).toBe(false)
    held.uninstall()
  })

  it('any(ids) is true iff at least one is held, and reads the whole list', () => {
    const held = installHeldKeys(window)
    expect(held.any(['ArrowLeft', 'KeyA'])).toBe(false)
    press('KeyA', 'a')
    // 'KeyA' is the SECOND entry, so a helper that only checked ids[0] fails.
    expect(held.any(['ArrowLeft', 'KeyA'])).toBe(true)
    expect(held.any(['ArrowLeft', 'ArrowRight'])).toBe(false)
    held.uninstall()
  })
})

describe('installHeldKeys — custom idOf (the three fleet shapes)', () => {
  it('e.key.toLowerCase() variant folds case and ignores e.code (battlezone/pac-man)', () => {
    // Press with an UPPER-CASE key and a code that would win under the default.
    // Only a helper that actually READ idOf and lower-cased stores 'w'.
    const held = installHeldKeys(window, { idOf: (e) => e.key.toLowerCase() })
    press('KeyW', 'W')
    expect(held.has('w')).toBe(true)
    expect(held.has('W')).toBe(false)
    expect(held.has('KeyW')).toBe(false)
    held.uninstall()
  })

  it('e.key variant stores the raw key, case preserved (red-baron)', () => {
    const held = installHeldKeys(window, { idOf: (e) => e.key })
    press('KeyW', 'W')
    expect(held.has('W')).toBe(true)
    expect(held.has('w')).toBe(false)
    held.uninstall()
  })
})

describe('installHeldKeys — preventDefaultFor', () => {
  it('calls preventDefault() only for ids in the set', () => {
    const held = installHeldKeys(window, { preventDefaultFor: new Set(['Space']) })
    const prevented = press('Space', ' ', { cancelable: true })
    const untouched = press('KeyX', 'x', { cancelable: true })
    // Two keys, opposite expectations: a blanket preventDefault (or none) fails.
    expect(prevented.defaultPrevented).toBe(true)
    expect(untouched.defaultPrevented).toBe(false)
    held.uninstall()
  })

  it('prevents nothing when preventDefaultFor is omitted', () => {
    const held = installHeldKeys(window)
    const e = press('Space', ' ', { cancelable: true })
    expect(e.defaultPrevented).toBe(false)
    held.uninstall()
  })
})

describe('installHeldKeys — blur reset (the stuck-key leak fix)', () => {
  it('clears the held set on the target blur by default', () => {
    // The asteroids bug: alt-tab away with a key down and it stays "held". The
    // helper must clear the set on blur so the key does not stick.
    const held = installHeldKeys(window)
    press('KeyA', 'a')
    press('KeyB', 'b')
    expect(held.has('KeyA')).toBe(true)
    window.dispatchEvent(new Event('blur'))
    expect(held.has('KeyA')).toBe(false)
    expect(held.has('KeyB')).toBe(false)
    held.uninstall()
  })

  it('reset() clears the set directly', () => {
    const held = installHeldKeys(window)
    press('KeyA', 'a')
    held.reset()
    expect(held.has('KeyA')).toBe(false)
    held.uninstall()
  })

  it('does NOT install a blur reset when resetOnBlur is false — the flag is read', () => {
    const held = installHeldKeys(window, { resetOnBlur: false })
    press('KeyA', 'a')
    window.dispatchEvent(new Event('blur'))
    expect(held.has('KeyA')).toBe(true)
    held.uninstall()
  })
})

describe('installHeldKeys — dispose without leaking listeners', () => {
  it('attaches keydown, keyup and blur on the target', () => {
    const target = spyTarget()
    installHeldKeys(target)
    const types = target.live().map((l) => l.type).sort()
    expect(types).toEqual(['blur', 'keydown', 'keyup'])
  })

  it('uninstall() removes every listener it installed — net zero, no accumulation', () => {
    // The actual leak the story fixes: the four leaky sites never remove their
    // handlers. A disposer that removed only keydown (the likely partial) leaves
    // keyup and blur live, so this asserts the multiset is emptied entirely.
    const target = spyTarget()
    const held = installHeldKeys(target)
    expect(target.live().length).toBe(3)
    held.uninstall()
    expect(target.live().length).toBe(0)
  })

  it('stops tracking after uninstall — a later keydown is not captured', () => {
    const target = spyTarget()
    const held = installHeldKeys(target)
    held.uninstall()
    // If uninstall left the keydown listener attached, this would re-populate.
    target.emit('keydown', new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }))
    expect(held.has('KeyA')).toBe(false)
  })

  it('does not double-count a listener when resetOnBlur is false (no orphan blur handler)', () => {
    const target = spyTarget()
    const held = installHeldKeys(target, { resetOnBlur: false })
    const types = target.live().map((l) => l.type).sort()
    expect(types).toEqual(['keydown', 'keyup'])
    held.uninstall()
    expect(target.live().length).toBe(0)
  })
})
