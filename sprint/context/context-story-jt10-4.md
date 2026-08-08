# Story jt10-4 Context

## Title
Attract cycle: self-play (demo.ts) + banner pages (BEWARE OF THE PTERODACTYL, HOME OF THE LAVA TROLL) + attract-page scheduler — supersedes ad1-4

## Metadata
- **Story ID:** jt10-4
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust cabinet lifecycle — attract/title, 1P·2P select, game over, high-score, and Joust's two fonts

## Citation Quarry for TEA

> ⚠ **CITATION QUARRY — open before RED phase**
>
> The banner phrases *BEWARE OF THE PTERODACTYL* / *HOME OF THE LAVA TROLL* did NOT grep in `ATT.SRC` — they likely live in `PHRASE.SRC` or `MESSAGE.SRC`.
>
> **Must resolve before RED:**
> 1. Exact `ATT.SRC` page order and sequence labels (`ATT.SRC` table of contents)
> 2. Colour-cycle cadence: confirm `ATT.SRC:173` interval in milliseconds (~2.5 s)
> 3. Exact line citations for *BEWARE OF THE PTERODACTYL* and *HOME OF THE LAVA TROLL* (which `.SRC` file, line number)
>
> All three must be pinned as comments in the attract-scheduler code before the fidelity gate passes.

## Background

### What already exists (reuse substrate)

- **`demo.ts` (jt2-7 lineage, 2521 lines)** — wave-1 self-play simulation. **SHIPPED**. This story REUSES it unchanged; TEA/Dev must NOT rebuild or re-scaffold `demo.ts`.
- **`cabinet.ts` (jt10-2, DONE)** — Cabinet state machine. Defines `CabinetMode = 'attract' | 'title' | ...`, boots into `attract`, has the `GOVER` hinge (`GOVER_ATTRACT $7F` → attract), and carries `toAttract(cab, seed, playerCount)` reset (line 129) explicitly annotated "the fresh-attract reset is toAttract / jt10-4".
- **`pumpFrames` (src/shell/timebase.ts)** — Fixed-timestep shell clock. SHIPPED.
- **`@shared/highscore`** — High-score qualifies + storage. SHIPPED.
- **Atlas/blit pipeline** — `src/shell/render.ts`, `blit`/`blitOp`. SHIPPED.
- **GOVER tri-state** — `src/core/game.ts` models `GOVER = 'attract' | 'running' | 'over'`. SHIPPED (jt4-4).

### The attract sub-cycle (ROM: `ATT.SRC`)

The attract mode is itself a scheduler: it cycles through a sequence of pages with fixed dwell times and colour transitions:

1. **Title screen** — (handled by jt10-3; this story does NOT implement title)
2. **High-score table** — (handled by jt10-7; this story does NOT implement high-score entry)
3. **Self-play demo** — Runs `demo.ts` under cabinet attract, with the live game rendered onscreen
4. **Rules/banner pages** — Short-dwell overlays: *BEWARE OF THE PTERODACTYL*, *HOME OF THE LAVA TROLL* (and any other banners from `ATT.SRC`)

The sequence repeats. Each page dwells for a fixed interval; colours cycle per `ATT.SRC:173` (~2.5 s cadence).

### Provenance: ad1-4 (canceled, retained as quarry)

Epic `ad1` story `ad1-4` ("joust attract simulation") is superseded by this story and CANCELED in `ad1`. Its quarry (the GOVER / G-block decision-block model) is RETAINED as ground truth:

- **ROM:** `JOUSTRV4.SRC:232` (GAMSIM) + `JOUSTRV4.SRC` line $7F (GOVER) + G-block decision logic (G1DEC / G2DEC vs P-blocks)
- **Implementation (current tree):** `plugins/joust/src/shell/audio-manifest.ts` + `plugins/joust/tests/audio-decision-block-families.test.ts`
- **Definition of "self-play":** Per the ROM, self-play is a *choice in the G-block decision tree* — a GOVER state that branches toward demo/attract rather than title/select. This story wires that ROM-authentic choice.

