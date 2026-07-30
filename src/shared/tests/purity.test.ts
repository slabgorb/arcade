// SH2 purity guard. Was: scan the BUILT dist/ as source text, behind a `pretest`
// build. There is no dist/ any more — no package boundary, no prepare step — so
// this scans src/ directly. The scan stays deliberately comment-inclusive: a
// forbidden global named in a comment still fails, because that is how the
// original guard caught the real leaks.
//
// Fix round 1 (task-4-report.md): the first source-scan rewrite collapsed this
// file to one flat per-file regex test and lost three kinds of coverage the
// original `arcade-shared/tests/purity.test.ts` had. Restored below, ported from
// dist/*.js text-scanning to src/*.ts text-scanning:
//   - detector-honesty tests (the scan itself can't be vacuous or over-eager)
//   - the TRANSITIVE fence (a pure subpath smuggling a DOM ref through a relative
//     import, not just its own top-level text, is still caught)
//   - classification assertions (a name silently added to the exemption set to
//     make a failure go away is itself a test failure)
// Correctly NOT restored: `is built into dist/` existence checks, `exports["./X"]
// maps to dist/X.js` package.json checks, and the three `version bumped past
// baseline` checks — all package-boundary assertions with no meaning once there
// is no dist/ or package.json for src/shared.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const SHARED_ROOT = resolve(import.meta.dirname, '..')

// DOM/render/async-load globals a pure subpath must never reference (rAF excluded
// — `loop` legitimately owns frame scheduling; see the original's ADR-0003
// deviation note, ported below).
const FORBIDDEN_GLOBALS = ['document', 'window', 'canvas', 'FontFace'] as const

// Pure subpaths per ADR-0003 Amendment 1 — must remain DOM-free. Ported BY NAME
// from arcade-shared/tests/purity.test.ts's PURE_SUBPATHS.
const PURE_SUBPATHS = ['math3d', 'rng', 'loop', 'font', 'name-entry', 'pause'] as const

// Browser subpaths (ADR-0003) — explicitly flagged as canvas/AudioContext/cookie-
// touching and so EXEMPT from the purity guard. Ported BY NAME from the original's
// BROWSER_SUBPATHS — see task-4-report.md for how the migration brief's guessed
// list got this wrong (included 'font', a PURE subpath; omitted 'highscore' and
// 'synth', both genuinely browser-exempt: highscore writes document.cookie per
// ADR-0004, synth builds an AudioContext).
const BROWSER_SUBPATHS = ['esc-overlay', 'glow', 'view', 'audio', 'highscore', 'synth'] as const

const srcPath = (name: string) => join(SHARED_ROOT, `${name}.ts`)

/** Whole-word scan: returns the DOM globals a source text references (empty = clean). */
function domGlobalsIn(source: string, globals: readonly string[] = FORBIDDEN_GLOBALS): string[] {
  return globals.filter((g) => new RegExp(`\\b${g}\\b`).test(source))
}

describe('purity guard — detector is honest (not vacuous)', () => {
  it('flags a source that touches a DOM global', () => {
    const dirty = 'export function make(){ const c = document.createElement("canvas"); return c }'
    // catches BOTH `document` and `canvas`
    expect(domGlobalsIn(dirty).sort()).toEqual(['canvas', 'document'])
  })

  it('clears a source that is pure arithmetic', () => {
    const clean = 'export const add = (a, b) => a + b\nexport const PI = 3.14159'
    expect(domGlobalsIn(clean)).toEqual([])
  })

  it('does not false-positive on a substring (e.g. `windowStart`)', () => {
    const src = 'const windowStart = 0; const documentId = 7; const myCanvasThing = 1'
    expect(domGlobalsIn(src)).toEqual([])
  })
})

