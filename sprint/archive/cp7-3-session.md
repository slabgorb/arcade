---
story_id: "cp7-3"
jira_key: "cp7-3"
epic: "cp7"
workflow: "tdd"
---
# Story cp7-3: The score zero-PADS where the ROM zero-SUPPRESSES — and our own claim already says so

## Story Details
- **ID:** cp7-3
- **Jira Key:** cp7-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** .
**Branch:** none
trunk-based — work lands directly on `main`.
**Phase Started:** 2026-08-04T14:10:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T13:42:39Z | 2026-08-04T13:45:26Z | 2m 47s |
| red | 2026-08-04T13:45:26Z | 2026-08-04T13:55:22Z | 9m 56s |
| green | 2026-08-04T13:55:22Z | 2026-08-04T13:58:51Z | 3m 29s |
| review | 2026-08-04T13:58:51Z | 2026-08-04T14:10:14Z | 11m 23s |
| finish | 2026-08-04T14:10:14Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Conflict (non-blocking, RESOLVED in-phase):** AC-3's boundary example "a score of 100 shows blanks then 0100" is factually wrong against the ROM. Traced `DIGIT2`/`DIGITZ` (CENIR4.MAC:224-247): the carry (suppression flag) is threaded PER DIGIT across all six — `PLA`/`AND` between the two nibbles of a byte and `LDA` between bytes never touch carry — and `DIGITZ` does `CLC` at the FIRST non-zero digit (`10$`). So score 100 = digits `0 0 0 1 0 0` renders `   100` (three blanks, then 1-0-0), NOT `  0100` (which assumes per-BYTE suppression). CL-13 agrees ("the first pair with SEC = zero-suppression, the last with CLC = always drawn"). No user ruling needed — the epic is ROM-fidelity and the ROM is ground truth; this is a factual correction to an illustrative value, not a scope change.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **AC-3 boundary value corrected to the ROM.** The spec (epic AC-3, copied to the context) says score 100 renders "blanks then 0100". The RED test instead pins `   100` (three blanks, then 1-0-0). Why: traced through `DIGIT2`/`DIGITZ`, suppression is per-digit and clears at the first non-zero, so the second `0` of `0100` never draws — it is a blank. `0100` would require per-byte suppression, which the ROM does not do. **Dev/Reviewer: do NOT "fix" the score-100 test back to `0100`** — the ROM is ground truth (CL-13). The test carries a loud comment saying the same. The other five ACs are pinned verbatim as written.

## Sm Assessment

Setup for cp7-3 (2pt, centipede, TDD/phased). A small, well-specified byte-verified fidelity fix: the score formatter zero-PADS (`000000`) where the ROM zero-SUPPRESSES (four blanks + `00` at score 0). No ruling was needed — the ROM rule, the claims, and the ACs all agree; only the code and its docblock disagree.

**Board probes (clean):** no `cp7-3` branch existed on `origin` before this claim; live sibling sessions are jt9-25 (a-1) and jt9-24 (a-2), neither touching cp7-3. No contention.

**Falsifiable-claim measurement (the load-bearing setup work).** Per the sidecar rule, I measured the epic description's checkable claims against the current tree before letting setup copy them forward. The *rule* held; the *line numbers had rotted*, and I passed the measured values to sm-setup as a correction so TEA's Background carries current facts:
- `sixDigits()` is the ONLY score formatter (grep for `padStart|sixDigits` returns exactly it and its two call sites). It lives at `render.ts:209-210` — the description's `:129-133` is stale. Call sites are `render.ts:371` (P1 score) and `:387` (high score), not the description's `:271`/`:287`.
- CONFIRMED against the tree: no test pins `000000` (grep silent) — the hole the story targets is real. `layoutText` (`layout.ts:137-149`) advances the cursor on a space and emits no glyph, and `glyphStamp` (`layout.ts:128`) THROWS on any character without a stamp — so a suppressed digit must be a real space, not a placeholder. Emitting a blank-padded six-char string therefore renders correctly with no other change.

**Note carried into context for Dev:** the `sixDigits` docblock currently asserts the OPPOSITE rule (cp2-12 "zero-padded, never truncated") — that comment is where the mistake was recorded as if it were the finding, and correcting it is part of the fix (AC4), not just the code. Claims CL-13/CL-14 (`docs/rom-study/claims/08-render-color.json:137,151`) already state the ROM rule correctly — NO claim rewrite; the citation gate stays green.

