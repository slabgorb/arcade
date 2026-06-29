---
story_id: "7-5"
jira_key: ""
epic: "7"
workflow: "trivial"
---
# Story 7-5: Per-game high scores on tiles

## Story Details
- **ID:** 7-5
- **Jira Key:** (none)
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-29T09:25:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T07:03:40Z | 2026-06-29T07:03:40Z | - |
| implement | 2026-06-29T07:03:40Z | 2026-06-29T09:15:52Z | 2h 12m |
| review | 2026-06-29T09:15:52Z | 2026-06-29T09:25:56Z | 10m 4s |
| finish | 2026-06-29T09:25:56Z | - | - |

## Story Context

### Title
Per-game high scores on tiles

### Overview
Surface each game's per-game high score visually on its tile in the lobby. Tempest already stores high scores in localStorage; the lobby exists to list games, and this story adds the high score display to each game tile without needing network/backend.

### Problem Statement
The lobby's game tiles list the title and glow colour but don't surface the per-game high score. Players need to see their best score at a glance from the cabinet's front door to be motivated to replay and beat their record.

### Technical Approach

**Architecture:** The arcade games (tempest, star-wars) store high scores per-game in localStorage under game-specific keys (e.g., `'tempest-high-scores'` is a JSON array of HighScoreEntry objects; see tempest/src/shell/storage.ts). The lobby needs a lightweight storage module to read and render these scores on tiles.

**Implementation plan:**

1. **Create `src/shell/storage.ts`** with a single function:
   - `getTopScore(gameId: string): number | null` — reads localStorage key `'{gameId}-high-scores'`, parses the JSON array, returns the score of the first entry (highest), or null if missing/corrupt. Use defensive try-catch patterns (matching tempest/src/shell/storage.ts style) so corrupt data silently degrades to null rather than crashing.

2. **Update `src/main.ts`** to load and display scores:
   - Call `getTopScore(game.id)` for each game in the registry
   - Append a `<div class="score">HI SCORE: {score}</div>` element (or "NO SCORE" if null) to each tile
   - Inline the glow colour into the score div via `--glow` custom property (already set on the tile, inherited)

3. **Style in `index.html`** (CSS):
   - `.tile .score` — secondary text, positioned below the title, smaller font-size (clamp ~0.7-1.2rem), same glow color, same text-shadow, optional lighter text-shadow/blur for accent
   - Ensure tile height flexes to accommodate score line without overflow

4. **Tests** (`tests/registry.test.ts` or new `tests/storage.test.ts`):
   - Unit test `getTopScore()` with mocked localStorage (vitest provides this)
   - Test: valid JSON array with one entry → returns score
   - Test: empty array → null
   - Test: missing key → null
   - Test: corrupt JSON → null (should not throw)
   - Test: valid JSON but not an array → null

### Acceptance Criteria
- [ ] Each game tile displays its per-game high score on a secondary line below the game title
- [ ] High scores are loaded from localStorage using game-specific keys (`'{gameId}-high-scores'`)
- [ ] Tiles with no stored high score display "NO SCORE" or remain empty (design choice)
- [ ] High score text inherits the tile's glow colour and shadow styling
- [ ] Storage read is defensive: corrupt/missing keys degrade to null without throwing
- [ ] Tile height adjusts to accommodate the score line without visual clipping
- [ ] Unit tests pass: valid scores, empty array, missing key, corrupt JSON

### Scope
- In scope: loading and displaying per-game high scores from localStorage on lobby tiles
- Out of scope: editing/deleting high scores, admin UI, network sync, leaderboards, attract-mode demo loop (story 7-6)

## Delivery Findings

No upstream findings at setup time.

