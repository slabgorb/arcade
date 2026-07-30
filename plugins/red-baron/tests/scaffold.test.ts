// tests/scaffold.test.ts
//
// Red Baron-internal scaffold contract (rb1-1). These tests pin the invariants
// the epic's toolchain ruling names for Red Baron's own tree: TypeScript strict,
// a black-canvas index.html booting src/main.ts, and — the twist that makes this
// game different from its siblings — the SHARED LIBRARY consumed rather than
// re-ported. Unlike battlezone/star-wars (which each ported a local math3d.ts),
// Red Baron was the first arcade game built as a native shared consumer, so
// instead of a "local math3d provenance" check this suite proves the dependency
// pipe end to end: a live `import('@shared/math3d')` resolves to the real Math
// Box under vitest.
//
// MONOREPO MIGRATION — this file lost two whole describes and one assertion, and
// one further assertion was narrowed. All of it is false BY DESIGN once red-baron
// became `plugins/red-baron` in the arcade monorepo. What went, and why:
//
//   * `scaffold — vite.config.ts (pinned port 5277, base /)` (7 assertions).
//     red-baron has no vite.config.ts any more; the root owns the dev server, the
//     build and the port. The invariants themselves are NOT retired — the
//     host/`strictPort` pin is restored at the root and asserted ONCE, for the
//     whole cabinet, in the orchestrator suite. Do not re-create them here.
//   * `scaffold — package.json scripts (verbatim from the sibling games)` (7
//     assertions). The per-plugin package.json is a three-field stub
//     (name/version/private) with no scripts and no devDependencies: the root
//     owns the toolchain, so `npm run dev|build|preview|test|lint` inside a
//     plugin is deliberately gone.
//   * `pins @arcade/shared as a git-URL dependency carrying SOME explicit ref`
//     (1 assertion, from the shared-consumer describe). There is no git-URL pin
//     any more — the shared library is in-repo at src/shared, reached through the
//     `@shared` alias. Flagged prominently rather than folded in silently,
//     because it is the one deletion here that removes a real historical guard:
//     the whole point of red-baron being the FIRST native shared consumer was
//     that its dependency arrived over a pinned pipe. That pipe is now a path
//     alias, so there is nothing left to pin.
//   * `resolves an @arcade/shared new enough to carry /synth (SH2-18)` kept its
//     name-bearing half and lost its version half. The version half read
//     `node_modules/@arcade/shared/package.json` and demanded >= 0.14.0 to catch
//     THE STALE-LOCKFILE TRAP (editing the `#ref` and running a bare
//     `npm install` keeps the old commit). There is no installed package, no
//     lockfile and no ref, so the trap it guarded cannot occur. What survives —
//     that `/synth` really resolves and really exports `createSynthEngine` — is
//     rewritten onto `@shared/synth` and still asserted below.
//
// What SURVIVED is rewritten, not deleted: the tsconfig strict guard now follows
// the `extends` chain (the stub carries only `extends` + `include`, so a raw-text
// match on this file alone would find nothing while strictness is fully intact),
// and the shared-consumer assertions moved from the `@arcade/shared` specifier to
// `@shared`. Reaching up to the root config is deliberate and is the one place
// this file is no longer standalone-clone-pure — the plugin is not a repo now.
//
// The cross-repo wiring invariants (repos.yaml, justfile, cloudflared) live in
// the orchestrator suite: tests/red-baron-bootstrap.test.mjs.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/scaffold.test.ts → the plugin root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = (rel: string): string => join(root, rel)
const read = (rel: string): string => readFileSync(path(rel), 'utf8')

