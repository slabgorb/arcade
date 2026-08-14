// tests/audit/claims-tests-use-real-claim.test.ts
//
// Story ml5-6 — RED phase (Leeloo / TEA). CONVENTION debt surfaced by the ml5-2
// Reviewer (typescript lang-review #10 "no `as T` on JSON.parse without runtime
// validation" and #18 "one concept must not grow two helpers"):
//
// Every millipede claims-ARM test re-declares its OWN narrower `interface Claim`
//   interface Claim { id; claim; source: { file; line; verbatim } }
// and then casts through it with NO runtime check, in TWO different ways:
//   (loadClaims() as Claim[])                      — a NARROWING lie: loadClaims()
//        already returns the real union `Claim` ({file,line,verbatim} | {file,offset,
//        bytes}); the cast silently re-narrows it to the text shape.
//   JSON.parse(readFileSync(NEW_CLAIMS,'utf8')) as Claim[]   — an UNCHECKED parse:
//        a well-formed-JSON-wrong-shape file flows straight in, the exact defect
//        df1-6 already closed for loadClaims() (load-claims-hardening.test.ts).
//
// This story converges the four named claims tests onto:
//   (1) the REAL `Claim` type (no local narrower re-declaration), and
//   (2) ONE shared runtime-checked parse helper, `loadClaimsFile`, exported from
//       dossier-sweep.ts — the single-file sibling of loadClaims(), sharing its
//       df1-6 hardening (try/catch names the file; isValidClaimSource gates the
//       shape).
//
// SCOPE (per the SM assessment): high-scores / palette / waves-scoring /
// bonus-select ONLY. mushroom-claims, hud-claims and citations also re-declare
// `Claim` locally but are OUT of this story's named scope.
//
// ── Why these guards have teeth ──────────────────────────────────────────────
// The convention block is a SOURCE-TEXT sweep (lang-review #15/#25): each pattern
// is present in the target files TODAY, so every assertion is RED on arrival —
// deleting the debt is the only way to green it. The negative guards are absence
// checks over the whole file (safe per #25); the positive guard is anchored to an
// `import { … loadClaimsFile … } from './dossier-sweep'` statement, not a bare
// token, so a mention in a comment cannot satisfy it. The behaviour block proves
// the shared helper actually VALIDATES (mirrors load-claims-hardening for the
// single-file entry point) rather than merely existing.
//
// NOTE FOR GREEN (the real work, and why this is 2pt not 1): swapping the local
// text-only `Claim` for the real UNION type breaks every `c.source.verbatim` /
// `c.source.line` access in the four files with TS2339 (those fields live only on
// the text branch). loadClaimsFile returns the real `Claim[]`; narrow to the text
// shape at the read sites (dossier-sweep already uses the `'line' in src` idiom in
// claimCovers) — do NOT re-introduce a local interface or an `as` cast to dodge it.

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
// The shared single-file parse helper this story must ADD to dossier-sweep.ts.
// Undefined until GREEN — the behaviour block below throws (RED) until it exists.
import { loadClaimsFile } from './dossier-sweep'

const auditDir = join(fileURLToPath(new URL('.', import.meta.url)))

/** The four claims-arm tests this story sweeps onto the real Claim + shared helper. */
const TARGETS = [
  'high-scores-claims.test.ts',
  'palette-claims.test.ts',
  'waves-scoring-claims.test.ts',
  'bonus-select-claims.test.ts',
] as const

const srcOf = (name: string): string => readFileSync(join(auditDir, name), 'utf8')

