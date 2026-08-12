---
story_id: "ml1-3"
jira_key: "ml1-3"
epic: "ml1"
workflow: "tdd"
---
# Story ml1-3: glossary.md + subsystems.md + open-questions.md: author names -> plain English (beetle/spider/earwig/inchworm/mosquito/dragonfly/DDT/poison-mushroom); subsystem -> owning file + .SBTTL line

## Story Details
- **ID:** ml1-3
- **Jira Key:** ml1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml1-3-millipede-glossary-subsystems-open-questions
- **PR:** 277

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T12:48:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T12:19:47Z | 2026-08-12T12:22:07Z | 2m 20s |
| red | 2026-08-12T12:22:07Z | 2026-08-12T12:30:14Z | 8m 7s |
| green | 2026-08-12T12:30:14Z | 2026-08-12T12:37:41Z | 7m 27s |
| review | 2026-08-12T12:37:41Z | 2026-08-12T12:48:17Z | 10m 36s |
| finish | 2026-08-12T12:48:17Z | - | - |

## Story Context

**Acceptance Criteria (derived from title):**

1. Author `glossary.md` under `plugins/millipede/docs/rom-study/`
   - Map ROM names to plain English (beetle, spider, earwig, inchworm, mosquito, dragonfly, DDT, poison-mushroom)
   - Follow sibling layout/tone from centipede/, joust/, missile-command/ glossary docs

2. Author `subsystems.md` under `plugins/millipede/docs/rom-study/`
   - Document each subsystem: owning file + `.SBTTL` line
   - Cover named symbols from: MILLI.MAC (BEEMV, BEETL, EARWIG, FLYMV, MOSQT, SPDMV, WRMMV, SHOOT, MOVE, MOTION, EXPLOD, CENTPC), MLIRQ (SOUNDS, CLRCH, IRQ, JOYS), MLATR (MODE FE/FF), CONWAY (INICON, MASTER)
   - Follow sibling layout/tone

3. Author `open-questions.md` under `plugins/millipede/docs/rom-study/`
   - Document OQ-1 through OQ-4:
     - OQ-1: Exact refresh rate (DEFERRED to ml1-4; pose question, do not settle)
     - OQ-2: MILLI.DOC
     - OQ-3: Graphics + RAM-driven colour (no colour PROM listed; real board diff from Centipede)
     - OQ-4: Trackball-vs-joystick input, MLIRQ.MAC:897
   - Follow sibling layout/tone

4. Enrol three new docs into dossier audit system (TEA responsibility)
   - Extend DOSSIER_FILES in dossier-sweep for ml1-3
   - Add audit test (sibling: `brief-dossier.test.ts`) asserting required content + citations

**Primary Source:** `reference/original-source/millipede/` (vendored historicalsource/millipede, pinned 29f3e05)

