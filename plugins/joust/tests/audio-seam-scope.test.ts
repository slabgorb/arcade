// tests/audio-seam-scope.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). AC6: "No .wav is committed and
// no R2 upload is claimed by this story; the story states plainly that joust is
// still silent when it closes." Plus the documentation half of AC1 — the prose
// that goes false the moment the seam lands.
//
// ─── WHY AC6 NEEDS TESTS AT ALL ──────────────────────────────────────────────
// Because a green suite is not evidence of sound. `@shared/audio` degrades
// silently at every failure path BY DESIGN — no WebAudio, blocked autoplay,
// failed fetch and undecodable sample all leave the game quiet and never throw
// — so a 404 is indistinguishable from working code in vitest. star-wars music
// was wired and silently absent in production for months for exactly this
// reason. The epic's rule is that a LIVE 200 is the acceptance test for any
// ASSET story; this story is the exception that proves it, because it ships no
// asset. What must therefore be machine-checked is the SCOPE: that nothing
// here pretends otherwise.
//
// ─── MARKDOWN WRAPPING MAKES A NAIVE DOC ASSERTION INERT ─────────────────────
// The README's status block is a blockquote, and its sentences wrap. To a
// reader it says "there is no `src/shell/audio.ts`, no `src/core/events.ts`
// channel and no dispatch." On disk that is `…no\n> `src/core/events.ts`
// channel…` — a newline AND a `> ` in the middle. A regex written against the
// sentence as READ never matches the file as STORED, so `.not.toMatch(...)`
// passes trivially and the stale claim survives untouched. Measured on this
// file: of the six stale claims pinned below, TWO (`no dispatch`, `no audio and
// no storage`) match only after normalisation. Every prose assertion here
// therefore runs through `flatten()` first, and each was checked to MATCH the
// unchanged README before being written as a negative — an assertion that does
// not fire today can never fire.
//
// Symmetrically, every POSITIVE assertion is built from a token verified ABSENT
// from the README today (`audio-dispatch`, `@shared/audio`, `no samples` — all
// grep-count 0). A positive built from a token the stale text already contains
// is satisfied by the very sentence it was meant to replace.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readmePath = join(root, 'README.md')

/** Un-wrap markdown: strip blockquote markers, collapse all whitespace. A
 *  multi-word claim can only be matched honestly against this. */
const flatten = (md: string): string => md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')

const readme = (): string => flatten(readFileSync(readmePath, 'utf8'))

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

const load = async <T>(parts: string[]): Promise<Partial<T>> => {
  try {
    return (await import(/* @vite-ignore */ parts.join('/'))) as Partial<T>
  } catch {
    return {}
  }
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
    return load<{ SOUNDS: Readonly<Record<string, string>> }>(['..', 'src', 'shell', 'audio']).then(
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
    // degrades silently on a 404.
    //
    // Scoped to `src/` and to COMPLETED-state wording on purpose. A README
    // sentence about what a LATER story will upload is honest, and a guard that
    // vetoed it would be a guard Dev has to weaken to tell the truth.
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

describe('jt5-1 AC6 — the story says plainly that joust is still silent', () => {
  it('the README still calls joust silent AFTER the seam lands', () => {
    // The epic states it outright: "a green jt5-1 must NOT be read as 'joust
    // has sound'." The status line says `silent` today and must keep saying it
    // — this is a green guard on arrival, and it is the one that stops the next
    // reader concluding the epic is finished.
    expect(readme(), 'joust is still silent when this story closes').toMatch(/\bsilent\b/i)
  })

  it('and says WHY it is still silent — the seam exists, the samples do not', () => {
    // `no samples` has grep-count 0 in the README today, so this cannot be
    // satisfied by any existing sentence. Pairing it with the assertion above
    // is what keeps "silent" from being read as "nothing was built".
    expect(
      readme(),
      'the README must distinguish "no seam" from "seam, no samples" — they are different states',
    ).toMatch(/no samples/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 / AC6 — the prose this story invalidates
// ═════════════════════════════════════════════════════════════════════════════
//
// Each pair below is a stale claim that must GO and an honest one that must
// ARRIVE. Neither half alone is enough: deleting the sentences satisfies every
// negative while the README goes quiet about a subsystem that now exists, and
// appending a new section satisfies every positive while the contradiction sits
// forty lines above it.

describe('jt5-1 — the README’s "what joust does NOT do" section is brought true', () => {
  it('it no longer says there is no audio module, no event channel and no dispatch', () => {
    const md = readme()
    expect(md, 'src/shell/audio.ts exists now').not.toMatch(/there is no `src\/shell\/audio\.ts`/)
    expect(md, 'the event channel and the dispatch exist now').not.toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
  })

  it('it no longer describes the shell as three modules with no audio', () => {
    expect(readme(), 'the shell is four modules now, and one of them is audio').not.toMatch(
      /\*\*no audio and no storage\*\*/,
    )
  })

  it('it no longer claims joust consumes nothing from @shared', () => {
    const md = readme()
    expect(md, 'joust consumes @shared/audio now').not.toMatch(
      /It consumes nothing from `@shared`/,
    )
    expect(md, 'joust is no longer the zero-consumption outlier').not.toMatch(
      /joust is the fleet's outlier/,
    )
  })

  it('it no longer repeats the refuted "between four and nine subpaths" range', () => {
    // Measured 2026-07-31: battlezone 13, star-wars 11, tempest 10, asteroids
    // 10, red-baron 8, centipede 5. The real range is 5-13, and it was never
    // 4-9. This sentence was false before the story and is doubly false after.
    expect(readme()).not.toMatch(/between four and nine subpaths/)
  })

  it('it no longer says the adoption ruling is open — the migration dissolved it', () => {
    // AC1's "recorded as MOOT, not re-litigated". The 2026-07-30 collapse
    // removed the package boundary, so there is no ruling left to make.
    expect(readme()).not.toMatch(/is an open ruling owned by `sprint\/epic-jt5\.yaml`/)
  })

  it('and it names what actually landed — the three-file seam and the shared engine', () => {
    const md = readme()
    // Both tokens are grep-count 0 in the README today, so neither can be
    // satisfied by the stale text they replace.
    expect(md, 'the README must name the dispatch module').toMatch(/audio-dispatch/)
    expect(md, 'the README must record the shared-engine adoption').toMatch(/@shared\/audio/)
  })
})

describe('jt5-1 — the doc assertions above are not inert', () => {
  it('flatten() actually un-wraps the blockquote the stale claims live in', () => {
    // The guard on the guards. Two of the six negatives above match ONLY after
    // normalisation; if `flatten` ever stopped stripping `> ` or collapsing
    // newlines, those two would go quietly green over untouched stale prose and
    // nothing else in this file would notice.
    const wrapped = '> there is no `src/shell/audio.ts`, no\n> `src/core/events.ts` channel and no dispatch.'
    expect(wrapped, 'precondition: the raw form does NOT match').not.toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
    expect(flatten(wrapped), 'the flattened form MUST match, or the negative is inert').toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
  })

  it('flatten() leaves ordinary prose intact', () => {
    expect(flatten('a  b\n c')).toBe('a b c')
  })
})
