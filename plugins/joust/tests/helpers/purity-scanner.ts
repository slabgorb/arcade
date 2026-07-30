// tests/helpers/purity-scanner.ts
//
// Story jt1-7 (GREEN, Julia) — the core/shell boundary scanner, rebuilt on the
// TypeScript compiler API. One implementation, shared by tests/purity.test.ts
// (which sweeps src/core/) and tests/purity-scanner.test.ts (which pins its
// behaviour).
//
// ─── WHY AN AST AND NOT A BETTER REGEX ───────────────────────────────────────
// jt1-1's scanner stripped comments and strings with regexes over flat text.
// The jt1-1 Reviewer reproduced five false negatives in it; a sixth was found in
// jt1-7's RED phase. Every one is a case where flat text cannot tell CODE from
// TEXT-THAT-LOOKS-LIKE-CODE:
//
//   1. a `/*` inside a string opened a phantom block comment that swallowed
//      every violation up to the next real `*/` — anywhere later in the file
//   2. a `//` inside a string truncated the line
//   3. `${...}` interpolation was blanked along with the template around it,
//      even though it holds live expressions
//   4. `const { random } = Math` aliased past a call-anchored ban
//   5. `const readClock = Date.now` did the same by reference
//   6. a string carrying BOTH `//` and `/*` — which no stripping ORDER survives:
//      comments-first lets the `//` eat the line, strings-first lets the `/*`
//      open a phantom block
//
// The tempting fix is to reorder or extend the regexes. It does not work, and
// the companion suite proves it: each plausible patch direction breaks a
// different one of nine MUST HOLD cases (nested templates, a regex literal
// containing a quote, an apostrophe in a comment, division vs regex, …). A
// parser satisfies all fifteen without trying, because the distinction between
// code and text is exactly what parsing IS.
//
// ─── WHY TypeScript AND NOT acorn ────────────────────────────────────────────
// The story named acorn as "already available via vite". It is not in the tree
// — Vite 8 uses rolldown/oxc, not rollup/acorn — and acorn parses JavaScript
// only, while `src/core/*.ts` is full of interfaces, generics, `as const` and
// type-only imports. `typescript` is already a direct devDependency and is
// TS-native, so this needs no new dependency at all.
//
// ─── WHAT THIS SCANNER DOES NOT DETECT (stated, not implied) ─────────────────
// The scanner is SYNTACTIC. It recognises banned names where they appear in
// code, and it follows the one binding form a variable declarator gives it. It
// does NOT perform dataflow analysis, so every route below is a KNOWN
// LIMITATION rather than an oversight, and none of them is half-implemented —
// a partial check here would read as coverage while providing none:
//
//   • spread — `const { ...rest } = Math; rest.random()`
//   • Object.assign — `const o = Object.assign({}, Math)`
//   • Reflect.get — `Reflect.get(Math, 'random')()`
//   • reassignment aliasing — `let x = null; x = Math; x.random()`
//   • class extends — `class C extends Date {}`
//
// Catching these needs real dataflow (or a type checker), which is a different
// tool. The boundary they guard is also defended by review and by the fact that
// core is generated from transcription tools, so an author would have to work
// to reach one accidentally — unlike the string-literal and comment holes jt1-7
// closed, which an INNOCENT string could trip.
//
// SHADOWING IS DELIBERATELY STRICT. A local named `document` or `window`
// reports, even though it shadows the global and is therefore harmless. The
// alternative is scope tracking, and a false POSITIVE here costs one rename
// while a false negative costs the determinism the whole epic rests on.
//
// ─── THE ANTI-FALLBACK RULE ──────────────────────────────────────────────────
// There is deliberately no try/catch that falls back to a regex sweep. That
// shortcut would satisfy every behavioural case above while quietly restoring
// every hole. Source this scanner cannot parse is REPORTED, never certified.

import ts from 'typescript'

/**
 * Objects whose every member access is a shell surface. Reported by object
 * name, so `view.windowSize` and `processInput()` never trip — only the OBJECT
 * identifier is consulted, never the member name.
 */
