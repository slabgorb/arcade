# Recovering `.WGD` ground-object edges — design

**Date:** 2026-07-12
**Status:** Approved (design) — not yet planned
**Author:** Architect
**Follows:** [`2026-07-12-rom-model-contact-sheet-design.md`](./2026-07-12-rom-model-contact-sheet-design.md)

## Problem

The ROM model contact sheet compares our shipped wireframes against the original
1983 Atari source. It works — it proved `DARTH_TIE`'s edges are largely
fabricated (44 of 104 edges appear nowhere in the ROM).

But it only compares **5 of 24** ROM objects. The other **10 objects carry
`hasDrawList: false`**, and the tool honestly declines to claim their edges:

> `hasDrawList: false` … means this parser could not recover edge connectivity
> for them from `WSOBJ.MAC`'s `.WL` tables — they are drawn by hand-coded
> PLOT/DRAWTO routines elsewhere in the assembly that this tool does not parse.

That caveat is accurate but **the premise is now known to be false**. The edges
are not lost. They are in the same file, ~40 lines further down.

This matters because the three models most likely to be wrong are exactly the
ones we cannot currently check:

| Shipped model | `models.ts` own words | ROM object |
|---|---|---|
| `EXHAUST_PORT` | marked **PROVISIONAL**, ring-based, authored | `PORT` |
| `SURFACE_TOWER` | **RE-AUTHORED** from ring structure | `STB` |
| `SURFACE_BUNKER` | authored | `BNK` |

We already know their **vertices** disagree (ROM `PORT` is 12 verts in three
concentric squares; ours is an 8-vert octagon). We cannot yet say anything about
their edges.

## The discovery

`.WGD` objects are drawn by a **direct-executing** routine rather than the
interpretable `.WL` byte list — which is why the type byte differs (`.WL` emits
`.BYTE 0` = *"INTERPRETABLE LIST FOR OBJDRW"*; `.WGD` emits `.BYTE 1` = *"CODE
FOR GROUND TYPE OBJECT"*, and the dispatcher does `JMP (U)` into it).

But "direct-executing" does not mean "unstructured." The routine bodies are
**nothing but macro calls**, and the macros take **point-table indices**:

```asm
.WGD BNK                          ; WSOBJ.MAC:1711 — BUNKER
        PLOT    0                 ; ASSUMES STARTING FROM CENTER
        BDRAWTO 1,2,14,13,1,3,15,13
        BDRAWTO 14,15
        ENDPLOT
```

The macro definitions give the semantics exactly:

| Macro | Def | Meaning |
|---|---|---|
| `PLOT n` | `WSOBJ.MAC:1629` | Begin a stroke run; beam starts at point `n` (pen up) |
| `DRAWTO a,b,…` | `:1653` | `.IRP` over args — **visible line** to each point in turn |
| `BDRAWTO a,b,…` | `:1678` | **Blank move** to `a`, then delegates `b,…` to `DRAWTO` |
| `ENDPLOT` | `:1696` | End of routine |

**`BDRAWTO`/`DRAWTO` is structurally the same idiom as `.BD`/`.LD`** — pen-up on
the first argument only, then draw the rest. We already parse that.

**Radix:** `DRAWTO` computes `...NEW = ...1'.*10 + M.GDXS`. The `'.` appends a
decimal point, so **indices are DECIMAL** — same decimal-forcing trick as `.LD`.
(`*10` is the point-record stride under `.RADIX 16`, i.e. 16 bytes; it is an
address computation, not part of the index.) So the existing radix core applies
unchanged, and the hex trap does **not** bite here.

**Corroboration that this is the right reading:** `models.ts` *already quotes
these very macro calls* in its own comments — "the cabinet's `BDRAWTO 14,15`",
"`BDRAWTO 7,9 / 7,8`". A human already read the connectivity off this source by
hand, for exactly these objects. We are automating what they did once, manually.

## The ten objects

Every `hasDrawList: false` object is covered by a `.WGD` routine:

| ROM object | `.WGD` routine | Notes |
|---|---|---|
| `BNK` | `:1711-1723` | bunker |
| `TWR` | `:1729-1756` | **`.WGD2 GND` on the next line** — `TWR` and `GND` are ONE object (same vertices, same draw code) |
| `GND` | *(alias of `TWR`)* | |
| `STB` | `:1761-1775` | "STUB OF TOWER WITHOUT BUNKER HAT ON TOP" — this is `SURFACE_TOWER` |
| `WGA` | `:1780-1798` | wall gun A; **`.WGD2 WGB`** shares it |
| `WGB` | *(alias of `WGA`)* | |
| `WPN` | `:1803-1813` | wall panel |
| `WFF` | `:1818-1825` | wall force field; `WFG` is its `.WPZ2` alias |
| `WFG` | *(alias of `WFF`)* | |
| `PORT` | `:1855-1876` | **thermal exhaust port** — the highest-value target |

`.WGD2` aliases the preceding `.WGD` routine, exactly as `.WL2` aliases the
preceding `.WL`. The existing alias machinery applies.

## Architecture

**This is a parser extension, not a new tool.** Everything downstream — the IR,
the bake, the artifact, the compare sheet, the diff, the tests — already exists
and needs no change beyond `hasDrawList` flipping to `true` for these objects.

```
scripts/rom-models/wsobj.mjs
    parseWsobj()
      ├── .WP/.P/.PH/.PGND  → vertices          (exists)
      ├── .WL/.LD/.BD       → connect ops       (exists)
      └── .WGD/PLOT/DRAWTO/BDRAWTO/ENDPLOT      ← NEW: emits the SAME ConnectOp[]
```

The `.WGD` body parses into the identical `{ point, draw }` IR:

```
PLOT 0                    →  [{ point: 0,  draw: false }]      ; pen up, beam origin
BDRAWTO 1,2,14            →  [{ point: 1,  draw: false },      ; pen up (first arg)
                              { point: 2,  draw: true  },      ; draw
                              { point: 14, draw: true  }]      ; draw
DRAWTO 6,4,7              →  [{ point: 6,  draw: true  }, …]   ; draw all
ENDPLOT                   →  end
```

`connectToEdges()` (Task 2) then derives edges with no change at all.

### Anchor / index base

`.WGD` bodies index the point table. `PLOT 0` says *"ASSUMES STARTING FROM
CENTER"* — index 0 is the object anchor. The existing parser **drops** the
`[0,0,0]` anchor and rebases `.WL` indices by −1. **The `.WGD` indices must be
rebased identically** — and this must be *verified*, not assumed, because a
uniform off-by-one would produce a plausible, wholly wrong wireframe.

The verification is available and cheap (see below).

### One known wrinkle

`PORT`'s body contains `MOVD` calls interleaved with the draws (scale/colour
state, not geometry). The parser currently **throws** on an unrecognized
directive inside an open table or list — deliberately, to prevent silent data
loss. `MOVD` must therefore be handled *explicitly* (recognized and skipped as
non-geometry), never by widening the throw into silence. Same for any other
state-setting macro found in these bodies; enumerate them, don't ignore them.

