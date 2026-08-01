---
story_id: "jt8-7"
jira_key: "jt8-7"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-7: egg catch narrowPhase — wire the EGGI mask table

## Story Details
- **ID:** jt8-7
- **Jira Key:** jt8-7
- **Workflow:** tdd
- **Type:** bug
- **Points:** 5 (re-pointed from 3 under the user ruling below)
- **Priority:** p2
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

  The `none` value above is the documented escape hatch for a trunk-based story, set proactively at
  setup: `pf sprint story finish` scrapes that labelled branch token by pattern anywhere in this file
  and tries to verify whatever follows it as a branch name (jt8-3). It must appear exactly ONCE, as
  the field. No agent should write that label again anywhere in this session — say "landed on `main`
  (`<sha>`)" instead. The same applies to the phase pointer token in Workflow Tracking (jt8-4/mg1-5):
  name it, never spell it.

## Story Context

The player↔egg catch pass is BOX-ONLY. `demo.ts:1027` runs
`broadPhase(collisionBox(catcher), eggBox(ep.egg))` and stops there, while the joust pass ~140 lines
above runs broadPhase THEN narrowPhase (`demo.ts:887-897`). `eggBox` (`:812`) returns a bare 16×16
(`ENTITY_BOX_W`/`ENTITY_BOX_H`, `:321-322`), so an egg's vertical catch reach is 16px instead of
CEGGUP's 7 real scanlines — an egg can be collected from visibly clear of it. `collisionMaskFor`
(`:734`) has no egg branch so it returns null, and the egg side never passes through `toJoustEntity`
at all.

### SM measured the filed text before setup — see the assessment below for the full result

The filing's `demo.ts` line cites had all DRIFTED (:687→:734, :902→:1027, :783-788→:887-897); the
`pictures.ts` cites were exact. Two facts the story did not have, both load-bearing:

1. **`EGGI` is a SEVEN-row frame table** (`JOUSTI.SRC:2255-2261`) and `pictures.ts:1699` transcribed
   **row 0 only** (anchor startLine 2255, endLine 2255). Rows 1-6 are missing entirely.

   | row | collision | position | source | what it is |
   |-----|-----------|----------|--------|------------|
   | 0 | CEGGUP | `$00FA` | EGGUP | still, upright |
   | 1 | CEGGLF | `$00FB` | EGGLF | still, tilt left |
   | 2 | CEGGRT | `$00FB` | EGGRT | still, tilt right |
   | 3 | CEGGUP | `$00FB` | EGGB1 | hatching 1 |
   | 4 | CEGGMN | `$FFF6` | EGGB2 | hatching 2 |
   | 5 | CEGGMN | `$FEF5` | EGGB3 | hatching 3 |
   | 6 | CEGGMN | `$00F5` | PLY4S | standing rider |

2. **The filed blocker is DISSOLVED.** "EggState carries no frame field" is true but is not a
   blocker, because the ROM stores no frame either. `WEGG` (`JOUSTRV4.SRC:3507-3530`) recomputes the
   frame EVERY frame from `PVELX`'s sign and `PVELY` against ±`$0080`, through the offset tables
   `EGFLFT FCB 0,12,6` and `EGFRIT FCB 0,6,12` (`:3535-3536`) which index EGGI's 6-byte rows. Both
   inputs already exist on `EggState` as `velX` and `velY`. No new state is required.

**The transcription is purely additive.** All seven sources (EGGUP EGGLF EGGRT EGGB1 EGGB2 EGGB3
PLY4S) and all four masks already exist as `PIXEL_BLOCKS`/`COLLISION_TABLES` — verified by count.
No new pixel data, no new span tables.

**Precedent for the record shape:** jt3-7 transcribed the 6-row `IPTERO` table
(`JOUSTI.SRC:2601-2606`) and the 6-row `ILAVAT` table (`:2376-2381`) as ONE `ENTITY_RECORD` PER ROM
ROW, each anchored to its own source line. EGGI's seven rows follow that established pattern.

> **USER RULING 2026-08-01** — transcribe the FULL seven-row EGGI table, not just the three still
> rows, then wire the catch pass. Rows 3-6 have no catch-pass consumer today; they are transcribed
> for table completeness. Story re-pointed 3 → 5 to carry the extra transcription.

> **OUT OF SCOPE — ruled 2026-08-01, its own follow-up story is filed at finish.** A THIRD pass also
> stops at broadPhase with no narrowPhase: the player↔ptero attack at `demo.ts:982` uses
> `entityBox(pt.entity!)` even though `collisionMaskFor` already gives a ptero the real `PT1RC` mask.
> Same defect family, deliberately a separate story. **Do NOT widen jt8-7 to cover it.**

### Open question SM could not settle — hand it forward, do not assume either way

`CEGGMN` is shared: the identical `FDB CEGGMN,$00F5,PLY4S` row appears BOTH at `JOUSTI.SRC:2261`
(EGGI row 6) and at `:2159` inside the PLYR4 table. `plugins/joust/tests/pictures.test.ts:319-330`
already asserts CEGGMN is "the dismounted standing rider"'s mask. SM did not determine whether
transcribing EGGI row 6 should reuse that existing record, introduce a second one under an
EGGI-scoped name, or whether the two rows are genuinely the same entity frame reached by two tables.
**TEA should settle this before writing the row-6 assertion** — a duplicate record could redden the
existing rider test, and a shared one could make AC1's "one record per ROM row" unsatisfiable as
literally worded.

## Acceptance Criteria

> SM-authored from the measurement above — `sprint/epic-jt8.yaml` carried
> `acceptance_criteria: null` for this story, so there is no pre-existing epic list these must match.
> They were written into the epic YAML FIRST and are reproduced here verbatim from it, unedited, and
> identically in `sprint/context/context-story-jt8-7.md`.

- AC1 — All seven EGGI rows (JOUSTI.SRC:2255-2261) are transcribed as ENTITY_RECORDS in pictures.ts — one record per ROM row, each carrying that row's own anchor line, collision mask, position word and pixel source. The existing single-row EGGI record is subsumed. No new PIXEL_BLOCKS and no new COLLISION_TABLES are introduced (all seven sources and all four masks already exist).
- AC2 — A pure, clock-free and RNG-free selector ports WEGG's per-frame choice (JOUSTRV4.SRC:3507-3530, with the EGFLFT/EGFRIT offset tables at :3535-3536): given an egg's velX and velY it returns the EGGI still row — near-level (|velY| <= $0080) selects row 0 CEGGUP for both directions; a fast FALL selects CEGGLF when velX < 0 and CEGGRT when velX >= 0; a fast RISE selects CEGGRT when velX < 0 and CEGGLF when velX >= 0. It adds NO new field to EggState.
- AC3 — The player-vs-egg catch pass (demo.ts:1027) runs narrowPhase after broadPhase — using the mask AC2's selector names for that egg, and the catching player's own mask — mirroring the two-phase shape the joust pass already uses at demo.ts:887-897.
- AC4 — A test proves the collect radius genuinely tightened: an overlap that the 16px ENTITY_BOX_H box accepts but the selected egg mask rejects is no longer a catch, AND a genuine mask overlap still collects (scores the EGGVAL rung, the mid-air bonus and the single egg-collected cue as before). Deleting the narrowPhase call must redden it.
- AC5 — The joust core-boundary/purity scanner still passes, and the joust and shared vitest projects are green. Every new anchor satisfies the existing pictures anchor/label checks.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T23:29:28Z
**Round-Trip Count:** 0

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T22:35:58Z | 2026-08-01T22:45:03Z | 9m 5s |
| red | 2026-08-01T22:45:03Z | 2026-08-01T23:06:59Z | 21m 56s |
| green | 2026-08-01T23:06:59Z | 2026-08-01T23:16:08Z | 9m 9s |
| review | 2026-08-01T23:16:08Z | 2026-08-01T23:29:28Z | 13m 20s |
| finish | 2026-08-01T23:29:28Z | - | - |

