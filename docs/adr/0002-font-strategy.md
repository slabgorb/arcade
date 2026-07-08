# ADR-0002: Cabinet font strategy — converge on the ROM stroke-vector font, retire the Vector Battle TTF

**Status:** Accepted
**Date:** 2026-07-08
**Author:** Architect (Emmanuel Goldstein) — recorded for story SH2-1
**Story:** SH2-1 (governance gate for the SH2 render-surface extraction epic)

## Context

ADR-0001 reserved a decision it deliberately did not make: **which vector-font approach the
cabinet standardises on.** Its "Related Decisions" flagged *"two incompatible text
approaches — a non-commercial-licensed 'Vector Battle' TTF (lobby/star-wars/asteroids) vs
tempest's ROM stroke-vector font — that is a decision, not a duplication,"* named it the
**future ADR-0002**, and noted it gates backlog stories **bz2-2** (battlezone adopt shared
font) and **A2-2** (asteroids letter spacing).

The 2026-07-08 cross-repo render survey (see the
[shared render-surface extraction design](../superpowers/specs/2026-07-08-shared-render-extraction-design.md),
§4.1) confirmed and sharpened the picture across the four faithful games plus the lobby:

- **The TTF camp (×4).** `src/shell/font.ts` is **byte-identical in body across asteroids,
  star-wars, battlezone, and the lobby** — it loads the **non-commercially-licensed "Vector
  Battle" TTF** via `loadVectorFont` / `FontFace` and paints with `ctx.fillText`. The only
  diffs are comment prose and a game slug in one `console.warn`.
- **Tempest, the exception by design.** Tempest renders text as **ROM stroke-vectors** — the
  **VGMSGA 1981-ROM alphabet** in `vecfont.ts`, stroked by `render.ts` via `layoutText(...)`.
  It loads **no** TTF (`loadVectorFont` / `FontFace` appear nowhere in tempest src; the shipped
  `.ttf` and a `contactSheet.ts` reference are vestigial tooling).

Two accidental variants of the same concern now ship side by side. Left unresolved, they
block a shared `/font` module, keep the lobby dependent on the TTF for its tiles, and leave a
non-commercial licence liability in four repos. This is the decision ADR-0001 deferred.

### Decision Drivers

