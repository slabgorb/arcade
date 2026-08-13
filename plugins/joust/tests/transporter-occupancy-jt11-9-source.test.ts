// tests/transporter-occupancy-jt11-9-source.test.ts
//
// Story jt11-9 — RED phase (Han Solo / TEA). The wiring guard: pad occupancy is
// not just implemented, it is CONSUMED by the production sim. Epic jt11 exists to
// retire implemented-tested-UNWIRED ROM laws (the ServiceQueue sat dead for four
// stories, jt11-4's finding); this guard makes sure the new `freePad` selector
// does not join that graveyard.
//
// It mirrors jt11-4's "the ServiceQueue stops being dead code" guard exactly: a
// name that appears only in a COMMENT, or only because it was IMPORTED, must not
// satisfy the wiring check. Comments are stripped first, then the import block —
// so what remains is call sites and nothing else (the lang-review #25 failure
// mode: a `src.includes(fn)` over comment-stripped text alone stays green with
// every call site deleted, because the whole law is listed in the import).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The production sim source with block then line comments stripped — a name in
 *  a comment must never satisfy a wiring guard. */
function simSourceSansComments(): string {
  const path = fileURLToPath(new URL('../src/core/sim.ts', import.meta.url))
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** …and with every `import { … } from '…'` block stripped too. `freePad` is
 *  listed verbatim in the transporter import, so a scan over the comment-stripped
 *  text alone would stay green with the sole call site deleted. */
function simSourceSansImports(): string {
  return simSourceSansComments().replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*'[^']*'/g, ' ')
}

describe('jt11-9 — freePad becomes live production code, not another dead law', () => {
  it('sim.ts INVOKES freePad in production code — outside comments, not merely imported', () => {
    // Today sim.ts imports `enterViaPads`, `beginMaterialise`, `stepMaterialise`
    // and `PADS` and serves one enemy per frame as a STAND-IN for pad occupancy
    // (its own comment says so). Consuming the real occupancy selector is the story.
    const src = simSourceSansImports()
    expect(
      /\bfreePad\s*\(/.test(src),
      'freePad must be CALLED in sim.ts production code — the pad occupancy law cannot stay dead',
    ).toBe(true)
  })

  it('the call-site guard above cannot be satisfied by the import block alone', () => {
    // Non-vacuity: prove the import-strip actually removes the transporter import,
    // so the guard above measures a call site and not the import list.
    const stripped = simSourceSansImports()
    const importBlock = /import\s*\{([^}]*)\}\s*from\s*'\.\/transporter\.js'/.exec(simSourceSansComments())
    expect(importBlock, 'sim.ts must import from ./transporter.js').not.toBeNull()
    expect(
      /import\s*\{[^}]*\}\s*from\s*'\.\/transporter\.js'/.test(stripped),
      'the transporter import must be gone from the text the call-site guard scans',
    ).toBe(false)
  })

  it('freePad is imported from the transporter module, not re-implemented locally in sim.ts', () => {
    // Guards against Dev satisfying the call-site check by writing a private copy
    // of the selector in sim.ts — the point is to consume the transcribed,
    // ROM-cited implementation, the same discipline jt11-4 held the ServiceQueue to.
    const src = simSourceSansComments()
    expect(
      /function\s+freePad\b/.test(src),
      'freePad must be imported from ./transporter.js, not redefined in sim.ts',
    ).toBe(false)
    const importBlock = /import\s*\{([^}]*)\}\s*from\s*'\.\/transporter\.js'/.exec(src)
    expect(importBlock, 'sim.ts must import from ./transporter.js').not.toBeNull()
    expect(importBlock?.[1].includes('freePad'), 'freePad must appear in the transporter import').toBe(true)
  })
})
