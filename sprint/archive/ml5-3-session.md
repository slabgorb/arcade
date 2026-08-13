---
story_id: "ml5-3"
jira_key: "ml5-3"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-3: High-score table + initials in core, reusing @shared/highscore + @shared/name-entry: qualifiesForHighScore/insertHighScore over ML GameState; stepNameEntry drives the initials buffer (GETINT MLSUB.MAC:547, UPDATE MLSUB.MAC:1817). Verify whether the ROM ships a default ladder before seeding one.

## Story Details
- **ID:** ml5-3
- **Jira Key:** ml5-3
- **Workflow:** tdd
- **Branch Strategy:** gitflow (feat/ml5-3-high-score-table-initials-core)
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p3

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-13T18:57:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T18:22:39+00:00 | 2026-08-13T18:25:37Z | 2m 58s |
| red | 2026-08-13T18:25:37Z | 2026-08-13T18:40:54Z | 15m 17s |
| green | 2026-08-13T18:40:54Z | 2026-08-13T18:47:08Z | 6m 14s |
| review | 2026-08-13T18:47:08Z | 2026-08-13T18:57:21Z | 10m 13s |
| finish | 2026-08-13T18:57:21Z | - | - |

## Story Context

### Title Analysis & Derived Acceptance Criteria

The story title specifies:
1. **High-score table integration** into millipede's core GameState
2. **Initials entry** into core GameState via stepNameEntry
3. **Reuse existing @shared code:**
   - `@shared/highscore`: qualifiesForHighScore() and insertHighScore()
   - `@shared/name-entry`: stepNameEntry()
4. **ROM citations:**
   - GETINT MLSUB.MAC:547 (initials buffer read)
   - UPDATE MLSUB.MAC:1817 (high-score update)

### Acceptance Criteria (Derived)
1. **Core GameState types** support high-score table and initials buffer
2. **qualifiesForHighScore()** called on game end to check if score qualifies
3. **insertHighScore()** called to add score to table with initials entry flow
4. **stepNameEntry()** drives the initials buffer state machine
5. **Pure core implementation** - no shell dependencies (per "core stays pure" pattern)
6. **All high-score functions** integrated into game loop (likely in game-end reducer)
7. **Tests cover the integration** - at minimum, test qualifies/insert functions with GameState

### Technical Approach

**Reuse Pattern:** This story follows the established consumer pattern from `asteroids`, `joust`, and `mc7`:
- Import `qualifiesForHighScore`, `insertHighScore` from `@shared/highscore`
- Import `stepNameEntry` from `@shared/name-entry`
- Integrate into millipede's core GameState type
- Wire into game-end/score-change reducers
- Keep core pure (no localStorage calls)

**Key ROM References:**
- GETINT MLSUB.MAC:547 — initials buffer getter
- UPDATE MLSUB.MAC:1817 — high-score update code
- MLSUB.MAC:406 (COPYHS) — copy high-score (may be for attract phase in ml7)

**Open Questions for RED/Dev phases:**
- ❓ **Does the Millipede ROM ship a default high-score ladder?** (Research question for TEA/Dev phase)
  - This story mentions "Verify whether the ROM ships a default ladder before seeding one"
  - If no default, seed a hardcoded ladder (like other games do)
  - If yes default, extract it from the ROM audit

**Context from Epic ml5:**
- Replaces EAROM chip emulation with one-origin localStorage (ml5-4 handles persistence)
- Mirrors centipede cp4 game-structure pattern
- ml5 dependency tree: ml5-1 (scoring, DONE) → ml5-2 (bonus life, backlog) → ml5-3 (this) → ml5-4 (persistence)

## Delivery Findings

No upstream findings at setup time.

## Design Deviations

No design deviations at setup time.

