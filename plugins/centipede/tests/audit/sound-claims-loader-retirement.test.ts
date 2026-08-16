// tests/audit/sound-claims-loader-retirement.test.ts
//
// Story df1-10 — RED phase (Leeloo / TEA). Retire centipede's last residue of the
// unhardened claims loader — the centipede analog of df1-8 (joust). `sound-dossier.test.ts`
// carries its OWN private inline copy inside `loadSoundClaims`:
//
//     function loadSoundClaims(): Claim[] {
//       if (!existsSync(soundClaimsPath)) { ...cp6-1 not delivered... }
//       const parsed = JSON.parse(readFileSync(soundClaimsPath, 'utf8')) as Claim | Claim[]
//       return ([] as Claim[]).concat(parsed)
//     }
//
// That is a byte-for-byte lift of the pattern df1-6 hardened in centipede's
// dossier-sweep `loadClaims`, with the same two defects on the same line:
//   (1) a bare JSON.parse → a SYNTACTICALLY broken 16-sound.json throws a raw
//       SyntaxError that NAMES NO FILE;
//   (2) the `as Claim | Claim[]` cast is a compile-time lie — a well-formed-JSON,
//       WRONG-SHAPE 16-sound.json flows into the AC-2 sweep unchecked.
//
// ─── THE CENTIPEDE WRINKLE df1-8 DID NOT HAVE (READ THIS) ─────────────────────
// joust's df1-8 was a clean swap: its inline `loadClaims` read the WHOLE claims/
// dir, so adopting the shared WHOLE-DIR `loadClaims` changed nothing but the teeth.
// centipede is NOT that shape. `loadSoundClaims` reads exactly ONE file
// (16-sound.json), and its four callers depend on that:
//   - the "SOUNDS routine and six tables cannot reduce to zero" test in sound-dossier.test.ts
//     is a floor on the SOUND file. Point it at the whole dir and it passes even if
//     16-sound.json is deleted — a vacuous green.
//   - the two-decimal-20s test filters claims by source LINE alone (no file);
//     broadening to the whole dir invites a cross-file line collision.
// So the honest fix is NOT "call loadClaims()". It is: keep SINGLE-FILE loading, but
// route the parse through ONE hardened implementation. GREEN therefore EXTRACTS the
// per-file hardened parse out of `loadClaims`'s flatMap into an exported
// `loadClaimsFile(file: string): Claim[]` (try/catch naming basename(file),
// `isValidClaimSource` shape-check, `Claim | Claim[]` normalised) and refactors
// `loadClaims` to map its dir entries through it — behaviour identical, so df1-6's
// load-claims-hardening.test.ts stays green. `loadSoundClaims` then keeps its
// existsSync "cp6-1 not delivered" guard and delegates the parse to
// `loadClaimsFile(soundClaimsPath)`. One implementation, two callers.
//
// ─── WHY THE GUARD PARSES, IT DOES NOT GREP ──────────────────────────────────
// A flat-text search for `as Claim | Claim[]` is defeated the instant someone
// comments the old copy out, and a mention of `loadClaimsFile` in a comment must NOT
// read as adoption. PART 1 walks the TypeScript AST: a live AsExpression, a real
// static ImportDeclaration, a live CallExpression — never a comment or a string.
// PART 3 pins that the teeth cannot be faked or over-fire.
//
// ─── SCHEMA (centipede is TEXT-ONLY) ─────────────────────────────────────────
// centipede's isValidClaimSource REQUIRES a {file, line, verbatim} citation on every
// claim (check-citations.mjs isCitation) — it carries no byte/nibble claims. So a
// source-less claim is REJECTED here (unlike joust, whose asClaim treats an absent
// source as legal). PART 2 pins that rejection.

import { describe, it, expect } from 'vitest'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import ts from 'typescript'
// GREEN added `loadClaimsFile` to dossier-sweep.ts; before that this named binding was
// undefined and PART 2 red on "loadClaimsFile is not a function".
import { loadClaims, loadClaimsFile, romStudyDir } from './dossier-sweep'
import type { Claim } from '../../tools/audit/check-citations.mjs'

const auditDir = dirname(fileURLToPath(import.meta.url))
const soundDossierFile = join(auditDir, 'sound-dossier.test.ts')
const soundClaimsPath = join(romStudyDir, 'claims', '16-sound.json')

// ─────────────────────────────────────────────────────────────────────────────
// AST helpers — LIVE code only. A comment, a string literal, or an import binding
// is not the node kind these look for, so none of them can satisfy or defeat a check.
// ─────────────────────────────────────────────────────────────────────────────

/** The normalised type text of every live `x as <T>` expression in `source`. A
 *  commented-out cast is not an AsExpression node, so it is invisible here. */
