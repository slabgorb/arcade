// tests/loop-extraction.test.ts
//
// SH-5 (ADR-0001) — battlezone's migration guard for the game-loop extraction.
// Unlike its siblings, battlezone never had a src/shell/loop.ts: it INLINED a
// variable-dt single-step loop in main.ts. AC-2 replaces that inlined loop with
// the shared fixed-timestep accumulator (@shared/loop) — a ratified
// cadence change (variable single-step → fixed 1/60 sub-steps, 0.05s → 0.25s
// stall clamp). These invariants prove main.ts no longer drives its own frame
// scheduling; the accumulator's behavioural lock lives in
// src/shared/tests/loop.test.ts. Pure fs/text: reads only battlezone's own files.
//
// MONOREPO MIGRATION — the first assertion, `pins @arcade/shared as a git-URL
// dependency` (`package.json` matched against
// /"@arcade\/shared":\s*"github:slabgorb\/arcade-shared#/), is REMOVED as false
// by design: the per-plugin package.json is a three-field stub and the shared
// library is in-repo at src/shared, reached through the `@shared` alias. The
// other two assertions are unchanged in intent and only had their specifier
// rewritten — battlezone must still import the shared loop and must still not
// drive its own requestAnimationFrame schedule.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

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

describe('loop extraction — inlined accumulator replaced by @shared (SH-5)', () => {
  it('imports createLoop from @shared/loop', () => {
    expect(
      someSrcImportsSharedLoop(),
      'no src/*.ts imports @shared/loop — battlezone was not migrated onto the shared loop',
    ).toBe(true)
  })

  it('no longer drives its own requestAnimationFrame loop in main.ts (the shared loop owns scheduling)', () => {
    expect(
      read('src/main.ts').includes('requestAnimationFrame'),
      'battlezone/src/main.ts must not call requestAnimationFrame directly — the shared createLoop owns the frame schedule now (SH-5 AC-2)',
    ).toBe(false)
  })
})
