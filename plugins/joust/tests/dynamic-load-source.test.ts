// tests/dynamic-load-source.test.ts
//
// Story jt9-31 (folds jt9-33) — RED phase (Tyr One-Handed / TEA). The joust test
// suite's dynamic-import helper swallows EVERY import failure:
//
//     const load = async <T>(parts) => {
//       try { return (await import(parts.join('/'))) as Partial<T> }
//       catch { return {} }            // <- the private `load` in audio-transporter-split.test.ts
//     }
//
// The bare catch cannot tell "this module is legitimately absent" from "this
// module threw while EVALUATING"; both arrive as {} and every downstream field
// read yields undefined. jt9-5 added throws that fire at MODULE IMPORT time, so a
// real bad row now makes a whole file fail to collect and vitest reports (0 test)
// — a zero that reads exactly like a passing sweep. The jt9-5 Reviewer measured
// the blast radius: 53 test failures, ZERO carrying the real message; every one
// reported a misleading "must export" line. A confident wrong answer is worse
// than a silent one.
//
// ─── WHY THIS FORCES AN EXTRACTION ───────────────────────────────────────────
// A guard nobody can watch fail is not a guard. `load` is a private const in the
// test file, unreachable from any test — the same swallow is copied into 8 joust
// test files today (see the Delivery Finding). GREEN extracts it to the shared
// helper `tests/helpers/dynamic-load.ts` (the claims.ts precedent: one loader,
// imported not copied) and rewires audio-transporter-split.test.ts onto it. The
// contract this suite pins:
//
//     export async function load<T>(baseUrl: string, parts: string[]): Promise<Partial<T>>
//       · module-not-found            → resolves to {}   (the legit-absence path,
//                                        which real callers depend on — Partial<T>)
//       · module throws at eval time  → REJECTS with the original error, never {}
//
// This suite drives the helper with data:/absent specifiers, so it is independent
// of how Dev resolves the real callers' extensionless relative specifiers.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// RED: this module does not exist yet. GREEN creates it from the local `load`.
import { load } from './helpers/dynamic-load'

const dataModule = (body: string): string => 'data:text/javascript,' + encodeURIComponent(body)

describe('jt9-31 — load() must NOT swallow an eval-time throw', () => {
  it('a module that throws while evaluating propagates its error rather than returning {}', async () => {
    const throwing = dataModule('throw new Error("jt9-31 eval boom")')
    await expect(load(import.meta.url, [throwing])).rejects.toThrow('jt9-31 eval boom')
  })

  it('a genuinely-absent module still resolves to {} (the legit-absence path is preserved)', async () => {
    // The control that stops an over-eager fix from breaking real callers, which
    // rely on {} to mean "not implemented yet".
    await expect(load(import.meta.url, ['no-such-jt9-31-module.mjs'])).resolves.toEqual({})
  })

  it('a module that evaluates cleanly resolves with its exports (positive control)', async () => {
    const ok = dataModule('export const answer = 42')
    const mod = await load<{ answer: number }>(import.meta.url, [ok])
    expect(mod.answer).toBe(42)
  })
})

describe('jt9-31 — the named file is rewired onto the shared helper (no local swallow left)', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const named = readFileSync(join(here, 'audio-transporter-split.test.ts'), 'utf8')

  it('audio-transporter-split.test.ts imports the shared dynamic-load helper', () => {
    expect(named, 'the swallow must be replaced by the shared helper, not re-copied').toMatch(
      /helpers\/dynamic-load/,
    )
  })

  it('its private swallowing `load` const is gone', () => {
    // The exact local definition that carried the `catch { return {} }` swallow.
    expect(named, 'the local swallowing load() must be removed, not kept beside the import').not.toMatch(
      /const\s+load\s*=\s*async\s*<T>\(\s*parts/,
    )
  })
})

// jt9-56 — the SIX other genuine swallowers jt9-31's Delivery Finding named
// (`grep -rln "await import" | xargs grep -l "} catch {"`), rewired the same
// way. `purity-scanner.test.ts` — the finding's seventh name — is NOT here: its
// import catch is `catch (e) { throw new Error(...) }` (a legitimate re-throw,
// not a swallow); the grep matched it only because the file separately contains
// an unrelated bare `catch {` in a scanner-parseability test, not an import.
// That is the whole discrepancy against the story's "7" — six genuine
// swallowers remained, not seven.
describe('jt9-56 — the six sibling swallowers are rewired onto the shared helper too', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const rewired = [
    'audio-decision-block-families.test.ts',
    'audio-dispatch.test.ts',
    'audio-manifest.test.ts',
    'audio-rom-citations.test.ts',
    'audio-seam-scope.test.ts',
    'audio-events.test.ts',
  ]

  it.each(rewired)('%s imports the shared dynamic-load helper', (file) => {
    const source = readFileSync(join(here, file), 'utf8')
    expect(source, 'the swallow must be replaced by the shared helper, not re-copied').toMatch(
      /helpers\/dynamic-load/,
    )
  })

  it.each(rewired)('%s has no private swallowing `load` const left', (file) => {
    const source = readFileSync(join(here, file), 'utf8')
    // The exact local definition that carried the `catch { return {} }` swallow
    // (or, for audio-events.test.ts, the caching variant's `catch { cached = {} }`).
    expect(source, 'the local swallowing load() must be removed, not kept beside the import').not.toMatch(
      /const\s+load\s*=\s*async\s*<T>\(\s*parts/,
    )
    expect(source, 'the caching swallow variant must be gone too').not.toMatch(/catch\s*\{\s*cached\s*=\s*\{\}/)
  })

  it('purity-scanner.test.ts is NOT migrated — its import catch re-throws, it never swallowed', () => {
    const source = readFileSync(join(here, 'purity-scanner.test.ts'), 'utf8')
    // loadScanner()'s catch (e) re-throws a descriptive Error; it is not the
    // jt9-31 swallow idiom, so jt9-56 correctly leaves it alone.
    expect(source).toMatch(/catch \(e\) \{\s*\n\s*throw new Error\(/)
  })
})
