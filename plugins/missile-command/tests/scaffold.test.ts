// plugins/missile-command/tests/scaffold.test.ts
//
// Story mc1-1 — RED phase (Han Solo / TEA). The plugin-internal scaffold
// contract for the eighth game: the four-file shape, the plugin.ts meta the
// registry is generated from, and the src/core + src/shell skeleton the whole
// game is built on. The ORCHESTRATOR-side wiring (justfile games, vitest GAMES,
// registry) is guarded separately by tests/missile-command-bootstrap.test.mjs.
//
// This runs under the `missile-command` vitest project, which GREEN must add to
// vitest.config.ts's GAMES — until then this file is uncollected and
// `npx vitest run --project missile-command` reports no such project. That is
// the project-level RED; the file-level RED lands the moment the project exists
// and these assertions run against an unbuilt plugin.
//
// The strict-inheritance walk is inherited from the sibling games (jt1-1/Task 10):
// the plugin tsconfig is a stub that DELEGATES strictness to the monorepo root.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — tsconfig.json (delegates strict to the monorepo root)', () => {
  it('tsconfig.json exists', () => {
    expect(existsSync(path('tsconfig.json')), 'plugins/missile-command/tsconfig.json must exist').toBe(true)
  })

  it('inherits strict mode via the extends chain, and never redeclares it', () => {
    const visited: string[] = []
    let rel = 'tsconfig.json'
    let text = read(rel)

    while (!/"strict":\s*true/.test(text)) {
      const parent = text.match(/"extends":\s*"([^"]+)"/)?.[1]
      expect(parent, `${rel} neither sets "strict": true nor extends a config that might`).toBeTruthy()
      rel = join(dirname(rel), parent as string)
      expect(visited, `circular "extends" chain revisiting ${rel}`).not.toContain(rel)
      visited.push(rel)
      text = read(rel)
    }

    // The stub must not mention "strict" in either direction: `true` means it
    // stopped inheriting; `false` means it inherits then silently overrides the
    // root the walk above would step straight past. Raw text so even a comment trips.
    expect(
      read('tsconfig.json'),
      'the plugin tsconfig is a stub that must INHERIT strict from the monorepo root — it must not mention "strict" itself',
    ).not.toMatch(/"strict"/)
  })

  it('type-checks both src and tests (the stub must not narrow its own coverage)', () => {
    const cfg = read('tsconfig.json')
    expect(cfg).toMatch(/"include":[^\]]*"src"/)
    expect(cfg).toMatch(/"include":[^\]]*"tests"/)
  })

  it('extends the monorepo root tsconfig', () => {
    expect(read('tsconfig.json')).toMatch(/"extends":\s*"\.\.\/\.\.\/tsconfig\.json"/)
  })
})

describe('scaffold — package.json is the three-field stub', () => {
  it('package.json exists and is {name, version, private}', () => {
    expect(existsSync(path('package.json')), 'plugins/missile-command/package.json must exist').toBe(true)
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.name, 'package.json name must be "missile-command"').toBe('missile-command')
    expect(typeof pkg.version, 'package.json must carry a version string').toBe('string')
    expect(pkg.private, 'the plugin package is private').toBe(true)
  })
})

describe('scaffold — plugin.ts meta (the registry is generated from this)', () => {
  it('declares the cabinet meta with the corrected order 8', () => {
    const src = read('plugin.ts')
    expect(src).toMatch(/id:\s*'missile-command'/)
    expect(src).toMatch(/title:\s*'MISSILE COMMAND'/)
    expect(src).toMatch(/year:\s*1980/)
    // order 8, NOT 7 — red-baron owns 7. Design doc said 7; see the mc1-1
    // Design Deviation. tempest..red-baron are orders 1..7.
    expect(src, 'order must be 8 (7 is red-baron)').toMatch(/order:\s*8\b/)
    expect(src).toMatch(/listed:\s*true/)
    expect(src).toMatch(/showcase:\s*false/)
    // version is imported from package.json, not hardcoded (mirrors the siblings).
    expect(src, 'version must come from package.json, not a literal').toMatch(/version[,\s]/)
    expect(src, 'plugin.ts must not hardcode a version literal in meta').not.toMatch(/version:\s*'[0-9]/)
  })
})

describe('scaffold — index.html boots a canvas via src/main.ts', () => {
  it('index.html exists', () => {
    expect(existsSync(path('index.html')), 'missile-command/index.html must exist').toBe(true)
  })

  it('loads the src/main.ts module and hosts a <canvas>', () => {
    const html = read('index.html')
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
    expect(html).toMatch(/<canvas/i)
  })
})

describe('scaffold — src/core + src/shell skeletons (the boundary the game lives on)', () => {
  // The purity CONTENT rules live in tests/purity.test.ts; this only pins STRUCTURE.
  it('src/main.ts exists (the shell entry point)', () => {
    expect(existsSync(path('src/main.ts')), 'missile-command/src/main.ts must exist').toBe(true)
  })

  it('src/core/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/core')), 'missile-command/src/core/ must exist').toBe(true)
    const files = readdirSync(path('src/core')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/core/ must hold at least one .ts module').toBeGreaterThan(0)
  })

  it('src/shell/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/shell')), 'missile-command/src/shell/ must exist').toBe(true)
    const files = readdirSync(path('src/shell')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/shell/ must hold at least one .ts module').toBeGreaterThan(0)
  })
})
