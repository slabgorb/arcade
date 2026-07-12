// Extracts ground-truth literals from a game's TypeScript source AS TEXT.
//
// The orchestrator's tests are plain `node --test` on .mjs — there is no
// transpiler, so a test cannot import red-baron's .ts modules. These files are
// pure data literals, so reading them as text is reliable.

/** Body of the array literal assigned to `export const <name>`, comments removed. */
function arrayBody(text, name) {
  const src = String(text).replace(/\/\/[^\n]*/g, ''); // drop line comments first
  const at = src.indexOf(`export const ${name}`);
  if (at < 0) throw new Error(`no export named ${name}`);
  // Anchor on "= [" — `readonly Point3[] = [` has a '[' in the TYPE annotation.
  const eq = /=\s*\[/.exec(src.slice(at));
  if (!eq) throw new Error(`${name} is not assigned an array literal`);
  const open = at + eq.index + eq[0].length - 1;
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
