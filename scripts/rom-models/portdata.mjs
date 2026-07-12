// Extracts ground-truth literals from a game's TypeScript source AS TEXT.
//
// The orchestrator's tests are plain `node --test` on .mjs — there is no
// transpiler, so a test cannot import red-baron's .ts modules. These files are
// pure data literals, so reading them as text is reliable.

/** Escape a string for literal use inside a `RegExp`. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Body of the array literal assigned to `export const <name>`, comments removed. */
function arrayBody(text, name) {
  const src = String(text).replace(/\/\/[^\n]*/g, ''); // drop line comments first
  // First check: does the export exist at all?
  const nameExists = new RegExp(`export const ${escapeRegExp(name)}\\s*(?::|=)`);
  if (!nameExists.test(src)) throw new Error(`no export named ${name}`);

  // Second check: is it assigned to an array literal on the same declaration line?
  // Anchor the bracket to the declaration itself. This prevents an unbounded
  // forward search that would silently grab a later export's array if the
  // named export is not assigned a literal (e.g., POINT_STRIDE = 6 or
  // DRONE_POINTS = PLANE_POINTS.slice(...)).
  const head = new RegExp(`export const ${escapeRegExp(name)}\\s*(?::[^=\\n]*)?=\\s*\\[`);
  const headMatch = head.exec(src);
  if (!headMatch) throw new Error(`${name} is not assigned an array literal`);

  const open = headMatch.index + headMatch[0].length - 1; // '[' is at the end
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error(`unterminated array literal for ${name}`);
}

/** `export const X: readonly Point3[] = [[0,0,40], ...]` -> [[0,0,40], ...]. */
export function extractPoint3(text, name) {
  return [...arrayBody(text, name).matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)]
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
}

/** `export const X: readonly ConnectOp[] = [B(12), V(29), ...]` -> ops. B=pen up, V=pen down. */
export function extractConnect(text, name) {
  return [...arrayBody(text, name).matchAll(/\b([BV])\(\s*(\d+)\s*\)/g)]
    .map((m) => ({ point: Number(m[2]), draw: m[1] === 'V' }));
}
