---
story_id: "lb2-8"
jira_key: "lb2-8"
epic: "lb2"
workflow: "tdd"
---
# Story lb2-8: The rotating top-five HIGH SCORES board — and the cross-origin score payload it needs

## Story Details
- **ID:** lb2-8
- **Jira Key:** lb2-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade-shared, lobby
- **Branches:** feat/lb2-8-highscore-board (arcade-shared, lobby)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T13:54:32Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T11:14:16.430522Z | 2026-07-15T11:17:12Z | 2m 55s |
| red | 2026-07-15T11:17:12Z | 2026-07-15T11:39:59Z | 22m 47s |
| green | 2026-07-15T11:39:59Z | 2026-07-15T12:52:17Z | 1h 12m |
| review | 2026-07-15T12:52:17Z | 2026-07-15T13:13:37Z | 21m 20s |
| green | 2026-07-15T13:13:37Z | 2026-07-15T13:29:26Z | 15m 49s |
| review | 2026-07-15T13:29:26Z | 2026-07-15T13:54:32Z | 25m 6s |
| finish | 2026-07-15T13:54:32Z | - | - |

## Acceptance Criteria
1. ADR-0004 is amended (or superseded) in writing before the board is built: the published cross-origin summary carries a top-N list of name+score rows rather than a single number, and the amendment states the new cookie shape, its size against the 4096 B cap, and why widening beats the alternatives.
2. The board shows a real top-five ladder for the game currently on screen, sourced through the widened @arcade/shared/highscore read — verified per game, not just for one.
3. The board rotates through every game in the registry on a timer, and the pip row shows one pip per game with the active pip lit in that game's own colour.
4. A game with no readable scores shows an explicit empty state (e.g. NO SCORES YET), never a fabricated name, a placeholder ladder, or a zero.
5. The board re-reads on return from a game through lb2-3's single refresh entry point — beating your best and coming back updates the ladder without a manual reload.
6. The rotation timer is cleaned up on teardown and does not keep firing against a detached DOM.

## Sm Assessment

**Story shape — an ADR amendment gates a two-repo feature build.** lb2-8 is not a
plain lobby feature; AC-1 makes it a data-contract change first. The lobby reads
cross-origin scores from a cookie that today carries a *single bare number*
(`arcade-hi-<gameId>=<top score>`, decided in ADR-0004). The design's HIGH SCORES
board needs five rows each with a NAME — data the current cookie physically cannot
carry. So the work order is fixed: **amend/supersede ADR-0004 in writing → widen the
`@arcade/shared/highscore` contract to a top-N name+score list → publish a new
`@arcade/shared` tag → repin lobby → build the rotating board on top.** TEA's RED
tests should bite on both the widened shared contract AND the board behaviour.

**Two repos, in dependency order.** `arcade-shared` (the contract) must land and be
tagged before `lobby` can consume it. This is the full arcade-shared consumption
loop the fleet has run several times (SH2-8/SH2-18/SH2-22): widen → publish → bump →
reinstall → repin. Watch the known landmine — a plain `npm install` won't re-resolve
a changed git ref; the consumer needs an explicit `npm install @arcade/shared@github:...#<newtag>`
(or `npm ci` once the lock is rewritten). lobby is currently on **v0.13.1**; the widen
will produce the next tag.

**Dependencies are satisfied — this is a clean start.** lb2-2 (the cross-origin cookie
transport) and lb2-3 (the pageshow single-refresh entry point) are both **done**. AC-5
reuses lb2-3's exact re-read entry point rather than inventing a second one. Merge gate
clear (no blocking open PRs across the fleet).

**Non-negotiables to enforce in review:**
- **Fail-soft (AC-4):** no readable rows → an explicit honest empty state (`NO SCORES YET`),
  never a fabricated name, a placeholder ladder, or a zero. This is the house rule.
- **Registry is the single source of truth (AC-2/AC-3):** the board sources the game list,
  glow colours, and pip colours from `lobby/src/core/registry.ts` — it must not hardcode
  or fork them (the design hardcodes all four; do not let it win).
- **Timer hygiene (AC-6):** the ~4.5s rotation timer must be torn down and must not fire
  against a detached DOM. Desktop-only arcade — courtesy/battery matter.

**Pointers for the pipeline:**
- ADR-0004: `docs/adr/0004-cross-origin-high-scores.md` (orchestrator root) — the doc AC-1 amends.
- Shared contract: `arcade-shared/` `/highscore` subpath (already exported; this widens it).
- Cookie sizing note from the story: five 3-char names + five scores is well under 200 B,
  far under the 4096 B cookie cap — size is not the binding constraint; widening is safe.

**Handoff:** To **Han Solo (TEA)** for the RED phase. Write failing tests that pin the
widened highscore contract (name+score rows, fail-soft empty read) and the board's six
ACs. Both branches (`feat/lb2-8-highscore-board`) exist on arcade-shared and lobby.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `arcade-shared/tests/highscore-summary.test.ts` — the widened cross-origin summary
  contract (18 tests): rows round-trip via `save()`/`readTopScores`, top-N cap at
  `PUBLISHED_SUMMARY_DEPTH=5`, tile back-compat (`readTopScore`), fail-soft
  empty/corrupt/zombie, poisoned-row rejection (Infinity/non-string name),
  name injection-safety, `<200 B` size, legacy bare-number degradation, no-browser fail-soft.
- `lobby/tests/highscore-board.test.ts` — the board component (16 tests, jsdom + fake
  timers): top-five ladder per game, registry-driven rotation + wrap, one pip per game lit
  in its colour, active game name in its glow colour, `NO SCORES YET` empty state (no
  fabrication), timer teardown (stop halts / no detached-DOM fire / idempotent), `refresh()`.
- `lobby/tests/highscore-board-integration.test.ts` — AC-5 through the real bootstrap
  (2 tests): the board re-reads on a real BFCache `pageshow` via `main.ts`; publishes through
  the real `@arcade/shared` `save()` so it is agnostic to Dev's cookie encoding.

**Tests Written:** 36 tests covering 6 ACs (behavioural half of AC-1; full AC-2..AC-6)
**Status:** RED — verified with canonical commands:
- arcade-shared `npm test`: **14 failed | 477 passed** (only highscore-summary fails; the
  `purity.test.ts` dist checks pass once `pretest` builds `dist/`).
- lobby: board unit file fails to LOAD (module `src/shell/highscoreBoard` absent) + **2**
  integration failures; the existing **132** lobby tests stay green.
- All failures trace to unbuilt features (`readTopScores`/`PUBLISHED_SUMMARY_DEPTH` absent;
  `highscoreBoard.ts` absent; no board mounted in `main.ts`). Proved the 2 arcade-shared
  `purity.test.ts` failures are a pre-existing build-artifact of bypassing `pretest`
  (mv-aside re-run), **not mine**.