### Dev (implementation)
- **Corrected a TEA test-expectation error (code was right, test was wrong)**
  - Spec source: tests/highscore.test.ts (TEA RED), case "grows a partial board without truncating below 8"
  - Spec text: `expect(next.map(r=>r.name)).toEqual(['BBM', 'MID', 'MEC'])` for `insertHighScore([BBM 89175, FXL 88254, MEC 87830], {name:'MID', score:88000})`
  - Implementation: corrected the expectation to `['BBM', 'FXL', 'MID', 'MEC']` (descending: 89175 > 88254 > 88000 > 87830). No implementation change — the shared `insertHighScore` result was already correct.
  - Rationale: TEA's expected array dropped FXL because 88254 > 88000 was overlooked. Fixing it STRENGTHENS the descending-insert assertion (now proves the newcomer slots among three existing entries, not two); it does not weaken the test. Verified against `@shared/highscore` insert semantics (first index where existing.score < entry.score).
  - Severity: trivial
  - Forward impact: none — length-4 result and the truncation intent are unchanged; the assertion is now correct.
  - → ✓ ACCEPTED by Reviewer: verified independently — partial `[BBM 89175, FXL 88254, MEC 87830]` + `MID 88000` yields `[BBM, FXL, MID, MEC]` (89175 > 88254 > 88000 > 87830) via `@shared/highscore` insert semantics. TEA's original `['BBM','MID','MEC']` dropped FXL; the correction strengthens the descending-insert assertion, does not weaken it. Sound.

### Reviewer (audit)
- No UNDOCUMENTED spec deviations. The module matches the epic's mandated "reuse mc7's high-score pattern" (standalone consumer, depth threaded through `@shared`, base row) and the story's initials-via-`stepNameEntry` requirement. The one open research question ("does the ROM ship a default ladder") was resolved to YES and seeded faithfully — a spec fulfilment, not a deviation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/core/highscore.ts` — the module (replaced the `export {}` seam). Standalone consumer of `@shared/highscore` (depth-8-threaded `qualifiesForHighScore`/`insertHighScore`) + `@shared/name-entry` (`stepInitials` = `stepNameEntry` at width 3). `MilliHighScore = HighScoreEntryBase`; `MILLI_HIGH_SCORE_DEPTH=8`; `MILLI_INITIALS_LENGTH=3`; `DEFAULT_HIGH_SCORES` = the 8 ROM rungs, best-first, each line cited in-comment (mushroom.ts convention).
- `plugins/millipede/docs/rom-study/claims/14-high-scores.json` — 21 `HS-*` claims (5 anchors + 8 HS-SCORE + 8 HS-INIT), GENERATED from the vendored `.MAC` lines (never hand-typed), verbatims byte-exact. Auto-enrols via `loadClaims()` glob.
- `plugins/millipede/tests/highscore.test.ts` — one TEA test-expectation corrected (see Design Deviations → Dev); otherwise TEA's file unchanged.

**Tests:** 24/24 of this story's tests GREEN. Full millipede project: 726 passed | 5 skipped | **1 failed** — and that 1 is the PRE-EXISTING `tests/audit/mushroom-claims.test.ts` red (ml3-7 ROCK/DD-5), unrelated to ml5-3 and proven so in RED (fails with all ml5-3 files removed). Do not treat it as a ml5-3 regression. `citations.test.ts` + `purity.test.ts` green (54/54): the new claims byte-verify and `highscore.ts` is pure despite importing `@shared`. Lint (`tsc --noEmit`) exit 0.

**Branch:** feat/ml5-3-high-score-table-initials-core (pushed)

