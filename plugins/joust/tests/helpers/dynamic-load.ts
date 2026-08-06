// tests/helpers/dynamic-load.ts
//
// Story jt9-31 (folds jt9-33) — the SHARED dynamic-import helper, extracted from
// the private `load` const that eight joust test files each copied. The copies
// swallowed EVERY import failure:
//
//     try { return (await import(parts.join('/'))) as Partial<T> }
//     catch { return {} }
//
// A bare catch cannot tell "this module is legitimately absent" from "this module
// threw while EVALUATING": both arrive as {} and every downstream field read then
// yields undefined. jt9-5 added throws that fire at module-import time, so a real
// bad row now makes a whole file fail to collect and vitest reports (0 test) — a
// zero that reads exactly like a passing sweep, or 53 misleading "must export"
// failures that all point at an export that is not missing.
//
// The narrowed catch below re-throws anything that is not a module-not-found, so a
// module that throws while evaluating propagates its ORIGINAL error. The absent-
// module path is preserved as {} because real callers depend on it (the Partial<T>
// return type: a not-yet-implemented surface reads as `undefined` fields, by
// design). Pinned by tests/dynamic-load-source.test.ts.
//
// `baseUrl` is the CALLER's `import.meta.url`: a dynamic `import()` resolves
// relative to the module the statement physically sits in, so after extraction the
// specifier is made absolute against the caller to preserve each caller's own
// relative base (`['..', 'src', 'shell', 'audio']` still means "from the test
// file's directory", not "from tests/helpers/").

/** Node marks a genuinely-missing module with this code; everything else is a
 *  real failure the caller must see. */
const isModuleNotFound = (err: unknown): boolean =>
  (err as NodeJS.ErrnoException | null)?.code === 'ERR_MODULE_NOT_FOUND'

export async function load<T>(baseUrl: string, parts: string[]): Promise<Partial<T>> {
  try {
    return (await import(/* @vite-ignore */ new URL(parts.join('/'), baseUrl).href)) as Partial<T>
  } catch (err) {
    if (isModuleNotFound(err)) return {}
    throw err
  }
}
