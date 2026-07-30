// tests/core/name-entry-resolution.test.ts
//
// SH2-13 RED — originally the dependency-pin contract: star-wars had to consume
// the shared library at a ref whose exports map carried the /name-entry subpath
// (the shared keyboard initials-entry reducer). The pin at the time (v0.7.0)
// predated the module, so this failed until Dev re-pinned to the tag that shipped
// it. Since the monorepo migration the library is in-repo, so this is the same
// contract read through the `@shared` alias.
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
    expect(mod.stepNameEntry('', 'a', 3)).toBe('A')
    expect(mod.stepNameEntry('AC', 'Backspace', 3)).toBe('A')
    expect(mod.stepNameEntry('', 'Backspace', 3)).toBe('')
  })
})
