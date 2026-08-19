// plugins/defender/tests/scaffold.test.ts
//
// Story df1-1 (RED) — the plugin-internal scaffold contract for the eleventh game
// (df1-1 absorbed df1-5's scaffold; see .session/df1-1-session.md). It runs under
// the `defender` vitest project (GREEN adds defender to vitest.config.ts's GAMES)
// and gives `npx vitest run --project defender` real teeth alongside the citation
// and purity suites.
//
// Scope is deliberately the BOOT-STABLE scaffold and nothing beyond it: the
// four-file shape, the plugin.ts meta the registry is generated from, and the
// index.html → /src/main.ts mount. Defender has no src/core / src/shell yet (the
// framebuffer core lands in df2, the scheduler/ship in df3). The ORCHESTRATOR-side
// wiring (justfile games, vitest GAMES, generated registry, the gate-module ports)
// is guarded separately by tests/defender-bootstrap.test.mjs.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — the four files exist', () => {
  it.each(['index.html', 'plugin.ts', 'package.json', 'tsconfig.json', 'src/main.ts'])('%s exists', (f) => {
    expect(existsSync(path(f)), `plugins/defender/${f} must exist`).toBe(true)
  })
})

describe('scaffold — tsconfig.json delegates strict to the monorepo root', () => {
  it('extends the root config one level up and covers both src and tests', () => {
    const cfg = JSON.parse(read('tsconfig.json')) as { extends?: string; include?: string[] }
    expect(cfg.extends).toBe('../../tsconfig.json')
    expect(cfg.include).toContain('src')
    expect(cfg.include).toContain('tests')
  })

  it('never redeclares "strict" itself — the stub inherits it', () => {
    // `true` means it stopped inheriting; `false` silently overrides the root.
    // Raw text so even a comment trips.
    expect(read('tsconfig.json'), 'the plugin tsconfig must INHERIT strict, not set it').not.toMatch(/"strict"/)
  })
})

describe('scaffold — index.html mounts the canvas and boots the shell', () => {
  it('carries the #game canvas and loads /src/main.ts as a module', () => {
    const html = read('index.html')
    expect(html).toMatch(/id="game"/)
    expect(html).toMatch(/<script[^>]*type="module"[^>]*src="\/src\/main\.ts"/)
  })
})

describe('scaffold — package.json is a private defender package', () => {
  it('is named defender, private, with a semver version', () => {
    const pkg = JSON.parse(read('package.json')) as { name?: string; private?: boolean; version?: string }
    expect(pkg.name).toBe('defender')
    expect(pkg.private).toBe(true)
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('scaffold — plugin.ts declares the meta the registry is generated from', () => {
  it('pins id/title/year/order/listed and NOW opts into the showcase (df7-7 earned the flip)', () => {
    const src = read('plugin.ts')
    expect(src).toMatch(/id:\s*'defender'/)
    expect(src).toMatch(/title:\s*'DEFENDER'/)
    // 1980 — the fleet pins MAME's attribution year (© 1980 Williams); the vendored
    // INFO.SRC's `DR J. 1/21/81` is an assembly-note date, not a release year.
    expect(src).toMatch(/year:\s*1980/)
    expect(src).toMatch(/order:\s*11\b/)
    expect(src).toMatch(/listed:\s*true/)
    // The ml1-5 rule: a carousel slot is earned by a live self-playing demo
    // (tests/showcase-liveness.test.mjs). df7 grew that demo (df7-3 attract) and the
    // played lifecycle (df7-1..df7-5), so df7-7 flips defender into the rotation.
    expect(src).toMatch(/showcase:\s*true/)
    expect(src).toMatch(/version,/)
  })
})