## How we know it's right

Three independent checks, in ascending strength:

1. **The port's own comments are a partial oracle.** `models.ts` already quotes
   `BDRAWTO 14,15` (bunker) and `BDRAWTO 7,9 / 7,8` (tower). A correct parser
   must reproduce those exact strokes. Pin them as tests.
2. **The red-baron oracle still guards the shared core** (radix, number parsing,
   pen semantics). Unchanged and still binding.
3. **Structural invariant:** every emitted edge index must land within
   `[0, vertices.length-1]` for every object — the check that already caught
   index-base errors in the `.WL` path. Extend it to `.WGD`.

**If the anchor rebase were off by one**, check 1 fails immediately (the quoted
strokes wouldn't match) and check 3 likely fails too (index `n` overflowing a
15-vertex table). The design is falsifiable, which is the point.

## Scope

**Delivers:**
1. `.WGD`/`PLOT`/`DRAWTO`/`BDRAWTO`/`ENDPLOT`/`MOVD` handling in
   `scripts/rom-models/wsobj.mjs`, emitting the existing `ConnectOp[]` IR.
2. `.WGD2` aliasing (mirroring the existing `.WL2` by-reference aliasing).
3. Tests: the two `models.ts`-quoted stroke sequences as oracles; index-range
   invariant across all 24 objects; `MOVD` explicitly skipped, not silently.
4. Re-bake → `star-wars/src/tools/romModels.generated.ts` (10 objects flip to
   `hasDrawList: true`).
5. Update the artifact's header — the "edges not recoverable" caveat becomes
   **false** and must be removed or narrowed to whatever (if anything) remains.
6. Update the compare sheet's punch-list regression pin (it currently pins 5
   pairs; it will pin 8).

**Result:** ROM objects with recoverable edges goes **14 → 24**. Compared pairs
with a real edge diff goes **5 → 8**, gaining exactly the three suspect models:
`PORT` → `EXHAUST_PORT`, `STB` → `SURFACE_TOWER`, `BNK` → `SURFACE_BUNKER`.

**Non-goals:**
- Does **not** fix `src/core/models.ts`. The tool still only reports. Fixing the
  models against the punch-list (including `DARTH_TIE`'s 12/44 drift) remains a
  separate story.
- Does not touch the red-baron or battlezone paths.

## Risks

| Risk | Mitigation |
|---|---|
| **Anchor/index-base off by one** → plausible but wholly wrong wireframes | The two `models.ts`-quoted stroke sequences must reproduce exactly; plus the index-range invariant |
| `MOVD`/state macros silently swallowed, dropping geometry | Enumerate and skip explicitly; the existing throw-on-unknown-directive guard stays armed |
| The `hasDrawList: false` caveat gets left stale in the artifact | It becomes actively misleading — scope item 5 makes removing it part of the work |
| A `.WGD` routine turns out to be genuinely unparseable (raw assembly, not macros) | Then that object keeps `hasDrawList: false` honestly. Do not guess an edge list. |
