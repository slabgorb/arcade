# va-battlezone — Battlezone (1980) disassembly quarry

Committed copy of the 6502disassembly.com SourceGen project for Atari's
*Battlezone* (1980). This is the byte-level authority for every ROM constant in
epic **bz1** (obstacle table, 3D model geometry, scoring, thresholds,
difficulty, radar, sound).

| File | What it is |
|------|------------|
| `Battlezone` | 16 KB program-ROM binary image (the actual bytes) |
| `Battlezone.dis65` | SourceGen project — labels, annotations, data-region definitions, load address |
| `MathBox.sym65` | Math Box symbol table |
| `VisBattlezone.cs` | SourceGen visualizer source — the exact decoding algorithm for the 3D object vertex/edge tables |

## Provenance

- Source: <https://6502disassembly.com/va-battlezone/Battlezone.html> and
  <https://6502disassembly.com/va-battlezone/objects.html>
- Obtained as the downloadable SourceGen project from that site
  (originally kept at `~/Downloads/va-battlezone/`).
- Key addresses: obstacle placement table ≈ `$7472` (program ROM);
  3D object vertex tables ≈ `$388e`.

## Why this is committed

Game subrepos keep their working quarry in a **gitignored, checkout-local**
`reference/` directory — committed game code must never depend on it being
present. The hard-won star-wars/asteroids lesson is that such quarries vanish
with the checkout. This orchestrator copy is the durable master: it survives
checkouts and rides the orchestrator's remote.

## Refresh procedure (for a battlezone checkout)

```bash
mkdir -p battlezone/reference
cp reference/va-battlezone/* battlezone/reference/
```

Open `Battlezone.dis65` with [SourceGen](https://6502bench.com/) for the
annotated listing; `VisBattlezone.cs` documents the wireframe decoding.
