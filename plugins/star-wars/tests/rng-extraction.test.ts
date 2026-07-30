// tests/rng-extraction.test.ts
//
// SH-3 (ADR-0001) — star-wars' migration guard for the RNG extraction. The
// seeded PRNG is retired from src/core/rng.ts and consumed from the shared
// library (the MUTABLE contract — star-wars is its original author). star-wars
// had no dedicated rng unit suite; the determinism/behaviour lock now lives in
// the shared library's own tests/rng.test.ts. This
// guard is pure fs/text (it never imports the shared module, so it always
// collects and reports each miss granularly, matching SH-2's scaffold.test.ts
// idiom). Standalone-repo pure: reads only star-wars' own files. RED until GREEN
// removes the local copy, pins the dep, and re-points the consumers.

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
      'star-wars/src/core/rng.ts must be deleted — the PRNG now lives in @shared/rng (SH-3)',
    ).toBe(false)
  })

  // REMOVED at the monorepo migration: `pins @arcade/shared as a git-URL dependency`.
  // The shared library is no longer an npm dependency of this game at all — it is
  // src/shared/ in this same repo, reached through the `@shared` alias. There is no
  // package.json dependency block left for that assertion to read, so it is false BY
  // DESIGN, not merely inconvenient. The half of it that still means something — that
  // this game consumes the shared RNG rather than a local copy — is the assertion below,
  // which is unchanged in intent and only re-pointed at the new specifier.

  it('re-points at least one core consumer to import from @shared/rng', () => {
    expect(
      someSrcImportsSharedRng(),
      'no src/*.ts imports @shared/rng — consumers were not migrated off the local copy',
    ).toBe(true)
  })
})
