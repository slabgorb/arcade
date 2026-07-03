# Story bz1-2 Context

## Title
Source findings doc — distill disassembly (entities, scoring, obstacle table, 3D vertex specs, difficulty)

## Metadata
- **Story ID:** bz1-2
- **Type:** chore
- **Points:** 3
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
This is the epic's authority-chain story: every ROM constant later stories rely
on (obstacle layout, model geometry, scoring, thresholds, difficulty curve)
must be established here, from the quarry, before any gameplay code exists.
Pull the 6502disassembly.com/va-battlezone/ quarry into a gitignored
`reference/` (with a `README.md` on provenance + refresh, copying the
star-wars convention), then produce one committed whole-game findings doc
(the tempest/star-wars playbook pattern — see
`tempest/docs/tempest-1981-source-findings.md`) distilling the entity roster
and scoring, the spawn/score-threshold rules, the 21-obstacle ROM table,
3D object/vertex specs for every model, the difficulty/aggression curve,
radar behavior, and the sound inventory. Extracted data must then land as
typed, tested TypeScript in `src/core/` — the epic's hard-won lesson (repeated
from star-wars and asteroids) is that **the quarry lives only in the checkout
that created it**, so nothing downstream may depend on `reference/` still
being present. This story also verifies the epic context's "known ROM facts"
placeholders against the real disassembly and corrects them if the ROM
disagrees, and pins one authentic DIP default for the missile score threshold
(5K–30K range). By story order (bz1-1 → bz1-2 → …) the `battlezone/` subrepo
already exists, bootstrapped by bz1-1; this story adds no scaffolding, only
quarry, docs, and data.

## Technical Approach
- Create gitignored `battlezone/reference/` and pull the
  6502disassembly.com/va-battlezone/ materials into it (6502 code listing,
  vector bytecode, 3D object/vertex specs, Math Box internals, rev1/rev2
  diffs); add `reference/` to `battlezone/.gitignore` and a `reference/README.md`
  documenting provenance and refresh steps, following the star-wars
  `reference/README.md` convention referenced in `context-epic-bz1.md`.
- Author one committed whole-game findings doc, e.g.
  `battlezone/docs/battlezone-1980-source-findings.md`, mirroring
  `tempest/docs/tempest-1981-source-findings.md` in shape: cite the exact
  quarry location/label for every fact, not just the value.
- Distill into that doc: entity roster + scoring (slow tank / missile / super
  tank / saucer), the "always one hostile" spawn rule, the score-threshold
  intro rule for missiles + saucer's 2000-pt appearance, the full 21-obstacle
  ROM table (position, orientation, obstacle type per entry), 3D
  object/vertex/edge specs for every model (slow tank, super tank, missile,
  saucer, each obstacle shape, shell/projectile, explosion debris), the
  difficulty/aggression curve vs. score differential, radar cone/sweep
  behavior, and the sound inventory (POKEY channel assignments + discrete
  circuits for engine/cannon/explosion).
- Port the obstacle table into `src/core/obstacles.ts`: a typed array of
  exactly 21 entries (position, orientation, obstacle-type id), header
  comment citing the findings doc + underlying quarry reference.
- Port the model geometry into `src/core/models.ts` (or per-model modules
  under `src/core/models/`): typed vertex/edge tables for every model listed
  above, same source-citation convention.
- Port scoring + threshold constants into `src/core/scoring.ts` (or
  `thresholds.ts`): point values, saucer-appearance threshold, and the
  missile score-threshold DIP default — pin exactly one value from the
  5K–30K DIP range (using the disassembly's DIP table, or a published
  analysis if the table doesn't resolve to a clean single default) and
  document the choice with citation.
- Cross-check every bullet in `context-epic-bz1.md`'s "Known ROM facts" list
  against the quarry; where confirmed, note it as verified in the findings
  doc; where the ROM disagrees, correct `context-epic-bz1.md` directly and
  log the correction (old value → new value, source) in the findings doc.
- Add Vitest spot-check tests exercising structural invariants only (not
  gameplay behavior): obstacle table has exactly 21 entries; every model
  table is non-empty with edges/faces referencing in-range vertex indices;
  scoring/threshold constants match the pinned findings-doc values.
- No `sim.ts`, `render.ts`, or any gameplay/AI/radar/audio logic — this story
  ships data and documentation only; later stories (bz1-3 onward) consume it.

## Scope
- In scope: `reference/` quarry + its `README.md`; the committed whole-game
  findings doc; typed data modules in `src/core/` (`obstacles.ts`,
  `models.ts`, scoring/threshold constants) citing the quarry/findings doc as
  source; Vitest spot-check tests for those modules' structure; corrections
  to `context-epic-bz1.md`'s known-ROM-facts list where the quarry disagrees;
  pinning + documenting the missile score-threshold DIP default.
- Out of scope: any simulation code (`sim.ts`, `state.ts`, movement,
  collision resolution — bz1-4/bz1-5), rendering (bz1-3), radar rendering
  (bz1-6), enemy AI/spawn logic (bz1-7 onward), audio playback (bz1-11), HUD
  framing (bz1-12) — bz1-2 produces data and docs, never gameplay behavior.

## Acceptance Criteria
- `battlezone/reference/` exists, is gitignored, and its `README.md`
  documents provenance (6502disassembly.com/va-battlezone/) and the refresh
  procedure, following the star-wars `reference/README.md` convention.
- A single committed whole-game findings doc exists under `battlezone/docs/`
  covering entity roster + scoring, spawn/score-threshold rules, the
  21-obstacle ROM table, 3D vertex specs for every model, the
  difficulty/aggression curve, radar behavior, and the sound inventory —
  each fact citing its quarry source.
- `src/core/obstacles.ts` contains a typed table with exactly 21 entries
  (position, orientation, type), asserted by a spot-check test.
- `src/core/models.ts` (or equivalent) contains typed vertex/edge tables for
  every model in the findings doc (slow tank, super tank, missile, saucer,
  each obstacle shape, projectile, explosion debris); every table is
  non-empty and structurally well-formed (edges reference valid vertex
  indices), asserted by spot-check tests.
- Scoring/threshold constants (slow tank 1000 / missile 2000 / super tank
  3000 / saucer 5000, saucer-appearance 2000, missile score-threshold DIP
  default) are committed as typed `src/core/` constants; the missile
  threshold is pinned to one specific value in the 5K–30K range, documented
  with citation in the findings doc.
- Any corrections to `context-epic-bz1.md`'s "Known ROM facts" list (where
  the quarry disagrees with the epic's placeholder values) are applied to
  that file and logged in the findings doc's provenance/changelog section.
- `npm run build` and `npm test` are clean in `battlezone/` (`tsc --noEmit`
  passes with the new modules; new spot-check tests pass).

---
_Generated by `pf context create story bz1-2` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