describe('ml5-6 — the four claims-arm tests use the real Claim + one shared parse helper', () => {
  for (const name of TARGETS) {
    describe(name, () => {
      it('declares NO local `interface Claim` (imports the real type instead)', () => {
        // AC: the narrower local re-declaration is deleted. Present today at
        // high-scores:34 / palette:40 / waves-scoring:29 / bonus-select:32.
        expect(srcOf(name)).not.toMatch(/\binterface\s+Claim\b/)
      })

      it('performs NO unchecked `as Claim[]` cast (routes through the checked helper)', () => {
        // AC: covers BOTH the `(loadClaims() as Claim[])` narrowing lie and the two
        // `JSON.parse(...) as Claim[]` unchecked parses in each file.
        expect(srcOf(name)).not.toMatch(/\bas\s+Claim\[\]/)
      })

      it('does NOT hand-roll `JSON.parse(readFileSync(NEW_CLAIMS…))` (uses loadClaimsFile)', () => {
        // AC: the raw single-file parse is replaced by the shared runtime-checked
        // helper. The `[^)]` window keeps this to a genuine parse-of-NEW_CLAIMS.
        expect(srcOf(name)).not.toMatch(/JSON\.parse\s*\(\s*readFileSync\s*\([^)]*NEW_CLAIMS/)
      })

      it('imports `loadClaimsFile` from the shared dossier-sweep module', () => {
        // Positive anchor bound to an import STATEMENT from './dossier-sweep', so a
        // comment mention cannot satisfy it (lang-review #15).
        expect(srcOf(name)).toMatch(
          /import\s*\{[^}]*\bloadClaimsFile\b[^}]*\}\s*from\s*['"]\.\/dossier-sweep['"]/,
        )
      })
    })
  }
})

// ── Shared helper behaviour: loadClaimsFile parses ONE claims file WITH the df1-6
// runtime shape check, so no caller needs an `as Claim[]` cast again. ───────────
describe('ml5-6 — loadClaimsFile(path) validates a single claims JSON file', () => {
  const GOOD_CLAIM = { id: 'a', claim: 'a fact', source: { file: 'X.SRC', line: 1, verbatim: 'v' } }
  // millipede's isValidClaimSource ORs the BYTE shape; the helper must accept it too.
  const GOOD_BYTE_CLAIM = { id: 'b', claim: 'a byte fact', source: { file: 'X.bin', offset: 0, bytes: [0, 255] } }

  /** Write one throwaway file and return its absolute path + a cleanup thunk. */
  function withFile(name: string, body: string): { path: string; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'ml5-6-'))
    const path = join(dir, name)
    writeFileSync(path, body)
    return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
  }

  it('loads a well-formed TEXT-shaped claims file (returns the real Claim[])', () => {
    const { path, cleanup } = withFile('good.json', JSON.stringify([GOOD_CLAIM]))
    try {
      const out = loadClaimsFile(path)
      expect(Array.isArray(out)).toBe(true)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    } finally {
      cleanup()
    }
  })

  it('accepts a BYTE-shaped source claim (offset/bytes), not only text', () => {
    const { path, cleanup } = withFile('bytes.json', JSON.stringify([GOOD_BYTE_CLAIM]))
    try {
      const out = loadClaimsFile(path)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('b')
    } finally {
      cleanup()
    }
  })

  it('loads a single Claim OBJECT (not an array) as a one-element list', () => {
    const { path, cleanup } = withFile('single.json', JSON.stringify(GOOD_CLAIM))
    try {
      const out = loadClaimsFile(path)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    } finally {
      cleanup()
    }
  })

  it('rejects malformed JSON with a controlled error that NAMES the file', () => {
    const { path, cleanup } = withFile('broken.json', '{ this is not json')
    try {
      let msg: string | undefined
      try {
        loadClaimsFile(path)
      } catch (e) {
        msg = e instanceof Error ? e.message : String(e)
      }
      expect(msg, 'loadClaimsFile should have thrown on malformed JSON').toBeDefined()
      expect(msg).toContain('broken.json')
      // A bare SyntaxError ("Unexpected token …") names no file; the rethrow must.
      expect(msg).not.toMatch(/^Unexpected token/)
    } finally {
      cleanup()
    }
  })

  it('rejects a well-formed JSON of the WRONG shape (no source), naming the file', () => {
    const { path, cleanup } = withFile('wrong-shape.json', JSON.stringify([{ id: 'x', claim: 'no source' }]))
    try {
      expect(() => loadClaimsFile(path)).toThrow(/wrong-shape\.json/)
    } finally {
      cleanup()
    }
  })

  it('rejects a source PRESENT but missing a required field (verbatim), naming the file', () => {
    const { path, cleanup } = withFile(
      'partial.json',
      JSON.stringify([{ id: 'x', claim: 'c', source: { file: 'X.SRC', line: 1 } }]),
    )
    try {
      expect(() => loadClaimsFile(path)).toThrow(/partial\.json/)
    } finally {
      cleanup()
    }
  })
})
