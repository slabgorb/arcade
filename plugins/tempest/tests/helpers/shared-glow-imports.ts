// Does this source reach `src/shared/glow`? — asked by MODULE IDENTITY, not by
// spelling.
//
// tp1-40's whole point is that the shared blur envelope must not be in the scene
// path: its contract is "set canvas shadowBlur, draw, reset", every such assignment
// is a per-primitive GPU Gaussian pass, and its source lives outside the tree the
// AC-1 scanner reads — so importing it smuggles live blur past the suite.
//
// Two guards enforced that (tp1-40.glow-tax-sources.test.ts and
// render.tube-glow.test.ts) and both did it with `not.toMatch(/from
// ['"]@shared\/glow['"]/)`. That was airtight BEFORE the monorepo migration:
// `@arcade/shared/glow` was an npm package, so a bare specifier was the ONLY way to
// reach it — you cannot write a relative path into node_modules.
//
// The migration put the module in-tree at `src/shared/glow.ts`. It is now four
// directories up from `src/shell`, so
//
//     import { glowEnvelope } from '../../../../src/shared/glow'
//
// reaches the identical module and matched NEITHER regex. That is coverage the
// migration narrowed, silently, with both guards still green.
//
// So the question is asked the only way that survives a rename: resolve every
// import specifier to an absolute, extension-less path and compare it to
// src/shared/glow. The alias map and the relative walk both land on the same
// string, and `./glow` — the tempest-LOCAL layered-pass helper the story
// introduced, which every scene file is SUPPOSED to import — lands somewhere else
// and is therefore untouched.
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url)) // plugins/tempest/tests/helpers
export const TEMPEST_ROOT = resolve(HERE, '..', '..') // plugins/tempest
export const REPO_ROOT = resolve(TEMPEST_ROOT, '..', '..') // the monorepo root

/** The forbidden module, absolute and extension-less. */
export const SHARED_GLOW = join(REPO_ROOT, 'src', 'shared', 'glow')

// vite.config.ts's alias map, which is also tsconfig's `paths`. Both are how
// in-tree code normally addresses src/shared and src/host.
const ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['@shared/', join(REPO_ROOT, 'src', 'shared')],
  ['@host/', join(REPO_ROOT, 'src', 'host')],
]

/**
 * Strip `//` line and block comments, leaving executable code.
 *
 * Done HERE rather than left to each caller because a comment quoting a forbidden
 * import is prose, not an import, and forgetting the strip at one call site turns a
 * guard into a comment scanner. The `(^|[^:])` guard keeps `https://` inside string
 * literals from being eaten. (Same shape as rom-clock-sources.test.ts.)
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Every import specifier: `from '…'`, side-effect `import '…'`, dynamic `import('…')`. */
export function importSpecifiers(source: string): string[] {
  return [...stripComments(source).matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
}

/**
 * The absolute, extension-less module `spec` names when written in `fromFile`, or
 * null for a bare package name (node_modules — not this tree).
 *
 * `fromFile` is relative to plugins/tempest, e.g. `src/shell/render.ts`.
 */
export function resolveSpecifier(fromFile: string, spec: string): string | null {
  const bare = spec.split('?')[0] // `./render.ts?raw`
  let abs: string | null = null
  for (const [prefix, dir] of ALIASES) {
    if (bare.startsWith(prefix)) {
      abs = join(dir, bare.slice(prefix.length))
      break
    }
  }
  if (abs === null) {
    if (!bare.startsWith('.')) return null
    abs = resolve(dirname(join(TEMPEST_ROOT, fromFile)), bare)
  }
  return abs.replace(/\.(?:ts|tsx|js|mjs)$/, '').replace(/[/\\]index$/, '')
}

/**
 * Every specifier in `source` that reaches src/shared/glow, however it is spelled.
 * Empty means the file is clean. Returning the SPECIFIERS rather than a boolean is
 * what makes a failure say which spelling got in.
 */
export function sharedGlowImports(fromFile: string, source: string): string[] {
  return importSpecifiers(source).filter((s) => resolveSpecifier(fromFile, s) === SHARED_GLOW)
}
