// tools/pokey-bake/deploy-assets.test.mjs — RED for cp6-2 (Han Solo / TEA).
//
// AC4 (`just deploy-assets` names centipede) and AC6 (the README stops calling
// the game silent, and stops pointing at the archived cp5).
//
// Mirrors plugins/joust/tools/sample-bake/deploy-assets.test.mjs, which guards
// the same recipe from the joust end. Same flatten() discipline, same reason:
// a blockquote-wrapped sentence never matches raw, so a negative assertion
// written against the raw text is inert on a README that wraps — and this
// README wraps every line of its status block.
//
// NON-VACUITY, MEASURED AT RED. Every NEGATIVE assertion below was verified to
// MATCH the unchanged README today (an assertion that cannot fire today can
// never fire), and every POSITIVE is built from a token verified ABSENT today.
// The measurements are recorded per-test.
//
// ⚠ AC6 IS HALF-DONE ON ARRIVAL, AND THAT IS THE INTERESTING PART. The story
// says the README "currently points readers at 'the open epic
// sprint/epic-cp5.yaml'". It does not: `grep -c epic-cp5 README.md` is 0, and
// `git log -S` names c6d75c4 — the commit that FILED this epic also fixed the
// README. A guard for that clause therefore passes the moment it is written and
// proves nothing. It is kept below anyway, as a REGRESSION guard, and it is
// mutation-proved in the assessment rather than trusted. The clause that is
// genuinely open is the other one: README.md:11 still reads "playable and
// **silent**".
//
// The stale cp5 pointer did not vanish, though — it MOVED. src/shell/audio.ts:
// 16-19 still says a "LATER cp5 story" bakes and uploads these files. Correcting
// prose in one file and leaving the identical claim in another is how a
// corrected record stays false, so this file pins both.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const centipede = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const orchestrator = join(centipede, '..', '..')

/** Un-wrap markdown: strip blockquote markers, collapse whitespace. */
const flatten = (md) => md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')

const readmeRaw = () => readFileSync(join(centipede, 'README.md'), 'utf8')
const readme = () => flatten(readmeRaw())
const justfile = () => readFileSync(join(orchestrator, 'justfile'), 'utf8')
const audioSrc = () => readFileSync(join(centipede, 'src', 'shell', 'audio.ts'), 'utf8')

/** The deploy-assets recipe BODY: the indented lines after the recipe header.
 *  Body-scoped on purpose — the comment block above the recipe may name
 *  anything; only what the recipe DOES counts. */
function deployAssetsRecipe() {
  const m = justfile().match(/^deploy-assets:\n((?:[ \t]+\S[^\n]*\n|\n)*)/m)
  expect(m, 'no deploy-assets recipe in the justfile — it must not vanish').not.toBeNull()
  return m[1]
}

