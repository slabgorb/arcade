// tests/audio-seam-scope.test.ts
//
// Story jt5-1 (Mr. Praline / TEA), AC6: the audio SEAM ships without a single
// baked sample, and nothing in the source tree pretends otherwise.
//
// ─── WHY AC6 NEEDS TESTS AT ALL ──────────────────────────────────────────────
// Because a green suite is not evidence of sound. `@shared/audio` degrades
// silently at every failure path BY DESIGN — no WebAudio, blocked autoplay,
// failed fetch and undecodable sample all leave the game quiet and never throw
// — so a 404 is indistinguishable from working code in vitest. star-wars music
// was wired and silently absent in production for months for exactly this
// reason. The epic's rule is that a LIVE 200 is the acceptance test for any
// ASSET story; this story is the exception that proves it, because it ships no
// asset. What must therefore be machine-checked is the SCOPE: that no audio
// binary is committed, and that no source file claims the samples are hosted.
//
// This file guards the TREE and the SOURCE only. README prose is the author's to
// keep honest; the count/grep-the-doc guards that used to live here were removed
// (2026-08-16) — deriving a file/claim/story count and asserting it against a
// number transcribed in the README taxed every edit for zero real protection.

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { load } from './helpers/dynamic-load'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Collapse whitespace so a multi-word claim can be matched across wrapped lines. */
const flatten = (text: string): string => text.replace(/\s+/g, ' ')

