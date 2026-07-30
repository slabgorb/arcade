// tests/name-entry-resolution.test.ts
//
// SH2-13 — the resolution contract: asteroids must reach the shared keyboard
// initials-entry reducer through the /name-entry subpath. This was a DEP-PIN
// contract (asteroids consumed @arcade/shared at a ref whose exports map carried
// the subpath); post-monorepo it is an ALIAS-resolution contract against
// src/shared. The reducer behaviour it smokes is unchanged.
//
// Isolated in its own file, and imported through a VARIABLE specifier with
// @vite-ignore, so the unresolvable subpath surfaces as this one test's
// failure — not a module-graph crash that would silence sibling tests (the
// SH2-5/SH2-6 precedent).
import { describe, it, expect } from 'vitest'

const SHARED_NAME_ENTRY_SUBPATH = '@shared/name-entry'

interface SharedNameEntryModule {
  stepNameEntry: (buffer: string, key: string, maxLength: number) => string
}

describe('SH2-13 — @shared/name-entry resolves with the shared reducer', () => {
  it('resolves the subpath and the reducer behaves (type, delete, guard)', async () => {
    const mod = (await import(
      /* @vite-ignore */ SHARED_NAME_ENTRY_SUBPATH
    )) as unknown as SharedNameEntryModule
    expect(typeof mod.stepNameEntry).toBe('function')
    // Smoke the three verbs the cabinet shares:
    expect(mod.stepNameEntry('', 'a', 3)).toBe('A') // type, uppercased
    expect(mod.stepNameEntry('AC', 'Backspace', 3)).toBe('A') // delete
    expect(mod.stepNameEntry('', 'Backspace', 3)).toBe('') // never past empty
  })
})
