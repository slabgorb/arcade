// tests/loop-extraction.test.ts
//
// SH-5 (ADR-0001) — star-wars' migration guard for the game-loop extraction. The
// fixed-timestep createLoop is retired from src/shell/loop.ts and consumed from
// @shared/loop. star-wars shipped the BUGGY
// `last === 0` sentinel form; adopting the shared primitive both dedups the loop
// AND fixes that live swallow (the whole point of SH-5). The behavioural lock
// lives in the shared library's own tests/loop.test.ts. Pure fs/text (never imports the
// shared module), standalone-repo: reads only star-wars' own files.

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

describe('loop extraction — local copy retired, consumed from @shared (SH-5)', () => {
  it('no longer keeps a local src/shell/loop.ts (extracted to @shared/loop)', () => {
    expect(
      existsSync(path('src/shell/loop.ts')),
      'star-wars/src/shell/loop.ts must be deleted — the loop now lives in @shared/loop (SH-5)',
    ).toBe(false)
  })

  // REMOVED at the monorepo migration: `pins @arcade/shared as a git-URL dependency`.
  // Same reason as tests/rng-extraction.test.ts — the shared library is in-repo now
  // (src/shared, aliased @shared), so there is no git-URL pin to assert. The surviving
  // half of the contract (this game consumes the SHARED loop, not a local copy) is the
  // assertion below.

  it('re-points at least one consumer to import from @shared/loop', () => {
    expect(
      someSrcImportsSharedLoop(),
      'no src/*.ts imports @shared/loop — the loop was not migrated off the local copy',
    ).toBe(true)
  })
})
