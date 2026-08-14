// tests/helpers/purity-scanner.ts
//
// Story df1-1 (GREEN) — the core/shell boundary scanner for Defender, ported
// verbatim from plugins/millipede/tests/helpers/purity-scanner.ts (itself
// centipede's td1-2 port of joust jt1-7/jt1-11 onto the TypeScript compiler API).
// One implementation per game — the fleet carries a copy each, scanning that
// game's own src/core/. Shared by tests/purity.test.ts (which sweeps src/core/,
// dormant until df2 lands the sim) and, when a companion suite is added, its
// behaviour pins.
//
// ─── WHY AN AST AND NOT A BETTER REGEX ───────────────────────────────────────
// Flat text cannot tell CODE from TEXT-THAT-LOOKS-LIKE-CODE: a `/*` inside a
// string opens a phantom block comment; a `//` inside a string truncates the
// line; `${...}` holds live expressions; `const { random } = Math` and
// `const rnd = Math.random` alias past a call-anchored ban. A parser satisfies
// every case without trying, because the distinction between code and text is
// exactly what parsing IS. `typescript` is already a direct devDependency and is
// TS-native (src/core/*.ts is full of interfaces, generics, `as const`), so this
// needs no new dependency.
//
// ─── WHAT THIS SCANNER DOES NOT DETECT (stated, not implied) ─────────────────
// The scanner is SYNTACTIC. It recognises banned names where they appear in code
// and follows the one binding form a variable declarator gives it. It does NOT do
// dataflow analysis, so spread (`const { ...rest } = Math`), Object.assign,
// Reflect.get, reassignment aliasing and `class extends Date` are KNOWN
// limitations, not oversights — a partial check would read as coverage while
// providing none. Shadowing is deliberately STRICT: a local named `document`
// reports even though it is harmless, because a false positive costs one rename
// while a false negative costs the determinism the whole game rests on.
//
// ─── THE ANTI-FALLBACK RULE ──────────────────────────────────────────────────
// There is deliberately no try/catch that falls back to a regex sweep — that
// would satisfy every behavioural case while quietly restoring every hole. Source
// this scanner cannot parse is REPORTED, never certified.

import ts from 'typescript'

// ─── BAN SET (preserved exactly from millipede's scanner) ────────────────────
// Date.now, new Date, performance.now, Math.random, setTimeout, setInterval,
// requestAnimationFrame, window.*, document.*, navigator.*, localStorage,
// sessionStorage, fetch, addEventListener, HTMLCanvasElement,
// CanvasRenderingContext2D, AudioContext(+variants), globalThis, dynamic
// import(), eval, new Function, Date/Math aliasing, shell import.

/**
 * Objects whose every member access is a shell surface. Reported by object name,
 * so `view.windowSize` and `processInput()` never trip — only the OBJECT
 * identifier is consulted, never the member name.
 */
const BANNED_OBJECTS: ReadonlyMap<string, string> = new Map([
  ['window', 'window.*'],
  ['document', 'document.*'],
  ['navigator', 'navigator.*'],
])

/** Specific `object.member` pairs — the object itself is otherwise legitimate. */
const BANNED_MEMBERS: ReadonlyMap<string, string> = new Map([
  ['Date.now', 'Date.now()'],
  ['Math.random', 'Math.random()'],
  ['performance.now', 'performance.now()'],
])

/** Bare identifiers that are shell surfaces wherever they appear in code. */
const BANNED_IDENTIFIERS: ReadonlyMap<string, string> = new Map([
  ['localStorage', 'localStorage'],
  ['sessionStorage', 'sessionStorage'],
  // globalThis is the ambient global object — reachable without naming any
  // banned global directly.
  ['globalThis', 'globalThis'],
  // Render surface types leaking across the boundary. Core emits frame indices
  // and positions, never pixels.
  ['HTMLCanvasElement', 'HTMLCanvasElement'],
  ['CanvasRenderingContext2D', 'CanvasRenderingContext2D'],
])

/** Called functions that schedule work, reach the network, or generate code. */
const BANNED_CALLS: ReadonlyMap<string, string> = new Map([
  // The shell accumulates wall time and steps the sim in whole frames. Core
  // advances only when stepped — it never schedules itself.
  ['setTimeout', 'setTimeout()'],
  ['setInterval', 'setInterval()'],
  ['requestAnimationFrame', 'requestAnimationFrame()'],
  ['fetch', 'fetch()'],
  ['addEventListener', 'addEventListener()'],
  // eval() builds executable code from a string — an arbitrary escape hatch.
  ['eval', 'eval()'],
])

/** `new X(...)` forms. */
const BANNED_CONSTRUCTORS: ReadonlyMap<string, string> = new Map([
  ['Date', 'new Date()'],
  ['Function', 'new Function()'],
])

/**
 * Objects that must not be aliased wholesale — binding them sidesteps every
 * member-anchored rule above. `Date` keeps its historical rule name because
 * existing tests assert it by name.
 */
const ALIASABLE_OBJECTS: ReadonlyMap<string, string> = new Map([
  ['Date', 'Date aliasing (= Date)'],
  ['Math', 'Math aliasing (= Math)'],
])

/**
 * The boundary is one-way: core emits data, shell consumes it. Any import
 * reaching from core/ into shell/ inverts it. Case-insensitive: '../SHELL/x'
 * resolves and runs on macOS's case-insensitive filesystem, so a case-sensitive
 * ban is an accidental-evasion channel.
 */
