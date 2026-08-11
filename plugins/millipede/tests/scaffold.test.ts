// plugins/millipede/tests/scaffold.test.ts
//
// Story ml1-5 (GREEN) — the plugin-internal scaffold contract for the tenth game.
// It runs under the `millipede` vitest project (GREEN adds millipede to
// vitest.config.ts's GAMES) and gives `npx vitest run --project millipede` real
// teeth: without it the project collects zero files and vitest exits non-zero.
//
// Scope is deliberately the BOOT-STABLE scaffold and nothing beyond it: the
// four-file shape, the plugin.ts meta the registry is generated from, and the
// index.html → /src/main.ts mount. Millipede has no src/core / src/shell yet
// (the sim, Cerny's CONWAY Life field and the bestiary land in ml2–ml4), and the
// src/core purity + citation gates arrive with the (parked) ml1-1 — neither is
// asserted here. The ORCHESTRATOR-side wiring (justfile games, vitest GAMES,
// generated registry) is guarded separately by tests/millipede-bootstrap.test.mjs.

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
    expect(existsSync(path(f)), `plugins/millipede/${f} must exist`).toBe(true)
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

describe('scaffold — package.json is a private millipede package', () => {
  it('is named millipede, private, with a semver version', () => {
    const pkg = JSON.parse(read('package.json')) as { name?: string; private?: boolean; version?: string }
    expect(pkg.name).toBe('millipede')
    expect(pkg.private).toBe(true)
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('scaffold — plugin.ts declares the meta the registry is generated from', () => {
  it('pins id/title/year/order/listed and opts OUT of the showcase (no self-play yet)', () => {
    const src = read('plugin.ts')
    expect(src).toMatch(/id:\s*'millipede'/)
    expect(src).toMatch(/title:\s*'MILLIPEDE'/)
    expect(src).toMatch(/year:\s*1982/)
    expect(src).toMatch(/order:\s*10\b/)
    expect(src).toMatch(/listed:\s*true/)
    // A black-canvas scaffold cannot boot into a live demo, so showcase must be
    // false — tests/showcase-liveness.test.mjs would redden on a self-play claim.
    expect(src).toMatch(/showcase:\s*false/)
    expect(src).toMatch(/version,/)
  })
})
