---
story_id: "mc1-5"
jira_key: "mc1-5"
epic: "mc1"
workflow: "tdd"
---
# Story mc1-5: missile-command landing left main RED: registry.test.ts MANIFESTS and lobby main.test.ts not updated for the 8th cabinet

## Story Details
- **ID:** mc1-5
- **Jira Key:** mc1-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Story Context

**Type:** BUG
**Points:** (determined from epic YAML)
**Repos:** arcade

### Current RED State

6 tests failing across 2 files —
- `src/host/registry.test.ts` (host project) — 4 failures:
  - "the seven real manifests > covers every plugins/ directory"
  - "the generated registry > holds exactly the seven manifests, each still passing validateMeta"
  - "the generated registry > is the manifests, in curated order, field for field"
  - "the generated registry > lists six games and holds red-baron back deliberately"
- `lobby/tests/main.test.ts` (lobby project) — 2 failures:
  - "lobby bootstrap > fills the grid with one tile per LISTED registry game"
  - "lobby bootstrap > wires each tile to its game real launch path, in listed order"

### Root Cause

Scaffolding missile-command as the 8th cabinet reddened hardcoded "seven/six games" count anchors in the registry and lobby suites. This is the known "adding a game: count-anchors" pattern — the RED is real and expected; the fix is to update the anchors + regenerate the committed registry so the cabinet acknowledges 8 manifests (7 listed, red-baron still held back — confirm the intended listed-count with the Dev/TEA).

### Key Files to Update

- `src/host/registry.test.ts` — the seven-manifests / six-listed anchors
- `lobby/tests/main.test.ts` — one-tile-per-listed-game anchors
- committed `src/host/registry.ts` (regenerate via `npm run gen:registry`)
- `plugins/missile-command/plugin.ts` (the 8th manifest), `plugins/missile-command/package.json`
- `vitest.config.ts` GAMES + `justfile` games already include missile-command

### Verification

missile-command `tests/field.test.ts` passes — the ENOENT on `plugins/missile-command/reference/source/W3COMN.MAC` is resolved because that file is now vendored (6144 bytes). The RED remains only on count-anchor failures.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T11:18:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T09:15:07Z | 2026-08-06T09:15:07Z | 0s |
| red | 2026-08-06T09:15:07Z | 2026-08-06T09:24:59Z | 9m 52s |
| green | 2026-08-06T09:24:59Z | 2026-08-06T09:29:16Z | 4m 17s |
| review | 2026-08-06T09:29:16Z | 2026-08-06T11:18:35Z | 1h 49m |
| finish | 2026-08-06T11:18:35Z | - | - |

## Tea Assessment

**RED phase resolved by test-anchor correction (guard-backfill shape).**

The RED was stale count/list anchors, not broken source. The committed `src/host/registry.ts`
was **already** regenerated with 8 manifests (missile-command order 8, `listed: true`,
`showcase: false`; red-baron order 7, `listed: false` — held back, per user). Only the two named
test files still hardcoded the old 7-manifest / 6-listed counts. field.test.ts's ENOENT clause was
already stale (W3COMN.MAC vendored). So there is **no Dev implementation** — the deliverable was the
anchor correction.

### Target state (confirmed against registry.ts + user)
- 8 manifests; curated order `tempest, star-wars, asteroids, battlezone, centipede, joust, red-baron, missile-command`.
- 7 **listed**: the above minus red-baron → `…, joust, missile-command` (missile-command appends after joust since red-baron order 7 filters out).
- showcase unchanged: `tempest, battlezone, centipede`. missile-command exports no `build`.

### Changes (test files only — TEA domain)
- `src/host/registry.test.ts`: import `missileCommand`; add to `MANIFESTS`; describe "seven"→"eight"; "holds exactly the seven"→"eight"; add `'missile-command'` to curated-order id list (order 8, end) and to the LISTED id list ("lists six"→"lists seven"); forward-bumped the "adding an eighth/ninth game" prose.
- `lobby/tests/main.test.ts`: `toBe(6)`→`toBe(7)`, `GAMES.length toBe(7)`→`toBe(8)`, add `'/missile-command/'` to the href list; reconciled the "seven manifests / six listed / Six is what the cabinet ships" prose to eight/seven.

