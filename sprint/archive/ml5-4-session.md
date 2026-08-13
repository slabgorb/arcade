---
story_id: "ml5-4"
jira_key: "ml5-4"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-4: Persist high scores via localStorage under highScoreKey('millipede')

## Story Details
- **ID:** ml5-4
- **Jira Key:** ml5-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade

## Acceptance Criteria (Derived from Title)

1. **Shell reads persisted high scores on boot:** When the millipede game initializes, it loads persisted high scores from localStorage using `highScoreKey('millipede')` via `@shared/highscore` helpers (`readTopScores` / `readTopScore`).

2. **Shell writes high scores on commit:** When a high-score entry is qualified and committed (initials confirmed), the shell persists the updated table to localStorage using `highScoreKey('millipede')`.

3. **Core remains pure:** No localStorage, DOM, or I/O code exists in `plugins/millipede/src/core/`. Core owns the pure logic: `qualifiesForHighScore`, `insertHighScore`, `stepNameEntry` (from ml5-3).

4. **Reuse existing consumer pattern:** Follow the shape established in `plugins/missile-command/src/shell/highscore.ts`, `plugins/asteroids/src/shell/render.ts`, and `plugins/joust/src/shell/highscoreScreen.ts` — do not invent new integration patterns.

5. **Scope boundary:** Shell layer only. Do NOT implement EAROM chip emulation; map to localStorage semantically (read/write table on boot/commit).

## Background

- **Source mapping:** EAROM (MLTST.MAC:36-150) has no chip emulation. Maps to localStorage as a simple read/write table.
- **Shared helpers:** `highScoreKey(gameId)` at `src/shared/highscore.ts:118`; `readTopScores(gameId)` at line 444; `readTopScore(gameId)` at line 453. **Reuse them.**
- **Core delivered:** ml5-3 already landed `plugins/millipede/src/core/highscore.ts` (qualifiesForHighScore/insertHighScore) and phase.ts (stepNameEntry). This story does NOT re-implement.
- **Reference implementations:** 
  - `plugins/missile-command/src/shell/highscore.ts` — direct highScoreKey consumer
  - `plugins/asteroids/src/shell/render.ts` + `src/main.ts` — shell integration
  - `plugins/joust/src/shell/highscoreScreen.ts` + `src/core/highscore.ts` + `src/main.ts` — full shape
- **Current state:** Millipede shell has NO localStorage wiring yet (grep for highScoreKey/localStorage in plugins/millipede/src returns nothing).
- **Default ladder decision:** ml5-3 verified ROM ships a default at NSCORE=8 (MLTST.MAC:97-112). TEA should confirm ml5-3's decision before persisting a seeded default here.
- **Out of scope:** Sound (ml6), attract state machine + HUD render (ml7).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T21:48:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T21:24:48Z | 2026-08-13T21:27:09Z | 2m 21s |
| red | 2026-08-13T21:27:09Z | 2026-08-13T21:35:11Z | 8m 2s |
| green | 2026-08-13T21:35:11Z | 2026-08-13T21:38:24Z | 3m 13s |
| review | 2026-08-13T21:38:24Z | 2026-08-13T21:48:33Z | 10m 9s |
| finish | 2026-08-13T21:48:33Z | - | - |

## SM Assessment

**Setup by:** Grand Admiral Thrawn (SM), 2026-08-13.

**Contention probe (clean):** No `feat/ml5-4` branch existed on the remote before this setup — nobody owned the story. Sibling checkout a-2 is on ml6-2 (unrelated file neighbourhood). Merge gate clean (no open PRs). Claim branch `feat/ml5-4-high-score-persistence` now pushed so the sibling probe lights up.

**Premise verification (all measured against HEAD, all current — no stale claims to correct):**
- `highScoreKey(gameId)` exists at `src/shared/highscore.ts:118`; shared exports load helpers `readTopScores` (:444) / `readTopScore` (:453). Story reuses these; nothing to re-implement.
- The asteroids/joust/mc7 consumer pattern is real and present (`plugins/missile-command/src/shell/highscore.ts`, asteroids `main.ts`/`shell/render.ts`, joust `shell/highscoreScreen.ts`).
- **ml5-3 already landed the pure core** (`plugins/millipede/src/core/highscore.ts`, `core/phase.ts`) — this story does NOT touch that; it wires the SHELL to read-on-boot / write-on-commit.
- millipede shell has NO localStorage/highScoreKey wiring yet — genuinely unstarted.

