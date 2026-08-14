// tests/audit/load-claims-hardening.test.ts
//
// Story df1-6 — harden the claims-JSON load path. `loadClaims()` in dossier-sweep.ts
// used to do, for every claims/*.json:
//
//     JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[]
//
// Two defects on that one line, both closed by one edit on the same load path:
//   (1) NO try/catch  → a malformed file threw a RAW SyntaxError naming NO file, so
//       the operator could not tell WHICH of N claims files was broken.
//   (2) NO runtime shape check → the `as Claim | Claim[]` cast was a compile-time
//       lie: a well-formed-JSON-WRONG-shape file (an object that is not a claim, or
//       a claim entry whose `source` is not a citation) flowed into the sweep
//       unchecked.
//
// GREEN gives loadClaims an OPTIONAL directory argument (loadClaims(dir = claimsDir))
// so these tests can point it at a temp dir holding a deliberately-broken file, and
// validates each entry's `source` with isValidClaimSource — composed from the same
// guards checkClaims dispatches on (defender accepts a TEXT {file,line,verbatim} OR
// a BYTE {file,offset,bytes} source).
//
// FOUR GAMES: the shared cases below are replicated across defender, millipede,
// centipede and pac-man; the "accepts a <shape> source" case is game-specific
// (defender/millipede: byte; pac-man: nibble; centipede: text-only, so omitted).
// (SM scope-widening ruling, user-approved 2026-08-14: pac-man folded in.)

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadClaims } from './dossier-sweep'

/** Build a throwaway claims dir holding the given {filename: contents} files. */
function withClaimsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'df1-6-claims-'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  return dir
}

const GOOD_CLAIM = { id: 'a', claim: 'a fact', source: { file: 'X.SRC', line: 1, verbatim: 'v' } }
// A byte-shaped source ({file, offset, bytes}) — defender's isValidClaimSource ORs
// isByteCitation, so this must load exactly like the text shape. Guards R2: a
// regression dropping the byte branch would reject real byte claims and this suite
// would otherwise stay green.
const GOOD_BYTE_CLAIM = { id: 'b', claim: 'a byte fact', source: { file: 'X.bin', offset: 0, bytes: [0, 255] } }

describe('loadClaims hardening (df1-6) — defender', () => {
  it('rejects a malformed claims/*.json with an error that NAMES the offending file', () => {
    const dir = withClaimsDir({ 'good.json': JSON.stringify([GOOD_CLAIM]), 'broken.json': '{ this is not json' })
    try {
      expect(() => loadClaims(dir)).toThrow(/broken\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the malformed-file error message is controlled (names the file), not a bare SyntaxError', () => {
    const dir = withClaimsDir({ 'broken.json': 'not json at all' })
    try {
      let msg: string | undefined
      try {
        loadClaims(dir)
      } catch (e) {
        msg = e instanceof Error ? e.message : String(e)
      }
      expect(msg, 'loadClaims should have thrown on malformed JSON').toBeDefined()
      expect(msg).toContain('broken.json')
      // A bare SyntaxError message ("Unexpected token …") does not mention the file;
      // the controlled rethrow must.
      expect(msg).not.toMatch(/^Unexpected token/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a well-formed JSON of the WRONG shape (an object that is not a Claim), naming the file', () => {
    const dir = withClaimsDir({ 'wrong-shape.json': JSON.stringify({ not: 'a claim or an array' }) })
    try {
      expect(() => loadClaims(dir)).toThrow(/wrong-shape\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a claim entry with NO source at all, naming the file', () => {
    const dir = withClaimsDir({ 'no-source.json': JSON.stringify([{ id: 'x', claim: 'no source here' }]) })
    try {
      expect(() => loadClaims(dir)).toThrow(/no-source\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a claim whose source is PRESENT but missing a required field (verbatim), naming the file', () => {
    // Pins the finer schema, not just "source absent": {file, line} with no verbatim
    // is not a valid text citation (nor a byte one), so it must be rejected. Guards
    // against a weakened isCitation clause (e.g. dropping the verbatim check).
    const dir = withClaimsDir({ 'partial-source.json': JSON.stringify([{ id: 'x', claim: 'c', source: { file: 'X.SRC', line: 1 } }]) })
    try {
      expect(() => loadClaims(dir)).toThrow(/partial-source\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('still loads a well-formed, TEXT-shaped claims file (no false positive)', () => {
    const dir = withClaimsDir({ 'good.json': JSON.stringify([GOOD_CLAIM]) })
    try {
      const out = loadClaims(dir)
      expect(Array.isArray(out)).toBe(true)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('still loads a BYTE-shaped source claim (offset/bytes), not only text', () => {
    const dir = withClaimsDir({ 'bytes.json': JSON.stringify([GOOD_BYTE_CLAIM]) })
    try {
      const out = loadClaims(dir)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('b')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('loads a claims file that is a single Claim OBJECT, not an array', () => {
    // loadClaims normalises `Claim | Claim[]`; the single-object branch is real and
    // must yield exactly that one claim.
    const dir = withClaimsDir({ 'single.json': JSON.stringify(GOOD_CLAIM) })
    try {
      const out = loadClaims(dir)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