## Sm Assessment

**Setup complete. Routed to TEA for the RED phase.** Every falsifiable claim in the filed text was
measured against the tree and the vendored ROM before any file was written.

### Measurement result — the filed text was PART stale

| Filed claim | Verdict |
|---|---|
| `collisionMaskFor` at `demo.ts:687` | **DRIFTED** → `:734` |
| catch pass stops at broadPhase, `:902` | **TRUE**, at `:1027` |
| joust pass does broad+narrow, `:783-788`, "100 lines above" | **TRUE**, at `:887-897`, ~140 lines above |
| `collisionMaskFor` returns null for kind egg | **TRUE** (no egg branch) — but the egg side never reaches `toJoustEntity` at all; it goes through `eggBox` |
| CEGG masks exist with spans + anchors, `pictures.ts:1799-1806` | **EXACT** |
| `ENTITY_RECORDS.EGGI` (`:1699`) names CEGGUP | **EXACT** |
| 16px `ENTITY_BOX_H` vs CEGGUP's 7 real scanlines | **EXACT** (`:322`; 8 span rows, last is the `$8100` terminator) |
| `EggState` carries no frame field | **TRUE** (10 fields, none a frame) |
| "the ROM has four egg masks for its orientation/hatching frames" | **TRUE** — all four appear in EGGI |

Two facts the story did not have are in the context above: EGGI is a seven-row table transcribed as
one row, and the ROM's own selector (`WEGG`) makes the filed blocker moot. The second is why this
story was unblocked rather than parked.

### Why the blocker was dissolved rather than escalated

The story said "BLOCKED ON A DECISION FIRST … do not just hardcode CEGGUP". That framing assumed the
variant choice was a port DESIGN decision. It is not — the ROM answers it mechanically, and the
answer is portable from state `EggState` already carries. The remaining question was therefore one of
SCOPE, not of design, which is what went to the user.

### The either/or went to the user with the census already attached

Per the standing practice: the four EGGI still/hatching rows were enumerated, the selector's full
truth table derived, the additive-ness verified by counting every source and mask, and the jt3-7
precedent located — THEN the ruling was requested. The user chose the full seven-row transcription
over the three-still-row minimum. Cost of that branch is stated in the context and reflected in the
re-point 3 → 5.

### What I did NOT resolve, deliberately

The shared-CEGGMN question (EGGI row 6 vs the PLYR4 row at `JOUSTI.SRC:2159`) is written into the
context as an open question with the check named, NOT as an assertion. SM did not determine which
disposition is right and a guess here would arrive labelled MEASURED and outrank the story. TEA owns
it.

### Notes for TEA

- The vendored ROM is present at `reference/williams-source/joust/`; the test helper resolves it via
  `plugins/joust/tests/helpers/joust-source.ts:54` (`JOUST_SOURCE_DIR` overrides it). `.SRC` files are
  CRLF — pipe through `tr -d '\r'` or a grep will look empty when it is not.
- `WEGG` appears in all four `JOUSTRV*.SRC` revisions at slightly different lines; `JOUSTRV4.SRC` is
  the one cited throughout this story.
- No AC here needs a served page, so the dev-port ownership probe was skipped as not applicable. If
  that changes, note port 5270 is contested across sibling checkouts — serve on a spare port rather
  than killing another checkout's server.
- The sibling probes were run at setup and were clean: no `jt8` branches on the remote, and the only
  live session across `a-1`/`a-2`/`a-3` was a-2's mg1-5.
