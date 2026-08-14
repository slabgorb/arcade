// tests/audit/load-claims-hardening.test.ts
//
// Story df1-6 — RED phase (Tyr One-Handed / TEA). Harden the claims-JSON load
// path. `loadClaims()` in dossier-sweep.ts currently does, for every claims/*.json:
//
//     JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[]
//
// Two defects on that one line, both fixed by one edit on the same load path:
//   (1) NO try/catch  → a malformed file throws a RAW SyntaxError naming NO file
//       (e.g. "Unexpected token h in JSON at position 2"), so the operator cannot
//       tell WHICH of N claims files is broken. Filed from df1-1 review (rule-
//       checker R3, inherited from millipede).
//   (2) NO runtime shape check → the `as Claim | Claim[]` cast is a compile-time
//       lie: a well-formed-JSON-WRONG-shape file (an object that is not a Claim,
//       or a claim entry missing source.file/line/verbatim) flows into the sweep
//       unchecked. Routed from df1-2 review (round-1 [TYPE] finding).
//
// SEAM (GREEN contract): loadClaims gains an OPTIONAL directory argument
// —  loadClaims(dir = claimsDir)  — mirroring the codebase's existing injectable
// checker seam checkClaims(claims, { vendoredRoot }). That lets these tests point
// it at a temp dir holding a deliberately-broken file. The cast below expresses
// that intended 1-arg API so this suite COMPILES against the current 0-arg
// signature (tsc stays green) and fails ONLY on behavior — a clean RED.
//
// FOUR GAMES: this file is replicated verbatim (import path aside) in defender,
// millipede, centipede and pac-man — all four carry the byte-identical loadClaims.
// (SM scope-widening ruling, user-approved 2026-08-14: pac-man folded in.)

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadClaims } from './dossier-sweep'

// The intended GREEN signature: an optional claims directory. Expressed as a cast
// so RED compiles against today's `(): Claim[]` and only the behavior is red.
const load = loadClaims as unknown as (dir?: string) => unknown[]

/** Build a throwaway claims dir holding the given {filename: contents} files. */
function withClaimsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'df1-6-claims-'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  return dir
}

const GOOD_CLAIM = { id: 'a', claim: 'a fact', source: { file: 'X.SRC', line: 1, verbatim: 'v' } }

describe('loadClaims hardening (df1-6) — pac-man', () => {
  it('rejects a malformed claims/*.json with an error that NAMES the offending file', () => {
    const dir = withClaimsDir({ 'good.json': JSON.stringify([GOOD_CLAIM]), 'broken.json': '{ this is not json' })
    try {
      expect(() => load(dir)).toThrow(/broken\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the malformed-file error message is controlled (names the file), not a bare SyntaxError', () => {
    const dir = withClaimsDir({ 'broken.json': 'not json at all' })
    try {
      let msg: string | undefined
      try {
        load(dir)
      } catch (e) {
        msg = (e as Error).message
      }
      expect(msg, 'loadClaims should have thrown on malformed JSON').toBeDefined()
      expect(msg).toContain('broken.json')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a well-formed JSON of the WRONG shape (an object that is not a Claim), naming the file', () => {
    const dir = withClaimsDir({ 'wrong-shape.json': JSON.stringify({ not: 'a claim or an array' }) })
    try {
      expect(() => load(dir)).toThrow(/wrong-shape\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a claim entry missing source.file/line/verbatim, naming the file', () => {
    const dir = withClaimsDir({ 'bad-entry.json': JSON.stringify([{ id: 'x', claim: 'no source here' }]) })
    try {
      expect(() => load(dir)).toThrow(/bad-entry\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('still loads a well-formed, correctly-shaped claims file (no false positive)', () => {
    const dir = withClaimsDir({ 'good.json': JSON.stringify([GOOD_CLAIM]) })
    try {
      const out = load(dir)
      expect(Array.isArray(out)).toBe(true)
      expect(out).toHaveLength(1)
      expect((out[0] as { id: string }).id).toBe('a')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
