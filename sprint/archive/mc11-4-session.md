---
story_id: "mc11-4"
jira_key: "mc11-4"
epic: "mc11"
workflow: "tdd"
---
# Story mc11-4: Retire the redundant dead twins

## Story Details
- **ID:** mc11-4
- **Jira Key:** mc11-4
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/mc11-4-retire-dead-twins
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T17:49:04Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T17:09:09+00:00 | 2026-08-16T17:10:33Z | 1m 24s |
| red | 2026-08-16T17:10:33Z | 2026-08-16T17:17:51Z | 7m 18s |
| green | 2026-08-16T17:17:51Z | 2026-08-16T17:29:28Z | 11m 37s |
| review | 2026-08-16T17:29:28Z | 2026-08-16T17:39:18Z | 9m 50s |
| green | 2026-08-16T17:39:18Z | 2026-08-16T17:41:12Z | 1m 54s |
| review | 2026-08-16T17:41:12Z | 2026-08-16T17:45:16Z | 4m 4s |
| green | 2026-08-16T17:45:16Z | 2026-08-16T17:46:12Z | 56s |
| review | 2026-08-16T17:46:12Z | 2026-08-16T17:49:04Z | 2m 52s |
| finish | 2026-08-16T17:49:04Z | - | - |

## Sm Assessment

**Story:** mc11-4 — retire six redundant dead twins in `plugins/missile-command`. Workflow tdd (phased) → TEA next for RED.

**Premise verified against the current tree (2026-08-16) — it HOLDS.** All six named symbols exist at their cited locations, all six are genuinely runtime-dead (no `src/` caller), and every named supersessor is confirmed live in production:
- `mainline` (state.ts:92) + `stateCode` (state.ts:77) → live reducer is `stepGame` (game.ts:344). `stateCode` is called only by `mainline` itself.
- `applyPointerMotion` (input.ts:42) → `placeCursor` (cursor.ts:91, wired main.ts:89).
- `launchFromKey` (input.ts:69) → `fireFromKey` (input.ts:83, wired input.ts:144).
- `cruiseKillPoints` (score.ts:61) → live scoring via `scoreKills` + `CRUISE_SCORE_MULT`.
- `computeLetterbox` (viewport.ts:53) → `applyLetterbox` (viewport.ts:75, wired main.ts:37).
- `INITIAL_ATTRACT` (state.ts:121, fully dead) → `INITIAL_PHASE` (state.ts:120, wired game.ts:180).

**Critical scoping nuance for TEA/Dev (this is NOT a uniform delete-all-six):** `applyPointerMotion` is already pinned-as-retained by an existing claim test — `tests/place-cursor.test.ts:206` asserts `/export function applyPointerMotion\b/` with the comment "The story keeps it even though main.ts stops calling it." Per the story's own rule ("Keep any symbol still asserted by a claim test; only its dead runtime role goes"), that symbol must NOT be deleted; its runtime role is already dead. Each twin needs a per-symbol call — delete the symbol, or keep it and only retire its dead runtime role — driven by whether a claim test still asserts it. The measured table (with each twin's referencing tests classified as claim vs. behavioral) is in `sprint/context/context-story-mc11-4.md`.

**Board:** Sibling probe clean for mc11-4 (only a-2 owns jt12-1). Merge gate was blocked by PR #470 (a-2's jt12-1 finish ceremony); it merged (concurrently with my merge) and develop is synced. Story stamped `in_progress`, branch `feat/mc11-4-retire-dead-twins` pushed. ACs copied verbatim from epic YAML.

## Tea Assessment

**RED committed:** `92777f0b` — `plugins/missile-command/tests/mc11-4-retire-dead-twins.test.ts`.
Baseline: **6 failed, 1380 passed** (only the new file is red). Lint (`tsc --noEmit`) clean.