- AC1's literal wording is "one record per ROM row". If TEA's resolution of the shared-CEGGMN
  question makes that unsatisfiable as worded, say so and amend the AC explicitly rather than
  silently satisfying a looser reading.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/demo-jt8-7.test.ts` — behaviour: the seven EGGI records, the WEGG selector pinned through observable catches, and narrowPhase wired into the catch pass.
- `plugins/joust/tests/demo-jt8-7-source.test.ts` — provenance: the table and the selector re-derived independently from the vendored 1982 source, plus claim coverage.
- `plugins/joust/tests/helpers/demo-contract.ts` — widened by one field (see Design Deviations).

**Tests Written:** 31 across 5 ACs — **16 failing, 15 passing**
**Status:** RED (ready for Dev). Commit `29b29d6`. No `src/` file is modified.

### Where the fixtures sit, and why that is the whole design

The jt8-3 rule is "place fixtures where the two maps DISAGREE." Here the two maps are the
16px box and the transcribed mask. Measured against the real tables (player airborne →
`CWNG3R`, 13 rows; `CEGGUP`, 7 rows):

| dy = eggTop − playerTop | 16px box | CEGGUP mask | |
|---|---|---|---|
| −15 … −6 | accepts | **rejects** | box-only |
| −5 … +11 | accepts | accepts | real catch |
| +12 … +15 | accepts | **rejects** | box-only |
| ≥ 16 | rejects | rejects | no contact |

Every no-catch pin sits strictly inside a box-only band, and the two boundary PAIRS
(−5/−6 and 11/12) are one pixel apart on opposite sides of the edge. A fix that shrinks
the box instead of consulting the mask cannot satisfy both pairs at once.

For AC-2 the discriminators are the only two offsets that separate the three still-masks:
**dy = −5** (CEGGUP ✓, CEGGLF ✓, CEGGRT ✗ — separates the two tilts) and **dy = +11**
(CEGGUP ✓, both tilts ✗ — separates upright from tilted). So the selector is pinned through
observable catches rather than by unit-testing a helper, and stays true wherever Dev homes it.

### Fixture premises are asserted, not trusted

`stepFrame` runs BEFORE `collisionPass` (`demo.ts:1174-1175`), so staged numbers are not
collision-time numbers for a moving egg. Measured: `stepEgg` returns a **settled** egg
completely untouched (`demo.ts:699`), freezing both `posY` and `velY` across the step, and
the player does not drift. The precise fixtures therefore use `settled: true`. Because that
isolates the selector's inputs at the cost of staging a state ordinary play does not
produce, the last AC-2 test re-pins one case on a genuinely FALLING egg and asserts its own
premises (`velY` drifted by exactly `GRAV`=4; the egg arrived at dy=11).

### The RED is SATISFIABLE — proven, not assumed

A throwaway implementation (6 EGGI records + a WEGG selector + a narrowPhase call) took
**all 31 to green**. This is the row that is usually skipped and it is the one that matters:
an unsatisfiable RED is worse than no RED, and it cannot be known by reading.

### Mutation battery against that throwaway — 7 of 7 caught

| mutant | tests reddened | what it establishes |
|---|---|---|
| M1 hardcode CEGGUP (ignore the selector) | 7 | AC-2 is genuinely tested, not merely worded |
| M2 swap EGFLFT/EGFRIT (velX sign inverted) | 4 | the two tilt tables are distinguished |
| M3 fall boundary `>=` (128 becomes a fast fall) | 1 | the inclusive fall edge is pinned |
| M4 rise boundary `>=` (−128 becomes near-level) | 1 | the EXCLUSIVE rise edge is pinned |
| M5 drop narrowPhase from the catch | 11 | the headline defect is covered |
| M6 seven copies of row 0's data | 1 | per-row data, not just per-row count |
| M7 a hatching row keeps an egg mask | 1 | row-level correctness inside the table |

Each boundary mutant reds exactly one test — the guards are precise and uncoupled, not a
coupled bundle that reds on everything. Discipline: `cp` backups before the first mutation,
`cp` restore after, verified by md5 and by `git status` showing no `src/` file modified.
Every mutation asserted its own anchor landed (`ANCHOR MISS` printed otherwise), because a
mutation that fails to apply is indistinguishable from a guard that does not bite.

### Two sibling suites WILL redden when Dev lands the fix — both legitimate, both measured

Measured by running the full `joust`+`shared` suite with the throwaway in place:

1. **`demo-jt3-7-render.test.ts:277`** — the `ENTITY_RECORD_FLOOR` truncation guard fails
   with *"a build with any one record removed must FAIL the >= floor (not vacuously pass)"*.
   Adding six records gives the floor slack, which is exactly what that test exists to
   detect. **Dev must raise the floor to the new record count.** This is the guard working,
   not damage.
2. **`audio-events.test.ts` — 4 frame-exact seeded pins** (`egg-collected` @ seed 0xbeef
   frame 516, and three at seed 0xface frames 1938/1939/1614). The first fails with
   *"precondition: an egg really leaves on this frame: expected 2 to be 1"* — a tighter
   catch shifts which eggs are collected when, moving the whole seeded timeline. **These
   need re-baselining to new (seed, frame) coordinates**, and the Reviewer should read this
   paragraph before treating that as a loosened guard.

Without the throwaway run neither would have been known until Dev hit them mid-GREEN.

### Rule Coverage

`.pennyfarthing/gates/lang-review/` has no TypeScript checklist in this repo, so the rubric
is the project's own: `src/core` purity, ROM double-entry provenance, and no vacuous
assertions.

| Rule | Test(s) | Status |
|------|---------|--------|
| Core stays pure / clock-free | AC-2's selector is specified as pure and RNG-free; existing `purity.test.ts` and `purity-scanner.test.ts` sweep it | green (unchanged) |
| ROM claims are double-entered, never self-confirming | `demo-jt8-7-source.test.ts` re-derives the table with TEA's reader; nothing under `src/` may import it | failing (3) |
| A cited table's EXTENT is pinned, not just its cited row | "the EXTENT is exactly seven rows — :2254 and :2262 are not rows" | green (measurement) |
| Constants a story introduces carry a claim | the two claim-coverage tests | failing (2) |
| No vacuous assertions | self-check below | 1 found and fixed |

**Self-check:** one vacuous test found in my own draft and fixed. "the EGGI table rows carry
a claim" spanned :2255-2261 and passed **today**, satisfied by the pre-existing `JT8-130`
citing row 0 — and `JT8-130` is precisely the claim that describes seven frames while the
port transcribed one. Rescoped to the continuation rows (:2256-2261), where it now fails.
No `let _ =`, no `assert(true)`, no `is_none()`-on-always-None anywhere in either file.

**Handoff:** To Dev (Bicycle Repair Man) for implementation.

## Design Deviations

### TEA (test design)

- **AC-2's near-level boundary is wrong at exactly `velY = -128`; the tests follow the ROM**
  - Spec source: `sprint/context/context-story-jt8-7.md`, AC-2 (and the identical text in `sprint/epic-jt8.yaml`)
  - Spec text: "near-level (|velY| <= $0080) selects row 0 CEGGUP for both directions"
  - Implementation: the tests pin the ROM's **asymmetric** boundary instead — the fall edge is INCLUSIVE (`velY = 128` is near-level) but the rise edge is EXCLUSIVE (`velY = -128` is already a FAST RISE). `|velY| <= $0080` would make `-128` near-level, which the machine does not.
  - Rationale: `WEGY` does `SUBD #$0080 / BGT WEGD2` on the fall side, so `128-128 = 0` fails `BGT` and stays on row 0; `WEGVM` does `ADDD #$0080 / BGT WEGUP` on the rise side, so `-128+128 = 0` ALSO fails `BGT` and falls through to `WEGD3`, the tilt. The same "not greater than zero" test lands on opposite sides because one path branches toward the level frame and the other away from it. Verified by reading `JOUSTRV4.SRC:3514-3526`, and pinned from the source side in `demo-jt8-7-source.test.ts` so it cannot be "tidied" into symmetry later. The AC was written by SM from the same assembly and is simply one boundary out; the ROM is the authority.
  - Severity: minor
  - Forward impact: **AC-2's text in `sprint/epic-jt8.yaml` still says `|velY| <= $0080` and should be corrected at finish** (raised as a Delivery Finding). A Dev who implements the AC's letter rather than the tests will fail exactly one test, `the RISE boundary is EXCLUSIVE`.
  - → ✓ **ACCEPTED by Reviewer** — independently re-read `JOUSTRV4.SRC:3514-3526`. Both edges are a `BGT` on a zero result and they land on opposite sides because `WEGD2`/`WEGD3` sit on opposite sides of the fall-through. TEA is right and the AC is wrong; the ROM is the authority. The correction is carried into the epic YAML as a Delivery Finding rather than silently.

- **AC-1's "position word" is compared as a normalised 16-bit word, not a signed or unsigned number**
  - Spec source: `sprint/context/context-story-jt8-7.md`, AC-1
  - Spec text: "each carrying that row's own anchor line, collision mask, position word and pixel source"
  - Implementation: both suites normalise with `((v % 0x10000) + 0x10000) % 0x10000` before comparing, so `-10` and `65526` both satisfy the `$FFF6` row.
  - Rationale: EGGI rows 4 and 5 (`$FFF6`, `$FEF5`) are the FIRST transcribed records whose position word has the high bit set — all 44 existing records sit in [237, 751], measured — so there is no house precedent for signed-vs-unsigned. Pinning one representation would invent a requirement no AC states and could fail a defensible choice; normalising pins the WORD, which is what AC-1 actually names.
  - Severity: minor
  - Forward impact: Dev picks the representation. If a later story needs the SIGNED offset (these are Y-offsets, so `$FFF6` is plausibly −10), it can tighten this without renegotiating AC-1.
  - → ✓ **ACCEPTED by Reviewer** — pinning a representation with no precedent would have invented a requirement. Verified the claim it rests on: all 44 pre-existing records fall in [237, 751], so these two really are the first high-bit words.

