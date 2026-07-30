// tests/highscore-extraction.test.ts
//
// SH-6 (ADR-0001) — battlezone's migration guard for the HIGH-SCORE extraction.
// battlezone is the surviving FOURTH hand-copy of the high-score table +
// persistence seam (src/core/highscore.ts + src/shell/storage.ts) that SH-4
// lifted out of tempest/star-wars/asteroids into @shared/highscore. This
// story retires battlezone's local copies and consumes the SAME module the
// lobby already reads with — turning the `{gameId}-high-scores` convention into
// a compile-time contract for the last game too. These invariants mirror
// battlezone's own rng-extraction.test.ts (SH-3): pure fs/text, so they collect
// and report each miss granularly and never depend on the shared module
// resolving. RED until GREEN deletes the local copies, bumps the pin to the
// #v0.4.0 tag (the version that carries the ./highscore subpath), and re-points
// every consumer.
//
// The superseded local suites — tests/core/highscore.table.test.ts and
// tests/shell/storage.test.ts — must be DELETED by GREEN alongside the source
// (the table logic + storage seam are now proven in the shared library's own
// highscore.test.ts), exactly as SH-4 deleted the sibling games' local suites.
// tests/core/screens.test.ts is NOT superseded — it must be RE-POINTED to the
// shared entry type (it imports HighScoreTable for its SAMPLE_TABLE).
//
// MONOREPO MIGRATION — one assertion, `pins @arcade/shared as a git-URL
// dependency (carrying the ./highscore subpath)` (`package.json` matched against
// /"@arcade\/shared":\s*"github:slabgorb\/arcade-shared#/), is REMOVED as false
// by design: the per-plugin package.json is a three-field stub and the shared
// library is in-repo at src/shared, reached through the `@shared` alias. The
// other seven assertions are unchanged in intent and only had their specifier
// rewritten.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

const srcFiles = (): string[] => walkTs(path('src'))
const someSrcImportsSharedHighscore = (): boolean =>
  srcFiles().some((f) => readFileSync(f, 'utf8').includes('@shared/highscore'))

// A relative import of the retired local modules — `./highscore`,
// `../core/highscore`, `./shell/storage`, `../shell/storage`. The leading `.`
// is what distinguishes them from the shared `@shared/highscore`.
const LOCAL_HIGHSCORE_IMPORT = /from\s+['"]\.[^'"]*highscore['"]/
const LOCAL_STORAGE_IMPORT = /from\s+['"]\.[^'"]*storage['"]/
const srcFilesImportingLocal = (re: RegExp): string[] =>
  srcFiles().filter((f) => re.test(readFileSync(f, 'utf8')))

describe('high-score extraction — local copies retired, consumed from @shared (SH-6)', () => {
  it('no longer keeps a local src/core/highscore.ts (extracted to @shared/highscore)', () => {
    expect(
      existsSync(path('src/core/highscore.ts')),
      'battlezone/src/core/highscore.ts must be deleted — the table logic now lives in @shared/highscore (SH-6)',
    ).toBe(false)
  })

  it('no longer keeps a local src/shell/storage.ts (extracted to @shared/highscore)', () => {
    expect(
      existsSync(path('src/shell/storage.ts')),
      'battlezone/src/shell/storage.ts must be deleted — the persistence seam is now makeHighScoreStorage from @shared/highscore (SH-6)',
    ).toBe(false)
  })

  it('re-points at least one src consumer to import from @shared/highscore', () => {
    expect(
      someSrcImportsSharedHighscore(),
      'no src/*.ts imports @shared/highscore — consumers were not migrated off the local copy',
    ).toBe(true)
  })

  it('leaves NO src consumer importing the retired local highscore module', () => {
    const stragglers = srcFilesImportingLocal(LOCAL_HIGHSCORE_IMPORT).map((f) => f.replace(root, '.'))
    expect(
      stragglers,
      `these src files still import the deleted local ./highscore: ${stragglers.join(', ')}`,
    ).toEqual([])
  })

  it('leaves NO src consumer importing the retired local storage seam', () => {
    const stragglers = srcFilesImportingLocal(LOCAL_STORAGE_IMPORT).map((f) => f.replace(root, '.'))
    expect(
      stragglers,
      `these src files still import the deleted local ./shell/storage: ${stragglers.join(', ')}`,
    ).toEqual([])
  })

  it('wires main.ts to the shared persistence factory under the battlezone gameId', () => {
    // Mirrors asteroids/star-wars main.ts: makeHighScoreStorage('<game>', <guard>).
    // battlezone has NO domain field (the run is the unit), so it binds the
    // domain-AGNOSTIC base guard isHighScoreRow — not makeHighScoreRowGuard.
    expect(read('src/main.ts')).toMatch(/makeHighScoreStorage\(\s*['"]battlezone['"]/)
  })

  it('re-points the capture path in core/sim.ts to the shared table logic', () => {
    // sim.ts's returnToAttract folds a qualifying run into the board via
    // qualifiesForHighScore/insertHighScore — after SH-6 those come from shared.
    const sim = read('src/core/sim.ts')
    expect(sim).toContain('@shared/highscore')
    expect(sim).toMatch(/qualifiesForHighScore/)
    expect(sim).toMatch(/insertHighScore/)
  })
})
