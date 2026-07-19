---
story_id: "cp2-11"
jira_key: "cp2-11"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-11: Remove the LEVEL indicator — the arcade HUD shows no level text

## Story Details
- **ID:** cp2-11
- **Jira Key:** cp2-11
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** centipede

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T16:23:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T16:00:29Z | 2026-07-19T16:03:56Z | 3m 27s |
| red | 2026-07-19T16:03:56Z | 2026-07-19T16:14:05Z | 10m 9s |
| green | 2026-07-19T16:14:05Z | 2026-07-19T16:16:53Z | 2m 48s |
| review | 2026-07-19T16:16:53Z | 2026-07-19T16:23:25Z | 6m 32s |
| finish | 2026-07-19T16:23:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): claim CL-4 in `docs/rom-study/claims/08-render-color.json` glosses the alphanumeric pen as "OUTSIDE of mushrooms and ALL alphanumerics (score/**level** text)". The cited ROM line (CENTI4.MAC:891) says only "ALL ALPHANUMERICS" — the "(score/level text)" parenthetical is the author's gloss and is now imprecise given cp2-11's finding that no level text exists in rev-4. Left untouched (out of cp2-11 scope; not weakened). A future editorial pass could drop "/level" from CL-4's prose. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): claim CL-4 in `docs/rom-study/claims/08-render-color.json` glosses playfield pen 2 as "OUTSIDE of mushrooms and ALL alphanumerics (score/**level** text)". The ROM verbatim (CENTI4.MAC:891) says only "OUTSIDE OF MUSHROOMS AND ALL ALPHANUMERICS"; the "(score/level text)" parenthetical is the author's prose and, given cp2-11 proving no level text exists in rev-4, now names a nonexistent HUD element. The citation gate is unaffected (it verifies the verbatim, not the gloss) and CL-4 is out of cp2-11's scope, so this was correctly left untouched. Confirms TEA's finding. A future editorial pass should drop "/level" (and arguably tighten "score" → "alphanumerics") from CL-4's prose. *Found by Reviewer during code review (concurs with TEA).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations. Tests match the SM/context spec: a render source-text pin (the reviewer-blessed `render.ts?raw` idiom) plus a behavioural state-scan across attract/play/death/game-over (AC-1), and one net-new negative claim (AC-2). The state-scan additionally guards against a vacuous pass (asserts the SCORE HUD still draws), and the source pin additionally denies WAVE/ROUND/STAGE labels (broader than the literal LEVEL bug, matching claim CL-12's display-set enumeration) — additive hardening, not a spec change.

### Dev (implementation)
- No deviations. Deleted exactly the one line the contract named (`src/shell/render.ts:100`, the `drawText(ctx, atlas, 'LEVEL 1', TILE_W, LOGICAL_H - TILE_H)` call) and nothing else in `src/`. Took the contract's offered optional tidy: reworded the two "score/level HUD" comments (header block and the `render()` doc comment) to "score HUD" — comment-only, stripped by the tests, zero behavioural effect.

## Sm Assessment

**Setup complete, ready for RED.** cp2-11 (1pt bug, tdd, user-reported) —
the arcade's real cabinet draws NO level indicator anywhere; our clone draws
a `'LEVEL 1'` text label (`src/shell/render.ts:100`, added under cp1-6 with no
ROM anchor). ROM anchors verified 2026-07-19 (vendored
`reference/atari-source/centipede/revision.v4/`): a full-tree grep proves no
LEVEL/WAVE/ROUND/STAGE string or digit-writer exists in rev-4 — the complete
display set is the MESG message table (CENIR4.MAC:16, MESS0..MES10 at :67-110)
plus copyright (CENTI4.MAC:12), drawn via MESS/CHAR/DIGIT2/DIGITZ and the HUD
routines UPSCRE/DLIVES/SCORES/BONUS. The fix is a deletion (remove the
`drawText(..., 'LEVEL 1', ...)` call), plus new RED coverage pinning the
absence (no existing test currently asserts on the LEVEL string) and a net-new
negative claim in the claims dossier citing the MESG enumeration.

