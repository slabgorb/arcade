# Story jt1-4 Context

## Title
The arena — cliff placements, landing tables + snap Ys, lava + bridge, wrap bounds, ceiling/floor

## Metadata
- **Story ID:** jt1-4
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** joust
- **Epic:** Joust — foundation slice (scaffold, citations, image transcription, arena, flight, render)

## Problem
The static world, transcribed: cliff/transporter/bridge placements (pictures.md layout table; JOUSTI.SRC:54-290, 749-752; JOUSTRV4.SRC:1126-1127 solid fills), the landing model — bitmask tables (LNDXTB/LNDYTB semantics, JOUSTRV4.SRC:6703-6707) resolving to the six hard-coded snap Ys (68/80/128/137/162/210, JOUSTRV4.SRC:6729-6759) — landing is a SNAP, not a resolve; cliff-side collision as the separate BCKXTB path (trace BCKCOL far enough to pin behavior — open-questions §4); X wrap [−10,292] modulus 303 (ELEFT/ERIGHT, JOUSTRV4.SRC:38-39, WRAPX :7291-7297); elastic ceiling $20 (:6497-6506); lava floor death at FLOOR+7 (:6508-6521); lava level per wave ($EA→$E0, :1929-1933, :962); bridge as wave-3 destruction hook (TBRIDGE, :954-957 — destruction animation itself may defer to jt3 with the troll). Every constant radix-cited + claims entry. Determinism pinned by test. NOTES from the jt1-3 review: (a) tools/transcribe-pictures.mjs ships without its own tests — the ruling: whichever story next CHANGES its grouping rules adds them (do not inherit the exemption silently). (b) The suite floors PIXEL_BLOCKS at 93 but has NO count floors on ENTITY_RECORDS/BACKGROUND_RECORDS/COLLISION_TABLES/PALETTES — each was empirically truncatable with the suite staying green (dropping the NULL palette passes); add floors when this story consumes those tables. (c) Prose citations in the bare :N form redden the jt1-8 canary — write FILE:LINE from the start.

## Technical Approach

Transcribe the ROM's static world model into TypeScript data structures:

1. **Cliff/transporter/bridge placements** — entity positions from `JOUSTI.SRC:54-290` (entity placement table) and `749-752` (transporter data); solid fills from `JOUSTRV4.SRC:1126-1127`. Cite pictures.md layout table as the source of record (pictures.ts from jt1-3 already has the frame data).

2. **Landing model** — bitmask tables `LNDXTB` and `LNDYTB` (semantics at `JOUSTRV4.SRC:6703-6707`). These tables map X position to landing Y; the six hard-coded snap Ys are **68, 80, 128, 137, 162, 210** (`JOUSTRV4.SRC:6729-6759`). Landing is a SNAP operation, not a general resolve—an entity crossing a platform's band from above lands **exactly** at the surface Y, never penetrates, never sub-pixel-rests.

3. **Cliff-side collision** — the separate `BCKXTB` path and `BCKCOL` logic (`JOUSTRV4.SRC` open-questions §4). Trace far enough to pin behavior.

4. **X wrap** — the ROM's arithmetic: X ∈ [−10, 292], modulus 303 (`ELEFT`/`ERIGHT`, `JOUSTRV4.SRC:38-39` and `WRAPX :7291-7297`). An entity at X=293 emerges at X=−10.

5. **Ceiling/floor** — elastic ceiling at Y=$20 (`JOUSTRV4.SRC:6497-6506`); lava death floor at `FLOOR+7` (`JOUSTRV4.SRC:6508-6521`).

6. **Lava level per wave** — $EA→$E0 progression (`JOUSTRV4.SRC:1929-1933`, `:962`).

7. **Bridge as wave-3 hook** — `TBRIDGE` (`JOUSTRV4.SRC:954-957`). Destruction animation deferred to jt3.

**Key design constraints from the spec:**
- Every transcribed constant must have a **radix-cited comment** ($ hex, @ octal, % binary, bare decimal per Motorola syntax).
- Every constant gets a **fully-qualified `FILE:LINE` claims entry** in `docs/rom-study/claims/`. Bare `:N` citations redden the jt1-8 canary.
- Core remains **deterministic**: no wall-clock, no `Math.random`.
- Use jt1-3's `pictures.ts` as the data source for placements; add count floors to `ENTITY_RECORDS`, `BACKGROUND_RECORDS`, `COLLISION_TABLES` when consumed here (per jt1-3 review ruling).

## Scope
- In scope: static world model (platforms, wrap, ceiling, floor, lava, bridge) fully transcribed with radix-cited comments and claims entries.
- In scope: landing bitmask tables and snap-Y logic producing deterministic landings.
- In scope: all citation tests green (purity guard, claims gate).
- Out of scope: collision-resolution details (trace BCKCOL behavior; defer deferred animations to jt3).

## Acceptance Criteria
- Platform surfaces, wrap bounds, ceiling/floor, and placements all transcribed with radix-cited comments AND claims entries; npm test -- citations green.
- Landing resolves via the bitmask+snap model: an entity crossing a platform's band from above lands AT the transcribed surface Y (all six), never penetrates, never sub-pixel-rests; walk-off-edge enters flight with zero VY.
- X wrap is the ROM's [−10,292]/303 arithmetic (an entity at 293 emerges at −10); ceiling reflects velocity exactly (elastic); crossing FLOOR+7 kills.
- No wall-clock, no Math.random in core (purity guard stays green).