const SHELL_SPECIFIER = /^\.{1,2}\/(?:[^'"]*\/)?shell/i

/** `AudioContext`, and the `webkitAudioContext` / `OfflineAudioContext` variants. */
const isAudioContextName = (name: string): boolean => name.endsWith('AudioContext')

/**
 * Every boundary rule this source violates, deduplicated and in first-seen order.
 * Pure: the input string is never modified and no state survives a call.
 *
 * @param source the module text
 * @param filename used only for the parser's diagnostics
 */
export function violations(source: string, filename = 'module.ts'): string[] {
  const hits: string[] = []
  const seen = new Set<string>()
  /**
   * Report a rule once per (rule, line). The location matters: a large generated
   * data module's "crosses the boundary via Math.random()" with no line leaves
   * the author grepping.
   */
  const report = (rule: string, node?: ts.Node): void => {
    let where = ''
    if (node) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      where = ` (${filename}:${line + 1})`
    }
    const entry = rule + where
    if (seen.has(entry)) return
    seen.add(entry)
    hits.push(entry)
  }

  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  )

  // THE ANTI-FALLBACK RULE. A file the scanner cannot read must never be
  // certified clean — that is exactly how a regex fallback would hide.
  const parseErrors = (sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics
  if (parseErrors && parseErrors.length > 0) {
    report(
      `unparseable source (${parseErrors.length} syntax error(s)) — ` +
        'the scanner cannot certify a file it cannot read',
    )
    return hits
  }

  /**
   * Strip the wrappers that carry an expression through unchanged. `(Math)`,
   * `Math!` and `Math satisfies object` are all still Math, and a scanner that
   * only recognises a bare Identifier misses every one of them.
   */
  const unwrap = (node: ts.Node): ts.Node => {
    let n = node
    for (;;) {
      if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n)) n = n.expression
      else if (ts.isSatisfiesExpression(n) || ts.isAsExpression(n)) n = n.expression
      else if (ts.isTypeAssertionExpression?.(n)) n = n.expression
      else return n
    }
  }

  /** The dotted text of a property access, when it is a plain a.b chain. */
  const memberPath = (node: ts.PropertyAccessExpression): string | null =>
    ts.isIdentifier(unwrap(node.expression))
      ? `${(unwrap(node.expression) as ts.Identifier).text}.${node.name.text}`
      : null

  const visit = (node: ts.Node): void => {
    // ── import ... from '../shell/...' ─────────────────────────────────────
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      SHELL_SPECIFIER.test(node.moduleSpecifier.text)
    ) {
      report('import from shell/', node)
    }

    // ── import('...') — the dynamic form only ──────────────────────────────
    // A static `import x from …` is an ImportDeclaration, and `import.meta` is a
    // MetaProperty, so neither reaches here.
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      report('dynamic import()', node)
    }

    // ── a.b / a['b'] ───────────────────────────────────────────────────────
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const target = unwrap(node.expression)
      if (ts.isIdentifier(target)) {
        const objectRule = BANNED_OBJECTS.get(target.text)
        if (objectRule) report(objectRule, node)
      }
      if (ts.isPropertyAccessExpression(node)) {
        const path = memberPath(node)
        const memberRule = path ? BANNED_MEMBERS.get(path) : undefined
        if (memberRule) report(memberRule, node)
      }
      // `Math['random']()` reaches the same member as `Math.random()`. A literal
      // subscript is not indirection — the same access spelled differently.
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(target)) {
        const arg = node.argumentExpression
        const key =
          ts.isStringLiteralLike(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)
            ? arg.text
            : ts.isNoSubstitutionTemplateLiteral(arg)
              ? arg.text
              : undefined
        if (key !== undefined) {
          const memberRule = BANNED_MEMBERS.get(`${target.text}.${key}`)
          if (memberRule) report(memberRule, node)
        }
      }
    }

    // ── new X(...) ─────────────────────────────────────────────────────────
    if (ts.isNewExpression(node) && ts.isIdentifier(unwrap(node.expression))) {
      const rule = BANNED_CONSTRUCTORS.get((unwrap(node.expression) as ts.Identifier).text)
      if (rule) report(rule, node)
    }

    // ── f(...) where f is a bare banned name ───────────────────────────────
    if (ts.isCallExpression(node) && ts.isIdentifier(unwrap(node.expression))) {
      const rule = BANNED_CALLS.get((unwrap(node.expression) as ts.Identifier).text)
      if (rule) report(rule, node)
    }

    // ── const x = <banned object>  /  const { m } = <banned object> ────────
    // Binding analysis, not tokenizing. `const { random } = Math` and
    // `const rnd = Math.random` are lexically unremarkable — what makes them
    // violations is what they BIND (the latter is caught above by the ordinary
    // property-access visit: `Math.random` is a banned member either way).
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = unwrap(node.initializer)
      if (ts.isIdentifier(init)) {
        const rule = ALIASABLE_OBJECTS.get(init.text)
        if (rule) {
          // The two forms are EXCLUSIVE, so one defect is named once.
          if (ts.isObjectBindingPattern(node.name)) report(`destructuring ${init.text}`, node)
          // `const D = Date` — bare constructor, no member access, no call. A
          // `: Date` annotation, `type X = Date` and `<T = Date>` are different
          // node kinds and never reach here.
          else report(rule, node)
        }
      }
    }

    // ── bare identifiers, including in TYPE position ───────────────────────
    // `const px: HTMLCanvasElement = ...` puts the surface in a type annotation;
    // the type nodes are part of the tree, so this catches it. Only names never
    // legitimate in core appear here — `Date`/`Math` are not among them, which is
    // why `let stamp: Date` stays clean.
    if (ts.isIdentifier(node)) {
      const rule = BANNED_IDENTIFIERS.get(node.text)
      if (rule) report(rule, node)
      if (isAudioContextName(node.text)) report('AudioContext', node)
    }

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return hits
}