**No acceptance_criteria/description in the epic YAML** — ACs were DERIVED from the title by sm-setup, grounded in the verified facts above. TEA owns the RED specification.

**Scope guard for TEA/Dev:** core stays pure (millipede's own core-purity source-scan test enforces it — no storage/DOM in `src/core/`). EAROM (MLTST.MAC:36-150) maps to localStorage; do NOT emulate the chip. Default-ladder question: ml5-3 verified the ROM ships a default (NSCORE=8, MLTST.MAC:97-112) — confirm ml5-3's decision before persisting a seeded default. Out of scope: sound (ml6), attract/HUD (ml7).

**Handoff:** → Han Solo (TEA) for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap, non-blocking] millipede has no game loop / commit call-site yet — write-on-commit WIRING is ml7's, not ml5-4's.** (TEA, RED). Unlike mc7-3 — which wired `storage.save()` into a live `createGame()`/`GameState.highScores` play loop — millipede's `src/main.ts` is an ATTRACT-SCREEN DEMO only (ml7-3): no state machine, no `GameState.highScores`, no game-over/name-entry commit path. The epic scope line is explicit: "OUT OF SCOPE: … attract state machine + **wiring** + HUD render (ml7)". So ml5-4 delivers the shell PERSISTENCE MODULE (`src/shell/highscore.ts`: `makeMilliHighScoreStorage()` + `loadHighScores()`, both load AND save fully implemented and tested), landed **deliberately unwired** — exactly as ml5-3 landed the core "no game-state machine (that is ml7)" and mc7-2 landed name-entry core "deliberately UNWIRED" before mc7-3 wired it. ml7 calls `loadHighScores` on boot and `storage.save(highScores)` on the commit's new-array reference (the asteroids/mc7 pattern). RED tests the module's behavior, NOT a main.ts source-scan wire.

### Reviewer (code review)
- **Improvement** (non-blocking): the "unreachable storage … save is an inert no-op" test (`plugins/millipede/tests/high-score-persistence.test.ts:245`) asserts only `not.toThrow()`; its title promises inertness that nothing checks. Affects that one test (add a post-`save()` `expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES)` so a silent errant write would fail it). LOW — the save path is `@shared/highscore`'s and is separately covered there; approved without rework per proportionality. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the shell header (`plugins/millipede/src/shell/highscore.ts:8`) cites `MLTST.MAC:36-150` for "EAROM … maps to localStorage"; that is the epic/story's own range for the EAROM ROUTINES (CKSUM/CHKEA/READEA/WRITEA/INITEA), correctly distinct from the `97-112` default-DATA range — but a reader (and the comment-analyzer subagent) can conflate them. Naming the routines explicitly would remove the ambiguity. LOW. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Story title says "shell reads on boot, writes on commit"; ml5-4 delivers the MODULE, not the main.ts wiring.** The title describes the module's purpose. millipede has no game loop / boot state / commit call-site yet (attract-demo main.ts; ml7 owns the state machine + wiring per the epic). So RED tests the persistence module's load/save behavior, and ml7 wires the call-sites — mirroring ml5-3 (core landed unwired) and mc7-2→mc7-3 (name-entry core landed unwired, then wired). See Delivery Findings.

### Dev (implementation)
- **Module delivered deliberately UNWIRED — no main.ts read-on-boot / write-on-commit call-site added.**
  - Spec source: session scope + TEA Assessment (Deliverable) + Delivery Finding (TEA, RED)
  - Spec text: story title "shell reads on boot, writes on commit"
  - Implementation: created `plugins/millipede/src/shell/highscore.ts` with `MILLI_HIGH_SCORE_GAME_ID`, `makeMilliHighScoreStorage()`, `loadHighScores()` — the load AND save functions fully built and tested — but did NOT call them from `src/main.ts` (which is the ml7-3 attract-screen demo with no game state machine / commit path).
  - Rationale: the epic reserves "attract state machine + **wiring** + HUD render" for ml7; wiring into a non-existent game loop would either duplicate ml7 or create a throwaway half-wire. Matches the fleet precedent (ml5-3 core, mc7-2 name-entry) of landing a layer unwired for a later story to consume.
  - Severity: minor
  - Forward impact: ml7 must call `loadHighScores(makeMilliHighScoreStorage())` on boot and `storage.save(highScores)` on the name-entry commit's new-array reference (the asteroids/mc7 pattern). Until then, the persisted board is never read or written in-game — the module has no runtime caller.

