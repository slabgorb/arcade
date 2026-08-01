// tools/sample-bake/deploy-assets.test.mjs — RED for jt5-2 (Mr. Praline / TEA).
//
// AC3 (the upload path) and AC5 (the README stops claiming silence). Mirrors
// star-wars' tools/music-bake/deploy-assets.test.mjs, which guards the same
// recipe from the other end — and which proved the mis-anchor failure mode
// this file's first test exists to prevent.
//
// What this file deliberately does NOT do is check the bucket. The story's
// acceptance is a live 200 per URL with an audio/wav content-type, curled and
// pasted into the session at finish — `@shared/audio` degrades silently on a
// 404, so no assertion here can distinguish a populated bucket from an empty
// one, and a network test in vitest would only pretend otherwise (that
// pretence is exactly how a star-wars .wav stayed missing sw7-18 → sw8-14).
//
// Every negative README assertion below was verified to MATCH the unchanged
// README today (an assertion that does not fire today can never fire), and
// every positive is built from a token verified ABSENT today (`joust/sfx`,
// grep-count 0) — the audio-seam-scope.test.ts discipline, same flatten().
//
// SCOPE FENCE: the README status block also carries stale COUNTS ("eleven
// ROM-cited moments" — the manifest holds seventeen today). Those counts are
// owned by jt5-7 ("joust's unguarded README counts"), so nothing here pins a
// number. This file pins only the SILENCE claims this story ends.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const joust = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const orchestrator = join(joust, '..', '..')

/** Un-wrap markdown: strip blockquote markers, collapse whitespace. A wrapped
 *  sentence never matches raw — measured on this very README by jt5-1. */
const flatten = (md) => md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')

const readme = () => flatten(readFileSync(join(joust, 'README.md'), 'utf8'))
const justfile = () => readFileSync(join(orchestrator, 'justfile'), 'utf8')

/** The deploy-assets recipe BODY: the indented lines after the recipe header.
 *  Body-scoped on purpose — the comment block above the recipe may name
 *  anything; only what the recipe DOES counts. */
function deployAssetsRecipe() {
  const m = justfile().match(/^deploy-assets:\n((?:[ \t]+\S[^\n]*\n|\n)*)/m)
  expect(m, 'no deploy-assets recipe in the justfile — sw6-1 shipped one; it must not vanish').not.toBeNull()
  return m[1]
}

describe('jt5-2 — the probe is anchored before anything else is believed', () => {
  it('finds the orchestrator root above the plugin', () => {
    // star-wars' twin of this file silently skipped for a whole migration when
    // its root probe went stale — two assertions green-by-absence. Assert the
    // anchor, so a future move reds instead of skipping.
    expect(existsSync(join(orchestrator, 'justfile')), `no justfile at ${orchestrator}`).toBe(true)
    expect(existsSync(join(orchestrator, '.pennyfarthing')), `no .pennyfarthing at ${orchestrator}`).toBe(true)
    expect(existsSync(join(joust, 'README.md')), `no README at ${joust}`).toBe(true)
  })
})

describe('jt5-2 AC3 — `just deploy-assets` stages joust/sfx into the assets bucket', () => {
  it('the recipe body stages the joust/sfx key prefix', () => {
    expect(
      deployAssetsRecipe(),
      'AC3: extend deploy-assets to stage and upload joust/sfx/ — today it bakes star-wars only',
    ).toMatch(/joust\/sfx/)
  })

  it('and still stages star-wars — extended, not replaced', () => {
    // Green on arrival, deliberately: AC3 says "alongside its existing
    // star-wars staging". A rewrite that drops the music/sfx staging would
    // silence a SHIPPED game to make room for this one.
    const body = deployAssetsRecipe()
    expect(body).toMatch(/star-wars\/music/)
    expect(body).toMatch(/star-wars\/sfx/)
  })

  it('the bucket stays `arcade` — the one bucket that does not match its domain', () => {
    // Green on arrival, deliberately. The bucket behind
    // arcade-assets.slabgorb.com is named plain `arcade`; a well-meaning
    // "fix" to `arcade-assets` makes every upload vanish into a bucket that
    // does not exist (wrangler: "specified bucket does not exist").
    expect(justfile()).toMatch(/^assets_bucket\s*:=\s*"arcade"$/m)
  })

  it('the prefix the recipe uploads is the prefix the shell fetches', () => {
    // Green on arrival for the shell half (DEFAULT_BASE_URL landed with
    // jt5-1); the pair is what matters: files staged anywhere else 404 at the
    // exact URL the game asks for, and the engine will never say so.
    const audio = readFileSync(join(joust, 'src', 'shell', 'audio.ts'), 'utf8')
    expect(audio).toMatch(/arcade-assets\.slabgorb\.com\/joust\/sfx\//)
  })
})

describe('jt5-2 AC5 — the README stops claiming silence, and says where the sound lives', () => {
  it('the status line no longer reads "and **silent**"', () => {
    expect(readme(), 'AC5: flip the status line off silent').not.toMatch(
      /Live at \*\*v[^*]+\*\* and \*\*silent\*\*/,
    )
  })

  it('no sentence says the game is still silent', () => {
    expect(readme(), 'AC5: the game is not silent once the samples are live').not.toMatch(
      /game is still silent/,
    )
  })

  it('no sentence says the seam has no samples', () => {
    const md = readme()
    expect(md).not.toMatch(/Audio has a seam but no samples/)
    expect(md).not.toMatch(/nothing has been put in the assets bucket/)
  })

  it('no sentence defers the recording to a later story — this was that story', () => {
    // The count in the middle of the stale sentence is jt5-7's to correct;
    // match around it so this test neither pins nor perpetuates a number.
    expect(readme()).not.toMatch(/Recording or synthesising the \S+ cues is a later/)
  })

  it('and it names the live prefix the samples are served from', () => {
    // `joust/sfx` has grep-count 0 in the README today, so no stale sentence
    // can satisfy this — the positive half of the pair. (The URL claim's
    // TRUTH is the finish-phase curl artifact, not this test.)
    expect(readme(), 'AC5: say where the sound actually lives').toMatch(/joust\/sfx/)
  })
})

describe('jt5-2 — the apparatus can fail (checklist #18: a duplicated helper is untested code)', () => {
  it('flatten() un-wraps a blockquote-wrapped silence claim', () => {
    // This file DUPLICATES audio-seam-scope.test.ts's flatten() rather than
    // importing across suites; the original carries its own inertness controls
    // and this copy must too, or a regression here turns every README
    // negative above quietly green over untouched stale prose.
    const wrapped = '> so the\n> game is still silent: `@shared/audio` degrades quietly'
    expect(wrapped, 'precondition: the raw form must NOT match').not.toMatch(/game is still silent/)
    expect(flatten(wrapped), 'the flattened form MUST match, or the negatives are inert').toMatch(
      /game is still silent/,
    )
  })

  it('flatten() leaves ordinary prose intact', () => {
    expect(flatten('a  b\n c')).toBe('a b c')
  })
})
