# Story A-19 Context

## Title
DVG-authentic glow/brightness + feel calibration vs footage

## Metadata
- **Story ID:** A-19
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
The epic is explicit that earlier stories render with "the sibling games'
default glow style" and defers DVG-authentic brightness tuning to this story.
That default, read directly out of `star-wars/src/shell/render.ts`, is a flat
convention: every stroked line gets the same `ctx.lineWidth = 2` and
`ctx.shadowBlur = 12` (bullets/ship/hud glyphs all look equally bright; only
`ctx.shadowBlur = 0` vs. `12` toggles glow on/off at all, and one exception
scales blur by a fade fraction — `12 * life` — on dying fireballs). Neither
sibling currently varies glow by a *shape's own* brightness data, because
neither ships a shape table that carries any — this story is the first to
have one.

A-17's research pass **confirms** the premise this story was written on: the
DVG hardware really does carry a per-vector `bri=` field (0–15) in its shape
data, and A-17's `core/shapes.ts` preserves it unflattened rather than
discarding it. So A-19's job is concrete and no longer conditional: turn
those confirmed intensity values into an actual Canvas 2D brightness/glow
system, then calibrate the whole picture — framing, relative intensities,
overall feel — against reference footage, the way the epic's fidelity
authority chain says feel calibration should work (tier 3: "observed behavior
in footage/MAME," for feel only, never for hard constants).

## Technical Approach

**Brightness tiers, grounded in what the data actually contains.** Don't
invent an arbitrary bucketing of the full 0–15 range up front — the fetched
excerpt of A-17's source data only ever showed a couple of distinct values
in practice (`bri=7`, `bri=12`), suggesting the ROM uses a small, specific
set of levels, not the whole scale. Audit the actual set of `brightness`
values present across `core/shapes.ts` once A-17 lands, and map **that**
concrete set 1:1 to Canvas 2D presets (some combination of `shadowBlur`
magnitude, `lineWidth`, and/or stroke alpha) — a lookup table keyed by the
ROM's own levels, not a guessed formula. This keeps the mapping traceable
back to real data instead of an invented curve.

**Relative intensities called out explicitly by the story title:**
bullets/ship/explosions need their glow tuned relative to each other and to
the ambient rock/saucer geometry — classic vector-monitor bullets read as
the brightest thing on screen (short segment, high `bri`), ship outline
mid-bright and steady, explosion debris a brief spike. Use the tier lookup
above to express this rather than hand-picking per-entity constants that
drift out of sync with the shape data.

**Rendering technique stays within what's already proven** — Canvas 2D
`shadowBlur` + `lineWidth`, the technique both `star-wars/render.ts` and
`tempest` already use for the CRT-glow look. Tempest additionally has a
phosphor-persistence accumulator (`shell/phosphor.ts` — an exponential
moving-average offscreen buffer, additively composited, for afterglow trails
on fast movers); star-wars doesn't carry this. Either the flat glow alone or
tempest's phosphor technique is in bounds per the epic ("no WebGL, no
shaders, Canvas 2D only") — pick whichever the calibration pass in practice
needs to read as authentic; don't invent a third technique.

**Aspect / overscan framing.** A-3 adopted the ROM's native ~1024×768-ish
world space as `core`'s coordinate system specifically so no unit-conversion
layer sits between quarry data and simulation. The `shell` owns scaling that
world space to the actual canvas size at render time (mirroring
star-wars' `math3d.ts`/`modelView.ts` vs. `render.ts` split) — this story
must make sure that scaling **preserves the original aspect ratio**
(letterbox/pillarbox as needed) rather than stretching to fill an arbitrary
browser window, so wrap/collision geometry reads correctly proportioned
against reference footage instead of looking squashed or overscanned.

**Calibration protocol — structured, not vibes-only.** Define a fixed set of
named reference moments and compare each against an in-game screenshot at
the matching state:
1. Attract/title screen — vector font glow vs. reference.
2. First wave, steady flight — ship + 4 large rocks at rest brightness.
3. Bullet in flight — confirm it reads brightest-on-screen, per the ROM's
   short-high-`bri` segments.
4. A rock/ship explosion at its peak frame — brightness spike vs. reference.
5. A saucer (each size) + its fire — relative brightness vs. rocks.
Document each as a named clip/screenshot pair in the PR with a side-by-side
image and a short pass/fail note — subjective, but repeatable across future
tuning passes.

**Performance.** `ctx.shadowBlur` is one of Canvas 2D's more expensive
operations; the epic's engine tolerance is 27 objects on screen
simultaneously (waves cap at 11 starting rocks + splits + saucer + bullets +
debris). Profile at that ceiling, not at a typical mid-wave count — a glow
system that's fine at 8 objects can still miss 60fps at 27.

## Scope
- **In scope:** the ROM-brightness-value → Canvas 2D preset lookup table;
  relative intensity tuning for bullet/ship/explosion/rock/saucer; aspect-
  preserving letterbox/pillarbox framing in the shell's world→canvas scale;
  the structured calibration protocol (named clips/screenshots) executed and
  documented in the PR; a performance pass at the 27-object ceiling.
- **Out of scope:** any new rendering technology (no WebGL, no shaders — the
  epic is explicit); shape/brightness *data* itself (A-17 owns extraction);
  sound (A-18); gameplay/physics changes of any kind — this story only
  touches how already-correct state is drawn.

## Acceptance Criteria
- Brightness tiers are driven by the actual set of ROM `brightness` values
  found in A-17's `core/shapes.ts` (a cited lookup table), not an invented
  bucketing scheme.
- Bullets read as the brightest on-screen elements, ship and ambient rocks
  read mid-tier, explosion debris spikes briefly — verified against the
  calibration screenshots, not just asserted.
- World space is scaled to canvas with aspect preserved (letterbox/pillarbox,
  no stretch), documented with a before/after screenshot if framing changed
  from earlier stories' default.
- The 5-moment calibration protocol above is executed with named
  clip/screenshot pairs and a pass/fail note per moment, committed to the PR
  description.
- No WebGL/shader/post-processing dependency is introduced; the technique
  used (flat glow, optionally plus tempest's phosphor accumulator) is named
  explicitly in the PR.
- 60fps is maintained with 27 objects on screen (measured, not assumed) —
  a profiling note in the PR if `shadowBlur` cost required any mitigation.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-19` from the sprint YAML._
_Enriched by Architect (Goldstein): confirmed the ROM-brightness premise via
A-17's VectorROM.html research, audited both siblings' actual glow technique
(flat `shadowBlur`/`lineWidth`, tempest's optional phosphor accumulator) as
the baseline to calibrate from, and defined the structured footage-comparison
protocol._