- **Shared visual language.** CLAUDE.md's standing goal is that the games *"share a visual
  language — glowing vector lines on black."* One text face across the whole cabinet serves
  that goal; four faces (three TTF + tempest's strokes) do not.
- **One face for all lobby tiles.** The lobby renders every game's name; a single cabinet-wide
  face is the coherent choice for the front door.
- **Licence liability.** The Vector Battle TTF is **non-commercially licensed**. Shipping it in
  four repos carries an avoidable liability the stroke-vector font does not.
- **Purity / testability.** A stroke-vector font is **glyph geometry + layout math** — DOM-free,
  Node-testable, no async `FontFace` load. It can join `@arcade/shared`'s pure core; a
  `FontFace`-loaded TTF cannot.
- **Best-of-show convergence.** The SH2 charter chooses the best implementation at each render
  seam and applies it everywhere. Tempest's ROM stroke font is the historically faithful,
  licence-clean, sharable option.

## Considered Options

### Option 1: Standardise on the Vector Battle TTF (retrofit tempest onto it)

Make the four TTF games canonical; migrate tempest onto the TTF too.

**Pros:**
- Three of four games already ship it; the lobby already reads it.

**Cons:**
- **Flattens tempest** away from its faithful ROM stroke-vectors — a deliberate look loss.
- Keeps a **non-commercial licence liability** in every repo and adds it to tempest.
- TTF loading is **async `FontFace` + DOM** — it can never be part of the pure, Node-testable
  shared core, so a shared `/font` would have to be a browser module.

### Option 2: Keep both (per-cabinet HUD-font fidelity)

TTF games keep the TTF; tempest keeps its strokes; no convergence.

**Pros:**
- Preserves each cabinet's exact current text look.

**Cons:**
- Freezes the **accidental divergence** ADR-0001 exists to stop; blocks a shared `/font`.
- Retains the licence liability and the lobby's TTF dependency.
- Contradicts the shared-visual-language goal — the cabinet keeps four text treatments.

### Option 3: Converge on the ROM stroke-vector font, retire the TTF *(recommended)*

Promote tempest's `vecfont.ts` to a **pure** `@arcade/shared/font` (glyph table + `layoutText`
layout, returning stroke geometry — rendering stays the game's job). Migrate the four TTF
consumers to `layoutText(...)` + a stroke draw, **delete `public/fonts/*.ttf`** and their
`font.ts` TTF loaders. Tempest re-points its `vecfont` imports at the shared module.

**Pros:**
- **One licence-clean face cabinet-wide**, serving the shared visual language and the lobby.
- Font becomes **pure, shared, and unit-testable** (glyph strokes, width, letter spacing).
- Removes the non-commercial TTF liability from four repos; ships no font asset in the library.
- Keeps tempest faithful — it already *is* this font — while everyone else conforms to the
  shared code path.

**Cons:**
- The three TTF games lose their **historical per-cabinet HUD-font fidelity** — a deliberate
  trade (see below).
- **Glyph coverage:** tempest's ROM alphabet covers what *Tempest* needed; the other HUDs may
  need glyphs it lacks (`©`, punctuation, radar labels, "INSERT COIN", …). A per-game glyph
  audit and stroke-table extension precede any TTF deletion.

## Decision Outcome

**Chosen option: Option 3 — the cabinet converges on the ROM stroke-vector font (VGMSGA), and
the Vector Battle TTF is retired.**

`vecfont.ts` is promoted to a pure `@arcade/shared/font` module (glyph geometry + `layoutText`
layout). The four TTF consumers (asteroids, star-wars, battlezone, lobby) migrate off
`loadVectorFont` / `ctx.fillText` onto `layoutText(...)` + a stroke draw, and delete their
bundled `.ttf` and TTF loader. Tempest re-points at the shared module. Per-game letter spacing
is preserved through `layoutText`'s `letterSpacing` option (this absorbs the **A2-2** concern).

**Faithfulness trade (the decision this ADR is here to record).** Asteroids, Battlezone, and
Star Wars had their own ROM fonts historically. Adopting *Tempest's* alphabet cabinet-wide is a
**deliberate shared-visual-language choice over per-cabinet HUD-font fidelity** — aligned with
CLAUDE.md's shared-visual-language goal and the lobby's one-face-for-all-tiles need, at the cost
of each cabinet's historically exact HUD face. We accept that trade knowingly.

This decision **resolves the item ADR-0001 reserved** and unblocks the SH2 font-migration
stories (SH2-4 asteroids, SH2-5 battlezone, and the star-wars/lobby equivalents).

## Consequences

### Positive

- One licence-clean, historically-faithful text face across the whole cabinet and lobby.
- `font` joins `@arcade/shared`'s **pure core** (DOM-free, Node-testable) — a shared,
  regression-tested layout contract instead of four hand-copied loaders.
- The non-commercial Vector Battle TTF liability is removed from four repos; no font asset
  ships in the shared library.

### Negative

- The three TTF cabinets lose their historical per-cabinet HUD-font fidelity (the accepted trade).
- A **per-game glyph audit** is required before deleting any `.ttf`: enumerate every glyph each
  game and the lobby render, diff against tempest's ROM alphabet, and extend the shared stroke
  table (in the same VGMSGA style) for anything missing.

### Supersession of prior work

This supersedes the **TTF approach that done stories bz2-2 and A2-2 established:**

- **bz2-2** ("arcade vector font") adopted the Vector Battle TTF in battlezone. **SH2-5** evolves
  battlezone onto the stroke-vector font.
- **A2-2** ("adjust letter spacing for the vector font") tuned the TTF's spacing in asteroids
  under an explicit *"ADR-0002 bypass"* — treating bz2-2's TTF as the de-facto settled strategy.
  This ADR settles that strategy formally in the other direction (strokes, not TTF); **SH2-4**
  migrates asteroids, carrying the A2-2 letter-spacing intent forward via `layoutText`'s
  `letterSpacing` option.

## Related Decisions

- **ADR-0001 — Shared-code strategy** ([0001-shared-code-strategy.md](0001-shared-code-strategy.md)):
  reserved this decision as "future ADR-0002" and noted it gates bz2-2 / A2-2. Left **intact**;
  this ADR resolves the item it reserved.
- **ADR-0003 — Render-surface extraction** ([0003-render-surface-extraction.md](0003-render-surface-extraction.md)):
  records `font` as a **convergence-driven exception** to ADR-0001's ≥2-consumers eligibility
  bar (only tempest strokes today; the migration takes it to n=5).
- **Shared render-surface extraction design**
  ([2026-07-08-shared-render-extraction-design.md](../superpowers/specs/2026-07-08-shared-render-extraction-design.md)):
  §4.1 specifies the pure `@arcade/shared/font` module, the migration, the glyph-coverage risk,
  and the faithfulness trade recorded here.

---

*Adapted from the Pennyfarthing architecture-decision template.*