**Context & Dependencies:**
- ml1-2 shipped: `brief.md` + audit tests (`brief-dossier.test.ts`, `citations.test.ts`)
- ml1-3 complements ml1-2 with three sibling dossier docs
- Sibling layout available at: `plugins/centipede/docs/rom-study/{glossary,subsystems,open-questions}.md`
- All claims must cite primary source in backtick-wrapped format: `` `FILE:LINE` ``

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the four `expectPopulated(<literal>.length, …)` floors in `glossary-subsystems-oq.test.ts` (lines ~173/201/221/228) are self-referential — they measure a hard-coded array against its own length, so only a same-diff edit to the test can fail them. Inherited from the `brief-dossier.test.ts` sibling pattern; harmless tripwire, not a gate on GREEN. Affects `plugins/millipede/tests/audit/glossary-subsystems-oq.test.ts` (optional: drop or reframe as a comment). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the OQ-tag loop `for (const tag of ['OQ-1'..'OQ-4'])` (~line 252) lacks the preceding `expectPopulated` guard its `ENTITIES`/`SUBSYSTEMS_MAP` siblings carry — provably non-vacuous (4-item inline literal, no `continue`, each tag asserted) but inconsistent. Affects `plugins/millipede/tests/audit/glossary-subsystems-oq.test.ts` (optional: add a `expectPopulated(4, 4, 'OQ tags')` for pattern consistency). *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **INICON cited to its label line, not a `.SBTTL` line (it has none)**
  - Spec source: story title / context-story-ml1-3.md, "subsystem -> owning file + .SBTTL line (… CONWAY INICON/MASTER)"
  - Spec text: "subsystem -> owning file + .SBTTL line"
  - Implementation: subsystems.md cites `INICON` to `CONWAY.MAC:11` (`INICON:\tLDX #00`, a plain label) and discloses in the row "a plain label, not a `.SBTTL` section". `MASTER` and all 19 other subsystems cite a real `.SBTTL` header as specified.
  - Rationale: `grep -n '\.SBTTL' CONWAY.MAC` shows only `MASTER` (24); `INICON` is a label at line 11, so no `.SBTTL` line exists to cite — TEA's test accepts the label line (`lines: [11]`).
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **INICON cited to its label line, not a `.SBTTL` line** → ✓ ACCEPTED by Reviewer: independently confirmed `grep -n '\.SBTTL' CONWAY.MAC` yields only `MASTER` (24); `CONWAY.MAC:11` is the `INICON:` label, byte-verified as claim SS-20. Citing the label line is the only faithful option and subsystems.md discloses it in the row. Correct handling, minor, no forward impact.

## Sm Assessment

Setup clean — ml1-3 is a well-scoped `rom-source-study` dossier story, no ruling needed
before RED (no either/or AC, no stale premise). Verified against the current tree:

- **Board clear at claim time.** No `feat/ml1-3` branch on origin; the only live sibling
  session is a-3 on jt11-4. Claim branch pushed empty+1 so the sibling probe lights up.
- **Premise sound.** ml1-2 already shipped `plugins/millipede/docs/rom-study/brief.md`,
  its `claims/`, and the audit tests (`brief-dossier.test.ts`, `citations.test.ts`); the
  vendored source `reference/original-source/millipede/` (pinned 29f3e05) is present. The
  three target docs do NOT yet exist — this story authors them.
- **Gitflow, not trunk.** Branch cut from `develop`; PR targets `develop`. The
  agent-behavior guide's "orchestrator targets main / trunk-based" text is stale (arcade
  switched to gitflow 2026-08-06).
- **No acceptance_criteria in epic YAML** (null) — ACs derived from the story title, which
  is the spec.

**TDD seam for TEA (Leeloo):** extend the ml1-2 guard pattern — enrol the three new docs
into `DOSSIER_FILES` in the dossier-sweep and add an audit test asserting each doc's
required content + backtick-wrapped `FILE:LINE` citations, each covered by a `claims/*.json`
whose `verbatim` re-opens byte-for-byte. An unenrolled doc is swept by nothing (the
vacuous-green trap ml1-1 guards). OQ-1 (exact refresh) is DEFERRED to ml1-4 —
`open-questions.md` poses it, does not settle it; brief.md already defers it.

Handing off to TEA for RED.
## Tea Assessment

RED landed clean and isolated. New failing suite:
`plugins/millipede/tests/audit/glossary-subsystems-oq.test.ts` (commit `6a0ec0a5`).

**RED evidence (direct run + testing-runner `ml1-3-tea-red`, agreeing exactly):**
- Full millipede project: **42 failed / 66 passed**, 1 file failed (mine), 4 files
  green — `brief-dossier.test.ts`, `citations.test.ts`, `scaffold.test.ts`,
  `purity.test.ts` all still pass. No collateral RED.