### Non-vacuity proof (mutated committed registry.ts, `git checkout --` restored each time)
- Mutation A (missile-command `listed: true→false`): reddened `lists seven games`, both lobby anchors, and `curated order field-for-field` (caught the listed drift). Count anchors stayed green — isolates the listed anchors.
- Mutation B (delete missile-command entry, GAMES=7): reddened `holds exactly the eight manifests`, `curated order`, `lists seven`, and both lobby anchors (incl. `GAMES.length toBe(8)`).
- `covers every plugins/ directory`: proven by its natural RED→GREEN (dirNames=8 vs MANIFESTS=7 before the edit).

### Verification
- `npx vitest run --project host --project lobby` → 197 passed.
- `npm run lint` (tsc --noEmit) → clean (new import type-checks).
- `npx vitest run` (full) → **812 files / 12261 passed, 1 todo** (was 6 failed).
- `npm run test:orchestrator` → **398/398** (its anchors were already bumped by a prior story).
- registry.ts restored CLEAN; only `src/host/registry.test.ts` + `lobby/tests/main.test.ts` are modified.

**Handoff to Dev/GREEN:** no implementation required — this is a guard-backfill (see memory
`guard-backfill-mutation-red`). GREEN phase = confirm full suite + `just build-all` stay green, then Reviewer.

## Dev Assessment

**GREEN phase — verification only, no implementation (guard-backfill).**

TEA's anchor correction already made the suite green against the already-correct `src/host/registry.ts`;
there was nothing to implement. I did not touch any source file — `git diff src/host/registry.ts` is CLEAN.

Verification:
- `just build-all` → all 8 games (incl. missile-command → `dist/missile-command/`) + lobby built cleanly.
- `npx vitest run --project host --project lobby` → 197 passed.
- (TEA already confirmed full `npx vitest run` 12261 passed, `npm run lint` clean, orchestrator 398/398.)

Working tree: only `src/host/registry.test.ts` + `lobby/tests/main.test.ts` modified (+ context stub). Ready for Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 2, deferred-as-historical 1 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (1 out-of-scope note) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled; comment-analyzer + rule-checker carried findings/notes)
**Total findings:** 2 confirmed (both [DOC], non-blocking MEDIUM), 1 deferred (historical), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

The functional deliverable is correct and independently verified. This was a guard-backfill: the committed `src/host/registry.ts` (8 manifests; missile-command order 8 `listed:true`; red-baron order 7 `listed:false`) was already right and is **unmodified** (preflight + rule-checker confirm `git diff` clean). The two test files' count/list anchors were reconciled 7→8 / 6→7 and every anchor was proven non-vacuous by TEA's registry.ts mutations. Approving over two non-blocking stale-comment findings (MEDIUM, documentation) captured below.

### Data flow / wiring
- `[VERIFIED]` The listed-order anchor renders through the REAL bootstrap: `lobby/tests/main.test.ts:75` imports `../src/main` against a jsdom DOM and asserts `#games a` hrefs equal `LISTED_GAMES.map(gamePath)` AND the spelled-out 7-item list incl. `/missile-command/` (`main.test.ts:95-103`). Input (registry) → destination (rendered tiles) is exercised end-to-end, not mocked.
- `[VERIFIED]` The curated-order and listed anchors match `registry.ts` field-for-field — `registry.test.ts:132-146` sorts `MANIFESTS` by `order` and compares `toEqual(GAMES)`, then pins the explicit 8-id order; `:148-158` pins the 7 listed. rule-checker cross-checked both against `order:1..8` and `filter(g=>g.listed)`. Evidence: registry.ts `order` lines 19–97.

### Rule Compliance (TypeScript lang-review — 26 checks; `.claude/rules` absent, SOUL.md N/A)
- `[RULE]` rule-checker ran all 26 TS checks: **no violations**. No `as any`, no enums/generics, no null-handling, no async/React surface. The new sibling import omits `.js` — consistent with the existing convention in the same file (the other 7 plugin imports), not the ESM-subpath rule (that governs `src/shared` runtime imports, not test cross-root imports). Compliant.
- Core/shell purity boundary: N/A — host/lobby test files, no game `core/`.
- `gen-registry` "never hand-edit the generated artifact": COMPLIED — `registry.ts` untouched.
- Count-guard prose discipline (project standard, `[[wrong-prose-correction-grep-all-phrasings]]`): **partially violated** — the assertion counts are correct, but two comments still state the old count (see findings). This is the basis of the two [DOC] findings.

