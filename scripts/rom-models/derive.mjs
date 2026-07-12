// IR -> geometry. The connect list is the ROM's actual BEAM PATH: an ordered
// walk where each op either moves the beam dark (pen up) or strokes a line to
// the vertex (pen down). Edges are a LOSSY derivation of it — they discard
// stroke order — but they are what `models.ts` stores, so they are what we can
// diff against the port.

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

/** Orientation-independent identity for an edge, so [1,3] and [3,1] match. */
export function edgeKey([a, b]) {
  return a <= b ? `${a}-${b}` : `${b}-${a}`;
}

/** Set difference both ways, as edge keys. */
export function diffEdges(romEdges, portEdges) {
  const rom = new Set(romEdges.map(edgeKey));
  const port = new Set(portEdges.map(edgeKey));
  return {
    onlyInRom: [...rom].filter((k) => !port.has(k)),
    onlyInPort: [...port].filter((k) => !rom.has(k)),
  };
}