- **Widened `tests/helpers/demo-contract.ts` — a file no AC names — by one field**
  - Spec source: `sprint/context/context-story-jt8-7.md`, AC-4
  - Spec text: "a genuine mask overlap still collects (scores the EGGVAL rung, the mid-air bonus and the single egg-collected cue as before)"
  - Implementation: added `cues: readonly { readonly type: string }[]` to the contract's `DemoState`.
  - Rationale: AC-4 requires asserting the cue, and the cue was unreachable from a typed demo-level test — `stepDemo` has returned `cues` since jt5-1 (`demo.ts:274`, built at `:1184`) but the contract never mirrored it, so `npm run lint` failed with `Property 'cues' does not exist on type 'DemoState'`. Mirrored STRUCTURALLY rather than by importing `GameEvent` from `src/core/events.ts`, which would collapse the double-entry independence that `pictures-gate.test.ts` enforces.
  - Severity: minor
  - Forward impact: none for this story — it is additive and the full `joust`+`shared` suite is unchanged at 2810 passing. Any future demo-level test can now read cues.
  - → ✓ **ACCEPTED by Reviewer** — AC-4 names the cue, and the cue was unreachable from a typed demo-level test. Mirrored structurally rather than importing from `src/`, which preserves the double-entry independence `pictures-gate.test.ts` enforces. Full suite unchanged at 2826.

### Dev (implementation)

- **Edited two sibling TEST files that no AC names: a count floor and four seeded frame pins**
  - Spec source: `.session/jt8-7-session.md`, TEA Assessment — "Two sibling suites WILL redden when Dev lands the fix"; and AC-5 ("the joust and shared vitest projects are green")
  - Spec text: "**Dev must raise the floor to the new record count.**" / "**These need re-baselining to new (seed, frame) coordinates**"
  - Implementation: `demo-jt3-7-render.test.ts` `ENTITY_RECORD_FLOOR` 44 -> 50; `audio-events.test.ts` four pins moved (0xbeef 516 -> 523; 0xface 1614 -> 1641, 1938 -> 1810, 1939 -> 1811). No assertion was weakened or removed in either file.
  - Rationale: both were predicted and measured by TEA against a throwaway before this phase began, so neither is a surprise discovered while making a test go green. The floor bump is REQUIRED by the guard rather than tolerated by it — the truncation test asserts `ENTITY_RECORD_FLOOR >= realCount` and reds with "the floor must EQUAL the real record count" if left at 44. The seeded pins are frame COORDINATES into a deterministic replay, not thresholds; each retains its own precondition (an egg really leaves and really scores, a knight really dies, the wave really advances), so a wrong coordinate fails the precondition before it can reach the cue assertion. Both seeds and the input script are unchanged — only the frames moved, and this file has been re-baselined the same way twice before (jt5-4 changed the seed; uf1-8 changed the frames).
  - Severity: minor
  - Forward impact: the next story that adds an `ENTITY_RECORD` must bump the floor again — that is the guard's design. The re-baselined frames were found by scanning 3000 frames of each seed for the tests' own preconditions; the method is recorded in the assessment so a future shift can be re-measured rather than guessed.
  - → ✓ **ACCEPTED by Reviewer**, and independently verified rather than taken on trust. The floor: the guard's own assertion is `ENTITY_RECORD_FLOOR >= realCount`, so 44 reds — the bump is what it demands. The pins: I re-ran the egg pin at frames 522, 524 and the OLD 516 and **all three fail**, only 523 passes. The coordinate is exact and the precondition still bites, so this is a re-measurement, not a loosening.

- **EGGI rows 1-6 are named for their pixel source; row 0 keeps the label name `EGGI`**
  - Spec source: `sprint/context/context-story-jt8-7.md`, AC-1
  - Spec text: "one record per ROM row, each carrying that row's own anchor line, collision mask, position word and pixel source"
  - Implementation: AC-1 does not specify record NAMES. Row 0 stays `EGGI`; rows 1-6 are `EGGLF`/`EGGRT`/`EGGB1`/`EGGB2`/`EGGB3`/`PLY4S`.
  - Rationale: the name is load-bearing for row 0 only — `demo.ts` emits `entityOp('EGGI', ...)` for the egg draw op and `demo-source.test.ts:194` requires `'EGGI'` in its record list, so renaming it would break two consumers. The remaining rows follow jt3-7's convention, where a record takes its pixel-source name (`PT1R` the record, `PT1R` the block); the two arrays are separate namespaces. The ROM-label test (`pictures.test.ts:101`) iterates `PIXEL_BLOCKS` only, so record names are unconstrained by it — every name chosen is nevertheless a real ROM label.
  - Severity: minor
  - Forward impact: none. A future consumer of the tumble stills should look rows up by anchor line or via `eggMaskFor`, not by guessing a name.
  - → ✓ **ACCEPTED by Reviewer** — and the naming is load-bearing in a way the entry understates: because every new record has `name === source`, `entitySource` (`main.ts:78`) returns the same string it would have fallen back to, so adding six records to an array that two call sites search by name is provably behaviour-neutral. Verified no duplicate record names and no dangling sources.

- **Position words `$FFF6`/`$FEF5` stored UNSIGNED, as raw 16-bit words**
  - Spec source: `.session/jt8-7-session.md`, TEA Design Deviations — "AC-1's 'position word' is compared as a normalised 16-bit word"
  - Spec text: "Dev picks the representation."
  - Implementation: stored as `0xfff6` / `0xfef5` (65526 / 65269).
  - Rationale: every one of the 44 pre-existing records stores the raw word, and these two are the first with the high bit set, so there is no signed precedent to match. Keeping the raw word means the record is a faithful transcription and any consumer can apply its own sign convention; storing `-10` would bake in an interpretation nothing yet needs. Noted in the source with the signed reading spelled out so the next reader does not have to re-derive it.
  - Severity: minor
  - Forward impact: a future story that decodes these as Y-offsets must sign-extend. The tests accept either representation, so that change would not need AC-1 renegotiated.
  - → ✓ **ACCEPTED by Reviewer** (the decision), ✗ **FLAGGED** (the forward-impact note names the WRONG AXIS). Storing the raw word is right. But the note says "a future story that decodes these as **Y-offsets** must sign-extend" — the Y offset is fine. `posOffset` computes `yoff = 256 - (position & 0xff)` → 10 and 11, both correct; it is `xoff = position >> 8` that yields **255 instead of −1** and **254 instead of −2**. Currently unreachable (no `entityOp` call can name these records), so LOW — see the findings table.


### Reviewer (audit)

