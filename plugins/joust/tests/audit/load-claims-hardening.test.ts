// tests/audit/load-claims-hardening.test.ts
//
// Story df1-8 — RED phase (Tyr One-Handed / TEA). Retire joust's last residue of
// the unhardened claims loader. `citations.test.ts` carries its OWN inline copy of
// loadClaims at :641-647:
//
//     function loadClaims(): Claim[] {
//       ...
//       .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
//       .flat()
//     }
//
// That is a byte-for-byte lift of the pattern df1-6 hardened in defender's
// dossier-sweep loaders, with the same two defects on the same line:
//   (1) a bare JSON.parse → a SYNTACTICALLY broken claims/*.json throws a raw
//       SyntaxError that NAMES NO FILE, so the operator cannot tell which of N files
//       is broken;
//   (2) the `as Claim | Claim[]` cast is a compile-time lie — a well-formed-JSON,
//       WRONG-SHAPE file flows into the AC-2 sweep unchecked.
//
// This story closes defect (2) ONLY. joust already owns the hardened chokepoint:
// `../helpers/claims.ts` exports `asClaim` (shape-checks every entry, error NAMES the
// file) and `loadClaims` built on it — 39 joust source-audit tests already import it
// (jt9-2). `citations.test.ts` is the ONE joust file that never adopted it, a separate
// un-narrowed copy; this story deletes that copy and sources loadClaims from the shared
// helper, exactly as SH3-1 retired joust's inlined mulberry32 onto @shared/rng.
//
// Defect (1) is NOT closed here: the shared `loadClaims` has the SAME unguarded
// JSON.parse, so a syntactically-broken file still throws an unnamed SyntaxError. That
// is a known fleet-wide residual (the helper wraps no try/catch — see the session's TEA
// Delivery Finding), out of df1-8 scope (one function, one file). PART 2 below therefore
// exercises the SHAPE half only (via asClaim); it does not test the JSON-syntax path.
//
// ─── WHY THE GUARD PARSES, IT DOES NOT GREP ──────────────────────────────────
// A flat-text search for `function loadClaims` or `as Claim | Claim[]` is defeated
// the instant someone comments the old copy out, and a mention of `loadClaims` in a
// comment or an import binding must NOT read as a local re-definition. This guard
// walks the TypeScript AST: it counts only a live FunctionDeclaration / variable
// binding as a local definition (an ImportSpecifier is neither), and reads a real
// static ImportDeclaration for adoption. PART 3 pins that the teeth cannot be faked.
//
// ─── SCHEMA IS NOT UNIFORM (the trap) ────────────────────────────────────────
// joust's asClaim deliberately treats an ABSENT `source` as legal data ("a claim
// missing source is legal data, not an error" — claims.ts). Do NOT import df1-6's
// defender cases that reject a source-less claim: defender's isValidClaimSource
// REQUIRES a citation; joust's does not. PART 2's control pins joust's looseness so
// an over-strict "fix" cannot pass by copying defender.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { asClaim } from '../helpers/claims.js'

const auditDir = dirname(fileURLToPath(import.meta.url))
const citationsFile = join(auditDir, 'citations.test.ts')

// ─────────────────────────────────────────────────────────────────────────────
// AST helpers — LIVE code only. A comment, a string literal, or an import binding
// is not a FunctionDeclaration / VariableDeclaration node, so none of them can
// satisfy or defeat these checks.
// ─────────────────────────────────────────────────────────────────────────────

/** Line numbers (1-based) at which `name` is declared LOCALLY — a top-level or
 *  nested `function name` or `const/let/var name = …`. An imported binding of the
 *  same name is an ImportSpecifier, never a Function/VariableDeclaration, so it is
 *  NOT counted: that is the whole point — adoption replaces a local def with an
 *  import. */
function localBindingLines(source: string, name: string, filename = 'module.ts'): number[] {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const lines: number[] = []
  const at = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
  const walk = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) lines.push(at(node))
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      lines.push(at(node))
    }
    node.forEachChild(walk)
  }
  walk(sf)
  return lines
}

/** True iff `source` has a live `import { …, name, … } from '<spec>'` where the
 *  module specifier text contains `specifierIncludes`. Comments and string
 *  literals are not ImportDeclaration nodes, so they cannot fake it. */
function importsNamedFrom(
  source: string,
  name: string,
  specifierIncludes: string,
  filename = 'module.ts',
): boolean {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  let found = false
  const walk = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.includes(specifierIncludes)
    ) {
      const bindings = node.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        if (bindings.elements.some((el) => el.name.text === name)) found = true
      }
    }
    node.forEachChild(walk)
  }
  walk(sf)
  return found
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — RETIREMENT + ADOPTION GUARD (RED until the inline copy is gone)
// ═════════════════════════════════════════════════════════════════════════════