### Reviewer (audit)
- **TEA deviation (title vs module-only delivery): ACCEPTED.** The epic scope line explicitly reserves "attract state machine + **wiring** + HUD render" for ml7; delivering the persistence module unwired is faithful to the epic and matches the fleet precedent (ml5-3 core, mc7-2 name-entry). Verified `plugins/millipede/src/main.ts` does not import the module.
- **Dev deviation (deliberately UNWIRED, no main.ts call-site): ACCEPTED.** Correct scoping, not a shortcut. The load/save functions are fully built and mutation-verified; only their in-game call-sites are deferred to ml7, whose forward-impact is recorded. Confirmed by grep: no `shell/highscore` import in `src/core/` or `main.ts`.

## TEA Assessment

**RED by:** Han Solo (TEA), 2026-08-13. Workflow: tdd. Phase: red → green.

**Deliverable Dev (Yoda) must build:** one new module `plugins/millipede/src/shell/highscore.ts`, the battlezone/mc7 base-shape precedent (MilliHighScore is the shared base row `{ name, score }` — NO domain field — so bind `isHighScoreRow` directly):
- `export const MILLI_HIGH_SCORE_GAME_ID = 'millipede'`
- `export function makeMilliHighScoreStorage(): HighScoreStorage<MilliHighScore>` → `makeHighScoreStorage<MilliHighScore>(MILLI_HIGH_SCORE_GAME_ID, isHighScoreRow, '')`
- `export function loadHighScores(storage): readonly MilliHighScore[]` → persisted board if `storage.load()` has rows, else `DEFAULT_HIGH_SCORES` (the seeded ROM ladder, so a first boot never shows an empty ladder). Import `DEFAULT_HIGH_SCORES` + `type MilliHighScore` from `../core/highscore.js`.

