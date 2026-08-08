// tests/helpers/purity-scanner.ts
//
// Story td1-2 (GREEN) — the core/shell boundary scanner, ported from joust
// (jt1-7 + jt1-11) onto the TypeScript compiler API. Replaces the regex
// comment/string stripper that used to live inline in tests/purity.test.ts,
// which had six proven false negatives (see tests/purity-scanner.test.ts's
// RED-phase header for the measured probe table). One implementation, shared
// by tests/purity.test.ts (which sweeps src/core/) and
// tests/purity-scanner.test.ts (which pins its behaviour).
//
// ─── WHY AN AST AND NOT A BETTER REGEX ───────────────────────────────────────
// The old scanner stripped comments and strings with regexes over flat text.
// Every one of its six holes is a case where flat text cannot tell CODE from
// TEXT-THAT-LOOKS-LIKE-CODE:
//
//   1. a `/*` inside a string opened a phantom block comment that swallowed
//      every violation up to the next real `*/` — anywhere later in the file
//   2. a `//` inside a string truncated the line
//   3. `${...}` interpolation was blanked along with the template around it,
//      even though it holds live expressions
//   4. `const { random } = Math` aliased past a call-anchored ban
//   5. `const rnd = Math.random; rnd()` did the same by reference
//   6. a string carrying BOTH `//` and `/*` — which no stripping ORDER
//      survives: comments-first lets the `//` eat the line, strings-first lets
//      the `/*` open a phantom block
//
// The tempting fix is to reorder or extend the regexes. It does not work, and
// the companion suite proves it: each plausible patch direction breaks a
// different one of nine MUST HOLD cases (nested templates, a regex literal
// containing a quote, an apostrophe in a comment, division vs regex, …). A
// parser satisfies all of them without trying, because the distinction between
// code and text is exactly what parsing IS.
//
// ─── WHY TypeScript AND NOT acorn ────────────────────────────────────────────
// acorn parses JavaScript only, while `src/core/*.ts` is full of interfaces,
// generics, `as const` and type-only imports. `typescript` is already a direct
// devDependency and is TS-native, so this needs no new dependency at all.
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
// tool. The boundary they guard is also defended by review and by the fact
// that core is mostly generated from transcription tools, so an author would
// have to work to reach one accidentally — unlike the string-literal and
// comment holes this port closed, which an INNOCENT string could trip.
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

// ─── CENTIPEDE'S BAN SET (preserved exactly from the old regex scanner) ──────
// Date.now, new Date, performance.now, Math.random, setTimeout, setInterval,
// requestAnimationFrame, window.*, document.*, navigator.*, localStorage,
// sessionStorage, fetch, addEventListener, HTMLCanvasElement,
// CanvasRenderingContext2D, AudioContext(+variants), globalThis, dynamic
// import(), eval, new Function, Date aliasing, shell import. Does NOT ban
// crypto/process/queueMicrotask/OffscreenCanvas/ImageData/bare Function() call
// — those are joust-only surfaces this repo has never guarded against.

/**
 * Objects whose every member access is a shell surface. Reported by object
 * name, so `view.windowSize` and `processInput()` never trip — only the OBJECT
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
  // Render surface types leaking across the boundary. Core emits frame
  // indices and positions, never pixels.
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
 * reaching from core/ into shell/ inverts it.
 */
// Case-insensitive: '../SHELL/x' resolves and runs on macOS's case-insensitive
// filesystem, so a case-sensitive ban is an accidental-evasion channel.
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
   * Report a rule once per (rule, line). The location matters: `pictures.ts`
   * is a large generated data module, and "crosses the boundary via
   * Math.random()" with no line leaves the author grepping.
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
    // and `const rnd = Math.random` are lexically unremarkable — what makes
    // them violations is what they BIND (the latter is actually caught above,
    // by the ordinary property-access visit: `Math.random` is a banned member
    // whether or not it is immediately called).
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = unwrap(node.initializer)
      if (ts.isIdentifier(init)) {
        const rule = ALIASABLE_OBJECTS.get(init.text)
        if (rule) {
          // The two forms are EXCLUSIVE, so one defect is named once. Reporting
          // both `Math aliasing` and `destructuring Math` for a single
          // `const { random } = Math` would send the author hunting a second,
          // non-existent problem.
          if (ts.isObjectBindingPattern(node.name)) report(`destructuring ${init.text}`, node)
          // `const D = Date` — the bare constructor, no member access, no call.
          // A `: Date` annotation, `type X = Date` and `<T = Date>` are all
          // different node kinds and never reach here.
          else report(rule, node)
        }
      }
    }

    // ── bare identifiers, including in TYPE position ───────────────────────
    // `const px: HTMLCanvasElement = ...` puts the surface in a type
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
