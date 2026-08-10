---
story_id: "pm4-4"
jira_key: "pm4-4"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-4: [INVESTIGATION] Ghost-house wall/traversal audit

## Story Details
- **ID:** pm4-4
- **Jira Key:** pm4-4
- **Workflow:** tdd
- **Type:** chore
- **Points:** 2
- **Stack Parent:** none
- **Branch:** feat/pm4-4-ghost-house-gate-lateral-passage
- **PR:** https://github.com/slabgorb/arcade/pull/195

## Investigation Findings (Boss Oracle)

Investigation RESOLVED to **branch (b): maze-authoring artifact requiring code fix.** The reported wall/traversal block is NOT the authentic gate/house rule; it is a bug in the maze row table.

**Root Cause:** The ghost-house/gate STAMP in `plugins/pac-man/tools/bake-core-maze.mjs:58-63` bakes the gate '==' at row 14 cols 13-14, which is the OPEN LATERAL CORRIDOR one row ABOVE the house top. There is NO house-top wall row flanking the gate. Result: the gate floats in the traffic lane and blocks Pac-Man's left↔right passage across that corridor.

**Verified Correct:** `isWalkable` RULE in `plugins/pac-man/src/core/maze.ts:117-128` correctly returns false for 'gate'/'house' tiles when actor==='pac-man' and true for 'ghost'. Leave that rule alone.

**Current Constants:** 
- HOUSE_TOP=15, HOUSE_BOT=18, HOUSE_L=11, HOUSE_R=16
- GATE_ROW=14, GATE_L=13, GATE_R=14

**Fix:** Adjust HOUSE_* constants in the baker (bake-core-maze.mjs:57 invites this adjustment). Regenerate via npm/node to update `plugins/pac-man/src/core/maze-topology.generated.ts`. Do NOT hand-edit the generated file — tests/core/maze-topology.test.ts re-derives and asserts equality.

**Reference Screenshots:**
- Authentic arcade: `sprint/demos/pm4-4/reference/real-pacman-authentic-house.png`
- Our clone (buggy): `sprint/demos/pm4-4/reference/our-clone-gate-blocks-lateral.png`

**Playtest:** Static screenshot only (boss has photosensitive epilepsy). Use Playwright headless per arcade playtest memo.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T10:49:33Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T08:16:12Z | 2026-08-10T08:19:55Z | 3m 43s |
| red | 2026-08-10T08:19:55Z | 2026-08-10T08:58:19Z | 38m 24s |
| green | 2026-08-10T08:58:19Z | 2026-08-10T10:32:50Z | 1h 34m |
| review | 2026-08-10T10:32:50Z | 2026-08-10T10:45:38Z | 12m 48s |
| green | 2026-08-10T10:45:38Z | 2026-08-10T10:48:31Z | 2m 53s |
| review | 2026-08-10T10:48:31Z | 2026-08-10T10:49:33Z | 1m 2s |
| finish | 2026-08-10T10:49:33Z | - | - |

## Delivery Findings

- **Improvement** (non-blocking): the ghost-house geometry moved — gate row 14→15
  (now recessed in the house top wall), interior rows 15-18→16-18 (now 3 tall).
  Affects `plugins/pac-man/src/core/game.ts` fruit/eaten-ghost re-entry paths that
  pm4-3 (eyes-return → forced house exit, still backlog) will add — pm4-3 must read
  the CURRENT geometry (gate at row 15, interior 16-18), not the old table.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking, this story): the geometry-shift retirement was swept in
  `ghost.test.ts`'s header but NOT in two other places that carry the identical
  claim — `plugins/pac-man/docs/rom-study/glossary.md:159-160` (the canonical
  ROM-study doc) and `plugins/pac-man/src/core/ghost.ts:53-56` (the `RED_ZONE_TILES`
  doc-comment). Both say the tiles "directly over the gate itself … are walled
  above"; post-fix the tiles directly over the (row-15) gate are row-14 cols 13-14,
  the OPEN corridor this story created. Reword both, ref-stable, anchored to row 13
  (the unchanged wall) rather than "the gate" (whose row now moves).
  *Found by Reviewer during code review.*