### Dev (implementation)
- **Improvement** (non-blocking): The lobby working tree carried two pre-existing,
  unrelated uncommitted changes when 7-5 work began — a deleted giant AI-generated
  screenshot PNG (`public/0_single_80_s_arcade_full_size_...png`) and a new untracked
  `public/favicon.png` (not yet referenced from `index.html`). These predate 7-5 and
  were left out of the 7-5 commit to keep scope clean. Affects `lobby/public/`
  (someone should land or discard the favicon/cleanup as its own change, and wire the
  favicon into `index.html` if it's intended). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `getTopScore` returns `Math.max(...scores)` (storage.ts:66);
  the spread can throw `RangeError: Maximum call stack size exceeded` on a pathologically
  large corrupt localStorage array (~125k+ rows), and that call sits OUTSIDE the function's
  try/catch blocks — so it escapes, breaking the `main.ts` render loop, which contradicts the
  "degrade to null without throwing" AC. Unreachable from the games (tables cap at ~10 rows),
  but a literal violation of the stated contract on adversarial data. Affects
  `lobby/src/shell/storage.ts` (replace spread with `scores.reduce((a, b) => Math.max(a, b))`).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `public/favicon.png` (added in the chore commit) is not
  referenced by `index.html` — the cabinet still has no favicon. Affects `lobby/index.html`
  (add `<link rel="icon" href="/lobby/favicon.png">` if the favicon is intended to ship).
  *Found by Reviewer during code review.*

## Design Deviations

None at setup time.

### Dev (implementation)
- **getTopScore returns max-of-valid-rows, not table[0]**
  - Spec source: .session/7-5-session.md, Technical Approach step 1
  - Spec text: "returns the score of the first entry (highest)"
  - Implementation: Returns `Math.max(...)` over all rows with a finite numeric `score`, after filtering malformed rows
  - Rationale: The games persist tables sorted descending so `table[0]` is normally the top, but taking the max of validated rows yields the true top score even if stored data is unsorted or partly corrupt — strictly more defensive at no extra cost, and directly satisfies the "degrade gracefully on corrupt data" AC
  - Severity: minor
  - Forward impact: none — public API is still `getTopScore(gameId): number | null`; only the internal selection is more robust

### Reviewer (audit)
- **getTopScore returns max-of-valid-rows, not table[0]** → ✓ ACCEPTED by Reviewer: the
  max-of-validated-rows *design choice* is sound and strictly more robust than trusting
  sort order — it correctly satisfies the corrupt-data AC. Caveat (logged separately as a
  non-blocking finding, not a reversal of the deviation): the chosen *mechanism*,
  `Math.max(...scores)`, can itself throw `RangeError` on an extreme (~125k-row) corrupt
  array; recommend `scores.reduce((a, b) => Math.max(a, b))` to keep the never-throw
  guarantee. The deviation's intent stands; only the spread mechanism needs a one-line hardening.
- No undocumented spec deviations found: the implementation matches the session's Technical
  Approach (storage.ts module, main.ts wiring, index.html CSS, storage tests). The label
  text "HI SCORE {n}" vs the plan's "HI SCORE: {score}" is a cosmetic wording difference, not
  a spec deviation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `lobby/src/shell/storage.ts` (new) — defensive, read-only `getTopScore(gameId)`: reads `'{gameId}-high-scores'` from localStorage, validates the array + each row's numeric `score`, returns the max or `null` on any missing/corrupt/unavailable path.
- `lobby/src/main.ts` — each tile now renders a `.tile-title` span + a `.tile-score` span (`HI SCORE {n}` or `NO SCORE`) via `getTopScore(game.id)`.
- `lobby/index.html` — `.tile` is now a centred column with `gap`; new `.tile-title` (big label) and `.tile-score` (smaller, dimmer, inherits glow colour + text-shadow) rules.
- `lobby/tests/storage.test.ts` (new) — 11 unit tests stubbing localStorage: sorted/unsorted data, per-game key isolation, empty board, missing key, corrupt JSON, non-array, malformed rows, throwing store, absent storage.

**Tests:** 21/21 passing (GREEN) — verified by testing-runner. TypeScript typecheck clean; Vite build succeeds.
**Branch:** feat/7-5-per-game-high-scores (pushed to origin)

**Acceptance criteria:**
- [x] Each tile shows its per-game high score on a secondary line below the title
- [x] Scores loaded from localStorage via `'{gameId}-high-scores'` keys (tempest + star-wars both use this scheme)
- [x] No stored score → "NO SCORE"
- [x] Score text inherits the tile's glow colour and text-shadow (both are inherited CSS properties)
- [x] Storage read is defensive: corrupt/missing/unavailable → null, never throws (unit-tested)
- [x] Tile is a flex column with `gap`; 9rem min-height has ample room for two lines (no clipping)
- [x] Unit tests pass for valid scores, empty array, missing key, corrupt JSON, and more

**Note for reviewer:** Storage logic is fully unit-tested. The on-tile *rendering* (DOM wiring + CSS layout/glow) is shell and not unit-tested per the arcade convention ("the shell is verified by running the game") — worth a quick visual pass via `just serve` → http://localhost:5270/lobby/.

**Handoff:** To review (The Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (21/21 GREEN, build clean, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer: found Math.max spread-overflow edge) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer: all catch blocks return null; one uncaught throw path found — Math.max spread) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 medium, 3 low) | confirmed 4 (all non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer: comments accurate; storage.ts header documents the mirror-not-import convention correctly) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (domain covered by rule-checker: casts/predicate clean, 2 readonly nits) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer: textContent not innerHTML → no XSS; gameId from static registry, not user input; JSON.parse of own localStorage validated) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer: code is minimal; no dead code or over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both low) | confirmed 2 (non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` and assessed directly by Reviewer)
**Total findings:** 7 confirmed (1 Medium, 6 Low — all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. One Medium and six Low findings, all non-blocking. The
implementation is correct and defensive for every input the games actually produce; the
Medium is an extreme-corruption edge that real data never reaches.

### Rule Compliance

Rules sourced from the lang-review TypeScript checklist (13 checks) + orchestrator CLAUDE.md
(no `.claude/rules/*.md` or `SOUL.md` exist). Enumerated exhaustively by reviewer-rule-checker
(43 instances across 15 rules) and re-confirmed:

- **Type-safety escapes (Rule 1):** COMPLIANT. `(value as Record<string, unknown>).score`
  (storage.ts:37) is a single narrowing cast of `unknown` after a `typeof`/null guard — not
  `as any`, not a double-cast. The predicate `(s): s is number => s !== null` (storage.ts:66)
  is fully runtime-backed (`s` is `number|null`; `!== null` is the complete check). No
  `@ts-ignore`/`!` anywhere.
- **Generics/interfaces (Rule 2):** 2 LOW violations — `fakeStorage(initial: Record<string,string>)`
  and `table(...scores: number[])` (test helpers) are never mutated and should be `Readonly<...>`
  / `readonly number[]`. Test-only; non-blocking.
- **Null/undefined (Rule 4):** COMPLIANT. `globalThis.localStorage ?? null` and `[...keys][i] ?? null`
  use `??` (not `||`); `getItem` result is `=== null` guarded; the test mock guards `Map.get` with `has`.
- **Module/declaration (Rule 5):** COMPLIANT. All imports are runtime values (correct `import`, not
  `import type`); `moduleResolution: bundler` so extensionless imports are correct.
- **Security/input validation (Rule 10):** COMPLIANT. `JSON.parse(raw)` is typed `unknown` and
  validated by `Array.isArray` + per-row `scoreOf` — no `as T` on parsed data. `gameId` is a static
  registry slug, never user input.
- **Error handling (Rule 11):** COMPLIANT for all realistic inputs — bare `catch { return null }`
  (no `e: any`). The ONE gap is the uncaught `Math.max(...)` throw (see [EDGE]/[SILENT] below).
- **No cross-subrepo imports (CLAUDE.md):** COMPLIANT by design — storage.ts imports nothing; the
  `{gameId}-high-scores` scheme mirrors the games by string convention, documented in the header.
- Rules 3 (enums), 6 (JSX), 7 (async), 9 (build/config), 12 (perf) — no applicable instances or all compliant.

### Observations (≥5)

- `[VERIFIED]` Key scheme matches the games — `highScoreKey` returns `${gameId}-high-scores`;
  registry ids are `tempest`/`star-wars` (registry.ts:24-25); tempest writes `'tempest-high-scores'`
  (tempest/src/shell/storage.ts:11) and star-wars `'star-wars-high-scores'` (star-wars/src/shell/storage.ts:14).
  Both resolve correctly. Checked against the no-cross-subrepo-import rule: read by convention, not import — compliant.
- `[VERIFIED]` Defensive read contract — storage.ts:24-27, 50-52, 57-60 wrap global access, `getItem`,
  and `JSON.parse` in try/catch returning null; `Array.isArray` + `scoreOf` filter malformed rows. Every
  realistic corrupt/missing/unavailable path degrades to null. main.ts:34 renders null as "NO SCORE".
- `[MEDIUM] [EDGE] [SILENT]` `Math.max(...scores)` (storage.ts:66) can throw `RangeError: Maximum call
  stack size exceeded` on a ~125k+ element array — empirically reproduced. This call is OUTSIDE the
  try/catch blocks, so it escapes the "never throws" contract and would break the `main.ts` tile loop.
  Unreachable from the games (tables cap at ~10) — only via deliberately corrupt/foreign localStorage.
  Fix: `return scores.reduce((a, b) => Math.max(a, b))`. Non-blocking; recommended hardening.
- `[LOW] [TEST]` No test covers a stored score of `0` or negative — `scoreOf` accepts them
  (`Number.isFinite`), so `getTopScore` returns them and main.ts renders "HI SCORE 0". Behavior is
  correct but unverified (test-analyzer, confidence medium).
- `[LOW] [TEST]` The throwing-storage stub (storage.test.ts:91) is a bare `{ getItem }` object, not a
  complete `Storage` like `fakeStorage` — a latent false-positive risk if `getTopScore` ever calls
  another Storage method. `[LOW] [TEST]` `getStorage()`'s own catch branch (property-access throw) and
  the `NaN`/`Infinity` filter are likewise untested. All test hygiene; non-blocking.
- `[LOW] [RULE]` Two test-helper params miss `readonly` (rule-checker, high confidence) — see Rule 2 above.
- `[DOC]` Comments are accurate and unusually thorough; the storage.ts header correctly documents the
  mirror-not-import architecture. Minor: preflight miscounted storage tests as 12 (actual 11; total 21) —
  cosmetic, no code impact.
- `[TYPE]` Covered by rule-checker — casts and the type predicate are clean; only the two `readonly` nits.
- `[SEC]` No injection surface — `textContent` (not `innerHTML`) is used for both spans, so even a
  hostile localStorage value cannot inject markup; `top` is a number; `game.title` is static registry data.
- `[SIMPLE]` Implementation is minimal and idiomatic — no dead code, no speculative abstraction. The
  max-of-valid-rows choice adds negligible cost over `table[0]` and buys real robustness.

### Devil's Advocate

Assume this code is broken. Where does it fall down? The strongest attack is the one confirmed above:
`Math.max(...scores)` is variadic-spread, and V8 caps call arguments around 125k. A user — or a buggy
prior version of a game, or a different site sharing the origin, or a hand-edited devtools session — can
write a `tempest-high-scores` value containing several hundred thousand `{score:1}` rows (localStorage
allows ~5MB; the rows are tiny). On the next lobby load, `getTopScore('tempest')` parses fine, filters
fine, then `Math.max(...300000 numbers)` throws a `RangeError` that NO try/catch in the function catches.
That exception unwinds into the `for (const game of GAMES)` loop in main.ts, which has no guard, so the
lobby renders a blank or partial page — the exact "the page never breaks" promise the module's own header
comment makes is falsified. This is real, not theoretical; I reproduced the throw. It is Medium only
because the trigger requires corrupt/adversarial storage the shipped games cannot generate.

What else could a confused or hostile actor do? A score of `0` renders "HI SCORE 0" while an empty board
renders "NO SCORE" — a player who somehow scored zero sees a different string than a player who never
played; harmless but untested, so a future refactor could silently change it. A negative score (only
possible via corruption) renders "HI SCORE -500" — ugly but not dangerous. `NaN`/`Infinity` rows are
correctly filtered, but no test pins that, so a regression that swapped `Number.isFinite` for `typeof
=== 'number'` would pass CI (NaN is typeof number) and ship "HI SCORE NaN". A stressed/locked-down
browser (private mode, disabled storage) is handled — `getStorage` returns null and tiles show "NO SCORE".
XSS is not reachable: both spans use `textContent`, so a `tempest-high-scores` entry of
`{score: "<img onerror=...>"}` would be rejected by `scoreOf` (non-numeric) and, even if rendered, never
parsed as HTML. CSS: the column layout with `min-height: 9rem` and a `0.7-1rem` score line cannot clip
within a 9rem box, and the score inherits `color`/`text-shadow` so it glows as required. Conclusion: the
only material weakness is the spread-overflow throw; everything else is either correct or a cosmetic
test-coverage gap. None of it rises to High, so the story ships — with the one-line `reduce` hardening
recommended as immediate follow-up.

**Data flow traced:** localStorage `'{gameId}-high-scores'` → `getStorage`/`getItem` (try/catch → null) →
`JSON.parse` as `unknown` (try/catch → null) → `Array.isArray` guard → per-row `scoreOf` validation
(typeof/null/finite) → `Math.max` → `number | null` → main.ts:34 `=== null ? 'NO SCORE' : 'HI SCORE {n}'`
→ `span.textContent` (no HTML injection). Safe for all realistic inputs; throws only on ~125k-row corruption.
**Pattern observed:** Defensive shell IO mirroring the games' storage by convention, not import — storage.ts:1-14, aligns with CLAUDE.md "shared language, not library."
**Error handling:** Every realistic failure → null (storage.ts:24-27, 50-60); one uncaught path at storage.ts:66 (Math.max spread) — Medium, non-blocking.
**Handoff:** To SM (Winston Smith) for finish-story.