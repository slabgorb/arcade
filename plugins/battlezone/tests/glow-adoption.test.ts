// tests/glow-adoption.test.ts
//
// Story SH2-8 (epic SH2) — RED phase (Han Solo / TEA), consumer half (AC-2).
// battlezone must stroke its green wireframe through the shared @shared/glow
// primitive (withGlow / glowPolyline) instead of its hand-rolled drawSegments glow
// block — while keeping its per-cabinet colour (GLOW_GREEN = '#33ff66') local, per the
// epic's share-the-VERB-not-the-NUMBERS rule.
//
// Two RED drivers + one guardrail, at the cross-repo contract altitude (NOT dictating
// HOW drawSegments is refactored — that is Dev's call, and the game's existing render
// tests keep it honest):
//   1. adoption   — some src module imports @shared/glow (fails: none does yet).
//   2. resolution — the pinned @shared exposes ./glow with withGlow +
//                   glowPolyline (fails: the current pin predates the subpath; Dev
//                   publishes glow, bumps the pin, reinstalls to turn this GREEN).
//   3. guardrail  — the per-cabinet glow colour stays in the game.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../src', import.meta.url))
const renderPath = fileURLToPath(new URL('../src/shell/render.ts', import.meta.url))

/** Every .ts file under src/. */
function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = `${dir}/${entry}`
    if (statSync(p).isDirectory()) out.push(...walkTs(p))
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

const GLOW_IMPORT = /from\s+['"]@shared\/glow['"]/

describe('SH2-8 — battlezone adopts @shared/glow (AC-2)', () => {
  it('a src module imports the shared glow primitive (strokes are no longer hand-rolled)', () => {
    const importers = walkTs(srcDir)
      .filter((f) => GLOW_IMPORT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(srcDir.length + 1))
    expect(
      importers,
      'no src file imports @shared/glow yet — battlezone has not adopted the shared primitive',
    ).not.toHaveLength(0)
  })

  it('the pinned @shared exposes ./glow with withGlow + glowPolyline', async () => {
    const glow = await import('@shared/glow')
    expect(typeof glow.withGlow, 'withGlow must be exported by the pinned @shared/glow').toBe('function')
    expect(typeof glow.glowPolyline, 'glowPolyline must be exported by the pinned @shared/glow').toBe('function')
  })

  it('keeps GLOW_GREEN as a per-cabinet constant (the cabinet colour stays in the game)', () => {
    const render = readFileSync(renderPath, 'utf8')
    expect(render, "GLOW_GREEN must remain a battlezone-local constant").toMatch(/GLOW_GREEN\s*=\s*'#33ff66'/)
  })
})
