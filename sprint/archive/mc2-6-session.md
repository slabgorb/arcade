---
story_id: "mc2-6"
jira_key: "mc2-6"
epic: "mc2"
workflow: "tdd"
---
# Story mc2-6: Port the joust/centipede DOSSIER_FILES prose-citation coverage sweep onto missile-command

## Story Details
- **ID:** mc2-6
- **Jira Key:** mc2-6
- **Workflow:** tdd
- **Stack Parent:** none
- **PR:** 37
- **Branch:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-06T23:10:07Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T21:39:50Z | 2026-08-06T21:43:12Z | 3m 22s |
| red | 2026-08-06T21:43:12Z | 2026-08-06T21:59:53Z | 16m 41s |
| green | 2026-08-06T21:59:53Z | 2026-08-06T22:12:44Z | 12m 51s |
| review | 2026-08-06T22:12:44Z | 2026-08-06T22:27:52Z | 15m 8s |
| green | 2026-08-06T22:27:52Z | 2026-08-06T22:30:50Z | 2m 58s |
| review | 2026-08-06T22:30:50Z | 2026-08-06T22:48:35Z | 17m 45s |
| green | 2026-08-06T22:48:35Z | 2026-08-06T22:56:20Z | 7m 45s |
| review | 2026-08-06T22:56:20Z | 2026-08-06T23:10:07Z | 13m 47s |
| finish | 2026-08-06T23:10:07Z | - | - |

## Story Summary

Port the dossier prose-citation coverage sweep from joust and centipede onto missile-command. Enroll missile-command's three dossier files (brief.md, subsystems.md, glossary.md) so that every primary-source line-citation in those doc prose blocks has a covering claim in the claims/*.json set. This sweep catches prose-to-source drift that the current checker (which scans only src/core literals) does not.

### Critical Landmine: mc's Two Citation Forms