### Confirmed findings
| Severity | Tag | Issue | Location | Fix |
|----------|-----|-------|----------|-----|
| [MEDIUM] | [DOC] | File-header comment still reads "the seven REAL manifests" while the describe block below (`:70`) now says "eight" — internally contradictory, present-tense, false. | `src/host/registry.test.ts:1` | "seven REAL" → "eight REAL" |
| [MEDIUM] | [DOC] | "would replace the registry for every test above, which all depend on the real six" — present-tense; the tests above now assert 7 listed (`:82`). | `lobby/tests/main.test.ts:179` | "the real six" → "the real seven" |

Deferred (not a finding): `registry.test.ts:5` "built for seven manifests that those seven manifests never walked through" is **past-tense historical narrative** describing the file's original creation (7 manifests existed then); updating it to "eight" would be historically false. Left intentionally, like the "MIGRATION RECORD (Task 15)" frozen block. `main.test.ts:109` "renders a seventh tile" is **still correct** — red-baron is `order:7`, so rendering the unfiltered GAMES puts it at the 7th position.

### Other observations
- `[VERIFIED]` Non-vacuity: TEA's Mutation A (flip `listed`) and B (delete entry) reddened the expected anchors and only those; I re-confirmed the anchors assert concrete id-lists + lengths, not just `LISTED_GAMES.length` self-comparisons. Not vacuous.
- `[VERIFIED]` The `GHOST`/`ALPHA` mocked-registry case (`main.test.ts:180-226`) is untouched and still guards the `listed:false ∧ showcase:true` trap. No regression.
- `[LOW]` [SIMPLE] The diff adds no complexity — pure literal/import edits. (simplifier disabled; assessed directly: nothing to simplify.)
- `[SEC]` No security surface — static test fixtures, no input, no secrets (security subagent clean).
- `[EDGE]` / `[SILENT]` / `[TEST]` / `[TYPE]` — subagents disabled; assessed directly: no error paths, no swallowed failures, no new types, and the tests are behavioural + non-vacuous. Nothing to flag.

### Devil's Advocate
Argue it's broken. (1) Could the anchors be vacuous — passing regardless of registry? No: mutation proof reddened them, and they pin explicit id arrays, not tautologies. (2) Could missile-command be wrongly listed, shipping an unfinished skeleton to the live lobby? It's a bootable skeleton and the owner confirmed red-baron (not missile-command) stays held back — a product call, not a bug; and if wrong, flipping `registry.ts` `listed:false` reddens "lists seven" immediately. (3) Ordering: missile-command `order:8` appends after joust in LISTED (red-baron `order:7` filters out) — the href list matches; a future 9th game or an order change reddens by design. (4) The real weakness a confused maintainer hits: the file header says "seven" while the suite tests "eight" — genuinely misleading, but non-functional and captured as a finding. (5) Stressed inputs / fs: `dirNames()` reads `plugins/` live; if a stray dir appeared, "covers every plugins/ directory" reddens — correct fail-loud behaviour. No race, no timeout, no swallowed error. Conclusion: no functional defect; the only real gap is documentation prose, appropriately non-blocking.

### Design Deviations audit
No deviations were logged by TEA/Dev, and I found none — the implementation matches the target state (8 manifests / 7 listed / red-baron held back) exactly. Nothing to stamp.

**Handoff:** To SM for finish-story. The two [DOC] fixes are trivial and non-blocking — recommend folding into finish or the fleet-wide prose follow-up below.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): Two stale count-comments remain in the reconciled test files — `src/host/registry.test.ts:1` ("the seven REAL manifests" → "eight") and `lobby/tests/main.test.ts:179` ("the real six" → "the real seven"). Present-tense and now false; trivial one-word fixes. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Fleet-wide stale "seven games / six listed" **prose** persists outside this story's scope (`justfile`, `scripts/*.mjs`, several `tests/*.mjs`, other `lobby/tests/*.ts`). rule-checker confirmed **no hardcoded count assertions** are left red elsewhere — only comments. Worth a dedicated count-guard-prose reconciliation story (grep every phrasing per `[[wrong-prose-correction-grep-all-phrasings]]`). Affects the listed files (comment text only). *Found by Reviewer during code review.*

## Design Deviations

No deviations.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->