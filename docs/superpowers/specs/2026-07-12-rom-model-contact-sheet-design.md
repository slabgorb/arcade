# ROM model contact sheet — design

**Date:** 2026-07-12
**Status:** Approved (design) — not yet planned
**Author:** Architect
**Follows:** [`2026-07-12-vendor-source-design.md`](./2026-07-12-vendor-source-design.md)

## Problem

Star Wars' wireframes are **guesses**. `star-wars/src/core/models.ts` says so:

> EDGES are authored here, not ported: `Object_3D_Data.asm` holds vertex tables
> only — the line-segment connectivity lived in the AVG vector-draw routines,
> which are not recoverable by object name from the disassembly we have. The
> wireframe is therefore derived from the geometry itself.

Every edge in the game was reconstructed by heuristic and then re-authored by
hand across stories 8-2, 8-4, 8-5, 8-10 and sw3-11. Nobody has ever seen what
the ROM actually drew.

`just vendor-source` (2026-07-12) changed that. `WSOBJ.MAC` ships **both** halves
— the vertex tables *and* the draw lists — and it is now greppable ASCII on disk.
The connectivity was never unrecoverable. We just didn't have the source.

This tool parses that source and shows, side by side, **what the ROM intended vs
what we ship**.

## The discovery this design rests on

Three findings, each verified against the vendored source, not inferred.

### 1. The draw lists are right there

`WSOBJ.MAC` pairs a vertex table (`.WP`) with a draw list (`.WL`):

```asm
.S=13.                    ; scale
.WP TIE                   ; vertex table
.P 0,0,0                  ;   index 0 — object anchor, not drawn
.P -10,-16,18             ;   index 1 — LEFT OUTER FIN
...
.WL TIE                   ; draw list  ← the connectivity we never had
.BD 1,2,3,4,5,6,1         ;   pen up → 1, then draw 1→2→3→4→5→6→1
.LD 7,8,9,10,11,12,7      ;   draw polyline (small circle on fin)
.LEND
```

### 2. All three AVG games share one connect-list idiom

Connectivity is a byte stream of `vertexIndex × stride + penFlag`, `$FF`-terminated.
Only the constants differ:

| Game | Encoding | Pen down | Pen up | Other |
|---|---|---|---|---|
| star-wars | `idx*4 + op` | `.LD` = 0 | `.BD` = 1 | `.D` damage = 2 |
| red-baron | `idx*6 + op` | `VSBLEV` = 1 | `BLANKV` = 0 | `SEGSTR` = 4 |
| battlezone | `idx*8 + op` | `cmd` = 4 | `cmd` = 0/2/3 | `cmd 5` dot-burst |

`.BD` semantics are **confirmed from the macro expansion**, not guessed:

```asm
.MACRO .LD ...            ; ";VISIBLE, DECIMAL"
  .BYTE .A'.*4            ;   flag 0 → draw
.MACRO .BD .1,...         ; ";BLANK , DECIMAL"
  .BYTE .1'.*4+1          ;   flag 1 → pen UP, first arg only
  .LD .2 .3 ...           ;   ...then delegates the REST to .LD (draw)
```

So `.BD a,b,c` = *move dark to `a`, then draw `a→b→c`*. It starts a new stroke.

### 3. `WSOBJ.MAC` is HEX, and there are two vertex macros

**This is the load-bearing finding.** `WSOBJ.MAC:2` does `.INCLUDE WSCOMN`, and
`WSCOMN.MAC:5` is `.RADIX 16`. The file assembles in **hex**. The two vertex
macros differ *only* in whether they force decimal:

```asm
.MACRO .P  .1,.2,.3
  .WORD .1'.*.S, ...      ; the '. appends a decimal point → args are DECIMAL
.MACRO .PH .1,.2,.3
  .WORD .1'*.S, ...       ; no decimal point → args use current radix = HEX
```

**`.PH` means "Point, Hex."** `.PH -20,0,-18` is `(-0x20, 0, -0x18)` = **(-32, 0, -24)**,
not (-20, 0, -18). A parser that reads them as decimal produces vertices at ~60%
of true magnitude — geometry that *looks plausible and is silently wrong*.

This is a known trap in this codebase: red-baron's `RBARON`/`RBGRND` equates are
also `.RADIX 16`, and misreading them caused a real bug (`ALT_MAX`, fixed in rb3-8).
Same Atari house style. The parser MUST honor `.RADIX` and the `N.` decimal suffix.

Usage in `WSOBJ.MAC`: `.P` × 376, `.PH` × 26. The hex vertices belong to exactly
three objects — and one of them is the exhaust port:

