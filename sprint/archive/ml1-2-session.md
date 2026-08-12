---
story_id: "ml1-2"
jira_key: "ml1-2"
epic: "ml1"
workflow: "tdd"
---
# Story ml1-2: brief.md — five rom-source-study preflight answers

## Story Details
- **ID:** ml1-2
- **Jira Key:** ml1-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml1-2-brief-rom-source-study-preflight
- **PR:** #273 (code PR feat/ml1-2 → develop — https://github.com/slabgorb/arcade/pull/273; boss merges)

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-12T11:32:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T10:50:24Z | 2026-08-12T10:53:51Z | 3m 27s |
| red | 2026-08-12T10:53:51Z | 2026-08-12T11:04:39Z | 10m 48s |
| green | 2026-08-12T11:04:39Z | 2026-08-12T11:13:29Z | 8m 50s |
| review | 2026-08-12T11:13:29Z | 2026-08-12T11:32:40Z | 19m 11s |
| finish | 2026-08-12T11:32:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap · non-blocking · TEA]** `sprint/context/context-story-ml1-2.md` is the thin auto-generated
  template (`pf context create` — Problem/Approach/AC all say "see title / TBD"). The rich, verified
  Background lives in the **SM Assessment** of this session file, not in the context file. Dev/Reviewer:
  read the SM + TEA assessments here as primary input; the context file adds nothing.

- **[Gap · non-blocking · Reviewer — DEFERRED]** ml1-1's `plugins/millipede/tests/audit/citations.test.ts`
  now carries **stale prose** describing the retired empty-DOSSIER_FILES state — "DOSSIER_FILES is EMPTY
  today / green-on-empty" at :30, :493-494, and the test titles at :538/:551. Since ml1-2 enrolled
  `brief.md`, those descriptions are no longer accurate (the real-dossier gate now has teeth). **No test
  is red** — ml1-1's assertions were deliberately written to survive enrollment. NOT fixed here: ml1-1's
  own `citations.test.ts:543-548` (TEA-deviation #2) explicitly says ml1-2 must **not** be forced to edit
  ml1-1's suite. Defer the ~3 comment/title updates to whoever next touches that file (ml1-3 enrolls its
  own dossier files there). *Found by Reviewer (rule-checker #24) during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA · scope ruling] The `counts`/CountAssertion machinery is NOT re-added in ml1-2.**
  ml1-1's rework removed it, and both `tools/audit/check-citations.mjs` (header) and
  `tests/audit/citations.test.ts` (the `counts?`-shim comment) anticipate "ml1-2 re-adds it the
  first time it needs one." **brief.md does not need it.** Its numbers — `NDDT =4`, `PTS: .BLKB 16.`,
  the four EPROM part numbers `136013-101..104` — live INSIDE the cited line's `verbatim`, so a plain
  byte-verified claim already pins them; the counts machinery only earns its place when a claim must
  tally operands across `.BYTE` lines (the sound path). Re-adding removed machinery no answer uses
  would be scope creep against design §5 (five prose answers + claims, nothing more). Deferred to the
  first story that actually tabulates. RED test carries this as a header scope-fence, no test added.

### Dev (implementation)
- **No spec deviations.** brief.md answers exactly the five preflight questions design §5 names;
  the citation set fully covers §5's named facts (all four program EPROMs 136013-101..104, both
  picture -106/107, MILLI.LDA, the link map, the radix + timebase + gap + sibling citations). The RED
  test pins a *floor* (a subset of these), not a ceiling — the extra citations are spec-driven
  substantiation, not scope creep, and each is byte-verified. Counts machinery honoured as out of
  scope per TEA's ruling above.

## Sm Assessment

**Story:** ml1-2 (5pt, tdd, p2, epic ml1) — author `plugins/millipede/docs/rom-study/brief.md`, the five rom-source-study preflight answers, each cited `millipede/<FILE>.MAC:<line>` into the vendored tree. First dossier file for the new Millipede clone; enrolls into the citation gate ml1-1 already shipped.

