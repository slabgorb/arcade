// tests/shell/tp1-40.glow-tax-sources.test.ts
//
// RED source-rule guard for story tp1-40 — THE GLOW TAX.
//
// The Architect's investigation (session tp1-40, memory tempest-lag-is-live-
// shadowblur) proved the game is GPU-raster-bound: every live canvas shadow-blur
// assignment is a per-primitive Gaussian pass at device resolution, ~100+ per
// gameplay frame, saturating the GPU process (8-34 fps in production at
// dpr 1.75; A/B with the blur no-op'd runs a locked 60). AC-1 is a claim about
// the SOURCE TEXT — "no non-zero shadow blur is set during scene draws" — so
// only a source-reading test can hold it, exactly as rom-clock-sources.test.ts
// holds tp1-1's "zero bare 60s".
//
// Comments are stripped before every check (house rule, learned twice): prose
// documenting the old blurred world should survive as history without forcing
// Dev to mangle it for green.
//
// Three rules, each a distinct regression door:
//   1. Every shadow-blur assignment in src/shell + src/main.ts is a reset to 0.
//      (Zero-resets are ALLOWED — harmless state hygiene; anything else is the
//      GPU tax coming back.)
//   2. src/shell no longer imports @shared/glow. The shared envelope's
//      whole contract is "set the blur, draw, reset" — its source lives in
//      node_modules where rule 1 cannot see it, so consuming it in the scene
//      path would smuggle live blur past this suite. The story is scoped
//      tempest-local: src/shell/glow.ts replaces it here; the library is NOT
//      touched (promote later only if a second game proves the need).
//   3. The scene dpr cap is WIRED, not decorative: cappedDpr() must be called
//      somewhere outside its defining module. A tunable nobody calls caps
//      nothing.
//
// All three fail today: render.ts carries ~30 non-zero assignments, imports
// @shared/glow, and cappedDpr does not exist. Valid RED.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { sharedGlowImports } from '../helpers/shared-glow-imports'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8')

