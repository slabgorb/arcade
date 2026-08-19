// tools/sample-bake/deploy-assets.test.mjs — RED for df6-3 (Leeloo / TEA).
//
// AC2 (the upload path) and AC3 (the status line stops claiming silence).
// Mirrors joust's tools/sample-bake/deploy-assets.test.mjs, which guards the
// same recipe from the other end.
//
// What this file deliberately does NOT do is check the bucket. The story's
// acceptance is a live 200 per URL with an audio/wav content-type, curled and
// pasted into the session at finish (Decision B) — `@shared/audio` degrades
// silently on a 404, so no assertion here can distinguish a populated bucket
// from an empty one, and a network test in vitest would only pretend otherwise.
//
// The mis-anchor failure mode this file's FIRST test exists to prevent is real:
// the deploy-assets recipe pointed at the retired root-level star-wars/ paths
// for the whole monorepo migration and died on `node: cannot find module`
// before uploading anything — while its only watcher stayed green, because that
// watcher asserted a STRING appeared somewhere in the file rather than that the
// path the recipe INVOKES exists on disk. So this file resolves the defender
// bake the recipe actually calls and asserts it is really there.
//
// SCOPE FENCE: this file pins only the SILENCE claims df6-3 ends. Defender has
// no README; its status line is the main.ts header ("Ships SILENT — no samples
// in the bucket yet"), and audio.ts's own header defers the bake to "a later df
// story" — this IS that story. Nothing here pins a cue COUNT (the jt5-2 lesson,
// and the repo-wide no-count-guards rule).
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const defender = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const orchestrator = join(defender, '..', '..')

const justfile = () => readFileSync(join(orchestrator, 'justfile'), 'utf8')
const mainTs = () => readFileSync(join(defender, 'src', 'main.ts'), 'utf8')
const audioTs = () => readFileSync(join(defender, 'src', 'shell', 'audio.ts'), 'utf8')

/** Un-wrap a code comment: strip each line's leading `//` or block-comment `*`
 *  marker, THEN collapse whitespace, so a claim that wraps across comment lines
 *  matches its one-line raw form. Dropping the marker is load-bearing — without
 *  it a wrapped claim keeps an interior `// ` between words ("no samples\n// in
 *  the bucket" -> "no samples // in the bucket") and every negative below goes
 *  inert green-by-absence. This is the JS-comment twin of joust's flatten(),
 *  which strips the markdown `> `; the apparatus block at the foot proves it
 *  fires on the real wrapped forms. */
const collapse = (s) => s.replace(/^\s*(?:\/\/|\*)\s?/gm, ' ').replace(/\s+/g, ' ')

/** The deploy-assets recipe BODY: the indented lines after the recipe header.
 *  Body-scoped on purpose — the comment block above the recipe may name
 *  anything; only what the recipe DOES counts. */
function deployAssetsRecipe() {
  const m = justfile().match(/^deploy-assets:\n((?:[ \t]+\S[^\n]*\n|\n)*)/m)
  expect(m, 'no deploy-assets recipe in the justfile — it must not vanish').not.toBeNull()
  return m[1]
}

describe('df6-3 — the probe is anchored before anything else is believed', () => {
  it('finds the orchestrator root above the plugin', () => {
    // A stale root probe skips silently — two assertions green-by-absence.
    // Assert the anchors, so a future move reds instead of skipping.
    expect(existsSync(join(orchestrator, 'justfile')), `no justfile at ${orchestrator}`).toBe(true)
    expect(existsSync(join(orchestrator, '.pennyfarthing')), `no .pennyfarthing at ${orchestrator}`).toBe(
      true,
    )
    expect(existsSync(join(defender, 'src', 'main.ts')), `no main.ts at ${defender}`).toBe(true)
    expect(existsSync(join(defender, 'src', 'shell', 'audio.ts')), `no audio.ts`).toBe(true)
  })
})

