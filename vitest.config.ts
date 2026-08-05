// vitest.config.ts — one project per app, each ROOTED AT ITS OWN DIRECTORY.
//
// The per-app `root` is load-bearing, not tidiness: tempest's, star-wars's,
// centipede's and red-baron's citation gates read paths like 'src/core/sim.ts'
// through a bare readFileSync resolved against cwd, and the core/shell purity
// scanners scan relative source paths. Rooting each project at its own directory
// means none of them notice the move, so no path re-anchoring is needed.
//
// Task 3 note: src/shared, src/host and every plugins/<game> are stub directories
// (a lone .gitkeep) until Tasks 4-13 import real code into them. Vitest is fine
// rooting a project at a directory with no test files — it just contributes zero
// tests to that project — so every entry below resolves today, and later tasks
// need no re-registration here.
//
// Task 3 deviation: the lobby project is 'node', not 'jsdom'. Unlike the stub
// dirs above, lobby/ already holds its real, currently-shipping test suite (11
// files, 127 tests) — this config runs it immediately, not in some later task.
// Under 'jsdom' two files throw `TypeError: The URL must be of scheme file`
// from `fileURLToPath(new URL('../src/...', import.meta.url))` (tests/storage.
// test.ts, tests/refresh-rules.test.ts) — jsdom's URL/global environment
// doesn't round-trip through Node's fileURLToPath the way these source-text
// citation checks expect. lobby's own vitest.config.ts (still authoritative
// today) already pins `environment: 'node'`; matching it here is what makes
// all 127 tests pass with zero regressions instead of 2 files erroring out.
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const root = import.meta.dirname
const alias = {
  '@shared': resolve(root, 'src/shared'),
  '@host': resolve(root, 'src/host'),
}

const GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
  'missile-command',
] as const

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'shared',
          root: resolve(root, 'src/shared'),
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'host',
          root: resolve(root, 'src/host'),
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'lobby',
          root: resolve(root, 'lobby'),
          globals: true,
          environment: 'node',
        },
      },
      ...GAMES.map((id) => ({
        resolve: { alias },
        test: {
          name: id,
          root: resolve(root, 'plugins', id),
          globals: true,
          environment: 'node' as const,
        },
      })),
    ],
  },
})