- **Branch:** `fix/cp2-11-remove-level-indicator` off `origin/develop` tip
  `304c8a6` (cp2-10 merged, PR centipede#16).
- **Race check:** no cp2-11 on `origin/develop` — clear to proceed.
- **Jira:** skipped — none on this project (`jira_key` is just the story id
  per CLAUDE.md).
- **Mode:** peloton subagent mode — tea/reviewer → opus, dev → sonnet; merges
  user-authorized for this session (user directive 2026-07-19: work through
  remaining stories, merge between stories).
- **Pairs with cp2-12** (same HUD area/test files — land adjacent or
  together; watch for overlapping diffs on `src/shell/render.ts` /
  `tests/render.test.ts` if both are in flight at once).

**Handoff:** To TEA (O'Brien) for RED test design.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Quarry verified** (against the checker's authoritative tree
`/Users/slabgorb/Projects/a-1/reference/atari-source/centipede/revision.v4/`,
which `tools/audit/check-citations.mjs` resolves via `repoRoot/../reference/...`):
- **Positive display set is closed:** MESG (CENIR4.MAC:16) is a 44-entry `.WORD`
  pointer table — 11 message groups MESS0..MES10, each ×4 languages
  (base/+G/+F/+S) — with the strings at CENIR4.MAC:67-110: PLAYER, the three
  coinage lines, GAME OVER, ENTER YOUR INITIALS, BONUS EVERY, HIGH SCORES,
  GREAT SCORE, CREDITS, 2 CREDIT MINIMUM. The only other drawn ASCII is the
  copyright `1980 ATARI` (CENTI4.MAC:12). Numeric HUD is DIGIT2/DIGITZ via
  UPSCRE/DLIVES/SCORES/BONUS — digit writers, no LEVEL string.
- **Negative confirmed:** a full-tree grep for level|wave|round|stage across all
  `.MAC` files returns ONLY comment hits (bonus-level DIP option
  CENTI4.MAC:240; colour-change-between-waves CENIR4.MAC:311, plus incidental
  "wrap around"/"next wave" comments). No ASCIN string, no digit-writer target.

**Claim added:** `CL-12` in
`centipede/docs/rom-study/claims/08-render-color.json` (the render/display
claims file) — cites the MESG table head (CENIR4.MAC:16 `MESG:\t.WORD MESS0`,
byte-verified) with the full MESS0..MES10 enumeration + copyright as the
complete rev-4 text display set, asserting no level/wave/round/stage label
exists. Citations now **221/221 all-verified** (was 220/220).

**Test file:** `centipede/tests/render.test.ts` — one net-new describe block
`cp2-11 render — the cabinet draws NO level indicator (any state)`:
- 4 behavioural state-scan cases (attract / play / death / game-over) that
  reconstruct the blitted HUD text from the atlas request log (CHAR_x→x,
  DIGIT_n→n, sprite/mushroom stamps skipped) and assert it contains `SCORE`
  (guard against a vacuous pass) but never `LEVEL`.
- 1 source-text pin over comment-stripped `render.ts?raw`: no `LEVEL` glyph
  run, no `drawText(...LEVEL...)`, no LEVEL/WAVE/ROUND/STAGE label.
- No existing HUD pin asserted the LEVEL label, so nothing was flipped; no
  assertion weakened. (Unrelated `LEVEL` hits in `tests/layout.test.ts:123`
  (fixture) and `tests/centipede.test.ts:279` (English word) are untouched and
  irrelevant — this block scans `render.ts` only.)

**RED proof (exact):**
- `npx vitest run` → **5 failed | 420 passed (425)**. The 5 failures are
  exactly the 5 new cp2-11 tests, all on the `LEVEL` assertion (the `SCORE`
  guard passes first — right-reason RED); the full 420-test prior baseline
  stays green (zero collateral; only `render.test.ts` shows failures).
- `npx tsc --noEmit` → clean (exit 0).
- `node tools/audit/check-citations.mjs` → 221 claims, all verified.
- Commit `c0f36ec` on `fix/cp2-11-remove-level-indicator`; tree clean; no
  `src/` touched.

### Dev Contract (GREEN)

**Delete exactly one line** — `src/shell/render.ts:100`:
```
  drawText(ctx, atlas, 'LEVEL 1', TILE_W, LOGICAL_H - TILE_H)
```
That is the whole fix. **No orphaned imports/locals result** (verified): every
token on that line stays live elsewhere — `LOGICAL_H` (line 68 fillRect),
`TILE_W`/`TILE_H` (lines 58/75), `drawText`/`layoutText` (SCORE draw, line 99).
Do **not** add anything in the vacated HUD slot — the cabinet draws nothing
there.

- **Optional tidy (not required by tests):** the header comments at
  `render.ts:3-6` and `:62-63` read "score/level HUD". The tests strip comments,
  so leaving them will NOT fail, but changing "score/level" → "score" is more
  honest. Dev's call.
- **Out of scope — do not touch:** the SCORE draw (line 99), DLIVES/lives icons,
  per-round colours (cp2-12 owns those), or any other render code.

**Verify after fix:** `npx vitest run` → all **425** green; `npx tsc --noEmit`
clean; `node tools/audit/check-citations.mjs` → 221/221.

**Handoff:** To Dev (Julia) for GREEN — the one-line deletion.

_Note on baselines: the SM brief cited "425 passing" as the baseline; the actual
pre-change baseline is **420** passing. 425 is the post-addition total (420 green
+ 5 new RED). After Dev's deletion all 425 pass._

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `centipede/src/shell/render.ts` - deleted the `drawText(ctx, atlas, 'LEVEL 1', TILE_W, LOGICAL_H - TILE_H)` call (the whole fix, per TEA's contract); reworded the two "score/level HUD" comments to "score HUD" (optional tidy, comment-only)

**Tests:** 425/425 passing (GREEN)
**Branch:** fix/cp2-11-remove-level-indicator (not pushed, per instructions)

**Gates:**
- `npx vitest run` → 425/425 passed (33 test files)
- `npx tsc --noEmit` → clean (exit 0)
- `node tools/audit/check-citations.mjs` → 221/221 all verified
- `npx vitest run tests/purity.test.ts` → 17/17 passed

**Commit:** `7722ff0` on `fix/cp2-11-remove-level-indicator`, tree clean.

**Handoff:** To Reviewer (Thought Police) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | Diff scoped to 3 files (render.ts / 08-render-color.json / render.test.ts), no `src/core` touched; vitest 425/425, tsc exit 0, citations 221/221, purity 17/17; no TODO/FIXME/console.log/orphaned imports; new test imports all used; no `.skip`/`.only` | N/A — all mechanical gates pass with exact expected counts; corroborates Reviewer's own independent gate runs |

**All received: Yes** (1/1 enabled subagents returned).

## Reviewer Assessment

**Verdict:** APPROVED

The Thought Police examined the whole branch (`fix/cp2-11-remove-level-indicator`,
GREEN `7722ff0`) against `origin/develop` tip `304c8a6` after `git fetch` — branch
is 2 commits ahead, no cp2-11 on `origin/develop` (no sibling-checkout race). All
gates re-run independently, numbers not trusted from the handoff.

**Diff is exactly the contract, nothing more** — 3 files:
- `src/shell/render.ts` — the single `drawText(ctx, atlas, 'LEVEL 1', TILE_W, LOGICAL_H - TILE_H)` deletion + two "score/level HUD" → "score HUD" comment rewords. No orphaned symbols: `LOGICAL_H` (line 68 fillRect), `TILE_W`/`TILE_H` (58/75/99) all stay live; `tsconfig` has `noUnusedLocals: true` and `tsc` is clean, which proves it mechanically.
- `docs/rom-study/claims/08-render-color.json` — one net-new negative claim `CL-12`.
- `tests/render.test.ts` — one appended describe block (5 tests) + a widened import (`createSim` retained; `DEATH_DELAY`/`PLAYER_EXPLODE_START`/`type SimState` added — all real exports in `src/core/sim.ts`).
- `src/core/` untouched (AC-2 ✓). Working tree clean; read-only review, no writes to the repo.

**Data flow traced:** `state.score` → `drawText(\`SCORE ${state.score}\`, …)` (line 99, retained, exercised by the state-scan tests). The deleted line drew a *hardcoded* `'LEVEL 1'` — never data-driven, no ROM anchor (added under cp1-6). Removing it changes only a static label; the score path is intact.

**CL-12 claim quality — ROM anchors byte-verified** against `reference/atari-source/centipede/revision.v4/` (the tree `check-citations.mjs` resolves via `repoRoot/../reference/…`):
- Source `CENIR4.MAC:16` = `MESG:\t.WORD MESS0` — verbatim exact.
- 44-entry table (11 groups MESS0..MES10 × 4 languages, lines 16–59) and every enumerated string — PLAYER, the three coinage lines, GAME OVER, ENTER YOUR INITIALS, BONUS EVERY, HIGH SCORES, GREAT SCORE, CREDITS, 2 CREDIT MINIMUM (CENIR4.MAC:67–110) — match the claim exactly.
- Copyright `CENTI4.MAC:12` `.ASCIN /1980 ATARI/` exact; both "comment-only" hits exact (`D4-D5=BONUS LEVEL OPTIONS` CENTI4.MAC:240, `TIME TO CHANGE COLOR BETWEEN WAVES` CENIR4.MAC:311).
- Negative claim holds: no `ASCIN` display string in the tree carries level/wave/round/stage. No `remediated_by` field — no misuse. Prose accurate.

**Test quality — non-vacuous:** the 4 state-scans (attract/play/death/game-over) each assert the reconstructed HUD text `.toContain('SCORE')` (guard against a vacuous pass) AND `.not.toContain('LEVEL')`; the source pin runs over `stripComments(renderSrc)` and denies `LEVEL`, `drawText(…LEVEL…)`, and `\b(LEVEL|WAVE|ROUND|STAGE)\b`. Ran the block in isolation → 5 passed. No pre-existing assertion weakened or deleted (block is appended; only test file touched is `render.test.ts`).

**Deviation audit:**
- TEA (additive hardening — SCORE-present guard + WAVE/ROUND/STAGE denial): **ACCEPTED** — strengthens coverage, matches CL-12's display-set enumeration, no spec change.
- Dev (one-line deletion + the contract's offered optional comment tidy): **ACCEPTED** — exactly the Dev Contract. No undocumented deviations found.

**CL-4 ruling:** ACCEPTABLE as-is for this 1-pointer — the "(score/level text)" gloss is pre-existing prose, out of cp2-11 scope, and the citation gate verifies the ROM verbatim ("ALL ALPHANUMERICS"), not the gloss. Recorded as a non-blocking editorial follow-up (Delivery Findings ### Reviewer), concurring with TEA. Not a reason to reject; fixing it here would be scope creep into an unrelated claim.

**Error handling / security:** N/A — a pure static-label deletion introduces no new branch, error path, input, or network surface.

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| — | No Critical/High/Medium findings | — | — |
| [LOW] (follow-up) | CL-4 prose gloss "(score/level text)" names a nonexistent HUD element post-cp2-11 | `docs/rom-study/claims/08-render-color.json` CL-4 | Editorial: drop "/level" in a future pass (non-blocking, out of scope) |

**Gate outputs (independently observed this review):**
- `npx vitest run` → **425 passed (33 files)**
- `npx tsc --noEmit` → exit 0 (clean)
- `node tools/audit/check-citations.mjs` → **221 claims, all verified**
- `npx vitest run tests/purity.test.ts` → **17/17 passed**
- cp2-11 block in isolation → **5 passed** (4 state-scans + 1 source pin)

**Handoff:** To SM (Winston Smith) for finish-story. Do not merge/push here.