function liveAsCasts(source: string, filename = 'module.ts'): string[] {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const casts: string[] = []
  const walk = (node: ts.Node): void => {
    if (ts.isAsExpression(node)) casts.push(node.type.getText(sf).replace(/\s+/g, ' ').trim())
    node.forEachChild(walk)
  }
  walk(sf)
  return casts
}

/** True iff `source` has a live `import { …, name, … } from '<spec>'` where the
 *  module specifier text contains `specifierIncludes`. Comments and string literals
 *  are not ImportDeclaration nodes, so they cannot fake it. */
function importsNamedFrom(source: string, name: string, specifierIncludes: string, filename = 'module.ts'): boolean {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  let found = false
  const walk = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.includes(specifierIncludes)
    ) {
      const bindings = node.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some((el) => el.name.text === name)) found = true
    }
    node.forEachChild(walk)
  }
  walk(sf)
  return found
}

/** True iff `source` has a live `callee(...)` CallExpression whose callee is the bare
 *  identifier `callee`. A mention in a comment or a string is not a CallExpression. */
function callsCallee(source: string, callee: string, filename = 'module.ts'): boolean {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  let found = false
  const walk = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === callee) found = true
    node.forEachChild(walk)
  }
  walk(sf)
  return found
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — RETIREMENT + ADOPTION GUARD (RED until the inline copy is gone)
// ═════════════════════════════════════════════════════════════════════════════

