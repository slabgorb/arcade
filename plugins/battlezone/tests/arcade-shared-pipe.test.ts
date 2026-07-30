// tests/arcade-shared-pipe.test.ts
//
// SH-1 consumer proof. Battlezone was the first game to consume the shared
// library (ADR-0001), and this file is the RUNTIME half of that proof: the
// shared library resolves and its real export imports under vitest. The build
// half is proven by the app build bundling src/main.ts, which imports the same
// export.
//
// MONOREPO MIGRATION — the subject changed, the contract did not. Pre-migration
// the library arrived as a version-pinned git-URL dependency, and the first
// assertion pinned the EXACT exported version (`SHARED_VERSION === '0.8.0'`) to
// prove a bumped pin had genuinely re-resolved through the lockfile rather than
// being served stale by a plain `npm install`. There is no pin and no lockfile
// entry any more, so that specific proof has no referent — but its intent does:
// prove the specifier reaches the REAL library, not something stale or shadowed.
// It is therefore REWRITTEN, not deleted: the imported constant is compared
// against the value read straight off src/shared/index.ts on disk, so a
// `@shared` that resolved to any other copy (a leftover node_modules
// @arcade/shared, a stale build artifact) fails here exactly as a stale pin used
// to. Nothing was removed from this file.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SHARED_VERSION } from '@shared/index'

// tests/ → plugin root → plugins/ → repo root → src/shared/index.ts.
const SHARED_INDEX = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'src',
  'shared',
  'index.ts',
)

describe('shared library pipe (SH-1)', () => {
  it('resolves the shared library through the @shared alias and imports its real export', () => {
    const onDisk = readFileSync(SHARED_INDEX, 'utf8').match(
      /SHARED_VERSION\s*=\s*['"]([^'"]+)['"]/,
    )?.[1]
    expect(onDisk, 'src/shared/index.ts must export a SHARED_VERSION literal').toBeTruthy()
    expect(
      SHARED_VERSION,
      '@shared did not resolve to this repo\'s src/shared — check for a shadowing node_modules copy',
    ).toBe(onDisk)
  })

  it('exposes the version as a non-empty semver-shaped string', () => {
    expect(typeof SHARED_VERSION).toBe('string')
    expect(SHARED_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
