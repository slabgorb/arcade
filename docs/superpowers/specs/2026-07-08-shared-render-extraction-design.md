# Shared render surface — extraction design (`@arcade/shared` render modules)

**Status:** Draft (awaiting review)
**Date:** 2026-07-08
**Author:** Architect (Emmanuel Goldstein)
**Extends:** [ADR-0001 — Shared-code strategy](../../adr/0001-shared-code-strategy.md)
**Authors on acceptance:** ADR-0002 (font strategy — reserved by ADR-0001) and a new ADR-0003 (render-surface extraction) amending ADR-0001's scope guard.

---

## 1. Context

ADR-0001 stood up the extraction pipe — `@arcade/shared`, a version-pinned git-URL
package with subpath exports — and shipped the first pure payloads (`math3d`, `rng`,
`highscore`, `loop`). Its scope guard **explicitly deferred the glow primitive** and any
tick/render sharing beyond a type, because at the 2026-07-04 survey those did not meet the
bar of *"byte/algorithm-identical across ≥2 games."*

A 2026-07-08 survey across the now-**four faithful games** (tempest, asteroids, star-wars,
battlezone) plus the lobby found that the render shells have converged enough to design a
shared render surface — and that the cabinet should adopt *one* render treatment rather than
preserving four accidental variants. In-code evidence:

- **Vector-font loader** — `src/shell/font.ts` is **byte-identical in body across asteroids,
  star-wars, battlezone, and the lobby** (×4). The only diffs are comment prose and a game
  slug in one `console.warn`. The files' own comments say *"a shared lib waits until the
  duplication is real."* It is real.
- **Tempest is the exception, by design** — it renders text as **ROM stroke-vectors**
  (`vecfont.ts`, the VGMSGA 1981-ROM alphabet; `render.ts:570` strokes `layoutText(...)`). It
  does **not** load the Vector Battle TTF (`loadVectorFont`/`FontFace` appear nowhere in
  tempest src; the shipped `.ttf` and a `contactSheet.ts` reference are vestigial tooling).
- **Neon-glow stroke** — every `render.ts` runs the same recipe (`shadowColor` +
  `shadowBlur` + `lineWidth` → `stroke()`, then reset `shadowBlur=0`). Asteroids/star-wars/
  battlezone use a single-pass helper; tempest hand-sets richer per-element glow (a far→near
  gradient + a `blur 6→8→18` ramp) to cue depth in its 3D tube.
- **Canvas DPR resize + letterbox** — all four `main.ts` do the same
  `innerWidth → canvas.width = floor(W·dpr) → canvas.style.width` dance; asteroids' `margin.ts`
  (55 lines) and battlezone's `viewport.ts` (97 lines) both compute an aspect-preserving box.
- **Phosphor afterglow** — implemented once, in tempest (`phosphor.ts`): a frame-rate-corrected
  EMA accumulator (`phosphorAlpha(decay, dt) = 1 − decay^(dt·60)`) with additive compositing on
  twin device-resolution buffers. Structurally it is already a per-frame post-processing pass.

### Guiding principle — converge on best of show; tempest conforms, never flatten

The cabinet adopts **one** render treatment, choosing the best implementation at each seam and
applying it everywhere. Two rules keep that honest:

1. **Share the verb, not the numbers.** The shared code is the identical *mechanism* (set glow
   state and reset it; size the backing store to DPR; fold a scene into an afterglow buffer).
   Per-cabinet constants (blur radius, line width, decay, colours, letter spacing) stay in the
   games as parameters.
2. **Conform without regressing.** "Bring tempest in line" means tempest uses the *shared code
   path* like everyone else — **not** that tempest loses its look. The shared glow primitive is
   a *superset* capable of carrying tempest's gradient + multi-pass depth cues. We never flatten
   a game to the lowest common denominator.

## 2. Goals / Non-goals

**Goals**

- Collapse the proven duplication (font, glow, resize/letterbox) into `@arcade/shared`.
- Establish a **post-processing "additional pass" hook** (compositor) as the reserved home for
  phosphor and future display tweaks (CRT, scanlines, bloom), with tempest's existing
  phosphor+shake as the first real pass — proving the seam with working code, zero new behavior.
- Converge the cabinet's text onto the **ROM stroke-vector font**, retiring the non-commercially
  licensed Vector Battle TTF.
