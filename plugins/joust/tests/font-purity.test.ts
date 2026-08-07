// tests/font-purity.test.ts
//
// Story jt10-1 — RED (O'Brien / TEA). AC-5: both font data modules are pure core
// — they pass the jt1-7 boundary scanner, import no shell and no @shared/font,
// and the literal strings "window." / "document." appear NOWHERE in their source
// (the scanner reads comment text, so a transcription comment ending in those
// tokens would trip it).
//
// tests/purity.test.ts already sweeps EVERY src/core module clean; this file adds
// the FOCUSED, per-module assertions the AC calls out by name, so the criterion
// is pinned directly and fails RED until the modules exist.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(repoRoot, 'src', 'core')

const FONT_MODULES = ['font35.ts', 'font57.ts'] as const

type Violations = (source: string, filename?: string) => Array<string>

async function loadScanner(): Promise<Violations> {
  const specifier = ['.', 'helpers', 'purity-scanner.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as { violations?: Violations }
  if (typeof mod.violations !== 'function') throw new Error('hardened purity scanner has no `violations` export')
  return mod.violations
}

function readModule(name: string): string {
  const p = join(coreDir, name)
  if (!existsSync(p)) {
    throw new Error(
      `GREEN (Julia) must create src/core/${name} — the pure font data module (jt10-1)`,
    )
  }
  return readFileSync(p, 'utf8')
}

describe('font core modules are pure (AC-5)', () => {
  for (const name of FONT_MODULES) {
    it(`${name} passes the jt1-7 boundary scanner`, async () => {
      const violations = await loadScanner()
      const hits = violations(readModule(name), name)
      expect(hits, `${name} tripped the purity scanner: ${hits.join(', ')}`).toEqual([])
    })

    it(`${name} contains neither "window." nor "document." (even in comments)`, () => {
      const src = readModule(name)
      expect(src.includes('window.'), `${name} must not name window. anywhere`).toBe(false)
      expect(src.includes('document.'), `${name} must not name document. anywhere`).toBe(false)
    })

    it(`${name} imports no shell module and no @shared/font`, () => {
      const src = readModule(name)
      expect(src, `${name} must not import from shell/`).not.toMatch(/\bfrom\s+['"][^'"]*shell/i)
      expect(src, `${name} must not require()`).not.toMatch(/\brequire\s*\(/)
      expect(src, "this is joust's own font — not @shared/font").not.toMatch(
        /from\s+['"]@shared\/font['"]/,
      )
    })
  }

  it('the scanner is not vacuous — a live Date.now() is still caught', async () => {
    // Guard against a broken harness reporting [] for everything (the mutation
    // control the purity suite itself uses).
    const violations = await loadScanner()
    expect(violations('export const x = Date.now()', 'probe.ts').length).toBeGreaterThan(0)
  })
})