describe('df6-3 AC2 — `just deploy-assets` bakes defender/sfx into the assets bucket', () => {
  it('the recipe body stages the defender/sfx key prefix', () => {
    expect(
      deployAssetsRecipe(),
      'AC2: extend deploy-assets to stage and upload defender/sfx/ — today it bakes star-wars, joust and centipede only',
    ).toMatch(/defender\/sfx/)
  })

  it('the recipe invokes a defender bake script that EXISTS on disk', () => {
    // The mis-anchor guard. The recipe calls its bakes as
    // `node {{root}}/plugins/<game>/tools/.../bake-*.mjs "$staging/..."`; a
    // recipe line that names a defender bake which is not on disk dies at
    // deploy time with `cannot find module` and uploads nothing, while a
    // string-only check stays green. Resolve {{root}} and stat the file.
    const body = deployAssetsRecipe()
    const m = body.match(/\{\{root\}\}\/(plugins\/defender\/\S+\.mjs)/)
    expect(
      m,
      'AC2: the recipe must INVOKE a defender bake under {{root}}/plugins/defender/… (node …bake…mjs "$staging/defender/sfx")',
    ).not.toBeNull()
    const toolPath = join(orchestrator, m[1])
    expect(existsSync(toolPath), `recipe invokes ${m[1]} but it is not on disk`).toBe(true)
  })

  it('and still stages star-wars, joust and centipede — extended, not replaced', () => {
    // Green on arrival, deliberately: a rewrite that drops the existing staging
    // would silence three SHIPPED games to make room for this one.
    const body = deployAssetsRecipe()
    expect(body).toMatch(/star-wars\/music/)
    expect(body).toMatch(/star-wars\/sfx/)
    expect(body).toMatch(/joust\/sfx/)
    expect(body).toMatch(/centipede\/sfx/)
  })

  it('the bucket stays `arcade` — the one bucket that does not match its domain', () => {
    // Green on arrival, deliberately. The bucket behind
    // arcade-assets.slabgorb.com is named plain `arcade`; a well-meaning "fix"
    // to `arcade-assets` makes every upload vanish into a bucket that does not
    // exist (wrangler: "specified bucket does not exist").
    expect(justfile()).toMatch(/^assets_bucket\s*:=\s*"arcade"$/m)
  })

  it('the prefix the recipe uploads is the prefix the shell fetches', () => {
    // Green on arrival for the shell half (DEFAULT_BASE_URL landed with df6-1);
    // the PAIR is what matters — files staged anywhere else 404 at the exact
    // URL the game asks for, and the engine will never say so.
    expect(audioTs()).toMatch(/arcade-assets\.slabgorb\.com\/defender\/sfx\//)
  })
})

describe('df6-3 AC3 — the status line stops claiming silence', () => {
  it('main.ts no longer says the game ships silent', () => {
    const md = collapse(mainTs())
    expect(md, 'AC3: flip the status line off silent — "Ships SILENT" is df6-1 status').not.toMatch(
      /Ships SILENT/,
    )
    expect(md, 'AC3: the samples are in the bucket now — this was that story').not.toMatch(
      /no samples in the bucket/,
    )
  })

  it('audio.ts no longer defers the bake to "a later df story"', () => {
    const md = collapse(audioTs())
    // df6-1's header called the bake "a later df story" twice — the seam intro
    // and the DEFAULT_BASE_URL comment. df6-3 IS that story; the deferral is a
    // lie once the samples are live.
    expect(md, 'AC3: this IS the later df story — stop pointing forward').not.toMatch(
      /A later df story bakes the samples and deploys them/,
    )
  })
})

describe('df6-3 — the apparatus can fail (a silence-matcher that matches nothing is inert)', () => {
  it('collapse() + the negative regex actually match the stale status line', () => {
    // If these matchers do not fire on the stale prose, every negative above is
    // green-by-absence and pins nothing. Prove them on the literal stale forms
    // — a wrapped comment must collapse to the raw sentence and match.
    const wrappedMain = 'PLAY tick.\n// Ships SILENT — no samples\n// in the bucket yet.'
    expect(wrappedMain, 'precondition: the raw wrapped form must NOT match').not.toMatch(
      /Ships SILENT.*no samples in the bucket/,
    )
    expect(collapse(wrappedMain), 'the collapsed form MUST match, or the AC3 negatives are inert').toMatch(
      /Ships SILENT/,
    )
    expect(collapse(wrappedMain)).toMatch(/no samples in the bucket/)

    const wrappedAudio = 'A later df story bakes\n// the samples and deploys them, the way jt5-2'
    expect(collapse(wrappedAudio), 'the audio.ts deferral matcher must fire on its stale form').toMatch(
      /A later df story bakes the samples and deploys them/,
    )
  })

  it('collapse() leaves ordinary prose intact', () => {
    expect(collapse('a  b\n c')).toBe('a b c')
  })
})