### Rule Coverage (lang-review `typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — 0 vs null, no `??`→`\|\|` collapse | board "NO SCORES YET … no fabricated zero"; summary "empty board → []" | failing |
| #10 runtime validation at the trust boundary | summary "drops poisoned rows"; "corrupt/garbage summary reads []"; "hostile name cannot inject" | failing |
| #8 test quality — no vacuous assertions | self-check: removed 1 identity-map "sanity snapshot" | applied |
| #5 ESM `.js` relative-import extension | flagged as finding (likely N/A — `TopScoreRow` is same-file) | n/a |
| #2 generics / `readonly` params | `getRows`/`games` readonly-typed (compile-time only) | n/a-runtime |

**Rules checked:** the two runtime-enforceable rules (#4, #10) have failing coverage; #8
self-check applied; #5 flagged for Dev. #3/#6/#7/#9/#11/#12 are N/A to this story.
**Self-check:** 1 vacuous test found and fixed (identity-map snapshot in the ladder-order test).

**Handoff:** To Yoda (Dev) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**

*arcade-shared (the widened cross-origin contract):*
- `src/highscore.ts` — widened the published summary from a bare number to a top-N
  name+score ladder: `PUBLISHED_SUMMARY_DEPTH=5`, `TopScoreRow`, `readTopScores(gameId)`
  with runtime validation at the trust boundary (drops poisoned rows — `Infinity`,
  non-string names — caps the ladder, injection-safe), and `readTopScore()` back-compat
  (row 0 + legacy bare-number degradation) so the tile keeps working.
- `tests/highscore-summary.test.ts` — TEA's 18 RED tests, now GREEN.
- `tests/highscore-publish.test.ts` — migrated to the rows shape (TEA-scoped churn).
- `tests/score-cookie.test.ts` — migrated to rows (forced coupling TEA did not scope;
  1 now-redundant decline-vs-clear test dropped, guarantee moved to the factory boundary —
  see Dev deviation + Delivery Finding).

*lobby (the rotating board):*
- `src/shell/highscoreBoard.ts` — `mountHighScoreBoard(panel, games, getRows, {intervalMs}) → {refresh, stop}`:
  registry-driven top-five ladder, timer rotation + wrap, one pip per game lit in its own
  colour, active title in its glow colour, `NO SCORES YET` fail-soft empty state, timer
  teardown (no detached-DOM fire, idempotent stop).
- `src/core/score.ts` — `NO_SCORES_YET` constant (kept here so it doesn't trip the
  `/NO SCORE/` source guard — see Dev deviation).
- `src/shell/storage.ts` — `getTopScores(gameId)` wrapping the new `readTopScores`.
- `src/main.ts` — mounts the board at `#high-scores` and re-reads through lb2-3's single
  `pageshow` refresh entry point (AC-5).
- `index.html` — board markup + styles.
- `tests/highscore-board.test.ts` (16) + `tests/highscore-board-integration.test.ts` (2) —
  TEA's RED tests, now GREEN.

*orchestrator (AC-1, committed to `main`):*
- `docs/adr/0004-cross-origin-high-scores.md` — amended: summary widens to name+score rows,
  new cookie shape, size (<200 B vs the 4096 B cap), and why widening beats the alternatives
  (commit `17b9fdb`).

**Tests:** arcade-shared **490/490** GREEN · lobby **150/150** GREEN · both `tsc --noEmit` builds clean.
**Branch:** `feat/lb2-8-highscore-board` (arcade-shared + lobby) — both pushed to origin.

**Note for finish (SM):** the `@arcade/shared` pin in `lobby/package.json` is deliberately
left at `v0.13.1`; lobby tests/build run against a locally-overlaid widened `dist/`. The
repin to the new library tag (widen → publish → bump → reinstall → repin, per SH2-8/18/22)
is a **finish step** after arcade-shared releases.

**Handoff:** To Obi-Wan Kenobi (Reviewer) for code review.

### Rework (round-trip 1 — Reviewer REJECTED on AC-6)

**Trigger:** Reviewer (Obi-Wan) rejected on ONE blocking finding — AC-6's timer-teardown tests were
mutation-proven vacuous (a no-op `stop()` left all 16 board tests green). Also flagged one MEDIUM
(decodeRows read-side ordering) and two LOW nits, recommended to fold in. I applied all four so the
re-review is clean:

1. **[BLOCKING] AC-6 tests hardened** — `lobby/tests/highscore-board.test.ts`: the three teardown
   tests now assert `vi.getTimerCount() === 0` after `stop()` (plus a one-interval, non-multiple
   advance), pinning the timer itself rather than a wrap-around / `not.toThrow()`. **Mutation-proven:**
   gutting `stop()` to a no-op now turns all three RED (was: all green — the exact scenery guard the
   Reviewer caught).
2. **[MEDIUM] decodeRows sorts on read** — `arcade-shared/src/highscore.ts`: `decodeRows` now sorts
   highest-first then caps at `PUBLISHED_SUMMARY_DEPTH`, mirroring the write-side `topRowsOf`, so the
   documented "highest first" contract holds against an untrusted/hand-edited cookie and `readTopScore`
   row-0 is the true max. New test pins it (out-of-order cookie → sorted read).
3. **[LOW] sanitizeName strips control chars** — now strips the C0 range + DEL in addition to `;=,:`.
   New test pins it (a name with newline/NUL → stripped, letters kept).
4. **[LOW] options readonly** — `mountHighScoreBoard`'s `options` field marked `readonly`.

**Tests:** arcade-shared **492/492** (490 + 2 new) · lobby **150/150** (3 AC-6 tests hardened) · both
`tsc --noEmit` builds clean. Overlay re-synced (rebuilt `dist/` copied into
`lobby/node_modules/@arcade/shared`, `.vite` cache cleared).
**Commits:** arcade-shared `bf1e2f9`, lobby `164717a` — both pushed.

**Reviewer's finish-note (unchanged, for SM):** `lobby/package.json` still pins
`@arcade/shared#v0.13.1`; the repin to the new release tag is the finish step.

**Handoff:** Back to Obi-Wan Kenobi (Reviewer) for re-review.

## Subagent Results

_Round-trip 1 re-review (round-trip 0 table archived below). Same toggles: `preflight` + `rule_checker` enabled; 7 disabled → assessed by hand._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — arcade-shared 492/492, lobby 150/150, both `tsc` clean, zero smells (no TODO/console.log/as any/@ts-ignore/empty catch/.only/.skip/debugger); overlay left intact (no npm ci) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge cases assessed by hand (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — swallowed-error paths assessed by hand (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality + mutation checks done by hand; the AC-6 fix is mutation-proven RESOLVED (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — doc/impl mismatch assessed by hand (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type invariants assessed by hand (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — injection/XSS assessed by hand + probe (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by hand (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (high-confidence, MEDIUM impact) | confirmed 1 non-blocking (decodeRows read-side name sanitization asymmetry); see [RULE]/[SEC] |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, each assessed by hand and tagged below)
**Total findings:** 1 confirmed non-blocking ([RULE]/[SEC][DOC] — decodeRows name sanitization), routed to a follow-up. 0 blocking. 0 dismissed, 0 deferred. The round-0 blocker (AC-6 vacuous teardown) and its 3 folded-in findings are all RESOLVED and re-verified (mutation-proven where testable).

<details><summary>Round-trip 0 Subagent Results (archived)</summary>

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (1 benign smell) | N/A — 640/640 green, both builds pass; the one `as unknown as string` is a deliberate negative-test cast |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | found the blocking AC-6 vacuous guard by hand (now fixed) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (1 medium, 2 low) + 1 finish-note | 3 non-blocking (all now fixed in rework) |

</details>

## Reviewer Assessment

**Verdict:** APPROVED

**Re-review (round-trip 1).** Round-trip 0 rejected on ONE blocking finding — AC-6's timer-teardown
tests were mutation-proven vacuous — and recommended folding in one MEDIUM (decodeRows read-side
ordering) + two LOW nits. Dev reworked all four (arcade-shared `bf1e2f9`, lobby `164717a`). I
re-verified each, independently and empirically:

- **[TEST] AC-6 blocker — RESOLVED, mutation-proven.** The three teardown tests now pin
  `vi.getTimerCount()` (1 live before `stop()`, 0 after) plus a NON-multiple one-interval advance —
  no longer the modulo-wrap / `not.toThrow()` scenery. I gutted `stop()` to a no-op myself and ran
  `tests/highscore-board.test.ts`: **all three go RED** (`expected 1 to be +0`), where in round 0 a
  no-op left them green. The exact regression AC-6 exists to prevent is now guarded. Restored; 16/16
  green. Bonus: the `toBe(1)`-before-`stop()` assertion also catches a double-armed interval (the
  "refresh re-arms a second timer" worry from round 0's Devil's Advocate).
- **[DOC]/[RULE] decodeRows ordering (round-0 MEDIUM) — RESOLVED, mutation-proven.** `decodeRows`
  now parses all pairs, sorts highest-first, then caps — so `readTopScores`' documented "highest
  first" and `readTopScore`'s row-0-is-max hold against a hand-edited/hostile cookie. I neutered the
  comparator (`sort(() => 0)`) and the out-of-order test went RED; restored. Removing the in-loop
  `break` is REQUIRED for a correct top-N (you must see all rows to sort), and the 4096 B cookie cap
  bounds the work — sound.
- **[TYPE]/[SEC] two LOW nits — RESOLVED.** `mountHighScoreBoard`'s `options` field is now
  `readonly`; `sanitizeName` now strips the C0 range + DEL alongside `;=,:` (write side). Confirmed
  in the diff.

**Data flow traced:** raw hostile cookie `arcade-hi-tempest=A=B:9000` → `readSummaryCookie`
(exact-name match, returns everything after the first `=` → `A=B:9000`) → `decodeRows` (splits,
validates score via `/^\d+$/`, sorts, caps) → `getTopScores` → board `drawLadder` →
`name.textContent = row.name`. Safe against XSS: names render as text, never markup. The one residual
gap is that `decodeRows` does not re-sanitize the name CHARACTERS on read (see the single non-blocking
finding) — a `=` survives into the displayed name. Verified by code-trace **and** a throwaway probe.

### Blocking findings

None. The round-0 blocker (AC-6) is resolved and mutation-proven. No new Critical/High.

### Non-blocking findings (routed to a follow-up; do not block this approval)

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM][RULE][SEC][DOC] | **Asymmetric name sanitization at the untrusted-cookie boundary.** `sanitizeName` (write side, via `encodeRows`) strips `;=,:` + control chars, but `decodeRows` (the READ side, which parses the genuinely untrusted value — any subdomain can write the cookie, a player can hand-edit it) never re-sanitizes the extracted name; it only checks non-emptiness + validates the score. The module comment (highscore.ts:232-234) claims the name is "re-validated on the way back" — it is not, for characters. The rework's own control-char test round-trips through `save()`→`encodeRows`, so it never exercises the read path against a raw cookie. **Confirmed** by code-trace + probe: a raw `A=B:9000` cookie decodes to name `A=B` untouched. **Impact is low/self-inflicted:** textContent render → no XSS; no read→re-encode path → no cookie forgery; scores stay strictly validated; `;`/`,`/`:` can't traverse the cookie/split boundaries and browsers reject raw control chars in `document.cookie`, so `=` is the only realistic survivor; the attacker must control their own cookie, which the cross-origin transport already trusts by design. Pre-existing since round 0 (not a rework regression — the rework merely hardened the write side further). This is the same graffiti-tier species as the round-0 ordering finding, which was also non-blocking. | `arcade-shared/src/highscore.ts:272-285` (`decodeRows`, line 277) | Apply `sanitizeName(name)` inside `decodeRows` (symmetry), correct the "re-validated on the way back" comment to match, and add a test seeding a RAW poisoned cookie (`makeCookieJar({ [COOKIE]: 'A=B:9000' })`, bypassing `encodeRows`) asserting the `=` is stripped on read. Recorded as a Delivery Finding for the next touch. |

### Finish-phase blocker (not a code defect — carried forward for SM)

- `lobby/package.json` is still pinned to `@arcade/shared#v0.13.1`, which predates this widening.
  `storage.ts` imports `readTopScores`/`PUBLISHED_SUMMARY_DEPTH`/`TopScoreRow`, absent from v0.13.1 —
  a fresh `npm ci` / lobby CI would fail `tsc`. It type-checks locally only because
  `node_modules/@arcade/shared` is a locally-overlaid widened build. The KNOWN finish sequence
  (release arcade-shared past `df34fd0` → repin lobby to the new tag), per Dev's note + the
  SH2-8/18/22 memory. **Must complete before the lobby's own CI can pass.** Not a reason this review
  blocks — recorded for SM at finish.

### Observations by dispatch domain (round-trip 1; 7 subagents disabled → assessed by hand)

- **[EDGE]** (disabled): `mountHighScoreBoard([], …)` still throws at `render()` (`games[0]`
  undefined) — a documented precondition (the registry guarantees ≥1 game; the board is only handed
  `GAMES` or a ≥2-game test list), not a live risk. `intervalMs: 0` respected via `??` (rule #4).
  `decodeRows`' removed in-loop `break` does not open an unbounded-work edge — the 4096 B cookie cap
  bounds row count and sorting 1000 rows is trivial. No blocking edge.
- **[SILENT]** (disabled): every `catch{}` in `highscore.ts` remains an intentional, commented
  fail-soft; the rework added none. The board has nothing that can fail (pure DOM writes).
  [VERIFIED — highscore.ts guards unchanged by the rework]
- **[TEST]** (disabled): the AC-6 fix is mutation-proven RESOLVED (above); the decodeRows sort test
  is mutation-proven non-vacuous (above). No `.only`/`.skip`, no `dist/` imports. Suites: arcade-shared
  492/492, lobby 150/150 (my run + preflight).
- **[DOC]** (disabled): the round-0 "highest first" doc gap is closed by the read-side sort. ONE
  residual doc-vs-code gap remains: the "re-validated on the way back" name comment overpromises
  (folded into the non-blocking finding above).
- **[TYPE]** (disabled): types sound — `options` now `readonly` (nit closed); `TopScoreRow`/
  `HighScoreRow` structurally-identical-but-separate BY DESIGN (board must not hard-depend on a type
  that only lands at repin); `import type` correct throughout. [VERIFIED — rule_checker rule #2/#5]
- **[SEC]** (disabled): the new untrusted input is player NAMES. XSS-safe in depth — every name
  renders via `textContent`, never `innerHTML` (board:105); `gameId` stays slug-guarded; scores
  strictly `/^\d+$/`-validated. The ONE residual is the read-side name-character asymmetry (the
  non-blocking finding) — real but textContent-safe and `=`-only in practice. Confirmed by a raw-cookie
  probe. [VERIFIED — highscoreBoard.ts:105, highscore.ts:240-241/272-285]
- **[SIMPLE]** (disabled): no over-engineering; the rework is minimal (one comparator + slice, one
  regex-class widen, one `readonly`, and test hardening). No dead code, no speculative abstraction.
  [VERIFIED]
- **[RULE]** (rule-checker ENABLED): 19 rules × instances checked; ONE finding — the decodeRows
  name-sanitization asymmetry (rule #10 input validation / #13 rework-regression, HIGH confidence it
  EXISTS, MEDIUM impact), confirmed non-blocking and routed to a follow-up. All ADDITIONAL_RULES pass
  (core/shell boundary, registry single-source, fail-soft, score-wording-one-place, `.js`-extension
  N/A — no new relative imports, /highscore purity, textContent-not-innerHTML).

### Rule Compliance (lang-review typescript.md — deltas from round 0)

- **#2 generics/readonly:** now fully compliant — the round-0 options-bag `readonly` nit is closed.
- **#8 test quality:** now compliant — the round-0 AC-6 vacuous guard is fixed and mutation-proven.
- **#10 input validation:** ONE gap — `decodeRows` does not sanitize the name characters on read
  (non-blocking finding). All other boundaries validate (score `/^\d+$/`, `JSON.parse` via type
  predicate, `isValidGameId` slug guard, `parseTable` filtered).
- **#13 fix-regressions:** `164717a` is a clean fix. `bf1e2f9`'s sort is correct; its control-char
  strip landed write-side only, leaving the read-side asymmetry (the non-blocking finding) — noted,
  not a NEW break (pre-existing).
- All other rules (#1,#3,#4,#5,#6,#7,#9,#11,#12) compliant/N-A as in round 0, re-checked against the
  rework diff.

### Devil's Advocate

Argue this is still broken. First, the teardown I just cleared: is `getTimerCount()` a real pin or
another tautology? I proved it — a no-op `stop()` turns all three RED, so the guard bites; and the
`toBe(1)` before `stop()` would also catch a double-arm. That failure mode is closed. Next, the
read-side name gap: a sibling subdomain writes `arcade-hi-tempest=<script>alert(1)</script>:9000`.
Does it pop? No — the board sets it via `textContent`, so the browser renders the literal string,
never parses markup; I re-verified line 105. Could the unsanitized name forge a second cookie or a
ladder row? No — the decoded name is display-only and never re-encoded; `encodeRows` (the only
writer) sanitizes, and `;`/`,` can't even reach `decodeRows` (they're consumed as cookie/pair
delimiters upstream). So `=` in a displayed name is the whole blast radius: cosmetic, self-inflicted,
on input the transport already trusts by design. Could a giant hostile cookie DoS the sort? The
browser caps a cookie at 4096 B (~1000 pairs); sorting that is sub-millisecond. Could `readTopScore`
now mis-report after the sort? No — row 0 is the true max post-sort, which is strictly better than
round 0's first-listed. Empty registry still throws at `render()`, but the registry is never empty
(precondition). A name of pure delimiters sanitizes to `""` on write and is dropped; `score: 0.5` or
`1e999` is rejected by `isPublishableScore`/`parseTopScore` on both sides. The fail-soft envelope
holds. The one honest defect — the read path doesn't keep the "re-validated on the way back" promise
for name characters — is real, but textContent-safe and non-blocking, and it pre-dates this rework.
Nothing here meets the Critical/High bar. The blocker that sent this back is genuinely fixed.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story. Carry forward: (1) the non-blocking
decodeRows name-sanitization follow-up, and (2) the mandatory `@arcade/shared` release + lobby repin
finish sequence (package.json still on v0.13.1).

## Reviewer Assessment — round-trip 0 (REJECTED, SUPERSEDED)

_Archived. The blocking AC-6 finding below was fixed in the rework and re-verified (mutation-proven);
see the authoritative **round-trip 1 APPROVED** assessment above. Kept for history._

**Verdict:** REJECTED (superseded)

**Summary:** The implementation is functionally correct and unusually well-crafted — all six ACs
are *delivered*, 640/640 tests green, both builds clean, injection-safe, fail-soft, registry-driven,
and AC-1's ADR amendment is complete and well-argued. It is rejected on ONE issue: **AC-6's
timer-teardown coverage is vacuous (mutation-proven)** — a stated acceptance criterion with zero
effective verification. Per the house verification-integrity rule (lang-review #8 test quality; the
tp1-10 precedent), a correct implementation behind a lying guard is not done. The fix is a
test-hardening in TEA's domain, so this routes back to RED.

**Data flow traced:** hostile cookie `arcade-hi-tempest` → `readSummaryCookie` (exact-name match)
→ `decodeRows` (drops non-`name:score` pairs, caps at 5) → `getTopScores` → board `drawLadder` →
`name.textContent = row.name`. Safe: names are sanitized on write, re-validated on read, and
rendered as text, never markup (no XSS). The one gap is ORDER, not safety (see MEDIUM below).

### Blocking findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][TEST] | AC-6 (timer teardown) has NO effective test coverage — **mutation-proven**: gutting `stop()` to a no-op leaves all 16 board tests green. The "stops rotating" test advances `INTERVAL × 5` with exactly 5 games, so the index wraps `1→2→3→4→0→1` back to the same game whether or not the timer was cleared; the other two AC-6 tests only assert `not.toThrow()`, which holds for a detached-but-alive node and a double no-op. A future teardown regression (leaked interval, detached-DOM writes) would ship green-forever. | `lobby/tests/highscore-board.test.ts:245-269` | Assert teardown DIRECTLY, independent of cycle-length arithmetic: after `stop()`, `expect(vi.getTimerCount()).toBe(0)`; **or** advance a NON-multiple of `GAMES.length` (e.g. one interval) and assert the active game did NOT advance; **or** spy `clearInterval`. |

### Non-blocking findings (recommend folding into the rework; not required to lift the reject)

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM][RULE][DOC] | `decodeRows` does not re-sort rows read from an untrusted cookie, but `readTopScores`' JSDoc promises "highest first". `topRowsOf` sorts on WRITE, so our own cookies are always ordered; a hand-edited/hostile cookie (`AAA:100,BBB:99999`) renders out of order, and `readTopScore` returns `rows[0]`=100 as "top". Cosmetic/self-inflicted (graffiti-tier per the ADR's own risk table) — a doc-vs-read-path gap, not a security hole. | `arcade-shared/src/highscore.ts:265-278` | One line: `rows.sort((a,b) => b.score - a.score)` before the cap in `decodeRows` (or in `readTopScores`), plus a test seeding a manually out-of-order cookie. Makes the read path honour its documented contract. |
| [LOW][TYPE] | `mountHighScoreBoard`'s `options: { intervalMs?: number }` field is not `readonly`, unlike sibling `LayoutOptions`/`EscOverlayOptions` in arcade-shared. No functional impact. | `lobby/src/shell/highscoreBoard.ts:56` | `options: { readonly intervalMs?: number }`. |
| [LOW][SEC] | `sanitizeName` strips `;=,:` but not control/newline chars. Low impact — a `document.cookie` JS write (not an HTTP header), so no CRLF/header-injection vector; a malformed write fails soft. | `arcade-shared/src/highscore.ts:239` | Optional: extend the strip class to control chars for completeness. |

### Finish-phase blocker (not a code defect — flagged so SM does not miss it)

- `lobby/package.json` is still pinned to `@arcade/shared#v0.13.1`, which predates this widening.
  `storage.ts` imports `readTopScores`/`PUBLISHED_SUMMARY_DEPTH`/`TopScoreRow`, absent from v0.13.1 —
  a fresh `npm ci` / lobby CI would fail `tsc`. It type-checks locally only because
  `node_modules/@arcade/shared` is a locally-overlaid widened build. This is the KNOWN, documented
  finish sequence (release arcade-shared past `df34fd0` → repin lobby to the new tag), per Dev's note
  + the SH2-8/18/22 memory. **Must complete before the lobby's own CI can pass.** Not a reason this
  review rejects — recorded for SM at finish.

### Observations by dispatch domain (7 subagents disabled → assessed by hand)

- **[EDGE]** (edge-hunter disabled): `mountHighScoreBoard([], …)` would throw at `render()`
  (`games[0]` undefined) — but the registry guarantees ≥1 game and the board is only ever handed
  `GAMES` or a ≥2-game test list, so this is a documented precondition, not a live risk. `getRows`
  returning >5 rows would render >5 — but every real source (`decodeRows`/`topRowsOf`) caps at
  `PUBLISHED_SUMMARY_DEPTH`, so the board correctly trusts one source of truth for the cap.
  `intervalMs: 0` is respected via `??` (rule #4) — pathological but the caller's explicit choice.
  No blocking edge.
- **[SILENT]** (silent-failure-hunter disabled): every `catch{}` in `highscore.ts` is an INTENTIONAL,
  commented fail-soft (publish swallow, `getStorage`/`getDocument`/`readSummaryCookie` guards,
  `publishTop` `console.warn`) — the module's whole contract is "degrade to NO SCORE, never throw,"
  verified by the fail-soft suites. No improper swallow. The board has nothing that can fail (pure
  DOM writes). [VERIFIED — highscore.ts:344-368, 379-385, 474-482]
- **[TEST]** (test-analyzer disabled): the blocking AC-6 finding above is mine, mutation-proven.
  Otherwise the suites are strong: the summary suite pins the depth constant AND the behaviour
  independently (highscore-summary.test.ts:128-131); the registry-driven test mutation-catches a
  hardcoded list (custom 2-game list, highscore-board.test.ts:180); the integration test drives a
  REAL `pageshow{persisted:true}` through the real bootstrap; the `score-cookie` migration preserves
  all mechanics coverage and the dropped test is justified (the scalar-only decline-vs-clear
  distinction is meaningless at the rows transport — the drop guarantee moved to `topRowsOf` +
  `highscore-summary.test.ts`).
- **[DOC]** (comment-analyzer disabled): comments are accurate and unusually rich, EXCEPT the
  `readTopScores` JSDoc "highest first" claim, which the read path does not enforce against untrusted
  input (folded into the [MEDIUM] finding).
- **[TYPE]** (type-design disabled): types are sound — `TopScoreRow`/`HighScoreRow` are
  structurally-identical-but-separate BY DESIGN (the board must not hard-depend on a shared type that
  only lands at repin; documented at highscoreBoard.ts:23 and the board test). `import type` correct
  throughout. Only nit: the non-`readonly` options bag ([LOW]).
- **[SEC]** (security disabled): the new untrusted input is player NAMES. Defended in depth —
  `sanitizeName` strips cookie delimiters on write, `decodeRows` re-validates on read, and the board
  renders every name via `textContent` (never `innerHTML`), so a hostile name can neither inject a
  cookie attribute NOR become DOM markup (no XSS). `gameId` stays slug-guarded. Only residual: the
  control-char strip nit ([LOW]). [VERIFIED — highscore.ts:239-241, highscoreBoard.ts:105]
- **[SIMPLE]** (simplifier disabled): no over-engineering — the board is ~140 lines of minimal DOM,
  the transport is a narrow interface, no dead code, no speculative abstraction. The one deliberate
  duplication (`HighScoreRow` vs `TopScoreRow`) is justified by the shell-boundary/repin timing.
  [VERIFIED]
- **[RULE]** (rule-checker ENABLED): 19 rules × 73 instances checked; findings are the [MEDIUM]
  decodeRows ordering + the two [LOW] nits above + the finish-note pin. No high-confidence hard
  violation. All ADDITIONAL_RULES (core/shell boundary, registry-single-source, fail-soft, score-copy
  one-place, `.js`-extension N/A, /highscore purity) pass.

### Rule Compliance (lang-review typescript.md, exhaustive)

- **#1 type-safety escapes:** compliant — no `as any`/`@ts-ignore`; the one `as unknown as string`
  (highscore-summary.test.ts:202) is a deliberate poisoned-value cast for a negative test.
- **#2 generics/readonly:** all array/object params `readonly` (`topRowsOf`, `encodeRows`, `publish`,
  `mountHighScoreBoard.games`/`getRows`); one nit — the options-bag field not `readonly` ([LOW]).
- **#3 enums:** N/A (none added).
- **#4 null/undefined:** compliant — `??` for `intervalMs` and every default; explicit `=== null` in
  `formatScoreLine`/`readTopScore`; no `||`-on-nullable anywhere in the diff.
- **#5 module/`.js` extension:** N/A for `highscore.ts` (no relative imports); lobby uses `bundler`
  resolution + its own extension-less convention; `import type` correct everywhere.
- **#6 React/JSX:** N/A.
- **#7 async:** N/A (no async besides the integration test's dynamic `import()`).
- **#8 test quality:** VIOLATION — the AC-6 vacuous guard (blocking). Otherwise compliant.
- **#9 build/config:** N/A (no config touched).
- **#10 input validation:** compliant — untrusted cookie parsed through `/^\d+$/` schema, names
  sanitized, `JSON.parse` filtered through a type-predicate validator, never `as T`.
- **#11 error handling:** compliant — `catch{}` bindings omitted (no `catch(e:any)`), intentional
  fail-soft.
- **#12 perf/bundle:** compliant — ~4.5s DOM diff, not a hot path.
- **#13 fix-regressions:** N/A (no prior-review fixes in this diff).

### Devil's Advocate

Argue this code is broken. Start with the player who edits their own cookie:
`arcade-hi-tempest=ZZZ:1,YYY:99999999`. The board renders `ZZZ 1` above `YYY 99,999,999`, and the
tile (`readTopScore`) proudly reports `1` as the high score, because `decodeRows` trusts cookie
order and `rows[0]` is assumed to be the max. That is the cabinet displaying a demonstrably-false
ranking. It is self-inflicted graffiti — but the read path DOCUMENTS a "highest first" guarantee it
does not keep, so the MEDIUM finding is real, not pedantry. Next, the stressed timer: the lobby is an
attract-mode page that may sit open for hours. `stop()` is never called in production (`main.ts`
mounts the board for the page lifetime and never tears it down), so the ONLY thing exercising
teardown is the test suite — and I have PROVEN that suite verifies nothing. If a future refactor
makes `stop()` async, swaps `setInterval` for a chained `setTimeout` and forgets the clear, or lets
`refresh()` accidentally re-arm a second interval, NOTHING in CI turns red. The board would fire
forever, or twice, and the first sign would be a user's fan spinning up. That is exactly the latent
defect AC-6 was written to prevent, and it is unguarded today. Now the empty registry:
`mountHighScoreBoard(panel, [], …)` throws synchronously at `render()` — but the registry is never
empty, so a precondition, not a live bug (worth a one-line guard someday). A name that is only
delimiters, `";;;"`? `sanitizeName` reduces it to `""` and `encodeRows` drops the empty-name row —
correct, no zombie. A 4096-byte name? `encodeRows` would build a giant value; the browser rejects the
oversized write and it fails soft to NO SCORE — ugly but safe, and real names are 3 chars. `score:
0.5`? `isPublishableScore` requires an integer — dropped. `Number('1e999')` → Infinity? `Number.isFinite`
rejects it on encode AND decode. The fail-soft envelope is genuinely airtight. The verdict stands on
the one thing that is NOT: AC-6 is delivered in code and unverified in test, and this house does not
ship unverified acceptance criteria.

**Handoff:** Back to Han Solo (TEA) to harden the AC-6 teardown test (testable fix — RED phase). The
MEDIUM `decodeRows` ordering fix and the two LOW nits are recommended to fold into the same rework;
the `package.json` repin remains an SM finish step.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): widening the summary to rows changes the published cookie VALUE format, so `arcade-shared/tests/highscore-publish.test.ts` (~10 bare-number assertions + a `spyTransport` on the old `publish(gameId, number)` signature) must be migrated to the rows shape during GREEN — expected churn, not a regression. Affects `arcade-shared/tests/highscore-publish.test.ts` (and `src/highscore.ts` transport). *Found by TEA during test design.*
- **Gap** (non-blocking): AC-1's WRITTEN ADR amendment lives in the orchestrator repo (`docs/adr/0004-cross-origin-high-scores.md`), outside both code repos' CI checkouts — Dev must author it (new cookie shape, size vs 4096 B, why widening beats the alternatives) and the Reviewer must verify the prose; no executable test enforces it (a cross-repo file-read would pass locally and fail in CI). Affects `docs/adr/0004-cross-origin-high-scores.md`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the lobby needs `getTopScores(gameId): TopScoreRow[]` in `src/shell/storage.ts` wrapping the new `readTopScores`, plus a `@arcade/shared` repin to the new tag — the full consumption loop (widen → publish → bump → reinstall → repin) before the board can read rows. Affects `lobby/src/shell/storage.ts`, `lobby/package.json`. *Found by TEA during test design.*
- **Question** (non-blocking): per the arcade-shared ESM Rule #5, any NEW relative import added to `src/highscore.ts` must carry the `.js` extension (tsc bundler resolution compiles without it; the shipped native-ESM artifact then breaks). `TopScoreRow` is same-file so this likely does not apply — flagged per the recurring landmine. Affects `arcade-shared/src/highscore.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking, RESOLVED in green): TEA's Conflict finding flagged only `highscore-publish.test.ts` for the rows migration, but **`arcade-shared/tests/score-cookie.test.ts`** (the original lb2-2 transport suite, ~50 tests, in the green baseline) is *equally* coupled to the bare-number signature — it calls `cookieTopScoreTransport.publish('tempest', 124500)` and asserts `arcade-hi-tempest === '124500'`, which is **irreconcilable** with the summary tests requiring that *same* cookie carry rows. Widening the transport necessarily broke it, so it had to migrate too (forced format churn, same category TEA authorized). I migrated it in-place: scalars wrapped in one-row ladders, `null`→`[]`, number/null reads routed through `readTopScore` (row 0 + legacy fallback) — preserving **all** cross-origin scope / injection / fail-soft / prefix-safety coverage. **Dropped one now-redundant test** (`a bogus score is NOT treated as "no score" — leaves the cookie untouched`): its decline-vs-clear distinction lived only at the number transport; the rows transport is fed pre-filtered rows by the factory, so an all-unpublishable ladder is indistinguishable from an empty one and both clear (the dropped-row guarantee now lives at the factory boundary, covered by `highscore-summary.test.ts`). Net: arcade-shared **490 green** (RED was 477 pass / 14 fail → +14 fixed, −1 dropped test = 490). Affects `arcade-shared/tests/score-cookie.test.ts`. *Found by Dev during green.*
- **Improvement** (non-blocking, informational for finish): during local visual verification Vite served a **stale pre-bundled `@arcade/shared` v0.13.1** from its `.vite` optimize cache (predating the locally-overlaid widened build), so `main.ts` failed to import `readTopScores` until a `--force` re-optimize. Purely a dev-server cache artifact of developing against an overlaid `node_modules` — it will NOT recur at the finish-time repin (a fresh `npm install @arcade/shared@github:…#<tag>` / `npm ci` re-bundles). Flagged so a stale-cache blank is not misread as a code regression. Affects `lobby` local dev only. *Found by Dev during green.*
- **Note** (non-blocking): the `@arcade/shared` pin in `lobby/package.json` is deliberately left at `v0.13.1`. The repin to the new tag (next is **v0.16.0**, current library head is v0.15.0) is a **finish step** after the library releases — `npm test` + `tsc` are green locally against a built-and-overlaid widened `dist/`. Standard SH2-8/18/22 sequence. *Found by Dev during green.*

### Reviewer (code review)
- **Gap** (blocking): AC-6 (timer teardown) has no effective test coverage — mutation-proven vacuous (gutting `stop()` to a no-op leaves all 16 board tests green, because `INTERVAL × 5` wraps the 5-game index back to its start and the other two tests only assert `not.toThrow()`). Affects `lobby/tests/highscore-board.test.ts` (harden AC-6: `vi.getTimerCount()===0` after `stop()`, or advance a non-multiple of `GAMES.length`, or spy `clearInterval`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `readTopScores`' documented "highest first" ordering is enforced only on the write side (`topRowsOf` sorts); `decodeRows` returns untrusted-cookie rows in cookie order, so a hand-edited/out-of-order cookie renders unsorted and `readTopScore` mis-reports the top. Affects `arcade-shared/src/highscore.ts` (sort in `decodeRows`/`readTopScores` + a test with an out-of-order cookie). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `mountHighScoreBoard`'s `options` field is not `readonly`, unlike sibling `LayoutOptions`/`EscOverlayOptions`; and `sanitizeName` omits control/newline chars from its strip class (low impact — a `document.cookie` write, not an HTTP header). Affects `lobby/src/shell/highscoreBoard.ts`, `arcade-shared/src/highscore.ts`. *Found by Reviewer during code review.*
- **Gap** (blocking at finish, not now): `lobby/package.json` still pins `@arcade/shared#v0.13.1` (pre-widening); a fresh `npm ci`/CI would fail `tsc` on `storage.ts`'s imports (masked locally by the overlay). SM must release arcade-shared past `df34fd0` and repin lobby before the lobby's CI passes — the known SH2-8/18/22 finish sequence, not a code defect. Affects `lobby/package.json`, `lobby/package-lock.json`. *Found by Reviewer during code review.*

#### Reviewer (re-review, round-trip 1)
- **Gap** (non-blocking): `decodeRows` (the READ side of the untrusted-cookie boundary) does not re-sanitize name characters, while `sanitizeName` runs only on the WRITE side (`encodeRows`); a raw/hand-edited cookie (`A=B:9000`) decodes to name `A=B` untouched, and the highscore.ts:232-234 comment ("re-validated on the way back") overpromises. Confirmed by code-trace + probe; textContent-safe (no XSS), no re-encode path, `=`-only in practice — cosmetic/self-inflicted, pre-existing since round 0. Affects `arcade-shared/src/highscore.ts:272-285` (apply `sanitizeName` in `decodeRows`, correct the comment, add a raw-cookie decode test). *Found by Reviewer during re-review.*
- **Note** (informational): the round-0 blocking AC-6 finding and its three folded-in non-blocking findings (decodeRows ordering, control-char strip, `readonly` options) are all RESOLVED and re-verified (mutation-proven where testable). *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-1's written ADR amendment is not covered by an executable test**
  - Spec source: context-story-lb2-8.md, AC-1
  - Spec text: "ADR-0004 is amended (or superseded) in writing … states the new cookie shape, its size against the 4096 B cap, and why widening beats the alternatives."
  - Implementation: the behavioural half (rows, not a number) is pinned exhaustively in `highscore-summary.test.ts`; the written-doc half is left to the Reviewer, with no file-read guard.
  - Rationale: ADR-0004 lives in the ORCHESTRATOR repo (`docs/adr/`), outside both code repos' CI checkouts — a file-read test would pass locally and fail on GitHub (the "green on CI, wrong in the wild" trap `score.ts` warns about).
  - Severity: minor
  - Forward impact: Dev must write the amendment in `docs/adr/0004-*.md`; the Reviewer verifies the prose.
- **The board's code API + DOM hooks are pinned by TEA**
  - Spec source: context-story-lb2-8.md, AC-2/AC-3/AC-6; the Arcade Lobby design
  - Spec text: describes a panel, a top-five ladder, a pip row, and a ~4.5 s rotation — but no code surface.
  - Implementation: pinned `mountHighScoreBoard(panel, games, getRows, {intervalMs}) → {refresh, stop}`, DOM hooks (`[data-pip]`/`.is-active`/`.hs-title`/`.hs-ladder`/`.hs-row`, inline `--glow`), and `#high-scores` as the mount container.
  - Rationale: RED needs a concrete surface; chose hooks consistent with `tiles.ts` (registry-sourced, inline `--glow`).
  - Severity: minor
  - Forward impact: Dev may rename hooks with a logged deviation; the integration test hard-codes `#high-scores` as the mount point.
- **Tests assume ONE widened cookie, not a second parallel rows cookie**
  - Spec source: context-story-lb2-8.md, AC-1
  - Spec text: "carries a top-N list of name+score rows rather than a single number"
  - Implementation: the single summary cookie changes format to carry rows; the tile's top score derives from row 0 (plus a legacy bare-number fallback). No second cookie is added.
  - Rationale: matches AC's "rather than"; avoids the redundant derived duplication this codebase explicitly rejects ("the cookie is DERIVED … always disposable").
  - Severity: minor
  - Forward impact: existing `highscore-publish.test.ts` (bare-number assertions + `spyTransport` signature) must migrate to the rows shape during GREEN — expected, not a regression.

### Dev (implementation)
- **The board's `NO SCORES YET` empty state is defined in `core/score.ts`, not the board**
  - Spec source: highscore-board.test.ts DOM contract; lobby source rule `tests/refresh-rules.test.ts`
  - Spec text (rule): "formats the score line in exactly one place … `NO SCORE` … belong to core/score.ts and nowhere else."
  - Implementation: added `export const NO_SCORES_YET = 'NO SCORES YET'` to `src/core/score.ts`; the board imports it.
  - Rationale: the source guard `/NO SCORE|HI·/` forbids that substring anywhere but `core/score.ts`, and **`"NO SCORES YET"` contains `"NO SCORE"`** — defining it in the board would fail the existing rule. Keeping it in `core/score.ts` (the one place allowed to word what the cabinet says about a record) satisfies the rule and the "one place" principle.
  - Severity: minor
  - Forward impact: none — the board's rendered text is still exactly `NO SCORES YET` (AC-4).
- **`score-cookie.test.ts` migrated to rows + one redundant test dropped**
  - Spec source: TEA Conflict finding (Delivery Findings); context-story-lb2-8.md AC-1
  - Spec text: TEA scoped the rows migration to `highscore-publish.test.ts` only.
  - Implementation: also migrated `score-cookie.test.ts` (irreconcilable with the rows format — see the Dev Conflict finding), dropping the now-meaningless "bogus score is NOT treated as no-score" test.
  - Rationale: the transport signature change forced it; the dropped test asserted a decline-vs-clear distinction that no longer exists at the rows transport. All mechanics coverage preserved.
  - Severity: minor
  - Forward impact: Reviewer verifies the migrated suite preserves the cross-origin scope/injection/fail-soft coverage and that the drop is justified (it is: the guarantee moved to the factory boundary in `highscore-summary.test.ts`).
- **Board code API + DOM hooks implemented exactly as TEA pinned**
  - Spec source: TEA Design Deviation "The board's code API + DOM hooks are pinned by TEA"
  - Implementation: `mountHighScoreBoard(panel, games, getRows, {intervalMs}) → {refresh, stop}` with `[data-pip]` / `.is-active` / `.hs-title` / `.hs-ladder` / `.hs-row` / inline `--glow`, mounted at `#high-scores`. Added `.hs-name` / `.hs-score` / `.hs-empty` / `.hs-pips` / `.hs-pip` for styling only. No hook renames.
  - Severity: none (conformance, logged for completeness)
  - Forward impact: none.
- **Rework (round-trip 1): Reviewer-finding fixes are conformance, not spec deviations**
  - Spec source: Reviewer Assessment (AC-6 vacuous guard; decodeRows ordering; two nits)
  - Spec text: AC-6 "the rotation timer is cleaned up on teardown"; `readTopScores` JSDoc "highest first"
  - Implementation: hardened the AC-6 teardown tests (`vi.getTimerCount()`); added a read-side sort in `decodeRows` mirroring `topRowsOf`; stripped control chars in `sanitizeName`; marked the board `options` field `readonly`
  - Rationale: all four implement the already-agreed ACs / documented contract MORE faithfully — no divergence from spec, no new behaviour beyond what AC-6 and the "highest first" contract already required
  - Severity: none (conformance / hardening)
  - Forward impact: none

### Reviewer (audit)

Every logged deviation stamped ACCEPTED or FLAGGED:

- **TEA — "AC-1's written ADR amendment is not covered by an executable test"** → ✓ ACCEPTED by
  Reviewer: sound. A cross-repo ADR (orchestrator `docs/adr/`) cannot be CI-tested from the code
  repos without the "green-local, red-on-CI" trap; the prose is the Reviewer's to verify, and I did —
  AC-1's amendment states the new cookie shape, size vs the 4096 B cap (<200 B), and why widening
  beats all three alternatives. Satisfied.
- **TEA — "The board's code API + DOM hooks are pinned by TEA"** → ✓ ACCEPTED: the surface
  (`mountHighScoreBoard(...) → {refresh, stop}`, `[data-pip]`/`.hs-*`, inline `--glow`, `#high-scores`)
  is consistent with `tiles.ts` and registry-sourced. Reasonable RED-phase pinning.
- **TEA — "Tests assume ONE widened cookie, not a second parallel rows cookie"** → ✓ ACCEPTED:
  matches AC-1's "rather than a single number," and the ADR amendment explicitly rejects a second
  parallel cookie (drift/redundancy). No duplicated derived state.
- **Dev — "NO SCORES YET empty state defined in core/score.ts, not the board"** → ✓ ACCEPTED: correct
  and in fact required — `"NO SCORES YET"` contains `"NO SCORE"`, which the `/NO SCORE|HI·/` source
  guard forbids everywhere but `core/score.ts` (confirmed against `tests/refresh-rules.test.ts`; the
  guard excludes exactly that file). The board's rendered text is still exactly `NO SCORES YET`.
- **Dev — "score-cookie.test.ts migrated to rows + one redundant test dropped"** → ✓ ACCEPTED: the
  migration preserves every mechanics assertion (scope, injection, clear, per-game isolation, 14
  parse-traps, fail-soft), and the dropped "bogus number is declined, not cleared" test is justified —
  that distinction only existed at the scalar transport; the rows transport is fed pre-filtered rows
  by the factory, so all-unpublishable is indistinguishable from empty and both clear (the
  drop-guarantee moved to `topRowsOf` + `highscore-summary.test.ts`, which I verified covers it).
- **Dev — "Board code API + DOM hooks implemented exactly as TEA pinned"** → ✓ ACCEPTED: conformance,
  no hook renames; the added `.hs-name`/`.hs-score`/`.hs-empty`/`.hs-pips`/`.hs-pip` are styling-only.

No UNDOCUMENTED spec deviations found. The AC-6 test-coverage gap and the `decodeRows` ordering gap
are test-quality / doc-vs-impl findings (recorded in the Reviewer Assessment + Delivery Findings),
not divergences from the story's ACs.

**Round-trip 1 (re-review):**

- **Dev — "Rework (round-trip 1): Reviewer-finding fixes are conformance, not spec deviations"** →
  ✓ ACCEPTED by Reviewer: correct. All four rework changes (AC-6 test hardening, read-side sort,
  control-char strip, `readonly` options) implement the already-agreed ACs and the documented
  "highest first" contract MORE faithfully — no new behaviour, no divergence from spec. Re-verified:
  the AC-6 tests and the sort are mutation-proven non-vacuous; the two nits are confirmed in the diff.
- One UNDOCUMENTED read-side gap surfaced this round (not a spec deviation): `decodeRows` does not
  re-sanitize name characters, so the write side's control-char strip is asymmetric with the read
  side, and the "re-validated on the way back" comment overpromises. Recorded as a non-blocking
  finding + Delivery Finding, not an AC divergence.