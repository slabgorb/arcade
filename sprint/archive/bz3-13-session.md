---
story_id: "bz3-13"
jira_key: "bz3-13"
epic: "bz3"
workflow: "trivial"
---
# Story bz3-13: HUD & DOC TEXT — 'GREAT SCORE' on the initials screen, and the reversed language-code note

## Story Details
- **ID:** bz3-13
- **Jira Key:** bz3-13
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** implement
**Phase Started:** 2026-07-18T09:38:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T09:30:36Z | 2026-07-18T09:38:44Z | ~8m |
| implement | 2026-07-18T09:38:44Z | 2026-07-18T09:38:44Z | - |

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/screens.ts` — `entryLines()` now emits `MESSAGES.GREAT_SCORE` (was a hardcoded `'HIGH SCORE'` literal) as the initials-entry banner; doc comment cites L1MSG/BZONE.MAC:4302.
- `battlezone/tests/core/entry.test.ts` — new test pinning the banner to `MESSAGES.GREAT_SCORE` and asserting `'HIGH SCORE'` no longer appears in the entry screen's lines.
- `battlezone/docs/audit/findings/pair-score-hud.json` — S-020 gets `remediated_by: "bz3-13"` (its `ours` citation stays frozen at the old `'HIGH SCORE'` line, per the checker's remediated-finding rule); S-017/S-019's `ours` line numbers re-anchored 42→44, 44→46 (the entryLines doc-comment grew by 2 lines).
- `battlezone/docs/battlezone-1980-source-findings.md` — added a correction note directly below the §9 DSW0 bit-layout block: LNGTBL orders English/German/French/Spanish (BZONE.MAC:4102), 2×LL-indexed (BZONE.MAC:4103-4110), so 01=German, 10=French — the quoted block itself is left untouched (it's an honest verbatim quote of the disassembly's own, also-reversed, comment).
- `battlezone/docs/audit/findings/pair-doc-reconcile.json` — B-028 gets `remediated_by: "bz3-13"` (its `ours` citation at line 401 is unchanged text, so it still matches — frozen either way).

**Tests:** 1025/1025 passing (GREEN). Citations: 12/12. `tsc --noEmit` / `npm run lint` / `npm run build`: clean.
**Branch:** feat/bz3-13-hud-doc-text (pushed, commit `fdee5fa`)

**Handoff:** To review

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Verified citations** (non-blocking, for Reviewer awareness): confirmed both source facts against `~/Projects/battlezone-source-text/BZONE.MAC` directly (not just the JSON findings). L1MSG (line 4302): `L1MSG:	ASCVH LINE1,-64.,24.,<GREAT SCORE>`, drawn by HISCRE (`LDX I,LINE1 / JSR MSGS`, lines 879-880) above LINE2 = 'ENTER YOUR INITIALS'. LNGTBL (line 4102): `LNGTBL:	.WORD ENGLISH-1,GERMAN-1,FRENCH-1,SPANSH-1` — confirms English/German/French/Spanish order, so DSW0 `LL` bits 01=German, 10=French.
- **Improvement** (non-blocking): the `Battlezone.dis65` disassembly's own file-header memory-map comment (quoted verbatim in `docs/battlezone-1980-source-findings.md` §9) itself has the language codes backwards — the doc's error was inherited from a wrong upstream comment, not invented locally. Left the quoted block untouched (still an honest verbatim quote of that flawed comment) and added a correction note directly below it, rather than silently editing the "quoted verbatim" text. Reviewer should confirm this reads as the intended fix for AC-2 ("findings doc's DSW0 language codes are corrected") rather than requiring the block itself to be rewritten.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev (implementation) — B-028 fix is an added correction note, not an in-place edit of the quoted DSW0 block:** Story said "correct the note" in the findings doc. The doc's §9 shows a code block explicitly labeled "quoted verbatim, `Battlezone.dis65`'s own file-header memory-map comment" — and that disassembly comment itself has `01`/`10` backwards (confirmed: `LNGTBL` orders English/German/French/Spanish, contradicting the comment's English/French/German/Spanish claim). Rewriting the block's text in place would make it stop being a true verbatim quote of its cited source. Instead added a bold "CORRECTED (bz3-13 / B-028)" paragraph immediately below the block stating the true `01`=German/`10`=French mapping, matching this doc's own existing convention (the missile-threshold paragraph two lines later uses the same "**ROM-CONFIRMED**" annotation style rather than rewriting quoted ROM comments in place).
- **Dev (implementation) — entryLines() doc-comment growth shifted two unrelated citations:** Adding a 2-line explanatory comment above `entryLines()` (citing L1MSG/BZONE.MAC:4302) pushed the function body down by 2 lines. S-020's own `ours` citation (line 41, `'HIGH SCORE'`) is frozen as history now that it carries `remediated_by` and needs no update per the citation checker's rule — but S-017 (line 42 → 44, `'ENTER YOUR INITIALS'`) and S-019 (line 44 → 46, initials-cap line) are NOT remediated and had their `ours.line` re-anchored to keep `npm test -- citations` green. Verified via the checker's own logic in `tools/audit/check-citations.mjs`, not by running the whole-file `reanchor-citations.mjs --write` tool (which the session history for a sibling story warns re-serializes the entire JSON and can bury real changes under cosmetic escape-character churn) — these were precise, hand-verified single-line edits instead.

## Reviewer Assessment

**Verdict:** APPROVED

**Story:** bz3-13 — HUD & DOC TEXT (Cluster C13: S-020, B-028). Final story of epic bz3. Two text corrections, 1-pt chore.

**Data flow traced:** `MESSAGES.GREAT_SCORE` (text.ts:54, `'GREAT SCORE'`) → `entryLines()` (screens.ts:43) → shell render. Pure `readonly string[]` core-screen data; the banner is not derived from user input, so the swap is a value substitution of the same type — no wiring change, no regression surface. Full suite (1025) green confirms no other consumer depended on the old `'HIGH SCORE'` literal.

**Pattern observed:** B-028 correction-note-vs-in-place — correction note added ADJACENT to the verbatim-quoted §9 DSW0 block (findings doc:407-411) rather than editing the quote. This is the honest choice, and it matches the doc's own established convention (the "ROM-CONFIRMED" missile-threshold annotation at :413-418).

**Error handling:** N/A — pure string-data functions, no failure paths. Test adds a guard (`not.toMatch(/HIGH SCORE/)`) against any high-score label leaking back into the entry screen.

**S-020 (GREAT SCORE) — verified against primary source:**
- `~/Projects/battlezone-source-text/BZONE.MAC:4302` → `L1MSG:	ASCVH LINE1,-64.,24.,<GREAT SCORE>`. Confirmed at the exact cited line.
- Crucially, a *separate* `HISMSG:	ASCVH HISCOR,...,<HIGH SCORES>` sits at :4300 — a DIFFERENT screen (the high-scores table). So the old `entryLines` literal `'HIGH SCORE'` was genuinely wrong for the *initials-entry* banner: L1MSG is drawn by HISCRE above LINE2 = 'ENTER YOUR INITIALS'. Correct screen corrected.
- `MESSAGES.GREAT_SCORE` = `'GREAT SCORE'` (text.ts:54), the pre-existing unused constant, distinct from `HIGH_SCORE`/`HIGH_SCORES`. Now wired.
- Test is non-vacuous: `expect(lines[0]).toBe(MESSAGES.GREAT_SCORE)` + `not.toMatch(/HIGH SCORE/)` both fail if reverted to `'HIGH SCORE'`; drives the real `entryLines('')` production path.

**B-028 (language codes) — verified against primary source:**
- `BZONE.MAC:4102` → `LNGTBL:	.WORD ENGLISH-1,GERMAN-1,FRENCH-1,SPANSH-1` — order English/German/French/Spanish, indices 0/1/2/3.
- Independent mechanism trace of `MSGS` (:4103-4110): `LDA OPTION; ROL×4; AND I,6; TAY` yields Y = 2×LL (the LL bits land in result bits 2:1 after four rotations, masked by 6). LNGTBL indexed by 2×LL → **LL=01→German, LL=10→French**. The doc's former `01=French/10=German` was reversed; the correction is factually correct at the assembly level. Dev's correction note is accurate.
- **Approach verdict: correction-note is the correct/honest choice, NOT in-place.** The §9 block at findings doc:397 is explicitly labeled "(quoted verbatim, `Battlezone.dis65`'s own file-header memory-map comment)"; that disassembly comment itself has `01`/`10` swapped (:401). Editing the numbers inside a verbatim-labeled quote would falsify what the source actually says (laundering upstream error out of the record). Preserving the quote + adjacent authoritative annotation satisfies AC-2 ("the findings doc's DSW0 language codes are corrected") without misrepresenting the source. Aligned with the doc's existing annotation convention.

**Citation honesty — verified:**
- `check-citations.mjs:98-105,112-132`: a `remediated_by` finding "keeps its citation as HISTORY and is no longer re-opened against the working tree" (only requires `ours.file` present); the ROM `source` side is "still checked, always." So S-020's `ours` frozen at screens.ts:41 verbatim `'HIGH SCORE'` (now the function-decl line) is intended history, not a stale failure. Correct application of the rule.
- S-017/S-019 re-anchors are byte-exact and line-only: current screens.ts:44 = `    'ENTER YOUR INITIALS',` (S-017), :46 = `    initials.length < 3 ? \`${initials}_\` : initials,` (S-019). Diff touches only `"line":` and `remediated_by` — the anti-laundering property holds (no `source`/`ours` verbatim altered).
- `npm test -- citations`: 12/12 (my own run).

**Scope / regression:** Diff is exactly 5 files (25 insertions / 6 deletions): the two text corrections + one new test + two citation JSONs. No unrelated changes, no scope creep. Whole suite green.

**Independent verification (my own runs, not the dev's report):**
- `npx vitest run` → **70 files, 1025/1025 passed, 0 failed.**
- `npm test -- citations` → **12/12 passed.**
- `npx tsc --noEmit` → **clean (exit 0).**

**Deviation audit:**
- **ACCEPTED** — "B-028 fix is an added correction note, not an in-place edit." Rationale above: in-place editing of a verbatim-quoted block would launder a genuine upstream error; the adjacent-note approach is the honest fix and matches doc convention.
- **ACCEPTED** — "entryLines() doc-comment growth shifted two citations." Re-anchors are byte-exact and independently reconciled against the checker; S-020 correctly frozen under the `remediated_by` rule.

**Observations:** 8 documented (all verified-good; zero Critical/High/Medium/Low findings).

**Handoff:** To SM for finish-story (final story of epic bz3).