- **No UNDOCUMENTED deviations found.** I looked specifically for the two shapes this story invites: a test edited to accommodate the change without being logged, and a comment asserting a mechanism nobody re-ran. Both sibling-test edits were logged by Dev *and* pre-measured by TEA before the GREEN phase began. Every ROM line cited by the new comments and by all four claims was re-opened and matched byte-for-byte.
- **One deviation of my own, made during review:** the `eggMaskFor` doc block originally opened with `WEGG (JOUSTRV4.SRC:3507-3530)`. The routine actually runs to `JMP CLIPER` at :3531, and eight other places in the story repeat 3507-3530 — so correcting the number in one file would have produced a worse inconsistency than the original off-by-one. Per lang-review #17 and the jt8-6 lesson (when a line EXTENT keeps being the thing that is wrong, stop asserting it), the comment now cites the routine by its LABEL line only and asserts no end line. Every load-bearing line it leans on is still cited individually and every one verifies. Severity: low; forward impact: the AC/context/session still say 3507-3530, which is an approximate anchor range and harmless.

## Delivery Findings

<!-- Append-only. Never edit another agent's entries. -->

### TEA (test design)

- **Conflict** (non-blocking): AC-2's near-level boundary `|velY| <= $0080` is wrong at exactly `velY = -128`, where the ROM takes the fast-rise branch. Affects `sprint/epic-jt8.yaml` and `sprint/context/context-story-jt8-7.md` (AC-2's text needs the asymmetry: fall edge inclusive, rise edge exclusive). The tests already follow the ROM, so no code is blocked — but the AC is the permanent record and currently disagrees with the machine. *Found by TEA during test design.*
- **Gap** (non-blocking): `demo-jt3-7-render.test.ts:277`'s `ENTITY_RECORD_FLOOR` truncation guard goes vacuous the moment six records are added, and fails with "a build with any one record removed must FAIL the >= floor (not vacuously pass)". Affects `plugins/joust/tests/demo-jt3-7-render.test.ts` (the floor must be raised to the new record count). Measured by running the full suite against a throwaway implementation. This is the guard doing its job; it is not damage. *Found by TEA during test design.*
- **Gap** (non-blocking): four frame-exact seeded pins in `audio-events.test.ts` shift when the catch tightens — `egg-collected` @ (0xbeef, 516) and three at (0xface, 1938/1939/1614). The first fails on its own precondition, "an egg really leaves on this frame: expected 2 to be 1". Affects `plugins/joust/tests/audio-events.test.ts` (re-baseline to new seed/frame coordinates). Also measured against the throwaway. The Reviewer should read the TEA Assessment before treating this as a loosened guard. *Found by TEA during test design.*
- **Question** (non-blocking): EGGI rows 4 and 5 introduce the first position words with the high bit set (`$FFF6`, `$FEF5`) — every existing record is in [237, 751]. Affects `plugins/joust/src/core/pictures.ts` (Dev chooses signed or unsigned; the tests accept either). These are Y-offsets, so the signed reading (−10, −267) is plausibly the meaningful one, but nothing in the repo decides it. *Found by TEA during test design.*
- **Improvement** (non-blocking): `helpers/demo-contract.ts` had drifted from the module it mirrors — `cues` shipped in jt5-1 and was never added, so no demo-level test could assert a cue without an `any`. Affects `plugins/joust/tests/helpers/demo-contract.ts` (fixed here). Worth a sweep for other fields the contract is missing, since the same silence would hide them. *Found by TEA during test design.*
- **Question** (non-blocking): the pre-existing claim `JT8-130` describes the egg as "up/right/left + 3 hatch stages" — i.e. the dossier ALREADY recorded seven frames — while `pictures.ts` transcribed one row. Affects `plugins/joust/docs/rom-study/claims/qualified.json` (no change needed; recorded because it shows the knowledge was present and the transcription still read short). A claim that describes more than the code implements is not detectable by any current gate. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the frozen sim fingerprint (`audio-events.test.ts`, `jt5-1 AC3`) passed UNCHANGED both before and after this story, even though the same seed's egg collection demonstrably moved 7 frames (0xbeef 516 -> 523). Affects `plugins/joust/tests/audio-events.test.ts` (no change needed now). Its stated job is narrow — proving the event channel draws no RNG and changes no ordering — but it also pins `procs`/`scores`/`lives` at 2400 frames, which reads like a general behaviour fingerprint and is not one: a real collision-geometry change washed out of it entirely. Worth knowing before anyone cites it as evidence that a change was inert. *Found by Dev during implementation.*
- **Question** (non-blocking): EGGI rows 3-6 (the hatch stages and the standing rider) are now transcribed but have NO consumer — `eggMaskFor` only ever returns rows 0-2, because WEGG's offset tables only ever index those three. Affects `plugins/joust/src/core/pictures.ts` (nothing to change; the rows were transcribed for table completeness under the user's ruling). If a later story renders the hatch animation it will want rows 3-5, and `PLY4S` (row 6) is the first record to name that block at all. *Found by Dev during implementation.*
- **Gap** (non-blocking): `eggMaskFor` reads an egg's velocities every frame exactly as WEGG does, but nothing DRAWS an egg — the shell has no egg render path at all (only `audio*.ts` mentions eggs). Affects `plugins/joust/src/shell/` (out of scope here). So the three tumble stills currently affect collision only, and the visual tumble the ROM shows is still missing. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): `EGGTBL` (`JOUSTRV4.SRC:3537-3544`, under the block header "EGG ANIMATION TABLE") is a SECOND table indexing EGGI, and it is the one that consumes rows 3-6 — offsets 18/24/30/36 are labelled `HATCH 1..4`, and 6/0/12 are `WIGGLE LEFT/UP/RIGHT`. Affects `plugins/joust/src/core/demo.ts` and `pictures.ts` (nothing to change here; this is the follow-up story's mechanism). It refines Dev's "rows 3-6 have no consumer": true of THIS port, but the ROM drives them from EGGTBL, and `EGGTBL`'s maximum offset of 36 → row 6 is an INDEPENDENT corroboration of the seven-row extent from a different table. It also sits in the same three-table block as EGFLFT/EGFRIT, so it is exactly the "read the whole block" hazard this story exists to fix, one table over. **Should be filed as a story at finish.** *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `posOffset` (`demo.ts:1495`) will decode EGGB2/EGGB3's position words wrongly the moment anything draws them — `xoff = position >> 8` gives **255** where the ROM's signed XOFF is **−1**, and **254** where it is **−2**. The Y half is correct (10 and 11). Affects `plugins/joust/src/core/demo.ts` (`posOffset` needs a signed high byte before any hatch frame is drawn). Unreachable today — no `entityOp` call site can name those records — which is why it is an Improvement and not a defect. *Found by Reviewer during code review.*
- **Question** (non-blocking): `narrowPhase` compares COFF-unbiased SPRITE-LOCAL columns and never sees screen X, so the mask test is "do these shapes overlap if superimposed", with `broadPhase` carrying all the horizontal truth. Affects `plugins/joust/src/core/joust.ts` (pre-existing since jt2-3; this story extends the mechanism to a second pass rather than introducing it). It is doing real work here — the dy=12 rejection is a COLUMN miss, not a row miss — but whether it matches the ROM's own collision comparison has never been established, and it now governs two passes instead of one. *Found by Reviewer during code review.*

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/pictures.ts` — EGGI's six missing rows transcribed as `ENTITY_RECORDS`, one per ROM line (AC-1).
- `plugins/joust/src/core/demo.ts` — `eggMaskFor` (the WEGG port) plus its four transcribed constants, and the `narrowPhase` call in the catch pass (AC-2, AC-3).
- `plugins/joust/docs/rom-study/claims/egg-mask.json` — new; JT87-001..004.
- `plugins/joust/tests/demo-jt3-7-render.test.ts` — `ENTITY_RECORD_FLOOR` 44 → 50.
- `plugins/joust/tests/audio-events.test.ts` — four seeded frame pins re-baselined.

**Tests:** 31/31 for the story; **2826/2826** joust+shared; **372/372** orchestrator;
`npm run lint` clean; `node scripts/build-app.mjs joust` builds.
**Landed on:** `main` — trunk-based, commit `37c4802`.

### What the fix actually is

Three lines of gate in the catch pass, and a table that was read short. `eggMaskFor` is a
direct port of `WEGG`: the ROM keeps **no** frame on an egg, it recomputes the picture every
frame from `PVELX`'s sign and `PVELY` against `$0080` and stores only the pointer
(`STY PPICH,U`). That is the whole reason the story's filed blocker ("EggState carries no
frame field") was not a blocker — our `velX`/`velY` are the same two inputs, so no state was
added.

The asymmetric boundary is the part worth not losing: both edges are a `BGT` against zero,
but `velY = 128` stays LEVEL while `velY = -128` is already a fast RISE, because one path
falls through toward the level frame and the other away from it. It is transcribed with that
reasoning in the comment and pinned by `JT87-004`.

### The two sibling suites, and why editing them is not a loosening

Both were measured by TEA against a throwaway *before* this phase, so neither was discovered
while chasing a green.

- **`ENTITY_RECORD_FLOOR` 44 → 50.** The guard asserts `floor >= realCount`; leaving it at 44
  fails with *"the floor must EQUAL the real record count — no 1-unit slack (N5)"*. The bump
  is what the guard demands, not a concession to it. Adding rows to a transcription is
  precisely the event that puts slack in a count floor.
- **Four seeded pins re-baselined.** These are frame COORDINATES into a deterministic replay.
  A tighter catch changes which egg is collected when, and everything downstream shifts. Both
  seeds and the input script are unchanged; only the frames moved:

  | moment | seed | was | now |
  |---|---|---|---|
  | egg-collected | 0xbeef | 516 | 523 |
  | wave advance | 0xface | 1614 | 1641 |
  | player-death | 0xface | 1938 | 1810 |
  | player-materialise | 0xface | 1939 | 1811 |

  Found by scanning 3000 frames of each seed for **the tests' own preconditions**, not by
  nudging numbers until green. Every pin keeps its precondition (an egg really leaves *and*
  really scores; a knight really dies; the wave really advances *and* deals a complement), so
  a wrong coordinate fails the precondition before it can reach the cue assertion — a
  re-baseline cannot quietly make one vacuous. This file has been re-baselined twice before
  on the same grounds (jt5-4 changed the seed, uf1-8 changed the frames).

### Claims

Four added, and every `verbatim` was verified byte-exact against the vendored source by
re-opening the cited line — not transcribed from memory. `JT87-001` also records the table's
EXTENT and the fact that the continuation rows are unlabelled, which is the mechanism that
hid them.

### Self-review

- [x] Wired: the selector is reached from the live catch pass, not just exported.
- [x] Project patterns: per-ROM-row records (jt3-7), transcribed constants carry their ROM
      symbol, radix and citation; core stays pure — no clock, no RNG, no ambient state.
- [x] All ACs met: AC-1 seven rows; AC-2 the selector with no new `EggState` field; AC-3
      narrowPhase after broadPhase; AC-4 proven by TEA's disagreement-band tests; AC-5
      purity scanner + both projects green, and every new anchor satisfies the existing
      pictures checks.
- [x] Error handling: `eggMaskFor` is total — every `(velX, velY)` lands on exactly one of
      rows 0-2, so there is no unmapped case to handle. The `catcher.collision === null`
      guard mirrors the joust pass's existing "an entity with no transcribed mask cannot
      joust" rule.

**Handoff:** To Reviewer (The Argument Professional).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | skipped | none | Disabled in practice — see note below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — Disabled via settings |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — Disabled via settings |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — Disabled via settings |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A — Disabled via settings |

**All received:** Yes (0 specialists ran; 8 disabled via `workflow.reviewer_subagents`, preflight not spawned)
**Total findings:** 2 confirmed, 0 dismissed, 0 deferred — all from my own analysis, none from a specialist.

`pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight
`false`. Nine specialist rows, no specialist coverage. **So the review is the MUTATION BATTERY
below, not a fan-out** — and the two findings it produced both sit squarely in the disabled
`comment_analyzer`'s domain, which is the standing pattern on this project.

