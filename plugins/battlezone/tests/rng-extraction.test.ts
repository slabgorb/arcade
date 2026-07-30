// tests/rng-extraction.test.ts
//
// SH-3 (ADR-0001) — battlezone's migration guard for the RNG extraction. The
// seeded PRNG is retired from src/core/rng.ts and consumed from the shared
// library (the MUTABLE contract). These invariants replace battlezone's local
// rng.ts + tests/core/rng.test.ts — the determinism/behaviour lock now lives in
// src/shared/tests/rng.test.ts. This guard is pure fs/text (it never imports the
// shared module, so it always collects and reports each miss granularly,
// matching SH-2's scaffold.test.ts idiom).
//
// MONOREPO MIGRATION — the third assertion, `pins @arcade/shared as a git-URL
// dependency` (`package.json` matched against
// /"@arcade\/shared":\s*"github:slabgorb\/arcade-shared#/), is REMOVED as false
// by design: the per-plugin package.json is a three-field stub and the shared
// library is in-repo at src/shared, reached through the `@shared` alias. The
// other two assertions are unchanged in intent and only had their specifier
// rewritten — battlezone must still keep no local PRNG and must still consume
// the shared one.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkTs(full))
    else if (full.endsWith('.ts')) out.push(full)
  }
  return out
}
const someSrcImportsSharedRng = (): boolean =>
  walkTs(path('src')).some((f) => readFileSync(f, 'utf8').includes('@shared/rng'))

describe('rng extraction — local copy retired, consumed from @shared (SH-3)', () => {
  it('no longer keeps a local src/core/rng.ts (extracted to @shared/rng)', () => {
    expect(
      existsSync(path('src/core/rng.ts')),
      'battlezone/src/core/rng.ts must be deleted — the PRNG now lives in @shared/rng (SH-3)',
    ).toBe(false)
  })

  it('re-points at least one core consumer to import from @shared/rng', () => {
    expect(
      someSrcImportsSharedRng(),
      'no src/*.ts imports @shared/rng — consumers were not migrated off the local copy',
    ).toBe(true)
  })
})
