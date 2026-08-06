---
story_id: "mc2-2"
jira_key: "mc2-2"
epic: "mc2"
workflow: "tdd"
---
# Story mc2-2: subsystems.md + glossary.md source-of-record docs

## Story Details
- **ID:** mc2-2
- **Jira Key:** mc2-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T15:31:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T14:50:11+00:00 | 2026-08-06T14:52:50Z | 2m 39s |
| red | 2026-08-06T14:52:50Z | 2026-08-06T15:01:27Z | 8m 37s |
| green | 2026-08-06T15:01:27Z | 2026-08-06T15:16:17Z | 14m 50s |
| review | 2026-08-06T15:16:17Z | 2026-08-06T15:31:22Z | 15m 5s |
| finish | 2026-08-06T15:31:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Gap][non-blocking]** missile-command has NO prose-citation coverage sweep. joust/centipede enroll their dossiers in a `DOSSIER_FILES` list (plugins/joust/tests/audit/citations.test.ts, plugins/centipede/tests/audit/dossier-sweep.ts) so every primary-source citation written in the doc PROSE is required to have a covering claim. mc's gate (citations.test.ts) only globs claims/*.json + scans src/core — it never reads brief.md/subsystems.md/glossary.md prose. mc2-2's AC is satisfied by symbol-level claim-backing (which my RED tests enforce), but subsystems.md's `.SBTTL` anchors and any prose line-citations in the new docs will still rot unwatched. Recommend a follow-up story to port the joust `DOSSIER_FILES` sweep onto mc. Scope-fenced OUT of mc2-2 per the cp6-1 precedent (enroll-the-sweep is its own story).

### Reviewer (code review)