## Impact Summary

**Delivery Findings Compiled** (Round-Trip 1, Approved)

### Critical Issues Resolved
- **[DOC] Stale geometry claim** (severity: LOW, blocking) — "tiles directly over the gate are walled above" — post-fix applies to row-14 (open corridor, not walled)
  - Location: `glossary.md:159-160` (canonical ROM-study doc), `ghost.ts:53-56` (RED_ZONE_TILES doc-comment)
  - Resolution: Both reworded ref-stable, anchored to row-13 wall (unchanged) rather than "the gate" (moved)
  - Commit: `7acd1f2e` (docs sweep + verification)
  - Status: ✓ RESOLVED, zero remaining "walled above the gate" claims found by grep

### Forward Impact
- **pm4-3 (eyes-return feature)** depends on CURRENT geometry (gate at row 15, interior 16-18) — legacy table in `game.ts` fruit/eaten-ghost paths must be updated when pm4-3 reads this table; improvement finding recorded to prevent surprise.
- No other impact: `isWalkable` rule untouched, spawns unaffected, DOT_COUNT invariant holds.

### Verification Checklist
- ✓ Tests: 286/286 GREEN (pac-man suite, including 2 RED→GREEN drivers for lateral passage + 3 spawn regression guards)
- ✓ Lint: clean (tsc --noEmit, repo-wide)
- ✓ Generated file re-baked: byte-clean (deterministic, `maze-topology.test.ts` re-derivation)
- ✓ Design Deviations: 2 minor (fixture edit + explicit stamp) — both ACCEPTED by Reviewer
- ✓ PR Status: MERGED (https://github.com/slabgorb/arcade/pull/195, merged 2026-08-10T10:54:03Z)

**Ready for finish:** Yes — all blocking findings resolved, one round-trip complete, code merged.

## Design Deviations

### Dev (implementation)
- **Edited a pre-existing test fixture (`ghost.test.ts`) that encoded the old buggy geometry**
  - Spec source: TEA RED tests (context-story-pm4-4.md ACs) — the geometry fix is the spec
  - Spec text: "move the gate into a real house-top wall … interior → rows 16-18"
  - Implementation: `ghost.test.ts:42` asserted `isWalkable(12,15,'ghost') === true`
    ("house interior") from the old 4-row-tall house. After the fix `(12,15)` is the
    house TOP WALL, so I flipped the assertion to `false` and refreshed its file-header
    note + one stale in-body comment (`down leads into the ghost house` → now a wall).
    No pm4-4 test was weakened; the change makes an old fixture tell the new truth.
  - Rationale: the fixture pinned an incidental fact of the buggy geometry; leaving it
    would fail GREEN against the correct maze. The test's PURPOSE (a red-zone tile with
    a walkable up-neighbour) is preserved — up `(12,13)` still asserted walkable.
  - Severity: minor
  - Forward impact: none — no behavior depends on `(12,15)` being interior; spawns and
    RED_ZONE_TILES are unaffected (verified).
- **Stamped the house TOP WALL explicitly rather than leaning on the banner capture**
  - Spec source: context-story-pm4-4.md, Technical Approach
  - Spec text: "add a top-wall stamp so row 15 is `#` across cols 10-17 except the gate"
  - Implementation: `bake-core-maze.mjs` now stamps `#` across the house width at
    `GATE_ROW` before punching the door, instead of relying on the GAME-OVER banner
    happening to classify those cells as wall.
  - Rationale: the house is explicitly ROM-geometry-STAMPED (not captured); depending on
    banner contamination to supply the top wall would be fragile and dishonest.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **Dev deviation 1 (edited `ghost.test.ts` fixture `(12,15)` true→false)** → ✓ ACCEPTED:
  verified against the regenerated table — `(12,15)` is now the house top wall (`'#'`),
  so `isWalkable(12,15,'ghost')===false` is correct; the test's purpose (walkable
  up-neighbour at a red-zone tile) is preserved by the `(12,13)` assertion. Sound.
