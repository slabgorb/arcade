---
story_id: "df5-6"
jira_key: "df5-6"
epic: "df5"
workflow: "tdd"
---
# Story df5-6: End-of-game core

## Story Details
- **ID:** df5-6
- **Jira Key:** df5-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-6-end-of-game-core
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T23:58:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T23:15:00Z | 2026-08-18T23:18:49Z | 3m 49s |
| red | 2026-08-18T23:18:49Z | 2026-08-18T23:36:39Z | 17m 50s |
| green | 2026-08-18T23:36:39Z | 2026-08-18T23:47:55Z | 11m 16s |
| review | 2026-08-18T23:47:55Z | 2026-08-18T23:58:23Z | 10m 28s |
| finish | 2026-08-18T23:58:23Z | - | - |

## SM Assessment

Story df5-6 (End-of-game core, 3pt, tdd) is READY for RED. Dependency df5-3 is DONE and
its men counter is landed on develop (`plugins/defender/src/core/score.ts` — `ScoreState`,
`STARTING_MEN = 3`, `shipDeath()`; score.ts:67 names df5-6 as consumer). Hall of fame is
`@shared/highscore` + `@shared/name-entry` (consumed, not re-implemented); CMOS ledger maps
to one-origin localStorage (ADR-0004). Scope is pure-first (Decision C): the `men < 0 →
game-over` reducer + hall-of-fame/localStorage data flow ONLY — no attract/phase-machine
wiring or screen render (df7). Purity + df1 citation gates must stay green. Siblings are live
on df5-4 (a-3) and df5-5 (a-1) in the same core dir — mostly-new files here, trial-merge
develop before the PR. The Architect-enriched story context was clobbered by sm-setup and
restored verbatim from develop before handoff (see Delivery Findings). Next: TEA (red).

## TEA Assessment (RED — Leeloo)

RED verified: **defender 693 passed / 10 failed**, the 4 new df5-6 files RED, **46 pre-existing
files GREEN (zero regression)** (testing-runner, RUN_ID df5-6-tea-red). Committed `5b2ce3c6`,
pushed. Four files, one per concern; the cited-mapping suite is dossier-only so it is RED
**per-test now** (not trapped behind the code modules), the df5-3 identity idiom.

### The GREEN contract (what Dev must ship to turn RED→GREEN)

All pure code lands in `plugins/defender/src/core/` (purity.test.ts auto-covers new core files);
the two localStorage seams land in `plugins/defender/src/shell/` (the ONLY localStorage touchers,
the asteroids/missile-command precedent). Consume df5-3 + @shared — do not re-implement.

- **AC1 — `src/core/endgame.ts`:** `export function isGameOver(state: ScoreState): boolean` →
  `state.men < 0`, CONSUMING df5-3's `ScoreState` (score.ts). Cited to DEFA7.SRC:1394 (ships-left
  test `BNE PLE02`) / :1423 (`PLE2 GAME OVER`). No phase wiring, no attract loop (df7).
- **AC4 — a df7-deferral note in `endgame.ts`:** record that the attract→play→death→game-over
  WIRING + the HUD render defer to df7 (Decision C), and 2P alternating handoff defers to df7
  (Decision D) preserving `DEFA7.SRC:1179`(-1237). The design spec already carries both (guard
  green). The note test reads the module source; put the note there.
- **AC2 — `src/core/highscore.ts` (pure) + `src/shell/highscore.ts` (seam):** `DefenderHighScore`
  IS the @shared base row `{ name, score }` (no domain field — battlezone/missile precedent);
  consume `qualifiesForHighScore`/`insertHighScore` from `@shared/highscore` and `stepNameEntry`
  from `@shared/name-entry` — **do not re-declare them**. Shell exports
  `DEFENDER_HIGH_SCORE_GAME_ID = 'defender'` and `makeDefenderHighScoreStorage()` built on
  `makeHighScoreStorage('defender', isHighScoreRow, '')`. One-origin key `defender-high-scores`.
