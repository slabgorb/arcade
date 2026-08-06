// src/host/registry.test.ts — the seven REAL manifests, put through the real gate.
//
// contract.test.ts proves validateMeta rejects; this proves the cabinet's own manifests
// pass it. Before this file existed nothing anywhere called validateMeta: it was a gate
// built for seven manifests that those seven manifests never walked through, and its
// only exercise was its own unit suite. The generator (scripts/gen-registry.mjs) now
// calls it too, but the generator runs only when someone runs it — this runs on every
// `vitest run`, and it also re-validates the COMMITTED src/host/registry.ts, which is
// the artefact the lobby actually imports.
//
// Import route: plain relative paths, no new alias. vitest.config.ts defines `@shared`
// and `@host` and nothing else; a `@plugins` alias would have to be added in three
// places that must agree (vitest.config.ts, tsconfig.json's `paths`, and Task 16's
// build) to save one `../../` in one file. The host project is rooted at src/host, so
// `../../plugins/<id>/plugin` is unambiguous, and the games' own suites already import
// across project roots via `@shared`, so cross-root resolution is proven.
//
// The imports are STATIC, not a dynamic `import(\`../../plugins/${id}/plugin\`)`: static
// imports are what make tsc typecheck each manifest against GameMeta, and a missing file
// fails at collection instead of inside a loop. The cost is that adding a ninth game
// means editing this file — which the first test below turns into a hard failure rather
// than a silent gap.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateMeta } from './contract'
import { GAMES, LISTED_GAMES, getGame, gamePath } from './registry'

import { meta as tempest, build as tempestBuild } from '../../plugins/tempest/plugin'
import { meta as starWars, build as starWarsBuild } from '../../plugins/star-wars/plugin'
import { meta as asteroids } from '../../plugins/asteroids/plugin'
import { meta as battlezone } from '../../plugins/battlezone/plugin'
import { meta as centipede } from '../../plugins/centipede/plugin'
import { meta as joust } from '../../plugins/joust/plugin'
import { meta as redBaron, build as redBaronBuild } from '../../plugins/red-baron/plugin'
import { meta as missileCommand } from '../../plugins/missile-command/plugin'

const PLUGINS = fileURLToPath(new URL('../../plugins', import.meta.url))

/** Keyed by DIRECTORY name — validateMeta's id-vs-directory rule is only enforced if the
 *  key here is the directory, so these are the directory names, not the manifests' ids. */
const MANIFESTS = {
  asteroids,
  battlezone,
  centipede,
  joust,
  'missile-command': missileCommand,
  'red-baron': redBaron,
  'star-wars': starWars,
  tempest,
} as const

/** The three manifests that ship dev-tool pages. Kept honest against the source text by
 *  `covers every manifest that exports a build spec` — a hand-maintained subset with
 *  nothing checking its membership is the defect this whole task is about. */
const BUILDS = {
  tempest: tempestBuild,
  'star-wars': starWarsBuild,
  'red-baron': redBaronBuild,
} as const

const dirNames = (): string[] =>
  readdirSync(PLUGINS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

describe('the eight real manifests', () => {
  it('covers every plugins/ directory', () => {
    // A ninth game that never gets imported above would otherwise be validated by
    // nothing at all — the exact silent-absence failure this contract exists to stop.
    expect(Object.keys(MANIFESTS).sort()).toEqual(dirNames())
  })

  it.each(Object.entries(MANIFESTS))('%s passes validateMeta against its directory', (dir, meta) => {
    // The operative assertion is "does not throw" — validateMeta's whole job is rejection.
    // `.toBe`, not `.toEqual`: it returns the SAME reference, so toEqual would compare an
    // object with itself and pass no matter what the validator did to it.
    expect(validateMeta(meta, dir)).toBe(meta)
  })

  it.each(Object.entries(MANIFESTS))('%s declares its own package.json version', (dir, meta) => {
    const pkg = JSON.parse(readFileSync(join(PLUGINS, dir, 'package.json'), 'utf8'))
    expect(meta.version).toBe(pkg.version)
    expect(meta.version).not.toBe('')
  })

  it('gives every game a distinct order', () => {
    // Not checkable inside validateMeta — one manifest cannot see its siblings.
    const orders = Object.values(MANIFESTS).map((m) => m.order)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('covers every manifest that exports a build spec', () => {
    // The symmetric guard to `covers every plugins/ directory`, and for the same reason:
    // without it, a fourth manifest gaining `export const build` joins the build with its
    // entries checked by nothing. Read from the source text because a manifest that is not
    // imported above cannot be asked whether it has the export.
    const declared = dirNames().filter((dir) =>
      /^export const build:/m.test(readFileSync(join(PLUGINS, dir, 'plugin.ts'), 'utf8')),
    )
    expect(Object.keys(BUILDS).sort()).toEqual(declared)
  })

  it('declares only build entries that exist on disk', () => {
    for (const [dir, build] of Object.entries(BUILDS)) {
      for (const entry of build.entries ?? []) {
        expect(existsSync(join(PLUGINS, dir, entry)), `plugins/${dir}/${entry}`).toBe(true)
      }
    }
  })
})

describe('the generated registry', () => {
  it('holds exactly the eight manifests, each still passing validateMeta', () => {
    // The generated file is committed, so it can be hand-edited. Re-validating it here
    // means a hand edit that breaks the contract fails the suite, not just the generator.
    //
    // The directory comes from the FILESYSTEM, not from `game.id`. Passing the id of the
    // object under test makes validateMeta's id-vs-directory rule compare a value with
    // itself: it can never fire, so an edited id would sail through the one check written
    // to catch it. Taking the directory from disk is what makes the claim above true.
    const dirs = dirNames()
    expect(GAMES).toHaveLength(Object.keys(MANIFESTS).length)
    for (const game of GAMES) {
      const dir = dirs.find((d) => d === game.id)
      expect(dir, `registry has '${game.id}', which is not a plugins/ directory`).toBeDefined()
      expect(validateMeta(game, dir as string)).toBe(game)
    }
  })

  it('is the manifests, in curated order, field for field', () => {
    const expected = Object.values(MANIFESTS)
      .slice()
      .sort((a, b) => a.order - b.order)
    expect(GAMES).toEqual(expected)
    expect(GAMES.map((g) => g.id)).toEqual([
      'tempest',
      'star-wars',
      'asteroids',
      'battlezone',
      'centipede',
      'joust',
      'red-baron',
      'missile-command',
    ])
  })

  it('lists seven games and holds red-baron back deliberately', () => {
    expect(LISTED_GAMES.map((g) => g.id)).toEqual([
      'tempest',
      'star-wars',
      'asteroids',
      'battlezone',
      'centipede',
      'joust',
      'missile-command',
    ])
    expect(getGame('red-baron')?.listed).toBe(false)
  })

  it('keeps the showcase carousel at tempest, battlezone and centipede', () => {
    // showcase is required and never defaulted precisely so this set cannot change by
    // omission. If a game joins or leaves the carousel, it is because someone said so.
    // battlezone said so in ad1-2: its attract mode has self-played since the bz1-10 era
    // (core/sim.ts drives the same stepBattle real play uses through an autopilot), so
    // the opt-in was the only work the story had left.
    expect(GAMES.filter((g) => g.showcase).map((g) => g.id)).toEqual([
      'tempest',
      'battlezone',
      'centipede',
    ])
  })

  it('derives launch paths from the id on one origin', () => {
    expect(gamePath('tempest')).toBe('/tempest/')
    expect(getGame('nope')).toBeUndefined()
  })
})
