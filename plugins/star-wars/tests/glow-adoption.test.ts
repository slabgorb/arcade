// tests/glow-adoption.test.ts
//
// Story SH2-8 (epic SH2) — RED phase (Han Solo / TEA), consumer half (AC-2).
// star-wars must stroke its wireframe vectors through the shared @shared/glow
// primitive (withGlow / glowPolyline) instead of its hand-rolled glowLine — while
// keeping its per-cabinet colours (GLOW = '#00e5ff' cockpit cyan, and the rest of the
// palette) local, per the epic's share-the-VERB-not-the-NUMBERS rule.
//
// NOTE for Dev (delivery finding): star-wars' glowLine wraps its stroke in
// ctx.save()/restore() and globalCompositeOperation = 'lighter' (additive glow). The
// shared withGlow is deliberately save/restore-free, so the migration must decide
// whether star-wars keeps the 'lighter' envelope around the shared call or the
// superset grows a composite option. This test does NOT pin that decision.
//
// Two RED drivers + one guardrail, at the cross-repo contract altitude (NOT dictating
// HOW glowLine is refactored — that is Dev's call, and the game's existing render
// tests keep it honest):
//   1. adoption   — some src module imports @shared/glow (fails: none does yet).
//   2. resolution — the shared library exposes @shared/glow with withGlow +
//                   glowPolyline (originally: the pin predated the subpath, and Dev
//                   published glow and bumped the pin to turn this GREEN; since the
//                   monorepo migration it is an ALIAS-resolution contract).
//   3. guardrail  — the per-cabinet cockpit-cyan glow colour stays in the game.
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

describe('SH2-8 — star-wars adopts @shared/glow (AC-2)', () => {
  it('a src module imports the shared glow primitive (strokes are no longer hand-rolled)', () => {
    const importers = walkTs(srcDir)
      .filter((f) => GLOW_IMPORT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(srcDir.length + 1))
    expect(
      importers,
      'no src file imports @shared/glow yet — star-wars has not adopted the shared primitive',
    ).not.toHaveLength(0)
  })

  it('the shared library exposes @shared/glow with withGlow + glowPolyline', async () => {
    const glow = await import('@shared/glow')
    expect(typeof glow.withGlow, 'withGlow must be exported by @shared/glow').toBe('function')
    expect(typeof glow.glowPolyline, 'glowPolyline must be exported by @shared/glow').toBe('function')
  })

  it('keeps the cockpit-cyan GLOW colour as a per-cabinet constant (colour stays in the game)', () => {
    const render = readFileSync(renderPath, 'utf8')
    expect(render, "the cockpit-cyan GLOW must remain a star-wars-local constant").toMatch(/const GLOW\s*=\s*'#00e5ff'/)
  })
})