- **AC3 — `src/core/cmos.ts` (pure) + `src/shell/cmos.ts` (seam):** `CmosLedger
  { slot1, slot2, slot3, totpdc }`, `createCmosLedger()` (all zero), immutable
  `recordCoin(ledger, slot: 1|2|3)` and `recordPaidCredit(ledger)`. Shell exports
  `CMOS_STORAGE_KEY` (must contain `defender`) and `makeCmosLedgerStorage()` — load-on-boot
  returns a ZERO ledger on first boot AND on a corrupt store (never garbage), save-on-change.
- **The dossier (df1-1 gate), for `df5-6-identity.test.ts`:** add glossary rows (with backticked
  citations) for all six mappings, and CLAIMS for the four not yet pinned —
  DEFA7.SRC:1423-or-1394 (game over), ROMF8.SRC:21 (SLOT2), :22 (SLOT3), :23 (TOTPDC). NOTE:
  ROMF8.SRC:20 (SLOT1) and AMODE1.SRC:119 (HALLOF) already have claims in `06-subsystems.json`
  — reuse them; only their glossary ROWS are missing. `citations.test.ts` byte-verifies every
  new claim's `verbatim` against `reference/original-source/defender/*` — copy the line exactly
  (tabs included), e.g. `SLOT2\tRMB\t4\tCENTER COIN TOTAL`.

### Rule Coverage (lang-review/typescript.md — checks the tests enforce)

- **#15 (assert the CLAIM, not a token) / #31 (no uncited control value):** every cited-mapping
  test asserts the row *cites the .SRC line* AND a byte-verified claim pins it — a bare label or
  a wrong line cannot pass. `citations.test.ts` (existing gate) re-opens each `verbatim`.
- **#18/#19 (fails-by-passing / population filtered — vacuity):** `expectPopulated(...)` runs
  FIRST in every sweep (mapping table = 6, ledger asserts key on `men` alone), and each
  `rowCites` (`.every`, vacuously true over zero rows) is guarded by a `rowWindows` population
  assertion before it. Immutability tests assert the INPUT is unmutated, not just the output.
- **#8 (test quality — meaningful assertions):** no `assert(true)`/`is*()`-only checks; the
  game-over boundary pins men=0→false vs men=-1→true (anti off-by-one); the storage tests
  round-trip real values through a stubbed one-origin localStorage.
- **AC2 "consumed, not re-implemented"** is enforced by a source scan: defender must import the
  @shared modules and must NOT declare `qualifiesForHighScore`/`insertHighScore`/`stepNameEntry`
  nor hand-roll a high-score board onto localStorage (only `makeHighScoreStorage`).

### Notes for Dev / Reviewer

- **tsc is RED until GREEN exists.** The three behavioural files import not-yet-created modules,
  so `npm run lint` reports them missing — expected RED, clears the moment Dev creates the modules.
- **Scope fence (Decision C):** ship the pure reducer + the two persistence seams ONLY. The
  WIRING of *when* a coin/credit/death fires, the attract loop, the phase machine, the HUD and 2P
  are df7 — do not build them here.
- **Concurrency:** siblings live on df5-4 (a-3) and df5-5 (a-1) in the same core dir; these are
  all-new files so collision risk is low, but trial-merge develop before the PR.

## Dev Assessment (GREEN — Korben Dallas)

GREEN verified: **defender 727 passed / 0 failed** (testing-runner, RUN_ID df5-6-dev-green),
purity.test.ts green (the three new core modules stay inside the boundary), **zero regressions**,
`npm run lint` (tsc) clean. Implemented the GREEN contract exactly; RED was already verified at
handoff (693/10), so I went straight to implementation.

### What shipped

- **AC1 — `src/core/endgame.ts`:** pure `isGameOver(state) = state.men < 0`, consuming df5-3's
  `ScoreState`; cited DEFA7.SRC:1394 (`BNE PLE02`) / :1423 (`PLE2 GAME OVER`).
- **AC4 — the df7-deferral note** lives in `endgame.ts`: Decision C (attract/phase-machine WIRING
  + HUD → df7) and Decision D (2P handoff → df7, `DEFA7.SRC:1179-1237` preserved). The design spec
  already carried both (guard green).
