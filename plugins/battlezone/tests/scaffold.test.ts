// tests/scaffold.test.ts
//
// Battlezone-internal scaffold contract (bz1-1). These tests pin the invariants
// the epic's toolchain ruling names for battlezone's own tree: TypeScript strict,
// a black-canvas index.html booting src/main.ts, and the Math Box consumed from
// the shared library rather than a local copy.
//
// MONOREPO MIGRATION — this file lost two whole describes and one assertion,
// all false BY DESIGN once battlezone became `plugins/battlezone` in the arcade
// monorepo. What went, and why:
//
//   * `scaffold — vite.config.ts (pinned port 5276, base /)` (8 assertions).
//     battlezone has no vite.config.ts any more; the root owns the dev server,
//     the build and the port. The invariants themselves are NOT retired — the
//     host/`strictPort` pin is restored at the root and asserted ONCE, for the
//     whole cabinet, in the orchestrator suite. Do not re-create them here.
//   * `scaffold — package.json scripts (verbatim from star-wars)` (7 assertions).
//     The per-plugin package.json is a three-field stub (name/version/private)
//     with no scripts and no devDependencies: the root owns the toolchain, so
//     `npm run dev|build|preview|test|lint` inside a plugin is deliberately gone.
//   * `pins @arcade/shared as a git-URL dependency` (1 assertion, from the Math
//     Box describe). There is no git-URL pin any more — the shared library is
//     in-repo at src/shared, reached through the `@shared` alias.
//
// What SURVIVED is rewritten, not deleted: the tsconfig strict guard now follows
// the `extends` chain (the stub carries only `extends` + `include`, so a raw-text
// match on this file alone would find nothing while strictness is fully intact),
// and the Math Box assertions moved from the `@arcade/shared` specifier to
// `@shared`. Reaching up to the root config is deliberate and is the one place
// this file is no longer standalone-clone-pure — the plugin is not a repo now.
//
// The cross-repo wiring invariants (.gitignore, repos.yaml, justfile, lobby tile)
// live in the orchestrator suite: tests/battlezone-bootstrap.test.mjs.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — tsconfig.json (TypeScript strict, via the monorepo root config)', () => {
  it('tsconfig.json exists', () => {
    expect(existsSync(path('tsconfig.json')), 'plugins/battlezone/tsconfig.json must exist').toBe(
      true,
    )
  })

  it('enables strict mode, following the `extends` chain to whichever config sets it', () => {
    // Pre-migration this read battlezone's OWN tsconfig text for `"strict": true`.
    // The plugin stub carries only `extends` + `include`, so that text match would
    // now fail while strictness is entirely intact one level up. The INVARIANT is
    // unchanged — battlezone must compile under `strict` — so walk the chain
    // instead of dropping the guard. tsconfig may carry comments/trailing commas,
    // so this stays a raw-text assertion rather than JSON.parse.
    const visited: string[] = []
    let rel = 'tsconfig.json'
    let text = read(rel)

    while (!/"strict":\s*true/.test(text)) {
      const parent = text.match(/"extends":\s*"([^"]+)"/)?.[1]
      expect(
        parent,
        `${rel} neither sets "strict": true nor extends a config that might`,
      ).toBeTruthy()
      rel = join(dirname(rel), parent as string)
      expect(visited, `circular "extends" chain revisiting ${rel}`).not.toContain(rel)
      visited.push(rel)
      text = read(rel)
    }

    // NOT `expect(text).toMatch(/"strict":\s*true/)` — the loop can only exit
    // once that regex has already matched, so re-asserting it is a guard that
    // cannot fail. What is actually unguarded at this point is that the chain was
    // WALKED: if the plugin stub grew its own inline `"strict": true`, the loop
    // would never iterate, `visited` would stay empty, and strictness would have
    // quietly stopped being inherited from the root the way this migration
    // requires. Pin that instead.
    expect(
      visited.length,
      'strictness was satisfied without following a single "extends" — the plugin ' +
        'tsconfig is a stub that must INHERIT strict from the monorepo root, not set it locally',
    ).toBeGreaterThan(0)
  })
})

describe('scaffold — index.html boots a canvas via src/main.ts', () => {
  it('index.html exists', () => {
    expect(existsSync(path('index.html')), 'battlezone/index.html must exist').toBe(true)
  })

  it('loads the src/main.ts module and hosts a <canvas>', () => {
    const html = read('index.html')
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
    expect(html).toMatch(/<canvas/i)
  })
})

describe('scaffold — Math Box is consumed from the shared library, not a local copy (SH-2)', () => {
  // SH-2 (ADR-0001) retired the "port, don't share" local copy: the Math Box is
  // extracted to the shared library and consumed from it. The consumption route
  // changed with the monorepo collapse (a pinned git-URL dep → the in-repo
  // `@shared` alias); WHAT is consumed, and that no local copy came back, did not.
  it('no longer keeps a local src/core/math3d.ts (extracted to @shared/math3d)', () => {
    expect(
      existsSync(path('src/core/math3d.ts')),
      'battlezone/src/core/math3d.ts must be deleted — the Math Box now lives in @shared/math3d (SH-2)',
    ).toBe(false)
  })

  it('imports the Math Box from the shared subpath', () => {
    // camera.ts is battlezone's consumer of the Math Box.
    expect(read('src/core/camera.ts')).toMatch(/from '@shared\/math3d'/)
  })
})