## Technical Approach

### Core layer (`src/core/cabinet.ts` + new `src/core/attract-scheduler.ts`)

1. **Attract-page scheduler** — A pure state machine that manages page transitions:
   - Input: `frame` (milliseconds elapsed), `currentPage` (enum or id), `playerCount`, `seed`
   - Output: `nextPage`, `isDwell`, `colourCycle`
   - Transitions pinned as fixtures (pure transforms, no side effects)

2. **Banner text lookups** — Data structures mapping page ids to banner phrases (exact text from `PHRASE.SRC` / `MESSAGE.SRC`):
   - *BEWARE OF THE PTERODACTYL*
   - *HOME OF THE LAVA TROLL*
   - (and any others in `ATT.SRC`)

3. **Purity constraints (jt1-7 scanner):**
   - No `window.` / `document.` in code or comments
   - No browser APIs
   - No shell imports
   - All transforms are time-indexed, not wall-clock

### Shell layer (`src/shell/render.ts` + `main.ts` attract-mode render)

1. **Banner page render** — Lays out banner text in FONT57 (jt10-1 shipped) atop a solid background colour:
   - Uses existing `blit` / `blitOp` path
   - Colour from scheduler's `colourCycle` output
   - Verified via `render.ts?raw` source-wiring idiom

2. **Self-play render** — Pumps `demo.ts` frames under attract and renders the live game (reuses existing game render path)

3. **Transition blending** — Smooth dwell between pages (colour fade, text fade) per ROM behaviour

## Acceptance Criteria

1. **Core: Attract-page scheduler as pure transform**
   - GIVEN an attract scheduler instance initialized with a seed and player count
   - WHEN stepped with elapsed milliseconds
   - THEN it transitions between pages (title → high-score → demo → banners → repeat) and returns the next page id and colour cycle state
   - AND every transition is pinned in a fixture test transcribed from `ATT.SRC:173` timing data
   - AND all inputs/outputs are deterministic (no wall-clock calls, no browser APIs)

2. **Core: Banner text transcriptions cites ROM**
   - GIVEN each banner phrase (PTERODACTYL, LAVA TROLL, any others)
   - WHEN the scheduler indexes them
   - THEN each phrase is transcribed exactly from `PHRASE.SRC` or `MESSAGE.SRC` (pinned by line number as a comment)
   - AND the citation guard accepts all banner claims

3. **Shell: Banner pages render in FONT57**
   - GIVEN an attract-scheduler output requesting a banner page
   - WHEN rendered to canvas via the shell
   - THEN the banner text appears centered/positioned correctly in FONT57
   - AND the background colour matches the scheduler's colour-cycle output
   - AND the render uses the existing `blit` / `blitOp` infrastructure (verified via `render.ts?raw` idiom)

4. **Shell: Self-play demo runs under attract**
   - GIVEN a cabinet in `attract` mode
   - WHEN the attract-page scheduler is on the demo page
   - THEN `demo.ts` frames are stepped (via `pumpFrames`)
   - AND the live game renders onscreen (no pause, no overlay)
   - AND the demo runs deterministically (same seed → same moves/output every time)

5. **Purity: No shell imports, no browser APIs in core**
   - GIVEN the new core attract-scheduler module (`src/core/attract-scheduler.ts`)
   - WHEN scanned by the jt1-7 boundary rule
   - THEN it carries zero `import` statements outside `src/core/`
   - AND contains no `window`, `document`, or browser-API calls (even in comments)

6. **Integration: Attract cycle loops back to attract**
   - GIVEN a cabinet running in `attract` mode
   - WHEN a player presses START (1P or 2P)
   - THEN the cabinet transitions to `select`
   - AND from `select` → `playing`
   - AND from `gameover` (after a loss) → `highscore` (if qualifies) OR back to `attract`
   - AND attract always loops (title → demo → banners → repeat indefinitely until a coin/start event)

---

_Context enhanced from the design spec (docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md) and the ad1-4 quarry. TEA resolves the citation quarry before RED phase._
