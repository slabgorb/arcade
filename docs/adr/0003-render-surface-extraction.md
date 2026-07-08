# ADR-0003: Render-surface extraction — amend ADR-0001's scope guard

**Status:** Accepted
**Date:** 2026-07-08
**Author:** Architect (Emmanuel Goldstein) — recorded for story SH2-1
**Story:** SH2-1 (governance gate for the SH2 render-surface extraction epic)
**Amends:** [ADR-0001 — Shared-code strategy](0001-shared-code-strategy.md) (scope guard + charter). ADR-0001 is left intact; this amendment is additive and recorded here.

## Context

ADR-0001 stood up the extraction pipe — `@arcade/shared`, a version-pinned git-URL package
with subpath exports — and its first epic (SH) shipped the pure payloads `math3d`, `rng`,
`highscore`, and `loop`. ADR-0001 set two guard rails this ADR revisits:

1. **Eligibility bar.** *"Only code that is byte/algorithm-identical across ≥2 games is
   eligible."* Its "defer/skip" verdicts — **the glow primitive**, input plumbing, and the tick
   contract beyond a shared *type* — *"remain out of scope until they meet the same bar."*
2. **Charter.** ADR-0001 (and `repos.yaml`) describe `@arcade/shared` as *"pure shared logic —
   no rendering."*

The 2026-07-08 cross-repo render survey across the now-**four faithful games** (tempest,
asteroids, star-wars, battlezone) plus the lobby — specified in the
[shared render-surface extraction design](../superpowers/specs/2026-07-08-shared-render-extraction-design.md)
— found the render shells have converged enough to extract a shared **render surface**
(`font`, `glow`, `view`, `compositor`, `phosphor`) and that the cabinet should adopt **one**
render treatment rather than preserving four accidental variants. Two of the proposed modules,
however, do not clear ADR-0001's guard rails as written:

- Three modules (`glow`, `view`, `compositor`/`phosphor`) **touch the DOM** — they contradict
  the "no rendering" charter.
- `font` and `compositor`/`phosphor` have **only one consumer today** (tempest) — they do not
  meet the strict ≥2-games bar, even though the *intent* (font) or the *reserved seam*
  (compositor) justifies extracting now.

This ADR records the amendments that keep ADR-0001's audit trail honest while allowing the
render surface to be extracted. **ADR-0001 is not edited; the amendments live here.**

### Guiding principle (carried from the design)

- **Share the verb, not the numbers.** The shared code is the identical *mechanism* (set glow
  state and reset it; size the backing store to DPR; fold a scene into an afterglow buffer).
  Per-cabinet constants (blur radius, line width, decay, colours, letter spacing) stay in the
  games as parameters.
- **Conform without regressing.** Bringing a game "in line" means it uses the shared *code
  path*, **not** that it loses its look. The shared glow primitive is a **superset** that
  carries tempest's gradient + multi-pass depth; we never flatten a game to a lowest common
  denominator.

## Decision — two amendments to ADR-0001

### Amendment 1: Charter → "pure core + explicitly-flagged browser helpers"

ADR-0001's *"pure shared logic — no rendering"* is amended to **"pure core + explicitly-flagged
browser helpers."** Browser-only helpers live in `@arcade/shared` behind their own subpaths —
one package, one release cadence (matching how `/loop` already lives there) — and are **fenced
from the pure core by a source-regex purity guard** (`tests/purity.test.ts`): any *pure* subpath
(`math3d`, `rng`, `highscore`, `loop`, `font`) that references `document`, `window`, `canvas`,
`FontFace`, or `requestAnimationFrame` fails the guard. Browser subpaths are exempt by name.

| Subpath | Kind | Consumers |
|---|---|---|
| `@arcade/shared/font` | **pure** (glyph geometry + layout math) | all 5 (target) |
| `@arcade/shared/glow` | browser | 4 games + tempest |
| `@arcade/shared/view` | browser | 4 games |
| `@arcade/shared/compositor` | browser | tempest (sole, for now) |
| `@arcade/shared/phosphor` | browser | tempest (registers the pass) |