describe('df1-10 — sound-dossier.test.ts retires its inline sound-claims parse and adopts the hardened loader', () => {
  const src = readFileSync(soundDossierFile, 'utf8')

  // Anti-vacuity is carried by the adoption checks themselves, not a keyword match:
  // if `loadSoundClaims` vanished entirely (rather than being hardened) the import
  // and call checks below fail loudly — nothing would import or call loadClaimsFile.
  // That is the teeth; `toMatch(/soundClaimsPath/)` would only re-find the const
  // declaration and prove nothing about the loader.

  it('no live `as Claim | Claim[]` cast survives (the unhardened as-cast is gone)', () => {
    // The inline loader is the only site of this exact double-shape cast. Pin its
    // removal as a live AsExpression, not as text (a commented-out copy must not keep
    // this red, nor a mention in prose fake it).
    const casts = liveAsCasts(src, 'sound-dossier.test.ts').filter((t) => t === 'Claim | Claim[]')
    expect(casts, 'the raw `JSON.parse(...) as Claim | Claim[]` cast must be retired').toEqual([])
  })

  it('imports loadClaimsFile from ./dossier-sweep (the shared hardened single-file loader)', () => {
    expect(
      importsNamedFrom(src, 'loadClaimsFile', 'dossier-sweep', 'sound-dossier.test.ts'),
      'sound-dossier.test.ts does not import loadClaimsFile from ./dossier-sweep — the ' +
        'hardened single-file parse (df1-6 lineage) was never adopted',
    ).toBe(true)
  })

  it('calls loadClaimsFile at a live call site (adoption is used, not merely imported)', () => {
    expect(
      callsCallee(src, 'loadClaimsFile', 'sound-dossier.test.ts'),
      'loadClaimsFile is imported but never called — loadSoundClaims must delegate its ' +
        'parse to it instead of the inline JSON.parse',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — THE ADOPTED loadClaimsFile SHAPE-CHECKS (behavioral; self-contained)
// ═════════════════════════════════════════════════════════════════════════════
//
// These anchor what the inline copy did NOT do: name the file on a bad SHAPE or bad
// JSON. loadClaimsFile takes ONE file path (the centipede wrinkle — see the header),
// so unlike df1-6's dir-based loadClaims it is exercised with a single temp file.

/** Write one throwaway claims file and hand back its path. */
function withClaimsFile(name: string, body: string): { path: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'df1-10-'))
  const path = join(dir, name)
  writeFileSync(path, body)
  return { path, dir }
}

const GOOD_CLAIM = { id: 'a', claim: 'a fact', source: { file: 'X.SRC', line: 1, verbatim: 'v' } }

describe('df1-10 — loadClaimsFile hardens a SINGLE file (names the file on bad JSON / bad shape)', () => {
  it('rejects a syntactically broken file with a CONTROLLED error that NAMES it (not a bare SyntaxError)', () => {
    const { path, dir } = withClaimsFile('broken.json', '{ this is not json')
    try {
      let msg: string | undefined
      try {
        loadClaimsFile(path)
      } catch (e) {
        msg = e instanceof Error ? e.message : String(e)
      }
      expect(msg, 'loadClaimsFile should have thrown on malformed JSON').toBeDefined()
      expect(msg).toContain('broken.json')
      expect(msg).not.toMatch(/^Unexpected token/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a well-formed JSON of the WRONG shape (not a Claim), naming the file', () => {
    const { path, dir } = withClaimsFile('wrong-shape.json', JSON.stringify({ not: 'a claim' }))
    try {
      expect(() => loadClaimsFile(path)).toThrow(/wrong-shape\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a claim with NO source (centipede is TEXT-ONLY — a source is required), naming the file', () => {
    const { path, dir } = withClaimsFile('no-source.json', JSON.stringify([{ id: 'x', claim: 'no source' }]))
    try {
      expect(() => loadClaimsFile(path)).toThrow(/no-source\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a source PRESENT but missing verbatim (partial citation), naming the file', () => {
    // Guards against a weakened isCitation clause: {file, line} with no verbatim is
    // not a valid text citation.
    const { path, dir } = withClaimsFile('partial-source.json', JSON.stringify([{ id: 'x', claim: 'c', source: { file: 'X.SRC', line: 1 } }]))
    try {
      expect(() => loadClaimsFile(path)).toThrow(/partial-source\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('loads a well-formed TEXT-shaped claims array (no false positive)', () => {
    const { path, dir } = withClaimsFile('good.json', JSON.stringify([GOOD_CLAIM]))
    try {
      const out = loadClaimsFile(path)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('normalises a single Claim OBJECT (not an array) to one claim', () => {
    const { path, dir } = withClaimsFile('single.json', JSON.stringify(GOOD_CLAIM))
    try {
      expect(loadClaimsFile(path)).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 2b — SINGLE-FILE SEMANTICS PRESERVED (the regression the wrinkle warns about)
// ═════════════════════════════════════════════════════════════════════════════

describe('df1-10 — the sound loader stays SINGLE-FILE (it did not broaden to the whole dir)', () => {
  it('loadClaimsFile(16-sound.json) is a NON-EMPTY strict subset of the whole-dir loadClaims()', () => {
    const sound = loadClaimsFile(soundClaimsPath)
    const all = loadClaims()
    expect(sound.length, 'the SOUNDS routine and six tables cannot reduce to zero claims').toBeGreaterThan(0)
    expect(
      sound.length,
      'the sound loader returned as many claims as the whole dir — it broadened to loadClaims(), ' +
        'which makes the AC-2 count/line-filter tests vacuous (see the header wrinkle)',
    ).toBeLessThan(all.length)
    const allIds = new Set(all.map((c: Claim) => c.id))
    expect(
      sound.every((c: Claim) => allIds.has(c.id)),
      'every sound claim must also be present in the whole-dir load (16-sound.json lives in claims/)',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 3 — THE GUARD'S OWN TEETH (the AST checks cannot be faked or over-fire)
// ═════════════════════════════════════════════════════════════════════════════

describe('df1-10 guard integrity — liveAsCasts sees a live cast, not a comment or string', () => {
  it('flags a real `x as Claim | Claim[]` cast', () => {
    expect(liveAsCasts('const p = JSON.parse(s) as Claim | Claim[]')).toEqual(['Claim | Claim[]'])
  })
  it('does NOT flag a cast that is commented out or quoted', () => {
    expect(liveAsCasts('// const p = x as Claim | Claim[]')).toEqual([])
    expect(liveAsCasts('const doc = "x as Claim | Claim[] used to be here"')).toEqual([])
  })
})

describe('df1-10 guard integrity — importsNamedFrom reads a live import, not prose', () => {
  it('finds a real named import of loadClaimsFile from dossier-sweep', () => {
    expect(importsNamedFrom("import { loadClaimsFile } from './dossier-sweep'", 'loadClaimsFile', 'dossier-sweep')).toBe(true)
  })
  it('does NOT match a different binding, a different module, or a comment', () => {
    expect(importsNamedFrom("import { loadClaims } from './dossier-sweep'", 'loadClaimsFile', 'dossier-sweep')).toBe(false)
    expect(importsNamedFrom("import { loadClaimsFile } from './somewhere-else'", 'loadClaimsFile', 'dossier-sweep')).toBe(false)
    expect(importsNamedFrom("// import { loadClaimsFile } from './dossier-sweep'", 'loadClaimsFile', 'dossier-sweep')).toBe(false)
  })
})

describe('df1-10 guard integrity — callsCallee sees a live call, not a comment or a different name', () => {
  it('flags a real loadClaimsFile(...) call', () => {
    expect(callsCallee('const x = loadClaimsFile(soundClaimsPath)', 'loadClaimsFile')).toBe(true)
  })
  it('does NOT flag a call in a comment, a string, or a call to a different callee', () => {
    expect(callsCallee('// loadClaimsFile(soundClaimsPath)', 'loadClaimsFile')).toBe(false)
    expect(callsCallee('const s = "loadClaimsFile(x)"', 'loadClaimsFile')).toBe(false)
    expect(callsCallee('const x = loadClaims(dir)', 'loadClaimsFile')).toBe(false)
  })
})
