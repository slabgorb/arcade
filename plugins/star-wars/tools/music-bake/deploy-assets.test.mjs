// tools/music-bake/deploy-assets.test.mjs — RED for sw6-1, AC-8 (UPLOAD).
//
// AC-8's deliverable lives at the ORCHESTRATOR root (`just deploy-assets`, or the
// manual step written into docs/ops/hosting.md), not inside the game.
//
// REWRITTEN at the monorepo migration — RE-ANCHORED AND UN-SKIPPED, not deleted.
// Two things changed and both mattered:
//
//   1. PATH. The probe walked ONE level up from the game root, which was the
//      orchestrator back when the game was a sibling subrepo (`arcade/star-wars`).
//      The game now lives at `arcade/plugins/star-wars`, so one level up is
//      `plugins/` — no justfile, no .pennyfarthing. Left alone, the whole describe
//      SILENTLY SKIPPED after the move: 2 assertions turned green-by-absence with
//      nothing red to notice. The root is two levels up now.
//
//   2. THE SKIP ITSELF. The original guard existed for one reason: star-wars was an
//      independent repo whose own CI checked it out ALONE, without the orchestrator
//      around it, so an unconditional read of `../justfile` would have gone red in
//      star-wars CI for a file that repo neither had nor should have had. There is no
//      standalone star-wars repo and no standalone star-wars CI any more — that is
//      what this migration removed. A guard whose precondition can never be false is
//      better written as an assertion, and a skip is the one failure mode this file
//      already proved it can suffer without anyone noticing. So the orchestrator's
//      presence is now asserted, granularly, as the first test.
//
// The story's real acceptance for AC-8 is still a live 200, checked in the browser (AC-9).
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const starWars = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const orchestrator = join(starWars, '..', '..')