const BANNED_OBJECTS: ReadonlyMap<string, string> = new Map([
  ['window', 'window.*'],
  ['document', 'document.*'],
  ['navigator', 'navigator.*'],
  ['crypto', 'crypto.*'],
  // Node globals are shell surfaces too: process.hrtime is a wall clock and
  // process.env is ambient configuration.
  ['process', 'process.*'],
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
  // Render/audio surface types leaking across the boundary. Core emits frame
  // indices and positions, never pixels.
  ['HTMLCanvasElement', 'HTMLCanvasElement'],
  ['CanvasRenderingContext2D', 'CanvasRenderingContext2D'],
  ['OffscreenCanvas', 'OffscreenCanvas'],
  ['ImageData', 'ImageData'],
])

/** Called functions that schedule work, reach the network, or generate code. */
const BANNED_CALLS: ReadonlyMap<string, string> = new Map([
  // The shell accumulates wall time and steps the sim in whole frames. Core
  // advances only when stepped — it never schedules itself.
  ['setTimeout', 'setTimeout()'],
  ['setInterval', 'setInterval()'],
  ['requestAnimationFrame', 'requestAnimationFrame()'],
  ['queueMicrotask', 'queueMicrotask()'],
  ['fetch', 'fetch()'],
  ['addEventListener', 'addEventListener()'],
  // eval() builds executable code from a string — an arbitrary escape hatch.
  ['eval', 'eval()'],
  // Bare Function("…")() is the same escape hatch as new Function() — the
  // jt1-7 review caught the call form missing while the constructor was banned.
  ['Function', 'Function()'],
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
  ['window', 'window aliasing'],
  ['document', 'document aliasing'],
  ['navigator', 'navigator aliasing'],
  ['crypto', 'crypto aliasing'],
  ['process', 'process aliasing'],
  ['performance', 'performance aliasing'],
])

/**
 * The boundary is one-way: core emits data, shell consumes it. Any import
 * reaching from core/ into shell/ inverts it.
 */
// Case-insensitive: '../SHELL/x' resolves and runs on macOS's case-insensitive
// filesystem, so a case-sensitive ban is an accidental-evasion channel (jt1-7 review).
const SHELL_SPECIFIER = /^\.{1,2}\/(?:[^'"]*\/)?shell/i

/** `AudioContext`, and the `webkitAudioContext` / `OfflineAudioContext` variants. */
const isAudioContextName = (name: string): boolean => name.endsWith('AudioContext')

/**
 * Every boundary rule this source violates, deduplicated and in first-seen
 * order. Pure: the input string is never modified and no state survives a call.
 *
 * @param source the module text
 * @param filename used only for the parser's diagnostics
 */
export function violations(source: string, filename = 'module.ts'): string[] {
  const hits: string[] = []
  const seen = new Set<string>()
  /**
   * Report a rule once per (rule, line). The location matters: `pictures.ts` is
   * 1800 generated lines, and "crosses the boundary via Math.random()" with no
   * line leaves the author grepping.
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
    // A static `import x from …` is an ImportDeclaration, and `import.meta` is
    // a MetaProperty, so neither reaches here.
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
      // `Math['random']()` and `Math[\`random\`]()` reach the same member as
      // `Math.random()`. A literal subscript is not indirection — it is the
      // same access spelled differently, so it goes through the same table.
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
    // FN-4 and FN-5: binding analysis, not tokenizing. `const { random } = Math`
    // and `const readClock = Date.now` are lexically unremarkable — what makes
    // them violations is what they BIND.
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = unwrap(node.initializer)
      if (ts.isIdentifier(init)) {
        const rule = ALIASABLE_OBJECTS.get(init.text)
        if (rule) {
          // The two forms are EXCLUSIVE, so one defect is named once. Reporting
          // both `Math aliasing` and `destructuring Math` for a single
          // `const { random } = Math` is the same noise the jt1-1 Date-alias
          // tightening removed: a failure message naming two rules for one line
          // sends the author hunting a second, non-existent problem.
          if (ts.isObjectBindingPattern(node.name)) report(`destructuring ${init.text}`, node)
          // `const D = Date` — the bare constructor, no member access, no call.
          // A `: Date` annotation, `type X = Date` and `<T = Date>` are all
          // different node kinds and never reach here.
          else report(rule, node)
        }
      }
    }

    // ── bare identifiers, including in TYPE position ───────────────────────
    // `const px: ImageData = atlas.get()` puts the surface in a type
    // annotation; the type nodes are part of the tree, so this catches it. Only
    // names that are never legitimate in core appear in this set — `Date` and
    // `Math` are not among them, which is why `let stamp: Date` stays clean.
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