**Test design — both directions of the story rule ("keep any symbol a CLAIM test asserts; only its dead runtime role goes"):**
- **DELETE direction (6 failing → Dev turns green):** for each of `launchFromKey` (shell/input.ts:69), `cruiseKillPoints` (core/score.ts:61), `computeLetterbox` (shell/viewport.ts:53) — two assertions each: (a) `export function <name>` no longer declared in its home file, (b) no residual `\b<name>\b` reference anywhere under `src/` (retired everywhere, not just at home). All six are genuinely dead (zero production callers, confirmed by grep) and were superseded inline (fireFromKey / scoreKills+CRUISE_SCORE_MULT / applyLetterbox), so the epic's "superseded inline" ⇒ deletion, not routing.
- **KEEP direction (4 green guards):** `applyPointerMotion`, `mainline`, `stateCode`, `INITIAL_ATTRACT` remain exported — each pinned by an existing claim test (place-cursor.test.ts:206 / state-mainline.test.ts surface[]). These pass now and REDDEN if Dev over-deletes.

Source-text scan (fleet idiom: place-cursor.test.ts, state-mainline.test.ts); the file imports NONE of the modules under retirement, so it cannot depend on code being removed.

**GREEN work for Loki (Dev) — the coupled test-pruning is where the judgment is:**
1. Delete the three `export function`s above. That alone turns all 6 red tests green.
2. But three BEHAVIOURAL test files reference the deleted symbols and will go red on import — prune them **surgically** (keep the coverage of the LIVE path, remove only the dead-twin bits):
   - `tests/fire.test.ts` — its loader guard (`typeof mod.launchFromKey !== 'function'` throw, ~:87) throws once the export is gone. Remove the `launchFromKey` loader + its `it(...)` cases; **KEEP** `fireKeyToBase`/`fireFromKey` coverage.
   - `tests/fire-ammo.test.ts` — only a comment mentions `launchFromKey` (~:13); tidy it, no assertion depends on it.
   - `tests/cruise.test.ts` — remove "Loader 3: cruiseKillPoints" + its cases; **KEEP** loaders 1&2 (the ×5 relation via `scoreKills`/`CRUISE_SCORE_MULT`). Do **NOT** delete `CRUISE_SCORE_MULT` (claim `MC-CRUISE-SCORE`, still used by the live path).
   - `tests/mc10-5-letterbox-aspect.test.ts` — this file is largely ABOUT `computeLetterbox`. Preferred: **re-point** its aspect-math assertions at `applyLetterbox` (via a mock CanvasLike) or the shared `letterbox()` so the 256:222 field-aspect fidelity stays guarded; deleting the file outright loses that coverage. This is the one real Dev/Reviewer judgment call — flag whichever you choose in Design Deviations.
3. Do **NOT** touch the four keep-symbols (green guards protect them). Do **NOT** remove any cited constant — REV-01 / `purity.test.ts` must stay green.
4. Title offers "delete OR route"; epic + AC direct DELETE. If you route any symbol instead, log a Design Deviation.

