// tests/scaffold.test.ts
//
// Story jt1-1 — RED phase (O'Brien / TEA). Joust-internal scaffold contract.
// These tests read Joust's OWN config files and pin the invariants the story
// names: TypeScript strict, an index.html booting src/main.ts into a <canvas>,
// and the src/core + src/shell skeletons the whole epic is built on.
//
// The cross-repo wiring invariants (justfile games/subrepos/serve, CLAUDE.md
// port row, repos.yaml) live in the ORCHESTRATOR suite:
// tests/joust-bootstrap.test.mjs — a plugin test must never file-read
// orchestrator docs (the tp1 lesson).
//
// ===========================================================================
// MONOREPO MIGRATION (Task 12 — joust imported as plugins/joust)
// ===========================================================================
//
// FIVE whole describes were REMOVED here — 26 tests / 50 assertions in total,
// all false BY DESIGN once joust stopped being a standalone repo. Quoted by
// their exact old titles.
//
// COUNTING CONVENTION (inherited from centipede's Task 11 record so the two
// reconcile): "tests" counts `it()` blocks. "Assertions" counts `expect()`
// STATEMENTS, and a statement inside a `for` loop is counted ONCE PER
// ITERATION — so the 7-iteration sibling-port and sibling-bucket loops below
// contribute 7 each, not 1 each. Every number here was machine-counted against
// the pre-migration file, not estimated.
//
//   * `scaffold — vite.config.ts (pinned port 5279, base /)` (7 tests, 14
//     assertions — 8 `expect` statements, one of them a 7-iteration loop over
//     TAKEN_PORTS). joust has no vite.config.ts any more; the monorepo root
//     owns the dev server, the build, `base`, the port, `strictPort` and the
//     host pin. The invariants are NOT retired — Task 19 restores them at the
//     root and Task 12b asserts them ONCE for the whole cabinet. Do not
//     re-create them here.
//
//   * `scaffold — strictPort is real, not just declared (AC-1, behavioural)`
//     (1 test, 3 assertions).
//
//     ⚠️ READ THIS ONE PROPERLY BEFORE CONSOLIDATING IT. It is not another copy
//     of the declarative host/strictPort assertion the six sibling games also
//     carried. joust is where the whole guard was INVENTED (story jt1-3, ported
//     fleet-wide afterwards as td1-1), and joust is the only repo in the arcade
//     where the pin was ever PROVEN rather than asserted.
//
//     What it actually did: it opened a real TCP listener on 127.0.0.1:5279,
//     spawned the real `node_modules/.bin/vite`, waited up to 25s, and required
//     that the process (a) did not stay running, (b) exited non-zero, and (c)
//     named the contested port in its output. It therefore caught failure modes
//     no config-text regex can see — a vite version that silently ignores
//     `strictPort`, a pin sitting on the wrong block, or the IPv6 fall-through
//     (`[::1]:5279` alongside a held `127.0.0.1:5279`) that the orchestrator
//     CLAUDE.md warns about and that a declarative check reads straight past.
//
//     A DECLARATIVE RE-ASSERTION AT THE ROOT IS NOT EQUIVALENT TO THIS TEST.
//     Task 12b's `defineAppConfig(...).server.host === '127.0.0.1'` restores
//     the claim, not the proof. Removing it here is correct — there is no
//     per-plugin vite binary, no per-plugin port and no per-plugin dev server
//     left to collide with — but the arcade is losing its only behavioural
//     evidence that the pin bites, and whoever consolidates should record that
//     as a knowingly-accepted reduction in coverage rather than tick it off as
//     "restored". Do not re-create it here; there is nothing here to spawn.
//
//   * `scaffold — package.json scripts (verbatim from the sibling games)` (9
//     tests, 14 assertions). The per-plugin package.json is a three-field stub
//     (name/version/private): no `type: module`, no scripts, no
//     devDependencies, no node_modules of its own. `npm run
//     dev|build|preview|test|lint` inside a plugin is deliberately gone, and
//     the "what actually RESOLVED into node_modules" Vite-8 / Vitest-4 check
//     now belongs to the root's single node_modules.
//
//   * `scaffold — fresh-checkout hygiene (AC-1: npm install from a clean
//     clone)` (3 tests, 4 assertions). There is no fresh clone of joust to be
//     hygienic about. The `package-lock.json` assertion is INVERTED by the
//     collapse — the plugin must now NOT carry a lockfile, which is Task 12b's
//     `no per-app vite config, tsconfig base, or lockfile survives`. The
//     `.gitignore` node_modules/dist assertion belongs to the root .gitignore.
//     The `git ls-files -- dist` anti-tracking check ran with `cwd: root`; it
//     is a repo-wide property now, not a plugin one.
//
//   * `scaffold — CI deploy caller (.github/workflows/deploy.yml)` (6 tests, 15
//     assertions — 9 `expect` statements, one of them a 7-iteration loop over
//     SIBLING_BUCKETS). There is no per-repo CI caller any more: the ten-line
//     `slabgorb/arcade/.github/workflows/deploy-r2.yml@main` shape, the
//     `arcade-joust` bucket target, the push-to-main-only trigger, the
//     sibling-bucket guard and the thin-caller guard all go with it. One
//     cabinet, one deploy (Task 18); Task 12b owns whatever replaces it.
//
// 7 + 1 + 9 + 3 + 6 = 26 tests and 14 + 3 + 14 + 4 + 15 = 50 assertions, which
// is the whole of the delta: this file went 34 `it` blocks → 8, and joust's
// suite 1872 → 1846 tests with its FILE count unchanged at 75. The plan's "34"
// is this file's pre-migration TOTAL, not the false-by-design subset.
//
// What SURVIVED is REWRITTEN, not deleted:
//   * the tsconfig strict guard now asserts the stub DELEGATES strictness to
//     the monorepo root instead of declaring it — see the long note below.
//   * `type-checks both src and tests` is KEPT (only its rationale comment is
//     corrected). It is not false by design: the stub really does still declare
//     `"include": ["src", "tests"]`, and the assertion still catches a stub that
//     quietly stops covering the suite. Task 12b asserts `extends`, not
//     `include`, so this is not a duplicate of anything being consolidated.
//   * `index.html boots a canvas` and `src/core + src/shell skeletons` are
//     untouched. The boundary they pin is exactly as load-bearing as it was,
//     and the epic still lives on it.
//
// Reaching up the `extends` chain to the root config is the one place this file
// is no longer standalone-clone-pure — the plugin is not a repo now.
//
// joust never pinned `@arcade/shared` (its mulberry32 is lifted byte-for-byte
// into src/core/frame.ts rather than imported), so nothing here changes on that
// axis and no `@shared` import is added.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — tsconfig.json (TypeScript strict, mirrors the sibling games)', () => {
  it('tsconfig.json exists', () => {
    expect(existsSync(path('tsconfig.json')), 'plugins/joust/tsconfig.json must exist').toBe(true)
  })

  it('inherits strict mode from the monorepo root — and never redeclares it', () => {
    // Pre-migration this read joust's OWN tsconfig text for `"strict": true`.
    // The plugin stub carries only `extends` + `include`, so that text match
    // would now fail while strictness is entirely intact one level up. The
    // INVARIANT is unchanged — joust must compile under `strict` — so follow
    // the chain instead of dropping the guard. tsconfig may carry comments and
    // trailing commas, so this stays raw-text rather than JSON.parse.
    const visited: string[] = []
    let rel = 'tsconfig.json'
    let text = read(rel)

    while (!/"strict":\s*true/.test(text)) {
      const parent = text.match(/"extends":\s*"([^"]+)"/)?.[1]
      expect(
        parent,
        `${rel} neither sets "strict": true nor extends a config that might`,
      ).toBeTruthy()
      rel = join(dirname(rel), parent as string)
      expect(visited, `circular "extends" chain revisiting ${rel}`).not.toContain(rel)
      visited.push(rel)
      text = read(rel)
    }

    // NOT `expect(text).toMatch(/"strict":\s*true/)` and NOT
    // `expect(visited.length).toBeGreaterThan(0)` — the loop can only exit once
    // that regex has matched, so either would be a guard that cannot fail.
    //
    // What the walk leaves UNGUARDED is the stub's own text, and the hole is
    // bigger than it looks: the loop searches for `"strict": true`, so a stub
    // carrying `"strict": false` does not match, the walk steps straight over
    // the override, finds `true` at the root and passes — while the effective
    // setting for this plugin is `false`. The pre-migration assertion read the
    // game's own file raw and had no such hole; walking the chain reintroduced
    // it.
    //
    // So assert the stub does not mention `strict` AT ALL — deliberately
    // stronger than banning `false` specifically. This file's whole job is to
    // DELEGATE, so any local mention of `strict` is a lie about where
    // strictness comes from: `true` means it has quietly stopped inheriting,
    // `false` means it inherits and then silently undoes it. Either way the
    // root config stops being the single answer to "does joust compile
    // strict?". Raw text, so even the word inside a stub comment trips it — a
    // stub small enough to need no comments is the point.
    //
    // Inherited verbatim from battlezone/red-baron/centipede (Task 10 review
    // round), which addressed this shape forward to centipede and joust by name.
    expect(
      read('tsconfig.json'),
      'the plugin tsconfig is a stub that must INHERIT strict from the monorepo root — ' +
        'it must not mention "strict" itself, in either direction: `true` means it stopped ' +
        'inheriting, `false` means it silently overrides the root the chain-walk above ' +
        'would then step straight past',
    ).not.toMatch(/"strict"/)
  })

  it('type-checks both src and tests (the plugin stub must not narrow its own coverage)', () => {
    // Pre-migration rationale: "`build` runs `tsc --noEmit` — if tests/ were
    // outside `include`, a broken test file would still ship a green build."
    // That per-plugin build is gone with the scripts, but the assertion is NOT
    // false by design and is deliberately KEPT: the stub still declares its own
    // `include`, and that is what `tsc -p plugins/joust` and every editor's
    // language server read. A stub that quietly dropped "tests" would leave the
    // suite untypechecked in-editor while the root's `include: ["plugins"]`
    // masked it in CI — a silent narrowing, which is exactly what this guards.
    const cfg = read('tsconfig.json')
    expect(cfg).toMatch(/"include":[^\]]*"src"/)
    expect(cfg).toMatch(/"include":[^\]]*"tests"/)
  })
})

describe('scaffold — index.html boots a canvas via src/main.ts', () => {
  it('index.html exists', () => {
    expect(existsSync(path('index.html')), 'joust/index.html must exist').toBe(true)
  })

  it('loads the src/main.ts module and hosts a <canvas>', () => {
    const html = read('index.html')
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
    expect(html).toMatch(/<canvas/i)
  })
})

describe('scaffold — src/core + src/shell skeletons (the boundary the epic lives on)', () => {
  // The purity CONTENT rules (what core may not reference) live in
  // tests/purity.test.ts; this block only pins the skeleton STRUCTURE.

  it('src/main.ts exists (the shell entry point)', () => {
    expect(existsSync(path('src/main.ts')), 'joust/src/main.ts must exist').toBe(true)
  })

  it('src/core/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/core')), 'joust/src/core/ must exist').toBe(true)
    const files = readdirSync(path('src/core')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/core/ must hold at least one .ts module').toBeGreaterThan(0)
  })

  it('src/shell/ exists and holds at least one TypeScript module', () => {
    expect(existsSync(path('src/shell')), 'joust/src/shell/ must exist').toBe(true)
    const files = readdirSync(path('src/shell')).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/shell/ must hold at least one .ts module').toBeGreaterThan(0)
  })
})
