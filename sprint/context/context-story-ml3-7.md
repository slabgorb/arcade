# Story ml3-7 Context

## Title
Enroll citation claims for the ml3-3 mushroom reducers: add docs/rom-study/claims entries (byte-verified by the ml1-1 gate) for ROCK (MLDEF.MAC:204), FULL_MUSHROOM=7F (MLSUB.MAC:741), the MUSHER add/presence/row-band mechanics (:732-772), MUSHDC (:707-729), RESTOR (:919-949) and the OBSTAC probe (:887-889). These shipped cited in comments but have no claim, unlike conway's CW-* and the existing CW-61/62/63 MUSH seam — extend the 08/09 claim series so the gate byte-verifies them.

## Metadata
- **Story ID:** ml3-7
- **Type:** chore
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Millipede — the train + the playfield (phase 4a): millipede motion/split/death, the mushroom field, the CONWAY Life growth, and the scrolling playfield

## Background

The ml3-3 mushroom field reducers (`plugins/millipede/src/core/mushroom.ts`) ship with inline ROM comment cites but **lack corresponding claim entries** in the `docs/rom-study/claims/` directory. The ml1-1 citation gate (`plugins/millipede/tools/audit/check-citations.mjs`) performs **one-directional byte verification**: it reads each claim JSON entry and verifies it against the vendored ROM source at tree root (`historicalsource/millipede @ 29f3e05`). Claims are **not auto-derived from code comments**; they must be manually enrolled in JSON and gate-verified.

### Reducers to Enroll

1. **ROCK** (`MLDEF.MAC:204`, value `0x70`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:27`
   - **Design decision:** ROCK is **already claimed as BT-33** in `09-beetle-spider.json` with identical verbatim: `"ROCK\t=70\t\t\t;INDESTRUCTIBLE FEATURE"`. To avoid a byte-duplicate claim, **reuse/reference BT-33** rather than mint a second ROCK claim. Architect/TEA to confirm this strategy.

2. **FULL_MUSHROOM** (`MLSUB.MAC:741`, value `0x7f`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:28`
   - Genuinely unclaimed — verified no existing entry cites this line
   - New claim needed

3. **MUSHER add/presence/row-band mechanics** (`MLSUB.MAC:732-772`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:55`
   - Seam-level claims exist as **CW-61/62/63** in `08-conway.json` (they declare the seam exists, deferred to ml3-3)
   - ml3-7 adds reducer-side **mechanic assertions** — a different proposition, not redundant
   - New claims needed for the reducer implementation

4. **MUSHDC** (`MLSUB.MAC:707-729`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:81`
   - Seam-level claim **CW-63** exists in `08-conway.json` (declares the count seam exists)
   - ml3-7 adds reducer-side mechanic assertion
   - New claim needed for the reducer implementation

5. **RESTOR** (`MLSUB.MAC:919-949`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:105`
   - Unclaimed
   - New claim needed

6. **OBSTAC probe** (`MLSUB.MAC:887-889`)
   - Current source cite in `plugins/millipede/src/core/mushroom.ts:129`
   - Unclaimed
   - New claim needed

### Claim Naming Convention

The existing conway seam claims use the **CW-**** prefix (highest existing: CW-68). New mushroom reducer claims should extend the 08/09 series. Whether to continue `CW-*` or introduce a mushroom-specific prefix (e.g., `MUSH-*`) is a naming decision for TEA/Architect — note it as a decision point, do not decide it unilaterally.

### Acceptance Criteria (Derived)

1. **AC-1:** New claim entries are added to `plugins/millipede/docs/rom-study/claims/` (08-conway.json or a dedicated mushroom claims file)
2. **AC-2:** Each claim has a unique, non-empty `id` (following the naming convention established above)
3. **AC-3:** Each claim has a non-empty `claim` text
4. **AC-4:** Each claim has a `source` object with `file`, `line` (integer), and `verbatim` (the exact trimmed ROM line)
5. **AC-5:** ROCK strategy is explicitly resolved: either reuse BT-33 or architect approves a new claim
6. **AC-6:** All claims pass the ml1-1 gate byte verification (gate runs and reddens only on mismatched verbatim; green means all sources verified)

---

_This context was derived by setup from the story description and MEASURED FACTS provided during handoff. It supersedes any auto-generated version._
