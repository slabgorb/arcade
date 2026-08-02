# Context: sc1-1 — Shell convergence: compositional host helpers across the seven games

**Epic:** sc1  
**Status:** in_progress  
**Points:** 8  
**Workflow:** tdd  
**Repository:** arcade

## Acceptance Criteria

1. Each helper is adopted only by games that already perform that behaviour, with the adoption matrix recorded so a later reader can see which omissions are deliberate rather than missed.

2. centipede's and joust's ROM cadences are unchanged, proven by their existing determinism replays reproducing bit-for-bit rather than by the suite being green.

3. Adoption lands one game per commit, so a timing regression has a single suspect.

4. Each helper is proven non-vacuous by mutation — disabling it reddens a test asserting the behaviour it provides, not merely that the helper was called.

## Story Description

Spec section 4.3 of `docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md`, named as out of scope for the monorepo migration and deferred here. The seven games' main.ts files share almost nothing structurally even though each does the same handful of things: mount a canvas, unlock audio on first gesture, install a pause toggle, wire a high-score store.

The migration deliberately did not touch this — a Global Constraint forbade modifying any game's main.ts beyond an import-path rewrite, precisely so the collapse could not be blamed for a behaviour change. That constraint expires with the migration; this story is what it was protecting.

Design compositional helpers (e.g., `mountCanvas`, `installAudioUnlock`, `installPauseToggle`) that each game adopts **only where it already does that thing**. The adoption matrix in the spec is the input: this is not a mandate to give every game every helper, and a game that has no pause today must not grow one here.

**HARD CONSTRAINT:** centipede and joust are ROM-cadence games whose per-wave timing is gated against original source, so a helper that changes when a frame starts or how input is sampled is a regression even if every test stays green. Land the helpers **behind** the games rather than in front of them, and adopt **one game at a time** so a cadence change has one suspect.

## SETUP-MEASURED EVIDENCE

This context was validated at setup against the current tree. The following findings frame the story's scope and surface unresolved design tensions that TEA must open with.

### 1. Primitives Already Exist in `src/shared/`

The **pure primitives** are already exported and used:
- `view.ts` → `resizeToDisplay`, `letterbox`, `MAX_DPR`
- `pause.ts` → `INITIAL_PAUSED`, `isPauseKey`, `togglePaused`, `stepUnlessPaused`
- `esc-overlay.ts` → `drawEscOverlay`
- `audio.ts` → `createAudioEngine`

**What does NOT exist:** the **imperative wiring** around them (addEventListener calls, first-gesture unlock hook, resize listener). Each game hand-writes that wiring today.

**Implication for this story:** The helpers are an **install layer** over primitives that already exist — they are not new primitives. TEA should not re-implement `resizeToDisplay` or `togglePaused`; these are input to the helper design, not output.

### 2. Strongest Duplication Evidence: `installPauseToggle`

Four games import the **same symbol set** from `@shared` and wire their own keydown listener:
- **tempest**: INITIAL_PAUSED, isPauseKey, togglePaused, drawEscOverlay
- **star-wars**: INITIAL_PAUSED, isPauseKey, togglePaused, stepUnlessPaused, drawEscOverlay
- **asteroids**: INITIAL_PAUSED, isPauseKey, togglePaused, stepUnlessPaused, drawEscOverlay
- **red-baron**: INITIAL_PAUSED, isPauseKey, togglePaused, drawEscOverlay

**battlezone** deliberately does **NOT** import pause or view — it has its own shell/pause with no overlay (spec line 181).

**centipede** and **joust** import neither.

### 3. Per-Game `@shared` Imports (Measured at Setup)

Main.ts imports:
- **tempest** (143 lines): highscore, view(resizeToDisplay), pause, esc-overlay
- **star-wars** (306 lines): highscore, loop(createLoop), pause(+stepUnlessPaused), esc-overlay, view
- **asteroids** (141 lines): loop, pause(+stepUnlessPaused), esc-overlay, highscore, view
- **battlezone** (326 lines): index(SHARED_VERSION), loop, highscore — **NO pause, NO view** (own applyLetterbox + own shell/pause)
- **red-baron** (918 lines): math3d, rng, pause, esc-overlay — **NO view, NO highscore**
- **centipede** (229 lines): highscore **only**
- **joust** (247 lines): **NOTHING from @shared**

### 4. UNRESOLVED DESIGN TENSION — TEA MUST ADDRESS UPFRONT

The spec's section 4.3 names `mountCanvas` as a likely helper (line 207) but the **same section** (lines 186–188) judges the only universally-common seam — `querySelector('#game') + getContext('2d')` — as **"not an abstraction worth a helper."**

Both statements are in the cited source. This is a **contradiction that TEA must resolve**:
- Is `mountCanvas` a helper, or is the universal seam too thin?
- If `mountCanvas` is adopted, which games use it? (Only tempest, star-wars, and asteroids share `resizeToDisplay`; battlezone has `applyLetterbox`, centipede has `fitIntegerScale`, red-baron and joust have neither.)
- Does `mountCanvas` carry a **resize strategy**, or is it just DOM setup?

**Resolving this is a DESIGN decision for TEA/Dev — it is NOT settled in this story's acceptance criteria.** The story's naming of three helpers is **not a mandate to ship all three**.

### 5. HARD CONSTRAINT: ROM-Cadence Games

From epic and AC-2:
- **centipede** and **joust** are ROM-cadence games.
- AC-2 requires their determinism replays reproduce **bit-for-bit**, not merely "the suite is green."
- Both games adopt almost nothing from `@shared` today, so the **cheapest safe path** is adoption **LAST** or **not at all**.

**Implication:** Do not touch centipede/joust until every other game is safe. Re-probe centipede before landing adoption there (see point 6 below).

### 6. SIBLING CONTENTION AT SETUP

**Checkout `/Users/slabgorb/Projects/a-2` is active** (as of 2026-08-02):
- Story **cp6-1** (centipede ROM-audio dossier) is in `red` phase (started 2026-08-02T20:07:57Z).
- Writes `plugins/centipede/docs/rom-study/` and `plugins/centipede/tests/audit/citations.test.ts`.
- **Explicitly forbids editing** `plugins/centipede/src/shell/audio.ts`.

**Overlap with sc1-1:** centipede is in both neighbourhoods. Sequence centipede **LAST** in adoption order, and re-probe sibling checkouts before touching `plugins/centipede/src/shell/audio.ts`.

## Constraints & Notes

- **AC-3:** Adoption lands **one game per commit** — each commit adds one helper to one game only.
- **AC-4:** Each helper is proven non-vacuous **by mutation** — disabling the helper must redden a test asserting the **behaviour** it provides, not merely that the helper was called.
- **Timing fidelity is non-negotiable:** Landing helpers before the games (in the render loop) risks drifting centipede/joust cadence. Land them **behind** the games.
- **Design decision pending:** What is `mountCanvas`? Is it a helper, or too thin to abstract? Resolve this upfront before committing code.