- **Dev deviation 2 (explicit top-wall stamp in the baker)** → ✓ ACCEPTED: correct and
  self-documenting; the topology test re-derivation is byte-clean and the stamp makes
  the gate a door-in-a-wall independent of banner luck.
- **UNDOCUMENTED (Reviewer-found):** the Dev Assessment claims "glossary.md
  §Ghost-movement red-zone note traced and still accurate." That judgment was wrong on
  two counts: it missed `ghost.ts:53-56` (the same claim in a core source comment,
  never traced) and the glossary claim itself is now misleading for the row-15 gate.
  Logged as a blocking Delivery Finding above. Severity: LOW (docs/comments only).
- **Branch:** feat/pm4-4-ghost-house-gate-lateral-passage
- **PR:** none yet

## Sm Assessment

**Setup complete — routing to TEA (RED).** *Bzzz! This one's SUPERGREEN, baby.*

- **Story:** pm4-4 [INVESTIGATION → confirmed bug, p2] — the ghost-house gate is
  stamped into the open lateral corridor, barring Pac-Man's left↔right passage.
- **Investigation is CLOSED, not open:** resolved to branch (b), maze-authoring
  artifact. The `isWalkable` rule (`maze.ts:117-128`) is correct — do **not** touch it.
- **Root cause:** `bake-core-maze.mjs:57-63` — `GATE_ROW=14` puts the gate in the
  corridor one row above the house top, with no top-wall row flanking it.
- **Fix:** adjust the stamp (strong hypothesis: gate → row 15 recessed into a new
  house top wall, interior → rows 16-18), **regenerate** `maze-topology.generated.ts`
  (never hand-edit — `tests/core/maze-topology.test.ts` re-derives), and move ghost
  house/home coords in `house.ts`/`game.ts` in lockstep if the interior shifts.
- **RED phase for TEA:** write the failing walkability test (lateral corridor passable
  by pac-man; gate/house still impassable to pac-man, passable to ghost) and **anchor
  the geometry citation to Dossier ch.3** — do NOT fabricate a ROM line.
- **Guardrails:** preserve `DOT_COUNT`/energizer invariants (module throws otherwise);
  keep `TUNNEL_ROW` (row 17); verify with **static screenshots only** (boss has
  photosensitive epilepsy).
- Full technical approach + ACs + boss reference screenshots: `context-story-pm4-4.md`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Confirmed geometry bug (not a no-op) — needs behavioral coverage that fails
against the current maze and passes once the gate is recessed into a wall.

**Test Files:**
- `plugins/pac-man/tests/core/maze.test.ts` — new `describe('pm4-4: the ghost-house
  gate is a door set in a wall …')`: gate must be flanked by impassable tiles (a
  door, not a lane) and have an open lateral corridor directly above it. Gate is
  discovered from the table at runtime — **no hardcoded row numbers** — faithful to
  the maze's *reconstruction* status (glossary.md §Maze).
- `plugins/pac-man/tests/core/game.test.ts` — new `describe('pm4-4: ghost-house
  geometry — ghosts still spawn where they belong')`: regression guard so the
  interior shift can't strand a ghost (pinky/inky/clyde inside; Blinky outside,
  ghost-walkable).

**Tests Written:** 6 (2 RED drivers + 1 premise + 3 regression guards) covering the
lateral-passage AC and the spawn blast-radius.
**Status:** RED — verified failing:
- ✗ `is flanked left and right by tiles Pac-Man cannot enter` — tile left of the gate
  `(12,14)` is open path (walkable), so the gate bars lateral travel.
- ✗ `has an open lateral corridor directly above it` — `(13,13)` above the gate is
  walled; there is no lane to cross.
