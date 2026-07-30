// tests/scaffold.test.ts
//
// Story cp1-1 — RED phase (O'Brien / TEA). Centipede-internal scaffold contract.
// These tests read Centipede's OWN config files and pin the invariants the story
// names: TS strict, an index.html booting src/main.ts into a <canvas>, and the
// src/core + src/shell skeletons the whole epic is built on.
//
// The cross-repo wiring invariants (justfile games/subrepos/serve, CLAUDE.md port
// row) live in the ORCHESTRATOR suite: tests/centipede-bootstrap.test.mjs — a
// subrepo test must never file-read orchestrator docs (tp1 lesson).
//
// ===========================================================================
// MONOREPO MIGRATION (Task 11 — centipede imported as plugins/centipede)
// ===========================================================================
//
// THREE whole describes were REMOVED here, all false BY DESIGN once centipede
// stopped being a standalone repo. Quoted by their exact old titles:
//
//   * `scaffold — vite.config.ts (pinned port 5278, base /)` (6 tests, 13
//     assertions). centipede has no vite.config.ts any more; the monorepo root
//     owns the dev server, the build, `base`, `strictPort` and the host pin.
//     The invariants are NOT retired — they are restored at the root by Task 19
//     and asserted ONCE for the whole cabinet in the orchestrator suite
//     (tests/monorepo-topology.test.mjs already holds the lobby's share). Do
//     not re-create them here.
//   * `scaffold — package.json scripts (verbatim from the sibling games)`
//     (8 tests, 11 assertions). The per-plugin package.json is a three-field
//     stub (name/version/private): no scripts, no devDependencies, no
//     node_modules of its own. `npm run dev|build|preview|test|lint` inside a
//     plugin is deliberately gone, and the Vite-8/Vitest-4 resolution check now
//     belongs to the root's single node_modules.
//   * `scaffold — CI deploy caller (.github/workflows/deploy.yml)` (5 tests, 12
//     assertions). There is no per-repo CI caller any more — the whole ten-line
//     `slabgorb/arcade/.github/workflows/deploy-r2.yml@main` shape, the
//     arcade-centipede bucket target and the sibling-bucket guard go with it.
//     One cabinet, one deploy; Task 12b owns whatever replaces it.
//
// What SURVIVED is REWRITTEN, not deleted: the tsconfig strict guard now
// asserts the stub DELEGATES strictness to the root instead of declaring it.
// That is the one place this file is no longer standalone-clone-pure — the
// plugin is not a repo now. `src/core + src/shell skeletons` and the index.html
// boot are untouched; the boundary they pin is exactly as load-bearing as it
// was, and the epic still lives on it.
//
// The `@arcade/shared` git-URL pin is gone with the package.json describe; the
// shared library is in-repo at src/shared, reached through the `@shared` alias.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — tsconfig.json (TypeScript strict, mirrors the sibling games)', () => {
  it('tsconfig.json exists', () => {
    expect(existsSync(path('tsconfig.json')), 'plugins/centipede/tsconfig.json must exist').toBe(
      true,
    )
  })

  it('inherits strict mode from the monorepo root — and never redeclares it', () => {
    // Pre-migration this read centipede's OWN tsconfig text for `"strict": true`.
    // The plugin stub carries only `extends` + `include`, so that text match would
    // now fail while strictness is entirely intact one level up. The INVARIANT is
    // unchanged — centipede must compile under `strict` — so follow the chain
    // instead of dropping the guard. tsconfig may carry comments/trailing commas,
    // so this stays raw-text rather than JSON.parse.
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

    // NOT `expect(text).toMatch(/"strict":\s*true/)` and NOT
    // `expect(visited.length).toBeGreaterThan(0)` — the loop can only exit once
    // that regex has matched, so either would be a guard that cannot fail.
    //
    // What the walk leaves UNGUARDED is the stub's own text, and the hole is
    // bigger than it looks: the loop searches for `"strict": true`, so a stub
    // carrying `"strict": false` does not match, the walk steps straight over
    // the override, finds `true` at the root and passes — while the effective
    // setting for this plugin is `false`. The pre-migration assertion read the
    // game's own file raw and had no such hole; walking the chain reintroduced it.
    //
    // So assert the stub does not mention `strict` AT ALL — deliberately stronger
    // than banning `false` specifically. This file's whole job is to DELEGATE, so
    // any local mention of `strict` is a lie about where strictness comes from:
    // `true` means it has quietly stopped inheriting, `false` means it inherits
    // and then silently undoes it. Either way the root config stops being the
    // single answer to "does centipede compile strict?". Raw text, so even the
    // word inside a stub comment trips it — a stub small enough to need no
    // comments is the point.
    //
    // Inherited verbatim from battlezone/red-baron (Task 10 review round), which
    // addressed this shape forward to centipede and joust by name.
    expect(
      read('tsconfig.json'),
      'the plugin tsconfig is a stub that must INHERIT strict from the monorepo root — ' +
        'it must not mention "strict" itself, in either direction: `true` means it stopped ' +
        'inheriting, `false` means it silently overrides the root the chain-walk above ' +
        'would then step straight past',
    ).not.toMatch(/"strict"/)
  })
})

describe('scaffold — index.html boots a canvas via src/main.ts', () => {
  it('index.html exists', () => {
    expect(existsSync(path('index.html')), 'centipede/index.html must exist').toBe(true)
  })

  it('loads the src/main.ts module and hosts a <canvas>', () => {
    const html = read('index.html')
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
    expect(html).toMatch(/<canvas/i)
  })
})

describe('scaffold — src/core + src/shell skeletons (the boundary the epic lives on)', () => {
  // The purity CONTENT rules (what core may not reference) live in
  // tests/purity.test.ts; this block only pins the skeleton STRUCTURE.

  it('src/main.ts exists (the shell entry point)', () => {
    expect(existsSync(path('src/main.ts')), 'centipede/src/main.ts must exist').toBe(true)
  })

  it('src/core/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/core')), 'centipede/src/core/ must exist').toBe(true)
    const files = readdirSync(path('src/core')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/core/ must hold at least one .ts module').toBeGreaterThan(0)
  })

  it('src/shell/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/shell')), 'centipede/src/shell/ must exist').toBe(true)
    const files = readdirSync(path('src/shell')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/shell/ must hold at least one .ts module').toBeGreaterThan(0)
  })
})
