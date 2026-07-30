// tests/core/name-entry-resolution.test.ts
//
// SH2-13 RED — the resolution contract: tempest must consume the shared library
// at a ref whose exports map carries the /name-entry subpath (the shared
// keyboard initials-entry reducer). Written when the library was a version-pinned
// git-URL dependency and the pin (v0.6.0) predated the module entirely, so this
// failed until Dev re-pinned to the tag that shipped it. The monorepo migration
// replaced the pin with the in-repo `@shared` alias; the assertion is unchanged —
// the subpath must still resolve and the reducer must still behave.
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