- ✓ premise + 3 spawn guards pass now (guards are green by design — they protect the
  blast radius, must STAY green after the fix). 284 other pac-man tests untouched.
`npm run lint` clean.

### Rule Coverage

| Rule (lang-review typescript.md) | Applies? | Coverage |
|---|---|---|
| Type-safety escapes / generics / enums / null-handling (#1–#4) | No | Fix is in a `.mjs` baker + a GENERATED `.ts` data file (no hand-edit) + `isWalkable` untouched — no new TS type surface. |
| Test quality / no vacuous assertions (Phase C self-check) | Yes | All 6 tests have meaningful, message-annotated assertions derived from the real table; no `assert(true)`, no always-null checks. |
| "No hand-edit of generated file" | Yes (existing) | Already enforced by `tests/core/maze-topology.test.ts`, which re-derives `maze-topology.generated.ts` from the VRAM capture + baker and asserts equality — Dev MUST fix the baker and regenerate. |

**Rules checked:** the 4 lang-review rule groups — 3 N/A to a generated-data fix, 1 (test quality) satisfied.
**Self-check:** 0 vacuous tests found.

### Dev handoff notes (GREEN)
- **Fix the STAMP, not the rule.** `tools/bake-core-maze.mjs:58-63`: move the gate into
  a real house-**top wall** row and drop the interior one row. Strong hypothesis
  (confirm the exact rows against **Dossier ch.3**, and eyeball the reference PNGs):
  `GATE_ROW = 15`, `HOUSE_TOP = 16` (interior rows 16-18), add a top-wall stamp so row 15
  is `#` across cols 10-17 except the gate at 13-14; row 14 reverts to open corridor.
- **Regenerate** the topology (`node plugins/pac-man/tools/bake-core-maze.mjs` or the
  npm script) — never hand-edit `maze-topology.generated.ts`.
- **Verified NON-issues (do not "fix" them):** the `isWalkable` rule (`maze.ts:117-128`)
  is correct; `RED_ZONE_TILES {x:12,y:14}/{x:15,y:14}` (ghost.ts) stay valid (shaft feet,
  y:14 unchanged); housed-ghost spawns are on row 17 which the fix does not touch. The
  spawn guard proves this — if it goes red, your interior shift moved too far.
- **Re-verify after regenerating:** full pac-man vitest green (esp. `maze.test.ts`,
  `maze-topology.test.ts`, `maze.test.ts` DOT_COUNT invariant — the module throws at load
  if a `.` gets overwritten), then a **static-screenshot** Playwright playtest (boss has
  photosensitive epilepsy — no motion capture) showing Pac-Man crossing the house-top
  corridor left↔right and still barred from entering the house.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes — *multipass.*

**Files Changed:**
- `plugins/pac-man/tools/bake-core-maze.mjs` — moved the gate into the house top
  wall: `GATE_ROW 14→15` (recessed into a stamped top wall spanning the house
  width), interior `HOUSE_TOP 15→16` (rows 16-18, middle aligned to warp row 17).
  Row 14 reverts to the captured open corridor.
- `plugins/pac-man/src/core/maze-topology.generated.ts` — regenerated by the baker
  (never hand-edited; `maze-topology.test.ts` re-derives + asserts equality, green).
- `plugins/pac-man/tests/core/ghost.test.ts` — updated the one fixture that encoded
  the old geometry (`(12,15)` interior → top wall) + 2 stale comments (see deviation).
- `sprint/demos/pm4-4/reference/after-fix-gate-in-top-wall.png` — static-screenshot
  evidence (epilepsy-safe): gate now sits in the house top wall, matching the arcade
  reference; the corridor above is a clear lateral through-lane.

**Root cause fixed:** the gate was stamped one row too high (into the open corridor),
barring Pac-Man's lateral passage. Now it is a 2-tile door recessed in the house top
wall — Pac-Man crosses the corridor above; entry into the house is still barred; ghosts
still exit. The `isWalkable` rule was correct and is untouched.

**Verification:**
- `npx vitest run --project pac-man` → **286/286 GREEN** (TEA's 2 RED drivers now pass;
  3 spawn guards still green; `maze-topology.test.ts` re-derivation green; DOT_COUNT/
  energizer load-invariant holds — no dots overwritten).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.
- Static-screenshot Playwright playtest at `/pac-man/` (served on :5290) → gate correctly
  in the house top wall; visually matches authentic reference, not the buggy `#2`.

**Blast radius checked (all clear):** ghost spawns (rows 14/17) unaffected; `RED_ZONE_TILES`
(y:14) still valid; `game.test.ts:299` (Blinky manually placed) and `maze-tilemap.test.ts`
(>10 house cells → now 18) both still pass; glossary.md §Ghost-movement red-zone note traced
and still accurate.

**Branch:** feat/pm4-4-ghost-house-gate-lateral-passage (pushed). No PR (SM finish phase).

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 765/765 tests GREEN; lint clean; generated file re-baked → byte-clean (deterministic, not hand-edited); no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment-staleness hand-covered by Reviewer (found the [DOC] finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | Codegen closed charset (no template-literal injection); no path traversal; build-time-only script; clean |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (rule 24, stale doc), dismissed 0, deferred 0 — Reviewer extended it (+1 site in ghost.ts) |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (round-trip 1 — the sole finding from the first pass is now RESOLVED)

*One bug is all it takes to ruin the ENTIRE feature — so I made it fix that one.* The
fix itself was correct, authentic, and thoroughly verified from the first pass; the only
blocker was a partially-swept geometry retirement (a now-misleading "walled above the
gate" claim surviving in the canonical ROM-study doc and a core source comment). Both
sites were reworded ref-stable (anchored to the fixed gate columns 13-14 and their walled
row-13 up-neighbour, not "the gate" whose row now moves), committed in `7acd1f2e`.
Re-verified: `grep` finds zero remaining "directly over the gate / walled above" claims,
`npm run lint` clean, pac-man suite 286/286 green. The rework was comment/doc-only — it
touched no logic, so the first-pass Subagent Results (preflight/security/rule-checker on
the substantive code) stand unchanged.

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [LOW] [RULE] [DOC] | Stale geometry claim "the tiles directly over the gate itself, which are walled above" — post-fix "over the gate" means the row-14 corridor this story opened. | `plugins/pac-man/docs/rom-study/glossary.md:159-160` | ✓ RESOLVED in `7acd1f2e` — reworded to "the two gate columns 13-14 between them, whose up-neighbour in row 13 is a wall". |
| [LOW] [RULE] [DOC] | Same stale claim in the `RED_ZONE_TILES` doc-comment (Reviewer found it by grep; outside the original diff). | `plugins/pac-man/src/core/ghost.ts:53-56` | ✓ RESOLVED in `7acd1f2e` — same reword, consistent with the glossary + `ghost.test.ts` header. |

### Rule Compliance (lang-review checklists + CLAUDE.md)
- **core/ purity** (no DOM/clock/Math.random/shell import in `src/core/`): the only core change is the generated data table (`maze-topology.generated.ts`) — a plain string array. `tests/purity.test.ts` green. VERIFIED — evidence: purity suite 23/23 (preflight + rule-checker).
- **Generated file never hand-edited:** VERIFIED — re-ran `bake-core-maze.mjs`, `git diff` on the generated file is empty (preflight + rule-checker both independently confirmed). Deterministic baker output.
- **DOT_COUNT / energizer load-invariant (maze.ts throws if dots≠240):** VERIFIED — `maze-topology.test.ts` counts exactly 240 dots + 4 energizers; the changed rows added no `.`/`o`. evidence: generated rows 14-15 contain only `#`/`=`/space.
- **No dead code / no future-proofing:** VERIFIED — the added baker `for` loop and every new test block are exercised; no unused constants.
- **Test quality (non-vacuous):** VERIFIED [TEST] — every new `expect` derives its value from `tileAt`/`isWalkable`/game state (src-derived), gate discovered by table scan (no hardcoded rows), custom messages throughout; rule-checker rules 15/18/26 all compliant.
- **TS type-safety (no `as any`/`@ts-ignore`/non-null-assert):** VERIFIED [TYPE] — `import type { GhostId }` and inline `type Tile` are correct type-only imports; no escapes introduced.

### Key observations (tags: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE])
- [RULE][DOC] Confirmed rule-checker finding + extended it by one site (`ghost.ts:53-56`). See severity table.
- [SEC] VERIFIED clean — the baker embeds each row into a `'...'` template literal, but the classifier emits only a closed set `[#.oHT= ]` (any other byte throws), so no quote/backslash/`${` can break out. evidence: `bake-core-maze.mjs:33-38` + generated charset check.
- [SIMPLE] VERIFIED — minimal, on-point change: 2 constants + 1 top-wall stamp loop; no over-engineering.
- [TEST] VERIFIED — the two RED drivers genuinely encode the fix (flanked-by-wall + open-corridor-above), confirmed RED→GREEN; spawn guards protect the blast radius. evidence: `maze.test.ts` pm4-4 block; `game.test.ts` pm4-4 block.
- [EDGE] VERIFIED — ghost house exit path intact: interior (rows 16-18) connects up through the gate (row 15 cols 13-14, ghost-walkable) into the corridor (row 14). No ghost is trapped.
- [SILENT] n/a — no error-handling/catch code in the diff.
- [VERIFIED] Render consistency — `render.ts:254-264` draws walls from the shell `MAZE_TILES` only where **core** `tileAt` says `wall`; the authentic shell art already has top-wall art at row 15 and background at row 14, so marking row-15 cols 11-16 `wall` (was `house`) renders the box top correctly with the pink gate door. Two independent sources now agree the top wall is row 15. evidence: `maze-tilemap-data.ts` rows 14-15 + static-screenshot playtest.
- [VERIFIED] Blast radius — `GHOST_SPAWN` (rows 14/17) and `RED_ZONE_TILES` (y:14) unaffected; only `ghost.test.ts:42` needed updating and it was done correctly. evidence: `game.ts:106-110`, `ghost.ts:60-63`.

### Devil's Advocate
Suppose this fix is broken. The most dangerous move here is that the maze is a *reconstruction*, not a byte-cited transcription — so "authentic" rests on the well-known map plus the visual oracle, not a ROM literal. Could the gate be at the wrong row? If it were, three independent signals would have to be *simultaneously* wrong: the boss's own playtest, the authentic shell render tilemap (which independently places top-wall art at row 15 and background at row 14), and the static screenshot showing the door recessed into the box top. They agree, so the row is right. Could a housed ghost now be trapped, or Blinky spawned inside? The spawn guard proves not — but note it is green *by design* (it passed pre-fix too), so it is a weak regression net, not proof the fix helped; the door-in-a-wall + corridor-above drivers are what actually pin the change, and those did go RED→GREEN. Could the shrunk interior (4→3 rows) break dot counts or the warp? No: DOT_COUNT holds at 240 (module would throw), and `TUNNEL_ROW` is derived from the `T` tiles (row 17), untouched. Could the codegen be exploited? No — closed charset, throws on anything else, build-time only. What a *confused future porter* would get wrong, though, is real: they would read the canonical glossary and the `RED_ZONE_TILES` comment, both of which now say the tiles "directly over the gate … are walled above," and conclude the corridor this story just opened is walled — the exact inversion of the fix. That is why the doc finding, though LOW, was not dismissible: the reconstruction leans on its prose being right, and this story had left that prose half-updated. That prose is now fully swept (round-trip 1, `7acd1f2e`), so the porter reads the truth.

**Handoff:** To SM for finish-story.