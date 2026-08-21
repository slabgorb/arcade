# Chrome adoption matrix — which games route through the shared cabinet surround

The live decision table for the shared display chrome in
[`src/shared/cabinet.ts`](../../src/shared/cabinet.ts) (`chromeRegions`,
`drawCabinetChrome`, `CABINET_CHROME`). Landed by story **sa1-1** (epic sa1,
"Polish and QOL").

`tests/chrome-convergence.test.mjs` reads this file on every run and checks it
against every `plugins/*/src/**`. It is therefore not a description of the tree —
it is a claim the tree is allowed to refute. The one fact a reader needs ("does
this game route through the shared chrome?") is computed from the source on every
run, never remembered here.

## The table

The markers below delimit the machine-read block. Only this table is the
contract; the test refuses to run without the markers.

<!-- chrome-adoption-matrix:start -->

| game | cabinet-chrome |
|------|----------------|
| tempest | adopted |
| star-wars | adopted |
| asteroids | adopted |
| battlezone | adopted |
| red-baron | adopted |
| centipede | adopted |
| joust | adopted |
| missile-command | adopted |
| pac-man | adopted |
| millipede | adopted |
| defender | adopted |

<!-- chrome-adoption-matrix:end -->

## What the cells mean

The vocabulary is closed, and the test rejects anything outside it — a reason
nobody can check is a reason nobody will re-examine (the sc1-1 lesson).

| cell | meaning |
|---|---|
| `adopted` | the game imports `@shared/cabinet` and draws its non-game surround through `drawCabinetChrome`. The test requires the import to exist in the game's source. |
| `own-implementation` | the game paints its surround by a mechanism the shared module genuinely cannot express, documented here. The test requires the game NOT to import `@shared/cabinet`. |
| `no-fit-margins` | the game leaves no in-surface dead area to frame (it fits its own render element to the surface), so there is nothing for the shared chrome to paint. The test requires the game NOT to import `@shared/cabinet`. |

## Notes

- A game that fills the whole render surface (its fitted game rect equals the
  container — e.g. the vector games that resize the surface to the window)
  still adopts: `drawCabinetChrome` correctly paints nothing when there is no
  dead area, so the seam is wired and honest and will frame any future margins
  in the shared colour without a code change.
- The one surround look is `CABINET_CHROME` (`#0a0a12`) — a near-black slate,
  distinct from the pure-black play area so the dead margin reads as "not the
  game", shared by every adoption so the cabinet floor is visually consistent.