**Board / contention:** Clean. Sibling probes at setup — `git branch -r | grep ml1-2` empty; session sweep showed a-1 on jt11-1, a-3 on sw11-3, neither touching millipede. Claim now pushed on `feat/ml1-2-brief-rom-source-study-preflight` (stamp + context, one gitflow push). Merge gate clean (NEW_WORK_STATE on activation).

**Scope ruling:** No either/or, no user ruling required. The story title IS the spec (epic has no separate AC list); sm-setup derived ACs from the five numbered answers (author's numbering 0,2,3,4 — reproduce, don't renumber) plus the two mechanical gates. No stale-premise trap: unlike a description that quotes a measurement, this story's cited ROM lines ARE its deliverable, and the ml1-1 citation gate verifies them mechanically — so they were NOT pre-audited by SM (that's TEA/Dev's red/green).

**Key pointers handed to TEA (all verified on disk):**
- Vendored source: `reference/original-source/millipede/` (11 .MAC files, @ historicalsource/millipede 29f3e05). Citation vocabulary fixed: `millipede/<FILE>.MAC:<line>`.
- Citation gate (ml1-1, DONE): `plugins/millipede/tools/audit/check-citations.mjs` + `plugins/millipede/tests/audit/citations.test.ts`. brief.md is the first file to enroll — this is brief.md's red/green. ml1-1's M1 assert was relaxed so enrolling brief.md won't redden that suite.
- Sibling oracle for layout/tone: `plugins/centipede/docs/rom-study/brief.md`.
- Design/roadmap spec: `docs/superpowers/specs/2026-08-11-millipede-cabinet-roadmap-and-ml1-design.md`.
- `rom-source-study` skill applies directly.

**Out of scope (do not let ACs drift):** graphics-ROM decode (ml2), core sim incl. CONWAY Life field (ml3), sound (ml4), phase machine/wiring/HUD (ml5). Exact refresh rate deferred to ml1-4 — brief.md records timebase ARCHITECTURE (logic once/frame) only. glossary/subsystems/open-questions = ml1-3; MAME board facts = ml1-4.

**Handoff:** setup complete, gates green. → Leeloo (TEA) for the RED phase.
## Tea Assessment

**RED phase — complete.** New failing suite `plugins/millipede/tests/audit/brief-dossier.test.ts`.

**RED evidence (firsthand direct run, not a testing-runner summary — that helper confabulates names):**
- `npx vitest run --project millipede` → **9 failed | 51 passed (60)**. All 9 failures are in
  `brief-dossier.test.ts` and are self-describing / feature-absent ("GREEN must author brief.md",
  "DOSSIER_FILES must contain brief.md", "swept 0 (floor 6)"). No collect crash, no harness error.
- The other three files (`citations.test.ts`, `purity.test.ts`, `scaffold.test.ts`) stay **green** —
  ml1-1's suite is untouched; its real-dossier gate remains green-on-empty until GREEN enrolls brief.md.
- `npm run lint` (repo-wide `tsc --noEmit`) → **clean**. The RED is a real assertion failure, not a
  compile break, so CI's only type gate passes.
- The `.skipIf(!vendoredAvailable)` byte-verify block (AC-4) ARMED (vendored tree present locally) and
  failed on the claims floor — its teeth are live, not skipped, in this checkout.

**What the suite pins (the five preflight answers = the story title = design §5):**
| # | Answer | Required citation(s) — re-opened by hand this session | Prose signature |
|---|--------|------|------|
| 0 | revision + shipped set | `368X1.DOC:10` (ledger), `MILLI.LNK:1` (link cmd) | `136013-101`, `136013-106/107`, `MILLI.LDA` |
| 1 | radix | `MLDEF.MAC:2` (`.RADIX 16`) | hex / decimal / inherited via .INCLUDE |
| 2 | timebase architecture | `MLDEF.MAC:31`, `MLDEF.MAC:117`, `MLIRQ.MAC:708-709` | "once per video frame" + **defers exact rate to OQ-1/ml1-4** |
| 3 | gap analysis | `MLDEF.MAC:398` (`PTS: .BLKB 16.` — scoring lives in code) | names `MILLI.DOC` + `368XX.SB2` as gaps; "secondary-doc gap, not ground-truth" |
| 4 | sibling reuse | `COIN65.MAC:11` (`.RADIX 16`, byte-identical shared line) | "identical" + "centipede" + "diff" |

