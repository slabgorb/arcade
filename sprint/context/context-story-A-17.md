# Story A-17 Context

## Title
ROM-exact shape + velocity tables ported under reference/

## Metadata
- **Story ID:** A-17
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-1 scaffolded an empty, gitignored `reference/` directory with nothing inside
it yet — by its own note, "no reference porting happens until A-17." Since
then, ship flight (A-3) shipped with four constants explicitly tagged `verify
against reference/ quarry (A-17)` in its table (`ROTATION_RATE`,
`THRUST_ACCEL`, `MAX_SPEED`, `COAST_DECAY` — confirmed by grep: this exact
phrase appears nowhere else in the story context docs, so A-3's table is the
complete known worklist, though the implementer must also grep the landed
**code** once A-4 through A-16 exist, in case an implementation detail
introduced a marker a context doc didn't capture). Meanwhile every shape a
player sees — ship, thrust flame, rock outlines, both saucers, explosion
debris, the score font — has been drawn (or stubbed) using placeholder/sibling
default geometry, because the epic explicitly defers real shape data to this
story. A-17 closes both gaps in one pass: it stands up the actual quarry and
ports everything downstream code depends on — shape tables *and* the
surviving provisional constants — into committed, typed `core/` source, per
the epic's non-negotiable rule that **the quarry itself must never be the only
place the data lives** (the cautionary precedent: star-wars' `reference/`
existed only in the checkout that created it — the `a-3` checkout, unrelated
to story A-3 despite the name collision).

**Research pass (computerarcheology.com/Arcade/Asteroids/{VectorROM,''}.html +
6502disassembly.com/va-asteroids/).** Three fetches, budgeted and spent:

- **VectorROM.html is the real payoff.** The ROM's DVG shape data is confirmed
  to define: 16 directional **player ship** outlines, a **thrust flame** per
  ship direction, **4 rock pattern variants** (no separate small/medium/large
  tables — one silhouette per pattern, scaled per size tier at draw time —
  consistent with the epic's "large→2 medium→2 small" splitting model), **1
  UFO/saucer pattern** (again one silhouette, presumably scaled for
  large/small, mirroring the rock convention), **ship explosion debris** (6
  velocity-paired pieces), **shrapnel** (4 spreading patterns for shot/rock
  impacts — distinct from ship debris), a **vector font** (A-Z, 0-9, space,
  punctuation), and a diagnostic **test pattern** (out of scope — attract/POST
  only, never seen in normal play).
- **Brightness is real and per-vector, not a later invention.** The DVG
  instruction encoding is confirmed to carry a `bri=` field per stroke (0–15
  range); the fetch's own quoted excerpt shows two different shapes at
  `bri=7` and `bri=12` in the same table. This **confirms** the assumption
  A-19 is written against — brightness tiers are ROM data, not a stylistic
  guess — and it means A-17's shapes must preserve per-stroke brightness, not
  flatten it away.
- **The ship's 16-facing table is a genuine open question for A-3's design,
  not just a constant swap.** VectorROM.html describes ship outlines as "16
  directional variants (0–60°)" — i.e., a small authored sector, almost
  certainly mirrored/rotated to cover all 360° (the classic vector-ROM
  storage trick, as A-3 itself speculated). This is evidence the *drawn*
  ship snaps to one of a small number of discrete facings. It does **not** by
  itself prove `ShipDir`/rotation *physics* are quantized — A-3's continuous
  `angle` (radians) may still be correct with the shape table doing nothing
  more than picking the nearest of 16 pre-rotated outlines at render time.
  **This story must settle which it is** by reading the actual quarried
  listing (not resolvable from a summarized hub fetch); if rotation truly
  advances in discrete facing-steps, express that as `ROTATION_RATE = (2π /
  facing_count) / seconds_per_step` so A-3's continuous-angle code shape is
  unaffected — a constant change, not a re-architecture.
- **Coordinate scale:** vectors use scaled/relative notation
  (`scale=02(*8)`, `scale=06(/8)`) with raw physical coordinates spanning
  roughly ±1023 — consistent with A-3's adopted ~1024×768-ish world space
  decision; no unit-conversion layer needed.
- **6502disassembly.com/va-asteroids/ (hub) confirms, again, that sound is
  simply absent from this documentation** — no chip, no circuit, no routine
  is mentioned (feeds directly into A-18). It also names the project's real
  provenance: a **SourceGen** (v1.8+) disassembly of Asteroids rev-4, building
  on earlier work by Lonnie Howell, Mark McDougall, and Nick Mikstas, plus a
  `dvg_disasm.cpp` tool that annotates the vector commands the listing
  contains. It points to `github.com/historicalsource/asteroids` as "original
  sources… now available" — a second, independent GitHub source alongside
  the `github.com/nmikstas/asteroids-disassembly` repo A-3 already cited for
  the drag/deceleration behavior. **Both belong in the quarry's provenance
  doc**, they are not the same thing.
- **Still not resolvable from hub-level fetches** (same lesson A-3 already
  learned the hard way): the exact `ROTATION_RATE`/`THRUST_ACCEL` byte values
  and the precise `COAST_DECAY` cadence. A-3's own research is the best lead
  so far: the nmikstas disassembly describes ship-velocity deceleration as
  "an acceleration of −1 against the **doubled** velocity value" — read
  literally, this suggests velocity is stored fixed-point-doubled and decay
  is a **periodic linear decrement**, not an exponential/multiplicative
  decay. Treat this as the leading hypothesis to confirm against the actual
  disassembly text once quarried locally (large listings summarize poorly
  through fetch tooling, as documented in A-3 — this needs a real local read,
  not another web fetch).

## Technical Approach

**1. Stand up `reference/` (gitignored).** Clone/download into
`asteroids/reference/`:
- The SourceGen project + rev-4 binary from `6502disassembly.com/va-asteroids/`
  (the `va-asteroids.zip` project set referenced by the hub).
- `github.com/historicalsource/asteroids` (original source, per the hub).
- `github.com/nmikstas/asteroids-disassembly` (the drag/deceleration source
  A-3 already leaned on).
- Links-only citations (not vendored) to `computerarcheology.com/Arcade/Asteroids/`
  and its `VectorROM.html`, `Hardware.html`, `DVG.html`, `Code.html` subpages
  (the last already used by A-3).
Write `reference/README.md` mirroring star-wars' convention exactly: a "what's
here" file table, an "external references (links only)" section, a
"provenance" note, and refresh instructions (re-run `dvg_disasm.cpp`,
re-clone both repos). State plainly, as star-wars' README does, that this
directory is a personal study quarry, never committed, never redistributed.

**2. Port shape data into `core/shapes.ts`.** Unlike star-wars' `models.ts`
precedent — where the disassembly gave vertices only and edges had to be
*re-authored* by hand because the AVG draw routines weren't recoverable —
Asteroids' DVG format is a native **ordered, pen-relative stroke path**
(`SVEC`/`VEC` draw commands with `dx`,`dy`,`bri`), so there is no
graph-reconstruction step: the ROM data already encodes connectivity as a
sequence. Model this directly rather than forcing star-wars' vertex/edge
shape onto it:

```ts
export interface VectorStroke {
  readonly dx: number
  readonly dy: number
  readonly brightness: number // ROM DVG intensity, 0-15
}
export interface VectorShape {
  readonly name: string
  readonly strokes: readonly VectorStroke[]
}
```

Port, with a source citation per shape (mirroring `models.ts`'s comment
style):
- **Ship** — resolve the facing-table question above; land either 16
  pre-rotated outlines or one outline + a documented rotation-offset
  convention, whichever the quarry actually shows.
- **Thrust flame** — one per ship facing (or one shape rotated alongside the
  ship, matching whichever ship representation was chosen).
- **4 rock pattern variants** + a `ROCK_SCALE` table keyed by size tier
  (large/medium/small) — one silhouette per pattern, scaled, not 12 distinct
  shapes.
- **Saucer** — 1 pattern + a large/small scale factor (mirrors the rock
  convention).
- **Explosion debris** — the 6 velocity-paired ship-breakup pieces.
- **Shrapnel** — the 4 shot/rock-impact spread patterns (kept distinct from
  ship debris, matching the ROM's own separation).
- **Vector-font glyphs** — port the ROM digit/punctuation stroke data as core
  data (satisfying this story's "ROM-exact… tables" remit) but **do not**
  require rewiring the renderer to hand-stroke it: the epic's reuse-first
  rule points `shell/font.ts` at star-wars' actual pattern, which — contrary
  to what "vector font" suggests — is a licensed **TTF web font** ("Vector
  Battle") loaded via `FontFace`, not ROM stroke data at all. That is a real
  tension between the epic's "copy star-wars' font.ts" instruction and this
  story's "port the vector-font glyphs" instruction; resolve it by treating
  the glyph *data* port as this story's deliverable (committed, cited,
  tested) and leaving the *rendering* choice (TTF face vs. hand-stroked ROM
  glyphs) to whichever story next touches the HUD — don't force a rendering
  change nobody asked for.

**3. Replace A-3's provisional constants.** Grep both the context docs (done
above — only A-3 carries the phrase) and, by the time this story lands, the
actual `core/ship.ts` for the literal string `verify against reference/
quarry` / `verify vs quarry`. For each hit, pull the quarry-verified value and
land it as a named export, then produce a **before → after table in the PR**:

| Constant | Provisional (A-3) | Quarry-verified | Source |
|---|---|---|---|
| `ROTATION_RATE` | π rad/s (feel) | _from quarry_ | disassembly listing |
| `THRUST_ACCEL` | tuned to ~1s-to-max (feel) | _from quarry_ | disassembly listing |
| `MAX_SPEED` | 111 (+) / 112 (−) (corroborated) | _confirm exact bytes_ | disassembly + Code.html |
| `COAST_DECAY` | gentle feel-based decay | _mechanism + rate_ | nmikstas disassembly, resolved per the doubled-velocity lead above |

**4. Resolve `COAST_DECAY` explicitly.** Land the mechanism (linear periodic
decrement is the leading hypothesis — see Research pass) and its exact rate
as a named constant, replacing A-3's "gentle feel-based" placeholder. If the
real listing contradicts the doubled-velocity hypothesis, document the actual
mechanism found instead — don't force-fit the hypothesis.

**5. A minimal contact-sheet render.** The "shapes render recognizably" AC
needs *some* way to eyeball them — a small dev-only debug page or a
Vitest-driven canvas snapshot that draws every `VectorShape` in a grid is
enough; this is not a request to redesign `render.ts`, and wiring the real
shapes into the actual gameplay render path (where earlier stories used
placeholders) is in scope as a mechanical swap, not a redesign.

## Scope
- **In scope:** `reference/` directory + `README.md` (provenance, refresh
  steps); `core/shapes.ts` with all shape tables above, cited per shape;
  `ROCK_SCALE`/saucer scale constants; replacing A-3's four provisional
  constants with quarry-verified values + PR before/after table; resolving
  `COAST_DECAY`'s mechanism and rate; a debug contact-sheet render for the
  eyeball AC; pointing the real gameplay render path at the new shapes where
  earlier stories used placeholders; Vitest coverage for all shape data and
  constants.
- **Out of scope:** brightness→glow rendering tiers and feel calibration
  (A-19 — this story only *carries* the brightness data forward unflattened);
  sound (A-18); any new gameplay behavior beyond swapping constant values (no
  re-tuning feel beyond what the quarry dictates); rewiring `shell/font.ts`
  off the TTF-face pattern onto hand-stroked glyphs (deferred, see above);
  the diagnostic test-pattern shape (attract/POST only).

## Acceptance Criteria
- Every shape table (ship [+ resolved facing/rotation convention], thrust
  flame, 4 rock variants + scale tiers, saucer + scale tiers, 6-piece
  explosion debris, 4 shrapnel patterns, font glyphs) is committed as typed
  TS in `core/shapes.ts`, cites its ROM source per shape, and preserves
  per-stroke brightness (0–15) unflattened.
- A dev-facing contact sheet (debug page or generated canvas snapshot) lets a
  human eyeball each shape against the reference description/images;
  recognizability is signed off in the PR.
- The A-3 provisional-constants table is fully replaced with quarry-verified
  values in `core/ship.ts`; the PR includes the before/after table above,
  filled in with real numbers and sources.
- `COAST_DECAY`'s exact mechanism (periodic decrement vs. fractional
  multiply) and rate are settled, documented, and cited.
- No occurrence of `verify against reference/ quarry` / `verify vs quarry`
  remains in `core/` after this story (context docs may retain the phrase as
  historical record).
- `reference/` stays gitignored; nothing under it is committed; `README.md`
  documents provenance for both GitHub sources and the SourceGen hub.
- Determinism preserved: the existing banned-globals guard test continues to
  pass unmodified over `core/shapes.ts` and the updated `core/ship.ts`.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

## Carry-forward: A-6 + A-7 provisional rock constants now in `core/rocks.ts` (A-7 done 2026-07-03)

This story's AC — **"no occurrence of `verify vs quarry` remains in `core/`"** — and its
before/after PR table must cover **more than A-3's four ship constants**. A-6 (rock entities)
and A-7 (splitting) each landed provisional rock constants carrying the same marker. Extend
the swap worklist (source: `sprint/archive/A-6-session.md`, `sprint/archive/A-7-session.md`):

| Constant (`core/rocks.ts`) | Provisional | Quarry-verify | From |
|---|---|---|---|
| `ROCK_SHAPE_VARIANT_COUNT` | 4 (from a `%00011000` 2-bit-mask lean) | exact variant count | A-6 |
| `ROCK_HITBOX` large/med/small | 132 / 72 / 42 | **box-vs-radius semantics** (also A-8's hit test) | A-6 |
| `ROCK_SPEED_MIN` / `ROCK_SPEED_MAX` per tier | 4–8 / 8–16 / 16–32 (feel) | per-tier drift bands | A-6 |
| `SPLIT_SPREAD_ANGLE` | `Math.PI / 6` (±30°/child) | split spread formula | **A-7** |
| `SPLIT_SPEED_SCALE` | `{large: 1, medium: 1.1, small: 1.25}` | per-child-tier speed scale | **A-7** |

Notes for the swap:
- A-6/A-7 tests **pin relationships, not magnitudes** (positivity, tier ordering, in-band
  clamp, `MIN ≤ MAX`), so swapping these values needs **no test edits** — same discipline as
  A-3's four constants.
- The DVG shape port here (`core/shapes.ts`, "4 rock pattern variants") is the same "4
  variants" that `ROCK_SHAPE_VARIANT_COUNT` names — reconcile the count against the real table.
- `ROCK_HITBOX`'s box-vs-radius ambiguity is **also A-8's** open question (its hit-test
  threshold) — resolve it once, here.
- A-8 (collisions) will likely add `SHIP_HITBOX` + a hit-test-shape constant carrying the same
  marker before this story runs. **Grep `core/` for `verify vs quarry` at implementation
  time** (this doc already anticipates that) to catch any constant this table misses.

---
_Generated by `pf context create story A-17` from the sprint YAML._
_Enriched by Winston Smith (SM) 2026-07-03: added the A-6/A-7 provisional-rock-constants swap
worklist (ROCK_SHAPE_VARIANT_COUNT, ROCK_HITBOX, ROCK_SPEED_MIN/MAX, SPLIT_SPREAD_ANGLE,
SPLIT_SPEED_SCALE) — this story's "no marker remains" AC must clear these too, not just A-3's
ship constants. Source: `sprint/archive/A-6-session.md`, `sprint/archive/A-7-session.md`._
_Enriched by Architect (Goldstein): reference/ quarry provenance plan, DVG
shape-table design (native stroke-path model vs. star-wars' vertex/edge
graph), brightness-field confirmation, the ship 16-facing open question, the
provisional-constants swap plan, and the COAST_DECAY resolution hypothesis —
via VectorROM.html, the 6502disassembly.com hub, and the computerarcheology.com
hub (3 fetches spent)._
