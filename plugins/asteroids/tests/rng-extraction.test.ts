// tests/rng-extraction.test.ts
//
// SH-3 (ADR-0001) — asteroids' migration guard for the RNG extraction. The
// seeded PRNG is retired from src/core/rng.ts and consumed from
// @shared/rng (the MUTABLE contract, of which asteroids was the source of
// truth). These invariants replace the old local rng.ts + its tests/rng.test.ts
// unit suite — the determinism/behaviour lock now lives in the shared library's
// own tests/rng.test.ts (byte-identical golden, incl. every game). This guard is
// pure fs/text (it never imports the shared module, so it always collects and
// reports each miss granularly, matching SH-2's scaffold.test.ts idiom). Reads
// only asteroids' own files. RED until GREEN removes the local copy and
// re-points the consumers.
//
// MONOREPO NOTE: the shared library used to arrive as a version-pinned git-URL
// dependency, and a third assertion here pinned that. It is gone — the library
// is now src/shared in this repo, reached through the @shared alias, so there is
// no dependency block left to assert on. The extraction contract this file
// exists for — no local copy, consumers on the shared module — is unchanged and
// still asserted below.

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

describe('rng extraction — local copy retired, consumed from @shared/rng (SH-3)', () => {
  it('no longer keeps a local src/core/rng.ts (extracted to @shared/rng)', () => {
    expect(
      existsSync(path('src/core/rng.ts')),
      'asteroids/src/core/rng.ts must be deleted — the PRNG now lives in @shared/rng (SH-3)',
    ).toBe(false)
  })

  it('re-points at least one core consumer to import from @shared/rng', () => {
    expect(
      someSrcImportsSharedRng(),
      'no src/*.ts imports @shared/rng — consumers were not migrated off the local copy',
    ).toBe(true)
  })
})
