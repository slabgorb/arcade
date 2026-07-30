// tests/loop-extraction.test.ts
//
// SH-5 (ADR-0001) — tempest's migration guard for the game-loop extraction.
// Unlike its siblings, tempest does NOT retire its shell/loop.ts: its wrapper
// carries real extra duties (an injected, testable now() clock, per-sub-step
// GameEvent draining, first-sub-step-only input, per-sub-step mode transitions,
// guarded callbacks, getState()). AC-3 has it COMPOSE OVER the shared kernel —
// delegating the fixed-timestep accumulator arithmetic to advanceFixedSteps from
// @shared/loop — rather than keep its own duplicate. So this guard asserts
// the composition (the wrapper stays AND pulls the accumulator from the shared
// module), not a deletion. Pure fs/text: reads only tempest's own files; the
// kernel's behavioural lock lives in src/shared/tests/loop.test.ts.
//
// MONOREPO MIGRATION: the shared kernel was consumed as a version-pinned git-URL
// dependency (`"@arcade/shared": "github:slabgorb/arcade-shared#<tag>"`) when this
// guard was written. It now lives in this repo at src/shared and is reached through
// the `@shared` alias, so the first assertion — `pins @arcade/shared as a git-URL
// dependency` — was REMOVED: its subject no longer exists by design. The AC-3
// composition contract it sat beside is unchanged and still guarded below.

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

describe('loop extraction — richer wrapper composes over @shared (SH-5, AC-3)', () => {
  it('KEEPS its richer src/shell/loop.ts wrapper (it composes over the kernel, it is not retired)', () => {
    expect(
      existsSync(path('src/shell/loop.ts')),
      "tempest/src/shell/loop.ts must remain — it wraps the shared kernel with tempest's injected clock, event drain and mode transitions (SH-5 AC-3)",
    ).toBe(true)
  })

  it('composes over the shared kernel: some src file imports from @shared/loop', () => {
    expect(
      someSrcImportsSharedLoop(),
      'no src/*.ts imports @shared/loop — the wrapper still duplicates the accumulator instead of composing over the shared kernel',
    ).toBe(true)
  })
})