`font` is **pure** — glyph geometry + layout, no DOM, no async load — so it joins the pure core
and is protected by the guard rather than exempt from it.

### Amendment 2: Eligibility-bar verdicts for the render surface

ADR-0001 admits only code *byte/algorithm-identical across ≥2 games* and **deferred the glow
primitive**. The four-game evidence updates those verdicts (design §5):

| Module | Bar status | Justification |
|---|---|---|
| **`glow`** | **Meets (verb, not numbers) — no longer deferred** | The state-set + `shadowBlur=0` reset boilerplate is algorithm-identical ×4; the differing constants are parameters that stay in the games. ADR-0001's glow-defer was about game-specific *looks*, which the **superset** primitive preserves (gradient stroke + multi-pass depth for tempest). The verdict flips from *deferred* to *eligible*. |
| **`view`** | **Meets** | The DPR-resize dance is identical ×4; the `letterbox` math is present in ≥2 (asteroids `margin.ts`, battlezone `viewport.ts`). Standard bar. |
| **`font`** | **Convergence-driven exception** | Only tempest strokes today (n=1); the intent is to migrate the ×4 onto it (→ n=5). Justified by the explicit *shared-visual-language* goal and the non-commercial TTF's licence liability. Records the reserved **ADR-0002**. |
| **`compositor` + `phosphor`** | **Convergence-driven exception** | n=1 (tempest). This is a **relocation of existing, working code** behind a reserved extension point — not speculative generalization. The ≥2 alternative (wait for a second consumer) was offered and **consciously declined** in favour of establishing the seam now, scoped strictly to tempest's existing phosphor + shake with no new passes. |

## Decision Outcome

**`glow` and `view` proceed under ADR-0001's standard ≥2-games bar** — the deferral of the glow
primitive is lifted. **`font` and `compositor`/`phosphor` proceed as deliberate, user-approved
convergence-driven exceptions** to the ≥2-consumers rule, each with the rationale tabled above
recorded so the eligibility bar's audit trail stays honest. The charter is widened to admit
explicitly-flagged browser helpers, policed by the purity guard.

ADR-0001's scope guard is thereby amended — additively, from here — without editing ADR-0001
itself.

## Consequences

### Positive

- The shared **render surface** (`font` / `glow` / `view` / `compositor` / `phosphor`) can be
  extracted under a bar that reflects the four-game reality, not the two-game 2026-07-04 survey.
- The eligibility bar keeps a **clean audit trail**: the two n=1 admissions are named as
  exceptions with rationale, not smuggled in as if they met the ≥2 rule.
- The **compositor** establishes a reserved home for future post-processing passes (CRT,
  scanline, bloom) without building any of them now.
- The **purity guard** becomes a standing test that enforces the pure/browser fence, so the
  widened charter cannot silently rot back into "everything is browser code."

### Negative

- Two `n=1` exceptions **weaken the strict ≥2 bar** if applied carelessly. Mitigated by: naming
  them explicitly as exceptions (not precedent for a lower bar); the font exception being an
  *in-flight migration to n=5*, not a permanent n=1; and scoping the compositor strictly to
  relocating tempest's **existing** phosphor + shake — no speculative passes (YAGNI guard).
- The charter now spans pure and browser code in one package — accepted, and contained by the
  purity guard + per-subpath `Kind` labelling.

## Related Decisions

- **ADR-0001 — Shared-code strategy** ([0001-shared-code-strategy.md](0001-shared-code-strategy.md)):
  the decision this ADR amends (scope guard + charter). Left **intact**; the amendment is
  additive and recorded here.
- **ADR-0002 — Cabinet font strategy** ([0002-font-strategy.md](0002-font-strategy.md)): records
  the font-convergence decision that this ADR admits as a convergence-driven eligibility
  exception.
- **Shared render-surface extraction design**
  ([2026-07-08-shared-render-extraction-design.md](../superpowers/specs/2026-07-08-shared-render-extraction-design.md)):
  §3 (charter), §4 (module designs), and §5 (eligibility reconciliation) are the source of the
  amendments recorded here.

---

*Adapted from the Pennyfarthing architecture-decision template.*
