// tests/helpers/frame-loop.ts
//
// Story jt11-10 (b) (GREEN, Yoda) — bound the frame-loop SOURCE PINS at the frame
// fn's matching closing brace, via the TypeScript AST, per the mc10-6 ruling.
//
// ─── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// The per-frame-call pins in render-jt4-5.test.ts and hud-jt11-2.test.ts anchored
// on the `frame` declaration with a regex, then took `src.slice(loopStart)` — the
// whole file FROM `frame` TO EOF. That is correct ONLY while `frame` is the LAST
// top-level declaration in main.ts. The day a decl is added after it, the "loop
// body" silently swallows everything after the loop, and a `drawHud(...)` living
// OUTSIDE the frame fn would satisfy the pin — the exact vacuity those tests exist
// to prevent, reintroduced by drift.
//
// The AST knows where the `frame` function's body actually closes, so the bound is
// the real brace, never EOF and never a comment that mentions `}`. This is the
// `helpers/purity-scanner.ts` precedent: `typescript` is already a direct
// devDependency, TS-native, and the only tool that tells CODE from TEXT reliably.

import ts from 'typescript'

/**
 * The source text of main.ts's top-level `frame` animation-loop function — from
 * its declaration through its matching closing brace, and NOT one character
 * further. A declaration appended AFTER `frame` is therefore excluded, so a
 * per-frame-call pin over this slice cannot be satisfied by code that lives
 * outside the loop.
 *
 * Recognises both spellings: `const frame = (…) => {…}` / `= function (…) {…}`
 * and `function frame(…) {…}`. Throws (never returns "") when no top-level
 * `frame` function is found, so a pin over the result fails loudly rather than
 * silently matching an empty body.
 *
 * @param source the full text of main.ts
 */
export function frameLoopBody(source: string): string {
  const sf = ts.createSourceFile('main.ts', source, ts.ScriptTarget.ESNext, /* setParentNodes */ true, ts.ScriptKind.TS)
  for (const stmt of sf.statements) {
    // const/let frame = (…) => {…}  |  const frame = function (…) {…}
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === 'frame' &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          return source.slice(stmt.getStart(sf), stmt.getEnd())
        }
      }
    }
    // function frame(…) {…}
    if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === 'frame') {
      return source.slice(stmt.getStart(sf), stmt.getEnd())
    }
  }
  throw new Error(
    'frameLoopBody: main.ts declares no top-level `frame` animation-loop function ' +
      '(`const frame = (…) => {…}` or `function frame(…) {…}`)',
  )
}
