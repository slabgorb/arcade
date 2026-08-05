---
story_id: "sw8-24"
jira_key: "sw8-24"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-24: Sweep the 29 stale citations the comment-citation guard reports across plugins/star-wars, then lower its ratchet (sw8-18 TEA finding; re-measured at sw8-23)

## Story Details
- **ID:** sw8-24
- **Jira Key:** sw8-24
- **Workflow:** tdd
- **Type:** chore
- **Points:** 5
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Story Context

### Background (SM Measured 2026-08-05)

The epic YAML description contains stale citation counts from before sw8-27 landed. The measured baseline at story startup is:

- **Live stale-citation count:** 28 (not 29 as described)
- **Class breakdown:** 23 'verbatim not in the cited span', 5 'cited file does not exist', 0 'span out of range'
- **Why it drifted:** sw8-27 completed and archived after sw8-24 was filed. It fixed one verbatim citation as AC2 chore, dropping the count from 29→28. It deliberately left both ratchets pinned at 29 ("finishes at 28 against a ceiling of 29"), so the ratchet is currently SLACK by 1.

### Acceptance Criteria (Derived from Measured Facts)

1. **Sweep all guard-reported stale citations:** Re-anchor the 23 verbatim drifts by running the comment-citation audit tool against the live tree. For the 5 'cited file does not exist' cases (findings.md, shootable-fireballs.ts, tie-peel-away.test.ts, trench-catwalk-hazard.test.ts, fragments.test.ts), make a judgement call for each: re-point to the correct file or disown with the `RETIRED:` marker.

2. **Lower both ratchet assertions in one commit:** 
   - `plugins/star-wars/tests/audit/comment-citations.test.ts:378` — the tree-wide count ceiling
   - `plugins/star-wars/tests/audit/sw8-23-guard-hardening.test.ts:509` — the DELIVERED baseline
   - Both currently pinned at 29; lower to the remaining count after the sweep.

3. **Mutation-prove the new ratchet value:** Prepend one stale citation to a scanned file and verify the guard exits with red. This proves the ratchet is not an unfalsifiable assertion (established as mandatory by sw8-23). Once red, revert the mutation and commit the ratchet lowering.

4. **Guard exits 0 at finish:** The comment-citation audit tool must pass (no violations) when the workflow exits.

### Scope Fence (Out of Scope)

**Bare-colon citations** (`:N` prose refs without file paths) are **OUT OF SCOPE** for this story. sw8-25 (backlog) owns that association-rule defect. Do not widen the sweep to hunt invisible bare-ref citations.

**SAFETY HAZARD:** td1-14 (refuse-to-guess on non-unique verbatim) is still backlog and did NOT land first. The guard RELOCATES anchors via FIRST-OCCURRENCE search, so a non-unique verbatim can name the WRONG routine. **Before applying any hint, manually count occurrences of the verbatim in its file.** If >1, do not trust the hint. 

**KNOWN LIVE TRAP:** `tests/core/trench-traversal-speed.test.ts` cites `WSMAIN.MAC:2654` and the guard's hint says `:2539` — that is the S1MVGD/S1MVBS duplicate-verbatim inversion sw8-18 already got burned by (`ADDD M$TX+M.S1` appears in both routines). Verify against the enclosing routine, not the first hit.

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-05T12:58:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T12:08:56Z | 2026-08-05T12:13:56Z | 5m |
| red | 2026-08-05T12:13:56Z | 2026-08-05T12:24:27Z | 10m 31s |
| green | 2026-08-05T12:24:27Z | 2026-08-05T12:52:40Z | 28m 13s |
| review | 2026-08-05T12:52:40Z | 2026-08-05T12:58:59Z | 6m 19s |
| finish | 2026-08-05T12:58:59Z | - | - |

## Delivery Findings

**GREEN delivered — the guard exits 0 and all three zero-floor ratchets + the AC3 mutation
proof are green.** 28 stale citations swept across 24 files (comment/citation edits only, 35/35
lines, no production logic). Full star-wars suite: 204 files / 2304 tests green.

The sweep was NOT a mechanical hint-application — several findings were guard false-positives or
traps that would have been corrupted by blindly following the relocation hint. Notable judgement
calls, for the Reviewer:

