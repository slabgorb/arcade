// IR -> geometry. The connect list is the ROM's actual BEAM PATH: an ordered
// walk where each op either moves the beam dark (pen up) or strokes a line to
// the vertex (pen down). Edges are a LOSSY derivation of it — they discard
// stroke order — but they are what `models.ts` stores, so they are what
// bake-models.mjs emits into the generated artifact.
//
// Diffing ROM edges against the port lives ONLY in
// star-wars/src/tools/romCompare.ts (a separate, TS-native implementation,
// because the browser build can't import from scripts/) — not here. This
// module derives edges from a connect list; it doesn't compare them.

/** Walk a connect list into undirected line segments (index pairs). */
export function connectToEdges(connect) {
  const edges = [];
  let prev = null;
  for (const op of connect) {
    if (op.draw && prev !== null) edges.push([prev, op.point]);
    prev = op.point;
  }
  return edges;
}
