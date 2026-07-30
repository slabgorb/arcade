// SH2 purity guard. Was: scan the BUILT dist/ as source text, behind a `pretest`
// build. There is no dist/ any more — no package boundary, no prepare step — so
// this scans src/ directly. The scan stays deliberately comment-inclusive: a
// forbidden global named in a comment still fails, because that is how the
// original guard caught the real leaks.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SHARED_ROOT = resolve(import.meta.dirname, '..')
const FORBIDDEN = /\b(document|window|canvas|FontFace)\b/

// BROWSER subpaths (ADR-0003) are exempt: they legitimately touch a canvas ctx,
// AudioContext or document.cookie handed in / reached by the caller. Ported
// verbatim from the original dist/-scan's BROWSER_SUBPATHS (arcade-shared
// tests/purity.test.ts) — NOT the guessed list from the migration brief, which
// wrongly included 'font' (a PURE subpath — see PURE_SUBPATHS there) and
// omitted 'highscore' and 'synth' (both genuinely browser-exempt: highscore
// writes document.cookie per ADR-0004, synth builds an AudioContext).
const BROWSER_SUBPATHS = new Set([
  'esc-overlay.ts',
  'glow.ts',
  'view.ts',
  'audio.ts',
  'highscore.ts',
  'synth.ts',
])

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

describe('shared purity', () => {
  it('no pure subpath names a DOM global, comments included', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SHARED_ROOT)) {
      const name = file.slice(SHARED_ROOT.length + 1)
      if (BROWSER_SUBPATHS.has(name)) continue
      const text = readFileSync(file, 'utf8')
      if (FORBIDDEN.test(text)) offenders.push(name)
    }
    expect(offenders).toEqual([])
  })
})