Plus AC-1 enrolment (brief.md ∈ DOSSIER_FILES), AC-3 coverage (every backticked cite has a claim;
none malformed), AC-4 byte-verification of every claim. Citation floor 6 and claims floor 6 stop a
vacuous stub passing.

**GREEN checklist for Korben (Dev):**
1. `docs/rom-study/brief.md` — five numbered answers, tone/layout from
   `plugins/centipede/docs/rom-study/brief.md`. Backtick EVERY primary-source cite as `FILE:LINESPEC`.
2. `docs/rom-study/claims/*.json` — one covering Claim per cited line (schema:
   `{id, claim, source:{file,line,verbatim}, corroboration?}`), `verbatim` copied EXACTLY from
   `sed -n '<n>p'` of the vendored file (leading spaces + internal tabs preserved; only trailing ws is
   tolerated). Number them like centipede: `00-revision-and-shipped.json`, `01-radix.json`, etc.
3. `tests/audit/dossier-sweep.ts` — add `'brief.md'` to `DOSSIER_FILES` (ships EMPTY).
4. Verify: `npx vitest run --project millipede` all-green + `npm run lint` clean.

**⚠ TRAP for Dev — `MILLI.DOC` / `368XX.SB2` must be PROSE gaps, never resolving citations:**
- Backticking `` `MILLI.DOC:39` `` makes the sweep extract it as a citation (`.DOC` is in the grammar)
  and the coverage gate then demands a claim, which FAILS the byte gate — `MILLI.DOC` is not in the
  tree. `368XX.SB2` is silently invisible (`.SB2` isn't in the grammar), so a claim there is unswept.
- Cite the **evidence that the ledger names them**: `368X1.DOC:39` (names MILLI.DOC) / `368X1.DOC:41`
  (names 368XX.SB2). Write the gap-file names as bare prose ("`MILLI.DOC`" without a `:line`), or in a
  code span with no colon. My test requires the bare NAMES in prose and does not require a `:line` cite
  for either — precisely to keep you out of this hole.

**Scope ruling recorded as a Design Deviation above:** the `counts`/CountAssertion machinery is NOT
re-added (brief.md's numbers are inside cited verbatims). Do not port it.

### Rule Coverage (lang-review/typescript.md + JS #15/#18)
- **#8 test quality** — every test carries a meaningful assertion; no `as any`, no `let _ =`, no
  `assert(true)`; imports from source (`./dossier-sweep`, `../../tools/audit/check-citations.mjs`),
  never `dist/`.
- **#15 vacuous universal sweep** — every loop/coverage assertion is fronted by `expectPopulated(...)`
  with an explicit floor (answers ≥5, citations ≥6, claims ≥6), so a stub cannot pass by having
  nothing to iterate.
- **#18 coverage vacuity / one concept one helper** — coverage and malformed-detection both run
  through the single `dossier-sweep` scanner (no second re-implementation); the citation-floor test
  gives the green-on-empty `uncovered`/`malformed` gates real teeth on GREEN.
- **#1 type-safety escapes** — no casts introduced; `CheckClaims` is a named function type, `Answer`
  a declared interface, `ProseCitation`/`Claim` imported.

**Handoff:** RED verified, lint clean. → Korben Dallas (Dev) for GREEN.
## Dev Assessment

**GREEN — complete.** All three deliverables shipped; the whole cabinet is green.

**What shipped (branch `feat/ml1-2-brief-rom-source-study-preflight`, pushed `384caf38`):**
1. `plugins/millipede/docs/rom-study/brief.md` — the five preflight answers, tone/layout after the
   centipede oracle, every primary-source fact backtick-cited `FILE:LINE` into the vendored tree.
2. `plugins/millipede/docs/rom-study/claims/` — **21 claims** across four files
   (`00-revision-and-shipped` ×8, `01-radix` ×4, `02-timebase` ×4, `03-docs-and-board` ×5). Verbatims
   were **generated by reading the exact vendored lines** (a throwaway scratchpad script, not
   committed), so every one re-opens byte-for-byte — zero hand-transcription, zero drift risk.
3. `plugins/millipede/tests/audit/dossier-sweep.ts` — `DOSSIER_FILES = ['brief.md']` (was empty). This
   arms ml1-1's own real-dossier coverage gate for brief.md, not just ml1-2's suite.

**Verification (firsthand runs):**
- `npx vitest run --project millipede` → **60/60 pass** (was 9 failing under TEA's RED).
- CI path `MILLIPEDE_SOURCE_DIR=/nonexistent` → **51 pass | 9 skipped** — the byte-verify blocks skip
  cleanly with no `reference/` read, the coverage gate (no tree needed) still bites. No deploy-red risk.
- `node tools/audit/check-citations.mjs` → `checked 21 claim(s) … all claims verified`.
- Full `npx vitest run` → **14732 pass** (975 files); `npm run test:orchestrator` → **478 pass**;
  `npm run lint` → clean. Nothing outside plugins/millipede touched.

**The MILLI.DOC / 368XX.SB2 trap (TEA's ⚠) handled correctly:** both are written as bare prose names
(no `:line`), and the *evidence* that the ledger names them is cited as `368X1.DOC:39` / `368X1.DOC:41`.
`.SB2` isn't in the sweep grammar and `MILLI.DOC` carries no colon, so neither is extracted as a
resolving citation — confirmed by the green `allMalformedCitations`/`uncoveredCitations` gates.

**Handoff:** GREEN verified, pushed. → Jean-Baptiste Emanuel Zorg (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (GREEN) | none | N/A — 60/60 millipede, CI-sim 51+9 skip (graceful), checker 21 verified, lint PASS, orchestrator 478/478, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings; hand-assessed: pure docs/JSON-data + 1-line test enrol, no branches/paths — N/A |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled; hand-assessed: no try/catch, no fallback, no error code introduced — N/A |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled; **hand-covered by Reviewer**: 3-mutation battery proves teeth; 2 LOW nits found + FIXED |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled; hand-covered: 1 LOW comment/code mismatch FIXED; stale ml1-1 prose DEFERRED (Delivery Finding) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled; rule-checker covered the TS type surface (1 readonly nit FIXED) |
| 7 | reviewer-security | Yes | clean | none | 21 claims all bare filenames (no traversal escape), JSON well-formed, no injection/secrets |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled; hand-assessed: minimal docs+data, no dead code/over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 6 (all LOW) | 4 confirmed & FIXED, 1 DEFERRED (ml1-1 file), 1 NOTED/downgraded (regex scope) |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`, hand-covered above)
**Total findings:** 7 total, ALL LOW, zero Critical/High/Medium — 5 confirmed & FIXED this phase (rule-checker #15×2, #17, #2 + Reviewer's own difficulty-prose), 1 DEFERRED (rule-checker #24, ml1-1's file per its TEA-deviation #2), 1 NOTED/downgraded (rule-checker #25, prose-regex whole-file scope).

### Rule Compliance

Project rule of record: the **src/core purity boundary** (CLAUDE.md) and the citation vocabulary (`ml1` design §3). Enumerated:
- **src/core purity** — N/A: this diff touches only `plugins/millipede/docs/rom-study/` and `plugins/millipede/tests/audit/`; no `src/core` file changed. Purity sweep stays green.
- **Citation vocabulary `FILE:LINE` into the vendored tree (design §3)** — Compliant. All 20 brief.md citations are bare-filename `FILE:LINE`, every one covered by a `claims/*.json` entry, every claim byte-verified (`check-citations.mjs` → 21 verified). No orphan claims.
- **Named-but-absent files as PROSE, not resolving citations** — Compliant, confirmed mechanically: `MILLI.DOC`/`368XX.SB2` are NOT extracted as citations; their evidence cites are the ledger lines `368X1.DOC:39`/`:41`.
- **TypeScript checklist (rule-checker: 44 rules / 61 instances)** — all compliant after fixes; no `as any`, no type escapes, no enum/null/async/module pitfalls; the one readonly-param nit FIXED. `tsc --noEmit` green.
- **Test quality (#8/#15/#18)** — meaningful assertions throughout; every sweep now fronted by `expectPopulated` (the 2 inner loops FIXED); imports from source not dist; mutation-proven non-vacuous.
- **Counts machinery (TEA scope ruling)** — Compliant: brief.md's numbers live inside cited verbatims, so plain byte-verified claims pin them; the removed CountAssertion machinery correctly NOT re-added.

### Devil's Advocate

Arguing the story is broken:
1. **"The checker verifies verbatim, not meaning — a claim could byte-match its line while describing it wrongly."** Real risk, and the reason I laid all 21 claims beside their actual vendored lines by hand. Every assertion matches its line — including the non-obvious `BIT VBLANK`/`BVS` reading (correctly identified as testing D6/bit-6 via the V flag). The one loose characterization ("difficulty is equated", where the lines are OPTSW0 DIP-bit comments) was caught and FIXED to "operator option-switch (DIP) setting".
2. **"The 15 prose regexes scan the whole brief.md, so an answer's signature word could satisfy the check from a different section."** True (rule-checker #25, NOTED). Mitigated: each answer ALSO requires its specific line-CITATION via `cites()`, and that citation appears inside that answer's own paragraph — the citation is the real section-anchor, the word is corroboration. Low risk at 105 lines with clean section separation; per-section scoping deferred as not worth the parsing complexity now.
3. **"The suite is vacuous — green because it checks nothing."** Refuted by a 3-mutation battery on the committed tree: a drifted claim verbatim reddens AC-4, an uncovered `brief.md` citation reddens AC-3, un-enrolling `brief.md` reddens AC-1; each restores to 60/60. Floors (≥8) + `expectPopulated` guards block empty-sweep passes.
4. **"CI has no `reference/` tree — does the gate silently pass over nothing / redden the deploy?"** No. CI-sim (`MILLIPEDE_SOURCE_DIR=/nonexistent`) → 51 pass + 9 skip: the byte-verify blocks `.skipIf` cleanly (no `reference/` read → no deploy-red), while the coverage gate (needs no tree) still bites.

### Observations

- `[PRE]` `[VERIFIED]` Preflight GREEN — 60/60 millipede, CI-sim 51+9 skip graceful, `check-citations.mjs` 21 verified, lint PASS, orchestrator 478/478, 0 code smells. Independently re-run by Reviewer.
- `[SEC]` `[VERIFIED]` Security clean — all 21 claims use bare filenames (no `/`, `..`, absolute); none can escape the vendored tree's containment guard; JSON well-formed; no injection/secrets/PII.
- `[RULE]` `[VERIFIED]` Rule-checker exhaustive (44 rules / 61 instances): 6 LOW findings, no type-safety/enum/null/async/error-handling violations. 4 FIXED, 1 deferred, 1 noted.
- `[VERIFIED]` Semantic fidelity — all 21 claims re-open byte-for-byte AND each claim's assertion accurately describes its line; coverage perfect (20 brief citations all covered, no orphan claims); `MILLI.DOC`/`368XX.SB2` confirmed prose-only (not extracted as citations).
- `[TEST]` Mutation-proven teeth — 3 independent mutations each redden the intended AC (AC-4 verbatim, AC-3 coverage, AC-1 enrolment); suite restores to 60/60. Not vacuous.
- `[TEST]` (LOW, FIXED) test-quality nits — citation+claims floors 6→8 (matching the "eight distinct lines" the comment already asserted); the two per-answer inner loops fronted with `expectPopulated`; `CheckClaims` param `readonly Claim[]`.
- `[DOC]` (LOW, FIXED) difficulty prose — brief.md answer 3 + claims DG-4/DG-5 said difficulty is "equated"; the cited lines are DIP-bit comments under `OPTSW0 =408`, so retitled "operator option-switch (DIP) setting" for ml5's benefit. Citations/verbatims unchanged → 21 claims stay verified.
- `[DOC]` (LOW, DEFERRED) ml1-1's `citations.test.ts` "green-on-empty" prose is now stale after enrolment — left to a follow-up per ml1-1's TEA-deviation #2 (see Delivery Findings).

## Reviewer Assessment
**Verdict:** APPROVED

**Specialist coverage (enabled subagents):** [PRE] preflight GREEN (60/60, CI-sim graceful, checker 21 verified, lint PASS, orchestrator 478/478, 0 smells) · [SEC] security clean (21 claims bare filenames, no traversal/injection/secrets) · [RULE] rule-checker exhaustive 44 rules / 61 instances, 6 LOW findings (4 FIXED, 1 DEFERRED, 1 NOTED), no type/enum/null/async/error-handling violations. The 6 disabled thematic subagents were hand-covered by the Reviewer (see Subagent Results + Observations).

**Data flow / mechanism:** `brief.md` prose → backticked `FILE:LINE` citations → `dossier-sweep` extract → `uncoveredCitations(loadClaims(), ['brief.md'])` coverage gate + `checkClaims(loadClaims(), {vendoredRoot})` byte-verify against `reference/original-source/millipede/`. Pure data + read-only test; no I/O, no runtime, no `src/core` surface.

**Pattern observed:** the ml1-1 citation gate armed for its first real dossier file — enrolment (`DOSSIER_FILES=['brief.md']`) + covering claims + byte-verified verbatims. Mirrors the centipede oracle (`plugins/centipede/docs/rom-study/`).

**Findings (all LOW; zero Critical/High/Medium):**
- `[TEST]` citation & claims floors 6→8; two inner loops fronted with `expectPopulated`; `readonly Claim[]` param. FIXED (`833f8ef3`).
- `[DOC]` difficulty "equated" → "operator option-switch (DIP) setting" in brief.md + claims DG-4/DG-5 (bits of `OPTSW0`). FIXED (`833f8ef3`); verbatims unchanged, 21 claims still verify.
- `[DOC]` (DEFERRED) ml1-1 `citations.test.ts` stale "green-on-empty" prose — per ml1-1's TEA-deviation #2, not ml1-2's to edit; filed as a Delivery Finding.
- `[DOC]` (NOTED) prose-regex whole-file scope — low risk (each answer is also citation-anchored); per-section scoping deferred.

All reviewer fixes are docs/test-quality only (no cited line, no verbatim, no production logic changed), committed `833f8ef3` and pushed, re-verified: lint clean, checker 21 verified, millipede 60/60, CI-sim 51+9 skip, mutation battery still reddens 3/3. Preflight's full-suite GREEN (14732 vitest / 478 orchestrator) therefore still holds.

**Scope note:** the `counts`/CountAssertion machinery stays out (TEA ruling, design §5); glossary/subsystems/open-questions → ml1-3; MAME board facts + exact refresh (OQ-1) → ml1-4. brief.md correctly defers the exact rate.

**Handoff:** To SM (Ruby Rhod) for finish-story.
## Impact Summary

**Story ml1-2** — first dossier file (`brief.md`) enrolled into the Millipede citation gate. Code PR #273 merged into `develop` (commit `8ef731e1`, 2026-08-12T11:47:08Z).

**Blast radius:** Minimal. New `plugins/millipede/docs/rom-study/` (brief.md + 21 claims) + a one-line `dossier-sweep.ts` enrolment + the new `brief-dossier.test.ts`. No `src/core`, no game logic, no shell wiring.

**Verification (firsthand):** millipede 60/60; CI-sim 51+9 skip (graceful, no `reference/` read → no deploy-red); `check-citations.mjs` 21 claims verified byte-for-byte; `npm run lint` clean; full vitest 14732 pass (975 files); orchestrator 478/478. Fidelity mutation-tested — a drifted verbatim, an uncovered citation, and a missing enrolment each redden the intended AC; restores to 60/60.

**Findings:** 7 total, ALL LOW (0 Critical/High/Medium). 5 FIXED in-phase (`833f8ef3`: test floors→8, `expectPopulated` inner-loop guards, readonly param, difficulty "equated"→option-switch/DIP prose). 1 DEFERRED (ml1-1 `citations.test.ts` stale "green-on-empty" prose — per ml1-1's TEA-deviation #2, not ml1-2's to edit). 1 NOTED (prose-regex whole-file scope — each answer is citation-anchored; low risk).

**Scope out:** counts machinery (design §5); graphics/sim/sound/wiring (ml2–ml5); exact refresh rate (OQ-1 → ml1-4). brief.md correctly defers the exact rate.