Missile-command dossier prose uses TWO distinct citation forms (unlike joust's single form):
- `W3MAIN:475` (module name, NO `.MAC` extension)
- `W3COMN.MAC:39` (with `.MAC` extension)

The ported extractor MUST recognize both forms or it will silently match nothing and pass vacuously (defeating the "sweep has teeth" canary). The reference implementations (joust and centipede) key on `FILE:LINESPEC` backtick citations where FILE ends in a known extension — mc's extensionless form requires grammar adaptation.

### Critical Convention: Logical vs Physical Lines in W3MAIN

Per project memory (mc-w3main-cite-double-spaced): W3MAIN.MAC citations are LOGICAL (non-blank) line numbers ≈ physical/2, while W3COMN constants are cited by PHYSICAL line. If the sweep byte-verifies a prose citation, it must apply the SAME logical-vs-physical convention the claims use per module — a naive verbatim check will false-redden every W3MAIN prose cite.

## Acceptance Criteria

1. **DOSSIER_FILES enrollment:** A DOSSIER_FILES variable exists in plugins/missile-command/tests/citations.test.ts, enrolling ["brief.md", "subsystems.md", "glossary.md"].

2. **Prose-citation sweep:** The test implements extractProseCitations() and allProseCitations() functions (ported from joust/centipede), adapted to recognize mc's two citation forms (both W3MAIN:NNN and W3COMN.MAC:NNN).

3. **Coverage assertion:** An "AC-2 — every dossier citation is pinned by a claim" describe block runs; every prose citation extracted from the three dossier files is covered by a committed claim entry in claims/*.json.

4. **Non-vacuity canary:** The sweep extracts a non-trivial citation set (prose.length > 100) — confirming the checker has teeth and is not passing vacuously. Adapt the canary threshold from joust/centipede's model.

5. **Redden on uncovered cite:** A deliberately-uncovered prose citation (added and then removed) reddens the test, proving the sweep catches drift; the test is then reverted.

6. **Wired into the test suite:** npx vitest run --project missile-command, npm run lint, and npm run test:orchestrator all pass.

## Technical Approach

- Port plugins/joust/tests/audit/citations.test.ts and plugins/centipede/tests/audit/citations.test.ts prose-sweep machinery
- Adapt DOSSIER_FILES to mc's file set (brief.md, subsystems.md, glossary.md — not pictures.md)
- Update citation grammar to handle both W3MAIN:NNN and W3COMN.MAC:NNN forms
- Preserve the non-vacuity canary (prose.length > 100 or similar)
- Note in code comments the logical/physical line convention risk for future auditors

## Sm Assessment

**Setup artifacts (all created and verified):**
- Session file carries the workflow (tdd), phase pointer, and repos (arcade) fields.
- Context: `sprint/context/context-story-mc2-6.md`.
- Branch `feat/mc2-6-dossier-prose-citation-sweep` cut from `develop` (gitflow) and pushed.
- Story stamped `in_progress`; claim commit (epic stamp + context) pushed on the feature branch — sibling-visible via `git branch -r | grep mc2-6`.

**Premise verified before setup (measured, not inferred):**
- mc's `plugins/missile-command/tests/citations.test.ts` today scans only `src/core` literals + `docs/rom-study/claims/*.json` — it does NOT sweep dossier prose. Confirmed.
- Reference to port: `plugins/joust/tests/audit/citations.test.ts` (DOSSIER_FILES / extractProseCitations / "AC-2 every dossier citation is pinned by a claim" + a prose.length>100 teeth canary) and the centipede variant.
- mc dossier prose is rich (brief 53 / subsystems 61 / glossary 37 = 151 primary-source line-cites), so the ported sweep will have real teeth, not vacuous.

**Landmine for TEA/Dev (see Story Summary):** mc uses TWO citation forms (`W3MAIN:475` no-extension AND `W3COMN.MAC:39`); mc W3MAIN cites are LOGICAL lines (≈physical/2) while W3COMN are PHYSICAL. Adapt the extractor grammar and the per-module line convention, or the sweep silently matches nothing (false green) or false-reddens every W3MAIN cite.

**Routing:** tdd / phased → next agent is TEA (RED phase): write the failing prose-citation sweep tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** TDD story — the sweep IS the deliverable's guard; chore bypass does not apply.

**Test Files:**
- `plugins/missile-command/tests/helpers/dossier-sweep.ts` — the sweep machinery (module form, centipede cp6-1 precedent, so the mutation proof calls the REAL implementation; coverage decided by `claims.ts` `claimCovers`, imported, never reimplemented)
- `plugins/missile-command/tests/citations.test.ts` — section 5 appended: 4 RED gates + 7 green machinery/mutation tests

**Tests Written:** 11 tests covering 6 ACs
**Status:** RED (4 failing — verified independently by testing-runner, EXACT match, zero unintended regressions; lint exit 0; orchestrator 408/408)

**The RED, measured:**
| Gate | Failing count | GREEN's work |
|------|--------------|--------------|
| no legacy bare-module cite | 43 | rewrite each `W3MOD:logical` → `W3MOD.MAC:physical` (grep the `.SBTTL`/symbol; W3MAIN is double-spaced, logical ≈ physical/2, NOT cleanly convertible) |
| no unparseable linespec | 6 | normalise en-dash (U+2013) ranges to ASCII `N-M` — 5 in brief.md missile.cpp cites, 1 PRIMARY `W3COMN.MAC:123–145` in glossary.md that the sweep itself surfaced (setup's ASCII grep counted only 5) |
| primary cites covered | 8 | author claims (incl. `W3MAIN.MAC:781` INC FRAME, `:239` FRAME def, `W3COMN.MAC:1` .RADIX) — byte-verified by check-citations.mjs |
| external cites covered | 1 today (≈6 post-normalisation) | schema-only claims with the self-describing external marker |

**Dev notes (read before GREEN):**
- The four gates CORROBORATE each other: a legacy cite rewritten to the wrong physical line cannot be covered, because only a claim byte-verified at that line covers it. Do not chase green by inventing claims at wrong lines — the checker rejects a wrong verbatim.
- brief.md:63 QUOTES the deprecated refs `W3DSUP.MAC:19` / `W3MAIN:2039` as a historical note. Those two appear in the failing lists. The fix there is REWORDING (a mention must not wear the backticked citation costume), not authoring claims for deprecated lines.
- The teeth canary counts canonical+legacy > 75 and holds in both states (85 today, ≈91 post-GREEN). Do not lower it.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| :142 every guard mutation-tested — delete the mechanism, require red | "AC5 mutation proof: removing the covering claim reddens the REAL sweep"; range-boundary test | passing (green by design — proves teeth) |
| :377 sweep both citation spellings | legacy-bucket gate + malformed-bucket gate | failing (the intended RED) |
| :218 one concept must not grow two helpers | `coveredBy` delegates to `claims.ts` `claimCovers` — no reimplementation | enforced by construction |
| #5 `.js` extension in relative ESM imports | all new imports carry `.js` | lint-verified (tsc exit 0) |
| #1/#2 type-safety escapes / readonly params | no `any`/casts; `readonly` on all public function params | lint-verified |

**Rules checked:** 5 applicable lang-review rules have coverage; the rest (React, async, enum) are N/A for this test-infra story.
**Self-check:** 0 vacuous tests — every `it()` asserts computed values with `toEqual`/`toBe`/`toHaveLength`; no `let _`, no always-true assertions.

**Handoff:** To Dev (Yoda) for GREEN.

## Dev Assessment

**Status:** GREEN — mc suite 365/365; full cabinet 12,720/12,720; lint 0; orchestrator 408/408; checker verifies 92 claims. All verified independently by testing-runner (`mc2-6-dev-green`).

**The central finding — TEA's landmine table was HALF-INVERTED, and the measurement that showed it:**
The RED table said the 43 bare cites were LOGICAL lines needing per-cite physical re-derivation. Measured against source, **41 of 43 were already PHYSICAL** — subsystems.md's own header (line 11) declares "Anchors are cited by PHYSICAL line," and every anchor cite verified byte-level against its `.SBTTL` at exactly the cited line (script: cited line content vs the anchor the prose names — 41 OK, 2 suspect). mc2-2 wrote those docs *under* mc2-1's resolved physical convention, in the bare spelling. The "bare = logical" rule held only for the mc1-era brief.md stragglers (`W3DSUP:792` → logical, re-cited to the SET UP COLORS FOR NEXT WAVE anchor at `W3DSUP.MAC:1583`; `W3MAIN:2039` → deprecated historical mention, unbackticked). So GREEN was mostly a mechanical `.MAC` append plus claim authoring — the design (normalise + cover) was right, the effort estimate was not.

**The sweep caught a REAL wrong citation on its first run:** brief.md cited the DFT programmer initials at `W3MAIN.MAC:5` — physical 5 is a blank banner border; the PROGRAMMER line is physical **9**. Fixed and claimed at 9. That is the mc2-2-FRAME failure class, caught by the gate this story installs — the story's premise, demonstrated on its own diff. (The gate also caught my own convention-prose edit when the backticked `MODULE.MAC:LINE` placeholder parsed as a cite-lookalike — unbackticked.)

**What GREEN shipped:**
- `subsystems.md`: 39 anchor cites appended `.MAC`; convention prose updated (placeholder unbackticked)
- `brief.md`: 5 missile.cpp en-dash ranges → ASCII (`617–625 get_bit3_addr` split to `` `get_bit3_addr`, `missile.cpp:617-625` ``); `` `:623` `` bare-colon → `W3MAIN.MAC:623`; DFT 5→9; `W3DSUP:792` → anchor 1583; historical logical refs unbackticked with an in-prose note saying why
- `glossary.md`: `W3COMN.MAC:123–145` → ASCII (covered by the existing CITY claims, line ∈ [123,145])
- Claims (+54 → 92 total, all byte-verified): `anchors.json` (40 `.SBTTL` anchors, verbatim read from source so byte-exactness is by construction), `prose.json` (8 timebase/provenance cites: RADIX, SYNC, SYNC-WAIT, FRAME, FRAME-INC, FRAME-QUARTER, DFT, STCITY-READ), `external.json` (6 schema-only MAME markers, marker-first-number == claim line per the checker's rule)
- `citations-source.test.ts`: value-decode loop filtered to EQU-style claims (see deviation) + a non-empty-EQU-subset canary so the filter cannot hollow the loop out silently

**Scope boundary held:** brief.md's subsystem/constant tables (lines 76-108) still use the documented bare-colon `` `:N` `` LOGICAL convention (subsystems.md:17-19 explains it; subsystems.md's physical index supersedes it). Those forms are invisible to the sweep grammar by construction and are NOT normalised here — that is the jt1-8 analogue follow-up (see Delivery Findings). Minimalist discipline: the failing gates defined GREEN; no gate demanded the tables.

**Handoff:** To Reviewer.

### Rework round 1 (commit c7b7419) — all six findings addressed

| # | Fix applied | Verification |
|---|-------------|--------------|
| M1 | dossier-sweep.ts header: "43 survive … today" → RED-census framing with the GREEN outcome (41 already-physical + 2 genuine stragglers; 0 remain) | grep: no unqualified present-tense count remains |
| M2 | Same header: "SIX ranges … today" → "At RED the enrolled docs carried SIX … GREEN normalised all six" | same grep |
| M3 | citations.test.ts:334 comment → "At RED, brief.md carried …" | reads consistently with the passing assertion below it |
| M4 | Test name → "the exact spelling brief.md carried pre-GREEN" | reporter output no longer asserts a false present state |
| M5 | New "KNOWN-INVISIBLE SPELLINGS — disclosed" header section: bare-colon `:N` table form (brief.md:76-109, the `:238`-vs-`W3MAIN.MAC:475` contradiction named explicitly, follow-up pointed) + the W3-only legacy-regex fence (COIN65/COND65) | the artifact now teaches its own blind spots |
| M6 | New canary in citations-source.test.ts: every non-EQU, non-DERIVED claim value must be a kind tag ('anchor'\|'cite'\|'external') | MUTATION-PROBED: planting `value: 30` on MC-CITE-W3COMN-1 reddened exactly that test; reverted clean |

**Adjacent correction in the same block (golden-rebaseline discipline):** the header's illustration of the logical-line hazard cited STCITY/`W3MAIN:1925` — factually wrong (physical 1925 IS the MISSILE DAMAGE DETECTION anchor the prose correctly cited; the example was built on the refuted landmine premise). Replaced with the verified-true `W3DSUP:792` case (physical 792 blank, colour write at physical 1641). Reviewer round 2 should check this replacement too.

### Rework round 2 — both findings addressed (comment-only, no code/test-logic change)

| # | Fix applied | Verification |
|---|-------------|--------------|
| R2-1 | citations.test.ts:276-296 section-5 header reframed to dual-state: dropped "(RED)"/"RED today on four counts"/"GREEN (Yoda): normalise…"; now "At RED it failed on four counts (census 2026-08-06); GREEN resolved every one and the gates below keep them at zero", each count carrying its GREEN resolution, and the how-to relabelled "HOW GREEN normalised (recorded for the audit trail)". | grep: no `(RED)`/`RED today`/`GREEN (Yoda)` state-assertions remain (lines 84 & 331 are live conditional failure/catch messages, correctly kept) |
| R2-2 | dossier-sweep.ts:41-47 worked example reconciled: the `W3DSUP:792` cite now STRICT-DECODES to physical 1641 **yet** the routine it names anchors at 1583 (58 lines apart) — the ambiguity made explicit — and states the shipped resolution `W3DSUP.MAC:1583` (matching claim MC-ANCH-W3DSUP-1583 and brief.md:138), NOT the strict-decode line. | 1641 now appears only as the strict-decode illustration; 1583 named as the resolution; consistent with brief.md + the claim |

**Scope note (deviation logged below):** the reviewer's R2-1 named line 276-296, but a whole-file grep (the very lesson: a reframe must catch every instance) found the SAME stale-RED class in the file's mc2-1 header at line 9 ("RED today, on all three counts, until Dev ports…" — mc2-1 shipped all three long ago). Fixed it too (one-line comment reframe) since a half-done reframe leaving line 9 red while fixing line 276 is internally inconsistent and would only trigger another round. Line 84's catch-block message ("apparatus not built yet — GREEN (Yoda) ports…") is a live guard that fires only if the import fails — left unchanged (it is not a false present-state claim).

**Verification:** mc suite 366/366, lint 0 (tsc --noEmit clean), orchestrator 408/408. No code or test logic touched — comments only.

**Handoff:** Back to Reviewer (Obi-Wan) for round-3 re-review.

Rework verification: mc suite 366/366 (one new test), lint 0, orchestrator 408/408.

## Subagent Results

### Round 3 (re-review of rework commit 6a6e38b — comment-only)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (366 vitest / lint 0 / 408 orchestrator / comment-only, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (citations.test.ts:94/120/231 terse "RED:" section markers false at HEAD) + independently VERIFIED R2-1 & R2-2 both closed and every count | R2-1/R2-2 confirmed closed; the 94/120/231 flag DISMISSED (fleet convention — see adjudication) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (comment-only diff, no executable surface) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | R2-1 CLOSED (#17), R2-2 all counts reproduce exactly (#20); classified 94/120/231 as COMPLIANT fleet convention | R2-1/R2-2 confirmed closed; 94/120/231 compliant |

**All received:** Yes (4 enabled returned: 2 clean, 2 assessed; 5 disabled via settings)
**Total findings:** 0 surviving. R2-1 and R2-2 (round 2) both independently verified CLOSED by BOTH comment-analyzer and rule-checker. The comment-analyzer's fresh 94/120/231 flag is DISMISSED with evidence — a fleet-wide TDD phase-marker convention (43+ shipped instances across all seven games; rule-checker, the rule-#17 owner, concurs it is compliant).

**Round 2 (commit c7b7419) — for the record:** 2 findings (R2-1 rule-checker section-5 stale header; R2-2 comment-analyzer 1641-vs-1583 worked example), both now closed by 6a6e38b.

## Reviewer Assessment

**Verdict:** APPROVED (round 3) — no Critical/High/Medium surviving. The round-2 rework (commit 6a6e38b, comment-only) closed both round-2 findings cleanly, and I confirmed each independently; a fresh flag the comment-analyzer raised on three sibling comments was adjudicated against a fleet-wide convention and dismissed with evidence. The mc2-6 deliverable — the dossier prose-citation coverage sweep — is sound: 92/92 claims byte-verified, all six ACs met, the suite green (366/366 mc, 408/408 orchestrator, lint 0), no executable surface changed since round 1.

**Round-2 findings — both verified CLOSED (independently, by two specialists + my own checks):**
- **R2-1** (citations.test.ts section-5 stale "(RED)/RED today/GREEN (Yoda)" work-list) — CLOSED. The block is now dual-state past ("At RED it failed on four counts (census 2026-08-06); GREEN resolved every one and the gates keep them at zero"), each count carrying its resolution. rule-checker (rule-#17 owner) confirms no false present/future-tense state assertion remains; my whole-file grep agrees (the only two literal-pattern hits, lines 84 & 331, are live catch/assertion-failure messages). Dev also swept the file-header line-9 instance of the same *itemized* class.
- **R2-2** (dossier-sweep.ts worked example naming physical 1641 while the shipped cite resolves to 1583) — CLOSED. The example now makes the ambiguity explicit (logical 792 strict-decodes to physical 1641 YET the routine it names anchors at 1583, 58 lines apart) and names the shipped resolution `W3DSUP.MAC:1583`. Every number re-verified against the vendored source and claims: physical 1641 = `STA ZX,COL000` (colour write), physical 792 blank, non-blank count through 1641 = 792, `.SBTTL SET UP COLORS FOR NEXT WAVE` at 1583, 1641−1583=58, claim MC-ANCH-W3DSUP-1583 present, brief.md:138 cites `W3DSUP.MAC:1583`. rule-checker reproduced all counts exactly.

**Adjudicated finding — DISMISSED with evidence (two specialists disagreed; I ruled):**
The comment-analyzer flagged `citations.test.ts:94/120/231` ("RED: nothing is built yet" / "RED: no claims" / "RED: the claims do not exist yet") as stale present-tense state, the same class as R2-1. The rule-checker classified the identical lines COMPLIANT — a fleet-wide TDD phase-authoring convention. I adjudicated by measurement: the terse `// RED: <not-built-yet>` section marker appears in **43+ shipped, merged, green test files across all seven games** (battlezone 15, star-wars 19, centipede 7, joust 7, asteroids 1, red-baron 1, missile-command 2) and is never reworded post-GREEN — it is a provenance byline ("authored in RED against X"), the same category as the universal `Story mcX-Y — RED phase (…)` header. It is categorically distinct from the R2-1 defect, which was an *itemized, actionable* work-list ("RED today on four counts… GREEN (Yoda): normalise…") — that is why R2-1 (and the itemized line-9 header) were fixed while these terse markers are not defects. They are also pre-existing (mc2-1-authored, outside mc2-6's diff). Rejecting mc2-6 for them would impose a bar no shipped game meets. DISMISSED — this is not a rule-#17 violation per the rule's own owner (rule-checker), backed by fleet evidence; if the fleet ever wants to retire the terse marker style, that is a fleet-wide cleanup, not this story.

**Data flow (unchanged, safe):** dossier markdown → `scanProseCitations` → three buckets → `coveredBy` → `claimCovers` (imported, not reimplemented). `DOSSIER_FILES` is a const tuple; no external input reaches `readDossier`; 92/92 byte-verified.

**Subagent tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled · [TYPE] disabled · [SIMPLE] disabled · [SEC] clean (comment-only, no executable surface) · [DOC] R2-1/R2-2 closed; the 94/120/231 flag dismissed as fleet convention · [RULE] #17 CLOSED and #20 counts all reproduce; 94/120/231 classified compliant.

### Rule Compliance (round 3)

- **#17** (comments asserting an un-re-run state) — CLOSED. No false present/future-tense state assertion remains; the terse `RED:` markers are the fleet convention (not #17 targets), per the rule-checker.
- **#20 / :265** (quoted counts reproduce) — every count in the round-2 prose (43=41+2, 6=5+1, 8, 1, 1641, 1583, 58, 90/0) reproduced exactly against the RED tree (77b4695), the vendored source, and a live HEAD test run.
- **:142** mutation-tested guards — COMPLIANT (unchanged; M6 canary + AC5 proof were live-mutated in round 2).
- **:218 / :377 / #5** — COMPLIANT (unchanged; comment-only diff).

### Devil's Advocate (round 3)

Am I rubber-stamping my own rework? The risk is real — I was Dev this round — so I leaned on the subagents and independent measurement, not my own say-so. Both R2 fixes were re-verified against source, not inspected: the 1583/1641/792/58 arithmetic and the claim/brief.md cross-references all check out byte-level. The one place two specialists disagreed (94/120/231) I did NOT resolve by preference — I ran the fleet grep and let 43+ shipped instances settle it; had the pattern been unique to this file, the comment-analyzer would have won. Could the terse `RED:` markers still mislead a reader? Marginally, in the abstract — but they are a codebase-wide idiom, and singling out mc2-6 for a universal convention is neither consistent nor proportionate; the honest disposition is to note it, not block on it. Could the deliverable itself be hollow? No: the sweep's teeth were mutation-proven in rounds 1-2 (real `uncoveredCitations`, real claim deletion reddens it), 92/92 claims byte-verify, and the suite is green. Nothing is left that a merge would let rot.

**Handoff:** To SM (Thrawn) for finish-story.

## Delivery Findings

### Dev (implementation)
- **Gap** (non-blocking): brief.md's subsystem map (lines 76-89) and constants table (95-108) cite by the bare-colon `` `:N` `` LOGICAL form — invisible to the sweep grammar, so nothing machine-checks them (subsystems.md documents the convention and supersedes the subsystem half; the constants rows duplicate claims that DO verify the same lines canonically). The jt1-8 precedent on joust closed exactly this form as its own story: rewrite them canonical + extend the malformed gate to flag any backticked bare-`:N`.
  Affects `plugins/missile-command/docs/rom-study/brief.md` (rewrite tables canonical) and `plugins/missile-command/tests/helpers/dossier-sweep.ts` (extend the grammar to see bare-`:N`).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the memory/context claim "mc W3MAIN cites are LOGICAL" is now stale for the standing docs — subsystems.md and glossary.md cite PHYSICAL throughout (enforced by the sweep); only brief.md's deliberately-logical tables remain. Whoever curates project memory should scope that note to brief.md's tables.
  Affects project memory / epic context prose (scope the logical-cites claim).
  *Found by Dev during implementation.*

### TEA (test design)
- **Gap** (non-blocking): `timebase.md` and `starting-cities.md` are NOT enrolled in `DOSSIER_FILES` — the story title fences enrollment to brief/subsystems/glossary. Any line-citations in those two docs rot unwatched until a follow-up enrolls them (mirrors centipede cp6-1's scope fence, which filed the same gap).
  Affects `plugins/missile-command/tests/helpers/dossier-sweep.ts` (extend `DOSSIER_FILES` in a follow-up story).
  *Found by TEA during test design.*

### Reviewer (code review)
- **Conflict** (non-blocking): brief.md's subsystem table asserts `:238` for MAINLINE while subsystems.md's byte-verified anchor is `W3MAIN.MAC:475` — two contradictory numbers for the same routine inside the enrolled doc set, the wrong one invisible to the new gate (bare-`:N` spelling). The already-filed follow-up (Dev's Gap above) should treat this contradiction as its RED case, and jt1-8 is the ported precedent.
  Affects `plugins/missile-command/docs/rom-study/brief.md` (normalise the tables in the follow-up; rule-checker verified the constants-table numbers are currently accurate, so the risk is drift, not present error).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `workflow.reviewer_subagents` toggle set for this repo now has `comment_analyzer: true` — on this story it carried the review (4 of 6 findings). Worth keeping enabled fleet-wide given how many mc/joust review rounds have died on claim prose.
  Affects `.pennyfarthing` settings (no change needed; observation for the record).
  *Found by Reviewer during code review.*

### Reviewer (code review — round 2)
- No new upstream findings. Both round-2 findings (R2-1, R2-2) are in-scope prose defects in this story's OWN new diff (section 5 added at 77b4695; the 1641 example at c7b7419), recorded in the Reviewer Assessment as rework items — not pre-existing/upstream issues, so per the fleet rule they are re-rejected, not backlogged.

### Dev (rework round 2)
- No new upstream findings. The one pre-existing item surfaced (citations.test.ts:9, mc2-1's stale "RED today" header) was fixed inline this round rather than deferred (logged as a Design Deviation), so nothing is left to backlog.

### Reviewer (code review — round 3)
- No new upstream findings. The comment-analyzer's flag on citations.test.ts:94/120/231 was adjudicated as a fleet-wide TDD phase-marker convention (43+ shipped instances across all seven games), not a defect — so it is neither re-rejected nor backlogged. No mc2-6 gap remains.

## Design Deviations

### Dev (implementation)
- **citations-source.test.ts value-decode loop narrowed to EQU-style claims** → ✓ ACCEPTED by Reviewer: rule-checker verified by direct count that the 35 EQU claims remain decode-checked and the 56 excluded are byte-verified by the checker — the gap is closed by a different existing mechanism.
  - Spec source: mc2-1 test design (prior story's gate), session AC6 ("all suites pass")
  - Spec text: "$id ($symbol): value equals decodeRadix16(verbatim RHS)" over every non-DERIVED claim
  - Implementation: the `it.each` filter now also requires `rhs(verbatim) !== ''`; a new canary asserts the EQU subset is non-empty
  - Rationale: mc2-6's anchor/cite/external claims carry no `=` RHS at all — even the external marker verbatims the checker itself mandates would fail the plain-radix assertion, so the gate HAD to evolve for this story's design. No weakening: the byte checker guarantees every verbatim equals its real source line, so a constant claim cannot masquerade as an anchor (its real line has the `=` and is filtered IN), and the canary keeps the loop from hollowing out
  - Severity: minor
  - Forward impact: future non-constant claims (anchors, instruction sites, externals) are first-class; constant claims remain fully decode-checked
- **Non-decodable claims carry a kind tag as `value` ('anchor' | 'cite' | 'external')** → ✓ ACCEPTED by Reviewer: honest and greppable — but the tags are UNGUARDED (finding M6): one canary assertion required so a numeric value can never inject into claimedValues.
  - Spec source: mc2-1 claim shape (claims.ts: "value: the radix-decoded value (decimal number, or an expression string)")
  - Spec text: value is the decoded constant
  - Implementation: routine anchors and prose/external cites have no decodable constant; `value` is a self-describing kind string
  - Rationale: `asClaim` requires `value`; a fabricated number would be a lie the decode gate can't check, a kind tag is honest and greppable
  - Severity: minor
  - Forward impact: `Number(c.value)` consumers (the un-cited-literal guard) filter by `isFinite` and ignore them — verified green
- **brief.md's logical tables left un-normalised (scope fence)** → ✗ FLAGGED by Reviewer (disclosure only, fence itself accepted): the fence is sound and the follow-up is filed, but it is disclosed ONLY in this session record — the artifact (dossier-sweep.ts header) enumerates two spellings and never names the bare-`:N` invisible class. Finding M5 requires the in-artifact disclosure; the table normalisation stays follow-up scope.
  - Spec source: story title / session AC3
  - Spec text: "every primary-source line-citation in doc prose requires a covering claim"
  - Implementation: the bare-colon `` `:N` `` table cites (brief.md:76-108) are outside the sweep grammar and were not rewritten
  - Rationale: the convention is deliberate and documented (subsystems.md:17-19); normalising ~50 more cites plus claims would double the story; jt1-8 closed the identical form on joust as its own story
  - Severity: notable — a documented class of citation remains machine-unchecked until the follow-up
  - Forward impact: filed as a Delivery Finding with the concrete fix path
- **Rework round 2 reframed one line BEYOND the named finding (citations.test.ts:9, the mc2-1 file header)** → logged for Reviewer audit: R2-1 named only lines 276-296, but a whole-file grep found the identical stale-RED class in the pre-existing mc2-1 header ("RED today, on all three counts, until Dev ports…"). Fixed it in the same one-line-comment style.
  - Spec source: Reviewer round-2 finding R2-1 (the reframe mandate) + the reviewer's own "grep the whole file" lesson
  - Spec text: "Reframe the whole block to dual-state/past"
  - Implementation: line 9 header reworded to "mc2-1 ported … all three pieces ship today and the suite is green on them"
  - Rationale: a half-done reframe leaving line 9 asserting "RED today" while line 276 is fixed is internally inconsistent and would only trigger another round; it is a zero-risk comment in the exact file under rework. Line 84 (catch-block guard message) deliberately NOT touched — it is a live conditional, not a false state claim.
  - Severity: minor — pre-existing staleness (mc2-1's), cleaned opportunistically; no code/test-logic change
  - Forward impact: the citation-guard file now carries one consistent dual-state voice throughout

### TEA (test design)
- **Sweep extracted to a helper module instead of living inline in citations.test.ts** → ✓ ACCEPTED by Reviewer: agrees with author reasoning; the mutation proof demonstrably calls the real implementation (executed during review).
  - Spec source: session AC1
  - Spec text: "A DOSSIER_FILES variable exists in plugins/missile-command/tests/citations.test.ts"
  - Implementation: machinery lives in `tests/helpers/dossier-sweep.ts`; `DOSSIER_FILES` is statically imported into and used by citations.test.ts
  - Rationale: centipede cp6-1 precedent — the mutation proof must call the REAL sweep; a proof exercising a copy proves only the copy has teeth (lang-review :142)
  - Severity: minor
  - Forward impact: none — the identifier is present and load-bearing in the named file
- **Legacy bare-module citations are gated to ZERO rather than coverage-checked via logical→physical conversion** → ✓ ACCEPTED by Reviewer: vindicated by measurement — 41 of the 43 were already physical, so normalisation was the only coherent reading; an unfalsifiable logical→physical mapping would have been worse than either.
  - Spec source: session AC2/AC3
  - Spec text: "adapted to recognize mc's two citation forms (both W3MAIN:NNN and W3COMN.MAC:NNN)" / "every prose citation extracted … covered by a committed claim"
  - Implementation: both forms ARE recognized (extracted, visible, counted in the teeth canary), but the bare form lands in a `legacy` bucket the gate requires EMPTY — GREEN normalises each to the canonical physical `.MAC` form, after which coverage applies uniformly
  - Rationale: a logical ordinal cannot be covered (claims cite PHYSICAL lines — mc2-1's resolved, checker-enforced convention) and cannot be mechanically converted (the two counting methods drift ~6 lines deep in W3MAIN — mc1-4 review record); a coverage check built on an ambiguous mapping is unfalsifiable. Precedents: jt1-8 rewrote joust's 127 ambiguous cites by human judgement; brief.md:63 itself calls its logical refs "logical/approximate"
  - Severity: notable — this defines GREEN's largest work item (43 per-cite physical re-derivations), and the user may overrule the ruling before Dev starts
  - Forward impact: post-GREEN the dossier carries ONE citation grammar; the gate prevents the legacy spelling from ever returning
- **AC5's "deliberately-uncovered citation added and then removed" implemented as synthetic-input mutation tests** → ✓ ACCEPTED by Reviewer: CI-repeatable and touches no committed docs; polarity verified by execution.
  - Spec source: session AC5
  - Spec text: "A deliberately-uncovered prose citation (added and then removed) reddens the test, proving the sweep catches drift; the test is then reverted"
  - Implementation: the mutation proof calls the real `uncoveredCitations`/`extractProseCitations` with a synthetic dossier string and a claim present/removed — committed docs are never touched
  - Rationale: centipede AC-7 model; an edit-and-revert of committed docs would be unrepeatable in CI and risk leaving the tree dirty
  - Severity: minor
  - Forward impact: the proof runs on every suite invocation, not once
- **External (MAME missile.cpp) citations enrolled in the sweep** → ✓ ACCEPTED by Reviewer: joust parity; all six markers verified against the checker's exact grammar during review.
  - Spec source: story title
  - Spec text: "every primary-source line-citation in doc prose requires a covering claim"
  - Implementation: external `.cpp` cites are extracted, reported in their own bucket, and required to be covered by schema-only claims; en-dash linespecs land in the malformed gate
  - Rationale: joust parity (its sweep covers MAME cites separately); an external cite the sweep cannot see is a citation nothing re-checks — the exact rot class this story exists to close
  - Severity: minor
  - Forward impact: GREEN authors ≈6 schema-only claims beyond the title's letter

### Reviewer (audit)
- **Teeth-canary threshold 75 vs AC4's literal "> 100":** Spec said "prose.length > 100 … Adapt the canary threshold from joust/centipede's model"; the test asserts > 75. Not logged by TEA. Ruling: ACCEPTED as the adaptation AC4's own second sentence licenses — mc's dossier carries ~85-90 cites total (vs joust's 127), so a 100 floor would be unreachable even post-GREEN; rule-checker verified 75 holds in both RED (85) and GREEN (90) states. Recorded here so the divergence from the AC's literal number is on the record. Severity: low.

### Reviewer (audit — round 2)
- No new spec deviations introduced by the rework (c7b7419). All round-1 deviations above remain correctly stamped; R2-1/R2-2 are prose-quality regressions in the rework, not spec divergences, and are carried in the Reviewer Assessment findings table.

### Reviewer (audit — round 3)
- **Dev's round-2 deviation "reframed one line BEYOND the named finding (citations.test.ts:9)"** → ✓ ACCEPTED: line 9 was the *itemized* "RED today, on all three counts, until Dev ports…" work-list style (the R2-1 defect class), so reframing it was correct and in-class, not scope creep.
- **Dev's round-2 claim "the file now carries one consistent dual-state voice throughout"** → minor overclaim, NOT a defect: three terse `RED:` section markers (lines 94/120/231) remain, but those are the fleet-wide TDD phase-marker convention (43+ shipped instances across all seven games), a different category from the itemized work-lists that were fixed. The file is consistent with the fleet idiom; no reframe of the terse markers is warranted on this story. Retiring that convention, if ever desired, is a fleet-wide cleanup — noted, not filed against mc2-6.