- Keep the pure core (`math3d`/`rng`/`highscore`/`loop`/**`font`**) Node-testable and DOM-free.

**Non-goals**

- **Porting afterglow to the other three cabinets.** Deferred. The compositor makes it a later,
  per-cabinet opt-in (with its own decay), not part of this effort.
- Adding new passes (CRT/scanline/bloom) — the hook enables them; we build none now.
- Changing any game's simulation, input, audio, or determinism-sensitive code.
- Touching each game's per-cabinet *tuning* (constants remain in the games).

## 3. Charter decision — pure core + flagged browser helpers

ADR-0001 describes `@arcade/shared` as "pure shared logic — no rendering." Three of the new
modules touch the DOM (`CanvasRenderingContext2D`, offscreen canvases). Decision:

**Browser-only helpers live in `@arcade/shared` behind their own subpaths, fenced from the pure
core by a purity-guard test.** One package, one release cadence (matches how `/loop` already
lives there). The charter amends to *"pure core + explicitly-flagged browser helpers."*

| Subpath | Kind | Consumers |
|---|---|---|
| `@arcade/shared/font` | **pure** (glyph data + layout math) | all 5 (target) |
| `@arcade/shared/glow` | browser | 4 games + tempest |
| `@arcade/shared/view` | browser | 4 games |
| `@arcade/shared/compositor` | browser | tempest (sole, for now) |
| `@arcade/shared/phosphor` | browser | tempest (registers the pass) |

The purity guard (`tests/purity.test.ts`) reads the built `dist/` as **source text** (arcade-shared
tests are untyped — see §8) and fails if any *pure* subpath (`math3d`, `rng`, `highscore`, `loop`,
`font`) references `document`, `window`, `canvas`, `FontFace`, or `requestAnimationFrame`. Browser
subpaths are exempt by name.

## 4. Module designs

### 4.1 `@arcade/shared/font` — ROM stroke-vector font (PURE)

Promote tempest's `vecfont.ts` (glyph table + layout) to the shared package. It returns stroke
geometry; **rendering** is the game's job (via `/glow`). No `FontFace`, no asset, no async load —
so it is pure and lives among the pure core, protected by the purity guard.

```ts
export const CELL_W: number
export const CELL_H: number            // tempest uses 24; scale = sizePx / CELL_H
export interface VecStroke { /* polyline in cell space [0,CELL_W]×[0,CELL_H] */ }
export interface LayoutOptions { letterSpacing?: number }   // absorbs per-game spacing (A2-2)
export function layoutText(text: string, opts?: LayoutOptions): {
  readonly strokes: readonly VecStroke[]
  readonly width: number
}
```

**Migration (the four TTF games + tempest):**

- Each TTF game replaces `loadVectorFont` + `ctx.fillText` with `layoutText(...)` + a stroke draw
  (through `/glow`), then **deletes `public/fonts/*.ttf`** and its `font.ts` TTF loader.
- Tempest re-points `vecfont` imports at `@arcade/shared/font`; its local `vecfont.ts` moves out.
  (Also drop tempest's vestigial `.ttf` + the `contactSheet.ts` `'Vector Battle'` reference.)

**Primary risk — glyph coverage.** Tempest's ROM alphabet covers what *Tempest* needed. The other
games' HUDs will need glyphs it lacks (`©`, punctuation, radar labels, "INSERT COIN", …). The
migration's first per-game task is a **glyph audit** against each game's rendered text, extending
the shared stroke table with any missing glyphs (drawn in the same VGMSGA style).

**Faithfulness trade (recorded for ADR-0002):** Asteroids/Battlezone/Star Wars had their own ROM
fonts historically. Adopting Tempest's alphabet cabinet-wide is a deliberate *shared-visual-language*
choice — aligned with CLAUDE.md ("games share a visual language") and the lobby's one-face-for-all-
tiles need — at the cost of per-cabinet HUD-font fidelity.

### 4.2 `@arcade/shared/glow` — neon stroke primitive (browser, superset)

```ts
export interface GlowStyle {
  stroke: string | CanvasGradient   // gradient support = tempest's tube depth survives
  width: number
  blur: number
}
// Sets strokeStyle/lineWidth/shadowColor/shadowBlur, runs draw, then resets shadowBlur→0
// (the reset everyone hand-writes and eventually forgets). No ctx.save/restore — the existing
// per-frame code deliberately avoids it for cost; we mirror that.
export function withGlow(ctx: CanvasRenderingContext2D, style: GlowStyle, draw: () => void): void

// Built on withGlow: moveTo/lineTo the polyline, stroke it, optional close.
export function glowPolyline(
  ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[],
  style: GlowStyle, close?: boolean,
): void
```

- Flat games (asteroids/star-wars/battlezone) → one `glowPolyline` call.
- **Tempest conforms**: its bare `strokePoly` + hand-set glow collapses onto `withGlow`; the
  far→near **gradient becomes `style.stroke`**, and the ring core+halo becomes **two `withGlow`
  calls**. Same code path, depth intact.
- Constants stay per-cabinet.

### 4.3 `@arcade/shared/view` — DPR resize + letterbox (browser + pure math)

Splits the DOM touch from the math so most of it is trivially testable.

```ts
export interface ViewportSize {
  cssWidth: number; cssHeight: number; dpr: number; deviceWidth: number; deviceHeight: number
}
// DOM: size the backing store to DPR, set the CSS size, return resolved sizes.
export function resizeToDisplay(canvas: HTMLCanvasElement, cssW: number, cssH: number, dpr: number): ViewportSize
// Pure math: aspect-preserving letterbox rect inside the canvas.
export function letterbox(canvasW: number, canvasH: number, aspect: number): {
  x: number; y: number; width: number; height: number; scale: number
}
```

Folds asteroids' `margin.ts` and battlezone's `viewport.ts` into one place. **To verify in
planning:** that the margin-vs-letterbox strategies of those two truly reconcile to this one
`letterbox` (the one spot flagged "same job, confirm details").

### 4.4 `@arcade/shared/compositor` — the "additional pass" hook (browser)

The game renders its scene into an offscreen buffer; a chain of registered passes transforms it
to the screen. No passes = a plain blit (with shake). Phosphor, shake, and future CRT/scanline/
bloom tweaks are all passes.

```ts
export interface FrameInfo { dt: number; dpr: number; width: number; height: number; shake: number }

export interface RenderPass {
  readonly name: string
  render(src: CanvasImageSource, dst: CanvasRenderingContext2D, frame: FrameInfo): void
  resize?(w: number, h: number, dpr: number): void
  clear?(): void   // hard reset on mode change (phosphor wipes its accumulator)
}

export function createCompositor(passes: readonly RenderPass[]): {
  beginScene(w: number, h: number, dpr: number): CanvasRenderingContext2D  // draw your scene here
  present(main: CanvasRenderingContext2D, frame: FrameInfo): void          // run the chain → screen
  clear(): void
}
```

- Pass-free games: `createCompositor([])` — `beginScene` returns a scratch ctx, `present` blits it
  with `shake`. No behavior change for asteroids/star-wars/battlezone.
- Registration order = pass order.

### 4.5 `@arcade/shared/phosphor` — afterglow as a pass (browser)

Promote tempest's `phosphor.ts` to a **pass factory**, not a game-imported module.

```ts
export function phosphorPass(opts: { decay: number }): RenderPass   // holds the EMA accumulator + twin buffers
export function phosphorAlpha(decay: number, dt: number): number    // pure; unit-tested
```

- Tempest: `createCompositor([phosphorPass({ decay: 0.55 })])`; its `beginScene`/`composite` dance
  collapses onto the compositor. **Tempest is the sole consumer for now.**
- Other cabinets stay pass-free until the deferred afterglow port, when each opts in with its own
  `decay` (asteroids' historical afterglow ran *longer* than tempest's).

## 5. Reconciliation with ADR-0001's eligibility bar

ADR-0001 admits only code *"byte/algorithm-identical across ≥2 games,"* and deferred the glow
primitive. This design updates that verdict with the four-game evidence:

| Module | Bar status | Justification |
|---|---|---|
| `glow` | **Meets** (verb, not numbers) | The state-set + `shadowBlur=0` reset boilerplate is algorithm-identical ×4; constants are parameters that stay in the games. ADR-0001's glow-defer was about game-specific *looks*, which this design preserves. |
| `view` | **Meets** | DPR-resize dance identical ×4; `letterbox` math present in ≥2 (asteroids, battlezone). |
| `font` | **Convergence-driven exception** | Only tempest uses strokes today (n=1); the intent is to migrate the ×4 onto it (→ n=5). Justified by the explicit *shared-visual-language* project goal + the license liability the TTF carries. Authors the reserved ADR-0002. |
| `compositor` + `phosphor` | **Convergence-driven exception** | n=1 (tempest). This is a *relocation of existing, working code* behind a reserved extension point — not speculative generalization. The ≥2 alternative (wait for a second consumer) was offered and consciously declined in favor of establishing the seam now. |

The two exceptions are deliberate and user-approved; they warrant the ADR-0003 amendment noted in
the header so the eligibility bar's audit trail stays honest.

## 6. Testing strategy

- **Untyped tests (known trap).** arcade-shared has no root tsconfig/vitest typecheck; test files
  get zero compile-time checking and run in a `node` env. Pin contracts at **runtime** or via
  **source-text regex** (`node:fs`), never compile-only annotations. Fake any needed `canvas`/
  `document` on `globalThis`.
- **Pure seams get unit tests:** `layoutText` (glyph strokes + width + spacing), `letterbox`
  (aspect math), `phosphorAlpha` (frame-rate correction).
- **DOM seams are shell-verified by running the game:** `withGlow`/`glowPolyline` (against a fake
  ctx asserting the call sequence + the `shadowBlur=0` reset), `resizeToDisplay`, and the
  compositor/phosphor buffer compositing — consistent with how tempest already validates its shell.
- **Purity guard** (§3) is itself a test: pure subpaths must not reference DOM globals.
- **Migration is behavior-preserving:** each game's existing render tests must stay green across
  the swap; visual parity (especially tempest's tube depth) is confirmed by running each game.

## 7. Packaging & release mechanics

Follow ADR-0001's git-URL flow and the known pitfalls:

- Add five subpath entries to `package.json` `exports`; one `src/*.ts` per subpath (matches the
  existing flat convention). `prepare`/`build` compiles `src/` → `dist/` (ESM + `.d.ts`).
- **Push the feat branch before any game can resolve** the git-URL dep; force-reinstall past npm
  lockfile staleness (`npm install "@arcade/shared@github:...#ref"`).
- Use **provisional feat pins** during co-development; **tag + version bump** at release, then
  re-point each consumer.
- `.ttf` assets are **removed** from the games (font goes stroke-vector); no asset ships in the lib.

## 8. Phasing

Full render surface, phased. `font` and `glow` are coupled — stroke text is ultimately drawn
*through* the glow primitive. Phase 1 lands the pure `font` data and moves the ×4 off the TTF,
stroking glyphs with each game's *existing* local glow code; Phase 2 then unifies that stroking
(text **and** shapes) onto shared `/glow`. Each phase stays shippable on its own.

| Phase | Work | Risk |
|---|---|---|
| 0 | Scaffold browser-subpath convention + **purity guard** | Lowest — proves the charter machinery |
| 1 | **font** — promote `vecfont` → pure `@arcade/shared/font`; per-game glyph audit + extend table; migrate ×4 off TTF; delete `.ttf`s; tempest re-points | **Highest** — glyph coverage, ×4 visual change; authors ADR-0002 |
| 2 | **glow** — superset primitive; migrate all 4 incl. tempest; **verify tempest tube depth preserved** | Medium — the regression watch |
| 3 | **view** — fold `margin.ts` + `viewport.ts`; migrate 4 | Low |
| 4 | **compositor + phosphor-pass** — build the hook; migrate tempest's existing phosphor **and** shake through it; tempest sole consumer | Medium — visual tuning by eye |
| deferred | register `phosphorPass` for the other three (per-cabinet decay); add new passes (CRT/scanline/bloom) | — |
| cross-cut | finish `/loop` rollout to asteroids/star-wars **iff** their sims want fixed steps (asteroids' variable-dt may be intentional — confirm before forcing) | Low |

## 9. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Glyph coverage gaps after TTF retirement | Missing/garbled HUD characters in ×4 games | Per-game glyph audit is Phase-1 task #1; extend the shared stroke table before deleting any `.ttf` |
| Flattening tempest's depth via a too-simple glow | Tube reads flat — a visual regression | `GlowStyle.stroke` accepts a gradient; multi-pass = two `withGlow` calls; visual parity gate in Phase 2 |
| Building the compositor for one consumer | Over-engineering / YAGNI | Scope strictly to relocating tempest's *existing* phosphor+shake; no speculative passes; documented as a deliberate exception (§5) |
| Untyped shared tests give false confidence | A broken contract ships green | Runtime/regex contract checks; pure seams unit-tested; migration gated on each game's existing render tests + a manual run |
| Shared bump silently alters a game | Visual/determinism regression | Per-consumer tag pinning (ADR-0001); games' own vitest runs against the pinned ref |
| Letterbox strategies don't actually reconcile | `view` can't unify margin + viewport | Confirm asteroids `margin.ts` vs battlezone `viewport.ts` reconcile to one `letterbox` before writing it (Phase 3 spike) |

## 10. Open items to confirm during planning

1. **Glyph audit** — enumerate every character each game (and the lobby) renders; diff against
   tempest's ROM alphabet; list glyphs to add.
2. **Letterbox reconciliation** — do asteroids' margin and battlezone's viewport reduce to the
   single `letterbox(canvasW, canvasH, aspect)` contract, or do they need distinct modes?
3. **Loop rollout** — is asteroids'/star-wars' variable-dt loop intentional, or should they adopt
   the shared fixed-step `/loop`?
4. **Shake placement** — carry `shake` as a `FrameInfo` field applied at final blit (simplest), or
   promote it to its own `RenderPass` (more composable)? Default to `FrameInfo` unless a second
   shake variant appears.

## 11. ADR bookkeeping (on acceptance)

- **ADR-0002 (font strategy)** — record the decision: cabinet converges on the ROM stroke-vector
  font; Vector Battle TTF retired; the faithfulness trade (§4.1) documented. Resolves the item
  ADR-0001 reserved and unblocks backlog stories bz2-2 / A2-2.
- **ADR-0003 (render-surface extraction)** — amend ADR-0001's scope guard: glow no longer deferred
  (meets the verb-identical bar); font + compositor/phosphor admitted as convergence-driven
  exceptions with the §5 rationale.