Copy the shape from `plugins/missile-command/src/shell/highscore.ts` (mc7-3), swapping MC→MILLI names and `MissileCommandHighScore`→`MilliHighScore`. **Do NOT wire main.ts** (ml7's scope).

**Test file:** `plugins/millipede/tests/high-score-persistence.test.ts` (247 lines, new — does not touch ml5-3's `tests/highscore.test.ts`).

**RED verified** (testing-runner, `npx vitest run --project millipede`): 1 file failed / 42 passed; 860 pass / 16 skip elsewhere — **no regression**. The 3 shared-contract tests PASS (the non-vacuous floor: key `millipede-high-scores`, base-shape round-trip, depth-8 ladder). The 11 module tests redden via the `beforeAll` RED-seam with the exact Dev-actionable message: `ml5-4 RED — cannot import ../src/shell/highscore.js (Dev must create it)`. **Lint (tsc --noEmit) is GREEN** — the variable-specifier dynamic import keeps the type gate green while the module is absent.

**AC coverage (derived — story had none in YAML):**
| # | Acceptance criterion | Test(s) |
|---|----------------------|---------|
| 1 | Saves the ladder under the one-origin cabinet key `highScoreKey('millipede')` = `millipede-high-scores` | "saves under the exact one-origin cabinet key", "lobby-readable" |
| 2 | `loadHighScores` reads the persisted board on a returning boot (fresh storage instance, not memoized) | "returns the persisted board on a returning boot", "survives a save → fresh-boot reload" |
| 3 | First / empty boot falls back to the seeded ROM `DEFAULT_HIGH_SCORES` (depth 8), never an empty ladder | "falls back to the seeded ROM ladder on a first / empty boot" |
| 4 | Persists the millipede base shape only — no `wave`/`level` domain key injected | "persists the millipede base shape only" |
| 5 | Written rows are lobby-readable across the one origin | "lobby-readable (one origin)" |
| 6 | Core stays pure — all storage/DOM lives in `src/shell/` (existing `tests/purity.test.ts` guards core) | module lives in src/shell; no new core constant added |

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md`):
- **#10 (security: JSON.parse runtime validation, not `as T`):** the shared `makeHighScoreStorage` filters parsed rows through the guard. Covered by "corrupt stored JSON degrades…", "non-array/non-row payload rejected", "junk rows keeps only valid base-shape rows" — a hostile/corrupt store degrades to the seeded ladder and never throws.
- **#1 (type predicates need runtime validation):** rows are validated by `isHighScoreRow` on every load; "lobby-readable" re-asserts `isHighScoreRow` over the persisted bytes.
- **#15 (source-text token traps):** DELIBERATELY AVOIDED — all tests are behavioral (round-trip / fallback / degradation), no bare-keyword source-scan guards, so nothing passes on a comment/token match.
- **#8 (test quality):** every test has a meaningful value assertion; the two `not.toThrow` cases are paired with an equality assertion on the returned ladder (not vacuous); no `as any` in assertions.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/shell/highscore.ts` (new, 46 lines) — the one-origin localStorage persistence seam: `MILLI_HIGH_SCORE_GAME_ID = 'millipede'`, `makeMilliHighScoreStorage()` (binds the shared `makeHighScoreStorage` with the base-shape `isHighScoreRow` guard + `''` domain field, battlezone/mc7 precedent), `loadHighScores()` (persisted board if any, else the seeded ROM `DEFAULT_HIGH_SCORES`). A thin adapter over `@shared/highscore` — no new mechanism, no core changes.

**Tests:** 14/14 passing in `plugins/millipede/tests/high-score-persistence.test.ts` (GREEN); millipede project **871 pass / 0 fail / 5 skip** — no regression. **Lint (tsc --noEmit) green.**

**Minimalism:** built exactly the three exports the RED tests demand, copied from mc7-3's proven shape. No wiring into main.ts (ml7's scope — logged as a Dev deviation). No extra abstractions, no error handling beyond what the shared factory already provides (it degrades gracefully on corrupt/absent storage — covered by tests).

**Self-review:** core stays pure (module lives in `src/shell/`, off the purity sweep); follows the fleet consumer pattern; all derived ACs met; graceful-degradation paths (corrupt JSON / junk rows / unreachable storage) delegated to and verified against the shared factory. The one intentional exception to "code is wired to front-end" is the deliberately-unwired delivery — see the Dev deviation entry.

**Branch:** `feat/ml5-4-high-score-persistence` (pushed, HEAD `fd437b87`)

**Handoff:** → Obi-Wan Kenobi (Reviewer) for review.

**Handoff:** → Yoda (Dev) for GREEN — create the module, make all 11 red tests pass, keep the 3 green + the other 860 green, lint stays green.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (871 pass/0 fail/5 skip, lint green, no smells, no `as any`) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths (empty/corrupt/unreachable/junk-row storage) reviewed by Reviewer; all covered + mutation-verified |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — the only error-swallow is `@shared/highscore`'s intentional degrade-to-[] (out of diff, tested there); shell module has no catch blocks |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality reviewed by Reviewer + rule-checker (rule #8): mutation-tested 3 ways, all non-vacuous; one LOW unpaired-not.toThrow confirmed |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (medium) | 1 confirmed as LOW ([DOC] citation clarity), 0 dismissed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types reviewed by Reviewer + rule-checker: `readonly` returns, base-shape reuse, no stringly-typed API; one LOW missing-readonly test param |
| 7 | reviewer-security | Yes | clean | none | N/A — traced JSON.parse→validator→degrade path end-to-end, no XSS/proto-pollution |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — module is a 25-line thin adapter, structurally identical to mc7-3; nothing to simplify |
| 9 | reviewer-rule-checker | Yes | findings | 2 (LOW) | 2 confirmed as LOW ([TEST] #8 unpaired not.toThrow, [RULE] #2 missing readonly), 0 dismissed; 30/32 rules clean |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled; 3 with findings, all LOW)
**Total findings:** 3 confirmed (all LOW/non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A 46-line shell persistence module (25 lines of code) that is a byte-for-byte structural match to the mc7-3 / battlezone precedent — a thin adapter over `@shared/highscore`, not a fork — plus a 247-line behavioral test suite. Zero Critical/High/Medium findings; three LOW/non-blocking observations recorded. Correct, secure, pure, and mutation-verified.

**Data flow traced:** localStorage (user/attacker-writable via devtools) → `makeHighScoreStorage.load()` → `JSON.parse` in a try/catch → `Array.isArray` guard → `.filter(isHighScoreRow)` (real runtime predicate: `typeof name === 'string' && Number.isFinite(score)`) → `loadHighScores` degrades `[]` to `DEFAULT_HIGH_SCORES`. A hostile or corrupt store can never throw, never inject a bad row, never blank the ladder. Safe. [SEC]

**Pattern observed:** thin `@shared/highscore` consumer, base-shape guard bound directly (`isHighScoreRow`, domain field `''`) — the battlezone/mc7 precedent for a `{ name, score }` row with no domain field — at `plugins/millipede/src/shell/highscore.ts:32-34`. Correct reuse; does not re-implement table/validation/persistence. [SIMPLE][RULE]

**Error handling:** all failure modes (missing / corrupt JSON / not-a-table / junk rows / unreachable storage / quota) degrade gracefully in `@shared/highscore` (`src/shared/highscore.ts:499-591`); `loadHighScores` (`highscore.ts:45`) uses `saved.length > 0 ? … : DEFAULT_HIGH_SCORES` — correctly treating the degenerate-but-not-nullish `[]` as "no board" (rule #21), which `??`/`||` would get wrong. [SILENT][EDGE]

### Findings (all LOW — non-blocking)
| Severity | Tag | Issue | Location | Recommendation |
|----------|-----|-------|----------|----------------|
| [LOW] | [TEST][RULE] | `not.toThrow()` unpaired — title claims "inert no-op" but inertness is unverified | `tests/high-score-persistence.test.ts:245` | Add post-save `expect(loadHighScores(storage)).toEqual(DEFAULT_HIGH_SCORES)`. Filed as non-blocking Delivery Finding. |
| [LOW] | [DOC] | `MLTST.MAC:36-150` (EAROM-routines range, correct per epic) can be conflated with the `97-112` default-data range | `src/shell/highscore.ts:8` | Name the routines explicitly. Filed as non-blocking Delivery Finding. |
| [LOW] | [TYPE][RULE] | `makeFakeStorage(initial: Record<string,string>)` never-mutated param not `Readonly<>` — pre-existing fleet-wide pattern (battlezone/mc7/centipede harnesses) | `tests/high-score-persistence.test.ts:82` | Cosmetic; consistent with fleet. No action. |

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + arcade rules)
- **#1 type-safety escapes:** compliant — no `as any`/`as unknown as T`/`@ts-ignore`/non-null `!`. The test's `as T` on `loadExport` is the documented RED-seam idiom (mc7-3 precedent); `globalThis as {localStorage}` are narrow known-shape casts. [RULE]
- **#2 readonly:** `loadHighScores` returns `readonly MilliHighScore[]`; `board` const is `readonly`. One LOW miss on a test helper param (above). [TYPE]
- **#4 / #21 null & degenerate-but-not-nullish:** exemplary — explicit `.length > 0` ternary, not `??`. [EDGE]
- **#8 test quality:** 14 tests, all with meaningful value assertions; mutation-tested by Reviewer (break fallback → 4 red; wrong game id → 6 red; drop guard → 1 red). One LOW unpaired-not.toThrow (above). [TEST]
- **#10 security (JSON.parse validation):** compliant — validation fully delegated to `@shared/highscore`'s `.filter(validator)`; the shell module never parses raw input itself. [SEC]
- **#15 source-text token traps:** N/A — suite is entirely behavioral (round-trip/fallback), zero `toMatch`/`toContain`/`readFileSync` over source. Verified by grep. [RULE]
- **#17 comments assert a re-run mechanism:** compliant — header claims ("`load()` returns [] on unreachable/corrupt", "empty ladder lets any score qualify") independently verified against the shared factory + core `qualifiesForHighScore`. [DOC]
- **arcade core/shell boundary:** compliant — module lives in `src/shell/`, `src/core/` imports nothing from it, `purity.test.ts` (35/35 green) still guards the boundary untouched. [RULE]
- **arcade extract-on-second-game:** compliant — reuses `@shared/highscore`, does not fork. [SIMPLE]

### Observations
- [VERIFIED] Non-vacuity — evidence: mutating `highscore.ts:45` (fallback), `:29` (game id), `:33` (guard) each reddens the expected tests; reverted, tree clean. Complies with rule #8/#15.
- [VERIFIED] Unwired claim true — evidence: `grep 'shell/highscore\|loadHighScores\|makeMilliHighScoreStorage' plugins/millipede/src/main.ts` → no hit; main.ts still uses `DEFAULT_HIGH_SCORES[0]` for the attract HUD.
- [VERIFIED] Core purity — evidence: `plugins/millipede/tests/purity.test.ts` 35/35 green; no `localStorage`/DOM in `src/core/` (the one grep hit at `core/millipede.ts:403` is the word "window" in a ROM comment).
- [VERIFIED] Lobby-readable — evidence: `lobbyTopScore` proxy reads the same `highScoreKey('millipede')` and filters the same `isHighScoreRow`; test asserts `123456`.
- [VERIFIED] Seeded depth-8 ladder booted, not the shared depth-10 — evidence: `MILLI_HIGH_SCORE_DEPTH === 8` and `DEFAULT_HIGH_SCORES` length 8 asserted; fallback returns it.

### Devil's Advocate
Suppose I want this broken. A malicious user opens devtools and writes `localStorage['millipede-high-scores'] = '{"__proto__":{"polluted":1}}'`. On load, `JSON.parse` produces an object whose `__proto__` is an own data property (V8 `CreateDataProperty` does not invoke the prototype setter), `Array.isArray` is false → `[]` → `loadHighScores` returns the seeded ladder. No pollution, no crash. They try `'[{"name":"</script><img src=x onerror=alert(1)>","score":9}]'` — it passes `isHighScoreRow` (a string name), persists, and is read back — but the row feeds a **canvas** HUD (character-stamp blitter, `shell/render.ts`), never `innerHTML`, so the markup is drawn as glyphs, not executed. No XSS surface in this diff. A confused user on first boot sees the seeded BBM/FXL/… ladder, not a blank screen — correct, and the reason `loadHighScores` must not return `[]` (an empty ladder makes `qualifiesForHighScore` true for any score). A stressed filesystem / private-mode browser makes `getStorage()` return null → load `[]` → defaults, save a silent no-op — the game plays, scores just don't persist. What about a returning player whose board has 12 rows (a future depth change)? `insertHighScore` (core, ml5-3) trims to `MILLI_HIGH_SCORE_DEPTH`; this module persists whatever array it's handed, so depth policy stays in core where it belongs. The one genuine gap the devil finds is the test-side one already filed: the "inert no-op" test wouldn't catch a hypothetical `save()` that wrote somewhere reachable while storage was "undefined" — but `save()` is shared code, tested in the shared suite, and there is no such write path. Nothing here rises above LOW.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.
## Impact Summary (SM finish)

**ml5-4 — APPROVED, single round, no rework.** Delivered a 46-line shell persistence module (25 lines of code) at `plugins/millipede/src/shell/highscore.ts` — a thin `@shared/highscore` adapter (`MILLI_HIGH_SCORE_GAME_ID`, `makeMilliHighScoreStorage()`, `loadHighScores()`) mirroring the mc7-3/battlezone precedent, plus a 247-line behavioral test suite. Millipede project 871 pass / 0 fail / 5 skip; lint green; core/shell boundary + purity intact (35/35).

**Findings:** zero Critical/High/Medium. Three LOW/non-blocking observations, all recorded and filed as non-blocking Delivery Findings — none gates the finish: (1) an unpaired `not.toThrow` in the "inert no-op" test (`test:245`), (2) EAROM `36-150` citation-clarity nit (`highscore.ts:8` — correct per epic, just conflatable), (3) a missing `readonly` on a test helper param (pre-existing fleet-wide pattern).

**Forward:** the module is landed **deliberately unwired** — ml7 wires `loadHighScores(makeMilliHighScoreStorage())` on boot and `storage.save(highScores)` on the name-entry commit, per the epic's scope split. No runtime caller until then, by design.