describe('df1-8 — citations.test.ts retires its inline loadClaims and adopts the shared loader', () => {
  const citationsSrc = readFileSync(citationsFile, 'utf8')

  it('citations.test.ts still exists and references loadClaims (the sweep has teeth)', () => {
    // A file that never mentions loadClaims would make both checks below vacuous.
    expect(citationsSrc).toMatch(/loadClaims/)
  })

  it('defines NO local loadClaims — the inline copy at :641 must LEAVE the file', () => {
    const hits = localBindingLines(citationsSrc, 'loadClaims', 'citations.test.ts')
    expect(
      hits,
      `citations.test.ts still declares its own loadClaims (line(s) ${hits.join(', ')}) — ` +
        'delete the inline copy and import the hardened one from ../helpers/claims',
    ).toEqual([])
  })

  it('imports loadClaims from ../helpers/claims (the shared hardened chokepoint)', () => {
    expect(
      importsNamedFrom(citationsSrc, 'loadClaims', 'helpers/claims', 'citations.test.ts'),
      'citations.test.ts does not import loadClaims from helpers/claims — the shared ' +
        'loader (jt9-2/jt9-31, shape-checked via asClaim) was never adopted',
    ).toBe(true)
  })

  it('no live `as Claim | Claim[]` cast survives (the unhardened tell is gone)', () => {
    // The inline loader is the only site of this exact double-shape cast. Pin its
    // removal as a live AsExpression, not as text (a commented-out copy must not
    // keep this red, nor a mention in prose fake it).
    const sf = ts.createSourceFile('citations.test.ts', citationsSrc, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
    const casts: string[] = []
    const walk = (node: ts.Node): void => {
      if (ts.isAsExpression(node)) {
        const t = node.type.getText(sf).replace(/\s+/g, ' ').trim()
        if (t === 'Claim | Claim[]') casts.push(t)
      }
      node.forEachChild(walk)
    }
    walk(sf)
    expect(casts, 'the raw `JSON.parse(...) as Claim | Claim[]` cast must be retired').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — THE ADOPTED LOADER SHAPE-CHECKS (self-contained; green now, green after)
// ═════════════════════════════════════════════════════════════════════════════
//
// citations.test.ts adopts `asClaim` (via loadClaims). These anchor the SHAPE half of
// the guarantee — the loader it adopts does what the inline copy did NOT: name the file
// on a bad SHAPE, while KEEPING joust's deliberately-loose source rule. (The JSON-SYNTAX
// half — defect (1) in the header — is NOT tested here: the shared loader's JSON.parse is
// unguarded fleet-wide and stays a filed residual, out of df1-8 scope.) This is the guarantee
// df1-8 buys; it must not silently rot even though it is green today.

const FILE = 'FIXTURE.json'

describe('df1-8 — the adopted asClaim names the file on a bad shape (what the inline copy lacked)', () => {
  it('rejects a non-object entry, and the message NAMES the file', () => {
    expect(() => asClaim('not an object', FILE)).toThrow(/claims\/FIXTURE\.json/)
  })

  it('rejects a PRESENT-but-malformed source (non-string file / non-numeric line), naming the file', () => {
    expect(() => asClaim({ id: 'x', source: { file: 7, line: 3 } }, FILE)).toThrow(
      /claims\/FIXTURE\.json: `source` must carry a string `file` and a numeric `line`/,
    )
    expect(() => asClaim({ id: 'x', source: { file: 'rom.mac', line: 'ten' } }, FILE)).toThrow(
      /claims\/FIXTURE\.json/,
    )
  })
})

describe('df1-8 — control: joust schema is LOOSER than defender (a source-less claim is legal)', () => {
  it('a claim with NO source passes through unchanged — do NOT copy df1-6 defender rejection', () => {
    // defender's loadClaims REJECTS a source-less entry; joust deliberately does not.
    // If a "fix" over-hardens to defender's rule, this reddens.
    const value = { id: 'DF1-8', claim: 'a claim with no source is legal joust data' }
    expect(() => asClaim(value, FILE)).not.toThrow()
    expect(asClaim(value, FILE)).toEqual(value)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 3 — THE GUARD'S OWN TEETH (the AST checks cannot be faked or over-fire)
// ═════════════════════════════════════════════════════════════════════════════

describe('df1-8 guard integrity — localBindingLines counts only a live local definition', () => {
  it('flags a real `function loadClaims` and a real `const loadClaims = …`', () => {
    expect(localBindingLines('function loadClaims(): unknown[] { return [] }', 'loadClaims')).toEqual([1])
    expect(localBindingLines('const loadClaims = () => []', 'loadClaims')).toEqual([1])
  })

  it('does NOT flag an IMPORTED loadClaims binding (adoption is not a local def)', () => {
    expect(localBindingLines("import { loadClaims } from '../helpers/claims'", 'loadClaims')).toEqual([])
  })

  it('does NOT flag loadClaims mentioned only in a comment or a string', () => {
    expect(localBindingLines('// function loadClaims() {} (retired)', 'loadClaims')).toEqual([])
    expect(localBindingLines('const doc = "loadClaims used to be inline"', 'loadClaims')).toEqual([])
  })
})

describe('df1-8 guard integrity — importsNamedFrom reads a live import, not prose', () => {
  it('finds a real named import of loadClaims from helpers/claims', () => {
    expect(importsNamedFrom("import { loadClaims } from '../helpers/claims'", 'loadClaims', 'helpers/claims')).toBe(true)
    expect(importsNamedFrom("import { loadClaims } from '../helpers/claims.js'", 'loadClaims', 'helpers/claims')).toBe(true)
  })

  it('does NOT match a different binding, a different module, or a comment', () => {
    expect(importsNamedFrom("import { asClaim } from '../helpers/claims'", 'loadClaims', 'helpers/claims')).toBe(false)
    expect(importsNamedFrom("import { loadClaims } from './somewhere-else'", 'loadClaims', 'helpers/claims')).toBe(false)
    expect(importsNamedFrom("// import { loadClaims } from '../helpers/claims'", 'loadClaims', 'helpers/claims')).toBe(false)
  })
})