/** Every file under `dir`, recursively, as plugin-relative paths. */
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push(relative(root, p))
  }
  return acc
}

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — the scope fence: a seam, and not one byte of audio
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC6 — no sample is committed', () => {
  it('the plugin holds no audio binary of any kind', () => {
    const audio = walk(root).filter((f) => /\.(wav|mp3|ogg|m4a|flac|aiff?)$/i.test(f))
    expect(audio, 'jt5-1 ships the seam only — no baked samples').toEqual([])
  })

  it('every filename the manifest names is ABSENT from the tree', () => {
    // The manifest is a promise about an R2 bucket, not about this repo. If a
    // named `.wav` ever appears here, either the scope fence broke or the
    // hosting model did — both need a human, and both are invisible to the test
    // above once a file is added under a name it does not pattern-match.
    return load<{ SOUNDS: Readonly<Record<string, string>> }>(import.meta.url, ['..', 'src', 'shell', 'audio']).then(
      (mod) => {
        const manifest = mod.SOUNDS
        if (manifest === undefined) {
          throw new Error('jt5-1 not implemented yet: src/shell/audio.ts must export `SOUNDS`.')
        }
        const files = new Set(walk(root).map((f) => f.split('/').pop()))
        const present = Object.values(manifest).filter((f) => files.has(f))
        expect(present, 'the samples live in the assets bucket, never in the plugin').toEqual([])
      },
    )
  })

  it('no source file asserts the samples are hosted — this story never checked a 200', () => {
    // `just deploy-assets` is the only path to the assets bucket, CI never
    // touches it, and this story does not run it. A source line stating the
    // samples ARE there would be the story asserting a live 200 it never made,
    // which is the precise failure the epic's guardrail exists to prevent — and
    // it would be indistinguishable from truth in every test, since the engine
    // degrades silently on a 404. Scoped to `src/` and to COMPLETED-state wording.
    const offenders: string[] = []
    for (const f of walk(root)) {
      if (!f.startsWith('src/') || !f.endsWith('.ts')) continue
      const text = flatten(readFileSync(join(root, f), 'utf8'))
      const lie = text.match(
        /\b(samples?|cues?|sounds?)\b[^.]{0,60}\b(are|is|were|was)\b[^.]{0,20}\b(live|hosted|uploaded|deployed|available)\b/i,
      )
      if (lie) offenders.push(`${f}: ${lie[0]}`)
    }
    expect(offenders, 'jt5-1 uploads nothing, so no source file may say the samples are there').toEqual(
      [],
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Project rules — `.pennyfarthing/gates/lang-review/typescript.md`
// ═════════════════════════════════════════════════════════════════════════════
//
// The checklist is the Reviewer's rubric, so the modules this story creates are
// held to it here rather than discovered at review. Only the checks that apply
// to a data module, a manifest and a switch are pinned; check #3's switch
// exhaustiveness is covered in audio-dispatch.test.ts, where the `never` guard
// lives. The scans strip comments first — a checklist that fires on prose
// describing the rule is the trap joust's purity scanner was rewritten to avoid
// — but the import-extension scan runs with STRINGS INTACT, because an import
// specifier IS a string.

const NEW_MODULES = [
  'src/core/events.ts',
  'src/shell/audio.ts',
  'src/shell/audio-dispatch.ts',
  // jt5-2: the manifest extracted for the plain-node sample bake.
  'src/shell/audio-manifest.ts',
]

/** Source with comments removed. Block comments first, then line comments. */
const codeOnly = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

const eachNewModule = (): { name: string; src: string }[] =>
  NEW_MODULES.map((name) => {
    const p = join(root, name)
    if (!existsSync(p)) throw new Error(`jt5-1 must create ${name}`)
    return { name, src: readFileSync(p, 'utf8') }
  })

describe('jt5-1 — the new modules satisfy the TypeScript review checklist', () => {
  it('#1 no type-safety escapes — the seam is typed, not cast into place', () => {
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      for (const [label, re] of [
        ['as any', /\bas\s+any\b/],
        ['as unknown as', /\bas\s+unknown\s+as\b/],
        ['@ts-ignore', /@ts-ignore/],
        ['@ts-expect-error', /@ts-expect-error/],
        [': any', /:\s*any\b/],
      ] as const) {
        if (re.test(code)) offenders.push(`${name}: ${label}`)
      }
      // `@ts-ignore` lives in a COMMENT, so it must be sought in the raw text.
      if (/@ts-(ignore|nocheck)/.test(src)) offenders.push(`${name}: ts suppression comment`)
    }
    expect(offenders, 'a cue map that needs a cast is a cue map with the wrong types').toEqual([])
  })

  it('#2 no over-broad generics — the manifest is keyed by the union, not by string', () => {
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      for (const [label, re] of [
        ['Record<string, any>', /Record<\s*string\s*,\s*any\s*>/],
        ['bare Function type', /:\s*Function\b/],
        ['bare object type', /:\s*object\b/],
      ] as const) {
        if (re.test(code)) offenders.push(`${name}: ${label}`)
      }
    }
    expect(
      offenders,
      'SOUNDS/CHANNELS/CUE_SOURCES keyed by `string` would let a typo add a cue no kind reaches',
    ).toEqual([])
  })

  it('#4 no `||` defaulting where `??` is meant', () => {
    // `x || fallback` swallows 0 and '' — and a ROM priority of 0 and an empty
    // channel name are both values this seam can legitimately hold.
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      const hits = code.match(/\|\|\s*(['"`]|[0-9])/g)
      if (hits) offenders.push(`${name}: ${hits.join(', ')}`)
    }
    expect(offenders, 'use ?? — 0 and "" are valid values here, not absences').toEqual([])
  })

  it('#5 every relative import carries the .js extension', () => {
    // joust's ESM convention: 100+ relative imports across src/ carry `.js`
    // (`shell/timebase.ts` is the single pre-existing exception and is out of
    // this story's scope). Bare specifiers like `@shared/audio` take none.
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      for (const m of src.matchAll(/from\s+'(\.\.?\/[^']*)'/g)) {
        if (!m[1].endsWith('.js')) offenders.push(`${name}: ${m[1]}`)
      }
    }
    expect(offenders, 'a relative import without .js breaks Node16 ESM resolution').toEqual([])
  })
})

describe('jt5-1 — every audio cue is ROM-sourced, none invented', () => {
  it('the manifest ships no `kind: invention` escape-hatch cue', () => {
    // CUE_SOURCES carries an `invention` escape hatch for cues with no ROM table
    // (jt5-1 AC5). This pins that none shipped — every moment is ROM-cited.
    const manifest = readFileSync(join(root, 'src/shell/audio-manifest.ts'), 'utf8')
    const inventions = manifest.match(/kind: 'invention',/g) ?? []
    expect(inventions, 'a cue ships as an invention, so not every moment is ROM-cited').toEqual([])
  })
})