1. **The duplicate-verbatim trap (as forecast).** `trench-traversal-speed.test.ts` cited
   `WSMAIN.MAC:2654`; the guard hinted `:2539`. `ADDD M$TX+M.S1` exists at BOTH :2539 (routine
   **S1MVGD**, ground-flying) and :2656 (routine **S1MVBS**, wormhole). The comment's own prose
   names S1MVBS, so the correct anchor is **:2654-2656** (S1MVBS label + the ADDD), NOT the
   guard's first-occurrence :2539. Both pass the guard (it cannot tell the routines apart — the
   exact td1-14 gap); only the ROM routine boundary decides. Verify against `WSMAIN.MAC` S1MVBS.

2. **Paraphrase-quote false positives (re-anchor was wrong; fix the QUOTE).** `surfaceMazes.ts`
   cited `WSGRND.MAC:740-742` correctly — the `LDA GD.SEQ / CMPA TGD$SQ(X) / LBLT 90$` comparison
   IS there — but the quoted text was a pseudocode paraphrase (`GD.SEQ >= .C`, `>=` is not ROM
   syntax), so the guard weak-matched the bare `GD.SEQ` token and mis-relocated to the `.GLOBB`
   declaration at :59. Fix: kept the readable `>=` gloss as prose, put the LITERAL ROM in the
   backticks. Same class: `hitscan-laser.test.ts` (`altitude += … · dt` → literal
   `aimY * ALTITUDE_RATE * dt`, sim.ts:1030), `tie-waves-rom.test.ts` (`% 12` →
   `% SPAWN_LATERALS.length`, sim.ts:2241).