**Handoff:** phased TDD → TEA (Han Solo) for RED. The single most valuable RED artifact is a test that asserts what a ZERO score draws (four blanks at h0-3, `00` at h4-5, against glyph positions — not a formatted string), plus the boundary cases the ACs name (5 → blanks+`05`; 100 → blanks+`0100`). The existing six-significant-digit tests stay green and must not be re-asserted.

## Tea Assessment

RED complete for cp7-3. Six new `it()` cases in a self-contained `cp7-3 render — the score zero-SUPPRESSES …` describe block in `plugins/centipede/tests/render.test.ts` (appended after the cp2-12 HUD block). Committed `c3bbba2`, pushed to `main`.

**RED evidence — 5 fail for the right reason, 1229 pass:**
| Test | AC | State |
|------|-----|-------|
| score 0 → blanks h0-3, `00` at h4-5 | AC-1 | RED (code draws `000000`) |
| high score 0 → blanks h12-15, `00` at h16-17 | AC-2 | RED (same idiom) |
| score 5 → blanks h0-3, `05` at h4-5 | AC-3 | RED |
| score 100 → blanks h0-2, `100` at h3-5 | AC-3 (ROM-corrected, see Deviation) | RED |
| docblock drops "zero-padded, never truncated", cites suppression | AC-4 | RED |
| score 123456 → all six digits, nothing suppressed | AC-6 guard | GREEN on arrival (must stay green) |

The score-0 failure diff is `['0','0','0','0','0','0']` (received) vs `[null,null,null,null,'0','0']` (expected) — i.e. the actual six-zero bug, not a harness fault.