**Rule coverage:** TS lang-review — no new `src/core` constants added, so no citation/uncited-literal surface introduced; the citation scanner (// vs /** */) and purity are unaffected by pure deletion. The `.js` ESM-extension rule is N/A (this file imports no local modules). Self-check: every test carries a meaningful assertion (`.toBe(false)`/`.toBe(true)` on a source-text predicate with a descriptive message) — no `let _ =`, no vacuous `is*` on always-null.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev / Loki]** Improvement (non-blocking): `MAX_DPR` in `shell/viewport.ts` is now referenced only by `mc10-5-letterbox-aspect.test.ts` (its sole prod consumer, `computeLetterbox`, is gone). It remains a valid public export and the test asserts `MAX_DPR===2`, so it is NOT a dead twin by this story's rule — left in place. Flagging only in case a future audit wants to inline it into `applyLetterbox`.

### Reviewer (code review)

- **Improvement** (non-blocking): Three stale/misleading comments must be corrected (round 1 REJECT — doc-only). See the Reviewer Assessment table for file:line. *Found by Reviewer during code review.*
- No functional, security, type, or rule findings — `reviewer-preflight` clean, `reviewer-rule-checker` clean (0/30 rules + 0/3 arcade rules, mutation-tested), `reviewer-test-analyzer` confirmed all three re-points non-vacuous.

## Dev Assessment

**GREEN committed:** `d8edecee`. All work landed; full cabinet green (`npx vitest run` **16929 passing**, orchestrator **505/505**, lint clean). The mc11-4 RED file is now **10/10 green**.

**What shipped (per the story rule, exactly the TEA plan):**
- Deleted the three unprotected twins — `launchFromKey` (shell/input.ts), `cruiseKillPoints` (core/score.ts), `computeLetterbox` (shell/viewport.ts) — each had zero production callers and was superseded inline. Also dropped the now-orphaned `type Abm, type Vec` import in input.ts (only `launchFromKey` used them).
- Kept the four claim-pinned symbols untouched: `applyPointerMotion`, `mainline`, `stateCode`, `INITIAL_ATTRACT` (green guards confirm).
- Removed no cited constant: `CRUISE_SCORE_MULT` (claim MC-CRUISE-SCORE) stays; purity + citations green (129/129); REV-01 intact.

**For Heimdall (Reviewer) — where the judgment is, and how to check it fast:**
The only non-mechanical work was PRUNING the behavioural tests that referenced the deleted twins. I re-pointed them onto the LIVE symbols to preserve coverage rather than deleting coverage (per TEA's explicit guidance). Verify each re-point is behaviour-preserving:
- `mc10-5-letterbox-aspect.test.ts`: added a local `fit(w,h,dpr)` = `applyLetterbox(fakeCanvas(), …)` and replaced all 16 `computeLetterbox(...)` calls with it. Both symbols derive dims from the shared `letterbox()` + identical `min(MAX_DPR, rawDpr||1)` DPR math, so the returned `Letterbox` is identical — all aspect/HiDPI/degenerate/cursor-map assertions pass unchanged. **Check:** the fit math, HiDPI cap, and cursor-map coverage are all still exercised (they are — same numbers, live symbol).
- `cruise.test.ts`: the ×5 CMKILL relation now reads `scoreKills(0, CRUISE_SCORE_MULT, wave)` (loaders 1&2 untouched). `cruiseKillPoints(w)` was literally `scoreKills(0, CRUISE_SCORE_MULT, w)`, so 125@w1 / 375@w6 are pinned identically. **Check:** no ×5 coverage lost.
- `fire.test.ts`: dropped the 4 `launchFromKey` behavioural cases (their key→base mapping is covered by the kept `fireKeyToBase` block; the launch primitive by abm.test.ts). Kept a slimmed `fireKeyToBase` spatial test (Z=leftmost/C=rightmost). Re-pointed the proof-of-life composition to the core primitive `launchAbm(BASES[1], CURSOR)` — same fire→fly→blast integration, minus the retired sugar. **Check:** the source-text block still passes (input.ts still imports launchAbm + cites ABMLAU — true, via fireFromKey + the file header).
- `fire-ammo.test.ts`: one stale comment tidied (no assertion touched).

**Note on historical prose:** each of these test files carries a "WHY THIS IS RED" header from its ORIGINAL story (mc1-4 / mc5-3) that names the now-deleted symbol as something Dev builds. Those are accurate history of that story's RED and are outside the changed lines; I left them rather than rewrite each file's origin story. `mc10-5`'s CONTRACT comment had `computeLetterbox(` auto-rewritten to `fit(` by the call re-point — cosmetic, describes the test-local wrapper now.

**Deviation from a literal reading:** the story title offers "delete OR route the live path through them". I chose DELETE for all three (epic: "superseded inline"; AC: "deleted") — routing a redundant twin into the live path would be a pointless behaviour change. Recorded in Design Deviations.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev / Loki] DELETE, not route, for all three unprotected twins.** Spec: the title says "delete OR route the live path through them, per each." Chose delete for `launchFromKey` / `cruiseKillPoints` / `computeLetterbox`. Why: the epic frames them as "redundant dead twins that later stories superseded inline" and the AC says "Symbols not protected by claim tests are deleted"; routing a redundant twin into the live path (which already works via its supersessor) would be a gratuitous behaviour change, not a cleanup.
- **[Dev / Loki] Behavioural tests RE-POINTED onto live symbols, not deleted.** Spec: "other test suites remain green." The literal-minimal path (delete the twin, delete its tests) would have shed real ROM-fidelity coverage. Instead I re-pointed each referencing test onto the live symbol it was sugar over — `fit()`→`applyLetterbox` (mc10-5), `scoreKills`+`CRUISE_SCORE_MULT` (cruise), `launchAbm` (fire proof-of-life) — preserving the aspect/HiDPI/cursor-map, ×5-scoring, and fire→fly→blast coverage. Per TEA's stated preference in the RED assessment.

### Reviewer (audit)

- **[Dev / Loki] DELETE, not route** → ✓ **ACCEPTED by Reviewer (Heimdall):** correct. Epic mc11 explicitly frames these as "redundant dead twins that later stories superseded inline", and I verified the live path independently for each (fireFromKey wired at input.ts:144; `game.ts:598` scores cruise via `scoreKills(…, cruiseKilled * CRUISE_SCORE_MULT, wave)`; applyLetterbox wired at main.ts:37). Routing would be a gratuitous behaviour change on a p3 cleanup.
- **[Dev / Loki] Behavioural tests RE-POINTED, not deleted** → ✓ **ACCEPTED by Reviewer (Heimdall):** sound, and independently verified non-vacuous. The `fit()`→`applyLetterbox` wrapper returns byte-identical dims (same shared `letterbox()` + `resizeToDisplay`'s `Math.floor(css × Math.min(MAX_DPR, rawDpr||1))`, view.ts:171-173) — equivalent for ALL inputs, not just tested points. The cruise re-point asserts the exact formula the live game uses. `reviewer-test-analyzer` and `reviewer-rule-checker` (live mutation test) both corroborate. This PRESERVED coverage that a literal deletion would have shed — better than the minimal path.
- **[Reviewer audit — no UNDOCUMENTED deviations]:** every spec divergence is logged by Dev; the only reviewer-added items are the three stale/misleading comments below, which are doc defects, not spec deviations.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (GREEN: 1383 vitest + 505 orchestrator, lint clean, 0 smells, 0 orphaned imports) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both low-conf) | confirmed 0, dismissed 0, deferred 2 (optional/no-action; re-points independently verified non-vacuous) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (2 high, 1 med) | confirmed 3, dismissed 0 — all DOC/LOW, drive the round-1 REJECT |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (0 violations / 30 TS + 3 arcade rules; live mutation test confirmed the deletion guard reddens) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed (all DOC/LOW), 0 dismissed, 2 deferred (low-conf optional)

## Round 1 Review — Reviewer notes (REJECTED, superseded by the APPROVAL below)

**Verdict:** REJECTED (round 1 — doc-only; routes to green-rework/Dev)

**Why not APPROVE:** the code is clean and independently triple-verified sound (preflight GREEN, rule-checker 0 violations + live mutation test, test-analyzer confirmed every re-point non-vacuous). There are **no Critical/High/Medium** findings. But the diff *introduced* one misleading module-CONTRACT comment and left two test files internally self-contradicting — diff-introduced/worsened misleading docs that should not merge. All fixes are one-line comment edits (green lane).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] `[DOC]` | CONTRACT block lists `fit(windowW, windowH, rawDpr, aspect = TARGET_ASPECT): Letterbox` among `viewport.ts`'s real exports, but `fit` is a test-LOCAL wrapper (defined line ~78), not a module export. My call-rename (perl) blindly rewrote the old `computeLetterbox(...)` CONTRACT line. **Diff-introduced.** | `tests/mc10-5-letterbox-aspect.test.ts:31` | Remove the `fit(...)` line from the module CONTRACT block, or relabel it "(test-local — drives applyLetterbox over a throwaway canvas; NOT a viewport.ts export)". |
| [LOW] `[DOC]` | "WHY THIS IS RED" header still says ``fireKeyToBase`/`launchFromKey` do not exist … yet`` — self-contradicts the same file's updated `FireModule`/`loadFire` (which this diff changed to drop `launchFromKey`). `fireKeyToBase` has shipped since mc1-4; `launchFromKey` is now permanently retired, not "unbuilt". | `tests/fire.test.ts:27-28` | Reword: `fireKeyToBase` is built (mc1-4); `launchFromKey` was retired at mc11-4 (superseded by `fireFromKey`); this file now pins `fireKeyToBase` + the composed fire→flight→blast path. |
| [LOW] `[DOC]` | "WHY THIS IS RED" header lists ``score.ts exports no `cruiseKillPoints` `` as pending RED work; post-mc11-4 it is deliberately retired, and Loader 3 below (updated by this diff) now explains that — leaving the header inconsistent with its own file. | `tests/cruise.test.ts:25-27` | Drop the `cruiseKillPoints` clause or append "(shipped at mc5-3, retired at mc11-4 — see Loader 3)". |

**Dispatch tags:** `[DOC]` — 3 confirmed (above). `[TEST]` — 2 deferred (low-conf, no action: fire.test.ts spatial-composition proof now spans two files but coverage intact via fire-ammo.test.ts; mc11-4 test doc-comment "everywhere" is scoped to src/). `[RULE]` — none (rule-checker clean, mutation-tested). `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` — N/A, subagents disabled via settings; I checked each domain myself against a pure-deletion diff and found nothing (no new branches, no error handling, no types added, no attack surface, no complexity added).

**Data flow traced:** cruise-kill scoring — a blast catches a cruise `Icbm` → `killSputniksInBlasts`/`killIcbmsInBlasts` (game.ts:584-585) → `cruiseKilled = killed.filter(kind==='cruise').length` → `scoreKills(scoreAfterPlanes, cruiseKilled * CRUISE_SCORE_MULT, wave)` (game.ts:598). The retired `cruiseKillPoints` was never on this path (dead), so its deletion changes no runtime behaviour; the cruise.test.ts re-point now pins this exact live formula. Safe.

**Pattern observed:** the re-point-not-delete choice preserves ROM-fidelity coverage (256:222 aspect, ×5 CMKILL, fire→blast) on live symbols — a good pattern, correctly executed.

**Verified (with evidence):**
- `[VERIFIED]` `fit()` ≡ deleted `computeLetterbox` for all inputs — `src/shared/view.ts:171-173` `resizeToDisplay` uses `Math.min(MAX_DPR, rawDpr||1)` + `Math.floor(cssW*dpr)`, byte-identical to the deleted inline math; both delegate the CSS fit to the same `letterbox()`. Complies with core/shell boundary (viewport is shell) and the .js-import rule.
- `[VERIFIED]` deletions complete — `grep -rn` shows zero live refs to the three symbols under `src/`; `tsc --noUnusedLocals` clean (no orphaned imports; `type Abm`/`type Vec` correctly dropped from input.ts). Rule-checker's live mutation test confirms the new guard reddens on reinsertion.
- `[VERIFIED]` claim-pinned keeps untouched — `applyPointerMotion`/`mainline`/`stateCode`/`INITIAL_ATTRACT` still exported (state.ts / input.ts); no cited constant removed (`CRUISE_SCORE_MULT` / MC-CRUISE-SCORE intact; the claim JSON already pointed at `CRUISE_SCORE_MULT`, not the twin). purity + citations green.

**Devil's Advocate:** Could a re-point be green-but-wrong? The danger case is `fit()` silently diverging from `computeLetterbox` on an untested input — but the divergence is impossible, not merely untested: both compute `Math.floor(box.dim × Math.min(MAX_DPR, rawDpr||1))` off the same `letterbox()` box, so they are the same function of (w,h,dpr). The degenerate `windowH=0` path (Infinity aspect → 0 box → floor(0)=0, no NaN) holds identically. Could deleting `cruiseKillPoints` have unwired live cruise scoring? No — it was already dead; the live path is `scoreKills + CRUISE_SCORE_MULT` (game.ts:598), untouched. Could the mc11-4 guard be a fixture that passes vacuously? Rule-checker mutation-tested it live: reinserting `launchFromKey` reddened it. Could a stray reference survive in a test file (allProdSrc scans only src/)? If so it would fail to import and redden the suite elsewhere — the suite is green, so none survives. The only real defects are the three doc comments above. Nothing functional broke.

**Handoff:** Back to Dev (Loki) for a doc-only green-rework — fix the three comments, no code change.
## Dev Rework — round 1 (doc-only)

**Commit `ea6dfcac`.** Fixed all three Reviewer-flagged stale/misleading comments; NO code change (deletions + re-points from `d8edecee` are unchanged and still verified). Lint clean; affected suites green (53/53).
- `mc10-5-letterbox-aspect.test.ts:31` — CONTRACT block no longer presents the test-local `fit()` wrapper as a `viewport.ts` export; now states it drives the pure fit `applyLetterbox` returns, and that `computeLetterbox` was retired at mc11-4.
- `fire.test.ts:27` — header retitled "WHY THIS WAS RED (mc1-4), AND WHAT REMAINS"; states `fireKeyToBase` shipped and `launchFromKey` was retired at mc11-4. No longer contradicts the updated `FireModule`/`loadFire` below.
- `cruise.test.ts:24` — same treatment; notes `cruiseKillPoints` shipped (mc5-3) then retired (mc11-4), and Loader 3 anchors the ×5 relation on `scoreKills`/`CRUISE_SCORE_MULT`.

Back to Reviewer (Heimdall) for round-2 verification.
## Subagent Results — Round 2 (doc-only re-review)

Code byte-identical to round 1 (`git diff d8edecee..HEAD` is comment-only), so the code-domain specialists' round-1 CLEAN verdicts carry forward; re-ran the two relevant to a doc change.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (r2) | clean | none | N/A — GREEN (1383 vitest + 505 orchestrator, lint clean, 0 smells) |
| 4 | reviewer-test-analyzer | Yes (r1, code unchanged) | clean | none | Carried forward — no code changed since r1 |
| 5 | reviewer-comment-analyzer | Yes (r2) | findings | 1 (high) | confirmed 1: the 3 r1 fixes are correct, but found a residual pre-existing stale header at mc10-5:53 |
| 9 | reviewer-rule-checker | Yes (r1, code unchanged) | clean | none | Carried forward — no code changed since r1 |
| 2,3,6,7,8 | edge/silent/type/security/simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes
**Total findings:** 1 confirmed (DOC/LOW), 0 dismissed

## Round 2 Review — Reviewer notes (REJECTED, superseded by the APPROVAL below)

**Verdict:** REJECTED (round 2 — doc-only; one residual stale comment)

The three round-1 findings are all correctly fixed (comment-analyzer re-verified each against current source). Preflight GREEN, code untouched. One residual finding:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] `[DOC]` | A second, pre-existing "WHY THIS IS RED" header states present-tense "`src/shell/viewport.ts` does not exist" — false: the module exists and is imported on the very next lines. Round-2's rewrite of the fire/cruise sibling headers to past-tense made this file internally inconsistent (past-tense CONTRACT block + present-tense false header). | `tests/mc10-5-letterbox-aspect.test.ts:50-52` | Rewrite to past tense matching the siblings: "WHY THIS WAS RED (mc10-5): viewport.ts did not exist, so the module import + main.ts wiring scan reddened until Dev built the adapter." |

**Handoff:** Back to Dev (Loki) for a doc-only green-rework — fix this one header (and sweep the three touched files for any other present-tense stale header), then this is the final doc round.
## Dev Rework — round 2 (doc-only)

**Commit `f9e34660`.** Fixed the single residual finding: `mc10-5-letterbox-aspect.test.ts:53` header past-tensed to match the fire/cruise siblings ("WHY THIS WAS RED (mc10-5): viewport.ts did not exist…"). Swept all three touched files — the only other "not built yet" hits are the loaders' CONDITIONAL self-describing error strings (fire:90/103/113, cruise:81/102/131) and idiom descriptions, standard fleet RED-loader idiom, unflagged in both review rounds; left as-is. Lint clean; mc10-5 suite green (25/25). No code change.
## Subagent Results — Round 3 (doc-only, final)

Delta since round 2 is a single 3-line comment fix (`f9e34660`); code byte-identical to round 1. Re-ran comment-analyzer (the fix domain); code-domain specialists carry forward.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (r2 + Reviewer self-check r3) | clean | none | GREEN: 1383 vitest + 505 orchestrator, lint clean |
| 4 | reviewer-test-analyzer | Yes (r1, code unchanged) | clean | none | Carried forward |
| 5 | reviewer-comment-analyzer | Yes (r3) | clean | none | Residual mc10-5:53 resolved; no new stale comments |
| 9 | reviewer-rule-checker | Yes (r1, code unchanged) | clean | none | Carried forward |
| 2,3,6,7,8 | edge/silent/type/security/simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes
**Total findings:** 0 outstanding (all round-1/round-2 findings resolved)

## Reviewer Assessment

**Verdict:** APPROVED (round 3 — final; all round-1 and round-2 doc findings resolved)

The code has been byte-identical since the round-1 GREEN commit `d8edecee` (`git diff d8edecee..HEAD` is comment-only across rounds 2-3). The three deletions and three test re-points were independently verified sound in round 1 by preflight, rule-checker (0 violations, live mutation test), and test-analyzer (all re-points non-vacuous), plus my own mechanistic checks; nothing about them changed. Rounds 2-3 fixed four stale/misleading comments (three in round 1's finding set, one residual). comment-analyzer round 3 is CLEAN.

**Data flow traced:** cruise-kill → `killIcbmsInBlasts` (game.ts:584) → `cruiseKilled` count → `scoreKills(scoreAfterPlanes, cruiseKilled * CRUISE_SCORE_MULT, wave)` (game.ts:598). The retired `cruiseKillPoints` was never on this path; deletion is behaviour-neutral and the cruise test now pins this exact live formula. Safe.

**Pattern observed:** re-point-not-delete preserved ROM-fidelity coverage (256:222 aspect fit, ×5 CMKILL scoring, fire→fly→blast) on live symbols — correct and now well-documented.

**Error handling:** the loaders' conditional "not built yet" throws are the intended fleet RED-loader idiom (fire.test.ts:90/103/113, cruise.test.ts:81/102/131) — fire only on an actually-absent export; unchanged and correct.

**Dispatch tags:** `[DOC]` — all 4 doc findings across rounds now FIXED and re-verified clean (comment-analyzer r3). `[TEST]` — 2 low-conf notes deferred (no defect; coverage intact). `[RULE]` — none (rule-checker clean + mutation-tested, r1). `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` — N/A (subagents disabled; I checked each domain against a pure-deletion + comment diff and found nothing: no new branches, no swallowed errors, no new types, no attack surface, no added complexity).

**Verified (final):** deletions complete (`grep` zero live refs under src/; tsc `noUnusedLocals` clean); four claim-pinned keeps untouched; `fit()` ≡ deleted `computeLetterbox` for all inputs (view.ts:171-173); no cited constant removed (MC-CRUISE-SCORE / `CRUISE_SCORE_MULT` intact); purity + citations green; all four touched test files carry accurate, past-tense-where-historical comments.

**Devil's Advocate (final):** the only way this ships broken is a green-but-wrong re-point — ruled out because `fit()` and `computeLetterbox` are the same pure function of (w,h,dpr), the cruise test asserts the literal live formula (game.ts:598), and rule-checker's live mutation test proved the retirement guard reddens on reinsertion. Doc-only rounds 2-3 cannot affect runtime. Nothing functional is at risk.

**Handoff:** To SM (Baldur) for finish-story.