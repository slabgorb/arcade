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
})