| ROM object | Hex verts | Port model |
|---|---|---|
| `WPN` (wall panel) | 8 | `TRENCH` / `TRENCH_SQUARE` |
| `WFF` | 6 | — |
| **`PORT` (exhaust port)** | **12 (all of them)** | **`EXHAUST_PORT`** |

`EXHAUST_PORT` is one of the models `models.ts` admits was reconstructed
("*story 8-5 … added the ring-based EXHAUST_PORT*"). The model most likely to be
wrong is also the one whose vertices are hex-encoded.

Connect-list args (`.LD`/`.BD`) and `.S=N.` scales are decimal-forced by their
macros, so they are unaffected — the hex trap is confined to `.PH`.

## Architecture

```
~/Projects/<game>-source-text/*.MAC          ← vendor-source output (exists)
        │
   [per-game source parser]                  ← the only genuinely new code
        │
   VectorPicture[]                           ← the IR (already exists, see below)
        │
   bake ──▶  star-wars/src/tools/romModels.generated.ts   (committed artifact)
        │
   contactSheet.ts (exists) ──▶  ROM │ PORT side-by-side + edge diff
```

Four deliberate reuse decisions:

1. **The IR already exists.** red-baron's `src/core/topology.ts` defines
   `Point3`, `ConnectOp{point, draw}` and `VectorPicture{points, connect}`.
   That is exactly the right shape. Promote it; do not invent a parallel type.

2. **`VectorPicture` is strictly richer than `Model3D`.** `Model3D.edges` is
   unordered index-pairs — it discards the *beam path*. The connect list
   preserves stroke order, which is what the ROM actually intended (and why
   `SURFACE_TOWER` had to be re-authored from stroke order in sw3-11). Edges are
   a **lossy derivation** of the connect list, computed for comparison only:

   ```
   VectorPicture (ROM truth: points + ordered pen strokes)
           └─ derive ─▶ Model3D.edges (lossy: unordered pairs) ─▶ diff vs port
   ```

3. **Bake, don't live-parse.** The vendored source lives at `~/Projects/*-source-text`
   and is in no repo, so a browser page cannot import it. This repo already solved
   this exact problem twice — `star-wars/tools/pokey-bake` and `tools/speech-bake`
   parse machine-local ROM data and emit a committed artifact. Same pattern. The
   generated file *is* the audit record.

4. **Reuse the contact sheet.** `src/tools/contactSheet.ts` + `core/modelView.ts` +
   `shell/wireframe.ts` + `models.html` already render a spinning grid through the
   game's own glow pipeline. It gains a compare mode, not a rewrite.

### Parser

Two input paths, because the games store geometry differently:

- **Macro text** (star-wars, red-baron) — parse the assembler macros directly.
  The macros *are* the semantic layer; no byte-decoding needed.
- **Binary ROM image** (battlezone) — byte-decode `idx*8 + cmd`. The algorithm
  already exists in `battlezone/src/core/models.ts`; port it, don't redesign it.

A **dialect** is just a table of *macro name → op emitter*, plus radix rules:

```
.P  x,y,z   →  vertex, args DECIMAL, × current .S
.PH x,y,z   →  vertex, args HEX (radix 16), × current .S
.LD a,b,c   →  [draw a, draw b, draw c]
.BD a,b,c   →  [MOVE a, draw b, draw c]        ← pen up on FIRST arg only
.S=13.      →  scale for subsequent vertices
.WP TIE     →  begin vertex table for object TIE
.WL TIE     →  begin draw list for object TIE
.LEND       →  end draw list
```

Index 0 of each table is the object anchor (`.P 0,0,0`) — metadata, not a drawn
point. `models.ts` already drops it; the parser must too, and must therefore
rebase connect-list indices consistently. (Draw lists index from 1 = first real
vertex, matching the existing port convention.)

### Two oracles — the correctness gate

A parser we cannot check is worse than no parser: it would produce confident,
wrong geometry and we would *believe* it. Both paths get pinned against
hand-verified ground truth **before** star-wars' output means anything.

| Oracle | Ground truth | Validates |
|---|---|---|
| **red-baron** | `topology.ts` + `biplane.ts` — hand-transcribed byte-for-byte from the macro text (42 verts; `DB_MAP`/`DB_MAR`/`DB_LNS`) | **the macro parser**, incl. radix |
| **battlezone** | `models.ts` — byte-exact ROM decode | **the byte decoder** |
| star-wars | vertices ported ✅ / **edges guessed ❌** | *the unknown — what we're here to fix* |

The oracles are **headless tests**, not sheets. Cheap, CI-able, no rendering.
red-baron is the one that catches a radix error: hex-vs-decimal drift blows up
vertex equality immediately.