- **Improvement** (non-blocking): the `FRAME` (O-2) row in `glossary.md:67` cites `W3DSUP.MAC:19` and `W3MAIN.MAC:2039`, both **factually wrong** — these are brief.md's *logical* ordinals copied verbatim, exactly the trap subsystems.md's own callout warns against. Affects `plugins/missile-command/docs/rom-study/glossary.md` (correct the citation to the real physical lines: FRAME storage `FRAME: .BLKB 1` at `W3MAIN.MAC:239`, exported `.GLOBL FRAME` at `W3DSUP.MAC:37`, first read `W3MAIN.MAC:619`). Triple-confirmed (Reviewer + [DOC] comment-analyzer + [RULE] rule-checker rule #17); uncaught by tests because the byte-gated `.SBTTL` cross-check only re-opens subsystems.md, never glossary.md. This corroborates TEA's filed Gap above — the prose-citation coverage sweep would have caught it. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `subsystems.md`'s interrupt/timebase row frames `W3INT` as "module not yet read" implying no anchors exist, but `W3INT.MAC` in fact carries 31 `.SBTTL` directives. The O-2 open question is about deriving the *sim tick*, not about whether subtitles exist. Affects `plugins/missile-command/docs/rom-study/subsystems.md` (soften the phrasing so a later reader knows W3INT has readable anchors; the tick derivation is what's open). No false citation (the doc cites zero W3INT anchors), so nothing reddens. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA]** The `.SBTTL` anchor cross-check requires PHYSICAL-line anchors (`W3MAIN:475`), NOT brief.md's logical ordinals (`:238`). brief.md's subsystem-map anchors are logical (non-blank) ordinals ≈ physical/2 (W3MAIN is double-spaced; `.SBTTL MAINLINE` is physically at 475, brief.md cites :238). Spec ("the .SBTTL anchor index, cross-checked against the vendored source") does not name a basis; I chose physical to match the mc2-1 citation convention (constants cited by physical line, W3COMN.MAC:39) and to make the cross-check mechanically verifiable against `grep -a .SBTTL`. Dev must re-derive anchor lines from source, not copy brief.md's numbers — a copy reddens.

### Reviewer (audit)

- **[TEA] physical-line anchor convention** → ✓ ACCEPTED by Reviewer: sound, and independently vindicated. Every one of subsystems.md's 38 `MODULE:LINE` anchors was re-verified against the vendored source (physical line lands on a real `.SBTTL`, title matches) — the convention held perfectly across all of Dev's anchors. The [DOC]/[RULE] subagents confirmed 38/38. Choosing physical over brief.md's logical ordinals is exactly right for a source-of-record doc.
- **Undocumented deviation (Reviewer audit):** The glossary's `FRAME` (O-2) row silently *broke* that same physical-line convention by copying brief.md's logical ordinals (`W3DSUP.MAC:19`, `W3MAIN.MAC:2039`) — see the Delivery Finding above. Spec/convention said physical; the row shipped logical. Severity: **Medium** (non-blocking — the row is explicitly flagged "not asserted as ground truth" and is outside the byte-gated cross-check). Not logged by Dev; captured here and as an Improvement finding.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates green (282 vitest + 110 orchestrator, lint clean, no smells) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (FRAME citation, MEDIUM), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection/ReDoS/secrets/path-traversal surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (same FRAME citation, rule #17), dismissed 0, deferred 0; 30 rules / 122 instances / 1 violation |

**All received:** Yes (4 enabled returned, 2 with the same finding; 5 disabled via settings)
**Total findings:** 1 confirmed (MEDIUM, non-blocking) + 1 Reviewer-originated LOW (W3INT framing), 0 dismissed, 0 deferred

### Rule Compliance

Rules in scope for this docs + claims + test story (no `src/` change, so the core-boundary/purity/tenant rules are N/A — nothing runtime was touched):

- **Radix discipline** (CLAUDE.md / brief.md §2: `.RADIX 16` @ `W3COMN.MAC:1`, bare=hex, trailing `.`=decimal) — **25/25 compliant.** Every glossary decoded value and all 9 `config.json` claim values recomputed from source by [RULE] rule-checker (rule #27): the 13 W3COMN scalars + 12 city coords all decode correctly (e.g. `0CA`→202, `10.`→10 dec, `222.`→222 dec). I independently re-derived the same 25 rows.
- **mc2-1 citation convention** (`{id,symbol,value,meaning,source:{file,line,verbatim}}`; `value`=radix-decode of verbatim RHS; physical source line; unique `MC-<SYMBOL>` id) — **9/9 compliant.** All new claims byte-exact against `W3COMN.MAC`, values decode correctly, ids unique across all 37 committed claims ([RULE] rule #28; I verified the same via node).
- **subsystems.md anchor convention** (physical `MODULE:LINE` landing on a real `.SBTTL`) — **38/38 compliant.** Every anchor lands on a real `.SBTTL` and the title matches the doc's paraphrase ([RULE] rule #29 + [DOC] + my own title cross-check of 37/37).
- **typescript.md lang-review checklist** (applies to `dossier-docs.test.ts`) — **26/26 checks, 0 violations** ([RULE]). No type-safety escapes, no vacuous assertions, byte-gated block correctly `skipIf(!sourceAvailable)`.
- **Anti-drift** (mc2 epic guardrail: mechanically-checkable glossary entries backed by a claim) — **compliant.** `claimCovers` passes for all 25; the doc→claim id cross-references all resolve (no dangling MC-* ids).
- **Docs-citation accuracy** (source-of-record docs must cite real lines) — **1 VIOLATION**: glossary.md:67 FRAME row (see findings). This is the lone rule-matching finding; not dismissed.

### Observations

- `[VERIFIED]` All 38 subsystems.md anchors are physical `.SBTTL` lines with matching titles — evidence: node cross-check of `W3MAIN.MAC`/`W3DSUP.MAC` returned 37 anchors verified / 0 mismatched, corroborated by [DOC] (38/38) and [RULE] rule #29 (38/38). e.g. `W3MAIN:475`→`.SBTTL MAINLINE`, `W3DSUP:4064`→`.SBTTL TAKE INITIALS FOR NEW HIGH SCORE`.
- `[VERIFIED]` All 25 glossary constant rows + all 9 `config.json` claims decode correctly under `.RADIX 16` — evidence: [RULE] rule #27/#28 tables recomputed every value from `W3COMN.MAC`; I independently re-derived the same. `value = decodeRadix16(verbatim RHS)` holds for all 9.
- `[VERIFIED]` The nine new claims are byte-exact — evidence: node diff of each `source.verbatim` against `W3COMN.MAC[line-1]` matched exactly for all 9 (the one mismatch my scan flagged, `MC-CITY2H`, is a pre-existing mc2-1 claim in field.json with trailing tabs the checker tolerates — not mc2-2's work).
- `[DOC][RULE][MEDIUM]` glossary.md:67 FRAME row cites wrong lines (`W3DSUP.MAC:19`, `W3MAIN.MAC:2039`) — the real lines are `W3MAIN.MAC:239` (storage), `W3DSUP.MAC:37` (`.GLOBL`), `:619` (first read). Triple-confirmed. Non-blocking; in an explicitly-flagged open-question row; uncaught by tests.
- `[RULE][LOW]` subsystems.md interrupt row says W3INT is "module not yet read," but W3INT.MAC has 31 `.SBTTL` directives — the O-2 open question is the sim-tick derivation, not the existence of subtitles. Imprecise framing; no false citation.
- `[SEC]` No security surface — evidence: [SEC] clean; the test's dynamic import is a hardcoded `'./helpers/claims.js'`, `ANCHOR_RE` has no catastrophic backtracking, no `spawnSync`/env/secret/path-traversal.
- `[TEST]` (self, analyzer disabled) The test's `.SBTTL` cross-check anchors to the directive itself (not a loose keyword) and re-derives line→title from source, so it has real teeth; `describe.skipIf(!sourceAvailable)` degrades cleanly on CI. The `includes('10.')`/`includes('222.')` checks are weak but assert a real AC clause; the `toBeGreaterThanOrEqual(11)` floor is a documented anti-zero-anchor guard, not a pinned count.

### Devil's Advocate

Let me argue this story is broken. The most damning charge is that this is a *source-of-record* document — its entire reason to exist is that every later story and the rom-fidelity-audit skill will copy citations out of it verbatim — and it ships with a citation that is flatly wrong. The FRAME row tells a future author that FRAME is "global in W3DSUP.MAC:19, read by W3MAIN.MAC:2039." A story doing wave-tick work in three months opens W3DSUP.MAC:19, finds an unrelated `.GLOBL` list, and either wastes an afternoon or — worse — "corrects" its own code to match a phantom. That is precisely the drift this whole epic (mc2, "the guardrail before gameplay") was chartered to prevent, and the guardrail let it through: the byte-gated `.SBTTL` cross-check only re-opens subsystems.md, so glossary.md prose citations are completely unwatched. TEA saw this exact hole and filed it (no prose-citation coverage sweep); Dev shipped a wrong citation straight into the ungated gap on the very first doc. So the tests are green and a fact is wrong simultaneously — the cabinet-fidelity failure mode this repo has been burned by before.

A confused user (the next Dev) could also misread the interrupt row: "module not yet read" reads as "there is nothing here," when in fact W3INT has 31 subtitles ready to index. And a malicious/lazy author could add a new glossary row with any garbage `W3COMN.MAC:999` citation and every test would still pass, because glossary line-citations are asserted only by `/\bSYMBOL\b/` presence. What would a stressed filesystem produce? Nothing new — the byte-gated blocks skip when the vendored tree is absent (CI), which is correct, but it also means CI can never catch a FRAME-class error; only a local run with the tree would, and only for subsystems.md.

Where the charge fails: the FRAME row is explicitly fenced as an open-question symbol "not yet mechanically pinned by a claim... documented here so later stories know where to look, not asserted as ground truth," and FRAME is *not* one of the 25 mechanically-checkable constants the ACs require — those 25 are all perfect. The meaning prose ("per-frame counter the mainline reads to pace the sim") is correct; only the two line numbers are stale. So the AC-bearing, claim-backed core of the deliverable is flawless and independently triple-verified; the defect is a single Medium prose citation in a self-disclaimed row. That is a fast-follow correction, not a broken story — but it *should* be corrected, because a source-of-record doc with a known-wrong line is worth two minutes to fix.

## Reviewer Assessment

**Verdict:** APPROVED

**Dispatch tags:** `[EDGE]` disabled · `[SILENT]` disabled · `[TEST]` disabled (assessed by Reviewer: real cross-checks, clean skipIf, no vacuous assertions) · `[DOC]` 1 finding confirmed (FRAME citation, MEDIUM) · `[TYPE]` disabled · `[SEC]` clean · `[SIMPLE]` disabled · `[RULE]` 1 finding confirmed (same FRAME, rule #17; 30 rules / 122 instances / 1 violation)

**Why APPROVED:** Zero Critical/High. The story delivers both ACs exactly: subsystems.md indexes all 13 subsystems with 38 physical `.SBTTL` anchors (38/38 verified real, titles match), and glossary.md decodes all 25 W3COMN constants with as-written/decoded/radix/line + backing claim, all 25 radix-correct and claim-backed. The 9 new claims are byte-exact from source with correct decodes. All mechanical gates green; independently re-verified — I did not trust Dev's numbers.

**The one substantive finding** (FRAME citation, glossary.md:67) is MEDIUM and therefore non-blocking per the severity table: it sits in an explicitly self-disclaimed open-question row, targets a symbol outside the AC's mechanically-checkable set, and has correct *meaning* prose — only two line numbers are stale-copied from brief.md's logical ordinals. **Recommendation to SM:** apply the trivial known fix during finish (FRAME storage `W3MAIN.MAC:239`, `.GLOBL` `W3DSUP.MAC:37`, first read `:619`) rather than deferring — it is a source-of-record doc and the correct values are already in hand. The W3INT "not yet read" phrasing (LOW) can ride along or be filed.

**Data flow traced:** vendored `W3COMN.MAC` bytes → `config.json` verbatim (byte-exact) → glossary decoded value (radix-decode) → `claimCovers` gate — safe, closed loop, no drift for the 25 checkable entries.
**Pattern observed:** "derived, not typed" citation discipline correctly applied for anchors and claims at `plugins/missile-command/docs/rom-study/subsystems.md` and `claims/config.json`; broken once at `glossary.md:67` (the O-2 FRAME row).
**Error handling:** N/A (no runtime code); the test's `readDoc`/`loadClaimsModule` throw descriptive errors naming the missing artifact — good.
**Handoff:** To SM for finish-story.

## Dev Assessment

GREEN. TEA's `dossier-docs.test.ts` passes 79/79; the full missile-command project 282/282; `npm run lint` (tsc --noEmit) clean; orchestrator suite 398/398. Three files added, no `src/` touched.

**What I built (minimal to pass, no scope creep):**
1. `docs/rom-study/subsystems.md` — the per-subsystem index. All 13 subsystems from brief.md's map, four module tokens, and `.SBTTL` anchors cited as **physical** `MODULE:LINE`. Every anchor was re-derived from the vendored source with `grep -a .SBTTL` — NOT copied from brief.md's logical ordinals (per TEA's deviation note: `MAINLINE` is physical `W3MAIN:475`, brief's logical `:238`). Coin (`W3COIN`, `.TITLE` not `.SBTTL`) and interrupt/timebase (`W3INT`, O-2, unread) are left anchor-optional and say why.
2. `docs/rom-study/glossary.md` — the per-symbol dictionary. All 25 W3COMN constants (13 scalars + 12 city coords) with As-written / Decoded / Radix / Meaning / Line / Claim columns; a radix-discipline section citing `.RADIX 16` @ `W3COMN.MAC:1` and the trailing-period=decimal rule; the decimal-override constants recorded as written (`10.`, `222.`); and FRAME + the O-2/O-4 open-question symbols in a separate, explicitly-unpinned table.
3. `docs/rom-study/claims/config.json` — the nine constants mc2-1 never claimed (NABMS:33, NICBMS:35, LAUHGT:171, MXICON:193, SCITYM:195, MAXMUL:201, SPUTWV:203, MIRVWV:205, STUPID:231). Each verbatim was read straight from `W3COMN.MAC` via a node script (byte-exact, "derived not typed"), and each `value` is `decodeRadix16(verbatim)` — so the existing `citations-source.test.ts` "value = decode(verbatim)" test also bites them and stays green.

**Anti-drift confirmed:** every mechanically-checkable glossary row now maps to a committed claim (existing MC-* for the mc2-1 set, new MC-* for the nine), and `claimCovers` passes for all 25.

**Cross-checks that would catch a future edit:** the byte-gated block in `dossier-docs.test.ts` re-opens each subsystems.md anchor against the tree; a logical-ordinal anchor or a bad line reddens. TEA's filed Delivery Finding (no prose-citation coverage sweep on mc) stands untouched — out of scope, left for a follow-up.

**Routing:** phased tdd, green complete → next agent is Reviewer (Obi-Wan).

## Tea Assessment

RED laid in for mc2-2. One new doc-contract test file: `plugins/missile-command/tests/dossier-docs.test.ts`. Result: **62 failed / 17 passed** (the 17 passing = the constants mc2-1 already claimed + the non-empty-claims guard); the other 11 mc test files stay green; `npm run lint` (tsc --noEmit) clean.

**What GREEN (Yoda) must build:**
1. `docs/rom-study/subsystems.md` — per-subsystem index. Must name all four modules (W3MAIN/W3DSUP/W3INT/W3COIN), document every subsystem in brief.md's map (17 keyword rows tested), and cite ≥11 `.SBTTL` anchors as `MODULE:LINE` **physical** lines that each land on a real `.SBTTL` directive in the vendored source. Coin (no `.SBTTL`) and interrupt/timebase (O-2, unread) are anchor-optional; any anchor written must be true.
2. `docs/rom-study/glossary.md` — per-symbol dictionary. Must define every W3COMN constant (25 tested: MAXMIS, NABMS, NICBMS, NCITY, NMISBA, TOPSCR, LAUHGT, MXICON, SCITYM, MAXMUL, SPUTWV, MIRVWV, STUPID, CITY1H..CITY6V) plus FRAME and the O-2/O-4 tags; carry a radix note citing `.RADIX 16` @ W3COMN.MAC:1 and the trailing-period=decimal rule; and record decimal-override constants AS WRITTEN (`10.`, `222.`).
3. **Extend `docs/rom-study/claims/*.json`** — add one claim each for the nine currently-unclaimed checkable constants: NABMS(:33), NICBMS(:35), LAUHGT(:171), MXICON(:193), SCITYM(:195), MAXMUL(:201), SPUTWV(:203), MIRVWV(:205), STUPID(:231). Each is a plain W3COMN EQU line — the existing `citations-source.test.ts` "value = decodeRadix16(verbatim)" test will also then bite them, so verbatim + decoded value must agree with source.

**Rule Coverage:**
- Project purity/core-boundary rules — N/A: this story writes docs + claims JSON only, no `src/core` change. The existing `purity.test.ts` and `citations.test.ts` src/core guard remain green and unchanged.
- Radix discipline (CLAUDE.md / brief.md §2) — enforced: glossary must record `.RADIX 16` @ W3COMN.MAC:1 and the as-written `10.`/`222.` decimal overrides.
- Anti-drift (epic mc2 guardrail) — enforced: every mechanically-checkable glossary entry must be backed by a committed mc2-1 claim (claimCovers by physical line).
- Physical-vs-logical line trap (project memory) — enforced: byte-gated cross-check rejects logical-ordinal anchors.
- Test-quality self-check — done: every test carries a meaningful assertion; no `let _ =`, no `assert(true)`, no always-None checks. Byte-gated blocks `skipIf(!sourceAvailable)` so they degrade (not false-green) on CI.

**Routing:** phased tdd, red complete → next agent is Dev (Yoda) for GREEN.

## Sm Assessment

Story mc2-2 (3pt, tdd) set up. Scope: expand `plugins/missile-command/docs/rom-study/brief.md` into the two standing source-of-record docs — `subsystems.md` (per-subsystem module + `.SBTTL` anchor index) and `glossary.md` (per-symbol decoded dictionary) — following the joust/centipede shape.

Existing inputs confirmed in place:
- `plugins/missile-command/docs/rom-study/brief.md` (subsystem map + constant table)
- `plugins/missile-command/docs/rom-study/claims/{cursor,explosion,field}.json` — the mc2-1 citation guardrail. Mechanically-checkable values in the docs should be backed by these claims so the docs cannot silently drift from source.

Reference shapes to copy: `plugins/{joust,centipede}/docs/rom-study/subsystems.md` + `glossary.md`, and how those games test their study docs (doc-contract) for the RED phase.

Constraint carried from the story: radix discipline throughout — bare = hex, trailing `.` = decimal (W3COMN.MAC `.RADIX 16` at line 1).

**Routing:** phased tdd → next agent is TEA (Han Solo) for RED. No blocking gates; trunk-based, no branch. I have anticipated this handoff.