- **AC2 — `src/core/highscore.ts` (pure) + `src/shell/highscore.ts` (seam):** `DefenderHighScore`
  = the @shared base row `{ name, score }`; `commitHighScore` (via `qualifiesForHighScore`+
  `insertHighScore`) and `stepInitials` (via `stepNameEntry`, cap 3) CONSUME @shared — nothing
  re-implemented. Shell `DEFENDER_HIGH_SCORE_GAME_ID = 'defender'`, `makeDefenderHighScoreStorage()`
  on `makeHighScoreStorage('defender', isHighScoreRow, '')` — one-origin key `defender-high-scores`.
- **AC3 — `src/core/cmos.ts` (pure) + `src/shell/cmos.ts` (seam):** `CmosLedger { slot1, slot2,
  slot3, totpdc }`, `createCmosLedger`, immutable `recordCoin(ledger, 1|2|3)` / `recordPaidCredit`;
  shell `CMOS_STORAGE_KEY = 'defender-cmos'`, `makeCmosLedgerStorage()` — zero ledger on first
  boot / corrupt / unavailable, defensive `getStorage()`, best-effort save.
- **Dossier (df1-1 gate):** added the df5-6 glossary section (6 cited rows) and
  `docs/rom-study/claims/18-endgame.json` (4 claims: game-over :1423, SLOT2 :21, SLOT3 :22,
  TOTPDC :23). SLOT1 (:20) and HALLOF (:119) reused the existing `06-subsystems.json` claims.
  `citations.test.ts` byte-verifies every new `verbatim` against the 1981 source — green.

### Two decisions logged as deviations (see Design Deviations → Dev)