// Strip // line comments and /* block */ comments, leaving executable code only.
// (Same shape as rom-clock-sources.test.ts; the `(^|[^:])` guard keeps `https://`
// URLs inside string literals from being eaten as comments.)
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function tsFilesUnder(relDir: string): string[] {
  const out: string[] = []
  const walk = (abs: string): void => {
    for (const entry of readdirSync(abs)) {
      const p = join(abs, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(relative(root, p))
    }
  }
  walk(join(root, relDir))
  return out.sort()
}

// The scene path: everything that draws, plus the bootstrap that owns the dpr.
const SCENE_FILES = [...tsFilesUnder('src/shell'), 'src/main.ts']

describe('tp1-40 AC-1 — zero live shadow blur in the scene path', () => {
  // Every `<expr>.shadowBlur = RHS` (or compound-assign) in executable code.
  // RHS is captured up to the end of the statement so `= 0` can be allowed
  // while `= blur`, `= 8`, `= 4 + t * 8` are all refused.
  const ASSIGN = /\.\s*shadowBlur\s*([+\-*/]?=)\s*([^;\n]+)/g

  for (const file of SCENE_FILES) {
    it(`${file} assigns shadow blur only as a reset to 0`, () => {
      const code = stripComments(read(file))
      const offenders: string[] = []
      for (const m of code.matchAll(ASSIGN)) {
        const [, op, rhs] = m
        if (op !== '=' || rhs.trim() !== '0') {
          offenders.push(`shadowBlur ${op} ${rhs.trim()}`)
        }
      }
      expect(
        offenders,
        `${file} still pays the glow tax — every one of these is a per-primitive ` +
          `GPU Gaussian pass:\n  ${offenders.join('\n  ')}`,
      ).toEqual([])
    })
  }
})

describe('tp1-40 AC-1/AC-3 — the shared blur envelope is out of the scene path', () => {
  // Asked by MODULE IDENTITY, not by spelling. This used to be
  // `not.toMatch(/from ['"]@shared\/glow['"]/)`, which was airtight while
  // `@arcade/shared/glow` was an npm PACKAGE — a bare specifier was then the only
  // reachable form. The monorepo migration put the module in-tree at
  // src/shared/glow.ts, so `../../../../src/shared/glow` reaches the identical
  // module and matched the regex not at all. See tests/helpers/shared-glow-imports.ts.
  for (const file of tsFilesUnder('src/shell')) {
    it(`${file} does not import src/shared/glow, by any specifier`, () => {
      expect(
        sharedGlowImports(file, read(file)),
        'the shared envelope sets canvas shadowBlur — a per-primitive GPU Gaussian pass ' +
          'whose source AC-1 above cannot see. Use the tempest-local ./glow helper.',
      ).toEqual([])
    })
  }

  // POSITIVE CONTROL. Every assertion above is an "expect nothing" — the failure
  // mode is a checker that can no longer find anything, and that is precisely how
  // the regex form went blind. So prove the checker still bites, on both spellings,
  // and prove it leaves the local helper alone.
  it('catches the relative spelling as well as the alias, and never the local ./glow', () => {
    const from = 'src/shell/render.ts'
    expect(sharedGlowImports(from, "import { glowEnvelope } from '@shared/glow'")).toEqual(['@shared/glow'])
    expect(sharedGlowImports(from, "import { glowEnvelope } from '../../../../src/shared/glow'")).toEqual([
      '../../../../src/shared/glow',
    ])
    expect(sharedGlowImports(from, "import '../../../../src/shared/glow.ts'")).toEqual([
      '../../../../src/shared/glow.ts',
    ])
    expect(sharedGlowImports(from, "await import('@shared/glow')")).toEqual(['@shared/glow'])
    // The tempest-local layered-pass helper is what the story REPLACED it with —
    // a check that flagged this would be unsatisfiable.
    expect(sharedGlowImports(from, "import { glowStrokePasses } from './glow'")).toEqual([])
    // …and a sibling game's glow, and an unrelated shared module, are not it.
    expect(sharedGlowImports(from, "import x from '@shared/font'")).toEqual([])
    // A COMMENT quoting the forbidden import is prose, not an import.
    expect(sharedGlowImports(from, "// import { x } from '@shared/glow'")).toEqual([])
  })
})

describe('tp1-40 AC-4 — the scene dpr cap is wired, not decorative', () => {
  it('cappedDpr() is called by at least one module other than its own', () => {
    const callers = SCENE_FILES.filter((f) => !f.endsWith('src/shell/glow.ts')).filter((f) =>
      /\bcappedDpr\s*\(/.test(stripComments(read(f))),
    )
    expect(
      callers.length,
      'cappedDpr must gate the dpr that reaches the scene/phosphor buffers',
    ).toBeGreaterThan(0)
  })

  it('render.ts routes its glow through the tempest-local helper (glowStrokePasses + blitGlowDot)', () => {
    const code = stripComments(read('src/shell/render.ts'))
    expect(code, 'strokes/text must take the layered-pass helper').toMatch(/\bglowStrokePasses\s*\(|\bfrom\s*['"].\/glow['"]/)
    expect(code, 'dots must take the one dot helper').toMatch(/\bblitGlowDot\s*\(/)
  })
})

// ── The de-glow (2026-08-02, out of band) ────────────────────────────────────
//
// The owner removed the halo itself: crisp strokes, hard-edged dots, no phosphor
// trail. The stroke half of that is held behaviourally (glowStrokePasses returns
// one pass — tp1-40.glow.test.ts, and drawTube's strokes — render.tube-glow.test.ts).
//
// The DOT half cannot be held behaviourally, and that is the whole reason this
// block exists. The halo it replaced was a radial-gradient sprite drawn only when
// `document` exists; vitest runs the node env, so a reintroduced sprite branch is
// UNREACHABLE from a test and every dot suite stays green through it. Measured,
// not assumed: restoring the sprite path during the de-glow's mutation battery
// left all 1742 tests passing. Only a source rule sees it.
//
// Scoped to glow.ts deliberately. The rule is "the dot helper builds and blits no
// sprite", not "the shell owns no radial gradient" — render.ts's full-screen
// background vignette (render.ts:1020) is a legitimate radial gradient and is NOT
// a vector halo, so a shell-wide rule would be wrong, not merely noisy.

describe('de-glow — no sprite halo in the dot helper', () => {
  const DOT_HELPER = 'src/shell/glow.ts'

  // The three moving parts of a cached sprite halo: build a canvas, paint a
  // radial falloff into it, blit it. Any one of them returning to this module is
  // the halo coming back.
  const SPRITE_MECHANISMS: ReadonlyArray<readonly [string, RegExp]> = [
    ['an offscreen sprite canvas', /createElement\s*\(\s*['"]canvas['"]\s*\)/],
    ['a radial falloff', /\bcreateRadialGradient\s*\(/],
    ['a sprite blit', /\bdrawImage\s*\(/],
  ]

  for (const [what, re] of SPRITE_MECHANISMS) {
    it(`${DOT_HELPER} does not build or blit ${what}`, () => {
      expect(
        re.test(stripComments(read(DOT_HELPER))),
        `${DOT_HELPER} is the one door every dot goes through; ${what} there is the ` +
          'sprite halo returning, and no behavioural test in the node env can see it.',
      ).toBe(false)
    })
  }

  // The phosphor trail went with the halos, and it is a LONE CONSTANT: render()
  // needs a real DOM canvas, so no behavioural test reaches the composite and the
  // value can drift back to 0.55 completely green (measured in the same mutation
  // battery). Read the number, don't just ban the old spelling — a guard that
  // only refuses `0.55` passes on `0.4`, which is still a trail.
  it('render.ts sets PHOSPHOR_DECAY to 0 — the afterglow stays off', () => {
    const code = stripComments(read('src/shell/render.ts'))
    const m = /\bconst\s+PHOSPHOR_DECAY\s*=\s*([^\s;/]+)/.exec(code)
    expect(m, 'PHOSPHOR_DECAY must still be a const in render.ts').not.toBeNull()
    expect(
      Number(m![1]),
      'a non-zero retention is the vector trail returning; phosphorAlpha(decay, dt) ' +
        'only wipes the accumulator each frame at decay 0',
    ).toBe(0)
  })

  // POSITIVE CONTROL. Every assertion above is an "expect nothing", the failure
  // mode that let the @shared/glow regex go blind higher up this file. Prove each
  // pattern still bites the code it names — and that comments are exempt, since
  // glow.ts's header narrates the sprite cache it removed.
  it('the sprite patterns still match the code they describe, and skip prose', () => {
    const [, canvasRe] = SPRITE_MECHANISMS[0]
    const [, gradRe] = SPRITE_MECHANISMS[1]
    const [, blitRe] = SPRITE_MECHANISMS[2]
    expect(canvasRe.test(stripComments("const spr = document.createElement('canvas')"))).toBe(true)
    expect(gradRe.test(stripComments('const g = c.createRadialGradient(r, r, 0, r, r, r)'))).toBe(true)
    expect(blitRe.test(stripComments('ctx.drawImage(spr, x, y, d, d)'))).toBe(true)
    // phosphor.ts genuinely blits (its accumulator) — proof the patterns match
    // real code in this repo, and proof the rule is scoped, not repo-wide.
    expect(blitRe.test(stripComments(read('src/shell/phosphor.ts')))).toBe(true)
    // Prose describing the removed sprite must not trip the rule.
    expect(gradRe.test(stripComments('// the old cache used createRadialGradient(...)'))).toBe(false)
    expect(blitRe.test(stripComments('/* particles used to ctx.drawImage(spr, …) */'))).toBe(false)
  })
})