### Mutation battery — 12 mutants, 10 caught, 2 adjudicated

Run against committed source through `--project joust --project shared`, each mutation
asserting its own anchor landed before applying, sources restored by `cp` and verified clean.

| mutant | red | verdict |
|---|---|---|
| R1 velX zero-sign `>= 0` → `> 0` | 1 | caught — the `velX = 0` convention is pinned |
| R2 rise/level split `velY < 0` → `<= 0` | **0** | **EQUIVALENT** — see below |
| R3 threshold `0x80` → `0x7f` | 2 | caught |
| R4 swap the two offset tables | 2 | caught |
| R5 still-mask ORDER LF/RT swapped | 4 | caught |
| R6 narrowPhase tops SWAPPED | 14 | caught |
| R7 drop the `>> 8` on the egg top | 36 | caught |
| R8 TYPO a mask name (silent-empty hazard) | 2 | caught |
| R9 drop the null-collision guard | **0** | **caught by `tsc`, not vitest** — see below |
| R10 row 4 position word corrupted | 2 | caught |
| R11 row 2 anchor line off by one | 3 | caught |
| R12 row 6 mask CEGGMN → CEGGUP | 2 | caught |

**R2 is an equivalent mutant, and demanding a test for it would be wrong.** `velY = 0` is the
only input where the branch differs, and both arms return `offsets[0]` there — verified
exhaustively over 5607 `(velX, velY)` pairs with **zero** differing. There is nothing to catch.
Recorded so the next reviewer does not re-derive it and file a coverage gap that cannot exist.