**Test design.** Assertions read DRAWN GLYPH POSITIONS via a name+position recording ctx (the `makeHudRecorder` pattern), never a formatted string — exactly what AC-1 demands. `cellScreenX(col) = col*TILE_W` and `drawText` advances one `TILE_W` per char from `cellScreenX(baseCol)`, so glyph slot `i` sits at `cellScreenX(baseCol+i)`; a suppressed digit emits NO `drawImage` (CHAR blanks), so a blank slot is an *absent* blit at that x. The score-0 test also pins that exactly two digits blit in the band (anti-vacuous — a blank-everywhere bug can't pass).

**AC coverage:** AC-1 ✓, AC-2 ✓, AC-3 ✓ (with the ROM correction to the `0100`→`100` value — see Design Deviations), AC-4 ✓. AC-5 (no claim JSON rewritten; citation gate green) and AC-6 (existing pins stay green) are "no-regression" conditions verified by the suite staying green, not new RED tests — the AC-6 six-digit guard is included and passes.

**Rule Coverage.** Language: TypeScript. Applicable project rules and how the tests honor them:
- *Every test asserts something meaningful / no vacuous assertions* — every new `it()` uses `toEqual` on a fully-specified six-slot array, plus an explicit `.length === 2` anti-vacuous guard on score 0. No `let _ =`, no always-true assertions.
- *core/shell boundary (purity)* — N/A to the tests, but noted for Dev: `render.ts` is SHELL; the fix stays in `sixDigits` (shell), touches no `src/core/`. No sim/clock code involved.
- *No invented colours / no `@shared/font`* — untouched by this story; the existing cp1-6/cp2-1 source-scan guards remain green and continue to protect it.
- *Source-content guard note (AC-4)* — the docblock test intentionally asserts COMMENT content (`renderSrc` raw), which is correct here because the comment IS the AC-4 deliverable — this is not the "guard fooled by a comment" anti-pattern (that concerns mechanism guards in core).

**For Dev (Yoda):** the whole fix is `sixDigits` at `render.ts:209-210` (make leading zeros render as spaces, keeping the last two digits always drawn — per-digit suppression, matching the ROM trace above) plus rewriting its docblock at :207-208 to state the suppression rule and cite `CENTI4.MAC:2638-2645` + `CENIR4.MAC:224-247`. `layoutText` already handles the spaces; `glyphStamp` THROWS on a non-space placeholder, so it must be a real space. Do NOT touch the claim JSON. Do NOT change the score-100 test to `0100`.

## Dev Assessment

GREEN complete for cp7-3. Committed `5aa2469`, pushed to `main`. **1234/1234 centipede tests pass; `tsc --noEmit` (repo-wide `npm run lint`) clean.**

**The change — one function, one docblock, nothing else** (`plugins/centipede/src/shell/render.ts`, the only score formatter):
```ts
function sixDigits(value: number): string {
  const digits = String(Math.max(0, Math.trunc(value))).padStart(6, '0').slice(-6)
  // Blank the contiguous run of leading zeros over the first four digits (SEC);
  // the last two (SCORE0, drawn under CLC) always render.
  const lead = digits.slice(0, 4).replace(/^0+/, (zeros) => ' '.repeat(zeros.length))
  return lead + digits.slice(4)
}
```
`slice(0,4).replace(/^0+/, spaces)` blanks exactly the leading-zero run over SCORE2+SCORE1 (SEC), and `digits.slice(4)` (SCORE0) is appended untouched (CLC → both always draw). This mirrors the ROM's per-digit carry: `/^0+/` is contiguous-from-the-left, so a zero AFTER the first non-zero is kept (e.g. `001000` → `  1000`), exactly as the carry clears at the first non-zero digit. Both call sites (`sixDigits(state.score)`, `sixDigits(highScore)`) get the fix in one place. No output length change — always 6 chars — so column layout is unaffected; `layoutText` renders the spaces as blank tiles that still advance the cursor.

**Docblock (:207-208 → rewritten):** now states ZERO SUPPRESSION, cites `CENTI4.MAC:2638-2645` and `CENIR4.MAC:224-247`, and notes it supersedes cp2-12's mistaken padding claim. One snag caught and fixed in-phase: my first draft *quoted* the banned phrase to explain the correction, which re-tripped AC-4's `not.toMatch(/zero-padded, never truncated/)` — reworded to paraphrase. (Lesson: a "corrected" comment must not restate the exact string a source-scan test forbids.)

**Scope discipline:** no claim JSON touched (AC-5), no test edited, no adjacent refactor. `String(...).slice(-6)` still guards against >6-digit scores (unchanged from the original). AC-3's `0100` was NOT implemented — the RED test and the ROM trace both say `   100`; see Design Deviations.

**For Reviewer (Obi-Wan):** the one judgment call worth your scrutiny is the AC-3 deviation (score 100 = `   100`, not the spec's `0100`) — the reasoning is the DIGIT2/DIGITZ carry trace in Delivery Findings + Design Deviations, corroborated by CL-13. If you read the ROM differently, that's the thing to flag; everything else is mechanical.
### Round 1 Review (REJECTED — superseded by the round-2 approval below)

**Verdict: REJECTED** (round 1) — one LOW citation-accuracy finding. The change is substantively correct and I confirmed it independently; the single blocker is a wrong ROM line-number in a test comment, which this fidelity repo (and this story, which is *about* correcting a mis-recorded comment) should not ship.

### Subagent Results
| Subagent | Enabled | Received | Result |
|----------|---------|----------|--------|
| comment_analyzer `[DOC]` | yes | Yes | 1 finding (citation off-by-5) — verified real |
| security `[SEC]` | yes | Yes | Clean, no findings |
| edge_hunter `[EDGE]` | no | Skipped / disabled | did edge analysis myself (below) |
| silent_failure_hunter `[SILENT]` | no | Skipped / disabled | n/a — no error paths in a pure formatter |
| test_analyzer `[TEST]` | no | Skipped / disabled | reviewed tests myself (below) |
| type_design `[TYPE]` | no | Skipped / disabled | n/a — signature unchanged (`number → string`) |
| simplifier `[SIMPLE]` | no | Skipped / disabled | fix is already minimal (2-line body) |
| rule_checker `[RULE]` | no | Skipped / disabled | rule check myself: core/shell boundary ok, no colour literals, no @shared/font |

### Findings
| # | Severity | File:line | Finding | Required fix |
|---|----------|-----------|---------|--------------|
| 1 | LOW (blocking) | `plugins/centipede/tests/render.test.ts:422` | The describe-block header comment cites `CENIR4.MAC:245` for the `10$: CLC` instruction ("the FIRST non-zero digit does CLC (:245 \"10$: CLC\")"). The actual `10$: CLC` is at **CENIR4.MAC:240**; line 245 is the unrelated `SBC I,29 ;LETTERS START AT 1`. Verified: `sed -n '240p'` = `10$:\tCLC`. Inside the correct 224-247 block, but the specific line pinned points at the wrong instruction. | Change `:245` → `:240` in that comment. Nothing else. |

### Independent verification (subagents mostly disabled — I did their work)
- **AC-3 deviation re-traced from the ROM myself (the load-bearing judgment).** Confirmed score 100 = `   100`, NOT the spec's `0100`. `DIGIT2`/`DIGITZ` thread the carry per digit: SCORE2=`00`→`"  "` (C stays 1), SCORE1=`01`→ hi 0 blanks (C=1), lo 1 does `CLC` and draws `1` → `" 1"` (C=0), SCORE0=`00` under `CLC`→`"00"`. So `"  "+" 1"+"00"` = `   100`. TEA's deviation and CL-13 agree. The `sixDigits` regex reproduces this exactly (`"0001".replace(/^0+/,…)` → `"   1"`, `+ "00"` → `"   100"`).
- **Edge analysis of `sixDigits`.** Output is always exactly 6 chars (`slice(0,4)` with a same-length space-for-zero replace, `+ slice(4)`), so column layout is unchanged. `/^0+/` matches only the contiguous leading-zero run, so a zero AFTER a non-zero is kept (`001000`→`  1000`) — matches the ROM's carry clearing at the first non-zero. Negatives → `Math.max(0,…)` → `0` → `"    00"`. Floats → `Math.trunc`. `slice(-6)` still caps a >6-digit score (unchanged from the original).
- **Tests are non-vacuous and position-based.** Assertions read drawn glyph POSITIONS via a recording ctx (`toEqual` on a fully-specified 6-slot array where `null` = an absent blit / blank tile), never a formatted string (AC-1). The score-0 test adds an explicit `length === 2` guard so an all-blank bug cannot pass. The `123456` guard confirms nothing is suppressed for a full score.
- **Suites & gates:** centipede `1234/1234`, orchestrator `390/390`, `tsc --noEmit` clean, **no claim JSON or docs touched** (`git diff --name-only` — AC-5 holds; the citation gate stays green). High-score path (AC-2) covered at h12-17.
- **The `render.ts` docblock itself is clean** — its citations `CENTI4.MAC:2638-2645`, `CENIR4.MAC:224-247`, `:204-206` all verified accurate by comment_analyzer and by me; it no longer contains the banned "zero-padded…" phrase. Finding #1 is confined to the one test comment.

### Why this blocks (proportionality note)
This is a single LOW comment fix, so per Reviewer proportionality it is emphatically a *one-round* correction, not a multi-round prose hunt. It blocks rather than defers only because (a) the value is provably wrong and points at a different instruction, (b) this repo audits citations and treats line-refs as load-bearing, and (c) the story's own purpose is fixing a mis-recorded comment — shipping a new wrong citation in the same change would be self-defeating. Everything else is APPROVED. Expect round 2 to be an instant approve after the one-character line-number change.

## Dev Assessment — Round 2 (rework)

Applied the round-1 LOW finding: `render.test.ts:422` citation `:245` → `:240` (the `10$: CLC` line; `:245` was `SBC I,29`). Comment-only, no code change. Committed `0932925`, pushed to `main`. Centipede `1234/1234` still green; grep confirms no `:245` mis-cite remains. Nothing else touched — the round-1 verdict approved everything but this one line.
## Subagent Results

**All received:** Yes (2 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents`, covered by my own analysis; preflight not spawned — mechanical checks run inline)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Skipped (not spawned) | n/a | none | mechanical data (diff, suites, grep) gathered inline by reviewer |
| 2 | reviewer-comment-analyzer `[DOC]` | Yes | findings | 1 — test comment cited CENIR4.MAC:245 for `10$: CLC`; actual is :240 | CONFIRMED (round 1) → FIXED & re-verified (round 2) |
| 3 | reviewer-security `[SEC]` | Yes | clean | none | N/A |
| 4 | reviewer-edge-hunter `[EDGE]` | Skipped / disabled | n/a | none | assessed by reviewer — `sixDigits` output always 6 chars; `/^0+/` contiguous-only; negatives/floats guarded |
| 5 | reviewer-silent-failure-hunter `[SILENT]` | Skipped / disabled | n/a | none | assessed by reviewer — pure formatter, no error/catch paths |
| 6 | reviewer-test-analyzer `[TEST]` | Skipped / disabled | n/a | none | assessed by reviewer — tests are position-based, non-vacuous (length-2 guard), no impl coupling |
| 7 | reviewer-type-design `[TYPE]` | Skipped / disabled | n/a | none | assessed by reviewer — signature `number → string` unchanged |
| 8 | reviewer-simplifier `[SIMPLE]` | Skipped / disabled | n/a | none | assessed by reviewer — 2-line body, already minimal |
| 9 | reviewer-rule-checker `[RULE]` | Yes (assessed by reviewer) | clean | none | rule check done inline — see Rule Compliance below |

## Reviewer Assessment

**Verdict: APPROVED** (round 2). The single round-1 LOW finding is fixed and I re-verified the whole change; nothing else regressed.

### Round-2 verification
- **The round-1 finding is resolved.** `git diff 5aa2469..HEAD -- plugins/centipede/` is EXACTLY one line: `-  … CLC (:245 "10$: CLC") …` → `+  … CLC (:240 "10$: CLC") …`. Re-checked against source: `CENIR4.MAC:240` is `10$:\tCLC`. No other change crept in during the rework.
- **No regressions.** Centipede `1234/1234`, `tsc` clean (unchanged code path), no claim JSON or docs touched (AC-5 holds).
- **Round-1 substance stands** (re-summarised, not re-litigated): `sixDigits` zero-suppression matches the ROM's per-digit carry (score 0 → `    00`, 100 → `   100`, 123456 → unchanged); output always 6 chars so layout is unaffected; tests assert drawn glyph POSITIONS and are non-vacuous; the AC-3 deviation (`0100`→`   100`) is ROM-correct and documented; the `render.ts` docblock citations are accurate and drop the banned phrase.

### AC disposition
| AC | Status |
|----|--------|
| AC-1 score 0 = four blanks + `00` at h4-5 (glyph positions) | ✓ |
| AC-2 high score uses identical idiom, fixed together | ✓ |
| AC-3 boundary cases (5, 100) — per-digit suppression | ✓ (ROM-corrected value, see Design Deviations) |
| AC-4 docblock corrected + cites the ROM | ✓ |
| AC-5 no claim JSON rewritten; citation gate green | ✓ |
| AC-6 existing pins (123456/987654/…) stay green | ✓ |

### Rule Compliance
Rules from CLAUDE.md / SOUL / project conventions, enumerated against every symbol the diff touches:
- **core/shell boundary (the single most important rule).** Changed code: `sixDigits` in `plugins/centipede/src/shell/render.ts` — SHELL, correct side. It touches no `src/core/`, imports no sim/clock, and is pure formatting. `plugins/centipede/tests/render.test.ts` is a test. COMPLIANT.
- **No invented colours / no `@shared/font` in render.** The diff adds no colour literal and no font import; the existing cp1-6/cp2-1 source-scan guards (`render.test.ts:135-157`) stayed green. COMPLIANT.
- **ROM-fidelity citations must be accurate.** Every citation in the diff enumerated: `render.ts` docblock → `CENTI4.MAC:2638-2645`, `CENIR4.MAC:224-247`, `:204-206` (all verified by comment_analyzer and me); test comments → `CENTI4.MAC:2638-2645`, `:1902-1910`, `CENIR4.MAC:224-247`, `:240` (the last was the round-1 defect, now fixed). All COMPLIANT after the fix.
- **No claim JSON rewrite (AC-5 + citation gate).** `git diff --name-only` touches only `render.ts` + `render.test.ts`; `docs/rom-study/claims/*` untouched. COMPLIANT.
- **Determinism / no wall-clock in sim.** N/A — no core/timing code touched.

### Observations (≥5)
1. `[VERIFIED]` per-digit suppression matches the ROM — evidence: `CENIR4.MAC:240` `10$: CLC` clears carry at the first non-zero; `sixDigits` `/^0+/` over `slice(0,4)` reproduces it (`render.ts:209-216`).
2. `[VERIFIED]` output width invariant — evidence: `render.ts:214-215`, `lead` (space-for-zero, same length) + `slice(4)` = always 6 chars, so column layout is unchanged.
3. `[DOC]` round-1 citation defect at `render.test.ts:422` — CONFIRMED and FIXED (`:245`→`:240`).
4. `[VERIFIED]` tests are non-vacuous & position-based — evidence: `render.test.ts` cp7-3 block asserts `toEqual` on 6-slot arrays of drawn-blit positions + a `length === 2` guard on score 0.
5. `[VERIFIED]` AC-2 high-score path covered — evidence: the `high score 0` test reads the h12-17 band via `fieldSlots(…, 12)`.
6. `[SEC]` no security surface — CONFIRMED clean by reviewer-security (bounded numeric input, no regex ReDoS).

### Devil's Advocate
Let me argue this is broken. First attack: the regex. `digits.slice(0, 4).replace(/^0+/, …)` — could `/^0+/` ever over-match and eat a significant digit? No: it is anchored at the string start and matches only the contiguous leading-zero run, and it runs on the FIRST FOUR digits only, so it can never reach the always-drawn last two. Could the replacement change length and desync columns? The callback returns `' '.repeat(zeros.length)` — exactly as many spaces as zeros consumed — so `lead` is always 4 chars and the result is always 6. Second attack: inputs. What of a negative score, a float, `NaN`, or a score over six digits? `Math.max(0, Math.trunc(value))` floors negatives to 0 and truncates floats; `padStart(6,'0').slice(-6)` caps overflow (unchanged from the original, which shipped for cp2-12). `NaN` would stringify to `"NaN"` → `"000NaN"`, but score is an integer game value and no producer feeds NaN — and this hazard predates and is unchanged by this diff. Third attack: does a blank tile actually render, or does `layoutText` throw? `layout.ts:140-142` emits nothing for a space while advancing the cursor, and `glyphStamp` is never called for a space, so no throw — confirmed by 1234 green tests including the score-0 case. Fourth attack: the AC-3 deviation — did the reviewer wave through wrong behavior to avoid a rework? No: I re-derived `   100` from the DIGIT2/DIGITZ carry threading independently of TEA, and CL-13 corroborates. If anything, the risk is that a FUTURE reader "corrects" the score-100 test back to the AC's `0100`; the loud test comment + Design Deviation guard against exactly that. Fifth attack: could the high score and P1 score interfere at the shared HUD row? They occupy disjoint bands (h0-5 vs h12-17, `fieldSlots` anchored per-band), and the tests assert each independently. I find no surviving break.

Clean to finish. `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]` — enabled subagents (`[DOC]`, `[SEC]`) received; the rest disabled via `workflow.reviewer_subagents` and covered by my own analysis above.
## Impact Summary (finish)

**cp7-3 — score zero-suppression. Final verdict: APPROVED (round 2). Blocking: 0.**

Two review rounds. **Round 1 (REJECTED)** on a single LOW: a test comment cited `CENIR4.MAC:245` for `10$: CLC`; the actual line is `:240`. **Round 2 (APPROVED):** fixed in `0932925` (`:245`→`:240`) and independently re-verified — `git diff 5aa2469..0932925` is exactly that one line. No other finding, no code defect (the code was correct from GREEN).

**Substance (verified):** `sixDigits` (`render.ts:209-221`) now zero-SUPPRESSES — `slice(0,4).replace(/^0+/, spaces)` blanks the contiguous leading-zero run (SCORE2/SCORE1 under SEC) and appends the always-drawn last two digits (SCORE0 under CLC), reproducing the ROM's per-digit carry (`DIGIT2`/`DIGITZ`, CENIR4.MAC:224-247, CLC at :240). Score 0 → `    00`, 5 → `    05`, 100 → `   100`, 123456 → unchanged. Output is always 6 chars, so layout is unaffected. Docblock corrected (drops the padding claim, cites the ROM). High score fixed in the same formatter (AC-2).

**AC-3 deviation (permanent record):** the epic's AC-3 illustrative value `0100` is wrong; the ROM renders `   100` (per-digit suppression, not per-byte). Independently re-derived by TEA and Reviewer, corroborated by CL-13. The score-100 test and the Design Deviations section guard against a future reader "correcting" it back.

**Gates:** centipede 1234/1234, orchestrator 390/390, `tsc` clean, no claim JSON touched (AC-5 holds; citation gate green). Commits on `main`: c2552b2 (claim), c3bbba2 (RED), 5aa2469 (GREEN), 0932925 (citation fix).