describe('scaffold — tsconfig.json (TypeScript strict, via the monorepo root config)', () => {
  it('tsconfig.json exists', () => {
    expect(existsSync(path('tsconfig.json')), 'plugins/red-baron/tsconfig.json must exist').toBe(
      true,
    )
  })

  it('enables strict mode, following the `extends` chain to whichever config sets it', () => {
    // Pre-migration this read red-baron's OWN tsconfig text for `"strict": true`.
    // The plugin stub carries only `extends` + `include`, so that text match would
    // now fail while strictness is entirely intact one level up. The INVARIANT is
    // unchanged — red-baron must compile under `strict` — so walk the chain
    // instead of dropping the guard. tsconfig may carry comments/trailing commas,
    // so this stays a raw-text assertion rather than JSON.parse.
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

    // NOT `expect(text).toMatch(/"strict":\s*true/)` — the loop can only exit
    // once that regex has already matched, so re-asserting it is a guard that
    // cannot fail.
    //
    // What IS unguarded after the walk is the stub's own text, and the hole is
    // bigger than it looks. The loop searches for `"strict": true`. A stub
    // carrying `"strict": FALSE` does not match it, so the walk simply steps
    // over the override, finds `true` at the monorepo root, and passes — while
    // the effective setting for this plugin is `false`. The pre-migration
    // assertion read the game's own file raw and had no such hole; walking the
    // chain reintroduced it.
    //
    // So assert the stub does not mention `strict` AT ALL. That is deliberately
    // stronger than banning `false` specifically: this file's entire job is to
    // DELEGATE, so any local mention of `strict` is a lie about where strictness
    // comes from — `true` means it has quietly stopped inheriting, `false` means
    // it is inheriting and then silently undoing it, and either way the root
    // config is no longer the single answer to "does red-baron compile strict?".
    // It is a raw-text check (the file may carry comments/trailing commas), so
    // even the string "strict" inside a stub comment trips it. That is intended:
    // a stub small enough to need no comments is the point.
    //
    // This REPLACES an earlier `expect(visited.length).toBeGreaterThan(0)`.
    // Keeping both would have been the very defect this guard exists to prevent:
    // once the stub provably contains no `"strict"` at all, the loop must have
    // iterated at least once, so `visited.length > 0` could no longer fail. It
    // was subsumed, not weakened — the assertion below fails on strictly more.
    expect(
      read('tsconfig.json'),
      'the plugin tsconfig is a stub that must INHERIT strict from the monorepo root — ' +
        'it must not mention "strict" itself, in either direction: `true` means it stopped ' +
        'inheriting, `false` means it silently overrides the root the chain-walk above ' +
        'would then step straight past',
    ).not.toMatch(/"strict"/)
  })
})

describe('scaffold — index.html boots a canvas via src/main.ts', () => {
  it('index.html exists', () => {
    expect(existsSync(path('index.html')), 'red-baron/index.html must exist').toBe(true)
  })

  it('loads the src/main.ts module and hosts a <canvas>', () => {
    const html = read('index.html')
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
    expect(html).toMatch(/<canvas/i)
  })
})

describe('scaffold — native shared-library consumer (proves the dependency pipe)', () => {
  // Red Baron does NOT port math3d like the older games. It consumes the extracted
  // Math Box from the shared library. The consumption ROUTE changed with the
  // monorepo collapse (a pinned git-URL dep → the in-repo `@shared` alias); WHAT is
  // consumed, and that no local copy came back, did not.

  it('does NOT keep a local src/core/math3d.ts (the Math Box lives in @shared/math3d)', () => {
    expect(
      existsSync(path('src/core/math3d.ts')),
      'red-baron must NOT port a local math3d.ts — it consumes @shared/math3d (design brief §3)',
    ).toBe(false)
  })

  it('resolves @shared/synth with the engine red-baron imports (SH2-18)', async () => {
    // SH2-18 made red-baron the DONOR of the synth skeleton and then a consumer of
    // it. The version half of this assertion guarded a stale lockfile and is gone
    // with the lockfile (see the migration note above); the half that proves the
    // module red-baron's audio actually imports really resolves, and really carries
    // the export it destructures, is the part with lasting teeth.
    const synth = await import('@shared/synth')
    expect(typeof synth.createSynthEngine, '@shared/synth must export createSynthEngine').toBe(
      'function',
    )
    expect(typeof synth.noiseBuffer, '@shared/synth must export noiseBuffer').toBe('function')
  })

  it('resolves @shared/math3d to the real Math Box at runtime', async () => {
    // The load-bearing proof: if the alias is unwired this import rejects (RED).
    // With it wired, the real module resolves and its core identities hold — this
    // is the whole point of rb1-1.
    const m3d = await import('@shared/math3d')
    expect(Array.isArray(m3d.IDENTITY), '@shared/math3d must export IDENTITY').toBe(true)
    expect(m3d.IDENTITY.length, 'IDENTITY is a length-16 row-major mat4').toBe(16)
    // Normalise signed zero (rotationY(0) yields -0 from -sin(0)) so the mat4
    // identity comparison is mathematical, not bitwise: -0 and +0 are equal reals.
    const noNegZero = (m: readonly number[]): number[] => m.map((v: number) => v + 0)
    // multiply(IDENTITY, IDENTITY) === IDENTITY, and rotationY(0) === IDENTITY.
    expect(noNegZero(m3d.multiply(m3d.IDENTITY, m3d.IDENTITY))).toEqual([...m3d.IDENTITY])
    expect(noNegZero(m3d.rotationY(0))).toEqual([...m3d.IDENTITY])
    // Non-trivial operand so this discriminates the REAL Math Box from an
    // identity-shaped stub: I · T(1,2,3) must equal T(1,2,3), not IDENTITY.
    const t = m3d.translation(1, 2, 3)
    expect(noNegZero(m3d.multiply(m3d.IDENTITY, t))).toEqual([...t])
  })
})