**R9 is caught one gate over.** Removing `if (catcher.collision === null) continue` leaves
`string | null` flowing into a `string` parameter: `npm run lint` fails with
`TS2322 … demo.ts:1082`. The guard is unreachable at runtime (a player with an entity always
has a mask) but load-bearing for the type system, and `npm run lint` is a separate CI gate —
the only typecheck in the release path. A battery that runs vitest alone would have scored
this as an uncovered hole; it is not one.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md` (18 checks)

Enumerated against every function, constant and record the diff adds. No `.claude/rules/` and
no `SOUL.md` exist in this repo, so the lang-review checklist is the whole rubric.

| # | Check | Applies to | Verdict |
|---|---|---|---|
| 1 | Type-safety escapes | `eggMaskFor`, the 6 records, the contract field | **Compliant** — no `any`, no `as` cast, no non-null `!` added in `src/`. The one assertion-free narrowing is R9's guard. |
| 2 | Generic/interface pitfalls | `readonly { readonly type: string }[]` on `DemoState` | **Compliant** — structural mirror, no import from `src/`, preserves the double-entry rule. |
| 3 | Enum anti-patterns | `EGGI_STILL_MASKS`, `EGF_LEFT/RIGHT` | **Compliant** — `as const` tuples, not enums. |
| 4 | Null/undefined handling | `eggMaskFor` return, `MASKS[name]` lookup | **Compliant** — `eggMaskFor` is TOTAL (every `(velX, velY)` reaches exactly one of 3 slots; verified over 5607 pairs). A bad mask name would hit `narrowPhase`'s `?? []` and silently never collide — R8 proves a typo reds 2 tests. |
| 5 | Module/declaration issues | new constants | **Compliant** — module-scoped `const`, no ambient declaration. |
| 6 | React/JSX | — | N/A — no `.tsx` in the diff. |
| 7 | Async/Promise | — | N/A — `eggMaskFor` and the catch pass are synchronous and pure. |
| 8 | Test quality | both new suites, both edited suites | **Compliant** — every fixture sits in a measured disagreement band; TEA found and fixed one vacuous assertion of its own (the claim-coverage range that passed off the pre-existing `JT8-130`). |
| 9 | Build/config | — | **Compliant** — `node scripts/build-app.mjs joust` builds. |
| 10 | Security: type-level input validation | `eggMaskFor` inputs | N/A — no external input; `velX`/`velY` are sim-internal integers. |
| 11 | Error handling | the two `continue` guards | **Compliant** — both mirror the joust pass's existing "an entity with no transcribed mask cannot joust" rule (`demo.ts:892`). |
| 12 | Performance/bundle | the catch pass inner loop | **Compliant** — `narrowPhase` runs only after `broadPhase` accepts, so it is off the hot path; `MASKS` is built once at module scope. |
| 13 | Fix-introduced regressions | the 2 sibling suites | **Compliant** — both pre-measured by TEA, both re-verified by me (see the deviation stamps). |
| 14 | Derived EDGES inside one branch | `eggMaskFor`'s nested ternary | **Compliant** — the rise and fall edges are computed in SEPARATE arms and both are pinned by their own test (R3/R4 red 2 each; the two boundary tests red 1 each). |
| 15 | Source-text assertions matching a TOKEN not the CLAIM | `demo-jt8-7-source.test.ts` | **Compliant** — assertions are `.toBe()` on whole normalised LINES or `.toContain()` on a specific instruction, never a bare keyword. The 7-row loop has no `continue` and its collected array is compared with `toEqual`, so it cannot silently compare nothing. Every guard is mutation-tested (R10/R11/R12). |
| 16 | Accessible names by replacement | — | N/A — no DOM in the diff. |
| 17 | Comments asserting a MECHANISM nobody re-ran | the `eggMaskFor` block, the catch-pass comment, 4 claims, 2 test headers | **1 FINDING (fixed)** — every cited ROM line re-opened and matched, but the routine EXTENT `3507-3530` was wrong (it ends at `JMP CLIPER`, :3531). Fixed by dropping the extent assertion entirely rather than correcting a number repeated in 8 places. |
| 18 | Defect in the test apparatus, failing by PASSING | the re-baselined seeded pins; the two `EGGI_ROWS` tables | **Compliant** — the re-baselined pin was probed at 522/524/516 and **all three red**; only 523 passes, so the coordinate is exact and its precondition still discriminates. The duplicated row table across the two new suites is cross-checked (the source suite verifies it against the ROM, the behaviour suite against the records), not self-confirming. |

### Devil's Advocate

Assume this is broken. The most dangerous thing about this change is that it makes a collision
STRICTER, and every failure mode of a stricter collision is a non-event — an egg that should
have been caught silently is not. There is no exception, no log, no cue. If `eggMaskFor`
returned a name absent from `MASKS`, `narrowPhase` would resolve `?? []`, iterate zero rows,
return `false`, and eggs would become permanently uncatchable across the whole cabinet with a
fully green suite — because most of this file's tests stage eggs at dy = 0 and would... no:
they would fail, and R8 proves it, reddening 2 tests. That hole is closed, but it is worth
naming how narrow the margin was: the protection comes from tests that assert a POSITIVE catch,
and there are only a handful of them. Delete those and the silent-empty path reopens.

A confused reader is the likelier casualty. The comment says the reach is "CEGGUP's 7 real
scanlines", but the mask actually consulted may be CEGGLF or CEGGRT, which have a leading blank
row and 6 real ones — so the effective reach is not always the number the comment quotes. That
is imprecise rather than false, and it is the sort of sentence the disabled `comment_analyzer`
exists to catch.

What about a malicious or extreme input? `velY` is a 16-bit signed ROM quantity; at `velY` of
±32768 the arithmetic still lands in a slot, and `eggMaskFor` is total — I verified totality
over 5607 pairs rather than assuming it. `velX` is an index that decays toward zero, and zero
is explicitly pinned to the RIGHT table by R1. A non-integer `velY` would break the comparison,
but nothing in the pure core can produce one.

The subtlest risk is the one I nearly missed: this story ADDS six entries to an array that two
call sites search by name (`main.ts:78`, `demo.ts:1495`). A name collision there would silently
re-point an existing sprite. I checked — no duplicate record names, no dangling sources, and
every new record has `name === source`, which makes `entitySource` an identity for exactly
these six. That is luck turned into safety by the naming convention, and it deserved verifying
rather than assuming, because nothing in the test suite would have caught a shadowed frame.

Finally: `posOffset` will decode EGGB2/EGGB3 wrongly the day anything draws them. It cannot
happen today, and I confirmed no call site can name those records — but the story has left a
loaded chamber for the hatch-animation story, and Dev's own note about it points at the wrong
axis. That is filed.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical and no High. Two Low findings, both in comment prose, both **fixed in place during
review** rather than bounced — a reject cycle costs more than the defect.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [LOW] | The jt8-4 doc comment for `eggBox` was orphaned — inserting `eggMaskFor` left it sitting above `eggMaskFor`'s own doc block, so `eggBox` lost its documentation and two doc blocks stacked in front of one function | `demo.ts:822` (pre-fix) | **FIXED** — moved back onto `eggBox` (now `:861`) |
| [LOW] | `WEGG (JOUSTRV4.SRC:3507-3530)` understates the routine, which ends at `JMP CLIPER` (:3531) | `demo.ts:823` (pre-fix) | **FIXED** — extent assertion DROPPED rather than corrected (8 other places repeat 3507-3530; changing one would be worse). Every load-bearing line is still cited individually and all verify |

**Data flow traced:** an egg's `velX`/`velY` (sim-internal, `egg.ts:37-58`) → `eggMaskFor`
(`demo.ts:824`) → one of three ROM mask names → `MASKS` (`demo.ts:333`) → `narrowPhase`
(`joust.ts:166`) → the catch decision → `score`/`egg-collected` events. Safe because the
selector is total (verified over 5607 input pairs, not assumed), the three names are all real
`COLLISION_TABLES` entries, and a typo in any of them reds 2 tests (R8) rather than silently
disabling every catch.

**Pattern observed:** the per-ROM-row `ENTITY_RECORD` (`pictures.ts:1699-1717`) correctly
follows jt3-7's IPTERO/ILAVAT precedent, and the two-phase `broadPhase` → `narrowPhase` shape
at `demo.ts:1073-1086` now matches the joust pass at `demo.ts:887-897` exactly. Good pattern,
followed correctly — I checked the joust pass rather than taking the comment's word for it.

**Error handling:** both new `continue` guards mirror the existing rule at `demo.ts:892`
("an entity with no transcribed mask cannot be jousted"). The null-collision guard is
unreachable at runtime but load-bearing for the typechecker — removing it fails
`npm run lint` with `TS2322`, which I verified by mutation rather than by reading.

**Observations (9):**
- `[LOW]` orphaned `eggBox` doc comment — **fixed**
- `[LOW]` overstated routine extent — **fixed** by removing the assertion
- `[VERIFIED]` `eggMaskFor` is TOTAL — 5607 `(velX, velY)` pairs, every one lands in exactly one of rows 0-2; evidence: exhaustive run, not inspection
- `[VERIFIED]` adding 6 records is behaviour-neutral at both name-lookup call sites — `main.ts:78` and `demo.ts:1495`; no duplicate record names, no dangling sources, and all six have `name === source` so `entitySource` is an identity for them
- `[VERIFIED]` Dev's re-baselined seeded pin is SHARP, not loosened — frames 522, 524 and the old 516 all red; only 523 passes
- `[VERIFIED]` the `ENTITY_RECORD_FLOOR` bump is REQUIRED by the guard, not tolerated by it — the guard asserts `floor >= realCount` and names the action in its own failure message
- `[VERIFIED]` every ROM line cited by the new comments and by all four claims re-opened and matched byte-for-byte; all four claim `verbatim` fields exact
- `[VERIFIED]` `EGGTBL` (`JOUSTRV4.SRC:3537-3544`) independently corroborates the seven-row extent from a DIFFERENT table — its maximum offset 36 → row 6 requires ≥ 7 rows
- `[VERIFIED]` R2 is an equivalent mutant, not a coverage gap — recorded so it is not re-filed

**Three upstream findings filed** (see Delivery Findings): EGGTBL is the hatch-animation
driver and wants its own story; `posOffset` will decode EGGB2/EGGB3's X offset as 255/254
instead of −1/−2 the day anything draws them; and `narrowPhase`'s X-blindness now governs two
passes instead of one.

**Gates:** joust+shared **2826/2826**, orchestrator **372/372**, `npm run lint` clean,
`node scripts/build-app.mjs joust` builds. Re-run after my two comment fixes.

**Handoff:** To SM for finish-story.
## Impact Summary (SM, finish phase)

**Blocking: 0.** One review round, verdict APPROVED, no Critical and no High. The two Low
findings were comment-prose defects the Reviewer fixed in place during review (commit
`eeccd7b`) rather than spending a reject cycle — so there is no "fixed in round 2" text
anywhere in this session that a later reader could mistake for an open item.

### What shipped

The player↔egg catch pass now runs `narrowPhase` after `broadPhase`, so an egg's vertical
catch reach is its transcribed mask (CEGGUP's 7 real scanlines) instead of the flat 16px
`ENTITY_BOX_H`. The mask is chosen per frame by `eggMaskFor`, a port of the ROM's `WEGG`,
which derives the frame from `velX`'s sign and `velY` against `$0080` — the ROM stores no
frame either, which is why the story's filed blocker ("EggState carries no frame field")
turned out not to be one. And `EGGI`'s six missing rows are transcribed, one record per ROM
line.

### The story's premise was PART FALSE and was corrected before RED

The filing's three `demo.ts` line cites had all drifted (`:687`→`:734`, `:902`→`:1027`,
`:783-788`→`:887-897`), and its headline instruction — "BLOCKED ON A DECISION FIRST … do not
just hardcode CEGGUP" — assumed the variant choice was a port DESIGN decision. It is not; the
ROM answers it mechanically. The description and ACs were rewritten from measurement at setup,
and the **story TITLE still asserts the refuted blocker** because the user ruled
repurpose-without-retitle. A reader who trusts the board's title will think this story is
parked. It is not; it shipped.

### Findings routed — all twelve

| Finding | Disposition |
|---|---|
| AC-2's boundary wrong at `velY = -128` | **FIXED** in `sprint/epic-jt8.yaml` (`0ab0d2f`) — the AC is the permanent record and disagreed with the machine |
| player↔ptero pass still box-only | **FILED jt8-13** (3pt, p2) — the setup ruling promised this one |
| `narrowPhase` is X-blind (pre-existing, jt2-3) | **routed into jt8-13** as a settle-this-first item, since that story adds the third consumer |
| `EGGTBL` is the hatch driver / rows 3-6 have no consumer | **FILED jt8-14** (5pt) — same finding from two directions (Dev's and the Reviewer's), one story |
| nothing DRAWS an egg at all | **routed into jt8-14** — it is the egg-animation story |
| `posOffset` decodes a high-bit XOFF as +255 | **FILED jt8-15** (2pt) — latent, and blocks jt8-14 |
| claim `JT8-130` described 7 frames while the code had 1 | **routed into jt8-14**, which resolves the discrepancy it documents |
| `ENTITY_RECORD_FLOOR` 44→50 | **DONE in this story** — the guard demanded it |
| four seeded pins re-baselined | **DONE in this story** — verified sharp (522/524/516 all red, only 523 passes) |
| `demo-contract.ts` missing `cues` | **DONE in this story** |
| signed-vs-unsigned position word | **subsumed by jt8-15**, which puts the sign in the decoder and leaves the data raw |
| the frozen fingerprint is blind to a real behaviour change | **recorded only** — no story. It is not broken for its stated purpose (proving the event channel draws no RNG); the finding is a caution against citing it as evidence a change was inert, and that caution now lives in the Reviewer sidecar where the next reviewer will meet it |

`jt5-17` was checked as a possible owner for the ptero finding and **rejected**: it owns the
ptero-vs-BUZZARD pair loop (the PTEBRD routing for a pair that resolves nothing today), while
this finding is a pair that already resolves with the wrong geometry. Different loop, different
routine. jt8-13's description carries an explicit "WHY THIS IS NOT jt5-17" paragraph so a
groomer reading only titles does not merge them.

### Verification

joust+shared **2826/2826**, orchestrator **372/372**, `npm run lint` clean,
`node scripts/build-app.mjs joust` builds — all re-run on the merged tree after the final
rebase, not just on the pre-rebase branch.
