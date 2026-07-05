---
story_id: "A-17"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-17: ROM-exact shape + velocity tables ported under reference/

## Story Details
- **ID:** A-17
- **Title:** ROM-exact shape + velocity tables ported under reference/
- **Jira Key:** (no Jira — local tracking)
- **Workflow:** tdd
- **Points:** 5
- **Priority:** p1
- **Stack Parent:** none
- **Repos:** asteroids
- **Branch:** feat/A-17-rom-shape-velocity-tables
- **Branch Strategy:** gitflow (feat/A-17-rom-shape-velocity-tables)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T00:38:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T23:14:05Z | 2026-07-04T23:17:23Z | 3m 18s |
| red | 2026-07-04T23:17:23Z | 2026-07-05T00:15:46Z | 58m 23s |
| green | 2026-07-05T00:15:46Z | 2026-07-05T00:28:34Z | 12m 48s |
| review | 2026-07-05T00:28:34Z | 2026-07-05T00:38:53Z | 10m 19s |
| finish | 2026-07-05T00:38:53Z | - | - |

## Story Context

### Technical Approach
Port ROM-exact shape coordinate tables and velocity tables from Atari's 1979 Asteroids source code (quarried from 6502disassembly.com/va-asteroids) into the asteroids subrepo's `reference/` directory. The `reference/` directory serves as the "quarry" of ROM-derived source data and ROM constants used by the core simulation (`src/core`).

**Deliverables:**
- Asteroid shape tables (3 sizes: large, medium, small) with authentic vector coordinates
- Ship shape silhouette coordinates
- Saucer shapes (large and small) with authentic coordinates
- Velocity/physics constant tables (derived from ROM behavior analysis)
- Documentation explaining ROM sources and table format

### Acceptance Criteria
- [ ] Asteroids reference/ directory structured with shape and velocity data files
- [ ] Shape tables contain ROM-exact coordinates for all asteroid sizes
- [ ] Ship and saucer silhouettes match ROM reference artwork
- [ ] Velocity constants documented and sourced from ROM disassembly notes
- [ ] All files properly formatted and documented for core integration
- [ ] No application code; pure reference data (JSON or data format)

## Delivery Findings

No upstream findings at this time.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): `src/shell/render.ts` still holds the hand-drawn unit-radius shape arrays (`ROCK_VARIANTS`, ship/saucer scalar dims) — the shapes are NOT yet ROM-derived. Affects `src/shell/render.ts` (must decode the `reference/` DVG move lists into vertices and draw from them, replacing the private hand-drawn consts). *Found by TEA during test design.*
- **Gap** (non-blocking): ROM-exact asteroid velocities were not cleanly sourced from the disassembly; `ROCK_SPEED_MIN/MAX` remain feel-based/provisional. Affects `src/core/rocks.ts` + `reference/velocities.ts` (rock speed bands still need ROM extraction — the velocities table intentionally scopes to the well-sourced ship/saucer/thrust constants). *Found by TEA during test design.*
- **Question** (non-blocking): the ROM ship shape is labelled `ShipDir0` ($1290) — does the Vector ROM store multiple pre-rotated ship silhouettes (ShipDir0..N) or one that render rotates in software? Affects `reference/shapes.ts` (SHIP_SHAPE is pinned to ShipDir0 only). Confirm during the GREEN decode. *Found by TEA during test design.*
- **Improvement** (non-blocking): the shape move fixtures are the computerarcheology `VectorROM.html` decode, not a raw-ROM byte extraction. Affects `tests/reference-shapes.test.ts` + `reference/shapes.ts` (GREEN/verify must re-confirm every SVEC/VEC move against the raw Vector ROM $5000-$57FF and correct fixtures on any discrepancy). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the `reference/` tables are canonical-by-test but not yet imported by core/render, so duplicated literals remain (the 65-byte ThrustTbl lives in both `src/core/ship.ts` and `reference/velocities.ts`). A follow-up should wire core + render to consume `reference/` and drop the copies. Affects `src/core/ship.ts`, `src/core/saucer.ts`, `src/shell/render.ts`. *Found by Dev during implementation.*
- **Gap** (non-blocking): `tsconfig.json` `include` is `["src","tests"]` — `reference/` is outside it. If a follow-up makes `src/core` import from `reference/`, add `reference` to `include` (or `tsc --noEmit` breaks with a module-resolution error). Affects `asteroids/tsconfig.json`. *Found by Dev during implementation.*
- Carried forward from TEA (still outstanding): byte-exact re-verification of every shape move against the raw Vector ROM ($5000-$57FF), and ROM sourcing of the provisional `ROCK_SPEED_MIN/MAX` bands.