If an oracle fails, the tool is lying and star-wars' output is discarded.

### Compare sheet

star-wars only — that is where the drift is *and* where the sheet already exists.
red-baron and battlezone need no page; their comparison is a test.

```
┌──────────────────────────────┐
│  TIE FIGHTER                 │
│   [ROM]        [PORT]        │
│    ✳            ✳            │
│  V:52 E:61    V:52 E:48      │
│  ⚠ 13 in ROM not in port     │
│  ⚠  0 in port not in ROM     │
└──────────────────────────────┘
```

Both cells share one camera, spin and glow pipeline, so any difference is
geometry, not framing. Edges present in only one side are highlighted.

### Known ROM↔port drift (already visible)

`WSOBJ.MAC` holds 21 objects. Mapping them against the `MODELS` registry:

| ROM | Port | Note |
|---|---|---|
| `TIE` | `TIE_FIGHTER` | edges guessed |
| `TI1`/`TI2`/`TI3` | `TIE_WING_FRAG_1/2/3` | |
| `RTH` | `DARTH_TIE` | edges guessed |
| `PORT` | `EXHAUST_PORT` | **hex verts + reconstructed edges — highest risk** |
| `TW1`/`TW2`/`TW3` | `SURFACE_TOWER`/`TOWER_CAP` | |
| `BK1`/`BK2`/`BK3` | `SURFACE_BUNKER` | |
| `WG1`/`WG2`/`WG3` | `TRENCH_TURRET` | |
| `WPN`, `WGA`, `WFF` | `TRENCH`/`TRENCH_SQUARE` | hex verts in `WPN`/`WFF` |
| **`XW` (X-Wing, 61 verts)** | **— none —** | **ROM ships it; we don't** |
| **`YW` (Y-Wing, 59 verts)** | **— none —** | **ROM ships it; we don't** |

`DEATH_STAR`, `DEATH_STAR_SURFACE` and `TRENCH_CATWALK` have no `WSOBJ.MAC`
counterpart — they come from `WSBASE.MAC` / `WSPANL.MAC` and are out of scope for
v1 (see Non-goals).

## Scope

**v1 delivers:**

1. `scripts/bake-models.mjs` at the orchestrator root, beside `vendor-source.mjs`
   — macro parser, radix handling, star-wars + red-baron dialects, battlezone
   byte decoder. Pure core exported for unit tests, mirroring `vendor-source.mjs`.
2. `just bake-models <game>` — reads `~/Projects/<game>-source-text`.
3. **Oracle tests** — red-baron and battlezone round-trip against their existing
   hand-verified data.
4. `star-wars/src/tools/romModels.generated.ts` — committed artifact.
5. Compare mode in `star-wars/src/tools/contactSheet.ts` + `models.html`.

**Deliverable:** a punch-list of exactly which star-wars models have wrong edges,
and what the ROM actually drew.

**Non-goals (v1):**

- **Does not auto-rewrite `models.ts`.** You look first; fixing is a follow-up
  story, informed by the punch-list. The tool reports; it does not mutate the game.
- **Does not cover asteroids or tempest** — 2D shapes, a different model concept
  and a different renderer. Sub-project ③.
- **Does not cover `WSBASE`/`WSPANL`** (Death Star, trench panels) — different
  source files, different structure.
- The generated artifact lands in `src/tools/`, **never `src/core/`** — it is
  dev-tool data and must stay out of the deterministic core (purity rule).

## Roadmap

This design is sub-project ① of three. It carries all the architectural risk —
the IR, the radix handling, the bake step, the compare renderer.

- **① (this spec)** — spine + star-wars + both oracles.
- **②** — red-baron: reuse the spine to surface geometry it has never had in a
  registry (its shapes are scattered across `biplane.ts`/`topology.ts`/`landscape.ts`).
- **③** — asteroids + tempest: the 2D sheet. Only worth doing once ① proves the IR.

Each gets its own spec → plan → build.

## Risks

| Risk | Mitigation |
|---|---|
| **Radix misread** → silently wrong geometry | `.RADIX`/`N.` handling is explicit; **red-baron oracle catches it** |
| `.BD` pen semantics inverted → every wireframe wrong | Confirmed from macro expansion; oracles prove it |
| Anchor/index-rebase off-by-one | Oracles catch it (red-baron's 42 verts are exact) |
| Parser drifts from a hand-tuned port and we "fix" the *port* to match a buggy tool | Oracles gate the tool **before** star-wars output is trusted. A failing oracle discards the run. |
| Baked artifact goes stale vs the source | It is committed and regenerable; `just bake-models` is idempotent |
