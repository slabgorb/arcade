// plugins/defender/tests/df3-6-input-snapshot.test.ts
//
// Story df3-6 — RED phase (Tyr One-Handed / TEA). AC2: the shell owns the PIA read and
// feeds the ship a PURE per-tick input snapshot { thrust, reverse, up, down, fire }; the
// core reads no DOM and no clock. The DOM sampling itself (installHeldKeys) is proven by
// the human playtest + the ?raw wiring guard (df3-6-shell-wiring.test.ts); THIS file pins
// the part that is pure and unit-testable: the key-membership → snapshot mapper, exactly
// as joust does (plugins/joust/src/shell/input.ts map()/mapPlayer1(), a pure function of
// a KeyMembership).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/shell/input.ts does not exist (only src/shell/render.ts). loadInput() throws a
// self-describing "not built yet" until Dev adds the pure mapper.
//
// ─── PROPOSED SEAM (TEA's contract) ──────────────────────────────────────────────
//   • NEW  src/shell/input.ts:
//       export function mapInput(held: KeyMembership): Input
//     Pure: reads the held-key set (@shared/held-keys KeyMembership) and returns the
//     Input snapshot. `reverse` is the RAW held bit — the one-press-one-flip edge lives
//     in the core (ship.stepReverse, df3-3), so the mapper carries no state.
//   • The Input type lives in src/core/sim.ts (core consumes it; shell must not export a
//     type core imports — keep the dependency shell → core, never core → shell).
// Bindings (which physical key = thrust) are Dev's choice and NOT pinned here: these
// tests key off a membership that answers all/none, so they verify the mapper is total
// and pure without coupling to a keymap.

import { describe, it, expect } from 'vitest'
import type { KeyMembership } from '@shared/held-keys'

type Input = {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
}
interface InputModule {
  mapInput: (held: KeyMembership) => Input
}

const ACTIONS = ['thrust', 'reverse', 'up', 'down', 'fire'] as const

/** A KeyMembership whose `has()` gives a fixed answer for every id. */
const membership = (answer: boolean): KeyMembership => ({ has: () => answer })

// A variable specifier so `tsc --noEmit` does not statically resolve a module that does
// not exist yet (TS2307 during RED); vitest resolves it at runtime, so the import throws
// and the loader reports the self-describing message below.
const INPUT_SPECIFIER = '../src/shell/input.js'

async function loadInput(): Promise<InputModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<InputModule>
    if (typeof mod.mapInput !== 'function') throw new Error('no `mapInput` export')
    return mod as InputModule
  } catch (e) {
    throw new Error(
      'src/shell/input.ts not built yet — GREEN (Dev) adds the pure mapper ' +
        '`mapInput(held: KeyMembership): Input` (joust shell/input.ts precedent): read the held-key set ' +
        'and return { thrust, reverse, up, down, fire }. Pure — no DOM read, no clock; the DOM sampling ' +
        `lives in the adapter main.ts installs via @shared/held-keys. (${(e as Error).message})`,
    )
  }
}

describe('df3-6 input snapshot — the pure key-membership → Input mapper', () => {
  it('returns exactly the five boolean actions the ship consumes', async () => {
    const { mapInput } = await loadInput()
    const snap = mapInput(membership(false))
    for (const a of ACTIONS) {
      expect(typeof snap[a], `Input.${a} must be a boolean`).toBe('boolean')
    }
  })

  it('nothing held → every action false', async () => {
    const { mapInput } = await loadInput()
    const snap = mapInput(membership(false))
    for (const a of ACTIONS) expect(snap[a], `Input.${a} should be false when no key is held`).toBe(false)
  })

  it('everything held → every action true (each action is wired to a key)', async () => {
    // A membership that answers `has` = true for every id must light every action. This
    // catches an action the mapper forgot to bind without pinning WHICH key binds it.
    const { mapInput } = await loadInput()
    const snap = mapInput(membership(true))
    for (const a of ACTIONS) expect(snap[a], `Input.${a} never turns true — it is bound to no key`).toBe(true)
  })

  it('is pure — the same membership yields an equal snapshot every call (no DOM/clock read)', async () => {
    const { mapInput } = await loadInput()
    const held = membership(true)
    expect(mapInput(held)).toEqual(mapInput(held))
  })
})