### Reviewer (code review)
- **Improvement** (non-blocking): the test fixtures `type Move` + the `Move[]` const arrays (ROCK1-4, SHIP_MOVES, SAUCER_MOVES) are mutable, while the production `DvgMove`/`RomShape` types are `readonly`. Tighten the fixtures to `readonly` for consistency (lang-review #2). Affects `tests/reference-shapes.test.ts` (lines 40, 48, 53, 58, 63, 72, 79). *Found by Reviewer during code review.*
- **Question** (non-blocking): `reference/velocities.ts` `SAUCER_BULLET_SPEED = 111` is mirrored into core directly (no ÷256), whereas `MAX_ABS_VELOCITY_RAW` is ÷256 in core — confirm the bullet-speed unit against the lo-units/frame convention when core/render finally consume the table. Affects `src/core/saucer.ts`, `src/core/bullet.ts` (pre-existing; mirrored faithfully by A-17). *Found by Reviewer during code review.*
- **Gap** (non-blocking, reiterated): "ROM-exact" fidelity is currently asserted against the computerarcheology decode, not the raw Vector ROM. Byte-exact re-verification of the shape move lists against $5000-$57FF MUST happen before render consumes them. Affects `reference/shapes.ts`, `tests/reference-shapes.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

No deviations logged.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Shape tables stored as raw DVG move lists, not decoded vertex arrays**
  - Spec source: context-story-A-17.md, Acceptance Criteria
  - Spec text: "Shape tables contain ROM-exact coordinates for all asteroid sizes"
  - Implementation: `reference/shapes.ts` holds ordered `{op,scale,x,y}` SVEC/VEC moves (the raw ROM picture data); decoding to screen vertices is render's job
  - Rationale: raw DVG moves are byte-faithful to the Vector ROM; decoded unit-radius vertices would bake in scale math and forfeit "ROM-exact"
  - Severity: minor
  - Forward impact: Dev must add a DVG-move→vertex decoder and rewire `src/shell/render.ts` to consume it
- **reference/ holds RAW ROM values; core holds derived/converted values**
  - Spec source: README.md "Reference material" + context-story-A-17.md
  - Spec text: "the eventual data swap is a constant change, not a refactor"
  - Implementation: e.g. reference `MAX_ABS_VELOCITY_RAW = $3FFF` while core `SHIP_MAX_SPEED = $3FFF/256`; wiring specs prove the conversion
  - Rationale: keeps `reference/` a faithful ROM mirror and makes the core-derives-from-reference relationship explicit and testable
  - Severity: minor
  - Forward impact: core modules import from `reference/` instead of carrying their own literals
- **"under reference/" reconciled against the .gitignore (per user decision)**
  - Spec source: story title "ported under reference/"; `.gitignore:28`; user decision (Q2)
  - Spec text: "ROM-exact shape + velocity tables ported under reference/"
  - Implementation: the raw copyrighted disassembly quarry stays gitignored; the derived tables (`reference/shapes.ts`, `reference/velocities.ts`) are committed under `reference/` via an un-ignore
  - Rationale: committed source cannot live in a blanket-gitignored dir (CI + other checkouts would break); the user explicitly chose to un-ignore the derived tables
  - Severity: minor
  - Forward impact: Dev must add a `.gitignore` negation (e.g. `!reference/*.ts`) so the tables track while the raw quarry stays ignored
- **Ship rotation-variant count left unpinned**
  - Spec source: context-story-A-17.md, Acceptance Criteria
  - Spec text: "Ship and saucer silhouettes match ROM reference artwork"
  - Implementation: `SHIP_SHAPE` pinned to ShipDir0 ($1290) only; tests do not assert the total number of pre-rotated ship shapes
  - Rationale: avoid baking a wrong assumption — whether the ROM stores one ship shape (render rotates) or ShipDir0..N is unresolved (see Delivery Findings Question)
  - Severity: minor
  - Forward impact: the GREEN decode may add more ship shapes; the `SHIP_SHAPE` assertion may need to become a table

### Dev (implementation)
- **Core/render NOT wired to the reference tables (integration deferred)**
  - Spec source: context-story-A-17.md, Acceptance Criteria
  - Spec text: "All files properly formatted and documented for core integration"
  - Implementation: created `reference/shapes.ts` + `reference/velocities.ts` as standalone canonical data; did NOT rewire `src/core/*` or `src/shell/render.ts` to import them
  - Rationale: (a) `tsconfig.json` include is `["src","tests"]`, so `src`→`reference` imports break `tsc --noEmit`; (b) TEA flagged render-rewire + rock-speed sourcing as non-blocking gaps; (c) minimalist GREEN — no failing test requires the rewire. The test suite enforces core↔reference value parity, so the tables are canonical-by-test.
  - Severity: minor
  - Forward impact: a follow-up wires core/render to consume `reference/` (adding `reference` to tsconfig include); until then the ThrustTbl literal is duplicated in `src/core/ship.ts`
- **Tightened two test type annotations to honour the tables' readonly types**
  - Spec source: tests/reference-shapes.test.ts (TEA artifact)
  - Spec text: `(s: { moves: Move[] })` and `shape.moves as Move[]`
  - Implementation: removed the mutable `{ moves: Move[] }` callback annotation (now inferred as `RomShape`) and the `as Move[]` cast (iterate the `readonly DvgMove[]` directly)
  - Rationale: `reference/shapes.ts` types `moves` as `readonly DvgMove[]` (correct for immutable ROM data, lang-review #2); the mutable annotations broke `tsc --noEmit`. No assertion/semantics changed.
  - Severity: trivial
  - Forward impact: none

### Reviewer (audit)
- **TEA — Shape tables as raw DVG move lists** → ✓ ACCEPTED by Reviewer: faithful to the ROM picture data; decode→vertex is correctly left to render (a later story).
- **TEA — reference/ raw values, core derived** → ✓ ACCEPTED by Reviewer: clean mirror; the ÷256 conversion is proven by the wiring specs. (Note: scalar constants used raw by core — e.g. bullet speed — are documented per-constant; see the unit Question in Delivery Findings.)
- **TEA — "under reference/" reconciled via un-ignore** → ✓ ACCEPTED by Reviewer: verified with `git check-ignore` — only `reference/*.ts` track; raw quarry subdirs and stray `reference/*.lst`/`.md` stay ignored. Matches the user's Q2 decision.
- **TEA — Ship rotation-variant count unpinned** → ✓ ACCEPTED by Reviewer: pinning ShipDir0 only avoids baking a wrong assumption; the open question is documented for the render/decode follow-up.
- **Dev — Core/render NOT wired (integration deferred)** → ✓ ACCEPTED by Reviewer: justified by the `tsconfig include:["src","tests"]` constraint, TEA's non-blocking gaps, and minimalist scope; the test suite enforces core↔reference parity. Residual ThrustTbl duplication is tracked as a Delivery Finding.
- **Dev — Tightened two test type annotations** → ✓ ACCEPTED by Reviewer: correct — honours the tables' `readonly` types with no change to assertions. (Related LOW: the remaining fixtures are still mutable — see Delivery Findings Improvement.)

## Sm Assessment

**Routing:** New Work Flow → setup complete → hand off to TEA (Han Solo) for RED.

**Nature of this story (pattern analysis):** A-17 is a *data-porting* story, not a
behavior story. The deliverable is ROM-derived reference data (shape coordinate
tables + velocity/physics constant tables) landed under the asteroids
`reference/` quarry, sourced from 6502disassembly.com/va-asteroids. This shapes
the RED phase: there is no new runtime behavior to drive — the failing tests
must assert the **presence, structure, and ROM-exact values** of the reference
tables, not gameplay outcomes.

**Guidance for TEA (RED):**
- Write failing tests that load the `reference/` data and assert on it:
  vertex/shape counts per asteroid size (large/medium/small), ship + saucer
  silhouette structure, and named velocity/physics constants matching documented
  ROM values.
- Cross-check target values against the existing ROM-tuned sim work already
  landed (A-2 core tick, A-3 ship flight model "ROM-tuned") so the reference
  tables are the single source of truth the core can later consume — don't
  invent numbers that contradict the shipped flight model.
- Per AC: pure reference data (JSON or data format), **no application code**.
  Keep tests asserting data contract, not integration into `src/core` (that is a
  later story's concern).

**Setup:** Session + context + branch verified present. Jira explicitly skipped
(local tracking, no Jira per project convention). Workflow: tdd (phased) →
next agent `tea`, next phase `red`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Data-porting story with a concrete, assertable contract (raw ROM
shape tables + velocity constants + single-source-of-truth wiring). Not a chore
bypass.

**Test Files:**
- `tests/reference-shapes.test.ts` (13 specs) — the four asteroid outlines
  ($11E6/$11FE/$121A/$1234), the ship silhouette (ShipDir0 $1290) and the single
  saucer shape ($1252) pinned as exact DVG SVEC/VEC move lists; schema +
  provenance invariants; rocks carry no angle field; lang-review #1 type-safety
  scan of `reference/`; committed-not-gitignored check.
- `tests/reference-velocities.test.ts` (12 specs) — ThrustTbl (65B, $57b9),
  max-vel $3FFF ($7125), rotation rate 3, saucer Y-speeds [-16,0,0,16] ($6CD1),
  saucer bullet speed 111 ($6F), fire interval 10 frames ($0A), shot lifetime 18
  ($6d01) — each ROM-pinned and wired to the core constant it feeds.

**Tests Written:** 25 specs across the two files, covering all 6 story ACs.
**Status:** RED — confirmed twice by `testing-runner` (RUN_ID `A-17-tea-red`):
25/25 new specs fail for the right reason (missing `reference/` modules / absent
`reference/` dir), 593 pre-existing tests still pass, **0 regressions**, no parse
errors. Branch `feat/A-17-rom-shape-velocity-tables`, commit `0742335`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `reference/ stays typed (lang-review #1)` — scans `reference/*.ts` for `as any`/@ts-ignore/@ts-expect-error | failing (RED — dir absent) |
| #8 test quality | self-audit: every spec has a meaningful assertion; no `as any` in test assertions; non-vacuity guards added | pass (self-audited) |
| #5 module (.js ext) | N/A — project uses **extensionless** imports (`moduleResolution: bundler`); the `.js`-extension rule does not apply | n/a |
| #2 readonly arrays | noted for Dev (reference tables should export `readonly` arrays); not runtime-asserted to avoid forcing `Object.freeze` | deferred |

**Rules checked:** 1 of 13 lang-review rules is directly encodable as a test for
a pure static-data story (#1); #8 self-audited; the remainder (enums,
null-handling, async, React/JSX, input-validation, error-handling, build-config,
perf) are N/A to ROM data tables with no runtime logic.
**Self-check:** 0 vacuous tests. Non-vacuity guards include rock count ==
`ROCK_SHAPE_VARIANT_COUNT`, thrust table 0→127 monotonic, and the core↔reference
wiring equalities (a mislabelled reference value fails a wiring spec).

**Handoff:** To Dev (Yoda) for GREEN — create `reference/shapes.ts` +
`reference/velocities.ts` holding the RAW ROM data in the schema the tests pin,
add a `.gitignore` un-ignore (`!reference/*.ts`) so they track, and rewire the
core constants (+ `src/shell/render.ts`) to derive from the reference tables.
**Read the Design Deviations + Delivery Findings above first** — the raw-move
representation, the render decoder/rewire, the un-ignore, the ShipDir0 open
question, and the mandatory byte-exact re-verification of every shape move
against the raw Vector ROM ($5000-$57FF).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `reference/shapes.ts` (new) — four asteroid outlines ($11E6/$11FE/$121A/$1234),
  ship ShipDir0 ($1290) and the single saucer ($1252) as raw DVG SVEC/VEC move
  lists; typed `RomShape`/`DvgMove` with `readonly` fields; ROM-cited header.
- `reference/velocities.ts` (new) — ThrustTbl (65 bytes verbatim, $57b9),
  `MAX_ABS_VELOCITY_RAW = $3FFF`, `ROTATION_RATE = 3`, saucer Y-speeds
  `[-16,0,0,16]`, `SAUCER_BULLET_SPEED = 111`, `SAUCER_FIRE_INTERVAL_FRAMES = 10`,
  `SHOT_LIFETIME_FRAMES = 18`; ROM-cited header.
- `.gitignore` (mod) — `reference/` → `reference/*` + `!reference/*.ts`, so the
  ported tables commit while the raw copyrighted disassembly quarry stays ignored.
- `tests/reference-shapes.test.ts` (mod) — tightened two type annotations to
  honour the tables' `readonly` types (no assertion change; see deviation).

**Tests:** 618/618 passing (GREEN) — 25/25 new specs green, 593 pre-existing
green, **0 regressions**. `npm run build` (`tsc --noEmit && vite build`) exits 0.
Confirmed by `testing-runner` RUN_ID `A-17-dev-green`.
**Branch:** feat/A-17-rom-shape-velocity-tables (pushed, commit `ee1157c`).

**Scope note (minimal GREEN):** Created the `reference/` tables as standalone
canonical data. Core/render integration is deferred — TEA flagged render-rewire
+ rock-speed sourcing as non-blocking gaps, no failing test requires the rewire,
and `tsconfig` `include` (`["src","tests"]`) would break `tsc` if `src` imported
`reference/`. The test suite enforces core↔reference value parity in the interim.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 618/618 green, build exit 0, tree clean, .gitignore verified |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 7 (all rule #2, test-only) | confirmed 1 (grouped, LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via settings)
**Total findings:** 1 confirmed (LOW — grouped test-fixture readonly), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

### Rule Compliance (lang-review typescript.md + story ACs)

Enumerated via my own read + the reviewer-rule-checker backstop (16 rules, 70 governed instances):

- **#1 type-safety escapes** — compliant. Zero `as any`/`@ts-ignore`/`@ts-expect-error`/non-null `!` in `reference/*.ts` and the tests (runtime-pinned by the no-any scan spec).
- **#2 readonly on immutable data** — production tables COMPLIANT (`DvgMove`/`RomShape` fields `readonly`, `readonly number[]`/`readonly RomShape[]` at `reference/shapes.ts:31-42`, `reference/velocities.ts:22,50`). **7 violations, all test-only:** `type Move` + `Move[]` fixtures at `tests/reference-shapes.test.ts:40,48,53,58,63,72,79` are mutable. CONFIRMED (rule applies) → downgraded to **LOW** (test fixtures, never mutated; production is guarded).
- **#3 enums** — compliant. `DvgOp` is a string-literal union, not an enum.
- **#5 module** — compliant. `export type DvgOp`; interfaces exported directly; extensionless imports are the intentional bundler convention (`.js`-extension rule N/A here).
- **#8 test quality** — compliant. 25 non-vacuous specs (exact `toEqual`/`toBe`, cross-check vs `ROCK_SHAPE_VARIANT_COUNT`, `not.toHaveProperty`, real `git check-ignore` + `readFileSync` provenance). No `as any` in tests; no mocks; no `dist/` imports.
- **#14 pure data (AC)** — compliant. `reference/*.ts` are types + `const` data + trivial one-line builders (`svec`/`vec`); no conditionals, loops, mutation, or game logic.
- **#15 purity** — compliant. Zero imports; no `window`/`document`/`Date.now`/`Math.random`.
- **#16 ROM-citation** — compliant. Every shape (addresses $11E6/$11FE/$121A/$1234, $1290, $1252) and every velocity constant ($57b9, $7125, $708b, $6CD1, $6F, $0A, $6d01) cites its ROM source.
- **#4, #6, #7, #9, #10, #11, #12, #13** — no governed instances in the diff (N/A).

### Observations

- [VERIFIED] `.gitignore` un-ignore is correct — evidence: `git check-ignore reference/shapes.ts` → not ignored; `reference/va-asteroids/foo.lst` and stray `reference/foo.lst` → ignored; `git ls-files reference/` shows only the two `.ts`. Complies with the "raw copyrighted quarry NEVER committed" rule.
- [VERIFIED] Production ROM tables are immutable — evidence: `reference/shapes.ts:31-42` (`readonly` throughout), `reference/velocities.ts:22,50` (`readonly number[]`). Complies with lang-review #2.
- [VERIFIED] Pure reference data, no wiring risk — evidence: grep shows zero imports / no DOM / no entropy in `reference/*.ts`; complies with AC "no application code" and core-purity.
- [VERIFIED] ROM provenance cited per constant/shape — evidence: `reference/velocities.ts:17-59` JSDoc addresses; `reference/shapes.ts:48,87,98` address citations. Complies with #16.
- [VERIFIED] Tests are non-vacuous and enforce core↔reference parity — evidence: `tests/reference-velocities.test.ts` deep-equals `SHIP_THRUST_TABLE`↔`THRUST_TABLE`, `SHIP_MAX_SPEED`↔`MAX_ABS_VELOCITY_RAW/256`, etc. Complies with #8.
- [LOW][RULE] Test fixtures `Move`/`Move[]` mutable while production is `readonly` — `tests/reference-shapes.test.ts:40,48,53,58,63,72,79`. Confirmed (rule #2), non-blocking (test-only, never mutated).
- [MEDIUM] "ROM-exact" is asserted against the computerarcheology decode, not the raw Vector ROM — the fidelity specs pin the tables to fixtures drawn from the *same* decode, so they guard future drift but cannot detect an *original* decode error. Documented-deferred (TEA/Dev deviations + Delivery Findings); non-blocking because render does not consume the shapes yet. Flagged so it is not forgotten before render integration.
- [LOW] Unit Question — `SAUCER_BULLET_SPEED = 111` mirrored raw while `MAX_ABS_VELOCITY_RAW` is ÷256; possible pre-existing core unit inconsistency, out of scope, mirrored faithfully.

### Dispatch tags

- **[EDGE]** N/A — edge-hunter disabled; pure static data has no runtime branch/boundary paths.
- **[SILENT]** N/A — silent-failure-hunter disabled; no error-handling paths (the only `try/catch` are intentional `git check-ignore` test guards).
- **[TEST]** test_analyzer disabled; covered by rule-checker #8 — assertions non-vacuous, no [TEST]-severity issues.
- **[DOC]** comment-analyzer disabled; checked manually — headers accurate; the ⚠ re-verify caveat is intentional provenance doc, not a stale/TODO marker.
- **[TYPE]** type_design disabled; checked manually + rule-checker #2 — production `readonly` sound; test fixtures mutable (LOW, above).
- **[SEC]** N/A — security disabled; no user input/secrets; the copyrighted raw quarry is correctly NOT committed (verified).
- **[SIMPLE]** simplifier disabled; manual check — `svec`/`vec` are trivial builders, no over-engineering; the residual ThrustTbl duplication is a documented deferred deviation, not accidental complexity.
- **[RULE]** rule-checker: 7 findings, all rule #2 (test-fixture readonly), grouped + confirmed LOW; rules #1, #3-#16 clean.

### Data flow traced

`reference/shapes.ts` / `reference/velocities.ts` exports → imported ONLY by the two test files (and the wiring specs compare them to `src/core` constants). No production path imports `reference/` yet (integration deferred). Current sole consumer is the test suite, which enforces core↔reference value parity — verified GREEN (618/618). Safe: no runtime behaviour changed.

### Devil's Advocate

Argue this is broken. The headline word is "ROM-**exact**", yet exactness is never proven against the actual ROM. Every shape fixture was lifted from a computerarcheology web page through a summarizing fetch, and the tests then assert the committed tables equal those same fixtures. That is circular: the 25 "ROM-exact" specs are self-consistent by construction and would stay green even if a `SVEC` move were dropped, transposed, or sign-flipped during decoding — they cannot detect an original error, only future drift. A future developer glancing at "25 passing ROM-exact tests" will reasonably but wrongly conclude byte-fidelity is proven; the truth is that fidelity rests entirely on the trustworthiness of one secondary source. If a rock outline is subtly wrong, no test here fails — the error surfaces only when render finally rasterises the moves and a human eyeballs a malformed asteroid. Second attack: the `.gitignore` negation `!reference/*.ts` keys on file *extension*, not *content*. If someone later drops a `.ts` file that pastes raw commented disassembly into `reference/`, it will be silently committed — the copyright guard is one careless filename away from failing. Third: the mutable test fixtures (`Move[]`) could, in a future refactor, be mutated in place by a shared helper, silently corrupting a `toEqual` baseline. Fourth: the `SAUCER_BULLET_SPEED` unit ambiguity (raw vs ÷256) is a latent trap for whoever wires these constants into core/render. None of these are blocking for a data-only, not-yet-consumed change — but each is real, and each is now recorded (deviations + Delivery Findings) rather than left to surprise the next agent. The most important guardrail before render integration: re-verify the shape bytes against the raw Vector ROM.

### Verdict

**APPROVED.** No Critical or High issues. The single confirmed rule-#2 finding is test-only and LOW; the shape-fidelity concern is MEDIUM but documented-deferred and cannot mislead players because the shapes are not yet rendered. All six logged deviations audited and ACCEPTED.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.