3. **Two-quotes-then-two-cites mis-pairing (reorder, don't re-anchor).** `models.ts` WALL GUN A:
   `.WP WGA` / `.WGD WGA` then `576-599 / 1780-1789`. Both anchors are correct and unique; the
   guard paired the nearest quote (`.WGD WGA`) with the nearest cite (576-599). Fixed by reordering
   into `.WP WGA` WSOBJ.MAC:576-599, `.WGD WGA` WSOBJ.MAC:1780-1789 — no re-anchor.

4. **`.DOC` unrecognized → span leaks to the preceding `.MAC`.** `tie-aim-axis.test.ts` cited
   `SWMP.DOC:180-187` (Margolin's PERS doc — verbatim CORRECT), but the guard doesn't recognize
   `.DOC`, so the bare span adopted the last-seen `WSGLOB.MAC` (11 lines up) and reported
   `WSGLOB.MAC:180-187`. The guard cannot verify `.DOC` line-ranges at all; presented the Margolin
   text as prose (kept `SWMP.DOC:180-187` as the reference) so nothing mis-pairs. Only this one of
   the plugin's 9 `.DOC` refs was affected. (Not the sw8-25 association defect — a different gap.)

5. **Line-wrapped filenames = orphaned basenames (files EXIST; unwrap).** `trench-obstacles.ts`
   (`docs/star-wars-1983-source-`/`findings.md`) and `render.tie-death-fragments.test.ts`
   (`tests/core/tie-wing-`/`fragments.test.ts`) split a real filename across a comment wrap; the
   guard saw the orphaned tail. Re-joined the path onto one line — no re-point.

6. **Dead-file judgement calls.** `space-combat.test.ts`: `shootable-fireballs.ts` was a `.test`
   typo → `shootable-fireballs.test.ts` (file exists). `tie-vm-flight.test.ts`
   (`tie-peel-away.test.ts` "was deleted") and `trench-force-field-hazard.test.ts` (the superseded
   `trench-catwalk-hazard.test.ts`) are genuinely gone and the prose is historical → `RETIRED:`
   marker (placed immediately before the filename per the CITE_RE contract).

7. **Off-by-one span extensions.** Draw-list label citations (`.WL TIE/TI1/TI2/TI3` in models.ts +
   tie-family-rom.test.ts) excluded the label line after a uniform −1 ROM shift; extended each
   span's start to include the label. `attract.ts` (TCMES.MAC:440-443), `surface-traversal-end`
   (WSMAIN 1670-1673), `trench-force-field-rom` (WSOBJ 1818-1823), `ground-debris`
   (WSXPLD 355-358/390-393/426-429, removed an illegal `...` ellipsis), `render.starfield`
   (WSVROM 1524-1525) similarly.

**The ratchets are now a zero-floor** — I did NOT touch the ratchet assertions in GREEN (TEA
pre-set them to `toBe(0)` at RED); the sweep is what turns them green. Every hint was
occurrence-checked before applying (td1-14 is still backlog, so the guard's relocator remains
first-occurrence).

## Design Deviations

None. Scope held to the citations the guard reports; the bare-`:N` widening (sw8-27 row 19 /
sw8-25) was not touched.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 2304/2304 star-wars tests pass, guard exit=0, lint (tsc) clean, 0 code smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — **the one specialist native to this story's domain; I did the comment/citation verification myself against the ROM (see assessment)** |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — every hunk is comment/citation/spec text or a ratchet literal; no executable logic, no shell/network/secret; new test file only reads a local file + calls the pure checkCitations |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — #15/#17/#18 PASS (mutation test non-vacuous, `toBe(before+1)`; ratchet comments consistent; RETIRED: markers correct); type/error/perf rules N/A (no production logic) |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVED**

Specialist coverage: preflight PASS, security PASS, rule-checker PASS. Six specialists disabled
via `workflow.reviewer_subagents` — critically including **comment_analyzer**, the one native to a
comment/citation sweep. Per the standing hazard (a domain with no specialist), I performed that
verification myself against the gitignored ROM source; the guard exiting 0 proves only SYNTACTIC
validity (the verbatim resolves within the cited span), NOT that the anchor names the RIGHT
routine — the exact td1-14 gap this story navigates.

**Independent ROM verification of every judgement call (the part the guard cannot check):**

- **[DOC] Duplicate-verbatim trap — CORRECT.** `trench-traversal-speed.test.ts` → `WSMAIN.MAC:2654-2656`.
  Confirmed against `reference/atari-source/star-wars-1983/WSMAIN.MAC`: `:2537 S1MVGD` (ground-flying)
  carries `ADDD M$TX+M.S1` at :2539; `:2654 S1MVBS` (wormhole) carries it at :2656. The comment's own
  prose names S1MVBS, so :2654-2656 is right and the guard's first-occurrence hint :2539 (S1MVGD) is
  the wrong routine. Both anchors pass the guard — only the ROM boundary distinguishes them. Dev
  rejected the hint correctly. This is the single highest-risk item and it is right.
- **[DOC] Paraphrase-quote false positives — anchors CORRECT, quotes fixed.** `surfaceMazes.ts`
  WSGRND.MAC:740-742 = `LDA GD.SEQ / CMPA TGD$SQ(X) / LBLT 90$` (verified); the paraphrase `GD.SEQ >= .C`
  now sits as prose with the literal ROM in backticks. `hitscan-laser` sim.ts:1030 = the real
  `aimY * ALTITUDE_RATE * dt`; `tie-waves-rom` sim.ts:2241 = `SPAWN_LATERALS[spawnIndex % SPAWN_LATERALS.length]`.
  All verified in-tree.
- **[DOC] `.WP WGA`/`.WGD WGA` reorder — CORRECT.** WSOBJ.MAC:576 (`.WP WGA`) and :1780 (`.WGD WGA`)
  both unique; the reorder fixes the mis-pairing without re-anchoring a true citation.
- **[DOC] `.DOC` prose demotion — SOUND.** `SWMP.DOC:180-187` is the genuine PERS block (verified
  :180-187); the guard can't parse `.DOC`, so demoting the Margolin verbatim to prose is the right
  call and the reworded text ("YP = YP * XP (SCREEN X) … XP is inverse X") matches SWMP.DOC:182-185.
- **[DOC] Line-wrap unwraps — files EXIST.** `docs/star-wars-1983-source-findings.md` exists AND
  carries both cited headings (`## Trench catwalks…`@284, `## Scoring tables`@405);
  `tests/core/tie-wing-fragments.test.ts` exists. Correct to unwrap, not RETIRE.
- **[DOC] Dead-file calls — CORRECT.** `shootable-fireballs.test.ts` exists (`.test` typo fixed);
  `tie-peel-away.test.ts` and `trench-catwalk-hazard.test.ts` are confirmed ABSENT on disk, so
  `RETIRED:` (colon immediately before the filename, per CITE_RE) is right, not a re-point.
- **[DOC] Off-by-N span extensions — verified** (attract :440-443, WSOBJ label spans :1351/:1371/:1385,
  ground-debris :355-358/:390-393/:426-429 with the illegal `...` ellipsis removed, WSVROM :1524-1525,
  WSMAIN :1670-1673, WSOBJ :1818-1823). Each bounds the quoted run in the ROM.

**Guard integrity checks:** the guard's `0` is genuine — only the 5 audit-test fixture files carry
the opt-out pragma; NONE of the 24 swept files are hidden by the skip list. The new
`sw8-24-citation-sweep.test.ts` fixture is correctly excluded (its deliberately-broken mutant would
otherwise count). The three ratchets are a true zero-floor (`toBe(0)`, RED at 28), and the AC3
mutation proof (`toBe(before + 1)`) is non-vacuous and live (rule-checker + my read agree).

**AC verification:** AC1 (sweep all guard-reported citations) ✓ 28→0; AC2 (lower both — actually
three — ratchets in one commit) ✓; AC3 (mutation-prove the new value) ✓ as executable code; AC4
(guard exits 0) ✓. Scope fence honored (no bare-`:N`/sw8-25 widening).

**Enabled-specialist findings incorporated:**
- [SEC] reviewer-security — clean, no findings. Confirmed every hunk is comment/citation/spec text
  or a ratchet literal; no executable logic, shell, network, eval, or secret introduced; the new
  test file only reads a local file and calls the pure `checkCitations`. No security finding to
  confirm, dismiss, or defer.
- [RULE] reviewer-rule-checker — clean, no violations. #15 PASS (mutation test non-vacuous:
  `toBe(before + 1)` against live `checkCitations`, not a hardcoded golden count), #17 PASS (ratchet
  comments and swept citations consistent with the code beside them; RETIRED: markers correct), #18
  PASS (the fixture diffs the guard's own output, no assertion theatre). Type/error/perf rules N/A —
  no production logic changed. Nothing to confirm, dismiss, or defer.

No Critical, High, Medium, or Low findings. Comment/citation edits only; 2304 tests green; lint
clean. This is a careful, correctly-reasoned sweep that avoided the documented trap. Approved for
finish.

reviewer-preflight: pass
reviewer-security: pass
reviewer-rule-checker: pass

## Sm Assessment

**Setup complete; handing to TEA for the RED phase.** This is a 5pt trunk-based tdd chore:
sweep the stale citations the comment-citation guard reports, lower both ratchets to what
remains, and mutation-prove the new value.

**Premise re-measured before setup (the number in the epic YAML is STALE).** The description
says 29 (24 verbatim + 5 dead-file); the live guard
(`node plugins/star-wars/tools/audit/check-comment-citations.mjs`) reports **28** (23 verbatim +
5 dead-file + 0 out-of-range) at 2026-08-05. The drift is fully explained: `sw8-27` shipped and
archived after this story was filed, fixed one verbatim citation as its own AC2 chore (29→28), and
deliberately left both ratchets pinned at 29 — so the ratchet is currently slack by 1. The session
Background and the derived ACs carry the measured 28; the copied-verbatim description in
`context-story-sw8-24.md` retains the stale 29 under a `> ⚠` correction banner (not edited, per the
"don't disguise a decision" rule).

**Two hazards TEA/Dev must carry, both recorded in the context:**
1. **td1-14 (refuse-to-guess on non-unique verbatim) is still backlog** — the guard relocates by
   first-occurrence, so a duplicate verbatim can name the wrong routine. Live trap:
   `tests/core/trench-traversal-speed.test.ts` cites `WSMAIN.MAC:2654`, hint says `:2539` — the
   S1MVGD/S1MVBS `ADDD M$TX+M.S1` inversion. Count occurrences by hand before applying any hint.
2. **Scope fence:** exactly the citations the guard REPORTS. The bare-`:N` widening request in
   sw8-27's row 19 is OUT of scope; `sw8-25` owns the guard's association-rule defect.

**Both ratchets to lower in one commit, mutation-proven:**
`plugins/star-wars/tests/audit/comment-citations.test.ts:378` and
`plugins/star-wars/tests/audit/sw8-23-guard-hardening.test.ts:509`, both currently 29.

**ACs were null in the epic YAML** — sm-setup derived four; keep them faithful to the measured 28.
No sibling contention at setup (branch + session probes clean); claim pushed to main + empty
`feat/sw8-24-...` branch up.
## Tea Assessment

**RED is live and honest.** Three tree-wide comment-citation ratchets were lowered from
`29` to a `toBe(0)` zero-floor; each now fails with `expected 28 to be 0`. The sweep is the
only thing that makes them green.

**Failing tests (RED forcing functions):**
| Test | File | Fails because |
|------|------|---------------|
| `holds the tree-wide count at the swept-clean floor of 0 (sw8-24)` | `tests/audit/comment-citations.test.ts:421` | default scan = 28 ≠ 0 |
| `the widened scan carries zero stale citations (swept clean by sw8-24)` | `tests/audit/sw8-23-guard-hardening.test.ts:521` | widened scan (src+tests+specs+tools) = 28 ≠ 0 |
| `...and the DEFAULT scan, now covering tools/, is clean too` | `tests/audit/sw8-23-guard-hardening.test.ts:531` | default scan = 28 ≠ 0 |

**Passing guard added (AC3 mutation proof, executable not prose):**
`tests/audit/sw8-24-citation-sweep.test.ts` — injects one stale citation into a scanned
file and asserts the guard reports exactly one more error (`toBe(before + 1)`). This is the
story's "prepend one stale citation and require red" as committed code, so the zero-floor is
mutation-proven rather than asserted. Green on arrival and stays green; it reddens only if the
detector goes blind.

**Design choice — no literal line number is pinned.** `sw8-23-guard-hardening.test.ts:25-31`
forbids it (assert by RESOLUTION / LIVE CENSUS / MUTATION; the only literal is the ratchet).
The ratchets assert by live census (`checkTree(...).length`), the sweep is proven by resolution
(each per-file `checkCitations === []` already exists from sw8-18/sw8-23), and the floor is
proven by mutation. Nothing hardcodes a corrected line, so this suite cannot itself rot into the
stale citation it guards against.

### For Dev (GREEN)

1. **Run the guard for the live list:** `node plugins/star-wars/tools/audit/check-comment-citations.mjs`
   (exits 1, prints all 28 with a relocation hint for each). Sweep until it exits 0.
2. **23 verbatim drifts** — each is a one-number re-anchor the guard names for you. **But
   td1-14 (refuse-to-guess) has NOT landed**, so the relocator is FIRST-OCCURRENCE and a
   non-unique verbatim points at the wrong routine. Count occurrences before trusting any hint.
   **KNOWN LIVE TRAP:** `tests/core/trench-traversal-speed.test.ts` cites `WSMAIN.MAC:2654`
   (`ADDD M$TX+M.S1`, routine **S1MVBS** per the file's own prose); the guard suggests `:2539`
   which is the WRONG routine (S1MVGD, same instruction). The correct S1MVBS anchor is `:2656`,
   already established by `comment-citations.test.ts`'s state.ts fix. Do NOT apply `:2539`.
3. **5 dead-file refs** (`findings.md`, `shootable-fireballs.ts`, `tie-peel-away.test.ts`,
   `trench-catwalk-hazard.test.ts`, `fragments.test.ts`) — each a judgement call: re-point to
   the real file, or disown with the `RETIRED:` marker if the prose is describing something
   historical. Note the `RETIRED:` elision gotcha at `sw8-23-guard-hardening.test.ts:54-58`.
4. **Do the ratchet lowering and the sweep in the same commit** (they already are, in the test
   files) — the sweep of source/comment files is the remaining work; the ratchet floors are
   pre-set to 0.
5. **Scope fence:** exactly the citations the guard REPORTS. The ~26 bare-`:N` refs from
   sw8-27's row 19 are OUT of scope; sw8-25 owns the guard's association-rule defect.

### Rule Coverage (typescript.md lang-review)

- **#15 (every guard must be mutation-tested):** ✅ — `sw8-24-citation-sweep.test.ts` is a live
  mutation of the guard, not a comment. Verified before/after = 0/1 on a clean base.
- **#17 (comments asserting a mechanism nobody re-ran):** ✅ addressed — replaced the stale
  "Mutation-proven at 29" comment with a pointer to the executable proof; updated all three
  ratchet comments to the new zero-floor so no prose contradicts the assertion beside it.
- **#18 (test apparatus that fails by passing / #15 one level up):** ✅ — the mutation test's
  own mechanism (`checkCitations`) is exercised on both a clean and a mutated input, so a broken
  detector reddens it.
- **#16, #19, #31 (name-vs-attribute, population filtering, `as any`):** N/A — no production TS
  logic changes; this story edits comment citations and one test constant.

Handing to Korben (Dev) for GREEN — the sweep.
## Impact Summary

Swept all 28 stale comment-citations across plugins/star-wars to **0** (guard exits 0), lowered the
three tree-wide ratchets from 29 to a `toBe(0)` zero-floor in the same commit, and added an
executable AC3 mutation proof (`sw8-24-citation-sweep.test.ts`, `toBe(before + 1)`). The sweep
navigated the documented S1MVBS/S1MVGD duplicate-verbatim trap correctly (`:2654-2656`, not the
guard's first-occurrence `:2539` hint) and resolved several guard false-positive classes
(paraphrase quotes, two-quotes-then-two-cites mis-pairing, unrecognized `.DOC` span-leak,
line-wrapped filenames) rather than blindly applying relocation hints. Comment/citation edits only —
no production logic; full star-wars suite 2304/2304 green, lint clean. Reviewer APPROVED, 0 findings.