describe('cp6-2 — the probe is anchored before anything else is believed', () => {
  it('finds the orchestrator root above the plugin', () => {
    expect(existsSync(join(orchestrator, 'justfile')), `no justfile at ${orchestrator}`).toBe(true)
    expect(existsSync(join(orchestrator, '.pennyfarthing')), `no .pennyfarthing`).toBe(true)
    expect(existsSync(join(centipede, 'README.md')), `no README at ${centipede}`).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the recipe actually names this game
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 AC4 — `just deploy-assets` stages centipede/sfx into the assets bucket', () => {
  it('the recipe body stages the centipede/sfx key prefix', () => {
    // RED today: grep-count of `centipede` in the recipe body is 0.
    expect(
      deployAssetsRecipe(),
      'AC4: extend deploy-assets to stage and upload centipede/sfx/ — today it bakes ' +
        'star-wars and joust only',
    ).toMatch(/centipede\/sfx/)
  })

  it('the recipe body runs the centipede baker', () => {
    // Staging a directory without baking into it uploads an empty prefix and
    // every URL still 404s — the exact failure this epic exists to end, with a
    // green suite on top of it.
    expect(deployAssetsRecipe(), 'AC4: name the baker, not just the directory').toMatch(
      /centipede\/tools\/pokey-bake\/bake-sfx\.mjs/,
    )
  })

  it('every staged prefix is also BAKED into — a staged-but-unbaked game uploads nothing', () => {
    // Green on arrival for star-wars and joust, deliberately: AC4 says
    // "alongside star-wars and joust", and a rewrite that drops either would
    // silence a SHIPPED game to make room for this one.
    //
    // STRENGTHENED AT RED after a mutation SURVIVED. The first cut asserted
    // only that each prefix appeared SOMEWHERE in the body — and `joust/sfx`
    // appears twice (the mkdir at justfile:279 and the bake at :285), so
    // deleting it from the mkdir left the other mention and the test stayed
    // green. Same for `star-wars/music`. That is this story's own failure class
    // in miniature: a prefix that is staged but never baked into uploads an
    // empty directory, every URL 404s, and `@shared/audio` swallows all of it
    // while the suite reports success.
    //
    // The pair is the invariant, so the pair is what is asserted.
    const body = deployAssetsRecipe()
    const mkdir = body.match(/^\s*mkdir -p .*$/m)
    expect(mkdir, 'the recipe must create its staging tree').not.toBeNull()

    const bakes = [
      ['star-wars/music', /star-wars\/tools\/music-bake\/\S+\.mjs/],
      ['star-wars/sfx', /star-wars\/tools\/pokey-bake\/\S+\.mjs/],
      ['joust/sfx', /joust\/tools\/sample-bake\/\S+\.mjs/],
      ['centipede/sfx', /centipede\/tools\/pokey-bake\/\S+\.mjs/],
    ]
    for (const [prefix, baker] of bakes) {
      expect(mkdir[0], `${prefix} is never staged — deploy-r2 uploads what exists`).toContain(
        prefix,
      )
      expect(body, `${prefix} is staged but nothing bakes into it`).toMatch(baker)
    }
  })

  it('the bucket stays `arcade` — the one bucket that does not match its domain', () => {
    // Green on arrival, deliberately. The bucket behind
    // arcade-assets.slabgorb.com is named plain `arcade`; a well-meaning "fix"
    // to `arcade-assets` makes every upload vanish into a bucket that does not
    // exist (wrangler: "specified bucket does not exist").
    expect(justfile()).toMatch(/^assets_bucket\s*:=\s*"arcade"$/m)
  })

  it('the prefix the recipe uploads is the prefix the shell fetches', () => {
    // Files staged anywhere else 404 at the exact URL the game asks for, and
    // the engine will never say so.
    expect(audioSrc()).toMatch(/arcade-assets\.slabgorb\.com\/centipede\/sfx\//)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — the README stops claiming silence
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 AC6 — the README stops calling centipede silent', () => {
  it('the status line no longer reads "playable and **silent**"', () => {
    // MEASURED AT RED: README.md:11 reads
    // "> **Status:** Live at **v0.0.6**, playable and **silent**. Four epics have"
    // so this negative FIRES today. It is the genuinely open half of AC6.
    expect(readme(), 'AC6: flip the status line off silent').not.toMatch(
      /playable and \*\*silent\*\*/,
    )
  })

  it('no sentence says the samples are missing', () => {
    // MEASURED AT RED: the README today says "**no samples are baked or
    // uploaded yet**" and "every cue resolves to a file that is not there".
    // Both fire.
    const md = readme()
    expect(md).not.toMatch(/no samples are baked or uploaded/i)
    expect(md).not.toMatch(/resolves to a file that is not there/i)
  })

  it('no sentence describes the engine as degrading silently for want of samples', () => {
    // MEASURED AT RED: "the shared engine degrades silently" is present.
    // The engine's degradation is still TRUE as a mechanism — what must go is
    // the claim that it is what a player currently hears.
    expect(readme()).not.toMatch(/the shared engine degrades silently/i)
  })

  it('it names the live prefix the samples are served from', () => {
    // The positive half — the guard against "fixing" the negatives above by
    // deleting the sentences and leaving a reader with nothing.
    // MEASURED AT RED: `centipede/sfx` has grep-count 0 in the README today,
    // so no surviving stale sentence can satisfy this.
    expect(readme(), 'AC6: say where the sound actually lives').toMatch(/centipede\/sfx/)
  })

  it('does not point at cp5 as the owner of this work', () => {
    // ⚠ GREEN ON ARRIVAL — see the header. c6d75c4 already repointed this at
    // epic-cp6. Kept as a REGRESSION guard, mutation-proved in the assessment
    // rather than trusted. Do NOT read a pass here as work done.
    const md = readme()
    expect(md).not.toMatch(/open epic `?sprint\/epic-cp5\.yaml`?/i)
    expect(md, 'cp5 is archived; it cannot own an open deliverable').not.toMatch(
      /owned by `?sprint\/epic-cp5\.yaml`?/i,
    )
  })
})

describe('cp6-2 AC6 — the stale cp5 pointer that MOVED into the source', () => {
  it('audio.ts no longer defers the bake to "a LATER cp5 story"', () => {
    // MEASURED AT RED: src/shell/audio.ts:17 reads
    // "// Every filename below names a `.wav` that a LATER cp5 story bakes and uploads"
    // — the same false claim AC6 removes from the README, one file over. cp5
    // is archived and done; this story is the one that bakes them.
    expect(audioSrc(), 'AC6: cp5 does not own this — cp6-2 does').not.toMatch(
      /LATER cp5 story bakes and uploads/i,
    )
  })

  it('audio.ts no longer claims the samples do not exist', () => {
    // MEASURED AT RED: ":18 ... none of them exists yet" and the
    // ":16 NO SAMPLES SHIP WITH THIS STORY" banner. After this story they do
    // ship, and a file that says otherwise is a false comment in the module
    // the next reader opens first.
    const src = audioSrc()
    expect(src).not.toMatch(/none of them exists yet/i)
    expect(src).not.toMatch(/NO SAMPLES SHIP WITH THIS STORY/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The apparatus can fail — a duplicated helper is untested code
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 — the apparatus can fail', () => {
  it('flatten() un-wraps a blockquote-wrapped silence claim', () => {
    // This file DUPLICATES audio-seam-scope.test.ts's flatten() rather than
    // importing across suites; the original carries its own inertness controls
    // and this copy must too, or every README negative above turns quietly
    // green over untouched stale prose.
    const wrapped = '> playable and\n> **silent**. Four epics'
    expect(wrapped, 'precondition: the raw form must NOT match').not.toMatch(
      /playable and \*\*silent\*\*/,
    )
    expect(flatten(wrapped), 'the flattened form MUST match, or the negatives are inert').toMatch(
      /playable and \*\*silent\*\*/,
    )
  })

  it('flatten() leaves ordinary prose intact', () => {
    expect(flatten('a  b\n c')).toBe('a b c')
  })

  it('deployAssetsRecipe() reads the BODY, not the comment above it', () => {
    // The recipe's comment block names star-wars and joust in prose. If the
    // matcher leaked into it, AC4's centipede assertion could be satisfied by
    // a comment mentioning centipede while the recipe bakes nothing.
    const body = deployAssetsRecipe()
    expect(body, 'the body must not include the recipe header line').not.toMatch(
      /^deploy-assets:/m,
    )
    expect(body, 'the body must not reach the comment above the recipe').not.toMatch(
      /^# Bake star-wars/m,
    )
  })
})