describe('purity guard — every pure subpath is DOM-free, comments included (AC-2)', () => {
  it('no pure subpath references a DOM global', () => {
    const violations: string[] = []
    for (const sub of PURE_SUBPATHS) {
      const file = srcPath(sub)
      expect(existsSync(file), `${sub}.ts must exist`).toBe(true)
      const source = readFileSync(file, 'utf8')
      for (const g of domGlobalsIn(source)) {
        violations.push(`${sub}.ts references DOM global \`${g}\``)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// lb2-2 — the fence must be TRANSITIVE, or it can be walked around
// ---------------------------------------------------------------------------
//
// Scanning one file's own text is a loophole: move `document.cookie` into
// `cookie.ts`, import it from a "pure" subpath, and that subpath's own text
// contains no `document` token at all — the guard passes while the subpath
// drags the DOM in behind it. A pure subpath must be DOM-free through its WHOLE
// import closure, not just its own top-level text.

/** Follow relative imports from a source file and return every .ts file in its closure. */
function importClosure(entry: string): string[] {
  const seen = new Set<string>()
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.pop() as string
    if (seen.has(file) || !existsSync(file)) continue
    seen.add(file)

    const source = readFileSync(file, 'utf8')
    const re = /\bfrom\s+['"](\.[^'"]*)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(source)) !== null) {
      // Source uses explicit `.js` extensions on relative imports (bundler/NodeNext
      // moduleResolution convention — e.g. esc-overlay.ts imports './font.js'), but
      // the file that actually exists on disk is `.ts`. Resolve back to keep walking.
      const spec = m[1].replace(/\.js$/, '.ts')
      queue.push(resolve(dirname(file), spec))
    }
  }
  return [...seen]
}

describe('purity guard — the fence is transitive', () => {
  it('the closure walker is honest — it follows a relative import', () => {
    // Proves the walker actually traverses, so the guard below cannot pass vacuously
    // by silently finding nothing. esc-overlay imports './font.js' (SH2-12).
    const closure = importClosure(srcPath('esc-overlay'))
    expect(closure.length, 'esc-overlay must pull font.ts into its closure').toBeGreaterThan(1)
    expect(closure.some((f) => f.endsWith('font.ts'))).toBe(true)
  })

  it('no pure subpath reaches a DOM global THROUGH an import either', () => {
    const violations: string[] = []
    for (const sub of PURE_SUBPATHS) {
      for (const file of importClosure(srcPath(sub))) {
        const source = readFileSync(file, 'utf8')
        for (const g of domGlobalsIn(source)) {
          const via = file.endsWith(`${sub}.ts`) ? 'directly' : `via ${file.split('/').pop()}`
          violations.push(`pure subpath \`${sub}\` references DOM global \`${g}\` ${via}`)
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})

describe('purity guard — classification is honest, not just a Set literal', () => {
  it('the browser exemption list is pinned — adding a name to it is a test failure, not a silent pass', () => {
    // If a future pure-subpath violation ever gets "fixed" by adding its name here
    // instead of removing the DOM reference, this fails immediately — the exemption
    // set can't silently grow to make a red guard go green.
    expect([...BROWSER_SUBPATHS].sort()).toEqual(
      ['audio', 'esc-overlay', 'glow', 'highscore', 'synth', 'view'].sort(),
    )
  })

  it('known-pure subpaths (rng, math3d, pause) are proven scanned, never exempted', () => {
    for (const sub of ['rng', 'math3d', 'pause']) {
      expect(PURE_SUBPATHS as readonly string[], `${sub} must stay in PURE_SUBPATHS`).toContain(sub)
      expect(
        BROWSER_SUBPATHS as readonly string[],
        `${sub} must never be smuggled into BROWSER_SUBPATHS`,
      ).not.toContain(sub)
    }
  })

  it('every declared subpath (pure or browser) is a real source file', () => {
    // Guards the lists themselves: a typo'd or stale name here would otherwise scan
    // (or exempt) nothing, silently.
    const missing = [...PURE_SUBPATHS, ...BROWSER_SUBPATHS].filter((sub) => !existsSync(srcPath(sub)))
    expect(missing, `declared subpaths with no matching source file: ${missing.join(', ')}`).toEqual([])
  })

  it('synth and audio are siblings — both shipped, neither replacing the other', () => {
    // /audio plays SAMPLES (.wav buffers); /synth is oscillator SYNTHESIS. Neither
    // obsoletes the other — battlezone and red-baron can only ever adopt synth. If a
    // later change ever deletes one file in favour of the other, this fails.
    expect(existsSync(srcPath('audio')), 'audio.ts must survive — synth does not replace it').toBe(
      true,
    )
    expect(existsSync(srcPath('synth')), 'synth.ts ships alongside it').toBe(true)
  })
})

// Belt-and-suspenders: nothing anywhere under src/shared (outside tests/ and the
// declared browser-exempt files) may reference a forbidden global, comments
// included — catches a new top-level file landing without being classified into
// either list above.
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'tests' || entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (entry.endsWith('.ts')) out.push(full)
  }
  return out
}

describe('purity guard — no unclassified file leaks a DOM global either', () => {
  it('every source file outside the declared browser subpaths is DOM-free', () => {
    const browserFiles = new Set(BROWSER_SUBPATHS.map((sub) => `${sub}.ts`))
    const offenders: string[] = []
    for (const file of sourceFiles(SHARED_ROOT)) {
      const name = file.slice(SHARED_ROOT.length + 1)
      if (browserFiles.has(name)) continue
      const text = readFileSync(file, 'utf8')
      if (domGlobalsIn(text).length > 0) offenders.push(name)
    }
    expect(offenders).toEqual([])
  })
})