## Design References

**Design Spec (user-approved 2026-07-19):**
- `joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md` — Architecture: timebase (FRAME_HZ), core model (process list, positions, no drag/terminal velocity), determinism (seeded RNG), core purity guard (no wall-clock, no Math.random).

**Dossier (ground truth):**
- `joust/docs/rom-study/brief.md` — System overview, Williams sound ROM absence, zappe omissions.
- `joust/docs/rom-study/subsystems.md` — Process architecture, movement model, landing tables.
- `joust/docs/rom-study/pictures.md` — Entity/background/collision record layout; pictures.ts transcription gate; 93-block inventory.
- `joust/docs/rom-study/open-questions.md` — BCKCOL behavior (§4), ASH1R/L format (§5), revision forensics.

**Vendored Williams source (pin 9bcfdb1 in reference/williams-source/joust):**
- `JOUSTI.SRC:54-290` — Entity placement table (addresses, entity types, X/Y coordinates).
- `JOUSTI.SRC:749-752` — Transporter placements.
- `JOUSTI.SRC:289`, `:307-320` — Cliff record dimensions (CLIF5: 8×13, but CSRC5L has 14 rows; jt1-6 notes this hazard).
- `JOUSTRV4.SRC:38-39` — `ELEFT`/`ERIGHT` wrap bounds.
- `JOUSTRV4.SRC:1126-1127` — Solid fill instructions (bridge destruction via wave-3 TBRIDGE hook).
- `JOUSTRV4.SRC:954-957` — `TBRIDGE` wave-3 destruction hook (animation deferred to jt3).
- `JOUSTRV4.SRC:962` — Lava level initial value ($EA).
- `JOUSTRV4.SRC:1929-1933` — Lava level per wave progression ($EA→$E0).
- `JOUSTRV4.SRC:6170`, `:6197` — Gravity constants (4 wings-down, 8 wings-up; used in jt1-5).
- `JOUSTRV4.SRC:6429-6436` — `ADDFLP` flap impulse formula (used in jt1-5).
- `JOUSTRV4.SRC:6440-6448` — FLYX rejection clamp (used in jt1-5).
- `JOUSTRV4.SRC:6497-6506` — Elastic ceiling ($20).
- `JOUSTRV4.SRC:6508-6521` — Lava death floor (`FLOOR+7`).
- `JOUSTRV4.SRC:6703-6707` — `LNDXTB`/`LNDYTB` landing table semantics.
- `JOUSTRV4.SRC:6729-6759` — Six snap Y values: 68, 80, 128, 137, 162, 210.
- `JOUSTRV4.SRC:7291-7297` — `WRAPX` wrap arithmetic (modulus 303, bounds [−10, 292]).

**Data source from jt1-3:**
- `joust/src/core/pictures.ts` — Entity record formats, background records, collision span tables, COMCL5 RLE expansion, COLOR1/HICOLR palettes. NO hand-drawn data. Floors at 93 pixel blocks but NO count floors on ENTITY_RECORDS, BACKGROUND_RECORDS, COLLISION_TABLES, PALETTES yet (per jt1-3 review ruling).

## Dependencies

- **Blocks:** jt1-5 (flight/movement requires landing model + arena bounds).
- **Blocked by:** jt1-2 (citation checker must be green before any new claims entries).
- **Depends on:** jt1-3 (pictures.ts data; contact sheet artifact).
- **Same-phase peer:** jt1-2 (both must land before constants are transcribed in jt1-5).

## Reviewer Notes from jt1-3 (context for this story)

The following rulings apply when jt1-4 consumes jt1-3's data:

1. **tools/transcribe-pictures.mjs test exemption:** The transcriber utility ships without its own test suite. The ruling: whichever story **next changes its grouping rules** adds the tests (do not inherit the exemption silently). If this story's landing/platform model needs to reorganize the pictures data, add tests here.

2. **Count floors:** The jt1-3 suite floors `PIXEL_BLOCKS` at 93, but `ENTITY_RECORDS`, `BACKGROUND_RECORDS`, `COLLISION_TABLES`, and `PALETTES` have NO count floors. Each was empirically truncatable with the suite staying green (e.g., dropping the NULL palette passes). **This story must add floors when it consumes those tables** to prevent silent shrinkage.

3. **Citation form—no bare :N:** Prose citations in the bare `:N` form (e.g., `:175` without FILE:) redden the jt1-8 canary. Write `FILE:LINE` from the start. Every transcribed constant needs a fully-qualified claims entry.

## Purity Guard

Core remains deterministic:
- **No wall-clock:** No `Date.now()`, `performance.now()`, wall-clock timer callbacks.
- **No Math.random:** All randomness comes from `@arcade/shared/rng` seeded by shell at game start.
- Test: `tests/purity.test.ts` scans src/core/ for forbidden globals and fails if found (guard already passes jt1-1/jt1-3).

---
_Generated by `pf context create story jt1-4` from the sprint YAML and enriched with design references._