- `npm run lint` (tsc --noEmit, CI's only typecheck): **clean**.
- The 6 in-file passes are non-vacuous structural guards only (doc-set=3,
  entity-table=8, subsystem-map=20 population floors; `allMalformedCitations`/
  `uncoveredCitations` `[]`-over-absent-docs — Dev-facing gates that arm in GREEN;
  and byte-verify of ml1-2's existing brief claims). None is a content assertion
  passing when it should fail.

**Story premise VERIFIED against the vendored 1982 tree before writing a line**
(test-paranoia; the jt8-6 lesson that a story can misattribute symbols). Every
title claim is grounded — no refutation:
- All 20 named subsystems resolve to a real `.SBTTL` at the line I pinned, read from
  `grep -n '\.SBTTL'` (numbered tool output, never memory): MILLI.MAC {BEEMV 56,
  BEETL 243, EARWIG 672, FLYMV 1004, MOSQT 1324, SPDMV 2295, WRMMV 2559, SHOOT 1820,
  MOVE 1640, MOTION 1444, EXPLOD 763, CENTPC 498}; MLIRQ.MAC {SOUNDS 8, CLRCH 242,
  IRQ 701, JOYS 897}; MLATR.MAC {MODE FE 126/165, MODE FF 313}; CONWAY.MAC {MASTER 24}.
- **`MLIRQ.MAC:897` is literally `.SBTTL JOYS - READ AND RESPOND TO JOYSTICKS`** —
  OQ-4's input citation is exact.
- **`INICON` is a plain LABEL, not a `.SBTTL`** — `CONWAY.MAC:11 INICON: LDX #00`.
  Dev cites the label line; the story's "owning file + .SBTTL line" phrasing is
  loose here and subsystems.md should note it.
- DDT (`CONWAY.MAC:218 CMP #DDT`, `MILLI.MAC:137 JSR DDTEXP`) and POISON MUSHROOM
  (`CONWAY.MAC:216 ...KILL IF POISON MUSHROOM`, `:122 CMP #POISON`) are real object
  constants — good glossary anchors.

**What GREEN (Korben/Dev) must ship** — three docs under
`plugins/millipede/docs/rom-study/` (layout/tone siblings in
`plugins/centipede/docs/rom-study/`):
1. `glossary.md` — the 8 author→plain-English translations the AC-2 table names.
2. `subsystems.md` — all 20 subsystems, each named in prose + a backticked
   `FILE:LINESPEC` citation covering its `.SBTTL`/label line (≥18 citations).
3. `open-questions.md` — OQ-1..OQ-4. **OQ-1 must DEFER exact refresh to ml1-4 and
   must NOT contain `59.88` (the negative guard against inheriting centipede's rate
   on faith).** OQ-4 must cite `MLIRQ.MAC:897`.
4. `docs/rom-study/claims/*.json` — one covering claim per NEW cited line, `verbatim`
   re-opening byte-for-byte (AC-6 enforces; skipped on CI, AC-5 coverage still bites).
5. **Enrol all three filenames into `DOSSIER_FILES` in `tests/audit/dossier-sweep.ts`**
   (currently only `'brief.md'`). AC-1's enrolment test fails until this lands — an
   unenrolled doc is swept by nothing (the vacuous-green trap ml1-1 guards).

### Rule Coverage

- **lang-review #15 (vacuous universally-quantified sweep):** every data-driven
  `for` loop (ENTITIES ×8, SUBSYSTEMS_MAP ×20, OQ tags ×4) is preceded by an
  `expectPopulated(...)` floor asserting the table is non-empty, so a table that
  silently emptied cannot pass by iterating zero times. Ported verbatim from
  brief-dossier's helper.
- **Meaningful assertions (test-quality self-check):** no `let _ =`, no
  `assert(true)`, no `is_some()`-style vacuity. Every `it` asserts a concrete
  boolean/equality with a diagnostic message; the two coverage gates assert
  `.toEqual([])` on the real sweep output, not on a shape.
- **Negative assertion (paranoid):** AC-4 asserts open-questions.md `.includes('59.88')`
  is **false** — a doc that "resolves" OQ-1 by copying centipede's rate has settled the
  question it must leave open. This is the one test that guards against the *wrong*
  content rather than *missing* content.
- **Citation-gate reuse (scope fence):** no new gate machinery; the suite imports
  ml1-1/ml1-2's `extractProseCitations`/`uncoveredCitations`/`allMalformedCitations`/
  `loadClaims`/`checkClaims` unchanged.

Handing off to Dev for GREEN.
## Dev Assessment

GREEN complete. All three dossier docs authored, claimed, and enrolled — the full
millipede suite that was 42-red is now green, with every citation byte-verified.

**Deliverables (commit `dca250fd`):**
- `docs/rom-study/glossary.md` — 8 author→plain-English translations (7 creatures +
  DDT bomb + poison mushroom), each cited to a real source line.
- `docs/rom-study/subsystems.md` — 20 subsystems → owning file + `.SBTTL` line, 21
  backtick-cited primary-source lines (MODE FE cites both 126 init and 165 execute).
- `docs/rom-study/open-questions.md` — OQ-1..OQ-4; OQ-1 defers exact refresh to
  ml1-4 with **no Hz settled** (the negative guard `!/59.88/` passes).
- `docs/rom-study/claims/04-subsystems.json` (21) + `05-glossary.json` (1). Reuses
  ml1-2's claims for `MLDEF.MAC:31` (OQ-1), `MLDEF.MAC:191`/NDDT (glossary DDT), and
  `368X1.DOC:39`/MILLI.DOC (OQ-2) — no duplicate claims.
- `tests/audit/dossier-sweep.ts` — `DOSSIER_FILES` now enrols all three docs (AC-1).

**Verification (all first-hand, output inspected):**
- `npx vitest run --project millipede` → **108 passed / 0 failed** (5 files). The
  byte-verify block (AC-6, `checkClaims(loadClaims(), {vendoredRoot})`) ran locally
  (vendored tree present) and returned `[]` — every claim re-opens byte-for-byte.
- `npm run lint` (tsc --noEmit, CI's only typecheck) → **clean**.
- `npm run test:orchestrator` → **478 passed / 0 failed** (docs/enrolment touched no
  cabinet wiring).

**Discipline notes for the Reviewer (Zorg):**
- Citation form diverges from centipede's sibling deliberately: centipede's
  subsystems.md puts the line in a table *column* (`| 56 |`), which yields ZERO
  extractable `` `FILE:LINE` `` citations. Millipede's docs use the backticked
  `` `FILE:LINE` `` form because they enrol into the ml1-1 citation gate — the gate
  is the point of the exercise here.
- Every verbatim was copied from `python3 json.dumps` of the exact source line
  (leading tabs preserved; `.trimEnd()` tolerated), never retyped. `MOTION`/`MOVE`
  have NO leading tab (`.SBTTL...`); MLATR uses a double tab; `INICON` is
  `INICON:\tLDX #00` — all reproduced exactly, proven by the green byte-verify.
- No new gate machinery (scope fence honoured): the docs reuse ml1-1/ml1-2 helpers.
- One deviation logged (INICON label vs `.SBTTL`) — minor, forward-impact none.

Handing off to Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (594 pass / 0 fail, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — citation-grammar edges hand-covered (allMalformedCitations tested) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — readDossier '' graceful-absence path is by-design, hand-covered |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by 3 mutation probes + vacuity scan |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered by doc-accuracy grep + .SBTTL semantic cross-check |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — interfaces readonly, no stringly types (rule-checker #2 confirms) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — test reuses ml1-1/ml1-2 helpers, no duplication; docs minimal |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both LOW/informational) | confirmed 2 (non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via workflow.reviewer_subagents, hand-covered)
**Total findings:** 2 confirmed LOW (non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Rules applied: CLAUDE.md core/shell purity (N/A — no core code), the citation gate (ml1-1),
and the TypeScript lang-review checklist (26 checks). rule-checker ran all 26 exhaustively.

- **Purity boundary (CLAUDE.md):** N/A — this story touches only `docs/`, `claims/*.json`, one
  vitest audit file, and a one-line `DOSSIER_FILES` array. No `src/core/` change; the millipede
  `purity.test.ts` stayed green (preflight).
- **Citation gate (ml1-1/ml1-2):** COMPLIANT and non-vacuous. Every backtick `FILE:LINESPEC` in
  the three new docs has a covering `claims/*.json` entry (AC-5 `uncoveredCitations` = []), no
  malformed linespecs (AC-5 `allMalformedCitations` = []), and every claim re-opens byte-for-byte
  (AC-6). I independently byte-verified all 43 claims (22 new + 21 ml1-2) against the raw vendored
  tree: 0 mismatches, 0 traversal.
- **TS lang-review (26 checks):** 0 blocking violations. Checks #1 (type escapes), #2 (readonly on
  all array params/fields), #4 (`??` used correctly), #7 (async/await correct), #8 (test quality)
  all pass. #15/#26 raised two LOW informational items (below).

### Observations

- [VERIFIED] All 43 claims byte-verify against raw source — evidence: independent Python cross-check
  reads `source.file:line` from `reference/original-source/millipede/` and compares `.rstrip()` to
  each `verbatim`; result 0 bad / 0 traversal (SS-1..SS-21, GL-1, + ml1-2's 21). Complies with the
  ml1-1 citation-gate rule (verbatim must re-open byte-for-byte).
- [VERIFIED] The test bites on all three gate classes — evidence: mutation M1 (corrupt SS-1
  `verbatim`) → AC-6 red; M2 (`MILLI.MAC:56`→`:57` in subsystems.md) → BEEMV citesAny + AC-5
  uncovered red (2 fails); M3 (append "59.88593 Hz" to open-questions.md) → OQ-1 negative-guard red.
  All reverted, `git status` clean. rule-checker independently reproduced 3 equivalent probes.
- [VERIFIED] OQ-1 defers the exact refresh, never settles it — evidence: `grep -Ei '59\.88|hz|runs at'`
  on open-questions.md is empty; lines 11-14 state the rate is "not stated anywhere in the source",
  "left OPEN", resolved in "ml1-4", "not inherited from Centipede on faith".
- [VERIFIED] Glossary maps match `.SBTTL` semantics — evidence: each author symbol's `.SBTTL` names
  its plain-English creature (`FLYMV - ENTER AND MOVE DRAGONFLY`→dragonfly, `WRMMV-...INCH WORM`→inch
  worm, `SPDMV-MOVE SPIDER`→spider, etc.); the "three fliers" prose (glossary.md:32) matches the
  `BOMBS` `.SBTTL` at `MILLI.MAC:446` ("BOMB PLAYER WITH BEE, MOSQUITO AND DRAGONFLY").
- [VERIFIED] Scope contained — evidence: `dossier-sweep.ts` diff is exactly the one-line
  `DOSSIER_FILES` enrolment; `epic-ml1.yaml` diff is only ml1-3's status/started stamp; no sibling
  churn, no core/shell code.
- [PRE] reviewer-preflight: 594 pass / 0 fail (millipede 108 + orchestrator 478 + others), tsc clean,
  0 code smells (console.log/dangerouslySetInnerHTML/.skip/TODO).
- [SEC] reviewer-security: clean — all 22 new claim `source.file` values are bare approved filenames
  (no `/`, `\`, `..`), so none escapes the check-citations containment guard; no injection/eval; no
  secrets. Confirms my own traversal check.
- [RULE] reviewer-rule-checker: 0 blocking. LOW #26 — four population floors are self-referential
  (measure a literal vs its own length; only a same-diff test edit can fail them). Dismissed as
  non-blocking: matches the brief-dossier sibling pattern, and the content-derived assertions that
  actually gate GREEN all bite (mutation-proven).
- [RULE] reviewer-rule-checker: LOW #15 — the OQ-tag loop lacks the `expectPopulated` guard its
  siblings carry. Dismissed as non-blocking: a 4-item inline literal with no `continue`, each tag
  asserted directly, so it is provably non-vacuous; logged as a Delivery-Finding cleanup suggestion.

### Devil's Advocate

Argue this is broken. First attack: the docs could be plausible fabrication — a dossier that reads
authoritative while citing wrong lines is worse than none, because it manufactures corroboration. I
took that seriously and did not trust the byte-verify test alone: I re-opened all 43 claims directly
from the vendored ROM outside the test harness. If Dev had drifted a line number (the exact failure
the centipede study logged twice) or softened a `verbatim`, my cross-check would have flagged it —
it flagged nothing. Second attack: maybe the test is theatre — 48 green assertions that would stay
green over a stub or wrong content. I mutated three independent inputs (a claim byte, a citation
line, a forbidden Hz string) and each reddened the exact assertion that should own it; a fourth
class (missing entity/subsystem/enrolment) is covered by per-item `it()` blocks and AC-1's
`toContain`. Third attack: OQ-1 is the story's one trap — the whole point is to NOT settle the
refresh rate, and a tired author copies centipede's 59.88593 Hz. The doc contains no Hz at all and
says "left OPEN … not inherited from Centipede on faith," and the negative guard `!/59.88/` is live
(M3 proved it). Fourth attack: a confused later reader mis-reads INICON as a `.SBTTL` — but the row
explicitly says "a plain label, not a `.SBTTL` section," and the deviation is logged and stamped.
Fifth attack: path traversal via a crafted `source.file` — all new claims use bare approved
filenames, and the checker's containment guard (unchanged) refuses `..`. Sixth: the glossary's
uncited gameplay gloss ("poison mushroom … forces the centipede to dive") is general arcade
knowledge, not a false ROM citation, and carries no `FILE:LINE` that the gate must cover. The only
residue is two cosmetic test-consistency nits (#15/#26), neither of which lets wrong GREEN content
pass. I could not break it.

## Reviewer Assessment

**Verdict:** APPROVED

**Specialist coverage:** [PRE] reviewer-preflight — 594 pass / 0 fail, tsc clean, 0 smells.
[SEC] reviewer-security — clean: all new claim `source.file` bare filenames (no traversal), no
injection/eval, no secrets. [RULE] reviewer-rule-checker — 0 blocking across 26 TS checks; 2 LOW
informational nits (#15/#26) dismissed as non-blocking. The 6 disabled specialists were hand-covered
(test-analyzer via 3 mutation probes; comment-analyzer via `.SBTTL` semantic cross-check; edge/type/
silent-failure/simplifier as noted in the Subagent Results table).

**Data flow traced:** a dossier prose citation `` `MILLI.MAC:56` `` → `scanProseCitations`
extracts it → `uncoveredCitations(loadClaims(), [doc])` demands a covering `claims/*.json` (SS-1) →
`checkClaims` re-opens `MILLI.MAC:56` in the vendored tree and byte-compares the `verbatim`. Safe
because every link in that chain was mutation-proven to redden when broken, and I byte-verified the
terminal step independently for all 43 claims.

**Pattern observed:** correct reuse of the ml1-1/ml1-2 citation-gate seam — the three docs enrol
into `DOSSIER_FILES` (`plugins/millipede/tests/audit/dossier-sweep.ts:40`) and are guarded by the
same imported helpers, no new gate machinery (scope fence honoured).

**Error handling:** `readDossier` returns `''` for an absent file by design
(`dossier-sweep.ts:118-121`), so RED degrades to feature-absent, not a harness ENOENT; AC-6
byte-verify is `describe.skipIf(!vendoredAvailable)` so CI (no reference tree) still bites via AC-5
coverage. Both correct.

**Findings:** 2 LOW/non-blocking (test-consistency nits #15/#26, [RULE]) — recorded as Delivery
Findings for optional cleanup, neither gates GREEN content. No Critical, no High, no Medium.

**Handoff:** To SM for finish-story.
## Impact Summary

Single-round story (RED → GREEN → one review round APPROVED). No prior rejections.

**Blocking issues:** 0. **Findings:** 2 LOW non-blocking (test-consistency nits #15/#26,
optional cleanup). **Design deviations:** 1 minor, accepted (INICON label vs `.SBTTL`).

**Deliverables:** three rom-study docs (glossary/subsystems/open-questions) + 22 claims,
enrolled into `DOSSIER_FILES`; new audit test `glossary-subsystems-oq.test.ts`.

**Verification:** millipede 108/108, orchestrator 478/478, tsc clean. All 43 claims
byte-verify against the vendored source (22 new + 21 ml1-2). Test mutation-proven to bite
on all three gate classes. Scope contained (no core/shell code, no sibling churn).

**Merge:** code PR #277 (`feat/ml1-3 → develop`) awaiting the boss's merge; archive follows.