**Note — TEA assessment overstated the coverage gate:** the dossier COVERAGE sweep is
prose→claim (`uncoveredCitations`: every backticked citation in a `docs/rom-study/*.md`
must have a covering claim), NOT claim→prose. So `14-high-scores.json` needed NO dossier
prose and NO `DOSSIER_FILES` edit — adding claims can only satisfy existing prose, never
redden the sweep. Confirmed green. Likewise there is no uncited-literal SCANNER in
millipede (unlike MC's AC3); the in-comment citations are convention, not a gate.

**Handoff:** To review (Obi-Wan). The pre-existing mushroom-claims red is flagged for the
finish trial-merge/Reviewer as a separate develop bug.

## Delivery Findings (Dev)

- **Gap** (non-blocking): `tests/audit/mushroom-claims.test.ts:130` is RED on `develop` —
  the ml4-4 ddt merge added claim `DD-5` at `MLDEF.MAC:204` but did not update the
  `ROCK stays claimed by exactly {BT-33, SC-51}` assertion. Affects
  `plugins/millipede/tests/audit/mushroom-claims.test.ts` (the assertion must admit DD-5,
  or DD-5 must cite a different line). *Found by Dev during implementation (pre-existing).*

## TEA Assessment (RED complete — Han Solo)

**RED state:** 24 new tests, all failing meaningfully (values/behaviour absent, not a
collect crash), lint (tsc --noEmit) green, no regressions I caused. Commit on
`feat/ml5-3-high-score-table-initials-core`.

**Research question ANSWERED (the crux SM flagged):** *"Verify whether the ROM ships a
default ladder before seeding one."* — **IT DOES.** Verified against the vendored 1982
source this session:
- **Depth NSCORE=8** (`MLDEF.MAC:189`), not the shared 10. `HSCORE`/`INITL` are each
  `.BLKB 3*NSCORE` (`MLDEF.MAC:275-276`): scores 3-byte BCD **LSB,MIDDLE,MSB**, initials
  3 bytes (A=1..Z=26, 0=blank), RADIX 16 (claim RX-1).
- **Default ladder** `MLTST.MAC:97-112`, best-first: **BBM 89175 · FXL 88254 · MEC 87830
  · ED 86520 · DUG 75478 · DCB 63084 · DEW 52227 · DFW 41916**. Decode is self-proving:
  the 8 initials triples reproduce the ROM's own `;BBM/;FXL/...` comments exactly under
  hex+A=1, and the 8 scores decode strictly descending under LSB-first. This SEEDS the
  real ROM ladder — it is the faithful **opposite** of the epic's "clone-ism trap", not
  an instance of it. NOTE: the epic context's "NO ROM default high-score ladder" phrasing
  is now overturned — see memory [[millipede-ships-default-hiscore-ladder]].

**The surface Dev (GREEN) must build** — `plugins/millipede/src/core/highscore.ts`
(currently an `export {}` RED seam; header documents it). Mirror
`plugins/missile-command/src/core/highscore.ts` (the standalone consumer pattern; NOT
centipede/pac-man, which couple it to a full GameState that millipede won't have until
ml7). Exports: `MILLI_HIGH_SCORE_DEPTH=8`, `MILLI_INITIALS_LENGTH=3`,
`DEFAULT_HIGH_SCORES` (8 rows above), `qualifiesForHighScore`/`insertHighScore` (thread
depth 8 through `@shared/highscore`), `stepInitials(buffer,key)=stepNameEntry(buffer,key,3)`,
`type MilliHighScore = HighScoreEntryBase`.

**Two coupled GREEN deliverables beyond the module (the citation gate):**
1. `docs/rom-study/claims/14-high-scores.json` — HS-* claims quoting the vendored bytes
   VERBATIM (generate from `reference/original-source/millipede/`, never hand-type). The
   audit test `tests/audit/high-scores-claims.test.ts` demands: floor 12 claims, all 8
   default rungs cited to MLTST.MAC:97-112, and the 7 REQUIRED_ANCHORS (NSCORE, HSCORE,
   INITL, the default block, GETINT, UPDATE). loadClaims() globs claims/*.json → no
   manifest edit; but the dossier COVERAGE sweep needs each claim covered by prose in a
   `docs/rom-study/*.md` dossier file, so a matching prose line must be added too.
2. The AC3 uncited-literal scanner + `tests/audit/citations.test.ts` will fire on the
   `DEFAULT_HIGH_SCORES` literals — cite each inline (MC-style `// ...MLTST.MAC:NN`) and
   ensure the claims cover them, or the existing citations gate reddens.

**ROM-decode watch-outs for Dev (get these EXACTLY right or the fidelity is a lie):**
- Endianness is **little-endian** (LSB first): `[75,91,08]` → `08 91 75` → 89175. Big-endian
  breaks the descending order (proof the direction is right).
- `ED`'s third initial byte is **0 = blank**; store `'ED'` (2 chars), not `'ED '` — the
  name-entry path can't produce a trailing space anyway, so this keeps default rows and
  entered rows the same shape.

**⚠ Pre-existing develop-red — NOT ml5-3, do not "fix" it in this story:**
`tests/audit/mushroom-claims.test.ts:129` fails on `MLDEF.MAC:204` expecting
`['BT-33','SC-51']` but getting `['BT-33','DD-5','SC-51']`. Proven pre-existing: it fails
with all three of my files moved aside. Root cause: the ml4-4 ddt merge (landed via this
session's `git pull`) added claim `DD-5` at `MLDEF.MAC:204` without updating that mushroom
assertion. Flag for the finish trial-merge and Reviewer; it's a separate bug on `develop`.

## Rule Coverage

- **core/shell purity (the cabinet's #1 rule):** the new `highscore.ts` lives in
  `src/core/` and is scanned by `tests/purity.test.ts`' per-file sweep — the `export {}`
  seam passes; Dev's implementation must stay pure (import only `@shared/*`, no
  localStorage — persistence is ml5-4/shell). Behaviour tests assert pure input→output
  (no mutation: "does not mutate the input table").
- **Reuse-first (CLAUDE.md):** tests import the SHARED primitives' behaviour through the
  millipede wrappers rather than re-implementing qualify/insert — the depth-8 threading
  test (`41915` rejected on a full board) is precisely the "did you thread depth or fall
  back to the shared 10" guard.
- **No un-cited numeric constants (AC3 / citations gate):** covered by the whole
  `high-scores-claims.test.ts` arm — every transcribed ROM value must carry a
  byte-verifiable claim before it lands (the rb4/cp1 "gate before constants" law).
- **Meaningful assertions (lang-review #): ** self-checked — no `let _ =`, no `assert(true)`,
  no always-null. The centrepiece is an exact `toEqual` on the full 8-row ladder; qualify/
  insert cases assert both the positive and the negative (tie does NOT displace).

## SM Assessment

**Setup verdict:** Clean start. Story routed to TEA for RED (tdd, phased).

**Board analysis (Thrawn):**
- Sibling probes clean at setup: no `origin/feat/ml5-3-*` branch existed before mine; no `ml5-3` session in any `a-*` checkout (a-1 owns ml4-5, a-2 owns ml3-6).
- Merge gate clean: zero open PRs on `slabgorb/arcade`.
- No `depends_on`; ml5-1 (waves + scoring core) is `done`. Nothing blocks this.
- Claim pushed immediately: branch `feat/ml5-3-high-score-table-initials-core` (commit `599302ad`, epic stamp + context) is on `origin` — sibling `git branch -r | grep ml5-3` now lights up. Story stamped `in_progress` (sm-setup left it `backlog`, corrected).

**ACs:** The epic YAML carried NO `acceptance_criteria`; the 7 ACs in Story Context are DERIVED from the title. There is no epic AC to diff against, so nothing was overwritten — but Dev/Reviewer should treat these as SM-derived, not story-authored.

**Research directive — hand to TEA, unresolved by design:** The title says *"Verify whether the ROM ships a default ladder before seeding one."* This is a source question for RED, not an SM call. TEA must read the millipede ROM audit / MLSUB.MAC before writing the seed test: if the ROM ships a default ladder, the test pins the ROM's values; if not, the test pins a deliberately-chosen seed. Do not write a `qualifiesForHighScore` seed test until this is answered — the expected ladder is its fixture.

**Reuse-first (rule):** This is integration in `plugins/millipede/src/core/`, wiring `@shared/highscore` (`qualifiesForHighScore`/`insertHighScore`) and `@shared/name-entry` (`stepNameEntry`) into millipede's core GameState. It is NOT new shared code. Keep core pure — no localStorage (persistence is ml5-4). Millipede's own core-purity guard scans `src/core/` source text; keep shell imports out.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (24/24 story green, lint 0; only pre-existing mushroom-claims red) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths assessed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — pure module, no error handling to swallow (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — independently re-verified all ROM citations + BCD/initials decode for all 8 rungs |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity passes, only pure @shared exports imported, initials gated to A-Z |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both LOW) | confirmed 1 (cast), downgraded 1 (RED-narrative → accepted convention) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed (LOW), 1 downgraded-to-convention (LOW/informational), 0 dismissed, 0 blocking

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md rules; rule-checker enumerated 61 instances across 33 rules.

- **#1 Type-safety escapes:** `highscore.ts` clean (no `as any`/`@ts-ignore`/non-null). `tests/highscore.test.ts:38` `as unknown as {…}` — **CONFIRMED LOW** (see assessment). No escapes in shipped module.
- **#2 Generic/interface:** `qualifiesForHighScore`/`insertHighScore` take `readonly MilliHighScore[]`; `entry` unmarked but documented not-mutated and mirrors the shared generic + MC sibling — compliant fleet convention.
- **#5 Module/declaration:** `type` import of `HighScoreEntryBase`, `export type MilliHighScore`; no `.js` extension needed (`moduleResolution: bundler`). Compliant.
- **#8 Test quality:** tests import from `src` (not dist), no mocks, exact-value assertions (`toEqual` on the 8-row ladder, boundary values 41915/41916/41917), non-vacuous. Compliant apart from the #1 cast.
- **#10 Security type-validation:** `stepInitials` key is runtime-validated by `@shared/name-entry`'s `/^[a-zA-Z]$/`; `JSON.parse(...) as Claim[]` is a repo-committed, byte-verified claims file (fleet convention), not external input. Compliant.
- **#17 Comments assert a mechanism:** the "WHY THIS IS RED" block is now historically-worded — **matches shipped house convention** (`purity.test.ts:20-21`, `citations.test.ts:24-25` keep identical now-false "not built yet" narratives). Downgraded to informational.
- **core/shell purity (CLAUDE.md):** `highscore.ts` imports only `@shared` pure exports; `tests/purity.test.ts` 29/29 green with the new file swept. Compliant.
- **reuse-first (CLAUDE.md):** all three functions are thin wrappers threading `MILLI_HIGH_SCORE_DEPTH`/`MILLI_INITIALS_LENGTH` through `@shared`; nothing re-implemented. Compliant.
- **ROM-cited constants (CLAUDE.md):** depth, initials-width and all 8 default rungs cited (21 `HS-*` claims) and byte-verified against the vendored `.MAC` source; `tests/audit/citations.test.ts` + `high-scores-claims.test.ts` green. Compliant.

### Devil's Advocate

Suppose this code is broken. The gravest risk in a fidelity clone is a *confidently wrong* constant: a default ladder that looks plausible, passes every test, and is simply not what the machine shipped — because the test and the data were transcribed from the same misreading. That is exactly the failure the epic warned about. So I did not trust the author's decode: I re-read the raw `MLTST.MAC:97-112` bytes and decoded from first principles (hex parse, BCD digit-pairs, `LSB,MIDDLE,MSB` order per `MLDEF.MAC:275`, initials `A=1..Z=26`/`0=blank`). It reproduced BBM 89175 … DFW 41916 exactly and strictly descending, and the comment-analyzer independently did the same. The endianness is self-checking: big-endian breaks monotonicity. The initials are self-checking: the decode reproduces the ROM's own `;BBM/;FXL/…` comments. Could the depth be wrong? `NSCORE=8` is cited to `MLDEF.MAC:189` and threaded through the shared primitive; the test proves a full 8-board rejects 41915 (which a depth-10 fallback would wrongly admit) — so a silent reversion to the shared default would redden. Could a malicious or confused user inject through the initials path? No — `stepNameEntry` only appends `A-Z`, so no delimiter, control char, or overlong string reaches `name`; and there is no DOM sink in core anyway (render is ml7). Could persistence corrupt this? Out of scope — no storage here, and purity is mechanically enforced. Could the tests pass vacuously? The centerpiece is an exact `toEqual` against the real export, and the byte-match audit re-opens each verbatim against the vendored file, so a mutated constant fails. The residual risk is the leftover `as unknown as` cast: if a *future* refactor changed a signature, this test would not type-error (it would still runtime-fail on behavior). That is real but LOW, and recorded. What would a stressed reader misunderstand? The "WHY THIS IS RED" block — but that matches fleet convention. Nothing here rises to Critical or High.

## Reviewer Assessment

**Verdict:** APPROVED

The module is a faithful, minimal consumer of `@shared/highscore` + `@shared/name-entry`, and its one high-risk element — the ROM default ladder — is independently verified three ways (my first-principles re-decode, the comment-analyzer's, and the byte-match audit gate). No Critical/High issues.

- **[SEC]** Clean (reviewer-security): core imports only pure `@shared` exports; `stepNameEntry` gates initials to `A-Z`, closing the name-injection surface; no DOM/storage/network in core. Purity gate green with the new file.
- **[RULE]** `tests/highscore.test.ts:38` — `highscoreModule as unknown as {…}` double-cast bypasses type-checking against the now-implemented module (rule #1). **CONFIRMED, LOW/non-blocking.** It was the documented RED-seam device ([[red-seam-new-shell-module]]); rule-checker verified removal compiles clean and all tests still pass. Filed as a non-blocking follow-up rather than blocking a correct, fully-tested feature — a re-review round for a single test-only cast is disproportionate.
- **[DOC]** The test's "WHY THIS IS RED" block (rule #17) reads as if the module is still an `export {}` seam. **Downgraded to informational** — it matches shipped house convention (`purity.test.ts:20-21`, `citations.test.ts:24-25` ship identical now-false narratives). Comment-analyzer returned clean; all ROM citations verified accurate.
- **[TEST]** (analyzer disabled — assessed by Reviewer) Assertions are exact-value and non-vacuous (`toEqual` on the full ladder; boundary values 41915/41916/41917 pin the tie-does-not-displace and depth-8 semantics). The one TEA test-expectation bug (partial-board insert order) was already caught and correctly fixed in GREEN — I re-verified the corrected value.
- **[TYPE]** (disabled — assessed by Reviewer) `MilliHighScore = HighScoreEntryBase` (name+score, matching HSCORE/INITL which carry no wave/level); `readonly` params. The only type concern is the [RULE] cast, cross-referenced.
- **[EDGE]** (disabled — assessed by Reviewer) Boundaries covered: `score<=0`, open/partial/full board, tie vs strict-beat at the lowest rung, insert truncation at 8, tie-after placement, no-mutation. All pinned by tests.
- **[SILENT]** (disabled — assessed by Reviewer) N/A — pure total functions, no error handling, nothing swallowed.
- **[SIMPLE]** (disabled — assessed by Reviewer) Minimal thin wrappers; no dead code or over-engineering. The mc7 sibling confirms the shape.

**Data flow traced:** a keydown → `stepInitials(buffer, key)` → `@shared/name-entry` (`A-Z` only) → `insertHighScore(table, {name: buffer, score})` → new descending table truncated to 8. Safe: no DOM sink in core, input charset-gated, table logic pure and non-mutating.
**Pattern observed:** standalone core high-score module mirroring `plugins/missile-command/src/core/highscore.ts:1-72` — the fleet-established consumer shape.
**Error handling:** N/A (pure); graceful degradation lives in the shared persistence layer, out of scope here.

**Handoff:** To SM for finish-story. (Note the pre-existing `mushroom-claims`/DD-5 develop red for the finish trial-merge — a separate bug, not ml5-3.)

## Delivery Findings

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/highscore.test.ts` still uses the RED-seam `as unknown as {…}` namespace cast and a now-historical "WHY THIS IS RED" note. Affects `plugins/millipede/tests/highscore.test.ts` (swap the cast for a direct typed `import`, keeping the local `Row` type for the two narrowing params — rule-checker verified this compiles and passes; optionally refresh the header to reflect the shipped module). *Found by Reviewer during code review.*
- **Gap** (non-blocking, pre-existing — NOT ml5-3): `tests/audit/mushroom-claims.test.ts:130` is red on `develop` (ml4-4's `DD-5` claim at `MLDEF.MAC:204` vs the `{BT-33, SC-51}` assertion). Affects `plugins/millipede/tests/audit/mushroom-claims.test.ts`. Flag for the finish trial-merge. *Found by Reviewer during code review.*