1. Tightened the AC2 "no bespoke persistence" test to key on an actual localStorage ACCESS, not a
   comment token — it was failing the correctly-pure `core/highscore.ts` on the word "localStorage"
   in a comment (lang-review #15/#18). Intent preserved.
2. Added `commitHighScore`/`stepInitials` as real @shared consumers so "consumed, not
   re-implemented" is genuine, not a hollow type-only pass. They are the pure hall-of-fame data
   flow df5-6 ships; df7 wires when they fire.

### Scope held

Pure reducer + two persistence seams ONLY. No attract loop, no phase machine, no HUD, no 2P — all
df7 (Decision C/D). The df3 $100/px model was not touched.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (727/0, tsc clean, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (purity + defensive localStorage + no proto-pollution + one-origin keys) | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (34 checks, 61 instances, 0 violations; re-ran 727/0 + tsc) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled: preflight, security, rule_checker; 6 disabled via `workflow.reviewer_subagents`)
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (the one dirty file, `sprint/epic-df5.yaml`, was the workflow's own `in_review` status stamp, not a subagent mutation — committed `e08e48ed`).
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (a non-blocking forward finding for df7 — see Delivery Findings).

## Reviewer Assessment

**Verdict:** APPROVED

_(Zorg)_ No Critical, no High.

**Specialist findings incorporated:**
- `[PRE]` reviewer-preflight — clean: defender 727/0, `tsc` clean, 0 code smells in the changed files. Confirmed.
- `[SEC]` reviewer-security — clean: `src/core/*` pure (no storage/clock/DOM); `shell/cmos.ts` parses localStorage defensively, shape-guards via `isCmosLedger`, and rebuilds a fresh literal so a `__proto__` key can't pass through (no prototype-pollution), degrading to a zero ledger on missing/corrupt/unavailable; `shell/highscore.ts` is a thin `@shared makeHighScoreStorage` adapter (no bespoke persistence); one-origin keys namespaced. 0 findings — confirmed.
- `[RULE]` reviewer-rule-checker — clean: 34 checks / 61 instances / 0 violations, independently re-ran defender 727/0 + `tsc`. No type-escapes, `CoinSlot` union switch tsc-proven-exhaustive, `.js`+`import type`, JSON.parse validated-before-use, the identity/source-scan tests assert the CLAIM with population guards (non-vacuous), every cited constant byte-verified by `citations.test.ts`. 0 findings — confirmed.

df5-6 ships exactly its scope (Decision C, pure-first): the pure `isGameOver = men < 0` reducer, the hall-of-fame data flow consuming `@shared`, the pure CMOS ledger + its one-origin localStorage seam, and the df1-1-gated dossier. Verified, not rubber-stamped.

### Independent verification I ran (not trusting the pipeline)

- **Supersede probe:** df5-6 is NOT on develop and no rival branch exists — not superseded. **develop moved 12 commits ahead** (df5-5 merged as PR #573, df5-4 force-updated), both in defender core.
- **Trial-merge on the MOVED develop:** clean merge (no conflicts) + full defender suite on the merged tree = **756/0 green**. df5-5's core changes and df5-6 do not semantically collide. (Local-green alone would not have proven this.)
- **ROM fidelity of the game-over boundary (VERIFIED, the adversarial dig):** I opened the ROM rather than trusting AC1. `men < 0` is FAITHFUL — the ROM's initial spawn (`NEWP PLSTRT` DEFA7.SRC:1162) runs the same `DEC PLAS` (:1267) as respawns, and game over is `PLAS == 0` at `PLE01`/`PLE2` (:1393/:1423). The one fidelity risk lives in df7's wiring (must `loseMan` on the initial spawn) — filed as a non-blocking forward finding, NOT a df5-6 defect.
- **`@shared` consumption is real, not hollow:** `commitHighScore`/`stepInitials` actually call the shared table logic + name-entry stepper; grep confirms defender re-declares none of `qualifiesForHighScore`/`insertHighScore`/`stepNameEntry`.
- **localStorage seams:** security specialist confirmed defensive parse + shape-guard + fresh-literal rebuild (no prototype-pollution passthrough) + degrade-to-zero; I concur.

### Rule Compliance (lang-review/typescript.md)

Exhaustively checked by reviewer-rule-checker (34 rules, 0 violations) and spot-verified by me. Highlights: #1 no type-escapes (`unknown`+predicate, not `as T`); #3 `CoinSlot` literal union with a tsc-proven-exhaustive switch; #5 `.js` extensions + `import type`; #10 JSON.parse validated before use; #15/#18/#19 the identity + source-scan tests assert the CLAIM (member-access, declaration-shape) with population guards first — non-vacuous; purity green; every cited constant byte-verified by `citations.test.ts`.

### Dev deviations reviewed

Both accepted. (1) The AC2 test-heuristic tightening is a correct application of lang-review #15 (it was matching a comment token) — intent preserved, not a weakening. (2) `commitHighScore`/`stepInitials` beyond the strict test minimum are the honest AC2 deliverable, not scope creep — pure, no new abstraction.

### Coverage of the disabled specialists (I did these myself)

edge-hunter → the `men < 0` boundary (men=0 in-play vs -1 over) + CMOS first-boot/corrupt paths, all covered. test-analyzer → vacuity checked (rule #18/#19: immutability + independent-score fixtures + compile-time contract). comment-analyzer → the df7-deferral and purity comments verified TRUE by re-running (rule #17). type-design → `readonly` ledger, literal union, base-shape row — sound. simplifier → minimal; no over-engineering.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

**SM setup (Ruby Rhod):** Story is READY for RED.
- **Dependency df5-3 verified DONE and landed.** The men counter df5-6 consumes exists on develop at `plugins/defender/src/core/score.ts`: `ScoreState { score, men }`, `STARTING_MEN = 3` (score.ts:61-62, cited NSHIP FCB $03 ROMC8.SRC:802), `initialScore()`, `shipDeath()` decrements men. score.ts:67 explicitly names df5-6 as its consumer. CONSUME it — do not re-implement.
- **Hall of fame = @shared** (`@shared/highscore` + `@shared/name-entry`); this story MAPS Defender's score format on, no bespoke persistence. CMOS ledger → one-origin localStorage (ADR-0004).
- **Scope fence (Decision C):** ship the PURE `men < 0 → game-over` reducer + hall-of-fame/localStorage data flow ONLY. NO attract/phase-machine wiring, NO screen render — df7 wires it. Core/shell boundary applies; purity + df1 citation gates must stay green.
- **Concurrency:** siblings are live on df5-4 (a-3) and df5-5 (a-1), both in `plugins/defender/src/core`. Expect a rebase at finish; df5-6 is mostly NEW files so collision risk is low, but Dev should trial-merge develop before the PR.
- **⚠ Context clobber, caught and fixed:** `sm-setup` regenerated `sprint/context/context-story-df5-6.md` into placeholder stubs, stripping the Architect-enriched Technical Approach/Scope/Dependencies/Design Notes and the `DO NOT REGENERATE` banner. The rich version was restored verbatim from `origin/develop` (diff-clean) before handoff and the claim commit was amended to stamp-only. TEA reads the Architect-enriched context — that banner is authoritative; do not regenerate it.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

**Reviewer (Zorg) — forward finding for df7 (non-blocking, Improvement/Gap):**
- **The `men < 0` game-over predicate is faithful ONLY IF df7 decrements a life on the INITIAL ship spawn — verify this when df7 wires it.** I traced the ROM: at game start `NEWP PLSTRT` (DEFA7.SRC:1162) enters the SAME player-start path that runs `DEC PLAS,X` (DEFA7.SRC:1267), so the ROM consumes a ship on the *initial* spawn, not only on respawns; game over fires when `PLE01` (`LDB PLAS,X` :1393) sees `PLAS == 0` (`BEQ PLE2`, :1397/:1423). With `STARTING_MEN = 3` (df5-3) and `loseMan` once per death, `isGameOver = men < 0` reproduces the arcade's exact death count **only if df7 also calls `loseMan` on the initial spawn** (men 3→2 before any death), giving 3 deaths → game over. If df7 wires `loseMan` on death alone with a "free" initial ship, `men < 0` yields **4 lives vs the arcade's 3** — an off-by-one. This is NOT a df5-6 defect (df5-6 ships only the pure predicate, and `men < 0` is the ruled/cited convention across df5-3, the design spec §5, and AC1); it is a fidelity constraint df7 MUST honour. Pin it with a life-count test when df7 lands the phase machine.

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Fixed a false-positive in the AC2 "no bespoke persistence" test heuristic**
  - Spec source: df5-6-hall-of-fame.test.ts (TEA), "the only high-score persistence is the @shared makeHighScoreStorage seam"
  - Spec text (original): flagged any src file where `/localStorage/.test(text) && /high[-\s]?score/i.test(text) && !/makeHighScoreStorage/`
  - Implementation: tightened the guard to match an actual localStorage ACCESS (`localStorage.<member>` or `globalThis/window.localStorage`), not the bare token
  - Rationale: `src/core/highscore.ts` is pure and its comment literally says "no localStorage (that is the shell seam)" — the original regex matched that COMMENT TOKEN and failed a correct, pure file (lang-review #15: match the CLAIM, not a token; #18: the defect was in the test apparatus). The tightened check still catches a real hand-rolled `localStorage.setItem` board.
  - Severity: minor (test-quality fix; the assertion's intent is preserved and made correct)
  - Forward impact: none — the AC2 invariant ("consume @shared, don't hand-roll a localStorage board") is unchanged and now correctly enforced.
- **Added real @shared consumers to core/highscore.ts (`commitHighScore`, `stepInitials`) beyond the minimum a test strictly imports**
  - Spec source: context-story-df5-6.md AC2 — "the final score is committed to the hall of fame via @shared/highscore + @shared/name-entry … CONSUMED, not re-implemented"
  - Spec text: "a test asserts Defender's score format maps onto the shared table and that no bespoke high-score persistence is introduced"
  - Implementation: `commitHighScore(table, entry)` wraps `qualifiesForHighScore`+`insertHighScore`; `stepInitials(buffer, key)` wraps `stepNameEntry(_, _, 3)`. The behavioural tests only strictly need the `DefenderHighScore` type + the imports to exist.
  - Rationale: without a value-level consumer the module would import `@shared` but never actually USE the table logic — a hollow pass of "consumed, not re-implemented". These two thin wrappers ARE the pure hall-of-fame data flow df5-6 is chartered to ship (Decision C: "df5 ships the reducer and the persistence"); the WIRING of when they fire is df7. No new abstraction, no persistence in core.
  - Severity: minor
  - Forward impact: df7 will call `commitHighScore`/`stepInitials` when wiring the game-over → hall-of-fame screen; the names are the seam it consumes.