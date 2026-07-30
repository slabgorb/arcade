// tests/loop-extraction.test.ts
//
// SH-5 (ADR-0001) — asteroids' migration guard for the game-loop extraction. The
// fixed-timestep createLoop is retired from src/shell/loop.ts and consumed from
// @shared/loop (asteroids was the source of truth for the CORRECTED
// started-boolean form). These invariants replace the old local shell/loop.ts +
// its tests/loop.test.ts unit suite — the behavioural lock now lives in the
// shared library's own tests/loop.test.ts (byte-identical golden). This guard is
// pure fs/text (it never imports the shared module, so it collects each miss
// granularly, matching the SH-3 rng-extraction idiom). Reads only asteroids' own
// files.
//
// MONOREPO NOTE: a third assertion here pinned the shared library as a git-URL
// dependency. It is gone — the library is now src/shared in this repo, reached
// through the @shared alias, so there is no dependency block left to assert on.
// The extraction contract — no local copy, a consumer on the shared module — is
// unchanged and still asserted below.

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
const someSrcImportsSharedLoop = (): boolean =>
  walkTs(path('src')).some((f) => readFileSync(f, 'utf8').includes('@shared/loop'))

describe('loop extraction — local copy retired, consumed from @shared/loop (SH-5)', () => {
  it('no longer keeps a local src/shell/loop.ts (extracted to @shared/loop)', () => {
    expect(
      existsSync(path('src/shell/loop.ts')),
      'asteroids/src/shell/loop.ts must be deleted — the loop now lives in @shared/loop (SH-5)',
    ).toBe(false)
  })

  it('re-points at least one consumer to import from @shared/loop', () => {
    expect(
      someSrcImportsSharedLoop(),
      'no src/*.ts imports @shared/loop — the loop was not migrated off the local copy',
    ).toBe(true)
  })
})