describe('sw6-1 AC-8 — there is a way to get the .wav onto R2', () => {
  it('finds the orchestrator root above the plugin (the probe must not skip itself)', () => {
    expect(
      existsSync(join(orchestrator, 'justfile')),
      `no justfile at ${orchestrator} — the orchestrator-root probe is mis-anchored, and the two AC-8 assertions below would read the wrong tree`,
    ).toBe(true)
    expect(
      existsSync(join(orchestrator, '.pennyfarthing')),
      `no .pennyfarthing at ${orchestrator} — the orchestrator-root probe is mis-anchored`,
    ).toBe(true)
  })

  // There is no automated upload path for the arcade-assets bucket today: CI
  // deploys each app's dist/ only, and the existing sfx/ and speech/ appear to
  // have been placed by hand. A story that bakes four beautiful .wav files and
  // never uploads them leaves the game exactly as silent as it is now.
  it('either ships a deploy-assets recipe, or documents the manual step', () => {
    const justfile = readFileSync(join(orchestrator, 'justfile'), 'utf8')
    const hasRecipe = /^deploy-assets\b/m.test(justfile)

    const hostingPath = join(orchestrator, 'docs', 'ops', 'hosting.md')
    const hosting = existsSync(hostingPath) ? readFileSync(hostingPath, 'utf8') : ''
    const documented = /arcade-assets/.test(hosting) && /music/i.test(hosting)

    expect(
      hasRecipe || documented,
      'AC-8: add a `just deploy-assets` recipe or document the arcade-assets music upload in docs/ops/hosting.md',
    ).toBe(true)
  })

  it('names the music prefix the game actually fetches from', () => {
    // src/shell/audio.ts fetches from .../star-wars/music/ — whatever the upload
    // path is, it has to put the files THERE.
    const audio = readFileSync(join(starWars, 'src', 'shell', 'audio.ts'), 'utf8')
    expect(audio).toMatch(/arcade-assets\.slabgorb\.com\/star-wars\/music\//)

    const justfile = readFileSync(join(orchestrator, 'justfile'), 'utf8')
    const hostingPath = join(orchestrator, 'docs', 'ops', 'hosting.md')
    const hosting = existsSync(hostingPath) ? readFileSync(hostingPath, 'utf8') : ''

    expect(
      /star-wars\/music/.test(justfile) || /star-wars\/music/.test(hosting),
      'AC-8: the upload path must target star-wars/music/ in the arcade-assets bucket',
    ).toBe(true)
  })

  // =========================================================================
  // STRENGTHENED BY TASK 19 — the guard above went GREEN over a dead recipe
  // =========================================================================
  // For the whole of the monorepo migration `deploy-assets` ran
  // `node {{root}}/star-wars/tools/music-bake/bake-music.mjs`. Root-level
  // star-wars/ stopped existing at the import — it is plugins/star-wars/ — so the
  // recipe died on a missing module before uploading a single byte.
  //
  // Every assertion above stayed green through that, and the one meant to catch it
  // is the reason why: it asserts the STRING `star-wars/music` appears somewhere in
  // the justfile, and the recipe's own `mkdir -p "$staging/star-wars/music"` line
  // satisfies it — a DIFFERENT line from the broken one. A substring test cannot
  // tell a live path from a dead one.
  //
  // This matters more than the shape suggests: assets and code deploy
  // independently here, this recipe is not in CI, audio.ts degrades silently on a
  // 404, and a missing star-wars upload once hid from sw7-18 all the way to
  // sw8-14. Losing the only watcher over the upload path is precisely the failure
  // this epic exists to prevent.
  //
  // So: resolve the paths the recipe ACTUALLY invokes and require them on disk.
  it('every script `deploy-assets` invokes exists on disk', () => {
    const justfile = readFileSync(join(orchestrator, 'justfile'), 'utf8')

    // The recipe body: a col-0 `deploy-assets:` header, indented body lines.
    const lines = justfile.split('\n')
    const start = lines.findIndex((l) => /^deploy-assets(\s|:)/.test(l) && !/:=/.test(l))
    expect(start, 'no `deploy-assets` recipe in the justfile').toBeGreaterThan(-1)
    const body = []
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue
      if (!/^\s/.test(lines[i])) break
      body.push(lines[i])
    }

    // `node <path> …` invocations, with just's `{{root}}` resolved.
    const invoked = body
      .map((l) => /^\s*node\s+(\S+)/.exec(l)?.[1])
      .filter(Boolean)
      .map((p) => p.replace(/\{\{root\}\}/g, orchestrator).replace(/^"|"$/g, ''))

    // Anti-vacuity: an empty list would satisfy a bare forEach and prove nothing.
    // The recipe bakes music, bakes sfx and uploads — three node invocations.
    expect(
      invoked.length,
      `deploy-assets must invoke node scripts; found ${JSON.stringify(invoked)}`,
    ).toBeGreaterThanOrEqual(3)

    for (const script of invoked) {
      expect(
        existsSync(script),
        `deploy-assets runs \`node ${script}\`, which does not exist — the recipe dies before it ` +
          `uploads anything, and nothing else in this repo would notice. Did the tools move?`,
      ).toBe(true)
    }

    // And the two that matter by name, so a recipe that stopped baking at all
    // (three invocations, none of them the bake) cannot satisfy the loop above.
    for (const bake of ['music-bake/bake-music.mjs', 'pokey-bake/bake-sfx.mjs']) {
      expect(
        invoked.some((s) => s.endsWith(bake)),
        `deploy-assets must still run ${bake}; it runs ${JSON.stringify(invoked)}`,
      ).toBe(true)
    }
  })

  it('bakes into, and uploads from, the star-wars/{music,sfx} prefixes', () => {
    // The path half of the same guard. The bake scripts are handed the staging
    // directory whose layout MIRRORS THE BUCKET KEYS (deploy-r2.mjs keys objects by
    // their path relative to the dir it is given), so a bake written to the wrong
    // subdirectory uploads to the wrong prefix and 404s behind the custom domain —
    // silently, exactly like the original defect.
    const justfile = readFileSync(join(orchestrator, 'justfile'), 'utf8')
    const lines = justfile.split('\n')
    const start = lines.findIndex((l) => /^deploy-assets(\s|:)/.test(l) && !/:=/.test(l))
    const body = []
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue
      if (!/^\s/.test(lines[i])) break
      body.push(lines[i])
    }
    const music = body.find((l) => /bake-music\.mjs/.test(l))
    const sfx = body.find((l) => /bake-sfx\.mjs/.test(l))
    expect(music, 'deploy-assets must bake the music').toBeDefined()
    expect(sfx, 'deploy-assets must bake the sfx').toBeDefined()
    expect(music).toMatch(/\$staging\/star-wars\/music/)
    expect(sfx).toMatch(/\$staging\/star-wars\/sfx/)
    // …and the staging root — not a subdirectory of it — is what gets uploaded,
    // or the star-wars/ prefix would be stripped off every key.
    expect(
      body.some((l) => /deploy-r2\.mjs\s+"\$staging"/.test(l)),
      'deploy-assets must upload the staging ROOT, so the keys keep their star-wars/ prefix',
    ).toBe(true)
  })
})
